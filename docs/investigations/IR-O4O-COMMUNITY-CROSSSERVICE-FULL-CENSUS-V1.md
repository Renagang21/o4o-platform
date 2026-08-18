# IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1

**커뮤니티 전 서비스 사용자-facing 기능 전수 census 및 공통화 상태 감사**

- 근거 WO: `WO-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-AND-COMMONIZATION-AUDIT-V1`
- 성격: 조사 전용 (구현·리팩토링·파일 이동 없음)
- 조사 기준 코드: `main @ 0a2d88100` (2026-08-13). 산출물은 `work/commonization-community` 에 기록한다
- 대상 서비스 5개: KPA-Society(KPA) · K-Cosmetics(KCos) · Neture(NET) · GlycoPharm(GP) · Pharmacy-Hub(PH)

---

## 0. 먼저 — 중지 조건 발동 (WO §5-3)

조사 중 **서비스 경계 누락 1건**을 확인했다. WO §5 는 이 경우 즉시 중지·보고를 요구한다.
**수정은 하지 않았다.** 상세는 [§8 발견 결함](#8-발견-결함-수정하지-않음) S1 을 본다.

> GlycoPharm 의 사용자-facing 포럼 4화면이 **서비스 필터가 없는 공통 route** `/api/v1/forum/*` 를 호출한다.
> `ForumControllerBase.applyContextFilter` 는 context 가 없으면 **즉시 return(무필터)** 이므로
> GP 커뮤니티 포럼 목록·인기 포럼·상세에 타 서비스 커뮤니티 글/포럼이 섞일 수 있다.
> 백엔드에는 이미 서비스 스코프 route `/api/v1/glycopharm/forum/*` 가 있고, **같은 서비스의 다른 화면은 그쪽을 쓴다.**

본 IR 은 읽기 전용 조사물이므로 **이미 확보된 census 결과를 버리지 않고 그대로 기록**한다.
포럼 축 공통화 묶음(§7 묶음 2·4)은 이 결함 정렬을 **선행 조건**으로 둔다.

---

## 1. 조사 방법 · 모집단 확정 경로

### 1-1. 모집단은 코드에서 만들었다 (문서 아님)

WO §1 요구대로 기존 WO/CHECK/IR 목록을 모집단으로 재사용하지 않았다. 다음 순서로 코드에서 직접 확정했다.

| 단계 | 대상 | 실제로 읽은 것 |
|---|---|---|
| 1 | route 트리 | `services/web-{kpa-society,k-cosmetics,neture,glycopharm,pharmacy-hub}/src/App.tsx` 5개 전량 (1,158 / 911 / 1,262 / 1,136 / 283 줄) |
| 2 | 화면 | 위 route 가 가리키는 `pages/**` 파일 — 포럼 30개 · 콘텐츠 11개 · LMS 11개 · 자료실 6개 · 홈 5개 · mypage 26개 |
| 3 | API client | `api/*.ts` · `services/*Api.ts` (forum 5 · content 3 · lms 3 · resources 3 · home 3 · cms 1) |
| 4 | 백엔드 mount | `apps/api-server/src/bootstrap/register-routes.ts` 전체 `app.use()` · `routes/{kpa,glycopharm,cosmetics,neture,pharmacy-hub}/*.routes.ts` · `routes/forum/**` · `controllers/forum/**` |
| 5 | 공통 패키지 | `packages/shared-space-ui/src/index.ts` export 전량 → 역방향 소비처 grep · `packages/{account-ui,lms-client,lms-ui,forum-core,content-core}` |

문서(WO/CHECK/IR)는 **판정 보조**로만 참조했고 모집단 산입 근거로 쓰지 않았다.

### 1-2. 기능 단위 정의 기준

- **화면 1개 = 기능 1개가 아니다.** 사용자 동선 단위로 자른다.
- 예: 포럼 `목록` / `상세` / `작성` / `수정` / `삭제` 는 별개 기능. 목록의 `정렬·페이지네이션` 옵션은 별개 기능이 아니다.
- 한 화면이 두 동선을 담으면(예: KPA `ForumWritePage` = 작성 + 수정) 기능 2개로 센다.
- 서비스마다 route 이름이 달라도 **동선이 같으면 같은 기능 단위**로 묶는다 (예: GP `/forum/my-dashboard` ≡ KPA `/mypage/my-forums`).

결과: **기능 단위 59개**. WO §5 의 중지선(200 기능 단위)에 크게 못 미친다.

### 1-3. 판정 절차 (라벨 1개를 결정론적으로 뽑는 규칙)

라벨 집합에 "화면은 공통인데 백엔드가 복제" 를 가리키는 칸이 없어, 아래 순서를 **위에서부터 최초 일치**로 적용했다.

1. 그 서비스에 해당 동선이 없다 → `NOT_IMPLEMENTED`
2. 사용자-facing 커뮤니티가 아니다(operator/admin/store 전용) → `OUT_OF_SCOPE` *(사유 필수)*
3. 그 서비스에만 있는 고유 동선이다 → `SERVICE_SPECIFIC` *(사유 필수)*
4. 서비스별로 실질 동일한 화면이 복제돼 있다 → `VIEW_DUPLICATED`
5. 화면은 서비스 자체 구현이지만 백엔드/로직은 공통이다 → `CORE_ONLY`
6. 화면이 공통 패키지 소비(설정·주입만)다 → `FULLY_COMMON`

> **6번의 예외 취급:** 화면이 공통이어도 백엔드가 서비스별 복제인 경우가 있다(콘텐츠·자료실·홈).
> 라벨은 규칙대로 `FULLY_COMMON` 을 주되, [§5 백엔드 계약 대조표](#5-백엔드-계약--격리-축-대조표)에
> `백엔드=DUP` 로 별도 표기하고 §7 작업 묶음 제안에 반영했다. 라벨만 보고 "다 됐다" 로 읽으면 안 된다.

### 1-4. 집계 단위

라벨 `NOT_IMPLEMENTED` 가 서비스별 판정이므로 **집계 단위는 (기능 단위 × 서비스) 셀**이다.
전체 모집단 N = 59 × 5 = **295**.

---

## 2. 기능 × 5서비스 판정 매트릭스 (빈칸 0)

`FC`=FULLY_COMMON · `CO`=CORE_ONLY · `VD`=VIEW_DUPLICATED · `SS`=SERVICE_SPECIFIC · `NI`=NOT_IMPLEMENTED · `OS`=OUT_OF_SCOPE

### 축 1 — 커뮤니티 홈 / 허브

| # | 기능 단위 | KPA | KCos | NET | GP | PH | 근거 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F01 | 커뮤니티 홈 (공개 랜딩) | FC | FC | FC | FC | SS | `StandardHomeTemplate` 소비 4서비스. PH `pages/HomePage.tsx`(94줄)는 브랜드 랜딩+역할 진입점만, 커뮤니티 홈 템플릿 미채택 |
| F02 | 공지 전용 목록·상세 | NI | NI | SS | NI | NI | NET `/notices`,`/notices/:id`. 나머지는 홈 공지 섹션(F01 내부)만 있고 전용 화면 없음 |

### 축 2 — 포럼

| # | 기능 단위 | KPA | KCos | NET | GP | PH | 근거 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F03 | 포럼 허브 (카테고리 탐색) | FC | FC | FC | FC | FC | `ForumHubTemplate` 5서비스 전부 소비 (104/83/151/136/33줄 어댑터) |
| F04 | 게시글 목록 | VD | FC | FC | FC | FC | `ForumListTemplate` 4서비스. KPA 만 자체 `ForumListPage` **758줄** |
| F05 | 게시글 상세 (본문 표시) | FC | FC | VD | FC | FC | `ForumPostContent`+`ForumPostHeader` 소비. NET `ForumPostPage` **1,033줄** — 공통 `forumContentToHtml` 대신 자체 `contentToHtml` 재구현 |
| F06 | 게시글 작성 | FC | FC | FC | FC | FC | `ForumWriteForm` 5서비스 전부 |
| F07 | 게시글 수정 | FC | NI | FC | NI | NI | KPA `/forum/edit/:id`, NET `ForumWritePage` edit 모드. KCos/GP/PH 는 작성만 |
| F08 | 게시글 삭제 | CO | NI | CO | NI | NI | 백엔드 `DELETE /posts/:id` 공통, 확인 UI 는 서비스 자체 |
| F09 | 포럼별 피드 (멀티 포럼 구조 `/forum/:slug`) | SS | NI | NI | NI | NI | KPA `ForumFeedPage` 528줄 — KPA 만의 멀티 포럼 구조 |

### 축 3 — 콘텐츠

| # | 기능 단위 | KPA | KCos | NET | GP | PH | 근거 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F10 | 콘텐츠 목록 | VD | VD | SS | VD | NI | GP↔KCos `ContentListPage` **diff 2줄**(146줄 중). KPA 는 별도 761줄 구현. NET `/content` 는 운영자 발행 HUB 라이브러리 — 회원 작성형과 다른 축 |
| F11 | 콘텐츠 상세 | FC | FC | SS | FC | NI | `CommunityContentDetailView` 3서비스 |
| F12 | 콘텐츠 작성·수정 | FC | FC | NI | FC | NI | `CommunityContentWriteShell` 3서비스 |
| F13 | 콘텐츠 삭제 | CO | NI | NI | NI | NI | KPA `ContentListPage`/`ContentDocumentsPage` 만 `contentApi.remove` 호출 |
| F14 | 콘텐츠 섹션 분리 (문서/설문/자료 탭) | SS | NI | NI | NI | NI | KPA `ContentDocumentsPage`·`ContentSurveysPage`·`subType='resource'` 3분할 |

### 축 4 — 강의 / LMS

| # | 기능 단위 | KPA | KCos | NET | GP | PH | 근거 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F15 | 강의 목록 (LMS 허브) | FC | FC | NI | FC | NI | `LmsHubTemplate` 3서비스 (211/76/56줄 어댑터) |
| F16 | 강의 상세 · 수강신청 | VD | VD | NI | VD | NI | 622 / 314 / 731줄 각자 구현. 공통은 `@o4o/lms-ui` `CourseProgressBar`·`LessonList` 부품뿐 |
| F17 | 레슨 학습 (플레이어) | VD | VD | NI | VD | NI | 1,219 / 841 / 761줄 각자 구현 — 커뮤니티 축 최대 복제 |
| F18 | 수료증 발급·조회 | CO | CO | NI | CO | NI | 백엔드 `/lms/certificates` 공통, 화면 서비스별 |
| F19 | 내 수강 내역 | CO | CO | NI | CO | NI | 백엔드 `/lms/enrollments` 공통, `mypage/MyEnrollmentsPage` 서비스별 |
| F20 | 강사 강의 개설·관리 | CO | CO | NI | CO | NI | 백엔드 `/lms/instructor/*` 공통 + `@o4o/lms-client` `createLmsInstructorClient`. 화면 KPA 7 route / GP 4 / KCos 2 로 범위 자체가 다름 |

### 축 5 — 자료실 / Resources

| # | 기능 단위 | KPA | KCos | NET | GP | PH | 근거 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F21 | 자료실 목록·상세 | FC | FC | FC | FC | OS | `ResourcesHubTemplate` 4서비스 (189/54/86/67줄). PH `/store-owner/library/resources` 는 매장 셸 내부 자료함 — 커뮤니티 자료실 아님 |
| F22 | 회원 자료 등록·수정 | SS | NI | NI | NI | NI | KPA `ResourceWritePage` 781줄. GP/KCos 는 운영자 등록만(`/operator/resources`) |

### 축 6 — 교육 · 제작자료 안내 (가이드)

| # | 기능 단위 | KPA | KCos | NET | GP | PH | 근거 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F23 | 서비스 소개 가이드 (`/guide/intro`,`/guide/usage`) | FC | FC | FC | FC | NI | `@o4o/shared-space-ui/guide` 공통 페이지. 서비스 파일은 props+`GuideEditableSection` 주입 wrapper(19~23줄) |
| F24 | 기능 안내 가이드 허브 (`/guide/features`) | FC | FC | FC | FC | NI | `GuideFeaturesPage` 공통. NET 은 38개 중 32개가 공통 소비 |
| F25 | 제작자료 안내 (`/guide/features/production-materials`) | FC | FC | NI | FC | NI | `GuideFeatureManualPage` 공통 (KPA 는 전용 wrapper, GP/KCos 는 props 주입) |
| F26 | 역할별 가치 가이드 (`/guide/for/*`) | SS | NI | SS | NI | NI | KPA `for/store-owner·operator·member`, NET `for-operator·for-seller` — 역할 정의가 서로 달라 공통 축 아님 |

### 축 7 — 커뮤니티 활동 / 최신글 / 피드

| # | 기능 단위 | KPA | KCos | NET | GP | PH | 근거 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F27 | 최신 활동 피드 (홈 섹션) | VD | VD | NI | VD | NI | 3서비스 홈 파일에 **인라인 복제** (`CommunityHomePage.tsx:43` / `HomePage.tsx:46` / `CommunityMainPage.tsx:73` — 주석까지 동일) |
| F28 | 최신 활동 전체 보기 | SS | NI | NI | NI | NI | KPA `/home/latest` `HomeLatestPage` 134줄 |

### 축 8 — 개설 신청 · 내 신청 · 내 활동

| # | 기능 단위 | KPA | KCos | NET | GP | PH | 근거 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F29 | 포럼 개설 신청 | FC | FC | FC | FC | NI | `ForumRequestForm` 4서비스 5개 화면 (NET 은 community+supplier 2곳) |
| F30 | 내 신청 내역 (통합 인박스) | FC | FC | NI | FC | SS | `@o4o/account-ui` `MyRequestsInbox`. PH 는 `/join/status` 로 서비스 가입 상태만 |
| F31 | 내 포럼 대시보드 | VD | VD | VD | VD | NI | 285 / 581 / 576 / 572줄. **GP↔KCos 는 accent 색(emerald↔pink)·주석 외 차이 없음** |
| F32 | 마이페이지 허브 | FC | FC | FC | FC | OS | `@o4o/account-ui` `MyPageLayout`·`MyPageHubCard` (소비 파일 19/14/12/13개). PH `/store-owner/account` 는 매장 셸 내부 |

### 축 9 — 멤버십 / 폐쇄형 커뮤니티

| # | 기능 단위 | KPA | KCos | NET | GP | PH | 근거 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F33 | 폐쇄형 포럼 가입 신청·승인 | CO | CO | NI | CO | NI | 로직 공통 `ForumMembershipService`(`routes/kpa/services/`). 컨트롤러는 KPA 전용 wrapper(159줄)와 공통 `ForumMembershipController`(91줄)로 이중 |
| F34 | 포럼 회원 관리 (소유자) | VD | VD | NI | VD | NI | 381 / 354 / 354줄. **GP↔KCos diff = 색상 5줄** |
| F35 | 서비스 멤버십 게이트 (커뮤니티 접근 제어) | NI | NI | NI | NI | CO | PH `MembershipGate` 가 `/forum/*` 전부를 감싼다. 판정 로직은 공통 `@o4o/auth-utils.getServiceMembershipStatus`, 화면은 PH 자체. **NET 에도 동일 컴포넌트가 있으나 소비처 0 (사문화)** |

### 축 10 — 검색

| # | 기능 단위 | KPA | KCos | NET | GP | PH | 근거 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F36 | 포럼 검색 | VD | FC | FC | FC | FC | `ForumListTemplate` 내장 검색 4서비스. KPA 는 자체 목록 안에 별도 구현 |
| F37 | 콘텐츠 검색 | FC | FC | NI | FC | NI | `CommunityContentSearchBar` (KPA 는 2개 화면에서 소비) |
| F38 | 자료실 검색 | FC | FC | FC | FC | NI | `ResourcesHubTemplate` 내장 |

> 전 서비스 통틀어 **전역 통합 검색 화면은 없다**(`path="/search"` 0건). 검색은 목록 화면 내부 기능으로만 존재한다.

### 축 11 — 댓글 · 좋아요 등 interaction

| # | 기능 단위 | KPA | KCos | NET | GP | PH | 근거 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| F39 | 댓글 목록 표시 | FC | FC | VD | FC | NI | `ForumCommentList` 3서비스. NET 자체 렌더. PH 상세는 댓글 수만 표시 |
| F40 | 댓글 작성 | CO | NI | CO | NI | NI | textarea 보유 = KPA·NET 뿐. 백엔드 `POST /posts/:id/comments` 는 5서비스 모두 열려 있음 |
| F41 | 댓글 수정·삭제 | CO | NI | CO | NI | NI | KPA 삭제, NET 수정+삭제 |
| F42 | 좋아요 | CO | NI | CO | NI | NI | `handleLike` = KPA `ForumDetailPage:88`, NET `ForumPostPage:309` 뿐 |
| F43 | 감사 포인트 (Appreciation) | FC | FC | NI | FC | NI | `AppreciationPanel` 11개 화면(포럼·콘텐츠·LMS·HUB) |

### 축 12 — 각 서비스에만 존재하는 추가 커뮤니티 기능

각 항목은 소유 서비스 1곳 외 전부 `NI`.

| # | 기능 단위 | 소유 | 판정 | 근거 · 사유 |
|---|---|:--:|:--:|---|
| F44 | 설문 · 참여 (`/surveys`,`/participation`,`/content/surveys`) | KPA | SS | 회원 대상 설문 응답·결과. GP/KCos 는 운영자 설문(`/operator/surveys`)만 |
| F45 | 이벤트 (`/events`) | KPA | SS | `EventsHomePage` |
| F46 | 근무약사 업무 (`/work/*` 5 route) | KPA | SS | 개인 업무 화면 — 경영 기능 배제 축 |
| F47 | 자격 · 학점 (`/mypage/qualifications`,`/mypage/credits`) | KPA | SS | 약사회 자격·연수학점 도메인 |
| F48 | 인증서 공개 검증 (`/certificate/verify/:id`) | KPA | SS | 무인증 공개 검증 |
| F49 | 서비스 소개 · 참여 신청 (`/services/*`,`/join/pharmacy`) | KPA | SS | 약국 참여 온보딩 |
| F50 | 사업 영역 허브 (`/business/*` 6 route) | GP | SS | BloodCare·사업 준비·사업 포럼 |
| F51 | 피드백 포럼 (`/forum/feedback`) | GP | SS | `/api/v1/glycopharm/forum/feedback` 전용 |
| F52 | 참여 신청 (`/apply/*` 3 route) | GP | SS | 약국·약사 참여 신청 및 내 신청 |
| F53 | 파트너 안내 · 신청 (`/partners`,`/partners/apply`) | KCos | SS | 화장품 파트너 프로그램 |
| F54 | 관광객 허브 (`/store-hub/services/tourists`) | KCos | OS | KCos 고유이지만 `/store-hub` 하위 = 매장 운영 화면. WO §4 제외 범위 |
| F55 | 마켓 트라이얼 (`/market-trial/*`) | NET | SS | 공급자 체험단 — 커뮤니티 참여 동선 |
| F56 | 역할별 포럼 (`/supplier/forum/*`,`/partner/forum/*`) | NET | SS | 공급자·파트너 전용 포럼 트랙. 공통 부품은 재사용하나 축 자체가 NET 고유 |
| F57 | 사업 가이드 (`/guide/business/*` 14 route) | NET | SS | 사업 모델별 안내 — 타 서비스에 대응 축 없음 |
| F58 | 가입 신청 · 상태 (`/join`,`/join/status`) | PH | SS | 서비스 멤버십 신청 흐름 |
| F59 | 역할 진입 안내 (`RoleEntryPage`) | PH | SS | 공급자/운영자 진입점 + 예정 기능 안내 |

---

## 3. 집계 (WO §2-4)

```text
전체 모집단: 295
FULLY_COMMON: 76
CORE_ONLY: 22
VIEW_DUPLICATED: 23
SERVICE_SPECIFIC: 26
NOT_IMPLEMENTED: 145
OUT_OF_SCOPE: 3
미조사: 0
```

검산: 76 + 22 + 23 + 26 + 145 + 3 = **295** = 59 기능 단위 × 5 서비스 ✔

### 3-1. 서비스별 분포

| 서비스 | FC | CO | VD | SS | NI | OS | 계 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| KPA-Society | 19 | 9 | 8 | 11 | 12 | 0 | 59 |
| K-Cosmetics | 20 | 4 | 6 | 1 | 27 | 1 | 59 |
| Neture | 12 | 4 | 3 | 7 | 33 | 0 | 59 |
| GlycoPharm | 20 | 4 | 6 | 3 | 26 | 0 | 59 |
| Pharmacy-Hub | 5 | 1 | 0 | 4 | 47 | 2 | 59 |
| **합계** | **76** | **22** | **23** | **26** | **145** | **3** | **295** |

읽는 법: KPA 는 기능 폭이 가장 넓고(NI 12 로 최소) 자체 구현 잔량(VD 8 + SS 11)도 가장 크다.
GP·KCos 는 채택 폭이 거의 같고 VD 6 도 동일하다 — **두 서비스가 서로의 복제본**이라는 §2 관찰과 일치한다.
PH 는 최근 신설이라 채택 기능이 좁지만(NI 47) **채택한 것은 거의 전부 공통 부품**(구현 10셀 중 FC 5 · CO 1)이라
"신규 서비스가 공통 경로로 올라타는 데 성공한" 사례다 — 공통화 목표 상태의 참조점.

### 3-2. 실질 커버리지 (NI·OS 제외)

구현된 셀 147개 기준: FC 51.7% · CO 15.0% · VD 15.6% · SS 17.7%.
**공통화 가능 잔량 = VD 23셀** (SS 26 은 정의상 대상 아님, CO 22 는 화면만 남음).

---

## 4. 공통 패키지 소비처 카운트 (역방향 대조)

`packages/shared-space-ui` 커뮤니티 관련 export 의 **실 소비 파일 수** (패키지 자기 자신 제외).

| export | 소비 | 소비 서비스 | 비고 |
|---|:--:|---|---|
| `GuideBlock` | 30 | 5 | 최다 채택 |
| `AppreciationPanel` | 14 | 3 | KPA·GP·KCos |
| `SignagePlaylistCreateShell` | 8 | 3 | community/operator/store 3 surface |
| `ForumHubTemplate` | 6 | 5 | **5서비스 전부** |
| `StoreHubTemplate` | 6 | 4 | 매장 HUB(커뮤니티 외) |
| `ForumWriteForm` | 5 | 5 | **5서비스 전부** |
| `ForumRequestForm` | 5 | 4 | NET 2곳 |
| `ForumPostContent` | 5 | 5 | **5서비스 전부** |
| `LmsHubTemplate` | 5 | 3 | + `lms-ui` 내부 2 |
| `StandardHomeTemplate` | 4 | 4 | PH 미채택 |
| `ForumListTemplate` | 4 | 4 | **KPA 미채택** |
| `ForumPostHeader` | 4 | 4 | NET 미채택 |
| `ForumDetailStates` | 4 | 4 | — |
| `ContentHubTemplate` | 4 | 4 | — |
| `ResourcesHubTemplate` | 4 | 4 | — |
| `CommunityContentSearchBar` | 4 | 3 | KPA 2곳 |
| `ForumCommentList` | 3 | 3 | NET·PH 미채택 |
| `CommunityContentWriteShell` | 3 | 3 | — |
| `CommunityContentDetailView` | 3 | 3 | — |
| `SignageManagerTemplate` | 3 | 3 | — |
| `HubPagination` | 2 | 1 | KPA 만 |
| `formatForumDate` | 2 | 2 | KPA·PH |
| `contentHubCardGrid` | 2 | 2 | GP·KCos |
| `SignageHubTemplate` | 1 | 1 | GP 만 |

### 4-1. export 는 있는데 소비 0 (사문화 부품)

| export | 상태 |
|---|---|
| `ActivitySection` | 서비스 0 · 패키지 내부 0 (`types.ts` 의 props 타입만 남음) |
| `HeroSummarySection` | 서비스 0 · 패키지 내부 0 |
| `ContentHighlightSection` | 서비스 0 · 패키지 내부 0 (`types.ts` 만) |
| `SignagePreviewSection` | 서비스 0 · 패키지 내부 0 (`types.ts` 만) |
| `LessonCardPreview` | 서비스 0 · 패키지 내부 0 — "자료함/POP/QR/블로그 공용" 목적으로 추출됐으나 소비처가 붙지 않음 |

> `forumContentToHtml` 은 서비스 소비 0 이지만 패키지 내부 `ForumPostContent` 가 쓰므로 사문화 아님.
> 다만 **NET `ForumPostPage` 가 같은 변환을 자체 재구현**하고 있어 소비 기회를 놓친 상태다.

### 4-2. 공통 부품이 있는데 복제 화면을 쓰는 서비스

| 공통 부품 | 존재하는데 안 쓰는 곳 | 복제 규모 |
|---|---|---|
| `ForumListTemplate` | KPA `ForumListPage` | 758줄 |
| `ForumPostHeader` / `ForumDetailStates` | NET `ForumPostPage` | 1,033줄 중 header·상태 자체 구현 |
| `forumContentToHtml` | NET `ForumPostPage:56` `contentToHtml` | 자체 재구현 |
| `ForumCommentList` | NET `ForumPostPage`, PH `ForumDetailPage` | NET 자체 렌더 / PH 미구현 |
| `CommunityContentSearchBar` 외 목록 템플릿 부재 | GP·KCos `ContentListPage` | 146줄 × 2 (diff 2줄) |
| `MyRequestsInbox` | GP `pages/forum/MyRequestsPage` (285줄, legacy 잔존) | `pages/mypage/MyRequestsPage`(58줄)는 공통 채택 완료 |

### 4-3. 그 밖의 공통 패키지

| 패키지 | 커뮤니티 축 소비 | 상태 |
|---|---|---|
| `@o4o/account-ui` | KPA 19 · KCos 14 · GP 13 · NET 12 · PH 4 파일 | mypage 축은 사실상 공통화 완료 |
| `@o4o/lms-ui` | `CourseProgressBar`·`LessonList` 를 3서비스 5파일 | 부품 단위만. 페이지 골격은 미공통 |
| `@o4o/lms-client` | `createLmsInstructorClient` 만 3서비스 | 패키지 주석이 학습자 메서드 비범위임을 명시 |
| `@o4o/forum-core` | `utils.htmlToBlocks` (NET) · backend entities/migrations | 프론트 소비는 유틸 수준 |
| `@o4o/content-core` | entities/types 만 | 프론트 UI 없음 |

---

## 5. 백엔드 계약 · 격리 축 대조표

| 기능 축 | KPA | KCos | NET | GP | PH | 컨트롤러 | 격리 축 |
|---|---|---|---|---|---|---|---|
| 포럼 (읽기·쓰기) | `/api/v1/kpa/forum/*` | `/api/v1/cosmetics/forum/*` | `/api/v1/neture/forum/*` | **혼재** — 화면별 `/api/v1/forum/*`(무필터) 또는 `/api/v1/glycopharm/forum/*` | `/api/v1/pharmacy-hub/forum/*` | **공통** `ForumPostController`·`ForumDirectoryController`·`ForumCommentController`·`ForumModerationController` (`ForumController` 는 delegation wrapper) | `forumContextMiddleware` → `serviceCode` → `resolveCanonicalServiceKey()` → `forum_category_requests.service_code` + `scope='community'` → `organizationId IS NULL` |
| 포럼 운영자 | `/api/v1/forum/operator/*` (`serviceCode` 쿼리) | 동일 | 동일 | 동일 | — | 공통 `operator-forum.routes.ts` | 쿼리 파라미터 `serviceCode` |
| 포럼 멤버십 | `/api/v1/kpa/forum/categories/:id/...` (KPA 전용 wrapper 159줄) | 공통 `ForumMembershipController` 91줄 | 동일 | 동일 | 동일 | 로직은 단일 `ForumMembershipService` | `forum_join_requests` |
| 콘텐츠 · 자료실 | `/api/v1/kpa/contents` (kpa.routes.ts 인라인 ~550줄) | `/api/v1/cosmetics/contents` | `/api/v1/neture/content` (cms 축) | `/api/v1/glycopharm/contents` | — | **3중 복제** — `routes/{cosmetics,glycopharm}/controllers/resources.controller.ts` 는 **557줄 동일**(서비스명·테이블명만 상이) | **물리 테이블 분리** `kpa_contents` / `cosmetics_contents` / `glycopharm_contents` / cms_contents |
| LMS | `/api/v1/kpa/lms/*` | `/api/v1/lms/*` | — | `/api/v1/lms/*` | — | **공통** `CourseController`·`LessonController`·`EnrollmentController`·`CertificateController` (KPA 는 같은 컨트롤러를 자기 prefix 로 재mount) | `kpaLmsScopeGuard` (`/api/v1/lms` 전역 선행) |
| 홈 · 최신 활동 | `/api/v1/kpa/home/*` (8 endpoint) | `/api/v1/cosmetics/home/latest` (1) | — | `/api/v1/glycopharm/home/latest` (1) | — | 각 `*.routes.ts` 인라인 핸들러 3벌 | 서비스 prefix |
| 감사 포인트 | `/api/v1/appreciation` | 동일 | — | 동일 | — | 공통 | targetType+targetId |
| 설문 | `/api/v1/surveys` | (운영자만) | — | (운영자만) | — | 공통 | — |
| 멤버십 게이트 | — | — | (사문화) | — | JWT `user.memberships` | `requireActiveServiceMembership(rolePrefix)` in `service-forum.routes.ts` | `service_memberships.serviceKey` + `status='active'` |

### 5-1. 계약 축 요약

- **포럼**: 컨트롤러는 이미 단일 세트. 남은 문제는 **mount 축이 4갈래**(공통 무필터 / KPA prefix / GP prefix / `createServiceForumRouter`)라는 점이다.
  `createServiceForumRouter` 가 사실상 canonical 이며 KCos·NET·PH 3서비스가 이미 그 위에 있다.
- **콘텐츠·자료실**: 화면은 공통화가 진행됐는데 **백엔드는 전혀 공통화되지 않았다**. 컨트롤러 557줄 완전 복제 2벌 + KPA 인라인 1벌 + 물리 테이블 3개.
- **LMS**: 백엔드는 이미 공통. 프론트만 미공통 — `CORE_ONLY` 9셀 + `VIEW_DUPLICATED` 6셀의 실체가 이것이다.
- **쓰기 인증**: 공통·서비스 route 의 모든 write 가 `authenticate` 로 보호돼 있음을 확인했다(`forum.routes.ts` 18개 write, `service-forum.routes.ts` 동일). 무인증 write 는 **없다**.
- 포럼 직접 생성/수정/삭제(`POST|PUT|DELETE /categories`)는 모든 축에서 **410 stub** 이다(`ForumDirectoryController:157,169,181`). 신청·승인 흐름만 유효.

---

## 6. 서비스 고유 기능 목록 (축 12 재정리)

| 서비스 | 고유 기능 | 개수 |
|---|---|:--:|
| KPA-Society | 설문·참여 / 이벤트 / 근무약사 업무 / 자격·학점 / 인증서 공개 검증 / 서비스 소개·참여 신청 / 포럼별 피드 / 콘텐츠 섹션 분리 / 회원 자료 등록 / 최신 활동 전체 보기 / 역할별 가치 가이드 | 11 |
| GlycoPharm | 사업 영역 허브 / 피드백 포럼 / 참여 신청 | 3 |
| K-Cosmetics | 파트너 안내·신청 / (관광객 허브 — OUT_OF_SCOPE) | 1(+1) |
| Neture | 공지 전용 화면 / 마켓 트라이얼 / 역할별 포럼 / 사업 가이드 / 콘텐츠 라이브러리 목록(HUB 축) / 콘텐츠 라이브러리 상세 / 역할별 가치 가이드 | 7 |
| Pharmacy-Hub | 브랜드 랜딩 홈 / 가입 신청·상태 / 역할 진입 안내 / 내 신청(가입 상태) | 4 |

`SERVICE_SPECIFIC` 26셀 = 11 + 3 + 1 + 7 + 4 ✔ (관광객 허브는 `OUT_OF_SCOPE` 로 별도 계상)

---

## 7. 작업 묶음 제안 (상위 5개)

중복 규모 = `VIEW_DUPLICATED` 기능 수 × 소비 서비스 수, 보조 지표로 복제 코드량.
**후속 WO 본문은 쓰지 않는다.** 범위·선행·리스크만 적는다.

### 묶음 1 — LMS 강의 상세 + 레슨 플레이어 공통화 (VD 6셀 / 3서비스 / ~4,500줄)

`F16`·`F17` 이 KPA 1,841줄 · GP 1,492줄 · KCos 1,155줄로 각자 구현돼 있다. 커뮤니티 축 최대 복제 덩어리다.
**유리한 조건**: 백엔드가 이미 완전 공통(`/api/v1/lms`, 동일 컨트롤러)이고 `@o4o/lms-ui` 에 `CourseProgressBar`·`LessonList` 진입점이 이미 있다.
**범위**: `LmsCourseDetailTemplate` · `LmsLessonPlayerTemplate` 추출 → 3서비스 어댑터화.
**선행**: `@o4o/lms-client` 학습자 메서드 정렬(패키지 주석이 명시한 미완 항목 — 서비스별 응답 unwrap 패턴 `.data.data.course` 차이).
**리스크**: 레슨 플레이어는 진도·퀴즈·과제 제출이 얽혀 서비스별 상태 머신 차이가 숨어 있을 수 있다. `APP-LMS-BASELINE.md` Phase 1 이 "frontend 공통화는 후속" 으로 명시한 영역이라 baseline 갱신 판단이 함께 필요하다.

### 묶음 2 — 포럼 소유자 영역 (내 포럼 대시보드 + 회원 관리) (VD 7셀 / 4서비스 / ~2,900줄)

`F31`·`F34`. **GP↔KCos 는 accent 색상과 주석 외 차이가 없다**(`ForumMemberManagementPage` diff 5줄 / `MyForumDashboardPage` 색상+주석). NET 은 supplier 축에 576줄 사본을 하나 더 갖고 있다.
**범위**: `MyForumDashboardTemplate` · `ForumMemberManagementTemplate` 추출 → 4서비스 어댑터화. 테마는 CSS 변수(`--color-primary`)로 흡수.
**선행**: 없음 — 백엔드 멤버십 로직은 이미 단일 `ForumMembershipService`.
**리스크**: 가장 낮다. 순수 presentational 복제이고 API 계약이 이미 같다. **투입 대비 회수가 가장 좋은 묶음**이며 착수 1순위로 권한다.

### 묶음 3 — 콘텐츠 · 자료실 백엔드 통합 (VD 3셀 + 백엔드 557줄 × 2 완전 복제 + 테이블 3개)

`F10` 화면 복제(GP↔KCos diff 2줄)보다 **백엔드 복제가 본체**다. `routes/cosmetics/controllers/resources.controller.ts` 와 `routes/glycopharm/controllers/resources.controller.ts` 는 557줄 라인 단위 동일이고, KPA 는 같은 계약을 `kpa.routes.ts` 인라인 ~550줄로 또 갖고 있다.
**범위**: 서비스 파라미터화된 공통 `contents` 라우터 팩토리 추출 + `ContentListTemplate` 추출.
**선행**: **테이블 통합 여부 결정이 먼저다.** `kpa_contents` / `cosmetics_contents` / `glycopharm_contents` 물리 분리를 유지한 채 라우터만 파라미터화할지, 단일 테이블+`service_key` 로 갈지는 §14 Frozen Baseline(F4/F5 Content Stable) 판단이 필요하다.
**리스크**: 높다. DB schema 변경은 CLAUDE.md 중지 조건이다. **라우터 파라미터화(무마이그레이션) 단계와 테이블 통합 단계를 반드시 분리**해야 한다.

### 묶음 4 — 포럼 서비스 경계 정렬 + KPA/NET 목록·상세 수렴 (보안 1건 + VD 4셀)

**S1 결함 정렬이 본체**다. GP 포럼 화면을 `/api/v1/glycopharm/forum/*` 로 수렴시키고, 공통 무필터 `/api/v1/forum/*` 의 사용자-facing 소비를 0으로 만든다. 이어서 KPA `ForumListPage`(758줄) → `ForumListTemplate`, NET `ForumPostPage`(1,033줄) → `ForumPostHeader`+`ForumDetailStates`+`forumContentToHtml` 로 수렴한다.
**선행**: S1 은 별도 보안 WO 로 먼저 처리. 목록·상세 수렴은 그 뒤.
**리스크**: S1 정렬 시 **GP 사용자에게 지금까지 보이던 타 서비스 글이 사라진다.** 이는 정상 동작이지만 운영 관점에서는 콘텐츠 급감으로 보인다 — 정렬 전 GP 서비스 스코프 포럼/글 실재 건수를 read-only SELECT 로 실측하는 절차가 필요하다.

### 묶음 5 — 홈 최신 활동 섹션 추출 (VD 3셀 / 3서비스)

`F27`. 3서비스 홈 파일에 주석까지 동일한 섹션이 인라인 복제돼 있고, 백엔드도 `/home/latest` 3벌이다.
**범위**: `LatestActivitySection` 을 `shared-space-ui` 로 추출해 `StandardHomeTemplate` 슬롯에 연결. 백엔드 `/home/latest` 3벌 파라미터화.
**선행**: 없음.
**리스크**: 낮음. 다만 이 묶음을 할 때 §4-1 **사문화 부품 5개**(`ActivitySection`·`HeroSummarySection`·`ContentHighlightSection`·`SignagePreviewSection`·`LessonCardPreview`)의 처리 판단을 함께 해야 한다 — 새 섹션을 추가하면서 기존 미소비 섹션을 남겨두면 패키지 표면이 더 나빠진다.

---

## 8. 발견 결함 (수정하지 않음)

### S1 — GlycoPharm 사용자-facing 포럼의 서비스 경계 누락 **[WO §5 중지 조건 발동]**

**증거 (정적 분석)**

| 위치 | 내용 |
|---|---|
| `services/web-glycopharm/src/services/forumApi.ts:74` | `api.get('/forum/posts?…')` → `/api/v1/forum/posts` (서비스 prefix 없음) |
| 같은 파일 `:82` | `/forum/categories/popular` |
| 같은 파일 `:90`, `:97` | `/forum/posts/:id`, `/forum/posts/:postId/comments` |
| 같은 파일 `:111` | `api.post('/forum/posts', payload)` — **쓰기도 무필터 route** |
| `apps/api-server/src/routes/forum/forum.routes.ts` | `forumContextMiddleware` **미적용** |
| `apps/api-server/src/controllers/forum/ForumControllerBase.ts:81` | `if (!ctx) return; // admin/generic route — no filter` |
| 같은 파일 `applyServiceScope` | `if (!canonical) return; // generic/admin route — 무필터 현행 유지` |

**소비 화면**: `pages/forum/ForumHubPage.tsx`(`/forum`) · `ForumPage.tsx`(`/forum/posts`) · `ForumPostDetailPage.tsx`(`/forum/posts/:id`) · `ForumWritePage.tsx`(`/forum/write`).

**영향**: GP 커뮤니티 포럼의 목록·인기 포럼·상세에 `kpa-society` / `neture` / `cosmetics` / `pharmacy-hub` 커뮤니티 글·포럼이 섞여 노출될 수 있다. 글쓰기도 서비스 경계 밖 `forumId` 로 생성될 수 있다. CLAUDE.md §7 Guard Rule 3(Domain Primary Boundary 필터 필수) 위반이다.

**같은 서비스 안의 모순**: `pages/community/CommunityMainPage.tsx:216` 와 `pages/store-management/PharmacyManagement.tsx:138` 는 **서비스 스코프 route** `/api/v1/glycopharm/forum/posts` 를 쓴다. 즉 GP 한 서비스 안에서 두 축이 혼재한다.

**미실측**: 실제로 타 서비스 글이 GP 화면에 노출되는지는 **런타임/DB 로 확인하지 않았다**(본 WO 는 조사 전용이고 read-only SELECT 로도 노출 여부는 forum_category_requests·forum_posts 조인 실측이 필요). 코드 경로상 필터가 없다는 사실만 확정했다. 후속 WO 에서 실측이 필요하다.

**수정하지 않음** — 별도 WO 필요.

### S2 — 공통 패키지 사문화 export 5개

`ActivitySection` · `HeroSummarySection` · `ContentHighlightSection` · `SignagePreviewSection` · `LessonCardPreview` 는 서비스·패키지 양쪽에서 소비 0 이다. `types.ts` 에 props 타입만 남아 있다. 제거/연결 판단 필요(묶음 5 참조).

### S3 — Neture `MembershipGate` 사문화

`services/web-neture/src/components/auth/MembershipGate.tsx` 의 소비처가 0 이다. Neture 커뮤니티 route 에는 멤버십 게이트가 걸려 있지 않다. 의도적 미적용인지 누락인지 코드만으로는 판정 불가 — §9 불확실 항목.

### S4 — GlycoPharm `MyRequestsPage` 이중 존재

`pages/mypage/MyRequestsPage.tsx`(58줄, 공통 `MyRequestsInbox` 채택)와 `pages/forum/MyRequestsPage.tsx`(285줄, 자체 구현)가 공존한다. 후자는 `/forum/my-requests` route 로 살아 있다. 정리 대상.

### S5 — 포럼 댓글·좋아요 백엔드는 5서비스 열려 있는데 프론트는 2서비스만 구현

`F40`~`F42`. 백엔드는 공통 route 에 전부 열려 있으나 UI 는 KPA·NET 에만 있다. 보류 중인
`WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1` 의 대상이며,
본 census 기준 규모는 **VD 가 아니라 NI 9셀** 이다 — 즉 "복제 제거" 가 아니라 "미구현 채우기" 작업이다.
공통화 우선순위 관점에서 묶음 1~5 보다 뒤에 두는 것이 타당하다.

---

## 9. 판정 불확실 항목

WO §2-4 대로 미조사로 남기지 않고 근거와 함께 판정했다. 불확실성을 명시한다.

| # | 항목 | 부여 라벨 | 불확실성 |
|---|---|:--:|---|
| U1 | NET `/content` 콘텐츠 라이브러리 (F10·F11) | `SERVICE_SPECIFIC` | 화면은 공통 `ContentHubTemplate` 을 쓴다. 그러나 데이터 축이 "회원 작성 콘텐츠" 가 아니라 "운영자 발행 HUB 라이브러리"(`/api/v1/hub/contents`)라 동선이 다르다고 판단했다. 동선을 같다고 보면 `FULLY_COMMON` 으로 바뀐다 |
| U2 | KCos `/store-hub/services/tourists` (F54) | `OUT_OF_SCOPE` | KCos 고유 커뮤니티성 화면으로 볼 여지가 있으나 `/store-hub` 하위 = 매장 운영 화면이라 WO §4 제외 범위로 판정 |
| U3 | PH `/store-owner/library/resources`·`/account` (F21·F32) | `OUT_OF_SCOPE` | 기능 자체는 자료실·내 계정이지만 매장 셸(`StoreOwnerShell`) 내부라 커뮤니티 화면이 아니라고 판정. PH 는 커뮤니티/매장 경계가 다른 4서비스보다 흐리다 |
| U4 | NET `MembershipGate` (F35) | `NOT_IMPLEMENTED` | 컴포넌트는 존재하나 소비 0. "기능 있음(미연결)" 으로 볼지 "기능 없음" 으로 볼지 코드만으로 의도 판정 불가 → 사용자에게 보이는 동작 기준으로 NI |
| U5 | LMS 강사 영역 (F20) | `CORE_ONLY` | KPA 7 route(강의 운영·과제 채점 포함) vs GP 4 vs KCos 2 로 **기능 범위 자체가 다르다**. "같은 기능 단위" 로 묶을지 KPA 확장분을 별도 SS 로 뺄지 경계가 애매. 백엔드가 공통이라 CO 로 통일 |
| U6 | 홈·콘텐츠·자료실의 `FULLY_COMMON` | `FULLY_COMMON` | §1-3 규칙 6 적용. 화면은 공통이나 백엔드는 서비스별 복제다. 라벨만으로는 완료로 오독될 수 있어 §5 대조표에 별도 표기했다 |
| U7 | KPA 포럼 상세 (F05) | `FULLY_COMMON` | 639줄이지만 본문 표시는 공통 3부품 소비다. 초과 분량은 좋아요·댓글·삭제·멤버십(F08·F40·F42·F33)으로 이미 별도 기능 단위에 계상돼 이중 계상이 아니다 |

---

## 10. 검증 (WO §6)

### 10-1. 매트릭스 완전성

- 59 기능 단위 × 5 서비스 = 295 셀, **빈칸 0**
- 집계 합 295 = 모집단 N ✔
- `미조사: 0` ✔

### 10-2. 무작위 표본 10건 코드 역추적

| # | 표본 (기능 × 서비스) | 부여 | 역추적 경로 | 일치 |
|---|---|:--:|---|:--:|
| 1 | F04 게시글 목록 × PH | FC | `App.tsx:130` → `pages/forum/ForumListPage.tsx`(150줄) → `ForumListTemplate` → `services/forumApi.ts:10` `/pharmacy-hub/forum` → `pharmacy-hub.routes.ts:579` `createServiceForumRouter` | ✔ |
| 2 | F04 게시글 목록 × KPA | VD | `App.tsx:623` → `pages/forum/ForumListPage.tsx` 758줄, `ForumListTemplate` import 없음, `HubPagination`+`formatForumDate` 만 부분 소비 | ✔ |
| 3 | F11 콘텐츠 상세 × GP | FC | `App.tsx:623` → `pages/contents/ContentDetailPage.tsx`(130줄) → `CommunityContentDetailView`. KCos 동일 파일과 diff 4줄 | ✔ |
| 4 | F21 자료실 × KCos | FC | `App.tsx:456` → `pages/resources/ResourcesPage.tsx`(54줄) → `ResourcesHubTemplate` → `api/resources.ts:64` `/cosmetics/contents?sub_type=resource` | ✔ |
| 5 | F27 최신 활동 × NET | NI | `services/web-neture` 전역에 `home/latest`·`getLatest` grep 0건 | ✔ |
| 6 | F42 좋아요 × KPA | CO | `pages/forum/ForumDetailPage.tsx:88` `handleLike` → `forumApi.likePost` → `POST /api/v1/kpa/forum/posts/:id/like` → 공통 `ForumPostController.toggleLike` | ✔ |
| 7 | F42 좋아요 × GP | NI | `pages/forum/ForumPostDetailPage.tsx` 에 `handleLike`·`toggleLike` grep 0건 | ✔ |
| 8 | F20 강사 영역 × KCos | CO | `App.tsx:516~` → `pages/instructor/` 2파일뿐(`InstructorDashboardPage`,`InstructorCoursesPage`) → `api/lms.ts:19` `@o4o/lms-client` `createLmsInstructorClient` → 공통 `/api/v1/lms/instructor/*` | ✔ |
| 9 | F29 포럼 개설 신청 × NET | FC | `App.tsx:731` → `pages/forum/ForumRequestPage.tsx`(52줄) → `ForumRequestForm` | ✔ |
| 10 | F39 댓글 표시 × PH | NI | `pages/forum/ForumDetailPage.tsx:8` 주석 "댓글·좋아요는 본 WO 범위 밖", `:100` 댓글 **수**만 표시. `ForumCommentList` import 없음 | ✔ |

10/10 일치. 판정 규칙이 코드와 어긋난 표본은 없었다.

### 10-3. 하지 않은 검증

- **런타임/DB 실측 없음.** S1 의 실제 데이터 노출 여부, 각 서비스 포럼·콘텐츠 실재 건수는 확인하지 않았다(조사 전용 범위 + 노출 여부 판정에 조인 실측 필요).
- 빌드·타입 검증 없음 (문서만 추가, 코드 무변경).

---

## 11. 다음 판단 사항

1. **S1 은 별도 보안 WO 로 즉시 분리한다.** 포럼 축 공통화(묶음 4)보다 앞선다.
2. 보류 중인 `WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1` 은
   본 census 기준 **복제 제거가 아니라 미구현 채우기(NI 9셀)** 다. 공통화 목적이라면 묶음 2 → 1 → 5 → 3 순서가 회수가 크다.
3. 묶음 3(콘텐츠 백엔드)은 테이블 통합 판단이 선행하며 Frozen Baseline F4·F5 검토가 필요하다.
