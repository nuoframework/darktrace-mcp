import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import type { Readable, Writable } from 'node:stream';
import type { EventEmitter } from 'node:events';
import type { Config } from '../config/schema.js';
import { createHttpClient } from '../client/httpClient.js';
import { operations, type OperationClient } from '../api/operations.js';
import { releaseAllowsOperation } from '../policy/release-capability.js';
import { inputLimits } from '../api/validation.js';
import { redactValue } from '../observability/redact.js';
import { createServer } from './createServer.js';
import { boundedInput } from './input.js';
import { logEvent } from '../observability/log.js';
export const productionOperationDescriptors=Object.freeze(Object.values(operations).filter(releaseAllowsOperation).map(({operationId,method,pathTemplate})=>Object.freeze({operationId,method,pathTemplate})));
interface TestRuntime {testOnly:true;client:OperationClient&{close():void};stdin:Readable;stdout:Writable;signals:EventEmitter;}
export function runStdio(cfg:Config, test?:TestRuntime) {
  if(test!==undefined && (test===null || !Object.hasOwn(test,'testOnly') || test.testOnly!==true)) throw new Error('Test runtime requires explicit testOnly');
  const client=test?.client??createHttpClient(cfg,{operations:productionOperationDescriptors});
  const stdin=test?.stdin??process.stdin, stdout=test?.stdout??process.stdout, signals=test?.signals??process;
  const limits=inputLimits(cfg.limits);
  const input=boundedInput(limits);
  const transport=new StdioServerTransport(input,stdout,{maxBufferSize:limits.maxToolInputBytes});
  const send=transport.send.bind(transport);
  transport.send=message=>{
    const tokens=[cfg.auth.publicToken,cfg.auth.privateToken];
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
    try {client.close();} catch {diagnostic();}
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
    handle=serveStdio(()=>createServer({cfg,client}),{transport,onerror:diagnostic,maxSubscriptions:0});
    const sdkClose=transport.onclose;
    transport.onclose=()=>{try{sdkClose?.();}finally{void shutdown();}};
    stdin.pipe(input);
  } catch {void shutdown();throw new Error('Protocol startup failed');}
  return {close:shutdown};
}
