/**
 * WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-CONTENT-FP-V3-FINAL-READINESS-V1 — V3 전용 6섹션 composer (에이전트 가)
 *
 * ── 왜 전용 composer 인가 ──────────────────────────────────────────────────────────
 * 공용 러너의 `composeKo` 는 `officialAxes` 3축(ind/dos/cau)만 쓴다. 그 `cau` 는
 *   cau = [경고, 사용상 주의사항, 상호작용].join('\n')  → **이상반응(adverse)을 통째로 버린다.**
 * V3 content fingerprint 는 6개 공식 섹션(효능·효과 / 용법·용량 / 경고 / 사용상 주의사항 / 이상반응 /
 * 상호작용)을 **개별 정규화 해시**로 포함하므로, 산출물도 6섹션을 **하나도 누락하지 않고** 보존해야 한다.
 *
 * 따라서 공용 GREEN 파일(shared runner · 점안 profile · HTML 빌더)은 **import 만** 하고 수정하지 않으며,
 * V3 전용 composer/renderer 를 여기에 둔다. 프로즌 HTML 빌더의 본문 zone 은 3개뿐(efficacy→sd-intro,
 * usage→sd-intake, caution→ul.sd-warn)이라, **4개 안전 섹션을 caution zone 안에 고정순서 라벨 블록**
 * (【경고】/【사용상 주의사항】/【이상반응】/【상호작용】)으로 담아 어느 것도 버리지 않는다.
 *
 * ⚠️ 불변:
 *   - 공식 원문에 없는 의료 사실 생성 0 (grounding = e약은요 공식 6섹션).
 *   - 수치(방울/횟수/간격/기간/연령) 전량 보존. 경구 동사 잔존 0.
 *   - DB 미접속 · write 0 · 순수 함수.
 */
import {
  normalize,
  missingNumerics,
  missingNumericsEn,
} from './otc-v2-store-leaflet-runner.shared.js';
import {
  OPHTHALMIC_PROFILE,
  hasOphthalmicRouteEn,
  oralVerbsEn,
  missingDropCountsEn,
  missingEyeSideEn,
  missingEyeCautionEn,
} from './otc-unproduced-nonoral-unit2-ophthalmic-profile.ga.js';
import { SAFETY_SECTIONS, sixSectionsRaw } from './otc-easy-drug-ready-ophthalmic-253-v3-contract.ga.js';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import {
  buildDrugOtcEnConsumerHtml,
  type DrugOtcEnTranslation,
} from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

// ── 프로즌 toPlain 재구현 (shared 러너 비export 함수와 byte-identical) ────────────────
/** 원문 HTML 조각 → 소비자 평문. 태그 제거 + 개행 보존. shared 러너 toPlain 과 동일. */
function toPlain(htmlish: string): string {
  return htmlish
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trim()).join('\n')
    .trim();
}

/** 라벨 블록 본문은 개행을 공백으로 접어 한 문단(=하나의 <li>)로 만든다. */
const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** KO 안전 섹션 라벨. */
const KO_SAFETY_LABEL: Record<string, string> = {
  경고: '경고',
  '사용상 주의사항': '사용상 주의사항',
  이상반응: '이상반응',
  상호작용: '상호작용',
};
/** EN 안전 섹션 라벨. */
export const EN_SAFETY_LABEL: Record<string, string> = {
  경고: 'Warning',
  '사용상 주의사항': 'Precautions',
  이상반응: 'Side effects',
  상호작용: 'Interactions',
};

const PHARMACIST_LINE_KO = '이 설명서는 상담 보조용입니다. 증상이나 기존 질환, 함께 쓰는 다른 약이 있으면 매장 약사 등 전문가에게 먼저 문의하세요.';

// ════════════════════════════════════════════════════════════════════════════════
// KO composer — 6섹션 보존
// ════════════════════════════════════════════════════════════════════════════════
export interface KoV3Result {
  html: string;
  source: {
    summaryTable: Record<string, string>;
    efficacy: string; usage: string; usageLabel: string; caution: string;
  } | null;
  presentSafety: string[];
  anomalies: string[];
}

/**
 * 공식 6섹션 raw → KO 구조화 소스 + HTML. 6섹션 전부 보존.
 * @param sixRaw sixSectionsRaw(content) 결과(6개 섹션 raw HTML 조각, 누락 섹션은 '').
 */
