// Node.js is for development tests only; the distributed app needs no runtime.
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const tests=fs.readdirSync('tests').filter(name=>name.endsWith('.test.cjs')&&name!=='browser.test.cjs').sort().map(name=>'tests/'+name);
const result=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
