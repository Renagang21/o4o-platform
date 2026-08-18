# CHECK-O4O-COMMUNITY-FORUM-KPA-NETURE-VIEW-CONVERGENCE-V1

- **WO**: `WO-O4O-COMMUNITY-FORUM-KPA-NETURE-VIEW-CONVERGENCE-V1`
- **선행**: [`IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1`](IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1.md) (F04 · F05)
- **브랜치**: `work/commonization-community` · **기준 commit**: `7977097ca`
- **작성일**: 2026-08-14
- **판정**: **PASS** — KPA/Neture 포럼 목록·상세 View 수렴 완료 (backend 변경 0)

---

## 1. 대상 4셀 재실측 (census 재판정)

census VD 4셀을 그대로 믿지 않고 현재 코드를 직접 재확인했다. **실제로 VIEW_DUPLICATED 인 것은 2개뿐이었다.**

| # | 셀 | census 표기 | 재실측 결과 | 작업 후 |
|---|----|---|---|---|
| 1 | F04 게시글 목록 × KPA | `VD` | 부분 소비만 (`HubPagination` · `formatForumDate`). 목록 본체는 `BaseTable`(선택·bulk·감사 포인트), 상단 검색/필터/건수 바는 Neture 와 **동일 구조 중복** | **PARTIAL_COMMON** (toolbar/info bar 공통, 목록 본체는 `SERVICE_SPECIFIC` 유지) |
| 2 | F04 게시글 목록 × NET | `FC` | **이미 `ForumListTemplate` 소비 중** — census 표기대로 FC 가 맞음. 다만 상단 toolbar/info bar 는 KPA 와 중복 | **FULLY_COMMON** (본체 + toolbar 모두 공통) |
| 3 | F05 게시글 상세 × KPA | `FC` (U7 라인 448) | `ForumPostHeader`/`ForumPostContent`/`ForumDetailLoadingState`/`ForumDetailNotFoundState`/`ForumCommentList`/`AppreciationPanel` 6부품 소비 중. **좋아요 버튼 · 댓글 입력 폼**만 자체 JSX | **FULLY_COMMON** (like/comment form 도 공통 부품으로 대체) |
| 4 | F05 게시글 상세 × NET | `VD` | **실제 최대 중복** — 1,033줄. 스켈레톤·post header·`contentToHtml`·`formatRelativeTime`·`CommentItem`·좋아요·댓글 폼 전부 자체 재구현 | **FULLY_COMMON** |

> 결론: census 의 "VD 4셀" 은 과대 표기였고, 실제 중복 축은
> **(a) Neture 상세 전면 재구현**, **(b) KPA↔Neture 목록 상단 toolbar/info bar** 두 개다.

---

## 2. 기존 shared 자산 재사용 결과 (§3)

**신규 대형 추상화(`ForumDetailTemplate`)를 만들지 않았다.** 상세 orchestration 은 KPA(closed forum · pin · appreciation)와
Neture(작성자 연락 · 로그인 모달 · slug 라우팅)가 실제로 다르므로, 기존 부품 확장 + 소형 부품 3개 추가로 해결했다.

| 기존 자산 | 재사용 방식 |
|---|---|
| `ForumListTemplate` | Neture 목록 본체 그대로 유지 (변경 없음) |
| `ForumPostHeader` | Neture 상세 헤더가 이 부품으로 교체. `titleStyle`(모바일 20px/데스크톱 28px) · `metaLeadingSlot` **추가**(옵셔널) |
| `ForumPostContent` | Neture 상세 본문 교체. `escapePlainText` prop **추가** |
| `ForumDetailStates` | `ForumDetailSkeletonState` **신규 추가** — Neture 자체 스켈레톤 대체. 기존 Loading/NotFound 상태는 불변 |
| `ForumCommentList` | `onEditComment`/`onDeleteComment`/`compact`/`emptyDescription` **추가** → Neture 의 자체 `CommentItem`(인라인 수정) 흡수. `renderCommentActions` slot 이 여전히 우선하므로 **KPA 동작 불변** |
| `forumContentToHtml` | `escapePlainText` 옵션 추가 → Neture `contentToHtml` 제거 |
| `formatForumDate` | Neture `formatRelativeTime` 제거하고 대체 |
| `AppreciationPanel` | KPA 그대로 유지 |

### 신규 shared 부품 (3개, 508줄)

| 부품 | LOC | 이유 |
|---|---:|---|
| `ForumLikeButton` | 85 | KPA·Neture 가 각각 구현하던 좋아요 토글 버튼 |
| `ForumCommentForm` | 144 | 댓글 textarea + 등록 버튼 + 미로그인 안내(`loginPrompt` slot) |
| `ForumListToolbar` / `ForumListInfoBar` | 279 | 검색 form · 활성 필터 chip + 초기화 · 건수/페이지 바 |

모두 **presentational** — API client · auth hook · router 를 import 하지 않는다. mutation 은 전부 호출측(service adapter) 소유.

---

## 3. 서비스별 config / slot

