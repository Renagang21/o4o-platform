# My 화면 통합 및 약사 상태 기준 (KPA 영역)

**Document ID**: MY-KPA-PHARMACIST-INTEGRATION-STANDARD
**Version**: 1.0
**Status**: Active
**근거**: WO-MY-KPA-PHARMACIST-INTEGRATION-STANDARD-REVISION-V1
**선행 감사**: WO-PLATFORM-PHARMACIST-IDENTITY-AND-SERVICE-SCOPE-AUDIT-V1
**적용 범위**: 플랫폼 전체 (강제 적용은 KPA 영역에 한정)

---

## 1. 문서 목적

본 문서는 다음을 정의한다.

- **약사 상태(Pharmacist Status)** 의 정확한 성격과 위치
- **서비스 가입** 에 대한 기준 (무엇이 허용되고 무엇이 금지인지)
- **My 화면 통합**의 강제 범위와 비강제 범위
- 개발 시 잘못된 전역 통합을 방지하는 명시적 금지 사항

이전에 분산되어 있던 관련 규칙을 **단일 참조 기준**으로 통합한다.

---

## 2. 약사 상태 (Pharmacist Status) — 핵심 정의

### 2.1 약사는 Role이 아니다

- 약사는 **RBAC role이 아니다**
- 약사는 **아이디(Platform User)에 귀속되는 상태(status)** 이다
- 자기 선언 + 면허번호(license_number) 입력으로 확정
- 외부 기관 검증은 현재 없음 (자기 선언 기반)

### 2.2 약사 상태의 저장 위치

| 위치 | 현재 상태 | 비고 |
|------|-----------|------|
| auth-core User 엔티티 | license_number 필드 없음 | 플랫폼 수준 단일 판별 불가 |
| KpaMember | license_number, pharmacy_name, pharmacy_address (nullable) | 서비스 수준 저장 |
| GlycoPharm | 약사 자격 미저장 | Platform User에 위임하나 필드 없음 |

> **현재 상태**: 약사 상태는 KpaMember에만 존재한다.
> 플랫폼 수준 통합은 향후 별도 WO로 판단한다 (본 문서 범위 아님).

### 2.3 약사 상태와 서비스의 관계

- 어떤 서비스에 **먼저 가입했는지는 무관**하다
- 약사 상태는 서비스 간에 **자동 전파되지 않는다**
- 각 서비스는 필요 시 **자체적으로 약사 상태를 확인**한다

---

## 3. 서비스 가입에 대한 기준

### 3.1 일반 원칙

- 서비스는 **자체 회원가입(Sign-up)을 가질 수 있다**
- Platform User 계정은 하나이며, 서비스별 별도 계정 생성은 금지

### 3.2 약사 자격 전제 서비스의 제약

약사 자격을 전제로 하는 서비스(KPA, GlycoPharm 등)는:

| 허용 | 금지 |
|------|------|
| 이용 승인(Enrollment) 워크플로 | 별도 "약사 회원가입" UI/엔드포인트 |
| 약사 상태 확인 후 접근 허용 | 서비스 전용 비밀번호/계정 |
| 운영자 수동 승인 | 약사 상태의 자동 생성/부여 |

### 3.3 비약사 서비스

cosmetics, neture 등 약사 자격과 무관한 서비스는:

- 자체 가입/프로필 체계를 자유롭게 운영 가능
- 약사 상태에 의존하는 로직 추가 금지
- My 통합 강제 대상 아님

---

## 4. My 화면 통합 규칙

### 4.1 기본 원칙

1. My 화면은 **로그인된 아이디(Platform User) 기준**
2. 아이디가 **약사 상태인 경우**, 약사 영역에 한해 통합 My 제공
3. 아이디가 약사 상태가 아니면 일반 My 화면만 제공

### 4.2 강제 적용 범위 (KPA 영역)

약사 상태 기반 My 통합을 **강제 적용하는 범위**:

| 서비스 | 강제 여부 |
|--------|-----------|
| kpa-society | ✅ 강제 |
| 지부 서비스 | ✅ 강제 |
| 분회 서비스 | ✅ 강제 |
| glycopharm | ❌ 비강제 |
| cosmetics | ❌ 비강제 |
| neture | ❌ 비강제 |
| digital-signage | ❌ 비강제 |
| lms | ❌ 비강제 |

강제 범위에서 제공하는 통합 항목:

- 약사 상태 요약
- 지부 / 분회 소속 및 승인 상태
- Steward 배정 현황
- KPA 영역 서비스 진입

### 4.3 비강제 범위

강제 범위 밖 서비스는:

