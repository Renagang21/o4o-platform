# IR-O4O-MYPAGE-MY-REQUESTS-INBOX-CROSSSERVICE-AUDIT-V1

> **Status:** Investigation Report (조사 전용) — 구현 금지
> **Date:** 2026-05-28
> **Scope:** KPA-Society / GlycoPharm / K-Cosmetics MyRequestsInbox cross-service 적용 가능성 조사
> **Predecessor:** IR-O4O-MYPAGE-PROFILE-UI-CANONICAL-COMMONIZATION-V1 (Phase 0~3 완료)

---

## 1. Executive Summary

### 1-1. 핵심 질문 답변

> KPA의 통합 inbox를 그대로 복사할 수 있는가? GlycoPharm/K-Cos의 흩어진 신청 상태를 같은 사용자 경험으로 모을 수 있는가?

**부분적으로 가능. 단, 3개 서비스 모두 Backend foundation 추가가 필요하다.**

| 결론 | 상세 |
|---|---|
| **KPA 의 통합 inbox 패턴 = canonical** | `kpa_approval_requests` 테이블 + 도메인 polymorphism (`payload` JSONB) + `entity_type` discriminator. 4종 entity (forum_category, course, instructor_qualification, membership). + `forum_category_requests` legacy cross-service table 도 클라이언트 merge. |
| **Glyco — 분산 3소스, KPA inbox 직접 적용 불가** | Forum requests (공통 API), `glycopharm_applications` (서비스 신청), `lms_enrollments` (LMS) — 3 endpoint 분산. 약사 membership 은 frontend 페이지 자체 부재. **status enum 4종 다름**. |
| **K-Cos — 분산 + 추가 gap** | Forum requests (공통 API), `lms_enrollments`, `cosmetics_store_applications` (backend 있으나 frontend 없음), partner application (form-only). **Store application UX gap + Partner application status 조회 endpoint 없음**. |
| **Common shape 추출 가능** | KPA `UnifiedRequestItem` 이 이미 cross-service 적용 가능한 형태. 다만 status enum 매핑 필요 (Glyco `submitted` ↔ KPA `pending`, K-Cos `draft` 등). |

### 1-2. 권고 결론

- **`@o4o/account-ui/MyRequestsInbox` 추출 가능** — 표시·필터·정렬 로직은 KPA MyRequestsPage 가 그대로 모델.
- **3 서비스 모두 backend endpoint 보강 필요** (Glyco 약사 membership 페이지 부재 / K-Cos store application·partner application 상태 조회 부재).
- **Status enum 정규화 — 정책 결정 필요** (canonical: `pending / approved / rejected / revision_requested / cancelled`).
- **권장 진행 순서**: ① Component 추출 → ② 각 서비스 adapter 구현 → ③ backend gap 별도 WO 분리.

---

## 2. KPA MyRequestsPage 구조 요약

**파일**: [services/web-kpa-society/src/pages/mypage/MyRequestsPage.tsx](../../services/web-kpa-society/src/pages/mypage/MyRequestsPage.tsx)
**Route**: `/mypage/my-requests` (App.tsx:849, `KPA_MYPAGE_NAV_ITEMS` line 10)

### 2-1. 데이터 출처 (Multi-source merge — client-side)

| Source | API client | Backend endpoint | Table |
|---|---|---|---|
| 통합 inbox | `mypageApi.getMyApprovalRequests()` | `GET /api/v1/kpa/mypage/my-requests` | `kpa_approval_requests` |
| Forum (legacy) | `forumRequestApi.getMyRequests()` | `GET /api/v1/forum/category-requests/my?serviceCode=kpa-society` | `forum_category_requests` |

**Merge logic** (lines 127-149): `Promise.all` → dedupe by `id` → sort by `createdAt DESC`.

### 2-2. UnifiedRequestItem shape ([api/mypage.ts:118-133](../../services/web-kpa-society/src/api/mypage.ts))

