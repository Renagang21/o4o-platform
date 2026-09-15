# CHECK-O4O-NETURE-HOME-SERVICE-NEWS-FORUM-V1

> **WO**: `WO-O4O-NETURE-HOME-SERVICE-NEWS-FORUM-V1`
> **선행**: `WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1` (개인화 홈 `HomeEntryPanel` 재사용)
> **상태**: 구현 + 정적 · 단위 · 로컬 실 화면 검증 = **PASS** · 프로덕션 실 화면 검증(글 0건 상태) = **PASS** (§7)
> **커밋**: `c9c4d4add`(구현) · `98b4b4d85`(테이블명 정정) · CHECK 커밋은 §9
> **작성일**: 2026-09-15
> **성격**: Neture 대표 홈(`/`)에 「O4O 서비스 소식」 포럼 바로가기 3종 + 최신 글 최대 5건. 기존 포럼 구조 재사용 — 새 게시판 · 새 테이블 · 권한 축 변경 **0**. 최소 조회 API 1개 추가(읽기 전용 · 공개).

---

## 0. 한 줄 요약

「O4O 서비스 소식」 포럼을 **기존 신청→승인 절차**로 만들고(같은 목적의 포럼은 없었음), 홈이 그 포럼의 공개 글 최신 5건을 **`GET /neture/home/news`** 로 읽어 제목+게시일로 보여준다. 바로가기 3종(새 기능·업데이트 / 사용법 / 활용 사례)은 **글 태그** 로 분류하고 기존 포럼 목록의 `?category=<forumId>&tag=<태그>` 필터로 연결한다. 로그인 후에는 주요 업무 · 내가 이용하는 서비스 **아래**, 가입 · 이용 상태 **위**; 로그인 전에는 공개 서비스 안내 아래에 같은 컴포넌트를 둔다.

---

## 1. 포럼

| 항목 | 값 |
|---|---|
| 동일 목적 포럼 존재 여부 | **없음** — 프로덕션 Neture 포럼은 `공급자/파트너 서비스 개선` 1개뿐이었음 (`GET /api/v1/neture/forum/categories`) |
| 생성 방법 | 기존 절차 그대로: `neture.co.kr/forum/request` 신청 → `/admin/community` 운영자 승인 (Neture 운영자 검증 계정 · 브라우저) |
| 이름 | `O4O 서비스 소식` |
| id | `d0cb53ae-93be-4bcb-8510-451461010179` |
| slug | `o4o-서비스-소식-mu1x8n1s` (생성 시 확정 — 서버 상수 `NETURE_SERVICE_NEWS_FORUM_SLUG_DEFAULT`, env `NETURE_SERVICE_NEWS_FORUM_SLUG` 로 덮어쓰기 가능) |
| forum_type | `open` (공개 — 로그인 전에도 글 노출) |
| 포럼 태그 | `새 기능·업데이트` · `사용법` · `활용 사례` (= 홈 바로가기 3종 · 글쓰기 「분류」 선택지) |
| 포럼 URL | `https://neture.co.kr/forum/posts?category=d0cb53ae-93be-4bcb-8510-451461010179` |
| 글 작성 권한 | **기존 Neture 포럼 정책 그대로** — 인증된 Neture 사용자(별도 writeGuard 없음). 이번 WO 에서 변경하지 않음 |
| 운영용 글 | **작성하지 않음** (WO §5 준수 — 프로덕션 포럼은 글 0건 상태) |

## 2. 바로가기 3종 링크 방식

- 분류 = **글 태그**(`forum_post.tags`). 별도 게시판 · 하위 카테고리 없음.
- 링크: `/forum/posts?category=<forumId>&tag=<태그>` — 기존 `ForumPage` 의 `category` 필터에 **`tag` URL 파라미터를 추가**했고, 서버 `listPosts` 의 기존 `tag` 필터(`:tag = ANY(post.tags)`)를 그대로 쓴다.
- `전체 보기` → `/forum/posts?category=<forumId>` (기존 포럼 목록).
- 글에 분류를 붙이는 경로: `ForumWritePage` 가 `?forum=<slug>` 로 대상 포럼을 받고, 그 포럼에 태그가 있으면 「분류」 select 를 보여 `tags:[분류]` 로 저장(`createForumPost` payload 에 `tags` 추가 · 서버는 이미 `tags` 수용). `ForumPage` 의 글쓰기 링크는 카테고리 필터 중일 때 `?forum=<slug>&tag=<현재 태그>` 를 전달한다.

## 3. 최신 글 조회 방식

`GET /api/v1/neture/home/news?limit=5` (신규 · 인증 불필요 · 읽기 전용) — `apps/api-server/src/routes/neture/controllers/neture-home-news.controller.ts`

