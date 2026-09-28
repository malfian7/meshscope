/* MeshScope · 4/4 — the account corner behind the avatar menu:
   profile & preferences, notification routing, and the keyboard
   shortcut sheet (plus the shortcuts themselves).
   Load order: core.js → console.js → views.js → account.js */
'use strict';
/* ============================================================
   11 · ACCOUNT CORNER
   ============================================================ */
BARE.add('profile'); BARE.add('routing');
BUILD.profile=v=>BUILD_profile(v);
BUILD.routing=v=>BUILD_routing(v);

function goRoute(name){
  if(pop) closePop(false);
  if(innerWidth<=860) setSide('');
  route(name);
}
function openAccount(label){
  if(label==='Profile & preferences') goRoute('profile');
  else if(label==='Notification routing') goRoute('routing');
  else if(label==='Keyboard shortcuts') openShortcuts();
}
/* route() calls this on every visit, so pages that animate can
   start and stop their frame loops with the view */
function onRoute(name){
  if(name==='routing') rtStart(); else rtStop();
}

/* shared bits */
const hsq=icon=>`<span class="hsq"><svg class="ico"><use href="#${icon}"/></svg></span>`;
const acSw=(id,on,label,desc)=>`<div class="set-row"><div class="lab2"><div class="t">${label}</div>
    <div class="d">${desc}</div></div>
    <button class="switch" id="${id}" role="switch" aria-checked="${on}" aria-label="${label}"></button></div>`;
const chevPill=(id,val,cls)=>`<button class="pill-btn${cls?' '+cls:''}" id="${id}" aria-haspopup="menu" aria-expanded="false">
    <span>${val}</span><svg class="chev" style="width:11px;height:11px"><use href="#i-chev"/></svg></button>`;
function segBind(seg,fn){
  $$('button',seg).forEach(b=>b.addEventListener('click',()=>{
    $$('button',seg).forEach(o=>o.setAttribute('aria-pressed','false'));
    b.setAttribute('aria-pressed','true'); fn && fn(b.dataset.v,b);
  }));
}
function segSet(seg,v){ $$('button',seg).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v))); }
function acMenu(btn,title,opts,onPick,width){
  btn.addEventListener('click',()=>openPop(btn,{
    title, width:width||232, align:'right',
    items:opts.map(o=>({label:o,role:'radio',checked:$('span',btn).textContent===o})),
    onPick:it=>{ swap($('span',btn),it.label); onPick && onPick(it.label); }
  }));
}
function flashIn(node){
  if(!REDUCED && node) node.animate([{opacity:0,transform:'translateY(8px) scale(.98)'},{opacity:1,transform:'none'}],
    {duration:460,easing:'cubic-bezier(.34,1.42,.64,1)'});
}
function fadeRemove(node,after){
  node.classList.add('fadeout');
  setTimeout(()=>{ node.remove(); after && after(); },REDUCED?10:380);
}
function shake(node){
  if(!REDUCED) node.animate([{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'none'}],
    {duration:280,easing:'cubic-bezier(.23,1,.32,1)'});
}
const initials=n=>(n.trim().split(/\s+/).map(w=>w[0]||'').join('').slice(0,2)||'?').toUpperCase();

/* ============================================================
   PROFILE & PREFERENCES
   ============================================================ */
const ME={name:'Muhammad Alfian',title:'Site Reliability Engineer',email:'muhammad.alfian@pkp.co.id',
  phone:'+62 812 3318 4410',tz:'Asia/Jakarta · WIB (UTC+7)',land:'Topology',win:'Last 5 minutes',
  clock:'24',unit:'kbps',rel:true,photo:null,tfa:false,status:'On call'};
const STATUSES=[
  {label:'On call',sub:'Pages reach you right away',dot:'#2fbf8f',side:'SRE · on call'},
  {label:'Focusing',sub:'Only SEV-1 interrupts you',dot:'#ffab2e',side:'SRE · focusing'},
  {label:'Away',sub:'Pages skip you and escalate',dot:'#aab1c1',side:'SRE · away'},
];
const TOKENS=[
  {n:'grafana-bridge',sc:'read:topology',used:'4m ago',exp:'in 62 days'},
  {n:'ci-silencer',sc:'write:silences',used:'yesterday',exp:'in 11 days'},
  {n:'laptop-cli',sc:'read:traces',used:'3w ago',exp:'never'},
];
const SESSIONS=[
  {i:'i-laptop',t:'MacBook Pro · Chrome 131',m:'Jakarta, ID · 103.28.xx.xx',here:true},
  {i:'i-phone',t:'iPhone 15 · MeshScope app',m:'Jakarta, ID · active 2h ago'},
  {i:'i-laptop',t:'Windows · Edge 130',m:'Singapore, SG · active 3 days ago'},
];

