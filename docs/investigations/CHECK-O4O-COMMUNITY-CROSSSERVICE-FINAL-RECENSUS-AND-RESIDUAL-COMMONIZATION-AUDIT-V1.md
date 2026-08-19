# CHECK-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1

> **WO**: `WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1`  
> **작성일**: 2026-08-19 · **기준 브랜치**: `main` · **시작 commit**: `df128fc51`  
> **성격**: 커뮤니티 cross-service 공통화 **최종 전수 재감사** — 과거 census 재사용 금지, 현재 코드에서 모집단 재산출

---

## 1. 모집단 산출 방식 (§4)

문서 목록을 기준으로 삼지 않고, 현재 `main` 코드에서 다음 6개 소스를 역산해 feature unit 을 구성했다.

| 소스 | 산출 방식 | 용도 |
|---|---|---|
| Frontend route | `services/web-*/src/App.tsx` 의 `path="..."` 전수 추출 후 커뮤니티 축 필터 | 화면 존재 판정 |
| Frontend page/component | `pages/{forum,lms,education,contents,content,resources,library,mypage,account,community}` 디렉터리 전수 + LOC | 구현체 위치·크기 |
| API client·hook | `src/services/forumApi.ts`, `src/api/*.ts` export 전수 | 소비 endpoint 판정 |
| Backend route·controller | `apps/api-server/src/routes/forum/service-forum.routes.ts`(공통 factory) + `kpa/`·`glycopharm/` 자체 라우터 | Core 공통 여부 |
| Shared package export | `packages/{shared-space-ui,account-ui,lms-ui,forum-core}/src/index.ts` | 공통 부품 목록 |
| Shared View consumer | 부품명 × 서비스 교차 grep(소비 파일 수) | View 공통 vs 복제 판정 |

이렇게 만든 **기능 단위 59개 × 서비스 5개 = 295 cell** 을 전수 판정했다. **미조사: 0**

### 1-1. 공통 부품 소비 매트릭스 (View 판정 근거)

| 공통 부품 | KPA | KCos | GP | PH | NET |
|---|:--:|:--:|:--:|:--:|:--:|
| `ForumHubTemplate` | 1 | 1 | 1 | 2 | 1 |
| `ForumListTemplate` | 0 | 1 | 1 | 1 | 1 |
| `ForumPostHeader / ForumPostContent` | 1 | 1 | 1 | 1 | 1 |
| `ForumCommentList / ForumCommentForm` | 1 | 1 | 1 | 1 | 1 |
| `ForumLikeButton` | 1 | 1 | 1 | 1 | 1 |
| `ForumWriteForm` | 1 | 1 | 1 | 1 | 1 |
| `ForumOwnerDashboard` | 1 | 1 | 1 | 0 | 1 |
| `ForumOwnerMemberManagement` | 1 | 1 | 1 | 0 | 0 |
| `ForumRequestForm` | 1 | 1 | 1 | 0 | 1 |
| `MembershipGate` | 6 | 2 | 4 | 8 | 2 |
| `LatestActivitySection` | 1 | 1 | 1 | 0 | 0 |
| `StandardHomeTemplate` | 1 | 1 | 1 | 0 | 1 |
| `ContentHubTemplate` | 1 | 1 | 1 | 0 | 1 |
| `CommunityContentListTemplate` | 0 | 1 | 1 | 0 | 0 |
| `CommunityContentDetailView` | 1 | 1 | 1 | 0 | 0 |
| `CommunityContentSearchBar` | 2 | 0 | 0 | 0 | 0 |
| `ResourcesHubTemplate` | 1 | 1 | 1 | 0 | 1 |
| `LmsHubTemplate` | 1 | 1 | 1 | 0 | 0 |
| `AppreciationPanel` | 3 | 4 | 4 | 0 | 0 |
| `MyPageLayout (account-ui)` | 10 | 7 | 7 | 0 | 4 |
| `MyEnrollments/Credits/CertificatesView` | 0 | 1 | 1 | 0 | 0 |

### 1-2. Backend Core 현황

| 서비스 | forum 라우터 | 근거 |
|---|---|---|
| KCos | 공통 factory | `createServiceForumRouter` — `cosmetics/cosmetics.routes.ts:452` |
| NET | 공통 factory | `neture/neture.routes.ts:93` |
| PH | 공통 factory | `pharmacy-hub/pharmacy-hub.routes.ts:579` |
| KPA | 자체 라우터 + 공통 `ForumController` facade | `kpa/kpa.routes.ts:645` — controller·context 미들웨어는 공통 |
| GP | 자체 라우터 + 공통 `ForumController` facade | `glycopharm/glycopharm.routes.ts:186` |

공통 factory 라우트 표(`service-forum.routes.ts:103-142`): `GET/POST/PUT/DELETE /posts`, `/posts/:id`, `POST /posts/:id/like`, `PATCH /posts/:id/pin`, 댓글 CRUD, `/categories/*`, `/categories/:id/join-requests`, `/members`, `/membership-status`. KPA·GP 자체 라우터도 동일 표를 노출한다(본 WO 에서 KPA `PUT /comments/:id`, GP 댓글 라우트 remount 로 정렬 완료).

---

## 2. 전체 census (59 feature × 5 service = 295 cell)

판정 약어: `FC`=FULLY_COMMON · `CO`=CORE_ONLY · `VD`=VIEW_DUPLICATED · `SS`=SERVICE_SPECIFIC · `NI`=NOT_IMPLEMENTED · `OS`=OUT_OF_SCOPE

### A. Forum (18)

