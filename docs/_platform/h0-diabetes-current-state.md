# H0 — Diabetes App Current State Investigation

> **Phase**: H0 — Diabetes App Current State Investigation
> **범위**: 당뇨(Healthcare) 관련 모든 앱/패키지/웹
> **기준**: G2~P3, G10 Reference
> **코드 변경**: ❌ 없음
> **산출물**: 본 문서 1개

---

## 0. 조사 메타데이터

| 항목 | 값 |
|------|-----|
| Phase | H0 — Diabetes App Current State Investigation |
| 범위 | 당뇨(Healthcare) 관련 모든 앱/패키지/웹 |
| 기준 | G2~P3, G10 Reference |
| 코드 변경 | ❌ 없음 |
| 산출물 | 본 문서 1개 |
| 조사일 | 2025-12-25 |

---

## 1. 인벤토리 — 존재 목록 확정 (사실만)

### 1-1. Packages

| 이름 | 경로 | 타입 | 생성 시점 | 비고 |
|------|------|------|----------|------|
| @o4o/cgm-pharmacist-app | packages/cgm-pharmacist-app | feature | 12월 24일 | CGM 약사용 관리 앱 |
| @o4o/pharmacy-ai-insight | packages/pharmacy-ai-insight | feature | 12월 24일 | AI 인사이트 도구 |
| @o4o/health-extension | packages/health-extension | extension | 12월 24일 | 건강기능식품 확장 |

### 1-2. Apps (Web/Admin/Mobile)

| 이름 | 경로 | 사용자 대상 | 생성 시점 | 비고 |
|------|------|------------|----------|------|
| healthcare | apps/healthcare | - | 12월 24일 | **빈 폴더** (.eslintignore만 존재) |

---

## 2. 기준 적합성 체크 — G10 / G2~P3

### 2-1. Core API / 인증 위임

| 대상 | Core API 위임 | 직접 인증 | 판정 | 근거 |
|------|--------------|----------|------|------|
| cgm-pharmacist-app | N/A | N/A | N/A | Mock 데이터만 사용, API 없음 |
| pharmacy-ai-insight | N/A | N/A | N/A | Mock 데이터만 사용, API 없음 |
| health-extension | N/A | N/A | N/A | Extension, 자체 인증 없음 |

### 2-2. DB 접근 / 경계 위반

| 대상 | DB 직접 접근 | 경계 위반 | 근거 |
|------|------------|----------|------|
| cgm-pharmacist-app | ❌ No | No | Mock 데이터 사용 (mockPatients.ts) |
| pharmacy-ai-insight | ❌ No | No | Mock 데이터 사용 |
| health-extension | ✅ Yes | **Yes** | DataSource, Repository 직접 import (HealthProductService.ts:10) |

---

## 3. 데이터 흐름 스냅샷 (개념)

| 대상 | 입력 데이터 | 처리 주체 | 출력/소비 |
|------|-----------|----------|----------|
| cgm-pharmacist-app | CGM 요약 데이터 (Mock) | PatientService | 약사 UI |
| pharmacy-ai-insight | 혈당 데이터 (Mock) | AiInsightService | AI 요약 UI |
| health-extension | Product 테이블 | HealthProductService | 건강식품 UI |

---

## 4. 생성 기준 확인 — Reference 이전/이후

| 대상 | G10 이전/이후 | 적용 기준 | 판정 |
|------|-------------|----------|------|
| cgm-pharmacist-app | G10 이후 | AppStore 기반 | OK |
| pharmacy-ai-insight | G10 이후 | AppStore 기반 | OK |
| health-extension | G10 이후 | AppStore 기반 | **NG** (DB 직접 접근) |
| healthcare (app) | G10 이후 | - | **빈 폴더** |

---

## 5. 상태 분류 — Keep / Fix / Drop

| 대상 | 분류 | 이유(1줄) |
|------|------|----------|
| cgm-pharmacist-app | **Keep** | Mock 기반 설계, G10 준수, lifecycle 구현 완료 |
| pharmacy-ai-insight | **Keep** | Mock 기반, CGM 앱과 연계 설계됨 |
| health-extension | **Fix** | DB 직접 접근 (Core Boundary 위반) |
| healthcare (app) | **Drop** | 빈 폴더, 실제 구현 없음 |

---

## 6. H1 범위 자동 도출 (체크만)

| 항목 | 포함 여부 |
|------|----------|
| Core/Extension 재정비 | ☑️ health-extension DB 접근 수정 필요 |
| CGM 데이터 흐름 재설계 | ☐ (Mock 유지, 실제 연동은 추후) |
| 당뇨 웹서버 생성 | ☐ (healthcare 앱 삭제 또는 재생성) |
| UI/UX(후행) | ☐ |

---

## 7. H0 결론 (3줄 제한)

* **현재 상태 요약**: CGM 관련 2개 패키지(cgm-pharmacist-app, pharmacy-ai-insight)는 Mock 기반으로 G10 준수. health-extension은 DB 직접 접근으로 Core Boundary 위반.
* **가장 큰 불일치**: health-extension의 TypeORM 직접 사용 (HealthProductService.ts:10-11)
* **H1에서 다룰 범위**: health-extension DB 접근 패턴 수정 + healthcare 빈 폴더 정리

---

## 8. 패키지 상세 정보

### 8.1 cgm-pharmacist-app

| 항목 | 값 |
|------|-----|
| 버전 | 0.1.0 |
| 타입 | feature |
| 의존성 | organization-core, pharmacy-ai-insight (optional) |
| 테이블 | cgm_patient_summaries, cgm_coaching_sessions, cgm_coaching_notes, cgm_risk_alerts |
| Lifecycle | install, activate, deactivate, uninstall (구현됨) |
| Mock 사용 | ✅ mockPatients.ts |

### 8.2 pharmacy-ai-insight

| 항목 | 값 |
|------|-----|
| 버전 | 0.1.0 |
| 타입 | feature |
| 의존성 | organization-core, dropshipping-core (optional) |
| 테이블 | pharmacy_ai_insight_sessions, pharmacy_ai_insight_settings |
| Lifecycle | install, activate, deactivate, uninstall (구현됨) |
| Mock 사용 | ✅ |

### 8.3 health-extension

| 항목 | 값 |
|------|-----|
| 버전 | 1.0.0 |
| 타입 | extension |
| 의존성 | dropshipping-core |
| 테이블 | 없음 (Product 테이블 직접 접근) |
| Lifecycle | install, activate, deactivate, uninstall (스텁) |
| **경계 위반** | ✅ DataSource, Repository 직접 import |

---

## 9. 운영 규칙(재확인)

* ❌ 코드 수정 / 리팩토링 금지
* ❌ 구조 변경 / Reference 수정 금지
* ⭕ 사실 기록만

---

## 10. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-25 | 1.0 | H0 조사 완료 |

---

*This document is the H0 investigation result.*
*No code changes, observation only.*
*Authority: CLAUDE.md 종속*
