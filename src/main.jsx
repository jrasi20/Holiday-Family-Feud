import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { CHALLENGE_BANK, FAST_MONEY_BANK, SURVEY_BANK, shuffle } from "./data";
import { createPresence, roomStatus, setPlayerPresence } from "./game-state";
import "./style.css";

const DIFFICULTIES = {
  Easy: { seconds: 30, strikes: 3, hint: "One host hint" },
  Classic: { seconds: 25, strikes: 3, hint: "No hints" },
  Expert: { seconds: 15, strikes: 2, hint: "Scripture reference only" }
};
const defaultTeams = [
  { name: "Team Bethlehem", players: ["Player 1","Player 2","Player 3","Player 4","Player 5"] },
  { name: "Team Nazareth", players: ["Player 1","Player 2","Player 3","Player 4","Player 5"] }
];

function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; } catch { return initial; }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

function useSound(enabled) {
  const ctxRef = useRef(null);
  return type => {
    if (navigator.vibrate) navigator.vibrate(type === "wrong" ? [90,50,90] : type === "buzz" ? 70 : 35);
    if (!enabled) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctxRef.current ||= new AudioCtx();
    const ctx = ctxRef.current, osc = ctx.createOscillator(), gain = ctx.createGain();
    const tones = { wrong: [120,85], buzz: [240,420], right: [520,900], win: [440,1040] };
    const [start,end] = tones[type] || tones.right;
    osc.type = type === "wrong" ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(start, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(end, ctx.currentTime + .22);
    gain.gain.setValueAtTime(.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .3);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .31);
  };
}

function Header({ title, sub, onHome, sound, setSound }) {
  return <header className="app-header">
    <button className="icon-btn" onClick={onHome} aria-label="Home">←</button>
    <div><span className="eyebrow">CHRISTMAS SURVEY SHOWDOWN</span><h1>{title}</h1></div>
    <span className="header-sub">{sub}</span>
    <button className="icon-btn" onClick={() => setSound(v => !v)} aria-label="Toggle sound">{sound ? "♪" : "×♪"}</button>
  </header>;
}

function TeamSetup({ teams, setTeams }) {
  const update = (team, field, value, player) => setTeams(old => old.map((t,i) => i !== team ? t : player === undefined ? {...t,[field]:value} : {...t,players:t.players.map((p,j)=>j===player?value:p)}));
  return <div className="team-setup">{teams.map((team, ti) => <section className={`setup-team team-${ti}`} key={ti}>
    <label>Team {ti + 1}<input value={team.name} onChange={e=>update(ti,"name",e.target.value)} /></label>
    <div className="player-grid">{team.players.map((p,pi)=><label key={pi}><span>{pi===0?"Captain":`Player ${pi+1}`}</span><input value={p} onChange={e=>update(ti,"players",e.target.value,pi)} /></label>)}</div>
  </section>)}</div>;
}

function Welcome({ teams, setTeams, onStart, sound, setSound }) {
  return <main className="welcome-screen">
    <div className="aurora"/><section className="hero-card">
      <span className="eyebrow">THE COMPLETE HOLIDAY PARTY GAME</span>
      <h1>Christmas Bible<br/><b>Survey Showdown</b></h1>
      <p>Scripture, Santa, traditions, hilarious surveys, buzzers, strikes, steals and Fast Money.</p>
      <TeamSetup {...{teams,setTeams}} />
      <button className="primary jumbo" onClick={onStart}>Enter game lobby</button>
      <button className="sound-link" onClick={()=>setSound(v=>!v)}>Sound effects: {sound?"On":"Off"}</button>
      <small>Original holiday entertainment game. Gameplay point values are not scientific survey results.</small>
    </section>
  </main>;
}

