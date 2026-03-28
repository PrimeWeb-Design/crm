const API_BASE = "http://127.0.0.1:3000/api";
const STATUSES = ["Offen", "Kontaktiert", "Im GesprÃ¤ch", "Abgeschlossen", "Abgelehnt"];
const PRIORITIES = ["HOCH", "MITTEL", "NIEDRIG"];
const DEFAULT_LEAD = {
  firma: "",
  ort: "",
  branche: "",
  website: "",
  sourceUrl: "",
  problem: "",
  paket: "Business",
  preis: 999,
  tel: "",
  whatsapp: "",
  email: "",
  contactNames: "",
  outreachSuggestion: "",
  followUpAt: "",
  prio: "MITTEL",
  status: "Offen",
  km: 0,
  notiz: "",
  source: "Outbound",
  createdAt: "",
  updatedAt: "",
  history: [],
  contacts: []
};

let leads = [];
let currentId = null;

const els = {
  rows: document.getElementById("rows"),
  emptyState: document.getElementById("emptyState"),
  syncLabel: document.getElementById("syncLabel"),
  overlay: document.getElementById("overlay"),
  modalTitle: document.getElementById("modalTitle"),
  searchInput: document.getElementById("searchInput"),
  prioFilter: document.getElementById("prioFilter"),
  statusFilter: document.getElementById("statusFilter"),
  sourceFilter: document.getElementById("sourceFilter"),
  importFile: document.getElementById("importFile"),
  toast: document.getElementById("toast"),
  heroTotal: document.getElementById("heroTotal"),
  heroInbound: document.getElementById("heroInbound"),
  heroOpen: document.getElementById("heroOpen"),
  sTotal: document.getElementById("sTotal"),
  sHigh: document.getElementById("sHigh"),
  sActive: document.getElementById("sActive"),
  sWon: document.getElementById("sWon"),
  sValue: document.getElementById("sValue")
};

const fields = [
  "firma",
  "ort",
  "branche",
  "website",
  "sourceUrl",
  "problem",
  "paket",
  "preis",
  "tel",
  "whatsapp",
  "email",
  "contactNames",
  "outreachSuggestion",
  "followUpAt",
  "prio",
  "status",
  "notiz",
  "source"
].reduce((acc, key) => {
  acc[key] = document.getElementById("f-" + key);
  return acc;
}, {});

const esc = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function normalizeLead(lead) {
  const n = { ...DEFAULT_LEAD, ...lead };
  n.id = lead.id || Date.now() + Math.random();
  n.preis = Number(n.preis) || 0;
  n.km = Number(n.km) || 0;
  n.prio = PRIORITIES.includes(n.prio) ? n.prio : "MITTEL";
  n.status = STATUSES.includes(n.status) ? n.status : "Offen";
  n.source = n.source || "Website";
  n.whatsapp = n.whatsapp || n.tel || "";
  n.sourceUrl = n.sourceUrl || "";
  n.contactNames = n.contactNames || "";
  n.outreachSuggestion = n.outreachSuggestion || "";
  n.followUpAt = n.followUpAt || "";
  n.contacts = Array.isArray(n.contacts) ? n.contacts : [];
  n.createdAt = n.createdAt || new Date().toISOString();
  n.updatedAt = n.updatedAt || n.createdAt;
  n.history = Array.isArray(n.history) ? n.history : [];
  return n;
}

