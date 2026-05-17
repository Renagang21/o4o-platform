# IR-O4O-COMMUNITY-LIST-UX-CANONICAL-AUDIT-V1

**작성일**: 2026-05-17
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**: KPA-Society **사용자 영역(non-operator/non-admin) 리스트 화면** 전수 분류
**범위**: KPA-Society 만. GlycoPharm / K-Cosmetics / Neture 는 후속 IR.

**선행 기준 문서**:
- `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md` (operator 표준 — 참조용)
- `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`

**선행 IR**:
- `IR-O4O-KPA-OPERATOR-LIST-CANONICAL-COVERAGE-AUDIT-V1` (operator 영역 분류 — 본 IR 의 community counterpart)

---

## 0. 결론 요약

KPA-Society 사용자 영역에는 **30 개의 리스트 화면**이 있으며, **27 개(90%)는 이미 적절한 canonical family 에 정렬**되어 있다. 진정한 drift 는 **1 건**이고, 가장 시급한 정비 대상은 **legacy mock data 4 건 (intranet 영역) + raw `<table>` 1 건 (NoticeListPage)** 이다.

### 핵심 발견

1. **operator canonical(true table) 을 그대로 community 에 적용한 사례가 적다** — 의도된 분리.
2. **forum/courses/resources 의 진입(hub) 페이지는 `@o4o/shared-space-ui` template wrapper** 로 이미 card-first canonical 구현 — 별도 정비 불필요.
3. **`/content/*` 영역은 TRUE/HYBRID 표준에 가장 정렬됨** — `ContentDocumentsPage` 는 TRUE CANONICAL TABLE, 나머지는 BaseTable 기반 HYBRID 또는 SIMPLE-DATATABLE.
4. **🚨 intranet 4 페이지 (Notice/Meeting/Document/Schedule + Feedback) 는 모두 hardcoded mock data** — API 미연결 placeholder. 본 IR 분류 결과보다 우선 백엔드 연결 또는 제거 결정이 필요.
5. **`NoticeListPage` 는 raw `<table>` + 자체 thead/tbody** — KPA Operator 의 `OperatorContentHubPage` 와 동일 패턴 (이미 WO 로 정비됨). 동일 정비 적용 가능 (단, mock data 처리 선행).

### 분류 분포

| 권장 Family | 카운트 |
|---|:---:|
| TRUE CANONICAL TABLE | 2 |
| SIMPLE DATATABLE | 13 |
| HYBRID LIST | 7 |
| CARD-FIRST | 2 |
| WRAPPER (외부 canonical template) | 2 (forum hub, resources hub) |
| LEGACY CLEANUP-FIRST | 4 (intranet mock data) |

---

## 1. Canonical Family 정의 (기준)

| Family | 특징 | 권장 컴포넌트 |
|---|---|---|
| **TRUE CANONICAL TABLE** | dense metadata · sorting · multi-select · bulk action · 관리형 UX | `@o4o/ui` `BaseTable` + selection + ActionBar + BulkResultModal (`packages/ui` family) |
| **SIMPLE DATATABLE** | table 적합, bulk action 가치 낮음, read-only 위주 | `BaseTable` (selection 없이) |
| **HYBRID LIST** | card + metadata · thumbnail + 다중 필드 · 탐색성+정보 밀도 균형 | `BaseTable` (light) 또는 card+meta row component |
| **CARD-FIRST** | 탐색/브라우징 · visual · recommendation/feed · mobile-first | grid + card component, table 전환 금지 |
| **WRAPPER** | 외부 canonical template 호출 thin page | 외부 컴포넌트 — 본 페이지에서 판단 보류 |
| **LEGACY CLEANUP-FIRST** | mock data / 미구현 / 백엔드 미연결 — family 분류 전 cleanup 필요 | API 연결 또는 페이지 제거 결정 선행 |

---

