# Cosmetics Retail Service - Definition

> 서비스 정의 문서

## 서비스 정보

- **Service Group:** cosmetics
- **상태:** 운영중 (Active)
- **Templates:** cosmetics-retail
- **InitPacks:** cosmetics-retail-init

## 서비스 목적

화장품 리테일 비즈니스를 위한 종합 플랫폼으로서 인플루언서 기반 제품 추천, 드롭쉬핑, 샘플/디스플레이 관리를 제공한다.

## 대상 사용자

- 화장품 판매자 (Seller)
- 화장품 공급사 (Supplier)
- 파트너/인플루언서 (Partner)
- 일반 소비자 (Customer)

## 서비스 범위

### 포함되는 기능
- 인플루언서 루틴 기반 제품 추천
- 피부 타입별 필터링
- 드롭쉬핑 주문/정산
- 샘플 및 디스플레이 관리
- 파트너 커미션 관리
- E-commerce 주문/결제

### 제외되는 기능
- 제조 관리 (공급사 외부 시스템)
- 물류 실행 (외부 3PL)
- 결제 처리 (PG사)

## 서비스 구성

### Required Apps (Core)
- cms-core
- organization-core
- dropshipping-core
- ecommerce-core

### Required Apps (Extension)
- dropshipping-cosmetics

### Optional Apps (Extension)
- cosmetics-partner-extension
- cosmetics-seller-extension
- cosmetics-supplier-extension
- cosmetics-sample-display-extension

### Optional Apps (Feature)
- sellerops
- supplierops
- partnerops
- partner-ai-builder
- forum-cosmetics

### Optional Apps (Standalone)
- signage
- market-trial

## 서비스 의존성

### 필수 서비스
(없음 - 독립 서비스)

### 선택 서비스
- signage (디지털 사이니지 연동 시)

## Applications

- admin-dashboard
- api-server
- main-site
- ecommerce (소비자 프론트엔드)
