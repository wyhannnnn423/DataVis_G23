/* Page behaviour: nav highlight, circular scroll progress button, kinetic scroll reveal,
   and Q1/Q2/Q3 Question + Chart lock with cumulative sequential card revelation.
   Owner: Group 23. */

(function() {
    const bar = document.getElementById("topbar");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Set up scrollytelling sections for Q1, Q2, and Q3
    const scrollySections = ["q1", "q2", "q3"].map(id => {
        const sec = document.getElementById(id);
        if (!sec) return null;

        const sticky = sec.querySelector(".sticky");
        const head = sec.querySelector(".section-head");
        if (sticky && head && head.parentElement !== sticky) {
            sticky.insertBefore(head, sticky.firstChild);
        }

        const stepsWrapper = sec.querySelector(".steps");
        let stepsPanel = sec.querySelector(".steps-sticky-card");
        if (stepsWrapper && !stepsPanel) {
            stepsPanel = document.createElement("div");
            stepsPanel.className = "steps-sticky-card";
            while (stepsWrapper.firstChild) {
                stepsPanel.appendChild(stepsWrapper.firstChild);
            }
            stepsWrapper.appendChild(stepsPanel);
        }

        const stepEls = Array.from(sec.querySelectorAll(".step"));
        return {
            id,
            sec,
            sticky,
            head,
            stepEls,
            currentStep: -1,
            graphShown: false
        };
    }).filter(Boolean);

    // Calibrate vertical lock offset for each scrollytelling section
    function syncScrollyGeometry() {
        scrollySections.forEach(s => {
            if (!s.sticky || !s.head) return;
            const barH = bar ? bar.offsetHeight : 64;
            const headStyle = window.getComputedStyle(s.head);
            const headTotalH = s.head.offsetHeight + parseFloat(headStyle.marginBottom || 20);
            const cardOffsetBelowChartTop = 48;

            let lockTop = Math.round(barH + 18 + headTotalH + cardOffsetBelowChartTop);
            if (window.matchMedia("(max-width: 1024px)").matches) {
                // Mobile: cards lock directly under the pinned question + chart
                lockTop = Math.round(barH + 8 + s.sticky.offsetHeight + 10);
            }
            s.sec.style.setProperty("--step-lock-top", lockTop + "px");
        });
    }

    // Ensure Back-to-Top button has SVG Circular Progress Ring and Chevron Icon
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

    // Update cumulative steps and trigger animations for Q1, Q2, and Q3
    function updateCumulativeSteps() {
        scrollySections.forEach(s => {
            if (!s.sec || !s.stepEls.length) return;

            const rect = s.sec.getBoundingClientRect();
            const barH = bar ? bar.offsetHeight : 64;
            const scrollDistance = (barH + 30) - rect.top;
            // keep the last 70vh of the section as a blank "hold" so the final card can be read before the section unpins (matches --scrolly-tail in CSS)
            const scrollableH = rect.height - window.innerHeight - window.innerHeight * 0.7;

            const ratio = scrollableH > 0 ? Math.min(Math.max(scrollDistance / scrollableH, 0), 1) : 0;

            let activeStep = 0;
            if (s.stepEls.length === 3) {
                // Q1: 3 cards
                if (ratio >= 0.58) {
                    activeStep = 2;
                } else if (ratio >= 0.28) {
                    activeStep = 1;
                } else {
                    activeStep = 0;
                }
            } else if (s.stepEls.length === 2) {
                // Q2, Q3: 2 cards
                if (ratio >= 0.5) {
                    activeStep = 1;
                } else {
                    activeStep = 0;
                }
            }

            const entered = rect.top < window.innerHeight * 0.4 && rect.bottom > window.innerHeight * 0.1;
            const apiName = s.id.toUpperCase(); // "Q1", "Q2", "Q3"

            if (window[apiName] && entered !== s.graphShown) {
                s.graphShown = entered;
                if (typeof window[apiName].setVisible === "function") {
                    window[apiName].setVisible(entered);
                }
            }

            s.stepEls.forEach((el, idx) => {
                el.classList.toggle("is-shown", entered && idx <= activeStep);
                el.classList.toggle("is-active", entered && idx === activeStep);
            });

            if (activeStep !== s.currentStep) {
                s.currentStep = activeStep;
                if (window[apiName] && typeof window[apiName].setStep === "function") {
                    window[apiName].setStep(activeStep);
                }
            }

            // Sync progress for Q2 and Q3 dumbbell/map animations
            if (window[apiName] && typeof window[apiName].setProgress === "function") {
                if (reduce) {
                    window[apiName].setProgress(1);
                } else {
                    window[apiName].setProgress(ratio);
                }
            }
        });
    }

    // Scroll listener: calculate reading progress, back-to-top toggle, and update steps
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
    scrollySections.forEach(s => {
        if (s.sticky && window.ResizeObserver) {
            new ResizeObserver(syncScrollyGeometry).observe(s.sticky);
        }
    });
    setTimeout(syncScrollyGeometry, 300);
    setTimeout(syncScrollyGeometry, 800);

    // Mobile hamburger menu
    const navToggle = document.getElementById("nav-toggle");
    const siteNav = document.getElementById("site-nav");

    function setNav(open) {
        if (!bar || !navToggle) return;
        bar.classList.toggle("nav-open", open);
        navToggle.setAttribute("aria-expanded", String(open));
        navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    if (bar && navToggle && siteNav) {
        navToggle.addEventListener("click", () => setNav(!bar.classList.contains("nav-open")));
        siteNav.addEventListener("click", e => { if (e.target.closest("a")) setNav(false); });
        document.addEventListener("click", e => { if (!bar.contains(e.target)) setNav(false); });
        document.addEventListener("keydown", e => { if (e.key === "Escape") setNav(false); });
        window.matchMedia("(min-width: 861px)").addEventListener("change", e => { if (e.matches) setNav(false); });
    }

    // Navigation link active highlight
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

    // Kinetic scroll reveal
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