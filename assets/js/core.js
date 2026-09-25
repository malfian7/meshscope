/* MeshScope · 1/3 — helpers, the sign-in mesh, route change and the
   live topology engine (nodes, wires, packets, pan/zoom, minimap).
   These three files share one global scope and must load in order:
   core.js → console.js → views.js  */
'use strict';
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b)=>a+Math.random()*(b-a);
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const svgNS='http://www.w3.org/2000/svg';
const mk=(t,cls)=>{const n=document.createElementNS(svgNS,t); if(cls)n.setAttribute('class',cls); return n;};
const el=(t,cls,html)=>{const n=document.createElement(t); if(cls)n.className=cls; if(html!=null)n.innerHTML=html; return n;};
const fmt=n=>n>=1000?(n/1000).toFixed(1)+'k':String(Math.round(n));

/* ============================================================
   1 · SIGN-IN: the mesh breathing behind the glass
   ============================================================ */
const cv=$('#meshCanvas'), cx=cv.getContext('2d');
let mesh={nodes:[],links:[],w:0,h:0,dpr:1};
function buildMesh(){
  const r=cv.getBoundingClientRect();
  mesh.dpr=Math.min(2,window.devicePixelRatio||1);
  mesh.w=r.width; mesh.h=r.height;
  cv.width=r.width*mesh.dpr; cv.height=r.height*mesh.dpr;
  cx.setTransform(mesh.dpr,0,0,mesh.dpr,0,0);
  const count=Math.round(clamp(r.width*r.height/26000,18,46));
  mesh.nodes=Array.from({length:count},()=>({
    x:rnd(0,r.width), y:rnd(0,r.height),
    vx:rnd(-.12,.12), vy:rnd(-.12,.12),
    r:rnd(1.2,2.9), hub:Math.random()<.16
  }));
  mesh.links=[];
  for(let i=0;i<mesh.nodes.length;i++)
    for(let j=i+1;j<mesh.nodes.length;j++){
      const a=mesh.nodes[i],b=mesh.nodes[j];
      if(Math.hypot(a.x-b.x,a.y-b.y)<190 && mesh.links.length<70)
        mesh.links.push({a,b,p:Math.random(),sp:rnd(.0016,.0055),on:Math.random()<.55});
    }
}
function drawMesh(){
  cx.clearRect(0,0,mesh.w,mesh.h);
  for(const l of mesh.links){
    const d=Math.hypot(l.a.x-l.b.x,l.a.y-l.b.y);
    if(d>210) continue;
    cx.strokeStyle=`rgba(47,99,245,${(1-d/210)*0.16})`;
    cx.lineWidth=1;
    cx.beginPath(); cx.moveTo(l.a.x,l.a.y); cx.lineTo(l.b.x,l.b.y); cx.stroke();
    if(l.on){
      const px=lerp(l.a.x,l.b.x,l.p), py=lerp(l.a.y,l.b.y,l.p);
      cx.fillStyle='rgba(47,99,245,.55)';
      cx.beginPath(); cx.arc(px,py,1.7,0,7); cx.fill();
    }
  }
  for(const n of mesh.nodes){
    cx.fillStyle=n.hub?'rgba(59,70,232,.42)':'rgba(47,99,245,.24)';
    cx.beginPath(); cx.arc(n.x,n.y,n.r,0,7); cx.fill();
    if(n.hub){ cx.strokeStyle='rgba(59,70,232,.18)'; cx.lineWidth=1;
      cx.beginPath(); cx.arc(n.x,n.y,n.r+5,0,7); cx.stroke(); }
  }
}
let meshRAF=0;
function stepMesh(){
  for(const n of mesh.nodes){
    n.x+=n.vx; n.y+=n.vy;
    if(n.x<-20)n.x=mesh.w+20; if(n.x>mesh.w+20)n.x=-20;
    if(n.y<-20)n.y=mesh.h+20; if(n.y>mesh.h+20)n.y=-20;
  }
  for(const l of mesh.links){ l.p+=l.sp; if(l.p>1)l.p=0; }
  drawMesh();
  meshRAF=requestAnimationFrame(stepMesh);
}
buildMesh(); drawMesh();
if(!REDUCED) meshRAF=requestAnimationFrame(stepMesh);
addEventListener('resize',()=>{ if(!$('#login').hidden){ buildMesh(); drawMesh(); } });

