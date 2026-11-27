// Live prices from Square, via the checkout Worker's /catalog endpoint.
// Everything here degrades to the build-time prices in data.json when the
// Worker is not configured or unreachable.

export const API_BASE: string = (import.meta.env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');

export interface PriceEntry {
  item: string;
  variation: string;
  amount: number; // cents
  currency: string;
  soldOut?: boolean; // the item's "sold out" switch in Square
}
export type PriceMap = Record<string, PriceEntry>;

const CACHE_KEY = 'flera_prices';
const CACHE_MS = 5 * 60 * 1000;

let pending: Promise<PriceMap> | null = null;

export function loadPrices(): Promise<PriceMap> {
  if (pending) return pending;
  pending = (async () => {
    if (!API_BASE) return {};
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
      if (cached && Date.now() - cached.at < CACHE_MS) return cached.prices as PriceMap;
    } catch {
      // ignore unreadable cache
    }
    try {
      const res = await fetch(`${API_BASE}/catalog`);
      if (!res.ok) return {};
      const prices = (await res.json()) as PriceMap;
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), prices }));
      } catch {
        // ignore
      }
      return prices;
    } catch {
      return {};
    }
  })();
  return pending;
}

/** Dollars for a variation: Square's price if known, otherwise the fallback. */
export function priceOf(prices: PriceMap, variationId: string | undefined, fallback: number): number {
  const entry = variationId ? prices[variationId] : undefined;
  return entry ? entry.amount / 100 : fallback;
}

/** Whether Square has the variation switched to "sold out". */
export function isSoldOut(prices: PriceMap, variationId: string | undefined): boolean {
  return Boolean(variationId && prices[variationId]?.soldOut);
}

export function formatPrice(dollars: number): string {
  return '$' + dollars.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
