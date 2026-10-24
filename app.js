// =============================================================
//  ગાંડિવ એપ — Admin / Student / Parent
// =============================================================
import { firebaseConfig, ADMIN_EMAILS, ACADEMY, LOGIN_DOMAIN, isConfigured } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, initializeAuth, inMemoryPersistence, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, serverTimestamp, runTransaction, arrayUnion, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- નાના સાધનો ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const z2 = n => String(n).padStart(2, "0");
const ymd = (d = new Date()) => `${d.getFullYear()}-${z2(d.getMonth() + 1)}-${z2(d.getDate())}`;
const fmtD = s => (s ? s.split("-").reverse().join("/") : "");
const money = n => "₹ " + Math.round(Number(n) || 0).toLocaleString("en-IN");
const num = v => { const n = Number(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : 0; };
const MONTHS = ["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઑગસ્ટ", "સપ્ટેમ્બર", "ઑક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"];
const monthLabel = ym => { const [y, m] = ym.split("-"); return `${MONTHS[+m - 1]} ${y}`; };
const initial = s => esc((s || "?").trim().charAt(0));
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const appUrl = () => new URL("app.html", location.href).href;
const waLink = (phone, text) => `https://wa.me/${phone ? "91" + phone : ""}?text=${encodeURIComponent(text)}`;
const idToEmail = id => { id = String(id).trim(); return id.includes("@") ? id.toLowerCase() : id.toLowerCase().replace(/\s+/g, "") + "@" + LOGIN_DOMAIN; };
const genPwd = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
const by = (k, dir = 1) => (a, b) => (a[k] ?? "") > (b[k] ?? "") ? dir : (a[k] ?? "") < (b[k] ?? "") ? -dir : 0;

function toast(msg, err = false) {
  const t = $("#toast");
  t.textContent = msg; t.className = err ? "err" : "";
  clearTimeout(toast._t); toast._t = setTimeout(() => t.className = "hide", 3200);
}
function fail(e, fallback = "કંઈક ખોટું થયું. ફરી પ્રયત્ન કરો.") {
  console.error(e);
  const map = {
    "permission-denied": "આ કામની પરવાનગી નથી.",
    "unavailable": "ઇન્ટરનેટ નથી. કનેક્શન ચકાસો.",
    "auth/network-request-failed": "ઇન્ટરનેટ નથી. કનેક્શન ચકાસો.",
    "auth/invalid-credential": "ID અથવા પાસવર્ડ ખોટો છે.",
    "auth/wrong-password": "ID અથવા પાસવર્ડ ખોટો છે.",
    "auth/user-not-found": "ID અથવા પાસવર્ડ ખોટો છે.",
    "auth/invalid-email": "ID ખોટું છે.",
    "auth/too-many-requests": "ઘણા પ્રયત્નો થયા. થોડી વાર પછી ફરી પ્રયત્ન કરો.",
    "auth/operation-not-allowed": "Firebase માં Email/Password લોગિન ચાલુ નથી."
  };
  toast(map[e?.code] || e?.uiMsg || fallback, true);
}
async function busy(btn, fn) {
  if (!btn || btn.disabled) return;
  const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = "રાહ જુઓ…";
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = old; }
}
const formVals = f => { const o = {}; new FormData(f).forEach((v, k) => o[k] = typeof v === "string" ? v.trim() : v); return o; };

// ---------- આઇકન ----------
const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  check: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M9 15l2 2 4-4"/>',
  rupee: '<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 0 0 0-10"/>',
  test: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3M9 11h6M9 15h4"/>',
  more: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  wa: '<path d="M3 21l1.6-5A9 9 0 1 1 8 19.4z"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'
};
const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

// ---------- સ્થિર યાદીઓ ----------
const STDS = ["7", "8", "9", "10", "11", "12", "NMMS", "નવોદય", "CET"];
const STREAMS = ["", "સાયન્સ", "કોમર્સ", "આર્ટ્સ"];
const PAY_MODES = ["રોકડ", "UPI", "બેંક", "ચેક"];
const LEAD_ST = { new: "નવી", contacted: "સંપર્ક થયો", visit: "મુલાકાત / ડેમો", admitted: "પ્રવેશ", closed: "બંધ" };
const NOTICE_T = { notice: "સૂચના", homework: "હોમવર્ક", holiday: "રજા", meeting: "વાલી મીટિંગ" };
const MAT_T = { pdf: "PDF", video: "વિડિયો", link: "લિંક" };

// ---------- Firebase ----------
let app, auth, db, secAuth;
const S = {
  role: null, user: null, profile: null, tab: "home", sub: null,
  students: [], batches: [], payments: [], tests: [], leads: [], notices: [], materials: [], toppers: [], homework: [], punishments: [], timetable: [], ttBatch: null,
  payIdx: {}, q: "", fb: "all", fl: "new", ft: "all", fm: "all",
  att: null, todayAtt: null, todayKey: null,
  kids: [], kidIdx: 0, kid: null, exam: null, unsub: []
};

function boot() {
  if (!isConfigured()) {
    $("#boot").outerHTML = `<div class="setup"><div class="card"><h2 style="color:var(--ink)">સેટઅપ બાકી છે</h2>
      <p>config.js ફાઇલમાં Firebase ની માહિતી (firebaseConfig) નાખવાની બાકી છે. તે નાખ્યા પછી આ પેજ ફરી ખોલો.</p></div></div>`;
    return;
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch { db = initializeFirestore(app, {}); }
  secAuth = initializeAuth(initializeApp(firebaseConfig, "secondary"), { persistence: inMemoryPersistence });
  onAuthStateChanged(auth, onAuth);
}

function stopListeners() { S.unsub.forEach(u => { try { u(); } catch {} }); S.unsub = []; }

async function onAuth(u) {
  stopListeners();
  Object.assign(S, { role: null, user: u, profile: null, tab: "home", sub: null, exam: null, kid: null, kids: [], kidIdx: 0, att: null, todayAtt: null });
  $("#boot")?.remove();
  if (!u) { $("#shell").classList.add("hide"); $("#login").classList.remove("hide"); return; }
  try {
    if (ADMIN_EMAILS.map(e => e.toLowerCase()).includes((u.email || "").toLowerCase())) {
      S.role = "admin"; showShell(); startAdmin(); return;
    }
    const p = await getDoc(doc(db, "users", u.uid));
    if (!p.exists()) { toast("આ એકાઉન્ટ એકેડેમીમાં નોંધાયેલું નથી.", true); await signOut(auth); return; }
    S.profile = p.data(); S.role = S.profile.role;
    if (!["student", "parent"].includes(S.role) || !(S.profile.studentIds || []).length) {
      toast("એકાઉન્ટ અધૂરું છે. એકેડેમીનો સંપર્ક કરો.", true); await signOut(auth); return;
    }
    showShell();
    $("#view").innerHTML = `<div class="empty">લોડ થઈ રહ્યું છે…</div>`;
    await loadKid(0);
  } catch (e) { fail(e); }
}

function showShell() {
  $("#login").classList.add("hide"); $("#shell").classList.remove("hide");
  const sub = { admin: "એડમિન", student: "વિદ્યાર્થી", parent: "વાલી" }[S.role];
  $("#tb-sub").textContent = sub + " · " + ACADEMY.name;
  $("#tb-switch").classList.toggle("hide", !(S.role === "parent" && (S.profile.studentIds || []).length > 1));
  render();
}

// ---------- લોગિન ----------
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!auth) return;
  const id = $("#lg-id").value, pw = $("#lg-pw").value;
  if (!id.trim() || !pw) return toast("ID અને પાસવર્ડ બંને લખો.", true);
  await busy($("#lg-btn"), async () => {
    try { await signInWithEmailAndPassword(auth, idToEmail(id), pw); }
    catch (err) { fail(err); }
  });
});
$("#tb-out").addEventListener("click", async () => {
  if (S.exam) return toast("પહેલાં ટેસ્ટ સબમિટ કરો.", true);
  if (confirm("લોગઆઉટ કરવું છે?")) await signOut(auth);
});
$("#tb-switch").addEventListener("click", () => {
  const ids = S.profile.studentIds;
  openSheet("બાળક પસંદ કરો", `<div class="list">${ids.map((id, i) => `<button class="item" data-act="pickKid" data-i="${i}"><span class="av">${i + 1}</span><span class="mid"><b>${esc(S.kids[i]?.name || id)}</b><small>${esc(id)}</small></span></button>`).join("")}</div>`);
});

// ---------- રેન્ડર ----------
let rq = 0;
const schedule = () => { if (!rq) rq = requestAnimationFrame(() => { rq = 0; render(); }); };
function render() {
  if (!S.role) return;
  const v = $("#view");
  const a = document.activeElement;
  const keep = a && a.id && v.contains(a) ? { id: a.id, p: a.selectionStart } : null;
  const fn = VIEWS[S.role]?.[S.tab] || (() => "");
  v.innerHTML = S.exam ? viewExam() : fn();
  renderTabs();
  $("#tb-title").textContent = S.role === "admin" ? ACADEMY.name : (S.kid ? S.kid.s.name : ACADEMY.name);
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { el.setSelectionRange(keep.p, keep.p); } catch {} } }
}
const TABS = {
  admin: [["home", "હોમ", "home"], ["students", "વિદ્યાર્થી", "users"], ["att", "હાજરી", "check"], ["hw", "હોમવર્ક", "book"], ["fees", "ફી", "rupee"], ["tests", "ટેસ્ટ", "test"], ["more", "વધુ", "more"]],
  student: [["home", "હોમ", "home"], ["hw", "હોમવર્ક", "check"], ["tests", "ટેસ્ટ", "test"], ["notes", "નોટ્સ", "book"], ["progress", "પ્રગતિ", "chart"]],
  parent: [["home", "હોમ", "home"], ["hw", "હોમવર્ક", "book"], ["att", "હાજરી", "check"], ["marks", "માર્ક્સ", "chart"], ["fees", "ફી", "rupee"]]
};
function renderTabs() {
  const t = $("#tabs");
  t.classList.toggle("hide", !!S.exam);
  t.innerHTML = TABS[S.role].map(([k, l, i]) => `<button class="${S.tab === k ? "on" : ""}" data-act="tab" data-t="${k}"><span class="pill">${ic(i)}</span>${l}</button>`).join("");
}

// ---------- Sheet ----------
function openSheet(title, html, onMount) {
  closeSheet();
  const bg = document.createElement("div");
  bg.className = "sheet-bg";
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab"></div><div class="sh"><h3>${esc(title)}</h3><button class="x" data-act="closeSheet" aria-label="બંધ કરો">×</button></div><div class="sb">${html}</div></div>`;
  bg.addEventListener("click", e => { if (e.target === bg) closeSheet(); });
  $("#sheetRoot").appendChild(bg);
  const sh = bg.querySelector(".sheet");
  onMount && onMount(sh);
  return sh;
}
function closeSheet() { $("#sheetRoot").innerHTML = ""; }
addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

// ---------- ઇવેન્ટ ----------
const ACT = {}, FORMS = {}, CHG = {};
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const f = ACT[el.dataset.act];
  if (f) { e.preventDefault(); f(el, e); }
});
document.addEventListener("submit", e => {
  const f = e.target;
  if (f.dataset.form && FORMS[f.dataset.form]) { e.preventDefault(); FORMS[f.dataset.form](f, e.submitter || f.querySelector("[type=submit]")); }
});
document.addEventListener("input", e => {
  const k = e.target.dataset.bind;
  if (k) { S[k] = e.target.value; schedule(); }
});
document.addEventListener("change", e => {
  const k = e.target.dataset.change;
  if (k && CHG[k]) CHG[k](e.target);
});

ACT.tab = el => { S.tab = el.dataset.t; S.sub = null; S.q = ""; render(); scrollTo(0, 0); if (S.role === "admin") onAdminTab(); };
ACT.closeSheet = () => closeSheet();
ACT.sub = el => { S.sub = el.dataset.s; render(); scrollTo(0, 0); };
ACT.chip = el => { S[el.dataset.k] = el.dataset.v; render(); };
const chips = (k, items) => `<div class="chips">${items.map(([v, l]) => `<button class="chip ${S[k] === v ? "on" : ""}" data-act="chip" data-k="${k}" data-v="${esc(v)}">${esc(l)}</button>`).join("")}</div>`;
const empty = (t, s = "") => `<div class="empty"><b>${t}</b>${s}</div>`;
const batchName = id => id === "all" ? "બધા" : (S.batches.find(b => b.id === id)?.name || "—");
const batchOpts = (sel, withAll) => (withAll ? `<option value="all" ${sel === "all" ? "selected" : ""}>બધા</option>` : `<option value="">પસંદ કરો</option>`) +
  S.batches.slice().sort(by("name")).map(b => `<option value="${esc(b.id)}" ${b.id === sel ? "selected" : ""}>${esc(b.name)}</option>`).join("");
const opts = (arr, sel) => arr.map(v => `<option ${v === sel ? "selected" : ""}>${esc(v)}</option>`).join("");

// =============================================================
//  ADMIN
// =============================================================
function listen(name, ref, after) {
  S.unsub.push(onSnapshot(ref, snap => {
    S[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    after && after();
    schedule();
  }, err => { console.error(name, err); toast("ડેટા લોડ ન થયો (" + name + ")", true); }));
}
function startAdmin() {
  listen("students", collection(db, "students"));
  listen("batches", collection(db, "batches"));
  listen("payments", collection(db, "payments"), () => {
    S.payIdx = {};
    S.payments.forEach(p => S.payIdx[p.studentId] = (S.payIdx[p.studentId] || 0) + num(p.amount));
  });
  listen("tests", collection(db, "tests"));
  listen("leads", collection(db, "leads"));
  listen("notices", collection(db, "notices"));
  listen("materials", collection(db, "materials"));
  listen("toppers", collection(db, "toppers"));
  listen("homework", collection(db, "homework"));
  listen("punishments", collection(db, "punishments"));
  listen("timetable", collection(db, "timetable"));
  loadTodayAtt();
}
function onAdminTab() { if (S.tab === "home") loadTodayAtt(); }
async function loadTodayAtt() {
  const k = ymd();
  try {
    const snap = await getDocs(query(collection(db, "attendance"), where("date", "==", k)));
    S.todayAtt = {}; snap.forEach(d => S.todayAtt[d.data().batchId] = d.data()); S.todayKey = k;
    schedule();
  } catch (e) { console.warn(e); }
}
const active = () => S.students.filter(s => s.active !== false);
const feeNet = s => num(s.feeTotal) - num(s.discount);
const dueOf = s => feeNet(s) - (S.payIdx[s.id] || 0);

// ---------- Admin: Home ----------
function adminHome() {
  const act = active();
  const due = act.reduce((t, s) => t + Math.max(0, dueOf(s)), 0);
  const mk = ymd().slice(0, 7);
  const monthColl = S.payments.filter(p => (p.date || "").startsWith(mk)).reduce((t, p) => t + num(p.amount), 0);
  const absToday = Object.values(S.todayAtt || {}).reduce((t, a) => t + (a.absent || []).length, 0);
  const newLeads = S.leads.filter(l => (l.status || "new") === "new").length;
  const batches = S.batches.slice().sort(by("name"));
  const upcoming = S.tests.filter(t => (t.date || "") >= ymd() && !t.resultsPublished).sort(by("date")).slice(0, 4);
  const recent = S.payments.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || String(b.receiptNo).localeCompare(String(a.receiptNo))).slice(0, 5);
  const sName = id => S.students.find(s => s.id === id)?.name || id;
  return `
  <div class="stats">
    <div class="stat gold"><div class="n">${act.length}</div><div class="l">સક્રિય વિદ્યાર્થી</div></div>
    <div class="stat"><div class="n ${absToday ? "bad" : ""}">${S.todayAtt ? absToday : "–"}</div><div class="l">આજે ગેરહાજર</div></div>
    <div class="stat"><div class="n">${money(monthColl)}</div><div class="l">${MONTHS[new Date().getMonth()]}માં જમા</div></div>
    <div class="stat"><div class="n ${due > 0 ? "bad" : ""}">${money(due)}</div><div class="l">કુલ બાકી ફી</div></div>
  </div>
  ${newLeads ? `<button class="card item" style="border-radius:18px" data-act="goLeads"><span class="av">${newLeads}</span><span class="mid"><b>નવી પ્રવેશ પૂછપરછ</b><small>વેબસાઇટ પરથી આવેલી નોંધણી</small></span><span class="tag t-warn">જુઓ</span></button>` : ""}
  <div class="h"><h2>બેચ — આજની હાજરી</h2></div>
  ${batches.length ? `<div class="list">${batches.map(b => {
    const cnt = act.filter(s => s.batchId === b.id).length;
    const a = S.todayAtt?.[b.id];
    return `<button class="item" data-act="attBatch" data-b="${esc(b.id)}"><span class="av">${cnt}</span><span class="mid"><b>${esc(b.name)}</b><small>${esc(b.timing || "")}</small></span>${a ? `<span class="tag t-ok">પુરાઈ · ${(a.absent || []).length} ગેરહાજર</span>` : `<span class="tag t-warn">બાકી</span>`}</button>`;
  }).join("")}</div>` : `<div class="card">${empty("હજુ કોઈ બેચ નથી", `<p><button class="btn b-ink" data-act="goBatches">પહેલી બેચ બનાવો</button></p>`)}</div>`}
  ${(() => { const n = S.homework.filter(hwDue).length + S.punishments.filter(pnDue).length; return n ? `<button class="card item" style="border-radius:18px;border:2px solid var(--gold)" data-act="tab" data-t="hw"><span class="av">${n}</span><span class="mid"><b>આજે ચેક કરવાનું હોમવર્ક</b><small>હોમવર્ક અને સજા-હોમવર્ક</small></span><span class="tag t-warn">ચેક કરો</span></button>` : ""; })()}
  ${upcoming.length ? `<div class="h"><h2>આવનારા ટેસ્ટ</h2></div><div class="list">${upcoming.map(t => `<button class="item" data-act="openTest" data-id="${t.id}"><span class="mid"><b>${esc(t.title)}</b><small>${esc(batchName(t.batchId))} · ${fmtD(t.date)}</small></span><span class="tag ${t.type === "online" ? "t-ink" : "t-warn"}">${t.type === "online" ? "ઓનલાઇન" : "ક્લાસમાં"}</span></button>`).join("")}</div>` : ""}
  ${recent.length ? `<div class="h"><h2>છેલ્લી ફી જમા</h2></div><div class="list">${recent.map(p => `<button class="item" data-act="openStudent" data-id="${esc(p.studentId)}"><span class="mid"><b>${esc(sName(p.studentId))}</b><small>${fmtD(p.date)} · ${esc(p.mode)} · ${esc(p.receiptNo || "")}</small></span><span class="end ok">${money(p.amount)}</span></button>`).join("")}</div>` : ""}`;
}
ACT.goLeads = () => { S.tab = "more"; S.sub = "leads"; S.fl = "new"; render(); };
ACT.goBatches = () => { S.tab = "more"; S.sub = "batches"; render(); };
ACT.attBatch = el => { S.tab = "att"; S.att = { batchId: el.dataset.b, date: ymd(), marks: null }; render(); };

