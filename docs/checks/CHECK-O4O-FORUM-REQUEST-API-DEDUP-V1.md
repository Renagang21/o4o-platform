# CHECK-O4O-FORUM-REQUEST-API-DEDUP-V1

> **작업명:** WO-O4O-FORUM-REQUEST-API-DEDUP-V1
> **유형:** KPA forum 신청 API 이중화 조사 + canonical 고정 + 최소 보정(deprecation 주석)
> **결과: PASS — canonical 확정 / 레거시 무호출 확인 / deprecation 주석 적용. 라우트 제거는 후속 WO 분리.**
> 선행: `WO-O4O-FORUM-AUTHOR-PII-GUARD-V1` · 상위: `IR-O4O-COMMUNITY-FORUM-CROSSSERVICE-COMMONIZATION-RECHECK-V1` §12-1 — 2026-06-12

---

## 1. 목적

KPA forum 신청(포럼 카테고리 생성 요청) 관련 API 가 중복 경로로 존재하는지 조사하고, 실제 사용 경로를 canonical 로 고정한다. 기능 확장이 아니라 중복/legacy/drift 정리가 목적이며, **삭제보다 canonical 고정**을 우선한다.

## 2. 배경

선행 `WO-O4O-FORUM-AUTHOR-PII-GUARD-V1` 에서 forum 보안 선행(작성자 PII / edit·delete 권한 / closed-forum bypass)이 정리되었다. IR §12-1 에서 KPA 신청 API 이중화가 정리 후보(분류 F)로 식별되었다:
- 레거시 `/api/v1/kpa/.../forum-requests/*`
- 통합 `/api/v1/forum/category-requests/*`

**사전 git:** branch `main`, HEAD `d4044bfc5`(작업 시작 시점) → origin 동기화, staged 0, 다른 세션 WIP(CHECK-...-ORDER-VIEW-LOOP 문서 M + untracked png/IR)는 미접촉.

---

## 3. Phase 1 — Forum Request API 매핑

| 영역 | 파일 | route/API | 메서드 | 기능 | 위임 서비스 | 저장 테이블 | canonical |
|------|------|-----------|:------:|------|-------------|-------------|:---------:|
| **통합(user)** | routes/forum/forum-category-request.routes.ts | `/api/v1/forum/category-requests` | POST | 신청 생성(serviceCode 필수) | `services/forum/ForumRequestService` | `forum_category_requests` | ✅ **canonical** |
| 통합(user) | 〃 | `/category-requests/my` | GET | 내 신청 목록 | 〃 | 〃 | ✅ |
| 통합(user) | 〃 | `/category-requests/:id` | GET | 신청 상세 | 〃 | 〃 | ✅ |
| 통합(user) | 〃 | `/category-requests/:id` | PATCH | 신청 수정(pending/revision) | 〃 | 〃 | ✅ |
| **통합(operator)** | routes/forum/operator-forum.routes.ts | `/api/v1/forum/operator/requests` (+`/pending-count`,`/:id`,`/:id/create`,`/:id/recreate`,`/:id/review`,`/batch-review`) | GET/POST/PATCH | 신청 심사·생성 | 〃 | 〃 | ✅ **canonical** |
| **레거시(KPA user)** | routes/kpa/controllers/forum-request.controller.ts | `/api/v1/kpa/forum-requests` | POST | 신청 생성 | `routes/kpa/services/forum-request.service`(KPA-local) | `kpa_approval_requests`(entity_type='forum_category') | ⚠️ legacy |
| 레거시(KPA user) | 〃 | `/kpa/forum-requests/my` | GET | 내 신청 | 〃 | 〃 | ⚠️ |
| 레거시(KPA user) | 〃 | `/kpa/forum-requests/:id` | GET | 신청 상세 | 〃 | 〃 | ⚠️ |
| 레거시(KPA operator) | 〃 | `/kpa/forum-requests` | GET | 전체 목록(kpa:operator) | 〃 | 〃 | ⚠️ |
| 레거시(KPA branch) | 〃 | `/kpa/branches/:branchId/forum-requests/pending` | GET | 분회 대기 | 〃 | 〃 | ⚠️ |
| 레거시(KPA branch) | 〃 | `/kpa/branches/:branchId/forum-requests/:id/approve` | PATCH | 승인(분회 admin) | 〃 | 〃 | ⚠️ |
| 레거시(KPA branch) | 〃 | `…/reject` | PATCH | 거절 | 〃 | 〃 | ⚠️ |
| 레거시(KPA branch) | 〃 | `…/request-revision` | PATCH | 보완 요청 | 〃 | 〃 | ⚠️ |

**마운트:** 레거시는 `kpa.routes.ts:212 router.use('/', createForumRequestController(...))`(=`/api/v1/kpa/` 하위). 통합은 forum.routes.ts:177(`/category-requests`) + operator-forum.routes.ts(`/operator`).

