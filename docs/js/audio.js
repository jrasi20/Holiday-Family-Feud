// Audio engine: Web Audio (low latency, iOS-safe).
// SFX = mp3 buffers. Music = docs/assets/music/<track>.mp3 if present,
// otherwise a built-in synthesized public-domain carol, so the game is never silent.

const SFX = ["click","reveal","top","strike","timeup","timpani","transition","coin","win","victory","steal","levelup","page","magic","whoosh","star","right","oops","pop","gong","nope","countdown"];
const VO = ["vo-survey-says","vo-top-answer","vo-steal","vo-fast-money","vo-winner","vo-round","vo-welcome","vo-congrats"];
// music files are loudness-normalized to -16 LUFS, so these are true relative levels
const MUSIC_VOL = { menu: 0.42, game: 0.26, round: 0.24, win: 0.5, fastmoney: 0.3 };

let ctx = null, master, sfxBus, musicBus;
const buffers = {};
const musicFiles = {};       // track -> AudioBuffer | null (null = file missing)
let musicNode = null, musicTrack = null, synthTimer = null;
let sfxOn = true, musicOn = true;

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
  setSfx(v) { sfxOn = v; },
  setMusic(v) { musicOn = v; if (!v) stopMusic(); else if (musicTrack) { const t = musicTrack; musicTrack = null; this.music(t); } },

  unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
      master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.3; musicBus.connect(master);
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
  voice(name) {
    if (!ctx || !sfxOn || !buffers[name]) return false;
    duck(0.35, 1.6);
    this.play(name, { vol: 1 });
    return true;
  },

  buzzer(team = 0) {           // face-off buzz-in: chunky two-tone
    if (!ctx || !sfxOn) return;
    const t = ctx.currentTime, base = team ? 330 : 262;
    [base, base * 1.5].forEach((f, i) => tone(f, t + i * 0.005, 0.45, "square", 0.12, 1400));
    vibrate(80);
  },
  wrong() {                    // the classic harsh "X" buzzer
    if (!ctx) { vibrate([90, 50, 90]); return; }
    if (sfxOn) {
      const t = ctx.currentTime;
      tone(98, t, 0.75, "sawtooth", 0.22, 900);
      tone(104, t, 0.75, "square", 0.12, 700);
      this.play("strike", { vol: 0.7 });
    }
    vibrate([120, 60, 120]);
  },
  tick(urgent) {
    if (!ctx || !sfxOn) return;
    tone(urgent ? 1320 : 880, ctx.currentTime, 0.06, "sine", urgent ? 0.14 : 0.07, 6000);
  },
  ding(step = 0) {             // ascending reveal ding for count-ups
    if (!ctx || !sfxOn) return;
    tone(660 * Math.pow(2, step / 12), ctx.currentTime, 0.25, "triangle", 0.12, 8000);
  },

  music(track) {
    if (musicTrack === track && (musicNode || synthTimer)) return;
    stopMusic();
    musicTrack = track;
    if (!ctx || !musicOn || !track) return;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(MUSIC_VOL[track] ?? 0.25, ctx.currentTime);
    const start = (buf) => {
      if (musicTrack !== track) return;
      if (buf) {
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = track !== "win";
        src.connect(musicBus); src.start(); musicNode = src;
      } else startSynth(track);
    };
    if (track in musicFiles) start(musicFiles[track]);
    else load(`assets/music/${track}.mp3`).then(b => { musicFiles[track] = b; start(b); });
  },
  stopMusic() { stopMusic(); musicTrack = null; }
};

function stopMusic() {
  if (musicNode) { try { musicNode.stop(); } catch {} musicNode = null; }
  if (synthTimer) { clearInterval(synthTimer); synthTimer = null; }
}
function duck(to, secs) {
  if (!ctx) return;
  const g = musicBus.gain, now = ctx.currentTime, v = g.value;
  g.cancelScheduledValues(now); g.setValueAtTime(v, now);
  g.linearRampToValueAtTime(v * to, now + 0.12);
  g.linearRampToValueAtTime(v, now + secs);
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
