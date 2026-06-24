# IR-O4O-PARTNER-AFFILIATE-CURRENT-STATE-AUDIT-V1

> **read-only 조사 문서.** 코드 변경 없음. 본 IR은 현재 구현된 partner / affiliate / commission / foreign-visitor-partner 기능을 전수 조사하여 **제거 / 비활성화 / 정비 / 매장 재분류 / 별도 기획** 대상으로 분류하고, V1 정비 권고안과 후속 WO 후보를 제시한다.

- **작성일:** 2026-06-24
- **상태:** Investigation (조사 완료, 의사결정 대기)
- **기획 기준:** "전통적 제휴마케팅(자동 수수료·정산)은 상당 기간 미도입. 파트너 식별(partnerCode/campaignCode/shortCode)은 유지. 파트너별 QR은 파트너 기능이 아니라 매장 기능. 공급자-인플루언서형 홍보는 가능성 open. Neture B2B seller partner 와 혼합 금지."

---

## 0. Executive Summary (1차 판단)

| 축 | 위치 | 실체 | 1차 분류 |
|----|------|------|:--------:|
| **(1) Legacy `/api/partner`** | `routes/partner.routes.ts` + `controllers/partner/partnerController.ts` | **100% Mock** (하드코딩 earnings/commission/conversion). frontend 소비 0, 테스트 0. | **A 즉시 제거** |
| **(2) `modules/partner`** | dashboard(content/event/target) + application | 실 DB 기반(단 Application 엔티티 미등록=dead). **commission/conversion 필드 차단됨** (의도적). | **C 정비 후 유지** + 일부 **A** |
| **(3) `modules/foreign-visitor-partner`** | partner 원장 + QR + scan event | 실 DB·migration 존재. **결제/수수료 0**. privacy-first(IP/UA 해시·5분 dedupe). | **C(원장) + D(QR/scan 매장 재분류)** |
| **(4) 광역 발견 — Neture/Dropshipping affiliate** | `modules/neture/*`, `packages/partner-core`, `packages/partnerops`, `packages/financial-core`, `packages/dropshipping-core`, 다수 frontend | 전통 affiliate **풀 스택**(click→conversion→commission→settlement). | **E 별도 기획 / 본 IR 범위 외** (혼합 금지) |

**핵심 메시지:** 본 채팅방이 지칭한 "정비 대상 파트너 기능"은 위 (1)(2)(3) 세 축이다. (4)는 별개의 대형 commerce 서브시스템(Neture distribution / dropshipping)으로, **기획 기준 §6의 "Neture B2B seller partner 혼합 금지" 에 따라 본 정비 범위에서 분리**한다. 다만 그 존재를 인벤토리로 기록하고, 별도 의사결정이 필요함을 명시한다.

---

## 1. 현재 partner 관련 구현 목록 (3축)

### 1.1 Legacy `/api/partner` (Phase K)
- `apps/api-server/src/routes/partner.routes.ts`
- `apps/api-server/src/controllers/partner/partnerController.ts` (약 430줄, 전부 mock)
- 마운트: `register-routes.ts:85` import → `register-routes.ts:361` `app.use('/api/partner', partnerRoutes)` — **활성**
- 가드: `authenticate` + `partnerOrAdmin`(`['partner','platform:admin','platform:super_admin']`)

### 1.2 `modules/partner` (Partner Dashboard API v1 + Application)
- 라우트: `partner-dashboard.routes.ts`, `partner-application.routes.ts`, `partner.controller.ts`
- 가드: `guards/partner-context.guard.ts`
- 엔티티: `PartnerApplication`, `PartnerContent`, `PartnerEvent`, `PartnerTarget`
- 서비스: `partner-overview`, `partner-content`, `partner-event`, `partner-target`, `partner-status`, `partner-application`
- 마운트: `register-routes.ts:365` `/api/v1/partner`, `:369` `/api/v1/partner/applications` — **활성**

### 1.3 `modules/foreign-visitor-partner`
- 엔티티: `ForeignVisitorPartner`, `ForeignVisitorPartnerQrCode`, `ForeignVisitorPartnerQrScanEvent`
- 라우트/서비스: partner CRUD + QR CRUD + scan event
- 마운트: `register-routes.ts:580` `/api/v1/foreign-visitor/partners`, `:592` `/api/v1/foreign-visitor` — **활성**
- migration 3종 존재(아래 §4)