/* form behaviour */
const emailI=$('#email'), passI=$('#password');
[emailI,passI].forEach(i=>{
  const sync=()=>i.classList.toggle('filled', i.value.length>0);
  sync(); i.addEventListener('input',sync);
});
$('#peek').addEventListener('click',e=>{
  const b=e.currentTarget, on=b.getAttribute('aria-pressed')==='true';
  b.setAttribute('aria-pressed',String(!on));
  passI.type = on?'password':'text';
  $('#peekIcon').setAttribute('href', on?'#i-eye':'#i-eyeoff');
  b.setAttribute('aria-label', on?'Show password':'Hide password');
  passI.focus({preventScroll:true});
});
function bad(fieldId,msgId,on){
  $(fieldId).classList.toggle('bad',on);
  $(msgId).classList.toggle('show',on);
  if(on){ $(fieldId).style.animation='none'; void $(fieldId).offsetWidth; $(fieldId).style.animation=''; }
}
$('#loginForm').addEventListener('submit',e=>{
  e.preventDefault();
  const btn=$('#signIn');
  if(btn.dataset.state!=='idle') return;
  const okMail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailI.value.trim());
  const okPass=passI.value.length>=6;
  bad('#fEmail','#mEmail',!okMail);
  bad('#fPass','#mPass',!okPass);
  if(!okMail){ emailI.focus(); return; }
  if(!okPass){ passI.focus(); return; }
  btn.dataset.state='busy';
  setTimeout(()=>{ btn.dataset.state='done'; enterConsole(); },REDUCED?120:900);
});

/* ============================================================
   2 · ROUTE CHANGE — the chrome never blinks, the page does
   ============================================================ */
let consoleBooted=false;
function enterConsole(){
  const wait=REDUCED?40:420;
  setTimeout(()=>{
    const lb=$('#loadbar'); lb.classList.remove('run'); void lb.offsetWidth; lb.classList.add('run');
    $('#login').classList.add('leaving');
    setTimeout(()=>{
      cancelAnimationFrame(meshRAF); meshRAF=0;
      $('#login').hidden=true;
      $('#app').hidden=false;
      requestAnimationFrame(()=>{
        $('#app').classList.add('booted');
        if(!consoleBooted){ consoleBooted=true; bootConsole(); }
        else{ if(!REDUCED && !frame) loop(); resizeSoon(); }
      });
    },REDUCED?40:430);
  },wait);
}
function signOut(){
  const lb=$('#loadbar'); lb.classList.remove('run'); void lb.offsetWidth; lb.classList.add('run');
  cancelAnimationFrame(frame); frame=0;
  $('#app').classList.remove('booted');
  setTimeout(()=>{
    $('#app').hidden=true;
    $('#login').hidden=false;
    $('#login').classList.remove('leaving');
    const btn=$('#signIn'); btn.dataset.state='idle';
    passI.value=''; passI.classList.remove('filled');
    bad('#fPass','#mPass',false); bad('#fEmail','#mEmail',false);
    buildMesh(); drawMesh();
    if(!REDUCED){
      meshRAF=requestAnimationFrame(stepMesh);
      $$('.rise').forEach(n=>{n.style.animation='none';void n.offsetWidth;n.style.animation='';});
    }
  },REDUCED?30:260);
}

/* ============================================================
   3 · TOPOLOGY — the live map
   ============================================================ */
const WORLD={w:1160,h:352};
const nodes=[
  {id:'hub',  type:'hub',   x:612, y:4,   title:'mesh-gateway'},
  {id:'sdk',  type:'pill',  x:498, y:148, title:'sdkclient.eng', sub:'150 kbps', led:'#2fbf8f'},
  {id:'ssm',  type:'pill',  x:498, y:292, title:'aws-ssm.corp',  sub:'150 kbps', led:'#2f63f5'},
  {id:'gA',   type:'group', x:122, y:112, title:'Redis-Master',
    kids:[{t:'us-east-1b',v:150},{t:'us-east-1c',v:150}]},
  {id:'gB',   type:'group', x:742, y:108, title:'Redis-Replica',
    kids:[{t:'us-east-1b',v:150},{t:'us-east-1d',v:150}]},
  {id:'gC',   type:'group', x:1010,y:108, title:'Redis-Shard-3',
    kids:[{t:'us-west-2a',v:150},{t:'us-west-2c',v:150,down:true}]},
];
const edges=[
  {a:'gA', b:'sdk', kbps:23},
  {a:'gA', b:'ssm', kbps:23},
  {a:'sdk',b:'hub', kbps:0,  hot:true},
  {a:'sdk',b:'gB',  kbps:23},
  {a:'ssm',b:'gB',  kbps:5},
  {a:'ssm',b:'gC',  kbps:37, bow:34},
  {a:'hub',b:'gC',  kbps:13, bow:-60},
  {a:'gB', b:'gC',  kbps:77},
  {a:'gA', b:'gC',  kbps:120, bow:150},
];
const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
const nodesLayer=$('#nodes'), wiresSvg=$('#wires'), canvas=$('#canvas');

