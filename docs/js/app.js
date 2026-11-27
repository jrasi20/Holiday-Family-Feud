// Christmas Bible Survey Showdown: TV / HOST SCREEN
// The TV is a 1600x900 broadcast stage scaled to fit. Phones join by QR:
// players get team buzzers, the host gets a private answer remote.
import { SURVEY_BANK, FAST_MONEY_BANK, CHALLENGE_BANK, CAROLS, SKETCH_WORDS, shuffle } from "./data.js";
import { audio } from "./audio.js";
import { startSnow, confetti, confettiRain, countUp } from "./fx.js";
import { Room, joinUrl } from "./net.js";
import { matchAnswer } from "./match.js";

/* ================= state ================= */
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem("css-" + k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("css-" + k, JSON.stringify(v)); } catch {} }
};
const S = {
  teams: store.get("teams2", [{ name: "Bethlehem" }, { name: "Nazareth" }]),
  settings: Object.assign({ rounds: 5, mix: "Mixed", timer: 0, sfx: true, music: true }, store.get("settings2", {}))
};
const save = () => { store.set("teams2", S.teams); store.set("settings2", S.settings); };
audio.setSfx(S.settings.sfx); audio.setMusic(S.settings.music);
const STRIKES = 3;

const stage = document.getElementById("scene-root");      // screens draw here
const stageBox = document.getElementById("stage");       // the scaled 16:9 frame (shake target)
const cardLayer = document.getElementById("card-layer");  // broadcast cards live above, untouched by redraws
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tName = t => S.teams[t]?.name?.trim() || (t ? "Team 2" : "Team 1");
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ================= 16:9 stage scaling ================= */
function fit() {
  const s = Math.min(innerWidth / 1600, innerHeight / 900);
  document.documentElement.style.setProperty("--s", s);
  document.body.classList.toggle("portrait-phone", innerHeight > innerWidth && innerWidth < 700);
}
addEventListener("resize", fit); fit();

/* ================= icons ================= */
const I = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="ln" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="ln" d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.9 3.3 1.4-6.6-5-4.5 6.6-.7z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M3 5.5C5.5 4 8.5 4 11.2 5.6V20c-2.7-1.6-5.7-1.6-8.2-.1zM12.8 5.6C15.5 4 18.5 4 21 5.5v14.4c-2.5-1.5-5.5-1.5-8.2.1z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle class="ln" cx="12" cy="12" r="9.5"/><path class="ln" d="M12 11v6"/><circle cx="12" cy="7.5" r="1.3"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path class="ln" d="M13.5 6.5l4 4"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><rect class="ln" x="6.5" y="2.5" width="11" height="19" rx="2.5"/><circle cx="12" cy="18" r="1.1"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4.2"/><path class="ln" d="M12 12h9M18 12v3.5M15.5 12v2.5"/></svg>',
  crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path class="ln" d="M6 6l12 12M18 6L6 18"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M9 17.5V6l11-2v11.5"/><circle cx="6.5" cy="17.5" r="2.8"/><circle cx="17.5" cy="15.5" r="2.8"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5"/><path class="ln" d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/></svg>'
};
const icon = (n, c = "") => `<i class="ico ${c}">${I[n]}</i>`;

/* ================= router + history (back button stays in the game) ================= */
const screens = {};
let screen = null, freshScene = false;
function go(name, arg, { push = true } = {}) {
  stopClock();
  if (screen === "carol" && name !== "carol") C?.clip?.stop();
  freshScene = true;
  screen = name;
  document.body.dataset.screen = name;
  screens[name].enter?.(arg);
  render();
  if (push) history.pushState({ screen: name }, "");
}
function render() {
  screens[screen].render();
  // entrance animations play once per screen/round, never on ordinary updates
  if (freshScene) { stage.querySelector(".scene")?.classList.add("enter"); freshScene = false; }
  syncPhones();
}
addEventListener("popstate", () => {
  if (["survey", "fast", "arcade"].includes(screen)) {
    history.pushState({ screen }, "");            // stay; ask first
    confirmLeave();
  } else if (screen === "lobby" || screen === "how" || screen === "results") go("home", null, { push: false });
  else if (screen === "home") go("cover", null, { push: false });
});
function confirmLeave() {
  card(`<div class="card-confirm"><h2>Leave this game?</h2><p>Scores for this game will be lost.</p>
    <div class="row"><button class="btn gold" data-act="closeCard">Keep playing</button><button class="btn red" data-act="leaveGame">Leave game</button></div></div>`, "confirm", 0);
}

/* ================= click + key dispatch ================= */
const actions = {};
const QUIET_UI = new Set(["tile", "act", "enterGame"]);      // game actions have their own sounds
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  audio.unlock();
  if (!QUIET_UI.has(el.dataset.act)) audio.play("press", { vol: 0.55 });
  const fn = actions[el.dataset.act];
  if (fn) fn(el.dataset.v, el);
});
let lastHover = 0, hoverEl = null;
document.addEventListener("pointerover", e => {
  if (e.pointerType !== "mouse") return;
  const el = e.target.closest("button:not(:disabled), [data-act]");
  if (!el || el === hoverEl) return;
  hoverEl = el;
  const now = performance.now();
  if (now - lastHover > 70) { lastHover = now; audio.play("hover", { vol: 0.5 }); }
});
document.addEventListener("pointerout", e => { if (hoverEl && !hoverEl.contains(e.relatedTarget)) hoverEl = null; });
stage.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.team !== undefined) { S.teams[+el.dataset.team].name = el.value.slice(0, 18); save(); syncPhones(); }
});
document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") return;
  const k = e.key.toLowerCase();
  if (screen === "survey" && G) {
    if (G.stage === "faceoff" && (k === "a" || k === "l")) return act("buzz", k === "a" ? 0 : 1);
    if (/^[1-6]$/.test(k)) return act("reveal", +k - 1);
    if (k === "x") return act("strike");
    if (k === " " || k === "enter") { const c = hostControls().find(c => c.main); if (c) { e.preventDefault(); act(c.a, c.v); } }
  }
});

actions.closeCard = () => closeCard();
actions.leaveGame = () => { closeCard(); audio.play("page"); go("home"); };
actions.home = () => { if (["survey", "fast", "arcade"].includes(screen)) confirmLeave(); else { audio.play("page"); go("home"); } };
actions.toggleSfx = () => { S.settings.sfx = !S.settings.sfx; audio.setSfx(S.settings.sfx); save(); render(); if (S.settings.sfx) audio.play("reveal"); };
actions.toggleMusic = () => { S.settings.music = !S.settings.music; audio.setMusic(S.settings.music); save(); render(); };

/* ================= broadcast cards (the TV "modals") ================= */
let cardEl = null, cardTimer = null;
function card(html, kind, ms = 1800) {
  closeCard(true);
  const el = document.createElement("div");
  el.className = `bcard bcard-${kind}`;
  el.innerHTML = `<div class="bcard-dim"></div><div class="bcard-body">${html}</div>`;
  cardLayer.appendChild(el);
  cardEl = el;
  return new Promise(res => {
    if (!ms) { el._res = res; return; }
    cardTimer = setTimeout(() => { closeCard(); res(); }, ms);
  });
}
/* game-show light show: sweeping colored beams + quick white flashes (kept gentle: no rapid flicker) */
const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;
function strobe(kind = "sweep", ms = 2200) {
  if (CALM && kind !== "sweep") return;
  const el = document.createElement("div");
  el.className = `strobe ${kind}`;
  el.innerHTML = `<i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i><span class="flashes"></span>`;
  el.style.setProperty("--ms", ms + "ms");
  stageBox.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
function closeCard(instant) {
  clearTimeout(cardTimer);
  if (!cardEl) return;
  const el = cardEl; cardEl = null;
  el._res?.();
  if (instant) { el.remove(); return; }
  el.classList.add("out"); setTimeout(() => el.remove(), 380);
}

/* ================= clock ================= */
let clock = null;
const T = { left: 0, max: 0, on: false, onEnd: null };
function setTimer(secs, onEnd, force = false) {
  stopClock();
  if (!secs || (!S.settings.timer && !force)) { Object.assign(T, { on: false, max: 0, left: 0 }); patchTimer(); return; }
  Object.assign(T, { left: secs, max: secs, on: true, onEnd });
  if (force) audio.clock(true);            // ticking bed is a Fast Money thing only
  patchTimer();
  clock = setInterval(() => {
    T.left--;
    if (T.left <= 5 && T.left > 0) audio.tick(T.left <= 3);
    patchTimer();
    if (T.left <= 0) { stopClock(); audio.play("timeup"); T.onEnd?.(); }
  }, 1000);
}
function stopClock() { clearInterval(clock); clock = null; T.on = false; audio.clock(false); }
const timerHTML = () => {
  if (!T.max) return "";
  const k = Math.max(0, T.left / T.max);
  return `<div class="clock ${T.left <= 5 ? "urgent" : ""}" id="clock"><svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="44"/><circle class="bar" cx="50" cy="50" r="44" style="stroke-dashoffset:${(276.5 * (1 - k)).toFixed(1)}"/></svg><b>${T.left}</b></div>`;
};
function patchTimer() { const el = document.getElementById("clock"); if (el) el.outerHTML = timerHTML(); else if (T.max) document.getElementById("clockSlot")?.insertAdjacentHTML("beforeend", timerHTML()); }

/* ================= phones / room ================= */
let room = null, roster = [], linkStatus = "off", lastRemote = false;
function ensureRoom() {
  if (room) return;
  room = new Room({
    onPlayers: p => {
      const before = roster.length, hadRemote = lastRemote; roster = p; lastRemote = room.hostRemote;
      if (p.length > before) audio.play("pop");
      // redraw when players change in the lobby, or when the host remote comes/goes (TV host buttons hide/show)
      if (screen === "lobby" || hadRemote !== lastRemote) render(); else syncPhones();
    },
    onStatus: s => { linkStatus = s; if (screen === "lobby") render(); },
    onMessage: (m, pid) => onPhone(m, pid)
  });
  room.open();
}
const teamRoster = t => roster.filter(p => p.team === t && !p.away);      // who can play right now
const teamSeats = t => roster.filter(p => p.team === t);                   // incl. phones asleep for a moment
const remoteOn = () => !!room?.hostRemote;

function onPhone(m, pid) {
  if (m.t === "hello") { syncPhones(); if (m.role === "host") { audio.play("star"); if (screen !== "lobby") render(); } return; }
  if (screen === "sketch" && K) {
    const me = roster.find(p => p.pid === pid);
    if (pid === K.drawerPid) {
      if (m.t === "draw") return sketchStroke(m);
      if (m.t === "undo") return sketchUndo();
      if (m.t === "clear") return sketchClear();
      if (m.t === "sketchGo") return sketchStart();
      if (m.t === "sketchSkip") return sketchSkip();
    }
    if (m.t === "answer" && me && pid !== K.drawerPid && ((K.stage === "draw" && me.team === K.team) || (K.stage === "steal" && me.team === 1 - K.team)))
      return sketchGuess(String(m.text || "").slice(0, 40), me, (m.alts || []).slice(0, 4).map(String));
  }
  if (screen === "carol" && C) {
    const me = roster.find(p => p.pid === pid);
    if (m.t === "buzz" && me && me.team !== null) return carolBuzz(me.team, pid);
    if (m.t === "answer" && me && C.stage === "answer" && C.buzz === me.team && (!C.buzzPid || C.buzzPid === pid)) return carolGuess(String(m.text || "").slice(0, 60), (m.alts || []).slice(0, 4).map(String));
  }
  if (m.t === "buzz" && screen === "survey" && G?.stage === "faceoff") {
    const me = roster.find(p => p.pid === pid);
    if (!me || me.team === null) return;
    const fp = faceoffPlayer(me.team);
    if (!fp || fp.pid === pid) buzz(me.team, pid);
    return;
  }
  if (m.t === "answer" && screen === "survey" && G) {
    const me = roster.find(p => p.pid === pid);
    if (me && mayAnswer(me)) submitAnswer(String(m.text || "").slice(0, 60), me, (m.alts || []).slice(0, 4).map(String));
    return;
  }
  if (m.t === "answer" && screen === "fast" && F) {
    const me = roster.find(p => p.pid === pid);
    if (me && fmMayAnswer(me)) fmSubmit(String(m.text || "").slice(0, 60), me, (m.alts || []).slice(0, 4).map(String));
    return;
  }
  if (m.t === "choose" && screen === "survey" && G?.stage === "choose") {
    const me = roster.find(p => p.pid === pid);
    if (me && me.team === G.fo.winner) choose(m.v === "pass" ? "pass" : "play");
    return;
  }
  if (m.t === "pick" && screen === "arcade" && A) {
    const me = roster.find(p => p.pid === pid);
    if (me && me.team === A.team && A.picked === null) { A.by = me.name; arcadeAct("arcPick", m.i); }
    return;
  }
  if (m.t === "act" && m.role === "host") act(m.a, m.v);
}

function syncPhones() {
  if (!room) return;
  room.broadcast((role, pid) => role === "host" ? hostView() : playerView(pid));
}

/* ================= HOME ================= */
screens.cover = {
  render() {
    stage.innerHTML = "";
    document.getElementById("cover").hidden = false;
  }
};
actions.enterGame = () => {
  audio.unlock();
  audio.play("magic");
  audio.music("menu");
  setTimeout(() => audio.voice("vo-welcome"), 450);
  document.getElementById("cover").hidden = true;
  confetti(60, { x: 0.5, y: 0.8 });
  go("home");
};

screens.home = {
  enter() { document.getElementById("cover").hidden = true; audio.music("menu", { restart: true }); },
  render() {
    stage.innerHTML = `
    <div class="scene home">
      ${rays()}
      <img class="home-logo" src="assets/logo-title.webp" alt="Christmas Bible Survey Showdown">
      <div class="home-btns">
        <button class="mega" data-act="lobby" data-v="survey">
          <span class="mega-shine"></span><span class="mega-ico">${icon("star")}</span>
          <span class="mega-txt"><b>Play the Showdown</b><small>Two teams · buzzers · strikes · steals</small></span>
          <span class="mega-go">${icon("play")}</span>
        </button>
        <div class="mini-row">
          <button class="mini-btn" data-act="lobby" data-v="fast">${icon("bolt")}<b>Fast Money</b></button>
          <button class="mini-btn" data-act="lobby" data-v="arcade">${icon("book")}<b>Bible Challenge</b></button>
          <button class="mini-btn" data-act="lobby" data-v="carol">${icon("music")}<b>Name That Carol</b></button>
          <button class="mini-btn" data-act="lobby" data-v="sketch">${icon("edit")}<b>Christmas Sketch</b></button>
          <button class="mini-btn" data-act="how">${icon("info")}<b>How to Play</b></button>
        </div>
      </div>
      ${cornerTools()}
      <img class="brand-corner" src="assets/brand-logo.webp" alt="Bible Explorer Kids">
    </div>`;
  }
};
const rays = () => `<div class="rays"></div><div class="bokeh"></div>`;
const cornerTools = () => `<div class="corner-tools">
  <button class="tool ${S.settings.music ? "" : "off"}" data-act="toggleMusic" title="Music">${icon("sound")}<span>Music</span></button>
  <button class="tool ${S.settings.sfx ? "" : "off"}" data-act="toggleSfx" title="Sound effects">${icon(S.settings.sfx ? "sound" : "mute")}<span>Effects</span></button>
  <button class="tool" data-act="settings" title="Settings">${icon("gear")}<span>Settings</span></button>
</div>`;
actions.how = () => { audio.play("page"); go("how"); };

/* ================= SETTINGS (one simple panel) ================= */
actions.settings = () => {
  const st = S.settings;
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(st[k]) === String(v) ? "on" : ""}" data-act="setOpt" data-v="${k}:${v}">${l}</button>`).join("")}</div>`;
  card(`<div class="panel-card">
    <h2>Game Settings</h2>
    <label>Rounds${seg("rounds", [[3, "3 · Quick"], [5, "5 · Classic"], [7, "7 · Long"]])}</label>
    <label>Questions${seg("mix", [["Mixed", "Mixed"], ["Bible", "Bible only"], ["Holiday", "Holiday fun"]])}</label>
    <label>Answer timer${seg("timer", [[0, "Off"], [30, "Relaxed 30s"], [20, "Normal 20s"], [12, "Fast 12s"]])}</label>
    <div class="row"><button class="btn ghost" data-act="testSound">${icon("sound")} Test sound</button><button class="btn gold" data-act="closeCard">Done</button></div>
  </div>`, "panel", 0);
};
actions.setOpt = v => {
  const [k, raw] = v.split(":");
  S.settings[k] = k === "mix" ? raw : +raw; save(); audio.play("pop");
  document.querySelectorAll(`[data-act="setOpt"][data-v^="${k}:"]`).forEach(b => b.classList.toggle("on", b.dataset.v === v));
};
actions.testSound = () => { audio.unlock(); audio.play("reveal"); setTimeout(() => audio.wrong(), 600); setTimeout(() => audio.voice("vo-survey-says"), 1500); };

