# IR-NETURE-PRODUCT-CATEGORY-IS-REGULATED-BACKFILL-FIX-V1

**작업일**: 2026-04-05
**검증 도구**: Playwright (headless Chromium) + 라이브 API 호출
**배포 방식**: main push → GitHub Actions CI/CD → Cloud Run Job (마이그레이션)

---

## 1. 전체 판정

```
마이그레이션 실행: ✅ SUCCESS
대상 slug 보정: 11 / 11
비대상 slug 영향: 0 (변경 없음)
UI 규제 필드 노출: ✅ 정상화
TypeScript 빌드: ✅ 에러 0건
전체 판정: ✅ PASS
```

---

## 2. 추가한 migration 파일명

```
apps/api-server/src/database/migrations/20260405200000-BackfillIsRegulatedFlags.ts
```

- TypeORM 마이그레이션, `UPDATE ... WHERE slug IN (...)` 방식
- 멱등성 보장 (이미 true인 행에 영향 없음)

---

## 3. 백필 대상 slug 목록

| # | slug | 카테고리명 | 계열 |
|---|------|----------|------|
| 1 | `health-functional` | 건강기능식품 | 건강기능식품 |
| 2 | `hf-vitamin-mineral` | 비타민/미네랄 | 건강기능식품 |
| 3 | `hf-probiotics` | 프로바이오틱스 | 건강기능식품 |
| 4 | `hf-omega3` | 기타 (오메가3) | 건강기능식품 |
| 5 | `hf-ginseng` | 홍삼/인삼 | 건강기능식품 |
| 6 | `hf-collagen` | 콜라겐/미용 | 건강기능식품 |
| 7 | `hf-etc` | 기타 건강식품 | 건강기능식품 |
| 8 | `medical-supply` | 의료소모품 | 의료소모품 |
| 9 | `ms-hygiene` | 위생/방역 | 의료소모품 |
| 10 | `ms-etc` | 기타 의료소모품 | 의료소모품 |
| 11 | `의료기기-mnlht7lb` | 의료기기 | 의료기기 (수동생성) |

---

## 4. 실제 변경 결과

### API 응답 검증 (Playwright → `GET /api/v1/neture/categories`)

| slug | 수정 전 | 수정 후 | 상태 |
|------|:---:|:---:|:---:|
| `health-functional` | false | **true** | ✅ |
| `hf-vitamin-mineral` | false | **true** | ✅ |
| `hf-probiotics` | false | **true** | ✅ |
| `hf-omega3` | false | **true** | ✅ |
| `hf-ginseng` | false | **true** | ✅ |
| `hf-collagen` | false | **true** | ✅ |
| `hf-etc` | false | **true** | ✅ |
| `medical-supply` | false | **true** | ✅ |
| `ms-hygiene` | false | **true** | ✅ |
| `ms-etc` | false | **true** | ✅ |
| `의료기기-mnlht7lb` | false | **true** | ✅ |

### 비대상 카테고리 (변경 없음 확인)

| slug | isRegulated | 상태 |
|------|:---:|:---:|
| `general` | false | ✅ 변경 없음 |
| `quasi-drug` | true | ✅ 변경 없음 |
| `cosmetics` | false | ✅ 변경 없음 |
| `health-device` | false | ✅ 변경 없음 |

---

## 5. down() 처리 방식과 이유

**방식**: no-op (의도적으로 아무 작업도 하지 않음)

**이유**:
1. 이 마이그레이션은 "잘못된 false → 올바른 true" 보정이다. 롤백 시 false로 되돌리면 다시 버그 상태가 된다.
2. 의약외품(`quasi-drug`)은 이미 true였으므로, 단순 일괄 false 복원은 다른 카테고리의 올바른 값을 훼손할 위험이 있다.
3. 정확한 복원을 위해서는 각 slug의 "원래 값"을 알아야 하지만, 원래 값이 곧 버그 상태이므로 복원 자체가 의미가 없다.
4. 만약 롤백이 필요하면 개별 slug 단위로 수동 판단해야 한다.

---

## 6. 건강기능식품 규제 필드 노출 재검증 결과

Playwright로 `/supplier/products/new` 페이지에서 건강기능식품 카테고리 선택 후 확인:

| 검증 항목 | 수정 전 | 수정 후 | 상태 |
|----------|:---:|:---:|:---:|
| `regulatoryType` select 수 | 1 (항상표시만) | **2** (항상표시 + 규제섹션) | ✅ |
| `regulatoryName` 입력 필드 | 미표시 | **표시** | ✅ |
| `mfdsPermitNumber` 입력 필드 | 미표시 | **표시** | ✅ |

**UI 검증 판정**: ✅ PASS — 건강기능식품 카테고리 선택 시 규제 필드가 정상 표시됨

---

## 7. 남은 후속 작업

| # | 항목 | 우선순위 |
|---|------|:---:|
| 1 | 기존 시드의 `ON CONFLICT DO NOTHING` → `DO UPDATE` 정책 보완 | 중 |
| 2 | 의료기기 카테고리 구조 정비 (slug 정규화, 하위 카테고리 추가) | 중 |
| 3 | 공급자 허가정보와 상품 규제 연결 구조 설계 | 낮 |
| 4 | 기존 건강기능식품 상품의 regulatoryName/mfdsPermitNumber 보정 | 중 |
| 5 | 테스트 상품 중 의료기기 3개 → 의료기기 카테고리로 재배치 | 낮 |

---

*작업자: Claude Code*
*커밋: `ab5cdb7b7` (main)*
*CI/CD: GitHub Actions → Cloud Run Job `o4o-api-migrations-w49px` → SUCCESS*
