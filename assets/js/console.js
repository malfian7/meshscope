/* MeshScope · 2/3 — time ribbon, throughput chart, service table,
   the dropdown engine, refresh choreography and map/grid layouts. */
'use strict';
/* ============================================================
   4 · TIME RIBBON
   ============================================================ */
const track=$('#track'), ticksBox=$('#ticks'), headEl=$('#head'), selEl=$('#sel'), timeTip=$('#timeTip');
const T0=12*60+30, T1=13*60+30;           // 12:30 → 13:30
let tStep=5, headPct=52, userMoved=false;
const TPAD=30;                                 /* keeps 12:30 and 13:30 off the rounded ends */
const tpos=p=>`calc(${TPAD}px + (100% - ${TPAD*2}px) * ${p/100})`;
const hhmm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(Math.round(m)%60).padStart(2,'0');
const evts=[{p:5,c:'#2fbf8f'},{p:13,c:'#ffab2e'},{p:21,c:'#2f63f5'},{p:29,c:'#ff4d78'},{p:36,c:'#2fbf8f'},
            {p:57,c:'#ff4d78'},{p:64,c:'#8b6cf0'},{p:72,c:'#ffab2e'},{p:81,c:'#46c2f0'},{p:92,c:'#2fbf8f'}];
function renderTicks(){
  ticksBox.innerHTML='';
  const span=T1-T0;
  /* thin the labels out until they stop colliding on narrow screens */
  const w=track.clientWidth||600;
  const ladder=[2,5,10,15,20,30];
  let step=tStep;
  for(const s of ladder){ if(s>=tStep && w*s/span>=52){ step=s; break; } step=30; }
  for(let m=T0;m<=T1;m+=step){
    const p=(m-T0)/span*100;
    const line=el('div','tick'); line.style.left=tpos(p); ticksBox.appendChild(line);
    const lab=el('div','tick-l',hhmm(m)); lab.style.left=tpos(p);
    if(!REDUCED){ lab.style.animation='dropIn .45s var(--out) backwards'; lab.style.animationDelay=(p*0.004)+'s'; }
    ticksBox.appendChild(lab);
  }
  evts.forEach((e,i)=>{
    const d=el('div','evt'+(REDUCED?'':' seen'));
    d.style.left=tpos(e.p); d.style.background=e.c; d.style.animationDelay=(.5+i*.05)+'s';
    d.title='Event at '+hhmm(T0+(T1-T0)*e.p/100);
    ticksBox.appendChild(d);
  });
  const b=el('div','badge-more','100+'); b.style.left=tpos(48); ticksBox.appendChild(b);
  [41,62].forEach(p=>{const br=el('div','brack');br.style.left=tpos(p);ticksBox.appendChild(br)});
  selEl.style.left=tpos(41); selEl.style.width=`calc((100% - ${TPAD*2}px) * .21)`;
  setHead(headPct);
}
function setHead(p){
  headPct=clamp(p,0,100);
  headEl.style.left=tpos(headPct);
  timeTip.style.left=tpos(headPct);
  timeTip.textContent=hhmm(T0+(T1-T0)*headPct/100);
  track.setAttribute('aria-valuenow',Math.round(headPct));
}
function trackPct(clientX){
  const r=track.getBoundingClientRect();
  return clamp((clientX-r.left-TPAD)/(r.width-TPAD*2)*100,0,100);
}
track.addEventListener('pointerdown',e=>{
  track.setPointerCapture(e.pointerId); setHead(trackPct(e.clientX)); playing=false; syncPlayBtn();
  const mv=ev=>setHead(trackPct(ev.clientX));
  const up=()=>{track.removeEventListener('pointermove',mv);track.removeEventListener('pointerup',up)};
  track.addEventListener('pointermove',mv); track.addEventListener('pointerup',up);
});
track.addEventListener('pointermove',e=>{ timeTip.style.left=tpos(trackPct(e.clientX));
  timeTip.textContent=hhmm(T0+(T1-T0)*trackPct(e.clientX)/100); });
track.addEventListener('pointerleave',()=>{ timeTip.style.left=tpos(headPct);
  timeTip.textContent=hhmm(T0+(T1-T0)*headPct/100); });
track.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'){setHead(headPct+1);e.preventDefault()}
  if(e.key==='ArrowLeft'){setHead(headPct-1);e.preventDefault()}
});
$('#tzIn').addEventListener('click',()=>{ tStep=tStep===10?5:tStep===5?2:2; renderTicks(); });
$('#tzOut').addEventListener('click',()=>{ tStep=tStep===2?5:10; renderTicks(); });

/* ============================================================
   5 · THROUGHPUT CHART
   ============================================================ */