---

## 2. Route / API 목록

### 2.1 Legacy `/api/partner/*` (Mock — A)
| Method | Path | 반환(전부 하드코딩) |
|--------|------|------|
| GET | `/api/partner/dashboard/summary` | totalEarnings `12345.67`, monthlyEarnings `2345.89`, pendingCommissions, totalConversions `89`, conversionRate, tier |
| GET | `/api/partner/commissions` | commissionHistory[] (commissionAmount/Rate, status paid/pending/approved) |
| GET | `/api/partner/analytics` | mock 분석 데이터 |
| POST | `/api/partner/links/generate` | 하드코딩 short URL(`/r/{code}/{productId}`), 미저장 |
| GET | `/api/partner/products` | promotionalProducts[] (commission amount/rate) |

> 증거: `partnerController.ts:32` `// Mock metrics data - Replace with actual database queries`, `:33` `const totalEarnings = 12345.67`, `:34` `monthlyEarnings = 2345.89`. **DB 쿼리 없음.**

### 2.2 `modules/partner` (`/api/v1/partner/*`)
| Method | Path | Auth | 비고 |
|--------|------|:----:|------|
| GET | `/overview` | partner role | activeContentCount/activeEventCount/status **만** |
| GET | `/targets` | partner role | 시스템 배정 read-only |
| GET/POST/PATCH | `/content`(`/:id`) | partner role | type text\|image\|link |
| GET/POST/PATCH | `/events`(`/:id`) | partner role | 기간/지역/targetScope |
| GET | `/status` | partner role | 집계 |
| POST | `/applications` | **public** | 접수만, ID/상세 미반환 |

### 2.3 `foreign-visitor-partner` (`/api/v1/foreign-visitor/*`)
| Method | Path | Auth | Entitlement |
|--------|------|:----:|------|
| GET/POST | `/partners` | yes | POST=`FOREIGN_VISITOR_SALES_SUPPORT` |
| GET/PATCH | `/partners/:id` | yes | PATCH=entitlement |
| PATCH | `/partners/:id/status` | yes | entitlement |
| GET/POST | `/partners/:id/qr-codes` | yes | POST=entitlement |
| GET/PATCH | `/partner-qr-codes/:id`(`/status`,`/svg`,`/stats`) | yes | 쓰기=entitlement |
| GET | `/affiliate/:shortCode/resolve` | **public** | shortCode→매장 resolve |

---

## 3. Frontend 화면 / 메뉴 사용 여부

| 축 | frontend 소비 |
|----|------|
| **(1) Legacy `/api/partner`** | **없음.** 소스 내 `/api/partner` 호출 0건(dist 컴파일 산출물만). admin-dashboard의 `api/partner.ts`는 **다른 네임스페이스**(`/partner/create` 등)를 호출 → Phase K 엔드포인트와 무관. |
| **(2) `modules/partner`** | 직접 매칭 UI 미확인(백엔드 우선 구현). |
| **(3) `foreign-visitor-partner`** | `/api/v1/foreign-visitor*` 호출 UI **미확인**. 단 `services/web-kpa-society`에 `ForeignVisitorAffiliatePublicLandingPage.tsx` + `api/foreignVisitorAffiliate.ts` 존재(public landing 축). |
| **(4) Neture/Dropshipping** | **대량 존재**(범위 외, §7 참조). |

---

## 4. Entity / Table / Migration 목록

### 4.1 `modules/partner`
| Entity | entities.ts 등록 | Migration |
|--------|:----:|------|
| `PartnerContent` | ✅ `entities.ts:332,810` | 명시 migration 없음(TypeORM auto) |
| `PartnerEvent` | ✅ `:333,811` | 동일 |
| `PartnerTarget` | ✅ `:334,812` | 동일 |
| **`PartnerApplication`** | **❌ 미등록** (`entities.ts`에 `NeturePartnerApplication`만 존재) | **없음 → 테이블 생성 안 됨 = dead code** |

