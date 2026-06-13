# CHECK-O4O-FORUM-USER-PAGE-COMMONIZATION-FINAL-V1

> **유형:** 최종 점검 CHECK (read-only, 코드 수정 없음)
> **목적:** forum 사용자-facing 공통화 작업의 완료 축을 고정하고, 의도적으로 남긴 후속 backlog 를 분리하여 공식 종료한다.
> **작성:** 2026-06-13
> **판정:** **PASS — forum 사용자-facing 공통화 완료 고정**

---

## 1. 최종 점검 개요

forum 사용자-facing 공통화는 4서비스(KPA-Society / GlycoPharm / K-Cosmetics / Neture) 의 게시판 사용자 화면을 `@o4o/shared-space-ui` 의 공통 컴포넌트·primitive 기준으로 정렬하는 일련의 소규모 IR/WO 로 진행되었다.

원칙:
- **display/structure 공통화** 만 수행. comment 작성/수정/삭제·like·edit/delete action·contactSection·closed-forum·route/basePath·backend/API/DB/menu 는 건드리지 않음.
- 적용 시 큰 시각 변화가 생기는 서비스는 **보류(defer)** 허용, 사유는 각 CHECK 에 기록.
- 전면 ForumDetailTemplate 대신 **primitives-first**. comment CRUD / action / contact / closed-forum 은 서비스 고유 또는 정책 영역으로 분리.

이번 문서는 추가 구현이 아니라 **완료 상태 고정 + backlog 분리** 만 수행한다.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `3638aa1e5` |
| origin/main ahead/behind | `0 / 0` (동기화됨) |
| git status --short | (clean) |
| 다른 세션 WIP | 없음 (working tree clean) |
| 조사 기준 commit | `3638aa1e5` |

forum 공통화 관련 직전 커밋(history 반영 확인):
- `36c30e92d` feat(forum): extract ForumCommentList (comment display-only) across KPA/GP/KCos
- `ea1dbaa53` feat(forum): extract ForumPostHeader + detail loading/error/not-found primitives
- (선행) ForumPostContent / forumContentToHtml / ForumWriteForm / ForumListTemplate / ForumRequestForm 추출 커밋

## 3. 완료된 backend / contract 축

| 항목 | 상태 | 비고 |
|------|:--:|------|
| serviceCode whitelist / boundary 정리 | ✅ | forum 조회·작성 serviceKey 경계 정렬 완료 |
| closed forum search visibility gate | ✅ | 비공개 포럼 검색 노출 차단 게이트 정리 완료 |
| category → forum/tag terminology boundary | ✅ | 사용자-facing "카테고리" 표현 제거, tag 용어로 정렬(문서화) |
| membership join route false alarm | ✅ | 가입 라우트 오경보 정리 완료(거짓 양성) |
| backend/API/DB/migration 추가 변경 필요 | **없음** | 공통화는 프론트 표시/구조 한정, 백엔드 무변경 |

> backend/API/DB/migration 의 **추가 변경이 필요하지 않다** — 완료 판정 기준 #5 충족.

## 4. 완료된 request 축

| 항목 | 상태 | 비고 |
|------|:--:|------|
| `ForumRequestForm` shared 적용 | ✅ | 포럼 개설 신청 공통 폼 |
| KPA / GP / KCos / Neture 신청 화면 정렬 | ✅ | 4서비스 정렬 |
| tags required contract ↔ UI 정합 | ✅ | tags 필수 계약과 UI 일치 |
| 사용자-facing "카테고리" 표현 제거 | ✅ | terminology boundary 반영 |

## 5. 완료된 list 축

| 항목 | 상태 | 비고 |
|------|:--:|------|
| `formatForumDate` shared 사용 | ✅ | 상대 시간 표시 공통 유틸 |
| `HubPagination` shared 사용 | ✅ | 페이지네이션 공통 |
| `ForumListItem` shape 사용 | ✅ | 목록 데이터 표시 타입 정규화 |
| `ForumListTemplate` 적용 | ✅ | 목록 공통 presentational |
| GP / KCos / Neture list template 적용 | ✅ | 3서비스 template 정렬 |
| KPA list = BaseTable 고유 | **의도적 제외** | KPA 고유 BaseTable 구조 보존(공통화 강제 안 함) |

## 6. 완료된 write / create / edit 축

| 항목 | 상태 | 비고 |
|------|:--:|------|
| 4서비스 RichTextEditor 기준 정렬 | ✅ | 에디터 기준 통일 |
| content normalize 가능 포맷 정렬 | ✅ | backend `normalizeContent()` HTML↔Block[] 활용 |
| `ForumWriteForm` 적용 (create) | ✅ | 4서비스 create 공통 폼 |
| KPA / Neture edit 보유 서비스 ForumWriteForm 기준 정렬 | ✅ | edit 보유 서비스 정렬 |
| GP / KCos = create-only | **의도된 정책** | 기능 누락 아님, 현재 정책으로 기록 |
| postType optional 정책 | ✅ | optional 로 유지 |
| Neture contactSection 유지 | ✅ | Neture 고유 보존 |

## 7. 완료된 detail primitive 축

