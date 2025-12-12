/**
 * Partner Extension System
 *
 * Extension hooks for:
 * - validatePartnerVisibility: 클릭/전환 가시성 필터링
 * - beforePartnerCommissionApply: 커미션 적용 전 검증
 * - beforePartnerSettlementCreate: 정산 배치 생성 전 검증
 *
 * @package @o4o/partner-core
 */

import type { Partner } from './entities/Partner.entity.js';
import type { PartnerClick } from './entities/PartnerClick.entity.js';
import type { PartnerConversion } from './entities/PartnerConversion.entity.js';
import type { PartnerCommission } from './entities/PartnerCommission.entity.js';

/**
 * 가시성 검증 컨텍스트
 */
export interface PartnerVisibilityContext {
  partnerId: string;
  productType?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
}

/**
 * 가시성 검증 결과
 */
export interface PartnerVisibilityResult {
  visible: boolean;
  reason?: string;
}

/**
 * 커미션 적용 컨텍스트
 */
export interface PartnerCommissionContext {
  partnerId: string;
  conversionId: string;
  productType?: string;
  orderAmount: number;
  commissionRate: number;
  metadata?: Record<string, any>;
}

/**
 * 커미션 적용 결과
 */
export interface PartnerCommissionResult {
  allowed: boolean;
  reason?: string;
  modifiedRate?: number;
  bonusAmount?: number;
}

/**
 * 정산 생성 컨텍스트
 */
export interface PartnerSettlementContext {
  partnerId: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  commissionCount: number;
  metadata?: Record<string, any>;
}

/**
 * 정산 생성 결과
 */
export interface PartnerSettlementResult {
  allowed: boolean;
  reason?: string;
  deductionAmount?: number;
  deductionReason?: string;
}

/**
 * Extension Hook 타입 정의
 */
export type ValidatePartnerVisibilityHook = (
  context: PartnerVisibilityContext
) => Promise<PartnerVisibilityResult>;

export type BeforePartnerCommissionApplyHook = (
  context: PartnerCommissionContext
) => Promise<PartnerCommissionResult>;

export type BeforePartnerSettlementCreateHook = (
  context: PartnerSettlementContext
) => Promise<PartnerSettlementResult>;

/**
 * Extension Registry
 */
interface PartnerExtensionRegistry {
  validatePartnerVisibility: ValidatePartnerVisibilityHook[];
  beforePartnerCommissionApply: BeforePartnerCommissionApplyHook[];
  beforePartnerSettlementCreate: BeforePartnerSettlementCreateHook[];
}

const extensionRegistry: PartnerExtensionRegistry = {
  validatePartnerVisibility: [],
  beforePartnerCommissionApply: [],
  beforePartnerSettlementCreate: [],
};

/**
 * Extension 등록
 */
export function registerPartnerExtension(
  hookName: 'validatePartnerVisibility',
  handler: ValidatePartnerVisibilityHook
): void;
export function registerPartnerExtension(
  hookName: 'beforePartnerCommissionApply',
  handler: BeforePartnerCommissionApplyHook
): void;
export function registerPartnerExtension(
  hookName: 'beforePartnerSettlementCreate',
  handler: BeforePartnerSettlementCreateHook
): void;
export function registerPartnerExtension(
  hookName: keyof PartnerExtensionRegistry,
  handler: any
): void {
  extensionRegistry[hookName].push(handler);
}

/**
 * Extension 해제
 */
export function unregisterPartnerExtension(
  hookName: 'validatePartnerVisibility',
  handler: ValidatePartnerVisibilityHook
): void;
export function unregisterPartnerExtension(
  hookName: 'beforePartnerCommissionApply',
  handler: BeforePartnerCommissionApplyHook
): void;
export function unregisterPartnerExtension(
  hookName: 'beforePartnerSettlementCreate',
  handler: BeforePartnerSettlementCreateHook
): void;
export function unregisterPartnerExtension(
  hookName: keyof PartnerExtensionRegistry,
  handler: any
): void {
  const index = extensionRegistry[hookName].indexOf(handler);
  if (index > -1) {
    extensionRegistry[hookName].splice(index, 1);
  }
}

/**
 * 가시성 검증 Hook 실행
 *
 * 등록된 모든 hook 중 하나라도 visible: false를 반환하면 전체 결과가 false
 */
