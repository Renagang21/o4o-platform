# CHECK-HOTFIX-O4O-QR-PUBLIC-URL-SERVICE-DOMAIN-FIRST-V1

> 작업: QR-code 공개 URL 서비스별 도메인 hotfix (o4o.kr 장애)
> 커밋: `9cd443e9c` / 일자: 2026-06-25

---

## 1. 원인

`apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts`
- (구) `const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'o4o.kr'` (전역, 서비스 무관).
- QR 이미지/PDF payload URL 4곳에서 `https://${PUBLIC_DOMAIN}/qr/${slug}` 사용:
  image(line 443) / export(495) / print(579) / flyer(670).
- 운영 API 서버에 `PUBLIC_DOMAIN` 미설정 → fallback `o4o.kr` 가 QR 이미지에 박혀
  스캔 시 `https://o4o.kr/qr/:slug` 로 이동(접속 불가).
- 화면 표시/복사/열기(프론트)는 `window.location.origin` 기반이라 정상이었고,
  **출력물(이미지/PDF) 내부 payload 만** 잘못된 도메인이었음.

## 2. 수정 (서비스별 canonical 도메인)

- `qrPublicOrigin(serviceKey)` 신설 — service-catalog(SSOT) 기반:
  - `kpa → kpa-society.co.kr`, `glycopharm → glycopharm.co.kr`, `cosmetics → k-cosmetics.site`
  - 매핑: `QR_SERVICE_TO_CATALOG_KEY`(StoreOwnerServiceKey → catalog key, store-owner.utils 와 동일 의미).
  - 카탈로그 누락/서비스 미상 시 `kpa-society.co.kr` 안전 폴백. `o4o.kr` 전역 fallback 제거.
- image/export/print/flyer 4곳 모두 `${qrPublicOrigin(serviceKey)}/qr/${slug}` 로 교체.
- DB 변경 없음(`store_qr_codes` 는 slug 만 저장, URL 은 export 시점 생성).

## 3. 기존 데이터 영향

| 저장 형태 | 조치 |
|---|---|
| `store_qr_codes.slug` (slug만) | ✅ DB 보정 불필요 — 코드 수정 후 재다운로드 시 정상 도메인 |
| 이미 다운로드한 PNG/SVG/PDF | ⚠️ 이미지에 o4o.kr 이 박혀 있으므로 **재다운로드 필요** |

> link 타입의 `landingTargetId`(블로그/다국어 URL 등)는 별개로 정상 저장되어 있었고, 본 수정과 무관.

## 4. 검증

| 항목 | 결과 |
|---|---|
| 타입체크 (api-server, store-qr-landing/service-catalog) | ✅ PASS (에러 0) |
| 배포 (Deploy API Server, `9cd443e9c`) | ✅ success |
| **QR PNG export 디코딩 결과** | ✅ `https://kpa-society.co.kr/qr/e2e-domain-check` (o4o.kr 아님) |
| export 엔드포인트 응답 | ✅ 200, image/png |

### 브라우저 e2e (배포본 `9cd443e9c`, Sohae 약국 매장, 2026-06-25)
- 링크형 QR 1건 생성 → `GET /pharmacy/qr/:id/export?format=png&preset=medium` PNG fetch
  → 캔버스 렌더 → jsQR 디코딩 → **`https://kpa-society.co.kr/qr/e2e-domain-check`** 확인.
- 모든 export 포맷(PNG/PNG고해상도/SVG/A4 PDF/A4 4분할 PDF)은 동일 `qrUrl` 문자열을 공유하므로
  PNG 디코딩으로 전체 포맷 도메인 정합 입증.
- 검증 후 테스트 QR 삭제(목록 0).

### 회귀
- page/video/link/다국어 link QR: landing 경로 불변(본 수정은 payload origin 만 변경). 코드 정적 무영향.

## 5. 후속 (분리)
- **`store-pop.controller.ts` 동일 패턴** — `PUBLIC_DOMAIN || 'o4o.kr'` 사용. POP PDF 가 QR/URL 을
  embed 한다면 동일 장애 가능. 이번 hotfix 범위(QR) 밖 → 별도 확인·수정 권장.
- `/store/settings` 전면 감사: IR-O4O-STORE-SETTINGS-FULL-AUDIT-V1 (별도).
- (참고) service-catalog 의 cosmetics 도메인(`k-cosmetics.site`)과 multilingual 컨트롤러의
  `cosmetics.neture.co.kr` 불일치 — cosmetics QR/landing 도메인 정합은 별도 확인 권장(KPA 무관).
