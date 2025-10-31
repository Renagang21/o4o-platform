# O4O Platform Shortcode 완벽 가이드

> **버전**: v0.5.9
> **최종 업데이트**: 2025-10-31
> **대상**: 콘텐츠 에디터, 마케터, 운영자, 개발자

---

## 📋 목차

1. [Shortcode란?](#shortcode란)
2. [기본 사용법](#기본-사용법)
3. [구현된 Shortcodes](#구현된-shortcodes)
   - [인증 (Auth)](#인증-auth)
   - [드롭쉬핑 (Dropshipping)](#드롭쉬핑-dropshipping)
   - [동적 필드 (Dynamic)](#동적-필드-dynamic)
4. [시스템 아키텍처](#시스템-아키텍처)
5. [개발자 가이드](#개발자-가이드)
6. [문제 해결](#문제-해결)

---

## Shortcode란?

**Shortcode**는 O4O 플랫폼에서 복잡한 기능을 간단한 코드로 페이지에 삽입하는 방법입니다.

### 장점

✅ **간편성**: 코드 작성 없이 동적 콘텐츠 추가
✅ **재사용성**: 여러 페이지에서 동일한 기능 활용
✅ **유연성**: 속성 변경만으로 다양한 스타일/기능 구현
✅ **관리 편의성**: 중앙에서 관리되는 컴포넌트

### 예시

```
[cpt_list type="ds_product" count="6" template="grid" columns="3"]
```
→ 드롭쉬핑 상품을 3열 그리드로 6개 표시

---

## 기본 사용법

### 구조

```
[shortcode_name attribute1="value1" attribute2="value2"]
```

### 속성 규칙

| 규칙 | 설명 | 예시 |
|------|------|------|
| **필수 속성** | ✅ 표시, 반드시 입력 | `type="ds_product"` |
| **선택 속성** | 생략 가능 (기본값 사용) | `count="10"` |
| **따옴표** | 공백 포함 시 반드시 사용 | `title="My Product"` |
| **불린 값** | `"true"` 또는 `"false"` | `cache="false"` |
| **숫자** | 따옴표 유무 무관 | `count="10"` 또는 `count=10` |

### 사용 위치

| 위치 | 사용 방법 |
|------|----------|
| **페이지/게시물 편집기** | "Shortcode" 블록 추가 → 코드 입력 |
| **React 컴포넌트** | `<ShortcodeRenderer content="[...]" />` |
| **Markdown 콘텐츠** | 직접 입력 |

---

## 구현된 Shortcodes

### 인증 (Auth)

#### `[social_login]` - 소셜 로그인

Google, Kakao, Naver OAuth 로그인 버튼을 표시합니다.

**속성**:
- `showEmailLogin` (불린, 기본값: true) - 이메일 로그인 폼 표시 여부
- `title` (문자열, 기본값: "로그인") - 제목
- `subtitle` (문자열, 기본값: "계정에 접속하여 서비스를 이용하세요") - 부제목

**예시**:
```
[social_login]
[social_login showEmailLogin="false"]
[social_login title="관리자 로그인"]
```

**별칭 (Aliases)**:
- `[login_form]` - 동일한 기능
- `[oauth_login]` - 동일한 기능

---

### 드롭쉬핑 (Dropshipping)

#### 판매자 (Seller)

##### `[seller_dashboard]` - 판매자 대시보드

판매자의 판매 통계, 주문 현황, 재고 상태를 표시합니다.

**속성**: 없음

**권한**: ✅ 판매자 로그인 필요

**예시**:
```
[seller_dashboard]
```

**표시 내용**:
- 총 판매액 및 순이익
- 마진율 통계
- 베스트셀러 상품
- 주문 현황

---

#### 공급자 (Supplier)

##### `[supplier_dashboard]` - 공급자 대시보드

공급자의 상품 현황, 정산, 승인 대기 등을 표시합니다.

**속성**: 없음

**권한**: ✅ 공급자 로그인 필요

**예시**:
```
[supplier_dashboard]
```

**표시 내용**:
- 등록 상품 현황
- 총 판매액 및 정산 금액
- 승인 대기 상품
- 파트너별 판매 통계

---

#### 파트너 (Affiliate)

##### `[affiliate_dashboard]` - 파트너 대시보드

파트너의 제휴 마케팅 성과를 표시합니다.

**속성**: 없음

**권한**: ✅ 파트너 로그인 필요

**예시**:
```
[affiliate_dashboard]
```

**표시 내용**:
- 총 수익 및 전환율
- 개인 추천 링크
- 최근 클릭 및 전환 통계
- 월별 수익 차트

---

### 동적 필드 (Dynamic)

#### `[cpt_list]` - CPT 목록 표시

Custom Post Type 목록을 동적으로 표시합니다.

**속성**:

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `type` | 문자열 | ✅ | - | CPT 타입 (ds_supplier, ds_product 등) |
| `count` | 숫자 | | 10 | 표시 개수 |
| `template` | 문자열 | | default | 템플릿 (default/grid/list/card) |
| `columns` | 숫자 | | 3 | 그리드 열 개수 (grid 템플릿용) |
| `orderby` | 문자열 | | date | 정렬 기준 (date/title/modified) |
| `order` | 문자열 | | DESC | 정렬 순서 (ASC/DESC) |
| `show_thumbnail` | 불린 | | true | 썸네일 표시 |
| `show_excerpt` | 불린 | | true | 요약 표시 |
| `show_meta` | 불린 | | true | 메타 정보 표시 (날짜, 작성자) |
| `cache` | 불린 | | true | 캐싱 사용 여부 |
| `status` | 문자열 | | publish | 게시 상태 |
| `meta_key` | 문자열 | | - | 메타 키 필터 |
| `meta_value` | 문자열 | | - | 메타 값 필터 |

**예시**:
```
# 기본 목록
[cpt_list type="ds_product" count="10"]

# 그리드 레이아웃 (3열)
[cpt_list type="ds_product" count="6" template="grid" columns="3" show_thumbnail="true"]

# 리스트 레이아웃
[cpt_list type="ds_supplier" count="10" template="list" show_meta="true"]

# 카드 레이아웃
[cpt_list type="ds_product" count="4" template="card" orderby="date" order="DESC"]
```

**템플릿 종류**:

| 템플릿 | 설명 | 적합한 용도 |
|--------|------|------------|
| `default` | 기본 목록형 | 텍스트 중심 목록 |
| `grid` | 그리드 레이아웃 | 상품, 갤러리 |
| `list` | 가로 리스트 | 썸네일 + 내용 |
| `card` | 카드형 | 블로그, 포트폴리오 |

---

#### `[cpt_field]` - CPT 단일 필드

특정 CPT의 필드 값을 표시합니다.

**속성**:

| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `field` | 문자열 | ✅ | 필드 이름 (title/content/price 등) |
| `post_id` | 문자열 | | 포스트 ID (생략 시 현재 포스트) |
| `format` | 문자열 | | 출력 포맷 (currency/date/number) |
| `default` | 문자열 | | 필드 값이 없을 때 기본값 |

**예시**:
```
# 현재 포스트의 제목
[cpt_field field="title"]

# 특정 포스트의 가격 (원화 포맷)
[cpt_field field="price" format="currency"]

# 작성일 (날짜 포맷)
[cpt_field field="date" format="date"]

# 썸네일 이미지
[cpt_field field="featured_image"]
```

---

#### `[acf_field]` - ACF 필드 값

Advanced Custom Fields 값을 표시합니다.

**속성**:

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `name` | 문자열 | ✅ | - | ACF 필드 이름 |
| `post_id` | 문자열 | | - | 포스트 ID (생략 시 현재 포스트) |
| `format` | 문자열 | | - | 출력 포맷 (currency/date/gallery) |
| `type` | 문자열 | | - | 필드 타입 (gallery/image/text) |
| `default` | 문자열 | | - | 기본값 |
| `wrapper` | 문자열 | | div | 래퍼 태그 (div/span/p) |
| `class` | 문자열 | | - | CSS 클래스 |

**예시**:
```
# 커스텀 가격 필드
[acf_field name="custom_price" format="currency"]

# 상품 갤러리
[acf_field name="product_gallery" type="gallery"]

# 공급자 정보 (기본값 포함)
[acf_field name="supplier_info" default="정보 없음"]

# 재고 상태 (span 태그, CSS 클래스)
[acf_field name="stock_status" wrapper="span" class="stock-badge"]
```

---

#### `[meta_field]` - 메타 필드 값

WordPress 메타 필드 값을 표시합니다.

**속성**:

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `key` | 문자열 | ✅ | - | 메타 키 (_stock_status 등) |
| `post_id` | 문자열 | | - | 포스트 ID (생략 시 현재 포스트) |
| `format` | 문자열 | | - | 출력 포맷 (number/currency/date) |
| `default` | 문자열 | | - | 기본값 |

**예시**:
```
# 재고 상태
[meta_field key="_stock_status" default="재고 확인 중"]

# 조회수
[meta_field key="_view_count" format="number"]

# 썸네일 ID
[meta_field key="_thumbnail_id"]
```

---

## 시스템 아키텍처

### 핵심 컴포넌트

```
packages/shortcodes/
├── src/
│   ├── types.ts                    # 타입 정의
│   ├── parser.ts                   # Shortcode 파서
│   ├── registry.ts                 # Shortcode 레지스트리
│   ├── renderer.ts                 # Shortcode 렌더러
│   ├── provider.tsx                # React Context Provider
│   ├── components/
│   │   └── ShortcodeRenderer.tsx   # 메인 렌더링 컴포넌트
│   ├── auth/
│   │   ├── index.ts                # Auth shortcodes 등록
│   │   └── SocialLogin.tsx         # [social_login]
│   ├── dropshipping/
│   │   ├── index.ts                # Dropshipping shortcodes 등록
│   │   ├── SellerDashboard.tsx     # [seller_dashboard]
│   │   ├── SupplierDashboard.tsx   # [supplier_dashboard]
│   │   └── AffiliateDashboard.tsx  # [affiliate_dashboard]
│   └── dynamic/
│       ├── index.ts                # Dynamic shortcodes 등록
│       ├── types.ts                # Dynamic 타입
│       ├── api-service.ts          # API 서비스
│       ├── cache.ts                # 캐싱 시스템
│       ├── components.tsx          # 공통 컴포넌트
│       ├── cpt-list.tsx            # [cpt_list]
│       ├── cpt-field.tsx           # [cpt_field]
│       ├── acf-field.tsx           # [acf_field]
│       └── meta-field.tsx          # [meta_field]
```

### 동작 원리

1. **파싱 (Parser)**:
   - 정규식으로 `[shortcode attr="value"]` 패턴 탐지
   - 속성을 파싱하여 객체로 변환

2. **레지스트리 (Registry)**:
   - 모든 shortcode 정의를 Map으로 관리
   - 이름으로 빠른 조회
   - 중복 검사 및 유효성 검증

3. **렌더러 (Renderer)**:
   - 파싱된 shortcode를 React 컴포넌트로 변환
   - Context 전달
   - 에러 핸들링

4. **캐싱 (Caching)**:
   - API 응답을 메모리에 캐싱
   - TTL(Time To Live) 기반 만료
   - 캐시 키 생성 (shortcode명 + 속성 + context)

### 캐싱 전략

```typescript
// 캐시 설정
export const CACHE_CONFIG = {
  cpt_list: {
    ttl: 5 * 60 * 1000,  // 5분
    enabled: true
  },
  cpt_field: {
    ttl: 10 * 60 * 1000, // 10분
    enabled: true
  },
  acf_field: {
    ttl: 10 * 60 * 1000, // 10분
    enabled: true
  }
};
```

**캐시 비활성화**:
```
[cpt_list type="ds_product" cache="false"]
```

---

## 개발자 가이드

### 새 Shortcode 추가하기

#### 1. 컴포넌트 작성

```tsx
// packages/shortcodes/src/my-category/MyShortcode.tsx
import React from 'react';
import { ShortcodeProps } from '../types';

export const MyShortcode: React.FC<ShortcodeProps> = ({ attributes, content, context }) => {
  const { myAttr } = attributes;

  return (
    <div className="my-shortcode">
      <p>{myAttr}</p>
      {content && <div>{content}</div>}
    </div>
  );
};
```

#### 2. Shortcode 정의

```tsx
// packages/shortcodes/src/my-category/MyShortcode.tsx (continued)
export const myShortcodeDefinition = {
  name: 'my_shortcode',
  component: MyShortcode,
  description: 'My custom shortcode',
  defaultAttributes: {
    myAttr: 'default value'
  },
  attributes: {
    myAttr: {
      type: 'string',
      required: false,
      default: 'default value'
    }
  }
};
```

#### 3. 레지스트리 등록

```tsx
// packages/shortcodes/src/my-category/index.ts
import { registerShortcode } from '../registry';
import { myShortcodeDefinition } from './MyShortcode';

export function registerMyShortcodes() {
  registerShortcode(myShortcodeDefinition);
}
```

#### 4. 메인 인덱스에 추가

```tsx
// packages/shortcodes/src/index.ts
export { registerMyShortcodes } from './my-category/index';
export { MyShortcode } from './my-category/MyShortcode';
```

### 사용 방법

```tsx
import { registerMyShortcodes } from '@o4o/shortcodes';

// 앱 초기화 시
registerMyShortcodes();
```

### 동적 필드 Shortcode 템플릿

동적 shortcode를 위한 템플릿 제공:

```tsx
import { dynamicShortcodeTemplates } from '@o4o/shortcodes';

// 템플릿 목록 사용
dynamicShortcodeTemplates.forEach(category => {
  console.log(category.category);
  category.templates.forEach(template => {
    console.log(template.name, template.shortcode);
  });
});
```

---

## 문제 해결

### 문제 1: "Shortcode가 그대로 텍스트로 표시됨"

**원인**:
- Shortcode 이름 오타
- 필수 속성 누락
- Shortcode가 등록되지 않음

**해결**:
1. Shortcode 이름 철자 확인
2. 필수 속성 (✅ 표시) 모두 입력했는지 확인
3. 해당 shortcode 모듈이 등록되었는지 확인
   ```tsx
   import { registerAuthShortcodes, registerDynamicShortcodes, registerDropshippingShortcodes } from '@o4o/shortcodes';

   registerAuthShortcodes();
   registerDynamicShortcodes(globalRegistry);
   registerDropshippingShortcodes();
   ```

---

### 문제 2: "권한이 없습니다" 메시지

**원인**: 해당 shortcode에 필요한 권한으로 로그인하지 않음

**해결**:
1. 올바른 계정으로 로그인
2. 계정에 올바른 역할이 부여되었는지 확인
3. 관리자에게 권한 요청

**권한 필요 Shortcodes**:
- `[seller_dashboard]` - 판매자
- `[supplier_dashboard]` - 공급자
- `[affiliate_dashboard]` - 파트너

---

### 문제 3: "데이터가 표시되지 않음"

**원인**:
- 잘못된 CPT 타입
- API 엔드포인트 오류
- 데이터 없음
- 캐시 문제

**해결**:
1. CPT 타입 확인 (예: `ds_product`, `ds_supplier`)
2. 브라우저 개발자 도구에서 네트워크 탭 확인
3. 데이터베이스에 실제 데이터가 있는지 확인
4. 캐시 비활성화 시도: `cache="false"`
5. 캐시 초기화:
   ```typescript
   import { shortcodeCache } from '@o4o/shortcodes/dynamic';
   shortcodeCache.clear();
   ```

---

### 문제 4: "로딩이 너무 느림"

**원인**:
- 대량 데이터 조회
- 캐싱 미사용
- N+1 쿼리 문제

**해결**:
1. `count` 속성으로 개수 제한
2. 캐싱 활성화 확인 (기본값: true)
3. 필요한 필드만 표시: `show_thumbnail="false"`
4. 템플릿 최적화 (grid 대신 list 사용)

---

## 📋 Shortcode 빠른 참조표

| Shortcode | 카테고리 | 필수 속성 | 권한 | 캐싱 |
|-----------|----------|----------|------|------|
| **인증 (Auth)** |
| `[social_login]` | 인증 | - | ❌ | - |
| `[login_form]` | 인증 (별칭) | - | ❌ | - |
| `[oauth_login]` | 인증 (별칭) | - | ❌ | - |
| **드롭쉬핑 (Dropshipping)** |
| `[seller_dashboard]` | 판매자 | - | ✅ 판매자 | - |
| `[supplier_dashboard]` | 공급자 | - | ✅ 공급자 | - |
| `[affiliate_dashboard]` | 파트너 | - | ✅ 파트너 | - |
| **동적 필드 (Dynamic)** |
| `[cpt_list]` | CPT | `type` | ❌ | ✅ 5분 |
| `[cpt_field]` | CPT | `field` | ❌ | ✅ 10분 |
| `[acf_field]` | ACF | `name` | ❌ | ✅ 10분 |
| `[meta_field]` | Meta | `key` | ❌ | ✅ 10분 |

---

## 📞 지원

Shortcode 관련 문의:
- 새 shortcode 요청
- 버그 제보
- 사용법 문의

→ 개발팀에 문의하세요.

---

**문서 버전**: v0.5.9
**최종 업데이트**: 2025-10-31
**패키지 경로**: `/home/dev/o4o-platform/packages/shortcodes`
**총 구현된 Shortcodes**: 10개 (별칭 포함 13개)