async function api(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    throw new Error("API-Fehler");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function load() {
  leads = (await api("/leads")).map(normalizeLead);
}

function updateSyncLabel(label = "Synchronisiert") {
  const now = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  els.syncLabel.textContent = `${label} ${now}`;
}

function statusClass(status) {
  return "status-" + status.replace(/\s+/g, "-").replace("GesprÃ¤ch", "Gespraech");
}

function formatFollowUp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

function formatDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getFilteredLeads() {
  const query = els.searchInput.value.trim().toLowerCase();
  return leads.filter((lead) => {
    if (els.prioFilter.value && lead.prio !== els.prioFilter.value) return false;
    if (els.statusFilter.value && lead.status !== els.statusFilter.value) return false;
    if (els.sourceFilter.value && (lead.source || "") !== els.sourceFilter.value) return false;
    if (!query) return true;
    const haystack = [
      lead.firma,
      lead.ort,
      lead.branche,
      lead.email,
      lead.tel,
      lead.whatsapp,
      lead.website,
      lead.sourceUrl,
      lead.contactNames,
      lead.problem,
      lead.notiz,
      lead.outreachSuggestion
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function updateSourceFilter() {
  const current = els.sourceFilter.value;
  const values = ["", ...new Set(leads.map((lead) => lead.source || "Website"))];
  els.sourceFilter.innerHTML = values.map((value) => `<option value="${esc(value)}"${value === current ? " selected" : ""}>${value || "Alle Quellen"}</option>`).join("");
}

function updateStats() {
  const inbound = leads.filter((lead) => (lead.source || "").toLowerCase() === "website").length;
  const active = leads.filter((lead) => !["Abgeschlossen", "Abgelehnt"].includes(lead.status)).length;
  const high = leads.filter((lead) => lead.prio === "HOCH").length;
  const won = leads.filter((lead) => lead.status === "Abgeschlossen").length;
  const value = leads.filter((lead) => lead.status !== "Abgelehnt").reduce((sum, lead) => sum + (Number(lead.preis) || 0), 0);
  els.heroTotal.textContent = leads.length;
  els.heroInbound.textContent = inbound;
  els.heroOpen.textContent = active;
  els.sTotal.textContent = leads.length;
  els.sHigh.textContent = high;
  els.sActive.textContent = active;
  els.sWon.textContent = won;
  els.sValue.textContent = value.toLocaleString("de-DE") + " EUR";
}

function render() {
  updateSourceFilter();
  updateStats();
  const rows = getFilteredLeads();
  els.rows.innerHTML = rows.map((lead) => {
    const websiteCell = lead.website
      ? `<a href="${esc(lead.website)}" target="_blank" rel="noreferrer">Oeffnen</a>`
      : (lead.sourceUrl ? `<a href="${esc(lead.sourceUrl)}" target="_blank" rel="noreferrer">Quelle</a>` : '<span class="muted">Keine</span>');
    const emailValues = [lead.email, ...lead.contacts.map((contact) => contact.email)].filter(Boolean);
    const phoneValues = [lead.tel, lead.whatsapp, ...lead.contacts.map((contact) => contact.phone)].filter(Boolean);
    const uniqueEmails = [...new Set(emailValues)];
    const uniquePhones = [...new Set(phoneValues)];
    const hint = [lead.problem, lead.researchStatus, lead.contactability, lead.outreachSuggestion].filter(Boolean).join(" | ") || "-";
    const contactTooltip = [lead.contactNames, ...lead.contacts.slice(0, 5).map((contact) => [contact.name, contact.role, contact.email, contact.phone].filter(Boolean).join(" | "))].filter(Boolean).join("\n");
    const emailList = uniqueEmails.length
      ? `<div class="contact-list">${uniqueEmails.slice(0, 4).map((value) => `<div>${esc(value)}</div>`).join("")}</div>`
      : `<span class="muted">Keine E-Mail</span>`;
    const phoneList = uniquePhones.length
      ? `<div class="contact-list">${uniquePhones.slice(0, 4).map((value) => `<div>${esc(value)}</div>`).join("")}</div>`
      : `<span class="muted">Keine Nummer</span>`;
    const whatsappRaw = lead.whatsapp || uniquePhones[0] || "";
    const whatsappDigits = String(whatsappRaw).replace(/\D/g, "");
    const quickLinks = [
      uniqueEmails[0] ? `<a class="quick-link" href="mailto:${esc(uniqueEmails[0])}">E-Mail senden</a>` : "",
      uniquePhones[0] ? `<a class="quick-link alt" href="tel:${esc(uniquePhones[0])}">Anrufen</a>` : "",
      whatsappDigits ? `<a class="quick-link alt" href="https://wa.me/${esc(whatsappDigits)}" target="_blank" rel="noreferrer">WhatsApp</a>` : ""
    ].filter(Boolean).join("");

    return `<tr>
      <td><span class="badge prio-${esc(lead.prio)}">${esc(lead.prio)}</span></td>
      <td title="${esc(contactTooltip)}"><div class="company">${esc(lead.firma || "Unbenannter Lead")}</div><div class="muted">${esc(lead.contactNames || lead.source || "-")}</div></td>
      <td><div>${esc(lead.ort || "-")}</div><div class="muted">${esc(lead.branche || "-")}</div></td>
      <td><div>${websiteCell}</div>${lead.sourceUrl ? `<div class="muted" style="margin-top:6px;">${esc(lead.sourceUrl)}</div>` : ""}</td>
      <td><div style="margin-bottom:8px;">${emailList}</div><div>${phoneList}</div><div class="quick-links">${quickLinks}</div></td>
      <td class="muted">${esc(hint)}</td>
      <td><div>${esc(lead.paket || "-")}</div><div class="muted">${(Number(lead.preis) || 0).toLocaleString("de-DE")} EUR</div><div class="muted" style="margin-top:6px;">Follow-up: ${formatFollowUp(lead.followUpAt)}</div></td>
      <td><span class="badge ${statusClass(lead.status)}">${esc(lead.status)}</span></td>
      <td><div class="row-actions"><button class="text-btn" type="button" onclick="window.editLead('${String(lead.id)}')">Bearbeiten</button><button class="text-btn" type="button" onclick="window.quickAdvance('${String(lead.id)}')">Weiter</button></div></td>
    </tr>`;
  }).join("");
  els.emptyState.hidden = rows.length > 0;
}

function openModal(lead = null) {
  currentId = lead ? lead.id : null;
  const safeLead = lead ? normalizeLead(lead) : normalizeLead({ ...DEFAULT_LEAD, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  els.modalTitle.textContent = lead ? "Lead bearbeiten" : "Neuen Lead anlegen";
  Object.entries(fields).forEach(([key, field]) => {
    field.value = key === "followUpAt" ? formatDateTimeLocal(safeLead[key]) : (safeLead[key] ?? "");
  });
  document.getElementById("deleteBtn").style.visibility = lead ? "visible" : "hidden";
  els.overlay.classList.add("open");
}

function closeModal() {
  els.overlay.classList.remove("open");
  currentId = null;
}

function collectForm() {
  const values = {};
  Object.entries(fields).forEach(([key, field]) => {
    if (key === "preis") {
      values[key] = Number(field.value) || 0;
      return;
    }
    if (key === "followUpAt") {
      values[key] = field.value ? new Date(field.value).toISOString() : "";
      return;
    }
    values[key] = field.value.trim();
  });
  values.km = 0;
  return values;
}

async function saveCurrent() {
  const values = collectForm();
  if (!values.firma) {
    toast("Firma oder Name fehlt", true);
    return;
  }

  if (currentId === null) {
    await api("/leads", { method: "POST", body: JSON.stringify(values) });
  } else {
    await api(`/leads/${encodeURIComponent(currentId)}`, { method: "PUT", body: JSON.stringify(values) });
  }

  await load();
  updateSyncLabel("Gespeichert");
  render();
  closeModal();
  toast("Gespeichert");
}

async function deleteCurrent() {
  if (currentId === null) return;
  await api(`/leads/${encodeURIComponent(currentId)}`, { method: "DELETE" });
  await load();
  updateSyncLabel("GelÃ¶scht");
  render();
  closeModal();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(leads, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "primeweb-crm-export.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importJson(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("ungÃ¼ltiges Format");
      await api("/leads/import", { method: "POST", body: JSON.stringify(data) });
      await load();
      updateSyncLabel("Importiert");
      render();
      toast("Import erfolgreich");
    } catch (_error) {
      toast("Import fehlgeschlagen", true);
    }
  };
  reader.readAsText(file);
}

async function addSampleLead() {
  const now = new Date().toISOString();
  await api("/leads", {
    method: "POST",
    body: JSON.stringify({
      id: Date.now(),
      firma: "Musterbetrieb Rhein-Main",
      ort: "Wiesbaden",
      branche: "Handwerk",
      website: "",
      sourceUrl: "https://www.gelbeseiten.de/",
      problem: "Kein eigener Webauftritt, nur Branchenverzeichnisse",
      paket: "Business",
      preis: 999,
      email: "info@musterbetrieb.de",
      tel: "0611 123456",
      whatsapp: "0611 123456",
      contactNames: "Max Muster",
      outreachSuggestion: "Erstkontakt per Mail, danach Anruf",
      prio: "HOCH",
      status: "Offen",
      notiz: "Demo-Lead fÃ¼r die CRM-Ansicht",
      source: "Research",
      createdAt: now,
      updatedAt: now
    })
  });
  await load();
  updateSyncLabel("Gespeichert");
  render();
}

async function quickAdvanceLead(id) {
  const lead = leads.find((item) => String(item.id) === String(id));
  if (!lead) return;
  const order = ["Offen", "Kontaktiert", "Im GesprÃ¤ch", "Abgeschlossen"];
  const next = order[Math.min(order.indexOf(lead.status) + 1, order.length - 1)] || "Kontaktiert";
  await api(`/leads/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      ...lead,
      status: next,
      history: [{ date: new Date().toISOString(), text: "Status geÃ¤ndert zu " + next }, ...(lead.history || [])]
    })
  });
  await load();
  updateSyncLabel("Aktualisiert");
  render();
}

function toast(message, danger = false) {
  els.toast.textContent = message;
  els.toast.style.display = "block";
  els.toast.style.background = danger ? "#c53d3d" : "#102033";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    els.toast.style.display = "none";
  }, 2400);
}

async function bootstrap() {
  document.getElementById("addBtn").addEventListener("click", () => openModal());
  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  document.getElementById("cancelBtn").addEventListener("click", closeModal);
  document.getElementById("saveBtn").addEventListener("click", saveCurrent);
  document.getElementById("deleteBtn").addEventListener("click", deleteCurrent);
  document.getElementById("exportBtn").addEventListener("click", exportJson);
  document.getElementById("importBtn").addEventListener("click", () => els.importFile.click());
  document.getElementById("seedBtn").addEventListener("click", addSampleLead);
  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    els.searchInput.value = "";
    els.prioFilter.value = "";
    els.statusFilter.value = "";
    els.sourceFilter.value = "";
    render();
  });
  els.importFile.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importJson(file);
    event.target.value = "";
  });
  [els.searchInput, els.prioFilter, els.statusFilter, els.sourceFilter].forEach((element) => {
    element.addEventListener("input", render);
    element.addEventListener("change", render);
  });
  els.overlay.addEventListener("click", (event) => {
    if (event.target === els.overlay) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
  window.editLead = (id) => {
    const lead = leads.find((entry) => String(entry.id) === String(id));
    if (lead) openModal(lead);
  };
  window.quickAdvance = quickAdvanceLead;

  try {
    await load();
    updateSyncLabel("Verbunden");
    render();
  } catch (_error) {
    toast("API nicht erreichbar", true);
  }
}

bootstrap();
