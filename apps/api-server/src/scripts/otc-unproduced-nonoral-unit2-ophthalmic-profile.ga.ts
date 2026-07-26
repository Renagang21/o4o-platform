/**
 * WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT2-OPHTHALMIC-FINAL-READINESS-V1 — 점안 전용 RouteProfile · 어댑터 (에이전트 가)
 *
 * ⚠️ 공용 파일 무수정 계약.
 *    `otc-v2-store-leaflet-runner.shared.ts` 는 **import 만** 한다. 공용 `ROUTE_PROFILE` 은 건드리지 않고,
 *    `composeKo(..., profiles)` / `renderEn(..., profiles)` 의 profiles 주입 지점에 본 모듈의
 *    `OPHTHALMIC_PROFILE` 을 넘겨 점안 전용 계약을 적용한다.
 *
 * 공용 프로파일과의 차이는 KO usageLabel 하나뿐이다.
 *   공용 ophthalmic.koUsageLabel = '사용 안내'  (DR-019 비경구 일반 라벨)
 *   본 WO      ophthalmic.koUsageLabel = '점안 사용 안내'  (WO 지정)
 * DR-019 은 "투여경로를 제형명으로 추정하지 말고 확정된 route 에서 라벨을 도출한다" 는 규칙이므로,
 * route=ophthalmic 에서 도출한 더 구체적인 비경구 라벨은 규칙에 반하지 않는다.
 * 본 라벨은 **본 유닛 산출물에만** 적용되며 다른 route·다른 유닛의 렌더 결과를 바꾸지 않는다.
 *
 * KO 동사 재표현은 공용 NONORAL_REWRITE(복용→사용)를 그대로 쓴다.
 *   '복용'→'점안' 일괄 치환은 하지 않는다. 주의사항에는 **다른 경구약 복용**을 가리키는 문장이
 *   섞여 있어(예: "다른 약을 복용 중인 경우") 일괄 치환하면 공식 원문에 없는 사실을 만들게 된다.
 *   점안 경로는 usageLabel 과 공식 용법 원문("1회 1~2방울씩 점안합니다")이 그대로 담보한다.
 *
 * DB 미접속 · write 0 · 순수 함수 모듈.
 */
import {
  EN_ORAL_VERB_RE,
  NONORAL_REWRITE,
  ORAL_VERB_RE,
  ROUTE_PROFILE,
  fpToUuidV2,
  normalize,
  resolveRoute,
  type RouteProfile,
} from './otc-v2-store-leaflet-runner.shared.js';

export const OPHTHALMIC_ROUTE = 'ophthalmic';
/** 일반명코드 접미 → 점안 제형. 제품명으로 경로·적용부위를 추정하지 않는다. */
export const OPHTHALMIC_SUFFIXES = ['COO', 'COS'] as const;
export const OPHTHALMIC_FORMS = ['점안겔', '점안액'] as const;

