# 약사회 SaaS 조직 거버넌스 조사 – 개요

**Version:** 1.0  
**Date:** 2026-01-04  
**요청자:** Rena  
**조사자:** Antigravity Agent  
**목적:** 약사회 SaaS에서 "대한약사회(중앙)" 개념을 완전히 제거하고 "전체 운영자(Global Operator)" 체계를 명확히 정립하기 위한 사전 조사

---

## 📋 조사 목적

약사회 SaaS는 **지부(최상위 조직)** + **분회(하위 조직)**만 존재하는 구조로 운영되며,  
'대한약사회 본부'라는 현실 조직 개념은 **SaaS 구조에 존재하지 않는다**.

따라서 전체 아키텍처에서 다음과 같은 정비가 필요하다:

### ✔ "중앙"이라는 조직 레벨 제거
### ✔ "Global Operator(전체 운영자)"라는 시스템적 역할을 명확하게 정의
### ✔ 모든 조직 관련 기능이 지부/분회 중심으로만 동작하는지 검증
### ✔ 기존 코드/DB/UI 내부의 "중앙" 잔재 제거

---

## 📊 조사 범위

조사는 아래 4개 범위를 모두 포함한다:

### A. DB/스키마 조사
- `Organization` 엔티티 구조
- `RoleAssignment` scopeType/scopeId
- 시드 데이터 및 마이그레이션
- 조직 관련 인덱스 및 제약 조건

### B. API/백엔드 기능 조사
- organization-core 서비스
- forum/forum-yaksa, dropshipping/groupbuy-yaksa
- lms/lms-yaksa, reporting-yaksa
- membership-yaksa, admin-dashboard API
- 중앙 전제 로직 패턴 식별

### C. 프론트엔드 화면 조사
- 메인 대시보드, OrganizationSelector
- 포럼, 공동구매, LMS, Admin 화면
- 보고서 화면
- UI/UX 중앙 개념 노출 여부

### D. 운영자(Global Operator) 권한 구조 조사
- 운영자 역할 정의
- OrganizationMember 포함 여부
- 조직 스코프 독립성
- 전체 조직 데이터 접근 권한

---

## 🔍 주요 발견 사항 (요약)

### ✅ 확인된 문제점

1. **Organization 엔티티에 'national' 타입 존재**
   - `packages/organization-core/src/entities/Organization.ts`
   - `type!: 'national' | 'division' | 'branch';`
   - 주석에도 "본부"라는 개념 명시

2. **시드 데이터에서 중앙 조직 생성**
   - `packages/organization-core/src/lifecycle/install.ts`
   - `seedDefaultOrganization()` 함수에서 'NATIONAL' 코드로 본부 생성
   - `org.type = 'national'`, `org.level = 0`, `org.path = '/national'`

3. **프론트엔드에서 national 타입 필터링**
   - `apps/main-site/src/components/common/OrganizationUI.tsx`
   - `organization.type === 'national'` 조건문 사용

4. **전역 권한 시스템은 존재하지만 명확성 부족**
   - `RoleAssignment`에 `scopeType: 'global' | 'organization'` 존재
   - `super_admin` 역할 정의 있음
   - 그러나 "Global Operator" 개념과의 명확한 구분 없음

### ⚠️ 미확인 영역

- 각 서비스별(forum, lms, dropshipping 등)에서 organizationId 사용 패턴
- 백엔드 로직에서 `level === 0` 또는 `type === 'national'` 조건 검사
- UI에서 중앙 조직 필터/배너/공지 노출 여부
- 운영자의 OrganizationMember 포함 여부

---

## 📁 조사 결과 문서 구조

```
/docs/dev/audit/organization-governance/
├── 00_overview.md (본 문서)
├── 01_db_audit.md
├── 02_backend_audit.md
├── 03_frontend_audit.md
├── 04_operator_role_audit.md
└── 99_fix_plan.md
```

---

## 🎯 다음 단계

1. [01_db_audit.md](./01_db_audit.md) - DB/스키마 상세 조사 결과
2. [02_backend_audit.md](./02_backend_audit.md) - 백엔드 서비스 조사 결과
3. [03_frontend_audit.md](./03_frontend_audit.md) - 프론트엔드 UI 조사 결과
4. [04_operator_role_audit.md](./04_operator_role_audit.md) - 운영자 권한 조사 결과
5. [99_fix_plan.md](./99_fix_plan.md) - 중앙 개념 완전 삭제 정비 제안서

---

## 📝 작성 정보

- **초안 작성일:** 2026-01-04
- **최종 업데이트:** 2026-01-04
- **작성자:** Antigravity Agent
- **승인 대기 중**
