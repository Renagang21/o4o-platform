# 약사회 서비스 권한(Role) · 직책(Position) 분리 원칙

**Document ID**: KPA-AUTH-ROLE-POSITION-PRINCIPLES
**Version**: 1.0
**Status**: Active (WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1 기준)
**적용 범위**: 약사회 본부 / 지부 / 산하 서비스 전체

---

## 1. 문서 목적

본 문서는 약사회 서비스에서 발생할 수 있는 **권한 오용, 자동 승격, 임원 권한 혼동 문제를 구조적으로 방지**하기 위해
**Role(권한)** 과 **Position(직책)** 의 개념을 명확히 분리하고,
개발·운영·기획 전반에서 따라야 할 **단일 기준**을 정의한다.

---

## 2. 기본 원칙 (절대 규칙)

### 원칙 1. 임원은 권한이 아니다

* 회장, 부회장, 감사, 고문 등 **임원은 조직 내 직책(Position)** 이다.
* 임원 여부는 **시스템 권한을 자동으로 부여하지 않는다.**

### 원칙 2. 권한은 명시적으로만 부여한다

* 모든 시스템 권한은 **관리자가 명시적으로 Role을 부여**해야 한다.
* 직책 변경, 임기 시작/종료, 조직 개편은 **권한에 영향을 주지 않는다.**

### 원칙 3. 자동 변환 로직을 금지한다

* `Position → Role` 자동 매핑은 **전면 금지**한다.
* 예외, 암묵적 규칙, "관례상"이라는 표현은 허용하지 않는다.

---

## 3. Role (권한) 정의

Role은 **"무엇을 할 수 있는가"**를 정의하며,
API 접근, 관리자 기능, 운영 기능의 기준이 된다.

### 3.1 허용되는 Role 목록

| Role | 의미 |
|------|------|
| `membership_super_admin` | 전체 운영자 (Global Operator) |
| `membership_district_admin` | 지부 관리자 |
| `membership_branch_admin` | 분회 관리자 |
| `membership_verifier` | 자격 검증 담당 |
| `membership_member` | 일반 회원 |

### 3.2 금지되는 Role 유형

| 유형 | 이유 |
|------|------|
| `membership_officer` | 직책을 권한으로 오해 |
| `chairman` / `auditor` Role | 임원 직책의 권한화 |
| `honorary_*` | 표시 데이터에 불과 |

> **임원 관련 Role은 생성하지 않는다.**

---

## 4. Position (직책) 정의

Position은 **"조직 내에서 어떻게 불리는가"**를 정의하는 **표시·조직 데이터**이다.

### 4.1 Position의 성격

| 용도 | 허용 |
|------|------|
| 권한 부여 | ❌ |
| 접근 제어 | ❌ |
| 표시용 라벨 | ✅ |
| 조직 현황 | ✅ |
| 명단/소개 | ✅ |
| 임기 관리 | ✅ (선택) |

### 4.2 Position 목록 (OfficialRole)

| Position | 한글명 | 임원 여부 |
|----------|--------|-----------|
| `president` | 회장 | ✅ |
| `vice_president` | 부회장 | ✅ |
| `general_manager` | 총무 | ✅ |
| `auditor` | 감사 | ✅ |
| `director` | 이사 | ✅ |
| `branch_head` | 분회장 | ❌ (관리직) |
| `district_head` | 지부장 | ❌ (관리직) |
| `none` | 일반 | ❌ |

### 4.3 구현 원칙

* Position은 `Member.officialRole` 필드에 저장한다.
* Position 변경은 **RoleAssignment/Permission 로직을 호출하지 않는다.**
* 임원 여부 판단은 `member.isExecutive()` 와 같은 **상태 체크 메서드**로만 수행한다.

---

## 5. UI/UX 설계 원칙

### 5.1 임원 관련 화면

* 화면 명칭: **"임원 현황"**, "임원 명단"
* 금지 사항:
  * Role 변경 UI
  * 권한 레벨 표시
  * 관리자 기능과의 혼합

### 5.2 권한 관련 화면

* Role Assignment는 **별도의 관리자 화면**에서만 수행
* "임원 관리 화면"과 **절대 결합하지 않는다.**

---

## 6. 개발자·에이전트 공통 금지 사항

아래 항목은 **재도입 시 즉시 반려 대상**이다.

| 금지 항목 | 이유 |
|-----------|------|
| `officialRole` 변경 시 Role을 수정하는 코드 | 자동 변환 금지 |
| 임원 여부로 관리자 메뉴를 노출하는 로직 | 직책 ≠ 권한 |
| "임원은 당연히 관리자"라는 주석·설명·가정 | 잘못된 전제 |
| Position enum을 Role enum과 혼용 | 개념 혼동 |

---

## 7. 기준 상태 (Baseline)

본 문서는 다음 Work Order의 결과를 **정상 기준 상태**로 삼는다.

**WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1**
* `membership_officer` Role 제거
* `syncRoleFromOfficialRole` 자동 변환 로직 비활성화
* OfficerManagePage UI 분리 (직책 표시 전용)
* 빌드 성공

이 기준에서 벗어나는 변경은 **반드시 별도 Work Order**를 통해 승인되어야 한다.

---

## 8. 한 줄 요약

> **임원은 직책이며, 권한이 아니다.**
> **권한은 오직 Role로, 명시적으로만 부여한다.**

---

## 9. 관련 문서

* [RoleAssignmentService.ts](../../packages/membership-yaksa/src/backend/services/RoleAssignmentService.ts) - Role 정의 및 할당 로직
* [Member.ts](../../packages/membership-yaksa/src/backend/entities/Member.ts) - isExecutive(), isAdminPosition() 헬퍼
* [OfficerManagePage.tsx](../../apps/admin-dashboard/src/pages/yaksa-admin/OfficerManagePage.tsx) - 임원 현황 UI

---

*Created: 2026-01-10*
*Based on: WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1*
