// WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2-LIVE-APPLY-V1 — EN 저작용 **무절단** 공식 원문 덤프 (에이전트 가).
//
// 배경: 공용 러너의 `--emit-sample` 은 주의 축을 `slice(0, 1200)` 으로 절단한다(러너 1293행).
//       절단본으로 EN 을 저작하면 공식 주의 정보층이 소실되므로, 저작 기준 원문은 무절단으로 따로 뽑는다.
//       공용 러너는 수정하지 않는다(본 스크립트는 별도 read-only 산출).
//
// 계약: 섹션 추출·정규화는 census-v2 VERBATIM. 대상은 V2 SSOT(ga) ∩ dry-run manifest eligible.
// read-only · DB write 0 · 자격증명은 process.env 로만 사용(값 출력 0).
//
// Usage(apps/api-server):
//   node --import tsx src/scripts/otc-v2-authoring-source-full.ga.mjs   (또는 npx tsx ...)
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

const DATA = 'src/scripts/data';
const SSOT = path.join(DATA, 'otc-remaining-shard-assignment-ssot-v2.json');
const CENSUS = path.join(DATA, 'otc-remaining-full-corpus-census-v2.json');
const MANIFEST = path.join(DATA, 'otc-v2-dryrun-manifest.ga.json');
const OUT = process.env.OUT || path.join(DATA, 'otc-v2-authoring-source-full.ga.json');

/** census-v2.ts:60-66 VERBATIM */
function sections(content) {
  const out = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const stripTags = (s) => s.replace(/<[^>]+>/g, ' ');
const clean = (s) => stripTags(s || '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
const census = JSON.parse(fs.readFileSync(CENSUS, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const holdFp = new Set(manifest.groups.filter((g) => g.anomalies && g.anomalies.length).map((g) => g.fp));
const gaFp = new Set(ssot.shards.ga.fingerprintList);
const groups = census.readyGroups.filter((g) => gaFp.has(g.fp) && !holdFp.has(g.fp));
if (groups.length !== 237) throw new Error(`eligible ${groups.length} !== 237`);

const { DataSource } = await import('typeorm');
const ds = new DataSource({
  type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10),
  username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'o4o_platform',
  entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 },
});
await ds.initialize();
const out = [];
try {
  for (const g of groups) {
    const rows = await ds.query(
      `SELECT content FROM shared_product_descriptions
       WHERE master_id=$1::uuid AND source_type='mfds_easy_drug' AND description_type='STORE'
         AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
       ORDER BY length(content) DESC LIMIT 1`, [[...g.masterIds].sort()[0]]);
    const sec = sections(rows[0]?.content || '');
    const ind = clean(sec['효능·효과'] || '');
    const dos = clean(sec['용법·용량'] || '');
    const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용'], sec['이상반응']]
      .filter(Boolean).map(clean).join('\n\n');
    out.push({ fp: g.fp, gencode: g.gencode, route: g.route, form: g.form, size: g.size,
      official: { indication: ind, dosage: dos, caution: cau },
      lens: { ind: ind.length, dos: dos.length, cau: cau.length } });
  }
} finally { await ds.destroy(); }

fs.writeFileSync(OUT, JSON.stringify({
  wo: 'WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2-LIVE-APPLY-V1', shard: 'ga', readOnly: true, dbWrite: 0,
  note: '무절단 공식 원문(EN 저작 기준). 절단·요약 없음.', groups: out,
}, null, 1) + '\n', 'utf8');
const totalCau = out.reduce((a, x) => a + x.lens.cau, 0);
console.log(`FULL-SOURCE ga — ${out.length} fp / ${out.reduce((a, x) => a + x.size, 0)} master → ${OUT}`);
console.log(`  caution 총 ${totalCau}자 · 최대 ${Math.max(...out.map((x) => x.lens.cau))}자 · 1200자 초과 그룹 ${out.filter((x) => x.lens.cau > 1200).length}`);
console.log(`  효능 결손 ${out.filter((x) => !x.official.indication).length} · 용법 결손 ${out.filter((x) => !x.official.dosage).length} · 주의 결손 ${out.filter((x) => !x.official.caution).length}`);
