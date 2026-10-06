// Verifies the npm archive in an empty installation; never runs package hooks.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,readdirSync,lstatSync,chmodSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolveExternalOutput} from './release-path.mjs';
const checkout=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
// Full-API oracle: complete tools/list contracts for every supported operator profile combination.
const fixturePath='test/security/fixtures/mcp-tool-contracts-full-api.json';
const fixtureSha256='c95104ced1955b7a1bdc72a6e19bc79c3d1a3e0ee39114e7eabf7fa71545fd3b'; // Generated for the full-API release; requires independent review before shared application.
// Historical oracles stay byte-pinned provenance; they no longer describe the shipped surface.
const firstStableFixturePath='test/security/fixtures/mcp-tool-contracts-first-stable.json';
const firstStableFixtureSha256='6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c';
const alphaFixturePath='test/security/fixtures/mcp-tool-contracts.json';
const alphaFixtureSha256='37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72';
const capabilityPath='src/policy/release-capability.ts';
const capabilityValue=Object.freeze({read:true,sensitiveRead:true,write:true,writeCritical:true});
const fixtureCapability=Object.freeze({...capabilityValue,grantedBy:'operator profiles only; model arguments cannot grant or escalate'});
const profileHashes=Object.freeze({read:'afeb056eb4e1830462256436948ceaa706601d14ade6ebc7f36ab00cda011964',"read+sensitive":'ca4ebd6b4d640aae3571ad3d68e18bd489ae39f02b980188a554dfb989462d6a',"read+write":'9d55533f6fff2982f3aa0414687a259c1d042cc7aa267a0106126a4ea7d4e39b',"read+write+critical":'f22cee1aefb944c8be6b683f251951a965d9d94dd0b9ff872a5c06cc69bd062b',all:'b377eac60a2eed8233d8481b0b69074e79eac6a537b8e1b4ec1e47a5b2abf859'});
// Independent oracle from the owner request: tools/operations per profile and the six critical operations.
const profileShape=Object.freeze({read:[27,38],'read+sensitive':[36,56],'read+write':[36,54],'read+write+critical':[42,60],all:[51,78]});
const criticalOperations=Object.freeze(['delete_tags_tid','post_agemail_api_ep_api_v1_0_emails_uuid_action','post_antigena','post_antigena_manual','post_intelfeed','post_subnets']);
function selectors(schema){const values=[];const walk=node=>{if(!node||typeof node!=='object')return;const op=node.properties?.operation;if(op?.const)values.push(op.const);if(op?.enum)values.push(...op.enum);for(const key of ['anyOf','oneOf','allOf'])for(const child of node[key]??[])walk(child);};walk(schema);return values;}
function assertProfileTools(name,tools){
 const [toolCount,operationCount]=profileShape[name];assert.equal(tools.length,toolCount,'tool count '+name);
 const all=[];
 for(const tool of tools){const ids=selectors(tool.inputSchema).sort();all.push(...ids);
  assert.deepEqual([...new Set(tool.description.match(/\b(?:get|post|delete)_[a-zA-Z0-9_]+\b/g)??[])].sort(),ids,'description lists exactly its operations: '+tool.name);
  assert(tool.description.length<=600,'concise description: '+tool.name);
  const critical=ids.some(id=>criticalOperations.includes(id)),reads=ids.every(id=>id.startsWith('get_')||id==='post_advancedsearch_api_search'||id==='post_agemail_api_ep_api_v1_0_emails_search');
  assert.equal(Boolean(tool.inputSchema.properties?.confirm),critical,'confirm only on critical: '+tool.name);
  if(critical) assert.match(tool.description,/confirm:true/);
  assert.equal(tool.annotations.readOnlyHint,reads,'readOnlyHint: '+tool.name);assert.equal(tool.annotations.openWorldHint,false);
  assert.equal(tool.annotations.idempotentHint,ids.every(id=>id.startsWith('get_')),'idempotentHint: '+tool.name);
 }
 assert.equal(all.length,operationCount,'operation count '+name);assert.equal(new Set(all).size,operationCount);assert(!all.includes('get_aianalyst_incidents'));
 assert.equal(all.some(id=>criticalOperations.includes(id)),['read+write+critical','all'].includes(name),'critical scope '+name);
}
const forbiddenProfiles=Object.freeze({
 'critical-without-write':{profiles:{writeCritical:true},errorClass:'ConfigValidationError',beforeSdk:true,beforeNetwork:true},
 'sensitive+critical-without-write':{profiles:{sensitiveRead:true,writeCritical:true},errorClass:'ConfigValidationError',beforeSdk:true,beforeNetwork:true},
});
export function assertReviewedReleaseContractReady(){assert(typeof fixtureSha256==='string'&&/^[a-f0-9]{64}$/.test(fixtureSha256)&&Object.values(profileHashes).every(value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)),'full-API MR-04 fixture approval/pin pending; no release pipeline authorized');}
function regularBytes(path){assert(lstatSync(path).isFile()&&!lstatSync(path).isSymbolicLink(),'reviewed input must be a regular file');return readFileSync(path);}
export function verifyFullApiContractContent(fixture){
 assertReviewedReleaseContractReady();
 assert.deepEqual(Object.keys(fixture).sort(),['alphaFixtureSha256','canonicalization','contracts','rejectedProfiles','releaseCapability']);
 assert.equal(fixture.canonicalization,'Recursive sorted object keys; preserve array order; SHA-256 UTF-8 JSON');
 assert.deepEqual(Object.keys(fixture.contracts).sort(),Object.keys(profileHashes).sort());
 assert.deepEqual(fixture.releaseCapability,fixtureCapability);assert.equal(fixture.alphaFixtureSha256,alphaFixtureSha256);assert.deepEqual(fixture.rejectedProfiles,forbiddenProfiles);
 for(const [name,digest] of Object.entries(profileHashes)){assert.deepEqual(Object.keys(fixture.contracts[name]).sort(),['sha256','tools']);assertProfileTools(name,fixture.contracts[name].tools);assert.equal(sha(canonical(fixture.contracts[name].tools)),digest,'reviewed profile '+name);assert.equal(fixture.contracts[name].sha256,digest);}
}
function reviewedFixture(base){
 assertReviewedReleaseContractReady();
 assert.equal(sha(regularBytes(join(base,alphaFixturePath))),alphaFixtureSha256,'historical alpha fixture changed');
 assert.equal(sha(regularBytes(join(base,firstStableFixturePath))),firstStableFixtureSha256,'historical first-stable fixture changed');
 const bytes=regularBytes(join(base,fixturePath));assert.equal(sha(bytes),fixtureSha256,'reviewed full-API MR-04 fixture changed; independent review required');
 const fixture=JSON.parse(bytes);verifyFullApiContractContent(fixture);
 return {bytes,fixture};
}
function expectedStartupChecks(){return Object.fromEntries(Object.keys(forbiddenProfiles).map(name=>[name,{objectRejected:true,contractRejectedBeforeSdk:true,productionModes:['stdio','doctor','--check-config'],exitStatus:1,stdoutEmpty:true,networkSigningGuardTriggered:false}]));}
function contractMetadata(fixture){return {asset:'mcp-tool-contracts.json',assetSha256:fixtureSha256,reviewedFixture:fixturePath,fixtureSha256,historicalAlphaFixture:{path:alphaFixturePath,sha256:alphaFixtureSha256},historicalFirstStableFixture:{path:firstStableFixturePath,sha256:firstStableFixtureSha256},releaseCapability:fixture.releaseCapability,rejectedProfiles:fixture.rejectedProfiles,startupChecks:expectedStartupChecks(),canonicalization:fixture.canonicalization,profiles:Object.fromEntries(Object.entries(fixture.contracts).map(([name,value])=>[name,{sha256:value.sha256,tools:value.tools.length}]))};}
export function verifyHistoricalArchive(base){
 const prefix='test/historical/alpha-read-write/',manifestPath=prefix+'provenance.json';
 const manifestSha256='2d9bffe6f1c462b04d5bef68607fe335d699e0fcdc37673f8e10dbe299538d60';
 const bytes=regularBytes(join(base,manifestPath));assert.equal(sha(bytes),manifestSha256,'historical alpha test manifest changed');const manifest=JSON.parse(bytes);
 assert.equal(manifest.sourceTreeSha256,'4f6ef96c82b8c3bff7628fbad18aea6eb694819a2e001dc0e30086d1daefd834');assert.equal(manifest.fixtureSha256,alphaFixtureSha256);
 const files={};assert.equal(Object.keys(manifest.originalPathsSha256).length,10);
 for(const [original,digest]of Object.entries(manifest.originalPathsSha256)){assert(/^test\/(?:unit|contract|mcp|security)\/[A-Za-z0-9.-]+\.(?:ts|mjs)$/.test(original));assert.match(digest,/^[a-f0-9]{64}$/);const path=prefix+original+'.txt';assert.equal(sha(regularBytes(join(base,path))),digest,'historical test bytes changed: '+original);files[path]=digest;}
 const supplementPath='test/historical/alpha-stdio/provenance.json',supplementSha256='33cbdcac2bb47ddc59585836180374a4e63de68945530042c6005d2e02d511a8';
 const supplementalBytes=regularBytes(join(base,supplementPath));assert.equal(sha(supplementalBytes),supplementSha256,'historical stdio supplemental manifest changed');const supplemental=JSON.parse(supplementalBytes);
 assert.equal(supplemental.sourceTreeSha256,manifest.sourceTreeSha256);assert.equal(supplemental.originalPath,'test/mcp/stdio.test.ts');assert.equal(supplemental.originalSha256,'e14fb7a0247bbb991cbc43c363f147881f08584425bf9175f522d8e2d32b1d5c');
 const supplementalFile='test/historical/alpha-stdio/stdio.test.ts.txt';assert.equal(sha(regularBytes(join(base,supplementalFile))),supplemental.originalSha256,'historical stdio supplemental bytes changed');
 return {manifestPath,manifestSha256,sourceTreeSha256:manifest.sourceTreeSha256,files,supplement:{manifestPath:supplementPath,manifestSha256:supplementSha256,sourceTreeSha256:supplemental.sourceTreeSha256,originalPath:supplemental.originalPath,filePath:supplementalFile,fileSha256:supplemental.originalSha256}};
}
function historicalBytes(path){assert.equal(lstatSync(path).mode&0o7777,0o644,'historical predecessor must be nonexecuting 0644');return regularBytes(path);}
export function verifyValidatedPredecessorArchives(base){
 const manifestPath='test/historical/validated-contract-predecessor/provenance.json';
 const manifestSha256='7390a234bc73fa52f8922196771e9c5e38ef155f976f0da60a8a331d8358f878';
 const bytes=historicalBytes(join(base,manifestPath));assert.equal(sha(bytes),manifestSha256,'validated contract predecessor provenance changed');
 const manifest=JSON.parse(bytes),fixturePath='test/historical/validated-contract-predecessor/mcp-tool-contracts-first-stable.json.txt';
 assert.equal(manifest.historicalOnly,true);assert.equal(manifest.sourceTreeSha256,'aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e');
 assert.equal(manifest.originalPath,'test/security/fixtures/mcp-tool-contracts-first-stable.json');assert.equal(manifest.archivedPath,fixturePath);
 const fixtureSha256='ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f';assert.equal(manifest.fixtureSha256,fixtureSha256);
 const fixtureBytes=historicalBytes(join(base,fixturePath));assert.equal(sha(fixtureBytes),fixtureSha256,'validated contract predecessor bytes changed');
 const fixture=JSON.parse(fixtureBytes);assert.equal(fixture.alphaFixtureSha256,alphaFixtureSha256);assert.equal(manifest.alphaFixtureSha256,alphaFixtureSha256);
 for(const [name,digest] of Object.entries(manifest.profileHashes)){assert.equal(fixture.contracts[name].sha256,digest);assert.equal(sha(canonical(fixture.contracts[name].tools)),digest);}
 const scopeManifestPath='test/historical/validated-scope-predecessor/provenance.json',scopeManifestSha256='35d826f3b7f31547ae2080861359050693985dcb47e087e3c4d8581b44c4e675';
 const scopeBytes=historicalBytes(join(base,scopeManifestPath));assert.equal(sha(scopeBytes),scopeManifestSha256,'validated scope predecessor provenance changed');
 const scope=JSON.parse(scopeBytes);assert.equal(scope.schemaVersion,1);assert.equal(scope.historicalOnly,true);assert.equal(scope.files.length,4);
 const scopeFiles={};for(const row of scope.files){
  assert(/^test\/(?:contract|security)\/[A-Za-z0-9.-]+\.(?:ts|mjs)$/.test(row.originalPath));
  assert.equal(row.archivePath,'test/historical/validated-scope-predecessor/'+basename(row.originalPath)+'.txt');assert(!Object.hasOwn(scopeFiles,row.archivePath),'duplicate predecessor archive path');
  assert.match(row.originalSha256,/^[a-f0-9]{64}$/);assert.equal(row.archiveSha256,row.originalSha256);
  const bytes=historicalBytes(join(base,row.archivePath));assert.equal(bytes.length,row.byteLength);assert.equal(sha(bytes),row.originalSha256,'validated scope predecessor bytes changed: '+row.originalPath);scopeFiles[row.archivePath]=row.originalSha256;
 }
 return {contract:{manifestPath,manifestSha256,sourceTreeSha256:manifest.sourceTreeSha256,files:{[fixturePath]:fixtureSha256}},scope:{manifestPath:scopeManifestPath,manifestSha256:scopeManifestSha256,files:scopeFiles}};
}
export async function captureReviewedContracts(base){
 const {bytes,fixture}=reviewedFixture(base),helper=await import(pathToFileURL(join(base,'test/security/mcp-contracts.mjs')));
 const capability=await import(pathToFileURL(join(base,'dist/src/policy/release-capability.js')));assert.deepEqual(capability.RELEASE_CAPABILITY,capabilityValue);assert(Object.isFrozen(capability.RELEASE_CAPABILITY));
 const {productionOperationDescriptors}=await import(pathToFileURL(join(base,'dist/src/server/stdio.js')));assert(Object.isFrozen(productionOperationDescriptors));assert.equal(productionOperationDescriptors.length,78);
 assert(productionOperationDescriptors.every(o=>Object.isFrozen(o)&&['GET','POST','DELETE'].includes(o.method)));assert(!productionOperationDescriptors.some(o=>o.operationId==='get_aianalyst_incidents'));
 for(const id of criticalOperations)assert(productionOperationDescriptors.some(o=>o.operationId===id),'critical route registered: '+id);
 assert.deepEqual(Object.keys(helper.releaseProfiles).sort(),Object.keys(profileHashes).sort());assert.deepEqual(helper.forbiddenReleaseProfiles,forbiddenProfiles);
 const contracts={};for(const [name,profile] of Object.entries(helper.releaseProfiles)){const tools=await helper.toolContract(profile);contracts[name]={sha256:helper.digest(tools),tools};}
 assert.equal(canonical(contracts),canonical(fixture.contracts),'generated complete tools/list contract differs from reviewed full-API MR-04 oracle');
 const rejected=await helper.verifyRejectedReleaseProfiles();assert.deepEqual(rejected.rejectedProfiles,fixture.rejectedProfiles);assert.deepEqual(rejected.startupChecks,expectedStartupChecks());
 verifyHistoricalArchive(base);verifyValidatedPredecessorArchives(base);
 return {bytes,metadata:contractMetadata(fixture)};
}
function verifyContractAsset(out,base){
 const {fixture}=reviewedFixture(base),path=join(out,'mcp-tool-contracts.json');const bytes=regularBytes(path);assert.equal(sha(bytes),fixtureSha256,'MR-04 contract artifact bytes changed');
 assert.equal(canonical(JSON.parse(bytes)),canonical(fixture),'MR-04 artifact must contain the complete reviewed full-API contract and rejection policy');
 return contractMetadata(fixture);
}
export function releaseAssets(archiveName){return [archiveName,'runtime-sbom.cdx.json','runtime-files.sha256.json','source-files.sha256.json','build-evidence.json','verification.json','security-receipt.json','release-notes.md','mcp-tool-contracts.json'];}
export function verifyReleaseEvidence(archive,out,base=checkout){
 assertReviewedReleaseContractReady();
 const archiveName=basename(archive),expected=releaseAssets(archiveName),checksumPath=join(out,'SHA256SUMS');assert(lstatSync(checksumPath).isFile());
 const lines=readFileSync(checksumPath,'utf8').trim().split('\n'),seen=new Set();assert.equal(lines.length,expected.length,'complete release checksum inventory');
 for(const line of lines){const match=/^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/.exec(line);assert(match,'checksum format');const [,digest,name]=match;assert(expected.includes(name)&&!seen.has(name),'unexpected or duplicate checksum asset');seen.add(name);assert(lstatSync(join(out,name)).isFile(),'regular checksum asset');assert.equal(sha(readFileSync(join(out,name))),digest,'checksum mismatch: '+name);}
 const read=name=>JSON.parse(readFileSync(join(out,name))),build=read('build-evidence.json'),source=read('source-files.sha256.json'),verification=read('verification.json');
 assert.equal(build.schemaVersion,3);assert.equal(build.archive,archiveName);assert.equal(build.archiveSha256,sha(readFileSync(archive)));assert.equal(verification.archiveSha256,build.archiveSha256);assert.equal(build.reproducibleTwoBuilds,true);
 assert.equal(build.sourceTreeSha256,sha(JSON.stringify(source)),'source evidence binding');
 for(const name of ['docs/operation-inventory.json','openapi/darktrace-threat-visualizer.yaml','openapi/darktrace-sdk.yaml','scripts/build.mjs','scripts/generate-catalogue.ts','package.json','package-lock.json','npm-shrinkwrap.json','tsconfig.json','tsconfig.generate.json','README.md','README.es.md','Dockerfile','.dockerignore'])assert.match(source[name]??'',/^[a-f0-9]{64}$/,'missing source input: '+name);
 assert.equal(source[fixturePath],fixtureSha256);assert.equal(source[alphaFixturePath],alphaFixtureSha256);assert.equal(source[firstStableFixturePath],firstStableFixtureSha256);
 const historical=verifyHistoricalArchive(base);assert.deepEqual(build.historicalAlphaTests,historical);assert.equal(source[historical.manifestPath],historical.manifestSha256);for(const [name,digest]of Object.entries(historical.files))assert.equal(source[name],digest);assert.equal(source[historical.supplement.manifestPath],historical.supplement.manifestSha256);assert.equal(source[historical.supplement.filePath],historical.supplement.fileSha256);
 const predecessor=verifyValidatedPredecessorArchives(base);assert.deepEqual(build.historicalValidatedPredecessors,predecessor);
 for(const archive of Object.values(predecessor)){assert.equal(source[archive.manifestPath],archive.manifestSha256);for(const [name,digest] of Object.entries(archive.files))assert.equal(source[name],digest,'source-bound validated predecessor: '+name);}
 assert.deepEqual(build.releaseCapability.value,capabilityValue);assert.equal(build.releaseCapability.sourcePath,capabilityPath);assert.equal(build.releaseCapability.sourceSha256,source[capabilityPath]);assert.equal(source[capabilityPath],sha(regularBytes(join(base,capabilityPath))));assert.deepEqual(verification.releaseCapability,build.releaseCapability);
 for(const name of ['scripts/prepare-release.mjs','scripts/verify-release.mjs','scripts/validate-examples.mjs','test/security/mcp-contracts.mjs','test/security/diagnostic-guard.mjs','src/tools/index.ts','src/tools/descriptions.ts','src/policy/guard.ts','src/policy/profiles.ts','src/config/load.ts','src/config/schema.ts','src/server/stdio.ts'])assert.equal(source[name],sha(regularBytes(join(base,name))),'source-bound release guard: '+name);
 assert.deepEqual(build.mcpToolContracts,verifyContractAsset(out,base));assert.deepEqual(verification.mcpToolContracts,build.mcpToolContracts);
 assert.equal(verification.readmeEsSha256,source['README.es.md']);assert.equal(verification.checks.readmeEsSourceBinding,true);
 assert.equal(build.sourceProductionTreeSha256,sha(JSON.stringify(Object.fromEntries(Object.entries(source).filter(([p])=>p.startsWith('src/')).map(([p,h])=>[p.slice(4),h])))));
 const receipt=read('security-receipt.json');assert.equal(receipt.receiptComplete,true);assert.equal(receipt.build.status,0);assert.equal(receipt.tests.status,0);assert.equal(receipt.sourceTreeSha256,build.sourceProductionTreeSha256);assert.equal(receipt.fixtureHashes['mcp-tool-contracts-full-api.json'],fixtureSha256);assert.equal(receipt.fixtureHashes['mcp-tool-contracts-first-stable.json'],firstStableFixtureSha256);assert.equal(receipt.fixtureHashes['mcp-tool-contracts.json'],alphaFixtureSha256);
 for(const check of ['tarAllowlist','regularFiles','publicPackageMetadata','noLifecycle','installedBytes','exactThreeDependencies','shrinkwrapSRI','downloadedDependencySRI','help','version','doctor','checkConfig','invalidProfilesRejected'])assert.equal(verification.checks[check],true);
 assert.equal(verification.checks.binMode,'0755');
 return {archive:archiveName,archiveSha256:build.archiveSha256,checksums:expected.length,mcpToolContracts:build.mcpToolContracts,networkProbe:false};
}
async function main(){
assert(process.argv[2],'usage: node scripts/verify-release.mjs archive.tgz [external-output-directory]');
const archive=resolve(process.argv[2]);
assert(process.argv[4]===undefined||process.argv[4]==='--check-evidence','unknown verification mode');
const out=resolveExternalOutput(checkout,process.argv[3]??join(tmpdir(),'darktrace-release-verification'));
assertReviewedReleaseContractReady();
if(process.argv[4]==='--check-evidence'){console.log(JSON.stringify(verifyReleaseEvidence(archive,out)));return;}
mkdirSync(out,{recursive:true});
const releaseCapability={value:capabilityValue,sourcePath:capabilityPath,sourceSha256:sha(regularBytes(join(checkout,capabilityPath)))};
const mcpToolContracts=verifyContractAsset(out,checkout),recomputed=await captureReviewedContracts(checkout);assert.deepEqual(recomputed.metadata,mcpToolContracts);
const work=mkdtempSync(join(tmpdir(),'darktrace-release-verify-'));
const hash=(bytes,alg='sha256',encoding='hex')=>createHash(alg).update(bytes).digest(encoding);
function run(cmd,args,cwd=work,env=process.env){const r=spawnSync(cmd,args,{cwd,env,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});assert.equal(r.status,0,`${cmd} ${args.join(' ')}\n${r.stdout}\n${r.stderr}\n${r.error??''}`);return r.stdout;}
const allowed=n=>['package/package.json','package/npm-shrinkwrap.json','package/README.md','package/README.es.md','package/LICENSE','package/SECURITY.md'].includes(n)||/^package\/dist\/src\/[A-Za-z0-9_./-]+\.(js|json)$/.test(n);
const names=run('tar',['-tzf',archive]).trim().split('\n');
assert(names.length>5);assert.equal(new Set(names).size,names.length);assert(names.every(n=>allowed(n)&&!n.split('/').includes('..')),'tar allowlist');
const headers=run('tar',['-tvzf',archive]).trim().split('\n');
assert.equal(headers.length,names.length);assert(headers.every(n=>n.startsWith('-')),'reject non-regular tar entries before extraction');
run('tar',['-xzf',archive]);
for(const name of names) assert(lstatSync(join(work,name)).isFile(),'regular file: '+name);
const packed=join(work,'package');
const readmeEs=join(packed,'README.es.md'),readmeEsStat=lstatSync(readmeEs);assert(readmeEsStat.isFile()&&readmeEsStat.size>0&&readmeEsStat.size<=1048576);assert.equal(readmeEsStat.mode&0o7777,0o644);assert.equal(hash(readFileSync(readmeEs)),hash(readFileSync(join(checkout,'README.es.md'))),'Spanish README source binding');
const pkg=JSON.parse(readFileSync(join(packed,'package.json')));
assert.equal(pkg.name,'@nuoframework/darktrace-mcp');assert.equal(pkg.private,undefined,'public npm publication: no private flag');assert.deepEqual(pkg.publishConfig,{access:'public',registry:'https://registry.npmjs.org'});assert.equal(pkg.mcpName,'io.github.nuoframework/darktrace-mcp');
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
const root=join(install,'node_modules/'+pkg.name);
const actual=JSON.parse(readFileSync(join(install,'package-lock.json'))).packages;
assert.equal(Object.keys(actual).filter(k=>k&&k!=='node_modules/'+pkg.name).length,3);
function files(dir,prefix=''){const result={};for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(e.name==='node_modules')continue;const p=join(dir,e.name),name=prefix+e.name;assert(!e.isSymbolicLink());if(e.isDirectory())Object.assign(result,files(p,name+'/'));else {assert(e.isFile());result[name]=hash(readFileSync(p));}}return result;}
const rootFiles=files(root);for(const name of names){const relative=name.slice(8);assert.equal(rootFiles[relative],hash(readFileSync(join(packed,relative))));}
assert.deepEqual(files(join(packed,'dist/src')),Object.fromEntries(Object.entries(files(join(checkout,'dist/src'))).filter(([name])=>/\.(js|json)$/.test(name))),'archive JS/JSON runtime must match the reviewed contract-generating build');
const inventories={[pkg.name]:rootFiles};
const components=[];
for(const [path,p] of wanted){const key=actual[path]?path:'node_modules/'+pkg.name+'/'+path;const a=actual[key];assert(a);for(const field of ['version','integrity','resolved'])assert.equal(a[field],p[field]);const location=join(install,key),manifest=JSON.parse(readFileSync(join(location,'package.json')));assert.equal(manifest.version,p.version);assert.equal(manifest.license,p.license);
 const depDir=join(work,'dependency-'+components.length);mkdirSync(depDir);const [packedDep]=JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',depDir,p.resolved],depDir));const bytes=readFileSync(join(depDir,packedDep.filename));assert.equal('sha512-'+hash(bytes,'sha512','base64'),p.integrity,'dependency SRI');
 inventories[manifest.name]=files(location);
 components.push({type:'library','bom-ref':manifest.name,name:manifest.name,version:manifest.version,purl:`pkg:npm/${manifest.name.replace('@','%40')}@${manifest.version}`,licenses:[{license:{id:manifest.license}}],hashes:[{alg:'SHA-256',content:hash(bytes)},{alg:'SHA-512',content:hash(bytes,'sha512')}],externalReferences:[{type:'distribution',url:p.resolved}],properties:[{name:'npm:integrity',value:p.integrity}]});
}
const entry=join(root,'dist/src/index.js');
const cliEnv={PATH:process.env.PATH};
assert.equal(run(process.execPath,[entry,'--version'],work,cliEnv).trim(),pkg.version);
const help=run(process.execPath,[entry,'--help'],work,cliEnv);assert.match(help,/Usage:/);assert.match(help,/DARKTRACE_PROFILES/);assert.match(help,/confirm:true/);
for(const [name,value] of [['public-token','offline-public-canary'],['private-token','offline-private-canary']]){writeFileSync(join(work,name),value,{mode:0o600});chmodSync(join(work,name),0o600);}
const doctorEnv={...cliEnv,DARKTRACE_URL:'https://darktrace.example.internal',DARKTRACE_PUBLIC_TOKEN_FILE:join(work,'public-token'),DARKTRACE_PRIVATE_TOKEN_FILE:join(work,'private-token'),DARKTRACE_PROFILES:'read'};
// Write profiles start; only critical without write (or an unknown profile) is a startup error.
for(const [profiles,expected,tools] of [['read',{read:true,sensitive:false,write:false,critical:false},profileShape.read[0]],['read,write',{read:true,sensitive:false,write:true,critical:false},profileShape['read+write'][0]],['all',{read:true,sensitive:true,write:true,critical:true},profileShape.all[0]]])for(const flag of ['doctor','--check-config']){const result=JSON.parse(run(process.execPath,[entry,flag],work,{...doctorEnv,DARKTRACE_PROFILES:profiles}));assert.deepEqual(Object.keys(result).sort(),['approval','labValidated','networkProbe','ok','profiles','registeredTools','transport']);assert.equal(result.ok,true);assert.equal(result.transport,'stdio');assert.equal(result.registeredTools,tools,'registered tools '+profiles);assert.equal(result.networkProbe,false);assert.equal(result.labValidated,false);assert.deepEqual(result.profiles,expected);assert.deepEqual(Object.keys(result.approval).sort(),['critical','write']);}
for(const variables of [{DARKTRACE_PROFILES:'read,critical'},{DARKTRACE_WRITE_CRITICAL:'true'},{DARKTRACE_PROFILES:'superuser'}])for(const flag of [[],['doctor'],['--check-config']]){const got=spawnSync(process.execPath,[entry,...flag],{cwd:work,env:{...doctorEnv,...variables},input:'',encoding:'utf8',timeout:4000,maxBuffer:4096});assert.equal(got.status,1);assert.equal(got.stdout,'');assert(!got.stderr.includes('offline-public-canary')&&!got.stderr.includes('offline-private-canary'));const error=JSON.parse(got.stderr);assert.equal(error.event,'startup_error');assert.deepEqual(Object.keys(error).sort(),error.variable===undefined?['event','ts']:['event','ts','variable']);}
const rootComponent={type:'application','bom-ref':pkg.name,name:pkg.name,version:pkg.version,licenses:[{license:{id:pkg.license}}],hashes:[{alg:'SHA-256',content:hash(readFileSync(archive))}]};
const sbom={bomFormat:'CycloneDX',specVersion:'1.5',version:1,metadata:{component:rootComponent},components,dependencies:[{ref:pkg.name,dependsOn:['@modelcontextprotocol/server','zod']},{ref:'@modelcontextprotocol/server',dependsOn:['@modelcontextprotocol/core','zod']},{ref:'@modelcontextprotocol/core',dependsOn:['zod']},{ref:'zod',dependsOn:[]}]};
writeFileSync(join(out,'runtime-sbom.cdx.json'),JSON.stringify(sbom,null,2)+'\n');
writeFileSync(join(out,'runtime-files.sha256.json'),JSON.stringify(inventories,null,2)+'\n');
const report={node:process.version,npm:run('npm',['--version']).trim(),platform:process.platform,arch:process.arch,archiveSha256:hash(readFileSync(archive)),files:names.length,readmeEsSha256:hash(readFileSync(readmeEs)),releaseCapability,mcpToolContracts,runtimeDependencies:components.map(c=>({name:c.name,version:c.version,license:c.licenses[0].license.id})),checks:{tarAllowlist:true,regularFiles:true,binMode:'0755',readmeEsSourceBinding:true,publicPackageMetadata:true,noLifecycle:true,installedBytes:true,exactThreeDependencies:true,shrinkwrapSRI:true,downloadedDependencySRI:true,help:true,version:true,doctor:true,checkConfig:true,invalidProfilesRejected:true},work};
writeFileSync(join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
