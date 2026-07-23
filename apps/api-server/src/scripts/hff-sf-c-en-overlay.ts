/**
 * C 도메인(눈·인지·혈행·항산화) 전용 기능성 EN 정본 overlay — **additive**.
 * WO-O4O-HFF-INDEPENDENT-UNLOCK-AND-PRODUCTION-C-V1.
 *
 * 공용 `hff-nutrient-registry.mapFunctionEn` 을 편집하지 않고(병렬 WIP 충돌 회피), C 도메인에서
 * 공식 원문 기능성의 EN 정본이 미확정이던 항목만 여기서 확정한다. resolveFunctions 가 이 overlay 를
 * 우선 조회하고, 미해당(null) 이면 기존 공용 mapFunctionEn 으로 폴백한다.
 *
 * 원칙: 임의 의학 사실 생성 0. 아래 EN 은 MFDS 공식 KO 기능성 문구의 **영어 표현**일 뿐 새 효능이 아니다.
 * 기능성 문장을 `·`(가운뎃점, 표기 변이 ･·‧・∙•⋅ 포함) 로 원자 분해하여 각 원자를 매핑한다.
 * 모든 원자가 매핑되면 결합 EN 을 반환하고, 하나라도 미매핑이면 null(→ 폴백/GROUNDING_PENDING).
 */

/** 표기 정규화: 모든 공백 제거 + 가운뎃점 변이 통합 + 괄호/지표성분 주석 제거. */
function normAtom(s: string): string {
  return s
    .replace(/[･・‧·∙•⋅․]/g, '·') // 중점 변이 → ·
    .replace(/[·]{2,}/g, '·')
    .replace(/\s+/g, '')
    .replace(/[（）()]/g, '')
    .replace(/[.。]+$/, '')
    // 접미 정규화(의미 보존): '~에 도움을 줄 수 있음' / '~하는데 필요' 등 제거
    .replace(/(에)?도움을줄수있음$/,'')
    .replace(/(하는데|에)?필요함?$/,'')
    .replace(/에도움을줌$/,'')
    .replace(/으로부터/g,'로부터')
    .replace(/을유지/g,'유지').replace(/를유지/g,'유지')
    .replace(/[·]$/,'');
}

/** C 도메인 원자 기능성 → EN(공식 KO 기능성의 영문 표현). */
const ATOM_EN: Array<{ re: RegExp; en: string }> = [
  // 포스파티딜세린 인지·피부
  { re: /^노화로인해저하된인지력개선/, en: 'improve cognitive function that declines with aging' },
  { re: /^자외선에의한피부손상로부터피부건강유지/, en: 'maintain skin health from UV-induced skin damage' },
  { re: /^피부보습/, en: 'support skin moisturizing' },
  // 빌베리·헤마토코쿠스 눈 피로
  { re: /^눈의피로도?개선/, en: 'improve eye fatigue' },
  // 건조한 눈(빌베리 복합 문구 폴백 보강 — 공용 COMPONENT 도 커버하나 원자 결합 시 사용)
  { re: /^건조한눈을?개선하여눈건강/, en: 'improve dry eyes and support eye health' },
  { re: /^노화로인해감소될수있는황반색소밀도유지하여눈건강/, en: 'maintain macular pigment density that may decline with aging and support eye health' },
  // 혈행·혈중 지표(폴백 보강)
  { re: /^기억력개선/, en: 'improve memory' },
  { re: /^혈행개선/, en: 'improve blood circulation' },
  { re: /^혈중중성지질개선/, en: 'improve blood triglycerides' },
  { re: /^혈중콜레스테롤개선/, en: 'improve blood cholesterol' },
  { re: /^혈압조절/, en: 'support blood pressure regulation' },
  // 항산화
  { re: /^항산화작용을하여유해산소로부터세포를보호/, en: 'protect cells from reactive oxygen species through antioxidant activity' },
  { re: /^유해산소로부터세포를보호/, en: 'protect cells from reactive oxygen species' },
  { re: /^항산화/, en: 'antioxidant activity' },
];

function mapAtom(atom: string): string | null {
  const n = normAtom(atom);
  if (n.length < 2) return null;
  for (const a of ATOM_EN) if (a.re.test(n)) return a.en;
  return null;
}

/**
 * C 도메인 기능성 KO 문구 → EN 정본. 미해당이면 null(호출부가 공용 mapFunctionEn 으로 폴백).
 * `·`(및 변이)로 결합된 다항 기능성은 원자별 매핑 후 결합. 하나라도 미매핑이면 null.
 */
export function mapFunctionEnC(ko: string): string | null {
  if (!ko) return null;
  // '원료명 :' 접두 제거(예 '포스파티딜세린 : ...')
  const cleaned = ko.replace(/^[^:：]{1,20}[:：]\s*/, '');
  const unified = cleaned.replace(/[･・‧∙•⋅․]/g, '·');
  const parts = unified.split(/·/).map((p) => p.trim()).filter((p) => p.length >= 2);
  if (parts.length < 1) return null;
  const ens: string[] = [];
  for (const p of parts) {
    const e = mapAtom(p);
    if (e == null) return null; // 원자 미매핑 → 전체 null(폴백)
    if (!ens.includes(e)) ens.push(e);
  }
  if (!ens.length) return null;
  return `May help ${ens.join(', ')}.`;
}
