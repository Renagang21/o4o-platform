# Organization-Core App 설계 개요

**버전**: v1.0
**작성일**: 2025-11-30
**상태**: 설계 완료
**목적**: 약사회 지부/분회 서비스 및 전사 도메인의 조직 단위 운영 지원

---

## 📋 목차

1. [개요](#1-개요)
2. [아키텍처 원칙](#2-아키텍처-원칙)
3. [핵심 기능](#3-핵심-기능)
4. [구성 요소](#4-구성-요소)
5. [도메인 연동](#5-도메인-연동)
6. [개발 로드맵](#6-개발-로드맵)

---

## 1. 개요

### 1.1 배경

O4O Platform은 **독립 웹서버 + App Store 기반 Core/Extension 구조**로 설계된 멀티 도메인 플랫폼입니다.

현재 다음 서비스들이 조직 단위 운영을 필요로 합니다:

- **약사회 서비스**: 본부 - 지부 - 분회 계층 구조
- **화장품 서비스**: 본사 - 매장 계층 구조
- **여행자 서비스**: 본부 - 지역지부 계층 구조
- **LMS 서비스**: 조직별 교육 운영
- **포럼 서비스**: 조직별 게시판/커뮤니티
- **드롭쉬핑 서비스**: 조직별 공동구매

### 1.2 목적

**organization-core**는 모든 도메인 서비스에서 재사용 가능한 **전사 조직 엔진(Core Domain)**입니다.

다음 기능을 제공합니다:

1. **조직 계층 구조 관리** (본부 → 지부 → 분회)
2. **조직-회원 연결** (OrganizationMember)
3. **조직 기반 권한 관리** (RoleAssignment scopeType/scopeId)
4. **도메인 확장 연동** (Forum/LMS/Dropshipping organizationId)
5. **App Store 기반 설치/삭제** (Lifecycle hooks)

### 1.3 설계 범위

| 구분 | 포함 여부 | 비고 |
|------|-----------|------|
| Organization 엔티티 | ✅ 포함 | 계층 구조 지원 (parentId, path, level) |
| OrganizationMember 엔티티 | ✅ 포함 | 회원-조직 다대다 연결 |
| RoleAssignment 확장 | ✅ 포함 | scopeType/scopeId 추가 |
| 기본 CRUD API | ✅ 포함 | `/api/organization` |
| App Store manifest | ✅ 포함 | Core App 등록 |
| Lifecycle hooks | ✅ 포함 | install/uninstall |
| CPT/ACF 정의 | ⚠️ 선택적 | 엔티티 중심, CPT는 필요시 추가 |
| 도메인 Extension 가이드 | ✅ 포함 | Forum/LMS/Dropshipping 연동 규칙 |

---

## 2. 아키텍처 원칙

### 2.1 설계 원칙

#### ✅ Core/Extension 패턴
- **organization-core**: 범용 조직 엔진 (도메인 중립)
- **organization-yaksa**: 약사회 전용 확장 (면허번호, 약국정보)
- **organization-cosmetics**: 화장품 전용 확장 (매장정보, 재고)

#### ✅ 독립 웹서버 구조
- 각 서비스(약사회/화장품/여행자)는 **별도 서버에 배포**
- organization-core는 **각 서버 내부**에서 독립 운영
- **SaaS/Multi-tenant 구조 아님**

#### ✅ App Store 플러그인 방식
- organization-core는 **App Store에 등록된 Core App**
- 설치/삭제 시 lifecycle hooks 실행
- 테이블 소유권 관리 (ownsTables)

#### ✅ 엔티티 중심 설계
- CPT/ACF는 선택적 사용
- 핵심 데이터는 **TypeORM Entity 기반**
- JSON metadata로 확장성 확보

### 2.2 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                     O4O Platform                            │
│                 (독립 웹서버 아키텍처)                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼──────┐    ┌────────▼─────┐    ┌─────────▼────────┐
│  약사회 서버  │    │  화장품 서버  │    │   여행자 서버     │
│ (13.x.x.x)  │    │ (14.x.x.x)   │    │  (15.x.x.x)      │
└──────────────┘    └──────────────┘    └──────────────────┘
       │                   │                     │
       │ App Store         │ App Store           │ App Store
       │ Plugins           │ Plugins             │ Plugins
       │                   │                     │
       ▼                   ▼                     ▼
┌──────────────────────────────────────────────────────────┐
│              organization-core (Core App)                │
│  • Organization Entity                                   │
│  • OrganizationMember Entity                             │
│  • RoleAssignment Extension                              │
│  • Hierarchy Management                                  │
└──────────────────────────────────────────────────────────┘
       │                   │                     │
       ▼                   ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌─────────────────┐
│organization- │    │organization- │    │organization-    │
│yaksa         │    │cosmetics     │    │traveler         │
│(Extension)   │    │(Extension)   │    │(Extension)      │
└──────────────┘    └──────────────┘    └─────────────────┘
```

---

## 3. 핵심 기능

### 3.1 조직 계층 구조 관리

```typescript
// 예시: 약사회 조직 구조
대한약사회 (본부, level=0, path="/national")
 ├─ 서울지부 (지부, level=1, path="/national/seoul")
 │   ├─ 강남분회 (분회, level=2, path="/national/seoul/gangnam")
 │   └─ 강서분회 (분회, level=2, path="/national/seoul/gangseo")
 └─ 부산지부 (지부, level=1, path="/national/busan")
     └─ 해운대분회 (분회, level=2, path="/national/busan/haeundae")
```

**지원 기능:**
- parentId 기반 계층 구조
- path 자동 생성
- level 자동 계산
- 하위 조직 조회
- 상위 조직 추적

### 3.2 조직-회원 연결

```typescript
// 예시: 회원의 조직 소속
{
  userId: "user-kim",
  organizationId: "org-seoul-gangnam",
  role: "manager",
  isPrimary: true,  // 주 소속 조직
  joinedAt: "2025-01-15"
}
```

**지원 기능:**
- 한 회원이 여러 조직 소속 가능
- 주 소속 조직(isPrimary) 지정
- 조직별 역할(role) 관리
- 가입/탈퇴 이력 관리

### 3.3 조직 기반 권한 관리

```typescript
// 예시: 서울지부 관리자 권한
{
  userId: "user-park",
  role: "admin",
  scopeType: "organization",
  scopeId: "org-seoul"
}

// 예시: 전체 관리자 권한
{
  userId: "user-choi",
  role: "super_admin",
  scopeType: "global",
  scopeId: null
}
```

**지원 기능:**
- 전역 권한(scopeType: 'global')
- 조직 권한(scopeType: 'organization')
- 조직별 역할 할당
- 계층적 권한 상속

### 3.4 도메인 연동

**Forum 연동:**
```typescript
// 조직별 게시글 작성
{
  postId: "post-123",
  organizationId: "org-seoul-gangnam",  // 강남분회 전용 게시글
  title: "강남분회 정기모임 공지"
}
```

**Dropshipping 연동:**
```typescript
// 조직별 상품 등록
{
  productId: "prod-456",
  organizationId: "org-seoul",  // 서울지부 전용 상품
  name: "서울지부 공동구매 상품"
}
```

**LMS 연동:**
```typescript
// 조직별 교육과정
{
  courseId: "course-789",
  organizationId: "org-busan",  // 부산지부 전용 교육
  title: "부산지부 보수교육"
}
```

---

## 4. 구성 요소

### 4.1 엔티티 (Entities)

| 엔티티 | 역할 | 주요 필드 |
|--------|------|-----------|
| **Organization** | 조직 마스터 | id, name, code, type, parentId, level, path |
| **OrganizationMember** | 조직-회원 연결 | organizationId, userId, role, isPrimary |
| **RoleAssignment (확장)** | 조직 권한 | scopeType, scopeId |

자세한 내용: [organization_entities.md](./organization_entities.md)

### 4.2 API

| API | Method | 역할 |
|-----|--------|------|
| `/api/organization` | GET | 조직 목록 조회 |
| `/api/organization/:id` | GET | 조직 상세 조회 |
| `/api/organization` | POST | 조직 생성 |
| `/api/organization/:id` | PUT | 조직 수정 |
| `/api/organization/:id` | DELETE | 조직 삭제 |
| `/api/organization/:id/members` | GET | 조직 멤버 목록 |
| `/api/organization/:id/members` | POST | 조직 멤버 추가 |

자세한 내용: [organization_api_design.md](./organization_api_design.md)

### 4.3 App Store 구조

**manifest.ts:**
```typescript
{
  appId: "organization-core",
  type: "core",
  ownsTables: ["organizations", "organization_members"],
  permissions: ["organization.read", "organization.manage"],
  dependencies: []
}
```

**lifecycle hooks:**
- `install.ts`: 테이블 생성 + 기본 조직 생성
- `uninstall.ts`: 데이터 보존/삭제 정책

자세한 내용: [organization_app_manifest.md](./organization_app_manifest.md)

---

## 5. 도메인 연동

### 5.1 Forum 연동

**ForumPost.organizationId 추가:**
```typescript
@Entity('forum_posts')
class ForumPost {
  @Column({ nullable: true })
  organizationId?: string;
}
```

**자동 카테고리 생성:**
- 조직 생성 시 자동으로 조직 전용 카테고리 생성
- Extension App: `organization-forum`

### 5.2 Dropshipping 연동

**Product.organizationId 추가:**
```typescript
@Entity('products')
class Product {
  @Column({ nullable: true })
  organizationId?: string;
}
```

**조직별 가격/재고:**
- metadata에 조직별 가격 정보 저장
- Extension App: `organization-groupbuy`

### 5.3 LMS 연동

**Course.organizationId 추가:**
```typescript
@Entity('courses')
class Course {
  @Column({ nullable: true })
  organizationId?: string;
}
```

**조직별 교육 운영:**
- 조직별 수강생 관리
- Extension App: `organization-lms`

자세한 내용: [organization_integration_map.md](./organization_integration_map.md)

---

## 6. 개발 로드맵

### Phase 1: 기본 구조 구현 (1-2주)
- ✅ organization-core 설계 완료
- ⏳ Organization/OrganizationMember 엔티티 구현
- ⏳ 기본 CRUD API 개발
- ⏳ App Store manifest 등록

### Phase 2: RBAC 확장 (1주)
- ⏳ RoleAssignment scopeType/scopeId 추가
- ⏳ 조직 권한 검증 로직
- ⏳ 계층적 권한 상속 구현

### Phase 3: 도메인 연동 (2주)
- ⏳ Forum organizationId 추가
- ⏳ Dropshipping organizationId 추가
- ⏳ LMS organizationId 추가
- ⏳ UI 필터링 구현

### Phase 4: Extension 개발 (2주)
- ⏳ organization-yaksa Extension 개발
- ⏳ organization-cosmetics Extension 개발
- ⏳ Extension 개발 가이드 작성

### Phase 5: 테스트 & 배포 (1주)
- ⏳ 통합 테스트
- ⏳ 프로덕션 배포
- ⏳ 문서화 완료

---

## 7. 참고 문서

### 설계 문서
- [organization_entities.md](./organization_entities.md) - 엔티티 설계 + ERD
- [organization_api_design.md](./organization_api_design.md) - API 명세
- [organization_rbac_scope.md](./organization_rbac_scope.md) - RBAC 확장
- [organization_extension_rules.md](./organization_extension_rules.md) - Extension 개발 가이드
- [organization_app_manifest.md](./organization_app_manifest.md) - App Store manifest
- [organization_lifecycle_hooks.md](./organization_lifecycle_hooks.md) - Lifecycle hooks
- [organization_integration_map.md](./organization_integration_map.md) - 도메인 연동 규칙

### 조사 문서
- [../../audit/member_organization/00_phase2_summary.md](../../audit/member_organization/00_phase2_summary.md) - Phase 2 조사 요약
- [../../audit/domain_phase3/00_phase3_summary.md](../../audit/domain_phase3/00_phase3_summary.md) - Phase 3 조사 요약
- [../../audit/lms/lms_phase3_integration_audit.md](../../audit/lms/lms_phase3_integration_audit.md) - LMS 연동 조사

---

**작성자**: Claude Code
**최종 업데이트**: 2025-11-30
**버전**: v1.0
**상태**: 설계 완료
