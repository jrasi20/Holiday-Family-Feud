import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const ROUNDS = [
  { q: "Name someone who received an angelic message connected to Jesus' birth.", ref: "Matthew 1-2; Luke 1-2", mult: 1, a: [["Mary",30],["Joseph",24],["Shepherds",20],["Zechariah",16],["Magi (in a dream)",10]] },
  { q: "Name a gift the Magi brought to Jesus.", ref: "Matthew 2:11", mult: 1, a: [["Gold",40],["Frankincense",32],["Myrrh",28]] },
  { q: "Name a place in the biblical Christmas story.", ref: "Matthew 1-2; Luke 1-2", mult: 1, a: [["Bethlehem",30],["Nazareth",22],["Jerusalem",18],["The fields",12],["Egypt",10],["The manger",8]] },
  { q: "Name a person or group seen in a Nativity scene.", ref: "Matthew 1-2; Luke 1-2", mult: 1, a: [["Jesus",24],["Mary",20],["Joseph",18],["Shepherds",14],["Magi",12],["Angels",8],["Animals",4]] },
  { q: "Name something the angels do or say in the birth story.", ref: "Luke 1-2", mult: 2, a: [["Praise God",28],["Say 'Do not be afraid'",24],["Announce good news",20],["Tell where to find Jesus",16],["Declare peace",12]] },
  { q: "Name a title or name given to Jesus in the birth accounts.", ref: "Matthew 1; Luke 1-2", mult: 2, a: [["Jesus",24],["Savior",20],["Christ / Messiah",18],["Immanuel",16],["Lord",12],["Son of the Most High",10]] },
  { q: "Name an animal commonly pictured at the Nativity but not named in the birth texts.", ref: "Tradition check: Matthew 1-2; Luke 1-2", mult: 2, a: [["Donkey",30],["Sheep",26],["Camel",22],["Ox / cattle",14],["Dove",8]] },
  { q: "Name a reason someone traveled in the Christmas story.", ref: "Matthew 2; Luke 2", mult: 2, a: [["To register for the census",28],["To worship Jesus",24],["To escape Herod",20],["To return home",16],["To follow the star",12]] },
  { q: "Name a heavenly sign or message in the Christmas story.", ref: "Matthew 1-2; Luke 1-2", mult: 3, a: [["The star",34],["An angel",30],["The glory of the Lord",20],["A dream",16]] },
  { q: "Name a faith-centered Christmas tradition families enjoy.", ref: "Celebration round", mult: 3, a: [["Read the Nativity story",24],["Attend a church service",20],["Pray together",16],["Sing Christmas hymns",14],["Give to others",12],["Display a Nativity",8],["Share a special meal",6]] },
  { q: "Name something kids might do during a church Christmas program.", ref: "Joy Break - holiday fun, not a Bible fact round", mult: 1, bonus: true, a: [["Wave at their family",24],["Forget a line",20],["Sing extra loud",18],["Fidget with the costume",16],["Stand in the wrong spot",12],["Start giggling",10]] },
  { q: "Name something that disappears first at a church Christmas potluck.", ref: "Joy Break - holiday fun, not a Bible fact round", mult: 1, bonus: true, a: [["Christmas cookies",26],["Warm rolls",20],["Mac and cheese",18],["Pie",14],["Hot cocoa",12],["The mystery casserole",10]] }
];

const fresh = () => ({ round: 0, revealed: [], scores: [0,0], names: ["Team Bethlehem","Team Nazareth"], active: 0, strikes: [0,0], seconds: 30, running: false });
const load = () => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem("bible-showdown") || "{}") }; } catch { return fresh(); } };

