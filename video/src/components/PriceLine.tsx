import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";

// Deterministic pseudo-random walk (mulberry32) so every render is identical.
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const usePricePath = (points: number, seed = 7, drift = 0.02, vol = 1) =>
  useMemo(() => {
    const r = rng(seed);
    const out: number[] = [0];
    for (let i = 1; i < points; i++) {
      const shock = (r() - 0.5) * 2 * vol;
      out.push(out[i - 1] + shock + drift);
    }
    return out;
  }, [points, seed, drift, vol]);

type Props = {
  width: number;
  height: number;
  points?: number;
  seed?: number;
  revealFrames?: number; // draw-on length
  delay?: number;
  color?: string;
  openLine?: boolean; // dotted "Open" reference at the first point
  strokeWidth?: number;
  style?: React.CSSProperties;
};

// The live index chart look: gold line with an amber glow and the window's open drawn in.
export const PriceLine: React.FC<Props> = ({
  width,
  height,
  points = 120,
  seed = 7,
  revealFrames = 60,
  delay = 0,
  color = C.gold,
  openLine = true,
  strokeWidth = 4,
  style,
}) => {
  const frame = useCurrentFrame();
  const values = usePricePath(points, seed, 0.03, 1.2);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 24;
  const sx = (i: number) => pad + (i / (points - 1)) * (width - pad * 2);
  const sy = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const visible = interpolate(frame - delay, [0, revealFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lastIdx = Math.max(0, Math.floor(visible * (points - 1)));
  const headX = sx(lastIdx);
  const headY = sy(values[lastIdx]);
  const totalLen = 4000; // generous upper bound for dash trick
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={style}>
      <defs>
        <linearGradient id={`fill-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${seed}`}>
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {openLine && (
        <line
          x1={pad}
          x2={width - pad}
          y1={sy(values[0])}
          y2={sy(values[0])}
          stroke={C.cyan}
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeDasharray="6 8"
        />
      )}
      <path
        d={`${d} L${sx(lastIdx)},${height - pad} L${pad},${height - pad} Z`}
        fill={`url(#fill-${seed})`}
        style={{ clipPath: `inset(0 ${(1 - visible) * 100}% 0 0)` }}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#glow-${seed})`}
        strokeDasharray={totalLen}
        strokeDashoffset={totalLen * (1 - visible)}
        pathLength={totalLen}
      />
      {visible > 0 && (
        <>
          <circle cx={headX} cy={headY} r={14} fill={color} fillOpacity={0.25} />
          <circle cx={headX} cy={headY} r={6} fill={color} />
        </>
      )}
    </svg>
  );
};
