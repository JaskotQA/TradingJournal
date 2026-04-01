// ─────────────────────────────────────────────────────────
//  Trading Journal — app.js
//  Firebase Firestore + Google Auth + Chart.js
// ─────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── FIREBASE CONFIG ────────────────────────────────────────────
// Podmień na swoje dane z Firebase Console (Project Settings → Your apps)
const firebaseConfig = {
  apiKey:            "TWOJ_API_KEY",
  authDomain:        "TWOJ_PROJECT.firebaseapp.com",
  projectId:         "TWOJ_PROJECT_ID",
  storageBucket:     "TWOJ_PROJECT.appspot.com",
  messagingSenderId: "TWOJ_SENDER_ID",
  appId:             "TWOJ_APP_ID"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── STATE ──────────────────────────────────────────────────────
let currentUser  = null;
let trades       = [];
let editingId    = null;
let unsubscribe  = null;

// ── DOM ────────────────────────────────────────────────────────
const authScreen     = document.getElementById("auth-screen");
const appDiv         = document.getElementById("app");
const googleSigninBtn= document.getElementById("google-signin-btn");
const signoutBtn     = document.getElementById("signout-btn");
const userAvatar     = document.getElementById("user-avatar");
const userName       = document.getElementById("user-name");
const addTradeBtn    = document.getElementById("add-trade-btn");
const tradeModal     = document.getElementById("trade-modal");
const detailModal    = document.getElementById("detail-modal");
const modalTitle     = document.getElementById("modal-title");
const modalSaveBtn   = document.getElementById("modal-save-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalCloseBtn  = document.getElementById("modal-close-btn");
const detailCloseBtn = document.getElementById("detail-close-btn");
const detailCloseBtn2= document.getElementById("detail-close-btn2");
const detailEditBtn  = document.getElementById("detail-edit-btn");
const detailDeleteBtn= document.getElementById("detail-delete-btn");
const detailBody     = document.getElementById("detail-body");
const detailTitle    = document.getElementById("detail-title");
const tableEmpty     = document.getElementById("table-empty");
const exportCsvBtn   = document.getElementById("export-csv-btn");
const calcPreview    = document.getElementById("calc-preview");

// Form fields
const fDate       = document.getElementById("f-date");
const fInstrument = document.getElementById("f-instrument");
const fDirection  = document.getElementById("f-direction");
const fEntry      = document.getElementById("f-entry");
const fSl         = document.getElementById("f-sl");
const fExit       = document.getElementById("f-exit");
const fSize       = document.getElementById("f-size");
const fPnl        = document.getElementById("f-pnl");
const fRr         = document.getElementById("f-rr");
const fSetup      = document.getElementById("f-setup");
const fEmotions   = document.getElementById("f-emotions");
const fScreenshot = document.getElementById("f-screenshot");
const fNotes      = document.getElementById("f-notes");

// ── AUTH ───────────────────────────────────────────────────────
googleSigninBtn.addEventListener("click", async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (e) { console.error(e); }
});

signoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    userAvatar.src = user.photoURL || "";
    userName.textContent = user.displayName || user.email;
    authScreen.classList.add("hidden");
    appDiv.classList.remove("hidden");
    subscribeToTrades();
  } else {
    currentUser = null;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    authScreen.classList.remove("hidden");
    appDiv.classList.add("hidden");
  }
});

// ── FIRESTORE ──────────────────────────────────────────────────
function subscribeToTrades() {
  if (unsubscribe) unsubscribe();
  const q = query(
    collection(db, "trades"),
    where("uid", "==", currentUser.uid),
    orderBy("date", "desc")
  );
  unsubscribe = onSnapshot(q, snapshot => {
    trades = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  });
}

async function saveTrade(data) {
  if (editingId) {
    await updateDoc(doc(db, "trades", editingId), { ...data, updatedAt: serverTimestamp() });
  } else {
    await addDoc(collection(db, "trades"), { ...data, uid: currentUser.uid, createdAt: serverTimestamp() });
  }
}

async function deleteTrade(id) {
  await deleteDoc(doc(db, "trades", id));
}

// ── TABS ───────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    if (tab.dataset.tab !== "dashboard") renderCharts();
  });
});

// ── MODAL OPEN/CLOSE ───────────────────────────────────────────
function openAddModal() {
  editingId = null;
  modalTitle.textContent = "Nowy Trade";
  clearForm();
  fDate.value = new Date().toISOString().split("T")[0];
  tradeModal.classList.remove("hidden");
}

