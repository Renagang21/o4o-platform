# IR-O4O-KPA-OPERATOR-LIST-CANONICAL-RECHECK-V1

> KPA-Society operator 대시보드의 모든 list/table 화면을 다시 전수 조사하여
> 현재 canonical 상태와 legacy 상태를 재정리한 IR.
> **수정 없음. 조사 + 우선순위 제안.**

- 작성일: 2026-05-09
- 기준 브랜치: `main` (`1a45d3693` 이후 sync 완료)
- 조사 대상
  - `services/web-kpa-society/src/pages/operator/**` (frontend operator 화면)
  - `services/web-kpa-society/src/routes/OperatorRoutes.tsx`
  - `apps/api-server/src/routes/kpa/controllers/member.controller.ts` (member API + scope)
  - `packages/operator-ux-core/src/**` (canonical 컴포넌트)
- 범위 제약
  - **KPA-Society 만 1차 정리**. GlycoPharm / Neture / K-Cosmetics 공통화는 후속.
  - 실제 리팩토링·schema migration·auth rewrite 모두 **본 IR 범위 외**.

---

## 0. 결론 요약 (TL;DR)

> **이전 operator canonicalization 은 "대부분의 화면" 에서 정착되었으나, 핵심 화면인 `MemberManagementPage` 는 여전히 부분 canonical 상태이며 가장 정비 우선순위가 높다.**

**핵심 사실 5가지**:

1. **21개 list/table 화면 인벤토리** 결과:
   - **A 풀 canonical**: 11개 (`@o4o/operator-ux-core` DataTable + `useBatchAction` + `BaseDetailDrawer` + `RowActionMenu` + `defineActionPolicy` 모두 사용)
   - **B 부분 canonical**: 4개 — MemberManagementPage 포함 (DataTable 은 있으나 다른 import source / bulk 미사용 / 일부 패턴 누락)
   - **C legacy**: 6개 (raw HTML table / 자체 cards / 차트 위주)
   - **D dead/redirect**: 0개 (모든 라우트가 활성)

2. **MemberManagementPage 의 특수성** — 외형은 canonical 처럼 보이나 4가지 gap:
   - `DataTable` 을 `@o4o/operator-ux-core` 가 아닌 **`@o4o/ui`** 에서 import (단독 케이스 [MemberManagementPage.tsx:28](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L28))
   - `useBatchAction` 미사용 — `selectedIds: Set<string>` state 가 정의돼 있으나 **실제 사용처 없음** (dead code)
   - `activity_type` (profile metadata) **컬럼 부재**
   - `role_assignments` (capability) **컬럼 부재** — `kpa_members.role` (member/operator/admin) 만 노출

3. **profile metadata vs capability 분리가 UI 에 반영되지 않음**:
   - 약국 개설자 / 근무약사 / 병원약사 등 11개 `KpaActivityType` 모두 미표시
   - `kpa:store_owner` / `kpa:operator` / `kpa:admin` 같은 capability 미표시
   - 컬럼 "역할" 이 `kpa_members.role` 만 보여주므로 운영자 입장에서 회원의 *실제 직능*과 *서비스 capability* 를 한 화면에서 구분 불가

4. **delete / deactivate 정책은 견고히 구현되어 있음** (긍정 포인트):
   - `GET /members/:id/delete-risk` (operator scope) 로 영향 범위 미리보기
   - `DELETE /members/:id?mode=soft|hard` (admin scope only)
   - hard delete 차단 조건 명시: forum_posts > 0 OR forum_comments > 0
   - soft = `status='withdrawn'` (프로필 유지, audit log 보존)
   - 이 정책은 본 WO 의 정비 우선순위 후순위

5. **operator vs admin scope 가 잘 분리되어 있음** (긍정 포인트):
   - `kpa:operator` — 정보 조회·수정, 상태 변경, 승인/반려, 일괄 처리
   - `kpa:admin` — 역할 변경 (`PATCH /members/:id/role`), 삭제 (`DELETE /members/:id`), 법률/감사 페이지
   - 이 분리는 정렬되어 있으므로 별도 정비 불필요

**Phase 1 우선순위 권장**:
1. **MemberManagementPage canonical 정렬** — DataTable import 통일 + bulk action 활성화 + activity_type 컬럼 + capability 표시
2. **C 분류 화면 중 AuditLogPage** 만 우선 정리 (raw HTML table → `@o4o/operator-ux-core`)
3. 나머지 C 화면 (CommunityMgmt / ForumAnalytics / OperatorStores / OperatorContentHub / AnalyticsPage) 은 list 가 아닌 dashboard/cards 성격이므로 정비 우선순위 낮음

