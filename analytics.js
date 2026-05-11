// ══════════════════════════════════════════
// ANALYTICS MATRIX
// ══════════════════════════════════════════
let _anGameId=null,_anFrom='home',_anMetric='usage',_anDeep=false,_anMatrixView='pt_count';
let _anFilter={games:[],pitcher:[],hand:'both',sit:'all',trip:'all',loc:'all',zone:'all',bipZone:'all'};

const AN_COUNTS=[
  {b:0,s:0},{b:0,s:1},{b:0,s:2},
  {b:1,s:0},{b:1,s:1},{b:1,s:2},
  {b:2,s:0},{b:2,s:1},{b:2,s:2},
  {b:3,s:0},{b:3,s:1},{b:3,s:2}
];
const AN_PT_ORDER=['FB','2S','SI','FC','SL','SV','CB','CH','FS','FO','KN','EP','OT'];
const AN_PT_NAMES={'FB':'Four-Seam','2S':'Two-Seam','SI':'Sinker','FC':'Cutter','SL':'Slider','SV':'Slurve','CB':'Curveball','CH':'Changeup','FS':'Splitter','FO':'Forkball','KN':'Knuckleball','EP':'Eephus','OT':'Other'};
const AN_METRICS=[
  {id:'usage',  label:'Usage%',   desc:'% of pitches at this count that were this type'},
  {id:'strike', label:'Strike%',  desc:'Strikes ÷ total pitches'},
  {id:'baa',    label:'BAA',      desc:'Hits ÷ at-bats (terminal pitches)'},
  {id:'whiff',  label:'Whiff%',   desc:'Swinging strikes ÷ total swings'},
  {id:'swstr',  label:'SwStr%',   desc:'Swinging strikes ÷ total pitches'},
  {id:'foul',   label:'Foul%',    desc:'Foul balls ÷ total pitches'},
  {id:'barrel', label:'Barrel%',  desc:'Hard-hit LD or FLY ÷ total BIP'},
  {id:'xbh',    label:'XBH%',     desc:'Extra-base hits ÷ total hits'},
  {id:'hhxbh',  label:'HH XBH',   desc:'Count of hard-hit extra-base hits'},
  {id:'k',      label:'K%',       desc:'Strikeouts ÷ plate appearances ending here'},
  {id:'bbhbp',  label:'BB+HBP%',  desc:'(Walks + HBP) ÷ plate appearances ending here'},
  {id:'wl11',   label:'1-1 W%',   desc:'Pitcher win% in ABs where this pitch was thrown at 1-1'},
  {id:'er',     label:'ER',       desc:'Total earned runs scored on pitches in this cell'},
  {id:'ur',     label:'UR',       desc:'Total unearned runs scored on pitches in this cell'},
];
const AN_SIMPLE=['usage','strike','baa','whiff','barrel'];
const AN_MATRIX_VIEWS=[
  {id:'pt_count',       label:'Type×Count'},
  {id:'pt_result',      label:'Type×Result'},
  {id:'pt_zone',        label:'Type×Zone'},
  {id:'count_pt',       label:'Count×Type'},
  {id:'pt_hand',        label:'Type×Hand'},
  {id:'pt_sit',         label:'Type×Sit'},
  {id:'pt_contact',     label:'Type×Contact'},
  {id:'runs_breakdown', label:'Runs Allowed'},
];

// ── Field Zone Classification (calibrated from Field.png 1536×1024) ──
const FZ={
  hpSx:766/1536, hpSy:838/1024, // normalized home plate position
  aspect:1536/1024,              // image width/height ratio
  angLF:-47.15, angRF:47.37,    // foul line angles in degrees (from dead center)
  ifDist:0.4805,                 // infield-outfield boundary (aspect-corrected normalized)
};
const FZ_STEP=(FZ.angRF-FZ.angLF)/5; // ~18.9° per zone

function getFieldZone(sx,sy){
  if(sx==null||sy==null) return null;
  const dx=(sx-FZ.hpSx)*FZ.aspect;
  const dy=FZ.hpSy-sy; // positive = toward outfield
  const angle=Math.atan2(dx,dy)*180/Math.PI;
  const dist=Math.sqrt(dx*dx+dy*dy);
  if(angle<FZ.angLF) return 'foul-l';
  if(angle>FZ.angRF) return 'foul-r';
  const dirs=['l','lc','c','rc','r'];
  const dir=dirs[Math.min(4,Math.floor((angle-FZ.angLF)/FZ_STEP))];
  return (dist<FZ.ifDist?'if':'of')+'-'+dir;
}
const FZ_LABEL={
  'if-l':'IF-L','if-lc':'IF-LC','if-c':'IF-C','if-rc':'IF-RC','if-r':'IF-R',
  'of-l':'LF','of-lc':'L-CF','of-c':'CF','of-rc':'R-CF','of-r':'RF',
  'foul-l':'Foul-L','foul-r':'Foul-R',
};
const FZ_REGIONS={
  if: ['if-l','if-lc','if-c','if-rc','if-r'],
  of: ['of-l','of-lc','of-c','of-rc','of-r'],
  l:  ['if-l','of-l','foul-l'],
  lc: ['if-lc','of-lc'],
  c:  ['if-c','of-c'],
  rc: ['if-rc','of-rc'],
  r:  ['if-r','of-r','foul-r'],
  foul:['foul-l','foul-r'],
};

function drawSprayZoneOverlay(ctx,sb){
  if(!S.settings?.sprayZoneOverlay) return;
  const hpX=sb.x+FZ.hpSx*sb.w, hpY=sb.y+FZ.hpSy*sb.h;
  // helper: canvas coords for (angDeg, dist) from hp
  function fzPoint(angDeg,d){
    const r=angDeg*Math.PI/180;
    return [hpX+(d*Math.sin(r)/FZ.aspect)*sb.w, hpY-d*Math.cos(r)*sb.h];
  }
  ctx.save();
  // Zone divider lines (4 interior + 2 foul lines)
  const divAngles=[FZ.angLF,FZ.angLF+FZ_STEP,FZ.angLF+2*FZ_STEP,FZ.angLF+3*FZ_STEP,FZ.angLF+4*FZ_STEP,FZ.angRF];
  ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1; ctx.setLineDash([4,5]);
  divAngles.forEach(a=>{
    const [ex,ey]=fzPoint(a,2.5); // extend well past edge
    ctx.beginPath(); ctx.moveTo(hpX,hpY); ctx.lineTo(ex,ey); ctx.stroke();
  });
  // Infield arc
  ctx.beginPath(); let first=true;
  for(let a=FZ.angLF;a<=FZ.angRF+0.5;a+=2){
    const [x,y]=fzPoint(a,FZ.ifDist);
    if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);
  }
  ctx.stroke(); ctx.setLineDash([]);
  // Zone labels
  ctx.fillStyle='rgba(255,255,255,0.32)'; ctx.font='bold 11px -apple-system'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ['L','LC','C','RC','R'].forEach((lbl,i)=>{
    const centerAng=FZ.angLF+FZ_STEP*(i+0.5);
    const [x,y]=fzPoint(centerAng,FZ.ifDist*1.5);
    ctx.fillText(lbl,x,y);
  });
  ctx.textAlign='left'; ctx.restore();
}

// Baseball Savant zone convention — 5×5 grid, 0-indexed col/row
function getZoneNum(zx,zy){
  const col=Math.min(4,Math.floor(zx*5));
  const row=Math.min(4,Math.floor(zy*5));
  if(row>=1&&row<=3&&col>=1&&col<=3) return (row-1)*3+(col-1)+1; // 1–9
  const arm=col<=2, top=row<=2;
  if(top&&arm) return 11;
  if(top&&!arm) return 12;
  if(!top&&arm) return 13;
  return 14;
}
const AN_ZONE_REGIONS={
  up:     [1,2,3,11,12],
  mid:    [4,5,6],
  down:   [7,8,9,13,14],
  in:     [1,4,7,11,13],
  away:   [3,6,9,12,14],
  shadow: [11,12,13,14],
  heart:  [5],
};
function getZoneLabel(zn){
  if(zn===5) return 'Zone 5 — Heart';
  if(zn>=1&&zn<=9) return `Zone ${zn}`;
  const m={11:'Shadow — Arm High',12:'Shadow — Glove High',13:'Shadow — Arm Low',14:'Shadow — Glove Low'};
  return m[zn]||`Zone ${zn}`;
}
function getZoneCells(zf){
  if(!zf||zf==='all') return [];
  const zones=AN_ZONE_REGIONS[zf]||[];
  const cells=[];
  for(let row=0;row<5;row++){
    for(let col=0;col<5;col++){
      const sz=(row>=1&&row<=3&&col>=1&&col<=3);
      const zn=sz?(row-1)*3+(col-1)+1:(col<=2?(row<=2?11:13):(row<=2?12:14));
      if(zones.includes(zn)) cells.push({col,row});
    }
  }
  return cells;
}

function showAnalytics(gameId,from='home'){
  _anGameId=gameId; _anFrom=from;
  _anMetric='usage'; _anDeep=false; _anMatrixView='pt_count';
  _anFilter={games:gameId?[gameId]:[],pitcher:[],hand:'both',sit:'all',trip:'all',loc:'all',zone:'all',bipZone:'all'};
  go('analytics');
}
function analyticsBack(){ go(_anFrom); }
function setAnMetric(id){ _anMetric=id; renderAnalytics(); }
function setAnFilter(k,v){ _anFilter[k]=v; renderAnalytics(); }
function toggleAnDeep(){ _anDeep=!_anDeep; renderAnalytics(); }

function _anGameLabel(){
  if(!_anFilter.games.length) return 'All Games';
  if(_anFilter.games.length===1){
    const g=S.games.find(x=>x.id===_anFilter.games[0]);
    if(!g) return '1 Game';
    return (g.ha==='home'?'vs. ':'@ ')+g.opp;
  }
  return _anFilter.games.length+' Games';
}
function _anPitcherLabel(){
  if(!_anFilter.pitcher.length) return 'All';
  if(_anFilter.pitcher.length===1) return _anFilter.pitcher[0].split(' ').pop();
  return _anFilter.pitcher.length+' Pitchers';
}

function _anGamePickerBody(){
  const allSel=!_anFilter.games.length;
  const row=(id,main,sub,checked)=>`<div onclick="toggleAnGame('${id}')" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;-webkit-tap-highlight-color:transparent;">
    <div><div style="font-size:14px;font-weight:600;color:var(--text);">${main}</div>${sub?`<div style="font-size:11px;color:var(--text3);margin-top:2px;">${sub}</div>`:''}</div>
    <span style="font-size:18px;color:var(--accent);width:20px;text-align:right;">${checked?'✓':''}</span>
  </div>`;
  const sorted=[...S.games].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return row('all','All Games','',allSel)
    +sorted.map(g=>{
      const ha=g.ha==='home'?'vs.':'@';
      const w=g.ourScore!=null&&g.ourScore>g.oppScore, l=g.ourScore!=null&&g.ourScore<g.oppScore;
      const score=g.ourScore!=null?`<span style="color:${w?'var(--green)':l?'#e55':'var(--text3)'}">${w?'W':l?'L':'T'} ${g.ourScore}–${g.oppScore}</span>`:'';
      const sub=[g.date||'',score].filter(Boolean).join(' · ');
      return row(g.id,`${ha} ${g.opp||'Unknown'}`,sub,_anFilter.games.includes(g.id));
    }).join('');
}
function _anPitcherPickerBody(){
  const appIdName={};
  S.games.forEach(g=>(g.pitchers||[]).forEach(gp=>{appIdName[gp.appId]=gp.name;}));
  const names=[...new Set(_anGetPitches().map(p=>appIdName[p.appId]).filter(Boolean))];
  const allSel=!_anFilter.pitcher.length;
  const row=(id,label,checked)=>`<div onclick="toggleAnPitcher('${id.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;-webkit-tap-highlight-color:transparent;">
    <div style="font-size:14px;font-weight:600;color:var(--text);">${label}</div>
    <span style="font-size:18px;color:var(--accent);width:20px;text-align:right;">${checked?'✓':''}</span>
  </div>`;
  return row('all','All Pitchers',allSel)+names.map(n=>row(n,n,_anFilter.pitcher.includes(n))).join('');
}
function showAnGamePicker(){
  showModal('Select Games',_anGamePickerBody());
}
function showAnPitcherPicker(){
  showModal('Select Pitcher',_anPitcherPickerBody());
}
function toggleAnGame(id){
  if(id==='all'){ _anFilter.games=[]; }
  else if(!_anFilter.games.length){ _anFilter.games=[id]; }
  else{
    const i=_anFilter.games.indexOf(id);
    if(i>=0) _anFilter.games.splice(i,1); else _anFilter.games.push(id);
  }
  document.getElementById('modal-body').innerHTML=_anGamePickerBody();
  renderAnalytics();
}
function toggleAnPitcher(name){
  if(name==='all'){ _anFilter.pitcher=[]; }
  else if(!_anFilter.pitcher.length){ _anFilter.pitcher=[name]; }
  else{
    const i=_anFilter.pitcher.indexOf(name);
    if(i>=0) _anFilter.pitcher.splice(i,1); else _anFilter.pitcher.push(name);
  }
  document.getElementById('modal-body').innerHTML=_anPitcherPickerBody();
  renderAnalytics();
}

function _anGetPitches(){
  const src=_anFilter.games.length
    ? S.games.filter(g=>_anFilter.games.includes(g.id))
    : S.games;
  return src.flatMap(g=>{
    const ll=g.lineup?.length||9;
    return (g.pitches||[]).map(p=>({...p,ha:p.ha||g.ha,_lineupLen:ll}));
  });
}
function _anTripNum(p){
  const len=p._lineupLen||9;
  const t=Math.ceil(p.abNum/len);
  return Math.min(t,5);
}

function _anFilterPitches(pitches){
  const _appIdName={};
  if(_anFilter.pitcher.length) S.games.forEach(g=>(g.pitchers||[]).forEach(gp=>{_appIdName[gp.appId]=gp.name;}));
  return pitches.filter(p=>{
    if(_anFilter.pitcher.length&&!_anFilter.pitcher.includes(_appIdName[p.appId])) return false;
    if(_anFilter.hand==='L'&&p.bHand!=='L') return false;
    if(_anFilter.hand==='R'&&p.bHand!=='R') return false;
    if(_anFilter.sit==='risp'&&!p.runners?.b2&&!p.runners?.b3) return false;
    if(_anFilter.sit==='2out'&&p.outsBefore!==2) return false;
    if(_anFilter.trip!=='all'&&_anTripNum(p)!==parseInt(_anFilter.trip)) return false;
    if(_anFilter.loc==='home'&&p.ha!=='home') return false;
    if(_anFilter.loc==='away'&&p.ha!=='away') return false;
    if(_anFilter.zone&&_anFilter.zone!=='all'){
      if(p.zx==null||p.zy==null) return false;
      const zn=getZoneNum(p.zx,p.zy);
      if(!AN_ZONE_REGIONS[_anFilter.zone]||!AN_ZONE_REGIONS[_anFilter.zone].includes(zn)) return false;
    }
    if(_anFilter.bipZone&&_anFilter.bipZone!=='all'){
      if(p.sx==null||p.sy==null) return false;
      const fz=getFieldZone(p.sx,p.sy);
      if(!FZ_REGIONS[_anFilter.bipZone]?.includes(fz)) return false;
    }
    return true;
  });
}

