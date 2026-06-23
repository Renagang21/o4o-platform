# CHECK-O4O-FOREIGN-VISITOR-PARTNER-MODEL-V1

> **작업명:** WO-O4O-FOREIGN-VISITOR-PARTNER-MODEL-V1
> **유형:** backend model/API + migration. frontend UI 는 후속 `WO-O4O-FOREIGN-VISITOR-PARTNER-MANAGEMENT-UI-V1` 로 분리.
> **결과: PASS(코드/타입) — `ForeignVisitorPartner` 마스터 + CRUD API(org+serviceKey 스코프, 쓰기 entitlement gate) + migration. Neture seller partner 와 도메인 분리. QR/landing/scan 미구현. api-server tsc 0. migration 은 main 배포 시 CI 실행.**
> **작성일:** 2026-06-23
> 선행: IR-O4O-FOREIGN-VISITOR-PARTNER-QR-AFFILIATE-MODEL-V1 (§10 데이터 모델, §14 경계)

---

## 1. git 상태 / 다른 세션 WIP

- HEAD `0de1d4090`(선행 IR) 기준. `git pull` Already up to date.
- 변경 파일 = 본 WO 범위만(아래 §3). 다른 세션 WIP `apps/mobile-app/` **미접촉**. path-specific 커밋.

## 2. 신규 entity / table

- **`ForeignVisitorPartner`** (`foreign_visitor_partners`) — 외국인 관광객 유입 파트너 마스터.
- 소유 축: `organization_id`(Store Ops Boundary) + `service_key`('kpa'|'glycopharm'|'cosmetics', /me/check 와 동일).
- 컬럼: id, service_key, organization_id, partner_type, partner_name, contact_name?, contact_phone?, contact_email?, status(default ACTIVE), memo?, created_by?, updated_by?, created_at, updated_at, **deleted_at?(soft delete)**.
- `partnerType`: TRAVEL_AGENCY | GUIDE | HOTEL | BUS_OPERATOR | MEDICAL_TOUR_COORDINATOR | OTHER.
- `status`: ACTIVE | INACTIVE (**승인 workflow 없음** — PENDING/APPROVED/REJECTED V1 제외).
- index: (org, service_key) · (service_key, status) · (partner_type).
- migration `20261121000000-CreateForeignVisitorPartnersTable` (CREATE TABLE IF NOT EXISTS + 3 index). entity 등록 `database/entities.ts`.

## 3. 변경 파일 (backend 4 + CHECK)

| 파일 | 변경 |
|------|------|
| `modules/foreign-visitor-partner/foreign-visitor-partner.entity.ts` | **신규** entity + 타입/상수 |
| `modules/foreign-visitor-partner/foreign-visitor-partner.service.ts` | **신규** CRUD(list 필터/페이지네이션, getById, create, update, setStatus) — 전부 org+serviceKey 스코프 |
| `modules/foreign-visitor-partner/foreign-visitor-partner.routes.ts` | **신규** GET `/` · GET `/:id` · POST `/` · PATCH `/:id` · PATCH `/:id/status` |
| `database/migrations/20261121000000-CreateForeignVisitorPartnersTable.ts` | **신규** migration |
| `database/entities.ts` · `bootstrap/register-routes.ts` | entity/route 등록(additive) |

## 4. API 목록 (mount `/api/v1/foreign-visitor/partners`)

| Method | path | 설명 | gate |
|------|------|------|------|
| GET | `/?serviceKey=&status=&partnerType=&search=&page=&limit=` | 목록(pagination) | 조회(불요) |
| GET | `/:partnerId?serviceKey=` | 상세 | 조회(불요) |
| POST | `/` body `{serviceKey, partnerType, partnerName, contactName?, contactPhone?, contactEmail?, memo?}` | 생성(status=ACTIVE) | **ENTITLEMENT** |
| PATCH | `/:partnerId` body `{serviceKey, ...수정필드}` | 부분 수정 | **ENTITLEMENT** |
| PATCH | `/:partnerId/status` body `{serviceKey, status}` | 상태 변경(INACTIVE 등) | **ENTITLEMENT** |

- 응답 표준 `{success, data, [pagination]}`. hard delete 미제공(상태 INACTIVE).

