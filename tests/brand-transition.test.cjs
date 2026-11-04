const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(reduced=false){
 const stamps=[],timers=new Map();let click,mediaChange,id=0;
 const media={matches:reduced,addEventListener(name,fn){mediaChange=fn;}};
 vm.runInNewContext(fs.readFileSync('dist/brand-transition.js','utf8'),{
  matchMedia:()=>media,
  document:{body:{append(stamp){stamps.push(stamp);}},createElement:()=>({removed:false,setAttribute(){},addEventListener(){},remove(){this.removed=true;}}),querySelectorAll:()=>[{addEventListener(name,fn){click=fn;}}]},
  setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(key){timers.delete(key);}
 });
 return{stamps,timers,click,reduce(){media.matches=true;mediaChange();}};
}
test('brand transition never intercepts navigation and replaces its previous stamp',()=>{
 const h=setup();assert.equal(h.stamps.length,1);
 h.click({button:0,preventDefault(){throw Error('Navigation must remain native');}});
 assert.equal(h.stamps.length,2);assert.equal(h.stamps[0].removed,true);assert.equal(h.timers.size,1);
 [...h.timers.values()][0]();assert.equal(h.stamps[1].removed,true);
});
test('reduced motion skips the intro and removes an active transition',()=>{
 const h=setup(true);assert.equal(h.stamps.length,0);
 const active=setup();active.reduce();assert.equal(active.stamps[0].removed,true);assert.equal(active.timers.size,0);
 active.click({button:0});assert.equal(active.stamps.length,1);
});
