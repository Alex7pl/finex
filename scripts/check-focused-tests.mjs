import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = process.argv.slice(2);
const focusedPattern = /\b(?:test|it|describe)\s*\.\s*only\s*\(/;
const testPattern = /\.test\.[cm]?[jt]sx?$/;
const violations = [];

async function scan(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) {
      await scan(target);
    } else if (testPattern.test(entry.name) && extname(entry.name)) {
      const source = await readFile(target, "utf8");
      if (focusedPattern.test(source)) violations.push(target);
    }
  }
}

for (const root of roots) await scan(root);

if (violations.length > 0) {
  console.error(`Focused tests are forbidden:\n${violations.join("\n")}`);
  process.exitCode = 1;
}
