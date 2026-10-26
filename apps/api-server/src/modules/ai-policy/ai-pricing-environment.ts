/** Validate the existing optional-env output; never read credentials or invoke Cloud Run/providers. */
import { writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { readAiPricingFile, AI_PRICING_FILE_MAX_BYTES } from './ai-pricing-files.js';
import { loadAiPriceCatalog, resolveAiPrice } from './ai-pricing.js';
import { observeAiPricingCatalog } from './ai-pricing-observation.js';

const invalid = (): never => { throw new Error('AI_PRICING_ENV_INVALID'); };
export function validateAiPricingEnvironmentFlags(input: string) {
  if (Buffer.byteLength(input) > AI_PRICING_FILE_MAX_BYTES) return invalid();
  if (!input) return { state: 'omitted' as const, flags: '', pricing: observeAiPricingCatalog('') };
  const flags = input.split('\0');
  if (flags.length !== 2 || flags[1] !== '') return invalid();
  const match = /^--set-env-vars=(?:\^([A-Za-z0-9_@-]{1,100})\^)?AI_PRICING_CATALOG=([\s\S]+)$/.exec(flags[0]);
  if (!match || (match[1] ? match[2].includes(match[1]) : match[2].includes(','))) return invalid();
  const catalog = loadAiPriceCatalog(match[2]);
  // Forward only the parser's known catalog contract, not unrelated fields hidden in configuration JSON.
  if (!isDeepStrictEqual(JSON.parse(match[2]), catalog)) return invalid();
  // Reuse the runtime's currency contract; a syntactically valid mixed-currency catalog is not deployable.
  for (const rate of catalog.rates) resolveAiPrice(catalog, rate.provider, rate.model);
  return { state: 'validated' as const, flags: input, pricing: observeAiPricingCatalog(match[2]) };
}

const HELP = `Validate optional AI_PRICING_CATALOG environment flags without deployment
  node --import tsx apps/api-server/src/scripts/ai-pricing-environment.ts --input <candidate-flags> --out <new-validated-flags>
Reads bounded NUL-delimited output from cloud-run-env.mjs. Output is created privately and never overwritten.
An empty input preserves the existing legacy/default behavior; it does not enable native AI.
No provider/DB/credential/Cloud Run calls. Exit 0 = validated/omitted; 2 = invalid input or output.
`;
export async function runAiPricingEnvironmentCli(
  args: readonly string[],
  write: (value: string) => void = value => { process.stdout.write(value); },
): Promise<number> {
  if (args.length === 1 && args[0] === '--help') { write(HELP); return 0; }
  try {
    const options = new Map<string, string>();
    for (let i = 0; i < args.length; i += 2) {
      const flag = args[i], value = args[i + 1];
      if (!['--input', '--out'].includes(flag) || options.has(flag) || !value || value.startsWith('--')) return invalid();
      options.set(flag, value);
    }
    const source = options.get('--input'), out = options.get('--out');
    if (!source || !out) return invalid();
    const result = validateAiPricingEnvironmentFlags((await readAiPricingFile(source)).toString('utf8'));
    await writeFile(out, result.flags, { flag: 'wx', mode: 0o600 });
    write(JSON.stringify({ kind: 'ai-pricing-environment', state: result.state, pricing: result.pricing, applied: false }) + '\n');
    return 0;
  } catch (error) {
    const code = error instanceof Error && ['AI_PRICING_INVALID', 'AI_PRICING_CURRENCY_UNSUPPORTED'].includes(error.message)
      ? error.message : 'AI_PRICING_ENV_INVALID';
    write(JSON.stringify({ kind: 'ai-pricing-environment', state: 'invalid', code, applied: false }) + '\n');
    return 2;
  }
}
