// ══════════════════════════════════════════
// PRACTICE MODE
// ══════════════════════════════════════════

const PRAC_MODES=[
  {id:'bullpen',title:'Bullpen',desc:'Free session — log pitch type, zone, and result'},
  {id:'live_bullpen',title:'Live Bullpen',desc:'Work from game situations with ball/strike count tracking'},
  {id:'command',title:'Command',desc:'Location accuracy drill — score 3/1/0 per pitch'},
  {id:'scripted',title:'Scripted',desc:'App-guided pitch sequences with FB weighting presets'},
  {id:'duel',title:'Duel',desc:'Two pitchers compete — alternate pitches or full bullpen'},
];
const FB_PRESETS=[
  {id:'rare',label:'Rare FB',fbPct:0.1},
  {id:'light',label:'Light FB',fbPct:0.25},
  {id:'even',label:'Even Mix',fbPct:0.45},
  {id:'heavy',label:'FB Heavy',fbPct:0.65},
  {id:'fb_only',label:'FB Only',fbPct:1.0},
];
const PRAC_RESULTS=['CS','Ball','Foul','Sw&M','GB','LD','Fly','PU'];
const DUEL_FORMATS=[
  {id:'alternate',label:'Alternate Pitches',sub:'Take turns one pitch at a time'},
  {id:'full',label:'Full Bullpen',sub:'Full count each, then compare scores'},
  {id:'horse_player',label:'HORSE — Player Called',sub:'Caller picks pitch & zone, both throw it'},
  {id:'horse_scripted',label:'HORSE — App Scripted',sub:'App scripts pitch & zone, both throw it'},
  {id:'fixed_player',label:'Fixed Count — Player Called',sub:'Caller picks each round, both throw for pts'},
  {id:'fixed_scripted',label:'Fixed Count — App Scripted',sub:'App scripts each round, both throw for pts'},
];
const HORSE_WORDS=[{id:'PIG',label:'PIG (3 letters)'},{id:'BULL',label:'BULL (4 letters)'},{id:'HORSE',label:'HORSE (5 letters)'}];

function _isNewDuelFmt(fmt){return['horse_player','horse_scripted','fixed_player','fixed_scripted'].includes(fmt);}
function _isHorseFmt(fmt){return fmt==='horse_player'||fmt==='horse_scripted';}
function _isScriptedDuelFmt(fmt){return fmt==='horse_scripted'||fmt==='fixed_scripted';}

let _PR=null;
let _pracZoneBound=false;
let _pracQuickAddQueue=[];
let _PS={step:0,mode:null,selectedPitchers:[],pitchCount:10,fbPreset:'even',focusZones:[],duelFormat:'alternate',horseWord:'HORSE',trackIntended:false};

function _pracModeLabel(id){const m=PRAC_MODES.find(x=>x.id===id);return m?m.title:id;}

// ── Practice Home ──
function renderPractice(){
  const el=document.getElementById('prac-home-body');
  const recs=(S.practices||[]).slice().reverse().slice(0,4);
  el.innerHTML=`
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:var(--text3);text-transform:uppercase;margin-bottom:8px;">Practice Mode</div>
    <button class="home-btn-primary" onclick="go('practice-setup')">+ New Practice Session</button>
    ${PRAC_MODES.map(m=>`<button class="home-btn-sec" onclick="pracQuickStart('${m.id}')">
      <div class="home-btn-sec-left"><div>${m.title}</div><div class="home-btn-sec-sub">${m.desc}</div></div>
      <div class="home-btn-sec-right"><span class="home-chevron">›</span></div>
    </button>`).join('')}
    ${recs.length?`<div style="font-size:10px;font-weight:700;letter-spacing:2px;color:var(--text3);text-transform:uppercase;margin:10px 0 6px;">Recent Practices</div>
    ${recs.map(p=>`<div class="prac-rec-card" onclick="pracViewSession('${p.id}')">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:14px;font-weight:700;">${_pracModeLabel(p.subMode)}</div>
        <div style="font-size:11px;color:var(--text3);">${p.date}</div>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px;">${(p.pitches||[]).length} pitches · ${(p.pitchers||[]).map(x=>x.name.split(' ').pop()).join(', ')}</div>
    </div>`).join('')}`:''}
    <button class="home-btn-sec" onclick="go('practice-stats')" style="margin-top:6px;">
      <div class="home-btn-sec-left"><div>Practice Season Stats</div><div class="home-btn-sec-sub">All-time stats across every saved session</div></div>
      <div class="home-btn-sec-right"><span class="home-chevron">›</span></div>
    </button>
  `;
}

function pracQuickStart(modeId){
  _PS={step:1,mode:modeId,selectedPitchers:[],pitchCount:modeId==='duel'?10:20,fbPreset:'even',focusZones:[],duelFormat:'alternate',horseWord:'HORSE',trackIntended:(modeId==='command')||!!(S.settings&&S.settings.trackIntendedDefault)};
  go('practice-setup');
}

function pracViewSession(id){
  const prac=(S.practices||[]).find(p=>p.id===id);
  if(!prac)return;
  showModal(_pracModeLabel(prac.subMode),`
    <div style="margin-bottom:10px;">
      <div style="font-size:12px;color:var(--text3);">${prac.date} · ${(prac.pitchers||[]).map(p=>p.name).join(', ')}</div>
    </div>
    ${_pracAnalytics(prac)}
    <div style="height:12px;"></div>
    <button class="btn btn-danger btn-block" style="margin-top:4px;" onclick="pracDeleteSavedSession('${id}')">Delete Session</button>
  `);
  requestAnimationFrame(()=>_drawPracHeatMap(prac.pitches||[],prac.subMode));
}

function pracDeleteSavedSession(id){
  S.practices=(S.practices||[]).filter(p=>p.id!==id);
  save();hideModal();renderPractice();
}

// ── Setup ──
function renderPracSetup(){_renderPracSetupStep(_PS.step);}

