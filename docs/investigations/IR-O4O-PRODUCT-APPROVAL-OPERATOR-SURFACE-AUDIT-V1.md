# IR-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-AUDIT-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** 공급 상품 신청(`product_approvals` PENDING)을 **운영자가 승인하는 UI/route/API surface** 가 실제로 존재하는지 3서비스에서 확인.
> **작성일:** 2026-06-13 · 기준 HEAD `43c34bc2b`
> **선행:** `IR-O4O-PRODUCT-APPROVAL-TO-OPL-CROSSSERVICE-AUDIT-V1`(승인→OPL backend 공통, OPL is_active=false[V2 path], 승인 operator surface 미확정 E/D)

---

## 0. 핵심 결론 (Executive Summary)

| 질문 | 답 |
|------|-----|
| 운영자가 `product_approvals`(PENDING)을 승인하는 UI 가 있는가? | **KPA 만 있다.** `/operator/product-applications`(`ProductApplicationManagementPage`) — `kpa:operator` guard. **GlycoPharm·K-Cosmetics 는 없음**(다른 승인 화면뿐). |
| 그 승인 API 는? | KPA: `PATCH /api/v1/kpa/operator/product-applications/:id/approve\|reject` (+ batch). `requireAuth + requireScope('kpa:operator')` |
| KPA 승인 시 OPL 상태는? | **`is_active=true` 즉시 활성화** — KPA 라우트는 **직접 SQL** 로 OPL upsert(active=true) + 해당 offer 의 kpa-society listings 일괄 활성화. (`operator-product-applications.controller.ts:160-188`) |
| ⚠ 선행 IR 정정 | 선행 IR 의 "승인 시 OPL is_active=false (3서비스 공통)" 는 **product-policy-v2 internal(X-Admin-Secret) path 한정**. **KPA operator approve 는 V2 서비스를 우회한 직접 SQL 로 OPL 을 active=true** 로 만든다. 두 승인 경로의 OPL 활성 상태가 **다르다**. |
| GP/K-Cos 의 PENDING 은 누가 승인? | **operator UI 없음** → 유일 경로는 `product-policy-v2.internal.routes` 의 `POST /api/internal/v2/product-policy/service-approval/:id/approve` (**X-Admin-Secret + ENABLE_INTERNAL_V2** 전용). 운영자 self-service 불가. |
| Neture/EventOffer/멤버십 승인과 혼동? | **아니오.** 모두 별도 테이블·엔드포인트(§7). `product_approvals` 와 무관. |
| 가장 중요한 발견 | **승인 operator surface 가 KPA-only(A), GP·KCos 부재(D).** + **승인 구현 분기**(KPA direct-SQL active=true vs V2 internal active=false) 라는 정합성 이슈(C/D). KPA 승인 화면조차 **사이드바 메뉴 미노출**(대시보드/직접 진입). |

**핵심:** 신청→승인→OPL **backend 서비스(`ProductApprovalV2Service`)는 공유**지만, **승인을 실제로 트리거하는 operator surface 는 KPA 에만 존재**하고 그 KPA 경로는 V2 서비스를 우회해 OPL 을 즉시 활성화한다. **GP·KCos 는 신청(PENDING)은 생성되나 이를 승인할 operator UI 가 없어 internal(X-Admin-Secret) 외 승인 수단이 없다.**

---

## 1. 목적

운영자 승인 화면/route/API 노출 여부를 3서비스에서 확인하고, 부재 시 후속 설계 WO 범위를 확정한다. Neture offer_service_approvals·EventOffer·Market Trial 승인과 분리. read-only.

## 2. 선행 기준

- 신청 = `product_approvals`(PENDING) [SERVICE/PRIVATE]. 승인 = APPROVED + OPL.
- 선행 IR: 승인→OPL backend 공통(`ProductApprovalV2Service`), V2 path OPL `is_active=false`. **본 IR 에서 KPA operator path 는 active=true 로 정정.**
- 혼동 금지: Neture `offer_service_approvals` / EventOffer / Market Trial(유통참여형 펀딩) / 멤버십 ≠ `product_approvals` 승인.

