# IR-KPA-SERVICE-ADMIN-OPERATOR-ROLE-MAPPING-V1

> **KPA 서비스 Admin / Operator 역할 매핑 조사 보고서**
> 작성일: 2026-03-04
> 상태: READ-ONLY 조사 완료

---

## 1. 조사 목적

KPA 서비스의 Admin / Operator 역할이 3개 서비스 계층(KPA-a, KPA-b, KPA-c)에서 어떻게 매핑·적용되는지 확인하여, 후속 WO(WO-KPA-B, WO-KPA-C)의 기초 자료를 확보한다.

---

## 2. 역할 체계 개요

### 2.1 역할 소스 (Dual-Layer)

| 소스 | 저장소 | 용도 |
|------|--------|------|
| **Platform Roles** | `role_assignments` → JWT `user.roles[]` | 서비스 전역 접근 제어 |
| **Membership Roles** | `kpa_members.role` | 분회 내 조직 역할 |
| **Store Ownership** | `organization_members.role='owner'` | 매장 운영 접근 |

### 2.2 KPA 역할 목록

```
Platform Level (users.roles[]):
├── kpa:admin           — KPA 플랫폼 전체 관리자
├── kpa:operator        — KPA 플랫폼 운영자
├── kpa:district_admin  — 지구 관리자
├── kpa:branch_admin    — 분회 관리자
├── kpa:branch_operator — 분회 운영자
├── kpa:pharmacist      — 약사 (커뮤니티 활동)
└── kpa:student         — 학생 (커뮤니티 활동)

Membership Level (kpa_members.role):
├── admin    — 분회 관리자 (Level 3)
├── operator — 분회 운영자 (Level 2)
└── member   — 일반 회원 (Level 1)
```

### 2.3 Service Scope Guard 설정

**파일:** `packages/security-core/src/service-configs.ts`

```typescript
KPA_SCOPE_CONFIG = {
  serviceKey: 'kpa',
  allowedRoles: ['kpa:admin', 'kpa:operator', 'kpa:district_admin',
                 'kpa:branch_admin', 'kpa:branch_operator'],
  platformBypass: false,   // ⚠️ platform:super_admin도 KPA 리소스 접근 불가
  blockedServicePrefixes: ['platform', 'neture', 'glycopharm', 'cosmetics', 'glucoseview'],
};
```

**핵심:** `platformBypass: false` — KPA는 플랫폼으로부터 완전 격리됨.

---

## 3. KPA-a: API 라우트 가드 매핑

**파일:** `apps/api-server/src/routes/kpa/kpa.routes.ts`

### 3.1 Admin 전용 (requireKpaScope('kpa:admin'))

| HTTP | 경로 | 기능 |
|------|------|------|
| ALL | `/organizations/*` | 조직 CRUD |
| ALL | `/members/*` | 회원 관리 & 승인 |
| ALL | `/applications/*` | 가입 신청 처리 |
| ALL | `/admin/*` | 관리자 대시보드 |
| ALL | `/admin/force-assets/*` | 강제 자산 관리 |
| POST | `/forum/categories` | 포럼 카테고리 생성 |
| PUT | `/forum/categories/:id` | 포럼 카테고리 수정 |
| DELETE | `/forum/categories/:id` | 포럼 카테고리 삭제 |
| GET | `/district/:id/branches-summary` | 지구 분회 현황 |
| GET | `/district/:id/overview-summary` | 지구 KPI 요약 |
| GET | `/operator/audit-logs` | 감사 로그 조회 |
| PATCH | `/instructor-qualifications/:id/approve` | 강사 자격 승인 |
| PATCH | `/instructor-qualifications/:id/reject` | 강사 자격 거부 |
| PATCH | `/instructor-qualifications/:id/revision` | 강사 자격 보완 요청 |

### 3.2 Operator 접근 가능 (requireKpaScope('kpa:operator'))

| HTTP | 경로 | 기능 |
|------|------|------|
| ALL | `/operator/*` | 운영자 대시보드 |
| ALL | `/operator/product-applications/*` | 상품 판매 신청 관리 |
| ALL | `/groupbuy-admin/*` | 공동구매 관리 |
| POST | `/news` | 뉴스 작성 |
| PUT | `/news/:id` | 뉴스 수정 |
| DELETE | `/news/:id` | 뉴스 삭제 |
| GET | `/forum/moderation` | 포럼 모더레이션 큐 |
| POST | `/forum/moderation/:type/:id` | 콘텐츠 모더레이션 |

