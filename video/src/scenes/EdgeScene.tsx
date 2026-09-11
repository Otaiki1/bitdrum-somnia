import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Screenshot } from "../components/Screenshot";
import { Reveal } from "../components/Reveal";
import { Panel, Pill } from "../components/Panel";
import { Kicker, Headline, Body, Mono } from "../components/Text";
import { C } from "../theme";
import { FONT_HEADING, FONT_MONO } from "../fonts";

const Sym: React.FC<{ s: string; color: string; note: string; delay: number }> = ({ s, color, note, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 130 } });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: p, transform: `translateX(${(1 - p) * 24}px)` }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          display: "grid",
          placeItems: "center",
          fontFamily: FONT_MONO,
          fontSize: 32,
          color,
          background: `${color}18`,
          border: `1px solid ${color}55`,
        }}
      >
        {s}
      </div>
      <Body size={28} style={{ color: C.text }}>
        {note}
      </Body>
    </div>
  );
};

// 0:40 — the model itself, then the live Edge page with a real call on it.
export const EdgeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shotAt = Math.round(fps * 12); // cut to the live Edge page
  const formulaOut = interpolate(frame, [shotAt - 12, shotAt], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shotIn = interpolate(frame, [shotAt - 6, shotAt + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The formula draws in piece by piece.
  const part = (i: number) =>
    spring({ frame: frame - 14 - i * 7, fps, config: { damping: 200, stiffness: 120 } });
  const piece = (i: number, node: React.ReactNode, color = "#fff") => (
    <span style={{ opacity: part(i), display: "inline-block", transform: `translateY(${(1 - part(i)) * 20}px)`, color }}>
      {node}
    </span>
  );

  return (
    <Backdrop>
      {/* Part 1: the formula */}
      <AbsoluteFill style={{ padding: "0 160px", justifyContent: "center", opacity: formulaOut }}>
        <Reveal>
          <Kicker color={C.cyan}>BitDrum Edge · fair-value model</Kicker>
        </Reveal>
        <Reveal delay={4}>
          <Headline size={72} style={{ marginTop: 18 }}>
            What is this window actually worth?
          </Headline>
        </Reveal>

        <div style={{ display: "flex", gap: 70, marginTop: 56, alignItems: "flex-start" }}>
          <Panel variant="core" padding={48} style={{ width: 1000 }}>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 74,
                color: "#fff",
                letterSpacing: "-0.01em",
                display: "flex",
                alignItems: "center",
                gap: 18,
                whiteSpace: "nowrap",
              }}
            >
              {piece(0, "P(UP)")}
              {piece(1, "=")}
              {piece(2, "Φ")}
              {piece(3, "(")}
              <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ display: "flex", gap: 14 }}>
                  {piece(4, "ln(")}
                  {piece(4, "S", C.gold)}
                  {piece(4, "/")}
                  {piece(4, "K", C.cyan)}
                  {piece(4, ")")}
                </span>
                <span style={{ height: 4, width: "100%", background: "#fff", opacity: part(5) }} />
                <span style={{ display: "flex", gap: 14 }}>
                  {piece(6, "σ", "#c084fc")}
                  {piece(6, "·")}
                  {piece(6, "√")}
                  {piece(6, "τ", C.upBright)}
                </span>
              </span>
              {piece(7, ")")}
            </div>
            <div style={{ marginTop: 40, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Reveal delay={fps * 6}>
                <Pill label="edge" value="model P(UP) − market P(UP)" tone="cyan" size={19} />
              </Reveal>
              <Reveal delay={fps * 7.5}>
                <Pill label="fires when" value="|edge| > spread/2 + 3%" tone="gold" size={19} />
              </Reveal>
            </div>
          </Panel>

          <div style={{ display: "flex", flexDirection: "column", gap: 26, paddingTop: 8 }}>
            <Sym s="S" color={C.gold} note="Live Somnia index price" delay={fps * 1.6} />
            <Sym s="K" color={C.cyan} note="The window's opening price" delay={fps * 2.4} />
            <Sym s="σ" color="#c084fc" note="Realized vol · last 60 one-minute candles" delay={fps * 3.4} />
            <Sym s="τ" color={C.upBright} note="Minutes to expiry" delay={fps * 4.6} />
          </div>
        </div>
      </AbsoluteFill>

      {/* Part 2: the live Edge page */}
      {frame >= shotAt - 6 && (
        <AbsoluteFill style={{ opacity: shotIn }}>
          <Screenshot
            src="shots/edge.png"
            keyframes={[
              { frame: shotAt, scale: 1.0, cx: 960, cy: 560 },
              { frame: shotAt + fps * 4, scale: 1.25, cx: 850, cy: 590 },
              { frame: shotAt + fps * 9, scale: 1.3, cx: 900, cy: 600 },
              { frame: shotAt + fps * 13, scale: 1.05, cx: 1000, cy: 560 },
            ]}
            highlights={[
              { x: 560, y: 400, w: 268, h: 268, at: shotAt + fps * 1.2, tone: "down", label: "Live call", labelBelow: true },
              { x: 843, y: 570, w: 288, h: 188, at: shotAt + fps * 5.2, tone: "cyan", label: "Plain-English rationale" },
              { x: 1205, y: 570, w: 462, h: 300, at: shotAt + fps * 10.4, tone: "gold", label: "fairValue.ts · 80 lines" },
            ]}
          />
          <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 60 }}>
            <Reveal delay={shotAt + fps * 1.6}>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "18px 26px",
                  borderRadius: 999,
                  background: "rgba(5,5,5,0.78)",
                  border: `1px solid ${C.borderStrong}`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <Pill label="model" value="79.8% UP" tone="core" />
                <Pill label="market" value="84.9% UP" tone="gold" />
                <Pill label="edge" value="−5.1% → DOWN underpriced" tone="down" />
              </div>
            </Reveal>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {void Mono}
      {void FONT_HEADING}
    </Backdrop>
  );
};
