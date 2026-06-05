// Detached ADU (DADU) Rent Benchmark Data — Seattle Neighborhoods
// All values in USD/month. Source: local mock benchmarks based on 2025 market data.

export type BedroomType = 'studio' | 'oneBed' | 'twoBed' | 'threeBed';

export interface RentBenchmark {
  min: number;
  avg: number;
  max: number;
}

export interface NeighborhoodData {
  studio: RentBenchmark;
  oneBed: RentBenchmark;
  twoBed: RentBenchmark;
  threeBed: RentBenchmark;
}

export const BEDROOM_LABELS: Record<BedroomType, string> = {
  studio: 'Studio',
  oneBed: '1 Bedroom',
  twoBed: '2 Bedroom',
  threeBed: '3 Bedroom',
};

export const BEDROOM_SHORT_LABELS: Record<BedroomType, string> = {
  studio: 'Studio',
  oneBed: '1B',
  twoBed: '2B',
  threeBed: '3B',
};

export const BEDROOM_DEFAULT_SQFT: Record<BedroomType, number> = {
  studio: 400,
  oneBed: 600,
  twoBed: 850,
  threeBed: 1100,
};

// Size threshold ranges per bedroom type [low, high]
const SIZE_THRESHOLDS: Record<BedroomType, [number, number]> = {
  studio:   [350, 500],
  oneBed:   [500, 700],
  twoBed:   [750, 950],
  threeBed: [950, 1200],
};

export const detachedAduRentBenchmarks: Record<string, Record<string, NeighborhoodData>> = {
  Seattle: {
    Ballard: {
      studio:   { min: 1600, avg: 1850, max: 2100 },
      oneBed:   { min: 1900, avg: 2300, max: 2700 },
      twoBed:   { min: 2600, avg: 3100, max: 3600 },
      threeBed: { min: 3300, avg: 3900, max: 4600 },
    },
    'Capitol Hill': {
      studio:   { min: 1700, avg: 2000, max: 2300 },
      oneBed:   { min: 2100, avg: 2500, max: 3000 },
      twoBed:   { min: 2900, avg: 3400, max: 4100 },
      threeBed: { min: 3600, avg: 4300, max: 5000 },
    },
    'U-District': {
      studio:   { min: 1400, avg: 1650, max: 1900 },
      oneBed:   { min: 1700, avg: 2050, max: 2400 },
      twoBed:   { min: 2300, avg: 2700, max: 3200 },
      threeBed: { min: 3000, avg: 3500, max: 4200 },
    },
    Fremont: {
      studio:   { min: 1500, avg: 1750, max: 2000 },
      oneBed:   { min: 1800, avg: 2150, max: 2500 },
      twoBed:   { min: 2400, avg: 2900, max: 3400 },
      threeBed: { min: 3100, avg: 3700, max: 4300 },
    },
    'West Seattle': {
      studio:   { min: 1300, avg: 1550, max: 1800 },
      oneBed:   { min: 1600, avg: 1950, max: 2300 },
      twoBed:   { min: 2100, avg: 2500, max: 2900 },
      threeBed: { min: 2700, avg: 3200, max: 3800 },
    },
    'Beacon Hill': {
      studio:   { min: 1200, avg: 1450, max: 1700 },
      oneBed:   { min: 1500, avg: 1800, max: 2100 },
      twoBed:   { min: 2000, avg: 2400, max: 2800 },
      threeBed: { min: 2600, avg: 3000, max: 3600 },
    },
  },
};

export const SEATTLE_NEIGHBORHOODS = Object.keys(
  detachedAduRentBenchmarks['Seattle'] ?? {}
);

export function getSizeMultiplier(bedroomType: BedroomType, sqft: number): number {
  const [low, high] = SIZE_THRESHOLDS[bedroomType];
  if (sqft < low) return bedroomType === 'studio' ? 0.90 : 0.92;
  if (sqft > high) return 1.05;
  return 1.0;
}

export interface RentEstimate {
  rent: number;
  base: number;
  multiplier: number;
  explanation: string;
}

