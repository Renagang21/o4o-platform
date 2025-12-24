# WO-GEN-PLATFORM-APP-CONSOLIDATION-R6

> **Phase**: R6 - 판단 / 분류 / 결정
> **Status**: Completed
> **Date**: 2025-12-25

---

## 1. 개요

R6 Phase의 목표는 모든 packages/ 하위 패키지를 분석하여 **Drop / Merge / Keep** 결정을 내리는 것이다.

### 1.1 조사 범위

| 구분 | 수량 |
|------|------|
| packages/ | 58개 |
| apps/ | 11개 (조사 제외) |

---

## 2. 분류 기준

### 2.1 DROP 기준

- src 디렉토리 없음 (빈 패키지)
- 12개월 이상 미사용
- 다른 패키지에서 의존성 없음
- 이미 다른 패키지로 기능 이전 완료

### 2.2 MERGE 기준

- 기능 중복
- CLAUDE.md 규칙 위반 (Design Core 등)
- 통합으로 유지보수 비용 절감 가능

### 2.3 KEEP 기준

- manifest.ts + lifecycle 완비
- 활성 사용 중
- 다른 패키지에서 의존
- FROZEN 정책 대상

---

## 3. DROP 대상 (R7 Work Orders)

### 3.1 확정 DROP (4개)

| 패키지 | 사유 | 우선순위 |
|--------|------|----------|
| `admin` | 빈 패키지 (manifest.json만 존재, src 없음) | P1 |
| `commerce` | 빈 패키지 (manifest.json만 존재, src 없음) | P1 |
| `customer` | 빈 패키지 (manifest.json만 존재, src 없음) | P1 |
| `lms-marketing` | 미사용 (grep 결과 의존성 0건) | P2 |

### 3.2 DROP 상세

#### admin
```
packages/admin/
├── manifest.json  (1,236 bytes)
├── package.json
└── tsconfig.json
```
- **분석**: src 디렉토리 없음. 실제 코드 0 bytes
- **결정**: DROP
- **영향**: 없음

#### commerce
```
packages/commerce/
├── manifest.json  (1,132 bytes)
├── package.json
└── tsconfig.json
```
- **분석**: src 디렉토리 없음. ecommerce-core로 완전 이전됨
- **결정**: DROP
- **영향**: 없음

#### customer
```
packages/customer/
├── manifest.json  (1,065 bytes)
├── package.json
└── tsconfig.json
```
- **분석**: src 디렉토리 없음. 실제 코드 0 bytes
- **결정**: DROP
- **영향**: 없음

#### lms-marketing
```
packages/lms-marketing/
├── migrations/
├── src/
├── TODO.md  (6,000 bytes)
├── package.json
└── tsconfig.json
```
- **분석**: 코드 존재하나 의존성 0건. TODO.md 존재 = 미완성
- **결정**: DROP
- **영향**: 없음 (미사용 확인)

---

## 4. MERGE 검토 대상 (R8 Work Orders)

### 4.1 검토 대상 (2개)

| 패키지 | 대상 | 사유 | 우선순위 |
|--------|------|------|----------|
| `design-system-cosmetics` | → `ui` | CLAUDE.md §3.5 Design Core 규칙 | P2 |
| `@o4o-apps/signage` | 구조 단순화 | 메타 패키지 정리 | P3 |

### 4.2 MERGE 상세

#### design-system-cosmetics
- **현상**: 코스메틱 전용 디자인 시스템
- **문제**: CLAUDE.md §3.5.1 위반 - "App 내부에서 독자적인 디자인 시스템 생성 금지"
- **결정**: MERGE 검토 (ui 패키지로 통합)
- **조건**: Phase 4+ Work Order 필요

#### @o4o-apps/signage
- **현상**: 하위에 signage만 존재하는 메타 패키지
- **결정**: 구조 단순화 또는 제거 검토

---

## 5. KEEP 대상 (54개)

### 5.1 FROZEN Core (4개)

| 패키지 | manifest | lifecycle | 상태 |
|--------|----------|-----------|------|
| `auth-core` | Y | Y | FROZEN |
| `cms-core` | Y | Y | FROZEN |
| `platform-core` | Y | Y | FROZEN |
| `organization-core` | Y | Y | FROZEN |

### 5.2 Domain Core (8개)

| 패키지 | manifest | lifecycle | 상태 |
|--------|----------|-----------|------|
| `forum-core` | Y | Y | Active |
| `ecommerce-core` | Y | Y | Active |
| `lms-core` | Y | Y | Development |
| `dropshipping-core` | Y | Y | Active |
| `digital-signage-core` | N | N | Active (보완 필요) |
| `partner-core` | Y | Y | Development |
| `pharmaceutical-core` | Y | Y | Experimental |
| `block-core` | N | N | Active (보완 필요) |

### 5.3 Cosmetics Extensions (7개)

| 패키지 | manifest | lifecycle |
|--------|----------|-----------|
| `cosmetics-seller-extension` | Y | Y |
| `cosmetics-supplier-extension` | Y | N (보완 필요) |
| `cosmetics-partner-extension` | Y | Y |
| `cosmetics-sample-display-extension` | Y | Y |
| `dropshipping-cosmetics` | Y | Y |
| `forum-cosmetics` | Y | Y |
| `design-system-cosmetics` | N | N | (MERGE 검토) |

