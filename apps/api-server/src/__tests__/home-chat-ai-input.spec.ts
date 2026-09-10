/**
 * WO-O4O-COMMON-HOME-AI-INPUT-V0
 *
 * Home AI 입력의 **계약**을 고정한다. DB·LLM 호출 없이 순수 계층만 검사한다.
 *
 * 특히 고정하려는 것:
 *   - 입력 검증(빈 입력 / 초과 길이 / 비문자열)
 *   - system prompt 가 **서버 확정 사실**로만 만들어지고 식별자를 담지 않는다
 *   - ambiguous 에서 임의 매장을 고르지 않고 "확인하라"는 지시가 들어간다
 *   - tool 실행 금지 지시가 항상 포함된다
 *   - provider 오류가 사용자 응답용으로 sanitize 된다 (key/provider/stack 비노출)
 */

import {
  HOME_CHAT_MAX_MESSAGE_LENGTH,
  validateHomeChatMessage,
  homeChatValidationMessage,
  buildHomeChatSystemPrompt,
  buildHomeChatUserPrompt,
  extractHomeChatAnswer,
  type VerifiedScopeFacts,
} from '../services/ai-prompts/homeChat.js';

const baseFacts = (over: Partial<VerifiedScopeFacts> = {}): VerifiedScopeFacts => ({
  workspace: 'home',
  capabilities: [],
  ...over,
});

describe('home-chat 입력 검증', () => {
  it('2. 빈 message 거부 (공백만 있는 입력 포함)', () => {
    for (const raw of ['', '   ', '\n\t ']) {
      const r = validateHomeChatMessage(raw);
      expect(r.ok).toBe(false);
      expect(r.error).toBe('EMPTY_MESSAGE');
    }
    expect(homeChatValidationMessage('EMPTY_MESSAGE')).toContain('질문을 입력');
  });

  it('3. 초과 길이 message 거부', () => {
    const tooLong = 'ㄱ'.repeat(HOME_CHAT_MAX_MESSAGE_LENGTH + 1);
    const r = validateHomeChatMessage(tooLong);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('MESSAGE_TOO_LONG');
    // 경계값은 통과해야 한다.
    expect(validateHomeChatMessage('ㄱ'.repeat(HOME_CHAT_MAX_MESSAGE_LENGTH)).ok).toBe(true);
  });

  it('비문자열 message 거부', () => {
    for (const raw of [undefined, null, 42, {}, []]) {
      const r = validateHomeChatMessage(raw);
      expect(r.ok).toBe(false);
      expect(r.error).toBe('INVALID_MESSAGE');
    }
  });

  it('4. 정상 message 는 trim 되어 통과한다', () => {
    const r = validateHomeChatMessage('  약국 POP 만들 때 주의점은?  ');
    expect(r.ok).toBe(true);
    expect(r.message).toBe('약국 POP 만들 때 주의점은?');
  });

  it('user prompt 는 사용자 입력을 가공하지 않는다', () => {
    expect(buildHomeChatUserPrompt('원문 그대로')).toBe('원문 그대로');
  });
});