// ---------- Admin: Students ----------
function adminStudents() {
  const q = S.q.toLowerCase();
  let list = S.fb === "inactive" ? S.students.filter(s => s.active === false) : active();
  if (S.fb !== "all" && S.fb !== "inactive") list = list.filter(s => s.batchId === S.fb);
  if (q) list = list.filter(s => [s.name, s.id, s.parentPhone, s.phone, s.parentName].some(x => String(x || "").toLowerCase().includes(q)));
  list.sort(by("name"));
  return `
  <div class="h"><h2>વિદ્યાર્થી (${list.length})</h2><button class="btn b-ink b-sm" data-act="newStudent">${ic("plus")} ઉમેરો</button></div>
  <div class="search"><input class="in" id="q" data-bind="q" value="${esc(S.q)}" placeholder="નામ, ID અથવા મોબાઇલથી શોધો" type="search"></div>
  ${chips("fb", [["all", "બધા"], ...S.batches.slice().sort(by("name")).map(b => [b.id, b.name]), ["inactive", "છોડી ગયેલા"]])}
  ${list.length ? `<div class="list">${list.map(s => {
    const d = dueOf(s);
    return `<button class="item" data-act="openStudent" data-id="${esc(s.id)}"><span class="av">${initial(s.name)}</span><span class="mid"><b>${esc(s.name)}</b><small>${esc(s.id)} · ${esc(batchName(s.batchId))}</small></span>${d > 0 ? `<span class="tag t-bad">${money(d)}</span>` : `<span class="tag t-ok">ફી પૂરી</span>`}</button>`;
  }).join("")}</div>` : `<div class="card">${empty(S.students.length ? "કોઈ વિદ્યાર્થી મળ્યા નહીં" : "હજુ કોઈ વિદ્યાર્થી નથી", S.batches.length ? "" : "<p class='small'>પહેલાં ‘વધુ → બેચ’માં બેચ બનાવો.</p>")}</div>`}`;
}

function studentForm(s = {}, leadId = "") {
  const isNew = !s.id;
  const b = S.batches.find(x => x.id === s.batchId);
  return `<form data-form="student" data-id="${esc(s.id || "")}" data-lead="${esc(leadId)}">
    <div class="f"><label class="l">વિદ્યાર્થીનું નામ *</label><input class="in" name="name" required maxlength="80" value="${esc(s.name)}"></div>
    <div class="g2">
      <div class="f"><label class="l">વાલીનું નામ</label><input class="in" name="parentName" maxlength="80" value="${esc(s.parentName)}"></div>
      <div class="f"><label class="l">વાલી મોબાઇલ *</label><input class="in" name="parentPhone" inputmode="numeric" maxlength="10" required value="${esc(s.parentPhone)}" ${isNew ? "" : "readonly"}></div>
    </div>
    ${isNew ? "" : `<p class="small muted" style="margin:-6px 0 10px">વાલી મોબાઇલ એ વાલીનું લોગિન ID છે, તેથી બદલી શકાતો નથી.</p>`}
    <div class="g2">
      <div class="f"><label class="l">બેચ *</label><select class="in" name="batchId" required data-change="feeFromBatch">${batchOpts(s.batchId)}</select></div>
      <div class="f"><label class="l">વિદ્યાર્થી મોબાઇલ</label><input class="in" name="phone" inputmode="numeric" maxlength="10" value="${esc(s.phone)}"></div>
    </div>
    <div class="f"><label class="l">શાળા</label><input class="in" name="school" maxlength="100" value="${esc(s.school)}"></div>
    <div class="g3">
      <div class="f"><label class="l">કુલ ફી ₹</label><input class="in" name="feeTotal" inputmode="numeric" value="${esc(s.feeTotal ?? b?.fee ?? "")}"></div>
      <div class="f"><label class="l">છૂટ ₹</label><input class="in" name="discount" inputmode="numeric" value="${esc(s.discount ?? "")}"></div>
      <div class="f"><label class="l">ફીની તારીખ</label><input class="in" type="date" name="dueDate" value="${esc(s.dueDate || "")}"></div>
    </div>
    <div class="f"><label class="l">પ્રવેશ તારીખ</label><input class="in" type="date" name="joinDate" value="${esc(s.joinDate || ymd())}"></div>
    <button class="btn b-ink b-full" type="submit">${isNew ? "વિદ્યાર્થી ઉમેરો અને લોગિન બનાવો" : "ફેરફાર સાચવો"}</button>
  </form>`;
}
CHG.feeFromBatch = sel => {
  const f = sel.form, b = S.batches.find(x => x.id === sel.value);
  if (b?.fee && !f.feeTotal.value) f.feeTotal.value = b.fee;
};
ACT.newStudent = () => {
  if (!S.batches.length) return toast("પહેલાં ‘વધુ → બેચ’માં બેચ બનાવો.", true);
  openSheet("નવો વિદ્યાર્થી", studentForm());
};

FORMS.student = async (f, btn) => {
  const v = formVals(f), id = f.dataset.id, leadId = f.dataset.lead;
  if (!v.name) return toast("નામ લખો.", true);
  if (!/^[6-9]\d{9}$/.test(v.parentPhone)) return toast("વાલીનો સાચો 10 આંકડાનો મોબાઇલ લખો.", true);
  if (v.phone && !/^[6-9]\d{9}$/.test(v.phone)) return toast("વિદ્યાર્થીનો મોબાઇલ 10 આંકડાનો હોવો જોઈએ.", true);
  if (!v.batchId) return toast("બેચ પસંદ કરો.", true);
  const data = {
    name: v.name, parentName: v.parentName, parentPhone: v.parentPhone, phone: v.phone, batchId: v.batchId,
    school: v.school, feeTotal: num(v.feeTotal), discount: num(v.discount), dueDate: v.dueDate || "", joinDate: v.joinDate || ymd()
  };
  if (data.discount > data.feeTotal) return toast("છૂટ કુલ ફી કરતાં વધારે ન હોઈ શકે.", true);
  await busy(btn, async () => {
    try {
      if (id) { await updateStudent(id, data); closeSheet(); toast("સાચવ્યું."); }
      else {
        const res = await createStudent(data);
        if (leadId) await updateDoc(doc(db, "leads", leadId), { status: "admitted", studentId: res.sid }).catch(() => {});
        closeSheet(); showCreds(res.sid, res.creds, data);
      }
    } catch (e) { fail(e); }
  });
};

async function createStudent(d) {
  const roll = await runTransaction(db, async tx => {
    const ref = doc(db, "meta", "counters");
    const snap = await tx.get(ref);
    const n = snap.exists() && snap.data().roll ? snap.data().roll + 1 : 101;
    tx.set(ref, { roll: n }, { merge: true });
    return n;
  });
  const sid = "G" + roll;
  const sPwd = genPwd();
  const sc = await createUserWithEmailAndPassword(secAuth, idToEmail(sid), sPwd);
  const sUid = sc.user.uid;
  await signOut(secAuth);

  const pRef = doc(db, "parents", d.parentPhone);
  const pSnap = await getDoc(pRef);
  let pUid, pPwd = null;
  if (pSnap.exists()) {
    pUid = pSnap.data().uid;
    const old = await getDocs(query(collection(db, "creds"), where("parentLogin", "==", d.parentPhone)));
    old.forEach(x => { if (!pPwd && x.data().parentPwd) pPwd = x.data().parentPwd; });
  } else {
    pPwd = genPwd();
    try {
      const pc = await createUserWithEmailAndPassword(secAuth, idToEmail(d.parentPhone), pPwd);
      pUid = pc.user.uid; await signOut(secAuth);
    } catch (e) {
      if (e.code === "auth/email-already-in-use") e.uiMsg = "આ મોબાઇલ નંબરનું જૂનું અધૂરું વાલી એકાઉન્ટ છે. Firebase Console → Authentication માંથી તે યુઝર કાઢીને ફરી પ્રયત્ન કરો.";
      throw e;
    }
  }
  const b = writeBatch(db);
  b.set(doc(db, "students", sid), { ...d, roll, uid: sUid, parentUid: pUid, active: true, createdAt: serverTimestamp() });
  b.set(doc(db, "users", sUid), { role: "student", name: d.name, studentIds: [sid], batchIds: [d.batchId] });
  b.set(doc(db, "users", pUid), { role: "parent", name: d.parentName || "", studentIds: arrayUnion(sid), batchIds: arrayUnion(d.batchId) }, { merge: true });
  b.set(pRef, { uid: pUid, studentIds: arrayUnion(sid) }, { merge: true });
  const creds = { sid, studentPwd: sPwd, parentLogin: d.parentPhone, parentPwd: pPwd || "" };
  b.set(doc(db, "creds", sid), creds);
  await b.commit();
  return { sid, creds };
}

async function updateStudent(id, d) {
  const s = S.students.find(x => x.id === id);
  delete d.parentPhone;
  const b = writeBatch(db);
  b.update(doc(db, "students", id), d);
  if (s && s.batchId !== d.batchId) {
    if (s.uid) b.update(doc(db, "users", s.uid), { batchIds: [d.batchId] });
    if (s.parentUid) {
      const sibs = S.students.filter(x => x.parentUid === s.parentUid).map(x => x.id === id ? d.batchId : x.batchId);
      b.update(doc(db, "users", s.parentUid), { batchIds: [...new Set(sibs)] });
    }
  }
  await b.commit();
}

function credsText(name, c) {
  return `${ACADEMY.name} — એપ લોગિન\n${appUrl()}\n\nવિદ્યાર્થી: ${name}\nID: ${c.sid}\nપાસવર્ડ: ${c.studentPwd}\n\nવાલી માટે\nID: ${c.parentLogin}\nપાસવર્ડ: ${c.parentPwd || "(અગાઉ મોકલેલો)"}\n\nએપ ખોલી ‘Add to Home screen’ / ‘Install’ દબાવો.`;
}
function showCreds(sid, c, s) {
  openSheet("લોગિન તૈયાર છે", `
    <div class="card"><div class="kv"><span>વિદ્યાર્થી ID</span><b>${esc(c.sid)}</b></div><div class="kv"><span>વિદ્યાર્થી પાસવર્ડ</span><b>${esc(c.studentPwd)}</b></div>
    <div class="kv"><span>વાલી ID</span><b>${esc(c.parentLogin)}</b></div><div class="kv"><span>વાલી પાસવર્ડ</span><b>${esc(c.parentPwd || "અગાઉ મોકલેલો")}</b></div></div>
    <a class="btn b-wa b-full" target="_blank" rel="noopener" href="${waLink(s.parentPhone, credsText(s.name, c))}">${ic("wa")} વાલીને WhatsApp પર મોકલો</a>`);
}
ACT.sendCreds = async el => {
  const s = S.students.find(x => x.id === el.dataset.id);
  try {
    const c = await getDoc(doc(db, "creds", s.id));
    if (!c.exists()) return toast("લોગિન માહિતી મળી નહીં.", true);
    showCreds(s.id, c.data(), s);
  } catch (e) { fail(e); }
};

