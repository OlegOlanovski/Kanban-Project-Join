/** * Animation for login page and select field.
 */
window.addEventListener("load", () => {
  setTimeout(() => {
    document.body.classList.add("loaded");
  }, 500);
});

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
