import Link from "next/link";
import Navbar from "@/components/Navbar";
import { runTraining } from "@/lib/engine";
import { DEFAULT_CONFIG } from "@/lib/constants";

/* ─────────────────── DATA ─────────────────── */

const MODULES = [
  {
    href: "/step",
    title: "Step Viewer",
    desc: "Forward & backward pass dipecah fase per fase. Setiap kalkulasi tampil dengan substitusi angka penuh — tidak ada rumus yang tersembunyi.",
    tag: "PERHITUNGAN",
    color: "#7C6FCD",
    colorBg: "#7C6FCD15",
    colorBorder: "#7C6FCD30",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h16M4 10h16M4 14h10M4 18h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    meta: "Forward + Backward Pass",
    num: "01",
  },
  {
    href: "/table",
    title: "Epoch Table",
    desc: "Ringkasan MSE dan output tiap epoch dalam format tabel. Filter milestone, rentang epoch, atau loncat ke epoch spesifik.",
    tag: "DATA",
    color: "#38BDF8",
    colorBg: "#38BDF815",
    colorBorder: "#38BDF830",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M3 9h18M3 15h18M9 3v18" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
    meta: "MSE + Output per Epoch",
    num: "02",
  },
  {
    href: "/chart",
    title: "Error Chart",
    desc: "Kurva konvergensi MSE interaktif. Zoom brush, toggle skala logaritmik, dan analisis laju penurunan error per rentang.",
    tag: "GRAFIK",
    color: "#FB923C",
    colorBg: "#FB923C15",
    colorBorder: "#FB923C30",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 17L8 11l4 4 4-6 5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 21h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    meta: "Konvergensi MSE",
    num: "03",
  },
  {
    href: "/network",
    title: "Network Diagram",
    desc: "Visualisasi bobot jaringan 2-4-1 per epoch. Lihat animasi perubahan bobot selama proses training berlangsung.",
    tag: "VISUALISASI",
    color: "#4ADE80",
    colorBg: "#4ADE8015",
    colorBorder: "#4ADE8030",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="5" cy="7" r="2" stroke="currentColor" strokeWidth="1.6"/>
        <circle cx="5" cy="17" r="2" stroke="currentColor" strokeWidth="1.6"/>
        <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.6"/>
        <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.6"/>
        <circle cx="12" cy="20" r="2" stroke="currentColor" strokeWidth="1.6"/>
        <circle cx="19" cy="12" r="2" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M7 7.8 10 5.4M7 8.6 10 11.4M7 16.4 10 12.6M7 17.2 10 19.6M14 4.8 17 11M14 12 17 12M14 19.2 17 13" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45"/>
      </svg>
    ),
    meta: "Bobot Jaringan per Epoch",
    num: "04",
  },
];

const PARAMS = [
  { label: "Arsitektur", value: "2 → 4 → 1", highlight: true },
  { label: "Learning Rate", value: "α = 1" },
  { label: "Target MSE", value: "≤ 0.01" },
  { label: "Max Epoch", value: "1.000" },
  { label: "Basis e", value: "2.71828183" },
  { label: "Update Rule", value: "Online" },
  { label: "Fungsi Aktivasi", value: "Sigmoid" },
  { label: "Bias", value: "e = 2.718..." },
];

/* ─────────────────── PAGE ─────────────────── */

