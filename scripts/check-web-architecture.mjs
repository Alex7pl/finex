import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), process.argv[2] ?? "app");
const violations = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(file);
      continue;
    }
    if (!/\.[cm]?[jt]sx?$/.test(entry.name)) continue;

    const relative = path.relative(root, file);
    const source = fs.readFileSync(file, "utf8");
    const isTest = /\.test\.[cm]?[jt]sx?$/.test(entry.name);
    const isServer = /\.server\.[cm]?[jt]sx?$/.test(entry.name);

    if (/\.api\.[cm]?[jt]sx?$/.test(entry.name) && !/\.api\.server\.[cm]?[jt]sx?$/.test(entry.name)) {
      violations.push(`${relative}: los módulos API deben terminar en .api.server.ts`);
    }
    if (source.includes("VITE_API_URL")) {
      violations.push(`${relative}: API_URL es solo de servidor; no uses VITE_API_URL`);
    }
    if (!isServer && !isTest && /\bfetch\s*\(/.test(source)) {
      violations.push(`${relative}: fetch debe vivir en un módulo .server.ts`);
    }
    if (!isServer && !isTest && /http\.server(?:\.js)?["']/.test(source)) {
      violations.push(`${relative}: solo módulos .server.ts pueden importar http.server`);
    }
  }
}

visit(root);

if (violations.length > 0) {
  console.error("Frontend architecture violations:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Frontend BFF architecture check passed");
}