### 5.4 Yaksa Extensions (10개)

| 패키지 | manifest | lifecycle | 비고 |
|--------|----------|-----------|------|
| `forum-yaksa` | Y | Y | Active |
| `membership-yaksa` | Y | Y | Active (관리자용) |
| `member-yaksa` | Y | Y | Active (회원용) |
| `lms-yaksa` | Y | Y | Development |
| `reporting-yaksa` | Y | Y | Active |
| `annualfee-yaksa` | Y | Y | Active |
| `groupbuy-yaksa` | Y | Y | Development |
| `yaksa-accounting` | Y | Y | Development |
| `yaksa-admin` | Y | Y | Active |
| `yaksa-scheduler` | Y | Y | Development |

> **Note**: member-yaksa와 membership-yaksa는 서로 다른 사용자 그룹 대상
> - membership-yaksa: 관리자용 회원관리
> - member-yaksa: 약사 회원용 앱 (membership-yaksa에 의존)

### 5.5 Healthcare Extensions (5개)

| 패키지 | manifest | lifecycle | 상태 |
|--------|----------|-----------|------|
| `health-extension` | Y | Y | Experimental |
| `pharmacy-ai-insight` | Y | Y | Experimental |
| `cgm-pharmacist-app` | Y | Y | Experimental |
| `signage-pharmacy-extension` | Y | Y | Experimental |
| `pharmacyops` | Y | Y | Experimental |

### 5.6 Integration Extensions (4개)

| 패키지 | manifest | lifecycle |
|--------|----------|-----------|
| `organization-forum` | Y | Y |
| `organization-lms` | Y | Y |
| `digital-signage-contract` | N | N |
| `supplier-connector` | N | N |

### 5.7 Ops (Feature) (4개)

| 패키지 | manifest | lifecycle | 상태 |
|--------|----------|-----------|------|
| `sellerops` | Y | Y | Active |
| `supplierops` | Y | Y | Active |
| `partnerops` | Y | Y | Active |
| `pharmacyops` | Y | Y | Experimental |

### 5.8 Utility (9개)

| 패키지 | AppStore | 비고 |
|--------|----------|------|
| `ui` | N | Design Core v1.0 |
| `types` | N | 공통 타입 |
| `utils` | N | 공통 유틸리티 |
| `auth-client` | N | 인증 클라이언트 |
| `auth-context` | N | 인증 컨텍스트 |
| `shortcodes` | N | 숏코드 시스템 |
| `block-renderer` | N | 블록 렌더러 |
| `cpt-registry` | N | CPT 레지스트리 |
| `appearance-system` | N | 외관 시스템 |

### 5.9 Standalone (3개)

| 패키지 | manifest | lifecycle | 상태 |
|--------|----------|-----------|------|
| `slide-app` | N | N | Active (보완 필요) |
| `market-trial` | Y | Y | Experimental |
| `partner-ai-builder` | Y | Y | Experimental |

---

## 6. 보완 필요 패키지

manifest.ts 또는 lifecycle이 없는 Active 상태 패키지:

| 패키지 | manifest | lifecycle | 조치 |
|--------|----------|-----------|------|
| `digital-signage-core` | N | N | 추가 필요 |
| `block-core` | N | N | 추가 필요 |
| `cosmetics-supplier-extension` | Y | N | lifecycle 추가 |
| `slide-app` | N | N | 추가 필요 |
| `digital-signage-contract` | N | N | 추가 필요 |
| `supplier-connector` | N | N | 추가 필요 |

---

## 7. R7/R8 Work Order 생성 계획

### 7.1 R7 (Drop Work Orders)

```
WO-R7-DROP-001: admin 패키지 삭제
WO-R7-DROP-002: commerce 패키지 삭제
WO-R7-DROP-003: customer 패키지 삭제
WO-R7-DROP-004: lms-marketing 패키지 삭제
```

### 7.2 R8 (Merge Work Orders)

```
WO-R8-MERGE-001: design-system-cosmetics → ui 통합 검토
WO-R8-MERGE-002: @o4o-apps 구조 단순화
```

### 7.3 R9 (Verification)

```
WO-R9-VERIFY-001: AppStore 정합성 재검증
WO-R9-VERIFY-002: manifest/lifecycle 보완 검증
```

---

## 8. 요약

| 분류 | 수량 | 비율 |
|------|------|------|
| **DROP** | 4 | 6.9% |
| **MERGE 검토** | 2 | 3.4% |
| **KEEP** | 52 | 89.7% |
| **합계** | 58 | 100% |

### 8.1 결론

1. **DROP 4개**: 빈 패키지 또는 미사용 패키지 즉시 삭제 가능
2. **MERGE 검토 2개**: Design Core 규칙 적용 검토 필요
3. **보완 필요 6개**: manifest/lifecycle 추가 필요

### 8.2 다음 단계

| Phase | 작업 | 예상 범위 |
|-------|------|----------|
| R7 | Drop 대상 정리 | 4 패키지 삭제 |
| R8 | Merge 대상 통합 | 2 패키지 검토 |
| R9 | AppStore 정합성 검증 | 전체 검증 |

---

*R6 Phase Completed*
*Date: 2025-12-25*
