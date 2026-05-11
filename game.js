// ══════════════════════════════════════════
// NEW GAME
// ══════════════════════════════════════════
let NG={step:1,ha:'home',starter:null,lineup:[],oppRoster:[],selectedOppId:null};

function initNewGame(){
  NG={step:1,ha:'home',starter:null,lineup:[],oppRoster:[],selectedOppId:null};
  document.getElementById('ng-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('ng-opp').value='';
  document.getElementById('ng-field').value='';
  document.getElementById('ng-temp').value='';
  document.getElementById('ng-cond').value='';
  document.getElementById('tog-home').classList.add('on');
  document.getElementById('tog-away').classList.remove('on');
  document.getElementById('ng-starter-pick').classList.remove('hidden');
  document.getElementById('ng-starter-chosen').classList.add('hidden');
  renderNGRoster();
  ngGoStep(1);
}

function ngGoStep(n){
  NG.step=n;
  [1,2,3].forEach(i=>document.getElementById('ng-s'+i).classList.toggle('hidden',i!==n));
  const dots=['ng-dot1','ng-dot2','ng-dot3'];
  dots.forEach((id,i)=>{ document.getElementById(id).style.background=i<n?'var(--accent)':'var(--bg4)'; });
  document.getElementById('ng-title').textContent=n===1?'New Game':n===2?'Opp Roster':'Batting Order';
  document.getElementById('ng-next').textContent=n===3?'Start →':'Next →';
  document.getElementById('ng-scroll').scrollTop=0;
  if(n===2) renderNGOppRoster();
  if(n===3){ renderNGLineup(); renderNGBench(); }
}

function ngNext(){
  if(NG.step===1){
    const opp=document.getElementById('ng-opp').value.trim();
    if(!opp){alert('Enter opponent name.');return;}
    if(!NG.starter){alert('Select a starting pitcher.');return;}
    if(!NG.oppRoster.length){
      const saved=(S.opponents||[]).find(o=>o.name.toLowerCase()===opp.toLowerCase());
      if(saved){NG.oppRoster=saved.roster.map(p=>({...p}));NG.selectedOppId=saved.id;}
    }
    ngGoStep(2);
  } else if(NG.step===2){
    ngGoStep(3);
  } else {
    startGame();
  }
}

function ngBack(){
  if(NG.step===1) go('home');
  else ngGoStep(NG.step-1);
}

function setHA(v){
  NG.ha=v;
  document.getElementById('tog-home').classList.toggle('on',v==='home');
  document.getElementById('tog-away').classList.toggle('on',v==='away');
}

function renderNGRoster(){
  const el=document.getElementById('ng-roster-btns');
  const active=S.pitchers.filter(p=>p.active!==false);
  if(!active.length){el.innerHTML='<div style="font-size:14px;color:var(--text3);">No pitchers in roster yet.</div>';return;}
  el.innerHTML=active.map(p=>{
    const isL=p.throws==='L';
    const tColor=isL?'var(--accent)':'var(--red)';
    const tBg=isL?'rgba(74,158,255,0.18)':'rgba(232,85,85,0.18)';
    return `<div class="p-select" onclick="pickStarter('${p.name}','${p.throws}','${p.num||''}')">
      <div class="p-av" style="background:${tBg};color:${tColor};">${p.throws||'R'}</div>
      <div><div style="font-size:15px;font-weight:700;">#${p.num||'—'} ${p.name}</div><div style="font-size:12px;color:var(--text2);">Throws ${p.throws}</div></div>
    </div>`;
  }).join('');
}
function pickStarter(name,throws,num){
  NG.starter={name,throws,num};
  document.getElementById('ng-starter-pick').classList.add('hidden');
  document.getElementById('ng-starter-chosen').classList.remove('hidden');
  const _isL=throws==='L';const _tC=_isL?'var(--accent)':'var(--red)';const _tB=_isL?'rgba(74,158,255,0.18)':'rgba(232,85,85,0.18)';
  document.getElementById('ng-starter-name').innerHTML=`<span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:30px;height:30px;border-radius:50%;background:${_tB};color:${_tC};font-size:13px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${throws||'R'}</span>#${num||'—'} ${name}</span>`;
}
function clearStarter(){
  NG.starter=null;
  document.getElementById('ng-starter-pick').classList.remove('hidden');
  document.getElementById('ng-starter-chosen').classList.add('hidden');
}
function showManualStarter(){
  mHand='R';
  showModal('Starting Pitcher',`
    <div class="fgroup"><label>Name</label><input type="text" id="ms-name" placeholder="Name..."></div>
    <div class="fgroup"><label>Jersey #</label><input type="number" id="ms-num"></div>
    <div class="fgroup"><label>Throws</label>
      <div class="hand-row">
        <div class="hand-btn L" onclick="setModalHand('L')">L</div>
        <div class="hand-btn R on" onclick="setModalHand('R')">R</div>
      </div>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveManualStarter()">Confirm</button>
  `);
}
function saveManualStarter(){
  const name=document.getElementById('ms-name').value.trim(); if(!name)return;
  pickStarter(name,mHand,document.getElementById('ms-num').value.trim());
  hideModal();
}

// ── Opponent Roster (Step 2) ──
function renderNGOppRoster(){
  const el=document.getElementById('ng-opp-roster');
  const empty=document.getElementById('ng-opp-empty');
  if(!el)return;
  if(!NG.oppRoster.length){el.innerHTML='';empty.style.display='';return;}
  empty.style.display='none';
  el.innerHTML=NG.oppRoster.map((p,i)=>{
    const {color,bg}=_batterCircle(p);
    return `<div class="drag-card" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;display:flex;align-items:center;gap:10px;">
      <div style="width:34px;height:34px;border-radius:50%;background:${bg};color:${color};font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${p.hand||'R'}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:700;">#${p.num||'—'} ${p.name}</div>
        ${p.pos?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">${p.pos.split(',').filter(Boolean).map(pos=>`<span style="font-size:11px;font-weight:700;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:2px 6px;color:var(--text2);">${pos}</span>`).join('')}</div>`:''}

      </div>
      <button onclick="editOppPlayer(${i})" style="background:none;border:none;color:var(--accent);font-size:13px;cursor:pointer;padding:4px 6px;flex-shrink:0;">Edit</button>
      <button onclick="removeOppPlayer(${i})" style="background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;padding:4px;flex-shrink:0;">✕</button>
    </div>`;
  }).join('');
}

function removeOppPlayer(i){NG.oppRoster.splice(i,1);renderNGOppRoster();}
function editOppPlayer(i){showAddOppPlayer(i);}

function showAddOppPlayer(editIdx=null){
  const p=editIdx!=null?NG.oppRoster[editIdx]:{};
  mHand=p.hand||'R';
  showModal(editIdx!=null?'Edit Player':'Add Player',`
    <div class="fgroup"><label>Name</label><input type="text" id="aop-name" value="${p.name||''}" placeholder="Player name..."></div>
    <div class="fgroup"><label>Jersey #</label><input type="number" id="aop-num" value="${p.num||''}"></div>
    <div class="fgroup"><label>Position <span style="font-size:11px;color:var(--text3);font-weight:400;">1=P 2=C 3=1B 4=2B 5=3B 6=SS 7=LF 8=CF 9=RF</span></label>
      ${posButtonsHTML(p.pos||'')}
    </div>
    <div class="fgroup"><label>Bats</label>
      <div class="hand-row">
        <div class="hand-btn L ${mHand==='L'?'on':''}" onclick="setModalHand('L')">L</div>
        <div class="hand-btn R ${mHand==='R'?'on':''}" onclick="setModalHand('R')">R</div>
        <div class="hand-btn S ${mHand==='S'?'on':''}" onclick="setModalHand('S')">S</div>
      </div>
    </div>
    <div class="btn-row" style="margin-top:8px;">
      ${editIdx!=null?`<button class="btn btn-danger" onclick="removeOppPlayer(${editIdx});hideModal();">Remove</button>`:''}
      <button class="btn btn-primary btn-block" onclick="saveOppPlayer(${editIdx!=null?editIdx:-1})">Save</button>
    </div>
  `);
}

function saveOppPlayer(idx){
  const name=document.getElementById('aop-name').value.trim(); if(!name)return;
  const p={name,num:document.getElementById('aop-num').value.trim(),pos:_mPos.join(','),hand:mHand};
  if(idx>=0) NG.oppRoster[idx]=p; else NG.oppRoster.push(p);
  hideModal(); renderNGOppRoster();
}

function showOppPaste(){
  showModal('Paste Roster',`
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">Paste from MaxPreps, a spreadsheet, or any list. One player per line. The app detects number, name, position, and L/R/S.</div>
    <textarea id="paste-txt" style="width:100%;height:150px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--rsm);color:var(--text);font-size:13px;padding:10px;resize:vertical;box-sizing:border-box;" placeholder="12  Smith, John   SS  R&#10;4   Jones, Mike   CF  L&#10;7   Davis, Tom    3B"></textarea>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn btn-block" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary btn-block" onclick="doOppPaste()">Import</button>
    </div>
  `);
}

function parseRosterPaste(text){
  const players=[];
  text.split('\n').map(l=>l.replace(/\t/g,' ').trim()).filter(l=>l.length>1).forEach(line=>{
    let rest=line,num='',name='',hand='',pos='';
    const numM=rest.match(/^#?(\d{1,3})\s+/);
    if(numM){num=numM[1];rest=rest.slice(numM[0].length).trim();}
    const handM=rest.match(/(?:^|\s)([LRS])(?:\s|$)/);
    if(handM){hand=handM[1];rest=rest.replace(handM[0],' ').trim();}
    const posM=rest.match(/(?:^|\s)(C|1B|2B|3B|SS|LF|CF|RF|OF|IF|DH|P|SP|RP)(?:\s|$)/i);
    if(posM){pos=posM[1].toUpperCase();rest=rest.replace(posM[0],' ').trim();}
    name=rest.replace(/\s+/g,' ').trim();
    if(name.includes(',')){const pts=name.split(',');name=(pts[1]||'').trim()+' '+(pts[0]||'').trim();}
    if(name.length>1) players.push({num,name,hand:hand||'R',pos});
  });
  return players;
}

function doOppPaste(){
  const text=document.getElementById('paste-txt').value;
  const players=parseRosterPaste(text);
  if(!players.length){alert('Could not parse any players. Try: #12 John Smith SS R');return;}
  NG.oppRoster=[...NG.oppRoster,...players];
  hideModal(); renderNGOppRoster();
}

// ── Saved Opponents ──
function showSavedOpponents(){
  if(!(S.opponents||[]).length){
    showModal('Saved Opponents',`<div style="color:var(--text2);text-align:center;padding:24px 0;font-size:14px;">No saved opponents yet.<br><br>After adding a roster, tap<br>"Save to opponent database".</div>`);
    return;
  }
  const cards=S.opponents.map((o,i)=>`
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:14px;cursor:pointer;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;" onclick="loadSavedOpponent(${i})">
      <div>
        <div style="font-size:16px;font-weight:700;">${o.name}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:3px;">${o.roster.length} players</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button onclick="event.stopPropagation();deleteOpponent(${i})" style="background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;padding:4px;">✕</button>
        <div style="color:var(--accent);font-size:14px;font-weight:600;">Select →</div>
      </div>
    </div>
  `).join('');
  showModal('Saved Opponents',`<div>${cards}</div>`);
}

function loadSavedOpponent(i){
  const o=S.opponents[i]; if(!o)return;
  document.getElementById('ng-opp').value=o.name;
  NG.selectedOppId=o.id;
  NG.oppRoster=o.roster.map(p=>({...p}));
  hideModal();
}

function deleteOpponent(i){
  S.opponents.splice(i,1); save(); showSavedOpponents();
}

// ── Standalone Opponents Screen ──
function showOpponents(){
  if(!S.opponents) S.opponents=[];
  const saved=S.opponents;
  const savedNames=new Set(saved.map(o=>o.name.toLowerCase()));
  const gameOnly=[...new Set((S.games||[]).map(g=>g.opp))].filter(n=>!savedNames.has(n.toLowerCase()));

  let html=`<button class="btn btn-primary btn-block" onclick="saNewOpponent()" style="margin-bottom:14px;">+ Add Opponent</button>`;

  if(saved.length){
    html+=saved.map((o,i)=>`
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="saEditOpponent(${i})">
        <div style="font-size:16px;font-weight:700;">${o.name}</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:12px;color:var(--text3);">${o.roster.length} players</div>
          <div style="color:var(--accent);font-size:20px;font-weight:300;">›</div>
        </div>
      </div>`).join('');
  }

  if(gameOnly.length){
    if(saved.length) html+=`<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin:12px 0 8px;">From Games — No Roster Saved</div>`;
    html+=gameOnly.map(name=>`
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="saNewOpponent(${JSON.stringify(name)})">
        <div style="font-size:16px;font-weight:700;color:var(--text);">${name}</div>
        <div style="font-size:12px;color:var(--accent);">Add Roster +</div>
      </div>`).join('');
  }

  if(!saved.length&&!gameOnly.length){
    html+=`<div class="empty" style="padding:32px 0;">No opponents yet.<br>Tap "+ Add Opponent" to get started.</div>`;
  }

  showModal('Opponents',`<div style="max-height:70vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">${html}</div>`);
}

function saNewOpponent(prefill=''){
  _saOpp={name:prefill,roster:[],idx:-1};
  showOpponentEdit();
}

function saEditOpponent(i){
  const o=S.opponents[i]; if(!o)return;
  _saOpp={name:o.name,roster:o.roster.map(p=>({...p})),idx:i};
  showOpponentEdit();
}

function showOpponentEdit(){
  if(!_saOpp)return;
  const isNew=_saOpp.idx<0;
  const rosterHTML=_saOpp.roster.length
    ?_saOpp.roster.map((p,i)=>`
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
        <div style="font-size:13px;color:var(--text3);width:30px;text-align:center;flex-shrink:0;">#${p.num||'—'}</div>
        <div style="flex:1;font-size:15px;font-weight:600;">${p.name}</div>
        <div style="font-size:11px;font-weight:700;background:var(--bg3);border:1px solid var(--border);border-radius:20px;padding:2px 8px;color:var(--text2);flex-shrink:0;">${p.hand||'R'}</div>
        <button onclick="saRemovePlayer(${i})" style="background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer;padding:4px 6px;flex-shrink:0;">✕</button>
      </div>`).join('')
    :`<div style="text-align:center;padding:20px 0;color:var(--text3);font-size:13px;">No players yet — import a roster below.</div>`;

  showModal(isNew?'New Opponent':'Edit Opponent',`
    <div class="fgroup"><label>Team Name</label><input type="text" id="sa-opp-name" value="${_saOpp.name}" placeholder="Opponent name..."></div>
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Roster · ${_saOpp.roster.length} players</div>
    <div style="max-height:34vh;overflow-y:auto;-webkit-overflow-scrolling:touch;margin-bottom:14px;">${rosterHTML}</div>
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <button class="btn btn-block" onclick="saImportPaste()" style="flex:1;">Paste Import</button>
      <button class="btn btn-block" onclick="saScan()" style="flex:1;">Scan Card</button>
    </div>
    <button class="btn btn-primary btn-block" onclick="saOppSave()" style="margin-bottom:${isNew?'0':'8px'};">Save</button>
    ${!isNew?`<button class="btn btn-danger btn-block" onclick="saOppDelete()">Delete Opponent</button>`:''}
  `);
}

function saRemovePlayer(i){ _saOpp.roster.splice(i,1); showOpponentEdit(); }

function saImportPaste(){
  showModal('Paste Roster',`
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">Paste from MaxPreps, a spreadsheet, or any list. One player per line. The app detects number, name, position, and L/R/S.</div>
    <textarea id="sa-paste-txt" style="width:100%;height:150px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--rsm);color:var(--text);font-size:13px;padding:10px;resize:vertical;box-sizing:border-box;" placeholder="12  Smith, John   SS  R&#10;4   Jones, Mike   CF  L&#10;7   Davis, Tom    3B"></textarea>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn btn-block" onclick="showOpponentEdit()">Cancel</button>
      <button class="btn btn-primary btn-block" onclick="saDoPaste()">Import</button>
    </div>
  `);
}

function saDoPaste(){
  const text=document.getElementById('sa-paste-txt').value;
  const players=parseRosterPaste(text);
  if(!players.length){alert('Could not parse any players. Try: #12 John Smith SS R');return;}
  _saOpp.roster=[..._saOpp.roster,...players];
  showOpponentEdit();
}

function saScan(){
  _ocrCtx='standalone';
  document.getElementById('ocr-camera-input').click();
}

function saOppSave(){
  const inp=document.getElementById('sa-opp-name');
  const name=inp?inp.value.trim():_saOpp.name;
  if(!name){alert('Enter a team name.');return;}
  if(!S.opponents) S.opponents=[];
  const entry={id:_saOpp.idx>=0?S.opponents[_saOpp.idx].id:'opp_'+Date.now(),name,roster:_saOpp.roster};
  if(_saOpp.idx>=0) S.opponents[_saOpp.idx]=entry;
  else S.opponents.push(entry);
  save(); _saOpp=null; showOpponents();
}

function saOppDelete(){
  if(_saOpp.idx<0){showOpponents();return;}
  if(!confirm('Delete '+_saOpp.name+'?'))return;
  S.opponents.splice(_saOpp.idx,1);
  save(); _saOpp=null; showOpponents();
}

function saveOpponentToRoster(){
  const name=document.getElementById('ng-opp').value.trim();
  if(!name){alert('Enter opponent name in Step 1 first.');return;}
  if(!NG.oppRoster.length){alert('Add players to the roster first.');return;}
  const ei=S.opponents.findIndex(o=>o.name.toLowerCase()===name.toLowerCase());
  const roster=NG.oppRoster.map(p=>({...p}));
  if(ei>=0) S.opponents[ei]={...S.opponents[ei],roster};
  else S.opponents.push({id:'opp_'+Date.now(),name,roster});
  save();
  showModal('Roster Saved',`<div style="text-align:center;padding:24px 0;"><div style="font-size:17px;font-weight:700;">${name}</div><div style="font-size:13px;color:var(--text2);margin-top:6px;">${roster.length} players saved to database</div><button class="btn btn-block" style="margin-top:16px;" onclick="hideModal()">Done</button></div>`);
}

// ── Batting Order (Step 3) ──
function renderNGLineup(){
  const el=document.getElementById('ng-lineup');
  const empty=document.getElementById('ng-lineup-empty');
  if(!el)return;
  if(!NG.lineup.length){el.innerHTML='';if(empty)empty.style.display='block';return;}
  if(empty)empty.style.display='none';
  el.innerHTML=NG.lineup.map((b,i)=>{
    const {color,bg}=_batterCircle(b);
    return `<div class="drag-card" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;display:flex;align-items:center;gap:10px;transition:opacity 0.15s,transform 0.15s;">
      <div style="font-size:13px;font-weight:800;color:var(--text3);width:18px;text-align:center;flex-shrink:0;">${i+1}</div>
      <div style="width:34px;height:34px;border-radius:50%;background:${bg};color:${color};font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${b.hand||'R'}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:700;">#${b.num||'—'} ${b.name}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:3px;flex-shrink:0;max-width:80px;">${(b.pos||'').split(',').filter(Boolean).map(pos=>`<span style="font-size:11px;font-weight:700;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:2px 5px;color:var(--text2);">${pos}</span>`).join('')}</div>
      <button onclick="removeFromLineup(${i})" style="background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;padding:4px;flex-shrink:0;">✕</button>
      <div class="drag-handle" onpointerdown="dgStart(NG.lineup,${i},'lineup',event)" style="cursor:grab;font-size:20px;color:var(--text3);padding:4px;user-select:none;touch-action:none;flex-shrink:0;">≡</div>
    </div>`;
  }).join('');
}

function renderNGBench(){
  const el=document.getElementById('ng-opp-bench');
  if(!el)return;
  if(!NG.oppRoster.length){
    el.innerHTML='<div style="font-size:13px;color:var(--text3);">No roster players. Go back to Step 2 to add players, or use "+ Add manually" below.</div>';
    return;
  }
  el.innerHTML=NG.oppRoster.map((p,i)=>{
    const {color,bg}=_batterCircle(p);
    const orderIdx=NG.lineup.findIndex(l=>l.name===p.name&&l.num===p.num);
    const orderNum=orderIdx>=0?orderIdx+1:null;
    return `<div onclick="toggleLineup(${i})" style="background:${orderNum?'rgba(74,158,255,0.08)':'var(--bg3)'};border:1px solid ${orderNum?'var(--accent)':'var(--border)'};border-radius:var(--r);padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all 0.15s;">
      ${orderNum
        ? `<div style="width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${orderNum}</div>`
        : `<div style="width:26px;height:26px;border-radius:50%;border:2px dashed var(--border);color:var(--text3);font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">+</div>`}
      <div style="width:34px;height:34px;border-radius:50%;background:${bg};color:${color};font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${p.hand||'R'}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:700;">#${p.num||'—'} ${p.name}</div>
        ${p.pos?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">${p.pos.split(',').filter(Boolean).map(pos=>`<span style="font-size:11px;font-weight:700;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:2px 6px;color:var(--text2);">${pos}</span>`).join('')}</div>`:''}

      </div>
    </div>`;
  }).join('');
}

function toggleLineup(rosterIdx){
  const p=NG.oppRoster[rosterIdx]; if(!p)return;
  const idx=NG.lineup.findIndex(l=>l.name===p.name&&l.num===p.num);
  if(idx>=0) NG.lineup.splice(idx,1);
  else NG.lineup.push({...p});
  renderNGLineup(); renderNGBench();
}

function removeFromLineup(i){
  NG.lineup.splice(i,1);
  renderNGLineup(); renderNGBench();
}

function showAddBatterManual(){
  mHand='R';
  showModal('Add to Lineup',`
    <div class="fgroup"><label>Name</label><input type="text" id="bm-name" placeholder="Name..."></div>
    <div class="fgroup"><label>Jersey #</label><input type="number" id="bm-num"></div>
    <div class="fgroup"><label>Position <span style="font-size:11px;color:var(--text3);font-weight:400;">1=P 2=C 3=1B 4=2B 5=3B 6=SS 7=LF 8=CF 9=RF</span></label>
      ${posButtonsHTML('')}
    </div>
    <div class="fgroup"><label>Bats</label>
      <div class="hand-row">
        <div class="hand-btn L" onclick="setModalHand('L')">L</div>
        <div class="hand-btn R on" onclick="setModalHand('R')">R</div>
        <div class="hand-btn S" onclick="setModalHand('S')">S</div>
      </div>
    </div>
    <button class="btn btn-primary btn-block" onclick="addBatterManual()">Add to Lineup</button>
  `);
}

function addBatterManual(){
  const name=document.getElementById('bm-name').value.trim(); if(!name)return;
  NG.lineup.push({name,num:document.getElementById('bm-num').value.trim(),pos:_mPos.join(','),hand:mHand});
  hideModal(); renderNGLineup(); renderNGBench();
}

// ── OCR Scan / Upload ──
let _ocrPlayers=[];
let _ocrCtx='newgame'; // 'newgame' | 'standalone'
let _saOpp=null; // standalone opponent editor state: {name, roster, idx}

function scanLineupCard(){ document.getElementById('ocr-camera-input').click(); }
function uploadLineupPhoto(){ document.getElementById('ocr-upload-input').click(); }

function handleOCRFile(input){
  const file=input.files[0]; if(!file)return;
  input.value='';
  doOCRScan(file);
}

async function doOCRScan(file){
  showModal('Reading Image',`
    <div style="text-align:center;padding:32px 0;">
      <div style="font-size:14px;color:var(--text2);margin-bottom:16px;">Analyzing lineup card...</div>
      <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;margin:0 20px;">
        <div id="ocr-bar" style="height:100%;background:var(--accent);width:0%;transition:width 0.3s;border-radius:2px;"></div>
      </div>
      <div id="ocr-pct" style="font-size:12px;color:var(--text3);margin-top:10px;">0%</div>
    </div>
  `);
  try {
    const result=await Tesseract.recognize(file,'eng',{
      logger: m=>{
        if(m.status==='recognizing text'){
          const pct=Math.round(m.progress*100);
          const bar=document.getElementById('ocr-bar');
          const lbl=document.getElementById('ocr-pct');
          if(bar) bar.style.width=pct+'%';
          if(lbl) lbl.textContent=pct+'%';
        }
      }
    });
    const players=parseRosterPaste(result.data.text);
    if(!players.length){
      showModal('No Players Detected',`
        <div style="padding:16px 0;">
          <div style="font-size:14px;color:var(--text2);margin-bottom:12px;">The app could not detect player data. Try better lighting, a straighter angle, or use Paste Import instead.</div>
          <div style="font-size:11px;color:var(--text3);background:var(--bg3);border-radius:var(--rsm);padding:10px;max-height:100px;overflow:auto;word-break:break-all;">${result.data.text.slice(0,400)||'(no text found)'}</div>
          <button class="btn btn-block" style="margin-top:14px;" onclick="hideModal()">Close</button>
        </div>
      `);
      return;
    }
    showOCRReview(players);
  } catch(err){
    showModal('Scan Failed',`
      <div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--text2);margin-bottom:14px;">Could not process the image. Make sure you have a network connection for the first scan, then try again.</div>
        <button class="btn btn-block" onclick="hideModal()">Close</button>
      </div>
    `);
  }
}

function showOCRReview(players){
  _ocrPlayers=players.map(p=>({...p}));
  const rows=_ocrPlayers.map((p,i)=>`
    <div style="display:flex;align-items:center;gap:6px;padding:8px 0;border-bottom:1px solid var(--border);">
      <input type="checkbox" id="ocr-chk-${i}" checked style="width:18px;height:18px;accent-color:var(--accent);flex-shrink:0;">
      <input type="text" value="${p.num}" placeholder="#" oninput="_ocrPlayers[${i}].num=this.value" style="width:38px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--rsm);color:var(--text);font-size:13px;padding:5px;text-align:center;flex-shrink:0;">
      <input type="text" value="${p.name}" oninput="_ocrPlayers[${i}].name=this.value" style="flex:1;min-width:0;background:var(--bg2);border:1px solid var(--border);border-radius:var(--rsm);color:var(--text);font-size:13px;padding:5px;">
      <select onchange="_ocrPlayers[${i}].hand=this.value" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--rsm);color:var(--text);font-size:13px;padding:5px;flex-shrink:0;">
        <option ${p.hand==='R'?'selected':''}>R</option>
        <option ${p.hand==='L'?'selected':''}>L</option>
        <option ${p.hand==='S'?'selected':''}>S</option>
      </select>
    </div>
  `).join('');
  showModal('Review & Confirm',`
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">Review detected players. Edit any errors, uncheck to skip.</div>
    <div style="max-height:340px;overflow-y:auto;">${rows}</div>
    <div style="display:flex;gap:8px;margin-top:14px;">
      <button class="btn btn-block" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary btn-block" onclick="confirmOCRPlayers()">Add to Roster</button>
    </div>
  `);
}

function confirmOCRPlayers(){
  _ocrPlayers.forEach((p,i)=>{
    const chk=document.getElementById('ocr-chk-'+i);
    if(chk&&chk.checked&&p.name.trim()){
      if(_ocrCtx==='standalone'&&_saOpp) _saOpp.roster.push({...p});
      else NG.oppRoster.push({...p});
    }
  });
  if(_ocrCtx==='standalone'){ _ocrCtx='newgame'; showOpponentEdit(); }
  else { hideModal(); renderNGOppRoster(); }
}

// ── Drag to Reorder ──
let _dg={on:false,list:null,ctx:null,idx:null,newIdx:null,clone:null,origCard:null,elTop:0,elH:0,startY:0};

function dgStart(list,idx,ctx,e){
  e.preventDefault();
  const card=e.currentTarget.closest('.drag-card'); if(!card)return;
  const rect=card.getBoundingClientRect();
  _dg={on:true,list,ctx,idx,newIdx:idx,startY:e.clientY,elTop:rect.top,elH:rect.height+8,origCard:card,clone:null};
  const clone=card.cloneNode(true);
  clone.style.cssText=`position:fixed;width:${rect.width}px;left:${rect.left}px;top:${rect.top}px;z-index:9999;pointer-events:none;opacity:0.95;box-shadow:0 8px 32px rgba(0,0,0,0.6);transition:none;border-radius:12px;`;
  document.body.appendChild(clone);
  _dg.clone=clone;
  card.style.opacity='0.2';
}

function dgMove(e){
  if(!_dg.on)return;
  e.preventDefault();
  const dy=e.clientY-_dg.startY;
  _dg.clone.style.top=(_dg.elTop+dy)+'px';
  const n=Math.max(0,Math.min(_dg.list.length-1,Math.round(_dg.idx+dy/_dg.elH)));
  if(n!==_dg.newIdx){
    _dg.newIdx=n;
    const cards=[..._dg.origCard.parentElement.querySelectorAll('.drag-card')];
    cards.forEach((c,i)=>{
      if(c===_dg.origCard){c.style.transform='';return;}
      if(_dg.idx<n&&i>_dg.idx&&i<=n) c.style.transform=`translateY(-${_dg.elH}px)`;
      else if(_dg.idx>n&&i>=n&&i<_dg.idx) c.style.transform=`translateY(${_dg.elH}px)`;
      else c.style.transform='';
    });
  }
}

function dgEnd(){
  if(!_dg.on)return;
  _dg.on=false;
  if(_dg.clone)_dg.clone.remove();
  if(_dg.newIdx!==_dg.idx){
    const item=_dg.list.splice(_dg.idx,1)[0];
    _dg.list.splice(_dg.newIdx,0,item);
  }
  if(_dg.ctx==='lineup'){renderNGLineup();renderNGBench();}
}

function startGame(){
  if(!NG.starter){alert('Select a starting pitcher.');return;}
  const opp=document.getElementById('ng-opp').value.trim();
  const id='g_'+Date.now();
  const game={
    id, opp, date:document.getElementById('ng-date').value,
    ha:NG.ha, field:document.getElementById('ng-field').value,
    temp:document.getElementById('ng-temp').value,
    cond:document.getElementById('ng-cond').value,
    ourScore:0, oppScore:0,
    inning:1, half:'top', outs:0, balls:0, strikes:0,
    runners:{b1:null,b2:null,b3:null},
    lineup:[...NG.lineup], batterIdx:0,
    pitchers:[{...NG.starter, appId:'a_'+Date.now(), inning:1, outs:0,
      pc:0, st:0, k:0, bb:0, hbp:0, h:0, er:0, ur:0, po:0}],
    pitcherIdx:0, pitches:[], events:[],
    abNum:1, abPitchNum:1,
    trackIntended: S.settings.trackIntendedDefault||false
  };
  S.games.push(game); S.activeId=id; G=game; save(); go('game');
}

// ══════════════════════════════════════════
// GAME RENDER
// ══════════════════════════════════════════
function _pShortName(name){
  if(!name) return '—';
  const parts=name.trim().split(/\s+/);
  if(parts.length<2) return name;
  return parts[0].charAt(0)+'. '+parts.slice(1).join(' ');
}

function renderGame(){
  if(!G)return;
  const p=curP();
  const b=curB();

  // pitcher line
  const pc=p?p.pc:0, st=p?p.st:0;
  const sp=pc?Math.round(st/pc*100):0;
  if(p){const pColor=p.throws==='L'?'var(--accent)':'var(--red)';const pBg=p.throws==='L'?'rgba(74,158,255,0.18)':'rgba(232,85,85,0.18)';document.getElementById('g-pitcher-name').innerHTML=`<span style="display:inline-flex;align-items:center;gap:5px;width:100%;overflow:hidden;"><span style="width:18px;height:18px;border-radius:50%;background:${pBg};color:${pColor};font-size:9px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${p.throws||'R'}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">#${p.num||'—'} ${_pShortName(p.name)}</span><span style="font-size:13px;flex-shrink:0;margin-left:4px;"><span style="color:var(--text3);font-weight:500;">P</span><span style="font-weight:800;"> ${pc}</span></span></span>`;}else{document.getElementById('g-pitcher-name').textContent='—';}
  document.getElementById('g-pitcher-stats').textContent=`St%: ${sp}%  K: ${p?p.k:0}  BB: ${p?p.bb:0}  H: ${p?p.h:0}`;

  // score + info
  document.getElementById('g-score').textContent=G.ourScore+' – '+G.oppScore;
  document.getElementById('g-info').textContent=G.opp+' · '+(G.ha==='home'?'HOME':'AWAY');

  // batter
  if(b){const {color,bg}=_batterCircle(b);document.getElementById('g-batter').innerHTML=`<span style="display:inline-flex;align-items:center;gap:5px;overflow:hidden;max-width:38vw;"><span style="width:20px;height:20px;border-radius:50%;background:${bg};color:${color};font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${b.hand||'R'}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.num?'#'+b.num+' ':''} ${b.name||'?'}</span> ▾</span>`;}else{document.getElementById('g-batter').textContent='— ▾';}

  // count
  document.getElementById('g-balls').textContent=G.balls;
  document.getElementById('g-strikes').textContent=G.strikes;

  // outs
  document.getElementById('op1').className='out-pip'+(G.outs>=1?' on':'');
  document.getElementById('op2').className='out-pip'+(G.outs>=2?' on':'');

  // inning
  document.getElementById('g-half').textContent=G.half==='top'?'▲':'▼';
  document.getElementById('g-inning').textContent=G.inning;
  document.getElementById('g-suffix').textContent=ordSuf(G.inning);

  // bases
  document.getElementById('b1b').className='bs bs-1b'+(G.runners.b1?' on':'');
  document.getElementById('b2b').className='bs bs-2b'+(G.runners.b2?' on':'');
  document.getElementById('b3b').className='bs bs-3b'+(G.runners.b3?' on':'');

  // silhouette / pitch list sides based on batter hand
  const hand=b?b.hand:'R';
  const lp=document.getElementById('left-panel');
  const rp=document.getElementById('right-panel');

  const ov=document.getElementById('batter-overlay');
  const ovImg=document.getElementById('batter-overlay-img');
  if(hand==='L'){
    // LHH: pitch list on left, silhouette spacer on right
    lp.className='pitch-panel';
    lp.style.width=''; lp.style.borderRight='none'; lp.style.borderLeft='none';
    rp.className='silhouette-panel';
    rp.style.width=''; rp.style.borderLeft='none'; rp.style.borderRight='none';
    rp.innerHTML='';
    if(ov){ ov.style.display='block'; ov.style.left='auto'; ov.style.right='0'; }
    if(ovImg) ovImg.style.transform='scaleX(-1)';
    renderPitchList(lp);
  } else {
    // RHH: silhouette spacer on left, pitch list on right
    lp.className='silhouette-panel';
    lp.style.width=''; lp.style.borderRight='none'; lp.style.borderLeft='none';
    lp.innerHTML='';
    rp.className='pitch-panel';
    rp.style.width=''; rp.style.borderLeft='none'; rp.style.borderRight='none';
    if(ov){ ov.style.display='block'; ov.style.left='0'; ov.style.right='auto'; }
    if(ovImg) ovImg.style.transform='';
    renderPitchList(rp);
  }

  // Field event button follows batter side
  const feBtn=document.querySelector('#screen-game .field-event-btn');
  if(feBtn){ if(hand==='L'){feBtn.style.left='8px';feBtn.style.right='auto';}else{feBtn.style.right='8px';feBtn.style.left='auto';} }

  drawZone();
  drawSpray();
  renderABHistory();
  requestAnimationFrame(alignPitchPanel);
}

function alignPitchPanel(){
  const zone=document.getElementById('zone-cv');
  const panel=document.getElementById('left-panel').classList.contains('pitch-panel')
    ?document.getElementById('left-panel')
    :document.getElementById('right-panel');
  if(!zone||!panel) return;
  const zoneRect=zone.getBoundingClientRect();
  const panelParentRect=panel.parentElement.getBoundingClientRect();
  const offset=Math.max(0,zoneRect.top-panelParentRect.top);
  panel.style.paddingTop=offset+'px';
}

function curP(){ return G?G.pitchers[G.pitcherIdx]:null; }
function curB(){
  if(!G||!G.lineup.length)return null;
  return G.lineup[G.batterIdx%G.lineup.length];
}
function ordSuf(n){
  if(n%10===1&&n%100!==11)return'st';
  if(n%10===2&&n%100!==12)return'nd';
  if(n%10===3&&n%100!==13)return'rd';
  return'th';
}

// ── Pitch color by family ──
function ptColor(type){
  if(['FB','2S','SI','FC'].includes(type)) return '#e85555';
  if(['SL','SV','CB'].includes(type)) return '#4a9eff';
  if(['CH','FS','FO','EP','KN'].includes(type)) return '#3dba7a';
  return '#9090a8';
}

// ── Pitch list ──
function renderPitchList(el){
  if(!G||!el)return;
  const abPitches=G.pitches.filter(p=>p.abNum===G.abNum);
  el.innerHTML=abPitches.map((p,i)=>{
    const col=ptColor(p.pt);
    const sym=rSym(p.rt);
    return `<div class="pitch-entry-item">
      <span class="pi-seq">${i+1}</span>
      <span class="pi-dot" style="background:${col};opacity:${p.rt==='ball'?0.35:1};border:${p.rt==='ball'?'1px solid '+col:'none'};"></span>
      <span class="pi-text">${p.pt}<br>${sym}${p.velo?' '+p.velo:''}</span>
    </div>`;
  }).join('');
}
function rSym(rt){
  const m={ball:'●',strike:'✦',foul:'F',swstr:'✗',k:'K',kc:'ꓘ',bb:'BB',hbp:'HBP',bip:'▶',d3k:'D3K',hbp:'HBP',ci:'CI',ibb:'IBB',other:'?',oob:'O'};
  return m[rt]||'?';
}

// ── AB History ──
function renderABHistory(){
  if(!G)return;
  const row=document.getElementById('ab-row');
  const curBatterName=curB()?.name||'';
  const prevABs=[...new Set(G.pitches.filter(p=>p.bName===curBatterName).map(p=>p.abNum))].filter(n=>n<G.abNum).slice(-6);
  if(!prevABs.length){ row.innerHTML='<div class="ab-empty">No previous at-bats</div>'; return; }
  row.innerHTML=prevABs.map(n=>{
    const last = G.pitches.filter(p=>p.abNum===n).pop();
    const result = summarizeABResult(last) || '';
    return `
      <div class="ab-thumb" onclick="showABDetails(${n})">
        <div class="ab-thumb-lbl">AB${n}</div>
        <canvas id="ab${n}" width="54" height="66"></canvas>
        <div class="ab-thumb-result">${result}</div>
      </div>
    `;
  }).join('');
  prevABs.forEach(n=>{
    const cv=document.getElementById('ab'+n); if(!cv)return;
    const ctx=cv.getContext('2d');
    const W=54,H=66;
    ctx.fillStyle='rgba(255,255,255,0.03)'; ctx.fillRect(0,0,W,H);
    // mini strike zone border
    ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1;
    ctx.strokeRect(W*0.2,H*0.2,W*0.6,H*0.6);
    G.pitches.filter(p=>p.abNum===n).forEach(p=>{
      if(p.zx==null)return;
      const x=p.zx*W,y=p.zy*H;
      const col=ptColor(p.pt);
      ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2);
      ctx.fillStyle=p.rt==='ball'?'transparent':col;
      ctx.strokeStyle=col; ctx.lineWidth=1;
      ctx.fill(); ctx.stroke();
    });
  });
}

