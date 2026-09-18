/**
 * storeContentAuthoringPrompt — 내 매장 콘텐츠 외부 LLM 작업 Prompt 조립 (순수 함수)
 *
 * WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1 §6~§13
 *
 * 원칙:
 *   - 외부 AI(ChatGPT 등, 사용자 자신의 계정)가 콘텐츠를 만들고, O4O 는 작업 Context·Prompt·편집·저장을 제공한다.
 *   - Prompt = Task + Source Context + Output Contract. 화면마다 문구를 하드코딩하지 않는다.
 *   - Source Context 는 **현재 화면에 이미 있는 데이터만** 쓴다(제목·현재 HTML·원본 제목·출처·제품명·추가 요청).
 *     제품명만으로 효능·성분을 추측해 넣지 않는다. 회원·고객·주문·매출 등 개인정보·거래 정보는 넣지 않는다.
 *   - API 호출 · React · auth · router 의존 없음. store-ui-core 제로-의존 원칙 유지.
 *   - Task V1 = create | revise. POP/QR/Blog/상품설명 전용 task 는 후속 WO 3 에서 같은 구조에 추가한다.
 */

export type StoreContentLlmTask = 'create' | 'revise';

export interface StoreContentLlmContext {
  task: StoreContentLlmTask;

  /** 콘텐츠 제목(입력된 경우) */
  title?: string | null;
  /** 현재 편집기 HTML (revise 의 본문 · create 에서 이미 쓴 내용이 있으면 참고로 첨부) */
  currentHtml?: string | null;

  /** 가져온 원본/사본의 제목 */
  sourceTitle?: string | null;
  /** 원본 출처 식별자(snapshot | direct | content-hub | production-copy | store 등). 사람이 읽을 라벨로 변환해 넣는다 */
  sourceOrigin?: string | null;

  /** 관련 제품명(이름만 — 사실정보를 추측해 넣지 않는다) */
  productName?: string | null;

  /** 사용자가 복사 직전에 적은 짧은 추가 요청 */
  additionalInstruction?: string | null;
}

/** Store 대표 UX 라벨(§5). 공통 capability 자체는 provider-neutral. */
export const STORE_LLM_ASSIST_LABEL = 'ChatGPT로 작업';

/** 편집기 초기값 '<p></p>' 등 실질적으로 빈 HTML 인지 */
export function isBlankStoreHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  const stripped = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return stripped === '';
}

/** §16 권장 기본: 본문 없음 → create, 본문 있음 → revise */
export function resolveStoreContentLlmTask(currentHtml: string | null | undefined): StoreContentLlmTask {
  return isBlankStoreHtml(currentHtml) ? 'create' : 'revise';
}

const ORIGIN_LABELS: Record<string, string> = {
  snapshot: '커뮤니티에서 가져온 콘텐츠',
  direct: '매장에서 직접 작성한 콘텐츠',
  store: '매장 편집본',
  'content-hub': '운영자 콘텐츠',
  'production-copy': '내 제작자료 복제본',
  library: '자료함',
};

function originLabel(origin: string): string {
  return ORIGIN_LABELS[origin] ?? origin;
}

/** §10 Output Contract — 공통 */
const OUTPUT_CONTRACT_LINES = [
  '설명·인사말 없이 HTML 만 반환해 주세요.',
  '주어진 내용에 없는 사실을 새로 만들지 마세요. 확인되지 않은 사실은 단정하지 마세요.',
  '제목·본문 구조를 읽기 쉽게 정리해 주세요(소제목 h2/h3, 문단 p, 목록 ul/ol 등).',
  'O4O 편집기에 그대로 넣을 수 있는 일반 HTML 만 사용하세요(p, h2, h3, strong, em, ul, ol, li, br, a, table, img 정도).',
  '꾸미기가 필요하면 태그 안 style 속성(인라인 CSS)만 사용하세요.',
  'script, iframe, 외부 CSS 파일, 외부 폰트, 외부 스크립트는 사용하지 마세요(저장 시 자동 제거됩니다).',
];

