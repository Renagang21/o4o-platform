# CHECK-O4O-KPA-OPERATOR-IMPROVEMENT-HISTORY-AND-CROSS-SERVICE-REUSE-AUDIT-V1

- **대상 IR**: `IR-O4O-KPA-OPERATOR-IMPROVEMENT-HISTORY-AND-CROSS-SERVICE-REUSE-AUDIT-V1`
- **성격**: 조사 전용 (read-only). 코드·DB·운영 데이터·배포 변경 0.
- **기준 시점**: 2026-08-12 · `origin/main` = `eb1a8dc09`
- **비교 대상 서비스**: KPA-Society · Neture · K-Cosmetics · GlycoPharm · Pharmacy-Hub
- **판정 등급**: `COMMONIZED` / `PARTIAL` / `NOT_SHARED` / `EXTENSION` / `KPA_ONLY` / `MISSING`

> **판정 기준(중요)**: "같은 컴포넌트를 import 한다"는 사실만으로 `COMMONIZED` 로 판정하지 않았다.
> 각 기능마다 ① 화면 조립 ② 상태 관리 ③ API 연결(엔드포인트·계약) ④ 업무 동작(승인/일괄/에러)
> ⑤ 서비스별 adapter 를 함께 확인했다. import 는 같지만 API·업무 동작이 갈리면 `PARTIAL` 이다.

---

## 1. KPA 운영자 주요 개선 이력 (2026-05-16 ~ 2026-08-12)

`git log -- services/web-kpa-society/src/pages/operator packages/operator-core-ui packages/operator-ux-core`
기준으로 복원했다. 대표 축 8개로 정리한다.

### 축 A — 회원 관리 canonical 정비 (2026-05-16 ~ 07-29)

| 커밋 | 내용 |
|---|---|
| `d346074a1` | 운영자 회원관리 **탈퇴(withdrawn) 탭** + lifecycle 정렬 |
| `7cc84d496` | operator 회원 **canonical edit 완성** |
| `5d2e69c1a` `91ff80bd6` `6c2db9399` `595b613ae` | **businessInfo canonical** 정렬 (form·projection·payload 3단) |
| `063f59f02` `ed793853c` | 회원 검색에 `license_number`·약국 business field 추가 |
| `7ada5bc4d` | MemberManagementPage **Hybrid wrapper 전환** (공통 콘솔 채택) |
| `84847be54` | 상태 딥링크 자동 탭 선택 — wrapper `syncUrl` opt-in |
| `4ab837016` | 비밀번호 변경 후보 서비스 매핑 누락 복구 (`memberships` 매핑) |

### 축 B — 공통 콘솔 추출·수렴 (2026-05-24 ~ 06-17)

`a8becbadd`(members list 공통화) · `9a8c5d12f`+`a5874c15d`(EditUserModal 공통화 + KPA 분리) ·
`f386c148f`(Stores thin wrapper) · `181d0ec14`(Resources) · `f1e342cff`(GuideContents) ·
`f3bd56e21`·`098403588`·`627e6c4f0`·`eac6ced4d`(Forum 삭제요청/신청 콘솔 수렴) ·
`46e639fa4`·`a245f6071`·`b708eceb4`(Forum analytics/hub/categories GP·KCos 도입) ·
`5094a9d54`+`429feff07`+`608b7b1b8`(상품/주문 현황 view) · `3500d1215`(상품 신청 승인 콘솔) ·
`f2fda7596`(LMS operator courses manager).

### 축 C — 표준 리스트·표준 테이블 채택 (2026-05-25 ~ 07-27)

`55fd50105`(Blog/POP/QR 카드형 → 표준 테이블 + bulk) · `203353832`·`fc0465b4a`·`3c8f62b9b`
(stores/members/recruitment-exposure standard list core) · `e8c17edb3`(태블릿 화면세트) ·
`59bb84df5`(다국어 상품 콘텐츠) · `883834a32`(잔여 목록 + **load-error 계약**) ·
`13ce20c12`(DataTable expandable-row) · `28e74e88c`(sticky selection column).

