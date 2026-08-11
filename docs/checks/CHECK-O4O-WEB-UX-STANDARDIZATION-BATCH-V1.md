# CHECK-O4O-WEB-UX-STANDARDIZATION-BATCH-V1

> WO: `WO-O4O-WEB-UX-STANDARDIZATION-BATCH-V1` (공통화 batch 1 — Web UX)
> 선행: `WO-O4O-WEB-DEAD-LINK-SWEEP-CROSS-SERVICE-V1` (`8befb6b24`) · `WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1` (`4157505c9`) · `WO-O4O-WEB-ORPHAN-PAGE-COMPONENT-CLEANUP-V1` (`a91e8179a`)
> 작성일: 2026-08-11
> 판정: **PASS (수정 9건 / HOLD 4건 / 공통화 후보 4건)**

대상 5개 서비스: `web-neture` · `web-kpa-society` · `web-glycopharm` · `web-k-cosmetics` · `web-pharmacy-hub`

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 시점 HEAD | `1f483be1e` (= `origin/main`) |
| 브랜치 | `main` |
| 작업트리 | 다른 세션(비밀번호 정책 트랙)의 변경 다수 존재 → **경로 충돌 없음**을 확인하고 path-specific stage 로만 커밋. 해당 파일은 미접촉 |

---

## 2. 서비스별 조사표 (7축)

| 축 | neture | kpa-society | glycopharm | k-cosmetics | pharmacy-hub |
|---|---|---|---|---|---|
| 1. 정적 죽은 링크 | 0 (HOLD orphan 파일 내부 3건 제외) | 0 (splat `/admin`·`/operator`·`/tablet` 오탐) | 0 | 0 | 0 |
| 1'. 동적(템플릿) 링크 | 28 prefix / 실결함 0 | 42 / 0 | 18 / **2** | 16 / 0 | 6 / 0 |
| 2. header·footer 링크 | 정상 | 정상 | **[글쓰기]→`/forum`** | **[글쓰기]→`/forum` 2건** | 정상 |
| 3. NotFound UX | **canonical** | 비표준 (App.tsx inline·`<a href>`) | 비표준 | 비표준 | **canonical** |
| 4. guard fallback | 안내 화면 | 안내 카드(🔒 접근 권한이 없습니다) | **무조건 `/` redirect** | `/login` redirect | MembershipGate 안내 |
| 5. API 실패 위장 | 10 | 14 | 17 | 8 | 0 |
| 6. orphan 잔여 | 0 (선행 WO 로 정리) | 0 | 0 | 0 | 0 |
| 7. 공통 레이아웃 | 서비스별 자체 | 서비스별 자체 | 서비스별 자체 | 서비스별 자체 | 서비스별 자체 |

조사 방법: 정적 링크 스캐너(`deadlink_scan.py`) · 동적 링크 스캐너(`dyn_scan.py`, 템플릿 리터럴 prefix 를 route 세그먼트 합집합과 대조) · `catch` 블록 정적 스캔 · 실브라우저 확인.

---

## 3. 수정한 항목 (9건)

### 3-1. NotFound UX 표준화 (3서비스)

canonical = Neture / Pharmacy-Hub 형태. 5개 서비스 문구·버튼을 동일하게 맞췄다.

```
404
요청하신 페이지를 찾을 수 없습니다.
주소가 바뀌었거나 더 이상 제공되지 않는 페이지입니다.
{요청 경로}
[홈으로 이동]  [이전 화면으로 돌아가기]
```

| 서비스 | 파일 | 변경 전 문제 |
|---|---|---|
| glycopharm | `src/pages/NotFoundPage.tsx` | 요청 주소 없음 · 뒤로가기 없음 |
| k-cosmetics | `src/pages/NotFoundPage.tsx` | 요청 주소 없음 · 뒤로가기 없음 |
| kpa-society | `src/App.tsx` (inline `NotFoundPage`) | 요청 주소 없음 · 뒤로가기 없음 · 복귀 링크가 `<a href>` 라 SPA 라우팅이 아닌 **전체 새로고침** |

서비스 고유 보조 링크(커뮤니티 / 문의하기 / 이용 가이드)는 유지했다.