## 3. 조사 범위

frontend operator/admin pages·routes·menus·api clients (KPA/GP/KCos) + backend product-policy-v2/kpa operator routes + 타 승인 레이어. (정확 경로 코드 기준)

---

## 4. Phase 1 — frontend route/menu surface

| 서비스 | page/route | menu | 승인 대상 테이블 | product_approvals 승인? |
|--------|-----------|------|------------------|:---:|
| **KPA** | `ProductApplicationManagementPage.tsx` → **`/operator/product-applications`** | **사이드바 미노출**(대시보드/직접) | **`product_approvals`** | **✅ YES** |
| GlycoPharm | `StoreApprovalsPage.tsx` → `/operator/store-approvals` | 노출 | `store_applications`(매장 가입) | ❌ (멤버십) |
| GlycoPharm | `EventOfferApprovalsPage` → `/operator/event-offers` | 노출 | event offer | ❌ (이벤트) |
| K-Cosmetics | `EventOfferApprovalsPage.tsx` → `/operator/event-offers` | 노출 | event offer | ❌ (이벤트) |
| (참고) Neture | `OperatorProductApprovalPage`/`ProductServiceApprovalPage` | 미노출/operator | neture 공급자/서비스 승인(offer_service_approvals 계열) | ❌ (Neture 공급 레이어) |

**판정:** **KPA 만** `product_approvals` 운영자 승인 화면 보유(단 사이드바 미노출). GP·KCos 의 "승인"화면은 매장가입/이벤트오퍼 — supply-catalog 승인 아님.

---

## 5. Phase 2 — frontend API client

| 서비스 | client method | endpoint | auth | product_approvals? |
|--------|---------------|----------|------|:---:|
| KPA | approve/reject/batch (ProductApplicationManagementPage 내) | `PATCH /operator/product-applications/:id/approve\|reject`, `POST .../batch-approve\|batch-reject\|batch-delete` | operator 세션(authClient) | ✅ |
| GlycoPharm | (product_approvals 승인 client 없음) | — | — | ❌ |
| K-Cosmetics | (product_approvals 승인 client 없음) | — | — | ❌ |

**판정:** product_approvals 승인 client 는 **KPA 만** 보유. X-Admin-Secret 은 프론트에서 사용하지 않음(KPA 는 operator 세션 인증).

---

## 6. Phase 3 — backend route/auth

| endpoint | method | auth | service/구현 | OPL 결과 | operator-facing |
|----------|--------|------|--------------|----------|:---:|
| `/api/internal/v2/product-policy/service-approval/:id/approve` | POST | **X-Admin-Secret** (`requireAdminSecret`, `ENABLE_INTERNAL_V2=true` 조건 mount) | `ProductApprovalV2Service.approveServiceProduct()` | **`is_active=false`** | ❌ internal only |
| `/api/internal/v2/product-policy/private-approval/:id/approve` | POST | X-Admin-Secret | `approvePrivateProduct()` | is_active=false | ❌ |
| **`/api/v1/kpa/operator/product-applications/:id/approve`** | PATCH | **`requireAuth + requireScope('kpa:operator')`** | **직접 SQL**(`operator-product-applications.controller.ts:142-200`) | **`is_active=true`**(OPL upsert active=true + offer 의 kpa-society listings 일괄 active=true, :160-188) | **✅ KPA operator** |
| `/api/v1/kpa/operator/product-applications/:id/reject` (+ batch) | PATCH/POST | `kpa:operator` | reject 은 `ProductApprovalV2Service.rejectServiceApproval()` | — | ✅ KPA |
| `/api/v1/kpa/pharmacy/products/applications`·`/approved` | GET | `requireAuth + requirePharmacyOwner` | 조회 only | — | (store owner 읽기) |
| `/api/v1/kpa/pharmacy/products/apply` | POST | requirePharmacyOwner | create(PENDING) | — | (신청) |

