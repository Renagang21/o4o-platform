# ESM Circular Dependency — Analysis & Closure

**Date**: 2026-01-11 | **Status**: ✅ CLOSED | **Scope**: Platform-Wide TypeORM Entity Fix

---

## 문제

API Server가 ESM 순환 의존으로 기동 실패:

```
ReferenceError: Cannot access 'CosmeticsProduct' before initialization
```

**원인 3요소**:
1. ESM 모듈 (`"type": "module"`)
2. `emitDecoratorMetadata: true` → `__metadata("design:type", Class)` 생성
3. TypeORM 양방향 관계에서 직접 클래스 import

ESM에서 순환 import 시 클래스가 초기화 전 참조되어 `ReferenceError` 발생.

---

## 해결 패턴 (FROZEN — CLAUDE.md §4)

```typescript
// ❌ BROKEN
import { RelatedEntity } from './related.entity.js';
@ManyToOne(() => RelatedEntity, (e) => e.property)

// ✅ FIXED
import type { RelatedEntity } from './related.entity.js';
@ManyToOne('RelatedEntity', 'property')
```

**원리**:
- `import type` → 런타임에서 제거, 순환 참조 차단
- string decorator → `__metadata` 미생성, 초기화 순서 무관

---

## 수정 범위 (22 entity files)

| 도메인 | 파일 수 | 순환 관계 |
|--------|---------|-----------|
| Cosmetics | 4 | Brand ↔ Line ↔ Product ↔ PricePolicy |
| Yaksa | 3 | Category ↔ Post ↔ PostLog |
| Glycopharm | 5 | Pharmacy ↔ Product, Order ↔ OrderItem |
| GlucoseView | 6 | Vendor ↔ Connection, Branch ↔ Chapter |
| Neture | 4 | Supplier ↔ Product, Partnership ↔ Product |
| KPA | 0 | (self-ref는 자체 해결) |

---

## 검증 결과

- ✅ AppDataSource 초기화 성공
- ✅ 66+ 엔티티 로드, 순환 오류 0건
- ✅ 양방향 relation 정상 (Yaksa 7/7 테스트 통과)
- ✅ CLAUDE.md §4 규칙 등록 (FROZEN)

**위반 시**: API 서버 기동 실패 → 즉시 롤백 대상

---

## 실패한 대안

| 시도 | 결과 |
|------|------|
| Index.js barrel export | ❌ 엔티티 내부 직접 import 남아있어 무효 |
| `emitDecoratorMetadata: false` | ❌ TypeORM 컬럼 타입 추론 불가 |
| 양방향 관계 제거 | ❌ 서비스 코드 전면 수정 필요, 비현실적 |

---

## Self-Referencing 패턴 (참고)

```typescript
// KPA Organization — 자기 참조 트리
import type { KpaOrganization as KpaOrganizationType } from './kpa-organization.entity.js';

@ManyToOne('KpaOrganization', 'children')
parent?: KpaOrganizationType;

@OneToMany('KpaOrganization', 'parent')
children?: KpaOrganizationType[];
```

---

*Merged from: Analysis V01 + Closure V01 (2026-01-11)*
