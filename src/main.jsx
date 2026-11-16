import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BIBLE_ROUNDS, HOLIDAY_ROUNDS, FAST_MONEY, WHO_SAID_IT, TRIVIA, WHICH_FIRST } from "./data";
import "./style.css";

const MODES = [
  ["bible","Bible Survey Showdown","10 Scripture-rooted answer boards","✦"],
  ["holiday","Holiday Hilarity","8 laugh-out-loud family survey rounds","☃"],
  ["fast","Fast Money","5 rapid-fire questions. Race to 200.","⚡"],
  ["said","Who Said It?","Match the paraphrased line to the speaker","❝"],
  ["trivia","Nativity Trivia","Details, surprises, and tradition traps","?"],
  ["first","Which Came First?","Put the Christmas story in order","⇄"]
];

const freshScores = names => ({scores:[0,0],names,active:0});

function useFeedback(sound) {
  const audio = useRef(null);
  return type => {
    if (navigator.vibrate) navigator.vibrate(type === "wrong" ? [110,60,110] : 45);
    if (!sound) return;
    const Ctx = window.AudioContext || window.webkitAudioContext; audio.current ||= new Ctx();
    const ctx=audio.current, osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.type=type==="wrong"?"sawtooth":"sine"; osc.frequency.setValueAtTime(type==="wrong"?145:520,ctx.currentTime);
    if(type!=="wrong") osc.frequency.exponentialRampToValueAtTime(880,ctx.currentTime+.15);
    gain.gain.setValueAtTime(.15,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.25);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+.26);
  };
}

function ScoreRow({team,setTeam}) {
  return <section className="score-row">{[0,1].map(i=><article className={`team ${team.active===i?"active":""}`} key={i} onClick={()=>setTeam(t=>({...t,active:i}))}>
    <div><span>TEAM {i+1}</span><h2>{team.names[i]}</h2></div><strong>{team.scores[i]}</strong>
  </article>)}</section>;
}

function ShellHeader({title,subtitle,onMenu,sound,setSound}) {
  return <header><div><span className="eyebrow">CHRISTMAS BIBLE GAME NIGHT</span><h1>{title}</h1></div><div className="round-chip">{subtitle}</div><div className="top-actions"><button onClick={()=>setSound(v=>!v)}>{sound?"♪":"×♪"}</button><button onClick={onMenu}>⌂</button></div></header>;
}

function SurveyMode({rounds,title,names,onMenu,sound,setSound}) {
  const [team,setTeam]=useState(()=>freshScores(names)); const [idx,setIdx]=useState(0); const [revealed,setRevealed]=useState([]); const [strikes,setStrikes]=useState([0,0]); const [seconds,setSeconds]=useState(30); const [running,setRunning]=useState(false); const buzz=useFeedback(sound); const round=rounds[idx];
  const bank=useMemo(()=>round.a.reduce((s,[,p],i)=>s+(revealed.includes(i)?p*round.mult:0),0),[round,revealed]);
  useEffect(()=>{if(!running||seconds<=0)return;const id=setTimeout(()=>setSeconds(s=>s-1),1000);return()=>clearTimeout(id)},[running,seconds]);
  useEffect(()=>{if(seconds===0){setRunning(false);buzz("wrong")}},[seconds]);
  const change=n=>{setIdx(n);setRevealed([]);setStrikes([0,0]);setSeconds(30);setRunning(false)};
  const award=i=>{setTeam(t=>{const scores=[...t.scores];scores[i]+=bank;return{...t,scores}});setRevealed(round.a.map((_,i)=>i));buzz("right")};
  return <main className="game-shell"><ShellHeader title={title} subtitle={`Round ${idx+1} / ${rounds.length}`} {...{onMenu,sound,setSound}}/><ScoreRow {...{team,setTeam}}/>
    <section className="board-wrap"><div className="question"><span>{idx+1}</span><h2>{round.q}</h2><small>{round.ref} · {round.mult}x points</small></div><div className="answers">{round.a.map(([a,p],i)=><button className={`answer ${revealed.includes(i)?"revealed":""}`} key={a} onClick={()=>{if(!revealed.includes(i)){setRevealed(v=>[...v,i]);buzz("right")}}}><b>{i+1}</b><span>{revealed.includes(i)?a:"TAP TO REVEAL"}</span><strong>{revealed.includes(i)?p*round.mult:""}</strong></button>)}</div></section>
    <section className="control-dock"><div className="timer"><button onClick={()=>{setSeconds(30);setRunning(false)}}>↺</button><strong className={seconds<=5?"urgent":""}>{seconds}</strong><button onClick={()=>setRunning(v=>!v)}>{running?"Pause":"Start"}</button></div><div className="bank"><span>ROUND BANK</span><strong>{bank}</strong></div><div className="host-controls"><button className="strike-btn" onClick={()=>{const s=[...strikes];s[team.active]=Math.min(3,s[team.active]+1);setStrikes(s);buzz("wrong")}}>× Strike ({strikes[team.active]})</button><button onClick={()=>award(0)}>Award {team.names[0]}</button><button onClick={()=>award(1)}>Award {team.names[1]}</button></div></section>
    <nav><button disabled={!idx} onClick={()=>change(idx-1)}>← Previous</button><span>{idx+1} / {rounds.length}</span><button disabled={idx===rounds.length-1} onClick={()=>change(idx+1)}>Next round →</button></nav></main>;
}