**판정:**
- **승인 노출 경로 = 2종, 동작 상이:** (a) internal X-Admin-Secret(V2 서비스, OPL **false**), (b) **KPA operator(`kpa:operator`, 직접 SQL, OPL true)**.
- **GP·KCos 에는 operator-facing approve route 가 mount 되지 않음** — `/operator/product-applications` 컨트롤러는 **KPA 만**(`kpa.routes.ts:246`). 따라서 GP·KCos PENDING 은 internal(X-Admin-Secret) 외 승인 불가.
- store owner(pharmacy)는 승인 불가(조회·신청만).

---

## 7. Phase 4 — 다른 승인 surface 와의 분리

| 승인 종류 | table/entity | operator endpoint | product_approvals 관계 |
|-----------|--------------|-------------------|:---:|
| Neture offer-service 승인 | `offer_service_approvals` | `PATCH /api/v1/neture/operator/service-approvals/:id/approve` (`neture:operator`) | **무관**(공급자/서비스 단 승인. 승인 시 auto-listing OPL is_active=false) |
| Event Offer 승인 | event offer 계열 | `/operator/event-offers`(GP·KCos), groupbuy/supplier | **무관** |
| 매장 가입/멤버십 | `store_applications` / members | GP `/operator/store-approvals`, KPA `/kpa/applications`·members(admin) | **무관** |
| 약국 서비스 신청 | pharmacy_requests 계열 | `/kpa/pharmacy-requests` | **무관** |
| 콘텐츠/사이니지 승인 | hub content / signage campaign | `/kpa/operator/approvals` | **무관** |

**판정:** 위 5종은 모두 `product_approvals` 와 **별도 테이블·엔드포인트**. supply-catalog 승인과 혼동 없음. (단 Neture offer_service_approvals 도 OPL 을 만들지만 is_active=false, 공급자 레이어 — store 신청 승인과 다름.)

---

## 8. Phase 5 — 승인 후 활성화/진열 surface

| 서비스 | OPL 활성화 | 채널 진열(OPC) | 주문 가능 전환 | 판정 |
|--------|-----------|----------------|----------------|:---:|
| **KPA** | **승인 시 자동 active=true**(operator approve 직접 SQL) | 별도(채널 진열 OPC is_active + channel APPROVED) | OPL active 자동 + 채널 진열 필요 | A(승인=활성, but storefront 미구현) |
| GlycoPharm | operator approve 부재 → OPL 활성화 트리거 없음(internal 승인 시 is_active=false → 별도 활성화 필요) | `PUT /pharmacy/products/listings/:id`(공통, operator UI 연결 미확인) | 소비자 storefront(4-gate) 존재하나 승인 진입 자체가 internal-only | D |
| K-Cosmetics | 동상(operator approve 부재) | 〃 | 소비자 storefront 미구현 | D |

**판정:** KPA 는 승인이 곧 OPL 활성화(즉시 active). GP·KCos 는 operator 승인 자체가 없어 활성화 흐름이 운영자 손에서 끊김(internal 승인 시 OPL inactive → 별도 활성화 UI 연결도 미확인).

---

## 9. Phase 6 — operator surface 판정

| 영역 | KPA | GlycoPharm | K-Cosmetics | 판정 | 후속 |
|------|-----|-----------|-------------|:---:|------|
| product_approvals 승인 operator UI | ✅ 있음(메뉴 미노출) | ❌ 없음 | ❌ 없음 | **A / D / D** | GP·KCos surface 설계 |
| 승인 API auth | `kpa:operator` | — | — | A / D / D | — |
| 승인 구현 일관성 | **직접 SQL, OPL active=true** | (V2 internal, false) | (V2 internal, false) | **C/D** | KPA direct-SQL vs V2 서비스 통일 검토 |
| 승인 화면 메뉴 노출 | ❌ 미노출 | — | — | **B**(KPA polish) | 사이드바 노출 검토 |
| 승인 후 활성화 흐름 | 자동(active) | 끊김(internal+inactive) | 끊김 | A / D / D | GP·KCos 활성화 UI |
| 타 승인 레이어 분리 | 명확 | 명확 | 명확 | A | — |

