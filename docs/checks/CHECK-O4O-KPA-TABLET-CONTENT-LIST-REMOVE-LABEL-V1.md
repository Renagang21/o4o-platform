# CHECK-O4O-KPA-TABLET-CONTENT-LIST-REMOVE-LABEL-V1

> WO: `WO-O4O-KPA-TABLET-CONTENT-LIST-REMOVE-LABEL-V1`
> 성격: 프론트 문구 — '보관' → '리스트에서 제거'(내부 계약 불변).
> Date: 2026-07-16

---

## 0. 결론

**PASS.** 태블릿 콘텐츠 리스트의 사용자 문구 '보관'을 **'리스트에서 제거'**로 변경. 내부 `status='archived'` / soft-delete API(`archiveScreenSet` = `DELETE /screen-sets/:id`) **계약 그대로**.

## 1. 변경 (문구/아이콘만)

| 위치 | 이전 | 이후 |
|------|------|------|
| 행 kebab 액션 | 보관 | **리스트에서 제거** (아이콘 Archive→Trash2) |
| 일괄 작업 버튼 | 선택한 콘텐츠 보관 | **선택한 콘텐츠를 리스트에서 제거** |
| 상태 배지 | 보관 | **리스트에서 제거됨** |
| 상태 필터 | 보관 | **리스트에서 제거됨** |
| 개별 확인창 | "…보관하시겠습니까?" | "…리스트에서 제거하시겠습니까? 콘텐츠는 삭제되지 않으며, ‘리스트에서 제거됨’ 필터에서 다시 확인할 수 있습니다." |
| 일괄 확인창 | 동일 취지 | 동일 문구(N개) |
| 연결 가드 메시지 | 적용 중 안내 | "이 콘텐츠는 현재 코너에 연결되어 있어 제거할 수 없습니다. 먼저 코너 연결을 해제해 주세요." (`ARCHIVE_BLOCKED_CONNECTED`/`SCREEN_SET_IN_USE`) |

파일: `TabletContentLibraryList.tsx`(라벨/확인/필터/일괄) + `TabletScreenSetManager.tsx`(개별 handleArchive 확인/toast).

## 2. 의미 보존

```
리스트에서 제거 = 화면 목록에서 숨김(status=archived, soft-delete) ≠ 콘텐츠 영구 삭제
→ '리스트에서 제거됨' 필터에서 다시 확인 가능
```
내부 status/enum/API/DB 는 **archived 그대로** — 사용자 표현만 변경.

## 3. 실측

| 항목 | 결과 |
|------|------|
| 행 kebab | "미리보기 / 수정 / **리스트에서 제거**" |
| 상태 필터 칩 | 전체/초안/활성/**리스트에서 제거됨** |
| 확인 문구 영구삭제 아님 명시 | ✅ |
| API·DB 변경 | 없음 |
| tsc / build | EXIT=0 |

---

*'보관' → '리스트에서 제거'(행/일괄/상태/필터/확인문구). 확인문구에 영구삭제 아님+재확인 명시. 연결 가드 메시지 반영. 내부 archived/soft-delete 계약 불변. API·DB 무변경.*
