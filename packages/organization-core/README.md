# Organization-Core

**Version**: 1.0.0
**Type**: Core App
**Status**: Phase 1 - Implementation Complete ✅

---

## 📋 개요

organization-core는 O4O Platform의 **전사 조직 관리 시스템 (Core Domain)**입니다.

약사회 지부/분회 서비스 및 모든 도메인 서비스에서 재사용 가능한 범용 조직 엔진을 제공합니다.

### 핵심 기능

- ✅ **조직 계층 구조 관리** (본부 → 지부 → 분회)
- ✅ **조직-회원 연결** (OrganizationMember)
- ✅ **조직 스코프 권한 관리** (RoleAssignment scopeType/scopeId)
- ✅ **도메인 확장 연동** (Forum/LMS/Dropshipping organizationId)
- ✅ **App Store 기반 설치/삭제** (Lifecycle hooks)

---

## 🏗 아키텍처

### Core/Extension 패턴

```
organization-core (범용 조직 엔진)
 ├─ organization-yaksa (약사회 전용 확장)
 ├─ organization-cosmetics (화장품 전용 확장)
 └─ organization-traveler (여행자 전용 확장)
```

### 독립 웹서버 구조

- 각 서비스(약사회/화장품/여행자)는 **별도 서버에 배포**
- organization-core는 **각 서버 내부**에서 독립 운영
- **SaaS/Multi-tenant 구조 아님**

---

## 📦 구성 요소

### 엔티티 (Entities)

| 엔티티 | 테이블명 | 역할 |
|--------|----------|------|
| **Organization** | `organizations` | 조직 마스터 데이터 (계층 구조) |
| **OrganizationMember** | `organization_members` | 조직-회원 다대다 연결 |

### 서비스 (Services)

| 서비스 | 역할 |
|--------|------|
| **OrganizationService** | 조직 CRUD, 계층 구조 관리 |
| **OrganizationMemberService** | 조직 멤버 관리, isPrimary 처리 |

### API

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/organization` | 조직 목록 조회 |
| GET | `/api/organization/:id` | 조직 상세 조회 |
| POST | `/api/organization` | 조직 생성 |
| PUT | `/api/organization/:id` | 조직 수정 |
| DELETE | `/api/organization/:id` | 조직 삭제 |
| GET | `/api/organization/:id/members` | 조직 멤버 목록 |
| POST | `/api/organization/:id/members` | 조직 멤버 추가 |

---

## 🚀 설치 및 사용

### 설치

```typescript
// App Store를 통한 설치
await appManager.install('organization-core', {
  seedDefaultData: true  // 기본 조직 (본부) 생성
});
```

### 조직 생성 예시

```typescript
import { OrganizationService } from '@o4o/organization-core';

const service = new OrganizationService(dataSource);

// 서울지부 생성
const seoul = await service.createOrganization({
  name: '서울지부',
  code: 'SEOUL',
  type: 'division',
  parentId: 'org-national',  // 본부 ID
  metadata: {
    address: '서울특별시 강남구 테헤란로 123',
    phone: '02-1234-5678'
  }
});
// → level: 1, path: "/national/seoul" 자동 계산
```

### 조직 멤버 추가 예시

```typescript
import { OrganizationMemberService } from '@o4o/organization-core';

const memberService = new OrganizationMemberService(dataSource);

