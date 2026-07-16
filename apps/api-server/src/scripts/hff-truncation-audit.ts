/**
 * 원문 필드 절단 감사 (read-only) — CP4 선행 전수 점검
 *
 * 지시(CP4): 원문 필드는 검사 입력 단계에서 자르지 않는다. 화면 축약이 필요하면 렌더링 계층에서만.
 * 절단은 두 가지를 동시에 망가뜨린다:
 *   ① 문장 품질 파손
 *   ② 원문과 문자열이 달라져 **인용 근거 판정이 무력화** (실측: CP3 라파힐 "최대한" 오탐)
 *
 * 이 스크립트는 초안 spec/why 셀이 원문의 부분 인용인데 **단어 중간에서 끊겼는지**를
 * 재빌드 없이 전수 점검한다.  npx tsx src/scripts/hff-truncation-audit.ts <input.json ...>
 */
import fs from 'node:fs';
import { stripHtml, TRAILING_JUNK } from '../modules/content-guard/product-description-guard.units.js';

const files = process.argv.slice(2);
let totalBroken = 0;
let totalPartial = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const items = JSON.parse(fs.readFileSync(file, 'utf8'));
  const label = file.split(/[\\/]/).pop();
  const rows: string[] = [];

  for (const it of items) {
    const sources: Record<string, string> = {
      성상: it.source.dosageForm ?? '', 보관: it.source.storage ?? '',
      섭취방법: it.source.intake ?? '', 주의: it.source.caution ?? '', 유통기한: it.source.shelfLife ?? '',
    };
    for (const raw of String(it.drafts?.ko ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>|<div class="sd-item"[^>]*>([\s\S]*?)<\/div>/g)) {
      const cell = stripHtml(raw[1] ?? raw[2] ?? '');
      const c = cell.replace(TRAILING_JUNK, '').trim();
      const tail = c.slice(-24);
      if (tail.length < 6) continue;
      for (const [fld, src0] of Object.entries(sources)) {
        const src = src0.replace(/\s+/g, ' ').trim();
        if (!src) continue;
        const i = src.indexOf(tail);
        if (i < 0) continue;
        const next = src[i + tail.length];
        if (next === undefined || /[\s.,)\]}·ㆍ]/.test(next)) continue; // 완전 인용 or 어절 경계
        const JOSA = /^(에|이|가|은|는|을|를|의|와|과|로|도|만|께|한|하|되|입|씩|부터|까지|에서|에게|으로)/;
        const fragment = !JOSA.test(src.slice(i + tail.length));
        if (fragment) totalBroken++; else totalPartial++;
        rows.push(`  ${fragment ? '✗ 파편' : '~ 요약'} ${String(it.productName).slice(0, 18).padEnd(20)}[${fld}] "…${c.slice(-14)}" → 원문 "…${src.slice(i, i + tail.length + 6)}…"`);
        break;
      }
    }
  }
  console.log(`\n[${label}] 절단 ${rows.length}건 (파편 ${rows.filter((r) => r.includes('✗')).length} / 요약 ${rows.filter((r) => r.includes('~')).length})`);
  for (const r of rows) console.log(r);
}
console.log(`\n총계: 파편(BLOCKED 대상) ${totalBroken} · 요약(REVIEW 대상) ${totalPartial}`);
process.exit(totalBroken > 0 ? 1 : 0);
