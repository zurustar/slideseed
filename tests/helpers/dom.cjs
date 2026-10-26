// Inert DOM fixture for structural renderer tests. No CSS/layout/browser emulation.
const {context} = require('./engine.cjs');
class Node {
 constructor(tag, text='') { this.tagName=tag; this.children=[]; this.attributes={}; this.className=''; this._text=text; this.style={setProperty:(k,v)=>this.style[k]=String(v)}; this.classList={add:(...names)=>this.className=[this.className,...names].filter(Boolean).join(' ')}; }
 append(...nodes) { this.children.push(...nodes); }
 setAttribute(key,value) { this.attributes[key]=String(value); }
 set textContent(value) { this._text=String(value); this.children=[]; }
 get textContent() { return this._text + this.children.map(n=>n.textContent).join(''); }
}
context.document={createElement:tag=>new Node(tag),createTextNode:text=>new Node('#text',text)};
const all=node=>[node,...node.children.flatMap(all)];
const byClass=(node,name)=>all(node).filter(n=>n.className.split(' ').includes(name));
module.exports={render:context.renderSlide,all,byClass};