function _renderPracSetupStep(step){
  _PS.step=step;
  const title=document.getElementById('prac-setup-title');
  const nextBtn=document.getElementById('prac-setup-next');
  const body=document.getElementById('prac-setup-body');
  if(!title||!nextBtn||!body)return;

  if(step===0){
    title.textContent='Select Mode';
    nextBtn.style.display='none';
    body.innerHTML=`<div style="padding:16px;">${PRAC_MODES.map(m=>`
      <div class="prac-mode-card${_PS.mode===m.id?' sel':''}" onclick="pracSelectMode('${m.id}')">
        <div class="prac-mode-info">
          <div class="prac-mode-title">${m.title}</div>
          <div class="prac-mode-desc">${m.desc}</div>
        </div>
        <span style="font-size:18px;color:${_PS.mode===m.id?'var(--accent)':'var(--border2)'};">${_PS.mode===m.id?'●':'○'}</span>
      </div>`).join('')}</div>`;

  }else if(step===1){
    title.textContent='Select Pitchers';
    nextBtn.style.display=_PS.selectedPitchers.length?'block':'none';
    nextBtn.textContent='Next →';
    const pitchers=S.pitchers.filter(p=>p.active!==false);
    const sessOnly=_PS.selectedPitchers.filter(x=>x.sessionOnly);
    body.innerHTML=`<div style="padding:16px;">
      <div style="font-size:12px;color:var(--text3);margin-bottom:12px;">Select one or more pitchers for this session.</div>
      ${pitchers.map((p,i)=>{
        const sel=_PS.selectedPitchers.some(x=>x.name===p.name&&!x.sessionOnly);
        return `<div class="prac-pitcher-chip${sel?' sel':''}" onclick="pracTogglePitcherIdx(${i})">
          <div class="prac-pitcher-check">${sel?'✓':''}</div>
          <div style="flex:1;">
            <div class="prac-pitcher-name-txt">${p.name}</div>
            <div class="prac-pitcher-sub">#${p.num||'—'} · ${p.throws||'R'}HP · ${(p.arsenal||[]).join(', ')}</div>
          </div>
        </div>`;
      }).join('')}
      ${sessOnly.map((p,i)=>`<div class="prac-pitcher-chip sel" onclick="pracRemoveSessIdx(${i})">
        <div class="prac-pitcher-check">✓</div>
        <div style="flex:1;">
          <div class="prac-pitcher-name-txt">${p.name} <span style="font-size:10px;color:var(--text3);font-weight:400;">(session only)</span></div>
          <div class="prac-pitcher-sub">Tap to remove</div>
        </div>
      </div>`).join('')}
      <div class="prac-pitcher-chip" onclick="pracAddSessionPitcher()" style="border-style:dashed;margin-top:4px;">
        <div class="prac-pitcher-check" style="border-style:dashed;font-size:16px;">+</div>
        <div style="flex:1;">
          <div class="prac-pitcher-name-txt" style="color:var(--text3);">Add Session-Only Pitcher</div>
          <div class="prac-pitcher-sub">Not saved to your roster</div>
        </div>
      </div>
    </div>`;

  }else if(step===2){
    title.textContent='Options';
    nextBtn.textContent='Start →';
    nextBtn.style.display='block';
    const mode=_PS.mode;
    const needsFB=mode==='scripted'||mode==='live_bullpen';
    const needsFocus=mode==='scripted'||mode==='live_bullpen'||mode==='command';
    const needsDuel=mode==='duel';
    const needsIntended=mode==='command';
    const isHorseFmt=needsDuel&&_isHorseFmt(_PS.duelFormat);
    const isFixedFmt=needsDuel&&(_PS.duelFormat==='fixed_player'||_PS.duelFormat==='fixed_scripted');
    body.innerHTML=`<div style="padding:16px;display:flex;flex-direction:column;gap:20px;">
      ${isHorseFmt?'':`<div>
        <div class="section-title">${isFixedFmt?'Rounds':'Pitch Count'}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:10px;">
          <button onclick="_PS.pitchCount=Math.max(1,(_PS.pitchCount||10)-1);document.getElementById('prac-cnt-in').value=_PS.pitchCount;" style="width:40px;height:40px;background:var(--bg3);border:1.5px solid var(--border2);border-radius:var(--rsm);font-size:22px;font-weight:400;color:var(--text);cursor:pointer;">−</button>
          <input type="number" id="prac-cnt-in" value="${_PS.pitchCount}" min="1" max="100" oninput="_PS.pitchCount=Math.min(100,Math.max(1,parseInt(this.value)||1))" style="width:76px;text-align:center;padding:10px 6px;background:var(--bg3);border:1.5px solid var(--border2);border-radius:var(--rsm);color:var(--text);font-size:20px;font-weight:700;font-family:inherit;">
          <button onclick="_PS.pitchCount=Math.min(100,(_PS.pitchCount||10)+1);document.getElementById('prac-cnt-in').value=_PS.pitchCount;" style="width:40px;height:40px;background:var(--bg3);border:1.5px solid var(--border2);border-radius:var(--rsm);font-size:22px;font-weight:400;color:var(--text);cursor:pointer;">+</button>
          <span style="font-size:13px;color:var(--text3);margin-left:4px;">${isFixedFmt?'rounds':'pitches'}</span>
        </div>
      </div>`}
      ${needsFB?`<div>
        <div class="section-title">Fastball Incorporation</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:2px;">First 3 pitches are always fastball.</div>
        <div class="prac-preset-row">${FB_PRESETS.map(p=>`<button class="prac-preset-btn${_PS.fbPreset===p.id?' sel':''}" onclick="pracSetFB('${p.id}')">${p.label}</button>`).join('')}</div>
      </div>`:''}
      ${needsFocus?`<div>
        <div class="section-title">Focus Zones <span style="font-weight:400;text-transform:none;font-size:11px;color:var(--text3);">(optional)</span></div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:8px;">Weight scenarios toward specific zones. Zones 7–9 = down in zone.</div>
        <div style="display:grid;grid-template-columns:repeat(3,48px);gap:6px;">
          ${[1,2,3,4,5,6,7,8,9].map(z=>`<button class="prac-preset-btn${_PS.focusZones.includes(z)?' sel':''}" onclick="pracToggleFocus(${z})" style="text-align:center;">${z}</button>`).join('')}
        </div>
      </div>`:''}
      ${needsDuel?`<div>
        <div class="section-title">Duel Format</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">
          ${DUEL_FORMATS.map(f=>`<div class="prac-mode-card${_PS.duelFormat===f.id?' sel':''}" onclick="pracSetDuelFmt('${f.id}')" style="padding:10px 12px;">
            <div class="prac-mode-info">
              <div class="prac-mode-title" style="font-size:13px;">${f.label}</div>
              <div class="prac-mode-desc">${f.sub}</div>
            </div>
            <span style="font-size:18px;color:${_PS.duelFormat===f.id?'var(--accent)':'var(--border2)'};">${_PS.duelFormat===f.id?'●':'○'}</span>
          </div>`).join('')}
        </div>
        ${isHorseFmt?`<div style="margin-top:14px;">
          <div class="section-title">HORSE Word</div>
          <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
            ${HORSE_WORDS.map(w=>`<div class="tog-btn${_PS.horseWord===w.id?' on':''}" onclick="pracSetHorseWord('${w.id}')" style="flex:1;text-align:center;">${w.label}</div>`).join('')}
          </div>
        </div>`:''}
      </div>`:''}
      ${needsIntended?`<div>
        <div class="section-title">Track Intended Location</div>
        <div class="tog-row" style="max-width:200px;">
          <div class="tog-btn${_PS.trackIntended?' on':''}" onclick="_PS.trackIntended=true;_renderPracSetupStep(2)">On</div>
          <div class="tog-btn${!_PS.trackIntended?' on':''}" onclick="_PS.trackIntended=false;_renderPracSetupStep(2)">Off</div>
        </div>
      </div>`:''}
    </div>`;
  }
}

function pracSelectMode(id){
  _PS.mode=id;
  if(id==='command') _PS.trackIntended=true;
  _renderPracSetupStep(1);
}
function pracTogglePitcherIdx(idx){
  const p=S.pitchers.filter(x=>x.active!==false)[idx];
  if(!p)return;
  const ei=_PS.selectedPitchers.findIndex(x=>!x.sessionOnly&&x.name===p.name);
  if(ei>=0) _PS.selectedPitchers.splice(ei,1);
  else _PS.selectedPitchers.push({...p,sessionOnly:false,appId:'pa_'+Date.now()+'_'+idx});
  _renderPracSetupStep(1);
}
function pracRemoveSessIdx(idx){
  const so=_PS.selectedPitchers.filter(x=>x.sessionOnly);
  if(so[idx]) _PS.selectedPitchers=_PS.selectedPitchers.filter(x=>x!==so[idx]);
  _renderPracSetupStep(1);
}
function pracAddSessionPitcher(){
  showModal('Session-Only Pitcher',`
    <div style="font-size:13px;color:var(--text3);margin-bottom:14px;">This pitcher won't be saved to your roster.</div>
    <div class="fgroup"><label>Name</label><input type="text" id="sess-p-name" placeholder="Pitcher name..."></div>
    <div class="fgroup" style="margin-bottom:0;"><label>Throws</label>
      <select id="sess-p-hand"><option value="R">RHP</option><option value="L">LHP</option></select>
    </div>
    <button class="btn btn-primary btn-block" style="margin-top:16px;" onclick="pracConfirmSessionPitcher()">Add Pitcher</button>
  `);
}
function pracConfirmSessionPitcher(){
  const nameEl=document.getElementById('sess-p-name');
  const handEl=document.getElementById('sess-p-hand');
  const name=nameEl?nameEl.value.trim():'';
  if(!name){showModal('Error','<div class="empty">Please enter a name.</div>');return;}
  _PS.selectedPitchers.push({name,throws:handEl?handEl.value:'R',arsenal:['FB','SL','CH'],num:'',sessionOnly:true,appId:'sess_'+Date.now()});
  hideModal();
  _renderPracSetupStep(1);
}
function pracSetFB(id){_PS.fbPreset=id;_renderPracSetupStep(2);}
function pracToggleFocus(z){
  const i=_PS.focusZones.indexOf(z);
  if(i>=0) _PS.focusZones.splice(i,1); else _PS.focusZones.push(z);
  _renderPracSetupStep(2);
}
function pracSetDuelFmt(f){_PS.duelFormat=f;_renderPracSetupStep(2);}
function pracSetHorseWord(w){_PS.horseWord=w;_renderPracSetupStep(2);}

function pracSetupBack(){
  if(_PS.step===0) go('practice');
  else if(_PS.step===1) _renderPracSetupStep(0);
  else _renderPracSetupStep(1);
}
function pracSetupNext(){
  if(_PS.step===1){
    if(!_PS.selectedPitchers.length){showModal('No Pitchers','<div class="empty">Select at least one pitcher to continue.</div>');return;}
    if(_PS.mode==='duel'&&_PS.selectedPitchers.length<2){showModal('Duel Mode','<div class="empty">Duel mode requires at least 2 pitchers.</div>');return;}
    _renderPracSetupStep(2);
  }else if(_PS.step===2){
    pracBeginSession();
  }
}

// ── Session ──
function pracBeginSession(){
  if(!_PS.selectedPitchers.length||!_PS.mode)return;
  const isNew=_isNewDuelFmt(_PS.duelFormat);
  _PR={
    id:'prac_'+Date.now(),
    subMode:_PS.mode,
    date:new Date().toISOString().split('T')[0],
    pitchers:_PS.selectedPitchers.map((p,i)=>({...p,appId:p.appId||('pa_'+i+'_'+Date.now())})),
    pitchCount:_PS.pitchCount,
    fbPreset:_PS.fbPreset,
    focusZones:_PS.focusZones,
    duelFormat:_PS.duelFormat,
    horseWord:_PS.horseWord||'HORSE',
    trackIntended:_PS.mode==='scripted'?false:(_PS.trackIntended||(_PS.mode==='command')),
    pitches:[],duelScores:{},
    _pitcherIdx:0,
    _pitchType:null,_zx:null,_zy:null,_izx:null,_izy:null,_result:null,
    _balls:0,_strikes:0,_duelPitchesThrown:{},_suggestion:null,_keepScenario:false,
    // New duel (HORSE / fixed) state
    _duelPhase:null,_duelRound:1,_duelCallerIdx:0,
    _duelCalledType:null,_duelCalledCell:null,_duelCalledZx:null,_duelCalledZy:null,
    _duelP1Throw:null,_duelLetters:{},
  };
  _PR.pitchers.forEach(p=>{
    _PR.duelScores[p.appId]=0;
    _PR._duelPitchesThrown[p.appId]=0;
    _PR._duelLetters[p.appId]='';
  });
  if(_PS.mode==='scripted'){
    _PR._suggestion=_pracNextSuggestion(_PR.pitchers[0]);
    _PR._pitchType=_PR._suggestion.type;
  }
  if(isNew){
    const isScripted=_isScriptedDuelFmt(_PS.duelFormat);
    _PR._duelPhase=isScripted?'throw1':'call';
    _PR._pitcherIdx=0; // caller/P1 always starts
    if(isScripted){
      _PR._suggestion=_pracNextSuggestion(_PR.pitchers[0]);
      _pracApplyScriptedDuelCall(_PR._suggestion);
    }
  }
  _pracZoneBound=false;
  go('practice-session');
  _renderPracSession();
}

