# Organization-Forum Integration Extension

조직(Organization) 구조와 포럼(Forum) 시스템을 통합하는 Extension입니다.

## 개요

organization-core와 forum-app을 연동하여 조직 기반 포럼 기능을 제공합니다.

## 주요 기능

### 1. 자동 카테고리 생성

조직 생성 시 기본 포럼 카테고리를 자동으로 생성합니다.

**기본 카테고리:**
- 공지사항
- 자유게시판
- 질문/답변
- 자료실

### 2. 조직 범위 권한 관리

organization-core의 RBAC 시스템과 통합하여 조직 기반 포럼 권한을 관리합니다.

- **forum.write**: 게시글/댓글 작성 권한
- **forum.manage**: 게시글/댓글 관리 권한
- **organization.manage**: 카테고리 관리 권한

### 3. 계층적 권한 상속

상위 조직 권한이 하위 조직에 자동 적용됩니다.

**예시:**
```
서울지부 admin → 강남분회/강서분회 자동 관리 권한
```

## 설치

Extension은 organization-core와 forum-app 설치 후 자동으로 활성화됩니다.

## 사용 예제

### 조직 생성 시 카테고리 자동 생성

```typescript
import { OrganizationForumService } from '@o4o-extensions/organization-forum';

const service = new OrganizationForumService(dataSource);

// 조직 생성 후 자동으로 카테고리 생성
await service.createDefaultCategoriesForOrganization(
  'org-seoul',
  '서울지부',
  'user-admin'
);
```

### 조직 전용 카테고리 생성

```typescript
await service.createCategoryForOrganization('org-seoul', {
  name: '서울지부 전용 공지',
  description: '서울지부 회원 전용 공지사항',
  createdBy: 'user-admin',
  isOrganizationExclusive: true,
  requireApproval: true,
  accessLevel: 'member'
});
```

### 조직 삭제 시 카테고리 정리

```typescript
// 조직 삭제 시 연관된 카테고리도 삭제
await service.deleteCategoriesForOrganization('org-seoul');
```

## 설정

`manifest.ts`에서 다음 설정을 변경할 수 있습니다:

### autoCreateDefaultCategories

조직 생성 시 기본 카테고리 자동 생성 여부

- **타입**: boolean
- **기본값**: true

### defaultCategories

자동 생성할 기본 카테고리 목록

- **타입**: string[]
- **기본값**: `['공지사항', '자유게시판', '질문/답변', '자료실']`

## 의존성

- **@o4o/organization-core**: 조직 관리 및 RBAC
- **@o4o-apps/forum**: 포럼 기본 기능

## 버전

- **현재 버전**: 0.1.0
- **최소 요구사항**:
  - organization-core: Phase 2 (RBAC 확장)
  - forum-app: organizationId 지원

## 라이선스

MIT

---

**작성일**: 2025-11-30
**상태**: Forum Phase 3 구현 완료 ✅
