/* ── program data — unchanged from the original tool ───────────────────── */
var DAYS={
fri:{label:"Friday — Push + Quads",ex:[
{n:"Smith squat",s:3,r:6,top:6,load:60,step:2.5,rest:180,rir:2,cue:"Bar over mid-foot, heels flat."},
{n:"Smith incline press",s:3,r:6,top:6,load:50,step:2.5,rest:120,rir:2,cue:"Bench ~30°. Bar to upper chest."},
{n:"Bulgarian split squat",s:3,r:8,top:8,load:25,step:2.5,rest:120,rir:2,cue:"Per leg. Upright = more quad."},
{n:"Incline DB press",s:3,r:7,top:8,load:52.5,step:2.5,rest:120,rir:2,cue:"Lower to a stretch, don't drift wide."},
{n:"Pec deck fly",s:3,r:8,top:10,load:100,step:5,rest:90,rir:1,partial:1,cue:"Handles at mid-chest, elbows fixed."},
{n:"Leg extension",s:3,r:12,top:15,load:null,step:2.5,rest:90,rir:1,partial:1,cue:"Start light, log the stack."},
{n:"Cable lateral raise",s:3,r:10,top:12,load:10,step:1,rest:90,rir:1,partial:1,cue:"Per side. Arm across body, lead with elbow."},
{n:"Weighted dip",s:3,r:6,top:8,load:0,step:2.5,rest:120,rir:2,cue:"Lean forward, comfortable depth."}
]},
sat:{label:"Saturday — Pull + Hinge",ex:[
{n:"MTS front pulldown",s:3,r:7,top:9,load:90,step:5,rest:120,rir:2,cue:"Elbows to ribs. Full stretch at top."},
{n:"Cable RDL",s:3,r:8,top:8,load:120,step:5,rest:150,rir:2,cue:"Hips back, stop when stretch stops you."},
{n:"T-bar row",s:3,r:8,top:8,load:75,step:5,rest:120,rir:2,cue:"25+25+25. Chest-supported if you can."},
{n:"Seated leg curl",s:3,r:9,top:11,load:130,step:5,rest:90,rir:1,cue:"Lean back for hard sets."},
{n:"Bayesian curl",s:3,r:8,top:10,load:13,step:1,rest:90,rir:1,partial:1,cue:"Arm behind body, elbow fixed."},
{n:"Preacher curl",s:3,r:6,top:6,load:25,step:2.5,rest:90,rir:1,partial:1,cue:"Per side. Don't cut the bottom."},
{n:"Rear delt crossover",s:3,r:12,top:14,load:10,step:1,rest:90,rir:1,cue:"Sweep back, squeeze, slow return."},
{n:"Standing calf raise",s:3,r:12,top:15,load:null,step:5,rest:90,rir:0,partial:1,cue:"Pause 1s in the stretch. No bounce."}
]},
sun:{label:"Sunday — Light / Machines",ex:[
{n:"Leg press / Hack squat",s:3,r:6,top:8,load:180,step:5,rest:150,rir:2,cue:"45×4 plates. Full depth, back stays down."},
{n:"Pull-ups",s:3,r:6,top:6,load:0,step:2.5,rest:120,rir:2,cue:"Bodyweight. Under 5 reps? Use pulldown."},
{n:"Machine overhead press",s:3,r:7,top:9,load:80,step:5,rest:120,rir:2,cue:"Only overhead press this week."},
{n:"Cable fly",s:3,r:12,top:15,load:null,step:2.5,rest:90,rir:1,partial:1,cue:"Soft elbows, full stretch on return."},
{n:"Machine seated row",s:3,r:8,top:8,load:130,step:5,rest:120,rir:2,cue:"Chest-supported. Pull to ribs."},
{n:"Lateral raise ↔ Reverse pec deck",s:3,r:10,top:12,load:70,step:5,rest:120,rir:1,partial:1,cue:"Superset. Lateral 70, then pec deck ×12. One rest after pair."},
{n:"Overhead cable extension",s:3,r:12,top:15,load:null,step:2.5,rest:90,rir:1,partial:1,cue:"Elbows by head, lower behind head."},
{n:"Standing calf raise",s:3,r:15,top:20,load:null,step:5,rest:90,rir:0,partial:1,cue:"Pause 1s in stretch. Alt weeks: hip abduction 2×12 · 205."}
]}
};