// ══════════════════════════════════════════
// ZONE CANVAS
// ══════════════════════════════════════════
let pendingZX=null, pendingZY=null, zoneConfirmed=false;

function drawZone(){
  const cv=document.getElementById('zone-cv');
  const dpr=window.devicePixelRatio||1;
  const rect=cv.getBoundingClientRect();
  if(!rect.width)return;
  if(cv.width!==Math.round(rect.width*dpr)||cv.height!==Math.round(rect.height*dpr)){
    cv.width=Math.round(rect.width*dpr);
    cv.height=Math.round(rect.height*dpr);
  }
  const ctx=cv.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=rect.width, H=rect.height;
  ctx.clearRect(0,0,W,H);

  // outer bg — subtle dark fill so zone pops against any background
  ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,W,H);

  // outer 5x5 grid — visible but not dominant
  const cw=W/5, ch=H/5;
  ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=0.75;
  for(let i=1;i<5;i++){
    ctx.beginPath(); ctx.moveTo(i*cw,0); ctx.lineTo(i*cw,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i*ch); ctx.lineTo(W,i*ch); ctx.stroke();
  }

  // strike zone background — subtle tint so it reads as distinct in daylight
  const szX=cw, szY=ch, szW=cw*3, szH=ch*3;
  ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(szX,szY,szW,szH);

  // strike zone border — bright, thick, unmistakable
  ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=2.5;
  ctx.strokeRect(szX,szY,szW,szH);

  // inner sz grid (3x3) — clearly visible
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=0.75;
  for(let i=1;i<3;i++){
    ctx.beginPath(); ctx.moveTo(szX+i*(szW/3),szY); ctx.lineTo(szX+i*(szW/3),szY+szH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(szX,szY+i*(szH/3)); ctx.lineTo(szX+szW,szY+i*(szH/3)); ctx.stroke();
  }

  // pending tap dot
  if(pendingZX!==null){
    const x=pendingZX*W, y=pendingZY*H;
    ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.fill();
  }

  // logged pitches for this AB only
  if(!G)return;
  const abPitches=G.pitches.filter(p=>p.abNum===G.abNum);
  abPitches.forEach((p,i)=>{
    if(p.zx==null)return;
    if(p.izx!=null) drawIntendedDot(ctx,p.izx*W,p.izy*H,ptColor(p.pt));
    drawPitchDot(ctx,p.zx*W,p.zy*H,p,i+1);
  });
}


