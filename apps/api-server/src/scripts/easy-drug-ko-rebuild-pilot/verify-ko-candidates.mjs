/**
 * WO-O4O-EASY-DRUG-KO-REBUILD-PIPELINE-PILOT-VALIDATION-V1 / 작업 5
 *
 * 시험 생성 결과 **독립 검증기**.
 *
 * 독립성 계약: 이 파일은 `composeEasyDrugContent` / `sanitizeDescriptionHtml` /
 * `generate-ko-candidates.ts` 를 **import 하지 않는다**. 기대값은 원천 JSON
 * (`pilot_population.json`) 에서 이 파일이 스스로 다시 계산한다. 생성기와 같은
 * 코드를 공유하면 동일 버그를 함께 통과시키므로 의도적으로 중복 구현한다.
 *
 * 실행:
 *   node apps/api-server/src/scripts/easy-drug-ko-rebuild-pilot/verify-ko-candidates.mjs \
 *     --population <pilot_population.json> --candidates <outDir/candidates.jsonl> --out <outDir>
 *
 * 결과 버킷: PASS / REVIEW / HOLD_SOURCE / HOLD_MAPPING / INVALID_TRANSFORM / FAILED_SYSTEM
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

/** 검증기가 독립적으로 보유하는 기대 절 순서·라벨. */
const SECTIONS = [
  ['efficacy', '효능·효과', true],
  ['usage', '용법·용량', true],
  ['warning', '경고', false],
  ['caution', '사용상 주의사항', false],
  ['interaction', '상호작용', false],
  ['sideEffect', '이상반응', false],
  ['storage', '저장방법', false],
];
const LABELS = new Set(SECTIONS.map(([, l]) => l));
/** 본문 성립 필수 절(결측 시 HOLD_SOURCE). */
const CORE_REQUIRED = ['efficacy', 'usage'];
/** 완전 모집단 조건 절(결측 시 REVIEW). */
const CORE_FULL = ['efficacy', 'usage', 'caution', 'storage'];

const ALLOWED_TAGS = new Set(['<p>', '</p>', '<strong>', '</strong>', '<br>', '<br/>', '<br />']);

function argOf(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  throw new Error(`--${name} 필요`);
}

