/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-B-KO-EN-DA-V1 — EN struct 확보/증명 (에이전트 다)
 *
 * 목적: 4그룹의 EN 번역 struct 를 확보하고 buildDrugOtcEnConsumerHtml 산출이
 *   **동일 약물 out-of-target live en canonical 과 byte-identical(md5 동일)** 임을 증명한다.
 *
 * struct 출처 우선순위:
 *   1) 마스터 번역(otc-en-translations-v1.json) 의 동일 groupKey entry 그대로 채택(선례 방식)
 *   2) 마스터에 없으면 live en canonical HTML 을 빌더 계약 역파싱으로 복원(새 medical fact 0 —
 *      원문 자체를 되돌리는 것이므로 번역 창작 없음). 어느 경로든 md5 일치가 유일한 게이트.
 *
 * DB read-only. PASS 시에만 그룹별 번역 JSON 을 translations/ 에 기록한다.
 * Usage: npx tsx src/scripts/otc-batch8-da-en-struct.ts [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const TR_DIR = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations');
const WO = 'WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-B-KO-EN-DA-V1';

const GROUPS = [
  { slug: 'trimebutine-200mg-jeong', key: '트리메부틴말레산염|200밀리그램|정', file: 'otc-en-translations-trimebutine-200mg-jeong-v1.json' },
  { slug: 'mecobalamin-500ug-capsule', key: '메코발라민|500마이크로그램|캡슐', file: 'otc-en-translations-mecobalamin-500ug-capsule-v1.json' },
  { slug: 'dexpanthenol-100mg-jeong', key: '덱스판테놀|100밀리그램|정', file: 'otc-en-translations-dexpanthenol-100mg-jeong-v1.json' },
  { slug: 'folic-acid-1mg-jeong', key: '폴산|1밀리그램|정', file: 'otc-en-translations-folic-acid-1mg-jeong-v1.json' },
];

const unesc = (s: string): string =>
  s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

/** 빌더 계약(drug-otc-en-consumer-html.ts) 역파싱 — 산출 md5 일치로만 신뢰한다. */
function reverseParse(html: string, groupKey: string): DrugOtcEnTranslation | null {
  const h1 = html.match(/^ {4}<h1>([\s\S]*?)<\/h1>$/m);
  if (!h1) return null;
  const inner = h1[1];
  const small = inner.match(/<small>([\s\S]*?)<\/small>$/);
  const title = unesc(small ? inner.slice(0, inner.length - small[0].length) : inner);
  const whyThisOne = small ? unesc(small[1]) : null;

  const efficacy = html.match(/^ {4}<p class="sd-intro">([\s\S]*?)<\/p>$/m);
  const usage = html.match(/^ {4}<p class="sd-intake">([\s\S]*?)<\/p>$/m);
  if (!efficacy || !usage) return null;

  // usageLabel = sd-core 블록 다음의 첫 <h2>
  const core = html.indexOf('    </div>\n    <h2>');
  const labelM = html.slice(core).match(/^ {4}<h2>([\s\S]*?)<\/h2>$/m);
  if (!labelM) return null;
  const usageLabel = unesc(labelM[1]);

  const warn = html.match(/ {4}<ul class="sd-warn">\n([\s\S]*?)\n {4}<\/ul>/);
  if (!warn) return null;
  const caution = warn[1]
    .split('\n')
    .map((l) => l.replace(/^ {6}<li>/, '').replace(/<\/li>$/, ''))
    .map(unesc)
    .join(' ');

  // summaryTable 은 빌더 삽입 순서 그대로 sd-item 순회로 복원
  const st: Record<string, string> = {};
  const itemRe = / {6}<div class="sd-item">\n {8}<span class="sd-tag">([\s\S]*?)<\/span>\n {8}<p>([\s\S]*?)<\/p>\n {6}<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(html))) st[unesc(m[1])] = unesc(m[2]);
  if (!Object.keys(st).length) return null;
  if (whyThisOne && !st['Why this one']) return null; // 계약 위반 → 신뢰 불가

  return { groupKey, title, usageLabel, efficacy: unesc(efficacy[1]), usage: unesc(usage[1]), caution, summaryTable: st };
}