function Lobby({ settings, setSettings, onPlay, onChallenges, onFast, onHow, onRewards, onBack, teams, presence, setPresence }) {
  const set = (k,v) => setSettings(s=>({...s,[k]:v}));
  const status = roomStatus(presence, settings.mode);
  const checkIn = player => {
    const patch = !player.present ? {present:true,ready:false} : !player.ready ? {ready:true} : {present:false,ready:false};
    setPresence(current=>setPlayerPresence(current,player.id,patch));
  };
  return <main className="lobby">
    <header className="lobby-head"><button className="icon-btn" onClick={onBack}>←</button><div><span className="eyebrow">GAME LOBBY</span><h1>Ready for the lights?</h1></div><div className="team-pill">{teams[0].name} <b>VS</b> {teams[1].name}</div></header>
    <section className="mode-selector glossy-panel">
      <button className={`mode-choice ${settings.mode==="Solo"?"selected":""}`} onClick={()=>set("mode","Solo")}><i>1</i><span><b>Solo Spotlight</b><small>One player races the clock through the full show.</small></span></button>
      <button className={`mode-choice ${settings.mode==="Party"?"selected":""}`} onClick={()=>set("mode","Party")}><i>10</i><span><b>Party Room</b><small>Two teams of five. Every seat must check in and ready up.</small></span></button>
    </section>
    <section className="settings-card glossy-panel">
      <label>Difficulty<select value={settings.difficulty} onChange={e=>set("difficulty",e.target.value)}>{Object.keys(DIFFICULTIES).map(x=><option key={x}>{x}</option>)}</select><small>{DIFFICULTIES[settings.difficulty].seconds}s • {DIFFICULTIES[settings.difficulty].strikes} strikes • {DIFFICULTIES[settings.difficulty].hint}</small></label>
      <label>Question mix<select value={settings.mix} onChange={e=>set("mix",e.target.value)}><option>Mixed</option><option>Bible</option><option>Holiday</option></select><small>Every new game shuffles a fresh deck.</small></label>
      <label>Rounds<select value={settings.rounds} onChange={e=>set("rounds",Number(e.target.value))}><option value="6">6 rounds</option><option value="8">8 rounds</option><option value="12">12 rounds</option></select><small>Single, double, then triple points.</small></label>
    </section>
    <section className={`presence-room glossy-panel ${status.canStart?"room-ready":""}`}>
      <header><div><span className="eyebrow">{settings.mode==="Solo"?"SOLO CHECK-IN":"LIVE PARTY PRESENCE"}</span><h2>{status.canStart?"The room is ready!":"Waiting for the whole party"}</h2></div><strong>{status.ready}/{status.expected} READY</strong></header>
      <div className="presence-grid">{presence.map(player=><button key={player.id} className={`presence-seat team-${player.team} ${player.present?"present":""} ${player.ready?"ready":""}`} onClick={()=>checkIn(player)} disabled={settings.mode==="Solo"}>
        <span className="presence-light"/><b>{player.name}</b><small>{player.ready?"READY — LET'S PLAY":player.present?"HERE — TAP TO READY":"TAP TO CHECK IN"}</small>
      </button>)}</div>
      {settings.mode==="Party"&&<p>Start stays locked until all ten players are present and ready. Each player taps their own seat twice: <b>Here</b>, then <b>Ready</b>.</p>}
    </section>
    <section className="mode-cards">
      <button className="feature-card main-mode sparkle-button" disabled={!status.canStart} onClick={onPlay}><i>★</i><div><h2>{status.canStart?"Launch New Showdown":"Waiting for players"}</h2><p>{status.canStart?"Fresh shuffled boards • face-offs • play/pass • strikes • steals":`${status.expected-status.ready} player${status.expected-status.ready===1?"":"s"} still need to ready up`}</p></div><b>{status.canStart?"PLAY →":"LOCKED"}</b></button>
      <button className="feature-card" onClick={onChallenges}><i>?</i><div><h2>Challenge Arcade</h2><p>Prophecy, trivia, Who Said It? and timeline</p></div></button>
      <button className="feature-card" onClick={onFast}><i>⚡</i><div><h2>Fast Money</h2><p>Two players, five shuffled questions, 200-point target</p></div></button>
      <button className="feature-card" onClick={onRewards}><i>♛</i><div><h2>Rewards & Scores</h2><p>Wins, stars, streaks and saved achievements</p></div></button>
      <button className="feature-card" onClick={onHow}><i>i</i><div><h2>How to Play</h2><p>Complete host and player instructions</p></div></button>
    </section>
  </main>;
}

