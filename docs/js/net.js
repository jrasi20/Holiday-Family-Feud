// Room networking: the TV/host device is the "room"; phones connect to it.
// Peer-to-peer via PeerJS (free public signaling server, no account, no backend).
// Every phone feature is optional: if connecting fails, the host taps instead.

const PREFIX = "bekshow-v1-";
const LETTERS = "BCDFGHJKLMNPQRSTVWXZ";
const ICE = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"], username: "openrelayproject", credential: "openrelayproject" }
  ]
};
const PEER_OPTS = { config: ICE, debug: 0 };

export const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");
export const makeKey = () => Math.random().toString(36).slice(2, 8);
const peerLib = () => window.Peer;

/* ---------------- HOST (TV) ---------------- */
export class Room {
  constructor({ onPlayers, onMessage, onStatus }) {
    this.code = null; this.key = null; this.peer = null;
    this.conns = new Map();      // pid -> {conn, role, name, team}
    this.onPlayers = onPlayers; this.onMessage = onMessage; this.onStatus = onStatus;
    this.status = "off";
    // Heartbeat both ways. A locked phone goes silent: we mark it "away" but KEEP its seat
    // (players 45s, host remote 12s) so it slips straight back in when the phone wakes.
    setInterval(() => {
      const now = Date.now(); let changed = false;
      for (const [pid, c] of this.conns) {
        const quiet = now - (c.seen || 0);
        if (c.open && quiet > 9000) { c.open = false; c.awaySince = now; try { c.conn.close(); } catch {} changed = true; }
        const grace = c.role === "host" ? 12000 : 45000;
        if (!c.open && now - (c.awaySince || 0) > grace) { this.conns.delete(pid); changed = true; }
        if (c.open && c.conn.open) { try { c.conn.send({ t: "ping" }); } catch {} }
      }
      if (changed) this.onPlayers?.(this.players);
    }, 3000);
  }
  /* players include anyone briefly away (locked phone) so turns and teams don't reshuffle */
  get players() { return [...this.conns.values()].filter(c => c.role === "player").map(({ pid, name, team, open }) => ({ pid, name, team, away: !open })); }
  get hostRemote() { return [...this.conns.values()].some(c => c.role === "host" && c.open); }

  open(preferred) {
    if (!peerLib()) { this.setStatus("unavailable"); return; }
    const saved = (() => { try { return JSON.parse(sessionStorage.getItem("css-room")); } catch { return null; } })();
    this.code = preferred || saved?.code || makeCode();
    this.key = saved?.key || makeKey();
    this.setStatus("connecting");
    const start = (code, tries) => {
      this.code = code;
      const peer = new (peerLib())(PREFIX + code, PEER_OPTS);
      this.peer = peer;
      peer.on("open", () => {
        try { sessionStorage.setItem("css-room", JSON.stringify({ code: this.code, key: this.key })); } catch {}
        this.setStatus("ready");
      });
      peer.on("connection", conn => this.attach(conn));
      peer.on("disconnected", () => { this.setStatus("reconnecting"); setTimeout(() => { try { peer.reconnect(); } catch {} }, 1500); });
      peer.on("error", err => {
        if (err.type === "unavailable-id" && tries < 4) { peer.destroy(); start(makeCode(), tries + 1); return; }
        if (["network", "server-error", "socket-error", "socket-closed", "browser-incompatible"].includes(err.type)) this.setStatus("unavailable");
      });
    };
    start(this.code, 0);
  }
  setStatus(s) { this.status = s; this.onStatus?.(s); }

  attach(conn) {
    conn.on("data", raw => {
      const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (msg.t === "hello") {
        const role = msg.role === "host" && msg.key === this.key ? "host" : "player";
        const old = this.conns.get(msg.pid);
        if (old && old.conn !== conn) { try { old.conn.close(); } catch {} }
        const team = msg.team === 1 ? 1 : msg.team === 0 ? 0 : (old?.team ?? null);   // returning phone keeps its team
        this.conns.set(msg.pid, { pid: msg.pid, conn, role, name: (msg.name || old?.name || "Player").slice(0, 14), team, open: true, seen: Date.now() });
        this.onPlayers?.(this.players);
        this.onMessage?.({ ...msg, role }, msg.pid);
        return;
      }
      const c = this.conns.get(msg.pid);
      if (!c) return;
      c.seen = Date.now();
      if (msg.t === "ping") return;
      if (msg.t === "team") { c.team = msg.team === 1 ? 1 : 0; this.onPlayers?.(this.players); }
      if (msg.t === "name") { c.name = String(msg.name || "Player").slice(0, 14); this.onPlayers?.(this.players); }
      this.onMessage?.({ ...msg, role: c.role }, msg.pid);
    });
    const drop = () => {   // connection closed: hold the seat (heartbeat removes it after the grace period)
      for (const c of this.conns.values()) if (c.conn === conn && c.open) { c.open = false; c.awaySince = Date.now(); }
      this.onPlayers?.(this.players);
    };
    conn.on("close", drop); conn.on("error", drop);
  }

