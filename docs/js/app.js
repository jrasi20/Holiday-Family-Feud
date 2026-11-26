// Christmas Bible Survey Showdown: TV / HOST SCREEN
// The TV is a 1600x900 broadcast stage scaled to fit. Phones join by QR:
// players get team buzzers, the host gets a private answer remote.
import { SURVEY_BANK, FAST_MONEY_BANK, CHALLENGE_BANK, shuffle } from "./data.js";
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
  phone: '<svg viewBox="0 0 24 24"><rect class="ln" x="6.5" y="2.5" width="11" height="19" rx="2.5"/><circle cx="12" cy="18" r="1.1"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4.2"/><path class="ln" d="M12 12h9M18 12v3.5M15.5 12v2.5"/></svg>',
  crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path class="ln" d="M6 6l12 12M18 6L6 18"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5"/><path class="ln" d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/></svg>'
};
const icon = (n, c = "") => `<i class="ico ${c}">${I[n]}</i>`;

/* ================= router + history (back button stays in the game) ================= */
const screens = {};
let screen = null, freshScene = false;
function go(name, arg, { push = true } = {}) {
  stopClock();
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
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  audio.unlock();
  const fn = actions[el.dataset.act];
  if (fn) fn(el.dataset.v, el);
});
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
  patchTimer();
  clock = setInterval(() => {
    T.left--;
    if (T.left <= 5 && T.left > 0) audio.tick(T.left <= 3);
    patchTimer();
    if (T.left <= 0) { stopClock(); audio.play("timeup"); T.onEnd?.(); }
  }, 1000);
}
function stopClock() { clearInterval(clock); clock = null; T.on = false; }
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
const teamRoster = t => roster.filter(p => p.team === t);
const remoteOn = () => !!room?.hostRemote;

