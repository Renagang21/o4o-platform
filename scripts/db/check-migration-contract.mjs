#!/usr/bin/env node
/**
 * Migration contract guard (CI)
 * WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1
 *
 * Enforces the bootstrap / incremental separation:
 *   - historical migrations (historical-migrations.manifest.json) are frozen: same file, class, name
 *   - every migration file is either historical or registered in incremental/manifest.ts
 *   - incremental migrations: 13-digit epoch filename prefix == class suffix == name suffix,
 *     strictly increasing, no duplicates, above the cutoff, imported in order
 *   - entrypoints load ONLY the manifest (no glob), API never loads/runs migrations or bootstrap
 *   - the canonical baseline snapshot carries schema only (no data / roles / grants / credentials)
 *
 *   - migration identity (class · declared `name` · runtime name) is taken from the TypeScript AST
 *     (scripts/db/migration-identity.mjs) — never from a repository-wide regex
 *   - historical source files are NOT runtime provenance: legacy production history is verified by
 *     the ordered history fingerprint (incremental/legacy-history-baseline.ts); the repository keeps
 *     no plaintext list of legacy migration names
 *     (WO-O4O-RETIRED-SERVICE-MIGRATION-HISTORY-SQUASH-AND-BASELINE-FINAL-CLOSURE-V1)
 *
 * Usage:
 *   node scripts/db/check-migration-contract.mjs                 check (exit 1 on violation)
 *   node scripts/db/check-migration-contract.mjs --write-historical
 *       verify-only: re-derives every historical entry from source and prints the entries whose
 *       identity fields differ from the JSON manifest (exit 1 when any differ). Writes nothing.
 *   node scripts/db/check-migration-contract.mjs --write-historical --maintenance
 *       explicit maintenance mode (WO only, refused when CI is set): corrects identity fields of
 *       EXISTING historical entries only — never adds, removes or absorbs an incremental migration.
 *   node scripts/db/check-migration-contract.mjs --write-historical --maintenance --baseline-rollover
 *       baseline rollover mode (WO only, refused when CI is set): the ONLY mode in which the
 *       historical set may shrink. Removed source files are accepted only when the new baseline
 *       meta / cutoff / expected states are consistent, no runtime module imports a removed file,
 *       a well-formed legacy history baseline covers the deleted runtime identities, and the
 *       contract checks that follow all pass. Files are never added here (register new
 *       migrations in incremental/manifest.ts).
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMigrationIdentity, MigrationIdentityError } from './migration-identity.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const API = join(REPO, 'apps', 'api-server');
const MIGRATIONS_DIR = join(API, 'src', 'database', 'migrations');
const INCREMENTAL_MANIFEST = join(API, 'src', 'database', 'incremental', 'manifest.ts');
const HISTORICAL_MANIFEST = join(API, 'src', 'database', 'incremental', 'historical-migrations.manifest.json');
const BOOTSTRAP_DIR = join(API, 'src', 'database', 'bootstrap');
const INCREMENTAL_DIR = join(API, 'src', 'database', 'incremental');
const EXPECTED_STATES_TS = join(INCREMENTAL_DIR, 'expected-schema-states.ts');
const LEGACY_BASELINE_TS = join(INCREMENTAL_DIR, 'legacy-history-baseline.ts');
const LEGACY_FINGERPRINT_TS = join(BOOTSTRAP_DIR, 'legacy-history-fingerprint.ts');
/** Plaintext legacy-history-name modules retired by the 2026-09-18-id685 rollover; they must never come back. */
const FORBIDDEN_PLAINTEXT_HISTORY_FILES = ['historical-migration-names.ts', 'legacy-history.facts.ts'];

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const passes = [];
const pass = (id, msg) => passes.push(`[${id}] ${msg}`);

/**
 * Identity of one migration file from its AST. `name` is the TypeORM runtime name
 * (declaredName ?? className). Throws MigrationIdentityError for dynamic / ambiguous identity.
 */
function parseMigrationFile(file) {
  const r = parseMigrationIdentity(read(join(MIGRATIONS_DIR, file)), file);
  return { file, className: r.className, declaredName: r.declaredName, name: r.runtimeName };
}
/** Same, but reports a guard failure instead of throwing. */
function tryParseMigrationFile(id, file) {
  try { return parseMigrationFile(file); } catch (e) {
    fail(id, e instanceof MigrationIdentityError ? `${e.message} [${e.code}]` : `${file}: ${e.message}`);
    return null;
  }
}

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.ts')).sort();

const walkSrc = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== 'migrations') walkSrc(p, out); }
    else if (/\.(ts|mts|cts|js|mjs)$/.test(e.name) && !/\.(spec|test)\./.test(e.name)) out.push(p);
  }
  return out;
};
/** Runtime (non-test) modules that import a given migration file basename. */
function runtimeImportersOf(migrationFile) {
  const base = migrationFile.replace(/\.ts$/, '');
  return walkSrc(join(API, 'src')).filter((p) => stripComments(read(p)).includes(`/migrations/${base}`)).map((p) => p.replace(REPO, ''));
}
function parseLegacyBaseline() {
  if (!existsSync(LEGACY_BASELINE_TS)) return null;
  const src = stripComments(read(LEGACY_BASELINE_TS));
  const num = (k) => Number(new RegExp(`${k}\\s*:\\s*(\\d+)`).exec(src)?.[1]);
  return {
    rowCount: num('rowCount'),
    distinctNameCount: num('distinctNameCount'),
    sha256: /orderedNameSequenceSha256\s*:\s*'([0-9a-f]{64})'/.exec(src)?.[1] ?? null,
    capturedThroughId: num('capturedThroughId'),
    capturedAt: /capturedAt\s*:\s*'(\d{4}-\d{2}-\d{2})'/.exec(src)?.[1] ?? null,
    plaintextNames: [...src.matchAll(/'([A-Z][A-Za-z0-9_]*\d{13,14})'/g)].map((m) => m[1]),
  };
}

