import { useEffect, useState } from "react";

// Rates format: units of that currency per 1 USD  (same as open.er-api.com)
// e.g. NGN: 1540 means 1 USD = 1540 NGN  →  toUSD: amount / rate
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  NGN: 1540,
  GBP: 0.79,
  EUR: 0.93,
  GHS: 15.5,
  KES: 129,
  ZAR: 18.2,
  CAD: 1.35,
  AUD: 1.54,
};

const CACHE_KEY = "exchange_rates_v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface RatesCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

interface UseExchangeRatesResult {
  rates: Record<string, number>;
  ratesLoading: boolean;
  ratesFallback: boolean; // true when using static fallback due to fetch failure
}

export function useExchangeRates(): UseExchangeRatesResult {
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesFallback, setRatesFallback] = useState(false);

  useEffect(() => {
    // Check localStorage cache first
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: RatesCache = JSON.parse(raw);
        if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          setRates(cached.rates);
          setRatesLoading(false);
          return;
        }
      }
    } catch {
      // Corrupted cache — ignore and fetch fresh
      localStorage.removeItem(CACHE_KEY);
    }

    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => {
        if (!res.ok) throw new Error("Network error");
        return res.json();
      })
      .then((data) => {
        if (data.result !== "success" || !data.rates) throw new Error("Bad response");
        const fetched: Record<string, number> = data.rates;
        const cache: RatesCache = { rates: fetched, fetchedAt: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        setRates(fetched);
        setRatesFallback(false);
      })
      .catch(() => {
        setRates(FALLBACK_RATES);
        setRatesFallback(true);
      })
      .finally(() => setRatesLoading(false));
  }, []);

  return { rates, ratesLoading, ratesFallback };
}
