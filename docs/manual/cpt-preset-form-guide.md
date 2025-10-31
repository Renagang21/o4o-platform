# Form Preset 사용 가이드

**작성일:** 2025-10-31
**버전:** 1.0.0
**대상:** 관리자, 컨텐츠 제작자

---

## 📚 목차

1. [Form Preset이란?](#1-form-preset이란)
2. [Form Preset 관리](#2-form-preset-관리)
3. [Form Preset 만들기](#3-form-preset-만들기)
4. [고급 기능](#4-고급-기능)
5. [실전 예제](#5-실전-예제)
6. [FAQ](#6-faq)

---

## 1. Form Preset이란?

### 1.1 개요

**Form Preset**은 CPT(Custom Post Type)의 **데이터 입력 폼 레이아웃**을 정의하는 템플릿입니다.

**주요 용도:**
- 관리자 대시보드에서 포스트 작성/수정 폼
- ACF 필드 배치 및 그룹화
- 필드 검증 규칙 설정
- 조건부 필드 표시
- 역할별 폼 레이아웃 차별화

### 1.2 Form Preset의 구성 요소

```
Form Preset
├─ 기본 정보
│   ├─ 이름 (name)
│   ├─ 설명 (description)
│   ├─ CPT 슬러그 (cptSlug)
│   └─ 버전 (version)
│
├─ 필드 설정 (fields)
│   ├─ 필드 키 (fieldKey)
│   ├─ 표시 순서 (order)
│   ├─ 필수 여부 (required)
│   ├─ 플레이스홀더 (placeholder)
│   ├─ 도움말 (helpText)
│   └─ 조건부 로직 (conditional)
│
├─ 레이아웃 (layout)
│   ├─ 칼럼 수 (columns: 1, 2, 3)
│   └─ 섹션 (sections)
│
├─ 검증 규칙 (validation)
│   ├─ 필수 입력 (required)
│   ├─ 이메일 형식 (email)
│   ├─ URL 형식 (url)
│   ├─ 숫자 형식 (number)
│   └─ 정규식 패턴 (pattern)
│
└─ 제출 동작 (submitBehavior)
    ├─ 리다이렉트 경로 (redirectTo)
    ├─ 성공 메시지 표시 (showSuccessMessage)
    └─ 성공 메시지 내용 (successMessage)
```

---

## 2. Form Preset 관리

### 2.1 Form Preset 페이지 접근

1. Admin 대시보드 로그인
2. 좌측 메뉴에서 **CPT Engine** 클릭
3. 하위 메뉴에서 **Form Presets** 클릭

**URL:** `https://admin.neture.co.kr/cpt-engine/presets/forms`

### 2.2 Form Preset 목록

Form Preset 목록에서는 다음 정보를 확인할 수 있습니다:

| 칼럼 | 설명 |
|------|------|
| **Name** | 프리셋 이름 및 설명 |
| **CPT Slug** | 연결된 CPT (예: `product`, `post`) |
| **Version** | 버전 번호 (v1, v2, v3...) |
| **Status** | 활성/비활성 상태 |
| **Created** | 생성 날짜 |
| **Updated** | 마지막 수정 날짜 |
| **Actions** | 활성화/편집/삭제 버튼 |

### 2.3 검색 및 필터링

**검색창 사용:**
- 이름, CPT 슬러그, 설명으로 검색 가능
- 실시간 필터링 (타이핑 즉시 반영)

**정렬:**
- 기본: 최신 생성 순 (Created DESC)
- 칼럼 헤더 클릭 시 정렬 변경 (추후 구현 예정)

---

## 3. Form Preset 만들기

### 3.1 새 Form Preset 생성

1. **"Create New Form Preset"** 버튼 클릭
2. 모달 창이 열리면 기본 정보 입력
3. 필드 설정
4. 레이아웃 설정
5. 검증 규칙 설정 (선택)
6. 제출 동작 설정 (선택)
7. **"Create"** 버튼 클릭

### 3.2 기본 정보 입력

#### 필수 필드

**1. Name (프리셋 이름)**
```
예: Product Registration Form
   Contact Form - Basic
   Event Submission Form v2
```
**권장사항:**
- 명확하고 설명적인 이름 사용
- 버전 번호 포함 권장 (v1, v2...)
- 용도를 알 수 있도록 작성

**2. CPT Slug**
```
예: product
   post
   event
   contact
```
**설명:**
- 이 폼이 사용될 CPT를 지정
- 드롭다운에서 선택 (기존 CPT만 선택 가능)

#### 선택 필드

**3. Description (설명)**
```
예: 판매자가 신규 상품을 등록할 때 사용하는 기본 폼입니다.
   고객 문의를 받기 위한 간단한 연락처 폼입니다.
```
**권장사항:**
- 누가, 언제, 무엇을 위해 사용하는지 명시
- 다른 프리셋과의 차이점 설명

**4. Roles (접근 역할)**
```
선택 안 함 → 모든 역할 접근 가능
admin → 관리자만
admin, seller → 관리자 또는 판매자만
```

### 3.3 필드 설정

#### 필드 추가

1. **"Add Field"** 버튼 클릭
2. ACF 필드 선택 (드롭다운)
3. 필드 옵션 설정:

| 옵션 | 설명 | 예시 |
|------|------|------|
| **Field Key** | ACF 필드 키 (자동 선택) | `field_product_name` |
| **Order** | 표시 순서 (숫자) | 1, 2, 3... |
| **Section** | 속할 섹션 선택 | "Basic Info" |
| **Required** | 필수 입력 여부 | ✓ 체크 |
| **Placeholder** | 입력 힌트 텍스트 | "Enter product name" |
| **Help Text** | 필드 아래 도움말 | "상품명은 30자 이내로 입력하세요" |

#### 필드 순서 변경

- 드래그 앤 드롭으로 순서 변경 (추후 구현 예정)
- 또는 Order 숫자 직접 입력

#### 필드 삭제

- 필드 우측의 **"X"** 버튼 클릭

### 3.4 레이아웃 설정

#### 칼럼 수 선택

```
1-column: 한 줄에 하나의 필드
2-column: 한 줄에 두 개의 필드
3-column: 한 줄에 세 개의 필드
```

**권장사항:**
- 모바일: 1-column
- 데스크톱: 2-column
- 간단한 필드(체크박스 등): 3-column

#### 섹션 만들기

섹션은 관련 필드를 그룹화합니다:

**섹션 추가:**
1. **"Add Section"** 버튼 클릭
2. 섹션 정보 입력:
   - **ID**: 고유 식별자 (예: `basic_info`)
   - **Title**: 섹션 제목 (예: "Basic Information")
   - **Description**: 섹션 설명 (선택)
   - **Order**: 표시 순서
   - **Collapsible**: 접을 수 있는지 여부
   - **Default Collapsed**: 기본 접힘 상태

**예시:**
```json
{
  "id": "basic_info",
  "title": "기본 정보",
  "description": "상품의 기본 정보를 입력하세요",
  "order": 1,
  "collapsible": false,
  "defaultCollapsed": false
}
```

### 3.5 검증 규칙 설정

필드별 검증 규칙을 추가하여 데이터 품질을 보장합니다:

#### 검증 타입

**1. Required (필수 입력)**
```json
{
  "field": "field_product_name",
  "type": "required",
  "message": "상품명은 필수 입력 항목입니다."
}
```

**2. Email (이메일 형식)**
```json
{
  "field": "field_contact_email",
  "type": "email",
  "message": "올바른 이메일 주소를 입력하세요."
}
```

**3. URL (URL 형식)**
```json
{
  "field": "field_website",
  "type": "url",
  "message": "올바른 URL을 입력하세요. (예: https://example.com)"
}
```

**4. Number (숫자 형식)**
```json
{
  "field": "field_product_price",
  "type": "number",
  "message": "가격은 숫자만 입력 가능합니다."
}
```

**5. Pattern (정규식 패턴)**
```json
{
  "field": "field_phone_number",
  "type": "pattern",
  "pattern": "^01[0-9]-[0-9]{4}-[0-9]{4}$",
  "message": "전화번호는 010-1234-5678 형식으로 입력하세요."
}
```

### 3.6 제출 동작 설정

폼 제출 후의 동작을 설정합니다:

```json
{
  "redirectTo": "/admin/products",
  "showSuccessMessage": true,
  "successMessage": "상품이 성공적으로 등록되었습니다!"
}
```

| 옵션 | 설명 | 예시 |
|------|------|------|
| **redirectTo** | 제출 후 이동할 경로 | `/admin/products` |
| **showSuccessMessage** | 성공 메시지 표시 여부 | `true` |
| **successMessage** | 성공 메시지 내용 | "등록 완료!" |

---

## 4. 고급 기능

### 4.1 조건부 필드 표시

특정 조건에 따라 필드를 표시하거나 숨길 수 있습니다.

#### 예시: 유료 상품일 때만 가격 필드 표시

```json
{
  "fieldKey": "field_product_price",
  "conditional": {
    "rules": [
      {
        "field": "field_product_type",
        "operator": "==",
        "value": "paid"
      }
    ],
    "operator": "AND"
  }
}
```

**동작:**
- `field_product_type`이 "paid"일 때만 `field_product_price` 표시
- 그 외에는 숨김

#### 연산자 종류

| 연산자 | 설명 | 예시 |
|--------|------|------|
| `==` | 같음 | `value == "active"` |
| `!=` | 같지 않음 | `value != "inactive"` |
| `>` | 크다 | `value > 100` |
| `<` | 작다 | `value < 50` |
| `contains` | 포함 | `value contains "test"` |

#### 복합 조건 (AND/OR)

**AND 조건 (모든 규칙 만족)**
```json
{
  "rules": [
    { "field": "field_type", "operator": "==", "value": "paid" },
    { "field": "field_category", "operator": "==", "value": "premium" }
  ],
  "operator": "AND"
}
```
→ type이 "paid" **그리고** category가 "premium"일 때 표시

**OR 조건 (하나라도 만족)**
```json
{
  "rules": [
    { "field": "field_type", "operator": "==", "value": "paid" },
    { "field": "field_type", "operator": "==", "value": "subscription" }
  ],
  "operator": "OR"
}
```
→ type이 "paid" **또는** "subscription"일 때 표시

### 4.2 프리셋 복제 (Clone)

기존 프리셋을 기반으로 새 버전을 만들 수 있습니다:

1. 프리셋 목록에서 복제할 프리셋 찾기
2. Actions 칼럼에서 **"Clone"** 버튼 클릭 (추후 구현 예정)
3. 이름에 자동으로 "(Copy)" 추가됨
4. 필요한 부분 수정
5. **"Create"** 버튼 클릭

**권장 사용 사례:**
- 기존 프리셋의 새 버전 만들기
- 유사한 CPT의 프리셋 만들기
- A/B 테스트용 변형 프리셋 만들기

### 4.3 프리셋 활성화/비활성화

**활성화 (isActive: true):**
- API에서 조회 가능
- 블록/숏코드에서 사용 가능

**비활성화 (isActive: false):**
- API에서 조회 불가
- 기존 사용 중인 블록/숏코드에서도 작동 안 함
- 삭제하지 않고 임시로 숨기기

**사용법:**
- 프리셋 목록에서 **Power 아이콘** 클릭
- 활성 (녹색) ↔ 비활성 (회색) 토글

---

## 5. 실전 예제

### 5.1 예제 1: 상품 등록 폼

**목표:** 판매자가 신규 상품을 등록하는 폼

```json
{
  "name": "Product Registration Form - Basic v1",
  "description": "판매자용 기본 상품 등록 폼",
  "cptSlug": "product",
  "version": 1,
  "roles": ["admin", "seller"],

  "config": {
    "fields": [
      {
        "fieldKey": "field_product_name",
        "order": 1,
        "sectionId": "basic_info",
        "required": true,
        "placeholder": "상품명을 입력하세요",
        "helpText": "30자 이내로 입력하세요"
      },
      {
        "fieldKey": "field_product_description",
        "order": 2,
        "sectionId": "basic_info",
        "required": true,
        "placeholder": "상품 설명을 입력하세요"
      },
      {
        "fieldKey": "field_product_price",
        "order": 3,
        "sectionId": "pricing",
        "required": true,
        "placeholder": "가격 (원)",
        "helpText": "숫자만 입력하세요"
      },
      {
        "fieldKey": "field_product_image",
        "order": 4,
        "sectionId": "media",
        "required": false,
        "helpText": "대표 이미지를 업로드하세요 (권장: 800x800px)"
      }
    ],

    "layout": {
      "columns": 2,
      "sections": [
        {
          "id": "basic_info",
          "title": "기본 정보",
          "order": 1,
          "collapsible": false,
          "defaultCollapsed": false
        },
        {
          "id": "pricing",
          "title": "가격 정보",
          "order": 2,
          "collapsible": true,
          "defaultCollapsed": false
        },
        {
          "id": "media",
          "title": "이미지 및 미디어",
          "order": 3,
          "collapsible": true,
          "defaultCollapsed": false
        }
      ]
    },

    "validation": [
      {
        "field": "field_product_name",
        "type": "required",
        "message": "상품명은 필수 입력 항목입니다."
      },
      {
        "field": "field_product_price",
        "type": "number",
        "message": "가격은 숫자만 입력 가능합니다."
      }
    ],

    "submitBehavior": {
      "redirectTo": "/admin/products",
      "showSuccessMessage": true,
      "successMessage": "상품이 성공적으로 등록되었습니다!"
    }
  }
}
```

### 5.2 예제 2: 이벤트 신청 폼

**목표:** 사용자가 이벤트에 신청하는 공개 폼

```json
{
  "name": "Event Registration Form v1",
  "description": "공개 이벤트 신청 폼",
  "cptSlug": "event",
  "version": 1,
  "roles": [],  // 모든 역할 접근 가능

  "config": {
    "fields": [
      {
        "fieldKey": "field_participant_name",
        "order": 1,
        "required": true,
        "placeholder": "성명"
      },
      {
        "fieldKey": "field_participant_email",
        "order": 2,
        "required": true,
        "placeholder": "이메일 주소"
      },
      {
        "fieldKey": "field_participant_phone",
        "order": 3,
        "required": true,
        "placeholder": "010-1234-5678"
      },
      {
        "fieldKey": "field_participant_count",
        "order": 4,
        "required": true,
        "placeholder": "참가 인원",
        "helpText": "본인 포함 총 인원수를 입력하세요"
      },
      {
        "fieldKey": "field_special_request",
        "order": 5,
        "required": false,
        "placeholder": "특별 요청사항"
      }
    ],

    "layout": {
      "columns": 1,
      "sections": [
        {
          "id": "participant_info",
          "title": "참가자 정보",
          "order": 1,
          "collapsible": false,
          "defaultCollapsed": false
        }
      ]
    },

    "validation": [
      {
        "field": "field_participant_email",
        "type": "email",
        "message": "올바른 이메일 주소를 입력하세요."
      },
      {
        "field": "field_participant_phone",
        "type": "pattern",
        "pattern": "^01[0-9]-[0-9]{3,4}-[0-9]{4}$",
        "message": "전화번호 형식: 010-1234-5678"
      },
      {
        "field": "field_participant_count",
        "type": "number",
        "message": "참가 인원은 숫자만 입력 가능합니다."
      }
    ],

    "submitBehavior": {
      "redirectTo": "/events/success",
      "showSuccessMessage": true,
      "successMessage": "이벤트 신청이 완료되었습니다! 확인 이메일을 발송해 드렸습니다."
    }
  }
}
```

---

## 6. FAQ

### Q1: 프리셋을 수정하면 기존 포스트에 영향을 주나요?

**A:** 아니요. Form Preset은 **폼 레이아웃**만 정의하며, 이미 저장된 데이터에는 영향을 주지 않습니다. 프리셋 수정 후 새로 작성/수정하는 포스트부터 새 레이아웃이 적용됩니다.

### Q2: 한 CPT에 여러 Form Preset을 만들 수 있나요?

**A:** 네. 예를 들어:
- `form_product_basic_v1` - 기본 상품 폼
- `form_product_advanced_v1` - 고급 상품 폼 (더 많은 필드)
- `form_product_simple_v1` - 간단 상품 폼 (필수 필드만)

용도에 따라 여러 프리셋을 만들고, 상황에 맞게 선택 사용할 수 있습니다.

### Q3: 프리셋을 삭제하면 어떻게 되나요?

**A:** 프리셋을 삭제해도 **기존 데이터는 유지**됩니다. 단, 해당 프리셋을 사용하는 블록/숏코드는 "Preset not found" 오류를 표시합니다.

**권장사항:** 삭제 대신 **비활성화(isActive: false)** 사용

### Q4: 필드 순서를 변경하려면?

**A:**
1. 프리셋 편집 모달 열기
2. 각 필드의 "Order" 값 수정
3. 저장

또는 드래그 앤 드롭 기능 (추후 구현 예정)

### Q5: 조건부 필드가 작동하지 않아요

**A:** 다음을 확인하세요:
1. `conditional.rules[].field`가 실제 ACF 필드 키와 일치하는지
2. `operator`가 올바른지 (`==`, `!=`, `>`, `<`, `contains`)
3. `value`의 타입이 필드 타입과 일치하는지 (숫자 vs 문자열)
4. 조건 필드가 프리셋에 포함되어 있는지

### Q6: 프리셋을 다른 CPT로 복사할 수 있나요?

**A:**
1. 기존 프리셋 복제 (Clone)
2. `cptSlug` 변경
3. 필요 시 필드 키 수정 (다른 CPT는 다른 ACF 필드 사용)

### Q7: 검증 오류 메시지를 한글로 표시하려면?

**A:** `validation[].message` 필드에 한글로 작성하면 됩니다:
```json
{
  "field": "field_email",
  "type": "email",
  "message": "올바른 이메일 주소를 입력하세요."  ← 한글 사용 가능
}
```

---

**다음 가이드:**
- [View Preset 사용 가이드](./cpt-preset-view-guide.md)
- [Template Preset 사용 가이드](./cpt-preset-template-guide.md)
- [API 레퍼런스](./cpt-preset-api-reference.md)

**마지막 업데이트:** 2025-10-31