ACT.openStudent = async el => {
  const s = S.students.find(x => x.id === el.dataset.id);
  if (!s) return toast("વિદ્યાર્થી મળ્યા નહીં.", true);
  const pays = S.payments.filter(p => p.studentId === s.id).sort(by("date", -1));
  const paid = S.payIdx[s.id] || 0, d = dueOf(s);
  const sh = openSheet(s.name, `
    <div class="card">
      <div class="kv"><span>ID</span><b>${esc(s.id)}</b></div>
      <div class="kv"><span>બેચ</span><b>${esc(batchName(s.batchId))}</b></div>
      <div class="kv"><span>વાલી</span><b>${esc(s.parentName || "—")} · ${esc(s.parentPhone)}</b></div>
      ${s.phone ? `<div class="kv"><span>વિદ્યાર્થી મોબાઇલ</span><b>${esc(s.phone)}</b></div>` : ""}
      ${s.school ? `<div class="kv"><span>શાળા</span><b>${esc(s.school)}</b></div>` : ""}
      <div class="kv"><span>પ્રવેશ</span><b>${fmtD(s.joinDate)}</b></div>
    </div>
    <div class="card">
      <div class="kv"><span>કુલ ફી</span><b>${money(s.feeTotal)}</b></div>
      ${num(s.discount) ? `<div class="kv"><span>છૂટ</span><b>− ${money(s.discount)}</b></div>` : ""}
      <div class="kv"><span>ભરેલી</span><b class="ok">${money(paid)}</b></div>
      <div class="kv"><span>બાકી</span><b class="${d > 0 ? "bad" : "ok"}">${money(d)}</b></div>
      ${s.dueDate && d > 0 ? `<div class="kv"><span>ભરવાની તારીખ</span><b>${fmtD(s.dueDate)}</b></div>` : ""}
    </div>
    <div class="row-btns" style="margin-bottom:12px">
      <button class="btn b-gold" data-act="addPay" data-id="${esc(s.id)}">${ic("rupee")} ફી જમા</button>
      ${d > 0 ? `<a class="btn b-wa" target="_blank" rel="noopener" href="${waLink(s.parentPhone, feeReminder(s, d))}">${ic("wa")} ફી યાદ</a>` : ""}
      <a class="btn b-line" href="tel:+91${esc(s.parentPhone)}">${ic("phone")} ફોન</a>
      <button class="btn b-line" data-act="sendCreds" data-id="${esc(s.id)}">લોગિન મોકલો</button>
      <button class="btn b-line" data-act="editStudent" data-id="${esc(s.id)}">ફેરફાર</button>
    </div>
    ${pays.length ? `<div class="h"><h2 style="font-size:18px">ચુકવણી</h2></div><div class="list">${pays.map(p => `<button class="item" data-act="receipt" data-id="${p.id}"><span class="mid"><b>${money(p.amount)}</b><small>${fmtD(p.date)} · ${esc(p.mode)} · ${esc(p.receiptNo)}</small></span><span class="tag t-ink">રસીદ</span></button>`).join("")}</div>` : ""}
    <div class="h"><h2 style="font-size:18px">ટેસ્ટ પરિણામ</h2></div><div id="stuRes" class="small muted">લોડ થઈ રહ્યું છે…</div>
    <p style="margin-top:16px">${s.active === false
      ? `<button class="btn b-line b-full" data-act="setActive" data-id="${esc(s.id)}" data-v="1">ફરી સક્રિય કરો</button>`
      : `<button class="btn b-bad b-full" data-act="setActive" data-id="${esc(s.id)}" data-v="0">એકેડેમી છોડી દીધી (નિષ્ક્રિય કરો)</button>`}</p>`);
  try {
    const rs = (await getDocs(query(collection(db, "results"), where("studentId", "==", s.id)))).docs.map(x => x.data())
      .filter(r => r.marks != null || r.absent).sort(by("date", -1)).slice(0, 8);
    const box = sh.querySelector("#stuRes");
    if (box) box.outerHTML = rs.length ? `<div class="list">${rs.map(r => `<div class="item"><span class="mid"><b>${esc(r.testTitle || "ટેસ્ટ")}</b><small>${esc(r.subject || "")} · ${fmtD(r.date)}</small></span><span class="end">${r.absent ? `<span class="tag t-bad">ગેરહાજર</span>` : `${r.marks}/${r.maxMarks}${r.rank ? ` · #${r.rank}` : ""}`}</span></div>`).join("")}</div>` : `<p class="small muted">હજુ કોઈ પરિણામ નથી.</p>`;
  } catch (e) { console.warn(e); }
};
ACT.editStudent = el => { const s = S.students.find(x => x.id === el.dataset.id); openSheet("ફેરફાર — " + s.name, studentForm(s)); };
ACT.setActive = async el => {
  const on = el.dataset.v === "1";
  if (!on && !confirm("આ વિદ્યાર્થીને નિષ્ક્રિય કરવા છે? તેમનો બધો ડેટા સચવાયેલો રહેશે.")) return;
  try { await updateDoc(doc(db, "students", el.dataset.id), { active: on }); closeSheet(); toast(on ? "સક્રિય કર્યા." : "નિષ્ક્રિય કર્યા."); } catch (e) { fail(e); }
};
const feeReminder = (s, d) => `નમસ્તે ${s.parentName || ""},\n${ACADEMY.name} તરફથી યાદી: ${s.name} (${s.id}) ની બાકી ફી ${money(d)} છે${s.dueDate ? `, ભરવાની તારીખ ${fmtD(s.dueDate)}` : ""}.${ACADEMY.upiId ? `\nUPI: ${ACADEMY.upiId}` : ""}\nઆભાર.`;

// ---------- Admin: Attendance ----------
function adminAtt() {
  if (!S.att) S.att = { batchId: S.batches.slice().sort(by("name"))[0]?.id || "", date: ymd(), marks: null };
  const A = S.att;
  if (!S.batches.length) return `<div class="card">${empty("હજુ કોઈ બેચ નથી", `<p><button class="btn b-ink" data-act="goBatches">બેચ બનાવો</button></p>`)}</div>`;
  if (A.batchId && !A.marks && !A.loading) loadAtt();
  const list = active().filter(s => s.batchId === A.batchId).sort(by("name"));
  const m = A.marks || {};
  const cnt = { p: 0, a: 0, l: 0 }; list.forEach(s => cnt[m[s.id] || "p"]++);
  return `
  <div class="h"><h2>હાજરી</h2></div>
  <div class="g2"><div class="f"><select class="in" data-change="attBatch">${batchOpts(A.batchId)}</select></div>
  <div class="f"><input class="in" type="date" value="${esc(A.date)}" max="${ymd()}" data-change="attDate"></div></div>
  ${A.saved ? `<div class="card small" style="background:var(--ok-soft);border-color:#BFE3CF">આ દિવસની હાજરી પહેલેથી પુરાયેલી છે. ફેરફાર કરી ફરી સાચવી શકો છો.</div>` : ""}
  ${!A.marks ? `<div class="empty">લોડ થઈ રહ્યું છે…</div>` : list.length ? `
  <div class="row-btns" style="margin-bottom:10px"><span class="tag t-ok">હાજર ${cnt.p}</span><span class="tag t-bad">ગેરહાજર ${cnt.a}</span><span class="tag t-warn">મોડા ${cnt.l}</span>
  <button class="btn b-line b-sm" style="margin-left:auto" data-act="attAll">બધા હાજર</button></div>
  <div class="list">${list.map(s => {
    const v = m[s.id] || "p";
    return `<div class="item" style="cursor:default"><span class="av">${initial(s.name)}</span><span class="mid"><b>${esc(s.name)}</b><small>${esc(s.id)}</small></span>
    <span class="att">${[["p", "હા"], ["a", "ગે"], ["l", "મો"]].map(([k, l]) => `<button class="${k} ${v === k ? "on" : ""}" data-act="attMark" data-id="${esc(s.id)}" data-v="${k}" aria-label="${{ p: "હાજર", a: "ગેરહાજર", l: "મોડા" }[k]}">${l}</button>`).join("")}</span></div>`;
  }).join("")}</div>
  <button class="btn b-ink b-full" data-act="attSave">હાજરી સાચવો</button>` : `<div class="card">${empty("આ બેચમાં કોઈ વિદ્યાર્થી નથી")}</div>`}`;
}
async function loadAtt() {
  const A = S.att; if (!A?.batchId) return;
  A.loading = true; A.marks = null; A.saved = false;
  try {
    const d = await getDoc(doc(db, "attendance", `${A.batchId}_${A.date}`));
    const m = {};
    if (d.exists()) {
      const x = d.data(); A.saved = true;
      (x.absent || []).forEach(id => m[id] = "a"); (x.late || []).forEach(id => m[id] = "l");
    }
    A.marks = m;
  } catch (e) { fail(e); A.marks = {}; }
  A.loading = false; render();
}
CHG.attBatch = el => { S.att.batchId = el.value; loadAtt(); render(); };
CHG.attDate = el => { if (el.value > ymd()) return toast("ભવિષ્યની તારીખની હાજરી ન પુરાય.", true); S.att.date = el.value; loadAtt(); render(); };
ACT.attMark = el => { S.att.marks[el.dataset.id] = el.dataset.v; render(); };
ACT.attAll = () => { S.att.marks = {}; render(); };
ACT.attSave = async el => {
  const A = S.att, list = active().filter(s => s.batchId === A.batchId);
  const out = { present: [], absent: [], late: [] };
  list.forEach(s => { const v = A.marks[s.id] || "p"; out[{ p: "present", a: "absent", l: "late" }[v]].push(s.id); });
  await busy(el, async () => {
    try {
      await setDoc(doc(db, "attendance", `${A.batchId}_${A.date}`), { batchId: A.batchId, date: A.date, ...out, updatedAt: serverTimestamp() });
      A.saved = true; toast("હાજરી સાચવી.");
      if (A.date === ymd()) loadTodayAtt();
      render();
      if (out.absent.length) {
        const abs = list.filter(s => out.absent.includes(s.id));
        openSheet(`ગેરહાજર (${abs.length}) — વાલીને જાણ કરો`, `<div class="list">${abs.map(s => `<div class="item" style="cursor:default"><span class="mid"><b>${esc(s.name)}</b><small>${esc(s.parentPhone)}</small></span><a class="btn b-wa b-sm" target="_blank" rel="noopener" href="${waLink(s.parentPhone, `નમસ્તે ${s.parentName || ""},\n${ACADEMY.name}: ${s.name} આજે (${fmtD(A.date)}) ક્લાસમાં ગેરહાજર છે. કારણ જણાવશો.`)}">${ic("wa")} મોકલો</a></div>`).join("")}</div>`);
      }
    } catch (e) { fail(e); }
  });
};

// ---------- Admin: Fees ----------
function adminFees() {
  const q = S.q.toLowerCase();
  let list = active().map(s => ({ s, d: dueOf(s) }));
  if (S.ft === "due") list = list.filter(x => x.d > 0);
  if (S.ft === "late") list = list.filter(x => x.d > 0 && x.s.dueDate && x.s.dueDate < ymd());
  if (S.fm !== "all") list = list.filter(x => x.s.batchId === S.fm);
  if (q) list = list.filter(x => [x.s.name, x.s.id, x.s.parentPhone].some(v => String(v || "").toLowerCase().includes(q)));
  list.sort((a, b) => b.d - a.d);
  const totDue = list.reduce((t, x) => t + Math.max(0, x.d), 0);
  const totNet = list.reduce((t, x) => t + feeNet(x.s), 0);
  return `
  <div class="h"><h2>ફી</h2><button class="btn b-line b-sm" data-act="exportCsv" data-k="dues">${ic("dl")} યાદી</button></div>
  <div class="stats" style="grid-template-columns:1fr 1fr"><div class="stat"><div class="n">${money(totNet - totDue)}</div><div class="l">જમા (આ યાદીમાં)</div></div><div class="stat"><div class="n bad">${money(totDue)}</div><div class="l">બાકી</div></div></div>
  <div class="search"><input class="in" id="q" data-bind="q" value="${esc(S.q)}" placeholder="નામ / ID / મોબાઇલ" type="search"></div>
  ${chips("ft", [["all", "બધા"], ["due", "બાકીવાળા"], ["late", "તારીખ વીતી ગઈ"]])}
  ${chips("fm", [["all", "બધી બેચ"], ...S.batches.slice().sort(by("name")).map(b => [b.id, b.name])])}
  ${list.length ? `<div class="list">${list.map(({ s, d }) => `<button class="item" data-act="openStudent" data-id="${esc(s.id)}"><span class="av">${initial(s.name)}</span><span class="mid"><b>${esc(s.name)}</b><small>${esc(s.id)} · ${esc(batchName(s.batchId))}${s.dueDate && d > 0 ? " · " + fmtD(s.dueDate) : ""}</small></span><span class="end ${d > 0 ? "bad" : "ok"}">${d > 0 ? money(d) : "પૂરી"}</span></button>`).join("")}</div>` : `<div class="card">${empty("કોઈ નથી")}</div>`}`;
}
ACT.addPay = el => {
  const s = S.students.find(x => x.id === el.dataset.id), d = dueOf(s);
  openSheet("ફી જમા — " + s.name, `<form data-form="pay" data-id="${esc(s.id)}">
    <p class="small muted" style="margin-top:0">બાકી: <b class="${d > 0 ? "bad" : "ok"}">${money(d)}</b></p>
    <div class="g2"><div class="f"><label class="l">રકમ ₹ *</label><input class="in" name="amount" inputmode="numeric" required value="${d > 0 ? d : ""}"></div>
    <div class="f"><label class="l">રીત</label><select class="in" name="mode">${opts(PAY_MODES, "રોકડ")}</select></div></div>
    <div class="g2"><div class="f"><label class="l">તારીખ</label><input class="in" type="date" name="date" value="${ymd()}" max="${ymd()}"></div>
    <div class="f"><label class="l">આગામી હપ્તાની તારીખ</label><input class="in" type="date" name="next" value=""></div></div>
    <div class="f"><label class="l">નોંધ</label><input class="in" name="note" maxlength="120" placeholder="ઉદા. બીજો હપ્તો / UPI Ref."></div>
    <button class="btn b-gold b-full" type="submit">જમા કરો અને રસીદ બનાવો</button></form>`);
};
FORMS.pay = async (f, btn) => {
  const v = formVals(f), sid = f.dataset.id, amount = num(v.amount);
  if (amount <= 0) return toast("સાચી રકમ લખો.", true);
  if (!v.date) return toast("તારીખ પસંદ કરો.", true);
  await busy(btn, async () => {
    try {
      const pid = await runTransaction(db, async tx => {
        const cref = doc(db, "meta", "counters");
        const c = await tx.get(cref);
        const n = (c.exists() && c.data().receipt) ? c.data().receipt + 1 : 1;
        tx.set(cref, { receipt: n }, { merge: true });
        const pref = doc(collection(db, "payments"));
        tx.set(pref, { studentId: sid, amount, mode: v.mode, date: v.date, note: v.note || "", receiptNo: `${ACADEMY.receiptPrefix}-${String(n).padStart(4, "0")}`, createdAt: serverTimestamp() });
        return pref.id;
      });
      await updateDoc(doc(db, "students", sid), { dueDate: v.next || "" });
      closeSheet(); toast("ફી જમા થઈ.");
      let tries = 0;
      const show = () => S.payments.some(x => x.id === pid) ? ACT.receipt({ dataset: { id: pid } }) : (tries++ < 20 && setTimeout(show, 300));
      show();
    } catch (e) { fail(e); }
  });
};
function receiptHtml(p, s, paidTotal, net) {
  return `<div class="rcpt"><div class="rh"><div><h2>${esc(ACADEMY.name)}</h2><div class="small">${esc(ACADEMY.address)}<br>મો. ${esc(ACADEMY.phone)}</div></div><div style="text-align:right"><b>ફી રસીદ</b><div class="small">${esc(p.receiptNo)}</div><div class="small">${fmtD(p.date)}</div></div></div>
  <div class="kv"><span>વિદ્યાર્થી</span><b>${esc(s.name)} (${esc(s.id)})</b></div>
  <div class="kv"><span>બેચ</span><b>${esc(s._batch || batchName(s.batchId))}</b></div>
  <div class="kv"><span>ચુકવણી રીત</span><b>${esc(p.mode)}</b></div>
  ${p.note ? `<div class="kv"><span>નોંધ</span><b>${esc(p.note)}</b></div>` : ""}
  <div class="amt">${money(p.amount)}</div>
  <div class="kv"><span>કુલ ભરેલી ફી</span><b>${money(paidTotal)}</b></div>
  <div class="kv"><span>બાકી ફી</span><b>${money(net - paidTotal)}</b></div>
  <p class="small muted" style="margin-top:18px">આ કમ્પ્યુટરથી બનેલી રસીદ છે.</p></div>`;
}
function showReceipt(p, s, paidTotal, net) {
  const html = receiptHtml(p, s, paidTotal, net);
  const text = `${ACADEMY.name} — ફી રસીદ ${p.receiptNo}\nવિદ્યાર્થી: ${s.name} (${s.id})\nરકમ: ${money(p.amount)} (${p.mode})\nતારીખ: ${fmtD(p.date)}\nકુલ ભરેલી: ${money(paidTotal)}\nબાકી: ${money(net - paidTotal)}\nઆભાર.`;
  openSheet("રસીદ " + p.receiptNo, `${html}<div class="row-btns" style="margin-top:14px">
    <button class="btn b-ink" data-act="print">${ic("print")} પ્રિન્ટ / PDF</button>
    ${S.role === "admin" ? `<a class="btn b-wa" target="_blank" rel="noopener" href="${waLink(s.parentPhone, text)}">${ic("wa")} વાલીને મોકલો</a>` : ""}</div>`);
  $("#printArea").innerHTML = html;
}
ACT.print = () => window.print();
ACT.receipt = el => {
  if (S.role === "admin") {
    const p = S.payments.find(x => x.id === el.dataset.id);
    if (!p) return toast("રસીદ લોડ થઈ રહી છે, ફરી દબાવો.");
    const s = S.students.find(x => x.id === p.studentId);
    return showReceipt(p, s, S.payIdx[s.id] || 0, feeNet(s));
  }
  const K = S.kid, p = K.payments.find(x => x.id === el.dataset.id);
  showReceipt(p, { ...K.s, _batch: K.batch?.name }, K.paid, feeNet(K.s));
};

// ---------- Admin: Tests ----------
function adminTests() {
  const list = S.tests.filter(t => S.fm === "all" || t.batchId === S.fm).sort(by("date", -1));
  return `
  <div class="h"><h2>ટેસ્ટ</h2><button class="btn b-ink b-sm" data-act="newTest">${ic("plus")} નવો ટેસ્ટ</button></div>
  ${chips("fm", [["all", "બધી બેચ"], ...S.batches.slice().sort(by("name")).map(b => [b.id, b.name])])}
  ${list.length ? `<div class="list">${list.map(t => `<button class="item" data-act="openTest" data-id="${t.id}"><span class="mid"><b>${esc(t.title)}</b><small>${esc(batchName(t.batchId))} · ${esc(t.subject || "")} · ${fmtD(t.date)}</small></span>${testTag(t)}</button>`).join("")}</div>`
    : `<div class="card">${empty("હજુ કોઈ ટેસ્ટ નથી", "<p class='small'>ક્લાસમાં લીધેલા ટેસ્ટના માર્ક્સ કે મોબાઇલમાં ઓનલાઇન MCQ ટેસ્ટ — બંને અહીં બને છે.</p>")}</div>`}`;
}
function testTag(t) {
  if (t.resultsPublished) return `<span class="tag t-ok">પરિણામ જાહેર</span>`;
  if (t.type === "online") return t.published ? `<span class="tag t-ink">ચાલુ</span>` : `<span class="tag t-warn">ડ્રાફ્ટ</span>`;
  return `<span class="tag t-warn">માર્ક્સ બાકી</span>`;
}
const QFMT = `1. પ્રકાશનો વેગ કેટલો છે?\na) 3 × 10^8 m/s\nb) 3 × 10^6 m/s\nc) 3 × 10^5 m/s\nd) 3 × 10^3 m/s\nજવાબ: a\n\n2. બીજો પ્રશ્ન...`;
function testForm(t = {}, keyAns = []) {
  const qtxt = (t.questions || []).map((q, i) => `${i + 1}. ${q.q}\n${q.o.map((o, j) => `${"abcd"[j]}) ${o}`).join("\n")}\nજવાબ: ${"abcd"[keyAns[i]] ?? ""}`).join("\n\n");
  const online = (t.type || "online") === "online";
  return `<form data-form="test" data-id="${esc(t.id || "")}">
    <div class="f"><label class="l">ટેસ્ટનું નામ *</label><input class="in" name="title" required maxlength="100" value="${esc(t.title)}" placeholder="ઉદા. વિજ્ઞાન — પ્રકરણ 3 ટેસ્ટ"></div>
    <div class="g2"><div class="f"><label class="l">બેચ *</label><select class="in" name="batchId" required>${batchOpts(t.batchId)}</select></div>
    <div class="f"><label class="l">તારીખ</label><input class="in" type="date" name="date" value="${esc(t.date || ymd())}"></div></div>
    <div class="g2"><div class="f"><label class="l">વિષય</label><input class="in" name="subject" maxlength="40" value="${esc(t.subject)}" placeholder="ઉદા. વિજ્ઞાન"></div>
    <div class="f"><label class="l">પ્રકરણ</label><input class="in" name="chapter" maxlength="60" value="${esc(t.chapter)}" placeholder="ઉદા. 3 — પ્રકાશ"></div></div>
    <div class="f"><label class="l">પ્રકાર</label><select class="in" name="type" data-change="testType" ${t.id ? "disabled" : ""}>
      <option value="online" ${online ? "selected" : ""}>ઓનલાઇન MCQ (મોબાઇલમાં)</option><option value="offline" ${!online ? "selected" : ""}>ક્લાસમાં લીધેલો (ફક્ત માર્ક્સ)</option></select></div>
    <div data-sec="offline" class="${online ? "hide" : ""}"><div class="f"><label class="l">કુલ ગુણ *</label><input class="in" name="maxMarks" inputmode="decimal" value="${esc(!online ? t.maxMarks : "")}"></div></div>
    <div data-sec="online" class="${online ? "" : "hide"}">
      <div class="g2"><div class="f"><label class="l">સમય (મિનિટ)</label><input class="in" name="durationMin" inputmode="numeric" value="${esc(t.durationMin ?? 30)}"></div>
      <div class="f"><label class="l">દરેક પ્રશ્નના ગુણ</label><input class="in" name="marksEach" inputmode="decimal" value="${esc(t.marksEach ?? 1)}"></div></div>
      <label class="f" style="display:flex;gap:10px;align-items:center"><input type="checkbox" name="instant" ${t.instant !== false ? "checked" : ""} style="width:20px;height:20px"> સબમિટ કરતાં જ સાચા જવાબ અને ગુણ બતાવો</label>
      <div class="f"><label class="l">પ્રશ્નો (આ ફોર્મેટમાં લખો અથવા પેસ્ટ કરો)</label><textarea class="in" name="qs" rows="12" placeholder="${esc(QFMT)}">${esc(qtxt)}</textarea>
      <p class="small muted">દરેક પ્રશ્ન નંબરથી શરૂ કરો, 4 વિકલ્પ a) b) c) d) અને છેલ્લે ‘જવાબ: b’. ChatGPT/Claude પાસે આ જ ફોર્મેટમાં પ્રશ્નો બનાવડાવી સીધા પેસ્ટ કરી શકો છો.</p>
      <button class="btn b-line b-sm" type="button" data-act="checkQs">ફોર્મેટ ચકાસો</button><div id="qsCheck" class="small" style="margin-top:8px"></div></div>
    </div>
    <button class="btn b-ink b-full" type="submit" style="margin-top:14px">ટેસ્ટ સાચવો</button></form>`;
}
CHG.testType = el => {
  const f = el.form, on = el.value === "online";
  f.querySelector('[data-sec="online"]').classList.toggle("hide", !on);
  f.querySelector('[data-sec="offline"]').classList.toggle("hide", on);
};
function parseQs(txt) {
  const L = { a: 0, b: 1, c: 2, d: 3, "અ": 0, "બ": 1, "ક": 2, "ડ": 3 };
  const li = ch => L[String(ch).toLowerCase()] ?? -1;
  const qs = [], errs = [];
  let cur = null;
  const ansRe = /^(જવાબ|ઉત્તર|ans|answer)\s*[:\-–.]?\s*\(?([a-dA-Dઅબકડ])\)?/i;
  const optRe = /^\(?([a-dA-Dઅબકડ])\s*[\).:]\s*(.+)$/;
  const qRe = /^(?:Q\.?\s*|પ્ર\.?\s*)?(\d+)\s*[\).:]\s*(.+)$/i;
  const qRe2 = /^(?:Q\.?\s*|પ્ર\.?\s*)?([0-9૦-૯]+)\s+(.+)$/i;
  for (const raw of String(txt || "").replace(/\r/g, "").split("\n")) {
    const l = raw.trim().replace(/^([૦-૯]+)/, d => d.replace(/[૦-૯]/g, c => "૦૧૨૩૪૫૬૭૮૯".indexOf(c))); if (!l) continue;
    let m;
    if ((m = l.match(ansRe)) && cur) { cur.a = li(m[2]); continue; }
    if ((m = l.match(optRe)) && cur && cur.o.length < 4 && cur.a < 0) { cur.o.push(m[2].trim()); continue; }
    if ((m = l.match(qRe)) || ((!cur || cur.a >= 0) && (m = l.match(qRe2)))) { cur = { q: m[2].trim(), o: [], a: -1 }; qs.push(cur); continue; }
    if (cur && !cur.o.length) cur.q += "\n" + l;
    else if (cur && cur.o.length && cur.a < 0) cur.o[cur.o.length - 1] += " " + l;
  }
  if (!qs.length) errs.push("એક પણ પ્રશ્ન મળ્યો નહીં. ફોર્મેટ ચકાસો.");
  qs.forEach((q, i) => {
    if (q.o.length !== 4) errs.push(`પ્રશ્ન ${i + 1}: 4 વિકલ્પ જોઈએ, ${q.o.length} મળ્યા.`);
    if (q.a < 0) errs.push(`પ્રશ્ન ${i + 1}: ‘જવાબ: a/b/c/d’ નથી.`);
  });
  return { qs, errs };
}
ACT.checkQs = el => {
  const f = el.closest("form"), r = parseQs(f.qs.value), box = f.querySelector("#qsCheck");
  box.innerHTML = r.errs.length ? `<span class="bad">${r.errs.map(esc).join("<br>")}</span>` : `<span class="ok">✓ ${r.qs.length} પ્રશ્નો બરાબર છે.</span>`;
};
ACT.newTest = () => {
  if (!S.batches.length) return toast("પહેલાં બેચ બનાવો.", true);
  openSheet("નવો ટેસ્ટ", testForm());
};
FORMS.test = async (f, btn) => {
  const v = formVals(f), id = f.dataset.id;
  const type = id ? S.tests.find(t => t.id === id).type : v.type;
  if (!v.title) return toast("ટેસ્ટનું નામ લખો.", true);
  if (!v.batchId) return toast("બેચ પસંદ કરો.", true);
  const base = { title: v.title, batchId: v.batchId, date: v.date || ymd(), subject: v.subject || "", chapter: v.chapter || "", type };
  await busy(btn, async () => {
    try {
      if (type === "offline") {
        const mm = num(v.maxMarks); if (mm <= 0) return toast("કુલ ગુણ લખો.", true);
        const data = { ...base, maxMarks: mm, published: true };
        if (id) await updateDoc(doc(db, "tests", id), data);
        else await addDoc(collection(db, "tests"), { ...data, resultsPublished: false, createdAt: serverTimestamp() });
      } else {
        const r = parseQs(v.qs);
        if (r.errs.length) { f.querySelector("#qsCheck").innerHTML = `<span class="bad">${r.errs.map(esc).join("<br>")}</span>`; return toast("પ્રશ્નોમાં ભૂલ છે.", true); }
        const me = num(v.marksEach) || 1, dur = Math.max(1, Math.round(num(v.durationMin) || 30));
        const data = { ...base, durationMin: dur, marksEach: me, instant: !!f.instant.checked, questions: r.qs.map(q => ({ q: q.q, o: q.o })), maxMarks: r.qs.length * me };
        const ref = id ? doc(db, "tests", id) : doc(collection(db, "tests"));
        const b = writeBatch(db);
        if (id) b.update(ref, data); else b.set(ref, { ...data, published: false, resultsPublished: false, createdAt: serverTimestamp() });
        b.set(doc(db, "testKeys", ref.id), { answers: r.qs.map(q => q.a) });
        await b.commit();
      }
      closeSheet(); toast("ટેસ્ટ સાચવ્યો.");
    } catch (e) { fail(e); }
  });
};
ACT.openTest = async el => {
  const t = S.tests.find(x => x.id === el.dataset.id); if (!t) return;
  let sub = "";
  if (t.type === "online" && t.published && !t.resultsPublished) {
    try { const n = (await getDocs(query(collection(db, "results"), where("testId", "==", t.id)))).size; sub = `<div class="kv"><span>સબમિટ થયા</span><b>${n} / ${active().filter(s => s.batchId === t.batchId).length}</b></div>`; } catch {}
  }
  openSheet(t.title, `<div class="card">
    <div class="kv"><span>બેચ</span><b>${esc(batchName(t.batchId))}</b></div>
    <div class="kv"><span>વિષય / પ્રકરણ</span><b>${esc(t.subject || "—")} · ${esc(t.chapter || "—")}</b></div>
    <div class="kv"><span>તારીખ</span><b>${fmtD(t.date)}</b></div>
    <div class="kv"><span>પ્રકાર</span><b>${t.type === "online" ? `ઓનલાઇન · ${t.questions?.length || 0} પ્રશ્ન · ${t.durationMin} મિનિટ` : "ક્લાસમાં"}</b></div>
    <div class="kv"><span>કુલ ગુણ</span><b>${t.maxMarks}</b></div>${sub}
    ${t.stats ? `<div class="kv"><span>સરેરાશ / સૌથી વધુ</span><b>${t.stats.avg} / ${t.stats.top}</b></div>` : ""}</div>
    <div class="row-btns">
      ${t.type === "online" && !t.published ? `<button class="btn b-gold" data-act="pubTest" data-id="${t.id}">વિદ્યાર્થીઓ માટે ખોલો</button><button class="btn b-line" data-act="editTest" data-id="${t.id}">ફેરફાર</button>` : ""}
      ${t.type === "online" && t.published && !t.resultsPublished ? `<button class="btn b-ink" data-act="pubResults" data-id="${t.id}">ટેસ્ટ બંધ કરી પરિણામ જાહેર કરો</button>` : ""}
      ${t.type === "offline" ? `<button class="btn b-gold" data-act="marksEntry" data-id="${t.id}">${t.resultsPublished ? "માર્ક્સ સુધારો" : "માર્ક્સ નાખો"}</button>` : ""}
      ${t.resultsPublished ? `<button class="btn b-ink" data-act="viewResults" data-id="${t.id}">પરિણામ અને WhatsApp</button>` : ""}
      ${!t.resultsPublished ? `<button class="btn b-bad" data-act="delTest" data-id="${t.id}">કાઢી નાખો</button>` : ""}
    </div>`);
};
ACT.editTest = async el => {
  const t = S.tests.find(x => x.id === el.dataset.id);
  let key = [];
  if (t.type === "online") { try { key = (await getDoc(doc(db, "testKeys", t.id))).data()?.answers || []; } catch {} }
  openSheet("ફેરફાર — " + t.title, testForm(t, key));
};
ACT.pubTest = async el => {
  if (!confirm("ટેસ્ટ ખોલ્યા પછી પ્રશ્નો બદલી શકાશે નહીં. ખોલવો છે?")) return;
  try { await updateDoc(doc(db, "tests", el.dataset.id), { published: true, openedAt: serverTimestamp() }); closeSheet(); toast("ટેસ્ટ ખુલ્લો છે. વિદ્યાર્થીઓને એપમાં દેખાશે."); } catch (e) { fail(e); }
};
ACT.delTest = async el => {
  if (!confirm("આ ટેસ્ટ કાઢી નાખવો છે?")) return;
  try {
    const id = el.dataset.id, b = writeBatch(db);
    b.delete(doc(db, "tests", id)); b.delete(doc(db, "testKeys", id));
    (await getDocs(query(collection(db, "results"), where("testId", "==", id)))).forEach(d => b.delete(d.ref));
    await b.commit(); closeSheet(); toast("કાઢી નાખ્યો.");
  } catch (e) { fail(e); }
};
const score = (ans, key, me) => (ans || []).reduce((t, a, i) => t + (a === key[i] ? 1 : 0), 0) * me;

