# CHECK — 외국인 관광객 제휴 QR Scan Event V1

**WO:** `WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1`
**일자:** 2026-06-23
**성격:** public landing resolve 의 no-op 이던 스캔을 **익명 이벤트**로 기록 + 최소 집계. 개인정보 최소화. 결제/방문/구매/수수료 미구현.
**상위:** `WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1`(public resolve) · `IR-O4O-FOREIGN-VISITOR-PARTNER-QR-AFFILIATE-MODEL-V1`
**검증:** api-server + web-kpa-society `tsc --noEmit` 신규 에러 0.

---

## 1. git 상태 / 다른 세션 WIP

- 작업 대상 clean. **다른 세션 WIP 미접촉:** `docs/ir/poc-osmu-*`, `IR-O4O-OSMU-*`, `pnpm-lock.yaml` — path-specific 커밋으로 제외.

## 2. 변경 파일

### Backend (api-server)
| 파일 | 변경 |
|---|---|
| `foreign-visitor-partner-qr-scan-event.entity.ts` (신규) | `foreign_visitor_partner_qr_scan_events` entity |
| `database/migrations/20261123000000-CreateForeignVisitorPartnerQrScanEventsTable.ts` (신규) | 테이블 생성(IF NOT EXISTS) + 4 인덱스 |
| `foreign-visitor-partner-qr-scan-event.service.ts` (신규) | `recordScan`(5분 dedupe) / `getStatsForQr` / `getCountsForQrCodeIds` / `hashWithSalt` |
| `database/entities.ts` | entity 등록(import + array) |
| `foreign-visitor-partner-qr-code.routes.ts` | resolve 에 익명 scan 기록 + QR 목록 scanCount/lastScannedAt + `GET /partner-qr-codes/:qrCodeId/stats` |

### Frontend (web-kpa-society)
| 파일 | 변경 |
|---|---|
| `src/api/foreignVisitorPartnerQrCodes.ts` | QR 타입에 `scanCount?`/`lastScannedAt?` |
| `src/pages/pharmacy/ForeignVisitorPartnerQrCodesPage.tsx` | QR 목록에 "스캔"(스캔 수/최근 스캔) 컬럼 |

## 3. Scan event 모델

`foreign_visitor_partner_qr_scan_events`:
```text
id · organization_id · service_key · partner_id · qr_code_id · short_code
campaign_name? · language? · landing_path? · referrer?
ip_hash? · user_agent_hash? · user_agent_summary? · created_at
인덱스: (qr_code_id,created_at) (partner_id,created_at) (organization_id,service_key,created_at) (short_code)
```

## 4. 개인정보 최소화 (핵심)

| 항목 | 처리 |
|---|---|
| IP 원문 | **미저장.** `ip_hash = sha256(salt + clientIp)` 만. salt = `ENCRYPTION_KEY`(운영 비밀 재사용, 신규 env 0) |
| userAgent | `user_agent_hash = sha256(salt + UA)` + `user_agent_summary`(절단 ≤160자, 가독성용) |
| referrer | 절단(≤500) 저장 |
| 이름/전화/이메일/계정/위치/쿠키추적/결제 | **미수집** |

- clientIp = `x-forwarded-for[0]` → `req.ip` → `socket.remoteAddress` 순. hash 만 저장하므로 역추적 불가.

## 5. 중복 기록 방어

- `recordScan`: **5분 dedupe** — 동일 `(qrCodeId, ipHash, userAgentHash)` 가 5분 내 존재하면 신규 기록 생략(`recorded:false`). 새로고침/재요청으로 인한 과다 카운트 완화.
- `ipHash`/`userAgentHash` 둘 다 없으면 dedupe 없이 기록.

## 6. Public resolve 변경

- `GET /api/v1/foreign-visitor/affiliate/:shortCode/resolve` — **resolve 성공(ACTIVE+유효기간 내) 시에만** 익명 scan 기록(best-effort: try/catch, 실패해도 resolve 응답 영향 없음).
- **미기록:** unknown / inactive / 유효기간 밖 / malformed shortCode (resolve 가 404 → 기록 안 함).
- 응답 shape **유지**: `{ shortCode, serviceKey, storeName, storeSlug, campaignName, language }`. **eventId/partnerId/organizationId 미노출**.

## 7. 집계 API / 목록 count

