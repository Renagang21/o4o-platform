/**
 * WO-O4O-OTC-TRACK-A-3H-PRODUCTION-NA-V1 (에이전트 나) — READ-ONLY 헬퍼.
 *
 * byte-identical 재구성 그룹의 번역 JSON 을 live out-en(동일 source_ref, 대상 밖 검토완료 en canonical)에서
 * 빌더 계약 역매핑으로 복원한다. build(복원 번역) == live out-en md5 를 검증(새 medical fact 0 구조 증명).
 * 공용 registry·DB write 없음. 산출 = translations/ 번역 JSON.
 *
 * Usage(apps/api-server):
 *   DB_PASSWORD=*** npx tsx src/scripts/otc-en-reverse-map-na.ts --key="시트룰린말산염|500밀리그램|정" \
 *     --candidate=12b056c0-... --targetIds=<comma uuid> --out=otc-en-translations-citrulline-500mg-na-v1.json
 *   (--targetIds 생략 시 source_ref 전체 out-en 에서 복원; 지정 시 그 master 제외한 out 에서 복원)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');
const TRANSLATIONS_DIR = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations');
const arg = (k: string) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');

// sd-* HTML → DrugOtcEnTranslation (빌더 정확 역). unescape 는 esc() 역.
const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
function parseEn(html: string, key: string): DrugOtcEnTranslation {
  const pick = (re: RegExp) => { const m = html.match(re); return m ? unesc(m[1].trim()) : ''; };
  const title = pick(/<h1>([\s\S]*?)(?:<small>|<\/h1>)/);
  const whyThisOne = pick(/<h1>[\s\S]*?<small>([\s\S]*?)<\/small>/);
  const efficacy = pick(/<p class="sd-intro">([\s\S]*?)<\/p>/);
  // sd-core items
  const st: Record<string, string> = {};
  const coreRe = /<span class="sd-tag">([\s\S]*?)<\/span>\s*<p>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null;
  while ((m = coreRe.exec(html))) st[unesc(m[1].trim())] = unesc(m[2].trim());
  // usageLabel = sd-core 이후 첫 <h2> (At a glance 다음). "Before you take/use this" 는 caution 헤더.
  const h2s = [...html.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((x) => unesc(x[1].trim()));
  const usageLabel = h2s.find((h) => h !== 'At a glance' && !/^Before you /.test(h)) || 'How to take it';
  const usage = pick(/<p class="sd-intake">([\s\S]*?)<\/p>/);
  const cautions = [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => unesc(x[1].trim()));
  const caution = cautions.join(' ');
  return { groupKey: key, title, usageLabel, efficacy, usage, caution, summaryTable: st };
}

async function main() {
  const key = arg('key'); const candidate = arg('candidate'); const out = arg('out');
  const targetIds = arg('targetIds').split(',').map((s) => s.trim()).filter(Boolean);
  if (!key || !candidate || !out) { console.error('--key --candidate --out 필요'); process.exit(2); }

  const { Client } = await import('pg');
  const c = new Client({ host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), user: process.env.DB_USER || 'o4o_api', database: process.env.DB_NAME || 'o4o_platform', password: process.env.DB_PASSWORD });
  await c.connect();
  const params: any[] = [candidate];
  let extra = '';
  if (targetIds.length) { params.push(targetIds); extra = ` AND master_id <> ALL($2::uuid[])`; }
  const agg = await c.query(`
    SELECT count(DISTINCT md5(content))::int dmd5, min(summary) summ, count(*)::int total
    FROM shared_product_descriptions
    WHERE source_ref_id=$1::uuid AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL${extra}`, params);
  const r = await c.query(`
    SELECT content, md5(content) h
    FROM shared_product_descriptions
    WHERE source_ref_id=$1::uuid AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL${extra}
    LIMIT 1`, params);
  await c.end();
  if (!r.rows.length) { console.error('live out-en 없음 — byte-identical 재구성 불가(fresh 번역 필요)'); process.exit(3); }
  const live = { ...r.rows[0], summ: agg.rows[0].summ };
  if (agg.rows[0].dmd5 !== 1) { console.error(`live out-en 지문 비균일 (${agg.rows[0].dmd5}종) — 수동 검토 필요`); process.exit(4); }

  const tr = parseEn(live.content, key);
  const built = buildDrugOtcEnConsumerHtml(tr);
  const match = md5(built.html) === live.h;
  const summ = await (async () => live.summ)();
  console.log(`group=${key} liveMd5=${live.h} buildMd5=${md5(built.html)} MATCH=${match} missing=${built.missing} summary=${JSON.stringify(summ)}`);
  if (!match) {
    fs.writeFileSync(path.resolve(process.cwd(), 'src/scripts/data/_rmap_build.html'), built.html);
    fs.writeFileSync(path.resolve(process.cwd(), 'src/scripts/data/_rmap_live.html'), live.content);
    console.error('MISMATCH — build/live html 저장. 번역 미작성.'); process.exit(5);
  }
  const doc = {
    wo: 'WO-O4O-OTC-TRACK-A-3H-PRODUCTION-NA-V1',
    guide: 'OTC-EN-TRANSLATION-GUIDE V0.5 · OTC-KO-EN-GLOSSARY V0.2',
    note: `${key}: 동일 source_ref ${candidate} out-of-scope 검토완료 en canonical(md5 ${live.h}) 빌더 역매핑 복원. build == live byte-identical → 새 medical fact 0. en-complete runner 가 게이트로 재증명.`,
    translations: [tr],
    summary: summ,
  };
  fs.writeFileSync(path.join(TRANSLATIONS_DIR, out), JSON.stringify(doc, null, 2) + '\n', 'utf8');
  console.log(`WROTE ${out} (build==live PASS)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
