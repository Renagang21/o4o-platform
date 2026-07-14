# CHECK-O4O-KPA-TABLET-TOUCH-FIRST-SCREEN-SET-CARDS-V1

> WO: `WO-O4O-KPA-TABLET-TOUCH-FIRST-SCREEN-SET-CARDS-V1`
> 성격: TOUCH-FIRST 3단계 — Screen Set 목록을 카드형(비교·선택·적용)으로. UI only.
> 선행: `CHECK-O4O-KPA-TABLET-TOUCH-FIRST-TABLET-CONNECT-FLOW-V1`
> Date: 2026-07-14

---

## 0. 결론

`TabletScreenSetManager` 의 화면 세트 목록(좁은 divide-y 행)을 **"현재 사용 중 카드 + 다른 화면 세트 카드 그리드"** 로 정비했다. Screen Set 데이터/API/편집기/dirty guard 는 그대로 유지하고 **UI 배치·선택 동선만** 바꿨다.

- 현재 적용 세트를 **가장 먼저**(현재 사용 중 카드) 표시. 나머지는 카드 그리드(이름·상태·템플릿명·블록 수 + 편집/이 화면 사용).
- **편집 ≠ 적용** 분리: 카드 클릭/편집 = dirty guard 통과 후 편집기, **카드 클릭으로 즉시 적용 안 함**. 적용은 '이 화면 사용'.
- 현재 카드엔 '이 화면 사용' 미표시(대신 편집 + 적용 해제). 보관은 작은 보조로 낮춤.
- API/DB/migration/public runtime/kiosk-core/content_list/샘플 무변경. typecheck 0. 배포 success. **라이브 smoke Deferred(/login)**.

---

## 1. 현재 Screen Set 관리 구조 조사 (§8, read-only)
| 항목 | 사실 |
|------|------|
| 목록 조회 | `TabletScreenSetManager.reload()` → `fetchScreenSets()` (org 전체) 를 `tabletId===this||null` 필터 → `sets` |
| 현재 적용 식별 | prop `currentScreenSetId`; `currentSet = sets.find(id===current)` |
| 갱신 | `handleApply`/`handleClear` → `applyCurrentScreenSet`/`clearCurrentScreenSet` + `onCurrentChange` |
| 생성 | `handleCreate` → `createScreenSet` → `reload` → **openEdit(자동선택)**. 자동 적용 없음 |
| dirty guard | `confirmDiscard()` (isDirty 시 confirm) — openEdit/create/apply/close/coner 전환 진입점에서 호출 |
| template 표시명 | `templateLabel(key)` (TEMPLATE_OPTIONS) — product_focus→상품 집중형 등, fallback=기본 코너 안내형 |
| blockCount | ScreenSet.blockCount (목록 응답 제공) |
| 미적용 preview | **미지원**(preview 는 페이지 connect·run 카드가 현재 적용본만) |

## 2. 변경 전 → 후 동선
```
전: "이 코너에 적용 중: <이름>" 한 줄 + [적용 해제] · 세트 목록(divide-y 행: 이름/상태·템플릿·블록 + 적용/편집/보관)
후: [현재 사용 중] 카드(이름·템플릿·블록 + 편집·적용 해제) · [다른 화면 세트] 카드 그리드(편집·이 화면 사용) · [새 화면 세트 만들기]
```

## 3. 카드 표시 정보
- 현재 사용 중 카드: 배지 '현재 사용 중' + 이름 + `templateLabel · 블록 N개` + [편집] + [적용 해제].
- 다른 세트 카드: 이름(+재사용 배지) + `상태 · templateLabel · 블록 N개` + [편집] [이 화면 사용] + (작은)보관.
- 기술 키/UUID/tabletId/config/전체 URL/블록 상세 **미표시**(§6.8).

## 4. 편집 ↔ 적용 분리 (§3.3·§6.3·§6.4)
- 카드 클릭 = `confirmDiscard() → openEdit(id)` (편집 진입, **적용 아님**).
- [편집] = 동일(stopPropagation). [이 화면 사용] = `handleApply(set)` (기존 apply 계약, APPLY_DIRTY_MSG guard 포함).
- 현재 적용 카드엔 '이 화면 사용' 없음(이미 적용). apply 성공 → onCurrentChange/reload 로 현재 카드 갱신 + 이전 적용본은 '다른 화면 세트'로 이동(파생 재계산).

## 5. dirty guard 보호 확인 (§9)
- 카드 진입/생성/적용/해제 모두 **기존 confirmDiscard/APPLY_DIRTY_MSG 재사용**. 새 우회 경로 없음.
- 카드 클릭·편집 버튼 → confirmDiscard 통과 후에만 openEdit. 적용 → handleApply 내부 APPLY_DIRTY_MSG.

