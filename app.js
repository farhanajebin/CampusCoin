
/* =====================================================
   CampusCoin (game edition) – everything is stored in
   your browser (localStorage). No server, no sample data.
   ===================================================== */
const KEY = 'campuscoin.v1';
const OLD_KEY = 'mintquest.v1';
const THEME_KEY = 'campuscoin.gametheme';
const THEMES = ['arcade','forest','space'];

const CATS = [
  {id:'food',      name:'Food',      icon:'🍜', color:'#FF8A3D'},
  {id:'transport', name:'Transport', icon:'🚌', color:'#3DA5FF'},
  {id:'study',     name:'Study',     icon:'📚', color:'#B388FF'},
  {id:'fun',       name:'Fun',       icon:'🎮', color:'#FF4FA3'},
  {id:'shopping',  name:'Shopping',  icon:'🛍️', color:'#2DD4BF'},
  {id:'other',     name:'Other',     icon:'✨', color:'#9AA7C2'}
];
const PERIOD_DAYS = {weekly:7, monthly:30, semester:120};
const LOCALES = {INR:'en-IN', USD:'en-US', EUR:'de-DE', GBP:'en-GB'};
const TITLES = ['Rookie','Canteen hero','Budget ninja','Coin hunter','Semester boss','Money mage','Campus legend'];
const AVATARS = [['🐣','Chick',1],['🦊','Fox',2],['🐼','Panda',3],['🐯','Tiger',4],['🐲','Dragon',5],['🦄','Unicorn',7],['👑','Crown',10]];

const ACHIEVEMENTS = [
  {id:'first',  icon:'🪙', name:'First coin',     desc:'Log your first expense',    test:s=>s.expenses.length>=1},
  {id:'ten',    icon:'📒', name:'Ten down',       desc:'Log 10 expenses',           test:s=>s.expenses.length>=10},
  {id:'fifty',  icon:'📚', name:'Ledger legend',  desc:'Log 50 expenses',           test:s=>s.expenses.length>=50},
  {id:'notes',  icon:'📝', name:'Note taker',     desc:'Add notes to 10 expenses',  test:s=>s.expenses.filter(e=>e.note).length>=10},
  {id:'cats',   icon:'🌈', name:'Well rounded',   desc:'Use 5 categories',          test:s=>new Set(s.expenses.map(e=>e.cat)).size>=5},
  {id:'ghost',  icon:'👻', name:'Ghost wallet',   desc:'Have a no-spend day',       test:s=>s.nospend.length>=1},
  {id:'s3',     icon:'🔥', name:'On a roll',      desc:'3-day streak',              test:()=>streak()>=3},
  {id:'s7',     icon:'🌋', name:'Week warrior',   desc:'7-day streak',              test:()=>streak()>=7},
  {id:'s14',    icon:'☄️', name:'Unstoppable',    desc:'14-day streak',             test:()=>streak()>=14},
  {id:'goal',   icon:'🎯', name:'Dream big',      desc:'Create a loot goal',        test:s=>s.goals.length>=1},
  {id:'goal3',  icon:'🗺️', name:'Wish list',      desc:'Create 3 loot goals',       test:s=>s.goals.length>=3},
  {id:'reached',icon:'🏆', name:'Loot secured',   desc:'Fully fund a goal',         test:s=>s.goals.some(g=>g.reachedOn)},
  {id:'pace',   icon:'🧭', name:'Pace setter',    desc:'Past halfway with half your money left', test:()=>{const c=calc();return c.expensesCount>0&&c.elapsed>=c.days/2&&c.spendable>0&&c.balance/c.spendable>=.5}},
  {id:'beat',   icon:'🪞', name:'Beat past you',  desc:'Spend less than last week', test:()=>{const p=pastTotals();return p.prev>0&&p.cur<p.prev}},
  {id:'chest3', icon:'🎁', name:'Loot hunter',    desc:'Open 3 daily loot boxes',   test:s=>s.chests>=3},
  {id:'quests', icon:'⚔️', name:'Quest runner',   desc:'Claim 5 quests',            test:s=>Object.keys(s.claimed).length>=5},
  {id:'lvl5',   icon:'⭐', name:'Level 5',        desc:'Reach level 5',             test:s=>levelInfo(s.xp).lvl>=5},
  {id:'lvl8',   icon:'🌟', name:'Level 8',        desc:'Reach level 8',             test:s=>levelInfo(s.xp).lvl>=8}
];

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); };
const addDays = (s,n) => { const d = parse(s); d.setDate(d.getDate()+n); return iso(d); };
const diffDays = (a,b) => Math.round((parse(a)-parse(b))/864e5);
const weekKey = s => addDays(s, -((parse(s).getDay()+6)%7));
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const catOf = id => CATS.find(c=>c.id===id) || CATS[5];
const short = n => n>=1000 ? (n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'k' : String(Math.round(n));

let S = load();
let catPick = 'food', catFilter = null, tab = 'home';

function normalize(s){
  s.prefs = Object.assign({theme:null, avatar:'🐣', chart:'pie', sound:false}, s.prefs||{});
  s.expenses=s.expenses||[]; s.goals=s.goals||[]; s.nospend=s.nospend||[];
  s.xp=s.xp||0; s.claimed=s.claimed||{}; s.achievements=s.achievements||{}; s.xpDay=s.xpDay||{};
  s.chestDay=s.chestDay||null; s.chests=s.chests||0;
  return s;
}
function load(){
  try { const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY); if (raw) { const s = JSON.parse(raw); if (s && s.profile) return normalize(s); } } catch(e){}
  return null;
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
function freshState(profile){ return normalize({profile}); }
const money = n => {
  const cur = S.profile.currency;
  return new Intl.NumberFormat(LOCALES[cur]||'en-US',{style:'currency',currency:cur,minimumFractionDigits:0,maximumFractionDigits:2}).format(n);
};

/* ---------- theme ---------- */
function applyTheme(){
  let t = (S && S.prefs.theme) || localStorage.getItem(THEME_KEY);
  if (!THEMES.includes(t)) t = 'arcade';      // older light/dark themes map to Arcade
  document.documentElement.dataset.theme = t;
}
function setTheme(t){
  localStorage.setItem(THEME_KEY, t);
  if (S) { S.prefs.theme = t; save(); }
  applyTheme(); renderCustom(); render();
}

/* ---------- sound (8-bit blips, off by default) ---------- */
let ac = null;
function tone(f,t0,d,type='square',v=.05){
  const o=ac.createOscillator(), g=ac.createGain(), t=ac.currentTime+t0;
  o.type=type; o.frequency.value=f;
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+d+.02);
}
function sfx(kind){
  if (!S || !S.prefs.sound) return;
  try { ac = ac || new (window.AudioContext||window.webkitAudioContext)(); if (ac.state==='suspended') ac.resume(); } catch(e){ return; }
  const m = {
    coin:[[988,0,.08],[1319,.08,.22]],
    claim:[[784,0,.1],[1047,.1,.25]],
    level:[[523,0,.12],[659,.12,.12],[784,.24,.12],[1047,.36,.4]],
    bad:[[196,0,.15,'sawtooth'],[147,.15,.25,'sawtooth']]
  };
  (m[kind]||[]).forEach(([f,t,d,ty])=>tone(f,t,d,ty||'square'));
}

