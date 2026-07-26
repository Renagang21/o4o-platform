# IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1

> **유형:** 조사(read-only) — KPA-Society 메인 Home · 커뮤니티 구조 및 기능 연결 점검
> **작성일:** 2026-07-25
> **범위:** 코드/DB 변경 0. 정적 코드 분석(프론트 라우트·컴포넌트 + 백엔드 `/home/*` 핸들러).
> **판정 원칙:** 익숙함 우선 / 전문가 사용자 신뢰 / 커뮤니티 자율성 / 코드 단순성. 신규 체계·신규 테이블·분류/태그 설계·추천/보상 제안 없음.

---

## 0. 사전 확인

| 항목 | 결과 |
|------|------|
| branch | `main` |
| 다른 세션 WIP | `AGENTS.md`, `docs/checks/CHECK-O4O-NETURE-SUPPLIER-IA-UNIFICATION-V1.md`, `docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md` 수정 + `.codex/`, `apps/api-server/_msm*.mjs` untracked |
| 처리 | KPA 영역과 무관 → **수정하지 않고 조사만 수행**. `git pull` 도 다른 세션 작업 보호를 위해 미실행 |
| 코드/DB 변경 | **0** |

---

## 1. 현재 구조

### 1-1. Home 섹션 실제 순서

진입점 [CommunityHomePage.tsx](services/web-kpa-society/src/pages/CommunityHomePage.tsx) → 레이아웃 [StandardHomeTemplate.tsx](packages/shared-space-ui/src/StandardHomeTemplate.tsx)

