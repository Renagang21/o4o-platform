# Project Overview - Magento2 (멀티스토어 구조 분석)

## 1. 프로젝트 정보

- 분석 대상: Magento 2.4 (공식 저장소 기준)
- 분석 모듈: `app/code/Magento/Store/`
- 분석 목적: rena-retail 플러그인의 멀티스토어 및 스토어 그룹 구조 설계 기반 확보
- 분석자: ChatGPT
- 분석일: 2025-04-30
- 원본 소스 위치: `src/magento2-2.4-develop.zip`

---

## 2. 모듈 개요

Magento2의 `Store` 모듈은 멀티사이트, 멀티스토어, 멀티스토어뷰를 지원하기 위한 **핵심 시스템 계층**을 정의합니다.  
주요 계층 구조는 다음과 같습니다:

Website → Store Group → Store View


이 구조를 통해 하나의 Magento 인스턴스 내에 복수의 도메인, 언어, 통화 등을 구분할 수 있습니다.

---

## 3. 주요 기능 요약

| 항목 | 설명 |
|------|------|
| Website 단위 관리 | 도메인, 루트 카탈로그 등 상위 단위 관리 |
| Store Group | Website 내 여러 상점 그룹 구성 가능 |
| Store View | 언어/테마 기반 세부 스토어 뷰 제공 |
| 관리자 화면 | 각 계층별 생성/수정/삭제 지원 |
| 스코프 설정 | 설정값(설정, 제품, 카테고리 등)을 Store 단위로 구분 저장 |

---

## 4. 사용자 흐름 요약

- **관리자(Admin)**: Website, Store Group, Store View를 생성/편집
- **시스템(System)**: 설정 및 데이터 스코프(scope)에 따라 개별 스토어 설정값 구분
- **프론트엔드**: Store View 기준으로 테마, 언어, 카탈로그 등 자동 적용됨

---

## 5. 분석 목적

rena-retail 플러그인에서는 다음과 같은 구조를 설계할 때 Magento2를 참조합니다:

- 약국/지점 단위 스토어 그룹 분리
- 상품/설정 스코프 분리 저장
- 관리자 화면에서 다중 스토어 계층 구성
- 설정 UI에서 Website/Store/StoreView 구분 방식 적용

---

## 6. 분석 문서 구성

| 문서명 | 설명 |
|--------|------|
| `02-open-source-analysis.md` | 전체 기능 및 구조 분석 |
| `design/01-admin-ui-wireframe.md` | 관리자 UI 흐름 정리 |
| `design/02-database-schema.md` | Website-StoreGroup-StoreView 관계 정리 |
| `test/01-test-cases.md` | 계층별 UI 및 설정 테스트 시나리오 정리 |

---

## Update History

- [2025-04-30] 최초 작성 - 모듈 분석 기반 개요 정리
