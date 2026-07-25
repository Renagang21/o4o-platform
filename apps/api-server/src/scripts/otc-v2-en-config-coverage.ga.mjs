// WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2-LIVE-APPLY-V1 — EN config 완전성 게이트 (에이전트 가).
//
// KO apply 착수 전에 "가 shard 전체 EN 저작 페이로드가 준비됐는가"를 파일 기준으로 판정한다.
// read-only · DB 미접속 · write 0 (판정 결과만 stdout + --out JSON).
//
// 검사:
//   1) eligible fp/master = dry-run manifest(공용 러너 산출) 기준 237 fp / 837 master
//   2) EN config 들의 fp 합집합 == eligible fp (누락 0 · 초과 0)
//   3) config 간 fp 중복 0 · master 중복 0
//   4) HOLD fp/master 포함 0
//   5) 각 fp 가 V2 SSOT(ga) 소속인지 확인
//   6) 필수 필드(title/efficacy/usage/caution/summaryTable) 채움 · 한글 잔존 0
//   7) usageLabel 을 config 가 들고 있지 않을 것(러너가 route 로 주입)
//   8) 예상 EN write == master × 2 == 1,674T
//
// Usage(apps/api-server):
//   node src/scripts/otc-v2-en-config-coverage.ga.mjs src/scripts/data/otc-v2-en-config-ga-p01.json [...]
//   CONFIGS_GLOB=src/scripts/data/otc-v2-en-config-ga-p*.json node src/scripts/otc-v2-en-config-coverage.ga.mjs
import fs from 'node:fs';
import path from 'node:path';

const DATA = 'src/scripts/data';
const MANIFEST = path.join(DATA, 'otc-v2-dryrun-manifest.ga.json');
const SSOT = path.join(DATA, 'otc-remaining-shard-assignment-ssot-v2.json');
const CENSUS = path.join(DATA, 'otc-remaining-full-corpus-census-v2.json');
const HANGUL = /[가-힣]/;

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const explicit = files.length ? files
  : fs.readdirSync(DATA).filter((f) => /^otc-v2-en-config-ga-p\d+\.json$/.test(f)).sort().map((f) => path.join(DATA, f));

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
const census = JSON.parse(fs.readFileSync(CENSUS, 'utf8'));
const gaFp = new Set(ssot.shards.ga.fingerprintList);
const sizeByFp = new Map(census.readyGroups.filter((g) => gaFp.has(g.fp)).map((g) => [g.fp, g.size]));
const mastersByFp = new Map(census.readyGroups.filter((g) => gaFp.has(g.fp)).map((g) => [g.fp, g.masterIds]));

// eligible = manifest 그룹 중 이상 0 (HOLD 제외)
const eligible = manifest.groups.filter((g) => !g.anomalies || g.anomalies.length === 0);
const hold = manifest.groups.filter((g) => g.anomalies && g.anomalies.length > 0);
const eligibleFp = new Set(eligible.map((g) => g.fp));
const holdFp = new Set(hold.map((g) => g.fp));
const eligibleMasters = eligible.reduce((a, g) => a + g.size, 0);

const fail = [];
const seenFp = new Map();      // fp → file
const seenMaster = new Map();  // masterId → file
let entries = 0;

for (const f of explicit) {
  if (!fs.existsSync(f)) { fail.push(`config 파일 부재: ${f}`); continue; }
  const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
  const groups = cfg.groups || [];
  if (!Array.isArray(groups)) { fail.push(`${f}: groups 배열 아님`); continue; }
  for (const e of groups) {
    entries += 1;
    const where = `${path.basename(f)}#${e.fp}`;
    if (!gaFp.has(e.fp)) fail.push(`${where}: ga shard 밖 fp`);
    if (holdFp.has(e.fp)) fail.push(`${where}: HOLD fp 포함 금지`);
    if (!eligibleFp.has(e.fp)) fail.push(`${where}: eligible 아님`);
    if (seenFp.has(e.fp)) fail.push(`${where}: fp 중복 (이미 ${seenFp.get(e.fp)})`);
    else seenFp.set(e.fp, path.basename(f));
    for (const m of mastersByFp.get(e.fp) || []) {
      if (seenMaster.has(m)) fail.push(`${where}: master 중복 ${m} (이미 ${seenMaster.get(m)})`);
      else seenMaster.set(m, path.basename(f));
    }
    for (const k of ['title', 'efficacy', 'usage', 'caution']) {
      if (!e[k] || String(e[k]).trim().length === 0) fail.push(`${where}: 필수 필드 공백 ${k}`);
      else if (HANGUL.test(String(e[k]))) fail.push(`${where}: 한글 잔존 ${k}`);
    }
    if (!e.summaryTable || Object.keys(e.summaryTable).length === 0) fail.push(`${where}: summaryTable 비어있음`);
    else for (const [k, v] of Object.entries(e.summaryTable)) {
      if (HANGUL.test(String(k)) || HANGUL.test(String(v))) fail.push(`${where}: summaryTable 한글 잔존`);
    }
    if (e.usageLabel !== undefined) fail.push(`${where}: usageLabel 은 config 가 들지 않는다(러너 주입)`);
  }
}

const missing = [...eligibleFp].filter((fp) => !seenFp.has(fp));
const extra = [...seenFp.keys()].filter((fp) => !eligibleFp.has(fp));
const coveredMasters = [...seenFp.keys()].reduce((a, fp) => a + (sizeByFp.get(fp) || 0), 0);
if (missing.length) fail.push(`누락 fp ${missing.length}건: ${missing.slice(0, 5).join(',')}${missing.length > 5 ? '…' : ''}`);
if (extra.length) fail.push(`초과 fp ${extra.length}건`);
if (coveredMasters !== eligibleMasters) fail.push(`master 커버리지 ${coveredMasters} != eligible ${eligibleMasters}`);

const result = {
  wo: 'WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2-LIVE-APPLY-V1',
  shard: 'ga', readOnly: true, dbWrite: 0,
  configs: explicit.map((f) => path.basename(f)),
  entries,
  eligible: { fp: eligibleFp.size, master: eligibleMasters },
  hold: { fp: holdFp.size, master: hold.reduce((a, g) => a + g.size, 0) },
  covered: { fp: seenFp.size, master: coveredMasters },
  missingFp: missing.length, extraFp: extra.length,
  expectedEnWriteT: coveredMasters * 2,
  requiredEnWriteT: eligibleMasters * 2,
  verdict: fail.length === 0 && missing.length === 0 && coveredMasters === eligibleMasters ? 'COMPLETE' : 'INCOMPLETE',
  failures: fail,
};
const outArg = (process.argv.find((a) => a.startsWith('--out=')) || '').split('=')[1];
if (outArg) fs.writeFileSync(outArg, JSON.stringify(result, null, 1) + '\n', 'utf8');
console.log(`EN-CONFIG-COVERAGE ga — ${result.verdict}`);
console.log(`  configs ${result.configs.length} · entries ${entries}`);
console.log(`  covered ${result.covered.fp} fp / ${result.covered.master} master · eligible ${result.eligible.fp} fp / ${result.eligible.master} master`);
console.log(`  HOLD 제외 ${result.hold.fp} fp / ${result.hold.master} master · 누락 ${missing.length} · 초과 ${extra.length}`);
console.log(`  EN write 예상 ${result.expectedEnWriteT}T / 필요 ${result.requiredEnWriteT}T`);
if (fail.length) { console.log(`  실패 ${fail.length}건:`); for (const f of fail.slice(0, 20)) console.log(`   - ${f}`); }
process.exit(result.verdict === 'COMPLETE' ? 0 : 1);
