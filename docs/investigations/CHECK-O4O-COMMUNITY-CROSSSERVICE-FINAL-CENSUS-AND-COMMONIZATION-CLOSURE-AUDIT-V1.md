# CHECK — O4O 커뮤니티 5서비스 최종 census 및 공통화 종료 감사 V1

- **WO**: `WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-CENSUS-AND-COMMONIZATION-CLOSURE-AUDIT-V1`
- **작업일**: 2026-08-20
- **시작 commit**: `d05fd8a28`
- **대상 서비스**: KPA-Society · K-Cosmetics · GlycoPharm · PharmacyHub · Neture (5)
- **성격**: 조사·판정 전용. 코드 변경 없음.

## 0. 모집단 재산출 방법 (WO §2·§3)

과거 census(295 cell)를 재사용하지 않고 **현재 main 코드에서 모집단을 다시 만들었다.**

수집 소스:

| 축 | 실제 수집물 |
|---|---|
| Frontend route | 각 서비스 `App.tsx`/`routes/*` 의 `path=` 전수 (KPA 225 · KCos 182 · GP 238 · PH 53 · Neture 291) |
| Frontend page | `services/*/src/pages/**` 중 forum·content·resource·lms·course·community·library·hub·member·enroll·certificate·education 경로 전수 |
| 공통 패키지 소비 | `@o4o/shared-space-ui` · `@o4o/lms-ui` · `@o4o/account-ui` · `@o4o/auth-utils` · `@o4o/operator-core-ui` · `@o4o/store-ui-core` · `@o4o/forum-core` 의 컴포넌트별 서비스 소비 매트릭스 |
| Backend | `apps/api-server/src/bootstrap/register-routes.ts` mount 전수 + `routes/forum/**` · `modules/lms/routes/**` · `modules/appreciation/routes/**` 의 handler 전수 |
| 중복 측정 | 서비스 쌍별 동종 page 파일 line-level 유사도(`difflib.SequenceMatcher`) 전수 스캔 (60줄 이상 · 길이차 50% 이내 대상) |

### 판정 규칙 (재현 가능하게 고정)

| 판정 | 기준 |
|---|---|
| `FULLY_COMMON` | 화면이 공통 template/View 에 위임되고 서비스 파일은 config·adapter 중심 |
| `CORE_ONLY` | 공통 부품(백엔드 계약·하위 컴포넌트)은 쓰지만 화면 셸을 서비스가 직접 소유 |
| `VIEW_DUPLICATED` | 다른 서비스와 셸 코드가 실질 동일(유사도 ≥ 0.80)이며 공통 부품 위임으로 설명되지 않음 |
| `SERVICE_SPECIFIC` | 해당 서비스 고유 업무 |
| `NOT_IMPLEMENTED` | 해당 서비스에 기능 없음 |
| `OUT_OF_SCOPE` | 커뮤니티 공통화 범위 밖(매장 실행자산 · 공급자/파트너 업무) |

유사도만으로 VIEW_DUPLICATED 를 매기지 않는다. thin wrapper 는 공통 템플릿에 위임했기 때문에 서로 닮는 것이 정상이므로 `FULLY_COMMON` 이다
(예: `MyPostsPage` KCos↔GP↔Neture 0.94 — 106줄 `MyForumPostsTemplate` wrapper · `contents/ContentListPage` KCos↔GP 0.97 — 63줄 `CommunityContentListTemplate` wrapper).

### A. 전체 census

총 기능 단위 66개 × 5서비스 = 330 cell · 미조사 0

