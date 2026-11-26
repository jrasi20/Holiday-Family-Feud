// Forgiving answer checker for typed or spoken answers:
// "wisemen", "the magi", "sheperds", "frankinsence", "silent nite" all count.

const STOP = new Set(["the","a","an","of","to","in","on","and","or","is","it","its","his","her","their","my","at","for","with","be","was","were","they","he","she","did","got","some","from","um","uh","like","maybe","i","think","say","answer","would","be"]);
const NUM = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10" };

export function norm(s) {
  return String(s).toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g, m => NUM[m])
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
}

const stem = w => w.length > 4 ? w.replace(/(ies)$/, "y").replace(/(es|s)$/, "") : w;
const tokens = s => norm(s).split(" ").filter(w => w && !STOP.has(w)).map(stem);

function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const close = (a, b) => {
  if (a === b) return true;
  const L = Math.max(a.length, b.length);
  if (L < 4) return false;
  return lev(a, b) <= (L >= 7 ? 2 : 1);
};
const variants = ([text, , aliases = []]) => [...text.split("/"), ...aliases].map(v => v.trim()).filter(Boolean);

function score(guess, variant) {
  const g = norm(guess), v = norm(variant);
  if (!g || !v) return 0;
  if (g === v || g.replace(/ /g, "") === v.replace(/ /g, "")) return 1;
  if (close(g.replace(/ /g, ""), v.replace(/ /g, ""))) return 0.95;
  if (g.length >= 4 && (v.includes(g) || g.includes(v))) return 0.85;
  const gt = tokens(g), vt = tokens(v).filter(w => w.length >= 3);
  if (!gt.length || !vt.length) return 0;
  const hits = vt.filter(w => gt.some(x => close(x, w) || (w.length >= 3 && x === w))).length;
  if (!hits) return 0;
  return 0.5 + 0.3 * (hits / vt.length);
}

/** index of the best-matching answer, or -1 if nothing on the board matches */
export function matchAnswer(guess, answers) {
  let best = -1, bestScore = 0;
  answers.forEach((ans, i) => {
    const s = Math.max(...variants(ans).map(v => score(guess, v)));
    if (s > bestScore) { bestScore = s; best = i; }
  });
  return bestScore >= 0.6 ? best : -1;
}
