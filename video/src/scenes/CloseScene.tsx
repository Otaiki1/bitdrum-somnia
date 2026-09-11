import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Logo } from "../components/Logo";
import { Reveal } from "../components/Reveal";
import { Pill } from "../components/Panel";
import { WordReveal, Body, Mono } from "../components/Text";
import { PriceLine } from "../components/PriceLine";
import { C } from "../theme";

// 1:58 — lockup, tagline, credits.
export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame: frame - Math.round(fps * 2.6), fps, config: { damping: 200, stiffness: 90 } });
  const glow = interpolate(Math.sin(frame / 14), [-1, 1], [0.25, 0.5]);
  return (
    <Backdrop>
      <AbsoluteFill style={{ justifyContent: "flex-end", opacity: 0.22 }}>
        <PriceLine width={1920} height={380} points={140} seed={23} revealFrames={fps * 6} delay={0} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 1500 }}>
          <WordReveal text="Read the signal." delay={4} stagger={6} size={120} style={{ textAlign: "center" }} />
          <WordReveal
            text="Make the call."
            delay={Math.round(fps * 1.2)}
            stagger={6}
            size={120}
            style={{ textAlign: "center" }}
            accentWords={["call"]}
          />
        </div>
        <div style={{ marginTop: 70, opacity: logoIn, transform: `scale(${0.9 + logoIn * 0.1})`, filter: `drop-shadow(0 0 40px rgba(245,185,66,${glow}))` }}>
          <Logo size={120} />
        </div>
        <Reveal delay={Math.round(fps * 3.4)} style={{ marginTop: 44, display: "flex", gap: 16 }}>
          <Pill label="venue" value="DreamDEX Event Contracts" tone="cyan" />
          <Pill label="chain" value="Somnia Shannon" tone="core" />
          <Pill label="sdk" value="@somnia-chain/markets-sdk" tone="neutral" />
          <Pill label="license" value="MIT" tone="up" />
        </Reveal>
        <Reveal delay={Math.round(fps * 4.2)} style={{ marginTop: 40, textAlign: "center" }}>
          <Body size={24} style={{ color: C.text2 }}>
            Built by <span style={{ color: "#fff" }}>CrackedStudios.xyz</span> — Abdulsamad Sadiq · Samuel Onanike
          </Body>
          <Mono size={20} style={{ color: C.muted, marginTop: 10, letterSpacing: "0.12em" }}>
            github.com/Otaiki1/bitdrum-somnia
          </Mono>
        </Reveal>
      </AbsoluteFill>
    </Backdrop>
  );
};
