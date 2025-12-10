# Cosmetics Storefront Specification

## 1. 목적(Purpose)

매장 전시(Storefront)의 데이터 구조, 전시 영역 구성, View 연동 규칙을 표준화한다.

## 2. 개요(Overview)

Storefront는 화장품 매장의 전면 전시 구성을 관리하며,
DisplayItem 단위로 상품을 배치하고 Smart Display와 연동 가능한 구조다.

## 3. 핵심 CPT

### 3.1 Storefront (매장 전시)

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 전시 이름 |
| shopId | relation | 매장 참조 |
| sections[] | array | 전시 섹션 배열 |
| isActive | boolean | 활성화 상태 |

### 3.2 DisplayItem (전시 아이템)

| 필드 | 타입 | 설명 |
|------|------|------|
| productIds[] | relation[] | 연결된 상품들 |
| sectionId | string | 배치된 섹션 |
| position | number | 전시 순서 |
| displayType | enum | 전시 타입 (shelf/highlight/banner) |

## 4. View Mapping

| View | 용도 |
|------|------|
| StorefrontView | 전체 매장 전시 레이아웃 |
| SectionView | 개별 섹션 렌더링 |
| DisplayItemView | 전시 아이템 상세 |
| SmartDisplayView | 디지털 사이니지 출력용 |

## 5. 전시 구조(Display Structure)

```
┌─────────────────────────────────────────────┐
│               Storefront                    │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │          Section: Featured          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌───────┐ │   │
│  │  │Display 1│ │Display 2│ │Disp 3 │ │   │
│  │  └─────────┘ └─────────┘ └───────┘ │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │          Section: New Arrivals      │   │
│  │  ┌─────────┐ ┌─────────┐            │   │
│  │  │Display 4│ │Display 5│            │   │
│  │  └─────────┘ └─────────┘            │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## 6. 규칙(Rule Set)

1. **UI 중심 설계**: 데이터보다 UI 구성이 핵심이므로 필드는 단순하게 유지
2. **제품 리스트 연결**: DisplayItem은 제품 리스트 연결을 기본 제공
3. **스마트 디스플레이 연동**: 디지털 사이니지와 연동 가능한 구조만 유지
4. **섹션 기반 배치**: 전시는 섹션 단위로 구성하며 position으로 순서 관리

---
*최종 업데이트: 2025-12-10*
*상태: 초안 완료*
