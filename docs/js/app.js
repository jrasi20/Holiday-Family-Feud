import { SURVEY_BANK, FAST_MONEY_BANK, CHALLENGE_BANK, shuffle } from "./data.js";
import { matchAnswer } from "./match.js";
import { audio } from "./audio.js";
import { startSnow, confetti, confettiRain, overlay, strikeFlash, countUp } from "./fx.js";

/* =========================================================
   Storage + state
   ========================================================= */
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem("css-" + k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("css-" + k, JSON.stringify(v)); } catch {} }
};

const DIFF = {
  Easy:    { turn: 30, faceoff: 15, steal: 25, strikes: 3, label: "30-second turns · 3 strikes · letter hints" },
  Classic: { turn: 20, faceoff: 10, steal: 20, strikes: 3, label: "20-second turns · 3 strikes" },
  Expert:  { turn: 12, faceoff: 7,  steal: 15, strikes: 2, label: "12-second turns · only 2 strikes" }
};
const MAX_PLAYERS = 6;

const S = {
  teams: store.get("teams", [
    { name: "Team Bethlehem", players: ["Player 1", "Player 2", "Player 3"] },
    { name: "Team Nazareth", players: ["Player 1", "Player 2", "Player 3"] }
  ]),
  settings: Object.assign({ mode: "Teams", difficulty: "Classic", mix: "Mixed", rounds: 5, timer: true, sfx: true, music: true }, store.get("settings", {})),
  rewards: Object.assign({ stars: 0, wins: 0, games: 0, fastWins: 0, bestSolo: 0, arcadeBest: 0, perfect: 0 }, store.get("rewards", {}))
};
const save = () => { store.set("teams", S.teams); store.set("settings", S.settings); store.set("rewards", S.rewards); };
audio.setSfx(S.settings.sfx); audio.setMusic(S.settings.music);

const root = document.getElementById("app");
let screen = "cover";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const solo = () => S.settings.mode === "Solo";
const D = () => DIFF[S.settings.difficulty];
const pName = (t, i) => { const p = S.teams[t].players; return p.length ? (p[((i % p.length) + p.length) % p.length] || `Player ${(i % p.length) + 1}`) : "Player"; };
const tName = t => S.teams[t].name || `Team ${t + 1}`;

/* =========================================================
   Icons (inline SVG, crisp on every device, no emoji)
   ========================================================= */
const I = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="ln" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="ln" d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.8"/><circle cx="17.5" cy="16" r="2.8"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4.2"/><path class="ln" d="M12 12h9M18 12v3.5M15.5 12v2.5"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.9 3.3 1.4-6.6-5-4.5 6.6-.7z"/></svg>',
  crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
  quiz: '<svg viewBox="0 0 24 24"><circle class="ln" cx="12" cy="12" r="9.5"/><path class="ln" d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6"/><circle cx="12" cy="17.3" r="1.2"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle class="ln" cx="12" cy="12" r="9.5"/><path class="ln" d="M12 11v6"/><circle cx="12" cy="7.5" r="1.3"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path class="ln" d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path class="ln" d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M7 3h10v5a5 5 0 0 1-10 0z"/><path class="ln" d="M7 5H3.5a3.5 3.5 0 0 0 4 4.5M17 5h3.5a3.5 3.5 0 0 1-4 4.5M12 13v4M8 21h8M9.5 17h5"/></svg>'
};
const icon = (n, cls = "") => `<i class="ico ${cls}">${I[n]}</i>`;

function topBar(title, sub = "") {
  return `<header class="topbar">
    <button class="round-btn" data-act="home" aria-label="Menu">${icon("home")}</button>
    <div class="topbar-title"><span class="eyebrow">Christmas Bible Survey Showdown</span><h1>${title}</h1></div>
    ${sub ? `<span class="topbar-sub">${sub}</span>` : ""}
    <div class="topbar-tools">
      <button class="round-btn ${S.settings.music ? "" : "off"}" data-act="toggleMusic" aria-label="Music">${icon("music")}</button>
      <button class="round-btn ${S.settings.sfx ? "" : "off"}" data-act="toggleSfx" aria-label="Sound effects">${icon(S.settings.sfx ? "sound" : "mute")}</button>
    </div>
  </header>`;
}

/* =========================================================
   Router + global events
   ========================================================= */
const screens = {};
function go(name, ...args) {
  stopClock();
  screen = name;
  document.body.dataset.screen = name;
  screens[name].enter?.(...args);
  screens[name].render();
  window.scrollTo(0, 0);
}
const render = () => screens[screen].render();

const actions = {};
root.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { audio.unlock(); fn(el, e); }
});
root.addEventListener("input", e => { const el = e.target; if (el.dataset.bind) bind(el); });
root.addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target; const fn = actions[f.dataset.submit];
  if (fn) fn(f);
});
document.addEventListener("keydown", e => screens[screen].key?.(e));

let homeArmed = 0;
actions.home = el => {
  const inGame = ["survey", "fast", "arcade"].includes(screen);
  if (inGame && Date.now() - homeArmed > 2500) {   // two-tap guard so a stray tap can't end the game
    homeArmed = Date.now(); el.classList.add("armed"); el.title = "Tap again to leave the game";
    audio.play("pop");
    setTimeout(() => el.classList.remove("armed"), 2500);
    return;
  }
  homeArmed = 0; audio.play("page"); go("menu");
};
actions.toggleSfx = () => { S.settings.sfx = !S.settings.sfx; audio.setSfx(S.settings.sfx); save(); render(); };
actions.toggleMusic = () => { S.settings.music = !S.settings.music; audio.setMusic(S.settings.music); save(); render(); };

let wakeLock = null;
async function keepAwake() { try { wakeLock = await navigator.wakeLock?.request("screen"); } catch {} }
document.addEventListener("visibilitychange", () => { if (!document.hidden && wakeLock) keepAwake(); });

/* One shared countdown clock */
let clock = null;
const T = { left: 0, max: 0, on: false, onEnd: null };
function setTimer(secs, onEnd, force = false) {
  stopClock();
  if (!S.settings.timer && !force) { T.on = false; T.left = 0; T.max = 0; patchTimer(); return; }
  Object.assign(T, { left: secs, max: secs, on: true, onEnd });
  patchTimer();
  clock = setInterval(() => {
    if (!T.on) return;
    T.left--;
    if (T.left <= 5 && T.left > 0) audio.tick(T.left <= 3);
    patchTimer();
    if (T.left <= 0) { stopClock(); audio.play("timeup"); T.onEnd && T.onEnd(); }
  }, 1000);
}
function stopClock() { if (clock) clearInterval(clock); clock = null; T.on = false; }
function timerHTML() {
  const on = S.settings.timer && T.max > 0;
  const k = on ? Math.max(0, T.left / T.max) : 1;
  return `<div class="timer-ring ${on && T.left <= 5 ? "urgent" : ""} ${on ? "" : "idle"}" id="timer">
    <svg viewBox="0 0 44 44"><circle class="track" cx="22" cy="22" r="19"/><circle class="bar" cx="22" cy="22" r="19" style="stroke-dashoffset:${(119.4 * (1 - k)).toFixed(1)}"/></svg>
    <b>${on ? T.left : "∞"}</b></div>`;
}
function patchTimer() { const el = document.getElementById("timer"); if (el) el.outerHTML = timerHTML(); }

