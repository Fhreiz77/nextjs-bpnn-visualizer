// ============================================================
// BPNN Visualizer — Type Definitions
// ============================================================

export interface BPNNConfig {
  nim: string         // e.g. "3855"
  nimFactor: number   // 4 digit terakhir NIM / 10000, e.g. 0.3855
  learningRate: number  // a = 1
  maxEpoch: number      // 1000
  targetError: number   // 0.01
  e: number             // 2.71828183 (custom, bukan Math.E)
}

export interface TrainingData {
  x1: number
  x2: number
  target: number
}

// Snapshot bobot pada satu titik waktu
export interface Weights {
  v: number[][]   // [2][4] — input ke hidden (v[inputIdx][hiddenIdx])
  v0: number[]    // [4]   — bias ke hidden
  w: number[]     // [4]   — hidden ke output
  w0: number      //        — bias ke output
}

// Detail perhitungan satu forward+backward pass (satu data)
export interface StepDetail {
  // --- Forward: hidden layer ---
  z_in: number[]        // [4] penjumlahan terbobot ke hidden
  z: number[]           // [4] setelah sigmoid

  // --- Forward: output layer ---
  y_in: number          // penjumlahan terbobot ke output
  y: number             // sigmoid(y_in)

  // --- Error ---
  error: number         // t - y  (setelah sigmoid, sesuai slide dosen)
  squaredError: number  // (t - y)²

  // --- Backward: output ---
  delta: number         // δ = (t-y) * y * (1-y)
  deltaW: number[]      // [4] Δw_j = a * δ * z_j
  deltaW0: number       // Δw0 = a * δ * 1

  // --- Backward: hidden ---
  delta_in: number[]    // [4] δ_in_j = δ * w_j
  deltaHidden: number[] // [4] δ_j = δ_in_j * z_j * (1-z_j)
  deltaV: number[][]    // [2][4] Δv_ij = a * δ_j * x_i
  deltaV0: number[]     // [4] Δv0_j = a * δ_j * 1

  // --- Bobot setelah update ---
  newWeights: Weights
}

// Satu data dalam satu epoch
export interface EpochDataEntry {
  dataIndex: number       // 0 atau 1
  input: TrainingData
  weightsBeforeUpdate: Weights
  step: StepDetail
}

// Satu epoch penuh (berisi semua data training)
export interface EpochResult {
  epoch: number
  data: EpochDataEntry[]
  totalMSE: number        // rata-rata (sum squaredError) / 2
  converged: boolean
}
