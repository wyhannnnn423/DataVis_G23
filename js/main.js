/* Page behaviour: nav highlight, circular scroll progress button, kinetic scroll reveal,
   and Fig 2 Question + Chart lock with cumulative sequential card revelation.
   Owner: Group 23. */

(function() {
    const bar = document.getElementById("topbar");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Move Q1 Question (.section-head) inside .sticky automatically so Question + Chart lock together at Fig 2 position
    const q1Section = document.getElementById("q1");
    const q1Sticky = q1Section ? q1Section.querySelector(".sticky") : null;
    const q1Head = q1Section ? q1Section.querySelector(".section-head") : null;
    if (q1Sticky && q1Head && q1Head.parentElement !== q1Sticky) {
        q1Sticky.insertBefore(q1Head, q1Sticky.firstChild);
    }

    // 2. Ensure the 3 cards are wrapped inside .steps-sticky-card
    const stepsWrapper = q1Section ? q1Section.querySelector(".steps") : null;
    let stepsPanel = q1Section ? q1Section.querySelector(".steps-sticky-card") : null;
    if (stepsWrapper && !stepsPanel) {
        stepsPanel = document.createElement("div");
        stepsPanel.className = "steps-sticky-card";
        while (stepsWrapper.firstChild) {
            stepsPanel.appendChild(stepsWrapper.firstChild);
        }
        stepsWrapper.appendChild(stepsPanel);
    }

    const stepEls = Array.from(document.querySelectorAll("#q1 .step"));
    let currentStep = -1;

    // 3. Calibrate vertical lock offset
    function syncScrollyGeometry() {
        if (!q1Sticky || !q1Head) return;
        const barH = bar ? bar.offsetHeight : 64;
        const headStyle = window.getComputedStyle(q1Head);
        const headTotalH = q1Head.offsetHeight + parseFloat(headStyle.marginBottom || 20);
        const cardOffsetBelowChartTop = 48;

        const lockTop = Math.round(barH + 18 + headTotalH + cardOffsetBelowChartTop);
        document.documentElement.style.setProperty("--step-lock-top", lockTop + "px");
    }

    // 4. Ensure Back-to-Top button has SVG Circular Progress Ring and Chevron Icon
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

    // 5. Sequential cumulative revelation based on scroll depth through Q1
    function updateCumulativeSteps() {
        if (!q1Section || !stepEls.length) return;

        const rect = q1Section.getBoundingClientRect();
        const barH = bar ? bar.offsetHeight : 64;
        const scrollDistance = (barH + 30) - rect.top;
        const scrollableH = rect.height - window.innerHeight;

        const ratio = scrollableH > 0 ? Math.min(Math.max(scrollDistance / scrollableH, 0), 1) : 0;

        let activeStep = 0;
        // Sequential thresholds: Card 0 initially, Card 1 at ~28%, Card 2 at ~58%
        if (ratio >= 0.58) {
            activeStep = 2;
        } else if (ratio >= 0.28) {
            activeStep = 1;
        } else {
            activeStep = 0;
        }

        // Cumulative visibility: Card 0 stays visible when Card 1 and Card 2 appear!
        stepEls.forEach((el, idx) => {
            el.classList.toggle("is-shown", idx <= activeStep);
            el.classList.toggle("is-active", idx === activeStep);
        });

        if (activeStep !== currentStep) {
            currentStep = activeStep;
            if (window.Q1) window.Q1.setStep(activeStep);
        }
    }

    // 6. Scroll listener: calculate reading progress, back-to-top toggle, and update steps
    const onScroll = () => {
        const scrollTop = window.scrollY;
        if (bar) bar.classList.toggle("scrolled", scrollTop > 8);
        if (backToTop) backToTop.classList.toggle("visible", scrollTop > 320);

        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;
        document.documentElement.style.setProperty("--scroll-progress", progress.toFixed(4));
        updateCumulativeSteps();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
        syncScrollyGeometry();
        updateCumulativeSteps();
    }, { passive: true });
    window.addEventListener("load", () => {
        syncScrollyGeometry();
        onScroll();
    });

    syncScrollyGeometry();
    onScroll();
    setTimeout(syncScrollyGeometry, 300);
    setTimeout(syncScrollyGeometry, 800);

    // 7. Navigation link active highlight
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

    // 8. Kinetic scroll reveal
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