  /** send each client its own view: viewFor(role, pid) -> object */
  broadcast(viewFor) {
    for (const c of this.conns.values()) {
      if (!c.open || !c.conn.open) continue;
      try { c.conn.send({ t: "state", ...viewFor(c.role, c.pid, c) }); } catch {}
    }
  }
  sendTo(pid, msg) { const c = this.conns.get(pid); try { c?.conn.open && c.conn.send(msg); } catch {} }
  kick(pid) { const c = this.conns.get(pid); try { c?.conn.close(); } catch {} this.conns.delete(pid); this.onPlayers?.(this.players); }
}

/* ---------------- PHONE (player or host remote) ---------------- */
export class Client {
  constructor({ code, role, key, onState, onStatus, onMessage }) {
    Object.assign(this, { code, role, key, onState, onStatus, onMessage });
    // one identity per browser tab: survives a refresh (reconnects as the same player), never shared between tabs
    this.pid = (() => { try { let p = sessionStorage.getItem("css-pid"); if (!p) { p = makeKey() + makeKey(); sessionStorage.setItem("css-pid", p); } return p; } catch { return makeKey() + makeKey(); } })();
    this.name = ""; this.team = null; this.conn = null; this.peer = null; this.retry = 0; this.lastHeard = Date.now();
    setInterval(() => {
      this.send({ t: "ping" });                                   // keeps our seat on the TV
      // TV pings every 3s: silence while "open" means the link died (phone slept, Wi-Fi switched)
      if (this.conn?.open && Date.now() - this.lastHeard > 9000) this.reconnectNow();
    }, 3000);
    const wake = () => { if (document.hidden) return; if (!this.conn?.open || Date.now() - this.lastHeard > 4000) this.reconnectNow(); };
    document.addEventListener("visibilitychange", wake);
    addEventListener("pageshow", wake);
    addEventListener("online", wake);
  }
  /* throw away the old link and join again as the same player (same pid, name, team) */
  reconnectNow() {
    clearTimeout(this._rt); clearTimeout(this._wd);
    try { this.conn?.close(); } catch {}
    try { this.peer?.destroy(); } catch {}
    this.conn = null; this.peer = null; this.retry = 0; this.lastHeard = Date.now();
    this.connect();
  }
  connect() {
    if (!peerLib()) { this.onStatus?.("unavailable"); return; }
    if (this.conn?.open) return;
    this.onStatus?.("connecting");
    // watchdog: a half-dead peer (TV refreshed, Wi-Fi blip) never fires "open", so start over cleanly
    clearTimeout(this._wd);
    this._wd = setTimeout(() => {
      if (this.conn?.open) return;
      try { this.conn?.close(); } catch {}
      try { this.peer?.destroy(); } catch {}
      this.peer = null; this.conn = null;
      this.scheduleRetry();
    }, 8000);
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) {
      try { this.peer?.destroy(); } catch {}
      this.peer = new (peerLib())(undefined, PEER_OPTS);
      this.peer.on("error", err => {
        if (err.type === "peer-unavailable") this.onStatus?.("noroom");
        else this.onStatus?.("lost");
        this.scheduleRetry();
      });
    }
    const peer = this.peer;
    const go = () => {
      if (peer !== this.peer) return;
      try { this.conn?.close(); } catch {}
      const conn = peer.connect(PREFIX + this.code, { reliable: true });
      this.conn = conn;
      conn.on("open", () => { if (conn !== this.conn) return; clearTimeout(this._wd); this.retry = 0; this.lastHeard = Date.now(); this.onStatus?.("connected"); this.hello(); });
      conn.on("data", raw => {
        this.lastHeard = Date.now();
        const m = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (m.t === "ping") return;
        if (m.t === "state") this.onState?.(m); else this.onMessage?.(m);
      });
      conn.on("close", () => { if (conn !== this.conn) return; this.onStatus?.("lost"); this.scheduleRetry(); });
    };
    if (peer.open) go(); else peer.once("open", go);
  }
  scheduleRetry() {
    clearTimeout(this._rt);
    this.retry = Math.min(this.retry + 1, 4);
    this._rt = setTimeout(() => { if (!this.conn?.open) this.connect(); }, 1000 * this.retry);
  }
  hello() { this.send({ t: "hello", role: this.role, key: this.key, name: this.name, team: this.team }); }
  send(msg) { try { if (this.conn?.open) { this.conn.send({ ...msg, pid: this.pid }); return true; } } catch {} return false; }
}

export function joinUrl(code, hostKey) {
  const base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
  return `${base}play.html?r=${code}${hostKey ? `&h=${hostKey}` : ""}`;
}
