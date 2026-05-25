// Live NAV calculation, mirroring the formulas in the workbook
// (Copy of Misheel Fund Calculation FOR APP.xlsx).
//
// Identity:
//   Net Assets = ΣEquities(MNT) + ΣBonds(MNT) + Cash(MNT) − Liabilities
//   NAV/unit   = Net Assets / Total Units Outstanding

import fundNav from "./fund-nav.json";

type RawEquity = {
  ticker: string;
  currency: string;
  type: string;
  qty: number | null;
  price: number | null;
  costBasis: number | null;
  avgPrice: number | null;
  mcap: number | null;
  unrealizedPnL: number | null;
  unrealizedPnLPct: number | null;
  mcapMnt: number | null;
  allocationPct: number | null;
};

type RawBond = {
  ticker: string;
  qty: number | null;
  costBasis: number | null;
  avgPrice: number | null;
  yield: number | null;
  initialDate: string | null;
  calcDate: string | null;
  interestAmount: number | null;
  totalValue: number | null;
  allocationPct: number | null;
};

type RawCash = {
  label: string;
  currency: string;
  amount: number | null;
  mntValue: number | null;
};

export type FxRates = Record<string, number>;

const fxRates: FxRates = fundNav.fxRates as FxRates;
const equitiesRaw = fundNav.equities as RawEquity[];
const bondsRaw = fundNav.bonds as RawBond[];
const cashRaw = fundNav.cash as RawCash[];

export function fxToMnt(currency: string, amount: number): number {
  const rate = fxRates[currency] ?? 1;
  return amount * rate;
}

// Equity options have a 100-share contract multiplier in this workbook.
function contractSize(type: string): number {
  return type === "Option" ? 100 : 1;
}

export function equityMcapMnt(eq: { currency: string; type: string; qty: number | null; price: number | null }): number {
  return fxToMnt(eq.currency, (eq.qty ?? 0) * (eq.price ?? 0) * contractSize(eq.type));
}

// Simple-interest bond accrual: interest = costBasis × yield × (days / 365)
export function bondAccruedInterest(bond: {
  costBasis: number | null;
  yield: number | null;
  initialDate: string | null;
  calcDate: string | null;
}, asOf?: string): number {
  if (!bond.initialDate || !bond.costBasis || !bond.yield) return 0;
  const end = asOf ?? bond.calcDate;
  if (!end) return 0;
  const days = (new Date(end).getTime() - new Date(bond.initialDate).getTime()) / 86_400_000;
  return bond.costBasis * bond.yield * (days / 365);
}

export function bondTotalValue(bond: RawBond, asOf?: string): number {
  return (bond.costBasis ?? 0) + bondAccruedInterest(bond, asOf);
}

// --- Live totals ---
function compute(asOf?: string) {
  const totalEquities = equitiesRaw.reduce((sum, e) => sum + equityMcapMnt(e), 0);
  const totalBonds = bondsRaw.reduce((sum, b) => sum + bondTotalValue(b, asOf), 0);
  const totalCash = cashRaw
    .filter((c) => c.label !== "Total Cash Value")
    .reduce((sum, c) => sum + fxToMnt(c.currency, c.amount ?? 0), 0);
  const liabilities = fundNav.liabilities.total;
  const netAssets = totalEquities + totalBonds + totalCash - liabilities;
  const totalUnits = fundNav.summary.totalUnits ?? 1;
  const navPerUnit = netAssets / totalUnits;
  return { totalEquities, totalBonds, totalCash, liabilities, netAssets, totalUnits, navPerUnit };
}

export const fundCalc = compute();
export { compute as recomputeFund };

export const fundInputs = {
  fxRates,
  equities: equitiesRaw,
  bonds: bondsRaw,
  cash: cashRaw,
  liabilities: fundNav.liabilities,
  summary: fundNav.summary,
};
