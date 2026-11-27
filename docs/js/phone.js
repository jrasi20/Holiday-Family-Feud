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
let client = null, state = null, link = "idle", step = "name", fixOpen = false, fixRow = null;

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
    onState: s => { const prev = state; state = s; react(prev, s); if (!s.answer || prev?.q !== s.q) sent = false; render(); },
    onMessage: m => { if (m.t === "result") showResult(m); }
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
  // keep whatever the player is typing across live updates
  const prevBox = $("#ans"), keep = prevBox && !sent && renderedQ === s.q;
  const typed = keep ? prevBox.value : "", hadFocus = document.activeElement === prevBox;
  renderedQ = s.q;
  app.className = `screen player ${team === 0 ? "t0" : team === 1 ? "t1" : ""} tone-${s.tone || "idle"}`;
  if (s.sketch?.artist) return renderDraw(s, teams);
  app.dataset.mode = "";
  if (s.answer) return renderAnswer(s, teams, typed, hadFocus);
  if (s.mode === "arcade" && s.choices) return renderChoices(s, teams);
  if (s.pp) {
    app.innerHTML = `<header class="p-top"><div class="me"><small>${esc(teams[s.team] || "")}</small><b>${esc(s.name || "")}</b></div></header>
      <p class="status">${esc(s.status)}</p>${s.q ? `<div class="ans-q small-q">${esc(s.q)}</div>` : ""}
      <div class="pp-phone"><button class="pp-btn play" data-v="play">PLAY</button><button class="pp-btn pass" data-v="pass">PASS</button></div>
      <footer class="p-foot">${linkLine()}</footer>`;
    app.querySelectorAll(".pp-btn").forEach(b => b.onclick = () => { unlock(); vib(50); client.send({ t: "choose", v: b.dataset.v }); app.querySelectorAll(".pp-btn").forEach(x => x.disabled = true); b.classList.add("chosen"); });
    return;
  }
  const btn = s.buzz === "ready" ? `<button class="buzzer live" id="bz"><span>BUZZ!</span></button>`
    : s.buzz === "won" ? `<div class="buzzer won"><span>FIRST!</span></div>`
    : s.buzz === "lost" ? `<div class="buzzer lost"><span>Too slow</span></div>`
    : `<div class="buzzer idle"><span>${team === null || team === undefined ? "…" : "Watch<br>the TV"}</span></div>`;
  app.innerHTML = `
    <header class="p-top"><div class="me"><small>${esc(teams[team] || "")}</small><b>${esc(s.name || store.get("name", ""))}</b></div>
      <div class="mini-score"><span class="s0">${s.scores?.[0] ?? 0}</span><span class="s1">${s.scores?.[1] ?? 0}</span></div></header>
    <p class="status">${esc(s.status || (link === "connected" ? "Connected!" : "Connecting…"))}</p>
    ${s.q ? `<div class="ans-q small-q">${esc(s.q)}</div>` : ""}
    <div class="buzz-wrap">${btn}</div>
    <footer class="p-foot">${linkLine()}<button class="link" id="sw">Switch team</button></footer>`;
  const bz = $("#bz");
  if (bz) bz.addEventListener("pointerdown", e => { e.preventDefault(); unlock(); bz.classList.add("hit"); vib(70); beep(330, 660, 0.15); client.send({ t: "buzz" }); }, { once: true });
  $("#sw").onclick = () => { store.set("team-" + code, null); client.team = null; state = { ...state, team: null }; renderTeam(); };
}

