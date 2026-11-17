/* Q4 Age, sex and road user: heatmap of hospitalisations by age group (columns) and road user type (rows).
   Data: data/q4_age_sex_road_user_by_year.csv (year, age_group, sex, road_user, hospitalisations).
   Controls: year slider, sex toggle (All / Male / Female). Tap or click a square to select it.
   A "Find your profile" panel (in the step cards) lets the reader pick an age group and road user; the matching square glows.
   Desktop keeps a fixed-size viewBox (scaled by CSS); phones draw at real pixel width, with the road user name above each row.
   Originally drafted by a teammate; restructured to match the shared layout, theme and mobile behaviour. */

(function() {
    "use strict";

    const container = d3.select("#q4-chart");
    const controls = d3.select("#q4-controls");
    if (container.empty()) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fmt = d3.format(",");
    const fmtCompact = v => (v >= 1000 ? d3.format(".2~s")(v) : String(v)); // 13327 -> "13k", used inside small phone cells
    const LOW = "#e0f2fe",
        MID = "#38bdf8",
        HIGH = "#1d4ed8"; // same palette as the Q3 map
    const NARROW_BP = 560; // container width (px) below which the phone layout is used
    const TOP_N = 6; // road user types shown (highest totals in the selected year)
    const SEXES = ["All", "Male", "Female"];
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    container.classed("placeholder", false).html("").style("position", "relative").text("Loading chart\u2026");

    d3.csv("data/q4_age_sex_road_user_by_year.csv", d3.autoType).then(function(raw) {
        container.text("");

        /* ---------- data ---------- */
        const rows = raw.filter(d => Number.isFinite(d.year) && Number.isFinite(d.hospitalisations));
        if (!rows.length) throw new Error("No valid Q4 rows");
        const years = Array.from(new Set(rows.map(d => d.year))).sort(d3.ascending);
        const first = years[0],
            last = years[years.length - 1];
        // "Missing" age is left out of the squares (it has no place on the age axis) but stays in the totals
        const ages = Array.from(new Set(rows.map(d => d.age_group))).filter(a => a !== "Missing")
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

        const S = { year: last, sex: "All", user: null, age: null };
        // Download button (see ChartTools in main.js): every record of the selected year (all sexes, all road users)
        if (window.ChartTools) ChartTools.register("q4", () => ({
            filename: `q4_age_sex_road_user_${S.year}.csv`,
            rows: rows.filter(d => d.year === S.year).map(d => ({ year: d.year, road_user: d.road_user, age_group: d.age_group, sex: d.sex, hospitalisations: d.hospitalisations }))
        }));

        /* ---------- controls ---------- */
        const seg = controls.append("div").attr("class", "segmented").attr("role", "group").attr("aria-label", "Sex");
        seg.selectAll("button").data(SEXES).join("button").attr("type", "button").attr("data-mode", d => d).text(d => d)
            .on("click", (e, d) => {
                S.sex = d;
                render();
            });

        const yr = controls.append("div").attr("class", "control-group slider-group");
        yr.append("label").attr("class", "control-label").attr("for", "q4-year").text("Year");
        const slider = yr.append("input").attr("type", "range").attr("id", "q4-year").attr("class", "year-slider")
            .attr("min", first).attr("max", last).attr("step", 1).attr("value", last)
            .on("input", function() {
                S.year = +this.value;
                render();
            });
        const yearOut = yr.append("output").attr("class", "year-out").attr("for", "q4-year");

        /* ---------- layout of the card ---------- */
        const title = container.append("h4").attr("class", "chart-title");
        container.append("p").attr("class", "q4-helper").text("Each square is one age group and road user type: deeper blue means more hospitalisations, faint grey means none. Use Year and All / Male / Female to compare, or tap a square to select it.");
        const holder = container.append("div");
        const legend = container.append("div").attr("class", "q4-legend");
        container.append("p").attr("class", "chart-note").text(
            "Shows the six road user types with the most hospitalisations in the selected year (all sexes). " +
            "\u201CMissing\u201D age is not drawn but is included in the totals. Counts only, not adjusted for population. " +
            "Source: BITRE hospitalised injury data."
        );
        const tip = container.append("div").attr("role", "status").attr("class", "chart-tip").style("opacity", 0);
        const insight = d3.select("#q4-insight").attr("aria-live", "polite");

        /* ---------- "Find your profile" panel (lives in a step card) ---------- */
        // One-click examples; only those whose road user is among this year's top rows are shown
        const PRESETS = [
            { label: "Kids on bikes", user: "Pedal cyclist", age: "8-16" },
            { label: "Young drivers", user: "Car driver", age: "17-25" },
            { label: "Motorcyclists in their 30s", user: "Motorcyclist", age: "26-39" },
            { label: "Older pedestrians", user: "Pedestrian", age: "65-74" }
        ];
        const find = d3.select("#q4-find");
        let ageSel = null,
            userSel = null,
            presetBox = null,
            findOut = null, // headline number (step card "Find your profile")
            detailOut = null; // extra detail (step card "This group in detail")
        if (!find.empty()) {
            // Reads as a sentence: "Show me [Car driver] injuries at age [40-64]"
            const row = find.append("div").attr("class", "q4-find-row");
            row.append("span").text("Show me");
            userSel = row.append("select").attr("class", "q4-select").attr("aria-label", "Road user type");
            row.append("span").text("injuries at age");
            ageSel = row.append("select").attr("class", "q4-select").attr("aria-label", "Age group");
            ageSel.selectAll("option").data(ages).join("option").attr("value", d => d).text(d => d);
            presetBox = find.append("div").attr("class", "q4-presets");
            findOut = find.append("div").attr("class", "q4-find-out").attr("aria-live", "polite");
            const detail = d3.select("#q4-detail");
            detailOut = detail.empty() ? findOut : detail.append("div").attr("class", "q4-find-out");
            ageSel.on("change", e => {
                S.age = e.target.value;
                render();
            });
            userSel.on("change", e => {
                S.user = e.target.value;
                render();
            });
        }

        /* ---------- tooltip ---------- */
        function showTip(d, node) {
            const r = node.getBoundingClientRect(),
                c = container.node().getBoundingClientRect();
            tip.html(`
                <div style="font-weight:700;color:var(--accent);margin-bottom:2px;">${esc(d.user)}, age ${esc(d.age)}</div>
                <div><strong>${fmt(d.value)}</strong> hospitalisations${S.sex === "All" ? "" : " (" + S.sex.toLowerCase() + ")"}</div>
                <div style="color:var(--muted);font-size:12px;margin-top:2px;">Male ${fmt(d.male)} \u00B7 Female ${fmt(d.female)}</div>`)
                .style("opacity", 1);
            const tw = tip.node().offsetWidth,
                th = tip.node().offsetHeight;
            const left = Math.max(tw / 2 + 4, Math.min(c.width - tw / 2 - 4, (r.left + r.right) / 2 - c.left));
            const above = r.top - c.top - th - 8;
            tip.style("left", left + "px").style("top", (above > 0 ? above : r.bottom - c.top + 8) + "px")
                .style("transform", "translateX(-50%)");
        }
        const hideTip = () => tip.style("opacity", 0);
        // Tapping outside a square dismisses the tooltip (needed on touch screens)
        d3.select(document).on("pointerdown.q4tip", e => {
            if (!(e.target.closest && e.target.closest(".q4-tile"))) hideTip();
        });

        /* ---------- geometry ---------- */
        let narrow = false;
        const G = {};

        function geometry() {
            const cw = Math.round(container.node().clientWidth || 720);
            narrow = cw < NARROW_BP;
            if (narrow) {
                // Phone: real pixel width, road user name sits above its row of squares
                G.W = Math.max(260, cw);
                G.x0 = 0;
                G.colW = G.W / ages.length;
                G.cellW = G.colW - 4;
                G.y0 = 24; // room for the age headers
                G.labelH = 18; // road user name above the squares
                G.cellH = 34;
                G.rowH = 62;
                G.fsLabel = 12.5;
                G.fsCount = 10.5;
                G.fsHead = 11.5;
            } else {
                // Desktop / tablet: fixed viewBox, names on the left
                G.W = 720;
                G.x0 = 160;
                G.colW = 78;
                G.cellW = 72;
                G.y0 = 30;
                G.labelH = 0;
                G.cellH = 50;
                G.rowH = 56;
                G.fsLabel = 13;
                G.fsCount = 12.5;
                G.fsHead = 12.5;
            }
        }

        /* ---------- render ---------- */
        function render() {
            geometry();
            const yearRows = rows.filter(d => d.year === S.year);
            const sexRows = S.sex === "All" ? yearRows : yearRows.filter(d => d.sex === S.sex);
            const sumBy = rs => d3.rollup(rs, v => d3.sum(v, d => d.hospitalisations), d => d.road_user, d => d.age_group);
            const mAll = sumBy(yearRows),
                mSel = sumBy(sexRows),
                mMale = sumBy(yearRows.filter(d => d.sex === "Male")),
                mFemale = sumBy(yearRows.filter(d => d.sex === "Female"));
            const get = (m, u, a) => (m.get(u) && m.get(u).get(a)) || 0;

            // Rank road users by total (all sexes) so the rows stay the same when the sex toggle changes
            const topUsers = d3.rollups(yearRows, v => d3.sum(v, d => d.hospitalisations), d => d.road_user)
                .sort((a, b) => d3.descending(a[1], b[1])).slice(0, TOP_N).map(d => d[0]);

            const cells = topUsers.flatMap((user, ri) => ages.map((age, ci) => ({
                user, age, ri, ci,
                value: get(mSel, user, age),
                all: get(mAll, user, age),
                male: get(mMale, user, age),
                female: get(mFemale, user, age)
            })));

            // One colour scale per year (based on all sexes), so All / Male / Female are directly comparable
            const scaleMax = d3.max(cells, d => d.all) || 1;
            const color = d3.scaleSequentialSqrt(d3.interpolateRgbBasis([LOW, MID, HIGH])).domain([0, scaleMax]);
            const ranked = cells.slice().sort((a, b) => d3.descending(a.value, b.value));
            const highest = ranked[0];

            // Keep the selected profile valid for this year
            if (!topUsers.includes(S.user)) S.user = topUsers[0];
            if (!ages.includes(S.age)) S.age = highest.age;

            const who = S.sex === "All" ? "all sexes" : S.sex.toLowerCase() + "s";

            /* controls and headings */
            slider.property("value", S.year);
            yearOut.text(S.year);
            seg.selectAll("button").attr("aria-pressed", d => String(d === S.sex));
            title.text(`Hospitalised road injuries by age and road user, ${S.year} (${S.sex})`);

            /* heatmap */
            const H = G.y0 + topUsers.length * G.rowH + 4;
            const colX = ci => G.x0 + ci * G.colW + (G.colW - G.cellW) / 2;
            const rowY = ri => G.y0 + ri * G.rowH + G.labelH;
            const svg = holder.html("").append("svg").attr("class", "q4-svg").attr("viewBox", `0 0 ${G.W} ${H}`)
                .attr("role", "group").attr("aria-label", `Heatmap of hospitalisations by age group and road user, ${S.year}, ${who}`);

            svg.selectAll(".q4-col-label").data(ages).join("text").attr("class", "q4-col-label")
                .attr("x", (d, i) => colX(i) + G.cellW / 2).attr("y", G.y0 - 10).attr("text-anchor", "middle")
                .attr("font-size", G.fsHead).text(d => d);

            svg.selectAll(".q4-rowlabel").data(topUsers).join("text").attr("class", "q4-rowlabel")
                .attr("font-size", G.fsLabel)
                .attr("x", narrow ? G.x0 + 2 : G.x0 - 10)
                .attr("y", (d, i) => narrow ? G.y0 + i * G.rowH + 13 : rowY(i) + G.cellH / 2)
                .attr("text-anchor", narrow ? "start" : "end")
                .attr("dominant-baseline", narrow ? "auto" : "middle")
                .text(d => d);

            const tiles = svg.selectAll("g.q4-tile").data(cells).join("g").attr("class", "q4-tile")
                .attr("tabindex", 0).attr("role", "img")
                .attr("aria-label", d => `${d.user}, age ${d.age}: ${fmt(d.value)} hospitalisations`);
            tiles.append("rect").attr("class", "q4-cell")
                .attr("x", d => colX(d.ci)).attr("y", d => rowY(d.ri))
                .attr("width", G.cellW).attr("height", G.cellH).attr("rx", 6)
                .attr("fill", d => d.value ? color(d.value) : "rgba(148, 163, 184, 0.14)"); // empty squares stay faint
            tiles.append("text").attr("class", "q4-count")
                .attr("x", d => colX(d.ci) + G.cellW / 2).attr("y", d => rowY(d.ri) + G.cellH / 2)
                .attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", G.fsCount)
                .attr("fill", d => !d.value ? "var(--muted)" : (d3.hcl(color(d.value)).l > 62 ? "#0b0f17" : "#f8fafc")) // readable on light and dark squares
                .text(d => narrow ? fmtCompact(d.value) : fmt(d.value));

            // pointerenter = mouse hover, pointerdown = tap on touch screens; click selects the square as the profile
            tiles.on("pointerenter", (e, d) => showTip(d, e.currentTarget))
                .on("pointerdown", (e, d) => showTip(d, e.currentTarget))
                .on("focus", (e, d) => showTip(d, e.currentTarget))
                .on("pointerleave", e => { if (e.pointerType === "mouse") hideTip(); }) // touch: keep the tip until the next tap
                .on("blur", hideTip)
                .on("click", (e, d) => {
                    S.user = d.user;
                    S.age = d.age;
                    render();
                    const n = holder.select(".q4-hl").node();
                    if (n) showTip(n.__data__, n);
                })
                .on("keydown", (e, d) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        S.user = d.user;
                        S.age = d.age;
                        render();
                    }
                });
            tiles.classed("q4-hl", d => d.user === S.user && d.age === S.age);
            tiles.filter(".q4-hl").raise(); // glowing square on top of its neighbours

            legend.html("");
            legend.append("span").text("Fewer");
            legend.append("span").attr("class", "q4-gradient");
            legend.append("span").text(`More (up to ${fmt(scaleMax)})`);

            /* "What it shows" card */
            const maleTot = d3.sum(yearRows.filter(d => d.sex === "Male"), d => d.hospitalisations);
            const femaleTot = d3.sum(yearRows.filter(d => d.sex === "Female"), d => d.hospitalisations);
            const gap = cells.slice().sort((a, b) => d3.descending(Math.abs(a.male - a.female), Math.abs(b.male - b.female)))[0];
            if (highest.value) {
                insight.html(
                    `In <strong>${S.year}</strong>, the busiest square for ${who} is <strong>${esc(highest.user)}, age ${esc(highest.age)}</strong> ` +
                    `with <strong>${fmt(highest.value)}</strong> hospitalisations. ` +
                    `Males account for <strong>${(maleTot / (maleTot + femaleTot) * 100).toFixed(0)}%</strong> of records with a recorded sex. ` +
                    `The widest male\u2013female gap is <strong>${esc(gap.user)}, age ${esc(gap.age)}</strong>: ${fmt(gap.male)} male vs ${fmt(gap.female)} female.`);
            } else {
                insight.text(`There are no records for ${who} in ${S.year}.`);
            }

            /* "Find your profile" output */
            if (findOut) {
                userSel.selectAll("option").data(topUsers).join("option").attr("value", d => d).text(d => d);
                userSel.property("value", S.user);
                ageSel.property("value", S.age);

                presetBox.selectAll("button").data(PRESETS.filter(p => topUsers.includes(p.user)), d => d.label)
                    .join("button").attr("type", "button").attr("class", "chip")
                    .attr("aria-pressed", d => String(d.user === S.user && d.age === S.age))
                    .text(d => d.label)
                    .on("click", (e, d) => {
                        S.user = d.user;
                        S.age = d.age;
                        render();
                    });

                const pick = cells.find(c => c.user === S.user && c.age === S.age);
                const sexTotal = d3.sum(sexRows, d => d.hospitalisations); // all hospitalisations for the current sex selection
                const userTotal = d3.sum(sexRows.filter(d => d.road_user === S.user), d => d.hospitalisations);
                const pct = userTotal ? pick.value / userTotal * 100 : 0;
                const per1000 = sexTotal ? pick.value / sexTotal * 1000 : 0;
                const whoAll = who === "all sexes" ? "all" : who;
                findOut.html("");
                if (detailOut !== findOut) detailOut.html("");

                if (!pick.value) {
                    findOut.append("div").attr("class", "q4-line")
                        .text(`No records for ${who}, age ${S.age}, ${S.user.toLowerCase()} in ${S.year}.`);
                    detailOut.append("div").attr("class", "q4-line").text("Pick a group with records to see the comparison, the male/female split and the trend.");
                } else {
                    findOut.append("div").attr("class", "q4-big").html(`<strong>${fmt(pick.value)}</strong> hospitalisations`);
                    findOut.append("div").attr("class", "q4-line").text(
                        `That is ${pct < 1 ? "less than 1" : Math.round(pct)}% of ${whoAll} ${S.user.toLowerCase()} cases in ${S.year}, ` +
                        `or ${per1000 < 1 ? "fewer than 1" : "about " + Math.round(per1000)} in every 1,000 road hospitalisations.`);

                    // Two columns on wide cards (comparison | male-female split); stacked on phones
                    const pair = detailOut.append("div").attr("class", "q4-pair");
                    const colA = pair.append("div"),
                        colB = pair.append("div");

                    // Compared with the biggest square on the chart
                    const vs = colA.append("div").attr("class", "q4-block");
                    vs.append("div").attr("class", "q4-cap").text(`Compared with the biggest square (${highest.user}, age ${highest.age}: ${fmt(highest.value)})`);
                    vs.append("div").attr("class", "q4-track").append("span").attr("class", "q4-fill")
                        .style("width", Math.max(1.5, pick.value / highest.value * 100) + "%");

                    // Male vs female split for this exact square (ignores the sex toggle on purpose)
                    const mf = pick.male + pick.female;
                    if (mf > 0) {
                        const mPct = pick.male / mf * 100;
                        const split = colB.append("div").attr("class", "q4-block");
                        split.append("div").attr("class", "q4-cap").text("Male vs female");
                        const bar = split.append("div").attr("class", "q4-track q4-split");
                        bar.append("span").attr("class", "q4-male").style("width", mPct + "%");
                        bar.append("span").attr("class", "q4-female").style("width", (100 - mPct) + "%");
                        split.append("div").attr("class", "q4-split-legend").html(
                            `<span><i class="q4-dot q4-male"></i>Male ${fmt(pick.male)} (${Math.round(mPct)}%)</span>` +
                            `<span><i class="q4-dot q4-female"></i>Female ${fmt(pick.female)} (${Math.round(100 - mPct)}%)</span>`);
                    }

                    // Ten-year trend of this square (follows the sex toggle)
                    const series = years.map(y => ({
                        year: y,
                        v: d3.sum(rows.filter(d => d.year === y && d.road_user === S.user && d.age_group === S.age && (S.sex === "All" || d.sex === S.sex)), d => d.hospitalisations)
                    }));
                    const sw = 260, sh = 48, sm = { l: 6, r: 8, t: 6, b: 14 };
                    const sx = d3.scaleLinear().domain([first, last]).range([sm.l, sw - sm.r]);
                    const sy = d3.scaleLinear().domain([0, d3.max(series, d => d.v) || 1]).nice().range([sh - sm.b, sm.t]);
                    const trend = detailOut.append("div").attr("class", "q4-block"); // full width under the two columns
                    trend.append("div").attr("class", "q4-cap").text(`${first}–${last} trend for this group`);
                    const sp = trend.append("svg").attr("class", "q4-spark").attr("viewBox", `0 0 ${sw} ${sh}`).attr("role", "img")
                        .attr("aria-label", `Trend of ${S.user.toLowerCase()} hospitalisations at age ${S.age}, ${first} to ${last}`);
                    sp.append("path").attr("class", "q4-spark-line").datum(series)
                        .attr("d", d3.line().x(d => sx(d.year)).y(d => sy(d.v)).curve(d3.curveMonotoneX));
                    const cur = series.find(d => d.year === S.year);
                    sp.append("circle").attr("class", "q4-spark-dot").attr("cx", sx(S.year)).attr("cy", sy(cur.v)).attr("r", 4);
                    sp.append("text").attr("class", "q4-spark-label").attr("x", sm.l).attr("y", sh - 3).text(first);
                    sp.append("text").attr("class", "q4-spark-label").attr("x", sw - sm.r).attr("y", sh - 3).attr("text-anchor", "end").text(last);
                }
                // Counts are people, not risk
                detailOut.append("div").attr("class", "q4-caution").text(
                    (pick.value && pick.value < 30 ? "Small number: read with care. " : "") +
                    "These are counts of hospitalised people, not risk. They are not adjusted for how many people are in each group.");
            }

            if (!reduce && !done) setProgress(curP); // keep the entrance animation state after a redraw
        }

        /* ---------- scroll-driven entrance (called by main.js with progress 0..1) ---------- */
        const ease = d3.easeCubicOut;
        const stage = (p, lo, hi) => Math.max(0, Math.min(1, (p - lo) / (hi - lo)));
        let done = false;
        let curP = (window.chartProgress || {}).q4 || 0; // last scroll progress

        function setProgress(p) {
            curP = p;
            if (done && p >= 1) return;
            done = p >= 1;
            const e0 = ease(stage(p, 0, 0.2));
            container.style("opacity", done ? null : e0).style("transform", done ? null : `translateY(${(1 - e0) * 32}px)`);
            // squares appear one after another, row by row
            const n = TOP_N * ages.length;
            holder.selectAll("g.q4-tile").each(function(d) {
                const a = 0.15 + (d.ri * ages.length + d.ci) / n * 0.6;
                d3.select(this).style("opacity", done ? null : ease(stage(p, a, a + 0.25)));
            });
        }
        if (!reduce) window.Q4 = { setProgress };

        render();

        // Redraw when the container crosses the phone breakpoint, or (on phones) changes width.
        // Desktop width changes need no redraw because the SVG simply scales.
        let lastW = Math.round(container.node().clientWidth),
            lastNarrow = narrow,
            resizeTimer = null;
        new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const cw = Math.round(container.node().clientWidth);
                if (!cw) return;
                const willNarrow = cw < NARROW_BP;
                if (willNarrow === lastNarrow && (!willNarrow || Math.abs(cw - lastW) < 4)) return;
                lastNarrow = willNarrow;
                lastW = cw;
                render();
                if (window.Layout) window.Layout.refit();
            }, 150);
        }).observe(container.node());

        if (window.Layout) window.Layout.refit();
    }).catch(function(err) {
        console.error("Q4 failed to load data:", err);
        container.text("Sorry, the chart could not be loaded.");
    });
})();
