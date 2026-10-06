import { McpServer, ProtocolError, ProtocolErrorCode } from '@modelcontextprotocol/server';
import { clientIdentified, VERSION } from './createServer.js';
import { CONNECTION_VARIABLES } from '../config/load.js';
/**
 * Setup mode: the process started with no connection variable at all (a one-click install, or a client entry
 * written before `setup` ran). Instead of failing, the server speaks MCP and exposes exactly one read-only,
 * network-free tool that says what is missing and the one command that fixes it. Nothing else is listed until
 * the operator configures the server; nothing here reads the environment, files or the network.
 */
export const SETUP_TOOL_NAME='darktrace_setup_status';
export const PACKAGE_SPEC=`@nuoframework/darktrace-mcp@${VERSION}`;
/** The one command to run. The version is pinned so the wizard matches the server the client installed. */
export const SETUP_COMMAND=`npx -y ${PACKAGE_SPEC} setup`;
const DOCS='https://github.com/nuoframework/darktrace-mcp/blob/main/docs/install.md';
export const MISSING=Object.freeze([
  {item:'appliance URL',variable:'DARKTRACE_URL'},
  {item:'public API token',variable:'DARKTRACE_PUBLIC_TOKEN_FILE (or DARKTRACE_PUBLIC_TOKEN)'},
  {item:'private API token',variable:'DARKTRACE_PRIVATE_TOKEN_FILE (or DARKTRACE_PRIVATE_TOKEN)'},
]);
export const SETUP_TOOL_DESCRIPTION=`Darktrace MCP ${VERSION} is installed but not configured: no appliance URL and no API tokens were given to this process (none of ${CONNECTION_VARIABLES.join(', ')} is set). No Darktrace tool is available until that is done. Fix: run \`${SETUP_COMMAND}\` in a terminal once (it asks for the appliance URL and the token pair, stores the tokens in owner-only files and rewrites this client's entry), then restart the client. Read-only; makes no network request.`;
export interface SetupStatus {
  readonly configured:false;
  readonly version:string;
  readonly missing:ReadonlyArray<{readonly item:string;readonly variable:string}>;
  readonly command:string;
  readonly then:string;
  readonly docs:string;
}
export function setupStatus():SetupStatus {
  return {configured:false,version:VERSION,missing:MISSING,command:SETUP_COMMAND,then:'Restart this client; the Darktrace tools appear once the entry carries the URL and token files.',docs:DOCS};
}
export function setupStatusText(status:SetupStatus=setupStatus()):string {
  return [
    `Darktrace MCP ${status.version} is installed but not configured.`,
    `Missing: ${status.missing.map(m=>`${m.item} (${m.variable})`).join('; ')}.`,
    `Run once in a terminal: ${status.command}`,
    status.then,
    `Guide: ${status.docs}`,
  ].join('\n');
}
export function createSetupServer():McpServer {
  const server=new McpServer({name:'darktrace-mcp',version:VERSION},{capabilities:{tools:{listChanged:false}}});
  function requireInitialization(envelope:unknown):void {
    const handshake={capabilities:server.server.getClientCapabilities(),clientInfo:server.server.getClientVersion(),version:server.server.getNegotiatedProtocolVersion()};
    if(!clientIdentified(handshake,envelope)) throw new ProtocolError(ProtocolErrorCode.InvalidRequest,'Invalid Request');
  }
  const tools=[{name:SETUP_TOOL_NAME,description:SETUP_TOOL_DESCRIPTION,
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
    inputSchema:{type:'object' as const,properties:{},additionalProperties:false}}];
  server.server.setRequestHandler('tools/list',async(_request,extra)=>{requireInitialization(extra.mcpReq.envelope);return {tools};});
  server.server.setRequestHandler('tools/call',async(params,extra)=>{
    requireInitialization(extra.mcpReq.envelope);
    const status=setupStatus();
    if(params.params.name!==SETUP_TOOL_NAME) {
      return {content:[{type:'text' as const,text:`Unknown tool. ${setupStatusText(status)}`}],isError:true};
    }
    return {content:[{type:'text' as const,text:setupStatusText(status)}],structuredContent:{...status,missing:status.missing.map(m=>({...m}))}};
  });
  server.server.onerror=()=>{};
  return server;
}
