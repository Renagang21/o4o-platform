/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1 — EN 고정 프레임 사전
 *
 * 번역 엔진과 **무관하게** 결정되는 부분만 모은다. 여기 있는 것은 LLM 을 태우지 않는다.
 *   · 9개 섹션 제목 · 필드 라벨 · 구분 배지 · 푸터 3문장 → 고정 영어
 *   · FIXED_IDENTITY 값(제품명 · 제조·수입사 · 품목기준코드) → **한국어 원문 그대로**
 *
 * FIXED_IDENTITY 확정 계약 (2026-08-06):
 *   공식 영문명 원장이 없으므로 임의 로마자 표기와 추정 영문 상품명·회사명을 금지한다.
 *   향후 공식 영문명이 확보되면 **별도 공식 필드로 추가**하고 현재 식별값을 덮어쓰지 않는다.
 *
 * 실측 근거 (19,360 master 전수):
 *   구분 배지 = `일반의약품` 전건 단일 · 섹션 9종 · 푸터 3문장 전건 동일
 */

/** 섹션 제목 — KO 본문의 h2 와 1:1. 9종이 전부다. */
export const SECTION_TITLE = {
  '제품 개요': 'Product overview',
  '효능·효과': 'Indications',
  '사용 방법': 'Directions for use',
  '사용하면 안 되는 경우': 'Do not use',
  '사용 전 상담이 필요한 경우': 'Consult before use',
  '이상반응': 'Adverse reactions',
  '사용 중 주의사항': 'Precautions during use',
  '상호작용': 'Interactions',
  '보관 방법': 'Storage',
};

/** 제품 개요 안의 필드 라벨. 라벨만 번역하고 **값은 건드리지 않는다.** */
export const FIELD_LABEL = {
  '제품명': 'Product name',
  '제조·수입사': 'Manufacturer',
  '품목기준코드': 'Item sequence',
};

/** 구분 배지. 실측상 전건 `일반의약품` 이지만, 미지의 값이 오면 번역하지 않고 차단한다. */
export const BADGE = {
  '일반의약품': 'Over-the-counter medicine',
  '전문의약품': 'Prescription medicine',
};

/** 푸터 3문장 — 전건 동일하므로 고정 번역한다. 매장 약사 문의 안내는 반드시 유지한다. */
export const FOOTER = {
  '이 설명서는 매장 상담을 돕기 위한 자료입니다.':
    'This leaflet is provided to support consultation at the store.',
  '사용 전 매장 약사에게 문의하세요.':
    'Please consult the pharmacist at the store before use.',
  '증상이 나아지지 않거나 이상이 느껴지면 사용을 멈추고 의사·약사와 상의하세요.':
    'If your symptoms do not improve or you feel unwell, stop use and consult a doctor or pharmacist.',
};

/**
 * 함량·용량 토큰 — 원칙 9(KO 수치·단위 배열 및 **순서** 보존) 의 실제 판정 대상.
 *
 * 5단계 표본 검증 결과: 맨숫자 배열 동일성은 자연스러운 영어로 만족 불가능하다.
 * 한국어의 구조적 계수사(`1일 3회` → "3 times a day", `1회 1정` → "1 tablet per dose")가
 * 영어 관용구에 흡수되면서 `1` 이 사라지기 때문이다 — 13 표본 중 12 가 이 이유로 실패했다.
 * 반면 **단위를 동반한 수치**(함량·용량·용적)는 13/13 이 순서까지 그대로 보존됐다.
 * 복합제 성분별 함량 1:1 과 순서 보존은 바로 이 토큰 배열이 담보한다.
 *
 * 단위 뒤에 로마자가 이어지면 단위가 아니다(`IU` vs `diuretics`). 한글 조사(`15 mL씩`)는 허용한다.
 */
export const STRENGTH_RE =
  /(\d[\d.,]*)\s*(mg|㎎|밀리그램|mcg|㎍|마이크로그램|g|그램|ml|mL|㎖|밀리리터|IU|국제단위|%)(?![A-Za-z])/g;
export const STRENGTH_UNIT_CANON = {
  '㎎': 'mg', '밀리그램': 'mg', '㎍': 'mcg', '마이크로그램': 'mcg', '그램': 'g',
  '㎖': 'ml', '밀리리터': 'ml', 'mL': 'ml', '국제단위': 'iu', 'IU': 'iu',
};

/**
 * 투여 경로를 판정하는 섹션 — 그 제품 **자신의** 투여 경로가 적히는 곳은 사용 방법뿐이다.
 * 문서 전체를 훑으면 `내복용`(→`복용`) · `바르비탈계`(→`바르`) 같은 부분문자열,
 * 그리고 병용약의 `투여` · 오연(誤嚥) 경고의 `복용` 이 전부 오탐이 된다.
 * 5단계 표본에서 ROUTE_LOST 4건이 모두 이 유형이었다.
 */
