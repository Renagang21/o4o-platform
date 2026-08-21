# WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1 — CHECK

> **작업일**: 2026-08-21
> **대상**: Pharmacy-Hub 운영자 영역 (`/operator/**`) — 공통 Operator capability 실채택
> **기준 서비스**: KPA-Society (공통 구조 reference implementation, CLAUDE.md §13)
> **판정 원칙**: 메뉴만 추가하거나 placeholder 를 만드는 것으로 완료 선언하지 않는다.
>   `ADOPT` 는 `공통 Core → service adapter/config → backend/serviceKey → 권한 → route → sidebar → 실화면 → dashboard` 전 구간이 연결된 것만 인정한다.

---

## 1. 결론 요약

| 판정 | 건수 |
|------|:---:|
| **KPA capability 전체** | **37** |
| `ADOPT` | **9** |
| `NOT_APPLICABLE` | **20** |
| `SERVICE_SPECIFIC` | **1** |
| `NOT_IMPLEMENTED` | **7** |
| **미판정** | **0** |

- 신규 backend API **0건**. 공통 API 3곳의 `requireRole` allowlist 에 `pharmacy-hub:*` 를 추가한 **최소 수정만** 수행했다 (WO 명시 허용 케이스).
- 신규 공통 Core **0건**. 기존 `@o4o/operator-core-ui` 6 모듈 + `@o4o/ui` 1 모듈을 그대로 소비했다.
- Pharmacy-Hub 운영자 sidebar 항목: **3 → 10** (adminOnly 1 포함).
- placeholder · "준비 중" 화면 **0건**.

---

## 2. Census — KPA Operator capability 37 전수 판정

기준: KPA-Society `UNIFIED_MENU` (`services/web-kpa-society/src/config/operatorMenuGroups.ts`) 의 전 항목 + 대시보드.

### 2-1. `ADOPT` (9)

| # | capability | 공통 Core | Backend | PH route |
|:--:|------|------|------|------|
| 1 | 대시보드 (재구성) | `@o4o/operator-ux-core` `OperatorDashboardLayout` | 기존 3 endpoint 재사용 | `/operator` |
| 2 | 회원 관리 | `@o4o/operator-core-ui/modules/members` | `/api/v1/operator/members*` | `/operator/members` |
| 3 | 포럼 운영 | `.../modules/forum-hub` | `/api/v1/forum/operator/analytics/summary` | `/operator/forum` |
| 4 | 포럼 신청 관리 | `.../modules/forum-requests` | `/api/v1/forum/operator/requests*` | `/operator/forum-requests` |
| 5 | 포럼 목록 관리 | `.../modules/forum-categories` | `/api/v1/forum/operator/categories*` | `/operator/forum-categories` |
| 6 | 삭제 요청 | `.../modules/forum-delete-requests` | `/api/v1/forum/operator/delete-requests*` | `/operator/forum-delete-requests` |
| 7 | 포럼 분석 | `.../modules/forum-analytics` | `/api/v1/forum/operator/analytics/*` | `/operator/forum-analytics` |
| 8 | 운영 분석 | `.../modules/operator-analytics` | `/api/v1/operator/analytics/*` | `/operator/analytics` |
| 9 | 역할 관리 | `@o4o/ui` `RoleManagementPage` | `/api/v1/operator/roles*` | `/operator/roles` (adminOnly) |

**포럼 신청 관리는 기능 공백이었다.** `forum_category_requests` → 운영자 심사는 Pharmacy-Hub 에서 포럼이 생성될 수 있는 **유일한 경로**인데 콘솔이 없었다. 공개 커뮤니티 화면은 이미 배포돼 있으므로 이는 UX 미비가 아니라 실기능 단절이었다.

### 2-2. `NOT_APPLICABLE` (20)

WO 명시 제외 대상(매장 HUB · 거래 개입) 및 PH 에 대응 도메인 자체가 없는 항목.

| 분류 | 항목 | 근거 |
|------|------|------|
| 승인·검수 (4) | 공급 상품 신청 승인 / 공급자 콘텐츠 승인 / 이벤트 오퍼 승인 / 판매자 모집 노출 승인 | PH 는 공급자↔약국 거래에 운영자가 개입하지 않는다 (기존 baseline) |
| 상품·주문 (2) | 상품 현황 / 주문 현황 | 위와 동일 축 |
| 매장 (8) | 매장 HUB 운영 그룹 8 항목 | WO 명시 제외 |
| LMS (1) | 강의 관리 | PH 에 학습자 측 LMS surface 자체가 없다 |
| 사이니지 (4) | signage 4 항목 | PH 는 매장 디바이스 운영 축이 없다 |
| 가이드 (1) | 안내 문구 관리 | 공통 guide 콘솔의 canonical config 가 `lms.lesson.editor` 계열 도움말을 편집한다. PH `/guide/*` 는 정적 prop 기반이라 `GuideEditableSection` 소비처가 0 |

