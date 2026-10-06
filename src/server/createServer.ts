import { McpServer, ProtocolError, ProtocolErrorCode } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { callTool, eligibleTools, type Approver, type ToolContext } from '../tools/index.js';
/** A human has two minutes to answer a confirmation dialog; silence means no. */
export const APPROVAL_TIMEOUT_MS=120_000;
export const VERSION='1.0.0';
export function createServer(ctx:ToolContext):McpServer {
  const server=new McpServer({name:'darktrace-mcp',version:VERSION},{capabilities:{tools:{listChanged:false}},maxToolInputElements:Math.min(ctx.cfg.limits.maxToolInputElements,5000)});
  let initialized=false;
  server.server.oninitialized=()=>{
    // A premature initialized notification must not unlock operation dispatch.
    if(server.server.getClientCapabilities()!==undefined) initialized=true;
  };
  function requireInitialization():void {
    if(!initialized) throw new ProtocolError(ProtocolErrorCode.InvalidRequest,'Complete initialize and notifications/initialized before using tools.');
  }
  const tools=eligibleTools(ctx.cfg).map(tool=>({name:tool.name,description:tool.description,annotations:tool.annotations,
    inputSchema:{...z.toJSONSchema(tool.inputSchema,{io:'input'}),type:'object'} as {type:'object';[key:string]:any}}));
  // Low-level dispatch keeps validation errors fixed and sanitized; Zod still validates every operation.
  server.server.setRequestHandler('tools/list',async()=>{requireInitialization();return {tools};});
  server.server.setRequestHandler('tools/call',async(params,extra)=>{
    requireInitialization();
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
