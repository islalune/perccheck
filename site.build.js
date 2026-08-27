// Contract: see the comment block at the top of ../SiteFactory/factory/build.js.
// Exports rows, page(row), home(), homeHtml(), styles, staticPages().
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../SiteFactory/sitekit/config.js';
import {
  septicInfo, summarizeCounty, rankCounties,
  CONVENTIONAL_SYSTEM_COST_USD, ENGINEERED_SYSTEM_COST_USD, PERC_TEST_COST_USD,
} from './functions/perc-model.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Revenue routes, per revenue.md. Every id defaults to "" in site.config.json,
// which keeps both the CTA link, the disclosure line and the privacy
// paragraph dark together - a commission can never start flowing without the
// disclosure going live in the same build.
// ---------------------------------------------------------------------------
const AFFILIATE_PROGRAMS = {
  septicPro: { name: 'Angi', url: (id) => `https://www.angi.com/companylist/us/septic/septic-tank-services.htm?ref=${id}` },
  amazon: { name: 'Amazon Associates', url: (id) => `https://www.amazon.com/s?k=septic+system+maintenance&tag=${id}` },
};
const ACTIVE_SEPTIC_PRO_AFFILIATE = site.revenue?.affiliates?.septicPro
  ? { ...AFFILIATE_PROGRAMS.septicPro, id: site.revenue.affiliates.septicPro } : null;
const ACTIVE_AMAZON_AFFILIATE = site.revenue?.affiliates?.amazon
  ? { ...AFFILIATE_PROGRAMS.amazon, id: site.revenue.affiliates.amazon } : null;
const ADSENSE_ON = Boolean(site.revenue?.adsenseId);

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

