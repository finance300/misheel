const KEY = import.meta.env.VITE_FINNHUB_API_KEY;

export const isMarketConfigured = Boolean(KEY);

// ----- Historical price series (featured chart) ----------------------------
// Finnhub's free tier has no historical candles, so the interactive chart uses
// Twelve Data (CORS-friendly, free) with SPY as an S&P 500 proxy.
const TD_KEY = import.meta.env.VITE_TWELVEDATA_API_KEY;
export const isSeriesConfigured = Boolean(TD_KEY);

export type ChartRange = "1D" | "1M" | "3M" | "1Y" | "5Y" | "All";
export type ChartSeries = {
  points: number[];
  times: string[];
  last: number;
  changeAbs: number;
  changePct: number;
};

const RANGE_PARAMS: Record<ChartRange, { interval: string; outputsize: number }> = {
  "1D": { interval: "5min", outputsize: 78 },
  "1M": { interval: "1day", outputsize: 22 },
  "3M": { interval: "1day", outputsize: 66 },
  "1Y": { interval: "1day", outputsize: 252 },
  "5Y": { interval: "1week", outputsize: 260 },
  All: { interval: "1month", outputsize: 360 }
};

type TdRow = { datetime?: string; close?: string };

/** Real SPY series for a range, or null if unconfigured/unavailable. */
export async function fetchSpxSeries(range: ChartRange): Promise<ChartSeries | null> {
  if (!TD_KEY) return null;
  const { interval, outputsize } = RANGE_PARAMS[range];
  try {
    const res = await fetch(
      `https://api.twelvedata.com/time_series?symbol=SPY&interval=${interval}&outputsize=${outputsize}&apikey=${TD_KEY}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: string; values?: TdRow[] };
    if (!data || data.status === "error" || !Array.isArray(data.values)) return null;
    const rows = data.values.slice().reverse(); // API returns newest-first
    const points: number[] = [];
    const times: string[] = [];
    for (const r of rows) {
      const c = Number(r.close);
      if (Number.isFinite(c)) {
        points.push(c);
        times.push(String(r.datetime ?? ""));
      }
    }
    if (points.length < 2) return null;
    const first = points[0];
    const last = points[points.length - 1];
    return { points, times, last, changeAbs: last - first, changePct: ((last - first) / first) * 100 };
  } catch {
    return null;
  }
}

export type Quote = { label: string; value: string; change: number };

// Free Finnhub quotes support US-listed stocks/ETFs. We use index-tracking ETFs
// as proxies for the indices (true index symbols are premium-only).
const SYMBOLS: Array<{ symbol: string; label: string }> = [
  // Index-tracking ETFs (real index funds; true index symbols are premium-only).
  { symbol: "SPY", label: "SPY" }, // S&P 500
  { symbol: "QQQ", label: "QQQ" }, // Nasdaq 100
  { symbol: "DIA", label: "DIA" }, // Dow Jones
  { symbol: "IWM", label: "IWM" }, // Russell 2000
  { symbol: "EWJ", label: "EWJ" }, // Japan
  { symbol: "EWH", label: "EWH" }, // Hong Kong
  // Blue-chip stocks.
  { symbol: "AAPL", label: "AAPL" },
  { symbol: "MSFT", label: "MSFT" },
  { symbol: "NVDA", label: "NVDA" },
  { symbol: "AMZN", label: "AMZN" },
  { symbol: "GOOGL", label: "GOOGL" },
  { symbol: "META", label: "META" },
  { symbol: "TSLA", label: "TSLA" },
  { symbol: "JPM", label: "JPM" }
];

type FinnhubQuote = { c?: number; dp?: number };

/** Live price per symbol (skips any Finnhub can't price). Empty if no key. */
export async function fetchPrices(symbols: string[]): Promise<Record<string, number>> {
  if (!KEY || symbols.length === 0) return {};
  const results = await Promise.all(
    symbols.map(async (sym): Promise<readonly [string, number] | null> => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${KEY}`
        );
        if (!res.ok) return null;
        const data = (await res.json()) as FinnhubQuote;
        if (typeof data.c === "number" && data.c > 0) return [sym, data.c] as const;
        return null;
      } catch {
        return null;
      }
    })
  );
  return Object.fromEntries(results.filter((r): r is readonly [string, number] => r !== null));
}

// ----- Regional market overview (Home page) --------------------------------
// Free Finnhub only prices US-listed symbols, so each region is represented by
// a liquid US-listed ETF proxy. Every entry carries a representative fallback
// value/change so the overview always renders, even with no API key.

export type RegionKey = "asia" | "us" | "europe";
export type IndexQuote = {
  labelMn: string;
  labelEn: string;
  sub: string;
  value: string;
  change: number;
};
export type MarketOverview = Record<RegionKey, IndexQuote[]>;

