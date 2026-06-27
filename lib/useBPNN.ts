// ============================================================
// BPNN Visualizer — State Machine (useBPNN)
// 
// State machine ini mengontrol seluruh siklus hidup aplikasi:
//   idle → running → completed
//                ↕ (step/auto-play)
//
// Pointer navigasi:
//   epochIdx    → epoch ke berapa (index di results[])
//   dataIdx     → data ke-1 atau ke-2 dalam epoch
//   phaseIdx    → fase perhitungan mana yang sedang ditampilkan
//
// Semua hasil training di-compute SEKALI di awal (run),
// lalu state machine hanya berjalan di atas array results[].
// ============================================================

import { useReducer, useCallback, useRef, useEffect } from 'react'
import {
  runTraining,
  buildInitialState,
} from './engine'
import {
  DEFAULT_CONFIG,
  INITIAL_WEIGHTS_RAW,
  TRAINING_DATA_RAW,
} from './constants'
import type { BPNNConfig, EpochResult, Weights, TrainingData } from './types'

// ─── Phase Definitions ───────────────────────────────────────

/**
 * Urutan fase dalam satu pass (per data), sesuai slide dosen.
 * Setiap fase merepresentasikan SATU langkah yang ditampilkan di StepViewer.
 */
export const PHASES = [
  'z_in',        // Penjumlahan terbobot → hidden
  'z',           // Sigmoid hidden
  'y_in',        // Penjumlahan terbobot → output
  'y',           // Sigmoid output
  'error',       // Hitung error & kuadrat error
  'delta',       // Hitung δ output
  'delta_w',     // Hitung Δw (hidden→output)
  'delta_in',    // Hitung δ_in hidden
  'delta_hidden',// Hitung δ hidden
  'delta_v',     // Hitung Δv (input→hidden)
  'update',      // Update semua bobot → tampilkan bobot baru
] as const

export type StepPhase = typeof PHASES[number]

// ─── Mode ────────────────────────────────────────────────────

export type BPNNMode =
  | 'idle'       // Belum ada hasil, menunggu Run
  | 'ready'      // Hasil sudah ada, pointer di posisi awal, siap navigasi
  | 'playing'    // Auto-play aktif
  | 'completed'  // Sudah sampai fase terakhir dari epoch terakhir

// ─── State ───────────────────────────────────────────────────

export interface BPNNState {
  mode: BPNNMode
  config: BPNNConfig

  // Hasil training (diisi setelah run)
  results: EpochResult[]

  // Pointer navigasi
  epochIdx: number    // index ke results[] (0-based)
  dataIdx: number     // 0 atau 1
  phaseIdx: number    // index ke PHASES[]

  // Auto-play
  playSpeed: number   // ms per step (default 800)

  // Error state
  error: string | null
}

// ─── Actions ─────────────────────────────────────────────────

export type BPNNAction =
  | { type: 'RUN'; config?: BPNNConfig }
  | { type: 'RESET' }
  | { type: 'STEP_NEXT' }
  | { type: 'STEP_PREV' }
  | { type: 'JUMP_TO'; epochIdx: number; dataIdx?: number; phaseIdx?: number }
  | { type: 'PLAY_START' }
  | { type: 'PLAY_STOP' }
  | { type: 'SET_SPEED'; ms: number }
  | { type: 'SET_CONFIG'; config: Partial<BPNNConfig> }

// ─── Initial State ───────────────────────────────────────────

const makeInitialState = (config: BPNNConfig = DEFAULT_CONFIG): BPNNState => ({
  mode: 'idle',
  config,
  results: [],
  epochIdx: 0,
  dataIdx: 0,
  phaseIdx: 0,
  playSpeed: 800,
  error: null,
})

// ─── Pointer Helpers ─────────────────────────────────────────

/**
 * Total jumlah "langkah" dalam satu epoch = jumlah data × jumlah fase.
 */
