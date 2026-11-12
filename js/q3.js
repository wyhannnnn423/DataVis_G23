/* Q3 States and territories: geographic choropleth map + ranked bars for a selected year (slider / play),
   with a trend line that follows the selected jurisdiction.
   Data: data/q3_states_by_year.csv (national_total, year, state, state_cases, state_share_pct).
   GeoJSON: Embedded locally inside the file to ensure 100% offline compatibility, zero latency, and no CORS/fetch blocks!
   Owner: Yan Han. */

(function() {
    const container = d3.select("#q3-chart");
    const controls = d3.select("#q3-controls");
    if (container.empty()) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduce ? 0 : 450;
    const fmt = d3.format(",");
    const MINUS = "\u2212";
    const NAMES = { NSW: "New South Wales", Vic: "Victoria", Qld: "Queensland", WA: "Western Australia", SA: "South Australia", Tas: "Tasmania", NT: "Northern Territory", ACT: "Australian Capital Territory" };
    const BREAK = { Vic: 2012, NSW: 2017 };
    const LOW = "#7cc4fb",
        HIGH = "#2f62a8";

    container.classed("placeholder", false).html("").style("position", "relative").text("Loading chart data\u2026");
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    // Load state cases data
    d3.csv("data/q3_states_by_year.csv", d3.autoType).then(function(raw) {
        container.text("");

        const years = Array.from(new Set(raw.map(d => d.year))).sort(d3.ascending);
        const first = years[0],
            last = years[years.length - 1];
        const cell = new Map(raw.map(d => [d.state + "|" + d.year, d]));
        const totals = new Map(raw.map(d => [d.year, d.national_total]));
        const states = Array.from(new Set(raw.map(d => d.state)));
        const cases = (s, y) => (cell.get(s + "|" + y) || {}).state_cases || 0;
        const share = (s, y) => (cell.get(s + "|" + y) || {}).state_share_pct || 0;
        const S = { year: last, metric: "share", sel: "NSW", timer: null };
        const mv = (s, y) => S.metric === "share" ? share(s, y) : cases(s, y);
        const mText = (s, y) => S.metric === "share" ? share(s, y).toFixed(1) + "%" : fmt(cases(s, y));
        const mText2 = (s, y) => S.metric === "share" ? fmt(cases(s, y)) : share(s, y).toFixed(1) + "%";
        const maxOf = () => d3.max(raw, d => S.metric === "share" ? d.state_share_pct : d.state_cases);
        const dagger = (s, y) => BREAK[s] && y >= BREAK[s] ? "\u2020" : "";

        // Embedded geographic boundaries (Zero CORS/network dependencies!)
        const geo = {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": { "STATE_NAME": "Western Australia" },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [129.0, -14.0],
                            [129.0, -35.0],
                            [117.8, -35.0],
                            [115.0, -34.3],
                            [115.0, -32.0],
                            [113.5, -26.0],
                            [113.5, -24.5],
                            [114.0, -21.8],
                            [118.0, -20.0],
                            [122.0, -18.0],
                            [123.5, -16.0],
                            [128.0, -14.8],
                            [129.0, -14.0]
                        ]
                    ]
                }
            }, {
                "type": "Feature",
                "properties": { "STATE_NAME": "Northern Territory" },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [129.0, -26.0],
                            [129.0, -14.0],
                            [130.0, -12.0],
                            [132.0, -11.0],
                            [135.0, -12.0],
                            [136.5, -12.0],
                            [136.0, -15.0],
                            [138.0, -16.0],
                            [138.0, -26.0],
                            [129.0, -26.0]
                        ]
                    ]
                }
            }, {
                "type": "Feature",
                "properties": { "STATE_NAME": "South Australia" },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [129.0, -26.0],
                            [138.0, -26.0],
                            [141.0, -26.0],
                            [141.0, -38.0],
                            [139.5, -37.5],
                            [138.0, -34.5],
                            [137.0, -36.0],
                            [135.0, -35.0],
                            [134.0, -32.5],
                            [129.0, -31.8],
                            [129.0, -26.0]
                        ]
                    ]
                }
            }, {
                "type": "Feature",
                "properties": { "STATE_NAME": "Queensland" },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [138.0, -26.0],
                            [138.0, -16.0],
                            [136.0, -15.0],
                            [139.0, -16.8],
                            [141.5, -11.0],
                            [142.5, -10.0],
                            [143.5, -11.8],
                            [143.0, -14.5],
                            [145.0, -16.0],
                            [146.0, -19.0],
                            [149.0, -22.0],
                            [153.5, -28.2],
                            [141.0, -28.2],
                            [141.0, -26.0],
                            [138.0, -26.0]
                        ]
                    ]
                }
            }, {
                "type": "Feature",
                "properties": { "STATE_NAME": "New South Wales" },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [141.0, -28.2],
                            [153.5, -28.2],
                            [153.0, -31.5],
                            [151.3, -34.0],
                            [151.3, -34.0],
                            [150.0, -36.3],
                            [150.0, -37.5],
                            [147.0, -36.0],
                            [141.0, -34.0],
                            [141.0, -28.2]
                        ]
                    ]
                }
            }, {
                "type": "Feature",
                "properties": { "STATE_NAME": "Australian Capital Territory" },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [148.8, -35.1],
                            [149.3, -35.1],
                            [149.3, -35.7],
                            [148.8, -35.7],
                            [148.8, -35.1]
                        ]
                    ]
                }
            }, {
                "type": "Feature",
                "properties": { "STATE_NAME": "Victoria" },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [141.0, -34.0],
                            [147.0, -36.0],
                            [150.0, -37.5],
                            [148.5, -39.0],
                            [144.5, -38.5],
                            [141.5, -38.3],
                            [141.0, -38.0],
                            [141.0, -34.0]
                        ]
                    ]
                }
            }, {
                "type": "Feature",
                "properties": { "STATE_NAME": "Tasmania" },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [144.5, -40.5],
                            [148.5, -40.8],
                            [148.2, -42.8],
                            [146.8, -43.6],
                            [145.2, -43.4],
                            [144.5, -42.0],
                            [144.5, -40.5]
                        ]
                    ]
                }
            }]
        };

        // Helper to map GeoJSON state name properties to abbreviations used in our CSV
        const mapStateNameToAbbr = (name) => {
            if (!name) return null;
            const n = name.toLowerCase();
            if (n.includes("new south wales")) return "NSW";
            if (n.includes("victoria")) return "Vic";
            if (n.includes("queensland")) return "Qld";
            if (n.includes("western australia")) return "WA";
            if (n.includes("south australia")) return "SA";
            if (n.includes("tasmania")) return "Tas";
            if (n.includes("northern territory")) return "NT";
            if (n.includes("capital territory") || n.includes("act")) return "ACT";
            return null;
        };

        const features = geo.features.filter(f => {
            const abbr = mapStateNameToAbbr(f.properties.STATE_NAME || f.properties.state_name || f.properties.name);
            f.abbr = abbr;
            return abbr !== null;
        });

        /* ---------- controls ---------- */
        const seg = controls.append("div").attr("class", "seg").attr("role", "group").attr("aria-label", "Measure");
        [
            ["share", "Share of national total"],
            ["count", "Cases"]
        ].forEach(([k, label]) =>
            seg.append("button").attr("type", "button").attr("data-mode", k).text(label).on("click", () => {
                S.metric = k;
                draw();
            }));

        const yr = controls.append("div").attr("class", "ctl-group slider-group");
        yr.append("label").attr("class", "ctl-label").attr("for", "q3-year").text("Year");
        const slider = yr.append("input").attr("type", "range").attr("id", "q3-year").attr("class", "year-slider")
            .attr("min", first).attr("max", last).attr("step", 1).attr("value", last)
            .on("input", function() {
                S.year = +this.value;
                draw();
            });
        const yearOut = yr.append("output").attr("class", "year-out").attr("for", "q3-year");
        const playBtn = controls.append("button").attr("type", "button").attr("class", "chip").text("\u25B6 Play")
            .on("click", () => { S.timer ? stop() : play(); });

        function stop() {
            if (S.timer) {
                S.timer.stop();
                S.timer = null;
            }
            playBtn.text("\u25B6 Play");
        }

        function play() {
            if (S.year >= last) {
                S.year = first;
                draw();
            }
            playBtn.text("\u275A\u275A Pause");
            S.timer = d3.interval(() => {
                if (S.year >= last) { stop(); return; }
                S.year += 1;
                draw();
                if (S.year >= last) stop();
            }, 900);
        }

        /* ---------- geographic map + bars svg ---------- */
        const W = 960,
            H = 500,
            ox = 24;
        const svg = container.append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%").attr("role", "group")
            .style("display", "block").style("height", "auto").style("overflow", "visible");
        const mapTitle = svg.append("text").attr("x", ox).attr("y", 18).attr("font-size", 14).attr("font-weight", 700).attr("fill", "currentColor");
        const barTitle = svg.append("text").attr("x", 540).attr("y", 18).attr("font-size", 14).attr("font-weight", 700).attr("fill", "currentColor");

        // map projection centered beautifully over Australia continent and positioned on the left side of SVG
        const projection = d3.geoMercator()
            .center([133.7751, -25.2744])
            .scale(440)
            .translate([210, 255]);
        const pathGenerator = d3.geoPath().projection(projection);

        // colour legend
        const defs = svg.append("defs");
        const lg = defs.append("linearGradient").attr("id", "q3-grad");
        lg.append("stop").attr("offset", "0%").attr("stop-color", LOW);
        lg.append("stop").attr("offset", "100%").attr("stop-color", HIGH);
        svg.append("rect").attr("x", ox).attr("y", 30).attr("width", 220).attr("height", 9).attr("rx", 4).attr("fill", "url(#q3-grad)");
        const legMax = svg.append("text").attr("x", ox + 220).attr("y", 54).attr("text-anchor", "end").attr("font-size", 12).attr("fill", "var(--muted)");
        svg.append("text").attr("x", ox).attr("y", 54).attr("font-size", 12).attr("fill", "var(--muted)").text("0");

        const color = v => d3.interpolateRgb(LOW, HIGH)(Math.max(0, Math.min(1, v)));
        let cScale = d => d;

        // Draw Geographic Map Path Elements
        const mapGroup = svg.append("g").attr("class", "map-group");
        const paths = mapGroup.selectAll("path.state-path")
            .data(features)
            .join("path")
            .attr("class", "state-path")
            .attr("d", pathGenerator)
            .attr("stroke", "var(--line)")
            .attr("stroke-width", 1.5)
            .attr("tabindex", 0)
            .attr("role", "button")
            .style("cursor", "pointer")
            .style("outline", "none")
            .on("click", (e, d) => select(d.abbr))
            .on("keydown", (e, d) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select(d.abbr);
                }
            });

        // Draw State Labels Centered on Map States
        const labelsGroup = svg.append("g").attr("class", "labels-group").style("pointer-events", "none");

        const getLabelPosition = (d) => {
            const abbr = d.abbr;
            if (abbr === "ACT") {
                // Shift ACT to avoid overlaps as it's tiny inside NSW
                const c = pathGenerator.centroid(d);
                return [c[0] + 25, c[1] + 10];
            }
            if (abbr === "Tas") {
                const c = pathGenerator.centroid(d);
                return [c[0], c[1] + 5];
            }
            return pathGenerator.centroid(d);
        };

        const labels = labelsGroup.selectAll("g.map-label")
            .data(features)
            .join("g")
            .attr("class", "map-label")
            .attr("transform", d => `translate(${getLabelPosition(d)[0]},${getLabelPosition(d)[1]})`);

        labels.append("text")
            .attr("class", "tc")
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("font-weight", 800);

        labels.append("text")
            .attr("class", "tv")
            .attr("text-anchor", "middle")
            .attr("y", 12)
            .attr("font-size", 9.5);

        // Bar layout settings - Compact values
        const barX0 = 580,
            barMax = 290,
            rowH = 36, // Shrunk row height
            barY0 = 48; // Compacted start position
        const xBar = d3.scaleLinear().range([0, barMax]);
        const gBars = svg.append("g");

        /* ---------- trend svg ---------- */
        const Wt = 960,
            Ht = 180, // Shrunk height from 270 to 180 for sticky viewport safety
            mt = { top: 30, right: 70, bottom: 28, left: 72 };
        const trendWrap = container.append("div").style("margin-top", "18px");
        const tsvg = trendWrap.append("svg").attr("viewBox", `0 0 ${Wt} ${Ht}`).attr("width", "100%").attr("role", "img")
            .style("display", "block").style("height", "auto").style("overflow", "visible");
        const tx = d3.scaleLinear().domain([first, last]).range([mt.left, Wt - mt.right]);
        const tg = tsvg.append("g");

        container.append("p").attr("class", "chart-note").html(
            "\u2020 Data break: Victoria\u2019s counts from 2012 and NSW\u2019s from 2017 follow recording changes, so they are not comparable with earlier years. Because shares are relative, a recording change in one jurisdiction also shifts the other jurisdictions\u2019 shares. " +
            "Shares are of the national total; the eight jurisdictions add up to slightly less than it (for example " + fmt(d3.sum(states, s => cases(s, first))) + " against " + fmt(totals.get(first)) + " in " + first + "). Counts are not adjusted for population. Source: BITRE hospitalised injury data.");

        const insight = d3.select("#q3-insight").attr("aria-live", "polite");

        function select(s) {
            S.sel = s;
            draw();
        }

        /* ---------- draw ---------- */
        function draw() {
            const share_ = S.metric === "share";
            const t = d3.transition().duration(firstDraw ? 0 : dur).ease(d3.easeCubicOut);
            const mx = maxOf();
            cScale = v => v / mx;
            xBar.domain([0, mx]);

            slider.property("value", S.year);
            yearOut.text(S.year);
            seg.selectAll("button").attr("aria-pressed", function() { return this.dataset.mode === S.metric; });
            mapTitle.text(share_ ? `Share of national total, ${S.year}` : `Hospitalised injuries, ${S.year}`);
            barTitle.text(share_ ? "Ranking by share of national total" : "Ranking by number of cases");
            legMax.text(share_ ? mx.toFixed(0) + "%" : fmt(Math.round(mx)));

            // Update Map Paths
            paths.attr("aria-label", d => `${NAMES[d.abbr] || d.abbr}: ${mText(d.abbr, S.year)}`)
                .attr("aria-pressed", d => S.sel === d.abbr);

            paths.transition(t)
                .attr("fill", d => color(cScale(mv(d.abbr, S.year))))
                .attr("stroke", d => S.sel === d.abbr ? "var(--highlight-warm)" : "var(--line)")
                .attr("stroke-width", d => S.sel === d.abbr ? 2.8 : 1.2);

            // Update Map Labels
            labels.select(".tc")
                .text(d => d.abbr + dagger(d.abbr, S.year))
                .attr("fill", d => (d.abbr === "ACT" || d.abbr === "Tas") ? "#f1f5f9" : (cScale(mv(d.abbr, S.year)) < 0.48 ? "#0b0f17" : "#f1f5f9"))
                .attr("stroke", d => (d.abbr === "ACT" || d.abbr === "Tas") ? "#0b0f17" : "none").attr("stroke-width", 3).attr("paint-order", "stroke");

            labels.select(".tv")
                .text(d => mText(d.abbr, S.year))
                .attr("fill", d => (d.abbr === "ACT" || d.abbr === "Tas") ? "#f1f5f9" : (cScale(mv(d.abbr, S.year)) < 0.48 ? "#0b0f17" : "#f1f5f9"))
                .attr("stroke", d => (d.abbr === "ACT" || d.abbr === "Tas") ? "#0b0f17" : "none").attr("stroke-width", 3).attr("paint-order", "stroke");

            const order = states.slice().sort((p, q) => mv(q, S.year) - mv(p, S.year));
            const rows = gBars.selectAll("g.brow").data(order, s => s).join(enter => {
                const g = enter.append("g").attr("class", "brow").attr("tabindex", 0).attr("role", "button")
                    .attr("transform", (s, i) => `translate(0,${barY0 + i * rowH})`)
                    .on("click", (e, s) => select(s))
                    .on("keydown", (e, s) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            select(s);
                        }
                    });
                g.append("rect").attr("class", "hit").attr("x", 500).attr("y", -6).attr("width", 440).attr("height", rowH - 4).attr("rx", 8).attr("fill", "currentColor").attr("opacity", 0);
                g.append("text").attr("class", "bl").attr("x", barX0 - 12).attr("y", 20).attr("text-anchor", "end").attr("font-size", 14).attr("fill", "currentColor");
                g.append("rect").attr("class", "bb").attr("x", barX0).attr("y", 4).attr("height", 24).attr("rx", 5).attr("width", 0);
                const v = g.append("text").attr("class", "bv").attr("y", 21).attr("font-size", 14).attr("font-weight", 700).attr("fill", "currentColor");
                v.append("tspan").attr("class", "m");
                v.append("tspan").attr("class", "m2").attr("dx", 7).attr("font-size", 12).attr("font-weight", 400).attr("fill", "var(--muted)");
                return g;
            });
            rows.attr("aria-label", s => `${NAMES[s] || s}: ${mText(s, S.year)}`).attr("aria-pressed", s => S.sel === s);
            rows.transition(t).attr("transform", (s, i) => `translate(0,${barY0 + i * rowH})`);
            rows.select(".hit").attr("opacity", s => S.sel === s ? 0.08 : 0);
            rows.select(".bl").text(s => s + dagger(s, S.year)).attr("font-weight", s => S.sel === s ? 800 : 400);
            rows.select(".bb").transition(t).attr("width", s => Math.max(2, xBar(mv(s, S.year)))).attr("fill", s => color(cScale(mv(s, S.year))));
            rows.select(".bv").transition(t).attr("x", s => barX0 + Math.max(2, xBar(mv(s, S.year))) + 10);
            rows.select(".bv .m").text(s => mText(s, S.year));
            rows.select(".bv .m2").text(s => "(" + mText2(s, S.year) + ")");

            drawTrend();
            writeInsight(order);
        }

        function drawTrend() {
            const share_ = S.metric === "share";
            const ymax = d3.max(raw, d => share_ ? d.state_share_pct : d.state_cases);
            const ty = d3.scaleLinear().domain([0, ymax * 1.1]).nice().range([Ht - mt.bottom, mt.top]);
            tg.html("");
            tg.append("text").attr("x", mt.left).attr("y", 16).attr("font-size", 14).attr("font-weight", 700).attr("fill", "currentColor")
                .text(share_ ? `Share of national total over time: ${NAMES[S.sel] || S.sel} highlighted` : `Cases over time: ${NAMES[S.sel] || S.sel} highlighted`);
            tg.append("g").selectAll("line").data(ty.ticks(4)).join("line").attr("x1", mt.left).attr("x2", Wt - mt.right)
                .attr("y1", d => ty(d)).attr("y2", d => ty(d)).attr("stroke", "currentColor").attr("opacity", 0.12).attr("stroke-dasharray", "3 5");
            tg.append("g").attr("transform", `translate(${mt.left},0)`).attr("font-size", 12.5).attr("opacity", 0.8)
                .call(d3.axisLeft(ty).ticks(4).tickFormat(share_ ? d => d + "%" : fmt).tickSize(0).tickPadding(10)).select(".domain").remove();
            tg.append("g").attr("transform", `translate(0,${Ht - mt.bottom})`).attr("font-size", 12.5).attr("opacity", 0.8)
                .call(d3.axisBottom(tx).ticks(years.length).tickFormat(d3.format("d")).tickSize(0).tickPadding(10)).select(".domain").remove();

            // recording-change markers
            Object.entries(BREAK).forEach(([s, y]) => {
                tg.append("line").attr("x1", tx(y)).attr("x2", tx(y)).attr("y1", mt.top).attr("y2", Ht - mt.bottom)
                    .attr("stroke", "var(--highlight-warm)").attr("stroke-dasharray", "4 4").attr("opacity", 0.55);
                tg.append("text").attr("x", tx(y) + 5).attr("y", mt.top + 10).attr("font-size", 11.5).attr("fill", "var(--highlight-warm)").text(`${y} ${s}\u2020`);
            });

            const selColor = color(cScale(mv(S.sel, S.year)));
            const line = d3.line().x(d => tx(d.year)).y(d => ty(d.v)).curve(d3.curveMonotoneX);
            const series = s => years.map(y => ({ year: y, v: mv(s, y) }));
            states.filter(s => s !== S.sel).forEach(s => {
                tg.append("path").datum(series(s)).attr("d", line).attr("fill", "none").attr("stroke", "var(--muted)").attr("stroke-opacity", 0.4).attr("stroke-width", 1.6);
            });
            tg.append("path").datum(series(S.sel)).attr("d", line).attr("fill", "none").attr("stroke", selColor).attr("stroke-width", 3.4).attr("stroke-linecap", "round");

            // direct labels at the right end of every line
            const endPos = states.map(st => ({ st, y: ty(mv(st, last)) })).sort((a, b) => a.y - b.y);
            endPos.forEach((e, i) => { e.ly = i === 0 ? e.y : Math.max(e.y, endPos[i - 1].ly + 12); });
            endPos.forEach(e => {
                tg.append("text").attr("x", tx(last) + 8).attr("y", e.ly + 4).attr("font-size", e.st === S.sel ? 12.5 : 11)
                    .attr("font-weight", e.st === S.sel ? 800 : 400).attr("fill", e.st === S.sel ? "currentColor" : "var(--muted)").text(e.st);
            });

            // current-year marker
            tg.append("line").attr("x1", tx(S.year)).attr("x2", tx(S.year)).attr("y1", mt.top).attr("y2", Ht - mt.bottom)
                .attr("stroke", "currentColor").attr("opacity", 0.5);
            states.forEach(s => {
                tg.append("circle").attr("cx", tx(S.year)).attr("cy", ty(mv(s, S.year))).attr("r", s === S.sel ? 6.5 : 3.5)
                    .attr("fill", s === S.sel ? selColor : "var(--muted)").attr("stroke", s === S.sel ? "#f1f5f9" : "var(--surface)").attr("stroke-width", 2);
            });
            tg.append("text").attr("x", tx(S.year)).attr("y", ty(mv(S.sel, S.year)) - 12).attr("text-anchor", S.year > last - 2 ? "end" : "middle")
                .attr("font-size", 13).attr("font-weight", 700).attr("fill", "#f1f5f9").attr("stroke", "#0b0f17").attr("stroke-width", 3).attr("paint-order", "stroke").text(`${S.sel} ${mText(S.sel, S.year)}`);

            // click / drag on the chart to move the year
            tg.append("rect").attr("x", mt.left).attr("y", mt.top).attr("width", Wt - mt.left - mt.right).attr("height", Ht - mt.top - mt.bottom)
                .attr("fill", "transparent").style("cursor", "ew-resize")
                .on("pointerdown pointermove", function(e) {
                    if (e.type === "pointermove" && e.buttons !== 1) return;
                    const px = d3.pointer(e, tsvg.node())[0];
                    const k = tsvg.node().getBoundingClientRect().width / Wt;
                    const yv = Math.max(first, Math.min(last, Math.round(tx.invert(px / k))));
                    if (yv !== S.year) {
                        stop();
                        S.year = yv;
                        draw();
                    }
                });
            tsvg.attr("aria-label", `Line chart of ${share_ ? "share of national total" : "cases"} by state and territory, ${first} to ${last}, with ${NAMES[S.sel] || S.sel} highlighted.`);
        }

        function writeInsight(order) {
            const lead = order[0],
                second = order[1];
            const sg = n => (n >= 0 ? "+" : MINUS) + Math.abs(n).toFixed(1);
            let html = `In <strong>${S.year}</strong>, <strong>${esc(NAMES[lead] || lead)}</strong> had the largest share of hospitalised injuries (${share(lead, S.year).toFixed(1)}%, ${fmt(cases(lead, S.year))} cases), ahead of ${esc(NAMES[second] || second)} (${share(second, S.year).toFixed(1)}%). `;
            if (S.year > first) {
                const d = share(S.sel, S.year) - share(S.sel, first);
                const rankAt = y => states.slice().sort((a, b) => share(b, y) - share(a, y)).indexOf(S.sel) + 1;
                const r0 = rankAt(first),
                    r1 = rankAt(S.year);
                html += `<strong>${esc(NAMES[S.sel] || S.sel)}</strong> went from ${share(S.sel, first).toFixed(1)}% in ${first} to ${share(S.sel, S.year).toFixed(1)}% (${sg(d)} pp)` +
                    (r0 !== r1 ? `, moving from rank ${r0} to rank ${r1}. ` : `, ranked ${r1} in both years. `);
                const ch = states.map(st => ({ st, d: share(st, S.year) - share(st, first) })).sort((a, b) => b.d - a.d);
                const up = ch[0],
                    dn = ch[ch.length - 1];
                html += `Across all jurisdictions since ${first}, the biggest gain was ${esc(NAMES[up.st] || up.st)} (${sg(up.d)} pp) and the biggest fall was ${esc(NAMES[dn.st] || dn.st)} (${sg(dn.d)} pp).`;
                const crossed = Object.entries(BREAK).filter(([st, y]) => y > first && y <= S.year);
                if (crossed.length) {
                    const names = crossed.map(([st, y]) => `${esc(NAMES[st] || st)} (${y})`).join(" and ");
                    html += `<span style="display:block;margin-top:10px;color:var(--highlight-warm)"><strong>Caution:</strong> ${names} changed how admissions are recorded. Because shares are relative, this also shifts every other jurisdiction\u2019s share, so part of these changes reflects recording, not safety.</span>`;
                }
            } else {
                html += `Move the slider or press Play to see how each share changes. Click a state on the map or a bar to follow one jurisdiction.`;
            }
            insight.html(html);
        }

        // First draw is instant and hidden; the entrance plays when the chart card scrolls into view.
        let firstDraw = true;
        draw();
        firstDraw = false;

        // Scroll-driven entrance: window.Q3.setProgress(p) is called by main.js while the reader scrolls (0 to 1).
        const ease = d3.easeCubicOut;
        const stage = (p, lo, hi) => Math.max(0, Math.min(1, (p - lo) / (hi - lo)));
        const cnt = (s, e) => S.metric === "share" ? (share(s, S.year) * e).toFixed(1) + "%" : fmt(Math.round(cases(s, S.year) * e));
        const lens = paths.nodes().map(n => n.getTotalLength());
        let done = false;

        function setProgress(p) {
            if (done && p >= 1) return;
            done = p >= 1;
            // 1. map: each state's outline draws itself, then its colour fills in
            paths.each(function(d, i) {
                const a = i * 0.06;
                const draw = ease(stage(p, a, a + 0.2)),
                    fill = ease(stage(p, a + 0.12, a + 0.3));
                d3.select(this)
                    .attr("stroke-dasharray", done ? null : lens[i])
                    .attr("stroke-dashoffset", done ? null : lens[i] * (1 - draw))
                    .attr("fill-opacity", done ? null : fill);
            });
            // 2. map labels rise into place and their values count up
            labels.each(function(d, i) {
                const a = 0.25 + i * 0.045,
                    e = done ? 1 : ease(stage(p, a, a + 0.2));
                const g = d3.select(this);
                g.selectAll("text").attr("opacity", done ? null : e).attr("transform", done ? null : `translate(0,${(1 - e) * 10})`);
                g.select(".tv").text(done ? mText(d.abbr, S.year) : cnt(d.abbr, e));
            });
            // 3. ranking bars grow from 0 (top rank first), names slide in, values count up
            gBars.selectAll("g.brow").each(function(s, i) {
                const g = d3.select(this);
                const lo = 0.35 + i * 0.05,
                    e = done ? 1 : ease(stage(p, lo, lo + 0.25));
                const w = Math.max(2, xBar(mv(s, S.year)));
                const cur = done ? w : w * e;
                g.attr("opacity", done ? 1 : stage(p, lo, lo + 0.08));
                g.select(".bl").attr("transform", done ? null : `translate(${-16 * (1 - e)},0)`);
                g.select(".bb").attr("width", cur);
                g.select(".bv").attr("x", barX0 + cur + 10);
                g.select(".bv .m").text(done ? mText(s, S.year) : cnt(s, e));
            });
            // 4. share-over-time chart fades in last
            tsvg.style("opacity", done ? null : stage(p, 0.8, 1));
        }
        if (!reduce) {
            window.Q3 = { setProgress };
            setProgress((window.chartProgress || {}).q3 || 0);
        }
    }).catch(function(err) {
        console.error("Q3 failed to load data:", err);
        container.text("Sorry, the chart could not be loaded.");
    });
})();