### 축 D — 업무 동작 표준화 (bulk·confirm·에러)

`95156bda4`(runBulk/single → **ConfirmActionDialog** 표준화) · `84d4e2771`(members action policy:
suspend/restore/withdraw) · `d190f30cb`(BulkResultModal 배선) · `1fcb010f5`(P2/P3 UX·오류계약 통합) ·
`d4278b519`(action integrity + 공급자 콘텐츠 승인 flow 완성).

### 축 E — 대시보드·IA·사이드바

`543658777`·`6ce07b4bf`(domain IA 재구성·대시보드 최상단) · `23304abfa`(**축 네비게이션 공통화**) ·
`ee3804ed7`(가이드 카드 UI parity) · `603bc73f6`(`aboveBlocks` slot) · `4f81fc614`(카드 배치 정렬) ·
`72148a9b2`(대시보드 frontend adapter) · `da14028de`(action icon vocab 표준) ·
`55c87570d`·`76985d814`·`048233539`(sidebar·layout shell 공통 컴포넌트 추출) ·
`adcd988a5`(**filterMenuByRole·UnifiedMenuItem 4서비스 공통화**).

### 축 F — dead flow 은퇴

`703b68f2e`(WorkingContent) · `43ae74846`(KpaApplication) · `3e1734820`(organization-join + orphan table) ·
`136d38fb2`+`f2bcabc30`(pharmacy-requests) · `0b0d6a999`(dead UsersPage 1,353 lines) ·
`8246b2da4`(signage dead link 5곳).

### 축 G — 감사·안전 삭제

`c3e91c7e2`(운영자 **감사 로그** entity/action-type 계약 정렬) ·
`55e3ea14f`(**사이니지 미디어 사용처 가드 + 안전 삭제**, 409) · `6f9471173`(멤버 delete flow 공통화).

### 축 H — KPA 고유 업무 기능

`8332c8dd3`·`a8b5f6c73`·`dabbd264a`(운영자 매장 HUB Blog/POP/QR **작성** UI) ·
`ea29f9bac`(QR 전용 동영상) · `0505b15c1`·`73e01a368`(다국어 상품 콘텐츠) ·
`e8c17edb3`(태블릿 화면세트) · `d41a94744` 외(약국 정보 canonical) ·
`411ef3347`(가입 신청/승인 in-app 알림).

---

## 2. 기능별 5개 서비스 대응표

범례: ● 공통 Core 소비 / ◐ 일부만 공통(주변 중복) / ○ 자체 구현 / — 없음

