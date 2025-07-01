# O4O Platform 통합 시스템 설계서

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [비즈니스 모델](#비즈니스-모델)
3. [사용자 역할 정의](#사용자-역할-정의)
4. [시스템 아키텍처](#시스템-아키텍처)
5. [핵심 기능 정의](#핵심-기능-정의)
6. [데이터베이스 설계](#데이터베이스-설계)
7. [API 설계](#api-설계)
8. [결제 및 정산](#결제-및-정산)
9. [배송 및 물류](#배송-및-물류)
10. [개발 우선순위](#개발-우선순위)

---

## 🎯 시스템 개요

### 플랫폼 특성
- **통합형 마켓플레이스**: B2C + B2B + Partner 시스템 결합
- **관리자 중심 운영**: 모든 결제 집중, 오프라인 정산
- **공급자-판매자 분리**: 도매/소매 구조

### 핵심 가치
- **B2C**: 일반 고객 대상 마켓플레이스
- **B2B**: 매장 사업자(약국, 화장품샵 등) 대상 도매 플랫폼
- **Partner**: 1단계 마케팅 추천 시스템

---

## 💼 비즈니스 모델

### B2C 모델
```
고객 → 관리자 직판 제품 구매
고객 → 공급자의 "모든 판매자 허용" 제품 구매
```

### B2B 모델  
```
매장 사업자 → 공급자 제품 선택 → 자신의 매장에서 재판매
공급자 → 제품 등록 + 판매 정책 설정
```

### Partner 모델
```
Partner → 추천 링크 생성 → 마케팅 활동
수수료 → 오프라인 처리 (플랫폼과 분리)
```

---

## 👥 사용자 역할 정의

### 1. 관리자 (플랫폼 운영자)
- **권한**: 최고 권한, 모든 설정 수정 가능
- **역할**: 
  - 전체 시스템 관리
  - B2C 직판 제품 판매
  - 사업자 승인 관리
  - 결제 집중 관리

### 2. 공급자 (Supplier)
- **역할**: 제품 공급 및 정책 설정
- **기능**:
  - 제품 등록 및 관리
  - 재고 관리
  - 판매 정책 설정 (가격, 판매자 제한)
  - 판매 내역 확인 (MyPage)

### 3. 판매자 (Seller) - B2B 전용
- **대상**: 매장 사업자 (약국, 화장품샵 등)
- **기능**:
  - 공급자 제품 선택
  - 매장 운영
  - 회원등급별 가격 설정 (골드/프리미움/VIP)
  - 판매 내역 확인 (MyPage)

### 4. Partner (마케터)
- **역할**: 추천 마케팅
- **기능**:
  - 추천 링크 생성
  - 성과 통계 확인
  - 수수료는 오프라인 처리

### 5. 고객
- **B2C 고객**: 일반 소비자
- **B2B 고객**: 매장의 회원 (골드/프리미움/VIP)

---

## 🏗️ 시스템 아키텍처

### 폴더 구조
```
o4o-platform/services/ecommerce/
├── web/                        # 통합 프론트엔드
│   ├── src/pages/
│   │   ├── home/              # B2C 메인 (관리자 제품)
│   │   ├── supplier/          # 공급자 대시보드
│   │   ├── seller/            # 판매자 대시보드
│   │   ├── partner/           # Partner 대시보드
│   │   ├── stores/            # B2B 매장 페이지들
│   │   └── [고객용 페이지들]   # Cart, Shop, Profile 등
│
├── partner-system/             # Partner 추천 시스템
├── marketplace-system/         # B2B2C 마켓플레이스
├── admin/                     # 관리자 시스템
└── api/                       # 공통 API
```

### 기술 스택
- **Backend**: Medusa 2.0 + PostgreSQL
- **Frontend**: React + TypeScript
- **ORM**: MikroORM
- **결제**: PG사 + 네이버페이
- **배송**: 배송업체 API 연동

---

## ⚙️ 핵심 기능 정의

### Partner 시스템
**목적**: 1단계 마케팅 추천 시스템

**주요 기능**:
- Partner 신청 및 승인
- 추천 링크 생성 및 추적
- 클릭/변환 통계
- 성과 리포트
- **수수료**: 오프라인 처리

### Marketplace 시스템
**목적**: 공급자-판매자 연결 플랫폼

**주요 기능**:

#### 공급자 기능
- 제품 등록 및 관리
- 판매 정책 설정:
  - **판매자 제한**: "모든 판매자 허용" vs "승인 필요"
  - **가격 정책**: "가격 수정 금지" vs "판매자 자율 설정"
- 재고 관리
- 판매 내역 확인

#### 판매자 기능 (B2B 전용)
- 매장 사업자 신청 및 승인
- 공급자 제품 리스트 조회
- 제품 선택 및 매장 진열
- 회원등급별 가격 설정 (골드/프리미움/VIP)
- 주문 관리
- 판매 내역 확인

### B2C 시스템
**목적**: 일반 고객 대상 마켓플레이스

**특징**:
- 관리자만 판매 가능
- 공급자의 "모든 판매자 허용" 제품만 표시
- 일반적인 이커머스 기능

### B2B 시스템
**목적**: 매장 사업자 대상 도매 플랫폼

**특징**:
- 승인된 매장 사업자만 접근
- 공급자 허가 필요 제품은 "구매불가 + 매장 이동" 표시
- 회원등급별 차등 가격

---

## 🗄️ 데이터베이스 설계

### Partner 시스템 테이블
```sql
-- Partner 기본 정보
partners (id, customer_id, customer_email, partner_code, status, ...)

-- 클릭 추적
partner_clicks (id, partner_id, ip_address, click_url, is_conversion, ...)

-- 성과 기록 (수수료 계산 제외)
partner_records (id, partner_id, order_id, record_type, ...)
```

### Marketplace 시스템 테이블
```sql
-- 공급자
suppliers (id, business_name, contact_info, status, ...)

-- 판매자 (B2B 매장 사업자)
sellers (id, business_name, business_type, status, approved_at, ...)

-- 제품
products (id, supplier_id, name, base_price, stock, ...)

-- 제품 정책
product_policies (id, product_id, allow_all_sellers, price_editable, ...)

-- 판매자-제품 연결
seller_products (id, seller_id, product_id, gold_price, premium_price, vip_price, ...)

-- 주문
orders (id, customer_id, seller_id, total_amount, status, ...)
```

### 공통 테이블
```sql
-- 사용자 (다중 역할 가능)
users (id, email, roles, ...)

-- 배송비 설정
shipping_policies (id, region_type, min_amount, shipping_fee, ...)
```

---

## 🔌 API 설계

### Partner API
```
POST /api/partner/apply          # Partner 신청
GET  /api/partner/profile/{code} # Partner 프로필
POST /api/partner/generate-link  # 추천 링크 생성
POST /api/partner/track         # 클릭 추적
GET  /api/partner/stats         # 성과 통계
```

### Supplier API
```
POST /api/supplier/products              # 제품 등록
PUT  /api/supplier/products/{id}         # 제품 수정
POST /api/supplier/products/{id}/policy  # 판매 정책 설정
GET  /api/supplier/sales                 # 판매 내역
```

### Seller API (B2B)
```
POST /api/seller/apply                   # 매장 사업자 신청
GET  /api/seller/products/available      # 선택 가능한 제품 리스트
POST /api/seller/products/select         # 제품 선택
PUT  /api/seller/products/{id}/pricing   # 회원등급별 가격 설정
GET  /api/seller/orders                  # 주문 관리
```

### Store API (고객용)
```
GET  /api/store/products        # 제품 목록 (B2C/B2B 구분)
POST /api/store/cart            # 장바구니
POST /api/store/orders          # 주문
GET  /api/store/shipping-fee    # 배송비 계산
```

---

## 💳 결제 및 정산

### 결제 시스템
```
고객 결제 → PG사/네이버페이 → 관리자 계좌 집중
```

### 정산 시스템 (오프라인)
```
온라인 추적:
- 판매자 MyPage: 자신의 판매 내역 확인
- 공급자 MyPage: 자신의 판매 내역 확인

오프라인 처리:
- 판매자 수수료 지급
- 공급자 대금 지급  
- 세금계산서 발행
- Partner 수수료 지급
```

### 금액 계산 구조
```
고객 결제 금액 (부가세 포함)
= 공급자 대금 + 판매자 수수료 + 관리자 수수료
```

---

## 🚚 배송 및 물류

### 배송 관리
- **배송업체 API 연동** (CJ대한통운, 로젠택배 등)
- **배송비 설정 모듈**:
  - 일반지역 / 격오지 / 도서산간 차등 배송비
  - 최소 주문금액 기준 무료배송
  - 주문금액별 배송비 차등

### 재고 관리
- **담당**: 공급자
- **시스템 역할**: 재고 추적 및 부족 시 주문 제한

### 반품/교환
- **온라인**: 사이트 약관 안내
- **처리**: 오프라인 진행

---

## 📅 개발 우선순위

### 1단계: Partner 시스템 마무리
- **백엔드**: Partner API 완성 (이미 구현됨)
- **프론트엔드**: Partner 대시보드 개발
- **기능**: 추천 링크, 성과 통계

### 2단계: Marketplace 백엔드
- **Supplier 모듈**: 제품 등록, 정책 설정
- **Seller 모듈**: 매장 사업자 관리
- **Product 모듈**: 제품-정책 연결
- **Order 모듈**: 주문 처리

### 3단계: B2C 시스템
- **고객용 쇼핑몰**: 기본 이커머스 기능
- **결제 연동**: PG사 + 네이버페이
- **배송비 모듈**: 지역별 차등 배송비

### 4단계: B2B 시스템  
- **Supplier 대시보드**: 제품 관리, 정책 설정
- **Seller 대시보드**: 제품 선택, 매장 관리
- **B2B 고객 인터페이스**: 회원등급별 가격

### 5단계: 고도화
- **통계 및 리포트**: 판매 분석, 성과 지표
- **고급 기능**: 재고 알림, 자동 정산 지원
- **모바일 최적화**: 반응형 디자인

---

## 🎯 핵심 비즈니스 로직

### 제품 표시 로직
```python
if user_type == "B2C_CUSTOMER":
    products = 관리자_제품 + 공급자_모든판매자허용_제품
    
elif user_type == "B2B_CUSTOMER":
    if product.policy == "승인필요":
        if seller_approved_for_product:
            show_in_seller_store()
        else:
            show_as_unavailable_with_redirect()
    else:
        show_in_general_list()
```

### 가격 표시 로직
```python
if product.price_editable == False:
    price = supplier_base_price
else:
    if user.membership == "GOLD":
        price = seller.gold_price
    elif user.membership == "PREMIUM":  
        price = seller.premium_price
    elif user.membership == "VIP":
        price = seller.vip_price
```

### 주문 처리 플로우
```
1. 고객 주문 생성
2. 재고 확인 (공급자)
3. 결제 처리 → 관리자 계좌
4. 판매자에게 주문 통보
5. 공급자에게 출고 요청
6. 배송 처리
7. MyPage 판매 내역 업데이트
```

---

## 📋 주요 제약사항

### 법적 제약
- **다단계 금지**: Partner 시스템은 1단계만
- **부가세 포함**: 모든 금액은 부가세 포함

### 비즈니스 제약  
- **결제 집중**: 모든 결제는 관리자 계좌
- **오프라인 정산**: 실제 돈 이동은 오프라인
- **재고 관리**: 공급자 책임

### 기술적 제약
- **1인 개발**: 복잡성 최소화
- **점진적 구현**: 핵심 기능 우선 개발
- **확장성 고려**: 향후 기능 추가 용이

---

## 🔄 향후 확장 계획

### 자동화 고도화
- **결제 자동 분배**: 공급자/판매자 자동 정산
- **재고 연동**: 실시간 재고 업데이트
- **배송 추적**: 전 과정 자동 추적

### 기능 확장
- **다국가 지원**: 해외 판매 확장
- **모바일 앱**: 네이티브 앱 개발
- **AI 추천**: 개인화 상품 추천

### 비즈니스 확장
- **카테고리 확장**: 다양한 업종 지원
- **서비스 확장**: 금융, 물류 서비스 추가
- **생태계 구축**: 파트너사 연동 확대

---

**작성일**: 2025년 6월 22일  
**작성자**: O4O Platform 개발팀  
**버전**: 1.0