/* =========================================================
   COVER
   ========================================================= */
let hasWide = false;
{ const im = new Image(); im.onload = () => { hasWide = true; document.body.classList.add("has-wide"); }; im.src = "assets/cover-wide.jpg"; }

screens.cover = {
  render() {
    root.innerHTML = `<main class="cover" data-act="enterGame">
      <div class="cover-blur"></div>
      <img class="cover-art" src="assets/cover.jpg" alt="Christmas Bible Survey Showdown">
      <div class="cover-wide"></div>
      <div class="cover-title"><img src="assets/logo-title.webp" alt="Christmas Bible Survey Showdown"></div>
      <img class="brand-badge" src="assets/brand-logo.webp" alt="Bible Explorer Kids">
      <div class="cover-cta">
        <button class="btn-gold pulse" data-act="enterGame">${icon("play")} Tap to Begin</button>
        <small>Sound on for the full show</small>
      </div>
      <footer class="cover-foot">© Bible Explorer Kids · Short Scripture phrases from the Holy Bible, NIV®. © 2011 Biblica, Inc.™ Used by permission. All rights reserved worldwide.</footer>
    </main>`;
  }
};
actions.enterGame = () => {
  audio.unlock();
  audio.play("magic");
  audio.music("menu");
  setTimeout(() => audio.voice("vo-welcome"), 450);   // decoded right after unlock
  confetti(60, { x: 0.5, y: 0.75 });
  go(store.get("setupDone", false) ? "menu" : "setup");
};

/* =========================================================
   SETUP (teams, mode, difficulty)
   ========================================================= */
function bind(el) {
  const [kind, a, b] = el.dataset.bind.split(".");
  if (kind === "team") S.teams[+a].name = el.value.slice(0, 22);
  if (kind === "player") S.teams[+a].players[+b] = el.value.slice(0, 16);
  save();
}
const seg = (key, opts, labelFn = o => o) =>
  `<div class="seg">${opts.map(o => `<button class="${String(S.settings[key]) === String(o) ? "on" : ""}" data-act="set" data-k="${key}" data-v="${o}">${labelFn(o)}</button>`).join("")}</div>`;

screens.setup = {
  render() {
    const st = S.settings;
    root.innerHTML = `<main class="page setup">
      ${topBar("Set Up the Show")}
      <section class="panel">
        <h2 class="panel-h">Who's playing?</h2>
        ${seg("mode", ["Teams", "Solo"], o => o === "Teams" ? "Two Teams" : "Solo Challenge")}
        <div class="teams-edit ${st.mode === "Solo" ? "solo" : ""}">
          ${S.teams.slice(0, st.mode === "Solo" ? 1 : 2).map((t, ti) => `
          <div class="team-edit team-${ti}">
            <label class="field"><span>${st.mode === "Solo" ? "Your name" : `Team ${ti + 1} name`}</span>
              <input data-bind="team.${ti}" value="${esc(t.name)}" maxlength="22" placeholder="Team name"></label>
            ${st.mode === "Solo" ? "" : `<div class="roster">
              ${t.players.map((p, pi) => `<div class="roster-row"><em>${pi + 1}</em>
                <input data-bind="player.${ti}.${pi}" value="${esc(p)}" maxlength="16" placeholder="Player ${pi + 1}">
                <button class="mini" data-act="delPlayer" data-t="${ti}" data-p="${pi}" ${t.players.length <= 1 ? "disabled" : ""} aria-label="Remove">${icon("x")}</button></div>`).join("")}
              ${t.players.length < MAX_PLAYERS ? `<button class="add-player" data-act="addPlayer" data-t="${ti}">${icon("plus")} Add player</button>` : ""}
            </div>`}
          </div>`).join("")}
        </div>
      </section>
      <section class="panel grid-2">
        <div><h3>Difficulty</h3>${seg("difficulty", ["Easy", "Classic", "Expert"])}<small>${DIFF[st.difficulty].label}</small></div>
        <div><h3>Questions</h3>${seg("mix", ["Mixed", "Bible", "Holiday"])}<small>${st.mix === "Bible" ? "Straight from the Christmas story" : st.mix === "Holiday" ? "Santa, cookies & family chaos" : "Scripture + holiday fun"}</small></div>
        <div><h3>Rounds</h3>${seg("rounds", [3, 5, 7, 10])}<small>Points double, then triple in the final round</small></div>
        <div><h3>Turn timer</h3>${seg("timer", ["true", "false"], o => o === "true" ? "On" : "Off")}<small>${st.timer ? "Clock runs out = strike" : "Host keeps time. Great for little ones"}</small></div>
      </section>
      <button class="btn-gold jumbo" data-act="setupDone">Save &amp; continue ${icon("play")}</button>
    </main>`;
  }
};
actions.set = el => {
  let v = el.dataset.v; const k = el.dataset.k;
  if (k === "rounds") v = +v; if (k === "timer") v = v === "true";
  S.settings[k] = v; save(); audio.play("pop"); render();
};
actions.addPlayer = el => { const t = S.teams[+el.dataset.t]; if (t.players.length < MAX_PLAYERS) t.players.push(`Player ${t.players.length + 1}`); save(); render(); };
actions.delPlayer = el => { const t = S.teams[+el.dataset.t]; if (t.players.length > 1) t.players.splice(+el.dataset.p, 1); save(); render(); };
actions.setupDone = () => {
  S.teams.forEach((t, i) => { t.name = t.name.trim() || `Team ${i + 1}`; t.players = t.players.map((p, j) => p.trim() || `Player ${j + 1}`); });
  store.set("setupDone", true); save(); audio.play("whoosh"); go("menu");
};

/* =========================================================
   MENU
   ========================================================= */
