import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

function listHtml(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith(".html"));
}

function stripDangerous(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => (m.match(/^<script\b[^>]*>/i)?.[0] ?? ""))
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

for (const file of listHtml(ROOT)) {
  const raw = fs.readFileSync(path.join(ROOT, file), "utf8");
  const html = stripDangerous(raw);

  // 1. No third-party resource loading
  const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
  for (const tag of linkTags) {
    const rel = tag.match(/\brel\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    if (!/stylesheet|preload|icon|apple-touch|manifest/i.test(rel)) continue;
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href && (/^(https?:)?\/\//i.test(href))) {
      errors.push(`${file}: third-party resource <link ${rel}> -> ${href}`);
    }
  }
  for (const m of html.matchAll(/\b(src|srcset)\s*=\s*["']([^"']+)["']/gi)) {
    if (/^(https?:)?\/\//i.test(m[2].trim())) errors.push(`${file}: third-party resource ${m[1]}="${m[2]}"`);
  }
  for (const banned of ["googleapis.com", "gstatic.com", "cdnjs.cloudflare.com", "unpkg.com", "jsdelivr.net", "fontawesome"]) {
    if (raw.toLowerCase().includes(banned)) errors.push(`${file}: references banned CDN "${banned}"`);
  }

  // 2. Every img: width, height, alt, lazy-or-high-priority
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const get = (a) => new RegExp(`\\b${a}\\s*=\\s*["'][^"']*["']`, "i").test(tag);
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? "(none)";
    for (const a of ["width", "height", "alt", "loading"]) {
      if (!get(a)) errors.push(`${file}: <img src="${src}"> missing ${a}`);
    }
    const loading = tag.match(/\bloading\s*=\s*["']([^"']+)["']/i)?.[1];
    const priority = /\bfetchpriority\s*=\s*["']high["']/i.test(tag);
    if (!priority && loading !== "lazy") {
      errors.push(`${file}: <img src="${src}"> must be loading="lazy" or fetchpriority="high"`);
    }
    if (!fs.existsSync(path.join(ROOT, decodeURIComponent(src.split("?")[0])))) {
      errors.push(`${file}: img asset missing on disk: ${src}`);
    }
  }
  // exactly one high-priority LCP image per page
  const prioCount = (html.match(/fetchpriority\s*=\s*["']high["']/gi) || []).length;
  if (prioCount !== 1) errors.push(`${file}: expected exactly 1 fetchpriority="high" LCP image, found ${prioCount}`);

  // 3. Scripts deferred, local
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const tag = m[0];
    if (!/\bdefer\b/i.test(tag) && !/\basync\b/i.test(tag)) errors.push(`${file}: script ${m[1]} is not deferred`);
    if (/^(https?:)?\/\//i.test(m[1])) errors.push(`${file}: external script ${m[1]}`);
    if (!fs.existsSync(path.join(ROOT, m[1]))) errors.push(`${file}: script missing on disk: ${m[1]}`);
  }
  const inlineScripts = [...raw.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  const realInline = inlineScripts.filter(m => m[1].trim().length > 0 && !/application\/ld\+json/i.test(m[0]));
  if (realInline.length) errors.push(`${file}: contains executable inline <script> (${realInline.length})`);

  // 4. Fonts preloaded and self-hosted
  const preloads = [...html.matchAll(/<link\b[^>]*rel=["']preload["'][^>]*>/gi)].map(m => m[0]);
  const fontPreloads = preloads.filter(t => /as=["']font["']/i.test(t) && /woff2/i.test(t) && /crossorigin/i.test(t));
  if (fontPreloads.length !== 2) errors.push(`${file}: expected exactly 2 font preloads, found ${fontPreloads.length}`);

  // 5. Local link/src targets exist
  for (const m of html.matchAll(/\b(href|src)\s*=\s*["']([^"']+)["']/gi)) {
    const v = m[2].trim();
    if (/^(https?:)?\/\//i.test(v) || /^(mailto:|tel:|data:|#)/i.test(v) || v === "") continue;
    const clean = v.split("#")[0];
    if (clean && !fs.existsSync(path.join(ROOT, decodeURIComponent(clean)))) {
      errors.push(`${file}: referenced asset missing: ${v}`);
    }
  }
}

// Fonts exist on disk
const fontsDir = path.join(ROOT, "fonts");
const woff2 = fs.existsSync(fontsDir) ? fs.readdirSync(fontsDir).filter(f => f.endsWith(".woff2")) : [];
if (woff2.length < 2) errors.push(`fonts/: expected >=2 woff2 files, found ${woff2.length}`);

// CSS must reference the local fonts and no remote urls
const cssPath = path.join(ROOT, "css", "style.css");
if (!fs.existsSync(cssPath)) errors.push("missing css/style.css");
else {
  const css = fs.readFileSync(cssPath, "utf8");
  if (!/@font-face/.test(css)) errors.push("css/style.css: no @font-face declarations");
  for (const m of css.matchAll(/url\(\s*["']?(https?:)?\/\/[^)]+\)/gi)) {
    errors.push(`css/style.css: remote url() reference: ${m[0]}`);
  }
}

if (errors.length) {
  console.log("PERF ERRORS:");
  for (const e of errors) console.log("  - " + e);
  process.exit(1);
}
console.log("PERF CHECK PASSED");
