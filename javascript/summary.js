const DB_TASK_URL = window.getAppDbUrl ? window.getAppDbUrl() : window.DB_TASK_URL;
const BOARD_PAGE_URL = "./board.html";
const months = ["January","February","March","April", "May","June","July","August","September","October","November","December",];
const urgent_tasks = document.getElementById("todo-status-urgent");
let urgent_tasks_months = document.getElementById("months");
let urgent_tasks_day = document.getElementById("day");
let urgent_tasks_year = document.getElementById("year");
let Todos_urgent = [];
let nearestUrgentDate = null;
/**
 * Go to board.
 */
function goToBoard() {window.location.href = BOARD_PAGE_URL;}

/**
 * Returns normalized tasks from local cache.
 * @returns {Array<Object<string, *>>}
 */
function getSummaryTasks() {
  const tasks = (window.idbStorage && typeof window.idbStorage.getTasksSync === "function")
    ? window.idbStorage.getTasksSync()
    : [];
  return window.normalizeTaskCollection ? window.normalizeTaskCollection(tasks) : tasks;
}

/**
 * Fetch dbnode.
 */
async function fetchDBNode(nodeName) {
  const direct = await tryFetchNode(nodeName);
  if (direct != null) return direct;
  return fetchNodeFromRoot(nodeName);
}

/**
 * Try fetch node.
 */
async function tryFetchNode(nodeName) {
  try {
    const resp = await fetch(DB_TASK_URL + nodeName + ".json");
    const data = await resp.json();
    return data != null ? data : null;
  } catch (e) {
    return null;
  }
}

/**
 * Fetch node from root.
 */
async function fetchNodeFromRoot(nodeName) {
  try {
    const r = await fetch(DB_TASK_URL + ".json");
    const root = await r.json();
    if (!root) return null;
    return extractNodeFromRoot(root, nodeName);
  } catch (e) {
    return null;
  }
}

/**
 * Extract node from root.
 */
function extractNodeFromRoot(root, nodeName) {
  if (Array.isArray(root)) return extractNodeFromArray(root, nodeName);
  if (typeof root === "object") return extractNodeFromObject(root, nodeName);
  return null;
}

/**
 * Extract node from array.
 */
function extractNodeFromArray(root, nodeName) {
  const entry = root.find((e) => e && e.id === nodeName);
  return entry ? extractNodeFromEntry(entry, nodeName) : null;
}

/**
 * Extract node from object.
 */
function extractNodeFromObject(root, nodeName) {
  const vals = Object.values(root);
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] && vals[i].id === nodeName) return extractNodeFromEntry(vals[i], nodeName);
  }
  return root[nodeName] !== undefined ? root[nodeName] : null;
}

/**
 * Extract node from entry.
 */
function extractNodeFromEntry(entry, nodeName) {
  const clone = Object.assign({}, entry);
  delete clone.id;
  if (clone.hasOwnProperty(nodeName)) return clone[nodeName];
  const keys = Object.keys(clone);
  return keys.length ? clone : null;
}


/**
 * Sync tasks from db.
 */
async function syncTasksFromDB() {
  try {
    const data = await fetchDBNode("tasks");
    const tasks = window.normalizeTaskCollection ? window.normalizeTaskCollection(data) : [];
    if (window.idbStorage && typeof window.idbStorage.saveTasks === "function") {
      try {await window.idbStorage.saveTasks(tasks);
        try {const local = window.idbStorage.getTasksSync ? window.idbStorage.getTasksSync() : null;} catch (readErr) {console.warn("syncTasksFromDB: saved to IDB but failed to read back:", readErr);}
      } catch (err) {console.warn("Failed to save tasks to IDB:", err);}
    }
    return tasks;
  } catch (e) {console.warn("Failed to sync tasks from DB", e); throw e;}
}


/**
 * Initialize.
 */
async function init() {
  await (window.idbStorage && window.idbStorage.ready ? window.idbStorage.ready : Promise.resolve());
  try { await syncTasksFromDB(); } catch (e) { console.warn("Initial tasks sync failed, continuing with local cache", e); }
  getCokkieCheck(); greetingText(); getEmailRequestsTotal(); getTasksTotal(); getTasksDone(); getTasksProgress(); getAwaitFeedback(); getUrgrentTodo();
}