screens.menu = {
  enter() { audio.music("menu"); },
  render() {
    const st = S.settings;
    root.innerHTML = `<main class="page menu">
      <div class="menu-hero">
        <img class="logo-img" src="assets/logo-title.webp" alt="Christmas Bible Survey Showdown" onerror="this.remove()">
        <div class="logo-text"><span>Christmas Bible</span><b>Survey Showdown</b></div>
        <button class="matchup" data-act="editTeams">${st.mode === "Solo" ? `<b>${esc(tName(0))}</b> · Solo Challenge` : `<b class="t0">${esc(tName(0))}</b><i>VS</i><b class="t1">${esc(tName(1))}</b>`} ${icon("edit")}</button>
        <p class="menu-meta">${st.difficulty} · ${st.rounds} rounds · ${st.mix} questions</p>
      </div>
      <button class="hero-card-btn" data-act="startSurvey">
        <span class="marquee"></span>
        ${icon("star", "big")}
        <span><b>Start the Showdown</b><small>Face-offs · steals · strikes · double &amp; triple points</small></span>
        <em>PLAY</em>
      </button>
      <div class="menu-cards">
        <button class="menu-card" data-act="startFast">${icon("bolt")}<b>Fast Money</b><small>Two players · 5 rapid questions · reach 200</small></button>
        <button class="menu-card" data-act="startArcade">${icon("quiz")}<b>Bible Challenge</b><small>Prophecy · Who Said It? · Which Came First?</small></button>
        <button class="menu-card" data-act="howto">${icon("info")}<b>How to Play</b><small>Host guide in 60 seconds</small></button>
        <button class="menu-card" data-act="rewards">${icon("trophy")}<b>Trophy Room</b><small>${S.rewards.stars} stars earned</small></button>
      </div>
      <footer class="tiny-foot">
        <button class="linkish" data-act="toggleMusic">Music: ${st.music ? "On" : "Off"}</button> ·
        <button class="linkish" data-act="toggleSfx">Sound effects: ${st.sfx ? "On" : "Off"}</button>
        <img class="foot-logo" src="assets/brand-logo.webp" alt="Bible Explorer Kids">
        <div>An original Bible Explorer Kids game, not affiliated with any TV show. Point values are for fun, not real survey results.</div>
      </footer>
    </main>`;
  }
};
actions.editTeams = () => { audio.play("page"); go("setup"); };
actions.howto = () => { audio.play("page"); go("how"); };
actions.rewards = () => { audio.play("page"); go("rewards"); };

/* =========================================================
   SURVEY SHOWDOWN
   ========================================================= */
let G = null;

function makeDeck(n) {
  const pool = S.settings.mix === "Mixed" ? SURVEY_BANK : SURVEY_BANK.filter(x => x.category === S.settings.mix);
  const recent = store.get("recent", []);
  let deck;
  if (S.settings.mix === "Mixed") {   // alternate Bible / Holiday for rhythm
    const bib = shuffle(pool.filter(x => x.category === "Bible" && !recent.includes(x.id))).concat(shuffle(pool.filter(x => x.category === "Bible" && recent.includes(x.id))));
    const hol = shuffle(pool.filter(x => x.category === "Holiday" && !recent.includes(x.id))).concat(shuffle(pool.filter(x => x.category === "Holiday" && recent.includes(x.id))));
    const first = Math.random() < 0.5;
    deck = Array.from({ length: n }, (_, i) => ((i % 2 === 0) === first ? bib : hol).shift() || bib.shift() || hol.shift());
  } else {
    deck = shuffle(pool.filter(x => !recent.includes(x.id))).concat(shuffle(pool.filter(x => recent.includes(x.id)))).slice(0, n);
  }
  store.set("recent", [...recent, ...deck.map(x => x.id)].slice(-30));
  return deck;
}
const multFor = (i, n) => (n >= 3 && i === n - 1) ? 3 : (i >= Math.floor(n / 2) ? 2 : 1);

actions.startSurvey = () => {
  audio.play("gong");
  keepAwake();
  const n = S.settings.rounds;
  G = { deck: makeDeck(n), ri: 0, scores: [0, 0], shown: { scores: [0, 0], bank: 0 }, ptr: [0, 0] };
  stopClock(); screen = "survey"; document.body.dataset.screen = "survey"; window.scrollTo(0, 0);
  beginRound();
};

function beginRound() {
  const r = G.deck[G.ri];
  Object.assign(G, {
    round: r, mult: multFor(G.ri, G.deck.length), revealed: [], fresh: new Set(), bank: 0, strikes: 0,
    control: solo() ? 0 : null, stage: "intro", fo: { order: null, step: 0, res: [], retry: 0 }, msg: "", hint: null, stolen: false, hostKey: false
  });
  G.shown.bank = 0;
  render();
  audio.music(G.mult > 1 ? "round" : "game");   // music lifts when points double
  audio.play("timpani");
  const m = G.mult, last = G.ri === G.deck.length - 1;
  overlay(`<div class="round-splash"><small>${last ? "Final Round" : `Round ${G.ri + 1} of ${G.deck.length}`}</small><h2>${m === 1 ? "Single Points" : m === 2 ? "Double Points" : "Triple Points"}</h2><div class="mult">×${m}</div><p>${esc(r.category === "Bible" ? "Bible Board" : "Holiday Board")}</p></div>`, "splash", 1900)
    .then(() => {
      if (screen !== "survey" || G?.round !== r) return;   // host left during the splash
      if (m > 1) audio.voice("vo-round");
      if (solo()) { G.stage = "play"; G.msg = ""; render(); setTimer(D().turn, () => miss("time")); }
      else { G.stage = "faceoff"; render(); }
    });
}

const curPlayer = () => {
  if (G.stage === "faceoffAnswer") { const t = G.fo.order[G.fo.step]; return { t, name: pName(t, G.ri + G.fo.retry) }; }
  if (G.stage === "play") return { t: G.control, name: solo() ? tName(0) : pName(G.control, G.ptr[G.control]) };
  if (G.stage === "steal") return { t: 1 - G.control, name: `${tName(1 - G.control)} captain` };
  return null;
};

function boardHTML() {
  const r = G.round;
  return `<div class="board-frame"><span class="bulbs"></span><div class="board">
    ${r.a.map(([ans, pts], i) => {
      const rev = G.revealed.includes(i);
      return `<button class="tile ${rev ? "revealed" : ""} ${G.fresh.has(i) ? "flip-now" : ""} ${i === 0 && rev ? "top" : ""}" data-act="tile" data-i="${i}" style="--d:${i}">
        <span class="tile-in">
          <span class="face front"><b>${i + 1}</b></span>
          <span class="face back"><span class="ans">${esc(ans)}</span><strong>${pts * G.mult}</strong></span>
        </span></button>`;
    }).join("")}
  </div></div>`;
}

function scoreHTML() {
  const teams = solo() ? [0] : [0, 1], cp = curPlayer();
  return `<section class="scorebar ${solo() ? "solo" : ""}">
    ${teams.map(t => `<div class="score-team team-${t} ${(G.control === t && ["play", "choose"].includes(G.stage)) || (cp && cp.t === t) ? "lit" : ""}">
      <div class="st-name">${esc(tName(t))}</div>
      <div class="st-score" id="score-${t}">${G.shown.scores[t]}</div>
      ${solo() ? "" : `<div class="chips">${S.teams[t].players.map((p, i) => `<span class="${cp && cp.t === t && cp.name === pName(t, i) ? "on" : ""}">${esc(p)}</span>`).join("")}</div>`}
    </div>`).join(solo() ? "" : `<div class="bank"><small>Round bank</small><b id="bank">${G.shown.bank}</b><em>×${G.mult}</em></div>`)}
    ${solo() ? `<div class="bank"><small>Round bank</small><b id="bank">${G.shown.bank}</b><em>×${G.mult}</em></div>` : ""}
  </section>`;
}