function makeDeck(settings) {
  const pool = settings.mix === "Mixed" ? SURVEY_BANK : SURVEY_BANK.filter(x=>x.category===settings.mix);
  const recent = JSON.parse(localStorage.getItem("showdown-recent") || "[]");
  const fresh = shuffle(pool.filter(x=>!recent.includes(x.id)));
  const used = shuffle(pool.filter(x=>recent.includes(x.id)));
  const deck = [...fresh,...used].slice(0,settings.rounds);
  localStorage.setItem("showdown-recent", JSON.stringify(deck.map(x=>x.id).slice(-18)));
  return deck;
}

function Scoreboard({ teams, scores, active, playerIndex }) {
  return <section className="scoreboard">{teams.map((t,i)=><article key={i} className={`score-team team-${i} ${active===i?"active":""}`}>
    <div><span>{t.name}</span><small>At buzzer: {t.players[playerIndex % 5]}</small></div><strong>{scores[i]}</strong>
  </article>)}</section>;
}

function SurveyGame({ teams, settings, onHome, sound, setSound, setRewards }) {
  const [deck] = useState(()=>makeDeck(settings));
  const [roundIndex,setRoundIndex]=useState(0), [scores,setScores]=useState([0,0]), [revealed,setRevealed]=useState([]);
  const isSolo=settings.mode==="Solo", limit=DIFFICULTIES[settings.difficulty].seconds, faceoffLimit=Math.min(10,limit);
  const [stage,setStage]=useState(isSolo?"briefing":"faceoff"), [buzzed,setBuzzed]=useState(null), [active,setActive]=useState(isSolo?0:null), [original,setOriginal]=useState(isSolo?0:null);
  const [strikes,setStrikes]=useState([0,0]), [seconds,setSeconds]=useState(isSolo?limit:faceoffLimit), [running,setRunning]=useState(!isSolo), [xFlash,setXFlash]=useState(0),[turnSlot,setTurnSlot]=useState(0),[notice,setNotice]=useState("");
  const soundFx=useSound(sound), round=deck[roundIndex], mult=roundIndex < 3 ? 1 : roundIndex < 6 ? 2 : 3;
  const bank=useMemo(()=>revealed.reduce((sum,i)=>sum+round.a[i][1]*mult,0),[revealed,round,mult]);
  useEffect(()=>{ if(!running||seconds<=0)return; const id=setTimeout(()=>setSeconds(s=>s-1),1000); return()=>clearTimeout(id); },[running,seconds]);
  useEffect(()=>{if(seconds!==0||!running)return;setRunning(false);soundFx("wrong");setXFlash(x=>x+1);if(stage==="play")strike(true);else if(stage==="steal"){setNotice("Steal clock expired — bank returns to the original team.");award(original)}else setNotice("Too slow! Reset the face-off clock and try again.");},[seconds,running]);
  const resetClock=(value=limit,start=true)=>{setSeconds(value);setRunning(start)};
  const nextTurn=()=>setTurnSlot(slot=>(slot+1)%5);
  const startSolo=()=>{setStage("play");setActive(0);setOriginal(0);setNotice("");resetClock(limit,true)};
  const buzz = i => { if(stage!=="faceoff"||buzzed!==null)return; setBuzzed(i);setActive(i);setOriginal(i);setRunning(false);setNotice(`${teams[i].players[roundIndex%5]} buzzed first — answer now!`);soundFx("buzz"); };
  const reveal = i => { if(revealed.includes(i))return;setRevealed(r=>[...r,i]);soundFx("right");if(stage==="play"){nextTurn();setNotice("Great answer — next player up!");resetClock(limit,true)} };
  const beginPlay = pass => { const owner=pass?1-buzzed:buzzed;setActive(owner);setOriginal(owner);setStage("play");setTurnSlot(roundIndex%5);setNotice("");resetClock(limit,true); };
  function strike(fromTimer=false) { if(active===null)return; const next=[...strikes];next[active]++;setStrikes(next);if(!fromTimer){setXFlash(x=>x+1);soundFx("wrong")}nextTurn(); if(next[active]>=DIFFICULTIES[settings.difficulty].strikes){setStage("steal");setActive(isSolo?0:1-active);setNotice(isSolo?"Final chance — find one answer before time runs out!":"Steal team: one answer, ten seconds!");resetClock(10,true)}else{setNotice(fromTimer?"Time expired — strike! Next player up.":"Not on the board — next player up!");resetClock(limit,true)} }
  const award = team => { setScores(s=>s.map((v,i)=>i===team?v+bank:v)); setStage("roundover");setRunning(false);soundFx("win"); };
  const next = () => { if(roundIndex===deck.length-1){const winner=scores[0]>=scores[1]?0:1;setRewards(r=>({...r,stars:r.stars+3,wins:r.wins.map((v,i)=>i===winner?v+1:v),lastScores:scores}));onHome();return;} setRoundIndex(i=>i+1);setRevealed([]);setStage(isSolo?"briefing":"faceoff");setBuzzed(null);setActive(isSolo?0:null);setOriginal(isSolo?0:null);setStrikes([0,0]);setTurnSlot(0);setNotice("");resetClock(isSolo?limit:faceoffLimit,!isSolo); };
  const currentPlayer=active===null?"Face-off players":teams[active].players[turnSlot%5];
  const prompt=notice||({briefing:`${teams[0].players[0]}, get ready. The clock starts when you press GO!`,faceoff:buzzed===null?`${teams[0].players[roundIndex%5]} and ${teams[1].players[roundIndex%5]} — hands on buzzers!`:"Host: reveal the face-off answer, then choose Play or Pass.",play:`${currentPlayer}, answer now — ${seconds} seconds!`,steal:`${currentPlayer}, this is the steal — one answer only!`,roundover:"Round complete — lock in the bank and move to the next face-off."})[stage];
  return <main className="game-shell">
    <Header title="Survey Showdown" sub={`Round ${roundIndex+1}/${deck.length} • ${mult}×`} {...{onHome,sound,setSound}}/>
    <Scoreboard {...{teams,scores,active}} playerIndex={turnSlot}/>
    <section className="prompt-ribbon" aria-live="assertive"><span className="prompt-beacon"/><b>{prompt}</b><strong className={seconds<=5?"urgent":""}>{running?seconds:"READY"}</strong></section>
    <section className="question-panel stage-lit"><span>{round.category} • {round.ref}</span><h2>{round.q}</h2></section>
    {stage==="briefing"&&<section className="launch-overlay"><span>SOLO SPOTLIGHT</span><h2>Your turn starts immediately</h2><p>Reveal correct answers before the clock expires. A timeout automatically adds a strike.</p><button className="primary sparkle-button" onClick={startSolo}>GO! START {limit}-SECOND CLOCK</button></section>}
    {stage==="faceoff" && <section className="buzzer-zone glossy-panel"><h3>{buzzed===null?"FACE-OFF — FIRST PLAYER TO BUZZ ANSWERS":"BUZZER LOCKED"}</h3><div>{teams.map((t,i)=><button key={i} disabled={buzzed!==null||seconds===0} className={`team-buzzer team-${i} ${buzzed===i?"winner":""}`} onClick={()=>buzz(i)}><span className="buzzer-halo"/><span className="buzzer-cap"><small>{t.players[roundIndex%5]}</small><b>{buzzed===i?"BUZZED!":"HIT BUZZER"}</b><em>{t.name}</em></span></button>)}</div>{buzzed!==null&&<aside><p>Host reveals the face-off answer. Higher answer chooses.</p><button className="sparkle-button" onClick={()=>beginPlay(false)}>PLAY</button><button className="sparkle-button" onClick={()=>beginPlay(true)}>PASS</button></aside>}</section>}
    <section className="survey-board">{round.a.map(([answer,points],i)=><button key={answer} onClick={()=>reveal(i)} className={`survey-answer ${revealed.includes(i)?"revealed":""}`}><b>{i+1}</b><span>{revealed.includes(i)?answer:"SURVEY SAYS..."}</span><strong>{revealed.includes(i)?points*mult:""}</strong></button>)}</section>
    <section className="host-dock"><div className="timer"><button onClick={()=>seconds===0?resetClock(stage==="faceoff"?faceoffLimit:limit,true):setRunning(v=>!v)}>{running?"PAUSE":seconds===0?"RESTART":"START"}</button><strong className={seconds<=5?"urgent":""}>{seconds}</strong><button onClick={()=>resetClock(stage==="faceoff"?faceoffLimit:limit,false)}>RESET</button></div><div className="round-bank"><small>ROUND BANK</small><strong>{bank}</strong></div><div className="strike-meter">{teams.slice(0,isSolo?1:2).map((t,i)=><span key={i}>{t.name}: {Array.from({length:DIFFICULTIES[settings.difficulty].strikes},(_,j)=><b key={j} className={j<strikes[i]?"on":""}>×</b>)}</span>)}</div>
      {(stage==="play"||stage==="steal")&&<button className="danger" onClick={strike}>NOT ON BOARD — STRIKE</button>}
      {stage==="play"&&<button className="award" onClick={()=>award(active)}>AWARD BANK TO {teams[active].name}</button>}
      {stage==="steal"&&<><span className="steal-call">{isSolo?"FINAL CHANCE":`STEAL CHANCE: ${teams[active].name}`}</span><button className="award" onClick={()=>award(active)}>SUCCESSFUL {isSolo?"SAVE":"STEAL"}</button>{!isSolo&&<button onClick={()=>award(original)}>MISSED STEAL</button>}</>}
      {stage==="roundover"&&<button className="primary" onClick={next}>{roundIndex===deck.length-1?"FINISH GAME":"NEXT FACE-OFF →"}</button>}
    </section>
    {xFlash>0&&<div key={xFlash} className="strike-flash"><span>×</span><span>×</span><span>×</span><b>STRIKE!</b></div>}
  </main>;
}