/* ---------- game maths ---------- */
function levelInfo(xp){
  let lvl=1, need=100, rem=xp;
  while(rem>=need){ rem-=need; lvl++; need=100+(lvl-1)*40; }
  return {lvl, rem, need};
}
const titleFor = lvl => TITLES[Math.min(lvl-1, TITLES.length-1)];
function sumOn(d){ return S.expenses.filter(e=>e.date===d).reduce((a,e)=>a+e.amt,0); }
function hasCheckin(d){ return S.expenses.some(e=>e.date===d) || S.nospend.includes(d); }
function allowance(){ const p=S.profile; return Math.max(0,p.budget-p.reserve)/PERIOD_DAYS[p.period]; }
function dayKept(d){ return hasCheckin(d) && sumOn(d) <= allowance()+0.0001; }
function streak(){
  const t = today();
  if (hasCheckin(t) && !dayKept(t)) return 0;
  let d = dayKept(t) ? t : addDays(t,-1), n = 0;
  while (d >= S.profile.joined && dayKept(d)) { n++; d = addDays(d,-1); }
  return n;
}
function calc(){
  const p = S.profile, days = PERIOD_DAYS[p.period], t = today();
  const periodExp = S.expenses.filter(e=>e.date>=p.start);
  const spent = periodExp.reduce((a,e)=>a+e.amt,0);
  const setAside = S.goals.reduce((a,g)=>a+g.contribs.filter(c=>c.date>=p.start).reduce((x,c)=>x+c.amt,0),0);
  const spendable = Math.max(0,p.budget-p.reserve);
  const balance = spendable - spent - setAside;
  const elapsed = Math.max(0, diffDays(t,p.start));
  return {days, periodExp, spent, setAside, spendable, balance, elapsed, daysLeft:Math.max(0,days-elapsed), expensesCount:periodExp.length};
}
function pastTotals(){
  const t = today();
  const range = (a,b)=>S.expenses.filter(e=>e.date>=a&&e.date<=b).reduce((x,e)=>x+e.amt,0);
  return {cur:range(addDays(t,-6),t), prev:range(addDays(t,-13),addDays(t,-7))};
}
function catTotals(){
  const c = calc();
  return CATS.map(k=>({...k, v:c.periodExp.filter(e=>e.cat===k.id).reduce((a,e)=>a+e.amt,0)})).filter(k=>k.v>0).sort((a,b)=>b.v-a.v);
}