| ID | 기능 단위 | KPA | KCos | GP | PH | Neture | 근거 |
|---|---|---|---|---|---|---|---|
| A1 | 커뮤니티 홈 화면 (StandardHomeTemplate) | FC | FC | FC | FC | FC | 5서비스 모두 공통 홈 템플릿 소비 |
| A2 | 홈 최신 활동 섹션 | FC | FC | FC | FC | CO | Neture 만 LatestActivitySection 미채택(자체 조합) |
| A3 | 최신 활동 전체보기 화면 | FC | NI | NI | NI | NI | KPA HomeLatestPage 만 존재 |
| A4 | 커뮤니티 기능 가이드 페이지 | FC | FC | FC | NI | FC | 공통 guide content 렌더 · PH 는 guide route 없음 |
| B1 | 포럼 허브(게시판 목록) | FC | FC | FC | FC | FC | ForumHubTemplate |
| B2 | 포럼 게시글 목록 | CO | FC | FC | FC | FC | KPA 만 ForumListTemplate 미채택(BaseTable 자체 목록 719L) |
| B3 | 게시글 상세 화면 셸 | CO | CO | CO | CO | CO | 공통 부품 채택 · 셸은 서비스 소유(298~701L) |
| B4 | 게시글 본문/헤더 렌더 | FC | FC | FC | FC | FC | ForumPostContent · ForumPostHeader |
| B5 | 댓글 작성/목록 | FC | FC | FC | FC | FC | ForumCommentForm · ForumCommentList |
| B6 | 대댓글(답글) 경계 | FC | FC | FC | FC | FC | backend parentId 동일 post 검증 공통(3b06ad03d) |
| B7 | 게시글 좋아요 | FC | FC | FC | FC | FC | ForumLikeButton |
| B8 | 글쓰기/수정 화면 셸 | CO | VD | VD | FC | CO | KCos↔GP 유사도 0.84(322~329L, 위임으로 설명 안 됨) |
| B9 | 글쓰기 폼 | FC | FC | FC | FC | FC | ForumWriteForm |
| B10 | 내가 쓴 글 | FC | FC | FC | FC | FC | MyForumPostsTemplate thin wrapper |
| B11 | 포럼 삭제 요청(소유자) | FC | FC | FC | NI | FC | ForumOwnerDashboard |
| B12 | 게시판 개설 요청(사용자) | FC | FC | FC | NI | FC | ForumRequestForm |
| B13 | 내 개설 요청 현황 | FC | NI | FC | NI | NI | KPA·GP 만 화면 보유 |
| B14 | 내 포럼 대시보드(소유자) | FC | FC | FC | NI | FC | ForumOwnerDashboard + adapter |
| B15 | 폐쇄 포럼 회원 관리 | FC | FC | FC | NI | NI | ForumOwnerMemberManagement |
| B16 | 운영자 포럼 관리 콘솔 | FC | FC | FC | NI | FC | operator-core-ui 위임 |
| B17 | 운영자 포럼 카테고리 관리 | FC | FC | FC | NI | NI | operator-core-ui 위임 |
| B18 | 운영자 삭제요청 관리 | FC | FC | FC | NI | FC | OperatorForumDeleteRequestsConsolePage |
| B19 | 운영자 포럼 통계 | FC | FC | FC | NI | FC | operator-core-ui 위임 |
| B20 | 운영자 개설요청 승인 | FC | FC | FC | NI | NI | operator-core-ui 위임 |
| B21 | 운영자 커뮤니티 관리 콘솔 | CO | NI | VD | NI | VD | GP↔Neture 유사도 0.92(454~489L, 공통 모듈 없음) |
| B22 | 삭제 포럼 복구 콘솔(관리자) | NI | NI | NI | NI | SS | Neture 자체 548L |
| B23 | 서비스 업데이트 포럼 | NI | NI | NI | NI | SS | Neture /forum/service-update |
| B24 | 공급자·파트너 전용 포럼 | OOS | OOS | OOS | OOS | OOS | 공급자/파트너 업무 축 — 커뮤니티 공통화 범위 밖 |
| B25 | 커뮤니티 통합 검색 화면 | NI | NI | NI | FC | NI | PH /community/search (ForumListTemplate). 타 서비스는 목록 내 검색으로 대체 |
| C1 | 콘텐츠 목록 | CO | FC | FC | NI | FC | KPA 761L 자체 목록 · PH 는 매장(store-owner) 자산만 존재 |
| C2 | 콘텐츠 상세 | CO | FC | FC | NI | FC | KCos·GP CommunityContentDetailTemplate |
| C3 | 콘텐츠 검색/필터 | FC | FC | FC | NI | FC | CommunityContentSearchBar / 템플릿 내장 |
| C4 | 콘텐츠 작성/수정 | CO | FC | FC | NI | NI | KCos↔GP 122L thin wrapper(0.98, 위임으로 설명됨) |
| C5 | 감사 포인트(Appreciation) | FC | FC | FC | NI | NI | AppreciationPanel |
| C6 | 내 콘텐츠 | CO | NI | NI | NI | CO | KPA 1001L · Neture 690L (유사도 0.59) |
| C7 | 운영자 콘텐츠 허브 콘솔 | VD | NI | VD | NI | NI | KPA↔GP 유사도 0.81(590~707L, DataTable 외 공통 없음) |
| C8 | 운영자 CMS 콘텐츠 관리 | NI | FC | NI | NI | NI | KCos CmsContentManager 위임 |
| C9 | 운영자 가이드 콘텐츠 관리 | FC | FC | FC | NI | FC | operator-core-ui 위임 |
| D1 | 자료실 목록 | FC | FC | FC | NI | FC | ResourcesHubTemplate |
| D2 | 자료실 상세 | FC | FC | FC | NI | FC | ResourcesHubTemplate fetchDetail |
| D3 | 자료 등록/수정 | FC | NI | NI | NI | NI | KPA ResourceWriteModal |
| D4 | 매장 HUB 자료 라이브러리 | OOS | OOS | OOS | OOS | OOS | 매장 실행자산(HubImportLibraryView) — 커뮤니티 범위 밖 |
| E1 | LMS 허브/강의 목록 | FC | FC | FC | FC | NI | LmsHubTemplate · Neture LMS 없음 |
| E2 | 강의 상세 | CO | FC | FC | FC | NI | KPA CourseIntroPage 719L 병행 |
| E3 | 수강신청 | FC | FC | FC | FC | NI | 공통 CourseDetailView enroll |
| E4 | 레슨 플레이어 | FC | FC | FC | FC | NI | LessonPlayerView |
| E5 | 진도 저장 | FC | FC | FC | FC | NI | 공통 player + /lms/enrollments/:id/progress |
| E6 | 내 수강 목록 | CO | FC | FC | NI | NI | KPA hybrid list UX 별도 유지(문서화된 정책) |
| E7 | 내 수료증 | CO | FC | FC | NI | NI | KPA 264L · MyCertificatesView 미채택(정책) |
| E8 | 수료증 검증(공개) | FC | NI | NI | NI | NI | KPA CertificateVerifyPage |
| E9 | 퀴즈 | FC | NI | NI | NI | NI | KPA QuizBuilder + 공통 player 제출 |
| E10 | 과제 | FC | NI | NI | NI | NI | KPA AssignmentEditor/LessonSubmissions |
| E11 | 강사 강의 관리 | CO | FC | CO | NI | NI | KPA 921L · GP 571L 자체 편집기 |
| E12 | 강사 수강생 관리 | CO | NI | CO | NI | NI | KPA 716L · GP 278L |
| E13 | 운영자 LMS 강의 콘솔 | FC | FC | FC | NI | NI | OperatorLmsCoursesPage 27L thin wrapper |
| F1 | 서비스 가입 게이트(MembershipGate) | CO | CO | CO | CO | CO | @o4o/auth-utils membershipGate 공통 · UI/CTA 서비스별(명문화된 예외) |
| F2 | 회원 목록/승인 콘솔 | FC | FC | FC | NI | FC | operator-core-ui/modules/members |
| F3 | 멤버십 신청/현황(사용자) | FC | FC | FC | FC | FC | 서비스별 가입 동선 + 공통 게이트 |
| F4 | 폐쇄 커뮤니티 접근 판정 | FC | FC | FC | FC | FC | backend forum membership guard 공통 |
| G1 | 포럼 알림 | NI | NI | NI | NI | NI | backend /forum/notifications 존재하나 소비 0 (DEAD_BACKEND) |
| G2 | 포럼 추천 | NI | NI | NI | NI | NI | backend /forum/recommendations 소비 0 (DEAD_BACKEND) |
| G3 | 포럼 AI 메타데이터 | NI | NI | NI | NI | NI | backend /forum/ai 소비 0 (DEAD_BACKEND) |
| G4 | 인기 태그 | FC | NI | NI | NI | NI | KPA /posts/tags/popular |
| H1 | 비즈니스 포럼(GP) | NI | NI | SS | NI | NI | GP /business/forum |
| H2 | 피드백 포럼(GP) | NI | NI | SS | NI | NI | GP /forum/feedback |
| H3 | 매장 HUB 커뮤니티 진입 | OOS | OOS | OOS | OOS | OOS | StoreHubTemplate — 매장 실행자산 축 |

