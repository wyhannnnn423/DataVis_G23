# Hero
<img width="800" height="393" alt="image" src="https://github.com/user-attachments/assets/42670f37-47b2-45da-b470-b8654399cb03" />

# Q1
<img width="800" height="393" alt="image" src="https://github.com/user-attachments/assets/5e88d15f-9afa-45e4-8d3f-e4a697953014" />

# Q2
<img width="800" height="392" alt="image" src="https://github.com/user-attachments/assets/e4df9565-8d02-4d8c-802b-5380c8a252c4" />

# Q3
<img width="800" height="394" alt="image" src="https://github.com/user-attachments/assets/23902c5f-8323-40e6-bac2-daef002f25a3" />

# Video
<img width="960" height="516" alt="image" src="https://github.com/user-attachments/assets/281cd1e5-fd4f-4c6f-a7df-de5cb9447493" />



# DataVis_G23

COS30045 Data Visualisation, Project (2026 S2), Group 23.
An interactive D3 data story investigating hospitalised road traffic injuries across Australia from 2011 to 2021.

Data source: Bureau of Infrastructure and Transport Research Economics (BITRE), Hospitalised Injury data
(https://www.bitre.gov.au/publications/ongoing/hospitalised-injury).

## Team

| Member | Role | Core Responsibilities |
|---|---|---|
| **Yan Han WONG** | Project Manager & Lead Developer | • Overall website structure, navigation, responsive layout, and integration of all 5 charts<br>• Vercel deployment configuration and continuous deployment setup<br>• D3 prototype development: Q1 national trend line chart<br>• Implementation of Chart Q2 (Road Users) and Chart Q3 (States & Territories)<br>• Pull request code reviews, git hygiene, and repository organisation |
| **Shan Kai LIU** | Data Engineer & D3 Developer | • In-depth inspection and schema mapping of BITRE raw datasets<br>• Building and documenting KNIME workflows for data extraction, filtering, and aggregation<br>• Exporting cleaned CSV data files to the `data/` directory<br>• Drafting data processing and governance sections for the Design Book<br>• Implementation of Chart Q5 (First Nations Peoples) in D3.js |
| **George Yong Han TAN** | UI/UX Designer & D3 Developer | • Wireframing and storyboarding for the page flow and all 5 charts<br>• Planning usability testing tasks and evaluating accessibility (WCAG compliance)<br>• UI visual polish, and progress interaction<br>• Implementation of Chart Q4 (Age, Sex & Road User) in D3.js based on wireframes |


## Repository Structure
```
DataVis_G23/
├── index.html # Main data story page (semantic HTML5, section per research question)
├── css/
│ └── style.css # Responsive styling, dark/light themes, animations, layout grids
├── js/
│ ├── main.js # Global page interactions (nav spy, scroll reveals, back-to-top)
│ ├── q1.js # Q1 National trend line/area chart (Owner: Yan Han)
│ ├── q2.js # Q2 Road users distribution & shifts (Owner: Yan Han)
│ ├── q3.js # Q3 States & territories geographic breakdown (Owner: Yan Han)
│ ├── q4.js # Q4 Age group, sex, and user type matrix (Owner: George)
│ └── q5.js # Q5 First Nations vs non-Indigenous comparison (Owner: Shan Kai)
├── data/
│ ├── q1_national_trend.csv # Cleaned yearly hospitalisation totals (2011–2021)
│ ├── q2_road_users.csv # Annual injury counts by road user category
│ ├── q3_states.csv # State and territory injury metrics
│ ├── q4_age_road_user.csv # Cross-tabulated age, sex, and user type figures
│ └── q5_first_nations.csv # Comparative metrics for Indigenous status
└── docs/ # Design Book assets, wireframes, and usability test protocols
```
---

## Research Questions & Chart Ownership

1. **Q1 · National Trend (Owner: Yan Han)**
   *How did non-fatal hospitalised road traffic injury counts change from 2011 to 2021, and how did the pattern in 2019–2021 compare with earlier years?*
   *Visualization:* Scroll-driven area + line chart with historical recording-break annotations (2012 VIC, 2017 NSW).

2. **Q2 · Road Users (Owner: Yan Han)**
   *Which road user groups contributed most to the change in national counts between two selected years, and how did their shares of all road traffic injuries change?*
   *Visualization:* Interactive dumbbell / slope chart with category breakdown controls.

3. **Q3 · States and Territories (Owner: Yan Han)**
   *How are hospitalised injury counts distributed across states and territories, and how has each jurisdiction’s share of the national total changed over time?*
   *Visualization:* Multi-series temporal chart / proportional representation illustrating state contributions.

4. **Q4 · Age and Sex (Owner: George)**
   *Which combinations of age group and road user type account for the largest numbers of hospitalised injuries at the national level, and how do these differ between males and females?*
   *Visualization:* Grouped comparison chart / heatmap matrix with sex filtering.

5. **Q5 · First Nations Peoples (Owner: Shan Kai)**
   *How does the composition of hospitalised injuries among First Nations people (by road user type and age group) compare with that of non-Indigenous people?*
   *Visualization:* 100% normalized stacked proportion visual comparing demographic structures.

---

## Deploy

The website is hosted live on Vercel. Continuous deployment is triggered automatically on every pull request merged into `main`.

---
## Team Workflow & Git Standards



- **Branching Strategy:** Do not commit directly to `main`. Create feature branches matching task ownership:
  - `feature/q1-line-chart`
  - `feature/q4-age-sex-chart`
  - `feature/ui-design-polish`
- **Pull Requests (PR):** Open a pull request targeting `main` upon completing a feature or milestone. Every PR requires at least one peer code review before merge.
- **Commit Conventions:** Use concise, semantic commit messages (e.g., `feat: ...`, `style: ...`, `fix: ...`, `docs: ...`).
- **Data Synchronization:** Always verify column names in cleaned CSV exports against the agreed specifications before committing to `data/`.

---

## Data Notes & Ethical Considerations

- **Absolute Counts:** Counts represent absolute hospitalised admissions and are not adjusted for population size. As documented by BITRE, absolute raw counts should not be used directly to evaluate or rank relative jurisdiction safety.
- **Series Breaks:** Significant administrative coding and recording changes occurred in Victoria from 2012 and New South Wales from 2017. Movements around these periods must be contextualised accurately in the narrative.
- **Suppressed Data:** For small cell counts in demographic subsets (particularly regarding Indigenous status), figures marked `n.p.` denote numbers that have been withheld for confidentiality.

---

# Website

Open with a local server (d3.csv cannot read files from a double-clicked page):

    python3 -m http.server 8000

then visit http://localhost:8000.


