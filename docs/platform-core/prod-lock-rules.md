# Production Lock Rules

> **Status**: LOCKED (PROD-PREP)
> **Created**: 2025-12-25
> **Phase**: PROD-PREP
> **Authority**: CLAUDE.md 종속

---

## 1. 문서 목적

Production 전환 전까지 **변경 금지 사항**을 고정한다.

**원칙:**
- 실행 판단과 논쟁을 완전히 분리
- 조건 충족 여부만으로 전환 결정
- 예외 없는 LOCK 정책

---

## 2. Production 전환 전제 조건

다음 조건을 **모두 충족해야만** Production 전환을 실행할 수 있다.

| 조건 | 측정 방법 |
|------|----------|
| BETA-OPS-2 7일 관찰 완료 | beta-ops-2-daily-log.md Day 1~7 기록 |
| 구조 흔들림 0건 | 주간 종합 판정 |
| Reference Drift 0건 | 일일 관찰 기록 |
| 장애/Hotfix 판단 논쟁 0건 | beta-ops-incidents.md |
| 기준 문서만으로 모든 판단 가능 | 주간 종합 판정 |

---

## 3. Production 전환 전 금지 사항 (LOCK)

다음 항목은 **Production 진입 전까지 전면 금지**한다.

| 금지 항목 | 사유 |
|----------|------|
| Core Boundary 변경 | 플랫폼 안정성 |
| Core API 책임 확장 | 기존 앱 호환성 |
| Reference 수정 | FROZEN 정책 |
| DB 스키마 변경 | 데이터 무결성 |
| 신규 Alpha / Beta 앱 추가 | 검증 범위 고정 |
| 도메인 로직 리팩토링 | 안정성 우선 |

### 3.1 허용 예외

| 예외 | 조건 |
|------|------|
| 보안 Hotfix | beta-lock-rules.md 기준 충족 시에만 |

---

## 4. 롤백 규칙

Production 전환 후 다음 발생 시 **즉시 롤백**한다.

| 롤백 조건 | 조치 |
|----------|------|
| Core Boundary 위반 발견 | 즉시 롤백 |
| 인증/권한 규칙 위반 | 즉시 롤백 |
| 데이터 무결성 손상 | 즉시 롤백 |
| Health 기준 위반 24시간 지속 | 즉시 롤백 |

### 4.1 롤백 대상 상태

롤백은 **Deployed (Non-Operational)** 상태로 복귀하며,
Beta Ops 규칙을 다시 적용한다.

---

## 5. LOCK 해제 조건

LOCK은 다음 조건 충족 시 자동 해제된다.

| 조건 | 설명 |
|------|------|
| BETA-OPS-2 Day 7 판정 A (승인) | prod-entry-checklist.md 기준 |
| PROD-EXEC Work Order 실행 완료 | Production 전환 완료 |

---

## 6. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-25 | 1.0 | 초기 작성 (PROD-PREP) |

---

*This document defines the LOCK rules before Production entry.*
*Authority: CLAUDE.md 종속*
