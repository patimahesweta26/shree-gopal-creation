# Gates: Shree Gopal Creations production rebuild

OWNS: index.html, led-signage.html, laser-router-cutting.html, digital-printing.html, flex-vinyl-printing.html, privacy.html, 404.html, css/**, js/**, fonts/**, images/**, scripts/**, robots.txt, sitemap.xml, site.webmanifest

Scope: A fast, SEO-complete, multi-page production website (home + 4 service pages + supporting infra) with premium design, working WhatsApp enquiry flow, self-hosted assets, and zero render-blocking third parties.

- [x] G1: Every internal link, script, image, and anchor reference in all HTML pages resolves to an existing file or in-page id
  CHECK: node scripts/check-links.mjs
  EXPECT: LINK CHECK PASSED
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=D:\sidac\shree-gopal-creation; path=db94c73ffaa4/19 entries; EXPECT=matched; output-sha256=a55c0ea54ef8a2e05f7e4079131a623c73b82c527a338024dfeb493d934624e4; output-bytes=18

- [x] G2: All pages carry unique titles/descriptions/canonicals/OG tags, valid JSON-LD (LocalBusiness on home, Service+BreadcrumbList on service pages), a matching sitemap.xml, and robots.txt referencing the sitemap
  CHECK: node scripts/check-seo.mjs
  EXPECT: SEO CHECK PASSED
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=D:\sidac\shree-gopal-creation; path=db94c73ffaa4/19 entries; EXPECT=matched; output-sha256=8d00667f7bc9bc24889c380ef2edb14562aa9e03ba706dc57429ba32548a4ccf; output-bytes=17

- [x] G3: Zero render-blocking third-party resources; all referenced local assets exist; every img declares width/height/alt; scripts load deferred; fonts are preloaded self-hosted woff2
  CHECK: node scripts/check-perf.mjs
  EXPECT: PERF CHECK PASSED
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=D:\sidac\shree-gopal-creation; path=db94c73ffaa4/19 entries; EXPECT=matched; output-sha256=f18b30d7cc7803b7520bbfd241c4e405a41101f1542898be7026810cb7833129; output-bytes=18

- [x] G4: js/main.js is syntactically valid, wires the mobile menu, product filter, WhatsApp form composition, and quote rotator, uses IntersectionObserver, and contains no window-scroll event listeners
  CHECK: node scripts/check-js.mjs
  EXPECT: JS CHECK PASSED
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=D:\sidac\shree-gopal-creation; path=db94c73ffaa4/19 entries; EXPECT=matched; output-sha256=8598f3c0760d0cd818d42752889719ee2c43195df12676a1e4c0e6cabccb8a6e; output-bytes=16

- [x] G5: Accessibility baseline holds: html lang, skip link, single h1 per page, landmarks, aria-labels on icon-only controls, associated labels for all form fields
  CHECK: node scripts/check-a11y.mjs
  EXPECT: A11Y CHECK PASSED
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=D:\sidac\shree-gopal-creation; path=db94c73ffaa4/19 entries; EXPECT=matched; output-sha256=12de3f8c589241039c89fa714859db8e1ca08d5aa2b5904e2ac1602f19701b01; output-bytes=18

- [ ] G6: Visual acceptance: the site renders correctly in a browser at desktop and mobile widths with the intended premium design, readable contrast, and functioning interactions
  EVIDENCE: pending
