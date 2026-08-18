/**
 * Displays the authoritative daily stakeholder email-request limit from Firebase.
 * The n8n workflow increments the counter only after an email is received.
 */
(function initStakeholderRequests() {
  const REQUEST_LIMIT = 10;
  const REFRESH_INTERVAL_MS = 60 * 1000;
  const FIREBASE_NODE = "stakeholderEmailRequests";
  const LOCAL_STORAGE_PREFIX = "join-stakeholder-requests:";

  const stakeholderScreen = document.getElementById("stakeholderScreen");
  const availableState = document.getElementById("stakeholderAvailableState");
  const limitState = document.getElementById("stakeholderLimitState");
  const countElement = document.getElementById("stakeholderRequestCount");
  const createEmailButton = document.getElementById("stakeholderCreateEmailButton");

  if (!stakeholderScreen || !countElement || !createEmailButton) return;

  let activeDate = getBerlinDateKey();
  let requestCount = readLocalCount(activeDate);
  let refreshSequence = 0;

  createEmailButton.addEventListener("click", handleCreateEmailClick);
  renderRequestState();
  refreshRequestCount();
  window.setInterval(refreshRequestCount, REFRESH_INTERVAL_MS);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) refreshRequestCount();
  });

  window.StakeholderRequestLimit = {
    refresh: refreshRequestCount,
  };

  /**
   * Refreshes the daily count from Firebase and falls back to local storage.
   * @returns {Promise<number>} The rendered request count.
   */
  async function refreshRequestCount() {
    resetStateForNewDay();
    const requestedDate = activeDate;
    const sequence = ++refreshSequence;
    renderRequestState();

    try {
      const remoteCount = await fetchRemoteCount(requestedDate);
      if (sequence !== refreshSequence || requestedDate !== activeDate) return requestCount;

      requestCount = remoteCount;
      saveLocalCount(activeDate, requestCount);
      renderRequestState();
    } catch (error) {
      console.warn("Daily request count could not be loaded from Firebase.", error);
    }

    return requestCount;
  }

  /**
   * Prevents opening the regular request link when the server-side limit is reached.
   * @param {MouseEvent} event Click event from the email link.
   */
  function handleCreateEmailClick(event) {
    resetStateForNewDay();

    if (requestCount >= REQUEST_LIMIT) {
      event.preventDefault();
      renderRequestState();
      return;
    }
  }

  /** Updates the counter and switches between available and limit states. */
  function renderRequestState() {
    const safeCount = normalizeCount(requestCount);
    const isLimitReached = safeCount >= REQUEST_LIMIT;

    countElement.textContent = safeCount + " of " + REQUEST_LIMIT;
    stakeholderScreen.classList.toggle("is-limit-reached", isLimitReached);
    if (availableState) availableState.setAttribute("aria-hidden", String(isLimitReached));
    if (limitState) limitState.setAttribute("aria-hidden", String(!isLimitReached));
  }

  /** Resets the local state when the calendar day changes. */
  function resetStateForNewDay() {
    const currentDate = getBerlinDateKey();
    if (currentDate === activeDate) return;

    activeDate = currentDate;
    requestCount = readLocalCount(activeDate);
    refreshSequence += 1;
  }

  /**
   * Loads the current count from Firebase.
   * @param {string} dateKey Date in YYYY-MM-DD format.
   * @returns {Promise<number>} Remote count.
   */
  async function fetchRemoteCount(dateKey) {
    const response = await fetch(buildFirebaseCountUrl(dateKey), {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Firebase read failed with status " + response.status);
    return normalizeCount(await response.json());
  }

  /**
   * Builds the Firebase endpoint for one day's counter.
   * @param {string} dateKey Date in YYYY-MM-DD format.
   * @returns {string} Firebase REST endpoint.
   */
  function buildFirebaseCountUrl(dateKey) {
    const databaseUrl = typeof window.getAppDbUrl === "function" ? window.getAppDbUrl() : "";
    if (!databaseUrl) throw new Error("Firebase database URL is not configured.");
    return databaseUrl + FIREBASE_NODE + "/" + encodeURIComponent(dateKey) + "/count.json";
  }

  /** @returns {string} Current date in Europe/Berlin as YYYY-MM-DD. */
  function getBerlinDateKey() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = {};
    parts.forEach(function (part) {
      if (part.type !== "literal") values[part.type] = part.value;
    });
    return values.year + "-" + values.month + "-" + values.day;
  }

  /** @param {*} value Raw count. @returns {number} Count clamped to 0..10. */
  function normalizeCount(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return 0;
    return Math.min(REQUEST_LIMIT, Math.max(0, Math.floor(numericValue)));
  }

  /** @param {string} dateKey Date key. @returns {number} Locally stored count. */
  function readLocalCount(dateKey) {
    try {
      return normalizeCount(localStorage.getItem(LOCAL_STORAGE_PREFIX + dateKey));
    } catch (error) {
      return 0;
    }
  }

  /** @param {string} dateKey Date key. @param {number} count Count to store. */
  function saveLocalCount(dateKey, count) {
    try {
      localStorage.setItem(LOCAL_STORAGE_PREFIX + dateKey, String(normalizeCount(count)));
    } catch (error) {
      console.warn("Daily request count could not be saved locally.", error);
    }
  }
})();
