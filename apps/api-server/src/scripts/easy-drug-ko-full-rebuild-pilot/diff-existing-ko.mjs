/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1 — 단계 9 기존 KO 대비 비교
 *
 * 기존 KO 설명서는 **생성 입력이 아니다**. 이 스크립트는 이미 만들어진 신규 설명서
 * (results/leaflets.jsonl) 와 e약은요 원문을 기준으로, 기존 KO 가 무엇을 잃고/더하고/틀렸는지
 * 사후 집계만 한다. 기존 KO 본문은 여기서 처음 읽고, 어떤 산출물에도 재사용하지 않는다.
 *
 * 축 (WO §9):
 *   preserved            원문 항목이 기존 KO 에도 남아 있음
 *   missing              원문 항목이 기존 KO 에 없음        (신규는 전량 보존 → 해소)
 *   extra                기존 KO 에만 있는 의료 문장(원문 밖)
 *   contradicted         숫자·부정어가 원문과 어긋남
 *   wrongAttribution     다른 허가품목 제품명·품목기준코드 혼입
 *   truncated            문장이 종결되지 않고 잘림
 *
 * read-only. write 0.
 *
 * 산출:
 *   results/existing-ko-diff.jsonl   master 1행 (미추적 — 본문 파생 수치 포함)
 *   results/existing-ko-diff.json    집계 (추적)
 *
 * 사용: node diff-existing-ko.mjs [--port 15441]
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const PORT = (() => {
  const i = process.argv.indexOf('--port');
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : parseInt(process.env.PROXY_PORT || '15441', 10);
})();

const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

