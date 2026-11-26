// Phone controller: a player's team buzzer, or the host's secret answer remote.
import { Client } from "./net.js";

const $ = s => document.querySelector(s);
const app = $("#app");
const qs = new URLSearchParams(location.search);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// per-tab identity (sessionStorage); the last name used is remembered (localStorage) only to pre-fill the box
const store = { get(k, d) { try { return JSON.parse(sessionStorage.getItem("cssp-" + k)) ?? d; } catch { return d; } }, set(k, v) { try { sessionStorage.setItem("cssp-" + k, JSON.stringify(v)); if (k === "name") localStorage.setItem("cssp-lastname", JSON.stringify(v)); } catch {} } };
const lastName = () => { try { return JSON.parse(localStorage.getItem("cssp-lastname")) || ""; } catch { return ""; } };

let code = (qs.get("r") || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
const hostKey = qs.get("h");
const role = hostKey ? "host" : "player";
let client = null, state = null, link = "idle", step = "name";

/* ---------- tiny phone audio (synth, no files) ---------- */
let ctx = null;
function unlock() { if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); } if (ctx?.state !== "running") ctx?.resume(); }
function beep(f1, f2, dur = 0.25, type = "square", vol = 0.15) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
const vib = p => { try { navigator.vibrate?.(p); } catch {} };

/* ---------- connect ---------- */
function connect() {
  client = new Client({
    code, role, key: hostKey,
    onStatus: s => { link = s; render(); },
    onState: s => { const prev = state; state = s; react(prev, s); render(); }
  });
  client.name = store.get("name", "");
  client.team = store.get("team-" + code, null);
  client.connect();
}
function react(prev, s) {
  if (role !== "player") return;
  if (prev?.buzz !== "ready" && s.buzz === "ready") { vib([60, 40, 60]); beep(500, 900, 0.18, "triangle", 0.12); }
  if (prev?.buzz !== "won" && s.buzz === "won") { vib(300); beep(660, 1320, 0.35, "triangle", 0.18); }
  if (prev?.buzz !== "lost" && s.buzz === "lost") { vib(80); beep(220, 140, 0.3, "sawtooth", 0.1); }
  if (prev?.tone !== "hot" && s.tone === "hot") vib(120);
}

/* ---------- screens ---------- */
function render() {
  if (!code) return renderCode();
  if (role === "host") return renderHost();
  if (step === "name" && !store.get("name", "")) return renderName();
  if (state && (state.team === null || state.team === undefined) && link === "connected") return renderTeam();
  renderPlayer();
}

function renderCode() {
  app.className = "screen center";
  app.innerHTML = `<div class="brand">Christmas Bible<b>Survey Showdown</b></div>
    <h1>Enter the room code</h1><p class="muted">It's on the TV screen</p>
    <form id="f"><input id="c" maxlength="4" autocapitalize="characters" autocomplete="off" placeholder="ABCD" class="code-in"><button class="big-btn gold">Join</button></form>`;
  $("#f").onsubmit = e => { e.preventDefault(); const v = $("#c").value.toUpperCase().replace(/[^A-Z]/g, ""); if (v.length === 4) { code = v; history.replaceState(null, "", `?r=${code}`); connect(); render(); } };
}
function renderName() {
  app.className = "screen center";
  app.innerHTML = `<div class="brand">Christmas Bible<b>Survey Showdown</b></div>
    <h1>What's your name?</h1>
    <form id="f"><input id="n" maxlength="14" autocomplete="off" placeholder="Your name" value="${esc(store.get("name", "") || lastName())}"><button class="big-btn gold">Next</button></form>
    ${linkLine()}`;
  $("#n").focus();
  $("#f").onsubmit = e => { e.preventDefault(); unlock(); const v = $("#n").value.trim().slice(0, 14) || "Player"; store.set("name", v); client.name = v; client.hello(); step = "team"; render(); };
}
function renderTeam() {
  app.className = "screen center";
  const t = state?.teams || ["Team 1", "Team 2"];
  app.innerHTML = `<h1>Pick your team</h1>
    <button class="team-btn t0" data-team="0"><small>Team 1</small><b>${esc(t[0])}</b></button>
    <button class="team-btn t1" data-team="1"><small>Team 2</small><b>${esc(t[1])}</b></button>
    ${linkLine()}`;
  app.querySelectorAll("[data-team]").forEach(b => b.onclick = () => { unlock(); const team = +b.dataset.team; store.set("team-" + code, team); client.team = team; client.send({ t: "team", team }); client.hello(); vib(40); });
}
function renderPlayer() {
  const s = state || {};
  const team = s.team, teams = s.teams || ["", ""];
  app.className = `screen player ${team === 0 ? "t0" : team === 1 ? "t1" : ""} tone-${s.tone || "idle"}`;
  const btn = s.buzz === "ready" ? `<button class="buzzer live" id="bz"><span>BUZZ!</span></button>`
    : s.buzz === "won" ? `<div class="buzzer won"><span>FIRST!</span></div>`
    : s.buzz === "lost" ? `<div class="buzzer lost"><span>Too slow</span></div>`
    : `<div class="buzzer idle"><span>${team === null || team === undefined ? "…" : "Watch<br>the TV"}</span></div>`;
  app.innerHTML = `
    <header class="p-top"><div class="me"><small>${esc(teams[team] || "")}</small><b>${esc(s.name || store.get("name", ""))}</b></div>
      <div class="mini-score"><span class="s0">${s.scores?.[0] ?? 0}</span><span class="s1">${s.scores?.[1] ?? 0}</span></div></header>
    <p class="status">${esc(s.status || (link === "connected" ? "Connected!" : "Connecting…"))}</p>
    <div class="buzz-wrap">${btn}</div>
    <footer class="p-foot">${linkLine()}<button class="link" id="sw">Switch team</button></footer>`;
  const bz = $("#bz");
  if (bz) bz.addEventListener("pointerdown", e => { e.preventDefault(); unlock(); bz.classList.add("hit"); vib(70); beep(330, 660, 0.15); client.send({ t: "buzz" }); }, { once: true });
  $("#sw").onclick = () => { store.set("team-" + code, null); client.team = null; state = { ...state, team: null }; renderTeam(); };
}