/* ---------- answering: type it or say it ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let sent = false, listening = false, recog = null, renderedQ = null;
function renderAnswer(s, teams, typed, hadFocus) {
  app.innerHTML = `
    <header class="p-top"><div class="me"><small>${esc(teams[s.team] || "")}</small><b>${esc(s.name || "")}</b></div>
      <div class="mini-score"><span class="s0">${s.scores?.[0] ?? 0}</span><span class="s1">${s.scores?.[1] ?? 0}</span></div></header>
    <p class="status">${esc(sent || s.pending ? (s.mode === "fast" ? "Locked in!" : s.screen === "carol" ? "Checking…" : "Survey says…") : s.status)}</p>
    <div class="ans-q">${esc(s.q || "")}</div>
    <form id="af" class="ans-form ${sent || s.pending ? "waiting" : ""}" autocomplete="off">
      <input id="ans" maxlength="60" placeholder="Type your answer" value="${esc(typed)}" ${sent || s.pending ? "disabled" : ""} enterkeyhint="send" autocapitalize="sentences" spellcheck="false">
      <div class="ans-row">
        ${true ? `<button type="button" id="mic" class="mic-btn ${listening ? "on" : ""} ${SR ? "" : "nosr"}" ${sent || s.pending ? "disabled" : ""}><svg class="mic-ico" viewBox="0 0 24 24"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><b>${listening ? "Listening…" : "Say it"}</b></button>` : ""}
        <button class="send-btn" ${sent || s.pending ? "disabled" : ""}>${sent || s.pending ? (s.mode === "fast" ? "Next…" : "Checking…") : (s.mode === "fast" ? "Lock in ▶" : "Send ▶")}</button>
      </div>
    </form>
    <footer class="p-foot">${linkLine()}</footer>`;
  const box = $("#ans");
  if (hadFocus && !sent) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
  $("#af").onsubmit = e => { e.preventDefault(); sendAnswer(box.value); };
  $("#mic")?.addEventListener("click", toggleMic);
}
function sendAnswer(text, alts = []) {
  text = String(text || "").trim();
  if (!text || sent) return;
  unlock();
  const box = $("#ans"); if (box) box.value = "";
  if (client.send({ t: "answer", text, alts })) { sent = true; vib(40); beep(520, 780, 0.12, "triangle", 0.1); render(); }
}
function toggleMic() {
  unlock();
  if (!SR) { toast("Voice answers work in Chrome (Android) or Safari (iPhone). Please type your answer!"); return; }
  if (listening) { try { recog?.stop(); } catch {} return; }
  recog = new SR(); recog.lang = "en-US"; recog.interimResults = true; recog.maxAlternatives = 3;
  let done = false;
  recog.onresult = ev => {
    if (done) return;
    const r = ev.results[ev.results.length - 1], text = r[0].transcript;
    const box = $("#ans"); if (box) box.value = text;
    if (r.isFinal) { done = true; listening = false; try { recog.stop(); } catch {} sendAnswer(text, [...r].slice(1).map(x => x.transcript)); }
  };
  recog.onend = () => { listening = false; render(); };
  recog.onerror = e => { listening = false; if (e.error === "not-allowed") alert("Please allow the microphone, or type your answer."); render(); };
  listening = true; vib(30); render();
  try { recog.start(); } catch { listening = false; render(); }
}

/* ---------- Christmas Sketch: the artist's drawing pad ---------- */
const PENS = ["#14214a", "#d42a3c", "#1fa36b", "#2d64cc", "#8a5a14", "#f0b840", "#fffdf6"];   // last = eraser
const SIZES = [0.006, 0.012, 0.024];
let pen = PENS[0], size = SIZES[1], myStrokes = [], drawCv = null;
function renderDraw(s, teams) {
  const k = s.sketch;
  app.className = `screen draw ${s.team === 1 ? "t1" : "t0"}`;
  // keep the canvas alive between updates: only refresh the text
  if (app.dataset.mode === "draw" && app.dataset.turn === k.turnId && app.dataset.stage === k.stage) {
    $("#drawStatus").textContent = s.status; return;
  }
  const sameTurn = app.dataset.turn === k.turnId;
  if (!sameTurn) myStrokes = [];
  app.dataset.mode = "draw"; app.dataset.turn = k.turnId; app.dataset.stage = k.stage;
  app.className = `screen draw ${s.team === 1 ? "t1" : "t0"}`;
  const live = k.stage === "ready" || k.stage === "draw";
  app.innerHTML = `
    <div class="draw-word"><small id="drawStatus">${esc(s.status)}</small><b>${esc(k.word)}</b></div>
    <div class="draw-pad ${live ? "" : "done"}"><canvas id="pad" width="800" height="500"></canvas>${!live ? `<div class="pad-over">${esc(s.status)}</div>` : ""}</div>
    ${live ? `<div class="draw-tools">
      <div class="pens">${PENS.map((c, i) => `<button class="pen ${pen === c ? "on" : ""} ${i === PENS.length - 1 ? "eraser" : ""}" style="background:${c}" data-pen="${c}" aria-label="${i === PENS.length - 1 ? "Eraser" : "Color"}"></button>`).join("")}</div>
      <div class="sizes">${SIZES.map(z => `<button class="size ${size === z ? "on" : ""}" data-size="${z}"><i style="width:${Math.round(z * 900)}px;height:${Math.round(z * 900)}px"></i></button>`).join("")}
        <button class="tool-btn" id="undo">Undo</button><button class="tool-btn" id="clear">Clear</button></div>
      ${k.stage === "ready" ? `<button class="big-btn gold" id="go">Start drawing ▶</button>` : ""}
      ${k.canSkip ? `<button class="link" id="skip">Too hard? Get a new word (once)</button>` : ""}
    </div>` : ""}
    <footer class="p-foot">${linkLine()}</footer>`;
  drawCv = $("#pad");
  paintAll();
  if (!live) return;
  app.querySelectorAll("[data-pen]").forEach(b => b.onclick = () => { pen = b.dataset.pen; app.querySelectorAll(".pen").forEach(x => x.classList.toggle("on", x === b)); vib(15); });
  app.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { size = +b.dataset.size; app.querySelectorAll(".size").forEach(x => x.classList.toggle("on", x === b)); vib(15); });
  $("#undo").onclick = () => { myStrokes.pop(); paintAll(); client.send({ t: "undo" }); vib(20); };
  $("#clear").onclick = () => { myStrokes = []; paintAll(); client.send({ t: "clear" }); vib(30); };
  $("#go")?.addEventListener("click", () => { unlock(); client.send({ t: "sketchGo" }); vib(40); });
  $("#skip")?.addEventListener("click", () => { client.send({ t: "sketchSkip" }); myStrokes = []; paintAll(); });
  wirePad();
}
function paintAll() {
  if (!drawCv) return;
  const g = drawCv.getContext("2d"); g.fillStyle = "#fffdf6"; g.fillRect(0, 0, drawCv.width, drawCv.height);
  myStrokes.forEach(s => paintStroke(s, 0));
}
function paintStroke(s, from) {
  const g = drawCv.getContext("2d"), W = drawCv.width, H = drawCv.height;
  g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = s.c; g.lineWidth = Math.max(2, s.w * W);
  const p0 = s.pts[from]; if (!p0) return;
  g.beginPath(); g.moveTo(p0[0] * W, p0[1] * H);
  if (s.pts.length === 1) g.lineTo(p0[0] * W + 0.1, p0[1] * H + 0.1);
  for (let i = from + 1; i < s.pts.length; i++) g.lineTo(s.pts[i][0] * W, s.pts[i][1] * H);
  g.stroke();
}
/* touch drawing: points are sent in small batches so the TV draws along live */
function wirePad() {
  let cur = null, queue = [], timer = null;
  const pt = e => { const r = drawCv.getBoundingClientRect(); return [+Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)).toFixed(4), +Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)).toFixed(4)]; };
  const flush = (start = false) => {
    if (!cur || !queue.length) return;
    client.send({ t: "draw", id: cur.id, c: cur.c, w: cur.w, pts: queue, start });
    queue = [];
  };
  drawCv.style.touchAction = "none";
  drawCv.onpointerdown = e => {
    e.preventDefault(); try { drawCv.setPointerCapture(e.pointerId); } catch {} unlock();
    cur = { id: Math.random().toString(36).slice(2, 9), c: pen, w: size, pts: [pt(e)] };
    myStrokes.push(cur); paintStroke(cur, 0);
    queue = [cur.pts[0]]; flush(true);
    clearInterval(timer); timer = setInterval(() => flush(), 45);
  };
  drawCv.onpointermove = e => {
    if (!cur) return;
    let evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];   // extra in-between points when the browser has them
    if (!evs.length) evs = [e];
    for (const ev of evs) { const p = pt(ev); cur.pts.push(p); queue.push(p); }
    paintStroke(cur, Math.max(0, cur.pts.length - evs.length - 1));
  };
  drawCv.onpointerup = drawCv.onpointercancel = () => { flush(); clearInterval(timer); cur = null; };
}

