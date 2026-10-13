/** Versioned estimates. Rates are policy inputs, never invoices or payment instructions. */
export interface AiPriceRate {
  provider: string;
  model: string;
  currency: string;
  inputPerMillion: number;
  outputPerMillion: number;
}
export interface AiPriceCatalog {
  version: string;
  rates: AiPriceRate[];
}
export interface AiPriceSnapshot extends AiPriceRate {
  version: string;
  match: 'model' | 'provider-estimate';
}

/** Compatibility estimates from the old executor, explicitly labeled as provider-wide estimates. */
const LEGACY_CATALOG: AiPriceCatalog = {
  version: 'legacy-provider-estimate-v1',
  rates: [
    {
      provider: 'gemini',
      model: '*',
      currency: 'USD',
      inputPerMillion: 0.5,
      outputPerMillion: 1.5,
    },
    {
      provider: 'openai',
      model: '*',
      currency: 'USD',
      inputPerMillion: 30,
      outputPerMillion: 60,
    },
    {
      provider: 'claude',
      model: '*',
      currency: 'USD',
      inputPerMillion: 15,
      outputPerMillion: 75,
    },
  ],
};

export function loadAiPriceCatalog(
  value = process.env.AI_PRICING_CATALOG,
): AiPriceCatalog {
  if (!value)
    return {
      version: LEGACY_CATALOG.version,
      rates: LEGACY_CATALOG.rates.map((rate) => ({ ...rate })),
    };
  let catalog: AiPriceCatalog;
  try {
    catalog = JSON.parse(value);
  } catch {
    throw new Error('AI_PRICING_INVALID');
  }
  if (
    !catalog ||
    typeof catalog.version !== 'string' ||
    !/^[a-zA-Z0-9._-]{1,80}$/.test(catalog.version) ||
    !Array.isArray(catalog.rates) ||
    !catalog.rates.length
  )
    throw new Error('AI_PRICING_INVALID');
  const seen = new Set<string>();
  for (const rate of catalog.rates) {
    if (
      !rate ||
      typeof rate.provider !== 'string' ||
      !/^[a-z0-9_-]{1,20}$/.test(rate.provider) ||
      typeof rate.model !== 'string' ||
      !rate.model ||
      rate.model.length > 100 ||
      !/^[A-Z]{3}$/.test(rate.currency) ||
      !Number.isFinite(rate.inputPerMillion) ||
      rate.inputPerMillion < 0 ||
      !Number.isFinite(rate.outputPerMillion) ||
      rate.outputPerMillion < 0
    )
      throw new Error('AI_PRICING_INVALID');
    const key = `${rate.provider}|${rate.model}`;
    if (seen.has(key)) throw new Error('AI_PRICING_INVALID');
    seen.add(key);
  }
  return {
    version: catalog.version,
    rates: catalog.rates.map(
      ({ provider, model, currency, inputPerMillion, outputPerMillion }) => ({
        provider,
        model,
        currency,
        inputPerMillion,
        outputPerMillion,
      }),
    ),
  };
}

export function resolveAiPrice(
  catalog: AiPriceCatalog,
  provider: string,
  model: string,
): AiPriceSnapshot {
  const exact = catalog.rates.find(
    (rate) => rate.provider === provider && rate.model === model,
  );
  const rate =
    exact ??
    catalog.rates.find(
      (rate) => rate.provider === provider && rate.model === '*',
    );
  if (!rate) throw new Error('AI_PRICING_NOT_CONFIGURED');
  // Existing cost quota/aggregate/billing has one USD unit. Do not silently mix currencies.
  if (rate.currency !== 'USD')
    throw new Error('AI_PRICING_CURRENCY_UNSUPPORTED');
  return {
    ...rate,
    version: catalog.version,
    match: exact ? 'model' : 'provider-estimate',
  };
}

export function estimateAiCost(
  rate: AiPriceSnapshot,
  promptTokens: number,
  completionTokens: number,
): number {
  if (
    ![promptTokens, completionTokens].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    )
  )
    throw new Error('AI_USAGE_INVALID');
  const value =
    (promptTokens * rate.inputPerMillion +
      completionTokens * rate.outputPerMillion) /
    1_000_000;
  if (!Number.isFinite(value) || value > 999_999_999_999)
    throw new Error('AI_USAGE_INVALID');
  return Math.round(value * 1e8) / 1e8;
}
