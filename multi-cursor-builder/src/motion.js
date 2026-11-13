(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.EditorMotion=api;})(typeof window==='undefined'?globalThis:window,function(){
  const clamp=n=>Math.max(0,Math.min(1,n));
  const ease=t=>{t=clamp(t);return t<.5?2*t*t:1-(-2*t+2)**2/2;};
  const mix=(a,b,t)=>a+(b-a)*t;
  function point(a,b,t,bend=0){const e=ease(t),arc=4*e*(1-e);return {x:mix(a.x,b.x,e)+bend*arc,y:mix(a.y,b.y,e)-bend*.45*arc};}
  function rect(a,b,t){const e=ease(t);return {left:mix(a.left,b.left,e),top:mix(a.top,b.top,e),width:mix(a.width,b.width,e),height:mix(a.height,b.height,e)};}
  function intersect(r,w,h){const left=Math.max(9,r.left),top=Math.max(9,r.top),right=Math.min(w-9,r.right??r.left+r.width),bottom=Math.min(h-9,r.bottom??r.top+r.height);return right-left<8||bottom-top<8?null:{left,top,width:right-left,height:bottom-top};}
  function phase(p,duplicate,approach=.2){p=clamp(p);const a=clamp(approach),r=1-a;const steps=duplicate?[[a,'approach','arrow'],[a+r*.06,'duplicate','arrow'],[a+r*.42,'drag','grab'],[a+r*.55,'toText','arrow'],[a+r*.96,'type','text'],[1,'settle','arrow']]:[[a,'approach','arrow'],[a+r*.42,'draw','cross'],[a+r*.55,'toText','arrow'],[a+r*.96,'type','text'],[1,'settle','arrow']];let start=0;for(const[end,name,cursor]of steps){if(p<=end)return {name,cursor,t:clamp((p-start)/(end-start))};start=end;}return {name:'settle',cursor:'arrow',t:1};}
  function follow(current,target,velocity,dt){const omega=95,decay=Math.exp(-omega*dt),out={},v={};for(const k of ['x','y']){const delta=current[k]-target[k],term=(velocity[k]+omega*delta)*dt;out[k]=target[k]+(delta+term)*decay;v[k]=(velocity[k]-omega*term)*decay;}const distance=Math.hypot(out.x-current.x,out.y-current.y),maxStep=9000*dt;if(distance>maxStep){const ratio=maxStep/distance;for(const k of ['x','y']){out[k]=current[k]+(out[k]-current[k])*ratio;v[k]*=ratio;}}return {position:out,velocity:v};}

  return {clamp,ease,mix,point,rect,intersect,phase,follow};
});
