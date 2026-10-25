const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
async function render(reviews,ok=true){
 const node=()=>({children:[],disabled:true,hidden:false,listeners:{},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},setAttribute(){},addEventListener(name,fn){this.listeners[name]=fn;},focus(){this.focused=true;},scrollIntoView(){this.scrolled=true;}});
 const ids=Object.fromEntries(['review-form','review-status','review-fields','approved-reviews','review-empty','review-entry'].map(id=>[id,node()]));
 const trigger=node(),summary=node();ids['review-entry'].querySelector=()=>summary;
 vm.runInNewContext(fs.readFileSync('dist/reviews.js','utf8'),{
  document:{getElementById:id=>ids[id],createElement:node,querySelector:()=>trigger},
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