function ChallengeGame({ teams, onHome, sound, setSound, setRewards, settings }) {
  const limit=Math.min(20,DIFFICULTIES[settings.difficulty].seconds),[deck] = useState(()=>shuffle(CHALLENGE_BANK)); const [idx,setIdx]=useState(0),[active,setActive]=useState(0),[scores,setScores]=useState([0,0]),[picked,setPicked]=useState(null),[seconds,setSeconds]=useState(limit),[running,setRunning]=useState(true); const fx=useSound(sound),item=deck[idx];
  useEffect(()=>{if(!running||seconds<=0)return;const id=setTimeout(()=>setSeconds(s=>s-1),1000);return()=>clearTimeout(id)},[running,seconds]);
  useEffect(()=>{if(seconds===0&&running){setRunning(false);setPicked(-1);fx("wrong")}},[seconds,running]);
  const choose=i=>{if(picked!==null)return;setPicked(i);setRunning(false);if(i===item.answer){setScores(s=>s.map((v,j)=>j===active?v+10:v));fx("right")}else fx("wrong")};
  const next=()=>{if(idx===deck.length-1){setRewards(r=>({...r,stars:r.stars+2,lastScores:scores}));onHome()}else{setIdx(i=>i+1);setPicked(null);setActive(a=>1-a);setSeconds(limit);setRunning(true)}};
  return <main className="game-shell"><Header title="Challenge Arcade" sub={`${item.type} • ${idx+1}/${deck.length}`} {...{onHome,sound,setSound}}/><Scoreboard {...{teams,scores,active}} playerIndex={idx}/><section className="prompt-ribbon"><span className="prompt-beacon"/><b>{picked===null?`${teams[active].players[idx%5]}, choose now!`:picked===-1?"Time expired — no points this round.":"Answer locked — check the result!"}</b><strong className={seconds<=5?"urgent":""}>{seconds}</strong></section><section className="challenge-card glossy-panel"><span className="eyebrow">10 POINTS</span><h2>{item.q}</h2><div>{item.choices.map((c,i)=><button key={c} onClick={()=>choose(i)} className={`sparkle-button ${picked===null?"":i===item.answer?"correct":i===picked?"wrong":"dim"}`}><b>{String.fromCharCode(65+i)}</b>{c}</button>)}</div>{picked!==null&&<p>{item.note}</p>}<footer><button onClick={()=>setActive(a=>1-a)}>Answering: {teams[active].name}</button><button className="primary sparkle-button" disabled={picked===null} onClick={next}>NEXT →</button></footer></section></main>;
}

