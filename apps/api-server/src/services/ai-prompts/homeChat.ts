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
  /**
   * WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0: 이번 요청에서 서버가 **실제로 수행한**
   * 창 축 동작. 실행이 없었으면 undefined 이고, 아래 기본 금지 문장이 그대로 선다.
   *
   *   'inspect'  — 등재 앱이 실행 중인지 확인 (읽기)
   *   'activate' — 등재 앱 창을 앞으로 (FOREGROUND_ACTIVATION)
   *
   * 이 값을 반영하지 않으면 프롬프트가 "어떤 작업도 실행하지 않습니다" 라고
   * 단언한 채 tool 결과가 붙어, 모델이 **실제로 수행된 동작을 부인한다**.
   * 2026-09-10 프로덕션에서 실제로 그렇게 관측됐다.
   */
  windowsAppAction?: 'inspect' | 'activate';
  /**
   * BROWSER-CONTROL-V0 §17·§19·§31: 사이트 축이 실제로 수행됐을 때. 창 축과 같은 이유다 —
   * 프롬프트 기본 문장이 "브라우저를 조작할 수 없다" 인데 실제로 열었다면 모델이 부인한다.
   * 'open' 이면 로그인은 사용자가 직접 한다는 안내까지 함께 넣는다. O4O 는 로그인을 대행하지 않는다.
   */
  browserAction?: 'inspect' | 'open';
  /**
   * WO-O4O-COMPUTER-USE-V0 §38: 화면 조작 축이 실제로 수행됐을 때. 값은 tool 이름과 1:1 이다.
   * 어느 값이든 "이번 요청에서 한 일은 그 한 가지" 이고, 다음 동작은 사용자의 다음 문장이다(§30).
   */
  computerAction?: 'inspect' | 'click' | 'type_text' | 'key';
  /**
   * §32: 화면 조작 요청이었으나 실행하지 않은 이유. tool 이 선택되지 않았을 때만 설정된다.
   *   TEXT_MISSING  — 무엇을 입력할지 문장에서 찾지 못함 → 되묻는다
   *   TEXT_DENIED   — 비밀번호 · 인증번호 · 명령어 성격 → 입력하지 않는다고 안내
   *   LOGIN_REQUEST — 로그인 대행 요청 → 사용자가 직접 로그인하도록 안내
   */
  computerRequestGap?: 'TEXT_MISSING' | 'TEXT_DENIED' | 'LOGIN_REQUEST';
}

const COMPUTER_ACTION_LINE: Record<NonNullable<VerifiedScopeFacts['computerAction']>, string> = {
  inspect:
    '- 이번 요청에서 허용된 동작은 등재된 프로그램 창이 **앞에 있는지와 크기를 확인**하는 것까지입니다. ' +
    '화면 내용을 읽거나 입력하지 않았습니다.',
  click:
    '- 이번 요청에서 수행한 동작은 등재된 프로그램 창 안을 **왼쪽 클릭 한 번** 한 것입니다. ' +
    '그 밖의 입력은 하지 않았습니다.',
  type_text:
    '- 이번 요청에서 수행한 동작은 등재된 프로그램 창에 **사용자가 요청한 짧은 텍스트를 입력**한 것입니다. ' +
    '저장·전송·엔터 등 다른 동작은 하지 않았습니다.',
  key: '- 이번 요청에서 수행한 동작은 등재된 프로그램 창에 **키 하나(ENTER·TAB·ESC 중 하나)를 누른** 것입니다.',
};

