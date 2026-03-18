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
