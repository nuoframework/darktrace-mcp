// Explicit isolated build; this script does not publish, tag or commit.
import assert from 'node:assert/strict';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {resolveExternalOutput} from './release-path.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolveExternalOutput(root,process.argv[2]??join(tmpdir(),'darktrace-mcp-release'));
mkdirSync(out,{recursive:true});
assert.equal(readdirSync(out).length,0,'use a new empty external artifact directory');
const snapshot=mkdtempSync(join(tmpdir(),'darktrace-release-source-'));
for(const name of ['src','scripts','openapi','docs','test','examples'])cpSync(join(root,name),join(snapshot,name),{recursive:true,filter:p=>!p.includes('/test/security/evidence')});
for(const name of ['package.json','package-lock.json','npm-shrinkwrap.json','tsconfig.json','tsconfig.generate.json','README.md','LICENSE','SECURITY.md','CHANGELOG.md'])cpSync(join(root,name),join(snapshot,name));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function hashes(dir,prefix=''){const result={};for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=join(dir,e.name),n=prefix+e.name;if(e.isDirectory())Object.assign(result,hashes(p,n+'/'));else if(e.isFile())result[n]=digest(readFileSync(p));else throw Error('unexpected symlink '+n);}return result;}
const sourceHashes={};for(const name of ['src','scripts','openapi','test','examples'])Object.assign(sourceHashes,hashes(join(snapshot,name),name+'/'));
for(const name of ['package.json','package-lock.json','npm-shrinkwrap.json','tsconfig.json','tsconfig.generate.json','README.md','LICENSE','SECURITY.md','CHANGELOG.md'])sourceHashes[name]=digest(readFileSync(join(snapshot,name)));
writeFileSync(join(out,'source-files.sha256.json'),JSON.stringify(sourceHashes,null,2)+'\n');
const commands=[];
function run(cmd,args,label,cwd=snapshot){console.log('Running '+label);const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:180000,maxBuffer:32*1024*1024});commands.push({cmd,args,status:r.status});writeFileSync(join(out,label+'.log'),(r.stdout??'')+(r.stderr??''));assert.equal(r.status,0,`${label} failed: see ${out}/${label}.log ${r.error??''}`);return r.stdout;}
run(process.execPath,['scripts/test-release-path.mjs'],'output-path-guard');
run('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],'install');
run('npm',['run','typecheck'],'typecheck');run('npm',['test'],'test');run('npm',['run','test:security'],'security');
const receipts=readdirSync(join(snapshot,'test/security/evidence')).filter(n=>n.endsWith('.json')).sort();
assert.equal(receipts.length,1,'one isolated security receipt');
cpSync(join(snapshot,'test/security/evidence',receipts[0]),join(out,'security-receipt.json'));
// npm test builds once; a second explicit build must produce identical packed bytes.
const first=JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',out],'pack-first'))[0];
const firstHash=digest(readFileSync(join(out,first.filename))),runtimeHashes=hashes(join(snapshot,'dist/src'));
run('npm',['run','build'],'build-second');
const second=JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',out],'pack-second'))[0];
assert.equal(digest(readFileSync(join(out,second.filename))),firstHash,'two builds archive differs');assert.deepEqual(hashes(join(snapshot,'dist/src')),runtimeHashes);
run(process.execPath,['scripts/verify-release.mjs',join(out,second.filename),out],'verify');
run(process.execPath,['scripts/validate-examples.mjs'],'examples');
cpSync(join(snapshot,'CHANGELOG.md'),join(out,'release-notes.md'));
writeFileSync(join(out,'build-evidence.json'),JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,snapshot,sourceTreeSha256:digest(JSON.stringify(sourceHashes)),archive:second.filename,archiveSha256:firstHash,reproducibleTwoBuilds:true,commands},null,2)+'\n');
const assets=[second.filename,'runtime-sbom.cdx.json','runtime-files.sha256.json','source-files.sha256.json','build-evidence.json','verification.json','security-receipt.json','release-notes.md'];
writeFileSync(join(out,'SHA256SUMS'),assets.map(n=>`${digest(readFileSync(join(out,n)))}  ${n}`).join('\n')+'\n');
console.log(JSON.stringify({out,snapshot,archive:second.filename,sha256:firstHash,reproducibleTwoBuilds:true}));