function strikesHTML() {
  return `<div class="strikes">${Array.from({ length: D().strikes }, (_, i) => `<span class="${i < G.strikes ? "on" : ""}">✕</span>`).join("")}</div>`;
}

function guessForm(placeholder) {
  return `<form class="guess" data-submit="guess" autocomplete="off">
    <input id="guess" name="g" placeholder="${placeholder}" enterkeyhint="go" autocapitalize="off" spellcheck="false">
    <button class="btn-gold" type="submit">Survey says!</button>
  </form>`;
}

function controlsHTML() {
  const cp = curPlayer();
  switch (G.stage) {
    case "intro": return `<div class="controls"><p class="say">Get ready…</p></div>`;
    case "faceoff":
      return `<div class="controls faceoff">
        <p class="say">${G.msg ? `<span class="warn">${esc(G.msg)}</span> ` : ""}Face-off! <b>${esc(pName(0, G.ri + G.fo.retry))}</b> vs <b>${esc(pName(1, G.ri + G.fo.retry))}</b>. Hands on buzzers!</p>
        <div class="buzzers">${[0, 1].map(t => `<button class="buzzer team-${t}" data-act="buzz" data-t="${t}"><span class="cap"><small>${esc(pName(t, G.ri + G.fo.retry))}</small><b>BUZZ!</b><em>${esc(tName(t))}</em></span><kbd>${t ? "L" : "A"}</kbd></button>`).join("")}</div>
      </div>`;
    case "faceoffAnswer": case "play": case "steal": {
      const steal = G.stage === "steal";
      return `<div class="controls live ${steal ? "steal-mode" : ""}">
        <div class="turn-line">${timerHTML()}<p class="say">${steal ? `<b class="steal-tag">STEAL!</b> ${esc(tName(cp.t))}, huddle up. One answer takes the whole bank!` : `<b>${esc(cp.name)}</b>${solo() ? "" : ` <span class="of">(${esc(tName(cp.t))})</span>`}, your answer?`}</p>${G.stage === "play" ? strikesHTML() : ""}</div>
        ${G.msg ? `<p class="flash-msg">${G.msg}</p>` : ""}
        ${guessForm(steal ? "Type the steal answer…" : "Type their answer, or tap a tile…")}
        <div class="host-row">
          <button class="btn-x" data-act="miss">${icon("x")} Not on the board</button>
          ${S.settings.difficulty === "Easy" && G.stage !== "faceoffAnswer" ? `<button class="btn-ghost" data-act="hint">Letter hint</button>` : ""}
          <button class="btn-ghost" data-act="hostKey">${icon("key")} Host key</button>
        </div>
      </div>`;
    }
    case "choose":
      return `<div class="controls choose"><p class="say"><b>${esc(tName(G.fo.winner))}</b> wins the face-off! Play this board, or pass it?</p>
        <div class="pp"><button class="btn-gold jumbo" data-act="choose" data-v="play">PLAY</button><button class="btn-red jumbo" data-act="choose" data-v="pass">PASS</button></div></div>`;
    case "award": case "reveal":
      return `<div class="controls"><p class="say">${G.awardMsg || ""}</p></div>`;
    case "roundEnd": {
      const last = G.ri === G.deck.length - 1;
      return `<div class="controls"><p class="say">${G.awardMsg || ""}</p>
        <button class="btn-gold jumbo" data-act="nextRound">${last ? `${icon("trophy")} Final results` : `Next round ${icon("play")}`}</button></div>`;
    }
  }
  return "";
}

screens.survey = {
  render() {
    const r = G.round;
    root.innerHTML = `<main class="page game">
      ${topBar("Survey Showdown", `Round ${G.ri + 1}/${G.deck.length} · ×${G.mult}`)}
      ${scoreHTML()}
      <section class="question"><span class="q-tag">${r.category === "Bible" ? "Bible Board" : "Holiday Board"} · ${esc(r.ref)}</span><h2>${esc(r.q)}</h2>
        ${G.hint !== null ? `<p class="hint">Hint: an answer starts with <b>${esc(r.a[G.hint][0][0])}</b></p>` : ""}</section>
      ${boardHTML()}
      ${controlsHTML()}
      ${G.hostKey ? `<aside class="hostkey" data-act="hostKey"><h4>${icon("key")} Host eyes only</h4><ol>${r.a.map(([a, p], i) => `<li class="${G.revealed.includes(i) ? "done" : ""}"><span>${esc(a)}</span><b>${p * G.mult}</b></li>`).join("")}</ol><small>Tap to hide</small></aside>` : ""}
    </main>`;
    G.fresh.clear();
    // animate numbers from last shown -> real
    countUp(document.getElementById("bank"), G.shown.bank, G.bank, 600);
    G.shown.bank = G.bank;
    [0, 1].forEach(t => { if (G.shown.scores[t] !== G.scores[t]) { countUp(document.getElementById(`score-${t}`), G.shown.scores[t], G.scores[t], 1200, () => audio.play("coin", { vol: 0.35 })); G.shown.scores[t] = G.scores[t]; } });
    const gi = document.getElementById("guess");
    if (gi && matchMedia("(pointer:fine)").matches) gi.focus();
  },
  key(e) {
    if (!G) return;
    const typing = e.target.tagName === "INPUT";
    if (G.stage === "faceoff" && !typing) { if (e.key.toLowerCase() === "a") buzz(0); if (e.key.toLowerCase() === "l") buzz(1); }
    if (!typing && /^[1-6]$/.test(e.key)) hit(+e.key - 1);
    if (!typing && e.key.toLowerCase() === "x" && ["faceoffAnswer", "play", "steal"].includes(G.stage)) miss();
  }
};

function buzz(t) {
  if (G.stage !== "faceoff") return;
  audio.buzzer(t);
  G.fo.order = [t, 1 - t]; G.fo.step = 0; G.fo.res = []; G.stage = "faceoffAnswer"; G.msg = "";
  render();
  document.querySelector(`.score-team.team-${t}`)?.classList.add("buzzed");
  setTimer(D().faceoff, () => miss("time"));
}
actions.buzz = el => buzz(+el.dataset.t);

function reveal(i, live = true) {
  G.revealed.push(i); G.fresh.add(i);
  if (live) {
    G.bank += G.round.a[i][1] * G.mult;
    if (i === 0) { audio.play("top"); audio.voice("vo-top-answer"); setTimeout(() => confetti(70, { x: 0.5, y: 0.45 }), 250); }
    else audio.play("reveal");
  } else audio.ding(i * 2);
}

