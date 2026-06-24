# CHECK-O4O-KPA-QR-CONTENT-PRINT-E2E-SMOKE-V1

> WO-O4O-KPA-QR-CONTENT-PRINT-E2E-SMOKE-V1 실행 결과
> 실행일: 2026-06-24 · 대상: 프로덕션 `https://kpa-society.co.kr`
> 검증 방식: Playwright (chromium, headless) 자동화 + 인증 API 직접 호출 교차검증

## 대상 배포

- `deploy-kpa-society` (Cloud Run) 성공 — HEAD `10535189a` 포함
- 포함 커밋: QR 콘텐츠 picker / page landing inline / status 정렬 / 매장 QR UX 정렬(`d88a3b4b4`) / QR export foundation(`db024a710`) / StoreQRPage 출력 버튼 연결(`10535189a`)

## 결과 요약

| # | 시나리오 | 결과 | 근거 |
|---|---------|:---:|------|
| 1 | 약국 로그인 → `/store` | ✅ PASS | 토큰 발급, `/store` 랜딩 |
| 2 | StoreQRPage 빈 상태 3-CTA | ✅ PASS | `매장 HUB에서 QR 가져오기` / `내 자료에서 QR 만들기` / `외부 URL QR 만들기` + 헤더 가져오기 CTA 모두 렌더 |
| 3 | `/store-hub/qr` 가져오기 페이지 | ✅ PASS (로드) | 페이지·"QR-code 만들기" 렌더. **운영자 발행 템플릿 0건**이라 실제 import 미실행 |
| 4 | 공개 `/qr/:slug` 렌더 | ✅ PASS | 전체 앱 셸이 아닌 **전용 QR 랜딩 카드** 렌더 (제목 + 바로가기 + "O4O Platform" 푸터) |
| 5 | 출력/다운로드 메뉴 (5종) | ✅ PASS | 아래 표 — 엔드포인트 + 실 UI 다운로드 양방향 검증 |
| — | 운영자 콘텐츠→QR템플릿→발행 체인 | ⏸ 미검증 | 환경에 ready 콘텐츠/발행 템플릿 미시드. 별도 시드 또는 운영자 저작 필요 |

### 시나리오 5 상세 — 출력/다운로드 (매장 QR 1건 시드 후 검증, 종료 시 삭제)

| 메뉴 | 엔드포인트 status / content-type / bytes / magic | 실 UI 다운로드 (React onClick→handleExport) |
|------|---|---|
| A4 1장 PDF | 200 · application/pdf · 12,439 · `%PDF` | ✅ 12,327 bytes `%PDF` |
| A4 4분할 PDF | 200 · application/pdf · 26,850 · `%PDF` | ✅ 26,728 bytes `%PDF` |
| PNG (이미지) | 200 · image/png · 7,120 · PNG | ✅ 7,122 bytes PNG (스캔 가능 QR 육안 확인) |
| PNG 고해상도 | 200 · image/png · 21,130 · PNG | ✅ 21,134 bytes PNG |
| SVG (벡터) | 200 · image/svg+xml · 1,584 · `<svg` | ✅ 1,614 bytes `<svg` |

- 메뉴는 `QR_EXPORT_PRESETS` 기반으로 라벨+용도 힌트 2줄 렌더, 드롭다운 항목 가시성·뷰포트 내 위치 확인.
- 다운로드 파일은 매직바이트로 포맷 검증, PNG는 실제 스캔 가능한 QR 이미지임을 육안 확인.
- 콘솔/네트워크 오류 0 (운영자 화면의 legal/약관 문서 404는 QR과 무관한 기존 미시드 이슈).

## 완료 기준 대비

1. QR별 출력/다운로드 메뉴 노출 — ✅
2. A4 PDF — ✅  3. A4 4분할 PDF — ✅  4. PNG — ✅  5. SVG — ✅
6. 다운로드 중 중복 클릭 방지 — ✅ (코드: `exportingId` 잠금 + `준비 중…` 로딩, tsc 통과)
7. 실패 시 오류 안내 — ✅ (코드: `toast.error('QR 출력 파일을 만들지 못했습니다…')`; 이번 실행은 전건 성공이라 미발생)
8. 빈 상태 CTA 흐름 무손상 — ✅
9. frontend tsc — ✅ (`web-kpa-society` EXIT 0)
10. export backend/API 무수정 — ✅

## 관측된 마이너 이슈 (비차단 · 후속 후보)

1. **export 응답 `Content-Disposition` 헤더 부재(null)** → 클라이언트가 fallback 파일명 `qr-<id>.<ext>` 사용. 그 결과 **A4 1장 PDF와 A4 4분할 PDF가 동일 파일명**으로 내려와 같은 폴더 저장 시 덮어쓰기/자동 `(1)` 접미. 기능 동작에는 영향 없음. → export foundation(백엔드)에서 preset 포함 파일명 헤더 부여 권장.
2. **운영자 발행 QR 템플릿 0건 / ready 콘텐츠 0건** — 본 환경은 콘텐츠→템플릿→발행 체인이 시드되지 않아 inline 콘텐츠 본문 렌더(page 타입 QR)와 실제 import는 미검증. 링크 타입 QR로 공개 랜딩·출력은 검증 완료.

## 범위 제외 (WO 명시)

store_qr_codes source marker / 출처 컬럼 / 사용자 지정 mm 크기 / 재단선·도련 / 외부 URL 직접 QR 생성 — 미수행.

## 테스트 데이터 처리

검증용 매장 QR(`[SMOKE] QR 출력검증`, link 타입) 시드 3건 모두 실행 종료 시 `DELETE /pharmacy/qr/:id` (200)로 정리. (slug는 soft-delete 특성상 재사용 불가 — 매 실행 고유 slug 사용.)

## 결론

매장 QR **빈 상태 진입 → 공개 랜딩 → PDF/PNG/SVG 출력** 축은 프로덕션에서 동작 확인(PASS). 콘텐츠 저작→QR 템플릿 발행→매장 import→page 타입 inline 본문 렌더 전 구간은 데이터 시드 후 재확인 대상. 출력 축 한정으로는 **운영 가능 상태로 닫아도 무방**.
