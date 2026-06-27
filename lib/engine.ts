// ============================================================
// BPNN Visualizer — Core Engine
// Algoritma Backpropagation Neural Network
// Arsitektur: 2 input → 4 hidden → 1 output
//
// Urutan sesuai slide dosen Muhammad Faisal Amin:
//   Forward  : z_in → z → y_in → y → error
//   Backward : δ → Δw → δ_in → δ_hidden → Δv → update bobot
//
// CATATAN PENTING:
//   - error  = t - y  (setelah sigmoid, bukan t - y_in)
//   - δ      = (t-y) * y * (1-y)
//   - Online learning: bobot diupdate setelah SETIAP data
//   - e kustom 2.71828183, bukan Math.E
// ============================================================

import type { BPNNConfig, TrainingData, Weights, StepDetail, EpochResult, EpochDataEntry } from './types'
import { INITIAL_WEIGHTS_RAW, TRAINING_DATA_RAW, DEFAULT_CONFIG } from './constants'

// ─── Helpers ─────────────────────────────────────────────────

/** Bulatkan ke 6 digit desimal, persis seperti ketentuan tugas */
export const r6 = (n: number): number =>
  Math.round(n * 1_000_000) / 1_000_000

/**
 * Fungsi sigmoid dengan nilai e kustom dari soal.
 * f(x) = 1 / (1 + e^-x)
 */
export const sigmoid = (x: number, e: number): number =>
  1 / (1 + Math.pow(e, -x))

/**
 * Deep clone objek Weights agar snapshot tidak ter-mutate.
 */
export const cloneWeights = (w: Weights): Weights => ({
  v:  w.v.map(row => [...row]),
  v0: [...w.v0],
  w:  [...w.w],
  w0: w.w0,
})

/**
 * Terapkan nimFactor ke semua bobot dan data input.
 * Target TIDAK dikali nimFactor (sesuai ketentuan dosen).
 */
export const applyNimFactor = (
  rawWeights: Weights,
  rawData: TrainingData[],
  nimFactor: number
): { weights: Weights; data: TrainingData[] } => {
  const weights: Weights = {
    v:  rawWeights.v.map(row => row.map(v => r6(v * nimFactor))),
    v0: rawWeights.v0.map(v => r6(v * nimFactor)),
    w:  rawWeights.w.map(v => r6(v * nimFactor)),
    w0: r6(rawWeights.w0 * nimFactor),
  }

  const data: TrainingData[] = rawData.map(d => ({
    x1:     r6(d.x1 * nimFactor),
    x2:     r6(d.x2 * nimFactor),
    target: d.target, // target tetap
  }))

  return { weights, data }
}

// ─── Core Step ───────────────────────────────────────────────

/**
 * Hitung satu forward + backward pass untuk satu data training.
 * Mengembalikan detail perhitungan lengkap dan bobot baru.
 */
export function computeStep(
  data: TrainingData,
  weights: Weights,
  config: BPNNConfig
): StepDetail {
  const { x1, x2, target } = data
  const { v, v0, w, w0 } = weights
  const { learningRate: a, e } = config

  // ── FORWARD: Hidden Layer ──────────────────────────────────
  // z_in_j = v0_j + (v_1j * x1) + (v_2j * x2)
  const z_in: number[] = v0.map((bias, j) =>
    r6(bias + v[0][j] * x1 + v[1][j] * x2)
  )

  // z_j = sigmoid(z_in_j)
  const z: number[] = z_in.map(val => r6(sigmoid(val, e)))

  // ── FORWARD: Output Layer ──────────────────────────────────
  // y_in = w0 + Σ(w_j * z_j)
  const y_in = r6(
    w0 + w.reduce((sum, wj, j) => sum + wj * z[j], 0)
  )

  // y = sigmoid(y_in)
  const y = r6(sigmoid(y_in, e))

  // ── Error ──────────────────────────────────────────────────
  // error = t - y  (setelah sigmoid, sesuai slide dosen)
  const error = r6(target - y)
  const squaredError = r6(error * error)

  // ── BACKWARD: Output Layer ─────────────────────────────────
  // δ = (t - y) * y * (1 - y)
  const delta = r6((target - y) * y * (1 - y))

  // Δw_j = a * δ * z_j
  const deltaW: number[] = z.map(zj => r6(a * delta * zj))

  // Δw0 = a * δ * 1
  const deltaW0 = r6(a * delta)

  // ── BACKWARD: Hidden Layer ─────────────────────────────────
  // δ_in_j = δ * w_j
  const delta_in: number[] = w.map(wj => r6(delta * wj))

  // δ_j = δ_in_j * z_j * (1 - z_j)
  const deltaHidden: number[] = delta_in.map((din, j) =>
    r6(din * z[j] * (1 - z[j]))
  )

  // Δv_ij = a * δ_j * x_i   (i=0 → x1, i=1 → x2)
  const deltaV: number[][] = [
    deltaHidden.map(dh => r6(a * dh * x1)),
    deltaHidden.map(dh => r6(a * dh * x2)),
  ]

  // Δv0_j = a * δ_j * 1
  const deltaV0: number[] = deltaHidden.map(dh => r6(a * dh))

  // ── UPDATE BOBOT ───────────────────────────────────────────
  // w_j_baru = w_j + Δw_j
  // v_ij_baru = v_ij + Δv_ij
  const newWeights: Weights = {
    v: v.map((row, i) =>
      row.map((vij, j) => r6(vij + deltaV[i][j]))
    ),
    v0: v0.map((vb, j) => r6(vb + deltaV0[j])),
    w:  w.map((wj, j)  => r6(wj + deltaW[j])),
    w0: r6(w0 + deltaW0),
  }

  return {
    z_in, z,
    y_in, y,
    error, squaredError,
    delta, deltaW, deltaW0,
    delta_in, deltaHidden, deltaV, deltaV0,
    newWeights,
  }
}

