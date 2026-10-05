// No install, external networking, or edits to shared source/build artifacts.
import { cpSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const snapshot=mkdtempSync(join(tmpdir(),'darktrace-adversarial-'));
for(const name of ['src','test','scripts','openapi','docs']) cpSync(join(root,name),join(snapshot,name),{recursive:true,filter:p=>!p.includes('/test/security/evidence')});
for(const name of ['package.json','tsconfig.json','tsconfig.generate.json','README.md']) cpSync(join(root,name),join(snapshot,name));
symlinkSync(join(root,'node_modules'),join(snapshot,'node_modules'),'dir');
function hashes(dir,prefix='') {
  const out={};for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const relative=prefix+e.name;
    if(e.isDirectory()) Object.assign(out,hashes(join(dir,e.name),relative+'/'));
    else if(e.isFile()) out[relative]=createHash('sha256').update(readFileSync(join(dir,e.name))).digest('hex');
  }return out;
}
const sourceHashes=hashes(join(snapshot,'src'));
const childEnv={PATH:process.env.PATH,NODE_EXTRA_CA_CERTS:join(snapshot,'test/security/fixtures/ca.pem')};
const build=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:snapshot,env:childEnv,encoding:'utf8',timeout:120000});
const suites=readdirSync(join(snapshot,'test/security')).filter(n=>n.endsWith('.test.mjs')).sort();
const command=[process.execPath,'--import','./test/security/assertion-counter.mjs','--test','--test-reporter=spec','--test-concurrency=1',...suites.map(n=>'test/security/'+n)];
const run=build.status===0?spawnSync(command[0],command.slice(1),{cwd:snapshot,env:childEnv,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024}):null;
const evidence=join(root,'test/security/evidence');mkdirSync(evidence,{recursive:true});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const report={date:new Date().toISOString(),snapshot,node:process.version,platform:process.platform,arch:process.arch,
  commit:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(),
  commands:{build:[process.execPath,'scripts/build.mjs'],test:command},sourceHashes,
  runtimeHashes:build.status===0?hashes(join(snapshot,'dist/src')):{},builtSourceHashes:hashes(join(snapshot,'src')),
  fixtureHashes:hashes(join(snapshot,'test/security/fixtures')),
  sourceTreeSha256:createHash('sha256').update(JSON.stringify(sourceHashes)).digest('hex'),
  build:{status:build.status,error:build.error?.message,stdout:build.stdout,stderr:build.stderr},
  assertionInvocations:run?Array.from((run.stdout+run.stderr).matchAll(/ADVERSARIAL_ASSERTIONS (\{[^\n]+\})/g)).reduce((total,m)=>total+JSON.parse(m[1]).invocations,0):0,
  subcases:run?run.stdout.split('\n✖ failing tests:')[0].split('\n').flatMap(line=>{
    const m=/^([✔✖﹣]) (.+?) \(([\d.]+)ms\)(.*)$/.exec(line);if(!m)return [];
    return [{name:m[2],status:m[1]==='✔'?'PASSED':m[1]==='﹣'?'BLOCKED':m[2].includes('TLS real')&&run.stdout.includes('listen EPERM')?'BLOCKED':'FAIL',durationMs:Number(m[3]),note:m[4].trim()}];
  }):[],
  tests:run?{status:run.status,error:run.error?.message,stdout:run.stdout,stderr:run.stderr}:null};
// A successful harness must account for every case, including skips. Node 22
// otherwise defaults to TAP when captured, which the spec subcase parser cannot read.
const summary=run ? /(?:ℹ|#) tests (\d+)/.exec(run.stdout) : null;
report.receiptComplete=!!summary&&report.subcases.length===Number(summary[1]);
const target=join(evidence,stamp+'.json');writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({snapshot,evidence:target,sourceTreeSha256:report.sourceTreeSha256,buildStatus:build.status,testStatus:run?.status}));
if(build.status!==0) console.log(build.stdout,build.stderr);
else console.log(run.stdout,run.stderr);
process.exitCode=build.status!==0?build.status??1:run?.status!==0?run?.status??1:report.receiptComplete?0:1;
if(run?.status===0&&!report.receiptComplete)console.error('Incomplete security receipt: subcase count does not match reported test total.');
