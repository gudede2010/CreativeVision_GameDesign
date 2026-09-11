const state = { role: "student", data: null, currentWeek: null };
const $ = (s) => document.querySelector(s);
const loginView = $("#loginView"),
  dashboardView = $("#dashboardView");
function card(key, html, primary = "") {
  return `<article class="card ${primary}" data-key="${key}"><button class="edit-card" hidden>Edit</button>${html}</article>`;
}

function getShanghaiDateKey() {
  return formatShanghaiDateKey(new Date());
}

function formatShanghaiDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getCurrentWeekIndex(weeks) {
  const today = getShanghaiDateKey();
  let selectedIndex = 0;

  weeks.forEach((week, index) => {
    const rollover = new Date(`${week.meetingDate}T00:00:00+08:00`);
    rollover.setUTCDate(rollover.getUTCDate() + 1);
    const rolloverKey = formatShanghaiDateKey(rollover);

    if (today >= rolloverKey && index < weeks.length - 1) {
      selectedIndex = index + 1;
    }
  });

  return selectedIndex;
}
function render() {
  const w = state.currentWeek;
  if (state.role === "admin") {
    renderAdmin();
    return;
  }
  $("#weekContext").textContent = `${w.week} · Current learning phase`;
  $("#cards").className = "dashboard-grid";
  $("#cards").innerHTML =
    card(
      "meeting",
      `<small>Next meeting</small><h2 data-field="meeting.time">${w.meeting.time}</h2><p><b>Topic:</b> <span data-field="meeting.topic">${w.meeting.topic}</span><br><b>Prepare:</b> <span data-field="meeting.prepare">${w.meeting.prepare}</span></p>`,
      "primary",
    ) +
    card(
      "deadlines",
      `<small>Upcoming deadlines</small><h2>Next checkpoints</h2>${w.deadlines.length ? w.deadlines.map((d, i) => `<div class="deadline"><strong data-field="deadlines.${i}.title">${d.title}</strong><span data-field="deadlines.${i}.date">${d.date}</span></div>`).join("") : '<p class="empty-deadline">No deadline this week.</p>'}`,
    ) +
    card(
      "week",
      `<small>This week</small><h2 data-field="weekDisplay.title">${w.weekDisplay.title}</h2><p data-field="weekDisplay.body">${w.weekDisplay.body}</p><span data-field="weekDisplay.status">${w.weekDisplay.status}</span>`,
    ) +
    card(
      "project",
      `<small>Project status</small><h2 data-field="project.title">${w.project.title}</h2><div class="progress"><i style="width:${w.project.percent}%"></i></div><div class="status-percent"><span data-field="project.percent" data-number="true">${w.project.percent}</span>%</div><p data-field="project.explanation">${w.project.explanation}</p>`,
    ) +
    card(
      "updates",
      `<small>Studio updates</small><h2>Announcements</h2><div class="announcement-list">${(state.data.announcements || []).map((u, i) => `<div class="announcement"><time data-field="announcements.${i}.date">${u.date}</time><p data-field="announcements.${i}.text">${u.text}</p></div>`).join("") || '<p class="empty-deadline">No announcements yet.</p>'}</div>${state.role === "leader" ? '<button class="add-update" id="addAnnouncement">+ Add</button>' : ''}`,
      "wide",
    );
  if (state.role !== "student")
    document.querySelectorAll(".edit-card").forEach((b) => {
      b.hidden = false;
      b.onclick = () => editCard(b);
    });
  const addButton = $("#addAnnouncement");
  if (addButton) {
    addButton.onclick = () => {
      const date = prompt("Announcement date", "SEP 09");
      const text = prompt("Announcement text", "New studio update");
      if (!date || !text) return;
      state.data.announcements = state.data.announcements || [];
      state.data.announcements.push({ date, text });
      saveDashboard();
      render();
    };
  }
}
function saveDashboard() {
  return fetch("/api/dashboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.data),
  });
}
function setNestedValue(target, path, value) {
  const keys = path.split(".");
  const finalKey = keys.pop();
  const parent = keys.reduce((current, key) => current[key], target);
  parent[finalKey] = value;
}

