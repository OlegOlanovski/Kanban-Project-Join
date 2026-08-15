/**
 * Controls the daily stakeholder email-request limit.
 * A request is counted when the user opens the prefilled email link.
 */
(function initStakeholderRequests() {
  const REQUEST_LIMIT = 10;
  const FIREBASE_NODE = "stakeholderEmailRequests";
  const LOCAL_STORAGE_PREFIX = "join-stakeholder-requests:";
  const FIREBASE_RETRIES = 4;

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

      requestCount = Math.max(requestCount, remoteCount);
      saveLocalCount(activeDate, requestCount);
      renderRequestState();
    } catch (error) {
      console.warn("Daily request count could not be loaded from Firebase.", error);
    }

    return requestCount;
  }

  /**
   * Counts an email request without delaying the mail application.
   * @param {MouseEvent} event Click event from the email link.
   */
  function handleCreateEmailClick(event) {
    resetStateForNewDay();

    if (requestCount >= REQUEST_LIMIT) {
      event.preventDefault();
      renderRequestState();
      return;
    }

    requestCount = Math.min(REQUEST_LIMIT, requestCount + 1);
    saveLocalCount(activeDate, requestCount);
    renderRequestState();

    const requestDate = activeDate;
    const optimisticCount = requestCount;
    incrementRemoteCount(requestDate, optimisticCount)
      .then(function (remoteCount) {
        if (requestDate !== activeDate) return;
        requestCount = Math.max(requestCount, remoteCount);
        saveLocalCount(activeDate, requestCount);
        renderRequestState();
      })
      .catch(function (error) {
        console.warn("Daily request count was saved locally only.", error);
      });
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
   * Atomically increments the Firebase counter using its ETag.
   * @param {string} dateKey Date in YYYY-MM-DD format.
   * @param {number} optimisticCount Count already saved in this browser.
   * @returns {Promise<number>} Confirmed remote count.
   */
  async function incrementRemoteCount(dateKey, optimisticCount) {
    const endpoint = buildFirebaseCountUrl(dateKey);

    for (let attempt = 0; attempt < FIREBASE_RETRIES; attempt += 1) {
      const readResponse = await fetch(endpoint, {
        cache: "no-store",
        headers: { "X-Firebase-ETag": "true" },
      });
      if (!readResponse.ok) throw new Error("Firebase read failed with status " + readResponse.status);

      const etag = readResponse.headers.get("ETag");
      if (!etag) throw new Error("Firebase did not return an ETag.");

      const remoteCount = normalizeCount(await readResponse.json());
      if (remoteCount >= REQUEST_LIMIT) return REQUEST_LIMIT;

      const nextCount = Math.min(REQUEST_LIMIT, Math.max(remoteCount + 1, optimisticCount));
      const writeResponse = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "If-Match": etag,
        },
        body: JSON.stringify(nextCount),
      });

      if (writeResponse.status === 412) continue;
      if (!writeResponse.ok) throw new Error("Firebase write failed with status " + writeResponse.status);
      return normalizeCount(await writeResponse.json());
    }

    throw new Error("Firebase counter changed too often. Please try again.");
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
