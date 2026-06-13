# CHECK-O4O-FORUM-DETAIL-STATES-HEADER-EXTRACTION-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-FORUM-DETAIL-STATES-HEADER-EXTRACTION-V1
> **선행:** WO-O4O-FORUM-DETAIL-PRIMITIVES-EXTRACTION-V1(content primitive)
> **작성:** 2026-06-13
> **판정:** **PASS** (경미한 시각 정규화 허용 방침, Neture header/skeleton 보류)

---

## 0. 진행 방침

사용자 결정 = **"경미한 시각 정규화 허용"**. 서비스 전 단계이므로 loading/error/not-found/header 를 공통 primitive 기준으로 정리하되, 전면 `ForumDetailTemplate` 은 만들지 않고 comment/action/contact/closed-forum/route/basePath/backend 는 보존한다.

## 1. 추출한 shared primitive 목록

| 부품 | 위치 |
|------|------|
| `ForumPostHeader` | `packages/shared-space-ui/src/ForumPostHeader.tsx` |
| `ForumDetailLoadingState` / `ForumDetailErrorState` / `ForumDetailNotFoundState` | `packages/shared-space-ui/src/ForumDetailStates.tsx` |
| export | `packages/shared-space-ui/src/index.ts` |

모두 presentational, API/router 미 import. (content primitive `ForumPostContent`/`forumContentToHtml` 는 선행 WO 에서 추출 완료.)

## 2. ForumPostHeader props 설계

`title` + `authorName?` + `createdAt?` + `updatedAt?` 코어 + slot 3종(`badgeSlot`/`metaSlot`/`actionSlot`) + `className`/`style`. edit/delete·type/pinned badge·tags 는 직접 구현하지 않고 slot 으로만 받는다(서비스 고유 유지).

## 3. ForumDetail state props 설계

- `ForumDetailLoadingState`: `message?`/`variant?('spinner'|'text')`/`className`/`style`. spinner 는 CSS keyframe 자체 주입(비-Tailwind 환경 동작).
- `ForumDetailErrorState`: `title?`/`message?`/`onBack?`/`onRetry?`/`backLabel?`/`retryLabel?`/`className`/`style`.
- `ForumDetailNotFoundState`: `title?`/`message?`/`onBack?`/`backLabel?`/`className`/`style`.
- route 는 부품이 모름 — back/retry 는 callback.

## 4. 4서비스 적용 결과

| 서비스 | Header | Loading | Error | NotFound | 비고 |
|--------|:--:|:--:|:--:|:--:|------|
| **KPA** | ✅ (badge=category/pinned, meta=조회/댓글 slot, tags 는 헤더 밖 유지) | ✅ (`LoadingSpinner`→`ForumDetailLoadingState`) | (closed-forum 분기 유지) | ✅ (generic not-found 만 치환) | **ClosedForumAccessBlocker 미변경** |
| **GlycoPharm** | ✅ (badge=category, meta=Eye/Heart 아이콘 slot 보존) | ✅ (`Loader2`→공통) | ✅ | ✅ | Tailwind→inline 정규화(author/date 의 User/Calendar 아이콘 제거 = 경미한 정규화) |
| **K-Cosmetics** | ✅ (meta=댓글수 slot) | ✅ | ✅ | ✅ | 댓글 렌더(blocksToHtmlInline)·footer Link 유지 |
| **Neture** | **보류** | **보류(skeleton)** | — | ✅ | header=반응형+모바일 ⋮ 액션 메뉴+desktop 액션+edit/delete 소유권 / loading=정교한 skeleton → 시각·동작 변경 커서 보류(아래) |

## 5. 적용 보류 사유 (Neture header / skeleton)

- **Neture header**: `isMobile` 분기 + 모바일 `⋮` action 드롭다운(ref/state) + desktop inline 액션 + edit/delete ownership 가드 + postType badge 가 한 헤더에 얽혀 있어, `ForumPostHeader`(+actionSlot)로 옮기면 반응형/액션 메뉴 동작·레이아웃 변경 위험이 큼 → **경미한 정규화 범위를 넘어 보류**.
- **Neture loading**: breadcrumb/title/content/comments 4단 skeleton 으로, 공통 spinner 로 치환하면 의도된 richer UX 가 downgrade → **보존(보류)**.
- Neture 는 **NotFoundState 만** 공통화(browser smoke 확인). → 후속 `WO-...-NETURE-DETAIL-HEADER-V1`(actionSlot 설계) 또는 LoadingState skeleton variant 추가 시 재검토.

