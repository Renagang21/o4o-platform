/**
 * member-yaksa Manifest
 *
 * 약사회 회원 전용 앱
 * - 회원 프로필 관리
 * - 약국 정보 관리
 * - 통합 홈 화면
 *
 * @package @o4o-apps/member-yaksa
 * @version 1.0.0
 */

// =====================================================================
// 🔒 POLICY FIXATION - DO NOT DELETE OR MODIFY
// =====================================================================
/**
 * member-yaksa Policy Fixation
 *
 * 1. pharmacistLicenseNumber (약사 면허번호)
 *    - 약사 고유 식별자
 *    - 조회만 가능 (READ-ONLY)
 *    - 사용자 직접 수정 불가
 *    - 수정 필요 시 관리자에게 요청 (본회 확인 필수)
 *
 * 2. Pharmacy Information (약국 정보)
 *    - 약사 본인만 수정 가능
 *    - 관리자 수정 불가 (Privacy Protection)
 *    - 수정 시 "본인 책임" 안내 필수
 *    - 필드: 약국명, 주소, 연락처, 영업시간 등
 *
 * 3. Home UX Priority (홈 화면 우선순위)
 *    1) Organization Notice (지부/분회 공지)
 *    2) Groupbuy (공동구매 - 진행 중인 캠페인)
 *    3) LMS (필수 교육 - 미이수 항목)
 *    4) Forum (게시판 - 최신 글)
 *    5) Banner (배너 - 광고/이벤트)
 *
 * 4. Access Control (접근 제어)
 *    - 약사회 회원(pharmacist)만 접근 가능
 *    - 조직 멤버십 기반 인증
 *    - 지부/분회별 컨텐츠 스코프 적용
 *
 * ⚠️ 이 정책은 Phase 1 이후 모든 구현의 기준이 됩니다.
 * ⚠️ 정책 변경 시 반드시 Work Order를 통해 승인받아야 합니다.
 */
// =====================================================================

import type { AppManifest } from '@o4o/types';

/**
 * member-yaksa App Manifest
 */
export const manifest: AppManifest = {
  // =====================================================
  // Basic Information
  // =====================================================
  appId: 'member-yaksa',
  name: '약사회 회원',
  description: '약사회 회원 전용 앱 - 프로필, 약국 정보, 통합 홈',
  version: '1.0.0',

  // =====================================================
  // App Classification
  // =====================================================
  type: 'extension',

  // =====================================================
  // Dependencies
  // =====================================================
  dependencies: {
    apps: [
      'organization-core',   // 조직 관리 (지부/분회)
      'membership-yaksa',    // 회비 관리
      'lms-yaksa',          // 교육 관리
      'forum-yaksa',        // 게시판
      'groupbuy-yaksa',     // 공동구매
    ],
  },

  // =====================================================
  // Routes
  // =====================================================
  routes: [
    '/member/home',
    '/member/profile',
    '/member/pharmacy',
  ],

  // =====================================================
  // Permissions
  // =====================================================
  permissions: [
    'member:profile:read',
    'member:profile:write:self',
    'member:pharmacy:read',
    'member:pharmacy:write:self',
    'member:home:read',
  ],

  // =====================================================
  // Lifecycle Hooks
  // =====================================================
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
  },

  // =====================================================
  // Extended Properties (member-yaksa specific)
  // =====================================================
  /**
   * 대상 사용자: 약사회 회원 (약사)
   * - pharmacist: 약사 자격증 보유자
   * - pharmacy member: 약국 소속 회원
   */
  targetRoles: ['pharmacist', 'member'],

  /** Service group */
  serviceGroup: 'yaksa',

  /** Category */
  category: 'member',

  /** Tags */
  tags: ['yaksa', 'member', 'profile', 'pharmacy'],

  /** Development status */
  status: 'development',

  /** Route metadata */
  routeMetadata: {
    '/member/home': {
      name: '홈',
      description: '통합 홈 화면 - 공지, 공동구매, 교육, 게시판',
    },
    '/member/profile': {
      name: '내 정보',
      description: '회원 프로필 - 면허번호(읽기전용), 기본 정보',
    },
    '/member/pharmacy': {
      name: '약국 정보',
      description: '약국 정보 관리 - 본인만 수정 가능',
    },
  },
};

export default manifest;
