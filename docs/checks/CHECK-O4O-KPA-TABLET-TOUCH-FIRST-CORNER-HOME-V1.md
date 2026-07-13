# CHECK-O4O-KPA-TABLET-TOUCH-FIRST-CORNER-HOME-V1

> WO: `WO-O4O-KPA-TABLET-TOUCH-FIRST-CORNER-HOME-V1`
> 성격: TOUCH-FIRST 1단계 구현 — 첫 화면을 코너 카드 홈으로. UI only.
> 선행: `CHECK-O4O-KPA-TABLET-TOUCH-FIRST-CORNER-MANAGEMENT-DESIGN-V1`
> Date: 2026-07-13

---

## 0. 결론

`/store/commerce/tablet-displays` 의 **첫 화면을 "태블릿/기기 목록" → "코너 카드 홈"** 으로 전환했다. 사용자는 진입 시 기기 목록이 아니라 **코너 카드**를 보고 선택한다. 카드 선택 시 **기존 상세/편집기(2단 레이아웃)를 그대로 재사용**한다.

- 미선택 상태 = 코너 카드 그리드(1/2/3열 반응형). 카드 = 코너명·현재 화면 세트명·블록 수·연결 상태·[공개 화면 확인]·[관리](터치 44px).
- 선택 상태 = 기존 2단 상세(불변) + "코너 목록" 뒤로가기.
- 태블릿 연결/등록·Screen Set 선택·content_list 편집기·public runtime·API·DB **무변경**(후속 단계). typecheck 0.
- **브라우저 smoke Deferred**(관리 화면 /login·자동 로그인 금지) — WO §9 허용.

---

## 1. 변경 전 IA 문제
- 진입 시 **태블릿 목록**(LOCATION-FIRST 좌측 좁은 행 리스트)이 첫 작업 대상 → 기기-우선·마우스/좁은 행·터치 부적합.

## 2. 변경 후 코너 카드 홈 구조
```
[코너 화면 (N)]                         [+ 코너/태블릿 추가]  (보조 액션)
관리할 코너를 선택하세요…
┌─ 코너 카드 (grid 1/2/3열) ─────────────┐
│ 구강관리 코너                          │
│ 화면 세트: 구강관리 기본 화면 세트      │
│ 블록 4개 · ● 연결됨(활성)              │
│ [공개 화면 확인]      [관리]           │  ← min-h 44px
└───────────────────────────────────────┘
```
- **코너 = store_tablets(location||name)** — `cornerPrimary/cornerSecondary` 재사용.
- 카드 전체 클릭 + [관리] → `setSelectedTabletId(t.id)` → 기존 상세 진입.
- [공개 화면 확인] → `window.open(publicTabletUrl(t.id))` 새 탭(공개 뷰어). storeSlug 있을 때만 노출.
- 선택 시: 상단 "코너 목록"(ArrowLeft) → `setSelectedTabletId(null)` 로 홈 복귀.

## 3. 카드에 표시한 정보
| 항목 | 소스 |
|------|------|
| 코너명 | `cornerPrimary(t)`(location||name) + 보조(`cornerSecondary`) |
| 현재 화면 세트명 | `screenSetIndex[currentScreenSetId].name` (page-level `fetchScreenSets` 인덱스). 없으면 '적용됨'/'기본 화면' |
| 블록 수 | `screenSetIndex[…].blockCount` |
| 연결 상태 | `t.is_active` → ● 연결됨(활성) / ○ 비활성 |
| 공개 화면 확인 · 관리 | 버튼 |

## 4. 터치 기준 반영
- 주요 버튼 `min-h-[44px]`, 카드 전체 큰 터치 영역(hover 는 시각 보조만, 동작 의존 아님).
- 반응형 grid `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`. 텍스트 `truncate`(overflow 방지). 공개 URL 은 카드에 노출하지 않고 버튼 동작으로만(긴 문자열 밀림 없음).
- 태블릿 추가를 **보조 액션**으로 낮춤(상단 메인 강조 제거).

## 5. 변경 파일
```
services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx
```
- import `fetchScreenSets` · `screenSetIndex` state + effect · 코너 카드 홈 블록 · 상세 게이트(`selectedTabletId`) + 뒤로가기.

## 6. 기존 기능 불변 확인
- 코너 선택(`selectedTabletId`) → 기존 2단 상세/편집기(좌 사이드바·우 요약·displays·TabletScreenSetManager) **코드 미접촉**.
- 공개 URL 복사 / 미리보기 / Screen Set 편집기 / content_list 표시·편집 / dirty guard — **불변**.
- 등록 폼(showRegisterForm) / no-tablets empty state / error — 유지.

## 7. 이번 WO에서 안 한 것 (§6)
```
태블릿 연결/등록 플로우 개편 · Screen Set 카드형 선택 · content_list 편집기 개편
· DB migration · API · 운영 샘플 · public viewer · kiosk-core — 전부 없음.
```

## 8. typecheck / build
- web-kpa-society `tsc --noEmit`: **StoreTabletDisplaysPage 에러 0**. (KPA 페이지 → GP/KCos 무관.)

## 9. 브라우저 smoke — Deferred
- 배포: web deploy(bda645d7a) **success**.
- 관리 화면 `/store/commerce/tablet-displays` → **`/login` 리다이렉트(매장 세션 없음)**. WO §9: 자동 로그인 안 함 → **화면 smoke Deferred**.
- 대체 검증: typecheck 0 + 코드(코너 카드 홈 렌더/게이트/뒤로가기/카드 필드/터치 크기). 인증 세션에서 확인 권장:
  1. 첫 화면이 코너 카드 홈 · 구강/피부 코너 카드 표시
  2. 각 카드 현재 화면 세트명 · [공개 화면 확인] 버튼
  3. [관리]/카드 클릭 → 기존 상세 진입 · "코너 목록" 뒤로가기
  4. 모바일/태블릿 폭 1/2열 · 기존 편집기 불변 · console error 0

## 10. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 첫 화면 코너 카드 중심 | ✅ (코드) |
| 태블릿/기기 목록이 메인처럼 안 보임 | ✅ (홈=카드, 목록은 선택 후 사이드) |
| 구강/피부 코너 터치 카드 선택 | ✅ |
| 공개 화면 확인 카드에서 | ✅ |
| 기존 상세 편집기 진입 | ✅ (재사용) |
| 기존 태블릿 기능 불변 | ✅ |
| typecheck/build | ✅ |
| CHECK commit/push | ✅ |
| 화면 smoke | ⏸ Deferred(/login) |

## 11. 후속 WO
```
WO-O4O-KPA-TABLET-TOUCH-FIRST-TABLET-CONNECT-FLOW-V1   (코너 후 태블릿 연결/등록 재설계)
WO-O4O-KPA-TABLET-TOUCH-FIRST-SCREEN-SET-CARDS-V1
WO-O4O-KPA-TABLET-TOUCH-FIRST-CONTENT-LIST-EDITOR-V1
WO-O4O-KPA-TABLET-TOUCH-FIRST-FINAL-SMOKE-V1
```

---

*TOUCH-FIRST 1단계 · 첫 화면=코너 카드 홈(태블릿=store_tablets location||name, 화면세트명/블록수/연결상태/공개화면확인/관리, 터치 44px, 1/2/3열 반응형) · 카드 선택→기존 2단 상세 재사용+코너목록 뒤로가기 · 연결/세트/콘텐츠/runtime/API/DB 무변경 · typecheck 0 · 배포 success · 화면 smoke Deferred(/login).*