| # | 기능 | KPA | Neture | K-Cos | GlycoPharm | Pharmacy-Hub | 판정 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| 1 | 회원 관리 콘솔 (`OperatorMembersConsolePage`) | ◐ | ● | ● | ● | — | **PARTIAL** |
| 2 | 회원 편집 모달 | ○ `KpaEditUserModal` | ● | ● | ● | — | **EXTENSION** |
| 3 | 회원 상태 탭 + 탈퇴 lifecycle | ● | ● | ● | ● | ○ | **COMMONIZED** |
| 4 | 비밀번호 변경(대상 서비스 확정) | ● | ● | ● | ● | — | **COMMONIZED** |
| 5 | 회원 삭제 flow (soft/hard 분리) | ◐ | ◐ | ● | ● | — | **PARTIAL** |
| 6 | 매장 목록 (`OperatorStoresList`) | ● | ● | ● | ● | — | **COMMONIZED** |
| 7 | 포럼 삭제요청/신청 콘솔 | ● | ● | ● | ● | — | **COMMONIZED** |
| 8 | 포럼 분석/허브/카테고리 | ● | ◐ | ● | ● | — | **PARTIAL** |
| 9 | 자료실 (`OperatorResourcesConsolePage`) | ● | — | ● | ● | — | **NOT_SHARED**(Neture) |
| 10 | 가이드 콘텐츠 (`GuideContentsConsolePage`) | ● | ● | ● | ● | — | **COMMONIZED** |
| 11 | CMS 콘텐츠 (`CmsContentManager`) | ● | — | ● | ● | — | **NOT_SHARED**(Neture) |
| 12 | 상품/주문 현황 view | ● | ○ | ● | ● | — | **PARTIAL** |
| 13 | 상품 신청 승인 콘솔 | ● | ○ | ● | ● | — | **PARTIAL** |
| 14 | LMS 운영자·강사 매니저 | ● | — | ● | ● | — | **EXTENSION**(Neture 무 LMS) |
| 15 | 문의 관리 (`ContactInquiryAdminPage`) | — | ○ | ● | ● | — | **MISSING**(KPA) |
| 16 | 약관·연락처 설정 (admin) | ● | ● | ● | ● | — | **COMMONIZED** |
| 17 | 대시보드 축 네비게이션 | ● | ● | ● | ● | — | **COMMONIZED** |
| 18 | 대시보드 5-Block layout | ◐ 자체 composer | ● | ● | ● | — | **EXTENSION** |
| 19 | 운영자 가이드 카드 | ● | — | ● | ● | — | **NOT_SHARED**(Neture) |
| 20 | 채용/모집 노출 승인 | ● | — | ● | ● | — | **EXTENSION** |
| 21 | 표준 테이블(DataTable)·bulk·row action | ● 49 | ● 36 | ● 15 | ● 21 | ○ 0 | **PARTIAL**(PH 제외) |
| 22 | ConfirmActionDialog 표준화 | ● 15 | ◐ 2 | ◐ 1 | ◐ 2 | — | **PARTIAL** |
| 23 | standard list core (`useStandardListQuery`) | — | ● 3 | — | ● 1 | — | **PARTIAL** |
| 24 | load-error 계약 | ◐ 패턴 수기 | ● 121 | ○ | ○ | ○ | **PARTIAL** |
| 25 | 운영자 감사 로그 | ○ KPA 전용 | — | — | — | — | **MISSING** |
| 26 | 사이니지 미디어 사용처 가드·안전 삭제 | ● UI+API | — | ◐ API만 | ◐ API만 | — | **PARTIAL** |
| 27 | 메뉴 role 필터 (`filterMenuByRole`) | ● | ● | ● | ● | — | **COMMONIZED** |
| 28 | 운영자 sidebar/layout shell | ◐ `DomainIASidebar` | ◐ `DomainIASidebar` | ○ 자체 | ○ 자체 | — | **PARTIAL** |
| 29 | Blog/POP/QR 작성·목록 | ○ | — | ○ | ○ | — | **PARTIAL**(3중 복제) |
| 30 | 다국어 상품 콘텐츠 | ○ | — | — | — | — | **KPA_ONLY** |
| 31 | 태블릿 화면세트 운영자 관리 | ○ | — | — | — | ◐ editor pkg | **KPA_ONLY** |
| 32 | 약국 정보 canonical(면허/약국) | ○ | — | — | — | — | **KPA_ONLY** |
| 33 | 자격 요청 승인(QualificationRequests) | ○ | — | — | ○ | — | **PARTIAL** |
| 34 | 회원 승인 콘솔 | ● | ● | ● | ● | ○ 자체 268L | **MISSING**(PH) |

---

## 3. 현재 공통 Core 와 실제 소비 서비스

### 3-1. `@o4o/operator-core-ui` — 19 모듈