- 해당 아이디로 실제 가입/승인된 서비스만 표시
- 약사 상태와 연결하지 않음
- 통합 대상 아님

### 4.4 명시적 금지 사항

| 금지 항목 | 이유 |
|-----------|------|
| 전 서비스 My 통합 | 범위 초과, 서비스 독립성 훼손 |
| 약사 상태의 자동 전파 | 서비스 간 암묵적 결합 |
| 다른 아이디 데이터 병합 | 계정 단위 원칙 위반 |
| My 화면을 통한 아이디 유도/전환 | UX 혼란, 보안 위험 |

---

## 5. KPA 영역 표준 흐름

```
로그인
→ 약사 상태 확인 (KpaMember.license_number 존재 여부)
→ KPA 영역 접근
→ 지부/분회 소속 승인 (운영자 승인)
→ Steward 배정 (서비스 내부 assignment)
→ 기능 이용
```

### 5.1 흐름 세부 규칙

| 단계 | 처리 주체 | 방식 |
|------|-----------|------|
| 약사 상태 확정 | 본인 | 자기 선언 + license_number 입력 |
| 조직 소속 승인 | 운영자 | JoinRequest → 운영자 승인 |
| 소속 변경/제외 | 운영자 | 수동 처리 |
| Steward 배정 | 서비스 | 내부 assignment (RBAC role 아님) |
| Role 부여 | 관리자 | 명시적 RoleAssignment |

### 5.2 Steward에 대한 기준

- Steward는 **서비스 내부 배정(assignment)** 이다
- Steward는 **RBAC role이 아니다**
- 서비스가 자체적으로 부여/회수한다
- 관련 원칙: [kpa-auth-role-position-principles.md](../app-guidelines/kpa-auth-role-position-principles.md)

---

## 6. 개발 시 유의사항

### 6.1 용어 금지

| 금지 표현 | 올바른 표현 |
|-----------|-------------|
| "약사 role" | "약사 상태(pharmacist status)" |
| "약사 권한" | "약사 상태 확인 후 접근 허용" |
| "약사 가입" | "약사 상태 확정 + 서비스 이용 승인" |

### 6.2 코드 수준 금지

| 금지 항목 | 이유 |
|-----------|------|
| GlycoPharm / cosmetics / neture에 약사 상태 의존 로직 추가 | 강제 범위 밖 |
| auth-core User에 pharmacist flag 추가 (본 WO 범위) | Core 동결 정책 (CLAUDE.md §5) |
| My 통합 범위 체크 없이 전역 적용 | 강제/비강제 구분 위반 |
| Position → Role 자동 매핑 | kpa-auth-role-position-principles 위반 |

---

## 7. 감사 기반 현황 (참고)

WO-PLATFORM-PHARMACIST-IDENTITY-AND-SERVICE-SCOPE-AUDIT-V1 결과 요약:

| 서비스 | 약사 처리 | Steward 패턴 | 비고 |
|--------|-----------|-------------|------|
| auth-core | license_number 없음 | — | 인프라 계층 |
| kpa-society | KpaMember에 저장 | △ 부분 | operator/admin은 JoinRequest |
| glycopharm | 미저장 | X 없음 | Platform User 위임 |
| cosmetics | 해당 없음 | — | 비약사 서비스 |
| neture | 해당 없음 | — | 비약사 서비스 |
| lms-core | 해당 없음 | O 강함 | instructorId 기반 |
| forum-core | 해당 없음 | △ 부분 | reviewerId만 |
| digital-signage | 해당 없음 | X 없음 | 소유자만 |

---

## 8. 관련 문서

| 문서 | 경로 |
|------|------|
| Role·Position 분리 원칙 | `docs/app-guidelines/kpa-auth-role-position-principles.md` |
| E-commerce 주문 계약 | `docs/_platform/E-COMMERCE-ORDER-CONTRACT.md` |
| Forum Scope 분리 | ForumContext.scope (WO-FORUM-SCOPE-SEPARATION-V1) |
| CLAUDE.md (플랫폼 헌법) | `CLAUDE.md` §5 Core 동결 정책 |

---

## 9. 문서 상태

- 본 문서는 이전 분산 규칙의 **통합·대체본**이다
- 이후 My 통합 / 약사 상태 관련 WO는 반드시 본 문서를 참조한다
- 기준 변경 시 명시적 버전 업 필요

---

*Created: 2026-02-03*
*Based on: WO-MY-KPA-PHARMACIST-INTEGRATION-STANDARD-REVISION-V1*
*Audit basis: WO-PLATFORM-PHARMACIST-IDENTITY-AND-SERVICE-SCOPE-AUDIT-V1*
