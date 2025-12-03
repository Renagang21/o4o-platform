import { User } from './User.js';
/**
 * 역할 할당 (Assignment)
 *
 * 승인된 역할을 사용자에게 실제로 할당합니다.
 * 권한 판정(RBAC)은 이 테이블의 `isActive = true` 레코드를 기준으로 합니다.
 *
 * 제약:
 * - 한 사용자는 동일 역할을 한 번만 active로 가질 수 있음
 *
 * @see 04_rbac_policy.md
 */
export declare class RoleAssignment {
    id: string;
    /**
     * 할당 대상 사용자
     */
    userId: string;
    user: User;
    /**
     * 역할
     *
     * 'admin' | 'supplier' | 'seller' | 'partner'
     */
    role: string;
    /**
     * 활성 상태
     *
     * RBAC 미들웨어는 isActive = true인 레코드만 권한으로 인정합니다.
     */
    isActive: boolean;
    /**
     * 유효 시작 시각
     *
     * 역할이 활성화된 시각
     */
    validFrom: Date;
    /**
     * 유효 종료 시각 (옵션)
     *
     * null이면 무기한 유효
     * 임시 권한 부여 시 사용
     */
    validUntil?: Date;
    /**
     * 할당 시각
     */
    assignedAt: Date;
    /**
     * 할당자 (관리자)
     */
    assignedBy?: string;
    assigner?: User;
    /**
     * 생성 시각
     */
    createdAt: Date;
    /**
     * 수정 시각
     */
    updatedAt: Date;
    /**
     * 현재 시점에 유효한 역할인지 체크
     */
    isValidNow(): boolean;
    /**
     * 역할 비활성화
     */
    deactivate(): void;
    /**
     * 역할 활성화
     */
    activate(): void;
    /**
     * 유효 기간 설정
     */
    setValidityPeriod(from: Date, until?: Date): void;
}
//# sourceMappingURL=RoleAssignment.d.ts.map