### 2-3. `SERVICE_SPECIFIC` (1)

| 항목 | 근거 |
|------|------|
| 강사 승인 | KPA 약사 자격 심사(`kpa_pharmacist_profiles`) 축. PH 에 대응 자격 도메인이 없다 |

### 2-4. `NOT_IMPLEMENTED` (7) — 선결 조건

가짜 UI 를 만들지 않고 남긴다.

| # | 항목 | 선결 조건 |
|:--:|------|------|
| 1 | 공지사항 / 뉴스 | 원천이 `kpa_contents` (KPA 전용 테이블). service-neutral 콘텐츠 테이블 또는 공통 CMS 채택이 선행돼야 한다 |
| 2 | Home 편집 (광고·후원) | `/api/v1/kpa/community/manage/{ads,sponsors}` 가 KPA 전용 라우트. 공통화 WO 선행 |
| 3 | 콘텐츠 허브 관리 | `kpa_contents` 동일 사유 |
| 4 | 설문조사 관리 | `/api/v1/surveys` 에 **serviceKey 스코핑이 전혀 없다** → 지금 채택하면 cross-service 노출. service scope 주입이 선결 조건 (현재 플랫폼 전체 0 row) |
| 5 | 자료실 관리 | `kpa_contents` 동일 사유 |
| 6 | AI 리포트 | KPA 자체 config 가 `mode: 'empty'` — 채택 시 placeholder 가 되므로 WO 금지 조항에 걸린다 |
| 7 | 감사 로그 | `/api/v1/kpa/operator/audit-logs` 는 KPA 전용 감사 테이블(`action_type`/`target_type`/`operator_id`) 기반이며 공통 `action_logs` 와 스키마가 다르다. 공통 감사 라우트 신설이 선결 조건 |

> 단, ⑦ 의 공통 대체 축인 **운영 분석(`action_logs`)** 은 `ADOPT` 로 채택돼 있어 운영자가 자기 서비스 액션 이력을 볼 수 없는 상태는 아니다.

---

## 3. Backend 변경 — 공통 API allowlist 최소 수정 (3 파일)

세 라우터 모두 이미 `injectServiceScope` 로 데이터 경계를 강제하고 있었으나, `requireRole` allowlist 에만 `pharmacy-hub` 가 빠져 있어 **403** 이었다.

| 파일 | 추가 |
|------|------|
| `apps/api-server/src/routes/operator/membership.routes.ts` | `'pharmacy-hub:admin', 'pharmacy-hub:operator'` |
| `apps/api-server/src/routes/operator/analytics.routes.ts` | 동일 |
| `apps/api-server/src/routes/operator/roles.routes.ts` | 동일 |

### 3-1. 데이터 경계 불변 근거

- `resolveCanonicalServiceKey` (`packages/security-core/src/service-configs.ts`) 는 `kpa→kpa-society` · `cosmetics→k-cosmetics` 만 매핑하고 그 외는 self-map 한다 → `pharmacy-hub` 는 `pharmacy-hub` 로 그대로 스코프된다.
- `parseServiceRole` 은 `':'` 2-part 만 허용 → `pharmacy-hub:operator` 정상 파싱.
- 역할 관리의 **쓰기(CUD)** 는 backend 가 `scope.isPlatformAdmin` 을 별도로 강제한다. allowlist 추가는 조회 권한만 연다.

### 3-2. Forum 은 backend 변경 0

공통 forum operator 라우트의 `SERVICE_CODE_TO_RBAC_KEY` 에 `'pharmacy-hub': 'pharmacy-hub'` 가 **이미 존재**했다. 프론트에서 `?serviceCode=pharmacy-hub` 를 붙이는 것만으로 완결된다.

---

## 4. Frontend 변경

### 4-1. 신규 화면 8 (전부 공통 Core thin wrapper)

`services/web-pharmacy-hub/src/pages/operator/`
`MembersPage` · `OperatorForumPage` · `ForumRequestsPage` · `ForumCategoriesManagementPage` ·
`ForumDeleteRequestsPage` · `ForumAnalyticsPage` · `AnalyticsPage` · `RoleManagementPage`

