# 🚀 Dropshipping Partner Portal Shortcode 사용 가이드

## 📌 개요

이 가이드는 WordPress에서 사용할 수 있는 드롭쉬핑 파트너 포털 Shortcode들의 구현과 사용법을 설명합니다.

## ✅ 구현 완료된 Shortcode 목록

### 📦 공급자 (Supplier) 전용 Shortcode - **법률 준수 버전**

| Shortcode | 설명 | 상태 |
|-----------|------|------|
| `[supplier_products]` | **공급자 상품 목록** - 공급가, MSRP(권장가), 수수료율 관리 | ✅ 완료 |
| `[supplier_product_editor]` | **공급자 상품 편집기** - 가격/수수료 편집 및 승인 요청 | ✅ 완료 |

### 🤝 파트너 (Partner) 전용 Shortcode

| Shortcode | 설명 | 상태 |
|-----------|------|------|
| `[partner_dashboard]` | **파트너 메인 대시보드** - 총 수익, 전환율, 개인 추천 링크를 보여주는 통합 UI | ✅ 완료 |
| `[partner_products]` | **홍보 상품 목록** - 파트너 개인의 추천 코드가 적용된 링크 생성 기능 | ✅ 완료 |
| `[partner_commissions]` | **정산 내역 확인** - 수수료 정산 내역과 지급 상태를 보여주는 투명한 UI | ✅ 완료 |

## 🎯 메인 Shortcode 사용법

### 1. `[partner_dashboard]` - 파트너 대시보드

```php
// 기본 사용법
[partner_dashboard]

// 특정 탭으로 시작
[partner_dashboard tab="commissions"]

// 사용 가능한 탭: overview, commissions, links
```

**주요 기능:**
- 📊 총 수익 및 월별 수익 표시
- 📈 전환율 및 클릭 통계
- 🔗 활성 링크 수 및 관리
- 🏆 파트너 등급 및 진행률
- 📱 반응형 디자인

### 2. `[partner_products]` - 홍보 상품 목록

```php
// 기본 사용법
[partner_products]

// 카테고리별 필터링
[partner_products category="electronics"]

// 추천 상품만 표시
[partner_products featured="true" limit="6"]

// 정렬 옵션 설정
[partner_products sortBy="commission" limit="12"]
```

**속성 옵션:**
- `category`: 상품 카테고리 필터 (electronics, clothing, home 등)
- `featured`: 추천 상품만 표시 (true/false)
- `limit`: 표시할 상품 수 (기본값: 12)
- `sortBy`: 정렬 방식 (commission, performance, price, newest)

**주요 기능:**
- 🛍️ 상품 그리드 레이아웃
- 🔗 원클릭 파트너 링크 생성
- 📱 반응형 카드 디자인
- 💰 수수료 및 마진 정보 표시
- ⭐ 즐겨찾기 기능
- 📊 상품 성과 통계

### 3. `[partner_commissions]` - 정산 내역

```php
// 기본 사용법
[partner_commissions]

// 기간별 필터링
[partner_commissions period="90d"]

// 상태별 필터링
[partner_commissions status="paid"]

// 간단한 레이아웃
[partner_commissions compact="true" showSummary="false"]
```

**속성 옵션:**
- `period`: 기간 (7d, 30d, 90d, 1y)
- `status`: 상태 (all, pending, approved, paid, cancelled)
- `compact`: 간단한 레이아웃 (true/false)
- `showSummary`: 요약 카드 표시 (true/false)

**주요 기능:**
- 💰 수수료 요약 통계
- 📋 상세 정산 내역 테이블
- 📊 월별 수익 비교
- 📄 CSV 내보내기 기능
- 🔍 기간 및 상태별 필터링

## 🔧 WordPress 설치 가이드

### 1단계: PHP 파일 추가

`wordpress-shortcode-integration.php` 파일을 다음 중 한 곳에 추가:

1. **테마 functions.php에 포함:**
```php
// functions.php 파일 끝에 추가
require_once get_template_directory() . '/dropshipping-shortcodes.php';
```

2. **플러그인으로 설치:**
```php
// wp-content/plugins/dropshipping-shortcodes/ 폴더 생성 후
// wordpress-shortcode-integration.php 파일 업로드
```

### 2단계: JavaScript 파일 설정

1. `shortcode-config.js`를 `wp-content/themes/your-theme/assets/js/` 폴더에 업로드
2. React 컴포넌트 빌드 파일을 동일 폴더에 업로드

### 3단계: CSS 스타일 추가

테마의 `style.css`에 기본 스타일 추가:

```css
.dropshipping-shortcode {
  margin: 1em 0;
  clear: both;
}

.shortcode-container {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}
```

## 🎨 고급 사용법

### 조합 사용 예시

```php
// 파트너 포털 페이지 구성
<h2>Welcome to Partner Portal</h2>
[partner_dashboard tab="overview"]

<h3>Promote These Products</h3>
[partner_products featured="true" limit="8" sortBy="commission"]

<h3>Your Earnings</h3>
[partner_commissions period="30d" showSummary="true"]
```

### 권한 관리

모든 파트너 shortcode는 자동으로 로그인 상태를 확인하며, 비로그인 사용자에게는 로그인 링크를 표시합니다.

```php
// 특정 사용자 그룹만 접근 가능하게 설정
if (is_user_logged_in() && current_user_can('partner')) {
    echo do_shortcode('[partner_dashboard]');
} else {
    echo '<p>파트너 권한이 필요합니다.</p>';
}
```

## 🔗 API 연동

각 shortcode는 다음 API 엔드포인트와 연동됩니다:

```javascript
// 파트너 대시보드 데이터
GET /api/v1/dropshipping/partner/dashboard/summary

// 상품 목록
GET /api/v1/dropshipping/partner/products

// 링크 생성
POST /api/v1/dropshipping/partner/generate-link

// 수수료 내역
GET /api/v1/dropshipping/partner/commissions
```

## 🎯 사용자 경험 최적화

### 로딩 상태

모든 shortcode는 로딩 인디케이터를 포함하여 사용자 경험을 향상시킵니다.

### 에러 핸들링

네트워크 오류, 권한 오류 등에 대한 사용자 친화적인 에러 메시지를 제공합니다.

### 반응형 디자인

모든 shortcode는 모바일, 태블릿, 데스크톱에서 최적화된 레이아웃을 제공합니다.

## 🚀 다음 단계

1. **테스트**: 각 shortcode를 테스트 페이지에서 확인
2. **스타일링**: 테마에 맞게 CSS 커스터마이징
3. **권한 설정**: 사용자 그룹별 접근 권한 구성
4. **성능 최적화**: 캐싱 및 CDN 설정

## 📞 기술 지원

문제가 발생하거나 추가 기능이 필요한 경우:

1. 브라우저 개발자 도구에서 콘솔 오류 확인
2. API 엔드포인트 응답 상태 확인
3. WordPress 디버그 로그 확인

---

## ✨ 완성된 시스템 아키텍처

```
WordPress Frontend
├── [partner_dashboard] ─── React Component ─── API
├── [partner_products] ────── React Component ─── API  
└── [partner_commissions] ── React Component ─── API
                                    │
                                    ▼
                            CPT/ACF Backend
                            ├── ds_supplier
                            ├── ds_partner
                            ├── ds_product
                            └── ds_commission_policy
```

**🎉 모든 파트너스 포털 Shortcode 구현이 완료되었습니다!**