```ts
interface UnifiedRequestItem {
  id: string;
  entityType: string;        // 'forum_category' | 'course' | 'instructor_qualification' | 'membership'
  status: string;            // see status states below
  displayTitle: string;
  displayDescription: string;
  reviewComment: string | null;
  revisionNote: string | null;
  reviewedAt: string | null;
  resultEntityId: string | null;
  resultMetadata: Record<string, any> | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, any>;  // entity-specific
}
```

### 2-3. Entity types

| Type | Label | Origin |
|---|---|---|
| `forum_category` | 포럼 | `forum_category_requests` (legacy) + `kpa_approval_requests` |
| `course` | 강좌 | `kpa_approval_requests` (legacy `kpa_course_requests` deprecated) |
| `instructor_qualification` | 강사 | `kpa_approval_requests` (legacy `kpa_instructor_qualifications` deprecated) |
| `membership` | 가입 | `kpa_approval_requests` |

### 2-4. Status states (canonical 후보)

`draft / pending / submitted / approved / rejected / revision_requested / cancelled / revoked`

### 2-5. UI 패턴
- Inline loading/error/empty (MyPageLoadingState/EmptyState 미사용 — WO Phase 3 후속 cleanup 대상)
- 탭 필터: 전체 / 포럼 / 강좌 / 강사 / 가입
- 통계 카드: 총 개수, "진행 중" (pending+submitted+revision_requested), "승인됨"
- Detail expand 인라인 (별도 `/mypage/my-requests/:id` route 없음)
- 승인된 forum 만 결과 link (`/forum?category=${slug}`)

### 2-6. Hub card 연결
- ❌ **MyDashboardPage 의 hub card 에 my-requests 진입 없음** — `KPA_MYPAGE_NAV_ITEMS` 탭으로만 진입

---

## 3. GlycoPharm 신청 상태 경로 Matrix

| 신청 유형 | 현재 route | API | 응답 shape | 상태 enum | inbox 매핑 |
|---|---|---|---|---|---|
| Forum category 생성 | `/forum/my-requests` | `GET /forum/category-requests/my?serviceCode=glycopharm` | `CategoryRequest` (id, name, status, reviewComment) | `pending, revision_requested, approved, rejected` | ✅ (KPA 와 동일 endpoint) |
| 약국 경영자 service 신청 (드롭쉽 / 사인니지) | `/apply/my-applications` | `GET /api/v1/glycopharm/applications/mine` | `GlycopharmApplication` (id, organizationType, serviceTypes, status, rejectionReason) | `submitted, approved, rejected` | ⚠️ status enum 매핑 (submitted → pending) |
| LMS Course Enrollment | `/mypage/enrollments` | `GET /api/v1/lms/enrollments/me` | `LmsEnrollment` (id, courseId, status, progress) | `pending, in_progress, completed, cancelled, expired` | ⚠️ status enum 매핑 + entity_type 부재 |
| 약사 membership | ❌ **frontend 없음** | `GET /api/v1/glycopharm/members/me` | `GlycopharmMemberRecord` (status, approvedBy) | `pending, approved, rejected, suspended` | ❌ 페이지 부재 |
| Instructor qualification | ❌ 없음 | ❌ 없음 | N/A | N/A | ❌ 시스템 부재 |

### 3-1. Drift signals
- ⚠️ `MyApplicationsPage` 가 MyPageHub / Header 어디에도 link 없음 (orphaned)
- ⚠️ 약사 membership backend 는 있으나 사용자가 본인 상태 확인할 수 있는 frontend 없음
- ✅ Forum + LMS 는 공통 endpoint 사용 — 즉시 inbox 적용 가능

---

## 4. K-Cosmetics 신청 상태 경로 Matrix

