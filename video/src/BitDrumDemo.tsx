import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { z } from "zod";
import { SCENES, TRANSITION_FRAMES, type SceneId, voiceoverFile } from "./script";
import { HookScene } from "./scenes/HookScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { BitDrumScene } from "./scenes/BitDrumScene";
import { EdgeScene } from "./scenes/EdgeScene";
import { TradeScene } from "./scenes/TradeScene";
import { PortfolioScene } from "./scenes/PortfolioScene";
import { SomniaScene } from "./scenes/SomniaScene";
import { CloseScene } from "./scenes/CloseScene";

export const demoSchema = z.object({
  // Per-scene length in frames, computed from the voice-over files by calculateMetadata.
  sceneFrames: z.array(z.number().int().positive()),
  // Which scenes actually have an mp3 on disk (so preview works before generation).
  hasVoiceover: z.array(z.boolean()),
  hasMusic: z.boolean(),
  musicVolume: z.number().min(0).max(1),
});
export type DemoProps = z.infer<typeof demoSchema>;

const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  hook: HookScene,
  problem: ProblemScene,
  bitdrum: BitDrumScene,
  edge: EdgeScene,
  trade: TradeScene,
  portfolio: PortfolioScene,
  somnia: SomniaScene,
  close: CloseScene,
};

// Transition flavour per scene boundary (index i = between scene i and i+1).
const transitionFor = (i: number) =>
  i % 2 === 0 ? fade() : slide({ direction: "from-right" });

export const BitDrumDemo: React.FC<DemoProps> = ({ sceneFrames, hasVoiceover, hasMusic, musicVolume }) => {
  // Absolute start frame of each scene, accounting for transition overlap.
  const starts: number[] = [];
  let acc = 0;
  SCENES.forEach((_, i) => {
    starts.push(acc);
    acc += sceneFrames[i] - (i < SCENES.length - 1 ? TRANSITION_FRAMES : 0);
  });
  const total = acc;

  return (
    <AbsoluteFill style={{ background: "#050505" }}>
      <TransitionSeries>
        {SCENES.map((scene, i) => {
          const Comp = SCENE_COMPONENTS[scene.id];
          return (
            <React.Fragment key={scene.id}>
              <TransitionSeries.Sequence durationInFrames={sceneFrames[i]}>
                <Comp />
              </TransitionSeries.Sequence>
              {i < SCENES.length - 1 && (
                <TransitionSeries.Transition
                  presentation={transitionFor(i)}
                  timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {/* Voice-over: one clip per scene, starting a few frames after the scene lands. */}
      {SCENES.map((scene, i) =>
        hasVoiceover[i] ? (
          <Sequence key={`vo-${scene.id}`} from={starts[i] + 6} durationInFrames={sceneFrames[i]}>
            <Audio src={staticFile(voiceoverFile(scene.id))} />
          </Sequence>
        ) : null,
      )}

      {hasMusic && (
        <Audio
          src={staticFile("music/bed.mp3")}
          volume={(f) => {
            // fade in over 1s, duck under the VO, fade out over the last 3s
            const fadeIn = Math.min(1, f / 30);
            const fadeOut = Math.min(1, Math.max(0, (total - f) / 90));
            return musicVolume * fadeIn * fadeOut;
          }}
        />
      )}
    </AbsoluteFill>
  );
};
