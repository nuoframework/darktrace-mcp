import assert from 'node:assert/strict';
import {mkdtempSync,realpathSync,symlinkSync,existsSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {resolveExternalOutput} from './release-path.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),tmp=mkdtempSync(join(tmpdir(),'darktrace-release-path-'));
const link=join(tmp,'checkout');symlinkSync(root,link,'dir');
for(const output of [root,join(root,'release-must-not-exist'),link,join(link,'release-must-not-exist')]){
 assert.throws(()=>resolveExternalOutput(root,output),/outside checkout/);
 for(const args of [['scripts/prepare-release.mjs',output],['scripts/verify-release.mjs','/not-used.tgz',output]]){
  const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(result.status,1);assert.match(result.stderr,/artifacts must be outside checkout/);
 }
}
assert(!existsSync(join(root,'release-must-not-exist')));
const external=join(tmp,'external','new');assert.equal(resolveExternalOutput(root,external),join(realpathSync(tmp),'external','new'));assert(!existsSync(external));
assert.deepEqual(readdirSync(tmp),['checkout']);
console.log('Release output guard: exact root, child, symlink root/child rejected before writes; external nonexistent accepted without writes.');
