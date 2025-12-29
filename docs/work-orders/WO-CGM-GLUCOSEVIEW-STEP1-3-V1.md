# Work Order – CGM GlucoseView Standalone App (STEP 1·2·3 통합)

## Work Order ID

**WO-CGM-GLUCOSEVIEW-STEP1-3-V1**

> **Created**: 2025-12-29  
> **Status**: Ready for Execution  
> **Prerequisite**: IR-PLATFORM-CORE-01 (Complete)

## 목적 요약 (한 줄)

> **약사용 CGM 분석 서비스(glucoseview)를 독립 Standalone App으로 생성하고, 실서비스와 동일한 의미 체계를 가진 '가설 데이터'를 DB에 적재하여 실제 협의·검증이 가능한 상태까지 구현한다.**

---

## ⚠ 1) 브랜치 규칙

* 본 작업은 **develop 브랜치에서 진행하지 않는다**
* 반드시 아래 브랜치에서 작업한다

```
feature/cgm-glucoseview-step1-3
```

---

## ⚠ 2) CLAUDE.md 준수

* 본 Work Order는 **CLAUDE.md 및 Section 8 공통 규칙**을 따른다
* 특히 다음 규칙을 엄격히 적용한다
  * Core 변경 금지
  * Migration-first
  * AppStore 규칙 준수
  * API-server 직접 import 금지
  * Controller → Service → Entity 구조 유지

---

## ⚠ 3) 브랜치 전환 규칙

* 전환 전:

```bash
git add . && git commit -m "save state"
```

* 전환 후:

```bash
git pull --rebase
```

---

## ⚠ 4) AppStore 개발 규칙

* `manifest.ts` 필수
* `lifecycle` 구현 필수
* `appsCatalog` 등록 필수
* Standalone App으로 등록
* 기존 Core 수정 ❌

---

# 1️⃣ STEP 1 — CGM Standalone App 골격 생성

## 1.1 App 기본 정보

* App ID: `cgm-glucoseview`
* App Type: **Standalone**
* 도메인: `glucoseview.co.kr`
* 사용자 대상: **약사 / 약국**
* 환자 UI: ❌ (웹 기준)

## 1.2 인증·권한

* auth-core 재사용
* Role 정책:
  * `pharmacist` (주 사용자)
  * `patient` (데이터 귀속용, UI 없음)
* Role은 **문자열 기반 도메인 역할**로만 사용
* auth-core enum 수정 ❌

## 1.3 AppStore 등록

* ServiceGroup: 임시 `health` 또는 `pharmacy`
  * (고정하지 않음, 이후 정책 결정으로 확정)
* 설치 시:
  * 기본 메뉴 등록
  * 접근 권한 설정

## ✅ STEP 1 완료 기준 (DoD)

* AppStore에서 설치 가능
* 로그인 후 glucoseview Home 진입 가능
* 빈 앱이 아닌 **정상 동작하는 Standalone App**

---

# 2️⃣ STEP 2 — 가설 CGM 데이터 생성 & DB 정식 적재

> ⚠ **Mock 데이터 금지**  
> 본 단계의 데이터는 "가설 데이터"이며, **실제 서비스 데이터와 동일한 의미 체계**를 가져야 한다.

---

## 2.1 데이터 생성 원칙

* 수치는 임의 생성 가능
* 그러나 반드시 다음을 만족해야 함

### ❌ 금지

* 랜덤 시계열
* 의미 없는 그래프
* UI 전용 데이터

### ⭕ 허용

* 시나리오 기반 생성
* 약사가 해석 가능한 패턴
* 누적 비교 가능한 구조

---

## 2.2 생성 대상 (최소)

* 환자 1명 이상
* 관찰 기간: **7일 또는 14일**
* 포함 시나리오 예시:
  * 식후 반복 고혈당
  * 야간 저혈당 경향
  * 최근 3일 개선 추세

---

## 2.3 데이터 처리 규칙

### Raw-like 데이터

* 메모리 또는 임시 처리
* **DB 저장 ❌**
* 처리 후 즉시 폐기

### DB에 저장되는 것 (⭕)

* 요약 지표 (기간별)
* 상태 분류 (normal / warning / risk)
* 패턴 코드
* 해석 텍스트
* 생성 시점 / 기준 기간

---

## 2.4 최소 스키마 (개념 기준)

* PatientSummary
  * patient_id
  * period
  * status
  * summary_text

* GlucoseInsight
  * patient_id
  * insight_type
  * description
  * generated_by (ai / pharmacist)
  * reference_period
  * created_at

> ⚠ 실제 테이블 명·구조는 구현자가 합리적으로 결정하되  
> **Raw CGM 저장 구조는 절대 포함하지 않는다**

## ✅ STEP 2 완료 기준 (DoD)

* DB에 **가설 데이터 기반 요약/해석 결과가 실제로 저장됨**
* "이전 vs 현재" 비교 가능
* Raw 데이터는 DB에 존재하지 않음

---

# 3️⃣ STEP 3 — 가설 데이터 기반 약사용 화면 구현

## 3.1 화면 범위 (고정)

### 화면 1. Home

* 이미 확정된 Home 문구 사용
* 서비스 정체성 전달용

### 화면 2. 환자 목록 + 상태 요약

* DB에 저장된 요약 결과 사용
* 표시 요소:
  * 상태 (정상/주의/위험)
  * 변화 방향
  * 기준 기간

### 화면 3. 환자 상세 (CGM 요약)

* DB 기반 결과만 사용
* 포함 요소:
  * 기간 요약 그래프 (집계 기반)
  * 패턴 카드
  * 이전 대비 변화 설명

> ❗ Raw 그래프 ❌  
> ⭕ 요약/패턴 중심 시각화

---

## 3.2 UI 구현 원칙

* 의료 정확성 ❌
* 규제 대응 ❌
* 설명 가능성 ⭕
* "실제 데이터처럼 보이는 구조" ⭕

## ✅ STEP 3 완료 기준 (DoD)

* 약사가 화면을 보며 서비스 설명 가능
* CGM 업체·약사조직에 보여줄 수 있는 수준
* 가설 데이터가 아닌 **실서비스 데이터처럼 동작**

---

# 🚫 본 Work Order에서 하지 말아야 할 것

* CGM API 연동
* OAuth 구현
* 환자 모바일 앱
* Core 구조 변경
* yaksa / pharmacy 정책 확정
* 의료 판단 자동화

---

# 📌 최종 성공 기준 (Overall DoD)

* glucoseview Standalone App 존재
* 가설 데이터가 **DB에 실제 적재**
* 데이터 철학(저장 ❌ / 해석 ⭕)이 코드로 증명
* 이후 CGM 업체 합의 시
  * **데이터 유입부만 교체하면 되는 구조**

---

## 관련 문서

* IR-PLATFORM-CORE-01: Platform Core investigation result
* CLAUDE.md: Platform development constitution

---

**END OF WORK ORDER**
