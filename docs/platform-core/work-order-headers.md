# Work Order Headers

> O4O 플랫폼 표준 작업 요청서 헤더 템플릿

**Version:** 1.0  
**Date:** 2025-12-24  
**Status:** Active

---

## 개요

모든 작업 요청서는 아래 5가지 표준 헤더 중 하나를 사용해야 합니다.  
각 헤더는 **작업 성격**, **브랜치 전략**, **문서 저장 위치**, **보관 정책**을 명확히 규정합니다.

---

## 1. 일반 개발 작업 요청서 (General Development Work Order)

### 용도
- 신규 기능 개발
- 기존 기능 개선
- 버그 수정
- 성능 최적화

### 헤더 템플릿

```markdown
Work Order – [Feature/Component Name]
=====================================================================

📌 Work Order ID
WO-[CATEGORY]-[FEATURE]-[VERSION]

예: WO-ECOMMERCE-CART-V2, WO-PLATFORM-AUTH-FIX

📌 작업 분류
☐ 신규 기능 개발
☐ 기존 기능 개선
☐ 버그 수정
☐ 성능 최적화

📌 대상
Core: [Core System Name]
적용 영역: [Specific Area/Module]
연계 시스템: [Related Systems, 없으면 "없음"]

📌 작업 성격
[작업의 핵심 목적 1줄 요약]

📌 브랜치 전략
Base Branch: develop
Feature Branch: feature/[feature-name]
Merge Target: develop (PR 필수)

📌 영향받는 문서
- `docs/services/{service}/apps/{app}/current-status.md`
- `docs/services/{service}/apps/{app}/app-behavior.md` (필요 시)
- (기타)

📌 보고 문서
작업 완료 후 임시 보고서 생성
위치: docs/_reports/WO-[ID]-report.md
보관 기간: PR 머지 후 7일 → 자동 삭제

🔒 작업 완료 조건
- [ ] 코드 구현 완료
- [ ] 영향받는 문서 모두 업데이트
- [ ] PR 승인 및 머지
- [ ] 보고서 작성
```

### 문서 저장 위치
- **작업 중**: `docs/_work-orders/WO-[ID].md`
- **완료 후**: `docs/_reports/WO-[ID]-report.md` (7일 후 삭제)

---

## 2. 앱 개발 작업 요청서 (App Development Work Order)

### 용도
- 새로운 앱 생성
- 앱 확장 기능 개발
- 앱 Phase별 개발

### 헤더 템플릿

```markdown
Work Order – [App Name] [Phase/Feature]
=====================================================================

📌 CLAUDE.md의 앱 개발 시 작업 규칙에 따라 작성한다

📌 Work Order ID
WO-[SERVICE]-[APP]-[PHASE]

예: WO-COSMETICS-SIGNAGE-PHASE2, WO-YAKSA-MEMBERSHIP-V1

📌 대상
Core: [Core System] (변경 여부 명시: 변경 없음 / 확장 필요)
적용 영역: [App Name]
연계 데이터:
  - [Extension/Package 1]
  - [Extension/Package 2]
  - (없으면 "없음")

📌 작업 성격
☐ 운영 중심 작업 (Operational Enhancement)
☐ 개발 중심 작업 (Development Focus)
☐ 확장 중심 작업 (Extension Focus)

[간단한 설명 1줄]

📌 브랜치 전략
Base Branch: develop
Feature Branch: feature/[service]-[app]-[phase]
Merge Target: develop (PR 필수)

📌 영향받는 문서
- `docs/services/{service}/apps/{app}/app-definition.md`
- `docs/services/{service}/apps/{app}/current-status.md`
- `docs/services/{service}/service-status.md` (앱 추가 시)
- (기타)

📌 보고 문서
작업 완료 후 임시 보고서 생성
위치: docs/_reports/WO-[ID]-report.md
보관 기간: PR 머지 후 7일 → 자동 삭제

🔒 작업 완료 조건
- [ ] 코드 구현 완료
- [ ] app-definition.md 업데이트
- [ ] current-status.md 업데이트
- [ ] service-status.md 업데이트 (필요 시)
- [ ] PR 승인 및 머지
- [ ] 보고서 작성
```

### 문서 저장 위치
- **작업 중**: `docs/_work-orders/WO-[ID].md`
- **완료 후**: `docs/_reports/WO-[ID]-report.md` (7일 후 삭제)

---

## 3. 조사 요청서 (Investigation Request)

### 용도
- 기술 조사
- 의사결정 자료 수집
- 아키텍처 분석
- 문제 원인 파악

### 헤더 템플릿