/* --- build node DOM --- */
function buildNodes(){
  nodes.forEach((n,i)=>{
    const wrap=el('div','node');
    wrap.dataset.id=n.id;
    wrap.style.left=n.x+'px'; wrap.style.top=n.y+'px';
    if(!REDUCED){ wrap.classList.add('node-in'); wrap.style.animationDelay=(.85+i*.07)+'s'; }

    if(n.type==='hub'){
      wrap.innerHTML=`<div class="hubnode" style="position:relative">
        <span class="hub-ring"></span><span class="hub-ring r2"></span>
        <svg class="hex" viewBox="0 0 46 52">
          <path class="body" d="M23 1.5 43.5 13v26L23 50.5 2.5 39V13z"/>
          <g fill="#fff" opacity=".95">
            <circle cx="23" cy="26" r="2.1"/>
            <circle cx="23" cy="18.5" r="1.4"/><circle cx="29.5" cy="22.2" r="1.4"/>
            <circle cx="29.5" cy="29.8" r="1.4"/><circle cx="23" cy="33.5" r="1.4"/>
            <circle cx="16.5" cy="29.8" r="1.4"/><circle cx="16.5" cy="22.2" r="1.4"/>
          </g>
        </svg></div>`;
    } else if(n.type==='pill'){
      wrap.innerHTML=`<div class="pill-n">
        <span class="leds" style="background:${n.led};box-shadow:0 0 0 3px rgba(255,255,255,.9)"></span>
        <button class="pin" data-pin aria-label="Expand ${n.title}">
          <svg viewBox="0 0 12 12"><path d="M6 2.2v7.6"/><path d="M2.2 6h7.6"/></svg>
        </button>
        <div style="min-width:0">
          <div class="t1">${n.title}</div>
          <div class="t2" data-rate>${n.sub}</div>
        </div></div>`;
    } else {
      const kids=n.kids.map((k,j)=>`
        <div class="kid${k.down?' down':''}">
          <button class="pin" aria-label="Inspect ${k.t}">
            <svg viewBox="0 0 12 12"><path d="M6 2.2v7.6"/><path d="M2.2 6h7.6"/></svg>
          </button>
          <div class="txt">
            <div class="t1">${k.t}</div>
            <div class="t2"><svg viewBox="0 0 8 8"><path d="M1.4 6.6 6.6 1.4M2.6 1.4h4v4"/></svg><span data-kid="${n.id}-${j}">${k.v} kbps</span></div>
          </div>
        </div>`).join('');
      wrap.innerHTML=`<div class="card-n">
        <div class="nhead">
          <button class="pin" data-collapse aria-label="Collapse ${n.title}" aria-expanded="true">
            <svg viewBox="0 0 12 12"><path class="vbar" d="M6 2.2v7.6"/><path d="M2.2 6h7.6"/></svg>
          </button>
          <span class="ntitle">${n.title}</span>
        </div>
        <div class="kids">${kids}</div>`;
    }
    nodesLayer.appendChild(wrap);
    n.node=wrap;
  });
  measure();
}
function measure(){
  nodes.forEach(n=>{ n.w=n.node.offsetWidth; n.h=n.node.offsetHeight; });
}

