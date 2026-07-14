# CHECK-O4O-KPA-TABLET-TOUCH-FIRST-CONTENT-LIST-EDITOR-V1

> WO: `WO-O4O-KPA-TABLET-TOUCH-FIRST-CONTENT-LIST-EDITOR-V1`
> 성격: TOUCH-FIRST 4단계 — content_list 편집을 터치 카드로 정비. UI only.
> 선행: `CHECK-O4O-KPA-TABLET-TOUCH-FIRST-SCREEN-SET-CARDS-V1`
> Date: 2026-07-14

---

## 0. 결론

이미 구현된 `content_list` 편집(ContentListEditor + ContentPickerModal)을 **현장 터치 카드 방식**으로 정비했다. config 계약/sourceType/override/dedup/dirty guard/public runtime 은 그대로 두고 **편집 UX 만** 바꿨다.

- 콘텐츠 항목 = 카드(순서 번호·제목·출처·표시상태 + 위로/아래로/표시·숨김/내용 설정 44px). override·제거는 '내용 설정' 확장에.
- 콘텐츠 추가 모달 = 모바일 풀스크린·44px 탭·카드 전체 토글·'이미 추가됨'·'선택한 콘텐츠 추가'.
- API/DB/migration/content_list schema/public runtime/kiosk-core/ContentRenderer/샘플 무변경. typecheck 0. 배포 success. **공개 viewer 회귀 없음**. 관리 화면 smoke Deferred(/login).

---

## 1. 기존 편집 구조 조사 (§17, read-only)
| 항목 | 사실 |
|------|------|
| 위치 | `TabletScreenSetManager.tsx` 내 `ContentListEditor` / `ContentPickerModal`(선행 PICKER-UI WO 산출) |
| config item | `{sourceType, (o4o)masterId+language / (store)contentId, displayTitle, displaySummary, visible, sortOrder}` — **제목은 config 에 없음** |
| 정렬 | sortOrder = index*10 재부여(위/아래) |
| 표시 | `visible` boolean |
| override | `displayTitle`/`displaySummary`(null=원본) |
| dedup | key `o4o:{master}:{lang}` / `store:{id}` |
| 저장/guard | 상위 `saveScreenSetBlocks` + `confirmDiscard`(blocksDirty=normalizeBlocks 비교) |
| drag lib | 없음 → 위/아래 버튼 유지(신규 dnd 도입 안 함, §10) |

## 2. 변경 전 문제 → 후
```
전: 좁은 행(작은 체크박스 '표시', 작은 chevron/X, id 라벨 "상품ID xxxx…", override 입력 상시 노출)
후: 카드(순번·제목·출처·상태 + 큰 버튼: 위로/아래로/표시·숨김/내용 설정, override·제거는 접힘)
```

## 3. 콘텐츠 카드 구조 (§6)
- 순서 번호(1,2,3) · **제목**(displayTitle → 추가 시 캡처한 세션 힌트 → 출처 중립 라벨; 내부 id 미노출) · 출처 라벨(O4O 표준 설명서 / 매장 제작 콘텐츠) · **상태**(● 고객 화면에 표시 / ○ 현재 숨김).
- 액션(44px): `위로`/`아래로`(끝단 disabled) · `표시하기`/`숨기기`(현재 상태에 따라) · `내용 설정`(확장).

## 4. 표시 ↔ 제거 구분 (§6.4·§7.4)
- **숨김**(표시/숨기기 토글) = 화면 세트엔 유지, 고객 화면 미표시(visible=false).
- **제거**(내용 설정 안 '이 화면 세트에서 제거', confirm "원본 콘텐츠는 삭제되지 않습니다") = 이 content_list 에서만 제외. 원본/다른 세트 무영향. 즉시 제거(기존 방식), API/상태 확장 없음.

## 5. 정렬 (§10)
- **위로/아래로 큰 버튼**(44px)만 사용. drag-and-drop 미도입(안정적 dnd 의존성 없음 → §10 조건 미충족). 첫/마지막 disabled.

## 6. 세부 설정(내용 설정) (§7·§13)
- `화면에 표시할 제목`(비우면 원래 제목), `화면에 표시할 짧은 설명`(비우면 원래 요약) — displayTitle/displaySummary override.
- 안내: "여기서 바꾼 제목·설명은 현재 화면 세트에만 적용되며, 원본 콘텐츠는 변경되지 않습니다."(헤더) + 제거 하단 안내.
- **원본 수정/복사/새 콘텐츠 작성/AI 생성 미구현**(§13 준수).

## 7. ContentPickerModal 정비 (§9)
- 모바일 **풀스크린**(`h-full sm:h-auto`, `rounded-none sm:rounded-2xl`, `items-stretch sm:items-center`), 데스크톱 중앙 대형.
- 출처 탭(O4O 표준 설명서 / 매장 제작 콘텐츠) **44px**, 새 출처 미추가.
- 검색(엔터/버튼) + empty("검색 결과가 없습니다…").
- 결과 = **터치 카드**(카드 전체 토글, ✓ 표시), 제목·요약·출처 + **'이미 추가됨'**(existingKeys 기반, 선택 disabled).
- 하단 고정 `N개 선택됨` + `선택한 콘텐츠 추가`(0개 disabled) + `취소`.
- onAdd → 선택 item + **제목 힌트 맵**(세션 표시용, config 미변경). 기존 **dedup 유지**.