## 5. 권한 / 소유권

- 전 라우트 `requireAuth` + `isStoreOwner(serviceKey)` → organizationId. **client storeId 미수신**(body/query 의 storeId 미신뢰 — serviceKey 만 받아 서버가 org 해석).
- 자기 store(org+serviceKey)의 partner 만 조회/수정. 다른 storeId 접근 불가(스코프 where 조건). operator/admin 임의 등록 route 없음(V1 제외).

## 6. entitlement gate (후보 A 채택)

- **조회(GET 목록/상세)**: entitlement 불요 — 구독 전에도 기능 설명/기존 상태 노출 가능.
- **쓰기(POST/PATCH/status)**: `StorePaidFeatureEntitlementService.hasActiveEntitlement(org, serviceKey, FOREIGN_VISITOR_SALES_SUPPORT)` ACTIVE 필요. 미보유 → **403 ENTITLEMENT_REQUIRED**.

## 7. 경계 — Neture partner 와 분리 (§14 IR)

- 신규 코드에서 `NetureSellerPartnerContract`/`partner-recruitment`/`partner-commission`/`seller recruitment` **import/재사용 0**(grep 매칭은 boundary 주석뿐).
- 독립 테이블/네임스페이스(`modules/foreign-visitor-partner`, `foreign_visitor_partners`). 결제/커미션 정산과 무관.

## 8. 비구현 확인 (이번 WO 범위 밖)

- ✅ QR 생성 / AFFILIATE_MARKETING 템플릿 / QR 다운로드 **미구현**.
- ✅ QR 스캔 랜딩 / scan event / 방문·구매 전환 / 수수료 / POS·DSL 연동 **미구현**.
- (후속 PartnerQrCode 가 partner_id 로 참조하도록 모델만 준비.)

## 9. 보존 경계 (정적)

- ✅ STORE_SERVICE_SUBSCRIPTION prepare/confirm · Toss · PaymentCore · `o4o_payments` · `store_paid_feature_entitlements` schema **무변경**(read 재사용만).
- ✅ STORE_SALE_PAYMENT 410 / 소비자 checkout / Neture B2B / product approval **미접촉**.
- ✅ multilingual landing publicKey / QR 생성 로직 **미접촉**.

## 10. 검증

- api-server `tsc --noEmit`: **EXIT 0**.
- migration: additive CREATE TABLE — main 배포 시 CI 자동 실행. 기존 테이블/데이터 무변경.
- ESM Entity 규칙: 관계 미사용(단일 마스터) — decorator 위반 없음.

### 배포 후 API smoke (예정)
1. store-owner(kpa) 로그인 → `GET /foreign-visitor/partners?serviceKey=kpa` → 200 빈 목록.
2. `POST /` (ACTIVE 이용권 보유 시) → 201 / 미보유 시 **403 ENTITLEMENT_REQUIRED**.
3. `PATCH /:id`, `/:id/status` → 200 / 미보유 403.
4. 비-owner → 403 NOT_STORE_OWNER. 다른 serviceKey → org 불일치로 빈/404.
> 생성 smoke 는 데이터 생성 → local/staging 권장. 운영은 read-only(GET) 확인 위주.

## 11. 후속 WO

```
WO-O4O-FOREIGN-VISITOR-PARTNER-MANAGEMENT-UI-V1   매장 경영자 파트너 관리 화면(목록/등록/수정)
WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1   partner_id 기반 QR 생성(generateQrSvg 재사용)
WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1       partnerId/qrCodeId 식별 랜딩(다국어 landing 연결)
WO-O4O-FOREIGN-VISITOR-QR-SCAN-EVENT-V1           익명 스캔 이벤트(ipHash)
```

---

*Date: 2026-06-23 · ForeignVisitorPartner 마스터(foreign_visitor_partners) + CRUD API(org+serviceKey 스코프, client storeId 미신뢰) + 쓰기 entitlement gate(후보 A) + soft delete/INACTIVE · Neture seller partner 도메인 분리(재사용 0) · QR/landing/scan 미구현 · 결제/STORE_SALE_PAYMENT/Neture B2B 무변경 · api-server tsc 0 · migration CI · frontend 후속 분리.*