function QuizMode({items,title,names,onMenu,sound,setSound}) {
  const [team,setTeam]=useState(()=>freshScores(names)); const [idx,setIdx]=useState(0); const [picked,setPicked]=useState(null); const buzz=useFeedback(sound); const item=items[idx];
  const choose=i=>{if(picked!==null)return;setPicked(i);if(i===item.answer){setTeam(t=>{const scores=[...t.scores];scores[t.active]+=10;return{...t,scores}});buzz("right")}else buzz("wrong")};
  const move=n=>{setIdx(n);setPicked(null)};
  return <main className="game-shell quiz-shell"><ShellHeader title={title} subtitle={`Question ${idx+1} / ${items.length}`} {...{onMenu,sound,setSound}}/><ScoreRow {...{team,setTeam}}/><section className="quiz-card"><span className="eyebrow">10 POINTS</span><h2>{item.q}</h2><div className="choice-grid">{item.choices.map((c,i)=><button key={c} onClick={()=>choose(i)} className={picked===null?"":i===item.answer?"correct":i===picked?"wrong":"dim"}><b>{String.fromCharCode(65+i)}</b>{c}</button>)}</div>{picked!==null&&<p className="explain">{item.note}</p>}</section><nav><button disabled={!idx} onClick={()=>move(idx-1)}>← Previous</button><span>Tap a team before answering</span><button disabled={idx===items.length-1} onClick={()=>move(idx+1)}>Next →</button></nav></main>;
}

function FastMoney({names,onMenu,sound,setSound}) {
  const [player,setPlayer]=useState(1),[idx,setIdx]=useState(0),[revealed,setRevealed]=useState(false),[used,setUsed]=useState([]),[total,setTotal]=useState(0),[seconds,setSeconds]=useState(20),[running,setRunning]=useState(false); const buzz=useFeedback(sound), item=FAST_MONEY[idx];
  useEffect(()=>{if(!running||seconds<=0)return;const id=setTimeout(()=>setSeconds(s=>s-1),1000);return()=>clearTimeout(id)},[running,seconds]);
  const add=(i,p)=>{if(used.includes(i))return;setUsed(v=>[...v,i]);setTotal(v=>v+p);buzz("right")};
  const next=()=>{if(idx<4){setIdx(idx+1)}else if(player===1){setPlayer(2);setIdx(0)};setRevealed(false);setUsed([]);setSeconds(20);setRunning(false)};
  return <main className="game-shell fast-shell"><ShellHeader title="Fast Money" subtitle={`Player ${player} · ${idx+1}/5`} {...{onMenu,sound,setSound}}/><section className="fast-score"><div><span>TARGET</span><strong>200</strong></div><div><span>TOTAL</span><strong>{total}</strong></div><div><span>TIMER</span><strong className={seconds<=5?"urgent":""}>{seconds}</strong><button onClick={()=>setRunning(v=>!v)}>{running?"Pause":"Start"}</button></div></section><section className="quiz-card"><span className="eyebrow">PLAYER {player} · QUESTION {idx+1}</span><h2>{item.q}</h2>{!revealed?<button className="primary reveal-all" onClick={()=>setRevealed(true)}>Show answer board</button>:<div className="fast-answers">{item.a.map(([a,p],i)=><button className={used.includes(i)?"used":""} key={a} onClick={()=>add(i,p)}><span>{a}</span><strong>{p}</strong></button>)}</div>}</section><nav><button onClick={()=>{setSeconds(20);setRunning(false)}}>Reset timer</button><span>{total>=200?"YOU WON!":"Tap the matching answer to score"}</span><button onClick={next}>{player===2&&idx===4?"Finish":"Next →"}</button></nav></main>;
}