const stepsPerEpoch = (dataCount: number) => dataCount * PHASES.length

/**
 * Konversi (dataIdx, phaseIdx) → flat index dalam satu epoch.
 */
const toFlat = (dataIdx: number, phaseIdx: number) =>
  dataIdx * PHASES.length + phaseIdx

/**
 * Konversi flat index → (dataIdx, phaseIdx).
 */
const fromFlat = (flat: number): { dataIdx: number; phaseIdx: number } => ({
  dataIdx: Math.floor(flat / PHASES.length),
  phaseIdx: flat % PHASES.length,
})

/**
 * Apakah pointer saat ini di langkah paling akhir dari semua epoch?
 */
const isAtEnd = (state: BPNNState): boolean => {
  const { results, epochIdx, dataIdx, phaseIdx } = state
  if (results.length === 0) return false
  return (
    epochIdx === results.length - 1 &&
    dataIdx === results[epochIdx].data.length - 1 &&
    phaseIdx === PHASES.length - 1
  )
}

// ─── Reducer ─────────────────────────────────────────────────

function reducer(state: BPNNState, action: BPNNAction): BPNNState {
  switch (action.type) {

    // ── RUN: compute semua epoch, set pointer ke awal ──────────
    case 'RUN': {
      const config = action.config ?? state.config
      try {
        const results = runTraining(config, TRAINING_DATA_RAW, INITIAL_WEIGHTS_RAW)
        return {
          ...state,
          mode: 'ready',
          config,
          results,
          epochIdx: 0,
          dataIdx: 0,
          phaseIdx: 0,
          error: null,
        }
      } catch (e) {
        return {
          ...state,
          error: e instanceof Error ? e.message : 'Training gagal',
        }
      }
    }

    // ── RESET: kembali ke idle ──────────────────────────────────
    case 'RESET':
      return makeInitialState(state.config)

    // ── STEP_NEXT: maju satu fase ───────────────────────────────
    case 'STEP_NEXT': {
      if (state.results.length === 0) return state
      if (isAtEnd(state)) return { ...state, mode: 'completed' }

      const { epochIdx, dataIdx, phaseIdx, results } = state
      const dataCount = results[epochIdx].data.length
      const flat = toFlat(dataIdx, phaseIdx)
      const maxFlat = stepsPerEpoch(dataCount) - 1

      if (flat < maxFlat) {
        // Masih dalam epoch yang sama
        const next = fromFlat(flat + 1)
        return {
          ...state,
          dataIdx: next.dataIdx,
          phaseIdx: next.phaseIdx,
          mode: state.mode === 'idle' ? 'ready' : state.mode,
        }
      } else {
        // Pindah ke epoch berikutnya
        if (epochIdx < results.length - 1) {
          return {
            ...state,
            epochIdx: epochIdx + 1,
            dataIdx: 0,
            phaseIdx: 0,
          }
        } else {
          // Ini epoch terakhir, fase terakhir
          return { ...state, mode: 'completed' }
        }
      }
    }

    // ── STEP_PREV: mundur satu fase ─────────────────────────────
    case 'STEP_PREV': {
      if (state.results.length === 0) return state

      const { epochIdx, dataIdx, phaseIdx, results } = state
      const flat = toFlat(dataIdx, phaseIdx)

      // Stop auto-play kalau sedang jalan
      const newMode = state.mode === 'playing' ? 'ready' : state.mode

      if (flat > 0) {
        // Masih dalam epoch yang sama
        const prev = fromFlat(flat - 1)
        return {
          ...state,
          mode: newMode,
          dataIdx: prev.dataIdx,
          phaseIdx: prev.phaseIdx,
        }
      } else {
        // Pindah ke epoch sebelumnya, fase terakhir
        if (epochIdx > 0) {
          const prevEpochDataCount = results[epochIdx - 1].data.length
          return {
            ...state,
            mode: newMode,
            epochIdx: epochIdx - 1,
            dataIdx: prevEpochDataCount - 1,
            phaseIdx: PHASES.length - 1,
          }
        } else {
          // Sudah di awal, tidak bergerak
          return { ...state, mode: newMode }
        }
      }
    }

    // ── JUMP_TO: lompat ke posisi tertentu ─────────────────────
    case 'JUMP_TO': {
      const { epochIdx, dataIdx = 0, phaseIdx = 0 } = action
      if (epochIdx < 0 || epochIdx >= state.results.length) return state

      const dataCount = state.results[epochIdx].data.length
      const safeDataIdx = Math.min(dataIdx, dataCount - 1)
      const safePhaseIdx = Math.min(phaseIdx, PHASES.length - 1)

      return {
        ...state,
        mode: state.mode === 'playing' ? 'ready' : state.mode,
        epochIdx,
        dataIdx: safeDataIdx,
        phaseIdx: safePhaseIdx,
      }
    }

    // ── PLAY_START: mulai auto-play ─────────────────────────────
    case 'PLAY_START': {
      if (state.results.length === 0) return state
      if (isAtEnd(state)) return { ...state, mode: 'completed' }
      return { ...state, mode: 'playing' }
    }

    // ── PLAY_STOP: pause auto-play ──────────────────────────────
    case 'PLAY_STOP': {
      if (state.mode !== 'playing') return state
      return { ...state, mode: 'ready' }
    }

    // ── SET_SPEED ───────────────────────────────────────────────
    case 'SET_SPEED':
      return { ...state, playSpeed: action.ms }

    // ── SET_CONFIG: update config (belum run ulang) ─────────────
    case 'SET_CONFIG':
      return {
        ...state,
        config: { ...state.config, ...action.config },
      }

    default:
      return state
  }
}

