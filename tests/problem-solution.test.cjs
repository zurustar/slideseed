const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {parse}=require('./helpers/engine.cjs');
const {render,byClass,all}=require('./helpers/dom.cjs');
const sample=fs.readFileSync('samples/problem-solution.md','utf8');
const row='\n## 追加課題\n- 課題: 課題3\n- 原因: 仮説3\n- 対策: 対策3';
test('two and three rows maintain problem/cause/action correspondence',()=>{
 for(const source of [sample,sample+row]){const s=parse(source)[0];assert.equal(s.invalid,false);assert.equal(s.warnings.length,0);const node=render(s,0,1);const rows=byClass(node,'problem-row');assert.equal(rows.length,s.sections.length);rows.forEach((r,i)=>{assert.equal(r.children[0].textContent,s.sections[i].heading);assert.deepEqual(r.children.slice(1).map(n=>n.textContent),['課題','原因','対策'].map(k=>s.sections[i].fields[k]));});assert.equal(byClass(node,'solution-cell').length,s.sections.length);assert.ok(node.textContent.includes('原因仮説'));}
});
test('missing, duplicate, empty, unknown fields and stray prose retain the source',()=>{
 const sources=[sample.replace('- 原因: 完了条件が曖昧という仮説',''),sample.replace('- 課題: 実装後に修正が続く','- 課題: 実装後に修正が続く\n- 課題: 追加'),sample.replace('- 原因: 完了条件が曖昧という仮説','- 原因:'),sample+'\n- 別項目: 未知',sample+'\n通常段落も保持',sample+'\n- __proto__: attack'];
 for(const source of sources){const s=parse(source)[0];assert.ok(s.invalid);assert.ok(s.warnings.length);const node=render(s,0,1);assert.equal(byClass(node,'problem-row').length,0);assert.equal(byClass(node,'validation-source')[0].textContent,source);}
});
test('zero, one and four rows do not invent or discard relationships',()=>{
 for(const source of ['# T\n<!-- layout: problem-solution -->','# T\n<!-- layout: problem-solution -->'+row,sample+row+row]){const s=parse(source)[0];assert.ok(s.invalid);assert.ok(s.warnings.some(w=>w.includes('2〜3行')));assert.equal(byClass(render(s,0,1),'validation-source')[0].textContent,source);}
});
test('fullwidth delimiters work and only the first colon separates the field',()=>{
 const source=sample.replace('- 原因: 完了条件が曖昧という仮説','- 原因：仮説: 条件A：未合意');const s=parse(source)[0];assert.equal(s.invalid,false);assert.equal(s.sections[0].fields['原因'],'仮説: 条件A：未合意');assert.ok(render(s,0,1).textContent.includes('仮説: 条件A：未合意'));
});
test('field semantics remain local to problem-solution',()=>{
 const s=parse(sample.replace('layout: problem-solution','layout: compare'))[0];assert.equal(s.sections[0].fields,undefined);assert.ok(render(s,0,1).textContent.includes('課題: 実装後に修正が続く'));
});
test('heading and cell text budgets warn without truncation',()=>{
 const s=parse(sample.replace('要件の認識差','見'.repeat(13)).replace('実装後に修正が続く','文'.repeat(41)))[0];assert.equal(s.invalid,false);assert.ok(s.warnings.some(w=>w.includes('見出しは12字')));assert.ok(s.warnings.some(w=>w.includes('各40字')));assert.ok(render(s,0,1).textContent.includes('文'.repeat(41)));
});
test('hostile field values are text, including in fallback views',()=>{
 const attack='<img src=x onerror=alert(1)><script>alert(1)</script>';
 for(const source of [sample.replace('実装後に修正が続く',attack),sample+'\n- 未知: '+attack]){const node=render(parse(source)[0],0,1);assert.ok(node.textContent.includes(attack));assert.ok(all(node).every(n=>!['script','img','iframe','a'].includes(n.tagName)));}
});
test('field order does not change semantic columns and missing values are not inferred',()=>{
 const s=parse(sample.replace('- 課題: 実装後に修正が続く\n- 原因: 完了条件が曖昧という仮説','- 原因: 完了条件が曖昧という仮説\n- 課題: 実装後に修正が続く'))[0];assert.equal(s.invalid,false);assert.equal(byClass(render(s,0,1),'problem-row')[0].children[1].textContent,'実装後に修正が続く');
});