const plot=$('#plot'), chartSvg=$('#chartSvg'), ctip=$('#ctip'), xaxis=$('#xaxis');
const BANDS=[{k:'low',fill:'url(#barLow)',name:'Low'},{k:'mid',fill:'url(#barMid)',name:'Medium'},{k:'high',fill:'url(#barHigh)',name:'High'}];
const hidden={low:false,mid:false,high:false};
let series=Array.from({length:16},(_,i)=>({
  t:T0+i*4, low:rnd(120,330), mid:rnd(60,190), high:rnd(40,210)
}));
let chartBuilt=false;
function renderChart(animate){
  const r=plot.getBoundingClientRect();
  const W=Math.max(120,r.width), H=Math.max(60,r.height);
  chartSvg.setAttribute('width',W); chartSvg.setAttribute('height',H);
  chartSvg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  chartSvg.innerHTML='';
  for(let i=0;i<4;i++){
    const g=mk('line','gl'); const y=H*(i/4)+2;
    g.setAttribute('x1',0);g.setAttribute('x2',W);g.setAttribute('y1',y);g.setAttribute('y2',y);
    chartSvg.appendChild(g);
  }
  const max=900, n=series.length, slot=W/n, bw=Math.min(9,slot*.52);
  series.forEach((d,i)=>{
    const g=mk('g','bcol'); g.dataset.i=i;
    let acc=0;
    BANDS.forEach(b=>{
      if(hidden[b.k]) return;
      const v=d[b.k]; const h=Math.max(2,v/max*(H-6));
      const rect=mk('rect','bar');
      rect.setAttribute('x',i*slot+slot/2-bw/2);
      rect.setAttribute('width',bw);
      rect.setAttribute('height',h);
      rect.setAttribute('y',H-acc-h);
      rect.setAttribute('rx',bw/2.6);
      rect.setAttribute('fill',b.fill);
      g.appendChild(rect);
      acc+=h+1.5;
    });
    chartSvg.appendChild(g);
    if(animate && !REDUCED){
      g.style.transformBox='fill-box'; g.style.transformOrigin='50% 100%';
      g.animate([{transform:'scaleY(0)',opacity:0},{transform:'scaleY(1)',opacity:1}],
        {duration:620,delay:900+i*34,easing:'cubic-bezier(.23,1,.32,1)',fill:'backwards'});
    }
  });
  if(!chartBuilt){
    xaxis.innerHTML='';
    [0,4,8,12,15].forEach(i=>xaxis.appendChild(el('span',null,hhmm(series[i].t))));
    chartBuilt=true;
  }
}
plot.addEventListener('pointermove',e=>{
  const r=plot.getBoundingClientRect();
  const slot=r.width/series.length;
  const i=clamp(Math.floor((e.clientX-r.left)/slot),0,series.length-1);
  const d=series[i];
  ctip.innerHTML=`<div><b>${hhmm(d.t)}</b> · ${Math.round(d.low+d.mid+d.high)} kbps</div>
    <div class="r"><i style="background:#ff4d78"></i>High <b>${Math.round(d.high)}</b></div>
    <div class="r"><i style="background:#ffab2e"></i>Medium <b>${Math.round(d.mid)}</b></div>
    <div class="r"><i style="background:#2f63f5"></i>Low <b>${Math.round(d.low)}</b></div>`;
  ctip.style.left=clamp(i*slot+slot/2,60,r.width-60)+'px';
  ctip.style.top=Math.max(0,r.height*0.1)+'px';
  ctip.classList.add('on');
  $$('.bcol',chartSvg).forEach((g,j)=>g.classList.toggle('mute',j!==i));
});
plot.addEventListener('pointerleave',()=>{
  ctip.classList.remove('on');
  $$('.bcol',chartSvg).forEach(g=>g.classList.remove('mute'));
});
$$('.lg').forEach(b=>b.addEventListener('click',()=>{
  const k=b.dataset.band==='high'?'high':b.dataset.band==='mid'?'mid':'low';
  hidden[k]=!hidden[k]; b.classList.toggle('off',hidden[k]); renderChart(false);
}));

/* ============================================================
   6 · SERVICE OVERVIEW
   ============================================================ */
