# IR-NETURE-MEDICAL-DEVICE-CATEGORY-AND-REGULATORY-MAPPING-INVESTIGATION-V1

**조사일**: 2026-04-05
**조사 도구**: 코드 정적 분석 + Playwright API 호출 (라이브 데이터 검증)
**조사 대상**: "의료기기" 카테고리 부재 및 규제 매핑 정책

---

## 판정

```
원인: 복합 (C+A)
  - A: 시드 누락 — 최초 시드에 "의료기기" 카테고리 설계 없음
  - C: 의도적 분리 — "건강기기"(비규제)와 "의료소모품"(규제)으로 분리 설계
현재 상태: 의료기기 카테고리 수동 생성됨 (isRegulated=false)
```

---

## 1. 현상 확인

### 라이브 API 응답 (2026-04-05)

```
의료기기 | slug=의료기기-mnlht7lb | isRegulated=false    ← 수동 생성됨
...
건강기기 | slug=health-device | isRegulated=false
  혈당관리 | slug=hd-glucose | isRegulated=false
  체온관리 | slug=hd-temperature | isRegulated=false
  혈압관리 | slug=hd-blood-pressure | isRegulated=false
  기타 건강기기 | slug=hd-etc | isRegulated=false
의료소모품 | slug=medical-supply | isRegulated=false      ← 시드는 true, WO-1과 동일 원인
  주사/인슐린 | slug=ms-injection | isRegulated=true
  위생/방역 | slug=ms-hygiene | isRegulated=false          ← 시드는 true, WO-1과 동일 원인
  기타 의료소모품 | slug=ms-etc | isRegulated=false        ← 시드는 true, WO-1과 동일 원인
```

---

## 2. 마이그레이션/시드 분석

### 2.1 전체 카테고리 마이그레이션 이력

| 마이그레이션 | 내용 | "의료기기" 포함 |
|------------|------|:---:|
| `20260307200000-CategoryBrandProductMasterExtension` | 테이블 생성 | ❌ |
| `20260323500000-AddIsRegulatedToProductCategories` | `is_regulated` 컬럼 추가 | — |
| `20260323700000-SeedProductCategories` | 4 대분류 + 하위 시드 | ❌ |
| `20260329200000-ExpandCategoryTreeAndMappingRules` | 건강기기 + 의료소모품 추가 | ❌ |

**결론**: "의료기기"라는 이름의 카테고리는 어떤 마이그레이션에도 정의되지 않았다.

### 2.2 설계 의도 분석

`ExpandCategoryTree` 마이그레이션의 설계:

| 카테고리 | 의도 | isRegulated |
|---------|------|:-----------:|
| **건강기기** (`health-device`) | 혈당측정기, 체온계, 혈압계 등 일반 건강관리 기기 | `false` |
| **의료소모품** (`medical-supply`) | 주사기, 인슐린, 위생/방역 용품 등 소모성 의료용품 | `true` |

"의료기기"라는 단일 카테고리 대신, 용도별로 **건강기기**(비규제)와 **의료소모품**(규제)으로 분리한 것이 의도적 설계로 보인다.

### 2.3 매핑 규칙 기반 증거

`ExpandCategoryTree` 마이그레이션의 매핑 규칙:

```
'혈당', 'cgm', '혈당측정', '채혈', '스트립' → 건강기기 > 혈당관리
'체온', '체온계'                            → 건강기기 > 체온관리
'혈압', '혈압계'                            → 건강기기 > 혈압관리
'펜니들', '주사기', '인슐린'                 → 의료소모품 > 주사/인슐린
'장갑', '알코올'                            → 의료소모품 > 위생/방역
```

→ "의료기기"라는 키워드 매핑은 없고, 구체적 품목별로 건강기기/의료소모품에 분산되어 있다.

---

## 3. 현재 수동 생성된 "의료기기" 카테고리 분석

| 속성 | 값 |
|------|------|
| name | 의료기기 |
| slug | `의료기기-mnlht7lb` (자동 생성된 slug) |
| isRegulated | `false` |
| parent_id | NULL (대분류) |
| children | 없음 |

### 문제점

