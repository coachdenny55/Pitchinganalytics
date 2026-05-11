// ══════════════════════════════════════════
// MY TEAM
// ══════════════════════════════════════════
function renderMyTeam(){
  document.getElementById('team-name').value=S.team.name||'';
  document.getElementById('level-sel').value=S.team.level||'hs';
  const el=document.getElementById('roster-list');
  if(!S.pitchers.length){ el.innerHTML='<div class="empty" style="padding:20px 0;">No pitchers. Tap + Add.</div>'; return; }
  el.innerHTML=S.pitchers.map((p,i)=>{
    const isL=p.throws==='L';
    const circleColor=isL?'var(--accent)':'var(--red)';
    const circleBg=isL?'rgba(74,158,255,0.18)':'rgba(232,85,85,0.18)';
    const _gradesOn=S.settings.showOutingGrades!==false;
    const gpa=_gradesOn?_seasonGPA(p.name):null;
    return `
    <div class="player-row">
      <div style="width:36px;height:36px;border-radius:50%;background:${circleBg};color:${circleColor};font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${p.throws||'R'}</div>
      <div class="player-info">
        <div style="display:flex;align-items:center;gap:7px;">
          <span class="player-name">#${p.num||'—'} ${p.name}</span>
          ${gpa?_gradeChip(gpa,'font-size:11px;padding:1px 7px;'):''}
        </div>
        ${p.arsenal&&p.arsenal.length?`<div style="font-size:11px;color:var(--text3);margin-top:3px;letter-spacing:0.4px;">${p.arsenal.join(' · ')}</div>`:''}
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">${renderStars(p.rating,i,'myteam')}${gpa?`<span style="font-size:10px;color:var(--text3);">${gpa.score} GPA</span>`:''}</div>
      </div>
      <button class="btn btn-sm" onclick="showEditPitcher(${i})">Edit</button>
    </div>`;
  }).join('');
}

let mHand='R';
let mArsenal=[];
let _arsenalShowAll=false;
let _mPos=[];
const POS_LIST=['1','2','3','4','5','6','7','8','9','DH'];
function setModalPos(p){
  const i=_mPos.indexOf(p);
  if(i>=0) _mPos.splice(i,1); else _mPos.push(p);
  document.querySelectorAll('.pos-btn').forEach(b=>b.classList.toggle('on',_mPos.includes(b.dataset.pos)));
}
function posButtonsHTML(selected){
  const sel=selected?selected.split(',').filter(Boolean):[];
  _mPos=[...sel];
  return `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">${POS_LIST.map(p=>`<div class="pos-btn ${sel.includes(p)?'on':''}" data-pos="${p}" onclick="setModalPos('${p}')">${p}</div>`).join('')}</div>`;
}
function setModalHand(h,cls='hand-btn'){
  mHand=h;
  document.querySelectorAll('.'+cls).forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.'+cls+'.'+h).forEach(b=>b.classList.add('on'));
}
function toggleArsenal(pt){
  const i=mArsenal.indexOf(pt);
  if(i>=0) mArsenal.splice(i,1); else mArsenal.push(pt);
  document.querySelectorAll('.arsenal-btn').forEach(b=>b.classList.toggle('on',mArsenal.includes(b.dataset.pt)));
}
function applyArsenalFilter(){
  const arsenal=curP()?.arsenal||[];
  const btn=document.getElementById('pt-show-all-btn');
  if(!arsenal.length){
    document.querySelectorAll('.pt-btn').forEach(b=>b.style.display='');
    if(btn) btn.style.display='none';
    return;
  }
  document.querySelectorAll('.pt-btn').forEach(b=>{
    const m=/pickPT\('(\w+)'\)/.exec(b.getAttribute('onclick'));
    const code=m?m[1]:'';
    b.style.display=(arsenal.includes(code)||_arsenalShowAll)?'':'none';
  });
  if(btn){
    btn.style.display='';
    btn.textContent=_arsenalShowAll?'Show fewer pitches':'Show all pitches';
  }
}
function toggleArsenalShowAll(){
  _arsenalShowAll=!_arsenalShowAll;
  applyArsenalFilter();
}

function showAddPitcher(editIdx=null){
  const p=editIdx!==null?S.pitchers[editIdx]:{};
  mHand=p.throws||'R';
  mArsenal=[...(p.arsenal||[])];
  const PC=['FB','2S','SI','FC','SL','SV','CB','CH','FS','FO','KN','EP','OT'];
  showModal('Pitcher', `
    <div class="fgroup"><label>Name</label><input type="text" id="mp-name" value="${p.name||''}" placeholder="Player name..."></div>
    <div class="fgroup"><label>Jersey #</label><input type="number" id="mp-num" value="${p.num||''}"></div>
    <div class="fgroup"><label>Throws</label>
      <div class="hand-row">
        <div class="hand-btn L ${mHand==='L'?'on':''}" onclick="setModalHand('L')">L</div>
        <div class="hand-btn R ${mHand==='R'?'on':''}" onclick="setModalHand('R')">R</div>
      </div>
    </div>
    <div class="fgroup">
      <label>Arsenal — Pitches Thrown</label>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">${PC.map(pt=>`<div class="arsenal-btn ${mArsenal.includes(pt)?'on':''}" data-pt="${pt}" onclick="toggleArsenal('${pt}')">${pt}</div>`).join('')}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px;">Tap to select. Leave empty to show all.</div>
    </div>
    <div class="btn-row" style="margin-top:8px;">
      ${editIdx!==null?`<button class="btn btn-danger" onclick="deletePitcher(${editIdx})">Remove</button>`:''}
      <button class="btn btn-primary btn-block" onclick="savePitcher(${editIdx??-1})">Save</button>
    </div>
  `);
}
function showEditPitcher(i){ showAddPitcher(i); }
function deletePitcher(i){ S.pitchers.splice(i,1); save(); hideModal(); renderMyTeam(); }
function savePitcher(idx){
  const name=document.getElementById('mp-name').value.trim();
  if(!name)return;
  const existing=idx>=0?S.pitchers[idx]:{};
  const p={name,num:document.getElementById('mp-num').value.trim(),throws:mHand,arsenal:[...mArsenal],active:true,rating:existing.rating||0};
  if(idx>=0) S.pitchers[idx]=p; else S.pitchers.push(p);
  save(); hideModal(); renderMyTeam();
}
