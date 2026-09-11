import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Screenshot } from "../components/Screenshot";
import { Reveal } from "../components/Reveal";
import { Kicker, WordReveal } from "../components/Text";
import { C } from "../theme";

// 0:31 — the real Arena, pushing in on the Model-vs-market card.
export const BitDrumScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dim = interpolate(frame, [fps * 3.6, fps * 4.4], [0, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textAt = Math.round(fps * 3.8);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Screenshot
        src="shots/arena-tall.png"
        imageHeight={1500}
        keyframes={[
          { frame: 0, scale: 0.72, cx: 960, cy: 720 },
          { frame: fps * 3.5, scale: 1.0, cx: 1130, cy: 640 },
          { frame: fps * 9, scale: 1.55, cx: 1420, cy: 560 },
        ]}
        highlights={[{ x: 1315, y: 372, w: 350, h: 364, at: Math.round(fps * 2.2), tone: "cyan", label: "BitDrum Edge" }]}
      />
      <AbsoluteFill style={{ background: `rgba(5,5,5,${dim})` }} />
      <AbsoluteFill style={{ padding: "0 160px", justifyContent: "center", alignItems: "flex-start" }}>
        <Reveal delay={textAt}>
          <Kicker>A purpose-built front end for DreamDEX Event Contracts</Kicker>
        </Reveal>
        <div style={{ maxWidth: 1000, marginTop: 24 }}>
          <WordReveal
            text="With its own opinion of the price."
            delay={textAt + 6}
            stagger={5}
            size={112}
            accentWords={["own", "opinion"]}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