| 모듈 | export | 실제 소비 서비스 |
|---|---|---|
| members | `OperatorMembersConsolePage` | KPA · Neture · KCos · GP |
| members | `CommonEditUserModal` | Neture · KCos · GP |
| members | `KpaEditUserModal` | KPA |
| members | `MemberHardDeleteConfirmModal` | KPA · Neture |
| members | `OperatorMemberDeleteFlow` | KCos · GP |
| stores | `OperatorStoresList` | KPA · Neture · KCos · GP |
| stores | `useStoresQuery` | **소비 0** |
| forum-delete-requests | `…ConsolePage` | KPA · Neture · KCos · GP |
| forum-requests | `…ConsolePage` | KPA · Neture · KCos · GP |
| forum-categories | `…Page` | KPA · Neture · KCos · GP |
| forum-analytics | `…Page` | KPA · KCos · GP |
| forum-hub | `…Page` | KPA · KCos · GP |
| resources | `…ConsolePage` | KPA · KCos · GP |
| cms-content | `CmsContentManager` | KPA · KCos · GP |
| guide-contents | `GuideContentsConsolePage` | KPA · Neture · KCos · GP |
| guide-contents | `GuideContentsManager` | **소비 0** (Console 경유만) |
| lms-courses | `OperatorLmsCoursesManager` | KPA · KCos · GP |
| instructor-courses | `InstructorCoursesManager` | KPA · KCos · GP |
| instructor-course-form | `InstructorCourseFormShell` | KPA · GP |
| instructor-lesson-list | `InstructorLessonListManager` | KPA · GP |
| product-applications | `ProductApplicationManagementConsole` | KPA · KCos · GP |
| product-order-view | `OperatorProductStatusPage` / `OperatorOrderStatusPage` | KPA · KCos · GP |
| contact-inquiry | `ContactInquiryAdminPage` | KCos · GP |
| service-legal | `ServiceLegalSettingsPage` | KPA · Neture · KCos · GP |
| service-contact-settings | `ServiceContactSettingsPage` | KPA · Neture · KCos · GP |
| dashboard | `AxisNavigationSection` | KPA · Neture · KCos · GP |
| dashboard | `OperatorRoleGuideCard` | KPA · KCos · GP |

> **주의**: 초기 조사에서 `product-applications` 등 7개 모듈이 "소비 0" 으로 보였으나,
> 이는 서브패스(`@o4o/operator-core-ui/modules/*`) 기준 grep 의 착시였다.
> 실제로는 **패키지 barrel(`@o4o/operator-core-ui`)** 경유로 소비된다. 위 표는 export 이름 기준 재검증 결과다.

### 3-2. `@o4o/operator-ux-core` · `@o4o/ui`

| export | 소비 (파일 수) |
|---|---|
| `DataTable` | KPA 49 · Neture 36 · GP 21 · KCos 15 |
| `RowActionMenu` (@o4o/ui) | KPA 25 · Neture 14 · GP 8 · KCos 6 |
| `useBatchAction` | KPA 20 · GP 9 · KCos 9 · Neture 4 |
| `defineActionPolicy` / `buildRowActions` | KPA 15 · GP 7 · KCos 5 · Neture 2 |
| `BulkResultModal` (@o4o/ui) | KPA 21 · GP 9 · KCos 9 · Neture 2 |
| `ConfirmActionDialog` (@o4o/ui) | KPA 15 · GP 2 · Neture 2 · KCos 1 |
| `OperatorDashboardLayout` | GP 2 · KCos 1 · Neture 1 (KPA 는 자체 composer) |
| `DomainIASidebar` | KPA 2 · Neture 3 (GP·KCos 자체 sidebar) |
| `RecruitmentExposureConsole` | KPA · KCos · GP |
| `MemberListLayout` | KPA 1 |
| `useStandardListQuery` | Neture 3 · GP 1 |
| `StandardListToolbar` | Neture 2 |
| `normalizePaginatedResponse` | **소비 0** |
| `EditableDataTable` | Neture 1 |
| `filterMenuByRole` (@o4o/ui) | 4 서비스 |

### 3-3. Backend 공통 계약

- `/api/v1/operator/members/*` — `apps/api-server/src/routes/operator/membership.routes.ts`.
  serviceKey 고정이 아니라 **caller scope 기반**이므로 서비스 중립. Neture·KCos·GP 가 소비.
- `/api/signage/:serviceKey/*` — 미디어 사용처 가드(`media-usage.service.ts`)가 **serviceKey 중립**.
- `/api/v1/kpa/members`, `/api/v1/kpa/operator/audit-logs` — KPA 전용.
- `/api/v1/pharmacy-hub/operator/memberships/*` — Pharmacy-Hub 전용.

---

## 4. KPA 고유 및 서비스별 Extension

### 4-1. KPA_ONLY (유지 타당)

