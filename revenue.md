# PercCheck — revenue routes

Researched 2026-08-27, before the dataset and template exist, so the answer
shapes what the pages must contain — same order as HeatPumpPayback,
FloodZoneCheck and ChargeCostFinder.

**Every number below is sourced.** Where a figure could not be verified for
this specific vertical it is marked unknown, not estimated — a guessed RPM is
worse than none because the whole site gets planned around it.

The site: look up a county/parcel and get the USDA SSURGO soil drainage
class and percolation suitability for a conventional septic system — the
thing a land buyer needs to know **before** they close, because a lot that
can't perc needs an engineered system ($15k-40k+) or can't be built on at
all. That is a decision moment for someone mid-purchase on raw or rural
land: they need a percolation test / soil evaluator, and if the news is bad,
a septic engineer or an alternative-system installer.

---

## The honest ceiling — run first, before anything else

`scout/ranked.json` puts this niche's total seed-query volume at **21,600
searches/month**. Run through `factory/target.js`:

| Model | Rate used (sourced below) | Monthly visits needed | Realistically capturable (top-3, 15% CTR) | Verdict |
|---|---|---|---|---|
| Display ads (AdSense, low end) | $6 RPM | 166,667 | 3,240 | **NOT reachable — needs 5,144% of the whole niche** |
| Display ads (AdSense, high end) | $12 RPM | 83,333 | 3,240 | **NOT reachable — needs 2,572% of the whole niche** |
| HomeAdvisor/Angi affiliate via CJ (low end, $15/lead-equivalent) | $15/sale × 2% conv | 3,333 | 3,240 | **NOT reachable alone — needs 103%** |
| Perc-tester / septic-engineer lead-gen (direct proxy rate) | $50/lead × 2% conv | 1,000 | 3,240 | Reachable at **31%** of capturable traffic |

**Display ads cannot get this site to $1,000/month, full stop** — same
structural result as every sibling site so far: the niche is too small
(21,600 searches/month across the whole query family) for a $6-12 RPM to
clear $1,000/month. Even the CJ-mediated Angi affiliate payout, at its
published low end, cannot clear the bar alone. Only a direct percolation
tester / septic engineer / alternative-system installer lead — priced like
other licensed-trade leads, not like a display impression — gets there, and
even that needs to capture **31% of everything the whole niche can
supply**, which is tight, not comfortable, and assumes top-3 ranking across
the query family plus an unverified 2% visit-to-lead conversion carried over
from HVAC/EV (not confirmed for this exact vertical). **Honest ceiling for
Olivia: this site can plausibly reach $1,000/month only by combining
perc-tester/engineer leads with the CJ-mediated Angi affiliate and display
ads as a stacked portfolio, not from any single route** — same shape as
ChargeCostFinder's finding, told straight rather than planned around a
number that can't happen.

---

## Ranked by expected revenue per 1,000 visits

| # | Route | Rate (sourced) | Est. $/1,000 visits | Status |
|---|---|---|---|---|
| 1 | Percolation tester / septic engineer / alternative-system installer lead-gen (direct outreach, no public self-serve program found) | No public per-lead rate; licensed-trade proxy: Angi/HomeAdvisor pays contractors $15-$120+/shared lead for home-service trades (astraresults.com, thevalleymarketinggroup.com) | ~$300-2,400 (at 2% conv, using $15-120 range) | Needs a direct-outreach programme (Olivia) + real traffic — no publisher-facing affiliate exists for this specific trade |
| 2 | HomeAdvisor/Angi affiliate program via CJ Affiliate | $1.50-$16 per sale, negotiable, rate "not publicly known" per CJ listing (getlasso.co, linkclicky.com) | ~$30-320 (at 2% conv) | Needs CJ Affiliate account (Olivia) + real traffic |
| 3 | LandWatch / Land.com Network affiliate programme | Referral programme exists, tracks clicks/purchases within a 24h window; commission structure not publicly disclosed (linkmydeals.com) | Unknown — not sourced | **NEVER until a real commission rate is confirmed directly with the network** |
| 4 | Display ads — AdSense | $6-12 per 1,000 pageviews (no traffic floor) | $6-12 | **Build now, apply now once content bar met** — necessary but not sufficient alone |
| 5 | Amazon Associates (septic maintenance: RID-X/enzyme treatments, risers, effluent filters, DIY soil test kits) | 3% home-improvement category (standard Amazon Associates rate) | ~$15-30 (low-intent add-on, assumes ~$10-20 avg order at low click-to-buy rate) | Needs Amazon Associates account (Olivia); 3-sale/180-day activity rule to stay enrolled |
| 6 | Display ads — Raptive / Mediavine / Ezoic | 25k pageviews / 50k sessions / 250k MAU respectively | $8-50/1,000 (once qualified) | Needs traffic |
| 7 | FlexOffers / any general affiliate network as an aggregator of the above | Free to join | — | **NEVER before real traffic exists** |

