import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import type { Readable, Writable } from 'node:stream';
import type { EventEmitter } from 'node:events';
import type { Config } from '../config/schema.js';
import { createHttpClient } from '../client/httpClient.js';
import { operationDescriptors, type OperationClient } from '../api/operations.js';
import { inputLimits } from '../api/validation.js';
import { redactValue } from '../observability/redact.js';
import { createServer } from './createServer.js';
import { boundedInput } from './input.js';
import { logEvent } from '../observability/log.js';
interface TestRuntime {testOnly:true;client:OperationClient&{close():void};stdin:Readable;stdout:Writable;signals:EventEmitter;}
export function runStdio(cfg:Config, test?:TestRuntime) {
  if(test!==undefined && (test===null || !Object.hasOwn(test,'testOnly') || test.testOnly!==true)) throw new Error('Test runtime requires explicit testOnly');
  const client=test?.client??createHttpClient(cfg,{operations:operationDescriptors});
  const stdin=test?.stdin??process.stdin, stdout=test?.stdout??process.stdout, signals=test?.signals??process;
  const limits=inputLimits(cfg.limits);
  const input=boundedInput(limits);
  const transport=new StdioServerTransport(input,stdout,{maxBufferSize:limits.maxToolInputBytes});
  const send=transport.send.bind(transport);
  transport.send=message=>send(redactValue(message,[cfg.auth.publicToken,cfg.auth.privateToken]));
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
