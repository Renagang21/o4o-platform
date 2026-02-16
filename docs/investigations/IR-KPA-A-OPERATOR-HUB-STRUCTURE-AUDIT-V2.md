# IR-KPA-A-OPERATOR-HUB-STRUCTURE-AUDIT-V2

> **조사 유형**: 구조 정합성 감사 (Structure Alignment Audit)
> **대상**: KPA-a Admin/Operator Hub 구조
> **조사일**: 2026-02-15
> **상태**: 완료

---

## 설계 의도 (Design Philosophy)

| 허브 | 철학 | 역할 |
|------|------|------|
| **Admin Hub** | 구조(Structure) + 정책(Policy) | 조직 생성, 역할 정의, 카테고리 생성, 감사 로그, 간사 관리 |
| **Operator Hub** | 실행(Execution) + 운영(Operations) | 콘텐츠 CRUD, 포럼 중재, 공동구매 운영, 대시보드 요약 |

---

## Track A: 실제 라우트 트리

### A-1. Admin 영역 (`kpa:admin` scope)

| 경로 | 메서드 | Guard | 기능 |
|------|--------|-------|------|
| `/admin/dashboard/stats` | GET | requireAuth + inline `isAdminOrOperator()` | 관리자 대시보드 통계 |
| `/admin/dashboard/recent-activities` | GET | requireAuth + inline check | 최근 활동 |
| `/admin/dashboard/organization-stats` | GET | requireAuth + inline check | 조직 통계 |
| `/admin/dashboard/member-stats` | GET | requireAuth + inline check | 회원 통계 |
| `/admin/dashboard/application-stats` | GET | requireAuth + inline check | 신청 통계 |
| `/organizations/*` | CRUD | requireAuth + requireKpaScope(sub-controller) | 조직 관리 |
| `/organizations` GET/POST | | requireScope('kpa:admin') | 조직 목록/생성 |
| `/members/*` | CRUD | requireAuth + requireScope(sub-controller) | 회원 관리 |
| `/members` GET | | requireScope('kpa:operator') | 회원 목록 조회 |
| `/members/:id/approve` PATCH | | requireScope('kpa:operator') | 회원 승인 |
| `/members/:id/role` PATCH | | requireScope('kpa:admin') | **역할 변경 (Admin only)** |
| `/applications/*` | CRUD | requireAuth + requireScope(sub-controller) | 신청서 관리 |
| `/applications/admin/all` GET | | requireScope('kpa:operator') | 전체 신청 목록 |
| `/applications/:id/approve` PATCH | | requireScope('kpa:operator') | 신청 승인 |
| `/applications/:id/reject` PATCH | | requireScope('kpa:operator') | 신청 거절 |
| `/join-inquiries/*` | CRUD | requireAuth + requireScope('kpa:admin') | 참여 문의 관리 |
| `/organization-join-requests/*` | CRUD | requireAuth + requireScope(mixed) | 조직 가입 요청 |
| `/stewards/*` | CRUD | requireAuth + requireScope('kpa:admin') | 간사 관리 |
| `/operator/audit-logs` | GET | requireScope('kpa:admin') | 감사 로그 조회 |
| `/forum/categories` POST/PUT/DELETE | | requireScope('kpa:admin') | 포럼 카테고리 구조 변경 |

### A-2. Operator 영역 (`kpa:operator` scope)

| 경로 | 메서드 | Guard | 기능 |
|------|--------|-------|------|
| `/operator/summary` | GET | authenticate + inline `isKpaOperator()` | 운영자 대시보드 요약 |
| `/groupbuy-admin/*` | CRUD | requireAuth + inline `isKpaOperator()` | 공동구매 운영 |
| `/news/admin/list` | GET | requireScope('kpa:operator') | 콘텐츠 관리 목록 |
| `/news` POST | | requireScope('kpa:operator') | 콘텐츠 생성 |
| `/news/:id` PUT | | requireScope('kpa:operator') | 콘텐츠 수정 |
| `/news/:id` DELETE | | requireScope('kpa:operator') | 콘텐츠 삭제 (soft) |
| `/forum/moderation` GET | | requireScope('kpa:operator') | 포럼 중재 큐 |
| `/forum/moderation/:type/:id` POST | | requireScope('kpa:operator') | 포럼 중재 실행 |

### A-3. Branch Admin 영역 (별도 guard)