function _computeAnMatrix(pitches){
  // Group by AB for 1-1 W%
  const abGroups={};
  pitches.forEach(p=>{ if(!abGroups[p.abNum])abGroups[p.abNum]=[]; abGroups[p.abNum].push(p); });
  const ab11outcomes={};
  Object.entries(abGroups).forEach(([abNum,abp])=>{
    const term=abp.find(q=>q.isTerm);
    if(!term) return;
    const rt=term.rt;
    const isPW=rt==='k'||rt==='kc'||rt==='d3k'
      ||(rt==='bip'&&term.bipOut!=='hit'&&term.bipOut!=='error')
      ||rt==='oob'||rt==='other';
    ab11outcomes[abNum]=isPW?'p':'b';
  });

  // Count totals per count (any pt)
  const cntTotals={};
  pitches.forEach(p=>{ const ck=`${p.ballsBefore}_${p.strikesBefore}`; cntTotals[ck]=(cntTotals[ck]||0)+1; });

  const cells={};
  const w11seen={};
  const ab11pt={};

  pitches.forEach(p=>{
    if(!p.pt) return;
    const key=`${p.pt}_${p.ballsBefore}_${p.strikesBefore}`;
    if(!cells[key]) cells[key]={pt:p.pt,b:p.ballsBefore,s:p.strikesBefore,
      n:0,strikes:0,swings:0,swstr:0,fouls:0,
      bip:0,hits:0,xbh:0,hhbarrel:0,hhxbh:0,
      terminal:0,kTerm:0,bbhbpTerm:0,abTerm:0,hitsTerm:0,er:0,ur:0};
    const c=cells[key];
    c.n++; c.er+=(p.er||0); c.ur+=(p.ur||0);
    if(p.isStrike) c.strikes++;

    const isBIP=p.rt==='bip', isHR=p.rt==='hr';
    const isSwingK=p.rt==='k'||p.rt==='d3k';
    const isSwstr=p.rt==='swstr', isFoul=p.rt==='foul';
    const isSwing=isSwstr||isFoul||isBIP||isHR||isSwingK;
    const isMiss=isSwstr||isSwingK;
    if(isSwing) c.swings++;
    if(isMiss) c.swstr++;
    if(isFoul) c.fouls++;

    if(isBIP||isHR){
      c.bip++;
      const isHit=p.bipOut==='hit'||isHR;
      if(isHit){
        c.hits++;
        const isXBH=(p.hitBases>=2)||isHR;
        if(isXBH) c.xbh++;
        if(p.hh&&isXBH) c.hhxbh++;
      }
      if(p.hh&&(p.bipType==='LD'||p.bipType==='FLY')) c.hhbarrel++;
    }

    if(p.isTerm){
      c.terminal++;
      const isK=p.rt==='k'||p.rt==='kc'||p.rt==='d3k';
      const isBB=p.rt==='bb'||p.rt==='ibb';
      const isHBP=p.rt==='hbp';
      const isSAC=isBIP&&p.bipOut==='sac';
      const isHit=p.bipOut==='hit'||isHR;
      if(isK) c.kTerm++;
      if(isBB||isHBP) c.bbhbpTerm++;
      if(!isBB&&!isHBP&&!isSAC) c.abTerm++;
      if(isHit) c.hitsTerm++;
    }

    if(p.ballsBefore===1&&p.strikesBefore===1){
      const sk=`${p.pt}_${p.abNum}`;
      if(!w11seen[sk]){
        w11seen[sk]=true;
        const out=ab11outcomes[p.abNum];
        if(out){
          if(!ab11pt[p.pt]) ab11pt[p.pt]={total:0,wins:0};
          ab11pt[p.pt].total++;
          if(out==='p') ab11pt[p.pt].wins++;
        }
      }
    }
  });

  Object.values(cells).forEach(c=>{
    c.countTotal=cntTotals[`${c.b}_${c.s}`]||0;
    c.w11=ab11pt[c.pt]||null;
  });
  return cells;
}

function setAnMatrixView(id){ _anMatrixView=id; _anMetric='usage'; renderAnalytics(); }

function showAnMatrixPicker(){
  const body=AN_MATRIX_VIEWS.map(v=>`<div onclick="setAnMatrixView('${v.id}');hideModal()" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;-webkit-tap-highlight-color:transparent;">
    <div style="font-size:14px;font-weight:600;color:var(--text);">${v.label}</div>
    <span style="font-size:18px;color:var(--accent);width:20px;text-align:right;">${_anMatrixView===v.id?'✓':''}</span>
  </div>`).join('');
  showModal('Matrix View',body);
}

function _anGetRunBreakdown(){
  const appIdName={};
  S.games.forEach(g=>(g.pitchers||[]).forEach(gp=>{appIdName[gp.appId]=gp.name;}));
  const allPitches=_anGetPitches();
  const pitcherPitches=allPitches.filter(p=>!_anFilter.pitcher.length||_anFilter.pitcher.includes(appIdName[p.appId]));

  let s3ER=0,s3UR=0;
  const via={};
  pitcherPitches.forEach(p=>{
    s3ER+=(p.er||0); s3UR+=(p.ur||0);
    (p.scoredRunners||[]).forEach(r=>{
      const k=r.reachedVia||'other';
      via[k]=(via[k]||0)+1;
    });
  });

  const gameSrc=_anFilter.games.length?S.games.filter(g=>_anFilter.games.includes(g.id)):S.games;
  let feER=0,feUR=0;
  const feHow={};
  gameSrc.forEach(g=>{
    (g.events||[]).filter(e=>e.type==='runScored'&&(!_anFilter.pitcher.length||_anFilter.pitcher.includes(appIdName[e.runner?.pitcherAppId])))
      .forEach(e=>{
        if(e.earned)feER++;else feUR++;
        const k=e.runner?.reachedVia||'other';
        via[k]=(via[k]||0)+1;
        const h=e.how||'play';
        feHow[h]=(feHow[h]||0)+1;
      });
  });

  const totalER=s3ER+feER, totalUR=s3UR+feUR;
  const viaTotal=Object.values(via).reduce((a,v)=>a+v,0);
  return{totalER,totalUR,total:totalER+totalUR,via,viaTotal,feHow,feER,feUR,s3ER,s3UR};
}

