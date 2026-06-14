# O4O Supply Catalog Approval Flow Guide V1

> **대상 독자:** 서비스 운영자 · 운영팀 · 운영자 가이드 페이지 작성자
> **버전:** V1 (2026-06-14)
> **정책 근거:** [IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1](../investigations/IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1.md)

## 1. 이 문서의 목적

매장 경영자가 공급 상품 카탈로그에서 신청한 상품을 운영자가 검토·승인하는 흐름과,
**승인이 곧 소비자 노출(판매)을 의미하지 않는다**는 점을 운영자 기준으로 설명한다.
KPA / GlycoPharm / K-Cosmetics 운영자가 동일 기준으로 이해하도록 한다.

## 2. 핵심 용어

| 용어 | 의미 |
|------|------|
| 공급 상품 | 플랫폼 공급 카탈로그(B2B)의 상품(공급자 offer) |
| 공급 상품 신청 | 매장 경영자가 자기 매장에서 취급하려고 신청한 것 (`ProductApproval` PENDING) |
| 공급 상품 신청 승인 | 운영자가 신청을 검토·승인 (`ProductApproval` APPROVED) |
| O4O 주문 가능 상품 | 승인으로 내 매장 주문 가능 상품에 **편입 자격**을 얻은 상품 (OPL `is_active=true`) |
| 진열 / 채널 진열 | 상품을 특정 채널에 등록(OPC) — 소비자 노출의 한 조건 |
| 소비자 노출 | 소비자 storefront 에 실제로 보이고 주문 가능한 상태 (여러 gate 충족 시) |

## 3. 전체 흐름 요약

```
매장 경영자: 공급 상품 신청
   → ProductApproval(PENDING)
운영자: "공급 상품 신청 승인" 화면에서 검토
   → 승인 → ProductApproval(APPROVED)
   → 신청 매장의 OPL is_active=true (내 매장 주문 가능 상품 편입)
   → (별도) 채널 진열 + 채널 승인 등 gate 충족 시 소비자 노출
```

## 4. 매장 경영자의 신청 단계

- 매장 경영자는 공급 상품 카탈로그에서 취급하고 싶은 상품을 신청한다.
- 신청은 `ProductApproval` 레코드(PENDING) 로 기록된다(매장·상품 단위).
- 이 시점에는 아직 주문 가능 상품이 아니다(운영자 승인 대기).

## 5. 운영자의 승인 단계

- 운영자는 사이드바 **승인 → "공급 상품 신청 승인"** 화면에서 신청 목록을 본다.
- 각 신청을 **승인 / 거절** 하거나, 여러 건을 일괄 처리할 수 있다.
- 승인 시 해당 신청 **매장 단건**의 OPL 이 `is_active=true` 가 된다.
- **per-store 단건 활성**이 원칙이다 — 한 건을 승인해도 같은 offer 를 신청한 다른 매장이 함께 켜지지 않는다.

## 6. 승인 후 O4O 주문 가능 상품 편입

- 승인 = 그 매장이 해당 상품을 **내 매장 O4O 주문 가능 상품으로 편입할 수 있도록 허용**한 것.
- OPL `is_active=true` = **주문 가능 상품 편입 자격**.
- 실제 주문 가능 여부는 서비스의 주문/계약/진열 정책을 함께 따른다.

## 7. 소비자 storefront 노출과의 차이

> **승인 ≠ 소비자에게 즉시 판매/노출.**

소비자 노출은 OPL active 외에 **별도 gate** 를 추가로 통과해야 한다:

```
offer active (공급자 offer 활성)
OPL active (내 매장 주문 가능 편입)
OPC (상품-채널 매핑/진열)
organization_channels APPROVED (매장 채널 승인)
[+ 공급 계약(supply contract) 승인]
```

즉 **승인은 "편입 자격" 부여까지**이고, **소비자 노출은 진열·채널 승인 단계**가 더 필요하다.

## 8. 서비스별 현재 상태

| 서비스 | 승인→편입 | 소비자 노출 gate |
|--------|:---:|------|
| **GlycoPharm** | ✅ | ✅ 4-gate(offer active + OPL active + OPC + 채널 APPROVED [+공급계약]) checkout 강제 |
| **KPA** | ✅ | ✅ checkout(공급계약 + 채널 APPROVED + OPL/offer active). B2C 채널 성숙도는 GP 대비 부분 |
| **K-Cosmetics** | ✅ | ⚠️ 주문이 local/travel 채널 모델 — B2C 4-gate 와 구조가 다름(별도 정책 IR 예정) |

승인·편입(OPL active)은 **3서비스 공통**, 소비자 노출 gate 는 **서비스별 성숙도 차이**가 있다.

## 9. 운영자가 주의할 점

- 승인했다고 소비자에게 바로 보이지 않는다 — 진열/채널 단계가 별도다.
- 승인은 신청한 **그 매장**에만 적용된다(다른 매장 자동 활성 아님).
- 거절 사유는 매장이 확인할 수 있으니 명확히 남긴다.
- 신청 이력 삭제는 기록만 제거하며, 이미 승인된 매장 진열 상품은 유지된다.

## 10. FAQ

**Q. 승인하면 바로 소비자에게 보이나요?**
A. 아닙니다. 승인 시 OPL `is_active=true`(주문 가능 상품 편입 자격)가 되지만, 소비자 노출은 채널 진열(OPC)·채널 승인 등 별도 gate 가 필요합니다.

**Q. 승인하면 매장이 바로 주문할 수 있나요?**
A. O4O 주문 가능 상품 편입 자격을 얻습니다. 실제 주문 가능 여부는 해당 서비스의 주문·계약·진열 정책을 함께 따릅니다.

**Q. 왜 offer 전체를 한 번에 활성화하지 않나요?**
A. 각 매장의 신청·승인을 기준으로 **per-store 단건** 활성화합니다. offer-wide 일괄 활성화는 승인 의미를 과도하게 확장하므로 사용하지 않습니다.

**Q. KPA / GlycoPharm / K-Cosmetics 가 다 같나요?**
A. 신청→승인→편입은 동일합니다. 소비자 노출(진열) 단계는 서비스별 성숙도가 다릅니다(§8).

## 11. 후속 정책 문서

- [IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1](../investigations/IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1.md) — 정책 SSOT.
- IR-O4O-KCOS-STOREFRONT-ORDERABLE-PRODUCT-GATE-V1 (예정) — KCos 채널 gate.
- IR-O4O-KPA-STOREFRONT-ORDERABLE-PRODUCT-GATE-V1 (예정) — KPA storefront gate.

---
*End of O4O Supply Catalog Approval Flow Guide V1*