function App() {
  const [game, setGame] = useState(load);
  const [started, setStarted] = useState(false);
  const [sound, setSound] = useState(true);
  const [installEvent, setInstallEvent] = useState(null);
  const audio = useRef(null);
  const round = ROUNDS[game.round];
  const bank = useMemo(() => round.a.reduce((sum, [_, points], i) => sum + (game.revealed.includes(i) ? points * round.mult : 0), 0), [round, game.revealed]);

  useEffect(() => localStorage.setItem("bible-showdown", JSON.stringify(game)), [game]);
  useEffect(() => {
    const onInstall = event => { event.preventDefault(); setInstallEvent(event); };
    window.addEventListener("beforeinstallprompt", onInstall);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);
  useEffect(() => {
    if (!game.running || game.seconds <= 0) return;
    const id = setTimeout(() => setGame(g => ({ ...g, seconds: g.seconds - 1, running: g.seconds > 1 })), 1000);
    return () => clearTimeout(id);
  }, [game.running, game.seconds]);
  useEffect(() => { if (game.seconds === 0) buzz("strike"); }, [game.seconds]);

  function buzz(type = "reveal") {
    if (navigator.vibrate) navigator.vibrate(type === "strike" ? [120,70,120] : 45);
    if (!sound) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio.current ||= new Ctx();
    const ctx = audio.current, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type === "strike" ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(type === "strike" ? 145 : 520, ctx.currentTime);
    if (type !== "strike") osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + .15);
    gain.gain.setValueAtTime(.16, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .25);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .26);
  }
  const update = patch => setGame(g => ({ ...g, ...patch }));
  const reveal = i => { if (game.revealed.includes(i)) return; update({ revealed: [...game.revealed, i] }); buzz(); };
  const strike = team => { const strikes = [...game.strikes]; strikes[team] = Math.min(3, strikes[team] + 1); update({ strikes }); buzz("strike"); };
  const award = team => { const scores = [...game.scores]; scores[team] += bank; update({ scores, revealed: round.a.map((_,i)=>i), running:false }); buzz(); };
  const moveRound = step => update({ round: Math.max(0, Math.min(ROUNDS.length - 1, game.round + step)), revealed: [], strikes:[0,0], seconds:30, running:false });
  const reset = () => { if (confirm("Start a brand-new game?")) { setGame(fresh()); setStarted(false); } };

  if (!started) return <main className="splash">
    <div className="splash-art" aria-hidden="true" />
    <section className="welcome glass">
      <span className="eyebrow">A HOST-LED PARTY GAME</span>
      <h1>Christmas Bible<br/><b>Survey Showdown</b></h1>
      <p>Ten Bible rounds, two hilarious Joy Breaks, two teams, one unforgettable night.</p>
      <div className="team-inputs">
        {[0,1].map(i => <label key={i}>Team {i+1}<input value={game.names[i]} onChange={e => { const names=[...game.names]; names[i]=e.target.value; update({names}); }} /></label>)}
      </div>
      <button className="primary" onClick={() => { setStarted(true); document.documentElement.requestFullscreen?.().catch(()=>{}); }}>Start the showdown</button>
      <div className="welcome-actions">
        {installEvent && <button onClick={async()=>{ await installEvent.prompt(); setInstallEvent(null); }}>Install app</button>}
        <button onClick={()=>setSound(v=>!v)}>{sound ? "Sound on" : "Sound off"}</button>
      </div>
      <small>Original game values - not results of a scientific survey.</small>
    </section>
  </main>;

  return <main className="game-shell">
    <header>
      <div><span className="eyebrow">CHRISTMAS BIBLE</span><h1>Survey Showdown</h1></div>
      <div className="round-chip">{round.bonus ? "Joy Break" : `Round ${game.round + 1}`}<small>{round.bonus ? "bonus holiday fun" : round.mult > 1 ? `${round.mult}x points` : "single points"}</small></div>
      <div className="top-actions"><button aria-label="Toggle sound" onClick={()=>setSound(v=>!v)}>{sound ? "♪" : "×♪"}</button><button onClick={reset}>↻</button></div>
    </header>

    <section className="score-row">
      {[0,1].map(i => <article className={`team ${game.active===i?"active":""}`} key={i} onClick={()=>update({active:i})}>
        <div><span>TEAM {i+1}</span><h2>{game.names[i]}</h2></div><strong>{game.scores[i]}</strong>
        <div className="strikes" aria-label={`${game.strikes[i]} strikes`}>{[0,1,2].map(x=><i className={x<game.strikes[i]?"on":""} key={x}>×</i>)}</div>
      </article>)}
    </section>

    <section className="board-wrap">
      <div className="question"><span>{game.round+1}</span><h2>{round.q}</h2><small>{round.ref}</small></div>
      <div className="answers">
        {round.a.map(([answer, points], i) => <button key={answer} className={`answer ${game.revealed.includes(i)?"revealed":""}`} onClick={()=>reveal(i)}>
          <b>{i+1}</b><span>{game.revealed.includes(i)?answer:"TAP TO REVEAL"}</span><strong>{game.revealed.includes(i)?points*round.mult:""}</strong>
        </button>)}
      </div>
    </section>

    <section className="control-dock">
      <div className="timer"><button onClick={()=>update({seconds:30,running:false})}>↺</button><strong className={game.seconds<=5?"urgent":""}>{game.seconds}</strong><button onClick={()=>update({running:!game.running})}>{game.running?"Pause":"Start"}</button></div>
      <div className="bank"><span>ROUND BANK</span><strong>{bank}</strong></div>
      <div className="host-controls">
        <button className="strike-btn" onClick={()=>strike(game.active)}>× Strike</button>
        <button onClick={()=>award(0)}>Award {game.names[0]}</button>
        <button onClick={()=>award(1)}>Award {game.names[1]}</button>
      </div>
    </section>

    <nav><button disabled={game.round===0} onClick={()=>moveRound(-1)}>← Previous</button><span>{game.round+1} / {ROUNDS.length}</span><button disabled={game.round===ROUNDS.length-1} onClick={()=>moveRound(1)}>Next round →</button></nav>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
