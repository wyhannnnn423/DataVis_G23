/* Page behaviour: nav highlight, scroll reveal, and scroll-driven chart steps.
   Owner: Han (website structure and integration). */

(function () {
  const bar = document.getElementById("topbar");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Bar border once scrolled
  window.addEventListener("scroll", () => bar.classList.toggle("scrolled", window.scrollY > 8), { passive: true });

  // Highlight the nav link of the section in view
  const links = document.querySelectorAll("[data-link]");
  const sections = ["q1", "q2", "q3", "q4", "q5"].map(id => document.getElementById(id));
  const navObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.toggle("active", l.dataset.link === e.target.id));
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach(s => s && navObs.observe(s));

  // Fade sections in as they appear
  const revealObs = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => reduce ? el.classList.add("in") : revealObs.observe(el));

  // Scroll steps: tell the Q1 chart which step is active
  const stepObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll(".step").forEach(s => s.classList.toggle("is-active", s === e.target));
        if (window.Q1) window.Q1.setStep(Number(e.target.dataset.step));
      }
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  document.querySelectorAll(".step").forEach(s => stepObs.observe(s));
})();