const MOBILE_GREETING_DURATION_MS = 2000;
const MOBILE_GREETING_FADE_MS = 300;

/**
 * Show the one-time greeting screen after a mobile login.
 */
function initMobileGreeting() {
  const screen = document.getElementById("mobileGreetingScreen");
  if (!screen) return;
  const requested = consumeMobileGreetingRequest();
  if (!requested || !window.matchMedia("(max-width: 600px)").matches) {
    document.documentElement.classList.remove("mobile-greeting-pending");
    return;
  }
  renderMobileGreeting();
  screen.hidden = false;
  screen.setAttribute("aria-hidden", "false");
  document.body.classList.add("mobile-greeting-active");
  window.setTimeout(() => screen.classList.add("is-leaving"), MOBILE_GREETING_DURATION_MS);
  window.setTimeout(
    () => closeMobileGreeting(screen),
    MOBILE_GREETING_DURATION_MS + MOBILE_GREETING_FADE_MS,
  );
}

/**
 * Consume the one-time session flag set by the login page.
 */
function consumeMobileGreetingRequest() {
  try {
    const requested = sessionStorage.getItem("showMobileGreeting") === "true";
    sessionStorage.removeItem("showMobileGreeting");
    return requested;
  } catch (e) {
    return false;
  }
}

/**
 * Render the greeting text and optional registered-user name.
 */
function renderMobileGreeting() {
  const salutation = document.getElementById("mobileGreetingSalutation");
  const name = document.getElementById("mobileGreetingName");
  if (!salutation || !name) return;
  const displayName = getMobileGreetingName();
  const hasMemberName = displayName && displayName.toLowerCase() !== "guest";
  salutation.textContent = getTimeBasedGreeting() + (hasMemberName ? "," : "!");
  name.textContent = hasMemberName ? displayName : "";
}

/**
 * Get the current user name from the login session.
 */
function getMobileGreetingName() {
  try {
    const value = JSON.parse(sessionStorage.getItem("loggedInUser") || "null");
    return normalizeGreetingName(value);
  } catch (e) {
    return "";
  }
}

/**
 * Get a time-dependent greeting.
 */
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/**
 * Hide and reset the temporary greeting screen.
 */
function closeMobileGreeting(screen) {
  document.body.classList.remove("mobile-greeting-active");
  document.documentElement.classList.remove("mobile-greeting-pending");
  screen.classList.remove("is-leaving");
  screen.setAttribute("aria-hidden", "true");
  screen.hidden = true;
}

initMobileGreeting();

/**
 * Count all email or AI-generated tasks currently present on the board.
 */
function getEmailRequestsTotal() {
  const count = getSummaryTasks().filter(isEmailRequestTask).length;
  renderEmailRequestsCount(count);
}

/**
 * Check whether a task originated from the email/AI request workflow.
 * @param {Object<string, *>} task Task to inspect.
 * @returns {boolean} Whether the task should be included in the email-request total.
 */
function isEmailRequestTask(task) {
  if (!task || typeof task !== "object") return false;
  const creator = task.creator && typeof task.creator === "object" ? task.creator : {};
  const source = String(creator.source || task.source || task.createdVia || task.origin || "")
    .trim()
    .toLowerCase();
  const explicitAi = task.aiGenerated === true || task.isAiGenerated === true || task.ai_generated === true;
  const legacyMarker = /^\[AI-generated ticket from email\]/i.test(String(task.description || "").trim());
  return ["email", "ai", "ai-email", "email-ai"].includes(source) || explicitAi || legacyMarker;
}

/**
 * Render the email request count and keep its accessible label in sync.
 */
function renderEmailRequestsCount(count) {
  const counter = document.getElementById("email-requests-count");
  const card = document.getElementById("email-requests-card");
  if (counter) counter.innerText = count;
  if (card) card.setAttribute("aria-label", count + (count === 1 ? " email request" : " email requests"));
}

/**
 * Greeting text.
 */
