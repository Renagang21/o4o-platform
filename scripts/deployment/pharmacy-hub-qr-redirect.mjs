/** Generate a reviewable phase-one URL map. This script never contacts or mutates GCP. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const printedQrPaths = ['/qr/*', '/tablet/*', '/multilingual-products/*', '/foreign-visitor/affiliate/*'];
export function prepareQrRedirect(input) {
  const map = structuredClone(input);
  const matchers = map.pathMatchers?.filter(m => m.name === 'path-matcher-pharmacy-hub') ?? [];
  if (matchers.length !== 1) throw new Error('Exactly one PharmacyHub path matcher is required.');
  const matcher = matchers[0];
  if (!matcher.defaultService || matcher.defaultUrlRedirect || matcher.defaultRouteAction || matcher.routeRules?.length) throw new Error('Unexpected PharmacyHub route state; review the live map first.');
  const existing = matcher.pathRules ?? [];
  if (existing.some(r => r.paths?.some(p => printedQrPaths.includes(p) || p === '/*'))) throw new Error('Existing QR or catch-all rule requires manual review.');
  matcher.pathRules = [...existing, { paths: printedQrPaths, urlRedirect: {
    hostRedirect: 'pharmacy.neture.co.kr', httpsRedirect: true, redirectResponseCode: 'FOUND', stripQuery: false,
  } }];
  // Export-only API fields are not accepted on import. Keep all actual routing and host rules.
  for (const key of ['id', 'creationTimestamp', 'selfLink', 'fingerprint', 'kind']) delete map[key];
  return map;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath || inputPath === outputPath) throw new Error('Usage: node scripts/deployment/pharmacy-hub-qr-redirect.mjs exported-map.json review-map.json');
  const raw = await readFile(inputPath, 'utf8');
  const draft = prepareQrRedirect(JSON.parse(raw));
  await writeFile(outputPath, JSON.stringify(draft, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ action: 'draft-only', inputSha256: createHash('sha256').update(raw).digest('hex'), response: 302, queryPreserved: true, paths: printedQrPaths, output: outputPath }));
}
