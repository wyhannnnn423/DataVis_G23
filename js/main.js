/* Page behaviors:
   1. Scale Hero and each scrollytelling section based on screen size (--u variable, see css/style.css)
   2. Q1–Q5 scrollytelling: Question + chart pinned on the left, right-hand step cards appear sequentially on scroll
   3. Navigation: Clicking navigation links jumps directly to the "completed" state of that section (no animation); normal scroll preserves all animations
   4. Navigation highlighting, top progress bar, back-to-top button, mobile menu, scroll fade-in
   Owner: Group 23 */

(function() {
    "use strict";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    const topbar = document.querySelector(".topbar");
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const isNarrow = () => window.matchMedia("(max-width: 1024px)").matches;
    const barHeight = () => (topbar ? topbar.offsetHeight : 56);

    // Each chart module (q1.js...) reads this object to get the initial progress
    window.chartProgress = {};


    /* ======================================================================
       1. Configuration
       ====================================================================== */

    const HERO_SCALE = { ref: 1536, max: 1.25 };

    const STORY_CONFIGS = [
        { id: "q1", scale: { ref: 1536, max: 1.25 }, lockTo: "head", tail: 70 },
        { id: "q2", scale: { ref: 1745, max: 1.1 }, lockTo: "chart", tail: 55 },
        { id: "q3", scale: { ref: 1920, max: 1 }, lockTo: "chart", tail: 55 },
        { id: "q4", scale: { ref: 1920, max: 1 }, lockTo: "chart", tail: 55 }, // Placeholder
        { id: "q5", scale: { ref: 1920, max: 1 }, lockTo: "chart", tail: 55 } // Placeholder
    ];

    const MIN_SCALE = 0.72;
    const BOTTOM_GAP = 16;

    const stories = STORY_CONFIGS.map(cfg => {
        const sec = document.getElementById(cfg.id + "-section");
        if (!sec) return null;
        const scrolly = sec.querySelector(".scrolly");
        const stage = sec.querySelector(".scrolly-stage");
        const stack = sec.querySelector(".step-stack");
        const stepEls = Array.from(sec.querySelectorAll(".step"));
        if (!scrolly || !stage || !stack || stepEls.length === 0) return null;
        return {
            id: cfg.id,
            scale: cfg.scale,
            lockTo: cfg.lockTo,
            tail: cfg.tail,
            sec,
            scrolly,
            stage,
            stack,
            stepEls,
            pinTop: 0,
            ratio: 0,
            entered: false,
            currentStep: -1,
            graphShown: false,
            instant: false
        };
    }).filter(Boolean);


    /* ======================================================================
       2. Scaling & Layout
       ====================================================================== */

    function setScale(el, k) {
        el.style.setProperty("--u", k.toFixed(3) + "px");
    }

    function widthScale(cfg) {
        return isNarrow() ? 1 : clamp(window.innerWidth / cfg.ref, 1, cfg.max);
    }

    function fullStackHeight(s) {
        s.stack.classList.add("is-measuring");
        const h = s.stack.offsetHeight;
        s.stack.classList.remove("is-measuring");
        return h;
    }

    function updateStepTop(s, avail) {
        let top = s.pinTop;
        if (isNarrow()) {
            top = s.pinTop + s.stage.offsetHeight + 12;
        } else {
            let offset = 0;
            if (s.lockTo === "chart") {
                const head = s.stage.querySelector(".section-head");
                if (head) offset = head.offsetHeight + parseFloat(getComputedStyle(head).marginBottom || 0);
            }
            top += clamp(avail - fullStackHeight(s), 0, offset);
        }
        s.stack.style.setProperty("--step-top", top + "px");
    }

    function fitStory(s) {
        let k = widthScale(s.scale);
        setScale(s.sec, k);
        s.pinTop = parseFloat(getComputedStyle(s.stage).top) || barHeight() + 14;
        const avail = window.innerHeight - s.pinTop - BOTTOM_GAP;

        if (!isNarrow()) {
            for (let i = 0; i < 5 && k > MIN_SCALE; i++) {
                const need = Math.max(s.stage.offsetHeight, fullStackHeight(s));
                if (need <= avail + 0.5) break;
                k = Math.max(MIN_SCALE, k * avail / need);
                setScale(s.sec, k);
            }
        }

        const n = s.stepEls.length;
        s.scrolly.style.setProperty("--scrolly-length", (isNarrow() ? 120 + 60 * n : 40 + 60 * n) + "vh");
        s.scrolly.style.setProperty("--scrolly-tail", s.tail + "vh");
        updateStepTop(s, avail);
    }

    function fitAll() {
        const hero = document.getElementById("hero");
        if (hero) setScale(hero, widthScale(HERO_SCALE));
        stories.forEach(fitStory);
    }

    window.Layout = {
        refit() {
            fitAll();
            requestUpdate();
        }
    };


    /* ======================================================================
       3. Scroll Progress
       ====================================================================== */

    function measure(s) {
        const rect = s.scrolly.getBoundingClientRect();
        const tailPx = s.tail / 100 * window.innerHeight;
        const span = Math.max(1, rect.height - s.stage.offsetHeight - tailPx);
        s.ratio = clamp((s.pinTop - rect.top) / span, 0, 1);
        s.entered = rect.top < window.innerHeight * 0.4 && rect.bottom > window.innerHeight * 0.1;
    }

    function startY(s) {
        return Math.max(0, Math.round(window.scrollY + s.scrolly.getBoundingClientRect().top - s.pinTop));
    }

    function finishedY(s) {
        const rect = s.scrolly.getBoundingClientRect();
        const span = rect.height - s.stage.offsetHeight - s.tail / 100 * window.innerHeight;
        return Math.max(0, Math.round(window.scrollY + rect.top - s.pinTop + span + 1));
    }

    function stepFor(ratio, n) {
        if (n === 3) return ratio >= 0.58 ? 2 : ratio >= 0.28 ? 1 : 0;
        if (n === 2) return ratio >= 0.5 ? 1 : 0;
        return Math.min(n - 1, Math.floor(ratio * n));
    }

    function updateStory(s) {
        const wasEntered = s.entered;
        measure(s);
        const justEntered = s.entered && !wasEntered;

        if (justEntered && nav.active) s.instant = true;
        if (!s.entered && !nav.active) s.instant = false;
        const noMotion = s.instant && (nav.active || justEntered);

        const api = window[s.id.toUpperCase()];
        if (api && s.entered !== s.graphShown) {
            s.graphShown = s.entered;
            if (typeof api.setVisible === "function") api.setVisible(s.entered, s.entered && s.instant);
        }

        const prog = (reduce || s.instant) ? 1 : s.ratio;
        window.chartProgress[s.id] = prog;
        if (api && typeof api.setProgress === "function") api.setProgress(prog);

        const step = stepFor(s.ratio, s.stepEls.length);
        if (step !== s.currentStep) {
            s.currentStep = step;
            if (api && typeof api.setStep === "function") api.setStep(step);
        }

        s.stepEls.forEach((el, i) => {
            const show = s.entered && i <= step;
            if (show && noMotion && !el.classList.contains("is-shown")) el.classList.add("is-instant");
            if (!show) el.classList.remove("is-instant");
            el.classList.toggle("is-shown", show);
            el.classList.toggle("is-active", s.entered && i === step);
        });
    }

    const btt = document.querySelector(".back-to-top");
    if (btt && !btt.querySelector("svg")) {
        btt.innerHTML = `
      <svg class="btt-ring" viewBox="0 0 52 52">
        <circle class="btt-track" cx="26" cy="26" r="24"></circle>
        <circle class="btt-progress" cx="26" cy="26" r="24"></circle>
      </svg>
      <svg class="btt-icon" viewBox="0 0 24 24">
        <path d="M12 19V5M12 5L5 12M12 5L19 12"></path>
      </svg>
    `;
    }

    let frame = 0;

    function requestUpdate() {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            update();
        });
    }

    function update() {
        const y = window.scrollY;
        const docH = root.scrollHeight - window.innerHeight;
        root.style.setProperty("--scroll-progress", docH > 0 ? clamp(y / docH, 0, 1).toFixed(4) : 0);
        if (topbar) topbar.classList.toggle("is-scrolled", y > 12);
        if (btt) btt.classList.toggle("is-visible", y > 280);
        stories.forEach(updateStory);
        updateSpy();
    }

    window.addEventListener("scroll", () => {
        if (nav.active) endNavSoon();
        requestUpdate();
    }, { passive: true });


    /* ======================================================================
       4. Navigation
       ====================================================================== */

    const navLinks = Array.from(document.querySelectorAll(".topbar nav a"));
    const nav = { active: false, timer: null };

    function endNavSoon() {
        clearTimeout(nav.timer);
        nav.timer = setTimeout(() => {
            nav.active = false;
            requestUpdate();
        }, 180);
    }

    function cancelNav() {
        if (!nav.active) return;
        nav.active = false;
        clearTimeout(nav.timer);
        stories.forEach(s => { if (!s.entered) s.instant = false; });
        requestUpdate();
    }
    window.addEventListener("wheel", cancelNav, { passive: true });
    window.addEventListener("touchstart", cancelNav, { passive: true });
    window.addEventListener("keydown", e => {
        if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) cancelNav();
    });

    function revealInstantly(targetY) {
        const y0 = window.scrollY;
        const lo = Math.min(y0, targetY) - 50;
        const hi = Math.max(y0, targetY) + window.innerHeight;
        document.querySelectorAll(".reveal:not(.is-in)").forEach(el => {
            const top = el.getBoundingClientRect().top + y0;
            if (top >= lo && top <= hi) {
                el.classList.add("is-instant", "is-in");
                revealObserver.unobserve(el);
            }
        });
    }

    function startInstantNav(targetY, story) {
        nav.active = true;
        revealInstantly(targetY);
        if (story) {
            story.instant = true;
            const api = window[story.id.toUpperCase()];
            if (story.entered && api && typeof api.setVisible === "function") api.setVisible(true, true);
        }
        endNavSoon();
        update();
    }

    function scrollToY(y) {
        window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    }

    function goTo(link, e) {
        const href = link.getAttribute("href");
        if (!href || href.charAt(0) !== "#") return;
        const id = href.slice(1);
        const inNav = !!link.closest(".topbar nav");

        if (!id) {
            e.preventDefault();
            startInstantNav(0, null);
            scrollToY(0);
            return;
        }

        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();

        const story = stories.find(s => s.sec === target);
        let y;
        if (story) {
            y = inNav ? finishedY(story) : startY(story);
        } else {
            y = Math.round(target.getBoundingClientRect().top + window.scrollY - barHeight() - 16);
        }

        if (inNav) {
            startInstantNav(y, story);
            setActive(id);
        }
        scrollToY(Math.max(0, y));
        if (history.pushState) history.pushState(null, "", href);
    }

    navLinks.concat(Array.from(document.querySelectorAll(".brand, .cue, .back-to-top"))).forEach(link => {
        link.addEventListener("click", e => goTo(link, e));
    });

    const spySections = ["q1", "q2", "q3", "q4", "q5", "summary"]
        .map(name => document.getElementById(name + "-section")).filter(Boolean);

    function setActive(sectionId) {
        navLinks.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === "#" + sectionId));
    }

    function updateSpy() {
        if (nav.active) return;
        const line = window.innerHeight * 0.4;
        let current = "";
        spySections.forEach(sec => {
            const r = sec.getBoundingClientRect();
            if (r.top <= line && r.bottom > line) current = sec.id;
        });
        setActive(current);
    }


    /* ======================================================================
       5. Mobile Menu
       ====================================================================== */

    const toggle = document.querySelector(".nav-toggle");
    if (toggle && topbar) {
        toggle.addEventListener("click", () => {
            const open = topbar.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
        navLinks.forEach(link => {
            link.addEventListener("click", () => {
                topbar.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
            });
        });
    }


    /* ======================================================================
       6. Scroll Fade-In
       ====================================================================== */

    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-in");
                revealObserver.unobserve(entry.target);
            }
        });
    }, { rootMargin: "0px 0px -8% 0px" });

    document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));


    /* ======================================================================
       7. Initialization
       ====================================================================== */

    let resizeTimer = null;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(window.Layout.refit, 120);
    });

    fitAll();
    update();
    window.addEventListener("load", () => {
        fitAll();
        const hash = location.hash.slice(1);
        const story = stories.find(s => s.sec.id === hash);
        if (story) {
            const y = finishedY(story);
            startInstantNav(y, story);
            window.scrollTo({ top: y, behavior: "auto" });
        }
        update();
    });
    setTimeout(window.Layout.refit, 600);
})();