### 3.3 Branch Admin (verifyBranchAdmin)

`kpa:admin` 바이패스 또는 `kpa_members.role='admin'` + branchId 일치

| HTTP | 경로 | 기능 |
|------|------|------|
| GET | `/branches/:branchId/pending-members` | 대기 회원 목록 |
| PATCH | `/branches/:branchId/pending-members/:id/approve` | 회원 가입 승인 |
| PATCH | `/branches/:branchId/pending-members/:id/reject` | 회원 가입 거부 |

### 3.4 인증만 필요 (requireAuth)

| HTTP | 경로 | 기능 |
|------|------|------|
| ALL | `/store-hub/*` | 매장 허브 |
| ALL | `/pharmacy/*` | 약국 매장 설정/상품/자료실/이벤트/QR |
| ALL | `/store-playlists/*` | 매장 재생목록 |
| ALL | `/store-contents/*` | 매장 콘텐츠 |
| ALL | `/store-assets/*` | 매장 자산 제어 |
| ALL | `/stores/*` | 매장 채널(Tablet/Blog/Template) |
| GET | `/me/membership` | 내 회원 정보 |

### 3.5 공개 (optionalAuth / 인증 불요)

| HTTP | 경로 | 기능 |
|------|------|------|
| GET | `/forum/posts`, `/forum/categories` | 포럼 읽기 |
| GET | `/news` | 뉴스 읽기 |
| GET | `/groupbuy` | 공동구매 카탈로그 |
| GET | `/organization` | 조직 공개 정보 |
| GET | `/lms/*` | LMS 과정/수강 |
| GET | `/home` | 홈 페이지 데이터 |
| GET | `/health` | 헬스체크 |

---

## 4. KPA-b: Admin Dashboard 구조

**경로:** `services/web-kpa-society/src/`

### 4.1 라우트 계층

```
/operator/*              → PLATFORM_ROLES (kpa:admin OR kpa:operator)
/demo/admin/*            → AdminAuthGuard (kpa:admin OR membershipRole=admin)
/branch-services/:id/admin/*    → BranchAdminAuthGuard
/branch-services/:id/operator/* → BranchOperatorAuthGuard
/demo/intranet/*         → IntranetAuthGuard (PLATFORM_ROLES)
```

### 4.2 Operator Dashboard (/operator)

**Guard:** `RoleGuard` — `PLATFORM_ROLES = ['kpa:admin', 'kpa:operator']`

| 경로 | 메뉴명 | Admin | Operator |
|------|--------|:-----:|:--------:|
| `/operator` | 5-Block 대시보드 | ✅ | ✅ |
| `/operator/ai-report` | AI 리포트 | ✅ | ✅ |
| `/operator/forum-management` | 포럼 관리 | ✅ | ✅ |
| `/operator/forum-analytics` | 포럼 통계 | ✅ | ✅ |
| `/operator/content` | 콘텐츠 관리 | ✅ | ✅ |
| `/operator/signage/content` | 사이니지 허브 | ✅ | ✅ |
| `/operator/legal` | 약관 관리 | ✅ | ✅ |
| `/operator/audit-logs` | 감사 로그 | ✅ | ✅ |
| `/operator/news` | 공지사항 | ✅ | ✅ |
| `/operator/docs` | 자료실 | ✅ | ✅ |
| `/operator/forum` | 게시판 | ✅ | ✅ |
| `/operator/members` | 회원 관리 | ✅ | ✅ |
| `/operator/organization-requests` | 조직 요청 | ✅ | ✅ |
| `/operator/pharmacy-requests` | 약국 서비스 신청 | ✅ | ✅ |
| `/operator/product-applications` | 상품 판매 신청 | ✅ | ✅ |
| `/operator/operators` | 운영자 관리 | ✅ | ❌ (kpa:admin 전용) |

### 4.3 Admin Dashboard (/demo/admin)

**Guard:** `AdminAuthGuard` — `kpa:admin` OR `membershipRole='admin'`

| 경로 | 메뉴명 |
|------|--------|
| `/admin` | 대시보드 |
| `/admin/kpa-dashboard` | 플랫폼 운영 |
| `/admin/divisions` | 분회 관리 |
| `/admin/members` | 회원 관리 |
| `/admin/committee-requests` | 위원회 관리 |
| `/admin/annual-report` | 신상신고 |
| `/admin/fee` | 연회비 |
| `/admin/officers` | 임원 관리 |
| `/admin/settings` | 설정 |

