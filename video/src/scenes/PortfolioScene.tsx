import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Screenshot } from "../components/Screenshot";
import { Reveal } from "../components/Reveal";
import { Pill } from "../components/Panel";
import { Kicker, Headline } from "../components/Text";
import { C } from "../theme";
import { FONT_BODY, FONT_HEADING, FONT_MONO } from "../fonts";

type Status = "LIVE" | "SETTLING" | "WIN" | "LOSS" | "VOID";
const statusTone: Record<Status, "cyan" | "gold" | "up" | "down" | "neutral"> = {
  LIVE: "cyan",
  SETTLING: "gold",
  WIN: "up",
  LOSS: "down",
  VOID: "neutral",
};

// Illustrative holdings, drawn in the app's own table style over the captured Portfolio page.
const ROWS: { market: string; side: "UP" | "DOWN"; shares: string; entry: string; mark: string; pnl: string; status: Status; extra: string }[] = [
  { market: "BTC 5m · 18:35", side: "UP", shares: "6.64", entry: "0.753¢", mark: "0.81¢", pnl: "+0.38", status: "LIVE", extra: "2:14 left" },
  { market: "ETH 5m · 18:25", side: "DOWN", shares: "12.00", entry: "0.41¢", mark: "1.00¢", pnl: "+7.08", status: "WIN", extra: "redeem 12.00 USDC" },
  { market: "BTC 5m · 18:30", side: "UP", shares: "8.20", entry: "0.61¢", mark: "—", pnl: "—", status: "SETTLING", extra: "oracle pending" },
  { market: "BTC 1m · 18:21", side: "DOWN", shares: "4.10", entry: "0.55¢", mark: "0.00¢", pnl: "−2.26", status: "LOSS", extra: "closed above open" },
];

const PositionsOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const redeemAt = Math.round(fps * 4.2);
  const press = spring({ frame: frame - redeemAt, fps, config: { damping: 12, stiffness: 200 } });
  const done = interpolate(frame, [redeemAt + 20, redeemAt + 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      {/* stat strip — sits exactly over the page's own zeroed chips */}
      <div style={{ position: "absolute", left: 540, top: 250, width: 1150, height: 60, background: "#0d0d0d", display: "flex", alignItems: "center", gap: 14, paddingLeft: 24 }}>
        <Pill label="Resolved PnL" value="+7.35 USDC" tone="up" size={13} />
        <Pill label="Win rate" value="62%" tone="gold" size={13} />
        <Pill label="Live" value="1" tone="cyan" size={13} />
        <Pill label="Redeemable" value={`${done > 0.5 ? "0.00" : "12.00"} USDC`} tone="neutral" size={13} />
      </div>
      {/* positions table — covers the empty "connect to see positions" area */}
      <div style={{ position: "absolute", left: 548, top: 545, width: 1130, height: 315, background: "#0d0d0d", borderRadius: 18, border: `1px solid ${C.borderSubtle}`, overflow: "hidden", paddingTop: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "190px 70px 90px 90px 90px 90px 120px 1fr",
            gap: 12,
            padding: "10px 18px 8px",
            fontFamily: FONT_MONO,
            fontSize: 12,
            letterSpacing: "0.22em",
            color: C.muted,
            textTransform: "uppercase",
          }}
        >
          {["Market", "Side", "Shares", "Entry", "Mark", "PnL", "Status", ""].map((h) => (
            <div key={h}>{h}</div>
          ))}
        </div>
        {ROWS.map((r, i) => {
          const p = spring({ frame: frame - 10 - i * 6, fps, config: { damping: 200, stiffness: 140 } });
          const sideColor = r.side === "UP" ? C.upBright : C.downBright;
          const isWin = r.status === "WIN";
          return (
            <div
              key={r.market}
              style={{
                display: "grid",
                gridTemplateColumns: "190px 70px 90px 90px 90px 90px 120px 1fr",
                alignItems: "center",
                gap: 12,
                height: 52,
                padding: "0 18px",
                borderBottom: `1px solid ${C.borderSubtle}`,
                fontFamily: FONT_MONO,
                fontSize: 15,
                color: C.text,
                opacity: p,
                transform: `translateY(${(1 - p) * 10}px)`,
                background: isWin ? "rgba(22,163,74,0.06)" : "transparent",
              }}
            >
              <div style={{ fontFamily: FONT_BODY, fontSize: 16, color: C.text }}>{r.market}</div>
              <div style={{ color: sideColor, fontWeight: 600 }}>{r.side}</div>
              <div>{r.shares}</div>
              <div style={{ color: C.text2 }}>{r.entry}</div>
              <div style={{ color: C.text2 }}>{r.mark}</div>
              <div style={{ color: r.pnl.startsWith("+") ? C.upBright : r.pnl.startsWith("−") ? C.downBright : C.muted }}>{r.pnl}</div>
              <Pill label={r.status} tone={statusTone[r.status]} size={11} />
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, color: C.muted, fontSize: 13 }}>
                {isWin ? (
                  <div
                    style={{
                      padding: "7px 16px",
                      borderRadius: 999,
                      background: done > 0.5 ? "rgba(34,197,94,0.15)" : C.gold,
                      color: done > 0.5 ? C.upBright : "#0a0a0a",
                      fontFamily: FONT_HEADING,
                      fontWeight: 700,
                      fontSize: 14,
                      transform: `scale(${1 - press * 0.08 + done * 0.08})`,
                      border: done > 0.5 ? `1px solid ${C.upBright}66` : "none",
                    }}
                  >
                    {done > 0.5 ? "Redeemed ✓ 12.00 USDC" : "Redeem 12.00 USDC"}
                  </div>
                ) : (
                  r.extra
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const Node: React.FC<{ label: string; sub: string; tone: string; delay: number; wide?: boolean }> = ({ label, sub, tone, delay, wide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 120 } });
  return (
    <div
      style={{
        opacity: p,
        transform: `scale(${0.92 + p * 0.08})`,
        padding: "26px 34px",
        borderRadius: 24,
        border: `1px solid ${tone}55`,
        background: `${tone}12`,
        width: wide ? 640 : 360,
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 34, color: "#fff" }}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: tone, marginTop: 8, letterSpacing: "0.08em" }}>{sub}</div>
    </div>
  );
};

const Wire: React.FC<{ delay: number; tone: string }> = ({ delay, tone }) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame - delay, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ height: 56, width: 3, background: tone, opacity: 0.7, transform: `scaleY(${w})`, transformOrigin: "top" }} />;
};