const stripTags = (h) => String(h ?? '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h1|h2|div)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/** 대조 정규화 — 공백·구두점·괄호 차이는 손실로 보지 않는다. */
const norm = (s) => String(s ?? '').replace(/[\s ]/g, '').replace(/[·,.()（）\[\]"'`~\-–—:;]/g, '');

const sentences = (t) => String(t ?? '')
  .replace(/\r\n/g, '\n').split(/\n+/)
  .flatMap((l) => l.split(/(?<=[다요오]\.)\s*/))
  .map((s) => s.trim()).filter(Boolean);

/** 기존 KO 템플릿 상용구 — 제품 고유 의료 문장이 아니므로 `extra` 로 세지 않는다. */
const BOILERPLATE = [
  '한눈에 보기', '작용', '효능', '효과', '복용법', '사용법', '사용 방법', '주의사항', '보관',
  '이상반응', '상호작용', '제품 개요', '제품명', '제조', '수입사', '제형', '품목기준코드',
  '일반의약품', '전문의약품', '매장', '약사', '문의', '상담', '설명서', '자료입니다',
];
const isBoiler = (s) => {
  const n = norm(s);
  if (n.length < 8) return true;
  return BOILERPLATE.some((b) => n.includes(norm(b))) && n.length < 80;
};

const numsOf = (t) => (String(t ?? '').match(/\d+(?:\.\d+)?/g) ?? []);
const NEG = /하지\s*마십시오|하지\s*마시오|하지\s*마세요|말\s*것|안\s*[됩되]|금기|금지|삼가|피하십시오|않는다|없습니다|아닙니다/g;

async function main() {
  const pilot = readJsonl(path.join(RESULTS, 'pilot-selection.jsonl'));
  const src = new Map(readJsonl(path.join(RESULTS, 'source-snapshot.jsonl')).map((r) => [r.itemSeq, r]));
  const leaflets = new Map(readJsonl(path.join(RESULTS, 'leaflets.jsonl')).map((r) => [r.masterId, r]));

  const pool = new pg.Pool({
    host: '127.0.0.1', port: PORT,
    user: process.env.PGUSER || 'o4o_api',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'o4o_platform',
    statement_timeout: 900000, max: 2,
  });
  const c = await pool.connect();
  await c.query('SET default_transaction_read_only = on');
  const { rows } = await c.query(`
    SELECT master_id::text AS "masterId", id::text AS "descId", content
    FROM shared_product_descriptions
    WHERE deleted_at IS NULL AND description_type='STORE'
      AND COALESCE(language,'ko')='ko' AND status='canonical'
      AND master_id = ANY($1::uuid[])
    ORDER BY master_id, id`, [pilot.map((p) => p.masterId)]);
  c.release();
  await pool.end();

  const koByMaster = new Map();
  for (const r of rows) if (!koByMaster.has(r.masterId)) koByMaster.set(r.masterId, r);

  // 다른 제품 식별자 사전 — 오귀속 탐지용(자기 itemSeq/제품명은 제외)
  const otherSeq = new Set([...src.keys()]);
  const nameBySeq = new Map([...src.entries()].map(([k, v]) => [k, (v.itemName ?? '').split('\n')[0].trim()]));

  const out = [];
  const agg = {
    pilot: pilot.length, withExistingKo: 0, noExistingKo: 0,
    sourceItemsTotal: 0, preservedTotal: 0, missingTotal: 0,
    mastersWithMissing: 0, mastersWithExtra: 0, mastersWithContradiction: 0,
    mastersWithWrongAttribution: 0, mastersWithTruncation: 0, mastersClean: 0,
    extraSentencesTotal: 0, truncationsTotal: 0,
    newLeafletPreservedTotal: 0, newLeafletMissingTotal: 0,
  };

  for (const p of pilot) {
    const ko = koByMaster.get(p.masterId);
    const s = src.get(p.itemSeq);
    const leaf = leaflets.get(p.masterId);
    if (!ko) {
      agg.noExistingKo += 1;
      out.push({ masterId: p.masterId, itemSeq: p.itemSeq, hasExistingKo: false });
      continue;
    }
    agg.withExistingKo += 1;

    const koPlain = stripTags(ko.content);
    const koNorm = norm(koPlain);
    const newNorm = leaf ? norm(stripTags(leaf.html)) : '';

    const srcItems = [
      s.efcyQesitm, s.useMethodQesitm, s.atpnWarnQesitm, s.atpnQesitm,
      s.seQesitm, s.intrcQesitm, s.depositMethodQesitm,
    ].flatMap((t) => sentences(t));

    const missing = []; let preserved = 0; let newPreserved = 0; let newMissing = 0;
    for (const it of srcItems) {
      const n = norm(it);
      if (n.length < 6) continue;
      const probe = n.length > 40 ? n.slice(0, 40) : n;
      if (koNorm.includes(probe)) preserved += 1; else missing.push(it);
      if (leaf) { if (newNorm.includes(probe)) newPreserved += 1; else newMissing += 1; }
    }

    // 기존 KO 에만 있는 의료 문장
    const extra = sentences(koPlain).filter((x) => {
      if (isBoiler(x)) return false;
      const n = norm(x);
      if (n.length < 10) return false;
      const probe = n.length > 30 ? n.slice(0, 30) : n;
      return !norm(srcItems.join(' ')).includes(probe);
    });

    // 모순 — 숫자 집합 / 부정어 수
    const srcNums = new Set(numsOf(srcItems.join(' ')));
    // 식별자 숫자(품목기준코드·표준코드·바코드)는 용법 수치가 아니다 — 6자리 이상은 제외한다.
    const koNums = numsOf(koPlain).filter((v) => !srcNums.has(v) && v.length < 6);
    const srcNeg = (srcItems.join(' ').match(NEG) ?? []).length;
    const koNeg = (koPlain.match(NEG) ?? []).length;
    const contradiction = [];
    if (koNums.length) contradiction.push(`numeric:${[...new Set(koNums)].slice(0, 6).join(',')}`);
    if (koNeg < srcNeg) contradiction.push(`negation:${srcNeg}->${koNeg}`);

    // 오귀속 — 다른 허가품목 코드/제품명
    const wrong = [];
    for (const m of koPlain.match(/\b\d{9}\b/g) ?? []) if (m !== p.itemSeq && otherSeq.has(m)) wrong.push(`itemSeq:${m}`);
    const selfName = norm(nameBySeq.get(p.itemSeq) ?? '');
    for (const [seq, nm] of nameBySeq) {
      if (seq === p.itemSeq || !nm || nm.length < 5) continue;
      const nn = norm(nm);
      if (nn === selfName) continue;
      if (koNorm.includes(nn)) { wrong.push(`name:${seq}`); break; }
    }

    // 구조 절단 — 문장이 종결되지 않고 끝남
    const trunc = sentences(koPlain).filter((x) => /(…|\.\.\.)$/.test(x)
      || (x.length > 25 && !/[다요오][.!?]?$|[.!?):%”"']$|[가-힣]{1,4}$/.test(x)));

    agg.sourceItemsTotal += srcItems.length;
    agg.preservedTotal += preserved;
    agg.missingTotal += missing.length;
    agg.newLeafletPreservedTotal += newPreserved;
    agg.newLeafletMissingTotal += newMissing;
    if (missing.length) agg.mastersWithMissing += 1;
    if (extra.length) { agg.mastersWithExtra += 1; agg.extraSentencesTotal += extra.length; }
    if (contradiction.length) agg.mastersWithContradiction += 1;
    if (wrong.length) agg.mastersWithWrongAttribution += 1;
    if (trunc.length) { agg.mastersWithTruncation += 1; agg.truncationsTotal += trunc.length; }
    if (!missing.length && !extra.length && !contradiction.length && !wrong.length && !trunc.length) agg.mastersClean += 1;

    out.push({
      masterId: p.masterId, itemSeq: p.itemSeq, hasExistingKo: true, descId: ko.descId,
      koLen: koPlain.length, newLen: leaf ? stripTags(leaf.html).length : 0,
      sourceItems: srcItems.length, preserved, missing: missing.length,
      newPreserved, newMissing,
      extra: extra.length, contradiction, wrongAttribution: wrong, truncated: trunc.length,
      missingSample: missing.slice(0, 3), extraSample: extra.slice(0, 3), truncatedSample: trunc.slice(0, 2),
    });
  }

  const pct = (a, b) => (b ? +((a / b) * 100).toFixed(2) : null);
  const summary = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1',
    step: '9-existing-ko-diff',
    note: '기존 KO 는 생성 입력이 아니며 결과 비교에만 사용했다. DB write 0.',
    ...agg,
    existingKoPreservationRate: pct(agg.preservedTotal, agg.sourceItemsTotal),
    newKoPreservationRate: pct(agg.newLeafletPreservedTotal, agg.newLeafletPreservedTotal + agg.newLeafletMissingTotal),
    resolvedByRebuild: {
      missingItems: agg.missingTotal - agg.newLeafletMissingTotal,
      mastersWithMissing: agg.mastersWithMissing,
      mastersWithExtra: agg.mastersWithExtra,
      mastersWithContradiction: agg.mastersWithContradiction,
      mastersWithWrongAttribution: agg.mastersWithWrongAttribution,
      mastersWithTruncation: agg.mastersWithTruncation,
    },
    dbWrites: 0,
  };

  fs.writeFileSync(path.join(RESULTS, 'existing-ko-diff.jsonl'), out.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'existing-ko-diff.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