function BUILD_profile(view){
  const S={...ME};           /* the edit buffer — ME is what is saved */
  const pf=(id,label,val,hint,type)=>`<div class="pf-f"><label for="${id}">${label}</label>
      <input id="${id}" value="${val}" autocomplete="off"${type?` type="${type}"`:''}>${hint?`<div class="hint">${hint}</div>`:''}</div>`;
  const prefRow=(label,desc,ctl)=>`<div class="set-row"><div class="lab2"><div class="t">${label}</div>
      <div class="d">${desc}</div></div>${ctl}</div>`;

  view.innerHTML=page('Profile & preferences','How you show up to your team, and how MeshScope behaves for you alone.','',
  `<div class="set-wrap">
    <div class="set-main">
      <div class="card pf-hero" data-stag>
        <div class="pf-banner" aria-hidden="true">${pfMesh()}</div>
        <div class="pf-id">
          <button class="pf-ava" id="pfAva" aria-label="Change profile photo">
            <span id="pfIni">${initials(ME.name)}</span>
            <span class="cam"><svg class="ico"><use href="#i-camera"/></svg></span>
          </button>
          <input type="file" id="pfFile" accept="image/*" hidden>
          <div class="pf-who">
            <h3 id="pfShowName">${ME.name}</h3>
            <div class="r"><span id="pfShowTitle">${ME.title}</span> · pkp.co.id</div>
            <div class="pf-tags"><span class="tag">platform</span><span class="tag">eu-west-1</span><span class="tag">joined Mar 2024</span></div>
          </div>
          <button class="pill-btn pf-status" id="pfStatus" aria-haspopup="menu" aria-expanded="false">
            <span class="dot" id="pfStatusDot" style="background:#2fbf8f;box-shadow:0 0 0 3px rgba(47,191,143,.2)"></span>
            <span id="pfStatusTxt">On call</span><svg class="chev" style="width:11px;height:11px"><use href="#i-chev"/></svg></button>
        </div>
      </div>

      <div class="card" data-stag style="margin-bottom:12px">
        <div class="card-h">${hsq('i-user')}<h3>Identity</h3><span class="sp"></span><span class="m">visible to your workspace</span></div>
        <div class="pf-grid">
          ${pf('pfName','Display name',ME.name)}
          ${pf('pfTitle','Job title',ME.title)}
          <div class="pf-f"><label>Email</label>
            <div class="pf-ro"><svg class="ico"><use href="#i-lock"/></svg>${ME.email}</div>
            <div class="hint">Managed by your SSO provider.</div></div>
          ${pf('pfPhone','Phone for paging',ME.phone,'Used for SEV-1 calls — see Notification routing.','tel')}
          <div class="pf-f pf-span"><label>Time zone</label>${chevPill('pfTz',ME.tz,'pf-sel')}
            <div class="hint">Every timestamp in the console is shown in this zone.</div></div>
        </div>
      </div>

      <div class="card" data-stag style="margin-bottom:12px">
        <div class="card-h">${hsq('i-sliders')}<h3>Preferences</h3><span class="sp"></span><span class="m">only affects you</span></div>
        ${prefRow('Open on','The page you land on after signing in.',chevPill('pfLand',ME.land))}
        ${prefRow('Default time window','Where the timeline starts when you open the map.',chevPill('pfWin',ME.win))}
        ${prefRow('Clock',`How times are written. <span class="pf-prev" id="pfClockPrev">--:--</span>`,
          `<div class="seg" id="pfClock"><button data-v="24" aria-pressed="true">24-hour</button><button data-v="12" aria-pressed="false">12-hour</button></div>`)}
        ${prefRow('Throughput unit',`Used on wire labels and tables. <span class="pf-prev" id="pfUnitPrev">940 kbps</span>`,
          `<div class="seg" id="pfUnit"><button data-v="kbps" aria-pressed="true">kbps</button><button data-v="Mbps" aria-pressed="false">Mbps</button></div>`)}
        ${prefRow('Relative timestamps',`“6m ago” instead of the exact time. <span class="pf-prev" id="pfRelPrev">6m ago</span>`,
          `<button class="switch" id="pfRel" role="switch" aria-checked="true" aria-label="Relative timestamps"></button>`)}
      </div>

      <div class="card" data-stag style="margin-bottom:12px">
        <div class="card-h">${hsq('i-laptop')}<h3>Where you're signed in</h3><span class="sp"></span><span class="m" id="pfSessN">${SESSIONS.length} sessions</span></div>
        <div class="sess-list" id="pfSess">${SESSIONS.map((s,i)=>`
          <div class="sess" data-i="${i}">
            <span class="sq"><svg class="ico"><use href="#${s.i}"/></svg></span>
            <span class="b"><span class="t">${s.t}</span><span class="m">${s.m}</span></span>
            ${s.here?`<span class="here"><i></i>This device</span>`:`<button class="btn-s sess-out">Sign out</button>`}
          </div>`).join('')}</div>
        <button class="danger-row" id="pfOutAll"><svg class="ico"><use href="#i-logout"/></svg>Sign out of every other session</button>
      </div>

      <div class="card" data-stag>
        <div class="card-h">${hsq('i-key')}<h3>Personal API tokens</h3><span class="sp"></span>
          <button class="btn-s solid" id="pfNewTok"><svg class="ico" style="width:12px;height:12px;stroke:#fff;vertical-align:-2px"><use href="#i-plus"/></svg> New token</button></div>
        <table class="dtable tok"><thead><tr><th>Name</th><th>Scope</th><th class="hide-md">Last used</th><th>Expires</th><th></th></tr></thead>
          <tbody id="pfTok"></tbody></table>
      </div>
      <div class="savebar" id="pfBar" role="status">
        <span class="dot"></span><span id="pfBarTxt">Unsaved changes</span>
        <button class="btn-s" id="pfDiscard">Discard</button>
        <button class="btn-s solid" id="pfSave">Save changes</button>
      </div>
    </div>

    <aside class="set-side flow">
      <div class="card sum" data-stag>
        <div class="k">Profile strength</div>
        <div class="ring">
          <svg viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="26"/><circle class="fg" id="pfRing" cx="32" cy="32" r="26"/></svg>
          <div><div class="pct"><span id="pfPct">0</span>%</div><div class="d" id="pfPctD">Almost there</div></div>
        </div>
        <div id="pfTodo"></div>
      </div>

      <div class="card sum" data-stag>
        <div class="k" style="margin-bottom:4px">Security</div>
        <div class="sec-row"><span class="sq"><svg class="ico"><use href="#i-shield"/></svg></span>
          <span class="b"><span class="t">Two-factor sign-in</span><span class="m" id="pfTfaM">Off — anyone with your SSO can sign in</span></span>
          <button class="switch" id="pfTfa" role="switch" aria-checked="false" aria-label="Two-factor sign-in"></button></div>
        <div class="sec-row"><span class="sq"><svg class="ico"><use href="#i-lock"/></svg></span>
          <span class="b"><span class="t">Console password</span><span class="m" id="pfPwM">Changed 42 days ago</span></span>
          <button class="btn-s" id="pfPw">Change</button></div>
        <div class="kv" style="margin-top:10px"><span>Sign-in method</span><b>SSO · pkp.co.id</b></div>
        <div class="kv"><span>Last sign-in</span><b>today 08:02</b></div>
      </div>

      <div class="card sum" data-stag>
        <div class="k">Your September</div>
        <div class="mstats">
          <div class="mstat"><div class="v" data-count="6">0</div><div class="l">on-call shifts</div></div>
          <div class="mstat"><div class="v" data-count="3">0</div><div class="l">incidents led</div></div>
          <div class="mstat"><div class="v" data-count="14">0</div><div class="l">pages acknowledged</div></div>
          <div class="mstat"><div class="v">2m 10s</div><div class="l">median time to ack</div></div>
        </div>
      </div>
    </aside>
  </div>`);

  const $v=s=>$(s,view);
  /* ---- the live preview chips ---- */
  const drawClock=()=>{
    const d=new Date(), h=d.getHours(), m=String(d.getMinutes()).padStart(2,'0'), s=String(d.getSeconds()).padStart(2,'0');
    $v('#pfClockPrev').textContent = S.clock==='24' ? `${String(h).padStart(2,'0')}:${m}:${s}` : `${(h%12)||12}:${m}:${s} ${h<12?'AM':'PM'}`;
  };
  drawClock(); setInterval(()=>{ if(view.classList.contains('on')) drawClock(); },1000);
  const drawPrev=()=>{
    const u=$v('#pfUnitPrev'), r=$v('#pfRelPrev');
    const ut=S.unit==='kbps'?'940 kbps':'0.94 Mbps', rt=S.rel?'6m ago':(S.clock==='24'?'12:52':'12:52 PM');
    if(u.textContent!==ut) swap(u,ut);
    if(r.textContent!==rt) swap(r,rt);
  };

  /* ---- dirty tracking + save bar ---- */
  const KEYS=['name','title','phone','tz','land','win','clock','unit','rel'];
  const dirtyN=()=>KEYS.filter(k=>S[k]!==ME[k]).length;
  const bar=$v('#pfBar');
  const check=()=>{
    const n=dirtyN();
    bar.classList.toggle('on',n>0);
    if(n) $v('#pfBarTxt').textContent=n===1?'1 unsaved change':n+' unsaved changes';
    drawPrev(); drawTodo();
  };
  [['pfName','name'],['pfTitle','title'],['pfPhone','phone']].forEach(([id,k])=>{
    const f=$v('#'+id);
    f.addEventListener('input',()=>{
      S[k]=f.value; f.classList.remove('bad');
      if(k==='name'){ $v('#pfShowName').textContent=f.value.trim()||'—'; if(!S.photo) $v('#pfIni').textContent=initials(f.value); }
      if(k==='title') $v('#pfShowTitle').textContent=f.value.trim()||'—';
      check();
    });
  });
  acMenu($v('#pfTz'),'Time zone',['Asia/Jakarta · WIB (UTC+7)','Asia/Makassar · WITA (UTC+8)','Asia/Jayapura · WIT (UTC+9)',
    'Asia/Singapore (UTC+8)','Europe/Dublin (UTC+1)','UTC'],v=>{S.tz=v;check()},262);
  acMenu($v('#pfLand'),'Open on',['Topology','Services','Zones','Alerts','Incidents'],v=>{S.land=v;check()});
  acMenu($v('#pfWin'),'Default time window',['Last 5 minutes','Last 15 minutes','Last hour','Last 6 hours'],v=>{S.win=v;check()});
  segBind($v('#pfClock'),v=>{S.clock=v;drawClock();check()});
  segBind($v('#pfUnit'),v=>{S.unit=v;check()});
  const rel=$v('#pfRel');
  rel.addEventListener('click',()=>{ S.rel=rel.getAttribute('aria-checked')!=='true'; rel.setAttribute('aria-checked',String(S.rel)); check(); });

  const paint=()=>{        /* push the buffer back into every control */
    $v('#pfName').value=S.name; $v('#pfTitle').value=S.title; $v('#pfPhone').value=S.phone;
    $v('#pfShowName').textContent=S.name; $v('#pfShowTitle').textContent=S.title;
    if(!S.photo) $v('#pfIni').textContent=initials(S.name);
    [['pfTz','tz'],['pfLand','land'],['pfWin','win']].forEach(([id,k])=>{
      const sp=$('span',$v('#'+id)); if(sp.textContent!==S[k]) swap(sp,S[k]); });
    segSet($v('#pfClock'),S.clock); segSet($v('#pfUnit'),S.unit);
    rel.setAttribute('aria-checked',String(S.rel));
    $$('.pf-f input',view).forEach(f=>f.classList.remove('bad'));
    drawClock(); check();
  };
  $v('#pfDiscard').addEventListener('click',()=>{ KEYS.forEach(k=>S[k]=ME[k]); paint(); toast('Changes discarded'); });
  $v('#pfSave').addEventListener('click',()=>{
    const nm=$v('#pfName');
    if(!S.name.trim()){ nm.classList.add('bad'); nm.focus(); shake(nm); return; }
    if(!/^\+?[\d\s-]{8,}$/.test(S.phone.trim())){ const p=$v('#pfPhone'); p.classList.add('bad'); p.focus(); shake(p); toast('That phone number will not receive a call'); return; }
    const b=$v('#pfSave'); b.classList.add('busy'); b.textContent='Saving…';
    setTimeout(()=>{
      KEYS.forEach(k=>ME[k]=S[k]);
      $('#userBtn .stack .v').textContent=ME.name;
      if(!ME.photo) $('#userBtn .avatar').textContent=initials(ME.name);
      b.classList.remove('busy'); b.textContent='Save changes';
      check(); toast('Profile saved');
    },REDUCED?10:650);
  });

  /* ---- photo: a real file picker, read locally, never uploaded ---- */
  const setPhoto=url=>{
    ME.photo=S.photo=url;
    const a=$v('#pfAva'), side=$('#userBtn .avatar');
    [a,side].forEach(n=>{ n.style.backgroundImage=url?`url("${url}")`:''; n.classList.toggle('has-photo',!!url); });
    $v('#pfIni').textContent=url?'':initials(S.name);
    side.textContent=url?'':initials(ME.name);
    bump(a); drawTodo();
  };
  $v('#pfAva').addEventListener('click',()=>$v('#pfFile').click());
  $v('#pfFile').addEventListener('change',e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size>6e6){ toast('Pick an image under 6 MB'); return; }
    const r=new FileReader();
    r.onload=()=>{ setPhoto(r.result); toast('Photo updated — it stays in this browser'); };
    r.readAsDataURL(f);
  });

  /* ---- status ---- */
  const stBtn=$v('#pfStatus');
  stBtn.addEventListener('click',()=>openPop(stBtn,{
    title:'Your status', width:250, align:'right',
    items:STATUSES.map(s=>({label:s.label,sub:s.sub,dot:s.dot,role:'radio',checked:ME.status===s.label})),
    onPick(it){
      const s=STATUSES.find(x=>x.label===it.label); ME.status=s.label;
      swap($v('#pfStatusTxt'),s.label);
      const d=$v('#pfStatusDot'); d.style.background=s.dot; d.style.boxShadow=`0 0 0 3px ${s.dot}33`; bump(d);
      $('#userBtn .stack .k').textContent=s.side;
      toast('Status · '+s.label);
    }
  }));

  /* ---- profile strength ---- */
  const TODO=[
    {k:'photo',t:'Add a photo',ok:()=>!!ME.photo,go:()=>$v('#pfFile').click()},
    {k:'title',t:'Say what you do',ok:()=>!!ME.title.trim(),go:()=>$v('#pfTitle').focus()},
    {k:'phone',t:'Phone for SEV-1 calls',ok:()=>ME.phone.replace(/\D/g,'').length>=8,go:()=>$v('#pfPhone').focus()},
    {k:'tz',t:'Set your time zone',ok:()=>true,go:()=>$v('#pfTz').click()},
    {k:'tfa',t:'Turn on two-factor',ok:()=>ME.tfa,go:()=>$v('#pfTfa').click()},
  ];
  const C=2*Math.PI*26, ring=$v('#pfRing');
  ring.style.strokeDasharray=C; ring.style.strokeDashoffset=C;
  let pctNow=0;
  function drawTodo(){
    const done=TODO.filter(t=>t.ok()).length, pct=Math.round(done/TODO.length*100);
    requestAnimationFrame(()=>ring.style.strokeDashoffset=C*(1-pct/100));
    if(pct!==pctNow){ countFrom($v('#pfPct'),pctNow,pct); pctNow=pct; }
    $v('#pfPctD').textContent=pct===100?'Complete — nice':done>=3?'Almost there':'A few gaps left';
    $v('#pfTodo').innerHTML=TODO.map(t=>`
      <button class="todo" data-k="${t.k}" aria-checked="${t.ok()}">
        <span class="cb" aria-checked="${t.ok()}"><svg viewBox="0 0 24 24"><use href="#i-check"/></svg></span>
        <span class="tx">${t.t}</span>${t.ok()?'':'<span class="go">Fix</span>'}</button>`).join('');
    $$('.todo',$v('#pfTodo')).forEach(b=>b.addEventListener('click',()=>{
      const t=TODO.find(x=>x.k===b.dataset.k); if(!t.ok()) t.go(); }));
  }
  drawTodo();

  /* ---- security ---- */
  const tfa=$v('#pfTfa');
  tfa.addEventListener('click',()=>{
    ME.tfa=tfa.getAttribute('aria-checked')!=='true';
    tfa.setAttribute('aria-checked',String(ME.tfa));
    swap($v('#pfTfaM'),ME.tfa?'On · authenticator app':'Off — anyone with your SSO can sign in');
    drawTodo(); toast(ME.tfa?'Two-factor sign-in is on':'Two-factor sign-in is off');
  });
  $v('#pfPw').addEventListener('click',()=>{
    const m=openModal({
      title:'Change console password',
      sub:'Used only when SSO is unreachable. Twelve characters or more.',
      body:`<div class="mfield"><label for="pwOld">Current password</label><input id="pwOld" type="password" autocomplete="current-password"></div>
        <div class="mfield"><label for="pwNew">New password</label><input id="pwNew" type="password" autocomplete="new-password">
          <div class="pw-meter"><i id="pwBar"></i></div><div class="pw-note" id="pwNote">Start typing — we'll tell you how strong it is.</div></div>
        <div class="mfield"><label for="pwRep">Repeat it</label><input id="pwRep" type="password" autocomplete="new-password"></div>`,
      actions:[{label:'Cancel'},{label:'Update password',solid:true,run(mm){
        const o=$('#pwOld',mm), n=$('#pwNew',mm), r=$('#pwRep',mm);
        const bad=o.value.length<1?o:n.value.length<12?n:r.value!==n.value?r:null;
        if(bad){ bad.style.borderColor='rgba(255,77,120,.6)'; bad.focus(); shake(bad); return false; }
        swap($v('#pfPwM'),'Changed just now'); toast('Password updated');
      }}]
    });
    const n=$('#pwNew',m);
    $$('input',m).forEach(f=>f.addEventListener('input',()=>f.style.borderColor=''));
    n.addEventListener('input',()=>{
      const v=n.value; let sc=0;
      if(v.length>=12) sc++; if(v.length>=16) sc++; if(/[A-Z]/.test(v)&&/[a-z]/.test(v)) sc++; if(/\d/.test(v)) sc++; if(/[^A-Za-z0-9]/.test(v)) sc++;
      const lv=[['#ff4d78','Too easy to guess'],['#ff4d78','Weak'],['#ffab2e','Getting there'],['#ffab2e','Decent'],['#2fbf8f','Strong'],['#2fbf8f','Very strong']][v?sc:0];
      const bar=$('#pwBar',m); bar.style.width=(v?Math.max(10,sc/5*100):0)+'%'; bar.style.background=lv[1]&&lv[0];
      $('#pwNote',m).textContent=v?lv[1]+(v.length<12?' · '+(12-v.length)+' more characters':''):'Start typing — we\'ll tell you how strong it is.';
    });
  });

  /* ---- sessions ---- */
  const sessCount=()=>{ const n=$$('.sess',view).length; $v('#pfSessN').textContent=n+(n===1?' session':' sessions');
    $v('#pfOutAll').hidden=n<=1; };
  $$('.sess-out',view).forEach(b=>b.addEventListener('click',()=>{
    const row=b.closest('.sess'); const t=$('.t',row).textContent;
    fadeRemove(row,sessCount); toast('Signed out · '+t);
  }));
  $v('#pfOutAll').addEventListener('click',()=>{
    const rows=$$('.sess',view).filter(r=>!$('.here',r));
    rows.forEach((r,i)=>setTimeout(()=>fadeRemove(r,sessCount),i*90));
    toast(rows.length+' other sessions signed out');
  });
  sessCount();

  /* ---- tokens ---- */
  const drawTok=()=>{
    $v('#pfTok').innerHTML=TOKENS.length?TOKENS.map((t,i)=>`
      <tr data-i="${i}"><td><span class="tokn"><svg class="ico"><use href="#i-key"/></svg>${t.n}</span></td>
        <td><span class="tag">${t.sc}</span></td><td class="hide-md">${t.used}</td><td>${t.exp}</td>
        <td style="text-align:right"><button class="btn-s tok-rev">Revoke</button></td></tr>`).join('')
      :`<tr><td colspan="5"><div class="empty" style="padding:18px">No tokens. Scripts and dashboards will need one to read the mesh.</div></td></tr>`;
    $$('.tok-rev',view).forEach(b=>b.addEventListener('click',e=>{
      e.stopPropagation();
      const tr=b.closest('tr'), t=TOKENS[+tr.dataset.i];
      fadeRemove(tr,()=>{ TOKENS.splice(TOKENS.indexOf(t),1); drawTok(); });
      toast('Revoked · '+t.n);
    }));
  };
  drawTok();
  $v('#pfNewTok').addEventListener('click',()=>{
    const m=openModal({
      title:'New personal token',
      sub:'Acts as you, with only the scopes you tick. You will see it once.',
      body:`<div class="mfield"><label for="tkName">Name</label><input id="tkName" placeholder="e.g. grafana-bridge" autocomplete="off"></div>
        <div class="mfield"><label>Scopes</label><div class="mchecks">
          ${mcheck('read:topology','Read topology','Services, wires and their live numbers',true)}
          ${mcheck('read:traces','Read traces','Sampled requests and their spans',false)}
          ${mcheck('write:silences','Silence alerts','Create and lift silences, nothing else',false)}
        </div></div>
        <div class="mfield"><label>Expires</label><div class="seg two" id="tkExp">
          <button aria-pressed="false">30 days</button><button aria-pressed="true">90 days</button><button aria-pressed="false">Never</button></div></div>`,
      actions:[{label:'Cancel'},{label:'Create token',solid:true,run(mm){
        const f=$('#tkName',mm), name=f.value.trim().toLowerCase().replace(/\s+/g,'-');
        const sc=$$('.mcheck[aria-checked="true"]',mm).map(c=>c.dataset.k);
        if(!name){ f.style.borderColor='rgba(255,77,120,.6)'; f.focus(); shake(f); return false; }
        if(!sc.length){ shake($('.mchecks',mm)); toast('Tick at least one scope'); return false; }
        const exp=$('#tkExp button[aria-pressed="true"]',mm).textContent;
        TOKENS.unshift({n:name,sc:sc[0]+(sc.length>1?' +'+(sc.length-1):''),used:'never',exp:exp==='Never'?'never':'in '+exp});
        drawTok(); flashIn($('#pfTok tr',view));
        const secret='msk_'+Array.from({length:28},()=>'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random()*31)]).join('');
        try{ navigator.clipboard&&navigator.clipboard.writeText(secret); }catch(_){}
        toast('Token created and copied · '+secret.slice(0,10)+'…');
      }}]
    });
    $('#tkName',m).addEventListener('input',e=>e.target.style.borderColor='');
  });

  /* numbers count up the first time the page opens */
  $$('[data-count]',view).forEach((n,i)=>setTimeout(()=>countTo(n,+n.dataset.count,900),260+i*90));
}
function countFrom(node,from,to){
  if(REDUCED){ node.textContent=to; return; }
  const t0=performance.now();
  const run=now=>{ const k=clamp((now-t0)/700,0,1), e=1-Math.pow(1-k,3);
    node.textContent=Math.round(from+(to-from)*e); if(k<1) requestAnimationFrame(run); };
  requestAnimationFrame(run);
}
/* the hero banner: a faint mesh that keeps drifting */
function pfMesh(){
  const pts=[[40,62],[120,28],[196,70],[290,34],[372,74],[468,30],[560,66],[650,26],[742,62],[830,34],[920,70],[1010,30]];
  const l=pts.slice(1).map((p,i)=>`<path class="pl" d="M${pts[i][0]} ${pts[i][1]} C${(pts[i][0]+p[0])/2} ${pts[i][1]}, ${(pts[i][0]+p[0])/2} ${p[1]}, ${p[0]} ${p[1]}"/>`).join('');
  const c=pts.map((p,i)=>`<circle class="pd" style="animation-delay:${-i*.6}s" cx="${p[0]}" cy="${p[1]}" r="${i%3===0?4.5:3}"/>`).join('');
  return `<svg viewBox="0 0 1040 96" preserveAspectRatio="xMidYMid slice">${l}${c}</svg>`;
}