function drawPitchDot(ctx,x,y,pitch,seq){
  const r=9;
  const col=ptColor(pitch.pt);
  const rt=pitch.rt;
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);

  if(rt==='ball'){
    ctx.fillStyle='transparent'; ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.fill(); ctx.stroke();
  } else if(rt==='swstr'){
    ctx.fillStyle=col+'44'; ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.fill(); ctx.stroke();
    ctx.strokeStyle=col; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x-5,y-5); ctx.lineTo(x+5,y+5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+5,y-5); ctx.lineTo(x-5,y+5); ctx.stroke();
  } else if(rt==='foul'){
    ctx.fillStyle=col+'88'; ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.fill(); ctx.stroke();
  } else if(rt==='strike'||rt==='k'||rt==='kc'||rt==='d3k'){
    ctx.fillStyle=col; ctx.fill();
  } else if(rt==='bip'){
    const isOut=pitch.bipOut==='out'||pitch.bipOut==='error'||pitch.bipOut==='sac';
    ctx.fillStyle=isOut?'transparent':col;
    ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.fill(); ctx.stroke();
  } else if(rt==='bb'||rt==='ibb'){
    ctx.fillStyle='transparent'; ctx.strokeStyle='#4a9eff'; ctx.lineWidth=1.5; ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle=col+'88'; ctx.fill();
  }
  // sequence number
  ctx.fillStyle='#fff'; ctx.font='bold 9px -apple-system'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(seq,x,y);
}