| 경로 | 메서드 | Guard | 기능 |
|------|--------|-------|------|
| `/branch-admin/*` | CRUD | requireAuth + inline branch-level check | 분회 관리자 대시보드 |

### A-4. Authenticated (일반 사용자)

| 경로 | Guard | 기능 |
|------|-------|------|
| `/mypage/*` | authenticate | 마이페이지 |
| `/lms/enrollments`, `/lms/certificates` | authenticate | 수강/수료 |
| `/pharmacy/store/*`, `/pharmacy/products/*` | requireAuth + pharmacist check | 약국 관리 |
| `/store-hub/*` | requireAuth | 스토어 허브 |

### A-5. Public (인증 불필요)

| 경로 | 기능 |
|------|------|
| `/home/*` | 홈 페이지 데이터 |
| `/news` GET | 공지사항 조회 |
| `/forum` GET | 포럼 조회 |
| `/demo-forum/*` | 데모 포럼 |
| `/lms/courses` GET | 강좌 목록 |
| `/branches/*` | 분회 공개 정보 |
| `/organization/*` | 조직 공개 정보 |
| `/groupbuy` GET | 공동구매 조회 |
| `/resources/*` | 자료실 |

---

## Track B: 기능 배치 정합성 분석

### B-1. 정합 (설계 의도와 일치)

| 기능 | 현재 위치 | 의도 | 판정 |
|------|-----------|------|------|
| 조직 CRUD | Admin (`kpa:admin`) | 구조 | **정합** |
| 역할 변경 (`/:id/role`) | Admin (`kpa:admin`) | 정책 | **정합** |
| 포럼 카테고리 구조 변경 | Admin (`kpa:admin`) | 구조 | **정합** |
| 간사 관리 | Admin (`kpa:admin`) | 정책 | **정합** |
| 참여 문의 관리 | Admin (`kpa:admin`) | 정책 | **정합** |
| 감사 로그 조회 | Admin (`kpa:admin`) | 정책 | **정합** |
| 콘텐츠 CRUD (news) | Operator (`kpa:operator`) | 실행 | **정합** |
| 포럼 중재 | Operator (`kpa:operator`) | 운영 | **정합** |
| 공동구매 운영 | Operator (inline) | 운영 | **정합** |
| 운영자 대시보드 요약 | Operator (inline) | 운영 | **정합** |

### B-2. 부분 불일치 (Minor Misalignment)

| # | 기능 | 현재 Guard | 의도 배치 | 실제 위치 | 문제 |
|---|------|-----------|-----------|-----------|------|
| B2-1 | 회원 목록 조회 | `kpa:operator` | Admin (구조) | `/members` 라우트는 Admin 영역 mounted | **Guard가 operator이지만 마운트는 Admin 영역** — 모호함 |
| B2-2 | 회원 승인 | `kpa:operator` | 실행 | `/members/:id/approve` | Admin 경로에 마운트되어 있으나 Guard는 operator — **배치 모순** |
| B2-3 | 신청서 목록/승인/거절 | `kpa:operator` | 실행 | `/applications/admin/*` | Admin 경로명에 operator guard — **명명 혼란** |
| B2-4 | Admin Dashboard stats | `isAdminOrOperator()` inline | Admin only | `/admin/dashboard/*` | **Admin 경로인데 Operator도 접근 가능** — scope guard 미적용, inline 함수 사용 |

### B-3. 중대 불일치 (Major Misalignment)

| # | 기능 | 문제 | 심각도 |
|---|------|------|--------|
| B3-1 | `groupbuy-operator` controller | **requireKpaScope 미적용** — inline `isKpaOperator(userId)` 사용 (KpaMember 테이블 직접 조회). 표준 scope guard 우회. | **HIGH** |
| B3-2 | `operator-summary` controller | **requireKpaScope 미적용** — inline `isKpaOperator()` 사용 (`hasAnyServiceRole` 기반). 표준화 미완. | **HIGH** |
| B3-3 | `admin-dashboard` controller | **requireKpaScope 미적용** — inline `isAdminOrOperator()` 사용. Admin 전용 경로인데 operator도 통과. | **HIGH** |
| B3-4 | `branch-admin-dashboard` controller | **requireKpaScope 미적용** — inline role check. branch-level guard 별도 구현. | **MEDIUM** |

---

## Track C: 경계 위반 점검

### C-1. Scope Guard 일관성