/* ============================================================
   NOTIFICATION ROUTING
   Severities on the left, channels on the right, one wire per
   rule. Packets travel the wires the way pages would.
   ============================================================ */
const RT_SRC=[
  {k:'s1',t:'SEV-1',d:'Customer-facing outage',c:'#ff4d78',rate:.9},
  {k:'s2',t:'SEV-2',d:'Degraded · budget burning',c:'#f5793b',rate:1.5},
  {k:'s3',t:'SEV-3',d:'One zone or one service',c:'#ffab2e',rate:2.4},
  {k:'s4',t:'SEV-4',d:'Worth knowing, not urgent',c:'#8a92a5',rate:3.6},
];
const RT_DST=[
  {k:'phone',t:'Phone call',d:'+62 812 •••• 4410',i:'i-phone'},
  {k:'push',t:'Push notification',d:'MeshScope app · iPhone 15',i:'i-bell'},
  {k:'slack',t:'Slack',d:'#sre-oncall',i:'i-hash'},
  {k:'email',t:'Email',d:'muhammad.alfian@…',i:'i-mail'},
  {k:'digest',t:'Morning digest',d:'09:00 WIB · weekdays',i:'i-inbox'},
];
const RT_WHEN=['Immediately','If not acked in 5m','If not acked in 10m','Batched hourly','Next digest'];
const RT_RULES=[
  {s:'s1',d:'phone',w:'Immediately',on:true},
  {s:'s1',d:'push',w:'Immediately',on:true},
  {s:'s1',d:'slack',w:'Immediately',on:true},
  {s:'s2',d:'push',w:'Immediately',on:true},
  {s:'s2',d:'slack',w:'Immediately',on:true},
  {s:'s2',d:'phone',w:'If not acked in 10m',on:true},
  {s:'s3',d:'slack',w:'Immediately',on:true},
  {s:'s3',d:'email',w:'Batched hourly',on:false},
  {s:'s4',d:'digest',w:'Next digest',on:true},
];
const rtKey=r=>r.s+'>'+r.d;
const rtSrc=k=>RT_SRC.find(s=>s.k===k), rtDst=k=>RT_DST.find(d=>d.k===k);