/* ── helpers ───────────────────────────────────────────────────────────── */
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function fmt(s){s=Math.max(0,Math.round(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}

/* ── state + persistence ───────────────────────────────────────────────── */
var STORE="gym-tool-v1", THEME_KEY="gym-theme";
/* open on today's workout; Mon–Thu (off days) land on Fri, the next session */
var cur=(function(){var d=new Date().getDay();return d===6?"sat":(d===0?"sun":"fri");})();
var idx=0, state={}, hintText="", hintGood=false, view="day";
function st(d,i){
  var k=d+":"+i, e=DAYS[d].ex[i], s=state[k];
  if(!s){ s=state[k]={done:0,load:e.load||0,reps:e.r,rir:e.rir,topHits:0,lastRir:null}; }
  else{
    if(typeof s.done!=="number")s.done=0;
    if(typeof s.load!=="number")s.load=e.load||0;
    if(typeof s.reps!=="number")s.reps=e.r;
    if(typeof s.rir!=="number")s.rir=e.rir;
    if(typeof s.topHits!=="number")s.topHits=0;
    if(!("lastRir" in s))s.lastRir=null;
  }
  return s;
}
function save(){
  try{ localStorage.setItem(STORE,JSON.stringify({v:1,cur:cur,idx:idx,state:state})); }catch(e){}
}
function load(){
  try{
    var raw=localStorage.getItem(STORE); if(!raw)return;
    var p=JSON.parse(raw); if(!p||p.v!==1)return;
    if(p.state&&typeof p.state==="object")state=p.state;
    if(p.cur&&DAYS[p.cur])cur=p.cur;
    if(typeof p.idx==="number"&&p.idx>=0&&p.idx<DAYS[cur].ex.length)idx=p.idx;
  }catch(e){}
}

/* ── day math (same model as the original tool) ────────────────────────── */
function dayMins(d){
  var t=0, list=DAYS[d].ex;
  list.forEach(function(e){ t+=e.s*50 + e.s*e.rest; });
  t+=(list.length-1)*60;
  return Math.round(t/60);
}
function dayMinsLeft(d){
  var t=0, liftsLeft=0, list=DAYS[d].ex;
  list.forEach(function(e,i){
    var rem=e.s-Math.min(st(d,i).done,e.s);
    if(rem>0){ t+=rem*50 + rem*e.rest; liftsLeft++; }
  });
  t+=Math.max(0,liftsLeft-1)*60;
  return Math.round(t/60);
}
function ex(){return DAYS[cur].ex[idx];}
function curSt(){return st(cur,idx);}

/* ── element refs ──────────────────────────────────────────────────────── */
var appEl=document.getElementById("app");
var header=document.getElementById("header");
var dayView=document.getElementById("dayView");
var liftView=document.getElementById("liftView");
var liftList=document.getElementById("liftList");
var timerBar=document.getElementById("timerBar");
var detailsBtn=document.getElementById("detailsBtn");
var skipBtn=document.getElementById("skipRest");
var pauseBtn=document.getElementById("pauseRest");
var undoBtn=document.getElementById("undoBtn");
var rPrevBtn=document.getElementById("rPrevBtn");
var rNextBtn=document.getElementById("rNextBtn");
var sessBtn=document.getElementById("sessBtn");
var rirRow=document.getElementById("rirRow");

/* ── theme ─────────────────────────────────────────────────────────────── */
function applyTheme(t){
  document.documentElement.setAttribute("data-theme",t);
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content", t==="light"?"#f4f6f8":"#0b0e12");
  var b=document.getElementById("themeBtn");
  if(b){
    b.textContent = t==="light" ? "☀" : "☾";
    b.setAttribute("aria-label", t==="light" ? "Switch to dark theme" : "Switch to light theme");
  }
}
function initTheme(){
  var t="dark";
  try{ var saved=localStorage.getItem(THEME_KEY); if(saved==="light"||saved==="dark")t=saved; }catch(e){}
  applyTheme(t);
}
document.getElementById("themeBtn").onclick=function(){
  var t=document.documentElement.getAttribute("data-theme")==="light"?"dark":"light";
  try{ localStorage.setItem(THEME_KEY,t); }catch(e){}
  applyTheme(t);
};

/* ── visibility: only one view (and the right chrome) shows at a time ──── */
function applyVisibility(){
  var resting=appEl.classList.contains("resting");
  var peek=appEl.classList.contains("show-details");
  var showCurrent=!resting||peek;
  dayView.style.display=(showCurrent&&view==="day")?"flex":"none";
  liftView.style.display=(showCurrent&&view==="lift")?"flex":"none";
  header.style.display=(resting&&!peek)?"none":"flex";
}

/* ── render ────────────────────────────────────────────────────────────── */
function syncDays(){
  document.querySelectorAll(".day").forEach(function(b){
    var on=b.getAttribute("data-day")===cur;
    b.classList.toggle("active",on);
    b.setAttribute("aria-pressed",on?"true":"false");
  });
}
function renderDay(){
  var list=DAYS[cur].ex, totalDone=0, totalSets=0;
  list.forEach(function(x,i){ totalDone+=Math.min(st(cur,i).done,x.s); totalSets+=x.s; });
  document.getElementById("dayTitle").textContent=DAYS[cur].label;
  document.getElementById("daySummary").textContent=(totalSets>0&&totalDone>=totalSets)
    ? "Workout complete — nice work"
    : "8 lifts · "+totalSets+" sets · ~"+(totalDone>0?dayMinsLeft(cur):dayMins(cur))+" min"+(totalDone>0?" left":" total");

  var rows="";
  list.forEach(function(e,i){
    var s=st(cur,i), done=s.done>=e.s;
    var loadTxt = e.load===null ? (s.load>0?"Load "+s.load:"start light")
                 : e.load===0 ? "bodyweight" : "Load "+s.load;
    var restTxt = fmt(e.rest+(s.rir<=1?30:0));
    rows += '<li class="liftrow'+(done?" done":"")+(i===idx?" now":"")+'" data-i="'+i+'" role="button" tabindex="0">'
      + '<span class="liftstatus">'+(done?"✓":"")+'</span>'
      + '<span class="liftmain"><span class="liftname">'+esc(e.n)+'</span>'
      + '<span class="liftmeta">'+e.s+'×'+e.r+(e.top>e.r?"–"+e.top:"")+' · '+loadTxt+' · '+restTxt+' rest</span></span>'
      + '<span class="chev">›</span></li>';
  });
  liftList.innerHTML=rows;

  var segs="";
  list.forEach(function(e,i){
    var s=st(cur,i);
    var pct=Math.max(0,Math.min(1,s.done/e.s));
    segs+='<span class="pseg"><i style="width:'+(pct*100)+'%"></i></span>';
  });
  document.getElementById("progressSegs").innerHTML=segs;
  save();
}
function renderLift(){
  var e=ex(), s=curSt(), list=DAYS[cur].ex;
  var anyDone=false;
  list.forEach(function(x,i){ if(st(cur,i).done>0)anyDone=true; });
  document.getElementById("liftMeta").textContent="Lift "+(idx+1)+" of "+list.length+" · ~"+(anyDone?dayMinsLeft(cur):dayMins(cur))+" min";
  document.getElementById("exName").textContent=e.n;

  var rirTxt=(e.partial&&s.done===e.s-1)?"0–1 RIR · last set":s.rir+" RIR";
  var loadBig = e.load===null
    ? (s.load>0?"Load <b>"+s.load+"</b>":"start light")
    : (e.load===0?"bodyweight":"Load <b>"+s.load+"</b>");
  var effRest=e.rest+(s.rir<=1?30:0);
  document.getElementById("exPres").innerHTML=
    "<span class='big'><b>"+s.reps+(e.top>s.reps?"–"+e.top:"")+"</b> reps · "+loadBig+"</span>"
    +"<span class='small'>"+rirTxt+" · Rest "+fmt(effRest)+"</span>";
  document.getElementById("exCue").textContent=e.cue;
  document.getElementById("tempoLine").style.display=idx===0?"":"none";

  var complete=s.done>=e.s;
  var dots="";
  for(var k=0;k<e.s;k++){ dots+='<span class="sdot'+(k<s.done?" done":(k===s.done?" now":""))+'"></span>'; }
  dots+='<span class="setcount">'+(complete?("All "+e.s+" sets done"):("Set "+(s.done+1)+" of "+e.s))+'</span>';
  document.getElementById("setDots").innerHTML=dots;

  document.getElementById("loadVal").textContent=(e.load===null&&s.load===0)?"—":s.load;
  document.getElementById("repVal").textContent=s.reps;
  rirRow.querySelectorAll(".rir").forEach(function(b){
    b.classList.toggle("active",s.rir===parseInt(b.getAttribute("data-rir"),10));
  });

  var btn=document.getElementById("doneBtn");
  btn.classList.toggle("complete",complete);
  btn.textContent=complete?"✓ Done — tap for extra set":"Set Done";

  var hint=document.getElementById("hint");
  hint.textContent=hintText;
  hint.className="hint"+(hintText?" show":"")+(hintGood?" good":"");

  var last=idx===list.length-1;
  document.getElementById("prevLift").disabled=idx===0;
  document.getElementById("nextLift").disabled=last;
  /* the rest-screen pair forwards to these same buttons, so it must mirror
     their disabled state or the arrows look live but do nothing at the ends */
  rPrevBtn.disabled=idx===0;
  rNextBtn.disabled=last;
  save();
}
function render(){
  appEl.classList.toggle("lift-mode",view==="lift");
  syncDays();
  applyVisibility();
  if(view==="day")renderDay(); else renderLift();
}

/* ── rest timer (timestamp-based: honest even if the phone sleeps) ─────── */
var rLeft=0, rInt=null, rEnd=0, rTotal=0, rLabel="", pendingNext=false, pendingIdx=-1, pendingDay="", lastAction=null, rPaused=false, rNote="", rNextText="";

function blurRestNav(){
  if(document.activeElement===rPrevBtn||document.activeElement===rNextBtn){
    document.activeElement.blur();
  }
}
function resetPause(){
  rPaused=false;
  timerBar.classList.remove("paused");
  pauseBtn.textContent="Pause";
}
function setRestLabel(t,m){
  document.getElementById("restLabel").textContent=t;
  document.getElementById("restMsg").textContent=m;
}
function setRestDetails(open){
  if(open)blurRestNav();
  appEl.classList.toggle("show-details",!!open);
  detailsBtn.textContent=detailsBtn.getAttribute(open?"data-hide":"data-show");
  detailsBtn.setAttribute("aria-expanded",open?"true":"false");
  applyVisibility();
}
detailsBtn.onclick=function(){
  setRestDetails(!appEl.classList.contains("show-details"));
};
function timerIdle(label,msg){
  if(timerBar.contains(document.activeElement))document.activeElement.blur();
  timerBar.classList.remove("active","go");
  appEl.classList.remove("resting");
  setRestDetails(false);
  pendingIdx=-1; pendingDay="";
  resetPause();
  skipBtn.textContent="End rest";
  document.getElementById("restTime").textContent="Rest";
  document.getElementById("restTime").removeAttribute("aria-label");
  document.getElementById("rbarFill").style.width="0";
  document.getElementById("restNext").textContent="";
  setRestLabel(label||"",msg||"Starts after Set Done");
  applyVisibility();
}
function updateRbar(){
  var f=rTotal>0?1-(rLeft/rTotal):0;
  document.getElementById("rbarFill").style.width=Math.max(0,Math.min(100,f*100))+"%";
}
/* the AudioContext is created/resumed on the Set Done tap (a user gesture) */
var actx=null;
function ensureAudio(){
  try{
    if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==="suspended")actx.resume();
  }catch(e){}
}
function beepGo(){
  if(!actx)return;
  try{
    var t=actx.currentTime;
    [0,0.22].forEach(function(off){
      var o=actx.createOscillator(), g=actx.createGain();
      o.type="sine"; o.frequency.value=880;
      o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(0.0001,t+off);
      g.gain.exponentialRampToValueAtTime(0.22,t+off+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t+off+0.16);
      o.start(t+off); o.stop(t+off+0.18);
    });
  }catch(e){}
}
function finishRest(){
  clearInterval(rInt); rInt=null; rLeft=0;
  resetPause();
  document.getElementById("restTime").textContent="GO";
  document.getElementById("restTime").setAttribute("aria-label","Rest complete — GO");
  document.getElementById("rbarFill").style.width="100%";
  var rn=document.getElementById("restNext");
  rn.textContent=rn.textContent.replace("Up next —","Up now —");
  timerBar.classList.add("go");
  var adv=pendingNext&&cur===pendingDay&&idx===pendingIdx;
  skipBtn.textContent=adv?(idx<DAYS[cur].ex.length-1?"Next lift":"Finish"):"Start next set";
  setRestLabel("GO",adv?(idx<DAYS[cur].ex.length-1?"Lift done — next up.":"Workout complete — nice work."):"Next set — go.");
  if(navigator.vibrate)navigator.vibrate(200);
  beepGo();
}
function tickRest(){
  rLeft=Math.max(0,Math.ceil((rEnd-Date.now())/1000));
  document.getElementById("restTime").textContent=fmt(rLeft);
  updateRbar();
  if(rLeft<=0)finishRest();
}
function startRest(sec,label,lastSet,note,nextText){
  clearInterval(rInt); rTotal=sec; rEnd=Date.now()+sec*1000; rLeft=sec; rLabel=label; pendingNext=!!lastSet;
  if(pendingNext&&pendingIdx<0){ pendingIdx=idx; pendingDay=cur; }
  rNote=note||""; rNextText=nextText||"";
  document.getElementById("restNext").textContent=rNextText;
  document.getElementById("restTime").setAttribute("aria-label","Rest time remaining");
  timerBar.classList.add("active"); timerBar.classList.remove("go");
  appEl.classList.add("resting");
  if(document.activeElement&&!timerBar.contains(document.activeElement))document.activeElement.blur();
  setRestDetails(false);
  resetPause();
  skipBtn.textContent="End rest";
  document.getElementById("restTime").textContent=fmt(rLeft);
  updateRbar();
  var msg = note==="partials"
    ? "Add bottom-half partials to failure — then rest."
    : "Stretch — set up the next set.";
  if(sec>ex().rest)msg="+30s for 0–1 RIR · "+msg;
  setRestLabel(label,msg);
  applyVisibility();
  rInt=setInterval(tickRest,200);
}
document.getElementById("plus15").onclick=function(){
  if(!timerBar.classList.contains("active"))return;
  if(!rInt&&!rPaused&&rLeft<=0){ startRest(15,rLabel,pendingNext,rNote,rNextText); return; }
  timerBar.classList.remove("go");
  skipBtn.textContent="End rest";
  if(rPaused){
    rLeft+=15; rTotal+=15;
    document.getElementById("restTime").textContent=fmt(rLeft);
    updateRbar();
    return;
  }
  rEnd+=15000; rTotal+=15; tickRest();
};
pauseBtn.onclick=function(){
  if(!timerBar.classList.contains("active")||timerBar.classList.contains("go"))return;
  if(rPaused){
    rPaused=false;
    timerBar.classList.remove("paused");
    pauseBtn.textContent="Pause";
    rEnd=Date.now()+rLeft*1000;
    rInt=setInterval(tickRest,200);
    tickRest();
    return;
  }
  if(!rInt)return;
  rLeft=Math.max(0,Math.ceil((rEnd-Date.now())/1000));
  clearInterval(rInt); rInt=null;
  rPaused=true;
  timerBar.classList.add("paused");
  pauseBtn.textContent="Resume";
  document.getElementById("restTime").textContent=fmt(rLeft);
  updateRbar();
};
/* at GO the whole timer surface is the advance button */
timerBar.addEventListener("click",function(ev){
  if(!timerBar.classList.contains("go"))return;
  if(ev.target.closest("button"))return;
  skipBtn.click();
});
function clearUndo(){
  lastAction=null;
  appEl.classList.remove("can-undo");
}
skipBtn.onclick=function(){
  var wasGo=timerBar.classList.contains("go");
  clearInterval(rInt); rInt=null; rLeft=0;
  resetPause();
  clearUndo();
  if(pendingNext&&cur===pendingDay&&idx===pendingIdx){
    pendingNext=false;
    if(idx<DAYS[cur].ex.length-1){
      idx++; hintText=""; hintGood=false;
      timerIdle("","Next lift — go."); render();
    }else{
      timerIdle("","Workout complete — nice work.");
      if(sInt){ pauseSession(); sAutoStopped=true; }
    }
    return;
  }
  pendingNext=false;
  timerIdle("",wasGo?"Next set — go.":"Skipped — next set, go.");
};
undoBtn.onclick=function(){
  if(!lastAction)return;
  var a=lastAction; lastAction=null;
  var s=st(a.day,a.i);
  s.done=a.done; s.topHits=a.topHits; s.lastRir=a.lastRir;
  clearInterval(rInt); rInt=null; rLeft=0; pendingNext=false;
  resetPause();
  appEl.classList.remove("can-undo");
  hintText=""; hintGood=false;
  timerIdle("","Set undone — ready when you are.");
  render();
};

/* ── session timer ─────────────────────────────────────────────────────── */
var sSec=0, sInt=null, sBase=0, sStart=0;
var sAutoStopped=false;
function tickSession(){
  sSec=sBase+Math.floor((Date.now()-sStart)/1000);
  var el=document.getElementById("elapsed");
  if(el)el.textContent=fmt(sSec);
  if(sSec>0)sessBtn.classList.add("has-time");
}
function pauseSession(){
  tickSession();
  clearInterval(sInt); sInt=null; sBase=sSec;
  releaseAwake();
  sessBtn.classList.remove("on");
  sessBtn.innerHTML="▶ <span class='startlbl'>Start</span><span id='elapsed'>"+fmt(sSec)+"</span>";
}
sessBtn.onclick=function(){
  if(sInt){ pauseSession(); sAutoStopped=false; return; }
  sAutoStopped=false;
  sessBtn.classList.add("on");
  sessBtn.innerHTML="⏸ <span id='elapsed'>"+fmt(sSec)+"</span>";
  sStart=Date.now();
  sInt=setInterval(tickSession,500);
  keepAwake();
};

/* ── wake lock — best effort, silent if unavailable ────────────────────── */
var wakeLock=null;
function keepAwake(){
  if(!("wakeLock" in navigator))return;
  if(wakeLock&&!wakeLock.released)return;
  navigator.wakeLock.request("screen").then(function(w){
    wakeLock=w;
    w.addEventListener("release",function(){ if(wakeLock===w)wakeLock=null; });
  }).catch(function(){});
}
function releaseAwake(){
  if(!wakeLock)return;
  var w=wakeLock; wakeLock=null;
  try{ var p=w.release(); if(p&&p.catch)p.catch(function(){}); }catch(e){}
}
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="visible"&&sInt)keepAwake();
});

