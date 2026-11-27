// Audio engine: Web Audio (low latency, iOS-safe).
// SFX = mp3 buffers. Music = docs/assets/music/<track>.mp3 if present,
// otherwise a built-in synthesized public-domain carol, so the game is never silent.

const SFX = ["click","reveal","top","strike","timeup","timpani","transition","coin","win","victory","steal","levelup","page","magic","whoosh","star","right","oops","pop","gong","nope","countdown","incorrect","chime","ooh","buzzer","clock","press","hover","cheer","applause","gasp"];
const VO = ["vo-survey-says","vo-top-answer","vo-steal","vo-fast-money","vo-winner","vo-round","vo-welcome","vo-congrats","vo-great","vo-better-luck","vo-try-again",
  "vo-lobby","vo-faceoff","vo-buzzed","vo-play-or-pass","vo-strike1","vo-strike2","vo-strike3","vo-board-cleared","vo-steal-success","vo-final-round","vo-next-round","vo-times-up","vo-fm-reveal","vo-duplicate",
  "vo-turn-bethlehem","vo-turn-nazareth","vo-next-question","vo-fm-player1","vo-fm-player2","vo-wrong","vo-need-200","vo-top-was","vo-well-tried"];   // optional: play when the file exists
// music files are loudness-normalized to -16 LUFS, so these are true relative levels
const MUSIC_VOL = { menu: 0.42, theme: 0.4, lobby: 0.34, game: 0.38, round: 0.3, win: 0.5, fastmoney: 0.32 };
const MUSIC_FILE = { fastmoney: "round" };   // Fast Money reuses the drum loop

let ctx = null, master, sfxBus, musicBus;
const buffers = {};
let musicNode = null, musicTrack = null, synthTimer = null;
let sfxOn = true, musicOn = true, clockNode = null;

const load = async (url) => {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    return await new Promise((res) => ctx.decodeAudioData(ab, res, () => res(null)));
  } catch { return null; }
};

