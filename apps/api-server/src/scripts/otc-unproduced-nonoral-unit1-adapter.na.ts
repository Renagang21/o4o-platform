/**
 * WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-PRODUCTION-READINESS-AND-EN-V1 — 생산 입력 어댑터 (에이전트 나)
 *
 * 승인 SSOT `otc-unproduced-nonoral-unit1-approved-ssot-v1.json`(`4f188953d`, 70 fp / 443 master)를
 * 공용 V2 러너 원시 계약에 물리는 **입력 어댑터**. **생산 입력은 이 SSOT 하나만** 쓴다.
 *
 * ── 왜 별도 어댑터인가 ───────────────────────────────────────────────────────────
 * 기존 `otc-external-site-split-production.ts` 는 (a) 그룹키가 **9축** fp 이고 (b) route 명이
 * `cutaneous` 이며 (c) 그룹마다 `v2Fp` 를 SSOT 에 들고 있다. 본 승인 SSOT 는 (a) **10축**
 * safetyFp, (b) route 명 `topical`, (c) v2Fp 미보유다. 산식·계약이 다르므로 **공용 러너와
 * 기존 어댑터는 수정하지 않고**(계약 불변) 본 트랙 전용 어댑터를 둔다.
 * 재사용하는 것은 공용 러너의 **원시 함수**(officialAxes·composeKo·renderEn·fetchTargetState·
 * buildGroupKo·fpToUuidV2)와 **write 계약**(KO 4T + EN 2T · INSERT-only · 단일 TX · 사후검증 rollback)이다.
 *
 * ⚠️ DB write 0 (본 파일은 순수 계약·로더).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  NONORAL_REWRITE, ORAL_VERB_RE, EN_ORAL_VERB_RE, normalize,
  type RouteProfile, type V2Group,
} from './otc-v2-store-leaflet-runner.shared.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

export const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
export const SSOT_PATH = path.join(DATA_DIR, 'otc-unproduced-nonoral-unit1-approved-ssot-v1.json');
export const ORDER_PATH = path.join(DATA_DIR, 'otc-unproduced-nonoral-unit1-execution-order-v1.json');
export const EN_PATH = path.join(DATA_DIR, 'otc-unproduced-nonoral-unit1-en.na.json');
export const APPROVAL_COMMIT = '4f188953d';
export const WO_PROD = 'WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-PRODUCTION-READINESS-AND-EN-V1';
export const TRACK = 'nonoral-unit-1';
export const AUTHORED_SOURCE = 'mfds_drug_otc';

/** WO 확정 대상 — 실측과 불일치하면 즉시 중지. */
export const EXPECTED = { fp: 70, master: 443, ko: 1772, en: 886, write: 2658 } as const;
export const EXPECTED_ROUTES: Record<string, number> = { topical: 390, oromucosal: 32, vaginal: 21 };

/**
 * 본 트랙 전용 route 프로파일 — WO 표현 규정을 그대로 반영한다.
 * 공용 `ROUTE_PROFILE` 은 건드리지 않는다(V2 계약 불변). 경구 동사는 어떤 경로에도 쓰지 않는다.
 */
const nonOral = (enLabel: string): RouteProfile => ({
  koUsageLabel: '사용 안내', enUsageLabel: enLabel,
  koVerbRewrite: NONORAL_REWRITE, koForbidden: ORAL_VERB_RE, enForbidden: EN_ORAL_VERB_RE,
});
export const UNIT1_ROUTE_PROFILE: Record<string, RouteProfile> = {
  topical: nonOral('How to apply it to the affected area'),
  oromucosal: {
    ...nonOral('How to use it in the mouth or throat according to the official directions'),
    // 구강 경로는 '삼키지 마십시오' 같은 지시가 정보이므로 EN 금지어에서 swallow 를 통째로 막지 않는다.
    enForbidden: [/\btake\b/gi, /\btaken\b/gi, /\borally\b/gi, /\bby mouth\b/gi],
  },
  vaginal: nonOral('How to insert or use it vaginally'),
};
export const UNIT1_ROUTES = Object.keys(UNIT1_ROUTE_PROFILE);

// ── 10축 안전지문 재현기 — 승인 SSOT 빌더 VERBATIM ───────────────────────────────
export function numericTokensKo(s: string): string[] {
  return [...new Set((normalize(s).match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|그램|정|캡슐|매|포|회|시간|일|주|개월|mL|밀리리터|㎖|L|리터|IU|%)/gi) || [])
    .map((x) => x.replace(/\s+/g, '').toLowerCase()))].sort();
}
export function ageTokensKo(s: string): string[] {
  return [...new Set((normalize(s).match(/(만\s?)?\d+\s*(세|개월)\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인|임부|수유부/g) || [])
    .map((x) => x.replace(/\s+/g, '')))].sort();
}
export function durationTokensKo(s: string): string[] {
  return [...new Set((normalize(s).match(/\d+\s*(주|일|개월|회|분|초)\s*(이상|이내|정도|간|연속)?/g) || [])
    .map((x) => x.replace(/\s+/g, '')))].sort();
}
export function contraSigKo(caution: string): string {
  const t = normalize(caution);
  const m = t.match(/(.*?)(복용하지\s?(마|않)|사용하지\s?(마|않)|투여하지\s?(마|말)|바르지\s?(마|않)|사용해서는\s?안|복용해서는\s?안)/);
  return H(normalize(m ? m[1] : t.slice(0, 240)));
}
/** 승인 SSOT 의 그룹키. 축 순서까지 빌더와 동일해야 재현된다. */
export function tenAxisFp(ind: string, dos: string, cau: string, gencode: string, suffix: string, route: string): string {
  const axes = [
    H(normalize(ind)), H(normalize(dos)), H(normalize(cau)),
    H(numericTokensKo(dos).join('|')), H(ageTokensKo(`${dos}\n${cau}`).join('|')),
    H(durationTokensKo(`${dos}\n${cau}`).join('|')), contraSigKo(cau),
    gencode.slice(0, 6), suffix, route,
  ];
  return H(axes.join('|'));
}