/* ── RIR picker — built once ───────────────────────────────────────────── */
for(var ri=0;ri<=4;ri++){
  (function(rv){
    var b=document.createElement("button");
    b.type="button"; b.className="rir"; b.textContent=rv; b.setAttribute("data-rir",rv);
    b.setAttribute("aria-label","RIR "+rv);
    b.onclick=function(){curSt().rir=rv; save(); render();};
    rirRow.appendChild(b);
  })(ri);
}

/* ── steppers — tap once, press-and-hold repeats ───────────────────────── */
function stepLoad(d){
  var s=curSt();
  s.load=d<0?Math.max(0,Math.round((s.load-ex().step)*100)/100):Math.round((s.load+ex().step)*100)/100;
  save(); render();
}
function stepReps(d){var s=curSt(); s.reps=Math.max(1,s.reps+d); save(); render();}
function bindStepper(id,fn){
  var b=document.getElementById(id), delay=null, rep=null, held=false;
  function stop(){
    if(delay){clearTimeout(delay); delay=null;}
    if(rep){clearInterval(rep); rep=null;}
  }
  b.addEventListener("pointerdown",function(){
    held=false; stop();
    delay=setTimeout(function(){ delay=null; fn(); held=true; rep=setInterval(fn,70); },400);
  });
  ["pointerup","pointercancel","pointerleave"].forEach(function(ev){ b.addEventListener(ev,stop); });
  b.addEventListener("click",function(){ if(held){held=false;return;} fn(); });
}
bindStepper("loadDown",function(){stepLoad(-1);});
bindStepper("loadUp",function(){stepLoad(1);});
bindStepper("repDown",function(){stepReps(-1);});
bindStepper("repUp",function(){stepReps(1);});