> **확정:** `grep PartnerApplication src/database/entities.ts` → `NeturePartnerApplication`(250,738)만. `modules/partner/entities/PartnerApplication.ts`의 `@Entity('partner_applications')`는 TypeORM에 연결되지 않음. `partner-application.routes.ts`(public POST) + service는 **영속 불가** 상태.

### 4.2 `foreign-visitor-partner` (migration 존재 ✅)
- `20261121000000-CreateForeignVisitorPartnersTable.ts` → `foreign_visitor_partners`
- `20261122000000-CreateForeignVisitorPartnerQrCodesTable.ts` → `foreign_visitor_partner_qr_codes` (short_code UNIQUE)
- `20261123000000-CreateForeignVisitorPartnerQrScanEventsTable.ts` → `foreign_visitor_partner_qr_scan_events` (append-only)
- entities.ts 등록: `:421-425`, `:836-840`

### 4.3 광역(범위 외) commission/settlement 테이블
`20260308400000-CreatePartnerCommissionsTable`, `...500000-SupplierPartnerCommissions`, `...510000-PartnerReferrals`, `...520000-AlterPartnerCommissionsAddReferralColumns`, `...700000-PartnerSettlementsTables`, `20260224600000-SellerPartnerContract`, `2026020100001-PartnerRecruitmentTables` → **Neture/Dropshipping 도메인. 본 IR 정비 대상 아님.**

---

## 5. Traditional affiliate / commission mock 잔재 목록

| 위치 | 잔재 | 실체 |
|------|------|------|
| `partnerController.ts:33-73` | totalEarnings, monthlyEarnings, pendingCommissions, tier(Bronze~Diamond) | **Mock** |
| `partnerController.ts:118-152` | commissionHistory[] (amount/rate, paid/pending/approved) | **Mock** |
| `partnerController.ts:190-` | analytics(conversionRate/totalConversions) | **Mock** |
| `partnerController.ts:286-306` | generatePartnerLink (미저장 short URL) | **Mock** |
| `partnerController.ts:349-392` | promotionalProducts commission amount/rate | **Mock** |
| `types/auth.ts:14` | `PARTNER='partner'` 주석 "제휴 마케팅, 커미션" | 명칭/주석 정비 후보 |

> `modules/partner` 자체에는 commission/earning/payout/conversion **누출 없음**. `partner-overview.service.ts:7` `⚠️ 매출/전환/성과 필드 절대 금지` 주석 + 구현이 단순 count만 반환(검증됨).

---

## 6. Foreign Visitor Partner QR 재분류 판단

### 6.1 현재 구조
- `ForeignVisitorPartner`: **매장 경영자 소유** — `organizationId` + `serviceKey`(`kpa`|`glycopharm`|`cosmetics`) 스코프. 가드 `isStoreOwner` 검증, client storeId 불신.
- 결제/수수료/POS 코드 **전무**. entity 주석(`foreign-visitor-partner.entity.ts:11`): "결제/커미션 정산과 무관… 수수료는 POS/매장/수기 별도(후속)".
- scan event privacy: `ipHash`=sha256(salt+IP) **원문 미저장**, `userAgentHash`=sha256, `userAgentSummary`=UA 앞 160자, 5분 dedupe(`DEDUPE_WINDOW_MINUTES=5`), 익명 집계(totalScans/todayScans/lastScannedAt).

### 6.2 판단
- **즉시 제거 불필요.** 결제·정산이 없고 식별/스캔 보조 데이터만 보유 → 기획 기준과 충돌하지 않음.
- 그러나 **개념 경계가 혼합**: ① 파트너 원장(매장의 인바운드 관광 파트너 메타데이터) + ② QR/landing/scan(매장 유입 퍼널 분석). 후자는 **파트너 기능이 아니라 매장 안내/노출 기능**.
- **권고 분리 경계:**
  - 유지(원장): `ForeignVisitorPartner` (partner CRUD)
  - 매장 재분류(D): `ForeignVisitorPartnerQrCode` + `ForeignVisitorPartnerQrScanEvent` + `/affiliate/:shortCode/resolve` public landing → **store 안내/QR 노출 도메인**으로 이동, QR가 `partnerId`를 **선택적 참조**.