| 서비스 | 주입 |
|---|---|
| KPA 목록 | `filterInline` + `filterSlot={<ForumCombobox/>}`(포럼 선택) · `actionSlot`=글쓰기 CTA · `chips`=포럼/검색어/태그 |
| Neture 목록 | `filterSlot`=카테고리 select + 유형 pill · `filterRightSlot`=정렬 select · `chips`=검색어/카테고리/유형/정렬 · `clearAllLabel="초기화"` |
| KPA 상세 | `ForumCommentForm.loginPrompt`=`/login` 링크 · `accentColor={colors.primary}` · `ForumCommentList.renderCommentActions`(삭제만) 유지 |
| Neture 상세 | `ForumPostHeader.badgeSlot`(pinned+type) · `actionSlot`(데스크톱 인라인 / 모바일 ⋮ 드롭다운) · `titleStyle` 반응형 · `ForumCommentForm.loginPrompt`=로그인 모달 버튼 · `ForumCommentList.onEditComment/onDeleteComment/compact` |

**`serviceType` switch 0 · 서비스 이름 조건 JSX 분기 0.**

---

## 4. 서비스 고유 기능 보존 (§5)

- **KPA 유지**: `ClosedForumAccessBlocker`(403 `CLOSED_FORUM_ACCESS_DENIED`) · 태그 행 · 공지 지정/해제(`isForumOwner`) · `AppreciationPanel`(감사 포인트) · BaseTable 선택/bulk(링크 복사·AI 텍스트 복사·삭제) · 인기 태그 바 · 모바일 카드 목록 · `RowActionMenu`
- **Neture 유지**: `contactSection`(카카오 오픈채팅/채널) · `openLoginModal()` 흐름 · `basePath`(supplier/partner/workspace) · 모바일 ⋮ 액션 메뉴 · slug 기반 라우팅 · `formatDate`(전체 일시) · 댓글 인라인 수정/삭제

### KPA BaseTable 을 통일하지 않은 근거 (§4 예외)

KPA 목록은 **행 선택 + bulk action(링크/AI 텍스트/삭제) + 감사 포인트(🎁) 컬럼**을 가진 운영 성격 표이고,
Neture 목록은 읽기 중심 피드 표다. 두 표현은 실제 업무 차이이므로 억지 통일하지 않고 **상단 toolbar/info bar 만 수렴**했다.
이 판단 근거는 `ForumListToolbar.tsx` 헤더 주석에도 기록했다.

---

## 5. 변경 규모

| 파일 | 전 | 후 | 증감 |
|---|---:|---:|---:|
| `web-neture/.../ForumPostPage.tsx` | 1,033 | 701 | **−332** |
| `web-kpa-society/.../ForumListPage.tsx` | 758 | 719 | −39 |
| `web-kpa-society/.../ForumDetailPage.tsx` | 639 | 598 | −41 |
| `web-neture/.../ForumPage.tsx` | 452 | 431 | −21 |
| **서비스 page 합계** | **2,882** | **2,449** | **−433** |
| shared 신규 3파일 | 0 | 508 | +508 |
| shared 기존 5파일 확장 | — | — | +약 160 |

- 중복 page/component: **VD 2 → 0** (F04 KPA 는 목록 본체만 SERVICE_SPECIFIC 유지)
- shared 부품 소비 수: KPA 상세 6 → 8, Neture 상세 2 → 7, KPA 목록 2 → 4, Neture 목록 1 → 3
- 남은 동일 JSX 블록: **0** (검색 form · 필터 chip · info bar · 좋아요 · 댓글 폼 · 댓글 항목 전부 부품화)
- 제거한 dead style key: Neture 목록 12개, KPA 상세 4개

---

## 6. Backend / Interaction 경계 (§7 · §8)

- **backend 변경 0** — `apps/api-server` 무수정. DB migration 0. service boundary 0.
- `createComment`/`updateComment`/`deleteComment`/`toggleLike`/`pinPost` scope 및 closed-forum write 비대칭 **미수정**.
- 새 unscoped mutation **추가 0** — 신규 부품은 전부 presentational 이고 mutation 은 기존 service adapter 호출을 콜백으로 주입한다.
- Interaction WO 이월: 댓글/좋아요 scope 비대칭 · closed-forum write 정책 · `pinPost` boundary.

---

## 7. 검증 (§10)

| 항목 | 결과 |
|---|---|
| `@o4o/shared-space-ui` typecheck | PASS |
| `web-kpa-society` typecheck / `vite build` | PASS / PASS (18.94s) |
| `web-neture` typecheck / `vite build` | PASS / PASS (14.79s) |
| 회귀 — `web-glycopharm` / `web-k-cosmetics` / `web-pharmacy-hub` typecheck | PASS (shared 변경이 전부 additive·optional 임을 확인) |
| `apps/api-server` `npx jest` | PASS — 118 suites / **1,937 tests** / 43.1s |

기존 route 유지(`/forum`, `/forum/post/:id`, `{basePath}/post/:slug`) · dead link 0 · 모바일 터치 타깃(44px)은 `compact` prop 으로 보존.

---

## 8. 잔존 duplication · 위험

- **잔존 duplication**: KPA `BaseTable` 목록 본체 vs Neture `ForumListTemplate` — 업무 차이로 의도적 유지(`SERVICE_SPECIFIC`).
- **위험(낮음)**: Neture 활성 필터 표시가 단일 문자열 라벨 → **개별 제거 가능한 chip** 으로 바뀌었다(KPA 와 동일 표현). 기능 확장 방향이며 URL 파라미터 계약은 불변.
- **위험(낮음)**: 필터 chip / 검색 form 의 시각 톤이 shared 부품 기준으로 정규화됐다(KPA 는 Tailwind `primary-50` 계열 → inline slate 계열). 레이아웃·동작 동일.
- 이번 WO 완료는 **KPA/Neture 포럼 View 수렴 완료**일 뿐, 커뮤니티 전체 완료가 아니다.

---

## 9. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
