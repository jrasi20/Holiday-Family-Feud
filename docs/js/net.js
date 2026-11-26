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
    // heartbeat: WebRTC can take 30s to notice a vanished phone; phones ping every 3s, silence > 9s = gone
    setInterval(() => {
      const now = Date.now(); let changed = false;
      for (const [pid, c] of this.conns) if (now - (c.seen || 0) > 9000) { try { c.conn.close(); } catch {} this.conns.delete(pid); changed = true; }
      if (changed) this.onPlayers?.(this.players);
    }, 2000);
  }
  get players() { return [...this.conns.values()].filter(c => c.role === "player" && c.open).map(({ pid, name, team }) => ({ pid, name, team })); }
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
        this.conns.set(msg.pid, { pid: msg.pid, conn, role, name: (msg.name || "Player").slice(0, 14), team: msg.team === 1 ? 1 : msg.team === 0 ? 0 : null, open: true, seen: Date.now() });
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
    const drop = () => {
      for (const [pid, c] of this.conns) if (c.conn === conn) { c.open = false; this.conns.delete(pid); }
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
    this.name = ""; this.team = null; this.conn = null; this.peer = null; this.retry = 0;
    setInterval(() => this.send({ t: "ping" }), 3000);   // keeps our seat on the TV
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
      conn.on("open", () => { if (conn !== this.conn) return; clearTimeout(this._wd); this.retry = 0; this.onStatus?.("connected"); this.hello(); });
      conn.on("data", raw => { const m = typeof raw === "string" ? JSON.parse(raw) : raw; if (m.t === "state") this.onState?.(m); else this.onMessage?.(m); });
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
