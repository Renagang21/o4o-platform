# CHECK-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1

> **작업명:** WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1
> **유형:** backend model/API + migration + frontend(QR 관리 UI). 기존 `generateQrSvg` 재사용(신규 QR lib 0).
> **결과: PASS(코드/타입/빌드) — 파트너별 제휴마케팅 QR(`foreign_visitor_partner_qr_codes`) 발급/목록/상세/수정/상태 + SVG. shortCode 기반 landingUrl. 쓰기 entitlement gate. api tsc 0 · web-kpa tsc 0 + build 0.**
> **작성일:** 2026-06-23
> 선행: PARTNER-MODEL-V1 / PARTNER-MANAGEMENT-UI-V1 · IR-...-QR-AFFILIATE-MODEL-V1(§6,§10)

---

## 1. git 상태 / 다른 세션 WIP

- HEAD `c1ae1c908` 기준. 변경 = 본 WO 10파일 + CHECK. 다른 세션 WIP `apps/mobile-app/` **미접촉**. `pnpm-lock.yaml` **무변경**. path-specific 커밋.

## 2. 신규 QR 모델 / table / API

- **`ForeignVisitorPartnerQrCode`** (`foreign_visitor_partner_qr_codes`) — partner_id → foreign_visitor_partners. org+serviceKey 스코프. migration `20261122000000`(CREATE TABLE + UNIQUE(short_code) + 3 index).
- 컬럼: id, organization_id, service_key, partner_id, qr_template_type(default AFFILIATE_MARKETING), qr_code_name, campaign_name?, landing_url, short_code(unique), language?, status(ACTIVE/INACTIVE), valid_from?, valid_to?, created_by?, updated_by?, created_at, updated_at, deleted_at?(soft delete).

## 3. API (mount `/api/v1/foreign-visitor`)

| Method | path | gate |
|------|------|------|
| GET | `/partners/:partnerId/qr-codes` | 조회 |
| POST | `/partners/:partnerId/qr-codes` | **ENTITLEMENT** |
| GET | `/partner-qr-codes/:qrCodeId` | 조회 |
| PATCH | `/partner-qr-codes/:qrCodeId` | **ENTITLEMENT** |
| PATCH | `/partner-qr-codes/:qrCodeId/status` | **ENTITLEMENT** |
| GET | `/partner-qr-codes/:qrCodeId/svg?size=` | 조회 (image/svg+xml) |

- 마운트: QR 라우터 `/api/v1/foreign-visitor`. 기존 partner 라우터(`/api/v1/foreign-visitor/partners`)가 `/:partnerId/qr-codes`(2세그먼트) 비매칭 → fall-through. `/partner-qr-codes`는 `/partners` 세그먼트 경계 불일치로 충돌 없음.
- 파트너 소유권 선검증: partnerId 가 같은 (org, serviceKey) 소속인지 `ForeignVisitorPartnerService.getById` 로 확인(아니면 404).

## 4. shortCode / landingUrl 정책

- shortCode = `fvq_` + randomBytes(4) hex(8자) — 유니크 재시도. public URL 에 **partnerId 미노출**, shortCode 만.
- landingUrl = `${origin}/foreign-visitor/affiliate/{shortCode}` (origin = service별 PUBLIC_WEB_ORIGIN; multilingual landing 과 동일 정책). shortCode/landingUrl 은 생성 후 **불변**(수정 대상 아님).

## 5. AFFILIATE_MARKETING 템플릿

- `qrTemplateType` 6종 정의, **V1 활성 = AFFILIATE_MARKETING 만**(생성 시 서버 고정). 나머지(STORE_GUIDE/GROUP_TOUR/PRODUCT_CATEGORY/EVENT_COUPON) reserved.

## 6. generateQrSvg 재사용

- SVG = `apps/api-server/src/services/qr-print.service.ts` `generateQrSvg(landingUrl, size)` **재사용**. 신규 QR 라이브러리 **0**. 프론트 QR dependency **0**(SVG 를 Bearer 인증 raw fetch → inline 렌더). `pnpm-lock.yaml` 무변경.

## 7. entitlement gate 정책