// ---- --write-historical (verify-only by default; --maintenance corrects existing entries only)
let writeHistoricalContinued = false;
if (process.argv.includes('--write-historical')) {
  const maintenance = process.argv.includes('--maintenance');
  const rollover = process.argv.includes('--baseline-rollover');
  if (maintenance && process.env.CI) { console.error('refused: --maintenance never runs in CI'); process.exit(1); }
  if (rollover && !maintenance) { console.error('refused: --baseline-rollover requires --maintenance (explicit WO)'); process.exit(1); }
  if (!existsSync(HISTORICAL_MANIFEST)) { console.error('historical-migrations.manifest.json missing — it is created only under an explicit WO, not regenerated here'); process.exit(1); }
  const current = JSON.parse(read(HISTORICAL_MANIFEST));
  const manifestNow = stripComments(read(INCREMENTAL_MANIFEST));
  const incrementalFilesNow = new Set([...manifestNow.matchAll(/from\s+['"]\.\.\/migrations\/([^'"]+?)(?:\.js)?['"]/g)].map((m) => `${m[1]}.ts`));
  const currentFiles = new Set(current.entries.map((e) => e.file));
  const added = files.filter((f) => !currentFiles.has(f) && !incrementalFilesNow.has(f));
  const removed = [...currentFiles].filter((f) => !files.includes(f));
  const absorbed = [...currentFiles].filter((f) => incrementalFilesNow.has(f));
  if (added.length || absorbed.length || (removed.length && !rollover)) {
    console.error(`refused: the historical set itself must not change here (new unregistered ${added.length}, missing ${removed.length}, incremental∩historical ${absorbed.length})`);
    for (const f of added) console.error(`  unregistered migration file (register it in incremental/manifest.ts): ${f}`);
    for (const f of removed) console.error(`  historical file missing${rollover ? '' : ' (only --maintenance --baseline-rollover may drop historical sources)'}: ${f}`);
    for (const f of absorbed) console.error(`  historical AND incremental: ${f}`);
    process.exit(1);
  }
  if (rollover) {
    // ---- baseline rollover gate: historical sources may be dropped only behind a consistent new baseline
    const gate = [];
    const metaNow = read(join(BOOTSTRAP_DIR, 'canonical-schema-baseline.meta.ts'));
    const metaVersion = /baselineVersion\s*:\s*'([^']+)'/.exec(metaNow)?.[1];
    const metaSupersedes = /supersedesBaselineVersion\s*:\s*'([^']+)'/.exec(metaNow)?.[1];
    const cutoffVersion = /baselineVersion\s*:\s*'([^']+)'/.exec(manifestNow)?.[1];
    if (!metaVersion || !/^\d{4}-\d{2}-\d{2}-id\d+$/.test(metaVersion)) gate.push('new baseline meta: baselineVersion missing or not YYYY-MM-DD-id<N>');
    if (!metaSupersedes || metaSupersedes === metaVersion) gate.push('new baseline meta: supersedesBaselineVersion missing or equal to baselineVersion (no rollover happened)');
    if (metaVersion !== cutoffVersion) gate.push(`incremental cutoff baselineVersion '${cutoffVersion}' != meta '${metaVersion}'`);
    const listedNow = (/INCREMENTAL_MIGRATIONS\s*:\s*readonly\s+MigrationClass\[\]\s*=\s*\[([\s\S]*?)\];/.exec(manifestNow)?.[1] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    if (listedNow.length !== incrementalFilesNow.size) gate.push('incremental manifest: listed classes != imported files');
    const statesNow = ((/EXPECTED_SCHEMA_STATES\s*:\s*readonly\s+ExpectedSchemaState\[\]\s*=\s*\[([\s\S]*?)\]\s*as const;/.exec(stripComments(read(EXPECTED_STATES_TS)))?.[1] ?? '').match(/appliedThrough\s*:/g) || []).length;
    if (statesNow !== listedNow.length + 1) gate.push(`expected schema states ${statesNow} != incremental ${listedNow.length} + 1`);
    const lb = parseLegacyBaseline();
    if (!lb || !lb.sha256 || !(lb.rowCount > 0) || !(lb.distinctNameCount > 0) || lb.distinctNameCount > lb.rowCount || !(lb.capturedThroughId >= lb.rowCount) || !lb.capturedAt) gate.push('legacy history baseline missing or malformed (rowCount / distinctNameCount / 64-hex sha256 / capturedThroughId / capturedAt)');
    if (lb && lb.plaintextNames.length) gate.push(`legacy history baseline carries ${lb.plaintextNames.length} plaintext migration name(s)`);
    for (const f of removed) {
      const importers = runtimeImportersOf(f);
      if (importers.length) gate.push(`removed historical source ${f} is still imported by runtime module(s): ${importers.join(', ')}`);
    }
    const removedIdentities = removed.map((f) => current.entries.find((e) => e.file === f)?.name).filter(Boolean);
    console.log(`baseline rollover ${metaSupersedes ?? '?'} -> ${metaVersion ?? '?'}: dropping ${removed.length} historical source(s) / ${removedIdentities.length} runtime identities, covered by legacy history fingerprint (${lb?.rowCount ?? '?'} rows, ${lb?.sha256?.slice(0, 12) ?? '?'}…)`);
    if (gate.length) {
      console.error('refused: baseline rollover gate failed');
      for (const g of gate) console.error(`  ${g}`);
      process.exit(1);
    }
  }
  const FIELDS = ['className', 'declaredName', 'name'];
  const corrected = [];
  const retainedEntries = current.entries.filter((e) => files.includes(e.file));
  const entries = retainedEntries.map((e) => {
    const p = parseMigrationFile(e.file); // throws on dynamic / ambiguous identity — never guessed
    const diffs = FIELDS.filter((k) => (e[k] ?? null) !== p[k]);
    if (diffs.length) corrected.push({ file: e.file, diffs: diffs.map((k) => `${k}: ${JSON.stringify(e[k] ?? null)} -> ${JSON.stringify(p[k])}`) });
    return { file: e.file, className: p.className, declaredName: p.declaredName, name: p.name };
  });
  for (const c of corrected) console.log(`${maintenance ? 'correct' : 'would correct'} ${c.file}\n    ${c.diffs.join('\n    ')}`);
  console.log(`historical entries ${entries.length} · identity corrections ${corrected.length} · removed ${removed.length}`);
  if (!maintenance) {
    if (corrected.length) { console.error('verify-only: nothing written (re-run with --maintenance under an explicit WO)'); process.exit(1); }
    process.exit(0);
  }
  writeFileSync(HISTORICAL_MANIFEST, JSON.stringify({
    $comment: 'GENERATED by scripts/db/check-migration-contract.mjs --write-historical --maintenance (identity from the TypeScript AST, scripts/db/migration-identity.mjs). Identity freeze of the RETAINED historical migration source files only: never replayed, never bulk-inserted, never renamed, never runtime provenance (legacy production history is verified by the ordered history fingerprint in legacy-history-baseline.ts). Entries are only ever corrected under an explicit WO; the set shrinks only through --baseline-rollover.',
    count: entries.length,
    entries,
  }, null, 2) + '\n');
  console.log(`wrote ${HISTORICAL_MANIFEST} (${entries.length} entries)`);
  // maintenance writes are only complete when the contract below passes on the written state
  writeHistoricalContinued = true;
}