| # | 기능 | 라우트·구현 근거 | KPA | KCos | GP | PH | NET | 판정 근거 |
|---|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F01 | 포럼 허브 | KPA /forum · KCos /forum · GP /forum · PH /forum · NET /forum·/partner·/supplier·/workspace | FC | FC | FC | FC | FC | 5서비스 전부 ForumHubTemplate(shared-space-ui) 소비. PH 는 허브·목록 진입 2곳 모두 템플릿. |
| F02 | 전체 게시글 목록 | KPA /forum/all(ForumFeedPage) · KCos·GP·PH·NET /forum/posts | CO | FC | FC | FC | FC | KCos·GP·PH·NET = ForumListTemplate. KPA 만 회원 피드(ForumFeedPage) UX 별도 유지 — backend·API 계약은 공통 Core. |
| F03 | 카테고리/포럼별 목록 | KPA /forum/:slug · 그 외 ?category= / ?forum= 쿼리 | CO | FC | FC | FC | FC | 허브의 categoryPath 는 5서비스 공통. KPA 만 slug 라우트 + 자체 ForumListPage. |
| F04 | 게시글 상세 | 각 서비스 forum 상세 페이지 | FC | FC | FC | FC | FC | ForumPostHeader·ForumPostContent·Loading/Error/NotFound 상태 컴포넌트 5/5 소비. |
| F05 | 게시글 작성 | /forum/write (5서비스) | FC | FC | FC | FC | FC | ForumWriteForm 5/5. 쓰기 권한 판정은 backend. |
| F06 | 게시글 수정 | /forum/edit/:id (5서비스) | FC | FC | FC | FC | FC | 본 WO 에서 KCos·GP·PH 에 edit 라우트 + ForumWriteForm 편집 모드 추가 → 5/5 정렬. |
| F07 | 게시글 삭제 | 상세 화면 작성자 액션 | FC | FC | FC | FC | FC | 본 WO 에서 KCos·GP·PH 에 작성자 전용 삭제 추가. 최종 권한은 DELETE /posts/:id backend. |
| F08 | 댓글 목록 | 상세 화면 | FC | FC | FC | FC | FC | ForumCommentList 5/5. |
| F09 | 댓글 작성 | 상세 화면 | FC | FC | FC | FC | FC | ForumCommentForm 5/5. |
| F10 | 댓글 수정 | 상세 화면 인라인 | FC | FC | FC | FC | FC | 5서비스 모두 onEditComment 배선 + PUT /comments/:id 소비. |
| F11 | 댓글 삭제 | 상세 화면 | FC | FC | FC | FC | FC | 5서비스 모두 onDeleteComment 배선. |
| F12 | 좋아요 | 상세 화면 | FC | FC | FC | FC | FC | 본 WO 에서 KCos·GP 에 ForumLikeButton + POST /posts/:id/like 배선 → 5/5. |
| F13 | 게시글 고정(pin) | KPA 상세 · NET 상세 | CO | NI | NI | NI | CO | PATCH /posts/:id/pin 은 공통 Core. UI 노출은 운영 정책상 KPA·NET 만. |
| F14 | 비공개 포럼 접근 제어 | KPA ClosedForumAccessBlocker · 그 외 MembershipGate | CO | FC | FC | FC | FC | 공통 MembershipGate 5/5 소비. KPA 만 폐쇄형 전용 안내 컴포넌트를 추가 보유. |
| F15 | 포럼 소유자 대시보드 | KPA /mypage/my-forums · KCos·GP /forum/my-dashboard · NET /supplier/my-forum | FC | FC | FC | NI | FC | ForumOwnerDashboard + 서비스 adapter(29~52L wrapper). PH 는 소유자 개설 동선 자체가 없다. |
| F16 | 포럼 회원관리 | KPA·KCos·GP 소유자 회원관리 | FC | FC | FC | NI | NI | ForumOwnerMemberManagement 소비. NET 은 폐쇄형 회원관리 동선 없음(코드 주석 명시), PH 는 소유자 동선 없음. |
| F17 | 포럼 개설·카테고리 요청 | KPA /forum/request · KCos·GP /forum/request-category · NET /forum/request | FC | FC | FC | NI | FC | ForumRequestForm 소비. |
| F18 | 가입요청·멤버십 상태 | /categories/:id/join-requests · /membership-status | FC | FC | FC | FC | FC | 공통 factory 라우트 + MembershipGate. |

### B. LMS·교육 (10)

| # | 기능 | 라우트·구현 근거 | KPA | KCos | GP | PH | NET | 판정 근거 |
|---|---|---|:--:|:--:|:--:|:--:|:--:|---|
| L01 | LMS 허브/목록 | KPA /lms · KCos /lms · GP /lms | FC | FC | FC | NI | NI | LmsHubTemplate 3/3. PH·NET 은 교육 제품축 자체가 없음. |
| L02 | 공개 강의 목록 scope | 동일 | FC | FC | FC | NI | NI | 공통 scope 계약(선행 WO) 반영. |
| L03 | 강의 상세 | /lms/course/:id | FC | FC | FC | NI | NI | lmsViewAdapter + 공통 상세 View. |
| L04 | 레슨 플레이어 | /lms/course/:courseId/lesson/:lessonId | FC | FC | FC | NI | NI | 공통 player View. |
| L05 | 수강신청 | 강의 상세 CTA | FC | FC | FC | NI | NI | enrollment ownership 공통 계약. |
| L06 | 진도 저장 | 레슨 플레이어 | FC | FC | FC | NI | NI | 공통 progress API. |
| L07 | 수료증 발급·보관 | /mypage/certificates | FC | FC | FC | NI | NI | certificate ownership 공통 계약. |
| L08 | 수료증 공개 검증 | KPA /lms/certificate | CO | NI | NI | NI | NI | 검증 endpoint 는 공통. 공개 검증 화면은 KPA 만 운영. |
| L09 | 강사 인접 사용자 기능 | KPA /instructor/contents/:courseId/participants 등 | SS | SS | SS | NI | NI | 강사 운영 화면은 서비스별 교육 운영 정책에 종속. |
| L10 | 퀴즈·과제 | - | NI | NI | NI | NI | NI | lmsViewAdapter 에 타입만 존재. 사용자 화면 0. |

