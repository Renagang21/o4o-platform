# IR-O4O-SELLER-RECRUITMENT-MODEL-RECONCILIATION-V1

> **유형**: Policy IR (read-only) — "판매자 모집 제품"의 정본 모델 결정. 코드/DB/route/UI **무변경**.
> **결정 질문**: 판매자 모집을 **(A) offer `PRIVATE`+allowedSellerIds** 로 볼지, **(B) `NeturePartnerRecruitment` 서브시스템**으로 볼지, 아니면 **(C) 둘을 브리지**할지.
> **권고: C(브리지) — 모집 승인 시 기존 계약(B) + offer.allowedSellerIds 추가 + 판매자 org OPL 생성으로 "주문 가능한 모집 제품" 완성.**
> **선행**: `IR-O4O-SUPPLIER-PRODUCT-SERVICE-REGISTRATION-TYPE-AUDIT-V1`(cab35f345) · 2026-06-15

---

## 1. 결정이 필요한 이유

현재 "판매자 모집"이 **두 곳에 분리 구현**되어 서로 연결돼 있지 않다. 구현 WO 를 시작하기 전 어느 쪽을 정본으로 둘지 확정해야, 신규 테이블 중복/충돌을 피한다.

## 2. 현재 상태 (감사 IR 근거)

| 축 | 위치 | 하는 일 | 빠진 것 |
|----|------|---------|---------|
| **(A) offer PRIVATE** | `SupplierProductOffer.distributionType=PRIVATE` + `allowedSellerIds[]` (offer.service.ts:1012 검증) | 제품 유통 범위를 특정 판매자로 제한 | **autoExpand 미적용 → OPL 자동생성 없음**, 신청 UI 없음 → 주문 연결 안 됨 |
| **(B) recruitment 서브시스템** | `NeturePartnerRecruitment`/`Application`/`NetureSellerPartnerContract` + `partner-recruitment.controller.ts` | 모집 게시→신청→승인→**계약+RBAC 'partner' role+대시보드**(partner-contract.service.ts:167-256) | **OPL/offer 미연결 → 제품이 주문 가능 상태가 되지 않음** |

→ (A)는 "유통 제한 모델만", (B)는 "관계/계약만". **둘 다 '모집 제품을 실제 주문 가능하게' 하는 마지막 연결이 없다.**

## 3. 옵션

### 옵션 A — offer PRIVATE 를 정본
- recruitment 서브시스템을 "allowedSellerIds 를 채우는 신청 UI"로 격하.
- 장점: 유통/주문 파이프라인(offer→OPL) 일원화. 단점: 이미 구현된 계약/RBAC/대시보드(B) 가치 약화·재작업.

### 옵션 B — recruitment 서브시스템을 정본
- offer PRIVATE/allowedSellerIds 미사용(또는 제거). 모집은 계약 기반으로만.
- 장점: 관계 모델 풍부. 단점: 제품을 **주문 가능**하게 하려면 결국 OPL 연결을 새로 설계해야 함(현재 부재).

### 옵션 C — 브리지 (권장)
- **둘 다 유지하고 연결**: 모집 신청 **승인 시** → ① 계약 생성(기존 B) + ② `offer.allowedSellerIds` 에 판매자 org 추가(A) + ③ 해당 판매자 org 에 **OPL 생성**(PRIVATE 전용 autoExpand 신설, is_active=false).
- 장점: 기존 두 구현 보존, 최소 신규(브리지 1지점 + PRIVATE autoExpand). 모집 제품이 주문 가능 상태로 round-trip 진입.
- 단점: PRIVATE 용 OPL 생성 경로 신규(소폭). 가격은 가격 IR 결정에 의존.

## 4. 권고

**옵션 C.** 근거: 운영자 승인(SERVICE) 흐름이 이미 `승인→autoExpand→OPL(is_active=false)→매장 활성화` round-trip 으로 완성돼 있으므로, 모집도 **동일 패턴**(승인→PRIVATE autoExpand→OPL)으로 맞추면 일관적이다. 계약/RBAC 레이어(B)는 "판매자 관계"로 유지, offer/OPL(A)는 "제품 주문 가능화"로 유지하되 **승인 1지점에서 브리지**.

## 5. 결정 후 영향 (구현 WO 예고, 본 IR 범위 아님)
- `WO-O4O-SUPPLIER-SELLER-RECRUITMENT-PRODUCT-FLOW-V1`: 승인 핸들러에 allowedSellerIds+OPL 브리지, PRIVATE autoExpand, 제품목록 `recruit` action(ready:true) 연결.
- 의약품 gate: 모집 제품이 약국 대상 서비스/판매자에만 연결되는지 점검(audit §8).

## 6. 비목표 / 제약
- 본 IR 은 결정 문서 — 코드/DB 무변경. distributionType 의미·offer_service_approvals SSOT·계약/RBAC 구조 변경 금지. 가격은 별도 IR.

## 7. 결정 필요
> **판매자 모집 정본을 A / B / C 중 무엇으로 할지.** (권고: C 브리지)

---

*Date: 2026-06-15 · Policy IR · 판매자 모집 = offer PRIVATE(A) vs recruitment 서브시스템(B) 이중화 → C(브리지: 승인 시 계약+allowedSellerIds+OPL) 권고. 코드 무변경.*