/* --- wires --- */
function anchors(a,b){
  const ac={x:a.x+a.w/2,y:a.y+a.h/2}, bc={x:b.x+b.w/2,y:b.y+b.h/2};
  const dx=bc.x-ac.x, dy=bc.y-ac.y;
  let p1,p2;
  if(Math.abs(dx)>Math.abs(dy)*0.7){
    p1={x:dx>0?a.x+a.w:a.x, y:ac.y};
    p2={x:dx>0?b.x:b.x+b.w, y:bc.y};
  }else{
    p1={x:ac.x, y:dy>0?a.y+a.h:a.y};
    p2={x:bc.x, y:dy>0?b.y:b.y+b.h};
  }
  return [p1,p2];
}
function pathD(e){
  const a=byId[e.a], b=byId[e.b];
  const [p1,p2]=anchors(a,b);
  const dx=p2.x-p1.x, dy=p2.y-p1.y;
  const bow=e.bow||0;
  const horiz=Math.abs(dx)>Math.abs(dy)*0.7;
  const k=clamp(Math.abs(horiz?dx:dy)*0.48,44,190);
  const c1 = horiz ? {x:p1.x+Math.sign(dx||1)*k, y:p1.y+bow} : {x:p1.x+bow, y:p1.y+Math.sign(dy||1)*k};
  const c2 = horiz ? {x:p2.x-Math.sign(dx||1)*k, y:p2.y+bow} : {x:p2.x+bow, y:p2.y-Math.sign(dy||1)*k};
  return `M${p1.x} ${p1.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
}
function buildWires(){
  edges.forEach((e,i)=>{
    const p=mk('path','wire'+(e.hot?' hot':''));
    p.setAttribute('d',pathD(e));
    wiresSvg.appendChild(p); e.path=p;

    const t=mk('text','wlabel');
    t.setAttribute('text-anchor','middle');
    t.textContent=e.kbps+' kbps';
    wiresSvg.appendChild(t); e.label=t;

    const n=e.kbps>60?3:e.kbps>15?2:1;
    e.pkts=Array.from({length:n},(_,j)=>{
      const c=mk('circle','pkt'+(e.hot?' hot':''));
      c.setAttribute('r', e.kbps>60?2.6:2.1);
      wiresSvg.appendChild(c);
      return {el:c, t:j/n, sp:clamp(.0016+e.kbps/26000,.0016,.0075)};
    });
    if(!REDUCED){
      const len=p.getTotalLength();
      p.style.setProperty('--len',len);
      p.classList.add('wire-draw');
      p.style.animationDelay=(.9+i*.06)+'s';
      e.pkts.forEach(pk=>{pk.el.style.opacity='0';});
      setTimeout(()=>e.pkts.forEach(pk=>{pk.el.style.transition='opacity .5s';pk.el.style.opacity='1';}),1500+i*60);
    }
  });
  layoutWires();
}
function layoutWires(){
  edges.forEach(e=>{
    e.path.setAttribute('d',pathD(e));
    e.len=e.path.getTotalLength();
    const mid=e.path.getPointAtLength(e.len*0.5);
    e.label.setAttribute('x',mid.x); e.label.setAttribute('y',mid.y-6);
  });
}
function stepPackets(){
  for(const e of edges){
    if(!e.len) continue;
    for(const pk of e.pkts){
      pk.t+= paused?0:pk.sp*speed;
      if(pk.t>1) pk.t-=1;
      const p=e.path.getPointAtLength(e.len*pk.t);
      pk.el.setAttribute('cx',p.x); pk.el.setAttribute('cy',p.y);
    }
  }
}

/* --- view transform: pan, zoom, minimap --- */
const view={x:60,y:30,s:1};
const world=$('#world'), gridBg=$('#gridBg');
function applyView(){
  world.style.transform=`translate3d(${view.x}px,${view.y}px,0) scale(${view.s})`;
  gridBg.style.backgroundSize=`${19*view.s}px ${19*view.s}px`;
  gridBg.style.backgroundPosition=`${view.x+200}px ${view.y+200}px`;
  $('#zoomVal').textContent=Math.round(view.s*100)+'%';
  drawMini();
}
function fitView(animate){
  const r=canvas.getBoundingClientRect();
  const s=clamp(Math.min((r.width-64)/WORLD.w,(r.height-120)/WORLD.h),.35,1.25);
  const tx=(r.width-WORLD.w*s)/2, ty=(r.height-WORLD.h*s)/2+14;
  animate?tweenView(tx,ty,s):(Object.assign(view,{x:tx,y:ty,s}),applyView());
}
let tw=null;
function tweenView(x,y,s){
  if(tw) cancelAnimationFrame(tw);
  const f={...view}, t0=performance.now(), dur=REDUCED?1:520;
  const run=now=>{
    const k=clamp((now-t0)/dur,0,1);
    const e=1-Math.pow(1-k,3);
    view.x=lerp(f.x,x,e); view.y=lerp(f.y,y,e); view.s=lerp(f.s,s,e);
    applyView();
    if(k<1) tw=requestAnimationFrame(run);
  };
  tw=requestAnimationFrame(run);
}
function zoomAt(px,py,factor){
  const s=clamp(view.s*factor,.35,2.2);
  const k=s/view.s;
  view.x=px-(px-view.x)*k; view.y=py-(py-view.y)*k; view.s=s;
  applyView();
}
canvas.addEventListener('wheel',e=>{
  if(!e.ctrlKey && Math.abs(e.deltaY)<2) return;
  e.preventDefault();
  const r=canvas.getBoundingClientRect();
  zoomAt(e.clientX-r.left, e.clientY-r.top, e.deltaY<0?1.09:1/1.09);
},{passive:false});
$('#zIn').addEventListener('click',()=>{const r=canvas.getBoundingClientRect();zoomAt(r.width/2,r.height/2,1.18)});
$('#zOut').addEventListener('click',()=>{const r=canvas.getBoundingClientRect();zoomAt(r.width/2,r.height/2,1/1.18)});
$('#resetBtn').addEventListener('click',()=>{
  if(layoutMode==='grid'){ setLayout('map'); return; }
  nodes.forEach(n=>{ if(n.home){ n.x=n.home.x; n.y=n.home.y; n.node.style.left=n.x+'px'; n.node.style.top=n.y+'px'; }});
  layoutWires(); fitView(true); toast('View reset to the saved layout');
});

/* pointer: pan canvas, drag nodes */
let drag=null;
canvas.addEventListener('pointerdown',e=>{
  if(e.target.closest('.canvas-bar,.minimap,.dock-toggle')) return;
  const nodeEl=e.target.closest('.node');
  if(e.target.closest('[data-collapse]')||e.target.closest('[data-pin]')) return;
  canvas.setPointerCapture(e.pointerId);
  if(nodeEl){
    const n=byId[nodeEl.dataset.id];
    drag={type:'node',n,sx:e.clientX,sy:e.clientY,ox:n.x,oy:n.y};
    nodeEl.classList.add('grabbed'); highlight(n.id,true);
  }else{
    drag={type:'pan',sx:e.clientX,sy:e.clientY,ox:view.x,oy:view.y};
    canvas.classList.add('dragging');
  }
});
canvas.addEventListener('pointermove',e=>{
  if(!drag) return;
  const dx=e.clientX-drag.sx, dy=e.clientY-drag.sy;
  if(drag.type==='pan'){ view.x=drag.ox+dx; view.y=drag.oy+dy; applyView(); }
  else{
    drag.n.x=drag.ox+dx/view.s; drag.n.y=drag.oy+dy/view.s;
    drag.n.node.style.left=drag.n.x+'px'; drag.n.node.style.top=drag.n.y+'px';
    layoutWires(); drawMini();
  }
});
const endDrag=()=>{
  if(!drag) return;
  if(drag.type==='node'){ drag.n.node.classList.remove('grabbed'); highlight(null); }
  canvas.classList.remove('dragging'); drag=null;
};
canvas.addEventListener('pointerup',endDrag);
canvas.addEventListener('pointercancel',endDrag);

/* One visibility state — hover, search and hop-depth all write here, so a
   hover can never wipe out an active filter. */
const vis={hover:null,keep:false,q:'',depth:2};
const hay=n=>(n.title+' '+(n.kids||[]).map(k=>k.t).join(' ')).toLowerCase();
function neighbours(id){
  const s=new Set([id]);
  edges.forEach(e=>{ if(e.a===id)s.add(e.b); if(e.b===id)s.add(e.a); });
  return s;
}
function hopDist(){
  const d={hub:0}, q=['hub'];
  while(q.length){ const c=q.shift();
    edges.forEach(e=>{ const nb=e.a===c?e.b:e.b===c?e.a:null;
      if(nb&&d[nb]===undefined){ d[nb]=d[c]+1; q.push(nb); } }); }
  return d;
}
function applyVis(){
  const dist=hopDist(), near=vis.hover?neighbours(vis.hover):null;
  const off={};
  nodes.forEach(n=>{
    off[n.id] = (vis.q && !hay(n).includes(vis.q)) ||
                ((dist[n.id]??9) > vis.depth) ||
                (!!near && !near.has(n.id));
    n.node.classList.toggle('ghost', off[n.id]);
    n.node.classList.toggle('sel', n.id===vis.hover && vis.keep);
  });
  edges.forEach(e=>{
    const live = !off[e.a] && !off[e.b];
    const onHover = vis.hover && (e.a===vis.hover||e.b===vis.hover);
    e.path.classList.toggle('lit', !!onHover && live && !e.hot);
    e.path.classList.toggle('dim', !live);
    e.label.classList.toggle('lit', !!onHover && live);
    e.label.style.opacity = live?1:.2;
  });
}
function highlight(id,keep){ vis.hover=id; vis.keep=!!keep; applyVis(); }
nodesLayer.addEventListener('pointerover',e=>{
  const n=e.target.closest('.node'); if(!n||drag) return; highlight(n.dataset.id);
});
nodesLayer.addEventListener('pointerout',e=>{
  if(drag) return;
  if(!e.relatedTarget||!e.relatedTarget.closest('.node')) highlight(null);
});

/* collapse a group — wires follow while it animates */
nodesLayer.addEventListener('click',e=>{
  const btn=e.target.closest('[data-collapse]');
  if(btn){
    const wrap=btn.closest('.node'), n=byId[wrap.dataset.id], kids=$('.kids',wrap);
    const open=!wrap.classList.contains('collapsed');
    kids.style.height=kids.scrollHeight+'px';
    requestAnimationFrame(()=>{
      wrap.classList.toggle('collapsed',open);
      btn.setAttribute('aria-expanded',String(!open));
      kids.style.height = open?'0px':kids.scrollHeight+'px';
      const t0=performance.now();
      const follow=()=>{ measure(); layoutWires(); drawMini();
        if(performance.now()-t0<460) requestAnimationFrame(follow);
        else if(!open) kids.style.height='auto'; };
      requestAnimationFrame(follow);
    });
    return;
  }
  const pin=e.target.closest('.pin');
  if(pin){ pin.animate([{transform:'scale(.85)'},{transform:'scale(1)'}],{duration:260,easing:'cubic-bezier(.34,1.42,.64,1)'}); }
});

/* search: dim what does not match */
$('#search').addEventListener('input',e=>{ vis.q=e.target.value.trim().toLowerCase(); applyVis(); });

/* minimap */
const miniPlot=$('#miniPlot'), miniVp=$('#miniVp');
const miniNodes=[];
function buildMini(){
  nodes.forEach(n=>{ const d=el('div','mini-node'+(n.type==='hub'?' hub':'')); miniPlot.appendChild(d); miniNodes.push(d); });
}
function drawMini(){
  const pr=miniPlot.getBoundingClientRect();
  const pad=4, sx=(pr.width-pad*2)/WORLD.w, sy=(pr.height-pad*2)/WORLD.h, s=Math.min(sx,sy);
  nodes.forEach((n,i)=>{
    const d=miniNodes[i]; if(!d) return;
    d.style.left=(pad+n.x*s)+'px'; d.style.top=(pad+n.y*s)+'px';
    d.style.width=Math.max(3,(n.w||60)*s)+'px'; d.style.height=Math.max(3,(n.h||40)*s)+'px';
  });
  const cr=canvas.getBoundingClientRect();
  const vw=cr.width/view.s, vh=cr.height/view.s;
  const vx=-view.x/view.s, vy=-view.y/view.s;
  const L=clamp(pad+vx*s,2,pr.width-8), T=clamp(pad+vy*s,2,pr.height-8);
  miniVp.style.left=L+'px'; miniVp.style.top=T+'px';
  miniVp.style.width=clamp(vw*s,6,pr.width-L-2)+'px';
  miniVp.style.height=clamp(vh*s,6,pr.height-T-2)+'px';
}
miniPlot.addEventListener('pointerdown',e=>{
  const move=ev=>{
    const pr=miniPlot.getBoundingClientRect();
    const pad=4, s=Math.min((pr.width-pad*2)/WORLD.w,(pr.height-pad*2)/WORLD.h);
    const wx=(ev.clientX-pr.left-pad)/s, wy=(ev.clientY-pr.top-pad)/s;
    const cr=canvas.getBoundingClientRect();
    view.x=cr.width/2-wx*view.s; view.y=cr.height/2-wy*view.s; applyView();
  };
  move(e);
  const up=()=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up)};
  addEventListener('pointermove',move); addEventListener('pointerup',up);
});
