/**
 * RewardPolicyService
 *
 * WO-O4O-LMS-COMPLETION-REWARD-POLICY-SEPARATION-V1 (도입)
 * WO-O4O-LMS-REWARD-POLICY-CONTRACT-STABILIZE-V1 (계약 안정화)
 *
 * 핵심 정책: LMS reward(credit)는 레슨 완료/퀴즈 통과/강의 수료 시 **무조건 지급되지 않는다.**
 * 강사 또는 운영자가 강의/레슨/퀴즈 단위로 reward policy 를 설정한 경우에만 지급한다.
 * completion/progress 는 reward 여부와 무관하게 항상 기록된다(본 서비스는 지급만 담당, 완료 기록 미관여).
 *
 * 정책 저장 위치 (migration-free, 기존 jsonb metadata 재사용):
 *   - Course.metadata.rewardPolicy
 *   - Lesson.metadata.rewardPolicy (해당 이벤트에 한해 course 보다 우선)
 *   - Quiz.metadata.rewardPolicy   (quizPass 에 한해 우선)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * rewardPolicy 정식 계약 (WO-...-CONTRACT-STABILIZE-V1)
 * ─────────────────────────────────────────────────────────────────────────────
 * 정책 키는 **기존 코드 스타일(camelCase)** 을 유지한다(저장 데이터/소비처 호환):
 *   rewardPolicy = {
 *     lessonComplete?: RewardPolicyValue,
 *     quizPass?:       RewardPolicyValue,
 *     courseComplete?: RewardPolicyValue,
 *   }
 *
 * RewardPolicyValue 는 다음 두 형태를 모두 허용한다(후속 강사/운영자 UI 는 rich entry 사용 권장):
 *   1) rich entry  : { enabled: boolean, amount?: number, useDefaultAmount?: boolean }
 *   2) legacy short : boolean | number   (기존 도입 WO 호환)
 *
 * 정책 의미(normalizeRewardEntry 가 단일 기준으로 해석):
 *   - 없음(absent/null)                          → 미설정, 미지급
 *   - enabled=false / false                       → 비활성, 미지급
 *   - enabled=true + amount(정수>0)               → 지정 금액 지급
 *   - number(정수>0) (legacy short)               → 지정 금액 지급
 *   - enabled=true + useDefaultAmount=true(amount 없음) → 기본 금액(CREDIT_REWARDS) 지급
 *   - true (legacy short)                         → useDefaultAmount=true 로 해석 → 기본 금액 지급
 *   - enabled=true + amount 없음 + useDefaultAmount 없음 → **보수적 미지급**(invalid 아님, 단순 미지급)
 *   - amount=0 / 0                                → 미지급
 *   - amount<0 / 비정수 / 숫자 아님                → invalid → 미지급 + warn
 *   - 알 수 없는 형태                              → invalid → 미지급 + warn
 *
 * 기본 금액(CREDIT_REWARDS)은 "정책이 default 사용을 켠 경우의 fallback"으로만 사용한다.
 * enabled=true 만으로는 default 를 자동 사용하지 않는다(useDefaultAmount=true 또는 legacy true 일 때만).
 * 금액 자체는 변경하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 강사 제안 / 운영자 승인 구조 (후속 UI 수용 기반 — 본 WO 는 타입/계약만 고정, UI 미구현)
 * ─────────────────────────────────────────────────────────────────────────────
 *   metadata.rewardPolicy          → 운영자 승인/활성 정책. **지급의 단일 소스**(resolve 가 사용).
 *   metadata.rewardPolicyProposal  → 강사 제안. 후속 운영자 승인 UI 입력. **지급에 사용하지 않음.**
 * 즉, 강사는 제안만, 운영자가 승인한 rewardPolicy 만 실제 지급에 반영된다(예산 통제).
 *
 * 우선순위(이벤트별): finer level(lesson/quiz) 의 **지급 가능 금액** 이 있으면 사용, 없으면 course.
 *   - finer level 이 unset/disabled/invalid(=지급 0)면 course 로 fall-through.
 *   - finer level 의 명시적 비활성으로 course-level default 를 **억제(suppress)하는 동작은 V1 미지원**(문서화된 한계).
 *
 * 한계(본 WO 시점): reward policy 를 설정하는 강사/운영자 UI 는 아직 없다.
 *   → 현재 어떤 강의도 rewardPolicy 미설정 → 사실상 모든 reward 지급 중단(정책 의도).
 *   → 설정 UI 는 후속 WO(강사 제안 / 운영자 승인)에서 도입.
 */

