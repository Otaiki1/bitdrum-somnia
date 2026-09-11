// Captures 1920px-wide screenshots of the running app (default http://localhost:3000)
// into public/shots/ using the Chrome headless shell Remotion already downloaded.
// Usage: node scripts/capture-shots.mjs [baseUrl]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const chrome = join(
  process.cwd(),
  "node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell",
);
if (!existsSync(chrome)) {
  console.error("Headless shell not found. Run: npx remotion browser ensure");
  process.exit(1);
}
mkdirSync("public/shots", { recursive: true });

const shots = [
  { name: "landing", path: "/", h: 1080 },
  { name: "arena", path: "/arena", h: 1080 },
  { name: "arena-tall", path: "/arena", h: 1500 },
  { name: "edge", path: "/signals", h: 1080 },
  { name: "portfolio", path: "/portfolio", h: 1080 },
];

for (const s of shots) {
  const out = `public/shots/${s.name}.png`;
  console.log(`→ ${s.path} (${s.h}px) → ${out}`);
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=1920,${s.h}`,
      // Let live data (indexer, price feed) arrive before the capture.
      "--virtual-time-budget=20000",
      `--screenshot=${out}`,
      `${base}${s.path}`,
    ],
    { stdio: "ignore", timeout: 90_000 },
  );
}
console.log("done");
