# BitDrum × DreamDEX — the signal layer for Somnia's Up/Down markets

**One line:** BitDrum tells you when DreamDEX has the price wrong — then lets you act on it in one tap, with payout and max loss on screen before you sign.

## The 30-second version

DreamDEX runs rolling 1-minute and 5-minute Up/Down markets on BTC and ETH. Every window is a binary question — *will the index close at or above the opening price?* — traded on a real order book and settled by the Somnia oracle. It's fast, it's liquid, and it's honest.

It just never tells you whether the price is *fair*.

A YES share at 0.73 means the book thinks there's a 73 % chance BTC finishes above the open. But with two minutes left and BTC sitting 0.04 % above the open, is 73 % right? Or is that share worth 0.60 and someone is about to overpay? A human can't compute that in the seconds a window lasts. The raw order-book UI doesn't try.

**BitDrum does.** For the live window, it computes its own probability of UP from three things a trader can see but can't combine fast enough: how far price has moved from the open, how much time is left, and how volatile the last hour has been. Then it compares that to what the book is charging. When the gap is bigger than the spread plus a margin, BitDrum Edge fires a call — with a one-sentence explanation of why.

During the build, running against live Shannon data, it fired this on its own:

> **UP 15 %** — *Price is −0.039 % from the open with 135 s left (z = −0.29). Model 38.5 % UP vs market 31.9 %: UP is underpriced by 6.6 %.*

That's the product. Not a black box. A number you can argue with.

## What's in the app

**Arena.** The Somnia price index, charted live with the window's opening price drawn as a line — so "is it above or below the open?" is answered at a glance. A countdown. The current window's top-of-book for both sides. BTC or ETH, 1 m or 5 m. It rolls to the next window automatically when one expires.

**The Command Module.** Tap UP or DOWN and BitDrum quotes your stake against the *live* DreamDEX book — walking the levels, not guessing from the top — and shows **payout if you win**, **max loss**, and the **worst fill price** before you sign. Then it routes a market order signed by your own wallet. Stake too small for the pool's minimum? It says so. Book empty on your side? It says so. Last five seconds of a window? Trading locks, because the order would race the oracle.

**Edge.** The model, laid bare: model P(UP) and market P(UP) as two bars, the edge between them, the hurdle it has to clear, and every input — live price, open, move, time left, realized σ, z-score, best asks. Plus the formula, in plain text, with its limits stated.

**Portfolio.** Your positions read straight from DreamDEX, marked to the book, with one-tap **redeem** the moment a window resolves.

No backend. No BitDrum contracts. No indexer, no keeper, no Postgres. The frontend talks to the DreamDEX indexer, the Somnia price feed, and Somnia Shannon directly through `@somnia-chain/markets-sdk`. Deploy it as a static site.

## The model, honestly

```
P(UP) = Φ( ln(S / K) / (σ · √τ) )
```

Over a few minutes, BTC log-returns are close to driftless Brownian motion. `S` is the live index, `K` the window's opening price (the oracle answer for reference markets, the strike for fixed ones), `σ` the realized per-minute volatility from the last 60 one-minute candles, `τ` the minutes left. **Edge** is that probability minus the YES mid on the book. A call fires only when `|edge| > spread/2 + 3 %`, so it never recommends paying through a wide book. Confidence is damped early in a window — the open has barely been tested — and in the last seconds, where fill risk dominates.

It ignores drift and fees on purpose. It is a **signal, not a guarantee**. The whole thing is 80 lines of pure functions that anyone can read and unit-test.

## Built on live data, not mocks

Everything was verified against DreamDEX on Shannon during the hackathon:

- Live 5 m windows found for BTC and ETH, rolled over on expiry.
- **Opening-price scale confirmed**: oracle raw `7921119` → $79,211.19 against a live index of $79,363. (The SDK documents this scale as empirical, not guaranteed — we checked.)
- Book populated, quote sized off it: YES 0.731 / NO 0.296 → 5 USDC buys 6.64 shares (+33 %).
- Positions and claimables for a real trader map cleanly to LIVE · SETTLING · WIN · LOSS · VOID.
- A real order filled from MetaMask: BUY UP on a BTC 5 m window, 4.43 USDC escrowed for 6.31 shares — fills landed at the resting prices, under the protective limit. That came after we found the SDK hardcodes gas and fees that MetaMask rejects, and that the DreamDEX market maker re-quotes fast enough (17¢ in ~5 s) to leave a 3 % protective limit behind during a 10-second wallet confirmation. BitDrum re-quotes at the moment you send and gives you a fill-tolerance control. Those two findings alone are the kind of thing only shipping against the real venue teaches you.

## The business model

DreamDEX lets a front end tag orders with a **builder address** and earn a routing fee on them. BitDrum sets it on every order it originates. BitDrum earns on flow it creates — without running a market, a vault, or a keeper. The signal is the product. The venue is DreamDEX.

## Why Somnia

Sub-second blocks are what make one- and five-minute binary windows viable at all: a quote, a signature, and a fill fit inside a window with room to spare. DreamDEX Event Contracts give a real CLOB with oracle settlement, so BitDrum can be a front end and a signal instead of a liquidity provider. And the markets SDK exposes the same book the venue trades on, which is what lets us promise "payout and max loss before you sign" and mean it.

## Where it goes next

- **Builder-fee revenue live** on mainnet DreamDEX.
- **Edge v2**: a drift term from the EMA the price feed already publishes, and a fee-aware hurdle.
- **Auto-pilot**: a session key that lets Edge place the order the instant confidence clears your threshold — closing the wallet-latency gap we measured.
- **BitDrum-native venue**: v1 shipped a full Bitcoin direction market on Somnia — six contracts, a protocol-owned liquidity vault, keeper, indexer, and an AI agent. It's deployed on Shannon and documented in the repo. Once the signal proves itself on DreamDEX, it's the path to owning the venue.

## Try it

Connect a wallet on Somnia Shannon, hit **Faucet** for TestUSDC, pick **5 m**, and watch Edge price the window. When it fires, tap the side it names. The rationale is right there — decide whether you agree.

*Built by [CrackedStudios.xyz](https://crackedstudios.xyz) — Abdulsamad Sadiq and Samuel Onanike.*