function _renderRunsBreakdown(){
  const d=_anGetRunBreakdown();
  if(d.total===0) return `<div style="text-align:center;padding:48px 20px;color:var(--text2);font-size:14px;">No runs allowed in this scope.</div>`;

  const header=`<div style="display:flex;gap:10px;margin-bottom:20px;">
    <div style="flex:1;background:var(--bg3);border-radius:var(--rsm);padding:14px 8px;text-align:center;">
      <div style="font-size:30px;font-weight:800;color:var(--red);">${d.totalER}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px;">Earned</div>
    </div>
    <div style="flex:1;background:var(--bg3);border-radius:var(--rsm);padding:14px 8px;text-align:center;">
      <div style="font-size:30px;font-weight:800;color:var(--orange);">${d.totalUR}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px;">Unearned</div>
    </div>
    <div style="flex:1;background:var(--bg3);border-radius:var(--rsm);padding:14px 8px;text-align:center;">
      <div style="font-size:30px;font-weight:800;color:var(--text);">${d.total}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px;">Total</div>
    </div>
  </div>`;

  let viaHTML='';
  if(d.viaTotal>0){
    const bbCount=(d.via.bb||0)+(d.via.ibb||0);
    let insight='';
    if(d.totalER>0&&bbCount>0){
      const pct=Math.round(bbCount/d.totalER*100);
      insight=`<div style="font-size:12px;color:var(--accent);background:rgba(67,113,203,0.1);border-radius:var(--rsm);padding:10px 12px;margin-bottom:10px;">${bbCount} of ${d.totalER} earned run${d.totalER!==1?'s':''} reached via walk (${pct}%)</div>`;
    }
    const rows=[
      ['Walk / IBB',(d.via.bb||0)+(d.via.ibb||0)],
      ['Hit',       d.via.hit||0],
      ['HBP',       d.via.hbp||0],
      ['Error / PB',(d.via.error||0)+(d.via.pb||0)+(d.via.other||0)],
    ].filter(([,n])=>n>0).map(([l,n])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);">
      <div style="font-size:13px;color:var(--text2);">Via ${l}</div>
      <div style="font-size:14px;font-weight:700;">${n}</div>
    </div>`).join('');
    const incomplete=d.viaTotal<d.total;
    const note=incomplete?`<div style="font-size:10px;color:var(--text3);margin-top:6px;">Reach data for ${d.viaTotal} of ${d.total} runs — older records may be incomplete</div>`:'';
    viaHTML=`<div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">How Runners Reached</div>${insight}${rows}${note}`;
  } else if(d.total>0){
    viaHTML=`<div style="font-size:12px;color:var(--text3);padding:10px 0;">Reach attribution requires runs logged with the current runner tracking system.</div>`;
  }

  let feHTML='';
  const feTotal=d.feER+d.feUR;
  if(feTotal>0){
    const howLabels={wp:'Wild Pitch',pb:'Passed Ball',sb:'Stolen Base / Advance',balk:'Balk',ibb_fe:'IBB (Squeeze)',play:'Play',pickoff:'Pickoff'};
    const feRows=Object.entries(d.feHow).sort((a,b)=>b[1]-a[1]).map(([h,n])=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:7px 0;border-bottom:1px solid var(--border);">
      <div style="color:var(--text2);">${howLabels[h]||h}</div>
      <div style="font-weight:700;">${n}</div>
    </div>`).join('');
    feHTML=`<div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin:18px 0 8px;">Field Event Runs (${feTotal})</div>${feRows}`;
  }

  const hasPitchFilters=_anFilter.hand!=='both'||_anFilter.sit!=='all'||_anFilter.trip!=='all'||_anFilter.loc!=='all'||_anFilter.zone!=='all'||_anFilter.bipZone!=='all';
  const filterNote=hasPitchFilters?`<div style="margin-top:10px;font-size:10px;color:var(--accent);">Pitch-level filters active — they apply to AB-result runs only, not field-event runs</div>`:`<div style="margin-top:10px;font-size:10px;color:var(--text3);">Field-event runs (WP/PB/SB/Balk) filtered by game and pitcher only</div>`;

  return `${header}${viaHTML}${feHTML}${filterNote}`;
}

function _computeGenMatrix(pitches,rowFn,colFn,rowFilterFn,colMatchFns){
  const cells={},rowTotals={};
  const accum=(row,col,p)=>{
    const key=`${row}_${col}`;
    if(!cells[key]) cells[key]={row,col,n:0,strikes:0,swings:0,swstr:0,fouls:0,bip:0,hits:0,xbh:0,hhbarrel:0,hhxbh:0,terminal:0,kTerm:0,bbhbpTerm:0,abTerm:0,hitsTerm:0,er:0,ur:0};
    const c=cells[key]; c.n++; c.er+=(p.er||0); c.ur+=(p.ur||0);
    if(p.isStrike) c.strikes++;
    const isBIP=p.rt==='bip',isHR=p.rt==='hr';
    const isSwingK=p.rt==='k'||p.rt==='d3k';
    const isSwstr=p.rt==='swstr',isFoul=p.rt==='foul';
    const isSwing=isSwstr||isFoul||isBIP||isHR||isSwingK;
    if(isSwing) c.swings++;
    if(isSwstr||isSwingK) c.swstr++;
    if(isFoul) c.fouls++;
    if(isBIP||isHR){
      c.bip++;
      const isHit=p.bipOut==='hit'||isHR;
      if(isHit){ c.hits++; const isXBH=(p.hitBases>=2)||isHR; if(isXBH){c.xbh++;if(p.hh)c.hhxbh++;} }
      if(p.hh&&(p.bipType==='LD'||p.bipType==='FLY')) c.hhbarrel++;
    }
    if(p.isTerm){
      c.terminal++;
      const isK=p.rt==='k'||p.rt==='kc'||p.rt==='d3k';
      const isBB=p.rt==='bb'||p.rt==='ibb';
      const isHBP=p.rt==='hbp';
      const isSAC=isBIP&&p.bipOut==='sac';
      if(isK) c.kTerm++;
      if(isBB||isHBP) c.bbhbpTerm++;
      if(!isBB&&!isHBP&&!isSAC) c.abTerm++;
      if(p.bipOut==='hit'||isHR) c.hitsTerm++;
    }
  };
  pitches.forEach(p=>{
    if(!p.pt) return;
    const row=rowFn(p); if(row==null) return;
    if(!rowFilterFn||rowFilterFn(p)) rowTotals[row]=(rowTotals[row]||0)+1;
    if(colMatchFns){
      colMatchFns.forEach(({id,match})=>{ if(match(p)) accum(row,id,p); });
    } else {
      const col=colFn(p); if(col!=null) accum(row,col,p);
    }
  });
  Object.values(cells).forEach(c=>{ c.rowTotal=rowTotals[c.row]||0; });
  return cells;
}

function _anValGen(c,mid){
  if(mid==='usage') return c.rowTotal?c.n/c.rowTotal:0;
  return _anVal(c,mid);
}

function _anGetMatrixDef(id){
  if(id==='pt_result'){
    const cmf=[
      {id:'hit', label:'Hit',            match:p=>p.isTerm&&(p.bipOut==='hit'||p.rt==='hr')},
      {id:'out', label:'Out',            match:p=>p.isTerm&&(p.bipOut==='out'||p.bipOut==='sac'||p.bipOut==='error')},
      {id:'k',   label:'K',              match:p=>p.isTerm&&(p.rt==='k'||p.rt==='kc'||p.rt==='d3k')},
      {id:'bb',  label:'BB',             match:p=>p.isTerm&&(p.rt==='bb'||p.rt==='ibb')},
      {id:'hbp', label:'HBP',            match:p=>p.isTerm&&p.rt==='hbp'},
      {id:'hr',  label:'HR', gapLeft:50,  match:p=>p.isTerm&&p.rt==='hr'},
    ];
    return{rowFn:p=>p.pt,rowOrder:AN_PT_ORDER,colFn:null,colMatchFns:cmf,
      rowFilterFn:p=>p.isTerm,
      colDefs:cmf.map(({id,label,gapLeft})=>({id,label,gapLeft})),
      colWidth:48,note:'HR counts in both HR and Hit — terminal pitch of each at-bat'};
  }
  if(id==='pt_zone'){
    const zCols=[
      {id:'heart',   label:'♥',        zones:[5]},
      {id:'up',      label:'Up',        zones:[1,2,3,11,12]},
      {id:'mid',     label:'Mid',       zones:[4,5,6]},
      {id:'down',    label:'Down',      zones:[7,8,9,13,14]},
      {id:'in',      label:'In',        zones:[1,4,7,11,13]},
      {id:'away',    label:'Away',      zones:[3,6,9,12,14]},
      {id:'shadow',  label:'Shadow',    zones:[11,12,13,14]},
      {id:'up-in',   label:'Up-In',     zones:[1,11]},
      {id:'up-away', label:'Up-Away',   zones:[3,12]},
      {id:'dn-in',   label:'Dn-In',     zones:[7,13]},
      {id:'dn-away', label:'Dn-Away',   zones:[9,14]},
    ];
    const cmf=zCols.map(({id,label,zones})=>({id,label,
      match:p=>p.zx!=null&&p.zy!=null&&zones.includes(getZoneNum(p.zx,p.zy))}));
    return{rowFn:p=>p.pt,rowOrder:AN_PT_ORDER,colFn:null,colMatchFns:cmf,
      rowFilterFn:p=>p.zx!=null&&p.zy!=null,
      colDefs:cmf.map(({id,label})=>({id,label})),
      colWidth:52,note:'Overlapping zones — pitches with location logged only'};
  }
  if(id==='count_pt'){
    return{rowFn:p=>`${p.ballsBefore}_${p.strikesBefore}`,
      rowOrder:AN_COUNTS.map(({b,s})=>`${b}_${s}`),
      colFn:p=>p.pt,rowFilterFn:()=>true,
      colDefs:AN_PT_ORDER.map(pt=>({id:pt,label:pt})),
      colWidth:46,note:'Pitch type usage within each count'};
  }
  if(id==='pt_hand'){
    return{rowFn:p=>p.pt,rowOrder:AN_PT_ORDER,
      colFn:p=>p.bHand==='R'?'R':p.bHand==='L'?'L':null,
      rowFilterFn:p=>p.bHand==='R'||p.bHand==='L',
      colDefs:[{id:'R',label:'vs RHH'},{id:'L',label:'vs LHH'}],
      colWidth:72,note:'Split by batter handedness'};
  }
  if(id==='pt_sit'){
    const cmf=[
      {id:'empty',label:'Bases\nEmpty',match:p=>!p.runners?.b1&&!p.runners?.b2&&!p.runners?.b3},
      {id:'r1',   label:'Runner\n1st', match:p=>!!(p.runners?.b1)&&!p.runners?.b2&&!p.runners?.b3},
      {id:'risp', label:'RISP',        match:p=>!!(p.runners?.b2||p.runners?.b3)},
      {id:'2out', label:'2 Outs',      match:p=>p.outsBefore===2},
    ];
    return{rowFn:p=>p.pt,rowOrder:AN_PT_ORDER,colFn:null,colMatchFns:cmf,
      rowFilterFn:()=>true,
      colDefs:cmf.map(({id,label})=>({id,label})),
      colWidth:58,note:'Overlapping — a pitch with RISP+2out counts in both columns'};
  }
  if(id==='pt_contact'){
    return{rowFn:p=>p.pt,rowOrder:AN_PT_ORDER,
      colFn:p=>{
        if(p.rt!=='bip'&&p.rt!=='hr') return null;
        if(p.hh) return 'hard';
        if(p.wc) return 'weak';
        return 'norm';
      },
      rowFilterFn:p=>p.rt==='bip'||p.rt==='hr',
      colDefs:[{id:'norm',label:'Normal'},{id:'hard',label:'Hard Hit'},{id:'weak',label:'Weak'}],
      colWidth:62,note:'In-play contact quality only'};
  }
  return null;
}

function _renderGenMatrix(pitches,def,matrixId){
  const{rowFn,colFn,rowFilterFn,rowOrder,colDefs,colWidth,note,colMatchFns}=def;
  const cells=_computeGenMatrix(pitches,rowFn,colFn,rowFilterFn,colMatchFns);
  const CW=colWidth||58,LW=46;
  const isCountPt=matrixId==='count_pt';
  const ptTotals={};
  if(!isCountPt) pitches.forEach(p=>{ if(p.pt) ptTotals[p.pt]=(ptTotals[p.pt]||0)+1; });
  const rowsPresent=rowOrder.filter(r=>colDefs.some(col=>cells[`${r}_${col.id}`]?.n>0));
  if(!rowsPresent.length) return `<div style="text-align:center;padding:30px 20px;color:var(--text2);font-size:14px;">No data for this view with current filters.</div>`;
  const ml=col=>col.gapLeft?`${col.gapLeft}px`:'1px';
  const extraGap=colDefs.reduce((a,col)=>a+(col.gapLeft||1)-1,0);
  const hdrCells=colDefs.map(col=>`<div style="width:${CW}px;flex-shrink:0;text-align:center;font-size:10px;font-weight:700;color:var(--text2);padding:5px 2px;margin:1px 1px 1px ${ml(col)};line-height:1.3;">${col.label.replace('\n','<br>')}</div>`).join('');
  const dataRows=rowsPresent.map(rowId=>{
    let rowLabel,rowSub;
    if(isCountPt){
      rowLabel=rowId.replace('_','-');
      const anyCell=Object.values(cells).find(c=>c.row===rowId);
      rowSub=(anyCell?.rowTotal||0)+'p';
    } else {
      rowLabel=rowId;
      rowSub=pitches.length?Math.round((ptTotals[rowId]||0)/pitches.length*100)+'%':'—';
    }
    const rowCells=colDefs.map(col=>{
      const c=cells[`${rowId}_${col.id}`];
      if(!c||c.n===0) return `<div style="width:${CW}px;flex-shrink:0;height:38px;margin:1px 1px 1px ${ml(col)};"></div>`;
      const val=_anValGen(c,_anMetric);
      const disp=_anFmt(val,_anMetric);
      const clr=_anColor(val,_anMetric);
      const safeRow=rowId.replace(/'/g,"\\'");
      return `<div onclick="showAnGenCell('${matrixId}','${safeRow}','${col.id}')" style="width:${CW}px;flex-shrink:0;height:38px;background:var(--bg3);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;cursor:pointer;${clr};margin:1px 1px 1px ${ml(col)};">${disp}</div>`;
    }).join('');
    return `<div style="display:flex;align-items:center;margin-bottom:2px;">
      <div style="width:${LW}px;flex-shrink:0;padding-right:6px;">
        <div style="font-size:12px;font-weight:800;color:var(--text);">${rowLabel}</div>
        <div style="font-size:10px;color:var(--text3);">${rowSub}</div>
      </div>
      <div style="display:flex;">${rowCells}</div>
    </div>`;
  }).join('');
  return `${note?`<div style="font-size:10px;color:var(--accent);margin-bottom:6px;">${note}</div>`:''}
    <div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Tap any cell for full breakdown</div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
      <div style="min-width:${LW+colDefs.length*CW+extraGap+12}px;">
        <div style="display:flex;align-items:center;margin-bottom:2px;">
          <div style="width:${LW}px;flex-shrink:0;"></div>
          <div style="display:flex;">${hdrCells}</div>
        </div>
        ${dataRows}
      </div>
    </div>
    <div style="margin-top:14px;font-size:11px;color:var(--text3);text-align:center;">${pitches.length} pitches · ${rowsPresent.length} rows</div>
    <button onclick="showBrowsePitches()" style="margin-top:12px;width:100%;padding:11px;background:var(--bg3);border:1.5px solid var(--border2);color:var(--text2);font-weight:700;font-size:13px;border-radius:var(--rsm);cursor:pointer;">Browse Pitches →</button>`;
}

function showAnGenCell(matrixId,rowId,colId){
  const def=_anGetMatrixDef(matrixId); if(!def) return;
  const pitches=_anFilterPitches(_anGetPitches());
  const cells=_computeGenMatrix(pitches,def.rowFn,def.colFn,def.rowFilterFn,def.colMatchFns);
  const c=cells[`${rowId}_${colId}`]; if(!c) return;
  const colDef=def.colDefs.find(d=>d.id===colId);
  const isCountPt=matrixId==='count_pt';
  const rowLabel=isCountPt?rowId.replace('_','-'):(AN_PT_NAMES[rowId]||rowId);
  const colLabel=colDef?colDef.label.replace('\n',' '):colId;
  const nWarn=c.n<5?`<div style="font-size:11px;color:var(--red);background:rgba(232,85,85,0.1);border-radius:var(--rsm);padding:7px 10px;margin-bottom:12px;">Small sample — n=${c.n}</div>`:'';
  const metricRows=AN_METRICS.map(m=>{
    const val=_anValGen(c,m.id);
    const fmt=_anFmt(val,m.id);
    const clr=_anColor(val,m.id);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
      <div style="font-size:13px;color:var(--text2);">${m.label}</div>
      <div style="font-size:14px;font-weight:700;${clr}">${fmt}</div>
    </div>`;
  }).join('');
  let bipSection='';
  if(c.bip>0){
    const colMatch=def.colMatchFns
      ? def.colMatchFns.find(d=>d.id===colId)?.match
      : p=>def.colFn(p)===colId;
    const cellPs=pitches.filter(p=>{
      if(!p.pt) return false;
      if(def.rowFn(p)!==rowId) return false;
      if(!colMatch||!colMatch(p)) return false;
      return p.rt==='bip'||p.rt==='hr';
    });
    const bipTypes=['GB','LD','FLY','PU'];
    const bipRows=bipTypes.map(bt=>{
      const bp=cellPs.filter(p=>p.bipType===bt); if(!bp.length) return null;
      const h=bp.filter(p=>p.bipOut==='hit').length;
      const o=bp.filter(p=>p.bipOut==='out'||p.bipOut==='sac').length;
      const hh=bp.filter(p=>p.hh).length;
      return `<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid var(--border);">
        <div style="font-weight:700;color:var(--text2);">${bt}</div>
        <div style="color:var(--text2);">${bp.length} · ${h?`<span style="color:var(--green)">${h}H</span> `:''}${o?`${o}O `:''}${hh?`<span style="color:var(--accent)">${hh}🔥</span>`:''}</div>
      </div>`;
    }).filter(Boolean).join('');
    if(bipRows) bipSection=`<div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 6px;">BIP Breakdown</div>${bipRows}`;
  }
  let runsSection='';
  const cellAllPs=pitches.filter(p=>p.pt&&def.rowFn(p)===rowId&&(!colMatch||colMatch(p)));
  const erTotal=cellAllPs.reduce((a,p)=>a+(p.er||0),0);
  const urTotal=cellAllPs.reduce((a,p)=>a+(p.ur||0),0);
  if(erTotal>0||urTotal>0){
    const hasSR=cellAllPs.some(p=>p.scoredRunners?.length);
    let rvRows='';
    if(hasSR){
      const rv={hit:0,bb:0,ibb:0,hbp:0,error:0,other:0};
      cellAllPs.forEach(p=>(p.scoredRunners||[]).forEach(r=>{
        const k=r.reachedVia||'other';
        if(rv.hasOwnProperty(k))rv[k]++;else rv.other++;
      }));
      const bbTotal=rv.bb+rv.ibb;
      [['Hit',rv.hit],['Walk / IBB',bbTotal],['HBP',rv.hbp],['Error / PB',rv.error+rv.other]].filter(([,n])=>n>0)
        .forEach(([l,n])=>{rvRows+=`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);"><div style="color:var(--text2);">Via ${l}</div><div style="font-weight:700;">${n}</div></div>`;});
    } else {
      rvRows=`<div style="font-size:11px;color:var(--text3);margin-top:4px;">Detail available on newer records</div>`;
    }
    runsSection=`<div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 6px;">Runs Scored — How Runners Reached</div>
      <div style="display:flex;gap:16px;font-size:13px;margin-bottom:8px;">
        <div><span style="color:var(--text3);">ER:</span> <span style="font-weight:700;color:var(--red);">${erTotal}</span></div>
        <div><span style="color:var(--text3);">UR:</span> <span style="font-weight:700;color:var(--orange);">${urTotal}</span></div>
      </div>${rvRows}`;
  }
  let viewBtn='';
  if(isCountPt){
    const[b,s]=rowId.split('_');
    viewBtn=`<button onclick="showPitchView('${colId}',${b},${s})" style="margin-top:16px;width:100%;padding:11px;background:var(--accent);color:#fff;font-weight:700;font-size:14px;border:none;border-radius:var(--rsm);cursor:pointer;">View Pitches →</button>`;
  } else {
    viewBtn=`<button onclick="showPitchViewPT('${rowId}')" style="margin-top:16px;width:100%;padding:11px;background:var(--accent);color:#fff;font-weight:700;font-size:14px;border:none;border-radius:var(--rsm);cursor:pointer;">View ${rowId} Pitches →</button>`;
  }
  showModal(`<span style="font-size:13px;">${rowLabel} · ${colLabel}</span>`,`
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">n = ${c.n} pitches</div>
    ${nWarn}${metricRows}${bipSection}${runsSection}${viewBtn}
  `);
}

function showPitchViewPT(pt){
  hideModal();
  _pvCellMode=false;
  _pvPT=pt; _pvB='all'; _pvS='all'; _pvCountKey='all';
  _pvFilter={result:'all',hand:'both',sit:'all',trip:'all',inning:'all',zone:'all',bipZone:'all'};
  go('pitchview');
  requestAnimationFrame(renderPitchView);
}

function _anVal(c,mid){
  switch(mid){
    case 'usage':  return c.countTotal?c.n/c.countTotal:0;
    case 'strike': return c.n?c.strikes/c.n:0;
    case 'baa':    return c.abTerm?c.hitsTerm/c.abTerm:null;
    case 'whiff':  return c.swings?c.swstr/c.swings:null;
    case 'swstr':  return c.n?c.swstr/c.n:0;
    case 'foul':   return c.n?c.fouls/c.n:0;
    case 'barrel': return c.bip?c.hhbarrel/c.bip:null;
    case 'xbh':    return c.hits?c.xbh/c.hits:null;
    case 'hhxbh':  return c.hhxbh;
    case 'k':      return c.terminal?c.kTerm/c.terminal:null;
    case 'bbhbp':  return c.terminal?c.bbhbpTerm/c.terminal:null;
    case 'wl11':   return (c.b===1&&c.s===1&&c.w11?.total)?c.w11.wins/c.w11.total:null;
    case 'er':     return c.er;
    case 'ur':     return c.ur;
  }
}

function _anFmt(val,mid){
  if(val===null||val===undefined) return '—';
  if(mid==='baa') return '.'+String(Math.round(val*1000)).padStart(3,'0');
  if(mid==='hhxbh'||mid==='er'||mid==='ur') return String(val);
  return Math.round(val*100)+'%';
}

function _anColor(val,mid){
  if(val===null||val===undefined) return '';
  const T={
    strike: {hi:0.65,lo:0.44,hg:true},
    baa:    {hi:0.350,lo:0.220,hg:false},
    whiff:  {hi:0.28,lo:0.10,hg:true},
    swstr:  {hi:0.15,lo:0.05,hg:true},
    barrel: {hi:0.15,lo:0.04,hg:false},
    xbh:    {hi:0.40,lo:0.15,hg:false},
    k:      {hi:0.33,lo:0.10,hg:true},
    bbhbp:  {hi:0.15,lo:0.04,hg:false},
    wl11:   {hi:0.62,lo:0.44,hg:true},
  };
  if(mid==='hhxbh'||mid==='er') return val>0?'color:var(--red)':'';
  if(mid==='ur') return val>0?'color:var(--orange)':'';
  const t=T[mid]; if(!t) return '';
  if(t.hg){ if(val>=t.hi) return 'color:var(--green)'; if(val<=t.lo) return 'color:var(--red)'; }
  else     { if(val>=t.hi) return 'color:var(--red)';  if(val<=t.lo) return 'color:var(--green)'; }
  return '';
}

function renderAnalytics(){
  const navEl=document.getElementById('an-nav-title');
  if(navEl) navEl.textContent='Analytics';

  const raw=_anGetPitches();
  const pitches=_anFilterPitches(raw);
  const shownMetrics=_anDeep?AN_METRICS:AN_METRICS.filter(m=>AN_SIMPLE.includes(m.id));
  const activeMeta=AN_METRICS.find(m=>m.id===_anMetric)||AN_METRICS[0];

  const _btn=(label,onclick,active)=>`<button onclick="${onclick}" style="padding:4px 9px;font-size:11px;font-weight:700;background:${active?'var(--accent)':'none'};color:${active?'#fff':'var(--text2)'};border:none;border-radius:4px;cursor:pointer;">${label}</button>`;
  const _grp=(label,extra='')=>(btns)=>`<div style="display:flex;gap:3px;background:var(--bg3);border-radius:var(--rsm);padding:3px;align-items:center;">${label?`<span style="font-size:10px;font-weight:700;color:var(--text3);padding:0 4px 0 2px;">${label}</span>`:''}${extra}${btns}</div>`;

  const activeView=AN_MATRIX_VIEWS.find(v=>v.id===_anMatrixView)||AN_MATRIX_VIEWS[0];
  const viewPillsHTML=`<button onclick="showAnMatrixPicker()" style="width:100%;padding:9px 12px;background:var(--bg3);border:1.5px solid var(--accent);border-radius:var(--rsm);font-size:12px;font-weight:700;color:var(--text);cursor:pointer;display:flex;align-items:center;gap:6px;margin-bottom:10px;">
    <span style="font-size:10px;font-weight:700;color:var(--text3);flex-shrink:0;">View</span>
    <span style="flex:1;text-align:left;">${activeView.label}</span>
    <span style="color:var(--text3);font-size:10px;flex-shrink:0;">▾</span>
  </button>`;

  const filtersHTML=`<div style="margin-bottom:14px;">
    <div style="display:flex;gap:8px;margin-bottom:10px;">
      <button onclick="showAnGamePicker()" style="flex:1;min-width:0;padding:9px 12px;background:var(--bg3);border:1.5px solid ${_anFilter.games.length?'var(--accent)':'var(--border2)'};border-radius:var(--rsm);font-size:12px;font-weight:700;color:var(--text);cursor:pointer;display:flex;align-items:center;gap:6px;">
        <span style="font-size:10px;font-weight:700;color:var(--text3);flex-shrink:0;">Game</span>
        <span style="flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_anGameLabel()}</span>
        <span style="color:var(--text3);font-size:10px;flex-shrink:0;">▾</span>
      </button>
      <button onclick="showAnPitcherPicker()" style="flex:1;min-width:0;padding:9px 12px;background:var(--bg3);border:1.5px solid ${_anFilter.pitcher.length?'var(--accent)':'var(--border2)'};border-radius:var(--rsm);font-size:12px;font-weight:700;color:var(--text);cursor:pointer;display:flex;align-items:center;gap:6px;">
        <span style="font-size:10px;font-weight:700;color:var(--text3);flex-shrink:0;">P</span>
        <span style="flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_anPitcherLabel()}</span>
        <span style="color:var(--text3);font-size:10px;flex-shrink:0;">▾</span>
      </button>
    </div>
    ${viewPillsHTML}
    <div style="display:flex;gap:7px;flex-wrap:wrap;">
      ${_grp('H')([['both','Both'],['L','LHH'],['R','RHH']].map(([v,l])=>_btn(l,`setAnFilter('hand','${v}')`,_anFilter.hand===v)).join(''))}
      ${_grp('Sit')([['all','All'],['risp','RISP'],['2out','2-Out']].map(([v,l])=>_btn(l,`setAnFilter('sit','${v}')`,_anFilter.sit===v)).join(''))}
      ${_grp('Trip')([['all','All'],['1','1st'],['2','2nd'],['3','3rd'],['4','4th'],['5','5th']].map(([v,l])=>_btn(l,`setAnFilter('trip','${v}')`,_anFilter.trip===v)).join(''))}
      ${_grp('@')([['all','All'],['home','Home'],['away','Away']].map(([v,l])=>_btn(l,`setAnFilter('loc','${v}')`,_anFilter.loc===v)).join(''))}
      ${_grp('Zone','<button onclick="showZoneKey()" style="padding:2px 6px;font-size:11px;font-weight:700;background:none;color:var(--text3);border:1px solid var(--border2);border-radius:4px;cursor:pointer;">?</button>')([['all','All'],['up','Up'],['mid','Mid'],['down','Dn'],['in','In'],['away','Away'],['shadow','Shad'],['heart','♥']].map(([v,l])=>_btn(l,`setAnFilter('zone','${v}')`,_anFilter.zone===v)).join(''))}
      ${_grp('Field')([['all','All'],['if','IF'],['of','OF'],['l','L'],['lc','LC'],['c','C'],['rc','RC'],['r','R'],['foul','Foul']].map(([v,l])=>_btn(l,`setAnFilter('bipZone','${v}')`,_anFilter.bipZone===v)).join(''))}
    </div>
    ${_anFilter.bipZone!=='all'?'<div style="font-size:10px;color:var(--accent);margin-top:6px;">Field filter active — BIP with spray location only</div>':''}
  </div>`;

  const chipsHTML=`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;align-items:center;">
    ${shownMetrics.map(m=>`<button onclick="setAnMetric('${m.id}')" style="padding:5px 10px;font-size:11px;font-weight:700;border-radius:20px;border:1.5px solid ${_anMetric===m.id?'var(--accent)':'var(--border2)'};background:${_anMetric===m.id?'var(--accent)':'var(--bg3)'};color:${_anMetric===m.id?'#fff':'var(--text2)'};cursor:pointer;white-space:nowrap;">${m.label}</button>`).join('')}
    <button onclick="toggleAnDeep()" style="padding:5px 10px;font-size:11px;font-weight:600;border-radius:20px;border:1.5px solid var(--border2);background:none;color:var(--text3);cursor:pointer;margin-left:auto;flex-shrink:0;">${_anDeep?'Simple ←':'Deep Dive →'}</button>
  </div>
  <div style="font-size:11px;color:var(--text3);margin-bottom:10px;">${activeMeta.desc}</div>`;

  if(_anMatrixView==='runs_breakdown'){
    document.getElementById('an-body').innerHTML=`<div style="padding:16px;">${filtersHTML}${_renderRunsBreakdown()}</div>`;
    return;
  }

  if(!pitches.length){
    document.getElementById('an-body').innerHTML=`<div style="padding:16px;">${filtersHTML}${chipsHTML}<div style="text-align:center;padding:40px 20px;color:var(--text2);font-size:14px;">No pitches match the current filters.</div></div>`;
    return;
  }

  if(_anMatrixView!=='pt_count'){
    const def=_anGetMatrixDef(_anMatrixView);
    document.getElementById('an-body').innerHTML=`<div style="padding:16px;">${filtersHTML}${chipsHTML}${_renderGenMatrix(pitches,def,_anMatrixView)}</div>`;
    return;
  }

  // pt_count matrix
  const cells=_computeAnMatrix(pitches);
  const ptPresent=AN_PT_ORDER.filter(pt=>AN_COUNTS.some(({b,s})=>cells[`${pt}_${b}_${s}`]?.n>0));

  if(!ptPresent.length){
    document.getElementById('an-body').innerHTML=`<div style="padding:16px;">${filtersHTML}${chipsHTML}<div style="text-align:center;padding:40px 20px;color:var(--text2);font-size:14px;">No pitches match the current filters.</div></div>`;
    return;
  }

  const CW=46,LW=46;
  const hdrCells=AN_COUNTS.map(({b,s})=>`<div style="width:${CW}px;flex-shrink:0;text-align:center;font-size:10px;font-weight:700;color:var(--text2);padding:5px 2px;margin:1px;">${b}-${s}</div>`).join('');

  const dataRows=ptPresent.map(pt=>{
    const ptTotal=Object.values(cells).filter(c=>c.pt===pt).reduce((a,c)=>a+c.n,0);
    const ptPct=pitches.length?Math.round(ptTotal/pitches.length*100):0;
    const rowCells=AN_COUNTS.map(({b,s})=>{
      const c=cells[`${pt}_${b}_${s}`];
      if(!c||c.n===0) return `<div style="width:${CW}px;flex-shrink:0;height:38px;margin:1px;"></div>`;
      const val=_anVal(c,_anMetric);
      const disp=_anFmt(val,_anMetric);
      const col=_anColor(val,_anMetric);
      return `<div onclick="showAnCell('${pt}',${b},${s})" style="width:${CW}px;flex-shrink:0;height:38px;background:var(--bg3);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;cursor:pointer;${col};margin:1px;">${disp}</div>`;
    }).join('');
    return `<div style="display:flex;align-items:center;margin-bottom:2px;">
      <div style="width:${LW}px;flex-shrink:0;padding-right:6px;">
        <div style="font-size:12px;font-weight:800;color:#000;">${pt}</div>
        <div style="font-size:10px;color:var(--text3);">${ptPct}%</div>
      </div>
      <div style="display:flex;">${rowCells}</div>
    </div>`;
  }).join('');

  document.getElementById('an-body').innerHTML=`<div style="padding:16px;">
    ${filtersHTML}${chipsHTML}
    <div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Tap any cell for full breakdown</div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
      <div style="min-width:${LW+AN_COUNTS.length*CW+12}px;">
        <div style="display:flex;align-items:center;margin-bottom:2px;">
          <div style="width:${LW}px;flex-shrink:0;"></div>
          <div style="display:flex;">${hdrCells}</div>
        </div>
        ${dataRows}
      </div>
    </div>
    <div style="margin-top:14px;font-size:11px;color:var(--text3);text-align:center;">${pitches.length} pitches · ${ptPresent.length} pitch types</div>
    <button onclick="showBrowsePitches()" style="margin-top:12px;width:100%;padding:11px;background:var(--bg3);border:1.5px solid var(--border2);color:var(--text2);font-weight:700;font-size:13px;border-radius:var(--rsm);cursor:pointer;">Browse Pitches →</button>
  </div>`;
}

function showAnCell(pt,b,s){
  const pitches=_anFilterPitches(_anGetPitches());
  const cells=_computeAnMatrix(pitches);
  const c=cells[`${pt}_${b}_${s}`];
  if(!c) return;

  const ptName=AN_PT_NAMES[pt]||pt;
  const metricRows=AN_METRICS.map(m=>{
    const val=_anVal(c,m.id);
    const fmt=_anFmt(val,m.id);
    const col=_anColor(val,m.id);
    const na=m.id==='wl11'&&(b!==1||s!==1);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
      <div style="font-size:13px;color:var(--text2);">${m.label}</div>
      <div style="font-size:14px;font-weight:700;${na?'color:var(--text3)':col}">${na?'—':fmt}</div>
    </div>`;
  }).join('');

  const bipTypes=['GB','LD','FLY','PU'];
  const bipRows=bipTypes.map(bt=>{
    const bp=pitches.filter(p=>p.pt===pt&&p.ballsBefore===b&&p.strikesBefore===s&&p.rt==='bip'&&p.bipType===bt);
    if(!bp.length) return null;
    const h=bp.filter(p=>p.bipOut==='hit').length;
    const o=bp.filter(p=>p.bipOut==='out'||p.bipOut==='sac').length;
    const e=bp.filter(p=>p.bipOut==='error').length;
    const hh=bp.filter(p=>p.hh).length;
    return `<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid var(--border);">
      <div style="font-weight:700;color:var(--text2);">${bt}</div>
      <div style="color:var(--text2);">${bp.length} · ${h>0?`<span style="color:var(--green)">${h}H</span> `:''}${o>0?`${o}O `:''}${e>0?`${e}E `:''}${hh>0?`<span style="color:var(--accent)">${hh}🔥</span>`:''}
      </div>
    </div>`;
  }).filter(Boolean).join('');

  const hrPitches=pitches.filter(p=>p.pt===pt&&p.ballsBefore===b&&p.strikesBefore===s&&p.rt==='hr');
  const hrRow=hrPitches.length?`<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid var(--border);"><div style="font-weight:700;color:var(--red);">HR</div><div style="color:var(--red);">${hrPitches.length}</div></div>`:'';

  const nWarn=c.n<5?`<div style="font-size:11px;color:var(--red);background:rgba(232,85,85,0.1);border-radius:var(--rsm);padding:7px 10px;margin-bottom:12px;">Small sample — n=${c.n}</div>`:'';

  // Runs Scored section (Piece 4)
  const cellPitches=pitches.filter(p=>p.pt===pt&&p.ballsBefore===b&&p.strikesBefore===s);
  const erTotal=cellPitches.reduce((a,p)=>a+(p.er||0),0);
  const urTotal=cellPitches.reduce((a,p)=>a+(p.ur||0),0);
  let runsSection='';
  if(erTotal>0||urTotal>0){
    const hasSR=cellPitches.some(p=>p.scoredRunners?.length);
    let rvRows='';
    if(hasSR){
      const rv={hit:0,bb:0,ibb:0,hbp:0,error:0,other:0};
      cellPitches.forEach(p=>(p.scoredRunners||[]).forEach(r=>{
        const k=r.reachedVia||'other';
        if(rv.hasOwnProperty(k))rv[k]++;else rv.other++;
      }));
      const bbTotal=rv.bb+rv.ibb;
      [['Hit',rv.hit],['Walk / IBB',bbTotal],['HBP',rv.hbp],['Error / PB',rv.error+rv.other]].filter(([,n])=>n>0)
        .forEach(([l,n])=>{rvRows+=`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);"><div style="color:var(--text2);">Via ${l}</div><div style="font-weight:700;">${n}</div></div>`;});
    } else {
      rvRows=`<div style="font-size:11px;color:var(--text3);margin-top:4px;">Detail available on newer records</div>`;
    }
    runsSection=`<div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 6px;">Runs Scored — How Runners Reached</div>
      <div style="display:flex;gap:16px;font-size:13px;margin-bottom:8px;">
        <div><span style="color:var(--text3);">ER:</span> <span style="font-weight:700;">${erTotal}</span></div>
        <div><span style="color:var(--text3);">UR:</span> <span style="font-weight:700;">${urTotal}</span></div>
      </div>${rvRows}`;
  }

  showModal(`<span style="font-size:13px;">${ptName} · ${b}-${s}</span>`,`
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">n = ${c.n} pitches</div>
    ${nWarn}
    ${metricRows}
    ${(bipRows||hrRow)?`<div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 6px;">BIP Breakdown</div>${bipRows}${hrRow}`:''}
    ${runsSection}
    <button onclick="showPitchView('${pt}',${b},${s})" style="margin-top:16px;width:100%;padding:11px;background:var(--accent);color:#fff;font-weight:700;font-size:14px;border:none;border-radius:var(--rsm);cursor:pointer;">View Pitches →</button>
  `);
}

function showZoneKey(){
  // 5×5 SVG zone diagram. Each cell = 36px. Shadow cells slightly smaller visually.
  const CZ=36, SZ_COL='rgba(255,255,255,0.12)', SZ_STROKE='rgba(255,255,255,0.35)', SH_COL='rgba(255,255,255,0.05)';
  const W=5*CZ, H=5*CZ;
  function cellFill(col,row){return (row>=1&&row<=3&&col>=1&&col<=3)?SZ_COL:SH_COL;}
  function cellLabel(col,row){
    if(row>=1&&row<=3&&col>=1&&col<=3) return (row-1)*3+(col-1)+1;
    const arm=col<=2,top=row<=2;
    return top?(arm?11:12):(arm?13:14);
  }
  let cells='';
  for(let row=0;row<5;row++){
    for(let col=0;col<5;col++){
      const x=col*CZ,y=row*CZ;
      const lbl=cellLabel(col,row);
      const inSZ=row>=1&&row<=3&&col>=1&&col<=3;
      const isHeart=lbl===5;
      cells+=`<rect x="${x+1}" y="${y+1}" width="${CZ-2}" height="${CZ-2}" rx="3" fill="${isHeart?'rgba(67,113,203,0.25)':cellFill(col,row)}" stroke="${inSZ?SZ_STROKE:'rgba(255,255,255,0.12)'}" stroke-width="${inSZ?1.5:1}"/>`;
      cells+=`<text x="${x+CZ/2}" y="${y+CZ/2+4}" text-anchor="middle" font-size="11" font-weight="${inSZ?700:500}" fill="${inSZ?'rgba(255,255,255,0.85)':'rgba(255,255,255,0.4)'}">${lbl}</text>`;
    }
  }
  // home plate pentagon at bottom center
  const px=W/2,py=H+18;
  const plate=`<polygon points="${px-12},${py-8} ${px+12},${py-8} ${px+12},${py} ${px},${py+8} ${px-12},${py}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>`;
  const legend=[
    ['1–9','Strike Zone'],['5','Heart (center)'],['11–12','Shadow (high)'],['13–14','Shadow (low)'],
  ].map(([z,desc],i)=>`<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text2);margin:4px 0;">
    <div style="width:30px;text-align:center;font-weight:700;color:var(--text);">${z}</div>
    <div>${desc}</div>
  </div>`).join('');
  showModal('Zone Map',`
    <div style="text-align:center;margin-bottom:8px;">
      <svg width="${W}" height="${H+30}" viewBox="0 0 ${W} ${H+30}" style="display:inline-block;">
        ${cells}${plate}
        <text x="${W/2}" y="${H+28}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.35)">Catcher's view</text>
      </svg>
    </div>
    <div style="margin-top:8px;">${legend}</div>
    <div style="margin-top:10px;font-size:11px;color:var(--text3);">Zones follow Baseball Savant convention. "In/Away" based on catcher's perspective — flip mentally for LHB.</div>
  `);
}

// ══════════════════════════════════════════
// STATS SCREEN
// ══════════════════════════════════════════
let _stFromScreen='home', _stGames=[], _stSort={col:null,dir:'desc'};
let _drillSprayDots=[];

function showStats(from='home'){ _stFromScreen=from; _stGames=[]; _stSort={col:null,dir:'desc'}; go('stats'); }
function statsBack(){ go(_stFromScreen); }

function _stGetGames(){ return _stGames.length?S.games.filter(g=>_stGames.includes(g.id)):S.games; }

function _stScopeLabel(){
  if(!_stGames.length) return 'Season — All Games';
  if(_stGames.length===1){
    const g=S.games.find(g=>g.id===_stGames[0]);
    if(g) return `${g.ha==='home'?'vs.':'@'} ${g.opp||'Unknown'}${g.date?' · '+g.date:''}`;
    return '1 Game';
  }
  return `${_stGames.length} Games`;
}

function _stGamePickerBody(){
  const row=(id,label,sub,checked)=>`<div onclick="toggleStGame('${id}')" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;-webkit-tap-highlight-color:transparent;">
    <div><div style="font-size:14px;font-weight:600;color:var(--text);">${label}</div>${sub?`<div style="font-size:11px;color:var(--text3);margin-top:2px;">${sub}</div>`:''}</div>
    <span style="font-size:18px;color:var(--accent);width:20px;text-align:right;">${checked?'✓':''}</span>
  </div>`;
  const sorted=S.games.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return row('all','Season — All Games','',!_stGames.length)+sorted.map(g=>{
    const ha=g.ha==='home'?'vs.':'@';
    const w=g.ourScore!=null&&g.ourScore>g.oppScore,l=g.ourScore!=null&&g.ourScore<g.oppScore;
    const score=g.ourScore!=null?`${w?'W':l?'L':'T'} ${g.ourScore}–${g.oppScore}`:'';
    return row(g.id,`${ha} ${g.opp||'Unknown'}`,[g.date||'',score].filter(Boolean).join(' · '),_stGames.includes(g.id));
  }).join('');
}
function showStGamePicker(){ showModal('Select Scope',_stGamePickerBody()); }
function toggleStGame(id){
  if(id==='all'){ _stGames=[]; }
  else if(!_stGames.length){ _stGames=[id]; }
  else{ const i=_stGames.indexOf(id); if(i>=0)_stGames.splice(i,1);else _stGames.push(id); }
  document.getElementById('modal-body').innerHTML=_stGamePickerBody();
  renderStats();
}

function _stAgg(games){
  const byName={};
  games.forEach(g=>{
    (g.pitchers||[]).forEach(gp=>{
      const key=gp.name||'Unknown';
      if(!byName[key]) byName[key]={name:key,num:gp.num||'',throws:gp.throws||'R',po:0,pc:0,k:0,bb:0,hbp:0,h:0,hr:0,er:0,ur:0,apps:[]};
      const d=byName[key];
      d.po+=(gp.po||0); d.pc+=(gp.pc||0); d.k+=(gp.k||0); d.bb+=(gp.bb||0);
      d.hbp+=(gp.hbp||0); d.h+=(gp.h||0); d.hr+=(gp.hr||0); d.er+=(gp.er||0); d.ur+=(gp.ur||0);
      d.apps.push({gameId:g.id,appId:gp.appId});
    });
  });
  return Object.values(byName).filter(d=>d.pc>0);
}
function _stIP(po){ return Math.floor(po/3)+'.'+(po%3); }
function _stERA(d){ return d.po>0?((d.er*27)/d.po).toFixed(2):'—'; }
function _stWHIP(d){ return d.po>0?((d.bb+d.h)/(d.po/3)).toFixed(2):'—'; }
function _stSortNum(d,col){
  switch(col){
    case 'pc': return d.pc; case 'ip': return d.po; case 'k': return d.k;
    case 'bb': return d.bb; case 'h': return d.h; case 'hr': return d.hr;
    case 'r': return d.er+d.ur; case 'er': return d.er;
    case 'era': return d.po>0?(d.er*27)/d.po:9999;
    case 'whip': return d.po>0?(d.bb+d.h)/(d.po/3):9999;
    default: return 0;
  }
}
function stSortBy(col){
  if(_stSort.col===col) _stSort.dir=_stSort.dir==='desc'?'asc':'desc';
  else { _stSort.col=col; _stSort.dir='desc'; }
  renderStats();
}

function renderStats(){
  const games=_stGetGames();
  const pitchers=_stAgg(games);
  const scopeBtn=`<button onclick="showStGamePicker()" style="width:100%;padding:9px 12px;background:var(--bg3);border:1.5px solid var(--accent);border-radius:var(--rsm);font-size:12px;font-weight:700;color:var(--text);cursor:pointer;display:flex;align-items:center;gap:6px;margin-bottom:16px;-webkit-tap-highlight-color:transparent;">
    <span style="font-size:10px;font-weight:700;color:var(--text3);flex-shrink:0;">Scope</span>
    <span style="flex:1;text-align:left;">${_stScopeLabel()}</span>
    <span style="color:var(--text3);font-size:10px;">▾</span>
  </button>`;
  if(!pitchers.length){
    document.getElementById('st-body').innerHTML=`<div style="padding:16px;">${scopeBtn}<div style="text-align:center;padding:40px 20px;color:var(--text2);font-size:14px;">No pitching data in this scope.</div></div>`;
    return;
  }
  let sorted=pitchers.slice();
  if(_stSort.col) sorted.sort((a,b)=>(_stSort.dir==='desc'?1:-1)*(_stSortNum(b,_stSort.col)-_stSortNum(a,_stSort.col)));
  const tot={pc:0,po:0,k:0,bb:0,hbp:0,h:0,hr:0,er:0,ur:0};
  pitchers.forEach(d=>{Object.keys(tot).forEach(k=>{tot[k]+=(d[k]||0);});});
  const cols=[
    {id:'pc',label:'P'},{id:'ip',label:'IP'},{id:'k',label:'K'},{id:'bb',label:'BB'},
    {id:'hbp',label:'HBP'},{id:'h',label:'H'},{id:'hr',label:'HR'},
    {id:'r',label:'R'},{id:'er',label:'ER'},{id:'era',label:'ERA'},{id:'whip',label:'WHIP'},
  ];
  const drillable=new Set(['k','bb','h','hr','hbp']);
  const thHtml=cols.map(c=>`<th onclick="stSortBy('${c.id}')" class="${_stSort.col===c.id?'st-sort-active':''}">${c.label}${_stSort.col===c.id?' '+(_stSort.dir==='desc'?'↓':'↑'):''}</th>`).join('');
  const cv=(d,col)=>{
    switch(col){
      case 'pc': return d.pc; case 'ip': return _stIP(d.po); case 'k': return d.k;
      case 'bb': return d.bb; case 'hbp': return d.hbp; case 'h': return d.h;
      case 'hr': return d.hr; case 'r': return d.er+d.ur; case 'er': return d.er;
      case 'era': return _stERA(d); case 'whip': return _stWHIP(d); default: return '—';
    }
  };
  const dataRows=sorted.map(d=>`<tr>
    <td><div style="font-size:12px;font-weight:700;color:#111;">${_pShortName(d.name)}</div><div style="font-size:10px;color:#777;">#${d.num} ${d.throws}</div></td>
    ${cols.map(c=>{const v=cv(d,c.id);const can=drillable.has(c.id)&&typeof v==='number'&&v>0;return `<td>${can?`<span class="stat-tap" onclick="showStatDrill('${d.name.replace(/'/g,"\\'")}','${c.id}')">${v}</span>`:v}</td>`;}).join('')}
  </tr>`).join('');
  const totRow=`<tr class="stat-totals"><td style="font-size:11px;color:#555;">Totals</td>${cols.map(c=>{const drillVal=drillable.has(c.id);switch(c.id){case 'pc':return`<td>${tot.pc}</td>`;case 'ip':return`<td>${_stIP(tot.po)}</td>`;case 'k':return`<td>${drillVal&&tot.k>0?`<span class="stat-tap" onclick="showStatDrill('_all','k')">${tot.k}</span>`:tot.k}</td>`;case 'bb':return`<td>${drillVal&&tot.bb>0?`<span class="stat-tap" onclick="showStatDrill('_all','bb')">${tot.bb}</span>`:tot.bb}</td>`;case 'hbp':return`<td>${drillVal&&tot.hbp>0?`<span class="stat-tap" onclick="showStatDrill('_all','hbp')">${tot.hbp}</span>`:tot.hbp}</td>`;case 'h':return`<td>${drillVal&&tot.h>0?`<span class="stat-tap" onclick="showStatDrill('_all','h')">${tot.h}</span>`:tot.h}</td>`;case 'hr':return`<td>${drillVal&&tot.hr>0?`<span class="stat-tap" onclick="showStatDrill('_all','hr')">${tot.hr}</span>`:tot.hr}</td>`;case 'r':return`<td>${tot.er+tot.ur}</td>`;case 'er':return`<td>${tot.er}</td>`;case 'era':return`<td>${tot.po>0?((tot.er*27)/tot.po).toFixed(2):'—'}</td>`;case 'whip':return`<td>${tot.po>0?((tot.bb+tot.h)/(tot.po/3)).toFixed(2):'—'}</td>`;default:return'<td>—</td>';}}).join('')}</tr>`;
  document.getElementById('st-body').innerHTML=`<div style="padding:16px 0 0;">
    <div style="padding:0 16px;">${scopeBtn}</div>
    <div class="stat-table-wrap">
      <table class="stat-table">
        <thead><tr><th style="text-align:left;padding-left:12px;cursor:default;">Pitcher</th>${thHtml}</tr></thead>
        <tbody>${dataRows}${totRow}</tbody>
      </table>
    </div>
    <div style="padding:10px 16px;font-size:10px;color:var(--text3);text-align:center;">Tap K · BB · HBP · H · HR on any row to view sequences</div>
  </div>`;
}

// ══════════════════════════════════════════
// COMMAND SCREEN (Intended vs. Actual)
// ══════════════════════════════════════════
let _cmdFromScreen='home', _cmdGames=[], _cmdPitcher='_all';
let _cmdCachedPitches=[], _cmdCachedGames=[];

function showCommand(from='home'){ _cmdFromScreen=from; _cmdGames=[]; _cmdPitcher='_all'; go('command'); }
function cmdBack(){ go(_cmdFromScreen); }
function _cmdGetGames(){ return _cmdGames.length?S.games.filter(g=>_cmdGames.includes(g.id)):S.games.filter(g=>g.trackIntended); }

function _hitSpotTolerance(){
  const ov=S.settings.hitSpotTolerance;
  if(ov!=null) return ov;
  const lvl=S.team.level||'hs';
  if(lvl==='d1') return 0.20;
  if(lvl==='hs') return 0.50;
  return 0.33;
}

function _cmdGetPitches(games){
  const ps=games.flatMap(g=>g.pitches||[]).filter(p=>p.izx!=null&&p.izy!=null&&p.zx!=null);
  if(_cmdPitcher==='_all') return ps;
  return ps.filter(p=>{
    const game=games.find(g=>(g.pitches||[]).includes(p));
    const app=(game?.pitchers||[]).find(a=>a.appId===p.appId);
    return app&&app.name===_cmdPitcher;
  });
}

function _cmdPitcherList(games){
  const names=new Set();
  games.forEach(g=>(g.pitchers||[]).forEach(gp=>names.add(gp.name)));
  return ['_all',...names];
}

function _cmdMissVec(p){ return {dx:p.zx-p.izx, dy:p.zy-p.izy, pt:p.pt, bHand:p.bHand, inning:p.inning, appId:p.appId}; }

function _cmdHitSpotPct(pitches, tol){
  if(!pitches.length) return null;
  const hits=pitches.filter(p=>Math.hypot(p.zx-p.izx,p.zy-p.izy)<=tol);
  return Math.round(hits.length/pitches.length*100);
}

function _cmdAvgDist(pitches){
  if(!pitches.length) return null;
  return (pitches.reduce((s,p)=>s+Math.hypot(p.zx-p.izx,p.zy-p.izy),0)/pitches.length).toFixed(3);
}

function _cmdPitcherName(games, id){
  if(id==='_all') return 'All Pitchers';
  const gp=games.flatMap(g=>g.pitchers||[]).find(a=>a.name===id);
  return gp?_pShortName(gp.name):id;
}

function renderCommand(){
  const games=_cmdGetGames();
  const allPitches=_cmdGetPitches(games);
  const tol=_hitSpotTolerance();
  const pitcherList=_cmdPitcherList(games);
  const pitcherName=_cmdPitcherName(games,_cmdPitcher);

  if(!games.length){
    document.getElementById('cmd-body').innerHTML=`<div style="padding:32px 20px;text-align:center;color:var(--text2);">No games with intended location tracking.<br><br>Enable <b>Track Intended Location</b> in the game menu (⋯) to start collecting data.</div>`;
    return;
  }

  // Pitcher picker
  const pitcherPicker=`<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;padding:0 16px 10px;display:flex;gap:6px;flex-wrap:nowrap;">
    ${pitcherList.map(id=>`<button onclick="_cmdSetPitcher('${id.replace(/'/g,"\\'")}',event)" style="flex-shrink:0;padding:6px 12px;border-radius:20px;border:1.5px solid ${_cmdPitcher===id?'var(--accent)':'var(--border)'};background:${_cmdPitcher===id?'var(--accent)':'var(--bg3)'};color:${_cmdPitcher===id?'#fff':'var(--text)'};font-size:12px;font-weight:600;cursor:pointer;">${_cmdPitcherName(games,id)}</button>`).join('')}
  </div>`;

  if(!allPitches.length){
    document.getElementById('cmd-body').innerHTML=`<div style="padding:12px 16px 0;">${pitcherPicker}<div style="padding:32px 20px;text-align:center;color:var(--text2);">No tracked pitches for ${pitcherName} in this scope.</div></div>`;
    return;
  }

  const hsPct=_cmdHitSpotPct(allPitches,tol);
  const avgDist=_cmdAvgDist(allPitches);

  // Summary chips
  const chips=`<div style="display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 14px;">
    <div style="background:var(--bg3);border-radius:var(--rsm);padding:8px 14px;text-align:center;">
      <div style="font-size:20px;font-weight:800;color:var(--accent);">${hsPct}%</div>
      <div style="font-size:10px;color:var(--text3);">Hit Spot</div>
    </div>
    <div style="background:var(--bg3);border-radius:var(--rsm);padding:8px 14px;text-align:center;">
      <div style="font-size:20px;font-weight:800;color:var(--text);">${avgDist}</div>
      <div style="font-size:10px;color:var(--text3);">Avg Miss</div>
    </div>
    <div style="background:var(--bg3);border-radius:var(--rsm);padding:8px 14px;text-align:center;">
      <div style="font-size:20px;font-weight:800;color:var(--text);">${allPitches.length}</div>
      <div style="font-size:10px;color:var(--text3);">Tracked Pitches</div>
    </div>
  </div>`;

  // Tolerance presets
  const tolSection=_cmdTolSection(tol);

  // Miss direction split — vs LHH, vs RHH (pitcher's perspective)
  const zoneSection=_cmdMissSplitSection(allPitches,games);

  // Miss direction quadrant
  const quadSection=_cmdQuadSection(allPitches,games);

  // By pitch type
  const ptSection=_cmdByPitchType(allPitches,tol);

  // Over time
  const timeSection=_cmdOverTime(allPitches,tol);

  document.getElementById('cmd-body').innerHTML=`<div style="padding:12px 0 24px;">
    ${pitcherPicker}${chips}${tolSection}${quadSection}${zoneSection}${ptSection}${timeSection}
  </div>`;

  _cmdCachedPitches=allPitches; _cmdCachedGames=games;
  requestAnimationFrame(()=>_cmdDrawMissChart('cmd-quad-cv',allPitches,games,true));
  requestAnimationFrame(()=>_cmdDrawMissChart('cmd-miss-lhh',allPitches.filter(p=>p.bHand==='L'),games,true));
  requestAnimationFrame(()=>_cmdDrawMissChart('cmd-miss-rhh',allPitches.filter(p=>p.bHand==='R'),games,true));
}

function _cmdSetPitcher(id,e){ _cmdPitcher=id; renderCommand(); }

function _cmdSectionHead(title){ return `<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">${title}</div>`; }

const _cmdTolPresets=[
  {label:'Generous', val:0.50},
  {label:'Comfortable', val:0.40},
  {label:'Standard', val:0.33},
  {label:'Firm', val:0.25},
  {label:'Precise', val:0.20},
];
function _cmdTolSection(curTol){
  return `<div style="padding:0 16px;margin-bottom:18px;">
    ${_cmdSectionHead('Hit Spot Tolerance')}
    <div style="display:flex;gap:6px;">
      ${_cmdTolPresets.map(p=>{
        const active=Math.abs(curTol-p.val)<0.005;
        return `<button onclick="_cmdSetTol(${p.val})" style="flex:1;padding:9px 2px;border-radius:var(--rsm);border:1.5px solid ${active?'var(--accent)':'var(--border)'};background:${active?'var(--accent)':'var(--bg3)'};color:${active?'#fff':'var(--text2)'};font-size:11px;font-weight:700;cursor:pointer;">${p.label}</button>`;
      }).join('')}
    </div>
  </div>`;
}
function _cmdSetTol(val){
  S.settings.hitSpotTolerance=val;
  save();
  renderCommand();
}

// ── Miss direction quadrant ──────────────────────────
function _cmdQuadSection(pitches,games){
  return `<div style="padding:0 16px;margin-bottom:18px;">
    ${_cmdSectionHead('Miss Direction')}
    <canvas id="cmd-quad-cv" width="300" height="300" style="display:block;width:100%;aspect-ratio:1/1;border-radius:var(--rsm);"></canvas>
    <div style="font-size:10px;color:var(--text3);text-align:center;margin-top:5px;letter-spacing:0.3px;">Pitcher's perspective — all charts</div>
  </div>`;
}

function _cmdDrawQuad(pitches,games){
  const cv=document.getElementById('cmd-quad-cv');
  if(!cv)return;
  const W=cv.width,H=cv.height;
  const ctx=cv.getContext('2d');
  ctx.clearRect(0,0,W,H);
  const cx=W/2,cy=H/2;

  // dark background
  ctx.fillStyle='rgba(10,12,20,0.97)'; ctx.fillRect(0,0,W,H);

  // pitcher hand majority
  const rPitches=pitches.filter(p=>{
    const g=games.find(gm=>(gm.pitches||[]).some(q=>q.id===p.id));
    const app=(g?.pitchers||[]).find(a=>a.appId===p.appId);
    return app?.throws!=='L';
  });
  const pHand=rPitches.length>=(pitches.length-rPitches.length)?'R':'L';

  function getVec(p){
    const g=games.find(gm=>(gm.pitches||[]).some(q=>q.id===p.id));
    const app=(g?.pitchers||[]).find(a=>a.appId===p.appId);
    const throws=app?.throws||'R';
    const rawDx=p.zx-p.izx, rawDy=p.zy-p.izy;
    return{dx:throws==='L'?-rawDx:rawDx, dy:rawDy};
  }

  // label margins — axes stop here, labels live in this band
  const mT=22,mB=22,mL=32,mR=32;
  const scale=Math.min(cx-mL,cy-mT)-4;

  // hit spot tolerance ring — the only reference that matters
  const tol=_hitSpotTolerance();
  const tolR=tol*scale;
  ctx.beginPath(); ctx.arc(cx,cy,tolR,0,Math.PI*2);
  ctx.strokeStyle='rgba(255,255,255,0.45)'; ctx.lineWidth=1;
  ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.font='bold 9px -apple-system';
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText('Hit Spot',cx,cy-tolR-3);
  // axes — start at margin boundary, never enter label zone
  ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cx,mT); ctx.lineTo(cx,H-mB); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mL,cy); ctx.lineTo(W-mR,cy); ctx.stroke();

  // labels outside the axis lines in the margin band
  ctx.fillStyle='rgba(255,255,255,0.48)'; ctx.font='bold 10px -apple-system';
  ctx.textAlign='center';
  ctx.textBaseline='top';    ctx.fillText('HIGH',cx,4);
  ctx.textBaseline='bottom'; ctx.fillText('LOW',cx,H-4);
  ctx.textAlign='left';  ctx.textBaseline='middle'; ctx.fillText(pHand==='R'?'ARM':'GLOVE',4,cy);
  ctx.textAlign='right'; ctx.fillText(pHand==='R'?'GLOVE':'ARM',W-4,cy);

  // dots
  pitches.forEach(p=>{
    const{dx,dy}=getVec(p);
    const px=cx+dx*scale, py=cy-dy*scale;
    ctx.beginPath(); ctx.arc(px,py,3.5,0,Math.PI*2);
    ctx.fillStyle=_ptFamilyColor(p.pt)+'bb'; ctx.fill();
  });

  // small center crosshair
  ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cx-5,cy); ctx.lineTo(cx+5,cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,cy-5); ctx.lineTo(cx,cy+5); ctx.stroke();
}

// ── Miss direction split (vs LHH / vs RHH, pitcher's perspective) ──
function _cmdMissSplitSection(pitches,games){
  const lhhN=pitches.filter(p=>p.bHand==='L').length;
  const rhhN=pitches.filter(p=>p.bHand==='R').length;
  return `<div style="padding:0 16px;margin-bottom:18px;">
    ${_cmdSectionHead('Miss Direction — vs LHH / RHH')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div>
        <div style="font-size:10px;color:var(--text3);text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">vs LHH (${lhhN})</div>
        <canvas id="cmd-miss-lhh" width="200" height="200" style="display:block;width:100%;aspect-ratio:1/1;border-radius:var(--rsm);"></canvas>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">vs RHH (${rhhN})</div>
        <canvas id="cmd-miss-rhh" width="200" height="200" style="display:block;width:100%;aspect-ratio:1/1;border-radius:var(--rsm);"></canvas>
      </div>
    </div>
  </div>`;
}

function _cmdDrawMissChart(id,pitches,games,pitcherView){
  const cv=document.getElementById(id); if(!cv)return;
  const W=cv.width,H=cv.height;
  const ctx=cv.getContext('2d');
  ctx.clearRect(0,0,W,H);
  const cx=W/2,cy=H/2;

  ctx.fillStyle='rgba(10,12,20,0.97)'; ctx.fillRect(0,0,W,H);

  const rPitches=pitches.filter(p=>{
    const g=games.find(gm=>(gm.pitches||[]).some(q=>q.id===p.id));
    const app=(g?.pitchers||[]).find(a=>a.appId===p.appId);
    return app?.throws!=='L';
  });
  const pHand=rPitches.length>=(pitches.length-rPitches.length)?'R':'L';

  function getVec(p){
    const g=games.find(gm=>(gm.pitches||[]).some(q=>q.id===p.id));
    const app=(g?.pitchers||[]).find(a=>a.appId===p.appId);
    const throws=app?.throws||'R';
    const rawDx=p.zx-p.izx, rawDy=p.zy-p.izy;
    let dx=throws==='L'?-rawDx:rawDx;
    if(pitcherView) dx=-dx;
    return{dx,dy:rawDy};
  }

  const mT=22,mB=22,mL=32,mR=32;
  const scale=Math.min(cx-mL,cy-mT)-4;

  // hit spot ring
  const tol=_hitSpotTolerance();
  const tolR=tol*scale;
  ctx.beginPath(); ctx.arc(cx,cy,tolR,0,Math.PI*2);
  ctx.strokeStyle='rgba(255,255,255,0.45)'; ctx.lineWidth=1;
  ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.font='bold 9px -apple-system';
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText('Hit Spot',cx,cy-tolR-3);

  // axes
  ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cx,mT); ctx.lineTo(cx,H-mB); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mL,cy); ctx.lineTo(W-mR,cy); ctx.stroke();

  // labels — pitcherView swaps ARM/GLOVE sides
  const leftLabel =pitcherView?(pHand==='R'?'GLOVE':'ARM'):(pHand==='R'?'ARM':'GLOVE');
  const rightLabel=pitcherView?(pHand==='R'?'ARM':'GLOVE'):(pHand==='R'?'GLOVE':'ARM');
  ctx.fillStyle='rgba(255,255,255,0.48)'; ctx.font='bold 10px -apple-system';
  ctx.textAlign='center';
  ctx.textBaseline='top';    ctx.fillText('HIGH',cx,4);
  ctx.textBaseline='bottom'; ctx.fillText('LOW',cx,H-4);
  ctx.textAlign='left';  ctx.textBaseline='middle'; ctx.fillText(leftLabel,4,cy);
  ctx.textAlign='right';                             ctx.fillText(rightLabel,W-4,cy);

  if(!pitches.length){
    ctx.fillStyle='rgba(255,255,255,0.22)';
    ctx.font=`${Math.round(W*0.07)}px -apple-system`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('No data',W/2,H/2+20);
    return;
  }

  pitches.forEach(p=>{
    const{dx,dy}=getVec(p);
    const px=cx+dx*scale, py=cy-dy*scale;
    ctx.beginPath(); ctx.arc(px,py,3.5,0,Math.PI*2);
    ctx.fillStyle=_ptFamilyColor(p.pt)+'bb'; ctx.fill();
  });

  // center crosshair
  ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cx-5,cy); ctx.lineTo(cx+5,cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,cy-5); ctx.lineTo(cx,cy+5); ctx.stroke();
}

