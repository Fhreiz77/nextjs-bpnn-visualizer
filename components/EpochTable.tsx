"use client";
// @ts-nocheck
import { useState, useMemo, useRef } from "react";
import { r6, runTraining as engineRunTraining } from "@/lib/engine";
import { DEFAULT_CONFIG } from "@/lib/constants";

function runTraining(nimFactor = 0.3855, maxEpoch = 2000) {
  return engineRunTraining({ ...DEFAULT_CONFIG, nimFactor, maxEpoch });
}

const fmt6 = (n) => r6(n).toFixed(6);

function mseColor(mse, maxMse) {
  const t = Math.max(0, Math.min(1, 1 - mse / maxMse));
  if (t < 0.5) { const r=248, g=Math.round(113+(196-113)*(t*2)); return `rgb(${r},${g},71)`; }
  else { const r=Math.round(248-(248-74)*((t-0.5)*2)); const g=Math.round(196+(222-196)*((t-0.5)*2)); return `rgb(${r},${g},71)`; }
}

function getMilestones(results) {
  if (!results.length) return [];
  const milestones = new Set([0]);
  const maxMSE=results[0].totalMSE, minMSE=results[results.length-1].totalMSE;
  for(let pct=10;pct<=90;pct+=10){ const target=maxMSE-(maxMSE-minMSE)*(pct/100); const idx=results.findIndex(r=>r.totalMSE<=target); if(idx>=0) milestones.add(idx); }
  milestones.add(results.length-1);
  return [...milestones].sort((a,b)=>a-b);
}

function StatCard({ label, value, sub, accent="#7C6FCD" }) {
  return (
    <div className="rounded-xl p-3 sm:p-4" style={{ background:"#141925", border:"1px solid #1E2433" }}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-bold font-mono truncate" style={{ color:accent }}>{value}</div>
      {sub && <div className="text-xs text-slate-600 mt-1 font-mono">{sub}</div>}
    </div>
  );
}