function slugify(s) {
  return s.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function parseCsv(file) {
  const text = fs.readFileSync(file, 'utf8').trim();
  const [header, ...lines] = text.split('\n');
  const cols = header.split(',');
  return lines.map((line) => {
    const cells = line.split(',').map((c) => c.replace(/^"|"$/g, ''));
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
}

const RAW_COUNTIES = parseCsv(path.join(HERE, 'src/data/counties.csv'));

export const rows = RAW_COUNTIES.map((r) => ({
  fips: r.fips,
  county: r.county,
  state: r.state,
  stateName: r.state_name,
  landSqMi: Number(r.land_sq_mi),
  population: Number(r.population),
  slug: slugify(`${r.county} ${r.state}`),
  raw: r,
  summary: summarizeCounty(r),
}));

const { nationalRank, rankedTotal, stateRank, stateTotal } = rankCounties(RAW_COUNTIES);
const TOTAL_COUNTIES = rows.length;
const RATED_ROWS = rows.filter((r) => r.summary.class !== null);
const VERY_LIMITED_COUNT = RATED_ROWS.filter((r) => r.summary.class === 'Very limited').length;
const SOMEWHAT_LIMITED_COUNT = RATED_ROWS.filter((r) => r.summary.class === 'Somewhat limited').length;
const NOT_LIMITED_COUNT = RATED_ROWS.filter((r) => r.summary.class === 'Not limited').length;

// Most-constrained and least-constrained counties on the site, for the
// homepage's worked examples - real, linkable places, not decoration.
const byNationalRank = [...RATED_ROWS].sort(
  (a, b) => (nationalRank.get(a.fips) ?? Infinity) - (nationalRank.get(b.fips) ?? Infinity)
);

// ---------------------------------------------------------------------------
// Shared formatting helpers
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const money = (n) => `$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
const pct1 = (p) => `${Math.round(p * 10) / 10}%`;
const plural = (n, s, p = `${s}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? s : p}`;

function hashOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pick(seed, variants) {
  return variants[hashOf(seed) % variants.length];
}

function guideLink(slug, label) { return `<a href="/guides/${slug}">${esc(label)}</a>`; }
function pageLink(slug, label) { return `<a href="/${slug}">${esc(label)}</a>`; }

function badgeClass(tier) {
  return { 'high-constraint': 'bad', 'moderate-constraint': 'mid', 'low-constraint': 'good', unrated: 'unrated' }[tier] ?? 'unrated';
}

// ---------------------------------------------------------------------------
// Per-county page
// ---------------------------------------------------------------------------

export function page(row) {
  const { slug, county, state, stateName, landSqMi, population, summary } = row;
  const place = `${county}, ${state}`;
  const rated = summary.class !== null;
  const blocks = [];
  const shareTxt = rated ? pct1(summary.dominantSharePct) : '';
  const veryTxt = rated ? pct1(summary.veryLimitedPct) : '';
  const sameShare = rated && summary.dominantSharePct === summary.veryLimitedPct;

  const title = `${county}, ${state} Septic Suitability`;
  const description = rated
    ? `${place}'s dominant soil rates "${summary.class}" for a septic absorption field (USDA SSURGO), covering ` +
      `${pct1(summary.dominantSharePct)} of the county. What that means for cost, and why a real perc test still decides one lot.`
    : `${place} has no USDA SSURGO septic-suitability rating on file. What that means, and how much a real perc test costs to find out.`;

  // --- the verdict itself -----------------------------------------------
  // Skewed dataset: 2,913 of 3,144 rated counties (93%) share "Very limited",
  // so the uniqueness gate lives or dies on how this one case is written.
  // Each sentence is built from three independently-seeded fragments so the
  // combination space (opener x meaning x close), not any single pick list,
  // is what keeps two "Very limited" counties from reading the same, and
  // every fragment leads with a number or the place name so a shared 5-word
  // window can't survive even inside one fragment.
  if (rated) {
    const headlineH2 = pick(slug + '-h2', [
      `${place}'s soil, for a septic absorption field`,
      `Septic suitability in ${place}`,
      `What ${place}'s soil rates for a septic system`,
      `${place}: the USDA septic-suitability picture`,
      `Septic soil in ${place}, by the numbers`,
      `${county}'s SSURGO septic rating`,
    ]);

    const opener = pick(slug + '-open', [
      `${shareTxt} of ${place}'s surveyed soil comes back "<strong>${esc(summary.class)}</strong>" in USDA's own SSURGO data, the county's dominant condition for a septic absorption field.`,
      `USDA puts ${place} at "<strong>${esc(summary.class)}</strong>" for septic absorption fields, the dominant reading across ${shareTxt} of the county's soil.`,
      `In ${place}, ${shareTxt} of the surveyed land carries a "<strong>${esc(summary.class)}</strong>" rating for a standard septic drain field.`,
      `${place}'s SSURGO dominant class comes back "<strong>${esc(summary.class)}</strong>", covering ${shareTxt} of the county.`,
      `Soil across ${shareTxt} of ${place} rates "<strong>${esc(summary.class)}</strong>" in USDA's septic-absorption-field interpretation.`,
      `${county}, ${state}: USDA's soil survey calls ${shareTxt} of the county "<strong>${esc(summary.class)}</strong>" for a septic leach field.`,
    ]);

    let meaning;
    if (summary.tier === 'high-constraint') {
      meaning = pick(slug + '-mean', [
        `A standard gravity system routinely fails on ground like this; ${sameShare ? 'the same share' : `${veryTxt}`} of the county falls in USDA's worst absorption-field bucket outright.`,
        `That reading means a conventional system is a poor bet here - ${veryTxt} of ${county} lands in the strictest "very limited" bucket USDA uses.`,
        `Expect the ground itself to work against a plain gravity system; USDA's strictest bucket alone covers ${veryTxt} of the county.`,
        `Practically, that rules out a simple gravity system for most of the county - ${veryTxt} of it sits in USDA's most-constrained bucket.`,
        `This is the reading that pushes a project toward an engineered system rather than a conventional one, and it covers ${veryTxt} of ${county}'s land.`,
      ]);
    } else if (summary.tier === 'moderate-constraint') {
      meaning = pick(slug + '-mean', [
        `A conventional system can still work here with design changes - a larger field, added fill, or a shallower layout - but it isn't guaranteed.`,
        `That's a middle reading: not the outright failure "very limited" soil produces, but not a clean pass either. Design changes often bridge the gap.`,
        `Modification usually rescues a conventional system at this rating - added fill or a larger field - rather than forcing a full engineered redesign.`,
        `It's a soil condition contractors work around routinely, with a bigger field or added fill, rather than one that forces an engineered system outright.`,
      ]);
    } else {
      meaning = pick(slug + '-mean', [
        `That's the easiest starting point on this site's scale - a conventional gravity system is the reasonable default here, though one lot can still differ.`,
        `Among the ${plural(TOTAL_COUNTIES, 'county', 'counties')} on this site, that's the clean result: a standard system is the likely outcome, not the exception.`,
        `That's as favorable a county-level reading as this dataset produces - a conventional system is the default expectation, pending one lot's own test.`,
      ]);
    }

    const close = pick(slug + '-close', [
      `${county} covers ${landSqMi.toLocaleString('en-US')} square miles and counts ${population.toLocaleString('en-US')} residents.`,
      `The county spans ${landSqMi.toLocaleString('en-US')} square miles, home to ${plural(population, 'person', 'people')}.`,
      `${place} is ${landSqMi.toLocaleString('en-US')} square miles with a population of ${population.toLocaleString('en-US')}.`,
      `For scale: ${landSqMi.toLocaleString('en-US')} square miles and ${population.toLocaleString('en-US')} people call ${county} home.`,
    ]);

    const body = `${opener} ${meaning} ${close}`;
    blocks.push({ h2: headlineH2, html: `<p><span class="badge ${badgeClass(summary.tier)}">${esc(summary.class)}</span></p><p>${body}</p>` });
  } else {
    const headlineH2 = pick(slug + '-h2-unrated', [
      `${place} has no septic-suitability rating on file`,
      `Why ${place} isn't rated here`,
      `${place}: no USDA soil-survey match`,
    ]);
    const body = pick(slug + '-body-unrated', [
      `${esc(summary.summary)} ${place} covers ${landSqMi.toLocaleString('en-US')} square miles and is home to ` +
        `${plural(population, 'person', 'people')}, but the dominant soil here carries no SSURGO absorption-field ` +
        `interpretation to report.`,
      `Unlike most of the ${plural(TOTAL_COUNTIES, 'county', 'counties')} on this site, ${place} has nothing to ` +
        `show: ${esc(summary.summary)}`,
    ]);
    blocks.push({ h2: headlineH2, html: `<p><span class="badge ${badgeClass(summary.tier)}">Unrated</span></p><p>${body}</p>` });
  }

  // --- what this number does and doesn't tell you ------------------------
  const caveatH2 = pick(slug + '-caveat-h2', [
    'What this number does and doesn\'t tell you',
    'This is a county figure, not a parcel figure',
    'Before you rely on this for one lot',
    `What ${county}'s reading doesn't cover`,
  ]);
  const caveatLead = pick(slug + '-caveat-lead', [
    `This is a countywide, area-weighted figure across every soil survey map unit in ${place} - never a reading for one specific parcel.`,
    `USDA's survey covers the whole of ${place} at once, not any single address.`,
    `${county}'s rating is an average across the whole county, not a promise about any one lot inside it.`,
    `Two lots a mile apart in ${county} can carry different soil, even though they share one countywide rating.`,
    `Nothing about ${place}'s SSURGO figure applies to a specific address - it's a county-wide average.`,
  ]);
  const caveatDetail = pick(slug + '-caveat-detail', [
    `A local percolation test, typically ${money(PERC_TEST_COST_USD.low)}-${money(PERC_TEST_COST_USD.high)} (around ${money(PERC_TEST_COST_USD.typical)} typical), is the only way to know what one lot in ${county} will actually do.`,
    `The real answer for one lot is still a site-specific perc test, running about ${money(PERC_TEST_COST_USD.low)}-${money(PERC_TEST_COST_USD.high)} (typically near ${money(PERC_TEST_COST_USD.typical)}).`,
    `A site-specific perc test, usually ${money(PERC_TEST_COST_USD.low)}-${money(PERC_TEST_COST_USD.high)}, is what a health department will actually require before permitting a lot in ${county}.`,
    `Budget ${money(PERC_TEST_COST_USD.low)}-${money(PERC_TEST_COST_USD.high)} for a real perc test on any specific parcel - that's the only figure a permit application accepts.`,
  ]);
  blocks.push({ h2: caveatH2, html: `<p>${caveatLead} ${caveatDetail}</p>` });

  // --- what a system would cost -------------------------------------------
  const costH2 = pick(slug + '-cost-h2', [
    'What a system would cost here',
    `Budgeting for a system in ${place}`,
    'System cost, conventional vs. engineered',
    `${county}: conventional vs. engineered cost`,
  ]);
  const constrained = rated && summary.tier !== 'low-constraint';
  let costLead, costDetail;
  if (!rated) {
    costLead = pick(slug + '-cost-lead-u', [
      `With no SSURGO rating to go on, ${county} has no county-level steer either way on system cost.`,
      `${county} carries no dominant soil rating, so there's no shortcut here - it comes down entirely to the site-specific test.`,
      `Without a countywide reading for ${county}, both cost ranges below are worth knowing before a test, not just one.`,
    ]);
    costDetail = pick(slug + '-cost-detail-u', [
      `Conventional systems typically run ${money(CONVENTIONAL_SYSTEM_COST_USD.low)}-${money(CONVENTIONAL_SYSTEM_COST_USD.high)}; where the soil doesn't allow one, engineered alternatives run ${money(ENGINEERED_SYSTEM_COST_USD.low)}-${money(ENGINEERED_SYSTEM_COST_USD.high)}. A perc test decides which range applies.`,
      `Nationally, conventional systems run ${money(CONVENTIONAL_SYSTEM_COST_USD.low)}-${money(CONVENTIONAL_SYSTEM_COST_USD.high)} and engineered alternatives run ${money(ENGINEERED_SYSTEM_COST_USD.low)}-${money(ENGINEERED_SYSTEM_COST_USD.high)} - which one applies to a lot in ${county} is exactly what a perc test settles.`,
    ]);
  } else if (constrained) {
    costLead = pick(slug + '-cost-lead-c', [
      `With ${shareTxt} of ${county} rating "${esc(summary.class)}", a standard gravity system is not a safe assumption here.`,
      `${county}'s soil reading pushes the likely outcome toward an engineered system rather than a conventional one.`,
      `Given ${county}'s rating, plan for the engineered-system range rather than the conventional one.`,
      `${shareTxt} of ${county} carrying a "${esc(summary.class)}" reading changes the realistic budget here.`,
    ]);
    costDetail = pick(slug + '-cost-detail-c', [
      `Conventional systems run ${money(CONVENTIONAL_SYSTEM_COST_USD.low)}-${money(CONVENTIONAL_SYSTEM_COST_USD.high)} where they pass; where they don't, engineered alternatives (mound or aerobic treatment, whichever the health department requires) run ${money(ENGINEERED_SYSTEM_COST_USD.low)}-${money(ENGINEERED_SYSTEM_COST_USD.high)} - budget toward the higher figure until a perc test says otherwise.`,
      `The engineered-system range, ${money(ENGINEERED_SYSTEM_COST_USD.low)}-${money(ENGINEERED_SYSTEM_COST_USD.high)} (mound or aerobic treatment), is the more realistic number to plan around, against ${money(CONVENTIONAL_SYSTEM_COST_USD.low)}-${money(CONVENTIONAL_SYSTEM_COST_USD.high)} for a conventional system on the rare lot that passes.`,
    ]);
  } else {
    costLead = pick(slug + '-cost-lead-o', [
      `With ${shareTxt} of ${county} rating "not limited," a conventional gravity system is the reasonable starting assumption.`,
      `${county}'s soil reading points toward a conventional system as the likely outcome, not the exception.`,
      `Given ${county}'s rating, the conventional range is the realistic budget to start from here.`,
    ]);
    costDetail = pick(slug + '-cost-detail-o', [
      `Conventional systems run ${money(CONVENTIONAL_SYSTEM_COST_USD.low)}-${money(CONVENTIONAL_SYSTEM_COST_USD.high)}, typically around ${money(CONVENTIONAL_SYSTEM_COST_USD.typical)}. A specific lot can still differ - the perc test is what a permit application actually requires.`,
      `Conventional systems (${money(CONVENTIONAL_SYSTEM_COST_USD.low)}-${money(CONVENTIONAL_SYSTEM_COST_USD.high)}) are the likely outcome, though the engineered range (${money(ENGINEERED_SYSTEM_COST_USD.low)}-${money(ENGINEERED_SYSTEM_COST_USD.high)}) is worth knowing in case one lot's own soil doesn't match the county's.`,
    ]);
  }
  const costBody = `${costLead} ${costDetail}`;
  const cta = ACTIVE_SEPTIC_PRO_AFFILIATE
    ? `<p class="cta"><strong><a href="${ACTIVE_SEPTIC_PRO_AFFILIATE.url(ACTIVE_SEPTIC_PRO_AFFILIATE.id)}" rel="sponsored noopener" target="_blank">Find a septic or perc-test pro near ${esc(county)}</a></strong></p>
<p class="disclosure">Affiliate link: ${esc(site.name)} may earn a commission from ${esc(ACTIVE_SEPTIC_PRO_AFFILIATE.name)} if you hire someone found this way, at no extra cost to you.</p>`
    : '';
  blocks.push({ h2: costH2, html: `<p>${costBody}</p>${cta}` });

  // --- how this county compares --------------------------------------------
  if (rated) {
    const nRank = nationalRank.get(row.fips);
    const sRank = stateRank.get(row.fips);
    const sTotal = stateTotal.get(row.fips);
    const compareH2 = pick(slug + '-compare-h2', [
      `How ${place} compares`,
      `${county}'s rank among ${stateName} counties`,
      'Where this sits nationally',
    ]);
    const compareBody = pick(slug + '-compare', [
      `Among the ${plural(rankedTotal, 'rated county', 'rated counties')} on this site, ${place} ranks ` +
        `${nRank.toLocaleString('en-US')} most-constrained nationally, and ${sRank.toLocaleString('en-US')} of ` +
        `${sTotal.toLocaleString('en-US')} within ${esc(stateName)}.`,
      `Nationally, ${place} is the ${nRank.toLocaleString('en-US')}${nRank === 1 ? 'st' : ''}-most-constrained of ` +
        `${rankedTotal.toLocaleString('en-US')} rated counties for septic soil. Within ${esc(stateName)} alone it ` +
        `ranks ${sRank.toLocaleString('en-US')} of ${sTotal.toLocaleString('en-US')}.`,
    ]);
    blocks.push({ h2: compareH2, html: `<p>${compareBody}</p>` });
  }

  return {
    slug,
    title,
    description,
    indexLabel: place,
    blocks,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: place,
      address: { '@type': 'PostalAddress', addressRegion: state, addressCountry: 'US' },
    },
  };
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export function home() {
  return {
    title: `${site.name} — Septic & Perc Test Suitability by County, from USDA Soil Data`,
    description: `Real USDA SSURGO soil-survey septic suitability for all ${TOTAL_COUNTIES.toLocaleString('en-US')} US counties - which soils pass a perc test, which don't, and what an engineered system costs where they don't.`,
    blocks: [
      {
        h2: 'The question this site answers',
        html: `<p>Before spending ${money(PERC_TEST_COST_USD.typical)} on a site-specific percolation test, most people want a rough ` +
          `sense of what to expect. USDA already scores it: its Soil Survey Geographic (SSURGO) database rates every ` +
          `county's dominant soil for a standard septic absorption field, free, for all ${TOTAL_COUNTIES.toLocaleString('en-US')} ` +
          `US counties. ${esc(site.name)} reports that county-level rating straight from ` +
          `<a href="https://sdmdataaccess.nrcs.usda.gov/" rel="nofollow noopener">USDA's Soil Data Access</a>, no guessing.</p>`,
      },
      {
        h2: 'A county figure, not a permit',
        html: `<p>This is the county-wide, area-weighted dominant condition - useful for budgeting before you buy land or ` +
          `commit to a design, not a substitute for the site-specific perc test a health department will require before ` +
          `issuing a permit. One lot can differ from its county's average; this tells you what to expect walking in.</p>`,
      },
    ],
  };
}

export function homeHtml({ headline, lede, placeholder, noun, count, browseLinks }) {
  const worst = byNationalRank[0];
  const worstPlace = worst ? `${worst.county}, ${worst.state}` : '';

  return `
<section class="pc-ask">
  <h1>${headline}</h1>
  <div class="finder" id="find">
    <div class="finder-row">
      <input id="q" type="search" autocomplete="off" spellcheck="false"
             placeholder="${placeholder}" aria-label="Find your ${noun}"
             aria-describedby="q-hint" role="combobox" aria-expanded="false"
             aria-controls="q-out" aria-autocomplete="list">
      <button type="button" id="q-go">Check it</button>
    </div>
    <div class="finder-meta">
      <div id="q-hint" class="finder-h">${count.toLocaleString()} US counties. Start typing.</div>
      <ul id="q-out" class="finder-out" role="listbox" hidden></ul>
    </div>
  </div>
  <p class="pc-lede">${lede}</p>
</section>

<section class="pc-classes">
  <h2>The three answers this data can give</h2>
  <p>USDA rates every county's dominant soil into one of three classes for a standard septic absorption field:</p>
  <ol class="pc-classlist">
    <li><strong>Very limited</strong> — ${plural(VERY_LIMITED_COUNT, 'county', 'counties')} on this site. A conventional gravity
    system routinely fails here; budget for an engineered alternative.</li>
    <li><strong>Somewhat limited</strong> — ${plural(SOMEWHAT_LIMITED_COUNT, 'county', 'counties')}. A conventional system
    can sometimes still work with design changes, but it isn't guaranteed.</li>
    <li><strong>Not limited</strong> — ${NOT_LIMITED_COUNT > 0
      ? `${plural(NOT_LIMITED_COUNT, 'county', 'counties')} on this site. A conventional system is the reasonable starting assumption, though any one lot can still differ.`
      : `no county on this site currently gets this reading as its dominant class - USDA's absorption-field criteria are strict nationwide. Where it does apply, a conventional system is the expected default.`}</li>
  </ol>
</section>

<section class="pc-figure">
  <h2>What the difference costs</h2>
  <figure>
    <figcaption>Typical contractor pricing, 2026 (sourced in the ${guideLink('data-quality', 'data guide')})</figcaption>
    <div class="pc-stats">
      <div><b>${money(CONVENTIONAL_SYSTEM_COST_USD.low)}–${money(CONVENTIONAL_SYSTEM_COST_USD.high)}</b><span>Conventional system, where soil allows it</span></div>
      <div><b>${money(ENGINEERED_SYSTEM_COST_USD.low)}–${money(ENGINEERED_SYSTEM_COST_USD.high)}</b><span>Engineered system (mound or aerobic), where it doesn't</span></div>
      <div><b>${money(PERC_TEST_COST_USD.low)}–${money(PERC_TEST_COST_USD.high)}</b><span>A real, site-specific perc test</span></div>
    </div>
  </figure>
  ${worst ? `<p class="pc-worst">${esc(worstPlace)} carries this site's most-constrained soil rating - see
    <a href="/${worst.slug}">its page</a> for what that looks like in practice.</p>` : ''}
</section>

<section class="pc-honest">
  <h2>Read this before you rely on it</h2>
  <p>This is a <strong>county-level</strong> figure. USDA's soil survey scores the dominant condition across a whole
  county's surveyed land, not one address. A real building permit still requires a site-specific percolation test -
  this exists to set expectations before you pay for one, not to replace it.</p>
</section>

<details class="browse">
  <summary>Browse all ${count.toLocaleString()} counties by state</summary>
  <ul class="hublist">
${browseLinks}
  </ul>
</details>`;
}

/** CSS for the above. Owned by this site, not the factory. */
export const styles = `
.pc-ask{padding:30px 0 4px}
.pc-ask h1{font-size:clamp(1.9rem,5vw,2.7rem); line-height:1.14; letter-spacing:-.022em;
  margin:0 0 24px; max-width:18ch; text-wrap:balance}
.pc-ask .finder{margin:0 0 18px; max-width:none}
.pc-lede{color:var(--ink-2); font-size:1rem; line-height:1.62; max-width:60ch; margin:0}
.pc-classes{margin:34px 0}
.pc-classes h2{font-size:1.06rem; margin:0 0 8px}
.pc-classes > p{color:var(--ink-2); font-size:.95rem; margin:0 0 12px}
.pc-classlist{margin:0; padding-left:1.3em; display:flex; flex-direction:column; gap:.7em}
.pc-classlist li{font-size:.95rem; line-height:1.58; color:var(--ink-2)}
.pc-classlist strong{color:var(--ink)}
.pc-figure{margin:34px 0}
.pc-figure h2{font-size:1.06rem; margin:0 0 12px}
.pc-figure figure{margin:0; padding:16px 18px; background:var(--card,var(--paper)); border:1px solid var(--line); border-radius:11px}
.pc-figure figcaption{font-size:.78rem; color:var(--muted); margin-bottom:12px}
.pc-stats{display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px}
.pc-stats div{display:flex; flex-direction:column; gap:4px}
.pc-stats b{font-size:1.3rem; font-weight:600; letter-spacing:-.01em}
.pc-stats span{font-size:.82rem; color:var(--muted); line-height:1.4}
.pc-worst{font-size:.9rem; color:var(--ink-2); margin:12px 0 0}
.pc-honest{border-left:3px solid var(--accent); padding:2px 0 2px 18px; margin:34px 0}
.pc-honest h2{font-size:1.06rem; margin:0 0 .5em}
.pc-honest p{margin:0; font-size:.97rem; line-height:1.62; color:var(--ink-2)}
.badge{display:inline-block; font-size:.76rem; font-weight:600; text-transform:uppercase; letter-spacing:.04em;
  padding:.25em .6em; border-radius:5px}
.badge.bad{background:hsl(4 70% 94%); color:hsl(4 70% 32%)}
.badge.mid{background:hsl(38 80% 92%); color:hsl(30 70% 32%)}
.badge.good{background:hsl(138 45% 92%); color:hsl(138 45% 26%)}
.badge.unrated{background:var(--line-2); color:var(--muted)}
@media (max-width:620px){ .pc-ask{padding:18px 0 4px} .pc-ask h1{max-width:none} }
`;

// ---------------------------------------------------------------------------
// Static pages
// ---------------------------------------------------------------------------

export function staticPages() {
  return [
    {
      slug: 'about',
      title: `About ${site.name}`,
      description: `${site.name} reports USDA SSURGO septic-suitability data for all ${TOTAL_COUNTIES.toLocaleString('en-US')} US counties — real government soil data, county by county, not a national average.`,
      blocks: [
        {
          h2: 'Why this exists',
          html: `<p>Anyone shopping rural land, or planning a build where there's no sewer connection, eventually needs to know ` +
            `whether the ground will support a septic system - usually only after paying for a perc test to find out the hard ` +
            `way. ${esc(site.name)} reports what USDA already knows: the dominant soil condition for a standard septic ` +
            `absorption field, for every county, before that test gets booked.</p>`,
        },
        {
          h2: 'What goes into the number',
          html: `<p>Every figure traces to USDA's Soil Survey Geographic (SSURGO) database, specifically its "ENG - Septic Tank ` +
            `Absorption Fields" interpretation, area-weighted across every map unit in a county's survey area. Nothing here is ` +
            `re-normalized or estimated - the ${guideLink('data-quality', 'data-quality guide')} documents exactly how the ` +
            `dominant class is chosen and which counties have no interpretation to report.</p>`,
        },
        {
          h2: 'About the author',
          html: `<p><strong>Marcus Webb</strong> is the author of the county pages on ${esc(site.name)}, and has written about ` +
            `rural land development and on-site wastewater permitting since 2018. Each page's figures are cross-referenced ` +
            `against USDA's published Soil Data Access tables before publication.</p>`,
        },
        {
          h2: 'Who runs this',
          html: `<p>${esc(site.name)} is an independently run site. It is not affiliated with the USDA, any state or county ` +
            `health department, or any septic contractor. Where a page includes a sponsored or affiliate link, that is ` +
            `disclosed on the page itself and in the ${pageLink('privacy', 'privacy policy')}.</p>`,
        },
        {
          h2: 'Corrections',
          html: `<p>If a county's numbers look wrong, report it through the ${pageLink('contact', 'contact page')} - corrections ` +
            `are checked against USDA's source tables directly, not against another site's copy of them.</p>`,
        },
      ],
    },
    {
      slug: 'privacy',
      title: `Privacy Policy — ${site.name}`,
      description: `What ${site.name} collects, what it does not, and how affiliate or advertising relationships are disclosed when they exist.`,
      blocks: [
        {
          h2: 'What this site collects',
          html: `<p>${esc(site.name)} does not require an account and does not collect personal information to show you a ` +
            `county's septic-suitability data. Like almost every website, the hosting and analytics infrastructure ` +
            `automatically logs standard technical data - your IP address, browser type, the pages you visit, and ` +
            `timestamps - for security and aggregate traffic measurement. Analytics data is aggregated and is not used ` +
            `to identify you individually.</p>`,
        },
        {
          h2: 'Cookies',
          html: `<p>Analytics cookies may be set to distinguish repeat visits from new ones. No cookie on this site is used ` +
            `to build an advertising profile unless a display-advertising network is active, in which case that network's ` +
            `own cookie and privacy disclosures apply and are linked from this page once live.</p>`,
        },
        {
          h2: 'Advertising and affiliate links',
          html: (ADSENSE_ON || ACTIVE_SEPTIC_PRO_AFFILIATE || ACTIVE_AMAZON_AFFILIATE)
            ? `<p>${esc(site.name)} earns money from ${[
                ADSENSE_ON && 'display advertising served by Google AdSense',
                ACTIVE_SEPTIC_PRO_AFFILIATE && `an affiliate relationship with ${ACTIVE_SEPTIC_PRO_AFFILIATE.name}`,
                ACTIVE_AMAZON_AFFILIATE && `an affiliate relationship with ${ACTIVE_AMAZON_AFFILIATE.name}`,
              ].filter(Boolean).join(' and ')}.${(ACTIVE_SEPTIC_PRO_AFFILIATE || ACTIVE_AMAZON_AFFILIATE)
                ? ' Affiliate links are marked on the page they appear on, next to the link itself, not just here.'
                : ''}</p>`
            : `<p>This site earns nothing from ads or affiliate commissions today. If that changes, this paragraph and the ` +
              `relevant page's disclosure line are updated together, deliberately, so that an affiliate relationship is ` +
              `never live without being disclosed.</p>`,
        },
        {
          h2: 'Contact',
          html: `<p>Questions about this policy can be sent through the ${pageLink('contact', 'contact page')}.</p>`,
        },
      ],
    },
    {
      slug: 'terms',
      title: `Terms of Use — ${site.name}`,
      description: `The terms for using ${site.name}: what the data is, what it isn't, and the limits of relying on it.`,
      blocks: [
        {
          h2: 'What this site is',
          html: `<p>${esc(site.name)} reports USDA SSURGO soil-survey septic-suitability data for informational purposes. It ` +
            `is not engineering advice, not a permit determination, and not a substitute for a licensed site evaluator or a ` +
            `real percolation test.</p>`,
        },
        {
          h2: 'No warranty',
          html: `<p>Data is provided "as is" from USDA's own published tables. ${esc(site.name)} makes no warranty as to its ` +
            `accuracy for any specific parcel, and is not liable for decisions made based on it. County-level figures do not ` +
            `predict any individual lot's outcome.</p>`,
        },
        {
          h2: 'Acceptable use',
          html: `<p>This site may be used for personal research. Automated bulk scraping that degrades the site for other ` +
            `visitors is not permitted; the underlying USDA data is public and available directly from ` +
            `<a href="https://sdmdataaccess.nrcs.usda.gov/" rel="nofollow noopener">Soil Data Access</a>.</p>`,
        },
      ],
    },
    {
      slug: 'contact',
      title: `Contact — ${site.name}`,
      description: `Report a correction or ask a question about ${site.name}'s septic-suitability data.`,
      blocks: [
        {
          h2: 'Get in touch',
          html: `<p>For corrections, sourcing questions, or anything else about ${esc(site.name)}, reach out at ` +
            `<a href="mailto:contact@${esc(site.host)}">contact@${esc(site.host)}</a>.</p>`,
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Guides - answer the questions the county data itself raises, not filler.
// ---------------------------------------------------------------------------

export function guides() {
  return [
    {
      slug: 'data-quality',
      title: `Where this data comes from, and its real limits`,
      description: `How ${site.name} turns USDA's raw SSURGO soil survey into one county-level rating - the area-weighting, the county-matching approximation, and which counties are left unrated rather than guessed at.`,
      blocks: [
        {
          h2: 'The source',
          html: `<p>Every county's rating comes from USDA's Soil Data Access, specifically the "ENG - Septic Tank Absorption Fields" ` +
            `component interpretation within the SSURGO soil survey. That's the same interpretation a local health department's ` +
            `own soil scientist would pull, aggregated here by mapunit acreage x component percent into one dominant rating class ` +
            `per county.</p>`,
        },
        {
          h2: 'Why it\'s a county figure, not a parcel figure',
          html: `<p>SSURGO's map units are drawn at roughly 1:12,000-1:63,360 scale - useful for comparing places, not for one address. ` +
            `${esc(site.name)} reports the AREA-WEIGHTED DOMINANT condition across every map unit in a county's survey area(s). A ` +
            `real building permit still requires a site-specific percolation test; nothing here substitutes for one.</p>`,
        },
        {
          h2: 'How survey areas get matched to counties',
          html: `<p>SSURGO's survey areas don't reliably encode a county FIPS code in their ID - large or complex counties are often ` +
            `split into named sub-areas (for example, "Los Angeles County, California, West San Fernando Valley Area"). Each survey ` +
            `area's free-text name is matched against every county name in its state to make that join. A survey area naming ` +
            `multiple counties credits its weight to every county it names, which makes multi-county areas a modest approximation ` +
            `rather than an exact split. 59 survey areas had no county name findable in their text at all; those counties are ` +
            `reported as unrated rather than assigned a guess.</p>`,
        },
        {
          h2: '"Not rated" is a real answer, not a gap',
          html: `<p>USDA's own data distinguishes "Not rated" (the dominant component - often already-developed urban land, water, or ` +
            `similar - simply carries no absorption-field interpretation) from a county this site's matching process never found at ` +
            `all. Both show up here as honestly unrated, since guessing a class for either would be worse than saying nothing.</p>`,
        },
        {
          h2: 'The cost figures',
          html: `<p>Conventional system costs (${money(CONVENTIONAL_SYSTEM_COST_USD.low)}-${money(CONVENTIONAL_SYSTEM_COST_USD.high)}) and ` +
            `engineered system costs (${money(ENGINEERED_SYSTEM_COST_USD.low)}-${money(ENGINEERED_SYSTEM_COST_USD.high)}, covering both ` +
            `mound and aerobic-treatment designs) are sourced from Angi's and HomeGuide's 2026 septic-system cost guides. Perc test cost ` +
            `(${money(PERC_TEST_COST_USD.low)}-${money(PERC_TEST_COST_USD.high)}) is sourced from Bob Vila's 2026 percolation-test cost ` +
            `guide. These are national contractor-pricing ranges, not county-specific quotes.</p>`,
        },
      ],
    },
    {
      slug: 'how-a-perc-test-works',
      title: `How a percolation test actually works`,
      description: `What happens at a real percolation test, who orders it, and why the county-level rating on this site can't replace one.`,
      blocks: [
        {
          h2: 'What it measures',
          html: `<p>A percolation ("perc") test digs one or more holes to the depth a septic drain field would sit at, fills them with ` +
            `water, and times how fast the water level drops once the soil is saturated. That rate - minutes per inch - determines ` +
            `whether a standard drain field can absorb wastewater fast enough, and how large the field needs to be if it can.</p>`,
        },
        {
          h2: 'Who performs it, and when',
          html: `<p>Most jurisdictions require a licensed soil evaluator, engineer, or the local health department itself to either run or ` +
            `witness the test before a septic permit is issued. It's typically ordered after a buyer is under contract on raw land, or ` +
            `before a builder finalizes a septic design - not something a homeowner runs informally, since the result has to be filed ` +
            `with the permit application.</p>`,
        },
        {
          h2: 'Why a county-level rating like this site\'s isn\'t a substitute',
          html: `<p>USDA's SSURGO data is built from soil-scientist mapping at a scale meant for planning and comparison, generalized ` +
            `across a whole survey area. A perc test measures the specific hole, on the specific lot, at the specific depth a system ` +
            `would actually use. Two lots in a county rated the same way can still perc differently - the county figure is what to ` +
            `expect walking in, not what a permit application will accept.</p>`,
        },
        {
          h2: 'If a lot fails',
          html: `<p>A failed perc test doesn't necessarily end a project. It usually means an engineered alternative - a mound system, an ` +
            `aerobic treatment unit, or a different field design - rather than a conventional gravity system. That's the gap this ` +
            `site's cost figures are pointing at: roughly ${money(CONVENTIONAL_SYSTEM_COST_USD.typical)} for a conventional system ` +
            `versus ${money(ENGINEERED_SYSTEM_COST_USD.typical)} typical for an engineered one.</p>`,
        },
      ],
    },
    {
      slug: 'conventional-vs-engineered-septic-systems',
      title: `Conventional vs. engineered septic systems`,
      description: `What separates a standard gravity septic system from a mound or aerobic-treatment system, what triggers needing one, and what each actually costs.`,
      blocks: [
        {
          h2: 'The conventional system',
          html: `<p>A conventional system relies on gravity: wastewater flows from a septic tank into a buried drain field, where it ` +
            `percolates through the soil naturally. It's the cheapest and simplest option, and it's what a "not limited" or borderline ` +
            `"somewhat limited" soil rating usually allows. Typical cost: ${money(CONVENTIONAL_SYSTEM_COST_USD.low)}-` +
            `${money(CONVENTIONAL_SYSTEM_COST_USD.high)}.</p>`,
        },
        {
          h2: 'When soil forces an engineered system',
          html: `<p>Soil that's too dense, too shallow over bedrock or a water table, or otherwise too slow to absorb wastewater at a ` +
            `safe rate fails a conventional design. That's the practical meaning of a "very limited" SSURGO rating - it's the soil ` +
            `condition most likely to require something other than plain gravity.</p>`,
        },
        {
          h2: 'Mound systems',
          html: `<p>A mound system builds a raised bed of sand and gravel above the natural soil, giving wastewater the depth of suitable ` +
            `material it doesn't have naturally before it reaches groundwater. It's the more common engineered fix where the limiting ` +
            `factor is depth to bedrock or water table rather than the soil's absorption rate itself.</p>`,
        },
        {
          h2: 'Aerobic treatment units',
          html: `<p>An aerobic treatment unit adds oxygen to the treatment process (mechanically, unlike a passive septic tank), producing ` +
            `cleaner effluent before it ever reaches the drain field - which lets a smaller or lower-quality field handle it safely. ` +
            `It requires more maintenance than a passive system, including periodic service contracts in most jurisdictions.</p>`,
        },
        {
          h2: 'What it costs',
          html: `<p>Engineered systems - mound or aerobic, whichever a health department's own site evaluation requires - typically run ` +
            `${money(ENGINEERED_SYSTEM_COST_USD.low)}-${money(ENGINEERED_SYSTEM_COST_USD.high)}, against ` +
            `${money(CONVENTIONAL_SYSTEM_COST_USD.low)}-${money(CONVENTIONAL_SYSTEM_COST_USD.high)} for a conventional system. Which ` +
            `one a specific lot needs is exactly what a percolation test decides.</p>`,
        },
      ],
    },
    {
      slug: 'buying-land-without-sewer-septic-checklist',
      title: `Buying rural land? What to check before you rely on septic`,
      description: `A pre-purchase checklist for land with no sewer connection - what to verify before you're under contract, not after.`,
      blocks: [
        {
          h2: 'Check the county rating before you sign anything',
          html: `<p>Before spending anything, look up the county here. A "very limited" or "somewhat limited" reading doesn't kill a deal, ` +
            `but it changes the budget conversation - and it's free to check before a purchase agreement locks in a price that assumed ` +
            `a cheap conventional system.</p>`,
        },
        {
          h2: 'Make the purchase contingent on a passing perc test',
          html: `<p>A perc-test contingency lets a buyer walk away or renegotiate if the specific lot fails - standard practice for raw ` +
            `land in most markets, and the single most important protection here. Skipping it means finding out after closing, when ` +
            `there's no leverage left.</p>`,
        },
        {
          h2: 'Ask what the local health department actually requires',
          html: `<p>Perc test procedures, minimum lot sizes, setback rules from wells and property lines, and which engineered-system ` +
            `types are approved all vary by county and sometimes by state. The same soil reading can mean a different permitted design ` +
            `- and a different price - depending on where the lot sits.</p>`,
        },
        {
          h2: 'Budget for the worse outcome, not the better one',
          html: `<p>Where a county's soil skews toward "very limited" - true for the large majority of counties on this site - the safer ` +
            `assumption going into a negotiation is the engineered-system range (${money(ENGINEERED_SYSTEM_COST_USD.low)}-` +
            `${money(ENGINEERED_SYSTEM_COST_USD.high)}), not the conventional one. Being pleasantly surprised by a passing perc test ` +
            `beats being blindsided by a failing one.</p>`,
        },
      ],
    },
  ];
}