describe('home-chat system prompt — 서버 확정 사실만 반영', () => {
  it('7. 식별자(organizationId/storeId)를 프롬프트에 담지 않는다', () => {
    const prompt = buildHomeChatSystemPrompt(
      baseFacts({ workspace: 'store', serviceKey: 'kpa-society', storeStatus: 'resolved' }),
    );
    // 매장이 확정됐다는 **사실**만 있고 UUID 는 없다.
    expect(prompt).toContain('매장 컨텍스트: 확정됨');
    expect(prompt).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it('8. ambiguous 는 임의 매장 선택 대신 확인 안내를 지시한다', () => {
    const prompt = buildHomeChatSystemPrompt(
      baseFacts({ workspace: 'store', serviceKey: 'kpa-society', storeStatus: 'ambiguous' }),
    );
    expect(prompt).toContain('여러 개');
    expect(prompt).toContain('확인');
    expect(prompt).not.toContain('확정됨');
  });

  it('store none 은 일반 질문으로 답하도록 지시한다', () => {
    const prompt = buildHomeChatSystemPrompt(
      baseFacts({ workspace: 'store', serviceKey: 'neture', storeStatus: 'none' }),
    );
    expect(prompt).toContain('매장 컨텍스트: 없음');
  });

  it('비-store 축에서는 매장 컨텍스트가 "해당 없음" 이다', () => {
    const prompt = buildHomeChatSystemPrompt(baseFacts({ workspace: 'home' }));
    expect(prompt).toContain('해당 없음');
  });

  it('serviceKey 가 없으면 "확정되지 않음" 으로 표기한다', () => {
    const prompt = buildHomeChatSystemPrompt(baseFacts({ workspace: 'home' }));
    expect(prompt).toContain('서비스: 확정되지 않음');
  });

  it('6. tool 실행 금지 지시가 항상 포함된다 (모든 workspace)', () => {
    for (const workspace of ['home', 'community', 'store', 'supplier', 'partner', 'operator', 'admin']) {
      const prompt = buildHomeChatSystemPrompt(baseFacts({ workspace }));
      expect(prompt).toContain('답변만');
      expect(prompt).toContain('매장 데이터를 직접 조회하지 않습니다');
      expect(prompt).toContain('POS');
      expect(prompt).toContain('없는 권한이나 데이터 접근을 가진 것처럼 말하지 마세요');
    }
  });

  it('capabilities 는 서술로만 실린다 (실행 권한 부여 문구 없음)', () => {
    const prompt = buildHomeChatSystemPrompt(
      baseFacts({ workspace: 'store', capabilities: ['navigate', 'read'] }),
    );
    expect(prompt).toContain('참고 가능 범위: navigate, read');
    // capability 가 곧 실행 허가가 되지 않는다.
    expect(prompt).toContain('어떤 작업도 실행하지 않습니다');
  });

  /**
   * WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 회귀 고정 — 2026-09-10 프로덕션 실측.
   *
   * 창 활성화가 **실제로 수행된** 요청에서도 프롬프트가 "어떤 작업도 실행하지
   * 않습니다" 라고 단언해, 모델이 수행된 동작을 부인하는 답을 냈다
   * ("저는 어떤 작업도 실행할 수 없습니다").
   */
  it('창 축이 실행된 요청에서는 전면 금지 문장을 세우지 않는다', () => {
    const activate = buildHomeChatSystemPrompt(
      baseFacts({ workspace: 'home', windowsAppAction: 'activate' }),
    );
    expect(activate).not.toContain('어떤 작업도 실행하지 않습니다');
    expect(activate).toContain('실제로 수행한 결과');
    expect(activate).toContain('창을 앞으로 가져오는 것');
    // 나머지 금지선은 그대로 선다.
    expect(activate).toContain('프로그램 실행·종료·키보드·마우스·파일 접근은 하지 않습니다');
    expect(activate).toContain('매장 데이터·주문·재고·고객 정보를 조회할 수 없습니다');

    const inspect = buildHomeChatSystemPrompt(
      baseFacts({ workspace: 'home', windowsAppAction: 'inspect' }),
    );
    expect(inspect).not.toContain('어떤 작업도 실행하지 않습니다');
    expect(inspect).toContain('O4O 는 프로그램을 대신 실행하지 않습니다');

    // 창 축이 없으면 기존 문장이 그대로다.
    expect(buildHomeChatSystemPrompt(baseFacts({ workspace: 'home' }))).toContain(
      '어떤 작업도 실행하지 않습니다',
    );
  });
});

describe('home-chat 응답 처리', () => {
  it('평문 응답을 그대로 돌려준다', () => {
    expect(extractHomeChatAnswer('  안녕하세요  ')).toBe('안녕하세요');
  });

  it('JSON 응답이 오면 answer 필드를 풀어서 쓴다', () => {
    expect(extractHomeChatAnswer('{"answer":"정리된 답변"}')).toBe('정리된 답변');
    expect(extractHomeChatAnswer('{"message":"다른 필드"}')).toBe('다른 필드');
  });

  it('JSON 파싱 실패 시 평문으로 취급한다', () => {
    expect(extractHomeChatAnswer('{깨진 json')).toBe('{깨진 json');
  });

  it('빈 응답은 빈 문자열이다 (호출부가 502 로 처리)', () => {
    expect(extractHomeChatAnswer('')).toBe('');
    expect(extractHomeChatAnswer('   ')).toBe('');
  });
});

// 오류 정규화 테스트는 provider 무관 계층으로 이관했다 —
// `ai-multi-provider-runtime.spec.ts` (WO-O4O-AI-MULTI-PROVIDER-RUNTIME-V0).
