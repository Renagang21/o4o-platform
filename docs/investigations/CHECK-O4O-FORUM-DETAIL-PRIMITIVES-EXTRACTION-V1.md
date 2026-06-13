# CHECK-O4O-FORUM-DETAIL-PRIMITIVES-EXTRACTION-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-FORUM-DETAIL-PRIMITIVES-EXTRACTION-V1
> **선행 IR:** IR-O4O-FORUM-DETAIL-SHARED-PARTS-AUDIT-V1 (`109787a70`)
> **작성:** 2026-06-13
> **판정:** **PASS (부분 — content primitive 닫음, states/header 후속 분리)**

---

## 0. 범위 결정 (중요)

조사 중 **4서비스 detail 이 2가지 스타일 시스템으로 갈림**을 확인했다:
- **GlycoPharm = Tailwind className 기반** (Loader2 spinner)
- **KPA / Neture / K-Cosmetics = inline `style` 기반** (KPA=`LoadingSpinner` 컴포넌트 + `ClosedForumAccessBlocker`, Neture=스켈레톤, KCos=텍스트)

이 때문에 부품별 시각 회귀 위험이 다르다:
- **ForumPostContent** = 시각 회귀 **0** (각 서비스 className/style·html 그대로 통과, `ContentRenderer` 귀결 동일). **이번 WO 적용.**
- **ForumDetail{Loading,Error,NotFound}State / ForumPostHeader** = 2개 스타일 시스템 + 로딩 UX(spinner/text/skeleton) + KPA `ClosedForumAccessBlocker` 분기를 **정규화**하게 되어 서비스별 시각 변경이 발생. WO 원칙 "시각 변경 최소화" 를 가장 충실히 지키려면 **별도 시각 검증 pass 가 필요** → **후속 WO 로 분리.**

→ 본 WO 는 IR 의 **1순위("content 변환 수렴을 최우선")** 를 안전하게 닫고, states/header 는 후속(`WO-O4O-FORUM-DETAIL-STATES-HEADER-EXTRACTION-V1`)으로 넘긴다.

## 1. 추출한 shared primitive 목록

| 부품 | 위치 | 내용 |
|------|------|------|
| `forumContentToHtml(content)` | `packages/shared-space-ui/src/forumContentToHtml.ts` | Block[] → HTML canonical 변환 (forum-core `blockToHtml` line-identical 복제, **forum-core import 없음**) + string passthrough |
| `ForumPostContent` | `packages/shared-space-ui/src/ForumPostContent.tsx` | `content`(→forumContentToHtml) 또는 `html`(서비스 고유 변환 보존) + className/style → `ContentRenderer` |
| export | `packages/shared-space-ui/src/index.ts` | 위 2개 export |

**(후속 분리)** ForumPostHeader / ForumDetailLoadingState / ForumDetailErrorState / ForumDetailNotFoundState — 본 WO 미생성.

## 2. ForumPostContent 변환 정책

- **forum-core-free:** shared-space-ui 는 forum-core 미의존(GP/KCos Dockerfile 이 forum-core 미COPY → transitive 의존 시 빌드 실패). `forumContentToHtml` 은 forum-core `blockToHtml` 을 **로컬 복제**(paragraph/heading/quote/list/code/image/divider/default 동일 분기).
- **2가지 적용 모드:**
  - `content` prop → canonical `forumContentToHtml` (KPA/KCos 채택).
  - `html` prop → 사전 변환 문자열 그대로 (GP plain-text / Neture legacy-escape 보존).
- **출력 동등성:**
  - KPA: 기존 `blocksToHtml`(forum-core) ↔ `forumContentToHtml` = **동일 출력**(line-identical 복제).
  - KCos: 기존 로컬 `blocksToHtmlInline`(p/heading/quote) ⊂ `forumContentToHtml`(+list/code/image/divider) = **상위호환**(누락 블록이 이제 렌더, 회귀 아님).
  - GP/Neture: 자기 변환 결과를 `html` 로 넘겨 **변경 0**.

## 3. 4서비스 적용 결과

| 서비스 | 적용 | 모드 | 부수 정리 |
|--------|:--:|------|----------|
| **KPA** (`ForumDetailPage.tsx`) | ✅ | `content` (canonical) | `blocksToHtml`(forum-core)·`ContentRenderer` import 제거(미사용화) |
| **K-Cosmetics** (`PostDetailPage.tsx`) | ✅ | `content` (canonical) | 본문 `contentHtml` 제거. 댓글 `blocksToHtmlInline`·`ContentRenderer` 는 **유지**(댓글은 범위 외) |
| **GlycoPharm** (`ForumPostDetailPage.tsx`) | ✅ | `html={bodyText}` (extractText 보존) | `ContentRenderer` import 제거(미사용화) |
| **Neture** (`ForumPostPage.tsx`) | ✅ | `html={contentToHtml(...)}` (legacy-escape 보존) | `ContentRenderer` import → `ForumPostContent`. `contentToHtml`·`blocksToHtml` 유지 |