function hit(i) {
  if (!G.round.a[i]) return;
  const st = G.stage;
  if (!["faceoffAnswer", "play", "steal"].includes(st)) return;
  if (G.revealed.includes(i)) {
    if (st === "play") { G.msg = "Already on the board! Try another."; audio.play("nope"); render(); return; }
    return miss("dup");
  }
  stopClock(); G.msg = ""; G.hint = null;
  reveal(i);
  if (st === "faceoffAnswer") {
    G.fo.res[G.fo.step] = i;
    if (i === 0) return winFaceoff(G.fo.order[G.fo.step], true);
    if (G.fo.step === 0) { G.fo.step = 1; G.msg = `Good answer, but not #1! Can ${esc(tName(G.fo.order[1]))} beat it?`; render(); return setTimer(D().faceoff, () => miss("time")); }
    return settleFaceoff();
  }
  if (st === "steal") { G.stolen = true; audio.play("steal"); return endRound(1 - G.control); }
  // play
  G.ptr[G.control]++;
  if (G.revealed.length === G.round.a.length) { if (!G.strikes) S.rewards.perfect++; return endRound(G.control, true); }
  G.msg = `${["Nice!", "Good answer!", "On the board!", "Yes!", "Survey says… YES!"][Math.floor(Math.random() * 5)]} Next player.`;
  render();
  setTimer(D().turn, () => miss("time"));
}
actions.tile = el => { if (!G.pending) hit(+el.dataset.i); };

function miss(why) {
  const st = G.stage;
  if (!["faceoffAnswer", "play", "steal"].includes(st)) return;
  stopClock(); G.hint = null;
  audio.wrong();
  const why_ = why === "time" ? "Time's up! " : why === "dup" ? "Already taken! " : "";
  if (st === "faceoffAnswer") {
    strikeFlash(1);
    G.fo.res[G.fo.step] = -1;
    if (G.fo.step === 0) { G.fo.step = 1; G.msg = `${why_}${esc(pName(G.fo.order[1], G.ri + G.fo.retry))}, it's your chance!`; render(); return setTimer(D().faceoff, () => miss("time")); }
    return settleFaceoff();
  }
  if (st === "steal") { strikeFlash(1); return endRound(G.control); }
  G.strikes++;
  strikeFlash(G.strikes);
  G.ptr[G.control]++;
  if (G.strikes >= D().strikes) {
    if (solo()) return endRound(0);
    return setTimeout(() => { if (screen === "survey") toSteal(); }, 1100);
  }
  G.msg = `${why_}Strike ${G.strikes}! Next player.`;
  render();
  setTimer(D().turn, () => miss("time"));
}
actions.miss = () => { if (!G.pending) miss(); };

actions.guess = f => {
  const v = f.g.value.trim();
  if (!v || G.pending) return;
  const i = matchAnswer(v, G.round.a);
  // "Survey says!" voice, then the dramatic reveal
  if (audio.voice("vo-survey-says")) {
    const stage = G.stage;
    G.pending = true; stopClock();
    f.querySelector("button").disabled = true; f.g.disabled = true;
    document.querySelector(".controls.live")?.classList.add("suspense");
    setTimeout(() => {
      G.pending = false;
      if (screen !== "survey" || G.stage !== stage) return;
      if (i >= 0) hit(i); else miss();
    }, 1250);
    return;
  }
  if (i >= 0) hit(i); else miss();
};
actions.hint = () => {
  const left = G.round.a.map((_, i) => i).filter(i => !G.revealed.includes(i));
  if (!left.length) return;
  G.hint = left[Math.floor(Math.random() * left.length)]; audio.play("star"); render();
};
actions.hostKey = () => {
  G.hostKey = !G.hostKey; audio.play("pop"); render();
  if (G.hostKey) { clearTimeout(G._hk); G._hk = setTimeout(() => { if (G?.hostKey) { G.hostKey = false; if (screen === "survey") render(); } }, 7000); }
};

function settleFaceoff() {
  const [a, b] = G.fo.res.map(r => (r === undefined || r < 0) ? 99 : r);
  if (a === 99 && b === 99) {
    G.fo.retry++; G.stage = "faceoff"; G.msg = "Nobody hit the board! New face-off pair.";
    return setTimeout(() => { if (screen === "survey") render(); }, 900);
  }
  winFaceoff(a <= b ? G.fo.order[0] : G.fo.order[1], false);
}
function winFaceoff(team, top) {
  stopClock();
  G.fo.winner = team; G.stage = "choose"; G.msg = "";
  render();
  setTimeout(() => audio.play("levelup"), top ? 900 : 400);
}
actions.choose = el => {
  const t = G.fo.winner, play = el.dataset.v === "play";
  G.control = play ? t : 1 - t;
  // next player after the face-off player starts
  G.ptr[G.control] = G.ri + G.fo.retry + (play ? 1 : 0);
  G.stage = "play"; G.msg = play ? "" : `${esc(tName(t))} passed! ${esc(tName(G.control))}, it's all yours.`;
  audio.play("whoosh");
  if (G.revealed.length === G.round.a.length) return endRound(G.control);
  render();
  setTimer(D().turn, () => miss("time"));
};

function toSteal() {
  G.stage = "steal"; G.msg = "";
  audio.play("steal");
  if (!audio.voice("vo-steal")) audio.play("transition", { vol: 0.6 });
  overlay(`<div class="steal-splash"><b>STEAL!</b><small>${esc(tName(1 - G.control))} — one answer for ${G.bank} points</small></div>`, "splash steal", 1500)
    .then(() => { if (screen === "survey" && G?.stage === "steal") { render(); setTimer(D().steal, () => miss("time")); } });
  render();
}

function endRound(team, sweep = false) {
  stopClock();
  G.stage = "award";
  const pts = G.bank;
  G.awardMsg = solo() ? `You banked <b>${pts}</b> points!` :
    G.stolen ? `<b>${esc(tName(team))}</b> STOLE <b>${pts}</b> points!` :
    sweep ? `Board cleared! <b>${esc(tName(team))}</b> takes <b>${pts}</b>!` :
    `<b>${esc(tName(team))}</b> banks <b>${pts}</b> points.`;
  G.scores[team] += pts;
  G.bank = 0;            // bank drains into the team score (both animate)
  G.bankTeam = team;
  render();
  audio.play(G.stolen ? "steal" : "win", { vol: 0.8 });
  if (sweep || G.stolen) confettiRain(1.6);
  // reveal the rest one by one
  const rest = G.round.a.map((_, i) => i).filter(i => !G.revealed.includes(i));
  let k = 0;
  const step = () => {
    if (screen !== "survey" || !G) return;
    if (k >= rest.length) { G.stage = "roundEnd"; render(); return; }
    G.stage = "reveal"; reveal(rest[k++], false); render();
    setTimeout(step, 520);
  };
  setTimeout(step, 1400);
}
actions.nextRound = () => {
  if (G.ri === G.deck.length - 1) return finishSurvey();
  G.ri++; audio.play("whoosh"); beginRound();
};

