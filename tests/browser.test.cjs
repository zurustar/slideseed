// Generates a dependency-free browser test page with the actual distribution embedded.
// Run: node tests/browser.test.cjs; then open tests/browser.generated.html.
const fs=require('node:fs');
const app=fs.readFileSync('index.html','utf8');
const tests=async function(){
 const frame=document.getElementById('app');await new Promise(resolve=>frame.onload=resolve);
 const w=frame.contentWindow,d=w.document,$=id=>d.getElementById(id);const results=[];
 const tick=()=>new Promise(r=>w.requestAnimationFrame(()=>w.requestAnimationFrame(r)));
 function assert(ok,msg){if(!ok)throw Error(msg);}
 async function test(name,fn){try{await fn();results.push('PASS '+name);}catch(e){results.push('FAIL '+name+': '+e.message);}document.getElementById('results').textContent=results.join('\n');}
 function edit(text){$('editor').value=text;$('editor').dispatchEvent(new w.Event('input'));}
 const sample=$('editor').value;
 const samples=w.parseMarkdown(sample);
 const count=samples.length;
 await tick();
 await test('all sample patterns, Japanese text and measured overflow',async()=>{assert($('slides').options.length===count,'slide count');for(let i=0;i<count;i++){$('slides').value=String(i);$('slides').dispatchEvent(new w.Event('change'));await tick();assert($('viewport').querySelector('.'+samples[i].layout),'layout');assert(!$('diagnostics').classList.contains('has-warning'),$('diagnostics').textContent);const s=$('viewport').firstElementChild;assert(s.offsetWidth===1280&&s.offsetHeight===720,'16:9 canvas');assert(s.textContent.includes('SlideSeed'),'footer');}});
 await test('process order, upper count, source fallback and retained outputs',async()=>{for(const n of [3,5,6]){const source='# T\n<!-- layout: process -->\n'+Array.from({length:n},(_,i)=>'## 工程'+i+'\n説明\n- 成果'+i).join('\n');edit(source);await tick();if(n===6){assert($('viewport').querySelector('.validation-source').textContent===source,'source retained');assert($('diagnostics').textContent.includes('3〜5工程'),'count warning');}else{assert($('viewport').querySelectorAll('.process-step').length===n,'steps');assert($('viewport').querySelectorAll('.step-link').length===n-1,'links');assert(!$('diagnostics').classList.contains('has-warning'),$('diagnostics').textContent);}}});
 await test('matrix orientation, all eight items and invalid axes',async()=>{const source='# T\n<!-- layout: matrix -->\n<!-- x-axis: 工数 / 小 / 大 -->\n<!-- y-axis: 効果 / 小 / 大 -->\n'+['左上','右上','左下','右下'].map(p=>'## '+p+'\n- 項目1\n- 項目2').join('\n');edit(source);await tick();const cells=[...$('viewport').querySelectorAll('.matrix-cell')];assert(cells.map(n=>n.dataset.position).join(',')==='左上,右上,左下,右下','positions');assert($('viewport').querySelectorAll('.matrix-cell li').length===8,'items');assert(!$('diagnostics').classList.contains('has-warning'),$('diagnostics').textContent);const broken=source.replace('<!-- y-axis: 効果 / 小 / 大 -->','');edit(broken);await tick();assert(!$('viewport').querySelector('.matrix-diagram'),'invalid diagram');assert($('viewport').querySelector('.validation-source').textContent===broken,'source');});
 await test('problem-solution row correspondence, upper count and missing causes',async()=>{const source='# T\n<!-- layout: problem-solution -->\n'+[1,2,3].map(i=>'## 論点'+i+'\n- 課題: 課題'+i+'\n- 原因: 仮説'+i+'\n- 対策: 対策'+i).join('\n');edit(source);await tick();const rows=[...$('viewport').querySelectorAll('.problem-row')];assert(rows.length===3,'rows');rows.forEach((r,i)=>assert([...r.querySelectorAll('td')].map(n=>n.textContent).join(',')==='課題'+(i+1)+',仮説'+(i+1)+',対策'+(i+1),'correspondence'));assert(!$('diagnostics').classList.contains('has-warning'),$('diagnostics').textContent);const broken=source.replace('- 原因: 仮説2','');edit(broken);await tick();assert(!$('viewport').querySelector('.problem-table'),'invalid diagram');assert($('viewport').querySelector('.validation-source').textContent===broken,'source');});

 await test('group2 diagram structure, ratings, units and action fields',async()=>{
  for(const [id,cls] of [['logic-tree','tree-diagram'],['pyramid','pyramid-body'],['roadmap','roadmap-table'],['evaluation','evaluation-table'],['kpi','kpi-cards'],['recommendation','recommendation-columns']]){
   const slide=samples.find(s=>s.layout===id);assert(slide,'missing sample '+id);edit(slide.source);await tick();assert($('viewport').querySelector('.'+cls),'missing layout '+id);assert(!$('diagnostics').classList.contains('has-warning'),id+': '+$('diagnostics').textContent);
   if(id==='logic-tree')assert($('viewport').querySelectorAll('.tree-node').length===7,'tree nodes');
   if(id==='evaluation')assert($('viewport').textContent.includes('未評価')&&$('viewport').textContent.includes('推奨案：案B'),'legend and recommendation');
   if(id==='kpi')assert($('viewport').querySelectorAll('.kpi-card').length===3&&$('viewport').textContent.includes('測定期間'),'KPI structure');
   if(id==='recommendation')assert($('viewport').querySelectorAll('.action-item').length===3,'action fields');
   const broken=slide.source.replace('<!-- layout: '+id+' -->','<!-- layout: '+id+' -->')+'\n## 余分\n未知の本文';edit(broken);await tick();assert($('viewport').querySelector('.validation-source'),'invalid source view '+id);
  }
 });
 await test('group2 maximum element counts have no measured overflow',async()=>{
  const cases={
   'logic-tree':'# T\n<!-- layout: logic-tree -->\n<!-- root: 全体 -->\n'+[1,2,3].map(i=>'## 親論点'+i+'\n- 子論点'+i+'A\n- 子論点'+i+'B').join('\n'),
   pyramid:'# T\n<!-- layout: pyramid -->\n> 結論\n'+[1,2,3].map(i=>'## 根拠'+i+'\n- 補足').join('\n'),
   roadmap:'# T\n<!-- layout: roadmap -->\n| 施策 | A | B | C | D | E | F |\n| --- | --- | --- | --- | --- | --- | --- |\n'+[1,2,3,4,5].map(i=>'| 施策'+i+' | - | 実施 | 実施 | 実施 | - | - |').join('\n'),
   evaluation:'# T\n<!-- layout: evaluation -->\n| 判断基準 | A | B | C | D |\n| --- | --- | --- | --- | --- |\n'+[1,2,3,4,5].map(i=>'| 基準'+i+' | ◎ 適合 | ○ 適合 | △ 課題 | × 課題 |').join('\n'),
   kpi:'# T\n<!-- layout: kpi -->\n<!-- period: 第1四半期 -->\n'+[1,2,3,4].map(i=>'## 指標'+i+'\n- actual: 12345678\n- target: 20000000\n- unit: 件').join('\n'),
   recommendation:'# T\n<!-- layout: recommendation -->\n> 提言\n## 判断理由\n- 理由1\n- 理由2\n- 理由3\n## 次のアクション\n- action: 計画確定\n- owner: 担当部門\n- due: 合意後1週間'
  };
  for(const [id,source] of Object.entries(cases)){edit(source);await tick();assert(!$('diagnostics').classList.contains('has-warning'),id+': '+$('diagnostics').textContent);}
 });

 await test('group3 standard diagrams and safe error fallback',async()=>{
  const layouts={bar:'bar-rows',line:'chart-surface',waterfall:'waterfall-bar',composition:'composition-strip',funnel:'funnel-rows',cycle:'cycle-diagram','value-chain':'value-body',swimlane:'swimlane-grid','risk-register':'risk-table'};
  for(const [id,cls] of Object.entries(layouts)){
   const slide=samples.find(s=>s.layout===id);assert(slide,'missing '+id);edit(slide.source);await tick();assert($('viewport').querySelector('.'+cls),'missing diagram '+id);assert(!$('diagnostics').classList.contains('has-warning'),id+': '+$('diagnostics').textContent);
   if(id==='line')assert($('viewport').querySelectorAll('.plot-segment').length===4,'line edges');
   if(id==='waterfall')assert($('viewport').textContent.includes('+30')&&$('viewport').textContent.includes('-15'),'signed labels');
   if(id==='funnel')assert($('viewport').textContent.includes('20.0%'),'preceding conversion');
   if(id==='cycle')assert([...$('viewport').querySelectorAll('.cycle-card')].map(n=>n.dataset.order).join(',')==='1,2,3,4','cycle order');
   if(id==='swimlane')assert($('viewport').querySelectorAll('.handoff-end').length===3,'handoffs');
   edit(slide.source+'\n## 余分な構成要素\n- 保持する');await tick();assert($('viewport').querySelector('.validation-source'),'error source '+id);assert($('viewport').textContent.includes('保持する'),'discarded source '+id);
  }
 });
 await test('group3 upper element counts fit the fixed design canvas',async()=>{
  const table=(id,headers,rows,meta='')=>'# T\n<!-- layout: '+id+' -->\n'+meta+'\n| '+headers.join(' | ')+' |\n| '+headers.map(()=>'---').join(' | ')+' |\n'+rows.map(row=>'| '+row.join(' | ')+' |').join('\n');
  const cases={
   bar:table('bar',['項目','値'],Array.from({length:7},(_,i)=>['項目'+i,String(i-3)]),'<!-- unit: 件 -->'),
   line:table('line',['期間','値'],Array.from({length:8},(_,i)=>['期間'+i,String(i-4)]),'<!-- unit: 件 -->'),
   waterfall:table('waterfall',['区分','項目','値'],[['start','起点','10'],...[1,2,3,4,5].map(i=>['delta','増分'+i,'1']),['end','終点','15']],'<!-- unit: 件 -->'),
   composition:table('composition',['区分','割合'],[1,2,3,4,5].map(i=>['区分'+i,'20'])),
   funnel:table('funnel',['段階','件数'],[100,80,60,40,20].map((v,i)=>['段階'+i,String(v)]),'<!-- unit: 件 -->\n<!-- cohort: 対象期間と母集団 -->'),
   cycle:'# T\n<!-- layout: cycle -->\n<!-- center: 目的 -->\n'+[1,2,3,4].map(i=>'## 工程'+i+'\n説明').join('\n'),
   'value-chain':'# T\n<!-- layout: value-chain -->\n## 主活動\n'+[1,2,3,4,5].map(i=>'- 活動'+i+': 説明').join('\n')+'\n## 支援活動\n- 共通基盤: 説明\n- 人材育成: 説明',
   swimlane:table('swimlane',['担当','A','B','C','D','E'],[['部署1','作業1','-','-','作業4','-'],['部署2','-','作業2','-','-','作業5'],['部署3','-','-','作業3','-','-']]),
   'risk-register':table('risk-register',['リスク','重大度','対応','責任者'],[1,2,3,4].map(i=>['リスク'+i,'中','対応','担当']),'判定基準を明記する。')
  };
  for(const [id,source] of Object.entries(cases)){edit(source);await tick();assert(!$('diagnostics').classList.contains('has-warning'),id+': '+$('diagnostics').textContent);}
 });
 await test('line gaps, zero bars and invalid chart sums are explicit',async()=>{
  edit('# T\n<!-- layout: line -->\n<!-- unit: 件 -->\n| 期間 | 値 |\n| --- | --- |\n| A | 4 |\n| B | 欠測 |\n| C | 2 |\n| D | 0 |');await tick();assert($('viewport').querySelectorAll('.plot-segment').length===1,'missing gap');
  edit('# T\n<!-- layout: bar -->\n<!-- unit: 件 -->\n| 項目 | 値 |\n| --- | --- |\n| A | 0 |\n| B | 0 |\n| C | 0 |');await tick();assert([...$('viewport').querySelectorAll('.bar-fill')].every(n=>n.style.width==='0%'),'zero bars');assert($('diagnostics').textContent.includes('すべて0'),'zero note');
  const source=samples.find(s=>s.layout==='waterfall').source.replace('| 120 |','| 999 |');edit(source);await tick();assert($('viewport').querySelector('.validation-source').textContent===source,'bad sum fallback');
 });
 await test('live update, long unbroken Japanese and Latin overflow',async()=>{for(const text of ['長い日本語'.repeat(400),'x'.repeat(2000)]){edit('# Overflow\n<!-- layout: pillars -->\n## A\n'+text+'\n## B\n短文\n## C\n短文');await tick();assert($('diagnostics').textContent.includes('表示領域を超え'),'measured overflow missing');assert($('viewport').textContent.includes(text),'text was discarded');}});
 await test('hostile HTML, scripts, URLs are inert text',async()=>{edit('# Safe\n> **強調**\n<img src="https://invalid.test/" onerror="window.pwned=1">\n<script>window.pwned=1</scr'+'ipt>\n[link](javascript:alert(1))');await tick();assert(!w.pwned,'script executed');assert(!$('viewport').querySelector('img,script,a,iframe'),'injected element');assert($('viewport').querySelector('strong').textContent==='強調','emphasis');assert($('viewport').textContent.includes('<img'),'HTML lost');});
 await test('invalid shape and unknown layout retain all content',async()=>{edit('# T\n<!-- layout: compare -->\n## A\n1\n## B\n2\n## C\n3');await tick();assert($('viewport').querySelectorAll('.column').length===3,'discarded section');assert($('diagnostics').textContent.includes('現在3個'),'shape warning');edit('# T\n<!-- layout: unknown -->\nPreserved');await tick();assert($('viewport').textContent.includes('Preserved'),'fallback');});
 await test('Markdown load/save exact roundtrip (file APIs, dialogs stubbed)',async()=>{w.confirm=()=>true;const text='# 読み込み\r\n> **往復**';const transfer=new w.DataTransfer();transfer.items.add(new w.File([text],'sample.md',{type:'text/markdown'}));$('file').files=transfer.files;$('file').dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,100));assert($('editor').value===text.replace(/\r\n/g,'\n'),'loaded text');let saved;w.URL.createObjectURL=b=>{saved=b;return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};$('save').click();assert(await saved.text()===$('editor').value,'saved contents');});
 await test('presentation keyboard and exit (Fullscreen API stubbed)',async()=>{edit(sample);d.documentElement.requestFullscreen=async()=>{};$('present').click();await tick();assert(d.body.classList.contains('presenting'),'presentation start');d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert($('slides').value===String(count-1),'End');d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert($('slides').value==='0','Home');d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert($('slides').value==='1','next');d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!d.body.classList.contains('presenting'),'exit');});
 await test('QR dialog shows current full text, refreshes and clears failed or closed output',async()=>{
  edit('# 日本語🌱\n<!-- layout: message -->\n> 内容');$('qr-open').click();await tick();assert($('qr-dialog').open,'dialog open');assert($('qr-output').querySelector('canvas'),'QR generated');assert($('qr-status').textContent.includes(String(new w.TextEncoder().encode($('editor').value).length)),'byte count');
  edit('x'.repeat(2331));$('qr-refresh').click();assert(!$('qr-output').children.length,'old QR cleared');assert($('qr-status').textContent.includes('容量超過'),'capacity message');
  edit('');$('qr-refresh').click();assert($('qr-status').textContent.includes('空です'),'empty');
  edit('現在の全文');$('qr-refresh').click();assert($('qr-output').querySelector('canvas'),'refresh');$('qr-close').click();await tick();assert(!$('qr-dialog').open,'closed');assert(!$('qr-output').children.length,'cleared');assert(d.activeElement===$('qr-open'),'focus returned');
 });
 await test('offline license dialog exposes complete GPL and third-party notice',async()=>{
  d.getElementById('syntax-help').open=true;$('about-open').click();assert($('about-dialog').open,'about open');assert($('gpl-license').textContent.includes('END OF TERMS AND CONDITIONS'),'GPL');assert($('qr-license').textContent.includes('Project Nayuki'),'MIT notice');$('about-close').click();await tick();assert(d.activeElement===$('about-open'),'about focus');edit(sample);await tick();
 });
 await test('print includes all slides',async()=>{w.print=()=>{};$('print').click();assert($('print-deck').children.length===count,'print slide count');});
 edit(sample);await tick();document.title=results.some(x=>x.startsWith('FAIL'))?'FAIL — SlideSeed tests':'PASS — SlideSeed tests';
};
const output='<!doctype html><html lang="ja"><meta charset="utf-8"><title>SlideSeed browser tests</title><h1>SlideSeed browser tests</h1><pre id="results">Running…</pre><iframe id="app" style="width:1440px;height:900px;border:1px solid #ddd"></iframe><script>('+tests.toString()+')();document.getElementById("app").srcdoc='+JSON.stringify(app).replace(/</g,'\\u003c')+';</script></html>';
fs.writeFileSync('tests/browser.generated.html',output);console.log('Open tests/browser.generated.html in Chrome or Edge. Native fullscreen, download dialogs and PDF pagination require manual checks.');
