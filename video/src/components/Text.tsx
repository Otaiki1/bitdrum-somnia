import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { FONT_BODY, FONT_HEADING, FONT_MONO } from "../fonts";

export const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color = C.gold,
  style,
}) => (
  <div
    style={{
      fontFamily: FONT_MONO,
      fontSize: 18,
      letterSpacing: "0.32em",
      textTransform: "uppercase",
      color,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Headline: React.FC<{
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, size = 96, style }) => (
  <div
    style={{
      fontFamily: FONT_HEADING,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.02,
      letterSpacing: "-0.03em",
      color: "#ffffff",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Body: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  children,
  size = 30,
  style,
}) => (
  <div
    style={{
      fontFamily: FONT_BODY,
      fontWeight: 400,
      fontSize: size,
      lineHeight: 1.45,
      color: C.text2,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Mono: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  children,
  size = 24,
  style,
}) => (
  <div style={{ fontFamily: FONT_MONO, fontSize: size, color: C.text, ...style }}>{children}</div>
);

// Word-by-word headline reveal, each word on its own spring.
export const WordReveal: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  size?: number;
  style?: React.CSSProperties;
  accentWords?: string[];
}> = ({ text, delay = 0, stagger = 4, size = 96, style, accentWords = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <Headline size={size} style={style}>
      {words.map((w, i) => {
        const f = frame - delay - i * stagger;
        const p = spring({ frame: f, fps, config: { damping: 200, stiffness: 140 } });
        const o = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const accent = accentWords.includes(w.replace(/[.,]/g, ""));
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: "0.24em",
              opacity: o,
              transform: `translateY(${(1 - p) * 30}px)`,
              color: accent ? C.gold : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </Headline>
  );
};
