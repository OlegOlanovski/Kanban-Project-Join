/** @typedef {{overlay: HTMLElement|null, backdrop: HTMLElement|null, top: HTMLElement|null, closeBtn: HTMLElement|null, delBtn: HTMLElement|null, editBtn: HTMLElement|null, saveBtn: HTMLElement|null, view: HTMLElement|null, editForm: HTMLElement|null}} OverlayViewElements */
/** @typedef {{id?: string|number, name?: string, email?: string, colorClass?: string}} OverlayViewContact */

// ---------------- Overlay events ----------------
/** Initializes task-overlay listeners and edit widgets. @returns {void} */
function initOverlayEvents() {
  const els = getOverlayElements();
  if (!els) return;
  toggleOverlayEditState(els, false);
  bindOverlayClose(els);
  bindOverlayBackdrop(els);
  bindOverlayEsc(els);
  bindOverlayDelete(els);
  bindOverlayEdit(els);
  bindOverlaySave(els);
  bindOverlayEditForm(els);
  initOverlayEditWidgets();
  bindOverlayOpenByCard();
}

/** @returns {OverlayViewElements|null} Required overlay element references. */
function getOverlayElements() {
  const els = collectOverlayElements();
  if (!els.backdrop || !els.closeBtn) {
    warnOverlayMissing();
    return null;
  }
  return els;
}

/** @returns {OverlayViewElements} All known task-overlay element references. */
function collectOverlayElements() {
  return {
    overlay: document.querySelector(".task-overlay"),
    backdrop: document.getElementById("taskOverlayBackdrop"),
    top: document.querySelector(".task-overlay-top"),
    closeBtn: document.getElementById("taskOverlayClose"),
    delBtn: document.getElementById("taskOverlayDelete"),
    editBtn: document.getElementById("taskOverlayEdit"),
    saveBtn: document.getElementById("taskOverlaySave"),
    view: document.getElementById("taskOverlayView"),
    editForm: document.getElementById("taskOverlayEditForm"),
  };
}

/** Logs a warning when critical overlay elements are missing. @returns {void} */
function warnOverlayMissing() {
  console.warn("Overlay elements not found (taskOverlayBackdrop/taskOverlayClose).");
}

/** @param {OverlayViewElements} els Overlay element references. @returns {void} */
function bindOverlayClose(els) {
  els.closeBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    closeTaskOverlay();
  });
}

/** @param {OverlayViewElements} els Overlay element references. @returns {void} */
function bindOverlayBackdrop(els) {
  els.backdrop.addEventListener("click", function (e) {
    if (e.target === els.backdrop) closeTaskOverlay();
  });
}

/** @param {OverlayViewElements} els Overlay element references. @returns {void} */
function bindOverlayEsc(els) {
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !els.backdrop.hidden) closeTaskOverlay();
  });
}

/** @param {OverlayViewElements} els Overlay element references. @returns {void} */
function bindOverlayDelete(els) {
  if (!els.delBtn) return;
  els.delBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!openedTaskId) return;
    deleteTask(openedTaskId);
  });
}

/** @param {OverlayViewElements} els Overlay element references. @returns {void} */
function bindOverlayEdit(els) {
  if (!els.editBtn) return;
  els.editBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!openedTaskId) return;
    enterOverlayEditMode(openedTaskId, els);
  });
}

/** @param {OverlayViewElements} els Overlay element references. @returns {void} */
function bindOverlaySave(els) {
  if (!els.saveBtn) return;
  els.saveBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!openedTaskId) return;
    saveOverlayEdits(openedTaskId, els);
  });
}

/** @param {OverlayViewElements} els Overlay element references. @returns {void} */
function bindOverlayEditForm(els) {
  if (!els.editForm) return;
  els.editForm.addEventListener("submit", function (e) {
    e.preventDefault();
  });
}

/** Opens the task overlay when a board card is clicked. @returns {void} */
function bindOverlayOpenByCard() {
  document.addEventListener("click", function (e) {
    if (isDragging) return;
    if (e.target.closest(".task-overlay")) return;
    const card = e.target.closest(".card");
    if (!card) return;
    openTaskOverlay(card.dataset.id);
  });
}

