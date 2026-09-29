/* Intuish app: Home, ready screen, Study Screen (real YouTube player + practice), Remember.
   Everything is saved in this browser (localStorage). No account, no server. */
(() => {
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const now = () => Date.now();
const MIN = 60e3, DAY = 864e5;
const INTERVALS = [10*MIN, 1*DAY, 3*DAY, 7*DAY, 16*DAY, 35*DAY]; // spaced review steps
const fmt = s => { s = Math.max(0, Math.floor(s||0)); const h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=String(s%60).padStart(2,"0"); return h ? `${h}:${String(m).padStart(2,"0")}:${x}` : `${m}:${x}`; };
const clockText = () => new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
const inDays = ms => { const d = ms/DAY; if(ms < 50*MIN) return `in ${Math.max(1,Math.round(ms/MIN))} min`; if(d < 0.9) return `in ${Math.round(ms/3600e3)} hr`; const n = Math.round(d); return n===1 ? "tomorrow" : `in ${n} days`; };

const ICON = {
  play:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
  vol:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  mute:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 10l4 4M20 10l-4 4"/></svg>',
  bulb:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  check:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  flag:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4h11l-2 4 2 4H5"/></svg>',
  close:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  q:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  time:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>'
};

/* Used for lessons you add yourself (no quiz written yet): the activity becomes active recall */
const RECALL = [
  {kind:"Recall", type:"open", prompt:"In your own words, what was the main idea of this video?",
   hint:"Pause and picture the moment that felt most important. What was the teacher trying to get across?",
   model:"Compare what you wrote with the video. Could you explain it to a friend without looking?",
   look:["It’s in your own words","It’s the main point, not a small detail","You could say it without notes"]},
  {kind:"Example", type:"open", prompt:"Give one example or detail from the video that backs that idea up.",
   hint:"Scrub back to a moment you remember and watch 20 seconds again.",
   model:"A good example is specific: something shown, said or worked through in the lesson.",
   look:["It’s specific","It really connects to the main idea"]},
  {kind:"Reflection", type:"open", prompt:"What’s one thing you’re still unsure about?",
   hint:"Which part would you skip if you had to teach this?",
   model:"That’s the part to rewatch next. Knowing what you don’t know yet is part of learning.",
   look:["You named something concrete","You know where in the video to look"]}
];

/* ---------- Saved data ---------- */
const KEY = "studyhub.v1";
const STARTER = "psych";   // the one example subject every new user starts with
const fresh = () => ({v:1, shown:[STARTER], lessons:{}, q:{}, hist:[], custom:[], override:{}, meta:{}, subjects:[], extraTopics:{}, goals:{}, goalTopics:{}, ui:{split:.5, speed:1, vol:80, muted:false}, timer:null});
let D;
try { D = JSON.parse(localStorage.getItem(KEY)); } catch(e) { D = null; }
if(!D || D.v !== 1) D = fresh();
else if(!D.shown) D.shown = SUBJECTS.map(s => s.id);   // saves from before the one-starter-subject change keep every subject
D = Object.assign(fresh(), D);
let saveT = 0;
function save(){ clearTimeout(saveT); saveT = setTimeout(saveNow, 200); }
function saveNow(){ try { localStorage.setItem(KEY, JSON.stringify(D)); } catch(e){} }

const allLessons = () => LESSONS.concat(D.custom);
const lessonById = id => allLessons().find(l => l.id === id);
const allSubjects = () => SUBJECTS.concat(D.subjects);
const subjById = id => allSubjects().find(s => s.id === id);
const isBuiltIn = id => SUBJECTS.some(b => b.id === id);
// Subjects on this person's Home: ready-made ones they've added (all of them for older saves) plus their own
const mySubjects = () => allSubjects().filter(s => !D.shown || !isBuiltIn(s.id) || D.shown.includes(s.id));
const PALETTE = [["#E8604C","#FDE7E3"],["#F2A93B","#FFF1D9"],["#3BAA6B","#E1F5E8"],["#1B998B","#DDF3F0"],["#2E6FD8","#E1EBFB"],["#7A4FC2","#EEE6FA"],["#D6457F","#FCE4EE"],["#3C3C3A","#EDEDEA"]];
// Illustration for subjects you create: your color, your initial, a few soft shapes
function artFor(s){
  const ph = D.photos && D.photos[s.id]; if(ph) return `<img class="subj-photo" src="${ph}" alt="">`;
  if(ART[s.id]) return ART[s.id];
  const [c, bg] = PALETTE[s.color || 0] || PALETTE[0], ch = esc((s.name || "?").trim()[0] || "?").toUpperCase();
  return `<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="160" fill="${bg}"/>
    <circle cx="164" cy="30" r="22" fill="${c}" opacity=".25"/><rect x="18" y="104" width="46" height="46" rx="12" fill="${c}" opacity=".18" transform="rotate(-12 41 127)"/>
    <circle cx="100" cy="80" r="50" fill="${c}"/><text x="100" y="98" text-anchor="middle" font-family="Quicksand,Arial" font-weight="700" font-size="52" fill="#fff">${ch}</text></svg>`;
}
const videoOf = L => D.override[L.id] || L.videoId;
const SRC_WORD = {video:"video", pdf:"PDF", link:"page"};
const recallCache = {};
const itemsOf = L => L.questions || recallCache[L.kind || "video"] || (recallCache[L.kind || "video"] = RECALL.map(q => Object.assign({}, q, {prompt:q.prompt.replace("this video", "this " + SRC_WORD[L.kind || "video"]).replace("the video", "the " + SRC_WORD[L.kind || "video"])})));
const qid = (L, i) => `${L.id}:${i}`;
const LS = L => D.lessons[L.id] || (D.lessons[L.id] = {idx:0, answers:[], view:"q", t:0});
const thumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const ytUrl = (id, t) => `https://www.youtube.com/watch?v=${id}${t>5?`&t=${Math.floor(t)}s`:""}`;
function parseYouTube(s){
  s = (s||"").trim();
  const m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  if(m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(s) ? s : null;
}

/* ---------- Mastery: what you have actually shown you know ---------- */
function recordAnswer(id, correct, ms, schedule, extra){
  const q = D.q[id] || (D.q[id] = {seen:0, right:0, first:now(), ms:[]});
  q.seen++; if(correct) q.right++; q.lastCorrect = !!correct; q.last = now();
  if(ms){ q.ms.push(Math.round(ms)); if(q.ms.length > 8) q.ms.shift(); }
  if(schedule){
    // Confidence tunes the gap: a lucky guess comes back in minutes, "unsure" holds its place, "certain" moves further out.
    const c = extra && extra.conf, prev = q.box;
    if(!correct || c === "guess") q.box = 0;
    else if(c === "unsure") q.box = prev == null ? 1 : Math.max(1, prev);
    else q.box = prev == null ? 1 : Math.min(prev + 1, INTERVALS.length - 1);
    q.due = now() + INTERVALS[q.box];
    q.sure = !correct && c === "certain";
  }
  D.hist.push(Object.assign({id, t:now(), correct:!!correct, ms:Math.round(ms||0)}, extra||{}));
  if(D.hist.length > 600) D.hist.splice(0, D.hist.length - 600);
  save();
}
function topicStats(subjId, topic){
  const ls = allLessons().filter(l => l.subj === subjId && l.topic === topic);
  let total = 0, known = 0, seen = 0, right = 0, tries = 0, ms = [];
  ls.forEach(L => itemsOf(L).forEach((_, i) => {
    total++; const q = D.q[qid(L, i)];
    if(q){ seen++; if(q.lastCorrect) known++; right += q.right; tries += q.seen; ms = ms.concat(q.ms); }
  }));
  const pct = total ? Math.round(known/total*100) : 0;
  const acc = tries ? Math.round(right/tries*100) : null;
  const st = !seen ? "n" : pct >= 80 ? "s" : pct >= 50 ? "l" : "r";
  return {lessons:ls, total, known, seen, pct, acc, st, avgMs: ms.length ? ms.reduce((a,b)=>a+b,0)/ms.length : 0, slower: slowerTrend(ms)};
}
function slowerTrend(ms){ if(ms.length < 6) return false; const h = Math.floor(ms.length/2); const a = ms.slice(0,h), b = ms.slice(h); const av = x => x.reduce((s,y)=>s+y,0)/x.length; return av(b) > av(a)*1.25; }
function subjStats(s){
  let total = 0, known = 0;
  topicsOf(s).forEach(t => { const x = topicStats(s.id, t); total += x.total; known += x.known; });
  return {pct: total ? Math.round(known/total*100) : 0, total, known};
}
function dueItems(subjId){
  const t = now(), out = [];
  allLessons().forEach(L => { if(subjId && L.subj !== subjId) return; itemsOf(L).forEach((it, i) => { const q = D.q[qid(L,i)]; if(q && q.due && it.options && q.due <= t) out.push({L, i, q}); }); });
  return out.sort((a,b) => a.q.due - b.q.due);
}
function scheduledItems(){
  const out = [];
  allLessons().forEach(L => itemsOf(L).forEach((it, i) => { const q = D.q[qid(L,i)]; if(q && q.due && it.options) out.push({L, i, q}); }));
  return out.sort((a,b) => a.q.due - b.q.due);
}
const STATUS_NAME = {s:"Strong", l:"Learning", r:"Needs review", n:"New"};

/* ---------- Shared UI bits ---------- */
function toast(t){ document.querySelectorAll(".toast").forEach(n=>n.remove()); const n = document.createElement("div"); n.className = "toast"; n.textContent = t; document.body.appendChild(n); setTimeout(() => n.remove(), 2800); }
function closeOverlays(){ let c = false; document.querySelectorAll(".menu,.sheet-wrap,.scrim").forEach(n => { n.remove(); c = true; }); return c; }
function sheet(html){
  document.querySelectorAll(".menu,.sheet-wrap").forEach(n => n.remove());
  const w = document.createElement("div"); w.className = "sheet-wrap";
  w.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  w.addEventListener("click", e => { if(e.target === w || e.target.closest("[data-close]")) w.remove(); });
  document.body.appendChild(w);
  const f = w.querySelector("[data-focus]") || w.querySelector("button"); if(f) f.focus();
  return w;
}
function menu(anchor, items, onPick){
  if(document.querySelector(".menu")){ closeOverlays(); return; }
  const r = anchor.getBoundingClientRect();
  const m = document.createElement("div"); m.className = "menu"; m.setAttribute("role","menu");
  m.style.top = (r.bottom + 8) + "px"; m.style.right = Math.max(8, innerWidth - r.right) + "px";
  m.innerHTML = items.map(x => x === "hr" ? "<hr>" : `<button role="menuitem" data-a="${x[0]}"><span>${esc(x[1])}</span><kbd>${esc(x[2]||"")}</kbd></button>`).join("");
  document.body.appendChild(m);
  const mh = m.offsetHeight; if(r.bottom + 8 + mh > innerHeight - 8) m.style.top = Math.max(8, r.top - 8 - mh) + "px";
  m.querySelector("button").focus();
  m.onclick = ev => { const a = ev.target.closest("button")?.dataset.a; if(!a) return; m.remove(); onPick(a); };
}
document.addEventListener("click", e => { const m = document.querySelector(".menu"); if(m && !m.contains(e.target) && !e.target.closest("#moreBtn,#avatarBtn")) m.remove(); });
function ring(p, size=48, w=5){
  const r = (size-w)/2, c = 2*Math.PI*r;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--soft-2)" stroke-width="${w}"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--ink)" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${c*p/100} ${c}" ${p?"":"opacity=\"0\""} transform="rotate(-90 ${size/2} ${size/2})"/></svg><span>${p}%</span></div>`;
}
function globe(st, p, key){
  const y = 92 - 92*p/100;
  const border = st === "r" ? `stroke="var(--st-r)" stroke-dasharray="5 5"` : `stroke="var(--line)"`;
  return `<svg class="globe" viewBox="0 0 92 92" aria-hidden="true">
    <defs><clipPath id="c${key}"><circle cx="46" cy="46" r="44"/></clipPath></defs>
    <circle cx="46" cy="46" r="44" fill="var(--soft)"/>
    <g clip-path="url(#c${key})"><path d="M0 ${y} q11.5 -6 23 0 t23 0 t23 0 t23 0 V92 H0Z" fill="${st==="s"?"var(--st-s)":st==="l"?"var(--st-l)":st==="r"?"var(--st-r-fill)":"var(--i4)"}"/></g>
    <circle cx="46" cy="46" r="44" fill="none" stroke-width="2" ${border}/>
  </svg>`;
}
/* ---------- Subcategory covers ----------
   Once a subcategory has a lesson in it, its circle gets an illustrated cover picked from what the lessons are about
   (the subcategory name + lesson titles), drawn in the subject's colors. Empty subcategories stay a plain circle. */
const COVER_TINT = {acting:["#8B1E2B","#FCE4E1","#F6C343"], hiset:["#2E6FD8","#DCE9FB","#F6B73C"], anatomy:["#C0263A","#FCE4E4","#3E7FD6"],
  psych:["#7A4FC2","#ECE3FA","#F4A6C4"], spanish:["#D7263D","#FFE7B3","#1B998B"], music:["#0F5C63","#DDF1EE","#F6C343"]};
// [keywords, icon drawn on a 24x24 grid with round strokes]; first match wins, so specific words come first
const COVER_ICONS = [
  [/repetit|repeat|echo/, '<path d="M4 6h9a3 3 0 0 1 3 3v1H7l-3 3z"/><path d="M20 12h-8a3 3 0 0 0-3 3v1h8l3 3z"/>'],
  [/magic|imagin|what if|pretend/, '<path d="M5 19 16 8"/><path d="m14 6 4 4"/><path d="M18 3v2M21 6h-2M19.5 4.5l-1 1M9 4v2M8 5h2M20 14v2M19 15h2"/>'],
  [/hagen|object|substitut/, '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.4"/>'],
  [/character|role|mask|theat|stage|scene|truthful|natural/, '<path d="M4 5c3 1.3 6 1.3 9 0v6a4.5 4.5 0 0 1-9 0z"/><path d="M11 9c3 1.3 6 1.3 9 0v6a4.5 4.5 0 0 1-9 0"/><path d="M6.5 9.5h1M9.5 9.5h1M13.5 13.5h1M16.5 13.5h1M14 17c1-.8 2.5-.8 3.5 0"/>'],
  [/audition|self.?tape|camera|film|on camera/, '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 11 5-3v8l-5-3"/>'],
  [/voice|speak|pronounc|sing|vocal/, '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>'],
  [/nerve|anxiet|confiden|calm|stress/, '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'],
  [/lines|memoriz|script|monolog/, '<path d="M7 3h10v18l-5-3-5 3z"/><path d="M10 8h4M10 11h4"/>'],
  [/dialogue|writ|essay|story|screen/, '<path d="M4 20l1.2-4.2L16 5l3 3L8.2 18.8z"/><path d="m14 7 3 3"/>'],
  [/pitch|producer|sell|market/, '<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9.5a4 4 0 0 1 0 5"/>'],
  [/graphic|design|brand|logo|typograph|illustrat|art|draw|paint|color|colour/, '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.1-.9-1.5-.9-2.5 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15.5" cy="7.5" r="1.2"/>'],
  [/equation|algebra|linear|solve|math|formula/, '<path d="M4 7h6M7 4v6M14 7h6M4 17h6M14 15h6M14 19h6"/>'],
  [/main idea|reading(?! note)|passage|comprehen|book/, '<path d="M3 5.5c3-1.3 6-1.3 9 .5v14c-3-1.8-6-1.8-9-.5z"/><path d="M21 5.5c-3-1.3-6-1.3-9 .5v14c3-1.8 6-1.8 9-.5z"/>'],
  [/govern|civic|constitu|law|branch|history|social stud/, '<path d="M3 10 12 4l9 6z"/><path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20h18"/>'],
  [/heart|cardi|blood|pulse/, '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/><path d="M6 12h3l1.5-2.5L13 15l1.5-3H18"/>'],
  [/skelet|bone|skull|joint/, '<path d="M8 8.5 15.5 16"/><circle cx="6.8" cy="5.3" r="1.8"/><circle cx="5.3" cy="7.3" r="1.8"/><circle cx="18.7" cy="16.7" r="1.8"/><circle cx="16.7" cy="18.7" r="1.8"/>'],
  [/lung|respir|breath|oxygen/, '<path d="M12 4v8M12 10l-3 2M12 10l3 2"/><path d="M9 8C5 8 4 13 4 17c0 2 1.5 3 3 3 2 0 2-2 2-4z"/><path d="M15 8c4 0 5 5 5 9 0 2-1.5 3-3 3-2 0-2-2-2-4z"/>'],
  [/mental|mind|emotion|feeling|mood|therapy/, '<path d="M12 20s-6-3.8-6-8.3A3.6 3.6 0 0 1 12 9.5a3.6 3.6 0 0 1 6 2.2c0 4.5-6 8.3-6 8.3z"/><path d="M9 5.5c1-1 2-1.5 3-1.5s2 .5 3 1.5"/>'],
  [/memor|brain|recall|remember|longer|forget/, '<path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 3 4.5 3 3 0 0 0 5 .5V5.5a3 3 0 0 0-3-1z"/><path d="M15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-3 4.5 3 3 0 0 1-5 .5"/><path d="M8 10h2M14 13h2"/>'],
  [/develop|piaget|child|grow|stage of/, '<path d="M12 21v-9"/><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>'],
  [/social|people|group|conform|friend|relationship|socializ/, '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3.5 19c.8-3.4 3-5 5.5-5s4.7 1.6 5.5 5M14.5 14.6c.8-.4 1.6-.6 2.5-.6 2 0 3.6 1.3 4 4"/>'],
  [/greet|hello|hola|introduc|convers/, '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>'],
  [/tense|verb|conjug|past|future|present|time/, '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>'],
  [/number|count|numer|digit/, '<path d="M5 8l2-1.5V17M10 9.5a2 2 0 0 1 4 0c0 2-4 3.5-4 7.5h4M17 7.5h3l-2 3a2.2 2.2 0 1 1-1.8 3.8"/>'],
  [/rhythm|beat|tempo|drum|time signature/, '<path d="M8 20 11 4h2l3 16z"/><path d="M9.6 13.5h4.8M12 13.5l4-6"/>'],
  [/scale|chord|key signature|interval|harmon/, '<path d="M4 20h4v-4h4v-4h4V8h4"/><circle cx="6" cy="14" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="14" cy="6" r="1.2"/>'],
  [/note|staff|clef|music|melod|song/, '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'],
  [/\b(test|exam|class|quiz|grade|pass)(e?s|ed|ing)?\b/, '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3.5h6v2H9zM8.5 11l1.5 1.5 3-3M8.5 16.5h7"/>'],
  [/every day|daily|habit|practic|routine|little/, '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4M9 15l2 2 4-4"/>'],
  [/real life|world|everyday|travel|use /, '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.6 0 17M12 3.5c-2.6 2.4-2.6 14.6 0 17"/>'],
  [/word|vocab|key idea|term|definit|language/, '<path d="M4 18 8.5 6 13 18M5.7 14h5.6M15 10.5c.6-1 1.6-1.5 2.7-1.5 1.7 0 2.8 1 2.8 2.8V18M20.5 13.5c-3.5 0-5.5.6-5.5 2.5 0 1.2.9 2 2.2 2 1.8 0 3.3-1.4 3.3-3.4"/>'],
  [/basic|intro|begin|fundament|understand|learn/, '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>']
];
function coverFor(s, topic, lessons, st, pct, key){
  const custom = PALETTE[(s.color|0) % PALETTE.length];
  const [ink, tint, accent] = COVER_TINT[s.id] || [custom[0], custom[1], "#F6C343"];
  // The subcategory's own name decides first, then its lesson titles, then the subject's name
  const name = topic.toLowerCase(), titles = lessons.map(l => l.title || "").join(" ").toLowerCase();
  const subj = s.name.toLowerCase();
  const hit = COVER_ICONS.find(([re]) => re.test(name)) || COVER_ICONS.find(([re]) => re.test(titles)) || COVER_ICONS.find(([re]) => re.test(subj));
  const glyph = hit ? `<g transform="translate(22 22) scale(2)" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${hit[1]}</g>`
    : `<text x="46" y="58" text-anchor="middle" font-size="34" font-weight="700" fill="${ink}" font-family="inherit">${esc((topic.trim()[0]||"?").toUpperCase())}</text>`;
  // Mastery shows as a ring around the cover (review items get the dashed coral ring, like everywhere else)
  const c = 2*Math.PI*44, ringCol = st==="s"?"var(--st-s)":st==="l"?"var(--st-l)":"var(--st-r)";
  const ring = st === "n" ? "" : st === "r" && !pct ? `<circle cx="46" cy="46" r="44" fill="none" stroke="var(--st-r)" stroke-width="3" stroke-dasharray="5 5"/>`
    : `<circle cx="46" cy="46" r="44" fill="none" stroke="${ringCol}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${c*Math.max(pct,4)/100} ${c}" transform="rotate(-90 46 46)"/>`;
  return `<svg class="globe cover" viewBox="0 0 92 92" aria-hidden="true">
    <defs><radialGradient id="cg${key}" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="${tint}"/><stop offset="1" stop-color="${tint}"/></radialGradient></defs>
    <circle cx="46" cy="46" r="44" fill="url(#cg${key})"/>
    <circle cx="70" cy="22" r="4" fill="${accent}" opacity=".85"/><circle cx="20" cy="70" r="2.5" fill="${ink}" opacity=".18"/><circle cx="74" cy="66" r="2" fill="${ink}" opacity=".14"/>
    ${glyph}
    <circle cx="46" cy="46" r="44" fill="none" stroke="${ink}" stroke-opacity=".12" stroke-width="1.5"/>${ring}
  </svg>`;
}
function thumbImg(L){
  return `<span class="fallback">${ART[L.subj]||""}</span><img src="${thumb(videoOf(L))}" alt="" loading="lazy" onerror="this.remove()">`;
}

/* ---------- Clock (Home, Remember, Study) ---------- */
function tickClocks(){
  const t = clockText();
  $("#homeClock").textContent = t; $("#clock").textContent = t; $("#remClock").textContent = t;
  const st = $("#studying"), T = D.timer;
  if(!T){ st.hidden = true; return; }
  st.hidden = false;
  const el = (now() - T.start)/1000;
  if(T.dur){
    const left = T.dur*60 - el;
    if(left <= 0){ D.timer = null; save(); st.hidden = true; toast(`Timer done · ${T.dur} min studied`); return; }
    st.textContent = left < 60 ? `${Math.ceil(left)} sec left` : `${Math.ceil(left/60)} min left`;
  } else {
    const m = Math.floor(el/60);
    st.textContent = m < 1 ? "Timer started" : `${m} min studying`;
  }
}
setInterval(tickClocks, 1000);

/* ======================= HOME ======================= */
/* ----- Home pulse: streak flame, 5-week heatmap, Remember ring ----- */
const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const FLAME = '<svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="flameG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0C68DA"/><stop offset=".55" stop-color="#3BBDFE"/><stop offset="1" stop-color="#DDF4FF"/></linearGradient><radialGradient id="flameC" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#F2FBFF" stop-opacity=".9"/><stop offset="1" stop-color="#BFE9FF" stop-opacity="0"/></radialGradient><filter id="flameBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".7"/></filter></defs><path d="M12 2.5c.6 3-1.2 4.6-2.6 6.2C8 10.3 7 11.8 7 14a5 5 0 0 0 10 0c0-2.1-.9-3.4-1.8-4.4-.2 1.3-.9 2.2-1.8 2.6.3-3.3-.3-6.9-1.4-9.7z" fill="url(#flameG)"/><path d="M9.6 9.6c-.5.9-.9 1.6-.9 2.6" stroke="#FFFFFF" stroke-opacity=".7" stroke-width=".8" stroke-linecap="round" fill="none" filter="url(#flameBlur)"/><g class="core"><path d="M12 10.8c-1.2 1.3-2.4 2.4-2.4 4.1a2.4 2.4 0 0 0 4.8 0c0-1.6-1.1-2.6-2.4-4.1z" fill="url(#flameC)" filter="url(#flameBlur)"/><path d="M12 12.6c-.8.9-1.4 1.5-1.4 2.4a1.4 1.4 0 0 0 2.8 0c0-.9-.6-1.5-1.4-2.4z" fill="#FFFFFF"/></g></svg>';
function streakInfo(){
  const days = new Set(D.hist.map(h => dayKey(h.t)));
  const today = dayKey(now()), didToday = days.has(today);
  let n = 0, t = now(); if(!didToday) t -= DAY;
  while(days.has(dayKey(t))){ n++; t -= DAY; }
  return {n, didToday};
}
function renderPulse(){
  const el = $("#pulse"); if(!el) return;
  const {n, didToday} = streakInfo();
  const glow = didToday ? " lit" : n ? " warm" : D.hist.length ? " out" : "";
  const sLine = didToday ? "You studied today" : n ? "Study today to keep it glowing" : D.hist.length ? "It dimmed. Study today to relight it" : "Start today";
  const counts = {}; D.hist.forEach(h => { const k = dayKey(h.t); counts[k] = (counts[k] || 0) + 1; });
  const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - 34);
  const cells = Array.from({length:35}, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); const c = counts[dayKey(d.getTime())] || 0; const lv = !c ? 0 : c < 5 ? 1 : c < 12 ? 2 : c < 25 ? 3 : 4; return `<i class="hm l${lv}${i === 34 ? " today" : ""}" title="${d.toLocaleDateString([], {month:"short", day:"numeric"})}: ${c} answer${c === 1 ? "" : "s"}"></i>`; }).join("");
  const due = dueItems().length, reviewedToday = D.hist.filter(h => h.src === "remember" && dayKey(h.t) === dayKey(now())).length;
  const total = due + reviewedToday, p = total ? Math.round(reviewedToday / total * 100) : 0, sched = scheduledItems();
  const remLine = due ? `${due} ready to review` : reviewedToday ? "All caught up today" : sched.length ? `Next review ${inDays(sched[0].q.due - now())}` : "Answer questions to start";
  el.innerHTML = `
    <div class="pc pc-streak${glow}"><span class="flame">${FLAME}</span><div class="pc-txt"><b>${n}</b><span>day streak</span><small>${sLine}</small></div></div>
    <div class="pc pc-heat"><div class="hm-grid" aria-label="Study activity, last 5 weeks">${cells}</div><small>Last 5 weeks</small></div>
    <div class="pc pc-rem${due ? " is-due" : ""}" ${due ? 'role="link" tabindex="0" aria-label="Open Remember"' : ""}>${ring(p, 56, 6)}<div class="pc-txt"><b>Remember</b><small>${remLine}</small></div></div>`;
  const go = el.querySelector(".pc-rem.is-due"); if(go){ go.onclick = () => { location.hash = "#/remember"; }; go.onkeydown = e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); go.click(); } }; }
}

function renderHome(){
  const due = dueItems().length;
  $("#remPill").hidden = true; $("#remCount").textContent = due; renderPulse();
  const subs = mySubjects(), many = subs.length > 6;
  $("#grid").classList.toggle("many", many); document.querySelector("#homeView .wrap").classList.toggle("many", many);
  $("#grid").innerHTML = subs.map(s => {
    const ss = subjStats(s), d = dueItems(s.id).length;
    return `<button class="tile" data-id="${s.id}" aria-label="${esc(s.name)}, ${ss.pct}% known">
      ${d ? `<span class="due" title="Due to remember">${d}</span>` : ""}
      <div class="art">${artFor(s)}</div>
      <div class="tile-b">
        <div class="tile-h"><b>${esc(s.name)}</b>${ring(ss.pct)}</div>
        <div class="segs">${topicsOf(s).map(t => `<i class="${topicStats(s.id,t).st}" title="${esc(t)}"></i>`).join("")}</div>
      </div>
    </button>`;
  }).join("") + `<button class="tile-add" id="tileAdd"><span><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>Add a subject</button>`;
  fitHome();
}
// Home shows every subject on one screen: pick the column count that keeps tiles as large as possible
function fitHome(){
  const g = $("#grid"); if(!g) return;
  const n = g.querySelectorAll(".tile").length || 1, land = innerWidth > innerHeight;
  let cols = land ? (n <= 6 ? 3 : n <= 8 ? 4 : Math.ceil(n / 3)) : (n <= 6 ? 2 : 3);
  const rows = Math.max(land ? 2 : 3, Math.ceil(n / cols));
  // a few subjects keep normal-size tiles; the first empty spot invites adding another
  const ghost = g.querySelector(".tile-add"); if(ghost) ghost.hidden = n >= cols * rows;
  g.style.setProperty("--cols", cols); g.style.setProperty("--rows", rows);
  g.classList.toggle("dense", (land && rows >= 3) || rows >= 4 || cols >= 4);
}
addEventListener("resize", fitHome);
function pickSubjectPhoto(id, done){
  const s = subjById(id); if(!s) return;
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
  inp.onchange = () => {
    const f = inp.files[0]; if(!f) return;
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const W = 720, H = 504, r = Math.max(W / img.width, H / img.height), w = W / r, h = H / r, c = document.createElement("canvas"); c.width = W; c.height = H;
      c.getContext("2d").drawImage(img, (img.width - w) / 2, (img.height - h) / 2, w, h, 0, 0, W, H);
      URL.revokeObjectURL(url); D.photos = D.photos || {};
      const prev = D.photos[id]; D.photos[id] = c.toDataURL("image/jpeg", .82);
      try { localStorage.setItem(KEY, JSON.stringify(D)); } catch(e){ if(prev) D.photos[id] = prev; else delete D.photos[id]; toast("Not enough space for that photo"); return; }
      renderHome(); toast(`${s.name} photo updated`); done && done();
    };
    img.onerror = () => toast("That image couldn’t be opened");
    img.src = url;
  };
  inp.click();
}
$("#grid").addEventListener("click", e => { if(e.target.closest(".tile-add")) return createSubject(); const t = e.target.closest(".tile"); if(t) openSubjectAsk(t.dataset.id); });
$("#addSubj").onclick = () => createSubject();
$("#avatarBtn").onclick = e => {
  e.stopPropagation();
  menu($("#avatarBtn"), [["about","About this test version"],"hr",["reset","Erase all my progress"]], a => {
    if(a === "about") sheet(`<div class="sheet-head"><div><div class="eyebrow">Intuish</div><h2>Test version</h2></div><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
      <p class="lead" style="margin:0">Your progress is saved in this browser only. Nothing is sent anywhere. Each subject comes with three starter lessons. Add your own sources to any subject: up to 50 YouTube videos, 25 websites and 25 PDFs. PDFs stay on this device.</p>
      <p class="muted" style="margin:0;font-size:13px">Hints are written by hand for now, not AI.</p>
      <div style="display:flex;justify-content:flex-end"><button class="btn" data-close data-focus>Got it</button></div>`);
    if(a === "reset"){
      const w = sheet(`<div class="sheet-head"><h2>Erase all progress?</h2><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
        <p class="lead" style="margin:0">This clears your answers, Remember schedule and the videos you added, on this device.</p>
        <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn outline" data-close data-focus>Keep it</button><button class="btn" id="doReset">Erase</button></div>`);
      w.querySelector("#doReset").onclick = () => { D = fresh(); saveNow(); w.remove(); renderHome(); toast("Progress erased"); };
    }
  });
};

