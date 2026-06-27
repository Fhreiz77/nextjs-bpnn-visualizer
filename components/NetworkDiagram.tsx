"use client";
// @ts-nocheck
import { useState, useMemo, useEffect, useRef } from "react";

import { r6, runTraining as engineRunTraining, applyNimFactor } from "@/lib/engine";
import { DEFAULT_CONFIG, INITIAL_WEIGHTS_RAW, TRAINING_DATA_RAW } from "@/lib/constants";

function runTraining(nimFactor = 0.3855, MaxEpoch = 1000) {
  return engineRunTraining({ ...DEFAULT_CONFIG, nimFactor, maxEpoch });
}

// ─── LAYOUT — viewBox coordinates ────────────────────────────
const VW = 600, VH = 400, NODE_R = 22;
const NODES = {
  input:  [{ x:90, y:140 }, { x:90, y:250 }],
  biasH:  { x:90, y:350 },
  hidden: [{ x:300, y:70 }, { x:300, y:170 }, { x:300, y:270 }, { x:300, y:360 }],
  biasO:  { x:300, y:380 },
  output: [{ x:500, y:200 }],
};

function weightToColor(w, maxAbs) {
  const t=Math.min(1,Math.abs(w)/(maxAbs||1));
  return w>=0?`rgba(124,111,205,${0.15+t*0.75})`:`rgba(248,113,113,${0.15+t*0.75})`;
}
function weightToWidth(w, maxAbs) { return 0.5+Math.min(1,Math.abs(w)/(maxAbs||1))*3; }
function activationColor(val) {
  if(val===null||val===undefined) return "#1A2235";
  const t=Math.max(0,Math.min(1,val));
  return `rgb(${Math.round(15+t*(124-15))},${Math.round(25+t*(111-25))},${Math.round(35+t*(205-35))})`;
}
const fmt6 = (n) => (n===null||n===undefined)?"—":r6(n).toFixed(6);
const fmtW = (n) => (n===null||n===undefined)?"—":(n>=0?"+":"")+r6(n).toFixed(4);

function Edge({ x1,y1,x2,y2,weight,maxAbs,hovered,onClick }) {
  const color=weightToColor(weight,maxAbs),width=weightToWidth(weight,maxAbs),isNeg=weight<0;
  const mx=(x1+x2)/2,my=(y1+y2)/2;
  return (
    <g onClick={onClick} style={{cursor:"pointer"}}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={hovered?(isNeg?"#F87171":"#A78BFA"):color} strokeWidth={hovered?width+1.5:width} style={{transition:"stroke 0.15s, stroke-width 0.15s"}} />
      {hovered&&(
        <g>
          <rect x={mx-28} y={my-10} width={56} height={18} rx={4} fill="#1A2235" stroke={isNeg?"#F87171":"#7C6FCD"} strokeWidth={1}/>
          <text x={mx} y={my+4} textAnchor="middle" fill={isNeg?"#F87171":"#A78BFA"} fontSize={9} fontFamily="monospace">{fmtW(weight)}</text>
        </g>
      )}
    </g>
  );
}

function Neuron({ x,y,label,sublabel,activation,hovered,onClick }) {
  const fill=activationColor(activation),stroke=hovered?"#A78BFA":(activation!==null?"#7C6FCD66":"#2D3748");
  return (
    <g onClick={onClick} style={{cursor:"pointer"}}>
      <circle cx={x} cy={y} r={NODE_R+(hovered?2:0)} fill={fill} stroke={stroke} strokeWidth={hovered?2:1.5} style={{transition:"all 0.15s"}}/>
      <text x={x} y={y-4} textAnchor="middle" fill={activation!==null?"#E2E8F0":"#64748B"} fontSize={9} fontFamily="monospace" fontWeight="bold">{label}</text>
      {sublabel&&<text x={x} y={y+8} textAnchor="middle" fill={activation!==null?"#A78BFA":"#475569"} fontSize={8} fontFamily="monospace">{sublabel}</text>}
    </g>
  );
}

