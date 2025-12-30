# OpenAPI → TypeScript Types Automation 정의서

> **Status**: Active (Phase 12 확정)
> **Created**: 2025-12-29
> **Location**: `scripts/generators/openapi-types-generator.ts`

---

## 1. 개요

OpenAPI Types Automation은 **OpenAPI 스펙을 TypeScript 타입으로 자동 변환**하여
**계약-타입-코드 일관성을 강제**하는 시스템이다.

### 1.1 목적

| Before (수동) | After (자동) |
|--------------|-------------|
| 타입 수동 정의 | OpenAPI → 자동 생성 |
| 스펙-코드 불일치 | 자동 동기화 |
| 타입 위반 런타임 발견 | 빌드 시점 차단 |
| 계약 변경 누락 | CI에서 강제 검증 |

### 1.2 설계 원칙

1. **OpenAPI = 단일 진실 원본**: 타입은 스펙에서만 유도
2. **자동 생성 only**: 수동 타입 정의 금지
3. **CI 강제**: 불일치 시 빌드 실패
4. **재생성 우선**: 타입 수정 대신 스펙 수정 후 재생성

---

## 2. 파이프라인 구조

### 2.1 흐름도

```
┌────────────────────┐
│ docs/services/     │
│ {service}/         │
│ openapi.yaml       │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ openapi-typescript │
│ (openapi-typescript)│
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ packages/api-types/│
│ src/{service}.ts   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Web/Admin 코드     │
│ import { cosmetics }│
│ from '@o4o/api-types'│
└────────────────────┘
```

### 2.2 입출력 경로

| 항목 | 경로 |
|------|------|
| Input (OpenAPI) | `docs/services/{service}/openapi.yaml` |
| Output (Types) | `packages/api-types/src/{service}.ts` |
| Package | `@o4o/api-types` |

---

## 3. 사용법

### 3.1 전체 서비스 타입 생성

```bash
pnpm run generate:api-types
```

### 3.2 특정 서비스만 생성

```bash
pnpm run generate:api-types:cosmetics
# 또는
npx tsx scripts/generators/openapi-types-generator.ts --service=cosmetics
```

### 3.3 OpenAPI 검증

```bash
pnpm run validate:openapi
```

---

## 4. 생성된 타입 사용법

### 4.1 Import 패턴

```typescript
// Namespace import (권장)
import { cosmetics } from '@o4o/api-types';

// 타입 사용
type Product = cosmetics.components['schemas']['ProductSummary'];
type ProductDetail = cosmetics.components['schemas']['ProductDetail'];
type ProductStatus = cosmetics.components['schemas']['ProductStatus'];

// API 응답 타입
type ProductListResponse = cosmetics.components['schemas']['ProductListResponse'];
```

### 4.2 Convenience Types

```typescript
// 자주 사용되는 타입 직접 import
import {
  CosmeticsProduct,
  CosmeticsProductDetail,
  CosmeticsBrand,
  CosmeticsProductStatus,
} from '@o4o/api-types';
```

### 4.3 Operations 타입

```typescript
import { cosmetics } from '@o4o/api-types';

// API 작업 타입
type CreateProductOp = cosmetics.operations['createProduct'];
type CreateProductRequest = CreateProductOp['requestBody']['content']['application/json'];
type CreateProductResponse = CreateProductOp['responses']['201']['content']['application/json'];
```

---

## 5. 타입 소유권 규칙

### 5.1 핵심 원칙

| 항목 | 규칙 |
|------|------|
| **타입 생성** | 자동 생성 only |
| **직접 수정** | ❌ 절대 금지 |
| **변경 방법** | OpenAPI 수정 → 재생성 |
| **참조 규칙** | Web/Admin은 반드시 api-types 참조 |

### 5.2 금지 사항

| 금지 | 이유 |
|------|------|
| `apps/*` 내부 타입 정의 | 계약 동기화 파괴 |
| 생성된 타입 파일 수정 | 재생성 시 소실 |
| OpenAPI 없이 타입 추가 | 계약 위반 |
| 로컬 interface 정의 | api-types 우회 |