async function publishResults(t, offlineRows) {
  let rows;
  if (offlineRows) rows = offlineRows;
  else {
    const key = (await getDoc(doc(db, "testKeys", t.id))).data()?.answers || [];
    rows = (await getDocs(query(collection(db, "results"), where("testId", "==", t.id)))).docs.map(d => ({ studentId: d.data().studentId, marks: score(d.data().answers, key, t.marksEach || 1), absent: false }));
    const have = new Set(rows.map(r => r.studentId));
    active().filter(s => s.batchId === t.batchId && !have.has(s.id)).forEach(s => rows.push({ studentId: s.id, marks: null, absent: true }));
  }
  const present = rows.filter(r => !r.absent).sort((a, b) => b.marks - a.marks);
  present.forEach((r, i) => r.rank = i && r.marks === present[i - 1].marks ? present[i - 1].rank : i + 1);
  const meta = { testId: t.id, batchId: t.batchId, testTitle: t.title, subject: t.subject || "", chapter: t.chapter || "", date: t.date, maxMarks: t.maxMarks };
  for (let i = 0; i < rows.length; i += 400) {
    const b = writeBatch(db);
    rows.slice(i, i + 400).forEach(r => b.set(doc(db, "results", `${t.id}_${r.studentId}`), { ...meta, studentId: r.studentId, marks: r.absent ? null : r.marks, absent: !!r.absent, rank: r.rank ?? null, publishedAt: serverTimestamp() }, { merge: true }));
    await b.commit();
  }
  const avg = present.length ? Math.round(present.reduce((s, r) => s + r.marks, 0) / present.length * 10) / 10 : 0;
  await updateDoc(doc(db, "tests", t.id), { resultsPublished: true, published: true, stats: { count: present.length, avg, top: present[0]?.marks ?? 0 } });
}
ACT.pubResults = async el => {
  const t = S.tests.find(x => x.id === el.dataset.id);
  if (!confirm("ટેસ્ટ બંધ થશે અને બધાનાં ગુણ, રેન્ક વાલીઓને દેખાશે. આગળ વધવું છે?")) return;
  await busy(el, async () => { try { await publishResults(t); closeSheet(); toast("પરિણામ જાહેર થયું."); ACT.viewResults({ dataset: { id: t.id } }); } catch (e) { fail(e); } });
};
ACT.marksEntry = async el => {
  const t = S.tests.find(x => x.id === el.dataset.id);
  const list = active().filter(s => s.batchId === t.batchId).sort(by("name"));
  const prev = {};
  try { (await getDocs(query(collection(db, "results"), where("testId", "==", t.id)))).forEach(d => prev[d.data().studentId] = d.data()); } catch {}
  openSheet(`માર્ક્સ — ${t.title} (/${t.maxMarks})`, `<form data-form="marks" data-id="${t.id}">
    <p class="small muted" style="margin-top:0">ખાલી રાખશો તો ગેરહાજર ગણાશે.</p>
    <div class="list">${list.map(s => `<div class="item" style="cursor:default"><span class="mid"><b>${esc(s.name)}</b><small>${esc(s.id)}</small></span><input class="in" style="width:90px;text-align:center" name="${esc(s.id)}" inputmode="decimal" value="${prev[s.id] && !prev[s.id].absent && prev[s.id].marks != null ? prev[s.id].marks : ""}"></div>`).join("") || `<div class="empty">આ બેચમાં વિદ્યાર્થી નથી</div>`}</div>
    <button class="btn b-ink b-full" type="submit">સાચવો અને પરિણામ જાહેર કરો</button></form>`);
};
FORMS.marks = async (f, btn) => {
  const t = S.tests.find(x => x.id === f.dataset.id);
  const rows = [];
  for (const [sid, val] of new FormData(f).entries()) {
    const v = String(val).trim();
    if (v === "") { rows.push({ studentId: sid, marks: null, absent: true }); continue; }
    const m = Number(v);
    if (!Number.isFinite(m) || m < 0 || m > t.maxMarks) return toast(`${S.students.find(s => s.id === sid)?.name}: ગુણ 0 થી ${t.maxMarks} વચ્ચે જોઈએ.`, true);
    rows.push({ studentId: sid, marks: m, absent: false });
  }
  if (!rows.length) return;
  await busy(btn, async () => { try { await publishResults(t, rows); closeSheet(); toast("પરિણામ જાહેર થયું."); ACT.viewResults({ dataset: { id: t.id } }); } catch (e) { fail(e); } });
};
ACT.viewResults = async el => {
  const t = S.tests.find(x => x.id === el.dataset.id) || { id: el.dataset.id };
  try {
    const rows = (await getDocs(query(collection(db, "results"), where("testId", "==", t.id)))).docs.map(d => d.data())
      .sort((a, b) => (a.absent - b.absent) || ((a.rank ?? 1e9) - (b.rank ?? 1e9)));
    const nm = id => S.students.find(s => s.id === id);
    const top = rows.filter(r => !r.absent).slice(0, 3).map(r => `${r.rank}. ${nm(r.studentId)?.name || r.studentId} — ${r.marks}/${r.maxMarks}`).join("\n");
    const share = `${ACADEMY.name}\n${t.title} (${batchName(t.batchId)}) — ટોપર્સ\n${top}\nઅભિનંદન! 🎯`;
    openSheet("પરિણામ — " + (t.title || ""), `
      <a class="btn b-wa b-full" style="margin-bottom:12px" target="_blank" rel="noopener" href="${waLink("", share)}">${ic("wa")} ટોપર્સ ગ્રુપમાં શેર કરો</a>
      <div class="list">${rows.map(r => {
        const s = nm(r.studentId); if (!s) return "";
        const msg = r.absent ? `નમસ્તે ${s.parentName || ""},\n${ACADEMY.name}: ${s.name} ‘${r.testTitle}’ ટેસ્ટ (${fmtD(r.date)})માં ગેરહાજર હતા.`
          : `નમસ્તે ${s.parentName || ""},\n${ACADEMY.name}: ${s.name} ને ‘${r.testTitle}’ (${r.subject || ""}) ટેસ્ટમાં ${r.marks}/${r.maxMarks} ગુણ મળ્યા. બેચમાં રેન્ક: ${r.rank}.`;
        return `<div class="item" style="cursor:default"><span class="av">${r.absent ? "–" : r.rank}</span><span class="mid"><b>${esc(s.name)}</b><small>${r.absent ? "ગેરહાજર" : `${r.marks}/${r.maxMarks} · ${pct(r.marks, r.maxMarks)}%`}</small></span><a class="btn b-wa b-sm" target="_blank" rel="noopener" href="${waLink(s.parentPhone, msg)}">${ic("wa")}</a></div>`;
      }).join("")}</div>`);
  } catch (e) { fail(e); }
};

