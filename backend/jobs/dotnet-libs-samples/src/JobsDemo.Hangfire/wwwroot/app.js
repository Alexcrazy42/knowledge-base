const api = "/api/hangfire";
const $ = (id) => document.getElementById(id);
const form = $("dispatch-form");
const delayInput = $("delay");
const delayButton = $("delay-button");

function readPayload() {
  return {
    to: $("to").value.trim(),
    subject: $("subject").value.trim(),
    body: $("body").value.trim()
  };
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function setStatus(online) {
  const status = $("connection-status");
  const label = $("connection-label");
  status.classList.toggle("online", online);
  status.classList.toggle("offline", !online);
  label.textContent = online ? "postgres online" : "offline";
}

function setText(id, value) {
  $(id).textContent = value ?? "0";
}

function renderStats(stats) {
  setText("stat-enqueued", stats.enqueued);
  setText("stat-scheduled", stats.scheduled);
  setText("stat-processing", stats.processing);
  setText("stat-succeeded", stats.succeeded);
  setText("stat-failed", stats.failed);
  setText("stat-servers", stats.servers);
}

function renderRecurring(recurringJobs) {
  const job = (recurringJobs || []).find((item) => item.id === "hourly-digest");
  if (!job) {
    $("recurring-state").textContent = "missing";
    $("recurring-state").className = "state-pill error";
    $("recurring-next").textContent = "—";
    $("recurring-last").textContent = "—";
    return;
  }

  $("recurring-state").textContent = job.lastJobState || "scheduled";
  $("recurring-state").className = `state-pill ${(job.lastJobState || "normal").toLowerCase()}`;
  $("recurring-next").textContent = formatDateTime(job.nextExecution);
  $("recurring-last").textContent = formatDateTime(job.lastExecution);
}

function renderActivity(activity) {
  const list = $("activity");
  const entries = activity || [];
  list.querySelector(".empty")?.remove();

  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No runs recorded yet. Dispatch a job above.";
    list.replaceChildren(empty);
    return;
  }

  const existing = new Map(
    [...list.querySelectorAll(".activity-row")].map((row) => [row.dataset.id, row])
  );
  const visibleIds = new Set(entries.map((entry) => String(entry.id)));

  for (const [id, row] of existing) {
    if (!visibleIds.has(id)) {
      row.remove();
    }
  }

  for (const entry of entries) {
    const id = String(entry.id);
    let row = existing.get(id);

    if (!row) {
      row = document.createElement("li");
      row.className = "activity-row is-new";
      row.dataset.id = id;
      row.addEventListener("animationend", () => row.classList.remove("is-new"), { once: true });

      const time = document.createElement("span");
      time.className = "activity-time";
      time.textContent = formatTime(entry.createdAt);

      const badge = document.createElement("span");
      badge.className = `badge ${entry.source}`;
      badge.textContent = entry.source;

      const copy = document.createElement("span");
      copy.className = "activity-copy";

      const job = document.createElement("span");
      job.className = "activity-job";
      job.textContent = entry.jobName;

      const detail = document.createElement("span");
      detail.className = "activity-detail";
      detail.textContent = entry.detail;

      copy.append(job, detail);
      row.append(time, badge, copy);
    }

    list.append(row);
  }
}

function renderEmails(emails) {
  const outbox = $("outbox");
  outbox.replaceChildren();

  const count = emails?.length || 0;
  $("outbox-count").textContent = `${count} message${count === 1 ? "" : "s"}`;

  if (count === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "The outbox is empty.";
    outbox.append(empty);
    return;
  }

  for (const email of emails) {
    const card = document.createElement("article");
    card.className = "email-card";

    const time = document.createElement("span");
    time.className = "email-time";
    time.textContent = formatTime(email.sentAt);

    const subject = document.createElement("span");
    subject.className = "email-subject";
    subject.textContent = email.subject;

    const to = document.createElement("span");
    to.className = "email-to";
    to.textContent = email.to;

    card.append(time, subject, to);
    outbox.append(card);
  }
}

async function fetchSummary() {
  try {
    const response = await fetch(`${api}/summary`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Summary request failed (${response.status})`);
    }

    const data = await response.json();
    renderStats(data.stats);
    renderRecurring(data.recurringJobs);
    renderActivity(data.activity);
    renderEmails(data.emails);
    setStatus(true);
  } catch (error) {
    setStatus(false);
    throw error;
  }
}

async function post(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.textContent = message;
  $("toasts").append(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 4200);
}

async function runAction(button, action, successMessage) {
  button.disabled = true;
  try {
    await action();
    showToast(successMessage);
    await fetchSummary();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    button.disabled = false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runAction(
    $("fire-button"),
    () => post(`${api}/fire-and-forget`, readPayload()),
    "Job enqueued. Watch the run sheet."
  );
});

delayButton.addEventListener("click", async () => {
  const delaySeconds = Math.min(600, Math.max(1, Number(delayInput.value) || 15));
  await runAction(
    delayButton,
    () => post(`${api}/delayed`, { ...readPayload(), delaySeconds }),
    `Job scheduled in ${delaySeconds} seconds.`
  );
});

$("trigger-recurring").addEventListener("click", async () => {
  const button = $("trigger-recurring");
  await runAction(
    button,
    () => post(`${api}/recurring/hourly-digest/trigger`, {}),
    "Recurring job triggered."
  );
});

delayInput.addEventListener("input", () => {
  const value = Math.min(600, Math.max(1, Number(delayInput.value) || 15));
  delayButton.textContent = `Delay ${value}s`;
});

function tickClock() {
  $("clock").textContent = `UTC ${new Date().toISOString().slice(11, 19)}`;
}

tickClock();
window.setInterval(tickClock, 1000);
fetchSummary().catch(() => {});
window.setInterval(() => fetchSummary().catch(() => {}), 3000);
