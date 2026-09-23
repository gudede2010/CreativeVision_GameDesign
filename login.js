const query = new URLSearchParams(window.location.search);
const supabaseReady = new Promise((resolve) => {
  const supabaseScript = document.createElement("script");
  supabaseScript.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  supabaseScript.onload = () => {
    const clientScript = document.createElement("script");
    clientScript.src = "supabase-client.js";
    clientScript.onload = resolve;
    document.head.appendChild(clientScript);
  };
  document.head.appendChild(supabaseScript);
});
const nextPage = query.get("next") === "resource.html" ? "resource.html" : "dashboard.html";
const $ = (selector) => document.querySelector(selector);
const languageButtons = document.querySelectorAll("[data-lang]");
const languageElements = document.querySelectorAll("[data-en][data-zh]");
function setLanguage(language) {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  languageElements.forEach((element) => {
    element.textContent = element.dataset[language];
  });
  languageButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === language);
  });
  localStorage.setItem("creativeVisionLanguage", language);
}
languageButtons.forEach((button) => {
  button.onclick = () => setLanguage(button.dataset.lang);
});
setLanguage(localStorage.getItem("creativeVisionLanguage") || "en");
let registrationMode = false;
$("#registerToggle").onclick = () => {
  registrationMode = !registrationMode;
  $("#formTitle").textContent = registrationMode ? "Create account" : "Member login";
  $("#submitButton").textContent = registrationMode ? "Register" : "Sign in";
  $("#registerToggle").textContent = registrationMode ? "Back to login" : "Register";
  $("#confirmPasswordLabel").hidden = !registrationMode;
  $("#confirmPassword").hidden = !registrationMode;
  $("#confirmPassword").required = registrationMode;
  $("#formMessage").textContent = "";
};
$("#loginForm").onsubmit = async (event) => {
  event.preventDefault();
  await supabaseReady;
  const email = $("#email").value.trim();
  const password = $("#password").value;
  if (registrationMode) {
    if (!email.toLowerCase().endsWith("@basischina.com")) {
      $("#formMessage").textContent = "Please use your @basischina.com email address.";
      return;
    }
    if (password !== $("#confirmPassword").value) {
      $("#formMessage").textContent = "Passwords must match.";
      return;
    }
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) { $("#formMessage").textContent = error.message; return; }
    $("#formMessage").textContent = "Account created. You can now sign in.";
    $("#registerToggle").click();
    return;
  }
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) { $("#formMessage").textContent = error.message; return; }
  window.location.href = nextPage;
};