let rows=[
  {on:true, c:'#2f63f5', name:'sdkclient-sip-proxy', to:'app.agent.datadog.com', st:'alert', cur:510},
  {on:true, c:'#2fbf8f', name:'sawmill.dev',          to:'sdkclient-sip-proxy.dev', st:'alert', cur:214},
  {on:true, c:'#ff4d78', name:'ad.au1.twilio.com',    to:'0-app.agent.datadog…',   st:'warm',  cur:127},
  {on:false,c:'#ffab2e', name:'sdkeng-client-sip',    to:'sdkeng-client-sip-proxy.dev', st:'warm', cur:83},
  {on:true, c:'#8b6cf0', name:'redis-master.eu-w1',   to:'redis-replica.eu-w1',    st:'ok',    cur:466},
  {on:true, c:'#46c2f0', name:'mesh-gateway',         to:'redis-shard-3.us-w2',    st:'ok',    cur:318},
];
let sortKey='cur', sortDir=-1;
const tbody=$('#tbody');
const STATUS={alert:'Alert',warm:'Warm',ok:'Nominal'};
function renderTable(animate){
  const sorted=[...rows].sort((a,b)=>{
    const va=a[sortKey], vb=b[sortKey];
    return (typeof va==='number'? va-vb : String(va).localeCompare(String(vb)))*sortDir;
  });
  tbody.innerHTML='';
  sorted.forEach((r,i)=>{
    const tr=el('tr');
    tr.innerHTML=`
      <td class="svc">
        <span class="cb" role="checkbox" tabindex="0" aria-checked="${r.on}" aria-label="Track ${r.name}">
          <svg viewBox="0 0 24 24"><use href="#i-check"/></svg></span>
        <span class="dash" style="background:${r.c}"></span>
        <span style="overflow:hidden;text-overflow:ellipsis">${r.name}</span>
      </td>
      <td class="hide-sm">${r.to}</td>
      <td><span class="status ${r.st}"><i></i>${STATUS[r.st]}</span></td>
      <td class="val" data-name="${r.name}">${Math.round(r.cur)}</td>`;
    tr.querySelector('.cb').addEventListener('click',ev=>{
      r.on=!r.on; ev.currentTarget.setAttribute('aria-checked',String(r.on));
    });
    tbody.appendChild(tr);
    if(animate && !REDUCED)
      tr.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],
        {duration:480,delay:1000+i*55,easing:'cubic-bezier(.23,1,.32,1)',fill:'backwards'});
  });
}
$$('th[data-sort]').forEach(th=>th.addEventListener('click',()=>{
  const k=th.dataset.sort==='name'?'name':th.dataset.sort==='to'?'to':th.dataset.sort==='status'?'st':'cur';
  if(sortKey===k) sortDir*=-1; else {sortKey=k; sortDir=k==='cur'?-1:1;}
  $$('th[data-sort]').forEach(o=>o.classList.remove('sorted','desc'));
  th.classList.add('sorted'); if(sortDir<0) th.classList.add('desc');
  renderTable(false);
}));

/* ============================================================
   7 · LIVE — numbers that move because data moved
   ============================================================ */
let paused=false, playing=true, speed=1;
function syncPlayBtn(){
  paused=!playing;
  $('#playBtn').dataset.playing=String(playing);
  $('#playIcon').setAttribute('href', playing?'#i-pause':'#i-play');
  $('#playBtn').setAttribute('aria-label', playing?'Pause live stream':'Resume live stream');
  $('#liveDot').className='dot '+(playing?'ok':'warm');
}
$('#playBtn').addEventListener('click',()=>{ playing=!playing; syncPlayBtn();
  toast(playing?'Live stream resumed':'Live stream paused'); });

function tickNumbers(){
  if(!playing) return;
  /* packets per second */
  const pps=$('#pps'); const base=2418+Math.round(rnd(-180,180));
  pps.textContent=base.toLocaleString('en-US').replace(/,/g,' ')+' pkt/s';
  /* per-edge rates */
  edges.forEach(e=>{
    if(e.kbps===0) return;
    const next=clamp(e.kbps+rnd(-3,3),1,999);
    e.kbps=next; e.label.textContent=Math.round(next)+' '+unitNow();
  });
  /* table currents */
  rows.forEach(r=>{
    const d=rnd(-24,24); const nv=clamp(r.cur+d,20,999);
    const cell=tbody.querySelector(`[data-name="${CSS.escape(r.name)}"]`);
    if(cell){
      cell.textContent=Math.round(nv);
      cell.classList.remove('up','down'); void cell.offsetWidth;
      cell.classList.add(nv>r.cur?'up':'down');
    }
    r.cur=nv;
  });
  /* group child rates */
  nodes.filter(n=>n.type==='group').forEach(n=>n.kids.forEach((k,j)=>{
    const s=n.node.querySelector(`[data-kid="${n.id}-${j}"]`);
    if(s){ k.v=Math.round(clamp(k.v+rnd(-6,6),40,400)); s.textContent=k.v+' kbps'; }
  }));
  /* legend totals */
  const tot=series.reduce((a,d)=>({h:a.h+d.high,m:a.m+d.mid,l:a.l+d.low}),{h:0,m:0,l:0});
  $('#lgHigh').textContent=fmt(tot.h/series.length*2.8);
  $('#lgMid').textContent=fmt(tot.m/series.length);
  $('#lgLow').textContent=fmt(tot.l*1.1);
}
function tickChart(){
  if(!playing) return;
  const last=series[series.length-1];
  series.push({t:last.t+4, low:clamp(last.low+rnd(-60,60),90,380), mid:clamp(last.mid+rnd(-40,40),40,230), high:clamp(last.high+rnd(-50,50),25,260)});
  series.shift();
  renderChart(false);
  const first=chartSvg.querySelector('.bcol:last-of-type');
  if(first && !REDUCED) first.animate([{opacity:0,transform:'translateX(10px)'},{opacity:1,transform:'none'}],
    {duration:520,easing:'cubic-bezier(.23,1,.32,1)'});
  if(!REDUCED){
    const a=$('#alertCount'); const v=clamp(+a.textContent+Math.round(rnd(-2,2)),38,68);
    a.textContent=v;
    a.animate([{transform:'translateY(-4px)',opacity:.4},{transform:'none',opacity:1}],{duration:420,easing:'cubic-bezier(.23,1,.32,1)'});
  }
}

