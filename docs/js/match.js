// Forgiving answer checker for typed or spoken answers:
// "wisemen", "the magi", "sheperds", "frankinsence", "silent nite" all count.

const STOP = new Set(["christmas","xmas","holiday","holidays","eve","day","time","thing","things","something","stuff","people","person","family","kid","kids","really","very","just","probably","could","lot","lots","get","go","goes","make","makes","take","put","do","does","you","your","we","our","me","us","them","this","that","there","when","what","who","all","any","one","out","up","into","over","then","so","because","with","would","the","a","an","of","to","in","on","and","or","is","it","its","his","her","their","my","at","for","with","be","was","were","they","he","she","did","got","some","from","um","uh","like","maybe","i","think","say","answer","would","be"]);
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
  if (L <= 4) return false;                 // short words: exact only
  return lev(a, b) <= (L >= 8 ? 2 : 1);
};
const variants = ([text, , aliases = []]) => [...text.split("/"), ...aliases].map(v => v.trim()).filter(Boolean);

function score(guess, variant) {
  const g = norm(guess), v = norm(variant);
  if (!g || !v) return 0;
  if (g === v || g.replace(/ /g, "") === v.replace(/ /g, "")) return 1;
  if (close(g.replace(/ /g, ""), v.replace(/ /g, ""))) return 0.95;
  const gt = tokens(g), vt = tokens(v).filter(w => w.length >= 3);
  const rambling = gt.length > vt.length + 3;
  if (!rambling && g.length >= 4 && v.length >= 4 && (v.includes(g) || g.includes(v))) return 0.85;
  if (!gt.length || !vt.length) return 0;
  const hits = vt.filter(w => gt.some(x => close(x, w) || x === w)).length;
  const ratio = hits / vt.length;
  if (!hits || ratio < 0.5 || (rambling && ratio < 1)) return 0;
  return 0.5 + 0.3 * ratio;
}

/* sound-alike code, for words the speech engine mishears ("stalking" ≈ "stocking") */
const sound = w => {
  w = w.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length < 4) return w;
  const first = /[aeiou]/.test(w[0]) ? "A" : w[0];
  return first + w.slice(1)
    .replace(/ph/g, "f").replace(/ck|q|c(?=[aou])|ch/g, "k").replace(/c/g, "s").replace(/z/g, "s").replace(/x/g, "ks")
    .replace(/[aeiouyhw]/g, "").replace(/l(?=k)/g, "").replace(/(.)\1+/g, "$1");
};
function soundsLike(guess, variant) {
  const g = tokens(guess).map(sound), v = tokens(variant).filter(w => w.length >= 4).map(sound);
  if (!v.length || !g.length) return 0;
  const hits = v.filter(c => c.length >= 4 && g.some(x => x === c)).length;   // exact sound pattern only (no near-misses)
  return hits === v.length ? 0.62 : 0;
}

/** index of the best-matching answer, or -1 if nothing on the board matches */
export function matchAnswer(guess, answers, min = 0.6) {
  let best = -1, bestScore = 0;
  answers.forEach((ans, i) => {
    const s = Math.max(...variants(ans).map(v => Math.max(score(guess, v), soundsLike(guess, v))));
    if (s > bestScore) { bestScore = s; best = i; }
  });
  return bestScore >= min ? best : -1;
}