| 신청 유형 | 현재 route | API | 응답 shape | 상태 enum | inbox 매핑 |
|---|---|---|---|---|---|
| Forum category 생성 | `/forum/my-dashboard` (in MyForumDashboardPage) | `GET /forum/category-requests/my?serviceCode=k-cosmetics` | `ForumRequest` (id, name, status) | `pending, revision_requested, approved, rejected` | ✅ |
| Forum category 삭제 요청 | `/forum/my-dashboard` (owned forums) | `POST /forum/categories/:id/delete-request` | `category.metadata.deleteRequestStatus` | `pending, approved, rejected` | ⚠️ metadata embedded — extraction 필요 |
| LMS Course Enrollment | `/mypage/enrollments` | `GET /api/v1/lms/enrollments/me` | `LmsEnrollment` | `pending, in_progress, completed, cancelled, expired` | ⚠️ status enum 매핑 |
| 매장 application | ❌ **frontend 없음** | `GET /api/v1/cosmetics/stores/application/me` | `CosmeticsStoreApplication` (status) | `draft, submitted, approved, rejected` | ⚠️ 페이지 부재 + status 매핑 |
| Partner application | `/partners/apply` (제출 form only — 무인증) | `POST /api/v1/partner/applications` | ❌ GET 미존재 | unknown | ❌ status 조회 endpoint 부재 |
| Event-offer participation | ❌ 없음 | ❌ 없음 | N/A | N/A | ❌ 시스템 부재 |
| Instructor qualification | ❌ 없음 (admin grant only) | ❌ 없음 | N/A | N/A | ❌ 시스템 부재 |

### 4-1. Role policy notes
- `seller / consumer / supplier` 역할 → `RoleNotAvailablePage` (Neture redirect) — K-Cos 영역 외
- K-Cos 신청 가능 역할: `consumer (default)`, `cosmetics:store_owner`, `lms:instructor`, `cosmetics:operator`

### 4-2. Drift signals
- ⚠️ Store application: backend exists, frontend missing — **highest priority gap**
- ⚠️ Partner application form 은 public submit only, status 조회 endpoint 없음
- ⚠️ Forum delete request 상태가 `category.metadata` 에 embedded — separate inbox 항목으로 추출 필요

---

## 5. 공통 MyRequestItem shape 제안

KPA `UnifiedRequestItem` 을 base 로 cross-service 확장:

```ts
type MyRequestEntityType =
  | 'forum_category'
  | 'forum_delete'           // K-Cos: category.metadata 에서 추출
  | 'course'                 // KPA
  | 'course_enrollment'      // Glyco/K-Cos LMS
  | 'instructor_qualification'
  | 'membership'             // KPA / Glyco 약사 membership
  | 'service_application'    // Glyco 약국 경영자 service
  | 'store_application'      // K-Cos 매장 신청
  | 'partner_application'    // Neture-Cos partner
  | 'other';

type MyRequestStatus =
  | 'draft'
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'cancelled'
  | 'revoked'
  | 'in_progress'           // LMS enrolled
  | 'completed';            // LMS completed

interface MyRequestItem {
  id: string;
  entityType: MyRequestEntityType;
  status: MyRequestStatus;
  displayTitle: string;
  displayDescription?: string;
  reviewComment?: string | null;
  revisionNote?: string | null;
  reviewedAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  href?: string;             // result detail link (approved 상태에서)
  serviceKey?: string;       // 'kpa-society' / 'glycopharm' / 'k-cosmetics'
  payload?: Record<string, unknown>;
}
```

### 5-1. Status 매핑 표

| 서비스 / source | 원 status | canonical |
|---|---|---|
| Glyco application | `submitted` | `pending` |
| LMS enrollment | `in_progress` | (그대로 — display 만 진행 중) |
| LMS enrollment | `expired` | `cancelled` |
| K-Cos store application | `draft` | (필터 제외 가능) |
| K-Cos store application | `submitted` | `pending` |
| Glyco membership | `suspended` | `revoked` |

---

## 6. Backend/API Readiness Matrix

