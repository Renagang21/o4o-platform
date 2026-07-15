/**
 * OTC 매장용 설명서 소비자 HTML 빌더 — 구조화 필드 → 시맨틱 `sd-*` HTML
 *
 * WO-O4O-OTC-CANONICAL-RENDER-SOURCE-STRUCTURED-FIELDS-V1
 *
 * 소비자 본문의 소스는 **구조화 필드뿐**이다(efficacy·usage·caution·summaryTable·ingredientSelection).
 * `bodyMarkdown` 은 원문 보존·작업 참고용이며 **여기서 읽지 않는다** — 내부 편집 주석이 들어 있어
 * 렌더 소스로 쓰면 소비자 화면에 노출된다(CR-021, CHECK-O4O-OTC-TRANSLATOR-NOTE-SEPARATION-V1).
 *
 * 출력은 `sd-*` 클래스 계약(CR-020, guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT)을 따른다.
 * `<style>`·인라인 style·임의 class 없음. 반응형·테마는 ContentRenderer variant="store-description" 담당.
 */

/** 빌더가 읽는 구조화 필드. bodyMarkdown 은 의도적으로 포함하지 않는다. */
export interface DrugOtcConsumerSource {
  summaryTable?: Record<string, string> | null;
  efficacy?: string | null;
  usage?: string | null;
  /** '복용 안내'(경구) | '사용 안내'(비경구). 투여경로 신호 — 제형명으로 추정하지 않는다(DR-019). */
  usageLabel?: string | null;
  caution?: string | null;
  ingredientSelection?: string | null;
}

export interface BuildConsumerHtmlResult {
  html: string;
  /** 비어 있는 필수 필드. 하나라도 있으면 승격하지 않는다. */
  missing: string[];
}

/** 필수 = 이것이 없으면 소비자 설명서가 성립하지 않는다. */
const REQUIRED_FIELDS = ['efficacy', 'usage', 'caution', 'summaryTable'] as const;

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 문단 내 개행 → <br>. 문단 사이 빈 줄 → 별도 <p>. */
const paragraphs = (text: string): string[] =>
  text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

const isBlank = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** summaryTable 키 → sd-item 태그 라벨. 미정의 키는 키 그대로 쓴다. */
const TAG_LABEL: Record<string, string> = {
  성분: '성분',
  분류: '분류',
  작용: '작용',
  '주요 증상': '주요 증상',
  '선택 포인트': '선택 포인트',
  '주의 대상': '주의 대상',
};

/**
 * 구조화 필드 → sd-* 소비자 HTML.
 *
 * 필수 필드가 비어 있으면 html='' 과 missing 을 돌려준다(호출부가 승격을 중단한다).
 */
export function buildDrugOtcConsumerHtml(
  src: DrugOtcConsumerSource,
  opts: { title: string },
): BuildConsumerHtmlResult {
  const missing: string[] = [];
  for (const f of REQUIRED_FIELDS) {
    const v = src[f];
    if (f === 'summaryTable') {
      if (!v || typeof v !== 'object' || Object.keys(v as object).length === 0) missing.push(f);
    } else if (isBlank(v)) {
      missing.push(f);
    }
  }
  if (missing.length) return { html: '', missing };

  const summaryTable = src.summaryTable as Record<string, string>;
  // usageLabel = 투여경로 신호(DR-019). 없으면 제형명으로 추정하지 않고 중립 표기.
  const usageHeading = src.usageLabel && src.usageLabel.trim() ? src.usageLabel.trim() : '사용 안내';

  const out: string[] = [];
  out.push('<div class="sd-card">');

  // ── hero: 제목 + 분류/작용 배지 ──
  out.push('  <div class="sd-hero">');
  const badges: string[] = [];
  if (!isBlank(summaryTable['분류'])) {
    badges.push(`<span class="sd-badge is-solid">${esc(summaryTable['분류'])}</span>`);
  }
  if (!isBlank(summaryTable['작용'])) {
    badges.push(`<span class="sd-badge">${esc(summaryTable['작용'])}</span>`);
  }
  if (badges.length) out.push(`    <div class="sd-badges">${badges.join('')}</div>`);
  const subtitle = summaryTable['선택 포인트'];
  out.push(
    `    <h1>${esc(opts.title)}${!isBlank(subtitle) ? `<small>${esc(subtitle)}</small>` : ''}</h1>`,
  );
  if (!isBlank(summaryTable['성분'])) {
    out.push(`    <p class="sd-meta">${esc(summaryTable['성분'])}</p>`);
  }
  out.push('  </div>');

  // ── body ──
  out.push('  <div class="sd-body">');

  // 효능·효과 → sd-intro
  out.push(`    <p class="sd-intro">${paragraphs(src.efficacy as string).map(esc).join('<br>')}</p>`);

  // summaryTable → sd-core > sd-item  (표(<table>) 를 쓰지 않는다 — 디자인 GUIDE §8-E)
  const items = Object.entries(summaryTable).filter(([, v]) => !isBlank(v));
  if (items.length) {
    out.push('    <h2>한눈에 보기</h2>');
    out.push('    <div class="sd-core">');
    for (const [k, v] of items) {
      out.push('      <div class="sd-item">');
      out.push(`        <span class="sd-tag">${esc(TAG_LABEL[k] ?? k)}</span>`);
      out.push(`        <p>${esc(v)}</p>`);
      out.push('      </div>');
    }
    out.push('    </div>');
  }

  // 복용/사용 안내 → sd-intake
  out.push(`    <h2>${esc(usageHeading)}</h2>`);
  out.push(`    <p class="sd-intake">${paragraphs(src.usage as string).map(esc).join('<br>')}</p>`);

  // 주의 대상 → sd-who
  out.push('    <h2>주의 대상</h2>');
  out.push('    <ul class="sd-who">');
  for (const p of paragraphs(src.caution as string)) out.push(`      <li>${esc(p)}</li>`);
  out.push('    </ul>');

  // 성분 기준 선택 → sd-foot (선택 필드)
  if (!isBlank(src.ingredientSelection)) {
    out.push(
      `    <p class="sd-foot">${paragraphs(src.ingredientSelection as string).map(esc).join('<br>')}</p>`,
    );
  }

  out.push('  </div>');
  out.push('</div>');

  return { html: out.join('\n'), missing: [] };
}