## 2. Forum 영역 (3 페이지)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| WRAPPER (CARD-FIRST 구현체 외부) | low | `pages/forum/ForumHomePage.tsx` | `/forum` |
| HYBRID LIST | low | `pages/forum/ForumListPage.tsx` | `/forum/all` |
| HYBRID LIST | low | `pages/forum/ForumFeedPage.tsx` | `/forum/:slug` |

### 분석

- **ForumHomePage** — `@o4o/shared-space-ui` 의 `ForumHubTemplate` wrap. card-first hub + category section + activity tab. SEO 높음. 외부 template canonical 책임 → 본 IR scope 외.
- **ForumListPage** (전체 게시글) — `@o4o/ui` `BaseTable` 사용 + 검색 + 페이지네이션 + multi-select 로 **bulk copy** 액션 있음. mobile=medium. operator 표준 거의 그대로지만 SEO 가치 낮음(인증 후 영역).
- **ForumFeedPage** (카테고리별) — `BaseTable` + 메타데이터 (제목/작성자/날짜/좋아요/조회/댓글). bulk 가치 낮음. 단건 조회 흐름 중심.

→ Forum 은 **hub=card / listing=table** 의 이원 구조로 이미 canonical 정렬 완료.

---

## 3. LMS / Courses 영역 (7 페이지)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| HYBRID LIST | low | `pages/lms/LmsCoursesPage.tsx` | `/lms` |
| CARD-FIRST | low | `pages/courses/CourseHubPage.tsx` | `/courses` |
| TRUE CANONICAL TABLE | low | `pages/instructor/courses/CourseListPage.tsx` | `/instructor/courses` (강사 관리, community 경계 흐림) |
| SIMPLE DATATABLE | low | `pages/lms/LmsCertificatesPage.tsx` | `/lms/certificates` |
| SIMPLE DATATABLE | low | `pages/mypage/MyCompletionsPage.tsx` | `/mypage/completions` |
| **HYBRID LIST** | **medium** | `pages/mypage/MyEnrollmentsPage.tsx` | `/mypage/enrollments` |
| SIMPLE DATATABLE | low | `pages/mypage/MyCreditsPage.tsx` | `/mypage/credits` |

### 분석

- **CourseHubPage** (공개 카탈로그) — 카드 그리드, 썸네일+가격 필터+12 페이지네이션. SEO 높음. card-first canonical 정렬.
- **LmsCoursesPage** — `BaseTable` + 라이브러리 add bulk. 관리형 UX 가 강해 hybrid/table 경계. 현재 정렬.
- **MyEnrollmentsPage** ⚠️ — card 레이아웃 + thumbnail + progress bar + status badge. 메타데이터는 4-5 개로 hybrid 적합하나 현재 구현은 pure card. **drift=medium** — pure card 보다 hybrid (card+meta row) 가 mobile + 정보 밀도 모두 충족. 단, 현재도 동작은 정상이라 cleanup 우선순위는 낮음.
- **LmsCertificatesPage / MyCompletionsPage** — read-only, 카드 그리드. 데이터 밀도 낮음. SIMPLE DATATABLE 권장 분류이나 현재 card 도 무방. drift=low.
- **MyCreditsPage** — 거래 내역, 단순 표 적합. table 으로 이미 구현.
- **CourseListPage (`/instructor/courses`)** — 강사 본인 강의 관리 페이지로 community 경계 모호. 정책상 operator 가까운 UX 이며 BaseTable + 선택 + bulk delete + row action 모두 갖춤 — TRUE CANONICAL 정렬.

### 핵심 권장

```
공개 카탈로그(/courses)        → CARD-FIRST   (유지)
내 수강(/mypage/enrollments)   → HYBRID-LIST  (medium drift — 시급도 낮음)
내 수료(/lms/certificates)     → SIMPLE/CARD  (현 상태 무방)
강사 관리(/instructor/courses) → TRUE TABLE   (유지)
```

---

## 4. Resources 영역 (1 페이지)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| WRAPPER (CARD-FIRST 구현체 외부) | low | `pages/resources/ResourcesHubPage.tsx` | `/resources` |

### 분석

