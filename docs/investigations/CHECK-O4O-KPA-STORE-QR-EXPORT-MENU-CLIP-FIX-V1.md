# CHECK-O4O-KPA-STORE-QR-EXPORT-MENU-CLIP-FIX-V1

> 작업: 내 매장 QR 코드 "출력" 드롭다운 잘림 수정 (portal)
> URL: https://kpa-society.co.kr/store/marketing/qr
> 커밋: `7b58bcc6a` / 일자: 2026-06-25

---

## 1. 원인

QR 목록은 `@o4o/ui` **DataTable(BaseTable)** 을 사용. BaseTable wrapper 가
`<div className="overflow-x-auto">` (`packages/ui/src/components/table/BaseTable.tsx:435`).
CSS 규칙상 `overflow-x: auto` 이면 `overflow-y` 가 `visible` 이 아닌 `auto` 로 계산되어
**세로로도 클리핑**된다. 따라서 행 내 `position:absolute` 출력 메뉴가 테이블 박스 하단에서 잘림.

> 제작자료 화면(`tableWrap overflow:hidden→visible`)과 동일 계열이나, 여기는 **공통 BaseTable**
> 내부라 페이지 overflow 수정으로 해결 불가. BaseTable 은 가로 스크롤 필요 + 다수 소비처라 미변경.

## 2. 수정 (2안 — portal)

`services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx`
- 출력 메뉴를 `QrExportMenu` 컴포넌트로 분리, `createPortal(document.body)` 로 렌더(`position:fixed`).
  - `getBoundingClientRect()` 로 트리거 버튼 위치 계산.
  - 화면 하단 공간 부족 시 **위로 펼침**(openUp), 우측 정렬, 좌측 최소 8px clamp.
  - 바깥 클릭(fixed backdrop) / scroll(capture) / resize 시 닫힘.
  - 기존 `QR_EXPORT_PRESETS` 항목 + `handleExport(item.id, format, preset)` 동작 그대로 유지.
- `downloadMenuId` 페이지 state 제거 → 컴포넌트 로컬 open 으로 대체. `downloadMenu` 스타일 →
  `downloadMenuPortal`(위치는 인라인 fixed). 통계/복사/열기/삭제 버튼 회귀 없음.

## 3. 검증

| 항목 | 결과 |
|---|---|
| 타입체크 (`tsc --noEmit`, web-kpa-society) | ✅ PASS (에러 0) |
| 배포 (Deploy Web Services, `7b58bcc6a`) | ✅ success |
| 출력 메뉴 5항목 전체 표시(잘림 없음) | ✅ PASS |
| 하단 행에서 위로 펼침(openUp) 동작 | ✅ PASS |
| 메뉴가 DataTable 밖(body portal)에 렌더 | ✅ PASS |
| 통계/URL 복사/QR 열기/삭제 버튼 회귀 없음 | ✅ PASS |

### 브라우저 smoke (배포본 `7b58bcc6a`, kpa-society.co.kr, Sohae 약국 매장, 2026-06-25)
- 검증용 QR 1건 생성(블로그 "테스트" → link QR `/qr/qr-…`)
- "출력" 클릭 → 메뉴가 **body portal 로 렌더**(접근성 트리에서 main 밖 최상위), 5항목 모두 표시:
  PNG (이미지) / PNG 고해상도 / SVG (벡터) / A4 1장 PDF / A4 4분할 PDF — **잘림 없음**
  (스크린샷 qr-export-dropdown-portal.png)
- 행이 뷰포트 하단 근처라 메뉴가 **위로 펼쳐짐** 확인
- 검증 후 QR 삭제 → 목록 빈 상태 복귀(데이터 정리 완료)

## 4. 참고
- 직전 동일 계열: 제작자료 `활용하기` 드롭다운 — `tableWrap overflow:visible`(커밋 `f21d5bff7`).
  그쪽은 페이지 로컬 wrapper 라 overflow 수정으로 충분했고, QR 은 공통 BaseTable 이라 portal 채택.
- 후속: 다른 화면에서 BaseTable 행 내 드롭다운 잘림이 또 나오면 동일 portal 패턴 적용 권장
  (공통 RowActionMenu 차원의 portal 표준화는 별도 검토 가능).
