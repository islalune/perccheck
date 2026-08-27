// Shared septic-suitability model. Same role as RadonZoneCheck's
// radon-model.js and FloodZoneCheck's flood-model.js: the one place that
// turns SSURGO's raw suitability class into the figures a page shows, so the
// generator and any future API route cannot disagree about what a county's
// septic suitability actually is.
//
// Scope note (see src/data/counties-sources.json): SSURGO map units are
// drawn at roughly 1:12,000-1:63,360 scale, and this is an AREA-WEIGHTED
// DOMINANT CONDITION across every map unit in a county's survey area(s) -
// never a reading for one specific parcel. An actual building permit still
// requires a site-specific percolation test. The one thing this model must
// never do is imply a specific parcel's outcome - only what the county-level
// signal means and why a real test is the only way to know a given lot.

/**
 * SSURGO's own three suitability classes for the "ENG - Septic Tank
 * Absorption Fields" interpretation, ordered worst-to-best. `rank` orders
 * counties from most to least constrained, used to sort/rank nationally.
 * "Not limited" has zero counties as the county-level DOMINANT class in this
 * dataset (SSURGO's absorption-field criteria are strict nationwide - see
 * counties-sources.json), but the model does not assume that stays true
 * forever or hardcode it away.
 */
const CLASS_INFO = {
  'Very limited': {
    tier: 'high-constraint',
    rank: 3,
    label: 'Very limited - conventional systems routinely fail here',
    summary: 'Most of the county’s soil rates "very limited" for a standard septic absorption field. A conventional gravity system is unlikely to pass here; expect to budget for an engineered alternative.',
  },
  'Somewhat limited': {
    tier: 'moderate-constraint',
    rank: 2,
    label: 'Somewhat limited - conventional may work with modification',
    summary: 'Soil across most of the county rates "somewhat limited" - a conventional system can sometimes still work with design changes (a larger field, added fill, or a shallower system), but it is not guaranteed.',
  },
  'Not limited': {
    tier: 'low-constraint',
    rank: 1,
    label: 'Not limited - conventional systems typically work',
    summary: 'Most of the county’s soil rates "not limited" for a standard septic absorption field - the easiest starting point, though any specific lot can still differ from the county average.',
  },
};

// Sourced 2026 contractor-cost ranges (see counties-sources.json). Conventional
// gravity systems and engineered alternatives (mound or aerobic treatment
// unit - whichever a health department requires depends on soil and site,
// not on this data) are priced separately because the gap between them is
// the actual decision a "very limited" reading forces.
export const CONVENTIONAL_SYSTEM_COST_USD = { low: 3000, high: 8000, typical: 5500 };
export const ENGINEERED_SYSTEM_COST_USD = { low: 10000, high: 40000, typical: 17500 };
export const PERC_TEST_COST_USD = { low: 750, high: 1850, typical: 1300 };

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// SSURGO's own "not rated" result for a map unit (predominantly urban land,
// water, quarries, or other components with no absorption-field
// interpretation) - a real value SDA returns, distinct from an unmatched
// survey area. It means "not evaluated," not "not limited," so it gets the
// same honest unrated treatment as a missing match rather than being folded
// into one of the three suitability classes.
const NOT_RATED = 'Not rated';

/**
 * This county's SSURGO suitability class, resolved to the descriptive fields
 * a page needs. Empty (the ~59 counties with no SDA survey match) and
 * "Not rated" (the dominant map unit itself carries no interpretation - see
 * counties-sources.json) both come back as unrated rather than guessed at.
 */
export function septicInfo(row) {
  const cls = (row.septic_dominant_class || '').trim();
  if (cls === NOT_RATED) {
    return { class: null, tier: 'unrated', rank: null, label: 'Not rated by SSURGO', summary: 'The dominant soil here (often already-developed urban land) carries no septic-suitability interpretation from USDA - too rare a gap to guess at. A local percolation test is the only way to know.' };
  }
  const info = CLASS_INFO[cls];
  if (!info) {
    return { class: null, tier: 'unrated', rank: null, label: 'No SSURGO survey match for this county', summary: 'This county has no matching soil survey data - too rare a gap to guess at. A local percolation test is the only way to know.' };
  }
  return { class: cls, ...info };
}

/**
 * Per-county summary - the shape a page or API route consumes. Every field a
 * page renders should come from here, not be recomputed inline.
 */
export function summarizeCounty(row) {
  const info = septicInfo(row);
  return {
    fips: row.fips,
    county: row.county,
    state: row.state,
    stateName: row.state_name,
    class: info.class,
    tier: info.tier,
    label: info.label,
    summary: info.summary,
    dominantSharePct: num(row.septic_dominant_share_pct),
    veryLimitedPct: num(row.septic_very_limited_pct),
    population: num(row.population),
  };
}

/**
 * Ranks every rated county once, computed in a single pass rather than
 * per-page. Ties within a class are real (only 3 buckets), broken first by
 * how much of the county is in the worst share (veryLimitedPct, higher is
 * more constrained) and then by population. Unrated counties are excluded
 * entirely rather than assigned a rank the data doesn't support.
 *
 * Returns Maps keyed by FIPS: `nationalRank`/`rankedTotal` (rank among every
 * rated county, most constrained first) and `stateRank`/`stateTotal` (rank
 * among counties sharing the same state).
 */
export function rankCounties(rows) {
  const rated = rows.filter((r) => septicInfo(r).rank !== null);
  const byNational = [...rated].sort((a, b) => {
    const d = septicInfo(b).rank - septicInfo(a).rank;
    if (d !== 0) return d;
    const vd = (num(b.septic_very_limited_pct) ?? 0) - (num(a.septic_very_limited_pct) ?? 0);
    if (vd !== 0) return vd;
    return (num(b.population) ?? 0) - (num(a.population) ?? 0);
  });
  const nationalRank = new Map(byNational.map((r, i) => [r.fips, i + 1]));

  const stateGroups = new Map();
  for (const r of rated) {
    if (!stateGroups.has(r.state)) stateGroups.set(r.state, []);
    stateGroups.get(r.state).push(r);
  }
  const stateRank = new Map(), stateTotal = new Map();
  for (const group of stateGroups.values()) {
    const sorted = [...group].sort((a, b) => septicInfo(b).rank - septicInfo(a).rank
      || (num(b.septic_very_limited_pct) ?? 0) - (num(a.septic_very_limited_pct) ?? 0));
    sorted.forEach((r, i) => { stateRank.set(r.fips, i + 1); stateTotal.set(r.fips, sorted.length); });
  }

  return { nationalRank, rankedTotal: byNational.length, stateRank, stateTotal };
}