// ---------- Admin: More ----------
function adminMore() {
  const sub = S.sub;
  const back = `<button class="btn b-line b-sm" data-act="sub" data-s="">${ic("back")} પાછા</button>`;
  if (sub === "batches") return moreBatches(back);
  if (sub === "materials") return moreMaterials(back);
  if (sub === "notices") return moreNotices(back);
  if (sub === "leads") return moreLeads(back);
  if (sub === "toppers") return moreToppers(back);
  if (sub === "export") return moreExport(back);
  if (sub === "timetable") return moreTimetable(back);
  const newL = S.leads.filter(l => (l.status || "new") === "new").length;
  const it = (s, t, d, i, badge = "") => `<button class="item" data-act="sub" data-s="${s}"><span class="av">${ic(i)}</span><span class="mid"><b>${t}</b><small>${d}</small></span>${badge}</button>`;
  return `<div class="h"><h2>વધુ</h2></div><div class="list">
    ${it("leads", "પ્રવેશ પૂછપરછ", "વેબસાઇટ ફોર્મ અને ફોલો-અપ", "users", newL ? `<span class="tag t-warn">${newL} નવી</span>` : "")}
    ${it("batches", "બેચ", `${S.batches.length} બેચ · સમય અને ફી`, "check")}
    ${it("timetable", "ટાઇમટેબલ", "બેચ પ્રમાણે અઠવાડિયાના લેક્ચર", "test")}
    ${it("materials", "નોટ્સ અને વિડિયો", `${S.materials.length} સામગ્રી`, "book")}
    ${it("notices", "સૂચના અને હોમવર્ક", `${S.notices.length} સૂચના`, "bell")}
    ${it("toppers", "વેબસાઇટ પર ટોપર્સ", `${S.toppers.length} ટોપર્સ`, "chart")}
    ${it("export", "રિપોર્ટ ડાઉનલોડ (Excel)", "વિદ્યાર્થી, ફી, ચુકવણી, પૂછપરછ", "dl")}
  </div>
  <p class="small muted" style="text-align:center">${esc(S.user?.email || "")}</p>`;
}
function moreBatches(back) {
  return `<div class="h">${back}<button class="btn b-ink b-sm" data-act="editBatch">${ic("plus")} બેચ</button></div>
  ${S.batches.length ? `<div class="list">${S.batches.slice().sort(by("name")).map(b => `<button class="item" data-act="editBatch" data-id="${b.id}"><span class="av">${active().filter(s => s.batchId === b.id).length}</span><span class="mid"><b>${esc(b.name)}</b><small>${esc(b.timing || "")}${b.fee ? " · " + money(b.fee) : ""}</small></span></button>`).join("")}</div>`
    : `<div class="card">${empty("હજુ કોઈ બેચ નથી", "<p class='small'>ઉદા. ‘ધો. 10 સવાર’, ‘ધો. 12 સાયન્સ’</p>")}</div>`}`;
}
ACT.editBatch = el => {
  const b = S.batches.find(x => x.id === el.dataset.id) || {};
  openSheet(b.id ? "બેચ — " + b.name : "નવી બેચ", `<form data-form="batch" data-id="${esc(b.id || "")}">
    <div class="f"><label class="l">બેચનું નામ *</label><input class="in" name="name" required maxlength="50" value="${esc(b.name)}" placeholder="ઉદા. ધો. 10 — સાંજ"></div>
    <div class="g2"><div class="f"><label class="l">ધોરણ</label><select class="in" name="std">${opts(STDS, b.std)}</select></div>
    <div class="f"><label class="l">પ્રવાહ</label><select class="in" name="stream">${STREAMS.map(x => `<option value="${x}" ${x === (b.stream || "") ? "selected" : ""}>${x || "—"}</option>`).join("")}</select></div></div>
    <div class="f"><label class="l">સમય</label><input class="in" name="timing" maxlength="80" value="${esc(b.timing)}" placeholder="ઉદા. સોમ–શનિ, સાંજે 5 થી 7"></div>
    <div class="f"><label class="l">વાર્ષિક ફી ₹ (નવા વિદ્યાર્થીમાં આપમેળે ભરાશે)</label><input class="in" name="fee" inputmode="numeric" value="${esc(b.fee ?? "")}"></div>
    <button class="btn b-ink b-full" type="submit">સાચવો</button>
    ${b.id ? `<button class="btn b-bad b-full" type="button" style="margin-top:8px" data-act="delBatch" data-id="${b.id}">બેચ કાઢી નાખો</button>` : ""}</form>`);
};
FORMS.batch = async (f, btn) => {
  const v = formVals(f), id = f.dataset.id;
  if (!v.name) return toast("નામ લખો.", true);
  const data = { name: v.name, std: v.std, stream: v.stream, timing: v.timing, fee: num(v.fee) };
  await busy(btn, async () => {
    try { id ? await updateDoc(doc(db, "batches", id), data) : await addDoc(collection(db, "batches"), data); closeSheet(); toast("બેચ સાચવી."); } catch (e) { fail(e); }
  });
};
ACT.delBatch = async el => {
  if (S.students.some(s => s.batchId === el.dataset.id)) return toast("આ બેચમાં વિદ્યાર્થીઓ છે. પહેલાં તેમની બેચ બદલો.", true);
  if (!confirm("બેચ કાઢી નાખવી છે?")) return;
  try { await deleteDoc(doc(db, "batches", el.dataset.id)); closeSheet(); toast("કાઢી નાખી."); } catch (e) { fail(e); }
};

function moreMaterials(back) {
  const list = S.materials.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return `<div class="h">${back}<button class="btn b-ink b-sm" data-act="newMat">${ic("plus")} ઉમેરો</button></div>
  <p class="small muted">PDF ને Google Drive માં મૂકી ‘Anyone with the link’ શેર કરો, અને તે લિંક અહીં નાખો. વિડિયો માટે YouTube (Unlisted) લિંક.</p>
  ${list.length ? `<div class="list">${list.map(m => `<div class="item" style="cursor:default"><span class="av">${esc(MAT_T[m.type] || "").charAt(0)}</span><span class="mid"><b>${esc(m.title)}</b><small>${esc(batchName(m.batchId))} · ${esc(m.subject || "")} ${m.chapter ? "· " + esc(m.chapter) : ""}</small></span><button class="btn b-bad b-sm" data-act="delDoc" data-c="materials" data-id="${m.id}">કાઢો</button></div>`).join("")}</div>` : `<div class="card">${empty("હજુ કોઈ નોટ્સ નથી")}</div>`}`;
}
ACT.newMat = () => openSheet("નોટ્સ / વિડિયો ઉમેરો", `<form data-form="mat">
  <div class="f"><label class="l">શીર્ષક *</label><input class="in" name="title" required maxlength="100" placeholder="ઉદા. પ્રકરણ 3 — પ્રકાશ (નોટ્સ)"></div>
  <div class="g2"><div class="f"><label class="l">બેચ</label><select class="in" name="batchId">${batchOpts("all", true)}</select></div>
  <div class="f"><label class="l">પ્રકાર</label><select class="in" name="type">${Object.entries(MAT_T).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div></div>
  <div class="g2"><div class="f"><label class="l">વિષય</label><input class="in" name="subject" maxlength="40"></div><div class="f"><label class="l">પ્રકરણ</label><input class="in" name="chapter" maxlength="60"></div></div>
  <div class="f"><label class="l">લિંક *</label><input class="in" name="url" type="url" required placeholder="https://drive.google.com/..."></div>
  <button class="btn b-ink b-full" type="submit">ઉમેરો</button></form>`);
