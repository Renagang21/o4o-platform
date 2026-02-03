# My 화면 약사 UI 체크리스트

**Document ID**: MY-DASHBOARD-PHARMACIST-UI-CHECKLIST
**Version**: 1.0
**Status**: Active
**근거**: WO-MY-DASHBOARD-PHARMACIST-UI-CHECKLIST-V1
**상위 기준**: MY-KPA-PHARMACIST-INTEGRATION-STANDARD.md
**적용 범위**: 약사 영역 한정 (KPA, 지부, 분회)

---

## 1. 적용 범위

### 강제 적용 대상

- KPA-Society
- 지부 서비스
- 분회 서비스
- 분회/지부 기반 교육·포럼·조직 서비스

### 비강제 대상

- GlycoPharm
- Cosmetics
- Neture
- Digital Signage
- 기타 B2C / 파트너 / 공급자 서비스

---

## 2. 핵심 개념 정의 (고정)

### 2.1 약사 상태 (Pharmacist Status)

- **role이 아니다**
- 플랫폼 User의 **상태(status)** 이다
- 판정 기준:
  - 면허번호 등록 완료
  - 운영자 승인 완료

```
User.pharmacistStatus = NONE | PENDING | APPROVED
```

### 2.2 서비스 이용 권한

- 서비스는 **가입(Sign-up)을 만들 수 있다**
- 단, **약사 서비스는 가입을 만들지 않는다**
- 약사 서비스 접근 조건:
  - pharmacistStatus = APPROVED
  - 서비스별 Enrollment 승인

---

## 3. My 화면 UI 구조 규칙

### 3.1 기본 섹션 구조

```
[ My ]
 ├─ 약사 상태 요약 (약사인 경우만)
 ├─ 이용 중인 서비스
 ├─ 권장 서비스
 └─ 기타 개인 서비스
```

### 3.2 약사 상태 요약 영역 (강제)

**표시 조건**: pharmacistStatus = PENDING | APPROVED

**표시 내용**:
- 상태 뱃지 (승인됨 / 승인 대기)
- 면허번호 마스킹 표시
- 상태 안내 문구

**금지**:
- role, 권한 레벨, 내부 코드 노출
- "회원 등급" 표현

### 3.3 이용 중인 서비스 영역

**포함 조건**: Enrollment = APPROVED 인 서비스

**UI 규칙**:
- Primary 강조 카드
- "이용 중" 고정 뱃지
- CTA: **바로 이동**

**약사 서비스 표기**:
- 약사 서비스는 그룹 상단에 배치
- 일반 서비스와 시각적으로 구분

### 3.4 권장 서비스 영역

**포함 조건**: Enrollment = NOT_APPLIED | PENDING

**상태별 버튼**:

| 상태 | 버튼 |
|------|------|
| 미신청 | 이용 신청 |
| 승인 대기 | 승인 대기 |
| 반려 | 재신청 |

**약사 서비스 UX**:
- "약사 승인 필요" 안내 문구 필수
- 가입(Sign-up) 버튼 금지

### 3.5 비강제 서비스 표시 규칙

- 약사 여부와 무관하게 노출 가능
- My 통합 대상 아님
- 단독 서비스 UX 유지

---

## 4. 금지 규칙

| 금지 항목 | 이유 |
|-----------|------|
| "약사 회원 가입" 버튼 | 약사 서비스는 가입 불가, enrollment만 |
| 서비스별 약사 role 생성 | 약사는 status, role 아님 |
| 약사 서비스별 User 테이블 | Platform User 단일 계정 원칙 |
| 약사/비약사 혼합된 서비스 카드 | 강제/비강제 범위 혼동 |
| My 화면에서 조직 내부 정보 노출 | 조직 관리는 별도 화면 |

---

## 5. 상태 변화 반영 규칙

### 즉시 반영

- Enrollment 승인/반려
- 약사 승인 완료

### 새로고침 필요

- Steward 배정
- 조직 소속 변경

> My 화면은 실시간 조직 상태를 책임지지 않는다.

---

## 6. 관련 문서

| 문서 | 경로 |
|------|------|
| 약사 상태 통합 기준 | `docs/_platform/MY-KPA-PHARMACIST-INTEGRATION-STANDARD.md` |
| Role·Position 분리 원칙 | `docs/app-guidelines/kpa-auth-role-position-principles.md` |
| 플랫폼 감사 결과 | WO-PLATFORM-PHARMACIST-IDENTITY-AND-SERVICE-SCOPE-AUDIT-V1 |

---

*Created: 2026-02-03*
*Based on: WO-MY-DASHBOARD-PHARMACIST-UI-CHECKLIST-V1*
