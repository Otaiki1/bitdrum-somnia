/**
 * Generates one MP3 per scene with ElevenLabs and writes them to public/voiceover/.
 * Optionally generates a music bed with Eleven Music into public/music/bed.mp3.
 *
 *   ELEVENLABS_API_KEY=... npm run voiceover            # voice-over only
 *   ELEVENLABS_API_KEY=... npm run voiceover -- --music # also generate a music bed
 *
 * Optional: ELEVENLABS_VOICE_ID (defaults to "Brian", a deep narration voice),
 *           ELEVENLABS_MODEL_ID (defaults to eleven_multilingual_v2).
 * Scenes whose text hasn't changed since the last run are skipped (see .cache.json).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SCENES } from "../src/script.ts";

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("Set ELEVENLABS_API_KEY in the environment.");
  process.exit(1);
}
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "nPczCjzI2devNBz1zQrb";
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";
const WANT_MUSIC = process.argv.includes("--music");

const outDir = join(process.cwd(), "public", "voiceover");
mkdirSync(outDir, { recursive: true });
const cachePath = join(outDir, ".cache.json");
const cache: Record<string, string> = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};

const hash = (s: string) => createHash("sha1").update(`${VOICE_ID}|${MODEL_ID}|${s}`).digest("hex");

for (const scene of SCENES) {
  const file = join(outDir, `${scene.id}.mp3`);
  const h = hash(scene.voiceover);
  if (existsSync(file) && cache[scene.id] === h) {
    console.log(`= ${scene.id} (unchanged)`);
    continue;
  }
  process.stdout.write(`→ ${scene.id} … `);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: scene.voiceover,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    console.error(`\nElevenLabs ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  cache[scene.id] = h;
  writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  console.log("ok");
}

if (WANT_MUSIC) {
  const musicDir = join(process.cwd(), "public", "music");
  mkdirSync(musicDir, { recursive: true });
  const file = join(musicDir, "bed.mp3");
  process.stdout.write("→ music bed … ");
  const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt:
        "Dark, futuristic electronic underscore for a fintech product launch video. Steady 120 BPM techno pulse, deep sub bass, clean synth arpeggios, cinematic tension and momentum, instrumental only, no vocals, no drops, leaves space for narration.",
      music_length_ms: 150_000,
    }),
  });
  if (!res.ok) {
    console.warn(`\nMusic generation skipped (ElevenLabs ${res.status}): ${(await res.text()).slice(0, 200)}`);
  } else {
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log("ok");
  }
}

console.log("\nDone. Scene lengths now follow the audio — open `npm run dev` to preview.");
