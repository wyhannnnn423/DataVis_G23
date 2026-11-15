/* Q4 — readable age × road-user heatmap. Uses the original BITRE-derived CSV. */
(() => {
  const chart = d3.select('#q4-chart');
  const controls = d3.select('#q4-controls');
  if (chart.empty()) return;
  // Styles for the Q4 "Find your profile" widget live here so this feature only touches Q4 (no other file changes).
  const style = document.createElement('style');
  style.textContent = `
    .q4-find { margin-bottom: 18px; padding: 14px; border-radius: 14px; border: 1px solid rgba(255, 176, 32, .65); background: rgba(255, 176, 32, .10); }
    .q4-find h3 { margin-top: 0; }
    .q4-find-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .q4-find-seg { margin-bottom: 10px; }
    .q4-find-out { margin: 0; font-size: 15px; line-height: 1.5; }
    .q4-find-out small { font-size: 13px; opacity: .75; }
    .q4-tile .q4-cell { cursor: pointer; }
    .q4-tile.q4-hl .q4-cell { stroke: #ffb020; stroke-width: 5; filter: drop-shadow(0 0 6px #ffb020) drop-shadow(0 0 14px #ff8a00); animation: q4pulse 1.6s ease-in-out infinite; }
    @keyframes q4pulse { 50% { stroke-opacity: .65; } }
    @media (prefers-reduced-motion: reduce) { .q4-tile.q4-hl .q4-cell { animation: none; } }
  `;
  document.head.appendChild(style);
  const fmt = d3.format(',');
  chart.classed('placeholder', false).text('Loading age and road-user data…');

  d3.csv('data/q4_age_sex_road_user_by_year.csv', d3.autoType).then(data => {
    const rows = data.filter(d => Number.isFinite(d.year) && Number.isFinite(d.hospitalisations));
    if (!rows.length) throw Error('No valid Q4 rows');
    const years = [...new Set(rows.map(d => d.year))].sort((a,b) => a-b);
    const ages = [...new Set(rows.map(d => d.age_group))].filter(d => d !== 'Missing').sort((a,b) => parseInt(a,10)-parseInt(b,10));
    const sexValues = ['All', 'Male', 'Female'];
    const state = {year: years.at(-1), sex:'All'};
    const aside = d3.select('#q4 .insight');
    controls.html('');
    const yearLabel = controls.append('label').attr('class','ctl-group');
    yearLabel.append('span').attr('class','ctl-label').text('Choose year');
    const yearSelect = yearLabel.append('select').attr('class','ctl-select').attr('aria-label','Choose year');
    yearSelect.selectAll('option').data(years).join('option').attr('value',d=>d).text(d=>d);
    yearSelect.property('value',state.year).on('change',event=>{state.year=+event.target.value; render();});
    const sexGroup = controls.append('div').attr('class','ctl-group');
    sexGroup.append('span').attr('class','ctl-label').text('Compare sex');
    const seg = sexGroup.append('div').attr('class','seg').attr('role','group').attr('aria-label','Choose sex');
    seg.selectAll('button').data(sexValues).join('button').attr('type','button').text(d=>d)
      .on('click',(event,d)=>{state.sex=d;render();});

    chart.html('');
    const title = chart.append('p').attr('class','q4-subtitle');
    const help = chart.append('p').attr('class','q4-helper').text('Each square shows hospitalisations for one age group and road user type. A darker square means a higher count.');
    const svgHolder = chart.append('div').attr('class','q4-scroll');
    const legend = chart.append('div').attr('class','q4-legend');
    const note = chart.append('p').attr('class','chart-note q4-note').text('Shows the six highest-count road user types for the selected year (ranked across all sexes). Other types are not displayed. “Missing” age is excluded from the heatmap but included in the overall total. These are counts, not population-adjusted rates.');
    aside.html('<h3>How to read this</h3><p><strong>Across:</strong> age groups. <strong>Down:</strong> road user types. Each square shows the number of people hospitalised. Darker blue means more injuries.</p><h3>What it shows</h3><p id="q4-insight"></p><p id="q4-compare"></p><p class="chart-note">Use the Male and Female buttons to compare patterns. The colour scale stays the same for both, so the colours are comparable.</p>');

    // "Find your profile": pick an age group, road user and sex; the matching heatmap square glows and a short stat appears.
    const find = {user:null, age:null};
    const box = aside.insert('div', ':first-child').attr('class','q4-find');
    box.append('h3').text('Find your profile');
    const row = box.append('div').attr('class','q4-find-row');
    const ageSel = row.append('select').attr('class','ctl-select').attr('aria-label','Age group');
    ageSel.selectAll('option').data(ages).join('option').attr('value',d=>d).text(d=>'Age '+d);
    const userSel = row.append('select').attr('class','ctl-select').attr('aria-label','Road user type');
    const sexSeg = box.append('div').attr('class','seg q4-find-seg').attr('role','group').attr('aria-label','Choose sex for the profile');
    sexSeg.selectAll('button').data(sexValues).join('button').attr('type','button').text(d=>d).on('click',(event,d)=>{state.sex=d;render();});
    const findOut = box.append('p').attr('class','q4-find-out').attr('aria-live','polite');
    ageSel.on('change',event=>{find.age=event.target.value;render();});
    userSel.on('change',event=>{find.user=event.target.value;render();});

    function render() {
      seg.selectAll('button').attr('aria-pressed',d=>String(d===state.sex));
      const yearRows = rows.filter(d=>d.year===state.year);
      const filtered = yearRows.filter(d=>state.sex==='All' || d.sex===state.sex);
      const totalsByUser = d3.rollups(yearRows, v=>d3.sum(v,d=>d.hospitalisations),d=>d.road_user)
        .sort((a,b)=>b[1]-a[1]);
      const topUsers = totalsByUser.slice(0,6).map(d=>d[0]);
      const counts = d3.rollup(filtered,v=>d3.sum(v,d=>d.hospitalisations),d=>d.road_user,d=>d.age_group);
      const cells = topUsers.flatMap(user=>ages.map(age=>({user,age,value:counts.get(user)?.get(age)||0})));
      // Use a common maximum across Male and Female for the selected year, so switching sex does not change the legend.
      const sexMax = d3.max(yearRows.filter(d=>d.sex==='Male'||d.sex==='Female'), d=>d.hospitalisations) || 1;
      const allMax = d3.max(yearRows.filter(d=>topUsers.includes(d.road_user)),d=>d.hospitalisations) || 1;
      const allCells = d3.rollups(yearRows,v=>d3.sum(v,d=>d.hospitalisations),d=>d.road_user,d=>d.age_group).flatMap(([user,group])=>group.map(([age,n])=>({user,age,n})));
      const scaleMax = d3.max(allCells.filter(d=>topUsers.includes(d.user)),d=>d.n) || Math.max(sexMax,allMax);
      const color = d3.scaleSequentialSqrt([0,scaleMax],d3.interpolateBlues);
      const highest = [...cells].sort((a,b)=>b.value-a.value)[0];
      const total = d3.sum(filtered,d=>d.hospitalisations);
      title.text(`Hospitalised road injuries by age and road user — ${state.year} (${state.sex})`);
      d3.select('#q4-insight').text(`Highest combination: ${highest.user}, age ${highest.age} (${fmt(highest.value)} hospitalisations). Total for ${state.sex.toLowerCase()} records in ${state.year}: ${fmt(total)}.`);
      const sexTop = ['Male','Female'].map(sex=>{
        const s = yearRows.filter(d=>d.sex===sex && d.age_group!=='Missing' && topUsers.includes(d.road_user));
        const byPair = d3.rollups(s,v=>d3.sum(v,d=>d.hospitalisations),d=>d.road_user,d=>d.age_group)
          .flatMap(([user,groups])=>groups.map(([age,n])=>({user,age,n}))).sort((a,b)=>b.n-a.n);
        return {sex,peak:byPair[0]};
      });
      d3.select('#q4-compare').text(sexTop.map(d=>`${d.sex}: ${d.peak ? `${d.peak.user}, age ${d.peak.age} (${fmt(d.peak.n)})` : 'no records'}`).join('  •  '));
      const left=166, top=25, cw=77, ch=55, bottom=48, right=14;
      const width=left+ages.length*cw+right, height=top+topUsers.length*ch+bottom;
      const svg = svgHolder.html('').append('svg').attr('class','q4-svg').attr('viewBox',`0 0 ${width} ${height}`).attr('role','img').attr('aria-label',`Hospitalisation heatmap for ${state.year}, ${state.sex}`);
      const x=d3.scaleBand().domain(ages).range([left,left+ages.length*cw]).padding(.055);
      const y=d3.scaleBand().domain(topUsers).range([top,top+topUsers.length*ch]).padding(.075);
      svg.selectAll('.q4-rowlabel').data(topUsers).join('text').attr('class','q4-rowlabel').attr('x',left-10)
        .attr('y',d=>y(d)+y.bandwidth()/2).attr('text-anchor','end').attr('dominant-baseline','middle')
        .text(d=>d.length>23?d.slice(0,21)+'…':d).append('title').text(d=>d);
      svg.selectAll('.q4-col-label').data(ages).join('text').attr('class','q4-col-label').attr('x',d=>x(d)+x.bandwidth()/2)
        .attr('y',top+topUsers.length*ch+24).attr('text-anchor','middle').text(d=>d);
      const g=svg.selectAll('.q4-tile').data(cells).join('g').attr('class','q4-tile').attr('tabindex',0)
        .attr('role','img').attr('aria-label',d=>`${d.user}, age ${d.age}: ${fmt(d.value)} hospitalisations`);
      g.append('rect').attr('class','q4-cell').attr('x',d=>x(d.age)).attr('y',d=>y(d.user))
        .attr('width',x.bandwidth()).attr('height',y.bandwidth()).attr('rx',6).attr('fill',d=>color(d.value));
      g.append('text').attr('class','q4-count').attr('x',d=>x(d.age)+x.bandwidth()/2)
        .attr('y',d=>y(d.user)+y.bandwidth()/2).attr('text-anchor','middle').attr('dominant-baseline','middle')
        .attr('fill',d=>d.value/scaleMax>.31?'#fff':'#14283d').text(d=>fmt(d.value));
      g.append('title').text(d=>`${d.user}, age ${d.age}: ${fmt(d.value)} hospitalisations`);
      legend.html('');
      legend.append('span').text('Fewer injuries');
      legend.append('span').attr('class','q4-gradient');
      legend.append('span').text(`More injuries (up to ${fmt(scaleMax)})`);

      // Find-your-profile widget: keep the choices valid, show the stat, glow the matching square.
      if (!topUsers.includes(find.user)) find.user = topUsers[0];
      if (!ages.includes(find.age)) find.age = highest.age;
      userSel.selectAll('option').data(topUsers).join('option').attr('value',d=>d).text(d=>d);
      userSel.property('value',find.user); ageSel.property('value',find.age);
      sexSeg.selectAll('button').attr('aria-pressed',d=>String(d===state.sex));
      const pick = cells.find(c=>c.user===find.user && c.age===find.age);
      const userAll = d3.sum(yearRows.filter(d=>d.road_user===find.user),d=>d.hospitalisations);
      const rank = [...cells].sort((a,b)=>b.value-a.value).indexOf(pick)+1;
      const pct = userAll ? pick.value/userAll*100 : 0;
      const who = state.sex==='All' ? 'all sexes' : state.sex.toLowerCase()+'s';
      findOut.text('');
      if (pick.value) {
        findOut.append('strong').text(`${fmt(pick.value)} injuries`);
        findOut.append('span').text(` — ${pct<1 ? 'less than 1' : Math.round(pct)}% of all ${find.user.toLowerCase()} cases in ${state.year}`);
        findOut.append('br');
        findOut.append('small').text(`${who}, age ${find.age} · #${rank} of ${cells.length} squares`);
      } else findOut.text(`No records for ${who}, age ${find.age}, ${find.user.toLowerCase()} in ${state.year}.`);
      g.classed('q4-hl', d=>d.user===find.user && d.age===find.age).style('cursor','pointer')
        .on('click',(event,d)=>{find.user=d.user; find.age=d.age; render();});
      g.filter('.q4-hl').raise();
    }
    render();
  }).catch(err=>{
    chart.text('Question 4 data could not load. Open the website using Live Server and check the CSV path.');
    console.error('Q4 chart:',err);
  });
})();