/* ---------- feedback: toasts, big banners, confetti, XP ---------- */
function toast(msg, kind=''){
  const el = document.createElement('div');
  el.className = 'toast '+kind; el.textContent = msg;
  const box = $('toasts');
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(()=>el.remove(), 3000);
}
const annQ = []; let annBusy = false;
function announce(title, sub, icon='⭐', snd='level'){
  if (annQ.length < 3) annQ.push({title, sub, icon, snd});
  if (!annBusy) nextAnn();
}
function nextAnn(){
  const a = annQ.shift();
  if (!a) { annBusy = false; $('banner').innerHTML = ''; return; }
  annBusy = true;
  $('banner').innerHTML = `<div class="ban"><div class="bi" aria-hidden="true">${a.icon}</div><h3>${esc(a.title)}</h3><p>${esc(a.sub)}</p></div>`;
  sfx(a.snd);
  setTimeout(nextAnn, 1900);
}
function confetti(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('confetti'), ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight; c.hidden = false;
  const colors = ['#FFD23F','#FF4FA3','#3DE8FF','#5BFF8A','#B388FF','#FF8A3D'];
  const ps = Array.from({length:90},()=>({x:innerWidth/2+(Math.random()-.5)*240, y:innerHeight*.4, vx:(Math.random()-.5)*14, vy:-Math.random()*13-4, s:8+Math.floor(Math.random()*3)*4, c:colors[Math.floor(Math.random()*colors.length)]}));
  let f = 0;
  (function tick(){
    ctx.clearRect(0,0,c.width,c.height);
    ps.forEach(p=>{ p.vy+=.4; p.x+=p.vx; p.y+=p.vy; ctx.fillStyle=p.c; ctx.fillRect(Math.round(p.x/4)*4,Math.round(p.y/4)*4,p.s,p.s); });
    if (++f < 95) requestAnimationFrame(tick); else { ctx.clearRect(0,0,c.width,c.height); c.hidden = true; }
  })();
}
function addXP(n, why){
  const before = levelInfo(S.xp).lvl;
  S.xp += n;
  const after = levelInfo(S.xp).lvl;
  toast(`+${n} XP${why?' · '+why:''}`, 'good');
  if (after > before) {
    announce('LEVEL UP!', `Level ${after} · ${titleFor(after)}`, '⬆️'); confetti();
    const unlocked = AVATARS.find(a=>a[2]===after);
    if (unlocked) announce('NEW BUDDY!', `${unlocked[0]} ${unlocked[1]} unlocked`, unlocked[0], 'claim');
  }
}
function checkAchievements(){
  let again = true, guard = 0;
  while (again && guard++ < 5) {
    again = false;
    ACHIEVEMENTS.forEach(a=>{
      if (!S.achievements[a.id] && a.test(S)) {
        S.achievements[a.id] = today(); again = true;
        announce('TROPHY UNLOCKED!', `${a.name}: ${a.desc}`, a.icon, 'claim'); confetti();
        addXP(20);
      }
    });
  }
}
function commit(){ checkAchievements(); save(); render(); }

/* ---------- quests & loot box ---------- */
function quests(){
  const t = today(), wk = weekKey(t);
  const week = Array.from({length:7},(_,i)=>addDays(wk,i)).filter(d=>d<=t);
  const keptWeek = week.filter(d=>dayKept(d)).length;
  const stashed = S.goals.some(g=>g.contribs.some(c=>c.date>=wk));
  const weekCats = new Set(S.expenses.filter(e=>e.date>=wk&&e.date<=t).map(e=>e.cat)).size;
  const todays = S.expenses.filter(e=>e.date===t);
  const list = [
    {id:'log3',  scope:'Daily',  key:t,  title:'Log 3 expenses',                    prog:Math.min(todays.length,3), goal:3, xp:25},
    {id:'under', scope:'Daily',  key:t,  title:'Stay under your daily allowance',   prog:dayKept(t)?1:0, goal:1, xp:30},
    {id:'note',  scope:'Daily',  key:t,  title:'Add a note to an expense',          prog:todays.some(e=>e.note)?1:0, goal:1, xp:15},
    {id:'week5', scope:'Weekly', key:wk, title:'Keep 5 days under your allowance',  prog:Math.min(keptWeek,5), goal:5, xp:60},
    {id:'stash', scope:'Weekly', key:wk, title:'Stash money into a loot goal',      prog:stashed?1:0, goal:1, xp:40},
    {id:'mix',   scope:'Weekly', key:wk, title:'Spend in 3 different categories',   prog:Math.min(weekCats,3), goal:3, xp:35}
  ];
  return list.map(q=>({...q, done:q.prog>=q.goal, claimed:!!S.claimed[q.id+':'+q.key]}));
}
const chestReady = () => S.chestDay !== today();

/* ---------- render ---------- */
function render(){
  renderHeader(); renderHero(); renderTx(); renderCharts(); renderWeek(); renderFacts(); renderPast();
  renderQuests(); renderBadges(); renderGoals(); renderNospend(); renderTabs();
}

function renderHeader(){
  const L = levelInfo(S.xp);
  $('lvl').innerHTML = `<b>LV ${L.lvl} ${esc(titleFor(L.lvl))}</b>
    <div class="xpbar" role="progressbar" aria-label="XP to next level" aria-valuemin="0" aria-valuemax="${L.need}" aria-valuenow="${L.rem}"><div class="xpfill" style="width:${L.rem/L.need*100}%"></div></div>
    <span class="small muted">${L.rem}/${L.need} XP</span>`;
  $('avatar-face').textContent = S.prefs.avatar;
  const s = streak();
  $('streak').textContent = `🔥 ${s}`;
  $('streak').setAttribute('aria-label', `${s} day streak`);
  $('sound-btn').textContent = S.prefs.sound ? '🔊' : '🔇';
  $('sound-btn').setAttribute('aria-pressed', S.prefs.sound);
}

