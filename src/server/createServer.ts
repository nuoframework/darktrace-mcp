import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { callTool, eligibleTools, type ToolContext } from '../tools/index.js';
export const VERSION='0.1.0-alpha.0';
export function createServer(ctx:ToolContext):McpServer {
  const server=new McpServer({name:'darktrace-mcp',version:VERSION},{capabilities:{tools:{listChanged:false}},maxToolInputElements:Math.min(ctx.cfg.limits.maxToolInputElements,5000)});
  const tools=eligibleTools(ctx.cfg).map(tool=>({name:tool.name,description:tool.description,annotations:tool.annotations,
    inputSchema:{...z.toJSONSchema(tool.inputSchema,{io:'input'}),type:'object'} as {type:'object';[key:string]:any}}));
  // Low-level dispatch keeps validation errors fixed and sanitized; Zod still validates every operation.
  server.server.setRequestHandler('tools/list',async()=>({tools}));
  server.server.setRequestHandler('tools/call',async(params,extra)=>
    server.server.projectCallToolResult(await callTool(params.params.name,params.params.arguments??{},ctx,extra.mcpReq.signal),undefined));
  server.server.onerror=()=>{};
  return server;
}