---

## 6. CI 검증 단계

### 6.1 검증 파이프라인

```yaml
# .github/workflows/ci.yml 예시

jobs:
  api-types-check:
    steps:
      # 1. OpenAPI 문법 검증
      - name: Validate OpenAPI specs
        run: pnpm run validate:openapi

      # 2. 타입 재생성
      - name: Generate API types
        run: pnpm run generate:api-types

      # 3. 변경 감지 (생성된 타입이 커밋되어 있는지 확인)
      - name: Check for uncommitted type changes
        run: |
          if [ -n "$(git status --porcelain packages/api-types/)" ]; then
            echo "❌ Generated types are out of sync with OpenAPI specs"
            echo "Run 'pnpm run generate:api-types' and commit the changes"
            exit 1
          fi
```

### 6.2 실패 조건

| 조건 | 결과 |
|------|------|
| OpenAPI 문법 오류 | CI 실패 |
| 타입 재생성 후 diff 존재 | CI 실패 |
| 타입 빌드 실패 | CI 실패 |

---

## 7. 개발 워크플로우

### 7.1 API 변경 시

```bash
# 1. OpenAPI 스펙 수정
vim docs/services/cosmetics/openapi.yaml

# 2. 타입 재생성
pnpm run generate:api-types

# 3. 변경사항 확인
git diff packages/api-types/

# 4. 커밋 (스펙과 타입 함께)
git add docs/services/cosmetics/openapi.yaml
git add packages/api-types/
git commit -m "feat(cosmetics): add new product field"
```

### 7.2 타입 오류 발생 시

```bash
# ❌ 잘못된 방법: 생성된 타입 수정
# vim packages/api-types/src/cosmetics.ts  # 금지!

# ✅ 올바른 방법: OpenAPI 스펙 수정
vim docs/services/cosmetics/openapi.yaml
pnpm run generate:api-types
```

---

## 8. 지원 서비스

### 8.1 현재 지원

| 서비스 | OpenAPI 경로 | 상태 |
|--------|-------------|------|
| cosmetics | `docs/services/cosmetics/openapi.yaml` | ✅ Active |

### 8.2 예정

| 서비스 | OpenAPI 경로 | 상태 |
|--------|-------------|------|
| yaksa | `docs/services/yaksa/openapi.yaml` | Planned |
| dropshipping | `docs/services/dropshipping/openapi.yaml` | Planned |

---

## 9. 관련 도구

### 9.1 openapi-typescript

- **역할**: OpenAPI → TypeScript 변환
- **버전**: 7.x
- **문서**: https://openapi-ts.dev/

### 9.2 Redocly CLI

- **역할**: OpenAPI 스펙 검증
- **명령**: `pnpm run validate:openapi`

---

## 10. 트러블슈팅

### 10.1 타입 생성 실패

```bash
# OpenAPI 문법 확인
pnpm run validate:openapi

# 상세 오류 확인
npx openapi-typescript docs/services/cosmetics/openapi.yaml -o /dev/null
```

### 10.2 Import 오류

```typescript
// ❌ 잘못된 import
import { ProductSummary } from '@o4o/api-types';

// ✅ 올바른 import
import { cosmetics } from '@o4o/api-types';
type ProductSummary = cosmetics.components['schemas']['ProductSummary'];

// 또는 convenience types 사용
import { CosmeticsProduct } from '@o4o/api-types';
```

---

## 11. 관련 문서

- [Web Extension Generator](./web-extension-generator.md) - Phase 10
- [Web Admin Generator](./web-admin-generator.md) - Phase 11
- [API Contract Enforcement](../../CLAUDE.md#14-api-contract-enforcement-rules) - CLAUDE.md §14
- [CLAUDE.md §21](../../CLAUDE.md#21-openapi--types-automation-rules) - 자동화 규칙

---

*Created: 2025-12-29*
*Phase: 12*
*Status: Active*