**종합:** **승인 operator surface = KPA-only(A), GP·KCos 부재(D).** 부가로 (i) KPA 승인 구현이 공유 `ProductApprovalV2Service` 를 우회한 직접 SQL 이고 OPL active 상태가 V2 path 와 상반(C/D 정합 이슈), (ii) KPA 승인 화면이 사이드바 미노출(B). → backend 승인 서비스는 "공유"지만 **operator 진입·동작은 KPA 특수**.

---

## 10. 후속 작업

| 우선 | WO/IR 후보 | 분류 | 내용 |
|:---:|-----------|:---:|------|
| 1 | `IR-O4O-PRODUCT-APPROVAL-OPERATOR-FLOW-DECISION-V1` | D | GP·KCos 에 product_approvals **operator 승인 surface 를 부여할지** 결정(사업 정책). 부여 시 KPA `/operator/product-applications` 패턴 재사용 vs 신규 |
| 2 | `WO-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1` | C/D | KPA operator approve(직접 SQL, OPL active=true) ↔ `ProductApprovalV2Service.approveServiceProduct()`(OPL false) **단일 구현/일관 active 정책으로 통일** |
| 3 | `WO-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1` | B | KPA `/operator/product-applications` 사이드바 노출(현재 미노출) — route/기능 존재하므로 데드링크 아님 |
| 4 | `IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1` | C | 승인 후 OPL 활성화+채널 진열 정책 3서비스 문서화(선행 IR 후속 유지) |
| 5 | `WO-O4O-SUPPLY-CATALOG-APPROVAL-FLOW-DOCUMENTATION-V1` | — | 신청→승인→활성화→진열→주문가능 end-to-end 운영자 가이드 |

> 핵심 결정: **GP·KCos 에 승인 operator surface 를 줄 것인가**(1) + **승인 구현/활성 정책 통일**(2). 두 결정이 Supply Catalog 운영 흐름 완성의 갈림길.

---

## 11. 결론

- **product_approvals 운영자 승인 surface 는 KPA 에만 존재**(`/operator/product-applications`, `kpa:operator`, approve/reject/batch). **GlycoPharm·K-Cosmetics 는 없다**(그쪽 "승인"화면은 매장가입·이벤트오퍼로 별개).
- **KPA 승인 경로는 공유 `ProductApprovalV2Service` 를 우회한 직접 SQL** 로 **OPL 을 즉시 active=true** 로 만들고 해당 offer 의 kpa-society listings 를 일괄 활성화한다 → **선행 IR 의 "OPL is_active=false 공통"은 V2 internal path 한정으로 정정**.
- **GP·KCos PENDING 신청은 operator UI 가 없어 internal(X-Admin-Secret, `ENABLE_INTERNAL_V2`) 외 승인 수단이 없다** → 운영자 self-service 불가.
- 승인 레이어 분리는 명확(Neture offer_service_approvals/EventOffer/멤버십/약국요청/콘텐츠 = 별도).
- 후속 핵심: ① GP·KCos 승인 operator surface 부여 결정(D), ② KPA direct-SQL vs V2 서비스 승인 구현·OPL active 정책 통일(C/D), ③ KPA 승인 화면 메뉴 노출(B).

---

## 12. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-AUDIT-V1.md`)
- [x] 코드/DB/migration/route/UI/API 변경 없음 (read-only), production write 없음
- [x] Phase 1 frontend surface / Phase 2 client / Phase 3 backend auth / Phase 4 타 승인 분리 / Phase 5 활성화 / Phase 6 판정
- [x] KPA approve 구현 직접 확인(`operator-product-applications.controller.ts:142-200` 직접 SQL, OPL active=true) — 선행 IR(OPL false) 정정
- [x] GP·KCos operator approve surface 부재 확인
- [x] 후속 WO/IR 분리 (§10)
- [x] 다른 세션 WIP(forum-detail-primitives 등) 미접촉

---

*End of IR-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-AUDIT-V1*
