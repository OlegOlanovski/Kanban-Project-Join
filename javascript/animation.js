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

if (memberLoginButton) memberLoginButton.addEventListener("click", showMemberLogin);

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
