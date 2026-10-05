// Verifies a private npm archive in an empty installation; never runs package hooks.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,readdirSync,lstatSync,chmodSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolveExternalOutput} from './release-path.mjs';
assert(process.argv[2],'usage: node scripts/verify-release.mjs archive.tgz [external-output-directory]');
const archive=resolve(process.argv[2]);
const out=resolveExternalOutput(fileURLToPath(new URL('../',import.meta.url)),process.argv[3]??join(tmpdir(),'darktrace-release-verification')); mkdirSync(out,{recursive:true});
const work=mkdtempSync(join(tmpdir(),'darktrace-release-verify-'));
const hash=(bytes,alg='sha256',encoding='hex')=>createHash(alg).update(bytes).digest(encoding);
function run(cmd,args,cwd=work,env=process.env){const r=spawnSync(cmd,args,{cwd,env,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});assert.equal(r.status,0,`${cmd} ${args.join(' ')}\n${r.stdout}\n${r.stderr}\n${r.error??''}`);return r.stdout;}
const allowed=n=>['package/package.json','package/npm-shrinkwrap.json','package/README.md','package/LICENSE','package/SECURITY.md'].includes(n)||/^package\/dist\/src\/[A-Za-z0-9_./-]+\.(js|json)$/.test(n);
const names=run('tar',['-tzf',archive]).trim().split('\n');
assert(names.length>5);assert.equal(new Set(names).size,names.length);assert(names.every(n=>allowed(n)&&!n.split('/').includes('..')),'tar allowlist');
const headers=run('tar',['-tvzf',archive]).trim().split('\n');
assert.equal(headers.length,names.length);assert(headers.every(n=>n.startsWith('-')),'reject non-regular tar entries before extraction');
run('tar',['-xzf',archive]);
for(const name of names) assert(lstatSync(join(work,name)).isFile(),'regular file: '+name);
const packed=join(work,'package');
const pkg=JSON.parse(readFileSync(join(packed,'package.json')));
assert.equal(pkg.name,'darktrace-mcp');assert.equal(pkg.private,true);
assert.equal(lstatSync(join(packed,'dist/src/index.js')).mode&0o777,0o755);
assert(!Object.keys(pkg.scripts??{}).some(k=>['preinstall','install','postinstall','prepare','prepublish','prepublishOnly','postpublish'].includes(k)));
assert.deepEqual(pkg.dependencies,{'@modelcontextprotocol/server':'2.3.0',zod:'4.2.0'});
const expected=JSON.parse(readFileSync(join(packed,'npm-shrinkwrap.json'))).packages;
const wanted=Object.entries(expected).filter(([k,v])=>k&&!v.dev);
assert.deepEqual(wanted.map(([k,v])=>[k,v.version]).sort(),[['node_modules/@modelcontextprotocol/core','2.3.0'],['node_modules/@modelcontextprotocol/server','2.3.0'],['node_modules/zod','4.2.0']]);
for(const [path,p] of wanted){const name=path.slice('node_modules/'.length),slug=name.split('/').at(-1);assert.equal(p.resolved,`https://registry.npmjs.org/${name}/-/${slug}-${p.version}.tgz`);assert.match(p.integrity,/^sha512-[A-Za-z0-9+/]+={0,2}$/);}
const install=join(work,'install');mkdirSync(install);
writeFileSync(join(install,'package.json'),JSON.stringify({name:'private-release-verification',version:'1.0.0',private:true}));
run('npm',['install','--ignore-scripts','--omit=dev','--no-audit','--no-fund',archive],install);
const root=join(install,'node_modules/darktrace-mcp');
const actual=JSON.parse(readFileSync(join(install,'package-lock.json'))).packages;
assert.equal(Object.keys(actual).filter(k=>k&&k!=='node_modules/darktrace-mcp').length,3);
function files(dir,prefix=''){const result={};for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(e.name==='node_modules')continue;const p=join(dir,e.name),name=prefix+e.name;assert(!e.isSymbolicLink());if(e.isDirectory())Object.assign(result,files(p,name+'/'));else {assert(e.isFile());result[name]=hash(readFileSync(p));}}return result;}
const rootFiles=files(root);for(const name of names){const relative=name.slice(8);assert.equal(rootFiles[relative],hash(readFileSync(join(packed,relative))));}
const inventories={'darktrace-mcp':rootFiles};
const components=[];
for(const [path,p] of wanted){const key=actual[path]?path:'node_modules/darktrace-mcp/'+path;const a=actual[key];assert(a);for(const field of ['version','integrity','resolved'])assert.equal(a[field],p[field]);const location=join(install,key),manifest=JSON.parse(readFileSync(join(location,'package.json')));assert.equal(manifest.version,p.version);assert.equal(manifest.license,p.license);
 const depDir=join(work,'dependency-'+components.length);mkdirSync(depDir);const [packedDep]=JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',depDir,p.resolved],depDir));const bytes=readFileSync(join(depDir,packedDep.filename));assert.equal('sha512-'+hash(bytes,'sha512','base64'),p.integrity,'dependency SRI');
 inventories[manifest.name]=files(location);
 components.push({type:'library','bom-ref':manifest.name,name:manifest.name,version:manifest.version,purl:`pkg:npm/${manifest.name.replace('@','%40')}@${manifest.version}`,licenses:[{license:{id:manifest.license}}],hashes:[{alg:'SHA-256',content:hash(bytes)},{alg:'SHA-512',content:hash(bytes,'sha512')}],externalReferences:[{type:'distribution',url:p.resolved}],properties:[{name:'npm:integrity',value:p.integrity}]});
}
const entry=join(root,'dist/src/index.js');
const cliEnv={PATH:process.env.PATH};
assert.equal(run(process.execPath,[entry,'--version'],work,cliEnv).trim(),pkg.version);
assert.match(run(process.execPath,[entry,'--help'],work,cliEnv),/Usage:/);
for(const [name,value] of [['public-token','offline-public-canary'],['private-token','offline-private-canary']]){writeFileSync(join(work,name),value,{mode:0o600});chmodSync(join(work,name),0o600);}
const doctorEnv={...cliEnv,DARKTRACE_URL:'https://darktrace.example.internal',DARKTRACE_PUBLIC_TOKEN_FILE:join(work,'public-token'),DARKTRACE_PRIVATE_TOKEN_FILE:join(work,'private-token'),DARKTRACE_PROFILES:'read'};
for(const flag of ['doctor','--check-config']){const result=JSON.parse(run(process.execPath,[entry,flag],work,doctorEnv));assert.equal(result.ok,true);assert.equal(result.networkProbe,false);assert.equal(result.labValidated,false);}
const rootComponent={type:'application','bom-ref':pkg.name,name:pkg.name,version:pkg.version,licenses:[{license:{id:pkg.license}}],hashes:[{alg:'SHA-256',content:hash(readFileSync(archive))}]};
const sbom={bomFormat:'CycloneDX',specVersion:'1.5',version:1,metadata:{component:rootComponent},components,dependencies:[{ref:pkg.name,dependsOn:['@modelcontextprotocol/server','zod']},{ref:'@modelcontextprotocol/server',dependsOn:['@modelcontextprotocol/core','zod']},{ref:'@modelcontextprotocol/core',dependsOn:['zod']},{ref:'zod',dependsOn:[]}]};
writeFileSync(join(out,'runtime-sbom.cdx.json'),JSON.stringify(sbom,null,2)+'\n');
writeFileSync(join(out,'runtime-files.sha256.json'),JSON.stringify(inventories,null,2)+'\n');
const report={node:process.version,npm:run('npm',['--version']).trim(),platform:process.platform,arch:process.arch,archiveSha256:hash(readFileSync(archive)),files:names.length,runtimeDependencies:components.map(c=>({name:c.name,version:c.version,license:c.licenses[0].license.id})),checks:{tarAllowlist:true,regularFiles:true,binMode:'0755',private:true,noLifecycle:true,installedBytes:true,exactThreeDependencies:true,shrinkwrapSRI:true,downloadedDependencySRI:true,help:true,version:true,doctor:true,checkConfig:true},work};
writeFileSync(join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
