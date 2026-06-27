"use client";
// @ts-nocheck
import { useReducer, useCallback, useRef, useEffect, useState } from "react";
import { r6, computeStep, runTraining as engineRunTraining, applyNimFactor } from "@/lib/engine";
import { INITIAL_WEIGHTS_RAW, TRAINING_DATA_RAW, DEFAULT_CONFIG } from "@/lib/constants";

// ─── ENGINE ADAPTER ──────────────────────────────────────────

const E_CUSTOM = 2.71828183;

function runTraining(nimFactor = 0.3855, MaxEpoch = 1000) {
  return engineRunTraining({ ...DEFAULT_CONFIG, nimFactor, MaxEpoch });
}

// ─── STATE MACHINE ───────────────────────────────────────────

const PHASES = ["z_in","z","y_in","y","error","delta","delta_w","delta_in","delta_hidden","delta_v","update"];
const toFlat = (d, p) => d * PHASES.length + p;
const fromFlat = (f) => ({ dataIdx: Math.floor(f / PHASES.length), phaseIdx: f % PHASES.length });
const isAtEnd = (s) => s.results.length > 0 && s.epochIdx === s.results.length - 1 && s.dataIdx === s.results[s.epochIdx].data.length - 1 && s.phaseIdx === PHASES.length - 1;

const initState = { mode: "idle", results: [], epochIdx: 0, dataIdx: 0, phaseIdx: 0, playSpeed: 600, nimFactor: 0.3855 };