type OverviewDef = {
  symbol: string;
  labelMn: string;
  labelEn: string;
  sub: string;
  value: string;
  change: number;
};

const OVERVIEW_DEFS: Record<RegionKey, OverviewDef[]> = {
  asia: [
    { symbol: "EWJ", labelMn: "Япон", labelEn: "Japan", sub: "Nikkei · EWJ", value: "73.45", change: 0.61 },
    { symbol: "EWH", labelMn: "Хонг Конг", labelEn: "Hong Kong", sub: "Hang Seng · EWH", value: "18.92", change: -0.34 },
    { symbol: "MCHI", labelMn: "Хятад", labelEn: "China", sub: "MSCI China · MCHI", value: "54.18", change: 0.22 },
    { symbol: "EWY", labelMn: "Өмнөд Солонгос", labelEn: "South Korea", sub: "KOSPI · EWY", value: "62.07", change: 0.45 }
  ],
  us: [
    { symbol: "SPY", labelMn: "S&P 500", labelEn: "S&P 500", sub: "SPY", value: "744.39", change: -0.31 },
    { symbol: "QQQ", labelMn: "Nasdaq 100", labelEn: "Nasdaq 100", sub: "QQQ", value: "512.66", change: -0.42 },
    { symbol: "DIA", labelMn: "Dow Jones", labelEn: "Dow Jones", sub: "DIA", value: "398.12", change: 0.27 }
  ],
  europe: [
    { symbol: "VGK", labelMn: "Европ", labelEn: "Europe", sub: "STOXX · VGK", value: "72.31", change: 0.18 },
    { symbol: "EWU", labelMn: "Их Британи", labelEn: "United Kingdom", sub: "FTSE 100 · EWU", value: "38.94", change: 0.12 },
    { symbol: "EWG", labelMn: "Герман", labelEn: "Germany", sub: "DAX · EWG", value: "36.55", change: -0.21 }
  ]
};

const REGION_KEYS: RegionKey[] = ["asia", "us", "europe"];

function toIndexQuote(d: OverviewDef): IndexQuote {
  return { labelMn: d.labelMn, labelEn: d.labelEn, sub: d.sub, value: d.value, change: d.change };
}

export function marketOverviewFallback(): MarketOverview {
  return {
    asia: OVERVIEW_DEFS.asia.map(toIndexQuote),
    us: OVERVIEW_DEFS.us.map(toIndexQuote),
    europe: OVERVIEW_DEFS.europe.map(toIndexQuote)
  };
}

