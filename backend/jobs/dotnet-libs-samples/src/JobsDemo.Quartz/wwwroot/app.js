const api = "/api/quartz";
const $ = (id) => document.getElementById(id);

function formatTime(value) {
  if (!value) {
    return "—";
  }

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
  label.textContent = online ? "scheduler online" : "offline";
}

function renderStats(scheduler, cronJobs, triggers) {
  $("stat-status").textContent = scheduler.status;
  $("stat-jobs").textContent = scheduler.jobCount;
  $("stat-triggers").textContent = scheduler.triggerCount;
  $("stat-cron").textContent = cronJobs.length;

  const heartbeat = (triggers || []).find((trigger) => trigger.name === "heartbeat-trigger");
  const digest = (triggers || []).find((trigger) => trigger.name === "hourly-digest-trigger");
  $("stat-heartbeat").textContent = formatTime(heartbeat?.nextFireTimeUtc);
  $("stat-digest").textContent = formatTime(digest?.nextFireTimeUtc);

  $("heartbeat-next").textContent = formatDateTime(heartbeat?.nextFireTimeUtc);
  $("digest-next").textContent = formatDateTime(digest?.nextFireTimeUtc);
}

function renderActivity(activity) {
  const list = $("activity");
  const entries = activity || [];
  list.querySelector(".empty")?.remove();

  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No runs recorded yet. Schedule a job on the left.";
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

function renderCronJobs(cronJobs) {
  const list = $("cron-list");
  list.replaceChildren();

  if (!cronJobs || cronJobs.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No cron subscriptions yet. Add one above.";
    list.append(empty);
    return;
  }

  for (const job of cronJobs) {
    const row = document.createElement("article");
    row.className = "cron-row";

    const top = document.createElement("div");
    top.className = "cron-top";

    const title = document.createElement("span");
    title.className = "cron-title";
    title.textContent = `cron / ${job.id}`;

    const state = document.createElement("span");
    state.className = `state-pill ${job.triggerState.toLowerCase()}`;
    state.textContent = job.triggerState;

    top.append(title, state);

    const meta = document.createElement("div");
    meta.className = "cron-meta";

    const parts = [
      `to ${job.to}`,
      `cron ${job.cronExpression}`,
      `subject ${job.subject}`,
      `next ${formatDateTime(job.nextFireTimeUtc)}`
    ];

    for (const part of parts) {
      const item = document.createElement("span");
      item.textContent = part;
      meta.append(item);
    }

    const actions = document.createElement("div");
    actions.className = "cron-actions";

    const trigger = document.createElement("button");
    trigger.className = "btn small secondary";
    trigger.type = "button";
    trigger.dataset.action = "trigger";
    trigger.dataset.id = job.id;
    trigger.textContent = "Trigger";

    const pauseState = job.triggerState.toLowerCase() === "paused" ? "resume" : "pause";
    const pause = document.createElement("button");
    pause.className = "btn small secondary";
    pause.type = "button";
    pause.dataset.action = pauseState;
    pause.dataset.id = job.id;
    pause.textContent = pauseState === "resume" ? "Resume" : "Pause";

    const remove = document.createElement("button");
    remove.className = "btn small danger";
    remove.type = "button";
    remove.dataset.action = "delete";
    remove.dataset.id = job.id;
    remove.textContent = "Delete";

    actions.append(trigger, pause, remove);
    row.append(top, meta, actions);
    list.append(row);
  }
}

async function fetchSummary() {
  try {
    const response = await fetch(`${api}/summary`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Summary request failed (${response.status})`);
    }

    const data = await response.json();
    renderStats(data.scheduler, data.cronJobs, data.triggers);
    renderCronJobs(data.cronJobs);
    renderActivity(data.activity);
    renderEmails(data.emails);
    setStatus(true);
  } catch (error) {
    setStatus(false);
    throw error;
  }
}

async function request(path, method, body) {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
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

$("one-off-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    to: $("one-to").value.trim(),
    subject: $("one-subject").value.trim(),
    body: $("one-body").value.trim(),
    delaySeconds: Math.min(600, Math.max(1, Number($("one-delay").value) || 8))
  };

  await runAction(
    $("one-button"),
    () => request(`${api}/one-off`, "POST", payload),
    "Simple trigger scheduled."
  );
});

$("cron-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    to: $("cron-to").value.trim(),
    subject: $("cron-subject").value.trim(),
    body: $("cron-body").value.trim(),
    cronExpression: $("cron-expression").value.trim()
  };

  await runAction(
    $("cron-button"),
    () => request(`${api}/cron`, "POST", payload),
    "Cron subscription created."
  );
});

$("cron-list").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const { action, id } = button.dataset;
  const path = `${api}/cron/${id}`;

  if (action === "delete") {
    await runAction(button, () => request(path, "DELETE"), "Cron subscription deleted.");
    return;
  }

  await runAction(
    button,
    () => request(`${path}/${action}`, "POST", {}),
    `Cron subscription ${action === "trigger" ? "triggered" : `${action}d`}.`
  );
});

function tickClock() {
  $("clock").textContent = `UTC ${new Date().toISOString().slice(11, 19)}`;
}

tickClock();
window.setInterval(tickClock, 1000);
fetchSummary().catch(() => {});
window.setInterval(() => fetchSummary().catch(() => {}), 3000);
