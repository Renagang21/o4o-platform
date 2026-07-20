/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-A-KO-EN-GA-V1 (에이전트 가)
 *
 * 번들 A 4그룹 EN 재사용 사전 증명 — read-only, DB write 0.
 *   ① 대상 밖(out, source_ref 공유) 검토완료 en canonical 지문(md5/summary/n) 균일성
 *   ② 마스터 번역 발췌로 build == live out en **byte-identical** 증명
 *   ③ 대상 en 기존 상태(0 이어야)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DataSource } from 'typeorm';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const TRANS = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations');

interface G { groupKey: string; candidate: string; koRunBase: string; srcFile: string }
const GROUPS: G[] = [
  { groupKey: '락토바실루스아시도필루스균|300밀리그램|캡슐', candidate: '177466cf-a57b-4381-b1ff-44bc87c12673', koRunBase: 'otc-grounded-upgrade-lactobacillus-acidophilus-300mg-capsule', srcFile: path.join(TRANS, 'otc-en-translations-v1.json') },
  { groupKey: '알파칼시돌|0.5마이크로그램|연질캡슐', candidate: '0436f0d8-3dbe-4939-b511-de3bcd69593c', koRunBase: 'otc-grounded-upgrade-alfacalcidol-0.5mcg-softcap', srcFile: path.join(DATA, 'otc-en-translations-batch-01b-alfacalcidol-v1.json') },
  { groupKey: '아세틸시스테인|100밀리그램|캡슐', candidate: '240871d7-3dce-43e9-a0d5-3b3bcbd7c5a4', koRunBase: 'otc-grounded-upgrade-acetylcysteine-100mg-capsule', srcFile: path.join(TRANS, 'otc-en-translations-v1.json') },
  { groupKey: '나프록센나트륨|275밀리그램|정', candidate: '006f1a2b-f1f7-40a6-ac10-7f0093a150a1', koRunBase: 'otc-grounded-upgrade-naproxen-sodium-275mg-jeong', srcFile: path.join(DATA, 'otc-en-translations-batch-01-v1.json') },
];

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();
  const out: any[] = [];
  try {
    for (const g of GROUPS) {
      const masterIds: string[] = JSON.parse(fs.readFileSync(path.join(DATA, `${g.koRunBase}.run.json`), 'utf8')).rollback_master_ids;
      const src = JSON.parse(fs.readFileSync(g.srcFile, 'utf8')) as { translations: DrugOtcEnTranslation[] };
      const trs = src.translations.filter((t) => t.groupKey === g.groupKey);
      const built = trs.length === 1 ? buildDrugOtcEnConsumerHtml(trs[0]) : { html: '', missing: ['no-translation'] };

      const ref = await ds.query(
        `SELECT md5(content) h, count(*)::int n, min(summary) min_summary, max(summary) max_summary, min(status) st
         FROM shared_product_descriptions
         WHERE source_ref_id=$1::uuid AND NOT master_id=ANY($2::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL
         GROUP BY 1`, [g.candidate, masterIds]);
      const tgtEn = await ds.query(
        `SELECT count(*)::int n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [masterIds]);

      out.push({
        groupKey: g.groupKey, targetN: masterIds.length, translationsFound: trs.length,
        builtMd5: md5(built.html), builtLen: built.html.length, missing: built.missing,
        hangulInBuild: /[가-힣]/.test(built.html),
        outEnGroups: ref.map((r: any) => ({ md5: r.h, n: r.n, summaryUniform: r.min_summary === r.max_summary, summary: r.min_summary })),
        targetExistingEn: tgtEn[0].n,
        byteIdentical: ref.length === 1 && ref[0].h === md5(built.html),
      });
    }
  } finally { await ds.destroy(); }
  console.log(JSON.stringify(out, null, 2));
  console.log('\nALL_BYTE_IDENTICAL =', out.every((o) => o.byteIdentical));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