/** HTML 엔티티 → 문자. 비교 전 양쪽을 같은 평면으로 내린다. */
function decodeEntities(s) {
  return String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

/** 원문/렌더 텍스트 비교용 정규화(줄바꿈·NBSP·꼬리공백만 정리, 문자 삭제 없음). */
function normalizeText(s) {
  return String(s)
    .replace(/\r\n/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/** 숫자·단위·연령·투여경로 토큰 추출(원문 보존 정밀 비교용). */
function extractTokens(s) {
  const t = normalizeText(s);
  const num = t.match(/\d+(?:[.,]\d+)?(?:\/\d+)?/g) ?? [];
  const unit =
    t.match(/\d+(?:[.,]\d+)?\s*(?:mg|g|kg|mL|ml|L|IU|㎎|㎖|㎍|mcg|%|정|캡슐|포|병|매|회|일|시간|분|세|개월|주)/g) ?? [];
  const age = t.match(/(?:만\s*)?\d+(?:\.\d+)?\s*(?:세|개월|살)(?:\s*(?:이상|미만|이하|초과))?/g) ?? [];
  const route =
    t.match(/(?:경구|복용|바르|점안|점이|점비|흡입|주사|좌제|질내|구강|설하|외용|도포|분무)[가-힣]*/g) ?? [];
  const sort = (a) => a.slice().sort();
  return { num: sort(num), unit: sort(unit), age: sort(age), route: sort(route) };
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * content → [{label, html}] 블록 파싱(엄격).
 * 원문 절 안에 개행이 있으므로 줄 단위로 자르지 않고 블록 정규식으로 훑되,
 * 매칭 구간 밖에 공백 이외의 문자가 남으면 규격 위반(null)으로 본다.
 */
function parseBlocks(content) {
  const s = String(content);
  const re = /<p><strong>([^<]+)<\/strong><br\s*\/?>([\s\S]*?)<\/p>/g;
  const blocks = [];
  let cursor = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (s.slice(cursor, m.index).trim() !== '') return null; // 블록 사이 잔여 문자
    blocks.push({ label: m[1], html: m[2] });
    cursor = m.index + m[0].length;
  }
  if (s.slice(cursor).trim() !== '') return null; // 꼬리 잔여 문자
  return blocks.length > 0 ? blocks : null;
}

function tagInventoryOk(content) {
  const tags = String(content).match(/<[^>]*>/g) ?? [];
  return tags.every((t) => ALLOWED_TAGS.has(t));
}

function main() {
  const population = JSON.parse(readFileSync(argOf('population'), 'utf8'));
  const outDir = argOf('out');
  mkdirSync(outDir, { recursive: true });
  const lines = readFileSync(argOf('candidates'), 'utf8').split('\n').filter((l) => l.trim());
  const records = lines.map((l) => JSON.parse(l));

  const byItemSeq = new Map(population.map((p) => [p.itemSeq, p]));

  const summary = {
    verifiedRecords: records.length,
    buckets: { PASS: 0, REVIEW: 0, HOLD_SOURCE: 0, HOLD_MAPPING: 0, INVALID_TRANSFORM: 0, FAILED_SYSTEM: 0 },
    checkFailures: {},
    coverage: { producibleMasters: 0, recordsExpected: 0, recordsMissing: 0, recordsUnexpected: 0 },
  };
  const findings = [];
  const perRecord = [];

  // 커버리지: 생산 가능 master 마다 정확히 1 레코드여야 한다.
  const expectedKeys = new Set();
  for (const p of population) {
    for (const m of p.masters) {
      const producible =
        m.regulatoryType === 'DRUG' &&
        m.drugCategory === 'otc' &&
        m.masterStatus === 'ACTIVE' &&
        !!m.barcode &&
        /^[0-9]{13}$/.test(m.barcode);
      const hasBody = SECTIONS.some(
        ([k]) => String(p.officialConsumerText?.[k] ?? '').trim().length > 0,
      );
      if (producible && hasBody) expectedKeys.add(`${p.itemSeq}::${m.masterId}`);
      if (producible) summary.coverage.producibleMasters += 1;
    }
  }
  summary.coverage.recordsExpected = expectedKeys.size;
  const seenKeys = new Set();

  for (const r of records) {
    const fails = [];
    let bucket = 'PASS';
    try {
      const p = byItemSeq.get(r.itemSeq);

      // --- V5 귀속(포장군 · 식별자) ---
      if (!p) {
        fails.push('ATTR_UNKNOWN_ITEMSEQ');
      } else {
        const m = p.masters.find((x) => x.masterId === r.masterId);
        if (!m) fails.push('ATTR_MASTER_NOT_IN_PERMIT_GROUP');
        else if (m.barcode !== r.barcode) fails.push('ATTR_BARCODE_MISMATCH');
        if (r.mfdsCode !== r.itemSeq) fails.push('ATTR_MFDS_CODE_MISMATCH');
        if (r.sourceRefId !== p.candidateId) fails.push('ATTR_SOURCE_REF_MISMATCH');
      }
      if (r.sourceType !== 'mfds_easy_drug') fails.push('ATTR_SOURCE_TYPE');
      if (r.language !== 'ko') fails.push('ATTR_LANGUAGE');
      if (r.descriptionType !== 'STORE') fails.push('ATTR_DESCRIPTION_TYPE');
      if (r.status !== 'needs_review') fails.push('ATTR_STATUS_NOT_NEEDS_REVIEW');
      if (r.status === 'canonical') fails.push('ATTR_STATUS_CANONICAL_FORBIDDEN');
      const attrFail = fails.length > 0;

      seenKeys.add(`${r.itemSeq}::${r.masterId}`);

      const oct = p?.officialConsumerText ?? {};
      const present = SECTIONS.filter(([k]) => String(oct[k] ?? '').trim().length > 0);

      // --- V1 구조/HTML ---
      const blocks = parseBlocks(r.content);
      if (!blocks) fails.push('HTML_BLOCK_SHAPE');
      if (!tagInventoryOk(r.content)) fails.push('HTML_UNEXPECTED_TAG');
      if (/<\s*(script|style|iframe|img|a)\b/i.test(r.content)) fails.push('HTML_FORBIDDEN_TAG');
      if (/\son[a-z]+\s*=/i.test(r.content)) fails.push('HTML_EVENT_ATTR');
      if (/javascript:/i.test(r.content)) fails.push('HTML_JS_URI');

      let structureFail = fails.some((f) => f.startsWith('HTML_'));

      if (blocks) {
        // 라벨 유효성 · 순서
        const labels = blocks.map((b) => b.label);
        if (!labels.every((l) => LABELS.has(l))) fails.push('HTML_UNKNOWN_LABEL');
        const expectedLabels = present.map(([, l]) => l);
        if (labels.join('|') !== expectedLabels.join('|')) fails.push('SECTION_SET_OR_ORDER');
        if (new Set(labels).size !== labels.length) fails.push('SECTION_DUPLICATE');

        // --- V3 원문 보존(절 단위 정확 일치) ---
        for (const b of blocks) {
          const key = SECTIONS.find(([, l]) => l === b.label)?.[0];
          const src = normalizeText(String(oct[key] ?? ''));
          const got = normalizeText(decodeEntities(b.html));
          if (src !== got) {
            fails.push(`TEXT_NOT_PRESERVED:${b.label}`);
            findings.push({
              level: 'INVALID_TRANSFORM',
              itemSeq: r.itemSeq,
              masterId: r.masterId,
              section: b.label,
              srcLen: src.length,
              gotLen: got.length,
              srcHead: src.slice(0, 120),
              gotHead: got.slice(0, 120),
            });
          }
        }

        // --- V4 숫자·단위·연령·투여경로 토큰 보존 ---
        const srcAll = present.map(([k]) => String(oct[k] ?? '')).join('\n');
        const gotAll = blocks.map((b) => decodeEntities(b.html)).join('\n');
        const st = extractTokens(srcAll);
        const gt = extractTokens(gotAll);
        for (const dim of ['num', 'unit', 'age', 'route']) {
          if (!sameMultiset(st[dim], gt[dim])) fails.push(`TOKEN_${dim.toUpperCase()}`);
        }
      }
      // 절 누락/중복/순서 이상은 원문 손실이므로 변환 결함(INVALID_TRANSFORM)으로 본다.
      structureFail = fails.some(
        (f) =>
          f.startsWith('HTML_') ||
          f.startsWith('TEXT_') ||
          f.startsWith('TOKEN_') ||
          f.startsWith('SECTION_'),
      );

      // --- V6 원천 완전성 ---
      const missingRequired = CORE_REQUIRED.filter((k) => String(oct[k] ?? '').trim().length === 0);
      const missingFull = CORE_FULL.filter((k) => String(oct[k] ?? '').trim().length === 0);

      // --- 버킷 판정(우선순위: 시스템 > 변환 > 귀속 > 원천 > 검토) ---
      if (structureFail) bucket = 'INVALID_TRANSFORM';
      else if (attrFail) bucket = 'HOLD_MAPPING';
      else if (missingRequired.length > 0) bucket = 'HOLD_SOURCE';
      else if (missingFull.length > 0 || fails.length > 0) bucket = 'REVIEW';
      else bucket = 'PASS';

      if (missingRequired.length) fails.push(`SOURCE_MISSING_REQUIRED:${missingRequired.join(',')}`);
      else if (missingFull.length) fails.push(`SOURCE_MISSING_OPTIONAL:${missingFull.join(',')}`);
    } catch (e) {
      bucket = 'FAILED_SYSTEM';
      fails.push(`EXCEPTION:${e instanceof Error ? e.message : String(e)}`);
    }

    summary.buckets[bucket] += 1;
    for (const f of fails) {
      const k = f.split(':')[0];
      summary.checkFailures[k] = (summary.checkFailures[k] ?? 0) + 1;
    }
    perRecord.push({
      itemSeq: r.itemSeq,
      masterId: r.masterId,
      barcode: r.barcode,
      sampleGroup: r.lineage?.sampleGroup,
      bucket,
      fails,
    });
    if (bucket !== 'PASS') {
      findings.push({ level: bucket, itemSeq: r.itemSeq, masterId: r.masterId, fails });
    }
  }

  for (const k of expectedKeys) if (!seenKeys.has(k)) summary.coverage.recordsMissing += 1;
  for (const k of seenKeys) if (!expectedKeys.has(k)) summary.coverage.recordsUnexpected += 1;

  writeFileSync(`${outDir}/verification-per-record.jsonl`, perRecord.map((x) => JSON.stringify(x)).join('\n') + '\n', 'utf8');
  writeFileSync(`${outDir}/verification-findings.jsonl`, findings.map((x) => JSON.stringify(x)).join('\n') + (findings.length ? '\n' : ''), 'utf8');
  writeFileSync(`${outDir}/verification-summary.json`, JSON.stringify(summary, null, 2), 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