// ─── Epoch ───────────────────────────────────────────────────

/**
 * Jalankan satu epoch:
 * - Proses semua data training secara berurutan
 * - Bobot diupdate setelah setiap data (online learning)
 * - Bobot hasil data ke-1 langsung dipakai untuk data ke-2
 */
export function runEpoch(
  epochNum: number,
  trainingData: TrainingData[],
  initialWeights: Weights,
  config: BPNNConfig
): EpochResult {
  let currentWeights = cloneWeights(initialWeights)
  const entries: EpochDataEntry[] = []

  for (let i = 0; i < trainingData.length; i++) {
    const weightsBeforeUpdate = cloneWeights(currentWeights)
    const step = computeStep(trainingData[i], currentWeights, config)

    entries.push({
      dataIndex: i,
      input: trainingData[i],
      weightsBeforeUpdate,
      step,
    })

    // Update bobot langsung (online learning)
    currentWeights = cloneWeights(step.newWeights)
  }

  // MSE = (1/2) * Σ error²  — konvensi umum BPNN
  const sumSE = entries.reduce((sum, e) => sum + e.step.squaredError, 0)
  const totalMSE = r6(sumSE / 2)

  const converged = totalMSE <= config.targetError

  return {
    epoch: epochNum,
    data: entries,
    totalMSE,
    converged,
  }
}

// ─── Full Training ────────────────────────────────────────────

/**
 * Jalankan training lengkap sampai konvergen atau maxEpoch tercapai.
 *
 * @param config      Konfigurasi BPNN (NIM, LR, maxEpoch, dll)
 * @param rawData     Data training mentah (sebelum dikali nimFactor)
 * @param rawWeights  Bobot awal mentah (sebelum dikali nimFactor)
 * @returns           Array EpochResult dari epoch 1 sampai konvergen/selesai
 */
export function runTraining(
  config: BPNNConfig = DEFAULT_CONFIG,
  rawData: TrainingData[] = TRAINING_DATA_RAW,
  rawWeights: Weights = INITIAL_WEIGHTS_RAW
): EpochResult[] {
  // Terapkan nimFactor ke bobot & data (satu kali saja)
  const { weights: initialWeights, data: trainingData } =
    applyNimFactor(rawWeights, rawData, config.nimFactor)

  const results: EpochResult[] = []
  let currentWeights = cloneWeights(initialWeights)

  for (let epoch = 1; epoch <= config.maxEpoch; epoch++) {
    const result = runEpoch(epoch, trainingData, currentWeights, config)
    results.push(result)

    // Bobot untuk epoch berikutnya = bobot terakhir dari epoch ini
    const lastEntry = result.data[result.data.length - 1]
    currentWeights = cloneWeights(lastEntry.step.newWeights)

    if (result.converged) break
  }

  return results
}

// ─── Helpers untuk UI ─────────────────────────────────────────

/**
 * Format angka ke string 6 digit desimal (untuk tampilan di UI).
 * e.g. 0.346950 → "0,346950"  (pakai koma sesuai notasi dosen)
 */
export const fmt6 = (n: number): string =>
  r6(n).toFixed(6).replace('.', ',')

/**
 * Build weights dari config NIM (untuk initial state aplikasi).
 */
export function buildInitialState(config: BPNNConfig = DEFAULT_CONFIG) {
  return applyNimFactor(INITIAL_WEIGHTS_RAW, TRAINING_DATA_RAW, config.nimFactor)
}
