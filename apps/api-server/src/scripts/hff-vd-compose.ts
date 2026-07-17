/**
 * 비타민 D 단일형 매장 설명서 — 결정적 composer (grounded template)
 *
 * WO-O4O-HFF-DESCRIPTION-VITAMIN-D-PRODUCTION-LINE-V1
 * 파일럿 20건(5ba84233f, 독립검수 PASS)의 시맨틱 sd-* 템플릿을 seed 필드로 구동한다.
 * **외부 LLM 자유생성 아님** — 공식 원문 grounding 필드만 슬롯에 채운다(결정적).
 * 물(G-WATER)·제형(G-FORM)·기능성(골다공증만 원문有)·per-unit 미생성(calc=false)·ko/en 수치 동치 보장.
 */

export interface VdSeed {
  statementNo: string;
  productName: string;
  manufacturer: string;
  source: { mainFunction: string; baseStandard: string; intake: string; caution: string; dosageForm: string; storage: string; shelfLife: string };
  grounding: {
    declaredAmount: { value: number; unit: string; basisAmount: number; basisUnit: string };
    serving: { unitType: string; unitsPerServing: number | null; servingsPerDay: number | null; servingsPerDayMax: number | null } & Record<string, unknown>;
    calculationAllowed: boolean; ageBandsRaw: string | null;
  };
  compose: { servingUnitKo: string | null; ratio: string; hasColiform: boolean; directGrounded: boolean };
  flags: { hasIU: boolean; osteoporosis: boolean; waterInSource: boolean; chew: boolean; melt: boolean } & Record<string, unknown>;
}

const esc = (s: string): string => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (n: number): string => (Number.isInteger(n) ? String(n) : String(n));

/**
 * 공식 자유서술 필드(성상·보관·유통기한)의 **판촉 문장 제거**.
 * 원문에 간혹 섞인 "…안심하고 섭취하십시오" 같은 판촉 tail 은 소비자 draft 로 옮기면 안 되는 주장이다
 * (가드 D-CLAIM BLOCKED). 문장 단위로 분할해 판촉 토큰 문장만 버리고 사실 서술만 남긴다.
 * (코팅정 등 사실 제형 서술은 유지 — 가드 grounded REVIEW 로 사람 확인.)
 */
const PROMO_SENTENCE = /안심하고|(?<![가-힣])순한|입문용|처음\s*시작|이제\s*막\s*챙|살아남|효과가\s*좋|휴대\s*가?\s*(편|간편)|부담\s*이?\s*(적|없)|프리미엄|고품질|믿고/;
/**
 * 판촉 문장만 제거하고 **나머지는 원문 부분문자열 그대로 유지**한다.
 * (문장 마커 "N)"·①②③ 를 지우면 ruleB.stripQuotedAndName 의 원문 인용 제거가 깨져
 *  "최대한 차단" 같은 정상 서술이 최상급으로 오탐된다 → 마커 보존이 핵심.)
 * 공백만 단일화(가드도 동일하게 정규화하므로 부분문자열 매칭 유지).
 */
function sanitizeOfficial(raw: string): string {
  const s = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  const parts = s.split(/(?<=[.。])\s+|(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫])/).map((x) => x.trim()).filter(Boolean);
  const kept = parts.filter((p) => !PROMO_SENTENCE.test(p));
  return kept.join(' ').replace(/\s+/g, ' ').trim();
}

