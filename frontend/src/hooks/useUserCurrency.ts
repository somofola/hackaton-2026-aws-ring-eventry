import { useEffect, useState } from "react";

// Map country codes to currencies
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // USD countries
  US: "USD", UM: "USD", AS: "USD", GU: "USD", MH: "USD", FM: "USD", MP: "USD", PW: "USD", PR: "USD", VI: "USD",
  // EUR countries
  AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", FI: "EUR", FR: "EUR", DE: "EUR", GR: "EUR", IE: "EUR", IT: "EUR",
  LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR", AD: "EUR",
  MC: "EUR", SM: "EUR", VA: "EUR", ME: "EUR", XK: "EUR",
  // GBP countries
  GB: "GBP", IM: "GBP", JE: "GBP", GG: "GBP",
  // NGN countries
  NG: "NGN",
  // Other African currencies that might fall back to NGN or USD
  GH: "USD", KE: "USD", ZA: "USD", EG: "USD", MA: "USD", TZ: "USD", UG: "USD", ZM: "USD", ZW: "USD",
};

// Supported currencies in the system
const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "NGN"];

const CACHE_KEY = "user_currency_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CurrencyCache {
  currency: string;
  countryCode: string;
  detectedAt: number;
}

interface UseUserCurrencyResult {
  currency: string;
  countryCode: string | null;
  loading: boolean;
  setCurrency: (currency: string) => void;
}

export function useUserCurrency(): UseUserCurrencyResult {
  const [currency, setCurrencyState] = useState<string>("USD");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage cache first
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CurrencyCache = JSON.parse(raw);
        if (Date.now() - cached.detectedAt < CACHE_TTL_MS) {
          setCurrencyState(cached.currency);
          setCountryCode(cached.countryCode);
          setLoading(false);
          return;
        }
      }
    } catch {
      localStorage.removeItem(CACHE_KEY);
    }

    // Fetch user's country via IP geolocation
    fetch("https://ipapi.co/json/")
      .then((res) => {
        if (!res.ok) throw new Error("Network error");
        return res.json();
      })
      .then((data) => {
        const country = data.country_code || data.country || "US";
        let detectedCurrency = COUNTRY_TO_CURRENCY[country] || "USD";

        // Ensure currency is supported
        if (!SUPPORTED_CURRENCIES.includes(detectedCurrency)) {
          detectedCurrency = "USD";
        }

        const cache: CurrencyCache = {
          currency: detectedCurrency,
          countryCode: country,
          detectedAt: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

        setCurrencyState(detectedCurrency);
        setCountryCode(country);
      })
      .catch(() => {
        // Fallback to USD on error
        setCurrencyState("USD");
        setCountryCode(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    // Update cache with manual selection
    const cache: CurrencyCache = {
      currency: newCurrency,
      countryCode: countryCode || "US",
      detectedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  };

  return { currency, countryCode, loading, setCurrency };
}

// Helper to get price for a specific currency from a price object
export function getPriceForCurrency(
  priceObj: Record<string, { monthly?: number; yearly?: number }> | null | undefined,
  currency: string,
  fallbackCurrency: string = "USD"
): { monthly: number; yearly?: number; currency: string } | null {
  if (!priceObj || typeof priceObj !== "object") return null;

  const upperCurrency = currency.toUpperCase();
  const upperFallback = fallbackCurrency.toUpperCase();

  // Try exact currency match
  if (priceObj[upperCurrency]) {
    return {
      monthly: priceObj[upperCurrency].monthly ?? 0,
      yearly: priceObj[upperCurrency].yearly,
      currency: upperCurrency,
    };
  }

  // Try fallback currency
  if (priceObj[upperFallback]) {
    return {
      monthly: priceObj[upperFallback].monthly ?? 0,
      yearly: priceObj[upperFallback].yearly,
      currency: upperFallback,
    };
  }

  // Use first available currency
  const firstKey = Object.keys(priceObj)[0];
  if (firstKey && priceObj[firstKey]) {
    return {
      monthly: priceObj[firstKey].monthly ?? 0,
      yearly: priceObj[firstKey].yearly,
      currency: firstKey,
    };
  }

  return null;
}
