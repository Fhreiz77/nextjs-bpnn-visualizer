// ============================================================
// BPNN Visualizer — Constants & Initial Values
// ============================================================

import type { BPNNConfig, Weights, TrainingData } from './types'

// Bobot awal SEBELUM dikali nimFactor (dari slide dosen)
export const INITIAL_WEIGHTS_RAW: Weights = {
  v: [
    [0.9562, 0.7762, 0.1623, 0.2886], // v_1j (dari input x1)
    [0.1962, 0.6133, 0.0311, 0.9711], // v_2j (dari input x2)
  ],
  v0: [0.7496, 0.3796, 0.7256, 0.1628], // bias ke hidden
  w:  [0.2280, 0.9585, 0.6799, 0.0550], // hidden ke output
  w0: 0.9505,                             // bias ke output
}

// Data training SEBELUM dikali nimFactor (dari slide dosen)
export const TRAINING_DATA_RAW: TrainingData[] = [
  { x1: 0.9,  x2: 0.4,  target: 1 },
  { x1: 0.73, x2: 0.85, target: 0 },
]

// Konfigurasi default (NIM 3855)
export const DEFAULT_CONFIG: BPNNConfig = {
  nim: '3855',
  nimFactor: 0.3855,
  learningRate: 1,
  maxEpoch: 1000,
  targetError: 0.01,
  e: 2.71828183,
}
