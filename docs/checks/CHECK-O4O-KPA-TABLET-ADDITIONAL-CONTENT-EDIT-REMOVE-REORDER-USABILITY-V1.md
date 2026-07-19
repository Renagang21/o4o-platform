# CHECK-O4O-KPA-TABLET-ADDITIONAL-CONTENT-EDIT-REMOVE-REORDER-USABILITY-V1

> WO: 태블릿 제작기 `추가 정보` 단계 항목의 수정·삭제·순서변경을 사용자가 알아보기 쉽게 정비.
> 성격: **UI 명확화** (기존 content_list 편집 기능 재사용, 저장 계약·persistence 무변경). API·DB·migration 없음.

---

## 1. 조사 (기존 구현 상태)

[TabletScreenSetManager.tsx](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx) `ContentListEditor`:
- 이미 존재: `move(i,dir)`(순서변경, reindex sortOrder=idx*10), `remove(i)`(확인 후 content_list 에서만 제거+reindex), `upd(i,patch)`(displayTitle/displaySummary/visible 수정).
- 문제: 액션 행이 `위로 | 아래로 | 숨기기 | **내용 설정**` 이고, **삭제 버튼(`이 화면 세트에서 제거`)은 '내용 설정' 펼침 패널 안에 숨어** 있었음. `내용 설정`·`이 화면 세트에서 제거` 표현이 모호/장황.
- persistence: `ContentListItem.sortOrder/visible/displayTitle/displaySummary` 는 content_list block config 로 저장되고, 공개 resolve([resolveContentListItems](../../apps/api-server/src/routes/platform/store-public/store-public-tablet-content-resolve.ts))가 **visible 필터 + sortOrder 정렬 + display 오버라이드**를 적용 → 미리보기·저장·재진입·공개 태블릿·QR 에 이미 일관 반영. (신규 persistence 불필요.)

---

## 2. 구현 (UI 정비, 로직 재사용)

### 변경 파일
- [TabletScreenSetManager.tsx](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx) `ContentListEditor` 만.

### 변경
1. **수정**: `내용 설정` → **`수정`**. 클릭 시 카드 아래 제목·짧은 설명 입력 패널 토글(열림 시 버튼 강조). 수정값=현재 Screen Set 표시값(displayTitle/displaySummary)만, **원본(O4O 표준 설명서/가져온 콘텐츠/매장 제작 원본) 불변**. 패널에 "이 화면 세트에만 적용, 원본 불변" 안내.
2. **삭제**: 펼침 패널 안의 `이 화면 세트에서 제거` → **최상위 액션 행의 `삭제`(위험색 red)**. 확인 문구 WO 문안으로: `이 추가 정보를 현재 태블릿 콘텐츠에서 삭제하시겠습니까? 원본 콘텐츠는 삭제되지 않습니다.` 확인 시 현재 content_list 에서만 제거(원본·ProductMaster·설명서·Resource 불변) + 순번 재정렬.
3. **순서 변경**: `위로`/`아래로` 유지(기존 move). 첫 항목 위로 비활성, 마지막 아래로 비활성, 1개면 둘 다 비활성.
4. **표시·숨김**: `숨기기/표시하기` 유지(삭제와 구분 — 숨김은 세트에 남고 고객 화면 미표시).

### 버튼 순서 (UI 원칙)
`위로 | 아래로 | 숨기기/표시하기 | 수정 | 삭제` (삭제만 위험색, 나머지 중립).

---

## 3. 제외 (WO 준수)
원본 O4O 설명서 수정 · 원본 콘텐츠/ProductMaster 삭제 · 새 편집기 · DB migration · drag-and-drop 신규 · 보호 샘플 변경 — 안 함.

---

## 4. 검증
| 항목 | 결과 |
|------|------|
| web typecheck | ✅ `tsc --noEmit` EXIT 0 |
| web production build | ✅ EXIT 0 (14.43s) |
| 버튼 정비(수정/삭제/순서) 라이브 스모크 | ✅ **PASS** (2026-07-19, 배포 후 kpa-society.co.kr). 제작기 4단계에 코푸시럽에스 3개 추가 후: 버튼 순서 **위로\|아래로\|숨기기\|수정\|삭제** 확인, 첫 위로·마지막 아래로 disabled·중간 양쪽 활성. `아래로`로 순서변경(번호 재정렬). `수정` → 제목 입력 패널 열림(버튼 active), "테스트제목-A" 입력 시 카드 제목 즉시 반영. `숨기기` → "○ 현재 숨김"+`표시하기` 토글, **미리보기에서 숨긴 항목 제외**(3개 중 2개만 코너 콘텐츠에 표시). `삭제` → 확인 다이얼로그(정확한 문안) → accept → 개수 3→2. console error 0. |
| 저장/재진입/공개 순서·visible | ✅ 계약 재사용(무변경) — `sortOrder`/`visible`/`displayTitle`/`displaySummary` 는 이 WO 이전부터 content_list 로 저장되고 [resolveContentListItems](../../apps/api-server/src/routes/platform/store-public/store-public-tablet-content-resolve.ts)가 정렬·필터·오버라이드 적용(미리보기=서버 resolve 로 이미 반영 확인). 본 WO 는 버튼 표현/배치만 변경 → persistence 회귀 위험 없음. (prod 테스트 세트 생성은 불필요 write 회피 위해 미실행.) |

---

## 5. 산출물
- 변경 파일 1 + 본 CHECK. API·DB write·migration 없음. persistence 재사용.
- commit: (아래 해시) / push 후 web 배포.