// ── Zone charts (All / vs LHH / vs RHH) — kept for reference ───────────────
function _cmdZoneSection(pitches,games){
  const lhhN=pitches.filter(p=>p.bHand==='L').length;
  const rhhN=pitches.filter(p=>p.bHand==='R').length;
  const labels=[`All (${pitches.length})`,`LHH (${lhhN})`,`RHH (${rhhN})`];
  const ids=['cmd-zone-all','cmd-zone-lhh','cmd-zone-rhh'];
  const hand=[null,'L','R'];
  const which=['all','lhh','rhh'];
  const charts=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
    ${ids.map((id,i)=>`<div onclick="showCmdZoneModal('${which[i]}')" style="cursor:pointer;">
      <div style="font-size:10px;color:var(--text3);margin-bottom:4px;text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">${labels[i]}</div>
      <canvas id="${id}" width="240" height="264" data-hand="${hand[i]||''}" style="display:block;width:100%;aspect-ratio:240/264;border-radius:var(--rsm);"></canvas>
    </div>`).join('')}
  </div>`;
  return `<div style="padding:0 16px;margin-bottom:18px;">${_cmdSectionHead('Zone — Actual vs. Intended')}${charts}</div>`;
}

function showCmdZoneModal(which){
  const all=_cmdCachedPitches;
  const ps=which==='lhh'?all.filter(p=>p.bHand==='L'):which==='rhh'?all.filter(p=>p.bHand==='R'):all;
  const title=which==='lhh'?'Zone — vs LHH':which==='rhh'?'Zone — vs RHH':'Zone — All Pitches';
  const handAttr=which==='lhh'?'L':which==='rhh'?'R':'';
  showModal(title,`<canvas id="cmd-zone-modal-cv" width="320" height="352" data-hand="${handAttr}" style="display:block;width:100%;aspect-ratio:320/352;border-radius:var(--rsm);"></canvas>`);
  requestAnimationFrame(()=>_cmdDrawZoneCanvas('cmd-zone-modal-cv',ps));
}

function _cmdDrawAllZones(pitches,games){
  _cmdDrawZoneCanvas('cmd-zone-all',pitches);
  _cmdDrawZoneCanvas('cmd-zone-lhh',pitches.filter(p=>p.bHand==='L'));
  _cmdDrawZoneCanvas('cmd-zone-rhh',pitches.filter(p=>p.bHand==='R'));
}

function _cmdDrawZoneCanvas(id,pitches){
  const cv=document.getElementById(id);
  if(!cv)return;
  const W=cv.width,H=cv.height;
  const ctx=cv.getContext('2d');
  ctx.clearRect(0,0,W,H);

  // dark background matching the main game zone canvas
  ctx.fillStyle='rgba(10,12,20,0.97)'; ctx.fillRect(0,0,W,H);

  const cw=W/5,ch=H/5;
  const szX=cw,szY=ch,szW=cw*3,szH=ch*3;

  // outer 5×5 grid — subtle
  ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=0.7;
  for(let i=1;i<5;i++){
    ctx.beginPath(); ctx.moveTo(i*cw,0); ctx.lineTo(i*cw,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i*ch); ctx.lineTo(W,i*ch); ctx.stroke();
  }

  // strike zone tint
  ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(szX,szY,szW,szH);

  // strike zone border — bright and unmistakable
  ctx.strokeStyle='rgba(255,255,255,0.82)'; ctx.lineWidth=2;
  ctx.strokeRect(szX,szY,szW,szH);

  // inner 3×3 grid
  ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=0.7;
  for(let i=1;i<3;i++){
    const x=szX+szW/3*i; ctx.beginPath(); ctx.moveTo(x,szY); ctx.lineTo(x,szY+szH); ctx.stroke();
    const y=szY+szH/3*i; ctx.beginPath(); ctx.moveTo(szX,y); ctx.lineTo(szX+szW,y); ctx.stroke();
  }

  // home plate pentagon
  const hpX=W/2,hpY=szY+szH+ch*0.44,hpW=cw*0.85,hpH=ch*0.36;
  ctx.beginPath();
  ctx.moveTo(hpX-hpW/2,hpY-hpH/2); ctx.lineTo(hpX+hpW/2,hpY-hpH/2);
  ctx.lineTo(hpX+hpW/2,hpY); ctx.lineTo(hpX,hpY+hpH/2); ctx.lineTo(hpX-hpW/2,hpY);
  ctx.closePath();
  ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.50)'; ctx.lineWidth=1; ctx.stroke();

  // batter stance indicator (L or R) for per-hand canvases
  const hand=cv.dataset.hand;
  if(hand){
    const bxW=cw*0.9,bxH=szH*0.72,bxY=szY+szH*0.14;
    const bxX=hand==='L'?szX+szW:szX-bxW; // L batter = left side of plate = catcher's right
    ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=0.8; ctx.setLineDash([3,3]);
    ctx.strokeRect(bxX,bxY,bxW,bxH);
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,255,255,0.20)';
    ctx.font=`bold ${Math.round(cw*0.55)}px -apple-system`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(hand,bxX+bxW/2,bxY+bxH/2);
  }

  // no-data state — still show the zone, just add label
  if(!pitches.length){
    ctx.fillStyle='rgba(255,255,255,0.22)';
    ctx.font=`${Math.round(W*0.07)}px -apple-system`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('No data',W/2,H*0.88);
    return;
  }

  pitches.forEach(p=>{
    if(p.zx==null) return;
    const ax=p.zx*W,ay=p.zy*H;
    const col=_ptFamilyColor(p.pt);
    if(p.izx!=null){
      const ix=p.izx*W,iy=p.izy*H;
      if(Math.hypot(ax-ix,ay-iy)>2){
        ctx.beginPath(); ctx.moveTo(ix,iy); ctx.lineTo(ax,ay);
        ctx.strokeStyle=col+'50'; ctx.lineWidth=0.9; ctx.stroke();
      }
      ctx.save(); ctx.setLineDash([2,2]);
      ctx.beginPath(); ctx.arc(ix,iy,4,0,Math.PI*2);
      ctx.strokeStyle=col; ctx.lineWidth=1.2; ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(ax,ay,4,0,Math.PI*2);
    ctx.fillStyle=col+'cc'; ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=0.7;
    ctx.fill(); ctx.stroke();
  });
}

// ── By pitch type ────────────────────────────────────
function _cmdByPitchType(pitches,tol){
  const byPT={};
  pitches.forEach(p=>{ if(!byPT[p.pt])byPT[p.pt]=[]; byPT[p.pt].push(p); });
  const rows=Object.entries(byPT).sort((a,b)=>b[1].length-a[1].length).map(([pt,ps])=>{
    const pct=_cmdHitSpotPct(ps,tol);
    const dist=(ps.reduce((s,p)=>s+Math.hypot(p.zx-p.izx,p.zy-p.izy),0)/ps.length).toFixed(2);
    const bar=`<div style="height:4px;border-radius:2px;background:var(--bg2);margin-top:3px;"><div style="height:4px;border-radius:2px;background:${_ptFamilyColor(pt)};width:${pct}%;"></div></div>`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
      <span style="width:28px;font-size:11px;font-weight:700;color:${_ptFamilyColor(pt)};">${pt}</span>
      <div style="flex:1;">${bar}</div>
      <span style="font-size:12px;font-weight:700;color:var(--text);width:36px;text-align:right;">${pct}%</span>
      <span style="font-size:10px;color:var(--text3);width:46px;text-align:right;">${dist}u · ${ps.length}p</span>
    </div>`;
  }).join('');
  return `<div style="padding:0 16px;margin-bottom:18px;">${_cmdSectionHead('By Pitch Type')}<div style="background:var(--bg3);border-radius:var(--rsm);padding:4px 12px;">${rows||'<div style="padding:12px 0;color:var(--text3);font-size:13px;">No data</div>'}</div></div>`;
}