function buddyMessage(c, pct, al, todaySpent){
  const streakN = streak(), name = esc(S.profile.name);
  if (c.daysLeft===0) return `Level complete, ${name}! Start a new one in settings.`;
  if (c.balance<0) return `Game over for the budget... but you can recover. Spend light for a few days.`;
  if (todaySpent > al+0.0001) return `Big spend today! Try a no-spend day tomorrow to heal.`;
  if (!c.expensesCount) return `Welcome, ${name}! Log your first expense to earn XP and start a streak.`;
  if (streakN>=3) return `🔥 ${streakN}-day streak! Keep the combo going, ${name}.`;
  if (pct<25) return `HP is low! Pick the cheap option today.`;
  const safe = c.balance/Math.max(1,c.daysLeft);
  return `Looking healthy! You can spend about ${money(safe)} a day from here.`;
}
function renderHero(){
  const c = calc(), p = S.profile;
  const pct = c.spendable>0 ? Math.max(0,Math.min(100,c.balance/c.spendable*100)) : 0;
  const cls = c.balance<0 || pct<20 ? 'low' : pct<50 ? 'mid' : '';
  const mood = c.balance<0 ? ['😵','var(--bad)'] : pct<25 ? ['😟','var(--bad)'] : pct<55 ? ['😐','var(--warn)'] : ['😄','var(--good)'];
  const lives = c.balance<=0 ? 0 : Math.max(1, Math.ceil(pct/20));
  const al = allowance(), todaySpent = sumOn(today());
  const tp = al>0 ? Math.min(100,todaySpent/al*100) : (todaySpent>0?100:0);
  const over = todaySpent > al+0.0001;
  const periodName = {weekly:'week',monthly:'month',semester:'semester'}[p.period];
  $('hero').innerHTML = `
    <div class="buddy-row">
      <div class="buddy ${c.balance<0?'static':''}" style="--mood:${mood[1]}" aria-hidden="true">${S.prefs.avatar}<span class="mood">${mood[0]}</span></div>
      <div class="bubble">${buddyMessage(c,pct,al,todaySpent)}</div>
    </div>
    <div class="row between wrap"><span class="hp-label">CASH HP</span>
      <span class="lives" role="img" aria-label="${lives} of 5 lives">${'❤️'.repeat(lives)}<span class="off">${'❤️'.repeat(5-lives)}</span></span></div>
    <div class="hp-num">${money(c.balance)}</div>
    <div class="small muted">${c.balance<0?'over budget':`spendable of ${money(c.spendable)}`} · ${c.daysLeft} day${c.daysLeft===1?'':'s'} left this ${periodName}</div>
    <div class="hp" role="progressbar" aria-label="Spendable balance" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><div class="hp-fill ${cls}" style="width:${pct}%"></div></div>
    <div class="stats">
      <div class="stat"><span>Total budget</span><b>${money(p.budget)}</b></div>
      <div class="stat"><span>Total spent</span><b>${money(c.spent)}</b></div>
      <div class="stat"><span>Set aside</span><b>${money(c.setAside)}</b></div>
      <div class="stat"><span>Reserve</span><b>${money(p.reserve)}</b></div>
    </div>
    <div class="today">
      <div class="row between wrap"><b>TODAY</b><span class="small" style="${over?'color:var(--bad)':'color:var(--ink2)'}">${money(todaySpent)} of ${money(al)} daily allowance</span></div>
      <div class="mini"><i class="${over?'over':''}" style="width:${tp}%"></i></div>
    </div>
    ${c.daysLeft===0?`<div class="banner">This level is over. Open settings (⚙️) to start a new one. Your history and XP carry over.</div>`:''}`;
}

function renderNospend(){
  const t = today(), b = $('nospend');
  const has = S.expenses.some(e=>e.date===t), done = S.nospend.includes(t);
  b.disabled = has || done;
  b.textContent = done ? 'No-spend day ✓' : 'Spent nothing today';
  b.title = has ? 'You already logged an expense today' : '';
}

function dayLabel(d){
  const t = today();
  if (d===t) return 'Today';
  if (d===addDays(t,-1)) return 'Yesterday';
  return parse(d).toLocaleDateString(undefined,{day:'numeric',month:'short'});
}
function renderTx(){
  const c = calc();
  let list = c.periodExp.slice().sort((a,b)=> b.date.localeCompare(a.date) || b.ts-a.ts);
  if (catFilter) list = list.filter(e=>e.cat===catFilter);
  $('tx-filter').innerHTML = catFilter ? `Showing ${esc(catOf(catFilter).name)} · <button class="link" data-act="clear-filter">clear</button>` : '';
  if (!list.length) {
    $('tx').innerHTML = `<div class="empty"><big>🧾</big>${c.periodExp.length?'No expenses in this category.':'Nothing logged yet. Your first expense earns XP and starts your streak.'}</div>`;
    return;
  }
  $('tx').innerHTML = list.slice(0,60).map(e=>{
    const k = catOf(e.cat);
    return `<div class="tx">
      <div class="ic" style="background:${k.color}55">${k.icon}</div>
      <div class="mid"><b>${esc(e.note||k.name)}</b><span class="small muted">${k.name} · ${dayLabel(e.date)}</span></div>
      <span class="amt">−${money(e.amt)}</span>
      <button class="x" data-act="del-exp" data-id="${e.id}" aria-label="Delete expense">✕</button>
    </div>`;
  }).join('') + (list.length>60?`<p class="small muted" style="margin:10px 0 0">Showing the latest 60.</p>`:'');
}