### B. 서비스별 집계

| 서비스 | FULLY_COMMON | CORE_ONLY | VIEW_DUPLICATED | SERVICE_SPECIFIC | NOT_IMPLEMENTED | OUT_OF_SCOPE |
|---|---:|---:|---:|---:|---:|---:|
| KPA-Society | 39 | 14 | 1 | 0 | 9 | 3 |
| K-Cosmetics | 41 | 2 | 1 | 0 | 19 | 3 |
| GlycoPharm | 40 | 4 | 3 | 2 | 14 | 3 |
| PharmacyHub | 19 | 2 | 0 | 0 | 42 | 3 |
| Neture | 25 | 5 | 1 | 2 | 30 | 3 |

### C. 기능축별 집계

| 축 | 이름 | FC | CO | VD | SS | NI | OOS |
|---|---|---:|---:|---:|---:|---:|---:|
| A | 커뮤니티 홈/피드 | 14 | 1 | 0 | 0 | 5 | 0 |
| B | 포럼 | 76 | 9 | 4 | 2 | 29 | 5 |
| C | 콘텐츠 | 20 | 5 | 2 | 0 | 18 | 0 |
| D | 자료실 | 9 | 0 | 0 | 0 | 6 | 5 |
| E | LMS | 30 | 7 | 0 | 0 | 28 | 0 |
| F | 멤버십/폐쇄 커뮤니티 | 14 | 5 | 0 | 0 | 1 | 0 |
| G | 검색/활동/알림 | 1 | 0 | 0 | 0 | 19 | 0 |
| H | 서비스 고유 확장 | 0 | 0 | 0 | 2 | 8 | 5 |