export function getEstimatedRent(
  city: string,
  neighborhood: string,
  bedroomType: BedroomType,
  sqft: number,
): RentEstimate {
  const data = detachedAduRentBenchmarks[city]?.[neighborhood]?.[bedroomType];
  if (!data) {
    return { rent: 0, base: 0, multiplier: 1, explanation: 'No data for selected area.' };
  }

  const base = data.avg;
  const multiplier = getSizeMultiplier(bedroomType, sqft);
  const rent = Math.round(base * multiplier);
  const label = BEDROOM_LABELS[bedroomType];
  const [low, high] = SIZE_THRESHOLDS[bedroomType];

  let sizeNote: string;
  const pct = bedroomType === 'studio' ? '10%' : '8%';
  if (sqft < low) sizeNote = `below standard range (< ${low} sqft), −${pct}`;
  else if (sqft > high) sizeNote = `above standard range (> ${high} sqft), +5%`;
  else sizeNote = `within standard range (${low}–${high} sqft)`;

  const explanation =
    `Based on ${neighborhood} ${label} Detached ADU benchmark rent ($${base.toLocaleString()}/mo), ` +
    `adjusted for ${sqft} sqft unit size (${sizeNote}).`;

  return { rent, base, multiplier, explanation };
}

export function calcMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0;
  if (annualRate === 0) return principal / (termYears * 12);
  const r = annualRate / 12;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function newtonIRR(cashFlows: number[]): number | null {
  let rate = 0.1;
  for (let iter = 0; iter < 300; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const df = Math.pow(1 + rate, t);
      npv += cashFlows[t] / df;
      if (t > 0) dnpv -= (t * cashFlows[t]) / (df * (1 + rate));
    }
    if (Math.abs(npv) < 0.001) break;
    if (Math.abs(dnpv) < 1e-12) break;
    const next = rate - npv / dnpv;
    const delta = Math.abs(next - rate);
    rate = Math.max(-0.999, Math.min(50, next));
    if (delta < 1e-9) break;
  }
  if (!isFinite(rate) || isNaN(rate)) return null;
  return rate;
}

export interface ROIInputs {
  monthlyRent: number;
  constructionCost: number;
  downPaymentPct: number;    // 0–1
  loanRatePct: number;       // annual, decimal (e.g. 0.065)
  loanTermYears: number;
  vacancyRatePct: number;    // 0–1
  managementFeePct: number;  // 0–1 of gross rent
  monthlyInsurance: number;
  monthlyMaintenance: number;
  rentGrowthRatePct: number; // annual, decimal
}

export interface ROIResults {
  downPayment: number;
  loanAmount: number;
  monthlyLoanPayment: number;
  monthlyVacancyLoss: number;
  monthlyManagementFee: number;
  monthlyNetCashFlow: number;
  annualNetIncome: number;
  paybackYears: number | null;
  irr5: number | null;
  irr10: number | null;
  irr20: number | null;
}

function annualNetAtYear(inputs: ROIInputs, yr: number, loanPmt: number): number {
  const rent = inputs.monthlyRent * Math.pow(1 + inputs.rentGrowthRatePct, yr - 1);
  const vacLoss = rent * inputs.vacancyRatePct;
  const mgmt = rent * inputs.managementFeePct;
  return (rent - loanPmt - vacLoss - mgmt - inputs.monthlyInsurance - inputs.monthlyMaintenance) * 12;
}