function drawIntendedDot(ctx,ix,iy,col){
  // dashed ring — intended location indicator
  ctx.save();
  ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.arc(ix,iy,7,0,Math.PI*2);
  ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// Zone tap
document.getElementById('zone-cv').addEventListener('click',function(e){
  const rect=this.getBoundingClientRect();
  pendingZX=(e.clientX-rect.left)/rect.width;
  pendingZY=(e.clientY-rect.top)/rect.height;
  zoneConfirmed=false;
  drawZone();
  showEntryStep(1);
});

// ══════════════════════════════════════════
// SPRAY CANVAS
// ══════════════════════════════════════════
function drawSpray(){
  const cv=document.getElementById('spray-cv');
  if(!cv)return;
  const dpr=window.devicePixelRatio||1;
  const rect=cv.getBoundingClientRect();
  if(!rect.width)return;
  if(cv.width!==Math.round(rect.width*dpr)||cv.height!==Math.round(rect.height*dpr)){
    cv.width=Math.round(rect.width*dpr);
    cv.height=Math.round(rect.height*dpr);
  }
  const ctx=cv.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=rect.width, H=rect.height;
  ctx.clearRect(0,0,W,H);
  drawFieldShape(ctx,W,H);
  if(!G)return;
  const curBatterName=curB()?.name||'';
  const sb=getFieldBounds(W,H);
  drawSprayZoneOverlay(ctx,sb);
  G.pitches.filter(p=>p.bName===curBatterName).forEach(p=>{
    if(p.sx==null||p.sy==null)return;
    const x=sb.x+p.sx*sb.w, y=sb.y+p.sy*sb.h;
    let col='#9090a8';
    if(p.bipType==='GB') col='#4a9eff';
    else if(p.bipType==='LD') col='#f0873a';
    else if(p.bipType==='FLY'||p.rt==='hr') col='#e85555';
    else if(p.bipType==='PU') col='#9090a8';
    const isHR=p.rt==='hr';
    const isHit=p.bipOut==='hit'||isHR;
    const r=isHR?7:5;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=isHit?col:'transparent';
    ctx.strokeStyle=isHR?'#f5c842':col;
    ctx.lineWidth=p.hh?2.5:p.wc?1:1.5;
    if(p.wc){ctx.setLineDash([2,2]);}else{ctx.setLineDash([]);}
    ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    if(isHR){
      ctx.fillStyle='#f5c842';
      ctx.font='bold 7px -apple-system';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('HR',x,y);
    }
  });
}

let fieldImg=null;
window.addEventListener('load',()=>{
  fieldImg=new Image();
  fieldImg.onload = ()=>{
    drawSpray();
    drawSprayMod();
  };
  fieldImg.src='Field.png';
});

function getFieldBounds(W,H){
  if(!fieldImg||!fieldImg.complete||!fieldImg.width) return {x:0,y:0,w:W,h:H};
  const imgW=fieldImg.width, imgH=fieldImg.height;
  const scale=Math.min(W/imgW,H/imgH);
  const dw=imgW*scale, dh=imgH*scale;
  return {x:(W-dw)/2, y:(H-dh)/2, w:dw, h:dh};
}

function drawFieldShape(ctx,W,H){
  ctx.clearRect(0,0,W,H);
  if(fieldImg && fieldImg.complete){
    const b=getFieldBounds(W,H);
    ctx.drawImage(fieldImg,b.x,b.y,b.w,b.h);
  }
}

// Spray entry canvas in modifier step
let sprayModDot=null;
function drawSprayMod(){
  const cv=document.getElementById('spray-mod-cv'); if(!cv)return;
  const dpr=window.devicePixelRatio||1;
  const rect=cv.getBoundingClientRect();
  if(!rect.width)return;
  if(cv.width!==Math.round(rect.width*dpr)||cv.height!==Math.round(rect.height*dpr)){
    cv.width=Math.round(rect.width*dpr);
    cv.height=Math.round(rect.height*dpr);
  }
  const ctx=cv.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=rect.width, H=rect.height;
  ctx.clearRect(0,0,W,H);
  drawFieldShape(ctx,W,H);
  if(sprayModDot){
    const mb=getFieldBounds(W,H);
    const cx=mb.x+sprayModDot.x*mb.w, cy=mb.y+sprayModDot.y*mb.h;
    let col='#9090a8';
    if(CE.bipType==='GB') col='#4a9eff';
    else if(CE.bipType==='LD') col='#f0873a';
    else if(CE.bipType==='FLY'||CE.rt==='hr') col='#e85555';
    ctx.beginPath(); ctx.arc(cx,cy,6,0,Math.PI*2);
    ctx.fillStyle=(CE.bipOut==='hit'||CE.rt==='hr')?col:'transparent';
    ctx.strokeStyle=CE.rt==='hr'?'#f5c842':col;
    ctx.lineWidth=2; ctx.fill(); ctx.stroke();
  }
}
document.getElementById('spray-mod-cv').addEventListener('click',function(e){
  const rect=this.getBoundingClientRect();
  const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
  const b=getFieldBounds(rect.width,rect.height);
  const sx=Math.max(0,Math.min(1,(cx-b.x)/b.w));
  const sy=Math.max(0,Math.min(1,(cy-b.y)/b.h));
  sprayModDot={x:sx,y:sy};
  CE.sx=sx; CE.sy=sy;
  drawSprayMod();
});

// ══════════════════════════════════════════
// ENTRY FLOW
// ══════════════════════════════════════════
let CE={pt:null,velo:null,result:null,rt:null,isStrike:false,isTerm:false,bipType:null,bipOut:null,hh:false,wc:false,dp:false,fc:false,ro:false,roBase:null,roRunner:null,sx:null,sy:null,zx:null,zy:null,izx:null,izy:null,note:'',er:0,ur:0,hitBases:0,scoredRunners:[]};
let eStep=0;
let preHitRunners=null;

function showEntryStep(s){
  eStep=s;
  document.getElementById('entry-ov').classList.add('on');
  document.getElementById('step1').classList.toggle('hidden',s!==1);
  document.getElementById('step2').classList.toggle('hidden',s!==2);
  document.getElementById('step3').classList.toggle('hidden',s!==3);
  const titles=['','Pitch Type + Velocity','Result','Details'];
  document.getElementById('entry-title').textContent=titles[s];
  updateFEShortcut();
  const cb=document.getElementById('confirm-btn');
  if(s===1){
    cb.textContent='Next →'; cb.disabled=!CE.pt;
    updateZoneConfirmBar();
    _arsenalShowAll=false;
    applyArsenalFilter();
    // restore selected pt
    document.querySelectorAll('.pt-btn').forEach(b=>b.classList.remove('on'));
    if(CE.pt){
      document.querySelectorAll('.pt-btn').forEach(b=>{if(b.getAttribute('onclick').includes("'"+CE.pt+"'"))b.classList.add('on');});
    }
  } else if(s===2){
    cb.textContent='Next →'; cb.disabled=!CE.result;
    document.querySelectorAll('.r-btn').forEach(b=>b.classList.remove('on'));
    const _str=G?G.strikes:0, _bal=G?G.balls:0, _out=G?G.outs:0;
    const _r=G?G.runners:{b1:null,b2:null,b3:null};
    const _hasR=!!(_r.b1||_r.b2||_r.b3);
    function setRBtn(id,off){
      const el=document.getElementById(id); if(!el) return;
      el.disabled=off; el.style.opacity=off?'0.3':'1';
    }
    setRBtn('r-strike',  _str>=2);
    setRBtn('r-swstr',   _str>=2);
    setRBtn('r-k',       _str<2);
    setRBtn('r-kc',      _str<2);
    setRBtn('r-bb',      _bal<3);
    setRBtn('d3k-sw',    _str<2||(_r.b1&&_out<2));
    setRBtn('d3k-ca',    _str<2||(_r.b1&&_out<2));
    setRBtn('r-sac-fly', _out>=2||!_hasR);
    setRBtn('r-sac-bunt',_out>=2);
  } else if(s===3){
    cb.textContent='Log Pitch ✓'; cb.disabled=false;
    const isBIP=CE.rt==='bip'||CE.rt==='hr';

    // Spray chart for all BIP
    const spraySection=document.getElementById('spray-section-s3');
    if(spraySection) spraySection.classList.toggle('hidden',!isBIP);

    // BIP modifier buttons (contact quality, DP, FC, earned-suggest)
    document.getElementById('bip-mods').classList.toggle('hidden',!isBIP);

    if(isBIP){ sprayModDot=null; drawSprayMod(); }
    document.getElementById('mod-note').value='';

    // Preserve hit type before reset (for edit-flow)
    const prevHitBases=CE.hitBases||0;

    // Reset contact/play mods
    CE.hh=false; CE.wc=false; CE.dp=false; CE.fc=false; CE.ro=false; CE.roBase=null; CE.roRunner=null; CE.hitBases=0;
    ['hh','wc','dp','fc'].forEach(m=>{ const el=document.getElementById('mod-'+m); if(el)el.classList.remove('on'); });

    // Init runner cards for all terminal plays
    if(CE.isTerm){
      initRC('s3','runner-cards-s3',{
        rt:CE.rt, bipOut:CE.bipOut, bipType:CE.bipType,
        hitBases:prevHitBases||1, result:CE.result||''
      });
    } else {
      const rcEl=document.getElementById('runner-cards-s3');
      if(rcEl) rcEl.innerHTML='';
    }

    showEarnedSuggest();

    // Scroll arrow
    const body=document.getElementById('step3');
    const arrow=document.getElementById('scroll-arrow');
    if(arrow&&body){
      setTimeout(()=>{ arrow.style.opacity=body.scrollHeight>body.clientHeight?'1':'0'; },100);
      body.onscroll=()=>{
        const atBottom=body.scrollHeight-body.scrollTop<=body.clientHeight+10;
        if(arrow) arrow.style.opacity=atBottom?'0':'1';
      };
    }
  }
}

function updateZoneConfirmBar(){
  const bar=document.getElementById('zone-confirm-bar');
  const txt=document.getElementById('zone-loc-txt');
  if(pendingZX!==null){
    bar.style.display='flex';
    txt.textContent='Tap zone to adjust · ';
    if(zoneConfirmed) txt.textContent='Location set ✓ · tap to re-adjust';
  } else {
    bar.style.display='flex';
    txt.textContent='Tap the strike zone to place pitch location';
  }
}

function confirmZoneTap(){
  if(pendingZX===null)return;
  zoneConfirmed=true;
  CE.zx=pendingZX; CE.zy=pendingZY;
  document.getElementById('zone-confirm-bar').querySelector('button').textContent='Placed ✓';
  document.getElementById('zone-loc-txt').textContent='Location confirmed · tap zone to move';
}

// ── Intended Location Overlay ──────────────────────────
let _intPendingX=null, _intPendingY=null;
const _ptFamilyColor=pt=>({FB:'#e85555','2S':'#e8a455',SI:'#e8a455',FC:'#f5c842',SL:'#55a8e8',SV:'#558de8',CB:'#5568e8',CH:'#55e8a0',FS:'#55d4e8',FO:'#55e8d4',KN:'#a855e8',EP:'#e855d4',OT:'#9090a8'}[pt]||'#9090a8');

function showIntendedOverlay(){
  _intPendingX=null; _intPendingY=null;
  document.getElementById('int-pitch-label').textContent=(CE.pt||'?')+(CE.velo?' · '+CE.velo+' mph':'');
  document.getElementById('int-confirm-btn').disabled=true;
  document.getElementById('int-confirm-btn').style.opacity='0.5';
  document.getElementById('intended-ov').style.display='flex';
  drawIntendedZone();
}
function hideIntendedOverlay(){ document.getElementById('intended-ov').style.display='none'; }

function drawIntendedZone(){
  const cv=document.getElementById('int-zone-cv');
  const W=cv.width, H=cv.height;
  const ctx=cv.getContext('2d');
  ctx.clearRect(0,0,W,H);
  // match main zone canvas: 5x5 outer grid, center 3x3 = strike zone
  const cw=W/5, ch=H/5;
  const szX=cw, szY=ch, szW=cw*3, szH=ch*3;
  // outer 5x5 grid (shadow guides for out-of-zone placement)
  ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=0.75;
  for(let i=1;i<5;i++){
    ctx.beginPath(); ctx.moveTo(i*cw,0); ctx.lineTo(i*cw,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i*ch); ctx.lineTo(W,i*ch); ctx.stroke();
  }
  // strike zone box
  ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1.8; ctx.strokeRect(szX,szY,szW,szH);
  // inner 3x3 grid
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=0.8;
  [1,2].forEach(i=>{
    const x=szX+szW/3*i; ctx.beginPath(); ctx.moveTo(x,szY); ctx.lineTo(x,szY+szH); ctx.stroke();
    const y=szY+szH/3*i; ctx.beginPath(); ctx.moveTo(szX,y); ctx.lineTo(szX+szW,y); ctx.stroke();
  });
  // home plate dot
  ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(W/2,szY+szH+ch*0.4,3,0,Math.PI*2); ctx.fill();
  // actual dot in gray — canvas-relative coords (same system as zx/zy)
  if(CE.zx!=null){
    const ax=CE.zx*W, ay=CE.zy*H;
    ctx.beginPath(); ctx.arc(ax,ay,7,0,Math.PI*2);
    ctx.fillStyle='rgba(160,160,160,0.5)'; ctx.strokeStyle='rgba(200,200,200,0.8)'; ctx.lineWidth=1.5;
    ctx.fill(); ctx.stroke();
  }
  // intended pending dot — canvas-relative
  if(_intPendingX!=null){
    const ix=_intPendingX*W, iy=_intPendingY*H;
    const col=_ptFamilyColor(CE.pt);
    ctx.beginPath(); ctx.arc(ix,iy,7,0,Math.PI*2);
    ctx.fillStyle=col+'cc'; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
    ctx.fill(); ctx.stroke();
  }
}

document.getElementById('int-zone-cv').addEventListener('click',function(e){
  const rect=this.getBoundingClientRect();
  const W=this.width, H=this.height;
  // store canvas-relative (same coord system as zx/zy) — no clamping, allows out-of-zone
  _intPendingX=(e.clientX-rect.left)/rect.width;
  _intPendingY=(e.clientY-rect.top)/rect.height;
  document.getElementById('int-confirm-btn').disabled=false;
  document.getElementById('int-confirm-btn').style.opacity='1';
  drawIntendedZone();
});

function intendedSameSpot(){
  CE.izx=CE.zx; CE.izy=CE.zy;
  hideIntendedOverlay();
  showEntryStep(2);
}
function intendedConfirm(){
  if(_intPendingX===null)return;
  CE.izx=_intPendingX; CE.izy=_intPendingY;
  hideIntendedOverlay();
  showEntryStep(2);
}

function pickPT(type){
  CE.pt=type;
  document.querySelectorAll('.pt-btn').forEach(b=>b.classList.remove('on'));
  event.currentTarget.classList.add('on');
  document.getElementById('confirm-btn').disabled=false;
}

function pickR(result,rt,isStrike,isTerm,bipType,bipOut){
  // Auto-convert to strikeout if 2 strikes and this is a strike (not foul/BIP)
  if(G.strikes>=2 && isStrike && !isTerm && rt!=='foul' && rt!=='bip'){
    rt='k'; isTerm=true; result='K (Swing)';
  }
  CE.result=result; CE.rt=rt; CE.isStrike=isStrike; CE.isTerm=isTerm||false;
  CE.bipType=bipType||null; CE.bipOut=bipOut||null;
  document.querySelectorAll('.r-btn').forEach(b=>b.classList.remove('on'));
  event.currentTarget.classList.add('on');
  document.getElementById('confirm-btn').disabled=false;
  updateFEShortcut();
}

function toggleMod(m){
  CE[m]=!CE[m];
  const el=document.getElementById('mod-'+m);
  if(el) el.classList.toggle('on',CE[m]);
}

function toggleRO(){
  CE.ro=!CE.ro;
  const btn=document.getElementById('mod-ro');
  if(btn) btn.classList.toggle('on',CE.ro);
  if(!CE.ro){
    if(CE.roBase&&CE.roRunner) G.runners[CE.roBase]=CE.roRunner;
    CE.roBase=null; CE.roRunner=null;
    syncBaseEditor();
  }
  renderROPicker();
}

function renderROPicker(){
  const wrap=document.getElementById('ro-picker');
  if(!wrap) return;
  if(!CE.ro||!G){ wrap.style.display='none'; return; }
  wrap.style.display='';
  const baseLabel={b1:'1st',b2:'2nd',b3:'3rd'};
  const candidates=['b1','b2','b3'].map(key=>{
    const runner=G.runners[key]||(CE.roBase===key?CE.roRunner:null);
    return runner?{key,runner}:null;
  }).filter(Boolean);
  if(!candidates.length){
    wrap.innerHTML='<div style="font-size:12px;color:var(--text3);text-align:center;padding:4px 0;">No runners on base to select</div>';
    return;
  }
  wrap.innerHTML='<div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Which runner was out?</div>'+
    '<div style="display:flex;gap:6px;">'+
    candidates.map(({key,runner})=>{
      const sel=CE.roBase===key;
      const name=runner.num?'#'+runner.num:(runner.name?(runner.name.split(' ').pop()||'?'):'?');
      return `<button onclick="pickRORunner('${key}')" style="flex:1;padding:8px 4px;border-radius:var(--rsm);border:1.5px solid ${sel?'var(--red)':'var(--border2)'};background:${sel?'rgba(232,85,85,0.15)':'var(--bg3)'};color:${sel?'var(--red)':'var(--text)'};font-size:13px;font-weight:700;cursor:pointer;text-align:center;">${baseLabel[key]}<br><span style="font-size:10px;font-weight:400;color:${sel?'var(--red)':'var(--text2)'};">${name}</span></button>`;
    }).join('')+
    '</div>';
}

function pickRORunner(key){
  if(CE.roBase===key){
    if(CE.roRunner) G.runners[key]=CE.roRunner;
    CE.roBase=null; CE.roRunner=null;
  } else {
    if(CE.roBase&&CE.roRunner) G.runners[CE.roBase]=CE.roRunner;
    CE.roRunner=G.runners[key]||null;
    CE.roBase=key;
    G.runners[key]=null;
  }
  syncBaseEditor();
  renderROPicker();
}

function toggleContact(type){
  if(type==='hh'){ CE.hh=!CE.hh; CE.wc=false; }
  else { CE.wc=!CE.wc; CE.hh=false; }
  const hh=document.getElementById('mod-hh');
  const wc=document.getElementById('mod-wc');
  if(hh) hh.classList.toggle('on',CE.hh);
  if(wc) wc.classList.toggle('on',CE.wc);
}

function pickHitType(bases){
  CE.hitBases=bases;
  ['single','double','triple'].forEach((t,i)=>{
    const el=document.getElementById('ht-'+t);
    if(el) el.classList.toggle('on',i+1===bases);
  });
  // update result label
  const labels={1:'Single',2:'Double',3:'Triple'};
  CE.result=CE.result.replace(/\s*·\s*(Single|Double|Triple)/,'')+'  · '+labels[bases];

  // reset runner-out selection when hit type changes (positions shift)
  if(CE.roBase){ CE.roBase=null; CE.roRunner=null; }
  // auto-advance runners immediately
  autoAdvanceRunners(bases);
  syncBaseEditor();
  renderROPicker();
  showEarnedSuggest();
  autoFillRuns();
}

function autoAdvanceRunners(bases){
  if(!G||!bases) return;
  const r=preHitRunners||G.runners;
  const newR={b1:null,b2:null,b3:null};
  const batter=makeRunner(curB(),'hit');

  if(bases>=4){
    // HR — bases clear
  } else {
    if(r.b3 && bases>=1){ /* scores */ }
    else if(r.b3) newR.b3=r.b3;

    if(r.b2){
      const dest=2+bases;
      if(dest===3) newR.b3=r.b2;
      else if(dest>=4){ /* scores */ }
    }

    if(r.b1){
      const dest=1+bases;
      if(dest===2) newR.b2=r.b1;
      else if(dest===3) newR.b3=r.b1;
      else if(dest>=4){ /* scores */ }
    }

    // batter
    if(bases===1) newR.b1=batter;
    else if(bases===2) newR.b2=batter;
    else if(bases===3) newR.b3=batter;
  }

  G.runners=newR;
}

function getReachedVia(){
  if(CE.rt==='bb'||CE.rt==='ibb') return 'bb';
  if(CE.rt==='hbp') return 'hbp';
  if(CE.rt==='ci') return 'bb';
  if(CE.rt==='d3k') return 'error';
  if(CE.bipOut==='error') return 'error';
  return 'hit';
}

function autoAdvanceForWalk(rt){
  if(!G) return;
  const r=preHitRunners||G.runners;
  const rv=rt==='hbp'?'hbp':rt==='d3k'?'pb':'bb';
  const batter=makeRunner(curB(),rv);
  const newR={b1:batter, b2:r.b2, b3:r.b3};
  if(r.b1){
    newR.b2=r.b1;
    if(r.b2){
      newR.b3=r.b2;
      // if r.b3 existed it scores (newR.b3 = r.b2, r.b3 is gone)
    }
  }
  G.runners=newR;
}

function predictRuns(){
  if(!G||!preHitRunners) return {er:0,ur:0};
  const before=[preHitRunners.b1,preHitRunners.b2,preHitRunners.b3].filter(r=>r&&typeof r==='object');
  const after=[G.runners.b1,G.runners.b2,G.runners.b3].filter(r=>r&&typeof r==='object');
  const scored=[];
  before.forEach(r=>{
    const key=r.num+'|'+r.name;
    if(!after.some(a=>a.num+'|'+a.name===key)) scored.push(r);
  });
  if(CE.rt==='hr'){
    const b=curB();
    scored.push({reachedVia:'hit', num:b?.num||'', name:b?.name||''});
  }
  let er=0,ur=0;
  scored.forEach(r=>{ r.reachedVia==='error'?ur++:er++; });
  return {er,ur};
}

function autoFillRuns(){
  const {er,ur}=predictRuns();
  const erEl=document.getElementById('mod-er');
  const urEl=document.getElementById('mod-ur');
  if(erEl) erEl.value=er;
  if(urEl) urEl.value=ur;
}

function syncBaseEditor(){
  if(!G) return;
  ['1b','2b','3b'].forEach(b=>{
    const key='b'+b.charAt(0);
    const el=document.getElementById('be-'+b);
    const numEl=document.getElementById('be-'+b+'-num');
    if(!el) return;
    const occupied=!!G.runners[key];
    el.style.background=occupied?'var(--yellow)':'var(--bg3)';
    el.style.borderColor=occupied?'var(--yellow)':'var(--text3)';
    if(numEl){
      numEl.style.color=occupied?'#000':'var(--text2)';
      numEl.textContent=occupied?getRunnerNum(b):'';
    }
  });
}

function getRunnerNum(base){
  if(!G) return '';
  const key='b'+base.charAt(0);
  const runner=G.runners[key];
  if(!runner) return '';
  if(typeof runner!=='object') return '?';
  if(runner.num) return '#'+runner.num;
  if(runner.name) return runner.name.split(' ').map(w=>w&&w[0]).filter(Boolean).join('').substring(0,2).toUpperCase();
  return '?';
}

function showEarnedSuggest(){
  const el=document.getElementById('earned-suggest');
  if(!el||!G) return;
  const errorTypes=['Ground Error','Line Error','Fly Error','Pop Up Error','Catchers Int.'];
  const inningPitches=G.pitches.filter(p=>p.inning===G.inning&&p.half===G.half);
  const hasError=inningPitches.some(p=>errorTypes.includes(p.result));
  const hasPB=G.events&&G.events.some(e=>e.type==='Passed Ball'&&e.inning===G.inning&&e.half===G.half);
  if(hasError||hasPB){
    el.style.display='block';
    el.textContent='⚠ Error or passed ball this inning — check earned vs unearned';
  } else {
    el.style.display='none';
  }
}

function toggleBase(b){
  if(!G) return;
  const key='b'+b.charAt(0);
  if(G.runners[key]){
    G.runners[key]=null;
  } else {
    const pre=preHitRunners&&preHitRunners[key];
    G.runners[key]=pre?{...pre}:makeRunner(curB(),getReachedVia());
  }
  syncBaseEditor();
}

function cancelEntry(){ document.getElementById('entry-ov').classList.remove('on'); }

function updateFEShortcut(){
  const btn=document.getElementById('fe-shortcut-btn');
  if(!btn) return;
  const show=eStep===2&&['ball','strike','foul','swstr'].includes(CE.rt);
  btn.style.display=show?'':'none';
}

function logAndFE(){
  if(!CE.result||!['ball','strike','foul','swstr'].includes(CE.rt)) return;
  logPitch();
  showFieldEvent();
}

function confirmStep(){
  if(eStep===1){
    CE.velo=document.getElementById('velo-in').value?parseInt(document.getElementById('velo-in').value):null;
    document.getElementById('velo-in').value='';
    // use confirmed location or pending
    if(!zoneConfirmed&&pendingZX!==null){ CE.zx=pendingZX; CE.zy=pendingZY; }
    // show intended overlay before advancing if tracking is on and zone was placed
    if(G&&G.trackIntended&&CE.zx!=null&&CE.izx==null){ showIntendedOverlay(); return; }
    showEntryStep(2);
  } else if(eStep===2){
    if(!CE.result)return;
    const simple=['ball','strike','foul','swstr'].includes(CE.rt);
    if(simple){ logPitch(); }
    else{ showEntryStep(3); }
  } else if(eStep===3){
    CE.note=document.getElementById('mod-note').value;
    if(CE.isTerm) applyRCMoves();
    logPitch();
  }
}

function logPitch(){
  if(!G)return;
  const p=curP();
  const pitch={
    id:'p_'+Date.now()+'_'+Math.random().toString(36).substr(2,4),
    appId:p?p.appId:'',
    abNum:G.abNum, abPitchNum:G.abPitchNum,
    inning:G.inning, half:G.half,
    outsBefore:G.outs, ballsBefore:G.balls, strikesBefore:G.strikes,
    runners:{...G.runners},
    bHand:curB()?.hand||'R', bName:curB()?.name||'',
    ha:G.ha,
    pt:CE.pt, velo:CE.velo,
    result:CE.result, rt:CE.rt,
    isStrike:CE.isStrike, isTerm:CE.isTerm,
    bipType:CE.bipType, bipOut:CE.bipOut,
    hh:CE.hh, wc:CE.wc, dp:CE.dp, fc:CE.fc, ro:CE.ro, hitBases:CE.hitBases,
    sx:CE.sx, sy:CE.sy, zx:CE.zx, zy:CE.zy, izx:CE.izx, izy:CE.izy,
    note:CE.note, er:CE.er, ur:CE.ur,
    scoredRunners:CE.scoredRunners.slice(),
    ts:Date.now()
  };
  G.pitches.push(pitch);

  // update pitcher stats
  if(p){
    p.pc++;
    if(pitch.isStrike) p.st++;
    if(pitch.rt==='k'||pitch.rt==='kc'||pitch.rt==='d3k') p.k++;
    if(pitch.rt==='bb'||pitch.rt==='ibb') p.bb++;
    if(pitch.rt==='hbp') p.hbp++;
    if(pitch.bipOut==='hit'||pitch.rt==='hr') p.h++;
    if(pitch.rt==='hr') p.hr=(p.hr||0)+1;
    p.er+=pitch.er; p.ur+=pitch.ur;
  }
  G.ourScore+=(pitch.er+pitch.ur);

  advanceCount(pitch);
  pendingZX=null; pendingZY=null; zoneConfirmed=false;
  sprayModDot=null;
  CE={pt:null,velo:null,result:null,rt:null,isStrike:false,isTerm:false,bipType:null,bipOut:null,hh:false,wc:false,dp:false,fc:false,ro:false,sx:null,sy:null,zx:null,zy:null,izx:null,izy:null,note:'',er:0,ur:0,hitBases:0,scoredRunners:[]};
  cancelEntry();
  save(); renderGame();
}

function advanceCount(pitch){
  const rt=pitch.rt;
  if(!pitch.isTerm){
    if(rt==='ball') G.balls++;
    else if(rt==='strike') G.strikes++;
    else if(rt==='foul'){ if(G.strikes<2) G.strikes++; }
    else if(rt==='swstr') G.strikes++;
    G.abPitchNum++;
    return;
  }
  // terminal — reset count, record outs
  const p=curP();
  G.abPitchNum=1;
  if(rt==='k'||rt==='kc'){
    G.outs++; if(p)p.po++;
  } else if(rt==='d3k'){
    // pitcher K, batter reaches safely — no out recorded
  } else if(rt==='hr'){
    // no outs, bases cleared via RC
  } else if(rt==='bip'){
    if(pitch.bipOut==='out'||pitch.bipOut==='sac'){ G.outs++; if(p)p.po++; }
    if(pitch.dp){ G.outs++; if(p)p.po++; }
  } else if(rt==='other'&&pitch.result.includes('Out')){ G.outs++; if(p)p.po++; }
  else if(rt==='oob'){ G.outs++; if(p)p.po++; }
  if(pitch.ro){ G.outs++; if(p)p.po++; }

  G.balls=0; G.strikes=0;
  if(G.outs>=3){
    G.abNum++;
    G.batterIdx=(G.batterIdx+1)%(G.lineup.length||9);
    showInningSummary(); return;
  }
  G.abNum++;
  G.batterIdx=(G.batterIdx+1)%(G.lineup.length||9);
}

// ══════════════════════════════════════════
// UNDO
// ══════════════════════════════════════════
function undoLast(){
  const overlayOpen=document.getElementById('entry-ov').classList.contains('on');
  if(overlayOpen){
    if(eStep===3){ showEntryStep(2); return; }
    if(eStep===2){ showEntryStep(1); return; }
    cancelEntry(); return;
  }
  if(!G||!G.pitches.length) return;
  editLastPitchFromSummary();
}

// ══════════════════════════════════════════
// INNING SUMMARY
// ══════════════════════════════════════════
function showInningSummary(){
  cancelEntry();
  renderInningSummary();
  document.getElementById('inning-modal').classList.add('on');
}

function renderInningSummary(){
  if(!G) return;
  const inn=G.inning, half=G.half;
  const ip=G.pitches.filter(p=>p.inning===inn&&p.half===half);
  const st=ip.filter(p=>p.isStrike).length;
  const k=ip.filter(p=>p.rt==='k'||p.rt==='kc').length;
  const bb=ip.filter(p=>p.rt==='bb'||p.rt==='ibb').length;
  const h=ip.filter(p=>p.bipOut==='hit'||p.rt==='hr').length;
  const er=ip.reduce((a,p)=>a+(p.er||0),0);

  // outing grade for current pitcher's full appearance so far
  const _curPitch=curP();
  const _outingPs=_curPitch?G.pitches.filter(p=>p.appId===_curPitch.appId):ip;
  const _outingGrade=S.settings.showOutingGrades!==false?computeOutingGrade(_outingPs,S.team.level||'hs'):null;

  // build inning-by-inning rows
  const groups={};
  G.pitches.forEach(p=>{
    const key=`${p.inning}_${p.half}`;
    if(!groups[key]) groups[key]={inning:p.inning,half:p.half,pitches:0,strikes:0,k:0,bb:0,h:0,er:0};
    const g=groups[key];
    g.pitches++;
    if(p.isStrike) g.strikes++;
    if(p.rt==='k'||p.rt==='kc') g.k++;
    if(p.rt==='bb'||p.rt==='ibb'||p.rt==='hbp') g.bb++;
    if(p.bipOut==='hit'||p.rt==='hr') g.h++;
    g.er+=(p.er||0);
  });
  const rows=Object.values(groups).sort((a,b)=>{
    if(a.inning!==b.inning) return a.inning-b.inning;
    return a.half==='top'?-1:1;
  });
  const totals=rows.reduce((acc,r)=>({
    pitches:acc.pitches+r.pitches, strikes:acc.strikes+r.strikes,
    k:acc.k+r.k, bb:acc.bb+r.bb, h:acc.h+r.h, er:acc.er+r.er
  }),{pitches:0,strikes:0,k:0,bb:0,h:0,er:0});

  document.getElementById('inning-modal-title').textContent=(half==='top'?'▲':'▼')+' '+inn+ordSuf(inn)+' · End of Inning';
  document.getElementById('inning-modal-body').innerHTML=`
    ${_outingGrade?`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:10px 14px;background:var(--bg3);border-radius:var(--rsm);">
      <div style="font-size:12px;color:var(--text2);font-weight:600;">${_curPitch?_curPitch.name+' — Outing Grade':'Outing Grade'}</div>
      <div style="display:flex;align-items:center;gap:8px;">${_gradeChip(_outingGrade,'font-size:18px;padding:4px 12px;')}<span style="font-size:11px;color:var(--text3);">${_outingGrade.score}</span></div>
    </div>`:''}
    <!-- This half inning chips -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;">${ip.length}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">Pitches</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;">${ip.length?Math.round(st/ip.length*100):0}%</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">Strike%</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:var(--green);">${k}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">K</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:var(--accent);">${bb}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">BB</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;">${h}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">H</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:${er>0?'var(--red)':''};">${er}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">ER</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;grid-column:span 2;">
        <div style="font-size:20px;font-weight:800;">${st} / ${ip.length}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">Strikes / Pitches</div>
      </div>
    </div>

    <!-- Outing by inning table -->
    <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Outing by Inning</div>
    <div style="border:1px solid var(--border);border-radius:var(--rsm);overflow:hidden;margin-bottom:14px;">
      <div style="display:grid;grid-template-columns:1.2fr repeat(7,1fr);padding:7px 10px;background:var(--bg3);font-size:10px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:0.3px;">
        <div>Inn</div><div>P</div><div>S</div><div>S%</div><div>K</div><div>BB</div><div>H</div><div>ER</div>
      </div>
      ${rows.map(r=>`
        <div style="display:grid;grid-template-columns:1.2fr repeat(7,1fr);padding:8px 10px;border-top:1px solid var(--border);font-size:12px;${r.inning===inn&&r.half===half?'background:rgba(74,158,255,0.08);color:var(--accent);font-weight:600;':'color:var(--text);'}">
          <div>${r.half==='top'?'▲':'▼'}${r.inning}</div>
          <div>${r.pitches}</div><div>${r.strikes}</div>
          <div>${r.pitches?Math.round(r.strikes/r.pitches*100):0}%</div>
          <div>${r.k}</div><div>${r.bb}</div><div>${r.h}</div><div>${r.er}</div>
        </div>
      `).join('')}
      <div style="display:grid;grid-template-columns:1.2fr repeat(7,1fr);padding:8px 10px;border-top:1px solid var(--border2);font-size:12px;font-weight:700;background:var(--bg3);">
        <div>Total</div>
        <div>${totals.pitches}</div><div>${totals.strikes}</div>
        <div>${totals.pitches?Math.round(totals.strikes/totals.pitches*100):0}%</div>
        <div>${totals.k}</div><div>${totals.bb}</div><div>${totals.h}</div><div>${totals.er}</div>
      </div>
    </div>

    <!-- Pitch log — tappable to edit -->
    <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Pitch Log — Tap to edit</div>
    <div style="display:flex;flex-direction:column;gap:4px;">
      ${ip.map((p,i)=>`
        <div onclick="editPitchFromSummary('${p.id}')"
          style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg3);border-radius:var(--rsm);cursor:pointer;active:background:var(--bg4);">
          <div style="width:22px;height:22px;border-radius:50%;background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--text2);flex-shrink:0;">${i+1}</div>
          <div style="flex:1;">
            <span style="font-weight:700;color:var(--accent);font-size:13px;">${p.pt||'—'}</span>
            ${p.velo?`<span style="color:var(--text3);font-size:11px;margin-left:5px;">${p.velo}mph</span>`:''}
            ${p.hh?'<span style="color:var(--orange);font-size:10px;margin-left:5px;">HH</span>':''}
            ${p.wc?'<span style="color:var(--accent);font-size:10px;margin-left:5px;">WC</span>':''}
          </div>
          <div style="font-size:12px;color:var(--text);font-weight:500;text-align:right;">${p.result||'—'}</div>
          <div style="font-size:12px;color:var(--text3);">✎</div>
        </div>
      `).join('')}
    </div>
  `;
}
function hideInningSummary(){ document.getElementById('inning-modal').classList.remove('on'); }