export const audio = {
  get ready() { return !!ctx; },
  get musicLevel() { return musicBus ? +musicBus.gain.value.toFixed(3) : null; },   // for testing
  setSfx(v) { sfxOn = v; },
  setMusic(v) { musicOn = v; if (!v) { stopMusic(); musicGen++; } else if (musicTrack) { const t = musicTrack; musicTrack = null; this.music(t); } },

  unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
      master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 1; musicBus.connect(master);   // per-track level lives on each track's own gain
      SFX.forEach(n => load(`assets/audio/${n}.mp3`).then(b => { buffers[n] = b; }));
      VO.forEach(n => load(`assets/audio/${n}.mp3`).then(b => { buffers[n] = b; }));
      document.addEventListener("visibilitychange", () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else ctx.resume();
      });
    }
    if (ctx.state !== "running") ctx.resume();
    // iOS: a one-sample silent buffer started inside the gesture fully unlocks output.
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
  },

  play(name, { vol = 1, rate = 1 } = {}) {
    if (!ctx || !sfxOn) return;
    const b = buffers[name];
    if (!b) { synthFallback(name); return; }
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b; src.playbackRate.value = rate; g.gain.value = vol;
    src.connect(g).connect(sfxBus); src.start();
  },

  /** true if a voice line file exists and was played */
  /** length in seconds of a loaded sound (0 if missing) */
  length(name) { return buffers[name]?.duration || 0; },
  voice(name) {
    if (!ctx || !sfxOn || !buffers[name]) return false;
    duck(0.35, 1.6);
    this.play(name, { vol: 1 });
    return true;
  },

  buzzer(team = 0) {           // face-off buzz-in (Jane's buzzer; synth only if missing)
    if (!ctx || !sfxOn) return;
    if (buffers.buzzer) { this.play("buzzer", { rate: team ? 1.06 : 1 }); vibrate(80); return; }
    const t = ctx.currentTime, base = team ? 330 : 262;
    [base, base * 1.5].forEach((f, i) => tone(f, t + i * 0.005, 0.45, "square", 0.12, 1400));
    vibrate(80);
  },
  wrong() {                    // incorrect-answer buzzer (Jane's recording; synth only if it failed to load)
    if (!ctx) { vibrate([90, 50, 90]); return; }
    if (sfxOn) {
      if (buffers.incorrect) { this.play("incorrect", { vol: 1 }); if (buffers.ooh) setTimeout(() => this.play("ooh", { vol: 0.7 }), 550); }
      else { const t = ctx.currentTime; tone(98, t, 0.75, "sawtooth", 0.22, 900); tone(104, t, 0.75, "square", 0.12, 700); }
    }
    vibrate([120, 60, 120]);
  },
  /* ticking clock bed under timed answers (loops until stopped) */
  clock(on) {
    if (clockNode) { try { clockNode.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08); clockNode.src.stop(ctx.currentTime + 0.4); } catch {} clockNode = null; }
    if (!on || !ctx || !sfxOn || !buffers.clock) return;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffers.clock; src.loop = true; g.gain.value = 0.55;
    src.connect(g).connect(sfxBus); src.start(); clockNode = { src, g };
  },
  /* Name That Carol: a clip that can pause on a buzz and resume */
  clip(url) {
    const c = { buf: null, src: null, g: null, offset: 0, startedAt: 0, playing: false, onend: null, ready: null };
    c.ready = (ctx ? load(url) : Promise.resolve(null)).then(b => { c.buf = b; return b; });
    c.play = () => {
      if (!ctx || !c.buf || c.playing) return;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = c.buf; g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.25);
      src.connect(g).connect(master); src.start(0, Math.min(c.offset, c.buf.duration - 0.05));
      c.src = src; c.g = g; c.startedAt = ctx.currentTime - c.offset; c.playing = true;
      src.onended = () => { if (c.src === src && c.playing) { c.playing = false; c.offset = c.buf.duration; c.onend?.(); } };
    };
    c.pause = () => {
      if (!c.playing) return;
      c.offset = ctx.currentTime - c.startedAt; c.playing = false;
      const { src, g } = c; c.src = null;
      try { g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05); src.stop(ctx.currentTime + 0.2); } catch {}
    };
    c.stop = () => { c.pause(); c.offset = 0; };
    c.elapsed = () => c.playing ? ctx.currentTime - c.startedAt : c.offset;
    return c;
  },
  tick(urgent) {
    if (!ctx || !sfxOn) return;
    tone(urgent ? 1320 : 880, ctx.currentTime, 0.06, "sine", urgent ? 0.14 : 0.07, 6000);
  },
  ding(step = 0) {             // ascending reveal ding for count-ups
    if (!ctx || !sfxOn) return;
    tone(660 * Math.pow(2, step / 12), ctx.currentTime, 0.25, "triangle", 0.12, 8000);
  },

  // Exactly ONE music track at a time. Each request gets a generation number; a track that
  // finishes loading after a newer request is discarded, and the old track fades out.
  music(track, { restart = false, then = null } = {}) {
    if (!restart && musicTrack === track && (musicNode || synthTimer || loadingGen === musicGen)) return;
    if (restart && musicTrack === track && musicNode && musicNode.src.loop) return;   // already looping: keep it
    stopMusic();
    musicTrack = track;
    const gen = ++musicGen;
    if (!ctx || !musicOn || !track) return;
    const start = (buf) => {
      if (gen !== musicGen) return;            // a newer track was requested meanwhile
      loadingGen = -1;
      if (buf) {
        const src = ctx.createBufferSource(), g = ctx.createGain(), now = ctx.currentTime, v = MUSIC_VOL[track] ?? 0.25;
        src.buffer = buf; src.loop = track !== "win";
        if (src.loop) { const [a, b] = audibleBounds(buf); src.loopStart = a; src.loopEnd = b; }
        g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(v, now + 0.8);   // fade in
        src.connect(g).connect(musicBus); src.start();
        musicNode = { src, g };
        if (!src.loop && then) src.onended = () => { if (gen === musicGen) { musicTrack = null; this.music(then); } };
      } else startSynth(track);
    };
    loadingGen = gen;
    if (!musicLoads[track]) musicLoads[track] = load(`assets/music/${MUSIC_FILE[track] || track}.mp3`);   // one download per track, ever
    musicLoads[track].then(start);
  },
  stopMusic() { stopMusic(); musicTrack = null; musicGen++; }
};
const musicLoads = {};
let musicGen = 0, loadingGen = -1;