### 4.4 Branch Admin (/branch-services/:branchId/admin)

**Guard:** `BranchAdminAuthGuard` — `kpa:admin` 바이패스 또는 `kpaMembership.organizationId === branchId && kpaMembership.role === 'admin'`

| 경로 | 메뉴명 |
|------|--------|
| `.../admin` | 대시보드 |
| `.../admin/officers` | 임원 관리 |
| `.../admin/groupbuy-status` | 공동구매 현황 |
| `.../admin/settings` | 분회 설정 |

### 4.5 Branch Operator (/branch-services/:branchId/operator)

**Guard:** `BranchOperatorAuthGuard` — `kpa:admin` 바이패스 또는 `kpaMembership.role ∈ {'operator', 'admin'}`

| 경로 | 메뉴명 |
|------|--------|
| `.../operator` | 대시보드 |
| `.../operator/news` | 공지사항 |
| `.../operator/forum` | 게시판 |
| `.../operator/docs` | 자료실 |
| `.../operator/forum-management` | 포럼 관리 |
| `.../operator/signage/content` | 콘텐츠 허브 |
| `.../operator/operators` | 운영자 관리 |

### 4.6 역할 기반 라우팅

**파일:** `services/web-kpa-society/src/lib/auth-utils.ts`

```
kpa:admin OR kpa:operator → /operator (5-Block 대시보드)
membershipRole='admin'    → /branch-services (분회 관리)
membershipRole='operator' → /branch-services (분회 운영)
일반 사용자               → /dashboard
```

---

## 5. KPA-c: Store Operations 현재 상태

### 5.1 접근 제어 방식

매장 운영은 **역할 기반이 아닌 소유권 기반** 접근 제어 사용:

```
requireStoreOwner = createRequireStoreOwner(dataSource)

검증 순서:
1. KPA platform roles 확인 (kpa:admin, kpa:operator, kpa:branch_admin, kpa:branch_operator)
   → 있으면 첫 번째 organization_id 반환
2. organization_members 테이블에서 role='owner' 확인
   → 있으면 해당 organization_id 반환
3. 둘 다 없으면 → 403
```

**파일:** `apps/api-server/src/utils/store-owner.utils.ts`

### 5.2 매장 기능 목록 (13개 카테고리, ~53 엔드포인트)

| 기능 | 엔드포인트 수 | 인증 패턴 |
|------|:----------:|----------|
| Store Hub | 1 | requireAuth |
| 약국 설정 | 2 | owner |
| 상품 관리 | 8 | owner |
| 자료실 | 4 | owner |
| 이벤트 | 4 | owner |
| QR 코드 | 7 | owner |
| POP 생성 | 1 | owner |
| 재생목록 | 8 | owner/public |
| 채널 상품 | 4 | owner |
| 매장 콘텐츠 | 2 | owner |
| 매장 자산 | 3 | owner |
| QR 인쇄 | 3 | owner |
| 매장 템플릿 | 2 | public/owner |

### 5.3 Admin / Operator 구분

**현재 상태: Admin과 Operator 구분이 없음**

- 모든 매장 기능은 `requireStoreOwner` 단일 가드 사용
- `kpa:admin`과 `kpa:operator` 모두 동일한 접근 권한
- `kpa:branch_admin`과 `kpa:branch_operator`도 동일
- 역할별 기능 제한이 없음

---

## 6. 발견 사항 및 제안

### 6.1 KPA-a (API 라우트) — 정상

| 항목 | 상태 | 비고 |
|------|:----:|------|
| Admin/Operator 분리 | ✅ | `requireKpaScope` 역할 파라미터로 명확히 분리 |
| 가드 일관성 | ✅ | 모든 보호 엔드포인트에 scope guard 적용 |
| 플랫폼 격리 | ✅ | `platformBypass: false` |

### 6.2 KPA-b (Admin Dashboard) — 부분 미비

| 항목 | 상태 | 비고 |
|------|:----:|------|
| Operator 대시보드 | ✅ | 5-Block 구조, PLATFORM_ROLES 가드 |
| Admin/Operator 메뉴 구분 | ⚠️ | `/operator/operators` 만 kpa:admin 전용, 나머지 공유 |
| 감사 로그 UI | ⚠️ | 프론트에서 PLATFORM_ROLES로 허용하나, API는 kpa:admin 전용 |

