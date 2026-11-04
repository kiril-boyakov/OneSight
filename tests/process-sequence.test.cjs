const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(tops){
 let removed=0,killed=0,time=10000;
 const effects=[],triggers=[],timelines=[];
 const make=()=>({className:'',setAttribute(){},remove(){removed++;}});
 const cards=tops.map(offsetTop=>({offsetTop,children:[],append(el){this.children.push(el);},querySelector(selector){return {selector};}}));
 const gsap={timeline(){const record={calls:[],wait:0,playing:false};timelines.push(record);const tl={fromTo(...args){record.calls.push(args);return tl;},to(...args){record.calls.push(args);return tl;},call(fn,args,at){record.calls.push({fn,at});return tl;},delay(wait){record.wait=wait;return tl;},play(){record.playing=true;return tl;},kill(){killed++;}};return tl;}};
 const context={document:{querySelector:()=>({querySelectorAll:()=>cards}),createElement:make},performance:{now:()=>time}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('src/process-sequence.js','utf8').replace('export function','function'),context);
 const cleanup=context.setupProcessSequence({gsap,ScrollTrigger:{create(config){triggers.push(config);return{kill(){killed++;}};}},play(...args){effects.push(args);}});
 return{cards,triggers,timelines,effects,cleanup,stats:()=>({removed,killed}),advance(ms){time+=ms;}};
}
test('desktop process runs in order, without hiding or changing client-facing text',()=>{
 const h=setup([0,0,0,0]);assert.equal(h.triggers.length,1);assert.equal(h.timelines.length,1);
 assert.equal(h.timelines[0].playing,false);h.triggers[0].onEnter();assert.equal(h.timelines[0].playing,true);
 const callbacks=h.timelines[0].calls.filter(call=>call.fn);
 assert.deepEqual(callbacks.map(call=>Number(call.at.toFixed(2))),[.1,.58,1.06,1.54]);
 callbacks[0].fn();assert.equal(h.effects.length,3);
 for(const [,frames] of h.effects)assert.deepEqual(Object.keys(frames),['transform']);
 assert.equal(h.cards[0].children.length,3);h.cleanup();assert.deepEqual(h.stats(),{removed:12,killed:2});
});
test('mobile rows wait until visible and queue their handoff instead of starting together',()=>{
 const h=setup([0,0,250,250]);assert.equal(h.triggers.length,2);
 h.triggers[0].onEnter();assert.equal(h.timelines[1].playing,false);
 h.triggers[1].onEnter();assert.equal(h.timelines[1].playing,true);assert.ok(h.timelines[1].wait>.9);
 h.cleanup();assert.deepEqual(h.stats(),{removed:12,killed:4});
 const stacked=setup([0,200,400,600]);assert.equal(stacked.triggers.length,4);
});