**참고(무관 — 동일 테이블 타 entity_type):** `kpa_approval_requests` 는 KPA 통합 승인 테이블(course / instructor_qualification / membership / hub_content_submission / forum_category 등 entity_type 분기)로 광범위하게 사용된다. 본 WO 는 **forum_category request 경로**만 다루며 테이블·타 entity 흐름은 건드리지 않는다.

---

## 4. Phase 2 — Frontend 호출 경로 (services/web-kpa-society)

| 화면 | 파일 | action | 호출 API | family |
|------|------|--------|----------|:------:|
| 포럼 신청 | pages/mypage/RequestCategoryPage.tsx:83 → api/forum.ts:187 | create | `POST /forum/category-requests` (`serviceCode:'kpa-society'`) | **통합** |
| 내 신청 | pages/mypage/MyRequestsPage.tsx:87 → api/forum.ts:176 | getMyRequests | `GET /forum/category-requests/my` | **통합** |
| 내 신청(통합 인박스) | MyRequestsPage.tsx:86 → api/mypage.ts:189 | getMyApprovalRequests | `GET /mypage/my-requests` | 통합(승인 인박스) |
| operator 신청 관리 | pages/operator/ForumRequestsManagementPage.tsx → api/forum.ts:209~ | list/review/create/recreate/pending-count/detail | `/forum/operator/requests*` | **통합** |
| operator 포럼 관리 | ForumCategoriesManagementPage.tsx | list/update/deactivate/activate/hard/delete-check | `/forum/operator/categories*` | 통합 |
| operator 삭제요청 | ForumDeleteRequestsPage.tsx | list/approve/reject/batch | `/forum/operator/delete-requests*` | 통합 |
| operator 분석 | ForumAnalyticsDashboard.tsx | summary/trend/activity | `/forum/operator/analytics/*` | 통합 |

