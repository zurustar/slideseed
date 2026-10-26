const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {parse}=require('./helpers/engine.cjs');
const {render,all,byClass}=require('./helpers/dom.cjs');
const source=n=>'# 計画\n<!-- layout: process -->\n'+Array.from({length:n},(_,i)=>`## 工程${i+1}\n説明${i+1}\n- 成果${i+1}`).join('\n');
test('process accepts 3 through 5 ordered stages and preserves results',()=>{
 for(const n of [3,4,5]){const s=parse(source(n))[0];assert.equal(s.layout,'process');assert.equal(s.invalid,false);assert.equal(s.warnings.length,0);const node=render(s,0,1);assert.equal(byClass(node,'process-step').length,n);assert.equal(byClass(node,'step-link').length,n-1);assert.deepEqual(byClass(node,'step-index').map(n=>n.textContent),Array.from({length:n},(_,i)=>String(i+1).padStart(2,'0')));assert.equal(byClass(node,'step-deliverable').length,n);for(let i=1;i<=n;i++)assert.ok(node.textContent.includes('成果'+i));}
});
test('missing or excessive stages use a source view without dropping content',()=>{
 for(const n of [0,2,6]){const input=source(n);const s=parse(input)[0];assert.ok(s.invalid);assert.ok(s.warnings.some(w=>w.includes('3〜5工程')));const node=render(s,0,1);assert.equal(byClass(node,'process-step').length,0);assert.equal(byClass(node,'validation-source')[0].textContent,input);}
});
test('extra deliverables are warned and retained; prose and lists keep their role',()=>{
 const s=parse(source(3)+'\n- 追加成果物\n追加の説明')[0];assert.ok(s.warnings.some(w=>w.includes('成果物は1項目')));const node=render(s,0,1);assert.ok(byClass(node,'step-description').at(-1).textContent.includes('追加の説明'));assert.ok(byClass(node,'step-deliverable').at(-1).textContent.includes('追加成果物'));
});
test('Japanese heading, description, output and total budgets warn without shortening',()=>{
 const input=source(5).replace('工程1','あ'.repeat(13)).replace('説明1','説'.repeat(41)).replace('成果1','果'.repeat(31));const s=parse(input)[0];assert.ok(s.warnings.some(w=>w.includes('12字')));assert.ok(s.warnings.some(w=>w.includes('40字')));assert.ok(s.warnings.some(w=>w.includes('30字')));assert.ok(s.warnings.some(w=>w.includes('合計60字')));assert.ok(render(s,0,1).textContent.includes('果'.repeat(31)));
});
test('hostile content only creates application-owned elements in valid and source views',()=>{
 const attack='<img src=x onerror=alert(1)><script>alert(1)</script>';
 for(const n of [3,6]){const node=render(parse(source(n).replace('説明1',attack))[0],0,1);assert.ok(node.textContent.includes(attack));assert.ok(all(node).every(n=>!['img','script','iframe','a'].includes(n.tagName)));}
});
test('process sample is warning-free and only explicit directives select process',()=>{
 const sample=fs.readFileSync('samples/process.md','utf8');assert.equal(parse(sample)[0].warnings.length,0);assert.equal(parse(sample.replace('<!-- layout: process -->',''))[0].layout,'pillars');
});