let rtRaf=0, rtLast=0, rtPk=[], rtWires=new Map(), rtPick=null, rtHover=null, rtView=null, rtSpawn={};
function rtStart(){ if(!rtView||rtRaf||REDUCED) return; rtLast=performance.now(); rtRaf=requestAnimationFrame(rtFrame); requestAnimationFrame(rtLayout); }
function rtStop(){ if(rtRaf) cancelAnimationFrame(rtRaf); rtRaf=0; }

function BUILD_routing(view){
  rtView=view;
  const node=(kind,x)=>kind==='src'
    ? `<button class="rt-node" data-src="${x.k}" style="--c:${x.c}">
        <span class="sw"></span><span class="b"><span class="t">${x.t}</span><span class="d">${x.d}</span></span>
        <span class="n" data-n></span></button>`
    : `<button class="rt-node" data-dst="${x.k}">
        <span class="ico-sq"><svg class="ico"><use href="#${x.i}"/></svg></span>
        <span class="b"><span class="t">${x.t}</span><span class="d">${x.d}</span></span>
        <span class="n" data-n></span><span class="act"></span></button>`;
  const week=['M','T','W','T','F','S','S'];
  const shifts=[[0,1,2],[0,1,2],[3,0,1],[2,3,0],[0,2,3],[1,1,3],[2,2,0]];   /* who covers each 8h block */
  const who=[{n:'You',c:'#3b46e8'},{n:'rina',c:'#2fbf8f'},{n:'ops-team',c:'#ffab2e'},{n:'dimas',c:'#8b6cf0'}];
  const today=(new Date().getDay()+6)%7;

  view.innerHTML=page('Notification routing','Decide what wakes you up, what waits in Slack, and what can sleep until the morning digest.',
    `<button class="btn-dark" id="rtTest" aria-haspopup="menu" aria-expanded="false"><svg class="ico"><use href="#i-bolt"/></svg> Send a test page <svg class="chev" style="width:11px;height:11px"><use href="#i-chev"/></svg></button>`,
  `<div class="set-wrap">
    <div class="set-main">
      <div class="card" data-stag style="margin-bottom:12px">
        <div class="card-h">${hsq('i-route')}<h3>Where alerts go</h3><span class="sp"></span>
          <span class="rt-hint" id="rtHint">Pick a severity, then a channel to connect or disconnect it</span></div>
        <div class="rt-canvas" id="rtCanvas">
          <svg class="rt-svg" id="rtSvg"><g id="rtW"></g><g id="rtP"></g></svg>
          <div class="rt-col src">${RT_SRC.map(s=>node('src',s)).join('')}</div>
          <div class="rt-col dst">${RT_DST.map(d=>node('dst',d)).join('')}</div>
        </div>
      </div>
      <div class="card" data-stag>
        <div class="card-h">${hsq('i-sliders')}<h3>Rules</h3><span class="sp"></span><span class="m" id="rtCount"></span></div>
        <div id="rtRules"></div>
      </div>
    </div>

    <aside class="set-side flow">
      <div class="card sum" data-stag>
        <div class="k">On call now</div>
        <div class="oc-now">
          <span class="avatar" id="rtAva">${ME.photo?'':initials(ME.name)}</span>
          <span style="flex:1;min-width:0"><span class="t">You</span><span class="m" id="rtLeft">until 18:00 WIB</span></span>
          <span class="here"><i></i>Live</span>
        </div>
        <div class="meter" style="margin:10px 0 4px"><i id="rtShift" style="width:0%;background:linear-gradient(90deg,#5b63f5,#3b46e8)"></i></div>
        <div class="kv" style="margin-top:0"><span>08:00</span><span>18:00</span></div>
        <div class="k" style="margin:14px 0 2px">Up next</div>
        <div class="oc-next"><span class="avatar" style="width:24px;height:24px;border-radius:8px;font-size:9px;background:#2fbf8f">RN</span>
          <span style="flex:1">rina</span><span class="mono">18:00 – 02:00</span></div>
        <div class="oc-next"><span class="avatar" style="width:24px;height:24px;border-radius:8px;font-size:9px;background:#ffab2e">OP</span>
          <span style="flex:1">ops-team</span><span class="mono">02:00 – 08:00</span></div>
        <div class="week" aria-label="This week's rota">${week.map((d,i)=>`
          <div class="wd${i===today?' today':''}">${shifts[i].map(p=>`<i style="background:${who[p].c}" title="${who[p].n}"></i>`).join('')}<span>${d}</span></div>`).join('')}</div>
        <div class="wlegend">${who.map(p=>`<span><i style="background:${p.c}"></i>${p.n}</span>`).join('')}</div>
        <button class="btn-s" id="rtSwap" style="width:100%;margin-top:12px" aria-haspopup="menu" aria-expanded="false">Ask someone to cover a shift</button>
      </div>

      <div class="card sum" data-stag>
        <div class="k">If nobody answers</div>
        <div class="esc">
          <div class="esc-s"><span class="tm">0m</span><span><span class="t">You</span><span class="m">push + phone call</span></span></div>
          <div class="esc-s"><span class="tm">5m</span><span><span class="t">rina</span><span class="m">push + phone call</span></span></div>
          <div class="esc-s"><span class="tm">15m</span><span><span class="t">ops-team lead</span><span class="m">phone call · Slack @here</span></span></div>
          <div class="esc-s"><span class="tm">30m</span><span><span class="t">Engineering manager</span><span class="m">phone call</span></span></div>
        </div>
      </div>

      <div class="card sum" data-stag>
        <div class="k" style="display:flex;align-items:center;gap:8px">
          <svg class="ico" style="width:13px;height:13px;stroke:var(--ink-3)"><use href="#i-moon"/></svg>Quiet hours
          <span style="flex:1"></span><button class="switch" id="qhOn" role="switch" aria-checked="true" aria-label="Quiet hours"></button></div>
        <div class="qh" id="qh"><div id="qhSegs"></div><span class="now" id="qhNow"></span>
          <button class="hd" id="qhA" aria-label="Quiet hours start"></button><button class="hd" id="qhB" aria-label="Quiet hours end"></button></div>
        <div class="qh-ax"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
        <div class="qh-txt" id="qhTxt"></div>
        <div class="set-row" style="padding:12px 0 0;border-top:0">
          <div class="lab2"><div class="t" style="font-size:11.5px">Let SEV-1 break through</div></div>
          <button class="switch" id="qhSev1" role="switch" aria-checked="true" aria-label="Let SEV-1 break through"></button></div>
      </div>
    </aside>
  </div>`);

  const cv=$('#rtCanvas',view);
  /* ---- wires ---- */
  rtWires=new Map();
  rtSync(true);
  new ResizeObserver(()=>rtLayout()).observe(cv);

  /* ---- picking: severity first, then a channel ---- */
  $$('[data-src]',cv).forEach(b=>{
    b.addEventListener('click',e=>{ e.stopPropagation(); rtPick = rtPick===b.dataset.src?null:b.dataset.src; rtPaint(); });
    b.addEventListener('pointerenter',()=>{ rtHover={src:b.dataset.src}; rtPaint(); });
    b.addEventListener('pointerleave',()=>{ rtHover=null; rtPaint(); });
  });
  $$('[data-dst]',cv).forEach(b=>{
    b.addEventListener('click',e=>{
      e.stopPropagation();
      if(!rtPick){ toast('Pick a severity on the left first'); bump($('[data-src]',cv)); return; }
      const i=RT_RULES.findIndex(r=>r.s===rtPick&&r.d===b.dataset.dst);
      const s=rtSrc(rtPick), d=rtDst(b.dataset.dst);
      if(i>=0){ RT_RULES.splice(i,1); toast(s.t+' no longer reaches '+d.t); }
      else{ RT_RULES.push({s:rtPick,d:b.dataset.dst,w:'Immediately',on:true}); toast(s.t+' now reaches '+d.t); }
      rtSync(); rtRules(); rtPaint();
    });
    b.addEventListener('pointerenter',()=>{ rtHover={dst:b.dataset.dst}; rtPaint(); });
    b.addEventListener('pointerleave',()=>{ rtHover=null; rtPaint(); });
  });
  cv.addEventListener('click',()=>{ if(rtPick){ rtPick=null; rtPaint(); } });

  rtRules(); rtPaint();

  /* ---- test page ---- */
  const tb=$('#rtTest',view);
  tb.addEventListener('click',()=>openPop(tb,{
    title:'Send a test at', width:236, align:'right',
    items:RT_SRC.map(s=>({label:s.t,sub:s.d,dot:s.c,v:s.k})),
    onPick(it){
      const live=RT_RULES.filter(r=>r.s===it.v&&r.on);
      if(!live.length){ toast(it.label+' has nowhere to go — connect a channel first'); return; }
      live.forEach((r,i)=>setTimeout(()=>rtLaunch(r,true),i*140));
      if(REDUCED) live.forEach(r=>rtHit(r.d));
      setTimeout(()=>toast('Test '+it.label+' delivered to '+live.length+' channel'+(live.length>1?'s':'')+' in 1.'+(2+live.length)+'s'),REDUCED?10:1500);
    }
  }));

  /* ---- on call ---- */
  const now=new Date(), h=now.getHours()+now.getMinutes()/60;
  const pct=clamp((h-8)/10,0,1), left=Math.max(0,18-h);
  setTimeout(()=>$('#rtShift',view).style.width=(pct*100)+'%',200);
  $('#rtLeft',view).textContent= h>=8&&h<18 ? `until 18:00 WIB · ${Math.floor(left)}h ${String(Math.round((left%1)*60)).padStart(2,'0')}m left` : 'next shift starts 08:00 WIB';
  if(ME.photo){ const a=$('#rtAva',view); a.style.backgroundImage=`url("${ME.photo}")`; a.classList.add('has-photo'); }
  const sw=$('#rtSwap',view);
  sw.addEventListener('click',()=>openPop(sw,{
    title:'Ask to cover today 08:00 – 18:00', width:250, align:'right',
    items:[{label:'rina',sub:'on call after you · usually says yes',dot:'#2fbf8f'},
           {label:'dimas',sub:'free today',dot:'#8b6cf0'},
           {label:'ops-team',sub:'whoever grabs it first',dot:'#ffab2e'}],
    onPick:it=>toast('Cover request sent to '+it.label)
  }));

  /* ---- quiet hours: drag either handle, snaps to the hour ---- */
  let qa=22, qb=7, qOn=true;
  const qh=$('#qh',view);
  const len=()=>((qb-qa+24)%24)||24;
  const fmt=x=>String(x%24).padStart(2,'0')+':00';
  const drawQ=()=>{
    const segs=qa<qb?[[qa,qb]]:[[qa,24],[0,qb]];
    $('#qhSegs',view).innerHTML=segs.map(([a,b])=>`<span class="qs" style="left:${a/24*100}%;width:${(b-a)/24*100}%"></span>`).join('');
    $('#qhA',view).style.left=(qa/24*100)+'%'; $('#qhB',view).style.left=(qb/24*100)+'%';
    const n=new Date(); $('#qhNow',view).style.left=((n.getHours()+n.getMinutes()/60)/24*100)+'%';
    $('#qhTxt',view).innerHTML=qOn
      ? `<b>${fmt(qa)} → ${fmt(qb)}</b> · ${len()} hours · push and email hold until morning`
      : 'Off — every rule fires around the clock';
    qh.classList.toggle('off',!qOn);
  };
  drawQ();
  [['#qhA','a'],['#qhB','b']].forEach(([sel,which])=>{
    const hd=$(sel,view);
    hd.addEventListener('pointerdown',e=>{
      e.preventDefault(); hd.setPointerCapture(e.pointerId); hd.classList.add('drag');
      const move=ev=>{
        const r=qh.getBoundingClientRect();
        let v=Math.round(clamp((ev.clientX-r.left)/r.width,0,1)*24)%24;
        if(which==='a'){ if(v!==qb) qa=v; } else { if(v!==qa) qb=v; }
        drawQ();
      };
      const up=()=>{ hd.classList.remove('drag'); hd.removeEventListener('pointermove',move); hd.removeEventListener('pointerup',up);
        toast('Quiet hours · '+fmt(qa)+' → '+fmt(qb)); };
      hd.addEventListener('pointermove',move); hd.addEventListener('pointerup',up);
    });
    hd.addEventListener('keydown',e=>{
      const d=e.key==='ArrowRight'||e.key==='ArrowUp'?1:e.key==='ArrowLeft'||e.key==='ArrowDown'?-1:0;
      if(!d) return; e.preventDefault(); e.stopPropagation();
      if(which==='a'){ const v=(qa+d+24)%24; if(v!==qb) qa=v; } else { const v=(qb+d+24)%24; if(v!==qa) qb=v; }
      drawQ();
    });
  });
  const qon=$('#qhOn',view);
  qon.addEventListener('click',()=>{ qOn=qon.getAttribute('aria-checked')!=='true'; qon.setAttribute('aria-checked',String(qOn)); drawQ();
    toast(qOn?'Quiet hours on':'Quiet hours off'); });
  const qs1=$('#qhSev1',view);
  qs1.addEventListener('click',()=>{ const on=qs1.getAttribute('aria-checked')!=='true'; qs1.setAttribute('aria-checked',String(on));
    toast(on?'SEV-1 still calls you during quiet hours':'Quiet hours now hold SEV-1 too — be sure'); });
}

