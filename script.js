/* =========================================================
   coupletote.com — Sales Admin
   All data lives in localStorage. No backend, no network calls.
   ========================================================= */

const STORAGE_KEY = "coupletote_sales_reports_v1";
const PASS_KEY = "coupletote_admin_pass_v1";
const SESSION_KEY = "coupletote_admin_unlocked_v1";

const CURRENCY = "₹";

/* ---------- tiny helpers ---------- */
const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => `${CURRENCY}${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const uid = () => `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 2400);
}

/* A small non-cryptographic hash so we don't store the passcode in
   plain text. This is a convenience lock, not real security — anyone
   with access to this browser's devtools can bypass it. */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return `h${h}`;
}

/* =========================================================
   Storage layer
   ========================================================= */
function getReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Could not read reports from storage", e);
    return [];
  }
}

function saveReports(reports) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

/* =========================================================
   Lock screen
   ========================================================= */
function initLock() {
  const hasPass = !!localStorage.getItem(PASS_KEY);
  $("lockSetup").classList.toggle("hidden", hasPass);
  $("lockEnter").classList.toggle("hidden", !hasPass);

  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    showApp();
    return;
  }

  $("setupBtn").addEventListener("click", () => {
    const val = $("setupPass").value.trim();
    if (val.length < 4) {
      toast("Use at least 4 characters.");
      return;
    }
    localStorage.setItem(PASS_KEY, simpleHash(val));
    sessionStorage.setItem(SESSION_KEY, "1");
    showApp();
  });

  $("enterBtn").addEventListener("click", attemptUnlock);
  $("enterPass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") attemptUnlock();
  });

  $("resetPassBtn").addEventListener("click", () => {
    if (confirm("Reset your passcode? Your saved sales reports will NOT be deleted.")) {
      localStorage.removeItem(PASS_KEY);
      initLock();
    }
  });

  $("lockBtn").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

function attemptUnlock() {
  const val = $("enterPass").value;
  const stored = localStorage.getItem(PASS_KEY);
  if (simpleHash(val) === stored) {
    sessionStorage.setItem(SESSION_KEY, "1");
    $("lockError").classList.add("hidden");
    showApp();
  } else {
    $("lockError").classList.remove("hidden");
  }
}