/* ---------- Bible Challenge: tap an option ---------- */
function renderChoices(s, teams) {
  const locked = s.choices.every(c => c.state === "locked");
  app.innerHTML = `
    <header class="p-top"><div class="me"><small>${esc(teams[s.team] || "")}</small><b>${esc(s.name || "")}</b></div>
      <div class="mini-score"><span class="s0">${s.scores?.[0] ?? 0}</span><span class="s1">${s.scores?.[1] ?? 0}</span></div></header>
    <p class="status">${esc(s.status)}</p>
    <div class="ans-q">${esc(s.q || "")}</div>
    <div class="choice-list">${s.choices.map((c, i) => `<button class="opt ${c.state}" data-i="${i}" ${c.state ? "disabled" : ""}><em>${"ABCD"[i]}</em><span>${esc(c.t)}</span></button>`).join("")}</div>
    <footer class="p-foot">${locked ? `<p class="muted small">Only the answering team can pick</p>` : ""}${linkLine()}</footer>`;
  app.querySelectorAll(".opt[data-i]").forEach(b => b.onclick = () => { if (b.disabled) return; unlock(); vib(40); client.send({ t: "pick", i: +b.dataset.i }); app.querySelectorAll(".opt").forEach(x => x.disabled = true); b.classList.add("chosen"); });
}
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 3200);
}