/* one <path> per rule; new rules draw themselves in, deleted ones fade */
function rtSync(first){
  const g=$('#rtW',rtView), keep=new Set(RT_RULES.map(rtKey));
  rtWires.forEach((p,k)=>{ if(!keep.has(k)){
    rtWires.delete(k); p.classList.add('gone'); setTimeout(()=>p.remove(),REDUCED?10:360);
    rtPk=rtPk.filter(q=>q.k!==k); } });
  RT_RULES.forEach((r,i)=>{
    const k=rtKey(r);
    if(!rtWires.has(k)){
      const p=document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('class','rt-wire'); p.style.setProperty('--c',rtSrc(r.s).c);
      g.appendChild(p); rtWires.set(k,p);
      p.dataset.fresh=first?String(i):'0';
    }
  });
  rtLayout();
}
function rtLayout(){
  if(!rtView) return;
  const cv=$('#rtCanvas',rtView); if(!cv||!cv.offsetWidth) return;
  const cr=cv.getBoundingClientRect(), svg=$('#rtSvg',rtView);
  svg.setAttribute('viewBox',`0 0 ${cr.width} ${cr.height}`);
  RT_RULES.forEach(r=>{
    const p=rtWires.get(rtKey(r)); if(!p) return;
    const a=$(`[data-src="${r.s}"]`,cv).getBoundingClientRect(), b=$(`[data-dst="${r.d}"]`,cv).getBoundingClientRect();
    const ax=a.right-cr.left, ay=a.top+a.height/2-cr.top, bx=b.left-cr.left, by=b.top+b.height/2-cr.top;
    const dx=(bx-ax)*.5;
    p.setAttribute('d',`M${ax.toFixed(1)} ${ay.toFixed(1)} C${(ax+dx).toFixed(1)} ${ay.toFixed(1)}, ${(bx-dx).toFixed(1)} ${by.toFixed(1)}, ${bx.toFixed(1)} ${by.toFixed(1)}`);
    p.classList.toggle('off',!r.on);
    if(p.dataset.fresh!==undefined && r.on && !REDUCED){
      const L=p.getTotalLength(); p.style.setProperty('--len',L);
      p.style.animationDelay=(+p.dataset.fresh*0.07+0.15)+'s';
      p.classList.add('draw');
      p.addEventListener('animationend',()=>{ p.classList.remove('draw'); p.style.animationDelay=''; },{once:true});
    }
    delete p.dataset.fresh;
  });
}
/* highlight: hover > picked; count badges; the add/remove hints */
function rtPaint(){
  if(!rtView) return;
  const cv=$('#rtCanvas',rtView);
  const f=rtHover||(rtPick?{src:rtPick}:null);
  const match=r=>!f||(f.src&&r.s===f.src)||(f.dst&&r.d===f.dst)||(f.rule&&rtKey(r)===f.rule);
  RT_RULES.forEach(r=>{
    const p=rtWires.get(rtKey(r)); if(!p) return;
    p.classList.toggle('dim',!!f&&!match(r)); p.classList.toggle('hot',!!f&&match(r));
  });
  $$('[data-src]',cv).forEach(b=>{
    const k=b.dataset.src, n=RT_RULES.filter(r=>r.s===k&&r.on).length;
    $('[data-n]',b).textContent=n;
    b.classList.toggle('picked',rtPick===k);
    b.classList.toggle('dim',!!f && rtPick!==k && !(f.src===k || RT_RULES.some(r=>match(r)&&r.s===k)));
  });
  $$('[data-dst]',cv).forEach(b=>{
    const k=b.dataset.dst, n=RT_RULES.filter(r=>r.d===k&&r.on).length;
    $('[data-n]',b).textContent=n;
    const has=rtPick&&RT_RULES.some(r=>r.s===rtPick&&r.d===k);
    const act=$('.act',b); act.className='act '+(has?'rem':'add'); act.textContent=has?'−':'+';
    b.classList.toggle('dim',!!f && !rtPick && !(f.dst===k || RT_RULES.some(r=>match(r)&&r.d===k)));
  });
  rtPk.forEach(q=>q.el.classList.toggle('dim',!!f&&!match(RT_RULES.find(r=>rtKey(r)===q.k)||{})));
  cv.classList.toggle('picking',!!rtPick);
  const hint=$('#rtHint',rtView), s=rtPick&&rtSrc(rtPick);
  const txt=s?`${s.t} picked — click a channel to connect it (+) or disconnect it (−)`:'Pick a severity, then a channel to connect or disconnect it';
  if(hint.textContent!==txt) swap(hint,txt);
  $$('.rr',rtView).forEach(row=>row.classList.toggle('lit',!!f&&match(RT_RULES.find(r=>rtKey(r)===row.dataset.k)||{})));
}
function rtRules(){
  const box=$('#rtRules',rtView);
  const on=RT_RULES.filter(r=>r.on).length;
  $('#rtCount',rtView).textContent=`${on} of ${RT_RULES.length} on`;
  box.innerHTML=RT_SRC.map(s=>{
    const list=RT_RULES.filter(r=>r.s===s.k);
    if(!list.length) return `<div class="rr empty-r" data-stag><span class="status" style="background:${s.c}1f;color:${s.c}">${s.t}</span>
      <span class="dn" style="color:var(--ink-3)">Goes nowhere — pick ${s.t} above, then a channel.</span></div>`;
    return list.map(r=>{ const d=rtDst(r.d); return `
      <div class="rr${r.on?'':' off'}" data-k="${rtKey(r)}" data-stag>
        <span class="status" style="background:${s.c}1f;color:${s.c}">${s.t}</span>
        <span class="arrow"></span>
        <span class="dn"><span class="ico-sq"><svg class="ico"><use href="#${d.i}"/></svg></span><span class="nm">${d.t}<span class="d">${d.d}</span></span></span>
        <button class="pill-btn when" aria-haspopup="menu" aria-expanded="false"><span>${r.w}</span><svg class="chev" style="width:10px;height:10px"><use href="#i-chev"/></svg></button>
        <button class="switch" role="switch" aria-checked="${r.on}" aria-label="${s.t} to ${d.t}"></button>
        <button class="rr-x" aria-label="Delete rule"><svg class="ico"><use href="#i-x"/></svg></button>
      </div>`; }).join('');
  }).join('');
  $$('.rr[data-k]',box).forEach(row=>{
    const r=RT_RULES.find(x=>rtKey(x)===row.dataset.k);
    row.addEventListener('pointerenter',()=>{ rtHover={rule:row.dataset.k}; rtPaint(); });
    row.addEventListener('pointerleave',()=>{ rtHover=null; rtPaint(); });
    const swb=$('.switch',row);
    swb.addEventListener('click',()=>{
      r.on=!r.on; swb.setAttribute('aria-checked',String(r.on)); row.classList.toggle('off',!r.on);
      const p=rtWires.get(row.dataset.k); if(r.on&&p){ p.dataset.fresh='0'; }
      if(!r.on) rtPk=rtPk.filter(q=>q.k!==row.dataset.k);
      rtLayout(); rtPaint();
      $('#rtCount',rtView).textContent=`${RT_RULES.filter(x=>x.on).length} of ${RT_RULES.length} on`;
      toast(`${rtSrc(r.s).t} → ${rtDst(r.d).t} ${r.on?'on':'paused'}`);
    });
    const wb=$('.when',row);
    acMenu(wb,'Send it',RT_WHEN,v=>{ r.w=v; toast(`${rtSrc(r.s).t} → ${rtDst(r.d).t} · ${v.toLowerCase()}`); },210);
    $('.rr-x',row).addEventListener('click',()=>{
      fadeRemove(row,()=>{ RT_RULES.splice(RT_RULES.indexOf(r),1); rtHover=null; rtSync(); rtRules(); rtPaint(); });
      toast(`Deleted ${rtSrc(r.s).t} → ${rtDst(r.d).t}`);
    });
  });
  stagRows(box);
}
/* packets: SEV-1 fires most often, SEV-4 barely at all */
function rtLaunch(r,test){
  const p=rtWires.get(rtKey(r)); if(!p||!p.getAttribute('d')) return;
  const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
  c.setAttribute('r',test?4.6:2.8); c.setAttribute('class','rt-pk'+(test?' test':''));
  c.style.fill=rtSrc(r.s).c;
  const f=rtHover||(rtPick?{src:rtPick}:null);
  if(f && !((f.src&&r.s===f.src)||(f.dst&&r.d===f.dst)||(f.rule&&rtKey(r)===f.rule))) c.classList.add('dim');
  $('#rtP',rtView).appendChild(c);
  rtPk.push({k:rtKey(r),d:r.d,t:0,sp:test?.62:rnd(.34,.46),el:c,p,len:p.getTotalLength(),test});
}
function rtHit(dk){
  const b=$(`[data-dst="${dk}"]`,rtView); if(!b) return;
  b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
}
function rtFrame(now){
  const dt=Math.min(.05,(now-rtLast)/1000); rtLast=now;
  if(!rtView.classList.contains('on')){ rtRaf=0; return; }
  if(!document.hidden && playing){
    RT_RULES.forEach(r=>{
      if(!r.on) return;
      const k=rtKey(r), rate=rtSrc(r.s).rate*(r.w==='Immediately'?1:2.4);
      rtSpawn[k]=(rtSpawn[k]??rnd(0,rate))-dt;
      if(rtSpawn[k]<=0){ rtLaunch(r,false); rtSpawn[k]=rate*rnd(.7,1.3); }
    });
  }
  rtPk=rtPk.filter(q=>{
    q.t+=dt*q.sp;
    if(q.t>=1||!q.p.isConnected){ q.el.remove(); if(q.t>=1&&(q.test||Math.random()<.35)) rtHit(q.d); return false; }
    const e=q.t<.5?2*q.t*q.t:1-Math.pow(-2*q.t+2,2)/2;
    const pt=q.p.getPointAtLength(e*q.len);
    q.el.setAttribute('cx',pt.x.toFixed(1)); q.el.setAttribute('cy',pt.y.toFixed(1));
    q.el.style.opacity=q.t<.08?q.t/.08:q.t>.92?(1-q.t)/.08:1;
    return true;
  });
  rtRaf=requestAnimationFrame(rtFrame);
}

