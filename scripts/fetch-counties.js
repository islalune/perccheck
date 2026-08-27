// Build the per-county dataset every county page is generated from.
//
//   node scripts/fetch-counties.js
//
// Two real sources, joined on state + county FIPS:
//
//   1. USDA Soil Data Access (SDA) Tabular service -> per-county septic
//      suitability, derived from SSURGO's own "ENG - Septic Tank Absorption
//      Fields" component interpretation (cointerp), aggregated by mapunit
//      acreage to the dominant condition for the county.
//   2. Census 2025 Gazetteer + population estimates (same source and join
//      logic as FloodZoneCheck/RadonZoneCheck/InsulationPayback) -> FIPS,
//      name, state, lat/lon, land area, population.
//
// Scope note, must appear on every page: SSURGO map units are drawn at
// roughly 1:12,000-1:63,360 scale and a single unit routinely covers many
// distinct soils. The county number here is an AREA-WEIGHTED DOMINANT
// CONDITION across every map unit SDA returns for that county's survey
// area(s) - never a reading for one specific parcel. An actual building
// permit still requires a site-specific percolation test; this is a
// screening tool for "is this worth pursuing," same caveat shape as
// RadonZoneCheck's zone-vs-address distinction.
//
// Downloads are cached under src/data/_cache/ and reused, so re-running is
// free except for the (uncached) live SDA query.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'src', 'data');
const CACHE = path.join(DATA, '_cache');
fs.mkdirSync(CACHE, { recursive: true });

const GAZ = 'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_counties_national.zip';
const POP = 'https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/counties/totals/co-est2024-alldata.csv';
const SDA = 'https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest';

const STATE_FIPS_TO_USPS = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
  '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
  '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM',
  '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fetch to a cache file, with backoff. 429 and 5xx are retried, other 4xx is not. */
async function cached(url, file, { tries = 5, headers = {} } = {}) {
  const dest = path.join(CACHE, file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    console.log(`  cached  ${file}`);
    return dest;
  }
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'perccheck-fetch/1.0', ...headers } });
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after')) || null;
        throw Object.assign(new Error(`HTTP ${res.status}`), { retryAfter });
      }
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { fatal: true });
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      console.log(`  fetched ${file}  ${(buf.length / 1e6).toFixed(2)} MB`);
      return dest;
    } catch (err) {
      if (err.fatal || attempt === tries) throw err;
      const wait = err.retryAfter ? err.retryAfter * 1000 : 1500 * attempt;
      console.log(`  ${err.message} on ${file}, retry ${attempt}/${tries - 1} in ${wait}ms`);
      await sleep(wait);
    }
  }
}

function splitCsv(line) {
  const out = [];
  let cur = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
const csvCell = (v) => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);

/** Minimal ZIP reader (no `unzip` binary on this VM) - single-file archive, STORED or DEFLATE. */
function unzipSingleFile(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip (no EOCD record)');
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const sig = buf.readUInt32LE(cdOffset);
  if (sig !== 0x02014b50) throw new Error('central directory signature mismatch');
  const method = buf.readUInt16LE(cdOffset + 10);
  const compSize = buf.readUInt32LE(cdOffset + 20);
  const localOffset = buf.readUInt32LE(cdOffset + 42);
  const lfhNameLen = buf.readUInt16LE(localOffset + 26);
  const lfhExtraLen = buf.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + lfhNameLen + lfhExtraLen;
  const compData = buf.subarray(dataStart, dataStart + compSize);
  const raw = method === 0 ? compData : method === 8 ? zlib.inflateRawSync(compData) : (() => { throw new Error(`unsupported zip method ${method}`); })();
  return raw;
}

/** One SDA Tabular query, JSON in, JSON table out. Retries on 429/5xx/maintenance-window HTML. */
async function sdaQuery(sql, { tries = 5 } = {}) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const res = await fetch(SDA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'user-agent': 'perccheck-fetch/1.0' },
      body: JSON.stringify({ QUERY: sql, FORMAT: 'JSON' }),
    });
    const text = await res.text();
    if (text.startsWith('<html') || /under daily maintenance/i.test(text)) {
      if (attempt === tries) throw Object.assign(new Error('SDA in maintenance window, gave up'), { maintenance: true });
      console.log(`  SDA in maintenance window, retry ${attempt}/${tries - 1} in 60s`);
      await sleep(60_000);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt === tries) throw new Error(`SDA HTTP ${res.status}`);
      await sleep(2000 * attempt);
      continue;
    }
    if (!res.ok) throw new Error(`SDA HTTP ${res.status}: ${text.slice(0, 300)}`);
    let j;
    try { j = JSON.parse(text); } catch { throw new Error(`SDA non-JSON response: ${text.slice(0, 300)}`); }
    return j.Table ?? [];
  }
  return [];
}

