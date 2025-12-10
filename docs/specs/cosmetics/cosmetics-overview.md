# Cosmetics App Overview

## 1. 목적(Purpose)

Cosmetics App은 화장품 판매점, 샵인샵 매장, 드랍쉬핑 판매자 등을 위한
상품 관리·전시·재고 연결·주문 연동 기능을 제공하는 핵심 앱이다.

## 2. 개요(Overview)

- **CMS 기반 CPT**: product, brand, category, display-item
- **ACF 기반 필드**: 용량, 규격, 성분, 사용방법, 피부타입 등
- **View System 기반**: Product List, Detail, Smart Display
- **AppStore 확장 구조**: SellerOps, PartnerOps, DropsPartnerOps 연동 시 productId 기준 통합

## 3. 핵심 구성요소(Key Components)

### 1) CPT (Custom Post Types)

| CPT | 설명 |
|-----|------|
| `product` | 화장품 상품 |
| `brand` | 브랜드 정보 |
| `category` | 상품 카테고리 |
| `display-item` | 매장 전시용 아이템 |

### 2) ACF Fields

| 필드 | 타입 | 설명 |
|------|------|------|
| volume | string | 용량 |
| ingredients | text | 성분 |
| skinType | enum | 피부타입 |
| usage | text | 사용방법 |

### 3) View Templates

| View | 용도 |
|------|------|
| ProductListView | 상품 목록 |
| ProductDetailView | 상품 상세 |
| ProductDisplayView | 디지털 사이니지 |
| StorefrontView | 매장 전면 전시 |

## 4. 앱 계층 구조

```
┌─────────────────────────────────────────────────────┐
│              Service Apps (연동 앱)                  │
│     SellerOps / PartnerOps / DropsPartnerOps       │
├─────────────────────────────────────────────────────┤
│              Extension App                          │
│           dropshipping-cosmetics                   │
├─────────────────────────────────────────────────────┤
│                Core App                             │
│            cosmetics-core (본 앱)                   │
└─────────────────────────────────────────────────────┘
```

## 5. 개발 규칙(Development Rules)

1. **CPT/ACF 선언**: 모든 데이터 구조는 manifest.ts에서 선언
2. **View 기반 화면**: 페이지 직접 생성 대신 View Template 사용
3. **productId 기준 연동**: 외부 앱과의 연동은 productId를 키로 사용
4. **Extension 패턴 준수**: Core 앱을 직접 수정하지 않고 Extension으로 확장

---
*최종 업데이트: 2025-12-10*
*상태: 초안 완료*
