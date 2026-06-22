# CHECK-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1

WO: **WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1**
작업 제목: 다국어 상품 콘텐츠 public/QR landing (KPA 파일럿)

## 1. 목적
매장에 연결된 store-scoped 다국어 상품 콘텐츠를 외국인 고객이 인증 없이 QR/URL 로 열람하는 public landing 구현. 운영자 원본이 아니라 **매장 사본(store copy)** 기준.

## 2. 조사 결과
- store 그룹 엔티티에 public 식별자 **없음** → migration 필요
- 기존 QR landing 패턴(`/qr/public/:slug`, store-qr-landing.controller) 참조 — 단 QR slug는 사용자 입력, 다국어는 자동 가져오기라 **랜덤 publicKey** 채택
- `qr-print.service.generateQrSvg(url)` 존재 → 프론트 QR 의존성 없이 백엔드 SVG 생성 (web-kpa엔 qrcode.react 없음 + pnpm-lock.yaml 타 세션 mid-edit → lockfile 변경 회피)
- `@o4o/content-editor` 가 `sanitizeRichHtml` export, web-kpa 이미 의존 → HTML 안전 렌더 (새 의존성 없음)
- resolve fallback 로직(`pickFallbackPage`) 기존 컨트롤러에 존재 → 재사용

## 3. 핵심 결정
- public landing은 **store copy의 published page만** 노출 (운영자 원본/org/sourceRef 등 내부정보 미노출)
- publicKey는 추측 어려운 랜덤(24 hex), unique partial index, lazy 발급
- **"고객용 링크/QR 발급 = 고객 공개"**: 가져온 store 사본은 draft 이므로, public-key 발급 시 그룹/draft 페이지를 published 로 승격(운영자 원본 무관, store copy 한정). 별도 publish UI 신설 회피하면서 QR 즉시 동작.
- QR 이미지는 backend SVG (프론트 의존성 0)

## 4. 변경 (Phase 1 + Phase 2)

### Backend (api-server)
- migration `20261120000000-AddPublicKeyToStoreMultilingualProductContent.ts` — public_key varchar(40) nullable + unique partial index
- entity `store-multilingual-product-content-group.entity.ts` — publicKey 컬럼
- controller `multilingual-product-content.controller.ts`:
  - `GET /public/multilingual-product-contents/:publicKey?locale=` — **비인증** resolve (published만, fallback, 정보 정제, archived/미발행 404)
  - `POST /pharmacy/.../:groupId/public-key` — idempotent 발급 + store 그룹/draft페이지 published 승격, `{ publicKey, url }`
  - `GET /pharmacy/.../:groupId/qr` — `{ publicKey, url, svg }` (generateQrSvg)

### Frontend (web-kpa-society)
- `pages/public/MultilingualProductPublicLandingPage.tsx` — 모바일우선 public landing (locale 전환 / html sanitize / image_sequence / 미지원 fallback / notFound)
- `api/multilingualProductContentStore.ts` — ensureMlcPublicKey / getMlcQr / resolvePublicMlc(비인증)
- `components/MultilingualPublicActions.tsx` — 고객용 보기 / URL 복사 / QR 보기 (백엔드 SVG inline)
- `pages/pharmacy/StoreLocalProductsPage.tsx` — 편집 모달 연결 패널에 위 액션 통합 ("QR 연결 예정" 문구 제거)
- `App.tsx` — `/multilingual-products/:publicKey` public route (no auth)

커밋: Phase1 `ea866a738` (backend) · Phase2 `5e43b3dc0` (QR UI + SVG endpoint)
타 세션 store-entitlement WIP 미접촉, pnpm-lock.yaml 미변경, 명시적 pathspec 커밋.

## 5. 검증

### 5.1 정적 검증
- api-server `tsc --noEmit`: error 0
- web-kpa-society `tsc --noEmit`: error 0

### 5.2 배포 후 smoke
(작성 예정 — 배포 완료 후 API + UI smoke)

## 6. 성공 기준 대비
1. public URL 발급 — ✅(설계)  2. store-owner QR/링크 확인 — (smoke)  3. 인증 없이 열람 — (smoke)
4. locale=en — (smoke)  5. fallback — (smoke)  6. archived/draft 미노출 — ✅(쿼리)  7. 내부 ID 미노출 — ✅(정제)
8. 기존 흐름 회귀 — (smoke)

## 7. 후속
- listing(targetKind=listing) 상품의 QR UI는 PharmacyB2BPage에 후속 (현재 모달은 local 상품)
- WO-O4O-MULTILINGUAL-PRODUCT-TABLET-CONTENT-V1 → CROSS-SERVICE-ADOPTION