async function main() {
  console.log('Sources:');

  // --- 1. Gazetteer: FIPS, name, state, lat/lon, land area ----------------
  const gazZip = await cached(GAZ, 'census-2025-gaz-counties-national.zip');
  const gazTxt = unzipSingleFile(fs.readFileSync(gazZip)).toString('utf8');
  const counties = new Map();
  for (const line of gazTxt.split('\n').slice(1)) {
    const f = line.split('|').map((s) => s.trim());
    if (f.length < 11 || !f[1]) continue;
    const [usps, geoid, , , name, , , alandSqMi, , lat, lon] = f;
    counties.set(geoid, {
      usps, geoid, name,
      lat: Number(lat), lon: Number(lon), landSqMi: Number(alandSqMi) || 0,
    });
  }
  console.log(`Gazetteer: ${counties.size} counties`);

  // --- 2. Population estimates, keyed on STATE+COUNTY FIPS ----------------
  const popCsv = await cached(POP, 'census-co-est2024-alldata.csv');
  const pop = new Map();
  const popLines = fs.readFileSync(popCsv, 'latin1').split('\n');
  const head = splitCsv(popLines[0]);
  const col = (n) => head.indexOf(n);
  const [iSum, iState, iCounty, iPop, iName, iStName] =
    ['SUMLEV', 'STATE', 'COUNTY', 'POPESTIMATE2024', 'CTYNAME', 'STNAME'].map(col);
  if (iPop < 0) throw new Error('POPESTIMATE2024 column missing - the popest vintage moved');
  for (const line of popLines.slice(1)) {
    if (!line.trim()) continue;
    const f = splitCsv(line);
    if (f[iSum] !== '050') continue; // 050 = county
    const fips = f[iState] + f[iCounty];
    const n = Number(f[iPop]);
    if (Number.isFinite(n)) pop.set(fips, { population: n, ctyname: f[iName], stname: f[iStName] });
  }
  console.log(`Population: ${pop.size} counties`);

  // --- 3. SDA: septic suitability per county, one query per STATE --------
  // areasymbol's trailing 3 digits are the county FIPS for the overwhelming
  // majority of survey areas (documented NRCS convention), so filtering
  // legend.areasymbol LIKE '<usps><countyfips>%' catches the normal case and
  // also any split survey areas for that same county (e.g. a national
  // forest carved out separately) in one pass. Acreage-weighted dominant
  // condition across every mapunit x dominant-component row SDA returns.
  const cacheFile = path.join(CACHE, 'sda-septic-by-county.json');
  let sdaRows;
  if (fs.existsSync(cacheFile)) {
    sdaRows = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    console.log(`  cached  sda-septic-by-county.json (${sdaRows.length} rows)`);
  } else {
    sdaRows = [];
    const states = [...new Set([...counties.values()].map((c) => c.usps))].sort();
    for (const usps of states) {
      const sql = `
        SELECT legend.areasymbol, mapunit.mukey, mapunit.muacres,
               component.cokey, component.comppct_r,
               cointerp.interphrc
        FROM legend
        INNER JOIN mapunit ON mapunit.lkey = legend.lkey
        INNER JOIN component ON component.mukey = mapunit.mukey
        INNER JOIN cointerp ON cointerp.cokey = component.cokey
        WHERE legend.areasymbol LIKE '${usps}%'
          AND cointerp.mrulename = 'ENG - Septic Tank Absorption Fields'
          AND cointerp.ruledepth = 0
          AND component.majcompflag = 'Yes'
      `.replace(/\s+/g, ' ').trim();
      const rows = await sdaQuery(sql);
      console.log(`  SDA ${usps}: ${rows.length} component-interp rows`);
      sdaRows.push(...rows.map((r) => ({ ...r, usps })));
      await sleep(500);
    }
    fs.writeFileSync(cacheFile, JSON.stringify(sdaRows));
  }

  // Aggregate to county: area symbol's trailing digits -> county FIPS,
  // weighted by muacres * comppct_r (the share of the map unit this
  // component covers), picking the acreage-weighted dominant rating class.
  const bySda = new Map(); // fips -> { class -> weight }
  let unmatchedAreasymbol = 0;
  for (const r of sdaRows) {
    const m = /^[A-Za-z]{2}(\d{3})$/.exec(r.areasymbol || '');
    if (!m) { unmatchedAreasymbol++; continue; }
    const stateFips = Object.entries(STATE_FIPS_TO_USPS).find(([, u]) => u === r.usps)?.[0];
    if (!stateFips) continue;
    const fips = stateFips + m[1];
    const weight = (Number(r.muacres) || 0) * (Number(r.comppct_r) || 0);
    if (!weight || !r.interphrc) continue;
    const cls = String(r.interphrc).trim();
    const cur = bySda.get(fips) ?? {};
    cur[cls] = (cur[cls] ?? 0) + weight;
    bySda.set(fips, cur);
  }
  console.log(`SDA aggregated to ${bySda.size} counties (${unmatchedAreasymbol} rows with an unparseable areasymbol)`);

  // --- join, driven by the gazetteer so every US county is represented ---
  const rows = [];
  let noPop = 0, noSda = 0;
  for (const [fips, geo] of counties) {
    const p = pop.get(fips);
    if (!p) { noPop++; continue; }
    const classes = bySda.get(fips);
    let dominant = '', dominantShare = '', veryLimitedShare = '';
    if (classes) {
      const total = Object.values(classes).reduce((a, b) => a + b, 0);
      const sorted = Object.entries(classes).sort((a, b) => b[1] - a[1]);
      dominant = sorted[0][0];
      dominantShare = total ? +(sorted[0][1] / total * 100).toFixed(1) : '';
      veryLimitedShare = total ? +((classes['Very limited'] ?? 0) / total * 100).toFixed(1) : '';
    } else noSda++;
    rows.push({
      fips, county: geo.name, state: geo.usps, state_name: p.stname,
      lat: Number.isFinite(geo.lat) ? +geo.lat.toFixed(4) : '',
      lon: Number.isFinite(geo.lon) ? +geo.lon.toFixed(4) : '',
      land_sq_mi: geo.landSqMi, population: p.population,
      septic_dominant_class: dominant,
      septic_dominant_share_pct: dominantShare,
      septic_very_limited_pct: veryLimitedShare,
    });
  }
  rows.sort((a, b) => b.population - a.population);

  if (!rows.length) throw new Error('join produced zero rows - a key format changed');

  const cols = Object.keys(rows[0]);
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, 'counties.csv'),
    [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n');

  fs.writeFileSync(path.join(DATA, 'counties-sources.json'), JSON.stringify({
    retrieved: new Date().toISOString(),
    counties: rows.length,
    septicSuitability: {
      url: SDA,
      dataset: "USDA Soil Data Access, SSURGO 'ENG - Septic Tank Absorption Fields' component interpretation (cointerp, ruledepth 0), major components only, aggregated by mapunit acres x component percent to an area-weighted dominant rating class per county",
      gives: "Per-county dominant suitability class (Not limited / Somewhat limited / Very limited), the % of weighted area in that dominant class, and the % rated Very limited specifically",
      note: 'Map-unit scale (roughly 1:12,000-1:63,360), never a single-parcel reading - an actual permit still needs a site percolation test. Areasymbol-to-county join uses the documented NRCS convention that the trailing 3 digits of a survey areasymbol are the county FIPS code; this holds for the large majority of survey areas but not every split/joint survey area, so a residual gap is expected and reported, not silently dropped.',
    },
    gazetteer: { url: GAZ, vintage: '2025', gives: 'county FIPS, name, state, internal lat/lon, land area' },
    population: { url: POP, vintage: 'POPESTIMATE2024', sumlev: '050 county' },
    dropped: { noPopulationMatch: noPop, noSdaMatch: noSda },
  }, null, 2) + '\n');

  const q = (k) => { const v = rows.map((r) => r[k]).filter(Number.isFinite).sort((a, b) => a - b); return [v[0], v[v.length - 1]]; };
  const classCounts = {};
  for (const r of rows) classCounts[r.septic_dominant_class || 'none'] = (classCounts[r.septic_dominant_class || 'none'] || 0) + 1;
  console.log(`\nWrote src/data/counties.csv - ${rows.length} counties in ${new Set(rows.map(r => r.state)).size} states/territories`);
  console.log(`  population         ${q('population')[0].toLocaleString()} .. ${q('population')[1].toLocaleString()}`);
  console.log(`  class distribution ${JSON.stringify(classCounts)}`);
  console.log(`  dropped: ${noPop} with no population match, ${noSda} with no SDA match`);

  for (const name of ['Los Angeles', 'Cook', 'Harris', 'Story']) {
    const r = rows.find((x) => x.county.startsWith(name));
    if (r) console.log(`  spot-check ${r.county}, ${r.state}: ${r.septic_dominant_class || 'MISSING'} (${r.septic_dominant_share_pct}%), very-limited ${r.septic_very_limited_pct}%, pop ${r.population.toLocaleString()}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
