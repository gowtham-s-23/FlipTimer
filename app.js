(() => {
  const STORAGE_KEY = "flip-timer-state";

  const els = {
    taskLabel: document.getElementById("taskLabel"),
    startPauseBtn: document.getElementById("startPauseBtn"),
    resetBtn: document.getElementById("resetBtn"),
    setupBtn: document.getElementById("setupBtn"),
    setupPanel: document.getElementById("setupPanel"),
    themeBtn: document.getElementById("themeBtn"),
    transparentBtn: document.getElementById("transparentBtn"),
    transparentToggle: document.getElementById("transparentToggle"),
    exitTransparentBtn: document.getElementById("exitTransparentBtn"),
    minimizeBtn: document.getElementById("minimizeBtn"),
    closeBtn: document.getElementById("closeBtn"),
    taskInput: document.getElementById("taskInput"),
    hoursInput: document.getElementById("hoursInput"),
    minutesInput: document.getElementById("minutesInput"),
    secondsInput: document.getElementById("secondsInput"),
    applyBtn: document.getElementById("applyBtn"),
    flipClock: document.getElementById("flipClock"),
  };

  const digitNodes = {
    hours: [],
    minutes: [],
    seconds: [],
  };

  let totalSeconds = 25 * 60;
  let remaining = totalSeconds;
  let running = false;
  let tickId = null;
  let task = "";
  let theme = "dark";
  let transparent = false;
  let setupOpen = false;
  let currentDigits = { hours: "00", minutes: "00", seconds: "00" };
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtx = new AudioContextClass();
    }
    return audioCtx;
  }

  function unlockAudio() {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  function playTone(ctx, frequency, startAt, duration, gainValue) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  function playDoneSound() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const play = () => {
      const now = ctx.currentTime;
      // Three rising chimes so it's hard to miss
      playTone(ctx, 523.25, now, 0.22, 0.22);
      playTone(ctx, 659.25, now + 0.18, 0.22, 0.2);
      playTone(ctx, 783.99, now + 0.36, 0.35, 0.24);
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(play).catch(() => {});
      return;
    }
    play();
  }

  function pad2(n) {
    return String(Math.max(0, n)).padStart(2, "0");
  }

  function splitTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return {
      hours: pad2(h),
      minutes: pad2(m),
      seconds: pad2(s),
    };
  }

  function createFlipCard(value) {
    const card = document.createElement("div");
    card.className = "flip-card";
    card.innerHTML = `
      <div class="static top"><span>${value}</span></div>
      <div class="static bottom"><span>${value}</span></div>
    `;
    return card;
  }

  function mountDigitPairs() {
    document.querySelectorAll(".digit-pair").forEach((pair) => {
      const key = pair.dataset.pair;
      pair.innerHTML = "";
      digitNodes[key] = [createFlipCard("0"), createFlipCard("0")];
      digitNodes[key].forEach((card) => pair.appendChild(card));
    });
  }

  function setCardValue(card, value) {
    card.querySelectorAll("span").forEach((span) => {
      span.textContent = value;
    });
  }

  function flipDigit(card, nextValue) {
    const top = card.querySelector(".static.top span");
    const bottom = card.querySelector(".static.bottom span");
    const current = top.textContent;
    if (current === nextValue) return;

    card.querySelectorAll(".flip-top, .flip-bottom").forEach((n) => n.remove());

    const flipTop = document.createElement("div");
    flipTop.className = "flip-top";
    flipTop.innerHTML = `<span>${current}</span>`;

    const flipBottom = document.createElement("div");
    flipBottom.className = "flip-bottom";
    flipBottom.innerHTML = `<span>${nextValue}</span>`;

    top.textContent = nextValue;
    card.appendChild(flipTop);
    card.appendChild(flipBottom);

    flipTop.addEventListener("animationend", () => {
      flipTop.remove();
    });

    flipBottom.addEventListener("animationend", () => {
      bottom.textContent = nextValue;
      flipBottom.remove();
    });
  }

  function renderTime(seconds, animate) {
    const next = splitTime(seconds);
    ["hours", "minutes", "seconds"].forEach((unit) => {
      const nextPair = next[unit];
      const prevPair = currentDigits[unit];
      for (let i = 0; i < 2; i += 1) {
        const card = digitNodes[unit][i];
        const digit = nextPair[i];
        if (!animate || prevPair[i] === digit) {
          setCardValue(card, digit);
        } else {
          flipDigit(card, digit);
        }
      }
      currentDigits[unit] = nextPair;
    });
  }

  function updateTaskLabel() {
    const text = task.trim();
    els.taskLabel.textContent = text || "No task set";
    els.taskLabel.classList.toggle("has-task", Boolean(text));
  }

  function updateStartButton() {
    if (remaining <= 0) {
      els.startPauseBtn.textContent = "Done";
      els.startPauseBtn.disabled = true;
      return;
    }
    els.startPauseBtn.disabled = false;
    els.startPauseBtn.textContent = running ? "Pause" : "Start";
  }

  function persist() {
    const payload = {
      totalSeconds,
      remaining,
      task,
      theme,
      transparent,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.totalSeconds === "number") totalSeconds = data.totalSeconds;
      if (typeof data.remaining === "number") remaining = data.remaining;
      if (typeof data.task === "string") task = data.task;
      if (data.theme === "light" || data.theme === "dark") theme = data.theme;
      if (typeof data.transparent === "boolean") transparent = data.transparent;
    } catch {
      // ignore corrupt storage
    }
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function applyTransparent() {
    document.documentElement.setAttribute("data-transparent", transparent ? "true" : "false");
    els.transparentBtn.setAttribute("aria-pressed", transparent ? "true" : "false");
    els.transparentBtn.classList.toggle("active", transparent);
    els.transparentToggle.checked = transparent;

    if (transparent && setupOpen) {
      setupOpen = false;
      els.setupPanel.hidden = true;
    }

    if (window.flipTimer?.resizeForTransparent) {
      window.flipTimer.resizeForTransparent(transparent);
    } else if (!transparent && window.flipTimer?.resizeForSetup) {
      window.flipTimer.resizeForSetup(setupOpen);
    }
  }

  function fillInputsFromDuration(seconds) {
    const parts = splitTime(seconds);
    els.hoursInput.value = Number(parts.hours);
    els.minutesInput.value = Number(parts.minutes);
    els.secondsInput.value = Number(parts.seconds);
    els.taskInput.value = task;
  }

  function stopTicker() {
    if (tickId) {
      clearInterval(tickId);
      tickId = null;
    }
    running = false;
    updateStartButton();
  }

  function onComplete() {
    stopTicker();
    remaining = 0;
    renderTime(0, true);
    els.flipClock.classList.add("done");
    updateStartButton();
    persist();
    playDoneSound();

    try {
      if (window.Notification && Notification.permission === "granted") {
        new Notification("Flip Timer", {
          body: task.trim() ? `Time's up: ${task}` : "Time's up!",
        });
      }
    } catch {
      // notifications optional
    }
  }

  function tick() {
    if (remaining <= 0) {
      onComplete();
      return;
    }
    remaining -= 1;
    renderTime(remaining, true);
    persist();
    if (remaining <= 0) {
      onComplete();
    }
  }

  function start() {
    if (remaining <= 0) return;
    unlockAudio();
    els.flipClock.classList.remove("done");
    running = true;
    updateStartButton();
    tickId = setInterval(tick, 1000);
  }

  function pause() {
    stopTicker();
    persist();
  }

  function reset() {
    stopTicker();
    remaining = totalSeconds;
    els.flipClock.classList.remove("done");
    renderTime(remaining, false);
    updateStartButton();
    persist();
  }

  function setDurationFromInputs() {
    const h = Math.min(99, Math.max(0, Number(els.hoursInput.value) || 0));
    const m = Math.min(59, Math.max(0, Number(els.minutesInput.value) || 0));
    const s = Math.min(59, Math.max(0, Number(els.secondsInput.value) || 0));
    const next = h * 3600 + m * 60 + s;
    if (next <= 0) {
      els.minutesInput.focus();
      return false;
    }
    totalSeconds = next;
    remaining = next;
    task = els.taskInput.value.trim();
    return true;
  }

  function toggleSetup(force) {
    if (transparent) return;
    setupOpen = typeof force === "boolean" ? force : !setupOpen;
    els.setupPanel.hidden = !setupOpen;
    if (window.flipTimer?.resizeForSetup) {
      window.flipTimer.resizeForSetup(setupOpen);
    }
    if (setupOpen) {
      fillInputsFromDuration(totalSeconds);
      els.transparentToggle.checked = transparent;
      els.taskInput.focus();
    }
  }

  function requestNotifyPermission() {
    if (!window.Notification || Notification.permission !== "default") return;
    Notification.requestPermission().catch(() => {});
  }

  // Wire UI
  els.startPauseBtn.addEventListener("click", () => {
    requestNotifyPermission();
    if (running) pause();
    else start();
  });

  els.resetBtn.addEventListener("click", reset);

  els.setupBtn.addEventListener("click", () => toggleSetup());

  els.applyBtn.addEventListener("click", () => {
    if (!setDurationFromInputs()) return;
    transparent = els.transparentToggle.checked;
    stopTicker();
    els.flipClock.classList.remove("done");
    updateTaskLabel();
    applyTransparent();
    renderTime(remaining, false);
    updateStartButton();
    persist();
    toggleSetup(false);
  });

  document.querySelectorAll(".preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mins = Number(btn.dataset.mins);
      els.hoursInput.value = Math.floor(mins / 60);
      els.minutesInput.value = mins % 60;
      els.secondsInput.value = 0;
    });
  });

  els.themeBtn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme();
    persist();
  });

  function setTransparent(enabled) {
    transparent = Boolean(enabled);
    applyTransparent();
    persist();
  }

  els.transparentBtn.addEventListener("click", () => {
    setTransparent(!transparent);
  });

  els.exitTransparentBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setTransparent(false);
  });

  els.transparentToggle.addEventListener("change", () => {
    setTransparent(els.transparentToggle.checked);
  });

  // Backup: double-click the clock to leave transparent mode
  els.flipClock.addEventListener("dblclick", () => {
    if (transparent) setTransparent(false);
  });

  els.minimizeBtn.addEventListener("click", () => {
    window.flipTimer?.minimize();
  });

  els.closeBtn.addEventListener("click", () => {
    window.flipTimer?.close();
  });

  ["hoursInput", "minutesInput", "secondsInput"].forEach((id) => {
    els[id].addEventListener("keydown", (e) => {
      if (e.key === "Enter") els.applyBtn.click();
    });
  });

  els.taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.applyBtn.click();
  });

  // Boot
  mountDigitPairs();
  loadState();
  applyTheme();
  applyTransparent();
  updateTaskLabel();
  renderTime(remaining, false);
  updateStartButton();
  fillInputsFromDuration(totalSeconds);

  if (window.flipTimer?.setAlwaysOnTop) {
    window.flipTimer.setAlwaysOnTop(true);
  }
})();