export function composeKoV3(
  sixRaw: Record<string, string>,
  form: string,
  gencode: string,
  profiles: Record<string, any> = OPHTHALMIC_PROFILE,
): KoV3Result {
  const prof = profiles['ophthalmic'];
  const anomalies: string[] = [];
  if (!prof) return { html: '', source: null, presentSafety: [], anomalies: ['미지원 route(ophthalmic)'] };

  const rewrite = (s: string): string => {
    let out = s;
    for (const [re, to] of prof.koVerbRewrite as Array<[RegExp, string]>) out = out.replace(re, to);
    return out;
  };

  const efficacyRaw = sixRaw['효능·효과'] || '';
  const usageRaw = sixRaw['용법·용량'] || '';
  const efficacy = toPlain(efficacyRaw);
  const usage = rewrite(toPlain(usageRaw));

  // 안전 섹션 고정순서 라벨 블록 — present 섹션만, 누락 0
  const presentSafety: string[] = [];
  const blocks: string[] = [];
  for (const sec of SAFETY_SECTIONS) {
    const raw = sixRaw[sec] || '';
    if (!raw.trim()) continue;
    presentSafety.push(sec);
    const body = collapse(rewrite(toPlain(raw)));
    blocks.push(`【${KO_SAFETY_LABEL[sec]}】 ${body}`);
  }
  blocks.push(PHARMACIST_LINE_KO);
  const caution = blocks.join('\n\n');

  // 수치 보존 — 재표현 후에도 원문 수치 전량 유지
  const lostU = missingNumerics(usageRaw, usage);
  if (lostU.length) anomalies.push(`용법 수치 누락 ${lostU.length}: ${lostU.slice(0, 5).join(',')}`);
  const lostE = missingNumerics(efficacyRaw, efficacy);
  if (lostE.length) anomalies.push(`효능 수치 누락 ${lostE.length}: ${lostE.slice(0, 5).join(',')}`);

  // 경구 동사 게이트 — 용법·주의 모두
  for (const re of prof.koForbidden as RegExp[]) {
    re.lastIndex = 0;
    if (re.test(usage)) anomalies.push(`점안 용법에 경구 동사 잔존: ${re.source}`);
    re.lastIndex = 0;
    if (re.test(caution)) anomalies.push(`점안 주의에 경구 동사 잔존: ${re.source}`);
  }

  // 6섹션 보존 게이트 — present 안전 섹션 본문이 caution 에 전량 남아야 한다
  const normCaution = normalize(caution);
  for (const sec of presentSafety) {
    const body = normalize(rewrite(toPlain(sixRaw[sec])));
    if (body && !normCaution.includes(body)) anomalies.push(`안전 섹션 미보존: ${sec}`);
  }
  // 효능·용법 보존
  if (efficacy && !normalize(efficacy).length) anomalies.push('효능 정규화 후 공란');
  if (!efficacy) anomalies.push('효능 공란');
  if (!usage) anomalies.push('용법 공란');

  const summaryTable: Record<string, string> = {
    분류: `일반의약품 · ${form}`,
    작용: efficacy.split('\n')[0]?.slice(0, 120) || '',
    '선택 포인트': `동일 일반명코드(${gencode}) 제품은 성분·함량·제형이 같습니다. 제품명이 아니라 성분과 함량으로 확인하세요.`,
    '주의 대상': '아래 주의사항 대상에 해당하면 매장 약사에게 먼저 문의하세요.',
  };
  for (const k of Object.keys(summaryTable)) if (!summaryTable[k]) delete summaryTable[k];

  const source = { summaryTable, efficacy, usage, usageLabel: prof.koUsageLabel as string, caution };
  const built = buildDrugOtcConsumerHtml(source as never, { title: `${form} (${gencode})` });
  if (built.missing.length) anomalies.push(`KO 필수필드 누락 ${built.missing.join(',')}`);
  if (built.html.includes('<table') || built.html.includes('<!--')) anomalies.push('KO html 계약 위반');

  return { html: built.html, source, presentSafety, anomalies };
}

// ════════════════════════════════════════════════════════════════════════════════
// EN renderer — 6섹션 보존 + 점안 경로/수치 게이트
// ════════════════════════════════════════════════════════════════════════════════
/** 저작자가 채우는 EN 페이로드(fp 당 1건). usageLabel 은 프로파일에서 주입하므로 없다. caution 은 안전 섹션 맵. */
export interface EnV3Payload {
  fp: string;
  title: string;
  efficacy: string;
  usage: string;
  summaryTable: Record<string, string>;
  /** 안전 섹션별 영문 — KO present 섹션과 1:1 이어야 한다. */
  safety: Partial<Record<'경고' | '사용상 주의사항' | '이상반응' | '상호작용', string>>;
}

export interface EnV3Result { html: string; caution: string; anomalies: string[] }

const HANGUL_RE = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

