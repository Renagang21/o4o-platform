# BETA-OPS-2 — Weekly Operational Observation Checklist

**Phase:** BETA-OPS-2
**기간:** 7일 (연속)
**성격:** 관찰 전용 (No Action)
**원칙:** ❌ 수정 금지 / ❌ 개선 금지 / ⭕ 기록만

---

## 0. 기본 원칙 (주간 공통)

* 장애가 발생해도 **즉시 수정하지 않는다**
* Hotfix 필요 여부는 **기록만 하고 판단은 보류**
* 모든 항목은 **Yes / No / N/A**로만 체크
* 판단은 문서 기준으로만 한다
  (beta-lock-rules.md, health-endpoint-standard.md)

---

## 1. Core API 상태 관찰 (Daily)

| 항목 | 체크 | 비고 |
|------|------|------|
| `/health` 응답 | ☐ Yes ☐ No | |
| `/health/ready` 응답 | ☐ Yes ☐ No | |
| 상태 해석 일관성 유지 | ☐ Yes ☐ No | |
| "운영 중인가?" 즉답 가능 | ☐ Yes ☐ No | |

**기준:**
* Non-Operational 상태에서의 에러는 **정상**
* Operational 전환 전까지는 장애 아님

---

## 2. App API 상태 관찰 (Daily)

**대상 앱:**
* forum-api
* commerce-api
* lms-api
* dropshipping-api
* supplier-api

| 항목 | Yes | No |
|------|-----|-----|
| 모든 앱 `/health` 응답 | ☐ | ☐ |
| `/health/ready` 구현 유지 | ☐ | ☐ |
| 빌드/타입 체크 재현 가능 | ☐ | ☐ |
| Reference Drift 발생 | ☐ | ☐ |

**Drift 발견 시:**
→ **기록만**, 수정 ❌

---

## 3. 인증 / 권한 동작 관찰 (주간)

| 항목 | 체크 |
|------|------|
| Public API 정상 접근 | ☐ Yes ☐ No |
| 인증 필요 API 401/403 정확 | ☐ Yes ☐ No |
| Role 기반 API 권한 분리 유지 | ☐ Yes ☐ No |
| Role 누락 시 403 반환 | ☐ Yes ☐ No |

**기준:**
* 인증/권한 오류는 **장애 아님**
* 잘못된 상태 코드 반환 시에만 기록

---

## 4. 상태 전이 & 워크플로우 관찰 (주간)

| 항목 | 체크 |
|------|------|
| 잘못된 상태 전이 시 409 반환 | ☐ Yes ☐ No |
| 상태 타입 불일치 없음 | ☐ Yes ☐ No |
| Workflow 로직 예외 발생 | ☐ Yes ☐ No |

**예시:**
* shipped 상태 주문 → 다시 shipped 요청 → 409 정상

---

## 5. CI / 배포 신호 관찰 (주간)

| 항목 | 체크 |
|------|------|
| CI 실패 발생 | ☐ Yes ☐ No |
| 실패 원인 분류 가능 | ☐ Yes ☐ No |
| "장애인가?" 즉답 가능 | ☐ Yes ☐ No |
| Hotfix 판단 논쟁 발생 | ☐ Yes ☐ No |

**원칙:**
* CI 실패 = **항상 장애 아님**
* 문서 기준으로만 판정

---

## 6. Hotfix 신호 관찰 (주간)

| 항목 | 체크 |
|------|------|
| Hotfix 필요하다고 느낀 순간 | ☐ Yes ☐ No |
| 문서 기준상 Hotfix 해당 | ☐ Yes ☐ No |
| 실제 Hotfix 실행 | ❌ 금지 |

**목적:**
* **"고치고 싶어지는 순간"을 포착**하는 것

---

## 7. 주간 종합 판정 (Day 7)

| 질문 | 답 |
|------|-----|
| 구조가 흔들렸는가? | ☐ Yes ☐ No |
| 기준 문서로 모든 판단 가능했는가? | ☐ Yes ☐ No |
| 논쟁이 발생한 지점은 무엇인가? | 기록: |
| 다음 주에도 동일 방식 가능? | ☐ Yes ☐ No |

---

## 8. 종료 선언 조건 (BETA-OPS-2)

아래 3개 모두 충족 시 **BETA-OPS-2 종료 가능**:

- [ ] 장애/Hotfix 판단 논쟁 0건
- [ ] Reference Drift 0건
- [ ] "운영 상태" 질문 즉답 가능 유지

---

## 9. 한 줄 요약

> **BETA-OPS-2는 문제를 고치는 주가 아니라
> 문제를 '고치지 않고도 견디는지' 확인하는 주입니다.**

---

*Phase: BETA-OPS-2*
*Authority: CLAUDE.md 종속*
