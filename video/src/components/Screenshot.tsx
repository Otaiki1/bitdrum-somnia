import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C } from "../theme";

export type Highlight = {
  // Rectangle in source-image pixel coordinates (1920-wide captures).
  x: number;
  y: number;
  w: number;
  h: number;
  at: number; // frame at which the highlight draws in
  tone?: "gold" | "cyan" | "up" | "down";
  label?: string;
  labelBelow?: boolean;
};

type Props = {
  src: string; // path under public/
  imageWidth?: number;
  imageHeight?: number;
  // Camera: scale and the source-image point that should sit at the center of the frame.
  // Each is interpolated over the scene.
  keyframes: { frame: number; scale: number; cx: number; cy: number }[];
  highlights?: Highlight[];
  style?: React.CSSProperties;
  // Rendered inside the image's coordinate space, so it follows the camera.
  overlay?: React.ReactNode;
};

const toneColor = { gold: C.gold, cyan: C.cyan, up: C.upBright, down: C.downBright };

// A framed screenshot of the real app with a slow camera move and optional callout boxes.
export const Screenshot: React.FC<Props> = ({
  src,
  imageWidth = 1920,
  imageHeight = 1080,
  keyframes,
  highlights = [],
  style,
  overlay,
}) => {
  const frame = useCurrentFrame();
  const frames = keyframes.map((k) => k.frame);
  const ease = (t: number) => t; // interpolate handles easing per option below
  const opts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const scale = interpolate(frame, frames, keyframes.map((k) => k.scale), opts);
  const cx = interpolate(frame, frames, keyframes.map((k) => k.cx), opts);
  const cy = interpolate(frame, frames, keyframes.map((k) => k.cy), opts);
  void ease;

  // Position the image so (cx, cy) in image space lands at the viewport center.
  const tx = 960 - cx * scale;
  const ty = 540 - cy * scale;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: imageWidth,
          height: imageHeight,
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        <Img src={staticFile(src)} style={{ width: imageWidth, height: imageHeight, display: "block" }} />
        {overlay}
        {highlights.map((h, i) => {
          const p = interpolate(frame, [h.at, h.at + 14], [0, 1], opts);
          const color = toneColor[h.tone ?? "gold"];
          return (
            <div key={i} style={{ position: "absolute", left: h.x, top: h.y, width: h.w, height: h.h, opacity: p }}>
              <div
                style={{
                  position: "absolute",
                  inset: -6,
                  borderRadius: 22,
                  border: `3px solid ${color}`,
                  boxShadow: `0 0 0 6px ${color}22, 0 0 48px ${color}55`,
                  transform: `scale(${0.96 + p * 0.04})`,
                }}
              />
              {h.label && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: h.labelBelow ? h.h + 18 : -54,
                    padding: "8px 16px",
                    borderRadius: 999,
                    background: color,
                    color: "#0a0a0a",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// A window frame around a screenshot with soft edges, used when the shot is not full-bleed.
export const Frame: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      position: "relative",
      borderRadius: 28,
      overflow: "hidden",
      border: `1px solid ${C.borderStrong}`,
      boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,185,66,0.08) inset",
      background: C.surface,
      ...style,
    }}
  >
    {children}
  </div>
);
