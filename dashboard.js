const state = { role: "student", data: null, currentWeek: null };
const $ = (s) => document.querySelector(s);
const dashboardView = $("#dashboardView");
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
      `<small>Studio updates</small><h2>Announcements</h2><div class="announcement-list">${(state.data.announcements || []).map((u) => `<div class="announcement"><time>${u.date}</time><p>${u.text}</p></div>`).join("") || '<p class="empty-deadline">No announcements yet.</p>'}</div>`,
      "wide",
    );
}
async function enter(role, createSession = true) {
  state.role = role;
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
  const [weeksResult, deadlinesResult, announcementsResult] = await Promise.all([
    supabaseClient.from("weeks").select("*").order("week_number"),
    supabaseClient.from("deadlines").select("*").order("sort_order"),
    supabaseClient.from("announcements").select("*").order("created_at"),
  ]);
  if (weeksResult.error) throw weeksResult.error;
  const deadlinesByWeek = {};
  (deadlinesResult.data || []).forEach((deadline) => {
    (deadlinesByWeek[deadline.week_id] ||= []).push({ title: deadline.title, date: deadline.deadline_date });
  });
  state.data = {
    announcements: (announcementsResult.data || []).map((item) => ({ date: item.announcement_date, text: item.text })),
    weeks: weeksResult.data.map((week) => ({
      week: `Week ${week.week_number}`, meetingDate: week.meeting_date,
      meeting: { time: week.meeting_time, topic: week.topic, prepare: week.preparation },
      deadlines: deadlinesByWeek[week.id] || [],
      weekDisplay: { title: week.week_title, body: week.week_body, status: week.week_status },
      project: { title: week.project_title, percent: week.project_percent, explanation: week.project_explanation },
    })),
  };
  const index = getCurrentWeekIndex(state.data.weeks);
  state.currentWeek = state.data.weeks[index];
  render();
}
async function restoreSession() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
      window.location.href = "login.html?next=dashboard.html";
      return;
    }
    const { data: profile } = await supabaseClient.from("profiles").select("role,email").eq("id", data.session.user.id).single();
    await enter(profile?.role || "student", false);
  } catch (error) {
    console.warn("Session restore unavailable", error);
  }
}
$("#signout").onclick = () => {
  supabaseClient.auth.signOut();
  $("#dashboardAccount").hidden = true;
  dashboardView.hidden = true;
  window.location.href = "login.html?next=dashboard.html";
};
restoreSession();