- `@o4o/shared-space-ui` 의 `ResourcesHubTemplate` wrap. hero + 검색 + 추천 토글 + 업로드 모달. card-first 탐색 UX.
- 자료실 자체는 metadata density 가 높아 IR WO 제안 시 "table 적합 가능성" 으로 표기했었으나, 현재 KPA-Society 의 사용자 입구는 **hub-card** 한 곳이고 자료의 metadata 관리는 **operator 측 `OperatorResourcesPage` (이미 CANONICAL)** 에서 처리 — 사용자 측은 card-first 가 적절.

→ 별도 정비 불필요.

---

## 5. Contents 영역 (4 페이지)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| HYBRID LIST | low | `pages/contents/ContentListPage.tsx` | `/content` |
| TRUE CANONICAL TABLE | low | `pages/contents/ContentDocumentsPage.tsx` | `/content/documents`, `/content/resources` |
| HYBRID LIST | low | `pages/contents/ContentCoursesPage.tsx` | `/content/courses` |
| SIMPLE DATATABLE | low | `pages/contents/ContentSurveysPage.tsx` | `/content/surveys` |

### 분석

- **ContentListPage** — 3 섹션 hub (Documents BaseTable + Courses snippet + Surveys snippet). 진입점, hybrid 적절.
- **ContentDocumentsPage** ⭐ — `BaseTable` + `BaseDetailDrawer` + `RowActionMenu` + `ActionBar` + multi-select + **bulk copy to store**. KPA-Society 사용자 영역에서 가장 operator 표준에 가까운 페이지. owner 한정 edit/delete. TRUE CANONICAL 완전 구현.
- **ContentCoursesPage** — `BaseTable` + 검색 + selection + bulk copy. 강의를 콘텐츠 자원으로 노출.
- **ContentSurveysPage** — read-only survey list. table 적합, bulk 가치 낮음.

→ Contents 영역은 **사용자 영역 중 canonical 정렬 가장 우수**. 정비 불필요.

---

## 6. Signage 영역 (1 페이지 list / 2 페이지 detail/player)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| HYBRID LIST | low | `pages/signage/ContentHubPage.tsx` | `/signage` |
| 비-list (detail) | — | `pages/signage/PlaylistDetailPage.tsx` | `/signage/playlists/:id` |
| 비-list (player) | — | `pages/signage/PublicSignagePage.tsx` | `/public/signage?playlist=:id` |

### 분석

- **ContentHubPage** — `SignageManagerTemplate` (외부 wrapper) 사용. 탭 구조 (videos / playlists), thumbnail 비중 높음, selection state 있으나 bulk 액션은 없음. 현재 hybrid 분류.
- **PlaylistDetailPage / PublicSignagePage** — 리스트가 아닌 상세/플레이어 — 분류 대상 외.

→ Signage 사용자 영역은 단일 hub 만 존재하며 이미 hybrid 정렬됨.

---

## 7. Intranet / MyPage / Other 영역 (15 페이지)

### 7-A. 🚨 LEGACY CLEANUP-FIRST (4 페이지 — Mock Data Placeholder)

| 파일 | route | 문제 |
|---|---|---|
| `pages/intranet/NoticeListPage.tsx` | `/intranet/notices` | **hardcoded 5건 mock**, raw `<table>` 사용 (L34, L125) |
| `pages/intranet/MeetingListPage.tsx` | `/intranet/meetings` | **hardcoded mock** (L31) |
| `pages/intranet/DocumentListPage.tsx` | `/intranet/documents` | **hardcoded mock** (L34) |
| `pages/intranet/SchedulePage.tsx` | `/intranet/schedule` | **hardcoded mock** (L23) |
| `pages/feedback/FeedbackListPage.tsx` | `/intranet/feedback` | **`SAMPLE_POSTS` 상수**, FeedbackNewPage 에 `// await api.post(...)` 주석 |

**해석**: 이 5 페이지는 **백엔드 미연결 placeholder**. canonical 분류 적용 전에 다음 결정 필요:

1. **백엔드 연결 후 canonical 정비** (정상 진행)
2. **사용 안 한다면 페이지 제거**
3. **임시 유지** (mock 명시적 라벨)