function openEditModal(trade) {
  editingId = trade.id;
  modalTitle.textContent = "Edytuj Trade";
  fDate.value       = trade.date || "";
  fInstrument.value = trade.instrument || "";
  fDirection.value  = trade.direction || "Long";
  fEntry.value      = trade.entry || "";
  fSl.value         = trade.sl || "";
  fExit.value       = trade.exit || "";
  fSize.value       = trade.size || "";
  fPnl.value        = trade.pnl || "";
  fRr.value         = trade.rr || "";
  fSetup.value      = trade.setup || "";
  fEmotions.value   = trade.emotions || "";
  fScreenshot.value = trade.screenshot || "";
  fNotes.value      = trade.notes || "";
  tradeModal.classList.remove("hidden");
  updateCalcPreview();
}

function closeModal() {
  tradeModal.classList.add("hidden");
  editingId = null;
}

function closeDetailModal() {
  detailModal.classList.add("hidden");
}

addTradeBtn.addEventListener("click", openAddModal);
modalCloseBtn.addEventListener("click", closeModal);
modalCancelBtn.addEventListener("click", closeModal);
detailCloseBtn.addEventListener("click", closeDetailModal);
detailCloseBtn2.addEventListener("click", closeDetailModal);

tradeModal.addEventListener("click", e => { if (e.target === tradeModal) closeModal(); });
detailModal.addEventListener("click", e => { if (e.target === detailModal) closeDetailModal(); });

// ── CALC PREVIEW ───────────────────────────────────────────────
function calcAuto() {
  const entry = parseFloat(fEntry.value);
  const sl    = parseFloat(fSl.value);
  const exit  = parseFloat(fExit.value);
  const size  = parseFloat(fSize.value);
  const dir   = fDirection.value;
  let pnl = null, rr = null;

  if (entry && sl && exit && size) {
    const diff = dir === "Long" ? exit - entry : entry - exit;
    const risk = dir === "Long" ? entry - sl   : sl - entry;
    pnl = diff * size;
    rr  = risk > 0 ? (diff / risk) : null;
  }
  return { pnl, rr };
}

function updateCalcPreview() {
  const { pnl, rr } = calcAuto();
  if (pnl !== null) {
    calcPreview.innerHTML = `
      Auto P&L: <span class="${pnl >= 0 ? "pnl-pos" : "pnl-neg"}">${fmt$(pnl)}</span>
      &nbsp;&nbsp;Auto R:R: <span>${rr !== null ? rr.toFixed(2) : "—"}</span>
      <span style="color:var(--muted);font-size:11px;margin-left:8px">— zostaw pola puste by użyć auto-obliczeń</span>
    `;
  } else {
    calcPreview.innerHTML = `<span style="color:var(--muted)">Wypełnij Wejście, SL, Wyjście, Wielkość aby zobaczyć podgląd kalkulacji</span>`;
  }
}

[fEntry, fSl, fExit, fSize, fDirection].forEach(el => el.addEventListener("input", updateCalcPreview));

// ── SAVE TRADE ─────────────────────────────────────────────────
modalSaveBtn.addEventListener("click", async () => {
  const { pnl: autoPnl, rr: autoRr } = calcAuto();
  const data = {
    date:       fDate.value,
    instrument: fInstrument.value.trim().toUpperCase(),
    direction:  fDirection.value,
    entry:      parseFloat(fEntry.value) || null,
    sl:         parseFloat(fSl.value)    || null,
    exit:       parseFloat(fExit.value)  || null,
    size:       parseFloat(fSize.value)  || null,
    pnl:        parseFloat(fPnl.value)   || autoPnl,
    rr:         parseFloat(fRr.value)    || autoRr,
    setup:      fSetup.value.trim(),
    emotions:   fEmotions.value.trim(),
    screenshot: fScreenshot.value.trim(),
    notes:      fNotes.value.trim(),
  };
  if (!data.date || !data.instrument) { alert("Data i instrument są wymagane."); return; }
  modalSaveBtn.disabled = true;
  modalSaveBtn.textContent = "Zapisuję...";
  try {
    await saveTrade(data);
    closeModal();
  } catch (e) { alert("Błąd: " + e.message); }
  modalSaveBtn.disabled = false;
  modalSaveBtn.textContent = "Zapisz Trade";
});

// ── DETAIL MODAL ───────────────────────────────────────────────
let detailTradeId = null;