- API client: `authClient`(@o4o/auth-client), base `/api/v1`. `getForumBasePath()` = `/forum`(api/forum.ts:34).
- **레거시 `/kpa/forum-requests`·`/kpa/branches/.../forum-requests` 호출은 services/* / apps/* / packages/* / 테스트 어디에도 없음**(grep 0). 유일 매치는 forum.routes.ts:7 의 과거 deprecation 주석 1건.

---

## 5. Phase 3 — Backend 중복 경로 비교

| 기능 | route A (통합 canonical) | route B (레거시 KPA) | 차이 | canonical |
|------|--------------------------|----------------------|------|:---------:|
| 신청 생성 | `POST /forum/category-requests` (serviceCode 본문) | `POST /kpa/forum-requests` | A=service-neutral·forum_category_requests / B=kpa_approval_requests·branch 모델 | **A** |
| 내 신청 | `/forum/category-requests/my` | `/kpa/forum-requests/my` | 저장 테이블 상이 | **A** |
| 상세 | `/forum/category-requests/:id` | `/kpa/forum-requests/:id` | 〃 | **A** |
| 심사(승인/거절/보완) | `PATCH /forum/operator/requests/:id/review` (serviceCode-scoped, `isServiceOperator`) | `PATCH /kpa/branches/:branchId/forum-requests/:id/(approve\|reject\|request-revision)` (branch admin 검증) | A=serviceCode operator 단일 / B=분회(branch) 범위 승인 | **A** |
| 포럼 생성 | review='approve' 시 자동 생성(`createForumFromRequest` → forum_category_requests SSOT + members INSERT) | approve 시 forum_category_requests INSERT(kpa_approval_requests→forum) | 결과는 동일 테이블, 진입 경로 상이 | **A** |
| 권한 | `authenticate` + (operator) `isServiceOperator(rbacKey)` 화이트리스트 | `requireAuth` + `requireKpaScope('kpa:operator')` / branch admin | A=service-scoped 통합 / B=KPA 전용 | **A** |

**판정:** 두 경로는 단순 alias 가 아니라 **저장 모델(테이블)과 승인 모델(serviceCode vs branch)이 다른 평행 구현**이다. 현행 UI 가 전적으로 A 를 사용하므로 A 를 canonical 로 고정한다. B 의 **분회(branch)-범위 승인** 은 A 에 없는 KPA 고유 능력이나 현재 미사용(frontend 호출 0).

---

## 6. Phase 4 — 변경 내용 (최소 보정)

코드 변경은 **비동작(주석)만** 적용 — 라우트/핸들러/테이블/응답 shape 무변경.

1. `routes/kpa/controllers/forum-request.controller.ts` — 파일 헤더에 `@deprecated WO-O4O-FORUM-REQUEST-API-DEDUP-V1` JSDoc 추가. canonical 경로(통합 user/operator)와 저장 테이블 차이, "신규 호출자 추가 금지", "라우트 retirement 은 후속 WO" 명시.
2. `routes/kpa/kpa.routes.ts:212` 마운트 지점 — deprecation 주석 추가(canonical 지시 + back-compat 유지 사유).

> 라우트/컨트롤러 **삭제는 미수행**(WO 규칙: public route 삭제 금지, 후속 WO 분리). GP 는 이미 동등 컨트롤러를 제거(WO-O4O-FORUM-CATEGORY-DEAD-CODE-REMOVAL-V1)한 선례가 있어, KPA 도 후속 retire WO 후보로 분류.

---

## 7. Phase 5 — 보안/권한 재확인

| 점검 | 결과 |
|------|------|
| user 신청 API 본인 기준 | ✅ 통합 create/my/detail 는 `authenticate` + `user.id` 기준 |
| operator 승인 API 와 user 신청 API 분리 | ✅ `/category-requests`(user) vs `/operator/*`(operator) prefix 분리 |
| platform admin override 위치 | ✅ operator 경로는 `isServiceOperator`(serviceKey-scoped, platform:super_admin 포함) — 선행 PII-GUARD WO 의 service-scoped 기준과 일관 |
| service operator 자기 서비스 한정 | ✅ `requireServiceOperator` 가 `SERVICE_CODE_TO_RBAC_KEY` + `isServiceOperator(rbacKey)` 로 검증 |
| organizationId query/body 신뢰 | ⚠️ 통합 create 가 serviceCode/organizationId 를 본문 수용 — IR §16 S5(serviceCode 추출 위치)로 별도 audit WO 대상(본 WO 범위 외) |
| closed forum 신청/조회 service boundary | ✅ 선행 WO 에서 `checkClosedForumAccess` 가 service_code-scoped bypass 로 보정됨 — 충돌 없음 |

본 WO 의 deprecation 주석은 권한·boundary 동작을 변경하지 않으므로 선행 보안 기준과 충돌 없음.

---

## 8. 제외 / 무변경 항목

- 레거시 라우트/컨트롤러 **삭제** — 후속 WO(`WO-O4O-FORUM-REQUEST-LEGACY-ROUTE-RETIRE-V1` 후보).
- `kpa_approval_requests` 테이블 / 타 entity_type(course·instructor·membership·content) 흐름 — 무관, 미접촉.
- DB / migration / 신청 status 값 — 무변경.
- 통합 create 의 serviceCode 본문 추출(S5) — `WO-O4O-FORUM-SERVICEKEY-EXTRACTION-AUDIT-V1` 범위.
- **membership/join 경로 불일치(관찰)** — frontend `forumMembershipApi.requestJoin` 가 `/forum/categories/:id/join`(api/forum.ts:160) 호출하나, 통합 forum.routes 는 `/categories/:id/join-requests`(forum.routes.ts:133)만 서빙. bare `/join` 은 통합 `/forum`에 없음(KPA forum-membership.controller 는 `/api/v1/kpa/forum/` 하위 마운트, kpa.routes.ts:589). **request dedup 범위 밖의 별도 membership 경로 정합 이슈** — runtime 확인 + 별도 WO 권장. 본 WO 미수정.

---

## 9. 검증 결과

- **정적:** canonical 확정·문서화 / frontend 호출 경로 = canonical 일치 확인 / 레거시 무호출(grep 0) 확인 / serviceKey·forumId·userId·organizationId 처리 기준 표화.
- **TypeScript:** api-server `tsc --noEmit` **0 errors** ✅ (주석 변경이라 회귀 없음).
- **Smoke:** **NOT TESTED(write action)** — 프로덕션 DB 직접, 신청/승인은 실데이터 변경이라 미수행. 코드 변경이 주석뿐이라 런타임 영향 없음. 정적+타입으로 대체.
- frontend 변경 없음 ✅ · DB/migration 변경 없음 ✅.

---

## 10. 완료 판정

**PASS.** KPA forum 신청 API 전체 경로 매핑 완료 · frontend 실제 호출 경로(통합 canonical) 확인 · backend 중복(평행 구현) 판정 · canonical 확정(`/api/v1/forum/category-requests/*` + `/api/v1/forum/operator/*`) · 레거시 무호출 확인 후 deprecation 주석 최소 보정 · 보안/boundary 선행 WO 와 무충돌 · DB/migration 무변경 · typecheck 통과 · CHECK 작성 · path-specific commit/push.

---

## 11. 후속 작업

1. **`WO-O4O-FORUM-REQUEST-LEGACY-ROUTE-RETIRE-V1`(후보)** — `/kpa/forum-requests/*`·`/kpa/branches/.../forum-requests/*` 8개 라우트 + KPA-local ForumRequestService 제거(GP 선례 동형). 단, **분회(branch)-범위 승인 능력**이 통합에 필요한지 먼저 결정(불필요 시 제거, 필요 시 통합 operator 에 흡수).
2. **membership `/join` vs `/join-requests` 경로 정합** — frontend requestJoin 경로와 통합 forum.routes 서빙 경로 불일치 runtime 확인 후 정렬(별도 WO).
3. **`WO-O4O-FORUM-SERVICEKEY-EXTRACTION-AUDIT-V1`** — 통합 신청/operator 의 serviceCode body/query 추출 정렬(IR §16 S5) + search organizationId 가드(S4).

---

*Date: 2026-06-12 · Status: PASS (canonical 고정 + 레거시 deprecation 주석. 라우트 제거·membership 정합은 후속 WO).*
