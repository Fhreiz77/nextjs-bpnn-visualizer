"use client";
// @ts-nocheck
import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Brush, Area, AreaChart,
} from "recharts";

import { r6, runTraining as engineRunTraining } from "@/lib/engine";
import { DEFAULT_CONFIG } from "@/lib/constants";

function runTraining(nimFactor = 0.3855, maxEpoch = 2000) {
  return engineRunTraining({ ...DEFAULT_CONFIG, nimFactor, maxEpoch });
}

const fmt6 = (n) => r6(n).toFixed(6);
const fmtShort = (n) => { if(n>=0.1) return n.toFixed(4); if(n>=0.01) return n.toFixed(5); return n.toFixed(6); };

function subsample(results, maxPoints=300) {
  if(results.length<=maxPoints) return results;
  const step=Math.ceil(results.length/maxPoints);
  const sampled=results.filter((_,i)=>i%step===0);
  if(sampled[sampled.length-1]!==results[results.length-1]) sampled.push(results[results.length-1]);
  return sampled;
}

function CustomTooltip({ active, payload, label }) {
  if(!active||!payload?.length) return null;
  const mse=payload[0]?.value;
  return (
    <div className="rounded-lg p-3 text-xs font-mono" style={{ background:"#1A2235", border:"1px solid #2D3748", minWidth:160 }}>
      <div className="text-slate-400 mb-2 font-sans font-semibold">Epoch {label}</div>
      {mse!==undefined&&<div className="flex justify-between gap-4"><span style={{color:"#7C6FCD"}}>MSE</span><span className="text-slate-200">{fmt6(mse)}</span></div>}
    </div>
  );
}

