# IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1

> **유형:** Investigation Report (read-only, 정책 고정)
> **작성일:** 2026-06-14
> **변경:** 없음 (코드/DB/migration/UI 무수정 — 본 문서 1건만 생성)
> **상태:** ✅ 정책 고정 완료. 서비스별 성숙도 차이는 후속 IR/WO 로 분리.

## 1. 목적

O4O "주문 가능 상품" 활성화 정책을 3서비스(KPA / GlycoPharm / K-Cosmetics) 기준으로 문서 고정.
핵심: **OPL `is_active=true` (내 매장 주문 가능 상품 편입 자격)** 과 **소비자 storefront 진열(채널 gate)** 의 분리.

## 2. 선행 기준

- `WO-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1` — approve canonical = `ProductApprovalV2Service.approveServiceProduct(activateListing:true)`.
- `WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1` — GP/KCos operator 승인 surface.
- `WO-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1` — 3서비스 메뉴 정렬.

## 3. 핵심 개념

| 개념 | 정의 |
|------|------|
| **OPL** | `organization_product_listings` — 매장/조직이 O4O 공급 상품을 자기 매장 상품으로 채택한 기록 (organization_id, service_key, offer_id, master_id, **is_active**). |
| **OPL `is_active=true`** | **내 매장 O4O 주문 가능 상품 편입 자격.** operator/store-owner 관리 화면에서 주문 가능 상품으로 취급 가능한 상태. **소비자 즉시 노출 아님.** |
| **OPC** | `organization_product_channels` — OPL 상품을 특정 채널에 매핑한 기록(채널별 진열 단위). |
| **channel(조직 채널)** | `organization_channels` — 매장의 판매 채널(B2C 등). `status='APPROVED'` 필요. |
| **Storefront gate** | 소비자-facing 노출/주문 = (offer active) + (OPL active) + (OPC 매핑) + (organization_channels APPROVED) [+ supply contract APPROVED]. OPL active 단독으로는 불충분. |

## 4. Phase 1 — OPL active 의미

OPL `is_active` write 경로 — [product-approval-v2.service.ts](../../apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts):

| 경로 | 위치 | is_active | 정책 의미 |
|------|------|:---:|------|
| SERVICE operator 승인 + `activateListing:true` | L181-193 SAVEPOINT UPSERT | **true** | 운영자 승인 = 신청 매장 단건 OPL 주문 가능 편입 (canonical) |
| SERVICE internal/V2 기본 (`activateListing:false`) | L203-213 | false | 내부 호출은 편입 자격 미부여(보존) |
| `activateOfferListings:true` (offer-wide) | L229 UPDATE | true | **operator 경로 미사용**(offer-wide 일괄 금지) |
| PUBLIC apply `createPublicListing` | L557-565 | **false** | PUBLIC 은 즉시 listing 생성하나 **is_active=false**(주문 가능 아님, 별도 활성 필요) |
| 해제(취소/제외) | L497 | false | 편입 자격 회수 |

**판정:** OPL `is_active=true` 의 canonical 부여 경로는 **operator 의 SERVICE 승인**(`approveServiceProduct(activateListing:true)`). PUBLIC apply 는 listing 만 생성(inactive). → "승인 = 주문 가능 편입" 모델이 명확.

## 5. Phase 2 — 승인 후 흐름

| 단계 | entity/status | 의미 | 사용자-facing 표현 |
|------|------|------|------|
| 신청 | `product_approvals` PENDING | 매장이 공급 상품 신청 | 공급 상품 신청 |
| 승인 | `product_approvals` APPROVED | 운영자 2차 심사 통과 | 공급 상품 신청 승인 |
| 편입 | OPL `is_active=true` | 내 매장 주문 가능 상품 편입 | 내 매장 주문 가능 상품 |
| 채널 매핑 | OPC 생성 + organization_channels APPROVED | 채널에 진열 등록 | 채널 진열 |
| 노출 | 4-gate 충족 | 소비자 주문 가능 | 소비자 노출 / 진열 |

`pharmacy-products.controller.ts /apply` → distribution_type 분기(SERVICE→createServiceApproval, PUBLIC→createPublicListing, PRIVATE→createPrivateApproval). SERVICE 만 operator 승인으로 active=true.

## 6. Phase 3 — storefront gate

소비자-facing 주문 gate (GP/KPA checkout 에서 서버 강제):

| gate | 출처 | 비고 |
|------|------|------|
| supply contract APPROVED | guardResult / `SUPPLY_CONTRACT_NOT_APPROVED` (GP [checkout.controller.ts](../../apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts) L283, KPA [kpa-checkout.controller.ts](../../apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts) L249) | 공급 계약 |
| organization_channels APPROVED | GP L290-293(B2C), KPA L256-259 (`status='APPROVED'`) | 채널 승인 |
| OPL active + offer active | KPA L288-312 (`spo.is_active`, inactiveProducts 거부) | 주문 가능 편입 |
| OPC 매핑(channel status APPROVED) | [store-channel-products.controller.ts](../../apps/api-server/src/routes/o4o-store/controllers/store-channel-products.controller.ts) L72 `requireApproved` | 채널 진열 단위 |

