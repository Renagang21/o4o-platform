# CHECK-O4O-KPA-STORE-PRODUCTION-MATERIALS-ROWMENU-CLIP-FIX-V1

> 작업: 매장 제작 자료 "활용하기" 드롭다운 잘림 수정
> URL: https://kpa-society.co.kr/store/library/production-materials
> 커밋: `f21d5bff7` / 일자: 2026-06-25

---

## 1. 원인

`StoreProductionMaterialsPage.tsx` 의 행 내 "활용하기" 드롭다운(`RowUseMenu`)은
`position:absolute; top:calc(100% + 4px)` 로 행 아래에 펼쳐지는데,
바깥 `tableWrap` 이 `overflow:'hidden'` 이라 wrapper 박스를 벗어난 메뉴 하단이 잘림.
특히 테이블 하단에 가까운 행에서 POP/QR/블로그/사이니지/원본 보기 항목 일부가 가려짐.

## 2. 수정 (1안 — 최소)

`services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx`
- `tableWrap.overflow`: `'hidden'` → `'visible'` (드롭다운이 wrapper 밖으로 펼쳐져도 잘리지 않음).
- 코너 아티팩트 보정:
  - `tableHead` 상단 `borderTopLeftRadius/RightRadius: 7px` (헤더 사각 코너 노출 방지).
  - 마지막 행(`isLast`) 하단 `borderBottomLeftRadius/RightRadius: 7px` + `borderBottom: none`
    (둥근 테두리와 정렬, 마지막 행 이중 보더 제거).

> 2안(createPortal)은 이번 단일 페이지 소규모 드롭다운에는 과함 — 1안으로 처리.
> 후속 모바일/스크롤 컨테이너에서 재발 시 포털 방식 검토.

## 3. 검증

| 항목 | 결과 |
|---|---|
| 타입체크 (`tsc --noEmit`, web-kpa-society) | ✅ PASS (에러 0) |
| 배포 (Deploy Web Services, `f21d5bff7`) | ✅ success |
| 활용하기 드롭다운 전체 항목 표시(잘림 없음) | ⏳ 브라우저 smoke (프로필 점유로 보류 — 사용자 활성 세션) |
| 테이블 border radius / 헤더 / 행 구분선 시각 회귀 없음 | ⏳ 동일 |
| 하단 가까운 행에서도 메뉴 보임 | ⏳ 동일 |

> 자동 smoke 는 Playwright 전용 Chrome 프로필이 점유 중(사용자가 해당 페이지 열람 중으로 추정)이라
> 강제 종료를 피해 보류. 사용자 화면에서 hard-refresh 후 즉시 확인 가능. 브라우저 해제 시 자동 smoke 수행.
