import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Screenshot } from "../components/Screenshot";
import { Reveal } from "../components/Reveal";
import { Panel, Pill } from "../components/Panel";
import { Kicker, Headline, Body, Mono } from "../components/Text";
import { C } from "../theme";
import { FONT_HEADING, FONT_MONO } from "../fonts";

const Step: React.FC<{ n: number; title: string; code: string; delay: number; tone: string }> = ({
  n,
  title,
  code,
  delay,
  tone,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 120 } });
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", opacity: p, transform: `translateX(${(1 - p) * 30}px)` }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          background: `${tone}1f`,
          border: `1px solid ${tone}66`,
          color: tone,
          fontFamily: FONT_MONO,
          fontSize: 24,
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div>
        <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 32, color: "#fff" }}>{title}</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 20, color: C.text2, marginTop: 6 }}>{code}</div>
      </div>
    </div>
  );
};

// 1:05 — the Command Module on the real Arena, then the flow that turns a stake into an order.
export const TradeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const panelAt = Math.round(fps * 8.5);
  const shotDim = interpolate(frame, [panelAt - 6, panelAt + 10], [0, 0.86], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Backdrop>
      <Screenshot
        src="shots/arena-tall.png"
        imageHeight={1500}
        keyframes={[
          { frame: 0, scale: 1.3, cx: 1380, cy: 1000 },
          { frame: fps * 3, scale: 1.4, cx: 1380, cy: 1040 },
          { frame: fps * 7.5, scale: 1.4, cx: 1330, cy: 1320 },
          { frame: fps * 12, scale: 1.15, cx: 1250, cy: 1250 },
        ]}
        highlights={[
          { x: 1315, y: 935, w: 350, h: 190, at: Math.round(fps * 0.8), tone: "gold", label: "One tap", labelBelow: true },
          { x: 1315, y: 1352, w: 372, h: 112, at: Math.round(fps * 4.2), tone: "cyan", label: "Before you sign", labelBelow: true },
          { x: 540, y: 1165, w: 725, h: 280, at: Math.round(fps * 6.6), tone: "gold", label: "Quoted off the live book" },
        ]}
      />
      <AbsoluteFill style={{ background: `rgba(5,5,5,${shotDim})` }} />

      {/* the flow panel slides in from the left once the shot has made its point */}
      {frame >= panelAt - 6 && (
        <AbsoluteFill style={{ padding: "100px 160px", justifyContent: "center", alignItems: "flex-start" }}>
          <Reveal delay={panelAt} from="left">
            <Kicker>How a trade flows</Kicker>
            <Headline size={68} style={{ marginTop: 16, maxWidth: 1100 }}>
              Payout and max loss on screen <span style={{ color: C.gold }}>before you sign.</span>
            </Headline>
          </Reveal>
          <div style={{ display: "flex", gap: 60, marginTop: 44, alignItems: "flex-start" }}>
            <Panel variant="gold" padding={40} style={{ width: 880 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
                <Step n={1} title="Tap UP or DOWN" code="quoteBinaryStakeOverBook() — walks the live book" delay={panelAt + 10} tone={C.gold} />
                <Step n={2} title="See the numbers" code="shares · payout-if-win · max loss · worst fill" delay={panelAt + 30} tone={C.cyan} />
                <Step n={3} title="Sign with your own wallet" code="trader.placeOrder({ orderType: MARKET })  // IOC" delay={panelAt + 50} tone={C.core} />
                <Step n={4} title="Routed straight to DreamDEX" code="tagged with NEXT_PUBLIC_BITDRUM_BUILDER" delay={panelAt + 70} tone={C.upBright} />
              </div>
            </Panel>
            <Reveal delay={panelAt + 40} from="left">
              <Panel variant="shell" padding={36} style={{ width: 520 }}>
                <Mono size={18} style={{ color: C.text2, letterSpacing: "0.22em" }}>
                  LIVE QUOTE · 5 USDC ON UP
                </Mono>
                <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  {[
                    ["Shares", "6.64", C.text],
                    ["Payout if win", "+33%", C.upBright],
                    ["Max loss", "5.00", C.downBright],
                    ["Worst fill", "0.753¢", C.gold],
                  ].map(([k, v, c]) => (
                    <div key={k}>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 16, color: C.muted, letterSpacing: "0.18em", textTransform: "uppercase" }}>{k}</div>
                      <div style={{ fontFamily: FONT_HEADING, fontSize: 44, fontWeight: 700, color: c as string, marginTop: 4 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Pill label="min stake" value="✓" tone="neutral" size={15} />
                  <Pill label="last 5s" value="locked" tone="down" size={15} />
                  <Pill label="empty book" value="No liquidity" tone="neutral" size={15} />
                </div>
              </Panel>
            </Reveal>
          </div>
        </AbsoluteFill>
      )}
      {void Body}
    </Backdrop>
  );
};
