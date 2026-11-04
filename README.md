# DataVis_G23

COS30045 Data Visualisation, Project (2026 S2), Group 23.
An interactive D3 data story about hospitalised injuries from road crashes in Australia, 2011-2021.

Data source: Bureau of Infrastructure and Transport Research Economics (BITRE), Hospitalised Injury data
(https://www.bitre.gov.au/publications/ongoing/hospitalised-injury).

## Team

| Member | Main area |
|---|---|
| [YanHanWONG] (Project Manager) | D3 charts and interaction |
| [ShanKaiLIU] | Data processing (KNIME) and data section of the Design Book |
| [GeorgeYongHanTAN] | Design and delivery: wireframes, storyboard, usability testing, Vercel |

## Structure

```
index.html      page layout, one section per research question
css/style.css   styles
js/q1.js ...    one D3 file per research question 
data/           cleaned CSV files exported from KNIME
```

## Research questions

1. Q1 National trend
2. Q2 Road users
3. Q3 States and territories
4. Q4 Age, sex and road user
5. Q5 First Nations peoples

## Deploy

Hosted on Vercel. Import this repo in Vercel (Framework Preset: Other, no build command).
Every push to `main` redeploys.

## Team workflow

- Do not commit directly to `main`.
- One branch per task, for example `feature/q1-line-chart`.
- Open a pull request and ask a teammate to review before merging.
- Pull often, and write commit messages that say what changed.

## Data notes

- Counts are absolute numbers, not adjusted for population.
- Series breaks: Victoria from 2012, New South Wales from 2017 (see the BITRE Data Dictionary).