function StatCard({ label, value, sub, accent="#7C6FCD" }) {
  return (
    <div className="rounded-xl p-3 sm:p-4" style={{ background:"#141925", border:"1px solid #1E2433" }}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-lg sm:text-xl font-bold font-mono truncate" style={{ color:accent }}>{value}</div>
      {sub&&<div className="text-xs text-slate-600 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

export default function ErrorChart() {
  const [nimInput, setNimInput] = useState("3855");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState("area");
  const [scaleY, setScaleY] = useState<"linear" | "log">("linear");
  const [showSE, setShowSE] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  const handleRun = () => {
    const last4=nimInput.slice(-4).padStart(4,"0");
    const nimFactor=parseInt(last4,10)/10000;
    setLoading(true);
    setTimeout(() => { const res=runTraining(nimFactor); setResults(res); setLoading(false); }, 50);
  };

  const chartData = useMemo(() => subsample(results,400).map(r => ({
    epoch:r.epoch, mse:r.totalMSE, se1:r.data[0]?.step.squaredError??null, se2:r.data[1]?.step.squaredError??null, converged:r.converged,
  })), [results]);

  const convergedResult = results.find(r=>r.converged);
  const maxMSE = results.length ? results[0].totalMSE : 0;
  const minMSE = results.length ? results[results.length-1].totalMSE : 0;
  const yDomain = scaleY==="log" ? [Math.max(0.001,minMSE*0.9),maxMSE*1.05] : [0,maxMSE*1.05];
  const ChartComponent = chartType==="area" ? AreaChart : LineChart;

  const stats = useMemo(() => {
    if(!results.length) return [];
    return [
      { label:"MSE 0.1", epoch:results.find(r=>r.totalMSE<=0.1)?.epoch },
      { label:"MSE 0.05", epoch:results.find(r=>r.totalMSE<=0.05)?.epoch },
      { label:"MSE 0.02", epoch:results.find(r=>r.totalMSE<=0.02)?.epoch },
      { label:"Konvergen", epoch:convergedResult?.epoch },
    ].filter(s=>s.epoch);
  }, [results, convergedResult]);

  return (
    <div style={{ background:"#0F1117", minHeight:"100vh", fontFamily:"'Inter', system-ui, sans-serif", color:"#E2E8F0" }}>

      {/* HEADER */}
      <div style={{ borderBottom:"1px solid #1E2433" }} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight" style={{ color:"#7C6FCD" }}>Error Chart</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Grafik MSE vs Epoch selama training</p>
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
          <div className="mb-5" style={{ fontSize:"3.5rem", lineHeight:1 }}>📉</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color:"#C4B5FD" }}>Grafik konvergensi menunggu</h2>
          <p className="text-sm mb-6 max-w-xs" style={{ color:"#6B7280" }}>
            Masukkan NIM kamu lalu klik <strong style={{ color:"#A5B4FC" }}>Mulai</strong> untuk memplot kurva MSE selama training.
          </p>
          <div className="rounded-xl px-5 py-4 text-left max-w-xs" style={{ background:"#0D0D1A", border:"1px solid #1A1A2E" }}>
            <p className="text-xs font-bold mb-2 font-mono" style={{ color:"#FB923C" }}>YANG AKAN TAMPIL</p>
            <ul className="text-xs space-y-1" style={{ color:"#6B7280" }}>
              <li>· Kurva MSE dari epoch 1 hingga konvergen</li>
              <li>· Zoom brush untuk memperbesar rentang tertentu</li>
              <li>· Toggle skala log vs linear</li>
              <li>· Analisis laju penurunan error</li>
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
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">

          {/* STAT CARDS — 2 col mobile, 4 desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total Epoch" value={results.length} sub="hingga konvergen" accent="#7C6FCD" />
            <StatCard label="MSE Awal" value={fmt6(maxMSE)} sub="Epoch 1" accent="#F87171" />
            <StatCard label="MSE Konvergen" value={fmt6(minMSE)} sub={`Epoch ${convergedResult?.epoch??results.length}`} accent="#4ADE80" />
            <StatCard label="Reduksi Error" value={`${((1-minMSE/maxMSE)*100).toFixed(1)}%`} sub={`${fmt6(maxMSE)} → ${fmt6(minMSE)}`} accent="#FB923C" />
          </div>

          {/* CHART CONTROLS */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{ border:"1px solid #1E2433" }}>
              {[["area","Area"],["line","Line"]].map(([val,label]) => (
                <button key={val} onClick={()=>setChartType(val)}
                  className="px-2 sm:px-3 py-1.5 text-xs font-medium transition-all"
                  style={{ background:chartType===val?"#7C6FCD22":"transparent", color:chartType===val?"#A78BFA":"#64748B" }}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg overflow-hidden" style={{ border:"1px solid #1E2433" }}>
              {(["linear","log"] as const).map(val => (
                <button key={val} onClick={()=>setScaleY(val)}
                  className="px-2 sm:px-3 py-1.5 text-xs font-medium transition-all capitalize"
                  style={{ background:scaleY===val?"#7C6FCD22":"transparent", color:scaleY===val?"#A78BFA":"#64748B" }}>
                  {val}
                </button>
              ))}
            </div>
            <button onClick={()=>setShowSE(v=>!v)}
              className="px-2 sm:px-3 py-1.5 text-xs rounded-lg transition-all"
              style={{ background:showSE?"#7C6FCD22":"#1E2433", color:showSE?"#A78BFA":"#64748B", border:`1px solid ${showSE?"#7C6FCD44":"transparent"}` }}>
              {showSE?"✓ ":""}SE/Data
            </button>
            <button onClick={()=>setShowGrid(v=>!v)}
              className="px-2 sm:px-3 py-1.5 text-xs rounded-lg transition-all"
              style={{ background:showGrid?"#7C6FCD22":"#1E2433", color:showGrid?"#A78BFA":"#64748B", border:`1px solid ${showGrid?"#7C6FCD44":"transparent"}` }}>
              {showGrid?"✓ ":""}Grid
            </button>
            <span className="ml-auto text-xs text-slate-600 font-mono hidden sm:block">
              {chartData.length} titik / {results.length} epoch
            </span>
          </div>

          {/* MAIN CHART */}
          <div className="rounded-xl p-3 sm:p-5" style={{ background:"#141925", border:"1px solid #1E2433" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">MSE vs Epoch</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Garis merah putus-putus = target 0.01
                  {convergedResult&&` · Konvergen epoch ${convergedResult.epoch}`}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded" style={{background:"#7C6FCD"}}/><span className="text-slate-400">MSE</span></span>
                {showSE&&<><span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded" style={{background:"#60A5FA"}}/><span className="text-slate-400">SE₁</span></span><span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded" style={{background:"#F472B6"}}/><span className="text-slate-400">SE₂</span></span></>}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <ChartComponent data={chartData} margin={{ top:8, right:8, left:0, bottom:20 }}>
                <defs>
                  <linearGradient id="mseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C6FCD" stopOpacity={0.3}/><stop offset="95%" stopColor="#7C6FCD" stopOpacity={0.02}/></linearGradient>
                  <linearGradient id="se1Grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60A5FA" stopOpacity={0.2}/><stop offset="95%" stopColor="#60A5FA" stopOpacity={0.02}/></linearGradient>
                  <linearGradient id="se2Grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F472B6" stopOpacity={0.2}/><stop offset="95%" stopColor="#F472B6" stopOpacity={0.02}/></linearGradient>
                </defs>
                {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke="#1E2433" vertical={false}/>}
                <XAxis dataKey="epoch" tick={{fill:"#475569",fontSize:10,fontFamily:"monospace"}} axisLine={{stroke:"#1E2433"}} tickLine={false} label={{value:"Epoch",position:"insideBottom",offset:-10,fill:"#475569",fontSize:10}} />
                <YAxis scale={scaleY} domain={yDomain} tick={{fill:"#475569",fontSize:10,fontFamily:"monospace"}} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={52} />
                <Tooltip content={(props: any) => <CustomTooltip {...props}/>} />
                <ReferenceLine y={0.01} stroke="#F87171" strokeDasharray="6 3" strokeWidth={1.5} label={{value:"0.01",position:"insideTopRight",fill:"#F87171",fontSize:9}} />
                {convergedResult&&<ReferenceLine x={convergedResult.epoch} stroke="#4ADE80" strokeDasharray="4 3" strokeWidth={1.5} label={{value:`ep.${convergedResult.epoch}`,position:"top",fill:"#4ADE80",fontSize:9}} />}
                {chartType==="area"
                  ? <Area type="monotone" dataKey="mse" stroke="#7C6FCD" strokeWidth={2} fill="url(#mseGrad)" dot={false} activeDot={{r:4,fill:"#7C6FCD",stroke:"#0F1117",strokeWidth:2}} isAnimationActive={false}/>
                  : <Line type="monotone" dataKey="mse" stroke="#7C6FCD" strokeWidth={2} dot={false} activeDot={{r:4,fill:"#7C6FCD",stroke:"#0F1117",strokeWidth:2}} isAnimationActive={false}/>}
                {showSE&&chartType==="area"&&<><Area type="monotone" dataKey="se1" stroke="#60A5FA" strokeWidth={1} fill="url(#se1Grad)" dot={false} isAnimationActive={false}/><Area type="monotone" dataKey="se2" stroke="#F472B6" strokeWidth={1} fill="url(#se2Grad)" dot={false} isAnimationActive={false}/></>}
                {showSE&&chartType==="line"&&<><Line type="monotone" dataKey="se1" stroke="#60A5FA" strokeWidth={1} strokeDasharray="4 2" dot={false} isAnimationActive={false}/><Line type="monotone" dataKey="se2" stroke="#F472B6" strokeWidth={1} strokeDasharray="4 2" dot={false} isAnimationActive={false}/></>}
                <Brush dataKey="epoch" height={20} stroke="#1E2433" fill="#0F1520" travellerWidth={6} tickFormatter={v=>v} style={{fontSize:9,fill:"#475569"}} />
              </ChartComponent>
            </ResponsiveContainer>
            <p className="text-xs text-slate-600 mt-2 text-center">Geser brush bawah untuk zoom</p>
          </div>

          {/* MILESTONE CARDS — 2 col mobile, 4 desktop */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 tracking-widest mb-3">MILESTONE KONVERGENSI</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.map((s,i) => {
                const res=results.find(r=>r.epoch===s.epoch);
                return (
                  <div key={i} className="rounded-lg p-3" style={{ background:"#141925", border:"1px solid #1E2433" }}>
                    <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                    <div className="font-mono font-bold text-slate-200">Epoch {s.epoch}</div>
                    {res&&<div className="text-xs text-slate-600 font-mono mt-0.5">MSE = {fmt6(res.totalMSE)}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RATE OF CHANGE TABLE — horizontal scroll on mobile */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 tracking-widest mb-3">LAJU PERUBAHAN MSE</h3>
            <div className="rounded-xl overflow-hidden" style={{ border:"1px solid #1E2433" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono" style={{ minWidth:"480px" }}>
                  <thead>
                    <tr style={{ background:"#141925", borderBottom:"1px solid #1E2433" }}>
                      {["Rentang Epoch","MSE Awal","MSE Akhir","Penurunan","Laju/Epoch"].map((h,i) => (
                        <th key={h} className={`px-4 py-2.5 text-slate-500 font-medium ${i===0?"text-left":"text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[[0,Math.floor(results.length*0.25)],[Math.floor(results.length*0.25),Math.floor(results.length*0.5)],[Math.floor(results.length*0.5),Math.floor(results.length*0.75)],[Math.floor(results.length*0.75),results.length-1]].map(([from,to],i) => {
                      if(from>=to||!results[from]||!results[to]) return null;
                      const mseFrom=results[from].totalMSE,mseTo=results[to].totalMSE;
                      const drop=mseFrom-mseTo,epochCount=results[to].epoch-results[from].epoch;
                      const rate=epochCount>0?drop/epochCount:0,pct=((drop/mseFrom)*100).toFixed(1);
                      return (
                        <tr key={i} style={{ borderBottom:"1px solid #1A2030", background:i%2?"#0D131E":"#0F1520" }}>
                          <td className="px-4 py-2 text-slate-400">{results[from].epoch} – {results[to].epoch}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{fmt6(mseFrom)}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{fmt6(mseTo)}</td>
                          <td className="px-4 py-2 text-right"><span className="text-emerald-400">−{pct}%</span></td>
                          <td className="px-4 py-2 text-right text-slate-500">{rate.toExponential(3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
