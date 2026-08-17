// ---------------- Tasks storage ----------------
/**
 * Reads the cached task list from IndexedDB-backed storage.
 * @returns {BoardTask[]} Cached tasks, or an empty array on failure.
 */
function getTasks() {
  try {
    const tasks = (window.idbStorage && typeof window.idbStorage.getTasksSync === "function")
      ? window.idbStorage.getTasksSync()
      : [];
    return window.normalizeTaskCollection ? window.normalizeTaskCollection(tasks) : tasks;
  } catch (e) {
    console.error("Storage access error:", e);
    return [];
  }
}

/**
 * Persists the task collection locally.
 * Remote writes are handled per task so a stale Board snapshot cannot remove
 * tasks created externally by n8n.
 * @param {BoardTask[]} tasks Tasks to persist.
 * @returns {Promise<void>}
 */
async function saveTasks(tasks) {
  await persistTasksToIdb(tasks);
}

/**
 * Fetches a named node from Firebase, with a root-level fallback lookup.
 * @param {string} nodeName Firebase node name.
 * @returns {Promise<*|null>} Resolved node payload or `null`.
 */
async function fetchDBNode(nodeName) {
  const direct = await tryFetchNode(nodeName);
  if (direct != null) return direct;
  return fetchNodeFromRoot(nodeName);
}

/**
 * Loads tasks from Firebase and stores them locally.
 * @returns {Promise<BoardTask[]>} Normalized task list.
 */
async function syncTasksFromDB() {
  try {
    const data = await fetchDBNode("tasks");
    const tasks = window.normalizeTaskCollection ? window.normalizeTaskCollection(data) : [];
    await persistTasksToIdb(tasks);
    return tasks;
  } catch (e) {
    console.error("Failed to sync tasks from DB", e);
    throw e;
  }
}

/**
 * Writes the current task list to IndexedDB-backed storage.
 * @param {BoardTask[]} tasks Tasks to persist.
 * @returns {Promise<void>}
 */
async function persistTasksToIdb(tasks) {
  if (!(window.idbStorage && typeof window.idbStorage.saveTasks === "function")) {
    console.warn("idbStorage not available - tasks not persisted");
    return;
  }
  try {
    await window.idbStorage.saveTasks(tasks);
  } catch (e) {
    console.error("Failed to save tasks to IDB:", e);
  }
}

/**
 * Persists a changed task locally and writes only that task to Firebase.
 * @param {BoardTask[]} tasks Updated local task collection.
 * @param {BoardTask} task Changed task record.
 * @returns {Promise<void>}
 */
async function saveTaskUpdate(tasks, task) {
  await persistTasksToIdb(tasks);
  await putTaskToRemote(task);
}

/**
 * Persists a task deletion locally and removes only that task from Firebase.
 * @param {BoardTask[]} tasks Remaining local task collection.
 * @param {string|number} taskId Deleted task ID.
 * @returns {Promise<void>}
 */
async function saveTaskDeletion(tasks, taskId) {
  await persistTasksToIdb(tasks);
  await deleteTaskFromRemote(taskId);
}

/**
 * Writes one task without replacing the Firebase task collection.
 * @param {BoardTask} task Task to upload.
 * @returns {Promise<void>}
 */
async function putTaskToRemote(task) {
  const response = await fetch(getRemoteTaskUrl(task && task.id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error("Failed to update task in Firebase: " + response.status);
}

/**
 * Removes one task without replacing the Firebase task collection.
 * @param {string|number} taskId Task ID to remove.
 * @returns {Promise<void>}
 */
async function deleteTaskFromRemote(taskId) {
  const response = await fetch(getRemoteTaskUrl(taskId), { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete task from Firebase: " + response.status);
}

/**
 * Builds the Firebase endpoint URL for a single task.
 * @param {string|number} taskId Task ID.
 * @returns {string} Fully qualified task endpoint URL.
 */
function getRemoteTaskUrl(taskId) {
  if (taskId === undefined || taskId === null || String(taskId).trim() === "") {
    throw new Error("Cannot persist a task without an ID.");
  }
  const base = window.getAppDbUrl ? window.getAppDbUrl() : window.DB_TASK_URL;
  return base + "tasks/" + encodeURIComponent(String(taskId)) + ".json";
}

/**
 * Attempts to fetch a Firebase node directly from its endpoint.
 * @param {string} nodeName Firebase node name.
 * @returns {Promise<*|null>} Node payload or `null` on failure.
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
 * Attempts to resolve a node by downloading the database root payload.
 * @param {string} nodeName Firebase node name.
 * @returns {Promise<*|null>} Node payload or `null` on failure.
 */
async function fetchNodeFromRoot(nodeName) {
  try {
    const root = await fetchDbRoot();
    if (!root) return null;
    return extractNodeFromRoot(root, nodeName);
  } catch (e) {
    return null;
  }
}

/**
 * Fetches the Firebase database root payload.
 * @returns {Promise<*>} Parsed root JSON payload.
 */
async function fetchDbRoot() {
  const response = await fetch(DB_TASK_URL + ".json");
  return response.json();
}

/**
 * Extracts a named node from either an array- or object-shaped root payload.
 * @param {*} root Root payload fetched from Firebase.
 * @param {string} nodeName Firebase node name.
 * @returns {*|null} Extracted node payload or `null`.
 */
function extractNodeFromRoot(root, nodeName) {
  if (Array.isArray(root)) return extractNodeFromArray(root, nodeName);
  if (root && typeof root === "object") return extractNodeFromObject(root, nodeName);
  return null;
}

/**
 * Extracts a named node from an array-shaped Firebase root payload.
 * @param {Array<*>} root Root payload represented as an array.
 * @param {string} nodeName Firebase node name.
 * @returns {*|null} Extracted node payload or `null`.
 */
function extractNodeFromArray(root, nodeName) {
  const entry = root.find(function (item) {
    return item && item.id === nodeName;
  });
  return entry ? extractNodeFromEntry(entry, nodeName) : null;
}

/**
 * Extracts a named node from an object-shaped Firebase root payload.
 * @param {Object<string, *>} root Root payload represented as an object.
 * @param {string} nodeName Firebase node name.
 * @returns {*|null} Extracted node payload or `null`.
 */
function extractNodeFromObject(root, nodeName) {
  const vals = Object.values(root);
  for (let i = 0; i < vals.length; i++) {
    const candidate = extractNodeFromEntry(vals[i], nodeName);
    if (candidate !== null && candidate !== undefined) return candidate;
  }
  if (root[nodeName] !== undefined) return root[nodeName];
  return null;
}

/**
 * Extracts a named nested payload from a root entry matched by `id`.
 * @param {Object<string, *>|null} entry Root entry candidate.
 * @param {string} nodeName Firebase node name.
 * @returns {*|null} Extracted node payload or `null`.
 */
function extractNodeFromEntry(entry, nodeName) {
  if (!entry || entry.id !== nodeName) return null;
  const clone = Object.assign({}, entry);
  delete clone.id;
  if (Object.prototype.hasOwnProperty.call(clone, nodeName)) return clone[nodeName];
  const keys = Object.keys(clone);
  return keys.length ? clone : null;
}