| 서비스 | 신청 유형 | Case | 이유 | 필요한 후속 작업 |
|---|---|:---:|---|---|
| **KPA** | 모두 4종 | A | `kpa_approval_requests` + forum legacy 표 통합 동작 | 없음 (canonical) |
| **Glyco** | Forum category | A | 공통 endpoint 동작 | 없음 |
| **Glyco** | LMS enrollment | B | endpoint 존재, frontend aggregation 가능 | status enum 매핑 adapter |
| **Glyco** | Service application | B | endpoint 존재, frontend aggregation 가능 | status 매핑 adapter + entity_type 마킹 |
| **Glyco** | 약사 membership | C | backend 있으나 user-facing 페이지 없음 | frontend page + (선택) `GET /glycopharm/mypage/requests` 통합 endpoint |
| **K-Cos** | Forum category | A | 공통 endpoint 동작 | 없음 |
| **K-Cos** | LMS enrollment | B | endpoint 존재 | status 매핑 adapter |
| **K-Cos** | Store application | C | backend 있으나 frontend client 함수 없음 | API client + status 매핑 |
| **K-Cos** | Partner application | C | POST 만 있고 GET 없음 | backend `GET /api/v1/partner/applications/me` 신설 |
| **K-Cos** | Forum delete request | D | `category.metadata` 에 embedded | 정책: 별도 항목으로 노출할지 결정 |
| **K-Cos** | Event-offer participation | E | 시스템 부재 (현재 보류) | 별도 WO — 본 IR 범위 외 |
| **K-Cos / Glyco** | Instructor qualification | E | self-service 없음 (admin grant) | 정책 결정 — 본 IR 범위 외 |

**Case 분류**:
- **A** Backend 이미 준비됨 — frontend page + adapter
- **B** Frontend aggregation 으로 가능 — backend 신규 불필요
- **C** 공통 backend endpoint 필요
- **D** 정책 결정 필요
- **E** 현재 보류

---

## 7. Route / Navigation 제안

### 7-1. Canonical route
- **`/mypage/my-requests`** — KPA 표준 그대로

### 7-2. 서비스별 적용 권장
| 서비스 | 현재 | 권장 |
|---|---|---|
| KPA | ✅ 이미 존재 | 유지 |
| Glyco | ❌ | `/mypage/my-requests` 신규 + `/apply/my-applications` redirect 또는 link |
| K-Cos | ❌ | `/mypage/my-requests` 신규 + `/forum/my-dashboard` 내 forum request 부분 link |

### 7-3. Navigation 노출
| 위치 | KPA | Glyco | K-Cos |
|---|---|---|---|
| MyPageNavigation 탭 | ✅ `내 신청` (KPA_MYPAGE_NAV_ITEMS:10) | 추가 권장 | 추가 권장 (KCOS_MYPAGE_NAV_ITEMS 확장) |
| MyPageHub card | ❌ (현재 부재 — 통일성 위해 추가 권장) | 추가 권장 | 추가 권장 |

### 7-4. Legacy route 처리
- Glyco `/apply/my-applications` → orphaned 상태. 통합 inbox 도입 시 `Navigate to /mypage/my-requests?type=service_application` redirect 권장.
- K-Cos `/forum/my-dashboard` 의 my-requests 영역 — 유지하되 MyPage 통합 inbox 에서 우선 진입하도록 cross-link.

---

## 8. UI 컴포넌트 재사용 가능성

KPA MyRequestsPage 가 사용 중인 UI:
| 컴포넌트 | source | inbox 추출 시 |
|---|---|---|
| `MyPageLayout` | `@o4o/account-ui` ✅ | 그대로 |
| `MyPageNavigation` | `@o4o/account-ui` ✅ | 그대로 |
| status badges | inline Tailwind | ⚠️ `@o4o/account-ui/RequestStatusBadge` 신설 권장 |
| type badges | inline Tailwind | ⚠️ `@o4o/account-ui/RequestTypeBadge` 신설 권장 |
| filter tabs | inline | ⚠️ 공통 추출 가능 (MyRequestsInbox 내부) |
| loading/empty | inline (Phase 3 cleanup 대상) | ✅ `MyPageLoadingState` / `MyPageEmptyState` 사용 |
| Icons | lucide-react | 그대로 (서비스별 type icon mapping 으로 분리) |

### 8-1. 신규 component 후보
- **`MyRequestsInbox`** — KPA MyRequestsPage 의 list/filter/badge 로직을 공통화. props 로 `items: MyRequestItem[]`, `types: EntityTypeConfig[]`, `actions?` 받음.
- **`RequestStatusBadge`** — RoleBadge 패턴 적용 (status → tone 매핑)
- **`RequestTypeBadge`** — 동일 패턴