---

## 1. Percolation tester / septic engineer / alternative-system installer lead-gen — the priority route

No septic-installer- or perc-tester-specific publisher affiliate program
could be found (searched directly; same gap ChargeCostFinder hit for
Qmerit/ChargePoint — the companies that would pay for this lead run their
own crews or a closed contractor network, not a public affiliate program).
The closest sourced proxy is Angi/HomeAdvisor's general home-service lead
pricing: contractors pay **$15-$120+ per shared lead** (astraresults.com:
"why plumbers pay $80+ per lead on HomeAdvisor"; thevalleymarketinggroup.com:
Angi leads run $15-120+, shared among 3-8 competing pros), and one source
notes septic companies specifically can profit even at "$400 per lead" given
a ~30% close rate on ~$400 jobs (septicmarketing.us) — evidence the vertical
supports a real per-lead price, just not through a public self-serve
program.

A percolation test itself costs **$750-$1,850 nationally, averaging ~$1,300**
(bobvila.com) — a real-money decision, which is exactly the kind of
high-consideration purchase a lead-gen CTA converts well against.

### Qualification checklist
| Requirement | Site now | Gap |
|---|---|---|
| Live site with real, indexed search traffic | No — not deployed | Needs deploy + months of indexing |
| Named contact / real business behind it | Not yet | About page needed regardless (route 4) |
| A CTA that reads as a real quote request, not an ad | Not built | **build requirement**: "get a perc test / septic evaluation quote" lead-capture CTA slot, shown prominently on parcels that fail or are marginal for conventional systems |
| An actual programme to plug the CTA into | **None found** — no self-serve affiliate program for perc testers/septic engineers/alt-system installers | Needs direct partnership outreach (regional septic/soil-testing firms) **or** routing through Angi/HomeAdvisor's CJ programme (route 2) as an interim — either way, an account or agreement Olivia must create/authorize |

**Verdict: APPLY AT — real, indexed traffic, AND a programme (direct or via
CJ) exists.** Two blockers, both named: (b) traffic — parked to
`idea.js`; (c) no publisher programme currently reachable without Olivia
either opening a CJ account for the Angi-mediated version or initiating
direct outreach to regional septic/soil firms. The CTA slot itself costs
nothing to build now and switches on the moment either path clears.

## 2. HomeAdvisor/Angi affiliate program via CJ Affiliate

Runs through **CJ Affiliate**, paying **$1.50-$16 per sale** (rate
"negotiable" and "not publicly known" per getlasso.co and linkclicky.com —
i.e. the low end is the only number confirmed in writing). CJ's own
publisher terms: an "optimized website, quality content, and consistent
effort," inactive accounts closed after six months, $50 minimum payout
threshold (Direct Deposit). No numeric traffic floor published for base
enrollment.

### Qualification checklist
| Requirement | Site now | Gap |
|---|---|---|
| Optimized site with quality content | Will exist post-build | none once built |
| CJ Affiliate network account | **Not held** | needs Olivia — CJ signup requires business/tax/bank info the worker must not touch (same boundary as AdSense payments) |
| Real traffic before applying | Not yet | inactive-after-6-months rule means applying too early risks the account closing before it ever earns |

**Verdict: APPLY AT — CJ account exists AND real traffic.** Parked to
`idea.js` for the traffic half; the account half is a note for Olivia at the
`monetise` step.

## 3. LandWatch / Land.com Network affiliate programme

LandWatch's own affiliate description (linkmydeals.com) confirms a
referral programme exists and tracks conversions within a 24-hour
click window, but **no commission rate is published anywhere found** in
this search. The Land.com Network's core business model (Land.com, Land &
Farm, LandWatch) is charging *sellers* a listing fee, not paying commission
on completed land sales, which makes the affiliate payout structure genuinely
unclear rather than just under-documented.

**Verdict: NEVER — until a real, written commission rate is confirmed
directly with the network.** Applying to an affiliate program with an
unknown payout is the FlexOffers mistake in a different shape: it burns an
application and a traffic source for a number nobody can verify is worth it.
Not written to `idea.js` as revenue since there's nothing actionable yet;
worth a note if the CTA becomes relevant once the site has an outbound "shop
land near this parcel" style link.

