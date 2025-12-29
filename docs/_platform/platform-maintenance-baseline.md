# Platform Maintenance Baseline
## 플랫폼 유지보수·정비 기준선 선언문

Version: 1.0 Final
Date: 2025-12-28
Status: **ACTIVE**

---

## 1. 문서의 목적

본 문서는 O4O Platform 전반에 대한 유지보수 및 정비 작업을
**통제 가능하고 지속 가능한 프로그램**으로 운영하기 위해,

- 무엇을 정비 대상으로 삼고
- 무엇을 정비하지 않으며
- 어느 수준까지 정비할 것인지

에 대한 **판단 기준선(Baseline)** 을 선언한다.

본 문서는 코드보다 우선하며,
이후 모든 정비 Work Order의 **판단 근거 문서**로 사용된다.

---

## 2. 플랫폼 현 상태 요약 (Baseline Context)

- Core App: 11개
  - FROZEN Core: 4개
  - Business Core: 7개
- App 전체: 40개 (core / extension / feature / service)
- Admin Dashboard 페이지: 약 436개
- PageHeader + DataTable 적용 페이지: 23개 (약 5%)

즉, 현재 플랫폼은
**부분적 정비는 존재하나, 전체 기준은 부재한 상태**이다.

---

## 3. Core App 정비 기준

### 3.1 FROZEN Core (절대 수정 금지)

다음 Core는 구조·테이블·책임 변경을 금지한다.

- cms-core
- auth-core
- platform-core
- organization-core

정책:
- 유지보수는 버그 수정 수준만 허용
- 정비 작업 대상에서 제외

---

### 3.2 Business Core (관찰 대상)

다음 Core는 Core이지만,
App/Extension 의존성이 깊어 **즉시 FROZEN 불가** 상태이다.

- ecommerce-core
- dropshipping-core
- forum-core
- lms-core
- partner-core
- pharmaceutical-core
- digital-signage-core

정책:
- 본 정비 단계에서는 구조 변경 금지
- App 정비 결과를 관찰한 뒤 재정비 여부 판단
- 현재는 "유지 + 관찰" 상태로 분류

---

## 4. App / Page 정비 대상 분류 기준

### 4.1 반드시 정비 대상 (Priority A)

다음 조건을 만족하는 App/Page는 정비 대상이다.

- Ops 계열 App
  - sellerops
  - supplierops
  - partnerops
  - pharmacyops
- Admin 핵심 관리 기능
  - users / roles / organizations
  - ecommerce / dropshipping 관리
- 외부 운영자 또는 내부 스태프가
  **실제로 사용하는 화면**

---

### 4.2 조건부 정비 대상 (Priority B)

다음 App/Page는 상황에 따라 정비 여부를 결정한다.

- 서비스별 Dashboard
  - yaksa / cosmetics / lms / forum
- 정책·업무 흐름 변경 가능성이 있는 화면
- Design Core v1.0 Variant 적용 대상

정비 착수 전, 반드시 별도 Work Order로 대상 지정이 필요하다.

---

### 4.3 정비 제외 대상 (Priority C)

다음 App/Page는 정비 작업에서 제외한다.

- 실험용 Feature App
- 시장 검증 단계 App
- 폐기 또는 보류 가능성이 높은 App
- 단기 PoC 성격의 화면

정비 제외는 "방치"가 아니라
**의도적 비개입 상태**를 의미한다.

---

## 5. 정비 강도(Level) 정의

모든 정비 작업은 반드시 아래 Level 중 하나로 시작한다.

### Level 0 – 유지
- 코드 수정 없음
- 구조 변경 없음
- 현재 상태 유지

---

### Level 1 – 구조 정비 (현재 단계의 기본값)

- PageHeader + DataTable 적용
- Design Core v1.0 준수
- UI 구조 정비만 수행
- API / 비즈니스 로직 변경 금지

---

### Level 2 – 도메인 정비 (향후 단계)

- 상태 모델 정리
- 권한/워크플로우 재정의
- 데이터 흐름 재구성

※ 본 Baseline 단계에서는 **Level 2 수행 금지**

---

## 6. 정비 작업 운영 원칙

- 정비 대상은 항상 **명시적으로 지정**
- 한 번에 정비하는 페이지 수를 제한
- 기준 문서 없이 정비 작업 착수 금지
- "보기에 불편함"은 정비 사유가 아님
- 정비 중 Core 변경 필요 징후 발생 시 즉시 중단

---

## 7. 정비 작업의 시작 조건

다음 조건을 모두 만족해야 정비 작업을 시작할 수 있다.

1. 대상 App/Page가 Priority A 또는 승인된 Priority B
2. 정비 Level 명시 (기본: Level 1)
3. 관련 Work Order 존재
4. 본 Baseline 문서와의 충돌 없음

---

## 8. 본 문서의 지위

- 본 문서는 플랫폼 정비 작업의 **최상위 기준 문서**이다.
- 개별 Work Order는 본 문서를 위반할 수 없다.
- 본 문서 변경은 별도 결정 절차를 거친다.

---

## 9. 선언

지금부터의 플랫폼 정비 작업은
"많이 고치는 작업"이 아니라,
**질서를 세우고 유지하는 작업**이다.

본 문서는 그 출발점이다.

---

*Approved: 2025-12-28*
*Effective: Immediately*