// ---- C01 historical manifest exists and is well-formed
if (!existsSync(HISTORICAL_MANIFEST)) {
  fail('C01', 'historical-migrations.manifest.json missing');
}
const historical = existsSync(HISTORICAL_MANIFEST) ? JSON.parse(read(HISTORICAL_MANIFEST)) : { entries: [] };
const historicalByFile = new Map(historical.entries.map((e) => [e.file, e]));
if (historical.count !== historical.entries.length) fail('C01', `historical count ${historical.count} != entries ${historical.entries.length}`);
else pass('C01', `historical manifest ${historical.entries.length} entries`);

// ---- C02 every historical entry still exists with the same class / declaredName / runtime name
//      (rename, class change, adding/removing/changing an explicit `name`, dynamic identity: all forbidden)
let c02 = 0;
for (const e of historical.entries) {
  if (!existsSync(join(MIGRATIONS_DIR, e.file))) { fail('C02', `historical file removed or renamed: ${e.file}`); continue; }
  const p = tryParseMigrationFile('C02', e.file);
  if (!p) continue;
  if (!('declaredName' in e)) fail('C02', `${e.file}: manifest entry lacks declaredName (run --write-historical --maintenance under an explicit WO)`);
  else if (p.className !== e.className) fail('C02', `${e.file}: class '${p.className}' != manifest '${e.className}'`);
  else if (p.declaredName !== e.declaredName) fail('C02', `${e.file}: declaredName ${JSON.stringify(p.declaredName)} != manifest ${JSON.stringify(e.declaredName)}`);
  else if (p.name !== e.name) fail('C02', `${e.file}: runtime name '${p.name}' != manifest '${e.name}'`);
  else c02 += 1;
}
if (c02 === historical.entries.length) pass('C02', `historical file/class/declaredName/runtime name frozen (${c02})`);

// ---- C03 incremental manifest parses
const manifestSrc = stripComments(read(INCREMENTAL_MANIFEST));
const imports = [...manifestSrc.matchAll(/import\s+\{\s*([A-Za-z0-9_]+)\s*\}\s+from\s+['"]\.\.\/migrations\/([^'"]+?)(?:\.js)?['"]/g)]
  .map((m) => ({ className: m[1], file: `${m[2]}.ts` }));
const arrayMatch = /INCREMENTAL_MIGRATIONS\s*:\s*readonly\s+MigrationClass\[\]\s*=\s*\[([\s\S]*?)\];/.exec(manifestSrc);
if (!arrayMatch) fail('C03', 'INCREMENTAL_MIGRATIONS array not found in manifest.ts');
const listed = arrayMatch ? arrayMatch[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
const minEpoch = Number(/minimumEpoch13\s*:\s*(\d+)/.exec(manifestSrc)?.[1]);
const manifestBaseline = /baselineVersion\s*:\s*'([^']+)'/.exec(manifestSrc)?.[1];
if (!Number.isFinite(minEpoch) || String(minEpoch).length !== 13) fail('C03', 'INCREMENTAL_MIGRATION_CUTOFF.minimumEpoch13 missing or not 13 digits');
if (!manifestBaseline) fail('C03', 'INCREMENTAL_MIGRATION_CUTOFF.baselineVersion missing');
if (arrayMatch && Number.isFinite(minEpoch) && manifestBaseline) pass('C03', `incremental manifest parsed: ${listed.length} listed, ${imports.length} imported, cutoff ${manifestBaseline}`);

// ---- C04 array entries == imports, same order, no duplicates
const importedNames = imports.map((i) => i.className);
if (listed.length !== new Set(listed).size) fail('C04', 'duplicate class in INCREMENTAL_MIGRATIONS');
if (JSON.stringify(listed) !== JSON.stringify(importedNames)) fail('C04', `INCREMENTAL_MIGRATIONS [${listed.join(',')}] != import order [${importedNames.join(',')}]`);
else pass('C04', 'array order == import order, duplicates 0');

// ---- C05..C09 each incremental migration
let prevEpoch = 0;
for (const inc of imports) {
  const m = /^(\d{13})-([A-Z][A-Za-z0-9]*)\.ts$/.exec(inc.file);
  if (!m) { fail('C05', `incremental file name must be <epoch13>-<PascalName>.ts: ${inc.file}`); continue; }
  const [, epochStr, pascal] = m;
  const epoch = Number(epochStr);
  if (!existsSync(join(MIGRATIONS_DIR, inc.file))) { fail('C05', `incremental file missing: ${inc.file}`); continue; }
  const p = tryParseMigrationFile('C06', inc.file);
  if (!p) continue;
  if (p.className !== `${pascal}${epochStr}`) fail('C06', `${inc.file}: class '${p.className}' must be '${pascal}${epochStr}'`);
  if (p.className !== inc.className) fail('C06', `${inc.file}: imported '${inc.className}' != class '${p.className}'`);
  if (p.name !== p.className) fail('C07', `${inc.file}: name '${p.name}' must equal class '${p.className}'`);
  if (epoch < minEpoch) fail('C08', `${inc.file}: epoch ${epoch} < minimumEpoch13 ${minEpoch}`);
  if (epoch <= prevEpoch) fail('C09', `${inc.file}: epoch ${epoch} not strictly greater than previous ${prevEpoch}`);
  prevEpoch = epoch;
  if (historicalByFile.has(inc.file)) fail('C10', `${inc.file} is historical AND incremental`);
}
if (imports.length === 0) pass('C05', 'no incremental migrations yet (manifest empty)');
else pass('C05', `incremental naming/order verified (${imports.length})`);

