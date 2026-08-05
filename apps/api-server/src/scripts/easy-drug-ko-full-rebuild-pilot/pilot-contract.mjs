/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1 — 단계 5·6 생산 계약
 *
 * e약은요 **원문만** 입력으로 받아 (1) 9영역 구조화 → (2) `sd-*` 매장용 설명서 HTML 을 만든다.
 * 기존 KO 설명서는 이 모듈에 들어오지 않는다(디자인 참고·사후 비교 전용).
 *
 * 이 계약이 하지 않는 것 (WO §5·§6 금지 조항 — 선행 트랙 파손의 실제 원인들):
 *   · 경로 동사 치환(`복용`→`사용`)          ← 안전 문장을 파손했던 바로 그 변환
 *   · 고정 글자 수 절단(`slice`)             ← 기존 `작용` 뱃지가 120자로 잘라 쓰던 것
 *   · 요약·재표현·의학 정보 추가
 *   · 섹션 간 문장 이동(효능↔용법↔안전)
 *   · 다른 제품 원문 보충
 *
 * 유일하게 허용한 재배치는 §5 가 명시한 **위치 분리**다: e약은요 에는
 * "사용하면 안 되는 경우" / "사용 전 상담이 필요한 경우" 전용 필드가 없어서,
 * `atpnWarnQesitm` + `atpnQesitm` 의 **항목을 순서 보존한 채 3개 버킷으로 분배**한다.
 * 분배는 전단사다 — 원문 항목 수 = 세 버킷 항목 수 합, 삭제·복제 0.
 */

/** 9영역. 순서가 곧 설명서 카드 순서다. */
export const AREAS = [
  'overview',      // 제품 개요        (원문 메타 — 의료 문장 아님)
  'efficacy',      // 효능·효과        ← efcyQesitm
  'usage',         // 사용 방법        ← useMethodQesitm
  'prohibition',   // 사용하면 안 되는 경우      ┐
  'consult',       // 사용 전 상담이 필요한 경우  ├ atpnWarnQesitm + atpnQesitm 위치 분리
  'caution',       // 사용 중 주의사항           ┘
  'sideEffect',    // 이상반응         ← seQesitm
  'interaction',   // 상호작용         ← intrcQesitm
  'storage',       // 보관 방법        ← depositMethodQesitm
];

export const AREA_LABEL = {
  overview: '제품 개요',
  efficacy: '효능·효과',
  usage: '사용 방법',
  prohibition: '사용하면 안 되는 경우',
  consult: '사용 전 상담이 필요한 경우',
  caution: '사용 중 주의사항',
  sideEffect: '이상반응',
  interaction: '상호작용',
  storage: '보관 방법',
};

export const PHARM_FOOT_KO =
  '이 설명서는 매장 상담을 돕기 위한 자료입니다. 사용 전 매장 약사에게 문의하세요. '
  + '증상이 나아지지 않거나 이상이 느껴지면 사용을 멈추고 의사·약사와 상의하세요.';

/**
 * 항목 분할. **삭제하지 않는다** — 공백만 정리하고 경계를 만든다.
 * 문장 경계는 `(?<=[다요오]\.)` 로 잡는다. e약은요 원문은 마침표 뒤에 공백이 없는 경우가 많아
 * `(?<=[.!?])\s` 로는 절 전체가 한 덩어리가 되고, 숫자 소수점(`0.05 %`)은 앞 글자가 숫자라 걸리지 않는다.
 */
export function splitItems(text) {
  if (!text) return [];
  return String(text)
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[다요오]\.)\s*/))
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 금지 종결. 강도를 낮추지 않기 위해 넓게 잡는다 — 애매하면 `prohibition` 이 안전하다. */
const PROHIBITION_RE = /하지\s*마십시오|하지\s*마시오|하지\s*마세요|하지\s*말\s*것|해서는\s*안\s*[됩되]|사용을?\s*금|투여를?\s*금|금기|금지|삼가|피하십시오|피하시오|안\s*됩니다/;
/** 상담 유도. 금지보다 약한 신호이므로 금지 판정 다음에 본다. */
const CONSULT_RE = /상의|문의|상담|진찰|전문가와|의사\s*[·,및또는\s]*약사|약사\s*[·,및또는\s]*의사/;

/**
 * 안전 원문(경고 + 주의사항)을 3버킷으로 **위치 분리**한다.
 * 규칙은 항목 단위이고, 항목 문자열 자체는 한 글자도 바꾸지 않는다.
 */
export function partitionSafety(warnText, cautionText) {
  const items = [
    ...splitItems(warnText).map((text) => ({ text, from: 'atpnWarnQesitm' })),
    ...splitItems(cautionText).map((text) => ({ text, from: 'atpnQesitm' })),
  ];
  const prohibition = []; const consult = []; const caution = [];
  for (const it of items) {
    if (PROHIBITION_RE.test(it.text)) prohibition.push(it);
    else if (CONSULT_RE.test(it.text)) consult.push(it);
    else caution.push(it);
  }
  return { items, prohibition, consult, caution };
}