// 1:24 — Portfolio with positions, a redeem, then the architecture: nothing between the user and the venue.
export const PortfolioScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const archAt = Math.round(fps * 7.2);
  const shotOut = interpolate(frame, [archAt - 10, archAt + 4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Backdrop>
      <AbsoluteFill style={{ opacity: shotOut }}>
        <Screenshot
          src="shots/portfolio.png"
          keyframes={[
            { frame: 0, scale: 1.1, cx: 1000, cy: 520 },
            { frame: fps * 7, scale: 1.35, cx: 1120, cy: 600 },
          ]}
          highlights={[
            { x: 548, y: 545, w: 1130, h: 315, at: Math.round(fps * 1.4), tone: "gold", label: "Read straight from DreamDEX · marked to the book", labelBelow: true },
          ]}
          overlay={<PositionsOverlay />}
        />
      </AbsoluteFill>

      {frame >= archAt - 10 && (
        <AbsoluteFill style={{ padding: "0 160px", alignItems: "center", justifyContent: "center" }}>
          <Reveal delay={archAt}>
            <Kicker style={{ textAlign: "center" }}>Architecture</Kicker>
            <Headline size={84} style={{ textAlign: "center", marginTop: 14 }}>
              No backend. <span style={{ color: C.gold }}>No BitDrum contracts.</span>
            </Headline>
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 44 }}>
            <Node label="BitDrum" sub="static Next.js · signs with your wallet" tone={C.gold} delay={archAt + 12} wide />
            <Wire delay={archAt + 24} tone={C.gold} />
            <Node label="@somnia-chain/markets-sdk" sub="quoteBinaryStakeOverBook · getOpenPositionsWithPnL · getClaimable" tone={C.cyan} delay={archAt + 30} wide />
            <div style={{ display: "flex", gap: 40 }}>
              {[
                ["DreamDEX indexer", "markets · book · positions", C.core, archAt + 46],
                ["Somnia price feed", "index · 1m candles", C.gold, archAt + 54],
                ["Somnia Shannon", "orders · redeem · chain 50312", C.upBright, archAt + 62],
              ].map(([l, s, t, d]) => (
                <div key={l as string} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Wire delay={(d as number) - 8} tone={t as string} />
                  <Node label={l as string} sub={s as string} tone={t as string} delay={d as number} />
                </div>
              ))}
            </div>
          </div>
        </AbsoluteFill>
      )}
    </Backdrop>
  );
};