import { PointService } from '../../point/services/PointService.js';
import type { CreditSourceType } from '../../credit/entities/CreditTransaction.js';
import { CREDIT_REWARDS } from '../../credit/credit-constants.js';
import logger from '../../../utils/logger.js';

/** 지급 이벤트(런타임/referenceKey 식별자 — snake_case 유지) */
export type RewardEvent = 'lesson_complete' | 'quiz_pass' | 'course_complete';

/** rewardPolicy 내부 이벤트 키(저장 형태 — 기존 camelCase 유지) */
export type RewardPolicyEventKey = 'lessonComplete' | 'quizPass' | 'courseComplete';

/** 정식(rich) reward 설정 entry */
export interface RewardPolicyEntry {
  /** 활성 여부. false 면 미지급. */
  enabled: boolean;
  /** 지정 금액(정수 > 0). 지정 시 useDefaultAmount 보다 우선. */
  amount?: number;
  /** amount 미지정 시 기본 금액(CREDIT_REWARDS) 사용 여부. */
  useDefaultAmount?: boolean;
}

/** 저장 가능한 값: rich entry | legacy shorthand(boolean|number) */
export type RewardPolicyValue = RewardPolicyEntry | boolean | number;

/** 강의/레슨/퀴즈 metadata 에 저장되는 reward 정책 */
export interface LmsRewardPolicy {
  lessonComplete?: RewardPolicyValue;
  quizPass?: RewardPolicyValue;
  courseComplete?: RewardPolicyValue;
}

/** 강사 제안 정책(운영자 승인 전). 구조는 LmsRewardPolicy 와 동일. */
export type LmsRewardPolicyProposal = LmsRewardPolicy;

/**
 * metadata 의 reward 관련 키 계약(후속 UI/DTO 공유 후보).
 * - rewardPolicy: 운영자 승인/활성 — 지급의 단일 소스
 * - rewardPolicyProposal: 강사 제안 — 지급 비대상
 */
export interface RewardPolicyMetadata {
  rewardPolicy?: LmsRewardPolicy | null;
  rewardPolicyProposal?: LmsRewardPolicyProposal | null;
}

/** normalizeRewardEntry 의 해석 결과 */
export type NormalizedReward =
  | { state: 'unset' }
  | { state: 'disabled' }
  | { state: 'invalid'; reason: string }
  | { state: 'amount'; amount: number };

interface RewardContext {
  course?: { metadata?: Record<string, any> | null } | null;
  lesson?: { metadata?: Record<string, any> | null } | null;
  quiz?: { metadata?: Record<string, any> | null } | null;
}

const POLICY_KEY_BY_EVENT: Record<RewardEvent, RewardPolicyEventKey> = {
  lesson_complete: 'lessonComplete',
  quiz_pass: 'quizPass',
  course_complete: 'courseComplete',
};

const DEFAULT_AMOUNT_BY_EVENT: Record<RewardEvent, number> = {
  lesson_complete: CREDIT_REWARDS.LESSON_COMPLETE,
  quiz_pass: CREDIT_REWARDS.QUIZ_PASS,
  course_complete: CREDIT_REWARDS.COURSE_COMPLETE,
};

function isValidAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isInteger(amount) && amount > 0;
}

/**
 * 단일 reward 설정 값을 정식 계약 기준으로 해석한다(rich entry + legacy shorthand 통합).
 * 지급 로직·UI·validation 이 모두 이 함수를 단일 기준으로 사용해 drift 를 방지한다.
 */
export function normalizeRewardEntry(
  value: RewardPolicyValue | null | undefined,
  defaultAmount: number,
): NormalizedReward {
  // 미설정
  if (value === undefined || value === null) return { state: 'unset' };

  // legacy shorthand: boolean
  if (value === false) return { state: 'disabled' };
  if (value === true) return { state: 'amount', amount: defaultAmount }; // true → useDefaultAmount=true 로 해석

  // legacy shorthand: number
  if (typeof value === 'number') {
    if (value === 0) return { state: 'unset' };
    if (!Number.isInteger(value) || value < 0) {
      return { state: 'invalid', reason: `amount must be a positive integer (got ${value})` };
    }
    return { state: 'amount', amount: value };
  }

  // rich entry
  if (typeof value === 'object') {
    const entry = value as RewardPolicyEntry;
    if (entry.enabled !== true) return { state: 'disabled' };

    if (entry.amount !== undefined) {
      if (entry.amount === 0) return { state: 'disabled' }; // amount=0 → 미지급
      if (!isValidAmount(entry.amount)) {
        return { state: 'invalid', reason: `amount must be a positive integer (got ${String(entry.amount)})` };
      }
      return { state: 'amount', amount: entry.amount };
    }

    if (entry.useDefaultAmount === true) return { state: 'amount', amount: defaultAmount };

    // enabled=true 이지만 amount/useDefaultAmount 둘 다 없음 → 보수적 미지급
    return { state: 'disabled' };
  }

  return { state: 'invalid', reason: `unknown rewardPolicy entry shape: ${typeof value}` };
}