/* ============================================================
   KEYBOARD SHORTCUTS — the sheet, and the keys it describes
   ============================================================ */
const KS=[
  {g:'General',items:[[['?'],'Show this sheet'],[['/'],'Search services on the map'],[['['],'Collapse or expand the sidebar'],[['Esc'],'Close a menu, dialog or search']]},
  {g:'Topology map',items:[[['Space'],'Pause or resume the live stream'],[['R'],'Refresh the map'],[['L'],'Switch between map and grid layout'],
    [['F'],'Fit the whole mesh on screen'],[['+'],'Zoom in'],[['−'],'Zoom out'],[['D'],'Show or hide the bottom panels']]},
  {g:'Go to',items:[[['G','T'],'Topology'],[['G','S'],'Services'],[['G','Z'],'Zones'],[['G','R'],'Traces'],[['G','A'],'Alerts'],
    [['G','I'],'Incidents'],[['G','V'],'Saved views'],[['G','B'],'Runbooks'],[['G',','],'Settings'],[['G','P'],'Profile & preferences'],[['G','N'],'Notification routing']]},
];
const GOTO={t:'topology',s:'services',z:'zones',r:'traces',a:'alerts',i:'incidents',v:'saved',b:'runbooks',',':'settings',p:'profile',n:'routing'};
const keyName=e=>({' ':'Space',Escape:'Esc','-':'−','_':'−','=':'+'}[e.key]||(e.key.length===1?e.key.toUpperCase():e.key));

