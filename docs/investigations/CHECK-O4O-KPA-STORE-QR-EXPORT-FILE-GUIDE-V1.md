# CHECK-O4O-KPA-STORE-QR-EXPORT-FILE-GUIDE-V1

> 작업: QR 출력 파일 선택 안내 모달 추가 + 출력 메뉴 문구 개선
> URL: https://kpa-society.co.kr/store/marketing/qr
> 커밋: `0ccd3f7a3` / 일자: 2026-06-25

---

## 1. 작업 요약

QR 출력 시 SVG/PNG/PDF 중 무엇을 받아야 할지 헷갈리지 않도록, 화면에서 바로 선택 기준을
볼 수 있는 보조 안내 모달을 추가. 출력 기능 자체는 그대로 두고 "판단 기준"만 제공(범위 최소).

### 변경 파일
- `services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx`
- `services/web-kpa-society/src/api/storeQr.ts`

### 변경 내용
1. **안내 버튼** — 헤더 "QR 활용 방법" 링크 옆에 보조 버튼 "파일 선택 안내"(`Info` 아이콘) 추가.
2. **안내 모달** — 제목 "QR 출력 파일은 이렇게 선택하세요". 상황별 추천 파일/이유 6건을 카드형으로
   표시(모바일에서도 표 깨짐 없음). 하단 강조 노트(SVG=크기 조절·출력소 / A4 PDF=바로 출력).
   - 배경 클릭 / 닫기 버튼으로 닫힘. `showExportGuide` state.
3. **출력 메뉴 문구 개선** — `QR_EXPORT_PRESETS.hint` 를 선택 기준이 드러나게 수정:
   - PNG (이미지) → 간단 삽입·공유
   - PNG 고해상도 → 문서·POP 편집
   - SVG (벡터) → 전문 출력소·크기 조절
   - A4 1장 PDF → 약국에서 바로 출력
   - A4 4분할 PDF → 잘라서 여러 곳에 부착

> 범위 외(후속 검토): QR 크기 직접 입력, cm 프리셋, 출력소 발주 — 반복 요청 발생 시 진행.

## 2. 검증

| 항목 | 결과 |
|---|---|
| 타입체크 (`tsc --noEmit`, web-kpa-society) | ✅ PASS (에러 0) |
| 배포 (Deploy Web Services, `0ccd3f7a3`) | ✅ success |

### 브라우저 smoke (배포본 `0ccd3f7a3`, kpa-society.co.kr, Sohae 약국 매장, 2026-06-25)
| 항목 | 결과 |
|---|---|
| "파일 선택 안내" 버튼 노출(QR 활용 방법 옆) | ✅ |
| 클릭 시 모달 표시 — 제목 + 6개 상황별 추천 카드 + 하단 강조 노트 | ✅ (스크린샷 qr-export-guide-modal.png) |
| 추천 파일 배지(SVG/PNG 고해상도/PNG/A4 PDF/A4 4분할) 명확 표시 | ✅ |
| 닫기 버튼으로 닫힘 | ✅ |
| QR 만들기 / HUB 가져오기 / 출력 드롭다운 기존 동작 무영향 | ✅ |

> 출력 메뉴 hint 문구 개선은 직전 portal 수정(`7b58bcc6a`)과 동일 메뉴에 반영됨 — 본 배포로 함께 노출.
> 배경 클릭 닫힘은 overlay onClick 으로 구현(닫기 버튼으로 대표 검증).

## 3. 산출물
- 코드: `0ccd3f7a3`
- 본 CHECK 문서
