import React from "react";
import { C, RADIUS } from "../theme";

type Variant = "shell" | "gold" | "core" | "up" | "down";

const surface: Record<Variant, string> = {
  shell:
    "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)), linear-gradient(145deg, rgba(17,17,17,0.98), rgba(9,9,9,0.96))",
  gold: "radial-gradient(circle at top right, rgba(245,185,66,0.14), transparent 40%), linear-gradient(145deg, #111111, #090909)",
  core: "radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 42%), linear-gradient(145deg, #0e1220, #090909)",
  up: "radial-gradient(circle at top, rgba(22,163,74,0.18), transparent 50%), linear-gradient(145deg, #0b140e, #090909)",
  down: "radial-gradient(circle at top, rgba(220,38,38,0.18), transparent 50%), linear-gradient(145deg, #150b0b, #090909)",
};

const ring: Record<Variant, string> = {
  shell: C.borderSubtle,
  gold: "rgba(245,185,66,0.28)",
  core: "rgba(59,130,246,0.32)",
  up: "rgba(34,197,94,0.35)",
  down: "rgba(239,68,68,0.35)",
};

export const Panel: React.FC<{
  children: React.ReactNode;
  variant?: Variant;
  style?: React.CSSProperties;
  radius?: number;
  padding?: number;
}> = ({ children, variant = "shell", style, radius = RADIUS, padding = 36 }) => (
  <div
    style={{
      position: "relative",
      overflow: "hidden",
      borderRadius: radius,
      border: `1px solid ${ring[variant]}`,
      background: surface[variant],
      boxShadow: "0 28px 80px rgba(0,0,0,0.62)",
      padding,
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), transparent 26%)",
      }}
    />
    <div style={{ position: "relative" }}>{children}</div>
  </div>
);

// The little "LABEL  value" chips the app uses everywhere.
export const Pill: React.FC<{
  label: string;
  value?: React.ReactNode;
  tone?: "neutral" | "gold" | "cyan" | "up" | "down" | "core";
  size?: number;
  style?: React.CSSProperties;
}> = ({ label, value, tone = "neutral", size = 20, style }) => {
  const tones = {
    neutral: { bg: "rgba(255,255,255,0.04)", border: C.borderSubtle, fg: C.text2, val: C.text },
    gold: { bg: "rgba(245,185,66,0.10)", border: "rgba(245,185,66,0.35)", fg: C.gold, val: C.gold },
    cyan: { bg: "rgba(34,211,238,0.10)", border: "rgba(34,211,238,0.35)", fg: C.cyan, val: C.cyan },
    core: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.38)", fg: "#93c5fd", val: "#bfdbfe" },
    up: { bg: "rgba(22,163,74,0.14)", border: "rgba(34,197,94,0.4)", fg: C.upBright, val: C.upBright },
    down: { bg: "rgba(220,38,38,0.14)", border: "rgba(239,68,68,0.4)", fg: C.downBright, val: C.downBright },
  }[tone];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: `${size * 0.5}px ${size * 0.9}px`,
        borderRadius: 999,
        background: tones.bg,
        border: `1px solid ${tones.border}`,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: size,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: tones.fg,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ opacity: 0.8 }}>{label}</span>
      {value !== undefined && (
        <span style={{ color: tones.val, letterSpacing: "0", fontWeight: 600, textTransform: "none" }}>
          {value}
        </span>
      )}
    </div>
  );
};