function FastMoney({ teams, onHome, sound, setSound, setRewards }) {
  const [deck] = useState(()=>shuffle(FAST_MONEY_BANK).slice(0,5)),[player,setPlayer]=useState(1),[idx,setIdx]=useState(0),[shown,setShown]=useState(false),[total,setTotal]=useState(0),[used,setUsed]=useState([]),[seconds,setSeconds]=useState(20),[running,setRunning]=useState(false); const fx=useSound(sound),item=deck[idx];
  useEffect(()=>{if(!running||seconds<=0)return;const id=setTimeout(()=>setSeconds(s=>s-1),1000);return()=>clearTimeout(id)},[running,seconds]);
  const add=(i,p)=>{if(used.includes(i))return;setUsed(v=>[...v,i]);setTotal(v=>v+p);fx("right")};
  useEffect(()=>{if(seconds===0&&running){setRunning(false);fx("wrong")}},[seconds,running]);
  const begin=()=>{setShown(true);setRunning(true)};
  const next=()=>{if(idx<4)setIdx(i=>i+1);else if(player===1){setPlayer(2);setIdx(0)}else{setRewards(r=>({...r,stars:r.stars+(total>=200?5:1),fastWins:r.fastWins+(total>=200?1:0),lastScores:[total,200]}));onHome();return}setShown(false);setUsed([]);setSeconds(idx===4&&player===1?25:player===2?25:20);setRunning(false)};
  return <main className="game-shell"><Header title="Fast Money" sub={`Player ${player} • Question ${idx+1}/5`} {...{onHome,sound,setSound}}/><section className="prompt-ribbon"><span className="prompt-beacon"/><b>{!shown?`${teams[0].players[player-1]}, get ready — your clock starts with the board!`:seconds===0?"Time! Lock the answer and move on.":`${teams[0].players[player-1]}, answer now!`}</b><strong className={seconds<=5?"urgent":""}>{seconds}</strong></section><section className="fast-top"><div><small>TARGET</small><b>200</b></div><div><small>TOTAL</small><b>{total}</b></div><div><small>TIMER</small><b>{seconds}</b><button onClick={()=>setRunning(v=>!v)} disabled={!shown||seconds===0}>{running?"Pause":"Resume"}</button></div></section><section className="challenge-card glossy-panel"><h2>{item.q}</h2>{!shown?<button className="primary jumbo sparkle-button" onClick={begin}>START CLOCK + SHOW BOARD</button>:<div className="fast-list">{item.a.map(([a,p],i)=><button className={`sparkle-button ${used.includes(i)?"used":""}`} key={a} onClick={()=>add(i,p)}><span>{a}</span><b>{p}</b></button>)}</div>}<footer><span>{teams[0].players[player-1]} is playing</span><button className="primary sparkle-button" onClick={next}>{player===2&&idx===4?"FINISH":"NEXT →"}</button></footer></section></main>;
}

