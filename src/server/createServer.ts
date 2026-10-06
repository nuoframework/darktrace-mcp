import { CLIENT_CAPABILITIES_META_KEY, CLIENT_INFO_META_KEY, McpServer, PROTOCOL_VERSION_META_KEY, ProtocolError, ProtocolErrorCode } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { callTool, eligibleTools, type Approver, type ToolContext } from '../tools/index.js';
/** A human has two minutes to answer a confirmation dialog; silence means no. */
export const APPROVAL_TIMEOUT_MS=120_000;
export const VERSION='1.1.0';
/** Revisions whose clients identify themselves per request (`server/discover` + `_meta` envelope, no `initialize`).
 * Must match what the SDK advertises in server/discover; a test pins it. */
export const ENVELOPE_PROTOCOL_VERSIONS:readonly string[]=Object.freeze(['2026-07-28']);
const plainObject=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
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
export function createServer(ctx:ToolContext):McpServer {
  const server=new McpServer({name:'darktrace-mcp',version:VERSION},{capabilities:{tools:{listChanged:false}},maxToolInputElements:Math.min(ctx.cfg.limits.maxToolInputElements,5000)});
  function requireInitialization(envelope:unknown):void {
    const handshake={capabilities:server.server.getClientCapabilities(),clientInfo:server.server.getClientVersion(),version:server.server.getNegotiatedProtocolVersion()};
    if(!clientIdentified(handshake,envelope)) throw new ProtocolError(ProtocolErrorCode.InvalidRequest,'Complete initialize (or send the per-request _meta envelope) before using tools.');
  }
  const tools=eligibleTools(ctx.cfg).map(tool=>({name:tool.name,description:tool.description,annotations:tool.annotations,
    inputSchema:{...z.toJSONSchema(tool.inputSchema,{io:'input'}),type:'object'} as {type:'object';[key:string]:any}}));
  // Low-level dispatch keeps validation errors fixed and sanitized; Zod still validates every operation.
  server.server.setRequestHandler('tools/list',async(_request,extra)=>{requireInitialization(extra.mcpReq.envelope);return {tools};});
  server.server.setRequestHandler('tools/call',async(params,extra)=>{
    requireInitialization(extra.mcpReq.envelope);
    const approve:Approver=async message=>{
      // Fail closed: no elicitation capability, a URL-only client or any transport error means no approval.
      const elicitation=server.server.getClientCapabilities()?.elicitation as {form?:unknown;url?:unknown}|undefined;
      if (!elicitation||typeof elicitation!=='object') return 'unsupported';
      const request={mode:'form' as const,message,requestedSchema:{type:'object' as const,properties:{}}};
      const options={signal:extra.mcpReq.signal,timeout:APPROVAL_TIMEOUT_MS};
      let answer:{action?:unknown};
      if (elicitation.form!==undefined) answer=await extra.mcpReq.elicitInput(request,options);
      // A bare 2025-06 'elicitation: {}' declaration means form support (the pre-mode rule).
      else if (elicitation.url===undefined) answer=await (server.server as unknown as {request(r:unknown,o:unknown):Promise<{action?:unknown}>}).request({method:'elicitation/create',params:request},options);
      else return 'unsupported';
      return answer?.action==='accept'?'accept':answer?.action==='decline'?'decline':'cancel';
    };
    return server.server.projectCallToolResult(await callTool(params.params.name,params.params.arguments??{},{...ctx,approve:ctx.approve??approve},extra.mcpReq.signal),undefined);
  });
  server.server.onerror=()=>{};
  return server;
}
