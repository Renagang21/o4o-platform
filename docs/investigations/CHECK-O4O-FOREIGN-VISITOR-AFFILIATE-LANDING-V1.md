# CHECK — 외국인 관광객 제휴 QR Landing V1

**WO:** `WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1`
**일자:** 2026-06-22
**성격:** `/foreign-visitor/affiliate/:shortCode` public landing 연결 — QR 스캔 시 404 방지 + store 식별/안내. **결제 없음 · scan event no-op.**
**상위:** `WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1`(QR 발급) · `WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1`(public landing 패턴)
**검증:** api-server + web-kpa-society `tsc --noEmit` 신규 에러 0.

---

## 1. 배경 / 문제

- QR 발급 WO 에서 `landingUrl = https://kpa-society.co.kr/foreign-visitor/affiliate/:shortCode` 가 생성되나, **해당 프론트 route 미존재 → 스캔 시 SPA 404**.
- 본 WO: public route 연결 + shortCode → store 식별 + 기존 store 안내 연결. (scan event/결제/수수료/POS 연동은 후속.)

## 2. git 상태 / 다른 세션 WIP

- 작업 시작 시 clean. **다른 세션 WIP 미접촉:** `docs/ir/poc-osmu-*`, `IR-O4O-OSMU-*`, `pnpm-lock.yaml`(modified)은 본 WO 와 무관 — path-specific 커밋으로 제외.

## 3. 변경 파일

### 3.1 Backend (api-server, 2파일)
| 파일 | 변경 |
|---|---|
| `foreign-visitor-partner-qr-code.service.ts` | `resolvePublicByShortCode(shortCode, now?)` 추가 — ACTIVE + 유효기간 내(`validFrom<=now<=validTo`)일 때만 QR 반환, 아니면 null |
| `foreign-visitor-partner-qr-code.routes.ts` | **PUBLIC(no auth)** `GET /affiliate/:shortCode/resolve` 추가 — store 식별 공개 필드 반환. `StoreSlugService` import. |

### 3.2 Frontend (web-kpa-society, 3파일)
| 파일 | 변경 |
|---|---|
| `src/api/foreignVisitorAffiliate.ts` (신규) | `resolveAffiliate(shortCode)` — 비인증 fetch(`/api/v1/foreign-visitor/affiliate/:shortCode/resolve`) |
| `src/pages/public/ForeignVisitorAffiliatePublicLandingPage.tsx` (신규) | 모바일 우선 public landing — 환영 + store 명 + "매장 안내 보기"(storeSlug→`/store/:slug`). 결제 버튼 없음. |
| `src/App.tsx` | public route `/foreign-visitor/affiliate/:shortCode` (lazy, no auth) — multilingual landing 옆 |

## 4. Backend resolve 계약

`GET /api/v1/foreign-visitor/affiliate/:shortCode/resolve` (no auth)

성공(200):
```json
{ "success": true, "data": {
  "shortCode": "fvq_xxxxxxxx",
  "serviceKey": "kpa",
  "storeName": "○○약국",
  "storeSlug": "store-slug",
  "campaignName": null,
  "language": null } }
```
실패(404): `{ "success": false, "code": "AFFILIATE_QR_NOT_FOUND" }` (미존재 / 비-ACTIVE / 유효기간 밖 / shortCode 형식 오류)

- **공개 안전:** `partnerId`/내부 id/organizationId **미노출**. shortCode 는 전역 UNIQUE 라 serviceKey 없이 식별.
- **scan event 미기록(no-op):** resolve 는 조회만. 기록/집계는 후속 `QR-SCAN-EVENT-V1`.
- storeName(organizations.name) / storeSlug(StoreSlugService) 는 graceful(없으면 null).

## 5. Frontend landing 동작

- `/foreign-visitor/affiliate/:shortCode` (public, 인증/Layout/Guard 없음) → `resolveAffiliate` 호출.
- 정상: 환영(환영합니다 / Welcome · ようこそ · 欢迎) + storeName 안내 + storeSlug 있으면 **"매장 안내 보기 · View store guide"** → `/store/:slug`(기존 store public landing 연결). 없으면 "직원 문의" 안내.
- 404/실패: "안내를 찾을 수 없습니다 / This guide is not available." (SPA 404 아님 — route 는 매칭됨).
- **결제 버튼 없음.**

## 6. 보존 경계 (미구현 유지)

```text
/foreign-visitor/affiliate/:shortCode "scan event 기록" — no-op(미기록)
POS/DSL 연동 · 수수료 계산 · 결제 — 미구현
Neture partner · STORE_SERVICE_SUBSCRIPTION · STORE_SALE_PAYMENT(410) — 미접촉
```
- 기존 QR 발급/관리(인증 라우트)·entitlement gate **무변경**(public resolve 만 추가). DB/migration **0**.

## 7. 검증

- `apps/api-server` `tsc --noEmit` → 신규 에러 0(전체 1건은 무관 pre-existing marketTrial). `StoreSlugServiceKey` 캐스팅으로 타입 정합.
- `web-kpa-society` `tsc --noEmit` → 에러 0.
- 변경 = api 2 + web 3(App + 신규 2) + 본 CHECK. 다른 세션 WIP/lockfile 미접촉.
- 배포 후 운영 smoke: §8.

## 8. 배포 후 운영 smoke

- (배포 완료 후 보강)
```text
GET /api/v1/foreign-visitor/affiliate/<unknown>/resolve → 404 AFFILIATE_QR_NOT_FOUND (route 마운트·public 확인)
브라우저 /foreign-visitor/affiliate/<unknown> → landing 페이지("안내를 찾을 수 없습니다"), SPA 404 아님
(실 shortCode 는 store 가 ACTIVE entitlement 없어 발급 불가 → 양성 경로는 발급 후 후속 검증)
```

## 9. 완료 기준 대비

| 기준 | 결과 |
|---|---|
| `/foreign-visitor/affiliate/:shortCode` public route 연결(404 방지) | ✅ |
| shortCode 로 QR/store 식별 | ✅ (resolve) |
| 기존 store 안내 연결 | ✅ (storeSlug → `/store/:slug`) |
| 결제 버튼 없음 | ✅ |
| scan event 미기록(no-op) | ✅ |
| partnerId 미노출 | ✅ |

## 10. 후속 WO

```text
1. WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1   ← scan 기록/집계
2. IR-O4O-FOREIGN-VISITOR-POS-DSL-INTEGRATION-V1        ← POS/DSL 연동·수수료
```

---

*Date: 2026-06-22 · CHECK · public affiliate landing 연결 · GET /foreign-visitor/affiliate/:shortCode/resolve(no auth, 404 on inactive/unknown, partnerId 미노출, scan no-op) + 프론트 public page/route · storeSlug→/store/:slug 연결 · 결제 없음 · DB/migration 0 · api/web tsc 신규 에러 0 · 다른 세션 WIP 미접촉.*