/* ================= LOBBY (QR join) ================= */
let nextGame = "survey", lobbyVo1 = null, lobbyVo2 = null, fastIntroAt = 0;
const seenChips = new Set();   // so only newly joined players pop in
actions.lobby = v => { nextGame = v || "survey"; audio.play("whoosh"); go("lobby"); };
screens.lobby = {
  enter() {
    ensureRoom(); audio.music("lobby");
    clearTimeout(lobbyVo1); clearTimeout(lobbyVo2);
    if (nextGame === "fast") { lobbyVo1 = setTimeout(() => { if (audio.voice("vo-fast-money")) fastIntroAt = Date.now(); }, 400); lobbyVo2 = setTimeout(() => screen === "lobby" && audio.voice("vo-lobby"), 5400); }
    else lobbyVo2 = setTimeout(() => screen === "lobby" && audio.voice("vo-lobby"), 900);
  },
  render() {
    const ready = linkStatus === "ready" && room?.code;
    const url = ready ? joinUrl(room.code) : "";
    const hostUrl = ready ? joinUrl(room.code, room.key) : "";
    const title = { survey: "Survey Showdown", fast: "Fast Money", arcade: "Bible Challenge", carol: "Name That Carol", sketch: "Christmas Sketch" }[nextGame];
    stage.innerHTML = `
    <div class="scene lobby">
      ${rays()}
      <header class="lobby-head"><span class="kicker">Tonight's game</span><h1>${title}</h1></header>
      <div class="lobby-grid">
        ${[0, 1].map(t => `<section class="team-pod t${t}">
          <span class="pod-label">Team ${t + 1} · ${teamSeats(t).length} ${teamSeats(t).length === 1 ? "player" : "players"}</span>
          <input class="team-name" data-team="${t}" value="${esc(S.teams[t].name)}" maxlength="18" spellcheck="false" aria-label="Team ${t + 1} name">
          <div class="pod-players">${teamSeats(t).map(p => { const isNew = !seenChips.has(p.pid + t); seenChips.add(p.pid + t); return `<span class="chip ${isNew ? "pop-in" : ""} ${p.away ? "away" : ""}" title="${p.away ? "Phone asleep. Will reconnect" : ""}">${esc(p.name)}${p.away ? " · zz" : ""}</span>`; }).join("") || `<span class="pod-empty">Players join by scanning the code</span>`}</div>
        </section>`).join("")}
        <section class="join-card">
          <span class="kicker">Grab a phone buzzer</span>
          <div class="qr">${ready ? qrSvg(url) : `<div class="qr-wait">${linkStatus === "unavailable" ? "Phones can't connect right now. No problem: the host taps instead!" : "Opening the room…"}</div>`}</div>
          ${ready ? `<div class="code-line">or visit <b>${esc(url.replace(/^https?:\/\//, "").replace(/\?.*$/, ""))}</b> · code <b class="code">${room.code}</b></div>` : ""}
        </section>
      </div>
      ${roster.some(p => p.team === null) ? `<div class="lobby-choosing">${icon("phone")} Choosing a team: ${roster.filter(p => p.team === null).map(p => `<span class="chip">${esc(p.name || "New player")}</span>`).join("")}</div>` : ""}
      <footer class="lobby-foot">
        <div class="host-qr ${remoteOn() ? "linked" : ""}">
          ${ready ? `<div class="qr small">${qrSvg(hostUrl)}</div>` : ""}
          <div><b>${remoteOn() ? `${icon("key")} Host remote connected` : `${icon("key")} Host: scan for your secret answer remote`}</b>
          <small>${remoteOn() ? "Answers stay on your phone. The TV shows only the show." : "Optional. Without it, the host taps answers on this screen."}</small></div>
        </div>
        <button class="btn gold xl pulse" data-act="startGame">${icon("play")} Start the show</button>
      </footer>
      ${cornerTools()}
      <button class="back-btn" data-act="home">${icon("home")}</button>
    </div>`;
  }
};
function qrSvg(text) {
  if (!window.qrcode) return "";
  const q = window.qrcode(0, "M"); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}
actions.startGame = () => {
  S.teams.forEach((t, i) => { t.name = (t.name || "").trim() || (i ? "Nazareth" : "Bethlehem"); }); save();
  if (nextGame === "fast") return startFast();
  if (nextGame === "carol") return startCarol();
  if (nextGame === "sketch") return startSketch();
  if (nextGame === "arcade") return startArcade();
  startSurvey();
};

/* =========================================================
   SURVEY SHOWDOWN
   ========================================================= */
let G = null;
function makeDeck(n) {
  const mix = S.settings.mix, recent = store.get("recent", []);
  const fresh = list => shuffle(list.filter(x => !recent.includes(x.id))).concat(shuffle(list.filter(x => recent.includes(x.id))));
  let deck;
  if (mix === "Mixed") {
    const bib = fresh(SURVEY_BANK.filter(x => x.category === "Bible")), hol = fresh(SURVEY_BANK.filter(x => x.category === "Holiday"));
    const first = Math.random() < 0.5;
    deck = Array.from({ length: n }, (_, i) => ((i % 2 === 0) === first ? bib : hol).shift() || bib.shift() || hol.shift());
  } else deck = fresh(SURVEY_BANK.filter(x => x.category === mix)).slice(0, n);
  store.set("recent", [...recent, ...deck.map(x => x.id)].slice(-30));
  return deck;
}
/* questions not seen recently come first (shuffled); remembers the last games on this device */
function freshPick(bank, key, n, idOf) {
  const recent = store.get(key, []);
  const pick = shuffle(bank.filter(x => !recent.includes(idOf(x)))).concat(shuffle(bank.filter(x => recent.includes(idOf(x))))).slice(0, n);
  store.set(key, [...recent.filter(id => !pick.some(x => idOf(x) === id)), ...pick.map(idOf)].slice(-Math.max(n, bank.length - n)));
  return pick;
}
const multFor = (i, n) => (n >= 3 && i === n - 1) ? 3 : (i >= Math.floor(n / 2) ? 2 : 1);
const faceoffPlayer = t => { const r = teamRoster(t); return r.length ? r[(G.ri + G.fo.retry) % r.length] : null; };
const turnPlayer = t => { const r = teamRoster(t); return r.length ? r[G.ptr[t] % r.length] : null; };

function startSurvey() {
  audio.play("gong"); keepAwake();
  G = { deck: makeDeck(S.settings.rounds), ri: 0, scores: [0, 0], shown: { scores: [0, 0], bank: 0 }, ptr: [0, 0], history: [], mvp: {} };
  beginRound(true);
}
screens.survey = { render: () => renderSurvey() };

async function beginRound(first = false) {
  const r = G.deck[G.ri];
  Object.assign(G, { round: r, mult: multFor(G.ri, G.deck.length), revealed: [], fresh: new Set(), bank: 0, strikes: 0, control: null,
    stage: "intro", fo: { order: null, step: 0, res: [], retry: 0, winner: null, buzzPid: null }, msg: "", stolen: false, pending: false, awardMsg: "", peek: false, said: null });
  G.shown.bank = 0;
  if (first) go("survey"); else { freshScene = true; render(); }   // state is complete before the first draw
  audio.music("game");                      // piano loop for every Showdown round
  audio.play("timpani"); strobe("sweep", 2300);
  const last = G.ri === G.deck.length - 1;
  await card(`<div class="round-card">
      <div class="rc-kicker">${last ? "Final Round" : `Round ${G.ri + 1} of ${G.deck.length}`}</div>
      <div class="rc-coin"><span>×${G.mult}</span></div>
      <div class="rc-title">${G.mult === 1 ? "Single Points" : G.mult === 2 ? "Double Points" : "Triple Points"}</div>
      <div class="rc-sub">${r.category === "Bible" ? "Bible Board" : "Holiday Board"}</div>
    </div>`, "round", 2300);
  if (screen !== "survey" || G?.round !== r) return;
  if (G.ri === G.deck.length - 1) { if (!audio.voice("vo-final-round")) audio.voice("vo-round"); }
  else if (G.mult > 1) audio.voice("vo-round");
  G.stage = "faceoff"; render();
  faceoffCard();
}

function faceoffCard() {
  const p = [faceoffPlayer(0), faceoffPlayer(1)];
  audio.play("transition", { vol: 0.7 }); strobe("flash", 900);
  setTimeout(() => audio.voice("vo-faceoff"), 500);
  card(`<div class="vs-card">
    <div class="vs-side l t0"><small>${esc(tName(0))}</small><b>${esc(p[0]?.name || "Team " + tName(0))}</b></div>
    <div class="vs-badge">VS</div>
    <div class="vs-side r t1"><small>${esc(tName(1))}</small><b>${esc(p[1]?.name || "Team " + tName(1))}</b></div>
    <div class="vs-title">FACE-OFF</div>
    <div class="vs-hint">${p[0] || p[1] ? "Hands on your phone buzzers!" : "First to slap the table answers!"}</div>
  </div>`, "vs", 2400);
}

function buzz(t, pid = null) {
  if (G?.stage !== "faceoff") return;
  closeCard(true);
  audio.buzzer(t);
  G.fo.order = [t, 1 - t]; G.fo.step = 0; G.fo.res = []; G.fo.buzzPid = pid;
  G.stage = "faceoffAnswer"; G.msg = "";
  const who = pid ? roster.find(p => p.pid === pid)?.name : faceoffPlayer(t)?.name;
  setTimeout(() => audio.voice("vo-buzzed"), 500);
  card(`<div class="buzz-card t${t}"><div class="burst"></div><small>Buzzed in!</small><b>${esc(tName(t))}</b>${who ? `<em>${esc(who)}, your answer?</em>` : ""}</div>`, "buzz", 1500);
  render();
  setTimer(S.settings.timer ? Math.min(15, S.settings.timer) : 0, () => strike("time"));
}

/* --- the one place every host action goes (TV taps, keyboard, remote) --- */
function act(a, v) {
  if (a === "closeCard") return closeCard();
  if (a === "startGameRemote") { if (screen === "lobby") actions.startGame(); return; }
  if (screen === "survey" && G) {
    if (a === "buzz") return buzz(+v);
    if (a === "reveal") return G.stage === "roundEnd" ? revealLeft(+v) : tryReveal(+v);
    if (a === "revealAll") return revealAllLeft();
    if (a === "listen") return listenTV();
    if (a === "strike") return tryStrike();
    if (a === "choose") return choose(v);
    if (a === "next") return nextRound();
    if (a === "peek") { G.peek = !G.peek; return render(); }
  }
  if (screen === "fast" && F) { if (a === "listen") return listenTV(); return fastAct(a, v); }
  if (screen === "arcade" && A) return arcadeAct(a, v);
  if (screen === "carol" && C) return carolAct(a, v);
  if (screen === "sketch" && K) return sketchAct(a, v);
  if (screen === "results") { if (a === "again") return actions.again(); if (a === "fastFromResults") return actions.fastFromResults(); if (a === "menu") return go("home"); }
}
actions.act = (v) => { const [a, val] = v.split(":"); act(a, val); };
actions.tile = v => act("reveal", +v);

const LIVE = ["faceoffAnswer", "play", "steal"];

/* --- who may answer right now: {team, pid|null}; pid null = anyone on that team --- */
function answerer() {
  if (!G) return null;
  if (G.stage === "faceoffAnswer") { const t = G.fo.order[G.fo.step]; const pid = G.fo.step === 0 && G.fo.buzzPid ? G.fo.buzzPid : faceoffPlayer(t)?.pid || null; return { team: t, pid }; }
  if (G.stage === "play") return { team: G.control, pid: turnPlayer(G.control)?.pid || null };
  if (G.stage === "steal") return { team: 1 - G.control, pid: null };
  return null;
}
function mayAnswer(me) {
  if (G.pending || !LIVE.includes(G.stage)) return false;
  const a = answerer();
  return !!a && me.team === a.team && (!a.pid || a.pid === me.pid);
}
/* a typed or spoken answer: from a player's phone, or from the TV's own answer box / mic */
/* try the typed/heard text first, then the speech engine's other guesses ("stalking" → "stocking") */
function bestMatch(text, alts, answers, min) {
  for (const t of [text, ...(alts || [])]) { const i = matchAnswer(t, answers, min); if (i >= 0) return i; }
  return -1;
}
function submitAnswer(text, who = null, alts = []) {
  text = String(text || "").trim();
  if (!text || G.pending || !LIVE.includes(G.stage)) return;
  const a = answerer();
  G.said = { text, name: who?.name || tName(a.team), team: a.team, pid: who?.pid || a.pid };
  const i = bestMatch(text, alts, G.round.a);
  if (i >= 0 && G.revealed.includes(i) && G.stage === "play") {   // already up there: no strike, try again
    audio.play("nope"); audio.voice("vo-try-again");
    notify(G.said.pid, { kind: "again", text, msg: "Already on the board. Try another!" });
    G.said = null; G.msg = "Already on the board!"; return render();
  }
  render();
  suspense(() => { if (i >= 0 && !G.revealed.includes(i)) hit(i, "player"); else strike(); }, G.stage === "play" ? 0.6 : 1);
}
function notify(pid, msg) { if (pid && room) room.sendTo(pid, { t: "result", ...msg }); }

function suspense(then, voiceChance = 1) {
  G.pending = true; stopClock();
  document.querySelector(".board")?.classList.add("suspense");
  syncPhones();
  const said = Math.random() < voiceChance && audio.voice("vo-survey-says");
  setTimeout(() => { G.pending = false; if (screen === "survey" && G) then(); }, said ? 1250 : 650);
}
function tryReveal(i) {                     // host tapped a tile (TV or remote)
  if (!G.round.a[i] || G.pending || !LIVE.includes(G.stage)) return;
  if (G.revealed.includes(i)) { if (G.stage === "play") { audio.play("nope"); flashMsg("Already on the board!"); } return; }
  suspense(() => hit(i, "host"), G.stage === "play" ? 0.45 : 1);
}
function tryStrike() {
  if (G.pending || !LIVE.includes(G.stage)) return;
  suspense(() => strike(), G.stage === "play" ? 0.45 : 1);
}

/* src: "player" = game checked a typed/spoken answer · "host" = host tapped it · "after" = post-round reveal, no points */
function reveal(i, src = "player") {
  G.revealed.push(i); G.fresh.add(i);
  if (src === "after") { audio.play("chime", { vol: 0.75, rate: 1.12 }); return; }
  G.bank += G.round.a[i][1] * G.mult;
  audio.play("chime", { rate: src === "host" ? 0.94 : 1 });            // every tile: the answer chime
  if (i === 0) { setTimeout(() => audio.play("top"), 260); setTimeout(() => audio.play("cheer", { vol: 0.45 }), 400); setTimeout(() => audio.voice("vo-top-answer"), 700); setTimeout(() => confetti(110, { x: 0.5, y: 0.42 }), 250); strobe("gold", 1700); }
  else if (G.stage === "play" && Math.random() < 0.5) setTimeout(() => audio.voice("vo-great"), 650);
}

function hit(i, src = "player") {
  const st = G.stage, who = answerer(), pts = G.round.a[i][1] * G.mult;
  const pid = G.said?.pid || who?.pid;
  reveal(i, src);
  notify(pid, { kind: "correct", answer: G.round.a[i][0], pts, top: i === 0 });
  if (pid) G.mvp[pid] = (G.mvp[pid] || 0) + pts;
  G.said = null;
  if (st === "faceoffAnswer") {
    G.fo.res[G.fo.step] = i;
    if (i === 0) return winFaceoff(G.fo.order[G.fo.step]);
    if (G.fo.step === 0) { G.fo.step = 1; G.msg = `Not the top answer! ${tName(G.fo.order[1])}, can you beat it?`; render(); return setTimer(S.settings.timer ? 15 : 0, () => strike("time")); }
    return settleFaceoff();
  }
  if (st === "steal") { G.stolen = true; return endRound(1 - G.control); }
  G.ptr[G.control]++;
  if (G.revealed.length === G.round.a.length) return endRound(G.control, true);
  G.msg = ["Good answer!", "On the board!", "Yes!", "Survey says… YES!"][Math.floor(Math.random() * 4)];
  render();
  setTimer(S.settings.timer, () => strike("time"));
}

function strike(why) {
  const st = G.stage;
  if (!LIVE.includes(st)) return;
  stopClock();
  audio.wrong();
  const who = answerer(), pid = G.said?.pid || who?.pid, said = G.said?.text;
  G.said = null;
  notify(pid, { kind: "wrong", text: said, strikes: st === "play" ? G.strikes + 1 : 1, msg: why === "time" ? "Time's up!" : "Not on the board" });
  if (st === "faceoffAnswer") {
    xCard(1);
    setTimeout(() => audio.voice("vo-wrong"), 1000);
    G.fo.res[G.fo.step] = -1;
    if (G.fo.step === 0) { G.fo.step = 1; G.msg = `${why === "time" ? "Time's up! " : ""}${tName(G.fo.order[1])}, it's your chance!`; render(); return setTimer(S.settings.timer ? 15 : 0, () => strike("time")); }
    return settleFaceoff();
  }
  if (st === "steal") { xCard(1); setTimeout(() => audio.play("gasp", { vol: 0.8 }), 350); setTimeout(() => audio.voice("vo-better-luck"), 1100); return setTimeout(() => endRound(G.control), 1300); }
  G.strikes++;
  xCard(G.strikes);
  if (G.strikes >= STRIKES) setTimeout(() => audio.play("gasp", { vol: 0.8 }), 400);
  setTimeout(() => audio.voice(`vo-strike${G.strikes}`), 1100);
  G.ptr[G.control]++;
  if (G.strikes >= STRIKES) { render(); return setTimeout(() => { if (screen === "survey") toSteal(); }, 1300); }
  G.msg = `${why === "time" ? "Time's up! " : ""}Strike ${G.strikes}! Next player.`;
  render();
  setTimer(S.settings.timer, () => strike("time"));
}

/* --- the TV's own answer box + microphone (everyone in one room, no phones needed) --- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let listening = false, recog = null, tvTyping = false;
document.addEventListener("focusin", e => { if (e.target.id === "tvAnswer") tvTyping = true; });
document.addEventListener("focusout", e => { if (e.target.id === "tvAnswer") tvTyping = false; });
document.addEventListener("submit", e => {
  const f = e.target;
  if (f.dataset.form !== "tvAnswer") return;
  e.preventDefault();
  const box = f.querySelector("input"), v = box.value;
  box.value = "";
  tvSubmit(v);
  const fresh = document.getElementById("tvAnswer"); if (fresh) fresh.value = "";
});
function tvSubmit(v, alts = []) {
  if (!String(v).trim()) return;
  if (screen === "survey" && G) { const a = answerer(); submitAnswer(v, a?.pid ? roster.find(p => p.pid === a.pid) : null, alts); }
  else if (screen === "fast" && F) fmSubmit(v, null, alts);
  else if (screen === "carol" && C) carolGuess(v, alts);
  else if (screen === "sketch" && K) sketchGuess(v, null, alts);
}
function listenTV() {
  if (!SR) { card(`<div class="banner-card"><b>Voice answers</b><small>Use Chrome, Edge or Safari to answer by voice. Typing works everywhere!</small></div>`, "banner", 2600); return; }
  const ok = (screen === "survey" && G && LIVE.includes(G.stage)) || (screen === "fast" && F && fmLive()) || (screen === "carol" && C?.stage === "answer") || (screen === "sketch" && ["draw", "steal"].includes(K?.stage));
  if (!ok) return;
  if (listening) { try { recog?.stop(); } catch {} return; }
  recog = new SR(); recog.lang = "en-US"; recog.interimResults = true; recog.maxAlternatives = 3;
  let done = false;
  recog.onresult = ev => {
    if (done) return;
    const r = ev.results[ev.results.length - 1], text = r[0].transcript;
    const box = document.getElementById("tvAnswer"); if (box) box.value = text;
    if (r.isFinal) { done = true; listening = false; try { recog.stop(); } catch {} tvSubmit(text, [...r].slice(1).map(x => x.transcript)); }
  };
  recog.onend = () => { listening = false; if (screen === "survey" || screen === "fast") render(); };
  recog.onerror = () => { listening = false; };
  listening = true; audio.play("pop"); render();
  try { recog.start(); } catch { listening = false; }
}

function xCard(n) {
  card(`<div class="x-wrap">${Array.from({ length: n }, (_, i) => `<span class="xx" style="--i:${i}"><i></i></span>`).join("")}</div>`, "strike", 1150);
  stageBox.classList.remove("shake"); void stageBox.offsetWidth; stageBox.classList.add("shake");
}
function flashMsg(m) { G.msg = m; render(); }

function settleFaceoff() {
  const [a, b] = [0, 1].map(k => (G.fo.res[k] === undefined || G.fo.res[k] < 0) ? 99 : G.fo.res[k]);
  if (a === 99 && b === 99) {
    G.fo.retry++; G.stage = "faceoff"; G.msg = "";
    return setTimeout(() => { if (screen === "survey") { render(); card(`<div class="banner-card"><b>Nobody hit the board!</b><small>New face-off pair</small></div>`, "banner", 1500).then(() => screen === "survey" && G.stage === "faceoff" && faceoffCard()); } }, 1100);
  }
  winFaceoff(a <= b ? G.fo.order[0] : G.fo.order[1]);
}
function winFaceoff(team) {
  stopClock();
  G.fo.winner = team; G.stage = "choose"; G.msg = "";
  render();
  setTimeout(() => {
    if (screen !== "survey" || G.stage !== "choose") return;
    audio.play("levelup"); audio.voice("vo-play-or-pass");
    card(`<div class="pp-card t${team}"><small>${esc(tName(team))} wins the face-off</small><b>Play or Pass?</b>
      <div class="row"><button class="btn gold xl" data-act="act" data-v="choose:play">PLAY</button><button class="btn red xl" data-act="act" data-v="choose:pass">PASS</button></div></div>`, "pp", 0);
  }, 1100);
}
function choose(v) {
  if (G.stage !== "choose") return;
  closeCard();
  const t = G.fo.winner, play = v === "play";
  G.control = play ? t : 1 - t;
  setTimeout(() => turnVoice(G.control), 1400);
  G.ptr[G.control] = G.ri + G.fo.retry + (play ? 1 : 0);
  G.stage = "play"; G.msg = play ? "" : `${tName(t)} passed!`;
  audio.play("whoosh");
  render();
  card(`<div class="banner-card t${G.control}"><small>${play ? "They're playing it!" : "Passed!"}</small><b>${esc(tName(G.control))}'s board</b></div>`, "banner", 1300);
  if (G.revealed.length === G.round.a.length) return endRound(G.control);
  setTimer(S.settings.timer, () => strike("time"));
}
function turnVoice(t) {
  const n = tName(t).toLowerCase().replace(/^team /, "");
  if (n === "bethlehem" || n === "nazareth") audio.voice(`vo-turn-${n}`);
}
function toSteal() {
  G.stage = "steal"; G.msg = "";
  audio.play("steal"); strobe("red", 2400);
  if (!audio.voice("vo-steal")) audio.play("transition", { vol: 0.6 });
  render();
  card(`<div class="steal-card"><div class="alarm"></div><b>STEAL!</b><small>${esc(tName(1 - G.control))}: huddle up. One answer takes all <em>${G.bank}</em> points!</small></div>`, "steal", 2400)
    .then(() => { if (screen === "survey" && G.stage === "steal") setTimer(S.settings.timer ? 20 : 0, () => strike("time")); });
}
function endRound(team, sweep = false) {
  stopClock();
  const pts = G.bank;
  G.stage = "award";
  G.awardMsg = G.stolen ? `${tName(team)} stole ${pts}!` : sweep ? `Board cleared! ${tName(team)} +${pts}` : `${tName(team)} banks ${pts}`;
  G.scores[team] += pts; G.bank = 0;
  G.history.push({ round: G.ri + 1, q: G.round.q, team, pts, stolen: G.stolen, mult: G.mult });
  render();
  audio.play(G.stolen ? "steal" : "win", { vol: 0.8 });
  audio.music("win");                                     // triumphant bed until the next round starts
  audio.play("applause", { vol: 0.7 }); if (sweep || G.stolen) setTimeout(() => audio.play("cheer", { vol: 0.55 }), 300);
  strobe(sweep || G.stolen ? "party" : "sweep", 2600);
  confettiRain(sweep || G.stolen ? 2.2 : 1.2);
  if (G.stolen || sweep) setTimeout(() => audio.voice(G.stolen ? "vo-steal-success" : "vo-board-cleared"), 700);
  card(`<div class="award-card t${team}"><small>${G.stolen ? "Stolen!" : sweep ? "Board cleared!" : "Points to"}</small><b>${esc(tName(team))}</b><div class="award-pts">+${pts}</div>
    <div class="award-tally"><span class="t0">${esc(tName(0))} <b>${G.scores[0]}</b></span><span class="t1">${esc(tName(1))} <b>${G.scores[1]}</b></span></div></div>`, "award", 2600)
    .then(() => { if (screen === "survey" && G.stage === "award") { G.stage = "roundEnd"; render(); autoNext(); } });
}
/* after the round the host reveals the rest, one tile at a time (no points) */
function revealLeft(i) {
  if (G.stage !== "roundEnd" || !G.round.a[i] || G.revealed.includes(i)) return;
  reveal(i, "after"); render();
  if (G.revealed.length === G.round.a.length) autoNext();
}
function revealAllLeft() {
  G.round.a.map((_, i) => i).filter(i => !G.revealed.includes(i)).forEach((i, k) => setTimeout(() => revealLeft(i), k * 1300));
}

function nextRound() {
  if (G.stage !== "roundEnd" || G.leaving) return;
  clearTimeout(G._auto); closeCard(true);
  G.leaving = true;
  stage.querySelector(".scene")?.classList.add("exit");   // question + tiles animate out
  audio.play("whoosh");
  setTimeout(() => {
    if (screen !== "survey" || !G) return;
    G.leaving = false;
    if (G.ri === G.deck.length - 1) return finishSurvey();
    G.ri++; beginRound();
  }, 850);
}
/* once every tile is showing, roll straight into the next round */
function autoNext() {
  if (G.stage !== "roundEnd" || G.revealed.length < G.round.a.length) return;
  clearTimeout(G._auto);
  // hold the finished board on screen so everyone can read it, then the round card
  G._auto = setTimeout(() => showNextCard(), 4500);
}
function showNextCard() {
  if (screen !== "survey" || !G || G.stage !== "roundEnd") return;
  const last = G.ri === G.deck.length - 1;
  card(`<div class="next-card"><small>${last ? "That's the game!" : `Round ${G.ri + 1} complete`}</small>
    <div class="nc-scores"><span class="t0">${esc(tName(0))}<b>${G.scores[0]}</b></span><span class="t1">${esc(tName(1))}<b>${G.scores[1]}</b></span></div>
    <b>${last ? "Final results…" : `Round ${G.ri + 2} coming up!`}</b>${(last ? "" : audio.voice("vo-next-round"), "")}<div class="nc-bar"></div></div>`, "next", 4200);
  G._auto = setTimeout(() => nextRound(), 4300);
}

/* --- what the host can do right now (TV dock + remote use the same list) --- */
function hostControls() {
  if (!G) return [];
  switch (G.stage) {
    case "faceoff": return [{ a: "buzz", v: 0, label: `${tName(0)} buzzed first`, kind: "t0" }, { a: "buzz", v: 1, label: `${tName(1)} buzzed first`, kind: "t1" }];
    case "faceoffAnswer": case "play": case "steal": return [{ a: "strike", label: "✕  Not on the board", kind: "x", main: false }];
    case "choose": return [{ a: "choose", v: "play", label: "PLAY", kind: "gold", main: true }, { a: "choose", v: "pass", label: "PASS", kind: "red" }];
    case "roundEnd": return [
      ...(G.revealed.length < G.round.a.length ? [{ a: "revealAll", label: "Reveal the rest", kind: "ghost" }] : []),
      { a: "next", label: G.ri === G.deck.length - 1 ? "Final results ▶" : "Next round ▶", kind: "gold", main: true }];
  }
  return [];
}
const buzzerName = () => G.fo.buzzPid ? roster.find(x => x.pid === G.fo.buzzPid)?.name : faceoffPlayer(G.fo.order?.[0])?.name;
function prompt() {
  const st = G.stage;
  if (st === "intro") return "Get ready…";
  if (st === "faceoff") { const p = [faceoffPlayer(0), faceoffPlayer(1)]; return `FACE-OFF · ${p[0] ? esc(p[0].name) : esc(tName(0))} vs ${p[1] ? esc(p[1].name) : esc(tName(1))} · buzz in!`; }
  if (st === "faceoffAnswer") {
    const t = G.fo.order[G.fo.step]; const p = G.fo.step === 0 && G.fo.buzzPid ? roster.find(x => x.pid === G.fo.buzzPid) : faceoffPlayer(t);
    return G.fo.step === 0 ? `<b>${esc(p?.name || tName(t))}</b> buzzed in first! Give us your answer.` : (p?.name ? `<b>${esc(p.name)}</b> (${esc(tName(t))}), beat that answer!` : `<b>${esc(tName(t))}</b>, can you beat that answer?`);
  }
  if (st === "choose") return `<b>${esc(tName(G.fo.winner))}</b>: play or pass?`;
  if (st === "play") { const p = turnPlayer(G.control); return p ? `<b>${esc(p.name)}</b>, it's your turn. Give us an answer!` : `Next player on <b>${esc(tName(G.control))}</b>, give us an answer!`; }
  if (st === "steal") return `<b class="hot">STEAL</b> · ${esc(tName(1 - G.control))} captain, one answer!`;
  if (st === "award" || st === "reveal") return esc(G.awardMsg);
  if (st === "roundEnd") return G.revealed.length < G.round.a.length ? `${esc(G.awardMsg)} · Host: tap tiles to reveal the rest` : `${esc(G.awardMsg)} · ${G.ri === G.deck.length - 1 ? "Final results next!" : "Ready for the next round?"}`;
  return "";
}

function renderSurvey() {
  const r = G.round, rem = remoteOn();
  const controls = hostControls();
  const active = G.stage === "play" || G.stage === "choose" ? G.control ?? G.fo.winner : G.stage === "faceoffAnswer" ? G.fo.order[G.fo.step] : G.stage === "steal" ? 1 - G.control : null;
  stage.innerHTML = `
  <div class="scene game">
    <div class="spot-l"></div><div class="spot-r"></div>
    <header class="scorebar">
      ${[0, 1].map(t => `<div class="pod t${t} ${active === t ? "lit" : ""}">
        <div class="pod-name">${esc(tName(t))}</div>
        <div class="pod-score"><span id="score-${t}">${G.shown.scores[t]}</span></div>
        ${G.stage === "faceoffAnswer" && G.fo.order[0] === t ? `<div class="buzz-flag">${icon("bolt")} BUZZED IN${buzzerName() ? ` · ${esc(buzzerName())}` : ""}</div>` : ""}
        <div class="pod-roster">${teamRoster(t).map(p => `<i class="${(G.stage === "play" && G.control === t && turnPlayer(t)?.pid === p.pid) ? "on" : ""}">${esc(p.name)}</i>`).join("")}</div>
      </div>`).join(`<div class="bank-pod"><small>Round ${G.ri + 1}/${G.deck.length}</small><b id="bank">${G.shown.bank}</b><em>×${G.mult}</em></div>`)}
    </header>
    <section class="qbar"><span>${r.category === "Bible" ? "Bible Board" : "Holiday Board"} · ${esc(r.ref)}</span><h2 class="${r.q.length > 44 ? "long" : ""}">${esc(r.q)}</h2></section>
    <section class="board-shell">
      <div class="board-chrome"><div class="marquee"></div>
        <div class="board ${G.pending ? "suspense" : ""}">
          ${r.a.map(([ans, pts], i) => {
            const rev = G.revealed.includes(i);
            return `<button class="slat ${rev ? "rev" : ""} ${G.fresh.has(i) ? "flip" : ""} ${i === 0 && rev ? "top" : ""}" data-act="tile" data-v="${i}" style="--d:${i}">
              <span class="slat-in"><span class="f front"><em>${i + 1}</em>${G.peek ? `<span class="peek">${esc(ans)} · ${pts * G.mult}</span>` : ""}</span>
              <span class="f back"><span class="ans">${esc(ans)}</span><strong>${pts * G.mult}</strong></span></span></button>`;
          }).join("")}
        </div>
      </div>
    </section>
    ${G.said ? `<div class="said-bubble t${G.said.team} ${G.said.text.length > 24 ? "long" : ""}"><small>${esc(G.said.name)} says</small><b>“${esc(G.said.text)}”</b></div>` : ""}
    <footer class="lower-third">
      <div class="lt-left"><span class="lt-tag">${G.stage === "steal" ? "STEAL" : G.stage === "faceoff" || G.stage === "faceoffAnswer" ? "FACE-OFF" : G.stage === "play" ? esc(tName(G.control)) + "'s turn" : "ROUND " + (G.ri + 1)}</span><p>${prompt()}</p></div>
        ${G.msg ? `<div class="flash-pill ${/Strike|Time|Already|Nobody/.test(G.msg) ? "bad" : "good"}" key="${esc(G.msg)}">${esc(G.msg)}</div>` : ""}
      <div class="lt-right">
        <div id="clockSlot">${timerHTML()}</div>
        <div class="strikes">${Array.from({ length: STRIKES }, (_, i) => `<span class="${i < G.strikes ? "on" : ""}">✕</span>`).join("")}</div>
      </div>
    </footer>
    <div class="host-dock">
      ${LIVE.includes(G.stage) && !G.pending ? `<form class="tv-answer" data-form="tvAnswer" autocomplete="off">
        <input id="tvAnswer" placeholder="Type the answer…" maxlength="60" spellcheck="false" enterkeyhint="go">
        <button type="button" class="dbtn mic ${listening ? "on" : ""} ${SR ? "" : "nosr"}" data-act="act" data-v="listen:" title="Say the answer">${icon("mic")}</button>
        <button class="dbtn gold" type="submit">Check</button></form>` : ""}
      ${rem ? `<div class="remote-badge">${icon("key")} Host remote</div>` : `<span class="dock-label">HOST</span>
      ${controls.filter(c => G.stage !== "choose").map(c => `<button class="dbtn ${c.kind}" data-act="act" data-v="${c.a}:${c.v ?? ""}">${c.label}</button>`).join("")}
      ${LIVE.includes(G.stage) ? `<button class="dbtn ghost" data-act="act" data-v="peek:" title="Shows answers on screen">${icon("key")} ${G.peek ? "Hide" : "Peek"}</button>` : ""}
      ${G.stage === "roundEnd" && G.revealed.length < G.round.a.length ? `<span class="dock-tip">Tap a tile to reveal it</span>` : ""}`}
    </div>
    <button class="back-btn" data-act="home">${icon("home")}</button>
  </div>`;
  G.fresh.clear();
  if (G.msg) { clearTimeout(G._msgT); const m = G.msg; G._msgT = setTimeout(() => { if (G && G.msg === m) { G.msg = ""; if (screen === "survey") render(); } }, 2600); }
  if (tvTyping) document.getElementById("tvAnswer")?.focus();
  countUp(document.getElementById("bank"), G.shown.bank, G.bank, 600); G.shown.bank = G.bank;
  [0, 1].forEach(t => { if (G.shown.scores[t] !== G.scores[t]) { countUp(document.getElementById(`score-${t}`), G.shown.scores[t], G.scores[t], 1300, () => audio.play("coin", { vol: 0.3 })); G.shown.scores[t] = G.scores[t]; } });
}

function finishSurvey() {
  const sc = G.scores;
  const winner = sc[0] === sc[1] ? null : sc[0] > sc[1] ? 0 : 1;
  const top = Object.entries(G.mvp).sort((x, y) => y[1] - x[1])[0];
  const mvpName = top ? roster.find(p => p.pid === top[0])?.name : null;
  go("results", { kind: "survey", winner, scores: sc, history: G.history, mvp: mvpName ? { name: mvpName, pts: top[1] } : null, title: winner === null ? "It's a TIE!" : `${tName(winner)} wins!`, sub: winner === null ? "Settle it with Fast Money!" : "Champions of Christmas" });
}

/* =========================================================
   FAST MONEY (host taps what each player said)
   ========================================================= */
let F = null;
/* Open-answer Fast Money: the player TYPES or SAYS each answer (their phone, or the TV box).
   Nothing about the survey is shown until the big reveal. Host remote can correct a match. */
function startFast(team = 0) {
  audio.play("gong"); keepAwake();
  F = { team, qs: freshPick(FAST_MONEY_BANK, "fm-recent", 5, x => x.q), phase: "intro", qi: 0, ans: [[], []], pick: [[], []], shown: [0, 0], shownTotal: 0, queue: [] };
  go("fast");
}
const fmPlayers = () => teamRoster(F.team).slice(0, 2);
const fmPlayer = i => fmPlayers()[i]?.name || `Player ${i + 1}`;
const fmLive = () => F.phase === "p1" || F.phase === "p2";
const fmPl = () => (F.phase === "p2" || F.phase === "rev2") ? 1 : 0;
const fmTotal = () => [0, 1].reduce((s, p) => s + F.pick[p].reduce((a, ix, q) => a + (ix >= 0 && q < F.shown[p] ? F.qs[q].a[ix][1] : 0), 0), 0);
function fmMayAnswer(me) {
  if (!fmLive() || me.team !== F.team) return false;
  const want = fmPlayers()[fmPl()];
  return !want || want.pid === me.pid;
}
screens.fast = {
  enter() {
    if (F?.phase === "final") { audio.music("round"); return; }        // back from the win screen to read the answers
    audio.music("fastmoney");
    // don't say "Fast Money!" twice if the lobby just said it
    setTimeout(() => { if (Date.now() - fastIntroAt < 60000 || !audio.voice("vo-fast-money")) audio.play("transition", { vol: 0.6 }); }, 300);
  },
  render() {
    const ph = F.phase, pl = fmPl(), rem = remoteOn();
    const total = fmTotal();
    const rows = F.qs.map((q, qi) => `<div class="fm-row">
      ${[0, 1].map(p => {
        const shown = qi < F.shown[p], ix = F.pick[p][qi], said = F.ans[p][qi];
        if (!shown) return `<div class="fm-cell blank"></div>`;
        const fixedFrom = F.fixed?.[`${p}.${qi}`];
        const was = fixedFrom !== undefined ? `<small class="was-line host">Changed by host (said “${esc(fixedFrom)}”)</small>`
          : p === 1 && F.topWas?.includes(qi) ? `<small class="was-line">Top answer: ${esc(q.a[0][0])} · ${q.a[0][1]}</small>` : "";
        return `<div class="fm-cell ${ix >= 0 ? "hit" : "miss"} ${ix === 0 ? "top" : ""} ${was ? "has-was" : ""} flip"><span>${esc(said || "(pass)")}${was}</span><b>${ix >= 0 ? q.a[ix][1] : 0}</b></div>`;
      }).join("")}${F.tops ? (qi < F.tops ? `<div class="fm-cell topans flip"><span>${esc(q.a[0][0])}</span><b>${q.a[0][1]}</b></div>` : `<div class="fm-cell blank"></div>`) : ""}</div>`).join("");
    let center = "";
    if (ph === "intro") center = `<div class="fm-intro"><h1>FAST <span>MONEY</span></h1><p>Two players · five questions · type or say your answers · reach <b>200</b> together!</p>
      ${F.prev ? `<p class="fm-chase">${esc(tName(F.prev.team))} scored <b>${F.prev.total}</b>. ${esc(tName(F.team))}: reach 200 to win, or beat ${F.prev.total}!</p>`
        : `<div class="fm-team">${[0, 1].map(t => `<button class="${F.team === t ? "on" : ""} t${t}" data-act="act" data-v="fmTeam:${t}">${esc(tName(t))}</button>`).join("")}</div>`}
      <div class="fm-who"><span>1 · ${esc(fmPlayer(0))} <em>20 sec</em></span><span>2 · ${esc(fmPlayer(1))} <em>25 sec</em></span></div>
      <p class="small">${esc(fmPlayer(1))}: leave the room (or cover your ears) until it's your turn!</p></div>`;
    else if (fmLive()) center = `<div class="fm-live"><div class="fm-clock" id="clockSlot">${timerHTML()}</div>
      <div class="fm-q" key="${F.qi}"><small>${esc(fmPlayer(pl))} · Question ${F.qi + 1} of 5</small><h2>${esc(F.qs[F.qi].q)}</h2></div>
      <div class="fm-dots">${F.qs.map((_, q) => `<i class="${F.ans[pl][q] !== undefined ? "done" : q === F.qi ? "now" : ""}"></i>`).join("")}</div></div>`;
    stage.innerHTML = `<div class="scene fast">
      ${rays()}
      <div class="fm-board-wrap ${center ? "hidden" : ""}"><div class="board-chrome"><div class="marquee"></div>
        <div class="fm-board ${F.tops ? "tops" : ""}"><div class="fm-heads"><span>${esc(fmPlayer(0))}</span><span>${esc(fmPlayer(1))}</span>${F.tops ? "<span>Top answer</span>" : ""}</div>${rows}<div class="fm-total"><small>TOTAL</small><b id="fmTotal">${F.shownTotal}</b><span>/ 200</span></div></div></div></div>
      ${center ? `<div class="fm-center">${center}</div>` : ""}
      <div class="host-dock wide">
        ${fmLive() ? `<form class="tv-answer" data-form="tvAnswer" autocomplete="off"><input id="tvAnswer" placeholder="Type ${esc(fmPlayer(pl))}'s answer…" maxlength="60" spellcheck="false" enterkeyhint="next">
          <button type="button" class="dbtn mic ${listening ? "on" : ""} ${SR ? "" : "nosr"}" data-act="act" data-v="listen:">${icon("mic")}</button><button class="dbtn gold" type="submit">Lock in</button></form>` : ""}
        ${rem ? `<div class="remote-badge">${icon("key")} Host remote</div>` : `<span class="dock-label">HOST</span>${fmControls().filter(c => !c.remoteOnly).map(c => `<button class="dbtn ${c.kind}" data-act="act" data-v="${c.a}:${c.v ?? ""}">${c.label}</button>`).join("")}`}
      </div>
      <button class="back-btn" data-act="home">${icon("home")}</button>
    </div>`;
    if (tvTyping || fmLive()) document.getElementById("tvAnswer")?.focus();
    const el = document.getElementById("fmTotal");
    if (total !== F.shownTotal) { countUp(el, F.shownTotal, total, 700); F.shownTotal = total; }
  }
};
function fmControls() {
  const ph = F.phase;
  if (ph === "intro") return [{ a: "fmStart", v: 0, label: `Start ${fmPlayer(0)}: 20 seconds`, kind: "gold", main: true }];
  if (fmLive()) return [{ a: "fmPass", label: "Pass (come back later)", kind: "ghost" }];
  if (ph === "rev1" || ph === "rev2") {
    const p = ph === "rev1" ? 0 : 1, out = [];
    // host remote only: a separate, clearly-labelled step (it opens a panel on the host's phone)
    if (F.shown[p] > 0) out.push({ a: "fmFixMenu", label: "✎ Fix an answer's match", kind: "ghost", remoteOnly: true });
    if (F.shown[p] < 5) return [{ a: "fmReveal", label: `Reveal answer ${F.shown[p] + 1} ▶`, kind: "gold", main: true }, ...out];
    if (ph === "rev1") return [{ a: "fmStart", v: 1, label: `Bring in ${fmPlayer(1)}: 25 seconds`, kind: "red", main: true }, ...out];
    const tops = (F.tops || 0) < 5 ? [{ a: "fmTops", label: "Reveal the top answers", kind: "ghost" }] : [];
    if (!F.prev) return [...tops, { a: "fmNextTeam", label: `${tName(1 - F.team)}'s turn ▶`, kind: "gold", main: true }, ...out];
    return [...tops, { a: "fmDone", label: "Final result ▶", kind: "gold", main: true }, ...out];
  }
  if (ph === "final") return [...((F.tops || 0) < 5 ? [{ a: "fmTops", label: "Reveal the top answers", kind: "ghost" }] : []), { a: "fmDone", label: "Back to the celebration ▶", kind: "gold", main: true }];
  return [];
}
/* a typed / spoken answer for the current Fast Money question */
function fmSubmit(text, who = null, alts = []) {
  text = String(text || "").trim();
  if (!fmLive() || !text) return;
  const pl = fmPl(), ix = bestMatch(text, alts, F.qs[F.qi].a);
  if (pl === 1 && ix >= 0 && ix === F.pick[0][F.qi]) {           // same answer as player 1
    audio.play("buzzer"); setTimeout(() => { if (!audio.voice("vo-duplicate")) audio.voice("vo-try-again"); }, 450);
    card(`<div class="banner-card hot"><b>DUPLICATE!</b><small>Already said. Try again!</small></div>`, "banner", 1200);
    if (who) room?.sendTo(who.pid, { t: "result", kind: "again", msg: "Already said! Try another answer." });
    return;
  }
  F.ans[pl][F.qi] = text; F.pick[pl][F.qi] = ix;
  audio.play("pop");
  fmAdvance();
}
function fastAct(a, v) {
  if (a === "fmTeam" && F.phase === "intro") { F.team = +v; audio.play("pop"); return render(); }
  if (a === "fmStart") {
    const pl = +v; F.phase = pl ? "p2" : "p1"; F.qi = 0; F.queue = [1, 2, 3, 4];
    audio.play("transition", { vol: 0.6 });
    // "Player 1, you have 20 seconds…": the clock starts when the host finishes talking
    const said = audio.voice(pl ? "vo-fm-player2" : "vo-fm-player1");
    const wait = said ? Math.min(5000, audio.length(pl ? "vo-fm-player2" : "vo-fm-player1") * 1000 + 200) : 0;
    Object.assign(T, { left: pl ? 25 : 20, max: pl ? 25 : 20 });
    render();
    clearTimeout(F._go);
    F._go = setTimeout(() => { if (screen === "fast" && fmLive()) setTimer(pl ? 25 : 20, () => fmEnd(false), true); }, wait);
    return;
  }
  if (a === "fmPass" && fmLive()) {
    if (F.queue.length) { F.queue.push(F.qi); audio.play("whoosh", { vol: 0.5 }); return fmAdvance(); }
    F.ans[fmPl()][F.qi] = ""; F.pick[fmPl()][F.qi] = -1; return fmAdvance();
  }
  if (a === "fmReveal") {
    const p = F.phase === "rev1" ? 0 : 1; if (F.shown[p] >= 5 || F._revealing) return;
    const qn = F.shown[p], ix = F.pick[p][qn];
    F._revealing = true;
    audio.play("whoosh", { vol: 0.5 });
    card(`<div class="fm-qflash"><small>Question ${qn + 1}</small><b>${esc(F.qs[qn].q)}</b><em>${esc(fmPlayer(p))} said…</em></div>`, "fmq", 1700).then(() => {
    F._revealing = false;
    if (screen !== "fast") return;
    F.shown[p]++;
    render();
    setTimeout(() => {
      if (ix >= 0) {
        audio.play("chime");
        if (ix === 0) { setTimeout(() => audio.play("top"), 250); setTimeout(() => audio.voice("vo-top-answer"), 650); confetti(70, { x: 0.5, y: 0.4 }); }
      } else audio.wrong();
      if (p === 1 && ix !== 0) {                 // player 2 missed the #1 answer: "The top answer was…"
        const q = F.shown[p] - 1;
        setTimeout(() => {
          if (screen !== "fast") return;
          audio.voice("vo-top-was");
          setTimeout(() => { if (screen !== "fast") return; (F.topWas ||= []).push(q); audio.play("chime", { rate: 1.1 }); render(); }, 1300);
        }, ix >= 0 ? 1100 : 1500);
      }
      // crossed 200? celebrate right now, don't make them wait
      if (!F.won && fmTotal() >= 200) { F.won = true; audio.play("cheer", { vol: 0.6 }); strobe("party", 1800); setTimeout(() => { if (screen === "fast") fmFinish(); }, 1800); }
    }, 180);
    });
    return;
  }
  if (a === "fmTops") {
    if (F._topsRunning) return;
    F._topsRunning = true;
    const step = () => {
      if (screen !== "fast" || !F || F.tops >= 5) { if (F) F._topsRunning = false; if (screen === "fast") render(); return; }
      F.tops = (F.tops || 0) + 1; render(); audio.play("chime", { rate: 1.08 });
      setTimeout(step, 1300);
    };
    step();
    return;
  }
  if (a === "fmFix") {
    const [p, q, i] = String(v).split(".").map(Number);
    if (!F.pick[p] || q >= F.shown[p]) return;
    F.pick[p][q] = i;
    (F.fixed ||= {})[`${p}.${q}`] = F.ans[p][q] || "(pass)";            // remember what the player actually said
    F.ans[p][q] = i >= 0 ? F.qs[q].a[i][0] : (F.ans[p][q] || "");      // board shows the answer the host chose
    audio.play(i >= 0 ? "chime" : "nope");
    card(`<div class="banner-card"><small>Host changed question ${q + 1}</small><b>${i >= 0 ? `${esc(F.qs[q].a[i][0])} · ${F.qs[q].a[i][1]}` : "No match · 0"}</b></div>`, "banner", 1600);
    render();
    return;
  }
  if (a === "fmDone") return fmFinish();
  if (a === "fmNextTeam" && !F.prev) {
    const prev = { team: F.team, total: fmTotal() };
    clearTimeout(F._go);
    F = { team: 1 - prev.team, prev, qs: freshPick(FAST_MONEY_BANK, "fm-recent", 5, x => x.q), phase: "intro", qi: 0, ans: [[], []], pick: [[], []], shown: [0, 0], shownTotal: 0, queue: [] };
    audio.play("whoosh"); freshScene = true; render();
    card(`<div class="banner-card t${F.team}"><small>${esc(tName(prev.team))} scored ${prev.total}</small><b>${esc(tName(F.team))}'s turn!</b></div>`, "banner", 2200);
    setTimeout(() => turnVoice(F.team), 900);
  }
}
function fmFinish() {
  const total = fmTotal(), won = total >= 200;
  if (F.prev) {                                   // both teams played: 200 wins, otherwise closest to 200
    const t = [0, 0]; t[F.prev.team] = F.prev.total; t[F.team] = total;
    const w = won ? F.team : t[0] === t[1] ? null : t[0] > t[1] ? 0 : 1;
    return go("results", { kind: "fast", fmTeams: t, winner: w, won, scores: [Math.max(...t)],
      title: won ? `${tName(F.team)} WIN!` : w === null ? "It's a TIE!" : `${tName(w)} wins!`,
      sub: won ? "Fast Money: 200 reached!" : "Nobody hit 200. Closest team wins!" });
  }
  go("results", { kind: "fast", winner: won ? 0 : null, won, scores: [total], title: won ? "FAST MONEY WIN!" : `${total} points!`, sub: won ? `${tName(F.team)} beat 200!` : total > 150 ? "So close! Run it back!" : total >= 90 ? "Nice try! Play again to reach 200" : "Better luck next time!" });
}
function fmAdvance() { if (!F.queue.length) return fmEnd(true); F.qi = F.queue.shift(); render(); }
/* early = all five answered before the clock ran out (no "time's up" over the last answer) */
function fmEnd(early = false) {
  stopClock(); clearTimeout(F._go);
  const pl = fmPl();
  for (let q = 0; q < 5; q++) if (F.ans[pl][q] === undefined) { F.ans[pl][q] = ""; F.pick[pl][q] = -1; }
  F.phase = pl ? "rev2" : "rev1";
  if (early) {
    audio.play("chime", { rate: 1.1 });
    setTimeout(() => audio.voice(pl ? "vo-need-200" : "vo-fm-reveal"), 500);
    card(`<div class="banner-card"><b>All five locked in!</b><small>${T.left > 0 ? `${T.left} seconds to spare · ` : ""}Let's see what the survey says…</small></div>`, "banner", 1800);
  } else {
    audio.play("timeup");
    const next = pl ? "vo-need-200" : "vo-fm-reveal";
    setTimeout(() => { if (audio.voice("vo-times-up")) setTimeout(() => audio.voice(next), 1500); else audio.voice(next); }, 300);
    card(`<div class="banner-card"><b>Time!</b><small>Let's see what the survey says…</small></div>`, "banner", 1600);
  }
  render();
}

/* =========================================================
   NAME THAT CAROL: a clip plays, first team to buzz names the carol
   ========================================================= */
let C = null;
const CAROL_ROUNDS = 8, CAROL_FAST = 10;     // buzz within 10s of music = 20 points, after = 10
function startCarol() {
  audio.play("gong"); keepAwake();
  C = { deck: freshPick(CAROLS, "carol-recent", CAROL_ROUNDS, x => x.id), i: 0, scores: [0, 0], stage: "intro", locked: [], buzz: null, buzzPid: null, clip: null, result: null };
  go("carol");
  carolRound();
}
const carolNow = () => C.deck[C.i];
async function carolRound() {
  C.stage = "intro"; C.locked = []; C.buzz = null; C.buzzPid = null; C.result = null; C.said = null;
  C.clip?.stop();
  C.clip = audio.clip(`assets/carols/${carolNow().id}.mp3`);
  C.clip.onend = () => { if (screen === "carol" && C.stage === "listen") carolReveal(false); };
  freshScene = true; render();
  audio.music(null);
  audio.play("timpani"); strobe("sweep", 2000);
  await card(`<div class="round-card"><div class="rc-kicker">Carol ${C.i + 1} of ${C.deck.length}</div>
    <div class="rc-coin note"><span>♪</span></div><div class="rc-title">Name That Carol!</div><div class="rc-sub">Buzz in as soon as you know it</div></div>`, "round", 2200);
  if (screen !== "carol") return;
  await C.clip.ready;
  if (screen !== "carol") return;
  C.stage = "listen"; render(); C.clip.play();
}
function carolBuzz(t, pid = null) {
  if (C?.stage !== "listen" || C.locked.includes(t)) return;
  C.clip.pause();
  C.buzz = t; C.buzzPid = pid; C.stage = "answer";
  audio.buzzer(t); strobe("flash", 700);
  const who = pid ? roster.find(p => p.pid === pid)?.name : null;
  card(`<div class="buzz-card t${t}"><div class="burst"></div><small>Buzzed in!</small><b>${esc(tName(t))}</b>${who ? `<em>${esc(who)}, name that carol!</em>` : ""}</div>`, "buzz", 1400);
  render();
  setTimer(15, () => carolJudge(false), true);
}
/* a typed/spoken title: correct only if this carol is the BEST match among all carols */
function carolGuess(text, alts = []) {
  if (C?.stage !== "answer" || !String(text).trim()) return;
  const titles = CAROLS.map(c => [c.title, 1, c.aliases]);
  const i = bestMatch(text, alts, titles, 0.8);       // titles need a strong match (O Come All Ye Faithful ≠ O Come Emmanuel)
  C.said = text;
  carolJudge(i >= 0 && CAROLS[i].id === carolNow().id);
}
function carolJudge(ok) {
  if (C?.stage !== "answer") return;
  stopClock();
  const t = C.buzz, pid = C.buzzPid;
  if (ok) {
    const pts = C.clip.elapsed() <= CAROL_FAST ? 20 : 10;
    C.scores[t] += pts;
    if (pid && room) room.sendTo(pid, { t: "result", kind: "correct", answer: carolNow().title, pts });
    return carolReveal(true, t, pts);
  }
  audio.wrong(); setTimeout(() => audio.play("gasp", { vol: 0.7 }), 500);
  if (pid && room) room.sendTo(pid, { t: "result", kind: "wrong", text: C.said, strikes: 0, msg: "Not this carol!" });
  C.locked.push(t); C.buzz = null; C.buzzPid = null;
  if (C.locked.length >= 2) return carolReveal(false);
  card(`<div class="banner-card hot"><small>Not quite!</small><b>${esc(tName(1 - t))}, your chance!</b></div>`, "banner", 1400)
    .then(() => { if (screen === "carol" && C.stage === "answer") { C.stage = "listen"; render(); C.clip.play(); } });
  C.stage = "answer";            // stays locked until the banner finishes
  render();
}
function carolReveal(won, t = null, pts = 0) {
  stopClock();
  C.stage = "reveal"; C.result = { won, t, pts };
  if (!C.clip.playing) C.clip.play();             // let the carol ring out under the reveal
  if (won) { audio.play("applause", { vol: 0.8 }); setTimeout(() => audio.play("cheer", { vol: 0.5 }), 300); strobe("gold", 1800); confetti(90, { x: 0.5, y: 0.4 }); }
  else audio.play("chime");
  render();
}
function carolNext() {
  if (C.stage !== "reveal") return;
  C.clip?.stop();
  if (C.i === C.deck.length - 1) {
    const sc = C.scores, w = sc[0] === sc[1] ? null : sc[0] > sc[1] ? 0 : 1;
    return go("results", { kind: "carol", winner: w, scores: sc, title: w === null ? "It's a TIE!" : `${tName(w)} wins!`, sub: "Name That Carol champions" });
  }
  C.i++; audio.play("whoosh"); carolRound();
}
function carolAct(a, v) {
  if (a === "cBuzz") return carolBuzz(+v);
  if (a === "cRight") return carolJudge(true);
  if (a === "cWrong") return carolJudge(false);
  if (a === "cReveal" && (C.stage === "listen" || C.stage === "answer")) { C.clip.pause(); return carolReveal(false); }
  if (a === "cNext") return carolNext();
  if (a === "listen") return listenTV();
}
function carolControls() {
  if (!C) return [];
  if (C.stage === "listen") return [{ a: "cBuzz", v: 0, label: `${tName(0)} buzzed`, kind: "t0" }, { a: "cBuzz", v: 1, label: `${tName(1)} buzzed`, kind: "t1" }, { a: "cReveal", label: "Reveal the title", kind: "ghost" }];
  if (C.stage === "answer" && C.buzz !== null) return [{ a: "cRight", label: "✓ Correct", kind: "gold" }, { a: "cWrong", label: "✕ Wrong", kind: "x" }];
  if (C.stage === "reveal") return [{ a: "cNext", label: C.i === C.deck.length - 1 ? "Final results ▶" : "Next carol ▶", kind: "gold", main: true }];
  return [];
}
screens.carol = {
  enter() { audio.music(null); },
  render() {
    const c = carolNow(), st = C.stage, rem = remoteOn(), res = C.result;
    const eq = Array.from({ length: 24 }, (_, i) => `<i style="--i:${i}"></i>`).join("");
    stage.innerHTML = `<div class="scene carol">
      <div class="spot-l"></div><div class="spot-r"></div>
      <header class="scorebar">${[0, 1].map(t => `<div class="pod t${t} ${C.buzz === t ? "lit" : ""} ${C.locked.includes(t) && st !== "reveal" ? "out" : ""}"><div class="pod-name">${esc(tName(t))}</div><div class="pod-score"><span>${C.scores[t]}</span></div></div>`).join(`<div class="bank-pod"><small>Carol</small><b>${C.i + 1}</b><em>of ${C.deck.length}</em></div>`)}</header>
      <section class="carol-stage ${st}">
        <div class="vinyl ${st === "listen" || st === "reveal" ? "spin" : ""}"><div class="label">♪</div></div>
        <div class="eq ${st === "listen" || st === "reveal" ? "on" : ""}">${eq}</div>
        <div class="notes"><span>♪</span><span>♫</span><span>♪</span><span>♬</span><span>♫</span></div>
        ${st === "reveal" ? `<div class="carol-title"><small>${res?.won ? `${esc(tName(res.t))} +${res.pts}` : "The carol was"}</small><b>${esc(c.title)}</b></div>` : `<div class="carol-hint">${st === "answer" ? `<b>${esc(tName(C.buzz ?? 0))}</b>, name that carol!` : st === "listen" ? "Listen… buzz in when you know it!" : "Get ready…"}</div>`}
      </section>
      <footer class="lower-third"><div class="lt-left"><span class="lt-tag">${st === "answer" ? "ANSWER" : st === "reveal" ? "REVEAL" : "LISTEN"}</span><p>${st === "listen" ? `Phones: hit <b>BUZZ</b>! First ${CAROL_FAST} seconds = <b>20 points</b>` : st === "answer" ? "Type or say the carol's name" : st === "reveal" ? (res?.won ? "Correct!" : "Nobody got it this time.") : ""}</p></div>
        <div class="lt-right"><div id="clockSlot">${timerHTML()}</div></div></footer>
      <div class="host-dock wide">
        ${st === "answer" ? `<form class="tv-answer" data-form="tvAnswer" autocomplete="off"><input id="tvAnswer" placeholder="Type the carol's name…" maxlength="60" spellcheck="false" enterkeyhint="go">
          <button type="button" class="dbtn mic ${listening ? "on" : ""} ${SR ? "" : "nosr"}" data-act="act" data-v="listen:">${icon("mic")}</button><button class="dbtn gold" type="submit">Check</button></form>` : ""}
        ${rem ? `<div class="remote-badge">${icon("key")} Host remote</div>` : `<span class="dock-label">HOST</span>${carolControls().map(x => `<button class="dbtn ${x.kind}" data-act="act" data-v="${x.a}:${x.v ?? ""}">${x.label}</button>`).join("")}`}
      </div>
      <button class="back-btn" data-act="home">${icon("home")}</button>
    </div>`;
  }
};

/* =========================================================
   CHRISTMAS SKETCH (Pictionary): one player draws on their phone, it appears live on the TV
   ========================================================= */
let K = null;
const SKETCH_TURNS = 6, SKETCH_SECS = 60, PAPER = "#fffdf6";
function startSketch() {
  audio.play("gong"); keepAwake();
  K = { deck: freshPick(SKETCH_WORDS, "sketch-recent", SKETCH_TURNS + 6, x => x.w), turn: 0, scores: [0, 0], ptr: [0, 0], strokes: [], stage: "intro", skips: 0,
        team: 0, word: { w: "", a: [] }, drawerPid: null, turnId: "" };     // complete state before the first draw
  go("sketch");
  sketchTurn();
}
const sketchArtist = () => K.drawerPid ? roster.find(p => p.pid === K.drawerPid) : null;
async function sketchTurn() {
  K.team = K.turn % 2;
  const r = teamRoster(K.team);
  const artist = r.length ? r[K.ptr[K.team] % r.length] : null;
  K.drawerPid = artist?.pid || null;
  K.word = K.deck.shift() || SKETCH_WORDS[Math.floor(Math.random() * SKETCH_WORDS.length)];
  K.strokes = []; K.stage = "intro"; K.result = null; K.msg = ""; K.turnId = Math.random().toString(36).slice(2, 8); K.skips = 0;
  freshScene = true; render();
  audio.music("game");
  audio.play("timpani"); strobe("sweep", 2000);
  await card(`<div class="round-card"><div class="rc-kicker">Sketch ${K.turn + 1} of ${SKETCH_TURNS}</div>
    <div class="rc-coin note"><span>✎</span></div><div class="rc-title">${esc(tName(K.team))} draws!</div>
    <div class="rc-sub">${artist ? `Artist: ${esc(artist.name)}. Check your phone` : "Artist: come draw on the screen"}</div></div>`, "round", 2400);
  if (screen !== "sketch") return;
  K.stage = "ready"; render();
}
function sketchStart() {
  if (K?.stage !== "ready") return;
  K.stage = "draw"; K.msg = "";
  audio.play("whoosh"); render();
  setTimer(SKETCH_SECS, () => sketchSteal(), true);
}
function sketchSteal() {
  if (K.stage !== "draw") return;
  stopClock();
  K.stage = "steal";
  audio.play("steal"); strobe("red", 1800); audio.voice("vo-steal");
  card(`<div class="steal-card"><div class="alarm"></div><b>STEAL!</b><small>${esc(tName(1 - K.team))}: one guess for 10 points!</small></div>`, "steal", 2000)
    .then(() => { if (screen === "sketch" && K.stage === "steal") { render(); setTimer(15, () => sketchReveal(null, 0), true); } });
  render();
}
/* does this guess name the secret word? (compared against ALL words, so "deer" ≠ "reindeer" mix-ups) */
function sketchIsRight(text, alts = []) {
  const all = SKETCH_WORDS.map(x => [x.w, 1, x.a]);
  const i = bestMatch(text, alts, all, 0.8);
  return i >= 0 && SKETCH_WORDS[i].w === K.word.w;
}
function sketchGuess(text, who = null, alts = []) {
  text = String(text || "").trim();
  if (!text || !["draw", "steal"].includes(K?.stage)) return;
  const ok = sketchIsRight(text, alts);
  if (ok) return sketchReveal(K.stage === "steal" ? 1 - K.team : K.team, null, who);
  if (K.stage === "steal") { audio.wrong(); audio.play("gasp", { vol: 0.6 }); if (who) room?.sendTo(who.pid, { t: "result", kind: "wrong", text, strikes: 0, msg: "Not the word!" }); return sketchReveal(null, 0); }
  audio.play("nope", { vol: 0.6 });
  K.msg = `“${text}” isn't it… keep guessing!`;
  if (who) room?.sendTo(who.pid, { t: "result", kind: "again", msg: `"${text}" isn't it. Keep guessing!` });
  render();
}
function sketchReveal(team, forcePts = null, who = null) {
  stopClock();
  const pts = team === null ? 0 : forcePts ?? (K.stage === "steal" ? 10 : T.left >= 30 ? 30 : 20);
  if (team !== null) {
    K.scores[team] += pts;
    audio.play("chime"); setTimeout(() => audio.play("applause", { vol: 0.7 }), 200); setTimeout(() => audio.play("cheer", { vol: 0.5 }), 500);
    strobe("gold", 1800); confetti(100, { x: 0.5, y: 0.4 });
    if (who) room?.sendTo(who.pid, { t: "result", kind: "correct", answer: K.word.w, pts });
  } else audio.play("chime");
  K.ptr[K.team]++;                                  // next time this team draws, a different artist
  K.stage = "reveal"; K.result = { team, pts }; K.msg = "";
  render();
}
function sketchNext() {
  if (K.stage !== "reveal") return;
  if (K.turn >= SKETCH_TURNS - 1) {
    const sc = K.scores, w = sc[0] === sc[1] ? null : sc[0] > sc[1] ? 0 : 1;
    return go("results", { kind: "sketch", winner: w, scores: sc, title: w === null ? "It's a TIE!" : `${tName(w)} wins!`, sub: "Christmas Sketch champions" });
  }
  K.turn++; audio.play("whoosh"); sketchTurn();
}
function sketchSkip() {
  if (!["ready", "draw"].includes(K.stage) || K.skips >= 1) return;
  K.skips++; K.word = K.deck.shift() || K.word; K.strokes = []; redrawSketch();
  audio.play("whoosh", { vol: 0.6 }); K.msg = "New word for the artist!"; render();
}
/* ---- strokes from the artist's phone (or drawn right on the TV) ---- */
function sketchStroke(m) {
  if (!["ready", "draw"].includes(K.stage)) return;
  if (K.stage === "ready") sketchStart();                 // first line starts the clock
  let s = K.strokes.find(x => x.id === m.id);
  if (!s) { s = { id: m.id, c: m.c, w: m.w, pts: [] }; K.strokes.push(s); }
  const from = s.pts.length;
  s.pts.push(...m.pts);
  drawSegment(s, Math.max(0, from - 1));
}
function sketchUndo() { K.strokes.pop(); redrawSketch(); }
function sketchClear() { K.strokes = []; redrawSketch(); }
function sketchCanvas() { return document.getElementById("sketchCanvas"); }
function drawSegment(s, fromIdx) {
  const cv = sketchCanvas(); if (!cv) return;
  const g = cv.getContext("2d"), W = cv.width, H = cv.height;
  g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = s.c; g.lineWidth = Math.max(2, s.w * W);
  g.beginPath();
  const p0 = s.pts[fromIdx]; if (!p0) return;
  g.moveTo(p0[0] * W, p0[1] * H);
  if (s.pts.length === 1) g.lineTo(p0[0] * W + 0.1, p0[1] * H + 0.1);
  for (let i = fromIdx + 1; i < s.pts.length; i++) g.lineTo(s.pts[i][0] * W, s.pts[i][1] * H);
  g.stroke();
}
function redrawSketch() {
  const cv = sketchCanvas(); if (!cv) return;
  const g = cv.getContext("2d"); g.fillStyle = PAPER; g.fillRect(0, 0, cv.width, cv.height);
  K.strokes.forEach(s => drawSegment(s, 0));
}
/* host draws on the TV itself when the artist has no phone */
function wireTvDrawing() {
  const cv = sketchCanvas(); if (!cv || K.drawerPid || !["ready", "draw"].includes(K.stage)) return;
  let cur = null;
  const pt = e => { const r = cv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  cv.onpointerdown = e => { try { cv.setPointerCapture(e.pointerId); } catch {} cur = { id: "tv" + Date.now(), c: K.tvColor || "#14214a", w: K.tvSize || 0.008, pts: [pt(e)] }; sketchStroke(cur); };
  cv.onpointermove = e => { if (!cur) return; sketchStroke({ id: cur.id, c: cur.c, w: cur.w, pts: [pt(e)] }); };
  cv.onpointerup = cv.onpointercancel = () => { cur = null; };
}
function sketchAct(a, v) {
  if (a === "kStart") return sketchStart();
  if (a === "kGot") return sketchReveal(K.stage === "steal" ? 1 - K.team : K.team);
  if (a === "kMiss" && K.stage === "steal") { audio.wrong(); return sketchReveal(null, 0); }
  if (a === "kSteal" && K.stage === "draw") return sketchSteal();
  if (a === "kSkip") return sketchSkip();
  if (a === "kReveal" && ["draw", "steal"].includes(K.stage)) return sketchReveal(null, 0);
  if (a === "kNext") return sketchNext();
  if (a === "kUndo") return sketchUndo();
  if (a === "kClear") return sketchClear();
  if (a === "kColor") { K.tvColor = v; return render(); }
  if (a === "listen") return listenTV();
}
function sketchControls() {
  if (!K) return [];
  const st = K.stage, gotLabel = st === "steal" ? `✓ ${tName(1 - K.team)} stole it` : `✓ ${tName(K.team)} got it!`;
  if (st === "ready") return [{ a: "kStart", label: "Start the clock ▶", kind: "gold", main: true }, ...(K.skips < 1 ? [{ a: "kSkip", label: "New word", kind: "ghost" }] : [])];
  if (st === "draw") return [{ a: "kGot", label: gotLabel, kind: "gold" }, ...(K.skips < 1 ? [{ a: "kSkip", label: "New word", kind: "ghost" }] : []), { a: "kSteal", label: "Time's up → steal", kind: "red" }];
  if (st === "steal") return [{ a: "kGot", label: gotLabel, kind: "gold" }, { a: "kMiss", label: "✕ Missed", kind: "x" }];
  if (st === "reveal") return [{ a: "kNext", label: K.turn >= SKETCH_TURNS - 1 ? "Final results ▶" : "Next sketch ▶", kind: "gold", main: true }];
  return [];
}
const blanks = w => w.split(" ").map(part => part.replace(/[A-Za-z]/g, "_")).join("   ").split("").join(" ");
screens.sketch = {
  enter() { audio.music("game"); },
  render() {
    const st = K.stage, rem = remoteOn(), artist = sketchArtist(), tvDraw = !K.drawerPid && ["ready", "draw"].includes(st);
    const res = K.result;
    stage.innerHTML = `<div class="scene sketch">
      <div class="spot-l"></div><div class="spot-r"></div>
      <header class="scorebar">${[0, 1].map(t => `<div class="pod t${t} ${K.team === t && st !== "steal" || (st === "steal" && t === 1 - K.team) ? "lit" : ""}"><div class="pod-name">${esc(tName(t))}</div><div class="pod-score"><span>${K.scores[t]}</span></div></div>`).join(`<div class="bank-pod"><small>Sketch</small><b>${K.turn + 1}</b><em>of ${SKETCH_TURNS}</em></div>`)}</header>
      <section class="sketch-wrap">
        <div class="easel"><canvas id="sketchCanvas" width="960" height="600" class="${tvDraw ? "drawable" : ""}"></canvas>
          ${st === "reveal" ? `<div class="sketch-word"><small>${res?.team !== null && res?.team !== undefined ? `${esc(tName(res.team))} +${res.pts}` : "The word was"}</small><b>${esc(K.word.w)}</b></div>` : ""}
          ${st === "ready" && !tvDraw ? `<div class="easel-wait">${esc(artist?.name || "Artist")}, look at your phone and start drawing!</div>` : ""}
        </div>
        <aside class="sketch-side">
          <div class="side-team t${K.team}"><small>Artist</small><b>${esc(artist?.name || tName(K.team))}</b><em>${esc(tName(K.team))}</em></div>
          <div class="side-clock" id="clockSlot">${timerHTML()}</div>
          <div class="side-blanks">${st === "reveal" ? esc(K.word.w.toUpperCase()) : esc(blanks(K.word.w))}</div>
          <p class="side-hint">${st === "draw" ? `${esc(tName(K.team))}: guess on your phones or shout it out!` : st === "steal" ? `${esc(tName(1 - K.team))}: one guess to steal!` : st === "ready" ? "Clock starts with the first line" : ""}</p>
          ${K.msg ? `<p class="side-msg">${esc(K.msg)}</p>` : ""}
        </aside>
      </section>
      <div class="host-dock wide">
        ${["draw", "steal"].includes(st) ? `<form class="tv-answer" data-form="tvAnswer" autocomplete="off"><input id="tvAnswer" placeholder="Type a guess…" maxlength="40" spellcheck="false" enterkeyhint="go">
          <button type="button" class="dbtn mic ${listening ? "on" : ""} ${SR ? "" : "nosr"}" data-act="act" data-v="listen:">${icon("mic")}</button><button class="dbtn gold" type="submit">Guess</button></form>` : ""}
        ${tvDraw ? `<span class="tv-pens">${["#14214a", "#d42a3c", "#1fa36b", "#2d64cc", "#8a5a14", "#f0b840"].map(c => `<button class="pen ${(K.tvColor || "#14214a") === c ? "on" : ""}" style="background:${c}" data-act="act" data-v="kColor:${c}"></button>`).join("")}
          <button class="dbtn ghost" data-act="act" data-v="kUndo:">Undo</button><button class="dbtn ghost peek-word" data-hold="word">Hold to see word</button></span>` : ""}
        ${rem ? `<div class="remote-badge">${icon("key")} Host remote</div>` : `<span class="dock-label">HOST</span>${sketchControls().map(x => `<button class="dbtn ${x.kind}" data-act="act" data-v="${x.a}:${x.v ?? ""}">${x.label}</button>`).join("")}`}
      </div>
      <button class="back-btn" data-act="home">${icon("home")}</button>
    </div>`;
    redrawSketch();
    wireTvDrawing();
    const peek = stage.querySelector("[data-hold=word]");
    if (peek) {
      const show = () => { peek.textContent = K.word.w.toUpperCase(); peek.classList.add("showing"); };
      const hide = () => { peek.textContent = "Hold to see word"; peek.classList.remove("showing"); };
      peek.onpointerdown = show; peek.onpointerup = peek.onpointerleave = peek.onpointercancel = hide;
    }
  }
};

/* =========================================================
   CELEBRATION (win screen): bouncing gifts, ornaments, stars, coins
   Drop transparent PNGs into assets/celebrate/ (gift.png, ornament.png, candycane.png,
   bell.png, star.png, coin.png) to replace the drawn ones automatically.
   ========================================================= */
const CELE = {
  gift: '<svg viewBox="0 0 60 60"><rect x="8" y="24" width="44" height="32" rx="3" fill="#d42a3c"/><rect x="5" y="17" width="50" height="11" rx="3" fill="#ff5b6a"/><rect x="26" y="17" width="8" height="39" fill="#f5c451"/><path d="M30 17c-6-12-18-10-14-2 2 3 8 3 14 2zm0 0c6-12 18-10 14-2-2 3-8 3-14 2z" fill="#f5c451"/></svg>',
  ornament: '<svg viewBox="0 0 60 60"><rect x="25" y="4" width="10" height="7" rx="2" fill="#f5c451"/><circle cx="30" cy="35" r="22" fill="#1fb878"/><path d="M10 32c13 6 27 6 40 0" stroke="#f5c451" stroke-width="4" fill="none"/><circle cx="22" cy="27" r="5" fill="#ffffff66"/></svg>',
  star: '<svg viewBox="0 0 60 60"><path d="M30 3l8 17 18 2-13 12 4 18-17-9-17 9 4-18L4 22l18-2z" fill="#ffd86a" stroke="#b07818" stroke-width="2"/></svg>',
  coin: '<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="25" fill="#f7cf5a" stroke="#b07818" stroke-width="4"/><circle cx="30" cy="30" r="17" fill="none" stroke="#fff3c4" stroke-width="2"/><path d="M30 18v24M24 24h12M24 36h12" stroke="#8a5a14" stroke-width="4" stroke-linecap="round"/></svg>',
  bell: '<svg viewBox="0 0 60 60"><path d="M30 6c-11 0-17 9-17 20v12l-6 8h46l-6-8V26C47 15 41 6 30 6z" fill="#f5c451" stroke="#b07818" stroke-width="2"/><circle cx="30" cy="50" r="6" fill="#d42a3c"/><path d="M18 8l-6-4M42 8l6-4" stroke="#1fb878" stroke-width="4"/></svg>',
  candycane: '<svg viewBox="0 0 60 60"><path d="M24 56V22a12 12 0 0 1 24 0" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M24 56V22a12 12 0 0 1 24 0" fill="none" stroke="#d42a3c" stroke-width="10" stroke-linecap="round" stroke-dasharray="6 7"/></svg>'
};
function celebration() {
  const kinds = Object.keys(CELE);
  const spots = [[6, 22], [14, 70], [4, 52], [22, 88], [88, 18], [94, 50], [80, 78], [72, 92], [30, 8], [66, 10], [38, 94], [56, 86]];
  return `<div class="cele">${spots.map(([x, y], i) => {
    const k = kinds[i % kinds.length];
    return `<div class="cele-item c${i % 4}" style="left:${x}%;top:${y}%;--i:${i}"><img src="assets/celebrate/${k}.webp" alt="" onerror="this.remove()">${CELE[k]}</div>`;
  }).join("")}</div>`;
}

/* =========================================================
   BIBLE CHALLENGE (multiple choice, teams alternate)
   ========================================================= */
let A = null;
function startArcade() {
  audio.play("gong"); keepAwake();
  const deck = freshPick(CHALLENGE_BANK, "ac-recent", 10, x => x.q).map(c => { const o = shuffle(c.choices.map((_, i) => i)); return { ...c, choices: o.map(i => c.choices[i]), answer: o.indexOf(c.answer) }; });
  A = { deck, i: 0, scores: [0, 0], picked: null, team: 0 };
  go("arcade");
  setTimer(S.settings.timer || 0, () => arcadeAct("arcPick", -1));
}
screens.arcade = {
  enter() { audio.music("game"); },
  render() {
    const c = A.deck[A.i], rem = remoteOn();
    stage.innerHTML = `<div class="scene arcade">
      <div class="spot-l"></div><div class="spot-r"></div>
      <header class="scorebar">${[0, 1].map(t => `<div class="pod t${t} ${A.team === t ? "lit" : ""}"><div class="pod-name">${esc(tName(t))}</div><div class="pod-score"><span>${A.scores[t]}</span></div></div>`).join(`<div class="bank-pod"><small>Question</small><b>${A.i + 1}</b><em>of ${A.deck.length}</em></div>`)}</header>
      <section class="ac-card"><span class="ac-type">${esc(c.type)}</span><h2>${esc(c.q)}</h2><div id="clockSlot" class="ac-clock">${timerHTML()}</div></section>
      <section class="ac-choices ${c.choices.length === 2 ? "two" : ""}">${c.choices.map((ch, i) => {
        const cls = A.picked === null ? "" : i === c.answer ? "right" : i === A.picked ? "wrong" : "dim";
        return `<button class="ac-choice ${cls}" data-act="act" data-v="arcPick:${i}" style="--d:${i}"><b>${"ABCD"[i]}</b><span>${esc(ch)}</span></button>`; }).join("")}</section>
      <footer class="lower-third"><div class="lt-left"><span class="lt-tag">${A.picked === null ? esc(tName(A.team)) : "ANSWER"}</span><p>${A.picked === null ? `<b>${esc(tName(A.team))}</b>, pick on your phones or say it out loud!` : `${A.by ? `<b>${esc(A.by)}</b> picked ${"ABCD"[A.picked] || "nothing"}. ` : ""}${esc(c.note)}`}</p></div>
        ${A.picked !== null && !rem ? `<button class="dbtn gold big" data-act="act" data-v="arcNext:">${A.i === A.deck.length - 1 ? "Final results ▶" : "Next question ▶"}</button>` : ""}</footer>
      ${rem ? `<div class="remote-badge">${icon("key")} Host remote</div>` : ""}
      <button class="back-btn" data-act="home">${icon("home")}</button>
    </div>`;
  }
};
function arcadeAct(a, v) {
  if (a === "arcPick" && A.picked === null) {
    stopClock();
    const c = A.deck[A.i], i = +v;
    A.picked = i;
    if (i === c.answer) { A.scores[A.team] += 10; audio.play("chime"); setTimeout(() => audio.voice("vo-great"), 600); confetti(60, { x: 0.5, y: 0.6 }); }
    else { audio.wrong(); setTimeout(() => audio.voice("vo-wrong"), 1000); }
    return render();
  }
  if (a === "arcNext" && A.picked !== null) {
    if (A.i === A.deck.length - 1) {
      const sc = A.scores, w = sc[0] === sc[1] ? null : sc[0] > sc[1] ? 0 : 1;
      return go("results", { kind: "arcade", winner: w, scores: sc, title: w === null ? "It's a TIE!" : `${tName(w)} wins!`, sub: "Bible Challenge complete" });
    }
    A.i++; A.team = 1 - A.team; A.picked = null; A.by = null; audio.play("whoosh", { vol: 0.5 }); audio.voice("vo-next-question"); freshScene = true; render();
    setTimer(S.settings.timer || 0, () => arcadeAct("arcPick", -1));
  }
}

/* =========================================================
   RESULTS
   ========================================================= */
let R = null;
screens.results = {
  enter(r) {
    R = r; closeCard(true);
    audio.music("win", { then: "menu" }); audio.play("victory");
    if (r.winner !== null && r.winner !== undefined || r.won) { setTimeout(() => audio.play("cheer", { vol: 0.6 }), 200); setTimeout(() => audio.play("applause", { vol: 0.6 }), 1200); strobe("party", 6000); }
    const champ = r.winner !== null && r.winner !== undefined;
    if (r.kind === "survey" && champ) { setTimeout(() => audio.voice("vo-winner"), 700); setTimeout(() => audio.voice("vo-congrats"), 3500); }
    else if (champ || r.won) setTimeout(() => audio.voice("vo-congrats"), 700);
    else if (r.kind === "fast") setTimeout(() => audio.voice(r.scores?.[0] >= 170 ? "vo-well-tried" : "vo-better-luck"), 900);
    setTimeout(() => { confetti(180); confettiRain(5); }, 400);
  },
  render() {
    const pods = R.kind === "fast" ? "" : [0, 1].map(t => `<div class="res-pod t${t} ${R.winner === t ? "champ" : ""}">${R.winner === t ? icon("crown") : ""}<span>${esc(tName(t))}</span><b>${R.scores[t]}</b></div>`).join("");
    stage.innerHTML = `<div class="scene results">
      ${rays()}
      <div class="trophy"><div class="trophy-glow"></div><img src="assets/trophy.jpg" alt=""></div>
      ${celebration()}
      <h1 class="res-title">${[...R.title].map((ch, i) => ch === " " ? "<span class=sp> </span>" : `<span style="--i:${i}">${esc(ch)}</span>`).join("")}</h1>
      <p class="res-sub">${esc(R.sub)}</p>
      ${R.kind === "fast" && R.fmTeams ? `<div class="res-pods">${[0, 1].map(t => `<div class="res-pod t${t} ${R.winner === t ? "champ" : ""}">${R.winner === t ? icon("crown") : ""}<span>${esc(tName(t))}</span><b>${R.fmTeams[t]}</b></div>`).join("")}</div>`
        : R.kind === "fast" ? `<div class="res-pod solo ${R.won ? "champ" : ""}"><span>Fast Money total</span><b>${R.scores[0]}</b></div>` : `<div class="res-pods">${pods}</div>`}
      ${R.history?.length ? `<div class="res-rounds">${R.history.map(h => `<span class="t${h.team}"><em>R${h.round}${h.mult > 1 ? ` ×${h.mult}` : ""}</em>${esc(tName(h.team))} +${h.pts}${h.stolen ? " (steal)" : ""}</span>`).join("")}
        ${R.mvp ? `<span class="mvp">${icon("star")} MVP: ${esc(R.mvp.name)} · ${R.mvp.pts} pts</span>` : ""}</div>` : ""}
      <div class="res-actions">
        <button class="btn gold xl" data-act="again">${icon("play")} Play again</button>
        ${R.kind === "survey" ? `<button class="btn red xl" data-act="fastFromResults">${icon("bolt")} Fast Money</button>` : ""}
        ${R.kind === "fast" ? `<button class="btn red xl" data-act="fmAll">${icon("star")} See all the answers</button>` : ""}
        <button class="btn ghost xl" data-act="home">${icon("home")} Menu</button>
      </div>
    </div>`;
  }
};
actions.fmAll = () => {
  if (!F) return;
  [0, 1].forEach(p => { for (let q = 0; q < 5; q++) if (F.ans[p][q] !== undefined) F.shown[p] = Math.max(F.shown[p], q + 1); });
  F.phase = "final"; F.tops = F.tops || 0;
  go("fast", null);
};
actions.again = () => { if (R.kind === "fast") startFast(F?.team ?? 0); else if (R.kind === "arcade") startArcade(); else startSurvey(); };
actions.fastFromResults = () => startFast(R.winner ?? 0);

/* =========================================================
   HOW TO PLAY
   ========================================================= */
screens.how = {
  render() {
    const steps = [
      [icon("phone"), "Set up", "Open the game on a laptop, tablet or smart TV, or cast your phone to the TV. Type your two team names."],
      [icon("star"), "Phones are buzzers", "Players scan the big code to join a team. In each face-off, two players' phones light up with a BUZZ button. Fastest finger answers!"],
      [icon("key"), "The host's secret remote", "The host scans the small code. Their phone shows every answer privately and has the buttons: reveal, ✕ strike, play/pass, next."],
      [icon("bolt"), "No phones? Still works", "The face-off players race to slap the table. The host taps who was first, taps tiles to reveal, and taps ✕ for a wrong answer."],
      [icon("crown"), "Strikes & steals", "Three wrong answers and the other team gets ONE steal answer to take the whole bank. Later rounds score double, then triple."],
      [icon("book"), "Fast Money & Bible Challenge", "Bonus games from the menu. Fast Money: two players, five questions, beat 200. Bible Challenge: Scripture multiple choice."]
    ];
    stage.innerHTML = `<div class="scene how">${rays()}<h1 class="how-title">How to Play</h1>
      <div class="how-grid">${steps.map(([ic, h, p], i) => `<article style="--d:${i}">${ic}<h3>${h}</h3><p>${p}</p></article>`).join("")}</div>
      <p class="legal">Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide. · An original Bible Explorer Kids game, not affiliated with any TV program. Point values are for fun, not real survey results.</p>
      <button class="btn gold xl" data-act="lobby" data-v="survey">${icon("play")} Let's play</button>
      <button class="back-btn" data-act="home">${icon("home")}</button></div>`;
  }
};

/* =========================================================
   PHONE VIEWS
   ========================================================= */
function playerView(pid) {
  const me = roster.find(p => p.pid === pid);
  const base = { screen, teams: [tName(0), tName(1)], scores: G && screen === "survey" ? G.scores : A && screen === "arcade" ? A.scores : screen === "results" && R?.scores?.length === 2 ? R.scores : [0, 0], team: me?.team ?? null, name: me?.name || "" };
  let status = "Watch the TV!", buzz = "off", tone = "idle";
  if (screen === "lobby") status = me?.team === null || me?.team === undefined ? "Pick your team!" : "You're in! Waiting for the host to start…";
  if (screen === "survey" && G) {
    const fp = me && me.team !== null ? faceoffPlayer(me.team) : null;
    if (G.stage === "faceoff") {
      if (me && fp && fp.pid === pid) { buzz = "ready"; status = "YOU'RE IN THE FACE-OFF!"; tone = "hot"; }
      else status = fp ? `${fp.name} is in the face-off. Cheer!` : "Face-off! Watch the TV";
    } else if (G.stage === "faceoffAnswer") {
      const t = G.fo.order[0];
      if (me && mayAnswer(me)) { buzz = G.fo.step === 0 ? "won" : "off"; status = G.fo.step === 0 ? "You buzzed first! Your answer?" : "Your chance! Can you beat it?"; tone = "win"; }
      else if (G.fo.buzzPid === pid) status = "Waiting for the other team…";
      else if (fp?.pid === pid) { buzz = "lost"; status = `${tName(t)} was faster!`; }
      else status = `${tName(t)} buzzed in!`;
    } else if (G.stage === "play") {
      const tp = turnPlayer(G.control);
      if (tp?.pid === pid) { status = "YOUR TURN! Type or say an answer"; tone = "hot"; }
      else status = me?.team === G.control ? `${tp?.name || "Your teammate"} is answering. Help them out!` : `${tName(G.control)} is playing.`;
    } else if (G.stage === "steal") { status = me?.team === 1 - G.control ? "STEAL! Huddle up. First answer sent counts!" : `${tName(1 - G.control)} is trying to steal!`; if (me?.team === 1 - G.control) tone = "hot"; }
    else if (G.stage === "choose") { status = me?.team === G.fo.winner ? "You won the face-off! Play or pass?" : `${tName(G.fo.winner)} won the face-off!`; if (me?.team === G.fo.winner) tone = "hot"; }
    else if (G.stage === "roundEnd" || G.stage === "award" || G.stage === "reveal") status = G.awardMsg;
  }
  if (screen === "carol" && C) {
    const mine = me && me.team !== null;
    if (C.stage === "listen" && mine && !C.locked.includes(me.team)) { buzz = "ready"; status = "Name that carol! Buzz when you know it"; tone = "hot"; }
    else if (C.stage === "listen") status = mine ? "Your team already guessed. Listen!" : "Listen!";
    else if (C.stage === "answer") status = C.buzz === me?.team ? (C.buzzPid === pid || !C.buzzPid ? "You buzzed! What's the carol?" : `${roster.find(p => p.pid === C.buzzPid)?.name || "Your teammate"} is answering`) : `${tName(C.buzz ?? 0)} buzzed in!`;
    else if (C.stage === "reveal") status = C.result?.won ? `${tName(C.result.t)} got it: ${carolNow().title}!` : `It was ${carolNow().title}`;
  }
  if (screen === "sketch" && K) {
    const artist = pid === K.drawerPid, mine = me?.team === K.team;
    if (artist) { status = K.stage === "ready" ? "You're the artist! Draw this:" : K.stage === "draw" ? "Draw it! No letters or numbers" : K.stage === "steal" ? "Time's up! The other team is stealing" : K.stage === "reveal" ? (K.result?.team === K.team ? "They got it! Great drawing!" : `It was: ${K.word.w}`) : "Get ready…"; tone = "hot"; }
    else if (K.stage === "draw") status = mine ? "What is it? Guess!" : `${tName(K.team)} is guessing. Get ready to steal!`;
    else if (K.stage === "steal") status = !mine ? "STEAL! One guess, make it count!" : "The other team is trying to steal…";
    else if (K.stage === "reveal") status = `It was: ${K.word.w}`;
    else status = `${sketchArtist()?.name || tName(K.team)} is about to draw. Watch the TV!`;
  }
  if (screen === "results") status = R?.title || "Game over!";
  let answer = screen === "survey" && G && me ? mayAnswer(me) : false;   // shows the type / mic box
  if (screen === "carol" && C?.stage === "answer" && me && C.buzz === me.team && (!C.buzzPid || C.buzzPid === pid)) answer = true;
  let sketch = null;
  if (screen === "sketch" && K && me) {
    if (pid === K.drawerPid) sketch = { artist: true, word: K.word.w, stage: K.stage, turnId: K.turnId, canSkip: K.skips < 1 && ["ready", "draw"].includes(K.stage) };
    else if ((K.stage === "draw" && me.team === K.team) || (K.stage === "steal" && me.team === 1 - K.team)) answer = true;
  }
  const pp = screen === "survey" && G?.stage === "choose" && me?.team === G.fo.winner;
  let q = screen === "survey" && G ? G.round.q : "", mode = "survey", choices = null, answerNow = answer;
  if (screen === "fast" && F) {
    mode = "fast";
    const mine = me && fmMayAnswer(me);
    q = fmLive() ? F.qs[F.qi].q : "";
    answerNow = !!mine;
    status = fmLive() ? (mine ? `FAST MONEY! Question ${F.qi + 1} of 5` : `${fmPlayer(fmPl())} is playing Fast Money!`) : F.phase === "intro" ? `${tName(F.team)} is up for Fast Money!` : "Survey says… watch the TV!";
    tone = mine ? "hot" : "idle";
  }
  if (screen === "arcade" && A) {
    const c = A.deck[A.i];
    mode = "arcade"; q = c.q;
    const mine = me && me.team === A.team && A.picked === null;
    choices = c.choices.map((t, i) => ({ t, state: A.picked === null ? "" : i === c.answer ? "right" : i === A.picked ? "wrong" : "dim" }));
    status = A.picked !== null ? (A.picked === c.answer ? "Correct! +10" : "Not quite!") : mine ? "Your team's question! Pick an answer" : `${tName(A.team)} is answering…`;
    tone = mine ? "hot" : "idle";
    answerNow = false;
    if (!mine && A.picked === null) choices = choices.map(ch => ({ ...ch, state: "locked" }));
  }
  if (sketch) mode = "sketch";
  return { ...base, status, buzz, tone, answer: answerNow, mode, choices, pp, sketch, pending: !!G?.pending && screen === "survey", q };
}
function hostView() {
  const v = { screen, teams: [tName(0), tName(1)] };
  if (screen === "survey" && G) Object.assign(v, {
    q: G.round.q, mult: G.mult, round: G.ri + 1, rounds: G.deck.length, scores: G.scores, bank: G.bank, strikes: G.strikes, stage: G.stage, pending: G.pending,
    answers: G.round.a.map(([t, p], i) => ({ t, p: p * G.mult, r: G.revealed.includes(i) })),
    canReveal: LIVE.includes(G.stage) || G.stage === "roundEnd", prompt: prompt().replace(/<[^>]+>/g, ""), controls: hostControls()
  });
  if (screen === "fast" && F) Object.assign(v, { stage: F.phase, prompt: fmLive() ? `${fmPlayer(fmPl())} · Q${F.qi + 1}: ${F.qs[F.qi].q}` : F.phase.startsWith("rev") ? "Reveal each answer. If a match looks wrong, fix it below." : "Fast Money", controls: fmControls(), total: fmTotal(),
    fmAnswers: fmLive() ? F.qs[F.qi].a.map(([t, p]) => `${t} · ${p}`) : null });
  if (screen === "arcade" && A) { const c = A.deck[A.i]; Object.assign(v, { q: c.q, prompt: `${tName(A.team)} answering`, choices: c.choices.map((t, i) => ({ t, ok: i === c.answer })), picked: A.picked, controls: A.picked === null ? c.choices.map((t, i) => ({ a: "arcPick", v: i, label: `${"ABCD"[i]}. ${t}${i === c.answer ? "  ★" : ""}`, kind: i === c.answer ? "ans ok" : "ans" })) : [{ a: "arcNext", label: "Next question ▶", kind: "gold" }] }); }
  if (screen === "results") v.controls = [{ a: "again", label: "Play again", kind: "gold" }, ...(R?.kind === "survey" ? [{ a: "fastFromResults", label: "Fast Money", kind: "red" }] : []), { a: "menu", label: "Menu", kind: "ghost" }];
  if (screen === "lobby") v.controls = [{ a: "startGameRemote", label: "Start the show ▶", kind: "gold" }];
  if (screen === "carol" && C) Object.assign(v, { prompt: `Now playing (only you can see): ${carolNow().title}`, controls: carolControls() });
  if (screen === "sketch" && K) Object.assign(v, { prompt: `Secret word (only you + the artist): ${K.word.w}`, controls: sketchControls() });
  if (screen === "fast" && F && (F.phase === "rev1" || F.phase === "rev2")) {
    const p = F.phase === "rev1" ? 0 : 1;
    v.fmFixRows = F.qs.slice(0, F.shown[p]).map((q, qi) => ({ p, q: qi, question: q.q, said: F.fixed?.[`${p}.${qi}`] ?? F.ans[p][qi] ?? "", pick: F.pick[p][qi], options: q.a.map(([t, pts], i) => ({ i, label: `${t} · ${pts}` })) }));
  }
  return v;
}
/* ================= misc ================= */
let wakeLock = null;
async function keepAwake() { try { wakeLock = await navigator.wakeLock?.request("screen"); } catch {} }
document.addEventListener("visibilitychange", () => { if (!document.hidden && wakeLock) keepAwake(); });

/* boot */
startSnow();
history.replaceState({ screen: "cover" }, "");
screen = "cover"; document.body.dataset.screen = "cover";
document.getElementById("cover").hidden = false;
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("./sw.js");
window.__CSS = { S, get G() { return G; }, get F() { return F; }, get A() { return A; }, get room() { return room; }, get K() { return K; }, get C() { return C; }, go, act };