---

## 9. Root Cause 분류

각 drift 9 카테고리 분류:

| Drift / Gap | 분류 |
|---|---|
| KPA 통합 inbox 존재, Glyco/K-Cos 부재 | **C** Backend 공통 endpoint 필요 (per service) + **D** route/menu 정렬 |
| Glyco `MyApplicationsPage` orphaned | **D** route/menu 정렬 (link 부재) |
| Glyco 약사 membership user 페이지 부재 | **C** Backend 있으나 frontend page 부재 |
| K-Cos store application frontend 부재 | **C** API client + frontend page 신설 필요 |
| K-Cos partner application GET endpoint 부재 | **C** Backend foundation 필요 |
| K-Cos forum delete request metadata embedded | **F** 정책 결정 (별도 항목 표시 여부) |
| Status enum 4 서비스 inconsistent | **F** 정책 결정 (canonical enum 정렬) |
| KPA MyRequestsPage 가 MyPageLoadingState/EmptyState 미사용 | **A** 이미 정렬됨 (Phase 3 후속 cleanup — 본 WO 외) |
| KPA MyDashboardPage 에 hub card 부재 | **B** UI layout 정렬 |
| Instructor qualification self-service 부재 | **E** 시스템 부재 — 본 IR 외 |
| Event-offer participation status 부재 | **E** 시스템 부재 — 본 IR 외 |

분류 기준:
- **A** 이미 정렬됨
- **B** UI layout 정렬 필요
- **C** Backend 신규 endpoint 필요
- **D** route/menu 정렬 필요
- **E** 시스템 부재
- **F** 정책 결정 필요

---

## 10. 후속 WO 후보

### Phase A — Frontend Component 추출 (low risk, 사용자 영향 없음)
1. **WO-O4O-MYPAGE-MY-REQUESTS-INBOX-COMPONENT-V1**
   - `@o4o/account-ui/MyRequestsInbox` + `RequestStatusBadge` + `RequestTypeBadge` 추출
   - KPA `MyRequestsPage` 를 신규 컴포넌트로 마이그레이션 (시각 회귀 없음)
   - 후속 서비스 적용의 토대
   - Risk: 낮음 (KPA reference 만 영향)

### Phase B — Backend foundation (gap 채우기 — 정책 결정 후)
2. **WO-O4O-MYPAGE-MY-REQUESTS-INBOX-BACKEND-FOUNDATION-V1**
   - Glyco 약사 membership user-facing API 정리
   - K-Cos store application frontend client 함수 추가
   - K-Cos partner application `GET /api/v1/partner/applications/me` 신설
   - Status enum 매핑 표준 문서화
   - Risk: 중간 (backend touch — RBAC + 정책 결정)

### Phase C — 서비스별 적용 (Phase A + B 완료 후)
3. **WO-O4O-GLYCOPHARM-MYPAGE-MY-REQUESTS-ROUTE-V1**
   - Glyco `/mypage/my-requests` route 신설 (MyRequestsInbox + adapter)
   - 3 source: Forum / Service application / LMS enrollment
   - MyPageNavigation 탭 추가
   - Legacy `/apply/my-applications` redirect

4. **WO-O4O-KCOSMETICS-MYPAGE-MY-REQUESTS-ROUTE-V1**
   - K-Cos `/mypage/my-requests` route 신설
   - 3~4 source: Forum / LMS enrollment / Store application / Partner application
   - MyPageNavigation 확장 (`KCOS_MYPAGE_NAV_ITEMS` 에 항목 추가)

### Phase D — Hub card 정렬 (3 서비스 통일)
5. **WO-O4O-MYPAGE-MY-REQUESTS-HUB-CARD-ALIGNMENT-V1**
   - 4 서비스 (KPA 포함) MyPageHub 에 `MyPageHubCard` 로 my-requests 진입 카드 추가
   - pending count badge 표시 (선택)

