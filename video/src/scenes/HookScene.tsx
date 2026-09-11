import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Logo } from "../components/Logo";
import { Reveal } from "../components/Reveal";
import { PriceLine } from "../components/PriceLine";
import { Pill } from "../components/Panel";
import { Kicker, WordReveal, Body } from "../components/Text";
import { C } from "../theme";
import { FONT_HEADING } from "../fonts";

// 0:00 — logo lockup over a live-looking index line, then the question the video answers.
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const logoIn = spring({ frame, fps, config: { damping: 200, stiffness: 90 } });
  const lockupOut = interpolate(frame, [fps * 5.2, fps * 5.9], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const questionAt = Math.round(fps * 6.2);
  const tail = durationInFrames;

  return (
    <Backdrop>
      {/* the index line sits behind everything */}
      <AbsoluteFill style={{ justifyContent: "flex-end", opacity: 0.85 }}>
        <PriceLine width={1920} height={560} points={160} seed={11} revealFrames={fps * 9} delay={10} />
      </AbsoluteFill>

      {/* lockup */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: lockupOut }}>
        <div style={{ transform: `scale(${0.9 + logoIn * 0.1})`, opacity: logoIn }}>
          <Logo size={140} />
        </div>
        <Reveal delay={18} style={{ marginTop: 44 }}>
          <div
            style={{
              fontFamily: FONT_HEADING,
              fontSize: 44,
              fontWeight: 500,
              color: C.text2,
              letterSpacing: "-0.01em",
            }}
          >
            <span style={{ color: "#fff" }}>BitDrum</span>
            <span style={{ color: C.gold, margin: "0 22px" }}>×</span>
            <span style={{ color: C.cyan }}>DreamDEX</span>
            <span style={{ color: C.muted, margin: "0 22px" }}>on</span>
            <span style={{ color: "#fff" }}>Somnia</span>
          </div>
        </Reveal>
        <Reveal delay={34} style={{ marginTop: 34, display: "flex", gap: 16 }}>
          <Pill label="Windows" value="1m · 5m" tone="gold" />
          <Pill label="Assets" value="BTC · ETH" tone="neutral" />
          <Pill label="Venue" value="Event Contracts" tone="cyan" />
          <Pill label="Chain" value="Shannon 50312" tone="core" />
        </Reveal>
      </AbsoluteFill>

      {/* the question */}
      {frame >= questionAt && (
        <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 160px" }}>
          <Reveal delay={questionAt}>
            <Kicker>The one thing the venue doesn't tell you</Kicker>
          </Reveal>
          <div style={{ marginTop: 28, maxWidth: 1400 }}>
            <WordReveal
              text="Is the price it's quoting actually fair?"
              delay={questionAt + 8}
              stagger={5}
              size={118}
              accentWords={["fair?"]}
            />
          </div>
          <Reveal delay={questionAt + 60} style={{ marginTop: 34 }}>
            <Body size={32}>Real order book. Oracle settlement. No opinion.</Body>
          </Reveal>
        </AbsoluteFill>
      )}
      {void tail}
    </Backdrop>
  );
};
