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
 *   - Task V1 = create | revise (WO 2).
 *   - Task V2 = blog | pop | qr | product-description | translate (WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 §6~§13).
 *     목적별 task 도 같은 빌더 하나가 조립한다 — 화면별 Prompt Builder · Prompt 전문 복사본을 만들지 않는다(§34).
 *     currentHtml 이 있으면 "재구성/다듬기", 없으면 "새로 작성" 으로 같은 task 안에서 분기한다.
 */

export type StoreContentLlmTask =
  | 'create'
  | 'revise'
  | 'blog'
  | 'pop'
  | 'qr'
  | 'product-description'
  | 'translate';

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

  // ── WO 3 additive (§7) — 현재 화면에 이미 있는 정보만 넘긴다. 빌더 안에서 API 를 부르지 않는다. ──
  /** 참고 문안(plain text) — POP 요약 · QR 강조점/코너 항목 · 상품 요약/카테고리 등 */
  referenceText?: string | null;
  /** 기준 본문 HTML — translate 의 번역 원문(defaultLocale/한국어 본문) 등 */
  referenceHtml?: string | null;
  /** translate: 기준 본문 언어 코드(ko · en · zh …) */
  sourceLocale?: string | null;
  /** translate: 결과 언어 코드 */
  targetLocale?: string | null;
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

/** translate 용 언어 라벨(다국어 화면 STORE_MLC_LOCALES 와 동일 코드). 모르는 코드는 그대로 표기 */
const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
  id: 'Bahasa Indonesia',
};

function localeLabel(code: string): string {
  return LOCALE_LABELS[code] ?? code;
}

/** §12 상품 설명 — 가장 엄격한 사실성 계약. 건강 단서와 무관하게 항상 적용 */
const PRODUCT_FACT_CONTRACT_LINES = [
  '제공된 제품 정보만 사용하세요. 제품명만 보고 성분·효능·원산지 등을 추측해 쓰지 마세요.',
  '원문에 없는 사용법·주의사항·보관법을 만들어 넣지 마세요.',
  '질병을 치료·예방한다는 표현을 추가하지 마세요.',
  '확인되지 않은 수치(함량·용량·가격·기간 등)를 만들어 넣지 마세요.',
];

/** §13 translate — 원문 사실·의미 불변 */
const TRANSLATE_CONTRACT_LINES = [
  '원문의 제품 사실을 추가하거나 빼지 마세요.',
  '숫자·단위·제품명·고유명사는 임의로 바꾸지 마세요(필요하면 원문 표기를 병기).',
  '의학·건강 관련 의미를 원문보다 강하게 표현하지 마세요.',
  '원문의 HTML 구조(소제목·문단·목록)를 유지한 채 텍스트만 바꿔 주세요.',
];

interface TaskSpec {
  /** 첫 줄 — 무엇을 만드는 작업인지 */
  intro: (hasCurrent: boolean) => string;
  /** [작업] 절 */
  work: (hasCurrent: boolean) => string[];
  /** [결과 조건] 앞부분 — 목적별 형식 조건 */
  result: string[];
}

