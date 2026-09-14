const query = new URLSearchParams(window.location.search);
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
  const email = $("#email").value.trim();
  const password = $("#password").value;
  const endpoint = registrationMode ? "/api/register" : "/api/login";
  const payload = { email, password };
  if (registrationMode) payload.confirmPassword = $("#confirmPassword").value;
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) { $("#formMessage").textContent = data.error || "Request failed."; return; }
  if (registrationMode) { $("#formMessage").textContent = "Account created. You can now sign in."; $("#registerToggle").click(); return; }
  window.location.href = nextPage;
};
document.querySelectorAll("[data-role]").forEach((button) => { button.onclick = async () => { await fetch("/api/demo-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: button.dataset.role }) }); window.location.href = nextPage; }; });
