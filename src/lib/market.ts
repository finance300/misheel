const KEY = import.meta.env.VITE_FINNHUB_API_KEY;

export const isMarketConfigured = Boolean(KEY);

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
