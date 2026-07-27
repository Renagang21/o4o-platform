/**
 * WO-O4O-HFF-KO-FIRST-10000-INTAKE-HINT-AND-DESIGN-TARGETED-BACKFILL-V1 — 사후 독립검증(READ-ONLY).
 *
 * 러너 산출물이 아니라 **DB 실측**만으로 판정한다. write 0.
 * Usage: PGPW=... PROXY_PORT=5472 node apps/api-server/src/scripts/hff-ko-first-10000-targeted-backfill-verify.mjs
 */
import pg from 'pg';
import fs from 'node:fs';

const PORT = parseInt(process.env.PROXY_PORT ?? '5471', 10);
const MANIFEST = 'apps/api-server/src/scripts/data/hff-ko-first-10000-targeted-backfill-manifest.json';
const SIGNATURE = '식약처에 신고된 건강기능식품입니다';
const GENERIC_FALLBACK = '섭취 전 제품 표시사항의 주의사항을 확인하십시오.';

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const ids = manifest.map((m) => m.descriptionId);

const c = new pg.Client({ host: '127.0.0.1', port: PORT, user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();

const one = async (sql, params = []) => (await c.query(sql, params)).rows[0];
const out = {};

out.manifestCount = manifest.length;

// 1) 대상 행 실측 — 존재·연결·상태
out.targetRows = (await one(
  `SELECT count(*)::int n FROM shared_product_descriptions
   WHERE id = ANY($1) AND description_type='STORE' AND status='canonical'
     AND coalesce(language,'ko')='ko' AND deleted_at IS NULL AND source_type='o4o_hff_generated'`, [ids])).n;

out.linkDrift = (await one(
  `SELECT count(*)::int n FROM shared_product_descriptions d
   JOIN unnest($1::uuid[], $2::uuid[], $3::uuid[]) AS m(did, mid, cid) ON m.did = d.id
   WHERE d.master_id <> m.mid OR d.source_ref_id <> m.cid`,
  [ids, manifest.map((m) => m.productMasterId), manifest.map((m) => m.candidateId)])).n;

out.candidateLinkDrift = (await one(
  `SELECT count(*)::int n FROM shared_product_descriptions d
   JOIN product_candidates pc ON pc.id = d.source_ref_id
   WHERE d.id = ANY($1) AND (pc.matched_product_master_id IS DISTINCT FROM d.master_id
     OR pc.candidate_status <> 'approved_new_master' OR pc.deleted_at IS NOT NULL)`, [ids])).n;

// 2) canonical 유일성 / statementNo 중복
out.canonicalDup = (await one(
  `SELECT coalesce(max(c),0)::int n FROM (
     SELECT count(*) c FROM shared_product_descriptions
     WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical'
       AND coalesce(language,'ko')='ko' AND deleted_at IS NULL
     GROUP BY master_id) t WHERE c > 1`, [manifest.map((m) => m.productMasterId)])).n;

out.statementNoDup = (await one(
  `SELECT count(*)::int n FROM (
     SELECT mfds_permit_number FROM product_masters
     WHERE id = ANY($1) AND mfds_permit_number IS NOT NULL
     GROUP BY mfds_permit_number HAVING count(*) > 1) t`, [manifest.map((m) => m.productMasterId)])).n;

// 3) 본문 실측 — 보정 결과
const body = await one(`
  SELECT
    count(*) FILTER (WHERE content LIKE '%sd-note%')::int sdNote,
    count(*) FILTER (WHERE content LIKE '%sd-func%')::int sdFunc,
    count(*) FILTER (WHERE content LIKE '%' || $2 || '%')::int genericFallback,
    count(*) FILTER (WHERE content LIKE '%<p class="sd-who">%')::int sdWhoOnP,
    count(*) FILTER (WHERE content LIKE '%<h2>기능성 상세</h2>%')::int dupFuncSection,
    count(*) FILTER (WHERE content LIKE '%<h2>섭취 시 참고사항</h2>%')::int hintSection,
    count(*) FILTER (WHERE content LIKE '%<div class="sd-cta"><p>%')::int cta,
    count(*) FILTER (WHERE content LIKE '%<div class="sd-foot">제품 표시사항을 함께 확인하십시오.</div>%')::int foot,
    count(*) FILTER (WHERE content LIKE '%<style%' OR content LIKE '%style=%')::int styleTag,
    count(*) FILTER (WHERE content LIKE '%<ul></ul>%' OR content LIKE '%<div class="sd-item"></div>%')::int emptyCard,
    count(*) FILTER (WHERE length(content) < 200)::int tooShort,
    count(*)::int n
  FROM shared_product_descriptions WHERE id = ANY($1)`, [ids, GENERIC_FALLBACK]);
out.body = body;

// 4) 참고사항 섹션 수 == INTAKE_HINT1 유효 제품 수
out.hintExpected = manifest.filter((m) => m.hintStatus === 'OK').length;

// 5) manifest 밖 write 0 — apply 창(대상 행 updated_at 의 min~max)에 갱신된 manifest 밖 행.
//    창은 DB 실측으로 자기유도한다(클록/타임존 가정 없음).
out.applyWindow = await one(
  `SELECT min(updated_at) AS from_at, max(updated_at) AS to_at FROM shared_product_descriptions WHERE id = ANY($1)`, [ids]);
out.outsideWrites = (await one(
  `SELECT count(*)::int n FROM shared_product_descriptions
   WHERE NOT (id = ANY($1))
     AND updated_at BETWEEN (SELECT min(updated_at) FROM shared_product_descriptions WHERE id = ANY($1))
                        AND (SELECT max(updated_at) FROM shared_product_descriptions WHERE id = ANY($1))`, [ids])).n;
// 참고: 같은 날 다른 세션(OTC 트랙)의 write 는 창 밖이며 본 WO 범위가 아니다.
out.otherSessionWritesToday = (await c.query(
  `SELECT source_type, count(*)::int n FROM shared_product_descriptions
   WHERE NOT (id = ANY($1)) AND updated_at >= date_trunc('day', now()) GROUP BY 1 ORDER BY 2 DESC`, [ids])).rows;

// 6) INSERT/DELETE 0 — 스킴 전체 행 수 및 소프트삭제 수
out.schemeTotal = (await one(
  `SELECT count(*)::int n FROM shared_product_descriptions
   WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'
     AND coalesce(language,'ko')='ko' AND deleted_at IS NULL AND content LIKE '%' || $1 || '%'`, [SIGNATURE])).n;
out.softDeletedInTarget = (await one(
  `SELECT count(*)::int n FROM shared_product_descriptions WHERE id = ANY($1) AND deleted_at IS NOT NULL`, [ids])).n;
out.hffGeneratedTotal = (await one(
  `SELECT count(*)::int n FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND deleted_at IS NULL`)).n;

// 7) 참고사항 문장 ⊆ 공식 INTAKE_HINT1 (DB 실측 재검증, 전건)
const rows = (await c.query(`
  SELECT d.id, d.content, pc.raw_payload::jsonb->'source'->>'INTAKE_HINT1' hint
  FROM shared_product_descriptions d JOIN product_candidates pc ON pc.id = d.source_ref_id
  WHERE d.id = ANY($1)`, [ids])).rows;
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
let notGrounded = 0, sectionMismatch = 0, checkedItems = 0;
for (const r of rows) {
  const sec = (r.content.match(/<h2>섭취 시 참고사항<\/h2>[\s\S]*?(?=\n  <h2>)/) || [''])[0];
  const hint = (r.hint || '').replace(/\s+/g, ' ').trim();
  const items = (sec.match(/<li>([\s\S]*?)<\/li>/g) || []).map((x) => unesc(x.replace(/<\/?li>/g, '')).trim());
  const tags = [...sec.matchAll(/<span class="sd-tag">([\s\S]*?)<\/span>/g)].map((m) => unesc(m[1]).trim());
  for (const t of [...items, ...tags]) { checkedItems++; if (!hint.includes(t)) notGrounded++; }
  if ((sec ? 1 : 0) !== (items.length ? 1 : 0)) sectionMismatch++;
}
out.hintGrounding = { checkedItems, notGrounded, sectionMismatch };

const verdict = {
  targetRowsOk: out.targetRows === manifest.length,
  linkDriftZero: out.linkDrift === 0 && out.candidateLinkDrift === 0,
  canonicalDupZero: out.canonicalDup === 0,
  statementNoDupZero: out.statementNoDup === 0,
  unstyledClassZero: body.sdnote === 0 && body.sdfunc === 0 && body.sdwhoonp === 0,
  genericFallbackZero: body.genericfallback === 0,
  dupFuncSectionZero: body.dupfuncsection === 0,
  hintSectionMatches: body.hintsection === out.hintExpected,
  ctaAll: body.cta === manifest.length,
  footAll: body.foot === manifest.length,
  noStyleTag: body.styletag === 0,
  noEmptyCard: body.emptycard === 0,
  noTooShort: body.tooshort === 0,
  outsideWritesZero: out.outsideWrites === 0,
  noDelete: out.softDeletedInTarget === 0,
  schemeTotalUnchanged: out.schemeTotal === manifest.length,
  hintGroundingZero: out.hintGrounding.notGrounded === 0 && out.hintGrounding.sectionMismatch === 0,
};
out.verdict = verdict;
out.PASS = Object.values(verdict).every(Boolean);

console.log(JSON.stringify(out, null, 1));
await c.end();
process.exit(out.PASS ? 0 : 1);