const COMPUTER_GAP_LINE: Record<NonNullable<VerifiedScopeFacts['computerRequestGap']>, string> = {
  TEXT_MISSING:
    '- 사용자가 프로그램에 무언가 입력해 달라고 했지만 **무엇을 입력할지 문장에서 찾지 못해 실행하지 않았습니다.** ' +
    '입력할 내용을 따옴표로 알려 달라고 짧게 되물으세요. (예: 메모장에 "테스트"라고 써줘)',
  TEXT_DENIED:
    '- 요청한 입력 내용이 비밀번호·인증번호·명령어 성격이어서 **입력하지 않았습니다.** ' +
    'O4O 는 그런 값을 대신 입력하지 않는다고 짧게 안내하세요. 값을 되풀이하지 마세요.',
  LOGIN_REQUEST:
    '- 로그인 대행 요청이어서 **아무 동작도 하지 않았습니다.** 로그인은 사용자가 직접 하도록 안내하고, ' +
    '아이디·비밀번호·OTP 를 요구하지 마세요.',
};

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
    ...(facts.windowsAppAction
      ? [
          '- 아래 "## 프로그램 상태" 는 이 PC의 Local Work Agent가 **실제로 수행한 결과**입니다. ' +
            '사실로 삼아 그대로 안내하고, 수행하지 못했다고 말하지 마세요.',
          facts.windowsAppAction === 'activate'
            ? '- 이번 요청에서 허용된 동작은 등재된 프로그램의 **창을 앞으로 가져오는 것**까지입니다. ' +
              '프로그램 실행·종료·키보드·마우스·파일 접근은 하지 않습니다.'
            : '- 이번 요청에서 허용된 동작은 등재된 프로그램이 실행 중인지 **확인**하는 것까지입니다. ' +
              'O4O 는 프로그램을 대신 실행하지 않습니다.',
          '- 그 밖에는 파일·브라우저·외부 시스템·POS·약국 프로그램을 조작할 수 없습니다.',
        ]
      : facts.computerAction
        ? [
            '- 아래 "## 화면 조작 상태" 는 이 PC의 Local Work Agent가 **실제로 수행한 결과**입니다. ' +
              '사실로 삼아 그대로 안내하고, 수행하지 못했다고 말하지 마세요. 실패했다면 그 사유만 전하세요.',
            COMPUTER_ACTION_LINE[facts.computerAction],
            '- 한 요청에 한 가지 동작만 합니다. 다음 동작이 필요하면 사용자가 다시 요청하도록 안내하세요.',
            '- **로그인·비밀번호·인증번호·저장·전송·삭제·종료는 절대 대신하지 않습니다.** 요청받아도 할 수 없다고 하세요.',
            '- 그 밖에는 파일·브라우저·외부 시스템·POS·약국 프로그램을 조작할 수 없습니다.',
          ]
        : facts.computerRequestGap
          ? [
              '- 당신은 이번 요청에서 아무 동작도 실행하지 않았습니다.',
              COMPUTER_GAP_LINE[facts.computerRequestGap],
              '- 파일·브라우저·외부 시스템·POS·약국 프로그램을 조작할 수 없습니다.',
            ]
        : facts.browserAction
        ? [
            '- 아래 "## 사이트 상태" 는 이 PC의 Local Work Agent가 **실제로 수행한 결과**입니다. ' +
              '사실로 삼아 그대로 안내하고, 수행하지 못했다고 말하지 마세요.',
            facts.browserAction === 'open'
              ? '- 이번 요청에서 허용된 동작은 **등록된 사이트를 기본 브라우저로 여는 것**까지입니다. ' +
                '페이지 안의 클릭·입력·이동은 하지 않습니다.'
              : '- 이번 요청에서 허용된 동작은 브라우저가 실행 중인지 **확인**하는 것까지입니다. ' +
                '사이트가 열려 있는지는 확인하지 않으며, 열려 있다고 단정하지 마세요.',
            '- **로그인은 절대 대신하지 않습니다.** 아이디·비밀번호·OTP·인증서 정보를 요구하거나 ' +
              '입력하겠다고 말하지 마세요. 로그인이 필요하면 사용자가 사이트에서 직접 하도록 안내하고, ' +
              '이미 로그인된 상태이거나 로그인을 마쳤다면 "[로그인 완료]" 버튼을 누르도록 안내하세요.',
            '- 사용자가 아이디·비밀번호를 말하더라도 사용하지 마세요. 그 값을 되풀이하거나 저장하지 마세요.',
            '- 그 밖에는 파일·외부 시스템·POS·약국 프로그램을 조작할 수 없습니다.',
          ]
        : [
            '- 당신은 **답변만** 합니다. 어떤 작업도 실행하지 않습니다.',
            '- 파일·브라우저·외부 시스템·POS·약국 프로그램을 조작할 수 없습니다.',
          ]),
    '- 매장 데이터·주문·재고·고객 정보를 조회할 수 없습니다. 조회를 요청받으면 ' +
      '"현재는 매장 데이터를 직접 조회하지 않습니다" 라고 알리고, 대신 방법을 설명하세요.',
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

/**
 * provider 오류 정규화는 이 파일에 두지 않는다.
 *
 * WO-O4O-AI-MULTI-PROVIDER-RUNTIME-V0: provider 가 둘 이상이 되면서 오류 문자열 해석을
 * Home 전용 계층에 두면 provider 마다 갈라진다. `utils/ai-provider-runtime.ts` 의
 * `normalizeAiError()` / `aiErrorUserMessage()` 가 **유일한** 정규화 지점이다.
 */

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
