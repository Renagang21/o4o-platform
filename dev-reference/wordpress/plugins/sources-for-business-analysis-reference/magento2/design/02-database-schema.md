# 02. Database Schema - Magento2 멀티스토어 구조

## 📋 개요

Magento2는 하나의 시스템 인스턴스에서 여러 Website, Store Group, Store View를 운영할 수 있도록 설계되어 있으며,  
이 계층적 구조는 DB 내에서도 명확하게 구분됩니다.  
설정값은 각 Scope(범위)에 따라 별도 저장되고, Scope 간 우선순위가 존재합니다.

---

## 1. 핵심 테이블 구조

| 테이블 | 설명 |
|--------|------|
| `store_website` | Website 단위 (도메인 단위 상위 계층) |
| `store_group` | Store 그룹 (카탈로그, 매장 묶음 단위) |
| `store` | Store View (사용자 시점 - 언어/테마 등) |
| `core_config_data` | 설정값 저장 (Scope 기반 저장) |

---

## 2. 테이블 관계도 (ERD 개요)

[store_website] │ └──<1:N>── [store_group] │ └──<1:N>── [store]

- 각 Store View는 하나의 Store Group에 속함
- 하나의 Store Group은 특정 Website에 속함
- 설정값은 Scope(`default`, `websites`, `stores`)에 따라 `core_config_data`에 저장됨

---

## 3. core_config_data 테이블

| 컬럼 | 설명 |
|------|------|
| `scope` | 설정 적용 범위 (`default`, `websites`, `stores`) |
| `scope_id` | 대상 Website ID 또는 Store ID |
| `path` | 설정 경로 (예: `web/unsecure/base_url`) |
| `value` | 설정값 (예: `https://store1.domain.com/`) |

---

## 4. 예시 데이터 계층

| 범위 | 예시 값 | 설명 |
|------|----------|------|
| default | 전체 시스템 공통값 |
| websites.website_id = 1 | "yaksa" 약국 브랜드 전체 설정 |
| stores.store_id = 3 | "강남지점" 스토어 뷰의 테마 또는 로케일 |

---

## 5. rena-retail 설계 시 시사점

| 항목 | 제안 방향 |
|------|-----------|
| 계층적 스토어 테이블 | 약국 브랜드(website), 지점(store_group), 로컬 뷰(store) 구조 채택 |
| 설정 저장 테이블 | 설정값 스코프 적용을 위해 `scope` 컬럼 필수 |
| 우선순위 처리 | default < website < store 순으로 설정값 덮어쓰기 처리 |
| DB 설계 유연성 | 설정 테이블은 key-value 구조로 설계하여 확장 가능성 확보 |

---

**작성일**: 2025-04-30  
**작성자**: ChatGPT