/* ── set done ──────────────────────────────────────────────────────────── */
document.getElementById("doneBtn").onclick=function(){
  var e=ex(), s=curSt();
  var wasComplete=s.done>=e.s;
  lastAction={day:cur,i:idx,done:s.done,topHits:s.topHits,lastRir:s.lastRir};
  appEl.classList.add("can-undo");
  s.done++; s.lastRir=s.rir;
  if(s.reps>=e.top&&s.rir>=e.rir)s.topHits++;

  hintText=""; hintGood=false;
  var finished=!wasComplete&&s.done>=e.s;
  var restNote="";
  if(finished&&e.partial&&s.lastRir<=1){
    restNote="partials";
  }else if(finished&&s.topHits>=1&&s.reps>=e.top&&s.lastRir>=e.rir){
    hintText=e.n+": top reps at target RIR — do it again next session to add weight.";
    hintGood=true;
  }

  var list=DAYS[cur].ex, nextText="";
  if(s.done>=e.s){
    var nx=list[idx+1];
    var nxLoad=!nx?"":nx.load===null
      ? (st(cur,idx+1).load>0?" · Load "+st(cur,idx+1).load:" · start light")
      : nx.load===0?" · bodyweight":" · Load "+st(cur,idx+1).load;
    nextText=nx?"Up next — "+nx.n+" · "+nx.s+" × "+nx.r+(nx.top>nx.r?"–"+nx.top:"")+nxLoad:"Last lift done — workout complete";
  }else{
    nextText="Up next — Set "+(s.done+1)+" of "+e.s+" · "+s.reps+" reps"+
      (e.load===null?(s.load>0?" · load "+s.load:" · start light"):(e.load===0?" · bodyweight":" · load "+s.load));
  }

  pendingIdx=-1; pendingDay="";
  startRest(e.rest+(s.rir<=1?30:0), e.n+" — set "+Math.min(s.done,e.s)+" done", s.done>=e.s, restNote, nextText);

  ensureAudio();
  if(navigator.vibrate)navigator.vibrate(10);
  if(!sInt&&(sSec===0||sAutoStopped))sessBtn.click();
  keepAwake();
  render();
};