/**
 * 단일 엔티티 metadata 에서 특정 이벤트의 지급 금액을 해석한다.
 * 미설정/비활성 → 0, invalid → 0 + warn, amount → 그 금액.
 */
function amountFromMetadata(
  metadata: Record<string, any> | null | undefined,
  event: RewardEvent,
  source: 'course' | 'lesson' | 'quiz',
): number {
  const policy = (metadata as RewardPolicyMetadata | undefined | null)?.rewardPolicy;
  if (!policy) return 0;
  const key = POLICY_KEY_BY_EVENT[event];
  const normalized = normalizeRewardEntry(policy[key], DEFAULT_AMOUNT_BY_EVENT[event]);
  if (normalized.state === 'amount') return normalized.amount;
  if (normalized.state === 'invalid') {
    logger.warn(`[Reward] invalid rewardPolicy.${key} on ${source} — treated as no payout`, {
      event,
      source,
      reason: normalized.reason,
    });
  }
  return 0;
}

/**
 * 이벤트에 대해 설정된 reward 금액을 해석한다. 미설정이면 0.
 * 우선순위: (이벤트별) lesson/quiz 의 지급 가능 금액 → course.
 * finer level 이 지급 0(unset/disabled/invalid)이면 course 로 fall-through.
 */
export function resolveRewardAmount(event: RewardEvent, ctx: RewardContext): number {
  switch (event) {
    case 'lesson_complete': {
      const fromLesson = amountFromMetadata(ctx.lesson?.metadata, event, 'lesson');
      if (fromLesson > 0) return fromLesson;
      return amountFromMetadata(ctx.course?.metadata, event, 'course');
    }
    case 'quiz_pass': {
      const fromQuiz = amountFromMetadata(ctx.quiz?.metadata, event, 'quiz');
      if (fromQuiz > 0) return fromQuiz;
      return amountFromMetadata(ctx.course?.metadata, event, 'course');
    }
    case 'course_complete':
      return amountFromMetadata(ctx.course?.metadata, event, 'course');
    default:
      return 0;
  }
}

/** grantRewardIfConfigured 결과(호출자에게 명확히 전달) */
export type RewardGrantOutcome = 'granted' | 'not-configured' | 'duplicate' | 'failed';

interface GrantRewardParams {
  event: RewardEvent;
  amount: number;
  userId: string;
  sourceType: CreditSourceType;
  sourceId?: string;
  referenceKey: string;
  description: string;
  serviceKey: string;
}

/**
 * 설정된 경우에만 reward(credit)를 지급한다.
 *
 * - amount<=0(미설정/비활성/invalid) → 지급하지 않고 false 반환(오류 아님). 학습 완료 흐름 영향 없음.
 * - referenceKey UNIQUE + PointService 내부 dedup 으로 중복 지급 차단(재응시/재완료 안전).
 * - 지급 실패(예산 부족/오류)는 throw 하지 않고 warn 후 false 반환 → completion rollback 방지.
 *
 * @returns 실제 지급되었으면 true, 미설정/중복/실패면 false (세부 결과는 grantRewardWithOutcome 사용)
 */
export async function grantRewardIfConfigured(params: GrantRewardParams): Promise<boolean> {
  return (await grantRewardWithOutcome(params)) === 'granted';
}

/**
 * grantRewardIfConfigured 의 상세 결과 버전(호출자가 분기 필요 시 사용).
 * grantRewardIfConfigured 는 backward-compat 을 위해 boolean 만 반환한다.
 */
export async function grantRewardWithOutcome(params: GrantRewardParams): Promise<RewardGrantOutcome> {
  const { event, amount, userId, sourceType, sourceId, referenceKey, description, serviceKey } = params;

  // 정책 미설정/비활성/invalid → 지급하지 않음(정상 경로, 오류 아님)
  if (!amount || amount <= 0) return 'not-configured';

  try {
    const granted = await PointService.getInstance().grantPoint({
      userId,
      amount,
      sourceType,
      sourceId,
      referenceKey,
      description,
      serviceKey,
    });
    return granted ? 'granted' : 'duplicate'; // null = dedup(이미 지급)
  } catch (err) {
    logger.warn(`[Reward] grant failed (${event})`, {
      userId,
      referenceKey,
      error: (err as Error).message,
    });
    return 'failed';
  }
}