본 IR 의 family 권장은 **백엔드 연결을 전제로 한 것**:
- NoticeListPage → SIMPLE DATATABLE (게시판형 read-only, 페이지네이션 있음)
- MeetingListPage → SIMPLE DATATABLE
- DocumentListPage → SIMPLE DATATABLE
- SchedulePage → 캘린더형 (table family 외)
- FeedbackListPage → SIMPLE DATATABLE 또는 HYBRID

특히 **NoticeListPage 는 raw `<table>` + 자체 thead/tbody 구조** — KPA Operator 의 `OperatorContentHubPage` 와 동일 패턴 (이미 WO-O4O-KPA-OPERATOR-LEGACY-TABLE-CANONICAL-MIGRATION-V1 로 BaseTable 전환). 백엔드 연결 결정 후 동일 마이그레이션 적용 가능.

### 7-B. MyPage (10 페이지)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| HYBRID LIST | low | `pages/mypage/MyRequestsPage.tsx` | `/mypage/requests` |
| SIMPLE DATATABLE | low | `pages/mypage/MyCertificatesPage.tsx` | `/mypage/certificates` |
| 비-list (form) | — | `pages/mypage/MyQualificationsPage.tsx` | `/mypage/qualifications` |
| SIMPLE DATATABLE | low | `pages/mypage/MyForumDashboardPage.tsx` | `/mypage/forums` |
| 비-list (dashboard) | — | `pages/mypage/MyDashboardPage.tsx` | `/mypage` |
| SIMPLE DATATABLE | low | `pages/mypage/ForumMemberManagementPage.tsx` | `/mypage/forums/:forumId/members` |
| SIMPLE DATATABLE | low | `pages/instructor/ContentParticipantsPage.tsx` | `/instructor/contents/:courseId/participants` |
| 비-list (placeholder) | — | `pages/participation/ParticipationListPage.tsx` | `/participation` (EmptyState 만 존재) |

### 분석

- **MyRequestsPage** — entity-type 탭 + status 탭 + card-like expandable 행. 통합 inbox 성격. hybrid 적합.
- **MyCertificatesPage** — 카드 그리드, read-only, 다운로드/링크 복사. 정렬 적절.
- **MyForumDashboardPage** — 본인 소유 forum card 목록 + 인라인 edit/delete modal. 카드 적합 (소유물 관리지만 visual + 외부 link 위주).
- **MyDashboardPage** — KPI + activity feed (대시보드, list 아님 — 분류 외).
- **ForumMemberManagementPage** — join request + member list 2탭. 인라인 approve/reject/delete. 멤버 수 적어 simple datatable 분류 적절.
- **ContentParticipantsPage** — summary card + participant table. read-only monitoring. simple datatable.
- **ParticipationListPage** — placeholder.

---

## 8. 영역별 권장 Family 매핑

