// Offline syntax and launch-policy checks. Never runs documented commands.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isAbsolute,resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const imagePattern=/^(?:sha256:[a-f0-9]{64}|[A-Za-z0-9._/:=-]+@sha256:[a-f0-9]{64})$/;
export function validateServer(server,label){
 assert(isAbsolute(server.command),label+': use an absolute executable, not a registry launcher');
 assert(Array.isArray(server.args),label+': args array');
 if(server.command.endsWith('/docker')){
  const args=server.args;assert.equal(args[0],'run');
  for(const flag of ['--rm','-i','--init','--pull=never','--log-driver=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--pids-limit=64','--memory=256m'])assert(args.includes(flag),label+': missing '+flag);
  assert(!args.some(v=>v==='-t'||v==='--tty'||v==='--privileged'||v==='-p'||v.startsWith('--publish')||v==='--network=host'||v==='--net=host'||v==='--env-file'),label+': unsafe Docker launch');
  assert(imagePattern.test(args.at(-1))||args.at(-1)==='REPLACE_WITH_IMAGE_ID_FROM_DOCKER_INSPECT',label+': immutable reviewed image ID/digest or explicit non-executable template, never a mutable tag');
  const user=args[args.indexOf('--user')+1];assert(args.includes('--user')&&/^[1-9]\d*:[1-9]\d*$/.test(user),label+': nonzero UID:GID');
  const mounts=args.flatMap((v,i)=>v==='--mount'?[args[i+1]]:[]);
  for(const token of ['public-token','private-token'])assert(mounts.some(v=>typeof v==='string'&&/type=bind(?:,|$)/.test(v)&&/(?:^|,)(?:src|source)=\//.test(v)&&v.includes('=/run/secrets/'+token)&&/(?:^|,)readonly(?:=true)?(?:,|$)/.test(v)),label+': read-only token-file bind');
  assert(!mounts.some(v=>v.includes('docker.sock')),label+': no daemon socket mount');
  const env=args.flatMap((v,i)=>v==='-e'||v==='--env'?[args[i+1]]:[]);
  assert(env.includes('DARKTRACE_PROFILES=read')&&env.filter(value=>value.startsWith('DARKTRACE_SENSITIVE_READ=')).every(value=>value==='DARKTRACE_SENSITIVE_READ=false'),label+': read-only example');
  const envNames=env.map(value=>value.split('=',1)[0]);assert.equal(new Set(envNames).size,envNames.length,label+': no duplicate environment overrides');
  assert(env.filter(value=>value.startsWith('DARKTRACE_PROFILES=')).every(value=>value==='DARKTRACE_PROFILES=read'),label+': no write profile override');
  assert(env.filter(value=>value.startsWith('DARKTRACE_WRITE_CRITICAL=')).every(value=>value==='DARKTRACE_WRITE_CRITICAL=false'),label+': no write-critical grant in consultation examples');
  assert(!env.some(value=>/^DARKTRACE_ACKNOWLEDGE_(?:SENSITIVE_WRITE|HOST_APPROVAL)=/.test(value)),label+': consultation examples never pre-set a risk acknowledgement');
  for(const value of env)assert(!/^DARKTRACE_(?:PUBLIC|PRIVATE)_TOKEN=/.test(value)&&!/^NODE_TLS_REJECT_UNAUTHORIZED=/.test(value),label+': no token values/TLS bypass');
 }else{
  assert(server.command.endsWith('/node'),label+': fixed Node executable');
  assert(isAbsolute(server.args[0])&&server.args[0].endsWith('/dist/src/index.js'),label+': absolute compiled production entrypoint');
  assert.equal(server.args.length,1,label+': production stdio, no diagnostic or arbitrary arguments');
  assert.equal(server.env?.DARKTRACE_PROFILES,'read');assert(server.env?.DARKTRACE_SENSITIVE_READ===undefined||server.env.DARKTRACE_SENSITIVE_READ==='false',label+': no sensitive-read grant in consultation examples');
  assert(server.env?.DARKTRACE_WRITE_CRITICAL===undefined||server.env.DARKTRACE_WRITE_CRITICAL==='false',label+': no write-critical grant in consultation examples');
  assert(!Object.keys(server.env).some(key=>/^DARKTRACE_ACKNOWLEDGE_/.test(key)),label+': consultation examples never pre-set a risk acknowledgement');
  for(const key of ['DARKTRACE_PUBLIC_TOKEN_FILE','DARKTRACE_PRIVATE_TOKEN_FILE'])assert(isAbsolute(server.env?.[key]??''),label+': token-file path');
  assert(!Object.hasOwn(server.env,'DARKTRACE_PUBLIC_TOKEN')&&!Object.hasOwn(server.env,'DARKTRACE_PRIVATE_TOKEN'));
 }
}
function validateConfig(value,label){
 // OpenCode: {"mcp":{"darktrace":{"type":"local","command":[exe,...args],"environment":{...}}}}
 const local=value.mcp?.darktrace;
 if(local){assert.equal(local.type,'local',label+': OpenCode local server');assert(Array.isArray(local.command),label+': OpenCode command array');
  validateServer({command:local.command[0],args:local.command.slice(1),env:local.environment??{}},label);return;}
 const server=value.mcpServers?.darktrace??value.servers?.darktrace??value.mcp_servers?.darktrace??(value.command?value:undefined);
 if(server)validateServer(server,label);
}
export function lintMarkdown(text,label){
 // Negative prose is not executable advice; inspect shell fences and JSON launchers.
 for(const match of text.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)){
  const language=match[1].trim(),body=match[2],prefix=text.slice(0,match.index).trim().split(/\n\s*\n/).at(-1)??'';
  const warning=/^(?:Do not|Never|Avoid|No uses|Nunca|Evita)\b/i.test(prefix);
  if(language==='json')validateConfig(JSON.parse(body),label+': JSON fence');
  if(['sh','shell','bash','zsh','console'].includes(language)&&!warning){
   const commands=body.split('\n').filter(line=>!line.trim().startsWith('#')).join('\n').replace(/\\\n\s*/g,' ');
   // Published package policy: only the scoped name, always pinned to an exact version (never latest or a range).
   for(const [,name,spec] of commands.matchAll(/\b(?:npx\s+(?:-[^\s]+\s+)*|npm\s+(?:exec|install|i|add)\s+(?:-[^\s]+\s+)*)((?:@nuoframework\/)?darktrace-mcp)(@[^\s]+)?(?=\s|$)/g)){
    assert.equal(name,'@nuoframework/darktrace-mcp',label+': only the scoped published package name (unscoped darktrace-mcp is not ours)');
    assert.match(spec??'',/^@\d+\.\d+\.\d+$/,label+': pin an exact published version, never latest or a range');
   }
   for(const line of commands.split('\n'))if(/\bclaude\s+mcp\s+add\b/.test(line))assert(/--scope(?:=|\s+)user\b/.test(line),label+': explicit user scope for protected MCP setup');
  }
 }
 if(/(?<![\w-])\.mcp\.json\b/.test(text))assert(/\b(?:project|proyecto|repository|repositorio)\b/i.test(text)&&/(?:trust|review|malicious|confian|revis|malici)/i.test(text),label+': document project-config trust/review boundary');
}
function main(){
 const examples=readdirSync(new URL('../examples/',import.meta.url));let jsonCount=0,tomlCount=0;
 for(const name of examples){
  const file=new URL('../examples/'+name,import.meta.url);
  if(name.endsWith('.json')){validateConfig(JSON.parse(readFileSync(file)),name);jsonCount++;}
  if(name.endsWith('.toml')){
   const r=spawnSync('python3',['-c','import json,tomllib,sys; print(json.dumps(tomllib.load(open(sys.argv[1],"rb"))))',fileURLToPath(file)],{cwd:root,encoding:'utf8',timeout:10000});
   assert.equal(r.status,0,r.stderr||r.error?.message);validateConfig(JSON.parse(r.stdout),name);tomlCount++;
  }
 }
 const docs=['README.md','README.es.md','docs/clients.md','docs/configuration.md','docs/docker.md','docs/getting-started.md','docs/es/getting-started.md','docs/releases.md'];
 for(const name of docs)lintMarkdown(readFileSync(new URL('../'+name,import.meta.url),'utf8'),name);
 console.log(JSON.stringify({jsonExamples:jsonCount,tomlExamples:tomlCount,documents:docs.length,syntax:true,launchPolicy:true,commandsExecuted:false,networkProbe:false}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
