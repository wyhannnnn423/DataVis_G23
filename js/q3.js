/* Q3 States and Territories: Geographic choropleth map + ranking bar chart for selected year (slider / play),
   with a lower trend line following the currently selected state/territory.
   Data: data/q3_states_by_year.csv (national_total, year, state, state_cases, state_share_pct).
   GeoJSON: data/aus-states.json (Natural Earth state boundaries, public domain).
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

    const LOW = "#e0f2fe",
        MID = "#38bdf8",
        HIGH = "#1d4ed8";

    container.classed("placeholder", false).html("").style("position", "relative").text("Loading chart data\u2026");
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    Promise.all([
        d3.csv("data/q3_states_by_year.csv", d3.autoType),
        d3.json("data/aus-states.json")
    ]).then(function([raw, geo]) {
        container.text("");

        const years = Array.from(new Set(raw.map(d => d.year))).sort(d3.ascending);
        const first = years[0],
            last = years[years.length - 1];
        const cell = new Map(raw.map(d => [d.state + "|" + d.year, d]));
        const totals = new Map(raw.map(d => [d.year, d.national_total]));
        const states = Array.from(new Set(raw.map(d => d.state)));
        const cases = (s, y) => (cell.get(s + "|" + y) || {}).state_cases || 0;
        const share = (s, y) => (cell.get(s + "|" + y) || {}).state_share_pct || 0;
        const S = { year: last, metric: "share", sel: "NSW", timer: null, hover: null, lock: null };
        const mv = (s, y) => S.metric === "share" ? share(s, y) : cases(s, y);
        const mText = (s, y) => S.metric === "share" ? share(s, y).toFixed(1) + "%" : fmt(cases(s, y));
        const mText2 = (s, y) => S.metric === "share" ? fmt(cases(s, y)) : share(s, y).toFixed(1) + "%";
        const maxOf = () => d3.max(raw, d => S.metric === "share" ? d.state_share_pct : d.state_cases);
        const dagger = (s, y) => BREAK[s] && y >= BREAK[s] ? "\u2020" : "";

        const features = geo.features.filter(f => {
            f.abbr = f.properties.state;
            return !!f.abbr;
        });

        const seg = controls.append("div").attr("class", "segmented").attr("role", "group").attr("aria-label", "Measure");
        [
            ["share", "Share of national total"],
            ["count", "Cases"]
        ].forEach(([k, label]) =>
            seg.append("button").attr("type", "button").attr("data-mode", k).text(label).on("click", () => {
                S.metric = k;
                draw();
            }));

        const yr = controls.append("div").attr("class", "control-group slider-group");
        yr.append("label").attr("class", "control-label").attr("for", "q3-year").text("Year");
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

        const W = 980,
            H = 470,
            ox = 20;
        const svg = container.append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%").attr("role", "group")
            .style("display", "block").style("height", "auto").style("overflow", "visible");
        const mapTitle = svg.append("text").attr("x", ox).attr("y", 18).attr("font-size", 13.5).attr("font-weight", 700).attr("fill", "currentColor");
        const barTitle = svg.append("text").attr("x", 540).attr("y", 18).attr("font-size", 13.5).attr("font-weight", 700).attr("fill", "currentColor");

        const projection = d3.geoConicEqualArea().parallels([-18, -36]).rotate([-133, 0])
            .fitExtent([
                [ox + 6, 60],
                [452, 424]
            ], geo);
        const pathGenerator = d3.geoPath().projection(projection);

        const LABEL_AT = {
            WA: [122, -26],
            NT: [133.5, -19.5],
            SA: [135.5, -30],
            Qld: [144.5, -22.5],
            NSW: [146.5, -32.5],
            Vic: [144, -37],
            Tas: [146.6, -45.4],
            ACT: [153.7, -36.4]
        };
        const ACT_POINT = [149.1, -35.4];

        const defs = svg.append("defs");
        const lg = defs.append("linearGradient").attr("id", "q3-grad");
        lg.append("stop").attr("offset", "0%").attr("stop-color", LOW);
        lg.append("stop").attr("offset", "50%").attr("stop-color", MID);
        lg.append("stop").attr("offset", "100%").attr("stop-color", HIGH);

        const colorScale = d3.scaleLinear()
            .domain([0, 0.45, 1])
            .range([LOW, MID, HIGH])
            .interpolate(d3.interpolateRgb);
        const color = v => colorScale(Math.max(0, Math.min(1, v)));
        let cScale = d => d;

        svg.append("rect").attr("x", ox).attr("y", 28).attr("width", 200).attr("height", 8).attr("rx", 4).attr("fill", "url(#q3-grad)");
        const legMax = svg.append("text").attr("x", ox + 200).attr("y", 50).attr("text-anchor", "end").attr("font-size", 11.5).attr("fill", "var(--muted)");
        svg.append("text").attr("x", ox).attr("y", 50).attr("font-size", 11.5).attr("fill", "var(--muted)").text("0");

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
            .on("pointermove", (e, d) => onHover(e, d.abbr))
            .on("pointerleave", onLeave)
            .on("focus", (e, d) => onHover(e, d.abbr))
            .on("blur", onLeave)
            .on("click", (e, d) => onClick(e, d.abbr))
            .on("keydown", (e, d) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick(e, d.abbr);
                }
            });

        const labelsGroup = svg.append("g").attr("class", "labels-group").style("pointer-events", "none");

        const getLabelPosition = d => projection(LABEL_AT[d.abbr]);

        (function() {
            const p1 = projection(ACT_POINT),
                p2 = projection(LABEL_AT.ACT);
            labelsGroup.append("line").attr("class", "act-leader")
                .attr("x1", p1[0]).attr("y1", p1[1]).attr("x2", p2[0] - 16).attr("y2", p2[1] - 4)
                .attr("stroke", "#f1f5f9").attr("stroke-width", 1).attr("opacity", 0.75);
        })();

        const labels = labelsGroup.selectAll("g.map-label")
            .data(features)
            .join("g")
            .attr("class", "map-label")
            .attr("transform", d => `translate(${getLabelPosition(d)[0]},${getLabelPosition(d)[1]})`);

        labels.append("text")
            .attr("class", "tc")
            .attr("text-anchor", "middle")
            .attr("font-size", 10.5)
            .attr("font-weight", 800);

        labels.append("text")
            .attr("class", "tv")
            .attr("text-anchor", "middle")
            .attr("y", 11)
            .attr("font-size", 9);

        const barX0 = 540,
            barMax = 380,
            rowH = 32,
            barY0 = 44;
        const xBar = d3.scaleLinear().range([0, barMax]);
        const gBars = svg.append("g");

        const Wt = 980,
            Ht = 230,
            mt = { top: 28, right: 85, bottom: 26, left: 68 };
        const trendWrap = container.append("div").style("margin-top", "16px");
        const tsvg = trendWrap.append("svg").attr("viewBox", `0 0 ${Wt} ${Ht}`).attr("width", "100%").attr("role", "img")
            .style("display", "block").style("height", "auto").style("overflow", "visible");
        const tx = d3.scaleLinear().domain([first, last]).range([mt.left, Wt - mt.right]);
        const tg = tsvg.append("g");

        container.append("p").attr("class", "chart-note").html(
            "\u2020 <strong>Data breaks:</strong> Victoria (2012) and NSW (2017) changed admission recording; figures are not directly comparable across breaks, and relative shares shift for all jurisdictions. &bull; " +
            "<strong>Totals:</strong> State sums fall slightly below the national total. &bull; " +
            "Absolute counts, unadjusted for population. <em>Source: BITRE hospitalised injury data.</em>"
        );

        const tipEl = container.append("div").attr("class", "chart-tip chart-tip--detail").attr("role", "status")
            .style("opacity", 0).style("visibility", "hidden");
        let tipAnchor = null;

        function tipHtml(s) {
            const y = S.year,
                nm = NAMES[s] || s;
            const sgn = v => (v >= 0 ? "+" : MINUS) + Math.abs(v).toFixed(1);
            let html = `<div class="tip-title">${esc(nm)}${dagger(s, y)}, ${y}</div>` +
                `<div class="tip-value">${share(s, y).toFixed(1)}% of national total</div>` +
                `<div class="tip-sub">${fmt(cases(s, y))} hospitalisations</div>`;
            if (y > first) {
                const prevCases = cases(s, y - 1);
                const cp = prevCases ? (cases(s, y) / prevCases - 1) * 100 : null;
                html += `<div class="tip-sub">vs ${y - 1}: ${cp === null ? "n/a" : sgn(cp) + "%"} cases, ${sgn(share(s, y) - share(s, y - 1))} pp share</div>`;
            }
            const rank = states.slice().sort((a, b) => mv(b, y) - mv(a, y)).indexOf(s) + 1;
            html += `<div class="tip-sub">Rank ${rank} of ${states.length}</div>`;
            if (dagger(s, y)) {
                html += `<div class="tip-warn">\u26A0 ${esc(nm)}: admission recording changed in ${BREAK[s]}, so figures are not directly comparable with earlier years</div>`;
            }
            html += `<div class="tip-hint">${S.lock === s ? "Locked \u00B7 click again or press Esc to unlock" : "Click to lock"}</div>`;
            return html;
        }

        function placeTip(x, y) {
            tipAnchor = { x, y };
            const node = tipEl.node();
            const w = node.offsetWidth,
                h = node.offsetHeight,
                cw = container.node().clientWidth;
            let left = x + 16;
            if (left + w > cw - 4) left = x - w - 16;
            let top = y - h - 14;
            if (top < 4) top = y + 18;
            tipEl.style("left", Math.max(4, left) + "px").style("top", top + "px");
        }

        function localPoint(e) {
            const r = container.node().getBoundingClientRect();
            if (typeof e.clientX === "number" && e.type !== "keydown" && e.type !== "focus") return [e.clientX - r.left, e.clientY - r.top];
            const b = e.currentTarget.getBoundingClientRect();
            return [b.left + b.width / 2 - r.left, b.top + b.height / 2 - r.top];
        }

        function showTip(s, x, y) {
            tipEl.html(tipHtml(s)).classed("is-locked", S.lock === s)
                .style("visibility", "visible").style("opacity", 1);
            placeTip(x, y);
        }

        function hideTip() {
            tipEl.style("opacity", 0).style("visibility", "hidden");
        }

        function paintHover() {
            paths.classed("is-hover", d => S.hover === d.abbr);
            gBars.selectAll("g.brow").classed("is-hover", s => S.hover === s);
            if (S.hover) paths.filter(d => d.abbr === S.hover).raise();
        }

        function onHover(e, s) {
            if (S.lock) return;
            if (S.hover !== s) {
                S.hover = s;
                paintHover();
            }
            const [x, y] = localPoint(e);
            showTip(s, x, y);
        }

        function onLeave() {
            if (S.lock) return;
            S.hover = null;
            paintHover();
            hideTip();
        }

        function unlock() {
            if (!S.lock) return;
            S.lock = null;
            S.hover = null;
            paintHover();
            hideTip();
        }

        function onClick(e, s) {
            const [x, y] = localPoint(e);
            if (S.lock === s) {
                S.lock = null;
                S.hover = s;
                paintHover();
                showTip(s, x, y);
                return;
            }
            S.lock = s;
            S.hover = null;
            paintHover();
            select(s);
            showTip(s, x, y);
        }

        function refreshTip() {
            const s = S.lock || S.hover;
            if (!s || !tipAnchor) return;
            tipEl.html(tipHtml(s)).classed("is-locked", !!S.lock);
            placeTip(tipAnchor.x, tipAnchor.y);
        }

        container.on("click.q3unlock", e => {
            if (!e.target.closest(".state-path, .brow, .map-label")) unlock();
        });
        d3.select(document).on("keydown.q3unlock", e => { if (e.key === "Escape") unlock(); });

        labels.filter(d => d.abbr === "ACT")
            .style("pointer-events", "all").style("cursor", "pointer")
            .on("pointermove", (e, d) => onHover(e, d.abbr))
            .on("pointerleave", onLeave)
            .on("click", (e, d) => onClick(e, d.abbr))
            .insert("circle", ":first-child").attr("r", 18).attr("fill", "transparent");

        const insight = d3.select("#q3-insight").attr("aria-live", "polite");

        function select(s) {
            S.sel = s;
            draw();
        }

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

            paths.attr("aria-label", d => `${NAMES[d.abbr] || d.abbr}: ${mText(d.abbr, S.year)}`)
                .attr("aria-pressed", d => S.sel === d.abbr);

            paths.transition(t)
                .attr("fill", d => color(cScale(mv(d.abbr, S.year))))
                .attr("stroke", d => S.sel === d.abbr ? "var(--highlight-warm)" : "var(--line)")
                .attr("stroke-width", d => S.sel === d.abbr ? 2.8 : 1.2);

            labels.select(".tc")
                .text(d => d.abbr + dagger(d.abbr, S.year))
                .attr("fill", d => (d.abbr === "ACT" || d.abbr === "Tas") ? "#f1f5f9" : (cScale(mv(d.abbr, S.year)) < 0.55 ? "#0b0f17" : "#f1f5f9"))
                .attr("stroke", d => (d.abbr === "ACT" || d.abbr === "Tas") ? "#0b0f17" : "none").attr("stroke-width", 3).attr("paint-order", "stroke");

            labels.select(".tv")
                .text(d => mText(d.abbr, S.year))
                .attr("fill", d => (d.abbr === "ACT" || d.abbr === "Tas") ? "#f1f5f9" : (cScale(mv(d.abbr, S.year)) < 0.55 ? "#0b0f17" : "#f1f5f9"))
                .attr("stroke", d => (d.abbr === "ACT" || d.abbr === "Tas") ? "#0b0f17" : "none").attr("stroke-width", 3).attr("paint-order", "stroke");

            const order = states.slice().sort((p, q) => mv(q, S.year) - mv(p, S.year));
            const rows = gBars.selectAll("g.brow").data(order, s => s).join(enter => {
                const g = enter.append("g").attr("class", "brow").attr("tabindex", 0).attr("role", "button")
                    .attr("transform", (s, i) => `translate(0,${barY0 + i * rowH})`)
                    .on("pointermove", (e, s) => onHover(e, s))
                    .on("pointerleave", onLeave)
                    .on("focus", (e, s) => onHover(e, s))
                    .on("blur", onLeave)
                    .on("click", (e, s) => onClick(e, s))
                    .on("keydown", (e, s) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onClick(e, s);
                        }
                    });
                g.append("rect").attr("class", "hit").attr("x", 480).attr("y", -4).attr("width", 500).attr("height", rowH - 4).attr("rx", 6).attr("fill", "currentColor").attr("opacity", 0);
                g.append("text").attr("class", "bl").attr("x", barX0 - 14).attr("y", 18).attr("text-anchor", "end").attr("font-size", 13.5).attr("fill", "currentColor");
                g.append("rect").attr("class", "bb").attr("x", barX0).attr("y", 3).attr("height", 20).attr("rx", 4).attr("width", 0);
                const v = g.append("text").attr("class", "bv").attr("y", 18).attr("font-size", 13.5).attr("font-weight", 700).attr("fill", "currentColor");
                v.append("tspan").attr("class", "m");
                v.append("tspan").attr("class", "m2").attr("dx", 6).attr("font-size", 11.5).attr("font-weight", 400).attr("fill", "var(--muted)");
                return g;
            });
            rows.attr("aria-label", s => `${NAMES[s] || s}: ${mText(s, S.year)}`).attr("aria-pressed", s => S.sel === s);
            rows.transition(t).attr("transform", (s, i) => `translate(0,${barY0 + i * rowH})`);
            rows.select(".hit").attr("opacity", s => S.sel === s ? 0.08 : 0);
            rows.select(".bl").text(s => s + dagger(s, S.year)).attr("font-weight", s => S.sel === s ? 800 : 400);
            rows.select(".bb").transition(t).attr("width", s => Math.max(2, xBar(mv(s, S.year)))).attr("fill", s => color(cScale(mv(s, S.year))));
            rows.select(".bv").transition(t).attr("x", s => barX0 + Math.max(2, xBar(mv(s, S.year))) + 8);
            rows.select(".bv .m").text(s => mText(s, S.year));
            rows.select(".bv .m2").text(s => "(" + mText2(s, S.year) + ")");

            paths.filter(d => d.abbr === S.sel).raise();
            drawTrend();
            writeInsight(order);
            refreshTip();
        }

        function drawTrend() {
            const share_ = S.metric === "share";
            const ymax = d3.max(raw, d => share_ ? d.state_share_pct : d.state_cases);
            const ty = d3.scaleLinear().domain([0, ymax * 1.05]).nice().range([Ht - mt.bottom, mt.top]);
            tg.html("");
            tg.append("text").attr("x", mt.left).attr("y", 14).attr("font-size", 13.5).attr("font-weight", 700).attr("fill", "currentColor")
                .text(share_ ? `Share of national total over time: ${NAMES[S.sel] || S.sel} highlighted` : `Cases over time: ${NAMES[S.sel] || S.sel} highlighted`);
            tg.append("g").selectAll("line").data(ty.ticks(4)).join("line").attr("x1", mt.left).attr("x2", Wt - mt.right)
                .attr("y1", d => ty(d)).attr("y2", d => ty(d)).attr("stroke", "currentColor").attr("opacity", 0.12).attr("stroke-dasharray", "3 5");
            tg.append("g").attr("transform", `translate(${mt.left},0)`).attr("font-size", 12).attr("opacity", 0.8)
                .call(d3.axisLeft(ty).ticks(4).tickFormat(share_ ? d => d + "%" : fmt).tickSize(0).tickPadding(8)).select(".domain").remove();
            tg.append("g").attr("transform", `translate(0,${Ht - mt.bottom})`).attr("font-size", 12).attr("opacity", 0.8)
                .call(d3.axisBottom(tx).ticks(years.length).tickFormat(d3.format("d")).tickSize(0).tickPadding(8)).select(".domain").remove();

            Object.entries(BREAK).forEach(([s, y]) => {
                tg.append("line").attr("x1", tx(y)).attr("x2", tx(y)).attr("y1", mt.top).attr("y2", Ht - mt.bottom)
                    .attr("stroke", "var(--highlight-warm)").attr("stroke-dasharray", "4 4").attr("opacity", 0.55);
                tg.append("text").attr("x", tx(y) + 4).attr("y", mt.top + 10).attr("font-size", 11).attr("fill", "var(--highlight-warm)").text(`${y} ${s}\u2020`);
            });

            const selColor = "#38bdf8";
            const line = d3.line().x(d => tx(d.year)).y(d => ty(d.v)).curve(d3.curveMonotoneX);
            const series = s => years.map(y => ({ year: y, v: mv(s, y) }));

            states.filter(s => s !== S.sel).forEach(s => {
                const stColor = color(cScale(mv(s, last)));
                tg.append("path").datum(series(s)).attr("d", line)
                    .attr("fill", "none")
                    .attr("stroke", stColor)
                    .attr("stroke-opacity", 0.6)
                    .attr("stroke-width", 1.8);
            });

            tg.append("path").datum(series(S.sel)).attr("d", line)
                .attr("fill", "none")
                .attr("stroke", selColor)
                .attr("stroke-width", 3.5)
                .attr("stroke-linecap", "round")
                .style("filter", "drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))");

            const minSpacing = 14;
            const endPos = states.map(st => ({ st, y: ty(mv(st, last)) })).sort((a, b) => a.y - b.y);

            for (let i = 0; i < endPos.length; i++) {
                if (i === 0) {
                    endPos[i].ly = endPos[i].y;
                } else {
                    endPos[i].ly = Math.max(endPos[i].y, endPos[i - 1].ly + minSpacing);
                }
            }
            for (let i = endPos.length - 1; i >= 0; i--) {
                if (i === endPos.length - 1) {
                    endPos[i].ly = Math.min(endPos[i].ly, Ht - mt.bottom);
                } else {
                    endPos[i].ly = Math.min(endPos[i].ly, endPos[i + 1].ly - minSpacing);
                }
            }

            endPos.forEach(e => {
                tg.append("text")
                    .attr("x", tx(last) + 12)
                    .attr("y", e.ly + 4)
                    .attr("font-size", e.st === S.sel ? 12 : 10.5)
                    .attr("font-weight", e.st === S.sel ? 800 : 400)
                    .attr("fill", e.st === S.sel ? "currentColor" : "var(--muted)")
                    .text(e.st);
            });

            tg.append("line").attr("x1", tx(S.year)).attr("x2", tx(S.year)).attr("y1", mt.top).attr("y2", Ht - mt.bottom)
                .attr("stroke", "currentColor").attr("opacity", 0.5);
            states.forEach(s => {
                tg.append("circle").attr("cx", tx(S.year)).attr("cy", ty(mv(s, S.year))).attr("r", s === S.sel ? 6 : 3)
                    .attr("fill", s === S.sel ? selColor : "var(--muted)").attr("stroke", "var(--surface)").attr("stroke-width", 2);
            });
            tg.append("text").attr("x", tx(S.year)).attr("y", ty(mv(S.sel, S.year)) - 10).attr("text-anchor", S.year > last - 2 ? "end" : "middle")
                .attr("font-size", 12).attr("font-weight", 700).attr("fill", "#f1f5f9").attr("stroke", "#0b0f17").attr("stroke-width", 2.5).attr("paint-order", "stroke").text(`${S.sel} ${mText(S.sel, S.year)}`);

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
            } else {
                html += `Move the slider or press Play to see how each share changes. Click a state on the map or a bar to follow one jurisdiction.`;
            }
            insight.html(html);
        }

        let firstDraw = true;
        draw();
        firstDraw = false;
        if (window.Layout) window.Layout.refit();

        const ease = d3.easeCubicOut;
        const stage = (p, lo, hi) => Math.max(0, Math.min(1, (p - lo) / (hi - lo)));
        const cnt = (s, e) => S.metric === "share" ? (share(s, S.year) * e).toFixed(1) + "%" : fmt(Math.round(cases(s, S.year) * e));
        const lens = paths.nodes().map(n => n.getTotalLength());
        let done = false;

        function setProgress(p) {
            if (done && p >= 1) return;
            done = p >= 1;
            paths.each(function(d, i) {
                const a = i * 0.06;
                const draw = ease(stage(p, a, a + 0.2)),
                    fill = ease(stage(p, a + 0.12, a + 0.3));
                d3.select(this)
                    .attr("stroke-dasharray", done ? null : lens[i])
                    .attr("stroke-dashoffset", done ? null : lens[i] * (1 - draw))
                    .attr("fill-opacity", done ? null : fill);
            });
            labels.each(function(d, i) {
                const a = 0.25 + i * 0.045,
                    e = done ? 1 : ease(stage(p, a, a + 0.2));
                const g = d3.select(this);
                g.selectAll("text").attr("opacity", done ? null : e).attr("transform", done ? null : `translate(0,${(1 - e) * 10})`);
                g.select(".tv").text(done ? mText(d.abbr, S.year) : cnt(d.abbr, e));
            });
            gBars.selectAll("g.brow").each(function(s, i) {
                const g = d3.select(this);
                const lo = 0.35 + i * 0.05,
                    e = done ? 1 : ease(stage(p, lo, lo + 0.25));
                const w = Math.max(2, xBar(mv(s, S.year)));
                const cur = done ? w : w * e;
                g.attr("opacity", done ? 1 : stage(p, lo, lo + 0.08));
                g.select(".bl").attr("transform", done ? null : `translate(${-16 * (1 - e)},0)`);
                g.select(".bb").attr("width", cur);
                g.select(".bv").attr("x", barX0 + cur + 8);
                g.select(".bv .m").text(done ? mText(s, S.year) : cnt(s, e));
            });
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