import { AppManifest } from './types/context';

/**
 * Organization-Core App Manifest
 *
 * App Store에 등록되는 organization-core 앱의 메타데이터
 */
export const manifest: AppManifest = {
  // 기본 정보
  appId: 'organization-core',
  name: 'Organization Core',
  version: '1.0.0',
  type: 'core',
  description:
    '전사 조직 관리 시스템 (Core Domain) - 계층 구조, 멤버 관리, 조직 스코프 권한',

  // 작성자 정보
  author: {
    name: 'O4O Platform',
    email: 'dev@o4o-platform.com',
    url: 'https://o4o-platform.com',
  },

  // 의존성 (Core App이므로 의존성 없음)
  dependencies: [],

  // 소유 테이블
  ownsTables: ['organizations', 'organization_members'],

  // 권한 정의
  permissions: [
    {
      id: 'organization.read',
      name: '조직 읽기',
      description: '조직 정보를 조회할 수 있는 권한',
      category: 'organization',
    },
    {
      id: 'organization.manage',
      name: '조직 관리',
      description: '조직 생성/수정/삭제 권한',
      category: 'organization',
    },
    {
      id: 'organization.member.read',
      name: '조직 멤버 읽기',
      description: '조직 멤버 목록 조회 권한',
      category: 'organization',
    },
    {
      id: 'organization.member.manage',
      name: '조직 멤버 관리',
      description: '조직 멤버 추가/삭제/수정 권한',
      category: 'organization',
    },
  ],

  // 라이프사이클 훅
  lifecycle: {
    install: './lifecycle/install',
    activate: './lifecycle/activate',
    deactivate: './lifecycle/deactivate',
    uninstall: './lifecycle/uninstall',
  },

  // API 라우트
  routes: [
    {
      path: '/api/organization',
      method: 'GET',
      handler: './controllers/OrganizationController.list',
      permission: 'organization.read',
    },
    {
      path: '/api/organization/:id',
      method: 'GET',
      handler: './controllers/OrganizationController.get',
      permission: 'organization.read',
    },
    {
      path: '/api/organization',
      method: 'POST',
      handler: './controllers/OrganizationController.create',
      permission: 'organization.manage',
    },
    {
      path: '/api/organization/:id',
      method: 'PUT',
      handler: './controllers/OrganizationController.update',
      permission: 'organization.manage',
    },
    {
      path: '/api/organization/:id',
      method: 'DELETE',
      handler: './controllers/OrganizationController.delete',
      permission: 'organization.manage',
    },
    {
      path: '/api/organization/:id/descendants',
      method: 'GET',
      handler: './controllers/OrganizationController.getDescendants',
      permission: 'organization.read',
    },
    {
      path: '/api/organization/:id/members',
      method: 'GET',
      handler: './controllers/OrganizationController.getMembers',
      permission: 'organization.member.read',
    },
    {
      path: '/api/organization/:id/members',
      method: 'POST',
      handler: './controllers/OrganizationController.addMember',
      permission: 'organization.member.manage',
    },
    {
      path: '/api/organization/:id/members/:userId',
      method: 'PUT',
      handler: './controllers/OrganizationController.updateMember',
      permission: 'organization.member.manage',
    },
    {
      path: '/api/organization/:id/members/:userId',
      method: 'DELETE',
      handler: './controllers/OrganizationController.removeMember',
      permission: 'organization.member.manage',
    },
    {
      path: '/api/organization/my',
      method: 'GET',
      handler: './controllers/OrganizationController.getMyOrganizations',
      permission: 'organization.read',
    },
  ],

  // CPT 정의 (선택적 - organization은 엔티티 중심이므로 CPT 불필요)
  customPostTypes: [],

  // ACF 정의 (선택적)
  advancedCustomFields: [],

  // 블록 정의 (선택적)
  blocks: [],

  // 설정
  settings: {
    enableHierarchy: true, // 계층 구조 활성화
    maxDepth: 5, // 최대 계층 깊이
    defaultOrganizationType: 'branch', // 기본 조직 유형
  },
};
