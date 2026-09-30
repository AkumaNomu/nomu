// Generates the UI sound set from layered synthesis â€” deep sub-bass swells,
// low whooshes, and soft halo intervals. Everything fades in and out, nothing
// lives above the lower midrange, and nothing starts suddenly.
//
// Run: `node scripts/make-sounds.mjs` (writes to public/sounds/*.ogg).
// Re-run any time to regenerate or tweak; verbs are plain ffmpeg lavfi graphs.

import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "..", "public", "sounds");
mkdirSync(outDir, { recursive: true });

const SR = "sample_rate=48000";

// Every cue is 100ms or less: a short eased fade-in, a short eased fade-out,
// low fundamentals, lowpassed beds, nothing sudden. Echo and delay tails are
// deliberately absent â€” they would push past the cap.
const FADE_IN = "afade=t=in:st=0:d=0.05:curve=hsin";
const FADE_OUT = "afade=t=out:st=0.05:d=0.05:curve=hsin";

const RECIPES = [
  {
    name: "hover",
    args: ["-f", "lavfi", "-i", `sine=frequency=120:duration=0.1:${SR}`, "-filter_complex",
      `[0:a]volume=0.3,${FADE_IN},${FADE_OUT},alimiter=limit=0.9`,
      "-c:a", "libvorbis", "-q:a", "2", "hover.ogg"],
  },
  {
    name: "tap",
    args: ["-f", "lavfi", "-i", `sine=frequency=110:duration=0.1:${SR}`, "-f", "lavfi", "-i", `anoisesrc=color=brown:duration=0.1:${SR}`, "-filter_complex",
      `[0:a]volume=0.5,${FADE_IN},${FADE_OUT}[sub];[1:a]lowpass=f=300,volume=0.12,${FADE_IN},${FADE_OUT}[bed];[sub][bed]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.9`,
      "-c:a", "libvorbis", "-q:a", "2", "tap.ogg"],
  },
  {
    name: "open",
    args: ["-f", "lavfi", "-i", `sine=frequency=80:duration=0.1:${SR}`, "-f", "lavfi", "-i", `sine=frequency=120:duration=0.1:${SR}`, "-filter_complex",
      `[0:a]volume=0.42,${FADE_IN},${FADE_OUT}[low];[1:a]volume=0.28,${FADE_IN},${FADE_OUT}[mid];[low][mid]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.9`,
      "-c:a", "libvorbis", "-q:a", "2", "open.ogg"],
  },
  {
    name: "close",
    args: ["-f", "lavfi", "-i", `sine=frequency=120:duration=0.1:${SR}`, "-f", "lavfi", "-i", `sine=frequency=80:duration=0.1:${SR}`, "-filter_complex",
      `[0:a]volume=0.35,${FADE_IN},${FADE_OUT}[mid];[1:a]volume=0.4,${FADE_IN},${FADE_OUT}[low];[mid][low]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.9`,
      "-c:a", "libvorbis", "-q:a", "2", "close.ogg"],
  },
  {
    name: "confirm",
    args: ["-f", "lavfi", "-i", `sine=frequency=130.81:duration=0.1:${SR}`, "-f", "lavfi", "-i", `sine=frequency=196:duration=0.1:${SR}`, "-filter_complex",
      `[0:a]volume=0.32,${FADE_IN},${FADE_OUT}[root];[1:a]volume=0.22,${FADE_IN},${FADE_OUT}[fifth];[root][fifth]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.9`,
      "-c:a", "libvorbis", "-q:a", "2", "confirm.ogg"],
  },
  {
    name: "toggle",
    args: ["-f", "lavfi", "-i", `sine=frequency=140:duration=0.1:${SR}`, "-filter_complex",
      `[0:a]volume=0.4,${FADE_IN},${FADE_OUT},alimiter=limit=0.9`,
      "-c:a", "libvorbis", "-q:a", "2", "toggle.ogg"],
  },
  {
    name: "next",
    args: ["-f", "lavfi", "-i", `anoisesrc=color=brown:duration=0.1:${SR}`, "-f", "lavfi", "-i", `sine=frequency=160:duration=0.1:${SR}`, "-filter_complex",
      `[0:a]lowpass=f=500,volume=0.15,${FADE_IN},${FADE_OUT}[air];[1:a]volume=0.32,${FADE_IN},${FADE_OUT}[tone];[air][tone]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.9`,
      "-c:a", "libvorbis", "-q:a", "2", "next.ogg"],
  },
  {
    name: "error",
    args: ["-f", "lavfi", "-i", `sine=frequency=98:duration=0.1:${SR}`, "-f", "lavfi", "-i", `anoisesrc=color=brown:duration=0.1:${SR}`, "-filter_complex",
      `[0:a]volume=0.42,${FADE_IN},${FADE_OUT}[low];[1:a]lowpass=f=200,volume=0.12,${FADE_IN},${FADE_OUT}[rumble];[low][rumble]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.9`,
      "-c:a", "libvorbis", "-q:a", "2", "error.ogg"],
  },
];

for (const recipe of RECIPES) {
  const out = path.join(outDir, recipe.args[recipe.args.length - 1]);
  const args = ["-hide_banner", "-nostdin", "-loglevel", "error", ...recipe.args.slice(0, -1), "-y", out];
  execFileSync(ffmpeg, args, { stdio: "pipe" });
  const probe = spawnSync(ffmpeg, ["-i", out, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const peak = /max_volume:\s*([-\d.]+)\s*dB/.exec(probe.stderr)?.[1] ?? "?";
  const size = (statSync(out).size / 1024).toFixed(1);
  console.log(`${recipe.name}.ogg  ${size} KB  peak ${peak} dB`);
}