/* counter for the alert card on first paint */
function countTo(node,to,dur){
  if(REDUCED){node.textContent=to;return}
  const t0=performance.now();
  const run=now=>{ const k=clamp((now-t0)/dur,0,1); const e=1-Math.pow(1-k,3);
    node.textContent=Math.round(to*e); if(k<1) requestAnimationFrame(run); };
  requestAnimationFrame(run);
}

/* ============================================================
   8 · MENUS — one popover engine, every dropdown speaks it
   ============================================================ */
let toastT=0;
function toast(msg){
  const t=$('#toast'); $('#toastText').textContent=msg;
  t.classList.add('on'); clearTimeout(toastT);
  toastT=setTimeout(()=>t.classList.remove('on'),2200);
}

let pop=null;
function closePop(focusBack){
  if(!pop) return;
  const {el:box,trigger}=pop; pop=null;
  trigger.setAttribute('aria-expanded','false');
  box.classList.remove('on');
  setTimeout(()=>box.remove(),200);
  document.removeEventListener('pointerdown',popOutside,true);
  document.removeEventListener('keydown',popKeys,true);
  if(focusBack) trigger.focus();
}
function popOutside(e){
  if(pop && !pop.el.contains(e.target) && !pop.trigger.contains(e.target)) closePop(false);
}
function popKeys(e){
  if(!pop) return;
  const items=[...pop.el.querySelectorAll('.mi')].filter(n=>n.offsetParent!==null);
  if(e.key==='Escape'){ e.preventDefault(); closePop(true); }
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    const i=items.indexOf(document.activeElement);
    const n=e.key==='ArrowDown' ? (i+1)%items.length : (i<=0?items.length-1:i-1);
    items[n]&&items[n].focus();
  }
  else if(e.key==='Tab'){ closePop(false); }
}
function placePop(box,trigger,align){
  const r=trigger.getBoundingClientRect();
  const w=box.offsetWidth, h=box.offsetHeight;
  let x = align==='right' ? r.right-w : r.left;
  x=clamp(x,10,innerWidth-w-10);
  let y=r.bottom+8, vo='top';
  if(y+h>innerHeight-10){ y=Math.max(10,r.top-h-8); vo='bottom'; }
  box.style.left=x+'px'; box.style.top=y+'px';
  box.style.transformOrigin=`${vo} ${align==='right'?'right':'left'}`;
}
function openPop(trigger,spec){
  const again = pop && pop.trigger===trigger;
  closePop(false);
  if(again) return;

  const box=el('div','pop');
  box.setAttribute('role','menu');
  if(spec.width) box.style.width=spec.width+'px';
  if(spec.title) box.appendChild(el('div','pop-h',spec.title));

  let searchInput=null;
  if(spec.search){
    const s=el('div','pop-search');
    s.innerHTML=`<svg class="ico"><use href="#i-search"/></svg><input type="text" placeholder="${spec.search}" aria-label="${spec.search}">`;
    box.appendChild(s); searchInput=s.querySelector('input');
  }
  const list=el('div','pop-list');
  box.appendChild(list);

  const rows=[];
  spec.items.forEach(it=>{
    if(it.type==='sep'){ list.appendChild(el('div','pop-sep')); return; }
    if(it.type==='head'){ list.appendChild(el('div','pop-h',it.label)); return; }
    const b=el('button','mi'); b.type='button';
    b.setAttribute('role', it.role==='check'?'menuitemcheckbox':it.role==='radio'?'menuitemradio':'menuitem');
    if(it.role) b.setAttribute('aria-checked',String(!!it.checked));
    if(it.disabled) b.setAttribute('aria-disabled','true');
    let lead='';
    if(it.role==='check') lead='<span class="m-box"><svg viewBox="0 0 24 24"><use href="#i-check"/></svg></span>';
    else if(it.dot) lead=`<span class="m-dot" style="background:${it.dot};box-shadow:0 0 0 3px ${it.dot}22"></span>`;
    else if(it.icon) lead=`<svg class="m-ico"><use href="#${it.icon}"/></svg>`;
    b.innerHTML = lead +
      `<span class="m-t">${it.label}${it.sub?`<span class="m-sub">${it.sub}</span>`:''}</span>` +
      (it.hint?`<span class="m-hint">${it.hint}</span>`:'') +
      (it.role==='radio'?'<svg class="m-mark" viewBox="0 0 24 24"><use href="#i-check"/></svg>':'');
    b.addEventListener('click',()=>{
      if(it.role==='check'){
        it.checked=!it.checked;
        b.setAttribute('aria-checked',String(it.checked));
        spec.onCheck && spec.onCheck(it,spec.items.filter(x=>x.role==='check'&&x.checked));
      }else{
        if(it.role==='radio') rows.forEach(r=>r.b.setAttribute('aria-checked',String(r.it===it)));
        spec.onPick && spec.onPick(it);
        closePop(false);
      }
    });
    rows.push({b,it});
    list.appendChild(b);
  });

  if(spec.footer){
    const f=el('div','pop-foot');
    spec.footer.forEach(fb=>{
      const b=el('button',fb.kind||'ghost',fb.label); b.type='button';
      b.addEventListener('click',()=>{ fb.onClick && fb.onClick(rows); if(fb.close!==false) closePop(false); });
      f.appendChild(b);
    });
    box.appendChild(f);
  }

  document.body.appendChild(box);
  placePop(box,trigger,spec.align||'left');
  pop={el:box,trigger,spec};
  trigger.setAttribute('aria-expanded','true');
  requestAnimationFrame(()=>box.classList.add('on'));
  if(!REDUCED) [...box.querySelectorAll('.mi')].forEach((m,i)=>{
    m.classList.add('mi-in'); m.style.animationDelay=(i*0.016)+'s';
  });
  if(searchInput){
    searchInput.addEventListener('input',()=>{
      const q=searchInput.value.trim().toLowerCase();
      rows.forEach(r=>{ r.b.style.display = r.it.label.toLowerCase().includes(q)?'':'none'; });
    });
    setTimeout(()=>searchInput.focus(),60);
  }else{
    const first=box.querySelector('.mi[aria-checked="true"]')||box.querySelector('.mi');
    setTimeout(()=>first&&first.focus(),60);
  }
  document.addEventListener('pointerdown',popOutside,true);
  document.addEventListener('keydown',popKeys,true);
}
const bind=(sel,spec)=>{ const t=$(sel); t.addEventListener('click',()=>openPop(t,typeof spec==='function'?spec():spec)); };
function bump(node){
  if(REDUCED) return;
  node.animate([{transform:'scale(1)'},{transform:'scale(1.3)'},{transform:'scale(1)'}],
    {duration:400,easing:'cubic-bezier(.34,1.42,.64,1)'});
}
function swap(node,text){
  node.textContent=text;
  if(!REDUCED) node.animate([{opacity:0,transform:'translateY(-5px)'},{opacity:1,transform:'none'}],
    {duration:320,easing:'cubic-bezier(.23,1,.32,1)'});
}

