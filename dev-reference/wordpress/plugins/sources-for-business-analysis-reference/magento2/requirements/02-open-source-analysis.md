# 02. Open Source Analysis - Magento2 Store 모듈

## 1. 모듈 개요

- 모듈명: Magento_Store
- 위치: `app/code/Magento/Store/`
- 역할: Magento 전체 시스템의 멀티 스토어, 멀티 웹사이트 구조를 정의하고, 설정값의 범위(Scope)를 처리함
- 계층 구조:
  - Website
  - Store Group
  - Store View (Locale, Theme, Currency 등)

---

## 2. 주요 디렉터리 구조

Magento/Store/ ├── Api/ ← 인터페이스 정의 ├── Block/ ← 관리자 UI 렌더링 ├── Controller/Adminhtml/ ← 관리자 요청 처리 ├── Helper/ ← 유틸리티 기능 (스코프 변환 등) ├── Model/ ← 핵심 계층 로직 (Website, Store, Group) ├── Observer/ ← 이벤트 기반 설정 처리 ├── etc/ ← ACL, DI, 메뉴 구성 XML ├── Test/ ← 단위 테스트

---

## 3. 주요 클래스 및 역할

| 클래스 | 설명 |
|--------|------|
| `Magento\Store\Model\StoreManager` | 현재 요청의 스토어 정보 및 스코프 반환 |
| `Magento\Store\Model\Website` | Website 단위 정보 객체 |
| `Magento\Store\Model\Group` | Store Group 단위 객체 |
| `Magento\Store\Model\Store` | Store View 객체 |
| `Magento\Store\Api\StoreRepositoryInterface` | 스토어 조회/리스트 API |
| `Magento\Store\Helper\Store` | 설정값 스코프 계산 등 유틸리티 |

---

## 4. 설정 파일 (etc)

| 파일 | 설명 |
|------|------|
| `adminhtml/menu.xml` | 관리자 메뉴 구성 (Store Configuration) |
| `di.xml` | 의존성 주입 클래스 설정 |
| `acl.xml` | 관리자 권한 정의 |
| `config.xml` | Store 설정 기본값 |
| `events.xml` | 스토어 관련 이벤트 정의 |

---

## 5. 관리자 UI 흐름 요약

- 경로: `Stores > All Stores`
- 구성 화면:
  - Website 추가/수정
  - Store (Group) 추가/수정
  - Store View 생성 (테마/언어 설정 포함)
- URL 재작성, 카탈로그 설정, 기본 웹사이트 설정 등 포함

---

## 6. Scope 설정 구조

Magento는 설정값을 다음과 같이 구분 저장합니다:

| Scope | 대상 |
|-------|------|
| default | 전체 시스템 (글로벌 설정) |
| websites | 웹사이트 단위 설정 |
| stores | 스토어 뷰 단위 설정 (프론트에 직접 반영됨) |

---

## 7. rena-retail 적용 인사이트

| 항목 | 제안 방향 |
|------|-----------|
| 멀티 약국/지점 분리 | Website = 약국 본사, Store Group = 지점, Store View = 사용자 언어/테마 |
| 설정값 구분 저장 | 설정 테이블에 스코프 컬럼 추가하여 구조 유사하게 구현 가능 |
| UI 구성 방식 | 관리자 메뉴 → 상위/하위 구조 단계별 접근 방식 유지 가능 |
| Scope Helper | 스코프 유틸리티 클래스를 공통 모듈로 따로 분리 가능

---

## 8. 분석 요약

Magento Store 모듈은 멀티스토어 시스템을 위한 계층적 스토어 모델을 정확하게 정의하고 있으며,  
설정값의 범위(Scope)를 기준으로 데이터 분리를 강력히 구현합니다.  
rena-retail은 이 구조를 참고하여 약국, 매장, 지점, 사용자별 설정 분리 및 UI 구성을 설계할 수 있습니다.

---

**작성일**: 2025-04-30  
**작성자**: ChatGPT