서비스 전용 화면 사본을 만들지 않았다. accent 는 PH teal 계열로만 주입한다.

### 4-2. `services/forumApi.ts` — operator 계약 추가

- `forumOperatorApi` · `forumCategoriesOperatorApi` · `forumAnalyticsApi` 3 어댑터 추가.
- 기존 공개 커뮤니티 함수(`FORUM_BASE = '/pharmacy-hub/forum'`)는 **무변경**.
- **K-Cosmetics 어댑터와 의도적으로 다른 점**: 조회 실패를 빈 배열로 삼키지 않는다. PH 는 load-error 계약(실패 ≠ 0건)을 따른다.

### 4-3. 회원 관리 — 파괴적 액션 미주입

공통 `OperatorMembersConsolePage` 는 optional method 부재를 "기능 없음"으로 취급한다. PH 는 `list`/`listAll`/`stats`/`updateStatus` 만 주입했고 `updatePassword` · `batchUpdateStatus` · 편집/삭제 slot 은 주입하지 않았다.

축 구분: **가입 신청 관리** = membership 축(승인·반려) / **회원 관리** = user 축(목록·상태).

### 4-4. capability · 메뉴 · route

- `operatorCapabilities.ts`: `MEMBERSHIP_APPROVAL` + `USER_MANAGEMENT` · `COMMUNITY` · `ANALYTICS` · `SETTINGS`.
  `SETTINGS` 재활성은 직전 WO 가 제거했던 사유(system 그룹 실항목 0)가 **역할 관리 추가로 해소**됐기 때문이다.
  매장/상품/주문/사이니지 capability 는 켜지 않았다.
- `operatorMenuGroups.ts`: `users`/`forum`/`analytics`/`system` 항목 추가 + `community`(커뮤니티 운영) 도메인 신설.
  `PHARMACY_HUB_GROUP_TO_DOMAIN` 은 **13 group key 전부**를 계속 매핑한다(부분 매핑 시 그룹이 사라진다).
- `App.tsx`: `/operator` nested route 8개 추가.

### 4-5. Dashboard 재구성

| 블록 | 구성 | 원천 |
|------|------|------|
| KPI | 가입 승인 대기 · 승인 완료 · 반려 (+ 포럼 신청 대기 · 삭제 요청 대기) | `service_memberships`, forum pending-count |
| Action Queue | 대기 건수 > 0 인 항목만 | 동일 |
| Activity Log | 최근 액션 8건 | `action_logs` (`/operator/analytics/actions`) |
| Quick Actions | 가입 신청 관리 · 회원 관리 · 포럼 운영 · 운영 분석 | — |

- **매장 HUB 운영 블록은 가져오지 않았다.**
- 기존 "현재 운영자 영역의 업무는 가입 신청 승인·반려 입니다" 배너를 제거하고 실제 담당 범위로 교체했다.
- 커뮤니티/활동 로그 조회 실패는 **0 으로 표시하지 않고** 해당 KPI 를 제거한 뒤 amber 배너로 알린다. 가입 승인 현황(주 지표) 실패는 기존대로 전체 오류 화면을 유지한다.

---

## 5. 프로덕션 실데이터 (read-only 검증)

| 항목 | 값 |
|------|:---:|
| `service_memberships` (pharmacy-hub) | active 8 / rejected 1 / pending 0 |
| `role_assignments` (pharmacy-hub, active) | 10 |
| `action_logs` (pharmacy-hub) | 24 (`member_approve` 9 · `member_reject` 6 · `service_legal:*` 9) |
| 역할 카탈로그 | 4 (`admin`/`operator`/`store_owner`/`supplier`) |
| forum / forum post / LMS course / survey / guide content | 0 |

→ 포럼 계열 화면의 빈 화면은 **정상 empty state** 이며 결함이 아니다.

---

## 6. 검증

| 항목 | 결과 |
|------|------|
| `pnpm --filter pharmacy-hub-web build` (`tsc -b && vite build`) | PASS |
| `pnpm --filter @o4o/api-server type-check` | PASS |
| 프로덕션 브라우저 E2E | §7 |

---

## 7. 브라우저 E2E (프로덕션)

_배포 후 기록._

---

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건
(`NOT_IMPLEMENTED` ①③⑤ 공통 콘텐츠 테이블화 · ④ surveys service scope · ② KPA community manage 공통화 · ⑦ 공통 감사 로그 라우트)
