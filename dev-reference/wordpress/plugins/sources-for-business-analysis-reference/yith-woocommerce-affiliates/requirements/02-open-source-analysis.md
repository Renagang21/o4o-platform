# 02. Open Source Analysis - YITH WooCommerce Affiliates

## 1. 플러그인 개요

- 플러그인명: YITH WooCommerce Affiliates
- 주요 목적: WooCommerce 기반 추천 마케팅 기능 제공
- 방식: 고유 추천 링크 생성 → 방문자 추적 → 구매 시 커미션 지급
- 특징:
  - 자동 링크 생성
  - 방문자 추적용 쿠키 사용
  - 커미션 승인/거절 기능 내장
  - 추천 내역 및 수익 리포트 제공

---

## 2. 주요 기능 정리

| 기능 | 설명 |
|------|------|
| 추천 링크 생성 | 사용자 ID 기반 고유 링크 자동 생성 |
| 방문자 추적 | 쿠키 저장 (기본 30일), 주문과 연결 |
| 커미션 계산 | 상품/카테고리별 비율 또는 고정 커미션 설정 가능 |
| 커미션 승인/거절 | 수동 승인 흐름 또는 자동 처리 가능 |
| 관리자 리포트 | 클릭 수, 주문 수, 커미션 총액 등 통계 제공 |
| 사용자 리포트 | 개인 추천 수익 통계, 링크 공유 기능 |

---

## 3. 디렉터리 구조 요약
yith-woocommerce-affiliates/ ├── init.php ├── includes/ │ ├── class.yith-affiliate.php │ ├── class.yith-affiliates.php │ ├── class.yith-affiliates-admin.php │ └── class.yith-affiliates-frontend.php ├── templates/ │ ├── admin/ │ └── user/ ├── plugin-options/ ├── plugin-fw/ └── widgets/


---

## 4. 주요 클래스 및 훅 구조

| 클래스명 | 설명 |
|----------|------|
| `YITH_Affiliate` | 단일 추천인 정보 처리 |
| `YITH_Affiliates` | 전체 추천인 목록, 트래킹, 커미션 처리 |
| `YITH_Affiliates_Admin` | 관리자 UI 처리 |
| `YITH_Affiliates_Frontend` | 사용자 리포트 렌더링, 숏코드 제공 |

### 대표 훅

| Hook | 설명 |
|------|------|
| `woocommerce_thankyou` | 주문 완료 시 커미션 처리 |
| `init` | 추천인 등록 및 쿠키 검증 |
| `admin_menu` | 관리자 메뉴 생성 |
| `widgets_init` | 추천 링크 위젯 등록 |

---

## 5. 관리자 및 사용자 화면 흐름

### ✅ 관리자

- 추천인 목록 관리
- 커미션 내역 승인/거절 처리
- 설정 (쿠키 유효기간, 기본 커미션율, 자동 승인 여부)
- 통계 리포트 (월별 클릭/구매/커미션 등)

### 👤 사용자

- 내 추천 링크 보기/복사
- 내 수익 내역 확인
- 누적 클릭 수, 구매 전환 수, 수익 요약

---

## 6. rena-retail 플러그인에 적용할 인사이트

| 항목 | 적용 방향 |
|------|-----------|
| 링크 기반 추적 | 유입 경로 및 방문자 추적 로직 재사용 가능 |
| 커미션 처리 구조 | 승인/거절 흐름 유지하면서 CPT 기반 확장 고려 |
| 통계 UI | 클릭→구매→수익 구조의 단계적 통계 시각화 적용 가능 |
| 쿠키/세션 방식 | 방문자 추적은 비로그인 기반에서도 처리되므로 구조 유지 |

---

## 7. 분석 요약

YITH WooCommerce Affiliates 플러그인은 WooCommerce에서 제휴 마케팅을 간단하게 구현할 수 있게 하며, 핵심 로직은 **"방문자 추적 → 주문 연동 → 커미션 지급"** 흐름입니다.  
rena-retail에서는 추천 기반 리워드 시스템, 알림, 자동 보상 로직 등으로 확장해 응용할 수 있습니다.

---

**작성일**: 2025-04-30  
**작성자**: ChatGPT