function reducer(s, a) {
  switch (a.type) {
    case "RUN": {
      try {
        const results = runTraining(a.nimFactor ?? s.nimFactor);
        return { ...s, mode: "ready", results, epochIdx: 0, dataIdx: 0, phaseIdx: 0, nimFactor: a.nimFactor ?? s.nimFactor };
      } catch { return s; }
    }
    case "RESET": return { ...initState, nimFactor: s.nimFactor };
    case "NEXT": {
      if (!s.results.length) return s;
      if (isAtEnd(s)) return { ...s, mode: "completed" };
      const dc = s.results[s.epochIdx].data.length;
      const flat = toFlat(s.dataIdx, s.phaseIdx);
      if (flat < dc * PHASES.length - 1) { const n = fromFlat(flat + 1); return { ...s, dataIdx: n.dataIdx, phaseIdx: n.phaseIdx }; }
      if (s.epochIdx < s.results.length - 1) return { ...s, epochIdx: s.epochIdx + 1, dataIdx: 0, phaseIdx: 0 };
      return { ...s, mode: "completed" };
    }
    case "PREV": {
      if (!s.results.length) return s;
      const flat = toFlat(s.dataIdx, s.phaseIdx);
      const nm = s.mode === "playing" ? "ready" : s.mode;
      if (flat > 0) { const p = fromFlat(flat - 1); return { ...s, mode: nm, dataIdx: p.dataIdx, phaseIdx: p.phaseIdx }; }
      if (s.epochIdx > 0) { const pdc = s.results[s.epochIdx - 1].data.length; return { ...s, mode: nm, epochIdx: s.epochIdx - 1, dataIdx: pdc - 1, phaseIdx: PHASES.length - 1 }; }
      return { ...s, mode: nm };
    }
    case "JUMP_EPOCH": {
      const ei = Math.max(0, Math.min(a.epochIdx, s.results.length - 1));
      return { ...s, mode: s.mode === "playing" ? "ready" : s.mode, epochIdx: ei, dataIdx: 0, phaseIdx: 0 };
    }
    case "PLAY": return s.results.length && !isAtEnd(s) ? { ...s, mode: "playing" } : s;
    case "PAUSE": return s.mode === "playing" ? { ...s, mode: "ready" } : s;
    case "SPEED": return { ...s, playSpeed: a.ms };
    default: return s;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────

const fmt = (n) => {
  if (n === undefined || n === null) return "—";
  const val = r6(n);
  const str = Math.abs(val).toFixed(6);
  return (val < 0 ? "−" : "") + str;
};

const clr = (n) => n < 0 ? "text-red-400" : n > 0 ? "text-emerald-400" : "text-slate-300";

const PHASE_META = {
  z_in:          { label: "Penjumlahan Terbobot Hidden", symbol: "z_in", section: "forward" },
  z:             { label: "Aktivasi Hidden (Sigmoid)", symbol: "z", section: "forward" },
  y_in:          { label: "Penjumlahan Terbobot Output", symbol: "y_in", section: "forward" },
  y:             { label: "Aktivasi Output (Sigmoid)", symbol: "y", section: "forward" },
  error:         { label: "Hitung Error", symbol: "err", section: "error" },
  delta:         { label: "Hitung δ Output", symbol: "δ", section: "backward" },
  delta_w:       { label: "Hitung Δw (Hidden→Output)", symbol: "Δw", section: "backward" },
  delta_in:      { label: "Propagasi Error ke Hidden", symbol: "δ_in", section: "backward" },
  delta_hidden:  { label: "Hitung δ Hidden", symbol: "δⱼ", section: "backward" },
  delta_v:       { label: "Hitung Δv (Input→Hidden)", symbol: "Δv", section: "backward" },
  update:        { label: "Update Semua Bobot", symbol: "W←", section: "update" },
};

const SECTION_COLOR = { forward: "#7C6FCD", error: "#F87171", backward: "#FB923C", update: "#4ADE80" };
const SECTION_LABEL = { forward: "FORWARD PASS", error: "ERROR", backward: "BACKWARD PASS", update: "UPDATE BOBOT" };

// ─── SUB-COMPONENTS ──────────────────────────────────────────

function CalcRow({ label, formula, result, highlight = false, resultClass = "" }) {
  return (
    <div
      className={`py-1.5 px-3 rounded-md transition-colors ${highlight ? "bg-slate-700/60" : ""}`}
      style={{ display: "grid", gridTemplateColumns: "5rem 1fr auto", gap: "0.5rem", alignItems: "center" }}
    >
      <span className="text-slate-400 text-xs font-mono truncate">{label}</span>
      <span className="text-slate-300 text-xs font-mono leading-relaxed break-all">{formula}</span>
      <span className={`text-sm font-mono font-bold text-right whitespace-nowrap min-w-[5.5rem] ${resultClass || "text-violet-300"}`}>
        {result}
      </span>
    </div>
  );
}

function SectionBadge({ section }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1" style={{ background: SECTION_COLOR[section] + "44" }} />
      <span className="text-xs font-bold tracking-widest px-2" style={{ color: SECTION_COLOR[section] }}>
        {SECTION_LABEL[section]}
      </span>
      <div className="h-px flex-1" style={{ background: SECTION_COLOR[section] + "44" }} />
    </div>
  );
}

function PhaseContent({ phase, entry, config }) {
  const { step, input, weightsBeforeUpdate: W } = entry;
  const e = E_CUSTOM;

  if (phase === "z_in") return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 mb-3 font-mono break-all">z_inⱼ = v0ⱼ + (v₁ⱼ × x₁) + (v₂ⱼ × x₂)</p>
      {[0,1,2,3].map(j => (
        <CalcRow key={j}
          label={`z_in${j+1}`}
          formula={`${fmt(W.v0[j])} + (${fmt(W.v[0][j])} × ${fmt(input.x1)}) + (${fmt(W.v[1][j])} × ${fmt(input.x2)})`}
          result={fmt(step.z_in[j])}
          highlight={true}
        />
      ))}
    </div>
  );

  if (phase === "z") return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 mb-3 font-mono">zⱼ = 1 / (1 + e^−z_inⱼ)&nbsp;&nbsp;[e = {e}]</p>
      {[0,1,2,3].map(j => (
        <CalcRow key={j}
          label={`z${j+1}`}
          formula={`1 / (1 + ${e}^−${fmt(step.z_in[j])}) = 1 / ${fmt(1 + Math.pow(e, -step.z_in[j]))}`}
          result={fmt(step.z[j])}
          highlight={true}
        />
      ))}
    </div>
  );

  if (phase === "y_in") return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 mb-3 font-mono break-all">y_in = w0 + (w₁×z₁) + (w₂×z₂) + (w₃×z₃) + (w₄×z₄)</p>
      {[0,1,2,3].map(j => (
        <CalcRow key={j}
          label={`w${j+1}×z${j+1}`}
          formula={`${fmt(W.w[j])} × ${fmt(step.z[j])}`}
          result={fmt(r6(W.w[j] * step.z[j]))}
        />
      ))}
      <div className="border-t border-slate-600 mt-1 pt-1">
        <CalcRow
          label="y_in"
          formula={`${fmt(W.w0)} + ${[0,1,2,3].map(j => fmt(r6(W.w[j]*step.z[j]))).join(" + ")}`}
          result={fmt(step.y_in)}
          highlight={true}
          resultClass="text-violet-300 text-base"
        />
      </div>
    </div>
  );

  if (phase === "y") return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3 font-mono">y = 1 / (1 + e^−y_in)</p>
      <CalcRow
        label="y"
        formula={`1 / (1 + ${e}^−${fmt(step.y_in)}) = 1 / ${fmt(1 + Math.pow(e, -step.y_in))}`}
        result={fmt(step.y)}
        highlight={true}
        resultClass="text-violet-300 text-base"
      />
      <div className="mt-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Target (t)</span><span className="font-mono text-slate-200">{entry.input.target}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Output (y)</span><span className={`font-mono ${clr(step.y)}`}>{fmt(step.y)}</span>
        </div>
      </div>
    </div>
  );

  if (phase === "error") return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3 font-mono">error = t − y &nbsp;|&nbsp; kuadrat error = error²</p>
      <CalcRow label="error" formula={`${entry.input.target} − ${fmt(step.y)}`} result={fmt(step.error)} highlight={true} resultClass={clr(step.error) + " text-base"} />
      <CalcRow label="error²" formula={`(${fmt(step.error)})²`} result={fmt(step.squaredError)} highlight={true} resultClass="text-amber-300 text-base" />
    </div>
  );

  if (phase === "delta") return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3 font-mono">δ = (t − y) × y × (1 − y)</p>
      <CalcRow
        label="δ"
        formula={`(${entry.input.target} − ${fmt(step.y)}) × ${fmt(step.y)} × (1 − ${fmt(step.y)})`}
        result={fmt(step.delta)}
        highlight={true}
        resultClass={clr(step.delta) + " text-base"}
      />
    </div>
  );

  if (phase === "delta_w") return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 mb-3 font-mono">Δwⱼ = a × δ × zⱼ &nbsp;|&nbsp; Δw0 = a × δ</p>
      {[0,1,2,3].map(j => (
        <CalcRow key={j} label={`Δw${j+1}`} formula={`1 × ${fmt(step.delta)} × ${fmt(step.z[j])}`} result={fmt(step.deltaW[j])} resultClass={clr(step.deltaW[j])} />
      ))}
      <CalcRow label="Δw0" formula={`1 × ${fmt(step.delta)}`} result={fmt(step.deltaW0)} resultClass={clr(step.deltaW0)} highlight={true} />
    </div>
  );

  if (phase === "delta_in") return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 mb-3 font-mono">δ_inⱼ = δ × wⱼ</p>
      {[0,1,2,3].map(j => (
        <CalcRow key={j} label={`δ_in${j+1}`} formula={`${fmt(step.delta)} × ${fmt(W.w[j])}`} result={fmt(step.delta_in[j])} resultClass={clr(step.delta_in[j])} highlight={true} />
      ))}
    </div>
  );

  if (phase === "delta_hidden") return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 mb-3 font-mono">δⱼ = δ_inⱼ × zⱼ × (1 − zⱼ)</p>
      {[0,1,2,3].map(j => (
        <CalcRow key={j} label={`δ${j+1}`} formula={`${fmt(step.delta_in[j])} × ${fmt(step.z[j])} × (1 − ${fmt(step.z[j])})`} result={fmt(step.deltaHidden[j])} resultClass={clr(step.deltaHidden[j])} highlight={true} />
      ))}
    </div>
  );

  if (phase === "delta_v") return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 mb-3 font-mono">Δvᵢⱼ = a × δⱼ × xᵢ &nbsp;|&nbsp; Δv0ⱼ = a × δⱼ</p>
      <div className="text-xs text-slate-500 mb-1 px-3">Dari x₁ = {fmt(input.x1)}</div>
      {[0,1,2,3].map(j => (
        <CalcRow key={j} label={`Δv₁${j+1}`} formula={`1 × ${fmt(step.deltaHidden[j])} × ${fmt(input.x1)}`} result={fmt(step.deltaV[0][j])} resultClass={clr(step.deltaV[0][j])} />
      ))}
      <div className="text-xs text-slate-500 mb-1 mt-2 px-3">Dari x₂ = {fmt(input.x2)}</div>
      {[0,1,2,3].map(j => (
        <CalcRow key={j} label={`Δv₂${j+1}`} formula={`1 × ${fmt(step.deltaHidden[j])} × ${fmt(input.x2)}`} result={fmt(step.deltaV[1][j])} resultClass={clr(step.deltaV[1][j])} />
      ))}
      <div className="border-t border-slate-600 mt-2 pt-2">
        <div className="text-xs text-slate-500 mb-1 px-3">Bias Δv0</div>
        {[0,1,2,3].map(j => (
          <CalcRow key={j} label={`Δv0${j+1}`} formula={`1 × ${fmt(step.deltaHidden[j])}`} result={fmt(step.deltaV0[j])} resultClass={clr(step.deltaV0[j])} />
        ))}
      </div>
    </div>
  );

  if (phase === "update") return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 mb-3 font-mono">w_baru = w_lama + Δw &nbsp;|&nbsp; v_baru = v_lama + Δv</p>
      <div>
        <div className="text-xs text-emerald-500 font-bold mb-1 px-1">w (Hidden → Output)</div>
        {[0,1,2,3].map(j => (
          <CalcRow key={j} label={`w${j+1}`} formula={`${fmt(W.w[j])} + (${fmt(step.deltaW[j])})`} result={fmt(step.newWeights.w[j])} resultClass="text-emerald-400" highlight={true} />
        ))}
        <CalcRow label="w0" formula={`${fmt(W.w0)} + (${fmt(step.deltaW0)})`} result={fmt(step.newWeights.w0)} resultClass="text-emerald-400" highlight={true} />
      </div>
      <div>
        <div className="text-xs text-emerald-500 font-bold mb-1 px-1">v (Input → Hidden)</div>
        {[0,1,2,3].map(j => (
          <CalcRow key={j} label={`v₁${j+1}`} formula={`${fmt(W.v[0][j])} + (${fmt(step.deltaV[0][j])})`} result={fmt(step.newWeights.v[0][j])} resultClass="text-emerald-400" />
        ))}
        {[0,1,2,3].map(j => (
          <CalcRow key={j} label={`v₂${j+1}`} formula={`${fmt(W.v[1][j])} + (${fmt(step.deltaV[1][j])})`} result={fmt(step.newWeights.v[1][j])} resultClass="text-emerald-400" />
        ))}
      </div>
    </div>
  );

  return null;
}