**불일치 포인트:**
- `/operator/audit-logs`: 프론트엔드는 `PLATFORM_ROLES` (admin+operator) 허용, API는 `kpa:admin` 전용
- → Operator가 UI에서 감사 로그 메뉴 접근 시 API 403 발생 가능

### 6.3 KPA-c (Store Operations) — 개선 필요

| 항목 | 상태 | 비고 |
|------|:----:|------|
| 소유권 기반 접근 | ✅ | 동작 정상 |
| Admin/Operator 구분 | ❌ | 역할 구분 없이 동일 접근 |
| 위험 작업 보호 | ❌ | 삭제/설정 변경에 대한 역할 레벨 체크 없음 |

---

## 7. KPA 서비스 권한 모델 제안

### 7.1 목표 구조

```
Platform Admin (kpa:admin):
  ├── 조직 구조 관리 (CRUD)
  ├── 포럼 카테고리 관리
  ├── 감사 로그 조회
  ├── 운영자 관리
  ├── 강사 자격 승인/거부
  └── 매장 전체: 설정 변경 + 삭제 포함

Platform Operator (kpa:operator):
  ├── 콘텐츠 CRUD (뉴스, 자료)
  ├── 포럼 모더레이션
  ├── 상품/약국 신청 처리
  ├── 공동구매 관리
  └── 매장 전체: 조회 + 생성 + 수정 (삭제/설정 변경 제한)

Branch Admin (kpa_members.role='admin'):
  ├── 분회 회원 승인/거부
  ├── 분회 설정
  ├── 분회 임원 관리
  └── 매장: 소유 매장만

Branch Operator (kpa_members.role='operator'):
  ├── 분회 콘텐츠 관리
  ├── 분회 포럼 관리
  └── 매장: 소유 매장만
```

### 7.2 후속 WO 연계

| WO | 범위 | 우선순위 |
|----|------|:--------:|
| **WO-KPA-B-ADMIN-OPERATOR-STRUCTURE-FIX-V1** | KPA-b 감사로그 메뉴 Admin 전용 분리, Operator 메뉴 정리 | P1 |
| **WO-KPA-C-ADMIN-OPERATOR-IMPLEMENTATION-V1** | KPA-c Store Operations에 역할별 기능 제한 적용 | P2 |

---

## 8. 주요 파일 참조

### API 서버
- `apps/api-server/src/routes/kpa/kpa.routes.ts` — KPA 전체 라우트 정의
- `packages/security-core/src/service-configs.ts` — KPA Scope Guard 설정
- `apps/api-server/src/utils/store-owner.utils.ts` — 매장 소유권 접근 제어
- `apps/api-server/src/routes/kpa/middleware/kpa-org-role.middleware.ts` — 조직 역할 미들웨어
- `apps/api-server/src/routes/kpa/middleware/branch-scope.middleware.ts` — 분회 스코프 검증

### 프론트엔드 (web-kpa-society)
- `services/web-kpa-society/src/lib/role-constants.ts` — 역할 상수 SSOT
- `services/web-kpa-society/src/lib/auth-utils.ts` — 역할 기반 라우팅
- `services/web-kpa-society/src/routes/OperatorRoutes.tsx` — Operator 대시보드 라우트
- `services/web-kpa-society/src/routes/AdminRoutes.tsx` — Admin 대시보드 라우트
- `services/web-kpa-society/src/routes/BranchAdminRoutes.tsx` — 분회 관리자 라우트
- `services/web-kpa-society/src/routes/BranchOperatorRoutes.tsx` — 분회 운영자 라우트
- `services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx` — Admin 가드
- `services/web-kpa-society/src/components/branch-admin/BranchAdminAuthGuard.tsx` — 분회 Admin 가드
- `services/web-kpa-society/src/components/branch-operator/BranchOperatorAuthGuard.tsx` — 분회 Operator 가드
- `services/web-kpa-society/src/components/auth/RoleGuard.tsx` — 범용 역할 가드

---

*IR-KPA-SERVICE-ADMIN-OPERATOR-ROLE-MAPPING-V1 완료*
*조사자: Claude Code*
*일자: 2026-03-04*
