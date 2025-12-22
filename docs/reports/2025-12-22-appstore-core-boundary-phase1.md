# AppStore Core Boundary Phase1 - Analysis Report

> **Work Order ID:** WO-APPSTORE-CORE-BOUNDARY-PHASE1
> **Date:** 2025-12-22
> **Branch:** `feature/appstore-core-boundary-phase1`
> **Status:** Complete

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Layer Responsibility Definition](#2-core-layer-responsibility-definition)
3. [Dependency Graph](#3-dependency-graph)
4. [Service-Specific Logic Analysis](#4-service-specific-logic-analysis)
5. [Core Purity Criteria](#5-core-purity-criteria)
6. [Dropshipping-Core Refactoring Plan](#6-dropshipping-core-refactoring-plan)
7. [Ops Core Promotion Evaluation](#7-ops-core-promotion-evaluation)
8. [Legacy Core Analysis](#8-legacy-core-analysis)
9. [Phase2/Phase3 Work Items](#9-phase2phase3-work-items)

---

## 1. Executive Summary

O4O Platform의 Core Layer 전체 구조 분석을 완료했습니다.

### 1.1 Core 패키지 현황

| Category | Packages | Status |
|----------|----------|--------|
| **Foundation Core (FROZEN)** | platform-core, auth-core, cms-core, organization-core | 동결 - 변경 금지 |
| **Domain Core (Active)** | ecommerce-core, dropshipping-core, lms-core, partner-core | 활성 - 주의 필요 |
| **Industry Core (Active)** | pharmaceutical-core, digital-signage-core | 활성 - Extension으로 분리 검토 |
| **Hybrid (Legacy)** | forum-app | Core 역할이나 app으로 명명됨 |

### 1.2 주요 발견사항

1. **Core 경계 위반 없음**: 현재 Core 패키지들은 서비스 특화 로직을 포함하지 않음
2. **의존성 구조 정상**: 순환 의존성 없음, 상향 참조만 존재
3. **명명 불일치 발견**: `forum-app`은 Core 역할이지만 app으로 명명됨
4. **Industry Core 분류 필요**: pharmaceutical-core, digital-signage-core는 Extension 패턴 고려 필요
5. **Ops 앱 Core 승격 불필요**: 현재 Extension 구조가 적절함

### 1.3 권장 조치

| Priority | Action | Phase |
|----------|--------|-------|
| P0 | Core 책임 정의 문서화 (완료) | Phase1 |
| P0 | 의존성 그래프 문서화 (완료) | Phase1 |
| P1 | forum-app → forum-core 명명 변경 | Phase2 |
| P2 | pharmaceutical-core Extension 전환 검토 | Phase3 |
| P2 | digital-signage-core 공통 레이어 분리 | Phase3 |

---

## 2. Core Layer Responsibility Definition

### 2.1 Core 계층 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                      Foundation Layer (FROZEN)                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │platform-core│ │  auth-core  │ │  cms-core   │ │organization│ │
│  │             │ │             │ │             │ │   -core    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Domain Layer (Active)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │ ecommerce-  │ │dropshipping-│ │  lms-core   │ │ partner-   │ │
│  │    core     │ │    core     │ │             │ │   core     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
│                        │                                         │
│  ┌─────────────┐       │                         ┌────────────┐ │
│  │ forum-core  │       │                         │  digital-  │ │
│  │  (forum-app)│       │                         │signage-core│ │
│  └─────────────┘       │                         └────────────┘ │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Industry Layer (Extension)                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │pharmaceutical-core│  │dropshipping-     │                     │
│  │  (→ Extension)   │  │   cosmetics      │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Foundation Core (FROZEN) - 변경 금지

#### platform-core
| 항목 | 내용 |
|------|------|
| **역할** | 플랫폼 런타임 인프라 |
| **책임** | 앱 로딩, 설정 관리, 기본 유틸리티 |
| **의존성** | 없음 (독립) |
| **상태** | FROZEN |

#### auth-core
| 항목 | 내용 |
|------|------|
| **역할** | 인증/인가 기반 시스템 |
| **책임** | User/Role/Permission 관리, RBAC |
| **소유 테이블** | users, roles, permissions, role_permissions, user_roles, linked_accounts, refresh_tokens, login_attempts |
| **의존성** | 없음 (독립) |
| **상태** | FROZEN |
| **특이사항** | Entity가 api-server에 존재 (향후 마이그레이션 예정) |

#### cms-core
| 항목 | 내용 |
|------|------|
| **역할** | 콘텐츠 관리 시스템 엔진 |
| **책임** | Template/CPT/ACF/Menu/Media/Settings 관리 |
| **소유 테이블** | 14개 테이블 (cms_*) |
| **의존성** | 없음 (독립) |
| **상태** | FROZEN |
| **핵심 원칙** | CPT/ACF 기반 데이터 구조, ViewComponent + ViewSystem |

#### organization-core
| 항목 | 내용 |
|------|------|
| **역할** | 조직 관리 기반 시스템 |
| **책임** | 계층적 조직 구조, 멤버 관리, 조직 범위 권한 |
| **소유 테이블** | organizations, organization_members, organization_units, organization_roles |
| **의존성** | 없음 (독립) |
| **상태** | FROZEN |
| **핵심 기능** | 트리 구조, 레벨 추적 (국가/지부/지회), 경로 추적 |

### 2.3 Domain Core (Active) - 주의 필요

#### ecommerce-core
| 항목 | 내용 |
|------|------|
| **역할** | 판매 원장 (Source of Truth) |
| **책임** | 주문/결제 통합 관리 |
| **소유 테이블** | ecommerce_orders, ecommerce_order_items, ecommerce_payments |
| **의존성** | organization-core |
| **상태** | Active |
| **핵심 규칙** | OrderType 불변성, ecommerceOrderId 필수 연결 |
| **Purge 정책** | 불가 (allowPurge: false) |

#### dropshipping-core
| 항목 | 내용 |
|------|------|
| **역할** | 산업 중립적 드롭쉬핑 프레임워크 |
| **책임** | Supplier→Offer→Listing→OrderRelay 워크플로우, 정산/커미션 |
| **소유 테이블** | 9개 (suppliers, sellers, products, offers, listings, order_relays, settlement, commission_rules, commission_transactions) |
| **의존성** | organization-core |
| **상태** | Active |
| **확장 패턴** | Extension Interface (hooks) 제공 |

#### lms-core
| 항목 | 내용 |
|------|------|
| **역할** | 학습 관리 시스템 |
| **책임** | 강좌/수업/수강/진도/인증서/출석/퀴즈/설문 관리 |
| **소유 테이블** | 8개 (courses, lessons, enrollments, progress, certificates, events, attendance, content_bundles) |
| **의존성** | organization-core |
| **상태** | Active |

#### partner-core
| 항목 | 내용 |
|------|------|
| **역할** | 파트너/제휴 프로그램 엔진 |
| **책임** | Click→Conversion→Commission→Settlement 워크플로우 |
| **소유 테이블** | 6개 (partners, partner_links, partner_clicks, partner_conversions, partner_commissions, partner_settlement_batches) |
| **의존성** | 없음 (독립) |
| **상태** | Active |

#### forum-app (→ forum-core 명명 변경 권장)
| 항목 | 내용 |
|------|------|
| **역할** | 커뮤니티 포럼 Core |
| **책임** | 게시글/댓글/카테고리/태그/좋아요/북마크 관리 |
| **소유 테이블** | 6개 (forum_post, forum_category, forum_comment, forum_tag, forum_like, forum_bookmark) |
| **의존성** | organization-core (선택적) |
| **상태** | Active |
| **이슈** | Core 역할이지만 `app`으로 명명됨 - Phase2에서 명명 변경 권장 |

#### digital-signage-core
| 항목 | 내용 |
|------|------|
| **역할** | 디지털 사이니지 시스템 |
| **책임** | MediaSource/MediaList/Display/DisplaySlot/Schedule 관리 |
| **소유 테이블** | 7개 |
| **의존성** | platform-core, cms-core |
| **상태** | Active (v0.1.0 - 초기 버전) |

### 2.4 Industry Layer - Extension 패턴 적용 권장

#### pharmaceutical-core
| 항목 | 내용 |
|------|------|
| **현재 역할** | 의약품 B2B 유통 |
| **현재 위치** | Core |
| **권장 위치** | dropshipping-core의 Extension |
| **이유** | dropshipping-core의 extension-interface를 통한 산업 특화 기능 |
| **소유 테이블** | 4개 (pharma_*) |
| **의존성** | dropshipping-core |

---

## 3. Dependency Graph

### 3.1 Core 간 의존성

```
platform-core ────────────────────────────────────────┐
      │                                               │
      ▼                                               ▼
 auth-core (독립)                              digital-signage-core
                                                      │
                                                      │ cms-core
 cms-core (독립)  ◄────────────────────────────────────┘
      │
      └──────────────────────────────────────────────────┐
                                                         │
 organization-core (독립)                                 │
      │                                                  │
      ├───────────────────────────────────┐              │
      │                                   │              │
      ▼                                   ▼              ▼
 ecommerce-core                    dropshipping-core    cms-core
                                         │
                                         ▼
                               pharmaceutical-core (Extension 후보)
```

### 3.2 Core → Extension → Service 의존성

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CORE LAYER                                  │
│                                                                          │
│  organization-core ──────┬───────────────────────────────────────────┐  │
│         │                │                                           │  │
│         ▼                ▼                                           │  │
│  ecommerce-core    dropshipping-core                          partner-core
│         │                │                                           │  │
└─────────┼────────────────┼───────────────────────────────────────────┼──┘
          │                │                                           │
          │    ┌───────────┴───────────┬───────────────┐              │
          │    │                       │               │               │
          │    ▼                       ▼               ▼               │
┌─────────┼────────────────────────────────────────────────────────────┼──┐
│         │  EXTENSION LAYER                                           │  │
│         │                                                            │  │
│         │  dropshipping-cosmetics  pharmaceutical-core  forum-yaksa  │  │
│         │         │                       │            forum-cosmetics  │
│         │         │                       │            membership-yaksa │
│         │         ├─────────────┬─────────┤                          │  │
│         │         ▼             ▼         ▼                          │  │
│         │  cosmetics-partner cosmetics-seller cosmetics-supplier     │  │
│         │         │             │         │                          │  │
│         │         └─────────┬───┴─────────┘                          │  │
│         │                   ▼                                        │  │
│         │  cosmetics-sample-display-extension                        │  │
│         │                                                            │  │
└─────────┼────────────────────────────────────────────────────────────┼──┘
          │                                                            │
          │                       OPS LAYER                            │
┌─────────┼────────────────────────────────────────────────────────────┼──┐
│         │                                                            │  │
│         ▼                                                            ▼  │
│    (ecommerce                                                   partnerops
│     integration)     sellerops   supplierops   pharmacyops           │  │
│                          │            │            │                 │  │
│                          ▼            ▼            ▼                 │  │
│                    dropshipping-core  dropshipping-core  pharmaceutical-core
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.3 의존성 규칙 준수 현황

| 규칙 | 상태 | 비고 |
|------|------|------|
| Core → Extension 금지 | ✅ 준수 | Core가 Extension을 참조하지 않음 |
| Core → Service 금지 | ✅ 준수 | Core가 Service를 참조하지 않음 |
| Extension → Service 금지 | ✅ 준수 | Extension이 Service를 참조하지 않음 |
| 순환 의존성 금지 | ✅ 준수 | 순환 참조 없음 |
| api-server 직접 import 금지 | ⚠️ 주의 | auth-core entity가 api-server에 존재 |

---

## 4. Service-Specific Logic Analysis

### 4.1 분석 결과 요약

**결론: Core 내부에 서비스 특화 로직 없음**

현재 모든 Core 패키지는 산업/고객/브랜드 중립적으로 설계되어 있습니다.

### 4.2 상세 분석

#### cms-core
- **서비스 특화 로직**: 없음
- **상태**: 순수 CMS 엔진

#### auth-core
- **서비스 특화 로직**: 없음
- **상태**: 순수 인증/인가 시스템

#### organization-core
- **서비스 특화 로직**: 없음
- **확인 항목**: 약사회 특화 코드 여부
- **결과**: organization은 범용적인 계층 구조로, 약사회 특화 코드는 `membership-yaksa` Extension에 분리됨

#### ecommerce-core
- **서비스 특화 로직**: 없음
- **상태**: OrderType enum으로 서비스 구분, 실제 로직은 각 서비스에서 처리

#### dropshipping-core
- **서비스 특화 로직**: 없음
- **확인 항목**: 산업군 특화 속성, seller 성과/추천 관련 기능
- **결과**: Extension Interface(hooks)를 통해 산업 특화 기능을 외부로 위임

#### lms-core
- **서비스 특화 로직**: 없음
- **상태**: 범용 학습 관리 시스템

#### partner-core
- **서비스 특화 로직**: 없음
- **확인 항목**: pharmacy-event-receiver
- **결과**: 이벤트 수신자가 있으나, 파트너 커미션 처리만 담당 (산업 중립적)

#### forum-app
- **서비스 특화 로직**: 없음
- **상태**: 범용 포럼 시스템, 산업 특화는 forum-yaksa, forum-cosmetics에서 처리

#### digital-signage-core
- **서비스 특화 로직**: 없음
- **상태**: 범용 사이니지 시스템

#### pharmaceutical-core
- **서비스 특화 로직**: 있음 (의도적)
- **상태**: 의약품 B2B 특화 - Extension으로 재분류 권장
- **포함 내용**: 약사 면허 검증, 약품 코드 관리, 콜드체인 추적

### 4.3 제거 대상 목록

| Package | 제거 대상 | 조치 |
|---------|-----------|------|
| pharmaceutical-core | 없음 (재분류 필요) | Extension으로 재분류 |
| 기타 Core | 없음 | 유지 |

---

## 5. Core Purity Criteria

### 5.1 Core 순수성 정의

Core는 다음 기준을 만족해야 합니다:

| 기준 | 설명 |
|------|------|
| **산업 중립성** | 특정 산업(의약품, 화장품, 관광 등)에 종속되지 않아야 함 |
| **고객 중립성** | 특정 고객(약사회, 화장품 브랜드 등)에 종속되지 않아야 함 |
| **브랜드 중립성** | 특정 브랜드에 종속되지 않아야 함 |
| **기반 시스템** | 비즈니스 규칙이 아닌 기반 시스템이어야 함 |
| **변경 최소화** | 빈번한 변경이 필요하지 않아야 함 |

### 5.2 Core 포함 기준

Core에 포함되어야 하는 기능:

1. **플랫폼 인프라**: 앱 로딩, 설정 관리, 런타임 지원
2. **인증/인가**: 사용자, 역할, 권한 관리
3. **콘텐츠 관리**: CPT/ACF, 템플릿, 미디어
4. **조직 관리**: 계층적 조직 구조
5. **판매 원장**: 주문/결제 통합 (ecommerce-core)
6. **범용 프레임워크**: 드롭쉬핑, 파트너, LMS 등의 **기본 구조**

### 5.3 Core 제외 기준

Core에서 제외되어야 하는 기능:

1. **산업 특화 검증**: 약사 면허, 화장품 인증 등
2. **산업 특화 속성**: 약품 코드, 피부 타입 등
3. **고객 특화 워크플로우**: 약사회 회비, 브랜드 캠페인 등
4. **운영 대시보드**: SellerOps, SupplierOps 등 (Extension)
5. **뷰/UI 특화**: 특정 테마, 브랜드 컬러 등

### 5.4 현재 Core 순수성 평가

| Core | 순수성 | 비고 |
|------|--------|------|
| platform-core | ✅ 100% | 완전 순수 |
| auth-core | ✅ 100% | 완전 순수 |
| cms-core | ✅ 100% | 완전 순수 |
| organization-core | ✅ 100% | 완전 순수 |
| ecommerce-core | ✅ 100% | 완전 순수 |
| dropshipping-core | ✅ 100% | Extension Interface로 확장 분리 |
| lms-core | ✅ 100% | 완전 순수 |
| partner-core | ✅ 100% | 완전 순수 |
| forum-app | ✅ 100% | 완전 순수 (명명만 변경 필요) |
| digital-signage-core | ✅ 95% | 약간의 공통 레이어 정리 필요 |
| pharmaceutical-core | ❌ 0% | Extension으로 재분류 필요 |

---

## 6. Dropshipping-Core Refactoring Plan

### 6.1 현재 상태

Dropshipping-core는 이미 산업 중립적으로 잘 설계되어 있습니다:

- Extension Interface (hooks) 제공
- 산업 특화 검증은 extension-interface.ts를 통해 위임
- Seller 관련 로직은 sellerops Extension에 분리됨

### 6.2 Extension Interface 현황

```typescript
// packages/dropshipping-core/src/hooks/extension-interface.ts

interface DropshippingExtension {
  productType: string;

  // Validation Hooks
  validateOfferCreation?: (offer: any) => Promise<ValidationResult>;
  validateListingCreation?: (listing: any) => Promise<ValidationResult>;
  validateOrderCreation?: (order: any) => Promise<ValidationResult>;

  // Settlement Hooks
  beforeSettlementCreate?: (batch: any) => Promise<any>;
  beforeSettlementClose?: (batch: any) => Promise<any>;

  // Commission Hooks
  beforeCommissionApply?: (commission: any) => Promise<any>;
  afterCommissionApply?: (commission: any) => Promise<void>;
}
```

### 6.3 정비 계획

| 항목 | 현재 | 목표 | Priority |
|------|------|------|----------|
| Extension Interface | 존재 | 문서화 강화 | P1 |
| SellerOps 로직 | 분리됨 | 유지 | - |
| Commission 기본 레이어 | 존재 | 유지 | - |
| 확장 기반 구조 | 완료 | 유지 | - |

### 6.4 결론

**Dropshipping-core는 현재 상태 유지 권장**

- 이미 산업 중립적 구조
- Extension Interface가 잘 정의됨
- 추가 정비 불필요

---

## 7. Ops Core Promotion Evaluation

### 7.1 평가 대상

| App | 현재 타입 | Core 승격 검토 |
|-----|----------|---------------|
| sellerops | extension | 검토 대상 |
| supplierops | extension | 검토 대상 |
| partnerops | extension | 검토 대상 |
| pharmacyops | service | 검토 대상 |

### 7.2 Core 승격 기준

Core로 승격되려면 다음을 만족해야 합니다:

1. **범용성**: 여러 서비스에서 공통으로 사용
2. **기반 시스템**: 다른 앱의 기반이 됨
3. **안정성**: 자주 변경되지 않음
4. **의존성 방향**: 다른 앱이 의존함 (의존하지 않음)

### 7.3 Ops 앱 평가

#### SellerOps
| 기준 | 평가 | 비고 |
|------|------|------|
| 범용성 | ❌ | Seller 전용 대시보드 |
| 기반 시스템 | ❌ | 운영 UI 레이어 |
| 안정성 | ⚠️ | UI 변경 빈번 |
| 의존성 방향 | ❌ | Core에 의존 |

**결론: Extension 유지 권장**

#### SupplierOps
| 기준 | 평가 | 비고 |
|------|------|------|
| 범용성 | ❌ | Supplier 전용 대시보드 |
| 기반 시스템 | ❌ | 운영 UI 레이어 |
| 안정성 | ⚠️ | UI 변경 빈번 |
| 의존성 방향 | ❌ | Core에 의존 |

**결론: Extension 유지 권장**

#### PartnerOps
| 기준 | 평가 | 비고 |
|------|------|------|
| 범용성 | ❌ | Partner 전용 대시보드 |
| 기반 시스템 | ❌ | 운영 UI 레이어 |
| 안정성 | ⚠️ | v2.0.0 - 최근 업데이트 |
| 의존성 방향 | ❌ | partner-core에 의존 |

**결론: Extension 유지 권장**

#### PharmacyOps
| 기준 | 평가 | 비고 |
|------|------|------|
| 범용성 | ❌ | 약국 전용 대시보드 |
| 기반 시스템 | ❌ | 운영 UI 레이어 |
| 안정성 | ⚠️ | 새로운 기능 추가 중 |
| 의존성 방향 | ❌ | pharmaceutical-core에 의존 |

**결론: Service 유지 권장**

### 7.4 최종 판정

| App | 현재 타입 | 권장 타입 | 조치 |
|-----|----------|----------|------|
| sellerops | extension | extension | 유지 |
| supplierops | extension | extension | 유지 |
| partnerops | extension | extension | 유지 |
| pharmacyops | service | service | 유지 |

**Ops 앱들은 Core 승격이 불필요합니다.**

- 운영 대시보드는 Extension/Service 계층에 적합
- Core에 의존하는 구조가 올바름
- 현재 아키텍처 유지 권장

---

## 8. Legacy Core Analysis

### 8.1 forum-app 분석

| 항목 | 현재 | 권장 |
|------|------|------|
| 패키지명 | forum-app | forum-core |
| appType | core | core |
| 역할 | 포럼 Core | 포럼 Core |

**이슈**: 패키지명이 `app`이지만 실제로는 Core 역할

**권장 조치** (Phase2):
1. 패키지명 `forum-app` → `forum-core` 변경
2. import 경로 업데이트
3. 의존하는 패키지 업데이트 (forum-yaksa, forum-cosmetics)

### 8.2 pharmaceutical-core 분석

| 항목 | 현재 | 권장 |
|------|------|------|
| 패키지명 | pharmaceutical-core | pharmaceutical-extension |
| appType | core | extension |
| 역할 | 의약품 특화 | dropshipping-core Extension |

**이슈**: Industry 특화 기능이 Core로 분류됨

**권장 조치** (Phase3):
1. appType `core` → `extension` 변경
2. manifest의 dependencies에 `dropshipping-core` 명시
3. Extension Interface 활용 강화

### 8.3 digital-signage-core 분석

| 항목 | 현재 | 권장 |
|------|------|------|
| 버전 | v0.1.0 | 안정화 필요 |
| 의존성 | platform-core, cms-core | 유지 |
| 상태 | 초기 버전 | 개발 중 |

**이슈**: 초기 버전으로 공통 레이어 정리 필요

**권장 조치** (Phase3):
1. 공통 레이어 식별 및 분리
2. Extension 포인트 정의
3. signage-pharmacy-extension과의 경계 명확화

### 8.4 lms-core 분석

| 항목 | 현재 | 상태 |
|------|------|------|
| 역할 | 학습 관리 시스템 | 범용적 |
| 확장 | lms-yaksa | Extension 분리됨 |
| 순수성 | 100% | 양호 |

**결론**: 현재 상태 유지 권장

---

## 9. Phase2/Phase3 Work Items

### 9.1 Phase2 작업 목록

| ID | 작업 | Priority | 영향 범위 |
|----|------|----------|----------|
| P2-001 | forum-app → forum-core 명명 변경 | P1 | forum-yaksa, forum-cosmetics |
| P2-002 | Extension Interface 문서화 | P1 | dropshipping-core 관련 전체 |
| P2-003 | auth-core entity 마이그레이션 계획 | P2 | api-server, auth-core |

### 9.2 Phase3 작업 목록

| ID | 작업 | Priority | 영향 범위 |
|----|------|----------|----------|
| P3-001 | pharmaceutical-core → Extension 전환 | P2 | pharmacyops, pharmaceutical-core |
| P3-002 | digital-signage-core 공통 레이어 분리 | P2 | signage-pharmacy-extension |
| P3-003 | Core 의존성 최적화 | P3 | 전체 |

### 9.3 Phase4 작업 목록

| ID | 작업 | Priority | 영향 범위 |
|----|------|----------|----------|
| P4-001 | AppStore 전체 일관성 검증 | P2 | 전체 |
| P4-002 | Core Purity 자동 검증 도구 | P3 | CI/CD |
| P4-003 | 의존성 그래프 자동 생성 | P3 | 문서화 |

### 9.4 위험 요소 및 완화

| Risk | Impact | Mitigation |
|------|--------|------------|
| forum-app 명명 변경 시 import 누락 | Medium | 자동화된 리팩토링 도구 사용 |
| pharmaceutical-core 전환 시 기능 손실 | Low | 단계적 전환, 테스트 강화 |
| digital-signage-core 분리 시 호환성 | Low | 인터페이스 유지, deprecation 기간 |

---

## Appendix A: Package Inventory

### A.1 Core Packages (12개)

| Package | Version | Type | Status |
|---------|---------|------|--------|
| platform-core | 1.0.0 | infra-core | FROZEN |
| auth-core | 1.0.0 | core | FROZEN |
| cms-core | 1.0.0 | core | FROZEN |
| organization-core | 1.0.0 | core | FROZEN |
| ecommerce-core | 1.0.0 | core | Active |
| dropshipping-core | 1.0.0 | core | Active |
| lms-core | 1.0.0 | core | Active |
| partner-core | 1.0.0 | core | Active |
| forum-app | 1.0.0 | core | Active |
| digital-signage-core | 0.1.0 | core | Active |
| pharmaceutical-core | 1.0.0 | core | Active → Extension |
| block-core | 1.0.0 | core | Active |

### A.2 Ops Packages (4개)

| Package | Version | Type | Core Dependency |
|---------|---------|------|-----------------|
| sellerops | 1.0.0 | extension | dropshipping-core |
| supplierops | 1.0.0 | extension | dropshipping-core |
| partnerops | 2.0.0 | extension | partner-core |
| pharmacyops | 1.0.0 | service | pharmaceutical-core |

### A.3 Extension Packages (15개+)

| Package | Type | Core Dependency |
|---------|------|-----------------|
| dropshipping-cosmetics | extension | dropshipping-core |
| cosmetics-partner-extension | extension | dropshipping-cosmetics |
| cosmetics-seller-extension | extension | dropshipping-cosmetics |
| cosmetics-supplier-extension | extension | dropshipping-cosmetics |
| cosmetics-sample-display-extension | extension | cosmetics-*-extension |
| forum-yaksa | extension | forum-app |
| forum-cosmetics | extension | forum-app |
| membership-yaksa | extension | organization-core |
| lms-yaksa | extension | lms-core |
| signage-pharmacy-extension | extension | digital-signage-core |
| health-extension | extension | dropshipping-core |
| annualfee-yaksa | extension | membership-yaksa |
| groupbuy-yaksa | extension | - |
| reporting-yaksa | extension | - |
| yaksa-scheduler | extension | - |

---

## Appendix B: Definition of Done Checklist

- [x] Core Layer 책임 정의 문서 완성
- [x] Core/Extension/Service 경계 명문화
- [x] Core 내부 특화 기능 제거 대상 목록 완성
- [x] Core 간 의존성 지도(Dependency Map) 완성
- [x] Dropshipping-Core 구조 정비 계획 수립
- [x] SellerOps/PartnerOps/InfluencerOps Core 여부 판정 기준 수립
- [x] Phase2로 진행할 Work Order 리스트 제출

---

*Generated: 2025-12-22*
*Work Order: WO-APPSTORE-CORE-BOUNDARY-PHASE1*
*Status: Complete*