export default function Home() {
  const results = runTraining(DEFAULT_CONFIG);
  const totalEpoch = results.length;
  const lastResult = results[totalEpoch - 1];
  const converged = lastResult?.converged ?? false;
  const finalMSE = lastResult?.totalMSE ?? 0;
  const milestoneEpochs = [100, 250, 500, 750, 1000].filter(e => e < totalEpoch);
  const trainingLog = [
    ...milestoneEpochs.map(e => { const r = results[e-1]; return r ? { epoch: e, mse: r.totalMSE.toFixed(4), status: "training" } : null; }).filter(Boolean),
    { epoch: totalEpoch, mse: finalMSE.toFixed(4), status: converged ? "converged" : "training" },
  ];

  const STATS = [
    {
      label: "Hidden Layer",
      value: "4",
      sub: "neuron",
      color: "#7C6FCD",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/>
          <circle cx="8" cy="12" r="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 6v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Total Bobot",
      value: "12",
      sub: "parameter",
      color: "#38BDF8",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 8h12M8 2l4 6-4 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: "Konvergen",
      value: String(totalEpoch),
      sub: "epoch",
      color: "#4ADE80",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 11L6 7l3 3 5-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: "Target MSE",
      value: "0.01",
      sub: "threshold",
      color: "#FB923C",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
      ),
    },
  ];

  return (
    <div style={{ background: "#08090E", minHeight: "100vh", color: "#E2E8F0" }}>
      <Navbar />

      <div
        style={{
          maxWidth: "1600px",
          margin: "0 auto",
          padding: "28px 24px 48px",
        }}
      >

        {/* ══════════ HERO ══════════ */}
        <section
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "24px",
            paddingBottom: "28px",
            borderBottom: "1px solid #13172280",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          {/* Left */}
          <div style={{ flex: "1 1 400px" }}>
            <p
              style={{
                fontSize: "10px",
                fontFamily: "monospace",
                color: "#7C6FCD",
                letterSpacing: "0.2em",
                marginBottom: "10px",
                opacity: 0.9,
              }}
            >
              Artificial Intelligence · 2026
            </p>
            <h1
              style={{
                fontSize: "clamp(28px, 3.5vw, 48px)",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                color: "#F0EFFE",
                marginBottom: "12px",
              }}
            >
              Backpropagation{" "}
              <span style={{ color: "#8B7FDB" }}>Neural Network</span>
              <br />Visualizer
            </h1>
            <p style={{ fontSize: "13px", color: "#4B5563", lineHeight: 1.65, maxWidth: "460px" }}>
              Setiap langkah pelatihan BPNN divisualisasikan secara detail — dari forward pass hingga pembaruan bobot.
              Arsitektur{" "}
              <span style={{ fontFamily: "monospace", color: "#9580D4", fontSize: "12px" }}>2 → 4 → 1</span>{" "}
              untuk klasifikasi kebangkrutan perusahaan.
            </p>
          </div>

          {/* Right */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
            <Link
              href="/step"
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 24px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #7C6FCD 0%, #5E4FB0 100%)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                letterSpacing: "0.01em",
                boxShadow: "0 0 0 1px #7C6FCD40, 0 4px 20px #7C6FCD25",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <polygon points="3,2 12,7 3,12" fill="white"/>
              </svg>
              Mulai Visualisasi
            </Link>
            {/* NIM hint */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "9px 13px",
                borderRadius: "8px",
                background: "#7C6FCD0A",
                border: "1px solid #7C6FCD22",
                maxWidth: "300px",
              }}
            >
              <span style={{ color: "#7C6FCD80", fontSize: "11px", marginTop: "1px", flexShrink: 0 }}>ℹ</span>
              <div>
                <p style={{ fontSize: "10px", fontWeight: 600, color: "#B8A9FF", marginBottom: "2px" }}>
                  Masukkan NIM di tiap halaman tool
                </p>
                <p style={{ fontSize: "9px", color: "#374151", lineHeight: 1.5 }}>
                  4 digit terakhir NIM → faktor personalisasi.{" "}
                  <span style={{ fontFamily: "monospace", color: "#7C6FCD70" }}>3855 → 0.3855</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ QUICK STATS ══════════ */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          {STATS.map(({ label, value, sub, color, icon }) => (
            <div
              key={label}
              className="stat-hover"
              style={{
                background: "#0C0E17",
                border: "1px solid #13172280",
                borderRadius: "10px",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "10px", color: "#374151", fontFamily: "monospace", letterSpacing: "0.08em" }}>
                  {label.toUpperCase()}
                </span>
                <span style={{ color: color, opacity: 0.7 }}>{icon}</span>
              </div>
              <div>
                <span style={{ fontSize: "26px", fontWeight: 700, fontFamily: "monospace", color: color, lineHeight: 1 }}>
                  {value}
                </span>
                <span style={{ fontSize: "11px", color: "#374151", marginLeft: "6px" }}>{sub}</span>
              </div>
            </div>
          ))}
        </section>

        {/* ══════════ MAIN GRID ══════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: "12px",
            alignItems: "start",
          }}
          className="main-grid"
        >

          {/* ── LEFT PANEL ── */}
          <aside style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

            {/* Parameter Panel */}
            <div
              style={{
                background: "#0C0E17",
                border: "1px solid #13172280",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "11px 16px",
                  borderBottom: "1px solid #13172260",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#090B14",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 6h10M6 1v10" stroke="#7C6FCD" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.7"/>
                    <circle cx="6" cy="6" r="2" stroke="#7C6FCD" strokeWidth="1.2" strokeOpacity="0.7"/>
                  </svg>
                  <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#6B7280", letterSpacing: "0.12em" }}>
                    PARAMETER MODEL
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "8px",
                    fontFamily: "monospace",
                    background: "#7C6FCD18",
                    color: "#9580D4",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    letterSpacing: "0.06em",
                  }}
                >
                  CONFIG
                </span>
              </div>

              {/* Params */}
              <div>
                {PARAMS.map(({ label, value, highlight }, i) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 16px",
                      borderBottom: i < PARAMS.length - 1 ? "1px solid #0F1120" : "none",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "#4B5563" }}>{label}</span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontFamily: "monospace",
                        fontWeight: 600,
                        color: highlight ? "#A78BFA" : "#8B87B0",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Training Status */}
            <div
              style={{
                background: "#0C0E17",
                border: "1px solid #13172280",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "11px 16px",
                  borderBottom: "1px solid #13172260",
                  background: "#090B14",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 9L5 6l2.5 2.5L11 3" stroke="#4ADE80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8"/>
                </svg>
                <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#6B7280", letterSpacing: "0.12em" }}>
                  STATUS TRAINING
                </span>
              </div>

              <div style={{ padding: "14px 16px" }}>
                {/* Convergence big number */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "6px",
                    marginBottom: "10px",
                  }}
                >
                  <span style={{ fontSize: "36px", fontWeight: 700, fontFamily: "monospace", color: "#7C6FCD", lineHeight: 1 }}>
                    {totalEpoch}
                  </span>
                  <span style={{ fontSize: "11px", color: "#374151" }}>{converged ? "epoch konvergen" : "epoch (maks)"}</span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: "3px",
                    background: "#141728",
                    borderRadius: "99px",
                    marginBottom: "14px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: converged ? "100%" : `${Math.round((totalEpoch / 1000) * 100)}%`,
                      background: converged ? "linear-gradient(90deg, #5B4EA8 0%, #7C6FCD 60%, #A78BFA 100%)" : "linear-gradient(90deg, #92400E 0%, #FB923C 100%)",
                      borderRadius: "99px",
                    }}
                  />
                </div>

                {/* Log */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {trainingLog.map(({ epoch, mse, status }) => (
                    <div
                      key={epoch}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "4px 0",
                      }}
                    >
                      <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#374151" }}>
                        e{epoch}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: "1px",
                          background: "#0F1220",
                          margin: "0 8px",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "monospace",
                          color: status === "converged" ? "#4ADE80" : "#4B5563",
                          fontWeight: status === "converged" ? 700 : 400,
                        }}
                      >
                        {mse}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Converged badge */}
                <div
                  style={{
                    marginTop: "12px",
                    padding: "7px 10px",
                    borderRadius: "7px",
                    background: converged ? "#4ADE8010" : "#FB923C10",
                    border: converged ? "1px solid #4ADE8020" : "1px solid #FB923C20",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                  }}
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: converged ? "#4ADE80" : "#FB923C", display: "block", flexShrink: 0 }} />
                  <span style={{ fontSize: "10px", color: converged ? "#4ADE80" : "#FB923C", fontFamily: "monospace" }}>
                    MSE {finalMSE.toFixed(4)} {converged ? "≤ 0.01 — Konvergen ✓" : "> 0.01 — Belum konvergen"}
                  </span>
                </div>
              </div>
            </div>

            {/* Dataset Info */}
            <div
              style={{
                background: "#0C0E17",
                border: "1px solid #13172280",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "11px 16px",
                  borderBottom: "1px solid #13172260",
                  background: "#090B14",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <ellipse cx="6" cy="4" rx="4" ry="1.8" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.7"/>
                  <path d="M2 4v4c0 1 1.8 1.8 4 1.8s4-.8 4-1.8V4" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.7"/>
                </svg>
                <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#6B7280", letterSpacing: "0.12em" }}>
                  DATASET
                </span>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#C4C9E0", marginBottom: "4px" }}>
                  Kebangkrutan Perusahaan
                </p>
                <p style={{ fontSize: "10px", color: "#374151", lineHeight: 1.6, marginBottom: "12px" }}>
                  Klasifikasi biner dengan 2 fitur input ekonomi perusahaan.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "6px",
                  }}
                >
                  {[
                    { v: "2", l: "Input" },
                    { v: "4", l: "Hidden" },
                    { v: "1", l: "Output" },
                  ].map(({ v, l }) => (
                    <div
                      key={l}
                      style={{
                        background: "#090B14",
                        border: "1px solid #13172280",
                        borderRadius: "6px",
                        padding: "8px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "monospace", color: "#7C6FCD" }}>{v}</div>
                      <div style={{ fontSize: "9px", color: "#374151", marginTop: "2px" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ── RIGHT PANEL ── */}
          <div>
            {/* Section header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#374151", letterSpacing: "0.12em" }}>
                  VISUALIZATION MODULES
                </span>
                <span
                  style={{
                    fontSize: "8px",
                    fontFamily: "monospace",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "#13172280",
                    color: "#374151",
                  }}
                >
                  4 tools
                </span>
              </div>
              <span style={{ fontSize: "10px", color: "#374151" }}>
                Pilih modul untuk memulai →
              </span>
            </div>

            {/* Module cards grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              {MODULES.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="tool-card-hover"
                  style={{
                    display: "block",
                    background: "#0C0E17",
                    border: "1px solid #13172280",
                    borderRadius: "10px",
                    padding: "20px",
                    textDecoration: "none",
                    color: "inherit",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Top accent strip */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "20px",
                      right: "20px",
                      height: "1px",
                      background: `linear-gradient(90deg, transparent, ${m.color}40, transparent)`,
                    }}
                  />

                  {/* Header row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: "14px",
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "8px",
                        background: m.colorBg,
                        border: `1px solid ${m.colorBorder}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: m.color,
                        flexShrink: 0,
                      }}
                    >
                      {m.icon}
                    </div>

                    {/* Tag + num */}
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "8px",
                          fontFamily: "monospace",
                          fontWeight: 600,
                          color: m.color,
                          background: m.colorBg,
                          border: `1px solid ${m.colorBorder}`,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          marginBottom: "4px",
                          display: "inline-block",
                        }}
                      >
                        {m.tag}
                      </div>
                      <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#1E2435" }}>{m.num} / 04</div>
                    </div>
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#DDD6FE",
                      letterSpacing: "-0.01em",
                      marginBottom: "6px",
                    }}
                  >
                    {m.title}
                  </h2>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#374151",
                      lineHeight: 1.65,
                      marginBottom: "16px",
                    }}
                  >
                    {m.desc}
                  </p>

                  {/* Footer */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "12px",
                      borderTop: "1px solid #0F1220",
                    }}
                  >
                    <span style={{ fontSize: "10px", color: "#1E2435", fontFamily: "monospace" }}>
                      {m.meta}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: m.color,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      Buka
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6h8M6.5 3l3 3-3 3" stroke={m.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Bottom info strip */}
            <div
              style={{
                background: "#0C0E17",
                border: "1px solid #13172280",
                borderRadius: "10px",
                padding: "14px 20px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: "24px",
              }}
            >
              <div>
                <p style={{ fontSize: "9px", fontFamily: "monospace", color: "#374151", letterSpacing: "0.1em", marginBottom: "4px" }}>
                  QUICK GUIDE
                </p>
                <p style={{ fontSize: "11px", color: "#4B5563", lineHeight: 1.65 }}>
                  Mulai dari{" "}
                  <Link href="/step" style={{ color: "#9580D4", textDecoration: "none", fontWeight: 500 }}>Step Viewer</Link>
                  {" "}untuk melihat perhitungan per-langkah, lalu{" "}
                  <Link href="/chart" style={{ color: "#FB923C", textDecoration: "none", fontWeight: 500 }}>Error Chart</Link>
                  {" "}untuk melihat konvergensi MSE, dan{" "}
                  <Link href="/network" style={{ color: "#4ADE80", textDecoration: "none", fontWeight: 500 }}>Network Diagram</Link>
                  {" "}untuk visualisasi bobot antar-epoch.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  flexShrink: 0,
                }}
              >
                {[
                  { href: "/step",    color: "#7C6FCD", abbr: "SV" },
                  { href: "/table",   color: "#38BDF8", abbr: "ET" },
                  { href: "/chart",   color: "#FB923C", abbr: "EC" },
                  { href: "/network", color: "#4ADE80", abbr: "ND" },
                ].map(({ href, color, abbr }) => (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: `${color}12`,
                      border: `1px solid ${color}25`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: color,
                      fontSize: "9px",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      textDecoration: "none",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                  >
                    {abbr}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive override */}
      <style>{`
        @media (max-width: 900px) {
          .main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .main-grid > aside > div:nth-child(3) {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