export function calculateROI(inputs: ROIInputs): ROIResults {
  const { constructionCost, downPaymentPct, loanRatePct, loanTermYears, monthlyRent, vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance } = inputs;

  const downPayment = Math.round(constructionCost * downPaymentPct);
  const loanAmount = constructionCost - downPayment;
  const loanPmt = calcMonthlyPayment(loanAmount, loanRatePct, loanTermYears);
  const vacancyLoss = monthlyRent * vacancyRatePct;
  const managementFee = monthlyRent * managementFeePct;

  const monthlyNetCashFlow = monthlyRent - loanPmt - vacancyLoss - managementFee - monthlyInsurance - monthlyMaintenance;
  const annualNetIncome = monthlyNetCashFlow * 12;
  const paybackYears = annualNetIncome > 0 && downPayment > 0 ? downPayment / annualNetIncome : null;

  const buildFlows = (years: number): number[] => {
    const flows = [-downPayment];
    for (let yr = 1; yr <= years; yr++) flows.push(annualNetAtYear(inputs, yr, loanPmt));
    return flows;
  };

  const irr5  = downPayment > 0 ? newtonIRR(buildFlows(5))  : null;
  const irr10 = downPayment > 0 ? newtonIRR(buildFlows(10)) : null;
  const irr20 = downPayment > 0 ? newtonIRR(buildFlows(20)) : null;

  return {
    downPayment,
    loanAmount,
    monthlyLoanPayment: loanPmt,
    monthlyVacancyLoss: vacancyLoss,
    monthlyManagementFee: managementFee,
    monthlyNetCashFlow,
    annualNetIncome,
    paybackYears,
    irr5,
    irr10,
    irr20,
  };
}

export function generateCumulativeCashFlows(inputs: ROIInputs, years = 20): { year: number; cumulative: number; annual: number }[] {
  const loanPmt = calcMonthlyPayment(
    inputs.constructionCost * (1 - inputs.downPaymentPct),
    inputs.loanRatePct,
    inputs.loanTermYears,
  );
  const rows: { year: number; cumulative: number; annual: number }[] = [{ year: 0, cumulative: 0, annual: 0 }];
  let cum = 0;
  for (let yr = 1; yr <= years; yr++) {
    const annual = annualNetAtYear(inputs, yr, loanPmt);
    cum += annual;
    rows.push({ year: yr, cumulative: Math.round(cum), annual: Math.round(annual) });
  }
  return rows;
}

export interface BedroomComparison {
  bedroomType: BedroomType;
  label: string;
  shortLabel: string;
  estimatedRent: number;
  monthlyNet: number;
  annualNet: number;
  payback: number | null;
  irr10: number | null;
}

export function getBedroomComparisonData(
  city: string,
  neighborhood: string,
  sqft: number,
  baseInputs: Omit<ROIInputs, 'monthlyRent'>,
): BedroomComparison[] {
  const types: BedroomType[] = ['studio', 'oneBed', 'twoBed', 'threeBed'];
  return types.map((bType) => {
    const { rent } = getEstimatedRent(city, neighborhood, bType, sqft);
    const roi = calculateROI({ ...baseInputs, monthlyRent: rent });
    return {
      bedroomType: bType,
      label: BEDROOM_LABELS[bType],
      shortLabel: BEDROOM_SHORT_LABELS[bType],
      estimatedRent: rent,
      monthlyNet: Math.round(roi.monthlyNetCashFlow),
      annualNet: Math.round(roi.annualNetIncome),
      payback: roi.paybackYears,
      irr10: roi.irr10,
    };
  });
}

export interface ExitScenario {
  years: number;
  label: string;
  cumulativeRent: number;
  cumulativeNetCashFlow: number;
  irr: number | null;
}

export function getExitScenarios(inputs: ROIInputs): ExitScenario[] {
  const loanPmt = calcMonthlyPayment(
    inputs.constructionCost * (1 - inputs.downPaymentPct),
    inputs.loanRatePct,
    inputs.loanTermYears,
  );
  const downPayment = inputs.constructionCost * inputs.downPaymentPct;

  const calc = (years: number): ExitScenario => {
    let cumRent = 0;
    let cumNet = 0;
    const flows = [-downPayment];
    for (let yr = 1; yr <= years; yr++) {
      const rent = inputs.monthlyRent * Math.pow(1 + inputs.rentGrowthRatePct, yr - 1);
      const annual = annualNetAtYear(inputs, yr, loanPmt);
      cumRent += rent * 12;
      cumNet += annual;
      flows.push(annual);
    }
    return {
      years,
      label: `${years}-Year Hold`,
      cumulativeRent: Math.round(cumRent),
      cumulativeNetCashFlow: Math.round(cumNet),
      irr: downPayment > 0 ? newtonIRR(flows) : null,
    };
  };

  return [calc(5), calc(10), calc(20)];
}
