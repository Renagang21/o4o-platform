/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1 — 번역 단위 추출 + TM census (DB write 0)
 *
 * **생산·검증 단위는 master 다.** TM 은 같은 문장을 다시 번역하지 않기 위한 비용 절감 수단일 뿐,
 * 제품 간 설명서 공유나 확대 적용의 근거가 아니다. 그래서 이 스크립트는
 *   ① master 별로 자기 KO canonical 만 읽어 세그먼트 원장을 만들고 (ko-units.jsonl)
 *   ② 그 위에서 문장 빈도를 세는 census 를 따로 낸다 (tm-census.jsonl)
 * 두 산출물은 분리돼 있고, ②가 ①의 귀속을 바꾸지 않는다.
 *
 * 세그먼트 분류:
 *   FIXED_IDENTITY   제품명·제조사·품목기준코드·구분 배지 — 번역이 아니라 제품별 표시값. TM 재사용 절대 금지.
 *   HEADING          섹션 제목(h2) — 고정 어휘집으로 처리
 *   BODY             실제 번역 대상 문장
 *
 * TM 재사용 판정 (BODY 한정):
 *   REUSE_SAFE       2회 이상 등장 + 수치·연령·용량·제품명 토큰 없음 → 그대로 재사용 가능
 *   REVIEW_NUMERIC   2회 이상 등장하지만 수치·연령·횟수·기간 포함 → 재사용하되 master 별 수치 재검증 필수
 *   NEW_UNIQUE       1회만 등장 → 신규 번역
 *
 * 산출: results/{ko-units.jsonl(미추적), tm-census.jsonl(미추적), extract-units-result.json}
 * 사용: PGPASSWORD=... PGUSER=o4o_api node extract-units.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', process.env.PROXY_PORT || '15441'), 10);
const CHUNK = parseInt(arg('--chunk', '500'), 10);
const LIMIT = parseInt(arg('--limit', '0'), 10);
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

/** 제품별 표시값이 들어가는 자리. 여기 텍스트는 번역 대상도, TM 대상도 아니다. */
const FIXED_TAGS = new Set(['제품명', '제조·수입사', '품목기준코드', '제형', '성상', '함량', '포장단위']);
/** 수치·연령·횟수·기간·용량이 걸리면 재사용해도 master 별로 다시 봐야 한다. */
const NUMERIC_RE = /[0-9]|[일이삼사오육칠팔구십]\s*(회|일|세|개월|주|시간)|밀리그램|그램|미터|세 이상|세 미만/;

/**
 * 생성 HTML 을 순서 보존 세그먼트로 쪼갠다.
 * 기계 생성 마크업이라 태그 구조가 규칙적이다 — 그래도 예상 밖 구조는 세지 않고 그대로 기록해 드러낸다.
 */
export function segment(html) {
  const segs = [];
  let section = null;
  let pendingTag = null;
  // 태그와 텍스트를 순서대로 훑는다. <br> 는 문장 경계로만 쓰고 버린다.
  const re = /<([a-z0-9]+)([^>]*)>|<\/([a-z0-9]+)>|([^<]+)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, openTag, attrs, closeTag, text] = m;
    if (openTag) {
      const cls = /class="([^"]*)"/.exec(attrs || '')?.[1] ?? '';
      segs.lastOpen = { tag: openTag.toLowerCase(), cls };
      continue;
    }
    if (closeTag) continue;
    const raw = (text || '').replace(/&nbsp;/g, ' ').trim();
    if (!raw) continue;
    const cur = segs.lastOpen ?? { tag: '?', cls: '' };
    if (cur.tag === 'h2') { section = raw; segs.push({ kind: 'HEADING', section: raw, tag: cur.tag, cls: cur.cls, text: raw }); continue; }
    if (cur.tag === 'h1') { segs.push({ kind: 'FIXED_IDENTITY', section: section ?? '헤더', tag: cur.tag, cls: cur.cls, field: '제품명', text: raw }); continue; }
    if (cur.tag === 'span' && cur.cls.includes('sd-tag')) { pendingTag = raw; segs.push({ kind: 'HEADING', section: section ?? '헤더', tag: cur.tag, cls: cur.cls, text: raw }); continue; }
    if (cur.cls.includes('sd-badge') || cur.cls.includes('sd-meta')) { segs.push({ kind: 'FIXED_IDENTITY', section: section ?? '헤더', tag: cur.tag, cls: cur.cls, field: cur.cls.includes('sd-meta') ? '제조·수입사' : '구분', text: raw }); continue; }
    if (pendingTag && FIXED_TAGS.has(pendingTag)) { segs.push({ kind: 'FIXED_IDENTITY', section: section ?? '헤더', tag: cur.tag, cls: cur.cls, field: pendingTag, text: raw }); pendingTag = null; continue; }
    pendingTag = null;
    // 말미 안내 문구는 `p.sd-foot` 로 분리돼 있다. 직전 h2(보관 방법)에 귀속시키면 섹션 문맥이 틀어진다.
    const sec = cur.cls.includes('sd-foot') ? '안내(푸터)' : (section ?? '헤더');
    // 문장 경계: <br> 로 이미 쪼개져 들어오므로 여기서는 마침표 단위로 한 번 더 나눈다.
    for (const s of raw.split(/(?<=[.。])\s+/).map((x) => x.trim()).filter(Boolean)) {
      segs.push({ kind: 'BODY', section: sec, tag: cur.tag, cls: cur.cls, text: s });
    }
  }
  delete segs.lastOpen;
  return segs;
}

