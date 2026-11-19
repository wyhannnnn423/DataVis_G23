
/*
 Q5 - First Nations and Non-Indigenous comparison
 Data: data/q5_first_nations_composition_by_year.csv
 Uses original KNIME percentage shares without renormalising.
*/

(function () {
    "use strict";

    const container = d3.select("#q5-chart");
    const controls = d3.select("#q5-controls");

    if (container.empty() || controls.empty()) return;

    const GROUPS = [
        "First Nations people",
        "Non-Indigenous"
    ];

    const AGE_ORDER = [
        "0-7", "8-16", "17-25",
        "26-39", "40-64", "65+"
    ];

    const ROAD_ORDER = [
        "Car driver, passenger or unknown position",
        "Motorcyclist",
        "Pedal cyclist",
        "Pedestrian",
        "Pick-up truck or van occupant",
        "Bus occupant",
        "Heavy transport driver, passenger or unknown position",
        "Other or unknown"
    ];

    const COLORS = [
        "#4f8ff7", "#23b4a7", "#f2ad52",
        "#b58df6", "#e86b91", "#80c56b",
        "#55bfe2", "#d1a261"
    ];

    const MISSING = "Not represented in processed data";

    const fmtCases = d3.format(",");
    const fmtPct = value => value.toFixed(2) + "%";

    const fmtDifference = value =>
        (value > 0 ? "+" : value < 0 ? "−" : "") +
        Math.abs(value).toFixed(2) + " pp";

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const state = {
        year: 2021,
        dimension: "age_group",
        table: false,
        focus: null,
        progress: 1
    };

    container
        .classed("placeholder", false)
        .html("")
        .style("position", "relative");

    controls.html("");

    container.append("p")
        .attr("class", "q5-loading")
        .text("Loading First Nations data...");

    d3.csv(
        "data/q5_first_nations_composition_by_year.csv",
        d3.autoType
    ).then(function (input) {

        const rows = input.filter(d =>
            GROUPS.includes(d.population_group) &&
            ["age_group", "road_user"].includes(d.dimension) &&
            Number.isFinite(d.year) &&
            Number.isFinite(d.cases) &&
            Number.isFinite(d.group_total) &&
            Number.isFinite(d.share_pct) &&
            d.share_pct >= 0 &&
            d.share_pct <= 100
        );

        if (!rows.length) {
            throw new Error("No valid Q5 records found.");
        }

        const years = [...new Set(rows.map(d => d.year))]
            .sort(d3.ascending);

        state.year = years[years.length - 1];

        const categoriesFor = dimension =>
            dimension === "age_group" ? AGE_ORDER : ROAD_ORDER;

        const currentRows = () => rows.filter(d =>
            d.year === state.year &&
            d.dimension === state.dimension
        );

        // -----------------------------------------
        // 1. CONTROLS
        // -----------------------------------------

        const mode = controls.append("div")
            .attr("class", "segmented")
            .attr("role", "group")
            .attr("aria-label", "Comparison dimension");

        const dimensions = [
            ["age_group", "Age group"],
            ["road_user", "Road user"]
        ];

        mode.selectAll("button")
            .data(dimensions)
            .join("button")
            .attr("type", "button")
            .text(d => d[1])
            .on("click", function (event, d) {
                state.dimension = d[0];
                state.focus = null;
                render();
            });

        const yearControl = controls.append("div")
            .attr("class", "control-group slider-group");

        yearControl.append("label")
            .attr("class", "control-label")
            .attr("for", "q5-year")
            .text("Year");

        const slider = yearControl.append("input")
            .attr("id", "q5-year")
            .attr("type", "range")
            .attr("class", "year-slider")
            .attr("min", years[0])
            .attr("max", years[years.length - 1])
            .attr("step", 1)
            .property("value", state.year)
            .on("input", function () {
                state.year = Number(this.value);
                render();
            });

        const yearOutput = yearControl.append("output")
            .attr("class", "year-out")
            .attr("for", "q5-year");

        // -----------------------------------------
        // 2. CHART ELEMENTS
        // -----------------------------------------

        container.html("");

        const graph = container.append("div")
            .attr("class", "q5-graph");

        const title = graph.append("h4")
            .attr("class", "chart-title");

        graph.append("p")
            .attr("class", "q5-subtitle")
            .text(
                "Compare the composition of hospitalisations " +
                "within each population group. " +
                "Each stacked bar represents 100% of its group."
            );

        const chartHolder = graph.append("div")
            .attr("class", "q5-plot-wrap");

        const legend = graph.append("div")
            .attr("class", "q5-legend");

        const insight = graph.append("div")
            .attr("class", "q5-insight")
            .attr("aria-live", "polite");

        const caution = graph.append("p")
            .attr("class", "q5-caution chart-note");

        const tableHolder = container.append("div")
            .attr("class", "q5-table-wrap data-table-wrap")
            .style("display", "none");

        const tooltip = container.append("div")
            .attr("class", "q5-tooltip")
            .attr("role", "status")
            .style("display", "none");

        let svg = null;
        let progressRect = null;

        // -----------------------------------------
        // 3. WEBSITE CHART TOOLS
        // -----------------------------------------

        if (window.ChartTools) {
            window.ChartTools.register(
                "q5",

                () => ({
                    filename:
                        `q5_${state.dimension}_${state.year}.csv`,

                    rows: currentRows().map(d => ({
                        year: d.year,
                        dimension: d.dimension,
                        population_group: d.population_group,
                        category: d.category,
                        cases: d.cases,
                        group_total: d.group_total,
                        share_pct: +d.share_pct.toFixed(4)
                    }))
                }),

                showTable => {
                    state.table = showTable;
                    render();
                }
            );
        }

        // -----------------------------------------
        // 4. CATEGORY SORTING
        // -----------------------------------------

        function orderedCategories(data) {
            const available = new Set(
                data.map(d => d.category)
            );

            const expected = categoriesFor(state.dimension);

            const ordered = expected.filter(
                category => available.has(category)
            );

            const extra = [...available].filter(
                category => !expected.includes(category)
            ).sort(d3.ascending);

            return [...ordered, ...extra];
        }

        // -----------------------------------------
        // 5. BUILD STACKED DATA
        // -----------------------------------------

        function buildSegments(group, data, categories) {
            const groupRows = data.filter(
                d => d.population_group === group
            );

            const lookup = new Map(
                groupRows.map(d => [d.category, d])
            );

            let running = 0;
            const segments = [];

            categories.forEach(category => {
                const record = lookup.get(category);

                if (!record) return;

                const share = Math.min(
                    Math.max(0, record.share_pct),
                    Math.max(0, 100 - running)
                );

                if (share <= 0) return;

                segments.push({
                    category,
                    group,
                    share,
                    cases: record.cases,
                    start: running,
                    end: running + share,
                    missing: false
                });

                running += share;
            });

            const remainder = Math.max(0, 100 - running);

            // Never scale the reported values up to 100%.
            // A missing category is not equal to zero.
            if (remainder > 0.005) {
                segments.push({
                    category: MISSING,
                    group,
                    share: remainder,
                    cases: null,
                    start: running,
                    end: 100,
                    missing: true
                });
            }

            return {
                group,
                segments,
                reported: running,
                remainder
            };
        }

        // -----------------------------------------
        // 6. TOOLTIP
        // -----------------------------------------

        function showTooltip(d, node) {
            tooltip.html("");

            tooltip.append("strong")
                .text(d.category);

            tooltip.append("div")
                .text(d.group);

            tooltip.append("div")
                .text("Share: " + fmtPct(d.share));

            tooltip.append("div")
                .text(
                    d.missing
                        ? "Categories not represented in the processed data"
                        : fmtCases(d.cases) + " hospitalisations"
                );

            tooltip.style("display", "block");

            const chartBox =
                container.node().getBoundingClientRect();

            const rect = node.getBoundingClientRect();

            const width = tooltip.node().offsetWidth;
            const height = tooltip.node().offsetHeight;

            const center =
                (rect.left + rect.right) / 2 - chartBox.left;

            const left = Math.max(
                8,
                Math.min(
                    chartBox.width - width - 8,
                    center - width / 2
                )
            );

            const above =
                rect.top - chartBox.top - height - 10;

            tooltip
                .style("left", left + "px")
                .style(
                    "top",
                    (above > 5
                        ? above
                        : rect.bottom - chartBox.top + 8
                    ) + "px"
                );
        }

        function hideTooltip() {
            tooltip.style("display", "none");
        }

        // -----------------------------------------
        // 7. TABLE VIEW
        // -----------------------------------------

        function drawTable(data, categories, breakdowns) {
            tableHolder.html("");

            tableHolder.append("h4")
                .text(
                    state.year + " — " +
                    (state.dimension === "age_group"
                        ? "Age groups"
                        : "Road users")
                );

            const table = tableHolder.append("table")
                .attr("class", "q5-data-table");

            const headings = [
                "Category",
                "First Nations",
                "Non-Indigenous"
            ];

            table.append("thead")
                .append("tr")
                .selectAll("th")
                .data(headings)
                .join("th")
                .text(d => d);

            const tbody = table.append("tbody");

            const records = new Map(
                data.map(d => [
                    `${d.population_group}|${d.category}`,
                    d
                ])
            );

            const hasRemainder = breakdowns.some(
                d => d.remainder > 0.005
            );

            const displayed = hasRemainder
                ? [...categories, MISSING]
                : categories;

            const trs = tbody.selectAll("tr")
                .data(displayed)
                .join("tr");

            trs.append("th")
                .text(d => d);

            trs.each(function (category) {
                const tr = d3.select(this);

                GROUPS.forEach(group => {
                    let value = "Not reported";

                    if (category === MISSING) {
                        const b = breakdowns.find(
                            item => item.group === group
                        );
                        value = fmtPct(b.remainder);
                    } else {
                        const d = records.get(
                            `${group}|${category}`
                        );

                        if (d) {
                            value =
                                fmtPct(d.share_pct) +
                                " · " +
                                fmtCases(d.cases) +
                                " cases";
                        }
                    }

                    tr.append("td").text(value);
                });
            });

            tableHolder.append("p")
                .attr("class", "q5-table-note")
                .text(
                    "Shares describe the composition of " +
                    "hospitalisations, not population-adjusted injury risk."
                );
        }

        // -----------------------------------------
        // 8. MAIN RENDER FUNCTION
        // -----------------------------------------

        function render() {
            const data = currentRows();
            const categories = orderedCategories(data);

            const breakdowns = GROUPS.map(group =>
                buildSegments(group, data, categories)
            );

            const expected = categoriesFor(state.dimension);

            const colors = new Map(
                expected.map((name, i) => [
                    name,
                    COLORS[i % COLORS.length]
                ])
            );

            categories.forEach((name, i) => {
                if (!colors.has(name)) {
                    colors.set(
                        name,
                        COLORS[i % COLORS.length]
                    );
                }
            });

            const missingUsed = breakdowns.some(
                b => b.remainder > 0.005
            );

            mode.selectAll("button")
                .attr(
                    "aria-pressed",
                    d => String(d[0] === state.dimension)
                );

            slider.property("value", state.year);
            yearOutput.text(state.year);

            title.text(
                `${state.year} Hospitalisation Composition — ` +
                (state.dimension === "age_group"
                    ? "Age Groups"
                    : "Road Users")
            );

            graph.style(
                "display",
                state.table ? "none" : null
            );

            tableHolder.style(
                "display",
                state.table ? null : "none"
            );

            hideTooltip();

            drawTable(data, categories, breakdowns);

            if (state.table) return;

            // Chart dimensions
            const W = 960;
            const H = 338;

            const margin = {
                left: 208,
                right: 28
            };

            const innerWidth =
                W - margin.left - margin.right;

            const x = d3.scaleLinear()
                .domain([0, 100])
                .range([0, innerWidth]);

            const yPositions = [64, 184];
            const barHeight = 70;

            chartHolder.html("");

            svg = chartHolder.append("svg")
                .attr("class", "q5-svg")
                .attr("viewBox", `0 0 ${W} ${H}`)
                .attr("role", "img")
                .attr(
                    "aria-label",
                    `${state.year} stacked bar comparison of ` +
                    "First Nations and non-Indigenous " +
                    "hospitalisations"
                );

            const defs = svg.append("defs");

            // Hatched pattern for unavailable categories
            const pattern = defs.append("pattern")
                .attr("id", "q5-hatch")
                .attr("patternUnits", "userSpaceOnUse")
                .attr("width", 8)
                .attr("height", 8)
                .attr(
                    "patternTransform",
                    "rotate(45)"
                );

            pattern.append("rect")
                .attr("width", 8)
                .attr("height", 8)
                .attr("fill", "var(--q5-missing)");

            pattern.append("line")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", 0)
                .attr("y2", 8)
                .attr("stroke", "var(--q5-missing-stripe)")
                .attr("stroke-width", 3);

            const clip = defs.append("clipPath")
                .attr("id", "q5-progress-clip");

            progressRect = clip.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", innerWidth)
                .attr("height", H);

            const plot = svg.append("g")
                .attr(
                    "transform",
                    `translate(${margin.left},0)`
                );

            // Grid lines
            [0, 20, 40, 60, 80, 100].forEach(tick => {
                plot.append("line")
                    .attr("class", "q5-grid")
                    .attr("x1", x(tick))
                    .attr("x2", x(tick))
                    .attr("y1", 28)
                    .attr("y2", 273);
            });

            // Draw both population groups
            breakdowns.forEach((groupData, i) => {
                const y = yPositions[i];

                svg.append("text")
                    .attr("class", "q5-group-label")
                    .attr("x", margin.left - 16)
                    .attr("y", y + 26)
                    .attr("text-anchor", "end")
                    .text(
                        i === 0
                            ? "First Nations"
                            : "Non-Indigenous"
                    );

                svg.append("text")
                    .attr("class", "q5-group-small")
                    .attr("x", margin.left - 16)
                    .attr("y", y + 45)
                    .attr("text-anchor", "end")
                    .text("hospitalisations");

                plot.append("rect")
                    .attr("class", "q5-bar-bg")
                    .attr("x", 0)
                    .attr("y", y)
                    .attr("width", innerWidth)
                    .attr("height", barHeight)
                    .attr("rx", 5);

                const row = plot.append("g")
                    .attr(
                        "clip-path",
                        "url(#q5-progress-clip)"
                    );

                const segments = row
                    .selectAll("g.q5-segment")
                    .data(groupData.segments)
                    .join("g")
                    .attr("class", "q5-segment")
                    .classed(
                        "is-missing",
                        d => d.missing
                    );

                segments.append("rect")
                    .attr("x", d => x(d.start))
                    .attr("y", y)
                    .attr("width", d => x(d.share))
                    .attr("height", barHeight)
                    .attr(
                        "fill",
                        d => d.missing
                            ? "url(#q5-hatch)"
                            : colors.get(d.category)
                    )
                    .attr("stroke", "var(--q5-border)")
                    .attr("stroke-width", 1)
                    .attr("tabindex", 0)
                    .attr("role", "graphics-symbol")
                    .attr(
                        "aria-label",
                        d =>
                            `${d.group}, ${d.category}, ` +
                            fmtPct(d.share)
                    )
                    .on("pointerenter", function (event, d) {
                        showTooltip(d, this);
                    })
                    .on("pointermove", function (event, d) {
                        showTooltip(d, this);
                    })
                    .on("pointerleave", hideTooltip)
                    .on("focus", function (event, d) {
                        showTooltip(d, this);
                    })
                    .on("blur", hideTooltip)
                    .on("click", function (event, d) {
                        state.focus =
                            state.focus === d.category
                                ? null
                                : d.category;

                        applyFocus();
                    })
                    .on("keydown", function (event, d) {
                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {
                            event.preventDefault();

                            state.focus =
                                state.focus === d.category
                                    ? null
                                    : d.category;

                            applyFocus();
                        }
                    });

                // Label larger segments
                segments.filter(d =>
                    !d.missing && d.share >= 9
                ).append("text")
                    .attr("class", "q5-in-bar")
                    .attr(
                        "x",
                        d => x(d.start + d.share / 2)
                    )
                    .attr(
                        "y",
                        y + barHeight / 2 + 5
                    )
                    .attr("text-anchor", "middle")
                    .text(d => d.share.toFixed(1) + "%")
                    .attr("pointer-events", "none");
            });

            // X axis
            const axis = d3.axisBottom(x)
                .tickValues([0, 20, 40, 60, 80, 100])
                .tickFormat(d => d + "%");

            plot.append("g")
                .attr("class", "q5-axis")
                .attr(
                    "transform",
                    "translate(0,274)"
                )
                .call(axis);

            plot.append("text")
                .attr("class", "q5-axis-title")
                .attr("x", innerWidth / 2)
                .attr("y", 319)
                .attr("text-anchor", "middle")
                .text(
                    "Share of each group's hospitalisations"
                );

            // -----------------------------------------
            // 9. INTERACTIVE LEGEND
            // -----------------------------------------

            let legendItems = categories.map(
                category => ({
                    category,
                    color: colors.get(category)
                })
            );

            if (missingUsed) {
                legendItems.push({
                    category: MISSING,
                    color: "missing"
                });
            }

            legend.html("");

            const buttons = legend
                .selectAll("button")
                .data(legendItems)
                .join("button")
                .attr("type", "button")
                .attr("class", "q5-legend-item")
                .on("click", function (event, d) {
                    state.focus =
                        state.focus === d.category
                            ? null
                            : d.category;

                    applyFocus();
                });

            buttons.append("span")
                .attr(
                    "class",
                    d => d.color === "missing"
                        ? "q5-swatch q5-hatched"
                        : "q5-swatch"
                )
                .style(
                    "background",
                    d => d.color === "missing"
                        ? null
                        : d.color
                );

            buttons.append("span")
                .text(d => d.category);

            applyFocus();

            // -----------------------------------------
            // 10. INSIGHTS
            // -----------------------------------------

            const byGroup = new Map(
                data.map(d => [
                    `${d.population_group}|${d.category}`,
                    d
                ])
            );

            const differences = categories
                .map(category => {
                    const a = byGroup.get(
                        GROUPS[0] + "|" + category
                    );

                    const b = byGroup.get(
                        GROUPS[1] + "|" + category
                    );

                    if (!a || !b) return null;

                    return {
                        category,
                        a: a.share_pct,
                        b: b.share_pct,
                        difference:
                            a.share_pct - b.share_pct
                    };
                })
                .filter(Boolean)
                .sort(
                    (a, b) =>
                        Math.abs(b.difference) -
                        Math.abs(a.difference)
                );

            insight.html("");

            if (differences.length) {
                const largest = differences[0];

                insight.append("strong")
                    .text("Largest reported difference");

                insight.append("p")
                    .text(
                        `${largest.category}: ` +
                        `First Nations ${fmtPct(largest.a)}, ` +
                        `Non-Indigenous ${fmtPct(largest.b)} ` +
                        `(${fmtDifference(largest.difference)}).`
                    );
            } else {
                insight.append("p")
                    .text(
                        "No directly comparable categories " +
                        "are available for this selection."
                    );
            }

            const remainders = breakdowns
                .filter(d => d.remainder > 0.005)
                .map(
                    d =>
                        `${d.group}: ` +
                        fmtPct(d.remainder)
                );

            caution.text(
                remainders.length
                    ? "Hatched areas show shares not represented " +
                      "in the processed data (" +
                      remainders.join("; ") +
                      "). They may include suppressed or " +
                      "incomplete categories. These are not zero. " +
                      "Source: BITRE (2023), processed in KNIME."
                    : "Percentages describe the composition " +
                      "of hospitalisations within each group, " +
                      "not population-adjusted injury rates. " +
                      "Source: BITRE (2023), processed in KNIME."
            );

            const sideInsight = d3.select("#q5-insight");

            if (!sideInsight.empty()) {
                sideInsight.text(
                    differences.length
                        ? `In ${state.year}, the largest reported ` +
                          `difference was ${differences[0].category}, ` +
                          `${fmtDifference(differences[0].difference)} ` +
                          `(First Nations minus Non-Indigenous).`
                        : "Select a year to explore the comparison."
                );
            }

            updateProgress();

            if (
                window.Layout &&
                typeof window.Layout.refit === "function"
            ) {
                window.Layout.refit();
            }
        }

        function applyFocus() {
            if (!svg) return;

            svg.selectAll(".q5-segment")
                .classed(
                    "is-dimmed",
                    d =>
                        state.focus !== null &&
                        d.category !== state.focus
                );

            legend.selectAll(".q5-legend-item")
                .classed(
                    "is-dimmed",
                    d =>
                        state.focus !== null &&
                        d.category !== state.focus
                )
                .attr(
                    "aria-pressed",
                    d => String(
                        state.focus === d.category
                    )
                );
        }

        // -----------------------------------------
        // 11. SCROLL PROGRESS
        // -----------------------------------------

        function updateProgress() {
            if (!progressRect) return;

            const width = 724;

            progressRect.attr(
                "width",
                reducedMotion
                    ? width
                    : width * Math.max(
                        0,
                        Math.min(1, state.progress)
                    )
            );
        }

        function setProgress(value) {
            if (!Number.isFinite(value)) return;

            state.progress = value;
            updateProgress();
        }

        window.Q5 = {
            setProgress
        };

        // Initial render
        render();

        if (Number.isFinite(window.chartProgress?.q5)) {
            setProgress(window.chartProgress.q5);
        }

        window.addEventListener(
            "themechange",
            () => render()
        );

    }).catch(function (error) {
        console.error("Q5 chart error:", error);

        container.html("");

        container.append("p")
            .attr("class", "q5-error")
            .text(
                "Unable to load Q5 data. Check the CSV path " +
                "and run this website using Live Server."
            );
    });

})();
