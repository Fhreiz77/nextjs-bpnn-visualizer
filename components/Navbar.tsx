"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/step",    label: "Step Viewer" },
  { href: "/table",   label: "Epoch Table" },
  { href: "/chart",   label: "Error Chart" },
  { href: "/network", label: "Network" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "#07080Ef5",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid #14172280",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          maxWidth: "1600px",
          margin: "0 auto",
          height: "52px",
          padding: "0 24px",
        }}
      >
        {/* Logo */}
        <Link href="/" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none" }}>
          <div className="flex items-center gap-2.5">
            {/* Icon */}
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #6D5FC0 0%, #9775FA 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="3" cy="5" r="1.8" fill="white" fillOpacity="0.95"/>
                <circle cx="3" cy="11" r="1.8" fill="white" fillOpacity="0.95"/>
                <circle cx="8" cy="3" r="1.8" fill="white"/>
                <circle cx="8" cy="8" r="1.8" fill="white"/>
                <circle cx="8" cy="13" r="1.8" fill="white"/>
                <circle cx="13" cy="8" r="1.8" fill="white" fillOpacity="0.9"/>
                <line x1="4.6" y1="5.4" x2="6.4" y2="3.7" stroke="white" strokeWidth="0.9" strokeOpacity="0.5"/>
                <line x1="4.6" y1="6" x2="6.4" y2="7.6" stroke="white" strokeWidth="0.9" strokeOpacity="0.5"/>
                <line x1="4.6" y1="10.6" x2="6.4" y2="8.4" stroke="white" strokeWidth="0.9" strokeOpacity="0.5"/>
                <line x1="4.6" y1="11.4" x2="6.4" y2="12.6" stroke="white" strokeWidth="0.9" strokeOpacity="0.5"/>
                <line x1="9.6" y1="3.4" x2="11.4" y2="7.2" stroke="white" strokeWidth="0.9" strokeOpacity="0.5"/>
                <line x1="9.6" y1="8" x2="11.4" y2="8" stroke="white" strokeWidth="0.9" strokeOpacity="0.5"/>
                <line x1="9.6" y1="12.6" x2="11.4" y2="8.8" stroke="white" strokeWidth="0.9" strokeOpacity="0.5"/>
              </svg>
            </div>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: 700,
                color: "#C4B5FD",
                letterSpacing: "0.18em",
              }}
            >
              BPNN
            </span>
            <span style={{ color: "#1E2435", fontSize: "14px" }}>│</span>
            <span style={{ fontSize: "11px", color: "#374151" }}>Visualizer</span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center" style={{ gap: "2px" }}>
          {NAV.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: "12px",
                  fontFamily: "monospace",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  color: active ? "#DDD6FE" : "#4B5563",
                  background: active ? "#7C6FCD18" : "transparent",
                  border: `1px solid ${active ? "#7C6FCD30" : "transparent"}`,
                  textDecoration: "none",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.03em",
                  transition: "color 0.15s, background 0.15s",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="hidden sm:flex items-center" style={{ gap: "10px" }}>
          {/* Status */}
          <div
            className="flex items-center"
            style={{
              gap: "7px",
              padding: "5px 12px",
              borderRadius: "99px",
              background: "#1687a710",
              border: "1px solid #4ADE8022",
            }}
          >
            <span
              className="pulse-dot"
              style={{
                display: "block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#1687a7",
              }}
            />
            <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#1687a7" }}>
              Fahrezi 3855
            </span>
          </div>

        </div>

        {/* Hamburger */}
        <button
          className="sm:hidden"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menu"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <span style={{ display: "block", height: "1px", width: "20px", background: "#6B7280", transition: "all 0.2s", transform: menuOpen ? "translateY(6px) rotate(45deg)" : "none" }} />
            <span style={{ display: "block", height: "1px", width: "14px", background: "#6B7280", opacity: menuOpen ? 0 : 1, transition: "opacity 0.2s" }} />
            <span style={{ display: "block", height: "1px", width: "20px", background: "#6B7280", transition: "all 0.2s", transform: menuOpen ? "translateY(-6px) rotate(-45deg)" : "none" }} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ borderTop: "1px solid #14172280", padding: "8px 24px 16px" }}>
          {NAV.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 4px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  color: active ? "#DDD6FE" : "#4B5563",
                  borderBottom: "1px solid #1A1E2E",
                  textDecoration: "none",
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span>{label}</span>
                {active && <span style={{ color: "#7C6FCD", fontSize: "8px" }}>●</span>}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