function MiniSparkline({ results }) {
  if (!results.length) return null;
  const W=100, H=28, PAD=2;
  const mses=results.map(r=>r.totalMSE);
  const maxM=Math.max(...mses), minM=Math.min(...mses), range=maxM-minM||1;
  const pts=mses.map((m,i)=>{ const x=PAD+(i/Math.max(mses.length-1,1))*(W-PAD*2); const y=PAD+(1-(m-minM)/range)*(H-PAD*2); return `${x},${y}`; }).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke="#7C6FCD" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function ExpandedRow({ epoch, highlighted, colSpan = 9 }) {
  return (
    <tr style={{ background: highlighted ? "#12192B" : "#0F1520" }}>
      <td colSpan={colSpan} className="px-0 py-0">
        <div className="mx-3 sm:mx-6 my-2 rounded-lg overflow-x-auto" style={{ border:"1px solid #1E2433" }}>
          <table className="w-full text-xs font-mono" style={{ minWidth: "500px" }}>
            <thead>
              <tr style={{ background:"#1A2235" }}>
                {["Data","x₁","x₂","t","y_in","y","error","error²","δ"].map(h => (
                  <th key={h} className={`px-3 py-1.5 text-slate-500 font-medium ${h==="Data"?"text-left":"text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {epoch.data.map((entry,i) => (
                <tr key={i} style={{ borderTop:"1px solid #1E2433" }}>
                  <td className="px-3 py-1.5 text-slate-400">Data {i+1}</td>
                  <td className="px-3 py-1.5 text-right text-slate-300">{fmt6(entry.input.x1)}</td>
                  <td className="px-3 py-1.5 text-right text-slate-300">{fmt6(entry.input.x2)}</td>
                  <td className="px-3 py-1.5 text-right text-slate-300">{entry.input.target}</td>
                  <td className="px-3 py-1.5 text-right text-slate-300">{fmt6(entry.step.y_in)}</td>
                  <td className="px-3 py-1.5 text-right text-violet-300 font-bold">{fmt6(entry.step.y)}</td>
                  <td className={`px-3 py-1.5 text-right font-bold ${entry.step.error<0?"text-red-400":"text-emerald-400"}`}>{fmt6(entry.step.error)}</td>
                  <td className="px-3 py-1.5 text-right text-amber-400">{fmt6(entry.step.squaredError)}</td>
                  <td className={`px-3 py-1.5 text-right ${entry.step.delta<0?"text-red-300":"text-emerald-300"}`}>{fmt6(entry.step.delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

export default function EpochTable() {
  const [nimInput, setNimInput] = useState("3855");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedEpochs, setExpandedEpochs] = useState(new Set());
  const [activeEpoch, setActiveEpoch] = useState(null);
  const [viewMode, setViewMode] = useState("all");
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(50);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  const handleRun = () => {
    const last4=nimInput.slice(-4).padStart(4,"0");
    const nimFactor=parseInt(last4,10)/10000;
    setLoading(true); setExpandedEpochs(new Set()); setActiveEpoch(null);
    setTimeout(() => { const res=runTraining(nimFactor); setResults(res); setRangeTo(Math.min(50,res.length)); setLoading(false); }, 50);
  };

  const milestones = useMemo(() => getMilestones(results), [results]);
  const maxMSE = results.length ? results[0].totalMSE : 1;

  const visibleResults = useMemo(() => {
    let rows=results;
    if(search.trim()){ const n=parseInt(search.trim(),10); if(!isNaN(n)) rows=rows.filter(r=>r.epoch===n); }
    else if(viewMode==="milestones"){ rows=milestones.map(i=>results[i]).filter(Boolean); }
    else if(viewMode==="range"){ rows=results.filter(r=>r.epoch>=rangeFrom&&r.epoch<=rangeTo); }
    if(sortDir==="desc") rows=[...rows].reverse();
    return rows;
  }, [results,viewMode,milestones,rangeFrom,rangeTo,search,sortDir]);

  const toggleExpand = (epoch) => setExpandedEpochs(prev => { const next=new Set(prev); next.has(epoch)?next.delete(epoch):next.add(epoch); return next; });
  const convergedEpoch = results.find(r=>r.converged);
  const lastMSE = results.length ? results[results.length-1].totalMSE : null;

  return (
    <div style={{ background:"#0F1117", minHeight:"100vh", fontFamily:"'Inter', system-ui, sans-serif", color:"#E2E8F0" }}>

      {/* HEADER */}
      <div style={{ borderBottom:"1px solid #1E2433" }} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight" style={{ color:"#7C6FCD" }}>Epoch Table</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Ringkasan MSE dan output setiap epoch</p>
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
      {!results.length && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="mb-5" style={{ fontSize: "3.5rem", lineHeight: 1 }}>📊</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#C4B5FD" }}>Tabel epoch menunggu</h2>
          <p className="text-sm mb-6 max-w-xs" style={{ color: "#6B7280" }}>
            Masukkan NIM kamu di kolom atas, lalu klik <strong style={{ color: "#A5B4FC" }}>Mulai</strong> untuk melihat ringkasan MSE & output tiap epoch.
          </p>
          <div className="rounded-xl px-5 py-4 text-left max-w-xs" style={{ background: "#0D0D1A", border: "1px solid #1A1A2E" }}>
            <p className="text-xs font-bold mb-2 font-mono" style={{ color: "#38BDF8" }}>YANG AKAN TAMPIL</p>
            <ul className="text-xs space-y-1" style={{ color: "#6B7280" }}>
              <li>· MSE tiap epoch + progress bar</li>
              <li>· Output y₁, y₂ dan error per data</li>
              <li>· Filter milestone & rentang epoch</li>
              <li>· Detail bobot per epoch (expand)</li>
            </ul>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative mb-4" style={{ width: 40, height: 40 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #1A1A2E" }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#7C6FCD", animation: "spin 0.8s linear infinite" }} />
          </div>
          <p className="text-sm font-mono" style={{ color: "#7C6FCD" }}>Menghitung epoch...</p>
          <p className="text-xs mt-1" style={{ color: "#374151" }}>Bisa sampai ~1000 epoch</p>
        </div>
      )}

      {results.length > 0 && !loading && (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

          {/* STAT CARDS — 2 col on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total Epoch" value={results.length.toLocaleString()} sub={convergedEpoch?"Konvergen ✓":"Batas maks"} accent="#7C6FCD" />
            <StatCard label="Epoch Konvergen" value={convergedEpoch?convergedEpoch.epoch:"—"} sub={convergedEpoch?"MSE ≤ 0.01":"Tidak konvergen"} accent="#4ADE80" />
            <StatCard label="MSE Awal" value={fmt6(results[0].totalMSE)} sub="Epoch 1" accent="#F87171" />
            <StatCard label="MSE Akhir" value={fmt6(lastMSE)} sub={<MiniSparkline results={results} />} accent="#4ADE80" />
          </div>

          {/* TOOLBAR */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{ border:"1px solid #1E2433" }}>
              {[["all","Semua"],["milestones","Milestone"],["range","Rentang"]].map(([val,label]) => (
                <button key={val} onClick={()=>setViewMode(val)}
                  className="px-2 sm:px-3 py-1.5 text-xs font-medium transition-all"
                  style={{ background:viewMode===val?"#7C6FCD22":"transparent", color:viewMode===val?"#A78BFA":"#64748B", borderRight:"1px solid #1E2433" }}>
                  {label}
                </button>
              ))}
            </div>

            {viewMode==="range" && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <input type="number" value={rangeFrom} min={1} max={results.length}
                  onChange={e=>setRangeFrom(Math.max(1,parseInt(e.target.value)||1))}
                  className="w-14 px-2 py-1 font-mono rounded text-slate-200 text-center"
                  style={{ background:"#1E2433", border:"1px solid #2D3748" }} />
                <span>—</span>
                <input type="number" value={rangeTo} min={1} max={results.length}
                  onChange={e=>setRangeTo(Math.min(results.length,parseInt(e.target.value)||1))}
                  className="w-14 px-2 py-1 font-mono rounded text-slate-200 text-center"
                  style={{ background:"#1E2433", border:"1px solid #2D3748" }} />
              </div>
            )}

            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari epoch..." type="number"
              className="px-2 sm:px-3 py-1.5 text-xs font-mono rounded-lg text-slate-200 w-24 sm:w-28"
              style={{ background:"#1E2433", border:"1px solid #2D3748" }} />

            <button onClick={()=>setSortDir(d=>d==="asc"?"desc":"asc")}
              className="px-2 sm:px-3 py-1.5 text-xs rounded-lg text-slate-400"
              style={{ background:"#1E2433", border:"1px solid #2D3748" }}>
              Epoch {sortDir==="asc"?"↑":"↓"}
            </button>

            <button onClick={()=>setExpandedEpochs(new Set(visibleResults.map(r=>r.epoch)))}
              className="px-2 sm:px-3 py-1.5 text-xs rounded-lg text-slate-400"
              style={{ background:"#1E2433", border:"1px solid #2D3748" }}>
              Buka Semua
            </button>
            <button onClick={()=>setExpandedEpochs(new Set())}
              className="px-2 sm:px-3 py-1.5 text-xs rounded-lg text-slate-400"
              style={{ background:"#1E2433", border:"1px solid #2D3748" }}>
              Tutup Semua
            </button>

            <span className="ml-auto text-xs text-slate-600 whitespace-nowrap">
              {visibleResults.length} / {results.length} epoch
            </span>
          </div>

          {/* TABLE — cards on mobile, full table on desktop */}
          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            {visibleResults.map((row) => {
              const isConverged = row.converged;
              const isMilestone = milestones.includes(results.indexOf(row));
              const d1 = row.data[0], d2 = row.data[1];
              const barW = Math.max(2,(1-row.totalMSE/maxMSE)*100);
              return (
                <div key={row.epoch} className="rounded-xl p-4"
                  style={{ background:"#0F1520", border: isConverged ? "1px solid #4ADE8044" : isMilestone ? "1px solid #7C6FCD33" : "1px solid #1E2433" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-base" style={{ color: isConverged ? "#4ADE80" : "#E5E7EB" }}>
                      Epoch {row.epoch}
                    </span>
                    {isConverged && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color:"#4ADE80", background:"#4ADE8015" }}>✓ Konvergen</span>}
                    {isMilestone && !isConverged && <span className="text-xs" style={{ color:"#7C6FCD" }}>● Milestone</span>}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background:"#1E2433" }}>
                      <div className="h-full rounded-full" style={{ width:`${barW}%`, background: mseColor(row.totalMSE, maxMSE) }} />
                    </div>
                    <span className="font-mono text-xs font-bold" style={{ color: isConverged?"#4ADE80": row.totalMSE>0.1?"#F87171":row.totalMSE>0.05?"#FB923C":"#FDE047" }}>
                      {fmt6(row.totalMSE)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div style={{ background:"#141925", borderRadius:"0.5rem", padding:"0.5rem" }}>
                      <div style={{ color:"#6B7280" }} className="mb-0.5">Data 1 (t=1)</div>
                      <div className="font-mono" style={{ color:"#CBD5E1" }}>y = {d1?fmt6(d1.step.y):"—"}</div>
                      <div className="font-mono" style={{ color: d1&&d1.step.error<0?"#F87171":"#4ADE80" }}>err = {d1?fmt6(d1.step.error):"—"}</div>
                    </div>
                    <div style={{ background:"#141925", borderRadius:"0.5rem", padding:"0.5rem" }}>
                      <div style={{ color:"#6B7280" }} className="mb-0.5">Data 2 (t=0)</div>
                      <div className="font-mono" style={{ color:"#CBD5E1" }}>y = {d2?fmt6(d2.step.y):"—"}</div>
                      <div className="font-mono" style={{ color: d2&&d2.step.error<0?"#F87171":"#4ADE80" }}>err = {d2?fmt6(d2.step.error):"—"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {visibleResults.length===0&&(<div className="py-10 text-center text-sm" style={{ color:"#374151" }}>Tidak ada epoch yang cocok.</div>)}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border:"1px solid #1E2433" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: "640px" }}>
                <thead>
                  <tr style={{ background:"#141925", borderBottom:"1px solid #1E2433" }}>
                    <th className="px-3 py-3 w-8"></th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 tracking-wider">EPOCH</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 tracking-wider">MSE</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 tracking-wider pl-4">KEMAJUAN</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 tracking-wider">y₁</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 tracking-wider">err₁</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 tracking-wider">y₂</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 tracking-wider">err₂</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 tracking-wider">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleResults.map((row,i) => {
                    const isExpanded=expandedEpochs.has(row.epoch);
                    const isActive=activeEpoch===row.epoch;
                    const isConverged=row.converged;
                    const isMilestone=milestones.includes(results.indexOf(row));
                    const d1=row.data[0], d2=row.data[1];
                    const barW=Math.max(2,(1-row.totalMSE/maxMSE)*100);
                    const barColor=mseColor(row.totalMSE,maxMSE);
                    return [
                      <tr key={`row-${row.epoch}`}
                        onClick={()=>toggleExpand(row.epoch)}
                        onMouseEnter={()=>setActiveEpoch(row.epoch)}
                        onMouseLeave={()=>setActiveEpoch(null)}
                        className="cursor-pointer transition-colors"
                        style={{ background:isActive?"#12192B":i%2===0?"#0F1520":"#0D131E", borderBottom:isExpanded?"none":"1px solid #1A2030", borderLeft:isConverged?"3px solid #4ADE80":isMilestone?"3px solid #7C6FCD44":"3px solid transparent" }}>
                        <td className="px-3 py-2.5 text-center"><span className="text-slate-600 text-xs">{isExpanded?"▾":"▸"}</span></td>
                        <td className="px-3 py-2.5">
                          <span className={`font-mono font-bold ${isConverged?"text-emerald-400":"text-slate-300"}`}>{row.epoch}</span>
                          {isMilestone&&!isConverged&&<span className="ml-2 text-xs text-violet-500">●</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-sm">
                          <span className={isConverged?"text-emerald-400 font-bold":row.totalMSE>0.1?"text-red-400":row.totalMSE>0.05?"text-amber-400":"text-yellow-300"}>{fmt6(row.totalMSE)}</span>
                        </td>
                        <td className="px-3 py-2.5 pl-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 sm:w-32 h-1.5 rounded-full" style={{ background:"#1E2433" }}>
                              <div className="h-full rounded-full transition-all" style={{ width:`${barW}%`, background:barColor }} />
                            </div>
                            <span className="text-xs text-slate-600 font-mono w-8">{Math.round(barW)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-300 text-xs">{d1?fmt6(d1.step.y):"—"}</td>
                        <td className={`px-3 py-2.5 text-right font-mono text-xs ${d1&&d1.step.error<0?"text-red-400":"text-emerald-400"}`}>{d1?fmt6(d1.step.error):"—"}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-300 text-xs">{d2?fmt6(d2.step.y):"—"}</td>
                        <td className={`px-3 py-2.5 text-right font-mono text-xs ${d2&&d2.step.error<0?"text-red-400":"text-emerald-400"}`}>{d2?fmt6(d2.step.error):"—"}</td>
                        <td className="px-3 py-2.5 text-right">
                          {isConverged?(<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">✓ OK</span>):(<span className="text-xs text-slate-700">—</span>)}
                        </td>
                      </tr>,
                      isExpanded&&(<ExpandedRow key={`exp-${row.epoch}`} epoch={row} highlighted={isActive} colSpan={9} />)
                    ];
                  })}
                </tbody>
              </table>
            </div>
            {visibleResults.length===0&&(<div className="py-12 text-center text-sm" style={{ color:"#374151" }}>Tidak ada epoch yang cocok.</div>)}
          </div>

          {/* FOOTER NOTE */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pb-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background:"#4ADE8022", border:"2px solid #4ADE80" }} />
              Konvergen
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-500" />
              Klik baris untuk detail
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
