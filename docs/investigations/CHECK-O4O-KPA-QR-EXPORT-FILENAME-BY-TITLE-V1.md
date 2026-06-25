# CHECK-O4O-KPA-QR-EXPORT-FILENAME-BY-TITLE-V1

> 작업: QR 출력 파일명을 콘텐츠(QR) 제목으로
> 커밋: `d888a11c2`(파일명) + `28f578564`(CORS 노출) / 일자: 2026-06-25

---

## 1. 작업 요약

QR 출력 파일명이 `qr-<uuid>.<ext>`(또는 `qr-<slug>`) 로 떨어지던 것을 **QR 제목 기반**으로 변경.
한글 제목 보존을 위해 RFC 5987 `filename*=UTF-8''` + ASCII `filename=` 폴백을 함께 설정.

### 변경 파일
1. `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts`
   - `buildQrContentDisposition(title, slug, ext)` 신설 — 금지문자 정리 + `filename*`(제목, percent-encoded) + ASCII 폴백.
   - export(PNG/SVG/PDF) + legacy image(PNG/SVG) Content-Disposition 을 제목 기반으로 통일.
   - 4분할 PDF 는 제목에 `(4분할)` 표기. 제목 없으면 `qr-<slug>` 폴백.
2. `services/web-kpa-society/src/api/storeQr.ts`
   - `parseFilename` 이 `filename*=UTF-8''` 우선 파싱(decodeURIComponent) → 한글 파일명 보존.
3. `apps/api-server/src/bootstrap/setup-middlewares.ts` + `server.ts`
   - CORS `exposedHeaders` 에 **`Content-Disposition` 추가** — 교차출처(api.neture.co.kr → kpa-society.co.kr)
     에서 프론트가 헤더를 읽어야 파일명이 적용됨(없으면 fallback 으로 떨어짐). QR/CSV/PDF 공통 혜택.

## 2. 핵심 원인 (CORS)

프론트는 `api.neture.co.kr` 응답의 `Content-Disposition` 을 읽어 다운로드 파일명을 정하는데,
`Content-Disposition` 은 CORS-safelisted 응답 헤더가 아니라 `Access-Control-Expose-Headers` 에
명시해야 교차출처에서 읽힌다. 미노출 상태라 기존엔 항상 fallback(`qr-<uuid>`) 이었음.
→ 헤더에 제목을 넣는 것만으로는 부족, **exposedHeaders 추가가 필수**.

## 3. 검증

| 항목 | 결과 |
|---|---|
| 타입체크 (api-server, web) | ✅ PASS |
| 배포 (API `d888a11c2`/`28f578564`, Web) | ✅ success |

### 브라우저 e2e (배포본, Sohae 약국 매장, 2026-06-25) — 제목 "자일리톨 그린껌 안내"
fetch 로 export 4종 호출 → `Content-Disposition` 읽힘 확인 + 프론트 `parseFilename` 로 해석:

| 포맷 | 해석된 파일명 |
|---|---|
| PNG | ✅ `자일리톨 그린껌 안내.png` |
| SVG | ✅ `자일리톨 그린껌 안내.svg` |
| A4 PDF | ✅ `자일리톨 그린껌 안내.pdf` |
| A4 4분할 PDF | ✅ `자일리톨 그린껌 안내 (4분할).pdf` |

- CORS 노출 전: `Content-Disposition` = null(미노출) → 노출 후 정상 읽힘 확인.
- 검증 후 테스트 QR 삭제(목록 0).

> 참고: 비ASCII 제목의 ASCII 폴백(`filename=`)은 일부 글자만 남을 수 있으나(예 4분할 → `(4).pdf`),
> modern 브라우저는 `filename*`(UTF-8) 을 우선 사용하므로 실제 다운로드명은 제목으로 적용됨.

## 4. 후속
- store-pop.controller 등 다른 다운로드도 제목 파일명/CORS 노출 혜택 적용 검토(공통 exposedHeaders 는 이미 반영).