/* ----- charts ----- */
function polar(r,a){ return [60+r*Math.cos(a), 60+r*Math.sin(a)]; }
function slicePath(a0,a1,r0,r1){
  const large = a1-a0>Math.PI ? 1 : 0;
  const [x0,y0]=polar(r1,a0), [x1,y1]=polar(r1,a1);
  if (r0<=0) return `M60 60 L${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} Z`;
  const [x2,y2]=polar(r0,a1), [x3,y3]=polar(r0,a0);
  return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}
function renderCharts(){
  const mode = S.prefs.chart, totals = catTotals(), total = totals.reduce((a,k)=>a+k.v,0);
  const toggle = `<div class="seg" role="group" aria-label="Chart type">${[['pie','Pie'],['donut','Donut'],['bars','Bars']].map(([m,l])=>`<button data-mode="${m}" aria-pressed="${mode===m}">${l}</button>`).join('')}</div>`;
  const head = `<div class="row between wrap" style="margin-bottom:14px"><h2 style="margin:0">Where it goes</h2>${toggle}</div>`;
  if (!totals.length) {
    $('chartCard').innerHTML = head + `<div class="empty" style="padding:34px 8px"><big>🥧</big>No spending yet. Log an expense and your pie chart appears here.</div>`;
    return;
  }
  let body;
  if (mode==='bars') {
    const max = totals[0].v;
    body = `<div class="hbars">${totals.map(k=>`<button class="hb ${catFilter===k.id?'on':''}" data-cat="${k.id}"><span>${k.icon} ${k.name}</span><span class="tr"><i style="width:${k.v/max*100}%;background:${k.color}"></i></span><span>${money(k.v)}</span></button>`).join('')}</div>`;
  } else {
    const r0 = mode==='donut' ? 30 : 0;
    let a = -Math.PI/2;
    const paths = totals.map(k=>{
      const sweep = Math.min(k.v/total*2*Math.PI, 2*Math.PI-0.0005);
      const d = slicePath(a, a+sweep, r0, 52); a += sweep;
      return `<path class="${catFilter===k.id?'on':''}" data-cat="${k.id}" d="${d}" fill="${k.color}"><title>${k.name}: ${money(k.v)}</title></path>`;
    }).join('');
    body = `<div class="chart">
      <div class="pie ${catFilter?'dim':''}"><svg viewBox="0 0 120 120" shape-rendering="crispEdges" role="img" aria-label="Spending by category">${paths}</svg>
        ${mode==='donut'?`<div class="pie-c"><span class="small muted">Spent</span><b>${money(total)}</b></div>`:''}</div>
      <div class="legend">${totals.map(k=>`<button class="lg ${catFilter===k.id?'on':''}" data-cat="${k.id}"><i style="background:${k.color}"></i><span>${k.icon} ${k.name}</span><span>${Math.round(k.v/total*100)}%</span></button>`).join('')}</div></div>`;
  }
  $('chartCard').innerHTML = head + body + `<div class="readout" id="readout">${mode==='pie'?`Total spent ${money(total)}. `:''}Tap a slice to filter your history.</div>`;
}
function hoverCat(id){
  const el = $('readout'); if (!el) return;
  const totals = catTotals(), total = totals.reduce((a,k)=>a+k.v,0);
  if (!id) { el.textContent = (S.prefs.chart==='pie'?`Total spent ${money(total)}. `:'')+'Tap a slice to filter your history.'; return; }
  const k = totals.find(t=>t.id===id); if (!k) return;
  el.textContent = `${k.icon} ${k.name}: ${money(k.v)} (${Math.round(k.v/total*100)}% of spending)`;
}

function renderWeek(){
  const t = today(), al = allowance();
  const days = Array.from({length:7},(_,i)=>addDays(t,i-6));
  const vals = days.map(sumOn);
  if (!vals.some(v=>v>0)) { $('week').innerHTML = `<div class="empty"><big>📅</big>Your daily bars show up here once you log spending.</div>`; return; }
  const max = Math.max(...vals, al, 1);
  $('week').innerHTML = `
    <div class="wplot">
      ${vals.map((v,i)=>`<div class="wcol" title="${dayLabel(days[i])}: ${money(v)}"><div class="wbar ${v>al+0.0001?'over':''} ${days[i]===t?'today':''}" style="height:${v/max*100}%"></div></div>`).join('')}
      <div class="wline" style="bottom:${al/max*100}%"></div>
    </div>
    <div class="wlab">${days.map((d,i)=>`<span>${parse(d).toLocaleDateString(undefined,{weekday:'short'})}<small>${vals[i]?short(vals[i]):'–'}</small></span>`).join('')}</div>
    <div class="legend-note"><span><i></i>Daily allowance ${money(al)}</span><span style="color:var(--bad)">Red bar = over allowance</span></div>`;
}