function NetworkSVG({ weights, activations, hoveredEdge, setHoveredEdge, hoveredNode, setHoveredNode, showWeights }) {
  if(!weights) return (
    <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{maxHeight:"100%"}}>
      <text x={VW/2} y={VH/2} textAnchor="middle" fill="#374151" fontSize={14}>Jalankan training untuk melihat jaringan</text>
    </svg>
  );
  const {v,v0,w,w0}=weights;
  const allW=[...v.flat(),...v0,...w,w0];
  const maxAbs=Math.max(...allW.map(Math.abs));
  const inp=NODES.input,hid=NODES.hidden,out=NODES.output,biasH=NODES.biasH,biasO=NODES.biasO;
  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{maxHeight:"100%",display:"block"}}>
      {[[90,18,"INPUT"],[300,18,"HIDDEN"],[500,18,"OUTPUT"]].map(([x,y,lbl])=>(
        <text key={lbl} x={x} y={y} textAnchor="middle" fill="#374151" fontSize={10} letterSpacing={2} fontFamily="sans-serif" fontWeight="bold">{lbl}</text>
      ))}
      {inp.map((src,i)=>hid.map((dst,j)=>{const key=`v${i}${j}`;return(<Edge key={key} x1={src.x+NODE_R} y1={src.y} x2={dst.x-NODE_R} y2={dst.y} weight={v[i][j]} maxAbs={maxAbs} hovered={hoveredEdge===key} onClick={()=>setHoveredEdge(hoveredEdge===key?null:key)}/>);}))}
      {hid.map((dst,j)=>{const key=`v0${j}`;return(<Edge key={key} x1={biasH.x+NODE_R} y1={biasH.y} x2={dst.x-NODE_R} y2={dst.y} weight={v0[j]} maxAbs={maxAbs} hovered={hoveredEdge===key} onClick={()=>setHoveredEdge(hoveredEdge===key?null:key)}/>);})}
      {hid.map((src,j)=>{const key=`w${j}`;return(<Edge key={key} x1={src.x+NODE_R} y1={src.y} x2={out[0].x-NODE_R} y2={out[0].y} weight={w[j]} maxAbs={maxAbs} hovered={hoveredEdge===key} onClick={()=>setHoveredEdge(hoveredEdge===key?null:key)}/>);})}
      {(()=>{const key="w0";return(<Edge key={key} x1={biasO.x+NODE_R} y1={biasO.y} x2={out[0].x-NODE_R} y2={out[0].y} weight={w0} maxAbs={maxAbs} hovered={hoveredEdge===key} onClick={()=>setHoveredEdge(hoveredEdge===key?null:key)}/>);})()}
      <Neuron x={biasH.x} y={biasH.y} label="1" sublabel="bias" activation={1} hovered={hoveredNode==="biasH"} onClick={()=>setHoveredNode(hoveredNode==="biasH"?null:"biasH")}/>
      <Neuron x={biasO.x} y={biasO.y} label="1" sublabel="bias" activation={1} hovered={hoveredNode==="biasO"} onClick={()=>setHoveredNode(hoveredNode==="biasO"?null:"biasO")}/>
      {inp.map((n,i)=>(<Neuron key={i} x={n.x} y={n.y} label={`x${i+1}`} sublabel={activations?fmt6(activations.inputs[i]).slice(0,7):null} activation={activations?activations.inputs[i]:null} hovered={hoveredNode===`inp${i}`} onClick={()=>setHoveredNode(hoveredNode===`inp${i}`?null:`inp${i}`)}/>))}
      {hid.map((n,j)=>(<Neuron key={j} x={n.x} y={n.y} label={`z${j+1}`} sublabel={activations?fmt6(activations.z[j]).slice(0,7):null} activation={activations?activations.z[j]:null} hovered={hoveredNode===`hid${j}`} onClick={()=>setHoveredNode(hoveredNode===`hid${j}`?null:`hid${j}`)}/>))}
      <Neuron x={out[0].x} y={out[0].y} label="y" sublabel={activations?fmt6(activations.y).slice(0,7):null} activation={activations?activations.y:null} hovered={hoveredNode==="out"} onClick={()=>setHoveredNode(hoveredNode==="out"?null:"out")}/>
      {showWeights&&v.map((row,i)=>row.map((val,j)=>{const src=inp[i],dst=hid[j];const mx=(src.x+NODE_R+dst.x-NODE_R)/2,my=(src.y+dst.y)/2;return(<text key={`lv${i}${j}`} x={mx} y={my-3} textAnchor="middle" fill={val<0?"#F87171":"#7C6FCD"} fontSize={7} fontFamily="monospace">{fmtW(val)}</text>);}))}
      {showWeights&&w.map((val,j)=>{const src=hid[j],dst=out[0];const mx=(src.x+NODE_R+dst.x-NODE_R)/2,my=(src.y+dst.y)/2;return(<text key={`lw${j}`} x={mx} y={my-3} textAnchor="middle" fill={val<0?"#F87171":"#7C6FCD"} fontSize={7} fontFamily="monospace">{fmtW(val)}</text>);})}
    </svg>
  );
}