/**
 * 저작 EN 페이로드 + 공식 6섹션 raw → EN HTML + 검증.
 * @param sixRaw 동일 fp 대표 원문의 sixSectionsRaw (present 안전 섹션 판정·수치/축 grounding).
 */
export function renderEnV3(
  p: EnV3Payload,
  sixRaw: Record<string, string>,
  profiles: Record<string, any> = OPHTHALMIC_PROFILE,
): EnV3Result {
  const prof = profiles['ophthalmic'];
  const anomalies: string[] = [];
  if (!prof) return { html: '', caution: '', anomalies: ['미지원 route(ophthalmic)'] };

  const presentSafety = SAFETY_SECTIONS.filter((s) => (sixRaw[s] || '').trim());

  // 안전 섹션 1:1 — present 섹션은 전부 채워야 하고, 없는 섹션을 채우면 안 된다
  for (const sec of presentSafety) {
    if (!p.safety[sec] || !p.safety[sec]!.trim()) anomalies.push(`EN 안전 섹션 누락: ${sec}`);
  }
  for (const sec of Object.keys(p.safety)) {
    if (!(presentSafety as readonly string[]).includes(sec)) anomalies.push(`EN 안전 섹션 잉여(원문에 없음): ${sec}`);
  }

  // caution = 고정순서 라벨 블록 조립
  const cautionBlocks: string[] = [];
  for (const sec of presentSafety) {
    const en = (p.safety[sec] || '').trim();
    if (en) cautionBlocks.push(`${EN_SAFETY_LABEL[sec]}: ${en}`);
  }
  const caution = cautionBlocks.join(' ');

  const payload: DrugOtcEnTranslation = {
    groupKey: p.fp,
    title: p.title,
    usageLabel: prof.enUsageLabel,
    efficacy: p.efficacy,
    usage: p.usage,
    caution,
    summaryTable: p.summaryTable,
  };
  const built = buildDrugOtcEnConsumerHtml(payload);
  if (built.missing.length) anomalies.push(`EN 필수필드 누락 ${built.missing.join(',')}`);
  if (built.html && HANGUL_RE.test(built.html)) anomalies.push('EN 한글 잔존');

  const fullText = `${p.usage} ${caution}`;
  // 경구 동사 게이트
  const oralHits = oralVerbsEn(fullText);
  if (oralHits.length) anomalies.push(`EN 경구 동사 잔존: ${oralHits.join(',')}`);
  // 점안 경로 표현 필수(용법)
  if (!hasOphthalmicRouteEn(p.usage)) anomalies.push('EN 용법에 점안 경로 표현 없음');

  const usageRaw = sixRaw['용법·용량'] || '';
  // 수치 보존(수량) + 방울 수
  const lostNum = missingNumericsEn(usageRaw, p.usage);
  if (lostNum.length) anomalies.push(`EN 용법 수량 누락 ${lostNum.length}: ${lostNum.slice(0, 5).join(',')}`);
  const lostDrop = missingDropCountsEn(usageRaw, p.usage);
  if (lostDrop.length) anomalies.push(`EN 방울 수 누락: ${lostDrop.join(',')}`);
  // 한쪽/양쪽 눈 축(용법)
  const eyeSide = missingEyeSideEn(usageRaw, p.usage);
  if (eyeSide.missing.length) anomalies.push(`EN 눈 적용부위 축 누락: ${eyeSide.missing.join(',')}`);
  // 점안 고유 주의 축(콘택트렌즈·용기 끝·점안 간격) — 공식 주의/이상반응/상호작용 결합 대비
  const officialCautionCombined = [sixRaw['경고'], sixRaw['사용상 주의사항'], sixRaw['이상반응'], sixRaw['상호작용']]
    .filter(Boolean).map((s) => toPlain(s)).join('\n');
  const eyeCaution = missingEyeCautionEn(officialCautionCombined, fullText);
  if (eyeCaution.missing.length) anomalies.push(`EN 점안 주의 축 누락: ${eyeCaution.missing.join(',')}`);

  return { html: built.html, caution, anomalies };
}

