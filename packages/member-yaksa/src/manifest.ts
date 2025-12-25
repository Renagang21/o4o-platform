/**
 * Member-Yaksa Extension App Manifest
 *
 * 약사회 회원용 앱 (관리자가 아닌 약사 회원 대상)
 * - 프로필 관리 (본인 정보)
 * - 약국 정보 관리
 * - 홈 대시보드 (통합 알림/공지)
 *
 * @package @o4o/member-yaksa
 * @version 1.0.0
 */

/* =========================================================================
 * POLICY FIXATION (정책 고정)
 *
 * ⚠️ 이 주석은 삭제 금지
 * ⚠️ Phase 1 이후 모든 구현은 아래 정책을 따른다
 * =========================================================================
 *
 * 1. pharmacistLicenseNumber (면허번호)
 *    - 약사 고유 식별자
 *    - 조회만 가능 (READ-ONLY)
 *    - 사용자 직접 수정 불가
 *    - 수정은 관리자(membership-yaksa) 앱에서만 가능
 *    - 표시 형식: "XXXX-XXXX" (마스킹 옵션 적용 가능)
 *
 * 2. Pharmacy Information (약국 정보)
 *    - 약사 본인만 수정 가능
 *    - 관리자(Admin)도 수정 불가
 *    - 수정 시 반드시 "본인 책임" 안내 표시 필수
 *    - 수정 가능 필드: 약국명, 주소, 연락처, 운영시간
 *    - 수정 불가 필드: 약국 등록번호 (READ-ONLY)
 *
 * 3. Home UX Priority (홈 화면 우선순위)
 *    위에서 아래 순서로 표시:
 *    1) Organization Notice (지부/분회 공지)
 *    2) Groupbuy (공동구매 - 참여 중/신규)
 *    3) LMS (필수 교육 - 미이수/마감 임박)
 *    4) Forum (게시판 - 새 글/인기글)
 *    5) Banner (홍보/이벤트)
 *
 * 4. Permission Scope (권한 범위)
 *    - 본인 데이터만 조회/수정 가능
 *    - 타인 데이터 접근 불가
 *    - 조직(지부/분회) 공지/공동구매는 소속 기준 필터링
 *
 * ========================================================================= */

export const memberYaksaManifest = {
  // ===== 필수 기본 정보 =====
  id: 'member-yaksa',
  appId: 'member-yaksa',
  displayName: '약사 회원앱',
  version: '1.0.0',
  appType: 'extension' as const,
  status: 'development' as const,
  description: '약사회 회원용 앱 - 프로필, 약국정보, 홈 대시보드',

  // ===== 대상 사용자 =====
  targetUsers: ['pharmacist', 'pharmacy_member'],

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core', 'membership-yaksa'],
    optional: ['lms-yaksa', 'forum-yaksa', 'groupbuy-yaksa'],
  },

  // ===== 소유 테이블 =====
  // Phase 0: 테이블 없음 (membership-yaksa의 데이터 활용)
  ownsTables: [],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: false, // 데이터 삭제 불가 (membership-yaksa 소유)
    autoBackup: false,
  },

  // ===== 백엔드 =====
  backend: {
    entities: [],
    services: ['MemberYaksaService'],
    controllers: ['MemberYaksaController'],
    routesExport: 'createMemberYaksaRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    member: {
      pages: [
        { path: '/member/home', component: 'MemberHome' },
        { path: '/member/profile', component: 'MemberProfile' },
        { path: '/member/pharmacy', component: 'PharmacyInfo' },
      ],
    },
  },

  // ===== 라이프사이클 =====
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
  },

  // ===== 권한 정의 =====
  permissions: [
    {
      id: 'member.profile.view',
      name: '내 프로필 조회',
      description: '본인 프로필 정보를 조회할 수 있는 권한',
      category: 'member',
      scope: 'self', // 본인만
    },
    {
      id: 'member.profile.edit',
      name: '내 프로필 수정',
      description: '본인 프로필 정보를 수정할 수 있는 권한',
      category: 'member',
      scope: 'self',
    },
    {
      id: 'member.pharmacy.view',
      name: '내 약국정보 조회',
      description: '본인 약국 정보를 조회할 수 있는 권한',
      category: 'member',
      scope: 'self',
    },
    {
      id: 'member.pharmacy.edit',
      name: '내 약국정보 수정',
      description: '본인 약국 정보를 수정할 수 있는 권한 (본인 책임)',
      category: 'member',
      scope: 'self',
    },
    {
      id: 'member.home.view',
      name: '홈 대시보드 조회',
      description: '홈 대시보드를 조회할 수 있는 권한',
      category: 'member',
      scope: 'self',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    member: [
      {
        id: 'member-home',
        label: '홈',
        icon: 'home',
        path: '/member/home',
        order: 1,
      },
      {
        id: 'member-profile',
        label: '내 정보',
        icon: 'user',
        path: '/member/profile',
        order: 2,
      },
      {
        id: 'member-pharmacy',
        label: '약국 정보',
        icon: 'building',
        path: '/member/pharmacy',
        order: 3,
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: ['MemberYaksaService'],
    types: [],
    events: ['member.profile.updated', 'member.pharmacy.updated'],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    // 홈 화면 UX 우선순위 (Policy Fixation에 따름)
    homeUxPriority: [
      'organization_notice',
      'groupbuy',
      'lms',
      'forum',
      'banner',
    ],
    // 프로필 설정
    profileSettings: {
      licenseNumberReadOnly: true, // 면허번호 읽기 전용
      pharmacyEditableByMember: true, // 약국정보 본인 수정 가능
      pharmacyEditRequiresConfirmation: true, // 수정 시 확인 필요
    },
  },
};

// Legacy export for backward compatibility
export const manifest = memberYaksaManifest;
export default memberYaksaManifest;