const SQL = `
  SELECT master_id::text "masterId", id::text "descId", md5(content) "md5", content
  FROM shared_product_descriptions
  WHERE master_id = ANY($1::uuid[])
    AND description_type = 'STORE' AND COALESCE(language,'ko') = 'ko'
    AND status = 'canonical' AND deleted_at IS NULL`;

async function main() {
  let pop = readJsonl(path.join(RESULTS, 'contract-recon-ledger.jsonl'))
    .filter((l) => !l.classification.startsWith('BLOCK'));
  if (LIMIT) pop = pop.slice(0, LIMIT);
  const want = new Map(pop.map((p) => [p.masterId, p]));

  const client = new pg.Client({
    host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: 'o4o_platform',
  });
  await client.connect();
  await client.query('SET default_transaction_read_only = on');

  const unitsOut = fs.createWriteStream(path.join(RESULTS, 'ko-units.jsonl'), 'utf8');
  const tm = new Map();          // 문장 → { n, sections:Set, kind }
  const perMaster = [];
  const anomalies = [];
  const ids = [...want.keys()];

  for (let i = 0; i < ids.length; i += CHUNK) {
    const r = await client.query(SQL, [ids.slice(i, i + CHUNK)]);
    for (const row of r.rows) {
      const p = want.get(row.masterId);
      if (row.md5 !== p.generatedContentHash) { anomalies.push({ masterId: row.masterId, reason: 'KO md5 drift(추출 시점)' }); continue; }
      const segs = segment(row.content);
      const body = segs.filter((s) => s.kind === 'BODY');
      const fixed = segs.filter((s) => s.kind === 'FIXED_IDENTITY');
      if (!body.length) anomalies.push({ masterId: row.masterId, reason: 'BODY 세그먼트 0' });
      for (const s of body) {
        const key = s.text;
        const e = tm.get(key) ?? { n: 0, docs: new Set(), sections: new Set() };
        // n 은 master 기준 등장 수라서 master 중복(median 3)만큼 부풀려진다.
        // 진짜 "같은 문장인가" 는 **서로 다른 KO 문서 수(docs)** 로 봐야 한다.
        e.n++; e.docs.add(row.md5); e.sections.add(s.section); tm.set(key, e);
      }
      unitsOut.write(JSON.stringify({
        masterId: row.masterId, itemSeq: p.itemSeq, koDescId: row.descId,
        generatedContentHash: row.md5, officialSourceHash: p.officialSourceHash,
        classification: p.classification,
        segments: segs.map((s) => ({ kind: s.kind, section: s.section, field: s.field ?? null, text: s.text })),
      }) + '\n');
      perMaster.push({ masterId: row.masterId, body: body.length, fixed: fixed.length, sections: new Set(segs.map((s) => s.section)).size });
    }
    process.stderr.write(`extract ${Math.min(i + CHUNK, ids.length)}/${ids.length}\n`);
  }
  await client.end();
  unitsOut.end();

  const census = [];
  let reuseSafe = 0; let reviewNumeric = 0; let newUnique = 0; let reuseTokens = 0;
  for (const [text, e] of tm) {
    // 분류 기준은 master 등장 수(n)가 아니라 **서로 다른 KO 문서 수(docN)** 다.
    const docN = e.docs.size;
    const cls = docN === 1 ? 'NEW_UNIQUE' : (NUMERIC_RE.test(text) ? 'REVIEW_NUMERIC' : 'REUSE_SAFE');
    if (cls === 'NEW_UNIQUE') newUnique++;
    else if (cls === 'REVIEW_NUMERIC') { reviewNumeric++; reuseTokens += e.n; }
    else { reuseSafe++; reuseTokens += e.n; }
    census.push({ hash: md5(text), n: e.n, docN, classification: cls, sections: [...e.sections], len: text.length, text });
  }
  census.sort((a, b) => b.docN - a.docN || b.n - a.n);
  fs.writeFileSync(path.join(RESULTS, 'tm-census.jsonl'), census.map((c) => JSON.stringify(c)).join('\n') + '\n', 'utf8');

  const totalBodyOccurrences = perMaster.reduce((a, m) => a + m.body, 0);
  const out = {
    wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1',
    step: 'extract-units',
    unit: 'master (생산·검증 단위). TM 은 비용 절감 수단일 뿐 제품 간 공유 근거가 아니다.',
    mastersRequested: ids.length,
    mastersExtracted: perMaster.length,
    anomalies: anomalies.length,
    anomalySample: anomalies.slice(0, 5),
    bodySegments: { total: totalBodyOccurrences, perMasterMin: Math.min(...perMaster.map((m) => m.body)), perMasterMax: Math.max(...perMaster.map((m) => m.body)), perMasterMedian: perMaster.map((m) => m.body).sort((a, b) => a - b)[Math.floor(perMaster.length / 2)] },
    fixedIdentitySegments: perMaster.reduce((a, m) => a + m.fixed, 0),
    tm: {
      distinctSentences: tm.size,
      NEW_UNIQUE: newUnique,
      REUSE_SAFE: reuseSafe,
      REVIEW_NUMERIC: reviewNumeric,
      occurrencesCoveredByReuse: reuseTokens,
      reuseRatio: Math.round((reuseTokens / totalBodyOccurrences) * 10000) / 100,
      // 실제 번역 호출은 master 단위(19,360)로 돌지만, 그 안에서 새로 번역해야 할 문장은 이 수만큼이다.
      distinctKoDocuments: new Set([...tm.values()].flatMap((e) => [...e.docs])).size,
      topSentence: census[0] ? { docN: census[0].docN, n: census[0].n, len: census[0].len, text: census[0].text.slice(0, 60) } : null,
    },
    dbWrites: 0,
  };
  fs.writeFileSync(path.join(RESULTS, 'extract-units-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