---

## 1. Operator route 매트릭스

> 출처: [OperatorRoutes.tsx:53-167](services/web-kpa-society/src/routes/OperatorRoutes.tsx#L53)

전체 라우트는 `<RoleGuard allowedRoles={[...PLATFORM_ROLES]}>` 로 1차 보호, 그 안에서 admin-only 화면은 `kpa:admin` / `platform:super_admin` 추가 검증.

| 라우트 | 페이지 | Guard 추가 | 분류 |
|---|---|---|---|
| `/operator` | KpaOperatorDashboard | PLATFORM_ROLES | dashboard |
| `/operator/members` | **MemberManagementPage** | PLATFORM_ROLES | list (B) |
| `/operator/pharmacy-requests` | PharmacyRequestManagementPage | PLATFORM_ROLES | list (A) |
| `/operator/product-applications` | ProductApplicationManagementPage | PLATFORM_ROLES | list (A) |
| `/operator/qualification-requests` | QualificationRequestsPage | PLATFORM_ROLES | list (A) |
| `/operator/event-offers` | EventOfferManagePage | PLATFORM_ROLES | list (A 추정) |
| `/operator/forum-management` | ForumManagementPage | PLATFORM_ROLES | list (A) |
| `/operator/forum-delete-requests` | ForumDeleteRequestsPage | PLATFORM_ROLES | list (B) |
| `/operator/forum` | OperatorForumPage | PLATFORM_ROLES | list (B) |
| `/operator/forum-analytics` | ForumAnalyticsDashboard | PLATFORM_ROLES | dashboard (C) |
| `/operator/content` | ContentManagementPage | PLATFORM_ROLES | list (A) |
| `/operator/docs` | OperatorContentHubPage | PLATFORM_ROLES | nav (C) |
| `/operator/content-hub/:id` | OperatorContentDetailPage | PLATFORM_ROLES | detail |
| `/operator/resources` | OperatorResourcesPage | PLATFORM_ROLES | list (A) |
| `/operator/resources/new` `/operator/resources/:id/edit` | OperatorContentHubPage / OperatorContentDetailPage | PLATFORM_ROLES | detail |
| `/operator/working-content` | WorkingContentListPage | PLATFORM_ROLES | list |
| `/operator/working-content/:id` | WorkingContentEditPage | PLATFORM_ROLES | detail |
| `/operator/lms` | OperatorLmsCoursesPage | PLATFORM_ROLES | list (A) |
| `/operator/guide-contents` | OperatorGuideContentsPage | PLATFORM_ROLES | list |
| `/operator/signage/hq-media` `/operator/signage/hq-media/:mediaId` | HqMediaPage / HqMediaDetailPage | PLATFORM_ROLES | list (A) + detail |
| `/operator/signage/hq-playlists` `/.../:playlistId` | HqPlaylistsPage / HqPlaylistDetailPage | PLATFORM_ROLES | list (A) + detail |
| `/operator/signage/templates` `/.../:templateId` | TemplatesPage / TemplateDetailPage | PLATFORM_ROLES | list (A) + detail |
| `/operator/signage/forced-content` | ForcedContentPage | PLATFORM_ROLES | list (A) |
| `/operator/store-channels` | OperatorStoreChannelsPage | PLATFORM_ROLES | list (B) |
| `/operator/stores` `/operator/stores/:storeId` | OperatorStoresPage / OperatorStoreDetailPage | PLATFORM_ROLES | list (C) + detail |
| `/operator/community` | CommunityManagementPage | PLATFORM_ROLES | mixed (C) |
| `/operator/legal` | LegalManagementPage | **KPA_ADMIN, PLATFORM_SUPER_ADMIN** | admin |
| `/operator/audit-logs` | **AuditLogPage** | **KPA_ADMIN, PLATFORM_SUPER_ADMIN** | list (C) |
| `/operator/roles` | RoleManagementPage | **KPA_ADMIN, PLATFORM_SUPER_ADMIN** | admin |
| `/operator/analytics` | OperatorAnalyticsPage | PLATFORM_ROLES | dashboard (C) |
| `/operator/ai-report` | OperatorAiReportPage | PLATFORM_ROLES | report |

**Legacy redirects**: `/operator/news → /operator/content` · `/operator/community-management → /operator/community` · `/operator/lms/courses → /operator/lms` · `/operator/users → /operator/members` · `/operator/operators → /operator/members`. 라우트 자체는 정합성 유지.

---

## 2. List/Table 화면 인벤토리 (21개)

각 화면별 `DataTable` 출처 / `BaseDetailDrawer` 사용 여부 / bulk action / row action 매트릭스. *(canonical = `@o4o/operator-ux-core`. ✓ = 사용, ✗ = 미사용/없음)*

| # | 화면 | 도메인 | DataTable 출처 | Drawer | Bulk | RowAction | 분류 |
|---|---|---|---|:---:|:---:|:---:|:---:|
| 1 | **MemberManagementPage** | members | **@o4o/ui** ⚠️ | ✓ BaseDetailDrawer | ✗ (state 만, 사용 안 됨) | ✓ RowActionMenu | **B** |
| 2 | PharmacyRequestManagementPage | pharmacy_request | @o4o/operator-ux-core | ✓ | ✓ Set + 별도 | ✓ | **A** |
| 3 | ProductApplicationManagementPage | product_approval | @o4o/operator-ux-core | ✓ | ✓ useBatchAction | ✓ | **A** |
| 4 | ContentManagementPage | contents | @o4o/operator-ux-core | ✓ | ✓ useBatchAction | ✓ | **A** |
| 5 | ForumManagementPage | forum | @o4o/operator-ux-core | ✓ | ✓ useBatchAction | ✓ | **A** |
| 6 | OperatorLmsCoursesPage | lms_course | @o4o/operator-ux-core | ✓ | ✓ useBatchAction | ✓ | **A** |
| 7 | OperatorResourcesPage | resources | @o4o/operator-ux-core | ✓ | ✓ Set + custom | ✓ | **A** |
| 8 | QualificationRequestsPage | qualification | @o4o/operator-ux-core | ✓ | ✓ useBatchAction | ✓ | **A** |
| 9 | HqMediaPage | signage_media | @o4o/operator-ux-core | ✗ | ✓ useBatchAction | ✓ | **A** |
| 10 | HqPlaylistsPage | signage_playlist | @o4o/operator-ux-core | ✗ | ✓ useBatchAction | ✓ | **A** |
| 11 | TemplatesPage | signage_template | @o4o/operator-ux-core | ✗ | ✓ useBatchAction | ✓ | **A** |
| 12 | ForcedContentPage | signage_forced | @o4o/operator-ux-core | ✗ | ✓ useBatchAction | ✓ | **A** |
| 13 | ForumDeleteRequestsPage | forum_delete | @o4o/operator-ux-core | ✗ | ✓ useBatchAction | ✗ | **B** |
| 14 | OperatorForumPage | forum | @o4o/operator-ux-core | ✗ | ✓ useBatchAction | ✓ | **B** |
| 15 | OperatorStoreChannelsPage | store_channel | @o4o/operator-ux-core | ✗ | ✗ | ✓ | **B** |
| 16 | EventOfferManagePage | event_offer | (확인 필요 — 추정 A) | ? | ? | ? | A 추정 |
| 17 | WorkingContentListPage | working_content | (확인 필요) | ? | ? | ? | ? |
| 18 | OperatorGuideContentsPage | guide | (확인 필요) | ? | ? | ? | ? |
| 19 | **AuditLogPage** | audit_logs | **raw `<table>`** | ✗ | ✗ | ✗ | **C** |
| 20 | CommunityManagementPage | community_ads/sponsors | custom cards + modal | ✗ | ✗ | custom | **C** |
| 21 | ForumAnalyticsDashboard | forum analytics | custom charts | — | — | — | **C** (dashboard 성격) |
| 22 | OperatorStoresPage | stores | custom layout | ✗ | ✗ | ✗ | **C** |
| 23 | OperatorContentHubPage | content_hub nav | custom navigation | — | — | — | **C** (nav 성격) |
| 24 | OperatorAnalyticsPage | analytics | charts | — | — | — | **C** (dashboard 성격) |

> 분류 불명(`?`) 3건 — 후속 WO 진행 시 spot-check 필요.

---

## 3. Canonical 분류 정리

### 3-1. **A 풀 canonical** (11개 확정 + 1개 추정)

`@o4o/operator-ux-core` DataTable + `useBatchAction` + `defineActionPolicy` + `buildRowActions` + `BaseDetailDrawer` (해당 시) 모두 사용:
- PharmacyRequestManagementPage / ProductApplicationManagementPage / ContentManagementPage / ForumManagementPage / OperatorLmsCoursesPage / OperatorResourcesPage / QualificationRequestsPage / HqMediaPage / HqPlaylistsPage / TemplatesPage / ForcedContentPage
- (추정) EventOfferManagePage

→ **이미 정착된 canonical**. 본 IR 의 추가 정비 우선순위 낮음.

### 3-2. **B 부분 canonical** (4개)

| 화면 | gap |
|---|---|
| **MemberManagementPage** | (1) DataTable 출처가 `@o4o/ui` (단독) → `@o4o/operator-ux-core` 통일 필요 (2) `useBatchAction` 미사용 + `selectedIds` dead state (3) `activity_type` / capability 컬럼 부재 |
| ForumDeleteRequestsPage | RowActionMenu 미사용 (인라인 버튼만), Drawer 없음 |
| OperatorForumPage | Drawer 없음 (행 클릭 시 detail 진입 흐름 미구현) |
| OperatorStoreChannelsPage | bulk action 없음 (단건 처리만), Drawer 없음 |

### 3-3. **C legacy** (6개)

| 화면 | 패턴 | 정비 필요성 |
|---|---|:---:|
| **AuditLogPage** | raw HTML `<table>` + 자체 fetch | ★★★ 중간 — list 성격이므로 canonical 정렬 의미 큼 |
| CommunityManagementPage | custom cards + modal-based 편집 | ★ 낮음 — 광고/스폰서/링크 관리는 카드형이 더 자연스러움. canonical DataTable 강제 부적절 |
| ForumAnalyticsDashboard | custom charts/grid | ☆ 매우 낮음 — analytics dashboard 는 list 가 아닌 KPI 시각화 |
| OperatorStoresPage | custom layout | ★★ 중간 — 매장 관리는 list 성격. spot-check 후 결정 |
| OperatorContentHubPage | custom navigation | ☆ 매우 낮음 — nav 성격 |
| OperatorAnalyticsPage | charts dashboard | ☆ 매우 낮음 — KPI 시각화 |

→ **list 성격 + 정비 효과 큰 것 = AuditLogPage 만 1차 후보**. 나머지는 카드/대시보드/네비 성격이라 DataTable 정렬이 부적절하거나 효과 작음.

### 3-4. **D dead / redirect**

`/operator/news → /operator/content` 등 5개 redirect 만 존재. **dead 화면 0개**. 이전 canonicalization 에서 잘 정리됨.

---

## 4. MemberManagementPage 상세 분석

> 단일 화면이지만 본 IR 의 핵심 정비 대상이라 별도 섹션.

### 4-1. 컬럼 구성 vs 백엔드 응답

**Frontend 컬럼** ([MemberManagementPage.tsx:503-585](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L503)):

| 컬럼 | 소스 필드 | 표시 형식 |
|---|---|---|
| 이름 | `user.name` | 아바타 + 텍스트 |
| 이메일 | `user.email` | 텍스트 |
| 유형 | `membership_type` | 뱃지 (약사 / 약대생) |
| **역할** | `role` (`member` / `operator` / `admin`) | 텍스트 (회원 / 운영자 / 관리자) |
| 상태 | `status` (`pending` / `active` / `suspended` / `rejected` / `withdrawn`) | StatusBadge |
| 가입일 | `joined_at` 또는 `created_at` | 날짜 |

**Backend `GET /kpa/members`** ([member.controller.ts:281-333](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L281)) 응답 필드:
```
id, user_id, organization_id, role, status, membership_type,
license_number, pharmacy_name, joined_at, created_at, updated_at,
user?: { name, email }, organization?: { name }
```

**누락된 필드** (응답에도 없고 화면에도 없음):
- `activity_type` (kpa_members 컬럼이지만 SELECT 미포함)
- `role_assignments` (별도 테이블, JOIN 미포함)
- `pharmacy_address` (소속 약국 주소)

### 4-2. activity_type 노출 여부 + 이유

**노출 안 됨**.

- Frontend: `activity_type` grep 결과 0건 (MemberManagementPage 안)
- Backend: `GET /kpa/members` 쿼리가 명시적으로 SELECT 안 함
- 회원 상세 Drawer 에서도 미표시
- EditMemberModal 폼에도 미포함

**문제점**: 운영자가 "이 약사가 약국 개설자(`pharmacy_owner`)인지 근무약사(`pharmacy_employee`)인지" 구분이 UI 만으로 불가. `kpa_members` 테이블 직접 조회해야 알 수 있음.

### 4-3. capability(role_assignments) 노출 여부 + 이유

**노출 안 됨** (RBAC role_assignments).

- 화면에 보이는 "역할" 컬럼은 **`kpa_members.role` enum** (member/operator/admin) 만 — 단순 조직 내 역할
- `kpa:store_owner` capability 보유 여부 표시 없음
- `role_assignments` 테이블의 다른 capability (`platform:super_admin` 등) 도 표시 없음

**문제점**: 운영자가 "이 사용자가 매장 경영자 capability(`kpa:store_owner`) 를 보유했는지" UI 에서 확인 불가. 별도로 `pharmacy_request` 큐 또는 직접 DB 확인 필요.

### 4-4. 컬럼 라벨 / 혼재 양상

| 컬럼 라벨 | 보여주는 데이터 | 의미 모호성 |
|---|---|:---:|
| **유형** | `membership_type` (약사/약대생) | 낮음 |
| **역할** | `role` (회원/운영자/관리자) | **중간** — *조직 내 역할*인지 *서비스 권한*인지 사용자가 추정해야 함 |
| **상태** | `status` (대기/활성/정지/반려/탈퇴) | 낮음 |

**한 컬럼 다중 의미**: "역할" 컬럼이 `kpa_members.role` 만 보여주는데, 사용자 입장에서는 그것이 *조직 내 역할*(분회 관리자 등) 인지 *RBAC 권한*(시스템 운영자) 인지 모호. 실제로는 둘 다 의미 — `kpa_members.role='operator'` 면 `role_assignments` 에 `kpa:operator` 가 동기화됨 ([member.controller.ts:600-624](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L600)).

### 4-5. delete / deactivate 정책 (긍정 포인트)

| 모드 | 효과 | 권한 | 차단 조건 |
|---|---|:---:|---|
| **soft** | `kpa_members.status='withdrawn'` (프로필 유지, audit log 보존, 로그인 불가) | admin | 없음 |
| **hard** | users / kpa_members / role_assignments / service_memberships / organization_members 모두 DELETE | admin | `forum_posts > 0` 또는 `forum_comments > 0` 인 경우 차단 |

**Risk preview**: `GET /members/:id/delete-risk` (operator scope) — `memberServices`, `forumPosts`, `forumComments`, `approvalRequests`, `auditLogs` 카운트 반환

이 영역은 견고히 구현되어 있음 → **본 WO 정비 우선순위 후순위**.

### 4-6. bulk action 부재

- `selectedIds: Set<string>` state 가 정의돼 있으나 **실제 사용처 없음** (dead code)
- bulk approve / bulk reject / bulk deactivate / bulk role change 모두 미지원
- 다른 canonical 화면(ProductApplicationManagementPage 등)은 `useBatchAction` 으로 batch-approve / batch-reject / batch-delete 지원

### 4-7. status SSOT 매핑

| 표시 status | 도출 SSOT | 비고 |
|---|---|---|
| `pending` / `active` / `suspended` / `rejected` / `withdrawn` | `kpa_members.status` | UI 표시는 이 값 |
| 동기화 | `service_memberships.status` ↔ `kpa_members.status` | 직전 WO `WO-O4O-KPA-MEMBERSHIP-STATUS-SYNC-V1` (커밋 `1a45d3693`) 로 양방향 sync 시작됨 |

**관찰**: 화면 자체는 `kpa_members.status` 만 표시하는데, IR-O4O-KPA-ROLE-CAPABILITY-AND-APPROVAL-CANONICAL-AUDIT-V1 의 canonical 방향 (`service_memberships` 가 SSOT, `kpa_members` 는 projection) 과는 *표시는 일치, 출처는 projection* 으로 작동 중. 이번 status sync 로 둘이 거의 정합되어 표시 자체는 안전.

---

## 5. operator vs admin scope 분리 매트릭스

> 출처: `member.controller.ts` + `pharmacy-request.controller.ts` + `OperatorRoutes.tsx` 가드

### 5-1. Member 관련 endpoint

| Endpoint | Scope | 동작 | UI 위치 |
|---|:---:|---|---|
| `GET /kpa/members` | operator | 목록 조회 | MemberManagementPage |
| `GET /kpa/members/:id/info` | operator | 상세 조회 | BaseDetailDrawer |
| `GET /kpa/members/:id/delete-risk` | operator | 삭제 영향 미리보기 | DeleteRiskModal |
| `PATCH /kpa/members/:id/info` | operator | 정보 수정 (이름/membership_type/license_number/pharmacy_name) | EditMemberModal |
| `PATCH /kpa/members/:id/status` | operator | 상태 변경 (`pending`↔`active`↔`suspended`↔`rejected`) | RowActionMenu |
| `PATCH /kpa/members/me/profession` | (인증 only) | 사용자 본인 직역 변경 | MyProfilePage (operator 화면 아님) |
| `PATCH /kpa/members/:id/role` | **admin** | 조직 내 역할 변경 + role_assignments 동기화 | RowActionMenu (admin only) |
| `DELETE /kpa/members/:id?mode=soft\|hard` | **admin** | 회원 삭제 | DeleteRiskModal |

### 5-2. 다른 승인 큐 endpoint

| 큐 | endpoint | scope | 화면 |
|---|---|:---:|---|
| Pharmacy Request | `GET /pharmacy-requests/pending` `PATCH /:id/{approve,reject}` | operator | PharmacyRequestManagementPage |
| Product Application | `GET /product-applications` `PATCH /:id/{approve,reject}` | operator | ProductApplicationManagementPage |
| Qualification Request | `GET /qualification-requests` `PATCH /requests/:id` | operator | QualificationRequestsPage |
| Forum Category Request | `kpa_approval_requests` (entity_type='forum_category') | operator | ForumManagementPage |
| Course Request | `kpa_approval_requests` (entity_type='course') | operator | (확인 필요) |
| **Organization Join** | `GET /organization-join-requests/pending` | **admin** | (KPA 분회 가입 승인 — admin only) |
| Audit Log 조회 | `GET /audit-logs` | **admin** | AuditLogPage |
| Legal 관리 | `/legal/*` | **admin** | LegalManagementPage |
| Role 관리 | `/roles/*` | **admin** | RoleManagementPage |

→ **operator/admin 분리는 잘 정착되어 있음**. 본 IR 의 정비 대상 아님.

---

## 6. 각 승인 큐 bulk capability 정리

| 화면 | 개별 action | bulk approve | bulk reject | bulk delete | RowActionMenu |
|---|:---:|:---:|:---:|:---:|:---:|
| **MemberManagementPage** | ✓ | ✗ | ✗ | ✗ | ✓ |
| PharmacyRequestManagementPage | ✓ | ⚠️ state 있음, 구현 ? | ⚠️ | ✗ | ✓ |
| ProductApplicationManagementPage | ✓ | ✓ | ✓ | ✓ | ✓ |
| QualificationRequestsPage | ✓ | ✓ (useBatchAction) | ✓ | ✓ | ✓ |
| ForumManagementPage | ✓ | ✓ | ✓ | ? | ✓ |
| OperatorLmsCoursesPage | ✓ | ✓ | ✓ | ✓ | ✓ |
| OperatorResourcesPage | ✓ | ✓ Set + 자체 | ✓ | ✓ | ✓ |
| HqMediaPage / HqPlaylistsPage / TemplatesPage / ForcedContentPage | ✓ | ✓ | — | ✓ | ✓ |

→ **MemberManagementPage 만 bulk 미지원**. 다른 canonical 화면은 거의 모두 `useBatchAction` 으로 일관 정착.

---

## 7. profile / capability / status 표시 종합 진단

운영자 입장에서 회원 한 명을 보았을 때 알 수 있어야 할 4가지 축:

| 축 | 현재 표시 | 격차 |
|---|---|---|
| **Profile metadata** (자기소개) | ✗ activity_type 미표시 | 약국 개설자/근무약사/병원약사 등 11개 분류가 화면에 없음 |
| **Membership type** (회원 분류) | ✓ membership_type (약사/약대생) | OK |
| **Capability** (RBAC) | ✗ role_assignments 미표시 | `kpa:store_owner` / `kpa:operator` / `kpa:admin` 구분 없음 |
| **Status** (가입 상태) | ✓ kpa_members.status (대기/활성/정지/반려/탈퇴) | OK (직전 WO 로 SSOT 정합 회복) |

**현장 시나리오**: 운영자가 "약국 경영자 신청자 김약사가 매장을 보유 중인지" 확인하려면 MemberManagementPage 가 아닌 PharmacyRequestManagementPage 를 별도로 봐야 함. 두 화면을 오가야 회원의 *전체 그림* 을 볼 수 있는 것이 현재 한계.

---

## 8. 정비 우선순위 (Phase 1 후순위)

### 8-1. 위험도 낮음 (먼저 진행 권장)

| 우선순위 | WO 후보 | 작업 범위 | 위험 |
|:---:|---|---|:---:|
| **1** | **WO-O4O-KPA-MEMBER-MANAGEMENT-CANONICAL-ALIGN-V1** | MemberManagementPage 의 DataTable import 를 `@o4o/operator-ux-core` 로 통일 + dead `selectedIds` state 제거 | 낮음 — frontend 한정, render 결과 동일 |
| **2** | **WO-O4O-KPA-MEMBER-PROFILE-CAPABILITY-COLUMN-ADD-V1** | MemberManagementPage 컬럼 추가: activity_type (profile) + capability (role_assignments). Backend `GET /kpa/members` SELECT 확장 | 중간 — backend response 변경, 다른 caller 영향 점검 필요 |
| **3** | **WO-O4O-KPA-MEMBER-BULK-ACTION-ALIGN-V1** | `useBatchAction` 도입 → bulk approve/reject/suspend (admin role 변경/delete 는 별도 정책 결정 후) | 중간 — 운영자 워크플로우 영향 |
| **4** | **WO-O4O-KPA-AUDIT-LOG-CANONICAL-ALIGN-V1** | AuditLogPage 의 raw `<table>` → `@o4o/operator-ux-core` DataTable | 낮음 — frontend 한정 |

### 8-2. 위험도 중간 (Phase 2 권장)

| 우선순위 | WO 후보 | 작업 범위 | 위험 |
|:---:|---|---|:---:|
| 5 | WO-O4O-KPA-OPERATOR-SECONDARY-DRAWER-ADJUST-V1 | OperatorForumPage / OperatorStoreChannelsPage 등 B 분류 화면에 BaseDetailDrawer 추가 | 중간 — 행 클릭 동작 변경 |
| 6 | WO-O4O-KPA-OPERATOR-STORES-CANONICAL-V1 | OperatorStoresPage 정비 (custom layout → DataTable). spot-check 결과에 따라 |
| 7 | (정책 IR 선행) WO-O4O-KPA-MEMBER-DELETE-POLICY-CONFIRMATION-V1 | hard delete 차단 조건 강화·완화 검토. 본 WO 보다 *정책 IR* 우선 | 높음 — 운영 정책 |

### 8-3. 정비 비추천 (현재 형태가 적합)

- CommunityManagementPage — 광고/스폰서/링크는 카드형이 자연스러움
- ForumAnalyticsDashboard / OperatorAnalyticsPage — KPI 시각화 성격
- OperatorContentHubPage — navigation 성격

---

## 9. 이후 공통화(Phase 3) 가능 영역 — 사전 평가

> KPA-Society 기준으로 정리되면 다른 서비스(GlycoPharm/Neture/K-Cosmetics) 공통화 검토 시 활용할 단서.

| 영역 | 공통화 가능성 | 근거 |
|---|---|---|
| `useBatchAction` hook | **이미 공통화됨** | `@o4o/operator-ux-core` 에 이미 11개 화면이 사용 |
| DataTable / RowActionMenu / BaseDetailDrawer | **이미 공통화됨** | `@o4o/operator-ux-core` + `@o4o/ui` 에 이미 정착 |
| activity_type 컬럼 표시 패턴 | KPA 한정 (다른 서비스는 다른 profile 분류) | `@o4o/operator-ux-core` 에 generic `ProfileBadge` 컴포넌트 도입 시 공통화 가능 |
| capability 컬럼 표시 패턴 | **공통화 가능** | role_assignments 가 4개 서비스 공통 사용. service prefix(`kpa:` / `glyco:`) 만 다름 |
| delete-risk preview 패턴 | **공통화 가능** | KPA 만 구현 — 다른 서비스도 같은 패턴 도입 권장 |
| MemberManagementPage 컬럼 구조 | KPA 한정 | membership_type 등은 도메인 종속 |

→ Phase 3 권장: **`useBulkSelection` hook 추상화 (현재 각 화면이 `useState<Set<string>>` 직접 관리)**, **`CapabilityChips` 컴포넌트** (role_assignments 표시), **`ProfileMetaBadge` 컴포넌트** (activity_type / 다른 서비스 profile 표시) 같은 generic 컴포넌트로 한 단계 더 추상화.

---

## 10. Members 화면 핵심 질문 답변

> 본 IR 의 핵심 조사 질문에 대한 응답.

| 질문 | 답 |
|---|---|
| Q1. activity_type 왜 안 보이는가? | (a) backend `GET /kpa/members` SELECT 미포함, (b) frontend 컬럼 정의에 없음. 둘 다 의도적 누락이라기보다 *historical gap* — IR-O4O-KPA-ROLE-CAPABILITY... 가 명확화한 profile/capability 분리가 UI 에 반영되지 않은 상태. |
| Q2. capability(role) 와 profile(activity_type) 혼재 여부? | "역할" 컬럼이 `kpa_members.role` (member/operator/admin) 만 표시 — 이는 *조직 내 역할*이지 *RBAC capability* 가 아니지만 동기화되어 있어 사용자가 추정 가능. 하지만 `kpa:store_owner` 같은 capability 는 전혀 표시 안 됨. |
| Q3. delete 실패 시 fallback 정책 존재? | ✓ — soft mode 가 fallback. hard delete 차단 시 운영자가 soft mode 선택 가능. UI 에서 이를 명확히 안내함. |
| Q4. operator 가능 작업 vs admin 전용 작업 경계? | operator: 정보 조회·수정 / 상태 변경 / 승인·반려. admin: 역할 변경 / 삭제 / 법률·감사 관리. **분리 정책 정렬되어 있음**. |
| Q5. 현재 DataTable canonical 적용 상태? | DataTable 자체는 사용 중이나 import 출처가 `@o4o/ui` 단독 (다른 화면은 `@o4o/operator-ux-core`) → 통일 정비 필요. |
| Q6. bulk deactivate 가능 여부? | ✗ — 현재 미지원. `selectedIds` state 만 있고 사용처 없음. |
| Q7. bulk role 변경 가능 여부? | ✗ — `PATCH /role` 자체가 admin scope + 단건 처리. bulk 도입 시 정책 신중 결정 필요. |
| Q8. bulk approval 가능 여부? | ✗ — 현재 단건 status 변경만. backend `PATCH /:id/status` 가 단건 endpoint. bulk 도입 시 endpoint 추가 필요. |

---

## 부록 A. 핵심 파일 인벤토리

### Frontend (services/web-kpa-society)
- `routes/OperatorRoutes.tsx` — 모든 `/operator/*` 라우트 + `RoleGuard allowedRoles`
- `pages/operator/operatorConfig.ts` — 메뉴 / KPI / Quick Actions / Action Queue
- `pages/operator/MemberManagementPage.tsx` — **본 IR 핵심 화면**
- `pages/operator/PharmacyRequestManagementPage.tsx`, `ProductApplicationManagementPage.tsx`, `QualificationRequestsPage.tsx`, `ContentManagementPage.tsx`, `ForumManagementPage.tsx`, `OperatorLmsCoursesPage.tsx`, `OperatorResourcesPage.tsx`, `HqMediaPage.tsx`, `HqPlaylistsPage.tsx`, `TemplatesPage.tsx`, `ForcedContentPage.tsx` — A canonical 11개
- `pages/operator/AuditLogPage.tsx` — C legacy
- `pages/operator/CommunityManagementPage.tsx`, `ForumAnalyticsDashboard.tsx`, `OperatorStoresPage.tsx`, `OperatorContentHubPage.tsx`, `OperatorAnalyticsPage.tsx` — C 추가

### Backend (apps/api-server)
- `routes/kpa/controllers/member.controller.ts` — `/kpa/members` 모든 endpoint + scope
- `routes/kpa/controllers/pharmacy-request.controller.ts`
- `routes/kpa/controllers/operator-summary.controller.ts` — KPI 응답
- `services/approval/MembershipApprovalService.ts` — 직전 WO 로 status sync 정합 회복

### 공통 패키지
- `packages/operator-ux-core/src/**` — DataTable / useBatchAction / defineActionPolicy / buildRowActions / MemberListLayout / StatusBadge
- `packages/ui/src/**` — RowActionMenu / BaseDetailDrawer / ActionBar / BulkResultModal / ConfirmActionDialog

### 정책 / Canonical 문서
- [docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md](docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md)
- [docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md](docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md)
- [docs/architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md](docs/architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md)
- [docs/investigations/IR-O4O-KPA-ROLE-CAPABILITY-AND-APPROVAL-CANONICAL-AUDIT-V1.md](docs/investigations/IR-O4O-KPA-ROLE-CAPABILITY-AND-APPROVAL-CANONICAL-AUDIT-V1.md) — 본 IR 의 자매 IR

---

*IR-O4O-KPA-OPERATOR-LIST-CANONICAL-RECHECK-V1*
*Updated: 2026-05-09*
*Status: Investigation Complete — Phase 1 후속 WO 분기 대기 (변경 없음)*