function finishSurvey() {
  const sc = G.scores;
  S.rewards.games++;
  let title, sub, winner = null;
  if (solo()) {
    S.rewards.bestSolo = Math.max(S.rewards.bestSolo, sc[0]);
    const stars = sc[0] >= 400 ? 3 : sc[0] >= 220 ? 2 : 1;
    S.rewards.stars += stars;
    title = `${esc(tName(0))} scored ${sc[0]}!`; sub = `${"★".repeat(stars)}${"☆".repeat(3 - stars)} · Best ever: ${S.rewards.bestSolo}`;
  } else if (sc[0] === sc[1]) {
    S.rewards.stars += 2; title = "It's a TIE!"; sub = "Settle it in Fast Money!";
  } else {
    winner = sc[0] > sc[1] ? 0 : 1; S.rewards.wins++; S.rewards.stars += 3;
    title = `${esc(tName(winner))} WIN!`; sub = "Champions of Christmas";
  }
  save();
  go("results", { title, sub, scores: solo() ? [sc[0]] : sc, winner, kind: "survey" });
}

/* =========================================================
   RESULTS
   ========================================================= */
let R = null;
screens.results = {
  enter(r) {
    R = r;
    audio.music("win");
    audio.play("victory");
    const won = r.kind === "fast" ? r.winner === 0 : true;          // Fast Money can be lost
    if (r.kind === "survey" && r.winner !== null && r.winner !== undefined) {
      setTimeout(() => audio.voice("vo-winner"), 700);              // "And the champions of Christmas are..."
      setTimeout(() => audio.voice("vo-congrats"), 3500);
    } else if (won) setTimeout(() => audio.voice("vo-congrats"), 700);
    setTimeout(() => { confetti(160); confettiRain(4); }, 300);
  },
  render() {
    const teams = R.scores.length === 1 ? [0] : [0, 1];
    root.innerHTML = `<main class="page results">
      <div class="trophy-wrap"><img src="assets/trophy.jpg" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="trophy-fallback">${I.trophy}</div></div>
      <h1 class="win-title">${R.title}</h1>
      <p class="win-sub">${R.sub}</p>
      <div class="final-scores">${teams.map(t => `<div class="fs team-${t} ${R.winner === t ? "champ" : ""}">${R.winner === t ? icon("crown") : ""}<span>${esc(R.kind === "fast" ? (t ? "Target" : tName(R.team)) : tName(t))}</span><b>${R.scores[t]}</b></div>`).join("")}</div>
      <div class="results-actions">
        ${R.kind === "survey" ? `<button class="btn-gold jumbo" data-act="startSurvey">Play again</button>${solo() ? "" : `<button class="btn-red jumbo" data-act="startFast" data-team="${R.winner ?? 0}">${icon("bolt")} Fast Money</button>`}` : ""}
        ${R.kind === "fast" ? `<button class="btn-gold jumbo" data-act="startFast">Play Fast Money again</button>` : ""}
        ${R.kind === "arcade" ? `<button class="btn-gold jumbo" data-act="startArcade">Play again</button>` : ""}
        <button class="btn-ghost" data-act="home">${icon("home")} Menu</button>
      </div>
      <p class="tiny-foot">+ stars added to your Trophy Room</p>
    </main>`;
  }
};

/* =========================================================
   FAST MONEY
   ========================================================= */
let F = null;
actions.startFast = el => {
  audio.play("gong"); keepAwake();
  const team = el?.dataset.team !== undefined ? +el.dataset.team : 0;
  F = { team, p: [0, Math.min(1, S.teams[team].players.length - 1)], qs: shuffle(FAST_MONEY_BANK).slice(0, 5), phase: "intro",
        ans: [[], []], pick: [[], []], shownRows: [0, 0], qi: 0, queue: [], msg: "", total: 0 };
  go("fast");
};
const fmTotal = () => [0, 1].reduce((s, p) => s + F.pick[p].reduce((a, ix, q) => a + (ix >= 0 && q < F.shownRows[p] ? F.qs[q].a[ix][1] : 0), 0), 0);

