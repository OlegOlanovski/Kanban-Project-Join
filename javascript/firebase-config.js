/**
 * Shared Firebase Realtime Database configuration.
 * Replace `realtimeDbUrl` with your own Firebase Realtime Database URL.
 */
(function initFirebaseConfig() {
  const runtimeConfig = window.APP_CONFIG || {};
  const realtimeDbUrl = normalizeDbUrl(
    runtimeConfig.realtimeDbUrl || "https://remotestorage-706e3-default-rtdb.europe-west1.firebasedatabase.app/",
  );

  window.APP_CONFIG = Object.assign({}, runtimeConfig, {
    realtimeDbUrl: realtimeDbUrl,
  });
  window.DB_TASK_URL = realtimeDbUrl;
  window.getAppDbUrl = function getAppDbUrl() {
    return window.APP_CONFIG.realtimeDbUrl;
  };
  window.normalizeTaskStatus = normalizeTaskStatus;
  window.normalizeTaskRecord = normalizeTaskRecord;
  window.normalizeTaskCollection = normalizeTaskCollection;
})();

/**
 * Normalizes the configured database URL to always end with a slash.
 * @param {string} url Raw database URL.
 * @returns {string} Normalized database URL.
 */
function normalizeDbUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  return value.endsWith("/") ? value : value + "/";
}

/**
 * Normalizes task status values to the four board columns.
 * @param {string} status Raw task status value.
 * @returns {string} Supported board status.
 */
function normalizeTaskStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return "todo";
  if (value === "todo" || value === "to do" || value === "to-do") return "todo";
  if (value === "progress" || value === "in progress" || value === "in-progress" || value === "inprogress") return "progress";
  if (value === "feedback" || value === "await feedback" || value === "await-feedback" || value === "awaitfeedback") return "feedback";
  if (value === "done") return "done";
  return "todo";
}

/**
 * Normalizes a single task record for board and dashboard usage.
 * @param {Object<string, *>} task Raw task payload.
 * @param {string} [fallbackId] Fallback task ID from Firebase key.
 * @returns {Object<string, *>} Normalized task payload.
 */
function normalizeTaskRecord(task, fallbackId) {
  const record = Object.assign({}, task || {});
  if (!record.id && fallbackId) record.id = fallbackId;
  if (!record.title && record.titel) record.title = record.titel;
  record.status = normalizeTaskStatus(record.status);
  return record;
}

/**
 * Normalizes a task collection from Firebase or local cache.
 * @param {Array<*>|Object<string, *>|null} data Raw task collection.
 * @returns {Array<Object<string, *>>} Normalized task list.
 */
function normalizeTaskCollection(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data
      .filter(Boolean)
      .map(function (task) {
        return normalizeTaskRecord(task);
      });
  }
  return Object.entries(data).map(function ([key, value]) {
    return normalizeTaskRecord(value, key);
  });
}