### 총계

- FULLY_COMMON: 164
- CORE_ONLY: 27
- VIEW_DUPLICATED: 6
- SERVICE_SPECIFIC: 4
- NOT_IMPLEMENTED: 114
- OUT_OF_SCOPE: 15
- 미조사: 0
## D. Residual 분석

### D-1. VIEW_DUPLICATED 6 cell (WO §11 — 종료 blocker)

| 기능 단위 | 중복 상대 | 대략 규모 | 공통화 난이도 | 공통화 이득 |
|---|---|---|---|---|
| B8 포럼 글쓰기/수정 화면 셸 | K-Cosmetics `forum/ForumWritePage.tsx`(329L) ↔ GlycoPharm `forum/ForumWritePage.tsx`(322L) · 유사도 0.84 | 중복 셸 약 250L × 2 | **낮음** — 차이는 라벨 언어 · 상세 route(`/forum/post/:id` vs `/forum/posts/:id`) · api import 경로뿐. `ForumWriteForm` 을 감싸는 `ForumWritePageTemplate` 로 승격 가능 | 약 250L 제거 · 글쓰기 후 이동 경로 결함 재발 차단 |
| B21 운영자 커뮤니티 관리 콘솔 | GlycoPharm `operator/CommunityManagementPage.tsx`(489L) ↔ Neture `admin/CommunityManagementPage.tsx`(454L) · 유사도 0.92 | 중복 약 420L × 2 | **중간** — 공통 모듈 위임이 전혀 없다. `@o4o/operator-core-ui/modules/*` 선례(members · forum-delete-requests)와 동일한 client adapter 패턴으로 승격 가능 | 약 420L 제거 · KPA(629L, 유사도 0.44~0.46)까지 3서비스 수렴 여지 |
| C7 운영자 콘텐츠 허브 콘솔 | KPA `operator/OperatorContentHubPage.tsx`(707L) ↔ GlycoPharm `operator/OperatorContentHubPage.tsx`(590L) · 유사도 0.81 | 중복 약 480L × 2 | **중간** — 공통은 `@o4o/operator-ux-core` DataTable primitive 뿐이고 목록·필터·편집 셸 전체가 복제됐다 | 약 480L 제거 |

→ **VIEW_DUPLICATED > 0 이므로 WO §11·§17 에 따라 최종 완료를 선언할 수 없다.**

### D-2. CORE_ONLY 27 cell 전수 재측정 (WO §10)

| 기능 단위 | 대상 | View 가 달라야 하는가 | 판정 |
|---|---|---|---|
| B3 게시글 상세 셸 (5) | 전 서비스 | 예 — 서비스별 부가 기능(KPA 태그·AI 클립보드, Neture service-update/공급자 축, PH 최소 셸)이 상세 화면에 붙는다. 쌍별 유사도 최대 0.46 으로 복제 근거 없음 | `ACCEPTED_CORE_ONLY` |
| B2 포럼 목록 (KPA) | KPA 719L BaseTable 목록 | 예 — KPA 는 표 기반 목록(태그 · AI 복사 · Combobox 검색)이 업무 요구. 공통 부품(`ForumListToolbar`·`ForumListInfoBar`·`HubPagination`·`formatForumDate`)은 이미 채택 | `ACCEPTED_CORE_ONLY` |
| B8 글쓰기 셸 (KPA·Neture) | KPA 291L · Neture 569L | 예 — 상호 유사도 0.20. Neture 는 공급자·service-update 대상 선택이 추가된다 | `ACCEPTED_CORE_ONLY` (KCos·GP 승격 시 재검토) |
| B21 운영자 커뮤니티 콘솔 (KPA) | KPA 629L | 아니오 — GP/Neture 공통화 시 함께 수렴 대상 | `MUST_FIX_BEFORE_CLOSE` (D-1 ②에 흡수) |
| C1·C2·C3·C4 콘텐츠 (KPA) | KPA 761L 목록 · 244L 상세 · 178L 작성 | 예 — KPA 콘텐츠는 참여·설문·문서 축이 함께 붙어 KCos/GP 의 단순 목록과 업무가 다르다 | `ACCEPTED_CORE_ONLY` |
| C6 내 콘텐츠 (KPA·Neture) | KPA 1001L · Neture 690L · 유사도 0.59 | 예 — 소유 자산 종류가 서비스마다 다르다 | `ACCEPTED_CORE_ONLY` |
| A2 홈 최신활동 (Neture) | Neture 자체 조합 | 아니오 — `LatestActivitySection` 채택 가능. 다만 Neture 홈은 공지/포럼 2 소스만 노출하는 축소형이라 이득이 작다 | `ACCEPTED_CORE_ONLY` |
| E2 강의 상세 (KPA) | KPA `CourseIntroPage` 719L 병행 | 예 — KPA 는 공개 소개 페이지 + 공통 `CourseDetailView` 를 함께 운영 | `ACCEPTED_CORE_ONLY` |
| E6·E7 내 수강·내 수료증 (KPA) | KPA 355L · 264L | 예 — **문서화된 정책**. `packages/account-ui/src/components/MyEnrollmentsView.tsx` 헤더에 "KPA 는 hybrid list UX 로 별도 유지"가 명시돼 있다 | `ACCEPTED_CORE_ONLY` |
| E11·E12 강사 강의·수강생 (KPA·GP) | KPA 921L/716L · GP 571L/278L | 예 — 상호 유사도 0.65 미만. KPA 는 퀴즈·과제·AI 구조 생성까지 포함 | `ACCEPTED_CORE_ONLY` |
| F1 MembershipGate (5) | KPA 179L · KCos 101L · GP 101L · Neture 83L · PH 95L | 예 — **명문화된 예외**. `packages/auth-utils/src/membershipGate.ts` 헤더가 "미포함: SERVICE_KEY 상수 / React 컴포넌트(서비스별 UI 차이 유지) / redirect·onboarding CTA(서비스별 정책 유지)" 로 제외 범위를 고정 | `ACCEPTED_CORE_ONLY` |

