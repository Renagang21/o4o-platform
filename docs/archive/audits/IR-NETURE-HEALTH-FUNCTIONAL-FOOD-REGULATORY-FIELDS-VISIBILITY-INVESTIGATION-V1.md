# IR-NETURE-HEALTH-FUNCTIONAL-FOOD-REGULATORY-FIELDS-VISIBILITY-INVESTIGATION-V1

**조사일**: 2026-04-05
**조사 도구**: 코드 정적 분석 + Playwright API 호출 (라이브 데이터 검증)
**조사 대상**: 건강기능식품 카테고리 선택 시 `regulatoryName`/`mfdsPermitNumber` 필드 미표시 현상

---

## 판정

```
근본 원인: 확정 (DB 데이터 불일치)
수정 난이도: 낮음 (SQL UPDATE 1건)
영향 범위: 건강기능식품 + 하위 6개 카테고리 + 의료소모품 + 하위 2개
```

---

## 1. 현상 재현

### Playwright 관측 결과 (IR-NETURE-SUPPLIER-SAMPLE-PRODUCT-REGISTRATION-VERIFY-V1에서 발견)

| 카테고리 | `select[name="regulatoryType"]` 수 | `regulatoryName` 필드 | `mfdsPermitNumber` 필드 |
|---------|:--:|:--:|:--:|
| **건강기능식품** | 1 (항상표시) | ❌ 미표시 | ❌ 미표시 |
| **의약외품** | 2 (항상표시 + 규제섹션) | ✅ 표시 | ✅ 표시 |

`regulatoryName`/`mfdsPermitNumber` 필드는 `{isRegulated && (` 조건부 렌더링 블록 안에 있다.
건강기능식품 선택 시 이 블록이 렌더링되지 않는다.

---

## 2. 코드 경로 분석

### 2.1 프론트엔드 렌더링 조건

**파일**: `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx`

```
Line 142: const flatCats = flattenCategories(categories);
Line 143: const selectedCategory = flatCats.find((c) => c.id === form.categoryId);
Line 144: const isRegulated = selectedCategory?.isRegulated ?? false;
...
Line 531: {isRegulated && (
             <regulatoryType select> + <regulatoryName input> + <mfdsPermitNumber input>
           )}
```

**결론**: 프론트엔드 로직은 정상. `isRegulated` 값이 `true`이면 필드가 표시된다.

### 2.2 `flattenCategories` 함수

**파일**: `SupplierProductCreatePage.tsx:51-63`

```typescript
function flattenCategories(categories: CategoryTreeItem[], depth = 0) {
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name, depth, isRegulated: cat.isRegulated });
    // ...children 재귀
  }
}
```

**결론**: `cat.isRegulated`를 정확히 전달. 문제 없음.

### 2.3 API 응답 (CategoryTreeItem)

**파일**: `services/web-neture/src/lib/api/product.ts:35`

```typescript
export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  isRegulated: boolean;  // ← 정의됨
  children: CategoryTreeItem[];
}
```

**파일**: `apps/api-server/src/modules/neture/services/catalog.service.ts:270-277`

```typescript
async getCategoryTree(): Promise<ProductCategory[]> {
  const all = await this.categoryRepo.find({ order: { depth: 'ASC', sortOrder: 'ASC', name: 'ASC' } });
  // ...spread operator로 전체 entity 반환 → isRegulated 포함
}
```

**결론**: API는 DB의 `isRegulated` 값을 그대로 반환. 문제 없음.

### 2.4 Entity 정의

**파일**: `apps/api-server/src/modules/neture/entities/ProductCategory.entity.ts:58`

```typescript
@Column({ name: 'is_regulated', type: 'boolean', default: false })
isRegulated: boolean;
```

**결론**: 컬럼 정의 정상.

---

## 3. DB 데이터 검증 (라이브 프로덕션)

### 3.1 API 호출 결과

Playwright로 로그인 후 `GET https://api.neture.co.kr/api/v1/neture/categories` 호출:

| 카테고리 | slug | isRegulated (라이브) | isRegulated (시드) | 불일치 |
|---------|------|:---:|:---:|:---:|
| **건강기능식품** | `health-functional` | **false** | true | ⚠️ **불일치** |
| 비타민/미네랄 | `hf-vitamin-mineral` | **false** | true | ⚠️ **불일치** |
| 프로바이오틱스 | `hf-probiotics` | **false** | true | ⚠️ **불일치** |
| 기타 (오메가3) | `hf-omega3` | **false** | true | ⚠️ **불일치** |
| 홍삼/인삼 | `hf-ginseng` | **false** | true | ⚠️ **불일치** |
| 콜라겐/미용 | `hf-collagen` | **false** | true | ⚠️ **불일치** |
| 기타 건강식품 | `hf-etc` | **false** | true | ⚠️ **불일치** |
| **의약외품** | `quasi-drug` | **true** | true | ✅ 일치 |
| **의료소모품** | `medical-supply` | **false** | true | ⚠️ **불일치** |
| 위생/방역 | `ms-hygiene` | **false** | true | ⚠️ **불일치** |
| 기타 의료소모품 | `ms-etc` | **false** | true | ⚠️ **불일치** |
| 주사/인슐린 | `ms-injection` | **true** | true | ✅ 일치 |

