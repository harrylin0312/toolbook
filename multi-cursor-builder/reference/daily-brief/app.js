'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const base = 'https://raw.githubusercontent.com/harrylin0312/daily_brief/main/content/';
const names = {tech:'科技 & AI',markets:'投資市場',security:'重大資安',f1:'F1 賽道'};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url = s => {try {const u = new URL(s); return /^https?:$/.test(u.protocol) ? esc(u.href) : '#';}catch{return '#';}};
let edition, editionSignature = '', index = [], category = 'all', previousFocus;
async function json(path, remote = true) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 6500);
  try {const r = await fetch(remote ? base + path + '?t=' + Math.floor(Date.now()/300000) : 'data/' + path, {signal:controller.signal});if(!r.ok)throw new Error(r.status);return await r.json();}finally{clearTimeout(timer);}
}
function render(data) {
  const signature = JSON.stringify(data);
  if(signature === editionSignature)return;
  editionSignature = signature;
  edition = data;
  $$('.issue-date').forEach(el => el.textContent = data.date.replaceAll('-', ' / '));
  $('#story-count').textContent = String(data.stories.length).padStart(2,'0') + ' 則精選';
  $('#edition-intro').textContent = data.intro || data.title;
  $('#edition-note').textContent = data.editor_note || '';
  $('#build-stories').innerHTML = data.stories.slice(0,2).map((s,i) => `<div class="mini-story assemble-item" data-step="${i+3}"><small>${esc(names[s.category] || s.category)}</small><span class="mini-num">0${i+1}</span><h3>${esc(s.title)}</h3></div>`).join('');
  $('#news-list').innerHTML = data.stories.map((s,i) => `<article class="news-card" data-id="${esc(s.id)}"><span class="news-num">${String(i+1).padStart(2,'0')}</span><div><span class="category ${esc(s.category)}">${esc(names[s.category] || s.category)}</span><h3>${esc(s.title)}</h3><p>${esc(s.teaser || s.summary)}</p><div class="source-line">${esc((s.sources || []).map(x=>x.name).join(' / '))}</div></div><button data-open="${i}">展開重點 <span>↗</span></button></article>`).join('');
  filter(); window.pageBuilder.scan();
}
function filter() {
  let count = 0;const query = $('#search').value.trim().toLocaleLowerCase();
  $$('.news-card').forEach((el,i)=>{const s=edition.stories[i];const match=(category==='all'||category===s.category)&&JSON.stringify(s).toLocaleLowerCase().includes(query);el.hidden=!match;if(match)count++;});
  $('#empty').hidden = count !== 0;
  window.pageBuilder?.refresh();
  $('#story-count').textContent = `${String(count).padStart(2,'0')} / ${String(edition.stories.length).padStart(2,'0')} 則精選`;
}
$('.filters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b||!edition)return;category=b.dataset.category;$$('[data-category]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});filter();});
$('#search').addEventListener('input',()=>edition&&filter());
$('#news-list').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(!b)return;const s=edition.stories[Number(b.dataset.open)];previousFocus=b;
  const details=s.details?.length?s.details:[{heading:'新聞重點',points:[s.summary]}];
  $('#story-detail').innerHTML=`<span class="category ${esc(s.category)}">${esc(names[s.category])} / ${esc(edition.date)}</span><h2>${esc(s.title)}</h2><p>${esc(s.teaser || s.summary)}</p>${details.map(d=>`<h3>${esc(d.heading)}</h3>${d.points.map(p=>`<p>${esc(p)}</p>`).join('')}`).join('')}<h3>為什麼重要</h3><p>${esc(s.why)}</p><h3>仍需留意</h3><p>${esc(s.limit)}</p>${s.update_note?`<h3>事件更新</h3><p>${esc(s.update_note)}</p>`:''}<h3>原文與來源</h3>${(s.sources||[]).map(x=>`<a class="source" href="${url(x.url)}" target="_blank" rel="noopener">${esc(x.name)} ↗</a><small>發布日期 ${esc(x.published)}</small>`).join('')}`;
  $('#story-dialog').showModal();document.body.style.overflow='hidden';$('#story-dialog').scrollTop=0;
});
$('.close-dialog').addEventListener('click',()=>$('#story-dialog').close());
$('#story-dialog').addEventListener('close',()=>{document.body.style.overflow='';previousFocus?.focus({preventScroll:true});});
$('#story-dialog').addEventListener('click',e=>{if(e.target===$('#story-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
function archives() {$('#archive-list').innerHTML=index.map(x=>`<a class="archive-row" href="?date=${encodeURIComponent(x.date)}#news" data-date="${esc(x.date)}"><time>${esc(x.date.replaceAll('-','.'))}</time><span>${esc(x.title)}</span><b>↗</b></a>`).join('');window.pageBuilder.scan();}
async function loadDate(date, changeUrl=true) {
  if(!index.some(x=>x.date===date))return;
  $('#data-status').textContent='正在讀取刊期…';
  try {let d,live=true;try{d=await json('issues/'+date+'.json');}catch{live=false;d=await json('issues/'+date+'.json',false);}if(!Array.isArray(d.stories))throw Error('格式錯誤');render(d);$('#data-status').textContent=live?'已讀取 GitHub 刊期 '+date+' · 原有新聞內容，未另行重新查核。':'GitHub 暫時無法連線，目前顯示已保存刊期 '+date+'。';if(changeUrl){history.pushState(null,'','?date='+date+'#news');$('#news').scrollIntoView();}}catch{$('#data-status').textContent='此刊期暫時無法讀取，請稍後再試。';}
}
$('#archive-list').addEventListener('click',e=>{const a=e.target.closest('[data-date]');if(!a||e.metaKey||e.ctrlKey||e.shiftKey)return;e.preventDefault();loadDate(a.dataset.date);});
window.addEventListener('popstate',()=>{const date=new URLSearchParams(location.search).get('date')||index[0]?.date;if(date)loadDate(date,false);});
$('#skip-animation').addEventListener('click',()=>{window.pageBuilder.finishVisible();$('#news').scrollIntoView({behavior:'instant'});$('#search').focus({preventScroll:true});});
async function init(){
  try{index=await json('index.json',false);const date=new URLSearchParams(location.search).get('date');const initial=index.some(x=>x.date===date)?date:index[0].date;render(await json('issues/'+initial+'.json',false));archives();$('#data-status').textContent='已載入保存刊期，正在檢查 GitHub 最新資料…';
    try{const latest=await json('index.json');if(Array.isArray(latest)&&latest.length){index=latest;archives();await loadDate(date&&index.some(x=>x.date===date)?date:index[0].date,false);}}catch{$('#data-status').textContent='GitHub 暫時無法連線，目前顯示保存刊期 '+edition.date+'。';}
  }catch{$('#edition-intro').textContent='新聞暫時無法載入。請稍後重試，或到 GitHub 每日快報閱讀。';$('#data-status').innerHTML='<a href="https://harrylin0312.github.io/daily_brief/">前往每日快報原站 ↗</a>';}
  window.pageBuilder.scan();
}
init();
