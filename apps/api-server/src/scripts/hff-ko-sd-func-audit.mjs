/**
 * WO-.../sd-func 사용 구조 전수 감사 (read-only).
 * sd-func 가 **단일 의미(기능성 목록)** 로만 쓰이는지, DOM 구조가 일관되는지 확인하여
 * A안(renderer CSS 지원) 적용 가능성을 판정한다.
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-sd-func-usage-and-style-audit-v1.json`;
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5495', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

// 1) 전역 사용량 (HFF 한정 + 전체 SPD)
const usage = (await c.query(`
  SELECT
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND content LIKE '%sd-func%') AS all_spd_sdfunc,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND source_type='o4o_hff_generated' AND content LIKE '%sd-func%') AS hff_sdfunc,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND source_type<>'o4o_hff_generated' AND content LIKE '%sd-func%') AS nonhff_sdfunc,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND content LIKE '%sd-func%' AND description_type<>'STORE') AS non_store_sdfunc,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND content LIKE '%sd-func%' AND coalesce(language,'ko')<>'ko') AS non_ko_sdfunc
`)).rows[0];

// 2) sd-func 직전 헤딩 분포 (= 용도)
const ctx = (await c.query(`
  SELECT m[1] AS heading, count(*)::int AS c
  FROM shared_product_descriptions spd,
       regexp_matches(spd.content, '<h2>([^<]*)</h2><ul class="sd-func">', 'g') AS m
  WHERE spd.deleted_at IS NULL AND spd.content LIKE '%sd-func%'
  GROUP BY 1 ORDER BY c DESC LIMIT 20`)).rows;

// 3) sd-func 가 h2 직후가 아닌 위치에 쓰이는 경우 (다른 용도 의심)
const notAfterH2 = (await c.query(`
  SELECT count(*)::int c FROM shared_product_descriptions
  WHERE deleted_at IS NULL AND content LIKE '%sd-func%'
    AND NOT (content ~ '<h2>[^<]*</h2><ul class="sd-func">')`)).rows[0].c;

// 4) sd-func 태그 종류 (ul 이외 사용 여부)
const tagKinds = (await c.query(`
  SELECT m[1] AS tag, count(*)::int AS c
  FROM shared_product_descriptions spd,
       regexp_matches(spd.content, '<([a-z]+)[^>]*class="sd-func"', 'g') AS m
  WHERE spd.deleted_at IS NULL AND spd.content LIKE '%sd-func%'
  GROUP BY 1 ORDER BY c DESC`)).rows;

// 5) 내부 구조 패턴
const struct = (await c.query(`
  SELECT
    count(*) FILTER (WHERE content ~ '<ul class="sd-func"><li><b>[^<]*</b><ul class="sd-why">')::int AS nested_b_sdwhy,
    count(*) FILTER (WHERE content ~ '<ul class="sd-func"><li>[^<]')::int AS flat_li_text,
    count(*) FILTER (WHERE content ~ '<ul class="sd-func"><li><b>[^<]*</b>[^<]')::int AS li_b_then_text,
    count(*) FILTER (WHERE content LIKE '%sd-func%' AND content LIKE '%왜 이 제품인가%')::int AS in_wae_family,
    count(*) FILTER (WHERE content LIKE '%sd-func%' AND content NOT LIKE '%왜 이 제품인가%')::int AS outside_wae_family
  FROM shared_product_descriptions
  WHERE deleted_at IS NULL AND content LIKE '%sd-func%'`)).rows[0];

// 6) 대표 표본 (구조별)
const samples = [];
for (const [label, sql] of [
  ['NESTED_B_SDWHY', `content ~ '<ul class="sd-func"><li><b>[^<]*</b><ul class="sd-why">'`],
  ['FLAT_LI_TEXT', `content ~ '<ul class="sd-func"><li>[^<]'`],
  ['LI_B_THEN_TEXT', `content ~ '<ul class="sd-func"><li><b>[^<]*</b>[^<]'`],
]) {
  const r = (await c.query(`
    SELECT id, content FROM shared_product_descriptions
    WHERE deleted_at IS NULL AND content LIKE '%sd-func%' AND ${sql} LIMIT 2`)).rows;
  for (const x of r) {
    const m = x.content.match(/<h2>[^<]*<\/h2><ul class="sd-func">[\s\S]*?<\/ul>(?=\s*<h2>|\s*<\/div>)/);
    samples.push({ pattern: label, canonicalId: x.id, excerpt: (m ? m[0] : x.content).slice(0, 900) });
  }
}

// 7) sd-func 사용 문서의 class 집합 (미정의 class 동반 여부)
const classAgg = (await c.query(`
  SELECT m[1] AS cls, count(*)::int AS c
  FROM shared_product_descriptions spd,
       regexp_matches(spd.content, 'class="([^"]+)"', 'g') AS m
  WHERE spd.deleted_at IS NULL AND spd.content LIKE '%sd-func%'
  GROUP BY 1 ORDER BY c DESC LIMIT 40`)).rows;

await c.end();

// 8) renderer 정의 class 집합 대조
const src = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8');
const css = src.match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
const definedInCss = [...new Set([...css.matchAll(/\.(sd-[a-z0-9-]+|is-[a-z0-9-]+)/g)].map((m) => m[1]))].sort();
const usedClasses = [...new Set(classAgg.flatMap((r) => r.cls.split(/\s+/)).filter(Boolean))].sort();
const undefinedUsed = usedClasses.filter((x) => !definedInCss.includes(x));

/* 판정은 **언어 중립**이어야 한다.
   sd-func 는 ko/en 쌍으로 저장되며 en 문서의 헤딩은 "Officially recognised functions…" 이다.
   `/기능성/` 만으로 검사하면 en 절반이 "기능성 아님" 으로 오판되고,
   `왜 이 제품인가` 존재로 family 를 검사하면 en 문서가 전부 family 밖으로 오판된다. */
