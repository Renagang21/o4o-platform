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
  // 인지기능(PQQ·천마·참당귀 등) — 공식 '노화로 (인해) 저하된 인지기능 개선'
  { re: /^노화로(인해)?저하된인지기능개선/, en: 'improve cognitive function that declines with aging' },
  { re: /^자외선에의한피부손상로부터피부건강유지/, en: 'maintain skin health from UV-induced skin damage' },
  // 칸탈로프멜론추출물(기능성원료인정 제2008-9호) 공식 3기능성 중 IMT·피부홍반 원자
  { re: /IMT.*혈행개선|혈관벽두께.*혈행개선/, en: 'improve blood circulation by suppressing the increase in vascular wall thickness (intima-media thickness, IMT)' },
  { re: /^자외선에의한피부홍반개선으로피부건강/, en: 'improve UV-induced skin erythema and support skin health' },
  { re: /^피부보습/, en: 'support skin moisturizing' },
  // 빌베리·헤마토코쿠스 눈 피로
  { re: /^눈의피로도?개선/, en: 'improve eye fatigue' },
  // 건조한 눈(빌베리 복합 문구 폴백 보강 — 공용 COMPONENT 도 커버하나 원자 결합 시 사용)
  { re: /^건조한눈을?개선하여눈건강/, en: 'improve dry eyes and support eye health' },
  { re: /^노화로인해감소될수있는황반색소밀도유지하여눈건강/, en: 'maintain macular pigment density that may decline with aging and support eye health' },
  // 혈행·혈중 지표(폴백 보강)
  { re: /^기억력개선/, en: 'improve memory' },
  // 참당귀 추출분말(Nutragen, 제2014-44호) 신미보 — 공식 (영문) 원문 "maintain healthy joint" (단일원료 인지+관절 병기)
  { re: /^관절건강(개선)?$|^관절건강에?/, en: 'maintain healthy joints' },
  { re: /^혈행개선/, en: 'improve blood circulation' },
  { re: /^식후혈중중성지질개선/, en: 'improve post-meal blood triglycerides' },
  { re: /^혈중중성지질개선/, en: 'improve blood triglycerides' },
  { re: /^(높은)?혈중콜레스테롤수치?개선/, en: 'improve blood cholesterol' },
  { re: /^혈압조절/, en: 'support blood pressure regulation' },
  // 나토균배양분말(제2012-7호) — 공식 (영문) 원문 grounded
  { re: /^혈압이높은사람/, en: 'support those with high blood pressure' },
  { re: /혈소판응집억?제?.*혈행개선|혈소판응집.*혈액흐름/, en: 'improve blood circulation by inhibiting platelet aggregation' },
  // 레시틴 제품 등 — 공식 '콜레스테롤 개선'(혈중 미명기)
  { re: /^콜레스테롤개선$|^콜레스테롤수치개선/, en: 'improve cholesterol' },
  // 항산화
  { re: /^항산화작용을하여유해산소로부터세포를보호/, en: 'protect cells from reactive oxygen species through antioxidant activity' },
  { re: /^유해산소로부터세포를보호/, en: 'protect cells from reactive oxygen species' },
  { re: /^산화스트레스로부터인체를?보호/, en: 'protect the body from oxidative stress' },
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
  // 공식 원문 이중언어/따옴표 형식 정리: '(영문) ...' 영어 tail 제거, '(국문)' 마커·따옴표 제거.
  const cleaned = ko
    .replace(/\(?\s*영문\s*\)?[\s\S]*$/, '')       // (영문)/영문 이후(영어 병기) 제거
    .replace(/\(?\s*국문\s*\)?\s*/g, '')            // (국문) 마커 제거
    .replace(/[“”"『』「」''`]/g, '')                // 따옴표류 제거
    .replace(/^[^:：()（）]{1,20}[:：]\s*/, '');       // '원료명 :' 접두 제거(예 '포스파티딜세린 : ...'). 괄호 안 콜론(예 '(내중막 두께 : IMT)')은 제외
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