## 4. KPA 고유 기능 보존 확인

✅ `ClosedForumAccessBlocker`(403 CLOSED_FORUM)·tags·`AppreciationPanel`·comment create/delete·like·edit/delete CTA·ownership/admin guard·`/forum/post/:id` route — **전부 미변경**(content render 1줄만 교체).

## 5. Neture 고유 기능 보존 확인

✅ basePath·slug routing·contactSection(`shouldShowAuthorContact`)·comment full CRUD·like·edit/delete CTA·모바일 action 메뉴·`${basePath}/post/:slug` route — **전부 미변경**. 본문 변환 `contentToHtml`(legacy escape) 보존(html prop).

## 6. GP/KCos read-only 정책 유지 확인

✅ GP·KCos detail 은 여전히 read-only(comment list only, edit/delete·comment write 없음). content render 부품만 교체, 정책 무변경.

## 7. comment / action / contact / closed-forum 미수정 확인

✅ 미수정. 변경은 각 서비스 **post 본문 render 1줄 + import 정리**뿐. comment 섹션·like·edit/delete·contactSection·ClosedForumAccessBlocker·AppreciationPanel 코드 무변경.

## 8. TypeScript 검증 결과

| 패키지 | 결과 |
|--------|------|
| shared-space-ui (ForumPostContent/forumContentToHtml) | ✅ (web-neture tsc 가 source 컴파일, 0 error) |
| web-neture | ✅ PASS (0 error) |
| web-kpa-society | ✅ PASS (총 0 error) |
| web-glycopharm | ✅ PASS (총 0 error) |
| web-k-cosmetics | ✅ PASS (총 0 error) |

## 9. browser smoke 여부

✅ Neture detail 수행(제출/mutation 없음):
- `/forum/post/forum-purpose-and-scope` → title·**본문 content(ForumPostContent)**·댓글 정상 렌더. console error 3건은 **401 auth/me·refresh**(세션 만료, forum 무관).
- KPA/GP/KCos: dev 인프라 비용으로 라이브 미수행. 대신 **tsc PASS + 출력 동등성(forumContentToHtml = blockToHtml line-identical, KCos 상위호환) + ForumPostContent 컴포넌트 Neture e2e 동작 확인**으로 검증. (canonical 경로 회귀 위험 최소)

## 10. backend / API / DB / migration / route / menu 변경 없음 확인

✅ 변경 없음. 프론트 7파일(shared 3 + 서비스 4)만. API/route/menu/backend/DB 무변경.

> **커밋 격리:** 다른 세션 WIP(`packages/lms-ui/`, `docs/checks/CHECK-O4O-STORE-HUB-SUPPLY-CATALOG-...`, b2b-catalog 등)는 staging/커밋에서 제외(path-specific).

## 11. 후속 후보

| WO 후보 | 내용 |
|--------|------|
| `WO-O4O-FORUM-DETAIL-STATES-HEADER-EXTRACTION-V1` | ForumDetail{Loading,Error,NotFound}State + ForumPostHeader 추출(스타일 시스템 차이 흡수 위해 className/style·slot 설계 + 서비스별 시각 검증) |
| `WO-O4O-FORUM-DETAIL-COMMENT-LIST-COMMONIZATION-V1` | comment **표시** 부품(작성/CRUD 제외) |
| (선택) GP content 를 plain → canonical 전환할지 정책 결정(현재 extractText 보존) |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| ForumPostContent + forumContentToHtml 추출 | ✅ (forum-core-free) |
| 4서비스 적용 | ✅ (KPA/KCos=content, GP/Neture=html) |
| content 변환 수렴 | KPA(동일)·KCos(상위호환) canonical 채택, GP/Neture 보존 |
| KPA 고유(closed-forum/tags/appreciation) 보존 | ✅ |
| Neture 고유(contact/basePath) 보존 | ✅ |
| GP/KCos read-only 정책 | ✅ 유지 |
| comment/action/contact/closed-forum | 미수정 |
| backend/API/DB/route/menu | 무변경 |
| TypeScript | 4서비스 + shared PASS |
| browser smoke | Neture detail 렌더 확인(나머지 tsc+동등성) |
| states/header | **후속 분리**(시각 검증 별도) |
| 다른 세션 WIP | 미포함 |