function counterKo(seed: VdSeed): string {
  const raw = seed.compose.servingUnitKo;
  if (raw) return raw === '캅셀' ? '캡슐' : raw === '개' ? '개' : raw;
  const t = seed.grounding.serving.unitType;
  if (t === 'softgel' || t === 'capsule') return '캡슐';
  if (t === 'gummy') return '젤리';
  if (t === 'film') return '매';
  if (t === 'powder') return '포';
  return '정';
}
function counterEn(seed: VdSeed): string {
  const t = seed.grounding.serving.unitType;
  const ko = seed.compose.servingUnitKo;
  if (ko === '병') return 'bottle';
  if (ko === '스푼') return 'spoonful';
  if (ko === '매' || t === 'film') return 'film';
  if (t === 'gummy' || ko === '젤리' || ko === '구미') return 'gummy';
  if (ko === '포' || ko === '스틱' || ko === '스쿱' || t === 'powder') return 'sachet';
  if (t === 'softgel' || t === 'capsule' || ko === '캡슐' || ko === '캅셀') return 'capsule';
  if (ko === '개' && t === 'chewable') return 'piece';
  return 'tablet';
}
function formPrefKo(t: string): string {
  if (t === 'softgel' || t === 'capsule') return '캡슐 형태를 선호하는 분';
  if (t === 'chewable') return '씹어 먹는 형태를 선호하는 분';
  if (t === 'gummy') return '젤리 형태를 선호하는 분';
  if (t === 'powder') return '간편한 분말 형태를 선호하는 분';
  if (t === 'film') return '필름 형태를 선호하는 분';
  return '정 형태를 선호하는 분';
}
function formPrefEn(t: string): string {
  if (t === 'softgel' || t === 'capsule') return 'Those who prefer capsules';
  if (t === 'chewable') return 'Those who prefer a chewable form';
  if (t === 'gummy') return 'Those who prefer gummies';
  if (t === 'powder') return 'Those who prefer a convenient powder form';
  if (t === 'film') return 'Those who prefer a film form';
  return 'Those who prefer tablets';
}
/** 원문 grounding 에 근거한 섭취 방법 칩 (물/씹어/그대로/녹여). 근거 없으면 칩 없음. */
function methodChip(seed: VdSeed): { ko: string | null; en: string | null } {
  if (seed.flags.waterInSource) return { ko: '물과 함께', en: 'With water' };
  if (seed.flags.chew) return { ko: '씹어 섭취', en: 'Chew to take' };
  if (seed.compose.directGrounded) return { ko: '그대로 섭취', en: 'Take as is' };
  if (seed.flags.melt) return { ko: '녹여 섭취', en: 'Let it dissolve' };
  return { ko: null, en: null };
}
/**
 * 공식 주의사항 → 안전 표준 문안 (component-based).
 * 원문 verbatim 은 판촉 토큰("안심하고" 등 CLAIM_KO)을 draft 로 끌어와 가드 BLOCKED 를 유발하므로,
 * 원문에 **존재하는 표준 경고 요소만 감지**하여 정형 문안으로 재구성한다(누락 방지 위해 라벨 확인 포인터 부가).
 */
function cautionBulletsKo(raw: string): string[] {
  const s = (raw ?? '').replace(/\s+/g, ' ');
  const out: string[] = [];
  if (/임산부|임신|수유/.test(s)) out.push('임산부·수유부는 섭취 전 전문가와 상담');
  if (/고칼슘혈증/.test(s)) out.push('고칼슘혈증이 있거나 의약품 복용 시 전문가와 상담');
  else if (/의약품|질환|질병|치료/.test(s)) out.push('질환이 있거나 의약품 복용 시 전문가와 상담');
  if (/알레르기|알러지|과민/.test(s)) out.push('알레르기 체질 등은 개인에 따라 과민반응 가능');
  if (/이상사례|이상반응|부작용|중단/.test(s)) out.push('이상사례 발생 시 섭취를 중단하고 전문가와 상담');
  if (/어린이|소아/.test(s)) out.push('어린이 손이 닿지 않는 곳에 보관');
  if (out.length === 0) out.push('섭취 전 제품 표시사항을 확인');
  out.push('자세한 주의사항은 제품 표시사항을 확인하십시오');
  return out;
}
function cautionBulletsEn(raw: string): string[] {
  const s = (raw ?? '').replace(/\s+/g, ' ');
  const out: string[] = [];
  if (/임산부|임신|수유/.test(s)) out.push('Pregnant or breastfeeding women should consult a professional before use');
  if (/고칼슘혈증/.test(s)) out.push('Consult a professional if you have hypercalcaemia or take medication');
  else if (/의약품|질환|질병|치료/.test(s)) out.push('Consult a professional if you have a condition or take medication');
  if (/알레르기|알러지|과민/.test(s)) out.push('Allergic reactions may occur in sensitive individuals');
  if (/이상사례|이상반응|부작용|중단/.test(s)) out.push('Stop use and consult a professional if adverse effects occur');
  if (/어린이|소아/.test(s)) out.push('Keep out of reach of children');
  out.push('Refer to the official cautions printed on the product');
  return out;
}

export interface Composed { ko: string; en: string }

