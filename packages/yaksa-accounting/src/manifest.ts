/**
 * yaksa-accounting Manifest
 *
 * Digital Cashbook for Yaksa Division/Branch Office Expenses
 * (지부/분회 사무실 운영비 디지털 출납 기록장)
 *
 * === 정체성 고정 (이후 Phase에서 변경 불가) ===
 *
 * yaksa-accounting은 지부/분회 사무실 운영비(지출)를 기록하고,
 * 연 1회 총회에 설명하기 위한 내부 금전출납 기록장이다.
 *
 * - ERP 아님 ❌
 * - 복식부기 아님 ❌
 * - 세무/급여 시스템 아님 ❌
 * - 단식 기록 + 집계 + 출력 ⭕
 *
 * =====================================================================
 * yaksa-accounting Scope Fixation
 * =====================================================================
 *
 * [Scope Included]
 * - Office Expense Recording (Cashbook)
 *   - Entertainment / Meeting Expense (접대비/회의비)
 *   - General & Admin Expense (일반관리비)
 *   - Supplies / Misc Expense (소모품/잡비)
 *   - Officer Business Expense (임원 업무비)
 * - Monthly Lock (No Edit after Closing)
 * - Category-based Summary (1 Depth)
 * - Excel / PDF Export for General Assembly
 *
 * [Scope Excluded - DO NOT IMPLEMENT]
 * - Double Entry / Debit-Credit (복식부기)
 * - Account Code Tree (계정과목 트리)
 * - Budget Planning / Control (예산 관리)
 * - Income Management / Membership Fee (수입/회비 관리)
 * - Tax / Payroll / Withholding (세무/급여/원천세)
 * - Electronic Approval Workflow (전자결재)
 * - Bank / Card Auto Sync (은행/카드 연동)
 *
 * === 이 주석은 삭제/수정 금지 ===
 * =====================================================================
 */

import type { AppManifest } from '@o4o/types';

export const manifest: AppManifest = {
  appId: 'yaksa-accounting',
  name: 'Yaksa Accounting',
  displayName: '약사 회계 (출납 기록)',
  description: 'Digital Cashbook for Yaksa Division/Branch Office Expenses',
  version: '0.0.1',

  /**
   * App Type: extension
   * - organization-core 확장
   * - 지부/분회 스코프에서만 동작
   */
  type: 'extension',

  /**
   * 대상 사용자
   * - 지부 관리자
   * - 분회 관리자
   */
  targetUsers: ['division-admin', 'branch-admin'],

  /**
   * 조직 스코프
   * - division (지부)
   * - branch (분회)
   */
  organizationScope: ['division', 'branch'],

  /**
   * 의존성
   */
  dependencies: {
    apps: [
      'organization-core',
      'membership-yaksa',
    ],
  },

  /**
   * 선택적 의존성 (연동 대상)
   * 별도 필드로 관리 (AppManifest [key: string]: any 활용)
   */
  optionalApps: [
    'annualfee-yaksa',  // 수입 참조용 (READ ONLY)
    'yaksa-admin',       // 조회 연계
  ],

  /**
   * Admin 메뉴 스켈레톤
   * Phase 0: 구조만 정의, 실제 화면은 Phase 1 이후
   */
  adminMenu: {
    path: '/admin/yaksa/accounting',
    label: '회계 (출납)',
    icon: 'Calculator',
    children: [
      {
        path: '/admin/yaksa/accounting/expenses',
        label: '지출 기록',
        description: 'Office expense recording',
      },
      {
        path: '/admin/yaksa/accounting/summary',
        label: '월/연간 요약',
        description: 'Monthly/yearly summary',
      },
      {
        path: '/admin/yaksa/accounting/export',
        label: '엑셀/PDF 내보내기',
        description: 'Export for General Assembly',
      },
    ],
  },

  /**
   * 권한 정의
   */
  permissions: [
    'yaksa-accounting.view',
    'yaksa-accounting.create',
    'yaksa-accounting.close-month',
    'yaksa-accounting.export',
  ],

  /**
   * Lifecycle 경로
   */
  lifecycle: {
    install: './lifecycle/install',
    activate: './lifecycle/activate',
    deactivate: './lifecycle/deactivate',
  },
};

export default manifest;
