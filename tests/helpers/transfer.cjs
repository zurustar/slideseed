const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const script=id=>html.split('<script id="'+id+'">')[1].split('</script>')[0];
function fixture(withUi=false){
 const elements=new Map();let updates=0;
 const $=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',children:[],handlers:{},style:{},replaceChildren(...nodes){this.children=nodes;},append(...nodes){this.children.push(...nodes);},addEventListener(k,fn){this.handlers[k]=fn;},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();},focus(){this.focused=true;},setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}});return elements.get(id);};
 const context=vm.createContext({TextEncoder,TextDecoder,crypto:require('node:crypto').webcrypto,btoa,atob,$,current:0,deck:[],confirm:()=>true,status(){},getComputedStyle:()=>({lineHeight:'24'}),document:{createElement:tag=>({tag,textContent:'',append(){}})}});
 for(const id of ['engine','qr-vendor','qr-engine','qr-transfer','template-engine'])vm.runInContext(script(id),context);
 vm.runInContext('const SAMPLE = '+html.match(/const SAMPLE = (.*);/)[1]+';',context);
 context.update=()=>{updates++;context.deck=$('editor').value.trim()?context.parseMarkdown($('editor').value):[];};
 if(withUi){context.drawMarkdownQr=()=>({tag:'canvas'});vm.runInContext(script('qr-ui'),context);}
 return {context,$,updates:()=>updates};
}
module.exports={fixture,script,html};
