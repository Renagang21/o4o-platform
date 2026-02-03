# KPA Steward 및 조직 관리 UI 기준

**Document ID**: KPA-STEWARDSHIP-AND-ORGANIZATION-MANAGEMENT-UI
**Version**: 1.0
**Status**: Active
**근거**: WO-KPA-STEWARDSHIP-AND-ORGANIZATION-MANAGEMENT-UI-V1
**상위 기준**:
- MY-KPA-PHARMACIST-INTEGRATION-STANDARD.md
- MY-DASHBOARD-PHARMACIST-UI-CHECKLIST.md
- WO-PLATFORM-PHARMACIST-IDENTITY-AND-SERVICE-SCOPE-AUDIT-V1

---

## 1. 목적

KPA 영역에서 **조직(지부/분회) 운영과 Steward 배정**을
명확한 책임 주체와 UI 경계 안에서 관리할 수 있도록 한다.

- Steward 개념을 role/RBAC와 분리
- 조직 단위 운영 책임 배정으로 고정
- My 화면과 운영 UI의 역할 분리를 강제

---

## 2. 적용 범위

### 포함

- KPA-Society 운영자(Admin) UI
- 지부/분회 조직 관리
- 약사 소속 승인/해제
- Steward 배정/해제

### 제외

- My 화면 (별도 문서: MY-DASHBOARD-PHARMACIST-UI-CHECKLIST.md)
- GlycoPharm / Cosmetics / Neture
- RBAC(RoleAssignment) 변경
- 자동 소속 이동/동기화 로직

---

## 3. 핵심 개념 정의 (고정)

### 3.1 Organization (조직)

- 지부 / 분회
- 운영 단위의 최소 기준
- 약사는 **조직 소속 여부**로만 관리됨

### 3.2 Steward

- **RBAC role 아님**
- 권한 묶음 아님
- "무엇을 할 수 있는가"가 아니라 **"어떤 조직/공간을 운영하는가"**

Steward 예시:

| Steward 유형 | 대상 |
|-------------|------|
| 분회 포럼 운영 | 특정 분회의 포럼 공간 |
| 지부 교육 과정 운영 | 특정 지부의 LMS 과정 |
| 콘텐츠 공간 운영 | 특정 공지/콘텐츠 영역 |

---

## 4. 시스템 역할 분리 (강제)

| 영역 | 책임 |
|------|------|
| My 화면 | 상태 요약만 |
| KPA Admin UI | 조직/Steward 운영 |
| Service UI | 기능 제공 |
| Platform | 사용자/약사 상태 |

---

## 5. KPA Admin UI 구성

### 5.1 조직 관리 화면

**기능**:
- 지부 생성 / 수정 / 비활성화
- 분회 생성 / 수정 / 비활성화
- 조직 간 상·하위 관계 설정

**표시 정보**:
- 조직명
- 상위 조직
- 활성 상태
- 소속 약사 수

**금지**:
- 조직 자동 생성
- 외부 데이터 연동

### 5.2 약사 소속 승인 관리

**흐름**:
```
약사 요청 / 운영자 요청 / 제3자 요청
→ 운영자 검토
→ 승인 / 제외
```

**UI 요구사항**:
- 요청 출처 표시 (본인 / 타 조직 / 운영자)
- 승인 / 제외 버튼
- 이력 로그

**금지**:
- 자동 소속 이동
- 소속 중복 자동 허용

### 5.3 Steward 관리 화면 (핵심)

**배정 기준**:
- 반드시 조직 소속 약사만 가능
- 운영자(Admin)만 배정/해제 가능

**배정 단위**:
- 조직
- 공간 (포럼 / 교육 / 콘텐츠)

**UI 구성**:
- 조직 선택
- 운영 공간 선택
- Steward 지정 (약사 선택)
- 해제 버튼

**금지**:
- RoleAssignment 사용
- My 화면에서 배정/해제
- 기능 단위 권한 설정

---

## 6. My 화면과의 경계 규칙 (강제)

### My 화면에서 보이는 것

- 약사 상태
- 조직 소속 여부 (요약)
- Steward 여부 (텍스트 수준)

### My 화면에서 절대 보이면 안 되는 것

- 어떤 조직의 어떤 공간을 운영하는지 (상세)
- 다른 약사 목록
- 승인/해제 버튼

---

## 7. 데이터 저장 원칙

- Steward는 **서비스 내부 테이블**에 저장
- Platform RoleAssignment에 반영하지 않음
- 조직 소속은 **KPA 도메인에만 저장**

---

## 8. 상태 반영 규칙

| 변경 | 반영 방식 |
|------|-----------|
| 조직 승인/제외 | 즉시 |
| Steward 배정 | 새로고침 후 |
| 조직 구조 변경 | Admin UI 기준 |

---

## 9. 구현 금지 사항

| 금지 항목 | 이유 |
|-----------|------|
| Steward를 role로 구현 | Steward는 assignment, role 아님 |
| 권한 레벨 숫자 부여 | Steward는 범위 기반, 레벨 기반 아님 |
| My 화면에 운영 UI 삽입 | My = 상태 요약, 운영 = Admin 전용 |
| 조직 자동 동기화 | 운영자 판단 영역 |
| 약사 DB 직접 조회 | 서비스 API를 통해 접근 |

---

## 10. 목적적 한계

본 문서는:
- **운영 질서 확립**을 위한 것이며
- **운영 자동화**를 목표로 하지 않는다

조직 이동, 분쟁, 이의 제기 등은
**운영자 판단 + 커뮤니케이션 영역**으로 남긴다.

---

## 11. 완료 기준

- KPA Admin에서 조직/Steward 관리 가능
- My 화면과 운영 UI 완전 분리
- RBAC / Platform Role 무변경
- 본 문서 기준 충족

---

## 12. 관련 문서

| 문서 | 경로 |
|------|------|
| 약사 상태 통합 기준 | `docs/_platform/MY-KPA-PHARMACIST-INTEGRATION-STANDARD.md` |
| My 화면 UI 체크리스트 | `docs/_platform/MY-DASHBOARD-PHARMACIST-UI-CHECKLIST.md` |
| Role·Position 분리 원칙 | `docs/app-guidelines/kpa-auth-role-position-principles.md` |
| 플랫폼 감사 결과 | WO-PLATFORM-PHARMACIST-IDENTITY-AND-SERVICE-SCOPE-AUDIT-V1 |

---

*Created: 2026-02-03*
*Based on: WO-KPA-STEWARDSHIP-AND-ORGANIZATION-MANAGEMENT-UI-V1*
