import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

function listHtml(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith(".html"));
}

function readStripped(file) {
  let html = fs.readFileSync(path.join(ROOT, file), "utf8");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  return html;
}

function idsOf(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) ids.add(m[1]);
  return ids;
}

function attrRefs(html) {
  const refs = [];
  for (const m of html.matchAll(/\b(href|src)\s*=\s*["']([^"']+)["']/gi)) {
    refs.push({ attr: m[1].toLowerCase(), value: m[2].trim() });
  }
  return refs;
}

const SKIP_RE = /^(https?:)?\/\//i;
const PROTOCOLS = /^(mailto:|tel:|data:)/i;

for (const file of listHtml(ROOT)) {
  const html = readStripped(file);
  const selfIds = idsOf(html);
  for (const { attr, value } of attrRefs(html)) {
    if (!value || PROTOCOLS.test(value)) continue;
    if (SKIP_RE.test(value)) continue;
    let clean = value.split("#")[0];
    const frag = value.includes("#") ? value.split("#")[1] : null;
    if (clean === "" ) {
      if (frag && !selfIds.has(frag)) {
        errors.push(`${file}: broken same-page anchor "#${frag}"`);
      }
      continue;
    }
    const target = path.resolve(ROOT, decodeURIComponent(clean));
    if (!fs.existsSync(target)) {
      errors.push(`${file}: ${attr}="${value}" -> missing file`);
      continue;
    }
    if (frag) {
      const targetHtml = readStripped(path.relative(ROOT, target));
      if (!idsOf(targetHtml).has(frag)) {
        errors.push(`${file}: ${attr}="${value}" -> missing id "${frag}" in ${clean}`);
      }
    }
  }
}

// CSS url() references must resolve locally
function walkCss(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkCss(p));
    else if (entry.name.endsWith(".css")) out.push(p);
  }
  return out;
}
const cssDir = path.join(ROOT, "css");
if (fs.existsSync(cssDir)) {
  for (const cssFile of walkCss(cssDir)) {
    let css = fs.readFileSync(cssFile, "utf8");
    css = css.replace(/url\(\s*["']?data:[^)]*\)/gi, "");
    for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      const v = m[1].trim();
      if (!v || v.startsWith("data:") || SKIP_RE.test(v)) continue;
      const resolved = path.resolve(path.dirname(cssFile), v.split("?")[0]);
      if (!fs.existsSync(resolved)) {
        errors.push(`css/${path.basename(cssFile)}: url(${v}) -> missing file`);
      }
    }
  }
}

if (errors.length) {
  console.log("LINK ERRORS:");
  for (const e of errors) console.log("  - " + e);
  process.exit(1);
}
console.log("LINK CHECK PASSED");
