# CHECK — WO-O4O-PHARMACYHUB-HOME-NEWS-AND-USAGE-GUIDE-REALIGNMENT-V1

**작업일**: 2026-09-05
**대상**: PharmacyHub 커뮤니티 홈(`/`) · 이용 안내(`/guide/intro`) · 뉴스(`/news`)
**결과**: DONE

---

## 1. 목표 대비 결과

| WO 항목 | 결과 |
|---|---|
| §1 홈 `커뮤니티 이용 안내` 카드 제거 | DONE |
| §2 안내 내용을 `이용 안내`의 이용가이드로 이동 | DONE — `/guide/intro` 05 `커뮤니티 이용 방법` |
| §3 홈 우측 카드를 `뉴스`로 교체 | DONE |
| §4 뉴스 범위(약국 경영·제도·유통·HFF/화장품·디지털 운영) | DONE — 목록 설명·빈 상태 문구로 명시 |
| §5 뉴스 데이터 소스 조사 | **판정 A — 기존 공통 원장 재사용** (신규 스키마 0) |
| §6 UI 정렬(desktop 2열 / mobile stack / 빈 상태) | DONE — 실측 |
| §7 기존 기능 불가침 | DONE — 회원가입·로그인·역할·권한·교육·매장 HUB·Neture 무변경 |

---

## 2. 기존 이용 안내 이동 위치

- **이동 대상**: 홈 `noticesRightSlot` 의 `커뮤니티 이용 안내` 4줄
- **이동처**: `packages/shared-space-ui/src/guide/copy/pharmacy-hub.ts`
  → `pharmacyHubGuideIntroProps.sections` 에 **append-only** 로 추가한
  `커뮤니티 이용 방법` 섹션 (렌더 화면 = `/guide/intro`, Footer/헤더의 `이용 안내` 축)

| 항목 | 문구(원문 보존) | 연결 route |
|---|---|---|
| 포럼 이용 방법 | 포럼 글쓰기는 PharmacyHub 가입 승인 후 가능합니다. | `/guide/features/forum` |
| 교육 콘텐츠 이용 방법 | 교육 콘텐츠는 PharmacyHub 에 등록된 강의만 표시됩니다. | `/education` |
| 내가 쓴 글 확인 | 내가 쓴 글은 커뮤니티 메뉴의 [내 글]에서 확인할 수 있습니다. | `/forum/my-posts` |
| 콘텐츠 공개/검토 방식 | 콘텐츠는 작성 후 운영자 검토를 거쳐 공개됩니다. | `/guide/features/content` |

- **신규 page·route 신설 0** — 기존 이용 안내 구조를 그대로 재사용했다.
- append-only 인 이유: `GuideIntroPage` 의 편집 sectionKey 가 index 기반(`section-{idx}-desc`)이라
  기존 섹션 순서를 바꾸면 키가 밀린다. 신규 섹션은 `section-4-desc` 로 충돌 0.
- 편집 대상 파일은 shared 패키지 안이지만 **PH 전용 copy 파일**이라 타 서비스 breaking change 0
  (kpa.ts / glycopharm.ts / k-cosmetics.ts / neture.ts 무변경).

---

## 3. 뉴스 데이터 원장 — 판정 A (기존 공통 원장 재사용)

조사 결과 PharmacyHub 는 **이미 뉴스 원장과 등록 화면을 모두 갖고 있었고, 소비 화면만 없었다.**

| 축 | 실재 |
|---|---|
| 원장 | 공통 `cms_contents` (serviceKey=`pharmacy-hub`, type=`news`) |
| Backend | `apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts:736` — 공통 `createNewsController` 마운트<br>`GET /api/v1/pharmacy-hub/news` (public/optionalAuth · published only) · `GET /api/v1/pharmacy-hub/news/:id` |
| 등록(운영자) | `/operator/content` = 공통 `CmsContentManager` (`@o4o/operator-core-ui`) — notice/news/event |
| 미보유 | 공개 소비 화면(목록·상세)뿐 |

→ **신규 table 0 / migration 0 / 신규 backend API 0 / PH 전용 CMS 0.**
   프런트 소비 계층만 추가했다.

프로덕션 실측(2026-09-05):
```
GET https://api.neture.co.kr/api/v1/pharmacy-hub/news?type=news&limit=5
{"success":true,"data":[],"pagination":{"page":1,"limit":5,"total":0,"totalPages":0}}
```
→ 현재 0건이므로 **배포 직후 홈 뉴스 카드는 빈 상태**로 노출된다(정상). 운영자가
`/operator/content` 에서 type=news 로 등록하면 즉시 홈·목록에 반영된다.

회원 콘텐츠(`type='knowledge'` · `metadata.subType='content'`)와는 **type 축**으로 갈리므로
같은 물리 테이블이지만 서로의 목록에 섞이지 않는다.

---

## 4. 홈 최종 구조

```
Hero (PharmacyHub 커뮤니티)
────────────────────────────────────────────
공지 (forum pinned)      │  뉴스 (cms_contents type='news')
 전체보기 → /forum/posts │   전체 보기 → /news
────────────────────────────────────────────
로그인 / 가입 상태 안내 밴드
최신글 (전체·포럼·콘텐츠·자료실·교육)
서비스 바로가기 (6 카드)
CTA (가입 안내)
이렇게 사용할 수 있습니다 (서비스 소개 / 이용 가이드 / 기능별 이용 방법)
```