### 3-2. 동적 죽은 링크 (glycopharm 2건)

| 파일 | 변경 전 | 변경 후 | 영향 |
|---|---|---|---|
| `src/pages/forum/ForumWritePage.tsx:45,47` | `/forum/post/${id}` | `/forum/posts/${id}` | 글을 쓰고 저장하면 **곧바로 404** 로 떨어졌다 |
| `src/pages/operator/LmsCoursesPage.tsx:195` | `/education/${row.id}` | `/lms/course/${row.id}` | 존재하지 않는 경로. canonical 은 `WO-O4O-LMS-ROUTING-UNIFICATION-V1` 의 `/lms/course/:id` (`/lms/:id` 는 legacy redirect 라 사용하지 않음) |

동일 축으로 나머지 4개 서비스의 게시글 링크 규약도 대조했다 — neture `/forum/post/:slug` · kpa `/forum/post/:id` · kcos `forum/post/:postId` 는 각자 route 와 일치하며, glycopharm 만 불일치였다.

### 3-3. header·footer 링크 불일치 (2서비스 3건)

| 파일 | 내용 |
|---|---|
| `web-glycopharm/src/pages/forum/ForumPage.tsx:137` | [글쓰기] → `/forum` (목록 제자리) → `/forum/write` |
| `web-k-cosmetics/src/pages/forum/ForumPage.tsx:191,277` | [글쓰기] 2건(헤더 · 빈 목록 CTA) 동일 문제 → `/forum/write` |

두 서비스 모두 `/forum/write` route 는 이미 존재했다. KPA-Society · Neture 는 처음부터 `/forum/write` 를 가리키고 있었다 (canonical).

**route 신설 0 / backend 0 / DB·migration 0 / 권한·role 0 / 공통 패키지 승격 0.**

---

## 4. HOLD 항목 (4건)

| # | 항목 | HOLD 사유 (WO §4) |
|---|---|---|
| H1 | neture `src/pages/PlatformPrinciplesPage.tsx` (route 없음) | **법률·규제 표현 판단 필요.** "왜 Neture 는 약국·도매상 자격을 직접 검증하지 않나요 / 자격 판단은 행정청의 권한입니다" + 약사법 제20조·제45조 인용. route 복구 = 법적 입장 재공표. 흡수 대상이던 `/o4o/principles` 는 `57d375bf7` 로 삭제되어 대체 화면이 없다 |
| H2 | neture `src/pages/channel/ChannelSalesStructurePage.tsx` (route 없음) | **route 복구가 IA 변경을 요구함.** 흡수 대상이던 `/o4o/targets/{type}` 트리가 `57d375bf7` 로 삭제됨 → 콘텐츠 소유처(`/guide/*` 체계 편입 여부) 재지정이 선행되어야 한다. `pages/channel/index.ts` 에 선행 WO 의 명시적 보존 결정이 살아 있다 |
| H3 | glycopharm guard 거부 시 무조건 `/` redirect | **서비스 정책 판단 필요.** `RoleGuard` 가 `deniedRedirect: '/'` 로 고정되어 있어(코드 주석: "안내 카드 계약이 없다") 권한 없는 사용자는 아무 안내 없이 홈으로 튕긴다. 안내 화면 렌더로 바꾸면 해당 서비스의 **모든** guarded route 동작이 바뀌므로 문구 통일 범위를 넘는다 |
| H4 | API 실패를 빈 목록으로 위장 — 49곳 | **권한 없이 smoke 불가 + 범위.** 대부분 로그인·매장/운영자 권한 화면이라 비로그인 실브라우저로 재현 검증이 불가하고, 수정은 문구 교체가 아니라 화면별 4상태(loading·error·empty·retry) 도입이라 별도 batch 가 맞다. 전체 목록은 §5-2 |

---

## 5. 공통화 후보 (이번 배치에서는 승격하지 않음)

> WO §3 에 따라 **공통 패키지 승격은 이번 배치에서 하지 않았다.** 아래는 기록만 한다.

### 5-1. 승격 후보 4건