// ── Command over time ────────────────────────────────
function _cmdOverTime(pitches,tol){
  // By inning
  const byInn={};
  pitches.forEach(p=>{
    const k=p.inning||1;
    if(!byInn[k])byInn[k]=[]; byInn[k].push(p);
  });
  const innRows=Object.entries(byInn).sort((a,b)=>+a[0]-+b[0]).map(([inn,ps])=>{
    const pct=_cmdHitSpotPct(ps,tol);
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:11px;color:var(--text3);width:40px;">Inn ${inn}</span>
      <div style="flex:1;height:4px;border-radius:2px;background:var(--bg2);"><div style="height:4px;border-radius:2px;background:var(--accent);width:${pct}%;"></div></div>
      <span style="font-size:12px;font-weight:700;color:var(--text);width:36px;text-align:right;">${pct}%</span>
      <span style="font-size:10px;color:var(--text3);width:20px;text-align:right;">${ps.length}p</span>
    </div>`;
  }).join('');

  // By pitch count stage
  const stages=[['Early (1–30)',p=>p.abPitchNum<=30],['Middle (31–60)',p=>p.abPitchNum>30&&p.abPitchNum<=60],['Late (61+)',p=>p.abPitchNum>60]];
  const stageRows=stages.map(([lbl,fn])=>{
    const ps=pitches.filter(fn);
    if(!ps.length) return '';
    const pct=_cmdHitSpotPct(ps,tol);
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:11px;color:var(--text3);width:90px;">${lbl}</span>
      <div style="flex:1;height:4px;border-radius:2px;background:var(--bg2);"><div style="height:4px;border-radius:2px;background:var(--accent);width:${pct}%;"></div></div>
      <span style="font-size:12px;font-weight:700;color:var(--text);width:36px;text-align:right;">${pct}%</span>
      <span style="font-size:10px;color:var(--text3);width:20px;text-align:right;">${ps.length}p</span>
    </div>`;
  }).join('');

  return `<div style="padding:0 16px;margin-bottom:18px;">
    ${_cmdSectionHead('Command Over Time — By Inning')}
    <div style="background:var(--bg3);border-radius:var(--rsm);padding:4px 12px;margin-bottom:14px;">${innRows||'<div style="padding:12px 0;color:var(--text3);font-size:13px;">No data</div>'}</div>
    ${_cmdSectionHead('Command Over Time — Pitch Count Stage')}
    <div style="background:var(--bg3);border-radius:var(--rsm);padding:4px 12px;">${stageRows||'<div style="padding:12px 0;color:var(--text3);font-size:13px;">No data</div>'}</div>
  </div>`;
}