| 서비스 | storefront/주문 gate 구현 | gate |
|--------|------|------|
| GlycoPharm | ✅ checkout 4-gate | supply contract + organization_channels B2C APPROVED + OPL/offer active + OPC |
| KPA | ✅ kpa-checkout | supply contract + organization_channels APPROVED + OPL/offer active |
| K-Cosmetics | ⚠️ cosmetics-order = local/travel 채널 모델 | `organization_channels APPROVED` gate 부재(검색 0건). OPL active gate 미노출 — **다른 commerce 모델**(tourism/local) |

## 7. Phase 4 — 서비스별 성숙도

| 영역 | KPA | GlycoPharm | K-Cosmetics | 판정 | 후속 |
|------|-----|-----------|------------|------|------|
| operator 승인 → OPL active | ✅ | ✅ | ✅ | A (3서비스 공통 컨트롤러) | — |
| 주문 가능 편입(OPL active 관리) | ✅ | ✅ | ✅ | A | — |
| storefront/주문 channel gate | ✅ (kpa-checkout) | ✅ (4-gate) | ⚠️ 다른 모델 | KPA **B** / GP **A** / KCos **D** | KCos gate IR |

- **GlycoPharm = A**: 승인→편입→4-gate checkout 일관.
- **KPA = B**: 승인→편입→checkout(supply contract + channel APPROVED + OPL active). B2C 채널 성숙도는 GP 대비 부분.
- **K-Cosmetics = D(정책/구현 분리 필요)**: 승인→편입은 공통이나, 주문은 local/travel 채널 모델로 B2C 4-gate 와 구조가 다름. OPL active↔주문 gate 연결을 별도 IR 로 확정 필요.

## 8. Phase 5 — 용어 기준

| 개념 | 권장 표현 | 피해야 할 표현 | 이유 |
|------|----------|----------|------|
| 신청 | 공급 상품 신청 | 판매자 모집 | 매장이 신청 주체 |
| 승인 | 공급 상품 신청 승인 | B2C 승인 / 상품 판매 승인 | 운영자 2차 심사 |
| OPL active | 내 매장 O4O 주문 가능 상품 / 주문 가능 상품 편입 | 승인 즉시 판매 / 승인 즉시 소비자 노출 | active=편입 자격, 노출 아님 |
| 채널 진열 | 진열 / 채널 진열 | (혼용된 '판매') | OPC + 채널 승인 단위 |
| 소비자 노출 | 소비자 노출 | 승인 즉시 노출 | 4-gate 필요 |

## 9. Final Policy

| 정책 항목 | 결정 | 근거 |
|----------|------|------|
| P1 | operator 승인 시 OPL `is_active=true` 가 canonical | approveServiceProduct(activateListing:true) L181-193 |
| P2 | OPL `is_active=true` = 내 매장 O4O 주문 가능 상품 편입 자격 (소비자 노출 아님) | OPL 의미 + checkout gate 분리 |
| P3 | 소비자 storefront 노출/주문 = 별도 channel(organization_channels APPROVED) + OPC + offer active gate 필요 | GP/KPA checkout 강제 |
| P4 | GP 4-gate 패턴(supply contract + channel APPROVED + OPL/offer active + OPC)을 storefront 기준 후보로 고정 | GP checkout.controller |
| P5 | KPA/KCos storefront 성숙도 차이는 backend 승인/OPL 정책과 **분리** — 승인/편입은 3서비스 공통, 노출 gate 는 서비스별 | Phase 4 |
| P6 | offer-wide 일괄 활성(activateOfferListings)은 operator 경로에서 금지(per-store 단건만) | 선행 WO + L229 미사용 |

## 10. 후속 작업

```
WO-O4O-SUPPLY-CATALOG-APPROVAL-FLOW-DOCUMENTATION-V1   (운영자 end-to-end 가이드)
WO-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-COPY-ALIGNMENT-V1  (용어 정렬)
IR-O4O-KCOS-STOREFRONT-ORDERABLE-PRODUCT-GATE-V1      (KCos local/travel ↔ OPL active 연결)
IR-O4O-KPA-STOREFRONT-ORDERABLE-PRODUCT-GATE-V1       (KPA B2C 채널 성숙도)
```

## 11. 결론

- OPL `is_active=true` = **내 매장 O4O 주문 가능 상품 편입 자격**, canonical 부여 경로 = operator SERVICE 승인. PUBLIC apply 는 inactive listing 만 생성.
- 소비자 storefront 노출은 **별도 4-gate**(offer active + OPL active + OPC + organization_channels APPROVED [+ supply contract]) 통과 필요 — OPL active 와 분리.
- GP=A / KPA=B / KCos=D(다른 채널 모델) — 승인·편입은 3서비스 공통, 노출 gate 는 서비스별 성숙도 분리.
- 정책 P1-P6 고정. 운영자 가이드 및 KCos/KPA storefront gate 는 후속.

---
*End of IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1*
