/**
 * Partner AI Builder Hooks
 *
 * AI 루틴 생성 관련 훅 (PHARMACEUTICAL 차단 포함)
 *
 * @package @o4o/partner-ai-builder
 */

import type { AllowedIndustry, GeneratedRoutine } from '../backend/services/AiRoutineBuilderService.js';

// ========================================
// Event Types
// ========================================

export interface AiRoutineGeneratedEvent {
  partnerId: string;
  routineId?: string;
  industry: AllowedIndustry;
  routineGoal: string;
  stepCount: number;
  productCount: number;
  generatedAt: Date;
}

export interface AiRoutineSavedEvent {
  partnerId: string;
  routineId: string;
  industry: AllowedIndustry;
  savedAt: Date;
}

export interface AiBlockedAttemptEvent {
  partnerId: string;
  attemptedIndustry: string;
  blockedProducts: string[];
  reason: string;
  attemptedAt: Date;
}

// ========================================
// Validation Hooks
// ========================================

/**
 * 루틴 생성 전 검증 훅 (PHARMACEUTICAL 차단 - Hook 레벨)
 */
export async function beforeAiRoutineCreate(
  partnerId: string,
  industry: string,
  productIds: string[]
): Promise<{
  canCreate: boolean;
  errors: string[];
  warnings: string[];
  blockedProducts: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const blockedProducts: string[] = [];

  // 1. PHARMACEUTICAL 산업군 차단
  if (industry === 'PHARMACEUTICAL') {
    errors.push('PHARMACEUTICAL 산업군은 AI 루틴 생성이 허용되지 않습니다. 의약품 관련 콘텐츠는 전문 약사의 검토가 필요합니다.');
    return { canCreate: false, errors, warnings, blockedProducts };
  }

  // 2. 유효한 산업군 확인
  if (!['COSMETICS', 'HEALTH', 'GENERAL'].includes(industry)) {
    errors.push(`지원되지 않는 산업군입니다: ${industry}`);
    return { canCreate: false, errors, warnings, blockedProducts };
  }

  // 3. 제품이 없는 경우 경고
  if (productIds.length === 0) {
    warnings.push('제품 없이 루틴을 생성합니다. 제품을 추가하면 더 구체적인 루틴을 생성할 수 있습니다.');
  }

  return { canCreate: true, errors, warnings, blockedProducts };
}

/**
 * 루틴 생성 후 훅
 */
export async function afterAiRoutineCreate(
  event: AiRoutineGeneratedEvent
): Promise<void> {
  console.log('[Partner AI Builder] Routine generated:', event);
  // TODO: 통계 기록, 알림 발송 등
}

/**
 * 루틴 저장 전 검증 훅
 */
export async function beforeAiRoutineSave(
  partnerId: string,
  routine: GeneratedRoutine
): Promise<{
  canSave: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // PHARMACEUTICAL 제품이 포함되어 있는지 확인
  if (routine.industry === 'PHARMACEUTICAL' as any) {
    errors.push('PHARMACEUTICAL 루틴은 저장할 수 없습니다.');
    return { canSave: false, errors };
  }

  // 최소 단계 수 확인
  if (routine.steps.length < 1) {
    errors.push('루틴에 최소 1개 이상의 단계가 필요합니다.');
    return { canSave: false, errors };
  }

  return { canSave: true, errors };
}

/**
 * 루틴 저장 후 훅
 */
export async function afterAiRoutineSave(
  event: AiRoutineSavedEvent
): Promise<void> {
  console.log('[Partner AI Builder] Routine saved:', event);
  // TODO: Partner Activity 기록
}

/**
 * PHARMACEUTICAL 차단 시도 기록 훅
 */
export async function onPharmaceuticalBlocked(
  event: AiBlockedAttemptEvent
): Promise<void> {
  console.warn('[Partner AI Builder] PHARMACEUTICAL attempt blocked:', event);
  // TODO: 보안 로그 기록, 관리자 알림
}

// ========================================
// Export
// ========================================

export const partnerAiBuilderHooks = {
  beforeAiRoutineCreate,
  afterAiRoutineCreate,
  beforeAiRoutineSave,
  afterAiRoutineSave,
  onPharmaceuticalBlocked,
};
