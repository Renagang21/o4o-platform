# Production Entry Checklist

> **Status**: LOCKED (PROD-PREP)
> **Created**: 2025-12-25
> **Phase**: PROD-PREP
> **Authority**: CLAUDE.md 종속

---

## 1. 문서 목적

Production 전환 실행 전 **반드시 체크해야 할 항목**을 정의한다.

**원칙:**
- 체크리스트 통과 = 전환 승인
- 토론 없이 Yes/No만 판정
- 모든 항목 충족 필수

---

## 2. Core API 체크

| 항목 | 체크 | 비고 |
|------|------|------|
| `/health` 정상 (200) | ☐ | |
| `/health/ready` 정상 (200) | ☐ | |
| `/health/database` 정상 | ☐ | |
| Cloud Run 서비스 활성 | ☐ | |

---

## 3. App APIs 체크 (5개)

### 3.1 forum-api

| 항목 | 체크 |
|------|------|
| `/health` 응답 | ☐ |
| `/health/ready` 응답 | ☐ |
| type-check 통과 | ☐ |
| build 성공 | ☐ |

### 3.2 commerce-api

| 항목 | 체크 |
|------|------|
| `/health` 응답 | ☐ |
| `/health/ready` 응답 | ☐ |
| type-check 통과 | ☐ |
| build 성공 | ☐ |

### 3.3 lms-api

| 항목 | 체크 |
|------|------|
| `/health` 응답 | ☐ |
| `/health/ready` 응답 | ☐ |
| type-check 통과 | ☐ |
| build 성공 | ☐ |

### 3.4 dropshipping-api

| 항목 | 체크 |
|------|------|
| `/health` 응답 | ☐ |
| `/health/ready` 응답 | ☐ |
| type-check 통과 | ☐ |
| build 성공 | ☐ |

### 3.5 supplier-api

| 항목 | 체크 |
|------|------|
| `/health` 응답 | ☐ |
| `/health/ready` 응답 | ☐ |
| type-check 통과 | ☐ |
| build 성공 | ☐ |

---

## 4. CI 체크

| 항목 | 체크 | 비고 |
|------|------|------|
| 최근 7일 Green | ☐ | |
| 실패 시 원인 문서 기준 즉답 가능 | ☐ | |

---

## 5. Ops 체크

| 항목 | 체크 | 비고 |
|------|------|------|
| beta-ops-log.md 누락 없음 | ☐ | Day 1~7 기록 |
| beta-ops-incidents.md 논쟁 기록 없음 | ☐ | |
| beta-ops-2-daily-log.md 완료 | ☐ | |

---

## 6. BETA-OPS-2 종합 체크

| 항목 | 체크 |
|------|------|
| 구조 흔들림 0건 | ☐ |
| Reference Drift 0건 | ☐ |
| 장애/Hotfix 판단 논쟁 0건 | ☐ |
| 기준 문서만으로 모든 판단 가능 | ☐ |

---

## 7. Day 7 자동 판정

### 7.1 판정 입력값

- BETA-OPS-2 Day 1~7 로그
- beta-ops-incidents.md
- beta-ops-log.md

### 7.2 자동 판정 체크

| 항목 | 결과 |
|------|------|
| 구조 흔들림 발생 | ☐ Yes ☐ No |
| Reference Drift | ☐ Yes ☐ No |
| 장애/Hotfix 논쟁 | ☐ Yes ☐ No |
| 기준 문서로 즉답 가능 | ☐ Yes ☐ No |

---

## 8. 판정 결과

### 8.1 판정 A — Production 진입 승인

아래 조건을 **모두 만족**하면 자동 승인된다.

- 구조 흔들림: No
- Reference Drift: No
- 논쟁: No
- 즉답 가능: Yes

**선언문:**
> **O4O 플랫폼은 Production 진입 조건을 충족하였다.**
> PROD 전환 Work Order 생성을 승인한다.

➡ 다음 단계: **PROD-EXEC Work Order 생성**

### 8.2 판정 B — Production 진입 보류

하나라도 충족하지 못하면 자동 보류된다.

**선언문:**
> **O4O 플랫폼은 Production 진입 조건을 아직 충족하지 못하였다.**
> 보완 Phase를 먼저 수행한다.

➡ 다음 단계: **보완 Phase Work Order 생성**

---

## 9. 최종 판정

| 항목 | 결과 |
|------|------|
| 전체 체크 통과 | ☐ Yes ☐ No |
| 판정 | ☐ A (승인) ☐ B (보류) |
| 판정 일시 | |
| 다음 단계 | |

---

## 10. 최종 원칙

> **Day 7에는 "결정"만 한다.**
> **설득·토론·재해석은 허용되지 않는다.**

---

## 11. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-25 | 1.0 | 초기 작성 (PROD-PREP) |

---

*This document is the Production Entry Checklist.*
*Used automatically on BETA-OPS-2 Day 7.*
*Authority: CLAUDE.md 종속*
