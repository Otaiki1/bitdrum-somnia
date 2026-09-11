import React from "react";
import { Img, staticFile } from "remotion";
import { C } from "../theme";
import { FONT_HEADING, FONT_MONO } from "../fonts";

export const Logo: React.FC<{ size?: number; wordmark?: boolean; style?: React.CSSProperties }> = ({
  size = 96,
  wordmark = true,
  style,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.28, ...style }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        boxShadow: `0 0 ${size * 0.6}px rgba(245,185,66,0.35)`,
        overflow: "hidden",
      }}
    >
      <Img src={staticFile("logo.png")} style={{ width: size, height: size, display: "block" }} />
    </div>
    {wordmark && (
      <div>
        <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: size * 0.5, color: "#fff", lineHeight: 1 }}>
          BitDrum
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: size * 0.17,
            letterSpacing: "0.34em",
            color: C.gold,
            marginTop: size * 0.1,
            textTransform: "uppercase",
          }}
        >
          Obsidian Core
        </div>
      </div>
    )}
  </div>
);
