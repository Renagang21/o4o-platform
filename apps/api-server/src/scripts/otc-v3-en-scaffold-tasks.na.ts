/**
 * WO-...-V3-FINAL-READINESS-V1 — 나 EN 스캐폴드 + 번역 태스크 생성기 (파일 IO only, DB 없음)
 *
 * 목적: build-{unit}.json(공식 6섹션 KO)를 입력으로,
 *   (1) 결정적 EN 스캐폴드(제목/폼/카테고리/whyThisOne/officialDosage/presence) — 의료사실 아님, 템플릿.
 *   (2) 번역 태스크 파일(fp별 공식 6섹션 KO + gencode/form/route) — 배치 분할.
 *   서브에이전트는 태스크의 6섹션 + howItWorks 만 충실 번역(신규 사실 금지). 나머지 구조 필드는 스캐폴드가 결정.
 *
 * DB write 0. Usage: ../../node_modules/.bin/tsx src/scripts/otc-v3-en-scaffold-tasks.na.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { normalize } from './otc-v2-store-leaflet-runner.shared.js';
import { CONTENT_SECTIONS } from './otc-v3-content-leaflet-composer.na.js';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_DIR = path.join(DATA_DIR, 'otc-ready-na-v3');
const EN_DIR = path.join(OUT_DIR, 'en');
const UNITS = ['topical-unit-1', 'oromucosal-unit-1'] as const;
const BATCH = 8; // fp per task batch

const EN_FORM: Record<string, string> = {
  '플라스타': 'plaster', '크림': 'cream', '연고': 'ointment', '파스타': 'paste', '로션': 'lotion',
  '카타플라스마': 'cataplasm', '패취': 'patch',
  '껌': 'gum', '구강용해필름': 'orally disintegrating film', '트로키': 'lozenge',
};

function main(): void {
  fs.mkdirSync(EN_DIR, { recursive: true });
  const index: any[] = [];
  for (const unit of UNITS) {
    const b = JSON.parse(fs.readFileSync(path.join(OUT_DIR, `build-${unit}.json`), 'utf8'));
    const scaffold: any[] = [];
    const tasks: any[] = [];
    for (const fp of b.fingerprints) {
      const enForm = EN_FORM[fp.form] || fp.form;
      const presence = Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, normalize(fp.officialSections[k] || '') ? 1 : 0]));
      scaffold.push({
        fp: fp.fp, route: fp.route, gencode: fp.gencode, form: fp.form, enForm,
        enTitle: `${enForm} (${fp.gencode})`,
        category: `General medicine · ${enForm}`,
        whyThisOne: `Products with the same general-name code (${fp.gencode}) share ingredient, strength and form. Check by ingredient and strength, not by product name.`,
        officialDosage: fp.officialSections['용법·용량'] || '',
        presence,
      });
      tasks.push({
        fp: fp.fp, gencode: fp.gencode, form: fp.form, enForm, route: fp.route,
        presence,
        korean: Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, fp.officialSections[k] || ''])),
      });
    }
    fs.writeFileSync(path.join(EN_DIR, `scaffold-${unit}.json`), JSON.stringify({ unit, route: b.route, count: scaffold.length, items: scaffold }, null, 2) + '\n');
    // batch tasks
    const batches: any[] = [];
    for (let i = 0; i < tasks.length; i += BATCH) batches.push(tasks.slice(i, i + BATCH));
    batches.forEach((items, bi) => {
      const file = path.join(EN_DIR, `task-${unit}-b${String(bi + 1).padStart(2, '0')}.json`);
      fs.writeFileSync(file, JSON.stringify({ unit, route: b.route, batch: bi + 1, count: items.length, items }, null, 2) + '\n');
      index.push({ unit, batch: bi + 1, count: items.length,
        taskFile: path.relative(process.cwd(), file).replace(/\\/g, '/'),
        outFile: `src/scripts/data/otc-ready-na-v3/en/out-${unit}-b${String(bi + 1).padStart(2, '0')}.json` });
    });
    console.log(`[${unit}] scaffold ${scaffold.length} · task batches ${batches.length}`);
  }
  fs.writeFileSync(path.join(EN_DIR, 'task-index.json'), JSON.stringify({ batch: BATCH, batches: index }, null, 2) + '\n');
  console.log(`total task batches ${index.length}`);
}
main();