| # | 후보 | 근거 |
|---|---|---|
| C1 | **NotFound 공통 컴포넌트** | 이번에 5개 서비스 문구·버튼·경로 표시를 동일하게 맞췄다. 구현은 여전히 5벌(styled div 3 + Tailwind 2)이라 다음 변경 때 다시 갈라진다. `@o4o/shared-space-ui` 로 승격 시 서비스별 주입은 (a) 보조 링크 목록 (b) primary 색상 2개뿐 |
| C2 | **guard 거부 화면(AccessDenied) 공통 컴포넌트** | 판정 순서는 이미 `@o4o/auth-react` `createRouteGuard` 로 공통화되어 있고 서비스별 차이는 `renderDenied` / `deniedRedirect` 주입뿐이다. 현재 KPA 만 안내 카드를 갖고 glycopharm 은 redirect, k-cosmetics 는 `/login` 이동으로 서로 다르다 (H3 판단이 선행되어야 함) |
| C3 | **포럼 링크 규약** | 게시글 상세 경로가 서비스마다 `/forum/post/:id`(neture·kpa·kcos) vs `/forum/posts/:id`(glycopharm) 로 갈린다. 이번엔 각 서비스 내부 정합만 맞췄다. 규약 통일은 route 변경이라 별도 판단 필요 |
| C4 | **목록 화면 load-error 4상태 컴포넌트** | §5-2 의 49곳이 모두 같은 형태(실패를 빈 배열로 대체)라 공통 훅/컴포넌트로 수렴 가능 |

### 5-2. API 실패 위장 49곳 (다음 batch 입력값)

`catch` 블록이 error 상태 없이 `setXxx([])` 만 수행 → 사용자에게 "데이터 없음"으로 보인다.

| 서비스 | 건수 | 대표 위치 |
|---|---:|---|
| web-glycopharm | 17 | `pages/store-management/StoreSignagePage.tsx`(3) · `pages/b2b/SupplyPage.tsx` · `pages/community/CommunityMainPage.tsx` |
| web-kpa-society | 14 | `pages/pharmacy/StoreSignagePage.tsx`(5) · `pages/courses/CourseHubPage.tsx` · `pages/dashboard/MyContentPage.tsx` |
| web-neture | 10 | `components/home/*`(3) · `pages/admin/ForumDeletedManagementPage.tsx`(2) · `pages/partner/*` |
| web-k-cosmetics | 8 | `pages/store/StoreSignagePage.tsx`(2) · `pages/b2b/SupplyPage.tsx` · `pages/services/TouristHubPage.tsx` |
| web-pharmacy-hub | 0 | — |

> 참고: 선행 `load-error 계약` 트랙(고정 코드 throw · 정상 0건만 통과 · 4상태+재시도)이 이미 존재하므로, 다음 batch 는 신규 설계가 아니라 **그 계약을 위 49곳에 적용**하는 작업이다.

---

## 6. typecheck · build · deploy 결과

| 서비스 | typecheck (`tsc -b`) | build | deploy |
|---|:---:|:---:|:---:|
| web-glycopharm | PASS | PASS (14.1s) | PASS |
| web-k-cosmetics | PASS | PASS (15.1s) | PASS |
| web-kpa-society | PASS | PASS (17.7s) | PASS |
| web-neture | 변경 없음 | — | skipped |
| web-pharmacy-hub | 변경 없음 | — | skipped |

배포 workflow `Deploy Web Services (Cloud Run)`:

| run | commit | 배포 대상 |
|---|---|---|
| `31454971988` | `1ce5e3c68` | glycopharm · k-cosmetics · kpa-society (neture · pharmacy-hub skipped) |
| `31455304900` | `17118a1a8` | glycopharm (나머지 4 skipped) |
| `31455699000` | `2869cbc37` | glycopharm · k-cosmetics |

**API(`o4o-core-api`) 배포 없음** — backend 변경 0건.

---

## 7. smoke 결과 (프로덕션 실브라우저)