// ─── Derived Selectors ────────────────────────────────────────

export interface BPNNCursor {
  /** EpochResult yang sedang aktif */
  epoch: EpochResult | null
  /** Nomor epoch 1-based untuk display */
  epochNum: number
  /** Data entry (Data1 atau Data2) yang sedang aktif */
  dataEntry: EpochResult['data'][number] | null
  /** Indeks data 1-based untuk display */
  dataNth: number
  /** Fase yang sedang aktif */
  phase: StepPhase
  /** Nama fase yang sedang aktif */
  phaseLabel: string
  /** Bobot yang aktif saat ini (sebelum update di fase 'update') */
  activeWeights: Weights | null
  /** Progress 0..1 dalam keseluruhan training */
  progress: number
  /** Apakah bisa maju? */
  canNext: boolean
  /** Apakah bisa mundur? */
  canPrev: boolean
  /** Apakah ini langkah terakhir? */
  atEnd: boolean
}

const PHASE_LABELS: Record<StepPhase, string> = {
  z_in:          'Penjumlahan Terbobot Hidden (z_in)',
  z:             'Aktivasi Hidden / Sigmoid (z)',
  y_in:          'Penjumlahan Terbobot Output (y_in)',
  y:             'Aktivasi Output / Sigmoid (y)',
  error:         'Hitung Error & Kuadrat Error',
  delta:         'Hitung δ Output',
  delta_w:       'Hitung Δw (Hidden → Output)',
  delta_in:      'Hitung δ_in Hidden',
  delta_hidden:  'Hitung δ Hidden',
  delta_v:       'Hitung Δv (Input → Hidden)',
  update:        'Update Bobot Baru',
}

// ─── Hook ────────────────────────────────────────────────────

export interface UseBPNNReturn {
  state: BPNNState
  cursor: BPNNCursor
  // Actions
  run: (config?: BPNNConfig) => void
  reset: () => void
  next: () => void
  prev: () => void
  jumpTo: (epochIdx: number, dataIdx?: number, phaseIdx?: number) => void
  play: () => void
  pause: () => void
  setSpeed: (ms: number) => void
  setConfig: (config: Partial<BPNNConfig>) => void
}