function renderFacts(){
  const c = calc();
  if (!c.periodExp.length) { $('facts').innerHTML = `<div class="empty">Stats appear after your first expense.</div>`; return; }
  const biggest = c.periodExp.reduce((m,e)=>e.amt>m.amt?e:m, c.periodExp[0]);
  const top = catTotals()[0];
  const avg = c.spent/(c.elapsed+1);
  $('facts').innerHTML = `<div class="facts">
    <div class="fact"><span>Average per day</span><b>${money(avg)}</b></div>
    <div class="fact"><span>Expenses logged</span><b>${c.periodExp.length}</b></div>
    <div class="fact"><span>Biggest hit</span><b>${money(biggest.amt)}</b><span>${esc(biggest.note||catOf(biggest.cat).name)}</span></div>
    <div class="fact"><span>Top category</span><b>${top.icon} ${top.name}</b><span>${money(top.v)}</span></div></div>`;
}

function renderPast(){
  const {cur, prev} = pastTotals();
  if (!cur && !prev) { $('past').innerHTML = `<div class="empty"><big>🪞</big>Log a week of spending and you can start beating last week's version of you.</div>`; return; }
  const max = Math.max(cur,prev,1);
  let msg;
  if (!prev) msg = `No earlier week to beat yet. This week sets the bar.`;
  else if (cur<prev) msg = `You're spending ${Math.round((1-cur/prev)*100)}% less than last week. Past you is losing!`;
  else if (cur>prev) msg = `You're spending ${Math.round((cur/prev-1)*100)}% more than last week. Past you is ahead.`;
  else msg = `Dead even with last week.`;
  $('past').innerHTML = `<div class="vs">
    <div class="bar"><i style="width:${cur/max*100}%;background:var(--primary)"></i><span>Last 7 days · ${money(cur)}</span></div>
    <div class="bar"><i style="width:${prev/max*100}%;background:var(--line)"></i><span>The 7 days before · ${money(prev)}</span></div></div>
    <p class="small" style="margin:12px 4px 0">${msg}</p>`;
}

function renderQuests(){
  const ready = chestReady();
  $('chest').innerHTML = `<div class="chest ${ready?'ready':''}"><span class="big" aria-hidden="true">${ready?'🎁':'📭'}</span>
    <div style="flex:1"><b>${ready?'Loot box ready!':'Loot box opened'}</b>
    <div class="small muted" style="margin-top:4px">${ready?'Open it for a surprise XP bonus.':'A new one drops tomorrow.'}</div></div>
    <button class="btn sm" data-act="chest" ${ready?'':'disabled'}>${ready?'Open':'Done'}</button></div>`;
  $('quests').innerHTML = quests().map(q=>`
    <div class="quest">
      <div class="q"><b>${q.title}</b>
        <span class="tag">${q.scope}</span><span class="small muted">${q.prog}/${q.goal} · ${q.xp} XP</span>
        <div class="qbar"><i style="width:${q.prog/q.goal*100}%"></i></div></div>
      ${q.claimed ? `<span class="done-tag">DONE ★</span>`
        : `<button class="btn sm ${q.done?'':'ghost'}" ${q.done?'':'disabled'} data-act="claim" data-id="${q.id}" data-key="${q.key}" data-xp="${q.xp}" data-title="${esc(q.title)}">${q.done?`+${q.xp} XP`:'Locked'}</button>`}
    </div>`).join('');
}

function renderGoals(){
  if (!S.goals.length) { $('goals').innerHTML = `<div class="empty"><big>🎧</big>Add something you actually want and fill it up bit by bit.</div>`; return; }
  $('goals').innerHTML = S.goals.map(g=>{
    const saved = g.contribs.reduce((a,c)=>a+c.amt,0), pct = Math.min(100,saved/g.target*100), done = saved>=g.target-0.0001;
    return `<div class="goal ${done?'reached':''}">
      <div class="row between"><b style="font-family:var(--pixel);font-weight:400;font-size:12px;line-height:1.6">${esc(g.name)}</b><button class="x" data-act="del-goal" data-id="${g.id}" aria-label="Remove goal ${esc(g.name)}">✕</button></div>
      <div class="small muted" style="margin-top:6px">${money(saved)} of ${money(g.target)} · ${Math.round(pct)}%${done?' · LOOT SECURED 🎉':''}</div>
      <div class="mini"><i style="width:${pct}%"></i></div>
      ${done?'':`<div class="goal-add"><input type="number" min="0.01" step="any" inputmode="decimal" placeholder="Amount" aria-label="Amount to stash for ${esc(g.name)}" id="ga-${g.id}"><button class="btn sm" data-act="fund" data-id="${g.id}">Stash</button></div>`}
    </div>`;
  }).join('');
}

function renderBadges(){
  $('badges').innerHTML = ACHIEVEMENTS.map(a=>{
    const got = S.achievements[a.id];
    return `<div class="badge ${got?'on':'locked'}"><span class="e">${a.icon}</span><b>${a.name}</b><small>${got?'Unlocked':a.desc}</small></div>`;
  }).join('');
}

function renderTabs(){
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected', b.dataset.tab===tab));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('on', p.dataset.panel===tab));
  $('quest-dot').hidden = !(chestReady() || quests().some(q=>q.done&&!q.claimed));
}