| 기능 | 근거 |
|---|---|
| 다국어 상품 콘텐츠 (목록·작성) | 약국 매장 다국어 QR 업무. 타 서비스 업무 없음 |
| 태블릿 화면세트 운영자 관리 | KPA 매장 태블릿 전용 |
| 약국 정보 canonical (면허번호·약국명·활동유형) | `kpa_pharmacist_profiles` 기반 자격 도메인 |
| QR 전용 동영상 콘텐츠 | 매장 HUB → 내 매장 → QR 공개 뷰어 파이프라인 |
| 회원가입 신청/승인 in-app 알림 | 약사회 온보딩 업무 |

### 4-2. EXTENSION (서비스별 차이 유지가 적절)

| 기능 | 이유 |
|---|---|
| `KpaEditUserModal` vs `CommonEditUserModal` | KPA 는 `kpa_members` + 약국 businessInfo 편집. 계약이 근본적으로 다름 (`8d7d79c8e` 에서 분리 원칙 명문화) |
| `KpaOperatorDashboardLayout` | 공통 block/config 는 그대로 쓰고 **순서·빈상태만** 조정. slot 규약(`aboveBlocks`)은 공통과 동일 |
| GP/KCos 자체 sidebar | 브랜드 헤더(Layer A) 결합 구조. 메뉴 role 필터는 이미 공통(`filterMenuByRole`) |
| 채용/모집 노출 승인 | Neture 는 공급자 측(`SupplierRecruitmentsPage`)에서 대응. 축이 다름 |
| LMS 매니저 Neture 부재 | Neture 에 LMS 업무 자체가 없음 |

---

## 5. 부분 공통화 · 미공통화 · 누락 기능

### 5-1. PARTIAL — 껍데기만 공통, 업무 배선은 중복

| # | 항목 | 실태 |
|---|---|---|
| P1 | 회원 콘솔 **API 축 분기** | KPA 는 `/api/v1/kpa/members` (kpa_members join, `stats` 미제공 → `listAll` 로 파생, batch 는 클라이언트 fan-out). 나머지 3서비스는 canonical `/operator/members` + `/batch-status` 사용. **같은 UI, 다른 업무 배선** |
| P2 | 회원 삭제 flow | KCos·GP 는 `OperatorMemberDeleteFlow`(공통), KPA·Neture 는 `MemberHardDeleteConfirmModal` 만 쓰고 흐름은 자체 구현 |
| P3 | 상품/주문 현황 · 상품 신청 승인 | KPA·KCos·GP 는 공통 콘솔, Neture 는 별도 승인 도메인(`OperatorProductApprovalPage` 등) 자체 구현 |
| P4 | Blog/POP/QR 페이지 | 3서비스에 **거의 동일한 페이지가 각각 존재** (목록 526/369/450, 작성 276/198/252 lines). 공통 primitive 만 공유 |
| P5 | 사이니지 HQ 미디어/플레이리스트/템플릿 | 동일 구조 3중 복제 (541/415/571, 295/227/310, 347/205/119 lines) |
| P6 | `ConfirmActionDialog` 표준화 | KPA 15 : GP 2 : Neture 2 : KCos 1. **KPA 개선이 확산되지 않음** |
| P7 | standard list core | `useStandardListQuery` 를 KPA·KCos 는 **한 번도 쓰지 않는다**. KPA 의 "표준 리스트" 는 DataTable 수기 조립 |
| P8 | load-error 계약 | Neture 121곳 vs KPA 는 페이지별 수기 3-tier 패턴(`883834a32`). 공통 `LoadErrorState`(`packages/ui/src/feedback/LoadError.tsx`) 는 **서비스 소비 0** |
| P9 | 사이니지 삭제 가드 UX | 백엔드 가드는 공통, KPA 만 `MediaDeleteDialog`(409 안내) 보유. GP 는 페이지 내 자체 처리, KCos 는 **처리 없음** |

### 5-2. NOT_SHARED — KPA 개선이 특정 서비스에 미반영

| 항목 | 미반영 서비스 |
|---|---|
| 자료실 콘솔 (`OperatorResourcesConsolePage`) | Neture |
| CMS 콘텐츠 (`CmsContentManager`) | Neture |
| 포럼 분석/허브 | Neture |
| 운영자 가이드 카드 | Neture |