function openShortcuts(){
  if(modalEl&&modalEl.classList.contains('ks')) return;
  const m=openModal({
    cls:'wide ks', noFocus:true,
    title:'Keyboard shortcuts',
    sub:'Press any key to find it on this sheet. Shortcuts pause while you are typing in a field.',
    body:`<div class="search ks-search"><svg class="ico"><use href="#i-search"/></svg>
        <input type="search" id="ksQ" placeholder="Find a shortcut" aria-label="Find a shortcut"></div>
      <div class="ks-grid" id="ksGrid">${KS.map(g=>`
        <div class="ks-g"><h4>${g.g}</h4>${g.items.map(([keys,l])=>`
          <div class="ks-row" data-keys="${keys.join(' ')}"><span class="l">${l}</span>
            ${keys.map((k,i)=>(i?'<span class="then">then</span>':'')+`<kbd>${k}</kbd>`).join('')}</div>`).join('')}</div>`).join('')}
      </div><div class="empty" id="ksNone" hidden>No shortcut matches that.</div>`,
    note:`<span class="ks-last" id="ksLast">Last key <kbd>·</kbd></span>`,
    actions:[{label:'Done',solid:true}]
  });
  const q=$('#ksQ',m);
  q.addEventListener('input',()=>{
    const v=q.value.trim().toLowerCase(); let any=0;
    $$('.ks-g',m).forEach(g=>{ let n=0;
      $$('.ks-row',g).forEach(r=>{ const hit=!v||r.textContent.toLowerCase().includes(v)||r.dataset.keys.toLowerCase().includes(v);
        r.hidden=!hit; n+=hit; });
      g.hidden=!n; any+=n; });
    $('#ksNone',m).hidden=!!any;
  });
  if(!REDUCED) $$('.ks-row',m).forEach((r,i)=>r.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],
    {duration:380,delay:120+i*18,easing:'cubic-bezier(.23,1,.32,1)',fill:'backwards'}));
}
function ksFlash(e){
  const m=modalEl, k=keyName(e);
  if(e.target&&e.target.id==='ksQ') return;
  if(k==='/'){ e.preventDefault(); $('#ksQ',m).focus(); }
  if(k==='Space') e.preventDefault();
  const last=$('#ksLast kbd',m); last.textContent=k.length>6?k.slice(0,6):k; bump(last);
  let first=null;
  $$('.ks-row',m).forEach(r=>{
    const keys=r.dataset.keys.split(' ');
    if(!keys.includes(k)) return;
    first=first||r;
    r.classList.remove('hit'); void r.offsetWidth; r.classList.add('hit');
    $$('kbd',r).forEach(kb=>kb.classList.toggle('on',kb.textContent===k));
    setTimeout(()=>{ r.classList.remove('hit'); $$('kbd',r).forEach(kb=>kb.classList.remove('on')); },900);
  });
  if(first) first.scrollIntoView({block:'nearest',behavior:REDUCED?'auto':'smooth'});
}

