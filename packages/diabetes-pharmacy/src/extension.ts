/**
 * DiabetesCare Pharmacy Extension
 *
 * DiabetesCare Core와의 공식 연결 지점
 * DropshippingCoreExtension 패턴을 사용하지 않음 (diabetes-core 전용)
 *
 * @package @o4o/diabetes-pharmacy
 */

/**
 * Extension Context
 * lifecycle 함수들에서 사용하는 컨텍스트
 */
export interface DiabetesPharmacyContext {
  pharmacyId: string;
  pharmacyName?: string;
  licenseNumber?: string;
  isActive: boolean;
}

/**
 * Pharmacy Role Validation Result
 */
export interface PharmacyRoleValidationResult {
  valid: boolean;
  pharmacyId?: string;
  pharmacyName?: string;
  errors: string[];
}

/**
 * DiabetesCare Pharmacy Extension
 *
 * 약국 역할 검증 및 Core 연결을 담당
 */
export const diabetesPharmacyExtension = {
  appId: 'diabetes-pharmacy',
  displayName: '혈당관리 약국',
  version: '0.1.0',

  /**
   * Extension 활성화 시 호출
   * 약국 역할 검증 수행
   */
  async onActivate(context: DiabetesPharmacyContext): Promise<void> {
    console.log(`[diabetes-pharmacy] Extension activating for pharmacy: ${context.pharmacyId}`);

    // 약국 역할 검증
    const validation = await this.validatePharmacyRole(context.pharmacyId);
    if (!validation.valid) {
      throw new Error(`Pharmacy validation failed: ${validation.errors.join(', ')}`);
    }

    console.log(`[diabetes-pharmacy] Extension activated successfully`);
  },

  /**
   * Extension 비활성화 시 호출
   */
  async onDeactivate(context: DiabetesPharmacyContext): Promise<void> {
    console.log(`[diabetes-pharmacy] Extension deactivating for pharmacy: ${context.pharmacyId}`);
    // 정리 작업 (필요시)
    console.log(`[diabetes-pharmacy] Extension deactivated`);
  },

  /**
   * 약국 역할 검증
   * 사용자가 약국 역할을 가지고 있는지 확인
   */
  async validatePharmacyRole(pharmacyId: string): Promise<PharmacyRoleValidationResult> {
    // Phase 2에서는 기본 검증만 수행
    // 실제 검증 로직은 pharmaceutical-core와 연동 시 확장
    if (!pharmacyId) {
      return {
        valid: false,
        errors: ['약국 ID가 필요합니다.'],
      };
    }

    // 기본적으로 유효하다고 가정 (실제 구현 시 DB 조회)
    return {
      valid: true,
      pharmacyId,
      pharmacyName: undefined, // 실제 구현 시 조회
      errors: [],
    };
  },

  /**
   * Pattern에서 Action 권한 검증
   * 약국이 특정 Action을 실행할 권한이 있는지 확인
   */
  async canExecuteAction(
    pharmacyId: string,
    actionType: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Phase 2에서는 모든 Action 허용
    // 실제 구현 시 Action Type별 권한 검증
    const allowedActions = ['COACHING', 'DISPLAY', 'SURVEY', 'COMMERCE', 'NONE'];

    if (!allowedActions.includes(actionType)) {
      return {
        allowed: false,
        reason: `알 수 없는 Action Type: ${actionType}`,
      };
    }

    return { allowed: true };
  },
};

export default diabetesPharmacyExtension;
