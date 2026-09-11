import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { BitDrumDemo, demoSchema, type DemoProps } from "./BitDrumDemo";
import { FPS, SCENES, TAIL_SECONDS, TRANSITION_FRAMES, voiceoverFile } from "./script";

const exists = async (url: string) => {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
};

// Scene lengths come from the generated voice-over; scenes without audio use the
// script's fallback so the composition previews before ElevenLabs has run.
const calculateMetadata: CalculateMetadataFunction<DemoProps> = async ({ props }) => {
  const sceneFrames: number[] = [];
  const hasVoiceover: boolean[] = [];
  for (const scene of SCENES) {
    const url = staticFile(voiceoverFile(scene.id));
    const ok = await exists(url);
    hasVoiceover.push(ok);
    const seconds = ok ? await getAudioDurationInSeconds(url) : scene.fallbackSeconds;
    // +6 frames of lead-in (audio starts slightly after the cut) + tail + transition overlap
    sceneFrames.push(Math.ceil(seconds * FPS) + 6 + Math.round(TAIL_SECONDS * FPS) + TRANSITION_FRAMES);
  }
  const hasMusic = await exists(staticFile("music/bed.mp3"));
  const durationInFrames = sceneFrames.reduce((a, b) => a + b, 0) - TRANSITION_FRAMES * (SCENES.length - 1);
  return {
    durationInFrames,
    props: { ...props, sceneFrames, hasVoiceover, hasMusic },
  };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="BitDrumDemo"
    component={BitDrumDemo}
    schema={demoSchema}
    fps={FPS}
    width={1920}
    height={1080}
    durationInFrames={30 * 120}
    defaultProps={{
      sceneFrames: SCENES.map((s) => s.fallbackSeconds * FPS),
      hasVoiceover: SCENES.map(() => false),
      hasMusic: false,
      musicVolume: 0.12,
    }}
    calculateMetadata={calculateMetadata}
  />
);
