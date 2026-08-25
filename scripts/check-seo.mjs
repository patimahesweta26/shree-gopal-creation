import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SITE = "https://patimahesweta26.github.io/shree-gopal-creation/";
const SERVICE_PAGES = [
  "led-signage.html",
  "laser-router-cutting.html",
  "digital-printing.html",
  "flex-vinyl-printing.html",
];
const ALL_PAGES = ["index.html", ...SERVICE_PAGES, "privacy.html", "404.html"];
const errors = [];
const titles = new Map();
const descs = new Map();

function meta(html, re) {
  const m = html.match(re);
  return m && typeof m[1] === "string" ? m[1].trim() : null;
}

for (const page of ALL_PAGES) {
  const p = path.join(ROOT, page);
  if (!fs.existsSync(p)) { errors.push(`missing page: ${page}`); continue; }
  const html = fs.readFileSync(p, "utf8");

  const title = meta(html, /<title>([^<]+)<\/title>/i);
  if (!title) errors.push(`${page}: no <title>`); else titles.set(page, title);

  const desc = meta(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  if (!desc) errors.push(`${page}: no meta description`); else descs.set(page, desc);

  if (title && (title.length < 10 || title.length > 60)) errors.push(`${page}: title length ${title.length}`);
  if (title && title.includes("&")) errors.push(`${page}: raw & in title (entities inflate social-checker counts)`);
  if (desc && (desc.length < 50 || desc.length > 160)) errors.push(`${page}: description length ${desc.length}`);

  const expectedCanonical = page === "index.html" ? SITE : SITE + page;
  const canonical = meta(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  if (canonical !== expectedCanonical) errors.push(`${page}: canonical "${canonical}" != "${expectedCanonical}"`);

  const ogTitle = meta(html, new RegExp(`<meta\\s+property=["']og:title["']\\s+content=["']([^"']*)["']`, "i"));
  const ogDesc = meta(html, new RegExp(`<meta\\s+property=["']og:description["']\\s+content=["']([^"']*)["']`, "i"));
  const twTitle = meta(html, new RegExp(`<meta\\s+(?:name|property)=["']twitter:title["']\\s+content=["']([^"']*)["']`, "i"));
  const twDesc = meta(html, new RegExp(`<meta\\s+(?:name|property)=["']twitter:description["']\\s+content=["']([^"']*)["']`, "i"));

  for (const prop of ["og:image", "og:url"]) {
    const v = meta(html, new RegExp(`<meta\\s+property=["']${prop}["']\\s+content=["']([^"']*)["']`, "i"));
    if (!v) errors.push(`${page}: missing ${prop}`);
  }
  if (!ogTitle) errors.push(`${page}: missing og:title`);
  else if (ogTitle.length > 60) errors.push(`${page}: og:title length ${ogTitle.length} > 60`);
  if (!ogDesc) errors.push(`${page}: missing og:description`);
  else if (ogDesc.length > 125) errors.push(`${page}: og:description length ${ogDesc.length} > 125`);
  if (!twTitle) errors.push(`${page}: missing twitter:title`);
  else if (twTitle.length > 60) errors.push(`${page}: twitter:title length ${twTitle.length} > 60`);
  if (!twDesc) errors.push(`${page}: missing twitter:description`);
  else if (twDesc.length > 125) errors.push(`${page}: twitter:description length ${twDesc.length} > 125`);
  const twCard = html.match(/<meta\s+(?:name|property)=["']twitter:card["']/i);
  if (!twCard) errors.push(`${page}: missing twitter:card`);

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count !== 1) errors.push(`${page}: ${h1Count} <h1> elements, need exactly 1`);

  const ldBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (!ldBlocks.length) errors.push(`${page}: no JSON-LD found`);
  const types = new Set();
  for (const block of ldBlocks) {
    try {
      const data = JSON.parse(block[1].trim());
      const graph = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
      for (const node of graph) {
        const t = node["@type"];
        if (Array.isArray(t)) t.forEach(x => types.add(x));
        else if (t) types.add(t);
      }
    } catch (e) {
      errors.push(`${page}: invalid JSON-LD (${e.message})`);
    }
  }
  if (page === "index.html" && !types.has("LocalBusiness")) errors.push(`${page}: missing LocalBusiness schema`);
  if (SERVICE_PAGES.includes(page)) {
    if (!types.has("Service")) errors.push(`${page}: missing Service schema`);
    if (!types.has("BreadcrumbList")) errors.push(`${page}: missing BreadcrumbList schema`);
  }
  if (/id=["']faq["']/i.test(html) && !types.has("FAQPage")) errors.push(`${page}: FAQ section present but no FAQPage schema`);
}

for (const [page, t] of titles) {
  for (const [other, ot] of titles) if (other !== page && ot === t) errors.push(`duplicate title: ${page} vs ${other}`);
}
for (const [page, d] of descs) {
  for (const [other, od] of descs) if (other !== page && od === d) errors.push(`duplicate description: ${page} vs ${other}`);
}

// Sitemap must list exactly the indexable pages (404 excluded)
const smPath = path.join(ROOT, "sitemap.xml");
if (!fs.existsSync(smPath)) errors.push("missing sitemap.xml");
else {
  const sm = fs.readFileSync(smPath, "utf8");
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  const expected = ALL_PAGES.filter(p => p !== "404.html").map(p => p === "index.html" ? SITE : SITE + p);
  for (const e of expected) if (!locs.includes(e)) errors.push(`sitemap.xml missing ${e}`);
  for (const l of locs) if (!expected.includes(l)) errors.push(`sitemap.xml lists unexpected ${l}`);
}

const robotsPath = path.join(ROOT, "robots.txt");
if (!fs.existsSync(robotsPath)) errors.push("missing robots.txt");
else {
  const robots = fs.readFileSync(robotsPath, "utf8");
  if (!new RegExp(`Sitemap:\\s*${SITE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}sitemap\\.xml`).test(robots)) {
    errors.push("robots.txt missing Sitemap directive");
  }
}

if (errors.length) {
  console.log("SEO ERRORS:");
  for (const e of errors) console.log("  - " + e);
  process.exit(1);
}
console.log("SEO CHECK PASSED");
