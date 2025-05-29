# 01. Admin UI Wireframe - Magento2 멀티스토어 구조

## 📋 개요

본 문서는 Magento2의 멀티스토어 구조를 구성하는 관리자 화면 흐름을 정리한 것입니다.  
Websites, Store Groups, Store Views 세 계층을 기반으로 한 설정 화면 흐름은 rena-retail에서의 멀티약국/지점 설계 시 중요한 참고가 됩니다.

---

## 1. 관리자 메뉴 구성

Admin Panel └── Stores ├── All Stores (전체 구조 보기) ├── Configuration (설정값 스코프 구분) ├── Terms and Conditions └── Currency Rates

---

## 2. All Stores - 메인 UI 구성

| 항목 | 설명 |
|------|------|
| Websites 리스트 | 상위 단위 (기본 도메인 기반 분기) |
| Store Groups | 웹사이트에 연결된 중간 단위 그룹 |
| Store Views | 테마/언어 기반 사용자 시점 화면 단위 |
| 액션 버튼 | Create Website / Create Store / Create Store View |

---

## 3. Store Creation 화면 흐름

### Website 생성

| 필드 | 설명 |
|------|------|
| Name | 웹사이트 이름 |
| Code | 시스템 코드 (영문 고유값) |
| Sort Order | 관리자 정렬 기준 |
| Default Group | 하위 그룹 지정 |

---

### Store Group 생성

| 필드 | 설명 |
|------|------|
| Name | 그룹 이름 |
| Website | 상위 Website 선택 |
| Root Category | 상품 카탈로그 루트 선택 |
| Default Store View | 대표 스토어 뷰 선택 |

---

### Store View 생성

| 필드 | 설명 |
|------|------|
| Name | 화면에 표시될 이름 |
| Code | 고유 코드 (URL 식별자 등) |
| Status | 활성화 여부 |
| Store | 속한 그룹 선택 |

---

## 4. 스코프 설정 UI 예시

- 관리자 설정 페이지 (`Stores > Configuration`)에서는 설정값에 대해 scope 드롭다운이 존재
- Scope 변경 시 해당 범위에만 설정값 적용됨
- 범위 구분:
  - Global
  - Website
  - Store View

---

## 5. rena-retail 적용 고려사항

| 항목 | 제안 방향 |
|------|-----------|
| 약국 그룹 | Website → 약국 본사 또는 브랜드 단위 |
| 지점/매장 | Store Group → 개별 오프라인 지점 구분 |
| 사용자 뷰 | Store View → 언어/지역/디자인 별 구분 가능 |
| 설정 스코프 | 관리자 설정값에 scope selector UI 반영 고려 |
| 생성 UI 흐름 | 단일 화면 또는 탭 방식으로 생성 흐름 개선 가능 |

---

**작성일**: 2025-04-30  
**작성자**: ChatGPT


