const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const jsQR=require('./vendor/jsQR.js'); // Independent Apache-2.0 decoder; development only.
const html=fs.readFileSync('index.html','utf8');
const context=vm.createContext({TextEncoder});
for(const id of ['qr-vendor','qr-engine']) vm.runInContext(html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1],context);
const make=context.makeMarkdownQr;
function decode(result){
 let pixels,size;
 const canvas={style:{},setAttribute(){},getContext(){size=this.width;pixels=new Uint8ClampedArray(size*size*4);return {fillStyle:'',fillRect(x,y,w,h){const color=this.fillStyle==='#FFFFFF'?255:0;for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){const k=(j*size+i)*4;pixels[k]=pixels[k+1]=pixels[k+2]=color;pixels[k+3]=255;}}};}};
 context.drawMarkdownQr(result,{createElement(name){assert.equal(name,'canvas');return canvas;}});
 const decoded=jsQR(pixels,size,size,{inversionAttempts:'dontInvert'});
 assert.ok(decoded,'independent decoder must recognize QR');
 return {decoded,canvas,pixels};
}
test('QR preserves UTF-8 Japanese, emoji, whitespace, comments and hostile HTML verbatim',()=>{
 for(const source of ['# Title\n\n---\n<!-- layout: message -->\n> **Hello**','日本語、絵文字🌱🎉\n\n\t末尾空白  \n',' \n\t ','<script>alert(1)</script>\n<img src=x onerror=alert(2)>','# CRLF\r\n\r\n\uFEFFend\u0000']){
  const result=make(source);assert.equal(result.kind,'ok');
  const {decoded}=decode(result);assert.deepEqual(decoded.binaryData,Array.from(new TextEncoder().encode(source)));assert.equal(decoded.data,source);
  assert.ok(decoded.chunks.some(c=>c.type==='eci'&&c.assignmentNumber===26),'UTF-8 ECI');
 }
});
test('QR empty input and invalid surrogate do not mutate or silently replace input',()=>{
 assert.equal(make('').kind,'empty');for(const s of ['\uD800','x\uDC00','\uD800X'])assert.equal(make(s).kind,'invalid');
});
test('QR fixed-M capacity includes ECI overhead and counts UTF-8 bytes',()=>{
 for(const n of [2329,2330]){const source='a'.repeat(n);const r=make(source);assert.equal(r.kind,'ok');assert.equal(r.code.version,40);assert.equal(r.code.errorCorrectionLevel.ordinal,1);assert.equal(decode(r).decoded.data,source);}
 for(const s of ['a'.repeat(2331),'日'.repeat(777),'🌱'.repeat(583)]){const r=make(s);assert.equal(r.kind,'capacity');assert.equal(r.bytes,new TextEncoder().encode(s).length);}
 const source='日'.repeat(776)+'ab';assert.equal(make(source).bytes,2330);assert.equal(decode(make(source)).decoded.data,source);
});
test('QR chooses versions without lowering or boosting M; canvas has integer modules and quiet zone',()=>{
 for(const n of [1,100,500,1500]){const r=make('x'.repeat(n));assert.equal(r.code.errorCorrectionLevel.ordinal,1);const {decoded,canvas,pixels}=decode(r);assert.equal(decoded.data,'x'.repeat(n));const scale=canvas.width/(r.code.size+8);assert.ok(Number.isInteger(scale)&&scale>=3);for(let y=0;y<4*scale;y++)for(let x=0;x<canvas.width;x++)assert.equal(pixels[(y*canvas.width+x)*4],255);}
});
test('embedded encoder and complete license copies match checked-in sources',()=>{
 const script=html.match(/<script id="qr-vendor">\n([\s\S]*?)\n<\/script>/)[1];assert.equal(script,fs.readFileSync('third_party/qrcodegen.js','utf8'));
 const unescape=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&');
 assert.equal(unescape(html.match(/<pre id="gpl-license"[^>]*>([\s\S]*?)<\/pre>/)[1]),fs.readFileSync('LICENSE','utf8'));
 assert.equal(unescape(html.match(/<pre id="qr-license"[^>]*>([\s\S]*?)<\/pre>/)[1]),script.slice(0,script.indexOf('"use strict";')));
});
test('all inline application scripts are valid JavaScript',()=>{for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);});
test('QR controls refresh, paginate, clear failures and restore focus',async()=>{
 const {context:c,$}=require('./helpers/transfer.cjs').fixture(true);
 $('editor').value='first';$('qr-open').onclick();await c.refreshQr();assert.equal($('qr-dialog').open,true);assert.equal($('qr-output').children.length,1);
 $('editor').value='a'.repeat(3000);await $('qr-refresh').onclick();assert.equal($('qr-count').textContent,'1 / 2');$('qr-next').onclick();assert.equal($('qr-count').textContent,'2 / 2');assert.equal($('qr-next').disabled,true);
 $('editor').value='a'.repeat(49153);await $('qr-refresh').onclick();assert.equal($('qr-output').children.length,0);assert.match($('qr-status').textContent,/容量超過/);
 $('editor').value='';await $('qr-refresh').onclick();assert.match($('qr-status').textContent,/空です/);
 $('qr-close').onclick();assert.equal($('qr-dialog').open,false);assert.equal($('qr-output').children.length,0);assert.equal($('qr-open').focused,true);
 $('about-open').onclick();assert.equal($('about-dialog').open,true);$('about-close').onclick();assert.equal($('about-open').focused,true);
});
