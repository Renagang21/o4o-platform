/**
 * WO-O4O-AUTOMATION-FAILURE-ESCALATION-AND-USER-GUIDED-RECOVERY-V0 §69~§72 — 자동 테스트(순수 계약)
 *
 *   Classification    실패 코드/신호 → taxonomy(§7). never-escalate 우선순위(§8).
 *   Escalation        normal → strong → user tier 진행 · 예산 · 국면 전환 리셋 · non-escalatable 즉시 사용자(§11·§16·§46).
 *   User guidance     구체적 설명(내부 용어 없음, §17·§20) · 힌트 sanitize(길이·제어문자, §64·§65).
 *   Learning signal   복구 결과 기록(§27) · 개선 후보 신호(§22·§5 자동 승격 없음) · 안전 로그 필드 화이트리스트(§60).
 *   Strong model      같은 provider·키, 더 강한 whitelisted 모델(§11·§12) · 새 stack 없음 · env override + whitelist 검증.
 *
 * 실 strong-model 호출 · 실 브라우저/Windows 는 CHECK 의 smoke 가 본다. 이 스펙은 순수 함수만 검사한다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import {
  AUTOMATION_FAILURE_CLASSES,
  NON_ESCALATABLE_CLASSES,
  RECOVERY_ERROR,
  RECOVERY_LIMITS,
  RECOVERY_RESULTS,
  RECOVERY_TIERS,
  RECOVERY_USAGE_KEYS,
  RECOVERY_HINT_MAX_LENGTH,
  buildRecoveryExplanation,
  buildRecoveryUsageFields,
  classifyFailure,
  createRecoveryState,
  decideRecovery,
  isAutomationFailureClass,
  isEscalatable,
  isImprovementCandidate,
  noteNotRecovered,
  noteRecovered,
  sanitizeRecoveryHint,
} from '../services/ai-tools/automation-recovery-contract.js';
import {
  STRONG_MODEL_DEFAULT,
  resolveStrongModelForProvider,
} from '../utils/ai-provider-runtime.js';
import { MODEL_WHITELIST, GEMINI_CANONICAL_MODEL } from '../types/ai-proxy.types.js';

// ─── ① Classification (§7·§8) ─────────────────────────────────────────────────

describe('classification (§7·§8)', () => {
  it('11개 taxonomy · guard', () => {
    expect(AUTOMATION_FAILURE_CLASSES).toHaveLength(11);
    expect(isAutomationFailureClass('NO_PROGRESS')).toBe(true);
    expect(isAutomationFailureClass('nope')).toBe(false);
  });

  it('never-escalate(credential/commit/risk)는 어떤 부가 신호보다 먼저 RISK_BLOCKED 로 분류된다(§8)', () => {
    // 실제 표면 오류 코드들.
    expect(classifyFailure({ errorCode: 'DOM_USER_ACTION_REQUIRED' })).toBe('RISK_BLOCKED');
    expect(classifyFailure({ errorCode: 'UIA_USER_ACTION_REQUIRED' })).toBe('RISK_BLOCKED');
    expect(classifyFailure({ errorCode: 'DOM_ACTION_NOT_ALLOWED' })).toBe('RISK_BLOCKED');
    expect(classifyFailure({ errorCode: 'UIA_ACTION_NOT_ALLOWED' })).toBe('RISK_BLOCKED');
    expect(classifyFailure({ riskCommit: true })).toBe('RISK_BLOCKED');
    // riskCommit 은 그 자체가 커밋 성격 거절 → RISK_BLOCKED(§8).
    expect(classifyFailure({ errorCode: 'DOM_ELEMENT_NOT_FOUND', riskCommit: true })).toBe('RISK_BLOCKED');
  });

  it('신호·코드별 매핑', () => {
    expect(classifyFailure({ plannerFault: true })).toBe('PLANNING_FAILURE');
    expect(classifyFailure({ noProgress: true })).toBe('NO_PROGRESS');
    expect(classifyFailure({ errorCode: 'WINDOWS_AUTOMATION_USER_ACTIVE' })).toBe('USER_INTERFERENCE');
    expect(classifyFailure({ errorCode: 'DOM_CROSS_ORIGIN_BLOCKED' })).toBe('UNSUPPORTED_UI');
    expect(classifyFailure({ errorCode: 'WINDOWS_AUTOMATION_UIA_AMBIGUOUS' })).toBe('AMBIGUOUS_STATE');
    expect(classifyFailure({ errorCode: 'WINDOWS_AUTOMATION_TARGET_CHANGED' })).toBe('EXTERNAL_CHANGE');
    expect(classifyFailure({ errorCode: 'WORK_SITE_UNRESOLVED_NOT_REGISTERED' })).toBe('DISCOVERY_FAILURE');
    expect(classifyFailure({ errorCode: 'DOM_TAB_NOT_FOUND' })).toBe('TARGET_FAILURE');
    expect(classifyFailure({ errorCode: 'DOM_CONTENT_UNAVAILABLE' })).toBe('OBSERVATION_FAILURE');
    expect(classifyFailure({ errorCode: 'DOM_ELEMENT_NOT_FOUND' })).toBe('ACTION_FAILURE');
    // 알 수 없는 코드는 재시도 여지가 있는 ACTION_FAILURE.
    expect(classifyFailure({ errorCode: 'SOMETHING_NEW_XYZ' })).toBe('ACTION_FAILURE');
    expect(classifyFailure({})).toBe('ACTION_FAILURE');
  });

  it('non-escalatable 4종 · isEscalatable', () => {
    expect([...NON_ESCALATABLE_CLASSES].sort()).toEqual(['AMBIGUOUS_STATE', 'RISK_BLOCKED', 'UNSUPPORTED_UI', 'USER_INTERFERENCE']);
    expect(isEscalatable('RISK_BLOCKED')).toBe(false);
    expect(isEscalatable('USER_INTERFERENCE')).toBe(false);
    expect(isEscalatable('PLANNING_FAILURE')).toBe(true);
    expect(isEscalatable('NO_PROGRESS')).toBe(true);
  });
});

// ─── ② Escalation (§11·§16·§46) ────────────────────────────────────────────────

describe('escalation decision (§11·§16·§46)', () => {
  it('tier 3단계 · never-escalate 는 즉시 사용자', () => {
    expect(RECOVERY_TIERS).toEqual(['normal_retry', 'strong_model', 'user_assistance']);
    const s = createRecoveryState();
    const d = decideRecovery(s, 'RISK_BLOCKED');
    expect(d).toMatchObject({ tier: 'user_assistance', askUser: true, useStrongModel: false });
    // 안전 국면은 strong 으로 절대 올라가지 않는다.
    expect(s.escalatedToStrong).toBe(false);
  });

  it('normal → strong → user 진행(예산: normal 2회 · strong 2회)', () => {
    const s = createRecoveryState();
    const seq: string[] = [];
    for (let i = 0; i < 6; i += 1) seq.push(decideRecovery(s, 'PLANNING_FAILURE').tier);
    expect(seq).toEqual([
      'normal_retry', 'normal_retry',   // normalRetryMax = 2
      'strong_model', 'strong_model',   // strongModelMax = 2
      'user_assistance', 'user_assistance',
    ]);
    expect(s.escalatedToStrong).toBe(true);
    expect(RECOVERY_LIMITS).toEqual({ normalRetryMax: 2, strongModelMax: 2 });
  });

  it('useStrongModel · askUser flag 가 tier 와 일치', () => {
    const s = createRecoveryState();
    expect(decideRecovery(s, 'ACTION_FAILURE')).toMatchObject({ useStrongModel: false, askUser: false });
    decideRecovery(s, 'ACTION_FAILURE'); // 두 번째 normal
    expect(decideRecovery(s, 'ACTION_FAILURE')).toMatchObject({ tier: 'strong_model', useStrongModel: true, askUser: false });
  });

  it('실패 국면이 바뀌면 예산을 새로 센다("다른 이유로 막힌" 것은 새 국면)', () => {
    const s = createRecoveryState();
    decideRecovery(s, 'PLANNING_FAILURE');
    decideRecovery(s, 'PLANNING_FAILURE'); // normal 소진 직전
    // 다른 class 로 바뀌면 normal 부터 다시.
    const d = decideRecovery(s, 'ACTION_FAILURE');
    expect(d.tier).toBe('normal_retry');
    expect(s.normalRetries).toBe(1);
  });
});

// ─── ③ User guidance (§17·§20·§64·§65) ─────────────────────────────────────────

describe('user guidance (§17·§20·§64·§65)', () => {
  it('모든 class 에 사용자 설명이 있고 내부 용어를 노출하지 않는다', () => {
    const internal = ['planner', 'RuntimeId', 'UIA', 'stale', 'escalat', 'strong_model', 'tier', 'DOM', 'snapshot'];
    for (const cls of AUTOMATION_FAILURE_CLASSES) {
      const msg = buildRecoveryExplanation(cls);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
      for (const term of internal) expect(msg.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });

  it('hint sanitize: 길이·제어문자·개행', () => {
    expect(sanitizeRecoveryHint('  아모디핀 5mg 정제  ')).toBe('아모디핀 5mg 정제');
    expect(sanitizeRecoveryHint('')).toBeNull();
    expect(sanitizeRecoveryHint('   ')).toBeNull();
    expect(sanitizeRecoveryHint(123)).toBeNull();
    expect(sanitizeRecoveryHint('x'.repeat(RECOVERY_HINT_MAX_LENGTH + 1))).toBeNull();
    // 개행은 공백으로, 제어문자는 거절.
    expect(sanitizeRecoveryHint('첫 줄\n둘째 줄')).toBe('첫 줄 둘째 줄');
    expect(sanitizeRecoveryHint('나쁜\x00바이트')).toBeNull();
  });
});

// ─── ④ Learning signal (§22·§27·§60) ───────────────────────────────────────────

describe('learning signal (§22·§27·§60)', () => {
  it('복구 결과 5종 · 무엇으로 복구됐는지 기록', () => {
    expect(RECOVERY_RESULTS).toEqual([
      'recovered_by_normal_retry', 'recovered_by_strong_model', 'recovered_by_user_hint', 'recovered_by_user_action', 'not_recovered',
    ]);
    // normal 재시도로 복구.
    const a = createRecoveryState();
    decideRecovery(a, 'ACTION_FAILURE');
    expect(noteRecovered(a)).toBe('recovered_by_normal_retry');
    expect(a.activeClass).toBeNull(); // 국면 종료

    // strong 까지 올라가 복구.
    const b = createRecoveryState();
    for (let i = 0; i < 3; i += 1) decideRecovery(b, 'PLANNING_FAILURE'); // normal·normal·strong
    expect(noteRecovered(b)).toBe('recovered_by_strong_model');

    // 사용자 힌트로 복구.
    const c = createRecoveryState();
    decideRecovery(c, 'ACTION_FAILURE');
    expect(noteRecovered(c, { userHintPresent: true })).toBe('recovered_by_user_hint');

    // 복구 못 함.
    const d = createRecoveryState();
    decideRecovery(d, 'PLANNING_FAILURE');
    expect(noteNotRecovered(d)).toBe('not_recovered');
  });

  it('개선 후보 신호(§22) — strong 상승 · 미복구 · 사용자 개입일 때만. 자동 승격 아님(boolean)', () => {
    const normal = createRecoveryState();
    decideRecovery(normal, 'ACTION_FAILURE');
    noteRecovered(normal);
    expect(isImprovementCandidate(normal)).toBe(false); // 정상 재시도 복구는 후보 아님

    const strong = createRecoveryState();
    for (let i = 0; i < 3; i += 1) decideRecovery(strong, 'PLANNING_FAILURE');
    noteRecovered(strong);
    expect(isImprovementCandidate(strong)).toBe(true);

    const hint = createRecoveryState();
    decideRecovery(hint, 'ACTION_FAILURE');
    noteRecovered(hint, { userHintPresent: true });
    expect(isImprovementCandidate(hint)).toBe(true);

    const failed = createRecoveryState();
    decideRecovery(failed, 'PLANNING_FAILURE');
    noteNotRecovered(failed);
    expect(isImprovementCandidate(failed)).toBe(true);
  });

  it('안전 로그 필드는 화이트리스트 6키뿐 — 원문·힌트·화면 없음(§60)', () => {
    expect([...RECOVERY_USAGE_KEYS].sort()).toEqual(
      ['failureClass', 'improvementCandidate', 'recoveryAttempt', 'recoveryMethod', 'recoveryStatus', 'recoveryTier'].sort(),
    );
    const s = createRecoveryState();
    decideRecovery(s, 'PLANNING_FAILURE');
    decideRecovery(s, 'PLANNING_FAILURE');
    decideRecovery(s, 'PLANNING_FAILURE'); // strong
    const fields = buildRecoveryUsageFields(s, RECOVERY_ERROR.ESCALATED);
    expect(Object.keys(fields).sort()).toEqual([...RECOVERY_USAGE_KEYS].sort());
    expect(fields.failureClass).toBe('PLANNING_FAILURE');
    expect(fields.recoveryTier).toBe('strong_model');
    expect(fields.recoveryAttempt).toBe(3); // normal 2 + strong 1
    expect(fields.recoveryStatus).toBe('AUTOMATION_RECOVERY_ESCALATED');
    expect(fields.improvementCandidate).toBe(true);
    // 값에 자유 텍스트가 실릴 칸이 없다(전부 enum/number/boolean/null).
    expect(typeof fields.recoveryAttempt).toBe('number');
    expect(typeof fields.improvementCandidate).toBe('boolean');
  });

  it('실패가 없었으면 복구 필드는 전부 비어 있다(키는 있고 값은 null/0/false)', () => {
    const s = createRecoveryState();
    const fields = buildRecoveryUsageFields(s, null);
    expect(fields).toEqual({ failureClass: null, recoveryTier: null, recoveryMethod: null, recoveryAttempt: 0, recoveryStatus: null, improvementCandidate: false });
  });

  it('§67 오류 코드 5종', () => {
    expect(Object.values(RECOVERY_ERROR).sort()).toEqual([
      'AUTOMATION_RECOVERY_ESCALATED',
      'AUTOMATION_RECOVERY_EXHAUSTED',
      'AUTOMATION_RECOVERY_PROVIDER_UNAVAILABLE',
      'AUTOMATION_RECOVERY_RESUME_FAILED',
      'AUTOMATION_RECOVERY_USER_HELP_REQUIRED',
    ]);
  });
});

// ─── ⑤ Strong model resolution (§11·§12 — 새 stack 없음) ────────────────────────

describe('strong model resolution (§11·§12)', () => {
  const ENV_KEYS = ['AI_STRONG_MODEL', 'AI_STRONG_MODEL_OPENAI'];
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => { for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; } });
  afterEach(() => { for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

  it('기본 strong 모델은 whitelist 안의 더 강한 모델(캐논과 다름) · 새 provider 아님', () => {
    // gemini: 캐논(3.8-flash)보다 강한 2.5-pro. openai: 플래그십 astra.
    expect(STRONG_MODEL_DEFAULT.gemini).toBe('gemini-2.5-pro');
    expect(STRONG_MODEL_DEFAULT.gemini).not.toBe(GEMINI_CANONICAL_MODEL);
    expect((MODEL_WHITELIST.gemini as readonly string[]).includes(STRONG_MODEL_DEFAULT.gemini)).toBe(true);
    expect((MODEL_WHITELIST.openai as readonly string[]).includes(STRONG_MODEL_DEFAULT.openai)).toBe(true);
    expect(resolveStrongModelForProvider('gemini')).toBe('gemini-2.5-pro');
    expect(resolveStrongModelForProvider('openai')).toBe('gpt-6-astra');
  });

  it('env override 는 whitelist 안일 때만 적용, 아니면 기본값으로 접는다', () => {
    process.env.AI_STRONG_MODEL = 'gemini-1.5-pro';
    expect(resolveStrongModelForProvider('gemini')).toBe('gemini-1.5-pro');
    process.env.AI_STRONG_MODEL = 'not-a-real-model';
    expect(resolveStrongModelForProvider('gemini')).toBe(STRONG_MODEL_DEFAULT.gemini);
  });
});
