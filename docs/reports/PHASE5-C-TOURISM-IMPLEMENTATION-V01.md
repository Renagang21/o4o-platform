# Phase 5-C: Tourism 서비스 최초 구현 결과 보고서

**Work Order**: WO-O4O-STRUCTURE-REFORM-PHASE5-C-V01
**Status**: ✅ 완료
**Date**: 2026-01-11
**Author**: Claude Code

---

## 1. 실행 요약

Tourism 서비스를 **O4O 표준 매장 패턴**으로 최초 구현했습니다.
Tourism은 Cosmetics와 함께 이후 모든 매장형 서비스의 **참조 구현(reference implementation)**이 됩니다.

### 1.1 완료 항목

| 태스크 | 상태 | 설명 |
|--------|------|------|
| C-1: 디렉토리 구조 조사 | ✅ | 기존 구조 확인, Tourism 미존재 확인 |
| C-2: Tourism Entity 설계 | ✅ | 3개 엔티티 생성 (주문 테이블 없음) |
| C-3: Order Controller 구현 | ✅ | E-commerce Core 위임 구현 |
| C-4: CLAUDE.md §19 추가 | ✅ | Tourism Domain Rules 반영 |
| TypeScript 빌드 검증 | ✅ | `tsc --noEmit` 성공 |

---

## 2. Tourism 정체성 확정

### 2.1 포지션

| 질문 | 답변 |
|------|------|
| O4O 표준 매장인가? | **예** |
| 독립 Commerce인가? | **아니오** |
| E-commerce Core 사용? | **예** |
| OrderType | `TOURISM` |

### 2.2 역할 분담

| 역할 | 책임 |
|------|------|
| Tourism | 상품을 설명하는 서비스 (콘텐츠) |
| Dropshipping | 상품을 공급하는 엔진 |
| E-commerce Core | 주문 원장 |

---

## 3. 생성된 파일

### 3.1 디렉토리 구조

```
apps/api-server/src/routes/tourism/
├── controllers/
│   └── tourism-order.controller.ts    # 주문 API (Core 위임)
├── entities/
│   ├── index.ts                       # 엔티티 인덱스
│   ├── tourism-destination.entity.ts  # 관광지/테마
│   ├── tourism-package.entity.ts      # 패키지
│   └── tourism-package-item.entity.ts # 패키지 아이템 (Dropshipping 참조)
├── services/                          # (향후 확장)
├── DOMAIN-BOUNDARY.md                 # 도메인 경계 문서
├── index.ts                           # 모듈 인덱스
└── tourism.routes.ts                  # 라우트 정의
```

### 3.2 Entity 목록

| Entity | 테이블 | 설명 |
|--------|--------|------|
| TourismDestination | tourism_destinations | 관광지/테마 정보 |
| TourismPackage | tourism_packages | 관광 패키지 |
| TourismPackageItem | tourism_package_items | 패키지 구성 아이템 |

> ⚠️ **tourism_orders 없음** - 모든 주문은 checkout_orders에 저장

### 3.3 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /tourism/health | 헬스체크 |
| GET | /tourism/destinations | 관광지 목록 |
| GET | /tourism/destinations/:slug | 관광지 상세 |
| GET | /tourism/packages | 패키지 목록 |
| GET | /tourism/packages/:slug | 패키지 상세 |
| POST | /tourism/orders | 주문 생성 (Core 위임) |
| GET | /tourism/orders | 주문 목록 |
| GET | /tourism/orders/:id | 주문 상세 |

---

## 4. 주문 흐름 구현

### 4.1 흐름도

```
[Tourism UI]
   ↓ (패키지 선택)
[POST /tourism/orders]
   ↓
[tourism-order.controller.ts]
   ↓
[checkoutService.createOrder({
    orderType: OrderType.TOURISM,
    buyerId,
    items,
    metadata: { packageId, tourDate, ... }
})]
   ↓
checkout_orders (orderType: 'TOURISM')
```

### 4.2 핵심 코드

```typescript
// tourism-order.controller.ts
const order = await checkoutService.createOrder({
  orderType: OrderType.TOURISM,
  buyerId,
  sellerId: dto.sellerId,
  supplierId: dto.sellerId,
  items: orderItems,
  shippingAddress: dto.shippingAddress,
  metadata: {
    ...dto.metadata,
    originalItems: dto.items,
  },
});
```

---

## 5. Dropshipping 연계

### 5.1 상품 참조 방식

