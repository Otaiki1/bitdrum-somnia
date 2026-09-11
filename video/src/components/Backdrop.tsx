import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";

// The app's body background: layered radial glows over near-black, plus the
// masked grid from .landing-grid. Glows drift very slowly so the frame is never static.
export const Backdrop: React.FC<{ children?: React.ReactNode; grid?: boolean }> = ({
  children,
  grid = true,
}) => {
  const frame = useCurrentFrame();
  const driftX = Math.sin(frame / 240) * 40;
  const driftY = Math.cos(frame / 300) * 30;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #080808 0%, ${C.bg} 100%)` }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${50 + driftX / 20}% ${-5 + driftY / 20}%, rgba(245,185,66,0.11), transparent 30%),
            radial-gradient(circle at ${18 + driftX / 10}% ${22 + driftY / 10}%, rgba(59,130,246,0.12), transparent 24%),
            radial-gradient(circle at ${85 - driftX / 10}% ${80 - driftY / 10}%, rgba(34,211,238,0.06), transparent 28%)`,
        }}
      />
      {grid && (
        <AbsoluteFill
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
            backgroundSize: "90px 90px",
            backgroundPosition: `${driftX}px ${driftY}px`,
            WebkitMaskImage: "radial-gradient(circle at center, black 30%, transparent 80%)",
            maskImage: "radial-gradient(circle at center, black 30%, transparent 80%)",
          }}
        />
      )}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