function showStatDrill(pitcherName, statId){
  const games=_stGetGames();
  let allPitches;
  if(pitcherName==='_all'){
    allPitches=games.flatMap(g=>g.pitches||[]);
  } else {
    const pitcherAppIds=new Set();
    games.forEach(g=>(g.pitchers||[]).forEach(gp=>{ if(gp.name===pitcherName) pitcherAppIds.add(gp.appId); }));
    allPitches=games.flatMap(g=>(g.pitches||[]).filter(p=>pitcherAppIds.has(p.appId)));
  }
  const statLabels={k:'Strikeouts',bb:'Walks',h:'Hits',hr:'Home Runs',hbp:'Hit By Pitch'};
  const statLabel=statLabels[statId]||statId;
  const drillTitle=pitcherName==='_all'?`All Pitchers · ${statLabel}`:null;
  let termPs;
  switch(statId){
    case 'k':  termPs=allPitches.filter(p=>p.isTerm&&(p.rt==='k'||p.rt==='kc'||p.rt==='d3k')); break;
    case 'bb': termPs=allPitches.filter(p=>p.isTerm&&(p.rt==='bb'||p.rt==='ibb')); break;
    case 'h':  termPs=allPitches.filter(p=>p.isTerm&&(p.bipOut==='hit'||p.rt==='hr')); break;
    case 'hr': termPs=allPitches.filter(p=>p.isTerm&&p.rt==='hr'); break;
    case 'hbp':termPs=allPitches.filter(p=>p.isTerm&&p.rt==='hbp'); break;
    default:   termPs=[];
  }
  if(!termPs.length){ showModal(statLabel,'<div style="padding:24px;text-align:center;color:var(--text2);">No data available.</div>'); return; }
  const abNums=[...new Set(termPs.map(p=>p.abNum))];
  const abGroups={};
  allPitches.forEach(p=>{ if(abNums.includes(p.abNum)){ if(!abGroups[p.abNum])abGroups[p.abNum]=[]; abGroups[p.abNum].push(p); } });
  const bipPs=['h','hr'].includes(statId)?termPs.filter(p=>p.sx!=null&&p.sy!=null):[];
  const sprayHTML=bipPs.length?`<div style="position:sticky;top:0;z-index:5;background:var(--bg);padding-bottom:10px;margin-bottom:2px;">
    <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${statLabel} — Spray (${bipPs.length}) <span style="font-weight:400;color:var(--text3);font-size:10px;">· tap dot to jump to AB</span></div>
    <canvas id="drill-spray-cv" width="320" height="160" style="display:block;width:100%;aspect-ratio:2/1;border-radius:var(--rsm);background:var(--bg3);cursor:crosshair;" onclick="_drillSprayClick(event)"></canvas>
  </div>`:'';
  const ptCol=pt=>({FB:'#e85555','2S':'#e8a455',SI:'#e8a455',FC:'#f5c842',SL:'#55a8e8',SV:'#558de8',CB:'#5568e8',CH:'#55e8a0',FS:'#55d4e8',FO:'#55e8d4',KN:'#a855e8',EP:'#e855d4',OT:'#9090a8'}[pt]||'#9090a8');
  const rtLbl=p=>({ball:'Ball',strike:'Strike',foul:'Foul',swstr:'Miss',k:'K',kc:'KC',d3k:'K✓',bb:'BB',ibb:'IBB',hbp:'HBP',hr:'HR',bip:'BIP',oob:'OOB',other:'—'}[p.rt]||p.rt||'—');
  const abCards=abNums.sort((a,b)=>a-b).map(abNum=>{
    const abPs=(abGroups[abNum]||[]).sort((a,b)=>a.abPitchNum-b.abPitchNum);
    const inn=abPs[0]?.inning||'?', half=abPs[0]?.half==='top'?'▲':'▼';
    const bName=abPs[0]?.bName||'', bHand=abPs[0]?.bHand||'R';
    const seqV=abPs.map((p,i)=>`<div style="display:flex;align-items:baseline;gap:3px;line-height:1.3;">
      <span style="color:var(--text3);font-size:9px;width:11px;flex-shrink:0;text-align:right;">${i+1}.</span>
      <span style="color:${ptCol(p.pt)};font-weight:700;font-size:10px;flex-shrink:0;">${p.pt||'?'}</span>
      ${p.velo?`<span style="color:var(--text3);font-size:9px;flex-shrink:0;">${p.velo}</span>`:''}
      <span style="color:${p.isTerm?'var(--text)':'var(--text3)'};font-size:10px;white-space:nowrap;">${rtLbl(p)}</span>
    </div>`).join('');
    return `<div id="ab-card-${abNum}" style="flex-shrink:0;width:220px;background:var(--bg3);border-radius:var(--rsm);padding:8px 10px 10px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
        <div style="font-size:11px;font-weight:700;color:var(--text);">${half}${inn} ${bHand}HH${bName?` · <span style="font-size:10px;font-weight:400;color:var(--text2);">${bName}</span>`:''}</div>
        <div style="font-size:10px;color:var(--text3);">${abPs.length}p</div>
      </div>
      <div style="display:flex;flex-direction:row;gap:6px;align-items:flex-start;">
        <canvas id="dz-${abNum}" width="160" height="200" style="display:block;width:104px;height:130px;flex-shrink:0;"></canvas>
        <div style="flex:1;display:flex;flex-direction:column;gap:3px;overflow-y:auto;max-height:130px;padding-top:1px;">${seqV}</div>
      </div>
    </div>`;
  }).join('');
  const cardsWrap=`<div id="ab-cards-row" style="display:flex;flex-direction:row;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:8px;padding-right:4px;">${abCards}</div>`;
  showModal(`<span style="font-size:13px;">${drillTitle||(_pShortName(pitcherName)+' · '+statLabel)} (${termPs.length})</span>`,`${sprayHTML}${cardsWrap}`);
  requestAnimationFrame(()=>{
    if(bipPs.length){
      const cv=document.getElementById('drill-spray-cv');
      if(cv) _renderDrillSpray(cv,bipPs);
    }
    abNums.forEach(abNum=>{
      const cv=document.getElementById(`dz-${abNum}`);
      if(cv) _renderDrillZone(cv,(abGroups[abNum]||[]).sort((a,b)=>a.abPitchNum-b.abPitchNum));
    });
  });
}