```markdown
⚠️ 이 문서는 조사(임시) 문서다.
조사 종료 시 요약 반영 후 즉시 삭제한다.
기준 문서로 남을 수 없다.

📌 Investigation ID
IR-YYYYMMDD-XXX

예: IR-20251224-001, IR-20251224-auth-flow

📌 조사 질문 (1개만)
이 조사는 무엇을 판단하기 위한 것인가?
(Yes/No 또는 선택지로 결론 가능해야 함)

예: "App Store는 서비스 조립에 적합한가? (A/B/C 판정)"

📌 반영 위치 (1곳만)
☐ docs/_platform/...
☐ docs/services/{service}/...
☐ docs/_shared/shared-candidates.md
☐ 반영 없음 (결론만 공유)

📌 종료 후 처리
☐ 요약 반영 후 즉시 삭제
☐ 요약 반영 없이 즉시 삭제

🔒 자동 규칙
이 문서는 docs/_investigations/에만 저장 가능
Archive 이동 ❌ / 보관 ❌
조사 원문은 삭제가 완료되어야 종료
```

### 문서 저장 위치
- **조사 중**: `docs/_investigations/IR-YYYYMMDD-{topic}.md`
- **완료 후**: 즉시 삭제 (요약만 반영 위치에 기록)

### 중요 원칙
- **조사 내용은 자유 형식** (길이 제한 없음, AI 출력 그대로 가능)
- **헤더가 문서 생명주기를 통제**
- **조사 완료 = 문서 삭제**

---

## 4. 리팩토링 작업 요청서 (Refactoring Work Order)

### 용도
- 코드 구조 개선
- 성능 최적화 (기능 변경 없음)
- 유지보수성 향상
- 기술 부채 해소

### 헤더 템플릿

```markdown
Work Order – Refactoring: [Component/System Name]
=====================================================================

📌 Work Order ID
WO-REFACTOR-[AREA]-[VERSION]

예: WO-REFACTOR-AUTH-V1, WO-REFACTOR-CMS-CORE

📌 리팩토링 목적
☐ 코드 구조 개선
☐ 성능 최적화
☐ 유지보수성 향상
☐ 기술 부채 해소

[간단한 설명 1줄]

📌 대상 범위
영향받는 파일/모듈:
  - [File/Module 1]
  - [File/Module 2]

변경 없는 기능:
  - [Feature 1 - 기능 동작 100% 동일]
  - [Feature 2 - 기능 동작 100% 동일]

📌 브랜치 전략
Base Branch: develop
Refactor Branch: refactor/[area-name]
Merge Target: develop (PR + 리뷰 필수)

📌 검증 계획
기존 기능 동작 확인 방법:
  - [Test 1]
  - [Test 2]

📌 영향받는 문서
- `docs/services/{service}/apps/{app}/app-behavior.md` (구조 변경 시)
- (기타)

📌 보고 문서
작업 완료 후 임시 보고서 생성
위치: docs/_reports/WO-[ID]-refactor-report.md
보관 기간: PR 머지 후 7일 → 자동 삭제

🔒 작업 완료 조건
- [ ] 코드 리팩토링 완료
- [ ] 기존 기능 동작 검증 완료
- [ ] 영향받는 문서 업데이트 (필요 시)
- [ ] PR 승인 및 머지
- [ ] 보고서 작성
```

### 문서 저장 위치
- **작업 중**: `docs/_work-orders/WO-[ID].md`
- **완료 후**: `docs/_reports/WO-[ID]-refactor-report.md` (7일 후 삭제)

### 중요 원칙
- **기능 동작은 100% 동일해야 함**
- **동작이 변경되면 일반 개발 작업 요청서 사용**

---

## 5. 통합 테스트/검증 작업 요청서 (Verification Work Order)

### 용도
- E2E 테스트
- 안정성 검증
- 성능 테스트
- 통합 테스트
- Phase 완료 검증

### 헤더 템플릿

```markdown
Work Order – Verification: [System/Feature Name]
=====================================================================

📌 Work Order ID
WO-VERIFY-[AREA]-[VERSION]

예: WO-VERIFY-YAKSA-PHASE20, WO-VERIFY-ECOMMERCE-E2E

📌 검증 목적
☐ E2E 테스트
☐ 안정성 검증
☐ 성능 테스트
☐ 통합 테스트
☐ Phase 완료 검증

[간단한 설명 1줄]

📌 검증 대상
시스템: [System Name]
범위: [Scope]
환경: ☐ Dev ☐ Staging ☐ Production

📌 브랜치 (해당 시)
Base Branch: [branch-name]
(검증만 수행하는 경우 브랜치 불필요)

📌 검증 계획
자동 테스트:
  - [Test 1]
  - [Test 2]

수동 검증:
  - [Manual Check 1]
  - [Manual Check 2]

📌 성공 기준
- [Criterion 1]
- [Criterion 2]

📌 보고 문서
검증 완료 후 보고서 생성 (영구 보관)
위치: docs/_reports/verification/WO-[ID]-verification-report.md
보관 기간: 영구 보관 (중요 검증 기록)

🔒 검증 완료 조건
- [ ] 모든 테스트 통과
- [ ] 성공 기준 모두 충족
- [ ] 보고서 작성 (스크린샷/로그 포함)
```