function greetingText() {
  const el = document.getElementById("greeting-text"); if (!el) return;
  const h = new Date().getHours();
  const base = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  let displayName = "";
  try {
    const cookieMatch = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("loggedInUser="));
    if (cookieMatch) {
      const cookieValue = cookieMatch.split("=")[1];
      displayName = normalizeGreetingName(JSON.parse(decodeURIComponent(cookieValue)));
    } else if (sessionStorage.getItem("loggedInUser")) {
      displayName = normalizeGreetingName(JSON.parse(sessionStorage.getItem("loggedInUser")));
    }
  } catch (e) {}
  renderGreeting(el, base, displayName);
}

/**
 * Normalize the stored user value for the greeting.
 */
function normalizeGreetingName(value) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  return String(value.namen || value.name || "").trim();
}

/**
 * Render the greeting with a separately styled user name.
 */
function renderGreeting(el, base, displayName) {
  el.textContent = displayName ? `${base}, ` : `${base}!`;
  if (!displayName) return;
  const nameEl = document.createElement("span");
  nameEl.className = "greeting-name";
  nameEl.textContent = `${displayName}!`;
  el.appendChild(nameEl);
}
/**
 * Get tasks total.
 */
function getTasksTotal() {
  const tasks = getSummaryTasks();
  let filteredTasks = tasks.filter(task => String(task.title || "").trim() !== "");
  let tasks_to_board = document.getElementById("task-in-board");
  let todo_tasks = document.getElementById("todos-total");
  let Todos = [];

  for (let i = 0; i < tasks.length; i++) {
    const element = tasks[i];
    let status = element.status;
    if (status == "todo") { Todos.push(status);}
    todo_tasks.innerText = Todos.length;
  }
  tasks_to_board.innerText = filteredTasks.length;
}


/**
 * Get tasks done.
 */
function getTasksDone() {
  let done_tasks = document.getElementById("todos-done");
  let Todos_Done = [];
  const tasks = getSummaryTasks();

  for (let i = 0; i < tasks.length; i++) {
    const element = tasks[i];
    let status = element.status;
    if (status == "done") {Todos_Done.push(status);}
    done_tasks.innerText = Todos_Done.length;
  }
}


/**
 * Get tasks progress.
 */
function getTasksProgress() {
  let pogress_tasks = document.getElementById("task-in-pogress");
  let Todos_pogress = [];
  const tasks = getSummaryTasks();
  for (let i = 0; i < tasks.length; i++) {
    const pogress = tasks[i];
    let status = pogress.status;
    if (status == "progress") {Todos_pogress.push(status);}
    pogress_tasks.innerText = Todos_pogress.length;
  }
}


/**
 * Get await feedback.
 */
function getAwaitFeedback() {
  let feedback_tasks = document.getElementById("task-in-feedback");
  let Todos_feedback = [];
  const tasks = getSummaryTasks();
  for (let i = 0; i < tasks.length; i++) {
    const feedback = tasks[i];
    let status = feedback.status;
    if (status == "feedback") {Todos_feedback.push(status);}
    feedback_tasks.innerText = Todos_feedback.length;
  }
}


/**
 * Get urgrent todo.
 */
function getUrgrentTodo() {
  const tasks = getSummaryTasks();
  Todos_urgent = [];
  nearestUrgentDate = null;
  for (let i = 0; i < tasks.length; i++) {
    const urgent = tasks[i];
    let priority = String(urgent.priority || "").toLowerCase();
    let dueDate = urgent.dueDate || urgent.due || "";
    let newDueDate = dueDate ? new Date(dueDate) : null;
    if (priority === "urgent") { Todos_urgent.push(priority);
      if (newDueDate && !isNaN(newDueDate)) { if (!nearestUrgentDate || newDueDate < nearestUrgentDate) {nearestUrgentDate = newDueDate;}
      }}urgent_tasks.innerText = Todos_urgent.length;}
  if (nearestUrgentDate) {
    urgent_tasks_months.innerText = months[nearestUrgentDate.getMonth()];
    urgent_tasks_day.innerText = nearestUrgentDate.getDate();
    urgent_tasks_year.innerText = nearestUrgentDate.getFullYear();
  }
}