/* ---------- customise dialog ---------- */
function renderCustom(){
  const cur = document.documentElement.dataset.theme, lvl = levelInfo(S.xp).lvl;
  $('themes').querySelectorAll('[data-theme-pick]').forEach(b=>b.setAttribute('aria-pressed', b.dataset.themePick===cur));
  $('avatars').innerHTML = AVATARS.map(([e,n,need])=>{
    const locked = lvl<need;
    return `<button class="av" data-avatar="${e}" ${locked?'disabled':''} aria-pressed="${S.prefs.avatar===e}"><span>${e}</span>${locked?`Lv ${need}`:n}</button>`;
  }).join('');
}

/* ---------- actions ---------- */
function addExpense(amt, cat, note, date){
  const t = today(), wasOver = sumOn(t) > allowance()+0.0001, wasBroke = calc().balance < 0;
  S.expenses.push({id:uid(), amt, cat, note, date, ts:Date.now()});
  S.xpDay[t] = (S.xpDay[t]||0)+1;
  sfx('coin');
  if (S.xpDay[t] <= 3) addXP(10, 'expense logged');
  if (!wasBroke && calc().balance < 0) { toast('You are over budget now.', 'bad'); sfx('bad'); }
  else if (date===t && !wasOver && sumOn(t) > allowance()+0.0001) { toast("Over today's daily allowance. Streak paused.", 'bad'); sfx('bad'); }
  commit();
}

document.addEventListener('click', e=>{
  const btn = e.target.closest('[data-act]');
  if (btn) {
    const act = btn.dataset.act, id = btn.dataset.id;
    if (act==='clear-filter') { catFilter=null; render(); }
    else if (act==='del-exp') { S.expenses = S.expenses.filter(x=>x.id!==id); save(); render(); }
    else if (act==='claim') {
      const k = id+':'+btn.dataset.key;
      if (!S.claimed[k]) { S.claimed[k]=true; announce('QUEST COMPLETE!', btn.dataset.title, '⚔️', 'claim'); addXP(+btn.dataset.xp,'quest complete'); confetti(); commit(); }
    }
    else if (act==='chest') {
      if (!chestReady()) return;
      const table = [10,10,15,15,20,25,30,40,60];
      const r = table[Math.floor(Math.random()*table.length)];
      S.chestDay = today(); S.chests++; announce('LOOT BOX!', `You found ${r} XP`, '🎁', 'claim'); addXP(r,'daily loot box'); confetti(); commit();
    }
    else if (act==='del-goal') {
      const g = S.goals.find(x=>x.id===id); if (!g) return;
      if (confirm(`Remove "${g.name}"? Any money saved in it goes back to your spendable balance.`)) { S.goals=S.goals.filter(x=>x.id!==id); save(); render(); }
    }
    else if (act==='fund') {
      const g = S.goals.find(x=>x.id===id), input = $('ga-'+id), amt = parseFloat(input.value);
      if (!(amt>0)) { sfx('bad'); return toast('Enter an amount to stash.','bad'); }
      const c = calc();
      if (amt > c.balance+0.0001) { sfx('bad'); return toast(`You only have ${money(Math.max(0,c.balance))} spendable right now.`,'bad'); }
      const saved = g.contribs.reduce((a,x)=>a+x.amt,0);
      const put = Math.min(amt, g.target-saved);
      g.contribs.push({amt:put, date:today()});
      sfx('coin');
      if (saved+put >= g.target-0.0001 && !g.reachedOn) { g.reachedOn = today(); announce('LOOT SECURED!', g.name, '🏆'); addXP(50,'goal funded'); confetti(); }
      else addXP(5,'saving');
      commit();
    }
    return;
  }
  const mode = e.target.closest('[data-mode]');
  if (mode) { S.prefs.chart = mode.dataset.mode; save(); renderCharts(); return; }
  const catEl = e.target.closest('#chartCard [data-cat]');
  if (catEl) { const id = catEl.dataset.cat; catFilter = catFilter===id ? null : id; render(); if (catFilter) toast(`Filtered to ${catOf(catFilter).name}. See it on the Base tab.`); return; }
  const tb = e.target.closest('.tab');
  if (tb) { tab = tb.dataset.tab; renderTabs(); window.scrollTo({top:0}); return; }
});
document.addEventListener('mouseover', e=>{ const c=e.target.closest('#chartCard [data-cat]'); if (c) hoverCat(c.dataset.cat); });
document.addEventListener('mouseout',  e=>{ if (e.target.closest('#chartCard [data-cat]')) hoverCat(null); });
document.addEventListener('focusin',   e=>{ const c=e.target.closest('#chartCard [data-cat]'); if (c) hoverCat(c.dataset.cat); });