/* ---- interval / window ---- */
const winEnd=13*60+10;
const RANGES=[
  {v:'1m',  label:'Last 1 minute',  mins:1,    hint:'1s'},
  {v:'5m',  label:'Last 5 minutes', mins:40,   hint:'5s'},
  {v:'15m', label:'Last 15 minutes',mins:15,   hint:'10s'},
  {v:'1h',  label:'Last hour',      mins:60,   hint:'30s'},
  {v:'6h',  label:'Last 6 hours',   mins:360,  hint:'2m'},
  {v:'24h', label:'Last 24 hours',  mins:1440, hint:'10m'},
];
let rangeV='5m';
bind('#rangeBtn',()=>({
  title:'Quick ranges', width:246,
  items:[
    ...RANGES.map(r=>({label:r.label,role:'radio',checked:r.v===rangeV,hint:r.hint+' buckets',v:r.v,mins:r.mins})),
    {type:'sep'},
    {label:'Custom range…',icon:'i-cal'},
    {label:'Compare with yesterday',icon:'i-clock'},
  ],
  onPick(it){
    if(!it.v){ toast(it.label.replace('…','')+' — prototype'); return; }
    rangeV=it.v;
    swap($('#rangeLabel'), it.label.replace('Last ','last ').replace(' minutes',' min').replace(' minute',' min').replace(' hours',' h').replace(' hour',' h'));
    const s=((winEnd-it.mins)%1440+1440)%1440;
    swap($('#rangeWindow'), hhmm(s)+' – '+hhmm(winEnd));
    toast('Window set to '+it.label.toLowerCase());
  }
}));

/* ---- breakdown ---- */
const BREAKDOWNS=[
  {v:'szp',label:'Service › Zone › Pod', sub:'How traffic fans out across AZs'},
  {v:'sh', label:'Service › Host',       sub:'Per-instance throughput'},
  {v:'zsp',label:'Zone › Service › Pod', sub:'Start from the availability zone'},
  {v:'pc', label:'Pod › Container',      sub:'Deepest level, slowest query'},
  {v:'flat',label:'No breakdown',        sub:'One node per service'},
];
let breakdownV='szp';
bind('#breakdownBtn',()=>({
  title:'Group the topology by', width:268,
  items:BREAKDOWNS.map(b=>({label:b.label,sub:b.sub,role:'radio',checked:b.v===breakdownV,v:b.v})),
  onPick(it){ breakdownV=it.v; swap($('#breakdownLabel'),it.label); toast('Regrouped by '+it.label.toLowerCase()); }
}));

