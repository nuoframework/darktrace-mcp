import { CLIENT_CAPABILITIES_META_KEY, CLIENT_INFO_META_KEY, McpServer, PROTOCOL_VERSION_META_KEY, ProtocolError, ProtocolErrorCode, createRequestStateCodec, inputRequired, inputResponse } from '@modelcontextprotocol/server';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { APPROVAL_PENDING, callTool, eligibleTools, type ApprovalDecision, type Approver, type ToolContext } from '../tools/index.js';
import { APPROVAL_DEADLINE_MS } from '../policy/admission.js';
/** A human has 30 seconds (or less, when the preview expires sooner) to answer a confirmation dialog; silence means no. */
export const APPROVAL_TIMEOUT_MS=APPROVAL_DEADLINE_MS;
/** Lifetime of the 2026-07-28 input-required approval state. No server slot is held across that round trip. */
export const APPROVAL_STATE_TTL_MS=120_000;
/** Code-owned dialog schema: the human must set approved:true; nothing else is read from the reply. */
export const APPROVAL_SCHEMA=Object.freeze({type:'object' as const,properties:{approved:{type:'boolean' as const}},required:['approved']});
/** Only a correlated `accept` whose content says approved:true is consent; decline, cancel and anything malformed are not. */
export function approvalAnswer(answer:unknown):ApprovalDecision {
  if (!plainObject(answer)) return 'cancel';
  if (answer.action==='accept') return plainObject(answer.content)&&answer.content.approved===true?'accept':'decline';
  return answer.action==='decline'?'decline':'cancel';
}
export const VERSION='1.1.1';
const plainObject=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
/** Revisions whose clients identify themselves per request (`server/discover` + `_meta` envelope, no `initialize`).
 * Must match what the SDK advertises in server/discover; a test pins it. */
export const ENVELOPE_PROTOCOL_VERSIONS:readonly string[]=Object.freeze(['2026-07-28']);
/**
 * Whether the client has identified itself before a tool request. Two forms count, matching the two protocol eras:
 * - 2025-era: a completed `initialize` request. The SDK records client capabilities, clientInfo and the negotiated
 *   version only inside its initialize handler. notifications/initialized is not required, and a forged one
 *   unlocks nothing.
 * - 2026-07-28 (Claude Code): no initialize at all; each request carries the client's protocol version and
 *   capabilities in its `_meta` envelope. Over stdio the SDK lifts that envelope without validating it, so it is
 *   checked here: a supported modern revision, a capabilities object and, if present, a clientInfo object.
 */
export function clientIdentified(handshake:{capabilities:unknown;clientInfo:unknown;version:unknown},envelope:unknown):boolean {
  if(handshake.capabilities!==undefined&&handshake.clientInfo!==undefined&&handshake.version!==undefined) return true;
  if(!plainObject(envelope)) return false;
  const version=envelope[PROTOCOL_VERSION_META_KEY], info=envelope[CLIENT_INFO_META_KEY];
  return typeof version==='string'&&ENVELOPE_PROTOCOL_VERSIONS.includes(version)&&plainObject(envelope[CLIENT_CAPABILITIES_META_KEY])
    &&(info===undefined||plainObject(info));
}
/** inputRequests key of the approval dialog on protocol 2026-07-28. */
export const APPROVAL_INPUT_KEY='darktrace_approval';
/** Whether an `elicitation` capability value allows a form dialog (a bare 2025-06 `{}` means form; URL-only does not). */
function formElicitation(capabilities:unknown):boolean {
  if(!plainObject(capabilities)) return false;
  const elicitation=capabilities.elicitation;
  if(!plainObject(elicitation)) return false;
  return elicitation.form!==undefined||elicitation.url===undefined;
}
/**
 * How this request can reach a human for approval. Only protocol-level client declarations count, in order:
 * 1. capabilities recorded by a completed 2025-era `initialize` → a server-to-client `elicitation/create` request;
 * 2. otherwise, on an instance serving 2026-07-28, this request's validated `_meta` envelope capabilities → an
 *    input-required result (that revision has no server-to-client requests; the client asks the human and retries).
 * Tool arguments (`params.arguments`) are model-controlled and are never consulted.
 */