function WeightTable({ weights, label }) {
  if(!weights) return null;
  const {v,v0,w,w0}=weights,clr=(n)=>n<0?"#F87171":n>0?"#A78BFA":"#64748B";
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-slate-500 tracking-widest">{label}</div>
      <div>
        <div className="text-xs text-slate-600 mb-1">v (Input → Hidden)</div>
        <table className="w-full text-xs font-mono">
          <thead><tr><th className="text-left text-slate-600 pb-1 font-medium">—</th>{[1,2,3,4].map(j=><th key={j} className="text-right text-slate-600 pb-1 font-medium">z{j}</th>)}</tr></thead>
          <tbody>
            {[0,1].map(i=>(<tr key={i}><td className="text-slate-500 pr-2">x{i+1}</td>{v[i].map((val,j)=>(<td key={j} className="text-right py-0.5" style={{color:clr(val)}}>{fmtW(val)}</td>))}</tr>))}
            <tr><td className="text-slate-500 pr-2">v0</td>{v0.map((val,j)=>(<td key={j} className="text-right py-0.5" style={{color:clr(val)}}>{fmtW(val)}</td>))}</tr>
          </tbody>
        </table>
      </div>
      <div>
        <div className="text-xs text-slate-600 mb-1">w (Hidden → Output)</div>
        <table className="w-full text-xs font-mono">
          <thead><tr>{[1,2,3,4].map(j=><th key={j} className="text-right text-slate-600 pb-1 font-medium">z{j}</th>)}<th className="text-right text-slate-600 pb-1 font-medium">w0</th></tr></thead>
          <tbody><tr>{w.map((val,j)=>(<td key={j} className="text-right py-0.5" style={{color:clr(val)}}>{fmtW(val)}</td>))}<td className="text-right py-0.5" style={{color:clr(w0)}}>{fmtW(w0)}</td></tr></tbody>
        </table>
      </div>
    </div>
  );
}