function Rewards({ rewards, teams, onHome }) { return <main className="info-screen"><Header title="Rewards & Scores" sub="Saved on this device" onHome={onHome} sound={false} setSound={()=>{}}/><section className="reward-grid"><article><i>★</i><strong>{rewards.stars}</strong><span>Showdown Stars</span></article><article><i>♛</i><strong>{rewards.wins[0]}</strong><span>{teams[0].name} Wins</span></article><article><i>♛</i><strong>{rewards.wins[1]}</strong><span>{teams[1].name} Wins</span></article><article><i>⚡</i><strong>{rewards.fastWins}</strong><span>Fast Money Wins</span></article></section><section className="badge-rack"><h2>Achievement Badges</h2><div><span className={rewards.stars>=3?"earned":""}>First Star</span><span className={rewards.stars>=10?"earned":""}>Holiday Hero</span><span className={rewards.fastWins?"earned":""}>Fast Money 200</span><span className={rewards.wins[0]+rewards.wins[1]>=5?"earned":""}>Five-Time Champion</span></div></section></main> }

function HowTo({ onHome }) { return <main className="info-screen"><Header title="How to Play" sub="Host guide" onHome={onHome} sound={false} setSound={()=>{}}/><section className="how-grid">
  <article><b>1</b><h2>Choose your room</h2><p>Solo Spotlight is one player against the clock. Party Room uses two teams of five and stays locked until all ten seats are checked in and ready.</p></article>
  <article><b>2</b><h2>Face off</h2><p>The named player from each team hits their giant buzzer. The host taps their answer on the board. The higher revealed answer chooses PLAY or PASS.</p></article>
  <article><b>3</b><h2>Follow the spotlight</h2><p>The live prompt names the player who must act. Turn clocks start automatically. The host taps matching answers open; a timeout or NOT ON BOARD triggers the full-screen strike.</p></article>
  <article><b>4</b><h2>Strike and steal</h2><p>After the allowed strikes, the other team gets one answer. A match steals the whole bank; a miss awards the bank to the original team.</p></article>
  <article><b>5</b><h2>Score and win</h2><p>Early rounds are single points, middle rounds double, and final rounds triple. Highest total wins. Saved stars and wins appear under Rewards.</p></article>
  <article><b>6</b><h2>Fast Money</h2><p>Two teammates answer five shuffled questions separately. Player 1 gets 20 seconds, Player 2 gets 25. Score 200 combined points to win.</p></article>
  <article><b>Tip</b><h2>Best screen setup</h2><p>Cast the host device to a TV, or place a tablet between teams. Phones work in portrait and landscape. Add the app to the home screen for a full-screen feel.</p></article>
  </section></main> }

