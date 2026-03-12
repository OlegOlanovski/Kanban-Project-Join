const STORAGE_KEY = "join_contacts_v1";
const dbTask = "https://join-da53b-default-rtdb.firebaseio.com/";

let contacts = [];
let selectedId = null;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?\d+$/;

function isMobile() { return window.isMobile && window.isMobile(); }
function showMobileList() { window.showMobileList && window.showMobileList(); }
function showMobileDetails() { window.showMobileDetails && window.showMobileDetails(); }

document.addEventListener("DOMContentLoaded", async function () {
  await (window.idbStorage && window.idbStorage.ready ? window.idbStorage.ready : Promise.resolve());
  await init();
});

async function init() {
  getCokkieCheck();
  removeModalNow();
  await loadContacts();
  renderContactsList();
  renderDetails();
  if (isMobile()) showMobileList();
  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
}

function normalize(str) {
  return (str || "").trim().replace(/\s+/g, " ");
}

function generateId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now() + "_" + Math.random().toString(16).slice(2);
}

function hashString(str) {
  let h = 0, s = String(str || "");
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function colorClassFor(seed) {
  return "avatar-color-" + (hashString(seed) % 12);
}

function pickUniqueColorClass(seed, usedSet) {
  let start = hashString(seed) % 12;
  for (let i = 0; i < 12; i++) {
    let cls = "avatar-color-" + ((start + i) % 12);
    if (!usedSet.has(cls)) return cls;
  }
  return "avatar-color-" + start;
}

function getInitials(fullName) {
  let n = normalize(fullName);
  if (!n) return "";
  let p = n.split(" ").filter(Boolean);
  let f = (p[0] || "")[0] || "";
  let l = p.length > 1 ? (p[p.length - 1] || "")[0] : (p[0] || "")[1] || "";
  return (f + l).toUpperCase();
}

function sortContacts(a, b) {
  return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
}

function groupKey(name) {
  return (normalize(name)[0] || "").toUpperCase();
}

async function loadContacts() {
  let data = null;
  try {
    const resp = await fetch(dbTask + "contacts.json");
    data = await resp.json();
  } catch {}
  if (!data) contacts = [];
  else if (Array.isArray(data)) contacts = data.filter(Boolean);
  else contacts = Object.entries(data).map(([k, v]) => ({ ...(v || {}), id: v?.id || k }));
  ensureUniqueColors();
}

async function saveContacts() {
  const map = {};
  for (let c of contacts) {
    if (!c.id) c.id = generateId();
    map[c.id] = c;
  }
  await fetch(dbTask + "contacts.json", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(map),
  });
}

function ensureUniqueColors() {
  let used = new Set();
  for (let c of contacts) {
    let seed = c.id || c.email || c.name || "";
    if (!c.colorClass || used.has(c.colorClass)) c.colorClass = pickUniqueColorClass(seed, used);
    used.add(c.colorClass);
  }
}

function removeModalNow() {
  let m = document.getElementById("addContactModal");
  if (m) m.remove();
}

function initValidation() {
  document.getElementById("contactName")?.addEventListener("blur", validateNameField);
  document.getElementById("contactEmail")?.addEventListener("blur", validateEmailField);
  document.getElementById("contactPhone")?.addEventListener("blur", validatePhoneField);
}

function openModal(mode, contact) {
  removeModalNow();
  document.body.insertAdjacentHTML("beforeend", contactModalTemplate(mode, buildModalData(mode, contact)));
  let m = document.getElementById("addContactModal");
  let form = document.getElementById("addContactForm");
  if (!m) return;
  m.setAttribute("data-mode", mode);
  if (form) {
    form.dataset.mode = mode;
    form.dataset.editId = mode === "edit" && contact ? contact.id : "";
  }
  m.classList.remove("d-none");
  requestAnimationFrame(function () {
    m.classList.add("is-open");
    initValidation();
  });
}

function closeModal() {
  let m = document.getElementById("addContactModal");
  if (!m) return;
  m.classList.remove("is-open");
  setTimeout(removeModalNow, 300);
}

function showContactToast() {
  let toast = document.getElementById("contactSuccessToast");
  if (!toast) return;
  toast.classList.remove("d-none");
  setTimeout(function () { toast.classList.add("d-none"); }, 2000);
}

function buildModalData(mode, contact) {
  if (!contact) return {};
  return {
    id: contact.id,
    name: contact.name || "",
    email: contact.email || "",
    phone: contact.phone || "",
    initials: getInitials(contact.name),
    colorClass: contact.colorClass
  };
}

function renderContactsList() {
  let list = document.getElementById("contactsList");
  if (!list) return;
  let sorted = [...contacts].sort(sortContacts), html = "", current = "";
  for (let c of sorted) {
    let g = groupKey(c.name);
    if (g && g !== current) {
      current = g;
      html += letterGroupTemplate(current);
    }
    html += contactListItemTemplate({
      id: c.id,
      name: c.name,
      email: c.email,
      initials: getInitials(c.name),
      colorClass: c.colorClass
    }, c.id === selectedId);
  }
  list.innerHTML = html;
}