// ---- C10 every migration file is historical XOR incremental
const incrementalFiles = new Set(imports.map((i) => i.file));
const orphans = files.filter((f) => !historicalByFile.has(f) && !incrementalFiles.has(f));
if (orphans.length > 0) fail('C10', `migration file(s) neither historical nor registered in incremental/manifest.ts: ${orphans.join(', ')}`);
else pass('C10', `all ${files.length} migration files are historical (${historicalByFile.size}) or incremental (${incrementalFiles.size})`);

// ---- C11 meta ↔ manifest cutoff agreement; last historical is the last manifest entry
const metaSrc = read(join(BOOTSTRAP_DIR, 'canonical-schema-baseline.meta.ts'));
const metaBaseline = /baselineVersion\s*:\s*'([^']+)'/.exec(metaSrc)?.[1];
const metaSupersedes = /supersedesBaselineVersion\s*:\s*'([^']+)'/.exec(metaSrc)?.[1];
const metaFp = /expectedFingerprint\s*:\s*'([0-9a-f]{64})'/.exec(metaSrc)?.[1];
const metaAbsorbed = Number(/absorbedIncrementalMigrationCount\s*:\s*(\d+)/.exec(metaSrc)?.[1]);
let c11ok = true;
if (!metaBaseline || !/^\d{4}-\d{2}-\d{2}-id\d+$/.test(metaBaseline)) { fail('C11', `meta baselineVersion '${metaBaseline}' is not YYYY-MM-DD-id<N>`); c11ok = false; }
if (metaBaseline !== manifestBaseline) { fail('C11', `baselineVersion meta '${metaBaseline}' != manifest cutoff '${manifestBaseline}'`); c11ok = false; }
if (!metaSupersedes || metaSupersedes === metaBaseline) { fail('C11', 'meta supersedesBaselineVersion missing or equal to baselineVersion'); c11ok = false; }
if (!Number.isInteger(metaAbsorbed) || metaAbsorbed < 0) { fail('C11', 'meta absorbedIncrementalMigrationCount missing'); c11ok = false; }
if (/lastHistoricalMigration|historicalMigrationFileCount|LEGACY_HISTORY_ANCHORS/.test(stripComments(metaSrc))) { fail('C11', 'meta still carries historical-name cutoff fields (lastHistoricalMigration / historicalMigrationFileCount / LEGACY_HISTORY_ANCHORS)'); c11ok = false; }
if (!metaFp) { fail('C11', 'expectedFingerprint is not a 64-hex sha256'); c11ok = false; }
if (c11ok) pass('C11', `baseline ${metaBaseline} (supersedes ${metaSupersedes}, absorbed ${metaAbsorbed}) == incremental cutoff`);