/* ── navigation ────────────────────────────────────────────────────────── */
function showDay(){
  view="day"; hintText=""; hintGood=false; clearUndo();
  render();
}
function openLift(i){
  if(i<0||i>=DAYS[cur].ex.length)return;
  idx=i; view="lift"; hintText=""; hintGood=false; clearUndo(); render();
}
document.getElementById("backBtn").onclick=showDay;
liftList.addEventListener("click",function(ev){
  var row=ev.target.closest(".liftrow"); if(!row)return;
  openLift(parseInt(row.getAttribute("data-i"),10));
});
liftList.addEventListener("keydown",function(ev){
  if(ev.key!=="Enter"&&ev.key!==" ")return;
  var row=ev.target.closest(".liftrow"); if(!row)return;
  ev.preventDefault(); openLift(parseInt(row.getAttribute("data-i"),10));
});
document.getElementById("prevLift").onclick=function(){ if(idx>0){ idx--; hintText=""; hintGood=false; clearUndo(); render(); } };
document.getElementById("nextLift").onclick=function(){ if(idx<DAYS[cur].ex.length-1){ idx++; hintText=""; hintGood=false; clearUndo(); render(); } };
/* rest-screen pair forwards to the lift nav so there is one copy of the logic */
rPrevBtn.onclick=function(){ document.getElementById("prevLift").click(); };
rNextBtn.onclick=function(){ document.getElementById("nextLift").click(); };
document.querySelectorAll(".day").forEach(function(b){
  b.onclick=function(){
    cur=b.getAttribute("data-day");
    idx=0; hintText=""; hintGood=false; view="day";
    clearUndo();
    sAutoStopped=false;
    var list=DAYS[cur].ex;
    for(var i=0;i<list.length;i++){ if(st(cur,i).done<list[i].s){ idx=i; break; } }
    render();
  };
});

/* ── boot ──────────────────────────────────────────────────────────────── */
initTheme();
load();
render();
