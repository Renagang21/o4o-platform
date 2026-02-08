# Beta Entry Declaration

> **Status**: ACTIVE
> **Declared**: 2025-12-25
> **Phase**: P3 - Beta Readiness Consolidation → Beta Phase 진입
> **Authority**: CLAUDE.md 종속

---

## 1. 선언

**O4O Platform App API 아키텍처는 2025-12-25부로 Beta Phase에 진입한다.**

---

## 2. Beta 진입 근거

### 2.1 Alpha Phase 완료 현황

| Phase | 작업 | 결과 | 검증 문서 |
|-------|------|------|----------|
| G7 | Forum API Alpha | ✅ 완료 | g8-alpha-observation.md |
| G9 | Commerce API Alpha | ✅ 완료 | g8-alpha-observation.md |
| G10 | App API Reference 확정 | ✅ FROZEN | app-api-architecture.md |
| G10.5 | Reference 검증 | ✅ 통과 | g8-alpha-observation.md |
| G12 | LMS API Alpha | ✅ 완료 | g8-alpha-observation.md |
| B2 | Dropshipping API Alpha | ✅ 완료 | g8-alpha-observation.md |
| G13 | Supplier API Alpha | ✅ 완료 | g8-alpha-observation.md |
| P1 | Alpha Outcome 정형화 | ✅ 완료 | alpha-outcome-rules.md |
| P2 | Alpha 통합 검증 | ✅ 통과 | p2-alpha-integration-verification.md |
| P3 | Beta 준비 통합 | ✅ 완료 | (본 문서) |

### 2.2 검증된 App API 목록

| 앱 | 포트 | 역할 | 상태 |
|----|------|------|------|
| app-api-reference | 3000 | Reference (FROZEN) | ✅ |
| forum-api | 3100 | Forum 도메인 | ✅ |
| commerce-api | 3200 | Commerce 도메인 | ✅ |
| lms-api | 3300 | LMS 도메인 | ✅ |
| dropshipping-api | 3500 | Dropshipping 도메인 | ✅ |
| supplier-api | 3600 | Supplier 도메인 | ✅ |

### 2.3 플랫폼 규칙 고정 현황

| 규칙 문서 | 상태 | 내용 |
|----------|------|------|
| alpha-outcome-rules.md | ACTIVE | Alpha 성공 조건, 도메인 분류, Mock 허용 |
| beta-lock-rules.md | ACTIVE | FROZEN 목록, 변경 정책, Hotfix 프로세스 |
| health-endpoint-standard.md | FROZEN | Health 엔드포인트 표준 |

---

## 3. Beta Phase 정의

### 3.1 Beta Phase 목표

| 목표 | 설명 | 측정 기준 |
|------|------|----------|
| **안정성 검증** | Alpha 패턴이 실환경에서 안정적인지 검증 | Hotfix 0건 |
| **확장성 검증** | 신규 앱이 Reference 기반으로 빠르게 생성되는지 검증 | 신규 앱 2개 이상 |
| **Mock → 실제 전환** | Alpha Mock을 실제 구현으로 교체 | 최소 1개 앱 |
| **프로덕션 준비** | Cloud Run 배포 및 운영 안정화 | 4주 무장애 |

### 3.2 Beta Phase 범위

| 포함 | 제외 |
|------|------|
| App API 신규 생성 | Reference 구조 변경 |
| 도메인 로직 구현 | Core API 인터페이스 변경 |
| Mock → 실제 전환 | 인증 방식 변경 |
| 버그 수정 (Hotfix 프로세스) | 공통 타입 변경 |
| 문서화 | UI/Web 앱 (별도 Phase) |

### 3.3 Beta Phase 기간

| 구분 | 일정 |
|------|------|
| Beta 시작 | 2025-12-25 |
| Beta 목표 종료 | 2026-01-22 (4주) |
| Production 전환 조건 | §6 참조 |

---

## 4. FROZEN 컴포넌트

Beta Phase 동안 아래 컴포넌트는 **수정 불가**.

| 컴포넌트 | 경로 | 동결 버전 |
|----------|------|----------|
| Core API | apps/api-server | G10 |
| App API Reference | apps/app-api-reference | G10 |
| Web Server Reference | apps/web-server-reference | G10 |

**예외 승인 조건:**
- 명시적 Work Order
- 2개 이상 앱에서 동일 문제 발생
- 전체 앱 테스트 통과
- 롤백 계획 포함

상세: [beta-lock-rules.md](./beta-lock-rules.md)

---

## 5. 적용 규칙

### 5.1 신규 앱 생성 규칙

1. `apps/app-api-reference`를 복사하여 시작
2. Reference 파일 구조 유지
3. 도메인별 routes 파일 생성
4. type-check, build 통과 필수
5. Health 엔드포인트 표준 준수

상세: [alpha-outcome-rules.md](./alpha-outcome-rules.md) §7

### 5.2 인증/권한 규칙

| 레벨 | 이름 | 미들웨어 |
|------|------|----------|
| 0 | Public | 없음 |
| 1 | Authenticated | requireAuth |
| 2 | Role-based | requireAuth + 역할 검증 |

상세: [alpha-outcome-rules.md](./alpha-outcome-rules.md) §3

### 5.3 Health 엔드포인트 규칙

| 엔드포인트 | 용도 | 필수 |
|-----------|------|------|
| GET /health | Liveness | ✅ |
| GET /health/ready | Readiness | ✅ |
| GET /health/live | K8s 호환 | ✅ |

상세: [health-endpoint-standard.md](./health-endpoint-standard.md)

---

## 6. Production 전환 조건

Beta → Production 전환을 위해 아래 조건을 **모두** 충족해야 한다.

| 조건 | 측정 기준 | 상태 |
|------|----------|------|
| 4주 안정 운영 | Hotfix 0건 | ⏳ 대기 |
| Reference Drift 0% | 모든 앱이 패턴 유지 | ⏳ 대기 |
| Mock → 실제 전환 1건 | 최소 1개 앱 실제 구현 | ⏳ 대기 |
| 문서 완성 | 운영 가이드 작성 | ⏳ 대기 |
| Cloud Run 배포 성공 | 전체 앱 배포 | ⏳ 대기 |

---

## 7. 관련 문서

| 문서 | 역할 |
|------|------|
| [CLAUDE.md](../../CLAUDE.md) | 플랫폼 헌법 |
| [alpha-outcome-rules.md](./alpha-outcome-rules.md) | Alpha 결과 규칙 |
| [beta-lock-rules.md](./beta-lock-rules.md) | Beta 변경 정책 |
| [health-endpoint-standard.md](./health-endpoint-standard.md) | Health 표준 |
| [p2-alpha-integration-verification.md](./p2-alpha-integration-verification.md) | Alpha 통합 검증 |
| [app-api-architecture.md](./app-api-architecture.md) | App API 아키텍처 |

---

## 8. 선언자

| 항목 | 값 |
|------|-----|
| 선언 일시 | 2025-12-25 |
| 선언 Phase | P3 - Beta Readiness Consolidation |
| 검증 완료 | G7, G9, G10, G10.5, G12, B2, G13, P1, P2, P3 |
| 다음 Phase | Beta Operation (4주) |

---

## 9. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-25 | 1.0 | Beta Entry Declaration |

---

**🚀 O4O Platform App API Architecture - Beta Phase 진입 완료**

*This document declares the official entry into Beta Phase.*
*All Alpha validations have been completed successfully.*
*Authority: CLAUDE.md 종속*
