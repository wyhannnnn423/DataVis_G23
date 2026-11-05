/* Page behaviour: nav highlight, circular scroll progress button, kinetic scroll reveal,
   and Fig 2 Question + Chart synchronised lock.
   Owner: Han (website structure and integration). */

(function() {
    const bar = document.getElementById("topbar");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = Array.from(document.querySelectorAll(".step"));
    let currentStep = -1;

    // 1. Move Q1 Question (.section-head) inside .sticky automatically so Question + Chart lock TOGETHER at Fig 2 position!
    const q1Section = document.getElementById("q1");
    const q1Sticky = q1Section ? q1Section.querySelector(".sticky") : null;
    const q1Head = q1Section ? q1Section.querySelector(".section-head") : null;
    if (q1Sticky && q1Head && q1Head.parentElement !== q1Sticky) {
        q1Sticky.insertBefore(q1Head, q1Sticky.firstChild);
    }

    // 2. Dynamically calibrate right-column step lock position & bottom padding to match Question + Chart height
    function syncScrollyGeometry() {
        if (!q1Sticky || !q1Head || !steps.length) return;
        const barH = bar ? bar.offsetHeight : 64;
        const headStyle = window.getComputedStyle(q1Head);
        const headTotalH = q1Head.offsetHeight + parseFloat(headStyle.marginBottom || 20);
        const cardOffsetBelowChartTop = 52; // Matches Fig 2 card alignment relative to chart top

        const padTop = Math.round(headTotalH + cardOffsetBelowChartTop);
        const lockTop = Math.round(barH + 18 + padTop);

        const stickyTotalH = q1Sticky.offsetHeight;
        const lastCard = steps[steps.length - 1].querySelector("p") || steps[steps.length - 1];
        const lastCardH = lastCard ? lastCard.offsetHeight : 120;
        const padBottom = Math.max(120, Math.round(stickyTotalH - padTop - lastCardH));

        document.documentElement.style.setProperty("--steps-pad-top", padTop + "px");
        document.documentElement.style.setProperty("--step-lock-top", lockTop + "px");
        document.documentElement.style.setProperty("--steps-pad-bottom", padBottom + "px");
    }

    // 3. Upgrade or create Back-to-Top button with SVG Circular Progress Ring + Chevron Icon
    const bttSvgMarkup = `
    <svg class="btt-ring" viewBox="0 0 56 56" aria-hidden="true">
      <circle class="btt-track" cx="28" cy="28" r="24"></circle>
      <circle class="btt-progress" cx="28" cy="28" r="24"></circle>
    </svg>
    <svg class="btt-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 14.5L12 9l5.5 5.5"></path>
    </svg>
  `;
    let backToTop = document.getElementById("back-to-top");
    if (!backToTop) {
        backToTop = document.createElement("a");
        backToTop.href = "#hero";
        backToTop.id = "back-to-top";
        backToTop.className = "back-to-top";
        backToTop.setAttribute("aria-label", "Back to top");
        backToTop.setAttribute("title", "Back to top");
        document.body.appendChild(backToTop);
    }
    if (!backToTop.querySelector(".btt-ring")) {
        backToTop.innerHTML = bttSvgMarkup;
    }

    // 4. Determine which step card (<p>) is active at Fig 2's lock position
    function updateActiveStep() {
        if (!steps.length) return;
        const lockTopVar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--step-lock-top")) || 320;
        const triggerY = lockTopVar + 140;

        let activeIdx = 0;
        steps.forEach((stepEl, i) => {
            const card = stepEl.querySelector("p") || stepEl;
            const rect = card.getBoundingClientRect();
            if (rect.top <= triggerY) {
                activeIdx = i;
            }
        });

        if (activeIdx !== currentStep) {
            currentStep = activeIdx;
            steps.forEach((s, i) => s.classList.toggle("is-active", i === activeIdx));
            if (window.Q1) window.Q1.setStep(Number(steps[activeIdx].dataset.step));
        }
    }

    // 5. Scroll listener: topbar state, circular progress ring, and active step
    const onScroll = () => {
        const scrollTop = window.scrollY;
        if (bar) bar.classList.toggle("scrolled", scrollTop > 8);
        if (backToTop) backToTop.classList.toggle("visible", scrollTop > 320);

        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;
        document.documentElement.style.setProperty("--scroll-progress", progress.toFixed(4));
        updateActiveStep();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
        syncScrollyGeometry();
        updateActiveStep();
    }, { passive: true });
    window.addEventListener("load", () => {
        syncScrollyGeometry();
        onScroll();
    });

    syncScrollyGeometry();
    onScroll();
    // Re-sync after D3 finishes rendering the Q1 SVG chart
    setTimeout(syncScrollyGeometry, 350);
    setTimeout(syncScrollyGeometry, 1000);

    // 6. Highlight the nav link of the section in view
    const links = document.querySelectorAll("[data-link]");
    const sections = ["q1", "q2", "q3", "q4", "q5"].map(id => document.getElementById(id));
    const navObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                links.forEach(l => l.classList.toggle("active", l.dataset.link === e.target.id));
            }
        });
    }, { rootMargin: "-35% 0px -55% 0px" });
    sections.forEach(s => s && navObs.observe(s));

    // 7. Staggered kinetic reveal as sections enter viewport
    const revealObs = new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add("in");
                obs.unobserve(e.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -60px 0px" });

    document.querySelectorAll(".reveal").forEach(el => {
        if (reduce) {
            el.classList.add("in");
        } else {
            revealObs.observe(el);
        }
    });
})();