screens.fast = {
  enter() { audio.music("fastmoney"); if (!audio.voice("vo-fast-money")) audio.play("transition", { vol: 0.6 }); },
  render() {
    const ph = F.phase, pl = ph.endsWith("2") ? 1 : 0;
    const who = i => solo() ? tName(0) : pName(F.team, F.p[i]);
    let body = "";
    if (ph === "intro") {
      body = `<section class="panel fm-intro">
        <h2>Fast Money</h2>
        <p>Two players. Five rapid-fire questions. <b>Reach 200 points together</b> to win!</p>
        ${solo() ? "" : `<div class="grid-2">
          <div><h3>Team</h3><div class="seg">${[0, 1].map(t => `<button class="${F.team === t ? "on" : ""}" data-act="fmTeam" data-t="${t}">${esc(tName(t))}</button>`).join("")}</div></div>
          <div><h3>Players</h3><div class="seg wrap">${S.teams[F.team].players.map((p, i) => `<button class="${F.p.includes(i) ? "on" : ""}" data-act="fmPlayer" data-i="${i}">${esc(p)}</button>`).join("")}</div><small>Tap two players</small></div>
        </div>`}
        <ol class="fm-rules"><li><b>${esc(who(0))}</b> gets <b>20 seconds</b>. Host types each answer fast and hits Enter.</li>
          <li><b>${esc(who(1))}</b> leaves the room (or covers their ears!), then gets <b>25 seconds</b>.</li>
          <li>Duplicate answers buzz. Say something different!</li></ol>
        <button class="btn-gold jumbo" data-act="fmGo">${icon("bolt")} Start ${esc(who(0))}'s 20 seconds</button>
      </section>`;
    } else if (ph === "p1" || ph === "p2") {
      const q = F.qs[F.qi];
      body = `<section class="fm-live">
        <div class="turn-line">${timerHTML()}<p class="say"><b>${esc(who(pl))}</b>, go go go!</p><span class="fm-count">${F.ans[pl].filter(x => x !== undefined).length}/5</span></div>
        <div class="fm-q"><small>Question ${F.qi + 1}</small><h2>${esc(q.q)}</h2></div>
        ${F.msg ? `<p class="flash-msg">${F.msg}</p>` : ""}
        <form class="guess" data-submit="fmAnswer" autocomplete="off"><input id="guess" name="g" placeholder="Type the answer, Enter" enterkeyhint="next" autocapitalize="off" spellcheck="false"><button class="btn-gold" type="submit">Next</button></form>
        <div class="host-row"><button class="btn-ghost" data-act="fmPass">Pass (come back later)</button></div>
      </section>`;
    } else {
      const total = fmTotal();
      body = `<section class="fm-reveal">
        <div class="fm-total"><small>Total</small><b id="fmTotal">${F.total}</b><span>/ 200</span></div>
        <div class="fm-board">${F.qs.map((q, qi) => `<div class="fm-row">
          <span class="fm-qtext">${esc(q.q)}</span>
          ${[0, 1].map(p => {
            if (p === 1 && ph === "rev1") return `<span class="fm-cell empty"></span>`;
            const vis = qi < F.shownRows[p];
            const a = F.ans[p][qi], ix = F.pick[p][qi];
            if (!vis) return `<span class="fm-cell covered"></span>`;
            return `<button class="fm-cell ${ix >= 0 ? "hit" : "miss"}" data-act="fmFix" data-p="${p}" data-q="${qi}"><span>${esc(a || "(pass)")}</span><b>${ix >= 0 ? q.a[ix][1] : 0}</b></button>`; }).join("")}
        </div>`).join("")}</div>
        ${F.fix ? fixHTML() : ""}
        <div class="fm-actions">${fmNextBtn(total)}</div>
      </section>`;
    }
    root.innerHTML = `<main class="page game fm">${topBar("Fast Money", ph === "intro" ? "" : `${ph.endsWith("1") ? "Player 1" : "Player 2"}`)}${body}</main>`;
    const gi = document.getElementById("guess"); if (gi) gi.focus();
    const tEl = document.getElementById("fmTotal");
    const tot = fmTotal(); if (tEl && tot !== F.total) { countUp(tEl, F.total, tot, 700); F.total = tot; }
  }
};
function fixHTML() {
  const { p, q } = F.fix, Q = F.qs[q];
  return `<div class="fix-pop"><h4>Host: which answer did "${esc(F.ans[p][q] || "—")}" mean?</h4>
    ${Q.a.map(([a, pts], i) => `<button data-act="fmSet" data-i="${i}" class="${F.pick[p][q] === i ? "on" : ""}">${esc(a)} <b>${pts}</b></button>`).join("")}
    <button data-act="fmSet" data-i="-1" class="${F.pick[p][q] < 0 ? "on" : ""}">Not on board <b>0</b></button></div>`;
}
function fmNextBtn(total) {
  const ph = F.phase, p = ph === "rev1" ? 0 : 1;
  if (ph === "rev1" || ph === "rev2") {
    if (F.shownRows[p] < 5) return `<button class="btn-gold jumbo" data-act="fmReveal">Survey says… (${F.shownRows[p] + 1}/5)</button>`;
    if (ph === "rev1") return `<button class="btn-red jumbo" data-act="fmP2">Bring in Player 2: 25 seconds</button>`;
    return `<button class="btn-gold jumbo" data-act="fmDone">${total >= 200 ? "WE DID IT!" : "See the result"}</button>`;
  }
  return "";
}
actions.fmTeam = el => { F.team = +el.dataset.t; F.p = [0, Math.min(1, S.teams[F.team].players.length - 1)]; audio.play("pop"); render(); };
actions.fmPlayer = el => { const i = +el.dataset.i; if (F.p.includes(i)) return; F.p = [F.p[1], i]; audio.play("pop"); render(); };
function fmStart(pl) {
  F.phase = pl ? "p2" : "p1"; F.qi = 0; F.queue = [0, 1, 2, 3, 4]; F.msg = "";
  F.qi = F.queue.shift();
  render();
  setTimer(pl ? 25 : 20, fmEndTurn, true);   // Fast Money is always timed
}
actions.fmGo = () => { audio.play("countdown"); fmStart(0); };
actions.fmP2 = () => { audio.play("countdown"); fmStart(1); };
function fmEndTurn() {
  stopClock();
  const pl = F.phase === "p2" ? 1 : 0;
  for (let q = 0; q < 5; q++) if (F.ans[pl][q] === undefined) { F.ans[pl][q] = ""; F.pick[pl][q] = -1; }
  F.phase = pl ? "rev2" : "rev1"; F.msg = "";
  audio.play("gong"); render();
}
function fmAdvance() {
  if (!F.queue.length) return fmEndTurn();
  F.qi = F.queue.shift(); F.msg = ""; render();
}
actions.fmAnswer = f => {
  const v = f.g.value.trim(), pl = F.phase === "p2" ? 1 : 0, q = F.qs[F.qi];
  if (!v) return actions.fmPass();
  const ix = matchAnswer(v, q.a);
  if (pl === 1 && ix >= 0 && ix === F.pick[0][F.qi]) { audio.wrong(); audio.wrong(); F.msg = "DUPLICATE! Already said. Try again!"; render(); return; }
  F.ans[pl][F.qi] = v; F.pick[pl][F.qi] = ix;
  audio.play("pop");
  fmAdvance();
};
actions.fmPass = () => {
  const pl = F.phase === "p2" ? 1 : 0;
  if (F.queue.length) { F.queue.push(F.qi); audio.play("whoosh", { vol: 0.5 }); fmAdvance(); }
  else { F.ans[pl][F.qi] = ""; F.pick[pl][F.qi] = -1; fmAdvance(); }
};
actions.fmReveal = () => {
  const p = F.phase === "rev1" ? 0 : 1, q = F.shownRows[p];
  F.shownRows[p]++;
  const ix = F.pick[p][q];
  if (ix >= 0) { audio.play(ix === 0 ? "top" : "reveal"); } else audio.wrong();
  render();
};
actions.fmFix = el => { F.fix = { p: +el.dataset.p, q: +el.dataset.q }; audio.play("pop"); render(); };
actions.fmSet = el => { const { p, q } = F.fix; F.pick[p][q] = +el.dataset.i; F.fix = null; audio.play("star"); render(); };
actions.fmDone = () => {
  const total = fmTotal(), won = total >= 200;
  S.rewards.stars += won ? 5 : 1; if (won) S.rewards.fastWins++; save();
  go("results", { title: won ? "FAST MONEY WIN!" : `So close: ${total} points!`, sub: won ? `${esc(tName(F.team))} crushed the 200 target!` : "Run it back and beat 200!", scores: [total, 200], winner: won ? 0 : 1, kind: "fast", team: F.team });
};

/* =========================================================
   BIBLE CHALLENGE ARCADE
   ========================================================= */
