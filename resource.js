async function checkSession() {
  const accessMessage = document.querySelector("#accessMessage");
  const resourceContent = document.querySelector("#resourceContent");
  try {
    const response = await fetch("/api/session");
    const session = await response.json();
    const authenticated = session.authenticated === true;
    document.querySelector("#resourceAccount").hidden = !authenticated;
    if (authenticated) {
      const account = document.querySelector("#resourceAccount");
      account.hidden = false;
      document.querySelector("#resourceAccountName").textContent =
        session.email;
      document.querySelector("#resourceAccountRole").textContent =
        `${session.role} account`;
      document.querySelector("#resourceSignout").onclick = async () => {
        await fetch("/api/logout", { method: "POST" });
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
  const videoData = await fetch("video_lessons.json").then((response) =>
    response.json(),
  );
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
      items: [
        {
          lesson: "Lesson 01",
          objective: "Game design foundations.",
          title: "Foundations slides",
        },
        {
          lesson: "Lesson 02",
          objective: "Turn an idea into a structured GDD.",
          title: "GDD presentation guide",
        },
      ],
    },
    {
      title: "References",
      description:
        "Selected examples, tools, and prompts for independent exploration.",
      type: "reference",
      items: [
        {
          lesson: "Reference 01",
          objective: "Study how games communicate feedback.",
          title: "Game feel reference shelf",
        },
        {
          lesson: "Reference 02",
          objective: "Prepare a focused prototype for playtesting.",
          title: "Prototype checklist",
        },
      ],
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
