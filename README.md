# Website

Open with a local server (d3.csv cannot read files from a double-clicked page):

    python3 -m http.server 8000

then visit http://localhost:8000.

- index.html: hero, five story sections, wrap-up, data notes
- css/style.css: calm light/dark theme, responsive, reduced-motion support
- js/main.js: nav highlight, scroll reveal, scroll steps
- js/q1.js: working scroll-driven line chart (data/q1_national_trend.csv)
- js/q2.js to q5.js: placeholders. Each draws into #qN-chart and puts filters in #qN-controls
