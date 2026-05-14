// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
let _curScreen='home';
function go(name){
  _curScreen=name;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  if(name==='home') renderHome();
  if(name==='my-team') renderMyTeam();
  if(name==='new-game') initNewGame();
  if(name==='game') renderGame();
  if(name==='analytics') renderAnalytics();
  if(name==='stats') renderStats();
  if(name==='command') renderCommand();
  if(name==='practice') renderPractice();
  if(name==='practice-setup') renderPracSetup();
  if(name==='practice-stats') renderPracSeasonStats();
}
function showHam(){
  document.getElementById('ham-ov').classList.add('on');
  const eg=document.getElementById('ham-end-game');
  if(eg) eg.style.display=G?'block':'none';
  const ti=document.getElementById('ham-track-intended');
  if(ti) ti.style.display=G?'block':'none';
  _updateHamTIBadge();
}
function _updateHamTIBadge(){
  const badge=document.getElementById('ham-ti-badge');
  if(!badge||!G)return;
  const on=G.trackIntended||false;
  badge.textContent=on?'On':'Off';
  badge.style.background=on?'var(--accent)':'var(--bg3)';
  badge.style.color=on?'#fff':'var(--text3)';
  badge.style.border=on?'1.5px solid var(--accent)':'1.5px solid var(--border)';
}
function hideHam(){ document.getElementById('ham-ov').classList.remove('on'); }
function exportCurrentGame(){ hideHam(); if(G) exportGame(G.id); }

function endGame(){
  if(!G)return;
  const pc=(G.pitches||[]).length;
  showModal('End Game',`
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="font-size:18px;font-weight:800;color:var(--text);margin-bottom:4px;">vs. ${G.opp}</div>
      <div style="font-size:30px;font-weight:900;color:var(--text);margin-bottom:6px;">${G.ourScore??0} – ${G.oppScore??0}</div>
      <div style="font-size:13px;color:var(--text3);">${pc} pitch${pc===1?'':'es'} logged</div>
    </div>
    <button class="btn btn-danger btn-block" onclick="confirmEndGame()" style="margin-bottom:10px;">End Game</button>
    <button class="btn btn-block" onclick="hideModal()">Cancel</button>
  `);
}
function confirmEndGame(){
  if(!G)return;
  G.completed=true;
  S.activeId=null;
  const opp=G.opp;
  G=null;
  save(); hideModal();
  go('home');
  setTimeout(()=>showBackupPrompt(opp),350);
}
function showBackupPrompt(opp){
  showModal('Game Complete',`
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">vs. ${opp||'Opponent'}</div>
      <div style="font-size:13px;color:var(--text3);line-height:1.6;">Your data is saved in this browser.<br>Back it up to your device now?</div>
    </div>
    <button class="btn btn-primary btn-block" onclick="doBackup();hideModal();" style="margin-bottom:10px;">Save Backup</button>
    <button class="btn btn-block" onclick="hideModal()">Skip</button>
  `);
}
function restoreFromBackup(){
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='.json';
  inp.onchange=function(e){
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=function(ev){
      try{
        const data=JSON.parse(ev.target.result);
        if(!data.games||!Array.isArray(data.games)) throw new Error('Not a valid Cipher backup file.');
        S=data; save(); hideModal();
        setTimeout(()=>location.reload(),150);
      }catch(err){
        alert('Restore failed: '+err.message);
      }
    };
    reader.readAsText(file);
  };
  inp.click();
}
function navTo(screen){
  hideHam();
  if(screen==='game'){ go(G?'game':'home'); return; }
  if(screen==='stats'){ showStats(_curScreen); return; }
  if(screen==='analytics'){ showAnalytics(null,_curScreen); return; }
  if(screen==='command'){ showCommand(_curScreen); return; }
  go(screen);
}