export async function executeValidatePartnerVisibility(
  context: PartnerVisibilityContext
): Promise<PartnerVisibilityResult> {
  const hooks = extensionRegistry.validatePartnerVisibility;

  for (const hook of hooks) {
    try {
      const result = await hook(context);
      if (!result.visible) {
        return result;
      }
    } catch (error) {
      console.error('Error in validatePartnerVisibility hook:', error);
      // Hook 오류 시 기본적으로 허용 (fail-open)
    }
  }

  return { visible: true };
}

/**
 * 커미션 적용 전 Hook 실행
 *
 * 등록된 모든 hook 중 하나라도 allowed: false를 반환하면 전체 결과가 false
 * modifiedRate, bonusAmount는 마지막 hook의 값이 적용됨
 */
export async function executeBeforePartnerCommissionApply(
  context: PartnerCommissionContext
): Promise<PartnerCommissionResult> {
  const hooks = extensionRegistry.beforePartnerCommissionApply;

  let finalResult: PartnerCommissionResult = { allowed: true };

  for (const hook of hooks) {
    try {
      const result = await hook(context);
      if (!result.allowed) {
        return result;
      }

      // 마지막으로 수정된 값 적용
      if (result.modifiedRate !== undefined) {
        finalResult.modifiedRate = result.modifiedRate;
      }
      if (result.bonusAmount !== undefined) {
        finalResult.bonusAmount = result.bonusAmount;
      }
    } catch (error) {
      console.error('Error in beforePartnerCommissionApply hook:', error);
    }
  }

  return finalResult;
}

/**
 * 정산 생성 전 Hook 실행
 *
 * 등록된 모든 hook 중 하나라도 allowed: false를 반환하면 전체 결과가 false
 * deductionAmount는 합산됨
 */
export async function executeBeforePartnerSettlementCreate(
  context: PartnerSettlementContext
): Promise<PartnerSettlementResult> {
  const hooks = extensionRegistry.beforePartnerSettlementCreate;

  let totalDeduction = 0;
  const deductionReasons: string[] = [];

  for (const hook of hooks) {
    try {
      const result = await hook(context);
      if (!result.allowed) {
        return result;
      }

      // 공제 금액 합산
      if (result.deductionAmount && result.deductionAmount > 0) {
        totalDeduction += result.deductionAmount;
        if (result.deductionReason) {
          deductionReasons.push(result.deductionReason);
        }
      }
    } catch (error) {
      console.error('Error in beforePartnerSettlementCreate hook:', error);
    }
  }

  return {
    allowed: true,
    deductionAmount: totalDeduction,
    deductionReason: deductionReasons.join('; '),
  };
}

/**
 * 모든 Extension 해제 (테스트용)
 */
export function clearAllPartnerExtensions(): void {
  extensionRegistry.validatePartnerVisibility = [];
  extensionRegistry.beforePartnerCommissionApply = [];
  extensionRegistry.beforePartnerSettlementCreate = [];
}

/**
 * 기본 제공 Hook: 의약품 제외
 *
 * productType이 'pharmaceutical'인 경우 파트너 클릭/전환/커미션을 차단합니다.
 */
export const pharmaceuticalExclusionVisibilityHook: ValidatePartnerVisibilityHook = async (
  context
) => {
  if (context.productType === 'pharmaceutical') {
    return {
      visible: false,
      reason: 'Pharmaceutical products are excluded from partner program',
    };
  }
  return { visible: true };
};

export const pharmaceuticalExclusionCommissionHook: BeforePartnerCommissionApplyHook = async (
  context
) => {
  if (context.productType === 'pharmaceutical') {
    return {
      allowed: false,
      reason: 'Commission not allowed for pharmaceutical products',
    };
  }
  return { allowed: true };
};

/**
 * 기본 Hook 활성화
 *
 * partner-core 초기화 시 호출하여 기본 필터링 활성화
 */
export function enableDefaultPartnerHooks(): void {
  registerPartnerExtension(
    'validatePartnerVisibility',
    pharmaceuticalExclusionVisibilityHook
  );
  registerPartnerExtension(
    'beforePartnerCommissionApply',
    pharmaceuticalExclusionCommissionHook
  );
}

/**
 * 기본 Hook 비활성화
 */
export function disableDefaultPartnerHooks(): void {
  unregisterPartnerExtension(
    'validatePartnerVisibility',
    pharmaceuticalExclusionVisibilityHook
  );
  unregisterPartnerExtension(
    'beforePartnerCommissionApply',
    pharmaceuticalExclusionCommissionHook
  );
}