**불일치 건수**: 10개 카테고리

---

## 4. 근본 원인 (Root Cause)

### 마이그레이션 실행 순서와 `ON CONFLICT DO NOTHING`의 충돌

| 마이그레이션 | 시점 | 내용 |
|------------|------|------|
| `20260307200000` | 최초 | `product_categories` 테이블 생성 (**`is_regulated` 컬럼 없음**) |
| (운영 중 카테고리 데이터 생성) | 중간 | Operator 등이 카테고리 생성 — `is_regulated` 없는 상태 |
| `20260323500000` | 후속 | `ALTER TABLE ADD COLUMN is_regulated BOOLEAN DEFAULT false` → **기존 모든 행에 `false` 설정** |
| `20260323700000` | 후속 | `INSERT ... is_regulated = true ... ON CONFLICT (slug) DO NOTHING` → **slug 이미 존재하여 INSERT 스킵** |

**핵심**: `ON CONFLICT (slug) DO NOTHING`은 기존 행을 업데이트하지 않는다. 카테고리가 `is_regulated` 컬럼 추가 전에 이미 존재했으므로 `DEFAULT false` 값이 그대로 남는다.

### 의약외품만 `true`인 이유

의약외품(`quasi-drug`)은 시드 시점에 새로 생성되었거나, 별도로 수동 UPDATE가 이루어졌을 가능성이 높다.

### 주사/인슐린만 `true`인 이유

`ms-injection` slug는 `ExpandCategoryTree` 마이그레이션(`20260329200000`)에서 새로 INSERT되었고, 이 slug가 기존에 존재하지 않았으므로 `is_regulated = true`로 정상 입력되었다.

---

## 5. 수정 방안 (제안)

### 방안 A: SQL UPDATE (즉시 수정) — **권장**

```sql
UPDATE product_categories SET is_regulated = true
WHERE slug IN (
  'health-functional',
  'hf-vitamin-mineral', 'hf-probiotics', 'hf-omega3', 'hf-ginseng', 'hf-collagen', 'hf-etc',
  'medical-supply',
  'ms-hygiene', 'ms-etc'
);
```

실행 방법: `gcloud sql connect o4o-platform-db --user=postgres` 또는 새 마이그레이션 파일

### 방안 B: 마이그레이션 파일로 수정

새 마이그레이션 `FixIsRegulatedFlags` 추가:

```typescript
await queryRunner.query(`
  UPDATE product_categories SET is_regulated = true
  WHERE slug IN (
    'health-functional',
    'hf-vitamin-mineral', 'hf-probiotics', 'hf-omega3', 'hf-ginseng', 'hf-collagen', 'hf-etc',
    'medical-supply',
    'ms-hygiene', 'ms-etc'
  )
`);
```

### 방안 C: 기존 시드 마이그레이션 수정 (재발 방지)

`ON CONFLICT (slug) DO NOTHING` → `ON CONFLICT (slug) DO UPDATE SET is_regulated = EXCLUDED.is_regulated`

**주의**: 이미 실행된 마이그레이션이므로 기존 환경에서는 다시 실행되지 않음. 새 마이그레이션이 필요.

---

## 6. 영향 분석

| 영향 항목 | 현재 상태 | 수정 후 |
|----------|----------|---------|
| 건강기능식품 regulatoryName/mfdsPermitNumber 입력 | ❌ 불가 | ✅ 입력 가능 |
| 건강기능식품 상품의 규제 데이터 품질 | ⚠️ regulatoryType만 설정 | ✅ 전체 필드 입력 가능 |
| 의료소모품 규제 필드 | ❌ 불가 (주사/인슐린만 가능) | ✅ 전체 하위 카테고리 입력 가능 |
| 기존 등록된 상품 데이터 | 변경 없음 | 변경 없음 (보정 필요 시 별도) |
| 의약외품 | ✅ 정상 | ✅ 정상 (변경 없음) |

---

## 7. 재발 방지 권장

1. **시드 마이그레이션에서 `ON CONFLICT DO UPDATE` 사용** — `is_regulated` 같은 정책 값은 DO NOTHING이 아닌 DO UPDATE로 설정
2. **카테고리 규제 플래그 검증 도구** — 배포 후 `is_regulated` 값을 검증하는 health check 또는 audit 스크립트 추가
3. **마이그레이션 순서 문서화** — 컬럼 추가와 시드 데이터를 같은 마이그레이션에 넣거나, 의존 순서를 명시

---

*조사자: Claude Code (정적 분석 + Playwright 라이브 데이터 검증)*
*참조: IR-NETURE-SUPPLIER-SAMPLE-PRODUCT-REGISTRATION-VERIFY-V1*