// ---- C12 canonical baseline snapshot: schema only
const baselineSrc = read(join(BOOTSTRAP_DIR, 'canonical-schema-baseline.ts'));
const stmtBody = baselineSrc.slice(baselineSrc.indexOf('CANONICAL_SCHEMA_BASELINE_STATEMENTS'));
const forbiddenSnapshot = [
  [/^\s*`(INSERT|COPY|UPDATE|DELETE)\b/m, 'data statement'],
  [/^\s*`(GRANT|REVOKE)\b/m, 'privilege statement'],
  [/OWNER TO\b/, 'ownership statement'],
  [/^\s*`(CREATE|ALTER) (ROLE|USER)\b/m, 'role statement'],
  [/^\s*`DROP\b/m, 'DROP statement'],
  [/IF NOT EXISTS/, 'IF NOT EXISTS'],
  [/\bPASSWORD\s+'/i, 'password literal'],
  [/(host=|postgres(ql)?:\/\/)/i, 'connection string'],
  [/^\s*`CREATE EXTENSION\b/m, 'extension (must be runner preflight)'],
];
let c12ok = true;
for (const [re, label] of forbiddenSnapshot) {
  if (re.test(stmtBody)) { fail('C12', `snapshot contains ${label}`); c12ok = false; }
}
if (c12ok) pass('C12', 'snapshot is schema-only (no data / grants / owners / roles / DROP / IF NOT EXISTS / credentials)');

// ---- C13 snapshot census matches meta census and no retired objects
const census = JSON.parse(/CANONICAL_SCHEMA_BASELINE_CENSUS\s*=\s*(\{[\s\S]*?\})\s*as const/.exec(baselineSrc)?.[1] ?? '{}');
const metaCensus = /census\s*:\s*(\{[^}]*\})/.exec(metaSrc)?.[1];
const metaCensusObj = metaCensus ? Function(`return (${metaCensus})`)() : null;
if (!metaCensusObj || JSON.stringify(census) !== JSON.stringify(metaCensusObj)) fail('C13', `snapshot census ${JSON.stringify(census)} != meta census ${JSON.stringify(metaCensusObj)}`);
const statementCount = (stmtBody.match(/^\s*`/gm) || []).length;
if (statementCount !== census.total) fail('C13', `snapshot has ${statementCount} statements, census says ${census.total}`);
const retired = [
  /\buser_roles\b/, /\borganization_units\b/, /\borganization_roles\b/,
  /\bcms_acf_/, /\bcms_cpt_/, /\bcms_menus\b/, /\bcms_menu_items\b/, /\bcms_menu_locations\b/, /\bcms_settings\b/,
  /\bcms_templates\b/, /\bcms_template_parts\b/, /\bcms_views\b/, /\bcms_pages\b/, /\bcms_fields\b/,
  /\bcustom_fields\b/, /\bcustom_media\b/, /\bcustom_post_types\b/, /\bcustom_posts\b/,
  /\bneture_partner/, /\bneture_partnership_/, /\bneture_seller_partner_contracts\b/, /CREATE TABLE public\.partner_/, /\bsupplier_partner_commissions\b/,
];
const resurrected = retired.filter((re) => re.test(stmtBody)).map(String);
if (resurrected.length > 0) fail('C13', `snapshot resurrects retired objects: ${resurrected.join(', ')}`);
if (metaCensusObj && JSON.stringify(census) === JSON.stringify(metaCensusObj) && statementCount === census.total && resurrected.length === 0) pass('C13', `snapshot census ${census.total} statements / ${census.tables} tables, retired objects 0`);

// ---- C14 bootstrap runner / marker: no IF NOT EXISTS, no CASCADE drop, no catch-and-continue
const runnerSrc = stripComments(read(join(BOOTSTRAP_DIR, 'bootstrap-runner.ts')));
const markerSrc = stripComments(read(join(BOOTSTRAP_DIR, 'baseline-marker.ts')));
const stateSrc = stripComments(read(join(BOOTSTRAP_DIR, 'database-state.ts')));
let c14ok = true;
for (const [name, src] of [['bootstrap-runner.ts', runnerSrc], ['baseline-marker.ts', markerSrc], ['database-state.ts', stateSrc]]) {
  if (/IF NOT EXISTS/.test(src)) { fail('C14', `${name} uses IF NOT EXISTS`); c14ok = false; }
  if (/DROP\s+\w+.*CASCADE/.test(src)) { fail('C14', `${name} uses DROP ... CASCADE`); c14ok = false; }
  if (/synchronize\s*:\s*true/.test(src)) { fail('C14', `${name} uses synchronize: true`); c14ok = false; }
}
if (!/computeSchemaFingerprint\(/.test(runnerSrc)) { fail('C14', 'bootstrap-runner.ts does not verify the fingerprint'); c14ok = false; }
if (!/insertBaselineMarker\(/.test(runnerSrc)) { fail('C14', 'bootstrap-runner.ts does not write the marker'); c14ok = false; }
if (runnerSrc.indexOf('computeSchemaFingerprint(') > runnerSrc.indexOf('insertBaselineMarker(')) { fail('C14', 'marker must be written after fingerprint verification'); c14ok = false; }
if (!/computeSchemaFingerprint\(/.test(stateSrc)) { fail('C14', 'database-state.ts does not re-verify the fingerprint (marker alone is not proof)'); c14ok = false; }
if (/typeorm_migrations[\s\S]{0,200}INSERT/i.test(runnerSrc)) { fail('C14', 'bootstrap-runner.ts inserts into typeorm_migrations (fake history)'); c14ok = false; }
if (c14ok) pass('C14', 'runner/marker/classifier: fingerprint verified before marker, no IF NOT EXISTS, no fake history');

// ---- C15 migrate.ts: manifest only, classifier + bootstrap wired, required literals
const migrateSrc = stripComments(read(join(API, 'src', 'migrate.ts')));
let c15ok = true;
const need = [
  [/from\s+['"]\.\/database\/incremental\/manifest\.js['"]/, 'imports incremental manifest'],
  [/migrations\s*:\s*\[\s*\.\.\.INCREMENTAL_MIGRATIONS\s*\]/, 'migrations: [...INCREMENTAL_MIGRATIONS]'],
  [/classifyDatabaseState\(/, 'calls classifyDatabaseState'],
  [/runCanonicalBootstrap\(/, 'calls runCanonicalBootstrap'],
  [/case\s+'UNKNOWN_PARTIAL'/, 'handles UNKNOWN_PARTIAL'],
  [/migrationsTableName:\s*'typeorm_migrations'/, 'migrationsTableName typeorm_migrations'],
  [/transaction:\s*'each'/, "transaction: 'each'"],
  [/process\.exit\(1\)/, 'exit 1 on failure'],
  [/'DATABASE_STATE'/, 'reports DATABASE_STATE'],
  [/'BOOTSTRAP_EXECUTION'/, 'reports BOOTSTRAP_EXECUTION'],
  [/'HISTORICAL_REPLAY',\s*'ZERO'/, 'reports HISTORICAL_REPLAY = ZERO'],
  [/'INCREMENTAL_PENDING'/, 'reports INCREMENTAL_PENDING'],
  [/'LEGACY_HISTORY_FINGERPRINT'/, 'reports LEGACY_HISTORY_FINGERPRINT'],
  [/'MIGRATION_JOB'/, 'reports MIGRATION_JOB'],
];
for (const [re, label] of need) if (!re.test(migrateSrc)) { fail('C15', `migrate.ts: missing ${label}`); c15ok = false; }
const forbidMigrate = [
  [/migrations\/\*\.(js|ts)/, 'glob migration loading'],
  [/database\/migrations\//, 'direct historical migration import'],
  [/synchronize\s*:\s*true/, 'synchronize: true'],
  [/\.listen\(/, 'HTTP listen'],
  [/\|\|\s*true\b/, 'swallowed failure'],
];
for (const [re, label] of forbidMigrate) if (re.test(migrateSrc)) { fail('C15', `migrate.ts: ${label}`); c15ok = false; }
if (c15ok) pass('C15', 'migrate.ts loads the manifest only, classifies, bootstraps, reports, exits 1 on failure');

// ---- C16 API runtime never loads/runs migrations or bootstrap
const connSrc = stripComments(read(join(API, 'src', 'database', 'connection.ts')));
let c16ok = true;
if (!/migrations\s*:\s*\[\s*\]/.test(connSrc)) { fail('C16', 'connection.ts must declare migrations: []'); c16ok = false; }
if (!/migrationsRun\s*:\s*false/.test(connSrc)) { fail('C16', 'connection.ts must declare migrationsRun: false'); c16ok = false; }
if (!/synchronize\s*:\s*false/.test(connSrc)) { fail('C16', 'connection.ts must declare synchronize: false'); c16ok = false; }
if (/migrations\/\*\./.test(connSrc)) { fail('C16', 'connection.ts still globs migrations'); c16ok = false; }
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!/node_modules|dist|__tests__|migrations|bootstrap|incremental/.test(e.name)) walk(p, out); continue; }
    if (e.name.endsWith('.ts') && e.name !== 'migrate.ts') out.push(p);
  }
  return out;
};
for (const p of walk(join(API, 'src'))) {
  const src = stripComments(read(p));
  if (/bootstrap-runner|runCanonicalBootstrap|classifyDatabaseState|CANONICAL_SCHEMA_BASELINE_STATEMENTS/.test(src)) { fail('C16', `${p.replace(REPO, '')} references the bootstrap module (only migrate.ts may)`); c16ok = false; }
  if (/\.runMigrations\(/.test(src)) { fail('C16', `${p.replace(REPO, '')} calls runMigrations (only migrate.ts may)`); c16ok = false; }
}
if (c16ok) pass('C16', 'API runtime: migrations [], migrationsRun false, no bootstrap/runMigrations reference outside migrate.ts');

// ---- C17 migration-config.ts (CLI) loads the manifest only
const cfgSrc = stripComments(read(join(API, 'src', 'database', 'migration-config.ts')));
if (!/from\s+['"]\.\/incremental\/manifest\.js['"]/.test(cfgSrc) || /migrations\/\*\./.test(cfgSrc)) fail('C17', 'migration-config.ts must load the incremental manifest and no glob');
else pass('C17', 'migration-config.ts loads the manifest only');

// ---- C18 package.json scripts
const pkg = JSON.parse(read(join(API, 'package.json')));
let c18ok = true;
if (pkg.scripts['migration:sync']) { fail('C18', 'package.json migration:sync (schema:sync bypass) must not exist'); c18ok = false; }
if (pkg.scripts['migration:run:prod']) { fail('C18', 'package.json migration:run:prod must not exist'); c18ok = false; }
if (!/src\/migrate\.ts/.test(pkg.scripts['migration:run'] ?? '')) { fail('C18', 'package.json migration:run must run src/migrate.ts'); c18ok = false; }
if (!/src\/migrate\.ts --status/.test(pkg.scripts['migration:show'] ?? '')) { fail('C18', 'package.json migration:show must run src/migrate.ts --status'); c18ok = false; }
for (const [k, v] of Object.entries(pkg.scripts)) {
  if (/data-source\.ts (migration:run|migration:show|schema:sync)\b/.test(v)) { fail('C18', `package.json ${k} bypasses the runner: ${v}`); c18ok = false; }
}
if (c18ok) pass('C18', 'package.json: run/show via migrate.ts, no schema:sync, no migration:run:prod');

// ---- C19 deploy wiring: job runs dist/migrate.js, service CMD does not
const wf = read(join(REPO, '.github', 'workflows', 'deploy-api.yml'));
const dockerfile = read(join(API, 'Dockerfile'));
let c19ok = true;
if (!/dist\/migrate\.js/.test(wf)) { fail('C19', 'deploy-api.yml does not run dist/migrate.js'); c19ok = false; }
if (!/o4o-api-migrations/.test(wf)) { fail('C19', 'deploy-api.yml does not execute the o4o-api-migrations job'); c19ok = false; }
const cmd = /^CMD\s+\[(.+)\]/m.exec(dockerfile)?.[1] ?? '';
if (!/dist\/main\.js/.test(cmd) || /migrat/.test(cmd)) { fail('C19', `Dockerfile CMD must start dist/main.js without migrations: ${cmd}`); c19ok = false; }
if (c19ok) pass('C19', 'deploy: migration job = dist/migrate.js, service CMD = dist/main.js');

// ---- C20 no standalone runner / HTTP bootstrap route
let c20ok = true;
for (const rel of ['apps/api-server/scripts/run-migration-standalone.mjs', 'apps/api-server/scripts/run-migrations.mjs', 'apps/api-server/scripts/run-migration.js', 'apps/api-server/src/database/run-migration.ts']) {
  if (existsSync(join(REPO, rel))) { fail('C20', `standalone runner exists: ${rel}`); c20ok = false; }
}
const routesDir = join(API, 'src', 'routes');
if (existsSync(routesDir)) {
  for (const p of walk(routesDir)) {
    if (/bootstrap-runner|runCanonicalBootstrap|schema_baselines|runMigrations\(/.test(stripComments(read(p)))) { fail('C20', `route references bootstrap/migration: ${p.replace(REPO, '')}`); c20ok = false; }
  }
}
if (c20ok) pass('C20', 'no standalone runner, no HTTP bootstrap/migration route');

// ---- C21 legacy history provenance = ordered history fingerprint; no plaintext legacy names anywhere
{
  let c21ok = true;
  const lb = parseLegacyBaseline();
  if (!lb) { fail('C21', 'legacy-history-baseline.ts missing'); c21ok = false; }
  else {
    if (!lb.sha256) { fail('C21', 'legacy baseline orderedNameSequenceSha256 is not a 64-hex sha256'); c21ok = false; }
    if (!(lb.rowCount > 0) || !(lb.distinctNameCount > 0) || lb.distinctNameCount > lb.rowCount) { fail('C21', `legacy baseline counts malformed (rowCount ${lb.rowCount}, distinct ${lb.distinctNameCount})`); c21ok = false; }
    if (!(lb.capturedThroughId >= lb.rowCount)) { fail('C21', `legacy baseline capturedThroughId ${lb.capturedThroughId} < rowCount ${lb.rowCount}`); c21ok = false; }
    if (!lb.capturedAt) { fail('C21', 'legacy baseline capturedAt missing (YYYY-MM-DD)'); c21ok = false; }
    if (lb.plaintextNames.length) { fail('C21', `legacy baseline carries plaintext migration name(s): ${lb.plaintextNames.slice(0, 3).join(', ')}`); c21ok = false; }
  }
  for (const f of FORBIDDEN_PLAINTEXT_HISTORY_FILES) {
    if (existsSync(join(INCREMENTAL_DIR, f))) { fail('C21', `plaintext legacy history module resurrected: incremental/${f}`); c21ok = false; }
  }
  const incrementalFiles = readdirSync(INCREMENTAL_DIR).sort();
  const allowedIncrementalFiles = ['expected-schema-states.ts', 'historical-migrations.manifest.json', 'legacy-history-baseline.ts', 'manifest.ts'];
  for (const f of incrementalFiles) if (!allowedIncrementalFiles.includes(f)) { fail('C21', `unexpected file in incremental/: ${f} (no plaintext history lists)`); c21ok = false; }
  if (!existsSync(LEGACY_FINGERPRINT_TS)) { fail('C21', 'bootstrap/legacy-history-fingerprint.ts missing'); c21ok = false; }
  else {
    const fpSrc = stripComments(read(LEGACY_FINGERPRINT_TS));
    if (!/export function hashOrderedHistoryNames\(/.test(fpSrc) || !/export function verifyLegacyHistoryPrefix\(/.test(fpSrc)) { fail('C21', 'legacy-history-fingerprint.ts must export hashOrderedHistoryNames and verifyLegacyHistoryPrefix'); c21ok = false; }
    if (!/createHash\('sha256'\)/.test(fpSrc) || !/`\$\{n\}\\n`/.test(fpSrc)) { fail('C21', "hash rule must be sha256 over name + '\\n' per row"); c21ok = false; }
  }
  // ONE hash implementation: no other runtime module hashes history names
  for (const p of walkSrc(join(API, 'src'))) {
    if (p === LEGACY_FINGERPRINT_TS) continue;
    const src = stripComments(read(p));
    if (/hashOrderedHistoryNames|verifyLegacyHistoryPrefix/.test(src) && !/from\s+['"][^'"]*legacy-history-fingerprint\.js['"]/.test(src)) { fail('C21', `${p.replace(REPO, '')} re-implements the history hash instead of importing legacy-history-fingerprint.ts`); c21ok = false; }
    if (/historical-migration-names|legacy-history\.facts|HISTORICAL_MIGRATION_NAMES|LEGACY_HISTORY_RETIRED_NAMES|LEGACY_HISTORY_KNOWN_DUPLICATES|LEGACY_HISTORY_ANCHORS|validateLegacyHistoryNames/.test(src)) { fail('C21', `${p.replace(REPO, '')} references a retired plaintext-history symbol`); c21ok = false; }
  }
  if (!/verifyLegacyHistoryPrefix\(/.test(stateSrc) || !/LEGACY_HISTORY_BASELINE/.test(stateSrc)) { fail('C21', 'database-state.ts must verify the legacy prefix with verifyLegacyHistoryPrefix(LEGACY_HISTORY_BASELINE)'); c21ok = false; }
  if (c21ok) pass('C21', `legacy history provenance = ordered fingerprint (${lb.rowCount} rows, ${lb.distinctNameCount} distinct, captured ${lb.capturedAt}); no plaintext legacy names; one hash implementation`);
}

// ---- C22 expected schema states: one per reachable state, in manifest order, well-formed
const statesSrc = stripComments(read(EXPECTED_STATES_TS));
const statesBody = /EXPECTED_SCHEMA_STATES\s*:\s*readonly\s+ExpectedSchemaState\[\]\s*=\s*\[([\s\S]*?)\]\s*as const;/.exec(statesSrc)?.[1] ?? '';
const stateEntries = [...statesBody.matchAll(/\{\s*appliedThrough\s*:\s*(null|'[^']*')\s*,\s*fingerprint\s*:\s*([^,]+?)\s*,\s*fingerprintLineCount\s*:\s*([^,}\s]+)\s*,?\s*\}/g)]
  .map((m) => ({ appliedThrough: m[1] === 'null' ? null : m[1].slice(1, -1), fingerprint: m[2].trim(), lineCount: m[3].trim() }));
let c22ok = true;
if (stateEntries.length !== listed.length + 1) { fail('C22', `EXPECTED_SCHEMA_STATES has ${stateEntries.length} entries, expected ${listed.length + 1} (baseline + ${listed.length} incremental)`); c22ok = false; }
stateEntries.forEach((e, i) => {
  if (i === 0) {
    if (e.appliedThrough !== null) { fail('C22', 'EXPECTED_SCHEMA_STATES[0] must be the baseline (appliedThrough: null)'); c22ok = false; }
    if (!/CANONICAL_SCHEMA_BASELINE_META\.expectedFingerprint/.test(e.fingerprint)) { fail('C22', 'EXPECTED_SCHEMA_STATES[0] must reference CANONICAL_SCHEMA_BASELINE_META.expectedFingerprint'); c22ok = false; }
    return;
  }
  if (e.appliedThrough !== listed[i - 1]) { fail('C22', `EXPECTED_SCHEMA_STATES[${i}].appliedThrough '${e.appliedThrough}' != INCREMENTAL_MIGRATIONS[${i - 1}] '${listed[i - 1]}'`); c22ok = false; }
  if (!/^'[0-9a-f]{64}'$/.test(e.fingerprint)) { fail('C22', `EXPECTED_SCHEMA_STATES[${i}].fingerprint is not a 64-hex sha256 literal`); c22ok = false; }
  if (!/^[1-9]\d*$/.test(e.lineCount)) { fail('C22', `EXPECTED_SCHEMA_STATES[${i}].fingerprintLineCount must be a positive integer literal`); c22ok = false; }
});
const stateFps = stateEntries.slice(1).map((e) => e.fingerprint);
if (stateFps.length !== new Set(stateFps).size) { fail('C22', 'duplicate fingerprint in EXPECTED_SCHEMA_STATES'); c22ok = false; }
if (c22ok) pass('C22', `EXPECTED_SCHEMA_STATES: baseline + ${stateEntries.length - 1} incremental state(s) in manifest order`);

// ---- C23 historical manifest = identity freeze of RETAINED source files only; no migration source resurrects a retired object
{
  let c23ok = true;
  const retainedSet = new Set(files);
  const stale = historical.entries.filter((e) => !retainedSet.has(e.file)).map((e) => e.file);
  if (stale.length) { fail('C23', `historical manifest lists ${stale.length} file(s) that no longer exist (run --write-historical --maintenance --baseline-rollover under an explicit WO): ${stale.slice(0, 3).join(', ')}`); c23ok = false; }
  if (historical.entries.some((e) => !e.file || !e.className || !e.name)) { fail('C23', 'historical manifest entry lacks file / className / name'); c23ok = false; }
  if (!/RETAINED historical migration source files only/.test(historical.$comment ?? '')) { fail('C23', 'historical manifest $comment must state it freezes the retained source files only (not runtime provenance)'); c23ok = false; }
  if (c23ok) pass('C23', `historical manifest freezes ${historical.entries.length} retained source files (identity only, never runtime provenance)`);
}

// ---- C24 migrate.ts never logs connection details; assertion + transport literals present
let c24ok = true;
for (const key of ['DB_HOST', 'DB_NAME', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DATABASE_URL']) {
  if (new RegExp(`\\$\\{\\s*${key}\\s*\\}`).test(migrateSrc)) { fail('C24', `migrate.ts interpolates ${key} into a string`); c24ok = false; }
  if (new RegExp(`\\$\\{\\s*process\\.env\\.${key}\\s*\\}`).test(migrateSrc)) { fail('C24', `migrate.ts interpolates process.env.${key} into a string`); c24ok = false; }
}
if (/console\.(log|error|warn)\([^)]*\b(DB_HOST|DB_NAME|DB_USERNAME|DB_PASSWORD|connectionConfig)\b/.test(migrateSrc)) { fail('C24', 'migrate.ts passes connection values to console'); c24ok = false; }
if (/\berror\.stack\b/.test(migrateSrc)) { fail('C24', 'migrate.ts prints a raw error stack (use summarizeDatabaseError)'); c24ok = false; }
for (const [re, label] of [
  [/summarizeDatabaseError\(/, 'summarizeDatabaseError'],
  [/Database transport: \$\{isCloudSQLSocket \? 'CLOUD_SQL_SOCKET' : 'TCP'\}/, 'Database transport: CLOUD_SQL_SOCKET | TCP'],
  [/Database configuration: COMPLETE/, 'Database configuration: COMPLETE'],
  [/Database connection: SUCCESS/, 'Database connection: SUCCESS'],
  [/'PRE_MIGRATION_SCHEMA_ASSERTION'/, 'PRE_MIGRATION_SCHEMA_ASSERTION'],
  [/'POST_MIGRATION_SCHEMA_ASSERTION'/, 'POST_MIGRATION_SCHEMA_ASSERTION'],
  [/'CURRENT_INCREMENTAL_PREFIX'/, 'CURRENT_INCREMENTAL_PREFIX'],
  [/'EXPECTED_FINGERPRINT'/, 'EXPECTED_FINGERPRINT'],
  [/'LIVE_FINGERPRINT'/, 'LIVE_FINGERPRINT'],
  [/'MANUAL_INVESTIGATION_REQUIRED',\s*'YES'/, 'MANUAL_INVESTIGATION_REQUIRED = YES'],
  [/'DB_WRITES',\s*0/, 'DB_WRITES = 0 (status mode)'],
]) if (!re.test(migrateSrc)) { fail('C24', `migrate.ts: missing ${label}`); c24ok = false; }
if (c24ok) pass('C24', 'migrate.ts: no connection detail logging, safe error summary, pre/post schema assertions reported');

// ---- C25 identity uniqueness: every migration file parses; no duplicate file / class / runtime name
//      across historical + incremental; historical ∩ incremental (by runtime name) = ∅
{
  let c25ok = true;
  const seenClass = new Map();
  const seenRuntime = new Map();
  for (const f of files) {
    const p = tryParseMigrationFile('C25', f);
    if (!p) { c25ok = false; continue; }
    if (seenClass.has(p.className)) { fail('C25', `duplicate class '${p.className}': ${seenClass.get(p.className)} and ${f}`); c25ok = false; }
    if (seenRuntime.has(p.name)) { fail('C25', `duplicate runtime name '${p.name}': ${seenRuntime.get(p.name)} and ${f}`); c25ok = false; }
    seenClass.set(p.className, f);
    seenRuntime.set(p.name, f);
  }
  const histFiles = historical.entries.map((e) => e.file);
  if (histFiles.length !== new Set(histFiles).size) { fail('C25', 'duplicate file in the historical manifest'); c25ok = false; }
  const histRuntime = historical.entries.map((e) => e.name);
  if (histRuntime.length !== new Set(histRuntime).size) { fail('C25', 'duplicate runtime name in the historical manifest'); c25ok = false; }
  const histClasses = historical.entries.map((e) => e.className);
  if (histClasses.length !== new Set(histClasses).size) { fail('C25', 'duplicate className in the historical manifest'); c25ok = false; }
  for (const n of histRuntime) if (listed.includes(n)) { fail('C25', `'${n}' is both a historical runtime name and an incremental migration`); c25ok = false; }
  if (c25ok) pass('C25', `identity extracted for all ${files.length} migration files; file/class/runtime name unique; historical ∩ incremental = ∅`);
}

// ---- report
for (const p of passes) console.log(`PASS ${p}`);
for (const f of failures) console.error(`FAIL ${f}`);
console.log(`migration contract: ${passes.length} pass / ${failures.length} fail`);
if (writeHistoricalContinued) console.log(failures.length > 0 ? 'maintenance write completed but the contract FAILS on the written state — fix before commit' : 'maintenance write completed and the contract passes');
process.exit(failures.length > 0 ? 1 : 0);
