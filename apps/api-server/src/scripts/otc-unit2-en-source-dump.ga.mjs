// WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-EN-AUTHORING-AND-VALIDATION-V1 — EN 저작 기준 원문 덤프 (에이전트 가)
//
// read-only · DB write 0 · 절단 없음. 승인 SSOT / dry-run manifest / Unit1 파일은 읽기만 한다.
// fp 그룹은 10축 안전지문 동일 그룹이므로 대표 master 1건의 공식 원문이 그룹 전체를 대표한다
// (readiness 에서 fp 내부 안전지문 mismatch 0 확인 완료).
//
// Usage(apps/api-server): npx tsx src/scripts/otc-unit2-en-source-dump.ga.mjs
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

const DATA = 'src/scripts/data';
const SSOT = path.join(DATA, 'otc-unproduced-oral-unit2-approved-ssot-v1.json');
const MANIFEST = path.join(DATA, 'otc-unproduced-oral-unit2-dryrun-manifest-v1.json');
const OUT = process.env.OUT || path.join(DATA, 'otc-unproduced-oral-unit2-authoring-source.ga.json');

/** census VERBATIM */
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
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const groups = [...manifest.groups].sort((a, b) => (a.fp < b.fp ? -1 : 1));
if (groups.length !== ssot.totals.fingerprints) throw new Error(`fp ${groups.length} != ${ssot.totals.fingerprints}`);
const repBy = new Map(ssot.groups.map((g) => [g.fp, [...g.masterIds].sort()[0]]));

const { DataSource } = await import('typeorm');
const ds = new DataSource({
  type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10),
  username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'o4o_platform',
  entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 600000 },
});
await ds.initialize();
const out = [];
try {
  for (const g of groups) {
    const rep = repBy.get(g.fp);
    const rows = await ds.query(
      `SELECT content FROM shared_product_descriptions
       WHERE master_id=$1::uuid AND source_type='mfds_easy_drug' AND description_type='STORE'
         AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
       ORDER BY length(content) DESC LIMIT 1`, [rep]);
    const sec = sections(rows[0]?.content || '');
    const indication = clean(sec['효능·효과'] || '');
    const dosage = clean(sec['용법·용량'] || '');
    const caution = [sec['경고'], sec['사용상 주의사항'], sec['상호작용'], sec['이상반응']].filter(Boolean).map(clean).join('\n\n');
    out.push({
      fp: g.fp, gencode: g.gencode, route: g.route, form: g.form, size: g.size, sourceRef: g.sourceRef,
      official: { indication, dosage, caution },
      lens: { ind: indication.length, dos: dosage.length, cau: caution.length },
    });
  }
} finally { await ds.destroy(); }

fs.writeFileSync(OUT, JSON.stringify({
  wo: 'WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-EN-AUTHORING-AND-VALIDATION-V1',
  unitId: 'oral-unit-2', readOnly: true, dbWrite: 0,
  note: 'EN 저작 기준 무절단 공식 원문. 절단·요약 없음.', groups: out,
}, null, 1) + '\n', 'utf8');
console.log(`UNIT2-SOURCE — ${out.length} fp / ${out.reduce((a, x) => a + x.size, 0)} master → ${OUT}`);
console.log(`  결손 ind ${out.filter((x) => !x.official.indication).length} · dos ${out.filter((x) => !x.official.dosage).length} · cau ${out.filter((x) => !x.official.caution).length}`);
console.log(`  caution 최대 ${Math.max(...out.map((x) => x.lens.cau))}자 · 총 ${out.reduce((a, x) => a + x.lens.cau, 0)}자`);