// ── 적용부위 탐지 (승인 계약 VERBATIM) ───────────────────────────────────────────
const SITE_PATTERNS: Array<{ site: string; re: RegExp }> = [
  { site: 'rectal', re: /항문|직장\s?내|직장에|관장/ },
  { site: 'vaginal', re: /질\s?내|질강|질에|질세정|질\s?점막/ },
  { site: 'oromucosal', re: /구강|입\s?안|양치|가글|함수|인후|인두|목구멍|헹구|씹어|잇몸/ },
  { site: 'ophthalmic', re: /결막낭|눈에|안구|점안/ },
  { site: 'nasal', re: /비강|콧\s?속|코\s?안|코에/ },
  { site: 'otic', re: /귀\s?안|귓\s?속|외이도/ },
  { site: 'cutaneous', re: /피부|환부|患部|상처\s?부위|도포|바른다|바르고|바를|문지르|씻어\s?낸다|씻어\s?내고|소독한다|소독하여|닦아\s?낸다|국소\s?부위/ },
];
export const detectSites = (text: string): string[] => {
  const t = normalize(text);
  return [...new Set(SITE_PATTERNS.filter((p) => p.re.test(t)).map((p) => p.site))].sort();
};
/** site 탐지명 → 승인 SSOT route 명 */
export const SITE_TO_ROUTE: Record<string, string> = {
  cutaneous: 'topical', oromucosal: 'oromucosal', vaginal: 'vaginal',
  ophthalmic: 'ophthalmic', nasal: 'nasal', rectal: 'rectal', otic: 'otic',
};

export interface Unit1SsotMaster {
  masterId: string; name: string; fp: string; gencode: string; suffix: string;
  route: string; form: string; officialSite: string; evidence: string;
  evidenceSection: string; indicationSites: string[]; axes: Record<string, string>;
}
export interface Unit1SsotGroup {
  fp: string; sourceRef: string; gencode: string; suffix: string;
  route: string; form: string; size: number; masterIds: string[];
}

/** 승인 SSOT 로더 — status·게이트·총계·route 합계가 하나라도 어긋나면 중지. */
export function loadUnit1Ssot(): {
  groups: V2Group[]; raw: Unit1SsotGroup[]; byMaster: Map<string, Unit1SsotMaster>; ssot: any;
} {
  const j = JSON.parse(fs.readFileSync(SSOT_PATH, 'utf8'));
  if (j.status !== 'APPROVED_FOR_PRODUCTION') throw new Error(`SSOT status=${j.status} — 생산 불가`);
  if (j.allGatesPass !== true) throw new Error('SSOT allGatesPass=false');
  if (j.totals.fingerprints !== EXPECTED.fp || j.totals.masters !== EXPECTED.master) {
    throw new Error(`SSOT 총계 ${j.totals.fingerprints}/${j.totals.masters} != ${EXPECTED.fp}/${EXPECTED.master}`);
  }
  for (const [r, n] of Object.entries(EXPECTED_ROUTES)) {
    if (j.routeTotals[r] !== n) throw new Error(`route ${r} ${j.routeTotals[r]} != ${n}`);
  }
  const raw: Unit1SsotGroup[] = j.groups;
  for (const g of raw) if (!UNIT1_ROUTE_PROFILE[g.route]) throw new Error(`미지원 route ${g.route} (fp ${g.fp})`);
  const byMaster = new Map<string, Unit1SsotMaster>((j.masters as Unit1SsotMaster[]).map((m) => [m.masterId, m]));
  // form 은 접미로 확정돼 있다 — 경로 라벨 폴백을 쓰지 않는다(없는 제형을 단정하지 않기 위해서가 아니라,
  // 확정 제형이 있으므로 그것을 그대로 쓰는 편이 정확하다).
  const groups: V2Group[] = raw.map((g) => ({
    fp: g.fp, gencode: g.gencode, route: g.route, form: g.form,
    size: g.size, masterIds: [...g.masterIds].sort(),
  })).sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));
  return { groups, raw, byMaster, ssot: j };
}

export interface Unit1EnPayload {
  fp: string; gencode: string; route: string;
  title: string; efficacy: string; usage: string; caution: string;
  summaryTable: Record<string, string>;
}
export function loadEn(): Map<string, Unit1EnPayload> {
  if (!fs.existsSync(EN_PATH)) return new Map();
  const j = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  return new Map<string, Unit1EnPayload>((j.translations as Unit1EnPayload[]).map((t) => [t.fp, t]));
}