function openDetail(trade) {
  detailTradeId = trade.id;
  detailTitle.textContent = `${trade.instrument} · ${trade.date}`;
  const pnlClass = trade.pnl > 0 ? "pnl-pos" : trade.pnl < 0 ? "pnl-neg" : "pnl-neu";
  detailBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-row"><div class="detail-label">Data</div><div class="detail-val">${trade.date || "—"}</div></div>
      <div class="detail-row"><div class="detail-label">Instrument</div><div class="detail-val">${trade.instrument || "—"}</div></div>
      <div class="detail-row"><div class="detail-label">Kierunek</div><div class="detail-val"><span class="badge badge-${(trade.direction||"").toLowerCase()}">${trade.direction || "—"}</span></div></div>
      <div class="detail-row"><div class="detail-label">P&L</div><div class="detail-val ${pnlClass}">${fmt$(trade.pnl)}</div></div>
      <div class="detail-row"><div class="detail-label">Wejście</div><div class="detail-val">${trade.entry ?? "—"}</div></div>
      <div class="detail-row"><div class="detail-label">Stop Loss</div><div class="detail-val">${trade.sl ?? "—"}</div></div>
      <div class="detail-row"><div class="detail-label">Wyjście</div><div class="detail-val">${trade.exit ?? "—"}</div></div>
      <div class="detail-row"><div class="detail-label">Wielkość</div><div class="detail-val">${trade.size ?? "—"}</div></div>
      <div class="detail-row"><div class="detail-label">R:R</div><div class="detail-val">${trade.rr != null ? Number(trade.rr).toFixed(2) : "—"}</div></div>
      <div class="detail-row"><div class="detail-label">Emocje</div><div class="detail-val">${trade.emotions || "—"}</div></div>
    </div>
    ${trade.screenshot ? `<div class="detail-section"><div class="detail-section-title">Screenshot</div><a href="${trade.screenshot}" target="_blank" class="screenshot-link">📈 Otwórz wykres ↗</a></div>` : ""}
    ${trade.setup ? `<div class="detail-section"><div class="detail-section-title">Setup</div><div class="detail-text">${esc(trade.setup)}</div></div>` : ""}
    ${trade.notes ? `<div class="detail-section"><div class="detail-section-title">Przemyślenia</div><div class="detail-text">${esc(trade.notes)}</div></div>` : ""}
  `;
  detailModal.classList.remove("hidden");
}

detailEditBtn.addEventListener("click", () => {
  const t = trades.find(x => x.id === detailTradeId);
  if (t) { closeDetailModal(); openEditModal(t); }
});

detailDeleteBtn.addEventListener("click", async () => {
  if (!confirm("Usunąć ten trade?")) return;
  await deleteTrade(detailTradeId);
  closeDetailModal();
});

// ── RENDER TABLE ───────────────────────────────────────────────
function getFiltered() {
  const q   = document.getElementById("search-input").value.toLowerCase();
  const dir = document.getElementById("filter-dir").value;
  const res = document.getElementById("filter-result").value;
  const srt = document.getElementById("sort-col").value;

  let list = [...trades];
  if (q)   list = list.filter(t => [t.instrument, t.setup, t.notes, t.emotions].join(" ").toLowerCase().includes(q));
  if (dir) list = list.filter(t => t.direction === dir);
  if (res === "win")  list = list.filter(t => (t.pnl ?? 0) > 0);
  if (res === "loss") list = list.filter(t => (t.pnl ?? 0) <= 0);

  list.sort((a, b) => {
    if (srt === "date-asc")  return (a.date || "") > (b.date || "") ? 1 : -1;
    if (srt === "date-desc") return (a.date || "") < (b.date || "") ? 1 : -1;
    if (srt === "pnl-desc")  return (b.pnl || 0) - (a.pnl || 0);
    if (srt === "pnl-asc")   return (a.pnl || 0) - (b.pnl || 0);
    if (srt === "rr-desc")   return (b.rr  || 0) - (a.rr  || 0);
    return 0;
  });
  return list;
}

["search-input","filter-dir","filter-result","sort-col"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderTable);
});

function renderTable() {
  const tbody = document.getElementById("trades-tbody");
  const list  = getFiltered();
  tbody.innerHTML = "";
  tableEmpty.classList.toggle("hidden", list.length > 0);

  list.forEach((t, i) => {
    const pnlVal = t.pnl ?? null;
    const pnlCls = pnlVal > 0 ? "pnl-pos" : pnlVal < 0 ? "pnl-neg" : "pnl-neu";
    const dirCls = (t.direction || "").toLowerCase();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="color:var(--muted)">${i + 1}</td>
      <td>${t.date || "—"}</td>
      <td style="font-weight:500">${t.instrument || "—"}</td>
      <td><span class="badge badge-${dirCls}">${t.direction || "—"}</span></td>
      <td>${t.entry ?? "—"}</td>
      <td>${t.sl ?? "—"}</td>
      <td>${t.exit ?? "—"}</td>
      <td>${t.size ?? "—"}</td>
      <td class="${pnlCls}">${fmt$(pnlVal)}</td>
      <td>${t.rr != null ? Number(t.rr).toFixed(2) : "—"}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis">${t.setup ? t.setup.slice(0, 40) + (t.setup.length > 40 ? "…" : "") : "—"}</td>
      <td>${t.screenshot ? `<a href="${t.screenshot}" target="_blank" style="color:var(--accent);text-decoration:none" onclick="event.stopPropagation()">📈 Wykres</a>` : "—"}</td>
      <td><button class="action-btn del-btn" data-id="${t.id}" onclick="event.stopPropagation()">Usuń</button></td>
    `;
    tr.addEventListener("click", () => openDetail(t));
    tbody.appendChild(tr);
  });

  document.querySelectorAll(".del-btn").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      if (confirm("Usunąć?")) await deleteTrade(btn.dataset.id);
    });
  });
}

