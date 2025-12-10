# CPT/ACF System Overview

## 1. 목적(Purpose)

모든 앱이 공통으로 사용할 수 있는 CPT/ACF 구조를 정의하며,
데이터 모델의 일관성을 유지하기 위한 표준 규칙을 제공한다.

## 2. 개요(Overview)

- **CPT**: 각 앱 기능의 데이터 구조 단위
- **ACF**: CPT 내부 필드 정의 단위
- 두 시스템은 **CMS Registry**에서 통합 관리됨
- WordPress의 CPT/ACF 개념을 현대적으로 재해석

## 3. 핵심 구성요소(Key Components)

### 1) CPT 구조 (Custom Post Type)

| 속성 | 타입 | 설명 |
|------|------|------|
| slug | string | CPT 고유 식별자 |
| name | string | 표시 이름 |
| category | string | 분류 카테고리 |
| visibility | enum | 공개 설정 (public/private/internal) |
| supports | string[] | 지원 기능 (title/editor/thumbnail 등) |

### 2) ACF 필드타입

| 타입 | 설명 | 예시 |
|------|------|------|
| text | 단일 텍스트 | 상품명, 제목 |
| textarea | 다중 텍스트 | 설명, 내용 |
| number | 숫자 | 가격, 수량 |
| boolean | 참/거짓 | 활성화 여부 |
| enum | 선택값 | 상태, 유형 |
| date | 날짜 | 생성일, 마감일 |
| media | 미디어 파일 | 이미지, 동영상 |
| relation | 관계 참조 | brandId, categoryId |

### 3) Relation 구조

| 관계 타입 | 설명 |
|----------|------|
| one-to-one | 1:1 관계 |
| one-to-many | 1:N 관계 |
| many-to-many | N:M 관계 |

### 4) View 연동

| View 타입 | 용도 |
|----------|------|
| ListView | CPT 목록 표시 |
| DetailView | CPT 상세 표시 |
| FormView | CPT 생성/수정 폼 |

## 4. 흐름(Flow)

```
┌──────────────────┐
│  앱 manifest.ts  │
│  CPT/ACF 선언    │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  CMS Registry    │
│  자동 등록       │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  View System     │
│  자동 연결       │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  API Routes      │
│  자동 생성       │
└──────────────────┘
```

**요약**: manifest 선언 → Registry 등록 → View 연결 → API 생성

## 5. 규칙(Rule Set)

1. **manifest 선언 필수**: 모든 CPT/ACF는 manifest.ts에서 선언
2. **slug 유일성**: CPT slug는 플랫폼 전체에서 고유해야 함
3. **ACF 타입 준수**: 정의된 필드타입만 사용 (커스텀 타입 금지)
4. **Relation 명시**: 관계 필드는 반드시 relation 타입으로 선언
5. **View 자동화 활용**: 수동 View 생성 대신 자동 연결 구조 사용

---
*최종 업데이트: 2025-12-10*
*상태: 초안 완료*
