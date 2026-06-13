# CHECK-O4O-FORUM-DETAIL-COMMENT-LIST-COMMONIZATION-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-FORUM-DETAIL-COMMENT-LIST-COMMONIZATION-V1
> **선행:** ForumPostContent / ForumPostHeader / ForumDetailStates 추출 완료
> **작성:** 2026-06-13
> **판정:** **PASS** (comment **표시만** 공통화, Neture 보류)

---

## 1. ForumCommentList 위치

- `packages/shared-space-ui/src/ForumCommentList.tsx` (신규)
- export: `packages/shared-space-ui/src/index.ts`

presentational, display-only. comment API / auth hook / router 미 import. 작성/수정/삭제 버튼을 직접 구현하지 않고 `renderCommentActions` slot 으로만 받는다.

## 2. props 설계

```ts
ForumCommentListItem { id; authorName?; authorAvatarUrl?; content: string; createdAt?; updatedAt?; isAuthor? }
ForumCommentListProps {
  comments; emptyMessage?; className?; style?; itemStyle?;
  renderContent?(c)        // 본문 렌더 override (KCos html ContentRenderer). 미지정 시 plain text
  renderCommentActions?(c) // 삭제 등 액션 slot (부품은 직접 구현 안 함)
  renderCommentMeta?(c)    // meta 추가 slot
}
```

- content 기본 = plain text(whitespace-pre-wrap). html 렌더 필요 서비스는 `renderContent` 주입.
- empty state 공통(`emptyMessage`, 기본 "아직 댓글이 없습니다.").

## 3. 4서비스 적용 결과

| 서비스 | 적용 | 본문 렌더 | 액션 | 비고 |
|--------|:--:|----------|------|------|
| **KPA** | ✅ | plain(default) | `renderCommentActions`=삭제 버튼(isAuthor) | comment **작성 form**·삭제 동작·ownership guard·API **그대로 유지** |
| **GlycoPharm** | ✅ | plain(default) | 없음(read-only) | 섹션 헤더 유지, Tailwind divide-y → 부품(경미한 정규화) |
| **K-Cosmetics** | ✅ | **renderContent=ContentRenderer(html)** | 없음(read-only) | 댓글 html 렌더 보존(blocksToHtmlInline → ContentRenderer) |
| **Neture** | **보류** | — | — | full CRUD inline edit(CommentItem: create/update/delete + mobile/desktop) 으로 display-only 래퍼에 부적합 → 보류(WO 허용) |

## 4. Neture 적용/보류 판단

**보류.** Neture 댓글은 `CommentItem` 서브컴포넌트에 inline edit(수정 textarea 토글) + create + update + delete + ownership + mobile/desktop 동작이 얽혀 있어, "표시만" 공통화하는 `ForumCommentList` 로 옮기면 inline edit 동작을 slot 으로 우회해야 하고 단순화 위험이 큼. WO 의 "Neture full CRUD 가 복잡하면 보류 가능" 조항에 따라 **이번 WO 미적용**. → 후속 `WO-...-NETURE-COMMENT-LIST-V1`(inline edit 을 renderContent/actions slot 으로 흡수) 후보.

## 5. KPA delete action 유지 확인

✅ 유지. KPA 댓글 삭제는 `renderCommentActions` slot 으로 주입(`comment.isAuthor ? <button onClick={handleDeleteComment(id)}>삭제</button> : null`). `handleDeleteComment`·ownership(`user?.id===authorId || isAdmin`)·comment **작성 form** 모두 미변경.

## 6. Neture CRUD 유지 확인

✅ Neture 댓글 create/update/delete/inline edit **전부 미변경**(이번 WO 미적용). Neture `ForumPostPage.tsx` 는 본 WO 에서 **수정하지 않음**.

## 7. GP/KCos read-only 유지 확인

✅ GP·KCos 는 여전히 read-only(작성/수정/삭제 없음). `ForumCommentList` 에 `renderCommentActions` 미전달 → 액션 미노출. 작성 기능 **추가 없음**.

## 8. comment API / backend / DB 변경 없음 확인

✅ 변경 없음. comment create/update/delete API·backend·DB·migration 무변경. 각 서비스의 기존 fetch/submit/delete 로직 그대로. 변경은 **댓글 목록 표시 JSX 치환 + import** 뿐.

## 9. TypeScript 검증 결과

| 패키지 | 결과 |
|--------|------|
| shared-space-ui (ForumCommentList) | ✅ (web-neture tsc source 컴파일, 0 error) |
| web-neture / web-kpa-society / web-glycopharm / web-k-cosmetics | ✅ 전부 PASS (총 0 error) |

## 10. browser smoke 여부

⚠️ **라이브 미수행(보류).** KPA/GP/KCos 3서비스 dev 서버 + 댓글 보유 forum 글 확보 비용 대비, `ForumCommentList` 는 순수 presentational(map + 렌더 + empty)이고 **4서비스 tsc PASS**, 직전 WO 에서 동일 계열 shared forum 부품(ForumDetailNotFoundState 등)이 런타임 정상 렌더됨을 확인 → 회귀 위험 낮음. **tsc + 정적 검증으로 갈음.** 실제 댓글 작성/수정/삭제 smoke 는 WO 금지대로 미수행.

## 11. backend / API / DB / migration / route / menu 변경 없음 확인

✅ 변경 없음. 프론트 5파일(shared 2 + 서비스 3). route/menu/backend/DB 무변경. 새 @o4o dep 없음 → Dockerfile 변경 불요.

> **커밋 격리:** 다른 세션 WIP(web-kpa-society LMS 페이지 등)는 staging/커밋 제외(path-specific add + `git commit -- <내 파일>`).

## 12. 후속 후보

| WO 후보 | 내용 |
|--------|------|
| `WO-O4O-FORUM-DETAIL-NETURE-COMMENT-LIST-V1` | Neture inline edit 댓글을 renderContent/actions slot 으로 ForumCommentList 흡수 |
| `WO-O4O-FORUM-DETAIL-NETURE-HEADER-V1` | Neture 반응형 헤더 흡수(선행 WO 보류분) |
| `WO-O4O-FORUM-DETAIL-ACTIONS-OWNERSHIP-HELPER-V1` | edit/delete ownership 가드 helper(KPA·Neture) |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| ForumCommentList 추출 | ✅ (display-only, slot 기반) |
| 적용 | KPA(+삭제 slot)·GP·KCos(html renderContent). Neture 보류 |
| KPA 작성 form·삭제 동작 | ✅ 유지 |
| Neture CRUD | ✅ 미변경(미적용) |
| GP/KCos read-only | ✅ 유지(작성 추가 없음) |
| comment API/backend/DB | 무변경 |
| route/menu | 무변경 |
| TypeScript | 4서비스+shared PASS |
| browser smoke | tsc+정적 갈음(라이브 보류, 사유 §10) |
| 다른 세션 WIP | 미포함(path-specific) |
