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
 * Show the role selection after the logo animation.
 */
function showWelcomeScreen() {
  document.body.classList.add("welcome-visible");
  if (welcomeScreen) welcomeScreen.setAttribute("aria-hidden", "false");
  const firstAction = welcomeScreen && welcomeScreen.querySelector(".welcome-button");
  if (firstAction) firstAction.focus();
}

/**
 * Close the role selection and reveal the existing login form.
 */
function showMemberLogin() {
  document.body.classList.remove("welcome-visible");
  document.body.classList.add("login-visible");
  if (welcomeScreen) welcomeScreen.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    const emailInput = document.getElementById("mail");
    if (emailInput) emailInput.focus();
  }, 400);
}

/**
 * Open the stakeholder information step.
 */
function showStakeholderScreen() {
  document.body.classList.remove("welcome-visible");
  document.body.classList.add("stakeholder-visible");
  if (welcomeScreen) welcomeScreen.setAttribute("aria-hidden", "true");
  if (stakeholderScreen) stakeholderScreen.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    if (stakeholderBackButton) stakeholderBackButton.focus();
  }, 400);
}

/**
 * Return from the stakeholder step to role selection.
 */
function showWelcomeFromStakeholder() {
  document.body.classList.remove("stakeholder-visible");
  document.body.classList.add("welcome-visible");
  if (stakeholderScreen) stakeholderScreen.setAttribute("aria-hidden", "true");
  if (welcomeScreen) welcomeScreen.setAttribute("aria-hidden", "false");
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