// ── 오프라인 selftest ────────────────────────────────────────────────────────────
function selfTest(): void {
  const fail: string[] = [];
  const FIX = (o: Record<string, string>): string =>
    Object.entries(o).map(([k, v]) => `<p><strong>${k}</strong><br/>${v}</p>`).join('');

  // 6섹션 전부 present — 이상반응·상호작용 포함 보존 확인
  const content = FIX({
    '효능·효과': '이 약은 눈의 피로 완화에 사용합니다.',
    '용법·용량': '1회 1~2방울씩 1일 3회 양쪽 눈에 점안합니다.',
    경고: '눈의 통증이 있으면 사용을 중단하고 의사와 상의하십시오.',
    '사용상 주의사항': '콘택트렌즈를 착용한 경우 렌즈를 뺀 뒤 점안하십시오. 다른 약을 복용 중인 경우 의사와 상의하십시오.',
    이상반응: '드물게 눈의 자극감,충혈이 나타날 수 있습니다.',
    상호작용: '다른 점안제와 동시에 사용할 경우 최소 15분의 간격을 두고 점안하십시오.',
  });
  const six = sixSectionsRaw(content);
  const ko = composeKoV3(six, '점안액', 'D05200COS');
  if (ko.anomalies.length) fail.push(`KO 이상 발생: ${ko.anomalies.join(' | ')}`);
  if (ko.presentSafety.length !== 4) fail.push(`present 안전 섹션 ${ko.presentSafety.length} != 4`);
  for (const label of ['【경고】', '【사용상 주의사항】', '【이상반응】', '【상호작용】']) {
    if (!ko.source!.caution.includes(label)) fail.push(`KO caution 라벨 누락 ${label}`);
  }
  // 이상반응이 실제로 보존됐는가(공용 composeKo 가 버리던 섹션)
  if (!normalize(ko.source!.caution).includes(normalize('드물게 눈의 자극감,충혈이 나타날 수 있습니다.')))
    fail.push('이상반응 본문 미보존');
  // 주의사항의 "다른 약을 복용" 은 경구약 복용을 가리키므로 '사용' 으로 재표현됨 → 경구 동사 게이트 통과해야 함
  if (ko.anomalies.some((a) => /경구 동사/.test(a))) fail.push('경구 동사 게이트 오작동(복용→사용 재표현 실패)');
  // 방울/횟수 보존
  for (const tok of ['1~2방울', '3회']) {
    if (!ko.source!.usage.replace(/\s+/g, '').includes(tok.replace(/\s+/g, ''))) fail.push(`KO 용법 수치 누락 ${tok}`);
  }

  // EN — 안전 섹션 1:1 · 점안 경로 · 방울 · 눈 축 · 렌즈/간격
  const enOk = renderEnV3({
    fp: 'testfp',
    title: 'Eye drops (D05200COS)',
    efficacy: 'For the relief of eye fatigue.',
    usage: 'Instil 1 to 2 drops into both eyes 3 times a day.',
    summaryTable: { Category: 'OTC · Eye drops' },
    safety: {
      경고: 'If you have eye pain, stop use and consult a doctor.',
      '사용상 주의사항': 'If you wear contact lenses, remove them before instilling. If you are using other medicines, consult a doctor.',
      이상반응: 'Rarely, eye irritation or redness may occur.',
      상호작용: 'If used with other eye drops, wait at least 15 minutes between them.',
    },
  }, six);
  if (enOk.anomalies.length) fail.push(`EN 이상 발생: ${enOk.anomalies.join(' | ')}`);
  if (HANGUL_RE.test(enOk.html)) fail.push('EN 한글 잔존');

  // EN 안전 섹션 누락 → 반드시 FAIL
  const enMissing = renderEnV3({
    fp: 'x', title: 'Eye drops (D05200COS)',
    efficacy: 'For eye fatigue.',
    usage: 'Instil 1 to 2 drops into both eyes 3 times a day.',
    summaryTable: { Category: 'OTC' },
    safety: { 경고: 'Stop if pain.', '사용상 주의사항': 'Remove contact lenses first.', 이상반응: 'Irritation.' }, // 상호작용 누락
  }, six);
  if (!enMissing.anomalies.some((a) => /상호작용/.test(a))) fail.push('EN 안전 섹션 누락 게이트 미작동');

  // EN 경구 동사 → FAIL
  const enOral = renderEnV3({
    fp: 'x', title: 'Eye drops (D05200COS)',
    efficacy: 'For eye fatigue.',
    usage: 'Take 1 to 2 drops into both eyes 3 times a day.', // take = 경구
    summaryTable: { Category: 'OTC' },
    safety: {
      경고: 'Stop if pain.', '사용상 주의사항': 'Remove contact lenses first.',
      이상반응: 'Irritation.', 상호작용: 'Wait 15 minutes between other eye drops.',
    },
  }, six);
  if (!enOral.anomalies.some((a) => /경구 동사/.test(a))) fail.push('EN 경구 동사 게이트 미작동');

  if (fail.length) {
    console.error('SELFTEST FAIL:\n' + fail.map((f) => '  - ' + f).join('\n'));
    process.exit(1);
  }
  console.log('composer selftest OK (6섹션 보존 · 이상반응 보존 · EN 1:1/경구/점안 게이트)');
}

if (process.argv.includes('--selftest')) selfTest();