// 회원을 서울지부 관리자로 추가
await memberService.addMember('org-seoul', {
  userId: 'user-kim',
  role: 'admin',
  isPrimary: true,  // 주 소속 조직
  metadata: {
    position: '지부장',
    department: '총무부'
  }
});
```

---

## 📂 프로젝트 구조

```
packages/organization-core/
├── src/
│   ├── entities/
│   │   ├── Organization.ts           # 조직 엔티티
│   │   └── OrganizationMember.ts     # 조직 멤버 엔티티
│   ├── services/
│   │   ├── OrganizationService.ts
│   │   └── OrganizationMemberService.ts
│   ├── controllers/
│   │   └── OrganizationController.ts
│   ├── types/
│   │   ├── dtos.ts                   # DTO 정의
│   │   └── context.ts                # Lifecycle context
│   ├── lifecycle/
│   │   ├── install.ts                # 설치 훅
│   │   ├── activate.ts               # 활성화 훅
│   │   ├── deactivate.ts             # 비활성화 훅
│   │   └── uninstall.ts              # 삭제 훅
│   ├── manifest.ts                   # App Store manifest
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔑 권한 (Permissions)

| 권한 ID | 이름 | 설명 |
|---------|------|------|
| `organization.read` | 조직 읽기 | 조직 정보 조회 |
| `organization.manage` | 조직 관리 | 조직 생성/수정/삭제 |
| `organization.member.read` | 조직 멤버 읽기 | 조직 멤버 목록 조회 |
| `organization.member.manage` | 조직 멤버 관리 | 조직 멤버 추가/삭제/수정 |

---

## 🔗 도메인 연동

### Forum 연동

```typescript
// ForumPost에 organizationId 추가
@Entity('forum_posts')
class ForumPost {
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;
}

// 조직별 게시글 조회
const posts = await forumPostRepo.find({
  where: { organizationId: 'org-seoul' }
});
```

### LMS 연동

```typescript
// Course에 organizationId 추가
@Entity('courses')
class Course {
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;
}
```

### Dropshipping 연동

```typescript
// Product에 organizationId 추가
@Entity('products')
class Product {
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ type: 'jsonb', nullable: true })
  organizationPricing?: Record<string, number>;  // 조직별 가격
}
```

---

## 📖 설계 문서

- [organization_core_overview.md](../../docs/dev/design/organization-core/organization_core_overview.md) - 전체 개요
- [organization_entities.md](../../docs/dev/design/organization-core/organization_entities.md) - 엔티티 설계 + ERD
- [organization_api_design.md](../../docs/dev/design/organization-core/organization_api_design.md) - API 명세
- [organization_rbac_scope.md](../../docs/dev/design/organization-core/organization_rbac_scope.md) - RBAC 확장
- [organization_extension_rules.md](../../docs/dev/design/organization-core/organization_extension_rules.md) - Extension 개발 가이드
- [organization_app_manifest.md](../../docs/dev/design/organization-core/organization_app_manifest.md) - App Store manifest
- ~~organization_lifecycle_hooks.md~~ - Lifecycle install/uninstall 은퇴 (WO-O4O-ORGANIZATION-CORE-DEAD-LIFECYCLE-AND-DESTRUCTIVE-UNINSTALL-FINAL-RETIREMENT-V1) · 스키마 소유자 = api-server migration
- [organization_integration_map.md](../../docs/dev/design/organization-core/organization_integration_map.md) - 도메인 연동 규칙

---

## 📅 개발 로드맵

### Phase 1: 기본 구조 (완료 ✅)
- ✅ Organization/OrganizationMember 엔티티 구현
- ✅ 기본 CRUD API 개발
- ✅ App Store manifest 등록
- ✅ Lifecycle hooks 구현

### Phase 2: RBAC 확장 (예정)
- ⏳ RoleAssignment scopeType/scopeId 추가
- ⏳ 조직 권한 검증 로직
- ⏳ 계층적 권한 상속 구현

### Phase 3: 도메인 연동 (예정)
- ⏳ Forum organizationId 추가
- ⏳ Dropshipping organizationId 추가
- ⏳ LMS organizationId 추가
- ⏳ UI 필터링 구현

### Phase 4: Extension 개발 (예정)
- ⏳ organization-yaksa Extension 개발
- ⏳ organization-cosmetics Extension 개발

---

**작성일**: 2025-11-30
**버전**: 1.0.0
**상태**: Phase 1 Implementation Complete ✅
