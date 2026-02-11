# WO-KPA-C-BRANCH-ALPHA-FREEZE-V1

> **작업일**: 2026-02-11
> **성격**: Alpha 기준선 고정 선언
> **상태**: Alpha 기준선 고정 완료

---

## 0. 목적 (Purpose)

KPA-c (분회 SaaS) 서비스의 **Alpha 단계 기능·역할·운영 범위**를 고정한다.
본 문서 이후의 변경은 **Alpha 범위를 벗어나는 작업(Beta 이상)**으로 간주한다.

---

## 1. Alpha 기준선 선언 (Declaration)

**KPA-c Branch Service는 다음 상태로 Alpha 기준선을 고정한다.**

* Admin / Operator **기능 분리 완료**
* Mock 제거 완료
* 모든 Alpha 포함 기능은 **실 API 동작**
* 운영 시나리오 기준 UX 완성

👉 이 시점 이후:

* 기능 추가 ❌
* 역할 변경 ❌
* 구조 변경 ❌
  (단, 버그 수정은 허용)

---

## 2. Alpha 포함 범위 (In Scope)

### 2-1. 역할 구성 (고정)

| 역할 | 코드 | 책임 |
|------|------|------|
| Branch Admin | `kpa-c:branch_admin` | 구조·정책·기본값 관리 |
| Operator | `kpa-c:operator` | 일상 운영·노출·판단 |

---

### 2-2. Admin 기능 (6개 고정)

| 코드 | 기능 | 상태 |
|------|------|------|
| A-1 | 분회 Admin 대시보드 | 실 API |
| A-2 | 뉴스 관리 | 실 API |
| A-3 | 포럼 관리 (모더레이션) | 실 API |
| A-4 | 자료실 관리 | 실 API |
| A-5 | 임원 관리 | 실 API |
| A-6 | 분회 설정 (기본 정보/회비) | 실 API |

* 경로: `/branch-services/:branchId/admin/*`
* Mock 잔존: ❌ 없음

---

### 2-3. Operator 기능 (4개 고정)

| 코드 | 기능 | 상태 |
|------|------|------|
| O-1 | Operator 대시보드 (Signal 기반) | 실 API |
| O-2 | 포럼 카테고리 관리 | 실 API |
| O-3 | 사이니지 콘텐츠 허브 | 실 API |
| O-4 | 운영자 계정 관리 | 실 API |

* 경로: `/branch-services/:branchId/operator/*`
* 신규 API: ❌ 없음 (기존 summary API 재사용)

---

## 3. Alpha 제외 범위 (Out of Scope)

다음 항목은 **의도적으로 Alpha에서 제외**하며, 본 기준선에 포함되지 않는다.

### 기능

* 회원 관리
* 회비 납부/정산 처리
* 신상신고
* 회원 현황 통계
* 공동구매
* 약관/정책 관리
* AI 리포트/추천

### 성격

* 분석/리포트 확장
* 자동화
* 조직 확장(지부 개념)

👉 위 항목은 **Beta 이후 검토 대상**이다.

---

## 4. UX 기준선 (고정)

### Operator 대시보드 UX 원칙

* 숫자 나열 ❌
* **Signal 기반 상태 판단**
  * good / warning / alert
* "판단 → 즉시 이동" 흐름
* 하루 1회 접속 기준 설계

### Admin UX 원칙

* 구조 관리 중심
* 운영 실무(노출/카테고리/콘텐츠 선택)는 Operator 책임
* Admin ↔ Operator **중복 기능 없음**

---

## 5. 기술 기준선 (고정)

| 항목 | 상태 |
|------|------|
| 신규 엔티티 | ❌ 없음 |
| 신규 API | ❌ 없음 |
| 라우트 구조 | 고정 |
| 권한 체계 | 고정 |
| 빌드 | `pnpm build` 통과 |

---

## 6. 변경 허용 / 금지 규칙

### 허용

* 버그 수정
* API 오류 수정
* UI 깨짐 보정
* 문구/라벨 수정

### 금지

* 기능 추가
* 메뉴 추가/삭제
* 역할 확장
* Admin/Operator 책임 변경
* 데이터 모델 변경

---

## 7. Alpha 종료 조건 (충족 여부)

| 조건 | 상태 |
|------|------|
| Admin 기능 전부 실 API | ✅ |
| Operator 기능 전부 실 API | ✅ |
| Mock 제거 | ✅ |
| 역할 분리 명확 | ✅ |
| 운영 시나리오 UX 완성 | ✅ |

👉 **Alpha 종료 조건 충족**

---

## 8. 다음 단계 정의

Alpha 이후의 작업은 **반드시 새로운 WO**로 진행한다.

### 다음 가능 단계 (예시)

* Beta 선언
* AI 보조 기능 도입
* 운영 히스토리/로그 체계
* 회원/회비 기능 재도입 검토

---

## 9. 결론

**KPA-c Branch Service는
"운영 가능한 Alpha" 상태로 고정된다.**

이 문서는:

* 기준선 문서이며
* 되돌림 기준이며
* 이후 모든 판단의 출발점이다.

---

## 구현 이력

| WO | 상태 | 일자 |
|----|------|------|
| WO-KPA-C-BRANCH-OPERATOR-DESIGN-V1 | 완료 | 2026-02-10 |
| WO-KPA-C-BRANCH-ADMIN-DESIGN-V1 | 완료 | 2026-02-10 |
| WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1 | 완료 | 2026-02-10 |
| WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1 | 완료 | 2026-02-10 |
| WO-KPA-C-BRANCH-ALPHA-BASELINE-V1 | 완료 | 2026-02-10 |
| WO-KPA-C-BRANCH-FORUM-ADMIN-API-V1 | 완료 | 2026-02-11 |
| WO-KPA-C-BRANCH-OPERATOR-DASHBOARD-UX-V1 | 완료 | 2026-02-11 |
| WO-KPA-C-BRANCH-ALPHA-FREEZE-V1 | 본 문서 | 2026-02-11 |