function _renderDrillSpray(cv,pitches){
  const W=cv.width, H=cv.height;
  const ctx=cv.getContext('2d');
  ctx.clearRect(0,0,W,H);
  _drillSprayDots=[];
  if(fieldImg&&fieldImg.complete&&fieldImg.width){
    const scale=Math.min(W/fieldImg.width,H/fieldImg.height);
    const dw=fieldImg.width*scale, dh=fieldImg.height*scale;
    const bx=(W-dw)/2, by=(H-dh)/2;
    ctx.drawImage(fieldImg,bx,by,dw,dh);
    pitches.forEach(p=>{
      const x=bx+p.sx*dw, y=by+p.sy*dh;
      const isHR=p.rt==='hr';
      let col=p.bipType==='GB'?'#4a9eff':p.bipType==='LD'?'#f0873a':(p.bipType==='FLY'||isHR)?'#e85555':'#9090a8';
      ctx.beginPath(); ctx.arc(x,y,isHR?6:4,0,Math.PI*2);
      ctx.fillStyle=col; ctx.strokeStyle=isHR?'#f5c842':'rgba(0,0,0,0.5)'; ctx.lineWidth=isHR?2:1.2;
      ctx.fill(); ctx.stroke();
      if(isHR){ ctx.fillStyle='#f5c842'; ctx.font='bold 6px -apple-system'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('HR',x,y); }
      _drillSprayDots.push({cx:x,cy:y,abNum:p.abNum});
    });
  }
}
function _drillSprayClick(e){
  const cv=e.currentTarget;
  const rect=cv.getBoundingClientRect();
  const mx=(e.clientX-rect.left)*(cv.width/rect.width);
  const my=(e.clientY-rect.top)*(cv.height/rect.height);
  let best=null,bestDist=Infinity;
  _drillSprayDots.forEach(d=>{
    const dist=Math.hypot(d.cx-mx,d.cy-my);
    if(dist<bestDist){bestDist=dist;best=d;}
  });
  if(!best||bestDist>28)return;
  // highlight selected dot
  const ctx=cv.getContext('2d');
  ctx.beginPath(); ctx.arc(best.cx,best.cy,10,0,Math.PI*2);
  ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
  // highlight card
  document.querySelectorAll('[id^="ab-card-"]').forEach(c=>c.style.outline='');
  const card=document.getElementById('ab-card-'+best.abNum);
  if(card) card.style.outline='2px solid var(--accent)';
  // scroll to card
  const row=document.getElementById('ab-cards-row');
  if(row&&card) row.scrollTo({left:card.offsetLeft-row.offsetLeft,behavior:'smooth'});
}

function _renderDrillZone(cv,pitches){
  const W=cv.width, H=cv.height;
  const ctx=cv.getContext('2d');
  ctx.clearRect(0,0,W,H);
  const szX=W*0.2, szY=8, szW=W*0.6, szH=H*0.72;
  ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1.5; ctx.strokeRect(szX,szY,szW,szH);
  ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=0.8;
  [1,2].forEach(i=>{
    const x=szX+szW/3*i; ctx.beginPath(); ctx.moveTo(x,szY); ctx.lineTo(x,szY+szH); ctx.stroke();
    const y=szY+szH/3*i; ctx.beginPath(); ctx.moveTo(szX,y); ctx.lineTo(szX+szW,y); ctx.stroke();
  });
  const px=W/2, py=szY+szH+10;
  ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2); ctx.fill();
  const ptCol=pt=>({FB:'#e85555','2S':'#e8a455',SI:'#e8a455',FC:'#f5c842',SL:'#55a8e8',SV:'#558de8',CB:'#5568e8',CH:'#55e8a0',FS:'#55d4e8',FO:'#55e8d4',KN:'#a855e8',EP:'#e855d4',OT:'#9090a8'}[pt]||'#9090a8');
  pitches.forEach((p,i)=>{
    if(p.zx==null||p.zy==null) return;
    const x=szX+p.zx*szW, y=szY+p.zy*szH;
    const col=ptCol(p.pt);
    ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2);
    ctx.fillStyle=p.isTerm?col:col+'55'; ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=0.8;
    ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='bold 7px -apple-system';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(i+1,x,y);
  });
}

// ══════════════════════════════════════════
// PITCH VIEW (Pieces 1 + 2)
// ══════════════════════════════════════════
let _pvCellMode=false;
let _pvPT='all', _pvB='all', _pvS='all', _pvCountKey='all';
let _pvFilter={result:'all',hand:'both',sit:'all',trip:'all',inning:'all',zone:'all',bipZone:'all'};

function showPitchView(pt,b,s){
  hideModal();
  _pvCellMode=true;
  _pvPT=pt; _pvB=b; _pvS=s; _pvCountKey=`${b}-${s}`;
  _pvFilter={result:'all',hand:'both',sit:'all',trip:'all',inning:'all',zone:'all',bipZone:'all'};
  go('pitchview');
  requestAnimationFrame(renderPitchView);
}
function showBrowsePitches(){
  _pvCellMode=false;
  _pvPT='all'; _pvB='all'; _pvS='all'; _pvCountKey='all';
  _pvFilter={result:'all',hand:'both',sit:'all',trip:'all',inning:'all',zone:'all',bipZone:'all'};
  go('pitchview');
  requestAnimationFrame(renderPitchView);
}
function pvBack(){ go('analytics'); }
function setPVFilter(k,v){ _pvFilter[k]=v; renderPitchView(); }
function setPVType(pt){ _pvPT=pt; renderPitchView(); }
function setPVCount(v){
  _pvCountKey=v;
  if(v==='all'){_pvB='all';_pvS='all';}
  else{const p=v.split('-');_pvB=Number(p[0]);_pvS=Number(p[1]);}
  renderPitchView();
}

function _pvGetPitches(){
  let pitches=_anGetPitches();
  // Apply main _anFilter (except zone/bipZone which are local to _pvFilter)
  const _pv_appIdName={};
  if(_anFilter.pitcher.length) S.games.forEach(g=>(g.pitchers||[]).forEach(gp=>{_pv_appIdName[gp.appId]=gp.name;}));
  pitches=pitches.filter(p=>{
    if(_anFilter.pitcher.length&&!_anFilter.pitcher.includes(_pv_appIdName[p.appId])) return false;
    if(_anFilter.hand==='L'&&p.bHand!=='L') return false;
    if(_anFilter.hand==='R'&&p.bHand!=='R') return false;
    if(_anFilter.sit==='risp'&&!p.runners?.b2&&!p.runners?.b3) return false;
    if(_anFilter.sit==='2out'&&p.outsBefore!==2) return false;
    if(_anFilter.trip!=='all'&&_anTripNum(p)!==parseInt(_anFilter.trip)) return false;
    if(_anFilter.loc==='home'&&p.ha!=='home') return false;
    if(_anFilter.loc==='away'&&p.ha!=='away') return false;
    return true;
  });
  if(_pvPT&&_pvPT!=='all') pitches=pitches.filter(p=>p.pt===_pvPT);
  if(_pvB!=='all') pitches=pitches.filter(p=>p.ballsBefore===Number(_pvB));
  if(_pvS!=='all') pitches=pitches.filter(p=>p.strikesBefore===Number(_pvS));
  return _pvApplyFilter(pitches);
}

function _pvApplyFilter(pitches){
  return pitches.filter(p=>{
    const r=_pvFilter.result;
    if(r==='hits'&&!(p.bipOut==='hit'||p.rt==='hr')) return false;
    if(r==='outs'&&!(p.bipOut==='out'||p.bipOut==='sac')) return false;
    if(r==='ks'&&!(p.rt==='k'||p.rt==='kc'||p.rt==='d3k')) return false;
    if(r==='walks'&&!(p.rt==='bb'||p.rt==='ibb')) return false;
    if(r==='barrels'&&!(p.hh&&(p.bipType==='LD'||p.bipType==='FLY'))) return false;
    if(_pvFilter.hand==='L'&&p.bHand!=='L') return false;
    if(_pvFilter.hand==='R'&&p.bHand!=='R') return false;
    const sit=_pvFilter.sit;
    if(sit==='risp'&&!p.runners?.b2&&!p.runners?.b3) return false;
    if(sit==='2out'&&p.outsBefore!==2) return false;
    if(_pvFilter.trip!=='all'&&_anTripNum(p)!==parseInt(_pvFilter.trip)) return false;
    const inn=_pvFilter.inning;
    if(inn==='early'&&(p.inning||1)>3) return false;
    if(inn==='mid'&&!((p.inning||1)>=4&&(p.inning||1)<=6)) return false;
    if(inn==='late'&&(p.inning||1)<7) return false;
    if(_pvFilter.zone&&_pvFilter.zone!=='all'){
      if(p.zx==null||p.zy==null) return false;
      if(!AN_ZONE_REGIONS[_pvFilter.zone]?.includes(getZoneNum(p.zx,p.zy))) return false;
    }
    if(_pvFilter.bipZone&&_pvFilter.bipZone!=='all'){
      if(p.sx==null||p.sy==null) return false;
      if(!FZ_REGIONS[_pvFilter.bipZone]?.includes(getFieldZone(p.sx,p.sy))) return false;
    }
    return true;
  });
}

