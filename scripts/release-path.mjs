import assert from 'node:assert/strict';
import {lstatSync,realpathSync} from 'node:fs';
import {resolve,dirname,basename,join,relative,isAbsolute,sep} from 'node:path';
// Resolve the nearest existing ancestor so nonexistent output directories and
// symlinked parents obey the same checkout exclusion before any writes.
export function resolveExternalOutput(checkout,requested){
 const root=realpathSync(resolve(checkout));let ancestor=resolve(requested);const suffix=[];
 for(;;){try{lstatSync(ancestor);break;}catch(error){if(error.code!=='ENOENT')throw error;suffix.unshift(basename(ancestor));const parent=dirname(ancestor);assert.notEqual(parent,ancestor);ancestor=parent;}}
 const output=join(realpathSync(ancestor),...suffix),delta=relative(root,output);
 assert(delta!==''&&(delta==='..'||delta.startsWith('..'+sep)||isAbsolute(delta)),'artifacts must be outside checkout');
 return output;
}