// Sets _duelCalledType, _duelCalledCell, _duelCalledZx/Zy from a suggestion object
function _pracApplyScriptedDuelCall(sg){
  if(!_PR||!sg)return;
  _PR._duelCalledType=sg.type;
  _PR._pitchType=sg.type;
  const z=sg.zone;
  const sr=Math.floor((z-1)/3),sc=(z-1)%3;
  _PR._duelCalledCell={row:sr,col:sc};
  _PR._duelCalledZx=0.2+sc*0.2+0.1;
  _PR._duelCalledZy=0.2+sr*0.2+0.1;
}

function _renderPracSession(){
  if(!_PR)return;
  const mode=_PR.subMode;
  const pitcher=_PR.pitchers[_PR._pitcherIdx];
  const pitchNum=_PR.pitches.length+1;
  const isNewDuel=mode==='duel'&&_isNewDuelFmt(_PR.duelFormat);
  const isHorseDuel=isNewDuel&&_isHorseFmt(_PR.duelFormat);
  const duelPhase=_PR._duelPhase;

  document.getElementById('prac-session-title').textContent=isNewDuel?
    `Duel — ${duelPhase==='call'?'Calling':duelPhase==='throw1'?'Throw 1':'Throw 2'}`:
    _pracModeLabel(mode);
  document.getElementById('prac-sess-pitcher').textContent=pitcher.name;
  document.getElementById('prac-sess-count').textContent=isNewDuel?
    (isHorseDuel?`Round ${_PR._duelRound}`:`Round ${_PR._duelRound} of ${_PR.pitchCount}`):
    `Pitch ${pitchNum} of ${_PR.pitchCount}`;

  const sw=document.getElementById('prac-sess-switch');
  if(sw) sw.style.display=(_PR.pitchers.length>1&&mode!=='duel')?'block':'none';

  // Context bars
  const barsEl=document.getElementById('prac-context-bars');
  if(barsEl){
    let bars='';
    if(mode==='duel'){
      if(isNewDuel){
        const word=_PR.horseWord||'HORSE';
        bars+=`<div class="prac-duel-bar">${_PR.pitchers.map((p,i)=>{
          const active=i===_PR._pitcherIdx;
          if(isHorseDuel){
            const got=(_PR._duelLetters[p.appId]||'').length;
            const spelled=word.slice(0,got).split('').map(ch=>`<span style="color:rgba(232,85,85,0.9);font-weight:800;">${ch}</span>`).join('');
            const rem=word.slice(got).split('').map(ch=>`<span style="opacity:0.22;">${ch}</span>`).join('');
            return `<div class="prac-duel-half${active?' active':''}">
              <div class="prac-duel-pname">${p.name.split(' ').pop()}</div>
              <div class="prac-duel-pts" style="font-size:15px;letter-spacing:4px;">${spelled}${rem}</div>
            </div>`;
          }else{
            return `<div class="prac-duel-half${active?' active':''}">
              <div class="prac-duel-pname">${p.name.split(' ').pop()}</div>
              <div class="prac-duel-pts">${_PR.duelScores[p.appId]||0}</div>
            </div>`;
          }
        }).join('<div style="width:1px;background:var(--border);flex-shrink:0;"></div>')}</div>`;
        if(_isScriptedDuelFmt(_PR.duelFormat)&&_PR._suggestion&&(duelPhase==='throw1'||duelPhase==='throw2')){
          const sg=_PR._suggestion;
          bars+=`<div class="prac-script-card">
            <div class="prac-script-hand ${sg.hand}">${sg.hand}HH</div>
            <div class="prac-script-pitch">${sg.type} · <span class="prac-script-zone">Zone ${sg.zone}</span></div>
          </div>`;
        }
      }else{
        bars+=`<div class="prac-duel-bar">${_PR.pitchers.map((p,i)=>{
          const active=i===_PR._pitcherIdx;
          return `<div class="prac-duel-half${active?' active':''}">
            <div class="prac-duel-pname">${p.name.split(' ').pop()}</div>
            <div class="prac-duel-pts">${_PR.duelScores[p.appId]||0}</div>
          </div>`;
        }).join('<div style="width:1px;background:var(--border);flex-shrink:0;"></div>')}</div>`;
      }
    }
    if(mode==='live_bullpen'){
      bars+=`<div class="prac-situation-bar">
        <div><div class="prac-sit-num">${_PR._balls}</div><div class="prac-sit-lbl">Balls</div></div>
        <div class="prac-sit-sep">–</div>
        <div><div class="prac-sit-num">${_PR._strikes}</div><div class="prac-sit-lbl">Strikes</div></div>
      </div>`;
    }
    if(mode==='scripted'){
      // Don't regenerate — use stored suggestion (set in pracBeginSession / pracConfirmPitch)
      const sg=_PR._suggestion||{type:'FB',zone:5,hand:'R'};
      bars+=`<div class="prac-script-card">
        <div class="prac-script-hand ${sg.hand}">${sg.hand}HH</div>
        <div class="prac-script-pitch">${sg.type} · <span class="prac-script-zone">Zone ${sg.zone}</span></div>
      </div>`;
    }
    barsEl.innerHTML=bars;
  }

  // Score row (command / duel)
  const scoreRow=document.getElementById('prac-score-row');
  if(scoreRow){
    if(mode==='command'||(mode==='duel'&&!isHorseDuel)){
      const pts=_PR.pitches.reduce((a,p)=>a+(p.score||0),0);
      const total=_PR.pitches.length;
      scoreRow.style.display='flex';
      scoreRow.innerHTML=`<span class="prac-score-item"><span class="prac-score-val">${pts}</span> pts</span>
        <span class="prac-score-item">${total?`avg ${Math.round(pts/total*10)/10}`:''}</span>`;
    }else{scoreRow.style.display='none';}
  }

  _updatePracHint();

  // Type buttons — pre-select suggested type for scripted mode
  const arsenal=(pitcher.arsenal&&pitcher.arsenal.length)?pitcher.arsenal:['FB','SL','CH'];
  const typeEl=document.getElementById('prac-type-row');
  if(typeEl) typeEl.innerHTML=arsenal.map(t=>{
    const esc=t.replace(/&/g,'&amp;').replace(/'/g,'&#39;');
    return`<button class="prac-t-btn${_PR._pitchType===t?' on':''}" data-pt="${esc}" onclick="pracSelType('${esc}')">${esc}</button>`;
  }).join('');

  // Result row (hidden for command and new duel formats)
  const resultEl=document.getElementById('prac-result-row');
  if(resultEl){
    if(mode==='command'||isNewDuel){
      resultEl.style.display='none';
    }else{
      resultEl.style.display='grid';
      resultEl.innerHTML=PRAC_RESULTS.map(r=>{
        const esc=r.replace(/&/g,'&amp;').replace(/'/g,'&#39;');
        return`<button class="prac-r-btn${_PR._result===r?' on':''}" data-res="${esc}" onclick="pracSelResult('${esc}')">${esc}</button>`;
      }).join('');
    }
  }

  _updatePracConfirm();

  // New duel: update confirm button text
  const confirmBtn=document.getElementById('prac-confirm-btn');
  if(confirmBtn){
    if(isNewDuel){
      confirmBtn.textContent=duelPhase==='call'?'Lock In Call':'Log Throw';
    }else{
      confirmBtn.textContent='Log Pitch';
    }
  }

  // Bind zone canvas (once per session); touchstart handles mobile since touch-action:none suppresses click
  const cv=document.getElementById('prac-zone-cv');
  if(cv&&!_pracZoneBound){
    cv.addEventListener('click',_pracZoneTap);
    cv.addEventListener('touchstart',_pracZoneTouchStart,{passive:false});
    _pracZoneBound=true;
  }
  requestAnimationFrame(()=>_drawPracZone());
}

function _pracNextSuggestion(pitcher){
  const pitcherPitches=_PR.pitches.filter(p=>p.pitcherId===pitcher.appId);
  const n=pitcherPitches.length+1;
  const arsenal=pitcher.arsenal||['FB','SL','CH'];
  const fbTypes=arsenal.filter(t=>['FB','2S','SI'].includes(t));
  const nonFB=arsenal.filter(t=>!['FB','2S','SI'].includes(t));
  const fbOpt=fbTypes.length?fbTypes[0]:(arsenal[0]||'FB');

  // Pick pitch type with FB weighting
  let type;
  if(n<=3) type=fbOpt;
  else if(n<=7&&fbTypes.length&&Math.random()<0.7) type=fbOpt;
  else{
    const preset=FB_PRESETS.find(p=>p.id===_PR.fbPreset)||FB_PRESETS[2];
    if(fbTypes.length&&Math.random()<preset.fbPct) type=fbTypes[Math.floor(Math.random()*fbTypes.length)];
    else if(nonFB.length) type=nonFB[Math.floor(Math.random()*nonFB.length)];
    else type=arsenal[0]||'FB';
  }

  // Pick zone (weighted by focusZones when set, 60% of the time)
  let zone;
  if(_PR.focusZones&&_PR.focusZones.length&&Math.random()<0.6){
    zone=_PR.focusZones[Math.floor(Math.random()*_PR.focusZones.length)];
  }else{
    zone=Math.floor(Math.random()*9)+1;
  }

  // Random batter hand
  const hand=Math.random()<0.5?'L':'R';

  return{type,zone,hand};
}

function _drawPracZone(){
  const cv=document.getElementById('prac-zone-cv');
  if(!cv||!_PR)return;
  const dpr=window.devicePixelRatio||1;
  const rect=cv.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  if(cv.width!==Math.round(rect.width*dpr)||cv.height!==Math.round(rect.height*dpr)){
    cv.width=Math.round(rect.width*dpr);
    cv.height=Math.round(rect.height*dpr);
  }
  const ctx=cv.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=rect.width,H=rect.height;
  ctx.clearRect(0,0,W,H);

  // Background + 5x5 grid
  ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(0,0,W,H);
  const cw=W/5,ch=H/5;
  ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=0.75;
  for(let i=1;i<5;i++){
    ctx.beginPath();ctx.moveTo(i*cw,0);ctx.lineTo(i*cw,H);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,i*ch);ctx.lineTo(W,i*ch);ctx.stroke();
  }

  // Strike zone
  const szX=cw,szY=ch,szW=cw*3,szH=ch*3;
  ctx.fillStyle='rgba(255,255,255,0.05)';ctx.fillRect(szX,szY,szW,szH);

  // New duel: called/scripted zone cell highlight
  if(_PR.subMode==='duel'&&_isNewDuelFmt(_PR.duelFormat)&&_PR._duelPhase){
    const ph=_PR._duelPhase;
    let drawCell=null,fillC,strokeC;
    if(ph==='call'&&_PR._duelCalledCell){
      drawCell=_PR._duelCalledCell;fillC='rgba(245,200,66,0.22)';strokeC='rgba(245,200,66,0.7)';
    }else if((ph==='throw1'||ph==='throw2')&&_PR._duelCalledCell){
      drawCell=_PR._duelCalledCell;fillC='rgba(74,158,255,0.22)';strokeC='rgba(74,158,255,0.7)';
    }
    if(drawCell){
      const dcx=szX+drawCell.col*(szW/3),dcy=szY+drawCell.row*(szH/3),dcw=szW/3,dch=szH/3;
      ctx.fillStyle=fillC;ctx.fillRect(dcx,dcy,dcw,dch);
      ctx.strokeStyle=strokeC;ctx.lineWidth=2;ctx.strokeRect(dcx+1,dcy+1,dcw-2,dch-2);
    }
    if(ph==='throw2'&&_PR._duelP1Throw&&_PR._duelP1Throw.zx!=null){
      const gx=_PR._duelP1Throw.zx*W,gy=_PR._duelP1Throw.zy*H;
      ctx.beginPath();ctx.arc(gx,gy,11,0,Math.PI*2);
      ctx.fillStyle='rgba(74,200,100,0.18)';ctx.fill();
      ctx.strokeStyle='rgba(74,200,100,0.65)';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='rgba(74,200,100,0.8)';
      ctx.font='bold 8px -apple-system';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('P1',gx,gy);
    }
  }

  // Target zone highlight (scripted mode)
  if(_PR.subMode==='scripted'&&_PR._suggestion&&_PR._suggestion.zone){
    const z=_PR._suggestion.zone;
    const sr=Math.floor((z-1)/3); // row 0-2
    const sc=(z-1)%3;             // col 0-2
    const cx=szX+sc*(szW/3), cy=szY+sr*(szH/3), cw3=szW/3, ch3=szH/3;
    ctx.fillStyle='rgba(74,158,255,0.22)';ctx.fillRect(cx,cy,cw3,ch3);
    ctx.strokeStyle='rgba(74,158,255,0.7)';ctx.lineWidth=2;
    ctx.strokeRect(cx+1,cy+1,cw3-2,ch3-2);
    // Zone number label inside cell
    ctx.fillStyle='rgba(74,158,255,0.7)';
    ctx.font='bold 14px -apple-system';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(z,cx+cw3/2,cy+ch3/2);
  }

  ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=2.5;ctx.strokeRect(szX,szY,szW,szH);
  ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=0.75;
  for(let i=1;i<3;i++){
    ctx.beginPath();ctx.moveTo(szX+i*(szW/3),szY);ctx.lineTo(szX+i*(szW/3),szY+szH);ctx.stroke();
    ctx.beginPath();ctx.moveTo(szX,szY+i*(szH/3));ctx.lineTo(szX+szW,szY+i*(szH/3));ctx.stroke();
  }

  // Ghost recent pitches
  const recent=_PR.pitches.slice(-6);
  recent.forEach((p,i)=>{
    if(p.zx==null)return;
    const alpha=0.15+(i/recent.length)*0.35;
    const x=p.zx*W,y=p.zy*H;
    if(p.izx!=null){
      ctx.save();ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.arc(p.izx*W,p.izy*H,6,0,Math.PI*2);
      ctx.strokeStyle=`rgba(245,200,66,${alpha})`;ctx.lineWidth=1.5;ctx.stroke();
      ctx.setLineDash([]);ctx.restore();
    }
    ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);
    ctx.fillStyle=`rgba(74,158,255,${alpha})`;ctx.fill();
    if((_PR.subMode==='command'||_PR.subMode==='duel')&&p.score!=null){
      ctx.fillStyle=`rgba(255,255,255,${alpha})`;
      ctx.font='bold 9px -apple-system';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(p.score+'p',x,y);
    }
  });

  // Chase highlight: swing on out-of-zone pitch (shadow zones 11–14)
  const swingResults=new Set(['Sw&M','Foul','GB','LD','Fly','PU']);
  recent.forEach((p,i)=>{
    if(p.zx==null||!swingResults.has(p.result)) return;
    const zn=getZoneNum(p.zx,p.zy);
    if(zn<11||zn>14) return;
    const alpha=0.30+(i/recent.length)*0.55;
    const x=p.zx*W,y=p.zy*H;
    ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);
    ctx.strokeStyle=`rgba(240,135,58,${alpha})`;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=`rgba(240,135,58,${alpha})`;
    ctx.font='bold 7px -apple-system';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('C',x,y-15);
  });

  // Pending intended (yellow dashed ring)
  if(_PR._izx!==null){
    const ix=_PR._izx*W,iy=_PR._izy*H;
    ctx.save();ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.arc(ix,iy,11,0,Math.PI*2);
    ctx.strokeStyle='rgba(245,200,66,0.9)';ctx.lineWidth=2;ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
    ctx.strokeStyle='rgba(245,200,66,0.6)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(ix-7,iy);ctx.lineTo(ix+7,iy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ix,iy-7);ctx.lineTo(ix,iy+7);ctx.stroke();
  }

  // Pending actual
  if(_PR._zx!==null){
    const ax=_PR._zx*W,ay=_PR._zy*H;
    ctx.beginPath();ctx.arc(ax,ay,11,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.beginPath();ctx.arc(ax,ay,5,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.fill();
  }
}

function _pracZoneTap(e){
  if(!_PR)return;
  const cv=document.getElementById('prac-zone-cv');
  if(!cv)return;
  const rect=cv.getBoundingClientRect();
  const zx=(e.clientX-rect.left)/rect.width;
  const zy=(e.clientY-rect.top)/rect.height;

  // New duel call phase: snap to zone cell
  if(_PR.subMode==='duel'&&_isNewDuelFmt(_PR.duelFormat)&&_PR._duelPhase==='call'){
    const sz=_szCell(zx,zy);
    if(sz){
      _PR._duelCalledCell=sz;
      _PR._duelCalledZx=0.2+sz.col*0.2+0.1;
      _PR._duelCalledZy=0.2+sz.row*0.2+0.1;
    }else{
      _PR._duelCalledCell=null;_PR._duelCalledZx=null;_PR._duelCalledZy=null;
    }
    _updatePracHint();_updatePracConfirm();
    requestAnimationFrame(()=>_drawPracZone());
    return;
  }

  if(_PR.trackIntended){
    if(_PR._izx===null){
      _PR._izx=zx;_PR._izy=zy;
    }else if(_PR._zx===null){
      _PR._zx=zx;_PR._zy=zy;
    }else{
      _PR._izx=zx;_PR._izy=zy;_PR._zx=null;_PR._zy=null;
    }
  }else{
    _PR._zx=zx;_PR._zy=zy;
  }
  _updatePracHint();_updatePracConfirm();
  requestAnimationFrame(()=>_drawPracZone());
}
// touch-action:none on the canvas suppresses click synthesis on iOS — handle touch directly
function _pracZoneTouchStart(e){
  e.preventDefault(); // prevent scroll and stop click from also firing
  const t=e.touches[0]||e.changedTouches[0];
  if(t) _pracZoneTap({clientX:t.clientX,clientY:t.clientY});
}

function _updatePracHint(){
  const hint=document.getElementById('prac-intended-hint');
  if(!hint||!_PR){return;}
  if(_PR.subMode==='duel'&&_isNewDuelFmt(_PR.duelFormat)){
    if(_PR._duelPhase==='call'){
      hint.style.display='block';
      hint.textContent=_PR._duelCalledCell?'Cell selected — tap to change':'Tap a zone cell to call';
    }else{hint.style.display='none';}
    return;
  }
  if(!_PR.trackIntended){hint.style.display='none';return;}
  if(_PR._izx===null){hint.style.display='block';hint.textContent='1. Tap intended location';}
  else if(_PR._zx===null){hint.style.display='block';hint.textContent='2. Tap actual location';}
  else{hint.style.display='none';}
}

function _updatePracConfirm(){
  const btn=document.getElementById('prac-confirm-btn');
  if(!btn||!_PR)return;
  const mode=_PR.subMode;
  const hasZone=_PR._zx!==null;
  const hasType=_PR._pitchType!==null;
  const intOk=!_PR.trackIntended||(_PR._izx!==null&&_PR._zx!==null);
  if(mode==='duel'&&_isNewDuelFmt(_PR.duelFormat)){
    const phase=_PR._duelPhase;
    btn.disabled=phase==='call'?(!(hasType&&_PR._duelCalledCell!==null)):(!(hasZone&&hasType));
    const rbtn=document.getElementById('prac-repeat-btn');
    if(rbtn)rbtn.style.display='none';
    return;
  }
  // Result is optional for all modes — zone + type is enough to log
  const ok=mode==='command'?hasZone&&intOk&&hasType:hasZone&&hasType;
  btn.disabled=!ok;
  const rbtn=document.getElementById('prac-repeat-btn');
  if(rbtn){
    const showRepeat=mode==='scripted'||mode==='live_bullpen';
    rbtn.style.display=showRepeat?'block':'none';
    rbtn.disabled=!ok;
  }
}

function pracSelType(t){
  if(!_PR)return;
  _PR._pitchType=t;
  document.querySelectorAll('.prac-t-btn').forEach(b=>b.classList.toggle('on',b.dataset.pt===t));
  _updatePracConfirm();
}
function pracSelResult(r){
  if(!_PR)return;
  _PR._result=r;
  document.querySelectorAll('.prac-r-btn').forEach(b=>b.classList.toggle('on',b.dataset.res===r));
  _updatePracConfirm();
}

function _pracCommandScore(izx,izy,zx,zy){
  function cell(x,y){
    if(x<0.2||x>0.8||y<0.2||y>0.8)return null;
    return{r:Math.min(2,Math.floor((y-0.2)/0.2)),c:Math.min(2,Math.floor((x-0.2)/0.2))};
  }
  const ic=cell(izx,izy),ac=cell(zx,zy);
  if(!ic||!ac)return 0;
  if(ic.r===ac.r&&ic.c===ac.c)return 3;
  if(Math.abs(ic.r-ac.r)<=1&&Math.abs(ic.c-ac.c)<=1)return 1;
  return 0;
}

function pracRepeatPitch(){
  if(!_PR)return;
  _PR._keepScenario=true;
  pracConfirmPitch();
}

function pracConfirmPitch(){
  if(!_PR)return;
  if(_PR.subMode==='duel'&&_isNewDuelFmt(_PR.duelFormat)){_pracDuelPhaseAdvance();return;}
  const pitcher=_PR.pitchers[_PR._pitcherIdx];
  const mode=_PR.subMode;
  const keep=_PR._keepScenario;
  const lastType=_PR._pitchType;
  let score=0;
  if(mode==='command'||mode==='duel'){
    if(_PR._izx!==null&&_PR._zx!==null) score=_pracCommandScore(_PR._izx,_PR._izy,_PR._zx,_PR._zy);
    _PR.duelScores[pitcher.appId]=(_PR.duelScores[pitcher.appId]||0)+score;
  }
  // Scripted: auto-capture intended from highlighted zone center
  let izx=_PR._izx, izy=_PR._izy;
  if(mode==='scripted'&&_PR._suggestion&&_PR._suggestion.zone){
    const z=_PR._suggestion.zone;
    const sr=Math.floor((z-1)/3), sc=(z-1)%3;
    izx=0.2+sc*0.2+0.1;
    izy=0.2+sr*0.2+0.1;
  }
  _PR.pitches.push({
    id:'pp_'+Date.now(),num:_PR.pitches.length+1,
    pitcherId:pitcher.appId,pitcherName:pitcher.name,
    type:_PR._pitchType,zx:_PR._zx,zy:_PR._zy,izx,izy,
    result:_PR._result,score,
    balls:mode==='live_bullpen'?_PR._balls:null,
    strikes:mode==='live_bullpen'?_PR._strikes:null,
  });
  _PR._duelPitchesThrown[pitcher.appId]=(_PR._duelPitchesThrown[pitcher.appId]||0)+1;
  if(mode==='live_bullpen') _advanceLBCount();
  if(mode==='duel') _advanceDuel();
  if(_PR.pitches.length>=_PR.pitchCount){pracSessionEnd(true);return;}
  _PR._pitchType=null;_PR._zx=null;_PR._zy=null;_PR._izx=null;_PR._izy=null;_PR._result=null;
  _PR._keepScenario=false;
  if(mode==='scripted'){
    if(!keep){
      const nextPitcher=_PR.pitchers[_PR._pitcherIdx];
      _PR._suggestion=_pracNextSuggestion(nextPitcher);
    }
    _PR._pitchType=_PR._suggestion.type;
  } else if(keep){
    _PR._pitchType=lastType;
  }
  _renderPracSession();
}

function _advanceLBCount(){
  const last=_PR.pitches[_PR.pitches.length-1];
  const r=last.result;
  if(r==='CS'||r==='Sw&M'){
    _PR._strikes++;
    if(_PR._strikes>=3){_PR._balls=0;_PR._strikes=0;}
  }else if(r==='Foul'){
    if(_PR._strikes<2) _PR._strikes++;
  }else if(r==='Ball'){
    _PR._balls++;
    if(_PR._balls>=4){_PR._balls=0;_PR._strikes=0;}
  }else{
    _PR._balls=0;_PR._strikes=0;
  }
}

function _advanceDuel(){
  if(!_PR||_PR.pitchers.length<2)return;
  if(_PR.duelFormat==='alternate'){
    _PR._pitcherIdx=(_PR._pitcherIdx+1)%_PR.pitchers.length;
  }else{
    const half=Math.ceil(_PR.pitchCount/_PR.pitchers.length);
    const cur=_PR.pitchers[_PR._pitcherIdx];
    if((_PR._duelPitchesThrown[cur.appId]||0)>=half){
      _PR._pitcherIdx=(_PR._pitcherIdx+1)%_PR.pitchers.length;
    }
  }
}

function pracSwitchPitcher(){
  if(!_PR||_PR.pitchers.length<=1)return;
  showModal('Switch Pitcher',`<div style="display:flex;flex-direction:column;gap:8px;">
    ${_PR.pitchers.map((p,i)=>`<button class="btn btn-block${i===_PR._pitcherIdx?' btn-primary':''}" onclick="pracDoSwitch(${i});hideModal();">${p.name}</button>`).join('')}
  </div>`);
}
function pracDoSwitch(idx){
  _PR._pitcherIdx=idx;
  _PR._pitchType=null;_PR._zx=null;_PR._zy=null;_PR._izx=null;_PR._izy=null;_PR._result=null;
  if(_PR.subMode==='scripted'){
    _PR._suggestion=_pracNextSuggestion(_PR.pitchers[idx]);
    _PR._pitchType=_PR._suggestion.type;
  }
  _renderPracSession();
}

function pracUndo(){
  if(!_PR)return;
  if(_PR.subMode==='duel'&&_isNewDuelFmt(_PR.duelFormat)){_pracDuelUndo();return;}
  if(!_PR.pitches.length)return;
  const last=_PR.pitches.pop();
  if(last.pitcherId&&(_PR.subMode==='command'||_PR.subMode==='duel')){
    _PR.duelScores[last.pitcherId]=Math.max(0,(_PR.duelScores[last.pitcherId]||0)-(last.score||0));
  }
  if(_PR.subMode==='live_bullpen'){_PR._balls=0;_PR._strikes=0;}
  _renderPracSession();
}

function _pracDuelUndo(){
  const phase=_PR._duelPhase;
  const isScripted=_isScriptedDuelFmt(_PR.duelFormat);
  if(phase==='throw2'){
    // Pop throw1 pitch and go back to throw1
    const last=_PR.pitches.pop();
    if(last){
      _PR.duelScores[last.pitcherId]=Math.max(0,(_PR.duelScores[last.pitcherId]||0)-(last.score||0));
      _PR._duelPitchesThrown[last.pitcherId]=Math.max(0,(_PR._duelPitchesThrown[last.pitcherId]||0)-1);
    }
    _PR._duelPhase='throw1';
    _PR._pitcherIdx=_PR._duelCallerIdx;
    _PR._pitchType=_PR._duelCalledType;
    _PR._zx=null;_PR._zy=null;_PR._duelP1Throw=null;
  }else if(phase==='throw1'){
    if(isScripted){
      // Just reset zone tap
      _PR._zx=null;_PR._zy=null;_PR._pitchType=_PR._duelCalledType;
    }else{
      // Go back to call
      _PR._duelPhase='call';
      _PR._pitcherIdx=_PR._duelCallerIdx;
      _PR._pitchType=null;_PR._zx=null;_PR._zy=null;
    }
  }else{
    // call phase: clear pending selection
    _PR._duelCalledCell=null;_PR._duelCalledZx=null;_PR._duelCalledZy=null;
    _PR._pitchType=null;
  }
  _renderPracSession();
}

function _pracDuelPhaseAdvance(){
  if(!_PR)return;
  const phase=_PR._duelPhase;
  const isHorse=_isHorseFmt(_PR.duelFormat);
  const isScripted=_isScriptedDuelFmt(_PR.duelFormat);

  if(phase==='call'){
    // Lock in call → move to throw1 (caller throws first)
    _PR._duelCalledType=_PR._pitchType;
    _PR._duelPhase='throw1';
    _PR._pitchType=_PR._duelCalledType;
    _PR._zx=null;_PR._zy=null;
    _renderPracSession();
    return;
  }

  if(phase==='throw1'){
    const pitcher=_PR.pitchers[_PR._pitcherIdx];
    const score=_pracCommandScore(_PR._duelCalledZx,_PR._duelCalledZy,_PR._zx,_PR._zy);
    _PR.pitches.push({
      id:'pp_'+Date.now(),num:_PR.pitches.length+1,
      pitcherId:pitcher.appId,pitcherName:pitcher.name,
      type:_PR._pitchType,zx:_PR._zx,zy:_PR._zy,
      izx:_PR._duelCalledZx,izy:_PR._duelCalledZy,
      result:null,score,duelRound:_PR._duelRound,duelPhase:'throw1',
    });
    _PR.duelScores[pitcher.appId]=(_PR.duelScores[pitcher.appId]||0)+score;
    _PR._duelPitchesThrown[pitcher.appId]=(_PR._duelPitchesThrown[pitcher.appId]||0)+1;
    _PR._duelP1Throw={zx:_PR._zx,zy:_PR._zy,score,pitcherId:pitcher.appId};
    // Move to throw2 with other pitcher
    _PR._duelPhase='throw2';
    _PR._pitcherIdx=_PR.pitchers.findIndex((p,i)=>i!==_PR._duelCallerIdx);
    if(_PR._pitcherIdx===-1)_PR._pitcherIdx=(_PR._duelCallerIdx+1)%_PR.pitchers.length;
    _PR._pitchType=_PR._duelCalledType;
    _PR._zx=null;_PR._zy=null;
    _renderPracSession();
    return;
  }

  if(phase==='throw2'){
    const pitcher=_PR.pitchers[_PR._pitcherIdx];
    const score=_pracCommandScore(_PR._duelCalledZx,_PR._duelCalledZy,_PR._zx,_PR._zy);
    _PR.pitches.push({
      id:'pp_'+Date.now(),num:_PR.pitches.length+1,
      pitcherId:pitcher.appId,pitcherName:pitcher.name,
      type:_PR._pitchType,zx:_PR._zx,zy:_PR._zy,
      izx:_PR._duelCalledZx,izy:_PR._duelCalledZy,
      result:null,score,duelRound:_PR._duelRound,duelPhase:'throw2',
    });
    _PR.duelScores[pitcher.appId]=(_PR.duelScores[pitcher.appId]||0)+score;
    _PR._duelPitchesThrown[pitcher.appId]=(_PR._duelPitchesThrown[pitcher.appId]||0)+1;

    if(isHorse){
      const p1Hit=(_PR._duelP1Throw&&_PR._duelP1Throw.score>=1);
      const p2Hit=score>=1;
      const p1Id=_PR.pitchers[_PR._duelCallerIdx].appId;
      const p2Id=pitcher.appId;
      const word=_PR.horseWord||'HORSE';
      if(p1Hit&&!p2Hit){
        const existing=(_PR._duelLetters[p2Id]||'').length;
        if(existing<word.length)_PR._duelLetters[p2Id]=word.slice(0,existing+1);
      }else if(!p1Hit&&p2Hit){
        const existing=(_PR._duelLetters[p1Id]||'').length;
        if(existing<word.length)_PR._duelLetters[p1Id]=word.slice(0,existing+1);
      }
      const loser=_PR.pitchers.find(p=>(_PR._duelLetters[p.appId]||'').length>=word.length);
      if(loser){pracSessionEnd(true);return;}
    }else{
      if(_PR._duelRound>=_PR.pitchCount){pracSessionEnd(true);return;}
    }

    // Advance to next round
    _PR._duelRound++;
    _PR._duelCallerIdx=(_PR._duelCallerIdx+1)%_PR.pitchers.length;
    _PR._duelPhase=isScripted?'throw1':'call';
    _PR._pitcherIdx=_PR._duelCallerIdx;
    _PR._duelCalledType=null;_PR._duelCalledCell=null;_PR._duelCalledZx=null;_PR._duelCalledZy=null;
    _PR._duelP1Throw=null;_PR._pitchType=null;_PR._zx=null;_PR._zy=null;
    if(isScripted){
      _PR._suggestion=_pracNextSuggestion(_PR.pitchers[_PR._duelCallerIdx]);
      _pracApplyScriptedDuelCall(_PR._suggestion);
    }
    _renderPracSession();
  }
}

// ── Analytics helpers ──
function _szCell(zx,zy){
  if(zx==null||zy==null||zx<0.2||zx>=0.8||zy<0.2||zy>=0.8)return null;
  return{row:Math.min(2,Math.floor((zy-0.2)/0.2)),col:Math.min(2,Math.floor((zx-0.2)/0.2))};
}
function _inIntendedZone(pitch){
  if(pitch.izx==null||pitch.zx==null)return false;
  const ic=_szCell(pitch.izx,pitch.izy),ac=_szCell(pitch.zx,pitch.zy);
  return!!(ic&&ac&&ic.row===ac.row&&ic.col===ac.col);
}

function _pracAnalytics(prac){
  const mode=prac.subMode;
  const pitches=prac.pitches||[];
  const pc=pitches.length;
  const pitchers=prac.pitchers||[];
  if(!pc)return'<div style="text-align:center;color:var(--text3);padding:16px 0;font-size:13px;">No pitches logged</div>';

  const szCount=pitches.filter(p=>_szCell(p.zx,p.zy)!==null).length;
  const szPct=Math.round(szCount/pc*100);

  let statsHTML='';
  if(mode==='scripted'){
    const cmd=pitches.filter(p=>_inIntendedZone(p)).length;
    statsHTML=`
      <div class="prac-stat-item"><div class="prac-stat-val">${Math.round(cmd/pc*100)}%</div><div class="prac-stat-lbl">Command</div></div>
      <div class="prac-stat-item"><div class="prac-stat-val">${szPct}%</div><div class="prac-stat-lbl">In Zone</div></div>
      <div class="prac-stat-item"><div class="prac-stat-val">${pc}</div><div class="prac-stat-lbl">Pitches</div></div>`;
  }else if(mode==='bullpen'||mode==='live_bullpen'){
    const str=pitches.filter(p=>['CS','Sw&M','Foul'].includes(p.result)).length;
    statsHTML=`
      <div class="prac-stat-item"><div class="prac-stat-val">${Math.round(str/pc*100)}%</div><div class="prac-stat-lbl">Strike%</div></div>
      <div class="prac-stat-item"><div class="prac-stat-val">${szPct}%</div><div class="prac-stat-lbl">In Zone</div></div>
      <div class="prac-stat-item"><div class="prac-stat-val">${pc}</div><div class="prac-stat-lbl">Pitches</div></div>`;
  }else if(mode==='command'){
    const pts=pitches.reduce((a,p)=>a+(p.score||0),0);
    statsHTML=`
      <div class="prac-stat-item"><div class="prac-stat-val">${pts}</div><div class="prac-stat-lbl">Points</div></div>
      <div class="prac-stat-item"><div class="prac-stat-val">${Math.round(pts/pc*10)/10}</div><div class="prac-stat-lbl">Avg/Pitch</div></div>
      <div class="prac-stat-item"><div class="prac-stat-val">${pc}</div><div class="prac-stat-lbl">Pitches</div></div>`;
  }else if(mode==='duel'){
    const duelFmt=prac.duelFormat||'alternate';
    if(_isHorseFmt(duelFmt)){
      const letters=prac.duelLetters||{};
      const word=prac.horseWord||'HORSE';
      statsHTML=(prac.pitchers||[]).map(p=>{
        const got=(letters[p.appId]||'').length;
        return`<div class="prac-stat-item"><div class="prac-stat-val" style="font-size:15px;">${word.slice(0,got)||'—'}</div><div class="prac-stat-lbl">${p.name.split(' ').pop()}</div></div>`;
      }).join('');
      statsHTML+=`<div class="prac-stat-item"><div class="prac-stat-val">${pc}</div><div class="prac-stat-lbl">Pitches</div></div>`;
    }else{
      const pts=pitches.reduce((a,p)=>a+(p.score||0),0);
      statsHTML=`
        <div class="prac-stat-item"><div class="prac-stat-val">${pts}</div><div class="prac-stat-lbl">Pts Total</div></div>
        <div class="prac-stat-item"><div class="prac-stat-val">${pc}</div><div class="prac-stat-lbl">Pitches</div></div>`;
    }
  }else{
    statsHTML=`<div class="prac-stat-item"><div class="prac-stat-val">${pc}</div><div class="prac-stat-lbl">Pitches</div></div>`;
  }

  // Duel winner block
  let duelHTML='';
  if(mode==='duel'&&pitchers.length>=2){
    const duelFmt=prac.duelFormat||'alternate';
    if(_isHorseFmt(duelFmt)){
      const letters=prac.duelLetters||{};
      const word=prac.horseWord||'HORSE';
      const ranked=pitchers.map(p=>({name:p.name,got:(letters[p.appId]||'').length})).sort((a,b)=>a.got-b.got);
      const tied=ranked[0].got===ranked[ranked.length-1].got;
      const winner=ranked[0],loser=ranked[ranked.length-1];
      duelHTML=`<div style="background:rgba(74,158,255,0.08);border:1px solid rgba(74,158,255,0.2);border-radius:var(--r);padding:12px;text-align:center;margin-bottom:10px;">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">${tied?'Tied':'Winner'}</div>
        <div style="font-size:18px;font-weight:800;">${tied?ranked.map(p=>p.name.split(' ').pop()).join(' & '):winner.name}</div>
        ${!tied?`<div style="font-size:12px;color:var(--text3);margin-top:2px;">${loser.name}: ${word.slice(0,loser.got)||'No letters'}</div>`:''}
      </div>`;
    }else{
      const scores=pitchers.map(p=>({name:p.name,pts:(prac.duelScores||{})[p.appId]||0}));
      scores.sort((a,b)=>b.pts-a.pts);
      duelHTML=`<div style="background:rgba(74,158,255,0.08);border:1px solid rgba(74,158,255,0.2);border-radius:var(--r);padding:12px;text-align:center;margin-bottom:10px;">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">Winner</div>
        <div style="font-size:18px;font-weight:800;">${scores[0].name}</div>
        <div style="font-size:12px;color:var(--accent);margin-top:2px;">${scores[0].pts} pts</div>
      </div>`;
    }
  }

  // Legend
  let legendHTML='';
  if(mode==='scripted'){
    legendHTML=`<div style="display:flex;gap:14px;justify-content:center;font-size:10px;margin-top:4px;">
      <span style="color:rgba(74,158,255,0.9);">&#9679; On target</span>
      <span style="color:rgba(232,85,85,0.9);">&#9679; Missed zone</span>
    </div>`;
  }else if(mode==='bullpen'||mode==='live_bullpen'){
    legendHTML=`<div style="display:flex;gap:10px;justify-content:center;font-size:10px;margin-top:4px;">
      <span style="color:rgba(74,200,100,0.9);">&#9679; CS/SwM</span>
      <span style="color:rgba(245,200,66,0.9);">&#9679; Foul</span>
      <span style="color:rgba(232,85,85,0.9);">&#9679; Ball</span>
      <span style="color:rgba(140,140,140,0.8);">&#9679; In-play</span>
    </div>`;
  }else if(mode==='command'||mode==='duel'){
    legendHTML=`<div style="display:flex;gap:10px;justify-content:center;font-size:10px;margin-top:4px;">
      <span style="color:rgba(74,158,255,0.9);">&#9679; 3 pts</span>
      <span style="color:rgba(245,200,66,0.9);">&#9679; 1 pt</span>
      <span style="color:rgba(232,85,85,0.9);">&#9679; Miss</span>
    </div>`;
  }

  // Pitch mix breakdown
  const typeMap={};
  pitches.forEach(p=>{if(p.type)typeMap[p.type]=(typeMap[p.type]||0)+1;});
  const types=Object.entries(typeMap).sort((a,b)=>b[1]-a[1]);
  const typeHTML=types.map(([t,n])=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:13px;font-weight:700;min-width:34px;">${t}</span>
      <div style="flex:1;background:var(--bg3);border-radius:3px;height:5px;overflow:hidden;">
        <div style="height:100%;width:${Math.round(n/pc*100)}%;background:var(--accent);border-radius:3px;"></div>
      </div>
      <span style="font-size:12px;color:var(--text3);min-width:52px;text-align:right;">${n} (${Math.round(n/pc*100)}%)</span>
    </div>`).join('');

  // Per-pitcher rows (multiple pitchers only)
  let pitcherHTML='';
  if(pitchers.length>1){
    const rows=pitchers.map(pitcher=>{
      const pp=pitches.filter(p=>p.pitcherId===pitcher.appId);
      const n=pp.length;if(!n)return'';
      let detail='';
      if(mode==='scripted'){const cmd=pp.filter(p=>_inIntendedZone(p)).length;detail=`${Math.round(cmd/n*100)}% cmd`;}
      else if(mode==='bullpen'||mode==='live_bullpen'){const st=pp.filter(p=>['CS','Sw&M','Foul'].includes(p.result)).length;detail=`${Math.round(st/n*100)}% str`;}
      else if(mode==='command'||mode==='duel'){const pts=pp.reduce((a,p)=>a+(p.score||0),0);detail=`${pts} pts`;}
      return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg2);border-radius:var(--rsm);margin-bottom:5px;">
        <span style="font-size:13px;font-weight:600;">${pitcher.name}</span>
        <span style="font-size:12px;color:var(--text3);">${n} pitches · ${detail}</span>
      </div>`;
    }).filter(Boolean).join('');
    if(rows)pitcherHTML=`<div style="margin-top:14px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;margin-bottom:6px;">By Pitcher</div>
      ${rows}</div>`;
  }

  return`${duelHTML}<div class="prac-stat-row">${statsHTML}</div>
    <canvas id="prac-heat-cv" style="width:100%;aspect-ratio:190/210;border-radius:var(--rsm);display:block;background:rgba(0,0,0,0.55);"></canvas>
    ${legendHTML}
    ${types.length?`<div style="margin-top:12px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;margin-bottom:4px;">Pitch Mix</div>
      ${typeHTML}</div>`:''}
    ${pitcherHTML}`;
}