### 문서 저장 위치
- **작업 중**: `docs/_work-orders/WO-[ID].md`
- **완료 후**: `docs/_reports/verification/WO-[ID]-verification-report.md` (영구 보관)

### 중요 원칙
- **검증 보고서는 영구 보관** (다른 보고서와 달리 삭제하지 않음)
- **스크린샷, 로그 등 증거 자료 필수 포함**

---

## 문서 생명주기 요약

| 작업 유형 | 작업 중 위치 | 완료 후 위치 | 보관 기간 |
|---------|------------|------------|---------|
| 일반 개발 | `_work-orders/` | `_reports/` | 7일 후 삭제 |
| 앱 개발 | `_work-orders/` | `_reports/` | 7일 후 삭제 |
| 조사 요청서 | `_investigations/` | 삭제 | 즉시 삭제 |
| 리팩토링 | `_work-orders/` | `_reports/` | 7일 후 삭제 |
| 통합 테스트 | `_work-orders/` | `_reports/verification/` | 영구 보관 |

---

## 브랜치 명명 규칙

| 작업 유형 | 브랜치 패턴 | 예시 |
|---------|----------|-----|
| 일반 개발 | `feature/[feature-name]` | `feature/cart-discount` |
| 앱 개발 | `feature/[service]-[app]-[phase]` | `feature/cosmetics-signage-phase2` |
| 조사 요청서 | 브랜치 불필요 | - |
| 리팩토링 | `refactor/[area-name]` | `refactor/auth-module` |
| 통합 테스트 | 선택적 | `test/yaksa-phase20` |

---

## 사용 예시

### 예시 1: 일반 개발 작업

```markdown
Work Order – Shopping Cart Discount Feature
=====================================================================

📌 Work Order ID
WO-ECOMMERCE-CART-DISCOUNT-V1

📌 작업 분류
☑ 신규 기능 개발

📌 대상
Core: E-commerce Core
적용 영역: Shopping Cart Module
연계 시스템: Payment Gateway, Promotion Engine

📌 작업 성격
장바구니에 할인 코드 적용 기능 추가

📌 브랜치 전략
Base Branch: develop
Feature Branch: feature/cart-discount
Merge Target: develop (PR 필수)

📌 영향받는 문서
- `docs/services/ecommerce/apps/cart/current-status.md`
- `docs/services/ecommerce/apps/cart/app-behavior.md`

📌 보고 문서
작업 완료 후 임시 보고서 생성
위치: docs/_reports/WO-ECOMMERCE-CART-DISCOUNT-V1-report.md
보관 기간: PR 머지 후 7일 → 자동 삭제

🔒 작업 완료 조건
- [ ] 코드 구현 완료
- [ ] 영향받는 문서 모두 업데이트
- [ ] PR 승인 및 머지
- [ ] 보고서 작성
```

### 예시 2: 조사 요청서

```markdown
⚠️ 이 문서는 조사(임시) 문서다.
조사 종료 시 요약 반영 후 즉시 삭제한다.
기준 문서로 남을 수 없다.

📌 Investigation ID
IR-20251224-app-store-reliability

📌 조사 질문 (1개만)
App Store는 서비스 조립에 적합한가?
(A: 적합 / B: 부분 적합 / C: 부적합)

📌 반영 위치 (1곳만)
☑ docs/_platform/app-classification.md

📌 종료 후 처리
☑ 요약 반영 후 즉시 삭제

🔒 자동 규칙
이 문서는 docs/_investigations/에만 저장 가능
Archive 이동 ❌ / 보관 ❌
조사 원문은 삭제가 완료되어야 종료
```

---

## 적용 규칙

1. **모든 작업은 위 5가지 헤더 중 하나를 반드시 사용**
2. **헤더 항목을 임의로 수정하거나 생략 금지**
3. **브랜치 전략 필수 명시** (조사 요청서 제외)
4. **영향받는 문서 목록 필수 작성**
5. **보고 문서 위치 및 보관 정책 준수**

---

*Version: 1.0*  
*Last Updated: 2025-12-24*  
*Owner: Platform Architecture Team*