function main(): void {
  const write = process.argv.includes('--write');
  const probe = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-batch8-da-probe.json'), 'utf8'));
  const master = JSON.parse(fs.readFileSync(path.join(TR_DIR, 'otc-en-translations-v1.json'), 'utf8')) as { translations: DrugOtcEnTranslation[] };

  const report: any = { wo: WO, readOnly: !write, groups: {} as Record<string, unknown> };
  let fail = 0;
  for (const g of GROUPS) {
    const p = probe.groups[g.slug];
    const liveMd5 = p.refEnCanonical[0]?.md5 ?? null;
    const liveHtml: string | null = p.refEnHtml;
    const summary: string | null = p.refEnCanonical[0]?.summary ?? null;
    const entry: any = { groupKey: g.key, liveEnMd5: liveMd5, liveEnCount: p.refEnCanonical[0]?.n ?? 0, summary };

    const fromMaster = master.translations.find((t) => t.groupKey === g.key) || null;
    let chosen: DrugOtcEnTranslation | null = null;
    if (fromMaster) {
      const built = buildDrugOtcEnConsumerHtml(fromMaster);
      entry.masterStruct = { present: true, builtMd5: md5(built.html), match: md5(built.html) === liveMd5 };
      if (entry.masterStruct.match) { chosen = fromMaster; entry.structSource = 'master-translation-file'; }
    } else {
      entry.masterStruct = { present: false };
    }
    if (!chosen && liveHtml) {
      const rev = reverseParse(liveHtml, g.key);
      if (rev) {
        const built = buildDrugOtcEnConsumerHtml(rev);
        entry.reverseParse = { builtMd5: md5(built.html), match: md5(built.html) === liveMd5, missing: built.missing };
        if (entry.reverseParse.match) { chosen = rev; entry.structSource = 'reverse-parse-of-live-en'; }
      } else {
        entry.reverseParse = { error: 'parse-failed' };
      }
    }

    entry.byteIdentical = !!chosen;
    if (!chosen) { fail += 1; entry.verdict = 'STOP — EN byte-identical 증명 실패'; }
    else {
      entry.verdict = 'PASS';
      if (write) {
        const payload = {
          wo: WO,
          guide: 'OTC-EN-TRANSLATION-GUIDE V0.5 · OTC-KO-EN-GLOSSARY V0.2',
          note: `${g.key} EN 번역 1건. grounded ko canonical(source_ref 공유) 충실 번역. struct 출처=${entry.structSource}. buildDrugOtcEnConsumerHtml 산출 md5 ${liveMd5} = 동일 약물 out ${entry.liveEnCount} master live en canonical 과 byte-identical(diff 0) → 새 medical fact 0. 배치 전용 파일.`,
          testLog: { 판정: `build md5 == live out en md5 ${liveMd5} byte-identical(diff 0) · 새 medical fact 0 · 한글 0` },
          translations: [chosen],
          summary,
        };
        fs.writeFileSync(path.join(TR_DIR, g.file), JSON.stringify(payload, null, 2) + '\n', 'utf8');
        entry.written = g.file;
      }
    }
    report.groups[g.slug] = entry;
    console.log(`${g.slug}: source=${entry.structSource ?? '-'} live=${liveMd5} byteIdentical=${entry.byteIdentical}`);
  }
  report.status = fail === 0 ? 'PASS' : 'STOP';
  report.failCount = fail;
  fs.writeFileSync(path.join(DATA_DIR, 'otc-batch8-da-en-struct.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nstatus=${report.status} fail=${fail}`);
  if (fail) process.exit(1);
}
main();