function _drawPracHeatMap(pitches,mode){
  const cv=document.getElementById('prac-heat-cv');
  if(!cv)return;
  const dpr=window.devicePixelRatio||1;
  const rect=cv.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  cv.width=Math.round(rect.width*dpr);
  cv.height=Math.round(rect.height*dpr);
  const ctx=cv.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=rect.width,H=rect.height;
  ctx.clearRect(0,0,W,H);

  // Outer grid
  const cw=W/5,ch=H/5;
  ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=0.5;
  for(let i=1;i<5;i++){
    ctx.beginPath();ctx.moveTo(i*cw,0);ctx.lineTo(i*cw,H);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,i*ch);ctx.lineTo(W,i*ch);ctx.stroke();
  }

  // Strike zone
  const szX=W*0.2,szY=H*0.2,szW=W*0.6,szH=H*0.6;
  ctx.fillStyle='rgba(255,255,255,0.04)';ctx.fillRect(szX,szY,szW,szH);
  ctx.strokeStyle='rgba(255,255,255,0.55)';ctx.lineWidth=1.5;ctx.strokeRect(szX,szY,szW,szH);
  ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=0.75;
  for(let i=1;i<3;i++){
    ctx.beginPath();ctx.moveTo(szX+i*(szW/3),szY);ctx.lineTo(szX+i*(szW/3),szY+szH);ctx.stroke();
    ctx.beginPath();ctx.moveTo(szX,szY+i*(szH/3));ctx.lineTo(szX+szW,szY+i*(szH/3));ctx.stroke();
  }

  // Dots
  pitches.forEach(p=>{
    if(p.zx==null||p.zy==null)return;
    const x=p.zx*W,y=p.zy*H;
    let color;
    if(mode==='scripted'){
      color=_inIntendedZone(p)?'rgba(74,158,255,0.9)':'rgba(232,85,85,0.9)';
    }else if(mode==='bullpen'||mode==='live_bullpen'){
      if(p.result==='CS'||p.result==='Sw&M')color='rgba(74,200,100,0.9)';
      else if(p.result==='Foul')color='rgba(245,200,66,0.9)';
      else if(p.result==='Ball')color='rgba(232,85,85,0.9)';
      else color='rgba(140,140,140,0.8)';
    }else{
      const sc=p.score||0;
      color=sc===3?'rgba(74,158,255,0.9)':sc===1?'rgba(245,200,66,0.9)':'rgba(232,85,85,0.85)';
    }
    ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
    ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.55)';ctx.fill();
  });
}

