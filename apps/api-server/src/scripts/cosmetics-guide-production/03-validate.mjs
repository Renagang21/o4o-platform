/**
 * WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1 — 단계 3: 자동 검증 (WO §8)
 *
 * **독립 검증기다.** 생성 엔진(`guide-core.mjs`)을 import 하지 않는다.
 * 엔진을 재사용하면 엔진의 실수를 그대로 통과시킨다 — 산출물과 census 원본만 놓고 대조한다.
 *
 * 검사 항목(WO §8)
 *   1. 후보 식별자 유지        2. 브랜드/상품명 존재
 *   3. productType 존재 또는 미확정 표시   4. 설명문 존재
 *   5. 주요 특징 존재          6. usage 존재 또는 부족 표시
 *   7. 다른 제품 정보 혼입 여부  8. 근거 없는 성분/효능 추가 여부
 *
 * 품질 점수는 만들지 않는다(WO §8).
 */
import { readCensus, readOut, writeOut } from './lib.mjs';

/** 효능·기능 주장 어휘. 공식 근거(MFDS) 없이 등장하면 위반이다. */
const EFFICACY_TERMS = [
  '미백', '주름 개선', '주름개선', '자외선 차단', '자외선차단', '여드름', '아토피', '탈모',
  '튼살', '염모', '체취 방지', '항염', '항균', '재생', '치료', '완화', '개선', '진정',
  '보습력', '効', '효능', '효과',
];

/** 우리 템플릿이 쓰는 고정 문구 — 효능 어휘 스캔에서 제외할 화이트리스트 접두다. */
const TEMPLATE_PREFIXES = [
  '용량/구성: ', '색상/호수 선택: ', '자외선 차단 지수 표기: ', '판매 분류: ',
  '식약처 기능성화장품 보고 제품 ',
];

const norm = (s) => (s ?? '').replace(/\s+/g, '');

