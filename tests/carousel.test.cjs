const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function harness() {
  let writes = 0, reads = 0, top = 0, reduced = false;
  const listeners = {}, observers = [], frames = new Map();
  let frameId = 0;
  const element = () => ({
    style:new Proxy({removeProperty(key){delete this[key];}}, {set(target,key,value){writes++;target[key]=value;return true;}}),
    classList:{toggle(){}}, setAttribute(){writes++;},removeAttribute(){writes++;},
    addEventListener(type,fn){this[type]=fn;}
  });
  const links = Array.from({length:3},element);
  const cards = links.map(link => Object.assign(element(),{querySelector:()=>link}));
  const prev = element(), next = element(), count = element(), stage = element();
  const reel = Object.assign(element(),{querySelectorAll:()=>cards,querySelector:key=>({'.reel-prev':prev,'.reel-next':next,'.reel-count':count,'.reel-stage':stage}[key])});
  const section = Object.assign(element(),{offsetHeight:2300,querySelector:()=>reel,getBoundingClientRect(){reads++;return {top};}});
  const media = {get matches(){return reduced;},addEventListener(type,fn){this.change=fn;}};
  const context = {document:{querySelector:()=>section},innerHeight:1000,scrollY:0,
    matchMedia:query=>query.includes('reduce')?media:{matches:false},
    requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),
    IntersectionObserver:class {constructor(fn){this.fn=fn;observers.push(this);}observe(){}},
    ResizeObserver:class {observe(){}},
    window:{addEventListener:(type,fn)=>listeners[type]=fn,scrollTo:args=>{top=-args.top;listeners.scroll();}}
  };
  vm.runInNewContext(fs.readFileSync('dist/carousel.js','utf8'),context);
  const flush=()=>{const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn());};
  return {cards,links,prev,next,count,flush,scroll:()=>listeners.scroll(),
    near(value){observers[0].fn([{isIntersecting:value}]);flush();},
    stats:()=>({writes,reads,frames:frames.size}),
    reduce(value){reduced=value;media.change();flush();}};
}
test('off-screen scrolling does not read carousel geometry or mutate cards',()=>{
  const h=harness(),before=h.stats();
  for(let i=0;i<100;i++)h.scroll();
  h.flush();assert.deepEqual(h.stats(),before);
});
test('visible carousel coalesces scroll events and skips unchanged styles',()=>{
  const h=harness();h.near(true);const before=h.stats();
  for(let i=0;i<100;i++)h.scroll();
  assert.equal(h.stats().frames,1);h.flush();
  assert.equal(h.stats().reads,before.reads+1);assert.equal(h.stats().writes,before.writes);
});
test('navigation changes active project and pauses work after leaving viewport',()=>{
  const h=harness();h.near(true);h.next.click();h.flush();
  assert.equal(h.count.textContent,'02 / 03');assert.equal(h.links[1].tabIndex,0);assert.equal(h.links[0].tabIndex,-1);
  h.near(false);const before=h.stats();h.scroll();h.flush();assert.deepEqual(h.stats(),before);
});
test('reduced motion removes 3D inline styles and stops scroll rendering',()=>{
  const h=harness();h.near(true);assert.ok(h.cards[0].style.transform);
  h.reduce(true);assert.equal(h.cards[0].style.transform,undefined);
  const before=h.stats();h.scroll();h.flush();assert.deepEqual(h.stats(),before);
});