function App() {
  const [screen,setScreen]=useState("welcome"),[teams,setTeams]=useStored("showdown-teams",defaultTeams),[sound,setSound]=useStored("showdown-sound",true),[settings,setSettings]=useStored("showdown-settings",{mode:"Party",difficulty:"Classic",mix:"Mixed",rounds:8}),[rewards,setRewards]=useStored("showdown-rewards",{stars:0,wins:[0,0],fastWins:0,lastScores:[0,0]});
  const mode=settings.mode||"Party",[presence,setPresence]=useState(()=>createPresence(teams,mode));
  useEffect(()=>{if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js")},[]);
  useEffect(()=>{window.scrollTo({top:0,left:0,behavior:"auto"});},[screen]);
  useEffect(()=>{if(!settings.mode)setSettings(s=>({...s,mode:"Party"}));},[settings.mode,setSettings]);
  useEffect(()=>{setPresence(createPresence(teams,mode));},[teams,mode]);
  if(screen==="welcome")return <Welcome {...{teams,setTeams,sound,setSound}} onStart={()=>setScreen("lobby")}/>;
  if(screen==="lobby")return <Lobby {...{teams,settings,setSettings,presence,setPresence}} onPlay={()=>setScreen("survey")} onChallenges={()=>setScreen("challenge")} onFast={()=>setScreen("fast")} onRewards={()=>setScreen("rewards")} onHow={()=>setScreen("how")} onBack={()=>setScreen("welcome")}/>;
  const common={teams,onHome:()=>setScreen("lobby"),sound,setSound,setRewards,settings};
  if(screen==="survey")return <SurveyGame {...common} settings={settings}/>;
  if(screen==="challenge")return <ChallengeGame {...common}/>;
  if(screen==="fast")return <FastMoney {...common}/>;
  if(screen==="rewards")return <Rewards {...{rewards,teams}} onHome={()=>setScreen("lobby")}/>;
  return <HowTo onHome={()=>setScreen("lobby")}/>;
}

createRoot(document.getElementById("root")).render(<App/>);