- **명칭 정비:** `affiliate`(route `/affiliate/:shortCode`, `qrTemplateType=AFFILIATE_MARKETING`)는 Neture commission affiliate 와 충돌 → `partner-qr` / `store-discovery-qr` / `STORE_VISIT_TRACKING` 류로 개명 권고.
- **privacy 잔여 검토:** `userAgentSummary`(원문 160자)는 디바이스 핑거프린트 소지 → OS/브라우저 패밀리 요약 또는 hash-only 전환 검토(경미).

---

## 7. 광역 발견 — Neture / Dropshipping affiliate (본 IR 범위 외, E)

키워드 전수 sweep 결과, 세 축 외에 **전통 affiliate 풀 스택**이 별도로 존재함을 확인. **기획 §6 "Neture B2B seller partner 혼합 금지"** 에 따라 본 정비에서 분리하되 인벤토리로 기록한다.

- **백엔드:** `modules/neture/controllers/{admin-partner, partner, partner-commerce, partner-recruitment, partner-dashboard}.controller.ts`, `services/{partner, partner-commission, partner-contract, neture-settlement, seller}.service.ts`, 엔티티 `Neture*Partner*`.
- **패키지:** `packages/partner-core`(Partner/Click/Conversion/Commission/Link/SettlementBatch), `packages/partnerops`, `packages/financial-core/commission-engine.ts`, `packages/dropshipping-core`(CommissionRule/Transaction).
- **frontend:** `admin-dashboard/pages/{partnerops, cosmetics-partner, dropshipping, vendors-commission}`, `services/web-neture/pages/{partner, admin}/*`(commission/settlement dashboards), `packages/shortcodes/dropshipping/AffiliateDashboard.tsx`.
- **types:** `packages/types/partner.ts`(KEEP-core), `packages/types/affiliate.ts`(deprecated wrapper).

> 이들은 Neture distribution / dropshipping 도메인(F8 Freeze 등)에 속함. **본 IR은 존재 기록만 하며, 활성/제거/정책 판단은 해당 도메인 별도 의사결정 사항.** 본 정비 작업이 이 코드를 건드리지 않도록 경계를 명확히 한다.

---

## 8. 제거 / 비활성화 / 유지 / 재분류 대상 표

| 분류 | 대상 | 근거 |
|:----:|------|------|
| **A 즉시 제거** | Legacy `/api/partner/*` 전체 (`routes/partner.routes.ts`, `controllers/partner/partnerController.ts`, `register-routes.ts:85,361`) | 100% mock, frontend/테스트 소비 0, `/api/v1/partner` 로 대체됨, 가짜 earnings/commission 노출은 오인 유발 |
| **A 즉시 제거** | `modules/partner` PartnerApplication 경로 (`PartnerApplication.ts`, `partner-application.routes.ts`, `partner-application.service.ts`, `register-routes.ts:369`) | 엔티티 entities.ts 미등록 → 테이블 미생성 → public POST가 영속 불가한 dead code |
| **B 비활성화(대안)** | (A 즉시 삭제 위험 시) Legacy `/api/partner` → `410 Gone` / `FEATURE_DISABLED` 응답 전환 | frontend 무참조 확인되어 삭제가 1순위지만, 외부 클라이언트 미상 시 410 단계 경유 가능 |
| **C 정비 후 유지** | `modules/partner` dashboard(content/event/target/overview/status) | commission/conversion 차단 구현 양호. 단 명칭이 'partner'라 affiliate 와 혼동 → `promoter-*` 류 개명 검토 |
| **C 정비 후 유지** | `partner-context.guard.ts` serviceId 하드코딩(`'glycopharm'` default, `['glycopharm','k-cosmetics']` allow) | env/카탈로그 기반으로 외부화 (`PARTNER_DEFAULT_SERVICE`/`ALLOWED`) |
| **C 정비 후 유지** | `ForeignVisitorPartner` 원장(partner CRUD) | 결제 무관, org+serviceKey 스코프 정상. 향후 공급자-인플루언서/가이드 원장 기반 후보 |
| **D 매장 재분류** | `ForeignVisitorPartnerQrCode` + `QrScanEvent` + `/affiliate/:shortCode/resolve` + KPA public landing | QR/scan/landing은 매장 안내·노출 기능. partner 도메인에서 분리, partnerCode/campaignCode 선택 참조 |
| **D 명칭 정비** | `affiliate`/`AFFILIATE_MARKETING` 라우트·템플릿 타입 | Neture commission affiliate 와 어휘 충돌 제거 |
| **E 별도 기획** | Neture/Dropshipping affiliate 풀 스택(§7) | 본 정비 범위 외. 가이드 수수료·POS·PG·정산은 별도 도메인 의사결정 |