export function useBPNN(initialConfig: BPNNConfig = DEFAULT_CONFIG): UseBPNNReturn {
  const [state, dispatch] = useReducer(reducer, makeInitialState(initialConfig))
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Auto-play effect ──────────────────────────────────────
  useEffect(() => {
    if (state.mode !== 'playing') {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current)
        playTimerRef.current = null
      }
      return
    }

    playTimerRef.current = setTimeout(() => {
      dispatch({ type: 'STEP_NEXT' })
    }, state.playSpeed)

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
  }, [state.mode, state.epochIdx, state.dataIdx, state.phaseIdx, state.playSpeed])

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
  }, [])

  // ── Derive cursor ─────────────────────────────────────────
  const cursor: BPNNCursor = (() => {
    const { results, epochIdx, dataIdx, phaseIdx } = state

    if (results.length === 0) {
      return {
        epoch: null,
        epochNum: 0,
        dataEntry: null,
        dataNth: 0,
        phase: PHASES[0],
        phaseLabel: PHASE_LABELS[PHASES[0]],
        activeWeights: null,
        progress: 0,
        canNext: false,
        canPrev: false,
        atEnd: false,
      }
    }

    const epoch = results[epochIdx]
    const dataEntry = epoch.data[dataIdx] ?? null
    const phase = PHASES[phaseIdx]

    // Bobot aktif: pakai weightsBeforeUpdate kecuali di fase 'update'
    // saat fase 'update', tampilkan newWeights
    const activeWeights = dataEntry
      ? phase === 'update'
        ? dataEntry.step.newWeights
        : dataEntry.weightsBeforeUpdate
      : null

    // Progress: posisi flat total / total step keseluruhan
    const totalSteps = results.reduce(
      (sum, r) => sum + r.data.length * PHASES.length,
      0
    )
    const stepsBeforeCurrentEpoch = results
      .slice(0, epochIdx)
      .reduce((sum, r) => sum + r.data.length * PHASES.length, 0)
    const currentFlat = toFlat(dataIdx, phaseIdx)
    const progress = totalSteps > 0
      ? (stepsBeforeCurrentEpoch + currentFlat) / totalSteps
      : 0

    const atEnd = isAtEnd(state)
    const canNext = !atEnd && state.mode !== 'idle'
    const canPrev =
      state.mode !== 'idle' &&
      (epochIdx > 0 || dataIdx > 0 || phaseIdx > 0)

    return {
      epoch,
      epochNum: epoch.epoch,
      dataEntry,
      dataNth: dataIdx + 1,
      phase,
      phaseLabel: PHASE_LABELS[phase],
      activeWeights,
      progress,
      canNext,
      canPrev,
      atEnd,
    }
  })()

  // ── Bound actions ─────────────────────────────────────────
  const run = useCallback(
    (config?: BPNNConfig) => dispatch({ type: 'RUN', config }),
    []
  )
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])
  const next  = useCallback(() => dispatch({ type: 'STEP_NEXT' }), [])
  const prev  = useCallback(() => dispatch({ type: 'STEP_PREV' }), [])
  const jumpTo = useCallback(
    (epochIdx: number, dataIdx = 0, phaseIdx = 0) =>
      dispatch({ type: 'JUMP_TO', epochIdx, dataIdx, phaseIdx }),
    []
  )
  const play  = useCallback(() => dispatch({ type: 'PLAY_START' }), [])
  const pause = useCallback(() => dispatch({ type: 'PLAY_STOP' }), [])
  const setSpeed = useCallback(
    (ms: number) => dispatch({ type: 'SET_SPEED', ms }),
    []
  )
  const setConfig = useCallback(
    (config: Partial<BPNNConfig>) => dispatch({ type: 'SET_CONFIG', config }),
    []
  )

  return {
    state,
    cursor,
    run, reset, next, prev, jumpTo,
    play, pause, setSpeed, setConfig,
  }
}