/** §9~§13 목적별 task 명세. create/revise 는 기존 분기를 그대로 둔다(WO 2 출력 불변). */
const TASK_SPECS: Record<Exclude<StoreContentLlmTask, 'create' | 'revise'>, TaskSpec> = {
  blog: {
    intro: (hasCurrent) =>
      hasCurrent
        ? '아래 O4O 매장 블로그 글을 다듬어 주세요.'
        : 'O4O 매장 블로그에 올릴 본문을 HTML 로 작성해 주세요.',
    work: (hasCurrent) =>
      hasCurrent
        ? [
            '- 현재 본문의 사실과 의미는 그대로 유지하면서 블로그 글로 읽기 좋게 문장·구조를 다듬어 주세요.',
            '- 기존 사실을 바꾸거나 새로운 사실을 추가하지 마세요.',
          ]
        : [
            '- 아래 참고 정보만을 바탕으로 매장 블로그 본문을 작성해 주세요.',
            '- 참고 정보가 부족한 부분은 지어내지 말고 일반적인 안내 수준으로만 쓰거나 비워 두세요.',
          ],
    result: [
      '본문 HTML 만 반환하세요. h1 은 사용하지 마세요(제목은 O4O 제목 입력칸에서 따로 관리합니다).',
      '도입부 → h2/h3 소제목 → 본문 → 필요한 목록 → 마무리 순서로 구성해 주세요.',
      'URL·slug·발행 상태 같은 정보는 만들지 마세요(O4O 가 관리합니다).',
    ],
  },
  pop: {
    intro: (hasCurrent) =>
      hasCurrent
        ? '아래 내용을 매장 POP 문안으로 다시 구성해 주세요.'
        : '매장에 붙일 POP 문안을 HTML 로 작성해 주세요.',
    work: (hasCurrent) =>
      hasCurrent
        ? [
            '- 현재 본문의 사실과 의미는 그대로 두고, 매장에서 짧은 시간에 읽을 수 있는 POP 문안으로 재구성해 주세요.',
            '- 기존 사실을 바꾸거나 새로운 사실을 추가하지 마세요.',
          ]
        : [
            '- 아래 참고 정보만을 바탕으로 매장에서 짧은 시간에 읽을 수 있는 POP 문안을 작성해 주세요.',
            '- 참고 정보에 없는 내용은 지어내지 마세요.',
          ],
    result: [
      '짧고 명확한 제목(h2) 1개 → 핵심 문구 1줄 → 짧은 포인트 2~5개(ul/li) → 필요하면 짧은 안내 문단 1개.',
      '장문을 쓰지 마세요. 한 화면(POP 한 장)에 들어갈 분량만 작성하세요.',
      '확인되지 않은 효능·효과·할인 조건을 만들어 넣지 마세요.',
      'POP 디자인·PDF 는 O4O 가 만듭니다. 문안만 작성하세요.',
    ],
  },
  qr: {
    intro: (hasCurrent) =>
      hasCurrent
        ? '아래 내용을 QR 스캔 안내 콘텐츠로 다듬어 주세요.'
        : 'QR 을 스캔한 손님이 휴대폰 화면에서 읽을 안내 콘텐츠를 HTML 로 작성해 주세요.',
    work: (hasCurrent) =>
      hasCurrent
        ? [
            '- 현재 본문의 사실과 의미는 그대로 두고, 휴대폰 화면에서 읽기 쉬운 짧은 안내로 다듬어 주세요.',
            '- 기존 사실을 바꾸거나 새로운 사실을 추가하지 마세요.',
          ]
        : [
            '- 아래 참고 정보만을 바탕으로 손님이 휴대폰에서 읽을 안내 콘텐츠를 작성해 주세요.',
            '- 상품명·강조점만 주어진 경우, 그 상품의 성분·효능·사용법을 추측해 쓰지 마세요. 안내 수준으로만 작성하세요.',
          ],
    result: [
      '모바일 가독성 우선: 짧은 도입 → 핵심 설명 → 필요한 항목/목록. 장문을 쓰지 마세요.',
      '코너(여러 상품)라면 상품별로 h3 소제목을 두고 각 상품은 입력된 강조점만 짧게 안내하세요.',
      'QR 주소·slug·링크는 만들지 마세요(O4O 가 QR 을 만듭니다).',
    ],
  },
  'product-description': {
    intro: (hasCurrent) =>
      hasCurrent
        ? '아래 매장 상품 상세 설명을 다듬어 주세요.'
        : '매장 손님이 읽을 상품 상세 설명을 HTML 로 작성해 주세요.',
    work: (hasCurrent) =>
      hasCurrent
        ? [
            '- 현재 설명의 사실과 의미는 그대로 유지하면서 읽기 좋게 문장·구조를 정리해 주세요.',
            '- 기존 사실을 바꾸거나 새로운 사실을 추가하지 마세요.',
          ]
        : [
            '- 아래 제공된 제품 정보만을 바탕으로 상품 상세 설명을 작성해 주세요.',
            '- 제품 정보가 부족하면 그 부분은 비워 두거나 "매장에 문의" 수준으로만 안내하세요. 지어내지 마세요.',
          ],
    result: [
      '매장 고객이 읽기 좋은 상품 상세 HTML(소제목 h2/h3 · 문단 · 목록)로 작성하세요.',
    ],
  },
  translate: {
    intro: () => '아래 매장 상품 안내 본문을 다른 언어로 옮겨 주세요.',
    work: () => [
      '- 단순 직역보다 해당 언어 사용자에게 자연스럽게 읽히도록 표현을 다듬되, 원문의 사실과 의미는 바꾸지 마세요.',
      '- 결과 언어 본문이 이미 있으면 그 표현을 참고해 다듬고, 없으면 기준 본문을 번역해 새로 작성하세요.',
    ],
    result: [],
  },
};

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