- 홈에서 **사용법 설명 블록 0** — 이용 방법은 `이용 안내` 축이 담당한다.
- 뉴스 카드는 좌측 공지와 **같은 공통 컴포넌트** `NewsNoticesSection` 을 쓴다
  (PH 전용 카드 스타일 신설 0 · 헤더/프레임/최소높이 200px 자동 정렬).

---

## 5. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-pharmacy-hub/src/pages/community/CommunityHomePage.tsx` | `커뮤니티 이용 안내` 카드 제거 → `<HomeNewsCard />` |
| `services/web-pharmacy-hub/src/components/HomeNewsCard.tsx` | 신규 — 홈 뉴스 카드(공통 `NewsNoticesSection` + `LoadError`) |
| `services/web-pharmacy-hub/src/lib/api/pharmacyHubNews.ts` | 신규 — `/pharmacy-hub/news` 목록·상세 adapter |
| `services/web-pharmacy-hub/src/pages/news/PharmacyHubNewsListPage.tsx` | 신규 — 공통 `CommunityContentListTemplate` |
| `services/web-pharmacy-hub/src/pages/news/PharmacyHubNewsDetailPage.tsx` | 신규 — 공통 `CommunityContentDetailTemplate` |
| `services/web-pharmacy-hub/src/App.tsx` | `/news` · `/news/:id` public route 추가 |
| `services/web-pharmacy-hub/src/config/navigation.ts` | Footer `서비스` 섹션에 `뉴스` 등재(고립 route 0) |
| `packages/shared-space-ui/src/guide/copy/pharmacy-hub.ts` | `커뮤니티 이용 방법` 섹션 append |

Backend · DB · 권한 · 역할 · migration **변경 0**.

---

## 6. 검증

### 6-1. 정적 게이트

| 항목 | 결과 |
|---|---|
| `tsc -b` (web-pharmacy-hub) | PASS (exit 0) |
| `vite build` | PASS — 3893 modules |
| ESLint (변경 8파일) | PASS — 0 issue |
| `guideRouteContract` · `guideCoverageContract` · `guideServiceIntro` · `community-home-nav-convergence` | PASS 82/82 |
| jest `pharmacy-hub-content-resource-adoption` · `pharmacy-hub-parity-contract` | PASS 33/33 |
| `check-literal-consumers` (navigation.ts · CommunityHomePage.tsx) | raw-source spec 3건 식별 → 전부 PASS |

### 6-2. 브라우저 smoke (Playwright · production API)

localhost 정적 서버 + `/api/*` → `https://api.neture.co.kr` 프록시(same-origin)로
**실제 프로덕션 API** 를 소비해 측정했다.

| 화면 | desktop | mobile |
|---|---|---|
| `/` (뉴스 0건 · 실데이터) | PASS · `등록된 뉴스가 없습니다.` | PASS · 동일 |
| `/` (뉴스 3건 · fixture) | PASS · 제목+날짜 3행 | PASS |
| `/news` 목록 (fixture) | PASS | PASS |
| `/news/:id` 상세 (fixture) | PASS · 제목·본문·원문 링크 | PASS |
| `/news` 0건 | PASS · `등록된 뉴스가 없습니다.` | PASS |
| `/guide/intro` | PASS · 05 `커뮤니티 이용 방법` + 4항목 | PASS |

레이아웃 실측(px):

| 구분 | 공지 카드 | 뉴스 카드 |
|---|---|---|
| desktop 1440 | top 283 / left 112 / 600×239 | top 283 / left 728 / 600×239 |
| mobile 390 | top 263 / left 16 / 358×239 | top 550 / left 16 / 358×239 |

→ desktop 2열 동일 높이(239=239) · mobile 1열 stack · **가로 overflow 0** ·
   빈 뉴스 상태에서도 카드 최소높이 200px 로 레이아웃 유지.

내비게이션:
- 홈 뉴스 항목 클릭 → `/news/11111111-…` 이동 PASS
- 홈 뉴스 `전체 보기` → `/news` 이동 PASS
- `a[href="#"]` / href 없는 anchor **0건**

**JS 예외 0 · console error 0 · white screen 0 · dead link 0** (desktop/mobile 12 케이스 전부).

### 6-3. 회귀

| 항목 | 결과 |
|---|---|
| `커뮤니티 이용 안내` 문자열 | 홈 렌더 결과에서 0 (desktop/mobile 전 케이스) |
| 공지(forum pinned) 축 | 무변경 — 좌측 카드 그대로 |
| 최신글 4축 탭(포럼·콘텐츠·자료실·교육) | 무변경 |
| 서비스 바로가기 6카드 · CTA · Help | 무변경 |
| 회원가입/로그인/역할(member·store_owner·operator·admin)/글쓰기 권한/교육/매장 HUB/Neture | 무변경 (코드 접촉 0) |
| 다른 서비스 홈(KPA · GlycoPharm · K-Cosmetics · Neture) | 무변경 (copy 파일 분리) |

---

## 7. 중지 조건 해당 없음

- 신규 스키마 불필요 (판정 A) → §5 중지 조건 미해당
- 이용 안내 copy 는 PH 전용 파일 → breaking change 없음 → 미해당
- 병렬 세션 충돌 없음 — 작업 트리에 타 세션 파일 0

---

## 8. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

---

## 9. 후속 (이 WO 범위 밖)

- 뉴스 콘텐츠 실제 등록은 운영 작업이다 (`/operator/content` · type=news). 코드 작업 아님.
- 외부 매체(약사공론·약업신문) 자동 수집(feed ingestion)은 이 WO 범위가 아니다.
  현재는 운영자가 원문 링크(`linkUrl`)를 넣으면 상세에서 `원문 보기` 로 노출된다.
