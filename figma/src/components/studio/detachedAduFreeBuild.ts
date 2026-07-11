// ─────────────────────────────────────────────────────────────────────────────
// Free Build Program (Route B) financial model — Detached ADU
// Spec: "ADU eligibility / Investment selection" — 运营分账 + Buyback Path
//   · Owner pays $0 upfront; XBuild funds Total Delivered Investment (X)
//   · Net operating revenue is shared on a year-based tier schedule
//   · XBuild total return is capped at 1.6x; after the cap the owner share rises
//   · Buyback follows a fixed schedule (CD): owner can buy the asset back
// ─────────────────────────────────────────────────────────────────────────────
import { newtonIRR } from './detachedAduRoi';

export interface FreeBuildInputs {
  monthlyRent: number;        // estimated benchmark rent (month 1)
  sqft: number;
  capitalPerSqft: number;     // delivered capital $/sqft (spec: $180–200)
  vacancyRatePct: number;     // 0–1
  managementFeePct: number;   // 0–1 of gross rent
  monthlyInsurance: number;
  monthlyMaintenance: number;
  rentGrowthRatePct: number;  // 0–1 annual
  /** Owner share per tier [Y1–3, Y4–5, Y6+]; defaults to SPLIT_TIERS values. */
  ownerTierPcts?: [number, number, number];
}

export interface SplitTier {
  fromYear: number;
  toYear: number | null;
  ownerPct: number;
  label: string;
}

// Year-based split schedule (locked at signing; deviations shift timing, not %)
export const SPLIT_TIERS: SplitTier[] = [
  { fromYear: 1, toYear: 3, ownerPct: 0.30, label: 'Year 1–3 · Capital recovery' },
  { fromYear: 4, toYear: 5, ownerPct: 0.40, label: 'Year 4–5 · Profit phase' },
  { fromYear: 6, toYear: null, ownerPct: 0.60, label: 'Year 6+ · Long-term partnership' },
];
export const POST_CAP_OWNER_PCT = 0.70;  // once XBuild hits the 1.6x cap
export const RETURN_CAP_MULTIPLE = 1.6;

export interface FreeBuildYear {
  year: number;
  netRevenue: number;        // annual net operating revenue (pre-split)
  ownerPct: number;
  ownerIncome: number;
  xbuildIncome: number;
  ownerCumulative: number;
  xbuildCumulative: number;
}

export interface FreeBuildResults {
  totalCapital: number;            // X
  monthlyNetRevenue: number;       // year-1 monthly net operating revenue
  ownerMonthlyY1: number;
  ownerMonthlyY4: number;
  ownerMonthlyY6: number;
  years: FreeBuildYear[];
  xbuildPaybackYear: number | null;   // cumulative XBuild share ≥ X
  capYear: number | null;             // cumulative XBuild share ≥ 1.6X
  xbuildIRR10: number | null;
  ownerCumulative10: number;
  ownerCumulative20: number;
}

export function ownerShareForYear(year: number, capped: boolean, tierPcts?: [number, number, number]): number {
  if (capped) return POST_CAP_OWNER_PCT;
  const pcts = tierPcts ?? [SPLIT_TIERS[0].ownerPct, SPLIT_TIERS[1].ownerPct, SPLIT_TIERS[2].ownerPct];
  if (year <= 3) return pcts[0];
  if (year <= 5) return pcts[1];
  return pcts[2];
}

// ─── Asset-value buyback (股权式 · Market Schedule) ─────────────────────────
// XBuild holds the ADU as an asset. The buyback price is the asset value:
// delivered capital growing at ASSET_APPRECIATION per year, plus a one-time
// completion premium. Prices RISE over time — buying earlier locks a lower
// price. The 1.6x cap applies to XBuild's OPERATING share only; the buyback
// is an asset sale at market value and sits outside the cap.
export const ASSET_APPRECIATION = 0.04;   // 4%/yr (tracks construction cost / home value)
export const COMPLETION_PREMIUM = 0.10;   // Day-1 completion premium

export interface BuybackPoint { year: number; price: number; multiple: number }

export function computeBuybackSchedule(
  totalCapital: number,
  appreciationRate: number = ASSET_APPRECIATION,
  completionPremiumPct: number = COMPLETION_PREMIUM,
): BuybackPoint[] {
  const out: BuybackPoint[] = [];
  for (let y = 0; y <= 10; y++) {
    const price = Math.round(totalCapital * (1 + completionPremiumPct) * Math.pow(1 + appreciationRate, y));
    out.push({ year: y, price, multiple: price / totalCapital });
  }
  return out;
}

export function calculateFreeBuild(inputs: FreeBuildInputs, horizonYears = 20): FreeBuildResults {
  const X = inputs.capitalPerSqft * inputs.sqft;
  const netForRent = (rent: number) =>
    rent * (1 - inputs.vacancyRatePct) - rent * inputs.managementFeePct
    - inputs.monthlyInsurance - inputs.monthlyMaintenance;

  const monthlyNetRevenue = Math.max(0, netForRent(inputs.monthlyRent));

  const years: FreeBuildYear[] = [];
  const xbuildFlows: number[] = [-X];
  let ownerCum = 0;
  let xbuildCum = 0;
  let payback: number | null = null;
  let capYear: number | null = null;

  for (let y = 1; y <= horizonYears; y++) {
    const rentY = inputs.monthlyRent * Math.pow(1 + inputs.rentGrowthRatePct, y - 1);
    const netY = Math.max(0, netForRent(rentY)) * 12;
    const capped = capYear !== null;
    const oPct = ownerShareForYear(y, capped, inputs.ownerTierPcts);
    const oInc = netY * oPct;
    const xInc = netY * (1 - oPct);
    ownerCum += oInc;
    xbuildCum += xInc;
    if (payback === null && xbuildCum >= X) payback = y;
    if (capYear === null && xbuildCum >= RETURN_CAP_MULTIPLE * X) capYear = y;
    xbuildFlows.push(xInc);
    years.push({
      year: y, netRevenue: netY, ownerPct: oPct, ownerIncome: oInc, xbuildIncome: xInc,
      ownerCumulative: ownerCum, xbuildCumulative: xbuildCum,
    });
  }

  const monthlyOf = (yearIdx: number) =>
    years[yearIdx] ? years[yearIdx].ownerIncome / 12 : 0;

  return {
    totalCapital: X,
    monthlyNetRevenue,
    ownerMonthlyY1: monthlyOf(0),
    ownerMonthlyY4: monthlyOf(3),
    ownerMonthlyY6: monthlyOf(5),
    years,
    xbuildPaybackYear: payback,
    capYear,
    xbuildIRR10: newtonIRR(xbuildFlows.slice(0, 11)),
    ownerCumulative10: years[9] ? years[9].ownerCumulative : 0,
    ownerCumulative20: years[19] ? years[19].ownerCumulative : 0,
  };
}
