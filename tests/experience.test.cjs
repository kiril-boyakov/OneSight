const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(motion){
 let setupMedia,observers=0,mutations=0,removed=0,refreshes=0,fontReady;
 const handlers=new Map(),added=[];
 const make=()=>({className:'',setAttribute(){},append(){mutations++;},remove(){removed++;}});
 const gsap={registerPlugin(){},matchMedia:()=>({add(query,fn){setupMedia=fn;}}),fromTo(...args){added.push(args);},to(...args){added.push(args);}};
 const document={body:{append(){mutations++;}},createElement:make,querySelector:()=>null,querySelectorAll:()=>[],fonts:{ready:{then(fn){fontReady=fn;}}},addEventListener:(key,fn)=>handlers.set(key,fn),removeEventListener:key=>handlers.delete(key)};
 vm.runInNewContext(fs.readFileSync('src/experience.js','utf8').replace(/^import .*;\n/gm,''),{
  gsap,ScrollTrigger:{config(){},refresh(){refreshes++;}},document,scrollY:0,
  animate(){throw Error('No targets should be animated in this fixture');},
  IntersectionObserver:class{constructor(){observers++;}observe(){}disconnect(){removed++;}}
 });
 const cleanup=setupMedia({conditions:{motion,compact:true}});
 return{cleanup,fontReady,stats:()=>({observers,mutations,removed,refreshes,handlers:handlers.size}),added};
}
test('reduced motion creates no scroll UI, observers, or animations',()=>{
 const h=setup(false);assert.equal(h.cleanup,undefined);assert.equal(h.stats().observers,0);assert.equal(h.stats().mutations,0);assert.equal(h.added.length,0);
});
test('responsive teardown removes observers, progress UI and event listeners; late fonts cannot refresh disposed effects',()=>{
 const h=setup(true);assert.equal(h.stats().observers,1);assert.equal(h.stats().handlers,1);
 h.cleanup();assert.equal(h.stats().handlers,0);assert.equal(h.stats().removed,2);
 h.fontReady();assert.equal(h.stats().refreshes,0);
 assert.equal(h.added[0][2].scrollTrigger.scrub,true);
});