- **GET(목록/상세/svg) 허용**, **POST/PATCH/status 는 FOREIGN_VISITOR_SALES_SUPPORT ACTIVE 필요**(403 ENTITLEMENT_REQUIRED).
- V1 단순화: INACTIVE 전환 포함 **모든 쓰기 gate**(별도 예외 없음 — CHECK 명시). 이미 만든 QR 은 구독과 무관하게 조회/SVG 가능.

## 8. frontend QR 관리 UI

- 변경(frontend 4): `api/foreignVisitorPartnerQrCodes.ts`(신규, 5함수 + getPartnerQrSvg raw fetch) · `pages/.../ForeignVisitorPartnerQrCodesPage.tsx`(신규) · `ForeignVisitorPartnersPage.tsx`(행에 "QR 관리" 액션) · `App.tsx`(라우트).
- 라우트 **`/store/sales-channels/foreign-visitor/partners/:partnerId/qr-codes`**.
- 목록(QR이름/캠페인/언어/상태/유효기간/생성일/관리) + 발급·수정 모달(템플릿 AFFILIATE_MARKETING 고정 표시 + "결제 기능 미포함" 문구) + **QR 보기 모달**(SVG inline + landingUrl + shortCode + **SVG 다운로드** + URL 복사 + "랜딩은 다음 단계에서 연결" 안내) + 활성·비활성 + empty/loading/error + entitlement gate.

## 9. landing/scan 미구현 (경계)

- ✅ public landing **미구현** — `/foreign-visitor/affiliate/:shortCode` 는 아직 route 없음(스캔 시 404 가능). **후속 A안 채택**(URL만 생성, landing 은 AFFILIATE-LANDING-V1). UI 에 "랜딩 화면은 다음 단계에서 연결됩니다" 안내.
- ✅ scan event / 방문·구매 전환 / 수수료 / POS·DSL **미구현**.

## 10. 보존 경계 (정적)

- ✅ PaymentCore/Toss/STORE_SERVICE_SUBSCRIPTION/STORE_SALE_PAYMENT 410/Neture B2B/Neture partner **미접촉**.
- ✅ ForeignVisitorPartner 기존 CRUD 의미 / multilingual publicKey 로직 **무변경**(재사용 import 만).
- ✅ schema 변경 = `foreign_visitor_partner_qr_codes` 신규 1테이블. 결제/Neture schema **0**.

## 11. 검증

- api-server `tsc --noEmit`: **EXIT 0**. web-kpa-society `tsc`: **EXIT 0** · `build`: **EXIT 0**(✓ 14.52s).
- migration additive — main 배포 시 CI 자동 실행.

### 배포 후 smoke (예정, read-only 우선)
1. store-owner 로그인 → 파트너 목록 행 "QR 관리" → `/partners/:id/qr-codes`.
2. `GET /foreign-visitor/partners/:id/qr-codes?serviceKey=kpa` 200(목록/empty).
3. entitlement 보유 → 발급 모달(생성은 local/staging 또는 명시 승인). 미보유 → 발급 버튼 disabled + 안내 / 쓰기 시 403.
4. QR 보기 → `GET /partner-qr-codes/:id/svg` 200 image/svg+xml, landingUrl=`/foreign-visitor/affiliate/fvq_...`.
> 데이터 생성은 신중히. 운영 read-only(GET 401/200) 우선.

## 12. 후속 WO

```
WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1   /foreign-visitor/affiliate/:shortCode public landing(다국어 안내 연결)
WO-O4O-FOREIGN-VISITOR-QR-SCAN-EVENT-V1       shortCode 스캔 이벤트(ipHash/userAgent/language, 개인정보 최소화)
IR-O4O-FOREIGN-VISITOR-POS-DSL-INTEGRATION-V1 POS/DSL 업체 문의 결과 반영
```

---

*Date: 2026-06-23 · ForeignVisitorPartnerQrCode(foreign_visitor_partner_qr_codes) + partnerId 스코프 CRUD/SVG · shortCode 기반 landingUrl(partnerId 미노출) · AFFILIATE_MARKETING 고정 · generateQrSvg 재사용(신규 QR lib 0, lock 무변경) · 쓰기 entitlement gate · landing/scan 미구현(A안) · 결제/Neture B2B 무변경 · api tsc 0 · web-kpa tsc 0 + build 0.*