function syncFields(container, target) {
  container.querySelectorAll("[data-field]").forEach((element) => {
    const value = element.dataset.number === "true"
      ? Math.max(0, Math.min(100, Number.parseInt(element.textContent, 10) || 0))
      : element.textContent.trim();
    setNestedValue(target, element.dataset.field, value);
  });
}
function renderAdmin() {
  $("#weekContext").textContent = "All weeks · Administrator editor";
  $("#cards").className = "admin-list";
  $("#cards").innerHTML = state.data.weeks
    .map(
      (w, i) =>
        `<div class="admin-week"><div class="admin-week-title"><b>${w.week}</b><button class="edit-card admin-save" data-week="${i}">Edit</button></div><div class="admin-row"><div><small>Next meeting</small><p data-field="meeting.time">${w.meeting.time}</p><p>Topic: <span data-field="meeting.topic">${w.meeting.topic}</span></p><p>Prepare: <span data-field="meeting.prepare">${w.meeting.prepare}</span></p></div><div><small>Upcoming deadlines</small>${w.deadlines.map((d, deadlineIndex) => `<p><span data-field="deadlines.${deadlineIndex}.title">${d.title}</span> · <span data-field="deadlines.${deadlineIndex}.date">${d.date}</span></p>`).join("")}</div><div><small>This week</small><p data-field="weekDisplay.title">${w.weekDisplay.title}</p><p data-field="weekDisplay.body">${w.weekDisplay.body}</p><p data-field="weekDisplay.status">${w.weekDisplay.status}</p></div><div><small>Project status</small><p><span data-field="project.title">${w.project.title}</span> · <span data-field="project.percent" data-number="true">${w.project.percent}</span>%</p><p data-field="project.explanation">${w.project.explanation}</p></div></div></div>`,
    )
    .join("");
  document.querySelectorAll(".admin-save").forEach(
    (b) =>
      (b.onclick = () => {
        const row = b.closest(".admin-week");
        const editing = b.textContent === "Edit";
        b.textContent = editing ? "Save" : "Edit";
        row.querySelectorAll("[data-field]").forEach((element) => {
          element.contentEditable = editing;
        });
        if (!editing) {
          syncFields(row, state.data.weeks[Number(b.dataset.week)]);
          saveDashboard();
          row.querySelectorAll("[contenteditable]").forEach((element) => {
            element.removeAttribute("contenteditable");
          });
        }
      }),
  );
}
function editCard(btn) {
  const a = btn.closest(".card");
  const edit = btn.textContent === "Edit";
  btn.textContent = edit ? "Save" : "Edit";
  a.querySelectorAll("[data-field]").forEach(
    (e) => (e.contentEditable = edit),
  );
  if (!edit) {
    syncFields(a, a.dataset.key === "updates" ? state.data : state.currentWeek);
    saveDashboard();
    a.querySelectorAll("[contenteditable]").forEach((e) =>
      e.removeAttribute("contenteditable"),
    );
    render();
  }
}
async function enter(role, createSession = true) {
  state.role = role;
  if (createSession) {
    await fetch("/api/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }).catch(() => {});
  }
  loginView.hidden = true;
  dashboardView.hidden = false;
  $("#dashboardAccount").hidden = false;
  $("#accountName").textContent =
    role === "admin"
      ? "Club Administrator"
      : role === "leader"
        ? "Demo Team Leader"
        : "Demo Student";
  $("#accountRole").textContent =
    role[0].toUpperCase() + role.slice(1) + " account";
  const r = await fetch("/api/dashboard");
  state.data = await r.json();
  const index = getCurrentWeekIndex(state.data.weeks);
  state.currentWeek = state.data.weeks[index];
  render();
}
async function restoreSession() {
  try {
    const response = await fetch("/api/session");
    const saved = await response.json();
    if (saved.authenticated) {
      await enter(saved.role, false);
    }
  } catch (error) {
    console.warn("Session restore unavailable", error);
  }
}
document
  .querySelectorAll("[data-role]")
  .forEach((b) => (b.onclick = () => enter(b.dataset.role)));
let registrationMode = false;
$("#registerToggle").onclick = () => {
  registrationMode = !registrationMode;
  $("#formTitle").textContent = registrationMode ? "Create account" : "Member login";
  $("#submitButton").textContent = registrationMode ? "Register" : "Sign in";
  $("#registerToggle").textContent = registrationMode ? "Back to login" : "Register";
  $("#password").hidden = false;
  $("#password").required = true;
  $("#confirmPasswordLabel").hidden = !registrationMode;
  $("#confirmPassword").hidden = !registrationMode;
  $("#confirmPassword").required = registrationMode;
  $("#formMessage").textContent = "";
};
$("#loginForm").onsubmit = async (e) => {
  e.preventDefault();
  const email = $("#email").value.trim();
  const password = $("#password").value;
  const message = $("#formMessage");
  const endpoint = registrationMode ? "/api/register" : "/api/login";
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const data = await response.json();
  if (!response.ok) { message.textContent = data.error || "Request failed."; return; }
  if (registrationMode) {
    message.textContent = "Account created. You can now sign in.";
    $("#registerToggle").click();
    return;
  }
  await enter(data.role, false);
};
$("#signout").onclick = () => {
  fetch("/api/logout", { method: "POST" }).catch(() => {});
  $("#dashboardAccount").hidden = true;
  dashboardView.hidden = true;
  loginView.hidden = false;
};
restoreSession();