```
PUBLIC BROWSING (SEO 높음, 비인증 또는 인증 후 탐색)
├── /forum          → WRAPPER → CARD-FIRST (ForumHubTemplate)
├── /courses        → CARD-FIRST (직접 구현)
└── /resources      → WRAPPER → CARD-FIRST (ResourcesHubTemplate)

CONTENT LISTING (인증 후 콘텐츠 탐색, 메타데이터 중요)
├── /forum/all      → HYBRID LIST (BaseTable)
├── /forum/:slug    → HYBRID LIST (BaseTable)
├── /lms            → HYBRID LIST (BaseTable + light bulk)
├── /content        → HYBRID LIST (hub)
├── /content/documents → TRUE CANONICAL TABLE ⭐
├── /content/courses → HYBRID LIST
└── /signage        → HYBRID LIST (외부 template)

PERSONAL / MY (인증 후 개인 관리)
├── /mypage         → 대시보드 (list 아님)
├── /mypage/requests → HYBRID LIST
├── /mypage/enrollments → ⚠️ HYBRID-LIST (현재 pure card, medium drift)
├── /mypage/credits → SIMPLE DATATABLE
├── /mypage/completions → SIMPLE DATATABLE (card 도 무방)
├── /mypage/certificates → SIMPLE DATATABLE (card 도 무방)
├── /lms/certificates → SIMPLE DATATABLE (card 도 무방)
├── /mypage/forums  → SIMPLE DATATABLE (card 도 무방)
└── /content/surveys → SIMPLE DATATABLE

INSTRUCTOR (정책상 community 와 operator 경계)
├── /instructor/courses → TRUE CANONICAL TABLE
└── /instructor/contents/:id/participants → SIMPLE DATATABLE

INTRANET / FEEDBACK (🚨 mock data, cleanup-first)
├── /intranet/notices  → LEGACY CLEANUP → SIMPLE DATATABLE (백엔드 연결 후)
├── /intranet/meetings → LEGACY CLEANUP → SIMPLE DATATABLE
├── /intranet/documents → LEGACY CLEANUP → SIMPLE DATATABLE
├── /intranet/schedule → LEGACY CLEANUP → 캘린더 (table 아님)
└── /intranet/feedback → LEGACY CLEANUP → SIMPLE DATATABLE/HYBRID
```

---

## 9. Mobile UX / SEO 판단

| 영역 | Mobile 비중 | SEO 가치 | 권장 family 일치도 |
|---|:---:|:---:|---|
| `/forum`(hub) | 높음 | 높음 | ✅ card-first |
| `/forum/all`, `/forum/:slug` | 중 | 중 (인증 후) | ✅ hybrid (BaseTable) |
| `/courses` (공개 카탈로그) | 높음 | 높음 | ✅ card-first |
| `/lms`, `/mypage/enrollments` | 높음 | 낮음 | ⚠️ enrollments 만 pure card → hybrid 권장 |
| `/resources` | 높음 | 높음 | ✅ card-first wrapper |
| `/content/documents` | 낮음 | 낮음 | ✅ true table (관리 UX) |
| `/content/courses` | 중 | 낮음 | ✅ hybrid |
| `/signage` | 중 | 낮음 | ✅ hybrid |
| `/intranet/*` | 낮음 | 낮음 | mock 정리 후 simple datatable |

→ **mobile 비중이 큰 페이지(`/courses`, `/forum`, `/resources`) 는 모두 card-first 로 정렬**, **desktop 관리 UX(`/content/documents`, `/instructor/courses`) 는 true table 로 정렬**. operator 표준 강제 흔적 없음 — 정책 의도와 일치.

---

## 10. drift 분석

### drift = high (잘못된 family) — **0 건**

KPA-Society community 영역에 명백한 high drift 없음.

### drift = medium — **1 건 (UX 분류) + 4 건 (legacy mock)**

| 파일 | drift 이유 |
|---|---|
| `pages/mypage/MyEnrollmentsPage.tsx` | pure card 구현, 메타데이터 밀도(4-5 필드)는 hybrid 적합. mobile UX 양호하나 desktop 에서 정보 밀도 낮음 |
| `pages/intranet/NoticeListPage.tsx` | raw `<table>` + mock data — KPA Operator OperatorContentHubPage 와 같은 LEGACY-RAW 패턴 |
| `pages/intranet/MeetingListPage.tsx` | mock data, table-like styled div |
| `pages/intranet/DocumentListPage.tsx` | mock data |
| `pages/feedback/FeedbackListPage.tsx` | `SAMPLE_POSTS` 상수, API 미연결 |

### drift = low — **24+ 건**

나머지 페이지는 권장 family 와 일치.

---

## 11. 즉시 정비 필요 항목 (우선순위)

1. **🚨 (전제 결정 필요)** intranet 4 페이지 + feedback 1 페이지 의 **백엔드 연결 또는 페이지 제거 결정** — canonical 분류는 결정 이후 자동 추진 가능
2. **NoticeListPage** raw `<table>` → BaseTable 마이그레이션 (Operator WO 패턴 재사용 가능, **단 mock data 정책 결정 선행**)
3. **MyEnrollmentsPage** card → hybrid (card+meta row 또는 table+thumbnail) — UX 개선 목적, 시급도 낮음