function editPitchFromSummary(pitchId){
  const pitch=G.pitches.find(p=>p.id===pitchId);
  if(!pitch) return;
  // remove all pitches after this one, then edit it
  const idx=G.pitches.findIndex(p=>p.id===pitchId);
  // revert all pitches from the end back to this one
  for(let i=G.pitches.length-1;i>=idx;i--){
    revertPitchStats(G.pitches[i]);
  }
  G.pitches.splice(idx);
  hideInningSummary();
  // restore game state to before this pitch
  G.balls=pitch.ballsBefore;
  G.strikes=pitch.strikesBefore;
  G.outs=pitch.outsBefore;
  G.runners={...pitch.runners};
  G.abNum=pitch.abNum;
  G.abPitchNum=pitch.abPitchNum;
  const batterInLineup=G.lineup.findIndex(b=>b.name===pitch.bName);
  if(batterInLineup>=0) G.batterIdx=batterInLineup;
  // pre-populate CE
  CE.pt=pitch.pt; CE.velo=pitch.velo; CE.result=pitch.result; CE.rt=pitch.rt;
  CE.isStrike=pitch.isStrike; CE.isTerm=pitch.isTerm;
  CE.bipType=pitch.bipType; CE.bipOut=pitch.bipOut;
  CE.hh=pitch.hh||false; CE.wc=pitch.wc||false;
  CE.dp=pitch.dp||false; CE.fc=pitch.fc||false; CE.ro=pitch.ro||false;
  CE.sx=pitch.sx; CE.sy=pitch.sy; CE.zx=pitch.zx; CE.zy=pitch.zy; CE.izx=pitch.izx||null; CE.izy=pitch.izy||null;
  CE.note=pitch.note||''; CE.er=pitch.er||0; CE.ur=pitch.ur||0;
  CE.hitBases=pitch.hitBases||0; CE.scoredRunners=(pitch.scoredRunners||[]).slice();
  pendingZX=pitch.zx; pendingZY=pitch.zy;
  zoneConfirmed=pitch.zx!=null;
  save(); renderGame();
  showEntryStep(1);
}

function editLastPitchFromSummary(){
  if(!G||!G.pitches.length){ hideInningSummary(); return; }
  const last=G.pitches[G.pitches.length-1];
  editPitchFromSummary(last.id);
}

function revertPitchStats(pitch){
  const p=curP();
  if(!p) return;
  p.pc--;
  if(pitch.isStrike) p.st--;
  if(pitch.rt==='k'||pitch.rt==='kc'||pitch.rt==='d3k') p.k--;
  if(pitch.rt==='bb'||pitch.rt==='ibb') p.bb--;
  if(pitch.rt==='hbp') p.hbp--;
  if(pitch.bipOut==='hit'||pitch.rt==='hr') p.h--;
  if(pitch.rt==='hr') p.hr=Math.max(0,(p.hr||1)-1);
  p.er-=(pitch.er||0); p.ur-=(pitch.ur||0);
  G.ourScore-=((pitch.er||0)+(pitch.ur||0));
  if(pitch.isTerm){
    if(pitch.rt==='k'||pitch.rt==='kc'){ G.outs--; if(p.po>0)p.po--; }
    else if(pitch.rt==='bip'){
      if(pitch.bipOut==='out'||pitch.bipOut==='sac'){ G.outs--; if(p.po>0)p.po--; }
      if(pitch.dp){ G.outs--; if(p.po>0)p.po--; }
    } else if(pitch.rt==='other'&&pitch.result.includes('Out')){ G.outs--; if(p.po>0)p.po--; }
    else if(pitch.rt==='oob'){ G.outs--; if(p.po>0)p.po--; }
    if(pitch.ro){ G.outs--; if(p.po>0)p.po--; }
  }
}

function nextInning(){
  G.outs=0; G.balls=0; G.strikes=0;
  G.runners={b1:null,b2:null,b3:null};
  if(G.half==='top') G.half='bottom';
  else { G.inning++; G.half='top'; }
  hideInningSummary(); save(); renderGame();
}

// ══════════════════════════════════════════
// UNIFIED RUNNER CARDS (RC) SYSTEM
// ══════════════════════════════════════════
let RC={context:null,containerId:null,entries:[]};

function initRC(context,containerId,opts){
  opts=opts||{};
  RC.context=context; RC.containerId=containerId; RC.entries=[];
  if(context==='s3'){
    const pre=G?{b1:G.runners.b1,b2:G.runners.b2,b3:G.runners.b3}:{b1:null,b2:null,b3:null};
    preHitRunners=pre;
    const rt=opts.rt,bipOut=opts.bipOut,bipType=opts.bipType,hitBases=opts.hitBases||1,result=opts.result||'';
    const isHit=rt==='bip'&&bipOut==='hit';
    const isError=rt==='bip'&&bipOut==='error';
    const isSac=rt==='bip'&&bipOut==='sac';
    const isWalk=rt==='bb'||rt==='hbp'||rt==='ibb'||rt==='ci';
    const isD3K=rt==='d3k';
    const isHR=rt==='hr';
    const isOtherSafe=rt==='other'&&!result.includes('Out');
    const batterSafe=isHit||isError||isWalk||isD3K||isHR||isOtherSafe;
    if(batterSafe){
      const rv=(isError||isD3K)?'error':isWalk?(rt==='hbp'?'hbp':(rt==='ibb'?'ibb':'bb')):isHR?'hr':'hit';
      const bd=isHR?'score':(isWalk||isD3K||isError)?'1b':(isHit?(hitBases===3?'3b':hitBases===2?'2b':'1b'):'1b');
      RC.entries.push({key:'batter',runner:makeRunner(curB(),rv),startBase:null,dest:bd,fixed:isWalk||isD3K||isError||isHR,advErr:false,earnedOverride:null,autoSet:true});
      if(isHit){
        const initLabel={1:'Single',2:'Double',3:'Triple'}[bd==='3b'?3:bd==='2b'?2:1]||'Single';
        CE.result=(CE.result||'').replace(/\s*·\s*(Single|Double|Triple)/,'')+' · '+initLabel;
      }
    }
    const sacType=isSac?(bipType==='FLY'?'fly':'bunt'):null;
    const advBases=isHit?hitBases:isHR?4:isError?1:0;
    const dests=_rcRunnerDests(advBases,(isWalk||isD3K),pre,sacType);
    [{key:'b3',base:'3B',runner:pre.b3},{key:'b2',base:'2B',runner:pre.b2},{key:'b1',base:'1B',runner:pre.b1}].forEach(({key,base,runner})=>{
      if(!runner)return;
      RC.entries.push({key,runner,startBase:base,dest:dests[key]||null,fixed:isHR,advErr:false,earnedOverride:null,autoSet:true});
    });
  } else if(context==='fe'){
    if(!G)return;
    [{key:'b3',base:'3B',runner:G.runners.b3},{key:'b2',base:'2B',runner:G.runners.b2},{key:'b1',base:'1B',runner:G.runners.b1}].forEach(({key,base,runner})=>{
      if(!runner)return;
      RC.entries.push({key,runner,startBase:base,dest:_feMoves[key]||null,fixed:false,advErr:false,earnedOverride:null,autoSet:true});
    });
  }
  renderRunnerCards();
}

function _rcRunnerDests(hitBases,batterToFirst,pre,sacType){
  const d={};
  if(hitBases>0){
    if(pre.b3) d.b3='score';
    if(pre.b2){const t=2+hitBases; if(t===3)d.b2='3b'; else if(t>=4)d.b2='score';}
    if(pre.b1){const t=1+hitBases; if(t===2)d.b1='2b'; else if(t===3)d.b1='3b'; else if(t>=4)d.b1='score';}
  } else if(batterToFirst){
    if(pre.b1){
      d.b1='2b';
      if(pre.b2){d.b2='3b'; if(pre.b3)d.b3='score';}
    }
  } else if(sacType==='fly'){
    if(pre.b3)d.b3='score';
    // b1 and b2 hold by default — coach overrides if they tag and advance
  } else if(sacType==='bunt'){
    if(pre.b1)d.b1='2b';
    if(pre.b2)d.b2='3b';
    if(pre.b3)d.b3='score';
  }
  return d;
}

function rcGetProjected(){
  const proj={b1:null,b2:null,b3:null,outs:[],scored:[]};
  RC.entries.forEach(({key,runner,startBase,dest})=>{
    const eff=dest!==null?dest:(key!=='batter'&&startBase?(startBase==='3B'?'3b':startBase==='2B'?'2b':'1b'):null);
    if(!eff)return;
    if(eff==='out'){proj.outs.push(runner);return;}
    if(eff==='score'){proj.scored.push(runner);return;}
    const bk='b'+eff.charAt(0);
    if(bk in proj)proj[bk]=runner;
  });
  return proj;
}

function renderRunnerCards(){
  const el=document.getElementById(RC.containerId);
  if(!el)return;
  if(!RC.entries.length){
    el.innerHTML=RC.context==='fe'?'<div style="color:var(--text3);font-size:13px;text-align:center;padding:8px 0;">No runners on base</div>':'';
    return;
  }
  const proj=rcGetProjected();
  el.innerHTML=_rcDiamondHTML(proj)+RC.entries.map(_rcCardHTML).join('');
}

function _rcDiamondHTML(proj){
  const bDiv=(key,xform,extra)=>{
    const r=proj[key];
    const num=r?(r.num?'#'+r.num:'?'):'';
    const on=!!r;
    return `<div style="position:absolute;${extra||''}width:36px;height:36px;transform:${xform};border:2px solid ${on?'var(--yellow)':'var(--text3)'};background:${on?'var(--yellow)':'var(--bg4)'};border-radius:2px;transition:background 0.15s,border-color 0.15s;display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(-45deg);font-size:${num.length>3?'9px':'11px'};font-weight:700;color:${on?'#000':'var(--text3)'};">${num}</span></div>`;
  };
  const col=(label,items,color)=>`<div style="width:50px;flex-shrink:0;text-align:center;"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${label}</div>${items.length?items.map(r=>`<div style="font-size:11px;font-weight:700;color:${color};line-height:1.7;">${r.num?'#'+r.num:'?'}</div>`).join(''):'<div style="font-size:10px;color:var(--text3);">—</div>'}</div>`;
  return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;padding:10px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--rsm);">${col('Outs',proj.outs,'var(--red)')}<div style="flex:1;display:flex;justify-content:center;align-items:center;"><div style="position:relative;width:110px;height:82px;">${bDiv('b2','translateX(-50%) rotate(45deg)','top:0;left:50%;')}${bDiv('b1','rotate(45deg)','bottom:0;right:0;')}${bDiv('b3','rotate(45deg)','bottom:0;left:0;')}</div></div>${col('Scored',proj.scored,'var(--green)')}</div>`;
}