## 4. Display ads — AdSense — build now regardless

Same reasoning as every sibling site: **no traffic floor**, $6-12/1,000
pageviews is real but, per the ceiling table above, cannot reach $1,000/month
alone on this niche's volume. Build the ad slot and the ads.txt now (zero
marginal cost), apply once the standard content bar is met (about page with
a named author, privacy, terms, contact — same requirement across every
programme here, so it is a build requirement regardless of which route ends
up paying).

### Qualification checklist
| Requirement | Site now | Gap |
|---|---|---|
| ads.txt + AdSense snippet on every page | Emitted by factory/build.js automatically | none — already handled by the shared template |
| About/privacy/terms/contact pages | Not built yet | **build requirement** — content step |
| Domain verified in AdSense (pub-1937434719533429, olivia@islalune.ca) | Not yet — needs a live deployed site first | Needs Olivia's two-minute click once deployed (adsense step) |

**Verdict: APPLY NOW, once deployed and content bar met.** No traffic floor
means this is never blocked on visits, only on the site actually being live.

## 5. Amazon Associates — septic maintenance products (add-on, not primary)

Standard Amazon Associates home-improvement rate is **3%** commission.
Relevant products: RID-X/enzyme septic treatments, tank risers, effluent
filters, DIY soil/perc test kits — genuinely useful add-ons for a visitor
who just learned their land's soil class, but low-intent compared to a
professional-service lead (a $15-30 product purchase at 3% nets pennies per
conversion). Requires **3 qualifying sales within 180 days** of joining to
avoid account closure — a real eligibility risk to flag, since a low-traffic
new site could fail that bar and lose the account before real traffic
arrives.

**Verdict: APPLY AT — real traffic (enough to plausibly clear 3 sales/180
days).** Parked to `idea.js` at "some baseline monthly visits, evidenced
by Search Console" rather than applying day one and risking closure.

## 6. Display ads — Raptive / Mediavine / Ezoic

Same published thresholds as every sibling site: Mediavine Journey 1,000
sessions/mo, Raptive 25,000 pageviews/mo, Mediavine (full) 50,000
sessions/mo, Ezoic 250,000 MAU (Ezoic explicitly has no minimum to *apply*,
but its economics only make sense at real scale). All parked to `idea.js`
with those exact thresholds as the revisit trigger.

## 7. FlexOffers / general affiliate aggregators

**NEVER before real traffic exists.** FlexOffers declined PanelFit at four
days old with 7 impressions and burned both the account and the traffic
source — the lesson this whole research step exists to avoid repeating.

---

## Build requirements this research adds (bucket a — build now)

1. A lead-capture CTA slot ("get a perc test / septic evaluation quote"),
   shown prominently on parcels whose soil is marginal or unsuitable for a
   conventional system — the highest-intent moment on the site.
2. About page with a **named author**, privacy, terms, contact pages —
   required by every programme above, none built yet.
3. AdSense slot + ads.txt — already handled automatically by
   `factory/build.js`; nothing extra to write.
4. Amazon affiliate product placements (RID-X, risers, test kits) as a
   secondary, low-priority slot once an Associates ID exists — id left empty
   until Olivia has one.

## Parked to idea.js (bucket b — needs time/traffic, threshold named)

- Perc-tester/septic-engineer lead-gen: real indexed traffic (no numeric
  floor exists to name beyond "the site is live and ranking").
- CJ Affiliate (Angi/HomeAdvisor): real traffic, to avoid the 6-month
  inactive-account closure before any commission is earned.
- Amazon Associates: enough baseline traffic to plausibly clear 3 sales in
  180 days.
- Raptive at 25,000 pageviews/mo; Mediavine Journey at 1,000 sessions/mo;
  Mediavine (full) at 50,000 sessions/mo; Ezoic at 250,000 MAU.

## Needs Olivia (bucket c — account/signature/money)

- CJ Affiliate account (for both the Angi/HomeAdvisor route and as the
  eventual home of any solar/insurance adjacents, mirroring ChargeCostFinder).
- Amazon Associates account.
- Direct outreach to a regional percolation-test/septic-engineering firm for
  route 1, if Olivia wants to pursue a real per-lead deal ahead of a CJ
  fallback.
- AdSense: add the domain and request review once deployed (adsense step,
  not this one).

None of the above are blocking this site's build — every route with a real
gap is either a build requirement now or a named, revisitable threshold.