function renderHost() {
  const s = state || {};
  app.className = "screen host";
  if (link !== "connected" || !state) { app.innerHTML = `<div class="brand">Host Remote</div><p class="status">${link === "noroom" ? "Room not found. Check the TV is on the lobby screen." : "Connecting to the TV…"}</p>${linkLine()}`; return; }
  const ctl = (s.controls || []).filter(c => !(s.screen === "survey" && c.a === "strike"));
  let body = "";
  if (s.screen === "survey") {
    body = `<div class="h-score"><span class="s0">${esc(s.teams[0])} <b>${s.scores[0]}</b></span><span class="bank">Bank <b>${s.bank}</b> ×${s.mult}</span><span class="s1">${esc(s.teams[1])} <b>${s.scores[1]}</b></span></div>
      <p class="h-prompt">${esc(s.prompt)}</p>
      <div class="h-q">R${s.round}/${s.rounds} · ${esc(s.q)}</div>
      <div class="h-answers">${s.answers.map((a, i) => `<button class="h-ans ${a.r ? "done" : ""}" data-a="reveal" data-v="${i}" ${a.r || !s.canReveal || s.pending ? "disabled" : ""}><em>${i + 1}</em><span>${esc(a.t)}</span><b>${a.p}</b></button>`).join("")}</div>
      ${s.canReveal ? `<button class="h-strike" data-a="strike" ${s.pending ? "disabled" : ""}>✕ NOT ON THE BOARD</button><p class="muted small">${"✕".repeat(s.strikes)}${"·".repeat(Math.max(0, 3 - s.strikes))} strikes</p>` : ""}`;
  } else if (s.screen === "fast" || s.screen === "arcade") {
    body = `<p class="h-prompt">${esc(s.prompt || "")}</p>${s.total !== undefined ? `<div class="h-score"><span class="bank">Total <b>${s.total}</b> / 200</span></div>` : ""}`;
  } else body = `<p class="h-prompt">${s.screen === "lobby" ? "Players are joining. Start when everyone's in!" : "Use the TV to choose a game."}</p>`;
  app.innerHTML = `<header class="h-top"><b>Host Remote</b><small>Answers are only on your phone</small></header>
    ${body}
    <div class="h-ctl">${ctl.map(c => `<button class="h-btn ${c.kind || ""}" data-a="${c.a}" data-v="${c.v ?? ""}">${esc(c.label)}</button>`).join("")}</div>
    ${linkLine()}`;
  app.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { if (b.disabled) return; vib(25); client.send({ t: "act", a: b.dataset.a, v: b.dataset.v }); b.classList.add("sent"); });
}
const linkLine = () => `<p class="link-line ${link}">${{ connected: "● Connected", connecting: "Connecting…", lost: "Reconnecting…", noroom: "Room not found", unavailable: "Can't connect. Ask the host to tap for you" }[link] || ""}</p>`;

/* ---------- boot ---------- */
document.addEventListener("pointerdown", unlock, { once: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden && client && !client.conn?.open) client.connect(); });
if (code) { addEventListener("load", connect); }
render();
