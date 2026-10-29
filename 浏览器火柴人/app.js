const STORAGE_KEY = "rest-a-while-state-v1";
const FULL_DASH = 653.45;

const defaultState = {
  mode: "focus",
  focusMinutes: 25,
  breakMinutes: 5,
  remaining: 25 * 60,
  running: false,
  todos: [
    { id: crypto.randomUUID(), text: "整理一个最重要的任务", done: false },
    { id: crypto.randomUUID(), text: "完成一段无打扰专注", done: false }
  ],
  sessions: [],
  efficiency: 82,
  noise: "rain",
  volume: 35,
  accent: "#2f8f83",
  customBg: ""
};

const els = {
  modePill: document.querySelector("#modePill"),
  todayTotal: document.querySelector("#todayTotal"),
  streakText: document.querySelector("#streakText"),
  sessionTitle: document.querySelector("#sessionTitle"),
  switchModeBtn: document.querySelector("#switchModeBtn"),
  timerRing: document.querySelector("#timerRing"),
  ringProgress: document.querySelector("#ringProgress"),
  timeLeft: document.querySelector("#timeLeft"),
  focusMinutes: document.querySelector("#focusMinutes"),
  breakMinutes: document.querySelector("#breakMinutes"),
  startPauseBtn: document.querySelector("#startPauseBtn"),
  completeBtn: document.querySelector("#completeBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  noiseToggle: document.querySelector("#noiseToggle"),
  noiseChips: document.querySelectorAll(".noise-chip"),
  volumeRange: document.querySelector("#volumeRange"),
  bgUpload: document.querySelector("#bgUpload"),
  accentColor: document.querySelector("#accentColor"),
  clearBgBtn: document.querySelector("#clearBgBtn"),
  efficiencyRange: document.querySelector("#efficiencyRange"),
  efficiencyValue: document.querySelector("#efficiencyValue"),
  avgEfficiency: document.querySelector("#avgEfficiency"),
  todoForm: document.querySelector("#todoForm"),
  todoInput: document.querySelector("#todoInput"),
  todoList: document.querySelector("#todoList"),
  todoCounter: document.querySelector("#todoCounter"),
  timeline: document.querySelector("#timeline"),
  clearHistoryBtn: document.querySelector("#clearHistoryBtn"),
  focusCount: document.querySelector("#focusCount"),
  focusTotal: document.querySelector("#focusTotal"),
  bestPeriod: document.querySelector("#bestPeriod"),
  periodBars: document.querySelector("#periodBars"),
  heatmap: document.querySelector("#heatmap")
};

let state = loadState();
let tickId = null;
let audioContext = null;
let noiseNodes = null;
let noisePlaying = false;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultState, ...saved, running: false };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, running: false }));
}