/* the little "G then…" chip */
let gWait=false, gT=0, hintEl=null;
function keyHint(show){
  if(!hintEl){
    hintEl=el('div','keyhint');
    hintEl.innerHTML=`<kbd>G</kbd><span>then</span><kbd>T</kbd><span class="kh-l">topology</span><kbd>S</kbd><span class="kh-l">services</span>
      <kbd>A</kbd><span class="kh-l">alerts</span><kbd>N</kbd><span class="kh-l">routing</span><span class="kh-more">· ? for all</span>`;
    document.body.appendChild(hintEl); void hintEl.offsetWidth;
  }
  requestAnimationFrame(()=>hintEl.classList.toggle('on',show));
}
function clearG(){ gWait=false; clearTimeout(gT); keyHint(false); }

addEventListener('keydown',e=>{
  if($('#app').hidden||e.metaKey||e.ctrlKey||e.altKey) return;
  const ae=document.activeElement, tag=ae&&ae.tagName;
  if(modalEl){ if(modalEl.classList.contains('ks')) ksFlash(e); return; }
  if(['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
  if(pop) return;
  const k=e.key;
  if(k==='?'){ e.preventDefault(); clearG(); openShortcuts(); return; }
  if(gWait){
    const dest=GOTO[k.toLowerCase()]; clearG();
    if(dest){ e.preventDefault(); goRoute(dest); }
    return;
  }
  if(k==='g'||k==='G'){ gWait=true; keyHint(true); clearTimeout(gT); gT=setTimeout(clearG,1600); return; }
  const MAP={
    r:()=>refreshPulse(),
    l:()=>setLayout(layoutMode==='map'?'grid':'map'),
    f:()=>{ userMoved=false; fitView(true); toast('Fitted to screen'); },
    '+':()=>$('#zIn').click(), '=':()=>$('#zIn').click(), '-':()=>$('#zOut').click(),
    d:()=>$('#dockToggle').click(),
  };
  const fn=MAP[k.length===1?k.toLowerCase():k];
  if(!fn) return;
  if($('#app').dataset.route!=='topology'){ toast('That one works on the map · press G then T'); return; }
  e.preventDefault(); fn();
});
