/* DOM integration checks. Run with linkedom available via NODE_PATH; no browser/layout claims. */
const {parseHTML}=require('linkedom'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html='<html><body><section><span class="headline-line" data-build="hero">第一個標題</span><span class="headline-line" data-build="hero">複製後的新標題</span><div class="intro-bottom">'+Array.from({length:24},(_,i)=>`<p data-build="body">獨立段落 ${i}</p>`).join('')+'</div></section><dialog id="story-dialog"></dialog></body></html>';
function make(w=1440,h=900,reduce=false,config={}){
 const {document,HTMLElement}=parseHTML(html);let raf,now=0;const events={},mutations=[];
 Object.defineProperty(document.documentElement,'clientWidth',{get:()=>w});
 const els=[...document.querySelectorAll('.headline-line,.intro-bottom>p')];
 els.forEach((el,i)=>{el.r={left:25+i%4*200,top:80+Math.floor(i/4)*85,width:180,height:40};});
 HTMLElement.prototype.getBoundingClientRect=function(){const r=this.r||{left:0,top:1000,width:100,height:40};return {...r,right:r.left+r.width,bottom:r.top+r.height};};
 const motion=require('../src/motion.js');const window={innerHeight:h,EditorMotion:motion,CursorBuilderConfig:config};
 const ctx={document,window,matchMedia:()=>({matches:reduce,addEventListener(){}}),requestAnimationFrame:f=>{raf=f;return 1;},addEventListener:(e,f)=>events[e]=f,getComputedStyle:()=>({getPropertyValue:k=>({'font-size':'18px','line-height':'24px','color':'rgb(238,239,231)'}[k]||''),lineHeight:'24px'}),IntersectionObserver:class{observe(){}},MutationObserver:class{constructor(f){mutations.push(f);}observe(){}},console};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/builder.js'),'utf8'),ctx);
 return {document,els,window,events,mutations,run(t){now=t;const f=raf;raf=null;if(f)f(t);},resize(nw,nh){w=nw;h=nh;window.innerHeight=nh;events.resize();},inspect:()=>window.CursorBuilder.inspect(),pendingRAF:()=>!!raf};
}
let a=make();a.run(0);assert.equal(a.inspect().active.length,1,'only the first cursor departs immediately');let multiDrag=false;for(let t=16;t<=1280;t+=16){a.run(t);multiDrag ||=a.document.querySelectorAll('.editor-cursor[data-mode=cross]').length>1;}assert(multiDrag,'many cursors drag selection boxes concurrently');
const original=a.els[0].textContent;for(let t=1296;t<=5600;t+=16)a.run(t);assert.equal(a.els[0].textContent,original,'typing ghosts must not alter real news or headline text');assert.equal(a.inspect().active.length,0);assert.equal(a.inspect().pending,0);assert(!a.pendingRAF(),'animation loop stops after workers park');assert.equal(a.inspect().resting,12,'all workers remain parked on the right');const parked=a.inspect().positions;assert(Math.max(...parked.map(p=>p.y))-Math.min(...parked.map(p=>p.y))<=155,'resting pointers form a compact overlapping group');assert(!a.document.querySelector('.actor-name'),'cursors carry no name tags');assert.equal(a.document.querySelectorAll('.editor-actor.active').length,12,'completed pointers stay visible');a.events.scroll();a.run(16000);assert.equal(a.inspect().active.length,0,'returning to completed area never replays');
a=make();a.els.slice(2).forEach(el=>el.r.top=1500);for(let t=0;t<2400;t+=16)a.run(t);assert(a.els[1].classList.contains('editor-built'),'a dependent copy starts after the source completes, without another scroll');assert(!a.pendingRAF(),'no offscreen polling after dependent jobs finish');
a=make();a.run(0);assert.equal(a.inspect().active.length,1);a.run(99);assert.equal(a.inspect().active.length,1,'a waiting cursor stays parked until 100ms');a.run(100);assert.equal(a.inspect().active.length,2);a.run(199);assert.equal(a.inspect().active.length,2);a.run(200);assert.equal(a.inspect().active.length,3,'a third cursor leaves at the next 100ms interval');
const starts=new Map();for(let t=216;t<5600;t+=16){a.run(t);for(const task of a.inspect().active)starts.set(task.startedAt,task.startedAt);}const times=[...starts.values()].sort((a,b)=>a-b);for(let i=1;i<times.length;i++)assert(times[i]-times[i-1]>=100,'later jobs cannot depart in synchronized bursts');
a=make();let duplicate=false,grab=false,typing=false;
for(let t=0;t<1800;t+=16){a.run(t);for(const task of a.inspect().active){duplicate ||=task.duplicate;grab ||=task.phase.cursor==='grab';typing ||=task.phase.name==='type';}}
assert(duplicate&&grab&&typing,'frames are copied, dragged, and directly typed in a real DOM sequence');
a=make();let prior=a.inspect().positions;const roots=[...a.document.querySelectorAll('.editor-actor')];
for(let t=0;t<5600;t+=16){a.run(t);const state=a.inspect();state.positions.forEach((p,i)=>{assert(Math.hypot(p.x-prior[i].x,p.y-prior[i].y)<=145,'cursor positions never teleport between jobs or on return');});prior=state.positions;
 assert.equal(a.document.querySelectorAll('.editor-actor.active').length,12,'pointers never disappear between tasks');
 for(const task of state.active){assert.equal(task.duration,1500,'every build runs for 1.5 seconds');const ghost=roots[task.role].querySelector('.editor-ghost');const text=ghost.textContent;
 if(!['type','settle'].includes(task.phase.name))assert.equal(text,'','no complete text appears before typing begins');
 if(task.phase.name==='type')assert(task.target.startsWith(text),'typing reveals a single prefix, without selecting or erasing existing text');
 assert(!['select','highlight','resize'].includes(task.phase.name));}
}
assert(!a.document.querySelector('.editor-guides,.editor-highlight'),'alignment lines and text-selection overlays are removed');
a=make();a.run(0);a.run(100);a.window.CursorBuilder.scan();assert.equal(a.inspect().pending,26,'scanning during animation never registers overlay clones as new page content');
a=make(390,640);a.els.forEach((el,i)=>{el.r={left:15+(i%2)*180,top:30+Math.floor(i/2)*38,width:160,height:30};});a.run(0);assert.equal(a.inspect().active.length,1,'phone also staggers departures');for(let t=16;t<=688;t+=16)a.run(t);assert.equal(a.inspect().active.length,7,'phone caps simultaneous workers');a.resize(320,480);a.run(704);for(const el of [...a.document.querySelectorAll('.editor-actor.active .editor-selection')].filter(x=>x.style.visibility==='visible')){assert(parseFloat(el.style.left)>=0);assert(parseFloat(el.style.left)+parseFloat(el.style.width)<=320.1);assert(parseFloat(el.style.top)+parseFloat(el.style.height)<=480.1);}
a.els.forEach(el=>el.r.top=-200);a.events.scroll();a.run(720);assert.equal(a.inspect().active.length,0,'rapid scrolling retires offscreen workers');
a=make();a.run(0);a.document.querySelector('dialog').setAttribute('open','');a.mutations[0]();a.run(100);assert.equal(a.document.querySelector('.editor-layer').style.visibility,'hidden','article dialog suspends drawing');
a=make(390,640,true);a.run(0);assert.equal(a.inspect().active.length,0);assert.equal(a.inspect().pending,0,'reduced motion reveals all content immediately');
console.log('Passed DOM: readable pacing and unnamed compact resting cursors; 12/7 concurrent workers, cursor switching, copy/drag/edit, unchanged source content, idle stop, no replay, clone isolation, resize clipping, rapid-scroll handoff, modal suspension, reduced motion.');

a=make(1440,900,false,{poolSize:4,durationMs:1800,departureGapMs:200});a.run(0);assert.equal(a.document.querySelectorAll('.editor-actor').length,4);assert.equal(a.inspect().active[0].duration,1800);a.run(100);assert.equal(a.inspect().active.length,1);a.run(200);assert.equal(a.inspect().active.length,2);console.log('Passed configurable pool, duration and stagger.');