/**
 * 구조화. 원문 레코드 → 9영역. 문장은 원형 그대로 옮기고 위치만 정한다.
 * @param src  source-snapshot.jsonl 의 한 행 (e약은요 원문)
 * @param meta { productName, dosageForm, entpName }
 */
export function structure(src, meta) {
  const part = partitionSafety(src.atpnWarnQesitm, src.atpnQesitm);
  const areas = {
    overview: {
      productName: meta.productName ?? src.itemName ?? '',
      officialName: src.itemName ?? '',
      entpName: src.entpName ?? '',
      dosageForm: meta.dosageForm ?? '',
      itemSeq: src.itemSeq,
    },
    efficacy: splitItems(src.efcyQesitm),
    usage: splitItems(src.useMethodQesitm),
    prohibition: part.prohibition.map((i) => i.text),
    consult: part.consult.map((i) => i.text),
    caution: part.caution.map((i) => i.text),
    sideEffect: splitItems(src.seQesitm),
    interaction: splitItems(src.intrcQesitm),
    storage: splitItems(src.depositMethodQesitm),
  };

  const anomalies = [];
  if (!areas.efficacy.length) anomalies.push('SOURCE_EFFICACY_MISSING');
  if (!areas.usage.length) anomalies.push('SOURCE_DOSAGE_MISSING');
  // 전단사 자기검사 — 계약이 스스로 깨졌는지 먼저 본다.
  const back = areas.prohibition.length + areas.consult.length + areas.caution.length;
  if (back !== part.items.length) anomalies.push('SAFETY_PARTITION_BROKEN');

  return { areas, safetyItemCount: part.items.length, anomalies };
}

// ── HTML 조립 (`sd-*` 어휘 — 기존 매장용 설명서 디자인과 동일 구조) ──────────────
const escHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const li = (items) => items.map((t) => `      <li>${escHtml(t)}</li>`).join('\n');

/**
 * 매장용 설명서 HTML. **원문 문장을 전부 싣는다** — 카드 배치·줄바꿈·라벨만 우리 것이다.
 * `한눈에 보기`(sd-core)에는 의료 문장을 복사하지 않는다. 요약이 곧 절단·왜곡이기 때문이다.
 */
export function buildHtml(st) {
  const a = st.areas;
  const out = [];
  out.push('<div class="sd-card">');
  out.push('  <div class="sd-hero">');
  out.push(`    <div class="sd-badges"><span class="sd-badge is-solid">일반의약품</span>${
    a.overview.dosageForm ? `<span class="sd-badge">${escHtml(a.overview.dosageForm)}</span>` : ''}</div>`);
  out.push(`    <h1>${escHtml(a.overview.productName)}</h1>`);
  if (a.overview.entpName) out.push(`    <p class="sd-meta">${escHtml(a.overview.entpName)}</p>`);
  out.push('  </div>');

  out.push('  <div class="sd-body">');

  // 제품 개요 — 원문 메타만. 효능 문장을 잘라 넣지 않는다.
  out.push(`    <h2>${AREA_LABEL.overview}</h2>`);
  out.push('    <div class="sd-core">');
  const overviewItems = [
    ['제품명', a.overview.officialName],
    ['제조·수입사', a.overview.entpName],
    ['제형', a.overview.dosageForm],
    ['품목기준코드', a.overview.itemSeq],
  ].filter(([, v]) => v);
  for (const [k, v] of overviewItems) {
    out.push('      <div class="sd-item">');
    out.push(`        <span class="sd-tag">${escHtml(k)}</span>`);
    out.push(`        <p>${escHtml(v)}</p>`);
    out.push('      </div>');
  }
  out.push('    </div>');

  out.push(`    <h2>${AREA_LABEL.efficacy}</h2>`);
  out.push(`    <p class="sd-intro">${a.efficacy.map(escHtml).join('<br>')}</p>`);

  out.push(`    <h2>${AREA_LABEL.usage}</h2>`);
  out.push(`    <p class="sd-intake">${a.usage.map(escHtml).join('<br>')}</p>`);

  for (const key of ['prohibition', 'consult', 'caution', 'sideEffect', 'interaction', 'storage']) {
    if (!a[key].length) continue;
    out.push(`    <h2>${AREA_LABEL[key]}</h2>`);
    out.push('    <ul class="sd-warn">');
    out.push(li(a[key]));
    out.push('    </ul>');
  }

  out.push(`    <p class="sd-foot">${escHtml(PHARM_FOOT_KO)}</p>`);
  out.push('  </div>');
  out.push('</div>');
  return out.join('\n');
}

/** 카드 요약(설명서 목록용). 효능 **첫 항목 전문**이다 — 글자 수로 자르지 않는다. */
export function buildSummary(st) {
  return st.areas.efficacy[0] ?? null;
}