function stopMusic() {
  if (musicNode) {                              // fade out over 0.7s, then stop
    const { src, g } = musicNode, now = ctx.currentTime;
    try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7); src.stop(now + 0.75); } catch {}
    musicNode = null;
  }
  if (synthTimer) { clearInterval(synthTimer); synthTimer = null; }
}
const MUSIC_BUS = 1;          // the music bus always returns to this level
let duckUntil = 0;
function duck(to, secs) {
  if (!ctx) return;
  const g = musicBus.gain, now = ctx.currentTime;
  duckUntil = Math.max(duckUntil, now + secs);            // overlapping lines extend the dip, never deepen it
  g.cancelScheduledValues(now); g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(MUSIC_BUS * to, now + 0.12);
  g.setValueAtTime(MUSIC_BUS * to, duckUntil - 0.25);
  g.linearRampToValueAtTime(MUSIC_BUS, duckUntil);
}
function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch {} }

function tone(freq, t, dur, type, vol, cutoff = 4000, bus = sfxBus) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  f.type = "lowpass"; f.frequency.value = cutoff;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function synthFallback(name) {
  const t = ctx.currentTime;
  if (name === "reveal" || name === "right") { tone(784, t, 0.2, "triangle", 0.14); tone(1175, t + 0.08, 0.3, "triangle", 0.12); }
  else if (name === "click" || name === "pop") tone(1200, t, 0.05, "sine", 0.08);
}

// ---------- Synth carols (public domain melodies) ----------
const N = m => 440 * Math.pow(2, (m - 69) / 12);
// [beat, durationBeats, midi]
function seq(str) {           // "64:1 64:1 64:2 ..." -> events (r = rest)
  let t = 0; const out = [];
  str.trim().split(/\s+/).forEach(tok => { const [n, d] = tok.split(":"); const dur = +d; if (n !== "r") out.push([t, dur, +n]); t += dur; });
  return { events: out, length: t };
}
const SONGS = {
  // Jingle Bells chorus (C major), bright sleigh-bell feel
  menu: {
    bpm: 152, lead: "bell", bells: true,
    mel: seq(`76:1 76:1 76:2 76:1 76:1 76:2 76:1 79:1 72:1.5 74:0.5 76:4
              77:1 77:1 77:1.5 77:0.5 77:1 76:1 76:1 76:0.5 76:0.5 76:1 74:1 74:1 76:1 74:2 79:2
              76:1 76:1 76:2 76:1 76:1 76:2 76:1 79:1 72:1.5 74:0.5 76:4
              77:1 77:1 77:1.5 77:0.5 77:1 76:1 76:1 76:0.5 76:0.5 79:1 79:1 77:1 74:1 72:4`),
    bass: seq(`48:4 48:4 48:4 48:4 53:4 48:4 50:4 55:4 48:4 48:4 48:4 48:4 53:4 48:4 55:4 48:4`)
  },
  // We Wish You a Merry Christmas (3/4), soft music-box bed for gameplay
  game: {
    bpm: 108, lead: "box", bells: false,
    mel: seq(`67:1 72:1 72:0.5 74:0.5 72:0.5 71:0.5 69:1 69:1 69:1 74:1 74:0.5 76:0.5 74:0.5 72:0.5
              71:1 67:1 67:1 76:1 76:0.5 77:0.5 76:0.5 74:0.5 72:1 69:1 67:0.5 67:0.5 69:1 74:1 71:1 72:2 r:1`),
    bass: seq(`r:1 48:3 53:3 50:3 55:3 48:3 53:3 55:3 48:3`)
  },
  fastmoney: {
    bpm: 168, lead: "box", bells: true,
    mel: seq(`72:0.5 r:0.5 79:0.5 r:0.5 72:0.5 r:0.5 79:0.5 r:0.5 74:0.5 r:0.5 81:0.5 r:0.5 74:0.5 r:0.5 81:0.5 r:0.5`),
    bass: seq(`48:1 48:1 48:1 48:1 50:1 50:1 50:1 50:1`)
  },
  win: {
    bpm: 132, lead: "brass", bells: true, once: true,
    mel: seq(`67:0.5 72:0.5 76:0.5 79:1.5 76:0.5 79:3 r:1 77:0.5 81:0.5 84:3`),
    bass: seq(`48:2 48:2 48:3 r:1 53:1 48:3`)
  },
  round: null   // set below: falls back to the gameplay carol
};
SONGS.round = SONGS.game;