FORMS.mat = async (f, btn) => {
  const v = formVals(f);
  if (!v.title) return toast("શીર્ષક લખો.", true);
  if (!/^https?:\/\//i.test(v.url)) return toast("લિંક https:// થી શરૂ થવી જોઈએ.", true);
  await busy(btn, async () => { try { await addDoc(collection(db, "materials"), { ...v, date: ymd(), createdAt: serverTimestamp() }); closeSheet(); toast("ઉમેર્યું."); } catch (e) { fail(e); } });
};
ACT.delDoc = async el => {
  if (!confirm("કાઢી નાખવું છે?")) return;
  try { await deleteDoc(doc(db, el.dataset.c, el.dataset.id)); toast("કાઢી નાખ્યું."); closeSheet(); } catch (e) { fail(e); }
};

function moreNotices(back) {
  const list = S.notices.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return `<div class="h">${back}<button class="btn b-ink b-sm" data-act="newNotice">${ic("plus")} ઉમેરો</button></div>
  ${list.length ? `<div class="list">${list.map(n => `<div class="item" style="cursor:default;align-items:flex-start"><span class="mid"><b>${esc(n.title)}</b><small>${esc(NOTICE_T[n.type] || "")} · ${esc(batchName(n.batchId))} · ${fmtD(n.date)}</small></span>
  <span class="row-btns"><a class="btn b-wa b-sm" target="_blank" rel="noopener" href="${waLink("", `${ACADEMY.name} — ${NOTICE_T[n.type] || "સૂચના"}\n${n.title}\n${n.body || ""}${n.due ? `\nછેલ્લી તારીખ: ${fmtD(n.due)}` : ""}`)}">${ic("wa")}</a><button class="btn b-bad b-sm" data-act="delDoc" data-c="notices" data-id="${n.id}">કાઢો</button></span></div>`).join("")}</div>` : `<div class="card">${empty("હજુ કોઈ સૂચના નથી")}</div>`}`;
}
ACT.newNotice = () => openSheet("સૂચના / હોમવર્ક", `<form data-form="notice">
  <div class="g2"><div class="f"><label class="l">પ્રકાર</label><select class="in" name="type">${Object.entries(NOTICE_T).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div>
  <div class="f"><label class="l">કોના માટે</label><select class="in" name="batchId">${batchOpts("all", true)}</select></div></div>
  <div class="f"><label class="l">શીર્ષક *</label><input class="in" name="title" required maxlength="100"></div>
  <div class="f"><label class="l">વિગત</label><textarea class="in" name="body" rows="4" maxlength="1500"></textarea></div>
  <div class="f"><label class="l">છેલ્લી તારીખ (હોમવર્ક માટે)</label><input class="in" type="date" name="due"></div>
  <button class="btn b-ink b-full" type="submit">મોકલો</button></form>`);
FORMS.notice = async (f, btn) => {
  const v = formVals(f);
  if (!v.title) return toast("શીર્ષક લખો.", true);
  await busy(btn, async () => { try { await addDoc(collection(db, "notices"), { ...v, date: ymd(), createdAt: serverTimestamp() }); closeSheet(); toast("સૂચના એપમાં મુકાઈ ગઈ."); } catch (e) { fail(e); } });
};

function moreLeads(back) {
  const list = S.leads.filter(l => (l.status || "new") === S.fl).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return `<div class="h">${back}<button class="btn b-ink b-sm" data-act="newLead">${ic("plus")} ઉમેરો</button></div>
  ${chips("fl", Object.entries(LEAD_ST).map(([k, l]) => [k, `${l} (${S.leads.filter(x => (x.status || "new") === k).length})`]))}
  ${list.length ? `<div class="list">${list.map(l => `<button class="item" data-act="openLead" data-id="${l.id}"><span class="av">${initial(l.name)}</span><span class="mid"><b>${esc(l.name)}</b><small>${esc(l.std)} · ${esc(l.phone)}${l.createdAt ? " · " + fmtD(ymd(l.createdAt.toDate())) : ""}</small></span></button>`).join("")}</div>` : `<div class="card">${empty("આ યાદી ખાલી છે")}</div>`}`;
}
ACT.newLead = () => openSheet("પૂછપરછ ઉમેરો", `<form data-form="lead">
  <div class="f"><label class="l">વિદ્યાર્થીનું નામ *</label><input class="in" name="name" required maxlength="80"></div>
  <div class="g2"><div class="f"><label class="l">મોબાઇલ *</label><input class="in" name="phone" inputmode="numeric" maxlength="10" required></div><div class="f"><label class="l">ધોરણ</label><input class="in" name="std" maxlength="40"></div></div>
  <div class="f"><label class="l">નોંધ</label><input class="in" name="note" maxlength="300"></div>
  <button class="btn b-ink b-full" type="submit">ઉમેરો</button></form>`);
FORMS.lead = async (f, btn) => {
  const v = formVals(f);
  if (!v.name || !/^[6-9]\d{9}$/.test(v.phone)) return toast("નામ અને સાચો મોબાઇલ લખો.", true);
  await busy(btn, async () => { try { await addDoc(collection(db, "leads"), { name: v.name, parent: "", phone: v.phone, std: v.std || "", school: "", note: v.note || "", status: "new", source: "admin", createdAt: serverTimestamp() }); closeSheet(); toast("ઉમેર્યું."); } catch (e) { fail(e); } });
};
ACT.openLead = el => {
  const l = S.leads.find(x => x.id === el.dataset.id);
  openSheet(l.name, `<div class="card">
    <div class="kv"><span>ધોરણ</span><b>${esc(l.std)}</b></div><div class="kv"><span>મોબાઇલ</span><b>${esc(l.phone)}</b></div>
    ${l.parent ? `<div class="kv"><span>વાલી</span><b>${esc(l.parent)}</b></div>` : ""}${l.school ? `<div class="kv"><span>શાળા</span><b>${esc(l.school)}</b></div>` : ""}
    ${l.note ? `<div class="kv"><span>નોંધ</span><b>${esc(l.note)}</b></div>` : ""}<div class="kv"><span>ક્યાંથી</span><b>${l.source === "website" ? "વેબસાઇટ" : "એડમિન"}</b></div></div>
    <div class="f"><label class="l">સ્થિતિ</label><select class="in" data-change="leadSt" data-id="${l.id}">${Object.entries(LEAD_ST).map(([k, t]) => `<option value="${k}" ${(l.status || "new") === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    <div class="row-btns"><a class="btn b-line" href="tel:+91${esc(l.phone)}">${ic("phone")} ફોન</a>
    <a class="btn b-wa" target="_blank" rel="noopener" href="${waLink(l.phone, `નમસ્તે, ${ACADEMY.name} માંથી વાત કરીએ છીએ. ${l.name} ના ${l.std} પ્રવેશ માટે તમારી નોંધણી મળી છે. ડેમો ક્લાસ માટે ક્યારે અનુકૂળ રહેશે?`)}">${ic("wa")} WhatsApp</a>
    ${l.status !== "admitted" ? `<button class="btn b-gold" data-act="admitLead" data-id="${l.id}">પ્રવેશ આપો</button>` : ""}
    <button class="btn b-bad" data-act="delDoc" data-c="leads" data-id="${l.id}">કાઢો</button></div>`);
};
CHG.leadSt = async el => { try { await updateDoc(doc(db, "leads", el.dataset.id), { status: el.value }); toast("સ્થિતિ બદલી."); } catch (e) { fail(e); } };
ACT.admitLead = el => {
  const l = S.leads.find(x => x.id === el.dataset.id);
  if (!S.batches.length) return toast("પહેલાં બેચ બનાવો.", true);
  openSheet("પ્રવેશ — " + l.name, studentForm({ name: l.name, parentName: l.parent, parentPhone: l.phone, school: l.school }, l.id));
};

function moreToppers(back) {
  const list = S.toppers.slice().sort((a, b) => num(a.order) - num(b.order));
  return `<div class="h">${back}<button class="btn b-ink b-sm" data-act="newTopper">${ic("plus")} ઉમેરો</button></div>
  <p class="small muted">અહીં ઉમેરેલા ટોપર્સ વેબસાઇટના ‘અમારાં પરિણામ’ વિભાગમાં આપમેળે દેખાશે.</p>
  ${list.length ? `<div class="list">${list.map(t => `<div class="item" style="cursor:default"><span class="av">${esc(t.order)}</span><span class="mid"><b>${esc(t.name)}</b><small>${esc(t.std)} · ${esc(t.year)} · ${esc(t.result)}</small></span><button class="btn b-bad b-sm" data-act="delDoc" data-c="toppers" data-id="${t.id}">કાઢો</button></div>`).join("")}</div>` : `<div class="card">${empty("હજુ કોઈ ટોપર્સ નથી")}</div>`}`;
}
ACT.newTopper = () => openSheet("ટોપર ઉમેરો", `<form data-form="topper">
  <div class="f"><label class="l">નામ *</label><input class="in" name="name" required maxlength="60"></div>
  <div class="g3"><div class="f"><label class="l">ધોરણ</label><input class="in" name="std" maxlength="30" placeholder="ધો. 10"></div><div class="f"><label class="l">વર્ષ</label><input class="in" name="year" maxlength="9" value="${new Date().getFullYear()}"></div><div class="f"><label class="l">પરિણામ *</label><input class="in" name="result" required maxlength="20" placeholder="98.5 PR"></div></div>
  <div class="g2"><div class="f"><label class="l">ફોટો લિંક (વૈકલ્પિક)</label><input class="in" name="photoUrl" type="url" placeholder="https://..."></div><div class="f"><label class="l">ક્રમ</label><input class="in" name="order" inputmode="numeric" value="${S.toppers.length + 1}"></div></div>
  <button class="btn b-ink b-full" type="submit">ઉમેરો</button></form>`);
FORMS.topper = async (f, btn) => {
  const v = formVals(f);
  if (!v.name || !v.result) return toast("નામ અને પરિણામ લખો.", true);
  if (v.photoUrl && !/^https:\/\//i.test(v.photoUrl)) return toast("ફોટો લિંક https:// થી શરૂ થવી જોઈએ.", true);
  await busy(btn, async () => { try { await addDoc(collection(db, "toppers"), { name: v.name, std: v.std, year: v.year, result: v.result, photoUrl: v.photoUrl || "", order: num(v.order) }); closeSheet(); toast("વેબસાઇટ પર ઉમેરાયું."); } catch (e) { fail(e); } });
};

function moreExport(back) {
  const b = (k, t) => `<button class="item" data-act="exportCsv" data-k="${k}"><span class="av">${ic("dl")}</span><span class="mid"><b>${t}</b><small>Excel માં ખૂલે તેવી CSV ફાઇલ</small></span></button>`;
  return `<div class="h">${back}</div><div class="list">${b("students", "બધા વિદ્યાર્થી")}${b("dues", "ફી — બાકી યાદી")}${b("payments", "બધી ચુકવણી")}${b("leads", "પ્રવેશ પૂછપરછ")}</div>
  <p class="small muted">બેકઅપ: દર મહિને આ ચારેય ફાઇલ ડાઉનલોડ કરીને Google Drive માં રાખો.</p>`;
}
ACT.exportCsv = el => {
  const k = el.dataset.k, sN = id => S.students.find(s => s.id === id)?.name || "";
  let rows;
  if (k === "students") rows = [["ID", "નામ", "બેચ", "વાલી", "વાલી મોબાઇલ", "મોબાઇલ", "શાળા", "કુલ ફી", "છૂટ", "ભરેલી", "બાકી", "પ્રવેશ", "સ્થિતિ"],
    ...S.students.slice().sort(by("name")).map(s => [s.id, s.name, batchName(s.batchId), s.parentName, s.parentPhone, s.phone, s.school, s.feeTotal, s.discount, S.payIdx[s.id] || 0, dueOf(s), s.joinDate, s.active === false ? "નિષ્ક્રિય" : "સક્રિય"])];
  if (k === "dues") rows = [["ID", "નામ", "બેચ", "વાલી મોબાઇલ", "બાકી", "તારીખ"], ...active().filter(s => dueOf(s) > 0).sort((a, b) => dueOf(b) - dueOf(a)).map(s => [s.id, s.name, batchName(s.batchId), s.parentPhone, dueOf(s), s.dueDate])];
  if (k === "payments") rows = [["રસીદ", "તારીખ", "ID", "નામ", "રકમ", "રીત", "નોંધ"], ...S.payments.slice().sort(by("date")).map(p => [p.receiptNo, p.date, p.studentId, sN(p.studentId), p.amount, p.mode, p.note])];
  if (k === "leads") rows = [["નામ", "વાલી", "મોબાઇલ", "ધોરણ", "શાળા", "નોંધ", "સ્થિતિ", "તારીખ"], ...S.leads.map(l => [l.name, l.parent, l.phone, l.std, l.school, l.note, LEAD_ST[l.status || "new"], l.createdAt ? ymd(l.createdAt.toDate()) : ""])];
  const csv = "﻿" + rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `gandiv-${k}-${ymd()}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

// =============================================================
//  STUDENT / PARENT
// =============================================================
async function loadKid(i) {
  S.kidIdx = i;
  const sid = S.profile.studentIds[i];
  const sd = await getDoc(doc(db, "students", sid));
  if (!sd.exists()) throw Object.assign(new Error("no student"), { uiMsg: "વિદ્યાર્થીની માહિતી મળી નહીં." });
  const s = { id: sid, ...sd.data() };
  const bid = s.batchId;
  const [bd, ts, rs, ps, as, ns, ms, tt, hw, hs, pn] = await Promise.all([
    getDoc(doc(db, "batches", bid)),
    getDocs(query(collection(db, "tests"), where("batchId", "==", bid), where("published", "==", true))),
    getDocs(query(collection(db, "results"), where("studentId", "==", sid))),
    S.role === "parent" ? getDocs(query(collection(db, "payments"), where("studentId", "==", sid))) : null,
    getDocs(query(collection(db, "attendance"), where("batchId", "==", bid))),
    getDocs(collection(db, "notices")),
    getDocs(collection(db, "materials")),
    getDoc(doc(db, "timetable", bid)).catch(() => null),
    getDocs(query(collection(db, "homework"), where("batchId", "==", bid))).catch(() => null),
    getDocs(query(collection(db, "homeworkStatus"), where("studentId", "==", sid))).catch(() => null),
    getDocs(query(collection(db, "punishments"), where("studentId", "==", sid))).catch(() => null)
  ]);
  const D = x => ({ id: x.id, ...x.data() });
  const payments = ps ? ps.docs.map(D).sort(by("date", -1)) : [];
  S.kids[i] = { name: s.name };
  S.kid = {
    s, batch: bd.exists() ? D(bd) : null,
    tests: ts.docs.map(D), results: rs.docs.map(D),
    payments, paid: payments.reduce((t, p) => t + num(p.amount), 0),
    att: as.docs.map(x => x.data()).sort(by("date", -1)),
    notices: ns.docs.map(D).filter(n => n.batchId === "all" || n.batchId === bid).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    materials: ms.docs.map(D).filter(m => m.batchId === "all" || m.batchId === bid).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    tt: tt && tt.exists() ? tt.data() : null,
    homework: hw ? hw.docs.map(D) : [],
    hwStatus: hs ? hs.docs.map(x => x.data()) : [],
    punishments: pn ? pn.docs.map(D) : []
  };
  render();
}
ACT.pickKid = async el => {
  closeSheet();
  $("#view").innerHTML = `<div class="empty">લોડ થઈ રહ્યું છે…</div>`;
  try { await loadKid(+el.dataset.i); } catch (e) { fail(e); }
};
const refreshKid = async () => { try { await loadKid(S.kidIdx); } catch (e) { fail(e); } };

function attStats(K, month) {
  const sid = K.s.id; let p = 0, a = 0, l = 0; const absDays = [], lateDays = [];
  K.att.forEach(d => {
    if (month && !d.date.startsWith(month)) return;
    if ((d.absent || []).includes(sid)) { a++; absDays.push(d.date); }
    else if ((d.late || []).includes(sid)) { l++; lateDays.push(d.date); }
    else if ((d.present || []).includes(sid)) p++;
  });
  return { p, a, l, total: p + a + l, absDays, lateDays };
}
const doneResults = K => K.results.filter(r => r.marks != null && !r.absent && r.maxMarks).sort(by("date"));
const mySub = (K, tid) => K.results.find(r => r.testId === tid);
const pendingTests = K => K.tests.filter(t => t.type === "online" && !t.resultsPublished && !mySub(K, t.id)).sort(by("date"));

function lineChart(rs) {
  if (rs.length < 2) return "";
  const W = 320, H = 170, P = 26, pts = rs.slice(-12).map(r => pct(r.marks, r.maxMarks));
  const x = i => P + (i * (W - P - 10)) / (pts.length - 1), y = v => H - 22 - (v / 100) * (H - 40);
  const poly = pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="ટેસ્ટ ટકાવારીનો ગ્રાફ">
    ${[0, 50, 100].map(v => `<line x1="${P}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" stroke="#E4E1D8" stroke-dasharray="${v === 50 ? "4 4" : ""}"/><text x="2" y="${y(v) + 4}" font-size="10" fill="#5B6478">${v}%</text>`).join("")}
    <polyline points="${poly}" fill="none" stroke="#14225A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i === pts.length - 1 ? 5 : 3.5}" fill="${i === pts.length - 1 ? "#F2A900" : "#14225A"}"/>`).join("")}
  </svg>`;
}
function analysis(rs) {
  const g = (k) => { const o = {}; rs.forEach(r => { const key = r[k]; if (!key) return; (o[key] ||= { m: 0, t: 0, n: 0 }); o[key].m += r.marks; o[key].t += r.maxMarks; o[key].n++; }); return Object.entries(o).map(([name, v]) => ({ name, p: pct(v.m, v.t), n: v.n })); };
  const subj = g("subject").sort((a, b) => b.p - a.p);
  const weak = g("chapter").filter(c => c.p < 50).sort((a, b) => a.p - b.p).slice(0, 5);
  return { subj, weak };
}
function resultsList(K) {
  const rs = K.results.filter(r => r.marks != null || r.absent).sort(by("date", -1));
  if (!rs.length) return `<div class="card">${empty("હજુ કોઈ પરિણામ નથી")}</div>`;
  return `<div class="list">${rs.map(r => `<div class="item" style="cursor:default"><span class="mid"><b>${esc(r.testTitle)}</b><small>${esc(r.subject || "")} · ${fmtD(r.date)}</small></span><span class="end">${r.absent ? `<span class="tag t-bad">ગેરહાજર</span>` : `${r.marks}/${r.maxMarks}<br><small class="muted">${pct(r.marks, r.maxMarks)}%${r.rank ? ` · રેન્ક ${r.rank}` : ""}</small>`}</span></div>`).join("")}</div>`;
}
function progressBlock(K) {
  const rs = doneResults(K), A = analysis(rs);
  const avg = rs.length ? Math.round(rs.reduce((t, r) => t + pct(r.marks, r.maxMarks), 0) / rs.length) : 0;
  const last = rs[rs.length - 1], prev = rs[rs.length - 2];
  const diff = last && prev ? pct(last.marks, last.maxMarks) - pct(prev.marks, prev.maxMarks) : null;
  return `
  <div class="stats" style="grid-template-columns:1fr 1fr">
    <div class="stat gold"><div class="n">${rs.length ? avg + "%" : "–"}</div><div class="l">સરેરાશ (${rs.length} ટેસ્ટ)</div></div>
    <div class="stat"><div class="n ${diff > 0 ? "ok" : diff < 0 ? "bad" : ""}">${diff == null ? "–" : (diff > 0 ? "+" : "") + diff + "%"}</div><div class="l">છેલ્લા ટેસ્ટમાં ફેરફાર</div></div>
  </div>
  ${rs.length >= 2 ? `<div class="card"><b>ટેસ્ટ પ્રમાણે ટકા</b>${lineChart(rs)}</div>` : ""}
  ${A.subj.length ? `<div class="card"><b>વિષય પ્રમાણે</b>${A.subj.map(s => `<div style="margin-top:10px"><div class="kv" style="border:0;padding:0"><span>${esc(s.name)}</span><b>${s.p}%</b></div><div class="bar"><i style="width:${s.p}%;background:${s.p < 50 ? "var(--bad)" : s.p < 75 ? "var(--gold)" : "var(--ok)"}"></i></div></div>`).join("")}</div>` : ""}
  ${A.weak.length ? `<div class="card" style="border-color:#F3C9C5"><b class="bad">વધુ પ્રેક્ટિસ જોઈએ</b><p class="small muted" style="margin:4px 0 6px">આ પ્રકરણોમાં 50% થી ઓછા ગુણ આવ્યા છે.</p>${A.weak.map(c => `<div class="kv"><span>${esc(c.name)}</span><b class="bad">${c.p}%</b></div>`).join("")}</div>` : ""}`;
}
function noticeList(list) {
  if (!list.length) return `<div class="card">${empty("હજુ કોઈ સૂચના નથી")}</div>`;
  return list.map(n => `<div class="card"><div class="row-btns" style="justify-content:space-between;align-items:center"><span class="tag ${n.type === "homework" ? "t-warn" : n.type === "holiday" ? "t-ok" : "t-ink"}">${esc(NOTICE_T[n.type] || "સૂચના")}</span><small class="muted">${fmtD(n.date)}</small></div>
    <h3 style="font-size:18px;margin:8px 0 4px;color:var(--ink)">${esc(n.title)}</h3>${n.body ? `<div style="white-space:pre-wrap">${esc(n.body)}</div>` : ""}${n.due ? `<p class="small" style="margin:8px 0 0"><b>છેલ્લી તારીખ:</b> ${fmtD(n.due)}</p>` : ""}</div>`).join("");
}
const kidHead = K => `<div class="card" style="background:var(--ink);color:#fff;border-color:var(--ink)"><small style="color:#AFC0EE">${esc(K.s.id)} · ${esc(K.batch?.name || "")}</small><h2 style="color:#fff;font-size:24px">${esc(K.s.name)}</h2>${K.batch?.timing ? `<small style="color:var(--gold)">${esc(K.batch.timing)}</small>` : ""}</div>`;
const loading = () => `<div class="empty">લોડ થઈ રહ્યું છે…</div>`;
const refreshBtn = `<button class="btn b-line b-sm" data-act="refresh">તાજું કરો</button>`;
ACT.refresh = el => busy(el, refreshKid);

// ---------- Student ----------
function stHome() {
  const K = S.kid; if (!K) return loading();
  const pend = pendingTests(K), rs = doneResults(K), last = rs[rs.length - 1];
  const mk = ymd().slice(0, 7), at = attStats(K, mk);
  return `${kidHead(K)}
  ${pend.map(t => `<div class="card" style="border:2px solid var(--gold)"><b>${esc(t.title)}</b><p class="small muted" style="margin:2px 0 10px">${t.questions?.length || 0} પ્રશ્ન · ${t.durationMin} મિનિટ · ${esc(t.subject || "")}</p><button class="btn b-gold b-full" data-act="startExam" data-id="${t.id}">ટેસ્ટ શરૂ કરો</button></div>`).join("")}
  <div class="stats" style="grid-template-columns:1fr 1fr">
    <div class="stat"><div class="n">${at.total ? pct(at.p + at.l, at.total) + "%" : "–"}</div><div class="l">આ મહિનાની હાજરી</div></div>
    <div class="stat"><div class="n">${last ? `${last.marks}/${last.maxMarks}` : "–"}</div><div class="l">${last ? esc(last.testTitle) : "છેલ્લો ટેસ્ટ"}</div></div>
  </div>
  ${lecturesBlock(K)}
  ${hwHomeBlock(K)}
  <div class="h"><h2>સૂચના</h2>${refreshBtn}</div>${noticeList(K.notices.slice(0, 8))}`;
}
function stTests() {
  const K = S.kid; if (!K) return loading();
  const pend = pendingTests(K);
  const waiting = K.tests.filter(t => t.type === "online" && !t.resultsPublished && mySub(K, t.id));
  return `<div class="h"><h2>ટેસ્ટ</h2>${refreshBtn}</div>
  ${pend.length ? `<div class="list">${pend.map(t => `<div class="item" style="cursor:default"><span class="mid"><b>${esc(t.title)}</b><small>${t.questions?.length || 0} પ્રશ્ન · ${t.durationMin} મિનિટ</small></span><button class="btn b-gold b-sm" data-act="startExam" data-id="${t.id}">શરૂ કરો</button></div>`).join("")}</div>` : `<div class="card small muted">અત્યારે આપવાનો કોઈ ટેસ્ટ નથી.</div>`}
  ${waiting.length ? `<div class="h"><h2>પરિણામની રાહ</h2></div><div class="list">${waiting.map(t => `<div class="item" style="cursor:default"><span class="mid"><b>${esc(t.title)}</b><small>સબમિટ થઈ ગયો</small></span>${t.instant ? `<button class="btn b-line b-sm" data-act="review" data-id="${t.id}">જવાબ જુઓ</button>` : `<span class="tag t-warn">રાહ</span>`}</div>`).join("")}</div>` : ""}
  <div class="h"><h2>પરિણામ</h2></div>${resultsList(K)}`;
}
function stNotes() {
  const K = S.kid; if (!K) return loading();
  const subs = [...new Set(K.materials.map(m => m.subject).filter(Boolean))];
  const list = K.materials.filter(m => S.fm === "all" || m.subject === S.fm);
  return `<div class="h"><h2>નોટ્સ અને વિડિયો</h2>${refreshBtn}</div>
  ${subs.length > 1 ? chips("fm", [["all", "બધા"], ...subs.map(s => [s, s])]) : ""}
  ${list.length ? `<div class="list">${list.map(m => `<a class="item" href="${esc(m.url)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><span class="av">${ic(m.type === "video" ? "chart" : "book")}</span><span class="mid"><b>${esc(m.title)}</b><small>${esc(m.subject || "")}${m.chapter ? " · " + esc(m.chapter) : ""} · ${esc(MAT_T[m.type] || "")}</small></span></a>`).join("")}</div>` : `<div class="card">${empty("હજુ કોઈ નોટ્સ નથી")}</div>`}`;
}
function stProgress() { const K = S.kid; if (!K) return loading(); return `<div class="h"><h2>મારી પ્રગતિ</h2></div>${progressBlock(K)}<div class="h"><h2>બધાં પરિણામ</h2></div>${resultsList(K)}`; }
function stNotices() { const K = S.kid; if (!K) return loading(); return `<div class="h"><h2>સૂચના</h2>${refreshBtn}</div>${noticeList(K.notices)}`; }

// ---------- Exam ----------
const examKey = (tid) => `gandiv_exam_${S.kid.s.id}_${tid}`;
ACT.startExam = el => {
  const K = S.kid, t = K.tests.find(x => x.id === el.dataset.id);
  if (!t || mySub(K, t.id)) return toast("આ ટેસ્ટ આપી દીધો છે.", true);
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(examKey(t.id)) || "null"); } catch {}
  if (!saved && !confirm(`${t.title}\n${t.questions.length} પ્રશ્ન · ${t.durationMin} મિનિટ\n\nશરૂ કર્યા પછી સમય ચાલુ થઈ જશે. શરૂ કરવું છે?`)) return;
  S.exam = { t, answers: saved?.answers || Array(t.questions.length).fill(-1), endAt: saved?.endAt || Date.now() + t.durationMin * 60000 };
  saveExam(); render(); scrollTo(0, 0); tick();
};
function saveExam() { try { localStorage.setItem(examKey(S.exam.t.id), JSON.stringify({ answers: S.exam.answers, endAt: S.exam.endAt })); } catch {} }
function tick() {
  clearInterval(tick._i);
  tick._i = setInterval(() => {
    if (!S.exam) return clearInterval(tick._i);
    const left = Math.max(0, S.exam.endAt - Date.now()), el = $("#timer");
    if (el) { el.textContent = `${Math.floor(left / 60000)}:${z2(Math.floor(left / 1000) % 60)}`; el.classList.toggle("low", left < 60000); }
    if (left <= 0) { clearInterval(tick._i); submitExam(true); }
  }, 500);
}
function viewExam() {
  const E = S.exam, t = E.t, done = E.answers.filter(a => a >= 0).length;
  return `<div class="exam-top" style="margin:-16px -14px 14px;border-radius:0"><div><b>${esc(t.title)}</b><br><small style="color:#AFC0EE">${done}/${t.questions.length} જવાબ આપ્યા</small></div><div class="timer" id="timer">–</div></div>
  ${t.questions.map((q, i) => `<div class="q" id="q${i}"><div class="qn">${i + 1}. ${esc(q.q)}</div>${q.o.map((o, j) => `<button class="opt ${E.answers[i] === j ? "sel" : ""}" data-act="pick" data-q="${i}" data-o="${j}"><span class="lt">${"abcd"[j]}</span><span>${esc(o)}</span></button>`).join("")}</div>`).join("")}
  <button class="btn b-ink b-full" data-act="submitExam" style="margin:6px 0 20px">ટેસ્ટ સબમિટ કરો</button>`;
}
ACT.pick = el => {
  const i = +el.dataset.q, j = +el.dataset.o;
  S.exam.answers[i] = S.exam.answers[i] === j ? -1 : j; saveExam();
  el.parentElement.querySelectorAll(".opt").forEach((b, k) => b.classList.toggle("sel", S.exam.answers[i] === k));
  const sm = $(".exam-top small"); if (sm) sm.textContent = `${S.exam.answers.filter(a => a >= 0).length}/${S.exam.t.questions.length} જવાબ આપ્યા`;
};
ACT.submitExam = el => submitExam(false, el);
async function submitExam(auto, btn) {
  const E = S.exam; if (!E || E.sending) return;
  const blank = E.answers.filter(a => a < 0).length;
  if (!auto && !confirm(blank ? `${blank} પ્રશ્ન બાકી છે. છતાં સબમિટ કરવું છે?` : "ટેસ્ટ સબમિટ કરવો છે?")) return;
  E.sending = true;
  const K = S.kid, t = E.t, rid = `${t.id}_${K.s.id}`;
  try {
    await setDoc(doc(db, "results", rid), { testId: t.id, studentId: K.s.id, batchId: K.s.batchId, answers: E.answers, submittedAt: serverTimestamp() });
    try { localStorage.removeItem(examKey(t.id)); } catch {}
    S.exam = null; clearInterval(tick._i);
    K.results.push({ id: rid, testId: t.id, studentId: K.s.id, answers: E.answers });
    toast(auto ? "સમય પૂરો — ટેસ્ટ સબમિટ થયો." : "ટેસ્ટ સબમિટ થયો.");
    render(); scrollTo(0, 0);
    if (t.instant) ACT.review({ dataset: { id: t.id } });
  } catch (e) {
    E.sending = false;
    fail(e, "સબમિટ ન થયું. ઇન્ટરનેટ ચાલુ કરી ફરી ‘સબમિટ’ દબાવો — તમારા જવાબ સચવાયેલા છે.");
  }
}
ACT.review = async el => {
  const K = S.kid, t = K.tests.find(x => x.id === el.dataset.id), r = mySub(K, t.id);
  try {
    const key = (await getDoc(doc(db, "testKeys", t.id))).data()?.answers || [];
    const me = t.marksEach || 1, sc = score(r.answers, key, me);
    openSheet("જવાબ — " + t.title, `<div class="stats" style="grid-template-columns:1fr 1fr"><div class="stat gold"><div class="n">${sc}/${t.maxMarks}</div><div class="l">તમારા ગુણ</div></div><div class="stat"><div class="n">${pct(sc, t.maxMarks)}%</div><div class="l">રેન્ક પરિણામ જાહેર થયા પછી</div></div></div>
    ${t.questions.map((q, i) => `<div class="q"><div class="qn">${i + 1}. ${esc(q.q)}</div>${q.o.map((o, j) => `<div class="opt ${j === key[i] ? "right" : r.answers[i] === j ? "wrong" : ""}" style="cursor:default"><span class="lt">${"abcd"[j]}</span><span>${esc(o)}${j === key[i] ? " ✓" : r.answers[i] === j ? " ✗" : ""}</span></div>`).join("")}${r.answers[i] < 0 ? `<p class="small muted" style="margin:6px 0 0">જવાબ આપ્યો નથી</p>` : ""}</div>`).join("")}`);
  } catch (e) { fail(e, "જવાબ હજુ ઉપલબ્ધ નથી."); }
};
addEventListener("beforeunload", e => { if (S.exam) { e.preventDefault(); e.returnValue = ""; } });

// ---------- Parent ----------
function paHome() {
  const K = S.kid; if (!K) return loading();
  const mk = ymd().slice(0, 7), at = attStats(K, mk), rs = doneResults(K), last = rs[rs.length - 1];
  const due = feeNet(K.s) - K.paid;
  return `${kidHead(K)}
  <div class="stats" style="grid-template-columns:1fr 1fr">
    <div class="stat"><div class="n">${at.total ? `${at.p + at.l}/${at.total}` : "–"}</div><div class="l">${MONTHS[new Date().getMonth()]} હાજરી${at.a ? ` · <span class="bad">${at.a} ગેરહાજર</span>` : ""}</div></div>
    <div class="stat"><div class="n">${last ? `${last.marks}/${last.maxMarks}` : "–"}</div><div class="l">${last ? `${esc(last.testTitle)}${last.rank ? ` · રેન્ક ${last.rank}` : ""}` : "છેલ્લો ટેસ્ટ"}</div></div>
    <div class="stat ${due > 0 ? "" : "gold"}"><div class="n ${due > 0 ? "bad" : ""}">${money(Math.max(0, due))}</div><div class="l">બાકી ફી${due > 0 && K.s.dueDate ? ` · ${fmtD(K.s.dueDate)}` : ""}</div></div>
    <div class="stat"><div class="n">${rs.length ? Math.round(rs.reduce((t, r) => t + pct(r.marks, r.maxMarks), 0) / rs.length) + "%" : "–"}</div><div class="l">ટેસ્ટ સરેરાશ</div></div>
  </div>
  ${hwHomeBlock(K)}
  ${rs.length >= 2 ? `<div class="card"><b>પ્રગતિ</b>${lineChart(rs)}</div>` : ""}
  ${lecturesBlock(K)}
  <div class="h"><h2>સૂચના</h2>${refreshBtn}</div>${noticeList(K.notices.slice(0, 8))}
  <a class="btn b-line b-full" href="tel:+91${ACADEMY.phone}">${ic("phone")} એકેડેમીને ફોન કરો</a>`;
}
function paAtt() {
  const K = S.kid; if (!K) return loading();
  const months = []; const d = new Date(); d.setDate(1);
  for (let i = 0; i < 6; i++) { months.push(ymd(d).slice(0, 7)); d.setMonth(d.getMonth() - 1); }
  if (!months.includes(S.fm)) S.fm = months[0];
  const at = attStats(K, S.fm);
  return `<div class="h"><h2>હાજરી</h2>${refreshBtn}</div>
  ${chips("fm", months.map(m => [m, monthLabel(m)]))}
  <div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><div class="n ok">${at.p}</div><div class="l">હાજર</div></div><div class="stat"><div class="n bad">${at.a}</div><div class="l">ગેરહાજર</div></div><div class="stat"><div class="n">${at.l}</div><div class="l">મોડા</div></div></div>
  ${at.total ? `<div class="card"><div class="kv" style="border:0"><span>હાજરી</span><b>${pct(at.p + at.l, at.total)}%</b></div><div class="bar"><i style="width:${pct(at.p + at.l, at.total)}%"></i></div></div>` : `<div class="card small muted">આ મહિનાની હાજરી હજુ પુરાઈ નથી.</div>`}
  ${at.absDays.length ? `<div class="h"><h2>ગેરહાજર દિવસો</h2></div><div class="list">${at.absDays.map(x => `<div class="item"><span class="mid"><b>${fmtD(x)}</b></span><span class="tag t-bad">ગેરહાજર</span></div>`).join("")}</div>` : ""}
  ${at.lateDays.length ? `<div class="h"><h2>મોડા આવ્યા</h2></div><div class="list">${at.lateDays.map(x => `<div class="item"><span class="mid"><b>${fmtD(x)}</b></span><span class="tag t-warn">મોડા</span></div>`).join("")}</div>` : ""}`;
}
function paMarks() { const K = S.kid; if (!K) return loading(); return `<div class="h"><h2>માર્ક્સ અને પ્રગતિ</h2>${refreshBtn}</div>${progressBlock(K)}<div class="h"><h2>બધા ટેસ્ટ</h2></div>${resultsList(K)}`; }
function paFees() {
  const K = S.kid; if (!K) return loading();
  const net = feeNet(K.s), due = net - K.paid;
  const upi = ACADEMY.upiId && due > 0 ? `upi://pay?pa=${encodeURIComponent(ACADEMY.upiId)}&pn=${encodeURIComponent(ACADEMY.nameEn)}&am=${Math.round(due)}&cu=INR&tn=${encodeURIComponent("Fee " + K.s.id)}` : "";
  return `<div class="h"><h2>ફી</h2>${refreshBtn}</div>
  <div class="card"><div class="kv"><span>કુલ ફી</span><b>${money(K.s.feeTotal)}</b></div>${num(K.s.discount) ? `<div class="kv"><span>છૂટ</span><b>− ${money(K.s.discount)}</b></div>` : ""}
  <div class="kv"><span>ભરેલી</span><b class="ok">${money(K.paid)}</b></div><div class="kv"><span>બાકી</span><b class="${due > 0 ? "bad" : "ok"}">${money(Math.max(0, due))}</b></div>
  ${due > 0 && K.s.dueDate ? `<div class="kv"><span>ભરવાની તારીખ</span><b>${fmtD(K.s.dueDate)}</b></div>` : ""}
  ${net ? `<div class="bar" style="margin-top:12px"><i style="width:${Math.min(100, pct(K.paid, net))}%"></i></div>` : ""}</div>
  ${upi ? `<a class="btn b-gold b-full" href="${upi}">UPI થી ${money(due)} ભરો</a><p class="small muted" style="text-align:center">ચુકવણી પછી એકેડેમી નોંધ કરશે એટલે રસીદ અહીં દેખાશે.</p>` : ""}
  <div class="h"><h2>રસીદો</h2></div>
  ${K.payments.length ? `<div class="list">${K.payments.map(p => `<button class="item" data-act="receipt" data-id="${p.id}"><span class="mid"><b>${money(p.amount)}</b><small>${fmtD(p.date)} · ${esc(p.mode)} · ${esc(p.receiptNo)}</small></span><span class="tag t-ink">રસીદ</span></button>`).join("")}</div>` : `<div class="card">${empty("હજુ કોઈ ચુકવણી નથી")}</div>`}`;
}

// =============================================================
//  હોમવર્ક, સજા-હોમવર્ક અને ટાઇમટેબલ
// =============================================================
const DAYS = ["રવિ", "સોમ", "મંગળ", "બુધ", "ગુરુ", "શુક્ર", "શનિ"];
const HW_ST = { done: "કર્યું", incomplete: "અધૂરું", notdone: "નથી કર્યું", correction: "સુધારો", pending: "બાકી" };
const HW_TAG = { done: "t-ok", incomplete: "t-warn", notdone: "t-bad", correction: "t-warn", pending: "t-ink" };
const HW_TYPE = ["લેખિત", "યાદ કરવું", "વર્કશીટ", "પ્રોજેક્ટ"];
const addDays = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return ymd(d); };
const tmin = t => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
const t12 = t => { if (!t) return ""; let [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${z2(m)} ${ap}`; };
const slotsOf = (tt, dow) => ((tt && tt.slots) || []).filter(x => +x.day === dow).sort((a, b) => tmin(a.start) - tmin(b.start));
const slotList = (list, emptyTxt) => list.length ? `<div class="list">${list.map(x => `<div class="item" style="cursor:default"><span class="av" style="width:auto;padding:0 8px;font-size:13px">${t12(x.start)}</span><span class="mid"><b>${esc(x.subject)}</b><small>${t12(x.start)}–${t12(x.end)}${x.teacher ? " · " + esc(x.teacher) : ""}${x.room ? " · " + esc(x.room) : ""}</small></span></div>`).join("")}</div>` : `<div class="card small muted">${emptyTxt}</div>`;
const hwDue = h => !h.checked && h.checkDate && h.checkDate <= ymd();
const pnDue = p => p.status !== "done" && p.checkDate && p.checkDate <= ymd();

// ---------- Admin: Homework tab ----------
function adminHw() {
  const due = S.homework.filter(hwDue).sort(by("checkDate"));
  const pn = S.punishments.filter(pnDue).sort(by("checkDate"));
  let list = S.homework.filter(h => S.fm === "all" || h.batchId === S.fm).sort((a, b) => (b.assignedDate || "").localeCompare(a.assignedDate || ""));
  return `<div class="h"><h2>હોમવર્ક</h2><button class="btn b-ink b-sm" data-act="newHw">${ic("plus")} હોમવર્ક આપો</button></div>
  ${due.length ? `<div class="card" style="border:2px solid var(--gold)"><b>આજે ચેક કરવાનું (${due.length})</b>${due.map(h => `<div class="kv" style="align-items:center"><span>${esc(batchName(h.batchId))} · ${esc(h.subject)} · ${esc(h.title)}${h.checkDate < ymd() ? ` <span class="tag t-bad">મોડું</span>` : ""}</span><button class="btn b-gold b-sm" data-act="hwReg" data-id="${h.id}">ચેક કરો</button></div>`).join("")}</div>` : ""}
  ${pn.length ? `<div class="card" style="border-color:#F3C9C5"><b class="bad">સજા-હોમવર્ક ચેક કરવાનું (${pn.length})</b>${pn.map(p => `<div class="kv" style="align-items:center"><span>${esc(sNameOf(p.studentId))} · ${esc(p.details)}</span><button class="btn b-line b-sm" data-act="openPn" data-id="${p.id}">જુઓ</button></div>`).join("")}</div>` : ""}
  ${chips("fm", [["all", "બધી બેચ"], ...S.batches.slice().sort(by("name")).map(b => [b.id, b.name])])}
  ${list.length ? `<div class="list">${list.map(h => `<button class="item" data-act="hwReg" data-id="${h.id}"><span class="mid"><b>${esc(h.subject)} · ${esc(h.title)}</b><small>${esc(batchName(h.batchId))} · આપ્યું ${fmtD(h.assignedDate)} · ચેક ${fmtD(h.checkDate)}</small></span>${h.checked ? `<span class="tag t-ok">ચેક થયું</span>` : `<span class="tag t-warn">બાકી</span>`}</button>`).join("")}</div>` : `<div class="card">${empty("હજુ કોઈ હોમવર્ક નથી", "<p class='small'>હોમવર્ક આપો, પછી ચેકિંગની તારીખે અહીં યાદી આવશે.</p>")}</div>`}
  <div class="h"><h2>સજા-હોમવર્ક</h2></div>
  ${S.punishments.length ? `<div class="list">${S.punishments.slice().sort((a, b) => (b.assignedDate || "").localeCompare(a.assignedDate || "")).slice(0, 30).map(p => `<button class="item" data-act="openPn" data-id="${p.id}"><span class="mid"><b>${esc(sNameOf(p.studentId))}</b><small>${esc(p.details)} · ચેક ${fmtD(p.checkDate)}</small></span><span class="tag ${HW_TAG[p.status] || "t-ink"}">${HW_ST[p.status] || "બાકી"}</span></button>`).join("")}</div>` : `<div class="card small muted">હોમવર્ક ચેક કરતી વખતે ‘નથી કર્યું’ વાળા વિદ્યાર્થીને અહીંથી સજા-હોમવર્ક આપી શકાય.</div>`}`;
}
const sNameOf = id => S.students.find(s => s.id === id)?.name || id;

ACT.newHw = () => {
  if (!S.batches.length) return toast("પહેલાં બેચ બનાવો.", true);
  const t = ymd(), tm = addDays(t, 1);
  openSheet("નવું હોમવર્ક", `<form data-form="hw">
    <div class="g2"><div class="f"><label class="l">બેચ *</label><select class="in" name="batchId" required>${batchOpts(S.fm !== "all" ? S.fm : "")}</select></div>
    <div class="f"><label class="l">વિષય *</label><input class="in" name="subject" required maxlength="40" placeholder="ઉદા. વિજ્ઞાન"></div></div>
    <div class="f"><label class="l">પ્રકરણ / ટોપિક</label><input class="in" name="chapter" maxlength="80"></div>
    <div class="f"><label class="l">હોમવર્ક *</label><input class="in" name="title" required maxlength="120" placeholder="ઉદા. સ્વાધ્યાય 1 થી 10 લખવા"></div>
    <div class="f"><label class="l">વિગત (વૈકલ્પિક)</label><textarea class="in" name="details" rows="2" maxlength="800"></textarea></div>
    <div class="g3"><div class="f"><label class="l">પ્રકાર</label><select class="in" name="type">${opts(HW_TYPE, HW_TYPE[0])}</select></div>
    <div class="f"><label class="l">જમા તારીખ</label><input class="in" type="date" name="dueDate" value="${tm}"></div>
    <div class="f"><label class="l">ચેક તારીખ</label><input class="in" type="date" name="checkDate" value="${tm}"></div></div>
    <p class="small muted" style="margin-top:0">ચેક તારીખે આ હોમવર્ક ‘આજે ચેક કરવાનું’ યાદીમાં આવશે. વિદ્યાર્થી અને વાલીને એપમાં દેખાશે.</p>
    <button class="btn b-ink b-full" type="submit">હોમવર્ક આપો</button></form>`);
};
FORMS.hw = async (f, btn) => {
  const v = formVals(f);
  if (!v.batchId || !v.subject || !v.title) return toast("બેચ, વિષય અને હોમવર્ક લખો.", true);
  if (v.checkDate && v.dueDate && v.checkDate < v.dueDate) return toast("ચેક તારીખ જમા તારીખ પછીની હોવી જોઈએ.", true);
  await busy(btn, async () => {
    try {
      await addDoc(collection(db, "homework"), { batchId: v.batchId, subject: v.subject, chapter: v.chapter || "", title: v.title, details: v.details || "", type: v.type, assignedDate: ymd(), dueDate: v.dueDate || "", checkDate: v.checkDate || v.dueDate || "", checked: false, createdAt: serverTimestamp() });
      closeSheet(); toast("હોમવર્ક અપાઈ ગયું.");
    } catch (e) { fail(e); }
  });
};

let HWR = null;
ACT.hwReg = async el => {
  const h = S.homework.find(x => x.id === el.dataset.id); if (!h) return;
  const list = active().filter(s => s.batchId === h.batchId).sort(by("name"));
  const prev = {};
  try { (await getDocs(query(collection(db, "homeworkStatus"), where("hwId", "==", h.id)))).forEach(d => prev[d.data().studentId] = d.data().status); } catch (e) { console.warn(e); }
  HWR = { h, list, m: {} };
  list.forEach(s => HWR.m[s.id] = prev[s.id] || "done");
  drawHwReg();
};
function drawHwReg() {
  const { h, list, m } = HWR;
  const cnt = {}; Object.values(m).forEach(v => cnt[v] = (cnt[v] || 0) + 1);
  openSheet(`${h.subject} · ${h.title}`, `<p class="small muted" style="margin-top:0">${esc(batchName(h.batchId))} · આપ્યું ${fmtD(h.assignedDate)} · જમા ${fmtD(h.dueDate)}${h.chapter ? " · " + esc(h.chapter) : ""}</p>
    ${h.details ? `<div class="card small" style="white-space:pre-wrap">${esc(h.details)}</div>` : ""}
    <div class="row-btns" style="margin-bottom:10px">${["done", "incomplete", "notdone", "correction"].map(k => `<span class="tag ${HW_TAG[k]}">${HW_ST[k]} ${cnt[k] || 0}</span>`).join("")}</div>
    ${list.length ? `<div class="list">${list.map(s => `<div class="item" style="cursor:default;flex-wrap:wrap"><span class="mid" style="min-width:120px"><b>${esc(s.name)}</b><small>${esc(s.id)}</small></span>
      <span class="att">${[["done", "✓"], ["incomplete", "અ"], ["notdone", "✗"], ["correction", "સુ"]].map(([k, l]) => `<button class="${k === "done" ? "p" : k === "notdone" ? "a" : "l"} ${m[s.id] === k ? "on" : ""}" data-act="hwMark" data-id="${esc(s.id)}" data-v="${k}" aria-label="${HW_ST[k]}">${l}</button>`).join("")}</span></div>`).join("")}</div>
    <p class="small muted">✓ કર્યું · અ અધૂરું · ✗ નથી કર્યું · સુ સુધારો જરૂરી</p>
    <button class="btn b-ink b-full" data-act="hwSave">ચેકિંગ સાચવો</button>` : `<div class="empty">આ બેચમાં વિદ્યાર્થી નથી</div>`}
    <button class="btn b-bad b-full" style="margin-top:8px" data-act="hwDel" data-id="${h.id}">હોમવર્ક કાઢી નાખો</button>`);
}
ACT.hwMark = el => { HWR.m[el.dataset.id] = el.dataset.v; const sc = document.querySelector(".sheet")?.scrollTop; drawHwReg(); const sh = document.querySelector(".sheet"); if (sh) sh.scrollTop = sc; };
ACT.hwSave = async el => {
  const { h, list, m } = HWR;
  await busy(el, async () => {
    try {
      const b = writeBatch(db);
      list.forEach(s => b.set(doc(db, "homeworkStatus", `${h.id}_${s.id}`), { hwId: h.id, studentId: s.id, batchId: h.batchId, status: m[s.id], subject: h.subject, title: h.title, date: h.checkDate || ymd(), updatedAt: serverTimestamp() }));
      b.update(doc(db, "homework", h.id), { checked: true, checkedAt: ymd() });
      await b.commit();
      toast("ચેકિંગ સાચવ્યું.");
      const bad = list.filter(s => ["notdone", "incomplete", "correction"].includes(m[s.id]));
      if (!bad.length) return closeSheet();
      openSheet(`વાલીને જાણ કરો (${bad.length})`, `<div class="list">${bad.map(s => {
        const msg = `નમસ્તે ${s.parentName || ""},\n${ACADEMY.name}: ${s.name} એ ${h.subject} નું હોમવર્ક (${h.title}) ${HW_ST[m[s.id]]} છે. કૃપા કરી ધ્યાન આપશો.`;
        return `<div class="item" style="cursor:default;flex-wrap:wrap"><span class="mid"><b>${esc(s.name)}</b><small>${HW_ST[m[s.id]]} · ${esc(s.parentPhone)}</small></span><span class="row-btns">
          <a class="btn b-wa b-sm" target="_blank" rel="noopener" href="${waLink(s.parentPhone, msg)}">${ic("wa")}</a>
          <a class="btn b-line b-sm" href="tel:+91${esc(s.parentPhone)}">${ic("phone")}</a>
          <button class="btn b-bad b-sm" data-act="newPn" data-id="${esc(s.id)}" data-hw="${h.id}">સજા-HW</button></span></div>`;
      }).join("")}</div>`);
    } catch (e) { fail(e); }
  });
};
ACT.hwDel = async el => {
  if (!confirm("આ હોમવર્ક અને તેનું ચેકિંગ કાઢી નાખવું છે?")) return;
  try {
    const b = writeBatch(db);
    b.delete(doc(db, "homework", el.dataset.id));
    (await getDocs(query(collection(db, "homeworkStatus"), where("hwId", "==", el.dataset.id)))).forEach(d => b.delete(d.ref));
    await b.commit(); closeSheet(); toast("કાઢી નાખ્યું.");
  } catch (e) { fail(e); }
};

// ---------- સજા-હોમવર્ક ----------
ACT.newPn = el => {
  const s = S.students.find(x => x.id === el.dataset.id), h = S.homework.find(x => x.id === el.dataset.hw);
  const tm = addDays(ymd(), 1);
  openSheet("સજા-હોમવર્ક — " + s.name, `<form data-form="pn" data-id="${esc(s.id)}">
    <div class="f"><label class="l">કારણ *</label><input class="in" name="reason" required maxlength="120" value="${h ? esc(`${h.subject}: ${h.title} — નથી કર્યું`) : ""}"></div>
    <div class="f"><label class="l">શું લખવાનું / કરવાનું *</label><input class="in" name="details" required maxlength="160" placeholder="ઉદા. આખું હોમવર્ક + સ્વાધ્યાય 2 વાર"></div>
    <div class="g2"><div class="f"><label class="l">જમા તારીખ</label><input class="in" type="date" name="dueDate" value="${tm}"></div>
    <div class="f"><label class="l">ચેક તારીખ</label><input class="in" type="date" name="checkDate" value="${tm}"></div></div>
    <p class="small muted" style="margin-top:0">ફક્ત અભ્યાસ સંબંધિત વધારાનું કામ આપવું. ચેક તારીખે ડેશબોર્ડ પર યાદ આવશે, અને વાલીને એપમાં દેખાશે.</p>
    <button class="btn b-ink b-full" type="submit">સજા-હોમવર્ક આપો</button></form>`);
};
FORMS.pn = async (f, btn) => {
  const v = formVals(f), sid = f.dataset.id, s = S.students.find(x => x.id === sid);
  if (!v.reason || !v.details) return toast("કારણ અને કામ લખો.", true);
  await busy(btn, async () => {
    try {
      await addDoc(collection(db, "punishments"), { studentId: sid, batchId: s.batchId, reason: v.reason, details: v.details, assignedDate: ymd(), dueDate: v.dueDate || "", checkDate: v.checkDate || v.dueDate || "", status: "pending", remarks: "", createdAt: serverTimestamp() });
      closeSheet(); toast("સજા-હોમવર્ક નોંધાયું.");
      const msg = `નમસ્તે ${s.parentName || ""},\n${ACADEMY.name}: ${s.name} ને વધારાનું હોમવર્ક આપ્યું છે.\nકારણ: ${v.reason}\nકામ: ${v.details}\nજમા તારીખ: ${fmtD(v.dueDate)}`;
      openSheet("વાલીને જાણ કરો", `<a class="btn b-wa b-full" target="_blank" rel="noopener" href="${waLink(s.parentPhone, msg)}">${ic("wa")} ${esc(s.parentName || s.parentPhone)} ને WhatsApp</a>`);
    } catch (e) { fail(e); }
  });
};
ACT.openPn = el => {
  const p = S.punishments.find(x => x.id === el.dataset.id); if (!p) return;
  openSheet("સજા-હોમવર્ક — " + sNameOf(p.studentId), `<div class="card">
    <div class="kv"><span>કારણ</span><b>${esc(p.reason)}</b></div><div class="kv"><span>કામ</span><b>${esc(p.details)}</b></div>
    <div class="kv"><span>આપ્યું</span><b>${fmtD(p.assignedDate)}</b></div><div class="kv"><span>ચેક તારીખ</span><b>${fmtD(p.checkDate)}</b></div>
    <div class="kv"><span>સ્થિતિ</span><b>${HW_ST[p.status] || "બાકી"}</b></div></div>
    <form data-form="pnUpd" data-id="${p.id}"><div class="f"><label class="l">સ્થિતિ</label><select class="in" name="status">${["pending", "done", "incomplete", "notdone"].map(k => `<option value="${k}" ${p.status === k ? "selected" : ""}>${HW_ST[k]}</option>`).join("")}</select></div>
    <div class="f"><label class="l">નોંધ</label><input class="in" name="remarks" maxlength="200" value="${esc(p.remarks)}"></div>
    <button class="btn b-ink b-full" type="submit">સાચવો</button></form>
    <button class="btn b-bad b-full" style="margin-top:8px" data-act="delDoc" data-c="punishments" data-id="${p.id}">કાઢી નાખો</button>`);
};
FORMS.pnUpd = async (f, btn) => {
  const v = formVals(f);
  await busy(btn, async () => { try { await updateDoc(doc(db, "punishments", f.dataset.id), { status: v.status, remarks: v.remarks || "", checkedAt: v.status !== "pending" ? ymd() : "" }); closeSheet(); toast("સાચવ્યું."); } catch (e) { fail(e); } });
};

// ---------- Admin: Timetable ----------
function moreTimetable(back) {
  if (!S.batches.length) return `<div class="h">${back}</div><div class="card">${empty("પહેલાં બેચ બનાવો")}</div>`;
  if (!S.ttBatch || !S.batches.some(b => b.id === S.ttBatch)) S.ttBatch = S.batches.slice().sort(by("name"))[0].id;
  const tt = S.timetable.find(t => t.id === S.ttBatch);
  return `<div class="h">${back}<button class="btn b-ink b-sm" data-act="newSlot">${ic("plus")} લેક્ચર</button></div>
  <div class="f"><select class="in" data-change="ttBatch">${batchOpts(S.ttBatch)}</select></div>
  ${[1, 2, 3, 4, 5, 6, 0].map(d => { const L = slotsOf(tt, d); return L.length ? `<div class="h"><h2 style="font-size:18px">${DAYS[d]}વાર</h2></div><div class="list">${L.map(x => `<div class="item" style="cursor:default"><span class="mid"><b>${t12(x.start)}–${t12(x.end)} · ${esc(x.subject)}</b><small>${esc(x.teacher || "")}${x.room ? " · " + esc(x.room) : ""}</small></span><button class="btn b-bad b-sm" data-act="delSlot" data-k="${esc(x.k)}">કાઢો</button></div>`).join("")}</div>` : ""; }).join("") || `<div class="card">${empty("આ બેચનું ટાઇમટેબલ ખાલી છે", "<p class='small'>‘+ લેક્ચર’ દબાવી દરેક દિવસના લેક્ચર ઉમેરો.</p>")}</div>`}`;
}
CHG.ttBatch = el => { S.ttBatch = el.value; render(); };
ACT.newSlot = () => openSheet("લેક્ચર ઉમેરો — " + batchName(S.ttBatch), `<form data-form="slot">
  <div class="f"><label class="l">દિવસો *</label><div class="row-btns">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label class="chip" style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="d${d}" ${d >= 1 && d <= 6 ? "" : ""}> ${DAYS[d]}</label>`).join("")}</div></div>
  <div class="g2"><div class="f"><label class="l">શરૂ *</label><input class="in" type="time" name="start" required value="17:00"></div><div class="f"><label class="l">પૂરું *</label><input class="in" type="time" name="end" required value="18:00"></div></div>
  <div class="g2"><div class="f"><label class="l">વિષય *</label><input class="in" name="subject" required maxlength="40"></div><div class="f"><label class="l">શિક્ષક</label><input class="in" name="teacher" maxlength="40"></div></div>
  <div class="f"><label class="l">રૂમ (વૈકલ્પિક)</label><input class="in" name="room" maxlength="20"></div>
  <button class="btn b-ink b-full" type="submit">ઉમેરો</button></form>`);
FORMS.slot = async (f, btn) => {
  const v = formVals(f), days = [0, 1, 2, 3, 4, 5, 6].filter(d => f["d" + d].checked);
  if (!days.length) return toast("ઓછામાં ઓછો એક દિવસ પસંદ કરો.", true);
  if (!v.subject) return toast("વિષય લખો.", true);
  if (tmin(v.end) <= tmin(v.start)) return toast("પૂરું થવાનો સમય શરૂ કરતાં પછીનો હોવો જોઈએ.", true);
  const overlap = (a, b) => tmin(a.start) < tmin(b.end) && tmin(b.start) < tmin(a.end);
  const cur = S.timetable.find(t => t.id === S.ttBatch)?.slots || [];
  for (const d of days) {
    const me = { start: v.start, end: v.end };
    const own = cur.find(x => +x.day === d && overlap(x, me));
    if (own) return toast(`${DAYS[d]}વારે આ બેચનો ${own.subject} લેક્ચર આ સમયે છે.`, true);
    if (v.teacher) for (const t of S.timetable) for (const x of (t.slots || [])) {
      const sameT = (x.teacher || "").trim().toLowerCase() === v.teacher.trim().toLowerCase();
      if (sameT && +x.day === d && overlap(x, me)) return toast(`${v.teacher} નો ${DAYS[d]}વારે ${batchName(t.id)} માં આ સમયે લેક્ચર છે.`, true);
      const sameR = v.room && (x.room || "").trim().toLowerCase() === v.room.trim().toLowerCase();
      if (sameR && t.id !== S.ttBatch && +x.day === d && overlap(x, me)) return toast(`રૂમ ${v.room} ${DAYS[d]}વારે આ સમયે ${batchName(t.id)} માટે વપરાય છે.`, true);
    }
  }
  const add = days.map(d => ({ k: Math.random().toString(36).slice(2, 10), day: d, start: v.start, end: v.end, subject: v.subject, teacher: v.teacher || "", room: v.room || "" }));
  await busy(btn, async () => {
    try { await setDoc(doc(db, "timetable", S.ttBatch), { batchId: S.ttBatch, slots: [...cur, ...add], updatedAt: serverTimestamp() }); closeSheet(); toast("ટાઇમટેબલમાં ઉમેર્યું."); } catch (e) { fail(e); }
  });
};
ACT.delSlot = async el => {
  if (!confirm("આ લેક્ચર કાઢી નાખવો છે?")) return;
  const cur = S.timetable.find(t => t.id === S.ttBatch)?.slots || [];
  try { await setDoc(doc(db, "timetable", S.ttBatch), { batchId: S.ttBatch, slots: cur.filter(x => x.k !== el.dataset.k), updatedAt: serverTimestamp() }); toast("કાઢી નાખ્યો."); } catch (e) { fail(e); }
};

// ---------- Student / Parent: lectures + homework ----------
function lecturesBlock(K) {
  const d = new Date(), dow = d.getDay(), tdw = (dow + 1) % 7;
  if (!K.tt || !(K.tt.slots || []).length) return "";
  return `<div class="h"><h2>આજના લેક્ચર</h2></div>${slotList(slotsOf(K.tt, dow), "આજે કોઈ લેક્ચર નથી.")}
  <div class="h"><h2>કાલના લેક્ચર (${DAYS[tdw]})</h2></div>${slotList(slotsOf(K.tt, tdw), "કાલે કોઈ લેક્ચર નથી.")}`;
}
function hwItems(K, onlyOpen) {
  const st = id => K.hwStatus.find(x => x.hwId === id)?.status || "pending";
  let list = K.homework.slice().sort((a, b) => (b.assignedDate || "").localeCompare(a.assignedDate || ""));
  if (onlyOpen) list = list.filter(h => st(h.id) === "pending" && (!h.dueDate || h.dueDate >= addDays(ymd(), -1)));
  return list.map(h => ({ h, s: st(h.id) }));
}
function hwCards(items) {
  return items.map(({ h, s }) => `<div class="card"><div class="row-btns" style="justify-content:space-between;align-items:center"><b>${esc(h.subject)}</b><span class="tag ${HW_TAG[s]}">${HW_ST[s]}</span></div>
    <div style="margin-top:4px">${esc(h.title)}</div>${h.chapter ? `<small class="muted">${esc(h.chapter)}</small>` : ""}${h.details ? `<div class="small" style="white-space:pre-wrap;margin-top:6px">${esc(h.details)}</div>` : ""}
    <p class="small muted" style="margin:8px 0 0">આપ્યું ${fmtD(h.assignedDate)}${h.dueDate ? ` · જમા <b>${fmtD(h.dueDate)}</b>` : ""} · ${esc(h.type || "")}</p></div>`).join("");
}
function pnCards(K) {
  const open = K.punishments.filter(p => p.status === "pending" || p.status === "incomplete");
  if (!open.length) return "";
  return `<div class="h"><h2 class="bad">વધારાનું હોમવર્ક</h2></div>${open.map(p => `<div class="card" style="border-color:#F3C9C5"><b>${esc(p.details)}</b><p class="small muted" style="margin:4px 0 0">કારણ: ${esc(p.reason)} · જમા ${fmtD(p.dueDate)} · ${HW_ST[p.status]}</p></div>`).join("")}`;
}
function hwView() {
  const K = S.kid; if (!K) return loading();
  const items = hwItems(K, false);
  const done = items.filter(x => x.s === "done").length, checked = items.filter(x => x.s !== "pending").length;
  return `<div class="h"><h2>હોમવર્ક</h2>${refreshBtn}</div>
  ${checked ? `<div class="card"><div class="kv" style="border:0"><span>ચેક થયેલા હોમવર્કમાંથી પૂરા કર્યા</span><b>${done}/${checked} · ${pct(done, checked)}%</b></div><div class="bar"><i style="width:${pct(done, checked)}%"></i></div></div>` : ""}
  ${pnCards(K)}
  ${items.length ? hwCards(items) : `<div class="card">${empty("હજુ કોઈ હોમવર્ક નથી")}</div>`}
  ${K.punishments.filter(p => !(p.status === "pending" || p.status === "incomplete")).length ? `<div class="h"><h2>અગાઉનું વધારાનું હોમવર્ક</h2></div><div class="list">${K.punishments.filter(p => !(p.status === "pending" || p.status === "incomplete")).map(p => `<div class="item"><span class="mid"><b>${esc(p.details)}</b><small>${fmtD(p.assignedDate)} · ${esc(p.reason)}</small></span><span class="tag ${HW_TAG[p.status]}">${HW_ST[p.status]}</span></div>`).join("")}</div>` : ""}`;
}
function hwHomeBlock(K) {
  const open = hwItems(K, true).slice(0, 4);
  return `${pnCards(K)}${open.length ? `<div class="h"><h2>બાકી હોમવર્ક</h2></div>${hwCards(open)}` : ""}`;
}

const VIEWS = {
  admin: { home: adminHome, students: adminStudents, att: adminAtt, hw: adminHw, fees: adminFees, tests: adminTests, more: adminMore },
  student: { home: stHome, hw: hwView, tests: stTests, notes: stNotes, progress: stProgress, notices: stNotices },
  parent: { home: paHome, hw: hwView, att: paAtt, marks: paMarks, fees: paFees, notices: stNotices }
};

boot();