/** Live regional overview via ETF proxies; falls back per-symbol on any failure. */
export async function fetchMarketOverview(): Promise<MarketOverview> {
  if (!KEY) return marketOverviewFallback();
  const result = {} as MarketOverview;
  for (const region of REGION_KEYS) {
    result[region] = await Promise.all(
      OVERVIEW_DEFS[region].map(async (d): Promise<IndexQuote> => {
        try {
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${d.symbol}&token=${KEY}`
          );
          if (!res.ok) return toIndexQuote(d);
          const data = (await res.json()) as FinnhubQuote;
          if (typeof data.c !== "number" || data.c === 0) return toIndexQuote(d);
          return {
            labelMn: d.labelMn,
            labelEn: d.labelEn,
            sub: d.sub,
            value: data.c.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            change: typeof data.dp === "number" ? data.dp : 0
          };
        } catch {
          return toIndexQuote(d);
        }
      })
    );
  }
  return result;
}

// ----- Bank of Mongolia exchange rates (MNT per unit) ----------------------

export type FxRate = { code: string; nameMn: string; nameEn: string; rate: string };

const FX_DEFS: Array<{ code: string; nameMn: string; nameEn: string; rate: number }> = [
  { code: "USD", nameMn: "Америк доллар", nameEn: "US Dollar", rate: 3450 },
  { code: "EUR", nameMn: "Евро", nameEn: "Euro", rate: 3720 },
  { code: "CNY", nameMn: "Хятад юань", nameEn: "Chinese Yuan", rate: 478 },
  { code: "JPY", nameMn: "Японы иен", nameEn: "Japanese Yen", rate: 22.8 },
  { code: "KRW", nameMn: "Солонгос вон", nameEn: "Korean Won", rate: 2.45 },
  { code: "RUB", nameMn: "Оросын рубль", nameEn: "Russian Ruble", rate: 38.5 },
  { code: "GBP", nameMn: "Английн фунт", nameEn: "British Pound", rate: 4350 }
];

function fmtRate(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function bomRatesFallback(): FxRate[] {
  return FX_DEFS.map((d) => ({ code: d.code, nameMn: d.nameMn, nameEn: d.nameEn, rate: fmtRate(d.rate) }));
}

/**
 * Live MNT exchange rates via open.er-api.com (keyless, CORS-enabled). The API
 * is USD-based, so cross rates are derived: MNT per CUR = (MNT/USD) / (CUR/USD).
 * Returns representative fallback values on any failure.
 */
export async function fetchBoMRates(): Promise<FxRate[]> {
  const fallback = bomRatesFallback();
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) return fallback;
    const data = (await res.json()) as { rates?: Record<string, number> };
    const r = data?.rates;
    if (!r || !r.MNT) return fallback;
    const mntPerUsd = r.MNT;
    return FX_DEFS.map((d) => {
      const perUsd = d.code === "USD" ? 1 : r[d.code];
      const mnt = perUsd && perUsd > 0 ? mntPerUsd / perUsd : d.rate;
      return { code: d.code, nameMn: d.nameMn, nameEn: d.nameEn, rate: fmtRate(mnt) };
    });
  } catch {
    return fallback;
  }
}

/** Live price + daily % change for one symbol (Finnhub). null if unavailable. */
export async function fetchQuote(symbol: string): Promise<{ price: number; changePct: number } | null> {
  if (!KEY) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${KEY}`
    );
    if (!res.ok) return null;
    const d = (await res.json()) as FinnhubQuote;
    if (typeof d.c !== "number" || d.c === 0) return null;
    return { price: d.c, changePct: typeof d.dp === "number" ? d.dp : 0 };
  } catch {
    return null;
  }
}

/** Live percent-change (Finnhub `dp`) for a set of symbols. {} if unconfigured. */
export async function fetchChanges(symbols: string[]): Promise<Record<string, number>> {
  if (!KEY || symbols.length === 0) return {};
  const entries = await Promise.all(
    symbols.map(async (sym): Promise<readonly [string, number] | null> => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${KEY}`
        );
        if (!res.ok) return null;
        const data = (await res.json()) as FinnhubQuote;
        return typeof data.dp === "number" ? ([sym, data.dp] as const) : null;
      } catch {
        return null;
      }
    })
  );
  return Object.fromEntries(entries.filter((e): e is readonly [string, number] => e !== null));
}

// ----- Crypto metric cards (CoinGecko, keyless + CORS) ---------------------
export type CryptoStat = {
  code: string;
  nameMn: string;
  nameEn: string;
  value: string;
  change: number;
  series: number[];
};

function fmtCompactUsd(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(0)}B`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const CRYPTO_META: Array<{ id: string; code: string; nameMn: string; nameEn: string }> = [
  { id: "bitcoin", code: "BTC", nameMn: "Биткойн", nameEn: "Bitcoin" },
  { id: "ethereum", code: "ETH", nameMn: "Этериум", nameEn: "Ethereum" },
  { id: "solana", code: "SOL", nameMn: "Солана", nameEn: "Solana" }
];

/** Live crypto: Bitcoin, Ethereum, Solana (price + 24h change + sparkline). */
export async function fetchCrypto(): Promise<CryptoStat[] | null> {
  try {
    const ids = CRYPTO_META.map((c) => c.id).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`
    );
    if (!res.ok) return null;
    const m = (await res.json()) as Array<{
      id: string;
      current_price: number;
      price_change_percentage_24h: number;
      sparkline_in_7d?: { price?: number[] };
    }>;
    const byId = Object.fromEntries((Array.isArray(m) ? m : []).map((c) => [c.id, c]));
    const out: CryptoStat[] = [];
    for (const meta of CRYPTO_META) {
      const c = byId[meta.id];
      if (!c) return null;
      out.push({
        code: meta.code,
        nameMn: meta.nameMn,
        nameEn: meta.nameEn,
        value: fmtCompactUsd(c.current_price),
        change: c.price_change_percentage_24h ?? 0,
        series: c.sparkline_in_7d?.price ?? []
      });
    }
    return out;
  } catch {
    return null;
  }
}

/** Fetch a live quote per symbol; skips any that fail. Returns [] if unconfigured. */
export async function fetchQuotes(): Promise<Quote[]> {
  if (!KEY) return [];
  const results = await Promise.all(
    SYMBOLS.map(async ({ symbol, label }): Promise<Quote | null> => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${KEY}`
        );
        if (!res.ok) return null;
        const data = (await res.json()) as FinnhubQuote;
        if (typeof data.c !== "number" || data.c === 0) return null;
        return {
          label,
          value: data.c.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          change: typeof data.dp === "number" ? data.dp : 0
        };
      } catch {
        return null;
      }
    })
  );
  return results.filter((q): q is Quote => q !== null);
}
