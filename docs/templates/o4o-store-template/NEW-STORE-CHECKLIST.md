# O4O 새 매장 생성 체크리스트

> **Phase 8 확정 문서**
> 새로운 O4O 매장을 생성할 때 반드시 따라야 하는 체크리스트

## 사전 조건

- [ ] CLAUDE.md §7 (E-commerce Core 절대 규칙) 숙지
- [ ] CLAUDE.md §21 (O4O Store Template Rules) 숙지
- [ ] Reference Implementation (Cosmetics, Tourism) 코드 검토

---

## Phase 0: B2C 템플릿 선택

### 0.1 템플릿 선택 가이드

매장의 핵심 가치에 따라 적합한 B2C 템플릿을 선택합니다.

```
┌─────────────────────────────────────────────────────────────┐
│              매장의 핵심 가치는 무엇인가?                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ 전문성  │          │ 브랜드  │          │ 지역    │
   │ 신뢰    │          │ 감성    │          │ 친밀감  │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                    │                    │
        ▼                    ▼                    ▼
  Professional         Beauty              Local
  Service Store        Experience          Community
                       Store               Store
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────┴────────┐
                    │ 위 3개에 해당    │
                    │ 안 하면?         │
                    └────────┬────────┘
                             │
                             ▼
                      Modern Standard
                      Store (기본형)
```

### 0.2 템플릿별 특징

| 템플릿 | 핵심 가치 | 권장 업종 | 폴더 |
|--------|----------|----------|------|
| **Modern Standard** | 범용/확장 | 일반 쇼핑몰, MVP | `b2c-templates/modern-standard/` |
| **Professional Service** | 전문성/신뢰 | 약국, 헬스케어 | `b2c-templates/professional-service/` |
| **Beauty Experience** | 브랜드/감성 | 화장품, K-Beauty | `b2c-templates/beauty-experience/` |
| **Local Community** | 지역/친밀감 | 동네 가게, 지역 매장 | `b2c-templates/local-community/` |

### 0.3 템플릿 복사

선택한 템플릿을 매장 설정 폴더로 복사합니다.

```bash
# 예: Beauty Experience Store 사용
cp -r docs/templates/o4o-store-template/b2c-templates/beauty-experience \
      apps/api-server/src/routes/{store-name}/template-config
```

- [ ] B2C 템플릿 선택 완료
- [ ] 템플릿 폴더 복사 완료

> 📄 템플릿 상세: [B2C-TEMPLATE-INDEX.md](./b2c-templates/B2C-TEMPLATE-INDEX.md)

---

## Phase 1: 설계

### 1.1 도메인 정의
- [ ] 매장 이름 확정: `{store-name}`
- [ ] OrderType 값 확정: `{STORE_TYPE}`
- [ ] 매장 책임 범위 정의 (상품/콘텐츠/가격 등)

### 1.2 메타데이터 스키마 정의
- [ ] `{Store}OrderMetadata` 인터페이스 설계
- [ ] 필수 필드 확정
- [ ] 선택 필드 확정

### 1.3 테이블 설계
- [ ] `{store}_` prefix 테이블 목록 확정
- [ ] `{store}_orders` 테이블 **생성하지 않음** 확인
- [ ] Entity 관계도 작성

---

## Phase 2: OrderType 등록

### 2.1 enum 추가

**파일**: `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts`

```typescript
export enum OrderType {
  GENERIC = 'GENERIC',
  DROPSHIPPING = 'DROPSHIPPING',
  GLYCOPHARM = 'GLYCOPHARM',
  COSMETICS = 'COSMETICS',
  TOURISM = 'TOURISM',
  // 새 매장 추가
  {STORE_TYPE} = '{STORE_TYPE}',
}
```

- [ ] OrderType enum에 값 추가됨
- [ ] TypeScript 빌드 성공

---

## Phase 3: Entity 생성

### 3.1 상품/콘텐츠 Entity

**파일**: `apps/api-server/src/routes/{store-name}/entities/{store}-item.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
// ESM 호환: type-only import
import type { RelatedEntity } from './related.entity.js';

@Entity('{store}_items')
export class {Store}Item {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ... 도메인 필드

  // ESM 호환: 문자열 기반 관계
  @ManyToOne('RelatedEntity', 'items')
  @JoinColumn({ name: 'related_id' })
  related?: RelatedEntity;
}
```

체크리스트:
- [ ] `{store}_` prefix 테이블명 사용
- [ ] `type` 키워드로 관련 Entity import
- [ ] 문자열 기반 관계 데코레이터 사용
- [ ] TypeScript 빌드 성공

---

## Phase 4: Order Controller 생성

### 4.1 Controller 구현

**파일**: `apps/api-server/src/routes/{store-name}/controllers/{store}-order.controller.ts`

필수 패턴 확인:
- [ ] `checkoutService.createOrder()` 사용
- [ ] `OrderType.{STORE_TYPE}` 지정
- [ ] 직접 DB INSERT 없음
- [ ] 자체 Order Entity 없음

### 4.2 Route 연결

**파일**: `apps/api-server/src/routes/{store-name}/{store}.routes.ts`

- [ ] Order Controller 등록
- [ ] 인증 미들웨어 적용
- [ ] Scope 검증 적용 (`{store}:write`)

---

## Phase 5: 문서화

### 5.1 도메인 경계 문서

**파일**: `apps/api-server/src/routes/{store-name}/DOMAIN-BOUNDARY.md`

- [ ] 매장 책임 범위 명시
- [ ] Core 위임 사항 명시
- [ ] 금지 사항 명시

### 5.2 API 문서 (선택)

- [ ] OpenAPI 스펙 작성 (필요 시)
- [ ] 요청/응답 스키마 정의

---

## Phase 6: 검증

### 6.1 빌드 검증

```bash
cd apps/api-server
npx tsc --noEmit
```

- [ ] TypeScript 빌드 성공

### 6.2 금지 테이블 검사

```bash
node scripts/check-forbidden-tables.mjs
```

- [ ] 금지 패턴 검사 통과
- [ ] `{store}_orders` 테이블 없음 확인

### 6.3 기능 테스트

- [ ] 주문 생성 API 테스트
- [ ] `checkout_orders`에 저장 확인
- [ ] `orderType` 필드 값 확인
- [ ] 주문 조회 API 테스트

---

## 최종 확인

| 항목 | 확인 |
|------|------|
| OrderType enum 추가 | [ ] |
| checkoutService.createOrder() 사용 | [ ] |
| 자체 주문 테이블 없음 | [ ] |
| ESM 호환 Entity 패턴 | [ ] |
| CLAUDE.md §7 준수 | [ ] |
| DOMAIN-BOUNDARY.md 생성 | [ ] |
| TypeScript 빌드 성공 | [ ] |
| 금지 테이블 검사 통과 | [ ] |

---

## 참조

- [STORE-TEMPLATE-README.md](./STORE-TEMPLATE-README.md)
- [ORDER-DELEGATION.md](./ORDER-DELEGATION.md)
- [DOMAIN-BOUNDARY.md](./DOMAIN-BOUNDARY.md)
- [CLAUDE.md §7](../../../CLAUDE.md) - E-commerce Core 절대 규칙
- [CLAUDE.md §21](../../../CLAUDE.md) - O4O Store Template Rules

---

*Phase 8 (2026-01-11) - O4O Store Template Standardization*