function renderDetails() {
  let d = document.getElementById("contactDetails");
  if (!d) return;
  if (!selectedId) {
    d.innerHTML = "";
    return;
  }
  let c = contacts.find(x => x.id === selectedId);
  if (!c) return;
  d.innerHTML = contactDetailsTemplate({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone || "-",
    initials: getInitials(c.name),
    colorClass: c.colorClass
  });
  if (isMobile()) showMobileDetails();
}

function clearError(inputId, errorId) {
  document.getElementById(inputId)?.classList.remove("input-error");
  let e = document.getElementById(errorId);
  if (e) e.textContent = "";
}

function setError(inputId, errorId, msg) {
  document.getElementById(inputId)?.classList.add("input-error");
  let e = document.getElementById(errorId);
  if (e) e.textContent = msg;
}

function clearContactErrors() {
  clearError("contactName", "nameError");
  clearError("contactEmail", "emailError");
  clearError("contactPhone", "phoneError");
}

function isValidName(name) {
  return /^[A-Za-zÀ-ÿ\s]+$/.test(name) && name.trim().length >= 2;
}

function isValidEmail(email) {
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  return !phone || phoneRegex.test(phone);
}

function validateNameField() {
  let name = normalize(document.getElementById("contactName")?.value);
  clearError("contactName", "nameError");
  if (!isValidName(name)) setError("contactName", "nameError", "Please enter a valid name");
}

function validateEmailField() {
  let email = normalize(document.getElementById("contactEmail")?.value).toLowerCase();
  clearError("contactEmail", "emailError");
  if (!email) setError("contactEmail", "emailError", "Please enter an email");
  else if (!isValidEmail(email)) setError("contactEmail", "emailError", "Please enter a valid email");
}

function validatePhoneField() {
  let phone = normalize(document.getElementById("contactPhone")?.value);
  clearError("contactPhone", "phoneError");
  if (!isValidPhone(phone)) setError("contactPhone", "phoneError", "Please enter a valid phone number");
}

function validateContactForm() {
  let name = normalize(document.getElementById("contactName")?.value);
  let email = normalize(document.getElementById("contactEmail")?.value).toLowerCase();
  let phone = normalize(document.getElementById("contactPhone")?.value);
  clearContactErrors();
  let valid = true;
  if (!isValidName(name)) { setError("contactName", "nameError", "Please enter a valid name"); valid = false; }
  if (!email) { setError("contactEmail", "emailError", "Please enter an email"); valid = false; }
  else if (!isValidEmail(email)) { setError("contactEmail", "emailError", "Please enter a valid email"); valid = false; }
  if (!isValidPhone(phone)) { setError("contactPhone", "phoneError", "Please enter a valid phone number"); valid = false; }
  return valid;
}

function formData() {
  return {
    name: normalize(document.getElementById("contactName")?.value),
    email: normalize(document.getElementById("contactEmail")?.value).toLowerCase(),
    phone: normalize(document.getElementById("contactPhone")?.value)
  };
}

function createFromForm() {
  if (!validateContactForm()) return;
  let id = generateId(), data = formData();
  contacts.push({ id, ...data, colorClass: colorClassFor(id) });
  selectedId = id;
  saveContacts();
  renderContactsList();
  renderDetails();
  closeModal();
  showContactToast();
}

function saveEdit(editId) {
  let idx = contacts.findIndex(c => c.id === editId);
  if (idx === -1 || !validateContactForm()) return;
  contacts[idx] = { ...contacts[idx], ...formData() };
  selectedId = editId;
  saveContacts();
  renderContactsList();
  renderDetails();
  closeModal();
}

function deleteContact(id) {
  contacts = contacts.filter(c => c.id !== id);
  selectedId = null;
  saveContacts();
  renderContactsList();
  renderDetails();
}

function handleClick(e) {
  if (e.target.closest("#openAddContact")) return openModal("create", null);
  let item = e.target.closest(".contact-item");
  if (item?.dataset.id) {
    selectedId = item.dataset.id;
    renderContactsList();
    renderDetails();
    return;
  }
  let act = e.target.closest(".contact-action");
  if (act?.dataset.action === "delete") { deleteContact(act.dataset.id); closeModal(); return; }
  if (act?.dataset.action === "edit") {
    window.closeMobileMenu && window.closeMobileMenu();
    return openModal("edit", contacts.find(c => c.id === act.dataset.id));
  }
  if (e.target.closest("#closeAddContact")) closeModal();
  let back = document.getElementById("addContactModal");
  if (back && e.target === back) closeModal();
}

function handleSubmit(e) {
  if (e.target.id !== "addContactForm") return;
  e.preventDefault();
  let mode = e.target.dataset.mode || "create";
  let editId = e.target.dataset.editId || "";
  if (mode === "edit" && editId) return saveEdit(editId);
  return createFromForm();
}