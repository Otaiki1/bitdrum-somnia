import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  children: React.ReactNode;
  delay?: number; // frames after scene start
  from?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  style?: React.CSSProperties;
  exitAt?: number; // frame at which to start fading out (optional)
  exitFrames?: number;
};

// Fade + slide in on a spring. Everything in the video enters through this.
export const Reveal: React.FC<Props> = ({
  children,
  delay = 0,
  from = "up",
  distance = 28,
  style,
  exitAt,
  exitFrames = 12,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 120 } });
  const opacityIn = interpolate(frame - delay, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacityOut =
    exitAt === undefined
      ? 1
      : interpolate(frame, [exitAt, exitAt + exitFrames], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const d = (1 - p) * distance;
  const translate =
    from === "up"
      ? `translateY(${d}px)`
      : from === "down"
        ? `translateY(${-d}px)`
        : from === "left"
          ? `translateX(${d}px)`
          : from === "right"
            ? `translateX(${-d}px)`
            : "none";
  return (
    <div style={{ opacity: opacityIn * opacityOut, transform: translate, ...style }}>{children}</div>
  );
};
