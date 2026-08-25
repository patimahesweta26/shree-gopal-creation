import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const jsPath = path.join(ROOT, "js", "main.js");
const errors = [];

if (!fs.existsSync(jsPath)) { console.log("JS ERRORS:\n  - missing js/main.js"); process.exit(1); }
const code = fs.readFileSync(jsPath, "utf8");

const check = spawnSync(process.execPath, ["--check", path.relative(ROOT, jsPath)], { cwd: ROOT, encoding: "utf8" });
if (check.status !== 0) {
  errors.push("node --check failed:\n" + (check.stderr || check.stdout));
}

for (const needle of ["IntersectionObserver", "wa.me", "menuBtn", "dataset.filter", "quote-slide", "prefers-reduced-motion"]) {
  if (!code.includes(needle)) errors.push(`main.js missing required feature hook: ${needle}`);
}

if (/window\.addEventListener\(\s*["']scroll["']/i.test(code) || /document\.addEventListener\(\s*["']scroll["']/i.test(code)) {
  errors.push("main.js uses scroll event listeners (banned; use IntersectionObserver)");
}
if (/\balert\s*\(/.test(code)) errors.push("main.js uses alert() (banned; use inline states)");

if (errors.length) {
  console.log("JS ERRORS:");
  for (const e of errors) console.log("  - " + e);
  process.exit(1);
}
console.log("JS CHECK PASSED");
