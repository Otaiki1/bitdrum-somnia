import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Reveal } from "../components/Reveal";
import { Panel, Pill } from "../components/Panel";
import { Kicker, Headline, Body, Mono } from "../components/Text";
import { C } from "../theme";
import { FONT_HEADING, FONT_MONO } from "../fonts";

const pad = (n: number) => String(n).padStart(2, "0");

// 0:14 — a YES share at 0.73, a ticking countdown, and the question a trader can't answer in time.
export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Countdown from 2:00, ticking in real time.
  const secondsLeft = Math.max(0, 120 - Math.floor(frame / fps));
  const tick = frame % fps;
  const tickScale = 1 + interpolate(tick, [0, 4, 12], [0, 0.05, 0], { extrapolateRight: "clamp" });

  const priceIn = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const price = 0.73 * priceIn;

  const q1 = Math.round(fps * 6.5); // "is that right?"
  const q2 = Math.round(fps * 10.5); // "no trader can…"
  const q3 = Math.round(fps * 14); // "raw book doesn't try"

  return (
    <Backdrop>
      <AbsoluteFill style={{ padding: "0 160px", flexDirection: "row", gap: 80, alignItems: "center" }}>
        {/* left: the share card */}
        <div style={{ width: 760, display: "flex", flexDirection: "column", gap: 28 }}>
          <Reveal>
            <Kicker>DreamDEX · BTC 5m · YES ask</Kicker>
          </Reveal>
          <Reveal delay={4}>
            <Panel variant="up" padding={44} style={{ width: 760 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Mono size={20} style={{ color: C.text2, letterSpacing: "0.22em" }}>
                    CLOSES ABOVE OPEN
                  </Mono>
                  <div
                    style={{
                      fontFamily: FONT_HEADING,
                      fontWeight: 700,
                      fontSize: 150,
                      color: C.upBright,
                      lineHeight: 1,
                      marginTop: 10,
                    }}
                  >
                    {price.toFixed(2)}
                    <span style={{ fontSize: 60, color: C.text2, marginLeft: 8 }}>¢</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Mono size={20} style={{ color: C.text2, letterSpacing: "0.22em" }}>
                    TIME LEFT
                  </Mono>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 84,
                      color: C.gold,
                      marginTop: 10,
                      transform: `scale(${tickScale})`,
                      transformOrigin: "right center",
                    }}
                  >
                    {Math.floor(secondsLeft / 60)}:{pad(secondsLeft % 60)}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
                <Pill label="Implied P(UP)" value="73%" tone="up" />
                <Pill label="vs open" value="+0.04%" tone="cyan" />
                <Pill label="Spread" value="2.7¢" tone="neutral" />
                <Pill label="Mode" value="reference" tone="neutral" />
              </div>
            </Panel>
          </Reveal>
        </div>

        {/* right: the question stack */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 36 }}>
          <Reveal delay={40}>
            <Body size={36} style={{ color: C.text }}>
              “The book thinks there’s a <span style={{ color: C.upBright, fontWeight: 600 }}>73% chance</span> BTC
              closes above the open.”
            </Body>
          </Reveal>
          <Reveal delay={q1}>
            <Headline size={112} style={{ color: C.gold }}>
              Is that right?
            </Headline>
          </Reveal>
          <Reveal delay={q2}>
            <Body size={34}>
              No trader can work that out in the seconds a window lasts.
            </Body>
          </Reveal>
          <Reveal delay={q3}>
            <Body size={34} style={{ color: C.muted }}>
              And the raw order book doesn't try.
            </Body>
          </Reveal>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