// ── STATS ──────────────────────────────────────────────────────
function computeStats(list) {
  const n     = list.length;
  const pnls  = list.map(t => t.pnl ?? 0);
  const total = pnls.reduce((a, b) => a + b, 0);
  const wins  = list.filter(t => (t.pnl ?? 0) > 0);
  const losses= list.filter(t => (t.pnl ?? 0) < 0);
  const wr    = n ? wins.length / n : 0;
  const avgWin  = wins.length   ? wins.reduce((a, t) => a + t.pnl, 0)   / wins.length   : 0;
  const avgLoss = losses.length ? losses.reduce((a, t) => a + t.pnl, 0) / losses.length : 0;
  const grossWin  = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const pf   = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const rrs  = list.filter(t => t.rr != null).map(t => t.rr);
  const avgRr = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
  const best  = list.reduce((a, t) => (t.pnl ?? -Infinity) > (a?.pnl ?? -Infinity) ? t : a, null);
  const worst = list.reduce((a, t) => (t.pnl ?? Infinity)  < (a?.pnl ?? Infinity)  ? t : a, null);

  const longs  = list.filter(t => t.direction === "Long");
  const shorts = list.filter(t => t.direction === "Short");

  return { n, total, wr, wins, losses, avgWin, avgLoss, grossWin, grossLoss, pf, avgRr, best, worst, rrs, longs, shorts };
}

function renderDashboard() {
  const s = computeStats(trades);
  const pnlCls = s.total >= 0 ? "pos" : "neg";

  set("s-total-pnl",   fmt$(s.total), pnlCls);
  set("s-total-pnl-pct", `${s.n} transakcji`);
  set("s-winrate",     `${(s.wr * 100).toFixed(1)}%`, s.wr >= 0.5 ? "pos" : "neg");
  set("s-wl",         `${s.wins.length}W / ${s.losses.length}L`);
  set("s-rr",          s.avgRr.toFixed(2));
  set("s-pf",          isFinite(s.pf) ? s.pf.toFixed(2) : "∞", s.pf >= 1 ? "pos" : "neg");
  set("s-pf-sub",     `${fmt$(s.grossWin)} / ${fmt$(s.grossLoss)}`);
  set("s-best",        fmt$(s.best?.pnl ?? 0), "pos");
  set("s-best-inst",   s.best?.instrument || "—");
  set("s-worst",       fmt$(s.worst?.pnl ?? 0), "neg");
  set("s-worst-inst",  s.worst?.instrument || "—");
  set("s-avg-win",     fmt$(s.avgWin),  "pos");
  set("s-avg-loss",    fmt$(s.avgLoss), "neg");
}