// ══════════════════════════════════════════
// HOME
// ══════════════════════════════════════════
function _gameCardHTML(g){
  const level=S.team.level||'hs';
  const pitcherGrades=[];
  const seenAppIds=new Set();
  (g.pitchers||[]).forEach(gp=>{
    if(seenAppIds.has(gp.appId)) return;
    seenAppIds.add(gp.appId);
    const ps=(g.pitches||[]).filter(p=>p.appId===gp.appId);
    if(!ps.length) return;
    const gr=computeOutingGrade(ps,level);
    if(gr) pitcherGrades.push({name:gp.name,gr});
  });
  const _gradesOn=S.settings.showOutingGrades!==false;
  const gradesHTML=_gradesOn&&pitcherGrades.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">${pitcherGrades.map(({name,gr})=>`<div style="display:flex;align-items:center;gap:5px;padding:4px 8px;background:var(--bg3);border-radius:var(--rsm);">${_gradeChip(gr)}<span style="font-size:11px;color:var(--text2);font-weight:600;">${_pShortName(name)}</span></div>`).join('')}</div>`:'';
  return`<div class="game-card" onclick="resumeGame('${g.id}')">
    <button class="game-card-menu" onclick="showGameCardMenu('${g.id}');event.stopPropagation();">⋯</button>
    <div class="game-card-top"><div class="game-card-opp">vs. ${g.opp}</div></div>
    <div class="game-card-bot">
      <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${g.ourScore??'—'} – ${g.oppScore??'—'}</div>
      ${g.date} · <span class="badge ${g.ha==='home'?'badge-home':'badge-away'}">${g.ha.toUpperCase()}</span> · ${(g.pitches||[]).length} pitches
    </div>
    ${gradesHTML}
    ${(g.pitches||[]).length?`<div onclick="showAnalytics('${g.id}','home');event.stopPropagation();" style="margin-top:10px;padding:7px 10px;background:var(--bg3);border-radius:var(--rsm);text-align:center;font-size:12px;font-weight:700;color:var(--accent);">View Analytics →</div>`:''}
  </div>`;
}

function renderHome(){
  const el=document.getElementById('home-body');
  const level=S.team.level||'hs';

  // Last Outing card — most recent game with pitches, primary pitcher
  let outingHTML='';
  const gamesWithPitches=S.games.filter(g=>(g.pitches||[]).length>0);
  if(gamesWithPitches.length){
    const lastGame=gamesWithPitches[gamesWithPitches.length-1];
    const pitcherMap={};
    (lastGame.pitches||[]).forEach(p=>{
      if(!pitcherMap[p.appId]) pitcherMap[p.appId]={pc:0,k:0};
      pitcherMap[p.appId].pc++;
      if(p.result==='K') pitcherMap[p.appId].k++;
    });
    let topId=null,topPc=0;
    Object.entries(pitcherMap).forEach(([aid,st])=>{ if(st.pc>topPc){topPc=st.pc;topId=aid;} });
    if(topId){
      const gp=(lastGame.pitchers||[]).find(p=>p.appId===topId);
      const ps=(lastGame.pitches||[]).filter(p=>p.appId===topId);
      const gr=computeOutingGrade(ps,level);
      const gradeHTML=gr&&S.settings.showOutingGrades!==false?`<div class="outing-grade-lg" style="color:${gr.color};">${gr.letter}</div>`:'';
      outingHTML=`<div class="outing-strip" onclick="showAnalytics('${lastGame.id}','home')">
        <div class="outing-top">
          <div class="outing-left">
            <div class="outing-eyebrow">Last Outing</div>
            <div class="outing-pitcher">${gp?gp.name:'—'}</div>
            <div class="outing-meta">vs. ${lastGame.opp} · ${lastGame.date} · ${lastGame.ha==='home'?'Home':'Away'}</div>
          </div>
          <div class="outing-right">
            <div class="outing-stat">
              <div class="outing-stat-val">${topPc}</div>
              <div class="outing-stat-lbl">Pitches</div>
            </div>
            <div class="outing-stat">
              <div class="outing-stat-val">${pitcherMap[topId].k}</div>
              <div class="outing-stat-lbl">K</div>
            </div>
            ${gradeHTML}
          </div>
        </div>
      </div>`;
    }
  }

  const gc=S.games.length;
  el.innerHTML=`
    ${outingHTML}
    <button class="home-btn-primary" onclick="go('new-game')">+ New Game</button>
    <button class="home-btn-sec" onclick="showAnalytics(null,'home')">
      <div class="home-btn-sec-left">
        <div>Analytics</div>
        <div class="home-btn-sec-sub">Pitch matrix · heat maps · count drill-down</div>
      </div>
      <div class="home-btn-sec-right"><span class="home-chevron">›</span></div>
    </button>
    <button class="home-btn-sec" onclick="showStats('home')">
      <div class="home-btn-sec-left">
        <div>Stats</div>
        <div class="home-btn-sec-sub">Pitcher stat lines · SIERA · sortable</div>
      </div>
      <div class="home-btn-sec-right"><span class="home-chevron">›</span></div>
    </button>
    <button class="home-btn-sec" onclick="showCommand('home')">
      <div class="home-btn-sec-left">
        <div>Command</div>
        <div class="home-btn-sec-sub">Zone tendencies · miss direction · hit spot</div>
      </div>
      <div class="home-btn-sec-right"><span class="home-chevron">›</span></div>
    </button>
    <button class="home-btn-sec" onclick="go('practice')">
      <div class="home-btn-sec-left">
        <div>Practice Mode</div>
        <div class="home-btn-sec-sub">Bullpen · scripted sessions · Duel</div>
      </div>
      <div class="home-btn-sec-right"><span class="home-chevron">›</span></div>
    </button>
    <button class="home-btn-sec" onclick="showRecentGames()">
      <div class="home-btn-sec-left">
        <div>Recent Games</div>
        <div class="home-btn-sec-sub">Browse and review past outings</div>
      </div>
      <div class="home-btn-sec-right">${gc?`<div class="home-badge">${gc} game${gc===1?'':'s'}</div>`:''}<span class="home-chevron">›</span></div>
    </button>
    <div style="display:flex;gap:6px;margin-top:4px;">
      <button onclick="devLoadGame()" style="flex:1;padding:8px;background:rgba(255,200,0,0.07);border:1px dashed rgba(255,200,0,0.25);border-radius:var(--rsm);color:rgba(255,200,0,0.4);font-size:12px;cursor:pointer;">⚙ Test Game</button>
      <button onclick="devSimGame()" style="flex:1;padding:8px;background:rgba(255,200,0,0.07);border:1px dashed rgba(255,200,0,0.25);border-radius:var(--rsm);color:rgba(255,200,0,0.4);font-size:12px;cursor:pointer;">⚙ Simulate</button>
    </div>
  `;
}

