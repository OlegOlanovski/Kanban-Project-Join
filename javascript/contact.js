const STORAGE_KEY = "join_contacts_v1";
const dbTask = "https://join-da53b-default-rtdb.firebaseio.com/";

let contacts = [];
let selectedId = null;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?\d+$/;

/**
 * Is mobile.
 */
function isMobile() { return window.isMobile && window.isMobile(); }
/**
 * Show mobile list.
 */
function showMobileList() { window.showMobileList && window.showMobileList(); }
/**
 * Show mobile details.
 */
function showMobileDetails() { window.showMobileDetails && window.showMobileDetails(); }

document.addEventListener("DOMContentLoaded", async function () {
  await (window.idbStorage && window.idbStorage.ready ? window.idbStorage.ready : Promise.resolve());
  await init();
});

/**
 * Initialize.
 */
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

/**
 * Normalize.
 */
function normalize(str) {
  return (str || "").trim().replace(/\s+/g, " ");
}

/**
 * Generate id.
 */
function generateId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now() + "_" + Math.random().toString(16).slice(2);
}

/**
 * Hash string.
 */
function hashString(str) {
  let h = 0, s = String(str || "");
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Color class for.
 */
function colorClassFor(seed) {
  return "avatar-color-" + (hashString(seed) % 12);
}

/**
 * Pick unique color class.
 */
function pickUniqueColorClass(seed, usedSet) {
  let start = hashString(seed) % 12;
  for (let i = 0; i < 12; i++) {
    let cls = "avatar-color-" + ((start + i) % 12);
    if (!usedSet.has(cls)) return cls;
  }
  return "avatar-color-" + start;
}

/**
 * Get initials.
 */
function getInitials(fullName) {
  let n = normalize(fullName);
  if (!n) return "";
  let p = n.split(" ").filter(Boolean);
  let f = (p[0] || "")[0] || "";
  let l = p.length > 1 ? (p[p.length - 1] || "")[0] : (p[0] || "")[1] || "";
  return (f + l).toUpperCase();
}

/**
 * Sort contacts.
 */
function sortContacts(a, b) {
  return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
}

/**
 * Group key.
 */
function groupKey(name) {
  return (normalize(name)[0] || "").toUpperCase();
}

/**
 * Load contacts.
 */
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

/**
 * Save contacts.
 */
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

/**
 * Ensure unique colors.
 */
function ensureUniqueColors() {
  let used = new Set();
  for (let c of contacts) {
    let seed = c.id || c.email || c.name || "";
    if (!c.colorClass || used.has(c.colorClass)) c.colorClass = pickUniqueColorClass(seed, used);
    used.add(c.colorClass);
  }
}

/**
 * Remove modal now.
 */
function removeModalNow() {
  let m = document.getElementById("addContactModal");
  if (m) m.remove();
}

/**
 * Initialize validation.
 */
function initValidation() {
  document.getElementById("contactName")?.addEventListener("blur", validateNameField);
  document.getElementById("contactEmail")?.addEventListener("blur", validateEmailField);
  document.getElementById("contactPhone")?.addEventListener("blur", validatePhoneField);
}

/**
 * Open modal.
 */
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

/**
 * Close modal.
 */
function closeModal() {
  let m = document.getElementById("addContactModal");
  if (!m) return;
  m.classList.remove("is-open");
  setTimeout(removeModalNow, 300);
}

/**
 * Show contact toast.
 */
function showContactToast() {
  let toast = document.getElementById("contactSuccessToast");
  if (!toast) return;
  toast.classList.remove("d-none");
  setTimeout(function () { toast.classList.add("d-none"); }, 2000);
}

/**
 * Build modal data.
 */
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

/**
 * Render contacts list.
 */
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

/**
 * Render details.
 */
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

/**
 * Clear error.
 */
function clearError(inputId, errorId) {
  document.getElementById(inputId)?.classList.remove("input-error");
  let e = document.getElementById(errorId);
  if (e) e.textContent = "";
}

/**
 * Set error.
 */
function setError(inputId, errorId, msg) {
  document.getElementById(inputId)?.classList.add("input-error");
  let e = document.getElementById(errorId);
  if (e) e.textContent = msg;
}

/**
 * Clear contact errors.
 */
function clearContactErrors() {
  clearError("contactName", "nameError");
  clearError("contactEmail", "emailError");
  clearError("contactPhone", "phoneError");
}

/**
 * Is valid name.
 */
function isValidName(name) {
  return /^[A-Za-zÀ-ÿ\s]+$/.test(name) && name.trim().length >= 2;
}

/**
 * Is valid email.
 */
function isValidEmail(email) {
  return emailRegex.test(email);
}

/**
 * Is valid phone.
 */
function isValidPhone(phone) {
  return !phone || phoneRegex.test(phone);
}

/**
 * Validate name field.
 */
function validateNameField() {
  let name = normalize(document.getElementById("contactName")?.value);
  clearError("contactName", "nameError");
  if (!isValidName(name)) setError("contactName", "nameError", "Please enter a valid name");
}

/**
 * Validate email field.
 */
function validateEmailField() {
  let email = normalize(document.getElementById("contactEmail")?.value).toLowerCase();
  clearError("contactEmail", "emailError");
  if (!email) setError("contactEmail", "emailError", "Please enter an email");
  else if (!isValidEmail(email)) setError("contactEmail", "emailError", "Please enter a valid email");
}

/**
 * Validate phone field.
 */
function validatePhoneField() {
  let phone = normalize(document.getElementById("contactPhone")?.value);
  clearError("contactPhone", "phoneError");
  if (!isValidPhone(phone)) setError("contactPhone", "phoneError", "Please enter a valid phone number");
}

/**
 * Validate contact form.
 */
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

/**
 * Form data.
 */
function formData() {
  return {
    name: normalize(document.getElementById("contactName")?.value),
    email: normalize(document.getElementById("contactEmail")?.value).toLowerCase(),
    phone: normalize(document.getElementById("contactPhone")?.value)
  };
}

/**
 * Create from form.
 */
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

/**
 * Save edit.
 */
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

/**
 * Delete contact.
 */
function deleteContact(id) {
  contacts = contacts.filter(c => c.id !== id);
  selectedId = null;
  saveContacts();
  renderContactsList();
  renderDetails();
}

/**
 * Handle click.
 */
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

/**
 * Handle submit.
 */
function handleSubmit(e) {
  if (e.target.id !== "addContactForm") return;
  e.preventDefault();
  let mode = e.target.dataset.mode || "create";
  let editId = e.target.dataset.editId || "";
  if (mode === "edit" && editId) return saveEdit(editId);
  return createFromForm();
}