function voice(kind, freq, t, dur) {
  if (kind === "bell") {           // bright glockenspiel-ish
    tone(freq, t, dur * 0.9 + 0.35, "triangle", 0.18, 7000, musicBus);
    tone(freq * 2, t, 0.35, "sine", 0.05, 9000, musicBus);
  } else if (kind === "box") {     // music box
    tone(freq, t, 0.9, "sine", 0.16, 6000, musicBus);
    tone(freq * 3, t, 0.25, "sine", 0.025, 9000, musicBus);
  } else {                         // soft brass
    tone(freq, t, dur + 0.15, "sawtooth", 0.08, 1800, musicBus);
    tone(freq / 2, t, dur + 0.15, "triangle", 0.08, 1200, musicBus);
  }
}
function sleigh(t, accent) {
  const len = 0.08, buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; f.type = "highpass"; f.frequency.value = 7000; g.gain.value = accent ? 0.09 : 0.045;
  s.connect(f).connect(g).connect(musicBus); s.start(t);
}
function startSynth(track) {
  const song = SONGS[track]; if (!song) return;
  const spb = 60 / song.bpm, loopLen = Math.max(song.mel.length, song.bass.length);
  let origin = ctx.currentTime + 0.08, nextCheck = 0, loops = 0;
  const all = [...song.mel.events.map(e => ["m", ...e]), ...song.bass.events.map(e => ["b", ...e])];
  if (song.bells) for (let b = 0; b < loopLen; b += 0.5) all.push(["s", b, 0.5, b % 1 === 0]);
  all.sort((a, b) => a[1] - b[1]);
  let i = 0;
  const pump = () => {
    const horizon = ctx.currentTime + 0.25;
    while (true) {
      if (i >= all.length) {
        if (song.once) { clearInterval(synthTimer); synthTimer = null; return; }
        i = 0; loops++; origin += loopLen * spb;
      }
      const [kind, beat, dur, val] = all[i];
      const t = origin + beat * spb;
      if (t > horizon) break;
      if (t >= ctx.currentTime - 0.02) {
        if (kind === "m") voice(song.lead, N(val), t, dur * spb);
        else if (kind === "b") tone(N(val), t, dur * spb * 0.9, "triangle", 0.11, 900, musicBus);
        else sleigh(t, val);
      }
      i++;
    }
  };
  pump();
  synthTimer = setInterval(pump, 60);
}

/* first/last audible sample (seconds), so short loops repeat without a gap */
function audibleBounds(buf) {
  const d = buf.getChannelData(0), n = d.length, th = 0.004;
  let a = 0, b = n - 1;
  while (a < n && Math.abs(d[a]) < th) a++;
  while (b > a && Math.abs(d[b]) < th) b--;
  return [a / buf.sampleRate, (b + 1) / buf.sampleRate];
}