### 5-3. MISSING — 다른 서비스에도 필요하나 미구현

| # | 항목 | 상세 |
|---|---|---|
| M1 | **운영자 감사 로그** | KPA 만 `/api/v1/kpa/operator/audit-logs` + `AuditLogPage` 보유. 운영자 책임추적은 4서비스 공통 요구인데 나머지 3서비스는 화면·API 모두 없음 |
| M2 | **Pharmacy-Hub 운영자 회원 콘솔** | 268줄 수기 테이블. `DataTable`·`ConfirmActionDialog`·`RowActionMenu`·`BulkResultModal` **사용 0**, 일괄 처리·검색·상태 탭 카운트·탈퇴 lifecycle 없음. canonical `/operator/members` 는 scope 기반이라 채택 가능 |
| M3 | 문의 관리 | KPA 에 `ContactInquiryAdminPage` 화면 없음 (KCos·GP 보유, Neture 는 자체 화면) |
| M4 | 사이니지 삭제 409 안내 | KCos 무처리 |

### 5-4. 죽은 공통 자산 (부채)

- `useStoresQuery` · `GuideContentsManager`(직접 소비) · `normalizePaginatedResponse` · `LoadErrorState` — **소비 0**.

---

## 6. 코드 복잡도를 늘리지 않는 추가 공통화 후보

기준: ① 이미 존재하는 Core 를 **소비만** 추가 ② 새 추상화 계층 신설 없음 ③ 서비스별 분기 증가 없음.

| # | 후보 | 방식 | 복잡도 |
|---|---|---|---|
| C1 | Pharmacy-Hub 회원 콘솔 → `OperatorMembersConsolePage` | 기존 wrapper 패턴 그대로. backend 는 canonical `/operator/members` 이미 scope 기반 | **감소** (268줄 → wrapper) |
| C2 | KPA 회원 콘솔 API 축을 canonical 로 수렴 | `/kpa/members` 의 약국 확장 필드만 `extraColumns` 로 남기고 목록·stats·batch 는 canonical 사용 | 중 (backend 확인 필요) |
| C3 | Blog/POP/QR 페이지 공통 콘솔 추출 | 3중 복제 → `operator-core-ui` 모듈 1개. 이미 검증된 추출 패턴(resources·forum 과 동일) | **감소** (약 2,600줄 → 1) |
| C4 | 사이니지 HQ 미디어/플레이리스트/템플릿 공통 콘솔 | 위와 동일 패턴 | **감소** (약 2,900줄 → 1) |
| C5 | `MediaDeleteDialog` → `@o4o/ui` 승격 후 3서비스 소비 | 컴포넌트 이동 + import | 낮음 |
| C6 | `ConfirmActionDialog` 를 GP/KCos/Neture 잔여 confirm 에 확산 | 기존 컴포넌트 소비 확대 | 낮음 |
| C7 | `LoadErrorState` 실소비 개시 또는 제거 판정 | 둘 중 하나. 현재는 순수 부채 | 낮음 |
| C8 | Neture 에 자료실·CMS 콘텐츠 콘솔 도입 | 기존 모듈 wrapper 추가 | 낮음 (**업무 필요 확인 선행**) |
| C9 | 운영자 감사 로그 Core 화 | KPA 전용 → service-neutral. **신규 설계 필요** → 복잡도 증가, C1~C7 이후 |

---

## 7. 권장 후속 WO 와 우선순위