/* ---------- CORRECT / INCORRECT result screen ---------- */
const sfx = {};
function playFile(name) { try { (sfx[name] ||= new Audio(`assets/audio/${name}.mp3`)); sfx[name].currentTime = 0; sfx[name].play().catch(() => {}); } catch {} }
function showResult(m) {
  sent = false;
  const el = document.createElement("div");
  if (m.kind === "correct") {
    el.className = "result ok";
    el.innerHTML = `<div class="r-ico">✓</div><b>${m.top ? "TOP ANSWER!" : "CORRECT!"}</b><span>${esc(m.answer)}</span><em>+${m.pts}</em>`;
    playFile(m.top ? "top" : "reveal"); vib([60, 40, 160]);
  } else if (m.kind === "wrong") {
    el.className = "result bad";
    el.innerHTML = `<div class="r-ico">✕</div><b>INCORRECT</b>${m.text ? `<span>“${esc(m.text)}”</span>` : ""}<small>${esc(m.msg || "Not on the board")}</small>
      ${m.strikes ? `<div class="r-strikes">${Array.from({ length: Math.min(3, m.strikes) }, () => "<i>✕</i>").join("")}</div><em>Strike ${m.strikes}</em>` : ""}`;
    playFile("incorrect"); vib([200, 80, 200]);
  } else {
    el.className = "result again";
    el.innerHTML = `<div class="r-ico">↻</div><b>Try again!</b><small>${esc(m.msg || "")}</small>`;
    vib(60);
  }
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, m.kind === "again" ? 1500 : 2600);
  render();
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
      <div class="h-answers">${s.answers.map((a, i) => `<button class="h-ans ${a.r ? "done" : ""}" data-a="reveal" data-v="${i}" ${a.r || !s.canReveal || s.pending ? "disabled" : ""} title="${s.stage === "roundEnd" ? "Reveal on TV (no points)" : "Award this answer"}"><em>${i + 1}</em><span>${esc(a.t)}</span><b>${a.p}</b></button>`).join("")}</div>
      ${s.stage === "roundEnd" ? `<p class="muted small">Tap answers to reveal them on the TV</p>` : ""}
      ${s.canReveal && s.stage !== "roundEnd" ? `<button class="h-strike" data-a="strike" ${s.pending ? "disabled" : ""}>✕ NOT ON THE BOARD</button><p class="muted small">${"✕".repeat(s.strikes)}${"·".repeat(Math.max(0, 3 - s.strikes))} strikes</p>` : ""}`;
  } else if (s.screen === "fast" || s.screen === "arcade" || s.screen === "carol" || s.screen === "sketch") {
    body = `<p class="h-prompt">${esc(s.prompt || "")}</p>${s.total !== undefined ? `<div class="h-score"><span class="bank">Total <b>${s.total}</b> / 200</span></div>` : ""}
      ${s.fmAnswers ? `<div class="h-q">Survey answers (only you can see these):<br>${s.fmAnswers.map(esc).join(" · ")}</div>` : ""}`;
  } else body = `<p class="h-prompt">${s.screen === "lobby" ? "Players are joining. Start when everyone's in!" : "Use the TV to choose a game."}</p>`;
  app.innerHTML = `<header class="h-top"><b>Host Remote</b><small>Answers are only on your phone</small></header>
    ${body}
    <div class="h-ctl">${ctl.map(c => `<button class="h-btn ${c.kind || ""}" data-a="${c.a}" data-v="${c.v ?? ""}">${esc(c.label)}</button>`).join("")}</div>
    ${linkLine()}`;
  if (fixOpen && s.fmFixRows?.length) {   // deliberate correction panel (never mixed in with the reveal button)
    const row = s.fmFixRows.find(r => r.q === fixRow);
    app.innerHTML = `<header class="h-top"><b>Fix an answer's match</b><small>Only if the game matched an answer wrongly</small></header>
      ${row ? `<p class="h-prompt">Q${row.q + 1}: ${esc(row.question)}</p><div class="h-q">Player said: <b>“${esc(row.said || "(pass)")}”</b><br>Pick what it really matches:</div>
        <div class="h-ctl">${row.options.map(o => `<button class="h-btn ans ${o.i === row.pick ? "ok" : ""}" data-fix="${row.p}.${row.q}.${o.i}">${esc(o.label)}</button>`).join("")}<button class="h-btn x" data-fix="${row.p}.${row.q}.-1">Not on the board · 0</button></div>`
        : `<p class="h-prompt">Which answer?</p><div class="h-ctl">${s.fmFixRows.map(r => `<button class="h-btn" data-row="${r.q}">Q${r.q + 1}: “${esc(r.said || "(pass)")}”</button>`).join("")}</div>`}
      <div class="h-ctl"><button class="h-btn ghost" data-close="1">Cancel</button></div>`;
    app.querySelectorAll("[data-row]").forEach(b => b.onclick = () => { fixRow = +b.dataset.row; render(); });
    app.querySelectorAll("[data-fix]").forEach(b => b.onclick = () => { vib(30); client.send({ t: "act", a: "fmFix", v: b.dataset.fix }); fixOpen = false; fixRow = null; render(); });
    app.querySelector("[data-close]").onclick = () => { fixOpen = false; fixRow = null; render(); };
    return;
  }
  app.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
    if (b.disabled) return; vib(25);
    if (b.dataset.a === "fmFixMenu") { fixOpen = true; fixRow = null; return render(); }
    client.send({ t: "act", a: b.dataset.a, v: b.dataset.v }); b.classList.add("sent");
  });
}
const linkLine = () => `<p class="link-line ${link}">${{ connected: "● Connected", connecting: "Connecting…", lost: "Reconnecting…", noroom: "Room not found", unavailable: "Can't connect. Ask the host to tap for you" }[link] || ""}</p>`;

/* ---------- boot ---------- */
document.addEventListener("pointerdown", unlock, { once: true });
/* keep the screen awake while playing, so phones don't lock mid-game (re-acquired when the page comes back) */
let wakeLock = null;
async function stayAwake() { try { if (!document.hidden && !wakeLock) { wakeLock = await navigator.wakeLock?.request("screen"); wakeLock?.addEventListener("release", () => { wakeLock = null; }); } } catch {} }
document.addEventListener("visibilitychange", () => { if (!document.hidden) stayAwake(); });
document.addEventListener("pointerdown", stayAwake);
stayAwake();
if (code) { addEventListener("load", connect); }
render();
