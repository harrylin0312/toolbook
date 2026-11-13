const assert=require('node:assert/strict');
const M=require('../src/motion.js');
const speedAt=t=>(M.ease(t+.001)-M.ease(t-.001))/.002;
assert(Math.abs(speedAt(.3)-speedAt(.2)-(speedAt(.2)-speedAt(.1)))<.0001,'velocity increases linearly during acceleration');
assert(speedAt(.3)>speedAt(.1),'cursor accelerates before the midpoint');
assert(Math.abs(speedAt(.6)-speedAt(.7)-(speedAt(.7)-speedAt(.8)))<.0001,'velocity decreases linearly during braking');
assert(speedAt(.9)<speedAt(.7),'cursor decelerates before landing');
assert.deepEqual(M.point({x:20,y:30},{x:300,y:200},0,25),{x:20,y:30});
assert.deepEqual(M.point({x:20,y:30},{x:300,y:200},1,25),{x:300,y:200});
assert.equal(M.phase(.3,false).cursor,'cross');assert.equal(M.phase(.8,false).cursor,'text');
assert.equal(M.phase(.23,true).name,'duplicate');assert.equal(M.phase(.4,true).cursor,'grab');assert.equal(M.phase(.8,true).name,'type');
for(let p=0;p<=1;p+=.01)for(const duplicate of [false,true])assert(!['resize','highlight','select'].includes(M.phase(p,duplicate).name),'no second resize or text-selection phase');
let state={position:{x:0,y:0},velocity:{x:0,y:0}};
for(let i=0;i<60;i++){const next=M.follow(state.position,{x:300,y:200},state.velocity,.016);assert(next.position.x>=state.position.x&&next.position.x<=300,'cursor follows continuously without overshoot');state=next;}
assert(Math.abs(state.position.x-300)<.001);
for(const [w,h]of [[320,480],[390,844],[768,1024],[1440,900]]){
 const box=M.intersect({left:-100,top:-40,width:1800,height:1200},w,h);
 assert(box.left>=0&&box.top>=0&&box.left+box.width<=w&&box.top+box.height<=h);
}
assert.equal(M.intersect({left:20,top:900,width:100,height:40},390,844),null);
console.log('Passed motion: acceleration/deceleration, exact landing, cursor-mode transitions, fast copy/type sequence and continuous cursor following, viewport bounds.');