| 순위 | WO 후보 | 판정 근거 | 비고 |
|:--:|---|---|---|
| 1 | `WO-O4O-PHARMACY-HUB-OPERATOR-MEMBER-CONSOLE-CANONICAL-ADOPTION-V1` | M2. 신규 서비스가 표준 밖에서 굳기 전에 흡수 | 복잡도 **감소** |
| 2 | `WO-O4O-OPERATOR-PUBLISHING-PAGES-CONSOLE-COMMONIZATION-V1` (Blog/POP/QR) | P4. 3중 복제 약 2,600줄 | 복잡도 **감소** |
| 3 | `WO-O4O-OPERATOR-SIGNAGE-HQ-CONSOLE-COMMONIZATION-V1` | P5. 3중 복제 약 2,900줄 + M4 동시 해소 | 복잡도 **감소** |
| 4 | `WO-O4O-OPERATOR-CONFIRM-AND-LOAD-ERROR-CONTRACT-PROPAGATION-V1` | P6·P8·5-4. 기존 컴포넌트 소비 확대 + 죽은 자산 판정 | 저비용 |
| 5 | `WO-O4O-KPA-OPERATOR-MEMBER-API-CANONICAL-CONVERGENCE-V1` | P1. KPA 만 다른 API 축 — 회귀 위험 있어 단독 WO | 선행 IR 권장 |
| 6 | `WO-O4O-OPERATOR-AUDIT-LOG-CORE-EXTRACTION-V1` | M1. 신규 설계 포함 | 후순위 |
| 7 | `WO-O4O-NETURE-OPERATOR-CONTENT-CONSOLE-INTRODUCTION-V1` | 5-2. **업무 필요 확인이 선행 조건** | 조건부 |

---

## 8. 운영자 영역 종료 가능 여부

**판정: 조건부 종료 가능 (CLOSE_WITH_CARRYOVER)**

근거:

- **구조적 미완성 없음** — 운영자 공통 Core(`operator-core-ui` 19 모듈 · `operator-ux-core`)는 이미 존재하고
  4개 서비스가 실제로 소비한다. 남은 것은 **새 설계가 아니라 소비 확대·중복 제거**다.
- **P0 결함 0** — 이번 조사에서 기능이 끊기거나 데드링크가 되는 결함은 발견되지 않았다.
  마지막 실동작 결함(비밀번호 변경 후보 매핑)은 `4ab837016` 으로 이미 마감됐다.
- **잔여 부채는 프로필 공통화와 축이 다르다** — P4·P5(발행·사이니지 페이지 복제), C1(Pharmacy-Hub)은
  운영자 UI 축이고, 프로필 공통화는 회원/계정 축이다. 병행 가능하며 서로를 막지 않는다.
- **다만 1순위 WO 는 이월해야 한다** — Pharmacy-Hub 운영자 콘솔(M2)은 표준 밖에서 굳는 중이고,
  시간이 지날수록 흡수 비용이 커진다. 운영자 영역을 "닫는" 것이 이 항목을 **폐기**하는 뜻이면 종료 불가,
  **이월 목록으로 남기는** 뜻이면 종료 가능하다.
- **감사 로그(M1)** 는 운영자 영역의 유일한 설계 미완 항목이나, 4서비스 중 KPA 만 요구가 실증됐으므로
  운영자 영역 종료의 차단 사유로 보지 않는다.

→ **권장**: 운영자 영역을 **종료하고**, 위 7절 1~4순위를 별도 트랙으로 이월한 뒤 프로필 공통화로 이동.

---

## 9. 변경·검증·Git 상태

| 항목 | 결과 |
|---|---|
| 코드 write | **0** |
| DB write | **0** (프로덕션 DB 접속 자체를 수행하지 않음) |
| 운영 데이터 변경 | **0** |
| 배포 | **0** |
| 다른 세션 소유 변경 접촉 | **0** (`apps/api-server/**`, `services/web-kpa-branch/**` 등 미변경 유지) |
| 생성 파일 | 본 CHECK 문서 1건 |
| 기준 커밋 | `origin/main` = `eb1a8dc09` |

**조사 방법**: `git log`(경로 한정) · 패키지 barrel export 열람 · export 이름 기준 전 서비스 grep ·
각 서비스 회원 콘솔/사이니지/발행 페이지 소스 직접 열람(API 배선·adapter·statusTabs 확인) ·
backend 라우트 등록(`register-routes.ts`) 및 서비스 중립성 확인.

**한계**: 브라우저 실행 검증은 수행하지 않았다(조사 전용 범위). 판정은 정적 코드 근거에 기반한다.
