/* Q2 Road users: Dumbbell (lollipop) chart of the change between two selected years.
   Data: data/q2_road_users_by_year.csv (year, national_total, road_user, road_user_cases, share_pct).
   Controls: From / To year range sliders, presets, measure (change in count or in share), table view.
   Owner: Yan Han. */

(function() {
        const container = d3.select("#q2-chart");
        const controls = d3.select("#q2-controls");
        if (container.empty()) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const dur = reduce ? 0 : 600;
        const fmt = d3.format(",");
        const MINUS = "\u2212";
        const UP = "#e5666e",
            DOWN = "#3b82f6",
            MUTED = "#475569";
        const W = 960,
            rowH = 38;
        const m = { top: 30, right: 80, bottom: 42, left: 250 };

        container.classed("placeholder", false).html("").style("position", "relative").text("Loading chart\u2026");

        const signed = (n, f) => (n > 0 ? "+" : n < 0 ? MINUS : "") + f(Math.abs(n));
        const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

        d3.csv("data/q2_road_users_by_year.csv", d3.autoType).then(function(raw) {
                    container.text("");

                    const years = Array.from(new Set(raw.map(d => d.year))).sort(d3.ascending);
                    const cell = new Map(raw.map(d => [d.road_user + "|" + d.year, d]));
                    const totals = new Map(raw.map(d => [d.year, d.national_total]));
                    const cats = Array.from(new Set(raw.map(d => d.road_user)));
                    const get = (c, y) => cell.get(c + "|" + y) || { road_user_cases: 0, share_pct: 0 };
                    const H = m.top + cats.length * rowH + m.bottom;

                    const S = { a: years[0], b: years[years.length - 1], mode: "count", table: false };

                    /* ---------- controls ---------- */
                    const grp = controls.append("div").attr("class", "ctl-group slider-group");
                    grp.append("label").attr("class", "ctl-label").attr("for", "q2-from").text("From");
                    const selA = grp.append("input").attr("type", "range").attr("id", "q2-from").attr("class", "year-slider")
                        .attr("min", years[0]).attr("max", years[years.length - 1]).attr("step", 1).attr("value", S.a);
                    const outA = grp.append("output").attr("class", "year-out").attr("for", "q2-from");

                    grp.append("label").attr("class", "ctl-label").attr("for", "q2-to").text("To");
                    const selB = grp.append("input").attr("type", "range").attr("id", "q2-to").attr("class", "year-slider")
                        .attr("min", years[0]).attr("max", years[years.length - 1]).attr("step", 1).attr("value", S.b);
                    const outB = grp.append("output").attr("class", "year-out").attr("for", "q2-to");

                    const presets = [
                        [years[0], years[years.length - 1]],
                        [2019, 2020],
                        [2019, 2021]
                    ].filter(p => years.includes(p[0]) && years.includes(p[1]));
                    const chips = controls.append("div").attr("class", "chips").attr("role", "group").attr("aria-label", "Year presets");
                    chips.selectAll("button").data(presets).join("button").attr("type", "button").attr("class", "chip")
                        .text(d => `${d[0]} \u2192 ${d[1]}`).on("click", (e, d) => {
                            S.a = d[0];
                            S.b = d[1];
                            update();
                        });

                    const seg = controls.append("div").attr("class", "seg").attr("role", "group").attr("aria-label", "Measure");
                    [
                        ["count", "Change in count"],
                        ["share", "Change in share"]
                    ].forEach(([k, label]) =>
                        seg.append("button").attr("type", "button").attr("data-mode", k).text(label).on("click", () => {
                            S.mode = k;
                            update();
                        }));

                    const tblBtn = controls.append("button").attr("type", "button").attr("class", "chip push-right").text("Table")
                        .on("click", () => {
                            S.table = !S.table;
                            update();
                        });

                    function fixYears(changed) {
                        if (S.a === S.b) {
                            const i = years.indexOf(S.a);
                            if (changed === "a") {
                                if (years[i + 1] != null) S.b = years[i + 1];
                                else S.a = years[i - 1];
                            } else {
                                if (years[i - 1] != null) S.a = years[i - 1];
                                else S.b = years[i + 1];
                            }
                        }
                        if (S.a > S.b)[S.a, S.b] = [S.b, S.a];
                    }
                    selA.on("input", function() {
                        S.a = +this.value;
                        fixYears("a");
                        update();
                    });
                    selB.on("input", function() {
                        S.b = +this.value;
                        fixYears("b");
                        update();
                    });

                    /* ---------- layout ---------- */
                    const title = container.append("h4").attr("class", "chart-title");
                    const legend = container.append("div").attr("class", "legend-inline");
                    legend.html(`
            <span><i class="swatch" style="border:2px solid #94a3b8;background:transparent;border-radius:50%;width:10px;height:10px;"></i>Start Year</span>
            <span><i class="swatch" style="background:#fbbf24;border-radius:50%;width:10px;height:10px;"></i>End Year (Increase)</span>
            <span><i class="swatch" style="background:#38bdf8;border-radius:50%;width:10px;height:10px;"></i>End Year (Decrease)</span>
        `);
                    const chartDiv = container.append("div");
                    const tableDiv = container.append("div").attr("class", "tbl-wrap").style("display", "none");
                    const summary = container.append("p").attr("class", "chart-summary");
                    const note = container.append("p").attr("class", "chart-note");
                    const tip = container.append("div").attr("role", "status").attr("class", "chart-tip").style("opacity", 0);
                    const insight = d3.select("#q2-insight").attr("aria-live", "polite");

                    const svg = chartDiv.append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%").attr("role", "img")
                        .style("display", "block").style("height", "auto").style("overflow", "visible");
                    const gGrid = svg.append("g");
                    const gRows = svg.append("g");
                    const gAxis = svg.append("g").attr("transform", `translate(0,${H - m.bottom})`).attr("font-size", 13);
                    const x = d3.scaleLinear().range([m.left, W - m.right]);

                    /* ---------- data for the current selection ---------- */
                    function compute() {
                        const rows = cats.map(c => {
                            const A = get(c, S.a),
                                B = get(c, S.b);
                            const va = A.road_user_cases,
                                vb = B.road_user_cases;
                            const sa = A.share_pct,
                                sb = B.share_pct;
                            return {
                                cat: c,
                                va,
                                vb,
                                sa,
                                sb,
                                change: vb - va,
                                dShare: sb - sa,
                                pct: va ? (vb - va) / va * 100 : null
                            };
                        });
                        const net = totals.get(S.b) - totals.get(S.a);
                        rows.forEach(r => { r.contrib = net ? r.change / net * 100 : null; });
                        return { rows, net };
                    }

                    const valStart = d => S.mode === "count" ? d.va : d.sa;
                    const valEnd = d => S.mode === "count" ? d.vb : d.sb;
                    const valText = d => S.mode === "count" ? signed(d.change, fmt) : signed(+d.dShare.toFixed(1), v => v.toFixed(1)) + " pp";

                    /* ---------- tooltip ---------- */
                    function showTip(d, node) {
                        const r = node.getBoundingClientRect(),
                            c = container.node().getBoundingClientRect();
                        tip.html(`
                <div style="font-weight:700;color:var(--accent);margin-bottom:4px;">${esc(d.cat)}</div>
                <div>${S.a}: <strong>${fmt(d.va)}</strong> (${d.sa.toFixed(1)}%)</div>
                <div>${S.b}: <strong>${fmt(d.vb)}</strong> (${d.sb.toFixed(1)}%)</div>
                <div style="color:var(--muted);font-size:12px;margin-top:4px;">Change: <strong>${signed(d.change, fmt)}</strong>${d.pct == null ? "" : ` (${signed(d.pct, v => v.toFixed(1))}%)`}<br>
                Share: <strong>${signed(+d.dShare.toFixed(1), v => v.toFixed(1))} pp</strong>${d.contrib == null ? "" : `<br>Of the net change: <strong>${d.contrib.toFixed(1)}%</strong>`}</div>`)
                .style("opacity", 1);
            const tw = tip.node().offsetWidth, th = tip.node().offsetHeight;
            const left = Math.max(tw / 2 + 4, Math.min(c.width - tw / 2 - 4, (r.left + r.right) / 2 - c.left));
            const above = r.top - c.top - th - 8;
            tip.style("left", left + "px").style("top", (above > 0 ? above : r.bottom - c.top + 8) + "px")
                .style("transform", "translateX(-50%)");
        }
        const hideTip = () => tip.style("opacity", 0);

        /* ---------- render ---------- */
        function update() {
            const { rows, net } = compute();
            const count = S.mode === "count";
            const t = d3.transition().duration(dur).ease(d3.easeCubicOut);
            
            rows.sort((p, q) => valEnd(q) - valEnd(p));

            selA.property("value", S.a); outA.text(S.a); selB.property("value", S.b); outB.text(S.b);
            seg.selectAll("button").attr("aria-pressed", function () { return this.dataset.mode === S.mode; });
            chips.selectAll("button").attr("aria-pressed", d => d[0] === S.a && d[1] === S.b);
            tblBtn.attr("aria-pressed", S.table).text(S.table ? "Chart" : "Table");
            chartDiv.style("display", S.table ? "none" : null);
            legend.style("display", S.table ? "none" : null);
            tableDiv.style("display", S.table ? null : "none");

            title.text(count ? `Comparison of hospitalisations by road user, ${S.a} vs ${S.b}` : `Comparison of hospitalisation share by road user, ${S.a} vs ${S.b}`);

            const allVals = rows.flatMap(d => [valStart(d), valEnd(d)]);
            const lo = d3.min(allVals), hi = d3.max(allVals), pad = (hi - lo) * 0.08 || 1;
            x.domain([Math.max(0, lo - pad), hi + pad]).nice();
            
            const tickFmt = count ? fmt : v => v.toFixed(1) + "%";
            const ticks = x.ticks(7);

            gGrid.selectAll("line").data(ticks).join("line").attr("y1", m.top).attr("y2", H - m.bottom)
                .attr("stroke", "currentColor").attr("opacity", 0.08)
                .transition(t).attr("x1", d => x(d)).attr("x2", d => x(d));
            
            gAxis.transition(t).call(d3.axisBottom(x).tickValues(ticks).tickFormat(tickFmt).tickSize(0).tickPadding(12));
            gAxis.select(".domain").remove();
            gAxis.selectAll("text").attr("opacity", 0.7);

            svg.attr("aria-label", `Dumbbell chart comparing road user groups from ${S.a} to ${S.b}.`);

            const yPos = i => m.top + i * rowH + rowH / 2;
            
            const merged = gRows.selectAll("g.row").data(rows, d => d.cat).join(
                enter => {
                    const g = enter.append("g").attr("class", "row").attr("tabindex", 0)
                        .attr("transform", (d, i) => `translate(0,${yPos(i)})`);
                    
                    g.append("text").attr("class", "lab").attr("x", m.left - 24).attr("y", 5).attr("text-anchor", "end")
                        .attr("font-size", 14).attr("fill", "currentColor").text(d => d.cat);
                    
                    g.append("line").attr("class", "track-line").attr("x1", m.left).attr("x2", W - m.right)
                        .attr("y1", 0).attr("y2", 0).attr("stroke", "currentColor").attr("stroke-opacity", 0.06).attr("stroke-width", 4);

                    g.append("line").attr("class", "connector-line")
                        .attr("y1", 0).attr("y2", 0)
                        .attr("stroke-width", 3).attr("stroke-linecap", "round");
                    
                    g.append("circle").attr("class", "circle-start").attr("r", 4.5)
                        .attr("fill", "var(--surface)").attr("stroke", "#94a3b8").attr("stroke-width", 2);

                    g.append("circle").attr("class", "circle-end").attr("r", 6.0);

                    g.append("text").attr("class", "val").attr("y", 5).attr("font-size", 12.5).attr("font-weight", 700);

                    g.append("rect").attr("class", "hit").attr("x", 0).attr("y", -rowH / 2).attr("width", W).attr("height", rowH).attr("fill", "transparent");
                    
                    g.on("mouseenter", function (e, d) { showTip(d, this.querySelector(".circle-end")); })
                        .on("focus", function (e, d) { showTip(d, this.querySelector(".circle-end")); })
                        .on("mouseleave", hideTip).on("blur", hideTip);
                    return g;
                });

            merged.attr("aria-label", d => `${d.cat}: ${fmt(d.va)} in ${S.a}, ${fmt(d.vb)} in ${S.b}, change ${signed(d.change, fmt)}.`);
            merged.transition(t).attr("transform", (d, i) => `translate(0,${yPos(i)})`);
            
            merged.select(".connector-line").transition(t)
                .attr("x1", d => x(valStart(d)))
                .attr("x2", d => x(valEnd(d)))
                .attr("stroke", d => d.change >= 0 ? "var(--highlight-warm)" : "var(--accent)");

            merged.select(".circle-start").transition(t)
                .attr("cx", d => x(valStart(d)));

            merged.select(".circle-end").transition(t)
                .attr("cx", d => x(valEnd(d)))
                .attr("fill", d => d.change >= 0 ? "var(--highlight-warm)" : "var(--accent)");

            merged.select(".val").text(valText).transition(t)
                .attr("fill", d => d.change >= 0 ? "var(--highlight-warm)" : "var(--accent)")
                .attr("x", d => Math.max(x(valStart(d)), x(valEnd(d))) + 16);

            /* table view */
            const cols = ["Road user", `${S.a}`, `${S.b}`, "Change", `Share ${S.a}`, `Share ${S.b}`, "Share change"];
            tableDiv.html("");
            const tb = tableDiv.append("table").attr("class", "tbl");
            tb.append("thead").append("tr").selectAll("th").data(cols).join("th").text(d => d);
            const trs = tb.append("tbody").selectAll("tr").data(rows.slice().sort((p, q) => q.vb - p.vb)).join("tr");
            trs.selectAll("td").data(d => [d.cat, fmt(d.va), fmt(d.vb), signed(d.change, fmt), d.sa.toFixed(1) + "%", d.sb.toFixed(1) + "%", signed(+d.dShare.toFixed(1), v => v.toFixed(1)) + " pp"])
                .join("td").text(d => d);

            /* summary under the chart */
            summary.text(`Net change ${S.a} to ${S.b}: ${signed(net, fmt)}. Largest rise: ${rows.find(r => r.change === d3.max(rows, d => d.change)).cat} (${signed(d3.max(rows, d => d.change), fmt)}). Start Year (${S.a}) is shown in grey, End Year (${S.b}) is highlighted.`);
            note.text("Counts are absolute and not adjusted for population. Source: BITRE hospitalised injury data, cleaned in KNIME.");

            /* insight text (aside) */
            const byAbs = rows.slice().sort((p, q) => Math.abs(q.change) - Math.abs(p.change));
            const top = byAbs[0];
            const opp = byAbs.find(r => Math.sign(r.change) === -Math.sign(top.change));
            const netWord = net >= 0 ? "rise" : "fall";
            const rel = Math.sign(top.change) === Math.sign(net) && net !== 0
                ? `which is <strong>${Math.abs(top.contrib).toFixed(1)}%</strong> of the net ${netWord} of ${fmt(Math.abs(net))}`
                : `against a net ${netWord} of ${fmt(Math.abs(net))}`;
            insight.html(
                `<strong>${esc(top.cat)}</strong> ${top.change >= 0 ? "rose" : "fell"} by <strong>${fmt(Math.abs(top.change))}</strong> between ${S.a} and ${S.b}, ${rel}. ` +
                `Its share went from ${top.sa.toFixed(1)}% to ${top.sb.toFixed(1)}%. ` +
                (opp ? `The largest move the other way was ${esc(opp.cat)} (${signed(opp.change, fmt)}).` : ""));
        }

        update();
    }).catch(function (err) {
        console.error("Q2 failed to load data:", err);
        container.text("Sorry, the chart could not be loaded.");
    });
})();