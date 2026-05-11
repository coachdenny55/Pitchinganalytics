// ══════════════════════════════════════════
// STATE & PERSISTENCE
// ══════════════════════════════════════════
const KEY = 'pitchCharter_v2';
let S = loadS() || { team:{name:'',level:'hs'}, pitchers:[], games:[], activeId:null, opponents:[] };
if(!S.opponents) S.opponents=[];
if(!S.settings) S.settings={sprayZoneOverlay:false};
if(S.settings.trackIntendedDefault===undefined) S.settings.trackIntendedDefault=false;
if(S.settings.hitSpotTolerance===undefined) S.settings.hitSpotTolerance=null; // null = use level default
if(S.settings.showOutingGrades===undefined) S.settings.showOutingGrades=true;
if(!S.practices) S.practices=[];
let G = null; // active game

function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
function loadS(){ try{ const d=localStorage.getItem(KEY); return d?JSON.parse(d):null; }catch(e){return null;} }
function doBackup(){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url;
  a.download='cipher_backup.json'; a.click();
}

