// ─────────────────────────────────────────────────────────────────────────────
// ADU incentive programs by state, resolved from the property address.
// Replaces hard-coded California placeholders with real, location-correct
// programs. Each entry links to the official program page.
//
// Sources (verified 2026-06-05):
//   · WA HB 1337 / RCW 36.70A.696 — statewide ADU reform, impact-fee cap
//   · Seattle ADUniverse / OPCD — pre-approved DADU plans, faster permitting
//   · Seattle Housing Authority / KCHA — Housing Choice Voucher (Section 8)
//   · King County DCHS — homeowner housing-repair / deferred-payment loans
// ─────────────────────────────────────────────────────────────────────────────

export type TagColor = 'blue' | 'gray' | 'slate' | 'emerald';
export type StatusColor = 'blue' | 'emerald' | 'gray';
export type IconKind = 'building' | 'landmark' | 'scroll' | 'file';

export interface IncentiveProgram {
  id: string;
  title: string;
  source: string;        // administering agency
  amount: string;        // benefit summary (honest; not invented dollars)
  impactLabel: string;   // short chip used in exit-module adjustments
  icon: IconKind;
  tag: string;
  tagColor: TagColor;
  statusLabel: string;
  statusColor: StatusColor;
  description: string;
  actionItems: string[];
  buttonLabel: string;
  buttonVariant: 'primary' | 'outline';
  url?: string;          // official program page (opened on "Learn More")
  scope: 'national' | 'state' | 'county' | 'city';  // jurisdiction level
  kind: 'financial' | 'program';  // financial = money/savings; program = law/resource/strategy
  selected: boolean;
}

const WA: IncentiveProgram[] = [
  {
    id: 'wa-hb1337',
    kind: 'program',
    title: 'HB 1337 ADU Reform',
    source: 'WA State (RCW 36.70A.696)',
    amount: 'Impact fee ≤ 50% of main home',
    impactLabel: 'Lower permit cost',
    icon: 'scroll',
    tag: 'Statewide Law',
    tagColor: 'emerald',
    statusLabel: 'Applies automatically',
    statusColor: 'emerald',
    description: 'State law caps ADU impact fees at half the rate of the primary home, removes owner-occupancy requirements, and allows up to two ADUs per lot.',
    actionItems: [
      'No owner-occupancy requirement',
      'Impact fees capped at 50% of principal unit',
      'Up to two ADUs allowed per lot in urban growth areas',
    ],
    buttonLabel: 'Learn More',
    buttonVariant: 'outline',
    url: 'https://app.leg.wa.gov/RCW/default.aspx?cite=36.70A.696',
    scope: 'state',
    selected: false,
  },
  {
    id: 'seattle-aduniverse',
    kind: 'program',
    title: 'Pre-Approved DADU Plans',
    source: 'Seattle OPCD · ADUniverse',
    amount: 'Free plans · permit in 2–6 weeks',
    impactLabel: 'Faster + cheaper permit',
    icon: 'building',
    tag: 'Design & Permitting',
    tagColor: 'blue',
    statusLabel: 'Eligible',
    statusColor: 'blue',
    description: 'Seattle’s library of pre-approved detached ADU designs removes design cost and shortens the permit timeline to as little as 2–6 weeks.',
    actionItems: [
      'Lot must meet detached ADU siting standards',
      'Choose a pre-approved plan from the city library',
    ],
    buttonLabel: 'Browse Plans',
    buttonVariant: 'outline',
    url: 'https://www.seattle.gov/opcd/current-projects/encouraging-backyard-cottages',
    scope: 'city',
    selected: false,
  },
  {
    id: 'sect8',
    kind: 'program',
    title: 'Housing Choice Voucher',
    source: 'Seattle / King County Housing Authority',
    amount: 'Guaranteed market-rate rent',
    impactLabel: 'Stable rent',
    icon: 'landmark',
    tag: 'Optional Rental Strategy',
    tagColor: 'gray',
    statusLabel: '',
    statusColor: 'gray',
    description: 'Leasing your ADU to a Housing Choice Voucher (Section 8) tenant provides direct, reliable rent payments from the local housing authority.',
    actionItems: [
      'Tenant must hold a valid Housing Choice Voucher',
      'Unit must pass a Housing Quality Standards (HQS) inspection',
      'Landlord registration with the housing authority required',
    ],
    buttonLabel: 'Learn More',
    buttonVariant: 'outline',
    url: 'https://www.seattlehousing.org/housing/housing-choice-voucher',
    scope: 'county',
    selected: false,
  },
  {
    id: 'kc-repair',
    kind: 'financial',
    title: 'Homeowner Repair Loan',
    source: 'King County DCHS',
    amount: 'Deferred / low-interest loan',
    impactLabel: 'Low-cost financing',
    icon: 'file',
    tag: 'Income-Qualified',
    tagColor: 'blue',
    statusLabel: 'Documentation Required',
    statusColor: 'blue',
    description: 'Income-qualified King County homeowners may access deferred-payment or low-interest loans that can help fund site work and improvements.',
    actionItems: [
      'Income verification documentation required',
      'Property must be owner-occupied in King County',
    ],
    buttonLabel: 'Check Eligibility',
    buttonVariant: 'outline',
    url: 'https://kingcounty.gov/en/dept/dchs/human-social-services/housing-homeless-services/homeowners-renter-resources/housing-repair',
    scope: 'county',
    selected: false,
  },
];