/* ---- filters ---- */
const FILTERS={
  service:{el:'#cService',label:'Services',search:'Search services',
    items:['sdkclient.eng','aws-ssm.corp','redis-master.eu-w1','redis-replica.eu-w1','redis-shard-3.us-w2','mesh-gateway','sawmill.dev','ad.au1.twilio.com'],
    on:['sdkclient.eng','aws-ssm.corp','redis-master.eu-w1']},
  zone:{el:'#cZone',label:'Zones',search:'Search zones',
    items:['eu-west-1a','eu-west-1b','eu-west-1c','us-east-1b','us-east-1c','us-east-1d','us-west-2a','us-west-2c'],
    on:['eu-west-1b','us-east-1c']},
  ip:{el:'#cIp',label:'IP ranges',search:null,
    items:['10.12.0.0/16','10.20.0.0/16','172.16.4.0/22','192.168.9.0/24'],
    on:['10.12.0.0/16']},
};
function filterSpec(key){
  const f=FILTERS[key];
  return {
    title:f.label, width:252, search:f.search||undefined,
    items:f.items.map(name=>({label:name,role:'check',checked:f.on.includes(name)})),
    onCheck(it,checked){
      f.on=checked.map(c=>c.label);
      const c=$(f.el); c.textContent=f.on.length; bump(c);
    },
    footer:[
      {label:'Clear',kind:'ghost',close:false,onClick(rows){
        rows.forEach(r=>{r.it.checked=false;r.b.setAttribute('aria-checked','false')});
        f.on=[]; const c=$(f.el); c.textContent='0'; bump(c);
      }},
      {label:'Apply',kind:'solid',onClick(){ toast(f.on.length+' '+f.label.toLowerCase()+' in filter'); }},
    ]
  };
}
bind('#fService',()=>filterSpec('service'));
bind('#fZone',()=>filterSpec('zone'));
bind('#fIp',()=>filterSpec('ip'));
bind('#fMore',{
  title:'Filter presets', width:238, align:'right',
  items:[
    {label:'Only alerting services',icon:'i-warn',sub:'2 services right now'},
    {label:'My team · payments',icon:'i-db',sub:'18 services'},
    {label:'Cross-zone traffic only',icon:'i-layers'},
    {type:'sep'},
    {label:'Clear all filters',icon:'i-reset'},
  ],
  onPick(it){
    if(it.label.startsWith('Clear')){
      Object.values(FILTERS).forEach(f=>{f.on=[];const c=$(f.el);c.textContent='0';bump(c)});
      toast('All filters cleared');
    } else toast('Preset applied · '+it.label);
  }
});

/* ---- save / load ---- */
bind('#loadBtn',{
  title:'Saved views', width:264, align:'right',
  items:[
    {label:'eu-west-1 / redis',icon:'i-mark2',sub:'you · edited 2h ago'},
    {label:'Payments golden path',icon:'i-mark2',sub:'rina · yesterday'},
    {label:'Cross-AZ replication',icon:'i-mark2',sub:'ops-team · 3d ago'},
    {type:'sep'},
    {label:'Browse all views…',icon:'i-book'},
    {label:'Import topology JSON',icon:'i-code'},
  ],
  onPick(it){ toast('Loaded “'+it.label.replace('…','')+'”'); }
});
bind('#saveBtn',{
  title:'This view', width:250, align:'right',
  items:[
    {label:'Save view',icon:'i-save',hint:'⌘S'},
    {label:'Save as new view…',icon:'i-mark2'},
    {type:'sep'},
    {label:'Export PNG',icon:'i-img'},
    {label:'Export topology JSON',icon:'i-code'},
    {label:'Copy share link',icon:'i-ext'},
  ],
  onPick(it){
    if(it.label==='Save view'){ nodes.forEach(n=>n.home={x:n.x,y:n.y}); toast('Layout saved to “eu-west-1 / redis”'); }
    else toast(it.label.replace('…','')+' — prototype');
  }
});

/* ---- metric ---- */
const METRICS=[
  {v:'throughput',label:'Throughput',unit:'kbps',hint:'kbps'},
  {v:'latency',   label:'Latency',   unit:'ms',  hint:'p95 ms'},
  {v:'errors',    label:'Error rate',unit:'err/min',hint:'err/min'},
  {v:'retries',   label:'Retries',   unit:'retry/min',hint:'retry/min'},
];
let metricV='throughput';
bind('#metricBtn',()=>({
  title:'Wire labels show', width:222,
  items:METRICS.map(m=>({label:m.label,role:'radio',checked:m.v===metricV,hint:m.hint,v:m.v,unit:m.unit})),
  onPick(it){
    metricV=it.v; swap($('#metricLabel'),it.label);
    edges.forEach(e=>{
      e.label.textContent=Math.round(e.kbps)+' '+it.unit;
      if(!REDUCED) e.label.animate([{opacity:0,transform:'translateY(-3px)'},{opacity:1,transform:'none'}],
        {duration:340,easing:'cubic-bezier(.23,1,.32,1)'});
    });
    toast('Wires now show '+it.label.toLowerCase());
  }
}));
const unitNow=()=>(METRICS.find(m=>m.v===metricV)||METRICS[0]).unit;