function _rcCardHTML(entry){
  const {key,runner,startBase,dest,fixed,advErr,earnedOverride}=entry;
  const isBatter=key==='batter';
  const num=runner.num?'#'+runner.num:(runner.name||'—');
  const baseLabel=isBatter?'Batter':startBase;
  const stay=!isBatter?(startBase==='3B'?'3b':startBase==='2B'?'2b':'1b'):null;
  const effDest=dest!==null?dest:(stay||null);
  const isScoring=dest==='score'||(fixed&&dest==='score');
  const autoEarned=isScoring?calcRunEarnedDefault(runner):null;
  const earned=earnedOverride!==null?earnedOverride:autoEarned;
  const showWarn=advErr&&isScoring&&earned;
  const border=dest===null?'var(--border)':(dest==='out'?'var(--red)':dest==='score'?'var(--green)':'var(--accent)');
  const badgeBg=isBatter?'var(--accent)':'var(--yellow)';
  const badgeColor=isBatter?'#fff':'#000';
  const dBtns=[];
  if(isBatter){
    dBtns.push({d:'1b',label:'1B'},{d:'2b',label:'2B'},{d:'3b',label:'3B'});
  } else {
    dBtns.push({d:stay,label:startBase});
    if(startBase==='1B'){dBtns.push({d:'2b',label:'2B'},{d:'3b',label:'3B'});}
    if(startBase==='2B'){dBtns.push({d:'3b',label:'3B'});}
    dBtns.push({d:'score',label:'Run Scores',color:'var(--green)'});
    dBtns.push({d:'out',label:'Out',color:'var(--red)'});
  }
  const btn=(d,label,color)=>{
    color=color||'var(--accent)';
    const active=effDest===d;
    return `<button onclick="setRCDest('${key}','${d}')" style="flex:1;padding:7px 3px;border-radius:var(--rsm);border:1.5px solid ${active?color:'var(--border2)'};background:${active?color:'var(--bg3)'};color:${active?'#fff':'var(--text2)'};font-size:11px;font-weight:700;cursor:pointer;min-width:0;overflow:hidden;">${label}</button>`;
  };
  const fixLbl=dest==='score'?'Run Scores →':dest==='1b'?'→ 1st base':dest==='2b'?'→ 2nd base':dest==='3b'?'→ 3rd base':'—';
  const earnRow=isScoring?`<div style="display:flex;align-items:center;gap:8px;padding-top:8px;margin-top:6px;border-top:1px solid var(--border);"><div style="font-size:11px;color:${showWarn?'var(--orange)':'var(--text2)'};flex:1;">${showWarn?'⚑ Verify earned/unearned':'Run:'}</div><button onclick="setRCEarned('${key}',true)" style="padding:5px 10px;border-radius:var(--rsm);border:1.5px solid ${earned===true?'var(--green)':'var(--border2)'};background:${earned===true?'var(--green)':'var(--bg3)'};color:${earned===true?'#fff':'var(--text2)'};font-size:11px;font-weight:700;cursor:pointer;">Earned</button><button onclick="setRCEarned('${key}',false)" style="padding:5px 10px;border-radius:var(--rsm);border:1.5px solid ${earned===false?'var(--orange)':'var(--border2)'};background:${earned===false?'var(--orange)':'var(--bg3)'};color:${earned===false?'#fff':'var(--text2)'};font-size:11px;font-weight:700;cursor:pointer;">Unearned</button></div>`:'';
  return `<div style="background:var(--bg3);border:1px solid ${border};border-radius:var(--rsm);padding:10px 12px;margin-bottom:8px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><div style="background:${badgeBg};color:${badgeColor};font-size:10px;font-weight:800;padding:2px 8px;border-radius:3px;flex-shrink:0;">${baseLabel}</div><div style="font-size:13px;font-weight:700;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${num}</div>${!isBatter?`<button onclick="setRCAdvErr('${key}',${!advErr})" style="padding:3px 8px;border-radius:var(--rsm);border:1.5px solid ${advErr?'var(--orange)':'var(--border2)'};background:${advErr?'rgba(240,135,58,0.12)':'var(--bg4)'};color:${advErr?'var(--orange)':'var(--text3)'};font-size:10px;font-weight:700;cursor:pointer;flex-shrink:0;">E-</button>`:''}</div>${fixed?`<div style="font-size:12px;color:var(--text3);padding-bottom:${isScoring?'0':'2px'};">${fixLbl}</div>`:`<div style="display:flex;gap:4px;">${dBtns.map(({d,label,color})=>btn(d,label,color)).join('')}</div>`}${earnRow}</div>`;
}

function setRCDest(key,dest){
  const e=RC.entries.find(e=>e.key===key);
  if(!e||e.fixed)return;
  e.dest=dest;
  if(key==='batter'&&RC.context==='s3'&&CE.rt==='bip'&&CE.bipOut==='hit'){
    CE.hitBases=dest==='3b'?3:dest==='2b'?2:1;
    const hitLabel={1:'Single',2:'Double',3:'Triple'}[CE.hitBases];
    CE.result=(CE.result||'').replace(/\s*·\s*(Single|Double|Triple)/,'')+' · '+hitLabel;
    const newDests=_rcRunnerDests(CE.hitBases,false,preHitRunners,null);
    RC.entries.forEach(en=>{
      if(en.key!=='batter'&&en.autoSet) en.dest=newDests[en.key]||null;
    });
  } else if(key!=='batter'){
    e.autoSet=false;
  }
  renderRunnerCards();
}
function setRCEarned(key,val){const e=RC.entries.find(e=>e.key===key);if(e){e.earnedOverride=val;renderRunnerCards();}}
function setRCAdvErr(key,val){const e=RC.entries.find(e=>e.key===key);if(e){e.advErr=val;renderRunnerCards();}}

function applyRCMoves(){
  if(!RC.entries.length)return;
  const newR={b1:null,b2:null,b3:null};
  let erRuns=0,urRuns=0;
  RC.entries.forEach(({key,runner,startBase,dest,earnedOverride})=>{
    const fd=dest!==null?dest:(key!=='batter'&&startBase?(startBase==='3B'?'3b':startBase==='2B'?'2b':'1b'):null);
    if(!fd)return;
    if(fd==='out')return;
    if(fd==='score'){
      const e=earnedOverride!==null?earnedOverride:calcRunEarnedDefault(runner);
      if(RC.context==='s3'){
        if(e)erRuns++;else urRuns++;
        CE.scoredRunners.push({name:runner.name||'',num:runner.num||'',reachedVia:runner.reachedVia||'other',earned:e});
      }
      else if(RC.context==='fe'){applyRunScore(runner,e,_feType||'play');}
      return;
    }
    newR['b'+fd.charAt(0)]=runner;
  });
  G.runners=newR;
  if(RC.context==='s3'){
    CE.er=erRuns; CE.ur=urRuns;
    const runnerOuts=RC.entries.filter(e=>e.key!=='batter'&&e.dest==='out').length;
    if(runnerOuts>0&&CE.bipOut!=='out'&&!CE.dp)CE.ro=true;
    else if(runnerOuts>1&&CE.dp)CE.ro=true;
  }
}

// ══════════════════════════════════════════
// FIELD EVENT
// ══════════════════════════════════════════
let _feType=null,_feMoves={},_feEarnedMap={};

function makeRunner(batter,reachedVia){
  return {num:batter?.num||'',name:batter?.name||'',reachedVia:reachedVia||'other',pitcherAppId:curP()?.appId||'',inning:G.inning,half:G.half,abNum:G.abNum};
}

// Returns true if earned, false if unearned — per official Rule 9.16(a)
function calcRunEarnedDefault(runner){
  if(!runner) return true;
  // Runner reached via error or passed ball → unearned (should have been out)
  if(runner.reachedVia==='error'||runner.reachedVia==='pb') return false;
  // Shadow inning: did an error extend the inning past a phantom 3rd out?
  const shadowOut=getInningShadowThirdOut(runner.inning||G.inning,runner.half||G.half);
  if(shadowOut!==null&&(runner.abNum||0)>shadowOut) return false;
  return true;
}

function getInningShadowThirdOut(inning,half){
  // Returns abNum where error became phantom 3rd out, or null if inning reached 3 outs cleanly
  if(!G) return null;
  const terms=G.pitches.filter(p=>p.inning===inning&&p.half===half&&p.isTerm).sort((a,b)=>a.abNum-b.abNum);
  let shadow=0;
  for(const pitch of terms){
    const rt=pitch.rt;
    const isErrorReach=(rt==='d3k')||(rt==='bip'&&pitch.bipOut==='error');
    const isRealOut=(rt==='k'||rt==='kc')||(rt==='bip'&&pitch.bipOut==='out')||(rt==='oob')||
      (rt==='other'&&pitch.result&&pitch.result.includes('Out'));
    if(isErrorReach||isRealOut){
      shadow++;
      if(shadow===3) return isErrorReach?pitch.abNum:null;
    }
  }
  return null;
}


function showFieldEvent(){
  if(!G) return;
  document.getElementById('fe-step1').style.display='';
  document.getElementById('fe-step2').style.display='none';
  _feMoves={}; _feEarnedMap={}; _feType=null;
  document.getElementById('fe-ov').classList.add('on');
  updateFEBases();
}
function hideFieldEvent(){ document.getElementById('fe-ov').classList.remove('on'); }

function updateFEBases(){
  if(!G) return;
  ['1b','2b','3b'].forEach(b=>{
    const key='b'+b.charAt(0);
    const el=document.getElementById('fe-b'+b);
    const numEl=document.getElementById('fe-b'+b+'-num');
    if(!el) return;
    const occupied=!!G.runners[key];
    el.style.background=occupied?'var(--yellow)':'var(--bg4)';
    el.style.borderColor=occupied?'var(--yellow)':'var(--text3)';
    if(numEl){ numEl.style.color=occupied?'#000':'var(--text2)'; numEl.textContent=occupied?getRunnerNum(b):'—'; }
  });
}

function selectFE(type){
  if(!G) return;
  _feType=type; _feMoves={}; _feEarnedMap={};
  const p=curP();

  if(type==='Clock-Pitcher'){ G.events.push({type,inning:G.inning,half:G.half,ts:Date.now()}); G.balls++; save(); hideFieldEvent(); renderGame(); return; }
  if(type==='Clock-Batter'){ G.events.push({type,inning:G.inning,half:G.half,ts:Date.now()}); if(G.strikes<2)G.strikes++; save(); hideFieldEvent(); renderGame(); return; }

  if(type==='IBB'){
    G.events.push({type,inning:G.inning,half:G.half,ts:Date.now()});
    if(p) p.bb++;
    const b=curB();
    const newR=b?makeRunner(b,'ibb'):{num:'?',name:'',reachedVia:'ibb',pitcherAppId:p?.appId||'',inning:G.inning,half:G.half,abNum:G.abNum};
    if(G.runners.b1&&G.runners.b2&&G.runners.b3){ applyRunScore(G.runners.b3,calcRunEarnedDefault(G.runners.b3),'IBB'); G.runners.b3=G.runners.b2; G.runners.b2=G.runners.b1; }
    else if(G.runners.b1&&G.runners.b2){ G.runners.b3=G.runners.b2; G.runners.b2=G.runners.b1; }
    else if(G.runners.b1){ G.runners.b2=G.runners.b1; }
    G.runners.b1=newR;
    G.abNum++; G.batterIdx=(G.batterIdx+1)%(G.lineup.length||9); G.balls=0; G.strikes=0;
    save(); hideFieldEvent(); renderGame(); return;
  }

  // Balk: auto-advance all runners 1 base. Earned status determined per runner by standard rules.
  if(type==='Balk'){
    G.events.push({type,inning:G.inning,half:G.half,ts:Date.now()});
    const orig={b1:G.runners.b1,b2:G.runners.b2,b3:G.runners.b3};
    if(orig.b3) applyRunScore(orig.b3,calcRunEarnedDefault(orig.b3),'Balk');
    G.runners.b3=orig.b2||null;
    G.runners.b2=orig.b1||null;
    G.runners.b1=null;
    save(); hideFieldEvent(); renderGame(); return;
  }

  showFEStep2(type);
}

function showFEStep2(type){
  document.getElementById('fe-step1').style.display='none';
  document.getElementById('fe-step2').style.display='';
  document.getElementById('fe-s2-title').textContent=type+' — Move Runners';
  const staticD=document.getElementById('fe-cur-diamond');
  if(staticD) staticD.style.display='none';
  // Pre-set smart defaults by play type
  _feMoves={};
  if(type==='Caught Stealing'||type==='Pickoff'||type==='Runner Out'){
    if(G.runners.b3)_feMoves.b3='out';
    else if(G.runners.b2)_feMoves.b2='out';
    else if(G.runners.b1)_feMoves.b1='out';
  } else if(type==='Stolen Base'){
    const b1=G.runners.b1,b2=G.runners.b2,b3=G.runners.b3;
    if(b1&&b3&&!b2){
      _feMoves.b1='2b';                        // 1B+3B: advance 1B only, 3B holds
    } else if(b1&&b2){
      _feMoves.b1='2b'; _feMoves.b2='3b';       // 1B+2B: double steal
      if(b3)_feMoves.b3='score';                 // loaded: 3B scores, can't hold
    } else {
      if(b1)_feMoves.b1='2b';                  // solo runner: advance +1
      else if(b2&&b3){_feMoves.b2='3b';_feMoves.b3='score';}  // 2B steals 3B, pushes 3B home
      else if(b2)_feMoves.b2='3b';
      else if(b3)_feMoves.b3='score';
    }
  } else if(type==='Wild Pitch'||type==='Passed Ball'){
    if(G.runners.b3)_feMoves.b3='score';
    if(G.runners.b2)_feMoves.b2='3b';
    if(G.runners.b1)_feMoves.b1='2b';
  }
  initRC('fe','fe-runner-cards');
}

function feBackToStep1(){
  _feMoves={}; _feEarnedMap={}; _feType=null;
  document.getElementById('fe-step1').style.display='';
  document.getElementById('fe-step2').style.display='none';
  const staticD=document.getElementById('fe-cur-diamond');
  if(staticD) staticD.style.display='';
  RC.entries=[];
}


function applyRunScore(runner,earned,how){
  if(!G) return;
  G.ourScore++;
  const respP=G.pitchers.find(p=>p.appId===(runner.pitcherAppId||''))||curP();
  if(respP){ if(earned) respP.er++; else respP.ur++; }
  G.events.push({type:'runScored',runner,how,earned,inning:G.inning,half:G.half,pitcherAppId:runner?.pitcherAppId,ts:Date.now()});
}

function confirmFEMoves(){
  if(!G) return;
  const movesLog={};
  RC.entries.forEach(e=>{if(e.dest)movesLog[e.key]=e.dest;});
  G.events.push({type:_feType,inning:G.inning,half:G.half,moves:movesLog,ts:Date.now()});
  applyRCMoves();
  const outsAdded=RC.entries.filter(e=>e.key!=='batter'&&e.dest==='out').length;
  if(outsAdded>0){
    G.outs+=outsAdded;
    const p=curP(); if(p) p.po+=outsAdded;
    if(G.outs>=3){ save(); hideFieldEvent(); showInningSummary(); return; }
  }
  save(); hideFieldEvent(); renderGame();
}

function doFE(type){ selectFE(type); }

// ══════════════════════════════════════════
// PITCHER CHANGE
// ══════════════════════════════════════════
function getPitcherSeasonStats(p){
  let pc=0,k=0,bb=0,h=0,er=0,po=0;
  S.games.forEach(g=>{
    (g.pitchers||[]).forEach(app=>{
      if(app.name===p.name&&app.num===p.num){
        pc+=app.pc||0; k+=app.k||0; bb+=app.bb||0;
        h+=app.h||0; er+=app.er||0; po+=app.po||0;
      }
    });
  });
  const ip=Math.floor(po/3)+'.'+(po%3);
  const era=po>0?((er*27)/po).toFixed(2):'—';
  return {pc,k,bb,h,er,po,ip,era};
}

function renderStars(rating,pitcherIdx,context){
  const r=rating||0;
  return [1,2,3,4,5].map(n=>
    `<span onclick="event.stopPropagation();setPitcherRating(${pitcherIdx},${n},'${context}')" style="font-size:18px;cursor:pointer;color:${n<=r?'#f5c842':'var(--text3)'};line-height:1;">★</span>`
  ).join('');
}

function setPitcherRating(i,stars,context){
  if(!S.pitchers[i]) return;
  S.pitchers[i].rating=S.pitchers[i].rating===stars?0:stars;
  save();
  if(context==='change') showPitcherChange();
  else renderMyTeam();
}