| 규칙 | 구현 |
|---|---|
| 포럼 식별 | slug 상수 → `forum_category_requests` `slug=$1 AND service_code='neture' AND status='completed' AND forum_type='open'` (표시 이름 미사용) |
| 노출 글(서버 배제) | `forum_post` `status='publish'` 만 (draft · pending · rejected · archived(=삭제) 제외) · `organization_id IS NULL` (community scope 와 동일) |
| 정렬 | `COALESCE(published_at, created_at) DESC` — 세 분류 합산 · **고정글 우선 없음** |
| limit | 기본 5 · 최대 10 · 잘못된 값은 5 |
| 포럼 없음/비공개 | `{ forum: null, posts: [] }` 200 — 홈은 "아직 등록된 소식이 없습니다" |
| 응답 | `{ forum:{id,slug,name}, posts:[{id,slug,title,tags,publishedAt}] }` |

기존 `/neture/forum/posts?sortBy=latest` 를 쓰지 않은 이유: 고정글을 먼저 두어 "게시일 내림차순" 과 다르고, 포럼을 이름으로 골라야 해 불안정.

## 4. 변경 파일

### Backend (`apps/api-server`)
| 파일 | 변경 |
|---|---|
| `src/routes/neture/controllers/neture-home-news.controller.ts` (신규) | §3 API |
| `src/routes/neture/controllers/__tests__/neture-home-news.controller.test.ts` (신규) | 6 케이스 (limit · slug env · 포럼 조건 · 글 조건/정렬/limit 바인딩 · 포럼 없음) |
| `src/routes/neture/neture.routes.ts` | `router.use('/home', createNetureHomeNewsController(dataSource))` |

### Frontend (`services/web-neture`)
| 파일 | 변경 |
|---|---|
| `src/lib/home-news.ts` (신규) | `useHomeNews` · 바로가기 상수 · 링크 규칙(`forumListPath` · `forumTagPath` · `forumPostPath`) · 날짜 포맷 |
| `src/components/home/HomeServiceNews.tsx` (신규) | 섹션 UI — 제목 + 전체 보기 / 바로가기 한 줄 / 제목+게시일 목록(≤5 · 긴 제목 truncate) / 로딩 · 오류(재시도) · 없음 |
| `src/components/home/HomeEntryPanel.tsx` | `newsSlot` prop — 내가 이용하는 서비스 아래 · 가입 · 이용 상태 위 |
| `src/pages/O4OHomePage.tsx` | 로그인 후 `newsSlot={<HomeServiceNews />}` · 로그인 전 서비스 안내 `<nav>` 아래 `<HomeServiceNews />` |
| `src/pages/forum/ForumPage.tsx` | `tag` URL 파라미터(필터 · chip · filterKey) · 글쓰기 링크에 `forum`/`tag` 전달 |
| `src/pages/forum/ForumWritePage.tsx` | `?forum=<slug>` 대상 포럼 · 등록 포럼 표시 · 「분류」 select(포럼 태그) → `tags` |
| `src/services/forumApi.ts` | `fetchForumPosts({tag})` · `createForumPost({tags})` |

**미변경**: 포럼 entity · migration · 권한 guard · 다른 홈 영역(AI 입력 · 주요 업무 · 서비스 이동) · 다른 서비스 포럼.

## 5. 정적 · 단위 검증 (로컬)

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` web-neture | PASS |
| `tsc --noEmit` api-server | PASS |
| eslint 변경 7 파일 | 0 error (warning 1 = 기존 `ForumPage` useEffect deps — 이번 변경 전부터 `filterKey` 로 의도된 것) |
| jest `neture-home-news.controller.test.ts` | 6/6 PASS |

## 6. 로컬 실 화면 검증 (vite dev + Playwright · `/neture/home/news` 응답 mock)

프로덕션 포럼에 글이 없고 WO 가 운영용 글 작성을 금지하므로, 목록 상태는 **로컬 mock 데이터**로 검증했다. 로컬 dev 는 프로덕션 API 에 CORS 로 막혀 로그인 · 카테고리 조회가 불가 → 로그인 후 배치와 글쓰기 대상 포럼은 §7 프로덕션에서 검증.

| # | 항목 | 결과 |
|---|---|---|
| 6-1 | 로그인 전: 소개 문구 · 로그인/회원가입 · 서비스 안내 pill **아래** 소식 섹션 | PASS (`local-prelogin-desktop.png` · `local-prelogin-mobile.png`) |
| 6-2 | 제목 `O4O 서비스 소식` + 우측 `전체 보기` → `/forum/posts?category=<forumId>` | PASS |
| 6-3 | 바로가기 3종 href = `/forum/posts?category=<forumId>&tag=<태그>` (URL-encoded) | PASS |
| 6-4 | 최신 글 5건 · 제목+게시일 · 게시일 내림차순(mock 순서 유지) · 글 링크 `/forum/post/<slug>` | PASS |
| 6-5 | 모바일(390px) 5건 유지 · 긴 제목 ellipsis (scrollWidth 745 > clientWidth 289 · `text-overflow: ellipsis`) | PASS |
| 6-6 | 글 2건 → 2건만 표시 | PASS (`local-state-few.png`) |
| 6-7 | 글 0건 → "아직 등록된 소식이 없습니다." (바로가기 · 전체 보기는 유지) | PASS (`local-state-empty.png`) |
| 6-8 | 조회 실패(500) → "소식을 불러오지 못했습니다." + `다시 시도` · 클릭 후 5건 복구 · 홈 나머지 영역 정상 | PASS (`local-state-fail.png`) |
| 6-9 | `ForumPage` `?category=…&tag=사용법` → 요청 URL 에 `tag=` 포함 · 활성 chip `#사용법` 표시 | PASS (목록 자체는 CORS 로 mock fallback) |

