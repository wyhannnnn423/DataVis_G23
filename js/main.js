const PAL = ["#29d3c4", "#ff4d8d", "#6c8cff", "#ffb000", "#b794f4", "#7bd88f"];
const fmt = d3.format(","), pct = d3.format("+.1%");
const tip = d3.select("#tip");
const showTip = (e, h) => tip.html(h).style("opacity", 1).style("left", e.clientX + 12 + "px").style("top", e.clientY - 34 + "px");
const hideTip = () => tip.style("opacity", 0);
const seg = (id, cb) => d3.selectAll(`#${id} button`).on("click", function () {
  d3.selectAll(`#${id} button`).attr("aria-pressed","false"); d3.select(this).attr("aria-pressed", "true"); cb(this.dataset.v); });

/* ---------- Sample data (used per file when data/<name>.csv is missing) ---------- */
let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const J = (b, t, y, a = 1) => Math.round(b * (1 + t * (y - 2011)) * (y === 2020 ? a : 1) * (0.97 + rnd() * 0.06));
const YRS = d3.range(2011, 2022);
const RU = { "Car driver": [11000, .01, .92], "Car passenger": [4800, -.01, .9], "Motorcyclist": [7500, .015, .97], "Pedal cyclist": [5400, .04, 1.08], "Pedestrian": [3600, 0, .85], "Other or unknown": [1700, .01, .95] };
const AGE = { "0-7": [700, 0], "8-16": [2300, .005], "17-25": [8000, 0], "26-39": [8200, .01], "40-64": [10500, .015], "65-74": [3000, .04], "75+": [2300, .035] };
const ST = { NSW: [10600, 7.2e6, 0], VIC: [7000, 5.5e6, .03], QLD: [7500, 4.6e6, .05], WA: [3800, 2.4e6, .02], SA: [2500, 1.65e6, .01], TAS: [700, 5.1e5, .01], ACT: [500, 3.7e5, .01], NT: [450, 2.3e5, 0] };
const REM = ["Major Cities", "Inner Regional", "Outer Regional", "Remote", "Very Remote"];
const SH = { "First Nations people": [.27, .2, .22, .12, .19], "Other Australians": [.7, .19, .08, .02, .01] };
const MON = d3.range(12).map(m => new Date(2000, m).toLocaleString("en", { month: "long" }));
const SAMPLE = {
  national_annual: () => YRS.map(y => ({ year: y, hospitalisations: J(34000, .016, y, .96) })),
  national_monthly: () => YRS.flatMap(y => d3.range(12).map(m => ({ year: y, month: MON[m], month_number: m + 1,
    hospitalisations: Math.round(J(34000, .016, y, .96) / 12 * (1 + .08 * Math.sin(m / 12 * 6.28)) * (y === 2020 && m === 3 ? .7 : 1)) }))),
  road_user_annual: () => YRS.flatMap(y => Object.entries(RU).map(([k, [b, t, a]]) => ({ year: y, road_user: k, hospitalisations: J(b, t, y, a) }))),
  age_annual: () => YRS.flatMap(y => Object.entries(AGE).map(([k, [b, t]]) => ({ year: y, age_group: k, hospitalisations: J(b, t, y, .97) }))),
  sex_annual: () => YRS.flatMap(y => [["Male", 22000, .012], ["Female", 11700, .008]].map(([k, b, t]) => ({ year: y, sex: k, hospitalisations: J(b, t, y, .96) }))),
  state_annual: () => YRS.flatMap(y => Object.entries(ST).map(([k, [b, p, t]]) => { const h = J(b, t, y, .95), pop = Math.round(p * 1.015 ** (y - 2011));
    return { year: y, state: k, hospitalisations: h, population: pop, rate_per_100k: h / pop * 1e5 }; })),
  first_nation_annual: () => YRS.flatMap(y => [["First Nations people", 1200, .07], ["Other Australians", 33000, .01]].map(([g, b, t]) => ({ group: g, year: y, hospitalisations: J(b, t, y, 1.02) }))),
  first_nations_remoteness: () => YRS.flatMap(y => Object.entries(SH).flatMap(([g, sh]) => REM.map((r, i) => ({ group: g, remoteness: r, year: y,
    hospitalisations: Math.round(J(g[0] === "F" ? 1200 : 33000, .02, y) * sh[i]) })))),
};
async function loadAll() {
  const D = {}, miss = [];
  for (const f of Object.keys(SAMPLE)) {
    try { const r = await d3.csv(`data/${f}.csv`, d3.autoType); if (!r.length) throw 0; D[f] = r; }
    catch (e) { D[f] = SAMPLE[f](); miss.push(f + ".csv"); }
  }
  if (miss.length) d3.select("#banner").style("display", "block")
    .text("Sample data in use for: " + miss.join(", ") + ". Put your KNIME exports in the data folder with the same file and column names to replace it.");
  return D;
}