### C. 콘텐츠·자료실 (11)

| # | 기능 | 라우트·구현 근거 | KPA | KCos | GP | PH | NET | 판정 근거 |
|---|---|---|:--:|:--:|:--:|:--:|:--:|---|
| C01 | 커뮤니티 콘텐츠 목록 | KPA /content · KCos·GP /content · NET /content | CO | FC | FC | NI | FC | KCos·GP=63L CommunityContentListTemplate wrapper, NET=ContentHubTemplate. KPA 는 문서형+설문 2섹션 + 자료함 가져가기로 정보구조가 다름 → CORE_ONLY(§7-A). |
| C02 | 콘텐츠 상세 | /content/:id | FC | FC | FC | NI | NI | CommunityContentDetailView 3/3. NET 은 공개 콘텐츠 상세 라우트 없음. |
| C03 | 콘텐츠 검색·필터 | 목록 화면 내 | FC | FC | FC | NI | CO | KPA CommunityContentSearchBar(2곳), KCos·GP 템플릿 내장. NET 은 자체 정렬/출처 필터. |
| C04 | 콘텐츠 사용자 작성 | /content/new · /content/write | CO | FC | FC | NI | NI | KCos·GP 122L wrapper(공통 write 템플릿). KPA 는 설문/강의 타입 분기 포함 178L → CORE_ONLY. |
| C05 | 콘텐츠 수정·삭제(작성자) | /content/:id/edit | CO | FC | FC | NI | NI | C04 와 동일 근거. |
| C06 | 자료실 허브 | /resources | FC | FC | FC | NI | FC | ResourcesHubTemplate 4/4(KPA·KCos·GP·NET). PH 자료실은 /store-owner 매장 실행자산 축. |
| C07 | 자료 상세·다운로드 | 자료실 내 | FC | FC | FC | NI | FC | 템플릿 내장 다운로드 동선. |
| C08 | 사용자 자료 등록 | KPA /resources/new | CO | NI | NI | NI | NI | 자료 등록 write 는 KPA 운영 정책. backend 는 공통 content Core. |
| C09 | 콘텐츠 추천·정렬 | 목록 화면 내 | FC | FC | FC | NI | CO | 공통 ContentSortButtons/템플릿. NET 은 자체 정렬 UI. |
| C10 | 감사(Appreciation) 연결 | AppreciationPanel | FC | FC | FC | NI | NI | KPA 3 · KCos 4 · GP 4 소비. PH·NET 은 감사 축 미도입. |
| C11 | 커뮤니티 공지 | KPA /content/notice(redirect) · NET /notices | NI | NI | NI | NI | CO | KPA 는 공지 전용 화면을 /content 로 통합(라우트는 redirect alias 유지). NET 만 별도 공지 View. |

### D. 커뮤니티 홈·활동 (5)

| # | 기능 | 라우트·구현 근거 | KPA | KCos | GP | PH | NET | 판정 근거 |
|---|---|---|:--:|:--:|:--:|:--:|:--:|---|
| D01 | 커뮤니티 홈 | KPA /community · KCos / · GP /community · NET /community | FC | FC | FC | NI | FC | KPA·KCos·GP=LatestActivitySection 기반, NET=StandardHomeTemplate. PH 홈은 역할 진입 랜딩(103L)으로 커뮤니티 홈이 아니다. |
| D02 | 최근 활동 섹션 | 커뮤니티 홈 내 | FC | FC | FC | NI | NI | LatestActivitySection 3/3. |
| D03 | 하이라이트·요약 | 커뮤니티 홈 내 | FC | FC | FC | NI | FC | 공통 홈 템플릿 섹션. |
| D04 | 바로가기(shortcut) | 커뮤니티 홈 내 | FC | FC | FC | NI | FC | 공통 템플릿 config. |
| D05 | 최신글 전용 화면 | KPA /home/latest | CO | NI | NI | NI | NI | KPA 전용 진입점. 데이터는 공통 activity API. |

### E. My·멤버십·접근 (10)

| # | 기능 | 라우트·구현 근거 | KPA | KCos | GP | PH | NET | 판정 근거 |
|---|---|---|:--:|:--:|:--:|:--:|:--:|---|
| E01 | 마이페이지 허브 | /mypage | FC | FC | FC | NI | FC | MyPageLayout+MyPageHubCard+QuickActionsSection(account-ui). PH 는 허브 없이 /account 단일 화면. |
| E02 | 내 프로필 | /mypage/profile · PH /account | FC | FC | FC | FC | FC | 공통 GET/PATCH /users/me/profile 계약 + account-ui. |
| E03 | 설정 | /mypage/settings | FC | FC | FC | NI | FC | account-ui 공통 설정 View. |
| E04 | 내 수강 | /mypage/enrollments | CO | FC | FC | NI | NI | 본 WO 에서 MyEnrollmentsView(account-ui) 추출 → KCos·GP wrapper. KPA 는 문서화된 hybrid list UX 유지(WO-O4O-KPA-MY-ENROLLMENTS-HYBRID-LIST-ALIGN-V1). |
| E05 | 내 이수학점 | /mypage/credits | CO | FC | FC | NI | NI | MyCreditsView 동일 근거. |
| E06 | 내 수료증 | /mypage/certificates | CO | FC | FC | NI | NI | MyCertificatesView 동일 근거. |
| E07 | 내 신청·요청 | /mypage/my-requests | FC | FC | FC | NI | NI | 공통 요청 목록 View. |
| E08 | 내 포럼 | F15 참조 | FC | FC | FC | NI | FC | ForumOwnerDashboard 진입점. |
| E09 | 내 콘텐츠 | KPA /my-content · NET /workspace/my-content | CO | NI | NI | NI | SS | KPA=커뮤니티 작성물, NET=워크스페이스 자산 관리로 업무 축이 다름. |
| E10 | 멤버십 게이트·접근 판정 | MembershipGate | FC | FC | FC | FC | FC | KPA 6 · KCos 2 · GP 4 · PH 8 · NET 2 소비. |