→ `MUST_FIX_BEFORE_CLOSE` 인 CORE_ONLY 는 **B21(KPA)** 1 cell 뿐이며 D-1 ②의 후속 WO 에 흡수된다. 나머지 26 cell 은 `ACCEPTED_CORE_ONLY`.

### D-3. NOT_IMPLEMENTED 114 cell — A/B/C 내부 분류 (WO §9)

공식 판정은 `NOT_IMPLEMENTED` 로 유지한다. 아래는 내부 분류이며 **이번 WO 에서 없는 기능을 신규 구현하지 않는다.**

| 유형 | 개수 | 대표 |
|---|---:|---|
| **A. 향후 필요한 공통 기능** | 21 | PH 커뮤니티 가이드(A4) · PH 포럼 개설 요청/소유자 대시보드/삭제 요청(B11·B12·B14) · PH 운영자 포럼 콘솔군(B16~B20) · Neture 폐쇄 포럼 회원 관리(B15) · Neture 포럼 카테고리/개설요청 승인(B17·B20) |
| **B. 서비스 성격상 선택적 미채택** | 74 | Neture LMS 전 축(E1~E13) · PH 커뮤니티 콘텐츠/자료실(C1~C5·D1~D3) · KCos·GP·Neture 퀴즈/과제/수료증 검증(E8~E10) · 타 서비스의 통합 검색 화면(B25) · 최신활동 전체보기(A3) |
| **C. 실제 누락·결함 가능성** | 19 | **G1 포럼 알림 · G2 포럼 추천 · G3 포럼 AI (각 5서비스 = 15)** — backend 는 살아 있는데 프런트 소비가 0 (D-4 DEAD_BACKEND 와 동일 대상) · KCos 내 개설요청 현황(B13) · KCos·GP·Neture·PH 인기 태그(G4 중 4) |

### D-4. Dead / Stale census (WO §12 — 이번에 제거하지 않는다)

**DEAD_FRONTEND**

| 대상 | 근거 |
|---|---|
| `packages/forum-core/src/admin-ui/**` (ForumApp · ForumBoardList · ForumCategories · ForumPostDetail · ForumPostForm · ForumReports) | 5서비스 소비 0 |
| `packages/shared-space-ui/src/ForumDetailStates.tsx` | 서비스 소비 0 · 패키지 내부 소비도 0 (export 만 유지) |
| `services/web-k-cosmetics/src/services/forumApi.ts` `extractTextContent` | 서비스 내 소비 0 |
| `services/web-neture/src/services/forumApi.ts` `updateUserContactSettings` | 서비스 내 소비 0 |
| `services/web-kpa-society/src/api/operatorMultilingualContent.ts` `deleteOperatorMlcGroup` | 서비스 내 소비 0 |
| `services/web-k-cosmetics|web-glycopharm/src/api/productAiContent.ts` `getProductAiContents` · `saveProductAiContent` | 서비스 내 소비 0 |

**DEAD_BACKEND** (mount 되어 있으나 5서비스 프런트 소비 0)

