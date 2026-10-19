const KEY = "fucking_gold_trades_v1";
const TOTAL = 30;
const QUESTIONS = [
  "Monthly PD Arrays checked",
  "Monthly bias identified",
  "Weekly PD Arrays checked",
  "Weekly bias identified",
  "Daily bias identified",
  "1H bias confirmed",
  "Sessional bias identified",
  "Dollar (DXY) checked for confluence",
  "5M terminal liquidity (L3) identified",
  "Required liquidity swept",
  "3M FVG identified",
  "3M candle body fully breaks beyond/across the FVG",
  "Entry taken on the next candle",
  "Stop loss placed correctly",
  "Fixed 1:2 risk-to-reward followed"
];
const FIELDS = ["date", "session", "entry", "sl", "tp", "lot", "result", "pnl", "notes"];

let trades = load();
let current = null;

const $ = (id) => document.getElementById(id);
const form = $("form");
const pad = (n) => String(n).padStart(2, "0");

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    return d && typeof d === "object" && !Array.isArray(d) ? d : {};
  } catch (e) { return {}; }
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(trades)); return true; }
  catch (e) { say("Could not save to browser storage.", true); return false; }
}
function status(n) {
  const t = trades[n];
  if (!t || !t.saved) return "Not Started";
  return t.result === "No Trade" ? "No Trade" : "Saved";
}

/* ---------- Build UI ---------- */
function buildChecklist() {
  $("checklist").innerHTML = QUESTIONS.map((q, i) => `
    <li><span>${q}</span>
      <div class="opts">
        <label class="pill"><input type="radio" name="q${i + 1}" value="yes"><b>YES</b></label>
        <label class="pill"><input type="radio" name="q${i + 1}" value="no"><b>NO</b></label>
      </div></li>`).join("");
}

function renderGrid() {
  let done = 0;
  $("grid").innerHTML = "";
  for (let n = 1; n <= TOTAL; n++) {
    const s = status(n);
    if (s !== "Not Started") done++;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "slot" + (s === "Saved" ? " saved" : s === "No Trade" ? " notrade" : "") + (n === current ? " active" : "");
    b.innerHTML = `<b>Trade ${pad(n)}</b><small>${s}</small>`;
    b.addEventListener("click", () => openTrade(n));
    $("grid").appendChild(b);
  }
  $("progress").textContent = `${done} / ${TOTAL} Trades Recorded`;
}

/* ---------- Form helpers ---------- */
function say(text, isErr) {
  $("msg").textContent = text;
  $("msg").className = "msg" + (isErr ? " err" : "");
}
function setLocked(locked) {
  [...form.elements].forEach((el) => { el.disabled = locked; });
  $("saveBtn").disabled = locked;
  $("saveChecklistBtn").disabled = locked;
  $("editBtn").disabled = !locked;
}
function checked(name) {
  const r = form.querySelector(`input[name="${name}"]:checked`);
  return r ? r.value : "";
}
function updateAlerts() {
  let html = "";
  if (checked("q10") === "no") html += `<div class="warn">NO ENTRY — LIQUIDITY PENDING</div>`;
  if (checked("q12") === "no") html += `<div class="warn">NO ENTRY — 3M FVG FULL-BREAK REQUIRED</div>`;
  $("alerts").innerHTML = html;
}

function fillForm(n) {
  const t = trades[n] || {};
  form.reset();
  QUESTIONS.forEach((_, i) => {
    const v = t.checks && t.checks[i + 1];
    if (v) form.querySelector(`input[name="q${i + 1}"][value="${v}"]`).checked = true;
  });
  FIELDS.forEach((f) => { form.elements[f].value = t[f] || ""; });
  if (t.rules) form.querySelector(`input[name="rules"][value="${t.rules}"]`).checked = true;
  updateAlerts();
  setLocked(!!t.saved);
}

function collect(checklistOnly) {
  const old = trades[current] || {};
  const data = Object.assign({}, old);
  data.checks = {};
  QUESTIONS.forEach((_, i) => {
    const v = checked("q" + (i + 1));
    if (v) data.checks[i + 1] = v;
  });
  if (!checklistOnly) {
    FIELDS.forEach((f) => { data[f] = form.elements[f].value; });
    data.rules = checked("rules");
  }
  data.saved = true;
  return data;
}

/* ---------- Actions ---------- */
function openTrade(n) {
  current = n;
  $("panelTitle").textContent = `Trade ${pad(n)}`;
  $("panel").hidden = false;
  fillForm(n);
  say("");
  renderGrid();
  $("panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function save(checklistOnly) {
  if (!current) return;
  trades[current] = collect(checklistOnly);
  if (!persist()) return;
  setLocked(true);
  renderGrid();
  say(checklistOnly ? "Checklist saved." : `Trade ${pad(current)} saved.`);
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(trades, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fucking-gold-trades.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      if (!d || typeof d !== "object" || Array.isArray(d)) throw new Error();
      const clean = {};
      for (let n = 1; n <= TOTAL; n++) if (d[n] && typeof d[n] === "object") clean[n] = d[n];
      if (!confirm("Replace all current records with the imported file?")) return;
      trades = clean;
      persist();
      current = null;
      $("panel").hidden = true;
      renderGrid();
    } catch (e) {
      alert("Import failed: not a valid backup file.");
    }
  };
  reader.readAsText(file);
}

/* ---------- Events ---------- */
form.addEventListener("change", updateAlerts);
$("saveChecklistBtn").addEventListener("click", () => save(true));
$("saveBtn").addEventListener("click", () => save(false));
$("editBtn").addEventListener("click", () => { setLocked(false); say("Editing. Save when done."); });
$("closeBtn").addEventListener("click", () => { current = null; $("panel").hidden = true; renderGrid(); });
$("exportBtn").addEventListener("click", exportJSON);
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", (e) => {
  if (e.target.files[0]) importJSON(e.target.files[0]);
  e.target.value = "";
});

buildChecklist();
renderGrid();