/** 점안 전용 프로파일 — 공용 ROUTE_PROFILE.ophthalmic 을 복사한 뒤 KO 라벨만 교체한다. */
export const OPHTHALMIC_PROFILE: Record<string, RouteProfile> = {
  [OPHTHALMIC_ROUTE]: {
    ...ROUTE_PROFILE[OPHTHALMIC_ROUTE],
    koUsageLabel: '점안 사용 안내',
    enUsageLabel: 'How to use the eye drops',
    koVerbRewrite: NONORAL_REWRITE,
    koForbidden: ORAL_VERB_RE,
    enForbidden: EN_ORAL_VERB_RE,
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// EN 점안 경로 게이트
// ════════════════════════════════════════════════════════════════════════════════
/** EN 용법에 점안 경로 표현이 최소 1개 있어야 한다(경구 동사 대체 확인). */
export const EN_OPHTHALMIC_ROUTE_RE = [
  /\binstil{1,2}(?:ed|ing|s)?\b/i,
  /\beyes?\b/i,
  /\beyelids?\b/i,
  /\bconjunctival sac\b/i,
  /\beye drops?\b/i,
];

/** 원문 용법의 적용 눈(한쪽/양쪽) 표현 → EN 대응 표현. */
const EYE_SIDE_AXIS: Array<{ ko: RegExp; label: string; en: RegExp }> = [
  { ko: /양(?:쪽|안|측)\s*눈|양쪽|양안/, label: 'both-eyes', en: /\bboth eyes\b|\beach eye\b|\bevery eye\b/i },
  { ko: /한(?:쪽|측)\s*눈|한쪽|편측/, label: 'one-eye', en: /\bone eye\b|\bthe affected eye\b|\beach eye\b/i },
];

/** 원문 주의의 점안 고유 축 → EN 대응 표현. 있으면 반드시 보존한다. */
const EYE_CAUTION_AXIS: Array<{ ko: RegExp; label: string; en: RegExp }> = [
  { ko: /콘택트\s*렌즈|콘텍트\s*렌즈|소프트렌즈|하드렌즈/, label: 'contact-lens', en: /\bcontact lens(?:es)?\b/i },
  {
    ko: /용기(?:의)?\s*끝|용기\s*입구|점안구|눈에\s*직접\s*닿지|눈이나\s*눈꺼풀에\s*닿지|오염/,
    label: 'container-tip',
    en: /\btip of the container\b|\bdropper tip\b|\bnozzle\b|\btouch(?:ing)?\b|\bcontaminat/i,
  },
  { ko: /다른\s*점안제|다른\s*안약|병용\s*점안|점안\s*간격|간격을\s*두고/, label: 'instill-interval', en: /\bother eye drops?\b|\banother eye drop\b|\binterval\b|\bwait\b|\bminutes? apart\b/i },
];

export interface EyeAxisResult { required: string[]; missing: string[] }

/** 공식 용법의 한쪽/양쪽 눈 축이 EN 용법에 보존됐는지. */
export function missingEyeSideEn(officialDosage: string, enUsage: string): EyeAxisResult {
  const t = normalize(officialDosage);
  const required: string[] = [];
  const missing: string[] = [];
  for (const a of EYE_SIDE_AXIS) {
    if (!a.ko.test(t)) continue;
    required.push(a.label);
    if (!a.en.test(enUsage)) missing.push(a.label);
  }
  return { required, missing };
}

/** 공식 주의의 점안 고유 축(콘택트렌즈·용기 끝 접촉·점안 간격)이 EN 주의/용법에 보존됐는지. */
export function missingEyeCautionEn(officialCaution: string, enText: string): EyeAxisResult {
  const t = normalize(officialCaution);
  const required: string[] = [];
  const missing: string[] = [];
  for (const a of EYE_CAUTION_AXIS) {
    if (!a.ko.test(t)) continue;
    required.push(a.label);
    if (!a.en.test(enText)) missing.push(a.label);
  }
  return { required, missing };
}

/**
 * 1회 점안 방울 수 보존 게이트.
 * 공용 `missingNumericsEn` 의 단위 목록(NUM_UNIT)에는 '방울' 은 있으나 '적'(滴)이 없다.
 * 점안 원문은 '1회 2~3적' 처럼 '적' 을 쓰는 사례가 있어 방울 수가 수량 게이트에서 새는 구간이 생긴다.
 * 공용 파일을 고치지 않고 본 모듈에서 '방울·적' 양쪽을 직접 요구한다.
 */
export function missingDropCountsEn(officialDosage: string, enUsage: string): string[] {
  const t = normalize(officialDosage);
  const lower = ' ' + enUsage.toLowerCase().replace(/\s+/g, ' ') + ' ';
  const present = (v: string): boolean =>
    new RegExp(`(?:^|[^\\d.])${v.replace('.', '\\.')}(?:[^\\d.]|$)`).test(lower);
  const need = new Set<string>();
  const re = /(\d+(?:\.\d+)?)(?:\s*[~,\-–—]\s*(\d+(?:\.\d+)?))?\s*(?:방울|적)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) { need.add(m[1]); if (m[2]) need.add(m[2]); }
  return [...need].filter((v) => !present(v)).sort();
}

/** EN 용법에 점안 경로 표현이 있는지. */
export function hasOphthalmicRouteEn(enUsage: string): boolean {
  return EN_OPHTHALMIC_ROUTE_RE.some((re) => re.test(enUsage));
}

/** EN 전체 텍스트에 남은 경구 동사. */
export function oralVerbsEn(text: string): string[] {
  const hit: string[] = [];
  for (const re of EN_ORAL_VERB_RE) {
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    if (r.test(text)) hit.push(re.source);
  }
  return hit.sort();
}

// ════════════════════════════════════════════════════════════════════════════════
// 점안 전용 입력 어댑터 — proposal/SSOT groups → 러너 그룹 계약
// ════════════════════════════════════════════════════════════════════════════════
export interface OphthalmicGroup {
  fp: string;
  gencode: string;
  suffix: string;
  route: string;
  form: string;
  size: number;
  masterIds: string[];
  /** fpToUuidV2 결정론 앵커. 산식 변경 0. */
  sourceRef: string;
  /** 어댑터 단계에서 발견된 차단 사유(비어야 정상) */
  blockers: string[];
}

/**
 * proposal(또는 최종 SSOT) 의 그룹 배열에서 route=ophthalmic 만 뽑아 러너 계약 형태로 변환한다.
 * route·form 은 **일반명코드 접미**에서 재해석해 입력값과 대조한다(제품명 미사용).
 */
export function adaptOphthalmicGroups(groups: any[]): OphthalmicGroup[] {
  return groups
    .filter((g) => g.route === OPHTHALMIC_ROUTE)
    .map((g) => {
      const rr = resolveRoute(g.gencode);
      const blockers: string[] = [];
      if (!rr.ok) blockers.push(`route 차단: ${rr.reason}`);
      else {
        if (rr.route !== OPHTHALMIC_ROUTE) blockers.push(`route 상충: gencode→${rr.route}`);
        if (g.form && rr.form !== g.form) blockers.push(`form 상충: gencode→${rr.form} vs 입력 ${g.form}`);
      }
      const suffix = String(g.gencode || '').slice(6, 9).toUpperCase();
      if (!(OPHTHALMIC_SUFFIXES as readonly string[]).includes(suffix)) blockers.push(`점안 접미 아님(${suffix})`);
      const masterIds = [...(g.masterIds || [])].sort();
      if (masterIds.length !== g.size) blockers.push(`size ${g.size} != masterIds ${masterIds.length}`);
      return {
        fp: g.fp,
        gencode: g.gencode,
        suffix,
        route: rr.ok ? rr.route : '',
        form: rr.ok ? rr.form : '',
        size: g.size,
        masterIds,
        sourceRef: fpToUuidV2(g.fp),
        blockers,
      };
    })
    .sort((a, b) => (a.fp < b.fp ? -1 : a.fp > b.fp ? 1 : 0));
}