| 대상 | mount |
|---|---|
| 포럼 알림 라우터 | `/api/v1/forum/notifications/*` (SSE stream 포함) |
| 포럼 추천 라우터 | `/api/v1/forum/recommendations/*` |
| 포럼 AI 라우터 | `/api/v1/forum/ai/*` |

**STALE_CONTRACT**

| 대상 | 내용 |
|---|---|
| `packages/forum-core/src/admin-ui/pages/ForumPostDetail.tsx:107·118` | 존재하지 않는 endpoint `POST /v1/forum/posts/:id/toggle-pin` · `toggle-lock` 호출. 현재 canonical 은 `PATCH /api/v1/forum/posts/:id/pin` |
| `apps/api-server/src/routes/forum/forum.recommendation.routes.ts` `GET /recommendations/yaksa` | `yaksa` 는 제거된 legacy 서비스 축 |

**INTENTIONAL_LEGACY**

| 대상 | 내용 |
|---|---|
| `isCourseInServiceScope` 의 `serviceKey IS NULL → kpa-society` fallback | legacy 강의 흡수용. 코드에 명시된 의도된 계약 |
| generic `/api/v1/forum/*` write 의 `requireGenericForumWriteAdmin` | 서비스 prefix 라우터로 이관한 뒤 generic write 를 platform admin 으로 봉인한 상태. 의도된 잠금 |

> DEAD_FRONTEND 스캔은 `export function` 선언 기준이다. `export const` 형태 함수는 이번 스캔 범위 밖이다(측정 한계 명시).

### D-5. Generic API 검토 (WO §13)

| generic API | 성격 | 경계 | 판정 |
|---|---|---|---|
| `/api/v1/forum/posts|comments|categories` (read) | 서비스 사용자 대면 | `optionalAuth` + 공개 포럼만. 폐쇄 포럼 익명 read 는 403 | 결함 없음 |
| `/api/v1/forum/*` (write) | 서비스 사용자 대면 | `requireGenericForumWriteAdmin` — platform admin 전용. 서비스 사용자 write 는 전부 서비스 prefix 라우터 경유 | 결함 없음 |
| `/api/v1/forum/category-requests/*` | 서비스 사용자 대면 | `POST` 는 `serviceCode` 필수 + fail-closed(`INVALID_SERVICE_CODE`) · `GET /my` 는 `user.id` scope · `GET /:id` 는 소유자 또는 해당 서비스 admin 이 아니면 403 | 결함 없음 |
| `/api/v1/forum/operator/*` · `/admin/*` | 운영자·관리자 | 서비스별 operator guard | 결함 없음 |
| `/api/v1/lms/*` | 서비스 사용자 대면 | `resolveLmsServiceScope(req)` — service context 또는 명시적 `serviceKey`. KCos·GP·PH 프런트는 공통 factory `createLmsLearnerClient(http, { serviceKey })` 로 canonical 값을 client 계층에서 주입하고, 서버가 raw 값을 canonical 로 덮어쓴다 | 결함 없음 |
| `/api/v1/appreciation/*` | 플랫폼 중립 | 서비스 경계 없음. 응답은 집계 + 최근 메시지이며 포인트 지갑 자체가 플랫폼 단위 | `ACCEPTED_RESIDUAL` (보안 결함 아님) |
| `/api/v1/forum/notifications|recommendations|ai` | 소비 0 | — | DEAD_BACKEND (D-4) |

### D-6. Service isolation 잔존 (WO §14)

| 점검 항목 | 결과 |
|---|---|
| 타 서비스 entityId 직접 조회 | 없음. Forum 은 `resolveForumPostInServiceScope`·`resolveForumCommentInServiceScope`, LMS 는 `isCourseInServiceScope`/`guardLoadedCourseScope` 로 로딩 직후 scope 판정 |
| serviceKey 누락 | 없음. LMS enrollment·certificate 목록은 `filters.serviceKey = scope` 로 client raw 값을 덮어쓴다 |
| 폐쇄 커뮤니티 membership 누락 | 없음 (`assertForumWriteAccess` + 익명 403 실측) |
| 수평 소유권(내 글 · 내 수강 · 내 수료증) | 없음. 전부 `user.id` scope |
| service-prefixed frontend 가 generic unscoped backend 호출 | 해당 없음. KCos·GP·PH 의 `/lms/*` 호출은 generic mount 를 쓰지만 canonical `serviceKey` 를 항상 주입한다 |
| 대댓글 parentId 경계 | 직전 WO 에서 동일 post 검증 추가 · 회귀 테스트 상주 |

→ **service-boundary 중대 결함 0.** 이번 WO 에서 추가한 additive fix 없음(수정 대상이 없었다).

### D-7. Residual matrix (WO §16 · §20-D)

