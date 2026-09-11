/**
 * The demo script. One entry per scene: the voice-over text (sent to ElevenLabs),
 * and a fallback duration used until the audio has been generated.
 *
 * Scene length = voice-over length + TAIL_SECONDS of breathing room.
 */
export const FPS = 30;
export const TAIL_SECONDS = 0.7;
export const TRANSITION_FRAMES = 14;

export type SceneId =
  | "hook"
  | "problem"
  | "bitdrum"
  | "edge"
  | "trade"
  | "portfolio"
  | "somnia"
  | "close";

export type SceneScript = {
  id: SceneId;
  voiceover: string;
  fallbackSeconds: number;
};

export const SCENES: SceneScript[] = [
  {
    id: "hook",
    voiceover:
      "DreamDEX runs one-minute and five-minute Up-Down markets on Bitcoin and Ether, live on Somnia. A real order book. Oracle settlement. But it never tells you the one thing that matters: is the price it's quoting actually fair?",
    fallbackSeconds: 14,
  },
  {
    id: "problem",
    voiceover:
      "A YES share at seventy-three cents means the book thinks there's a seventy-three percent chance Bitcoin closes above the open. With two minutes left, and price four basis points above the open — is that right? No trader can work that out in the seconds a window lasts. And the raw order book doesn't try.",
    fallbackSeconds: 17,
  },
  {
    id: "bitdrum",
    voiceover:
      "BitDrum is a purpose-built front end for those markets, with the one thing the venue doesn't have: its own opinion of the price.",
    fallbackSeconds: 9,
  },
  {
    id: "edge",
    voiceover:
      "BitDrum Edge computes its own probability of UP from how far price has moved from the open, the time left, and realized volatility from the last sixty candles. Then it compares that to what the book implies. A call only fires when the gap clears the spread plus a margin, so it never tells you to pay through a wide book. And every call comes with a plain-English rationale. The whole model is eighty lines of pure functions.",
    fallbackSeconds: 25,
  },
  {
    id: "trade",
    voiceover:
      "Trading is one tap. Pick UP or DOWN, and BitDrum quotes your stake against the live DreamDEX book, walking the levels, so payout-if-win, max loss, and worst fill are on screen before you sign. The order is a market I-O-C, signed by your own wallet, routed straight to DreamDEX.",
    fallbackSeconds: 19,
  },
  {
    id: "portfolio",
    voiceover:
      "Positions read straight from DreamDEX, marked to the book, with one-tap redeem once the window resolves. No backend. No BitDrum contracts. Just the markets SDK, the Somnia price feed, and Shannon.",
    fallbackSeconds: 14,
  },
  {
    id: "somnia",
    voiceover:
      "Somnia's sub-second blocks are what make five-minute binaries viable at all: a quote, a signed order, and a fill land inside the window with room to spare. And every order BitDrum originates is tagged with its builder address, so BitDrum earns on the flow it creates, without running a market, a vault, or a keeper.",
    fallbackSeconds: 20,
  },
  {
    id: "close",
    voiceover:
      "The signal is the product. The venue is DreamDEX. BitDrum. Read the signal. Make the call.",
    fallbackSeconds: 9,
  },
];

export const voiceoverFile = (id: SceneId) => `voiceover/${id}.mp3`;