## 6. 예외 처리 (§12)
| 상황 | 처리 |
|------|------|
| 현재 적용 세트 없음 | 현재 카드에 "현재 적용된 화면 세트가 없습니다. 아래 저장된 화면 세트를 선택해 적용해 주세요." |
| 현재 적용 ID 목록에 없음(currentScreenSetId 있으나 currentSet null) | "현재 화면 세트 정보를 불러오지 못했습니다. 아래에서 다른 화면 세트를 선택해 적용해 주세요." (자동 보정/DB write 없음) |
| 세트 0건 | "아직 화면 세트가 없습니다 … [첫 화면 세트 만들기]" |
| template_key 없음 | `templateLabel` fallback(기본 코너 안내형) |
| blockCount 없음 | `?? 0` (허위 상태 없음) |
| apply 실패 | 기존 handleApply catch 토스트 |

## 7. 변경 파일
```
services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx  (UI only)
```
- `otherSets` 파생 · 현재 적용 행 → 현재 사용 중 카드 · 세트 목록 → 카드 그리드 + 새 세트 만들기 버튼.

## 8. 미리보기 (§6.5)
- 미적용 세트의 별도 preview 미지원 → **카드에 미리보기 버튼 미노출**(가짜 URL 안 만듦). 현재 적용본 미리보기는 상위 태블릿 연결·실행 카드(2단계)에서 제공.

## 9. 기존 API/DB/runtime 무변경
- Screen Set/Block API·계약·template_key 종류·public `/tablet/screen`·kiosk-core·content_list 편집기(ContentListEditor/picker)·삭제/해제 정책 — **코드 미접촉**. migration 0.

## 10. typecheck / 배포
- web-kpa-society `tsc --noEmit`: **TabletScreenSetManager 에러 0**(KPA 전용 → GP/KCos 무관).
- web deploy(3612f210b) **success**.

## 11. 브라우저 smoke — Deferred (§13.4)
- 관리 화면 `/store/commerce/tablet-displays` → **`/login` 리다이렉트(세션 없음)**. 자동 로그인 금지 → **화면 smoke Deferred**.
- 대체 검증: typecheck 0 + 코드(현재/다른 카드·편집≠적용·dirty guard·예외·터치 44px·1/2열). 인증 세션 확인 항목:
  1. 코너 선택 → 화면 구성에 '현재 사용 중' 카드(이름·템플릿·블록)
  2. 다른 화면 세트 카드 그리드(상태·템플릿·블록) + [편집][이 화면 사용]
  3. 카드 클릭/편집 → 기존 편집기, dirty 상태 전환 guard
  4. 이 화면 사용 → 현재 카드 갱신, 이전 적용본이 다른 세트로 이동
  5. 새 화면 세트 만들기 → 자동 선택·편집, 자동 적용 안 됨
  6. 모바일 1열/태블릿 2열 · console error 0
  - 운영 샘플(구강/피부) read-only 확인만.

## 12. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 현재 적용 세트 최우선 표시 | ✅ |
| 다른 세트 카드 표시 | ✅ |
| 카드에 이름·템플릿·블록·상태 | ✅ |
| 편집/적용 분리 | ✅ |
| 카드 클릭 즉시 적용 안 함 | ✅ |
| 현재 세트에 적용 버튼 없음 | ✅ |
| 새 세트 만들기 큰 터치 | ✅ |
| TabletScreenSetManager 재사용 | ✅ |
| dirty guard 유지 | ✅ |
| content_list 편집 불변 | ✅ |
| API/DB/runtime/샘플 0 | ✅ |
| typecheck/배포 | ✅ |
| 화면 smoke | ⏸ Deferred(/login) |
| CHECK commit/push | ✅ |

## 13. 후속 WO
```
4. WO-O4O-KPA-TABLET-TOUCH-FIRST-CONTENT-LIST-EDITOR-V1
5. WO-O4O-KPA-TABLET-TOUCH-FIRST-FINAL-SMOKE-V1
(선택) CLIENT-QR-COMPONENT / MAKE-AND-RUN-SEPARATION-DESIGN
```

---

*TOUCH-FIRST 3단계 · Screen Set 목록→카드(현재 사용 중 카드 우선 + 다른 화면 세트 카드 그리드) · 편집≠적용(카드 클릭=편집, 이 화면 사용=적용, dirty guard 재사용) · 예외(현재없음/불일치/0건/blockCount) · 미적용 preview 미노출 · API/DB/runtime/content_list/샘플 0 · typecheck 0·배포 success·라이브 smoke Deferred(/login).*
