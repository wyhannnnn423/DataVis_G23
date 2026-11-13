/* Q1 National Trend: Scroll-driven area + line chart with animated annotations and crosshair tooltip.
   Data: data/q1_national_trend.csv (year, hospitalisations).
   Steps: 0 = Overall trend & KPI number counter, 1 = Recording method change annotations, 2 = 2019-2021 focus period. */

(function() {
    const container = d3.select("#q1-chart");
    if (container.empty()) return;

    const W = 960,
        H = 580;
    const m = { top: 44, right: 36, bottom: 52, left: 72 };
    const innerW = W - m.left - m.right;
    const innerH = H - m.top - m.bottom;

    const breaks = [
        { year: 2012, label: "2012: Victoria recording change", dy: -16 },
        { year: 2017, label: "2017: NSW recording change", dy: -42 }
    ];

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduce ? 0 : 750;
    const fmt = d3.format(",");
    let svg, x, y, breaksG, bandG, pts, areaPath, linePath, chartData, pending = 0;
    let introApi = null,
        wantVisible = false,
        wantInstant = false;

    function animateKPI(id, endVal, formatter) {
        const el = document.getElementById(id);
        if (!el) return;
        if (reduce) {
            el.textContent = formatter(endVal);
            return;
        }
        d3.select(el)
            .transition()
            .delay(900)
            .duration(2000)
            .ease(d3.easeLinear)
            .tween("text", function() {
                const interp = d3.interpolateNumber(0, endVal);
                return function(t) {
                    this.textContent = formatter(interp(t));
                };
            });
    }

    window.Q1 = {
        setVisible(v, instant) {
            wantVisible = v;
            wantInstant = !!instant;
            if (introApi) v ? (instant ? introApi.show() : introApi.play()) : introApi.hide();
        },
        setStep(n) {
            pending = n;
            if (!breaksG || !bandG || !pts) return;

            const t = d3.transition().duration(dur).ease(d3.easeCubicOut);

            breaksG.selectAll(".break-line")
                .transition(t)
                .attr("y2", n >= 1 ? H - m.bottom : m.top)
                .style("opacity", n >= 1 ? 0.75 : 0);

            breaksG.selectAll(".break-badge")
                .transition(t)
                .attr("transform", d => `translate(${x(d.year)}, ${n >= 1 ? H - m.bottom + d.dy : H - m.bottom})`)
                .style("opacity", n >= 1 ? 1 : 0);

            bandG.select(".band-rect")
                .transition(t)
                .attr("width", n >= 2 ? x(2021) - x(2019) : 0)
                .attr("fill-opacity", n >= 2 ? 0.14 : 0)
                .attr("stroke-opacity", n >= 2 ? 0.45 : 0);

            bandG.select(".band-label")
                .transition(t)
                .attr("y", n >= 2 ? m.top - 10 : m.top)
                .style("opacity", n >= 2 ? 1 : 0);

            pts.transition(t)
                .attr("r", d => {
                    if (n === 1 && (d.year === 2012 || d.year === 2017)) return 7.5;
                    if (n >= 2 && d.year >= 2019) return 7.5;
                    return 5.5;
                })
                .attr("fill", d => {
                    if (n === 1 && (d.year === 2012 || d.year === 2017)) return "var(--highlight-warm)";
                    if (n >= 2 && d.year >= 2019) return "var(--highlight-warm)";
                    return "var(--surface)";
                })
                .attr("stroke", d => {
                    if ((n === 1 && (d.year === 2012 || d.year === 2017)) || (n >= 2 && d.year >= 2019)) {
                        return "var(--highlight-warm)";
                    }
                    return "var(--accent)";
                });
        }
    };

    container.style("position", "relative");

    d3.csv("data/q1_national_trend.csv", d3.autoType).then(function(data) {
        chartData = data;
        const first = data[0],
            last = data[data.length - 1];
        const pct = (last.hospitalisations - first.hospitalisations) / first.hospitalisations * 100;

        animateKPI("kpi-2011", first.hospitalisations, v => fmt(Math.round(v)));
        animateKPI("kpi-2021", last.hospitalisations, v => fmt(Math.round(v)));
        animateKPI("kpi-change", pct, v => (v >= 0 ? "+" : "") + v.toFixed(0) + "%");

        x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.year))
            .range([m.left, W - m.right]);

        y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.hospitalisations) * 1.12])
            .nice()
            .range([H - m.bottom, m.top]);

        svg = container.append("svg")
            .attr("viewBox", `0 0 ${W} ${H}`)
            .attr("width", "100%")
            .attr("role", "img")
            .attr("aria-label", "Line chart of hospitalised road traffic injuries in Australia, 2011 to 2021, rising from 34,033 to 39,505, with annotations for recording changes in 2012 and 2017 and the 2019-2021 pandemic dip and rebound.")
            .style("display", "block")
            .style("height", "auto")
            .style("overflow", "visible");

        const defs = svg.append("defs");
        const grad = defs.append("linearGradient")
            .attr("id", "q1-area-grad")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", "var(--accent)").attr("stop-opacity", 0.28);
        grad.append("stop").attr("offset", "100%").attr("stop-color", "var(--accent)").attr("stop-opacity", 0.0);

        svg.append("g")
            .selectAll("line")
            .data(y.ticks(6))
            .join("line")
            .attr("x1", m.left)
            .attr("x2", W - m.right)
            .attr("y1", d => y(d))
            .attr("y2", d => y(d))
            .attr("stroke", "currentColor")
            .attr("stroke-dasharray", d => d === 0 ? null : "3 5")
            .attr("opacity", d => d === 0 ? 0.25 : 0.12);

        bandG = svg.append("g").attr("class", "step-band");
        bandG.append("rect")
            .attr("class", "band-rect")
            .attr("x", x(2019))
            .attr("y", m.top)
            .attr("width", 0)
            .attr("height", innerH)
            .attr("rx", 6)
            .attr("fill", "var(--highlight-warm)")
            .attr("fill-opacity", 0)
            .attr("stroke", "var(--highlight-warm)")
            .attr("stroke-opacity", 0)
            .attr("stroke-dasharray", "4 4");

        bandG.append("text")
            .attr("class", "band-label")
            .attr("x", x(2021))
            .attr("y", m.top)
            .attr("text-anchor", "end")
            .attr("font-size", 12.5)
            .attr("font-weight", 700)
            .attr("fill", "var(--highlight-warm)")
            .style("opacity", 0)
            .text("2019–2021: COVID Dip & Rebound");

        const areaGen = d3.area()
            .x(d => x(d.year))
            .y0(H - m.bottom)
            .y1(d => y(d.hospitalisations))
            .curve(d3.curveMonotoneX);

        areaPath = svg.append("path")
            .datum(data)
            .attr("fill", "url(#q1-area-grad)")
            .attr("d", areaGen)
            .style("opacity", reduce ? 1 : 0);

        const xAxis = svg.append("g")
            .attr("transform", `translate(0,${H - m.bottom})`)
            .call(d3.axisBottom(x).ticks(data.length).tickFormat(d3.format("d")).tickSizeOuter(0))
            .attr("font-size", 13);
        xAxis.select(".domain").attr("stroke-opacity", 0.25);

        const yAxis = svg.append("g")
            .attr("transform", `translate(${m.left},0)`)
            .call(d3.axisLeft(y).ticks(6).tickFormat(fmt).tickSize(0).tickPadding(10))
            .attr("font-size", 13);
        yAxis.select(".domain").remove();

        svg.append("text")
            .attr("x", m.left)
            .attr("y", 18)
            .attr("font-size", 13)
            .attr("font-weight", 600)
            .attr("fill", "currentColor")
            .attr("opacity", 0.75)
            .text("Hospitalised injuries per year (Australia)");

        breaksG = svg.append("g").attr("class", "step-breaks");
        breaks.forEach(b => {
            breaksG.append("line")
                .datum(b)
                .attr("class", "break-line")
                .attr("x1", x(b.year))
                .attr("x2", x(b.year))
                .attr("y1", m.top)
                .attr("y2", m.top)
                .attr("stroke", "var(--highlight-warm)")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5 5")
                .style("opacity", 0);

            const badge = breaksG.append("g")
                .datum(b)
                .attr("class", "break-badge")
                .attr("transform", `translate(${x(b.year)}, ${H - m.bottom})`)
                .style("opacity", 0);

            badge.append("text")
                .attr("x", 8)
                .attr("y", 0)
                .attr("font-size", 12.5)
                .attr("font-weight", 600)
                .attr("fill", "currentColor")
                .text(b.label);
        });

        const lineGen = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.hospitalisations))
            .curve(d3.curveMonotoneX);

        linePath = svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "var(--accent)")
            .attr("stroke-width", 3.2)
            .attr("stroke-linecap", "round")
            .attr("d", lineGen);

        if (!reduce) {
            const len = linePath.node().getTotalLength();
            const LINE_MS = 1300;

            const hide = () => {
                areaPath.interrupt().style("opacity", 0);
                linePath.interrupt()
                    .attr("stroke-dasharray", len)
                    .attr("stroke-dashoffset", len);
                if (pts) {
                    pts.interrupt("intro")
                        .style("transform-box", "fill-box")
                        .style("transform-origin", "center")
                        .style("opacity", 0)
                        .style("transform", "scale(0)")
                        .style("pointer-events", "none");
                }
            };

            const show = () => {
                areaPath.interrupt().style("opacity", 1);
                linePath.interrupt()
                    .attr("stroke-dasharray", null)
                    .attr("stroke-dashoffset", null);
                if (pts) {
                    pts.interrupt("intro")
                        .style("pointer-events", null)
                        .style("opacity", 1)
                        .style("transform", "scale(1)");
                }
            };

            const play = () => {
                hide();
                areaPath.transition().delay(250).duration(1000).ease(d3.easeCubicOut).style("opacity", 1);
                linePath.transition().duration(LINE_MS).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);

                if (pts && chartData) {
                    const x0 = x(chartData[0].year);
                    const x1 = x(chartData[chartData.length - 1].year);
                    pts.style("pointer-events", null)
                        .transition("intro")
                        .delay(d => {
                            const f = (x(d.year) - x0) / (x1 - x0);
                            return LINE_MS * (1 - Math.pow(1 - f, 1 / 3));
                        })
                        .duration(450)
                        .ease(d3.easeBackOut.overshoot(2.2))
                        .style("opacity", 1)
                        .style("transform", "scale(1)");
                }
            };

            introApi = { play, hide, show };
        }

        const hoverLine = svg.append("line")
            .attr("y1", m.top)
            .attr("y2", H - m.bottom)
            .attr("stroke", "var(--accent)")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "3 3")
            .style("opacity", 0)
            .style("pointer-events", "none");

        const tip = container.append("div")
            .attr("role", "status")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("padding", "10px 14px")
            .style("white-space", "nowrap")
            .style("font-size", "13.5px")
            .style("line-height", "1.45")
            .style("border-radius", "10px")
            .style("border", "1px solid var(--line)")
            .style("background", "var(--surface-elevated)")
            .style("backdrop-filter", "blur(10px)")
            .style("box-shadow", "var(--shadow-lg)")
            .style("color", "var(--text)")
            .style("transform", "translate(-50%, -120%)")
            .style("transition", "opacity 0.2s ease, transform 0.2s ease")
            .style("z-index", 20);

        function showTip(event, d) {
            const idx = data.indexOf(d);
            const prev = idx > 0 ? data[idx - 1] : null;
            let deltaHtml = "";
            if (prev) {
                const diff = d.hospitalisations - prev.hospitalisations;
                const diffPct = (diff / prev.hospitalisations) * 100;
                const sign = diff >= 0 ? "+" : "";
                deltaHtml = `<div style="color:var(--muted);font-size:12px;margin-top:2px;">YoY: <strong>${sign}${fmt(diff)}</strong> (${sign}${diffPct.toFixed(1)}%)</div>`;
            }
            const r = this.getBoundingClientRect();
            const c = container.node().getBoundingClientRect();
            hoverLine
                .attr("x1", x(d.year))
                .attr("x2", x(d.year))
                .style("opacity", 0.55);

            tip.html(`
        <div style="font-weight:700;color:var(--accent);margin-bottom:2px;">Year ${d.year}</div>
        <div><strong>${fmt(d.hospitalisations)}</strong> hospitalised injuries</div>
        ${deltaHtml}
      `)
                .style("opacity", 1);

            const tipW = tip.node().offsetWidth;
            const tipH = tip.node().offsetHeight;
            const px = r.left - c.left + r.width / 2;
            const left = Math.max(tipW / 2 + 4, Math.min(c.width - tipW / 2 - 4, px));
            const roomAbove = r.top - c.top - 10;
            const flip = roomAbove < tipH;
            tip.style("left", left + "px")
                .style("top", (flip ? r.bottom - c.top + 10 : r.top - c.top - 10) + "px")
                .style("transform", flip ? "translate(-50%, 0)" : "translate(-50%, -100%)");
        }

        function hideTip() {
            hoverLine.style("opacity", 0);
            tip.style("opacity", 0).style("transform", "translate(-50%, -105%)");
        }

        pts = svg.selectAll("circle.pt")
            .data(data)
            .join("circle")
            .attr("class", "pt")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.hospitalisations))
            .attr("r", 5.5)
            .attr("fill", "var(--surface)")
            .attr("stroke", "var(--accent)")
            .attr("stroke-width", 2.5)
            .attr("tabindex", 0)
            .attr("aria-label", d => `${d.year}: ${fmt(d.hospitalisations)} hospitalised injuries`)
            .on("mouseover", showTip)
            .on("focus", showTip)
            .on("mouseout", hideTip)
            .on("blur", hideTip);

        if (introApi) wantVisible ? (wantInstant ? introApi.show() : introApi.play()) : introApi.hide();

        window.Q1.setStep(pending);
        if (window.Layout) window.Layout.refit();
    }).catch(function(err) {
        console.error("Q1 failed to load data:", err);
        container.append("p").text("Sorry, the chart could not be loaded.");
    });
})();