| # | 섹션 | 출처 | 근거 |
|---|------|------|------|
| 1 | 🧪 체험 계정 안내 배너 | KPA 로컬 (PageHero 내부 최상단) | [CommunityHomePage.tsx:210-221](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L210-L221) |
| 2 | Hero 배너 (광고 캐러셀 / fallback) | `HeroBannerSection` | [CommunityHomePage.tsx:222-236](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L222-L236) |
| 3 | 공지(좌) + 약사공론 뉴스 placeholder(우) | `NewsNoticesSection` + KPA 슬롯 | [StandardHomeTemplate.tsx:120-139](packages/shared-space-ui/src/StandardHomeTemplate.tsx#L120-L139) |
| 4 | 최신글 (탭 6 / 6건) | KPA 로컬 `LatestActivitySection` | [CommunityHomePage.tsx:73-147](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L73-L147) |
| 5 | 서비스 바로가기 (카드 5) | `AppEntrySection` | [CommunityHomePage.tsx:317-323](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L317-L323) |
| 6 | CTA "KPA-Society 활용이 처음이신가요?" | `CtaGuidanceSection` | [CommunityHomePage.tsx:325-333](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L325-L333) |
| 7 | 이용 가이드 (3 항목) | `O4OHelpSection` (usage) | [CommunityHomePage.tsx:334-345](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L334-L345) |
| 8 | 내 역할에 따른 활용 방법 (카드 3) | `AppEntrySection` 재사용 | [CommunityHomePage.tsx:284-307](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L284-L307) |
| 9 | 다른 서비스 소개 | `O4OHelpSection` (services-only) | [CommunityHomePage.tsx:310-314](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L310-L314) |

**요청서 §5.1 예상 구조와 대비:** 예상한 9개 영역이 실제로 모두 존재하며 순서도 일치한다. 예상과 다른 "생소한 배치"는 없다.

**주석 불일치:** 파일 상단 주석([CommunityHomePage.tsx:15-19](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L15-L19))은 **"섹션 구조 (3블록)"** 으로 Hero / 공지 / AppEntry / CTA 4개만 나열한다. 실제는 9블록이며 최신글·이용 가이드·역할 카드·다른 서비스 소개가 주석에 없다. 후속 WO들이 섹션을 추가하면서 헤더 주석만 갱신되지 않았다.

### 1-2. 헤더 메뉴와 Home 진입 관계

[navigation.ts](services/web-kpa-society/src/config/navigation.ts) + [KpaGlobalHeader.tsx:101-112](services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L101-L112)

| 상태 | 메뉴 |
|------|------|
| 비로그인 | 커뮤니티(`/`) · 서비스 안내(`/service-guide`) · About · Contact |
| 로그인(일반) | 커뮤니티 · 서비스 안내 · About |
| 로그인(store_owner) | 커뮤니티 · **내 약국**(`/store`) · **약국 HUB**(`/store-hub`) · 서비스 안내 · About |

- "커뮤니티" = `/` = Home. 자연스럽게 연결된다.
- contextual 메뉴 노출 조건이 `isStoreOwnerDual` 단일 SSOT로 통일되어 있어 **"메뉴는 보이는데 클릭하면 guard redirect" 함정은 이미 제거됨** ([navigation.ts:36-45](services/web-kpa-society/src/config/navigation.ts#L36-L45)).
- 헤더에는 포럼/강의/콘텐츠/자료실이 **없다**. 이 진입은 Home 카드와 최신글 탭 바로가기에만 존재한다 → 다른 페이지에서 포럼으로 가려면 항상 Home을 경유하거나 URL을 직접 입력해야 한다.
- 모바일 하단 nav([MobileBottomNav.tsx:117-196](services/web-kpa-society/src/components/MobileBottomNav.tsx#L117-L196)): 비로그인 = 커뮤니티/로그인, 로그인 = 커뮤니티/약국 경영/알림/내정보. 여기에도 포럼·콘텐츠 직접 진입은 없다.

---

## 2. 실제 동작

### 2-1. 최신글 탭별 데이터·링크 상태

백엔드 [kpa.routes.ts:949-1061](apps/api-server/src/routes/kpa/kpa.routes.ts#L949-L1061)

| 탭 | 데이터 소스 | 항목 링크 | 라우트 존재 | 판정 |
|----|-------------|-----------|:-----------:|------|
| 전체 | 5종 병합 후 최신순 6건 | 각 타입별 | — | ✅ |
| 포럼 | `forumService.listRecentPosts()` | `/forum/post/{id}` | ✅ [App.tsx:627](services/web-kpa-society/src/App.tsx#L627) | ✅ |
| 강의 | `lms_courses` (published) | `/lms/courses/{id}` | ❌ **없음** | 🔴 **404** |
| 콘텐츠 | `kpa_contents` (published, sub_type≠resource) | `/content/{id}` | ✅ [App.tsx:810](services/web-kpa-society/src/App.tsx#L810) | ✅ |
| 자료실 | `kpa_contents` (published, sub_type=resource) | `/content/{id}` | ✅ | ⚠️ 자료실 UX 이탈 |
| 사이니지 | `signageService.listForHome()` | `/signage` (허브 고정) | ✅ | ⚠️ 상세 미연결 |

- **강의:** 백엔드가 API 경로 형태(`/lms/courses/{id}`)를 그대로 href로 내보낸다([kpa.routes.ts:994](apps/api-server/src/routes/kpa/kpa.routes.ts#L994)). 프론트 canonical은 `/lms/course/{id}`([App.tsx:861](services/web-kpa-society/src/App.tsx#L861), [LectureCard.tsx:89](services/web-kpa-society/src/components/education/LectureCard.tsx#L89))이고 `/lms/courses`는 `/lms`로 redirect될 뿐 `:id`를 받지 않는다 → `path="*"` NotFoundPage([App.tsx:1113](services/web-kpa-society/src/App.tsx#L1113))로 떨어진다.
- **사이니지:** 모든 항목이 `/signage` 하나로 간다([kpa.routes.ts:1052](apps/api-server/src/routes/kpa/kpa.routes.ts#L1052)). `/signage/media/:id` 라우트는 존재하는데([App.tsx:870](services/web-kpa-society/src/App.tsx#L870)) 사용되지 않는다 — 어느 항목을 눌러도 같은 화면.
- **자료실:** 항목은 `/content/{id}`(일반 콘텐츠 상세)로 가는데, 자료실 고유 액션(`usage_type` = 다운로드 / 외부링크 / 복사)은 [ResourcesHubPage.tsx:82-88](services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx#L82-L88)에서만 해석된다 → 상세에서 다운로드·링크 이동이 사라진다.
- 표시 개수는 `LATEST_SUMMARY_LIMIT = 6`, '전체' 탭만 바로가기 없음(요약 성격) — 의도적이며 자연스럽다.

### 2-2. 공지 영역

- 데이터: `/home/notices` → `contentService.listForHome(['notice'])` → **`cms_contents`** ([content-query.service.ts:39](apps/api-server/src/modules/content/content-query.service.ts#L39), [kpa.routes.ts:831-835](apps/api-server/src/routes/kpa/kpa.routes.ts#L831-L835)).
- 링크: `href: /content/{n.id}` ([CommunityHomePage.tsx:201](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L201)) → `ContentDetailPage` → `contentApi.detail(id)` → **`kpa_contents`** 조회([kpa.routes.ts:1678](apps/api-server/src/routes/kpa/kpa.routes.ts#L1678)).
- **서로 다른 테이블의 UUID** → 공지 클릭 시 "콘텐츠를 찾을 수 없습니다"([ContentDetailPage.tsx:102-109](services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx#L102-L109)).
- 참고: K-Cosmetics는 동일 템플릿을 쓰면서 **href를 아예 부여하지 않아**(텍스트 표시) 이 문제가 없다([HomePage.tsx:179-184](services/web-k-cosmetics/src/pages/HomePage.tsx#L179-L184)). KPA만 href를 넣었고, 그 대상이 잘못된 테이블이다.
- KPA는 `noticesViewAllHref`도 전달하지 않아 공지 "전체 보기"가 없다(K-Cos는 `/forum` 전달).

### 2-3. 서비스 바로가기 카드

| 카드 | 링크 | 실제 화면 | 판정 |
|------|------|-----------|------|
| 포럼 | `/forum` | `ForumHomePage` (검색·카테고리·활동·글쓰기 CTA) | ✅ 명칭·설명 일치 |
| 강의 | `/lms` | `LmsCoursesPage` | ✅ |
| 콘텐츠 | `/content` | `ContentListPage` (문서형 + 설문조사 2섹션) | ✅ |
| 디지털사이니지 | `/signage` | **`ContentHubPage`** ([App.tsx:866](services/web-kpa-society/src/App.tsx#L866)) | ⚠️ 컴포넌트명과 메뉴명 불일치(동작은 정상) |
| 자료실 | `/resources` | `ResourcesHubPage` | ✅ |

카드 순서(포럼→강의→콘텐츠→사이니지→자료실)는 일반 커뮤니티 관점에서 자연스럽다.

### 2-4. 커뮤니티·콘텐츠 기본 기능

| 기능 | 포럼 | 콘텐츠(`/content`) | 자료실(`/resources`) |
|------|:----:|:----:|:----:|
| 목록 | ✅ | ✅ (문서 6건 + 설문 6건 요약, "전체 보기") | ✅ (서버 페이지네이션) |
| 검색 | ✅ `ForumSearchBar` | ❌ **없음** | ✅ 제목·내용·등록자 |
| 상세 | ✅ | ✅ Drawer + 전체 페이지 | ✅ Drawer |
| 작성 | ✅ | ✅ `/content/documents/new` | ✅ 모달(일반) / `/operator/resources/new`(운영자) |
| 수정·삭제 | ✅ 소유자 | ✅ 소유자 | ✅ 등록자 |
| 첨부 | ✅ | ✅ 에디터 | ✅ upload/link |
| 공유·링크 | — | ✅ 링크 복사 | ✅ 외부링크 |

- **글쓰기 필수 입력 — 태그 1개 이상 (⚠️ 2026-07-25 정정, 아래 §12 참조):** 공통 `CommunityContentWriteShell`이 `requireTags` **기본값 true**이고 KPA가 override하지 않는다([CommunityContentWriteShell.tsx:79,113,186-187](packages/shared-space-ui/src/community/CommunityContentWriteShell.tsx#L79)). **이는 KPA 로컬 설정 누락이 아니라 O4O 공통 태그 정책의 의도된 동작이다** — 프론트뿐 아니라 서버도 강제하며, 정책 문서에 명문화되어 있다. 분류 UI 자체는 이미 제거되어(`content_type`/`sub_type` 고정, [ContentWritePage.tsx:109-110](services/web-kpa-society/src/pages/contents/ContentWritePage.tsx#L109-L110)) O4O 개념 학습 부담은 없다.
- 포럼 글쓰기는 `forumSlug`가 URL로 전달되어 별도 개념 학습이 없다([ForumWritePage.tsx:47-60](services/web-kpa-society/src/pages/forum/ForumWritePage.tsx#L47-L60)).
- 공통 컴포넌트 재사용률은 높다 — `BaseTable`/`BaseDetailDrawer`/`RowActionMenu`/`ActionBar`(@o4o/ui), `ForumHubTemplate`/`ResourcesHubTemplate`/`ContentHubTemplate`/`CommunityContentDetailView`(@o4o/shared-space-ui). **서비스별 독자 UI 패턴은 발견되지 않음.**

### 2-5. 검색

- 전역(사이트) 검색 **없음**. Home에도 검색 진입 없음.
- 포럼·자료실은 각자 검색 보유, 콘텐츠(`/content`)만 없음 → 같은 커뮤니티 안에서 검색 유무가 기능마다 다르다.
- 매장 HUB 콘텐츠는 "현재 소스 탭 안에서만" 검색된다([HubContentLibraryPage.tsx:143](services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx#L143)) — 의도적 설계로 기록되어 있음.

### 2-6. 콘텐츠 → 내 매장 가져오기

**가져오기가 가능한 위치 (3곳, 모두 "복사=독립 사본" 정책 일치):**

| 진입 | 대상 | API | 근거 |
|------|------|-----|------|
| `/content` 목록 (행 액션 / Drawer / 일괄) | 커뮤니티 문서형 콘텐츠 | `assetSnapshotApi.copy({assetType:'content'})` | [ContentListPage.tsx:164-200,282-290,317-324](services/web-kpa-society/src/pages/contents/ContentListPage.tsx#L164-L200) |
| `/resources` 자료실 | 커뮤니티 자료 | 동일 | [ResourcesHubPage.tsx:9,22](services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx#L9) |
| `/store-hub/*` (콘텐츠·블로그·POP·QR·동영상·화면세트·다국어) | 운영자 게시 자료 | `assetSnapshotApi.copy({assetType:'cms'\|'content'})` | [App.tsx:730-743](services/web-kpa-society/src/App.tsx#L730-L743) |

- 정책은 일관적이다: **연결이 아니라 복사**, 원본 수정·삭제와 무관하게 사본 유지, 재복사 허용, `restricted` 콘텐츠는 차단([ContentListPage.tsx:280-289](services/web-kpa-society/src/pages/contents/ContentListPage.tsx#L280-L289)). 안내 문구도 명시되어 있다([HubContentLibraryPage.tsx:194-199](services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx#L194-L199)).
- 승인·분류·전환 상태 같은 추가 단계는 **없다** — 버튼 1회로 사본이 생성된다.
- **단, 콘텐츠 상세 페이지(`/content/:id`)에는 가져오기 버튼이 없다.** 상세의 액션은 추천 / 링크 복사 / (소유자)수정 / 감사 포인트뿐이다([ContentDetailPage.tsx:132-151](services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx#L132-L151)). Home 최신글 → 콘텐츠 상세로 들어온 사용자는 가져오기 경로가 끊긴다(목록으로 되돌아가야 함).
- 원본 출처 확인: 매장 HUB는 배지로 출처를 구분하나(`콘텐츠 허브` / `운영 자료`), 커뮤니티 `/content`에서 가져온 사본의 출처 표시는 자료함 목록의 type 배지에 의존한다.

### 2-7. 가져온 콘텐츠의 관리 위치와 매장 활용

**관리 위치가 2곳으로 나뉜다.**

| 경로 | 화면 | 역할 |
|------|------|------|
| `/store/library/contents` | `StoreLibraryContentsPage` | **canonical 편집·제작 시작 진입점** (자체 주석에 명시: [StoreAssetsPage.tsx:5-6](services/web-kpa-society/src/pages/pharmacy/StoreAssetsPage.tsx#L5-L6)) |
| `/store/content` | `StoreAssetsPage` | 자산 게시 상태(draft/published/hidden) 운영 대시보드 |

매장 HUB의 복사 후 안내와 CTA는 `/store/content`를 가리킨다([HubContentLibraryPage.tsx:192-195](services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx#L192-L195)) — canonical 편집 진입점과 다르다. 반면 `/content` 목록의 코드 주석은 `/library/contents`라고 적혀 있어([ContentListPage.tsx:163](services/web-kpa-society/src/pages/contents/ContentListPage.tsx#L163)) 문서·링크·주석 3자가 어긋나 있다.

**매장 활용 연결 (자료함 → 제작):**

| 기능 | 콘텐츠 선택 방식 | 판정 |
|------|------------------|------|
| POP | 내 자료함 → 제작 시작 (canonical, 페이지 내 신규 시작 버튼 의도적 제거) | ✅ 연결됨 |
| QR | `StoreAssetSelectorModal`(자료함 feed) | ✅ |
| 디지털사이니지 | `StoreAssetSelectorModal` | ✅ |
| 타블렛 | `assetSnapshotApi` + `handledProductContentApi` | ✅ |
| 제작 자료 | `SelectContentsForProductionModal` → `StoreContentsSelector` 공유 | ✅ |

- **선택기 재사용이 이미 되어 있다** — `StoreContentsSelector`가 페이지와 모달에서 공유되고([StoreLibraryContentsPage.tsx:24-27](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx#L24-L27)), QR/사이니지가 같은 `StoreAssetSelectorModal`을 쓴다. 기능별 별도 데이터 구조 요구는 발견되지 않았다.
- 같은 콘텐츠를 다시 입력해야 하는 지점 **없음**.
- POP 빈 화면에서 "내 자료함 열기" 링크가 정확히 `/store/library/contents`로 연결된다([StorePopPage.tsx:431-444](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L431-L444)) — 끊긴 진입 아님.

### 2-8. 로그인 전후 동작

| 동작 | 비로그인 처리 | 근거 |
|------|---------------|------|
| Home 서비스 카드 클릭 | 로그인 모달 → 성공 시 원래 목적지 이동 | [CommunityHomePage.tsx:173-179](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L173-L179) |
| Home 최신글 항목 / 탭 바로가기 클릭 | **게이트 없음** — 그대로 이동 | [CommunityHomePage.tsx:113-128](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L113-L128) |
| 자료실 "자료 등록" | `navigate('/login', {state:{from}})` 페이지 이동 | [ResourcesHubPage.tsx:39-47](services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx#L39-L47) |
| 포럼 "포럼 개설신청" | 동일하게 `/login` 페이지 이동 | [ForumHomePage.tsx:41-47](services/web-kpa-society/src/pages/forum/ForumHomePage.tsx#L41-L47) |
| 로그인 성공 | `onLoginSuccess` 있으면 목적지로, 없으면 역할 기반 기본 화면 | [LoginModal.tsx:100-119](services/web-kpa-society/src/components/LoginModal.tsx#L100-L119) |
| 로그인 취소 | `closeModal()` — Home 유지, URL 변경 없음 | [AuthModalContext.tsx:56-59](services/web-kpa-society/src/contexts/AuthModalContext.tsx#L56-L59) |

- `/forum` `/lms` `/content` `/resources` `/signage` **모두 public 라우트**다(guard 래퍼 없음). 즉 Home 카드의 로그인 게이트는 라우트 보호가 아니라 UI 레벨 유도이며, **같은 목적지를 최신글 링크로 가면 로그인 없이 열린다.**
- `/login`은 별도 페이지가 아니라 `LoginRoute`가 Home 위에 모달을 여는 구조라([App.tsx:431-449](services/web-kpa-society/src/App.tsx#L431-L449)) 최종 화면은 유사하지만, URL이 바뀌고 배경이 현재 화면에서 Home으로 교체된다.
- 로그인 성공 후 목적지 복귀·취소 후 Home 유지는 **정상 동작**한다.

### 2-9. 오류·빈 화면

| 지점 | 현재 처리 | 문제 |
|------|-----------|------|
| 공지/Hero (`prefetchAll`) | `Promise.allSettled` → 실패 시 `[]`, 상위에서도 `.catch(() => {})` | API 실패와 "등록된 공지 없음"이 동일 화면 |
| 최신글 (`getLatest`) | `.catch(() => setLatestItems([]))` → "등록된 글이 없습니다" | 동일. 다시 시도 수단 없음 |
| 콘텐츠 목록/설문 | `.catch(() => setItems([]))` | 동일 |
| 콘텐츠 상세 | `error` state로 구분 표시 + "목록으로" | ✅ 유일하게 구분됨 |

전체 Home이 깨지는 경로는 없다(각 섹션이 독립적으로 빈 상태로 떨어짐) — 이 점은 양호하다.

### 2-10. 반응형·화면 밀도

| 항목 | 상태 |
|------|------|
| Hero | `PageHero` + 체험 배너가 `flexWrap`으로 접힘 — 과점유 아님 |
| 최신글 탭 | `flex gap-2 flex-wrap` — 모바일에서 2줄로 접힘, 사용 가능 |
| 최신글 항목 | 작성자명이 `hidden sm:block`으로 모바일에서 숨김, 제목 `truncate` — 정상 |
| 공지 2-column | `flex-col md:flex-row` — 모바일 세로 적층 |
| 콘텐츠 목록 | 데스크톱 `BaseTable` / 모바일 카드 리스트 분기([ContentListPage.tsx:352-412](services/web-kpa-society/src/pages/contents/ContentListPage.tsx#L352-L412)) |
| 하단 여백 | `MobileSafeArea`로 iOS home-indicator 반영([Layout.tsx:31-33](services/web-kpa-society/src/components/Layout.tsx#L31-L33)) |
| 화면 밀도 | **안내성 블록 4개(§6~§9)가 연속** — 모바일에서 Home 하단 절반 이상이 안내로 채워짐 |

기능이 아래로 묻히는 문제는 크지 않다(최신글·서비스 카드가 상단 4·5번). 다만 6~9번 연속 안내는 스크롤 피로를 만든다.

---

## 3. 익숙하지 않거나 불필요하게 복잡한 부분

| # | 내용 | 근거 |
|---|------|------|
| U1 | **콘텐츠 목록에 검색이 없다.** 포럼·자료실에는 있는데 콘텐츠만 없어, 같은 커뮤니티 안에서 검색 유무가 기능마다 다르다 | [ContentListPage.tsx](services/web-kpa-society/src/pages/contents/ContentListPage.tsx) 전체에 검색 UI 없음 |
| ~~U2~~ | ~~**글 작성 시 태그가 필수.** 일반 게시판에는 없는 단계~~ → **철회(2026-07-25).** O4O 공통 태그 정책이 강제하는 **의도된 동작**이며 사용자 결정으로 현행 유지 확정. 상세 §12 | [O4O-TAG-POLICY-V1.md](../architecture/data/O4O-TAG-POLICY-V1.md) |
| U3 | **Home 하단 안내 4연속** (CTA → 이용 가이드 → 역할별 활용 → 다른 서비스 소개). 약사·약대생 대상 서비스에 설명 비중이 높다 | §1-1 6~9번 |
| U4 | **"자료실"이 두 화면으로 존재.** Home 카드는 `/resources`, 콘텐츠 페이지 헤더 링크는 `/content/resources` — 데이터는 같은 `kpa_contents(sub_type='resource')`인데 화면·조작이 다르다 | [ContentListPage.tsx:659-665](services/web-kpa-society/src/pages/contents/ContentListPage.tsx#L659-L665) vs [App.tsx:746](services/web-kpa-society/src/App.tsx#L746) |
| U5 | **로그인 유도 방식이 3가지.** 모달 게이트(Home 카드) / 게이트 없음(최신글) / `/login` 페이지 이동(자료 등록·포럼 개설신청) | §2-8 |
| U6 | **가져온 콘텐츠 관리 위치가 2곳** (`/store/library/contents` vs `/store/content`)이고 링크·주석이 서로 다른 곳을 가리킨다 | §2-7 |
| U7 | 파일 상단 주석이 "3블록"이라 적혀 있어 실제 9블록 구조와 어긋난다 — 다음 작업자가 구조를 오인할 소지 | [CommunityHomePage.tsx:15-19](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L15-L19) |

---

## 4. 중복된 부분

| # | 중복 | 상세 |
|---|------|------|
| R1 | **CTA와 이용 가이드가 같은 링크** | CTA "KPA-Society 활용이 처음이신가요?" → `/guide/usage` = 이용 가이드 2번째 항목 "서비스 활용 방법" → `/guide/usage`. 바로 위아래에 붙어 있다 |
| R2 | **최신글 탭 바로가기 = 서비스 바로가기 카드** | `/forum` `/lms` `/content` `/signage` `/resources` 5개가 완전히 동일한 대상. 한 화면에 같은 진입이 2벌 |
| R3 | **안내 진입점 다중화** | 헤더 "서비스 안내"(`/service-guide`) + Home CTA(`/guide/usage`) + 이용 가이드 3항목(`/guide/intro`,`/guide/usage`,`/guide/features`) + 역할 카드 3항목(`/guide/for/*`) = 8개 안내 링크. 라우트는 **모두 실존**(데드링크 0) |
| R4 | **자료실 화면 중복** | U4와 동일 |
| R5 | **가져온 콘텐츠 관리 화면 중복 인식** | U6와 동일. 실제로는 역할이 다름(편집 vs 게시 상태)이나 이름·링크가 이를 전달하지 못함 |

---

## 5. 연결이 끊긴 부분

| # | 끊긴 지점 | 증상 | 근거 |
|---|-----------|------|------|
| **C1** | Home 공지 → 상세 | `cms_contents` id로 `kpa_contents` 상세를 열어 **"콘텐츠를 찾을 수 없습니다"** | [CommunityHomePage.tsx:201](services/web-kpa-society/src/pages/CommunityHomePage.tsx#L201) / [content-query.service.ts:39](apps/api-server/src/modules/content/content-query.service.ts#L39) / [kpa.routes.ts:1678](apps/api-server/src/routes/kpa/kpa.routes.ts#L1678) |
| **C2** | Home 최신글(강의) → 강의 상세 | `/lms/courses/{id}` 라우트 없음 → **NotFoundPage** | [kpa.routes.ts:994](apps/api-server/src/routes/kpa/kpa.routes.ts#L994) vs [App.tsx:860-861](services/web-kpa-society/src/App.tsx#L860-L861) |
| **C3** | Home 최신글(사이니지) → 미디어 상세 | 전 항목이 `/signage` 허브로 고정. `/signage/media/:id` 미사용 | [kpa.routes.ts:1052](apps/api-server/src/routes/kpa/kpa.routes.ts#L1052) / [App.tsx:870](services/web-kpa-society/src/App.tsx#L870) |
| **C4** | 콘텐츠 상세 → 내 매장 가져오기 | 상세 페이지에 가져오기 액션 없음. Home 최신글로 상세에 들어오면 목록으로 되돌아가야 함 | [ContentDetailPage.tsx:132-151](services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx#L132-L151) |
| **C5** | 최신글(자료실) → 자료 사용 | `/content/{id}`로 이동해 `usage_type`(다운로드·외부링크) 액션이 사라짐 | [ResourcesHubPage.tsx:82-88](services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx#L82-L88) |
| **C6** | 복사 완료 → 가져온 콘텐츠 관리 | 매장 HUB "작업하러 가기"가 canonical 편집 진입점이 아닌 자산 대시보드로 이동 | [HubContentLibraryPage.tsx:192](services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx#L192) vs [StoreAssetsPage.tsx:5-6](services/web-kpa-society/src/pages/pharmacy/StoreAssetsPage.tsx#L5-L6) |

**끊기지 않은 것으로 확인된 흐름:** 가져오기 → 매장 사본 생성 → 자료함 → 제작 시작 → POP/QR/사이니지/타블렛/블로그. 로그인 → 원래 목적지 복귀도 정상.

---

## 6. 기존 코드로 단순 정비 가능한 부분

모두 **신규 테이블·신규 상태·신규 컴포넌트 없이** 기존 구조 안에서 처리 가능하다.

| # | 정비 | 방식 | 규모 |
|---|------|------|:----:|
| S1 | 공지 링크(C1) | href를 제거해 텍스트 표시(K-Cosmetics와 동일)하거나 CMS 공지를 여는 기존 경로로 교체 | 1줄 |
| S2 | 강의 링크(C2) | 백엔드 href를 `/lms/course/{id}`로 정정 (프론트 canonical에 맞춤) | 1줄 |
| S3 | 사이니지 링크(C3) | 기존 `/signage/media/{id}` 라우트 사용 | 1줄 |
| S4 | 콘텐츠 상세 가져오기(C4) | `ContentListPage`의 `handleCopyToStore`와 동일한 `assetSnapshotApi.copy` 호출을 상세 `actionsSlot`에 추가 | 소 |
| S5 | 자료실 항목 링크(C5) | 최신글 resource 항목을 `/resources`로 보내거나, 상세에서 `usage_type` 액션 노출 | 소 |
| S6 | 복사 후 이동(C6) | `afterCopyAction.href`/`infoLinks`를 `/store/library/contents`로 정렬 + `ContentListPage` 주석 정정 | 2줄 |
| S7 | 안내 중복(R1) | CTA 링크를 이용 가이드와 다른 대상으로 바꾸거나 CTA 제거 — 두 블록 모두 기존 공통 컴포넌트 | 소 |
| ~~S8~~ | ~~태그 필수(U2)~~ → **철회(2026-07-25).** "config 1줄" 판단은 **프론트 표면만 본 오판**이었다. 서버(`POST`/`PATCH /contents` 400)와 O4O 공통 태그 정책이 함께 강제하므로 단순 정비 대상이 아니다. §12 | — |
| S9 | 콘텐츠 검색(U1) | 자료실이 쓰는 검색 패턴 또는 `CommunityContentSearchBar`(@o4o/shared-space-ui) 재사용 | 소 |
| S10 | 로그인 유도 통일(U5) | 자료 등록·포럼 개설신청도 Home 카드와 같은 `openLoginModal` + `setOnLoginSuccess` 사용 | 소 |
| S11 | 빈 상태/오류 구분(§2-9) | 최신글·공지에 `error` state 추가 — 콘텐츠 상세가 이미 쓰는 패턴 | 소 |
| S12 | 자료실 이원화(U4) | `/content` 헤더의 "자료실 →"을 `/resources`로 통일 | 1줄 |
| S13 | 안내 밀도(U3) | 6~9번 중 일부를 접거나 링크 묶음으로 축소 — 순서·문구 조정만 | 소 |
| S14 | 주석 정정(U7) | 파일 상단 섹션 구조 주석을 실제 9블록으로 갱신 | 소 |

---

## 7. 유지해야 할 부분

| 영역 | 판정 근거 |
|------|-----------|
| **약사공론 뉴스 영역** | 조사 대상 외 — 현재 상태 유지 (변경 제안 없음) |
| **Home 전체 골격** | Hero → 공지 → 최신글 → 서비스 바로가기 순서는 일반 커뮤니티 Home과 동일. 재설계 불필요 |
| **헤더 메뉴 구조** | 커뮤니티/내 약국/약국 HUB/서비스 안내/About — 역할 조건이 `isStoreOwnerDual` 단일 SSOT로 정합. 데드링크·기능 은폐 0 |
| **포럼 영역** | 목록·검색·활동·글쓰기·개설신청·상세 모두 정상, 공통 템플릿 재사용 |
| **가져오기 = 복사 정책** | 원본 단절·재복사 허용·restricted 차단이 3개 진입에서 일관. 승인/분류/상태 추가 없음 |
| **자료함 → 제작 흐름** | 선택기(`StoreContentsSelector`, `StoreAssetSelectorModal`) 공유, 재입력 없음, 빈 화면에서 자료함으로 연결 |
| **로그인 성공/취소 처리** | 목적지 복귀·화면 유지 정상 |
| **공통 컴포넌트 재사용** | @o4o/ui · @o4o/shared-space-ui · @o4o/store-ui-core 사용률 높음, 서비스별 독자 UI 패턴 없음 |
| **체험 계정 배너** | 계정 유효(비밀번호 정렬 완료), 제거 조건이 [CHECK-O4O-HOME-TEMP-EXPERIENCE-ACCOUNT-NOTICE-V1.md §8-4](docs/checks/CHECK-O4O-HOME-TEMP-EXPERIENCE-ACCOUNT-NOTICE-V1.md)에 기록되고 코드에 WO 주석 표식 존재 → **임의 제거하지 않음**. 다만 Hero보다 위 배치는 §6.2 배치 조정 후보 |

> ⚠️ 체험 계정 관련해 CHECK 문서 §5에 기록된 위험(데모 비밀번호가 `platform:super_admin` 계정 비밀번호와 동일)은 본 조사 범위 밖이나, 배너 유지 판단 시 함께 고려할 사항이다.

---

## 8. 유지 / 단순 정비 / 연결 단절 분류

| 분류 | 항목 |
|------|------|
| **유지** | Home 골격 순서 · 헤더 메뉴 구조 · 약사공론 영역 · 포럼 전 기능 · 가져오기=복사 정책 · 자료함→제작 흐름(POP/QR/사이니지/타블렛) · 로그인 성공/취소 처리 · 공통 컴포넌트 재사용 · 반응형 기본기 · 체험 계정(제거 조건 문서화됨) · **태그 1개 이상 필수(2026-07-25 확정, §12)** |
| **단순 정비** | S1~S7 · S9~S14 (링크 정정 3, 상세 액션 1, 링크 정렬 2, 중복 축소 2, 검색 재사용 1, 로그인 유도 통일 1, 오류 구분 1, 자료실 단일화 1, 주석 1) — **S8(태그 필수 완화)은 철회되어 13건** |
| **연결 단절** | C1 공지→상세 · C2 강의 항목→상세 · C3 사이니지 항목→상세 · C4 콘텐츠 상세→가져오기 · C5 자료 항목→자료 사용 · C6 복사 완료→관리 화면 |

**신규 구조 없이 정비 가능한 범위:** 위 연결 단절 6건 + 단순 정비 14건 **전부**. 신규 테이블·API 재설계·분류/태그 체계·추천 알고리즘·기여도/보상·역할별 별도 화면이 필요한 항목은 **없다**.

---

## 9. 조사 중지 조건 해당 여부

| 중지 조건 | 해당 |
|-----------|:----:|
| 신규 DB 테이블 필요 | ❌ |
| 대규모 API 재설계 필요 | ❌ (변경은 href 문자열 3건) |
| 콘텐츠 분류체계 / 표준 태그 설계 필요 | ❌ |
| 추천 알고리즘 / 기여도 / 보상 필요 | ❌ |
| 역할별 별도 서비스 필요 | ❌ |
| 커뮤니티 운영정책 설계 필요 | ❌ |
| 기존 콘텐츠 모델 통합 필요 | ❌ — C1은 통합이 아니라 **링크 대상 정정**으로 해결 |

→ **중지 조건 없음.** 조사 완료.

---

## 10. 후속 작업 우선순위

작게 나눈 단위. 각 항목은 독립 WO로 수행 가능하다.

| 순위 | 작업 | 포함 | 성격 |
|:---:|------|------|------|
| 1 | **Home 링크 정합** | C1 공지 href · C2 강의 href · C3 사이니지 href | 데드링크 제거 — 사용자가 즉시 겪는 오류 |
| 2 | **콘텐츠 가져오기 진입 연결** | C4 상세 페이지 가져오기 버튼 · C5 자료 항목 링크 | O4O 핵심 연결 복구 |
| 3 | **가져온 콘텐츠 관리 링크 정렬** | C6 `/store/library/contents`로 통일 + 주석 정정 | 관리 위치 혼선 제거 |
| 4 | **Home 안내 영역 중복·밀도 정비** | R1 CTA/가이드 중복 · U3 안내 4연속 축소 · U7 주석 | 순서·문구 조정만 |
| 5 | **자료실 진입 단일화** | U4/S12 `/content` 헤더 링크 → `/resources` | 1줄 |
| 6 | **콘텐츠 목록 검색 연결** | U1 검색 추가(기존 컴포넌트 재사용). ~~U2 태그 필수 완화~~ 철회 — 태그는 필수 유지(§12) | 게시판 기본기 |
| 7 | **로그인 유도 통일 + 오류/빈 상태 구분** | U5 모달 통일 · S11 error state | 일관성 |

> 우선순위 1·2는 실제 오류·단절이므로 먼저 처리하고, 3~7은 사용성 정비다. R2(최신글 탭 바로가기 = 서비스 카드 중복)는 두 진입이 서로 다른 맥락(요약 목록 / 진입 허브)에서 작동하므로 **정비 대상에서 제외하고 유지**를 권한다.

---

## 11. 완료 기준 대조

| 기준 | 결과 |
|------|------|
| 코드·DB 변경 0 | ✅ |
| 현재 Home 구조 확인 | ✅ §1-1 (9섹션, 주석 불일치 포함) |
| 주요 메뉴·라우트·API 연결 확인 | ✅ §1-2, §2-1~2-3 |
| 커뮤니티·콘텐츠 기본 기능 확인 | ✅ §2-4, §2-5 |
| 내 매장 가져오기·매장 활용 흐름 확인 | ✅ §2-6, §2-7 |
| 유지 / 단순 정비 / 연결 단절 분류 | ✅ §8 |
| 신규 체계·복잡 기능 제안 없음 | ✅ §9 |
| 후속 작업 작은 범위 제안 | ✅ §10 |

---

---

## 12. 정정 — 태그 필수는 의도된 플랫폼 공통 동작 (2026-07-25)

> **대상:** §2-4 글쓰기 필수 입력 · §3 U2 · §6 S8 · §8 분류 · §10 후속 6번
> **계기:** `WO-O4O-KPA-CONTENT-AUTHORING-OPTIONAL-TAGS-V1` 착수 후 조사에서 확인, 중지 → 사용자 결정으로 **현행 유지 확정**

### 12-1. 기존 판단과 정정

| | 내용 |
|---|------|
| **기존 판단** | 태그 필수는 KPA 가 `requireTags` 를 override 하지 않아 생긴 것이며, **config 1줄로 완화 가능**한 단순 정비 항목(S8) |
| **정정** | 프론트 설정 변경은 가능하지만, **서버와 O4O 공통 태그 정책이 최소 1개를 강제**하므로 태그 필수는 **의도된 플랫폼 공통 동작**이다. 단순 정비 항목이 아니다 |

기존 판단은 **프론트 표면(`CommunityContentWriteShell`)만 보고 내린 오판**이었다.

### 12-2. 강제 지점 (3중)

| 계층 | 위치 | 동작 |
|------|------|------|
| 프론트 | [CommunityContentWriteShell.tsx:79,113](../../packages/shared-space-ui/src/community/CommunityContentWriteShell.tsx#L79) | `requireTags ?? true` → `태그를 1개 이상 입력해주세요` |
| 서버 (생성) | [kpa.routes.ts:1611-1623](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L1611-L1623) | `sanitizedTags.length === 0` → **400 VALIDATION_ERROR** |
| 서버 (수정) | [kpa.routes.ts:1771-1784](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L1771-L1784) | 태그 전체 제거 시 **400** |

두 서버 지점 모두 주석이 `// O4O Tag Policy V1 — sanitize + 최소 1개 필수` 로, 아래 정책을 직접 구현한 코드다.

### 12-3. 정책 근거

[`docs/architecture/data/O4O-TAG-POLICY-V1.md`](../architecture/data/O4O-TAG-POLICY-V1.md) — **Status: Active** (Since 2026-04-25)

| 절 | 내용 |
|----|------|
| §3 입력 규칙 | **최소 개수 — 1개 이상 필수** |
| §10 Content — 정책 정렬 **완료** | **태그 최소 1개 필수 (400 응답)** · Frontend 검증(required) |
| §10 Forum / LMS / Signage | 동일 정책으로 정렬 완료 (`CourseService` 등) |

→ 프론트만 완화하면 서버 400 이 발생해 UX 가 오히려 악화되고, `POST /contents` 는 **자료실(`sub_type='resource'`)과 공유**되므로 영향이 콘텐츠 밖으로 번진다.

### 12-4. 확정 사항 (사용자 결정)

```text
콘텐츠 작성      → 태그 1개 이상 필수
자료실 작성      → 태그 1개 이상 필수
Forum/LMS/Signage → 기존 공통 태그 정책 유지
```

태그가 "검색 보조 데이터"라는 정책 §1 정의와 별개로, 현재 O4O 에서는 **콘텐츠 등록 시 최소한의 검색 가능성과 정리 기준을 확보하기 위한 공통 입력 조건**으로 유지한다.

`WO-O4O-KPA-CONTENT-AUTHORING-OPTIONAL-TAGS-V1` 은 **중지 후 종료** — 코드 0 · DB 0 · 정책 문서 0.

---

*End of IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1*