---

## 9. V1 정비 권고안

1. **Legacy `/api/partner` 제거를 1순위로.** frontend·테스트 무참조가 확인됨. 즉시 삭제(파일 2개 + `register-routes.ts:85,361` 제거)가 가장 깨끗. 외부 클라이언트 불확실성을 보수적으로 다루려면 1차 `410 Gone`(FEATURE_DISABLED) → 관측 후 삭제 2단계.
2. **`modules/partner` PartnerApplication 경로 정리.** dead code이므로 ① 제거하거나 ② 정식 사용 의도면 `entities.ts` 등록 + migration 추가로 살린다. **현재 상태(반쪽)는 금지.**
3. **`modules/partner` dashboard 유지**하되, 'partner' 명칭이 affiliate commission 과 충돌하지 않도록 도메인 어휘 정리(예: promoter/콘텐츠-이벤트 관리). serviceId 하드코딩 외부화.
4. **foreign-visitor QR/scan/landing 을 매장 기능으로 재분류**(별도 IR). 원장(`ForeignVisitorPartner`)은 유지. `affiliate` 어휘 개명. `userAgentSummary` privacy 강화 검토.
5. **Neture/Dropshipping affiliate(§7)는 본 작업에서 건드리지 않는다.** 정비 PR 범위가 해당 패키지/모듈로 새지 않도록 경계 고정.
6. **코드 변경 전 본 IR 승인 + 축별 WO 분리.** 세 축을 한 PR로 묶지 않는다.

---

## 10. 후속 WO 후보

```text
WO-O4O-LEGACY-PARTNER-AFFILIATE-MOCK-DISABLE-V1   [A/B]
  - /api/partner legacy mock(commission/conversion/earnings) API 제거(또는 410 전환)
  - routes/partner.routes.ts + controllers/partner/partnerController.ts + register-routes.ts:85,361
  - frontend/테스트 무참조 재확인 후 삭제

WO-O4O-PARTNER-MODULE-APPLICATION-DEADCODE-RESOLVE-V1   [A]
  - modules/partner PartnerApplication 경로: 제거 또는 entities.ts 등록+migration으로 정식화
  - 반쪽(엔티티 미등록 + public POST) 상태 해소

WO-O4O-PARTNER-REGISTRY-SCOPE-ALIGNMENT-V1   [C]
  - modules/partner dashboard 명칭/도메인 정리(promoter 어휘), serviceId 하드코딩 env 외부화
  - O4O 관리자 / Neture 기반 파트너 원장 방향 정합성 점검

IR-O4O-FOREIGN-VISITOR-QR-AS-STORE-FEATURE-RECLASSIFICATION-V1   [D]
  - QrCode/QrScanEvent/landing 을 매장 안내·노출 기능으로 재분류
  - 원장(ForeignVisitorPartner) 분리, affiliate 어휘 개명, userAgentSummary privacy 강화

IR-O4O-SUPPLIER-INFLUENCER-PARTNER-PROMOTION-MODEL-V1   [향후]
  - 공급자-인플루언서형 제품 홍보 파트너 모델 기획 (V1 수수료 자동계산 제외)
```

---

## 11. 절대 금지 (본 정비 범위)

- 자동 수수료 계산 / POS 연동 / 가이드 정산 / PG 지급 / 소비자 구매 전환 추적 신규 구현
- 사업자 사이트 URL 기반 affiliate full flow 구현
- Neture B2B seller partner / dropshipping commission 시스템과 혼합·연결
- 외국인 관광객 QR을 Neture seller recruitment 와 연결

---

*Investigation only. 코드 변경은 본 IR 승인 후 축별 WO로 진행한다.*