## 8. 빈 상태 (§11)
- content_list 0개 → "아직 코너 콘텐츠가 없습니다. … 추가해 주세요." + 큰 [코너 콘텐츠 추가]. product_list 0건과 의미 분리.

## 9. dirty guard / 저장 (§12)
- 추가/순서/표시·숨김/override/제거 모두 `onChange` → 상위 `blocks` state → **기존 blocksDirty 반영**. 저장/guard(confirmDiscard/APPLY_DIRTY_MSG) **재사용**, 자동 저장 없음, 새 우회 없음.

## 10. 예외 처리 (§16)
- 제목: displayTitle → 세션 힌트 → 출처 중립 라벨(내부 id 미노출).
- 요약 없음: 표시 안 함(허위 문구 없음). 출처 없음: 중립 라벨.
- 원본 삭제/보관된 항목: 현재 config 로는 상태 미확인(추가 API 불필요 판단) → 자동 제거/교체 안 함(§16.4 취지 준수). blockCount/제목 resolve 위한 backend 확장 안 함.
- 기존 config 중복: 자동 정리 안 함(발견 시 CHECK 기록) — 이번 샘플엔 중복 없음.

## 11. 변경 파일 / 불변
```
services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx  (UI only)
```
- content_list config 계약·sourceType·정렬/표시/override 필드·dedup·Screen Set/Block 저장 API·template_key·public `/tablet/screen` resolve·viewer card·ContentRenderer 상세 모달 — **코드 미접촉**. migration/샘플 0.

## 12. typecheck / 배포 / 회귀
- web-kpa-society `tsc --noEmit`: **TabletScreenSetManager 에러 0**(KPA 전용 → GP/KCos 무관).
- web deploy(3d94371a7) **success**.
- **공개 viewer 회귀 없음(read-only)**: 배포 전/후 `/tablet/screen` 200, content_list 카드 **구강 5 / 피부 4 불변**. 운영 샘플 무변경.

## 13. 브라우저 smoke — Deferred (§18.5)
- 관리 화면 `/store/commerce/tablet-displays` → **`/login` 리다이렉트(세션 없음)**. 자동 로그인 금지 → **편집기 화면 smoke Deferred**.
- 대체: typecheck 0 + 코드(카드/상태/내용설정/제거 confirm/모달 카드·이미 추가됨·풀스크린/44px) + 배포 + 공개 viewer 회귀 없음. 인증 세션 확인 항목:
  1. 구강관리 편집 → content_list 5 카드(순번·제목·출처·상태)
  2. 위/아래 이동·표시/숨김·내용 설정(override)·제거 confirm
  3. 추가 모달: 탭·검색·카드 선택·이미 추가됨·다중·dedup·선택한 콘텐츠 추가
  4. dirty guard 전환 경고 · 저장 후 유지
  5. 모바일 풀스크린/44px · console error 0
  - 운영 샘플 값 변경 없이 저장 직전까지만.

## 14. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| content_list 터치 카드 목록 | ✅ |
| 콘텐츠 추가 44px 명확 | ✅ |
| 순서=번호+카드 배열 | ✅ |
| 위/아래 터치 | ✅ |
| 표시 중/숨김 명확 구분 | ✅ |
| 숨김≠제거 | ✅ (제거=confirm+원본 유지 안내) |
| override 내용 설정으로 정리 | ✅ |
| 원본 불변 안내 | ✅ |
| picker 탭·검색·결과 터치 친화 | ✅ |
| 다중 선택·dedup 유지 | ✅ |
| dirty guard 유지 | ✅ |
| API/DB/config/runtime/샘플 0 | ✅ |
| typecheck/배포 | ✅ |
| 공개 viewer 회귀 없음 | ✅ |
| 화면 smoke | ⏸ Deferred(/login) |
| CHECK commit/push | ✅ |

## 15. 후속 WO
```
5. WO-O4O-KPA-TABLET-TOUCH-FIRST-FINAL-SMOKE-V1  (전체 흐름 인증 세션 검증)
(선택) CLIENT-QR-COMPONENT / MAKE-AND-RUN-SEPARATION-DESIGN
```

---

*TOUCH-FIRST 4단계 · content_list 편집 터치 카드(순번·제목(override→세션힌트→출처라벨)·출처·표시상태 + 위/아래/표시·숨김/내용 설정 44px, override·제거 확장, 제거=confirm 원본유지) · picker 모달 풀스크린·카드토글·이미 추가됨·선택한 콘텐츠 추가(dedup·제목힌트) · config/API/runtime/샘플 0 · typecheck 0·배포 success·공개 viewer 회귀 없음·화면 smoke Deferred(/login).*
