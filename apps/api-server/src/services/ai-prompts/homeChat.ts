/**
 * O4O Home AI Chat — prompt / validation (pure)
 *
 * WO-O4O-COMMON-HOME-AI-INPUT-V0
 *
 * O4O 공통 Home 중앙 입력창의 **텍스트 질의응답 전용** 계층이다.
 * DB·네트워크에 의존하지 않는 순수 함수만 둔다(테스트 가능).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 범위 (V0)
 *
 *   TEXT RESPONSE ONLY. tool/function calling 없음, 실행 없음, 저장 없음.
 *   AI 는 매장 데이터를 조회하지 않으며, WorkScope 에 없는 권한을 주장하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 신뢰 경계
 *
 *   system prompt 는 **서버가 재검증한 사실**로만 만든다.
 *   클라이언트가 보낸 organizationId/storeId 는 프롬프트에 넣지 않는다 —
 *   "매장이 확정되었는가" 라는 **불리언 사실**만 반영한다.
 *   식별자 자체를 프롬프트에 넣지 않으므로 LLM 응답으로 식별자가 새어나갈 수 없다.
 */

// ─── 입력 검증 ───────────────────────────────────────────────────────────────

/**
 * 최대 입력 길이.
 *
 * 기존 API 정책 우선(§23): `POST /api/ai/query` 의 question 상한이 2000자이므로
 * 같은 값을 쓴다. 플랫폼 안에서 자유질의 상한이 화면마다 다르면 안 된다.
 */
export const HOME_CHAT_MAX_MESSAGE_LENGTH = 2000;

export type HomeChatValidationError = 'EMPTY_MESSAGE' | 'MESSAGE_TOO_LONG' | 'INVALID_MESSAGE';

export interface HomeChatValidationResult {
  ok: boolean;
  message?: string;
  error?: HomeChatValidationError;
}

/** 사용자 입력 검증. 공백만 있는 입력은 빈 입력으로 본다. */
export function validateHomeChatMessage(raw: unknown): HomeChatValidationResult {
  if (typeof raw !== 'string') return { ok: false, error: 'INVALID_MESSAGE' };
  const message = raw.trim();
  if (message.length === 0) return { ok: false, error: 'EMPTY_MESSAGE' };
  if (message.length > HOME_CHAT_MAX_MESSAGE_LENGTH) return { ok: false, error: 'MESSAGE_TOO_LONG' };
  return { ok: true, message };
}

// ─── 검증된 scope ────────────────────────────────────────────────────────────

/**
 * **서버가 확정한** scope 사실. 클라이언트 payload 가 아니다.
 *
 * 식별자를 담지 않는다 — 프롬프트에 넣을 이유가 없고, 넣지 않으면 새어나갈 수도 없다.
 */
export interface VerifiedScopeFacts {
  /** canonical service_memberships.service_key. 검증 실패 시 undefined. */
  serviceKey?: string;
  /** route 에서 파생된 업무 축. */
  workspace: string;
  /** 서버 store resolution 결과. store 축이 아니면 undefined. */
  storeStatus?: 'resolved' | 'none' | 'ambiguous';
  /** WorkScope capabilities (서술용 — 실행 권한이 아니다). */
  capabilities: string[];
}

const WORKSPACE_LABEL: Record<string, string> = {
  home: 'O4O 공통 홈',
  community: '커뮤니티',
  store: '매장 업무 공간',
  supplier: '공급자 업무 공간',
  partner: '파트너 업무 공간',
  operator: '운영자 업무 공간',
  admin: '관리자 업무 공간',
};

/**
 * system prompt 구성 (§16).
 *
 * O4O 내부 구조를 과도하게 싣지 않는다 — workspace / service / 매장 확정 여부 /
 * capability 요약까지만. 프롬프트 인젝션 방지를 위해 사용자 입력은 여기 넣지 않는다
 * (user prompt 로 분리).
 */