---

## 12. card 유지 권장 항목

탐색/visual/SEO/mobile 중요도 모두 높아 **table 전환 금지**:

- `/forum` (ForumHomePage — hub)
- `/courses` (CourseHubPage — 공개 카탈로그)
- `/resources` (ResourcesHubPage — hub)
- `/lms/certificates`, `/mypage/certificates`, `/mypage/completions` (수료 인증서 카드 — 시각적 가치)
- `/mypage/forums` (소유 forum 카드 — 외부 navigation 위주)

---

## 13. HYBRID 전환 권장 항목

- `/mypage/enrollments` ⚠️ (현재 pure card, 메타데이터 더 노출 가능)

→ 본 IR 범위 내에서 hybrid 신규 전환은 **1 건만**. 나머지는 이미 hybrid (BaseTable + 메타데이터 컬럼).

---

## 14. 본 IR 범위 외

- GlycoPharm / K-Cosmetics / Neture 의 사용자 영역 community 분류 — 후속 IR
- 외부 wrapper template (`ForumHubTemplate`, `ResourcesHubTemplate`, `SignageManagerTemplate`) 의 내부 구조 audit — 별도 IR 권장
- `@o4o/forum-core`, `@o4o/lms-core` 등 패키지 컴포넌트 canonical audit
- 디테일/상세 페이지 내부 하위 리스트 (e.g. forum post comments, course curriculum)
- 후속 WO 작성 — 본 IR 단계에서는 제외 (사용자 지시)

---

## 15. 위험 신호

| # | 항목 | 영향 |
|---|---|---|
| 1 | **intranet 5 페이지 mock data 잔존** — 사용자 신뢰도 손상 가능 (실제 운영 가정 시) | ⭐ 정책 결정 필요 |
| 2 | **`MyEnrollmentsPage` 메타데이터 밀도 낮음** — 진도/상태 확인이 어려움 | 사용자 효율성 |
| 3 | **외부 wrapper template 의존도** — 정비 변경이 KPA 만 영향이 아님 | 영향 범위 큼 (별도 IR) |
| 4 | **operator vs community 경계 모호** — `/instructor/*` 영역 정책 미확정 | UX 일관성 |
| 5 | **`NoticeListPage` raw `<table>` 잔존** — KPA Operator drift 와 유사 (이번엔 mock data 까지 결합) | drift 패턴 반복 |

---

## 16. 참조

### 사용자 영역 canonical 정렬 우수 사례
- `services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx` (TRUE CANONICAL)
- `services/web-kpa-society/src/pages/contents/ContentCoursesPage.tsx` (HYBRID)
- `services/web-kpa-society/src/pages/courses/CourseHubPage.tsx` (CARD-FIRST)

### 외부 wrapper templates
- `@o4o/shared-space-ui` `ForumHubTemplate`
- `@o4o/shared-space-ui` `ResourcesHubTemplate`
- Signage `SignageManagerTemplate`

### 정비 후보 (mock data + raw table)
- `services/web-kpa-society/src/pages/intranet/NoticeListPage.tsx`
- `services/web-kpa-society/src/pages/intranet/MeetingListPage.tsx`
- `services/web-kpa-society/src/pages/intranet/DocumentListPage.tsx`
- `services/web-kpa-society/src/pages/intranet/SchedulePage.tsx`
- `services/web-kpa-society/src/pages/feedback/FeedbackListPage.tsx`

### UX 개선 후보
- `services/web-kpa-society/src/pages/mypage/MyEnrollmentsPage.tsx`

### 연관 IR
- `IR-O4O-KPA-OPERATOR-LIST-CANONICAL-COVERAGE-AUDIT-V1` (operator counterpart)

### Canonical 기준 (참조)
- `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`
- `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`

---

*조사 전용 — 코드/DB 수정 없음. 본 IR 단계에서 후속 WO 작성 금지 (사용자 지시).*
