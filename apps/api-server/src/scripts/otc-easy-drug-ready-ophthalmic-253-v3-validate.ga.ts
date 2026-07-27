/**
 * WO-...-OPHTHALMIC-253-CONTENT-FP-V3-FINAL-READINESS-V1 — 26 content fp KO+EN 저작 검증 (에이전트 가)
 *
 * 오프라인 검증(DB write 0). grounding = official-source-v1.json (fp별 공식 6섹션 raw).
 *   - composeKoV3 : 26 fp 전량 anomalies=0, 6섹션 보존 확인.
 *   - renderEnV3  : 26 fp 전량 anomalies=0, present 안전섹션과 config.safety 키 1:1.
 * 하나라도 실패하면 STOP(§11) — 실패 fp/사유를 출력하고 비영(非0) 종료.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { composeKoV3, renderEnV3 } from './otc-easy-drug-ready-ophthalmic-253-v3-composer.ga.js';
import { EN_CONFIG } from './otc-easy-drug-ready-ophthalmic-253-v3-en-config.ga.js';
import { SAFETY_SECTIONS } from './otc-easy-drug-ready-ophthalmic-253-v3-contract.ga.js';

const DATA_DIR = path.join(process.cwd(), 'src', 'scripts', 'data');
const SRC = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-official-source-v1.json');
const FORM = '점안액';

type Fp = {
  fp: string;
  gencode: string;
  route: string;
  size: number;
  officialSectionsRaw: Record<string, string>;
};

const src = JSON.parse(fs.readFileSync(SRC, 'utf8')) as { fingerprints: Fp[] };
const fps = [...src.fingerprints].sort((a, b) => a.fp.localeCompare(b.fp));

const failures: string[] = [];
let koOk = 0;
let enOk = 0;

for (const f of fps) {
  const sixRaw = f.officialSectionsRaw;
  const presentSafety = SAFETY_SECTIONS.filter((s) => (sixRaw[s] || '').trim());

  // ── KO ──
  try {
    const ko = composeKoV3(sixRaw, FORM, f.gencode);
    if (ko.anomalies.length) failures.push(`[KO ${f.fp}] ${ko.anomalies.join(' | ')}`);
    else koOk++;
    // present 안전섹션 전부 KO caution 에 보존되었는지(composeKoV3 가 이미 게이트하지만 이중확인)
    const koMissing = presentSafety.filter((s) => !ko.presentSafety.includes(s));
    if (koMissing.length) failures.push(`[KO ${f.fp}] presentSafety 누락: ${koMissing.join(',')}`);
  } catch (e) {
    failures.push(`[KO ${f.fp}] THROW ${(e as Error).message}`);
  }

  // ── EN ──
  const cfg = EN_CONFIG[f.fp];
  if (!cfg) {
    failures.push(`[EN ${f.fp}] config 누락`);
    continue;
  }
  // safety 키 1:1 (present 안전섹션 == config.safety 키)
  const cfgKeys = Object.keys(cfg.safety).sort();
  const want = [...presentSafety].sort();
  if (JSON.stringify(cfgKeys) !== JSON.stringify(want)) {
    failures.push(`[EN ${f.fp}] safety 키 불일치 config=[${cfgKeys}] present=[${want}]`);
  }
  try {
    const en = renderEnV3(cfg, sixRaw);
    if (en.anomalies.length) failures.push(`[EN ${f.fp}] ${en.anomalies.join(' | ')}`);
    else enOk++;
  } catch (e) {
    failures.push(`[EN ${f.fp}] THROW ${(e as Error).message}`);
  }
}

console.log(`fp=${fps.length} masters=${fps.reduce((s, f) => s + f.size, 0)} koOk=${koOk} enOk=${enOk}`);
if (failures.length) {
  console.log(`\n=== FAIL (${failures.length}) ===`);
  for (const x of failures) console.log(' - ' + x);
  process.exit(1);
} else {
  console.log('\n=== GREEN — 26 fp KO+EN anomalies=0, safety 1:1 ===');
}