function pracSessionEnd(auto=false){
  if(!_PR)return;
  const pc=_PR.pitches.length;
  if(pc===0&&!auto){_PR=null;go('practice');return;}
  showModal(auto?'Session Complete':'End Session',`
    ${_pracAnalytics(_PR)}
    <div style="height:14px;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <button class="btn btn-primary" onclick="pracSaveSession()">Save</button>
      <button class="btn btn-primary" onclick="pracSaveSession(true)">Save &amp; View Stats</button>
    </div>
    <button class="btn btn-danger btn-block" onclick="pracDiscardSession()">Discard Session</button>
  `);
  requestAnimationFrame(()=>_drawPracHeatMap(_PR.pitches,_PR.subMode));
}

function pracSaveSession(viewStats=false){
  if(!_PR)return;
  S.practices.push({
    id:_PR.id,date:_PR.date,subMode:_PR.subMode,
    pitchers:_PR.pitchers.map(p=>({name:p.name,throws:p.throws,num:p.num||'',appId:p.appId,sessionOnly:!!p.sessionOnly})),
    pitches:_PR.pitches,duelScores:_PR.duelScores,
    duelFormat:_PR.duelFormat||'alternate',
    horseWord:_PR.horseWord||'HORSE',
    duelLetters:_PR.subMode==='duel'?{..._PR._duelLetters}:undefined,
    fbPreset:_PR.fbPreset,pitchCount:_PR.pitchCount,
  });
  save();
  const sessOnly=_PR.pitchers.filter(p=>p.sessionOnly);
  _PR=null;hideModal();
  if(sessOnly.length){_pracQuickAddQueue=[...sessOnly];_pracQuickAddNext();}
  else{go(viewStats?'practice-stats':'practice');}
}
function pracDiscardSession(){_PR=null;hideModal();go('practice');}