// WO 3: 상품 설명·QR 에서 제품명만 넘어오는 경우가 많아 대표 건기식 원료명을 단서에 추가(additive)
const HEALTH_HINT = /약|의약|건강|증상|복용|효능|효과|영양|질환|질병|치료|예방|영양제|건기식|피부|화장품|비타민|유산균|프로바이오틱스|홍삼|오메가|미네랄/;

function looksHealthRelated(ctx: StoreContentLlmContext): boolean {
  const text = [ctx.title, ctx.sourceTitle, ctx.productName, ctx.currentHtml, ctx.referenceText, ctx.referenceHtml]
    .filter(Boolean)
    .join('\n');
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
  const referenceText = clean(ctx.referenceText);
  const referenceHtml = isBlankStoreHtml(ctx.referenceHtml) ? '' : clean(ctx.referenceHtml);
  const sourceLocale = clean(ctx.sourceLocale);
  const targetLocale = clean(ctx.targetLocale);
  const hasCurrent = currentHtml !== '';
  const spec: TaskSpec | null =
    ctx.task === 'create' || ctx.task === 'revise' ? null : TASK_SPECS[ctx.task];

  const lines: string[] = [];

  // ── Task ──
  if (spec) {
    lines.push(spec.intro(hasCurrent));
    lines.push('');
    lines.push('[작업]');
    lines.push(...spec.work(hasCurrent));
  } else if (ctx.task === 'revise') {
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
  if (ctx.task === 'translate') {
    if (sourceLocale) ctxLines.push(`- 기준 본문 언어: ${localeLabel(sourceLocale)}`);
    if (targetLocale) ctxLines.push(`- 결과 언어: ${localeLabel(targetLocale)}`);
  }
  if (referenceText) {
    ctxLines.push('- 참고 문안(아래 내용만 사실로 사용):');
    for (const l of referenceText.split(/\r?\n/)) {
      const t = l.trim();
      if (t) ctxLines.push(`    ${t}`);
    }
  }
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
  if (spec) for (const l of spec.result) lines.push(`- ${l}`);
  if (ctx.task === 'translate') {
    if (targetLocale) lines.push(`- ${localeLabel(targetLocale)} 로만 작성하세요. 다른 언어 문장을 섞지 마세요.`);
    for (const l of TRANSLATE_CONTRACT_LINES) lines.push(`- ${l}`);
  }
  if (ctx.task === 'product-description') {
    for (const l of PRODUCT_FACT_CONTRACT_LINES) lines.push(`- ${l}`);
  }
  for (const l of OUTPUT_CONTRACT_LINES) lines.push(`- ${l}`);
  if (looksHealthRelated(ctx)) {
    for (const l of HEALTH_CONTRACT_LINES) lines.push(`- ${l}`);
  }

  // ── 기준 본문(translate 원문 등) ──
  if (referenceHtml) {
    lines.push('');
    lines.push(
      ctx.task === 'translate'
        ? `[기준 본문 HTML${sourceLocale ? ` — ${localeLabel(sourceLocale)}` : ''}]`
        : '[참고 본문 HTML]',
    );
    lines.push(referenceHtml);
  }

  // ── 본문 ──
  if (currentHtml) {
    lines.push('');
    if (ctx.task === 'translate') {
      lines.push(`[현재 ${targetLocale ? localeLabel(targetLocale) + ' ' : ''}본문 HTML — 있으면 참고해 다듬기]`);
    } else if (ctx.task === 'revise' || spec) {
      lines.push('[현재 본문 HTML]');
    } else {
      lines.push('[이미 작성한 내용 HTML — 참고]');
    }
    lines.push(currentHtml);
  }

  return lines.join('\n');
}