### (선택) Phase E — Neture
6. **WO-O4O-NETURE-MYPAGE-MY-REQUESTS-EXPLORATION-V1**
   - Neture supplier/partner request 구조 별도 IR 후 결정 — 본 IR 범위 외

---

## 11. 우선순위 제안

| Phase | Risk | 사용자 가시 효과 | 권고 순서 |
|---|---|---|---|
| Phase A — Component 추출 | 낮음 | 즉시 없음 (KPA 시각 회귀 없음) | **1순위** |
| Phase D — Hub card 진입 | 낮음 | 큼 (KPA 가시 효과 즉시) | **2순위** |
| Phase B — Backend foundation | 중간 | 없음 (구조만) | 3순위 (정책 결정 선행) |
| Phase C — 서비스별 적용 | 중간 | 큼 (Glyco / K-Cos 통합 inbox 가시) | 4순위 (Phase A + B 완료 후) |
| Phase E — Neture | 미확정 | 보류 | 별도 IR |

**의사 결정 분기점:**
- 만약 Backend 변경 risk 를 줄이고 싶다면 → **Phase A + D 만 우선 진행** (KPA visual lift, 다른 서비스는 후속)
- 만약 cross-service 완성도를 우선이라면 → **Phase A → B → C 순차** (단, 정책 결정 IR 필요할 수 있음)

---

## 12. Current Structure vs O4O Philosophy Conflict Check

CLAUDE.md §13 ("O4O 공통 구조 원칙") 및 IR-O4O-MYPAGE-PROFILE-UI-CANONICAL-COMMONIZATION-V1 와의 정합성:

| 항목 | 정합? | 비고 |
|---|:---:|---|
| O4O 의 forum/lms/signage 는 공통 구조, 데이터는 serviceKey 격리 | ✅ | KPA 의 `forum_category_requests` 가 이미 `service_code` column 으로 격리 — 공통 endpoint + serviceKey 패턴 유지 |
| KPA = reference implementation | ✅ | MyRequestsPage 가 reference 역할 — Glyco/K-Cos 가 patten mirror |
| 동결 Core 영역 변경 금지 | ✅ | `kpa_approval_requests` 는 KPA 영역. 다른 서비스용 등가 테이블 신설 시 별도 Core 영역에 영향 없음 (entity_type discriminator 패턴은 schema 변경 없이 확장 가능) |
| Boundary Policy (F6) | ✅ | Domain primary boundary 필터 (`requester_id` + `service_code`) 이미 적용 |
| MyPage shell 추출 불필요 — 이미 `@o4o/account-ui` 정렬 | ✅ | MyRequestsInbox 도 동일 패키지에 추가 — 일관성 유지 |
| RBAC SSOT (F9) | ✅ | 신청 권한은 `role_assignments` / `service_memberships` 기반 — 본 IR 의 inbox 표시는 read-only |
| Drift: status enum inconsistency | ⚠️ | 정책 결정 필요 — 4 서비스 status enum 정규화 가 향후 일반 가이드라인 영역 |

**Conflict 없음.** 본 IR 의 권고 사항은 O4O 헌법 (`CLAUDE.md`) 및 기존 baselines 와 정합한다. Status enum 정규화는 별도 정책 결정 사안으로 남는다.

---

## 부록 A — 핵심 파일 위치