## 6. 시각 변경 여부

경미한 정규화 발생(방침대로):
- loading: KPA `LoadingSpinner`·GP `Loader2` → 공통 border spinner(유사). KCos 텍스트→spinner+message.
- error/not-found: 공통 아이콘+제목+메시지+버튼 look 으로 정렬.
- header: GP 의 author/date lucide 아이콘(User/Calendar) 제거(정규화). category·view/like(Eye/Heart)·pinned/posttype badge 는 slot 보존.
- 본문(`ForumPostContent`)·comment·action·contact 시각은 **불변**.

## 7. KPA 고유 기능 보존 확인

✅ `ClosedForumAccessBlocker`(403 closed-forum)·tags(헤더 밖 유지)·`AppreciationPanel`·comment create/delete·like·edit/delete CTA·ownership/admin guard·`/forum/post/:id` route — **전부 미변경**.

## 8. Neture 고유 기능 보존 확인

✅ basePath·slug routing·contactSection·comment full CRUD·like·edit/delete CTA·모바일 action 메뉴·반응형 헤더(보류로 그대로) — **전부 미변경**.

## 9. GP/KCos read-only 정책 유지 확인

✅ comment list only·edit/delete·comment write 없음 유지. 부품 적용은 header/state 표현만.

## 10. comment / action / contact / closed-forum 미수정 확인

✅ 미수정. 변경은 header + loading/error/not-found state 표현 치환 + import 정리뿐.

## 11. TypeScript 검증 결과

| 패키지 | 결과 |
|--------|------|
| shared-space-ui (ForumPostHeader/ForumDetailStates) | ✅ (web-neture tsc 가 source 컴파일, 0 error) |
| web-neture / web-kpa-society / web-glycopharm / web-k-cosmetics | ✅ 전부 PASS (총 0 error) |

## 12. browser smoke 여부

✅ web-neture 수행(제출/mutation 없음):
- 정상 detail(`/forum/post/forum-purpose-and-scope`): title·content·comments 정상.
- 존재하지 않는 slug: **`ForumDetailNotFoundState`** 렌더("게시글을 찾을 수 없습니다"·"목록으로 돌아가기"·🔍·breadcrumb 유지) — 공통 state 부품 end-to-end 동작 확인.
- KPA/GP/KCos(header + loading/error states): dev 인프라 비용으로 라이브 미수행. **tsc PASS + 순수 presentational(동일 컴포넌트)** 로 검증.

## 13. backend / API / DB / migration / route / menu 변경 없음 확인

✅ 변경 없음. 프론트 7파일(shared 3 + 서비스 4). route/menu/backend/DB 무변경. **새 @o4o dep 추가 없음**(ForumPostHeader/ForumDetailStates 는 기존 소비 패키지 shared-space-ui 내부) → 서비스 Dockerfile 변경 불요.

> **커밋 격리:** 다른 세션 WIP(`pnpm-lock.yaml` staged, web-glycopharm/web-k-cosmetics LMS·Dockerfile·package.json 등)는 staging/커밋에서 **완전 제외**(path-specific add + `git commit -- <내 파일>`, pathspec 없는 commit 금지).

## 14. 후속 후보

| WO 후보 | 내용 |
|--------|------|
| `WO-O4O-FORUM-DETAIL-NETURE-HEADER-V1` | Neture 반응형 헤더 + 모바일 액션 메뉴를 actionSlot/responsive 로 `ForumPostHeader` 흡수 |
| `WO-...-LOADING-SKELETON-VARIANT-V1` | `ForumDetailLoadingState` 에 skeleton variant 추가 후 Neture loading 흡수 |
| `WO-O4O-FORUM-DETAIL-COMMENT-LIST-COMMONIZATION-V1` | comment 표시 부품(작성/CRUD 제외) |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| ForumPostHeader + Loading/Error/NotFound 추출 | ✅ |
| 적용 | Header/States: KPA·GP·KCos 적용 / Neture=NotFound만(header·skeleton 보류) |
| 시각 변경 | 경미한 정규화(방침대로), 본문·comment·action·contact 불변 |
| KPA closed-forum/tags 보존 | ✅ |
| Neture contact/basePath/반응형 헤더 보존 | ✅ |
| comment/action/contact/closed-forum | 미수정 |
| backend/API/DB/route/menu | 무변경 |
| TypeScript | 4서비스+shared PASS |
| browser smoke | Neture NotFoundState end-to-end 확인 |
| 다른 세션 WIP | 미포함(path-specific) |