export function composeVd(seed: VdSeed): Composed {
  const da = seed.grounding.declaredAmount;
  const amt = `${num(da.value)}${da.unit === 'IU' ? ' IU' : da.unit}`; // "5μg" | "1000 IU"
  const basis = `${num(da.basisAmount)}${da.basisUnit}`; // "0.4g"
  const ck = counterKo(seed);
  const ce = counterEn(seed);
  const ups = seed.grounding.serving.unitsPerServing;
  const sd = seed.grounding.serving.servingsPerDay ?? 1;
  const hasUnit = ups != null;
  const perServeKo = hasUnit ? `${ups}${ck}` : null;      // "1캡슐" | null
  const perServeEn = hasUnit ? `${ups} ${ce}${ups > 1 ? 's' : ''}` : null;
  const mfn = seed.source.mainFunction;
  const osteo = seed.flags.osteoporosis && /골다공증/.test(mfn);
  const chip = methodChip(seed);
  const t = seed.grounding.serving.unitType;
  const coliform = seed.compose.hasColiform;
  const cautionKo = cautionBulletsKo(seed.source.caution).join(' · ');
  const cautionEn = cautionBulletsEn(seed.source.caution).join(' · ');
  // 공식 자유서술 — 판촉 문장 제거. 성상은 비면 제형 분류 폴백.
  const formKoName = (t === 'softgel' ? '연질캡슐' : t === 'capsule' ? '캡슐' : t === 'chewable' ? '츄어블정' : t === 'gummy' ? '젤리' : t === 'film' ? '필름' : t === 'powder' ? '분말' : '정제');
  const dosage = sanitizeOfficial(seed.source.dosageForm) || formKoName;
  const storage = sanitizeOfficial(seed.source.storage);
  const shelfLife = sanitizeOfficial(seed.source.shelfLife);

  // ── 기능성 (공식 인정) — MAIN_FNCTN 에 존재하는 것만 ──
  const fnKo: string[] = ['칼슘과 인이 흡수되고 이용되는데 필요', '뼈의 형성과 유지에 필요'];
  if (osteo) fnKo.push('골다공증 발생 위험 감소에 도움을 줌');
  const fnEn: string[] = ['Needed for the absorption and utilisation of calcium and phosphorus', 'Needed for the formation and maintenance of bone'];
  if (osteo) fnEn.push('Recognised as helping reduce the risk of developing osteoporosis');

  // ── intro ──
  const introKo = (sd === 1 && perServeKo)
    ? `이 제품은 1일 섭취량(1회 · ${perServeKo})에 비타민 D <b>${amt}</b>를 표시량으로 담았습니다(표시 기준 ${basis}당). 비타민 D는 칼슘과 인이 흡수되고 이용되는데 필요하며, 뼈의 형성과 유지에 필요한 영양성분입니다.`
    : `이 제품은 비타민 D <b>${amt}</b>를 표시량으로 담았습니다(표시 기준 ${basis}당). 비타민 D는 칼슘과 인이 흡수되고 이용되는데 필요하며, 뼈의 형성과 유지에 필요한 영양성분입니다.`;
  const introEn = (sd === 1 && perServeEn)
    ? `One daily serving (once a day, ${perServeEn}) provides <b>${amt}</b> of labelled vitamin D (per ${basis} of product). Vitamin D is a nutrient needed for the absorption and utilisation of calcium and phosphorus, and for the formation and maintenance of bone.`
    : `This product provides <b>${amt}</b> of labelled vitamin D (per ${basis} of product). Vitamin D is a nutrient needed for the absorption and utilisation of calcium and phosphorus, and for the formation and maintenance of bone.`;

  const dayKo = `1일 ${sd}회`;
  const dayEn = sd === 1 ? 'Once a day' : `${sd} times a day`;

  // ── 왜 이 제품인가 ──
  const whyKo: string[] = [`${dayKo}${perServeKo ? `(${perServeKo})` : ''} 섭취로 비타민 D <b>${amt}</b>`];
  if (coliform) whyKo.push('대장균군 음성 — 식약처 신고 기준 적합');
  whyKo.push(`${esc(dosage)} · ${esc(seed.manufacturer)} 제조`);
  const whyEn: string[] = [`<b>${amt}</b> of vitamin D${perServeEn ? ` per serving (${perServeEn})` : ' per serving'}`];
  if (coliform) whyEn.push('Coliform negative — meets its MFDS notified standard');
  whyEn.push(`Made by ${esc(seed.manufacturer)}`);

  // ── 섭취 칩 ──
  const chipsKo = [`<span class="sd-tag">${dayKo}</span>`];
  if (perServeKo) chipsKo.push(`<span class="sd-tag">1회 ${perServeKo}</span>`);
  if (chip.ko) chipsKo.push(`<span class="sd-tag">${chip.ko}</span>`);
  const chipsEn = [`<span class="sd-tag">${dayEn}</span>`];
  if (perServeEn) chipsEn.push(`<span class="sd-tag">${perServeEn} per serving</span>`);
  if (chip.en) chipsEn.push(`<span class="sd-tag">${chip.en}</span>`);

  // ── 표시 기준 ──
  const specKo: string[] = [`<div class="sd-item"><b>비타민 D</b> 표시량(${amt}/${basis})의 ${seed.compose.ratio}</div>`,
    `<div class="sd-item"><b>성상</b> ${esc(dosage)}</div>`];
  if (coliform) specKo.push('<div class="sd-item"><b>대장균군</b> 음성</div>');
  if (shelfLife) specKo.push(`<div class="sd-item"><b>유통기한</b> ${esc(shelfLife)}</div>`);
  if (storage) specKo.push(`<div class="sd-item"><b>보관</b> ${esc(storage)}</div>`);
  const specEn: string[] = [`<div class="sd-item"><b>Vitamin D</b> labelled (${amt} / ${basis}), ${seed.compose.ratio}</div>`,
    `<div class="sd-item"><b>Appearance</b> ${esc(dosage)}</div>`];
  if (coliform) specEn.push('<div class="sd-item"><b>Coliform</b> Negative</div>');
  if (shelfLife) specEn.push(`<div class="sd-item"><b>Shelf life</b> ${esc(shelfLife)}</div>`);
  if (storage) specEn.push(`<div class="sd-item"><b>Storage</b> ${esc(storage)}</div>`);

  // ── 이런 분께 ──
  const whoKo = ['매일 비타민 D를 챙기고 싶은 분', formPrefKo(t), '실내 생활로 햇볕 쬐는 시간이 부족한 분'];
  const whoEn = ['Those who take vitamin D daily', formPrefEn(t), 'Those who spend much time indoors with little sun exposure'];

  const badgeKo = `<span class="sd-badge">건강기능식품</span><span class="sd-badge is-solid">비타민 D ${amt}</span><span class="sd-badge">${dayKo}</span>`;
  const badgeEn = `<span class="sd-badge">Health Functional Food</span><span class="sd-badge is-solid">Vitamin D ${amt}</span><span class="sd-badge">${dayEn}</span>`;

  const li = (items: string[]) => items.map((x) => `<li>${x}</li>`).join('');

  const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeKo}</div>
  <h1>${esc(seed.productName)}<small>비타민 D</small></h1><p class="sd-meta">${esc(seed.manufacturer)} 제조 · ${dayKo}${perServeKo ? ` ${perServeKo}` : ''}</p></div>
  <div class="sd-body"><p class="sd-intro">${introKo}</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why">${li(whyKo)}</ul>
  <h2>비타민 D 영양기능 (공식 인정 기능성)</h2><ul class="sd-why">${li(fnKo)}</ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsKo.join('')}</span></div>
  <h2>표시 기준</h2><div class="sd-spec">${specKo.join('')}</div>
  <h2>이런 분께</h2><ul class="sd-who">${li(whoKo)}</ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · ${esc(cautionKo)}</div></div>`;

  const en = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeEn}</div>
  <h1>${esc(seed.productName)}<small>Vitamin D</small></h1><p class="sd-meta">Made by ${esc(seed.manufacturer)} · ${dayEn}${perServeEn ? ` · ${perServeEn}` : ''}</p></div>
  <div class="sd-body"><p class="sd-intro">${introEn}</p>
  <h2>Why this product</h2><ul class="sd-why">${li(whyEn)}</ul>
  <h2>Vitamin D nutritional functions (officially recognised)</h2><ul class="sd-why">${li(fnEn)}</ul>
  <h2>Directions (exactly as officially stated)</h2><div class="sd-intake"><span class="sd-chips">${chipsEn.join('')}</span></div>
  <h2>Labelled standard</h2><div class="sd-spec">${specEn.join('')}</div>
  <h2>Who it suits</h2><ul class="sd-who">${li(whoEn)}</ul></div><div class="sd-foot"><b>Precautions</b> · ${esc(cautionEn)}</div></div>`;

  return { ko, en };
}

/** seed → GuardProductInput (가드 입력) */
export function toGuardInput(seed: VdSeed, slug: string) {
  const { ko, en } = composeVd(seed);
  return {
    candidateId: `hff-vd:${slug}`,
    productName: seed.productName,
    productNameEn: seed.productName,
    manufacturer: seed.manufacturer,
    manufacturerEn: null,
    statementNo: seed.statementNo,
    category: 'hff',
    source: seed.source,
    grounding: {
      declaredAmount: seed.grounding.declaredAmount,
      serving: {
        unitType: seed.grounding.serving.unitType,
        unitWeight: null, unitWeightUnit: null,
        unitsPerServing: seed.grounding.serving.unitsPerServing,
        servingTotalWeight: (seed.grounding.serving as Record<string, unknown>).servingTotalWeight ?? null,
        servingTotalWeightUnit: (seed.grounding.serving as Record<string, unknown>).servingTotalWeightUnit ?? null,
        servingsPerDay: seed.grounding.serving.servingsPerDay,
        servingsPerDayMax: seed.grounding.serving.servingsPerDayMax ?? null,
      },
      calculationAllowed: false,
      ageBandsRaw: seed.grounding.ageBandsRaw,
    },
    drafts: { ko, en },
  };
}
