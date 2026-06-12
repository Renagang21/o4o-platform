/**
 * RewardPolicyService
 *
 * WO-O4O-LMS-COMPLETION-REWARD-POLICY-SEPARATION-V1
 *
 * 핵심 정책: LMS reward(credit)는 레슨 완료/퀴즈 통과/강의 수료 시 **무조건 지급되지 않는다.**
 * 강사 또는 운영자가 강의/레슨/퀴즈 단위로 reward policy 를 설정한 경우에만 지급한다.
 *
 * 정책 저장 위치 (migration-free):
 *   - Course.metadata.rewardPolicy
 *   - Lesson.metadata.rewardPolicy (해당 이벤트에 한해 course 보다 우선)
 *   - Quiz.metadata.rewardPolicy   (quizPass 에 한해 우선)
 *
 * rewardPolicy 형태:
 *   {
 *     lessonComplete?: boolean | number,  // true → 기본 금액(CREDIT_REWARDS.LESSON_COMPLETE), number(>0) → 사용자 지정 금액
 *     quizPass?:       boolean | number,  // true → 기본 금액(CREDIT_REWARDS.QUIZ_PASS)
 *     courseComplete?: boolean | number,  // true → 기본 금액(CREDIT_REWARDS.COURSE_COMPLETE)
 *   }
 *
 * 미설정(absent/false/0) → 지급액 0 → 지급하지 않음(오류 아님). 학습 완료 흐름은 영향받지 않는다.
 * 기존 CREDIT_REWARDS 금액은 "정책이 true 로 활성화된 경우의 기본값"으로만 사용한다(금액 변경 아님).
 *
 * 한계(본 WO 시점): reward policy 를 설정하는 강사/운영자 UI 는 아직 없다.
 *   → 현재 어떤 강의도 rewardPolicy 미설정 → 사실상 모든 reward 지급 중단(정책 의도).
 *   → 설정 UI 는 후속 WO(IR-O4O-LMS-REWARD-POLICY-UI-AUDIT-V1)에서 도입.
 */

import { PointService } from '../../point/services/PointService.js';
import type { CreditSourceType } from '../../credit/entities/CreditTransaction.js';
import { CREDIT_REWARDS } from '../../credit/credit-constants.js';
import logger from '../../../utils/logger.js';

export type RewardEvent = 'lesson_complete' | 'quiz_pass' | 'course_complete';

interface MetadataLike {
  rewardPolicy?: {
    lessonComplete?: boolean | number;
    quizPass?: boolean | number;
    courseComplete?: boolean | number;
  } | null;
}

interface RewardContext {
  course?: { metadata?: Record<string, any> | null } | null;
  lesson?: { metadata?: Record<string, any> | null } | null;
  quiz?: { metadata?: Record<string, any> | null } | null;
}

/**
 * 단일 엔티티 metadata 에서 특정 이벤트의 설정 금액을 해석한다.
 * - true → defaultAmount
 * - number(>0) → 그 값
 * - 그 외(undefined/false/0/음수) → 0 (미설정)
 */
function amountFromMetadata(
  metadata: Record<string, any> | null | undefined,
  key: 'lessonComplete' | 'quizPass' | 'courseComplete',
  defaultAmount: number,
): number {
  const policy = (metadata as MetadataLike | undefined)?.rewardPolicy;
  if (!policy) return 0;
  const v = policy[key];
  if (v === true) return defaultAmount;
  if (typeof v === 'number' && v > 0) return v;
  return 0;
}

/**
 * 이벤트에 대해 설정된 reward 금액을 해석한다. 미설정이면 0.
 * 우선순위: (이벤트별) lesson/quiz 설정 → course 설정.
 */
export function resolveRewardAmount(event: RewardEvent, ctx: RewardContext): number {
  switch (event) {
    case 'lesson_complete': {
      const fromLesson = amountFromMetadata(ctx.lesson?.metadata, 'lessonComplete', CREDIT_REWARDS.LESSON_COMPLETE);
      if (fromLesson > 0) return fromLesson;
      return amountFromMetadata(ctx.course?.metadata, 'lessonComplete', CREDIT_REWARDS.LESSON_COMPLETE);
    }
    case 'quiz_pass': {
      const fromQuiz = amountFromMetadata(ctx.quiz?.metadata, 'quizPass', CREDIT_REWARDS.QUIZ_PASS);
      if (fromQuiz > 0) return fromQuiz;
      return amountFromMetadata(ctx.course?.metadata, 'quizPass', CREDIT_REWARDS.QUIZ_PASS);
    }
    case 'course_complete':
      return amountFromMetadata(ctx.course?.metadata, 'courseComplete', CREDIT_REWARDS.COURSE_COMPLETE);
    default:
      return 0;
  }
}

/**
 * 설정된 경우에만 reward(credit)를 지급한다.
 *
 * - amount<=0(미설정) → 지급하지 않고 false 반환(오류 아님). 학습 완료 흐름 영향 없음.
 * - referenceKey UNIQUE + PointService 내부 dedup 으로 중복 지급 차단(재응시/재완료 안전).
 * - 지급 실패(예산 부족/오류)는 throw 하지 않고 warn 후 false 반환 → completion rollback 방지.
 *
 * @returns 실제 지급되었으면 true, 미설정/중복/실패면 false
 */
export async function grantRewardIfConfigured(params: {
  event: RewardEvent;
  amount: number;
  userId: string;
  sourceType: CreditSourceType;
  sourceId?: string;
  referenceKey: string;
  description: string;
  serviceKey: string;
}): Promise<boolean> {
  const { event, amount, userId, sourceType, sourceId, referenceKey, description, serviceKey } = params;

  // 정책 미설정 → 지급하지 않음(정상 경로, 오류 아님)
  if (!amount || amount <= 0) return false;

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
    return !!granted; // null = dedup(이미 지급) → false
  } catch (err) {
    logger.warn(`[Reward] grant failed (${event})`, {
      userId,
      referenceKey,
      error: (err as Error).message,
    });
    return false;
  }
}