function renderStatsTab() {
  const s  = computeStats(trades);
  const lS = computeStats(s.longs);
  const sS = computeStats(s.shorts);

  setText("d-count",     s.n);
  setText("d-wr",        `${(s.wr * 100).toFixed(1)}%`);
  setText("d-pf",        isFinite(s.pf) ? s.pf.toFixed(2) : "∞");
  setText("d-pnl",       fmt$(s.total));
  setText("d-avg-pnl",   fmt$(s.n ? s.total / s.n : 0));
  setText("d-rr",        s.avgRr.toFixed(2));
  setText("d-best-rr",   s.rrs.length ? Math.max(...s.rrs).toFixed(2) : "—");
  setText("d-worst-rr",  s.rrs.length ? Math.min(...s.rrs).toFixed(2) : "—");
  setText("d-avg-win",   fmt$(s.avgWin));
  setText("d-avg-loss",  fmt$(s.avgLoss));
  setText("d-long-count",  lS.n);
  setText("d-long-wr",     `${(lS.wr * 100).toFixed(1)}%`);
  setText("d-long-pnl",    fmt$(lS.total));
  setText("d-short-count", sS.n);
  setText("d-short-wr",    `${(sS.wr * 100).toFixed(1)}%`);
  setText("d-short-pnl",   fmt$(sS.total));

  // Setup breakdown
  const setupMap = {};
  trades.forEach(t => {
    const key = (t.setup || "Brak").split("\n")[0].slice(0, 40) || "Brak";
    if (!setupMap[key]) setupMap[key] = { count: 0, pnl: 0, wins: 0 };
    setupMap[key].count++;
    setupMap[key].pnl  += t.pnl ?? 0;
    if ((t.pnl ?? 0) > 0) setupMap[key].wins++;
  });
  const setupBlock = document.getElementById("setup-stats-body");
  setupBlock.innerHTML = Object.entries(setupMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([k, v]) => `
      <div class="stats-row">
        <span style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${k}</span>
        <span>${v.count} trd · ${fmt$(v.pnl)}</span>
      </div>`)
    .join("") || `<div class="stats-row"><span style="color:var(--muted)">Brak danych</span></div>`;
}

// ── CHARTS ─────────────────────────────────────────────────────
let chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function renderCharts() {
  renderEquityChart();
  renderDirectionChart();
  renderPnlBarChart();
  renderSetupChart();
  renderMonthlyChart();
}

function renderEquityChart() {
  destroyChart("equity");
  const sorted = [...trades].sort((a, b) => (a.date || "") > (b.date || "") ? 1 : -1);
  let cum = 0;
  const labels = sorted.map(t => t.date || "?");
  const data   = sorted.map(t => { cum += t.pnl ?? 0; return +cum.toFixed(2); });

  const ctx = document.getElementById("equity-chart");
  if (!ctx) return;
  chartInstances["equity"] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Equity",
        data,
        borderColor: "#4f8ef7",
        backgroundColor: "rgba(79,142,247,0.08)",
        borderWidth: 2,
        pointRadius: data.length < 30 ? 4 : 0,
        tension: 0.35,
        fill: true,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt$(c.raw) } } },
      scales: {
        x: { ticks: { color: "#636880", font: { family: "'IBM Plex Mono'" }, maxTicksLimit: 8 }, grid: { color: "rgba(255,255,255,0.04)" } },
        y: { ticks: { color: "#636880", font: { family: "'IBM Plex Mono'" }, callback: v => fmt$(v) }, grid: { color: "rgba(255,255,255,0.04)" } }
      }
    }
  });
}

function renderDirectionChart() {
  destroyChart("direction");
  const longs  = trades.filter(t => t.direction === "Long");
  const shorts = trades.filter(t => t.direction === "Short");
  const lPnl   = longs.reduce((a, t) => a + (t.pnl ?? 0), 0);
  const sPnl   = shorts.reduce((a, t) => a + (t.pnl ?? 0), 0);

  const ctx = document.getElementById("direction-chart");
  if (!ctx) return;
  chartInstances["direction"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [`Long (${longs.length})`, `Short (${shorts.length})`],
      datasets: [{ data: [longs.length, shorts.length], backgroundColor: ["#1fc87a", "#f25252"], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `${c.label} · P&L: ${fmt$(c.datasetIndex === 0 ? lPnl : sPnl)}` } }
      }
    }
  });
  // Custom legend below
  const box = ctx.closest(".chart-box");
  let leg = box.querySelector(".custom-legend");
  if (!leg) { leg = document.createElement("div"); leg.className = "custom-legend"; box.appendChild(leg); }
  leg.style.cssText = "display:flex;gap:16px;margin-top:10px;font-size:11px;color:#636880;justify-content:center";
  leg.innerHTML = `
    <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:#1fc87a;display:inline-block"></span>Long ${longs.length} · ${fmt$(lPnl)}</span>
    <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:#f25252;display:inline-block"></span>Short ${shorts.length} · ${fmt$(sPnl)}</span>
  `;
}

