// Bundles every "mdi:..." icon the dashboard uses into lib/icons/mdi-subset.json.
//
// Without this, each icon is downloaded from the Iconify web service the first
// time it appears, so icons pop in late (or vanish for a moment when a menu
// item switches to its "selected" icon). With the icons bundled they render
// instantly, offline.
//
// Run after adding a new icon:  npm run build:icons

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirs = ["app", "components", "features", "lib"];
const output = path.join(root, "lib/icons/mdi-subset.json");

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield full;
  }
}

const names = new Set();
for (const dir of sourceDirs) {
  for await (const file of walk(path.join(root, dir))) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(/mdi:([a-z0-9-]+)/g)) names.add(match[1]);
  }
}

const list = [...names].sort();
const response = await fetch(`https://api.iconify.design/mdi.json?icons=${list.join(",")}`);
if (!response.ok) throw new Error(`Icon service answered ${response.status}`);
const data = await response.json();

const found = new Set([...Object.keys(data.icons ?? {}), ...Object.keys(data.aliases ?? {})]);
const missing = list.filter((name) => !found.has(name));
if (missing.length > 0) {
  throw new Error(`These icons do not exist in the mdi set: ${missing.join(", ")}`);
}

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Bundled ${list.length} icons -> ${path.relative(root, output)}`);