/* log-expense form */
function renderCatPicker(){
  $('e-cats').innerHTML = CATS.map(k=>`<button type="button" class="cat" data-pick="${k.id}" aria-pressed="${catPick===k.id}"><span>${k.icon}</span>${k.name}</button>`).join('');
}
$('e-cats').addEventListener('click', e=>{
  const b = e.target.closest('[data-pick]'); if (!b) return;
  catPick = b.dataset.pick; renderCatPicker();
});
$('add-form').addEventListener('submit', e=>{
  e.preventDefault();
  const amt = parseFloat($('e-amt').value), date = $('e-date').value || today();
  if (!(amt>0)) { $('e-err').textContent = 'Enter an amount greater than 0.'; $('e-amt').focus(); return; }
  if (date > today()) { $('e-err').textContent = "That date is in the future. Pick today or earlier."; return; }
  if (date < S.profile.start) { $('e-err').textContent = `That date is before this level started (${S.profile.start}). Pick ${S.profile.start} or later.`; return; }
  $('e-err').textContent = '';
  const amt2 = Math.round(amt*100)/100;
  addExpense(amt2, catPick, $('e-note').value.trim(), date);
  toast(`Logged ${money(amt2)} under ${catOf(catPick).name}`);
  $('e-amt').value=''; $('e-note').value=''; $('e-date').value=today(); $('e-amt').focus();
});
$('nospend').addEventListener('click', ()=>{
  const t = today();
  if (S.nospend.includes(t) || S.expenses.some(e=>e.date===t)) return;
  S.nospend.push(t); sfx('claim'); addXP(15,'no-spend day'); commit();
});

/* goal form */
$('goal-form').addEventListener('submit', e=>{
  e.preventDefault();
  const name = $('g-name').value.trim(), target = parseFloat($('g-target').value);
  if (!name) { $('g-err').textContent = 'Give your goal a name.'; return; }
  if (!(target>0)) { $('g-err').textContent = 'Enter the price.'; return; }
  $('g-err').textContent = '';
  S.goals.push({id:uid(), name, target, contribs:[], reachedOn:null});
  addXP(10,'goal created');
  $('g-name').value=''; $('g-target').value='';
  commit();
});

/* sound toggle, customise, settings */
$('sound-btn').addEventListener('click', ()=>{ S.prefs.sound = !S.prefs.sound; save(); renderHeader(); if (S.prefs.sound) sfx('coin'); });
$('avatar-btn').addEventListener('click', ()=>{ renderCustom(); $('custom').showModal(); });
$('c-close').addEventListener('click', ()=>$('custom').close());
$('themes').addEventListener('click', e=>{ const b=e.target.closest('[data-theme-pick]'); if (b) setTheme(b.dataset.themePick); });
$('avatars').addEventListener('click', e=>{ const b=e.target.closest('[data-avatar]'); if (b && !b.disabled) { S.prefs.avatar=b.dataset.avatar; save(); renderCustom(); render(); } });

$('open-settings').addEventListener('click', ()=>{
  const p = S.profile;
  $('n-cur').value=p.currency; $('n-per').value=p.period; $('n-budget').value=p.budget; $('n-res').value=p.reserve||'';
  $('n-err').textContent=''; $('settings').showModal();
});
$('n-close').addEventListener('click', ()=>$('settings').close());
$('n-start').addEventListener('click', ()=>{
  const budget=parseFloat($('n-budget').value), reserve=parseFloat($('n-res').value)||0;
  if (!(budget>0)) return $('n-err').textContent='Enter a budget greater than 0.';
  if (reserve<0 || reserve>=budget) return $('n-err').textContent='Your reserve must be less than your budget.';
  Object.assign(S.profile,{currency:$('n-cur').value, period:$('n-per').value, budget, reserve, start:today()});
  save(); $('settings').close(); catFilter=null; $('e-date').min=S.profile.start; $('e-date').value=today(); render(); toast('New level started. Full HP!','good');
});
$('n-reset').addEventListener('click', ()=>{
  if (confirm('This deletes your profile, expenses, goals, XP and trophies. Continue?')) {
    localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); S=null; $('settings').close(); boot();
  }
});

/* setup */
function groupPick(groupId){
  $(groupId).addEventListener('click', e=>{
    const b = e.target.closest('.chip'); if (!b) return;
    $(groupId).querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed', x===b));
  });
}
groupPick('s-role'); groupPick('s-per');
const picked = id => $(id).querySelector('[aria-pressed=true]').dataset.v;
$('s-go').addEventListener('click', ()=>{
  const name=$('s-name').value.trim(), budget=parseFloat($('s-budget').value), reserve=parseFloat($('s-res').value)||0;
  const err = m => { $('s-err').textContent = m; };
  if (!name) return err('Enter a player name first.');
  if (!(budget>0)) return err('Enter your starting cash (more than 0).');
  if (reserve<0) return err("Your reserve can't be negative.");
  if (reserve>=budget) return err('Your reserve must be less than your total budget, or you would have nothing to spend.');
  const t = today();
  S = freshState({name, role:picked('s-role'), currency:$('s-cur').value, period:picked('s-per'), budget, reserve, start:t, joined:t});
  S.prefs.theme = document.documentElement.dataset.theme;
  save(); boot();
  announce('GAME START!', `Good luck, ${name}`, '🎮', 'claim');
});
['s-name','s-budget','s-res'].forEach(id=>$(id).addEventListener('keydown',e=>{ if(e.key==='Enter') $('s-go').click(); }));

/* ---------- boot ---------- */
function boot(){
  applyTheme();
  if (!S || !S.profile) {
    $('app').hidden = true; $('setup').hidden = false;
    $('s-name').value=''; $('s-budget').value=''; $('s-res').value=''; $('s-err').textContent='';
    return;
  }
  $('setup').hidden = true; $('app').hidden = false;
  catPick = 'food'; catFilter = null; tab = 'home';
  renderCatPicker();
  $('e-date').value = today(); $('e-date').max = today(); $('e-date').min = S.profile.start;
  render();
}
boot();