| Controller | Guard 방식 | 표준 준수 |
|------------|-----------|----------|
| organization.controller | `requireScope('kpa:admin')` | **표준** |
| member.controller | `requireScope('kpa:admin'/'kpa:operator')` | **표준** |
| application.controller | `requireScope('kpa:operator')` | **표준** |
| steward.controller | `requireScope('kpa:admin')` | **표준** |
| join-inquiry.controller | `requireScope('kpa:admin')` | **표준** |
| organization-join-request.controller | `requireAuth` + inline `isAdminOrOperator()` | **비표준** |
| admin-dashboard.controller | inline `isAdminOrOperator()` | **비표준** |
| operator-summary.controller | inline `isKpaOperator()` | **비표준** |
| groupbuy-operator.controller | inline `isKpaOperator()` (KpaMember 기반) | **비표준** |
| branch-admin-dashboard.controller | inline role check | **비표준** |

**결과: 10개 컨트롤러 중 5개가 표준 scope guard 적용, 5개가 비표준 inline 검사**

### C-2. Operator → Admin API 경계 위반

| 테스트 | 결과 |
|--------|------|
| Operator가 `/organizations` POST 호출 | **차단됨** — `requireScope('kpa:admin')` |
| Operator가 `/members/:id/role` PATCH 호출 | **차단됨** — `requireScope('kpa:admin')` |
| Operator가 `/stewards/*` 호출 | **차단됨** — `requireScope('kpa:admin')` |
| Operator가 `/admin/dashboard/stats` 호출 | **통과됨** — inline `isAdminOrOperator()` 허용 |
| Operator가 `/join-inquiries/*` 호출 | **차단됨** — `requireScope('kpa:admin')` |

**1건의 경계 침투 발견: Admin Dashboard에 Operator 접근 가능**

### C-3. LMS Instructor 역할 부여 흐름 경계

| 경로 | Guard | 문제 |
|------|-------|------|
| `POST /lms/instructor/apply` | requireAuth only | 정상 — 누구나 지원 가능 |
| `GET /lms/instructor/applications` | `requireAdmin` | **`requireAdmin`은 플랫폼 레거시 guard** — `kpa:admin` 아님 |
| `POST /lms/instructor/applications/:id/approve` | `requireAdmin` | 동일 문제 — 레거시 guard |
| `POST /lms/instructor/applications/:id/reject` | `requireAdmin` | 동일 문제 — 레거시 guard |

### C-4. `requireInstructor` 미들웨어 경계 문제

```typescript
// requireInstructor.ts:21 — kpa:admin bypass 존재
if (userRoles.includes('kpa:admin')) {
  return next();
}
// :25-28 — platform:admin, platform:super_admin도 통과
const hasRole = await roleAssignmentService.hasAnyRole(userId, [
  'lms:instructor',
  'platform:admin',      // ← 교차 서비스 역할 허용
  'platform:super_admin', // ← 교차 서비스 역할 허용
]);
```

**문제: `platform:*` 역할이 KPA LMS 강사 기능을 통과함 — Cross-service boundary violation**

---

## Track D: 승인 흐름 정렬

### D-1. 강사 역할 부여 흐름

```
약사 → POST /lms/instructor/apply (requireAuth)
  ↓
Admin → GET /lms/instructor/applications (requireAdmin ← 레거시!)
  ↓
Admin → POST /lms/instructor/applications/:id/approve (requireAdmin ← 레거시!)
  ↓
RoleAssignment 테이블에 'lms:instructor' 추가
```

**문제점:**
1. `requireAdmin`은 `common/middleware/auth.middleware.ts`의 레거시 guard — `kpa:admin` scope가 아닌 플랫폼 `admin` 역할 확인
2. KPA 서비스 내 LMS인데 KPA scope guard가 아닌 플랫폼 admin guard 사용
3. WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1의 "KPA prefixed roles ONLY" 원칙 위반

### D-2. 회원 가입 승인 흐름

```
약사 → POST /members/apply (requireAuth)
  ↓
Operator → PATCH /members/:id/approve (requireScope('kpa:operator'))
  ↓
KpaMember status → 'active'
```

**판정: 정합** — Operator가 실행 단계(승인) 담당, 구조 변경(역할)은 Admin

### D-3. 조직 가입 요청 승인 흐름

```
약사 → POST /organization-join-requests (requireAuth)
  ↓
Admin/Operator → GET /organization-join-requests/pending (inline isAdminOrOperator)
  ↓
Admin/Operator → PATCH /:id/approve (inline isAdminOrOperator)
```

