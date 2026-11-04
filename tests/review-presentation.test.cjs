const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
async function render(reviews,ok=true){
 const node=()=>({children:[],disabled:true,hidden:false,listeners:{},attrs:{},offsetWidth:500,scrollLeft:0,classList:{items:new Set(),add(x){this.items.add(x);},toggle(x){if(this.items.has(x)){this.items.delete(x);return false;}this.items.add(x);return true;}},insertBefore(item,before){this.children.splice(this.children.indexOf(before),0,item);},after(item){this.afterNode=item;},scrollTo(options){this.scrollLeft=options.left;},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},setAttribute(name,value){this.attrs[name]=value;},addEventListener(name,fn){this.listeners[name]=fn;},focus(){this.focused=true;},scrollIntoView(){this.scrolled=true;}});
 const ids=Object.fromEntries(['review-form','review-status','review-fields','approved-reviews','review-empty','review-entry'].map(id=>[id,node()]));
 const trigger=node(),summary=node();ids['review-entry'].querySelector=()=>summary;
 vm.runInNewContext(fs.readFileSync('dist/reviews.js','utf8'),{
  document:{getElementById:id=>ids[id],createElement:node,querySelector:()=>trigger,dispatchEvent(){}},CustomEvent:class{},requestAnimationFrame:fn=>{fn();return 1;},
  fetch:async()=>({ok,json:async()=>({reviews})}),matchMedia:()=>({matches:false})
 });
 await new Promise(resolve=>setImmediate(resolve));return {ids,trigger,summary};
}
test('real review text is rendered as text, with truthful author initials and attribution',async()=>{
 const content='<img src=x onerror=alert(1)> This is feedback.';
 const {ids}=await render([{name:'Janis Krainis',business:'Krainis Digital',review:content}]);
 const card=ids['approved-reviews'].children[0];
 assert.equal(card.children[1].textContent,content);
 assert.equal(card.children[2].children[0].textContent,'JK');
 assert.equal(card.children[2].children[1].children[0].textContent,'Janis Krainis');
 assert.equal(ids['review-empty'].hidden,true);assert.equal(ids['review-fields'].disabled,false);
});
test('review invitation opens and focuses the form, while storage failure keeps submission disabled',async()=>{
 const {ids,trigger,summary}=await render([],false);
 assert.equal(ids['review-fields'].disabled,true);assert.equal(ids['review-empty'].hidden,false);
 trigger.listeners.click({preventDefault(){}});
 assert.equal(ids['review-entry'].open,true);assert.equal(summary.focused,true);assert.equal(ids['review-entry'].scrolled,true);
});

test('long reviews retain the full original text behind a keyboard-operable expand control',async()=>{
 const content='A real client perspective. '.repeat(20);
 const {ids}=await render([{name:'Client',review:content}]);
 const card=ids['approved-reviews'].children[0],quote=card.children[1],expand=card.children[2];
 assert.equal(quote.textContent,content);assert.equal(expand.attrs['aria-expanded'],'false');
 expand.listeners.click();assert.equal(expand.attrs['aria-expanded'],'true');assert.equal(expand.textContent,'Show less');
 expand.listeners.click();assert.equal(expand.attrs['aria-expanded'],'false');
});
test('multiple reviews get manual SVG navigation and a single review has no unnecessary controls',async()=>{
 const single=await render([{name:'Client',review:'Feedback'}]);assert.equal(single.ids['approved-reviews'].afterNode,undefined);
 const {ids}=await render([{name:'First',review:'Feedback'},{name:'Second',review:'Feedback'}]);
 const list=ids['approved-reviews'],nav=list.afterNode;
 assert.equal(nav.children[1].disabled,true);assert.equal(nav.children[2].disabled,false);
 nav.children[2].listeners.click();assert.equal(list.scrollLeft,516);
 list.listeners.scroll();assert.equal(nav.children[2].disabled,true);assert.equal(nav.children[0].textContent,'02 / 02');
});
