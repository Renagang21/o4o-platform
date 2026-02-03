# WO-KPA-STEWARDSHIP-AND-ORGANIZATION-UI-IMPLEMENTATION-V1

**Status**: Ready for Implementation
**Type**: Implementation Work Order
**Created**: 2026-02-03

---

## 목적 (Purpose)

KPA 영역에서 **조직(지부/분회) 관리와 Steward 배정 UI를 실제로 구현**한다.
본 작업은 이미 확정된 설계 기준을 **코드로 고정**하는 단계이며,
새 개념 도입이나 구조 변경은 허용하지 않는다.

---

## 상위 기준 문서 (필수 준수)

아래 문서를 **모두 전제로 구현**한다.

1. `docs/_platform/MY-KPA-PHARMACIST-INTEGRATION-STANDARD.md`
2. `docs/_platform/MY-DASHBOARD-PHARMACIST-UI-CHECKLIST.md`
3. `docs/_platform/KPA-STEWARDSHIP-AND-ORGANIZATION-MANAGEMENT-UI.md`

> **이 기준과 충돌하는 구현은 금지**
> 충돌 가능성 발견 시 즉시 작업 중단 후 판단 요청

---

## 구현 범위 (Scope)

### 구현 대상 (필수)

- KPA Admin 영역 UI
  - 조직 관리 화면
  - 약사 조직 소속 승인/제외 관리 화면
  - Steward 배정/해제 관리 화면

### 구현 제외 (절대 금지)

- My 화면 변경
- RBAC(RoleAssignment) 구조 변경
- auth-core User 스키마 변경
- 자동 조직 이동/자동 승인
- 외부 약사 DB 연동
- GlycoPharm / Cosmetics / Neture 영향

---

## 구현 대상 화면 정의

### 1. 조직 관리 화면 (Organization Management)

**목적**: 지부 / 분회 조직을 **명시적으로 관리**

**필수 기능**:
- 조직 목록 조회
- 조직 생성 / 수정 / 비활성화
- 상·하위 조직 관계 설정

**표시 정보**:
- 조직명
- 조직 타입 (지부 / 분회)
- 상위 조직
- 활성 상태
- 소속 약사 수

**금지 사항**:
- 조직 자동 생성
- 조직 삭제 (비활성화만 허용)

---

### 2. 약사 조직 소속 승인 관리

**목적**: 약사의 **조직 소속을 운영자가 수동으로 관리**

**필수 기능**:
- 소속 요청 목록 조회
- 요청 출처 표시
  - 본인 요청
  - 타 조직 요청
  - 운영자 직접 요청
- 승인 / 제외 처리
- 처리 이력 확인

**UX 요구**:
- 승인/제외는 **즉시 반영**
- 조직 중복 소속은 허용하되 자동 판단 없음

**금지 사항**:
- 자동 소속 변경
- 규칙 기반 이동
- My 화면에서 승인 처리

---

### 3. Steward 관리 화면 (핵심)

**목적**: 조직/공간 단위 운영 책임(Steward)을 명확히 배정

**배정 조건**:
- 해당 조직에 소속된 약사만 가능
- KPA Admin만 배정/해제 가능

**배정 단위**:
- 조직
- 운영 공간
  - 포럼
  - 교육
  - 콘텐츠

**필수 UX**:
- 조직 선택
- 공간 선택
- Steward 지정
- 해제 버튼
- 현재 배정 상태 확인

**금지 사항 (강제)**:
- RoleAssignment 사용
- 권한 레벨 수치화
- 기능 단위 권한 설정
- My 화면에서 노출

---

## 데이터 접근 경계

- Steward 정보는 **KPA 서비스 내부 테이블**에만 저장
- Platform Role / auth-core User 변경 금지
- 조직 소속 역시 KPA 도메인 한정

---

## My 화면과의 경계 (재강조)

- My 화면은 **요약만**
- 조직 상세, 승인 버튼, Steward 배정 UI는 **절대 노출 금지**
- My ↔ Admin UI 간 직접 링크 금지

---

## 구현 중단 조건 (필수)

> 구현 도중
> - Core 구조 변경이 필요하다고 판단되거나
> - 기존 기준 문서와 충돌 가능성이 발생하면
> **즉시 작업을 중단하고 판단을 요청한다.**

---

## 완료 기준 (Definition of Done)

- [ ] 조직 관리 UI 정상 동작
- [ ] 약사 소속 승인/제외 가능
- [ ] Steward 배정/해제 가능
- [ ] My 화면 영향 없음
- [ ] RBAC/Platform 구조 무변경
- [ ] 빌드 성공

---

## Phase 종료 규칙 (필수)

> Phase 종료 시
> 병합 또는 다음 Phase 진행 전에
> **반드시 점검을 거친다.**

---

## 후속 단계 (참고, 이번 WO 범위 아님)

- 운영자용 QA 체크리스트
- Steward 활동 로그/감사 UI
- 조직별 통계 대시보드

---

*Created: 2026-02-03*
