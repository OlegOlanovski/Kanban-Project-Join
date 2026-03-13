/**
 * Hash password with salt.
 */
async function hashPasswordWithSalt(password, saltArray) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const salt = new Uint8Array(saltArray);

  const key = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Reg data.
 */
async function regData(saltArray) {
  const passwordResult = await hashPasswordWithSalt(password.value, saltArray);
  try {
    if (validateSingUpForm()) {
      const db = "https://join-da53b-default-rtdb.firebaseio.com/";
      const resp = await fetch(db + "register.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namen: full_name.value,
          mail: email.value,
          passwort: passwordResult,
        }),
      });

      if (!resp.ok) {
        showRegNotice(
          "Registration failed. Please try again later.",
          "error",
          4000,
        );
        return null;
      }
      const result = await resp.json();
      registrationSuccessRedirect();
      return result;
    } else {
      showRegNotice("Please fill in all fields correctly.", "error", 4000);
      return null;
    }
  } catch (err) {
    console.warn("regData error:", err);
    showRegNotice(
      "Network error. Please check your connection.",
      "error",
      4000,
    );
    return null;
  }
}

/**
 * Registration success redirect.
 */
function registrationSuccessRedirect() {
  window.location.href = "../index.html?msg=" + encodeURIComponent("You Signed Up successfully.");
}

/**
 * Show reg notice.
 */
function showRegNotice(message, type = "info", duration = 4000) {
  const el = document.getElementById("reg-notice");
  if (!el) return;
  el.textContent = message;
  el.style.display = "flex";
  el.style.backgroundColor = type === "error" ? "#ffffff" : "#d4edda";
  el.style.borderRadius = "8px";
  el.style.border = type === "error" ? "1px solid #d32828" : "1px solid transparent";
  el.style.color = type === "error" ? "#d32828" : "#ffffff";
  el.style.transition = "opacity 0.4s ease";
  el.style.opacity = "1";
  if (duration > 0) {
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => {
        el.style.display = "none";
        el.textContent = "";
      }, 400);
    }, duration);
  }
}
