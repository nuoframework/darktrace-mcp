import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import type { McpServer } from '@modelcontextprotocol/server';
import type { Readable, Writable } from 'node:stream';
import type { EventEmitter } from 'node:events';
import { DEFAULT_LIMITS, type Config } from '../config/schema.js';
import { createHttpClient } from '../client/httpClient.js';
import { operations, type OperationClient } from '../api/operations.js';
import { releaseAllowsOperation } from '../policy/release-capability.js';
import { inputLimits } from '../api/validation.js';
import { redactValue } from '../observability/redact.js';
import { createServer } from './createServer.js';
import { createSetupServer } from './setupServer.js';
import { boundedInput } from './input.js';
import { logEvent } from '../observability/log.js';
export const productionOperationDescriptors=Object.freeze(Object.values(operations).filter(releaseAllowsOperation).map(({operationId,method,pathTemplate})=>Object.freeze({operationId,method,pathTemplate})));
interface TestRuntime {testOnly:true;client:OperationClient&{close():void};stdin:Readable;stdout:Writable;signals:EventEmitter;}
interface Streams {stdin:Readable;stdout:Writable;signals:EventEmitter}
interface Session {
  /** Secret values redacted from every outgoing frame (none in setup mode). */
  tokens:readonly string[];
  limits:Parameters<typeof inputLimits>[0];
  factory:()=>McpServer;
  /** Releases the appliance client (a no-op in setup mode). */
  close:()=>void;
}
function serve(session:Session,streams:Streams) {
  const {stdin,stdout,signals}=streams;
  const limits=inputLimits(session.limits);
  const input=boundedInput(limits);
  const transport=new StdioServerTransport(input,stdout,{maxBufferSize:limits.maxToolInputBytes});
  const send=transport.send.bind(transport);
  transport.send=message=>{
    const tokens=session.tokens;
    // Correlation IDs belong to the JSON-RPC envelope, not tool data. Echo them verbatim.
    if('result' in message) return send({...message,result:redactValue(message.result,tokens)});
    if('error' in message) return send({...message,error:redactValue(message.error,tokens)});
    if('params' in message) return send({...message,params:redactValue(message.params,tokens)});
    return send(message);
  };
  const diagnostic=()=>{try{logEvent('protocol_error');}catch{/* cleanup must survive a closed stderr */}};
  let closing:Promise<void>|undefined;
  let handle:ReturnType<typeof serveStdio>|undefined;
  function shutdown():Promise<void> {
    if(closing) return closing;
    // Set the guard before closing a transport can reenter through onclose.
    closing=Promise.resolve().then(async()=>{try{await handle?.close();}catch{diagnostic();}});
    try {session.close();} catch {diagnostic();}
    signals.removeListener('SIGINT',onSignal);signals.removeListener('SIGTERM',onSignal);
    stdin.removeListener('end',onSignal);stdin.removeListener('close',onSignal);stdin.removeListener('error',onError);
    stdout.removeListener('error',onError);
    stdin.unpipe(input);input.destroy();stdin.destroy();
    return closing;
  }
  const onSignal=()=>{void shutdown();};
  const onError=()=>{diagnostic();void shutdown();};
  input.once('error',onError);
  stdin.once('end',onSignal);stdin.once('close',onSignal);stdin.once('error',onError);
  stdout.once('error',onError);
  signals.once('SIGINT',onSignal);signals.once('SIGTERM',onSignal);
  try {
    handle=serveStdio(session.factory,{transport,onerror:diagnostic,maxSubscriptions:0});
    const sdkClose=transport.onclose;
    transport.onclose=()=>{try{sdkClose?.();}finally{void shutdown();}};
    stdin.pipe(input);
  } catch {void shutdown();throw new Error('Protocol startup failed');}
  return {close:shutdown};
}
export function runStdio(cfg:Config, test?:TestRuntime) {
  if(test!==undefined && (test===null || !Object.hasOwn(test,'testOnly') || test.testOnly!==true)) throw new Error('Test runtime requires explicit testOnly');
  const client=test?.client??createHttpClient(cfg,{operations:productionOperationDescriptors});
  return serve({tokens:[cfg.auth.publicToken,cfg.auth.privateToken],limits:cfg.limits,factory:()=>createServer({cfg,client}),close:()=>client.close()},
    {stdin:test?.stdin??process.stdin,stdout:test?.stdout??process.stdout,signals:test?.signals??process});
}
/** Setup mode over the same bounded stdio transport: default input limits, no appliance client, no secrets to redact. */
export function runSetupStdio(streams?:Streams) {
  return serve({tokens:[],limits:DEFAULT_LIMITS,factory:createSetupServer,close:()=>undefined},
    streams??{stdin:process.stdin,stdout:process.stdout,signals:process});
}