export default function NetworkDiagram() {
  const [nimInput, setNimInput] = useState("3855");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [epochIdx, setEpochIdx] = useState(0);
  const [dataIdx, setDataIdx]   = useState(0);
  const [showWeights, setShowWeights] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false); // mobile detail panel
  const animRef = useRef(null);

  const handleRun = () => {
    const last4=nimInput.slice(-4).padStart(4,"0");
    const nimFactor=parseInt(last4,10)/10000;
    setLoading(true);setEpochIdx(0);setDataIdx(0);
    setTimeout(()=>{const res=runTraining(nimFactor);setResults(res);setLoading(false);},50);
  };

  const toggleAnimate = () => {
    if(animating){clearInterval(animRef.current);setAnimating(false);}
    else{
      setAnimating(true);
      animRef.current=setInterval(()=>{setEpochIdx(prev=>{if(prev>=results.length-1){clearInterval(animRef.current);setAnimating(false);return prev;}return prev+1;});},80);
    }
  };
  useEffect(()=>()=>clearInterval(animRef.current),[]);

  const cur=results[epochIdx],entry=cur?.data[dataIdx];
  const displayWeights=entry?(showDiff?entry.step.newWeights:entry.weightsBeforeUpdate):(results[0]?applyNimFactor(INITIAL_WEIGHTS_RAW,TRAINING_DATA_RAW,parseInt(nimInput.slice(-4).padStart(4,"0"),10)/10000).weights:null);
  const activations=entry?{inputs:[entry.input.x1,entry.input.x2],z:entry.step.z,y:entry.step.y}:null;
  const deltaWeights=entry?{v:entry.weightsBeforeUpdate.v.map((row,i)=>row.map((val,j)=>r6(entry.step.newWeights.v[i][j]-val))),v0:entry.weightsBeforeUpdate.v0.map((val,j)=>r6(entry.step.newWeights.v0[j]-val)),w:entry.weightsBeforeUpdate.w.map((val,j)=>r6(entry.step.newWeights.w[j]-val)),w0:r6(entry.step.newWeights.w0-entry.weightsBeforeUpdate.w0)}:null;

  return (
    <div style={{ background:"#0F1117", minHeight:"100vh", fontFamily:"'Inter', system-ui, sans-serif", color:"#E2E8F0" }}>

      {/* HEADER */}
      <div style={{ borderBottom:"1px solid #1E2433" }} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight" style={{ color:"#7C6FCD" }}>Network Diagram</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Visualisasi bobot jaringan 2-4-1</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input value={nimInput} onChange={e=>setNimInput(e.target.value)} placeholder="NIM"
            className="w-20 sm:w-28 px-2 sm:px-3 py-1.5 text-sm font-mono rounded-md border text-slate-200 bg-slate-800/60"
            style={{ borderColor:"#2D3748" }} />
          <button onClick={handleRun} disabled={loading}
            className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md whitespace-nowrap"
            style={{ background:loading?"#4B5563":"#7C6FCD", color:"white" }}>
            {loading?"...":results.length?"Ulangi":"Mulai"}
          </button>
        </div>
      </div>

      {/* IDLE */}
      {!results.length&&!loading&&(
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <svg width={VW*0.45} height={VH*0.35} viewBox={`0 0 ${VW} ${VH}`} className="opacity-20 mb-6">
            {NODES.input.map((n,i)=>NODES.hidden.map((h,j)=>(<line key={`${i}${j}`} x1={n.x+NODE_R} y1={n.y} x2={h.x-NODE_R} y2={h.y} stroke="#7C6FCD" strokeWidth={0.5}/>)))}
            {NODES.hidden.map((h,j)=>(<line key={j} x1={h.x+NODE_R} y1={h.y} x2={NODES.output[0].x-NODE_R} y2={NODES.output[0].y} stroke="#7C6FCD" strokeWidth={0.5}/>))}
            {NODES.input.map((n,i)=><circle key={i} cx={n.x} cy={n.y} r={NODE_R} fill="#141925" stroke="#2D3748" strokeWidth={1.5}/>)}
            {NODES.hidden.map((n,j)=><circle key={j} cx={n.x} cy={n.y} r={NODE_R} fill="#141925" stroke="#2D3748" strokeWidth={1.5}/>)}
            <circle cx={NODES.output[0].x} cy={NODES.output[0].y} r={NODE_R} fill="#141925" stroke="#2D3748" strokeWidth={1.5}/>
          </svg>
          <h2 className="text-xl font-semibold mb-2" style={{ color:"#C4B5FD" }}>Visualisasi jaringan menunggu</h2>
          <p className="text-sm mb-6 max-w-xs" style={{ color:"#6B7280" }}>
            Masukkan NIM kamu lalu klik <strong style={{ color:"#A5B4FC" }}>Mulai</strong> untuk melihat animasi bobot jaringan 2-4-1 selama training.
          </p>
          <div className="rounded-xl px-5 py-4 text-left max-w-xs" style={{ background:"#0D0D1A", border:"1px solid #1A1A2E" }}>
            <p className="text-xs font-bold mb-2 font-mono" style={{ color:"#4ADE80" }}>YANG AKAN TAMPIL</p>
            <ul className="text-xs space-y-1" style={{ color:"#6B7280" }}>
              <li>· Bobot divisualisasikan sebagai lebar/warna edge</li>
              <li>· Nilai aktivasi tiap node per epoch</li>
              <li>· Animasi perubahan bobot antar epoch</li>
            </ul>
          </div>
        </div>
      )}

      {loading&&(
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative mb-4" style={{ width:40, height:40 }}>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"2px solid #1A1A2E" }} />
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"#7C6FCD", animation:"spin 0.8s linear infinite" }} />
          </div>
          <p className="text-sm font-mono" style={{ color:"#7C6FCD" }}>Menghitung epoch...</p>
          <p className="text-xs mt-1" style={{ color:"#374151" }}>Bisa sampai ~1000 epoch</p>
        </div>
      )}

      {results.length>0&&!loading&&(
        <div className="flex flex-col lg:flex-row" style={{ height:"calc(100vh - 57px)" }}>

          {/* MAIN PANEL */}
          <div className="flex-1 flex flex-col min-h-0">

            {/* Controls bar */}
            <div className="px-3 sm:px-5 py-2 sm:py-3 flex flex-wrap items-center gap-2 text-xs shrink-0" style={{ borderBottom:"1px solid #1E2433" }}>
              {/* Epoch */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Epoch</span>
                <button onClick={()=>setEpochIdx(i=>Math.max(0,i-1))} className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white" style={{background:"#1E2433"}}>‹</button>
                <input type="range" min={0} max={results.length-1} value={epochIdx} onChange={e=>setEpochIdx(Number(e.target.value))} className="w-24 sm:w-36 accent-violet-500"/>
                <button onClick={()=>setEpochIdx(i=>Math.min(results.length-1,i+1))} className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white" style={{background:"#1E2433"}}>›</button>
                <span className="font-mono text-slate-200 w-16">{cur?.epoch}/{results[results.length-1]?.epoch}</span>
              </div>

              <div className="h-4 w-px bg-slate-700 hidden sm:block"/>

              {/* Data */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Data</span>
                {[0,1].map(i=>(<button key={i} onClick={()=>setDataIdx(i)} className="px-2 py-0.5 rounded font-mono transition-all" style={{background:dataIdx===i?"#7C6FCD33":"#1E2433",color:dataIdx===i?"#A78BFA":"#64748B",border:`1px solid ${dataIdx===i?"#7C6FCD66":"transparent"}`}}>{i+1}</button>))}
              </div>

              <div className="h-4 w-px bg-slate-700 hidden sm:block"/>

              {/* Toggles */}
              {([["showWeights",showWeights,()=>setShowWeights((v:boolean)=>!v),"Label Bobot"],["showDiff",showDiff,()=>setShowDiff((v:boolean)=>!v),"Setelah Update"]] as [string,boolean,()=>void,string][]).map(([key,val,fn,lbl])=>(
                <button key={key} onClick={fn} className="px-2 sm:px-3 py-1 rounded-lg transition-all" style={{background:val?"#7C6FCD22":"#1E2433",color:val?"#A78BFA":"#64748B",border:`1px solid ${val?"#7C6FCD44":"transparent"}`}}>
                  {val?"✓ ":""}{lbl}
                </button>
              ))}

              <button onClick={toggleAnimate} className="px-2 sm:px-3 py-1 rounded-lg transition-all" style={{background:animating?"#FB923C22":"#1E2433",color:animating?"#FB923C":"#64748B"}}>
                {animating?"⏸ Stop":"▶ Animasi"}
              </button>

              {/* MSE */}
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-slate-500">MSE</span>
                <span className={`font-mono font-bold ${cur?.converged?"text-emerald-400":"text-amber-400"}`}>{cur?.totalMSE.toFixed(6)}</span>
                {cur?.converged&&<span className="text-emerald-400">✓</span>}
              </div>

              {/* Mobile detail toggle */}
              <button onClick={()=>setDetailOpen(v=>!v)}
                className="lg:hidden px-2 py-1 rounded text-slate-400"
                style={{ background:"#1E2433" }}>
                {detailOpen?"✕ Detail":"☰ Detail"}
              </button>
            </div>

            {/* SVG canvas */}
            <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0">
              <NetworkSVG weights={displayWeights} activations={activations} hoveredEdge={hoveredEdge} setHoveredEdge={setHoveredEdge} hoveredNode={hoveredNode} setHoveredNode={setHoveredNode} showWeights={showWeights}/>
            </div>

            {/* Legend */}
            <div className="px-4 sm:px-6 py-2 sm:py-3 flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-600 shrink-0" style={{ borderTop:"1px solid #1E2433" }}>
              <span className="hidden sm:block">Ketebalan garis = magnitude bobot</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 inline-block" style={{background:"#7C6FCD"}}/> Positif</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 inline-block" style={{background:"#F87171"}}/> Negatif</span>
              <span className="hidden sm:block">Klik koneksi/node untuk detail</span>
            </div>
          </div>

          {/* SIDEBAR — desktop always visible, mobile overlay */}
          {/* Mobile overlay */}
          {detailOpen&&(
            <div className="lg:hidden fixed inset-0 z-40" onClick={()=>setDetailOpen(false)} style={{background:"rgba(0,0,0,0.6)"}}>
              <div className="absolute right-0 top-0 bottom-0 w-72 overflow-y-auto p-4 space-y-4" style={{background:"#0F1117",borderLeft:"1px solid #1E2433"}} onClick={e=>e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 tracking-widest">DETAIL</span>
                  <button onClick={()=>setDetailOpen(false)} className="text-slate-500 text-lg leading-none">✕</button>
                </div>
                {entry&&(
                  <div className="rounded-xl p-3 space-y-1.5" style={{background:"#141925",border:"1px solid #1E2433"}}>
                    <div className="text-xs font-bold text-slate-500 tracking-widest mb-2">FORWARD PASS</div>
                    {[["x₁",entry.input.x1],["x₂",entry.input.x2],["target",entry.input.target],["y_in",entry.step.y_in],["y (output)",entry.step.y],["error",entry.step.error],["error²",entry.step.squaredError],["δ",entry.step.delta]].map(([lbl,val])=>(
                      <div key={lbl} className="flex justify-between text-xs font-mono">
                        <span className="text-slate-500">{lbl}</span>
                        <span className={val<0?"text-red-400":val>0.9?"text-emerald-400":"text-slate-300"}>{typeof val==="number"?r6(val).toFixed(6):val}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="rounded-xl p-3" style={{background:"#141925",border:"1px solid #1E2433"}}>
                  <WeightTable weights={displayWeights} label={showDiff?"BOBOT SETELAH UPDATE":"BOBOT SEBELUM UPDATE"}/>
                </div>
              </div>
            </div>
          )}

          {/* Desktop sidebar */}
          <div className="hidden lg:block w-72 shrink-0 overflow-y-auto p-5 space-y-5" style={{ borderLeft:"1px solid #1E2433" }}>
            {entry&&(
              <div className="rounded-xl p-3 space-y-1.5" style={{ background:"#141925", border:"1px solid #1E2433" }}>
                <div className="text-xs font-bold text-slate-500 tracking-widest mb-2">FORWARD PASS</div>
                {[["x₁",entry.input.x1],["x₂",entry.input.x2],["target",entry.input.target],["y_in",entry.step.y_in],["y (output)",entry.step.y],["error",entry.step.error],["error²",entry.step.squaredError],["δ",entry.step.delta]].map(([lbl,val])=>(
                  <div key={lbl} className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">{lbl}</span>
                    <span className={val<0?"text-red-400":val>0.9?"text-emerald-400":"text-slate-300"}>{typeof val==="number"?r6(val).toFixed(6):val}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl p-3" style={{ background:"#141925", border:"1px solid #1E2433" }}>
              <WeightTable weights={displayWeights} label={showDiff?"BOBOT SETELAH UPDATE":"BOBOT SEBELUM UPDATE"}/>
            </div>
            {deltaWeights&&(
              <div className="rounded-xl p-3" style={{ background:"#141925", border:"1px solid #1E2433" }}>
                <div className="text-xs font-bold text-slate-500 tracking-widest mb-3">PERUBAHAN BOBOT (Δ)</div>
                <div className="text-xs text-slate-600 mb-1">Δv</div>
                {[0,1].map(i=>(<div key={i} className="flex gap-1 mb-1 font-mono text-xs"><span className="text-slate-600 w-6">x{i+1}</span>{deltaWeights.v[i].map((val,j)=>(<span key={j} className={`flex-1 text-center text-xs ${val<0?"text-red-400":val>0?"text-emerald-400":"text-slate-600"}`}>{val===0?"0":(val>0?"+":"")+val.toFixed(4)}</span>))}</div>))}
                <div className="text-xs text-slate-600 mt-2 mb-1">Δw</div>
                <div className="flex gap-1 font-mono text-xs">
                  {deltaWeights.w.map((val,j)=>(<span key={j} className={`flex-1 text-center ${val<0?"text-red-400":val>0?"text-emerald-400":"text-slate-600"}`}>{val===0?"0":(val>0?"+":"")+val.toFixed(4)}</span>))}
                  <span className={`flex-1 text-center ${deltaWeights.w0<0?"text-red-400":"text-emerald-400"}`}>{(deltaWeights.w0>0?"+":"")+deltaWeights.w0.toFixed(4)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