### F. 기타 (5)

| # | 기능 | 라우트·구현 근거 | KPA | KCos | GP | PH | NET | 판정 근거 |
|---|---|---|:--:|:--:|:--:|:--:|:--:|---|
| G01 | 커뮤니티 통합 검색 | KPA | CO | NI | NI | NI | NI | 검색 API 는 공통. 통합 검색 진입점은 KPA 만. |
| G02 | 기능 가이드 | /guide/features/* | SS | SS | SS | NI | SS | 서비스별 안내 문구·화면 — 공통화 대상 아님. |
| G03 | 교육·제작 자료(Production Material) | library/production-materials 등 | OS | OS | OS | OS | OS | Store Production Material 축(F12 baseline) — 커뮤니티 모집단 밖. |
| G04 | 서비스 고유 커뮤니티 확장 | KPA 연차보고·자격 · GP forum/feedback · KCos partners · NET service-update forum | SS | SS | SS | NI | SS | 각 서비스 사업 고유 기능. |
| G05 | shared package export 실소비 | - | FC | FC | FC | FC | FC | 5서비스 모두 shared-space-ui / account-ui 실소비. 0-consumer export 없음. |

---

## 3. 정량 결과 (§14 · §22)

```
전체 모집단: 295
FULLY_COMMON: 177
CORE_ONLY: 19
VIEW_DUPLICATED: 0
SERVICE_SPECIFIC: 12
NOT_IMPLEMENTED: 82
OUT_OF_SCOPE: 5
미조사: 0
```

### 3-1. 서비스별 분포

| 서비스 | FC | CO | VD | SS | NI | OS | 합 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| KPA | 38 | 15 | 0 | 3 | 2 | 1 | 59 |
| KCos | 47 | 0 | 0 | 3 | 8 | 1 | 59 |
| GP | 47 | 0 | 0 | 3 | 8 | 1 | 59 |
| PH | 17 | 0 | 0 | 0 | 41 | 1 | 59 |
| NET | 28 | 4 | 0 | 3 | 23 | 1 | 59 |

### 3-2. 기능축별 분포

| 축 | cell | FC | CO | VD | SS | NI | OS |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| A. Forum (18) | 90 | 78 | 5 | 0 | 0 | 7 | 0 |
| B. LMS·교육 (10) | 50 | 21 | 1 | 0 | 3 | 25 | 0 |
| C. 콘텐츠·자료실 (11) | 55 | 27 | 7 | 0 | 0 | 21 | 0 |
| D. 커뮤니티 홈·활동 (5) | 25 | 15 | 1 | 0 | 0 | 9 | 0 |
| E. My·멤버십·접근 (10) | 50 | 31 | 4 | 0 | 1 | 14 | 0 |
| F. 기타 (5) | 25 | 5 | 1 | 0 | 8 | 6 | 5 |

---

## 4. 선행 축 재확인 (§6) — 현재 코드 기준 재판정

과거 CHECK 의 숫자를 가져오지 않고, 각 축을 현재 `main` 코드에서 다시 확인했다.

| 선행 축 | 재확인 결과 | 근거 |
|---|---|---|
| Forum service boundary | 유지 | 3서비스 공통 factory + KPA·GP facade. `forumContextMiddleware` 로 serviceCode·organizationId 강제 |
| Forum 상세·작성 boundary | 유지 | `ForumPostHeader/Content`·`ForumWriteForm` 5/5 |
| Forum 소유자 영역 | 유지 | `ForumOwnerDashboard` 4/5(PH 제외), `ForumOwnerMemberManagement` 3/5 |
| KPA·NET View 수렴 | 유지 | 두 서비스 모두 공통 상세·작성 부품 소비 |
| Forum interaction·write boundary | **본 WO 에서 완결** | 좋아요·수정·삭제 5/5 정렬 |
| LMS 상세·player | 유지 | 3서비스 `lmsViewAdapter` 동형 |
| LMS 공개 강의 목록 scope | 유지 | scope 계약 회귀 spec PASS |
| LMS cross-service read/write boundary | 유지 | `lms-course-list-hub-view-commonization.spec.ts` PASS |
| enrollment·certificate ownership | 유지 | 백엔드 spec PASS |
| LMS frontend API 계약 정리 | 유지 | 3서비스 동일 client |
| Content/Resource backend Core | 유지 | `community-content-resource-frontend-view-commonization.spec.ts` PASS |
| KPA Content Core adoption | 유지 | `contentApi` 공통 |
| Content/Resource frontend View | 유지 | KCos·GP 63L/89L/122L wrapper |
| Community Home 최근활동 공통 View | 유지 | `LatestActivitySection` 3/3 |

---

## 5. CORE_ONLY 전건 근거 (§7) — 19건

분류: **A**=적정 CORE_ONLY · **B**=잔존 duplication · **C**=adoption gap

| # | cell | 분류 | 근거 |
|---|---|:--:|---|
| 1 | KPA F02 전체 목록 | A | KPA 는 카테고리 나열이 아니라 회원 활동 피드(ForumFeedPage)다. 정보구조가 달라 `ForumListTemplate` 로 대체하면 UX 가 퇴행한다. API·Core 는 공통. |
| 2 | KPA F03 카테고리 목록 | A | KPA 만 `/forum/:slug` 라우트 체계(분회·주제 slug). 나머지는 쿼리 파라미터. 허브의 `categoryPath` config 는 공통. |
| 3 | KPA F13 고정(pin) | A | pin endpoint 는 공통. 노출은 KPA 운영 정책(공지 상단 고정). |
| 4 | NET F13 고정(pin) | A | 동일. NET 은 서비스 업데이트 포럼에서 사용. |
| 5 | KPA F14 비공개 접근 | A | 공통 `MembershipGate` 를 그대로 쓰되, 폐쇄형 분회 전용 안내(`ClosedForumAccessBlocker`)를 추가로 둔다. 공통 부품 대체가 아니라 보강. |
| 6 | KPA L08 수료증 공개 검증 | A | 약사회 연수교육 검증이라는 KPA 고유 업무. 검증 API 는 공통. |
| 7 | KPA C01 콘텐츠 목록 | A | 문서형 + 설문 2섹션 + 자료함 가져가기(BaseTable/Drawer). KCos·GP 의 단일 리스트와 정보구조가 다르다. |
| 8 | NET C03 검색·필터 | A | NET 은 출처(sourceType) 배지·정렬 토글 축이 따로 있다(APP-CONTENT Phase 2). |
| 9 | KPA C04 콘텐츠 작성 | A | 설문/강의 타입 분기 포함. KCos·GP 는 문서형 단일. |
| 10 | KPA C05 콘텐츠 수정·삭제 | A | C04 와 동일 화면 축. |
| 11 | KPA C08 사용자 자료 등록 | A | 자료 등록 write 권한을 여는 것은 KPA 운영 정책. backend 는 공통. |
| 12 | NET C09 정렬 | A | C03 과 동일 근거. |
| 13 | NET C11 공지 | A | NET 만 플랫폼 공지 축을 별도 운영. 커뮤니티 콘텐츠와 정보구조가 다르다. |
| 14 | KPA D05 최신글 전용 화면 | A | KPA 전용 진입점. 데이터는 공통 activity API. |
| 15 | KPA E04 내 수강 | A | `WO-O4O-KPA-MY-ENROLLMENTS-HYBRID-LIST-ALIGN-V1` 로 확정된 hybrid list UX. 공통 `MyEnrollmentsView` 헤더 주석에 "KPA 는 hybrid list UX 로 별도 유지" 가 이미 기록돼 있다. |
| 16 | KPA E05 내 이수학점 | A | 연수교육 학점 축(KPA 고유 규제 요건). |
| 17 | KPA E06 내 수료증 | A | E04 와 동일 hybrid UX 축. |
| 18 | KPA E09 내 콘텐츠 | A | KPA 만 커뮤니티 작성물 관리 진입점을 별도 보유. |
| 19 | KPA G01 통합 검색 | A | 검색 API 공통. 진입점은 KPA 정보구조. |

**분류 B(잔존 duplication) = 0건**, **분류 C(adoption gap) = 0건**. 본 감사 시작 시점의 C 유형 6건(KCos·GP 좋아요, KCos·GP·PH 수정/삭제)은 §7 방침대로 후속 WO 로 미루지 않고 이번에 직접 해소했다(아래 §7).

---

## 6. VIEW_DUPLICATED (§8)

**0건.** 판정 과정에서 duplication 위험으로 검토한 2건은 모두 근거를 확인해 CORE_ONLY 로 확정했다.

| 후보 | 판정 | 근거 |
|---|---|---|
| KPA `layouts/MyPageLayout.tsx` (51L) | CORE_ONLY | 공통 `MyPageNavigation`(account-ui) + KPA `PageHeader`/breadcrumb 을 조립하는 wrapper. View 복제가 아니라 서비스 셸 결합 |
| KPA mypage LMS 3화면 (355/256/258L) | CORE_ONLY | 문서화된 hybrid list UX. 같은 업무·같은 정보구조가 아니다 |

KCos ↔ GP 콘텐츠 3화면은 diff 8줄(서비스명 주석뿐)까지 축소된 **공통 템플릿 wrapper** 이므로 duplication 이 아니다.

---

## 7. 본 WO 에서 수정한 residual (§13)

| # | 대상 | 유형 | 내용 |
|---|---|---|---|
| R1 | KPA `pages/forum/ForumDetailPage.tsx` | 결함 | `handleUpdateComment` 의 재조회 응답 형태가 페이지 로더(`res.data`)와 달라(`res.data.data`) 댓글 수정 후 목록이 비는 문제 교정 |
| R2 | KPA `api/forum.ts` · `routes/kpa/kpa.routes.ts` | adoption gap | `updateComment` client + `PUT /comments/:id` 라우트 정렬 |
| R3 | GP `routes/glycopharm/glycopharm.routes.ts` | adoption gap | 댓글 라우트 remount 로 공통 factory 라우트 표와 정렬 |
| R4 | KCos·GP `services/forumApi.ts` | adoption gap | `toggleForumPostLike` / `updateForumPost` / `deleteForumPost` 추가 |
| R5 | PH `services/forumApi.ts` | adoption gap | `updatePharmacyHubForumPost` / `deletePharmacyHubForumPost` 추가 |
| R6 | KCos `pages/forum/PostDetailPage.tsx` | adoption gap | 공통 `ForumLikeButton` 배선 + 작성자 전용 수정/삭제 |
| R7 | GP `pages/forum/ForumPostDetailPage.tsx` | adoption gap | 동일(좋아요 카운트를 서버 응답 state 로 전환) |
| R8 | PH `pages/forum/ForumDetailPage.tsx` | adoption gap | 작성자 전용 수정/삭제 액션 추가 |
| R9 | KCos·GP·PH `App.tsx` | 라우트 누락 | `forum/edit/:postId` 추가(KCos=ProtectedRoute, PH=MembershipGate) |
| R10 | KCos·GP·PH `pages/forum/ForumWritePage.tsx` | adoption gap | 공통 `ForumWriteForm` 편집 모드(prefill + `handleUpdate`) — 패키지 변경 없이 기존 props(`initialTitle`/`initialContentHtml`) 사용 |
| R11 | `packages/account-ui` | 잔존 duplication | `MyEnrollmentsView` / `MyCreditsView` / `MyCertificatesView` 추출 → KCos·GP mypage 를 thin wrapper 로 전환 |
| R12 | `packages/shared-space-ui` | dead code(§12) | 0-consumer 컴포넌트 3개 제거: `ActivitySection` · `HeroSummarySection` · `LessonCardPreview` (index/type export 동시 정리) |

PH 는 `@o4o/forum-core` 의존이 없어 `forumContentToHtml` 을 `@o4o/shared-space-ui`(5서비스 공통 의존)에서 가져왔다. **dependency 변경 없음**(CLAUDE.md 중지 조건 회피).

---

## 8. dead / legacy / dormant residue (§12)

| 유형 | 발견 | 처리 |
|---|---|---|
| zero-consumer shared component | 3건 (`ActivitySection`·`HeroSummarySection`·`LessonCardPreview`) | **삭제 완료** |
| dead local component | 0건 | — |
| generic API dead path | 0건 | — |
| obsolete service wrapper | 0건 (KCos·GP mypage 3화면은 wrapper 로 전환) | — |
| dormant duplicate View | 0건 | — |
| obsolete route alias | 1건 (`KPA /content/notice` → `/content` redirect) | **유지** — 외부 링크 호환용 redirect 이며 dead 가 아님 |

대규모 cleanup 으로 확장하지 않았다(§12 단서).

---

## 9. NOT_IMPLEMENTED 전건 근거 유형 (§9)

공식 census 판정은 `NOT_IMPLEMENTED` 하나만 쓰고, 내부 분석용 유형을 아래에 기록한다. 총 **82건**.

| 서비스 | 건수 | INTENDED_ABSENCE | ADOPTION_GAP | PRODUCT_DECISION_REQUIRED |
|---|:--:|:--:|:--:|:--:|
| KPA | 2 | 2 | 0 | 0 |
| KCos | 8 | 8 | 0 | 0 |
| GP | 8 | 8 | 0 | 0 |
| PH | 41 | 35 | 0 | 6 |
| NET | 23 | 23 | 0 | 0 |
| **합** | **82** | **76** | **0** | **6** |

**ADOPTION_GAP = 0** — 즉시 수정 가능한 gap 은 §7 에서 전부 해소했다.

주요 근거:

- **INTENDED_ABSENCE** — 제품축 자체가 없는 경우. PH·NET 의 LMS 10 cell(교육 제품 미보유), PH 의 콘텐츠·자료실 11 cell(PH 콘텐츠는 `/store-owner` 매장 실행자산 축이며 커뮤니티 콘텐츠가 아니다), NET F16(코드 주석에 "폐쇄형 회원 관리 동선이 없다" 명시), PH F15~F17(포럼 개설·소유 동선 자체가 없음), KPA·전서비스 L10(퀴즈·과제 화면 미구현), KCos·GP 의 KPA 고유 진입점 대응(L08·C08·D05·E09·G01).
- **PRODUCT_DECISION_REQUIRED** — 공통 부품이 이미 있고 배선만 하면 되지만 **제품 판단이 필요한** 경우. PH 의 커뮤니티 홈 5 cell(D01~D05)과 F13(pin). PH 홈은 현재 역할 진입 랜딩(103L)이며, 커뮤니티 홈을 둘지는 PH 제품 정의 문제라 기술적 adoption gap 으로 처리하지 않았다.

---

## 10. PharmacyHub 최종 판정 (§10)

| 항목 | 판정 | 근거 |
|---|---|---|
| forum hub / list / detail | FULLY_COMMON | `ForumHubTemplate`·`ForumListTemplate`·`ForumPostHeader/Content` 전부 공통 소비 |
| interaction backend | FULLY_COMMON | `createServiceForumRouter` (`pharmacy-hub.routes.ts:579`) — 좋아요·댓글·수정·삭제 전부 공통 factory |
| interaction UI | FULLY_COMMON (본 WO 에서 완결) | 댓글 CRUD·좋아요는 선행 WO, **게시글 수정·삭제는 본 WO** 에서 배선 |
| community content / resources | NOT_IMPLEMENTED (INTENDED_ABSENCE) | `/content`·`/library`·`/library/resources` 는 `/store-owner` 셸 하위 **매장 실행자산**(Store Production Material) — 커뮤니티 축이 아니다 |
| community home / activity | NOT_IMPLEMENTED (PRODUCT_DECISION_REQUIRED) | `HomePage.tsx`(103L)는 역할 진입 랜딩 |
| membership / access | FULLY_COMMON | `MembershipGate` 8곳 — 5서비스 중 최다 |
| LMS / education | NOT_IMPLEMENTED (INTENDED_ABSENCE) | 교육 제품축 미보유 |
| My / community activity | NOT_IMPLEMENTED (INTENDED_ABSENCE) | `/account` 프로필 단일 화면(공통 profile 계약은 FULLY_COMMON) |

**결론**: PH 는 커뮤니티 공통화 모집단에 정식 포함되며, **구현된 커뮤니티 기능은 전부 공통 Core·공통 View 를 소비한다**(FC 17 / CO 0 / VD 0). 미구현 41 cell 은 adoption gap 이 아니라 제품축 부재 또는 제품 판단 대기다.

---

## 11. Neture 최종 판정 (§11)

`cms_contents` 같은 table 명이 아니라 **실제 커뮤니티 user-facing 업무** 기준으로 분리했다.

| 영역 | 라우트 | 모집단 | 판정 |
|---|---|:--:|---|
| community forum | `/forum/*` · `/partner/forum/*` · `/supplier/forum/*` · `/workspace/forum/*` | 포함 | FULLY_COMMON (공통 factory + 공통 View, 4개 basePath 는 같은 부품 remount) |
| community content · resource | `/content`(ContentHubTemplate) · `/resources`(ResourcesHubTemplate) · `/notices` | 포함 | C01·C06·C07 FC / C03·C09·C11 CO |
| operator CMS | `/operator/homepage-cms` · `/admin/homepage-cms` · `/operator/community` | 제외 | 운영자 업무 — 커뮤니티 user-facing 아님 |
| partner content | `/partner/contents`(`pages/content/*`) | 제외 | B2B 파트너 콘텐츠 축 (SERVICE_SPECIFIC) |
| supplier content | `/supplier/library/*` · `/workspace/supplier/library` | 제외 | 공급자 자산 축 (OUT_OF_SCOPE) |

**결론**: NET 커뮤니티 축은 FC 28 / CO 4 / VD 0. CO 4건은 모두 §5 분류 A(공지·출처 배지·정렬 등 NET 고유 정보구조).

---

## 12. 최초 census(295) 대비 변화 (§14)

| 지표 | 최초 census | 본 재감사 | 변화 |
|---|:--:|:--:|:--:|
| 전체 모집단 | 295 | 295 | 0 |
| FULLY_COMMON | 76 | 177 | **+101** |
| CORE_ONLY | 22 | 19 | -3 |
| VIEW_DUPLICATED | 23 | **0** | **-23** |
| SERVICE_SPECIFIC | 26 | 12 | -14 |
| NOT_IMPLEMENTED | 145 | 82 | -63 |
| OUT_OF_SCOPE | 3 | 5 | +2 |
| 미조사 | 0 | 0 | 0 |

N 이 295 로 같은 것은 우연이 아니라 **같은 6축 프레임(Forum 18 / LMS 10 / Content 11 / Home 5 / My 10 / 기타 5 = 59)** 을 현재 코드에서 다시 세웠기 때문이다. 숫자를 295 에 맞추려고 조정하지 않았고, 재산출 결과가 같은 59 feature 로 수렴했다.

**판정 단위 변경 사유**

- VIEW_DUPLICATED 23 → 0: 선행 WO 들이 Forum 상세·작성·소유자영역, LMS 상세·목록, Content/Resource View, Community Home 을 공통 부품으로 수렴시켰고, 남은 mypage LMS 3화면은 본 WO 에서 `account-ui` 로 추출했다.
- NOT_IMPLEMENTED 145 → 82: 최초 census 시점에 미구현이던 PH·NET·KCos·GP 의 forum interaction/owner/membership 축이 실제로 구현·배선됐다.
- SERVICE_SPECIFIC 26 → 12: 다수가 "서비스별 구현" 이 아니라 "공통 부품 + 서비스 config" 로 판명돼 FULLY_COMMON 으로 재분류됐다.
- OUT_OF_SCOPE 3 → 5: Store Production Material 축(G03)을 5서비스 전체에 일관 적용했다(F12 baseline 기준).

---

## 13. 전체 회귀 검증 (§16)

### 13-1. Backend

| 항목 | 결과 |
|---|:--:|
| `apps/api-server` typecheck (`tsc --noEmit`) | **PASS** (exit 0) |
| forum boundary spec (`kpa-boundary-regression.spec.ts`, `security/cross-service.spec.ts`) | **PASS** |
| forum interaction spec (`community-forum-interaction-and-write-boundary-commonization.spec.ts`) | **PASS** |
| LMS boundary spec (`lms-course-list-hub-view-commonization.spec.ts`) | **PASS** |
| content/resource spec (`community-content-resource-frontend-view-commonization.spec.ts`) | **PASS** |
| `apps/api-server` 전체 jest | **PASS — 156 suites / 2462 tests, exit 0** (rebase 후 재실행) |

### 13-2. Shared package

| 패키지 | typecheck |
|---|:--:|
| `@o4o/shared-space-ui` | PASS (0) |
| `@o4o/account-ui` | PASS (0) |
| `@o4o/lms-ui` | PASS (0) |
| `@o4o/forum-core` | PASS (0) |

### 13-3. Frontend 5서비스

| 서비스 | typecheck | production build |
|---|:--:|:--:|
| web-kpa-society | PASS (0) | PASS (0) |
| web-k-cosmetics | PASS (0) | PASS (0) |
| web-glycopharm | PASS (0) | PASS (0) |
| web-pharmacy-hub | PASS (0) | PASS (0) |
| web-neture | PASS (0) | PASS (0) |

**Migration: 없음.** DB schema·migration·seed 변경 0건.

---


## 14. Production browser smoke (§17)

배포 commit `ed7d6ed17` (Deploy Web Services / Deploy API Server 모두 success) 기준, 실제 브라우저(Chromium)로 로그인 후 순회했다.
계정은 `docs/local/TEST-ACCOUNTS.local.md` SSOT 를 런타임 env 로만 주입했고 스크립트·저장소 어디에도 기록하지 않았다.
측정 항목: 문서 status / body innerText 길이(white screen) / console error / pageerror / 4xx·5xx 응답 / 390px 폭 가로 overflow.

### 14-1. 서비스별 결과

| 서비스 | 로그인 | 순회 경로 | white screen | JS exception | 신규 404·500 | mobile overflow |
|---|:--:|---|:--:|:--:|:--:|:--:|
| KPA-Society | PASS | `/community` `/forum` `/forum/all` `/forum/post/{id}` `/content` `/content/resources` `/content/notice` `/lms` `/lms/courses` `/lms/course/{id}` `/mypage` | 0 | 0 | 0 | 0 |
| K-Cosmetics | PASS | `/forum` `/forum/posts` `/content` `/resources` `/lms` `/mypage` `/mypage/enrollments` `/mypage/credits` `/mypage/certificates` | 0 | 0 | 0 | 0 |
| GlycoPharm | PASS | `/forum` `/forum/posts` `/content` `/resources` `/lms` `/mypage` | 0 | 0 | 0 | 0 |
| PharmacyHub | PASS | `/forum` `/forum/posts` `/account` | 0 | 0 | 0 | 0 |
| Neture | PASS | `/forum` `/forum/posts` `/content` `/notices` `/mypage` | 0 | 0 | 0 | 0 |

- KCos·GP 커뮤니티 목록(포럼/콘텐츠/강의/자료실)은 **정상 empty state**(`총 0개` + 안내문)로 렌더된다. 데이터 0건은 serviceKey 격리 결과이며 오류가 아니다.
- cross-service data mixing: KPA 목록에는 KPA 데이터만, Neture `/content` 에는 Neture 콘텐츠 3건만 노출됐다. 타 서비스 데이터 유입 **0건**.
- KPA `/forum/post/{id}` 상세에서 **좋아요 / 수정 / 삭제 / 댓글 등록** 표면이 모두 렌더됐고, 댓글 **작성 → 삭제** 라운드트립을 실제로 수행해 200 응답을 확인했다(검증용 댓글은 삭제 완료).

### 14-2. smoke 로 발견해 본 WO 에서 고친 residual

| # | 서비스 | 내용 | 조치 |
|---|---|---|---|
| R13 | PharmacyHub | `/forum/posts` 하단에 "댓글·좋아요는 다음 커뮤니티 공통화 단계에서 연결됩니다" 안내문이 남아 있었다 (본 WO 에서 이미 연결됨) | 문구 제거 |
| R14 | KPA-Society | `ForumCommentList` 에 `renderCommentActions`(삭제 전용) 를 넘겨 공통 부품의 **인라인 수정 버튼이 렌더되지 않았다** — 본 WO 에서 추가한 `PUT /comments/:id` 가 UI 에서 도달 불가 | `renderCommentActions` 제거 후 `onEditComment`/`onDeleteComment` 로 공통 내장 액션 채택 (5서비스 동일 계약) |

### 14-3. 본 WO 와 무관한 선행 인프라 결함 (기록만)

| 항목 | 관측 | 판정 |
|---|---|---|
| KPA footer 약관·개인정보 문서 조회 | `GET /api/v1/public/services/kpa-society/policies/{terms,privacy}` · `GET /api/v1/kpa/legal/documents/published/{terms,privacy}` 404 | 선행 결함 — 커뮤니티 공통화 기인 아님. FOLLOW_UP_NON_BLOCKING |
| LMS 강의 상세에 비-UUID id 전달 | `GET /api/v1/lms/courses/{non-uuid}` 가 404 가 아니라 **500** | 선행 backend 견고성 결함(본 WO 미접촉). FOLLOW_UP_NON_BLOCKING |

### 14-4. smoke 2차 — 글쓰기 왕복에서 발견한 공통 write 결함 (R15)

KCos·GP·PH 는 커뮤니티 목록이 0건이라 기존 데이터로 상세 상호작용을 실행할 수 없었다.
그래서 **작성 → 좋아요 → 수정 → 삭제** 자가정리 왕복을 실제 브라우저로 시도했고, K-Cosmetics `/forum/write` 제출이
`POST /api/v1/cosmetics/forum/posts` **500** 으로 실패했다. 동일 요청을 API 로 재현해 원인 문자열을 확보했다.

```
500 {"success":false,"error":"DOMParser is not defined"}
```

| 항목 | 내용 |
|---|---|
| 원인 | `ForumPostController.createPost/updatePost` 가 `@o4o/forum-core.normalizeContent()` 호출 → `htmlToBlocks()` → **브라우저 전용 `DOMParser`**. Node 런타임에서 항상 throw |
| 영향 범위 | content 를 **HTML string 으로 보내는 서비스 전부** — KPA-Society · K-Cosmetics · GlycoPharm · PharmacyHub 의 글 작성/수정. Neture 만 클라이언트에서 `htmlToBlocks()` 로 Block[] 변환 후 전송해 영향 없음 |
| 기인 | **선행 결함**(본 WO 이전). 프론트의 "백엔드가 정규화한다" 주석과 백엔드 구현이 어긋난 상태가 유지되고 있었다 |
| 판정 | 공통 write 계약 자체가 4개 서비스에서 실패 → **MUST_FIX_BEFORE_COMMUNITY_CLOSE** |
| 조치 | `apps/api-server/src/utils/forumContentServer.ts` 신설 — 기존 의존성 `node-html-parser` 로 **forum-core 와 동일한 Block 매핑**을 서버에서 수행. `ForumPostController` 의 두 호출 지점을 교체 |
| 저장 포맷 | 변경 없음 (`Block[]`). API 계약·DB schema·migration 변경 0건 |
| 회귀 가드 | `apps/api-server/src/__tests__/community-forum-content-server-normalization.spec.ts` (4 tests) — DOMParser 부재 환경에서 paragraph/heading/list/quote/code/image/divider 매핑 + 컨트롤러가 DOMParser 의존 import 를 되살리지 못하게 고정 |