export const ROUTE_SECTIONS = ['사용 방법'];

/**
 * 투여 경로 동사 — 원칙 3(route 동사 정확히 번역).
 * 값은 **허용 EN 표현 집합**이다. 검증기는 "KO 에 이 경로가 있으면 EN 에 대응 표현이 있어야 한다" 로 쓴다.
 * 경로를 뭉개는 일반 동사(take/use)로만 번역되면 위반이다 — 외용제를 삼키는 오역이 이 지점에서 난다.
 */
export const ROUTE_VERB = {
  '복용': ['take', 'taken', 'taking', 'orally', 'by mouth'],
  '투여': ['administer', 'administered', 'administration'],
  '바르': ['apply', 'applied', 'application'],
  '도포': ['apply', 'applied', 'application'],
  '점안': ['instill', 'instilled', 'eye drop', 'into the eye', 'into the affected eye'],
  // 배치 0009 에서 추가 — 맨 `점이` 는 "해명되지 않은 **점이** 많고" 같은 명사+조사에도 걸려
  // 귀와 무관한 제품이 ROUTE_LOST 로 떨어졌다. 점이제 용법은 e약은요에서 항상 활용형으로 적힌다.
  '점이하': ['instill', 'instilled', 'ear drop', 'into the ear'],
  '점이합': ['instill', 'instilled', 'ear drop', 'into the ear'],
  '점이용': ['instill', 'instilled', 'ear drop', 'into the ear'],
  '점비': ['instill', 'instilled', 'nasal drop', 'into the nostril', 'into the nose'],
  '붙이': ['attach', 'apply', 'affix', 'patch'],
  '부착': ['attach', 'apply', 'affix', 'patch'],
  '삽입': ['insert', 'inserted', 'insertion'],
  '흡입': ['inhale', 'inhaled', 'inhalation'],
  '양치': ['rinse', 'gargle'],
  '가글': ['gargle', 'rinse'],
  '뿌리': ['spray', 'sprayed'],
  '분무': ['spray', 'sprayed', 'nebuli'],
  '주사': ['inject', 'injected', 'injection'],
  '마시': ['drink', 'take', 'taken'],
  '씹어': ['chew', 'chewed', 'chewing'],
  '녹여': ['dissolve', 'dissolved', 'allow to melt'],
  '넣어': ['place', 'put', 'insert', 'instill'],
};

/**
 * 부정·금기·경고 표지 — 원칙 4(금기 · 부정어 · 경고 강도 보존).
 * KO 문장에 강한 금지가 있는데 EN 이 권고 수준으로 약해지면 위반이다.
 */
export const NEGATION_KO = [
  '안 되', '안됩', '하지 마', '하지 말', '말 것', '마십시오', '금지', '금기',
  '사용하지', '복용하지', '투여하지', '삼가', '절대', '중단', '중지', '않도록', '없이',
  // 배치 0009 에서 활용형으로 좁힘 — 맨 `피하` 는 해부학 용어 `피하염증` · `피하지방` 에도 걸려
  // 부정어가 전혀 없는 문장이 NEGATION_WEAKENED 로 떨어졌다.
  '피하십시오', '피하고', '피하도록', '피하여', '피할', '피해야',
];
export const NEGATION_EN = [
  'do not', "don't", 'must not', 'should not', 'never', 'avoid', 'refrain',
  'discontinue', 'stop', 'contraindicat', 'not be used', 'without',
  // 5단계 표본 검증에서 추가 — "Take care that it does not get into the eyes" 형태의
  // 3인칭 부정을 놓쳐 정상 번역이 NEGATION_WEAKENED 로 떨어졌다.
  'does not', 'did not', 'is not', 'are not', 'cannot', "can't",
];
/** 경고 강도 — 강한 쪽이 약한 쪽으로 내려가면 위반이다. */
export const WARNING_KO = ['경고', '주의', '위험', '심각', '즉시', '반드시'];
export const WARNING_EN = ['warning', 'caution', 'danger', 'serious', 'severe', 'immediately', 'must', 'be sure'];

/** 연령 · 1회량 · 횟수 · 간격 · 기간 — 원칙 2. KO 에서 뽑아 EN 에 살아 있는지 본다. */
export const DOSING_KO = {
  age: /(만\s*)?\d+\s*(세|개월|년)\s*(이상|미만|이하|초과)?/g,
  perDose: /1\s*회\s*\d+(?:[.,]\d+)?\s*\S*/g,
  frequency: /(1\s*일|하루)\s*\d+\s*회|\d+\s*회\/일/g,
  interval: /\d+\s*(시간|분|일)\s*(마다|간격|이상|이내)/g,
  duration: /\d+\s*(일|주|개월|년)\s*(간|동안|이내|이상)/g,
};
