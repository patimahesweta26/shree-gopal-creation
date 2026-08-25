/* Shree Gopal Creations — site behaviour
   IntersectionObserver-driven; no scroll listeners; honors prefers-reduced-motion. */

(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Header state via sentinel ---------- */
  const header = $(".header");
  const headerSentinel = $("#top-sentinel");
  if (header && headerSentinel) {
    new IntersectionObserver(([entry]) => {
      header.classList.toggle("is-scrolled", !entry.isIntersecting);
    }, { rootMargin: "-60px 0px 0px 0px" }).observe(headerSentinel);
  }

  /* ---------- Mobile menu ---------- */
  const menuBtn = $("#menuBtn");
  const mobileNav = $("#mobileNav");
  if (menuBtn && mobileNav) {
    const setMenu = (open) => {
      menuBtn.setAttribute("aria-expanded", String(open));
      mobileNav.classList.toggle("open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    menuBtn.addEventListener("click", () =>
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true")
    );
    $$("a", mobileNav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileNav.classList.contains("open")) {
        setMenu(false);
        menuBtn.focus();
      }
    });
  }

  /* ---------- Quote rotator ---------- */
  const quoteSlides = $$(".quote-slide");
  if (quoteSlides.length > 1 && !reducedMotion) {
    let qIndex = 0;
    let qTimer;
    const showQuote = (i) => {
      quoteSlides.forEach((s, n) => s.classList.toggle("is-active", n === i));
    };
    const startQuotes = () => {
      if (!qTimer) qTimer = setInterval(() => {
        qIndex = (qIndex + 1) % quoteSlides.length;
        showQuote(qIndex);
      }, 7000);
    };
    const stopQuotes = () => { clearInterval(qTimer); qTimer = undefined; };
    const zone = $("#quotes");
    if (zone) {
      zone.addEventListener("mouseenter", stopQuotes);
      zone.addEventListener("mouseleave", startQuotes);
      zone.addEventListener("focusin", stopQuotes);
      zone.addEventListener("focusout", startQuotes);
    }
    document.addEventListener("visibilitychange", () => {
      document.hidden ? stopQuotes() : startQuotes();
    });
    startQuotes();
  } else {
    quoteSlides.forEach((s, n) => s.classList.toggle("is-active", n === 0));
  }

  /* ---------- Staggered reveal on scroll ---------- */
  const revealEls = $$(".reveal");
  if (revealEls.length) {
    const groups = new Map();
    revealEls.forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, 0);
      const i = groups.get(parent);
      el.style.setProperty("--reveal-delay", `${Math.min(i * 70, 420)}ms`);
      groups.set(parent, i + 1);
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Animated counters ---------- */
  const counters = $$("[data-count]");
  if (counters.length) {
    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix ?? "";
      if (reducedMotion) {
        el.textContent = target + suffix;
        return;
      }
      const dur = 1400;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate(entry.target);
            cio.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------- Product filter ---------- */
  const filters = $$(".filter");
  const products = $$(".product");
  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      filters.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      products.forEach((card) => {
        const match = f === "all" || card.dataset.category === f;
        card.classList.toggle("is-hidden", !match);
      });
    });
  });

  /* ---------- Enquiry form -> WhatsApp ---------- */
  const form = $("#enquiryForm");
  if (form) {
    const WA_NUMBER = "917315127341";
    const status = $("#formStatus");

    const setError = (field, on) => field.closest(".form-field").classList.toggle("is-invalid", on);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (form.querySelector('[name="company_website"]').value !== "") return; // honeypot

      const data = new FormData(form);
      const name = String(data.get("name") ?? "").trim();
      const phoneRaw = String(data.get("phone") ?? "").trim();
      const service = String(data.get("service") ?? "").trim();
      const message = String(data.get("message") ?? "").trim();

      let ok = true;
      if (name.length < 2) { setError(form.name, true); ok = false; } else setError(form.name, false);

      const digits = phoneRaw.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
      if (!/^[6-9]\d{9}$/.test(digits)) { setError(form.phone, true); ok = false; } else setError(form.phone, false);

      if (message.length < 5) { setError(form.message, true); ok = false; } else setError(form.message, false);

      if (!ok) return;

      const lines = [
        "New enquiry from shreegopalcreations.com",
        `Name: ${name}`,
        `Phone: ${digits}`,
        service ? `Service: ${service}` : null,
        message ? `Details: ${message}` : null,
      ].filter(Boolean);
      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
      window.open(url, "_blank", "noopener");

      if (status) {
        status.classList.add("is-visible");
        setTimeout(() => status.classList.remove("is-visible"), 8000);
      }
      form.reset();
    });

    ["input", "change"].forEach((evt) =>
      form.addEventListener(evt, (e) => {
        const field = e.target.closest(".form-field");
        if (field) field.classList.remove("is-invalid");
      })
    );
  }

  /* ---------- Back-to-top ---------- */
  const topBtn = $("#topBtn");
  const footSentinel = $("#foot-sentinel");
  if (topBtn && footSentinel) {
    new IntersectionObserver(([entry]) => {
      topBtn.classList.toggle("show", !entry.isIntersecting || entry.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(footSentinel);
    topBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- Current year ---------- */
  $$("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();