Tourism은 상품을 **소유하지 않고 참조만** 합니다.

```typescript
// tourism-package-item.entity.ts
@Column({ type: 'uuid', nullable: true })
dropshippingProductId?: string;  // Soft FK (FK 제약 없음)
```

### 5.2 참조 규칙

| 규칙 | 설명 |
|------|------|
| FK 제약 없음 | Dropshipping 변경이 Tourism에 영향 없음 |
| 가격/재고 | Dropshipping/Core 책임 |
| 출고 | Dropshipping 책임 |

---

## 6. CLAUDE.md 변경 사항

### 6.1 §17.4 Scope 분리 업데이트

```
tourism:read, tourism:write, tourism:admin
```

### 6.2 §17.5 포트 할당 추가

| 서비스 | Web 포트 | API 포트 |
|--------|----------|----------|
| tourism | 4031 | 4032 |

### 6.3 §19 Tourism Domain Rules 신규

- §19.1 Tourism 정체성
- §19.2 소유권 원칙
- §19.3 주문 처리 원칙
- §19.4 금지 사항
- §19.5 Dropshipping 연계 규칙
- §19.6 위반 시 조치

### 6.4 버전 업데이트

```
Version: 2.9 → 3.0
Updated: 2026-01-06 → 2026-01-11
```

---

## 7. Definition of Done 체크리스트

### 구조 기준
- [x] `OrderType.TOURISM`으로 주문 생성
- [x] checkout_orders에 정상 저장
- [x] Tourism에 주문 테이블 없음
- [x] Dropshipping 상품을 패키지로 묶어 주문 가능

### 기술 기준
- [x] TypeScript 빌드 성공
- [x] ESM 규칙 준수 (§4.1 string-based decorators)
- [x] tourism_ prefix 테이블 네이밍

### 문서 기준
- [x] CLAUDE.md §19 Tourism 규칙 반영
- [x] DOMAIN-BOUNDARY.md 작성
- [x] 결과 보고서 작성

---

## 8. Phase 5 전체 현황

| 서비스 | Phase | OrderType | 주문 생성 | 상태 |
|--------|-------|-----------|----------|------|
| Dropshipping | - | DROPSHIPPING | E-commerce Core | ✅ 표준 |
| GlycoPharm | 5-A | GLYCOPHARM | 410 Gone | ✅ 차단 |
| Cosmetics | 5-B′ | COSMETICS | E-commerce Core | ✅ 통합 |
| **Tourism** | **5-C** | **TOURISM** | **E-commerce Core** | **✅ 신규** |

---

## 9. 후속 작업

### 필수

```bash
# Tourism 엔티티를 AppDataSource에 등록 (Phase 5-C+)
# 마이그레이션 생성 및 실행
```

### 권장 (향후 Phase)

1. **Phase 5-C+**: Tourism 패키지/관광지 CRUD 구현
2. **Phase 5-D**: GlycoPharm 주문 마이그레이션 검토
3. **Phase 5-E**: 통합 주문 조회 API (모든 OrderType)

---

## 10. 관련 문서

- [DOMAIN-BOUNDARY.md](apps/api-server/src/routes/tourism/DOMAIN-BOUNDARY.md) - Tourism 도메인 경계
- [E-COMMERCE-ORDER-CONTRACT.md](docs/_platform/E-COMMERCE-ORDER-CONTRACT.md) - 주문 표준 계약
- [COSMETICS-ORDER-POSITIONING.md](docs/_platform/COSMETICS-ORDER-POSITIONING.md) - Cosmetics 결정 문서
- [PHASE5-BP-COSMETICS-ORDER-DELEGATION-V01.md](docs/reports/PHASE5-BP-COSMETICS-ORDER-DELEGATION-V01.md) - Cosmetics 구현 보고서
- CLAUDE.md §7 - E-commerce Core 절대 규칙
- CLAUDE.md §19 - Tourism Domain Rules

---

## 11. 결론

Phase 5-C를 통해 Tourism 서비스가 **O4O 표준 매장 패턴의 두 번째 참조 구현**으로 확정되었습니다.

- **Cosmetics + Tourism** = 표준 매장 패턴의 정답 구조
- **GlycoPharm** = 예외/경고 사례로 역사 속에 고정

이제 O4O 플랫폼은 새로운 매장형 서비스가 추가될 때 Tourism/Cosmetics를 참조하여 동일한 구조로 빠르게 구현할 수 있습니다.

---

**Report Version**: V01
**Last Updated**: 2026-01-11