function showPitcherChange(){
  hideFieldEvent();
  const pitchers=S.pitchers.filter(p=>p.active!==false);

  // Identify current and previously-used pitchers in this game
  const activePitcher=G?G.pitchers[G.pitcherIdx]:null;
  const activeKey=activePitcher?activePitcher.name+'|'+String(activePitcher.num||''):null;
  const usedKeys=new Set();
  if(G) G.pitchers.forEach((gp,i)=>{ if(i!==G.pitcherIdx) usedKeys.add(gp.name+'|'+String(gp.num||'')); });

  const cards=pitchers.map(p=>{
    const si=S.pitchers.indexOf(p);
    const stats=getPitcherSeasonStats(p);
    const isL=p.throws==='L';
    const circleColor=isL?'var(--accent)':'var(--red)';
    const circleBg=isL?'rgba(74,158,255,0.18)':'rgba(232,85,85,0.18)';
    const pKey=p.name+'|'+String(p.num||'');
    const isCurrent=activeKey===pKey;
    const isUsed=!isCurrent&&usedKeys.has(pKey);
    const cardOpacity=isCurrent?'opacity:0.55;':'';
    const usedOpacity=isUsed?'opacity:0.4;':'';
    const badge=isCurrent
      ?`<span style="font-size:10px;font-weight:700;background:var(--accent);color:#fff;border-radius:3px;padding:1px 6px;margin-left:8px;vertical-align:middle;">IN</span>`
      :isUsed
      ?`<span style="font-size:10px;color:var(--text3);margin-left:8px;">Cannot re-enter</span>`
      :'';
    const actionBtn=isCurrent||isUsed?''
      :`<button onclick="doPitcherChange('${p.name}','${p.throws}','${p.num||''}')" style="padding:8px 16px;background:var(--accent);border:none;border-radius:var(--rsm);color:#fff;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0;">In</button>`;
    return `
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:10px;${cardOpacity}${usedOpacity}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <div style="width:38px;height:38px;border-radius:50%;background:${circleBg};color:${circleColor};font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${p.throws||'R'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:700;">#${p.num||'—'} ${p.name}${badge}</div>
            ${p.arsenal&&p.arsenal.length?`<div style="font-size:11px;color:var(--text3);margin-top:3px;letter-spacing:0.4px;">${p.arsenal.join(' · ')}</div>`:''}
            <div style="margin-top:4px;">${renderStars(p.rating,si,'change')}</div>
          </div>
          ${actionBtn}
        </div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">
          <div style="text-align:center;background:var(--bg2);border-radius:var(--rsm);padding:6px 2px;">
            <div style="font-size:15px;font-weight:800;">${stats.ip}</div>
            <div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:0.3px;margin-top:2px;">IP</div>
          </div>
          <div style="text-align:center;background:var(--bg2);border-radius:var(--rsm);padding:6px 2px;">
            <div style="font-size:15px;font-weight:800;color:var(--green);">${stats.k}</div>
            <div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:0.3px;margin-top:2px;">K</div>
          </div>
          <div style="text-align:center;background:var(--bg2);border-radius:var(--rsm);padding:6px 2px;">
            <div style="font-size:15px;font-weight:800;">${stats.bb}</div>
            <div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:0.3px;margin-top:2px;">BB</div>
          </div>
          <div style="text-align:center;background:var(--bg2);border-radius:var(--rsm);padding:6px 2px;">
            <div style="font-size:15px;font-weight:800;">${stats.h}</div>
            <div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:0.3px;margin-top:2px;">H</div>
          </div>
          <div style="text-align:center;background:var(--bg2);border-radius:var(--rsm);padding:6px 2px;">
            <div style="font-size:15px;font-weight:800;color:${stats.er>0?'var(--red)':''};">${stats.era}</div>
            <div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:0.3px;margin-top:2px;">ERA</div>
          </div>
        </div>
      </div>`;
  }).join('');
  showModal('Change Pitcher',`
    <div>
      ${pitchers.length?cards:'<p style="font-size:13px;color:var(--text2);margin-bottom:12px;">No pitchers on roster.</p>'}
      <button class="btn btn-sm btn-block" style="margin-top:4px;" onclick="showManualPChange()">+ Enter manually</button>
    </div>
  `);
}
function showManualPChange(){
  hideModal(); mHand='R';
  showModal('Incoming Pitcher',`
    <div class="fgroup"><label>Name</label><input type="text" id="pc-name"></div>
    <div class="fgroup"><label>Jersey #</label><input type="number" id="pc-num"></div>
    <div class="fgroup"><label>Throws</label>
      <div class="hand-row">
        <div class="hand-btn L" onclick="setModalHand('L')">L</div>
        <div class="hand-btn R on" onclick="setModalHand('R')">R</div>
      </div>
    </div>
    <button class="btn btn-primary btn-block" onclick="manualPChange()">Confirm</button>
  `);
}
function manualPChange(){
  const name=document.getElementById('pc-name').value.trim(); if(!name)return;
  doPitcherChange(name,mHand,document.getElementById('pc-num').value.trim());
}
function doPitcherChange(name,throws,num){
  const cur=curP();
  if(cur && cur.pc===0 && G.pitchers.length>1){
    // Only remove the entry if the game state is identical to when this pitcher entered.
    // A pickoff changes outs, a balk changes score, a wild pitch moves runners —
    // any of those means he actually did something even with 0 pitches.
    const runnersMatch=['b1','b2','b3'].every(k=>
      JSON.stringify(G.runners[k])===JSON.stringify((cur.inhRunners||{})[k])
    );
    const nothingHappened=
      G.outs===cur.outs &&
      G.inning===cur.inning && G.half===cur.half &&
      G.ourScore===(cur.inhOurScore??G.ourScore) &&
      G.oppScore===(cur.inhOppScore??G.oppScore) &&
      runnersMatch;
    if(nothingHappened){
      G.pitchers.pop();
      G.pitcherIdx=G.pitchers.length-1;
    }
  }
  // After cleanup, if the target pitcher is already current, nothing to do
  const now=curP();
  if(now && now.name===name && String(now.num||'')===String(num||'')){
    hideModal(); save(); renderGame(); return;
  }
  G.pitchers.push({name,throws,num,appId:'a_'+Date.now(),
    inning:G.inning,outs:G.outs,balls:G.balls,strikes:G.strikes,
    inhRunners:{...G.runners},inhOurScore:G.ourScore,inhOppScore:G.oppScore,
    pc:0,st:0,k:0,bb:0,hbp:0,h:0,er:0,ur:0,po:0});
  G.pitcherIdx=G.pitchers.length-1;
  hideModal(); save(); renderGame();
}

// ══════════════════════════════════════════
// OUTING GRADE
// ══════════════════════════════════════════
function computeOutingGrade(pitches,level){
  if(!pitches||!pitches.length) return null;
  level=level||'hs';
  const n=pitches.length;
  const strikes=pitches.filter(p=>p.isStrike).length;
  const ks=pitches.filter(p=>p.rt==='k'||p.rt==='kc').length;
  const bbs=pitches.filter(p=>p.rt==='bb'||p.rt==='ibb').length;
  const hbps=pitches.filter(p=>p.rt==='hbp').length;
  const hrs=pitches.filter(p=>p.rt==='hr').length;
  const hits=pitches.filter(p=>p.bipOut==='hit'||p.rt==='hr').length;
  let outs=0;
  pitches.forEach(p=>{
    if(p.rt==='k'||p.rt==='kc') outs++;
    else if(p.rt==='bip'&&(p.bipOut==='out'||p.bipOut==='sac')) outs++;
    else if(p.rt==='oob') outs++;
    if(p.ro) outs++;
    if(p.dp) outs++;
  });
  const ip=outs/3;
  const bipPs=pitches.filter(p=>p.rt==='bip'||p.rt==='hr');
  const bip=bipPs.length;
  const termPs=pitches.filter(p=>p.isTerm);
  const tbf=termPs.length||1;
  const gbs=pitches.filter(p=>p.bipType==='GB').length;
  const fbs=pitches.filter(p=>p.bipType==='FLY'||p.bipType==='PU').length;
  const lds=pitches.filter(p=>p.bipType==='LD').length;

  const stPct=n?strikes/n*100:0;
  const stScore=stPct>=68?100:stPct>=65?90:stPct>=62?80:stPct>=58?70:stPct>=54?60:stPct>=50?50:30;

  const lvlC={d1:4.20,d2:4.50,d3:4.75,naia:4.60,juco:4.80,hs:5.00}[level]||5.00;

  let fipScore=null;
  if(ip>=1){
    const fip=((13*hrs)+(3*(bbs+hbps))-(2*ks))/ip+lvlC;
    fipScore=Math.max(0,Math.min(100,Math.round((1-(fip-(lvlC-2))/4.5)*100)));
  }
  let sieraScore=null;
  if(ip>=1&&tbf>1){
    const kP=ks/tbf,bbP=bbs/tbf,gfl=(gbs-fbs-lds)/tbf,gbP=gbs/tbf,fbP=fbs/tbf;
    const siera=6.145-16.986*kP+11.434*bbP-1.858*gfl+7.653*gfl*gfl+3.584*gbP-2.115*fbP;
    sieraScore=Math.max(0,Math.min(100,Math.round((1-(siera-(lvlC-2))/4.5)*100)));
  }
  let barrelScore=null;
  if(bip>=3){
    const barrels=pitches.filter(p=>p.hh&&(p.bipType==='LD'||p.bipType==='FLY'||p.rt==='hr')).length;
    barrelScore=Math.max(0,Math.min(100,Math.round(100-barrels/bip*100*2.5)));
  }
  let whipScore=null;
  if(ip>0) whipScore=Math.max(0,Math.min(100,Math.round((1-(bbs+hbps+hits)/ip/3)*100)));
  let kbbScore=null;
  if(bbs>0&&ks>0){
    kbbScore=Math.max(0,Math.min(100,Math.round(40+ks/bbs/4*60)));
  } else if(ip>0){
    kbbScore=Math.max(0,Math.min(100,Math.round(20+ks/ip*9/12*80)));
  }

  let wSt=0.15,wFIP=0.20,wSIERA=0.20,wBar=0.20,wWHIP=0.15,wKBB=0.10;
  if(fipScore===null&&sieraScore===null){ wSt+=wFIP*0.5+wSIERA*0.5; wBar+=wFIP*0.5+wSIERA*0.5; wFIP=0; wSIERA=0; }
  else if(fipScore===null){ wSt+=wFIP*0.5; wBar+=wFIP*0.5; wFIP=0; }
  else if(sieraScore===null){ wSt+=wSIERA*0.5; wBar+=wSIERA*0.5; wSIERA=0; }
  if(barrelScore===null){ wWHIP+=wBar; wBar=0; }
  if(whipScore===null){ wSt+=wWHIP; wWHIP=0; }
  if(kbbScore===null){ wSt+=wKBB; wKBB=0; }

  const score=stScore*wSt+(fipScore||0)*wFIP+(sieraScore||0)*wSIERA+(barrelScore||0)*wBar+(whipScore||0)*wWHIP+(kbbScore||0)*wKBB;
  const rounded=Math.round(score*10)/10;
  const letter=_scoreToLetter(Math.round(score));
  return {score:rounded,letter,color:_gradeColor(letter)};
}
function _scoreToLetter(s){
  if(s>=97)return'A+';if(s>=93)return'A';if(s>=90)return'A-';
  if(s>=87)return'B+';if(s>=83)return'B';if(s>=80)return'B-';
  if(s>=77)return'C+';if(s>=73)return'C';if(s>=70)return'C-';
  if(s>=67)return'D+';if(s>=63)return'D';if(s>=60)return'D-';
  return'F';
}
function _gradeColor(letter){
  if(!letter)return'var(--text2)';
  const f=letter[0];
  return f==='A'||f==='B'?'var(--green)':f==='C'?'var(--yellow)':'var(--red)';
}
function _gradeChip(grade,style=''){
  if(!grade)return'';
  return`<span style="display:inline-flex;align-items:center;justify-content:center;padding:2px 9px;border-radius:12px;background:${grade.color}22;color:${grade.color};font-size:13px;font-weight:800;letter-spacing:0.3px;${style}">${grade.letter}</span>`;
}
function _seasonGPA(pitcherName){
  const games=S.games;
  const scores=[];
  const level=S.team.level||'hs';
  games.forEach(g=>{
    const appIds=new Set();
    (g.pitchers||[]).forEach(gp=>{ if(gp.name===pitcherName) appIds.add(gp.appId); });
    appIds.forEach(appId=>{
      const ps=(g.pitches||[]).filter(p=>p.appId===appId);
      if(ps.length){
        const gr=computeOutingGrade(ps,level);
        if(gr) scores.push(gr.score);
      }
    });
  });
  if(!scores.length) return null;
  const avg=scores.reduce((a,b)=>a+b,0)/scores.length;
  const letter=_scoreToLetter(Math.round(avg));
  return{score:Math.round(avg*10)/10,letter,color:_gradeColor(letter)};
}

// ══════════════════════════════════════════
// PITCHER PANEL (tap pitcher name)
// ══════════════════════════════════════════
function showPitcherPanel(){
  const p=curP(); if(!p)return;
  const pp=G.pitches.filter(q=>q.appId===p.appId);
  const st=pp.filter(q=>q.isStrike).length;
  const k=pp.filter(q=>q.rt==='k'||q.rt==='kc').length;
  const bb=pp.filter(q=>q.rt==='bb'||q.rt==='ibb').length;
  const h=pp.filter(q=>q.bipOut==='hit'||q.rt==='hr').length;
  const er=pp.reduce((a,q)=>a+(q.er||0),0);
  const sp=pp.length?Math.round(st/pp.length*100):0;

  const groups={};
  pp.forEach(q=>{
    const key=`${q.inning}_${q.half}`;
    if(!groups[key]) groups[key]={inning:q.inning,half:q.half,pitches:0,strikes:0,k:0,bb:0,h:0,er:0};
    const g=groups[key];
    g.pitches++; if(q.isStrike) g.strikes++;
    if(q.rt==='k'||q.rt==='kc') g.k++;
    if(q.rt==='bb'||q.rt==='ibb'||q.rt==='hbp') g.bb++;
    if(q.bipOut==='hit'||q.rt==='hr') g.h++;
    g.er+=(q.er||0);
  });
  const rows=Object.values(groups).sort((a,b)=>a.inning!==b.inning?a.inning-b.inning:a.half==='top'?-1:1);

  const _pC=p.throws==='L'?'var(--accent)':'var(--red)';const _pB=p.throws==='L'?'rgba(74,158,255,0.18)':'rgba(232,85,85,0.18)';
  const _ppGrade=S.settings.showOutingGrades!==false?computeOutingGrade(pp,S.team.level||'hs'):null;
  showModal(`<span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:28px;height:28px;border-radius:50%;background:${_pB};color:${_pC};font-size:12px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${p.throws||'R'}</span>#${p.num||'—'} ${p.name}${_ppGrade?` ${_gradeChip(_ppGrade)}`:''}</span>`,`
    <div style="margin-bottom:${p.arsenal&&p.arsenal.length?'8px':'14px'};">
      <button onclick="hideModal();showPitcherChange();" style="width:100%;padding:12px;background:var(--red);border:none;border-radius:var(--r);color:#fff;font-size:15px;font-weight:700;cursor:pointer;">Change Pitcher</button>
    </div>
    ${p.arsenal&&p.arsenal.length?`<div style="font-size:11px;color:var(--text3);text-align:center;margin-bottom:14px;letter-spacing:0.5px;">${p.arsenal.join(' · ')}</div>`:''}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;">${pp.length}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">Pitches</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;">${sp}%</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">Strike%</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:var(--green);">${k}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">K</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:var(--accent);">${bb}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">BB</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;">${h}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">H</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:${er>0?'var(--red)':''};">${er}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">ER</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rsm);padding:10px;text-align:center;grid-column:span 2;">
        <div style="font-size:20px;font-weight:800;">${st} / ${pp.length}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px;">Strikes / Pitches</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Outing by Inning</div>
    <div style="border:1px solid var(--border);border-radius:var(--rsm);overflow:hidden;">
      <div style="display:grid;grid-template-columns:1.2fr repeat(7,1fr);padding:7px 10px;background:var(--bg3);font-size:10px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:0.3px;">
        <div>Inn</div><div>P</div><div>S</div><div>S%</div><div>K</div><div>BB</div><div>H</div><div>ER</div>
      </div>
      ${rows.length?rows.map(r=>`
        <div style="display:grid;grid-template-columns:1.2fr repeat(7,1fr);padding:8px 10px;border-top:1px solid var(--border);font-size:12px;color:var(--text);">
          <div>${r.half==='top'?'▲':'▼'}${r.inning}</div>
          <div>${r.pitches}</div><div>${r.strikes}</div>
          <div>${r.pitches?Math.round(r.strikes/r.pitches*100):0}%</div>
          <div>${r.k}</div><div>${r.bb}</div><div>${r.h}</div><div>${r.er}</div>
        </div>
      `).join(''):'<div style="padding:10px;font-size:12px;color:var(--text3);text-align:center;">No pitches logged yet</div>'}
    </div>`);

}