**문제: 표준 scope guard 미적용 — inline 함수**

---

## Track E: 허브 철학 종합 평가

### E-1. 종합 점수

| 평가 항목 | 점수 | 비고 |
|-----------|------|------|
| Admin = 구조/정책 원칙 준수 | **8/10** | 조직/역할/카테고리/간사 → 정합. Dashboard가 operator도 허용하여 -2 |
| Operator = 실행/운영 원칙 준수 | **9/10** | 콘텐츠/중재/공동구매/대시보드 → 정합. 명명 혼란(applications/admin) -1 |
| Scope Guard 표준화 | **5/10** | 10개 컨트롤러 중 5개만 표준 `requireKpaScope` 사용 |
| 경계 침투 방어 | **7/10** | Admin→Operator 분리 잘 됨, Dashboard 1건 침투, LMS guard 레거시 |
| LMS 통합 정합성 | **4/10** | `requireAdmin` 레거시, `platform:*` cross-service bypass 심각 |

### E-2. 발견된 문제 요약

| # | 심각도 | 문제 | 위치 |
|---|--------|------|------|
| 1 | **HIGH** | 5개 컨트롤러가 inline role check 사용 (scope guard 비표준) | admin-dashboard, operator-summary, groupbuy-operator, branch-admin, org-join-request |
| 2 | **HIGH** | LMS instructor 승인이 레거시 `requireAdmin` 사용 — KPA scope 미적용 | lms.routes.ts:460-466 |
| 3 | **HIGH** | `requireInstructor`가 `platform:admin`, `platform:super_admin` 허용 — cross-service bypass | requireInstructor.ts:26-28 |
| 4 | **MEDIUM** | Admin Dashboard에 Operator 접근 가능 (isAdminOrOperator inline) | admin-dashboard.controller.ts:141 |
| 5 | **MEDIUM** | `/members` 라우트가 Admin 영역에 마운트되었지만 operator scope guard 사용 | kpa.routes.ts:129 + member.controller.ts |
| 6 | **LOW** | `/applications/admin/all` — Admin 명명인데 operator guard | application.controller.ts:266-268 |
| 7 | **LOW** | `groupbuy-operator`가 `isKpaOperator(userId)` KpaMember 직접 조회 — 다른 컨트롤러와 불일치 | groupbuy-operator.controller.ts:106 |

### E-3. 프론트엔드 메뉴 (admin-dashboard)

admin-menu.static.tsx에서 KPA 관련 메뉴:

```
Yaksa (KPA)
├── Service Dashboard  → /admin/yaksa-hub    (YaksaAdminHub)
├── Forum              → /forum
├── AI Insight         → /pharmacy-ai-insight
└── CGM Patient Care   → /cgm-pharmacist
```

**관찰:**
- admin-dashboard는 플랫폼 전체 관리자용 — KPA의 Admin/Operator 허브와는 별개
- KPA 고유의 Admin/Operator 프론트엔드 (kpa-society-web)는 이 모노레포에 없음 (별도 배포)
- YaksaAdminHub는 약사회 행정 통합 대시보드로 6개 위젯 표시 — 설계 의도에 부합

---

## 권고 사항

### 즉시 정비 (P0)

1. **Scope Guard 표준화**: 5개 비표준 컨트롤러에 `requireKpaScope` 적용
   - `admin-dashboard.controller.ts`: `requireKpaScope('kpa:admin')` 적용
   - `operator-summary.controller.ts`: `requireKpaScope('kpa:operator')` 적용
   - `groupbuy-operator.controller.ts`: `requireKpaScope('kpa:operator')` 적용
   - `organization-join-request.controller.ts`: `requireKpaScope('kpa:admin')` 적용
   - `branch-admin-dashboard.controller.ts`: branch-level guard + `requireKpaScope` 병행

2. **LMS Instructor Guard 교체**: `requireAdmin` → `requireKpaScope('kpa:admin')`
   - `lms.routes.ts:460-466` 수정
   - `requireInstructor.ts`에서 `platform:*` bypass 제거

### 구조 정비 (P1)

3. **Admin Dashboard 경계 강화**: `isAdminOrOperator()` → Admin only로 변경
4. **명명 정리**: `/applications/admin/all` → 경로명에서 `admin` 제거 또는 guard 일치
5. **회원 관리 마운트 정리**: `/members`를 Operator 영역으로 이동하거나 guard 재조정

---

*조사 완료: 2026-02-15*
*조사자: AI Agent*
