/** File/env input only. Importing this CLI never initializes the application or calls providers. */
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { loadAiPriceCatalog } from './ai-pricing.js';
import { checkAiPricingReadiness, draftAiPriceCatalog, parseAiPricingManifest, parseAiQuotaSnapshot } from './ai-pricing-readiness.js';

interface Options { manifest: string; catalog?: string; quota?: string; draft: boolean }
const invalid = (): never => { throw new Error('AI_PRICING_CHECK_INPUT_INVALID'); };
const HELP = `AI pricing/quota offline configuration check
  node --import tsx apps/api-server/src/scripts/ai-pricing-readiness.ts --manifest <cases.json> [--catalog <catalog.json>] [--quota-snapshot <quota.json>]
  node --import tsx apps/api-server/src/scripts/ai-pricing-readiness.ts --manifest <cases.json> [--catalog <catalog.json>] --draft

Without --catalog, reads only AI_PRICING_CATALOG from this process (no .env loading).
--draft prints an unfinished review document, never approved/default provider prices.
No DB/provider/credential/deployment calls or writes. Snapshot success is not live admission.
Exit: 0 = supplied checks passed / draft produced; 1 = blocked; 2 = invalid input.
`;
function options(args: readonly string[]): Options {
  const values = new Map<string, string>();
  const seen = new Set<string>();
  let draft = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) return invalid();
    seen.add(flag);
    if (flag === '--draft') { draft = true; continue; }
    if (!['--manifest', '--catalog', '--quota-snapshot'].includes(flag)) return invalid();
    const value = args[++i];
    if (!value || value.startsWith('--')) return invalid();
    values.set(flag, value);
  }
  const manifest = values.get('--manifest');
  if (!manifest || (draft && values.has('--quota-snapshot'))) return invalid();
  return { manifest, catalog: values.get('--catalog'), quota: values.get('--quota-snapshot'), draft };
}
const MAX_BYTES = 2 * 1024 * 1024;
async function readJson(path: string): Promise<unknown> {
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > MAX_BYTES) return invalid();
    const bytes = Buffer.alloc(MAX_BYTES + 1);
    let size = 0;
    while (size < bytes.length) {
      const read = await file.read(bytes, size, bytes.length - size, null);
      if (!read.bytesRead) break;
      size += read.bytesRead;
    }
    if (size > MAX_BYTES) return invalid();
    return JSON.parse(bytes.subarray(0, size).toString('utf8'));
  } finally { await file.close(); }
}

export async function runAiPricingReadinessCli(
  args: readonly string[],
  env: Readonly<NodeJS.ProcessEnv> = process.env,
  write: (value: string) => void = value => { process.stdout.write(value); },
): Promise<number> {
  if (args.length === 1 && args[0] === '--help') { write(HELP); return 0; }
  try {
    const opts = options(args);
    const manifest = parseAiPricingManifest(await readJson(opts.manifest));
    const catalog = loadAiPriceCatalog(opts.catalog ? JSON.stringify(await readJson(opts.catalog)) : env.AI_PRICING_CATALOG ?? '');
    if (opts.draft) {
      write(JSON.stringify({ kind: 'price-catalog-draft', approved: false,
        notice: '검토용입니다. null 요율/예산과 TTS 단위를 확정하고 실제 가격 출처·버전을 검토한 뒤 catalog만 사용하세요. 기존 행은 보존하며 wildcard 텍스트 추정치를 native 단가로 복사하지 않습니다.',
        catalog: draftAiPriceCatalog(manifest, catalog) }) + '\n');
      return 0;
    }
    const snapshot = opts.quota ? parseAiQuotaSnapshot(await readJson(opts.quota)) : undefined;
    const report = checkAiPricingReadiness(manifest, catalog, snapshot);
    write(JSON.stringify(report) + '\n');
    return report.status === 'passed' ? 0 : 1;
  } catch (error) {
    const code = error instanceof Error && ['AI_PRICING_INVALID', 'AI_PRICING_NOT_CONFIGURED', 'AI_PRICING_CURRENCY_UNSUPPORTED'].includes(error.message)
      ? error.message : 'AI_PRICING_CHECK_INPUT_INVALID';
    write(JSON.stringify({ kind: 'offline-configuration-check', status: 'invalid-input', code }) + '\n');
    return 2;
  }
}
