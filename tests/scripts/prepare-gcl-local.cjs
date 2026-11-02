// Windows Cloud Files may appear as symbolic links to readdir (Playwright skips them).
// Restore identical local bytes only for GCL sources; never follow or replace real symlinks.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
if(process.platform==='win32') {
 const root=path.resolve(__dirname,'..');let restored=0;
 for(const folder of ['functional/gcl','pages/gcl']) {
  const dir=path.join(root,folder);if(!fs.existsSync(dir))continue;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
   if(!entry.name.endsWith('.ts') || !entry.isSymbolicLink())continue;
   const file=path.join(dir,entry.name);
   try {fs.readlinkSync(file);continue;} catch(e) {if(e.code!=='EINVAL')throw e;}
   if(!fs.statSync(file).isFile())continue;
   const data=fs.readFileSync(file),temp=path.join(dir,'.gcl-local-'+crypto.randomUUID()+'.tmp');
   fs.writeFileSync(temp,data,{flag:'wx'});fs.renameSync(temp,file);
   if(!fs.readFileSync(file).equals(data))throw Error('GCL local source byte verification failed');
   restored++;
  }
 }
 if(restored)console.error('GCL local source hydration:',restored,'files; content unchanged');
}