1. **`isRegulated = false`** — 의료기기는 규제 대상이므로 `true`여야 한다
2. **하위 카테고리 없음** — 분류 세분화가 없어 모든 의료기기가 단일 카테고리에 몰린다
3. **slug 불일치** — 한글 slug에 랜덤 접미사가 붙어 있어 마이그레이션 관리가 어려움
4. **매핑 규칙 없음** — CSV 임포트 시 자동 카테고리 배정이 되지 않음

---

## 4. 정책 판정: "의료기기" 카테고리 유지 여부

### 옵션 비교

| 옵션 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. 의료기기 독립 유지** | 현재 수동 생성된 카테고리를 정식으로 승격 | 직관적 분류, WO 명세 일치 | 건강기기/의료소모품과 중복 |
| **B. 의료기기 삭제 + 건강기기/의료소모품 활용** | 원래 설계대로 분리 유지 | 기존 설계 존중, 세분화된 분류 | "의료기기"로 등록된 상품 재배치 필요 |
| **C. 의료기기를 상위 카테고리로, 건강기기/의료소모품을 하위로** | 계층 재구성 | 가장 체계적 | 구조 변경 대규모, 기존 상품 재배치 |

### 권장: 옵션 A (의료기기 독립 유지 + 보정)

이유:
- 사용자가 이미 의료기기 카테고리를 생성하여 사용 중
- 상품이 등록되어 있을 수 있음 (테스트 상품 포함)
- 건강기기는 "가정용 건강관리 기기" 의미로 별도 유지

---

## 5. 수정 제안

### 5.1 즉시 수정 (SQL)

```sql
-- 의료기기 카테고리 isRegulated 수정
UPDATE product_categories SET is_regulated = true
WHERE slug = '의료기기-mnlht7lb';

-- (WO-1 수정과 함께) 의료소모품 계열 isRegulated 수정
-- → IR-NETURE-HEALTH-FUNCTIONAL-FOOD-REGULATORY-FIELDS-VISIBILITY-INVESTIGATION-V1 참조
```

### 5.2 매핑 규칙 추가 (선택)

```sql
INSERT INTO category_mapping_rules (keyword, category_id, priority, is_active)
VALUES
  ('의료기기', (SELECT id FROM product_categories WHERE slug = '의료기기-mnlht7lb'), 10, true)
ON CONFLICT (keyword) DO NOTHING;
```

### 5.3 하위 카테고리 추가 (선택)

필요 시 의료기기 하위 카테고리 세분화:
- 진단기기 (예: 혈당측정기, 혈압계)
- 치료기기 (예: 네블라이저, 적외선 치료기)
- 재활기기 (예: 보조기구)

---

## 6. 건강기기 vs 의료기기 vs 의료소모품 관계 정리

| 카테고리 | 성격 | 규제 여부 (설계) | 규제 여부 (현재 DB) | 예시 품목 |
|---------|------|:---:|:---:|------|
| **의료기기** (수동생성) | 법적 의료기기 인허가 대상 | true | false ⚠️ | 의료용 혈당측정기, 전동 휠체어 |
| **건강기기** | 가정용 건강관리 보조기기 | false | false ✅ | 가정용 혈압계, 체온계, 만보기 |
| **의료소모품** | 일회성 의료 용품 | true | false ⚠️ | 주사기, 펜니들, 위생장갑 |

→ **건강기기**는 비규제 가정용 기기, **의료기기**는 규제 의료기기, **의료소모품**은 규제 소모품으로 3분류 체계가 성립한다.

---

## 7. 연관 이슈

1. **WO-1 (건강기능식품 isRegulated)**: 동일한 `ON CONFLICT DO NOTHING` 원인으로 의료소모품 계열도 영향 받음. WO-1 수정 시 의료소모품도 함께 수정 필요.
2. **테스트 상품 재배치**: IR-NETURE-SUPPLIER-SAMPLE-PRODUCT-REGISTRATION-VERIFY-V1에서 "의료기기" 상품 3개가 일반상품에 매핑됨. 의료기기 카테고리로 재배치 검토.

---

*조사자: Claude Code (정적 분석 + Playwright 라이브 데이터 검증)*
*참조: IR-NETURE-SUPPLIER-SAMPLE-PRODUCT-REGISTRATION-VERIFY-V1*