| 축 | URL | 결과 |
|---|---|---|
| 없는 route | `glycopharm.co.kr/no-such-page-batch-v1` | 표준 404 render · 주소 `/no-such-page-batch-v1` 보존 |
| 없는 route | `k-cosmetics.site/no-such-page-batch-v1` | 표준 404 |
| 없는 route | `kpa-society.co.kr/no-such-page-batch-v1` | 표준 404 |
| 없는 route | `neture.co.kr/no-such-page-batch-v1` | 표준 404 (기존 canonical) |
| 없는 route | `pharmacyhub.co.kr/no-such-page-batch-v1` | 표준 404 (기존 canonical) |
| 내부 링크 클릭 | 404 화면 → [커뮤니티] | `/forum` 으로 **SPA 이동** (KPA 는 전체 새로고침이었던 부분 해소) |
| 정상 route | `glycopharm.co.kr/` | 정상 렌더 · console error **0** |
| 정상 route | `glycopharm.co.kr/lms` → `/lms/course/{id}` | 강의 목록 3건 · 상세 정상 렌더 (운영자 행 클릭 수정의 도착지 확인) |
| 정상 route | `glycopharm.co.kr/forum/posts` → `/forum/posts/{id}` | 목록 3건 · 상세 정상 렌더 (글 작성 후 이동 경로의 도착지 확인) |
| footer·header 링크 | glycopharm footer 4개 그룹 | 전부 실 route (`/forum` `/lms` `/business` `/service-guide` `/contact` `/terms` `/privacy`) |
| 내부 링크 | `glycopharm.co.kr/forum/posts` [글쓰기] | 배포 후 `/forum/write` 로 확인 (기존 `/forum`) |
| 내부 링크 | `k-cosmetics.site/forum/posts` [글쓰기] | 배포 후 `/forum/write` 로 확인 (기존 `/forum`) |
| 로그인 필요 route | `kpa-society.co.kr/admin` | 🔒 "접근 권한이 없습니다 / 로그인이 필요합니다." 안내 render |
| 권한 없음 route | `k-cosmetics.site/operator` | `/login` 이동 (기존 동작) |
| 권한 없음 route | `glycopharm.co.kr/operator` | `/` 로 무안내 redirect — **H3 로 기록**, 이번 배치에서 변경하지 않음 |
| empty 상태 | glycopharm 게시글 상세 댓글 | "아직 댓글이 없습니다." 정상 노출 |

- 운영자 LMS 목록 행 클릭(로그인 필요)은 비로그인으로 재현 불가 → **도착지 route(`/lms/course/:id`) 가 실제로 렌더되는지**로 검증했다. 화면 내부 클릭 자체는 미검증.
- 포럼 글 작성 직후 이동(로그인 필요)도 동일하게 도착지 route 렌더로만 검증했다.

---

## 8. commit SHA

| commit | 내용 |
|---|---|
| `1ce5e3c68` | 404 UX 표준화 3서비스 + glycopharm 동적 죽은 링크 2건 |
| `17118a1a8` | 운영자 강의 목록 행 클릭을 canonical `/lms/course/:id` 로 정렬 |
| `2869cbc37` | 포럼 [글쓰기] 버튼 → `/forum/write` (glycopharm 1 · k-cosmetics 2) |
| (본 문서) | CHECK 문서 |

---

## 9. push 결과

`1f483be1e … 2869cbc37` — 3 commit 모두 push 완료. `HEAD == origin/main`.
다른 세션의 변경(비밀번호 정책 트랙)은 stage 하지 않았다.

---

## 10. 다음 batch 후보

1. **`WO-O4O-WEB-LOAD-ERROR-CONTRACT-BATCH-V1`** — §5-2 의 49곳에 기존 load-error 계약(4상태+재시도) 적용. 이번 배치 최대 잔여 부채
2. **`WO-O4O-AUTH-LOGIN-STANDARDIZATION-BATCH-V1`** — 사용자가 제시한 5묶음 중 2번. H3(guard 거부 UX) · C2(AccessDenied 공통 컴포넌트) 를 여기서 함께 판단
3. **`WO-O4O-WEB-SHARED-UI-PROMOTION-BATCH-V1`** — C1(NotFound) · C2(AccessDenied) 공통 패키지 승격
4. **Neture HOLD 2건(H1·H2) 판정** — 법적 입장 공표 여부(H1)는 사용자 승인 필요, IA 편입(H2)은 `/guide/*` 체계 소유처 결정 선행

---

## 11. 문서 정합 (CLAUDE.md §16)

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — **해당 없음**.
