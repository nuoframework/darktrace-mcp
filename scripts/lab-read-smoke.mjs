// Manual operator harness. Never reads token/config contents or writes telemetry.
import {fileURLToPath} from 'node:url';
import {isAbsolute,relative,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {constants,openSync,closeSync,fstatSync,readSync,readdirSync,lstatSync} from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {isIP} from 'node:net';

const root=fileURLToPath(new URL('../',import.meta.url));
const candidates=Object.freeze({
  darktrace_get_status:{operation:'get_status',args:{operation:'get_status',query:{fast:true,includechildren:false}},kind:'object'},
  darktrace_list_models:{operation:'get_models',args:{operation:'get_models'},kind:'array'},
  darktrace_list_tags:{operation:'get_tags',args:{operation:'get_tags'},kind:'array'},
});
// Code-owned operation selectors. No catalogue-driven expansion of this allowlist.
const campaign=Object.freeze({
 get_status:{query:{fast:true,includechildren:false}},
 get_aianalyst_groups:{window:true,query:{includeallpinned:false,includeacknowledged:false,includegroupurl:false}},
 get_aianalyst_incident_comments:{needs:'incident_id',queryHandle:'incident_id'},
 get_aianalyst_incidentevents:{window:true,query:{includeallpinned:false,includeacknowledged:false,includeincidenteventurl:false}},
 get_aianalyst_investigations:{window:true},get_aianalyst_stats:{window:true},
 get_antigena:{window:true,query:{fulldevicedetails:false,includecleared:false,includehistory:false,includeconnections:false}},
 get_antigena_summary:{window:true},get_components:{},
 get_components_cid:{needs:'cid',pathHandle:'cid'},
 get_cves:{needs:'did',queryHandle:'did',query:{fulldevicedetails:false}},
 get_details:{needs:'did',queryHandle:'did',window:true,query:{count:1,eventtype:'connection',fulldevicedetails:false,deduplicate:true}},
 // intervalhours is aggregation size, NOT an upstream time-window limit.
 get_deviceinfo:{needs:'did',queryHandle:'did',query:{fulldevicedetails:false,showallgraphdata:false,similardevices:0}},
 get_devices:{query:{count:1,seensince:'300',includetags:false,cloudsecurity:false}},
 get_devicesearch:{query:{count:1,offset:0,seensince:'300'}},
 get_devicesummary:{needs:'did',queryHandle:'did'},
 get_endpointdetails:{blocked:'BLOCKED_ENDPOINT_IDENTITY'},
 get_enums:{},get_filtertypes:{},get_intelfeed:{query:{sources:true,fulldetails:false}},
 get_mbcomments:{window:true,query:{count:1}},
 get_metricdata:{blocked:'BLOCKED_METRIC_CONTRACT'},
 get_metrics:{},get_metrics_mlid:{needs:'mlid',pathHandle:'mlid'},
 get_modelbreaches:{window:true,query:{minimal:true,deviceattop:false,expandenums:false,includebreachurl:false}},
 get_modelbreaches_pbid:{needs:'pbid',pathHandle:'pbid',query:{minimal:true,deviceattop:false,expandenums:false,includebreachurl:false}},
 get_modelbreaches_pbid_comments:{needs:'pbid',pathHandle:'pbid'},
 get_models:{needs:'model_uuid',queryHandle:'uuid'},get_models_pid:{needs:'pid',pathHandle:'pid'},
 get_network:{needs:'did',queryHandle:'did',window:true,query:{fulldevicedetails:false}},
 get_similardevices:{needs:'did',queryHandle:'did',query:{count:1,fulldevicedetails:false}},
 get_subnets:{query:{seensince:'60'}},
 get_summarystatistics:{blocked:'BLOCKED_EVENTTYPE_CONTRACT'},
 get_tags:{},get_tags_entities:{needs:'did',queryHandle:'did',query:{fulldevicedetails:false}},
 get_tags_tid:{needs:'tid',pathHandle:'tid'},
 get_tags_tid_entities:{needs:'tid',pathHandle:'tid',query:{fulldevicedetails:false}},
});
const validationProfiles=Object.freeze({
 minimal:Object.freeze({responseBytes:32768,outputChars:8192,shapeElements:6000,shapeStringBytes:16384,inventoryDiscovery:false}),
 inventory:Object.freeze({responseBytes:1048576,outputChars:60000,shapeElements:20000,shapeStringBytes:240000,inventoryDiscovery:true}),
});
const metricNamePattern=/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/;
const inventoryRecipes=Object.freeze({
 // Reviewed bounded first page for same-run endpoint-IP discovery; no pagination or recent filter.
 get_devicesearch:Object.freeze({query:{count:10,offset:0}}),
 get_metricdata:Object.freeze({needs:['did','metric_name'],queryHandles:{did:'did',metric:'metric_name'},window:true,query:{interval:300,breachtimes:false,fulldevicedetails:false}}),
 // Reviewed aggregate: one hour of loginput counts ending at this run's anchor; never detailed events.
 get_summarystatistics:Object.freeze({anchor:'endtime',query:{eventtype:'loginput',hours:1}}),
 // Existing discovered device IP only, kept in memory; no hostname, invented address or expansion.
 get_endpointdetails:Object.freeze({needs:['endpoint_ip'],queryHandles:{ip:'endpoint_ip'},query:{devices:false,additionalinfo:false,score:false}}),
});
// Code-owned copy of the production safe API diagnostic enum; anything else is ignored.
const apiErrorCodes=Object.freeze(['auth','forbidden','bad_request','not_found','rate_limited','server','network','timeout','cancelled','too_large','invalid_request','invalid_response','overloaded','clock_skew_suspected']);
const endpointIp=value=>typeof value==='string'&&value.length<=45&&/^[0-9A-Fa-f:.]+$/.test(value)&&isIP(value)!==0;
// Session-wide child settings; never claim different caps for individual operations.
const validationPolicy=Object.freeze({schemaVersion:1,profiles:validationProfiles,operations:campaign,inventoryRecipes,apiErrorCodes,metricNamePattern:metricNamePattern.source,smokeTools:candidates,timeoutMs:30000,maxCalls:8,maxConcurrent:1,maxQueued:0,maxPages:1,maxGetRetries:0,ratePerMinute:8,windowMs:300000,transportMaxBufferBytes:1048576});
const validationPolicySha256=createHash('sha256').update(JSON.stringify(validationPolicy)).digest('hex');
const HELP=`Manual lab read smoke (operator execution only)
Usage: node scripts/lab-read-smoke.mjs --config /absolute/private/operator.json --runtime-manifest /absolute/private/reviewed-runtime.json --tools darktrace_get_status
Later, only after operator schema review and successful status:
  --tools darktrace_get_status,darktrace_list_models,darktrace_list_tags
Reviewed campaign alternative: --operations get_status,get_devices,get_devicesummary
Use either --tools (original three-tool smoke) or --operations (code-owned GET campaign).
Optional --validation-profile inventory: fixed session-wide 1 MiB upstream / 60000 output chars;
count=1 device / count=10 first-page device-search inventory without seensince. Default minimal preserves 32 KiB / 8192 and recent=300.
Inventory also allows summarystatistics eventtype=loginput hours=1 with endtime at this run's anchor, and
endpointdetails for the IP of the device found by an earlier get_devicesearch (devices/additionalinfo/score false).
Status must be first. Dependencies must be explicitly selected earlier in the same run.
Schema-2 manifest must bind reviewed source/build and 14 full host SDK dependency package trees before any SDK import or child launch.
Docker alternative after operator review: add --docker-image sha256:<64 lowercase hex>
  --public-token-file /absolute/private/public-token --private-token-file /absolute/private/private-token
  Optional --user UID:GID (both nonzero; default 1000:1000), --ca-file /absolute/private/ca.pem.
Docker config is separate protected JSON using /run/secrets/public-token and private-token.
Docker volume alternative: replace the token/CA file flags with --secret-volume darktrace-mcp-lab-secrets-<32 lowercase hex>,
  an operator-created local named volume holding only config.json, public-token, private-token and optional ca.pem,
  each a 0600 single-link regular file owned by --user. It is mounted read-only at /run/secrets; --config is not
  mounted or read in this mode. The harness never creates, modifies or removes the operator's volume.
No arbitrary arguments, identifiers, entrypoints or token-value flags. Missing inputs are BLOCKED, never PASS.
Limits: at most 8 selected calls (3 smoke candidates; 37 GET campaign entries), sequential, 30 seconds each,
1 GET per selected operation, no retries/pages/cursors; minimal 32 KiB / 8192, inventory 1 MiB / 60000.
Only sanitized JSONL outcomes are emitted. Child diagnostics are discarded. No lab success is implied by readiness.
`;
// Third-party diagnostics, warnings and fatal stacks must not reach the report/stderr.
const emit=line=>process.stdout.write(JSON.stringify(line)+'\n');
process.stderr.write=(_chunk,encoding,callback)=>{const done=typeof encoding==='function'?encoding:callback;if(typeof done==='function')queueMicrotask(()=>done());return true;};
for(const key of ['log','info','debug','warn','error','trace'])console[key]=()=>{};
const life=new AbortController();
process.once('SIGINT',()=>life.abort());process.once('SIGTERM',()=>life.abort());
class SafeFailure extends Error {constructor(code){super(code);this.code=code;}}
let reviewedManifestSha256,reviewedRuntimeFiles,activeValidationProfile='minimal';
const envelope=(operation,tool,success,errorCode,expectedShape,elapsedMs,version,apiErrorCode)=>({operation,tool,success,errorCode,...(apiErrorCode===undefined?{}:{apiErrorCode}),expectedShape,elapsedMs:Math.round(elapsedMs),validationProfile:activeValidationProfile,validationPolicySha256,...(version===undefined?{}:{version}),...(reviewedManifestSha256?{runtimeManifestSha256:reviewedManifestSha256}:{})});
const fatal=code=>{emit(envelope('session',null,false,code,{},0));process.exitCode=1;};
process.on('uncaughtException',()=>{fatal('HARNESS_FAILED');process.exit(1);});
process.on('unhandledRejection',()=>{fatal('HARNESS_FAILED');process.exit(1);});

function parse(args){
 if(args.length===1&&args[0]==='--help')return null;
 const fields={};
 for(let i=0;i<args.length;i+=2){const key=args[i];if(!['--config','--tools','--operations','--runtime-manifest','--docker-image','--user','--public-token-file','--private-token-file','--ca-file','--validation-profile','--secret-volume'].includes(key)||fields[key]!==undefined||typeof args[i+1]!=='string'||args[i+1].startsWith('--'))throw new SafeFailure('INVALID_CLI');fields[key]=args[i+1];}
 if(!fields['--config']||!isAbsolute(fields['--config'])||!fields['--runtime-manifest']||!isAbsolute(fields['--runtime-manifest'])||!!fields['--tools']===!!fields['--operations'])throw new SafeFailure('INVALID_CLI');
 const mode=fields['--tools']?'smoke':'campaign',selected=(fields['--tools']??fields['--operations']).split(',');
 const validationProfile=fields['--validation-profile']??'minimal';if(!Object.hasOwn(validationProfiles,validationProfile))throw new SafeFailure('INVALID_VALIDATION_PROFILE');
 if(selected.length>8||new Set(selected).size!==selected.length||selected[0]!==(mode==='smoke'?'darktrace_get_status':'get_status')||selected.some(t=>!Object.hasOwn(mode==='smoke'?candidates:campaign,t)))throw new SafeFailure('INVALID_TOOL_SELECTION');
 let docker;
 if(fields['--docker-image']){
  if(!/^sha256:[a-f\d]{64}$/.test(fields['--docker-image']))throw new SafeFailure('INVALID_DOCKER_SELECTION');
  const user=fields['--user']??'1000:1000';if(!/^[1-9]\d{0,9}:[1-9]\d{0,9}$/.test(user)||user.split(':').some(x=>Number(x)>2147483647))throw new SafeFailure('INVALID_DOCKER_SELECTION');
  const secretVolume=fields['--secret-volume'];
  if(secretVolume!==undefined&&(!secretVolumePattern.test(secretVolume)||['--public-token-file','--private-token-file','--ca-file'].some(k=>fields[k]!==undefined)))throw new SafeFailure('INVALID_DOCKER_SELECTION');
  for(const key of ['--config',...(secretVolume===undefined?['--public-token-file','--private-token-file',...(fields['--ca-file']?['--ca-file']:[])]:[])]){if(!fields[key]||!isAbsolute(fields[key])||/[\x00-\x1f,=]/.test(fields[key]))throw new SafeFailure('INVALID_DOCKER_SELECTION');const external=relative(root,resolve(fields[key]));if(!external.startsWith('../')&&external!=='..')throw new SafeFailure('INVALID_DOCKER_SELECTION');}
  docker=secretVolume===undefined?{image:fields['--docker-image'],user,publicFile:fields['--public-token-file'],privateFile:fields['--private-token-file'],caFile:fields['--ca-file']}:{image:fields['--docker-image'],user,secretVolume};
 }else if(['--user','--public-token-file','--private-token-file','--ca-file','--secret-volume'].some(k=>fields[k]!==undefined))throw new SafeFailure('INVALID_DOCKER_SELECTION');
 return {config:fields['--config'],manifest:fields['--runtime-manifest'],mode,selected,docker,validationProfile};
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function checkedBytes(path,cap,protectedFile=false){
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try {const stat=fstatSync(fd);if(!stat.isFile()||stat.size<1||stat.size>cap||(protectedFile&&(stat.uid!==process.getuid()||(stat.mode&0o7177)!==0||stat.nlink!==1)))throw new Error();
  const bytes=Buffer.alloc(stat.size+1);let n=0,got;while((got=readSync(fd,bytes,n,bytes.length-n,null))>0)n+=got;
  if(n!==stat.size)throw new Error();return bytes.subarray(0,n);
 }finally{closeSync(fd);}
}
function inventory(base,accept){
 const paths=[];
 const visit=dir=>{const stat=lstatSync(resolve(base,dir));if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error();for(const entry of readdirSync(resolve(base,dir),{withFileTypes:true})){const name=dir+'/'+entry.name;if(entry.isSymbolicLink())throw new Error();if(entry.isDirectory())visit(name);else if(entry.isFile()&&accept(name))paths.push(name);else if(!entry.isFile())throw new Error();}};
 return {visit,paths};
}
const dependencyNames=['@modelcontextprotocol/core','@modelcontextprotocol/server','@modelcontextprotocol/client','zod','cross-spawn','which','isexe','path-key','shebang-command','shebang-regex','eventsource','eventsource-parser','pkce-challenge','jose'];
function dependencyTrees(){
 const started=performance.now(),trees={};let count=0,bytes=0,directories=0;
 const budget=()=>{if(performance.now()-started>20000)throw new Error();};
 const directory=path=>{budget();const stat=lstatSync(path);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error();};
 directory(resolve(root,'node_modules'));directory(resolve(root,'node_modules/@modelcontextprotocol'));
 for(const name of dependencyNames){
  const base=resolve(root,'node_modules',name),files=Object.create(null);
  const walk=(dir,prefix='',depth=0)=>{directory(dir);if(++directories>4096||depth>32)throw new Error();
   for(const entry of readdirSync(dir,{withFileTypes:true})){budget();const path=resolve(dir,entry.name),key=prefix+entry.name;if(entry.isSymbolicLink())throw new Error();
    if(entry.isDirectory())walk(path,key+'/',depth+1);
    else if(entry.isFile()){
     // Inspect and read the same descriptor; never trust a prior path stat.
     const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
     try{const actual=fstatSync(fd);if(!actual.isFile()||++count>4096||actual.size>8388608||(bytes+=actual.size)>67108864)throw new Error();const data=Buffer.alloc(actual.size+1);let n=0,got;while((got=readSync(fd,data,n,data.length-n,null))>0){n+=got;budget();}if(n!==actual.size)throw new Error();files[key]=hash(data.subarray(0,n));}finally{closeSync(fd);}
    }else throw new Error();
   }
  };walk(base);if(!Object.hasOwn(files,'package.json'))throw new Error();
  trees[name]=hash(JSON.stringify(Object.fromEntries(Object.keys(files).sort().map(key=>[key,files[key]]))));budget();
 }return trees;
}
function verifyRuntime(manifestPath){
 try {
  const external=relative(root,resolve(manifestPath));if(!external.startsWith('../')&&external!=='..')throw new Error();
  const bytes=checkedBytes(manifestPath,65536,true),value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!value||Object.keys(value).sort().join(',')!=='dependencyTrees,runtimeFiles,schemaVersion,sourceFiles'||value.schemaVersion!==2)throw new Error();
  if(!value.dependencyTrees||Array.isArray(value.dependencyTrees)||typeof value.dependencyTrees!=='object'||Object.keys(value.dependencyTrees).sort().join(',')!==[...dependencyNames].sort().join(',')||Object.values(value.dependencyTrees).some(v=>typeof v!=='string'||! /^[a-f0-9]{64}$/.test(v)))throw new Error();
  const actualDependencies=dependencyTrees();if(dependencyNames.some(name=>actualDependencies[name]!==value.dependencyTrees[name]))throw new Error();
  const source=inventory(root,p=>p.startsWith('src/')?/\.(ts|json)$/.test(p):/\.(mjs|ts)$/.test(p));source.visit('src');source.visit('scripts');
  for(const p of ['package.json','package-lock.json','npm-shrinkwrap.json','tsconfig.json','tsconfig.generate.json','openapi/darktrace-threat-visualizer.yaml','docs/operation-inventory.json']){const stat=lstatSync(resolve(root,p));if(!stat.isFile()||stat.isSymbolicLink())throw new Error();source.paths.push(p);}
  const runtime=inventory(root,p=>/\.(js|json)$/.test(p));runtime.visit('dist/src');
  for(const [expected,entries] of [[source.paths,value.sourceFiles],[runtime.paths,value.runtimeFiles]]){
   if(!entries||typeof entries!=='object'||Array.isArray(entries)||Object.keys(entries).sort().join('\n')!==expected.sort().join('\n'))throw new Error();
   for(const p of expected){if(!/^[A-Za-z0-9_./-]+$/.test(p)||p.split('/').some(x=>x==='..'||x==='.')||! /^[a-f0-9]{64}$/.test(entries[p]))throw new Error();
    const parts=p.split('/');for(let i=1;i<parts.length;i++){const stat=lstatSync(resolve(root,parts.slice(0,i).join('/')));if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error();}
    if(hash(checkedBytes(resolve(root,p),8388608))!==entries[p])throw new Error();
   }
  }
  reviewedRuntimeFiles=value.runtimeFiles;return hash(bytes);
 }catch {throw new SafeFailure('DIST_NOT_REVIEWED');}
}
function dockerEnvironment(){const env={};for(const key of ['PATH','HOME','USER','LOGNAME','SHELL'])if(process.env[key]!==undefined)env[key]=process.env[key];return env;}
// These commands produce local inventory/lifecycle metadata only; never lab stdout.
function dockerMetadata(args,timeout=5000,interruptible=false){
 return new Promise((resolveResult,reject)=>{
  const child=spawn('docker',args,{env:dockerEnvironment(),stdio:['ignore','pipe','ignore'],shell:false});
  let ended=false,bytes=0,timer;const chunks=[];
  const finish=(error,value)=>{if(ended)return;ended=true;clearTimeout(timer);life.signal.removeEventListener('abort',interrupt);error?reject(error):resolveResult(value);};
  const interrupt=()=>{child.kill('SIGTERM');finish(new SafeFailure('INTERRUPTED'));};
  child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>65536){child.kill('SIGKILL');finish(new SafeFailure('DOCKER_METADATA_LIMIT'));}else chunks.push(chunk);});
  child.on('error',()=>finish(new SafeFailure('DOCKER_COMMAND_FAILED')));
  child.on('close',code=>code===0?finish(null,Buffer.concat(chunks).toString('utf8')):finish(new SafeFailure('DOCKER_COMMAND_FAILED')));
  timer=setTimeout(()=>{child.kill('SIGKILL');finish(new SafeFailure('DOCKER_COMMAND_TIMEOUT'));},timeout);
  if(interruptible){life.signal.addEventListener('abort',interrupt,{once:true});if(life.signal.aborted)interrupt();}
 });
}
const dockerFlags=['--rm','--init','--pids-limit=64','--memory=256m','--pull=never','--log-driver=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges'];
async function closeDocker(name){
 const remaining=()=>dockerMetadata(['ps','--all','--filter','name=^/'+name+'$','--format','{{.Names}}']);
 try {
  if(!(await remaining()).trim())return;
  try {await dockerMetadata(['stop','--time','2',name]);}catch {await dockerMetadata(['kill',name]);}
  if((await remaining()).trim()){await dockerMetadata(['rm','--force',name]);if((await remaining()).trim())throw new Error();}
 }catch {throw new SafeFailure('DOCKER_CLEANUP_FAILED');}
}
const imageCheck=`import fs from 'node:fs';import crypto from 'node:crypto';
const files={};function walk(dir,prefix){const stat=fs.lstatSync(dir);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error();
for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const name=prefix+'/'+entry.name,target=dir+'/'+entry.name;if(entry.isSymbolicLink())throw Error();if(entry.isDirectory())walk(target,name);else if(entry.isFile()&&/\\.(js|json)$/.test(name)){if(fs.statSync(target).size>8388608)throw Error();files[name]=crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');}else if(!entry.isFile())throw Error();}}
if(fs.lstatSync('/app').isSymbolicLink()||fs.lstatSync('/app/dist').isSymbolicLink())throw Error();walk('/app/dist/src','dist/src');process.stdout.write(JSON.stringify(files));`;
const secretVolumePattern=/^darktrace-mcp-lab-secrets-[a-f0-9]{32}$/;
// Metadata only: names, types, owner, mode, links and sizes. Secret contents are never read.
const secretCheck=`import fs from 'node:fs';
const dir='/run/secrets',limits={'config.json':65536,'public-token':4096,'private-token':4096,'ca.pem':1048576};
const d=fs.lstatSync(dir);if(!d.isDirectory()||d.isSymbolicLink()||(d.mode&0o022)!==0)throw Error();
const names=fs.readdirSync(dir).sort();
if(['config.json','public-token','private-token'].some(n=>!names.includes(n))||names.some(n=>!Object.hasOwn(limits,n)))throw Error();
for(const n of names){const p=dir+'/'+n,l=fs.lstatSync(p);if(!l.isFile()||l.isSymbolicLink())throw Error();
const fd=fs.openSync(p,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
try{const s=fs.fstatSync(fd);if(!s.isFile()||s.ino!==l.ino||s.dev!==l.dev||s.uid!==process.getuid()||(s.mode&0o7177)!==0||s.nlink!==1||s.size<1||s.size>limits[n])throw Error();}finally{fs.closeSync(fd);}}
process.stdout.write(JSON.stringify({ca:names.includes('ca.pem')}));`;
async function verifySecretVolume(docker){
 const volume=docker.secretVolume;let meta;
 try {meta=JSON.parse(await dockerMetadata(['volume','inspect','--format','{{json .}}',volume]));}catch {throw new SafeFailure('SECRET_VOLUME_NOT_REVIEWED');}
 const options=meta?.Options;
 if(!meta||meta.Name!==volume||meta.Driver!=='local'||meta.Scope!=='local'||!(options===null||options===undefined||(typeof options==='object'&&!Array.isArray(options)&&Object.keys(options).length===0)))throw new SafeFailure('SECRET_VOLUME_NOT_REVIEWED');
 let users;try {users=await dockerMetadata(['ps','--all','--filter','volume='+volume,'--format','{{.Names}}']);}catch {throw new SafeFailure('SECRET_VOLUME_NOT_REVIEWED');}
 if(users.trim())throw new SafeFailure('SECRET_VOLUME_IN_USE');
 const checkName='darktrace-mcp-lab-check-'+randomBytes(16).toString('hex');let result;
 try {
  const output=await dockerMetadata(['run',...dockerFlags,'--network=none','--name',checkName,'--user',docker.user,'--mount','type=volume,source='+volume+',target=/run/secrets,readonly,volume-nocopy','--entrypoint','node',docker.image,'--input-type=module','-e',secretCheck],30000,true);
  try {result=JSON.parse(output);}catch {throw new SafeFailure('SECRET_VOLUME_NOT_REVIEWED');}
 }catch(error){throw error instanceof SafeFailure&&error.code!=='DOCKER_COMMAND_FAILED'?error:new SafeFailure('SECRET_VOLUME_NOT_REVIEWED');}
 finally{await closeDocker(checkName);}
 if(!result||typeof result!=='object'||Array.isArray(result)||Object.keys(result).join(',')!=='ca'||typeof result.ca!=='boolean')throw new SafeFailure('SECRET_VOLUME_NOT_REVIEWED');
 return result.ca;
}
async function dockerTransport(selection,env){
 const {docker}=selection,checkName='darktrace-mcp-lab-check-'+randomBytes(16).toString('hex');
 try {
  const output=await dockerMetadata(['run',...dockerFlags,'--network=none','--name',checkName,'--user',docker.user,'--entrypoint','node',docker.image,'--input-type=module','-e',imageCheck],30000,true);
  let files;try {files=JSON.parse(output);}catch {throw new SafeFailure('DOCKER_RUNTIME_NOT_REVIEWED');}
  if(!files||Array.isArray(files)||typeof files!=='object'||Object.keys(files).sort().join('\n')!==Object.keys(reviewedRuntimeFiles).sort().join('\n')||Object.entries(reviewedRuntimeFiles).some(([p,digest])=>files[p]!==digest))throw new SafeFailure('DOCKER_RUNTIME_NOT_REVIEWED');
 }finally{await closeDocker(checkName);}
 const volumeCa=docker.secretVolume===undefined?undefined:await verifySecretVolume(docker);
 const name='darktrace-mcp-lab-'+randomBytes(16).toString('hex');
 const args=['run',...dockerFlags,'-i','--name',name,'--user',docker.user,'--entrypoint','node'];
 if(docker.secretVolume!==undefined)args.push('--mount','type=volume,source='+docker.secretVolume+',target=/run/secrets,readonly,volume-nocopy');
 else {
  const mounts=[[selection.config,'/run/secrets/config.json'],[docker.publicFile,'/run/secrets/public-token'],[docker.privateFile,'/run/secrets/private-token'],...(docker.caFile?[[docker.caFile,'/run/secrets/ca.pem']]:[])];
  for(const [source,target] of mounts)args.push('--mount','type=bind,source='+source+',target='+target+',readonly');
 }
 const productionEnv={...env,DARKTRACE_CONFIG_FILE:'/run/secrets/config.json',DARKTRACE_PUBLIC_TOKEN_FILE:'/run/secrets/public-token',DARKTRACE_PRIVATE_TOKEN_FILE:'/run/secrets/private-token'};
 if(docker.caFile||volumeCa)productionEnv.NODE_EXTRA_CA_CERTS='/run/secrets/ca.pem';
 for(const [key,value] of Object.entries(productionEnv))args.push('-e',key+'='+value);
 args.push(docker.image,'--no-warnings','/app/dist/src/index.js');
 return {command:'docker',args,cwd:root,env:dockerEnvironment(),name};
}
function argumentsFor(id,handles,now,profile='minimal'){
 if(!Object.hasOwn(validationProfiles,profile))throw new SafeFailure('INVALID_VALIDATION_PROFILE');
 const spec=profile==='inventory'&&Object.hasOwn(inventoryRecipes,id)?inventoryRecipes[id]:campaign[id];if(!spec)throw new SafeFailure('INVALID_TOOL_SELECTION');if(spec.blocked)throw new SafeFailure(spec.blocked);
 const needs=Array.isArray(spec.needs)?spec.needs:spec.needs?[spec.needs]:[];
 if(needs.some(key=>handles[key]===undefined))throw new SafeFailure('BLOCKED_MISSING_IDENTIFIER');
 if(id==='get_endpointdetails'&&!endpointIp(handles.endpoint_ip))throw new SafeFailure('BLOCKED_IDENTIFIER_CONTRACT');
 if(id==='get_metricdata'&&(!Number.isSafeInteger(handles.did)||handles.did<=0||typeof handles.metric_name!=='string'||!metricNamePattern.test(handles.metric_name)))throw new SafeFailure('BLOCKED_IDENTIFIER_CONTRACT');
 const args={operation:id},query={...spec.query};
 if(validationProfiles[profile].inventoryDiscovery&&['get_devices','get_devicesearch'].includes(id))delete query.seensince;
 if(spec.window){query.endtime=Math.floor(now/1000)*1000;query.starttime=query.endtime-300000;}
 if(spec.anchor==='endtime')query.endtime=Math.floor(now/1000)*1000;
 if(spec.queryHandle)query[spec.queryHandle]=handles[spec.needs];
 if(spec.queryHandles)for(const [key,handle] of Object.entries(spec.queryHandles))query[key]=handles[handle];
 if(spec.pathHandle)args.path={[spec.pathHandle]:handles[spec.needs]};
 if(Object.keys(query).length)args.query=query;
 return args;
}
function remember(id,data,handles,profile='minimal'){
 const first=(rows,key)=>Array.isArray(rows)?rows.find(x=>Number.isSafeInteger(x?.[key])&&x[key]>0)?.[key]:Number.isSafeInteger(rows?.[key])&&rows[key]>0?rows[key]:undefined;
 const sources={get_devices:'did',get_devicesearch:'did',get_components:'cid',get_models:'pid',get_tags:'tid',get_metrics:'mlid',get_modelbreaches:'pbid'};
 if(sources[id]){const key=sources[id],value=first(id==='get_devicesearch'?data?.devices:data,key);if(value!==undefined&&handles[key]===undefined)handles[key]=value;}
 if(profile==='inventory'&&id==='get_devicesearch'&&Array.isArray(data?.devices)&&handles.endpoint_ip===undefined){const ip=data.devices.find(row=>Number.isSafeInteger(row?.did)&&row.did>0&&endpointIp(row?.ip))?.ip;if(ip!==undefined)handles.endpoint_ip=ip;}
 if(profile==='inventory'&&id==='get_metrics'&&Array.isArray(data)&&handles.metric_name===undefined){const name=data.find(row=>typeof row?.name==='string'&&metricNamePattern.test(row.name))?.name;if(name!==undefined)handles.metric_name=name;}
 if(id==='get_devicesearch'&&Array.isArray(data?.devices)){for(const device of data.devices){const tid=first(device?.tags,'tid');if(tid!==undefined&&handles.tid===undefined){handles.tid=tid;break;}}}
 if(id==='get_tags_entities'){const tid=first(data,'tid');if(tid!==undefined&&handles.tid===undefined)handles.tid=tid;}
 if(id==='get_modelbreaches'&&Array.isArray(data)){
  const uuid=data.find(x=>typeof x?.model?.now?.uuid==='string'&&/^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i.test(x.model.now.uuid))?.model?.now?.uuid;
  if(uuid!==undefined&&handles.model_uuid===undefined)handles.model_uuid=uuid;
 }
 // Only the incident event's own documented id, never a group identifier.
 if(id==='get_aianalyst_incidentevents'&&Array.isArray(data)){const value=data.find(x=>typeof x?.id==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(x.id))?.id;if(value!==undefined&&handles.incident_id===undefined)handles.incident_id=value;}
}
// OpenAPI AianalystStats explicitly omits tactic keys when no incidents match.
const emptyStatsMaps=new Set(['total','compliance','suspicious','critical'].map(k=>'groupStats.mitreTactics.'+k));
function viewShape(view,data,operation,path=''){
 if(!view)return false;
 if(view.kind==='null')return data===null;
 if(view.kind==='union')return view.variants.some(v=>viewShape(v,data,operation,path));
 if(view.kind==='array')return Array.isArray(data)&&data.every(x=>viewShape(view.items,x,operation,path+'[]'));
 if(view.kind==='object')return !!data&&typeof data==='object'&&!Array.isArray(data)&&(Object.keys(data).length>0||(operation==='get_aianalyst_stats'&&emptyStatsMaps.has(path)))&&Object.entries(data).every(([k,v])=>Object.hasOwn(view.fields,k)&&viewShape(view.fields[k],v,operation,path?path+'.'+k:k));
 if(view.kind==='number')return typeof data==='number'&&Number.isFinite(data);
 if(view.kind==='boolean'||view.kind==='string')return typeof data===view.kind;
 // Projected summary leaves are not a promise about the original response.
 return view.kind==='summary'&&data!==undefined;
}
function bounded(value,{maxDepth=16,maxElements=20000,maxStringBytes=131072}={}){
 const stack=[[value,0]];let elements=0;
 while(stack.length){const [v,depth]=stack.pop();if(++elements>maxElements||depth>maxDepth)throw new SafeFailure('RESPONSE_LIMIT');
  if(typeof v==='string'&&Buffer.byteLength(v)>maxStringBytes)throw new SafeFailure('RESPONSE_LIMIT');
  if(v&&typeof v==='object'){for(const [k,x] of Object.entries(v)){if(Buffer.byteLength(k)>1024)throw new SafeFailure('RESPONSE_LIMIT');stack.push([x,depth+1]);}}
 }
}
async function deadline(action){
 const abort=new AbortController();let timer;const interrupt=()=>abort.abort();life.signal.addEventListener('abort',interrupt,{once:true});
 try {if(life.signal.aborted)throw new SafeFailure('INTERRUPTED');
  return await Promise.race([action({signal:abort.signal,timeout:30000,maxTotalTimeout:30000,resetTimeoutOnProgress:false}),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(new SafeFailure('CALL_TIMEOUT'));},30000);})]);
 }finally{clearTimeout(timer);life.signal.removeEventListener('abort',interrupt);}
}
function shape(result,def,profile='minimal'){
 if(!Object.hasOwn(validationProfiles,profile))throw new SafeFailure('INVALID_VALIDATION_PROFILE');
 const policy=validationProfiles[profile];bounded(result,{maxDepth:12,maxElements:policy.shapeElements,maxStringBytes:policy.shapeStringBytes});
 const value=result?.structuredContent;
 const hasEnvelope=!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.hasOwn(value,'data');
 const data=hasEnvelope?value.data:undefined;
 const dataObject=!!data&&typeof data==='object'&&!Array.isArray(data);
 const dataArray=Array.isArray(data);
 const itemObjects=dataArray&&data.every(x=>!!x&&typeof x==='object'&&!Array.isArray(x));
 const modeledStatus=dataObject&&['version','cpu','excessTraffic','time','installed'].some(k=>Object.hasOwn(data,k));
 // Numeric-only, or the local OpenAPI's numeric + space + (hex revision) form.
 // Emit numeric prefix only; never the revision/suffix. No inferred v-prefix/IPv4.
 const version=def.operation==='get_status'&&dataObject&&typeof data.version==='string'?/^(\d{1,2}\.\d{1,2}(?:\.\d{1,4})?)(?: \([a-f\d]{7,40}\))?$/i.exec(data.version)?.[1]:undefined;
 const stack=[data];let safeProjectionFallback=false;
 while(stack.length){const item=stack.pop();if(item&&typeof item==='object'){if(!Array.isArray(item)&&Object.keys(item).length===1&&item.summary==='Response received; fields omitted because no reviewed output view matches.')safeProjectionFallback=true;stack.push(...Object.values(item));}}
 const expectedShape={envelope:hasEnvelope,expectedDataType:def.operation==='get_status'?dataObject&&modeledStatus:def.view?viewShape(def.view,data,def.operation):dataArray&&itemObjects,notTruncated:value?.truncated!==true,...(def.view?{safeProjectionFallback}:{}),...(def.operation==='get_status'?{numericVersionAvailable:version!==undefined}:{})};
 if(def.view)expectedShape.compatibilityShapeValidated=expectedShape.expectedDataType&&!safeProjectionFallback;
 return {expectedShape,version,ok:hasEnvelope&&expectedShape.expectedDataType&&expectedShape.notTruncated};
}
function reviewSelection(selection,selected,operations){
 for(const def of selected){const op=operations[def.operation];if(!Object.hasOwn(campaign,def.operation)||!op||op.tool!==def.name||op.method!=='GET'||op.tier!=='read'||!['low',...(selection.mode==='campaign'?['medium']:[])].includes(op.sensitivity)||op.status!=='implemented'||op.execution!=='enabled-by-profile'||(def.args&&!op.input.safeParse(def.args).success)||(selection.mode==='campaign'&&!def.view))throw new SafeFailure('LOCAL_SCHEMA_MISMATCH');
  const spec=selection.validationProfile==='inventory'&&Object.hasOwn(inventoryRecipes,def.operation)?inventoryRecipes[def.operation]:campaign[def.operation];
  if(spec?.window&&op.parameters.filter(p=>['starttime','endtime'].includes(p.name)).filter(p=>/millisecond/i.test(p.description??'')).length!==2)throw new SafeFailure('BLOCKED_TIME_UNITS');
  if(spec?.anchor==='endtime'&&(op.parameters.filter(p=>p.in==='query'&&p.name==='endtime'&&/millisecond/i.test(p.description??'')).length!==1||!op.parameters.some(p=>p.in==='query'&&p.name==='hours')))throw new SafeFailure('BLOCKED_TIME_UNITS');
 }
}
function productionEnvironment(selection){
 const profile=Object.hasOwn(validationProfiles,selection.validationProfile)?validationProfiles[selection.validationProfile]:undefined;if(!profile)throw new SafeFailure('INVALID_VALIDATION_PROFILE');
 return {DARKTRACE_CONFIG_FILE:selection.config,DARKTRACE_PROFILES:'read',DARKTRACE_SENSITIVE_READ:'false',DARKTRACE_WRITE_CRITICAL:'false',DARKTRACE_TIMEOUT_MS:'30000',DARKTRACE_MAX_CONCURRENT_REQUESTS:'1',DARKTRACE_MAX_QUEUED_REQUESTS:'0',DARKTRACE_MAX_PAGES:'1',DARKTRACE_MAX_GET_RETRIES:'0',DARKTRACE_RATE_LIMIT_PER_MINUTE:'8',DARKTRACE_MAX_RESPONSE_BYTES:String(profile.responseBytes),DARKTRACE_MAX_TOOL_OUTPUT_CHARS:String(profile.outputChars),NODE_NO_WARNINGS:'1'};
}
async function main(){
 const selection=parse(process.argv.slice(2));if(!selection){process.stdout.write(HELP);return;}
 activeValidationProfile=selection.validationProfile;
 reviewedManifestSha256=verifyRuntime(selection.manifest);
 // Dynamic imports keep help independent of build/dependencies. No config or token reads here.
 const {operations,validateOperation}=await import(new URL('../dist/src/api/operations.js',import.meta.url));
 const views=JSON.parse(checkedBytes(fileURLToPath(new URL('../dist/src/api/response-views.generated.json',import.meta.url)),8388608)).views;
 // Oracle view is chosen by the reviewed compiled source from the validated query, never from upstream keys.
 const {selectResponseView}=await import(new URL('../dist/src/api/response-view.js',import.meta.url));
 if(selection.validationProfile==='inventory'&&typeof selectResponseView!=='function')throw new SafeFailure('LOCAL_SCHEMA_MISMATCH');
 if(selection.mode==='campaign'&&selection.selected.includes('get_aianalyst_stats')){
  const schema=JSON.parse(checkedBytes(fileURLToPath(new URL('../dist/src/api/catalogue.generated.json',import.meta.url)),8388608)).schemas.AianalystStats;
  for(const path of emptyStatsMaps){let field=schema;for(const key of path.split('.'))field=field?.properties?.[key];if(field?.type!=='object'||(field.required?.length??0)!==0||!/If there are no incidents/.test(field.description??''))throw new SafeFailure('LOCAL_SCHEMA_MISMATCH');}
 }
 const selected=selection.selected.map(id=>selection.mode==='smoke'?{...candidates[id],name:id}:{operation:id,name:operations[id]?.tool,view:views[id]});
 reviewSelection(selection,selected,operations);
 const env=productionEnvironment(selection);
 if(!selection.docker)for(const key of ['DARKTRACE_PUBLIC_TOKEN_FILE','DARKTRACE_PRIVATE_TOKEN_FILE','NODE_EXTRA_CA_CERTS'])if(process.env[key]!==undefined)env[key]=process.env[key];
 const launch=selection.docker?await dockerTransport(selection,env):{command:process.execPath,args:['--no-warnings',fileURLToPath(new URL('../dist/src/index.js',import.meta.url))],cwd:root,env};
 const [{Client},{StdioClientTransport}]=await Promise.all([import('@modelcontextprotocol/client'),import('@modelcontextprotocol/client/stdio')]);
 const transport=new StdioClientTransport({command:launch.command,args:launch.args,cwd:launch.cwd,env:launch.env,stderr:'ignore',maxBufferSize:1048576});
 const client=new Client({name:'manual-bounded-lab-smoke',version:'1.0.0'});
 client.onerror=()=>{};
 let phase='CONFIG_OR_INITIALIZE_FAILED';
 try {
  await deadline(options=>client.connect(transport,options));
  phase='TOOL_SCHEMA_REVIEW_FAILED';
  const listing=await deadline(options=>client.listTools({},options));bounded(listing);
  if(listing.nextCursor!==undefined)throw new SafeFailure('TOOL_LIST_NOT_SINGLE_PAGE');
  for(const {name} of selected){const tool=listing.tools.find(t=>t.name===name);if(!tool||tool.annotations?.readOnlyHint!==true||tool.annotations?.idempotentHint!==true||tool.annotations?.destructiveHint===true)throw new SafeFailure('TOOL_NOT_SAFE_OR_REGISTERED');}
  const handles=Object.create(null),now=Date.now();
  for(const def of selected){const {name}=def,start=performance.now();
   try {
    const args=def.args??argumentsFor(def.operation,handles,now,selection.validationProfile);
    try {validateOperation(operations[def.operation],args);}catch {throw new SafeFailure('BLOCKED_INPUT_SCHEMA');}
    const result=await deadline(options=>client.callTool({name,arguments:args},options));
    if(result.isError===true){const content=result.structuredContent,code=content&&typeof content==='object'&&!Array.isArray(content)&&Object.hasOwn(content,'errorCode')?content.errorCode:undefined;
     emit(envelope(def.operation,name,false,'TOOL_ERROR',{},performance.now()-start,undefined,apiErrorCodes.find(c=>c===code)));process.exitCode=1;break;}
    const view=selection.mode==='campaign'&&typeof selectResponseView==='function'?selectResponseView(def.operation,args.query,def.view):def.view;
    const checked=shape(result,{...def,view},selection.validationProfile);
    emit(envelope(def.operation,name,checked.ok,checked.ok?null:'OUTPUT_SHAPE_MISMATCH',checked.expectedShape,performance.now()-start,checked.version));
    if(!checked.ok){process.exitCode=1;break;}
    if(selection.mode==='campaign')remember(def.operation,result.structuredContent.data,handles,selection.validationProfile);
   }catch(error){emit(envelope(def.operation,name,false,life.signal.aborted?'INTERRUPTED':error instanceof SafeFailure?error.code:'CALL_FAILED',{},performance.now()-start));process.exitCode=1;break;}
  }
 }catch(error){throw new SafeFailure(life.signal.aborted?'INTERRUPTED':error instanceof SafeFailure?error.code:phase);}
 finally {
  let timer;
  try {await Promise.race([client.close(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new SafeFailure('CLEANUP_TIMEOUT')),5000);})]);}
  catch {fatal('CLEANUP_FAILED');}
  finally {clearTimeout(timer);}
  if(launch.name)try{await closeDocker(launch.name);}catch{fatal('DOCKER_CLEANUP_FAILED');}
 }
}
main().catch(error=>fatal(error instanceof SafeFailure?error.code:'HARNESS_FAILED'));