/* ----- Sources: your own videos, links and PDFs. Each kind has its own limit per subject ----- */
const LIMITS = {video:50, link:25, pdf:25}, MY = "My sources";
const LIMIT_NAME = {video:["video","videos"], link:["website","websites"], pdf:["PDF","PDFs"]};
const countKinds = subjId => { const c = {video:0, link:0, pdf:0}; sourcesOf(subjId).forEach(L => { const k = kindOf(L); if(k in c) c[k]++; }); return c; };
const allFull = c => Object.keys(LIMITS).every(k => c[k] >= LIMITS[k]);
const limitLine = c => Object.keys(LIMITS).map(k => `${c[k]} of ${LIMITS[k]} ${LIMIT_NAME[k][1]}`).join(" · ");
const kindOf = L => L.kind || "video";
const topicsOf = s => { const base = s.topics.concat(D.extraTopics[s.id] || []); const extra = [...new Set(D.custom.filter(l => l.subj === s.id && !base.includes(l.topic)).map(l => l.topic))].sort((a,b) => (a === MY) - (b === MY)); return base.concat(extra); };
const sourcesOf = id => D.custom.filter(l => l.subj === id);
const KIND = {
  video:{label:"Video", icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>'},
  link:{label:"Website", icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>'},
  pdf:{label:"PDF", icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>'}
};
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch(e){ return u; } };

// PDFs are kept on this device in IndexedDB (too big for localStorage)
const PDFS = {
  db: null,
  open(){ return this.db || (this.db = new Promise((res, rej) => { const r = indexedDB.open("studyhub", 1); r.onupgradeneeded = () => r.result.createObjectStore("pdfs"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  async tx(mode, fn){ const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction("pdfs", mode); const q = fn(t.objectStore("pdfs")); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); },
  put(k, blob){ return this.tx("readwrite", s => s.put(blob, k)); },
  get(k){ return this.tx("readonly", s => s.get(k)); },
  del(k){ return this.tx("readwrite", s => s.delete(k)); }
};

function addSourceSheet(subjId, topic, onDone){
  const s = subjById(subjId), cnt = countKinds(subjId);
  if(allFull(cnt)){ toast(`${s.name} is full. Remove a source to add more.`); return; }
  const opts = [...new Set(topicsOf(s).concat([MY]))].map(t => `<option ${t === (topic || MY) ? "selected" : ""}>${esc(t)}</option>`).join("");
  const w = sheet(`
    <div class="sheet-head"><div><div class="eyebrow">${esc(s.name)}</div><h2>Add a source</h2></div><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
    <form id="srcForm" class="src-form">
      <label class="label" for="srcUrl">YouTube video or website link</label>
      <input id="srcUrl" type="url" inputmode="url" placeholder="https://…" autocomplete="off" data-focus>
      <div class="src-or"><span>or</span></div>
      <label class="src-file"><input id="srcPdf" type="file" accept="application/pdf,.pdf"><span id="srcPdfName">${KIND.pdf.icon} Choose a PDF</span></label>
      <label class="label" for="srcName">Name <span class="muted" style="font-weight:400">(optional)</span></label>
      <input id="srcName" type="text" placeholder="What is this about?" autocomplete="off">
      <label class="label" for="srcTopic">Topic</label>
      <select id="srcTopic">${opts}</select>
      <p class="muted src-limits">${limitLine(cnt)}</p>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px"><button type="button" class="btn outline" data-close>Cancel</button><button class="btn" type="submit">Add</button></div>
    </form>`);
  const pdf = w.querySelector("#srcPdf");
  pdf.onchange = () => { const f = pdf.files[0]; w.querySelector("#srcPdfName").innerHTML = f ? `${KIND.pdf.icon} ${esc(f.name)}` : `${KIND.pdf.icon} Choose a PDF`; if(f) w.querySelector("#srcUrl").value = ""; };
  w.querySelector("#srcForm").onsubmit = async ev => {
    ev.preventDefault();
    const url = w.querySelector("#srcUrl").value.trim(), f = pdf.files[0];
    const name = w.querySelector("#srcName").value.trim();
    let t = w.querySelector("#srcTopic").value;
    const L = {id:"u"+now().toString(36)+Math.random().toString(36).slice(2,5), subj:subjId, topic:t, course:s.name, custom:true, added:now()};
    if(f){
      if(f.size > 60e6){ toast("That PDF is over 60 MB. Try a smaller one."); return; }
      try { await PDFS.put(L.id, f); } catch(e){ toast("This browser couldn’t save the PDF"); return; }
      Object.assign(L, {kind:"pdf", title:name || f.name.replace(/\.pdf$/i, ""), file:f.name});
    } else if(url){
      const v = parseYouTube(url);
      if(v) Object.assign(L, {kind:"video", videoId:v, title:name || t});
      else if(/^https?:\/\/[^\s.]+\.[^\s]+/i.test(url)) Object.assign(L, {kind:"link", url, title:name || hostOf(url)});
      else { toast("That doesn’t look like a link"); return; }
      if(v && !name) L.autoTitle = true;
    } else { toast("Paste a link or choose a PDF"); return; }
    // Left on My sources: file it under the subcategory it clearly matches (the video title arrives later, so videos use the name and link)
    if(t === MY){ L.topic = MY; D.custom.push(L); const m = sortPlan(subjId).find(x => x.L === L); D.custom.pop(); if(m){ t = m.to; L.topic = t; if(L.autoTitle) L.title = t; } }
    if(cnt[L.kind] >= LIMITS[L.kind]){ if(L.kind === "pdf") PDFS.del(L.id).catch(()=>{}); toast(`You’ve reached ${LIMITS[L.kind]} ${LIMIT_NAME[L.kind][1]} for ${s.name}. Remove one to add another.`); return; }
    D.custom.push(L); save(); w.remove(); toast(`${KIND[L.kind].label} added`); onDone && onDone(L);
  };
}
function removeSource(L, onDone){
  const w = sheet(`<div class="sheet-head"><h2>Remove this source?</h2><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
    <p class="lead" style="margin:0">“${esc(L.title)}” and your answers for it will be removed from ${esc(subjById(L.subj).name)}.</p>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn outline" data-close data-focus>Keep it</button><button class="btn" id="doRemove">Remove</button></div>`);
  w.querySelector("#doRemove").onclick = () => {
    D.custom = D.custom.filter(x => x.id !== L.id); delete D.lessons[L.id]; delete D.override[L.id];
    Object.keys(D.q).forEach(k => { if(k.startsWith(L.id + ":")) delete D.q[k]; });
    if(kindOf(L) === "pdf") PDFS.del(L.id).catch(()=>{});
    save(); w.remove(); toast("Source removed"); onDone && onDone();
  };
}
function sourceThumb(L){
  if(kindOf(L) === "video") return thumbImg(L);
  return `<span class="src-thumb ${kindOf(L)}">${KIND[kindOf(L)].icon.replace(/width="16" height="16"/, 'width="34" height="34"')}<b>${esc(kindOf(L) === "link" ? hostOf(L.url) : "PDF")}</b></span>`;
}
function lessonCard(L){
  const st = LS(L), m = D.meta[videoOf(L) || ""] || {}, p = m.dur ? Math.min(100, st.t / m.dur * 100) : 0;
  const sub = kindOf(L) === "video" ? (m.author || L.course) : kindOf(L) === "link" ? hostOf(L.url) : (L.file || (L.url ? hostOf(L.url) : "PDF"));
  return `<div class="vcard-wrap"><a class="vcard" href="#/ready/${L.id}"><div class="vthumb">${sourceThumb(L)}<span class="vtag">${esc(L.topic)}</span>${p>1?`<span class="vprog"><b style="width:${p}%"></b></span>`:""}</div>
    <div class="vmeta"><span class="av" style="background:var(--ink)">${KIND[kindOf(L)].icon.replace(/currentColor/g, "#fff")}</span><div><b>${esc(L.title)}</b><span>${esc(sub)}</span></div></div></a>
    ${L.custom ? `<button class="src-x" data-remove="${L.id}" aria-label="Remove ${esc(L.title)}">${ICON.close}</button>` : ""}</div>`;
}

/* ----- Goals: asked before a subject's first lesson (at least 5) ----- */
const MIN_GOALS = 5;
const GOAL_SUGGEST = {
  acting:["Feel natural and truthful in scenes","Memorize lines faster","Nail auditions and self-tapes","Understand my characters deeply","Use my voice and body with confidence","Handle nerves on stage and on camera"],
  hiset:["Pass the HiSET","Get better at math word problems","Read and understand passages faster","Write a clear essay","Understand science questions and charts","Feel calm on test day"],
  anatomy:["Know the major body systems","Learn the bones and muscles","Understand how the heart and lungs work","Get ready for a nursing or health class","Understand my own body and health","Remember medical words"],
  psych:["Learn how to socialize","Understand people’s emotions","Understand my mental health better","Understand why people act the way they do","Handle stress and anxiety","Remember what I study for longer"],
  spanish:["Hold a simple conversation","Get around and order food when traveling","Understand Spanish songs and shows","Talk with family or friends in Spanish","Build my everyday vocabulary","Get the verb tenses right"],
  music:["Read sheet music","Keep a steady rhythm","Learn scales and chords","Play songs I love","Understand music theory basics","Write my own music"]
};
const goalSuggest = s => GOAL_SUGGEST[s.id] || [`Learn the basics of ${s.name}`,`Understand the key ideas and words`,`Practice a little every day`,`Use ${s.name} in real life`,`Pass a class or test`,`Remember what I learn for longer`];
/* A goal turns into a subcategory that reads like learning: "Learn how to socialize" → "Learning Social Skills" */
const GOAL_TOPIC = {"learn how to socialize":"Learning Social Skills","learn to socialize":"Learning Social Skills","socialize":"Learning Social Skills"};
const SMALL = new Set(["and","of","the","in","on","with","for","to","a","an","or","at","by","as","from","into"]);
const VERBS = new Set("read write speak talk play handle manage use hold build keep remember memorize pass cook draw sing code make cope deal act think plan save lead teach solve prepare order travel listen dance paint edit film direct design budget invest sell negotiate communicate socialize relax breathe focus study train run swim pray meditate count spell type drive fix grow plant bake sew knit shoot record mix compose improvise audition network interview present argue debate translate calculate analyze organize create express connect understand control trust forgive love parent date heal sleep eat lose gain pitch find start stop win finish raise earn protect support care take give ask answer explain describe recognize identify treat help coach perform learn know get feel nail master improve practice become go see try do have work land book tell stay beat ace review sound look move stretch lift".split(" "));
const SELF = new Set(["understand","know","use","improve","manage","handle","control","trust","heal","protect","take","care","feel","express","become"]);
const titleCase = t => t.split(" ").map((w,i) => i && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
const gerund = v => v === "be" ? "being" : /ing$/.test(v) ? v : /ie$/.test(v) ? v.slice(0,-2)+"ying" : /[^e]e$/.test(v) ? v.slice(0,-1)+"ing" : /^[^aeiou]*[aeiou][bdgmnpt]$/.test(v) ? v+v.slice(-1)+"ing" : v+"ing";
function topicName(goal){
  const key = goal.trim().toLowerCase().replace(/'/g, "’").replace(/[.!?]+$/,"").replace(/^(i want to|i wanna|i’d like to|i would like to|to)\s+/,"");
  if(GOAL_TOPIC[key]) return GOAL_TOPIC[key];
  const w = key.replace(/\s+(better|more)$/,"").split(/\s+/);
  const self = SELF.has(w[0]);
  const out = w.map((x,i) => x === "i" ? "you" : x === "myself" ? "yourself" : x === "my" ? (self || w[i+1] === "own" ? "your" : "") : x === "i’m" ? "you’re" : x).filter(Boolean);
  if(VERBS.has(out[0])) out[0] = gerund(out[0]);
  return titleCase(out.join(" ")).replace(/\bHiset\b/i,"HiSET").replace(/\bSpanish\b/i,"Spanish");
}
function goalSheet(subjId, onDone){
  const s = subjById(subjId), cur = D.goals[subjId];
  const list = (cur && cur.length ? cur : goalSuggest(s)).slice();
  const w = sheet(`<div class="sheet-head"><div><div class="eyebrow">${esc(s.name)}</div><h2>What is your goal when studying ${esc(s.name)}?</h2></div><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
    <form id="goalForm" class="src-form goal-form"><span class="label">I want to:</span><div class="goal-list" id="goalList"></div>
    <button type="button" class="linkish goal-add" id="goalAdd">+ Add your own</button>
    <p class="muted goal-note" id="goalNote"></p>
    <div style="display:flex;justify-content:flex-end;gap:8px">${cur ? `<button type="button" class="btn outline" data-close>Cancel</button>` : `<button type="button" class="btn outline" id="goalSkip">Not now</button>`}<button class="btn" type="submit" id="goalGo">${cur ? "Save goals" : "Start learning"}</button></div></form>`);
  const box = w.querySelector("#goalList");
  const draw = focusLast => {
    box.innerHTML = list.map((g,i) => `<div class="goal-row"><span class="goal-dot" aria-hidden="true"></span><input type="text" value="${esc(g)}" data-i="${i}" maxlength="60" placeholder="Write a goal" aria-label="Goal ${i+1}"><button type="button" class="src-x goal-x" data-x="${i}" aria-label="Remove goal">${ICON.close}</button></div>`).join("");
    if(focusLast) box.querySelector(".goal-row:last-child input").focus();
    count();
  };
  const count = () => {
    const n = list.filter(g => g.trim()).length, go = w.querySelector("#goalGo");
    go.disabled = n < MIN_GOALS; go.style.opacity = n < MIN_GOALS ? .4 : 1;
    w.querySelector("#goalNote").textContent = n < MIN_GOALS ? `Keep at least ${MIN_GOALS} goals (${n} so far). Edit any of them to fit you.` : `Your subcategories: ${[...new Set(list.filter(g => g.trim()).map(g => topicName(g)))].join(" · ")}`;
  };
  box.addEventListener("input", e => { const i = e.target.dataset.i; if(i != null){ list[+i] = e.target.value; count(); } });
  box.addEventListener("click", e => { const x = e.target.closest("[data-x]"); if(x){ list.splice(+x.dataset.x, 1); draw(); } });
  const skip = w.querySelector("#goalSkip"); if(skip) skip.onclick = () => { w.remove(); openSubject(subjId); };
  w.querySelector("#goalAdd").onclick = () => { if(list.length < 12){ list.push(""); draw(true); } };
  w.querySelector("#goalForm").onsubmit = ev => {
    ev.preventDefault();
    const goals = [...new Set(list.map(g => g.trim()).filter(Boolean))];
    if(goals.length < MIN_GOALS){ toast(`Keep at least ${MIN_GOALS} different goals`); return; }
    D.goals[subjId] = goals;
    if(!ART[s.id]){
      const names = [...new Set(goals.map(g => topicName(g)))], prev = D.goalTopics[subjId] || [];
      const used = t => D.custom.some(l => l.subj === subjId && l.topic === t);
      let ex = (D.extraTopics[subjId] || []).filter(t => !prev.includes(t) || names.includes(t) || used(t));
      names.forEach(n => { if(!ex.some(t => t.toLowerCase() === n.toLowerCase())) ex.push(n); });
      D.extraTopics[subjId] = ex; D.goalTopics[subjId] = names;
    }
    save(); w.remove(); onDone && onDone();
  };
  draw();
}
function openSubjectAsk(id){ if(D.goals[id] && D.goals[id].length) openSubject(id); else goalSheet(id, () => { renderHome(); openSubject(id); }); }

function addSubcategory(subjId, onDone){
  const s = subjById(subjId);
  const w = sheet(`<div class="sheet-head"><div><div class="eyebrow">${esc(s.name)}</div><h2>New subcategory</h2></div><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
    <form id="subForm" class="src-form"><label class="label" for="subName">Name</label><input id="subName" type="text" placeholder="e.g. Script writing" autocomplete="off" data-focus required maxlength="40">
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px"><button type="button" class="btn outline" data-close>Cancel</button><button class="btn" type="submit">Add</button></div></form>`);
  w.querySelector("#subName").focus();
  w.querySelector("#subForm").onsubmit = ev => {
    ev.preventDefault();
    const n = w.querySelector("#subName").value.trim(); if(!n) return;
    if(topicsOf(s).some(t => t.toLowerCase() === n.toLowerCase())){ toast("That subcategory already exists"); return; }
    (D.extraTopics[subjId] = D.extraTopics[subjId] || []).push(n); save(); w.remove();
    onDone && onDone(topicsOf(s).indexOf(n));
  };
}
function createSubject(){
  if(mySubjects().length >= 24){ toast("You can have up to 24 subjects"); return; }
  const w = sheet(`<div class="sheet-head"><div><div class="eyebrow">Studying</div><h2>New subject</h2></div><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
    ${(() => { const ready = D.shown ? SUBJECTS.filter(b => !D.shown.includes(b.id)) : []; return ready.length ? `<div class="ready-subj"><span class="label">Ready-made subjects</span><div class="rs-row">${ready.map(b => `<button type="button" class="rs-chip" data-add="${b.id}"><span class="rs-art">${artFor(b)}</span>${esc(b.name)}</button>`).join("")}</div></div>` : ""; })()}
    <form id="subjForm" class="src-form">
      <label class="label" for="subjName">${D.shown && SUBJECTS.some(b => !D.shown.includes(b.id)) ? "Or make your own" : "What do you want to learn?"}</label>
      <input id="subjName" type="text" placeholder="e.g. Screenwriting" autocomplete="off" data-focus required maxlength="28">
      <span class="label">Color</span>
      <div class="swatches">${PALETTE.map((p,i) => `<button type="button" class="swatch" data-c="${i}" aria-label="Color ${i+1}" aria-pressed="${i===0}" style="background:${p[0]}"></button>`).join("")}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px"><button type="button" class="btn outline" data-close>Cancel</button><button class="btn" type="submit">Create</button></div>
    </form>`);
  let color = 0;
  const rs = w.querySelector(".rs-row"); if(rs) rs.onclick = e => { const b = e.target.closest("[data-add]"); if(!b) return; D.shown.push(b.dataset.add); save(); w.remove(); renderHome(); openSubjectAsk(b.dataset.add); };
  w.querySelectorAll(".swatch").forEach(b => b.onclick = () => { color = +b.dataset.c; w.querySelectorAll(".swatch").forEach(x => x.setAttribute("aria-pressed", x === b)); });
  if(!rs) w.querySelector("#subjName").focus();
  w.querySelector("#subjForm").onsubmit = ev => {
    ev.preventDefault();
    const name = w.querySelector("#subjName").value.trim(); if(!name) return;
    const subj = {id:"s"+now().toString(36), name, color, topics:[]};
    D.subjects.push(subj); D.extraTopics[subj.id] = []; save(); w.remove();
    renderHome(); openSubjectAsk(subj.id);
  };
}
function deleteSubject(s, panel){
  const n = sourcesOf(s.id).length;
  const w = sheet(`<div class="sheet-head"><h2>Delete ${esc(s.name)}?</h2><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
    <p class="lead" style="margin:0">This removes the subject${n ? `, its ${n} source${n>1?"s":""}` : ""} and your answers for it, on this device.</p>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn outline" data-close data-focus>Keep it</button><button class="btn" id="doDel">Delete</button></div>`);
  w.querySelector("#doDel").onclick = () => {
    sourcesOf(s.id).forEach(L => { delete D.lessons[L.id]; Object.keys(D.q).forEach(k => { if(k.startsWith(L.id + ":")) delete D.q[k]; }); if(kindOf(L) === "pdf") PDFS.del(L.id).catch(()=>{}); });
    D.custom = D.custom.filter(L => L.subj !== s.id); D.subjects = D.subjects.filter(x => x.id !== s.id); delete D.extraTopics[s.id]; delete D.goals[s.id];
    save(); w.remove(); panel.remove(); renderHome(); toast(`${s.name} deleted`);
  };
}

/* ----- Sorting sources into subcategories -----
   Reads what the browser can: video titles (from YouTube), website links, PDF names and the names you gave.
   Each source goes to the subcategory whose words it shares most; anything unclear stays in My sources. */
const SORT_STOP = new Set("a an the and or of for to in on at by with from how what why when your you my i me we our is are be it this that these those into about more most better fast faster quickly easy easily ever really very get getting become becoming make making learn learning understand understanding want know using use way ways thing things video tutorial part episode full new best top guide com www http https html pdf youtube watch".split(" "));
const SORT_SYN = [
  ["sell","selling","sale","sales","client","clients","customer","price","pricing","freelance","freelancing","business","money","income","portfolio","market","marketing","pitch","commission"],
  ["brand","branding","logo","logos","identity","mark","wordmark","trademark"],
  ["advanced","advance","pro","professional","master","mastery","expert","level","next"],
  ["high","end","luxury","premium","elite","career","designer"],
  ["basic","basics","beginner","beginners","intro","introduction","fundamental","fundamentals","101","start","starting","first","essentials"],
  ["key","idea","ideas","term","terms","wording","word","words","vocabulary","glossary","principle","principles","theory","concept","concepts","definition"],
  ["remember","memory","review","recap","summary","cheat","flashcard","flashcards","retain","forget"],
  ["practice","practicing","exercise","exercises","challenge","daily","day","habit","routine","drill"],
  ["test","exam","quiz","class","course","grade","pass","certification"],
  ["real","life","project","projects","case","study","world","everyday","job","work"]
];
const stem = w => w.length > 4 ? w.replace(/(ings|ing|ers|er|ed|es|s)$/,"") : w;
function sortWords(text){
  return text.toLowerCase().replace(/https?:\/\//g," ").replace(/[^a-z0-9áéíóúñü]+/g," ").split(" ").filter(w => w.length > 1 && !SORT_STOP.has(w)).map(stem);
}
function sourceText(L){
  const m = D.meta[videoOf(L)] || {};
  return [L.title !== L.topic ? L.title : "", m.title || "", L.file || "", L.url ? decodeURIComponent(L.url).replace(/^https?:\/\/(www\.)?/,"").replace(/[\/._\-?=&#]+/g," ") : ""].join(" ");
}
function sortPlan(subjId){
  const s = subjById(subjId), topics = topicsOf(s).filter(t => t !== MY);
  const subjWords = new Set(sortWords(s.name));
  const goalFor = t => (D.goals[subjId] || []).filter(g => topicName(g) === t).join(" ");
  const vocab = topics.map(t => {
    const base = new Set(sortWords(t + " " + goalFor(t)).filter(w => !subjWords.has(w)));
    SORT_SYN.forEach(g => { const gs = g.map(stem); if(gs.some(w => base.has(w))) gs.forEach(w => base.add(w)); });
    return base;
  });
  const moves = [];
  sourcesOf(subjId).filter(L => L.topic === MY || !topics.includes(L.topic)).forEach(L => {
    const words = new Set(sortWords(sourceText(L)).filter(w => !subjWords.has(w)));
    let best = -1, score = 0;
    vocab.forEach((v, i) => { let n = 0; words.forEach(w => { if(v.has(w)) n++; }); if(n > score){ score = n; best = i; } });
    if(best >= 0) moves.push({L, from:L.topic, to:topics[best]});
  });
  return moves;
}
// Video titles come from YouTube's public oEmbed (falls back to noembed); cached in D.meta so it runs once per video
async function fetchTitles(subjId){
  sourcesOf(subjId).forEach(L => { const t = (D.meta[videoOf(L)] || {}).title; if(t && kindOf(L) === "video" && (L.autoTitle || L.title === L.topic)){ L.title = t; delete L.autoTitle; } });
  const need = sourcesOf(subjId).filter(L => kindOf(L) === "video" && !(D.meta[videoOf(L)] || {}).title).slice(0, 60);
  await Promise.all(need.map(async L => {
    const id = videoOf(L), u = `https://www.youtube.com/watch?v=${id}`;
    for(const api of [`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`, `https://noembed.com/embed?url=${encodeURIComponent(u)}`]){
      try { const r = await fetch(api); if(!r.ok) continue; const j = await r.json(); if(!j.title) continue;
        const m = D.meta[id] || (D.meta[id] = {}); m.title = j.title; if(j.author_name) m.author = j.author_name;
        if(L.autoTitle || L.title === L.topic){ L.title = j.title; delete L.autoTitle; }
        return; } catch(e){}
    }
  }));
  if(need.length) save();
}
function sortSources(subjId, onDone){
  fetchTitles(subjId).then(() => {
    const moves = sortPlan(subjId), left = sourcesOf(subjId).filter(L => L.topic === MY).length - moves.length;
    if(!moves.length){ toast("None of your sources clearly matched a subcategory. They stay in My sources."); return; }
    moves.forEach(m => m.L.topic = m.to); save();
    D._lastSort = {subj:subjId, moves:moves.map(m => ({id:m.L.id, from:m.from}))};
    onDone && onDone(moves.length, left);
  });
}
function undoSort(onDone){
  const u = D._lastSort; if(!u) return;
  u.moves.forEach(m => { const L = lessonById(m.id); if(L) L.topic = m.from; });
  delete D._lastSort; save(); onDone && onDone();
}
function openSubject(id, keepTopic){
  const s = subjById(id), ss = subjStats(s), topics = topicsOf(s);
  document.querySelector(".scrim")?.remove();
  const w = document.createElement("div"); w.className = "scrim";
  const starter = LESSONS.filter(l => l.subj === id), mine = sourcesOf(id);
  const tStats = topics.map(t => topicStats(id, t));
  w.innerHTML = `<div class="h-panel" role="dialog" aria-modal="true" aria-label="${esc(s.name)}">
    <div class="p-head"><div class="art">${artFor(s)}</div>
      <div><h2>${esc(s.name)}</h2><p class="p-sum">${ss.known ? `You’ve shown you know ${ss.pct}% of this material.` : starter.length ? `${starter.length} starter sources ready. Pick a subcategory to begin.` : !topics.length ? "Start by adding a subcategory, then add sources to it." : mine.length ? "Pick a subcategory to begin." : "Add sources to a subcategory to start learning."}</p></div>
      <button class="x" aria-label="Close">${ICON.close}</button>
    </div>
    ${(D.goals[id]||[]).length ? `<div class="goal-chips"><span class="label">Your goals</span>${D.goals[id].map(g => `<span class="goal-chip">${esc(g)}</span>`).join("")}<button class="linkish" id="editGoals">Edit</button></div>` : `<div class="goal-chips"><button class="linkish" id="editGoals">Set your goals for ${esc(s.name)}</button></div>`}
    <div style="display:flex;align-items:center;gap:16px">${ring(ss.pct,84,8)}<div class="segs" style="flex:1">${tStats.map(x => `<i class="${x.st}" style="height:12px;border-radius:6px"></i>`).join("")}</div></div>
    <div class="orbs">${topics.map((t,i) => { const x = tStats[i]; return `<button class="orb" data-i="${i}" aria-pressed="false">${x.lessons.length ? coverFor(s, t, x.lessons, x.st, x.pct, s.id+i) : globe(x.st, x.pct, s.id+i)}<b>${esc(t)}</b><small>${x.seen ? x.pct+"%" : !x.lessons.length ? "Empty" : x.lessons.length > 1 ? x.lessons.length + " lessons" : "New"}</small></button>`; }).join("")}
      <button class="orb orb-add" id="addSub"><span class="globe add-globe"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span><b>Subcategory</b><small>Add</small></button></div>
    ${(() => { const waiting = mine.filter(L => L.topic === MY).length, others = topics.filter(t => t !== MY).length, last = D._lastSort && D._lastSort.subj === id ? D._lastSort : null;
      return last ? `<div class="sort-bar"><span>Loaded ${last.moves.length} lesson${last.moves.length>1?"s":""} into your subcategories.${waiting ? ` ${waiting} didn’t clearly fit and stayed in My sources.` : ""}</span><button class="linkish" id="undoSort">Undo</button><button class="linkish" id="okSort">Done</button></div>`
        : waiting && others ? `<div class="sort-bar"><span>${waiting} source${waiting>1?"s are":" is"} waiting in My sources. Load lessons reads them and puts each one in the subcategory it fits.</span><button class="act h-primary" id="doSort">Load lessons</button></div>` : ""; })()}
    <div id="detail"></div>
    ${starter.length ? `<div class="sec-h" style="margin-top:0"><h3 style="font-size:17px">Starter pack <span class="muted" style="font-weight:600;font-size:14px">${starter.filter(l => kindOf(l)==="video").length} videos · ${starter.filter(l => kindOf(l)==="pdf").length} PDFs · ${starter.filter(l => kindOf(l)==="link").length} websites</span></h3></div>
    <div class="lessons">${starter.map(lessonCard).join("")}</div>` : ""}
    <div class="sec-h" style="margin-top:0"><h3 style="font-size:17px">Your sources <span class="muted" style="font-weight:600;font-size:14px" title="${limitLine(countKinds(id))}">${mine.length}</span></h3>
      <button class="act h-primary" id="addSrc" ${allFull(countKinds(id)) ? "disabled style='opacity:.4'" : ""}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Add source</button></div>
    ${mine.length ? `<div class="lessons">${mine.map(lessonCard).join("")}</div>` : `<p class="muted" style="margin:-8px 0 0;font-size:14px">Add YouTube videos, website links or PDFs you want to learn from. Each one gets its own practice.</p>`}
    ${ART[s.id] ? "" : `<div style="display:flex;justify-content:flex-end"><button class="ghost" id="delSubj">Delete this subject</button></div>`}
  </div>`;
  document.body.appendChild(w);
  w.querySelector(".x").focus();
  let picked = keepTopic;
  const reopen = () => openSubject(id, picked);
  const pick = i => {
    picked = i;
    w.querySelectorAll(".orb").forEach(b => b.setAttribute("aria-pressed", +b.dataset.i === i));
    const t = topics[i], x = tStats[i];
    const line = x.seen ? `${STATUS_NAME[x.st]} · ${x.known} of ${x.total} known${x.acc!=null?` · ${x.acc}% accurate`:""}` : "Not started";
    w.querySelector("#detail").innerHTML = `<div class="detail" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div class="h-t"><b>${esc(t)}</b><span>${line}</span></div>
      <button class="act" data-add-topic>${'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'}Add source</button></div>
      ${!x.lessons.length ? `<p class="muted" style="margin:4px 0 0;font-size:14px">Nothing here yet. Add a video, website or PDF about ${esc(t)}.${(D.extraTopics[id]||[]).includes(t) ? ` <button class="linkish" data-del-topic>Remove this subcategory</button>` : ""}</p>` : ""}
      ${x.lessons.map(L => { const st = LS(L), n = itemsOf(L).length, done = st.view === "summary" || st.view === "review";
        return `<div class="topic-row"><span class="tr-ico">${KIND[kindOf(L)].icon}</span><div class="tr-t"><b>${esc(L.title)}</b><span>${done ? "Finished" : st.answers.length ? `Question ${st.idx+1} of ${n}` : `${n} ${L.questions ? "questions" : "recall prompts"}`}</span></div><a class="act h-primary" href="#/ready/${L.id}">${ICON.q}${done ? "Review" : st.answers.length ? "Continue" : "Start"}</a></div>`; }).join("")}
    </div>`;
  };
  w.addEventListener("click", e => {
    if(e.target === w || e.target.closest(".x")) return w.remove();
    const rm = e.target.closest("[data-remove]"); if(rm){ e.preventDefault(); removeSource(lessonById(rm.dataset.remove), () => { renderHome(); reopen(); }); return; }
    if(e.target.closest("#addSrc")) return addSourceSheet(id, picked != null ? topics[picked] : MY, () => { renderHome(); reopen(); });
    if(e.target.closest("[data-add-topic]")) return addSourceSheet(id, topics[picked], () => { renderHome(); reopen(); });
    if(e.target.closest("#addSub")) return addSubcategory(id, i => { picked = i; renderHome(); reopen(); });
    if(e.target.closest("[data-del-topic]")){ D.extraTopics[id] = (D.extraTopics[id]||[]).filter(t => t !== topics[picked]); picked = null; save(); renderHome(); return reopen(); }
    if(e.target.closest("#doSort")){ e.target.closest("#doSort").disabled = true; e.target.closest("#doSort").textContent = "Reading sources…"; return sortSources(id, () => { renderHome(); reopen(); }); }
    if(e.target.closest("#undoSort")) return undoSort(() => { renderHome(); reopen(); toast("Put back in My sources"); });
    if(e.target.closest("#okSort")){ delete D._lastSort; save(); return reopen(); }
    if(e.target.closest("#delSubj")) return deleteSubject(s, w);
    if(e.target.closest("#editGoals")) return goalSheet(id, () => { renderHome(); reopen(); });
    if(e.target.closest("a[href^='#/']")) return w.remove();
    const o = e.target.closest(".orb"); if(o) pick(+o.dataset.i);
  });
  if(keepTopic != null && keepTopic < topics.length) pick(keepTopic);
}


/* ======================= READY ======================= */
function renderReady(L){
  const s = subjById(L.subj), st = LS(L), items = itemsOf(L), dur = D.meta[videoOf(L)]?.dur;
  const started = st.answers.length > 0 || st.t > 5 || st.view !== "q";
  $("#rvSubj").textContent = s.name; $("#rvCourse").textContent = L.course || s.name;
  $("#rvCrumbs").innerHTML = `${esc(s.name)} <i>›</i> ${esc(L.topic)}`;
  $("#rvTitle").textContent = L.title;
  const n = items.length, finished = st.view === "summary" || st.view === "review";
  const mins = Math.max(1, Math.round(n * (L.questions ? 35 : 70) / 60));
  const qs = items.map((it, i) => D.q[qid(L, i)]).filter(q => q && q.due);
  const review = qs.length ? `Spaced review active · next ${inDays(Math.min(...qs.map(q => q.due)) - now())}` : "Spaced review starts after you answer";
  const kindWord = k => ({video:"video", pdf:"PDF", link:"website"})[k];
  const main = `${L.custom ? "your" : "starter"} ${kindWord(kindOf(L))}`;
  const others = D.custom.filter(x => x.subj === L.subj && x.topic === L.topic && x.id !== L.id);
  const byKind = ["video","pdf","link"].map(k => { const c = others.filter(x => kindOf(x) === k).length; return c ? `${c} imported ${kindWord(k)}${c > 1 ? "s" : ""}` : ""; }).filter(Boolean);
  const progress = finished ? "Finished · review anytime" : started ? `Question ${Math.min(st.idx+1, n)} of ${n}${dur ? ` · ${fmt(Math.max(0, dur - st.t))} of video left` : ""}` : dur ? `Video ${fmt(dur)}` : "";
  const row = (ico, label, text) => `<div class="rc-row"><span class="rc-ico">${ico}</span><div><small>${label}</small><b>${text}</b></div></div>`;
  $("#rvFacts").innerHTML = `<div class="rv-card">
    ${row(ICON.q, "Topic overview", `${n} ${L.questions ? "questions" : "recall prompts"} · Est. time ${mins} min`)}
    ${row('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>', "Review", review)}
    ${row(KIND[kindOf(L)].icon, "Grounded in", `${main.charAt(0).toUpperCase() + main.slice(1)}${byKind.length ? " + " + byKind.join(" + ") : ""}`)}
    ${progress ? row('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h16M14 6l6 6-6 6"/></svg>', "Where you are", progress) : ""}
  </div>`;
  $("#rvRestart").hidden = !started;
  $("#rvGo").onclick = () => { location.hash = `#/study/${L.id}`; };
  $("#rvRestart").onclick = () => { D.lessons[L.id] = {idx:0, answers:[], view:"q", t:0}; save(); renderReady(L); toast("Starting fresh"); };
  $("#rvGo").focus({preventScroll:true});
}

/* ======================= STUDY SCREEN ======================= */
let cur = null;       // current lesson
const M = {mode:"split", pane:"study", mini:null};
const app = $("#app"), stage = $("#stage");
const narrowMQ = window.matchMedia("(max-width: 820px), (max-aspect-ratio: 1/1)");

/* ----- Player (YouTube IFrame API with Intuish controls) ----- */
const P = {yt:null, apiReady:false, apiFailed:false, ready:false, playing:false, started:false, t:0, dur:0, state:-1, loadedId:null, wantPlay:false, native:false,
  play(){ if(!this.ready) { this.wantPlay = true; return; } this.wantPlay = false; try { this.yt.playVideo(); } catch(e){} this.checkStart(); },
  pause(){ if(this.ready) try { this.yt.pauseVideo(); } catch(e){} this.playing = false; ui(); },
  toggle(){ (this.playing || this.state === 3) ? this.pause() : this.play(); },
  seek(t){ this.t = Math.min(Math.max(0, t), this.dur || t); if(this.ready) try { this.yt.seekTo(this.t, true); } catch(e){} ui(); persistTime(); },
  rate(r){ D.ui.speed = r; if(this.ready) try { this.yt.setPlaybackRate(r); } catch(e){} ui(); save(); },
  volume(v){ D.ui.vol = v; D.ui.muted = v == 0; if(this.ready) try { this.yt.setVolume(v); v == 0 ? this.yt.mute() : this.yt.unMute(); } catch(e){} ui(); save(); },
  toggleMute(){ D.ui.muted = !D.ui.muted; if(this.ready) try { D.ui.muted ? this.yt.mute() : this.yt.unMute(); } catch(e){} ui(); save(); },
  // Some tablets only start YouTube from a tap on the video itself. If our play button didn't start it, hand the tap to YouTube.
  checkStart(){ clearTimeout(this._chk); this._chk = setTimeout(() => { if(![1,3].includes(this.state) && !this.native){ this.native = true; $("#frame").classList.add("native","started"); toast("Tap the video to start it"); } }, 1800); }
};
function persistTime(){ if(cur){ LS(cur).t = P.t; save(); } }
function loadApi(){
  if(window.YT && window.YT.Player){ apiReady(); return; }
  const s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  s.onerror = () => { P.apiFailed = true; showVideoError("blocked"); };
  window.onYouTubeIframeAPIReady = apiReady;
  document.head.appendChild(s);
  setTimeout(() => { if(!P.apiReady){ P.apiFailed = true; showVideoError("blocked"); } }, 6000);
}
function apiReady(){
  P.apiReady = true;
  if(cur) mountVideo();
}
function mountVideo(){
  if(!cur) return;
  const id = videoOf(cur), start = Math.floor(LS(cur).t || 0);
  const f = $("#frame"); f.classList.remove("error","started","native","preview"); P.native = false; P.started = false; $("#vidMsg").hidden = true; $("#vidMsg").classList.remove("pv");
  let ca = $("#coverArt"); if(!ca){ ca = document.createElement("div"); ca.id = "coverArt"; ca.className = "cover-art"; $("#cover").prepend(ca); } ca.innerHTML = artFor(subjById(cur.subj));
  const ci = $("#coverImg"); ci.style.display = ""; ci.onerror = () => { ci.style.display = "none"; }; ci.src = thumb(id);
  P.t = start; P.dur = D.meta[id]?.dur || 0; P.playing = false; ui();
  if(!P.apiReady){ if(P.apiFailed) showVideoError("blocked"); return; }
  if(P.yt && P.ready){
    if(P.loadedId !== id){ P.yt.cueVideoById({videoId:id, startSeconds:start}); P.loadedId = id; }
    else P.yt.seekTo(start, true), P.yt.pauseVideo();
    return;
  }
  if(P.yt) return; // still initialising; onReady will cue
  P.loadedId = id;
  P.yt = new YT.Player("yt", {
    videoId: id, host: "https://www.youtube-nocookie.com",
    playerVars: {controls:0, rel:0, playsinline:1, modestbranding:1, iv_load_policy:3, disablekb:1, fs:0, start, origin: location.origin && location.origin !== "null" ? location.origin : undefined},
    events: {
      onReady(){
        P.ready = true;
        try { P.yt.setVolume(D.ui.vol); if(D.ui.muted) P.yt.mute(); P.yt.setPlaybackRate(D.ui.speed); } catch(e){}
        if(cur && videoOf(cur) !== P.loadedId){ P.loadedId = videoOf(cur); P.yt.cueVideoById({videoId:P.loadedId, startSeconds:Math.floor(LS(cur).t||0)}); }
        if(P.wantPlay) P.play();
        ui();
      },
      onStateChange(e){
        P.state = e.data;
        if(e.data === 1){ P.playing = true; P.started = true; $("#frame").classList.add("started"); clearTimeout(P._chk); try { P.yt.setPlaybackRate(D.ui.speed); } catch(err){} captureMeta(); }
        if(e.data === 2 || e.data === 0 || e.data === 5) P.playing = false;
        ui();
      },
      onError(e){ showVideoError(e.data); }
    }
  });
}
function captureMeta(){
  try {
    const id = videoOf(cur), d = P.yt.getVideoData ? P.yt.getVideoData() : {}, dur = P.yt.getDuration();
    const m = D.meta[id] || (D.meta[id] = {});
    if(d.title) m.title = d.title; if(d.author) m.author = d.author; if(dur) m.dur = dur;
    if(cur.custom && d.title && (cur.autoTitle || cur.title === cur.topic)){ cur.title = d.title; delete cur.autoTitle; setLessonText(); }
    setChanLine(); save();
  } catch(e){}
}
function showVideoError(code){
  if(!cur) return;
  const f = $("#frame"); f.classList.add("error");
  if(code === "blocked"){ // preview build: YouTube can't load here, so offer a clean card instead of a broken player
    f.classList.add("preview"); const v = $("#vidMsg"); v.hidden = false; v.classList.add("pv");
    // Only the claude.ai preview is "preview mode"; on the real site this means the network is blocking YouTube
    const hosted = /github\.io$/.test(location.hostname) || !/claude|anthropic|usercontent/i.test(location.hostname);
    v.innerHTML = `<span class="pv-badge">${hosted ? "Video unavailable" : "Preview mode"}</span><button class="pv-play" id="pvPlay" aria-label="Go to the questions">${'<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>'}</button><b>${hosted ? "Practice the questions" : "Click to test the quiz directly"}</b><span>${hosted ? "YouTube couldn’t load. Your network may be blocking it." : "Videos play once Intuish is hosted."}</span><a class="pv-yt" href="${ytUrl(videoOf(cur), P.t)}" target="_blank" rel="noopener">Watch on YouTube ↗</a>`;
    v.querySelector("#pvPlay").onclick = goToQuiz;
    return;
  }
  const msg = code === "blocked" ? ["The video can’t load on this page.","This preview blocks YouTube. It plays in the real app, or open it on YouTube."]
    : (code === 101 || code === 150) ? ["This video only plays on YouTube.","Its owner doesn’t allow it inside other apps. Open it on YouTube, or pick another video."]
    : (code === 100) ? ["This video isn’t available.","It may have been removed or made private. Pick another video for this lesson."]
    : ["The video couldn’t play.","Try again, open it on YouTube, or pick another video."];
  const v = $("#vidMsg"); v.hidden = false;
  v.innerHTML = `<b>${msg[0]}</b><span>${msg[1]}</span><div class="row"><a class="btn" href="${ytUrl(videoOf(cur), P.t)}" target="_blank" rel="noopener">Open on YouTube ↗</a><button class="btn outline" id="swapVid">Use another video</button></div>`;
  v.querySelector("#swapVid").onclick = changeVideo;
}
function changeVideo(){
  const w = sheet(`<div class="sheet-head"><div><div class="eyebrow">${esc(cur.topic)}</div><h2>Use another video</h2></div><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
    <p class="lead" style="margin:0">Paste a YouTube link. The practice questions stay the same.</p>
    <form id="swapForm" class="add-lesson" style="border:0;padding:0"><input id="swapUrl" type="url" inputmode="url" placeholder="https://youtube.com/watch?v=…" aria-label="YouTube link" data-focus required>
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">${D.override[cur.id] ? `<button type="button" class="btn outline" id="swapReset">Go back to the original</button>` : ""}<button class="btn" type="submit">Use this video</button></div></form>`);
  w.querySelector("#swapUrl").focus();
  w.querySelector("#swapForm").onsubmit = ev => {
    ev.preventDefault();
    const v = parseYouTube(w.querySelector("#swapUrl").value);
    if(!v){ toast("That doesn’t look like a YouTube link"); return; }
    D.override[cur.id] = v; LS(cur).t = 0; save(); w.remove(); setLessonText(); mountVideo(); toast("Video changed");
  };
  const r = w.querySelector("#swapReset"); if(r) r.onclick = () => { delete D.override[cur.id]; LS(cur).t = 0; save(); w.remove(); setLessonText(); mountVideo(); toast("Back to the original video"); };
}
setInterval(() => {
  if(!P.ready || !cur || $("#studyView").hidden) return;
  try {
    const t = P.yt.getCurrentTime(), d = P.yt.getDuration();
    if(P.state !== 5 && P.state !== -1 && typeof t === "number") P.t = t;
    if(d) { P.dur = d; const m = D.meta[videoOf(cur)] || (D.meta[videoOf(cur)] = {}); if(m.dur !== d){ m.dur = d; save(); } }
  } catch(e){}
  ui();
  if(P.playing && (++persistTick % 4 === 0)) persistTime();
}, 500);
let persistTick = 0;

function ui(){
  $("#player").classList.toggle("playing", !!P.playing);
  const pct = P.dur ? P.t/P.dur*100 : 0;
  const sc = $("#scrub");
  sc.max = Math.max(1, Math.floor(P.dur));
  if(document.activeElement !== sc) sc.value = Math.floor(P.t);
  sc.style.setProperty("--p", pct + "%");
  $("#time").textContent = `${fmt(P.t)} / ${P.dur ? fmt(P.dur) : "--:--"}`;
  $("#playBtn").innerHTML = P.playing ? ICON.pause : ICON.play;
  $("#playBtn").setAttribute("aria-label", P.playing ? "Pause" : "Play");
  $("#frame").classList.toggle("playing", P.playing);
  if(P.playing !== ui.was){ ui.was = P.playing; wake(); }
  $("#speedBtn").textContent = `${D.ui.speed}×`;
  const v = $("#vol"); v.value = D.ui.muted ? 0 : D.ui.vol; v.style.setProperty("--p", v.value + "%");
  $("#muteBtn").innerHTML = (D.ui.muted || D.ui.vol == 0) ? ICON.mute : ICON.vol;
}
$("#playBtn").onclick = () => P.toggle();
$("#bigPlay").onclick = () => P.play();
$("#cover").onclick = e => { if($("#frame").classList.contains("preview")){ if(!e.target.closest("a")) goToQuiz(); return; } if(!e.target.closest(".vid-msg")) P.play(); };
function goToQuiz(){
  if(narrowMQ.matches){ M.pane = "study"; layout(); }
  const first = document.querySelector("#actBody .opt:not([disabled]), #actBody textarea, #actFoot .btn");
  if(first){ first.focus({preventScroll:true}); first.scrollIntoView({block:"nearest", behavior:"smooth"}); }
  const panel = document.querySelector(".panel.activity"); panel.classList.remove("nudge"); void panel.offsetWidth; panel.classList.add("nudge");
}
$("#shield").onclick = () => P.toggle();
$("#backTen").onclick = () => P.seek(P.t - 10);
$("#fwdTen").onclick = () => P.seek(P.t + 10);
$("#scrub").oninput = e => P.seek(+e.target.value);
$("#vol").oninput = e => P.volume(+e.target.value);
$("#muteBtn").onclick = () => P.toggleMute();
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
$("#speedBtn").onclick = () => P.rate(SPEEDS[(SPEEDS.indexOf(D.ui.speed) + 1) % SPEEDS.length]);

/* ----- Layout: split, divider, expand, mini player ----- */
function layout(){
  app.classList.toggle("narrow", narrowMQ.matches);
  stage.classList.toggle("expanded", M.mode === "expanded");
  if(M.mode !== "expanded" && window.IntuishFsNoteOff) window.IntuishFsNoteOff();
  stage.classList.toggle("mini", M.mode === "mini");
  stage.dataset.pane = M.pane;
  if(M.mode === "split" && !narrowMQ.matches) stage.style.gridTemplateColumns = `minmax(0,${D.ui.split}fr) 16px minmax(0,${1-D.ui.split}fr)`;
  else stage.style.gridTemplateColumns = "";
  const l = Math.round(D.ui.split*100);
  $("#splitTip").textContent = `Video ${l} / ${100-l} Study`;
  $("#divider").setAttribute("aria-valuenow", l);
  $("#segVideo").setAttribute("aria-pressed", M.pane === "video");
  $("#segStudy").setAttribute("aria-pressed", M.pane === "study");
  const pl = $("#player");
  if(M.mode === "mini" && M.mini){ pl.style.setProperty("--mx", M.mini.x+"px"); pl.style.setProperty("--my", M.mini.y+"px"); pl.style.setProperty("--mr","auto"); pl.style.setProperty("--mb","auto"); }
  else ["--mx","--my","--mr","--mb"].forEach(p => pl.style.removeProperty(p));
  syncFullscreen(); wake(); save();
}
narrowMQ.addEventListener ? narrowMQ.addEventListener("change", layout) : narrowMQ.addListener(layout);
function setMode(m){ M.mode = m; if(m === "expanded") M.pane = "video"; layout(); }
function exitExpanded(){ M.mode = "split"; M.pane = narrowMQ.matches ? "video" : "study"; layout(); }
let fsOn = false;
function syncFullscreen(){
  const d = document;
  try {
    if(M.mode === "expanded" && !d.fullscreenElement && d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(()=>{});
    if(M.mode !== "expanded" && d.fullscreenElement && d.exitFullscreen) d.exitFullscreen().catch(()=>{});
  } catch(e){}
}
document.addEventListener("fullscreenchange", () => {
  if(document.fullscreenElement){ fsOn = true; return; }
  if(fsOn && M.mode === "expanded"){ fsOn = false; exitExpanded(); }
  fsOn = false;
});
let idleT;
function wake(){ const pl = $("#player"); pl.classList.remove("idle"); clearTimeout(idleT); if(M.mode === "expanded" && P.playing) idleT = setTimeout(() => pl.classList.add("idle"), 2500); }
["pointermove","pointerdown","keydown"].forEach(ev => document.addEventListener(ev, () => { if(M.mode === "expanded") wake(); }));
$("#expandBtn").onclick = () => setMode("expanded");
$("#miniExpand").onclick = () => setMode("expanded");
$("#fsReturn").onclick = exitExpanded;
$("#fsExit").onclick = exitExpanded;
$("#miniBtn").onclick = () => { M.mode = "mini"; M.pane = "study"; layout(); };
$("#miniDock").onclick = () => { M.mode = "split"; layout(); };
$("#segVideo").onclick = () => { if(M.mode === "mini") M.mode = "split"; M.pane = "video"; layout(); };
$("#segStudy").onclick = () => { if(M.mode === "expanded") M.mode = "split"; M.pane = "study"; layout(); };

const div = $("#divider");
div.addEventListener("pointerdown", e => {
  div.setPointerCapture(e.pointerId); div.classList.add("drag"); stage.classList.add("dragging");
  const r = stage.getBoundingClientRect();
  const move = ev => { D.ui.split = Math.min(.7, Math.max(.3, (ev.clientX - r.left) / r.width)); layout(); };
  const up = () => { div.classList.remove("drag"); stage.classList.remove("dragging"); div.removeEventListener("pointermove", move); div.removeEventListener("pointerup", up); div.removeEventListener("pointercancel", up); };
  div.addEventListener("pointermove", move); div.addEventListener("pointerup", up); div.addEventListener("pointercancel", up);
});
div.addEventListener("dblclick", () => { const p = [.4,.5,.6]; const i = p.findIndex(x => Math.abs(x - D.ui.split) < .02); D.ui.split = p[(i+1) % 3]; layout(); flashTip(); });
div.addEventListener("keydown", e => { if(e.key === "ArrowLeft" || e.key === "ArrowRight"){ e.preventDefault(); D.ui.split = Math.min(.7, Math.max(.3, D.ui.split + (e.key === "ArrowRight" ? .02 : -.02))); layout(); flashTip(); } });
let tipT; function flashTip(){ div.classList.add("drag"); clearTimeout(tipT); tipT = setTimeout(() => div.classList.remove("drag"), 700); }

$("#miniBar").addEventListener("pointerdown", e => {
  if(e.target.closest("button")) return;
  const pl = $("#player"), r = pl.getBoundingClientRect(), bar = $("#miniBar");
  const ox = e.clientX - r.left, oy = e.clientY - r.top;
  bar.setPointerCapture(e.pointerId); document.body.classList.add("dragging-mini");
  const move = ev => { M.mini = {x: Math.min(Math.max(8, ev.clientX-ox), innerWidth - r.width - 8), y: Math.min(Math.max(8, ev.clientY-oy), innerHeight - r.height - 8)}; layout(); };
  const up = () => { document.body.classList.remove("dragging-mini"); bar.removeEventListener("pointermove", move); bar.removeEventListener("pointerup", up); };
  bar.addEventListener("pointermove", move); bar.addEventListener("pointerup", up);
});

/* ----- Lesson text ----- */
function setChanLine(){
  const m = D.meta[videoOf(cur)] || {};
  $("#chanLine").innerHTML = `${m.author ? `<b>${esc(m.author)}</b>` : ""}${m.author && m.dur ? " · " : ""}${m.dur ? fmt(m.dur) : ""}`;
}
function setLessonText(){
  const s = subjById(cur.subj);
  $("#backLabel").textContent = s.name;
  $("#courseName").textContent = cur.course || s.name;
  $("#crumbs").innerHTML = `<span>${esc(s.name)}</span><i>›</i><span>${esc(cur.topic)}</span>`;
  $("#lessonTitle").textContent = cur.title;
  $("#miniTitle").textContent = cur.title; $("#fsTitle").textContent = cur.title;
  const k = kindOf(cur);
  if(k === "video"){ $("#ytLink").href = ytUrl(videoOf(cur), LS(cur).t); $("#ytLink").textContent = "Open on YouTube ↗"; $("#ytLink").hidden = false; setChanLine(); }
  else if(cur.url){ $("#ytLink").href = cur.url; $("#ytLink").textContent = k === "pdf" ? "Open PDF ↗" : "Open website ↗"; $("#ytLink").hidden = false; $("#chanLine").textContent = hostOf(cur.url); }
  else if(k === "link"){ $("#ytLink").href = cur.url; $("#ytLink").textContent = "Open website ↗"; $("#ytLink").hidden = false; $("#chanLine").textContent = hostOf(cur.url); }
  else { $("#ytLink").hidden = !docUrl; if(docUrl){ $("#ytLink").href = docUrl; $("#ytLink").textContent = "Open PDF ↗"; } $("#chanLine").textContent = cur.file || "PDF"; }
}

/* ----- Activity ----- */
const body = $("#actBody"), foot = $("#actFoot");
let Qs = null;
function newQ(){ Qs = {start:now(), selected:null, changes:0, attempts:0, hint:false, phase:"answer", revealed:false, review:false, text:"", selfRated:null, conf:null}; }

/* ----- How memory works: confidence, micro-rounds, stepping up, small wins ----- */
const CONF = [["guess","Guess"],["unsure","Unsure"],["certain","Certain"]];
function confRow(sel){ return `<div class="conf" role="radiogroup" aria-label="How sure are you?"><span>How sure are you?</span>${CONF.map(([k, l]) => `<button class="conf-b${sel === k ? " on" : ""}" role="radio" aria-checked="${sel === k}" data-conf="${k}">${l}</button>`).join("")}</div>`; }
function confNote(ok, c){
  if(ok && c === "guess") return "Right, on a guess. It will come back soon so it really sticks.";
  if(ok && c === "unsure") return "Right. It will come back a little sooner until it feels solid.";
  if(!ok && c === "certain") return "You felt sure about this one, so it’s worth a closer look.";
  return "";
}
const HARD = new Set(["Scenario","Application","What would you do?","Strategy","Relationship","Math problem"]);
const isHard = q => q.type === "open" || HARD.has(q.kind);
const RI = (st, p) => st.order ? st.order[p] : p;
const curQ = () => { const st = LS(cur); return itemsOf(cur)[RI(st, st.idx)]; };
function roundsOf(n){ if(n <= 5) return [n]; const k = Math.ceil(n/5), b = Math.floor(n/k), r = n % k; return Array.from({length:k}, (_, i) => b + (i < r ? 1 : 0)); }
function roundAt(n, p){ const rs = roundsOf(n); let s = 0; for(let i = 0; i < rs.length; i++){ if(p < s + rs[i]) return {i, of:rs.length, start:s, size:rs[i]}; s += rs[i]; } const l = rs.length - 1; return {i:l, of:rs.length, start:n - rs[l], size:rs[l]}; }
function spark(el){ if(!el) return; el.classList.add("spark"); try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){} }

function header(){
  const st = LS(cur), n = itemsOf(cur).length, v = st.view;
  $("#actTitle").textContent = cur.topic;
  if(v === "summary" || v === "review"){
    $("#count").textContent = `${n} / ${n}`;
    $("#dots").innerHTML = itemsOf(cur).map((_, i) => `<i class="${st.answers[i] ? "done" : ""}"></i>`).join("");
    return;
  }
  const p = v === "break" ? st.idx - 1 : Math.min(st.idx, n - 1), r = roundAt(n, p), at = v === "break" ? r.size : p - r.start + 1;
  $("#count").textContent = r.of > 1 ? `Round ${r.i+1} of ${r.of} · ${at} / ${r.size}` : `${at} / ${n}`;
  $("#dots").innerHTML = Array.from({length:r.size}, (_, j) => { const i = r.start + j; return `<i class="${st.answers[i] ? "done" : (i === st.idx && v === "q") ? "now" : ""}"></i>`; }).join("");
}
function render(){
  header();
  const v = LS(cur).view;
  if(v === "summary") renderSummary(); else if(v === "review") renderReview(); else if(v === "break") renderBreak(); else renderQ();
  body.scrollTop = 0;
}
function renderQ(){
  const st = LS(cur), q = curQ(); if(!Qs) newQ();
  const open = q.type === "open", fb = Qs.phase === "feedback";
  let html = `<div class="view">`;
  if(st.idx === 0 && !st.answers.length && Qs.phase === "answer" && !cur.questions) html += `<p class="lead muted" style="margin:0">${kindOf(cur) === "video" ? "Watch" : "Read"} as much as you need, then answer from memory. There are no wrong answers here, just a check on what stuck.</p>`;
  else if(st.idx === 0 && !st.answers.length && Qs.phase === "answer") html += `<p class="lead muted" style="margin:0">Let’s see what you understood.</p>`;
  html += `<div class="eyebrow"><span>${esc(q.kind)}</span>${st.up === st.idx ? `<span class="up-tag">Stepping it up</span>` : ""}</div><p class="prompt" id="qPrompt">${esc(q.prompt)}</p>`;
  if(open){
    html += `<div style="display:flex;flex-direction:column;gap:8px"><label class="label" for="openAns">Your answer</label>
      <textarea id="openAns" placeholder="Write it in your own words…" ${fb?"disabled":""}>${esc(Qs.text)}</textarea></div>`;
  } else {
    html += `<div class="options" role="radiogroup" aria-labelledby="qPrompt">` + q.options.map((o, i) => {
      let cls = ""; const showRight = fb && (Qs.correct || Qs.revealed) && i === q.answer;
      if(showRight) cls = "right"; else if(fb && i === Qs.selected && !Qs.correct) cls = "wrong";
      return `<button class="opt ${cls}" role="radio" aria-checked="${Qs.selected===i}" data-i="${i}" ${fb?"disabled":""}><span class="k">${"ABCD"[i]}</span><span>${esc(o)}</span>${showRight?`<span class="mark">${ICON.check}</span>`:""}</button>`;
    }).join("") + `</div>`;
  }
  if(!open && !fb && Qs.selected !== null && !Qs.attempts) html += confRow(Qs.conf);
  if(Qs.hint && !fb) html += `<div class="hint" role="note">${ICON.bulb}<span>${esc(q.hint)}</span></div>`;
  if(fb){
    const flag = `<div class="row"><button class="flag" id="flagBtn" aria-pressed="${Qs.review}">${ICON.flag} ${Qs.review?"Marked for review":"Mark for review"}</button></div>`;
    if(open){
      html += `<div class="feedback"><h3>${cur.questions ? "What a teacher would look for" : "Check yourself"}</h3><p>${esc(q.model)}</p>
        <ul style="margin:6px 0 0;padding-left:18px;color:var(--ink-2)">${q.look.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        ${Qs.selfRated === null ? `<div class="row"><span class="muted" style="font-size:13.5px">Did your answer cover this?</span><button class="flag" id="rateYes">Mostly, yes</button><button class="flag" id="rateNo">Not really</button></div>` : `<div class="row"><span class="muted" style="font-size:13.5px">${Qs.selfRated ? "Noted." : "Noted. Worth another look at the video."}</span></div>`}
      </div>`;
    } else {
      const cn = Qs.attempts === 1 && !Qs.revealed ? confNote(Qs.correct, Qs.conf) : "", note = cn ? `<p class="conf-note">${cn}</p>` : "";
      if(Qs.correct) html += `<div class="feedback good"><h3>Correct.</h3><p>${esc(q.right)}</p>${note}</div>`;
      else if(Qs.revealed) html += `<div class="feedback"><h3>The answer is ${"ABCD"[q.answer]}.</h3><p>${esc(q.right)}</p>${flag}</div>`;
      else html += `<div class="feedback"><h3>Not quite.</h3><p>${esc(q.wrong)}</p>${note}${flag}</div>`;
    }
  }
  body.innerHTML = html + `</div>`;

  if(!fb){
    const ready = open ? Qs.text.trim().length > 3 : Qs.selected !== null && (!!Qs.conf || Qs.attempts > 0);
    foot.innerHTML = `<button class="ghost" id="explainBtn" ${Qs.hint?"disabled style='opacity:.45'":""}>${ICON.bulb} Explain</button><span class="grow"></span><button class="btn" id="checkBtn" ${ready?"":"disabled"}>${open?"Compare":"Check Answer"}</button>`;
  } else if(open) foot.innerHTML = `<span class="grow"></span><button class="btn" id="nextBtn" ${Qs.selfRated===null?"disabled":""}>Continue <span aria-hidden="true">→</span></button>`;
  else if(Qs.correct || Qs.revealed) foot.innerHTML = `<span class="grow"></span><button class="btn" id="nextBtn">Continue <span aria-hidden="true">→</span></button>`;
  else foot.innerHTML = `<button class="ghost" id="revealBtn">Show answer</button><span class="grow"></span><button class="btn" id="retryBtn">Try again</button>`;

  body.querySelectorAll(".opt").forEach(b => b.onclick = () => select(+b.dataset.i));
  body.querySelectorAll("[data-conf]").forEach(b => b.onclick = () => { Qs.conf = b.dataset.conf; renderQ(); });
  const ta = $("#openAns"); if(ta) ta.oninput = () => { Qs.text = ta.value; const c = $("#checkBtn"); if(c) c.disabled = Qs.text.trim().length <= 3; };
  const on = (id, f) => { const n = document.getElementById(id); if(n) n.onclick = f; };
  on("explainBtn", () => { Qs.hint = true; renderQ(); });
  on("checkBtn", check); on("nextBtn", next);
  on("retryBtn", () => { Qs.phase = "answer"; Qs.selected = null; renderQ(); });
  on("revealBtn", () => { Qs.revealed = true; Qs.review = true; renderQ(); });
  on("flagBtn", () => { Qs.review = !Qs.review; renderQ(); });
  on("rateYes", () => { Qs.selfRated = true; Qs.correct = true; renderQ(); });
  on("rateNo", () => { Qs.selfRated = false; Qs.correct = false; Qs.review = true; renderQ(); });
}
function select(i){ if(Qs.phase !== "answer") return; if(Qs.selected !== null && Qs.selected !== i) Qs.changes++; Qs.selected = i; renderQ(); }
function check(){
  const q = curQ();
  if(q.type !== "open" && !Qs.attempts && !Qs.conf) return;
  Qs.attempts++;
  if(!Qs.ms) Qs.ms = now() - Qs.start; // first-attempt response time, collected quietly
  Qs.phase = "feedback";
  if(q.type !== "open"){ Qs.correct = Qs.selected === q.answer; if(!Qs.correct) Qs.review = true; }
  renderQ();
  if(Qs.correct && q.type !== "open") spark(body.querySelector(".opt.right"));
  const f = body.querySelector(".feedback"); if(f) f.scrollIntoView({block:"nearest", behavior:"smooth"});
}
function next(){
  const st = LS(cur), q = curQ(), Q = itemsOf(cur), n = Q.length;
  if(!st.sessionStart) st.sessionStart = Qs.start;
  const firstTry = !!Qs.correct && Qs.attempts === 1 && !Qs.revealed, ok = q.type === "open" ? !!Qs.selfRated : firstTry;
  st.answers[st.idx] = {correct:firstTry, ms:Qs.ms, attempts:Qs.attempts, changed:Qs.changes>0, hint:Qs.hint, review:Qs.review, conf:Qs.conf};
  recordAnswer(qid(cur, RI(st, st.idx)), ok, Qs.ms, !!q.options, {attempts:Qs.attempts, changed:Qs.changes>0, hint:Qs.hint, src:"lesson", conf:Qs.conf || undefined});
  st.run = ok ? (st.run || 0) + 1 : 0;
  st.idx++;
  // Three right in a row: bring the nearest harder question forward.
  if(st.run >= 3 && st.idx < n){
    if(!st.order) st.order = Q.map((_, i) => i);
    if(!isHard(Q[st.order[st.idx]])){ for(let p = st.idx + 1; p < n; p++) if(isHard(Q[st.order[p]])){ [st.order[st.idx], st.order[p]] = [st.order[p], st.order[st.idx]]; st.up = st.idx; break; } }
    else st.up = st.idx;
    st.run = 0;
  }
  const ends = roundsOf(n).reduce((a, x) => (a.push((a[a.length-1] || 0) + x), a), []);
  if(st.idx >= n){ st.view = "summary"; st.finishedAt = now(); }
  else if(ends.includes(st.idx)) st.view = "break";
  newQ(); save(); render();
}
function results(){
  const st = LS(cur), a = st.answers.filter(Boolean);
  const correct = a.filter(x => x.correct).length, review = a.filter(x => !x.correct || x.review).length;
  const avg = a.length ? a.reduce((s,x) => s + (x.ms||0), 0)/a.length/1000 : 0;
  const mins = Math.max(1, Math.round(((st.finishedAt || now()) - (st.sessionStart || now()))/60000));
  return {a, correct, review, avg, mins};
}
function renderBreak(){
  const st = LS(cur), n = itemsOf(cur).length, r = roundAt(n, st.idx - 1);
  const a = st.answers.slice(r.start, r.start + r.size).filter(Boolean), ok = a.filter(x => x.correct).length;
  body.innerHTML = `<div class="view center-v">
    <div class="eyebrow"><span>Round ${r.i+1} of ${r.of} done</span></div>
    <div class="big">${ok}<small> / ${r.size}</small></div>
    <p class="lead">${ok === r.size ? "All on the first try." : ok ? "The ones that slipped will come back in Remember." : "These will come back in Remember, spaced out so they stick."} Take a breath, or keep going.</p>
  </div>`;
  foot.innerHTML = `<a class="ghost" href="#/">Stop for now</a><span class="grow"></span><button class="btn" id="nextRound">Next round <span aria-hidden="true">→</span></button>`;
  $("#nextRound").onclick = () => { st.view = "q"; newQ(); save(); render(); };
}
function teachCard(st){
  if(st.teach) return `<div class="teach done"><small>In your words</small><p>${esc(st.teach)}</p></div>`;
  if(st.teachSkip) return "";
  return `<div class="teach" id="teach">
    <div class="teach-h"><svg class="teach-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15"/><circle class="fill" cx="18" cy="18" r="15"/></svg><div><b>Teach it back</b><small>Explain ${esc(cur.topic)} in one sentence, as if to a 10-year-old. About 30 seconds.</small></div></div>
    <form class="note-line" id="teachForm"><input id="teachText" type="text" maxlength="240" autocomplete="off" placeholder="It’s like…" aria-label="Your one-sentence explanation"><button class="note-add" type="submit">Save</button></form>
    <button class="linkish teach-skip" id="teachSkip" type="button">Skip</button>
  </div>`;
}
function renderSummary(){
  const r = results(), n = itemsOf(cur).length, st = LS(cur);
  body.innerHTML = `<div class="view center-v">
    <p class="prompt" style="font-size:22px">Session complete.</p>
    <div class="big">${r.correct}<small> / ${n}</small></div>
    <p class="lead">${r.review ? `${r.review} concept${r.review>1?"s":""} to review. ${cur.questions ? "They’ll come back in Remember soon." : ""}` : "Nothing to review. Nice and steady."}</p>
    <div class="stats">
      <div class="stat"><b>${r.mins} min</b><span>Practicing</span></div>
      <div class="stat"><b>${r.avg.toFixed(1)} sec</b><span>Average response</span></div>
      <div class="stat"><b>${r.a.filter(x => x.hint).length}</b><span>Hints used</span></div>
    </div>
    ${teachCard(st)}
  </div>`;
  const tf = $("#teachForm");
  if(tf){
    const ti = $("#teachText"); ti.onkeydown = e => e.stopPropagation();
    tf.onsubmit = ev => {
      ev.preventDefault(); const text = ti.value.trim(); if(!text) return;
      st.teach = text;
      if(D.notes.length < 60){ D.notes.unshift({id:"n" + now().toString(36), text:`In my words: ${text}`, t:now(), lesson:cur.id, subj:cur.subj, topic:cur.topic, title:cur.title}); if(window.IntuishExtras) window.IntuishExtras.renderNotes(); }
      save(); renderSummary(); toast("Saved to your notes");
    };
    $("#teachSkip").onclick = () => { st.teachSkip = true; save(); renderSummary(); };
  }
  foot.innerHTML = `${r.review ? `<button class="ghost" id="revBtn">Review mistakes</button>` : `<button class="ghost" id="againBtn">Practice again</button>`}<span class="grow"></span><button class="btn" id="doneBtn">Finish</button>`;
  const rb = $("#revBtn"); if(rb) rb.onclick = () => { LS(cur).view = "review"; save(); render(); };
  const ab = $("#againBtn"); if(ab) ab.onclick = restartLesson;
  $("#doneBtn").onclick = () => openMastery(true);
}
function renderReview(){
  const st = LS(cur), Q = itemsOf(cur);
  const items = st.answers.map((x, i) => ({x, q:Q[RI(st, i)]})).filter(o => o.x && (!o.x.correct || o.x.review));
  body.innerHTML = `<div class="view"><p class="prompt" style="font-size:21px">To review</p><div class="list">` +
    items.map(({q}) => `<div class="item"><b>${esc(q.prompt)}</b><p>${q.type === "open" ? esc(q.model) : `${"ABCD"[q.answer]}. ${esc(q.options[q.answer])}. ${esc(q.right)}`}</p></div>`).join("") +
    `</div></div>`;
  foot.innerHTML = `<button class="ghost" id="backSum">Back</button><span class="grow"></span><button class="btn" id="doneBtn">Finish</button>`;
  $("#backSum").onclick = () => { LS(cur).view = "summary"; save(); render(); };
  $("#doneBtn").onclick = () => openMastery(true);
}
function restartLesson(){ const t = LS(cur).t; D.lessons[cur.id] = {idx:0, answers:[], view:"q", t}; newQ(); save(); render(); toast("Starting the questions over"); }

function openMastery(fromDone){
  const s = subjById(cur.subj), ss = subjStats(s);
  const rows = topicsOf(s).map(t => ({t, x:topicStats(s.id, t)})).filter(r => r.x.total);
  const due = dueItems().length;
  const w = sheet(`
    <div class="sheet-head"><div><div class="eyebrow">${esc(s.name)}</div><h2>What you know</h2></div><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
    <p class="lead" style="margin:0">You’ve demonstrated knowledge of <b>${ss.pct}%</b> of this material.</p>
    <div>${rows.map(({t, x}) => {
      const pill = x.st === "s" ? ["Strong","strong"] : x.st === "l" ? ["Learning",""] : x.st === "r" ? ["Needs review","review"] : ["Not started","none"];
      const line = x.seen ? `${x.known} of ${x.total} known${x.acc!=null?` · ${x.acc}% accurate`:""}${x.avgMs?` · ${(x.avgMs/1000).toFixed(1)} sec average`:""}${x.slower?" · answers getting slower":""}` : "Not practiced yet";
      return `<div class="topic"><b>${esc(t)}</b><span class="pill ${pill[1]}">${pill[0]}</span><small>${line}</small></div>`; }).join("")}</div>
    <p class="muted" style="margin:0;font-size:12.5px">Based on whether your latest answer to each question was right, how accurate you are over time, and whether you’re getting faster or slower.</p>
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
      ${due ? `<a class="btn outline" href="#/remember" data-close>Remember · ${due}</a>` : ""}
      ${fromDone ? `<a class="btn" href="#/" data-close data-focus>Back to Home</a>` : `<button class="btn" data-close data-focus>Close</button>`}
    </div>`);
}

/* ----- Study menu ----- */
function openTimer(){
  const w = sheet(`
    <div class="sheet-head"><div><div class="eyebrow">Study timer</div><h2>How long?</h2></div><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
    <div class="timer-grid">${[15,25,45,60].map(m => `<button class="timer-opt" data-m="${m}"><b>${m}</b><span>min</span></button>`).join("")}</div>
    <button class="btn outline" data-m="0" style="align-self:stretch;justify-content:center">Just track my time</button>
    <p class="muted" style="margin:0;font-size:13px">It shows quietly under the clock. No alarms, just a small note when time’s up.</p>`);
  w.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { const m = +b.dataset.m; D.timer = {start:now(), dur:m || null}; save(); w.remove(); tickClocks(); toast(m ? `${m} min timer started` : "Tracking your study time"); });
}
$("#moreBtn").onclick = e => {
  e.stopPropagation();
  const due = dueItems().length;
  const vid = kindOf(cur) === "video";
  menu($("#moreBtn"), [
    ["timer", D.timer ? "Stop study timer" : "Study timer", D.timer ? "" : "Off"],
    vid && ["mini", M.mode === "mini" ? "Dock video" : "Mini player", ""],
    vid && ["expand", M.mode === "expanded" ? "Return to Study" : "Expand video", "Esc"],
    ["remember", "Remember", due ? `${due} due` : ""],
    ["mastery", "What you know", ""],
    ["notes", "Notes", D.notes && D.notes.length ? String(D.notes.length) : ""],
    "hr",
    vid && ["video", "Use another video", ""],
    ["restart", "Start questions over", ""]
  ].filter(Boolean), a => {
    if(a === "timer"){ if(D.timer){ D.timer = null; save(); tickClocks(); toast("Timer stopped"); } else openTimer(); }
    if(a === "mini"){ M.mode = M.mode === "mini" ? "split" : "mini"; M.pane = "study"; layout(); }
    if(a === "expand"){ M.mode === "expanded" ? exitExpanded() : setMode("expanded"); }
    if(a === "remember") location.hash = "#/remember";
    if(a === "mastery") openMastery(false);
    if(a === "notes") window.IntuishExtras.openNotes();
    if(a === "video") changeVideo();
    if(a === "restart") restartLesson();
  });
};

document.addEventListener("keydown", e => {
  if($("#studyView").hidden) return;
  if(e.key === "Escape"){ if(closeOverlays()) return; if(M.mode === "expanded") exitExpanded(); return; }
  if(e.target.closest("input,textarea,[contenteditable]") || document.querySelector(".sheet-wrap")) return;
  if(M.mode === "expanded" && (e.key === " " || e.key === "k")){ e.preventDefault(); P.toggle(); wake(); return; }
  if(M.mode === "expanded" && (e.key === "ArrowLeft" || e.key === "ArrowRight")){ e.preventDefault(); P.seek(P.t + (e.key === "ArrowRight" ? 5 : -5)); return; }
  if(LS(cur).view === "q" && Qs && Qs.phase === "answer"){
    const k = e.key.toLowerCase(), i = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
    const q = curQ();
    if(i >= 0 && q.options && e.key.length === 1){ select(i); return; }
    if(e.key === "Enter" && Qs.selected !== null && (Qs.conf || Qs.attempts || !q.options) && !e.target.closest("button")) check();
  }
});

let docUrl = null;
async function mountDoc(L){
  const slot = $("#docSlot");
  if(docUrl){ URL.revokeObjectURL(docUrl); docUrl = null; }
  if(L.url){
    const pdf = kindOf(L) === "pdf";
    slot.innerHTML = `<div class="doc-card"><span class="src-thumb ${pdf ? "pdf" : "link"} big">${KIND[kindOf(L)].icon.replace(/width="16" height="16"/, 'width="44" height="44"')}</span>
      <b>${esc(L.title)}</b><span class="muted">${esc(hostOf(L.url))}</span>
      <p class="muted">${pdf ? "This PDF opens in its own tab." : "Most websites don’t allow being shown inside other apps, so it opens in its own tab."} Read what you need, then come back and practice from memory.</p>
      <a class="btn" href="${esc(L.url)}" target="_blank" rel="noopener">${pdf ? "Open PDF" : "Open website"} ↗</a></div>`;
    return;
  }
  slot.innerHTML = `<div class="doc-card"><span class="muted">Opening your PDF…</span></div>`;
  let blob = null; try { blob = await PDFS.get(L.id); } catch(e){}
  if(cur !== L) return;
  if(!blob){ slot.innerHTML = `<div class="doc-card"><b>This PDF isn’t on this device.</b><p class="muted">PDFs are saved in the browser you added them from. Remove this source and add the PDF again here.</p></div>`; setLessonText(); return; }
  docUrl = URL.createObjectURL(blob);
  slot.innerHTML = `<iframe class="pdf-frame" src="${docUrl}#view=FitH" title="${esc(L.title)}"></iframe>`;
  setLessonText();
}
function openStudy(L){
  const changed = !cur || cur.id !== L.id;
  cur = L;
  if(changed){ newQ(); M.mode = "split"; M.pane = narrowMQ.matches ? "video" : "study"; }
  const isVideo = kindOf(L) === "video";
  stage.classList.toggle("doc", !isVideo);
  $(".player-slot").hidden = !isVideo; $("#docSlot").hidden = isVideo;
  if(!isVideo){ if(P.playing) P.pause(); if(changed) mountDoc(L); }
  setLessonText(); layout(); render(); ui(); if(changed && window.IntuishExtras) window.IntuishExtras.renderNotes();
  if(isVideo && (changed || !P.ready)) mountVideo();
  if(isVideo && !P.apiReady && !P.apiFailed && !loadApi.done){ loadApi.done = true; loadApi(); }
}
function leaveStudy(){
  if(!cur) return;
  if(P.playing) P.pause();
  persistTime();
  if(M.mode === "expanded"){ M.mode = "split"; syncFullscreen(); }
}

/* ======================= REMEMBER ======================= */
let R = null; // {items:[{L,i}], idx, results:[], sel, done, start}
const REM_SIZE = 5;
// Mix subjects: take 2 from one, 1 from the next, and so on, so each review switches context.
function interleave(list, max){
  const by = new Map();
  list.slice().sort((a, b) => (a.q && b.q ? a.q.due - b.q.due : 0)).forEach(x => { const k = x.L.subj; if(!by.has(k)) by.set(k, []); by.get(k).push(x); });
  const qs = [...by.values()].sort((a, b) => b.length - a.length), out = []; let take = 2;
  while(out.length < max && qs.some(q => q.length)){
    for(const q of qs){ if(out.length >= max) break; if(!q.length) continue; out.push(...q.splice(0, Math.min(take, max - out.length))); take = take === 2 ? 1 : 2; }
  }
  return out;
}
function startRemember(list){ const items = interleave(list, REM_SIZE); R = {items:items.map(x => ({L:x.L, i:x.i})), idx:0, results:[], sel:null, done:false, conf:null, start:now(), mixed:new Set(items.map(x => x.L.subj)).size}; }
function renderRemember(){
  const body = $("#remBody"), foot = $("#remFoot");
  if(!R){ const due = dueItems(); if(due.length) startRemember(due); }
  if(!R || !R.items.length){
    const sch = scheduledItems();
    $("#remTitle").textContent = "Remember"; $("#remCountTop").textContent = ""; $("#remDots").innerHTML = "";
    body.innerHTML = sch.length
      ? `<div class="view center-v"><p class="prompt">Nothing to remember right now.</p><p class="lead">The next question comes back ${inDays(sch[0].q.due - now())}. Intuish brings things back just before you’d forget them.</p></div>`
      : `<div class="view center-v"><p class="prompt">Nothing here yet.</p><p class="lead">Remember brings back questions you’ve answered before, spaced out so they stick. Finish a lesson and they’ll start showing up here.</p></div>`;
    foot.innerHTML = sch.length ? `<button class="ghost" id="remAnyway">Practice anyway</button><span class="grow"></span><a class="btn" href="#/">Back to Home</a>` : `<span class="grow"></span><a class="btn" href="#/">Back to Home</a>`;
    const a = $("#remAnyway"); if(a) a.onclick = () => { startRemember(sch.slice(0, 5)); renderRemember(); };
    return;
  }
  const n = R.items.length;
  $("#remTitle").textContent = R.mixed > 1 ? `Remember · ${R.mixed} subjects mixed` : "Remember";
  $("#remCountTop").textContent = `${Math.min(R.idx+1, n)} / ${n}`;
  $("#remDots").innerHTML = R.items.map((_, i) => `<i class="${i < R.idx ? "done" : i === R.idx ? "now" : ""}"></i>`).join("");
  if(R.idx >= n){
    const kept = R.results.filter(Boolean).length;
    const more = dueItems().length;
    body.innerHTML = `<div class="view center-v"><p class="prompt">${more ? "Round done." : "That’s everything for now."}</p><div class="big">${kept}<small> / ${n}</small></div><p class="lead">The ones you remembered move further out. The others come back sooner.${more ? ` ${more} more ${more === 1 ? "is" : "are"} waiting whenever you’re ready.` : ""}</p></div>`;
    foot.innerHTML = more ? `<a class="ghost" href="#/">Back to Home</a><span class="grow"></span><button class="btn" id="remMore">Keep going <span aria-hidden="true">→</span></button>` : `<span class="grow"></span><a class="btn" href="#/">Back to Home</a>`;
    R = null;
    const km = $("#remMore"); if(km) km.onclick = () => { startRemember(dueItems()); renderRemember(); };
    return;
  }
  const {L, i} = R.items[R.idx], q = itemsOf(L)[i], rec = D.q[qid(L, i)] || {}, s = subjById(L.subj);
  const ago = Math.floor((now() - (rec.first || now()))/DAY);
  const lead = rec.sure ? "You felt sure about this one last time, but it slipped. Take it slowly." : rec.lastCorrect === false ? "This one slipped last time. Let’s see if it’s there now." : ago >= 1 ? `You learned this ${ago} day${ago>1?"s":""} ago. Let’s see if you still remember it.` : "You saw this earlier. Let’s see if it stuck.";
  const fb = R.done, ok = R.sel === q.answer;
  let nextTxt = "";
  if(fb){ const d = D.q[qid(L, i)]; nextTxt = d.box === 0 ? "This comes back again soon." : `Next review ${inDays(d.due - now())}.`; }
  const cn = fb ? confNote(ok, R.conf) : "";
  body.innerHTML = `<div class="view">
    <div class="eyebrow"><span>${esc(s.name)} · ${esc(L.topic)}</span></div>
    <p class="lead">${lead}</p>
    <p class="prompt" id="rPrompt">${esc(q.prompt)}</p>
    <div class="options" role="radiogroup" aria-labelledby="rPrompt">${q.options.map((o, k) => {
      const cls = fb ? (k === q.answer ? "right" : (k === R.sel ? "wrong" : "")) : "";
      return `<button class="opt ${cls}" role="radio" aria-checked="${R.sel===k}" data-i="${k}" ${fb?"disabled":""}><span class="k">${"ABCD"[k]}</span><span>${esc(o)}</span>${fb && k === q.answer ? `<span class="mark">${ICON.check}</span>` : ""}</button>`; }).join("")}</div>
    ${!fb && R.sel !== null ? confRow(R.conf) : ""}
    ${R.hint && !fb ? `<div class="hint" role="note">${ICON.bulb}<span>${esc(q.hint)}</span></div>` : ""}
    ${fb ? `<div class="feedback${ok ? " good" : ""}"><h3>${ok ? "Still there." : "It slipped a little."}</h3><p>${esc(q.right)}</p>${cn ? `<p class="conf-note">${cn}</p>` : ""}<p class="muted" style="font-size:13.5px;margin-top:4px">${nextTxt}</p></div>` : ""}
  </div>`;
  foot.innerHTML = fb ? `<span class="grow"></span><button class="btn" id="remNext">Continue <span aria-hidden="true">→</span></button>`
    : `<button class="ghost" id="remHint" ${R.hint?"disabled style='opacity:.45'":""}>${ICON.bulb} Explain</button><span class="grow"></span><button class="btn" id="remCheck" ${R.sel===null || !R.conf?"disabled":""}>Check Answer</button>`;
  body.querySelectorAll(".opt").forEach(b => b.onclick = () => { if(!R.done){ R.sel = +b.dataset.i; renderRemember(); } });
  body.querySelectorAll("[data-conf]").forEach(b => b.onclick = () => { R.conf = b.dataset.conf; renderRemember(); });
  const c = $("#remCheck"); if(c) c.onclick = remCheck;
  const h = $("#remHint"); if(h) h.onclick = () => { R.hint = true; renderRemember(); };
  const nx = $("#remNext"); if(nx) nx.onclick = () => { R.idx++; R.sel = null; R.conf = null; R.done = false; R.hint = false; R.start = now(); renderRemember(); };
}
function remCheck(){
  if(R.sel === null || !R.conf) return;
  const {L, i} = R.items[R.idx], q = itemsOf(L)[i], ok = R.sel === q.answer && !R.hint;
  R.done = true; R.results[R.idx] = R.sel === q.answer;
  recordAnswer(qid(L, i), ok, now() - R.start, true, {src:"remember", hint:!!R.hint, conf:R.conf});
  renderRemember();
  if(R.sel === q.answer) spark($("#remBody .opt.right"));
}
document.addEventListener("keydown", e => {
  if($("#rememberView").hidden || !R || R.done || R.idx >= R.items.length || e.target.closest("input,textarea")) return;
  const k = e.key.toLowerCase(), i = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
  if(i >= 0 && e.key.length === 1){ R.sel = i; renderRemember(); }
  else if(e.key === "Enter" && R.sel !== null && !e.target.closest("button")) remCheck();
});

/* ======================= ROUTER ======================= */
const views = ["homeView","readyView","rememberView","studyView"];
function show(id){ views.forEach(v => $("#"+v).hidden = v !== id); document.body.classList.toggle("in-study", id === "studyView"); window.scrollTo(0, 0); }
function route(){
  const h = location.hash.replace(/^#\/?/, "").split("/");
  closeOverlays();
  if(h[0] !== "study") leaveStudy();
  if((h[0] === "ready" || h[0] === "study") && lessonById(h[1])){
    const L = lessonById(h[1]);
    if(h[0] === "ready"){ show("readyView"); renderReady(L); }
    else { show("studyView"); openStudy(L); }
  } else if(h[0] === "remember"){
    show("rememberView"); if(R && R.idx >= R.items.length) R = null; renderRemember();
  } else {
    show("homeView"); renderHome();
  }
  tickClocks();
}
// Email sign-in links come back as #access_token=…; keep it for extras.js and clear it before routing
if(/access_token=/.test(location.hash)){ try { sessionStorage.setItem("intuish.auth", location.hash.slice(1)); } catch(e){} history.replaceState(null, "", location.pathname + location.search + "#/"); }
window.addEventListener("hashchange", route);
window.addEventListener("beforeunload", () => { persistTime(); saveNow(); });
document.addEventListener("visibilitychange", () => { if(document.hidden){ persistTime(); saveNow(); } });
document.addEventListener("keydown", e => { if(e.key === "Escape" && $("#studyView").hidden) closeOverlays(); });
setInterval(() => { if(!$("#homeView").hidden) renderPulse(); }, 30000);
/* Intuish extras: profile photo, Settings, passwordless email sign-in, notes board */
D.profile = Object.assign({name:"", photo:"", email:"", session:null}, D.profile || {});
D.notes = D.notes || [];

/* ----- Email sign-in (magic link, no password) -----
   Works once Intuish is hosted with a free Supabase project: set window.INTUISH_AUTH = {url, anonKey} in js/config.js. */
const AUTH = window.INTUISH_AUTH && window.INTUISH_AUTH.url ? window.INTUISH_AUTH : null;
async function sendLink(email){
  if(!AUTH) throw new Error("offline");
  const redirect = location.origin + location.pathname;
  const r = await fetch(`${AUTH.url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, {method:"POST", headers:{apikey:AUTH.anonKey, "Content-Type":"application/json"}, body:JSON.stringify({email, create_user:true})});
  if(!r.ok) throw new Error("send");
}
async function finishSignIn(){
  let raw; try { raw = sessionStorage.getItem("intuish.auth"); sessionStorage.removeItem("intuish.auth"); } catch(e){}
  if(!raw || !AUTH) return;
  const p = new URLSearchParams(raw), token = p.get("access_token"); if(!token) return;
  try {
    const r = await fetch(`${AUTH.url}/auth/v1/user`, {headers:{apikey:AUTH.anonKey, Authorization:`Bearer ${token}`}});
    const u = await r.json();
    D.profile.email = u.email || D.profile.email; D.profile.session = {access:token, refresh:p.get("refresh_token"), exp:now() + (+p.get("expires_in") || 3600) * 1000};
    save(); renderAvatar(); toast(`Signed in as ${D.profile.email}`);
  } catch(e){ toast("That sign-in link didn’t work. Try sending a new one."); }
}

/* ----- Profile icon ----- */
// Photo, else the first letter of the user's name, else a plain person icon until they add a name
const PERSON = '<svg class="av-person" width="58%" height="58%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8.2" r="4.2"/><path d="M3.8 20.6c.9-4.1 4.2-6.6 8.2-6.6s7.3 2.5 8.2 6.6c.1.5-.3.9-.8.9H4.6c-.5 0-.9-.4-.8-.9z"/></svg>';
function avatarInner(pr){
  if(pr.photo) return `<img src="${pr.photo}" alt="">`;
  const n = (pr.name || pr.email || "").trim();
  return n ? esc(n.charAt(0).toUpperCase()) : PERSON;
}
function renderAvatar(){
  const b = $("#avatarBtn"); if(!b) return;
  b.innerHTML = avatarInner(D.profile);
  b.classList.toggle("has-photo", !!D.profile.photo);
  b.setAttribute("aria-label", "Profile");
}
function pickPhoto(onDone){
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
  inp.onchange = () => {
    const f = inp.files[0]; if(!f) return;
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const s = Math.min(img.width, img.height), c = document.createElement("canvas"); c.width = c.height = 256;
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
      D.profile.photo = c.toDataURL("image/jpeg", .85); URL.revokeObjectURL(url); save(); renderAvatar(); onDone && onDone();
    };
    img.onerror = () => toast("That image couldn’t be opened");
    img.src = url;
  };
  inp.click();
}

/* ----- Settings ----- */
const SET_PAGES = [
  ["profile", "Profile", "Name and photo"],
  ["photos", "Subject photos", "Change the picture for each subject"],
  ["account", "Account", AUTH ? "Email sign-up" : "Email sign-in coming soon"],
  ["fonts", "Fonts", "Choose the font for each part of the app"],
  ["notes", "Notes", "Your notes from the last 30 days"],
  ["install", "Get the app", "Put Intuish on your home screen or desktop"],
  ["data", "Your data", "Erase progress"]
];
function openSettings(page){
  if(page === "notes"){ openNotes(true); return; }
  const pr = D.profile, signed = !!(pr.session && pr.email);
  const ICO = {profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', photos:'<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>', account:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 7l9 6 9-6"/>', fonts:'<path d="M4 20l6-16h1l6 16M6.5 14h8"/><path d="M17 20h4"/>', install:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 7v7M9 11l3 3 3-3M10 18h4"/>', notes:'<path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>', data:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'};
  const icon = k => `<span class="set-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</svg></span>`;
  const PAGES = {
    profile: `      <div class="set-profile"><button class="avatar big ${pr.photo ? "has-photo" : ""}" id="setPhoto" aria-label="Change profile photo">${avatarInner(pr)}</button>
        <div class="set-col"><input id="setName" type="text" maxlength="30" placeholder="Your name" value="${esc(pr.name)}" autocomplete="name">
        <div class="set-row"><button class="linkish" id="setPhoto2">${pr.photo ? "Change photo" : "Add a photo"}</button>${pr.photo ? `<button class="linkish" id="rmPhoto">Remove</button>` : ""}</div></div></div>`,
    photos: `      <p class="set-p">Tap a subject to choose your own photo for it.</p>
      <div class="sp-grid">${mySubjects().map(sb => `<div class="sp-item"><button class="sp-pick" data-sp="${sb.id}" aria-label="Change ${esc(sb.name)} photo"><span class="sp-art">${artFor(sb)}</span><span class="sp-cam" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span></button><div class="sp-name"><b>${esc(sb.name)}</b>${D.photos && D.photos[sb.id] ? `<button class="linkish" data-sp-reset="${sb.id}">Use original</button>` : ""}</div></div>`).join("")}</div>`,
    account: `      ${signed ? `<p class="set-p">Signed in as <b>${esc(pr.email)}</b></p><div><button class="btn outline" id="signOut">Sign out</button></div>`
      : !AUTH ? `<p class="set-p"><b>Email sign-in isn’t working yet.</b> It’s coming in a future update. Your progress, notes and photos are saved on this device until then.</p>`
      : `<p class="set-p">Sign up with your email. We’ll send a link to verify it, no password needed.</p>
        <form id="signForm" class="set-inline"><input id="signEmail" type="email" required placeholder="you@example.com" value="${esc(pr.email)}" autocomplete="email"><button class="btn" type="submit">Send link</button></form>
        <p class="set-note" id="signNote"></p>`}`,
    fonts: page === "fonts" ? fontsPage() : "",
    install: page === "install" ? installPage() : "",
    data: `      <div class="set-row"><button class="btn outline" id="setNotes">Notes</button><button class="btn outline" id="setReset">Erase all my progress</button></div>
      <p class="set-note">Progress, notes and PDFs are saved in this browser.</p>`
  };
  const cur = SET_PAGES.find(x => x[0] === page);
  const w = sheet(cur
    ? `<div class="sheet-head set-head"><button class="set-back" id="setBack" aria-label="Back to Settings"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Settings</button><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
       <h2 class="set-title">${cur[1]}</h2><section class="set-sec set-page">${PAGES[page]}</section>`
    : `<div class="sheet-head"><div><div class="eyebrow">Intuish</div><h2>Settings</h2></div><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
       <nav class="set-list">${SET_PAGES.map(([k, t, sub]) => `<button class="set-item" data-page="${k}">${icon(k)}<span class="set-it"><b>${t}</b><small>${k === "account" && signed ? esc(pr.email) : sub}</small></span><svg class="set-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>`).join("")}</nav>`);
  w.querySelector(".sheet").classList.add("set-sheet");
  const q = sel => w.querySelector(sel);
  if(!cur){ q(".set-list").onclick = e => { const b = e.target.closest("[data-page]"); if(b){ w.remove(); openSettings(b.dataset.page); } }; return; }
  q("#setBack").onclick = () => { w.remove(); openSettings(); };
  const nm = q("#setName"); if(nm) nm.oninput = () => { D.profile.name = nm.value; save(); renderAvatar(); };
  const again = () => { w.remove(); openSettings(page); };
  if(q("#setPhoto")){ q("#setPhoto").onclick = () => pickPhoto(again); q("#setPhoto2").onclick = () => pickPhoto(again); }
  const rm = w.querySelector("#rmPhoto"); if(rm) rm.onclick = () => { D.profile.photo = ""; save(); renderAvatar(); again(); };
  const so = w.querySelector("#signOut"); if(so) so.onclick = () => { D.profile.session = null; save(); toast("Signed out"); again(); };
  const sf = w.querySelector("#signForm");
  if(sf) sf.onsubmit = async ev => {
    ev.preventDefault();
    const email = w.querySelector("#signEmail").value.trim(), note = w.querySelector("#signNote");
    D.profile.email = email; save();
    try { await sendLink(email); note.textContent = `Check ${email} for a link to finish signing up.`; }
    catch(e){ note.textContent = e.message === "offline" ? "Email sign-in is coming soon, so no link was sent yet. We saved your email on this device." : "The link couldn’t be sent. Check the email and try again."; }
  };
  if(q(".fp")) q(".fp").onclick = e => {
    const b = e.target.closest("[data-font]");
    if(b){
      D.ui.fonts = D.ui.fonts || {}; D.ui.fonts[b.dataset.part] = b.dataset.font; save(); applyFonts();
      const part = b.closest(".fp-part"); part.querySelectorAll(".fp-chip").forEach(c => c.setAttribute("aria-pressed", c === b));
      part.querySelector(".fp-sample").style.fontFamily = FONTS[b.dataset.font].stack; return;
    }
    if(e.target.closest("#fontReset")){ D.ui.fonts = {}; save(); applyFonts(); again(); }
  };
  if(q("#installNow")) q("#installNow").onclick = async () => { const ev = installEvt; if(!ev) return; ev.prompt(); const r = await ev.userChoice; installEvt = null; if(r.outcome === "accepted") toast("Intuish is installed"); again(); };
  if(q(".sp-grid")) q(".sp-grid").onclick = e => {
    const r = e.target.closest("[data-sp-reset]"); if(r){ delete D.photos[r.dataset.spReset]; save(); renderHome(); again(); return; }
    const b = e.target.closest("[data-sp]"); if(b) pickSubjectPhoto(b.dataset.sp, again);
  };
  if(q("#setNotes")) q("#setNotes").onclick = () => { w.remove(); openNotes(true); };
  if(q("#setReset")) q("#setReset").onclick = () => {
    const c = sheet(`<div class="sheet-head"><h2>Erase all progress?</h2><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
      <p class="lead" style="margin:0">This clears your answers, Remember schedule, sources and notes on this device. Your profile and subject photos stay.</p>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn outline" data-close data-focus>Keep it</button><button class="btn" id="doReset">Erase</button></div>`);
    c.querySelector("#doReset").onclick = () => { const keep = D.profile, ph = D.photos; D = fresh(); D.profile = keep; D.photos = ph; D.notes = []; saveNow(); c.remove(); renderHome(); toast("Progress erased"); };
  };
}

/* ----- Fonts ----- */
const FONTS = {
  system:    {name:"System",      note:"San Francisco on Apple", stack:'-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Inter","Segoe UI Variable","Segoe UI",system-ui,sans-serif'},
  quicksand: {name:"Quicksand",   note:"Soft and rounded",       stack:'"Quicksand","Nunito",ui-rounded,system-ui,sans-serif'},
  figtree:   {name:"Figtree",     note:"Clean and friendly",     stack:'"Figtree","Helvetica Neue",Arial,system-ui,sans-serif'},
  inter:     {name:"Inter",       note:"Crisp and neutral",      stack:'"Inter",system-ui,sans-serif'},
  nunito:    {name:"Nunito",      note:"Warm and round",         stack:'"Nunito",ui-rounded,system-ui,sans-serif', g:"Nunito:wght@400;600;700"},
  lora:      {name:"Lora",        note:"Bookish serif",          stack:'"Lora",Georgia,serif', g:"Lora:wght@400;600;700"},
  atkinson:  {name:"Atkinson Hyperlegible", note:"Easiest to read", stack:'"Atkinson Hyperlegible",system-ui,sans-serif', g:"Atkinson+Hyperlegible:wght@400;700"}
};
const FONT_PARTS = [
  ["display", "Headings", "Titles, subject names and questions", "quicksand", "Understanding Your Mental Health"],
  ["body", "Text", "Answers, notes and everything you read", "figtree", "Emotions are signals that help us make sense of what matters."],
  ["sf", "Clock and logo", "The time, the Intuish name and section titles", "system", "6:27 AM · Intuish"]
];
function loadFont(k){
  const f = FONTS[k]; if(!f || !f.g || document.getElementById("gf-" + k)) return;
  const l = document.createElement("link"); l.id = "gf-" + k; l.rel = "stylesheet"; l.href = `https://fonts.googleapis.com/css2?family=${f.g}&display=swap`; document.head.appendChild(l);
}
function applyFonts(){
  const pick = (D.ui && D.ui.fonts) || {};
  FONT_PARTS.forEach(([part, , , def]) => { const k = FONTS[pick[part]] ? pick[part] : def; loadFont(k); document.documentElement.style.setProperty("--" + part, FONTS[k].stack); });
}
function fontsPage(){
  Object.keys(FONTS).forEach(loadFont);
  const pick = (D.ui && D.ui.fonts) || {};
  return `<div class="fp"><p class="set-p">Pick the font you like best for each part of the app. Changes show right away.</p>
    ${FONT_PARTS.map(([part, label, sub, def, sample]) => { const cur = FONTS[pick[part]] ? pick[part] : def; return `<div class="fp-part">
      <div class="fp-h"><b>${label}</b><small>${sub}</small></div>
      <div class="fp-sample" style="font-family:${FONTS[cur].stack.replace(/"/g, "&quot;")}">${esc(sample)}</div>
      <div class="fp-row">${Object.entries(FONTS).map(([k, f]) => `<button class="fp-chip" data-part="${part}" data-font="${k}" aria-pressed="${k === cur}" style="font-family:${f.stack.replace(/"/g, "&quot;")}" title="${esc(f.note)}">${esc(f.name)}${k === def ? '<small>default</small>' : ""}</button>`).join("")}</div>
    </div>`; }).join("")}
    <div><button class="btn outline" id="fontReset">Use the default fonts</button></div></div>`;
}
applyFonts();

/* ----- Installable app ----- */
let installEvt = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; });
addEventListener("appinstalled", () => { installEvt = null; });
if("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !/claude\.ai|claudeusercontent/.test(location.hostname)){
  // Check for a new version on every open (and when the app comes back to the front); when one takes over, reload once so it shows right away
  const hadSW = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if(hadSW && !reloaded){ reloaded = true; saveNow(); location.reload(); } });
  addEventListener("load", () => navigator.serviceWorker.register("sw.js", {updateViaCache:"none"}).then(r => {
    r.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if(!document.hidden) r.update().catch(() => {}); });
  }).catch(() => {}));
}
function installPage(){
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const ua = navigator.userAgent, ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
  const mac = /Macintosh/.test(ua) && !ios, safari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|CriOS|FxiOS/.test(ua);
  if(standalone) return `<p class="set-p">You’re using the Intuish app. It opens in its own window and works without a connection.</p>`;
  const here = installEvt ? `<div><button class="btn" id="installNow">Install Intuish</button></div>`
    : ios ? `<p class="set-p"><b>On this ${/iPhone/.test(ua) ? "iPhone" : "iPad"}:</b> tap the Share button in Safari, then <b>Add to Home Screen</b>.</p>`
    : mac && safari ? `<p class="set-p"><b>On this Mac:</b> in Safari choose <b>File → Add to Dock</b>.</p>`
    : `<p class="set-p"><b>On this computer:</b> in Chrome or Edge, click the install icon at the right end of the address bar.</p>`;
  return `<p class="set-p">Intuish installs like an app, with its own icon and window, and it opens even without internet. It’s free and there’s nothing to download from a store.</p>${here}
    <div class="inst-list">
      <div><b>iPhone and iPad</b><span>Safari → Share → Add to Home Screen</span></div>
      <div><b>Android</b><span>Chrome → ⋮ menu → Install app</span></div>
      <div><b>Mac</b><span>Safari → File → Add to Dock, or Chrome → Install</span></div>
      <div><b>Windows</b><span>Edge or Chrome → Install icon in the address bar</span></div>
    </div>
    <p class="set-note">Install from Intuish’s website: imatiny408-tech.github.io/Intuish/app</p>`;
}

/* ----- Note bar in full-screen video ----- */
const fsNote = $("#fsNote"), fsNoteText = $("#fsNoteText"), fsNoteBtn = $("#fsNoteBtn");
function toggleFsNote(on){
  on = on === undefined ? fsNote.hidden : on;
  fsNote.hidden = !on; fsNoteBtn.setAttribute("aria-expanded", on); $("#player").classList.toggle("noting", on);
  if(on) setTimeout(() => fsNoteText.focus(), 30); else fsNoteText.blur();
}
fsNoteBtn.onclick = e => { e.stopPropagation(); toggleFsNote(); };
fsNoteBtn.addEventListener("pointerdown", e => e.stopPropagation());
fsNote.addEventListener("click", e => e.stopPropagation());
fsNote.addEventListener("pointerdown", e => e.stopPropagation());
fsNoteText.onkeydown = e => { e.stopPropagation(); if(e.key === "Escape"){ e.preventDefault(); toggleFsNote(false); } };
fsNote.onsubmit = ev => {
  ev.preventDefault();
  const text = fsNoteText.value.trim(); if(!text || !cur) return;
  if(D.notes.length >= NOTE_MAX){ toast(`You can keep up to ${NOTE_MAX} notes`); return; }
  D.notes.unshift({id:"n" + now().toString(36), text, t:now(), lesson:cur.id, subj:cur.subj, topic:cur.topic, title:cur.title});
  save(); renderNotes(); fsNoteText.value = ""; fsNoteText.focus();
  fsNote.classList.remove("saved"); void fsNote.offsetWidth; fsNote.classList.add("saved");
};
document.addEventListener("keydown", e => {
  if(M.mode !== "expanded" || e.metaKey || e.ctrlKey || e.altKey || /input|textarea/i.test(e.target.tagName)) return;
  if(e.key === "n" || e.key === "N"){ e.preventDefault(); e.stopImmediatePropagation(); toggleFsNote(true); }
}, true);

/* ----- Notes board ----- */
const NOTE_MAX = 60;
function noteCard(n, tag){ return `<div class="note" data-id="${n.id}">${tag && (n.title || n.topic) ? `<small class="note-tag">${esc(n.title || n.topic)}</small>` : ""}<p>${esc(n.text)}</p><button class="note-x" data-del="${n.id}" aria-label="Delete note">${ICON.close}</button></div>`; }
function noteLine(n){ return `<li class="note-li" data-id="${n.id}"><p>${esc(n.text)}</p><button class="note-x" data-del="${n.id}" aria-label="Delete note">${ICON.close}</button></li>`; }
function lessonNotes(){ return cur ? D.notes.filter(n => n.lesson === cur.id) : []; }
function renderNotes(){
  const el = $("#notes"); if(!el) return;
  const mine = lessonNotes();
  el.innerHTML = `<div class="notes-head"><h3>Notes</h3><div class="notes-act">${mine.length ? `<button class="linkish" data-save-img>Save as image</button><button class="linkish" data-save-pdf>Download PDF</button>` : ""}${D.notes.length ? `<button class="linkish" data-all>All notes</button>` : ""}</div></div>
    <form class="note-line" id="noteForm"><input id="noteText" type="text" maxlength="280" autocomplete="off" enterkeyhint="done" placeholder="Add a note about this lesson" aria-label="New note"><button class="note-add" type="submit">Add</button></form>
    <ul class="notes-bullets" id="notesList">${mine.map(noteLine).join("")}</ul>`;
  const ta = el.querySelector("#noteText");
  ta.onkeydown = e => e.stopPropagation();
  el.querySelector("#noteForm").onsubmit = ev => { ev.preventDefault(); addNote(ta.value, el); };
}
function addNote(text, el){
  text = text.trim(); if(!text) return;
  if(D.notes.length >= NOTE_MAX){ toast(`You can keep up to ${NOTE_MAX} notes`); return; }
  const n = {id:"n" + now().toString(36), text, t:now()};
  if(cur && el.id === "notes"){ n.lesson = cur.id; n.subj = cur.subj; n.topic = cur.topic; n.title = cur.title; }
  D.notes.unshift(n); save();
  const list = el.querySelector(".notes-bullets, .notes-list"), ta = el.querySelector("input, textarea");
  ta.value = "";
  if(el.id === "notes" ? lessonNotes().length === 1 : !el.querySelector(".notes-act")) { renderNotes2(el); return; }
  list.insertAdjacentHTML("afterbegin", el.id === "notes" ? noteLine(n) : noteCard(n)); list.firstElementChild.classList.add("pop"); list.scrollTo({left:0, top:0, behavior:"smooth"}); ta.focus();
}
function renderNotes2(el){ if(el.id === "notes") { renderNotes(); $("#noteText").focus(); } else { el.closest(".sheet-wrap")?.remove(); openNotes(); } }
function delNote(id, el){ D.notes = D.notes.filter(n => n.id !== id); save(); const c = el.querySelector(`[data-id="${id}"]`); if(c){ c.classList.add("gone"); setTimeout(() => { if(el.id === "notes") renderNotes(); else { c.remove(); } }, 220); } }
const NOTE_DAYS = 30;
function noteGroups(){
  const since = now() - NOTE_DAYS * 864e5, days = [];
  D.notes.filter(n => n.t >= since).sort((x, y) => y.t - x.t).forEach(n => {
    const dk = dayKey(n.t); let d = days.find(x => x.k === dk); if(!d) days.push(d = {k:dk, t:n.t, lessons:[]});
    const lk = n.lesson || "general"; let l = d.lessons.find(x => x.k === lk); if(!l) d.lessons.push(l = {k:lk, name:n.title || n.topic || "General notes", subj:n.subj, notes:[]});
    l.notes.push(n);
  });
  return days;
}
function dayLabel(t){
  const k = dayKey(t); if(k === dayKey(now())) return "Today"; if(k === dayKey(now() - 864e5)) return "Yesterday";
  return new Date(t).toLocaleDateString([], {weekday:"long", month:"long", day:"numeric"});
}
function openNotes(fromSettings){
  const back = fromSettings === true ? `<button class="set-back" id="notesBack" aria-label="Back to Settings"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Settings</button>` : "";
  const w = sheet(`${back ? `<div class="sheet-head set-head">${back}<button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>` : ""}<div class="sheet-head"><div><div class="eyebrow">Last ${NOTE_DAYS} days</div><h2>Notes</h2></div>${back ? "" : `<button class="icon-btn" data-close aria-label="Close">${ICON.close}</button>`}</div><div id="notesSheet" class="notes-sheet"></div>`);
  if(back) w.querySelector("#notesBack").onclick = () => { w.remove(); openSettings(); };
  w.querySelector(".sheet").classList.add("notes-log-sheet");
  const box = w.querySelector("#notesSheet"), open = new Set();
  const draw = () => {
    const days = noteGroups();
    if(!days.length){ box.innerHTML = `<p class="muted nl-empty">No notes from the last ${NOTE_DAYS} days yet. Add them under a lesson’s video while you study.</p>`; return; }
    box.innerHTML = days.map(d => `<section class="nl-day"><h3>${esc(dayLabel(d.t))}<small>${new Date(d.t).toLocaleDateString()}</small></h3>
      ${d.lessons.map(l => { const id = d.k + "|" + l.k, s = l.subj && subjById(l.subj), on = open.has(id); return `<div class="nl-item${on ? " open" : ""}" data-g="${esc(id)}">
        <div class="nl-row"><div class="nl-name"><b>${esc(l.name)}</b><span>${s ? esc(s.name) + " · " : ""}${l.notes.length} note${l.notes.length === 1 ? "" : "s"}</span></div>
          <div class="nl-btns"><button class="nl-btn" data-act="preview" aria-expanded="${on}">${on ? "Hide" : "Preview"}</button><button class="nl-btn" data-act="download">Download</button><button class="nl-btn danger" data-act="delete">Delete</button></div></div>
        ${on ? `<ul class="nl-notes">${l.notes.slice().reverse().map(n => `<li><span class="nl-time">${new Date(n.t).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}</span><p>${esc(n.text)}</p><button class="note-x" data-del="${n.id}" aria-label="Delete this note">${ICON.close}</button></li>`).join("")}</ul>` : ""}
      </div>`; }).join("")}</section>`).join("") +
      `<div class="notes-act"><button class="btn outline" data-all-dl>Download all as PDF</button></div>`;
  };
  const find = id => { const [dk, lk] = id.split("|"); const d = noteGroups().find(x => x.k === dk); return d && d.lessons.find(x => x.k === lk); };
  box.addEventListener("click", e => {
    const x = e.target.closest("[data-del]");
    if(x){ D.notes = D.notes.filter(n => n.id !== x.dataset.del); save(); draw(); renderNotes(); return; }
    if(e.target.closest("[data-all-dl]")){
      const items = noteGroups().flatMap(d => d.lessons.flatMap(l => [{heading:l.name, sub:dayLabel(d.t) + (dayLabel(d.t).includes(",") ? "" : " · " + new Date(d.t).toLocaleDateString([], {month:"long", day:"numeric"}))}, ...l.notes.slice().reverse()]));
      return savePdf(items, `intuish-notes-last-${NOTE_DAYS}-days`, `Last ${NOTE_DAYS} days · ${new Date().toLocaleDateString([], {month:"long", day:"numeric", year:"numeric"})}`);
    }
    const b = e.target.closest("[data-act]"); if(!b) return;
    const id = b.closest("[data-g]").dataset.g, l = find(id); if(!l) return draw();
    if(b.dataset.act === "preview"){ open.has(id) ? open.delete(id) : open.add(id); draw(); }
    else if(b.dataset.act === "download") saveFile(l.notes, `intuish-notes-${new Date(l.notes[0].t).toISOString().slice(0,10)}-${(l.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`);
    else if(b.dataset.act === "delete"){
      if(b.dataset.sure){ const ids = new Set(l.notes.map(n => n.id)); D.notes = D.notes.filter(n => !ids.has(n.id)); save(); open.delete(id); draw(); renderNotes(); toast("Notes deleted"); }
      else { b.dataset.sure = "1"; b.textContent = "Delete?"; b.classList.add("sure"); setTimeout(() => { if(b.isConnected){ delete b.dataset.sure; b.textContent = "Delete"; b.classList.remove("sure"); } }, 3000); }
    }
  });
  draw();
}
function noteClicks(e){
  const root = e.currentTarget;
  const d = e.target.closest("[data-del]"); if(d){ delNote(d.dataset.del, root); if(root.id !== "notes") renderNotes(); return; }
  const only = root.id === "notes" ? lessonNotes() : null;
  if(e.target.closest("[data-all]")) return openNotes();
  if(e.target.closest("[data-save-img]")) return saveImage(only);
  if(e.target.closest("[data-save-file]")) return saveFile(only);
  if(e.target.closest("[data-save-pdf]") && only && only.length) return savePdf(only, `intuish-notes-${new Date().toISOString().slice(0,10)}-${(cur.title || cur.topic || "lesson").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`, `${cur.title || cur.topic} · ${new Date().toLocaleDateString([], {month:"long", day:"numeric", year:"numeric"})}`);
}
function wrap(ctx, text, maxW){
  const out = []; text.split(/\n/).forEach(par => { let line = ""; par.split(/\s+/).forEach(word => { const t = line ? line + " " + word : word; if(ctx.measureText(t).width > maxW && line){ out.push(line); line = word; } else line = t; }); out.push(line); });
  return out;
}
async function saveImage(list){
  list = list || D.notes; if(!list.length) return;
  const sub = (list !== D.notes && cur ? (cur.title || cur.topic) + " · " : "") + new Date().toLocaleDateString([], {month:"long", day:"numeric", year:"numeric"});
  const W = 1080, pad = 64, gap = 28, cols = 2, cw = (W - pad * 2 - gap) / cols, font = '500 30px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif';
  const m = document.createElement("canvas").getContext("2d"); m.font = font;
  const cards = list.slice().reverse().map(n => { const lines = wrap(m, n.text, cw - 56); return {lines, h: 56 + lines.length * 40 + 30}; });
  const colH = [0, 0], pos = cards.map(c => { const i = colH[0] <= colH[1] ? 0 : 1, y = colH[i]; colH[i] += c.h + gap; return {x: pad + i * (cw + gap), y}; });
  const top = 190, H = top + Math.max(...colH) + pad;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  g.fillStyle = "#FBFBFA"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#0C68DA"; g.font = '600 52px -apple-system, BlinkMacSystemFont, "Inter", sans-serif'; g.fillText("My Intuish notes", pad, 110);
  g.fillStyle = "#8A8A86"; g.font = '400 28px -apple-system, BlinkMacSystemFont, "Inter", sans-serif'; g.fillText(sub.length > 60 ? sub.slice(0, 58) + "…" : sub, pad, 152);
  cards.forEach((cd, i) => {
    const {x, y} = pos[i], yy = top + y;
    g.save(); g.shadowColor = "rgba(12,70,160,.12)"; g.shadowBlur = 24; g.shadowOffsetY = 8;
    g.fillStyle = "#FFFFFF"; g.beginPath(); g.roundRect(x, yy, cw, cd.h, 24); g.fill(); g.restore();
    g.fillStyle = "#0C68DA"; g.beginPath(); g.roundRect(x, yy, 8, cd.h, [24, 0, 0, 24]); g.fill();
    g.fillStyle = "#151515"; g.font = font; cd.lines.forEach((l, k) => g.fillText(l, x + 36, yy + 64 + k * 40));
  });
  const blob = await new Promise(r => c.toBlob(r, "image/png")), name = `intuish-notes-${new Date().toISOString().slice(0,10)}.png`;
  const file = new File([blob], name, {type:"image/png"});
  try { if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:"My Intuish notes"}); return; } } catch(e){ if(e.name === "AbortError") return; }
  download(blob, name); toast("Notes saved as an image");
}
function saveFile(list, name){
  list = list || D.notes; if(!list.length) return;
  const groups = []; list.slice().sort((x, y) => x.t - y.t).forEach(n => { const k = new Date(n.t).toLocaleDateString([], {weekday:"long", month:"long", day:"numeric", year:"numeric"}) + " · " + (n.title || n.topic || "General notes"); let gr = groups.find(x => x.k === k); if(!gr) groups.push(gr = {k, items:[]}); gr.items.push(n); });
  const txt = `My Intuish notes\n\n` + groups.map(gr => `${gr.k}\n` + gr.items.map(n => `• ${n.text.replace(/\n/g, "\n  ")}`).join("\n")).join("\n\n") + "\n";
  download(new Blob([txt], {type:"text/plain"}), `${name || "intuish-notes-" + new Date().toISOString().slice(0,10)}.txt`); toast("Notes downloaded");
}
// Notes as a PDF: each page is drawn on a canvas (same bullets as on screen) and packed into a small PDF, only as many pages as needed
async function savePdf(list, name, subtitle){
  if(!list || !list.length) return;
  const W = 1275, H = 1650, M = 120, font = '400 30px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif';
  const pages = []; let c, g, y;
  const newPage = () => {
    c = document.createElement("canvas"); c.width = W; c.height = H; g = c.getContext("2d");
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, W, H); y = M; pages.push(c);
    if(pages.length === 1){
      g.fillStyle = "#0C68DA"; g.font = '600 48px -apple-system, BlinkMacSystemFont, "Inter", sans-serif'; g.fillText("My Intuish notes", M, y + 40); y += 78;
      g.fillStyle = "#8A8A86"; g.font = '400 26px -apple-system, BlinkMacSystemFont, "Inter", sans-serif'; g.fillText(subtitle, M, y + 20); y += 70;
      g.fillStyle = "#E6E8EC"; g.fillRect(M, y, W - M * 2, 2); y += 40;
    }
  };
  newPage();
  const lh = 44, tx = M + 38, maxW = W - M - tx;
  list.forEach(n => {
    if(n.heading){
      if(y + 60 + lh > H - M - 40) newPage(); else if(y > M + 200) y += 18;
      g.fillStyle = "#151515"; g.font = '600 28px -apple-system, BlinkMacSystemFont, "Inter", sans-serif'; g.fillText(n.heading, M, y + 30);
      if(n.sub){ g.fillStyle = "#8A8A86"; g.font = '400 22px -apple-system, BlinkMacSystemFont, "Inter", sans-serif'; g.fillText(n.sub, M, y + 62); y += 32; }
      y += 56; return;
    }
    g.font = font; const lines = wrap(g, n.text, maxW), h = lines.length * lh;
    if(y + h > H - M - 40) newPage();
    g.fillStyle = "#0C68DA"; g.beginPath(); g.arc(M + 12, y + 20, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#151515"; g.font = font; lines.forEach((l, k) => g.fillText(l, tx, y + 31 + k * lh));
    y += h + 22;
  });
  pages.forEach((pc, i) => { const pg = pc.getContext("2d"); pg.fillStyle = "#A0A09C"; pg.font = '400 22px -apple-system, BlinkMacSystemFont, "Inter", sans-serif'; pg.textAlign = "right"; pg.fillText(`Intuish · ${i + 1} of ${pages.length}`, W - M, H - 70); });
  const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
  const push = x => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (id, body) => { offs[id] = len; push(`${id} 0 obj\n`); body(); push("\nendobj\n"); };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const n = pages.length, kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
  for(let i = 0; i < n; i++){
    const id = 3 + i * 3, jpg = Uint8Array.from(atob(pages[i].toDataURL("image/jpeg", .9).split(",")[1]), ch => ch.charCodeAt(0));
    const cs = "q 612 0 0 792 0 0 cm /Im0 Do Q";
    obj(id, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`));
    obj(id + 1, () => { push(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); push(jpg); push("\nendstream"); });
    obj(id + 2, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
  }
  const total = 3 + n * 3, xref = len;
  push(`xref\n0 ${total}\n0000000000 65535 f \n` + offs.slice(1).map(o => String(o).padStart(10, "0") + " 00000 n \n").join(""));
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const blob = new Blob(parts, {type:"application/pdf"}), file = name + ".pdf";
  try { const f = new File([blob], file, {type:"application/pdf"}); if(navigator.canShare && navigator.canShare({files:[f]}) && /iPad|iPhone|Macintosh/.test(navigator.userAgent) && "ontouchend" in document){ await navigator.share({files:[f], title:"My Intuish notes"}); return; } } catch(e){ if(e.name === "AbortError") return; }
  download(blob, file); toast(`Notes saved as a PDF (${n} page${n === 1 ? "" : "s"})`);
}
function download(blob, name){ const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }

/* ----- wire up ----- */
$("#notes").addEventListener("click", noteClicks);
$("#avatarBtn").onclick = e => {
  e.stopPropagation();
  const signed = !!(D.profile.session && D.profile.email);
  menu($("#avatarBtn"), [["settings","Settings"],["notes","Notes", D.notes.length ? String(D.notes.length) : ""], !signed && AUTH && ["signup","Sign up with email"], "hr", ["about","About Intuish"]].filter(Boolean), a => {
    if(a === "settings" || a === "signup") openSettings();
    if(a === "notes") openNotes();
    if(a === "about") sheet(`<div class="sheet-head"><div><div class="eyebrow">Intuish</div><h2>Test version</h2></div><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
      <p class="lead" style="margin:0">Your progress is saved in this browser only. Each subject comes with a starter pack, and you can add up to 50 YouTube videos, 25 websites and 25 PDFs of your own. PDFs stay on this device.</p>
      <div style="display:flex;justify-content:flex-end"><button class="btn" data-close data-focus>Got it</button></div>`);
  });
};
window.IntuishFsNoteOff = () => { if(!fsNote.hidden) toggleFsNote(false); };
window.IntuishExtras = {renderAvatar, renderNotes, openNotes, openSettings};
renderAvatar(); renderNotes(); finishSignIn();

route();
})();