function showRecentGames(){
  if(!S.games.length){ showModal('Recent Games','<div class="empty">No games yet.<br>Tap + New Game to start.</div>'); return; }
  const cards=S.games.slice().reverse().map(_gameCardHTML).join('');
  showModal('Recent Games',`<div style="max-height:65vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">${cards}</div>`);
}
function resumeGame(id){ G=S.games.find(g=>g.id===id); S.activeId=id; go('game'); }

function showGameCardMenu(id){
  const game=S.games.find(g=>g.id===id);
  if(!game)return;
  showModal('Game Options', `
    <button class="btn btn-primary btn-block" onclick="resumeGame('${id}'); hideModal();">Continue Game</button>
    <button class="btn btn-block" style="margin-top:10px;" onclick="exportGame('${id}'); hideModal();">Export Game</button>
    <button class="btn btn-danger btn-block" style="margin-top:10px;" onclick="deleteGame('${id}'); hideModal();">Delete Game</button>
  `);
}

function exportGame(id){
  const game=S.games.find(g=>g.id===id);
  if(!game)return;
  const blob=new Blob([JSON.stringify(game,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url;
  a.download='game_'+game.opp+'_'+game.date+'.json'; a.click();
}

function showSettings(){
  if(!S.settings) S.settings={sprayZoneOverlay:false};
  const row=(label,desc,key)=>{
    const on=!!S.settings[key];
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--text);">${label}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">${desc}</div>
      </div>
      <button id="stg-${key}" onclick="toggleSetting('${key}')" style="padding:5px 14px;font-size:12px;font-weight:700;border-radius:20px;border:1.5px solid ${on?'var(--accent)':'var(--border2)'};background:${on?'var(--accent)':'none'};color:${on?'#fff':'var(--text2)'};cursor:pointer;flex-shrink:0;margin-left:12px;">${on?'On':'Off'}</button>
    </div>`;
  };
  const curTol=S.settings.hitSpotTolerance!=null?S.settings.hitSpotTolerance:_hitSpotTolerance();
  const tolButtons=_cmdTolPresets.map(p=>{
    const active=Math.abs(curTol-p.val)<0.005;
    return `<button onclick="saveTol(${p.val})" style="flex:1;padding:9px 2px;border-radius:var(--rsm);border:1.5px solid ${active?'var(--accent)':'var(--border)'};background:${active?'var(--accent)':'var(--bg3)'};color:${active?'#fff':'var(--text2)'};font-size:11px;font-weight:700;cursor:pointer;">${p.label}</button>`;
  }).join('');
  showModal('Settings',`
    <div>
      ${row('Outing Grades','Show letter grade on each pitcher appearance','showOutingGrades')}
      ${row('Spray Zone Lines','Show infield/outfield zone dividers on spray charts','sprayZoneOverlay')}
      ${row('Track Intended (Default)','New games default to tracking intended pitch location','trackIntendedDefault')}
      <div style="padding:12px 0;border-bottom:1px solid var(--border);">
        <div style="font-size:14px;font-weight:600;color:var(--text);">Hit Spot Tolerance</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">Radius counted as "hit spot" — ~2 baseballs (Precise) to ~5 baseballs (Generous)</div>
        <div style="display:flex;gap:6px;margin-top:10px;">${tolButtons}</div>
      </div>
      <div style="padding:12px 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text);">Restore from Backup</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px;">Select a cipher_backup.json to restore all data</div>
          </div>
          <button onclick="restoreFromBackup()" style="padding:5px 14px;font-size:12px;font-weight:700;border-radius:20px;border:1.5px solid var(--border2);background:none;color:var(--text2);cursor:pointer;flex-shrink:0;margin-left:12px;">Restore</button>
        </div>
      </div>
    </div>
  `);
}
function saveTol(v){ S.settings.hitSpotTolerance=parseFloat(v); save(); showSettings(); }
function toggleSetting(key){
  if(!S.settings) S.settings={};
  S.settings[key]=!S.settings[key];
  save();
  const btn=document.getElementById('stg-'+key);
  const on=S.settings[key];
  if(btn){ btn.textContent=on?'On':'Off'; btn.style.background=on?'var(--accent)':'none'; btn.style.borderColor=on?'var(--accent)':'var(--border2)'; btn.style.color=on?'#fff':'var(--text2)'; }
  if(key==='sprayZoneOverlay'&&G) drawSpray();
}

function deleteGame(id){
  if(!confirm('Delete this game? This cannot be undone.'))return;
  const idx=S.games.findIndex(g=>g.id===id);
  if(idx>=0){ S.games.splice(idx,1); save(); renderHome(); }
}

// ══════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════
function showModal(title,body){
  document.getElementById('modal-title').innerHTML=title;
  document.getElementById('modal-body').innerHTML=body;
  const mx=document.getElementById('modal-x');
  if(mx){ mx.style.cssText=''; mx.onclick=hideModal; mx.innerHTML='✕'; }
  document.getElementById('modal').classList.add('on');
}
function hideModal(){
  document.getElementById('modal').classList.remove('on');
  const mx=document.getElementById('modal-x');
  if(mx){ mx.onclick=hideModal; mx.style.cssText=''; mx.innerHTML='✕'; }
}

// ══════════════════════════════════════════
// GAME SIMULATOR
// ══════════════════════════════════════════
function devSimGame(){
  const _r=()=>Math.random();
  const _ri=(a,b)=>Math.floor(_r()*(b-a+1))+a;
  const _pick=a=>a[Math.floor(_r()*a.length)];

  // Auto-generate a sim-only pitching staff — never saved to S.pitchers
  const _SIM_NAMES=[
    ['A. Torres','B. Reyes','C. Walsh','D. Nguyen','E. Brooks'],
    ['F. Coleman','G. Patel','H. Romero','I. Jensen','J. Castillo'],
    ['K. Murphy','L. Owens','M. Holt','N. Park','O. Simmons'],
    ['P. Drake','Q. Vega','R. Sutton','S. Yuen','T. Flores'],
  ];
  const _SIM_NUMS=['11','18','22','28','34','37','41','46'];
  const _SIM_ARMS=['R','R','R','R','L','L','R']; // weighted right
  const _nameRow=_pick(_SIM_NAMES);
  const _simPitcher=(idx,throws)=>({
    name:_nameRow[idx%_nameRow.length], num:_SIM_NUMS[_ri(0,_SIM_NUMS.length-1)],
    throws:throws||_pick(_SIM_ARMS),
    arsenal:_pick([
      ['FB','SL','CH'],['FB','SL','CB','CH'],['FB','2S','SL','CH'],
      ['FB','FC','SL','CH'],['FB','SI','CH','SL'],['FB','SV','CB','CH'],
    ]),
    active:true,
  });
  const rP=[
    _simPitcher(0,_pick(['R','R','R','L'])),  // starter
    _simPitcher(1),                            // middle reliever
    _simPitcher(2),                            // middle reliever
    _simPitcher(3),                            // setup
    _simPitcher(4),                            // closer
  ];

  // Cumulative probability tables per count [ball, cStrike, swStr, foul, bip, hr]
  const CP={
    '0-0':[.34,.56,.63,.77,.97,1],'0-1':[.28,.46,.55,.73,.96,1],'0-2':[.18,.24,.38,.66,.97,1],
    '1-0':[.40,.58,.64,.76,.97,1],'1-1':[.32,.48,.57,.73,.96,1],'1-2':[.21,.27,.41,.67,.97,1],
    '2-0':[.50,.68,.72,.82,.97,1],'2-1':[.38,.52,.60,.74,.97,1],'2-2':[.24,.31,.44,.68,.97,1],
    '3-0':[.62,.84,.86,.91,.99,1],'3-1':[.48,.64,.69,.77,.97,1],'3-2':[.26,.34,.47,.70,.96,1],
  };
  function pickCat(b,s){
    const row=CP[`${b}-${s}`]||CP['1-1'],roll=_r();
    if(roll<row[0])return'ball';if(roll<row[1])return'cs';if(roll<row[2])return'sw';
    if(roll<row[3])return'foul';if(roll<row[4])return'bip';return'hr';
  }
  function simBIP(){
    const t=_r();
    const bipType=t<.48?'GB':t<.62?'LD':t<.86?'FLY':t<.95?'PU':'BUNT';
    const HP={GB:.22,LD:.68,FLY:.15,PU:.02,BUNT:.15};
    const isHit=_r()<HP[bipType];
    const isErr=!isHit&&_r()<.05;
    const canFC=(bipType==='GB'||bipType==='LD'||bipType==='BUNT')&&!isHit&&!isErr&&_r()<.10;
    const bipOut=isHit?'hit':isErr?'error':canFC?'fc':'out';
    let hb=1;
    if(isHit){const h2=_r();
      if(bipType==='LD')hb=h2<.58?1:h2<.88?2:3;
      else if(bipType==='FLY')hb=h2<.52?1:h2<.82?2:3;
    }
    const hh=_r()<{GB:.14,LD:.50,FLY:.28,PU:.03,BUNT:.02}[bipType];
    return{bipType,bipOut,hitBases:isHit?hb:0,hh};
  }
  const VB={FB:92,'2S':90,SI:91,FC:89,SL:84,SV:82,CB:78,CH:84,FS:86,FO:83,KN:72,EP:65,OT:80};
  function simVelo(pt){return(VB[pt]||85)+_ri(-3,3);}
  function getArs(p){const a=p.arsenal||[];return a.length?a:['FB','SL','CH'];}

  const BATTERS=[
    {name:'T. Adams',num:'4',hand:'R'},{name:'J. Brown',num:'7',hand:'L'},
    {name:'M. Clark',num:'12',hand:'R'},{name:'D. Evans',num:'23',hand:'R'},
    {name:'R. Foster',num:'3',hand:'L'},{name:'K. Green',num:'17',hand:'R'},
    {name:'B. Harris',num:'9',hand:'R'},{name:'L. Jones',num:'31',hand:'L'},
    {name:'P. King',num:'2',hand:'R'},
  ];

  const pitches=[],gamePitchers=[];
  let abNum=1,abPitchNum=1,outs=0,balls=0,strikes=0;
  let runners={b1:null,b2:null,b3:null},oppScore=0,ourScore=0,battIdx=0,gp=null;

  function addGP(rp,inn,o){
    const e={...rp,appId:'sgp_'+Date.now()+'_'+gamePitchers.length,
      inning:inn,half:'top',outs:o,pc:0,st:0,k:0,bb:0,hbp:0,h:0,er:0,ur:0,po:0,hr:0};
    gamePitchers.push(e);gp=e;
  }
  addGP(rP[0],1,0);

  function advance(hb,isHR,isWalk,bipOut){
    const r0={...runners};let sc=0;
    if(isHR){sc=(r0.b1?1:0)+(r0.b2?1:0)+(r0.b3?1:0)+1;runners={b1:null,b2:null,b3:null};}
    else if(isWalk){
      const nb={b1:'B',b2:r0.b2,b3:r0.b3};
      if(r0.b1){nb.b2=r0.b1;if(r0.b2){nb.b3=r0.b2;if(r0.b3)sc++;}}
      runners=nb;
    } else if(bipOut==='hit'){
      if(hb===3){sc=(r0.b1?1:0)+(r0.b2?1:0)+(r0.b3?1:0);runners={b1:null,b2:null,b3:'B'};}
      else if(hb===2){sc=(r0.b2?1:0)+(r0.b3?1:0);runners={b1:null,b2:'B',b3:r0.b1||null};}
      else{if(r0.b3)sc++;runners={b1:'B',b2:r0.b1||null,b3:r0.b2||null};}
    } else if(bipOut==='error'){
      if(r0.b3)sc++;runners={b1:'B',b2:r0.b1||null,b3:r0.b2||null};
    }
    return sc;
  }

  function shouldChange(inn){
    const n=gamePitchers.length,startInn=(outs===0);
    if(n>=rP.length)return false;
    if(n===1)return(inn>=7&&startInn)||gp.pc>=82||(gp.er>=5&&gp.pc>=50);
    if(n===2)return(inn>=9&&startInn)||gp.pc>=32||gp.er>=3;
    if(n===3)return gp.pc>=22||gp.er>=3;
    return false;
  }

  for(let inn=1;inn<=9;inn++){
    outs=0;runners={b1:null,b2:null,b3:null};
    while(outs<3){
      if(shouldChange(inn))addGP(rP[Math.min(gamePitchers.length,rP.length-1)],inn,outs);
      const batter=BATTERS[battIdx%9];
      balls=0;strikes=0;
      let abDone=false,pc2=0;
      while(!abDone&&pc2<22){
        pc2++;
        const pt=_pick(getArs(gp)),velo=simVelo(pt);
        const bb2=balls,sb2=strikes,cat=pickCat(balls,strikes);
        let rt,isSt=false,isTerm=false,result='',bp=null,hh=false,hitBases=0;
        let pitchSwing=false,pitchD3kCause=null;

        if(cat==='ball'){
          rt='ball';result='Ball';balls++;
          pitchSwing=false;
          if(balls===3){rt='bb';isTerm=true;result='Walk (BB)';}
        } else if(cat==='cs'){
          isSt=true;pitchSwing=false;
          if(strikes===2){
            const canRun=!(outs<2&&runners.b1);
            if(canRun&&_r()<0.04){
              // Dropped 3rd strike — called
              isTerm=true;
              const d3kRoll=_r();
              if(d3kRoll<0.55){rt='kc';result='ꓘ (Called)';}
              else if(d3kRoll<0.80){rt='d3k';pitchD3kCause='wp';result='ꓘ (drop, WP)';}
              else{rt='d3k';pitchD3kCause='pb';result='ꓘ (drop, PB)';}
            } else {rt='kc';isTerm=true;result='Called Strike 3';}
          } else{rt='strike';result='Called Strike';strikes++;}
        } else if(cat==='sw'){
          isSt=true;pitchSwing=true;
          if(strikes===2){
            const canRun=!(outs<2&&runners.b1);
            if(canRun&&_r()<0.04){
              // Dropped 3rd strike — swinging
              isTerm=true;
              const d3kRoll=_r();
              if(d3kRoll<0.55){rt='k';result='K';}
              else if(d3kRoll<0.80){rt='d3k';pitchD3kCause='wp';result='K (drop, WP)';}
              else{rt='d3k';pitchD3kCause='pb';result='K (drop, PB)';}
            } else {rt='k';isTerm=true;result='Strikeout Swinging';}
          } else{rt='swstr';result='Swinging Strike';strikes++;}
        } else if(cat==='foul'){
          rt='foul';result='Foul Ball';pitchSwing=true;
          if(strikes<2){isSt=true;strikes++;}
        } else if(cat==='hr'){
          rt='hr';isTerm=true;isSt=true;hh=true;result='Home Run';pitchSwing=true;
        } else {
          rt='bip';isTerm=true;isSt=true;pitchSwing=true;bp=simBIP();
          const hl={1:'Single',2:'Double',3:'Triple'};
          result=bp.bipOut==='hit'?`In Play · ${hl[bp.hitBases]||'Single'}`:bp.bipOut==='error'?'In Play · Reached on Error':'In Play · Out';
          hh=bp.hh;hitBases=bp.hitBases;
        }

        pitches.push({
          id:'sp_'+Math.random().toString(36).substr(2,9),
          appId:gp.appId,abNum,abPitchNum,
          inning:inn,half:'top',
          outsBefore:outs,ballsBefore:bb2,strikesBefore:sb2,
          runners:{...runners},
          bHand:batter.hand,bName:batter.name,ha:'home',
          pt,velo,result,rt,isStrike:isSt,isTerm,
          bipType:bp?.bipType||null,bipOut:bp?.bipOut||null,
          hh,wc:false,dp:false,fc:bp?.bipOut==='fc',ro:false,hitBases,
          swing:pitchSwing,d3kCause:pitchD3kCause,
          sx:null,sy:null,zx:null,zy:null,note:'',er:0,ur:0,
          ts:Date.now()+pitches.length*50,
        });
        gp.pc++;abPitchNum++;if(isSt)gp.st++;

        if(isTerm){
          if(rt==='k'||rt==='kc'){gp.k++;outs++;gp.po++;}
          else if(rt==='d3k'){
            // Pitcher gets K credit; batter reaches — advance like walk (simplified)
            gp.k++;
            const r0={...runners};
            const nb={b1:'B',b2:r0.b2,b3:r0.b3};
            if(r0.b1){nb.b2=r0.b1;if(r0.b2){nb.b3=r0.b2;if(r0.b3){
              // R3 scores — WP→earned, PB→unearned
              oppScore++;
              if(pitchD3kCause==='pb'){gp.ur++;pitches[pitches.length-1].ur=1;}
              else{gp.er++;pitches[pitches.length-1].er=1;}
            }}}
            runners=nb;
          }
          else if(rt==='bb'){gp.bb++;advance(0,false,true,null);}
          else if(rt==='hr'){
            const sc=advance(0,true,false,null);
            oppScore+=sc;gp.hr=(gp.hr||0)+1;gp.h=(gp.h||0)+1;gp.er+=sc;
            pitches[pitches.length-1].er=sc;
          } else if(rt==='bip'){
            const last=pitches[pitches.length-1];
            if(bp.bipOut==='hit'){
              gp.h++;const sc=advance(bp.hitBases,false,false,'hit');
              oppScore+=sc;gp.er+=sc;last.er=sc;
            } else if(bp.bipOut==='error'){
              const sc=advance(0,false,false,'error');
              oppScore+=sc;gp.ur+=sc;last.ur=sc;
            } else if(bp.bipOut==='fc'){
              // Batter reaches 1B; lead runner is put out
              outs++;gp.po++;
              const r0={...runners};
              runners={b1:'B',b2:r0.b2||null,b3:r0.b3||null};
            } else { // out
              // SAC derivation: Bunt or Fly Out, <2 outs, runner on base
              const hasR=runners.b1||runners.b2||runners.b3;
              if((bp.bipType==='BUNT'||bp.bipType==='FLY')&&outs<2&&hasR){
                last.bipOut='sac';
                const r0={...runners};let sc=0;
                if(bp.bipType==='FLY'){
                  if(r0.b3){sc++;runners={b1:r0.b1||null,b2:r0.b2||null,b3:null};}
                } else {
                  const nb={b1:null,b2:r0.b1||null,b3:r0.b2||null};
                  if(r0.b3)sc++;runners=nb;
                }
                outs++;gp.po++;
                if(sc>0){oppScore+=sc;gp.er+=sc;last.er=sc;}
              } else {
                // Check DP: GB, R1 on, <2 outs, ~35% chance
                const isDP=bp.bipType==='GB'&&runners.b1&&outs<2&&_r()<.35;
                outs++;gp.po++;
                if(isDP){outs++;gp.po++;last.dp=true;}
              }
            }
          }
          abDone=true;abNum++;abPitchNum=1;battIdx++;
        }
      }
      if(!abDone){outs++;gp.po++;abNum++;abPitchNum=1;battIdx++;} // safety
    }
    // Bottom half: our runs
    if(_r()<.22)ourScore++;if(_r()<.10)ourScore++;if(_r()<.04)ourScore++;
  }

  const id='sim_'+Date.now();
  const g={
    id,opp:'Riverside Raiders',date:new Date().toISOString().split('T')[0],
    ha:'home',field:'Howell High School',temp:'68',cond:'Partly Cloudy',
    ourScore,oppScore,inning:9,half:'bottom',outs:3,balls:0,strikes:0,
    runners:{b1:null,b2:null,b3:null},lineup:BATTERS,batterIdx:0,
    pitchers:gamePitchers,pitcherIdx:gamePitchers.length-1,
    pitches,events:[],abNum,abPitchNum:1,
  };
  S.games=S.games.filter(x=>!x.id.startsWith('sim_'));
  S.games.push(g);S.activeId=null;
  _anGameId=id;_anFrom='home';_anMetric='usage';_anDeep=false;
  _anFilter={games:[id],pitcher:[],hand:'both',sit:'all',trip:'all',loc:'all',zone:'all',bipZone:'all'};
  save();go('analytics');
}
// ══════════════════════════════════════════
// DEV MODE — remove before release
// ══════════════════════════════════════════
function devLoadGame(){
  S.pitchers=[
    {name:'Jake Morrison',num:'11',throws:'R',arsenal:['FB','2S','SL','CB','CH'],active:true},
    {name:'Cole Ramirez',num:'22',throws:'R',arsenal:['FB','FC','SL','CH'],active:true},
    {name:'Tyler Banks',num:'34',throws:'L',arsenal:['FB','SI','SL','CH'],active:true},
    {name:'Drew Halston',num:'18',throws:'R',arsenal:['FB','SL','CH'],active:true},
    {name:'Mason Ford',num:'29',throws:'L',arsenal:['FB','CB','CH'],active:true},
  ];
  S.team={name:'Howell Highlanders',level:'hs'};
  const lineup=[
    {name:'C. Torres',num:'2',hand:'R'},{name:'M. Johnson',num:'7',hand:'L'},
    {name:'B. Williams',num:'14',hand:'R'},{name:'R. Davis',num:'23',hand:'R'},
    {name:'A. Garcia',num:'5',hand:'L'},{name:'J. Martinez',num:'31',hand:'R'},
    {name:'K. Thompson',num:'9',hand:'R'},{name:'S. Anderson',num:'16',hand:'L'},
    {name:'P. Wilson',num:'44',hand:'R'},
  ];
  const starter=S.pitchers[0];
  const id='dev_'+Date.now();
  const game={
    id,opp:'Lake Shore Lancers',date:new Date().toISOString().split('T')[0],
    ha:'home',field:'Howell High School',temp:'72',cond:'Clear',
    ourScore:0,oppScore:0,inning:1,half:'top',outs:0,balls:0,strikes:0,
    runners:{b1:null,b2:null,b3:null},lineup,batterIdx:0,
    pitchers:[{...starter,appId:'a_dev_'+Date.now(),inning:1,outs:0,
      pc:0,st:0,k:0,bb:0,hbp:0,h:0,er:0,ur:0,po:0,hr:0}],
    pitcherIdx:0,pitches:[],events:[],abNum:1,abPitchNum:1
  };
  S.games=S.games.filter(g=>!g.id.startsWith('dev_'));
  S.games.push(game);
  S.activeId=id; G=game; save(); go('game');
}
