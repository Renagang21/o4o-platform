# NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3

## 1. 선언 목적

본 문서는 Neture 도메인의 핵심 실행 흐름이
구조적으로 닫혀 있으며,
임의 변경이 불가한 Core 상태임을 선언한다.

Freeze 범위:

```text
Layer 1 ~ Layer 4
```

Campaign은 Layer 5로 별도 관리한다.

---

## 2. Neture 도메인 핵심 흐름

```text
[Layer 1] Supplier Registration / Approval
        ↓
[Layer 2] Supplier Offer ↔ ProductMaster
        ↓
[Layer 3] Distribution → Listing
        ↓
[Layer 4] Order Gate (createOrder)
        ↓
[Layer 5] Campaign (Overlay)
```

Layer 1~4는 실행 레이어다.
Layer 5는 가격/프로모션 오버레이 레이어다.

---

## 3. Layer별 구조 요약

### Layer 1 — Supplier Gate

보장 사항:

- supplier.status === ACTIVE 인 경우에만 Offer 생성 가능
- 승인 전 상태에서는 Listing/Order 불가

변경 시 Core 변경으로 간주한다.

### Layer 2 — Offer ↔ ProductMaster Gate

보장 사항:

- master_id NOT NULL + FK RESTRICT
- ProductMaster barcode UNIQUE
- resolveOrCreateMaster() 단일 생성 파이프라인
- 외부 masterId 직접 주입 불가
- Immutable 필드 보호

이 레이어는 상품 단일성을 강제한다.

### Layer 3 — Distribution Gate

보장 사항:

- PUBLIC: 승인 시 자동 확산
- SERVICE: 서비스 승인 경로 통과 필수
- PRIVATE: allowedSellerIds 검증 필수
- Listing은 offer_id NOT NULL + FK CASCADE
- 승인 상태 필터 SQL 존재
- 승인 전 Listing 생성 불가
- 모든 생성 경로 Offer 검증 포함

DistributionType은 구조적으로 강제된다.

### Layer 4 — Order Gate

보장 사항:

- offer.isActive === true
- offer.approvalStatus === APPROVED
- supplier.status === ACTIVE
- distributionType 재검증
  - PRIVATE → allowedSellerIds 포함 필수
  - SERVICE → organizationId 검증 필수
- 가격은 서버 DB 기준 재계산
- client price 무시
- quantity 정수 + 1~1000 범위 검증
- order + items 단일 트랜잭션

이 레이어는 금전 흐름을 보호한다.

---

## 4. 구조적 불변 원칙

다음 항목은 Core 변경으로 간주된다.

1. master_id nullable 변경
2. GTIN UNIQUE 제거
3. resolveOrCreateMaster 우회 경로 추가
4. DistributionType 검증 제거
5. Order에서 DB 가격 재조회 제거
6. 트랜잭션 제거
7. supplier.status 검증 제거

위 항목 변경은 Freeze 위반이다.

---

## 5. 허용되는 변경

다음은 허용 범위:

- UI 변경
- Campaign 정책 변경
- 가격 정책 조정
- DTO 확장
- 조회 최적화
- 로그 추가

단, Layer 1~4 게이트 논리에는 영향 없어야 한다.

---

## 6. 위험 지점 점검 완료 내역

| 레이어 | 상태 |
|--------|------|
| Supplier Gate | SAFE |
| Master Gate | SAFE |
| Distribution Gate | SAFE |
| Order Gate | SAFE |

구조적 취약점 없음.

---

## 7. 최종 선언

Neture 도메인은

```text
STRUCTURALLY CLOSED
CORE STABLE
FREEZE APPROVED
```

상태로 판정한다.

---

## 8. 관련 WO 이력

| WO | 내용 |
|----|------|
| WO-O4O-PRODUCT-MASTER-CORE-RESET-V1 | ProductMaster SSOT + SupplierProductOffer 구조 |
| WO-NETURE-LAYER2-MASTER-PIPELINE-ENFORCEMENT-V1 | barcode 기반 파이프라인 강제, masterId 직접 주입 차단 |
| WO-NETURE-LAYER4-ORDER-GATE-HARDENING-V1 | DistributionType 재검증 + quantity 검증 + 트랜잭션 원자성 |
| WO-NETURE-CAMPAIGN-SIMPLIFICATION-V2 | Campaign 단순화 (Layer 5) |
| WO-NETURE-CAMPAIGN-INTEGRITY-FIX-V3 | Campaign 무결성 강화 (Layer 5) |

---

*Frozen: 2026-03-01*
*Version: 3.0*
*Status: FREEZE APPROVED*