function onPhone(m, pid) {
  if (m.t === "hello") { syncPhones(); if (m.role === "host") { audio.play("star"); if (screen !== "lobby") render(); } return; }
  if (m.t === "buzz" && screen === "survey" && G?.stage === "faceoff") {
    const me = roster.find(p => p.pid === pid);
    if (!me || me.team === null) return;
    const fp = faceoffPlayer(me.team);
    if (!fp || fp.pid === pid) buzz(me.team, pid);
    return;
  }
  if (m.t === "answer" && screen === "survey" && G) {
    const me = roster.find(p => p.pid === pid);
    if (me && mayAnswer(me)) submitAnswer(String(m.text || "").slice(0, 60), me);
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
  enter() { document.getElementById("cover").hidden = true; audio.music("menu"); },
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
  S.settings[k] = k === "mix" ? raw : +raw; save(); audio.play("pop"); actions.settings();
};
actions.testSound = () => { audio.unlock(); audio.play("reveal"); setTimeout(() => audio.wrong(), 600); setTimeout(() => audio.voice("vo-survey-says"), 1500); };

/* ================= LOBBY (QR join) ================= */
let nextGame = "survey";
const seenChips = new Set();   // so only newly joined players pop in
actions.lobby = v => { nextGame = v || "survey"; audio.play("whoosh"); go("lobby"); };
screens.lobby = {
  enter() { ensureRoom(); audio.music("menu"); },
  render() {
    const ready = linkStatus === "ready" && room?.code;
    const url = ready ? joinUrl(room.code) : "";
    const hostUrl = ready ? joinUrl(room.code, room.key) : "";
    const title = { survey: "Survey Showdown", fast: "Fast Money", arcade: "Bible Challenge" }[nextGame];
    stage.innerHTML = `
    <div class="scene lobby">
      ${rays()}
      <header class="lobby-head"><span class="kicker">Tonight's game</span><h1>${title}</h1></header>
      <div class="lobby-grid">
        ${[0, 1].map(t => `<section class="team-pod t${t}">
          <span class="pod-label">Team ${t + 1}</span>
          <input class="team-name" data-team="${t}" value="${esc(S.teams[t].name)}" maxlength="18" spellcheck="false" aria-label="Team ${t + 1} name">
          <div class="pod-players">${teamRoster(t).map(p => { const isNew = !seenChips.has(p.pid + t); seenChips.add(p.pid + t); return `<span class="chip ${isNew ? "pop-in" : ""}">${esc(p.name)}</span>`; }).join("") || `<span class="pod-empty">Players join by scanning the code</span>`}</div>
        </section>`).join("")}
        <section class="join-card">
          <span class="kicker">Grab a phone buzzer</span>
          <div class="qr">${ready ? qrSvg(url) : `<div class="qr-wait">${linkStatus === "unavailable" ? "Phones can't connect right now. No problem: the host taps instead!" : "Opening the room…"}</div>`}</div>
          ${ready ? `<div class="code-line">or visit <b>${esc(url.replace(/^https?:\/\//, "").replace(/\?.*$/, ""))}</b> · code <b class="code">${room.code}</b></div>` : ""}
        </section>
      </div>
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
  audio.music(G.mult > 1 ? "round" : "game");
  audio.play("timpani");
  const last = G.ri === G.deck.length - 1;
  await card(`<div class="round-card">
      <div class="rc-kicker">${last ? "Final Round" : `Round ${G.ri + 1} of ${G.deck.length}`}</div>
      <div class="rc-coin"><span>×${G.mult}</span></div>
      <div class="rc-title">${G.mult === 1 ? "Single Points" : G.mult === 2 ? "Double Points" : "Triple Points"}</div>
      <div class="rc-sub">${r.category === "Bible" ? "Bible Board" : "Holiday Board"}</div>
    </div>`, "round", 2300);
  if (screen !== "survey" || G?.round !== r) return;
  if (G.mult > 1) audio.voice("vo-round");
  G.stage = "faceoff"; render();
  faceoffCard();
}

function faceoffCard() {
  const p = [faceoffPlayer(0), faceoffPlayer(1)];
  audio.play("transition", { vol: 0.7 });
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
  if (screen === "fast" && F) return fastAct(a, v);
  if (screen === "arcade" && A) return arcadeAct(a, v);
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
function submitAnswer(text, who = null) {
  text = String(text || "").trim();
  if (!text || G.pending || !LIVE.includes(G.stage)) return;
  const a = answerer();
  G.said = { text, name: who?.name || tName(a.team), team: a.team, pid: who?.pid || a.pid };
  const i = matchAnswer(text, G.round.a);
  if (i >= 0 && G.revealed.includes(i) && G.stage === "play") {   // already up there: no strike, try again
    audio.play("nope");
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
  if (!said) audio.play("countdown", { vol: 0.5 });
  setTimeout(() => { G.pending = false; if (screen === "survey" && G) then(); }, said ? 1250 : 750);
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
  if (src === "after") { audio.play("star", { vol: 0.8 }); return; }
  G.bank += G.round.a[i][1] * G.mult;
  if (i === 0) { audio.play("top"); setTimeout(() => audio.voice("vo-top-answer"), 350); setTimeout(() => confetti(90, { x: 0.5, y: 0.42 }), 250); }
  else audio.play(src === "host" ? "right" : "reveal");
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
    G.fo.res[G.fo.step] = -1;
    if (G.fo.step === 0) { G.fo.step = 1; G.msg = `${why === "time" ? "Time's up! " : ""}${tName(G.fo.order[1])}, it's your chance!`; render(); return setTimer(S.settings.timer ? 15 : 0, () => strike("time")); }
    return settleFaceoff();
  }
  if (st === "steal") { xCard(1); return setTimeout(() => endRound(G.control), 900); }
  G.strikes++;
  xCard(G.strikes);
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
  const v = f.querySelector("input").value;
  if (v.trim() && screen === "survey" && G) { const a = answerer(); submitAnswer(v, a?.pid ? roster.find(p => p.pid === a.pid) : null); }
});
function listenTV() {
  if (!SR || !G || !LIVE.includes(G.stage)) return;
  if (listening) { try { recog?.stop(); } catch {} return; }
  recog = new SR(); recog.lang = "en-US"; recog.interimResults = true; recog.maxAlternatives = 3;
  recog.onresult = ev => {
    const r = ev.results[ev.results.length - 1], text = r[0].transcript;
    const box = document.getElementById("tvAnswer"); if (box) box.value = text;
    if (r.isFinal) { listening = false; const a = answerer(); submitAnswer(text, a?.pid ? roster.find(p => p.pid === a.pid) : null); }
  };
  recog.onend = () => { listening = false; if (screen === "survey") render(); };
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
    audio.play("levelup");
    card(`<div class="pp-card t${team}"><small>${esc(tName(team))} wins the face-off</small><b>Play or Pass?</b>
      <div class="row"><button class="btn gold xl" data-act="act" data-v="choose:play">PLAY</button><button class="btn red xl" data-act="act" data-v="choose:pass">PASS</button></div></div>`, "pp", 0);
  }, 1100);
}
function choose(v) {
  if (G.stage !== "choose") return;
  closeCard();
  const t = G.fo.winner, play = v === "play";
  G.control = play ? t : 1 - t;
  G.ptr[G.control] = G.ri + G.fo.retry + (play ? 1 : 0);
  G.stage = "play"; G.msg = play ? "" : `${tName(t)} passed!`;
  audio.play("whoosh");
  render();
  card(`<div class="banner-card t${G.control}"><small>${play ? "They're playing it!" : "Passed!"}</small><b>${esc(tName(G.control))}'s board</b></div>`, "banner", 1300);
  if (G.revealed.length === G.round.a.length) return endRound(G.control);
  setTimer(S.settings.timer, () => strike("time"));
}
function toSteal() {
  G.stage = "steal"; G.msg = "";
  audio.play("steal");
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
  if (sweep || G.stolen) confettiRain(1.6);
  card(`<div class="award-card t${team}"><small>${G.stolen ? "Stolen!" : sweep ? "Board cleared!" : "Points to"}</small><b>${esc(tName(team))}</b><div class="award-pts">+${pts}</div>
    <div class="award-tally"><span class="t0">${esc(tName(0))} <b>${G.scores[0]}</b></span><span class="t1">${esc(tName(1))} <b>${G.scores[1]}</b></span></div></div>`, "award", 2600)
    .then(() => { if (screen === "survey" && G.stage === "award") { G.stage = "roundEnd"; render(); } });
}
/* after the round the host reveals the rest, one tile at a time (no points) */
function revealLeft(i) {
  if (G.stage !== "roundEnd" || !G.round.a[i] || G.revealed.includes(i)) return;
  reveal(i, "after"); render();
}
function revealAllLeft() {
  G.round.a.map((_, i) => i).filter(i => !G.revealed.includes(i)).forEach((i, k) => setTimeout(() => revealLeft(i), k * 420));
}

function nextRound() {
  if (G.stage !== "roundEnd") return;
  if (G.ri === G.deck.length - 1) return finishSurvey();
  G.ri++; audio.play("whoosh"); beginRound();
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
function prompt() {
  const st = G.stage;
  if (st === "intro") return "Get ready…";
  if (st === "faceoff") { const p = [faceoffPlayer(0), faceoffPlayer(1)]; return `FACE-OFF · ${p[0] ? esc(p[0].name) : esc(tName(0))} vs ${p[1] ? esc(p[1].name) : esc(tName(1))} · buzz in!`; }
  if (st === "faceoffAnswer") { const t = G.fo.order[G.fo.step]; const p = G.fo.step === 0 && G.fo.buzzPid ? roster.find(x => x.pid === G.fo.buzzPid) : faceoffPlayer(t); return `${G.msg ? esc(G.msg) + " · " : ""}<b>${esc(p?.name || tName(t))}</b>, your answer?`; }
  if (st === "choose") return `<b>${esc(tName(G.fo.winner))}</b>: play or pass?`;
  if (st === "play") { const p = turnPlayer(G.control); return `${G.msg ? esc(G.msg) + " · " : ""}<b>${esc(p?.name || tName(G.control))}</b>${p ? ` <span class="of">(${esc(tName(G.control))})</span>` : ""}, your answer?`; }
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
        <div class="pod-roster">${teamRoster(t).map(p => `<i class="${(G.stage === "play" && G.control === t && turnPlayer(t)?.pid === p.pid) ? "on" : ""}">${esc(p.name)}</i>`).join("")}</div>
      </div>`).join(`<div class="bank-pod"><small>Round ${G.ri + 1}/${G.deck.length}</small><b id="bank">${G.shown.bank}</b><em>×${G.mult}</em></div>`)}
    </header>
    <section class="qbar"><span>${r.category === "Bible" ? "Bible Board" : "Holiday Board"} · ${esc(r.ref)}</span><h2>${esc(r.q)}</h2></section>
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
    ${G.said ? `<div class="said-bubble t${G.said.team}"><small>${esc(G.said.name)} says</small><b>“${esc(G.said.text)}”</b></div>` : ""}
    <footer class="lower-third">
      <div class="lt-left"><span class="lt-tag">${G.stage === "steal" ? "STEAL" : G.stage === "faceoff" || G.stage === "faceoffAnswer" ? "FACE-OFF" : "LIVE"}</span><p>${prompt()}</p></div>
      <div class="lt-right">
        <div id="clockSlot">${timerHTML()}</div>
        <div class="strikes">${Array.from({ length: STRIKES }, (_, i) => `<span class="${i < G.strikes ? "on" : ""}">✕</span>`).join("")}</div>
      </div>
    </footer>
    <div class="host-dock">
      ${LIVE.includes(G.stage) && !G.pending ? `<form class="tv-answer" data-form="tvAnswer" autocomplete="off">
        <input id="tvAnswer" placeholder="Type the answer…" maxlength="60" spellcheck="false" enterkeyhint="go">
        ${SR ? `<button type="button" class="dbtn mic ${listening ? "on" : ""}" data-act="act" data-v="listen:" title="Say the answer">${icon("mic")}</button>` : ""}
        <button class="dbtn gold" type="submit">Check</button></form>` : ""}
      ${rem ? `<div class="remote-badge">${icon("key")} Host remote</div>` : `<span class="dock-label">HOST</span>
      ${controls.filter(c => G.stage !== "choose").map(c => `<button class="dbtn ${c.kind}" data-act="act" data-v="${c.a}:${c.v ?? ""}">${c.label}</button>`).join("")}
      ${LIVE.includes(G.stage) ? `<button class="dbtn ghost" data-act="act" data-v="peek:" title="Shows answers on screen">${icon("key")} ${G.peek ? "Hide" : "Peek"}</button>` : ""}
      ${G.stage === "roundEnd" && G.revealed.length < G.round.a.length ? `<span class="dock-tip">Tap a tile to reveal it</span>` : ""}`}
    </div>
    <button class="back-btn" data-act="home">${icon("home")}</button>
  </div>`;
  G.fresh.clear();
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
function startFast(team = 0) {
  audio.play("gong"); keepAwake();
  F = { team, qs: shuffle(FAST_MONEY_BANK).slice(0, 5), phase: "intro", qi: 0, pick: [[], []], shown: [0, 0], total: 0, shownTotal: 0, dup: false };
  go("fast");
}
const fmPlayer = i => { const r = teamRoster(F.team); return r[i]?.name || `Player ${i + 1}`; };
const fmTotal = () => [0, 1].reduce((s, p) => s + F.pick[p].reduce((a, ix, q) => a + (ix >= 0 && q < F.shown[p] ? F.qs[q].a[ix][1] : 0), 0), 0);
screens.fast = {
  enter() { audio.music("fastmoney"); setTimeout(() => { if (!audio.voice("vo-fast-money")) audio.play("transition"); }, 300); },
  render() {
    const ph = F.phase, pl = ph.endsWith("2") ? 1 : 0, rem = remoteOn();
    const total = fmTotal();
    const rows = F.qs.map((q, qi) => `<div class="fm-row">
      ${[0, 1].map(p => {
        const shown = qi < F.shown[p], ix = F.pick[p][qi];
        if (!shown || ix === undefined) return `<div class="fm-cell blank"></div>`;
        return `<div class="fm-cell ${ix >= 0 ? "hit" : "miss"} flip"><span>${ix >= 0 ? esc(q.a[ix][0]) : "—"}</span><b>${ix >= 0 ? q.a[ix][1] : 0}</b></div>`;
      }).join("")}</div>`).join("");
    let center = "";
    if (ph === "intro") center = `<div class="fm-intro"><h1>FAST <span>MONEY</span></h1><p>Two players · five questions · reach <b>200</b> together!</p>
      <div class="fm-team">${[0, 1].map(t => `<button class="${F.team === t ? "on" : ""} t${t}" data-act="act" data-v="fmTeam:${t}">${esc(tName(t))}</button>`).join("")}</div>
      <p class="small">${esc(fmPlayer(1))}: leave the room until it's your turn!</p></div>`;
    else if (ph === "p1" || ph === "p2") center = `<div class="fm-live"><div class="fm-clock" id="clockSlot">${timerHTML()}</div>
      <div class="fm-q"><small>${esc(fmPlayer(pl))} · Question ${F.qi + 1} of 5</small><h2>${esc(F.qs[F.qi].q)}</h2></div></div>`;
    stage.innerHTML = `<div class="scene fast">
      ${rays()}
      <div class="fm-board-wrap"><div class="board-chrome"><div class="marquee"></div>
        <div class="fm-board">${rows}<div class="fm-total"><small>TOTAL</small><b id="fmTotal">${F.shownTotal}</b><span>/ 200</span></div></div></div></div>
      ${center ? `<div class="fm-center">${center}</div>` : ""}
      ${rem ? `<div class="remote-badge">${icon("key")} Host remote</div>` : `<div class="host-dock wide"><span class="dock-label">HOST</span>${fmControls().map(c => `<button class="dbtn ${c.kind}" data-act="act" data-v="${c.a}:${c.v ?? ""}">${c.label}</button>`).join("")}</div>`}
      <button class="back-btn" data-act="home">${icon("home")}</button>
    </div>`;
    const el = document.getElementById("fmTotal");
    if (total !== F.shownTotal) { countUp(el, F.shownTotal, total, 700); F.shownTotal = total; }
  }
};
function fmControls() {
  const ph = F.phase;
  if (ph === "intro") return [{ a: "fmStart", v: 0, label: `Start ${fmPlayer(0)}: 20 seconds`, kind: "gold", main: true }];
  if (ph === "p1" || ph === "p2") return [...F.qs[F.qi].a.map(([a, p], i) => ({ a: "fmPick", v: i, label: `${a} · ${p}`, kind: "ans" })), { a: "fmPick", v: -1, label: "No match", kind: "x" }, { a: "fmPass", label: "Pass", kind: "ghost" }];
  if (ph === "rev1" || ph === "rev2") {
    const p = ph === "rev1" ? 0 : 1;
    if (F.shown[p] < 5) return [{ a: "fmReveal", label: `Reveal answer ${F.shown[p] + 1}`, kind: "gold", main: true }];
    if (ph === "rev1") return [{ a: "fmStart", v: 1, label: `Bring in ${fmPlayer(1)}: 25 seconds`, kind: "red", main: true }];
    return [{ a: "fmDone", label: "Final result ▶", kind: "gold", main: true }];
  }
  return [];
}
function fastAct(a, v) {
  if (a === "fmTeam" && F.phase === "intro") { F.team = +v; audio.play("pop"); return render(); }
  if (a === "fmStart") {
    const pl = +v; F.phase = pl ? "p2" : "p1"; F.qi = 0; F.queue = [1, 2, 3, 4];
    audio.play("countdown");
    render();
    return setTimer(pl ? 25 : 20, fmEnd, true);
  }
  if (a === "fmPick" && (F.phase === "p1" || F.phase === "p2")) {
    const pl = F.phase === "p2" ? 1 : 0, ix = +v;
    if (pl === 1 && ix >= 0 && ix === F.pick[0][F.qi]) {
      audio.wrong(); setTimeout(() => audio.wrong(), 250);
      card(`<div class="banner-card hot"><b>DUPLICATE!</b><small>Already said. Try again!</small></div>`, "banner", 1100);
      return;
    }
    F.pick[pl][F.qi] = ix; audio.play("pop");
    return fmAdvance();
  }
  if (a === "fmPass" && (F.phase === "p1" || F.phase === "p2")) { if (F.queue.length) { F.queue.push(F.qi); audio.play("whoosh", { vol: 0.5 }); return fmAdvance(); } return fastAct("fmPick", -1); }
  if (a === "fmReveal") {
    const p = F.phase === "rev1" ? 0 : 1; if (F.shown[p] >= 5) return;
    const ix = F.pick[p][F.shown[p]];
    F.shown[p]++;
    audio.play("countdown", { vol: 0.4 });
    render();
    setTimeout(() => { ix >= 0 ? audio.play(ix === 0 ? "top" : "reveal") : audio.wrong(); }, 150);
    return;
  }
  if (a === "fmDone") {
    const total = fmTotal(), won = total >= 200;
    go("results", { kind: "fast", winner: won ? 0 : null, won, scores: [total], title: won ? "FAST MONEY WIN!" : `${total} points!`, sub: won ? `${tName(F.team)} beat 200!` : "So close. Run it back!" });
  }
}
function fmAdvance() { if (!F.queue.length) return fmEnd(); F.qi = F.queue.shift(); render(); }
function fmEnd() {
  stopClock();
  const pl = F.phase === "p2" ? 1 : 0;
  for (let q = 0; q < 5; q++) if (F.pick[pl][q] === undefined) F.pick[pl][q] = -1;
  F.phase = pl ? "rev2" : "rev1"; audio.play("gong");
  card(`<div class="banner-card"><b>${pl ? "Time!" : "Time!"}</b><small>Let's see what the survey says…</small></div>`, "banner", 1400);
  render();
}

/* =========================================================
   BIBLE CHALLENGE (multiple choice, teams alternate)
   ========================================================= */
let A = null;
function startArcade() {
  audio.play("gong"); keepAwake();
  const deck = shuffle(CHALLENGE_BANK).slice(0, 10).map(c => { const o = shuffle(c.choices.map((_, i) => i)); return { ...c, choices: o.map(i => c.choices[i]), answer: o.indexOf(c.answer) }; });
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
      <footer class="lower-third"><div class="lt-left"><span class="lt-tag">${A.picked === null ? esc(tName(A.team)) : "ANSWER"}</span><p>${A.picked === null ? `<b>${esc(tName(A.team))}</b>, what's your answer?` : esc(c.note)}</p></div>
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
    if (i === c.answer) { A.scores[A.team] += 10; audio.play("right"); confetti(60, { x: 0.5, y: 0.6 }); }
    else { audio.wrong(); }
    return render();
  }
  if (a === "arcNext" && A.picked !== null) {
    if (A.i === A.deck.length - 1) {
      const sc = A.scores, w = sc[0] === sc[1] ? null : sc[0] > sc[1] ? 0 : 1;
      return go("results", { kind: "arcade", winner: w, scores: sc, title: w === null ? "It's a TIE!" : `${tName(w)} wins!`, sub: "Bible Challenge complete" });
    }
    A.i++; A.team = 1 - A.team; A.picked = null; audio.play("whoosh", { vol: 0.5 }); render();
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
    audio.music("win"); audio.play("victory");
    const champ = r.winner !== null && r.winner !== undefined;
    if (r.kind === "survey" && champ) { setTimeout(() => audio.voice("vo-winner"), 700); setTimeout(() => audio.voice("vo-congrats"), 3500); }
    else if (champ || r.won) setTimeout(() => audio.voice("vo-congrats"), 700);
    setTimeout(() => { confetti(180); confettiRain(5); }, 400);
  },
  render() {
    const pods = R.kind === "fast" ? "" : [0, 1].map(t => `<div class="res-pod t${t} ${R.winner === t ? "champ" : ""}">${R.winner === t ? icon("crown") : ""}<span>${esc(tName(t))}</span><b>${R.scores[t]}</b></div>`).join("");
    stage.innerHTML = `<div class="scene results">
      ${rays()}
      <div class="trophy"><div class="trophy-glow"></div><img src="assets/trophy.jpg" alt=""></div>
      <h1 class="res-title">${esc(R.title)}</h1>
      <p class="res-sub">${esc(R.sub)}</p>
      ${R.kind === "fast" ? `<div class="res-pod solo ${R.won ? "champ" : ""}"><span>Fast Money total</span><b>${R.scores[0]}</b></div>` : `<div class="res-pods">${pods}</div>`}
      ${R.history?.length ? `<div class="res-rounds">${R.history.map(h => `<span class="t${h.team}"><em>R${h.round}${h.mult > 1 ? ` ×${h.mult}` : ""}</em>${esc(tName(h.team))} +${h.pts}${h.stolen ? " (steal)" : ""}</span>`).join("")}
        ${R.mvp ? `<span class="mvp">${icon("star")} MVP: ${esc(R.mvp.name)} · ${R.mvp.pts} pts</span>` : ""}</div>` : ""}
      <div class="res-actions">
        <button class="btn gold xl" data-act="again">${icon("play")} Play again</button>
        ${R.kind === "survey" ? `<button class="btn red xl" data-act="fastFromResults">${icon("bolt")} Fast Money</button>` : ""}
        <button class="btn ghost xl" data-act="home">${icon("home")} Menu</button>
      </div>
    </div>`;
  }
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
    else if (G.stage === "choose") status = `${tName(G.fo.winner)} won the face-off!`;
    else if (G.stage === "roundEnd" || G.stage === "award" || G.stage === "reveal") status = G.awardMsg;
  }
  if (screen === "results") status = R?.title || "Game over!";
  const answer = screen === "survey" && G && me ? mayAnswer(me) : false;   // shows the type / mic box
  return { ...base, status, buzz, tone, answer, pending: !!G?.pending, q: screen === "survey" && G ? G.round.q : "" };
}
function hostView() {
  const v = { screen, teams: [tName(0), tName(1)] };
  if (screen === "survey" && G) Object.assign(v, {
    q: G.round.q, mult: G.mult, round: G.ri + 1, rounds: G.deck.length, scores: G.scores, bank: G.bank, strikes: G.strikes, stage: G.stage, pending: G.pending,
    answers: G.round.a.map(([t, p], i) => ({ t, p: p * G.mult, r: G.revealed.includes(i) })),
    canReveal: LIVE.includes(G.stage) || G.stage === "roundEnd", prompt: prompt().replace(/<[^>]+>/g, ""), controls: hostControls()
  });
  if (screen === "fast" && F) Object.assign(v, { stage: F.phase, prompt: F.phase.startsWith("p") ? `${fmPlayer(F.phase === "p2" ? 1 : 0)} · Q${F.qi + 1}: ${F.qs[F.qi].q}` : "Fast Money", controls: fmControls(), total: fmTotal() });
  if (screen === "arcade" && A) { const c = A.deck[A.i]; Object.assign(v, { q: c.q, prompt: `${tName(A.team)} answering`, choices: c.choices.map((t, i) => ({ t, ok: i === c.answer })), picked: A.picked, controls: A.picked === null ? c.choices.map((t, i) => ({ a: "arcPick", v: i, label: `${"ABCD"[i]}. ${t}${i === c.answer ? "  ★" : ""}`, kind: i === c.answer ? "ans ok" : "ans" })) : [{ a: "arcNext", label: "Next question ▶", kind: "gold" }] }); }
  if (screen === "results") v.controls = [{ a: "again", label: "Play again", kind: "gold" }, ...(R?.kind === "survey" ? [{ a: "fastFromResults", label: "Fast Money", kind: "red" }] : []), { a: "menu", label: "Menu", kind: "ghost" }];
  if (screen === "lobby") v.controls = [{ a: "startGameRemote", label: "Start the show ▶", kind: "gold" }];
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
window.__CSS = { S, get G() { return G; }, get F() { return F; }, get A() { return A; }, get room() { return room; }, go, act };
