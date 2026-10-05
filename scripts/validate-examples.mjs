import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const name of readdirSync(new URL('../examples/',import.meta.url)))if(name.endsWith('.json'))JSON.parse(readFileSync(new URL('../examples/'+name,import.meta.url)));
// Python's standard-library TOML parser is a build/verification prerequisite only.
const r=spawnSync('python3',['-c','import tomllib,pathlib; tomllib.loads(pathlib.Path("examples/codex.config.toml").read_text())'],{cwd:root,encoding:'utf8'});
assert.equal(r.status,0,r.stderr||r.error?.message);console.log('Example JSON and TOML syntax valid.');
