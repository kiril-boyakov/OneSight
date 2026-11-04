const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
for(const script of ['reviews','inquiries']){
 test(`${script} availability waits until the section approaches the viewport`,async()=>{
  let callback,requests=0,disconnected=0;
  const nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:true,textContent:'',addEventListener(){}});return nodes.get(id);};
  vm.runInNewContext(fs.readFileSync(`dist/${script}.js`,'utf8'),{
   document:{getElementById:node,querySelector:()=>node('trigger')},
   IntersectionObserver:class{constructor(fn,options){callback=fn;assert.equal(options.rootMargin,'600px 0px');}observe(){}disconnect(){disconnected++;}},
   fetch:async()=>{requests++;return{ok:true,json:async()=>({ready:true,reviews:[]})};}
  });
  assert.equal(requests,0);
  callback([{isIntersecting:false}]);assert.equal(requests,0);
  callback([{isIntersecting:true}]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests,1);assert.equal(disconnected,1);
  assert.equal(node(script==='reviews'?'review-fields':'inquiry-fields').disabled,false);
 });
}