function _pvChips(){
  const b=(label,onclick,active)=>`<button onclick="${onclick}" style="padding:4px 9px;font-size:11px;font-weight:700;background:${active?'var(--accent)':'none'};color:${active?'#fff':'var(--text2)'};border:none;border-radius:4px;cursor:pointer;white-space:nowrap;">${label}</button>`;
  const g=(lbl,...btns)=>`<div style="display:flex;gap:3px;background:var(--bg3);border-radius:var(--rsm);padding:3px;align-items:center;flex-wrap:wrap;">${lbl?`<span style="font-size:10px;font-weight:700;color:var(--text3);padding:0 4px 0 2px;">${lbl}</span>`:''}${btns.join('')}</div>`;
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;padding:10px 12px 0;">
    ${g('',b('All',"setPVFilter('result','all')",_pvFilter.result==='all'),b('Hits',"setPVFilter('result','hits')",_pvFilter.result==='hits'),b('Outs',"setPVFilter('result','outs')",_pvFilter.result==='outs'),b('Ks',"setPVFilter('result','ks')",_pvFilter.result==='ks'),b('Walks',"setPVFilter('result','walks')",_pvFilter.result==='walks'),b('Barrels',"setPVFilter('result','barrels')",_pvFilter.result==='barrels'))}
    ${g('H',b('Both',"setPVFilter('hand','both')",_pvFilter.hand==='both'),b('LHH',"setPVFilter('hand','L')",_pvFilter.hand==='L'),b('RHH',"setPVFilter('hand','R')",_pvFilter.hand==='R'))}
    ${g('Sit',b('All',"setPVFilter('sit','all')",_pvFilter.sit==='all'),b('RISP',"setPVFilter('sit','risp')",_pvFilter.sit==='risp'),b('2-Out',"setPVFilter('sit','2out')",_pvFilter.sit==='2out'))}
    ${g('Trip',b('All',"setPVFilter('trip','all')",_pvFilter.trip==='all'),b('1st',"setPVFilter('trip','1')",_pvFilter.trip==='1'),b('2nd',"setPVFilter('trip','2')",_pvFilter.trip==='2'),b('3rd',"setPVFilter('trip','3')",_pvFilter.trip==='3'),b('4th',"setPVFilter('trip','4')",_pvFilter.trip==='4'),b('5th',"setPVFilter('trip','5')",_pvFilter.trip==='5'))}
    ${g('Inn',b('All',"setPVFilter('inning','all')",_pvFilter.inning==='all'),b('Early',"setPVFilter('inning','early')",_pvFilter.inning==='early'),b('Mid',"setPVFilter('inning','mid')",_pvFilter.inning==='mid'),b('Late',"setPVFilter('inning','late')",_pvFilter.inning==='late'))}
    ${g('Zone',b('All',"setPVFilter('zone','all')",_pvFilter.zone==='all'),b('Up',"setPVFilter('zone','up')",_pvFilter.zone==='up'),b('Mid',"setPVFilter('zone','mid')",_pvFilter.zone==='mid'),b('Dn',"setPVFilter('zone','down')",_pvFilter.zone==='down'),b('In',"setPVFilter('zone','in')",_pvFilter.zone==='in'),b('Away',"setPVFilter('zone','away')",_pvFilter.zone==='away'),b('Shad',"setPVFilter('zone','shadow')",_pvFilter.zone==='shadow'),b('♥',"setPVFilter('zone','heart')",_pvFilter.zone==='heart'))}
    ${g('Field',b('All',"setPVFilter('bipZone','all')",_pvFilter.bipZone==='all'),b('IF',"setPVFilter('bipZone','if')",_pvFilter.bipZone==='if'),b('OF',"setPVFilter('bipZone','of')",_pvFilter.bipZone==='of'),b('L',"setPVFilter('bipZone','l')",_pvFilter.bipZone==='l'),b('LC',"setPVFilter('bipZone','lc')",_pvFilter.bipZone==='lc'),b('C',"setPVFilter('bipZone','c')",_pvFilter.bipZone==='c'),b('RC',"setPVFilter('bipZone','rc')",_pvFilter.bipZone==='rc'),b('R',"setPVFilter('bipZone','r')",_pvFilter.bipZone==='r'),b('Foul',"setPVFilter('bipZone','foul')",_pvFilter.bipZone==='foul'))}
  </div>`;
}

function renderPitchView(){
  const pitches=_pvGetPitches();
  const bip=pitches.filter(p=>p.sx!=null&&p.sy!=null&&(p.rt==='bip'||p.rt==='hr'));
  const withLoc=pitches.filter(p=>p.zx!=null&&p.zy!=null);

  // Nav title
  let titleParts=[];
  if(_pvCellMode){
    titleParts.push(AN_PT_NAMES[_pvPT]||_pvPT);
    titleParts.push(`${_pvB}-${_pvS}`);
  } else {
    titleParts.push(_pvPT&&_pvPT!=='all'?(AN_PT_NAMES[_pvPT]||_pvPT):'All pitches');
    if(_pvCountKey!=='all') titleParts.push(_pvCountKey+' count');
  }
  document.getElementById('pv-nav-title').textContent=titleParts.join(' · ');

  // Browse-mode selectors
  let browseHTML='';
  if(!_pvCellMode){
    const rawPitches=_anGetPitches();
    const ptPresent=['all',...AN_PT_ORDER.filter(pt=>rawPitches.some(p=>p.pt===pt))];
    const b2=(label,onclick,active)=>`<button onclick="${onclick}" style="padding:5px 10px;font-size:11px;font-weight:700;border-radius:20px;border:1.5px solid ${active?'var(--accent)':'var(--border2)'};background:${active?'var(--accent)':'var(--bg3)'};color:${active?'#fff':'var(--text2)'};cursor:pointer;white-space:nowrap;">${label}</button>`;
    browseHTML=`<div style="padding:10px 12px 0;">
      <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Pitch Type</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;">
        ${ptPresent.map(pt=>b2(pt==='all'?'All':pt,`setPVType('${pt}')`,_pvPT===pt)).join('')}
      </div>
      <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Count</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:4px;">
        ${[['all','All'],...AN_COUNTS.map(({b,s})=>[`${b}-${s}`,`${b}-${s}`])].map(([v,l])=>b2(l,`setPVCount('${v}')`,_pvCountKey===v)).join('')}
      </div>
    </div>`;
  }

  const rLabels={all:'All results',hits:'Hits only',outs:'Outs only',ks:'Strikeouts',walks:'Walks',barrels:'Barrels'};
  const zLabels={all:'',up:' · Up',mid:' · Middle',down:' · Down',in:' · In',away:' · Away',shadow:' · Shadow',heart:' · Heart'};
  const subtitle=`${_pvFilter.result!=='all'?rLabels[_pvFilter.result]+' · ':''}${pitches.length} pitches${zLabels[_pvFilter.zone]||''}`;

  document.getElementById('pv-body').innerHTML=`
    ${browseHTML}
    ${_pvChips()}
    <div style="padding:6px 12px 10px;font-size:11px;color:var(--text3);">${subtitle}</div>
    <div style="padding:0 12px 8px;">
      <div style="font-size:11px;color:var(--text2);font-weight:600;margin-bottom:6px;">Spray Chart · ${bip.length} balls in play</div>
      <div style="position:relative;width:100%;aspect-ratio:2/1;">
        <canvas id="pv-spray-cv" style="position:absolute;inset:0;width:100%;height:100%;display:block;cursor:pointer;border-radius:var(--rsm);background:rgba(255,255,255,0.02);"></canvas>
      </div>
    </div>
    <div style="padding:0 12px 16px;">
      <div style="font-size:11px;color:var(--text2);font-weight:600;margin-bottom:6px;">Zone Map · ${withLoc.length} pitches with location</div>
      <div style="display:flex;justify-content:center;">
        <canvas id="pv-zone-cv" width="220" height="220" style="display:block;cursor:pointer;border-radius:var(--rsm);"></canvas>
      </div>
      <div style="margin-top:8px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        ${[['#e85555','FB/2S/SI/FC'],['#4a9eff','SL/SV/CB'],['#4caf7d','CH/FS/FO/KN/EP'],['#9090a8','OT']].map(([col,lbl])=>`<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text3);"><div style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0;"></div>${lbl}</div>`).join('')}
      </div>
    </div>`;

  requestAnimationFrame(()=>{ drawPVSpray(pitches); drawPVZone(pitches); });
}

function _pvPTColor(pt){
  const m={'FB':'#e85555','2S':'#e85555','SI':'#e85555','FC':'#e85555','SL':'#4a9eff','SV':'#4a9eff','CB':'#4a9eff','CH':'#4caf7d','FS':'#4caf7d','FO':'#4caf7d','EP':'#4caf7d','KN':'#4caf7d','OT':'#9090a8'};
  return m[pt]||'#9090a8';
}

function drawPVSpray(pitches){
  const cv=document.getElementById('pv-spray-cv');
  if(!cv) return;
  const dpr=window.devicePixelRatio||1;
  const rect=cv.getBoundingClientRect();
  if(!rect.width){ requestAnimationFrame(()=>drawPVSpray(pitches)); return; }
  cv.width=Math.round(rect.width*dpr);
  cv.height=Math.round(rect.height*dpr);
  const ctx=cv.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=rect.width, H=rect.height;
  drawFieldShape(ctx,W,H);
  const sb=getFieldBounds(W,H);
  drawSprayZoneOverlay(ctx,sb);
  const bip=pitches.filter(p=>p.sx!=null&&p.sy!=null);
  bip.forEach(p=>{
    const x=sb.x+p.sx*sb.w, y=sb.y+p.sy*sb.h;
    const isHR=p.rt==='hr', isHit=p.bipOut==='hit'||isHR;
    const r=isHR?7:5;
    let col='#9090a8';
    if(p.bipType==='GB') col='#4a9eff';
    else if(p.bipType==='LD') col='#f0873a';
    else if(p.bipType==='FLY'||isHR) col='#e85555';
    else if(p.bipType==='PU') col='#9090a8';
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=isHit?col:'transparent';
    ctx.strokeStyle=isHR?'#f5c842':col;
    ctx.lineWidth=p.hh?2.5:1.5;
    if(p.wc) ctx.setLineDash([2,2]); else ctx.setLineDash([]);
    ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    if(isHR){
      ctx.fillStyle='#f5c842'; ctx.font='bold 7px -apple-system';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('HR',x,y);
    }
  });
  cv.onclick=function(e){
    const rc=cv.getBoundingClientRect();
    const mx=e.clientX-rc.left, my=e.clientY-rc.top;
    const sb2=getFieldBounds(rc.width,rc.height);
    let closest=null,minD=Infinity;
    bip.forEach(p=>{
      const dx=sb2.x+p.sx*sb2.w-mx, dy=sb2.y+p.sy*sb2.h-my;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;closest=p;}
    });
    if(closest&&minD<22) showPVPopup(closest);
  };
}

function drawPVZone(pitches){
  const cv=document.getElementById('pv-zone-cv');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  const W=cv.width, H=cv.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(255,255,255,0.03)'; ctx.fillRect(0,0,W,H);
  const cw=W/5, ch=H/5;
  const szX=cw,szY=ch,szW=cw*3,szH=ch*3;
  // Zone fill: always grey-blue on strike zone + shadow; unselected cells fade when filter active
  const az=_pvFilter.zone&&_pvFilter.zone!=='all'?_pvFilter.zone:null;
  if(!az){
    ctx.fillStyle='rgba(67,113,203,0.20)';
    ctx.fillRect(szX,szY,szW,szH);
    getZoneCells('shadow').forEach(({col,row})=>ctx.fillRect(col*cw,row*ch,cw,ch));
  } else {
    ctx.fillStyle='rgba(67,113,203,0.05)';
    for(let r=1;r<=3;r++) for(let c=1;c<=3;c++) ctx.fillRect(c*cw,r*ch,cw,ch);
    getZoneCells('shadow').forEach(({col,row})=>ctx.fillRect(col*cw,row*ch,cw,ch));
    ctx.fillStyle='rgba(67,113,203,0.20)';
    getZoneCells(az).forEach(({col,row})=>ctx.fillRect(col*cw,row*ch,cw,ch));
  }
  // Grid
  ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1;
  for(let i=1;i<5;i++){
    ctx.beginPath();ctx.moveTo(i*cw,0);ctx.lineTo(i*cw,H);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,i*ch);ctx.lineTo(W,i*ch);ctx.stroke();
  }
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=2;
  ctx.strokeRect(szX,szY,szW,szH);
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1;
  for(let i=1;i<3;i++){
    ctx.beginPath();ctx.moveTo(szX+i*(szW/3),szY);ctx.lineTo(szX+i*(szW/3),szY+szH);ctx.stroke();
    ctx.beginPath();ctx.moveTo(szX,szY+i*(szH/3));ctx.lineTo(szX+szW,szY+i*(szH/3));ctx.stroke();
  }
  // Dots
  const withLoc=pitches.filter(p=>p.zx!=null&&p.zy!=null);
  withLoc.forEach(p=>{
    if(az){
      const inZ=AN_ZONE_REGIONS[az]?.includes(getZoneNum(p.zx,p.zy));
      ctx.globalAlpha=inZ?1.0:0.30;
    }
    ctx.fillStyle=_pvPTColor(p.pt);
    ctx.beginPath(); ctx.arc(p.zx*W,p.zy*H,4,0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1.0;
  cv.onclick=function(e){
    const rc=cv.getBoundingClientRect();
    const sx=rc.width/W, sy=rc.height/H;
    const x=(e.clientX-rc.left)/sx, y=(e.clientY-rc.top)/sy;
    let closest=null,minD=Infinity;
    withLoc.forEach(p=>{
      const dx=p.zx*W-x, dy=p.zy*H-y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;closest=p;}
    });
    if(closest&&minD<22) showPVPopup(closest);
  };
}

function showPVPopup(p){
  const ptName=AN_PT_NAMES[p.pt]||p.pt||'—';
  const count=`${p.ballsBefore}-${p.strikesBefore}`;
  const zn=(p.zx!=null&&p.zy!=null)?getZoneNum(p.zx,p.zy):null;
  const znLabel=zn?getZoneLabel(zn):'—';
  const RM={k:'Strikeout',kc:'Called K',d3k:'Dropped 3K',bb:'Walk',ibb:'Int. Walk',hbp:'HBP',
    bip:'In Play',hr:'Home Run',foul:'Foul',ball:'Ball',strike:'Called Strike',swstr:'Swinging Strike'};
  const result=RM[p.rt]||p.rt||'—';
  const bipExtra=(p.rt==='bip'&&p.bipType)?` · ${p.bipType}${p.bipOut?'/'+p.bipOut[0].toUpperCase():''}${p.hh?' 🔥':''}${p.wc?' (weak)':''}`:
    (p.rt==='hr'?' · HR 🔴':'');
  const rParts=[];
  if(p.runners?.b1) rParts.push('1B');
  if(p.runners?.b2) rParts.push('2B');
  if(p.runners?.b3) rParts.push('3B');
  const rStr=rParts.length?rParts.join(', '):'Bases empty';
  const halfStr=p.half==='top'?'Top':'Bot';
  const fzCode=getFieldZone(p.sx,p.sy);
  const fzLabel=fzCode?FZ_LABEL[fzCode]||fzCode:'—';
  showModal(`${ptName} · ${count}`,`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;font-size:13px;">
      <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Result</div><div style="font-weight:700;">${result}${bipExtra}</div></div>
      <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Inning</div><div style="font-weight:700;">${halfStr} ${p.inning||'?'}</div></div>
      <div style="grid-column:1/-1;"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Batter</div><div style="font-weight:700;">${p.bName||'Unknown'} · ${p.bHand||'?'}HH</div></div>
      <div style="grid-column:1/-1;"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Runners on Base</div><div style="font-weight:700;">${rStr}</div></div>
      <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Pitch Zone</div><div style="font-weight:700;">${znLabel}</div></div>
      <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Field Zone</div><div style="font-weight:700;">${fzLabel}</div></div>
      ${p.velo?`<div style="grid-column:1/-1;"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px;">Velocity</div><div style="font-weight:700;">${p.velo} mph</div></div>`:''}
    </div>
  `);
}