function renderPnlBarChart() {
  destroyChart("pnl-bar");
  const sorted = [...trades].sort((a, b) => (a.date || "") > (b.date || "") ? 1 : -1).slice(-30);
  const ctx = document.getElementById("pnl-bar-chart");
  if (!ctx) return;
  chartInstances["pnl-bar"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(t => t.instrument || t.date || "?"),
      datasets: [{
        data: sorted.map(t => +(t.pnl ?? 0).toFixed(2)),
        backgroundColor: sorted.map(t => (t.pnl ?? 0) >= 0 ? "rgba(31,200,122,0.7)" : "rgba(242,82,82,0.7)"),
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt$(c.raw) } } },
      scales: {
        x: { ticks: { color: "#636880", font: { family: "'IBM Plex Mono'", size: 10 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 15 }, grid: { display: false } },
        y: { ticks: { color: "#636880", font: { family: "'IBM Plex Mono'" }, callback: v => fmt$(v) }, grid: { color: "rgba(255,255,255,0.04)" } }
      }
    }
  });
}

function renderSetupChart() {
  destroyChart("setup");
  const setupMap = {};
  trades.forEach(t => {
    const key = (t.setup || "Brak").split("\n")[0].split(":")[0].slice(0, 25).trim() || "Brak";
    setupMap[key] = (setupMap[key] || 0) + 1;
  });
  const entries = Object.entries(setupMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const ctx = document.getElementById("setup-chart");
  if (!ctx) return;
  const colors = ["#4f8ef7","#1fc87a","#f5a623","#f25252","#a78bfa","#38bdf8","#fb923c","#34d399"];
  chartInstances["setup"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: entries.map(e => e[0]),
      datasets: [{ data: entries.map(e => e[1]), backgroundColor: colors.slice(0, entries.length), borderRadius: 4 }]
    },
    options: {
      indexAxis: "y",
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#636880", font: { family: "'IBM Plex Mono'" } }, grid: { color: "rgba(255,255,255,0.04)" } },
        y: { ticks: { color: "#636880", font: { family: "'IBM Plex Mono'", size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function renderMonthlyChart() {
  destroyChart("monthly");
  const monthly = {};
  trades.forEach(t => {
    if (!t.date) return;
    const m = t.date.slice(0, 7);
    monthly[m] = (monthly[m] || 0) + (t.pnl ?? 0);
  });
  const keys = Object.keys(monthly).sort();
  const ctx  = document.getElementById("monthly-chart");
  if (!ctx) return;
  chartInstances["monthly"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: keys,
      datasets: [{
        data: keys.map(k => +monthly[k].toFixed(2)),
        backgroundColor: keys.map(k => monthly[k] >= 0 ? "rgba(31,200,122,0.7)" : "rgba(242,82,82,0.7)"),
        borderRadius: 5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt$(c.raw) } } },
      scales: {
        x: { ticks: { color: "#636880", font: { family: "'IBM Plex Mono'" } }, grid: { display: false } },
        y: { ticks: { color: "#636880", font: { family: "'IBM Plex Mono'" }, callback: v => fmt$(v) }, grid: { color: "rgba(255,255,255,0.04)" } }
      }
    }
  });
}

// ── EXPORT CSV ─────────────────────────────────────────────────
exportCsvBtn.addEventListener("click", () => {
  const cols = ["date","instrument","direction","entry","sl","exit","size","pnl","rr","setup","emotions","notes","screenshot"];
  const rows = [cols.join(",")];
  getFiltered().forEach(t => {
    rows.push(cols.map(c => {
      const v = t[c] ?? "";
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(","));
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `trading_journal_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
});

// ── HELPERS ────────────────────────────────────────────────────
function fmt$(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const n = +v;
  return (n >= 0 ? "$" : "-$") + Math.abs(n).toFixed(2);
}

function set(id, text, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = "stat-val" + (cls ? " " + cls : "");
}
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function clearForm() {
  [fDate, fInstrument, fEntry, fSl, fExit, fSize, fPnl, fRr, fSetup, fEmotions, fScreenshot, fNotes]
    .forEach(el => el.value = "");
  fDirection.value = "Long";
  calcPreview.innerHTML = "";
}

// ── RENDER ALL ─────────────────────────────────────────────────
function renderAll() {
  renderDashboard();
  renderTable();
  renderStatsTab();
  renderCharts();
}

// ── LOAD CHART.JS ──────────────────────────────────────────────
const chartScript = document.createElement("script");
chartScript.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
chartScript.onload = () => { /* charts render on data load */ };
document.head.appendChild(chartScript);