// ---------------- Open / Close overlay ----------------
/** @param {string|number} id Task ID to open. @returns {void} */
function openTaskOverlay(id) {
  const task = findTaskById(id);
  if (!task) return;
  openedTaskId = String(id);
  resetOverlayEditMode();
  setOverlayCategory(task);
  setOverlayTexts(task);
  setOverlayPriority(task);
  renderOverlayAssigned(task);
  renderOverlaySubtasks(task);
  showOverlay(task);
}

/** @param {string|number} id Task ID to find. @returns {BoardTask|null} Matching task or `null`. */
function findTaskById(id) {
  const tasks = getTasks();
  for (let i = 0; i < tasks.length; i++) {
    if (String(tasks[i].id) === String(id)) return tasks[i];
  }
  return null;
}

/** @param {BoardTask} task Task to reflect in the category chip. @returns {void} */
function setOverlayCategory(task) {
  const chip = document.getElementById("taskOverlayCategory");
  if (!chip) return;
  const isTech = task.category === "tech";
  chip.textContent = isTech ? "Technical Task" : "User Story";
  chip.classList.remove("user", "tech");
  chip.classList.add(isTech ? "tech" : "user");
}

/** @param {BoardTask} task Task to reflect in title, description, and due date. @returns {void} */
function setOverlayTexts(task) {
  setText("taskOverlayTitle", task.title || "");
  setText("taskOverlayDesc", task.description || "");
  setText("taskOverlayDue", formatDate(task.dueDate || task.due || ""));
}

/** @param {BoardTask} task Task to reflect in the priority row. @returns {void} */
function setOverlayPriority(task) {
  const prioEl = document.getElementById("taskOverlayPrio");
  if (!prioEl) return;
  const pr = getTaskPriority(task);
  resetOverlayPriorityEl(prioEl, pr);
  appendOverlayPriorityText(prioEl, pr);
  appendOverlayPriorityIcon(prioEl, task, pr);
}

/** @param {BoardTask} task Task whose assignees should be rendered. @returns {void} */
function renderOverlayAssigned(task) {
  const assignedWrap = document.getElementById("taskOverlayAssigned");
  if (!assignedWrap) return;
  assignedWrap.innerHTML = "";
  const list = getAssignedList(task);
  for (let i = 0; i < list.length; i++) {
    assignedWrap.appendChild(createPersonRow(list[i], i));
  }
}

/** @param {BoardTask} task Task whose assignees should be normalized. @returns {OverlayViewContact[]} Overlay-ready contact list. */
function getAssignedList(task) {
  if (typeof resolveAssignedContacts === "function") return resolveAssignedContacts(task);
  const list = resolveAssignedList(task);
  return list.map(function (name) {
    const s = String(name || "");
    return { id: s, name: s };
  });
}

/** @param {OverlayViewContact|string} item Contact-like value to render. @param {number} index Fallback position for color hashing. @returns {HTMLDivElement} Assignee row element. */
function createPersonRow(item, index) {
  const contact = normalizeOverlayContact(item);
  const row = document.createElement("div");
  row.className = "task-overlay-person";
  row.appendChild(createPersonBadge(contact, index));
  row.appendChild(createPersonText(contact));
  return row;
}

/** @param {OverlayViewContact} contact Contact-like object. @param {number} index Fallback position for color hashing. @returns {HTMLDivElement} Avatar badge element. */
function createPersonBadge(contact, index) {
  const badge = document.createElement("div");
  const colorClass = getOverlayViewContactColorClass(contact, index);
  badge.className = "task-overlay-badge " + colorClass;
  badge.textContent = getInitials(String(contact.name || contact.id || ""));
  return badge;
}

/** @param {OverlayViewContact} contact Contact-like object. @returns {HTMLDivElement} Assignee name element. */
function createPersonText(contact) {
  const text = document.createElement("div");
  text.textContent = String(contact.name || contact.id || "");
  return text;
}

/** @param {OverlayViewContact|string} item Raw assignee value. @returns {OverlayViewContact} Normalized contact-like object. */
function normalizeOverlayContact(item) {
  if (item && typeof item === "object") return item;
  const s = String(item || "");
  return { id: s, name: s };
}

