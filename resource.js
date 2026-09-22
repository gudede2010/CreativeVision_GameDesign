async function checkSession() {
  const accessMessage = document.querySelector("#accessMessage");
  const resourceContent = document.querySelector("#resourceContent");
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const authenticated = Boolean(sessionData.session);
    document.querySelector("#resourceAccount").hidden = !authenticated;
    if (authenticated) {
      const account = document.querySelector("#resourceAccount");
      account.hidden = false;
      const user = sessionData.session.user;
      const { data: profile } = await supabaseClient.from("profiles").select("role").eq("id", user.id).single();
      document.querySelector("#resourceAccountName").textContent = user.email;
      document.querySelector("#resourceAccountRole").textContent =
        `${profile?.role || "student"} account`;
      document.querySelector("#resourceSignout").onclick = async () => {
        await supabaseClient.auth.signOut();
        window.location.reload();
      };
    }
    if (!authenticated) {
      window.location.href = "login.html?next=resource.html";
      return;
    }
    accessMessage.hidden = authenticated;
    resourceContent.hidden = !authenticated;
    if (authenticated) {
      await renderResources();
    }
  } catch (error) {
    accessMessage.hidden = false;
    resourceContent.hidden = true;
  }
}

async function renderResources() {
  const { data: resourceData, error } = await supabaseClient.from("resources").select("*").eq("published", true).order("sort_order");
  if (error) throw error;
  const videoData = { lessons: resourceData.filter((item) => item.resource_type === "video").map((item) => ({ lesson: item.lesson, objective: item.objective, title: item.title, url: item.url })) };
  const sections = [
    {
      title: "Video lessons",
      description:
        "Recorded explainers and walkthroughs for the current curriculum.",
      type: "video",
      items: videoData.lessons,
    },
    {
      title: "Course slides",
      description:
        "Downloadable decks for MDA, flow, choice, narrative, and the GDD.",
      type: "slides",
      items: resourceData.filter((item) => item.resource_type === "slide"),
    },
    {
      title: "References",
      description:
        "Selected examples, tools, and prompts for independent exploration.",
      type: "reference",
      items: resourceData.filter((item) => item.resource_type === "reference"),
    },
  ];
  document.querySelector("#resourceList").innerHTML = sections
    .map(
      (section, index) =>
        `<article class="resource-section"><button class="resource-toggle" aria-expanded="false"><span class="section-index">0${index + 1}</span><span><strong>${section.title}</strong><small>${section.description}</small></span><b>+</b></button><div class="resource-detail" hidden>${section.items.map((item) => { const available = section.type === "video"; return `<div class="lesson-row"><div><span class="tag">${item.lesson}</span><strong>${item.objective}</strong></div><div><span>${item.title}</span>${available ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>` : '<span class="unavailable">Not yet available</span>'}</div></div>`; }).join("")}</div></article>`,
    )
    .join("");
  document.querySelectorAll(".resource-toggle").forEach((toggle) =>
    toggle.addEventListener("click", () => {
      const detail = toggle.nextElementSibling;
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.querySelector("b").textContent = open ? "+" : "−";
      detail.hidden = open;
    }),
  );
}

checkSession();