function showApp() {
  $("lockScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  renderAll();
}

/* =========================================================
   Form: live result preview
   ========================================================= */
function updateResultPreview() {
  const sales = parseFloat($("totalSales").value);
  const cost = parseFloat($("totalCost").value);
  const el = $("resultValue");
  const wrap = $("resultPreview");

  if (isNaN(sales) || isNaN(cost)) {
    el.textContent = "Enter sales and cost above";
    el.className = "result-value";
    return;
  }
  const diff = sales - cost;
  el.classList.remove("is-gain", "is-loss");
  if (diff >= 0) {
    el.textContent = `Gain of ${fmtMoney(diff)}`;
    el.classList.add("is-gain");
  } else {
    el.textContent = `Loss of ${fmtMoney(Math.abs(diff))}`;
    el.classList.add("is-loss");
  }
}

/* =========================================================
   Form: submit / edit
   ========================================================= */
function handleSubmit(e) {
  e.preventDefault();

  const id = $("editId").value;
  const sales = parseFloat($("totalSales").value);
  const cost = parseFloat($("totalCost").value);

  if (isNaN(sales) || sales < 0 || isNaN(cost) || cost < 0) {
    toast("Sales and cost must be valid, non-negative numbers.");
    return;
  }

  const entry = {
    id: id || uid(),
    type: $("periodType").value,
    label: $("periodLabel").value.trim(),
    sales,
    cost,
    result: +(sales - cost).toFixed(2),
    notes: $("notes").value.trim(),
    createdAt: id ? undefined : new Date().toISOString(),
  };

  let reports = getReports();

  if (id) {
    reports = reports.map((r) => (r.id === id ? { ...r, ...entry, createdAt: r.createdAt } : r));
    toast("Report updated.");
  } else {
    reports.push(entry);
    toast("Report saved.");
  }

  saveReports(reports);
  resetForm();
  renderAll();
}

function resetForm() {
  $("entryForm").reset();
  $("editId").value = "";
  $("submitBtn").textContent = "Save report";
  $("cancelEditBtn").classList.add("hidden");
  updateResultPreview();
}

function startEdit(id) {
  const r = getReports().find((x) => x.id === id);
  if (!r) return;
  $("editId").value = r.id;
  $("periodType").value = r.type;
  $("periodLabel").value = r.label;
  $("totalSales").value = r.sales;
  $("totalCost").value = r.cost;
  $("notes").value = r.notes || "";
  $("submitBtn").textContent = "Update report";
  $("cancelEditBtn").classList.remove("hidden");
  updateResultPreview();
  document.querySelector(".card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteReport(id) {
  if (!confirm("Delete this report? This can't be undone.")) return;
  const reports = getReports().filter((r) => r.id !== id);
  saveReports(reports);
  renderAll();
  toast("Report deleted.");
}

/* =========================================================
   Rendering: summary cards
   ========================================================= */
function renderSummary(reports) {
  const totalSales = reports.reduce((sum, r) => sum + r.sales, 0);
  const totalResult = reports.reduce((sum, r) => sum + r.result, 0);

  $("statTotalSales").textContent = fmtMoney(totalSales);
  $("statPeriodCount").textContent = `${reports.length} report${reports.length === 1 ? "" : "s"} logged`;

  const netEl = $("statNet");
  netEl.textContent = fmtMoney(Math.abs(totalResult));
  netEl.classList.remove("stat-positive", "stat-negative");
  if (reports.length === 0) {
    netEl.textContent = "₹0";
    $("statNetSub").textContent = "No data yet";
  } else if (totalResult >= 0) {
    netEl.classList.add("stat-positive");
    $("statNetSub").textContent = "Net gain across all reports";
  } else {
    netEl.classList.add("stat-negative");
    $("statNetSub").textContent = "Net loss across all reports";
  }

  if (reports.length === 0) {
    $("statBest").textContent = "—";
    $("statBestSub").innerHTML = "&nbsp;";
    $("statWorst").textContent = "—";
    $("statWorstSub").innerHTML = "&nbsp;";
    return;
  }

  const best = reports.reduce((a, b) => (b.result > a.result ? b : a));
  const worst = reports.reduce((a, b) => (b.result < a.result ? b : a));

  $("statBest").textContent = best.label;
  $("statBestSub").textContent = `+${fmtMoney(best.result)}`;
  $("statWorst").textContent = worst.label;
  $("statWorstSub").textContent = worst.result < 0 ? `-${fmtMoney(Math.abs(worst.result))}` : fmtMoney(worst.result);
}

/* =========================================================
   Rendering: chart (pure CSS bars, last 8 entries in entry order)
   ========================================================= */
function renderChart(reports) {
  const wrap = $("chartWrap");
  if (reports.length === 0) {
    wrap.innerHTML = `<p class="empty-note">Your last few reports will appear here as a chart once you've logged some data.</p>`;
    return;
  }

  const recent = reports.slice(-8);
  const maxVal = Math.max(1, ...recent.map((r) => Math.max(r.sales, Math.abs(r.result))));

  wrap.innerHTML = "";
  wrap.className = "chart-wrap";

  recent.forEach((r) => {
    const col = document.createElement("div");
    col.className = "chart-col";

    const bars = document.createElement("div");
    bars.className = "chart-bars";

    const salesBar = document.createElement("div");
    salesBar.className = "bar bar-sales";
    salesBar.style.height = `${Math.max(3, (r.sales / maxVal) * 150)}px`;
    salesBar.title = `Sales: ${fmtMoney(r.sales)}`;

    const resultBar = document.createElement("div");
    resultBar.className = `bar ${r.result >= 0 ? "bar-gain" : "bar-loss"}`;
    resultBar.style.height = `${Math.max(3, (Math.abs(r.result) / maxVal) * 150)}px`;
    resultBar.title = `${r.result >= 0 ? "Gain" : "Loss"}: ${fmtMoney(Math.abs(r.result))}`;

    bars.appendChild(salesBar);
    bars.appendChild(resultBar);

    const label = document.createElement("p");
    label.className = "chart-col-label";
    label.textContent = r.label;

    col.appendChild(bars);
    col.appendChild(label);
    wrap.appendChild(col);
  });
}

/* =========================================================
   Rendering: table
   ========================================================= */
function renderTable(reports) {
  const body = $("reportTableBody");
  const empty = $("tableEmpty");
  body.innerHTML = "";

  if (reports.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  // newest first
  [...reports].reverse().forEach((r) => {
    const tr = document.createElement("tr");

    const isGain = r.result >= 0;
    tr.innerHTML = `
      <td>${escapeHtml(r.label)}</td>
      <td><span class="pill pill-${r.type.toLowerCase()}">${r.type}</span></td>
      <td class="num">${fmtMoney(r.sales)}</td>
      <td class="num">${fmtMoney(r.cost)}</td>
      <td class="num result-cell ${isGain ? "is-gain" : "is-loss"}">${isGain ? "+" : "-"}${fmtMoney(Math.abs(r.result))}</td>
      <td class="notes-cell" title="${escapeHtml(r.notes || "")}">${escapeHtml(r.notes || "—")}</td>
      <td class="actions-col">
        <div class="row-actions">
          <button class="row-btn" data-edit="${r.id}">Edit</button>
          <button class="row-btn row-btn--danger" data-delete="${r.id}">Delete</button>
        </div>
      </td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => startEdit(btn.dataset.edit))
  );
  body.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => deleteReport(btn.dataset.delete))
  );
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* =========================================================
   Filter + master render
   ========================================================= */
function getFilteredReports() {
  const filter = $("filterType").value;
  const all = getReports();
  if (filter === "All") return all;
  return all.filter((r) => r.type === filter);
}

function renderAll() {
  const reports = getFilteredReports();
  renderSummary(reports);
  renderChart(reports);
  renderTable(reports);
}

/* =========================================================
   Export / backup / restore
   ========================================================= */
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const reports = getFilteredReports();
  if (reports.length === 0) {
    toast("No reports to export.");
    return;
  }
  const header = ["Period", "Type", "Total Sales", "Total Cost", "Result", "Notes"];
  const rows = reports.map((r) => [
    r.label,
    r.type,
    r.sales.toFixed(2),
    r.cost.toFixed(2),
    (r.result >= 0 ? "" : "-") + Math.abs(r.result).toFixed(2),
    (r.notes || "").replace(/"/g, '""'),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  downloadFile(`coupletote-sales-${todayStamp()}.csv`, csv, "text/csv");
  toast("CSV exported.");
}

function downloadBackup() {
  const data = {
    exportedAt: new Date().toISOString(),
    reports: getReports(),
  };
  downloadFile(`coupletote-backup-${todayStamp()}.json`, JSON.stringify(data, null, 2), "application/json");
  toast("Backup downloaded.");
}

function restoreBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.reports;
      if (!Array.isArray(incoming)) throw new Error("Invalid file");

      const existing = getReports();
      const existingIds = new Set(existing.map((r) => r.id));
      const merged = [...existing];
      let added = 0;
      incoming.forEach((r) => {
        if (r && r.id && !existingIds.has(r.id)) {
          merged.push(r);
          added++;
        }
      });
      saveReports(merged);
      renderAll();
      toast(`Restored ${added} report${added === 1 ? "" : "s"} from backup.`);
    } catch (e) {
      toast("Couldn't read that backup file.");
    }
  };
  reader.readAsText(file);
}

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* =========================================================
   Section nav (Sales Reports <-> Bag Profitability)
   ========================================================= */
function initSectionNav() {
  document.querySelectorAll(".section-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".section-nav-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const target = btn.dataset.section;
      $("salesPane").classList.toggle("hidden", target !== "salesPane");
      $("bagsPane").classList.toggle("hidden", target !== "bagsPane");
      if (target === "bagsPane") renderBagsAll();
    });
  });

  document.querySelectorAll(".subtab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".subtab-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const target = btn.dataset.subtab;
      $("bagListPane").classList.toggle("hidden", target !== "bagListPane");
      $("feeSettingsPane").classList.toggle("hidden", target !== "feeSettingsPane");
    });
  });
}

/* =========================================================
   Bag Profitability — storage
   ========================================================= */
const BAGS_KEY = "coupletote_bags_v1";
const FEES_KEY = "coupletote_bag_fees_v1";
const DEFAULT_FEES = { gst: 18, fixed: 400, ship: 200, markup: 1.5 };

function getFees() {
  try {
    const raw = localStorage.getItem(FEES_KEY);
    return raw ? { ...DEFAULT_FEES, ...JSON.parse(raw) } : { ...DEFAULT_FEES };
  } catch (e) {
    return { ...DEFAULT_FEES };
  }
}

function saveFees(fees) {
  localStorage.setItem(FEES_KEY, JSON.stringify(fees));
}

function getBags() {
  try {
    const raw = localStorage.getItem(BAGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Could not read bags from storage", e);
    return [];
  }
}

function saveBags(bags) {
  localStorage.setItem(BAGS_KEY, JSON.stringify(bags));
}

/* =========================================================
   Bag Profitability — calculation
   Purchase -> + GST% -> + fixed fee -> + shipping/gateway fee
   -> All-in cost -> Selling price (all-in cost x markup)
   -> Profit = Selling price - All-in cost
   ========================================================= */
function calcBag(purchase, fees) {
  const gstAmt = +(purchase * (fees.gst / 100)).toFixed(2);
  const allInCost = +(purchase + gstAmt + fees.fixed + fees.ship).toFixed(2);
  const sellingPrice = +(allInCost * fees.markup).toFixed(2);
  const profit = +(sellingPrice - allInCost).toFixed(2);
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  return { gstAmt, allInCost, sellingPrice, profit, margin };
}

/* =========================================================
   Bag Profitability — live preview + form
   ========================================================= */
function updateBagResultPreview() {
  const purchase = parseFloat($("bagPurchase").value);
  const el = $("bagResultValue");
  if (isNaN(purchase) || purchase < 0) {
    el.textContent = "Enter a purchase rate above";
    el.className = "result-value";
    return;
  }
  const fees = getFees();
  const { allInCost, sellingPrice, profit } = calcBag(purchase, fees);
  el.className = "result-value is-gain";
  el.textContent = `Sell at ${fmtMoney(sellingPrice)} → profit ${fmtMoney(profit)} (all-in cost ${fmtMoney(allInCost)})`;
}

function handleBagSubmit(e) {
  e.preventDefault();
  const id = $("bagEditId").value;
  const name = $("bagName").value.trim();
  const purchase = parseFloat($("bagPurchase").value);

  if (!name || isNaN(purchase) || purchase < 0) {
    toast("Enter a bag name and a valid purchase rate.");
    return;
  }

  let bags = getBags();
  if (id) {
    bags = bags.map((b) => (b.id === id ? { ...b, name, purchase } : b));
    toast("Bag updated.");
  } else {
    bags.push({ id: uid(), name, purchase, createdAt: new Date().toISOString() });
    toast("Bag saved.");
  }
  saveBags(bags);
  resetBagForm();
  renderBagsAll();
}

function resetBagForm() {
  $("bagForm").reset();
  $("bagEditId").value = "";
  $("bagSubmitBtn").textContent = "Save bag";
  $("bagCancelEditBtn").classList.add("hidden");
  updateBagResultPreview();
}

function startBagEdit(id) {
  const b = getBags().find((x) => x.id === id);
  if (!b) return;
  $("bagEditId").value = b.id;
  $("bagName").value = b.name;
  $("bagPurchase").value = b.purchase;
  $("bagSubmitBtn").textContent = "Update bag";
  $("bagCancelEditBtn").classList.remove("hidden");
  updateBagResultPreview();
  $("bagListPane").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteBag(id) {
  if (!confirm("Delete this bag? This can't be undone.")) return;
  saveBags(getBags().filter((b) => b.id !== id));
  renderBagsAll();
  toast("Bag deleted.");
}

/* =========================================================
   Bag Profitability — rendering
   ========================================================= */
function renderDerivationCard(fees) {
  $("derivGstRate").textContent = fees.gst;
  $("derivGstRate2").textContent = fees.gst;
  $("derivFixed").textContent = `${fmtMoney(fees.fixed)} flat`;
  $("derivShip").textContent = `${fmtMoney(fees.ship)} flat`;
  $("derivMarkup").textContent = fees.markup;
}

function renderBagSummary(bags, fees) {
  const totalCost = bags.reduce((s, b) => s + calcBag(b.purchase, fees).allInCost, 0);
  const totalSelling = bags.reduce((s, b) => s + calcBag(b.purchase, fees).sellingPrice, 0);
  const totalProfit = totalSelling - totalCost;
  const margin = totalSelling > 0 ? (totalProfit / totalSelling) * 100 : 0;

  $("bagStatCount").textContent = bags.length;
  $("bagStatCost").textContent = fmtMoney(totalCost);
  $("bagStatSelling").textContent = fmtMoney(totalSelling);
  $("bagStatProfit").textContent = fmtMoney(totalProfit);
  $("bagStatMargin").textContent = bags.length ? `~${margin.toFixed(1)}% margin` : "No bags yet";
}

function renderBagTable(bags, fees) {
  const body = $("bagTableBody");
  const empty = $("bagTableEmpty");
  body.innerHTML = "";

  if (bags.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  [...bags].reverse().forEach((b) => {
    const c = calcBag(b.purchase, fees);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(b.name)}</td>
      <td class="num">${fmtMoney(b.purchase)}</td>
      <td class="num">${fmtMoney(c.gstAmt)}</td>
      <td class="num">${fmtMoney(fees.fixed)}</td>
      <td class="num">${fmtMoney(fees.ship)}</td>
      <td class="num">${fmtMoney(c.allInCost)}</td>
      <td class="num">${fmtMoney(c.sellingPrice)}</td>
      <td class="num result-cell is-gain">+${fmtMoney(c.profit)}</td>
      <td class="num">${c.margin.toFixed(1)}%</td>
      <td class="actions-col">
        <div class="row-actions">
          <button class="row-btn" data-bag-edit="${b.id}">Edit</button>
          <button class="row-btn row-btn--danger" data-bag-delete="${b.id}">Delete</button>
        </div>
      </td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll("[data-bag-edit]").forEach((btn) =>
    btn.addEventListener("click", () => startBagEdit(btn.dataset.bagEdit))
  );
  body.querySelectorAll("[data-bag-delete]").forEach((btn) =>
    btn.addEventListener("click", () => deleteBag(btn.dataset.bagDelete))
  );
}

function renderBagsAll() {
  const fees = getFees();
  const bags = getBags();
  renderDerivationCard(fees);
  renderBagSummary(bags, fees);
  renderBagTable(bags, fees);
}

function loadFeeForm() {
  const fees = getFees();
  $("feeGst").value = fees.gst;
  $("feeFixed").value = fees.fixed;
  $("feeShip").value = fees.ship;
  $("feeMarkup").value = fees.markup;
}

function handleFeeSubmit(e) {
  e.preventDefault();
  const gst = parseFloat($("feeGst").value);
  const fixed = parseFloat($("feeFixed").value);
  const ship = parseFloat($("feeShip").value);
  const markup = parseFloat($("feeMarkup").value);

  if ([gst, fixed, ship, markup].some((v) => isNaN(v) || v < 0) || markup < 1) {
    toast("Check the fee settings — all values must be valid numbers (markup at least 1).");
    return;
  }
  saveFees({ gst, fixed, ship, markup });
  toast("Fee settings saved. Bag list recalculated.");
  renderBagsAll();
  updateBagResultPreview();
}

function initBagProfitability() {
  loadFeeForm();
  $("bagForm").addEventListener("submit", handleBagSubmit);
  $("bagPurchase").addEventListener("input", updateBagResultPreview);
  $("bagCancelEditBtn").addEventListener("click", resetBagForm);
  $("feeForm").addEventListener("submit", handleFeeSubmit);
  $("bagClearAllBtn").addEventListener("click", () => {
    if (confirm("Erase ALL saved bag data from this browser? This cannot be undone.")) {
      localStorage.removeItem(BAGS_KEY);
      renderBagsAll();
      toast("All bag data erased.");
    }
  });
  renderBagsAll();
}

/* =========================================================
   Wire up
   ========================================================= */
function initApp() {
  $("entryForm").addEventListener("submit", handleSubmit);
  $("totalSales").addEventListener("input", updateResultPreview);
  $("totalCost").addEventListener("input", updateResultPreview);
  $("cancelEditBtn").addEventListener("click", resetForm);
  $("filterType").addEventListener("change", renderAll);
  $("exportBtn").addEventListener("click", exportCSV);
  $("backupBtn").addEventListener("click", downloadBackup);
  $("restoreInput").addEventListener("change", (e) => {
    if (e.target.files[0]) restoreBackup(e.target.files[0]);
    e.target.value = "";
  });
  $("clearAllBtn").addEventListener("click", () => {
    if (confirm("Erase ALL saved sales reports from this browser? This cannot be undone. Consider downloading a backup first.")) {
      localStorage.removeItem(STORAGE_KEY);
      renderAll();
      toast("All report data erased.");
    }
  });

  initSectionNav();
  initBagProfitability();
}

document.addEventListener("DOMContentLoaded", () => {
  initLock();
  initApp();
});