/* ---- sidebar: region, account, collapse ---- */
const REGIONS=[
  {v:'eu-west-1',label:'eu-west-1 · prod',sub:'222 services · 2 alerting',dot:'#ff4d78'},
  {v:'us-east-1',label:'us-east-1 · prod',sub:'164 services · 6 warming',dot:'#ffab2e'},
  {v:'ap-southeast-1',label:'ap-southeast-1 · prod',sub:'88 services · all nominal',dot:'#2fbf8f'},
  {v:'eu-west-1-stg',label:'eu-west-1 · staging',sub:'41 services · all nominal',dot:'#2fbf8f'},
];
let regionV='eu-west-1';
bind('#envBtn',()=>({
  title:'Switch region', width:250,
  items:REGIONS.map(r=>({label:r.label,sub:r.sub,dot:r.dot,role:'radio',checked:r.v===regionV,v:r.v})),
  onPick(it){
    regionV=it.v; swap($('#envName'),it.label);
    const s=$('#syncBtn'); s.classList.add('busy');
    setTimeout(()=>{ s.classList.remove('busy'); tickChart(); tickNumbers(); toast('Now watching '+it.label); },900);
  }
}));
bind('#userBtn',{
  title:'muhammad.alfian@pkp.co.id', width:240,
  items:[
    {label:'Profile & preferences',icon:'i-gear'},
    {label:'Notification routing',icon:'i-bell'},
    {label:'Keyboard shortcuts',icon:'i-code',hint:'?'},
    {type:'sep'},
    {label:'Sign out',icon:'i-logout'},
  ],
  onPick(it){ if(it.label==='Sign out') signOut(); else toast(it.label+' — prototype'); }
});

const root=document.documentElement;
function setSide(mode){
  root.dataset.side=mode;
  const mini=mode==='mini';
  $('#sideToggle').setAttribute('aria-expanded',String(!mini));
  $('#sideToggle').setAttribute('aria-label',mini?'Expand sidebar':'Collapse sidebar');
  resizeSoon(440);
}
$('#sideToggle').addEventListener('click',()=>{
  if(innerWidth<=860){ setSide(root.dataset.side==='open'?'':'open'); return; }
  setSide(root.dataset.side==='mini'?'':'mini');
});
$('#sideOpen').addEventListener('click',()=>setSide('open'));
$('#scrim').addEventListener('click',()=>setSide(''));
function resizeSoon(ms){
  setTimeout(()=>{
    if($('#app').hidden) return;
    renderTicks(); renderChart(false);
    if(!userMoved) fitView(true); else drawMini();
  },ms||60);
}

/* ---- the rest of the chrome ---- */
/* refresh: a scan sweeps the map, the wires redraw themselves, then the
   numbers land — so a click actually looks like a fetch. */
let refreshing=false;
function refreshPulse(){
  if(refreshing) return;
  refreshing=true;
  const b=$('#syncBtn'); b.classList.add('busy');
  const scan=$('#scan');
  if(!REDUCED){
    scan.classList.remove('run'); void scan.offsetWidth; scan.classList.add('run');
    edges.forEach((e,i)=>{
      e.path.style.setProperty('--len',e.path.getTotalLength());
      e.path.classList.remove('wire-draw'); void e.path.getBBox();
      e.path.style.animationDelay=(0.1+i*0.045)+'s';
      e.path.classList.add('wire-draw');
    });
    nodes.forEach((n,i)=>setTimeout(()=>{
      n.node.classList.remove('ping'); void n.node.offsetWidth; n.node.classList.add('ping');
    },150+i*55));
  }
  setTimeout(()=>{
    b.classList.remove('busy');
    scan.classList.remove('run');
    nodes.forEach(n=>n.node.classList.remove('ping'));
    tickChart(); tickNumbers();
    const a=$('#alertCount');
    countTo(a,clamp(+a.textContent+Math.round(rnd(-3,3)),38,68),520);
    toast('Collector flushed · 4s of fresh samples');
    refreshing=false;
  },REDUCED?120:1020);
}
$('#syncBtn').addEventListener('click',refreshPulse);
$('#editBtn').addEventListener('click',e=>{
  const on=e.currentTarget.getAttribute('aria-pressed')==='true';
  e.currentTarget.setAttribute('aria-pressed',String(!on));
  toast(on?'Edit mode off':'Edit mode on — drag any node to re-map');
});
function applyDepth(){ $('#depthVal').textContent=vis.depth; applyVis(); }
$('#depthUp').addEventListener('click',()=>{vis.depth=clamp(vis.depth+1,0,4);applyDepth()});
$('#depthDown').addEventListener('click',()=>{vis.depth=clamp(vis.depth-1,0,4);applyDepth()});
/* two ways to read the same mesh: follow the wires, or line the
   services up in rows and let the wires bend around them */
