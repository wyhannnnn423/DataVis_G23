/* Page behaviour: nav highlight, scroll reveal, and Q1 Question + Chart synchronised scroll steps.
   Owner: Yan Han (website structure and integration). */

(function() {
        const bar = document.getElementById("topbar");
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const steps = Array.from(document.querySelectorAll(".step"));
        let currentStep = -1;

        // Keep Q1 Question (.section-head) inside .sticky so Question + Chart lock together
        const q1Section = document.getElementById("q1");
        const q1Sticky = q1Section ? q1Section.querySelector(".sticky") : null;
        const q1Head = q1Section ? q1Section.querySelector(".section-head") : null;
        if (q1Sticky && q1Head && q1Head.parentElement !== q1Sticky) {
            q1Sticky.insertBefore(q1Head, q1Sticky.firstChild);
        }

        function syncScrollyGeometry() {
            if (!q1Sticky || !q1Head || !steps.length) return;
            const barH = bar ? bar.offsetHeight : 64;
            const headStyle = window.getComputedStyle(q1Head);
            const headTotalH = q1Head.offsetHeight + parseFloat(headStyle.marginBottom || 20);
            const cardOffsetBelowChartTop = 52;

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

        const onScroll = () => {
            const scrollTop = window.scrollY;
            if (bar) bar.classList.toggle("scrolled", scrollTop > 8);
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
        setTimeout(syncScrollyGeometry, 350);
        setTimeout(syncScrollyGeometry, 1000);

        // Highlight the nav link of the section in view
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

        // Fade sections in as they appear
        const revealObs = new IntersectionObserver((entries, obs) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add("in");
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -60px 0px" });

        document.querySelectorAll(".r