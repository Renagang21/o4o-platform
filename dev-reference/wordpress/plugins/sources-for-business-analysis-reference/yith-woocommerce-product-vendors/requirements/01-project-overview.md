# Project Overview

## 1. 프로젝트 정보
- 프로젝트명: rena-retail 플러그인 개발
- 작성자: Rena
- 버전: 0.2.0 (분석 기반 구조 확정 단계)
- 테스트 사이트: [https://neture.co.kr](https://neture.co.kr)
- 개발 저장소 구조: `dev-mcp/services/wordpress/plugins/rena-retail`

---

## 2. 프로젝트 개요

rena-retail 플러그인은 WooCommerce 기반에서 **affiliate, multi-vendor, multi-store, 한국형 결제** 기능을 통합하는 플러그인입니다. WooCommerce 자체는 별도 운영되며, 본 플러그인은 **API 기반 연동**과 독립적인 관리자/프론트 UI를 제공합니다.

이 프로젝트는 기능 중심 모듈화를 통해 반복적으로 확장되며, 각 기능별로 오픈소스 분석을 기반으로 최적 설계를 도출합니다.

---

## 3. 개발 목표

- API 기반 벤더, 스토어, 제휴 사용자 권한 분리 및 관리
- 한국형 결제 및 포인트/적립 기반 결제 구조 적용
- 관리자/판매자/구매자 역할 분리된 UI 제공
- WooCommerce 외부 연결을 위한 API 레이어 설계
- 향후 확장 고려: 다국어/다통화, 다채널 광고 연결 등

---

## 4. 오픈소스 분석 대상 및 목적

| 플러그인명 | 목적 |
|------------|------|
| YITH WooCommerce Product Vendors | 멀티 벤더 구조 분석 |
| YITH WooCommerce Affiliates | 제휴 기반 커미션 구조 분석 |
| Cosmosfarm Pay for WooCommerce | 한국형 포인트/결제 방식 분석 |
| Magento2 (구조 기준) | 멀티 스토어 및 복수 카탈로그 구조 참고 |

분석 문서는 `sources-for-business-analysis-reference/` 하위에 저장되며, 각 분석 대상은 `design/`, `requirements/`, `src/`, `test/` 폴더를 포함합니다.

---

## 5. 개발 흐름 및 문서화 전략

- `sources-for-business-analysis-reference/`: 오픈소스 기능 분석
- `requirements/phase-plan/`: 단계별 개발 계획 문서
- `requirements/reference-analysis/`: 분석 요약 정리
- `business-analysis/`: 공통 기능 비교 및 결정 문서
- `design/`: DB 설계 및 UI 구조 정의

기능은 점진적으로 아래 단계로 개발됩니다:

| 단계 | 내용 |
|------|------|
| 1단계 | 초기 플러그인 구조 및 관리자 메뉴 구성 |
| 2단계 | 관리자 기능 세분화 (벤더 승인, 정산, 상품 관리 등) |
| 3단계 | 프론트엔드 벤더/구매자 전용 화면 구성 |
| 4단계 | 확장 기능 (알림, 광고 연동, 통계 등) 추가 |

---

## 6. 개발 일정 (예상)

- **1단계**: 오픈소스 분석 및 문서화 (2025.04 ~ 05.초)
- **2단계**: 관리자 UI 설계 및 API 스펙 정의 (5월 중)
- **3단계**: 프론트 UI 및 기능 테스트 (6월 초)
- **4단계**: 베타 테스트 및 릴리즈 준비 (6월 말 ~ 7월 초)

---

# Update History

- [2025-04-29] 최초 초안 작성
- [2025-04-30] 분석 구조 반영하여 전체 문서화 기준으로 업그레이드