// ─── PHASE SIDEBAR ───────────────────────────────────────────

function PhaseSidebar({ currentPhaseIdx, onJump, onClose = undefined }) {
  const groups = [
    { section: "forward", phases: ["z_in","z","y_in","y"] },
    { section: "error", phases: ["error"] },
    { section: "backward", phases: ["delta","delta_w","delta_in","delta_hidden","delta_v"] },
    { section: "update", phases: ["update"] },
  ];

  return (
    <div className="space-y-3">
      {groups.map(({ section, phases }) => (
        <div key={section}>
          <div className="text-xs font-bold tracking-widest mb-1 px-1" style={{ color: SECTION_COLOR[section] + "99" }}>
            {SECTION_LABEL[section]}
          </div>
          {phases.map(phase => {
            const pi = PHASES.indexOf(phase);
            const active = pi === currentPhaseIdx;
            const done = pi < currentPhaseIdx;
            return (
              <button key={phase}
                onClick={() => { onJump(pi); onClose?.(); }}
                className={`w-full text-left px-3 py-1.5 rounded text-xs font-mono transition-all mb-0.5
                  ${active ? "text-white" : done ? "text-slate-500 hover:text-slate-300" : "text-slate-600 hover:text-slate-400"}`}
                style={active ? { background: SECTION_COLOR[section] + "22", borderLeft: `3px solid ${SECTION_COLOR[section]}`, paddingLeft: "10px" } : { borderLeft: "3px solid transparent" }}
              >
                <span className="mr-2">{done ? "✓" : active ? "▶" : "○"}</span>
                {PHASE_META[phase].label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────

export default function BPNNStepViewer() {
  const [state, dispatch] = useReducer(reducer, initState);
  const [nimInput, setNimInput] = useState("3855");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (state.mode !== "playing") { clearTimeout(timerRef.current); return; }
    timerRef.current = setTimeout(() => dispatch({ type: "NEXT" }), state.playSpeed);
    return () => clearTimeout(timerRef.current);
  }, [state.mode, state.epochIdx, state.dataIdx, state.phaseIdx, state.playSpeed]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleRun = () => {
    const last4 = nimInput.slice(-4).padStart(4, "0");
    const nimFactor = parseInt(last4, 10) / 10000;
    setLoading(true);
    setTimeout(() => {
      dispatch({ type: "RUN", nimFactor });
      setLoading(false);
    }, 50);
  };

  const cur = state.results.length > 0 ? state.results[state.epochIdx] : null;
  const entry = cur ? cur.data[state.dataIdx] : null;
  const phase = PHASES[state.phaseIdx];
  const meta = PHASE_META[phase];
  const atEnd = isAtEnd(state);
  const totalEpochs = state.results.length;
  const lastResult = totalEpochs > 0 ? state.results[totalEpochs - 1] : null;

  return (
    <div style={{ background: "#0F1117", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: "#E2E8F0" }}>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #1E2433" }} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight truncate" style={{ color: "#7C6FCD" }}>Step Viewer</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Backpropagation Neural Network · 2-4-1</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            value={nimInput}
            onChange={e => setNimInput(e.target.value)}
            placeholder="NIM"
            className="w-20 sm:w-28 px-2 sm:px-3 py-1.5 text-sm font-mono rounded-md border text-slate-200 bg-slate-800/60"
            style={{ borderColor: "#2D3748" }}
          />
          <button onClick={handleRun} disabled={loading}
            className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap"
            style={{ background: loading ? "#4B5563" : "#7C6FCD", color: "white" }}>
            {loading ? "..." : state.mode === "idle" ? "Mulai" : "Reset"}
          </button>
        </div>
      </div>

      {/* IDLE STATE */}
      {state.mode === "idle" && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="mb-6" style={{ fontSize: "3.5rem", lineHeight: 1 }}>🧠</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#C4B5FD" }}>Mulai training BPNN</h2>
          <p className="text-sm mb-6 max-w-xs" style={{ color: "#6B7280" }}>
            Masukkan NIM kamu di kolom atas, lalu klik{" "}
            <strong style={{ color: "#A5B4FC" }}>Mulai</strong> untuk memvisualisasikan setiap fase backpropagation.
          </p>
          <div className="rounded-xl px-5 py-4 text-left max-w-xs" style={{ background: "#0D0D1A", border: "1px solid #1A1A2E" }}>
            <p className="text-xs font-bold mb-2 font-mono" style={{ color: "#7C6FCD" }}>APA ITU NIM?</p>
            <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
              4 digit terakhir NIM-mu dipakai sebagai faktor personalisasi.
              Contoh: NIM <span className="font-mono" style={{ color: "#A5B4FC" }}>20213855</span> → faktor{" "}
              <span className="font-mono" style={{ color: "#A5B4FC" }}>0.3855</span>, dikali semua bobot dan input.
            </p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      {state.mode !== "idle" && entry && (
        <div className="flex" style={{ height: "calc(100vh - 57px)" }}>

          {/* SIDEBAR — desktop */}
          <div className="hidden lg:block w-52 xl:w-56 shrink-0 overflow-y-auto p-4" style={{ borderRight: "1px solid #1E2433" }}>
            <PhaseSidebar
              currentPhaseIdx={state.phaseIdx}
              onJump={(pi) => {
                // jump phase within current epoch/data
                const s = state;
                // We patch state indirectly via dispatching epoch then manually set phase
                dispatch({ type: "JUMP_EPOCH", epochIdx: s.epochIdx });
                // Use a small trick: dispatch custom phase jump
                setTimeout(() => dispatch({ type: "_PHASE", phaseIdx: pi }), 0);
              }}
            />
          </div>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-40" onClick={() => setSidebarOpen(false)}
              style={{ background: "rgba(0,0,0,0.6)" }}>
              <div className="absolute left-0 top-0 bottom-0 w-64 overflow-y-auto p-4"
                style={{ background: "#0F1117", borderRight: "1px solid #1E2433" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 tracking-widest">FASE</span>
                  <button onClick={() => setSidebarOpen(false)} className="text-slate-500 text-lg leading-none">✕</button>
                </div>
                <PhaseSidebar
                  currentPhaseIdx={state.phaseIdx}
                  onJump={(pi) => dispatch({ type: "JUMP_EPOCH", epochIdx: state.epochIdx })}
                  onClose={() => setSidebarOpen(false)}
                />
              </div>
            </div>
          )}

          {/* MAIN PANEL */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">

            {/* STATUS BAR */}
            <div className="px-3 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-4 text-xs shrink-0 overflow-x-auto" style={{ borderBottom: "1px solid #1E2433" }}>
              {/* Phase toggle mobile */}
              <button onClick={() => setSidebarOpen(true)}
                className="lg:hidden px-2 py-1 rounded text-slate-400 shrink-0"
                style={{ background: "#1E2433" }}>
                ☰ Fase
              </button>

              {/* Epoch */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-slate-500 hidden sm:inline">Epoch</span>
                <button onClick={() => dispatch({ type: "JUMP_EPOCH", epochIdx: state.epochIdx - 1 })}
                  disabled={state.epochIdx === 0}
                  className="w-5 h-5 rounded text-slate-400 hover:text-white disabled:opacity-30 flex items-center justify-center"
                  style={{ background: "#1E2433" }}>‹</button>
                <input
                  type="number"
                  min={1}
                  max={lastResult?.epoch ?? 1}
                  value={cur.epoch}
                  onChange={e => {
                    const targetEpoch = parseInt(e.target.value, 10);
                    if (isNaN(targetEpoch)) return;
                    const idx = state.results.findIndex(r => r.epoch === targetEpoch);
                    if (idx !== -1) dispatch({ type: "JUMP_EPOCH", epochIdx: idx });
                  }}
                  className="font-mono font-bold text-slate-200 text-center rounded"
                  style={{ background: "#1E2433", border: "1px solid #2D3748", width: "4.5rem", padding: "2px 4px" }}
                />
                <span className="text-slate-600 font-mono">/{lastResult?.epoch}</span>
                <button onClick={() => dispatch({ type: "JUMP_EPOCH", epochIdx: state.epochIdx + 1 })}
                  disabled={state.epochIdx === totalEpochs - 1}
                  className="w-5 h-5 rounded text-slate-400 hover:text-white disabled:opacity-30 flex items-center justify-center"
                  style={{ background: "#1E2433" }}>›</button>
              </div>

              <div className="h-4 w-px bg-slate-700 shrink-0 hidden sm:block" />

              {/* Data */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-slate-500">Data</span>
                <span className="font-mono font-bold text-slate-200">{state.dataIdx + 1}/{cur.data.length}</span>
                <span className="text-slate-600 font-mono hidden md:inline">
                  (x₁={fmt(entry.input.x1)}, t={entry.input.target})
                </span>
              </div>

              <div className="h-4 w-px bg-slate-700 shrink-0 hidden sm:block" />

              {/* MSE */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-slate-500">MSE</span>
                <span className={`font-mono font-bold ${cur.converged ? "text-emerald-400" : "text-amber-400"}`}>
                  {cur.totalMSE.toFixed(6)}
                </span>
                {cur.converged && <span className="text-emerald-400 hidden sm:inline">✓</span>}
              </div>

              {/* Progress bar — auto right */}
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <div className="w-20 sm:w-40 h-1 rounded-full" style={{ background: "#1E2433" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(state.epochIdx / Math.max(totalEpochs - 1, 1)) * 100}%`, background: "#7C6FCD" }} />
                </div>
                <span className="text-slate-600 w-6 sm:w-8 text-right">{Math.round((state.epochIdx / Math.max(totalEpochs - 1, 1)) * 100)}%</span>
              </div>
            </div>

            {/* STEP CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Phase header */}
              <div className="mb-4 sm:mb-5">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold tracking-widest" style={{ color: SECTION_COLOR[meta.section] }}>
                    {SECTION_LABEL[meta.section]}
                  </span>
                  <span className="text-xs text-slate-600">Step {state.phaseIdx + 1}/{PHASES.length}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-100">{meta.label}</h2>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  Simbol: <span className="text-slate-300">{meta.symbol}</span>
                </p>
              </div>

              {/* Calculation area */}
              <div className="rounded-xl p-3 sm:p-4 overflow-x-auto" style={{ background: "#141925", border: "1px solid #1E2433" }}>
                <PhaseContent phase={phase} entry={entry} config={{ e: E_CUSTOM }} />
              </div>

              {/* Result summary */}
              {phase === "update" && (
                <div className="mt-4 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: "#0D2318", border: "1px solid #166534" }}>
                  <div className="min-w-0">
                    <div className="text-xs text-emerald-600 font-bold mb-0.5">Bobot diperbarui</div>
                    <div className="text-xs text-emerald-300 font-mono break-all">
                      w = [{entry.step.newWeights.w.map(fmt).join(", ")}]
                    </div>
                    <div className="text-xs text-emerald-300 font-mono">w0 = {fmt(entry.step.newWeights.w0)}</div>
                  </div>
                  {state.dataIdx === cur.data.length - 1 && (
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-xs text-slate-500 mb-0.5">MSE Epoch {cur.epoch}</div>
                      <div className={`font-mono font-bold text-lg ${cur.converged ? "text-emerald-400" : "text-amber-400"}`}>
                        {cur.totalMSE.toFixed(6)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CONTROLS */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center gap-3 shrink-0" style={{ borderTop: "1px solid #1E2433" }}>
              {/* Speed */}
              <div className="flex items-center gap-1.5 order-2 sm:order-1">
                <span className="text-xs text-slate-500">
                  Speed <span className="font-mono" style={{ color: "#A78BFA" }}>
                    {state.playSpeed === 1200 ? "0.5×" : state.playSpeed === 800 ? "1×" : state.playSpeed === 400 ? "2×" : "5×"}
                    <span className="hidden sm:inline text-slate-600"> ({state.playSpeed}ms)</span>
                  </span>
                </span>
                {[1200, 800, 400, 150].map(ms => (
                  <button key={ms} onClick={() => dispatch({ type: "SPEED", ms })}
                    className="px-2 py-1 text-xs rounded font-mono transition-all"
                    style={{ background: state.playSpeed === ms ? "#7C6FCD33" : "#1E2433", color: state.playSpeed === ms ? "#A78BFA" : "#64748B", border: `1px solid ${state.playSpeed === ms ? "#7C6FCD66" : "transparent"}` }}>
                    {ms === 1200 ? "0.5×" : ms === 800 ? "1×" : ms === 400 ? "2×" : "5×"}
                  </button>
                ))}
              </div>

              {/* Nav buttons */}
              <div className="flex items-center gap-2 order-1 sm:order-2 sm:mx-auto">
                <button onClick={() => dispatch({ type: "PREV" })}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg transition-all font-medium"
                  style={{ background: "#1E2433", color: "#94A3B8" }}>
                  ← Prev
                </button>

                {state.mode === "playing" ? (
                  <button onClick={() => dispatch({ type: "PAUSE" })}
                    className="px-5 sm:px-6 py-2 text-xs sm:text-sm rounded-lg font-semibold"
                    style={{ background: "#7C6FCD", color: "white" }}>
                    ⏸ Pause
                  </button>
                ) : (
                  <button onClick={() => dispatch({ type: "PLAY" })}
                    disabled={atEnd}
                    className="px-5 sm:px-6 py-2 text-xs sm:text-sm rounded-lg font-semibold disabled:opacity-40"
                    style={{ background: "#7C6FCD", color: "white" }}>
                    ▶ Play
                  </button>
                )}

                <button onClick={() => dispatch({ type: "NEXT" })}
                  disabled={atEnd}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg transition-all font-medium disabled:opacity-40"
                  style={{ background: "#1E2433", color: "#94A3B8" }}>
                  Next →
                </button>
              </div>

              {/* Mode badge */}
              <div className="order-3 text-center sm:text-right w-24 sm:w-32">
                {state.mode === "completed" && <span className="text-xs text-emerald-400 font-semibold">✓ Selesai</span>}
                {state.mode === "playing" && <span className="text-xs text-violet-400 font-semibold animate-pulse">● Auto-play</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
