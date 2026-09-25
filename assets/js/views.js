/* MeshScope · 3/3 — the router plus every page behind the sidebar:
   services, zones, traces, alerts, incidents, saved views,
   runbooks and settings. */
'use strict';
/* ============================================================
   10 · THE OTHER ROUTES
   Every sidebar entry opens a real page. Each one is built the
   first time it is visited, then kept.
   ============================================================ */
const BARE=new Set(['saved','runbooks','settings']);
const mainEl=$('.main');

function stagRows(scope){
  if(REDUCED) return;
  [...scope.querySelectorAll('[data-stag]')].forEach((r,i)=>
    r.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],
      {duration:460,delay:Math.min(i*26,440),easing:'cubic-bezier(.23,1,.32,1)',fill:'backwards'}));
}
function page(title,sub,actions,body,tall){
  return `<div class="page${tall===true?' tall':tall==='tight'?' tight':''}">
    <div class="phdr" data-stag>
      <div><h2>${title}</h2><p class="sub">${sub}</p></div>
      <span class="sp"></span>${actions||''}
    </div>${body}</div>`;
}
function spark(vals,color){
  const mx=Math.max(...vals), mn=Math.min(...vals);
  const pts=vals.map((v,i)=>`${(i/(vals.length-1)*62).toFixed(1)},${(16-((v-mn)/((mx-mn)||1))*13).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 62 18" aria-hidden="true"><polyline points="${pts}" stroke="${color}"/></svg>`;
}
const walk=(n,base,amp)=>{let v=base;return Array.from({length:n},()=>{v=clamp(v+rnd(-amp,amp),base*.4,base*1.8);return v})};
const STCOL={ok:'#2fbf8f',warm:'#ffab2e',alert:'#ff4d78'};
const pill=st=>`<span class="status ${st}"><i></i>${{ok:'Nominal',warm:'Warm',alert:'Alert'}[st]}</span>`;

function route(name){
  const view=$('#v-'+name); if(!view) return;
  $$('.view').forEach(v=>v.classList.toggle('on',v===view));
  $('#app').dataset.route=name;
  mainEl.classList.toggle('bare',BARE.has(name));
  $$('.nav-item').forEach(b=>b.setAttribute('aria-current',String(b.dataset.route===name)));
  if(!view.dataset.built && BUILD[name]){ BUILD[name](view); view.dataset.built='1'; }
  stagRows(view);
  if(name==='topology') resizeSoon(80);
}

/* ---------- services ---------- */
const SVC=[
  'mesh-gateway','sdkclient.eng','aws-ssm.corp','redis-master.eu-w1','redis-replica.eu-w1',
  'redis-shard-3.us-w2','sawmill.dev','ad.au1.twilio.com','billing-api','billing-worker',
  'checkout-web','checkout-bff','identity-idp','identity-session','ledger-core','ledger-reconcile',
  'notify-dispatch','notify-render','search-index','search-query','media-thumbs','media-upload',
  'pricing-rules','fraud-score'
].map((n,i)=>{
  const st = i===1?'alert' : i===6?'alert' : (i%7===3?'warm':'ok');
  return {n, zone:['eu-west-1a','eu-west-1b','eu-west-1c','us-east-1b','us-east-1c','us-west-2a'][i%6],
    st, p95:Math.round(rnd(8,240)), thr:Math.round(rnd(40,940)), err:+(rnd(0,3.4)).toFixed(2),
    owner:['payments','platform','growth','core','media'][i%5], s:walk(12,rnd(60,300),40)};
});
const BUILD_services=view=>{
  const n=c=>SVC.filter(s=>s.st===c).length;
  const body=`
  <div class="tiles">
    <div class="tile" data-stag><div class="k"><span class="dot" style="background:var(--packet)"></span>Services</div>
      <div class="v">${SVC.length}</div><div class="d">across 6 zones · 2 regions</div></div>
    <div class="tile" data-stag><div class="k"><span class="dot ok"></span>Nominal</div>
      <div class="v">${n('ok')}</div><div class="d"><b>+3</b> since last hour</div></div>
    <div class="tile" data-stag><div class="k"><span class="dot warm"></span>Warming</div>
      <div class="v">${n('warm')}</div><div class="d">p95 above budget</div></div>
    <div class="tile" data-stag><div class="k"><span class="dot alert"></span>Alerting</div>
      <div class="v">${n('alert')}</div><div class="d"><b class="bad">2 pages</b> sent to you</div></div>
  </div>
  <div class="card" data-stag>
    <div class="card-h"><h3>All services</h3><span class="sp"></span>
      <span class="m" id="svcCount">${SVC.length} shown</span></div>
    <table class="dtable"><thead><tr>
      <th>Service</th><th>Zone</th><th>Status</th><th style="text-align:right">p95</th>
      <th style="text-align:right">Throughput</th><th>Last 60 min</th><th class="hide-md">Owner</th>
    </tr></thead><tbody id="svcBody"></tbody></table>
  </div>`;
  const actions=`<div class="search" style="width:210px"><svg class="ico"><use href="#i-search"/></svg>
      <input id="svcSearch" type="search" placeholder="Filter services" aria-label="Filter services"></div>
    <div class="seg" id="svcSeg">
      <button aria-pressed="true" data-f="all">All</button>
      <button aria-pressed="false" data-f="alert">Alerting</button>
      <button aria-pressed="false" data-f="warm">Warming</button>
    </div>`;
  view.innerHTML=page('Services','Every service the collector has seen in the last 30 days.',actions,body);

  let filter='all', q='';
  const draw=()=>{
    const list=SVC.filter(s=>(filter==='all'||s.st===filter) && (!q||s.n.includes(q)||s.owner.includes(q)));
    $('#svcBody',view).innerHTML=list.map(s=>`
      <tr data-svc="${s.n}">
        <td class="nm"><span class="dash" style="background:${STCOL[s.st]}"></span>${s.n}</td>
        <td><span class="tag">${s.zone}</span></td>
        <td>${pill(s.st)}</td>
        <td class="mono" style="text-align:right">${s.p95} ms</td>
        <td class="mono" style="text-align:right">${s.thr} kbps</td>
        <td>${spark(s.s,STCOL[s.st])}</td>
        <td class="hide-md">${s.owner}</td>
      </tr>`).join('');
    $('#svcCount',view).textContent=list.length+' shown';
    $$('#svcBody tr',view).forEach(tr=>tr.addEventListener('click',()=>{
      const name=tr.dataset.svc;
      route('topology');
      $$('.nav-item').forEach(b=>b.setAttribute('aria-current',String(b.dataset.route==='topology')));
      const term=name.split(/[.-]/)[0];
      $('#search').value=term; vis.q=term.toLowerCase(); applyVis();
      toast('Tracing '+name+' on the map');
    }));
  };
  draw();
  $('#svcSearch',view).addEventListener('input',e=>{q=e.target.value.trim().toLowerCase();draw()});
  $$('#svcSeg button',view).forEach(b=>b.addEventListener('click',()=>{
    $$('#svcSeg button',view).forEach(o=>o.setAttribute('aria-pressed','false'));
    b.setAttribute('aria-pressed','true'); filter=b.dataset.f; draw();
  }));
};


/* ---------- a small modal, used wherever a page needs a form ---------- */
let modalEl=null, modalScrim=null;
function modalKeys(e){ if(e.key==='Escape'){ e.preventDefault(); closeModal(); } }
function closeModal(){
  if(!modalEl) return;
  const m=modalEl, s=modalScrim; modalEl=modalScrim=null;
  m.classList.remove('on'); s.classList.remove('on');
  setTimeout(()=>{ m.remove(); s.remove(); },REDUCED?10:280);
  document.removeEventListener('keydown',modalKeys,true);
}
function openModal(spec){
  closeModal();
  const s=el('div','scrim2'), m=el('div','modal');
  m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true');
  m.innerHTML=`<h3>${spec.title}</h3><p class="sub">${spec.sub||''}</p>${spec.body}
    <div class="mfoot">${spec.actions.map((a,i)=>
      `<button class="btn-s${a.solid?' solid':''}" data-a="${i}">${a.label}</button>`).join('')}</div>`;
  document.body.append(s,m);
  requestAnimationFrame(()=>{ s.classList.add('on'); m.classList.add('on'); });
  s.addEventListener('click',closeModal);
  $$('[data-a]',m).forEach(b=>b.addEventListener('click',()=>{
    const a=spec.actions[+b.dataset.a];
    if(a.run && a.run(m)===false) return;
    closeModal();
  }));
  $$('.mcheck',m).forEach(c=>c.addEventListener('click',()=>
    c.setAttribute('aria-checked',String(c.getAttribute('aria-checked')!=='true'))));
  $$('.seg.two',m).forEach(seg=>$$('button',seg).forEach(b=>b.addEventListener('click',()=>{
    $$('button',seg).forEach(o=>o.setAttribute('aria-pressed','false'));
    b.setAttribute('aria-pressed','true');
  })));
  document.addEventListener('keydown',modalKeys,true);
  setTimeout(()=>{ const f=m.querySelector('input,textarea'); f&&f.focus(); },90);
  modalEl=m; modalScrim=s;
  return m;
}
const mcheck=(k,label,desc,on)=>`
  <button class="mcheck" role="checkbox" aria-checked="${on}" data-k="${k}">
    <span class="m-box"><svg viewBox="0 0 24 24"><use href="#i-check"/></svg></span>
    <span><span>${label}</span><span class="d">${desc}</span></span></button>`;

/* ---------- zones ---------- */
const ZONES=[
  {z:'eu-west-1a',r:'Ireland',svc:41,cap:64,i:412,o:388,p95:22,st:'ok'},
  {z:'eu-west-1b',r:'Ireland',svc:38,cap:71,i:377,o:401,p95:26,st:'ok'},
  {z:'eu-west-1c',r:'Ireland',svc:35,cap:88,i:455,o:430,p95:61,st:'warm'},
  {z:'us-east-1b',r:'N. Virginia',svc:29,cap:52,i:288,o:266,p95:18,st:'ok'},
  {z:'us-east-1c',r:'N. Virginia',svc:27,cap:94,i:512,o:498,p95:143,st:'alert'},
  {z:'us-east-1d',r:'N. Virginia',svc:22,cap:47,i:204,o:198,p95:20,st:'ok'},
  {z:'us-west-2a',r:'Oregon',svc:18,cap:58,i:176,o:180,p95:31,st:'ok'},
  {z:'us-west-2c',r:'Oregon',svc:12,cap:79,i:150,o:143,p95:77,st:'warm'},
];
const zgrad=c=>c>90?'linear-gradient(90deg,#ff7a9c,#ff4d78)'
  :c>75?'linear-gradient(90deg,#ffc061,#ffab2e)':'linear-gradient(90deg,#5c8aff,#2f63f5)';
const zlat=v=>v>100?'var(--alert)':v>50?'var(--warm)':'var(--ink-1)';
const BUILD_zones=view=>{
  const card=z=>`
    <div class="card zcard" data-stag data-zone="${z.z}">
      <div class="zt"><span class="dot ${z.st}"></span>${z.z}<span class="zs">${pill(z.st)}</span></div>
      <div class="kv" style="margin-top:8px"><span>${z.r}</span><span><b>${z.svc}</b> services</span></div>
      <div class="meter"><i style="width:${z.cap}%;background:${zgrad(z.cap)}"></i></div>
      <div class="kv"><span>Capacity</span><b>${z.cap}%</b></div>
      <div class="kv"><span>In / out</span><b>${z.i} / ${z.o} kbps</b></div>
      <div class="kv"><span>p95 latency</span><b style="color:${zlat(z.p95)}">${z.p95} ms</b></div>
    </div>`;
  const row=(z,i)=>`
    <div class="card zrow" data-stag data-zone="${z.z}">
      <span class="rank">${i+1}</span>
      <span class="zn">${z.z}</span>
      <span class="zr">${z.r}</span>
      <span class="zbar"><span class="meter"><i style="width:${z.cap}%;background:${zgrad(z.cap)}"></i></span></span>
      <span class="zv" style="color:${z.cap>90?'var(--alert)':z.cap>75?'#c07a06':'var(--ink-1)'}">${z.cap}%</span>
      <span class="zx">${z.i}/${z.o} kbps · p95 ${z.p95}ms</span>
      ${pill(z.st)}
    </div>`;
  view.innerHTML=page('Zones','Capacity and cross-zone traffic for every availability zone.',
    `<div class="seg" id="zSeg">
       <button aria-pressed="true" data-m="region">By region</button>
       <button aria-pressed="false" data-m="load">By load</button>
     </div>`,
    `<div id="zBody"></div>`);
  const body=$('#zBody',view);
  const bind=()=>$$('[data-zone]',body).forEach(c=>
    c.addEventListener('click',()=>toast('Opening zone detail · '+c.dataset.zone)));
  const draw=m=>{
    if(m==='region'){
      body.innerHTML=[...new Set(ZONES.map(z=>z.r))].map(r=>{
        const list=ZONES.filter(z=>z.r===r);
        const bad=list.filter(z=>z.st!=='ok').length;
        return `<div class="glab" data-stag>${r} · ${list.length} zones${
          bad?` · <span style="color:var(--alert);text-transform:none;letter-spacing:0">${bad} need a look</span>`:''}</div>
          <div class="zgrid" style="margin-bottom:8px">${list.map(card).join('')}</div>`;
      }).join('');
    }else{
      const list=[...ZONES].sort((a,b)=>b.cap-a.cap);
      const over=list.filter(z=>z.cap>75).length;
      body.innerHTML=`<div class="glab" data-stag>Busiest first · ${over} zones above 75% capacity</div>
        <div class="zrank">${list.map(row).join('')}</div>`;
    }
    bind(); stagRows(body);
  };
  draw('region');
  $$('#zSeg button',view).forEach(b=>b.addEventListener('click',()=>{
    $$('#zSeg button',view).forEach(o=>o.setAttribute('aria-pressed','false'));
    b.setAttribute('aria-pressed','true'); draw(b.dataset.m);
  }));
};

/* ---------- traces ---------- */
const TRACES=Array.from({length:11},(_,i)=>{
  const dur=Math.round(rnd(48,1240));
  const st=i===0?'alert':i===3?'warm':i===7?'alert':'ok';
  const names=['checkout-bff · POST /orders','identity-idp · GET /session','ledger-core · commit',
    'search-query · q=shoes','billing-api · POST /charge','notify-dispatch · send',
    'media-upload · PUT /asset','pricing-rules · evaluate','fraud-score · score',
    'redis-master · MGET','mesh-gateway · route'];
  let t=0;
  const spans=Array.from({length:Math.round(rnd(5,8))},(_,j)=>{
    const d=Math.round(dur*rnd(.06,.3)); const s=t; t=Math.min(dur-d, t+Math.round(d*rnd(.3,.9)));
    return {n:['gateway','auth','redis-get','postgres','kafka-publish','render','s3-put','http-out'][j%8],
      s, d, st:(st!=='ok'&&j===2)?st:'ok'};
  });
  return {id:'7f'+(1000+i*137).toString(16)+'c2a', n:names[i], dur, st, agoS:Math.round(rnd(2,58)), spans};
});
const BUILD_traces=view=>{
  view.innerHTML=page('Traces','Sampled requests. Pick one to see where the time went.',
    `<div class="seg" id="trSeg">
       <button aria-pressed="true" data-s="slow">Slowest</button>
       <button aria-pressed="false" data-s="new">Newest</button>
       <button aria-pressed="false" data-s="err">Errors</button>
     </div>`,
    `<div class="split">
      <div class="card"><div class="card-h"><h3>Recent traces</h3><span class="sp"></span>
        <span class="m" id="trCount">${TRACES.length}</span></div>
        <div class="scroll" id="trList"></div></div>
      <div class="card"><div class="card-h"><h3 id="wfTitle">—</h3><span class="sp"></span>
        <span class="m" id="wfMeta"></span></div>
        <div class="wf" id="wf"></div></div>
     </div>`,true);
  const list=$('#trList',view);
  let mode='slow';
  const pick=()=>{
    let l=[...TRACES];
    if(mode==='slow') l.sort((a,b)=>b.dur-a.dur);
    else if(mode==='new') l.sort((a,b)=>a.agoS-b.agoS);
    else l=l.filter(t=>t.st!=='ok').sort((a,b)=>b.dur-a.dur);
    return l;
  };
  const drawWf=t=>{
    $('#wfTitle',view).textContent=t?t.n:'—';
    $('#wfMeta',view).textContent=t?(t.spans.length+' spans · '+t.dur+' ms total'):'';
    $('#wf',view).innerHTML=t?t.spans.map((s,j)=>`
      <div class="wf-row">
        <span class="wf-n">${s.n}</span>
        <span class="wf-bar"><i style="left:${s.s/t.dur*100}%;width:${Math.max(2,s.d/t.dur*100)}%;
          background:${s.st==='ok'?'linear-gradient(90deg,#5c8aff,#2f63f5)'
            :s.st==='warm'?'linear-gradient(90deg,#ffc061,#ffab2e)':'linear-gradient(90deg,#ff7a9c,#ff4d78)'};
          animation-delay:${j*0.05}s"></i></span>
        <span class="wf-d">${s.d}ms</span>
      </div>`).join(''):'';
  };
  const drawList=()=>{
    const l=pick();
    $('#trCount',view).textContent=l.length;
    if(!l.length){
      list.innerHTML=`<div class="empty" data-stag>
        <svg class="ico" style="width:20px;height:20px;stroke:var(--nominal);margin-bottom:8px"><use href="#i-check"/></svg>
        <div>No failing traces in this window.</div>
        <div style="color:var(--ink-4);margin-top:4px">Every sampled request came back clean.</div></div>`;
      drawWf(null); return;
    }
    list.innerHTML=l.map((t,i)=>`
      <button class="trow" data-id="${t.id}" aria-selected="${i===0}" data-stag>
        <span class="dot ${t.st}"></span>
        <span class="tb"><span class="t1">${t.n}</span>
          <span class="t2">${t.id} · ${t.agoS}s ago</span></span>
        <span class="t3">${t.dur}ms</span>
      </button>`).join('');
    $$('.trow',list).forEach(b=>b.addEventListener('click',()=>{
      $$('.trow',list).forEach(o=>o.setAttribute('aria-selected','false'));
      b.setAttribute('aria-selected','true');
      drawWf(TRACES.find(t=>t.id===b.dataset.id));
    }));
    drawWf(l[0]);
    stagRows(list);
  };
  drawList();
  $$('#trSeg button',view).forEach(b=>b.addEventListener('click',()=>{
    $$('#trSeg button',view).forEach(o=>o.setAttribute('aria-pressed','false'));
    b.setAttribute('aria-pressed','true'); mode=b.dataset.s; drawList();
  }));
};

/* ---------- alerts ---------- */
const ALERTS=[
  {st:'alert',t:'sdkclient.eng is dropping every packet to mesh-gateway',svc:'sdkclient.eng',since:'6m',rule:'throughput == 0 for 5m',s:walk(14,40,30)},
  {st:'alert',t:'sawmill.dev error rate above 5%',svc:'sawmill.dev',since:'18m',rule:'errors > 5% for 10m',s:walk(14,120,60)},
  {st:'warm',t:'us-east-1c p95 latency above budget',svc:'zone us-east-1c',since:'42m',rule:'p95 > 120ms for 15m',s:walk(14,140,40)},
  {st:'warm',t:'redis-shard-3 replication lag climbing',svc:'redis-shard-3.us-w2',since:'1h 04m',rule:'lag > 2s',s:walk(14,90,35)},
  {st:'ok',t:'checkout-bff recovered',svc:'checkout-bff',since:'2h 11m',rule:'auto-resolved',s:walk(14,200,50)},
  {st:'ok',t:'media-upload queue drained',svc:'media-upload',since:'3h 48m',rule:'auto-resolved',s:walk(14,180,60)},
];
const BUILD_alerts=view=>{
  const group=(label,list)=>list.length?`<div class="glab" data-stag>${label}</div>
    <div class="alist">${list.map(a=>`
      <div class="card arow ${a.st}" data-stag data-alert="${a.svc}">
        <div class="bd">
          <h4>${a.t}</h4>
          <div class="meta"><span>${a.svc}</span><span>firing <b>${a.since}</b></span><span class="tag">${a.rule}</span></div>
        </div>
        ${spark(a.s,STCOL[a.st])}
        ${a.st==='ok'
          ? `<button class="btn-s post">Read the write-up</button>`
          : `<button class="btn-s ack">Acknowledge</button>
             <button class="btn-s solid sil">Silence 1h</button>`}
      </div>`).join('')}</div>`:'';
  view.innerHTML=page('Alerts','Two rules are firing right now. Acknowledging stops the paging, not the rule.',
    `<button class="pill-btn" id="alertRules"><svg class="ico"><use href="#i-sliders"/></svg> Rules <svg class="chev" style="width:11px;height:11px"><use href="#i-chev"/></svg></button>`,
    group('Firing',ALERTS.filter(a=>a.st==='alert'))+
    group('Warming',ALERTS.filter(a=>a.st==='warm'))+
    group('Resolved today',ALERTS.filter(a=>a.st==='ok')));
  $$('.arow',view).forEach(rowEl=>{
    const post=$('.post',rowEl);
    if(post){ post.addEventListener('click',()=>{ route('incidents');
      $$('.nav-item').forEach(b=>b.setAttribute('aria-current',String(b.dataset.route==='incidents')));
      toast('Opening the incident write-up'); }); return; }
    $('.ack',rowEl).addEventListener('click',()=>{
      rowEl.classList.add('gone');
      setTimeout(()=>rowEl.remove(),REDUCED?10:430);
      toast('Acknowledged · '+rowEl.dataset.alert);
    });
    $('.sil',rowEl).addEventListener('click',()=>toast('Silenced for 1 hour · '+rowEl.dataset.alert));
  });
  const rulesBtn=$('#alertRules',view);
  rulesBtn.addEventListener('click',()=>openPop(rulesBtn,{
    title:'Alert rules', width:240, align:'right',
    items:[{label:'Throughput drops to zero',sub:'2 services matched',icon:'i-pulse'},
           {label:'Error rate over 5%',sub:'1 service matched',icon:'i-warn'},
           {label:'p95 over budget',sub:'3 zones matched',icon:'i-clock'},
           {type:'sep'},{label:'New rule…',icon:'i-plus'}],
    onPick:it=>toast(it.label.replace('…','')+' — prototype')
  }));
};

/* ---------- incidents ---------- */
const INCIDENTS=[
  {sev:'SEV-1',st:'alert',t:'Packet loss between sdkclient.eng and the gateway',dur:'6m',open:true,who:['MA','RN'],
   ev:[['12:52','Collector saw throughput fall to 0 kbps'],['12:53','Page sent to on-call (you)'],['12:55','Rolled back sidecar 1.14.2'],['12:58','Traffic recovering on 1 of 2 paths']]},
  {sev:'SEV-2',st:'alert',t:'sawmill.dev returning 502 for 5% of calls',dur:'18m',open:true,who:['RN'],
   ev:[['12:40','Error budget burn rate ×14'],['12:44','Suspect: connection pool exhausted'],['12:51','Pool raised 40 → 120']]},
  {sev:'SEV-3',st:'warm',t:'Cross-AZ replication lag in us-east-1c',dur:'42m',open:true,who:['OP','MA'],
   ev:[['12:16','Lag crossed 2s'],['12:30','Shard rebalance started'],['13:02','Lag down to 900ms']]},
  {sev:'SEV-3',st:'ok',t:'checkout-bff cold start after deploy',dur:'11m · resolved',open:false,who:['GR'],
   ev:[['10:58','Deploy v2026.9.3'],['11:02','p95 spiked to 1.8s'],['11:09','Warm pool restored']]},
  {sev:'SEV-4',st:'ok',t:'media-upload queue backlog',dur:'27m · resolved',open:false,who:['MD'],
   ev:[['09:31','Backlog 12k objects'],['09:58','Workers scaled 4 → 12']]},
];
const AVA=['#3b46e8','#2fbf8f','#ffab2e','#ff4d78','#8b6cf0'];
const BUILD_incidents=view=>{
  view.innerHTML=page('Incidents','Open one to read the timeline your team wrote while it was happening.',
    `<div class="seg" id="inSeg">
       <button aria-pressed="true" data-m="all">Last 7 days</button>
       <button aria-pressed="false" data-m="open">Open only</button>
     </div>`,
    `<div class="alist" id="inBody"></div>`);
  const body=$('#inBody',view);
  const draw=m=>{
    const list=INCIDENTS.filter(n=>m==='all'||n.open);
    body.innerHTML=`<div class="glab" data-stag>${
      m==='open'?list.length+' still open · '+list.filter(n=>n.sev==='SEV-1').length+' at SEV-1'
                :list.length+' incidents · '+list.filter(n=>n.open).length+' still open'}</div>`
      + list.map((n,i)=>`
      <div class="card inc" data-stag data-open="false">
        <button class="inc-h">
          <span class="status ${n.st}" style="min-width:56px;justify-content:center">${n.sev}</span>
          <span class="bd" style="flex:1;min-width:0;text-align:left">
            <h4 style="margin:0 0 4px;font-size:12.5px;font-weight:600">${n.t}</h4>
            <span class="meta" style="font-size:10.5px;color:var(--ink-3)">${n.dur} · ${n.ev.length} updates</span>
          </span>
          <span class="who">${n.who.map((w,j)=>`<span style="background:${AVA[(i+j)%5]}">${w}</span>`).join('')}</span>
          <svg class="chev"><use href="#i-chev"/></svg>
        </button>
        <div class="inc-b"><div class="pad"><div class="tl">
          ${n.ev.map(e=>`<div class="tl-i"><div class="t">${e[1]}</div><div class="m">${e[0]}</div></div>`).join('')}
        </div></div></div>
      </div>`).join('');
    $$('.inc',body).forEach(card=>{
      const bd=$('.inc-b',card);
      $('.inc-h',card).addEventListener('click',()=>{
        const open=card.dataset.open==='true';
        card.dataset.open=String(!open);
        bd.style.height=open?'0px':bd.firstElementChild.offsetHeight+'px';
      });
    });
    stagRows(body);
  };
  draw('all');
  $$('#inSeg button',view).forEach(b=>b.addEventListener('click',()=>{
    $$('#inSeg button',view).forEach(o=>o.setAttribute('aria-pressed','false'));
    b.setAttribute('aria-pressed','true'); draw(b.dataset.m);
  }));
};

/* ---------- saved views ---------- */
const VIEWS=[
  {t:'eu-west-1 / redis',by:'you',when:'2h ago',star:true},
  {t:'Payments golden path',by:'rina',when:'yesterday',star:true},
  {t:'Cross-AZ replication',by:'ops-team',when:'3d ago',star:false},
  {t:'Checkout latency hunt',by:'you',when:'5d ago',star:false},
  {t:'Media pipeline',by:'dimas',when:'1w ago',star:false},
  {t:'Everything, all at once',by:'platform',when:'2w ago',star:false},
];
function thumb(i){
  const n=5+i%3, pts=Array.from({length:n},(_,j)=>({x:26+((j*47+i*29)%200),y:24+((j*37+i*53)%62)}));
  const lines=pts.slice(1).map((p,j)=>`<path d="M${pts[j].x} ${pts[j].y} C${(pts[j].x+p.x)/2} ${pts[j].y}, ${(pts[j].x+p.x)/2} ${p.y}, ${p.x} ${p.y}" stroke="rgba(40,54,92,.22)" fill="none" stroke-width="1"/>`).join('');
  const rects=pts.map((p,j)=>`<rect x="${p.x-11}" y="${p.y-6}" width="22" height="12" rx="3" fill="${j===0?'#3b46e8':'rgba(255,255,255,.95)'}" stroke="rgba(40,54,92,.12)"/>`).join('');
  return `<svg viewBox="0 0 244 108">${lines}${rects}</svg>`;
}
const BUILD_saved=view=>{
  view.innerHTML=page('Saved views','A view remembers its filters, its time window and where you dragged every node.',
    `<button class="btn-dark" id="newView"><svg class="ico"><use href="#i-plus"/></svg> New view</button>`,
    `<div class="vgrid" id="vBody"></div>`);
  const body=$('#vBody',view);
  const draw=()=>{
    body.innerHTML=VIEWS.map((v,i)=>`
      <div class="card vcard" data-stag data-v="${v.t}">
        <div class="vthumb">${thumb(i)}
          <button class="star" aria-pressed="${v.star}" aria-label="Star ${v.t}">
            <svg class="ico" style="width:14px;height:14px"><use href="#i-star"/></svg></button>
        </div>
        <div class="vmeta"><div class="t">${v.t}</div>
          <div class="m"><span class="avatar" style="width:16px;height:16px;border-radius:5px;font-size:8px">${v.by.slice(0,2).toUpperCase()}</span>${v.by} · ${v.when}</div>
        </div>
      </div>`).join('');
    $$('.vcard',body).forEach(c=>{
      c.addEventListener('click',()=>{ route('topology'); toast('Loaded “'+c.dataset.v+'”'); });
      $('.star',c).addEventListener('click',e=>{
        e.stopPropagation();
        const s=e.currentTarget, on=s.getAttribute('aria-pressed')==='true';
        s.setAttribute('aria-pressed',String(!on));
        const v=VIEWS.find(x=>x.t===c.dataset.v); if(v) v.star=!on;
        if(!REDUCED) s.animate([{transform:'scale(1)'},{transform:'scale(1.35)'},{transform:'scale(1)'}],
          {duration:380,easing:'cubic-bezier(.34,1.42,.64,1)'});
      });
    });
  };
  draw();
  $('#newView',view).addEventListener('click',()=>{
    const m=openModal({
      title:'New saved view',
      sub:'Everything on screen right now becomes the starting point.',
      body:`
        <div class="mfield"><label for="nvName">View name</label>
          <input id="nvName" placeholder="e.g. Checkout hot path" autocomplete="off"></div>
        <div class="mfield"><label for="nvDesc">What should someone look at first?</label>
          <textarea id="nvDesc" rows="2" placeholder="Optional — one line is plenty"></textarea></div>
        <div class="mfield"><label>Remember</label>
          <div class="mchecks">
            ${mcheck('filters','Filters','Service in 3 · Zone in 2 · IP in 1',true)}
            ${mcheck('window','Time window','last 5 min · 12:30 – 13:10',true)}
            ${mcheck('layout','Node layout','Where you dragged each service',true)}
            ${mcheck('metric','Metric on the wires','Throughput (kbps)',false)}
          </div></div>
        <div class="mfield"><label>Who can open it</label>
          <div class="seg two" id="nvVis">
            <button aria-pressed="true">Just me</button>
            <button aria-pressed="false">My team</button>
            <button aria-pressed="false">Anyone with link</button>
          </div></div>`,
      actions:[
        {label:'Cancel'},
        {label:'Create view',solid:true,run(mm){
          const name=$('#nvName',mm).value.trim();
          if(!name){
            const f=$('#nvName',mm); f.focus();
            if(!REDUCED) f.animate([{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'none'}],
              {duration:280,easing:'cubic-bezier(.23,1,.32,1)'});
            f.style.borderColor='rgba(255,77,120,.6)';
            return false;
          }
          const kept=$$('.mcheck[aria-checked="true"]',mm).length;
          VIEWS.unshift({t:name,by:'you',when:'just now',star:false});
          draw();
          const first=$('.vcard',body);
          if(first&&!REDUCED) first.animate(
            [{opacity:0,transform:'scale(.94) translateY(10px)'},{opacity:1,transform:'none'}],
            {duration:520,easing:'cubic-bezier(.34,1.42,.64,1)'});
          toast('Saved “'+name+'” · '+kept+' things remembered');
        }}
      ]
    });
    $('#nvName',m).addEventListener('input',e=>e.target.style.borderColor='');
  });
};

/* ---------- runbooks ---------- */
const RUNBOOKS=[
  {t:'Packet loss on a mesh path',by:'platform',steps:[
    ['Confirm the drop is real','Compare the wire label with the collector counter for the same edge.','meshctl edge sdkclient.eng→gateway --since 10m'],
    ['Check the sidecar version','A 1.14.2 sidecar drops mTLS renegotiation under load.','kubectl get pods -l app=sdkclient -o jsonpath="{..image}"'],
    ['Roll back the sidecar','Pin 1.13.9 and restart one replica at a time.','kubectl rollout undo deploy/sdkclient-sidecar'],
    ['Watch the map','The pink wire turns grey within two collector flushes.',''],
  ]},
  {t:'Error budget burn > ×10',by:'sre',steps:[
    ['Find the failing dependency','Open the slowest trace and look for the first red span.',''],
    ['Check the connection pool','Exhaustion shows up as queueing, not errors, until it tips.','meshctl pool billing-api'],
    ['Raise the pool, then re-check','Give it two minutes before judging.',''],
  ]},
  {t:'Cross-AZ replication lag',by:'data',steps:[
    ['Read the lag series','Lag climbing linearly means throughput, not a stall.',''],
    ['Rebalance the shard','Move the hottest key range off the loaded AZ.','meshctl shard rebalance redis-shard-3'],
  ]},
  {t:'Deploy made p95 worse',by:'platform',steps:[
    ['Compare before / after','Use “Compare with yesterday” in the interval menu.',''],
    ['Warm the pool','Cold starts fade after roughly 400 requests.',''],
    ['Decide: roll forward or back','If p95 is still double after 10 minutes, roll back.',''],
  ]},
  {t:'Collector stopped flushing',by:'sre',steps:[
    ['Check the agent','The LIVE counter in the toolbar stops moving first.',''],
    ['Restart the collector daemonset','Losing up to 30s of samples is expected.','kubectl rollout restart ds/kelvin-collector'],
  ]},
];
const BUILD_runbooks=view=>{
  view.innerHTML=page('Runbooks','What to do at 3am, written by the people who were there last time.','',
    `<div class="split rb">
      <div class="card"><div class="card-h"><h3>Runbooks</h3><span class="sp"></span><span class="m">${RUNBOOKS.length}</span></div>
        <div class="scroll" id="rbList"></div></div>
      <div class="card"><div class="card-h"><h3 id="rbTitle">—</h3><span class="sp"></span>
        <div class="prog"><i id="rbProg" style="width:0%"></i></div>
        <span class="m" id="rbCount">0/0</span></div>
        <div class="scroll rb-read" id="rbBody"></div></div>
     </div>`,true);
  const list=$('#rbList',view);
  list.innerHTML=RUNBOOKS.map((r,i)=>`
    <button class="trow" data-i="${i}" aria-selected="${i===0}" data-stag>
      <svg class="ico" style="stroke:var(--ink-3)"><use href="#i-book"/></svg>
      <span class="tb"><span class="t1">${r.t}</span><span class="t2">${r.steps.length} steps · ${r.by}</span></span>
    </button>`).join('');
  let done=new Set();
  const draw=i=>{
    const r=RUNBOOKS[i]; done=new Set();
    $('#rbTitle',view).textContent=r.t;
    $('#rbBody',view).innerHTML=r.steps.map((s,j)=>`
      <button class="step" data-j="${j}" aria-checked="false">
        <span class="cb" aria-checked="false"><svg viewBox="0 0 24 24"><use href="#i-check"/></svg></span>
        <span><span class="s-t">${s[0]}</span><span class="s-d">${s[1]}</span>
        ${s[2]?`<span class="s-c">${s[2]}</span>`:''}</span>
      </button>`).join('');
    const upd=()=>{
      $('#rbProg',view).style.width=(done.size/r.steps.length*100)+'%';
      $('#rbCount',view).textContent=done.size+'/'+r.steps.length;
    };
    upd();
    $$('.step',view).forEach(st=>st.addEventListener('click',()=>{
      const j=+st.dataset.j, on=done.has(j);
      on?done.delete(j):done.add(j);
      st.setAttribute('aria-checked',String(!on));
      $('.cb',st).setAttribute('aria-checked',String(!on));
      upd();
      if(!on && done.size===r.steps.length) toast('Runbook complete — nice work');
    }));
  };
  draw(0);
  $$('#rbList .trow',view).forEach(b=>b.addEventListener('click',()=>{
    $$('#rbList .trow',view).forEach(o=>o.setAttribute('aria-selected','false'));
    b.setAttribute('aria-selected','true'); draw(+b.dataset.i);
  }));
};

/* ---------- settings ---------- */
const BUILD_settings=view=>{
  const sw=(id,on,label,desc)=>`<div class="set-row"><div class="lab2"><div class="t">${label}</div>
      <div class="d">${desc}</div></div>
      <button class="switch" id="${id}" role="switch" aria-checked="${on}" aria-label="${label}"></button></div>`;
  const sel=(id,val,label,desc)=>`<div class="set-row"><div class="lab2"><div class="t">${label}</div>
      <div class="d">${desc}</div></div>
      <button class="pill-btn" id="${id}" aria-haspopup="menu" aria-expanded="false">
        <span>${val}</span><svg class="chev" style="width:11px;height:11px"><use href="#i-chev"/></svg></button></div>`;
  const audit=(who,what,when,c)=>`<div class="audit">
      <span class="avatar" style="width:24px;height:24px;border-radius:7px;font-size:9px;background:${c}">${who}</span>
      <span><span class="t">${what}</span><span class="m">${when}</span></span></div>`;

  view.innerHTML=page('Settings','Collector, display and paging preferences for this workspace.','',
    `<div class="set-wrap">
      <div class="set-main">
        <div class="card" data-stag style="margin-bottom:12px">
          <div class="card-h"><span class="sq" style="width:22px;height:22px;border-radius:7px;background:var(--sunk);display:grid;place-items:center">
            <svg class="ico" style="width:12px;height:12px;stroke:var(--ink-2)"><use href="#i-db"/></svg></span>
            <h3>Collector</h3><span class="sp"></span><span class="m">agent 4.2.1</span></div>
          <div class="set-row"><div class="lab2"><div class="t">Sampling rate</div>
            <div class="d">Higher sampling means sharper wires and a bigger bill.</div></div>
            <input class="slider" id="setSample" type="range" min="1" max="100" value="35" aria-label="Sampling rate">
            <span class="ro" id="setSampleV" style="width:42px;text-align:right">35%</span></div>
          ${sel('setRetention','30 days','Retention','How long raw spans stay queryable.')}
          ${sw('setHeaders',false,'Capture request headers','Headers can carry personal data — off by default.')}
        </div>

        <div class="card" data-stag style="margin-bottom:12px">
          <div class="card-h"><span class="sq" style="width:22px;height:22px;border-radius:7px;background:var(--sunk);display:grid;place-items:center">
            <svg class="ico" style="width:12px;height:12px;stroke:var(--ink-2)"><use href="#i-route"/></svg></span>
            <h3>Display</h3></div>
          ${sw('setPackets',true,'Animate packets on the map','Turning this off also pauses the live stream.')}
          ${sw('setLabels',true,'Show throughput labels on wires','Hide them for a cleaner map on a wall screen.')}
          ${sel('setDensity','Comfortable','Density','Row height and padding across tables.')}
        </div>

        <div class="card" data-stag>
          <div class="card-h"><span class="sq" style="width:22px;height:22px;border-radius:7px;background:var(--sunk);display:grid;place-items:center">
            <svg class="ico" style="width:12px;height:12px;stroke:var(--ink-2)"><use href="#i-bell"/></svg></span>
            <h3>Paging</h3></div>
          ${sw('setEmail',true,'Email me when a rule fires','Sent to muhammad.alfian@pkp.co.id.')}
          ${sw('setSev1',false,'Only page me for SEV-1','Everything else waits for the morning digest.')}
          ${sel('setChannel','#mesh-alerts','Slack channel','Where alert threads are opened.')}
        </div>
      </div>

      <aside class="set-side">
        <div class="card sum" data-stag>
          <div class="k">Workspace</div>
          <div class="plan">
            <span class="badge2">Team</span>
            <span><span class="n">pkp.co.id</span><span class="d" style="display:block">12 seats · 4 in use</span></span>
          </div>
          <div class="kv"><span>Collector agents</span><b>128 / 130</b></div>
          <div class="meter" style="margin:8px 0 2px"><i style="width:98%;background:linear-gradient(90deg,#3ad2a0,#2fbf8f)"></i></div>
          <div class="kv" style="margin-top:12px"><span>Samples today</span><b>4.2B</b></div>
          <div class="kv"><span>Storage used</span><b>1.24 / 2 TB</b></div>
          <div class="meter" style="margin:8px 0 2px"><i style="width:62%;background:linear-gradient(90deg,#5c8aff,#2f63f5)"></i></div>
          <div class="kv" style="margin-top:12px"><span>Region</span><b>eu-west-1</b></div>
        </div>

        <div class="card sum" data-stag>
          <div class="k" style="margin-bottom:10px">Recent changes</div>
          ${audit('MA','You raised sampling 20% → 35%','today 09:14','#3b46e8')}
          ${audit('RN','rina added #payments-eng to paging','yesterday 16:40','#2fbf8f')}
          ${audit('OP','ops-team set retention to 30 days','3d ago','#ffab2e')}
          ${audit('MA','You turned off header capture','1w ago','#3b46e8')}
        </div>

        <div class="card sum" data-stag>
          <div class="k" style="margin-bottom:6px">Help</div>
          <button class="linkrow" data-help="Documentation"><svg class="ico"><use href="#i-book"/></svg>
            Documentation<span class="sp"></span><svg class="ico" style="width:12px;height:12px"><use href="#i-ext"/></svg></button>
          <button class="linkrow" data-help="Keyboard shortcuts"><svg class="ico"><use href="#i-code"/></svg>
            Keyboard shortcuts<span class="sp"></span><span class="tag">?</span></button>
          <button class="linkrow" data-help="Support"><svg class="ico"><use href="#i-help"/></svg>
            Contact support<span class="sp"></span><svg class="ico" style="width:12px;height:12px"><use href="#i-ext"/></svg></button>
        </div>

        </aside>
    </div>`);

  const toggle=(id,fn)=>{
    const b=$('#'+id,view);
    b.addEventListener('click',()=>{
      const on=b.getAttribute('aria-checked')!=='true';
      b.setAttribute('aria-checked',String(on));
      fn && fn(on);
    });
  };
  toggle('setHeaders',on=>toast(on?'Header capture on — check your PII policy':'Header capture off'));
  toggle('setPackets',on=>{ playing=on; syncPlayBtn(); toast(on?'Packets animating':'Map frozen'); });
  toggle('setLabels',on=>{ $('#wires').classList.toggle('nolabels',!on); toast(on?'Wire labels on':'Wire labels hidden'); });
  toggle('setEmail'); toggle('setSev1',on=>toast(on?'Only SEV-1 will page you':'All severities will page you'));

  const slider=$('#setSample',view);
  slider.addEventListener('input',()=>$('#setSampleV',view).textContent=slider.value+'%');
  slider.addEventListener('change',()=>toast('Sampling set to '+slider.value+'%'));

  const menu=(id,title,opts)=>{
    const b=$('#'+id,view);
    b.addEventListener('click',()=>openPop(b,{
      title, width:210, align:'right',
      items:opts.map(o=>({label:o,role:'radio',checked:$('span',b).textContent===o})),
      onPick:it=>{ swap($('span',b),it.label); toast(title+' · '+it.label); }
    }));
  };
  menu('setRetention','Retention',['7 days','30 days','90 days','1 year']);
  menu('setDensity','Density',['Comfortable','Compact','Spacious']);
  menu('setChannel','Slack channel',['#mesh-alerts','#sre-oncall','#payments-eng','#platform']);
  $$('[data-help]',view).forEach(b=>b.addEventListener('click',()=>toast(b.dataset.help+' — prototype')));
};

const BUILD={services:BUILD_services,zones:BUILD_zones,traces:BUILD_traces,alerts:BUILD_alerts,
  incidents:BUILD_incidents,saved:BUILD_saved,runbooks:BUILD_runbooks,settings:BUILD_settings};
$('#app').dataset.route='topology';