/** §10 건강·의약품 관련 원천 포함 시 추가 */
const HEALTH_CONTRACT_LINES = [
  '원문에 없는 효능·효과·질병 치료·예방 표현을 추가하지 마세요.',
  '제품의 성분·효능 같은 사실정보를 추측해서 쓰지 마세요.',
  '증상이 있으면 약사 등 전문가와 상담하라는 안내 톤을 유지하세요.',
];

const HEALTH_HINT = /약|의약|건강|증상|복용|효능|효과|영양|질환|질병|치료|예방|영양제|건기식|피부|화장품/;

function looksHealthRelated(ctx: StoreContentLlmContext): boolean {
  const text = [ctx.title, ctx.sourceTitle, ctx.productName, ctx.currentHtml].filter(Boolean).join('\n');
  return HEALTH_HINT.test(text);
}

function clean(v: string | null | undefined): string {
  return (v ?? '').trim();
}

/**
 * Store 콘텐츠 작업 Prompt 를 만든다. 결과는 사용자가 자기 ChatGPT 등 대화창에 붙여 넣는 텍스트다.
 * O4O 는 이 텍스트를 저장하지 않는다(§30).
 */
export function buildStoreContentAuthoringPrompt(ctx: StoreContentLlmContext): string {
  const title = clean(ctx.title);
  const currentHtml = isBlankStoreHtml(ctx.currentHtml) ? '' : clean(ctx.currentHtml);
  const sourceTitle = clean(ctx.sourceTitle);
  const sourceOrigin = clean(ctx.sourceOrigin);
  const productName = clean(ctx.productName);
  const extra = clean(ctx.additionalInstruction);

  const lines: string[] = [];

  // ── Task ──
  if (ctx.task === 'revise') {
    lines.push('아래 O4O 매장 콘텐츠를 수정·다듬어 주세요.');
    lines.push('');
    lines.push('[작업]');
    lines.push('- 현재 본문의 사실과 의미는 그대로 유지하면서 문장·구조·가독성을 개선해 주세요.');
    lines.push('- 기존 사실을 바꾸거나 새로운 사실을 추가하지 마세요.');
  } else {
    lines.push('O4O 매장에서 손님에게 보여줄 새 콘텐츠를 HTML 로 작성해 주세요.');
    lines.push('');
    lines.push('[작업]');
    lines.push('- 아래 참고 정보만을 바탕으로 새 매장 콘텐츠를 작성해 주세요.');
    lines.push('- 참고 정보가 부족한 부분은 지어내지 말고, 일반적인 안내 수준으로만 쓰거나 비워 두세요.');
  }

  // ── Source Context ──
  const ctxLines: string[] = [];
  if (title) ctxLines.push(`- 콘텐츠 제목: ${title}`);
  if (sourceTitle) ctxLines.push(`- 원본 제목: ${sourceTitle}`);
  if (sourceOrigin) ctxLines.push(`- 출처: ${originLabel(sourceOrigin)}`);
  if (productName) ctxLines.push(`- 관련 제품: ${productName} (제품명만 참고하고, 성분·효능 등은 추측하지 마세요)`);
  if (ctxLines.length > 0) {
    lines.push('');
    lines.push('[참고 정보]');
    lines.push(...ctxLines);
  }

  // ── 추가 요청 ──
  if (extra) {
    lines.push('');
    lines.push('[추가 요청]');
    lines.push(extra);
  }

  // ── Output Contract ──
  lines.push('');
  lines.push('[결과 조건]');
  for (const l of OUTPUT_CONTRACT_LINES) lines.push(`- ${l}`);
  if (looksHealthRelated(ctx)) {
    for (const l of HEALTH_CONTRACT_LINES) lines.push(`- ${l}`);
  }

  // ── 본문 ──
  if (currentHtml) {
    lines.push('');
    lines.push(ctx.task === 'revise' ? '[현재 본문 HTML]' : '[이미 작성한 내용 HTML — 참고]');
    lines.push(currentHtml);
  }

  return lines.join('\n');
}