| 항목 | 상태 | 적용 범위 |
|------|:--:|----------|
| `ForumPostContent` 적용 | ✅ | KPA·KCos(`content`), GP·Neture(`html`) |
| `forumContentToHtml` 적용 | ✅ | forum-core-free 변환기(GP/KCos Docker 빌드 안전) |
| `ForumPostHeader` 적용 | ✅ | KPA·GP·KCos (slot 기반 badge/meta/action) |
| `ForumDetailStates`(Loading/Error/NotFound) 적용 | ✅ | KPA·GP·KCos |
| `ForumCommentList` 적용 | ✅ | KPA(+삭제 slot)·GP(read-only)·KCos(html renderContent) |
| Neture full CRUD comment | **의도적 보류** | inline edit CommentItem — display-only 래퍼 부적합 |
| KPA closed-forum / tags / appreciation 유지 | ✅ | KPA 고유 보존 |
| Neture contactSection / basePath / rich skeleton·header 유지 | ✅ | Neture 고유 보존 |
| GP / KCos read-only detail 유지 | ✅ | 작성/수정/삭제 미추가 |

## 8. 의도적 제외 / 보존 영역

공통화 완료를 막는 항목이 아니라, **서비스 고유 기능 또는 현재 정책**으로 보존한다.

### KPA 고유 (보존이 맞음)
- closed-forum 접근 차단(`ClosedForumAccessBlocker`)
- tags row(헤더 하단)
- BaseTable 기반 list
- appreciation(감사 포인트) — 단, AppreciationPanel 자체는 공통 컴포넌트
- comment 작성 form · 삭제 동작 · ownership guard

### Neture 고유 (보존이 맞음)
- `basePath`(supplier/partner/user 진입 경로 분기)
- contactSection
- rich skeleton loading + 반응형 header(mobile ⋮ action menu)
- inline comment CRUD(CommentItem: create/update/delete + inline edit)

### GP / KCos 정책 (기능 누락 아님)
- read-only detail (댓글 작성/수정/삭제 없음)
- create-only write (edit route 미보유)
- 현재 정책으로 **기록** — 향후 기능 확장은 별도 정책 WO

## 9. 남은 backlog 분류

### 선택적 backlog (구현 품질·범위 확장, 선택)
| 후보 | 내용 |
|------|------|
| `WO-O4O-FORUM-DETAIL-NETURE-COMMENT-LIST-V1` | Neture inline edit 댓글을 renderContent/actions slot 으로 ForumCommentList 흡수 |
| `WO-O4O-FORUM-DETAIL-NETURE-HEADER-V1` | Neture 반응형 header 를 ForumPostHeader 로 추가 흡수 |
| `WO-O4O-FORUM-DETAIL-LOADING-SKELETON-VARIANT-V1` | Neture skeleton 을 ForumDetailLoadingState variant 로 흡수 |
| `WO-O4O-FORUM-DETAIL-ACTIONS-OWNERSHIP-HELPER-V1` | edit/delete ownership 가드 helper(KPA·Neture) |
| ForumCommentList 디자인 추가 정렬 | 서비스 간 댓글 카드 시각 정렬 |
| Neture contact edit 영속화 | contactSection 편집 저장 |

### 정책 backlog (제품/정책 결정 필요)
| 후보 | 결정 사항 |
|------|----------|
| GP/KCos edit 기능 신설 여부 | 현재 create-only |
| GP/KCos comment 작성 기능 부여 여부 | 현재 read-only |
| GP postType list 표시 여부 | 현재 미표시 |
| edit route 통일 여부 | 서비스별 상이 |
| 전면 ForumDetailTemplate 도입 여부 | 현재 primitives-first |

> 위 backlog 는 모두 **선택적 또는 정책 결정** 영역이며, forum 사용자-facing 공통화 완료를 막는 **blocker 가 아니다**.

## 10. 완료 판정 기준 점검

| # | 기준 | 충족 |
|:-:|------|:--:|
| 1 | 4서비스 공통 핵심 사용자-facing 흐름이 shared component/primitive 기준 정리 | ✅ |
| 2 | KPA 고유 기능 억지 공통화 없이 보존 | ✅ |
| 3 | Neture basePath / contactSection 보존 | ✅ |
| 4 | GP/KCos create-only / read-only 가 기능 누락 아닌 정책으로 기록 | ✅ |
| 5 | backend/API/DB/migration/route/menu 추가 변경 불요 | ✅ |
| 6 | 남은 항목 모두 선택적 backlog 또는 정책 WO 로 분리 | ✅ |

## 11. 최종 판정

> **Forum 사용자-facing 공통화는 현재 기준 PASS 로 완료 고정한다.**
> 남은 항목은 Neture/KPA 고유 기능 보존 또는 GP/KCos 기능 확장 정책에 해당하며, 공통화 완료를 막는 blocker 가 아니다.

## 12. 후속 권장 순서

1. **(forum 종료)** 본 CHECK 로 forum 사용자-facing 공통화를 공식 종료.
2. 다음 작업은 forum 이 아닌 **다른 큰 축**(operator workspace / store / 다른 도메인)으로 이동.
3. forum 후속(§9 backlog)은 사업/정책 필요 시점에 개별 WO 로만 재개 — 현재 진행 불필요.

---

## 산출물 / 변경 없음 확인

| 항목 | 결과 |
|------|------|
| 생성 문서 | `docs/investigations/CHECK-O4O-FORUM-USER-PAGE-COMMONIZATION-FINAL-V1.md` (본 문서 1개) |
| 코드 수정 | **없음** |
| UI 수정 | **없음** |
| API / backend / DB / migration | **없음** |
| route / menu | **없음** |
| 새 공통 컴포넌트 생성 | **없음** |
| 조사 기준 commit | `3638aa1e5` |
| 다른 세션 WIP 포함 | 없음(문서 1개 path-specific 커밋) |