### KPA reference
- Page: [services/web-kpa-society/src/pages/mypage/MyRequestsPage.tsx](../../services/web-kpa-society/src/pages/mypage/MyRequestsPage.tsx)
- API client: [services/web-kpa-society/src/api/mypage.ts](../../services/web-kpa-society/src/api/mypage.ts) (lines 118-190)
- Backend controller: [apps/api-server/src/routes/kpa/controllers/mypage.controller.ts:124-138](../../apps/api-server/src/routes/kpa/controllers/mypage.controller.ts#L124-L138)
- Service: [apps/api-server/src/routes/kpa/services/mypage.service.ts:236-283](../../apps/api-server/src/routes/kpa/services/mypage.service.ts#L236-L283)
- Entity: [apps/api-server/src/routes/kpa/entities/kpa-approval-request.entity.ts](../../apps/api-server/src/routes/kpa/entities/kpa-approval-request.entity.ts)

### GlycoPharm
- Forum requests: [services/web-glycopharm/src/pages/forum/MyRequestsPage.tsx](../../services/web-glycopharm/src/pages/forum/MyRequestsPage.tsx)
- Service applications: [services/web-glycopharm/src/pages/apply/MyApplicationsPage.tsx](../../services/web-glycopharm/src/pages/apply/MyApplicationsPage.tsx) (orphaned)
- Enrollments: [services/web-glycopharm/src/pages/mypage/MyEnrollmentsPage.tsx](../../services/web-glycopharm/src/pages/mypage/MyEnrollmentsPage.tsx)
- API: [services/web-glycopharm/src/api/glycopharm.ts:417-423](../../services/web-glycopharm/src/api/glycopharm.ts#L417-L423)
- Backend: [apps/api-server/src/routes/glycopharm/controllers/application.controller.ts:227-281](../../apps/api-server/src/routes/glycopharm/controllers/application.controller.ts#L227-L281)

### K-Cosmetics
- Forum dashboard: [services/web-k-cosmetics/src/pages/forum/MyForumDashboardPage.tsx](../../services/web-k-cosmetics/src/pages/forum/MyForumDashboardPage.tsx)
- Enrollments: [services/web-k-cosmetics/src/pages/mypage/MyEnrollmentsPage.tsx](../../services/web-k-cosmetics/src/pages/mypage/MyEnrollmentsPage.tsx)
- Partner apply (form-only): [services/web-k-cosmetics/src/pages/partners/ApplyPage.tsx](../../services/web-k-cosmetics/src/pages/partners/ApplyPage.tsx)
- Store application backend: [apps/api-server/src/routes/cosmetics/cosmetics-store.controller.ts:329](../../apps/api-server/src/routes/cosmetics/cosmetics-store.controller.ts#L329) (frontend missing)

### Common (cross-service)
- Forum requests: [apps/api-server/src/routes/forum/forum-category-request.routes.ts:56-79](../../apps/api-server/src/routes/forum/forum-category-request.routes.ts#L56-L79)
- LMS enrollments: [apps/api-server/src/modules/lms/routes/lms.routes.ts:169](../../apps/api-server/src/modules/lms/routes/lms.routes.ts#L169)

---

## 부록 B — Status enum 정렬 매핑 (제안)

canonical: `pending / approved / rejected / revision_requested / cancelled / draft / submitted / revoked / in_progress / completed`

| Source / 서비스 | 원 status | canonical mapping |
|---|---|---|
| KPA `kpa_approval_requests` | draft / pending / submitted / approved / rejected / revision_requested / cancelled / revoked | 그대로 (canonical 정의) |
| Forum `forum_category_requests` | pending / revision_requested / approved / rejected | 그대로 |
| Glyco `glycopharm_applications` | submitted / approved / rejected | submitted → pending |
| Glyco `glycopharm_member_records` | pending / approved / rejected / suspended | suspended → revoked |
| LMS `lms_enrollments` | pending / in_progress / completed / cancelled / expired | expired → cancelled, in_progress + completed 는 display 만 (request 가 아닌 active state) |
| K-Cos `cosmetics_store_applications` | draft / submitted / approved / rejected | submitted → pending |
| K-Cos partner application | (POST 만, GET 부재) | 정책 결정 후 mapping |

---

## Scope Guard 확인

이 IR 은:
- ✅ 조사 전용
- ✅ 구현 없음
- ✅ Backend 수정 없음
- ✅ DB migration 없음
- ✅ Frontend route 수정 없음
- ✅ MyPageNavigation / MyPageHubCard 수정 없음
- ✅ KPA MyRequestsPage 수정 없음
- ✅ Glyco / K-Cos 코드 수정 없음
- ✅ mock data 추가 없음

다음 단계 시작 전 사용자 승인 필요. 권고 1순위: **Phase A — Component 추출 (Risk 낮음, KPA 시각 회귀 없음, 후속 적용의 토대)**.
