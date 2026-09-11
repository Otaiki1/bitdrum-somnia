import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Reveal } from "../components/Reveal";
import { Panel, Pill } from "../components/Panel";
import { Kicker, Headline, Body, Mono } from "../components/Text";
import { C } from "../theme";
import { FONT_HEADING, FONT_MONO } from "../fonts";

// 1:38 — why Somnia (a window timeline with the trade inside it), then the business model.
export const SomniaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bizAt = Math.round(fps * 9.5);
  const tlOut = interpolate(frame, [bizAt - 10, bizAt + 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // The 5-minute window bar fills; the whole trade lands in its first sliver, which we magnify.
  const fill = interpolate(frame, [10, fps * 8.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const barW = 1560;
  const magW = 1560;
  const MAG_SECONDS = 12; // the magnified slice
  const magFrac = MAG_SECONDS / 300;
  const events = [
    { s: 1.4, label: "quote", tone: C.cyan, note: "book walked, payout shown" },
    { s: 4.8, label: "sign", tone: C.gold, note: "wallet confirms" },
    { s: 5.7, label: "fill", tone: C.upBright, note: "next block · < 1 s later" },
  ];
  const magIn = spring({ frame: frame - Math.round(fps * 2.2), fps, config: { damping: 200, stiffness: 100 } });
  const blocks = Array.from({ length: Math.floor(MAG_SECONDS / 0.8) }, (_, i) => i * 0.8 + 0.4);

  return (
    <Backdrop>
      <AbsoluteFill style={{ padding: "0 180px", justifyContent: "center", opacity: tlOut }}>
        <Reveal>
          <Kicker color={C.cyan}>Why Somnia</Kicker>
        </Reveal>
        <Reveal delay={4}>
          <Headline size={80} style={{ marginTop: 16 }}>
            Sub-second blocks make <span style={{ color: C.cyan }}>5-minute binaries</span> viable at all.
          </Headline>
        </Reveal>

        {/* the full window */}
        <Reveal delay={24} style={{ marginTop: 64 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <Mono size={19} style={{ color: C.text2, letterSpacing: "0.22em" }}>0:00 · WINDOW OPENS · K = $77,843.40</Mono>
            <Mono size={19} style={{ color: C.text2, letterSpacing: "0.22em" }}>5:00 · ORACLE RESOLVES</Mono>
          </div>
          <div style={{ position: "relative", width: barW, height: 22, borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.borderSubtle}` }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: barW * fill, borderRadius: 999, background: `linear-gradient(90deg, ${C.gold}, ${C.amber})`, boxShadow: `0 0 26px ${C.gold}55` }} />
            {/* the slice we magnify */}
            <div style={{ position: "absolute", left: 0, top: -8, bottom: -8, width: barW * magFrac, borderRadius: 8, border: `2px solid ${C.cyan}`, opacity: magIn, boxShadow: `0 0 18px ${C.cyan}66` }} />
          </div>
        </Reveal>

        {/* the magnifier */}
        <div style={{ marginTop: 26, opacity: magIn, transform: `translateY(${(1 - magIn) * 20}px)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <Mono size={18} style={{ color: C.cyan, letterSpacing: "0.22em" }}>FIRST {MAG_SECONDS} SECONDS · MAGNIFIED</Mono>
            <Mono size={18} style={{ color: C.muted, letterSpacing: "0.22em" }}>| = ONE SOMNIA BLOCK</Mono>
          </div>
          <div style={{ position: "relative", width: magW, height: 150, borderRadius: 22, border: `1px solid rgba(34,211,238,0.35)`, background: "rgba(34,211,238,0.05)" }}>
            {blocks.map((b, i) => {
              const at = Math.round(fps * 2.6) + i * 2;
              const o = interpolate(frame - at, [0, 6], [0, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return <div key={i} style={{ position: "absolute", left: (b / MAG_SECONDS) * magW, top: 58, width: 2, height: 34, background: C.cyan, opacity: o }} />;
            })}
            {events.map((e) => {
              const at = Math.round(fps * 3.2) + (e.s / MAG_SECONDS) * fps * 4;
              const p = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 160 } });
              return (
                <div key={e.label} style={{ position: "absolute", left: (e.s / MAG_SECONDS) * magW, top: 22, transform: `translateX(-50%) scale(${p})`, opacity: p, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 260 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 22, color: e.tone, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}>{e.label}</div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: e.tone, boxShadow: `0 0 22px ${e.tone}` }} />
                  <div style={{ fontFamily: FONT_MONO, fontSize: 15, color: C.text2, marginTop: 4 }}>{e.s.toFixed(1)}s · {e.note}</div>
                </div>
              );
            })}
          </div>
          <Reveal delay={Math.round(fps * 5.6)} style={{ marginTop: 34, display: "flex", gap: 16 }}>
            <Pill label="block time" value="< 1 s" tone="cyan" />
            <Pill label="quote → fill" value="≈ 6 s of a 300 s window" tone="gold" />
            <Pill label="venue" value="real CLOB · oracle-settled" tone="core" />
          </Reveal>
        </div>
      </AbsoluteFill>

      {frame >= bizAt - 10 && (
        <AbsoluteFill style={{ padding: "0 180px", justifyContent: "center" }}>
          <Reveal delay={bizAt}>
            <Kicker>Business model</Kicker>
            <Headline size={84} style={{ marginTop: 16, maxWidth: 1500 }}>
              BitDrum earns on the flow it creates.
            </Headline>
          </Reveal>
          <div style={{ display: "flex", gap: 40, marginTop: 52, alignItems: "stretch" }}>
            <Reveal delay={bizAt + 14} style={{ flex: 1 }}>
              <Panel variant="gold" padding={40} style={{ height: "100%" }}>
                <Mono size={18} style={{ color: C.gold, letterSpacing: "0.22em" }}>EVERY ORDER IS TAGGED</Mono>
                <div style={{ fontFamily: FONT_MONO, fontSize: 30, color: "#fff", marginTop: 20, lineHeight: 1.5 }}>
                  placeOrder({"{"}
                  <br />
                  &nbsp;&nbsp;pool, side, price, quantity,
                  <br />
                  &nbsp;&nbsp;<span style={{ color: C.gold }}>builder: BITDRUM</span>
                  <br />
                  {"}"})
                </div>
                <Body size={26} style={{ marginTop: 20 }}>DreamDEX pays a routing fee on attributed flow.</Body>
              </Panel>
            </Reveal>
            <Reveal delay={bizAt + 28} style={{ flex: 1 }}>
              <Panel variant="shell" padding={40} style={{ height: "100%" }}>
                <Mono size={18} style={{ color: C.text2, letterSpacing: "0.22em" }}>WITHOUT RUNNING</Mono>
                <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 24 }}>
                  {["a market", "a vault", "a keeper"].map((x, i) => (
                    <Reveal key={x} delay={bizAt + 36 + i * 8} from="left">
                      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(220,38,38,0.14)", border: "1px solid rgba(239,68,68,0.4)", color: C.downBright, fontFamily: FONT_MONO, fontSize: 22 }}>✕</div>
                        <div style={{ fontFamily: FONT_HEADING, fontSize: 38, fontWeight: 700, color: "#fff", textDecoration: "line-through", textDecorationColor: C.downBright, textDecorationThickness: 3 }}>{x}</div>
                      </div>
                    </Reveal>
                  ))}
                </div>
                <Body size={26} style={{ marginTop: 26, color: C.text }}>
                  The signal is the product. <span style={{ color: C.cyan }}>The venue is DreamDEX.</span>
                </Body>
              </Panel>
            </Reveal>
          </div>
        </AbsoluteFill>
      )}
    </Backdrop>
  );
};
