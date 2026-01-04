# 프론트엔드 UI 조사 결과

**Date:** 2026-01-04  
**조사 범위:** Frontend UI Components, Pages, Organization Selector

---

## 🎯 조사 목표

프론트엔드 UI에서 "중앙(본부)" 개념이 노출되는지 조사

---

## 🔍 주요 발견 사항

### ❌ 문제 1: OrganizationUI 컴포넌트에서 'national' 타입 사용

**파일:** [`apps/main-site/src/components/common/OrganizationUI.tsx`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx)

#### 1) 배지 색상 정의

```typescript
// 조직 타입별 배지 색상
const badgeColors = {
  national: 'bg-purple-100 text-purple-800 border-purple-200',  // ⚠️
  division: 'bg-blue-100 text-blue-800 border-blue-200',
  branch: 'bg-green-100 text-green-800 border-green-200',
};

// 조직 타입별 한글명
const typeLabels = {
  national: '본부',  // ⚠️
  division: '지부',
  branch: '분회',
};
```

**영향:**
- UI에서 '본부' 라벨 표시
- 보라색 배지로 시각적 구분

**우선순위:** **P0**

---

#### 2) OrganizationSelector - 드롭다운 버튼

**파일:** [`apps/main-site/src/components/common/OrganizationUI.tsx:140-145`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx#L140-L145)

```typescript
<span
  className={`w-2 h-2 rounded-full ${
    organization.type === 'national'  // ⚠️
      ? 'bg-purple-500'
      : organization.type === 'division'
      ? 'bg-blue-500'
      : 'bg-green-500'
  }`}
/>
```

**영향:**
- 조직 선택기에서 'national' 타입 조직에 보라색 인디케이터 표시

**우선순위:** **P0**

---

#### 3) OrganizationSelector - 멤버십 목록

**파일:** [`apps/main-site/src/components/common/OrganizationUI.tsx:183-188`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx#L183-L188)

```typescript
<span
  className={`w-2 h-2 rounded-full flex-shrink-0 ${
    membership.organization.type === 'national'  // ⚠️
      ? 'bg-purple-500'
      : membership.organization.type === 'division'
      ? 'bg-blue-500'
      : 'bg-green-500'
  }`}
/>
```

**영향:**
- 드롭다운 메뉴에서 각 멤버십의 조직 타입을 색상으로 구분
- 'national' 타입은 보라색으로 표시

**우선순위:** **P0**

---

### 📊 프론트엔드 조사 결과 요약

#### ❌ 발견된 문제

| ID | 문제 | 위치 | 우선순위 | 조치 |
|----|------|------|----------|------|
| FE-01 | badgeColors에 'national' 정의 | [`OrganizationUI.tsx:12`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx#L12) | P0 | 'national' 키 제거 |
| FE-02 | typeLabels에 'national':'본부' | [`OrganizationUI.tsx:19`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx#L19) | P0 | 'national' 키 제거 |
| FE-03 | organization.type === 'national' 조건문 (드롭다운 버튼) | [`OrganizationUI.tsx:140`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx#L140) | P0 | 조건문 제거 |
| FE-04 | membership.organization.type === 'national' 조건문 (목록) | [`OrganizationUI.tsx:183`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx#L183) | P0 | 조건문 제거 |

---

## 🎯 권장 조치 사항

### 1. OrganizationUI 컴포넌트 수정

**현재:**
```typescript
const badgeColors = {
  national: 'bg-purple-100 text-purple-800 border-purple-200',
  division: 'bg-blue-100 text-blue-800 border-blue-200',
  branch: 'bg-green-100 text-green-800 border-green-200',
};

const typeLabels = {
  national: '본부',
  division: '지부',
  branch: '분회',
};
```

**수정안:**
```typescript
const badgeColors = {
  division: 'bg-blue-100 text-blue-800 border-blue-200',
  branch: 'bg-green-100 text-green-800 border-green-200',
};

const typeLabels = {
  division: '지부',
  branch: '분회',
};
```

### 2. 조건문 단순화

**현재:**
```typescript
organization.type === 'national'
  ? 'bg-purple-500'
  : organization.type === 'division'
  ? 'bg-blue-500'
  : 'bg-green-500'
```

**수정안:**
```typescript
organization.type === 'division'
  ? 'bg-blue-500'
  : 'bg-green-500'
```

---

## 📋 체크리스트

- [x] 메인 대시보드 조사
- [x] OrganizationSelector 컴포넌트 조사
- [ ] 포럼 목록/공지 섹션 조사
- [ ] 공동구매 화면 조사
- [ ] LMS 수강 목록 조사
- [ ] Admin 화면(조직/회원 관리) 조사
- [ ] 보고서 화면 조사

**비고:**
- 현재까지 `OrganizationUI.tsx` 컴포넌트에서만 'national' 타입 사용 확인
- 다른 화면에서의 중앙 개념 노출 여부는 추가 조사 필요

---

## 🔗 관련 문서

- [00_overview.md](./00_overview.md) - 조사 개요
- [01_db_audit.md](./01_db_audit.md) - DB 조사 결과
- [02_backend_audit.md](./02_backend_audit.md) - 백엔드 조사 결과
- [04_operator_role_audit.md](./04_operator_role_audit.md) - 운영자 권한 조사 (다음 단계)
- [99_fix_plan.md](./99_fix_plan.md) - 정비 제안서 (최종)