export function approvalChannel(initialized:unknown,negotiatedVersion:unknown,envelope:unknown):'push'|'input-required'|'none' {
  if(initialized!==undefined) return formElicitation(initialized)?'push':'none';
  if(typeof negotiatedVersion!=='string'||!ENVELOPE_PROTOCOL_VERSIONS.includes(negotiatedVersion)||!plainObject(envelope)) return 'none';
  const version=envelope[PROTOCOL_VERSION_META_KEY];
  if(typeof version!=='string'||!ENVELOPE_PROTOCOL_VERSIONS.includes(version)) return 'none';
  return formElicitation(envelope[CLIENT_CAPABILITIES_META_KEY])?'input-required':'none';
}
export function createServer(ctx:ToolContext):McpServer {
  const server=new McpServer({name:'darktrace-mcp',version:VERSION},{capabilities:{tools:{listChanged:false}},maxToolInputElements:Math.min(ctx.cfg.limits.maxToolInputElements,5000)});
  function requireInitialization(envelope:unknown):void {
    const handshake={capabilities:server.server.getClientCapabilities(),clientInfo:server.server.getClientVersion(),version:server.server.getNegotiatedProtocolVersion()};
    if(!clientIdentified(handshake,envelope)) throw new ProtocolError(ProtocolErrorCode.InvalidRequest,'Invalid Request');
  }
  const tools=eligibleTools(ctx.cfg).map(tool=>({name:tool.name,description:tool.description,annotations:tool.annotations,
    inputSchema:{...z.toJSONSchema(tool.inputSchema,{io:'input'}),type:'object'} as {type:'object';[key:string]:any}}));
  // Low-level dispatch keeps validation errors fixed and sanitized; Zod still validates every operation.
  server.server.setRequestHandler('tools/list',async(_request,extra)=>{requireInitialization(extra.mcpReq.envelope);return {tools};});
  // Approval state for the 2026-07-28 retry: HMAC under a per-instance key, bound to the exact tool call, short-lived
  // and single use. It only proves that this server asked; the decision itself is the client's answer.
  const approvalState=createRequestStateCodec<{n:string;d:string}>({key:randomBytes(32),ttlSeconds:APPROVAL_STATE_TTL_MS/1000});
  const usedApprovals=new Map<string,number>();
  const callDigest=(name:unknown,args:unknown)=>createHash('sha256').update(JSON.stringify([name,args])).digest('hex');
  async function resumedApproval(state:unknown,digest:string,responses:unknown,requestCtx:Parameters<typeof approvalState.verify>[1]):Promise<ApprovalDecision|undefined> {
    if(typeof state!=='string') return undefined;
    let payload:{n?:unknown;d?:unknown};
    try {payload=await approvalState.verify(state,requestCtx) as typeof payload;} catch {return undefined;}
    if(!plainObject(payload)||typeof payload.n!=='string'||payload.d!==digest) return undefined;
    const now=Date.now();
    for(const [nonce,expires] of usedApprovals) if(expires<=now) usedApprovals.delete(nonce);
    if(usedApprovals.has(payload.n)) return undefined;
    usedApprovals.set(payload.n,now+APPROVAL_STATE_TTL_MS+60_000);
    const answer=inputResponse(responses as Record<string,unknown>|undefined,APPROVAL_INPUT_KEY);
    return answer.kind==='elicit'?approvalAnswer(answer):'cancel';
  }
  // One approval session per server instance: bounds pending prompts and owns the previews it issued.
  const session=ctx.session??{};
  server.server.setRequestHandler('tools/call',async(params,extra)=>{
    const envelope=extra.mcpReq.envelope;
    requireInitialization(envelope);
    const name=params.params.name,args=params.params.arguments??{};
    const channel=approvalChannel(server.server.getClientCapabilities(),server.server.getNegotiatedProtocolVersion(),envelope);
    const digest=callDigest(name,args);
    const resumed=channel==='input-required'?await resumedApproval(extra.mcpReq.requestState(),digest,extra.mcpReq.inputResponses,extra):undefined;
    const approve:Approver=async(message,approvalOptions)=>{
      // Fail closed: no form elicitation capability, a URL-only client or any transport error means no approval.
      if (channel==='none') return 'unsupported';
      const request={mode:'form' as const,message,requestedSchema:structuredClone(APPROVAL_SCHEMA) as {type:'object';properties:{approved:{type:'boolean'}};required:string[]}};
      if (channel==='input-required') {
        if (resumed!==undefined) return resumed;
        const requestState=await approvalState.mint({n:randomBytes(16).toString('hex'),d:digest});
        return {pending:inputRequired({inputRequests:{[APPROVAL_INPUT_KEY]:inputRequired.elicit(request)},requestState}) as unknown as Record<string,unknown>};
      }
      const elicitation=server.server.getClientCapabilities()?.elicitation as {form?:unknown;url?:unknown};
      const options={signal:approvalOptions?.signal??extra.mcpReq.signal,timeout:APPROVAL_TIMEOUT_MS};
      let answer:unknown;
      if (elicitation.form!==undefined) answer=await extra.mcpReq.elicitInput(request as never,options);
      // A bare 2025-06 'elicitation: {}' declaration means form support (the pre-mode rule).
      else answer=await (server.server as unknown as {request(r:unknown,o:unknown):Promise<unknown>}).request({method:'elicitation/create',params:request},options);
      return approvalAnswer(answer);
    };
    const toolCtx:ToolContext={...ctx,session,approve:ctx.approve??approve,...(resumed!==undefined&&!ctx.approve?{approvalResumed:true}:{})};
    const output=await callTool(name,args,toolCtx,extra.mcpReq.signal);
    const pending=(output as {[APPROVAL_PENDING]?:Record<string,unknown>})[APPROVAL_PENDING];
    if (pending!==undefined) return pending as never;
    return server.server.projectCallToolResult(output,undefined);
  });
  server.server.onerror=()=>{};
  return server;
}