## 7. 프로덕션 실 화면 검증 (neture.co.kr · 2026-09-15 · Playwright)

배포: Web `34913300147` · API `34913300145`(c9c4d4add) → API `34914117699`(98b4b4d85). 프로덕션 소식 포럼 글 0건이므로 **빈 상태**로 검증.

**첫 배포 결함 발견 → 수정**: `GET /neture/home/news` 가 500 `relation "forum_posts" does not exist` — 실제 테이블명은 `forum_post`(entity `@Entity('forum_post')`). 컨트롤러 · 단위 테스트 정정 → `98b4b4d85` 재배포. 결함 상태에서도 홈은 소식 섹션만 "불러오지 못했습니다 + 다시 시도" 로 표시하고 나머지 영역은 정상이었음(WO §5 "소식 실패가 홈을 막지 않는다" 실측 확인).

| # | 항목 | 결과 |
|---|---|---|
| 7-1 | `GET /api/v1/neture/home/news?limit=5` → `{forum:{id:d0cb53ae-…,slug:o4o-서비스-소식-mu1x8n1s,name:"O4O 서비스 소식"},posts:[]}` (200 · 인증 없이) | PASS |
| 7-2 | 로그인 후(Neture 운영자 검증 계정) 순서: AI 입력 → 주요 업무 → 내가 이용하는 서비스 → **O4O 서비스 소식** → (가입 · 이용 상태는 비어 숨김) · 주요 업무가 밀리지 않음 | PASS (`prod-postlogin-desktop.png` · `prod-postlogin-mobile.png` 390px) |
| 7-3 | 로그인 전(쿠키 없는 새 context): 서비스 안내 `<nav>` 바로 아래(536px→568px) 소식 섹션 · 같은 링크 | PASS (`prod-prelogin-desktop.png` · `prod-prelogin-mobile.png`) |
| 7-4 | 섹션 구성: `O4O 서비스 소식` + `전체 보기` + 바로가기 3종 한 줄 + "아직 등록된 소식이 없습니다." (전 · 후 동일) | PASS |
| 7-5 | `전체 보기` 클릭 → `/forum/posts?category=d0cb53ae-…` · 필터 chip `O4O 서비스 소식` · 글쓰기 링크 `/forum/write?forum=o4o-서비스-소식-mu1x8n1s` | PASS |
| 7-6 | 바로가기 `사용법` 클릭 → `…&tag=사용법` · chip `O4O 서비스 소식` + `#사용법` · 검색 결과 0건 · 글쓰기 링크에 `&tag=사용법` 전달 | PASS (`prod-forum-tag-filter.png`) |
| 7-7 | `/forum/write?forum=…&tag=사용법` → `등록 포럼: O4O 서비스 소식` · 분류 select 옵션 `분류 선택 안 함 / 새 기능·업데이트 / 사용법 / 활용 사례` · 초기값 `사용법` (**글 제출은 하지 않음**) | PASS (`prod-forum-write-classification.png`) |
| 7-8 | 회귀: AI 입력창 · 주요 업무(커뮤니티 · 매장 HUB · 내 매장 · 공급자 업무 · 운영자 화면) · 내가 이용하는 서비스 그대로 표시 | PASS |
| 7-9 | 조회 실패 시 홈 비차단 (첫 배포 500 상태에서 실측) | PASS |

## 8. 미검증 · 한계

- 실제 글이 있는 상태의 목록 · 분류 필터 · 글 상세 이동은 **로컬 mock** 으로만 검증 (프로덕션 포럼 글 0건 · 운영용 글 작성 금지).
- 글쓰기 「분류」 select → `tags` 저장 → 태그 필터 노출의 **end-to-end 저장**은 프로덕션에서 글을 만들지 않아 미실행 (서버 `tags` 수용은 기존 코드 · payload 전달은 코드 검토 + tsc).
- `NETURE_SERVICE_NEWS_FORUM_SLUG` env 는 프로덕션에 설정하지 않음(기본 상수 = 프로덕션 slug).

## 9. Git

- 구현: `c9c4d4add` (path-specific stage · `check-staged-scope` 10/10 범위 내)
- 정정: `98b4b4d85` (`forum_posts`→`forum_post` · 컨트롤러 + 테스트 2 파일)
- CHECK: 아래 최종 보고 참조

## 10. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
