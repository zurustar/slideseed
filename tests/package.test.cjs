const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {spawnSync}=require('node:child_process');const crypto=require('node:crypto');
test('distribution contains only SlideSeed.html, is reproducible and has valid checksums',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'slideseed-package-'));
 try{
  const run=()=>{const r=spawnSync('python3',['scripts/package.py','0.0.1-test','--output-dir',dir],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);};run();
  const single=fs.readFileSync(path.join(dir,'SlideSeed.html'));assert.deepEqual(single,fs.readFileSync('index.html'));
  const zip=fs.readFileSync(path.join(dir,'slideseed-0.0.1-test.zip'));run();assert.deepEqual(zip,fs.readFileSync(path.join(dir,'slideseed-0.0.1-test.zip')));
  const result=spawnSync('python3',['-c',"import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.namelist()==['SlideSeed.html'];assert z.testzip() is None;assert z.read('SlideSeed.html')==open('index.html','rb').read()",path.join(dir,'slideseed-0.0.1-test.zip')],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  for(const line of fs.readFileSync(path.join(dir,'slideseed-0.0.1-test.sha256'),'utf8').trim().split('\n')){const [digest,name]=line.split('  ');assert.equal(digest,crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex'));}
  const bad=spawnSync('python3',['scripts/package.py','../bad','--output-dir',dir],{encoding:'utf8'});assert.notEqual(bad.status,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