// ══════════════════════════════════════════
// BATTER OPTIONS
// ══════════════════════════════════════════
function showBatterOptions(){ showLineup(); }
function _batterCircle(b){
  const isL=b.hand==='L',isS=b.hand==='S';
  const color=isL?'var(--accent)':isS?'var(--green)':'var(--red)';
  const bg=isL?'rgba(74,158,255,0.18)':isS?'rgba(61,186,122,0.18)':'rgba(232,85,85,0.18)';
  return {color,bg};
}
function showLineup(){
  const currentIdx = G ? G.batterIdx % (G.lineup.length||1) : 0;
  const cards = (G.lineup||[]).map((b,i)=>{
    const isCurrent = i === currentIdx;
    const {color,bg}=_batterCircle(b);
    const summaries=getBatterABSummaries(b);
    return `
      <div onclick="showBatterCardOptions(${i})" style="background:${isCurrent?'rgba(74,158,255,0.08)':'var(--bg3)'};border:1px solid ${isCurrent?'var(--accent)':'var(--border)'};border-radius:var(--r);padding:14px;cursor:pointer;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:38px;height:38px;border-radius:50%;background:${bg};color:${color};font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${b.hand||'R'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:700;">#${b.num||'—'} ${b.name||'Unknown'}</div>
            <div style="font-size:12px;color:${summaries.length?'var(--text2)':'var(--text3)'};margin-top:4px;">${summaries.length?summaries.join(' · '):'No ABs yet'}</div>
          </div>
          ${isCurrent?'<div style="font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0;">AT BAT</div>':''}
        </div>
      </div>
    `;
  }).join('');
  showModal('Lineup',`
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${cards || '<div style="color:var(--text2);">No lineup set.</div>'}
      <button class="btn btn-block" onclick="hideModal()">Close</button>
    </div>
  `);
}
function showBatterCardOptions(i){
  if(!G) return;
  const b=G.lineup[i]; if(!b) return;
  const {color,bg}=_batterCircle(b);
  const abNums=[...new Set(G.pitches.filter(p=>p.bName===b.name).map(p=>p.abNum))].sort((a,c)=>a-c);
  const abRows=abNums.map(abNum=>{
    const last=G.pitches.filter(p=>p.abNum===abNum&&p.bName===b.name).slice(-1)[0];
    const result=summarizeABResult(last)||'In Progress';
    return `<div onclick="hideModal();showABDetails(${abNum})" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg2);border-radius:var(--rsm);cursor:pointer;">
      <div style="font-size:13px;font-weight:600;">AB ${abNum}</div>
      <div style="font-size:13px;color:var(--text2);">${result}</div>
      <div style="font-size:12px;color:var(--accent);">Details →</div>
    </div>`;
  }).join('');
  showModal(`#${b.num||'—'} ${b.name||'Unknown'}`,`
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:38px;height:38px;border-radius:50%;background:${bg};color:${color};font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${b.hand||'R'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:700;">#${b.num||'—'} ${b.name||'Unknown'}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:3px;">Bats ${b.hand||'R'}</div>
        </div>
      </div>
    </div>
    ${abNums.length
      ? `<div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">At-Bats This Game</div>
         <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">${abRows}</div>`
      : '<div style="font-size:13px;color:var(--text3);margin-bottom:14px;text-align:center;">No at-bats yet this game</div>'}
    <button class="btn btn-block" onclick="showSubBatterForSlot(${i})">Substitution</button>
    <button class="btn btn-block" style="margin-top:8px;" onclick="showLineup()">← Lineup</button>
  `);
}
function showBatterABHistory(i){
  if(!G) return;
  const b=G.lineup[i]; if(!b) return;
  const abNums=[...new Set(G.pitches.filter(p=>p.bName===b.name).map(p=>p.abNum))].sort((a,c)=>a-c);
  const rows=abNums.map(abNum=>{
    const last=G.pitches.filter(p=>p.abNum===abNum&&p.bName===b.name).slice(-1)[0];
    const result=summarizeABResult(last)||'In Progress';
    return `<div onclick="hideModal();showABDetails(${abNum})" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg3);border-radius:var(--rsm);cursor:pointer;">
      <div style="font-size:14px;font-weight:600;">AB ${abNum}</div>
      <div style="font-size:13px;color:var(--text2);">${result}</div>
      <div style="font-size:12px;color:var(--accent);">Details →</div>
    </div>`;
  }).join('');
  showModal(`${b.name||'Unknown'} · ABs`,`
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${rows||'<div style="color:var(--text2);">No at-bats yet.</div>'}
      <button class="btn btn-block" style="margin-top:4px;" onclick="showBatterCardOptions(${i})">← Back</button>
    </div>
  `);
}
function getBatterABSummaries(batter){
  if(!G||!batter) return [];
  const hits = G.pitches.filter(p=>p.bName===batter.name && String(p.abNum));
  const abNums = [...new Set(hits.map(p=>p.abNum))].sort((a,c)=>a-c);
  return abNums.map(abNum=>{
    const abPitches = hits.filter(p=>p.abNum===abNum);
    const last = abPitches[abPitches.length-1];
    return summarizeABResult(last);
  });
}
function summarizeABResult(p){
  if(!p) return '';
  const map = {
    'Ground Hit':'GB H',
    'Ground Out':'GB O',
    'Ground Error':'GB E',
    'Line Hit':'LD H',
    'Line Out':'LD O',
    'Line Error':'LD E',
    'Fly Hit':'FLY H',
    'Fly Out':'FLY O',
    'Fly Error':'FLY E',
    'Pop Up Out':'PU O',
    'Pop Up Hit':'PU H',
    'Pop Up Error':'PU E',
    'SAC Bunt':'SAC',
    'SAC Fly':'SAC',
    'Other - Safe':'Safe',
    'Other - Out':'Out'
  };
  if(p.rt==='k' || p.rt==='swstr') return 'K';
  if(p.rt==='kc') return 'ꓘ';
  if(p.rt==='bb') return 'BB';
  if(p.rt==='ibb') return 'IBB';
  if(p.rt==='hbp') return 'HBP';
  if(p.rt==='oob') return 'OOB';
  if(p.rt==='strike') return 'Strike';
  if(p.rt==='foul') return 'Foul';
  if(p.rt==='bip'){
    const baseResult=(p.result||'').replace(/\s*·\s*(Single|Double|Triple).*/,'').trim();
    const hitLabel=p.result&&p.result.match(/·\s*(Single|Double|Triple)/)?p.result.match(/·\s*(Single|Double|Triple)/)[1]:'';
    const mapped=map[baseResult]||map[p.result]||`${(p.bipType||'BIP').toUpperCase()} ${p.bipOut?p.bipOut.charAt(0).toUpperCase()+p.bipOut.slice(1):''}`.trim();
    return hitLabel?mapped+' · '+hitLabel:mapped;
  }
  if(p.rt==='other') return p.result||'Other';
  return p.result||p.rt;
}
function summarizePitchResult(p){
  if(!p) return '';
  if(p.result) return p.result.replace(' — ',' · ');
  if(p.rt==='strike') return 'Strike';
  if(p.rt==='foul') return 'Foul Ball';
  if(p.rt==='swstr') return 'Swing & Miss';
  if(p.rt==='bb') return 'BB';
  if(p.rt==='kc') return 'Called Strike';
  if(p.rt==='k') return 'K (Swing)';
  if(p.rt==='bip') return p.result || `${(p.bipType||'BIP').toUpperCase()} ${p.bipOut||''}`.trim();
  return p.result||p.rt;
}
function showABDetails(abNum){
  if(!G) return;
  const pitches = G.pitches.filter(p=>p.abNum===abNum);
  if(!pitches.length) return;
  const last = pitches[pitches.length-1];
  const summary = summarizeABResult(last) || 'AB Detail';
  const rows = pitches.map((p,i)=>{
    const pitchType = p.pt || p.rt || '—';
    const pitchResult = summarizePitchResult(p);
    return `
      <div class="ab-detail-pitch-row">
        <div class="ab-detail-seq">${i+1}</div>
        <div class="ab-detail-pitch">
          <span class="ab-detail-pitch-type">${pitchType}</span>
          <span class="ab-detail-pitch-result">${pitchResult}</span>
        </div>
      </div>
    `;
  }).join('');
  showModal(`AB${abNum} · ${summary}`,`
    <div class="ab-detail-grid">
      <div class="ab-detail-visual">
        <canvas id="ab-detail-cv" width="240" height="280"></canvas>
      </div>
      <div class="ab-detail-info">
        <div class="ab-detail-subtitle">AB Summary</div>
        <div class="ab-detail-pitch-row" style="background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1);">
          <div class="ab-detail-seq">✓</div>
          <div class="ab-detail-pitch">${summary}</div>
        </div>
        <div class="ab-detail-subtitle">Pitches</div>
        ${rows}
      </div>
    </div>
  `);
  renderABDetailCanvas(abNum);
}
function renderABDetailCanvas(abNum){
  const cv=document.getElementById('ab-detail-cv');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  const W=cv.width, H=cv.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(255,255,255,0.03)'; ctx.fillRect(0,0,W,H);
  const cw=W/5, ch=H/5;
  const szX=cw, szY=ch, szW=cw*3, szH=ch*3;
  // Zone fill: always grey-blue on strike zone + shadow; unselected cells fade when filter active
  const activeZone=_anFilter&&_anFilter.zone&&_anFilter.zone!=='all'?_anFilter.zone:null;
  if(!activeZone){
    ctx.fillStyle='rgba(67,113,203,0.20)';
    ctx.fillRect(szX,szY,szW,szH);
    getZoneCells('shadow').forEach(({col,row})=>ctx.fillRect(col*cw,row*ch,cw,ch));
  } else {
    ctx.fillStyle='rgba(67,113,203,0.05)';
    for(let r=1;r<=3;r++) for(let c=1;c<=3;c++) ctx.fillRect(c*cw,r*ch,cw,ch);
    getZoneCells('shadow').forEach(({col,row})=>ctx.fillRect(col*cw,row*ch,cw,ch));
    ctx.fillStyle='rgba(67,113,203,0.20)';
    getZoneCells(activeZone).forEach(({col,row})=>ctx.fillRect(col*cw,row*ch,cw,ch));
  }
  // Grid
  ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1;
  for(let i=1;i<5;i++){
    ctx.beginPath(); ctx.moveTo(i*cw,0); ctx.lineTo(i*cw,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i*ch); ctx.lineTo(W,i*ch); ctx.stroke();
  }
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=2;
  ctx.strokeRect(szX,szY,szW,szH);
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1;
  for(let i=1;i<3;i++){
    ctx.beginPath(); ctx.moveTo(szX+i*(szW/3),szY); ctx.lineTo(szX+i*(szW/3),szY+szH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(szX,szY+i*(szH/3)); ctx.lineTo(szX+szW,szY+i*(szH/3)); ctx.stroke();
  }
  const zcells=activeZone?getZoneCells(activeZone):[];
  const pitches=G.pitches.filter(p=>p.abNum===abNum);
  pitches.forEach((p,i)=>{
    if(p.zx==null) return;
    if(zcells.length){
      const zn=getZoneNum(p.zx,p.zy);
      const inZone=AN_ZONE_REGIONS[activeZone]&&AN_ZONE_REGIONS[activeZone].includes(zn);
      ctx.globalAlpha=inZone?1.0:0.30;
    }
    drawPitchDot(ctx,p.zx*W,p.zy*H,p,i+1);
  });
  ctx.globalAlpha=1.0;
  // Dot tap handler
  cv.onclick=function(e){
    const rect=cv.getBoundingClientRect();
    const sx=rect.width/W, sy=rect.height/H;
    const x=(e.clientX-rect.left)/sx, y=(e.clientY-rect.top)/sy;
    let closest=null,minDist=Infinity;
    pitches.forEach((p,i)=>{
      if(p.zx==null) return;
      const dx=p.zx*W-x, dy=p.zy*H-y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minDist){minDist=d;closest={p,seq:i+1};}
    });
    if(closest&&minDist<22) showPitchDotPopup(closest.p,closest.seq);
  };
}

function showPitchDotPopup(p,seq){
  const ptName=AN_PT_NAMES[p.pt]||p.pt||'—';
  const count=`${p.ballsBefore}-${p.strikesBefore}`;
  const zn=(p.zx!=null&&p.zy!=null)?getZoneNum(p.zx,p.zy):null;
  const znLabel=zn?getZoneLabel(zn):'—';
  const fzCode=getFieldZone(p.sx,p.sy);
  const fzLabel=fzCode?FZ_LABEL[fzCode]||fzCode:'—';
  const RM={k:'Strikeout',kc:'Called K',d3k:'Dropped 3K',bb:'Walk',ibb:'Int. Walk',hbp:'HBP',
    bip:'In Play',hr:'Home Run',foul:'Foul',ball:'Ball',strike:'Called Strike',swstr:'Swinging Strike'};
  const result=RM[p.rt]||p.rt||'—';
  const bipDetail=(p.rt==='bip'&&p.bipType)?` (${p.bipType}${p.bipOut?'/'+p.bipOut[0].toUpperCase():''})${p.hh?' 🔥':''}`:'';
  showModal(`Pitch ${seq}`,`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;font-size:13px;">
      <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Type</div><div style="font-weight:700;">${ptName}</div></div>
      <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Count</div><div style="font-weight:700;">${count}</div></div>
      <div style="grid-column:1/-1;"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Result</div><div style="font-weight:700;">${result}${bipDetail}</div></div>
      <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Pitch Zone</div><div style="font-weight:700;">${znLabel}</div></div>
      <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Field Zone</div><div style="font-weight:700;">${fzLabel}</div></div>
      ${p.velo?`<div style="grid-column:1/-1;"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Velocity</div><div style="font-weight:700;">${p.velo} mph</div></div>`:''}
    </div>
  `);
}
let _subSlotIdx=null;
function showSubBatterForSlot(i){ _subSlotIdx=i; showSubBatter(); }
function showSubBatter(){
  showModal('Substitution',`
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="btn btn-block" onclick="hideModal();showNewBatter();">New Batter</button>
      <button class="btn btn-block" onclick="hideModal();showExistingBatter();">Roster</button>
    </div>
  `);
}
function showNewBatter(){
  mHand='R';
  showModal('New Batter',`
    <div class="fgroup"><label>Name</label><input type="text" id="nb-name" placeholder="Name..."></div>
    <div class="fgroup"><label>Jersey #</label><input type="number" id="nb-num"></div>
    <div class="fgroup"><label>Bats</label>
      <div class="hand-row">
        <div class="hand-btn L" onclick="setModalHand('L')">L</div>
        <div class="hand-btn R on" onclick="setModalHand('R')">R</div>
        <div class="hand-btn S" onclick="setModalHand('S')">S</div>
      </div>
    </div>
    <button class="btn btn-primary btn-block" onclick="confirmNewBatter()">Confirm</button>
  `);
}
function confirmNewBatter(){
  const name=document.getElementById('nb-name').value.trim();
  const num=document.getElementById('nb-num').value.trim();
  const idx=_subSlotIdx!==null?_subSlotIdx:G.batterIdx%(G.lineup.length||1);
  _subSlotIdx=null;
  if(G.lineup[idx]) G.lineup[idx]={name:name||'Unknown',num,hand:mHand};
  else G.lineup.push({name:name||'Unknown',num,hand:mHand});
  save(); hideModal(); renderGame();
}
function showExistingBatter(){
  const cards=(G.lineup||[]).map((b,i)=>{
    const {color,bg}=_batterCircle(b);
    const summaries=getBatterABSummaries(b);
    return `
      <div onclick="selectBatter(${i})" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:14px;cursor:pointer;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:38px;height:38px;border-radius:50%;background:${bg};color:${color};font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${b.hand||'R'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:700;">#${b.num||'—'} ${b.name||'Unknown'}</div>
            <div style="font-size:12px;color:${summaries.length?'var(--text2)':'var(--text3)'};margin-top:4px;">${summaries.length?summaries.join(' · '):'No ABs yet'}</div>
          </div>
        </div>
      </div>`;
  }).join('');
  showModal('Re-entry',`
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${cards||'<div style="color:var(--text2);">No players in lineup.</div>'}
    </div>
  `);
}
function selectBatter(i){ G.batterIdx=i; save(); hideModal(); renderGame(); }
function showEditBatter(){
  const b=curB(); mHand=b?.hand||'R';
  showModal('Edit Batter',`
    <div class="fgroup"><label>Name</label><input type="text" id="eb-name" value="${b?.name||''}"></div>
    <div class="fgroup"><label>Jersey #</label><input type="number" id="eb-num" value="${b?.num||''}"></div>
    <div class="fgroup"><label>Bats</label>
      <div class="hand-row">
        <div class="hand-btn L ${mHand==='L'?'on':''}" onclick="setModalHand('L')">L</div>
        <div class="hand-btn R ${mHand==='R'?'on':''}" onclick="setModalHand('R')">R</div>
        <div class="hand-btn S ${mHand==='S'?'on':''}" onclick="setModalHand('S')">S</div>
      </div>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveEditBatter()">Save</button>
  `);
}
function saveEditBatter(){
  const b=curB(); if(!b)return;
  b.name=document.getElementById('eb-name').value.trim();
  b.num=document.getElementById('eb-num').value.trim();
  b.hand=mHand;
  save(); hideModal(); renderGame();
}
function skipBatter(){
  const idx=G.batterIdx%(G.lineup.length||1);
  if(!G.lineup[idx]) G.lineup.push({name:'Unknown',num:'',hand:'R'});
  else G.lineup[idx]={name:'Unknown',num:'',hand:'R'};
  renderGame();
}

// ══════════════════════════════════════════
// GAME MENU
// ══════════════════════════════════════════
function showGameMenu(){
  const ti=G?.trackIntended||false;
  showModal('Game Menu',`
    <div style="display:flex;gap:10px;margin-bottom:14px;">
      <div style="flex:1;"><label style="font-size:13px;">Our Score</label><input type="number" id="gm-ours" value="${G?.ourScore||0}" min="0"></div>
      <div style="flex:1;"><label style="font-size:13px;">Opp Score</label><input type="number" id="gm-opps" value="${G?.oppScore||0}" min="0"></div>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveScores()" style="margin-bottom:10px;">Update Score</button>
    <div class="divider"></div>
    <div onclick="toggleTrackIntended()" style="display:flex;align-items:center;justify-content:space-between;padding:12px 4px;cursor:pointer;border-bottom:1px solid var(--border);margin-bottom:10px;">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--text);">Track Intended Location</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">Prompts for intended zone after each pitch</div>
      </div>
      <div style="width:44px;height:26px;border-radius:13px;background:${ti?'var(--accent)':'var(--bg3)'};border:1px solid var(--border);position:relative;transition:background 0.2s;flex-shrink:0;">
        <div style="width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:2px;left:${ti?'21px':'2px'};transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="btn btn-block" onclick="showAnalytics(G?.id,'game');hideModal();">Analytics →</button>
      <button class="btn btn-block" onclick="doBackup();hideModal();">Backup Data</button>
      <button class="btn btn-block" onclick="hideModal();go('home');">← Home</button>
    </div>
  `);
}
function toggleTrackIntended(){
  if(!G)return;
  G.trackIntended=!G.trackIntended;
  save(); _updateHamTIBadge();
}
function showEditScore(){
  if(!G)return;
  showModal('Edit Score',`
    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Us</div>
        <input type="number" id="es-ours" value="${G.ourScore||0}" min="0" style="width:100%;font-size:32px;font-weight:800;text-align:center;background:var(--bg3);border:1px solid var(--border);border-radius:var(--rsm);padding:12px 0;color:var(--text);">
      </div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">${G.opp||'Opp'}</div>
        <input type="number" id="es-opps" value="${G.oppScore||0}" min="0" style="width:100%;font-size:32px;font-weight:800;text-align:center;background:var(--bg3);border:1px solid var(--border);border-radius:var(--rsm);padding:12px 0;color:var(--text);">
      </div>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveScores()">Save</button>
  `);
}
function saveScores(){
  if(!G)return;
  G.ourScore=parseInt(document.getElementById('es-ours').value)||0;
  G.oppScore=parseInt(document.getElementById('es-opps').value)||0;
  save(); hideModal(); renderGame();
}

document.addEventListener('pointermove', function(e){ if(_dg.on){dgMove(e);} }, {passive:false});
document.addEventListener('pointerup', function(){ dgEnd(); });
document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter') return;
  if(!document.getElementById('entry-ov').classList.contains('on')) return;
  const btn = document.getElementById('confirm-btn');
  if(btn && !btn.disabled){
    e.preventDefault();
    confirmStep();
  }
});

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
// Wake lock
async function requestWakeLock(){
  try{ if('wakeLock' in navigator) await navigator.wakeLock.request('screen'); }catch(e){}
}

// Redraw canvases on resize / orientation change
window.addEventListener('resize',()=>{ if(G){ drawZone(); drawSpray(); } });
window.addEventListener('orientationchange',()=>{ setTimeout(()=>{ if(G){ drawZone(); drawSpray(); }},150); });
