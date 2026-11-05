/* Q1 National trend: scroll-driven line chart.
   Data: data/q1_national_trend.csv (year, hospitalisations).
   Steps: 0 = line, 1 = series-break annotations, 2 = 2019-2021 highlight.
   window.Q1.setStep(n) is called by main.js as the reader scrolls. */

(function () {
  const container = d3.select("#q1-chart");
  if (container.empty()) return;

  const W = 800, H = 440;
  const m = { top: 28, right: 24, bottom: 48, left: 64 };
  const breaks = [
    { year: 2012, label: "2012: Victoria recording change" },
    { year: 2017, label: "2017: NSW recording change" }
  ];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dur = reduce ? 0 : 600;
  const fmt = d3.format(",");
  let breaksG, bandG, pending = 0;

  window.Q1 = {
    setStep(n) {
      pending = n;
      if (!breaksG) return;
      breaksG.transition().duration(dur).style("opacity", n >= 1 ? 1 : 0);
      bandG.transition().duration(dur).style("opacity", n >= 2 ? 1 : 0);
    }
  };

  container.style("position", "relative");

  d3.csv("data/q1_national_trend.csv", d3.autoType).then(function (data) {
    // Hero KPIs
    const first = data[0], last = data[data.length - 1];
    const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    set("kpi-2011", fmt(first.hospitalisations));
    set("kpi-2021", fmt(last.hospitalisations));
    const pct = (last.hospitalisations - first.hospitalisations) / first.hospitalisations * 100;
    set("kpi-change", (pct >= 0 ? "+" : "") + pct.toFixed(0) + "%");

    const x = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([m.left, W - m.right]);
    // Zero baseline so the size of the change is not exaggerated
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.hospitalisations) * 1.1]).nice().range([H - m.bottom, m.top]);

    const svg = container.append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%")
      .attr("role", "img")
      .attr("aria-label", "Line chart of hospitalised road traffic injuries in Australia, 2011 to 2021, rising from about 34,000 to about 39,500, with annotations for recording changes in 2012 and 2017.")
      .style("display", "block").style("height", "auto");

    // 2019-2021 highlight (step 2)
    bandG = svg.append("g").style("opacity", 0);
    bandG.append("rect").attr("x", x(2019)).attr("y", m.top).attr("width", x(2021) - x(2019))
      .attr("height", H - m.bottom - m.top).attr("fill", "currentColor").attr("opacity", 0.09);
    bandG.append("text").attr("x", (x(2019) + x(2021)) / 2).attr("y", m.top + 14)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "currentColor").text("2019-2021");

    // Grid and axes
    svg.append("g").selectAll("line").data(y.ticks(5)).join("line")
      .attr("x1", m.left).attr("x2", W - m.right).attr("y1", d => y(d)).attr("y2", d => y(d))
      .attr("stroke", "currentColor").attr("opacity", 0.12);
    svg.append("g").attr("transform", `translate(0,${H - m.bottom})`)
      .call(d3.axisBottom(x).ticks(data.length).tickFormat(d3.format("d"))).attr("font-size", 12);
    svg.append("g").attr("transform", `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(fmt)).attr("font-size", 12);
    svg.append("text").attr("x", m.left).attr("y", 14).attr("font-size", 12)
      .attr("fill", "currentColor").attr("opacity", 0.8).text("Hospitalised injuries per year");

    // Series breaks (step 1)
    breaksG = svg.append("g").style("opacity", 0);
    breaks.forEach(b => {
      breaksG.append("line").attr("x1", x(b.year)).attr("x2", x(b.year)).attr("y1", m.top).attr("y2", H - m.bottom)
        .attr("stroke", "currentColor").attr("stroke-dasharray", "4 4").attr("opacity", 0.6);
      breaksG.append("text").attr("x", x(b.year) + 5).attr("y", H - m.bottom - 8)
        .attr("font-size", 12).attr("fill", "currentColor").text(b.label);
    });

    // Line (draws in once on load)
    const path = svg.append("path").datum(data).attr("fill", "none").attr("stroke", "#2a7ab9")
      .attr("stroke-width", 2.5).attr("d", d3.line().x(d => x(d.year)).y(d => y(d.hospitalisations)));
    if (!reduce) {
      const len = path.node().getTotalLength();
      path.attr("stroke-dasharray", len).attr("stroke-dashoffset", len)
        .transition().duration(1200).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);
    }

    // Tooltip
    const tip = container.append("div").attr("role", "status")
      .style("position", "absolute").style("pointer-events", "none").style("opacity", 0)
      .style("padding", "6px 10px").style("font-size", "13px").style("border-radius", "6px")
      .style("border", "1px solid var(--line)").style("background", "var(--surface)")
      .style("color", "var(--text)").style("transform", "translate(-50%, -125%)");
    function showTip(event, d) {
      const r = this.getBoundingClientRect(), c = container.node().getBoundingClientRect();
      tip.html(`<strong>${d.year}</strong><br>${fmt(d.hospitalisations)} hospitalised injuries`)
        .style("left", (r.left - c.left + r.width / 2) + "px").style("top", (r.top - c.top) + "px").style("opacity", 1);
    }
    const hideTip = () => tip.style("opacity", 0);

    svg.selectAll("circle.pt").data(data).join("circle").attr("class", "pt")
      .attr("cx", d => x(d.year)).attr("cy", d => y(d.hospitalisations)).attr("r", 5).attr("fill", "#2a7ab9")
      .attr("tabindex", 0)
      .attr("aria-label", d => `${d.year}: ${fmt(d.hospitalisations)} hospitalised injuries`)
      .on("mouseover", showTip).on("focus", showTip).on("mouseout", hideTip).on("blur", hideTip);

    window.Q1.setStep(pending);
  }).catch(function (err) {
    console.error("Q1 failed to load data:", err);
    container.append("p").text("Sorry, the chart could not be loaded.");
  });
})();