| 항목 | 내용 |
|---|---|
| QR 목록(`GET /partners/:partnerId/qr-codes`) | 각 QR 에 `scanCount`/`lastScannedAt` 포함(batch group-by, 인증·자기 매장) |
| 통계(`GET /partner-qr-codes/:qrCodeId/stats`) | `{ qrCodeId, totalScans, todayScans, lastScannedAt }` — 인증 + **자기 (org,serviceKey) QR 만**(`getById` 선검증, 타 매장 404) |

## 8. Frontend 표시

- QR 목록에 "스캔" 컬럼 — `scanCount`(숫자) + `최근 {lastScannedAt}`. **유입 신호만.**
- 금지 표현(구매 수/매출/수수료/정산/전환율) **미사용** — "스캔/최근 스캔/유입" 만.

## 9. 보존 경계 (미구현 유지)

- 방문 확인 · 구매 전환 · POS/DSL · 수수료/정산 · 개인정보 수집 — **미구현**.
- PaymentCore/Toss/STORE_SERVICE_SUBSCRIPTION/STORE_SALE_PAYMENT(410)/Neture B2B/partner-recruitment/QR SVG 로직 · 기존 multilingual landing — **미접촉**.
- DB migration = **scan event 테이블 1개**만. 기존 QR/partner/payment schema 변경 0.

## 10. 데이터 보존기간

- **미정.** raw event 무기한 누적(V1 삭제 기능 없음). 후속 `WO-O4O-FOREIGN-VISITOR-SCAN-EVENT-RETENTION-POLICY-V1` 에서 90/180일·월별 집계 전환 결정 필요.

## 11. 검증

- `apps/api-server` `tsc --noEmit` → 신규 에러 0(전체 1건 무관 marketTrial).
- `web-kpa-society` `tsc --noEmit` → 에러 0.
- migration 신규 1개(`...QrScanEventsTable`). 기존 schema 변경 0.
- 배포 후 운영 smoke: §12.

## 12. 배포 후 운영 smoke

- (배포 완료 후 보강)
```text
GET /affiliate/<unknown>/resolve → 404 (scan 미기록, resolve 정상)
GET /partner-qr-codes/<unknown>/stats (authed) → 404 QR_NOT_FOUND (route 마운트 + 스코프 검증)
양성(실 ACTIVE QR → resolve → scan 1건 → 목록 scanCount/stats) 은 store 가 ACTIVE entitlement 없어 QR 발급 불가 → 코드/마운트로 확인, 발급 후 후속.
```

## 13. 완료 기준 대비

| 기준 | 결과 |
|---|---|
| scan event 모델/table | ✅ |
| ACTIVE resolve 시 기록 | ✅ (best-effort) |
| unknown/inactive/expired 미기록 | ✅ |
| IP 원문 미저장 | ✅ (ip_hash) |
| userAgent hash/최소화 | ✅ |
| 중복 방어 | ✅ (5분 dedupe) |
| QR별 scan count / stats API | ✅ |
| 파트너 QR UI scan count | ✅ |
| landing 동작 유지 | ✅ |
| 결제/방문/구매/수수료 미구현 | ✅ |
| STORE_SALE_PAYMENT/Neture B2B 무변경 | ✅ |

## 14. 후속 WO

```text
WO-O4O-FOREIGN-VISITOR-SCAN-EVENT-RETENTION-POLICY-V1  ← raw event 보존기간/월별 집계
IR-O4O-FOREIGN-VISITOR-POS-DSL-INTEGRATION-V1          ← POS/DSL·매출 연결
WO-O4O-FOREIGN-VISITOR-VISIT-CONFIRMATION-V1            ← 방문 확인(스캔과 분리)
WO-O4O-FOREIGN-VISITOR-PARTNER-PERFORMANCE-DASHBOARD-V1 ← 파트너 지표(수수료 제외)
```

---

*Date: 2026-06-23 · CHECK · 익명 scan event(ip_hash/ua_hash, IP 원문 미저장, 5분 dedupe) · resolve 성공 시만 기록(404 미기록) · stats API + 목록 scanCount(자기 매장) · 프론트 스캔 수 컬럼 · 결제/방문/구매/수수료 미구현 · migration 1개 · 보존기간 미정(후속) · api/web tsc 신규 에러 0 · 다른 세션 WIP 미접촉.*
