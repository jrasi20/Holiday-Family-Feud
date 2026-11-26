// Visual effects: falling snow, confetti bursts, full-screen overlays.

const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DPR = IOS ? 1 : Math.min(2, window.devicePixelRatio || 1);

function makeCanvas(cls) {
  const c = document.createElement("canvas");
  c.className = cls;
  document.body.appendChild(c);
  const fit = () => { c.width = innerWidth * DPR; c.height = innerHeight * DPR; };
  fit(); addEventListener("resize", fit);
  return c;
}

// ---------- Snow ----------
export function startSnow() {
  if (REDUCED) return;
  const c = makeCanvas("snow-canvas"), g = c.getContext("2d");
  const count = Math.round(Math.min(90, innerWidth / 14));
  const flakes = Array.from({ length: count }, () => spawn(true));
  function spawn(any) {
    return { x: Math.random() * c.width, y: any ? Math.random() * c.height : -10, r: (Math.random() * 2.2 + 0.8) * DPR,
      vy: (Math.random() * 0.5 + 0.35) * DPR, sway: Math.random() * 6.28, a: Math.random() * 0.5 + 0.35 };
  }
  let last = performance.now();
  (function frame(now) {
    const dt = Math.min(3, (now - last) / 16.7); last = now;
    if (!document.hidden) {
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = "#fff";
      for (const f of flakes) {
        f.y += f.vy * dt; f.sway += 0.012 * dt; f.x += Math.sin(f.sway) * 0.35 * DPR * dt;
        if (f.y > c.height + 10) Object.assign(f, spawn(false));
        g.globalAlpha = f.a; g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.283); g.fill();
      }
    }
    requestAnimationFrame(frame);
  })(last);
}

// ---------- Confetti ----------
let confC, confG, parts = [], running = false;
const COLORS = ["#f5c451", "#ffe9a8", "#c8202f", "#1f9d6b", "#ffffff", "#e8a33a"];
export function confetti(amount = 140, origin = { x: 0.5, y: 0.35 }) {
  if (REDUCED) amount = Math.min(amount, 30);
  if (!confC) { confC = makeCanvas("confetti-canvas"); confG = confC.getContext("2d"); }
  const ox = origin.x * confC.width, oy = origin.y * confC.height;
  for (let i = 0; i < amount; i++) {
    const ang = Math.random() * Math.PI * 2, sp = (Math.random() * 9 + 4) * DPR;
    parts.push({ x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 6 * DPR, w: (Math.random() * 7 + 5) * DPR, h: (Math.random() * 4 + 3) * DPR,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, color: COLORS[i % COLORS.length], life: 1, star: Math.random() < 0.18 });
  }
  if (!running) { running = true; requestAnimationFrame(tick); }
}
export function confettiRain(seconds = 3) {
  const end = performance.now() + seconds * 1000;
  (function drop() {
    confetti(18, { x: Math.random(), y: -0.05 });
    if (performance.now() < end) setTimeout(drop, 180);
  })();
}
function tick() {
  confG.clearRect(0, 0, confC.width, confC.height);
  parts = parts.filter(p => p.life > 0 && p.y < confC.height + 40);
  for (const p of parts) {
    p.vy += 0.28 * DPR; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.006;
    confG.save(); confG.translate(p.x, p.y); confG.rotate(p.rot); confG.globalAlpha = Math.min(1, p.life * 2);
    confG.fillStyle = p.color;
    if (p.star) { star(confG, p.w * 0.8); } else confG.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1);
    confG.restore();
  }
  if (parts.length) requestAnimationFrame(tick); else { running = false; confG.clearRect(0, 0, confC.width, confC.height); }
}
function star(g, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

// ---------- Overlays ----------
export function overlay(html, cls, ms = 1600) {
  const el = document.createElement("div");
  el.className = `fx-overlay ${cls}`;
  el.innerHTML = html;
  document.body.appendChild(el);
  return new Promise(res => setTimeout(() => { el.classList.add("out"); setTimeout(() => { el.remove(); res(); }, 320); }, ms));
}

export function strikeFlash(count) {
  const xs = Array.from({ length: count }, () => `<span class="big-x">✕</span>`).join("");
  document.body.classList.remove("shake"); void document.body.offsetWidth; document.body.classList.add("shake");
  return overlay(`<div class="x-row">${xs}</div>`, "strike-overlay", 1050);
}

export function countUp(el, from, to, ms = 900, onStep) {
  if (!el) return;
  const start = performance.now();
  let lastShown = from;
  (function step(now) {
    const k = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - k, 3);
    const v = Math.round(from + (to - from) * e);
    if (v !== lastShown) { lastShown = v; onStep && onStep(v); }
    el.textContent = v;
    if (k < 1) requestAnimationFrame(step);
  })(start);
}

export const isIOS = IOS;
