const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {parse}=require('./helpers/engine.cjs');
const {render,byClass,all}=require('./helpers/dom.cjs');
const sample=fs.readFileSync('samples/matrix.md','utf8');
test('matrix axes and quadrants follow a fixed direction and order',()=>{
 const s=parse(sample)[0];assert.equal(s.invalid,false);assert.equal(s.warnings.length,0);assert.equal(s.axes.x.label,'工数');assert.equal(s.axes.y.high,'大');const node=render(s,0,1);assert.deepEqual(byClass(node,'matrix-cell').map(n=>n.attributes['data-position']),['左上','右上','左下','右下']);assert.deepEqual(byClass(node,'matrix-cell').map(n=>n.children[0].textContent),['すぐ着手','計画投資','余力で対応','再検討']);assert.equal(byClass(node,'matrix-y')[0].children[0].textContent,'大');assert.equal(byClass(node,'matrix-y')[0].children.at(-1).textContent,'小');assert.equal(byClass(node,'matrix-x')[0].children[0].textContent,'小');assert.equal(byClass(node,'matrix-x')[0].children.at(-1).textContent,'大');
});
test('missing, duplicate, malformed and empty axes never create an inferred diagram',()=>{
 const axis='<!-- x-axis: 工数 / 小 / 大 -->';
 for(const broken of [sample.replace(axis,''),sample.replace(axis,axis+'\n'+axis),sample.replace(axis,'<!-- x-axis: 工数 / 小 -->'),sample.replace(axis,'<!-- x-axis 工数 / 小 / 大 -->'),sample.replace(axis,'<!-- x-axis: 工数 /  / 大 -->'),sample.replace(axis,'<!-- x-axis: 工数 / 大 / 大 -->'),sample.replace(axis,'<!-- x-axis: 工数 / 小 / 大 / 余分 -->')]){const s=parse(broken)[0];assert.ok(s.invalid);assert.ok(s.warnings.length);const node=render(s,0,1);assert.equal(byClass(node,'matrix-cell').length,0);assert.equal(byClass(node,'validation-source')[0].textContent,broken);}
});
test('3 or 5 quadrants retain all source rather than reassigning extra content',()=>{
 for(const source of [sample.replace(/## 再検討[\s\S]*?(?=>)/,''),sample+'\n## 追加象限\n- 保持する']){const s=parse(source)[0];assert.ok(s.invalid);assert.equal(byClass(render(s,0,1),'validation-source')[0].textContent,source);}
});
test('axis directives are scoped to matrix and may occur before the layout',()=>{
 const source='<!-- x-axis: 工数 / 小 / 大 -->\n'+sample.replace('<!-- x-axis: 工数 / 小 / 大 -->','');assert.equal(parse(source)[0].invalid,false);
 const normal=sample.replace('layout: matrix','layout: message');const s=parse(normal)[0];assert.ok(s.intro.some(b=>b.text.includes('x-axis')));assert.ok(render(s,0,1).textContent.includes('<!-- x-axis:'));
});
test('long Japanese labels and extra quadrant items warn without dropping content',()=>{
 const source=sample.replace('工数 / 小 / 大','軸'.repeat(17)+' / '+'端'.repeat(11)+' / 大').replace('## すぐ着手','## '+'見'.repeat(13)).replace('- テンプレート統一','- '+'項'.repeat(21)+'\n- 2件目\n- 3件目');const s=parse(source)[0];assert.equal(s.invalid,false);for(const text of ['軸名は16字','見出しは12字','2件以内','20字以内'])assert.ok(s.warnings.some(w=>w.includes(text)));assert.ok(render(s,0,1).textContent.includes('3件目'));
});
test('hostile axis and quadrant text does not become active elements',()=>{
 const attack='<img src=x onerror=alert(1)>';const s=parse(sample.replace('工数 / 小 / 大',attack+' / 小 / 大').replace('テンプレート統一',attack))[0];const node=render(s,0,1);assert.ok(node.textContent.includes(attack));assert.ok(all(node).every(n=>!['img','script','iframe','a'].includes(n.tagName)));
});
test('maximum four quadrants with two items each retain eight items',()=>{
 const source=sample.replace(/^- ([^\n]+)/gm,'- $1\n- 追加項目');const s=parse(source)[0];assert.equal(s.warnings.length,0);assert.equal(all(render(s,0,1)).filter(n=>n.tagName==='li').length,8);
});