function _pracQuickAddNext(){
  if(!_pracQuickAddQueue.length){go('practice');return;}
  const p=_pracQuickAddQueue[0];
  showModal('Quick Add to Roster',`
    <div style="font-size:15px;font-weight:600;margin-bottom:6px;">${p.name}</div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:18px;">Add to your permanent pitcher roster?</div>
    <button class="btn btn-primary btn-block" onclick="_pracDoQuickAdd()" style="margin-bottom:8px;">Add to Roster</button>
    <button class="btn btn-block" onclick="hideModal();_pracQuickAddQueue.shift();_pracQuickAddNext()">Skip</button>
  `);
}
function _pracDoQuickAdd(){
  const p=_pracQuickAddQueue.shift();
  if(p){S.pitchers.push({name:p.name,throws:p.throws||'R',num:p.num||'',arsenal:p.arsenal||['FB'],active:true});save();}
  hideModal();_pracQuickAddNext();
}

// ══════════════════════════════════════════
// PRACTICE SEASON STATS
// ══════════════════════════════════════════

let _pracStatsPitcher=null;

function renderPracSeasonStats(){
  _pracStatsPitcher=null;
  _renderPracStatsBody();
}

function _setPracStatsPitcher(appId){
  _pracStatsPitcher=appId;
  _renderPracStatsBody();
}

