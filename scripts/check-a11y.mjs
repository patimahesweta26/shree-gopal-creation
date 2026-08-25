import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

function listHtml(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith(".html"));
}
function stripScriptsStyles(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

for (const file of listHtml(ROOT)) {
  const html = stripScriptsStyles(fs.readFileSync(path.join(ROOT, file), "utf8"));

  if (!/<html[^>]*\blang\s*=\s*["']en["']/i.test(html)) errors.push(`${file}: html lang="en" missing`);
  if (!/<a[^>]+href=["']#main["'][^>]*>/i.test(html)) errors.push(`${file}: skip link to #main missing`);
  if (!/\bid=["']main["']/i.test(html)) errors.push(`${file}: #main landmark missing`);
  for (const landmark of ["<nav", "<header", "<footer", "<main"]) {
    if (!html.includes(landmark)) errors.push(`${file}: missing <${landmark.slice(1)}>` + " landmark");
  }

  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1 !== 1) errors.push(`${file}: ${h1} h1 elements`);

  // Icon-only controls need aria-label
  for (const m of html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const attrs = m[2], inner = m[3];
    const text = inner.replace(/<svg[\s\S]*?<\/svg>/gi, "").replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, "").trim();
    if (text.length === 0 && !/\baria-label\s*=/i.test(attrs) && !/\baria-labelledby\s*=/i.test(attrs)) {
      const label = attrs.match(/\b(?:class|id)\s*=\s*["']([^"']+)["']/i)?.[1] ?? "?";
      errors.push(`${file}: icon-only <${m[1]} class/id="${label}"> needs aria-label`);
    }
  }

  // Form controls need labels
  for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const tag = m[0];
    if (/type\s*=\s*["'](hidden|submit)["']/i.test(tag)) continue;
    const id = tag.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
    const hasAria = /\baria-label\s*=/i.test(tag);
    const hasLabel = id ? new RegExp(`<label[^>]*\\bfor\\s*=\\s*["']${id}["']`, "i").test(html) : false;
    if (!hasAria && !hasLabel) {
      const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1] ?? "?";
      errors.push(`${file}: form control "${name}" has no associated label`);
    }
  }
}

if (errors.length) {
  console.log("A11Y ERRORS:");
  for (const e of errors) console.log("  - " + e);
  process.exit(1);
}
console.log("A11Y CHECK PASSED");