let layoutMode='map';
function gridPositions(){
  const order=[...nodes].sort((a,b)=>
    ({hub:0,group:1,pill:2}[a.type]) - ({hub:0,group:1,pill:2}[b.type]));
  const maxW=Math.max(...order.map(n=>n.w||130));
  const cols=clamp(Math.floor(WORLD.w/(maxW+62)),2,4);
  const colW=maxW+62, x0=(WORLD.w-cols*colW)/2;
  let y=16;
  for(let r=0;r*cols<order.length;r++){
    const row=order.slice(r*cols,(r+1)*cols);
    const rh=Math.max(...row.map(n=>n.h||60));
    row.forEach((n,c)=>{
      n.gx=Math.round(x0 + c*colW + (colW-(n.w||130))/2);
      n.gy=Math.round(y + (rh-(n.h||60))/2);          /* rows stay optically level */
    });
    y+=rh+46;
  }
}
function setLayout(mode){
  if(mode===layoutMode) return;
  layoutMode=mode;
  $('#vGrid').setAttribute('aria-pressed',String(mode==='map'));
  $('#vSplit').setAttribute('aria-pressed',String(mode==='grid'));
  if(mode==='grid') gridPositions();
  nodes.forEach((n,i)=>{
    if(!REDUCED) n.node.style.transition='left .62s var(--io) '+(i*0.03)+'s, top .62s var(--io) '+(i*0.03)+'s';
    n.x = mode==='grid' ? n.gx : (n.home?n.home.x:n.x);
    n.y = mode==='grid' ? n.gy : (n.home?n.home.y:n.y);
    n.node.style.left=n.x+'px'; n.node.style.top=n.y+'px';
  });
  wiresSvg.classList.toggle('grid-mode',mode==='grid');
  const t0=performance.now();
  const follow=()=>{
    layoutWires(); drawMini();
    if(performance.now()-t0<900) requestAnimationFrame(follow);
    else nodes.forEach(n=>n.node.style.transition='');
  };
  requestAnimationFrame(follow);
  userMoved=false;
  setTimeout(()=>fitView(true),160);
  toast(mode==='grid'?'Grid layout · services in rows':'Map layout · following the wires');
}
$('#vGrid').addEventListener('click',()=>setLayout('map'));
$('#vSplit').addEventListener('click',()=>setLayout('grid'));
$('#dockToggle').addEventListener('click',e=>{
  const open=e.currentTarget.getAttribute('aria-expanded')==='true';
  e.currentTarget.setAttribute('aria-expanded',String(!open));
  $('#dock').classList.toggle('closed',open);
  setTimeout(()=>{ if(!open) renderChart(false); fitView(true); },460);
});
const NAVROUTES=['topology','services','zones','traces','alerts','incidents','saved','runbooks','settings'];
$$('.nav-item').forEach((b,i)=>{
  b.dataset.route=NAVROUTES[i]||'topology';
  b.addEventListener('click',()=>{
    $$('.nav-item').forEach(o=>o.removeAttribute('aria-current'));
    b.setAttribute('aria-current','true');
    if(innerWidth<=860) setSide('');
    route(b.dataset.route);
  });
});
addEventListener('keydown',e=>{
  if($('#app').hidden||pop) return;
  if(e.key==='['){ e.preventDefault(); $('#sideToggle').click(); }
  if(e.key==='/' && document.activeElement!==$('#search')){ e.preventDefault(); $('#search').focus(); }
  if(e.key==='Escape' && document.activeElement===$('#search')){ $('#search').value=''; $('#search').dispatchEvent(new Event('input')); $('#search').blur(); }
  if(e.key===' ' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){ e.preventDefault(); $('#playBtn').click(); }
});

/* ============================================================
   9 · BOOT + FRAME LOOP
   ============================================================ */
let frame=0;
function loop(){
  stepPackets();
  frame=requestAnimationFrame(loop);
}
function bootConsole(){
  /* a narrow window gets the icon rail — the map needs the pixels more */
  if(innerWidth<1180 && innerWidth>860) setSide('mini');
  buildNodes(); buildWires(); buildMini(); applyVis();
  nodes.forEach(n=>n.home={x:n.x,y:n.y});
  fitView(false);
  renderTicks();
  renderChart(true);
  renderTable(true);
  syncPlayBtn();
  countTo($('#alertCount'),52,1400);
  drawMini();
  if(!REDUCED) loop(); else stepPackets();
  setInterval(tickNumbers,2200);
  setInterval(tickChart,3400);
  setTimeout(()=>toast('Live topology connected · eu-west-1'),1800);
}
['pointerdown','wheel'].forEach(ev=>canvas.addEventListener(ev,()=>{userMoved=true},{passive:true}));
let rz=0;
addEventListener('resize',()=>{
  clearTimeout(rz);
  rz=setTimeout(()=>{
    if($('#app').hidden) return;
    renderTicks(); renderChart(false);
    if(!userMoved) fitView(false); else drawMini();
  },140);
});