export function buildHomeChatSystemPrompt(facts: VerifiedScopeFacts): string {
  const lines: string[] = [
    '당신은 O4O 플랫폼의 업무 보조 AI 입니다.',
    'O4O 는 공급자·운영사업자·매장을 잇는 플랫폼이며, 사용자는 약국·화장품 매장 등의 실무자입니다.',
    '',
    '## 현재 사용자의 작업 컨텍스트',
    `- 업무 공간: ${WORKSPACE_LABEL[facts.workspace] ?? facts.workspace}`,
  ];

  if (facts.serviceKey) {
    lines.push(`- 서비스: ${facts.serviceKey}`);
  } else {
    lines.push('- 서비스: 확정되지 않음');
  }

  switch (facts.storeStatus) {
    case 'resolved':
      lines.push('- 매장 컨텍스트: 확정됨 (다만 이번 대화에서 매장 데이터를 조회하지는 않습니다)');
      break;
    case 'ambiguous':
      lines.push(
        '- 매장 컨텍스트: 접근 가능한 매장이 여러 개여서 확정되지 않음. ' +
          '매장별 작업을 요청받으면 먼저 어떤 매장인지 확인해야 한다고 안내하세요.',
      );
      break;
    case 'none':
      lines.push('- 매장 컨텍스트: 없음. 매장이 특정되지 않은 일반 질문으로 답하세요.');
      break;
    default:
      lines.push('- 매장 컨텍스트: 해당 없음 (매장 업무 공간이 아닙니다)');
  }

  if (facts.capabilities.length > 0) {
    lines.push(`- 참고 가능 범위: ${facts.capabilities.join(', ')}`);
  }

  lines.push(
    '',
    '## 반드시 지킬 것',
    '- 당신은 **답변만** 합니다. 어떤 작업도 실행하지 않습니다.',
    '- 매장 데이터·주문·재고·고객 정보를 조회할 수 없습니다. 조회를 요청받으면 ' +
      '"현재는 매장 데이터를 직접 조회하지 않습니다" 라고 알리고, 대신 방법을 설명하세요.',
    '- 파일·브라우저·외부 시스템·POS·약국 프로그램을 조작할 수 없습니다.',
    '- 위 컨텍스트에 없는 권한이나 데이터 접근을 가진 것처럼 말하지 마세요.',
    '- 확실하지 않으면 추측하지 말고 모른다고 하세요.',
    '- 의약품 관련 질문에서는 공식 허가사항에 없는 의료 사실을 지어내지 말고, ' +
      '매장 내 약사 등 전문가 상담을 안내하세요.',
    '',
    '한국어로, 실무자가 바로 쓸 수 있게 간결하고 구체적으로 답하세요.',
  );

  return lines.join('\n');
}

/** user prompt — 사용자 입력을 그대로 전달한다(가공하지 않는다). */
export function buildHomeChatUserPrompt(message: string): string {
  return message;
}

// ─── 응답 / 오류 ─────────────────────────────────────────────────────────────

/**
 * free-text 응답 정리.
 *
 * `responseMode: 'text'` 를 쓰므로 본문은 평문이다. 다만 모델이 JSON 을 뱉는
 * 경우(정책상 provider 가 바뀌는 등)를 대비해 `{"answer": ...}` 형태면 풀어서 쓴다.
 */
export function extractHomeChatAnswer(content: string): string {
  const text = (content ?? '').trim();
  if (!text) return '';
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      const candidate =
        (parsed && (parsed.answer ?? parsed.message ?? parsed.content ?? parsed.text)) ?? null;
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    } catch {
      // JSON 이 아니면 평문 그대로 쓴다.
    }
  }
  return text;
}

export type HomeChatErrorCode =
  | 'UNAUTHENTICATED'
  | 'EMPTY_MESSAGE'
  | 'MESSAGE_TOO_LONG'
  | 'INVALID_MESSAGE'
  | 'AI_UNAVAILABLE'
  | 'AI_ERROR';

/**
 * provider 오류를 **사용자에게 보여줄 수 있는 형태로만** 축약한다 (§22).
 *
 * provider 이름 · 모델명 · API key · 원문 스택 · 상태코드 세부는 응답에 싣지 않는다.
 * 진단은 서버 로그에만 남긴다.
 */
export function sanitizeHomeChatError(error: unknown): { code: HomeChatErrorCode; message: string } {
  const raw = typeof (error as { message?: unknown })?.message === 'string'
    ? ((error as { message: string }).message)
    : '';

  // 키 미설정·인증 실패는 "일시적 오류" 가 아니라 설정 문제지만,
  // 사용자에게는 동일하게 일반 문구로만 알린다(내부 사정 비노출).
  if (/api key|apikey|unauthorized|401|permission/i.test(raw)) {
    return { code: 'AI_UNAVAILABLE', message: 'AI 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.' };
  }
  return { code: 'AI_ERROR', message: '응답을 생성하지 못했습니다. 다시 시도해 주세요.' };
}

/** 검증 오류 → 사용자 문구. */
export function homeChatValidationMessage(code: HomeChatValidationError): string {
  switch (code) {
    case 'EMPTY_MESSAGE':
      return '질문을 입력해 주세요.';
    case 'MESSAGE_TOO_LONG':
      return `질문은 ${HOME_CHAT_MAX_MESSAGE_LENGTH}자 이내로 입력해 주세요.`;
    default:
      return '요청 형식이 올바르지 않습니다.';
  }
}
