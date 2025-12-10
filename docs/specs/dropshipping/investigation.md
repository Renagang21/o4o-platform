# Dropshipping Investigation Summary

**버전:** 2.0.0
**상태:** Completed

---

## 1. 개요

드랍쉬핑 시스템 조사 결과 요약입니다.
상세 조사 내용은 아카이브되었으며, 핵심 발견사항만 기록합니다.

---

## 2. 시스템 현황

### 아키텍처

```
┌─────────────────────────────────────────────┐
│              dropshipping-core              │
├─────────────────────────────────────────────┤
│  Entities: Supplier, Partner, ProductLink,  │
│            Order, Commission, Settlement    │
├─────────────────────────────────────────────┤
│  Services: CommissionEngine, Tracking,      │
│            Payment, Webhook, Operations     │
└─────────────────────────────────────────────┘
```

### 규모

| 항목 | 수량 |
|------|------|
| Entities | 11개 |
| Services | 6개 |
| API Routes | 20+ |
| DB Tables | 20+ |

---

## 3. 주요 발견사항

### 강점

- Entity 기반 SSOT 전환 완료
- 커미션 자동화, 트래킹, 결제 통합 완료
- 멱등성 키 도입으로 결제 중복 방지
- 봇 탐지 및 레이트 리미팅 구현

### 개선 필요

| 항목 | 상태 | 비고 |
|------|------|------|
| 타입 중복 | 해결 중 | SSOT로 통합 진행 |
| API 경로 불일치 | 해결됨 | `/api/v1/` 통일 |
| 정산 로직 | 진행 중 | Settlement 프로세스 구현 |

---

## 4. AppStore 연동

### Core/Extension 구조

```
dropshipping-core (Core App)
    └── dropshipping-cosmetics (Extension App)
            └── SellerOps, PartnerOps (Service Apps)
```

### Manifest 등록

- CPT: product-link, order-link, settlement
- ACF: 상품/주문/정산 관련 필드
- View: 목록/상세/대시보드 View

---

## 5. 권장사항

1. **타입 통합**: 중복 타입을 `@o4o/types`로 통합
2. **API 표준화**: 모든 API를 `/api/v1/` prefix로 통일
3. **Extension 패턴**: 특화 기능은 Extension App으로 분리
4. **문서 동기화**: 코드 변경 시 스펙 문서 함께 업데이트

---
*최종 업데이트: 2025-12-10*