function main() {
  const input = readOut('production-input.json');
  const candidates = readCensus('retail-unique-guide-candidates.json').candidates;
  const fx = new Map(readCensus('functional-match.json').results.map((r) => [r.key, r]));

  const only = process.argv.slice(2);
  const targets = only.length ? input.batches.filter((b) => only.includes(b.label)) : input.batches;

  // 유형별 usage 일관성 — 같은 유형이면 문구가 완전히 같아야 한다(제품별로 갈리면 고유 정보가 섞인 것이다).
  const usageByType = new Map();
  const allViolations = [];
  const summary = [];

  for (const b of targets) {
    const { guides } = readOut(`${b.label}/guides-ko.json`);
    const violations = [];
    const add = (check, key, detail) => violations.push({ check, key, detail, batch: b.label });

    if (guides.length !== b.count) add('IDENTITY_COUNT', null, `생산 ${guides.length} != 입력 ${b.count}`);

    for (let i = 0; i < guides.length; i += 1) {
      const g = guides[i];
      const c = candidates[b.start + i];

      // 1. 후보 식별자 유지 — 순서까지 대조한다.
      if (!c || g.key !== c.key) {
        add('IDENTITY_KEY', g.key, `입력 ${b.start + i} 번 후보 key '${c?.key}' 와 불일치`);
        continue;
      }

      // 2. 브랜드/상품명 존재
      if (!g.brandName) add('BRAND_MISSING', g.key, '브랜드 없음');
      if (!g.productName) add('PRODUCT_NAME_MISSING', g.key, '상품명 없음');
      if (g.brandName !== c.brandName) add('BRAND_MISMATCH', g.key, `census '${c.brandName}' != 산출 '${g.brandName}'`);
      if (g.productName !== c.canonicalProductName) {
        add('PRODUCT_NAME_MISMATCH', g.key, `census '${c.canonicalProductName}' != 산출 '${g.productName}'`);
      }

      // 3. productType 존재 또는 미확정 표시
      if (!g.productType && !g.missingRequired.includes('productType')) {
        add('TYPE_UNMARKED', g.key, '유형이 없는데 미확정 표시도 없음');
      }
      if (g.productType && c.type && g.productType !== c.type) {
        // 같은 판매 마디 안에서 좁힌 경우만 허용한다. 엔진 표를 가져오지 않고 **여기서 독립적으로 다시 판정한다** —
        // 마디 이름이 슬래시로 여러 제형을 묶고 있고, 그 토큰이 상품명에도 있고, 좁힌 유형이 그 토큰을 포함해야 한다.
        const leaf = (c.category ?? '').split('|').pop().trim();
        const narrowed =
          g.productTypeSource === 'RETAIL_CATEGORY+NAME_KEYWORD' &&
          leaf.includes('/') &&
          leaf
            .split('/')
            .map((t) => t.trim())
            .some((t) => t && g.productType.includes(t) && norm(c.canonicalProductName).includes(norm(t)));
        if (!narrowed) add('TYPE_MISMATCH', g.key, `census '${c.type}' != 산출 '${g.productType}'`);
      }
      if (g.productType && !c.type && g.productTypeSource !== 'NAME_KEYWORD') {
        add('TYPE_SOURCE_UNMARKED', g.key, 'census 에 유형이 없는데 출처 표시가 NAME_KEYWORD 가 아님');
      }
      // census 에 있던 유형을 산출에서 버렸다면 반드시 사유가 큐에 남아야 한다(조용한 유실 금지).
      if (c.type && !g.productType && !(g.issues ?? []).some((it) => it.type === 'TYPE_NAME_CONTRADICTION')) {
        add('TYPE_SILENTLY_DROPPED', g.key, `census 유형 '${c.type}' 이 사유 없이 사라졌다`);
      }

      // 4. 설명문 존재 + 다른 제품 정보 혼입 여부
      if (!g.oneLineDescription) add('ONELINE_MISSING', g.key, '한 줄 설명 없음');
      else {
        if (!norm(g.oneLineDescription).includes(norm(c.canonicalProductName))) {
          add('ONELINE_NAME_ABSENT', g.key, '한 줄 설명에 상품명이 없다');
        }
        const expected = g.productType
          ? `${c.brandName ?? ''} ${c.canonicalProductName} — ${g.productType} 제품입니다.`.trim()
          : `${c.brandName ?? ''} ${c.canonicalProductName}`.trim();
        if (g.oneLineDescription !== expected) {
          add('ONELINE_UNEXPECTED', g.key, `템플릿 밖 문장: '${g.oneLineDescription}'`);
        }
      }

      // 5. 주요 특징 존재 또는 부족 표시
      if (!g.mainFeatures?.length && !g.missingRequired.includes('mainFeatures')) {
        add('FEATURES_UNMARKED', g.key, '주요 특징이 없는데 부족 표시도 없음');
      }

      // 7. 혼입 검사 — 특징의 사실값이 이 후보의 판매명/census 값에서 나왔는가
      const rawJoined = norm(c.sources.map((s) => s.rawProductName).join(' '));
      // 증정·동봉 구간을 잘라낸 판매명. 용량은 **이 구간 안에서만** 관측된 값이어야 한다
      // (증정품 용량을 제품 용량으로 읽는 혼입 회귀를 여기서 독립적으로 잡는다).
      const ownJoined = norm(
        c.sources
          .map((s) => {
            const stripped = (s.rawProductName ?? '').replace(/\([^()]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');
            const cut = stripped.search(/(?<![0-9])[+＋]|증정|사은품/);
            return cut >= 0 ? stripped.slice(0, cut) : stripped;
          })
          .join(' '),
      );
      for (const f of g.mainFeatures ?? []) {
        const t = f.text ?? '';
        if (t.startsWith('용량/구성: ')) {
          for (const v of t.slice('용량/구성: '.length).split(' · ')) {
            if (!ownJoined.toLowerCase().includes(norm(v).toLowerCase())) {
              add(
                'FEATURE_CAPACITY_UNSOURCED',
                g.key,
                rawJoined.toLowerCase().includes(norm(v).toLowerCase())
                  ? `용량 '${v}' 이 증정·동봉 구간에서 왔다 — 이 제품의 용량이 아니다`
                  : `용량 '${v}' 이 이 제품 판매명에 없다`,
              );
            }
          }
        } else if (t.startsWith('색상/호수 선택: ')) {
          if (t.slice('색상/호수 선택: '.length) !== (c.variants ?? []).join(', ')) {
            add('FEATURE_VARIANT_MISMATCH', g.key, 'variants 가 census 와 다르다');
          }
        } else if (t.startsWith('자외선 차단 지수 표기: ')) {
          const v = norm(t.slice('자외선 차단 지수 표기: '.length)).toUpperCase();
          const hay = rawJoined.toUpperCase();
          for (const part of v.split('/')) {
            if (!hay.includes(part)) add('FEATURE_SPF_UNSOURCED', g.key, `SPF/PA '${part}' 이 판매명에 없다`);
          }
        } else if (t.startsWith('식약처 기능성화장품 보고 제품 ')) {
          const no = t.match(/보고번호 (\d+)/)?.[1];
          const reports = fx.get(c.key)?.functionalReports ?? [];
          if (fx.get(c.key)?.status !== 'RETAIL_FUNCTIONAL_MATCHED') {
            add('FEATURE_FUNCTIONAL_NOT_MATCHED', g.key, '기능성 MATCHED 가 아닌데 보고 특징이 붙었다');
          } else if (!reports.some((r) => r.reportNo === no)) {
            add('FEATURE_FUNCTIONAL_UNSOURCED', g.key, `보고번호 ${no} 이 매칭 결과에 없다`);
          }
        } else {
          add('FEATURE_UNKNOWN_SHAPE', g.key, `알 수 없는 특징 문형: '${t.slice(0, 60)}'`);
        }
      }

      // 분류값 대조 — 특징이 아니라 census category 를 그대로 옮긴 값이어야 한다.
      const expectedClass = (c.category ?? '').split('|').map((x) => x.trim()).filter(Boolean).join(' > ') || null;
      if ((g.classification ?? null) !== expectedClass) {
        add('CLASSIFICATION_MISMATCH', g.key, `census category '${c.category}' != 산출 '${g.classification}'`);
      }

      // 6. usage 존재 또는 부족 표시 + 유형별 일관성
      if (!g.usage && !g.missingRequired.includes('usage')) {
        add('USAGE_UNMARKED', g.key, '사용방법이 없는데 부족 표시도 없음');
      }
      if (g.usage) {
        if (g.usageSource !== 'CATEGORY_GENERIC') {
          add('USAGE_SOURCE_WRONG', g.key, `usageSource '${g.usageSource}' — 이번 모집단은 전부 CATEGORY_GENERIC 이어야 한다`);
        }
        // 제품 고유 정보 혼입은 "유형별 고정 문구인가"로 판정한다.
        // 문구에 우연히 제품명이 포함되는 경우(상품명이 `토너` 인 세트 제품 등)는 혼입이 아니다.
        const prev = usageByType.get(g.productType);
        if (prev && prev !== g.usage) {
          add('USAGE_TYPE_INCONSISTENT', g.key, `유형 '${g.productType}' 의 안내 문구가 제품마다 다르다 — 고유 정보 혼입 의심`);
        } else if (!prev) usageByType.set(g.productType, g.usage);
      }

      // 8. 근거 없는 성분/효능 추가 여부
      const authored = [g.oneLineDescription, g.usage].filter(Boolean);
      for (const f of g.mainFeatures ?? []) {
        if (f.evidence === 'MFDS_REPORT_OFFICIAL') continue; // 공식 원문 근거
        const stripped = TEMPLATE_PREFIXES.reduce((s, p) => (s.startsWith(p) ? s.slice(p.length) : s), f.text ?? '');
        authored.push(stripped);
      }
      for (const text of authored) {
        // 제품명·브랜드·색상 값에서 유래한 글자는 우리가 만든 주장이 아니다.
        // 유형명은 census 가 판매 카테고리에서 판정한 분류값이다(우리가 만든 효능 주장이 아니다).
        const typeFromCensus =
          g.productType &&
          (g.productType === c.type ||
            g.productTypeSource === 'NAME_KEYWORD' ||
            g.productTypeSource === 'RETAIL_CATEGORY+NAME_KEYWORD')
            ? g.productType
            : '';
        const sourceHay = norm(`${c.brandName ?? ''}${c.canonicalProductName}${(c.variants ?? []).join('')}${c.category ?? ''}${typeFromCensus}${c.sources.map((s) => s.rawProductName).join('')}`);
        for (const term of EFFICACY_TERMS) {
          if (norm(text).includes(norm(term)) && !sourceHay.includes(norm(term))) {
            add('UNSOURCED_EFFICACY_CLAIM', g.key, `근거 없는 효능 표현 '${term}' — '${text.slice(0, 60)}'`);
          }
        }
      }
      if (g.mainIngredients || g.texture || g.cautions) {
        add('OPTIONAL_FIELD_UNSOURCED', g.key, '원천이 없는 선택 항목이 채워졌다');
      }
    }

    const tally = violations.reduce((a, v) => ((a[v.check] = (a[v.check] ?? 0) + 1), a), {});
    writeOut(`${b.label}/validation.json`, {
      meta: { batch: b.label, guides: guides.length, violations: violations.length, tally },
      violations: violations.slice(0, 2000),
    });
    summary.push({ batch: b.label, guides: guides.length, violations: violations.length, tally });
    allViolations.push(...violations);
    process.stderr.write(`${b.label} 검증: 위반 ${violations.length} ${JSON.stringify(tally)}\n`);
  }

  const total = allViolations.reduce((a, v) => ((a[v.check] = (a[v.check] ?? 0) + 1), a), {});
  writeOut('validation-summary.json', { meta: { totalViolations: allViolations.length, tally: total }, batches: summary });
  process.stderr.write(`\n전체 위반 ${allViolations.length} ${JSON.stringify(total, null, 2)}\n`);
}

main();