/* ---------- Chart helpers ---------- */
function sv(sel, w, h) { const s = d3.select(sel).attr("viewBox", `0 0 ${w} ${h}`); s.selectAll("*").remove(); return s; }
function legend(sel, items) {
  d3.select(sel).selectAll("span").data(items).join("span").html(d => `<i style="background:${d.c}"></i>${d.n}`);
}
function lineChart(sel, series, o = {}) {
  const w = o.w || 800, h = o.h || 340, m = { t: 12, r: 16, b: 30, l: o.l || 56 }, s = sv(sel, w, h);
  const xs = series.flatMap(d => d.pts.map(p => p.x)), ys = series.flatMap(d => d.pts.map(p => p.y));
  const x = d3.scaleLinear(d3.extent(xs), [m.l, w - m.r]);
  const y = d3.scaleLinear([0, d3.max(ys) * 1.05], [h - m.b, m.t]).nice();
  s.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat(""));
  s.append("g").attr("class", "axis").attr("transform", `translate(0,${h - m.b})`)
    .call(d3.axisBottom(x).tickValues(o.xt || d3.range(Math.ceil(x.domain()[0]), x.domain()[1] + 1)).tickFormat(d3.format("d")));
  s.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(o.yf || fmt));
  const ln = d3.line().x(p => x(p.x)).y(p => y(p.y));
  series.forEach(d => {
    s.append("path").attr("d", ln(d.pts)).attr("fill", "none").attr("stroke", d.c).attr("stroke-width", 2.5);
    s.append("g").selectAll("circle").data(d.pts).join("circle").attr("cx", p => x(p.x)).attr("cy", p => y(p.y)).attr("r", o.r || 4).attr("fill", d.c)
      .on("mousemove", (e, p) => showTip(e, `<strong>${d.n}</strong><br>${p.l ?? p.x}: ${(o.tf || fmt)(p.y)}`)).on("mouseleave", hideTip);
  });
}
function hbar(sel, rows, o = {}) {
  const w = 800, m = { t: 8, r: 70, b: 8, l: o.l || 170 }, h = rows.length * 32 + m.t + m.b, s = sv(sel, w, h);
  const y = d3.scaleBand(rows.map(r => r.k), [m.t, h - m.b]).padding(0.25);
  const x = d3.scaleLinear(d3.extent([0, ...rows.map(r => r.v)]), [m.l, w - m.r]).nice();
  s.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", m.t).attr("y2", h - m.b).attr("stroke", "var(--rule)");
  s.selectAll("rect").data(rows).join("rect").attr("x", r => x(Math.min(0, r.v))).attr("y", r => y(r.k)).attr("height", y.bandwidth())
    .attr("width", r => Math.abs(x(r.v) - x(0))).attr("rx", 3).attr("fill", r => r.c || (r.v >= 0 ? "var(--c4)" : "var(--c1)"))
    .on("mousemove", (e, r) => showTip(e, `<strong>${r.k}</strong><br>${o.vf(r.v)}`)).on("mouseleave", hideTip);
  s.selectAll(".k").data(rows).join("text").attr("x", m.l - 8).attr("y", r => y(r.k) + y.bandwidth() / 2 + 4).attr("text-anchor", "end").text(r => r.k);
  s.selectAll(".v").data(rows).join("text").attr("x", r => x(r.v) + (r.v >= 0 ? 6 : -6)).attr("y", r => y(r.k) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", r => r.v >= 0 ? "start" : "end").text(r => o.vf(r.v));
}

loadAll().then(init);

function init(D) {
  const yrs = [...new Set(D.national_annual.map(d => d.year))].sort(d3.ascending), y0 = yrs[0], y1 = yrs.at(-1);
  const sumBy = (rows, f, v) => d3.sum(rows.filter(f), d => d[v]);
  const users = [...new Set(D.road_user_annual.map(d => d.road_user))];
  const COL = Object.fromEntries(users.map((u, i) => [u, PAL[i % PAL.length]]));
  const ruVal = (u, y) => sumBy(D.road_user_annual, d => d.road_user === u && d.year === y, "hospitalisations");

  /* ----- Hero: dot swarm ----- */
  const cv = document.getElementById("swarm"), ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
  let W, H, R, nodes = [], mode = "all", year = y1, unit = 1;
  const size = () => { W = cv.clientWidth; H = cv.clientHeight; R = W < 600 ? 2.4 : 3.6; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const keys = () => mode === "user" ? users : ["all"];
  const cx = n => W * (keys().indexOf(mode === "user" ? n.u : "all") + 0.5) / keys().length;
  const sim = d3.forceSimulation().alphaDecay(0.018).velocityDecay(0.32).force("x", d3.forceX(cx).strength(0.09))
    .force("y", d3.forceY(() => H * (mode === "all" ? 0.5 : 0.45)).strength(0.09)).on("tick", draw);
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const n of nodes) { ctx.fillStyle = COL[n.u]; ctx.beginPath(); ctx.arc(n.x, n.y, R, 0, 6.2832); ctx.fill(); }
    if (mode === "user") { ctx.fillStyle = "#9aa7c0"; ctx.font = "600 12px 'Public Sans',sans-serif"; ctx.textAlign = "center";
      users.forEach((u, i) => { const x = W * (i + 0.5) / users.length; ctx.fillText(u, x, H - 30); ctx.fillText(fmt(ruVal(u, year)), x, H - 14); }); }
  }
  function rebuild() {
    const total = d3.sum(users, u => ruVal(u, year)); unit = Math.max(1, Math.ceil(total / 700)); nodes = [];
    users.forEach(u => { for (let i = 0, n = Math.round(ruVal(u, year) / unit); i < n; i++) nodes.push({ u, x: W / 2 + (Math.random() - .5) * 60, y: H / 2 + (Math.random() - .5) * 60 }); });
    d3.select("#yearLabel").text(year);
    d3.select("#unit").text(`One dot is about ${fmt(unit)} hospitalised injuries. Colours are road users.`);
    d3.select("#big").transition().duration(900).tween("n", function () { const i = d3.interpolateNumber(+this.textContent.replace(/,/g, "") || 0, total); return t => this.textContent = fmt(Math.round(i(t))); });
    sim.force("c", d3.forceCollide(R + 0.8)).nodes(nodes).alpha(0.95).restart();
  }
  d3.selectAll(".hero .seg button").on("click", function () {
    mode = this.dataset.mode; d3.selectAll(".hero .seg button").attr("aria-pressed", function () { return String(this.dataset.mode === mode); });
    sim.alpha(0.9).restart();
  });
  d3.select("#year").attr("min", y0).attr("max", y1).property("value", y1).on("input", function () { year = +this.value; d3.select("#yearOut").text(year); rebuild(); });
  d3.select("#yearOut").text(y1);
  window.addEventListener("resize", () => { size(); rebuild(); });
  size(); rebuild();

  /* ----- Q1 ----- */
  const nat = D.national_annual.slice().sort((a, b) => a.year - b.year);
  const nA = nat[0].hospitalisations, nB = nat.at(-1).hospitalisations;
  d3.select("#q1s").text(`From ${fmt(nA)} in ${y0} to ${fmt(nB)} in ${y1} (${pct(nB / nA - 1)}). Switch to the monthly view to look closely at 2020. Timing alone cannot show cause.`);
  function q1(v) {
    if (v === "annual") lineChart("#q1c", [{ n: "Australia", c: PAL[0], pts: nat.map(d => ({ x: d.year, y: d.hospitalisations })) }]);
    else { const last3 = yrs.slice(-3), mm = D.national_monthly.filter(d => last3.includes(d.year)).sort((a, b) => a.year - b.year || a.month_number - b.month_number);
      lineChart("#q1c", [{ n: "Australia", c: PAL[0], pts: mm.map(d => ({ x: d.year + (d.month_number - 1) / 12, y: d.hospitalisations, l: `${d.month} ${d.year}` })) }], { xt: last3 }); }
  }
  seg("q1v", q1); q1("annual");

  /* ----- Q2 ----- */
  const sf = d3.select("#q2f"), st = d3.select("#q2t");
  [sf, st].forEach(s => s.selectAll("option").data(yrs).join("option").attr("value", d => d).text(d => d));
  sf.property("value", y0); st.property("value", y1);
  function q2() {
    const a = +sf.property("value"), b = +st.property("value");
    const rows = users.map(u => ({ k: u, v: ruVal(u, b) - ruVal(u, a) })).sort((p, q) => q.v - p.v);
    hbar("#q2c", rows, { vf: d3.format("+,") });
    d3.select("#q2s").text(`Between ${a} and ${b}, the largest increase was ${rows[0].k} (${d3.format("+,")(rows[0].v)}) and the largest decrease was ${rows.at(-1).k} (${d3.format("+,")(rows.at(-1).v)}).`);
  }
  sf.on("change", q2); st.on("change", q2); q2();

  /* ----- Q3 ----- */
  const ages = [...new Set(D.age_annual.map(d => d.age_group))].filter(a => a !== "Missing").sort((a, b) => parseInt(a) - parseInt(b));
  const ageVal = (a, y) => sumBy(D.age_annual, d => d.age_group === a && d.year === y, "hospitalisations");
  function q3(v) {
    const w = 800, m = { t: 6, r: 12, b: 28, l: 56 }, h = ages.length * 34 + m.t + m.b, s = sv("#q3h1", w, h);
    const x = d3.scaleBand(yrs, [m.l, w - m.r]).padding(0.05), y = d3.scaleBand(ages, [m.t, h - m.b]).padding(0.05);
    const cells = ages.flatMap(a => yrs.map(yr => { const c = ageVal(a, yr), b = ageVal(a, y0); return { a, yr, c, ch: b ? c / b - 1 : 0 }; }));
    const val = d => v === "count" ? d.c : d.ch, col = d3.scaleSequential(d3.interpolateRgb("#18224a", "#ffb000")).domain(d3.extent(cells, val));
    s.append("g").attr("class", "axis").attr("transform", `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickSize(0)).select(".domain").remove();
    s.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();
    s.selectAll("rect").data(cells).join("rect").attr("x", d => x(d.yr)).attr("y", d => y(d.a)).attr("width", x.bandwidth()).attr("height", y.bandwidth()).attr("rx", 3).attr("fill", d => col(val(d)))
      .on("mousemove", (e, d) => showTip(e, `<strong>${d.a}, ${d.yr}</strong><br>${fmt(d.c)} (${pct(d.ch)} vs ${y0})`)).on("mouseleave", hideTip);
  }
  seg("q3v", q3); q3("change");
  const sexes = [...new Set(D.sex_annual.map(d => d.sex))].filter(s => s !== "Missing");
  const sexS = sexes.map((s, i) => ({ n: s, c: PAL[i], pts: yrs.map(y => ({ x: y, y: sumBy(D.sex_annual, d => d.sex === s && d.year === y, "hospitalisations") })) }));
  legend("#q3l", sexS); lineChart("#q3c", sexS);
  const ch = ages.map(a => ({ a, g: ageVal(a, y1) / ageVal(a, y0) - 1 })).sort((p, q) => q.g - p.g)[0];
  const tot = d3.sum(sexS, s => s.pts.at(-1).y);
  d3.select("#q3s").text(`The age group with the biggest change since ${y0} is ${ch.a} (${pct(ch.g)}). In ${y1}, ${sexS[0].n} made up ${d3.format(".1%")(sexS[0].pts.at(-1).y / tot)} of cases. These are counts, so population size affects the gaps.`);

  /* ----- Q4 ----- */
  const states = [...new Set(D.state_annual.map(d => d.state))];
  function q4(v) {
    const key = v === "rate" ? "rate_per_100k" : "hospitalisations";
    const f = d3.select("#q4g").selectAll("figure").data(states).join(e => { const f = e.append("figure"); f.append("figcaption"); f.append("svg"); return f; });
    f.select("figcaption").text(d => d);
    f.select("svg").each(function (s) { lineChart(this, [{ n: s, c: PAL[3], pts: D.state_annual.filter(d => d.state === s).sort((a, b) => a.year - b.year).map(d => ({ x: d.year, y: d[key] })) }],
      { w: 260, h: 150, l: 44, r: 3, xt: [y0, y1], yf: d3.format(v === "rate" ? ".0f" : ".2s"), tf: d3.format(v === "rate" ? ".1f" : ",") }); });
    const top = D.state_annual.filter(d => d.year === y1).sort((a, b) => b[key] - a[key])[0];
    d3.select("#q4s").text(`In ${y1}, ${top.state} had the highest ${v === "rate" ? "rate per 100,000 people" : "count"}. Compare both views: large states lead on counts, but rates account for population size.`);
  }
  seg("q4v", q4); q4("count");

  /* ----- Q5 ----- */
  const groups = [...new Set(D.first_nation_annual.map(d => d.group))];
  const gv = (g, y) => sumBy(D.first_nation_annual, d => d.group === g && d.year === y, "hospitalisations");
  const idx = groups.map((g, i) => ({ n: g, c: PAL[i], pts: yrs.map(y => ({ x: y, y: gv(g, y) / gv(g, y0) * 100 })) }));
  legend("#q5l", idx); lineChart("#q5c", idx, { yf: d3.format(".0f"), tf: d3.format(".1f") });
  const rem = [...new Set(D.first_nations_remoteness.map(d => d.remoteness))];
  const rv = (g, r) => sumBy(D.first_nations_remoteness, d => d.group === g && d.remoteness === r && d.year === y1, "hospitalisations");
  const rows = rem.flatMap(r => groups.map((g, i) => ({ k: `${r} · ${g.split(" ")[0]}`, v: rv(g, r) / d3.sum(rem, q => rv(g, q)), c: PAL[i] })));
  hbar("#q5r", rows, { l: 200, vf: d3.format(".1%") });
  d3.select("#q5s").text(`Indexed to ${y0} = 100, ${idx.map(s => `${s.n} reached ${d3.format(".0f")(s.pts.at(-1).y)}`).join(" and ")} in ${y1}. The bars show where each group's ${y1} hospitalisations occurred.`);
}
