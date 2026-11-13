'use strict';
(() => {
  const M=window.EditorMotion, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const states=new Map(),completed=new Set(),actors=[];
  const palette=['#97e9c0','#9ab7ff','#ffbb8d','#ceb0ff','#e9ed83','#f3a3c3','#80d8eb','#d0f77c','#ff9c9c','#8fb8ea','#ddbe8e','#9dd8af'];
  let frame=0,suspended=false,lastNow=0,lastDeparture=-Infinity;
  const layer=document.createElement('div');layer.className='editor-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
  const dock=document.createElement('div');dock.className='editor-dock';dock.setAttribute('aria-hidden','true');dock.innerHTML='<span class="dock-dots"></span><span class="dock-label">等待編排</span><span class="dock-count"></span>';document.body.append(dock);
  const icons={arrow:'<path d="M3 2L23 17L14 19L10 29Z" fill="currentColor" stroke="#101110" stroke-width="1.5"/>',cross:'<path d="M14 2V28M1 15H27" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="15" r="3" fill="#151713" stroke="currentColor"/>',resize:'<path d="M4 4L24 26M4 13V4H13M15 26H24V17" stroke="currentColor" stroke-width="2.2" fill="none"/>',text:'<path d="M9 3H19M14 3V28M9 28H19" stroke="currentColor" stroke-width="2"/>',grab:'<path d="M8 16V8Q8 5 11 7V4Q14 1 16 5V7Q19 4 21 8V11Q24 9 25 13V20L21 29H12L4 19Q2 15 5 15Z" fill="currentColor" stroke="#101110" stroke-width="1.4"/>'};
  function node(cls,parent=layer){const el=document.createElement('div');el.className=cls;parent.append(el);return el;}
  function makeActor(i){
    const color=palette[i%palette.length],root=node('editor-actor');root.style.setProperty('--actor-color',color);
    const selection=node('editor-selection',root);selection.innerHTML='<i class="nw"></i><i class="n"></i><i class="ne"></i><i class="e"></i><i class="se"></i><i class="s"></i><i class="sw"></i><i class="w"></i><span class="element-label"></span><span class="dimension-label"></span>';
    const ghost=node('editor-ghost',root);
    const cursor=node('editor-cursor',root);cursor.innerHTML='<svg viewBox="0 0 30 34"></svg><b class="key-hint"></b>';
    const trails=[];for(let j=0;j<3;j++){const t=node('editor-trail',root);t.innerHTML='<svg viewBox="0 0 30 34">'+icons.arrow+'</svg>';trails.push(t);}
    return {i,root,selection,ghost,cursor,trails,history:[],last:null,velocity:{x:0,y:0},lastTime:0,task:null,parking:null,parked:false,icon:null,color};
  }
  for(let i=0;i<12;i++)actors.push(makeActor(i));
  const width=()=>document.documentElement.clientWidth, height=()=>window.innerHeight;
  function raw(el){return el.getBoundingClientRect();}
  function bounds(el){if(!el.isConnected||el.closest('[hidden]'))return null;return M.intersect(raw(el),width(),height());}
  function visible(el){const b=bounds(el);return b&&b.width>18&&b.height>=Math.min(28,raw(el).height*.55);}
  function assignRect(el,r){el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.width=Math.max(1,r.width)+'px';el.style.height=Math.max(1,r.height)+'px';}
  function center(r){return {x:r.left+r.width*.5,y:r.top+r.height*.5};}
  function finish(s){if(!s)return;s.done=true;s.active=false;s.el.classList.remove('editor-pending','editor-working');s.el.classList.add('editor-built');completed.add(s.key);}
  function home(a){const gap=Math.min(14,(height()-72)/11);return {x:width()-28-(a.i%3)*4,y:height()/2+(a.i-5.5)*gap};}
  function hideWork(a){a.selection.style.visibility='hidden';a.ghost.style.visibility='hidden';a.ghost.replaceChildren();a.cursor.querySelector('.key-hint').textContent='';a.cursor.classList.remove('pressed');}
  function release(a,finishTask=true,now=lastNow){
    if(a.task&&finishTask)finish(a.task);a.task=null;hideWork(a);setIcon(a,'arrow');
    a.parking={from:{...a.last},start:now,duration:440};a.parked=false;a.root.classList.remove('resting');
  }
  function family(el){if(el.matches('.news-card h3,.mini-story h3'))return 'headline';if(el.matches('.category,.mini-story small'))return 'category';if(el.matches('.news-num,.mini-num'))return 'number';if(el.matches('.archive-row>span'))return 'archive-title';if(el.matches('.filters button'))return 'filter';if(el.matches('.news-card button'))return 'read-button';if(el.matches('.headline-line'))return 'hero';return el.tagName.toLowerCase();}
  function copyStyle(source,target){const c=getComputedStyle(source);for(const key of ['font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-transform','color','background-color','border-radius','border-top','border-right','border-bottom','border-left','padding','white-space','word-break','overflow-wrap'])target.style.setProperty(key,c.getPropertyValue(key));target.style.margin='0';target.style.boxSizing='border-box';target.style.display='block';}
  function start(a,s,now){
    a.task=s;a.parking=null;a.parked=false;s.active=true;s.start=now;s.origin={...a.last};s.el.classList.add('editor-working');a.root.classList.add('active');a.root.classList.remove('resting');
    s.source=[...states.values()].find(other=>other!==s&&other.done&&other.family===s.family&&visible(other.el))||[...states.values()].find(other=>other!==s&&other.active&&other.family===s.family&&visible(other.el));s.duplicate=!!s.source&&s.text.length>0;s.from=s.duplicate?bounds(s.source.el):null;
    const destination=s.duplicate?center(s.from):bounds(s.el);const travel=Math.hypot(a.last.x-(destination.x??destination.left),a.last.y-(destination.y??destination.top));s.approach=Math.max(240,Math.min(450,130+travel/5));s.duration=1500;

    a.ghost.replaceChildren();const clone=s.el.cloneNode(true);clone.removeAttribute('id');clone.classList.remove('editor-pending','editor-working','editor-built');clone.setAttribute('aria-hidden','true');clone.tabIndex=-1;clone.querySelectorAll('a,button,input,[tabindex]').forEach(x=>{x.tabIndex=-1;x.removeAttribute('id');});
    copyStyle(s.duplicate?s.source.el:s.el,clone);a.targetStyled=!s.duplicate;clone.style.visibility='visible';clone.style.opacity='1';clone.style.transform='none';clone.style.clipPath='none';a.ghost.append(clone);a.clone=clone;a.richHTML=clone.innerHTML;clone.textContent='';a.lastText='';a.selection.querySelector('.element-label').textContent=s.duplicate?'Duplicate / '+s.family:'Frame / '+s.family;
  }
  function setIcon(a,type){if(a.icon!==type){a.cursor.querySelector('svg').innerHTML=icons[type];a.icon=type;}a.cursor.dataset.mode=type;}
  function move(a,desired,now){
    const target={x:Math.max(6,Math.min(width()-26,desired.x)),y:Math.max(6,Math.min(height()-35,desired.y))};
    const dt=Math.max(.001,Math.min(.045,(now-a.lastTime)/1000||.016));
    const next=M.follow(a.last||target,target,a.velocity,dt);a.velocity=next.velocity;a.lastTime=now;
    const p={x:Math.max(6,Math.min(width()-26,next.position.x)),y:Math.max(6,Math.min(height()-35,next.position.y))};
    a.cursor.style.transform=`translate3d(${p.x}px,${p.y}px,0)`;
    const distance=a.last?Math.hypot(p.x-a.last.x,p.y-a.last.y):0;
    a.history.push({x:p.x,y:p.y,time:now});a.history=a.history.filter(x=>now-x.time<150);
    a.trails.forEach((t,i)=>{const old=a.history.filter(x=>now-x.time>22*(i+1)).at(-1);t.style.opacity=old&&distance>4?String((3-i)*.1):'0';if(old)t.style.transform=`translate3d(${old.x}px,${old.y}px,0)`;});a.last=p;return p;
  }
  function park(a,now){
    if(!a.parking&&!a.parked)a.parking={from:{...a.last},start:now,duration:440};
    const target=home(a);
    if(a.parked&&Math.hypot(a.last.x-target.x,a.last.y-target.y)>.5){a.parked=false;a.parking={from:{...a.last},start:now,duration:380};}
    if(!a.parking)return;
    const t=M.clamp((now-a.parking.start)/a.parking.duration),desired=M.point(a.parking.from,target,t,(a.i%2?1:-1)*12);
    move(a,desired,now);
    if(t>=1&&Math.hypot(a.last.x-target.x,a.last.y-target.y)<.35){
      a.parking=null;a.parked=true;a.velocity={x:0,y:0};a.root.classList.add('resting');a.trails.forEach(el=>el.style.opacity='0');
    }
  }
  function paint(a,now){
    const s=a.task,b=bounds(s.el);if(!b){release(a,true,now);return;}
    const p=M.clamp((now-s.start)/s.duration),ph=M.phase(p,s.duplicate,s.approach/s.duration),t=ph.t;
    const tl={x:b.left,y:b.top},br={x:b.left+b.width,y:b.top+b.height};
    const source=s.source?bounds(s.source.el)||M.intersect(s.from,width(),height())||b:b;
    const textAt={x:b.left+Math.min(b.width-5,8),y:b.top+Math.min(b.height*.5,22)};
    let desired=textAt,box=b,showBox=true,showGhost=false;
    a.cursor.querySelector('.key-hint').textContent='';a.selection.classList.toggle('marquee',ph.name==='draw');
    a.selection.style.opacity='1';
    if(ph.name==='approach'){desired=M.point(s.origin,s.duplicate?center(source):tl,t,(a.i%2?1:-1)*18);showBox=false;}
    if(ph.name==='duplicate'){box=source;desired=center(source);a.cursor.querySelector('.key-hint').textContent='⌘ D';}
    if(ph.name==='drag'){box=M.rect(source,b,t);desired=M.point(center(source),center(b),t,0);showGhost=true;}
    if(ph.name==='draw'){
      desired=M.point(tl,br,t,0);box={left:b.left,top:b.top,width:Math.max(1,desired.x-b.left),height:Math.max(1,desired.y-b.top)};
    }
    if(ph.name==='toText'){desired=M.point(s.duplicate?center(b):br,textAt,t,0);showGhost=true;}
    if(ph.name==='type'){
      showGhost=true;
      if(!a.targetStyled){copyStyle(s.el,a.clone);a.targetStyled=true;}
      const count=Math.floor(M.clamp(t*1.04)*s.graphemes.length),str=s.graphemes.slice(0,count).join('');
      if(str!==a.lastText){a.clone.textContent=str;a.lastText=str;}
    }
    if(ph.name==='settle'){showGhost=true;a.clone.innerHTML=a.richHTML;a.selection.style.opacity=String(1-t);}
    setIcon(a,ph.cursor);const actual=move(a,desired,now);
    // The dragged corner follows the physical cursor; there is no second resize pass.
    if(ph.name==='draw'){box.width=Math.max(1,Math.min(b.width,actual.x-b.left));box.height=Math.max(1,Math.min(b.height,actual.y-b.top));}
    assignRect(a.selection,box);a.selection.style.visibility=showBox?'visible':'hidden';
    a.selection.querySelector('.dimension-label').textContent=`${Math.round(box.width)} × ${Math.round(box.height)}`;
    assignRect(a.ghost,box);a.ghost.style.visibility=showGhost?'visible':'hidden';a.ghost.classList.toggle('typing',ph.name==='type');a.clone.style.width='100%';a.clone.style.minHeight='0';
    if(p>=1)release(a,true,now);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(step);}
  function step(now){
    frame=0;lastNow=now;for(const [el,s] of states)if(!el.isConnected){const actor=actors.find(a=>a.task===s);if(actor)release(actor,false);states.delete(el);}
    if(suspended){layer.style.visibility='hidden';dock.classList.remove('visible');return;}layer.style.visibility='visible';
    const limit=width()<600?7:width()<1000?10:12;actors.forEach((a,i)=>{if(a.task&&(!visible(a.task.el)||i>=limit))release(a);});
    const waiting=[...states.values()].filter(s=>!s.done&&!s.active&&visible(s.el)).sort((a,b)=>raw(a.el).top-raw(b.el).top);
    const available=actors.slice(0,limit).find(a=>!a.task);
    if(available&&waiting.length&&now-lastDeparture>=100){start(available,waiting.shift(),now);lastDeparture=now;}
    actors.forEach(a=>{if(a.task)paint(a,now);else park(a,now);});
    const busy=actors.filter(a=>a.task);dock.classList.toggle('visible',busy.length>0);dock.querySelector('.dock-label').textContent='協作編排中';dock.querySelector('.dock-count').textContent=`${busy.length} 游標`;dock.querySelector('.dock-dots').innerHTML=busy.map(a=>`<i style="background:${a.color}"></i>`).join('');
    const canvas=document.querySelector('.canvas');if(canvas){const local=[...states.values()].filter(s=>canvas.contains(s.el)),done=local.filter(s=>s.done).length,count=local.length||1;document.querySelector('#percent').textContent=Math.round(done/count*100)+'%';document.querySelector('#progress').style.width=done/count*100+'%';document.querySelector('#phase-label').textContent=done===local.length?'本區編排完成':'多游標協作中';document.querySelector('#build-status').textContent=done===local.length?'建構完成，繼續向下滑動':'一次拖拉到位 → 直接填入文字';}
    if(busy.length||waiting.length||actors.some(a=>a.parking)||[...states.values()].some(s=>!s.done&&visible(s.el)))schedule();
  }
  const observer=new IntersectionObserver(schedule,{threshold:[0,.15,.4,.8,1]});
  function scan(){
    const selectors=['header nav a','.eyebrow','.headline-line','h1>sup','.intro-bottom>p','.scroll-cue','.coordinates','.intro-rule>span','.frame-meta>span','.build-heading>.tiny','.build-heading h2','.mini-story small','.mini-num','.mini-story h3','.frame-footer>span','.section-kicker>span','.news-heading h2','#story-count','#edition-intro','#edition-note','.filters button','.search','.news-num','.news-card .category','.news-card h3','.news-card p','.source-line','.news-card button','.archive-head h2','.archive-head p','.archive-row>time','.archive-row>span','.archive-row>b','.closing>p','.closing>a'];
    document.querySelectorAll(selectors.join(',')).forEach(el=>{if(el.closest('.editor-layer,.editor-dock'))return;const text=el.textContent.trim();if(states.has(el)){const old=states.get(el);if(old.text===text)return;const actor=actors.find(a=>a.task===old);if(actor)release(actor,false);states.delete(el);}if(!text)return;const parent=el.closest('[data-id],[data-date]'),f=family(el),key=(parent?.dataset.id||parent?.dataset.date||'page')+':'+f+':'+text;const s={el,key,text,graphemes:Array.from(text),family:f,done:false,active:false};states.set(el,s);if(reduced.matches||completed.has(key))finish(s);else{el.classList.add('editor-pending');observer.observe(el);}});schedule();
  }
  window.pageBuilder={scan,refresh:schedule,finishVisible(){states.forEach(s=>{if(visible(s.el))finish(s);});actors.forEach(a=>release(a));schedule();},inspect(){return {active:actors.filter(a=>a.task).map(a=>({role:a.i,phase:M.phase(M.clamp((lastNow-a.task.start)/a.task.duration),a.task.duplicate,a.task.approach/a.task.duration),duplicate:a.task.duplicate,startedAt:a.task.start,duration:a.task.duration,target:a.task.text,position:{...a.last}})),pending:[...states.values()].filter(s=>!s.done).length,completed:completed.size,resting:actors.filter(a=>a.parked).length,positions:actors.map(a=>({...a.last}))};}};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);document.fonts?.ready.then(schedule);
  reduced.addEventListener('change',()=>{if(reduced.matches){states.forEach(finish);actors.forEach(a=>{release(a);a.parking=null;a.parked=true;});}schedule();});
  document.addEventListener('focusin',e=>{states.forEach(s=>{if(s.el.contains(e.target))finish(s);});actors.forEach(a=>{if(a.task?.done)release(a);});schedule();});
  new MutationObserver(()=>{suspended=!!document.querySelector('dialog[open]');schedule();}).observe(document.querySelector('#story-dialog'),{attributes:true,attributeFilter:['open']});
  actors.forEach(a=>{a.last=home(a);a.parked=true;a.root.classList.add('active','resting');hideWork(a);setIcon(a,'arrow');a.cursor.style.transform=`translate3d(${a.last.x}px,${a.last.y}px,0)`;});
  scan();document.documentElement.classList.remove('editor-boot');
})();