function _renderPracStatsBody(){
  const el=document.getElementById('prac-stats-body');
  if(!el)return;
  const allSessions=S.practices||[];

  if(!allSessions.length){
    el.innerHTML=`<div style="text-align:center;padding:40px 24px;">
      <div style="font-size:15px;color:var(--text3);margin-bottom:16px;">No practice sessions saved yet.</div>
      <button class="btn btn-primary" onclick="go('practice')">Start a Session</button>
    </div>`;
    return;
  }

  // Collect all unique pitchers across all sessions
  const allPitchersMap={};
  allSessions.forEach(sess=>(sess.pitchers||[]).forEach(p=>{
    if(!allPitchersMap[p.appId])allPitchersMap[p.appId]={name:p.name,appId:p.appId};
  }));
  const allPitchers=Object.values(allPitchersMap).sort((a,b)=>a.name.localeCompare(b.name));

  // Filter by selected pitcher
  const sessions=_pracStatsPitcher?
    allSessions.filter(s=>(s.pitchers||[]).some(p=>p.appId===_pracStatsPitcher)):
    allSessions;
  const allPitches=sessions.flatMap(s=>{
    const pp=s.pitches||[];
    return _pracStatsPitcher?pp.filter(p=>p.pitcherId===_pracStatsPitcher):pp;
  });
  const pc=allPitches.length;

  // Pitcher filter row
  const filterRow=allPitchers.length>1?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
    <button class="prac-t-btn${_pracStatsPitcher===null?' on':''}" onclick="_setPracStatsPitcher(null)" style="border-radius:20px;padding:6px 12px;">All</button>
    ${allPitchers.map(p=>`<button class="prac-t-btn${_pracStatsPitcher===p.appId?' on':''}" onclick="_setPracStatsPitcher('${p.appId}')" style="border-radius:20px;padding:6px 12px;">${p.name.split(' ').pop()}</button>`).join('')}
  </div>`:'' ;

  if(!pc){
    el.innerHTML=`<div style="padding:14px 16px;">${filterRow}<div style="text-align:center;padding:30px 0;color:var(--text3);font-size:14px;">No pitches logged for this pitcher.</div></div>`;
    return;
  }

  // ── Summary ──
  const szCount=allPitches.filter(p=>_szCell(p.zx,p.zy)!==null).length;
  const szPct=Math.round(szCount/pc*100);
  const summaryHTML=`<div class="prac-stat-row" style="margin-bottom:14px;">
    <div class="prac-stat-item"><div class="prac-stat-val">${sessions.length}</div><div class="prac-stat-lbl">Sessions</div></div>
    <div class="prac-stat-item"><div class="prac-stat-val">${pc}</div><div class="prac-stat-lbl">Pitches</div></div>
    <div class="prac-stat-item"><div class="prac-stat-val">${szPct}%</div><div class="prac-stat-lbl">Zone%</div></div>
  </div>`;

  // ── Zone% by Mode ──
  const modeRows=PRAC_MODES.map(m=>{
    const mSess=sessions.filter(s=>s.subMode===m.id);
    if(!mSess.length)return'';
    const mPitches=mSess.flatMap(s=>{
      const pp=s.pitches||[];
      return _pracStatsPitcher?pp.filter(p=>p.pitcherId===_pracStatsPitcher):pp;
    });
    const n=mPitches.length;if(!n)return'';
    const mSz=mPitches.filter(p=>_szCell(p.zx,p.zy)!==null).length;
    const mZone=Math.round(mSz/n*100);
    const col=mZone>=65?'#4ac864':mZone>=45?'var(--text)':'#e85555';
    return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-size:13px;font-weight:600;">${m.title}</div>
        <div style="font-size:11px;color:var(--text3);">${mSess.length} session${mSess.length!==1?'s':''} · ${n} pitches</div>
      </div>
      <div style="font-size:18px;font-weight:800;color:${col};">${mZone}%</div>
    </div>`;
  }).filter(Boolean).join('');
  const modeHTML=modeRows?`<div style="margin-bottom:14px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;margin-bottom:4px;">By Mode</div>
    <div style="background:var(--bg2);border-radius:var(--rsm);overflow:hidden;">${modeRows}</div>
  </div>`:'';

  // ── Career by Pitch Type ──
  const typeMap={};
  allPitches.forEach(p=>{if(p.type)typeMap[p.type]=(typeMap[p.type]||0)+1;});
  const types=Object.entries(typeMap).sort((a,b)=>b[1]-a[1]);
  const hasResults=allPitches.some(p=>p.result);
  let typeHTML='';
  if(types.length){
    const rows=types.map(([t,n])=>{
      const tp=allPitches.filter(p=>p.type===t&&p.zx!=null);
      const inZone=tp.filter(p=>_szCell(p.zx,p.zy)!==null).length;
      const zonePct=tp.length?Math.round(inZone/tp.length*100):0;
      const tHasRes=tp.some(p=>p.result);
      const strCount=tp.filter(p=>['CS','Sw&M','Foul'].includes(p.result)).length;
      const strPct=hasResults&&tHasRes?Math.round(strCount/tp.length*100):null;
      const zCol=zonePct>=65?'#4ac864':zonePct>=45?'var(--text)':'#e85555';
      const sCol=strPct!=null?(strPct>=65?'#4ac864':strPct>=45?'var(--text)':'#e85555'):'var(--text)';
      return`<div style="display:flex;align-items:center;padding:7px 10px;border-bottom:1px solid var(--border);gap:6px;">
        <span style="font-size:13px;font-weight:700;flex:0 0 36px;">${t}</span>
        <span style="font-size:11px;color:var(--text3);flex:0 0 54px;">${n} · ${Math.round(n/pc*100)}%</span>
        <span style="font-size:13px;font-weight:700;flex:1;color:${zCol};">${zonePct}%<span style="font-size:10px;font-weight:400;color:var(--text3);"> zone</span></span>
        ${strPct!=null?`<span style="font-size:13px;font-weight:700;flex:1;color:${sCol};">${strPct}%<span style="font-size:10px;font-weight:400;color:var(--text3);"> str</span></span>`:''}
      </div>`;
    }).join('');
    typeHTML=`<div style="margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;margin-bottom:4px;">Career by Pitch Type</div>
      <div style="background:var(--bg2);border-radius:var(--rsm);overflow:hidden;">${rows}</div>
    </div>`;
  }

  // ── Miss Direction ──
  const locPitches=allPitches.filter(p=>p.izx!=null&&p.zx!=null);
  let missDirHTML='';
  if(locPitches.length>=4){
    const missed=locPitches.filter(p=>_szCell(p.zx,p.zy)===null);
    const mm=missed.length;
    if(mm>=2){
      const mHigh=missed.filter(p=>p.zy<0.2).length;
      const mLow=missed.filter(p=>p.zy>0.8).length;
      const mLeft=missed.filter(p=>p.zx<0.2&&p.zy>=0.2&&p.zy<=0.8).length;
      const mRight=missed.filter(p=>p.zx>0.8&&p.zy>=0.2&&p.zy<=0.8).length;
      const missRate=Math.round(mm/locPitches.length*100);
      missDirHTML=`<div style="margin-bottom:14px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;margin-bottom:4px;">Miss Direction <span style="font-weight:400;letter-spacing:0;text-transform:none;">(${missRate}% miss rate)</span></div>
        <div style="background:var(--bg2);border-radius:var(--rsm);padding:10px 12px;">
          ${[['HIGH',mHigh],['LOW',mLow],['LEFT',mLeft],['RIGHT',mRight]].map(([lbl,n])=>`
            <div style="display:grid;grid-template-columns:44px 1fr 52px;align-items:center;gap:6px;margin-bottom:6px;">
              <span style="font-size:10px;font-weight:700;color:var(--text3);">${lbl}</span>
              <div style="background:var(--bg3);border-radius:2px;height:6px;overflow:hidden;">
                <div style="height:100%;width:${mm?Math.round(n/mm*100):0}%;background:rgba(232,85,85,0.75);border-radius:2px;"></div>
              </div>
              <span style="font-size:11px;color:var(--text2);text-align:right;">${n} · ${mm?Math.round(n/mm*100):0}%</span>
            </div>`).join('')}
        </div>
      </div>`;
    }
  }

  // ── Session History ──
  const histRows=[...sessions].reverse().map(sess=>{
    const sPitches=_pracStatsPitcher?(sess.pitches||[]).filter(p=>p.pitcherId===_pracStatsPitcher):(sess.pitches||[]);
    const n=sPitches.length;
    const szN=sPitches.filter(p=>_szCell(p.zx,p.zy)!==null).length;
    let keyStat='';
    if(sess.subMode==='command'||sess.subMode==='duel'){
      const pts=sPitches.reduce((a,p)=>a+(p.score||0),0);
      keyStat=`${pts} pts`;
    }else{
      keyStat=n?`${Math.round(szN/n*100)}% zone`:'';
    }
    const pitcherLabel=_pracStatsPitcher?'':(sess.pitchers||[]).length?` · ${(sess.pitchers||[]).map(p=>p.name.split(' ').pop()).join(', ')}`:'';
    return`<div class="prac-rec-card" onclick="pracViewSession('${sess.id}')">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:14px;font-weight:700;">${_pracModeLabel(sess.subMode)}</div>
        <div style="font-size:11px;color:var(--text3);">${sess.date}</div>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px;">${n} pitches · ${keyStat}${pitcherLabel}</div>
    </div>`;
  }).join('');
  const histHTML=`<div>
    <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;margin-bottom:4px;">Session History</div>
    ${histRows}
  </div>`;

  el.innerHTML=`<div style="padding:14px 16px;">
    ${filterRow}
    ${summaryHTML}
    ${modeHTML}
    ${typeHTML}
    ${missDirHTML}
    ${histHTML}
  </div>`;
}