function getDurationSeconds(mode = state.mode) {
  return (mode === "focus" ? state.focusMinutes : state.breakMinutes) * 60;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatClock(iso) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function sameDate(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function minutesLabel(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${rest}m` : `${hours}h`;
}

function setMode(mode) {
  state.mode = mode;
  state.remaining = getDurationSeconds(mode);
  state.running = false;
  stopTimer();
  render();
  saveState();
}

function startTimer() {
  if (state.running) return;
  state.running = true;
  tickId = window.setInterval(() => {
    state.remaining -= 1;
    if (state.remaining <= 0) {
      completeSession();
      return;
    }
    renderTimer();
  }, 1000);
  render();
}

function stopTimer() {
  state.running = false;
  window.clearInterval(tickId);
  tickId = null;
}

function resetTimer() {
  stopTimer();
  state.remaining = getDurationSeconds();
  render();
  saveState();
}

function completeSession() {
  const duration = getDurationSeconds();
  const elapsed = Math.max(60, duration - state.remaining);
  const now = new Date();
  const completedMode = state.mode;
  state.sessions.unshift({
    id: crypto.randomUUID(),
    mode: completedMode,
    minutes: Math.max(1, Math.round(elapsed / 60)),
    efficiency: completedMode === "focus" ? state.efficiency : null,
    at: now.toISOString()
  });
  state.sessions = state.sessions.slice(0, 180);
  const nextMode = completedMode === "focus" ? "break" : "focus";
  state.mode = nextMode;
  state.remaining = getDurationSeconds(nextMode);
  stopTimer();
  notifyDone();
  render();
  saveState();
}

function notifyDone() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(state.mode === "break" ? "休息一下" : "回到专注", {
      body: state.mode === "break" ? "这一段完成了，起来活动一下。" : "休息结束，可以开始下一段。"
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

function createNoiseBuffer(type) {
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * 2;
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (type === "rain") {
      last = (last + 0.018 * white) / 1.018;
      data[i] = last * 3.2;
    } else if (type === "wind") {
      last = 0.94 * last + 0.06 * white;
      data[i] = last * 1.8;
    } else {
      data[i] = white * (Math.random() > 0.985 ? 0.8 : 0.18);
    }
  }
  return buffer;
}

function startNoise() {
  audioContext ||= new AudioContext();
  stopNoise(false);
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  source.buffer = createNoiseBuffer(state.noise);
  source.loop = true;
  filter.type = state.noise === "cafe" ? "bandpass" : "lowpass";
  filter.frequency.value = state.noise === "cafe" ? 720 : state.noise === "wind" ? 420 : 1200;
  gain.gain.value = state.volume / 100;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  source.start();
  noiseNodes = { source, gain };
  noisePlaying = true;
  renderNoise();
}

function stopNoise(update = true) {
  if (noiseNodes) {
    noiseNodes.source.stop();
    noiseNodes = null;
  }
  noisePlaying = false;
  if (update) renderNoise();
}

function toggleNoise() {
  if (noisePlaying) stopNoise();
  else startNoise();
}

function addTodo(text) {
  const clean = text.trim();
  if (!clean) return;
  state.todos.unshift({ id: crypto.randomUUID(), text: clean, done: false });
  state.todos = state.todos.slice(0, 24);
  els.todoInput.value = "";
  renderTodos();
  saveState();
}

function toggleTodo(id) {
  state.todos = state.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo));
  renderTodos();
  saveState();
}

function deleteTodo(id) {
  state.todos = state.todos.filter((todo) => todo.id !== id);
  renderTodos();
  saveState();
}

function getFocusSessions() {
  return state.sessions.filter((session) => session.mode === "focus");
}

function renderTimer() {
  const duration = getDurationSeconds();
  const progress = 1 - state.remaining / duration;
  els.timeLeft.textContent = formatTime(state.remaining);
  els.ringProgress.style.strokeDashoffset = String(FULL_DASH * (1 - progress));
}

function renderNoise() {
  els.noiseToggle.textContent = noisePlaying ? "Ⅱ" : "▶";
  els.noiseToggle.title = noisePlaying ? "暂停白噪音" : "播放白噪音";
  els.noiseChips.forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.noise === state.noise);
  });
}

function renderTodos() {
  const done = state.todos.filter((todo) => todo.done).length;
  els.todoCounter.textContent = `${done}/${state.todos.length}`;
  els.todoList.innerHTML = "";
  if (!state.todos.length) {
    els.todoList.innerHTML = `<li class="empty">今天还没有任务。</li>`;
    return;
  }
  state.todos.forEach((todo) => {
    const item = document.createElement("li");
    item.className = `todo-item${todo.done ? " done" : ""}`;
    item.innerHTML = `
      <button class="todo-check" type="button" title="切换完成">${todo.done ? "✓" : ""}</button>
      <span></span>
      <button class="todo-delete" type="button" title="删除">×</button>
    `;
    item.querySelector("span").textContent = todo.text;
    item.querySelector(".todo-check").addEventListener("click", () => toggleTodo(todo.id));
    item.querySelector(".todo-delete").addEventListener("click", () => deleteTodo(todo.id));
    els.todoList.appendChild(item);
  });
}

function renderTimeline() {
  els.timeline.innerHTML = "";
  if (!state.sessions.length) {
    els.timeline.innerHTML = `<div class="empty">完成一段专注或休息后，这里会生成时间线。</div>`;
    return;
  }
  state.sessions.slice(0, 10).forEach((session) => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.innerHTML = `
      <span class="timeline-time">${formatClock(session.at)}</span>
      <span class="timeline-kind">${session.mode === "focus" ? "专注" : "休息"} · ${session.minutes} 分钟</span>
      <span class="timeline-score">${session.efficiency ? `${session.efficiency}%` : "恢复"}</span>
    `;
    els.timeline.appendChild(item);
  });
}

function renderStats() {
  const focusSessions = getFocusSessions();
  const total = focusSessions.reduce((sum, item) => sum + item.minutes, 0);
  const today = focusSessions.filter((item) => sameDate(item.at, new Date())).reduce((sum, item) => sum + item.minutes, 0);
  const avg = focusSessions.length
    ? Math.round(focusSessions.reduce((sum, item) => sum + item.efficiency, 0) / focusSessions.length)
    : 0;
  els.todayTotal.textContent = `今日 ${today} 分钟`;
  els.focusCount.textContent = String(focusSessions.length);
  els.focusTotal.textContent = minutesLabel(total);
  els.avgEfficiency.textContent = `${avg}%`;
  els.streakText.textContent = `连续 ${calculateStreak()} 天`;
  renderPeriodBars(focusSessions);
  renderHeatmap(focusSessions);
}

function calculateStreak() {
  const days = new Set(getFocusSessions().map((session) => new Date(session.at).toDateString()));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderPeriodBars(focusSessions) {
  const periods = [
    { label: "上午", range: [6, 12], value: 0 },
    { label: "下午", range: [12, 18], value: 0 },
    { label: "夜间", range: [18, 24], value: 0 }
  ];
  focusSessions.forEach((session) => {
    const hour = new Date(session.at).getHours();
    const period = periods.find((item) => hour >= item.range[0] && hour < item.range[1]);
    if (period) period.value += session.minutes;
  });
  const max = Math.max(1, ...periods.map((item) => item.value));
  const best = periods.reduce((winner, item) => (item.value > winner.value ? item : winner), periods[0]);
  els.bestPeriod.textContent = best.value ? best.label : "--";
  els.periodBars.innerHTML = "";
  periods.forEach((period) => {
    const row = document.createElement("div");
    row.className = "period-row";
    row.innerHTML = `
      <span>${period.label}</span>
      <div class="period-track"><div class="period-fill" style="width:${(period.value / max) * 100}%"></div></div>
      <span>${period.value}m</span>
    `;
    els.periodBars.appendChild(row);
  });
}

function renderHeatmap(focusSessions) {
  const byDay = new Map();
  focusSessions.forEach((session) => {
    const key = new Date(session.at).toDateString();
    byDay.set(key, (byDay.get(key) || 0) + session.minutes);
  });
  els.heatmap.innerHTML = "";
  for (let i = 34; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const minutes = byDay.get(day.toDateString()) || 0;
    const level = Math.min(88, Math.round((minutes / 120) * 88));
    const cell = document.createElement("div");
    cell.className = "heat-cell";
    cell.style.setProperty("--level", `${level}%`);
    cell.title = `${day.toLocaleDateString("zh-CN")} · ${minutes} 分钟`;
    els.heatmap.appendChild(cell);
  }
}

function renderTheme() {
  document.documentElement.style.setProperty("--accent", state.accent);
  els.accentColor.value = state.accent;
  if (state.customBg) {
    document.body.style.setProperty("--custom-bg", `url(${state.customBg})`);
  } else {
    document.body.style.removeProperty("--custom-bg");
  }
}

function render() {
  els.modePill.textContent = state.mode === "focus" ? "专注中" : "休息中";
  els.modePill.className = `pill ${state.mode}`;
  els.sessionTitle.textContent = state.mode === "focus" ? "深度专注" : "恢复休息";
  els.startPauseBtn.textContent = state.running ? "暂停" : state.mode === "focus" ? "开始专注" : "开始休息";
  els.focusMinutes.value = state.focusMinutes;
  els.breakMinutes.value = state.breakMinutes;
  els.efficiencyRange.value = state.efficiency;
  els.efficiencyValue.textContent = `${state.efficiency}%`;
  els.volumeRange.value = state.volume;
  renderTimer();
  renderNoise();
  renderTheme();
  renderTodos();
  renderTimeline();
  renderStats();
}

els.startPauseBtn.addEventListener("click", () => {
  if (state.running) {
    stopTimer();
    render();
    saveState();
  } else {
    startTimer();
  }
});

els.resetBtn.addEventListener("click", resetTimer);
els.completeBtn.addEventListener("click", completeSession);
els.switchModeBtn.addEventListener("click", () => setMode(state.mode === "focus" ? "break" : "focus"));

els.focusMinutes.addEventListener("change", () => {
  state.focusMinutes = Math.max(1, Math.min(180, Number(els.focusMinutes.value) || 25));
  if (state.mode === "focus") resetTimer();
  saveState();
});

els.breakMinutes.addEventListener("change", () => {
  state.breakMinutes = Math.max(1, Math.min(60, Number(els.breakMinutes.value) || 5));
  if (state.mode === "break") resetTimer();
  saveState();
});

els.noiseToggle.addEventListener("click", toggleNoise);
els.noiseChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    state.noise = chip.dataset.noise;
    if (noisePlaying) startNoise();
    renderNoise();
    saveState();
  });
});

els.volumeRange.addEventListener("input", () => {
  state.volume = Number(els.volumeRange.value);
  if (noiseNodes) noiseNodes.gain.gain.value = state.volume / 100;
  saveState();
});

els.todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo(els.todoInput.value);
});

els.efficiencyRange.addEventListener("input", () => {
  state.efficiency = Number(els.efficiencyRange.value);
  els.efficiencyValue.textContent = `${state.efficiency}%`;
  saveState();
});

els.accentColor.addEventListener("input", () => {
  state.accent = els.accentColor.value;
  renderTheme();
  saveState();
});

els.bgUpload.addEventListener("change", () => {
  const file = els.bgUpload.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.customBg = String(reader.result);
    renderTheme();
    saveState();
  });
  reader.readAsDataURL(file);
});

els.clearBgBtn.addEventListener("click", () => {
  state.customBg = "";
  renderTheme();
  saveState();
});

els.clearHistoryBtn.addEventListener("click", () => {
  state.sessions = [];
  renderTimeline();
  renderStats();
  saveState();
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea")) return;
  if (event.code === "Space") {
    event.preventDefault();
    els.startPauseBtn.click();
  }
  if (event.key.toLowerCase() === "n") toggleNoise();
  if (event.key.toLowerCase() === "t") els.todoInput.focus();
  if (event.key.toLowerCase() === "r") resetTimer();
});

window.addEventListener("beforeunload", () => {
  stopNoise(false);
  saveState();
});

render();