let A = null;
actions.startArcade = () => {
  audio.play("gong"); keepAwake();
  const deck = shuffle(CHALLENGE_BANK).slice(0, 10).map(c => {
    const order = shuffle(c.choices.map((_, i) => i));
    return { ...c, choices: order.map(i => c.choices[i]), answer: order.indexOf(c.answer) };
  });
  A = { deck, i: 0, scores: [0, 0], picked: null, team: 0, streak: [0, 0] };
  go("arcade"); arcadeTurn();   // arcade render is safe before the first turn (A is complete)
};
function arcadeTurn() { A.picked = null; render(); setTimer(20, () => arcadePick(-1)); }
screens.arcade = {
  enter() { audio.music("game"); },
  render() {
    const c = A.deck[A.i], t = solo() ? 0 : A.team;
    root.innerHTML = `<main class="page game arcade">
      ${topBar("Bible Challenge", `${A.i + 1}/${A.deck.length}`)}
      <section class="scorebar ${solo() ? "solo" : ""}">${(solo() ? [0] : [0, 1]).map(k => `<div class="score-team team-${k} ${k === t ? "lit" : ""}"><div class="st-name">${esc(tName(k))}</div><div class="st-score">${A.scores[k]}</div>${A.streak[k] >= 2 ? `<div class="streak">${A.streak[k]} in a row!</div>` : ""}</div>`).join("")}</section>
      <section class="quiz-card">
        <div class="turn-line">${timerHTML()}<span class="q-tag">${esc(c.type)} · 10 pts${A.streak[t] >= 2 ? " + streak bonus" : ""}</span></div>
        <h2>${esc(c.q)}</h2>
        <div class="choices ${c.choices.length === 2 ? "two" : ""}">${c.choices.map((ch, i) => {
          const cls = A.picked === null ? "" : i === c.answer ? "correct" : i === A.picked ? "wrong" : "dim";
          return `<button class="choice ${cls}" data-act="arcadePick" data-i="${i}" ${A.picked !== null ? "disabled" : ""}><b>${"ABCD"[i]}</b><span>${esc(ch)}</span></button>`; }).join("")}</div>
        ${A.picked !== null ? `<p class="note">${A.picked === c.answer ? "Correct! " : A.picked === -1 ? "Time's up! " : "Not quite. "}${esc(c.note)}</p>
          <button class="btn-gold jumbo" data-act="arcadeNext">${A.i === A.deck.length - 1 ? "Final results" : `Next: ${solo() ? "question" : esc(tName(1 - t))} ${icon("play")}`}</button>` : `<p class="say">${solo() ? "Pick the right answer!" : `<b>${esc(tName(t))}</b>, ${esc(pName(t, Math.floor(A.i / 2)))} answers!`}</p>`}
      </section>
    </main>`;
  },
  key(e) { const k = "abcd".indexOf(e.key.toLowerCase()); if (k >= 0 && A?.picked === null && k < A.deck[A.i].choices.length) arcadePick(k); }
};
function arcadePick(i) {
  if (A.picked !== null) return;
  stopClock();
  const c = A.deck[A.i], t = solo() ? 0 : A.team;
  A.picked = i;
  if (i === c.answer) {
    A.streak[t]++; A.scores[t] += 10 + (A.streak[t] >= 3 ? 5 : 0);
    audio.play("right"); confetti(50, { x: 0.5, y: 0.5 });
  } else { A.streak[t] = 0; i === -1 ? audio.play("timeup") : (audio.play("oops"), audio.wrong()); }
  render();
}
actions.arcadePick = el => arcadePick(+el.dataset.i);
actions.arcadeNext = () => {
  if (A.i === A.deck.length - 1) {
    const sc = A.scores; S.rewards.stars += 2; S.rewards.games++;
    S.rewards.arcadeBest = Math.max(S.rewards.arcadeBest, ...sc); save();
    const w = solo() ? 0 : sc[0] === sc[1] ? null : sc[0] > sc[1] ? 0 : 1;
    return go("results", { title: solo() ? `${sc[0]} points!` : w === null ? "It's a TIE!" : `${esc(tName(w))} WIN!`, sub: "Bible Challenge complete", scores: solo() ? [sc[0]] : sc, winner: w, kind: "arcade" });
  }
  A.i++; if (!solo()) A.team = 1 - A.team; audio.play("whoosh", { vol: 0.5 }); arcadeTurn();
};

/* =========================================================
   HOW TO PLAY + TROPHY ROOM
   ========================================================= */
screens.how = {
  render() {
    const steps = [
      ["The host", "One grown-up runs the device. Cast it to a TV, or set a tablet where everyone can see. Peek at answers anytime with <b>Host key</b>."],
      ["Face-off", "One player from each team slaps their giant BUZZ button. The fastest answers first. Hit the #1 answer and you win control instantly."],
      ["Play or Pass", "The face-off winner chooses to play the board or pass it to the other team."],
      ["Fill the board", "Teammates take turns. The host taps the matching tile, or types the answer and the game matches it, typos and all."],
      ["Strikes & steals", "A wrong answer or running out of time = a strike. After 3 strikes the other team huddles for ONE steal answer to take the whole bank."],
      ["Bigger points", "Later rounds are worth double, and the final round is triple. Anyone can come back!"],
      ["Fast Money", "Two players, five questions, 20 and 25 seconds. Reach 200 combined points to win. Repeat an answer and you'll hear the buzzer!"],
      ["Keyboard", "On a laptop: <kbd>A</kbd> / <kbd>L</kbd> buzzers · <kbd>1</kbd>–<kbd>6</kbd> reveal a tile · <kbd>X</kbd> strike · <kbd>Enter</kbd> check a typed answer."]
    ];
    root.innerHTML = `<main class="page info">${topBar("How to Play")}<section class="how-grid">${steps.map(([h, p], i) => `<article><b class="num">${i + 1}</b><h3>${h}</h3><p>${p}</p></article>`).join("")}</section>
      <button class="btn-gold jumbo" data-act="startSurvey">${icon("play")} Let's play</button>
      <p class="legal">Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide.<br>
      Christmas Bible Survey Showdown is an original game by Bible Explorer Kids and is not affiliated with or endorsed by any television program. Point values are for entertainment, not real survey results.</p></main>`;
  }
};
screens.rewards = {
  render() {
    const r = S.rewards;
    const badges = [["First Star", r.stars >= 1], ["Christmas Champion", r.wins >= 1], ["Fast Money 200", r.fastWins >= 1], ["Perfect Board", r.perfect >= 1], ["Star Collector: 25", r.stars >= 25], ["Party Legend: 10 games", r.games >= 10]];
    root.innerHTML = `<main class="page info">${topBar("Trophy Room", "Saved on this device")}
      <section class="trophy-stats">
        <article>${icon("star")}<b>${r.stars}</b><span>Stars</span></article>
        <article>${icon("crown")}<b>${r.wins}</b><span>Showdown wins</span></article>
        <article>${icon("bolt")}<b>${r.fastWins}</b><span>Fast Money wins</span></article>
        <article>${icon("trophy")}<b>${r.bestSolo}</b><span>Best solo score</span></article>
      </section>
      <section class="badges">${badges.map(([n, on]) => `<span class="badge ${on ? "earned" : ""}">${icon(on ? "star" : "x")}${n}</span>`).join("")}</section>
    </main>`;
  }
};

/* =========================================================
   Boot
   ========================================================= */
startSnow();
go("cover");
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("./sw.js");
window.__CSS = { S, get G() { return G; }, go };   // debug handle