function App(){
  const [screen,setScreen]=useState("welcome"),[mode,setMode]=useState(null),[sound,setSound]=useState(true),[names,setNames]=useState(["Team Bethlehem","Team Nazareth"]),[installEvent,setInstallEvent]=useState(null);
  useEffect(()=>{const h=e=>{e.preventDefault();setInstallEvent(e)};window.addEventListener("beforeinstallprompt",h);if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js");return()=>window.removeEventListener("beforeinstallprompt",h)},[]);
  if(screen==="welcome")return <main className="splash"><div className="splash-art"/><section className="welcome glass"><span className="eyebrow">THE COMPLETE HOLIDAY GAME NIGHT</span><h1>Christmas Bible<br/><b>Survey Showdown</b></h1><p>Bible boards, Fast Money, trivia, timeline challenges, and hilarious family holiday rounds.</p><div className="team-inputs">{[0,1].map(i=><label key={i}>Team {i+1}<input value={names[i]} onChange={e=>{const n=[...names];n[i]=e.target.value;setNames(n)}}/></label>)}</div><button className="primary" onClick={()=>setScreen("menu")}>Choose a game</button><div className="welcome-actions">{installEvent&&<button onClick={async()=>{await installEvent.prompt();setInstallEvent(null)}}>Install app</button>}<button onClick={()=>setSound(v=>!v)}>{sound?"Sound on":"Sound off"}</button></div><small>Original entertainment product. Survey points are gameplay values, not scientific results.</small></section></main>;
  if(screen==="menu")return <main className="mode-menu"><header><div><span className="eyebrow">CHOOSE YOUR GAME</span><h1>Tonight's Lineup</h1></div><div className="top-actions"><button onClick={()=>setScreen("welcome")}>←</button></div></header><section className="mode-grid">{MODES.map(([id,t,d,icon])=><button key={id} onClick={()=>{setMode(id);setScreen("play")}}><i>{icon}</i><div><h2>{t}</h2><p>{d}</p></div><b>PLAY →</b></button>)}</section><p className="menu-note">Bible modes use paraphrases and references from Matthew 1-2 and Luke 1-2. Holiday Hilarity is clearly marked as party fun, not Bible fact.</p></main>;
  const common={names,onMenu:()=>setScreen("menu"),sound,setSound};
  if(mode==="bible")return <SurveyMode rounds={BIBLE_ROUNDS} title="Bible Survey Showdown" {...common}/>;
  if(mode==="holiday")return <SurveyMode rounds={HOLIDAY_ROUNDS} title="Holiday Hilarity" {...common}/>;
  if(mode==="fast")return <FastMoney {...common}/>;
  if(mode==="said")return <QuizMode items={WHO_SAID_IT} title="Who Said It?" {...common}/>;
  if(mode==="trivia")return <QuizMode items={TRIVIA} title="Nativity Trivia" {...common}/>;
  return <QuizMode items={WHICH_FIRST} title="Which Came First?" {...common}/>;
}

createRoot(document.getElementById("root")).render(<App/>);