/** @param {OverlayViewContact} contact Contact-like object. @param {number} index Fallback position for color hashing. @returns {string} Avatar color class. */
function getOverlayViewContactColorClass(contact, index) {
  if (typeof getContactColorClass === "function") return getContactColorClass(contact);
  if (contact && contact.colorClass) return contact.colorClass;
  const seed = contact?.id || contact?.email || contact?.name || String(index || "");
  return "avatar-color-" + (overlayViewHashString(seed) % 12);
}

/** @param {string} str Seed string. @returns {number} Stable positive hash value. */
function overlayViewHashString(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** @param {BoardTask} task Task whose subtasks should be rendered. @returns {void} */
function renderOverlaySubtasks(task) {
  const subtasksWrap = document.getElementById("taskOverlaySubtasks");
  if (!subtasksWrap) return;
  subtasksWrap.innerHTML = "";
  const subs = Array.isArray(task.subtasks) ? task.subtasks : [];
  if (!subs.length) return showNoSubtasks(subtasksWrap);
  for (let i = 0; i < subs.length; i++) {
    subtasksWrap.appendChild(createSubtaskRow(subs[i], i, task.id));
  }
}

/** @param {HTMLElement} wrap Subtask container element. @returns {void} */
function showNoSubtasks(wrap) {
  wrap.textContent = "No subtasks";
}

/** @param {{title?: string, done?: boolean}} subtask Subtask payload. @param {number} index Subtask index. @param {string|number} taskId Parent task ID. @returns {HTMLDivElement} Subtask row element. */
function createSubtaskRow(subtask, index, taskId) {
  const row = document.createElement("div");
  row.className = "task-overlay-subtask";
  row.appendChild(createSubtaskCheckbox(subtask, index, taskId));
  row.appendChild(createSubtaskLabel(subtask));
  return row;
}

/** @param {{title?: string, done?: boolean}} subtask Subtask payload. @param {number} index Subtask index. @param {string|number} taskId Parent task ID. @returns {HTMLInputElement} Checkbox element. */
function createSubtaskCheckbox(subtask, index, taskId) {
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = !!subtask.done;
  box.addEventListener("change", function () {
    updateSubtaskDone(taskId, index, box.checked);
  });
  return box;
}

/** @param {{title?: string}} subtask Subtask payload. @returns {HTMLSpanElement} Subtask label element. */
function createSubtaskLabel(subtask) {
  const label = document.createElement("span");
  label.textContent = subtask.title || "";
  return label;
}

/** @param {string|number} taskId Parent task ID. @param {number} subIndex Subtask index. @param {boolean} done Next completion state. @returns {void} */
function updateSubtaskDone(taskId, subIndex, done) {
  const tasks = getTasks();
  const idx = findTaskIndexById(taskId, tasks);
  if (idx < 0) return;
  const task = tasks[idx];
  if (!Array.isArray(task.subtasks) || !task.subtasks[subIndex]) return;
  task.subtasks[subIndex].done = !!done;
  saveTasks(tasks);
  updateCardSubtaskProgress(task);
}

/** @param {BoardTask} task Updated task whose card progress should be refreshed. @returns {void} */
function updateCardSubtaskProgress(task) {
  const card = getCardByTaskId(task.id);
  if (!card) return;
  const subs = Array.isArray(task.subtasks) ? task.subtasks : [];
  const total = subs.length;
  const existing = card.querySelector(".card-progress");
  if (!total) return removeCardProgress(existing);
  const done = countDoneSubtasks(subs);
  const percent = Math.round((done / total) * 100);
  const progress = ensureCardProgress(card, existing);
  if (!progress) return;
  updateCardProgressDisplay(progress, done, total, percent);
}

/** @param {BoardTask} task Task whose priority should be normalized. @returns {string} Lowercase priority value. */
function getTaskPriority(task) {
  return String(task.priority || task.prio || "medium").toLowerCase();
}

/** @param {HTMLElement} prioEl Priority container element. @param {string} pr Normalized priority value. @returns {void} */
function resetOverlayPriorityEl(prioEl, pr) {
  prioEl.textContent = "";
  prioEl.classList.remove("urgent", "medium", "low");
  prioEl.classList.add(pr);
}

/** @param {HTMLElement} prioEl Priority container element. @param {string} pr Normalized priority value. @returns {void} */
function appendOverlayPriorityText(prioEl, pr) {
  const text = document.createElement("span");
  text.textContent = capitalize(pr);
  prioEl.appendChild(text);
}

/** @param {HTMLElement} prioEl Priority container element. @param {BoardTask} task Task to derive the icon from. @param {string} pr Normalized priority value. @returns {void} */
function appendOverlayPriorityIcon(prioEl, task, pr) {
  const icon = getPriorityIcon(task);
  if (!icon) return;
  const img = document.createElement("img");
  img.src = icon;
  img.alt = "Priority " + pr;
  img.className = "task-overlay-prio-icon";
  prioEl.appendChild(img);
}

/** @param {string|number} id Task ID to match. @returns {HTMLElement|null} Matching board card element. */
function getCardByTaskId(id) {
  return document.querySelector('.card[data-id="' + id + '"]');
}

/** @param {Element|null} existing Existing progress element. @returns {void} */
function removeCardProgress(existing) {
  if (existing) existing.remove();
}

/** @param {HTMLElement} card Board card element. @param {Element|null} existing Existing progress element. @returns {HTMLElement|null} Progress element to update. */
function ensureCardProgress(card, existing) {
  if (existing) return existing;
  const bottom = card.querySelector(".card-bottom");
  if (!bottom) return null;
  const progress = buildCardProgressElement();
  bottom.insertBefore(progress, bottom.firstChild);
  return progress;
}

/** @returns {HTMLDivElement} Card progress wrapper element. */
function buildCardProgressElement() {
  const progress = document.createElement("div");
  progress.className = "card-progress";
  progress.innerHTML =
    '<div class="card-progress-bar"><div class="card-progress-fill"></div></div>' +
    '<div class="card-progress-text"></div>';
  return progress;
}

/** @param {HTMLElement} progress Progress wrapper element. @param {number} done Completed subtasks. @param {number} total Total subtasks. @param {number} percent Completion percent. @returns {void} */
function updateCardProgressDisplay(progress, done, total, percent) {
  const fill = progress.querySelector(".card-progress-fill");
  const text = progress.querySelector(".card-progress-text");
  if (fill) fill.style.width = percent + "%";
  if (text) text.textContent = done + "/" + total;
}

/** Shows the task overlay and locks body scrolling. @returns {void} */
function showOverlay() {
  const backdrop = document.getElementById("taskOverlayBackdrop");
  if (!backdrop) return;
  backdrop.hidden = false;
  updateBodyScrollLock();
}

/** Hides the task overlay and resets overlay edit state. @returns {void} */
function closeTaskOverlay() {
  const backdrop = document.getElementById("taskOverlayBackdrop");
  if (!backdrop) return;
  backdrop.hidden = true;
  updateBodyScrollLock();
  openedTaskId = null;
  resetOverlayEditMode();
}

/** Resets the overlay back to view mode. @returns {void} */
function resetOverlayEditMode() {
  const els = getOverlayElements();
  if (!els) return;
  isEditingOverlay = false;
  toggleOverlayEditState(els, false);
}

/** @param {string|number} id Task ID to edit. @param {OverlayViewElements} els Overlay element references. @returns {void} */
function enterOverlayEditMode(id, els) {
  const task = findTaskById(id);
  if (!task) return;
  isEditingOverlay = true;
  toggleOverlayEditState(els, true);
  fillOverlayEditForm(task);
  if (els.overlay) els.overlay.scrollTop = 0;
}

/** @param {OverlayViewElements} els Overlay element references. @returns {void} */
function exitOverlayEditMode(els) {
  isEditingOverlay = false;
  toggleOverlayEditState(els, false);
}

/** @param {OverlayViewElements} els Overlay element references. @param {boolean} editing Whether edit mode should be active. @returns {void} */
function toggleOverlayEditState(els, editing) {
  if (els.view) els.view.hidden = editing;
  if (els.editForm) els.editForm.hidden = !editing;
  if (els.overlay) {
    editing ? els.overlay.classList.add("is-editing") : els.overlay.classList.remove("is-editing");
  }
  if (els.editBtn) els.editBtn.hidden = editing;
  if (els.delBtn) els.delBtn.hidden = editing;
  if (els.saveBtn) els.saveBtn.hidden = !editing;
}