| 분류 | 항목 |
|---|---|
| `MUST_FIX_BEFORE_CLOSE` | ① B8 포럼 글쓰기 셸 KCos↔GP 중복 ② B21 운영자 커뮤니티 관리 콘솔 GP↔Neture 중복(+KPA CORE_ONLY 수렴) ③ C7 운영자 콘텐츠 허브 콘솔 KPA↔GP 중복 |
| `ACCEPTED_RESIDUAL` | CORE_ONLY 26 cell(D-2 근거) · NOT_IMPLEMENTED 114 cell(공식 판정 유지) · `/api/v1/appreciation` 무경계 · DEAD/STALE 목록(D-4, 제거는 별도 WO) |
| `OUTSIDE_COMMUNITY` | 공급자·파트너 포럼(B24) · 매장 HUB 자료 라이브러리(D4) · 매장 HUB 진입(H3) · PharmacyHub `store-owner/*` 콘텐츠·자료실 |

## E. 과거 census 대비 변화 (WO §15 · §20-E)

| 항목 | 최초 census | 이번 재산출 |
|---|---:|---:|
| 기능 단위 | 59 | 66 |
| cell | 295 | 330 |
| FULLY_COMMON | 76 | 164 |
| CORE_ONLY | 22 | 27 |
| VIEW_DUPLICATED | 23 | 6 |
| SERVICE_SPECIFIC | 26 | 4 |
| NOT_IMPLEMENTED | 145 | 114 |
| OUT_OF_SCOPE | 3 | 15 |
| 미조사 | 0 | 0 |

숫자를 일대일로 맞추지 않았다. 주요 변화 원인:

- **신규 단위**: PharmacyHub 채택으로 생긴 단위(B25 통합 검색), 운영자 축 단위 분리(B16~B21 · C7~C9), 자료실 축 분리(D1~D3), 대댓글 경계(B6).
- **분리된 단위**: 과거 "Forum" 계열 단위를 화면 셸 / 본문 렌더 / 댓글 / 좋아요 / 글쓰기 폼 / 글쓰기 셸로 쪼갰다. 이 분리가 FULLY_COMMON 증가와 VIEW_DUPLICATED 감소의 최대 요인이다.
- **합쳐진 단위**: 매장 HUB 라이브러리(블로그·QR·POP·사이니지)를 D4 한 단위로 묶고 `OUT_OF_SCOPE` 로 고정했다.
- **판정 전환**: 과거 SERVICE_SPECIFIC 이던 다수(운영자 콘솔군 · MyPosts · 콘텐츠 목록/상세)가 실제 코드에서 공통 모듈 위임으로 확인돼 `FULLY_COMMON` 으로 이동했다. 반대로 SERVICE_SPECIFIC 으로 눌러두던 공급자·파트너 포럼과 매장 실행자산은 `OUT_OF_SCOPE` 로 재분류했다(3 → 15).
- **새로 드러난 중복**: 운영자 콘솔 축(B21 · C7)은 과거 census 에 단위 자체가 없어 중복이 보이지 않았다. 이번에 처음 측정됐다.

## G. 검증 (WO §18)

코드 변경이 없으므로 프로덕션 재배포는 수행하지 않았다.

| 항목 | 결과 |
|---|---|
| `@o4o/shared-space-ui` tsc | exit=0 |
| `@o4o/lms-ui` · `@o4o/account-ui` · `@o4o/auth-utils` · `@o4o/forum-core` · `@o4o/operator-core-ui` · `@o4o/store-ui-core` tsc | 전부 exit=0 |
| 5서비스 frontend tsc | KPA 0 · KCos 0 · GP 0 · PH 0 · Neture 0 |
| api-server tsc | exit=0 |
| api-server jest (forum·lms·content 패턴) | 23 suites / 535 tests PASS |
| api-server jest 전체 | 161 suites / 2,490 tests PASS |
| route ↔ static import 정합 | 5서비스 route 정의에서 참조하는 lazy import 대상 전부 존재. 미해결 import 0 |

> 최초 5서비스 tsc 시도에서 KCos 3건 · Neture 3건의 `@o4o/account-ui` export 미존재 오류가 났으나, 원인은 **로컬 `packages/account-ui/dist` 가 stale** 한 것이었다(소스 `index.ts` 에는 4개 export 모두 존재). `pnpm --filter @o4o/account-ui build` 후 재실행하여 두 서비스 모두 exit=0. 저장소 코드 결함 아님.

## H. Browser final smoke (WO §19)

프로덕션 실제 도메인. viewport 1440×900 및 모바일 390×900 2회 수행. 각 route 별 console error / pageerror / 4xx·5xx 응답을 수집했다.

