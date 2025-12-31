# Work Order – CGM GlucoseView Frontend (STEP 3)

## Work Order ID

**WO-CGM-GLUCOSEVIEW-FRONTEND-STEP3-V1**

> **Created**: 2025-12-29  
> **Status**: Ready for Frontend Execution  
> **Dependency**: STEP 1-2 Complete

## 목적 요약 (한 줄)

> **glucoseview.co.kr 독립 웹 프론트엔드를 구축하여 STEP 2에서 DB에 적재된 '가설 CGM 요약·인사이트 데이터'를 기반으로 약사가 실제 서비스처럼 사용·설명 가능한 화면을 완성한다.**

---

## ⚠ 1) 브랜치 규칙

* 본 작업은 **develop 브랜치에서 진행하지 않는다**
* 반드시 아래 브랜치에서 작업한다

```
feature/cgm-glucoseview-frontend-step3
```

---

## ⚠ 2) CLAUDE.md 준수

* 본 Work Order는 **CLAUDE.md 및 Section 8 공통 규칙**을 따른다
* 특히 다음을 엄격히 준수한다
  * Core 수정 ❌
  * API-server 직접 import ❌
  * Migration 없음 (STEP 3는 Frontend-only)
  * 기존 인증/권한 체계 재사용

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

## ⚠ 4) Frontend 위치 및 성격

### 앱 위치 (확정)

```
apps/glucoseview-web/
```

### 성격

* **독립 서비스용 Web Frontend**
* 도메인: `https://glucoseview.co.kr`
* 대상 사용자: **약사**
* 환자 직접 사용 ❌
* 모바일 대응 ❌ (웹 기준)

---

# 1️⃣ Frontend 기본 구조

## 1.1 기술 기준

* React (플랫폼 표준 버전)
* 기존 디자인 시스템 / 공통 UI 재사용
* admin-dashboard와 **코드 공유는 하되, 화면은 분리**

## 1.2 인증 흐름

* auth-core 기반 로그인 재사용
* 로그인 후:
  * glucoseview Home으로 바로 진입
* 권한:
  * `pharmacist` 역할만 접근 가능
  * 기타 역할 접근 시 접근 제한

---

# 2️⃣ 구현해야 할 화면 (범위 고정)

> ⚠ 아래 화면 외 **추가 화면 구현 금지**

---

## 화면 1. Home (약사용)

### 목적

* 서비스 정체성 전달
* 외부 파트너에게 보여줄 "첫 화면"

### 포함 요소

* 확정된 Hero 문구
* 서비스 핵심 가치 요약
* "환자 분석 보기" 진입 버튼

### 금지

* 기능 나열
* 데이터 표시
* 설정 화면

---

## 화면 2. Patient List (환자 목록)

### 데이터 소스

* `cgm_patients`
* `cgm_patient_summaries`

### 표시 요소

* 환자 식별자 (가명)
* 최근 상태:
  * 정상 / 주의 / 위험
* 최근 기준 기간
* 변화 방향 (개선 / 악화 / 유지)

### UX 원칙

* 한 눈에 "관리 우선순위"가 보일 것
* Raw 수치 ❌
* 요약 상태 중심 ⭕

---

## 화면 3. Patient Detail (환자 상세)

### 데이터 소스

* `cgm_patient_summaries`
* `cgm_glucose_insights`

### 포함 요소

1. 기간 요약
   * 기준 기간
   * 상태 요약 문장

2. 패턴/인사이트 카드
   * 식후 고혈당
   * 야간 저혈당 경향
   * 최근 개선/악화 추세

3. 이전 대비 변화
   * "이전 기간 대비 ○○ 경향이 감소/증가"

### 시각화 원칙

* Raw CGM 그래프 ❌
* 의료용 차트 ❌
* **집계·패턴 중심 시각화 ⭕**

---

# 3️⃣ 데이터 사용 원칙 (재확인)

* Frontend는 **DB에 저장된 결과만 사용**
* CGM Raw 데이터 접근 ❌
* 가설 데이터 여부를 UI에서 드러내지 않음
* 실서비스 전환 시 **Frontend 수정이 필요 없는 구조 유지**

---

# 🚫 본 Work Order에서 하지 말아야 할 것

* CGM API 연동
* OAuth 구현
* 환자 모바일 UI
* 약사용 입력/편집 기능
* 의료 판단 자동화
* yaksa / pharmacy ServiceGroup 정책 변경

---

# ✅ STEP 3 완료 기준 (DoD)

다음 조건을 **모두 만족해야 완료로 인정한다.**

1. `glucoseview-web` 독립 Frontend가 실행됨
2. 로그인 → Home → Patient List → Patient Detail 흐름 완성
3. STEP 2에서 적재된 가설 데이터가 **실제 서비스처럼 표시**
4. 약사·CGM업체·전문언론에 **바로 시연 가능한 수준**
5. "이 서비스는 데이터를 저장하지 않는다"는 철학이 구조적으로 설명 가능

---

## 상태

* **Status**: Ready for Frontend Execution
* **Dependency**: STEP 1-2 Complete
* **Next Step**:
  * Frontend 구현 완료
  * 실화면 기준 외부 피드백 수렴
  * CGM 업체 협의 착수

---

## 관련 문서

* WO-CGM-GLUCOSEVIEW-STEP1-3-V1: Backend implementation (Complete)
* IR-PLATFORM-CORE-01: Platform Core investigation

---

**END OF WORK ORDER**
