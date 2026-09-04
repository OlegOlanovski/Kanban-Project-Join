/** * Animation for login page and select field.
 */
window.addEventListener("load", () => {
  setTimeout(() => {
    document.body.classList.add("loaded");
  }, 500);
  setTimeout(showWelcomeScreen, 1800);
});

const welcomeScreen = document.getElementById("welcomeScreen");
const memberLoginButton = document.getElementById("memberLoginButton");
const createRequestButton = document.getElementById("createRequestButton");
const stakeholderScreen = document.getElementById("stakeholderScreen");
const stakeholderBackButton = document.getElementById("stakeholderBackButton");

if (memberLoginButton) memberLoginButton.addEventListener("click", showMemberLogin);
if (createRequestButton) createRequestButton.addEventListener("click", showStakeholderScreen);
if (stakeholderBackButton) stakeholderBackButton.addEventListener("click", showWelcomeFromStakeholder);

/**
 * Keep a screen's ARIA visibility and keyboard focus state in sync.
 * @param {HTMLElement|null} screen Screen to update.
 * @param {boolean} hidden Whether the screen should be hidden.
 */
function setScreenHidden(screen, hidden) {
  if (!screen) return;
  if (hidden && screen.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  screen.inert = hidden;
  screen.setAttribute("aria-hidden", String(hidden));
}

/**
 * Show the role selection after the logo animation.
 */
function showWelcomeScreen() {
  document.documentElement.classList.add("welcome-visible");
  document.body.classList.add("welcome-visible");
  setScreenHidden(welcomeScreen, false);
  const firstAction = welcomeScreen && welcomeScreen.querySelector(".welcome-button");
  if (firstAction) firstAction.focus();
}

/**
 * Close the role selection and reveal the existing login form.
 */
function showMemberLogin() {
  document.documentElement.classList.remove("welcome-visible");
  document.body.classList.remove("welcome-visible");
  document.body.classList.add("login-visible");
  setScreenHidden(welcomeScreen, true);
  setTimeout(() => {
    const emailInput = document.getElementById("mail");
    if (emailInput) emailInput.focus();
  }, 400);
}

/**
 * Open the stakeholder information step.
 */
function showStakeholderScreen() {
  document.documentElement.classList.remove("welcome-visible");
  document.body.classList.remove("welcome-visible");
  document.body.classList.add("stakeholder-visible");
  setScreenHidden(welcomeScreen, true);
  setScreenHidden(stakeholderScreen, false);
  if (window.StakeholderRequestLimit) window.StakeholderRequestLimit.refresh();
  setTimeout(() => {
    if (stakeholderBackButton) stakeholderBackButton.focus();
  }, 400);
}

/**
 * Return from the stakeholder step to role selection.
 */
function showWelcomeFromStakeholder() {
  document.body.classList.remove("stakeholder-visible");
  document.documentElement.classList.add("welcome-visible");
  document.body.classList.add("welcome-visible");
  setScreenHidden(stakeholderScreen, true);
  setScreenHidden(welcomeScreen, false);
  setTimeout(() => {
    if (createRequestButton) createRequestButton.focus();
  }, 400);
}

/**
 * Go to signup.
 */
function goToSignup() {
  window.location.href = "./subpages/regist.html";
}

// addTasks.html Select fild Aniemation
/**
 * Select animate.
 */
function selectAnimate() {
  const wrapper = document.querySelector(".select-wrapper");
  wrapper.classList.toggle("open");
}