| 서비스 | route | HTTP | 렌더 | console error | 4xx·5xx |
|---|---|---:|---|---:|---:|
| KPA | `/forum` · `/contents` · `/resources` · `/lms` | 200 | 정상(포럼 목록·콘텐츠 허브·자료실 3건·강의 3건) | 0 | 0 |
| K-Cosmetics | `/forum` · `/content` · `/resources` · `/lms` | 200 | 정상 | 0 | 0 |
| GlycoPharm | `/forum` · `/content` · `/resources` · `/lms` | 200 | 정상 | 0 | 0 |
| Neture | `/forum` · `/resources` | 200 | 정상(포럼 목록 표시) | 0 | 0 |
| PharmacyHub | `/forum` · `/community` · `/community/search` · `/education` | 200 | 정상(비로그인 → 공통 로그인 안내 게이트) | 0 | 0 |

- **미구현 route 부재 확인**: PH `/contents`, Neture `/contents`, KCos·GP `/contents` 는 앱 내 404 화면으로 처리된다(HTTP 200 + SPA NotFound). 커뮤니티 콘텐츠 canonical route 는 KCos·GP 에서 `/content` 이며 정상 동작한다. PH 는 커뮤니티 콘텐츠 route 자체가 없음을 확인했다(census C1~C5 = NOT_IMPLEMENTED 와 일치).
- **커스텀 도메인 SPA fallback**: 5개 도메인 전부 deep link 직접 진입에서 index fallback 정상. blocker 결함 없음.
- **cross-service mixing 0**: 각 도메인이 자기 서비스 브랜딩·자기 포럼 목록만 렌더. 타 서비스 데이터 유입 없음.
- **모바일(390px)**: 5서비스 `/forum` 전부 정상 렌더 · console error 0.
- 흰 화면 0 · JS exception 0 · 치명적 404·500 0.

## I. 최종 판정 (WO §17 · §20-F)

| 종료 조건 | 충족 |
|---|:---:|
| 모집단을 현재 코드에서 재산출 | ✅ |
| 미조사 0 | ✅ |
| VIEW_DUPLICATED 0 | ❌ **6** |
| MUST_FIX_BEFORE_CLOSE 0 | ❌ **3** |
| 주요 shared adoption 실제 소비 확인 | ✅ |
| 5서비스 route / build 정상 | ✅ |
| service-boundary 중대 결함 0 | ✅ |

### `COMMUNITY_COMMONIZATION = NOT_COMPLETE`

사유: WO §11 · §17 에 따라 `VIEW_DUPLICATED` 가 6 cell(3 중복 family) 남아 있다. 이는 과거 오판이 아니라 이번 census 에서 처음 측정된 실제 중복이며(운영자 콘솔 축 2건은 최초 census 에 단위 자체가 없었다), 셸 유사도 0.81~0.92 로 공통 모듈 위임이 전혀 없다.

보안·경계 축은 종료 가능 상태다(§13 · §14 결함 0). 남은 것은 **운영자·글쓰기 화면 셸의 View 수렴** 뿐이다.

## J. 후속 WO 제안 (WO §21 — 큰 묶음 3개 이하)

### 후속 1. `WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1` (blocker)
- 대상: B21 운영자 커뮤니티 관리 콘솔(KPA 629L · GP 489L · Neture 454L) + C7 운영자 콘텐츠 허브 콘솔(KPA 707L · GP 590L)
- 방식: `@o4o/operator-core-ui/modules/members` · `modules/forum-delete-requests` 선례와 동일한 **client adapter 주입형 공통 콘솔 페이지** 로 승격
- 종료 조건: VIEW_DUPLICATED 4 cell 해소 + KPA B21 CORE_ONLY 재판정

### 후속 2. `WO-O4O-COMMUNITY-FORUM-WRITE-SHELL-TEMPLATE-V1` (blocker)
- 대상: B8 글쓰기/수정 화면 셸(KCos 329L ↔ GP 322L, 유사도 0.84)
- 방식: 기존 공통 `ForumWriteForm` 위에 route·라벨·리다이렉트 경로만 config 로 받는 `ForumWritePageTemplate` 추가. KPA·Neture 는 이번 범위 밖(업무 차이 존재)
- 종료 조건: VIEW_DUPLICATED 2 cell 해소

### 후속 3. `WO-O4O-COMMUNITY-DEAD-CONTRACT-CLEANUP-V1` (blocker 아님)
- 대상: D-4 의 DEAD_FRONTEND · DEAD_BACKEND · STALE_CONTRACT 전체
- 판단 필요: 포럼 알림 / 추천 / AI backend 3 라우터는 **제거할지 프런트를 붙일지** 결정(D-3 의 C 유형 15 cell 과 동일 대상)
- 종료 조건: 제거 또는 채택 중 하나로 확정. 이번 census 에서는 상태만 기록했다