// National fallback when we don't yet have a curated list for the state.
const NATIONAL: IncentiveProgram[] = [
  {
    id: 'sect8',
    kind: 'program',
    title: 'Housing Choice Voucher',
    source: 'Local Housing Authority',
    amount: 'Guaranteed market-rate rent',
    impactLabel: 'Stable rent',
    icon: 'landmark',
    tag: 'Optional Rental Strategy',
    tagColor: 'gray',
    statusLabel: '',
    statusColor: 'gray',
    description: 'Leasing your ADU to a Housing Choice Voucher (Section 8) tenant provides reliable rent payments from the local housing authority.',
    actionItems: [
      'Tenant must hold a valid Housing Choice Voucher',
      'Unit must pass a Housing Quality Standards (HQS) inspection',
      'Landlord registration with the housing authority required',
    ],
    buttonLabel: 'Learn More',
    buttonVariant: 'outline',
    url: 'https://www.hud.gov/topics/housing_choice_voucher_program_section_8',
    scope: 'national',
    selected: false,
  },
  {
    id: 'local-fee',
    kind: 'financial',
    title: 'Local ADU Programs',
    source: 'City / County Planning',
    amount: 'Varies by jurisdiction',
    impactLabel: 'Varies',
    icon: 'scroll',
    tag: 'Check Locally',
    tagColor: 'slate',
    statusLabel: '',
    statusColor: 'gray',
    description: 'ADU fee waivers, grants, and pre-approved plan libraries are administered locally. We will confirm the programs available in your jurisdiction.',
    actionItems: [
      'We verify available local programs for your address',
      'A specialist follows up with the applicable incentives',
    ],
    buttonLabel: 'Learn More',
    buttonVariant: 'outline',
    url: 'https://www.hud.gov/program_offices/housing/sfh/adu',
    scope: 'national',
    selected: false,
  },
];

// ─── ZIP → jurisdiction resolution (state / county / city) ───────────────────
// Programs are keyed by jurisdiction level; a ZIP resolves to its enclosing
// state, county and city, and the page shows the union of matching programs.
// (No public API returns all ADU incentives per ZIP, so the program catalog is
//  a maintained table — the ZIP only drives WHICH jurisdictions apply.)

import { SAFMR_FY2026_SEATTLE } from './zipRentSafmr';

// Seattle city ZIPs (vs. broader King County / WA metro).
const SEATTLE_CITY_ZIPS = new Set([
  '98101','98102','98103','98104','98105','98106','98107','98108','98109','98112',
  '98115','98116','98117','98118','98119','98121','98122','98125','98126','98133',
  '98134','98136','98144','98146','98154','98164','98174','98177','98178','98195','98199',
]);

export interface Jurisdiction { state: string | null; county: string | null; city: string | null; }

export function resolveJurisdiction(zip?: string | null, address?: string | null): Jurisdiction {
  let z = zip ?? null;
  if (!z && address) {
    const m = String(address).match(/\b\d{5}\b(?=(?:-\d{4})?\s*$)/) || String(address).match(/\b\d{5}\b/g)?.slice(-1);
    z = Array.isArray(m) ? m[0] : (m ? m[0] : null);
  }
  if (!z) return { state: null, county: null, city: null };

  // King County / Seattle metro: any ZIP present in the SAFMR Seattle table.
  if (SAFMR_FY2026_SEATTLE[z]) {
    return {
      state: 'WA',
      county: 'King',
      city: SEATTLE_CITY_ZIPS.has(z) ? 'Seattle' : null,
    };
  }
  if (/^98\d{3}$/.test(z) || /^99\d{3}$/.test(z)) return { state: 'WA', county: null, city: null };
  return { state: null, county: null, city: null };
}

const STATE_PROGRAMS: Record<string, IncentiveProgram[]> = {
  WA: WA.filter((p) => p.scope === 'state'),
};
const COUNTY_PROGRAMS: Record<string, IncentiveProgram[]> = {
  'WA:King': WA.filter((p) => p.scope === 'county'),
};
const CITY_PROGRAMS: Record<string, IncentiveProgram[]> = {
  'WA:Seattle': WA.filter((p) => p.scope === 'city'),
};

export function getIncentivesForAddress(address?: string | null, zip?: string | null): {
  jurisdiction: Jurisdiction;
  programs: IncentiveProgram[];
} {
  const j = resolveJurisdiction(zip, address);
  const out: IncentiveProgram[] = [];
  if (j.state && STATE_PROGRAMS[j.state]) out.push(...STATE_PROGRAMS[j.state]);
  if (j.state && j.city && CITY_PROGRAMS[`${j.state}:${j.city}`]) out.push(...CITY_PROGRAMS[`${j.state}:${j.city}`]);
  if (j.state && j.county && COUNTY_PROGRAMS[`${j.state}:${j.county}`]) out.push(...COUNTY_PROGRAMS[`${j.state}:${j.county}`]);
  if (out.length === 0) out.push(...NATIONAL);
  // de-dup by id, fresh copies for per-session selection
  const seen = new Set<string>();
  return { jurisdiction: j, programs: out.filter((p) => !seen.has(p.id) && seen.add(p.id)).map((p) => ({ ...p })) };
}