const FN_HEADING = /기능성|function/i;
const singlePurpose = ctx.every((r) => FN_HEADING.test(r.heading));
const decision = {
  sdFuncOnlyAfterH2: notAfterH2 === 0,
  sdFuncOnlyUlTag: tagKinds.length === 1 && tagKinds[0].tag === 'ul',
  headingsAllFunctionRelated: singlePurpose,
  structureUniformNestedBSdWhy: struct.nested_b_sdwhy === usage.all_spd_sdfunc,
  noFlatOrTextOnlyVariant: struct.flat_li_text === 0 && struct.li_b_then_text === 0,
  onlyHffSourceType: usage.nonhff_sdfunc === 0,
  onlyStoreDescriptionType: usage.non_store_sdfunc === 0,
};
decision.optionAViable = Object.values(decision).every(Boolean);
decision.languageSplit = { ko: usage.all_spd_sdfunc - usage.non_ko_sdfunc, nonKo: usage.non_ko_sdfunc };
decision.note = 'sd-func 는 ko/en 쌍으로 저장된다. en 문서는 왜-family 헤딩 대신 영문 헤딩을 쓰므로 family 검사로 배제하면 안 된다.';

const out = {
  auditedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  usage, sdFuncNotAfterH2: notAfterH2, tagKinds, structure: struct,
  headingContextDistribution: ctx,
  classesUsedInSdFuncDocs: classAgg.slice(0, 40),
  rendererDefinedClasses: definedInCss,
  undefinedClassesUsed: undefinedUsed,
  samples,
  decision,
  recommendation: decision.optionAViable
    ? 'A안 — 저장 콘텐츠 무변경, 공용 renderer CSS 에 sd-func 최소 스타일 추가'
    : 'A안 불가 — 사용 의미가 단일하지 않음. 안전 대상만 B안 또는 별도 구조 검토',
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ out: OUT, usage, sdFuncNotAfterH2: notAfterH2, tagKinds, structure: struct,
  headingContextDistribution: ctx.slice(0, 8), undefinedClassesUsed: undefinedUsed, decision,
  recommendation: out.recommendation }, null, 2));
