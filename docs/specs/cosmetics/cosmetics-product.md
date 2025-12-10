# Cosmetics Product Specification

## 1. 목적(Purpose)

화장품 상품(Product)의 데이터 구조, 필드 정의, 뷰(View) 연동 규칙을 표준화한다.

## 2. 개요(Overview)

Product는 Cosmetics 앱의 중심 CPT이며,
소비자 노출, 재고 연동, Smart Display, 드랍쉬핑을 모두 연결하는 핵심 데이터다.

## 3. 주요 필드(Field Structure)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | Y | 상품명 |
| brandId | relation | Y | 브랜드 참조 |
| categoryId | relation | Y | 카테고리 참조 |
| price | number | Y | 판매가 |
| volume | string | N | 용량 (예: 50ml) |
| size | string | N | 규격 |
| ingredients | text | N | 성분 목록 |
| skinType | enum | N | 피부타입 (dry/oily/combination/sensitive) |
| usage | text | N | 사용방법 |
| images[] | media | Y | 상품 이미지 배열 |
| status | enum | Y | 상태 (active/hidden) |

## 4. View Mapping

| View | 용도 | 표시 필드 |
|------|------|----------|
| ProductListView | 상품 목록 | name, price, thumbnail, brand |
| ProductDetailView | 상품 상세 | 전체 필드 |
| ProductDisplayView | 디지털 사이니지 | name, price, images, brand |

## 5. 관계 구조(Relations)

```
┌─────────────┐
│   Product   │
└──────┬──────┘
       │
  ┌────┴────┬────────────┐
  ▼         ▼            ▼
┌─────┐  ┌────────┐  ┌──────────┐
│Brand│  │Category│  │Supplier  │
└─────┘  └────────┘  │(optional)│
                     └──────────┘
```

## 6. 규칙(Rule Set)

1. **ACF 구조 선언**: 필드는 반드시 ACF 구조로 manifest.ts에서 선언
2. **Relation 통일**: 브랜드/카테고리/공급자 관계는 relation 타입으로 통일
3. **Status 전역 규칙**: status 필드는 상품 노출 제어용 전역 규칙으로 사용
4. **이미지 필수**: images 배열은 최소 1개 이상 필수

---
*최종 업데이트: 2025-12-10*
*상태: 초안 완료*
