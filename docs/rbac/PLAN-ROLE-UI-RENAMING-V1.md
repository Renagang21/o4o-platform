# PLAN-ROLE-UI-RENAMING-V1

> **Work Order**: WO-ROLE-PHILOSOPHY-STEPWISE-V1 Phase 2 → Phase 3 실행 기반
> **기준일**: 2026-02-27
> **상태**: PLAN (코드 변경 없음)
> **의존**: ROLE-PHILOSOPHY-V1.md (§7 UI 명칭 표준)

---

## 0. 요약

| 항목 | 값 |
|------|-----|
| 변경 대상 파일 수 | **14개** (admin-dashboard) |
| 예상 커밋 수 | **3개** (화면 그룹별) |
| 예상 리스크 | **낮음** (UI 텍스트만 변경, 로직 변경 없음) |
| 롤백 방법 | git revert 1개 커밋 |

---

## 1. 변경 원칙

ROLE-PHILOSOPHY-V1 §7 기준:

| DB 값 | 기존 UI 텍스트 | 변경 후 UI 텍스트 |
|--------|--------------|-----------------|
| `operator` (Platform Role) | 운영자 | **서비스운영자** |
| `operator` (Org Role - KPA/조직) | 운영자 | **조직운영자** |
| `operator` (Signage HQ) | HQ 운영자 | **HQ 운영자** ← 변경 없음 (이미 구분됨) |
| 영문 `Operator` (prefixed service) | Platform Operator | **Service Operator** |
| 영문 `Operator` (페이지 제목) | Operators | **Service Operators** |

> **핵심 규칙**: Context가 명확한 경우(Signage HQ Operator, Org Operator)는
> 이미 구분되거나 조직 컨텍스트가 있어 사용자 혼동 없음.
> 변경 우선순위는 Platform Role 노출 위치에 집중.

---

## 2. 변경 대상 전체 목록

### Group 1: 설정/인증 관련 (커밋 1)

#### 2-1. `apps/admin-dashboard/src/pages/settings/AuthSettings.tsx`

```typescript
// Line 31 — 기존
{ role: 'operator', label: '운영자', defaultPath: '/admin' },

// 변경 후
{ role: 'operator', label: '서비스운영자', defaultPath: '/admin' },
```
- 영향: 인증 설정 화면의 역할 선택 드롭다운
- 사용자 혼동 가능성: 낮음 (관리자만 접근)

#### 2-2. `apps/admin-dashboard/src/pages/dashboard/unified/cards/MyAccountCard.tsx`

```typescript
// Line 17 — 기존
operator: { label: '운영자', color: 'bg-gray-100 text-gray-700' },

// 변경 후
operator: { label: '서비스운영자', color: 'bg-gray-100 text-gray-700' },
```
- 영향: 대시보드 내 계정 카드의 역할 배지

### Group 2: 운영자 관리 페이지 (커밋 2)

#### 2-3. `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx`

```typescript
// Line 32 — 기존
{ value: 'platform:operator', label: 'Platform Operator', description: 'Platform operator' },

// 변경 후
{ value: 'platform:operator', label: 'Platform Service Operator', description: 'Platform-wide service operator' },

// Line 36 — 기존
{ value: 'kpa-a:operator', label: '커뮤니티 운영자', description: 'KPA 커뮤니티 서비스 운영자 (kpa-society.co.kr)' },

// 변경 후 (조직 컨텍스트이므로 '서비스운영자' 유지 — KPA 서비스의 운영자)
{ value: 'kpa-a:operator', label: 'KPA 서비스운영자', description: 'KPA 커뮤니티 서비스 운영자 (kpa-society.co.kr)' },

// Line 47 — 기존
{ value: 'glycopharm:operator', label: 'GlycoPharm Operator', description: 'GlycoPharm operator' },

// 변경 후
{ value: 'glycopharm:operator', label: 'GlycoPharm 서비스운영자', description: 'GlycoPharm 서비스 운영자' },

// Line 51 — 기존
{ value: 'cosmetics:operator', label: 'K-Cosmetics Operator', description: 'K-Cosmetics operator' },

// 변경 후
{ value: 'cosmetics:operator', label: 'K-Cosmetics 서비스운영자', description: 'K-Cosmetics 서비스 운영자' },

// Line 55 — 기존
{ value: 'glucoseview:operator', label: 'GlucoseView Operator', description: 'GlucoseView operator' },

// 변경 후
{ value: 'glucoseview:operator', label: 'GlucoseView 서비스운영자', description: 'GlucoseView 서비스 운영자' },

// Line 452 — 기존
label: 'Add Operator',

// 변경 후
label: 'Add Service Operator',

// Line 489 — 기존
<div className="text-sm text-gray-500">Total Operators</div>

// 변경 후
<div className="text-sm text-gray-500">Total Service Operators</div>

// Line 507 — 기존
<div className="text-sm text-gray-500">Operators</div>

// 변경 후
<div className="text-sm text-gray-500">Service Operators</div>
```

#### 2-4. `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx`

```typescript
// Line 99 — 기존
label: 'Operators',

// 변경 후
label: 'Service Operators',
```

### Group 3: Guards & 권한 메시지 (커밋 3)

#### 2-5. `apps/admin-dashboard/src/components/guards/policy-notice-messages.ts`

```typescript
// Lines 135-137 — 기존
title: '운영자 권한 필요',
description: '이 기능은 운영자 권한이 있는 사용자만 이용할 수 있습니다.',
guidance: '운영자 권한이 필요하시면 관리자에게 문의하세요.',

// 변경 후
title: '서비스운영자 권한 필요',
description: '이 기능은 서비스운영자 권한이 있는 사용자만 이용할 수 있습니다.',
guidance: '서비스운영자 권한이 필요하시면 관리자에게 문의하세요.',
```

#### 2-6. `apps/admin-dashboard/src/components/guards/OperatorScopeBadge.tsx`

```typescript
// Line 173 — 기존
<h3 className="font-medium">운영자 권한</h3>

// 변경 후
<h3 className="font-medium">서비스운영자 권한</h3>
```

#### 2-7. `apps/admin-dashboard/src/pages/operator/MyPolicyPage.tsx`

```typescript
// Line 51 — 기존
<AlertTitle>운영자 권한 없음</AlertTitle>

// 변경 후
<AlertTitle>서비스운영자 권한 없음</AlertTitle>

// Line 53 — 기존
이 페이지는 운영자 권한이 있는 사용자만 접근할 수 있습니다.

// 변경 후
이 페이지는 서비스운영자 권한이 있는 사용자만 접근할 수 있습니다.

// Line 54 — 기존
운영자 권한이 필요하시면 관리자에게 문의하세요.

// 변경 후
서비스운영자 권한이 필요하시면 관리자에게 문의하세요.

// Line 99 — 기존
<h1 className="text-2xl font-bold tracking-tight">내 운영자 정책</h1>

// 변경 후
<h1 className="text-2xl font-bold tracking-tight">내 서비스운영자 정책</h1>

// Line 179 — 기존
운영자 스코프는 서비스별 권한 범위를 정의합니다.

// 변경 후
서비스운영자 스코프는 서비스별 권한 범위를 정의합니다.
```

#### 2-8. `apps/admin-dashboard/src/pages/digital-signage/v2/ContentHub.tsx`

```typescript
// Line 72 — 기존
return '운영자 콘텐츠';

// 변경 후
return '서비스운영자 콘텐츠';

// Line 83 — 기존
return 'HQ 및 서비스 운영자가 제작한 공식 콘텐츠';

// 변경 후 (변경 없음 — 이미 "서비스 운영자"로 표현됨, 적절)
return 'HQ 및 서비스운영자가 제작한 공식 콘텐츠';

// Line 231 — 기존
<TabsTrigger value="hq">운영자 콘텐츠</TabsTrigger>

// 변경 후
<TabsTrigger value="hq">서비스운영자 콘텐츠</TabsTrigger>
```

---

## 3. 변경하지 않는 항목 (현행 유지)

| 파일 | 이유 |
|------|------|
| `SignageRoleGuard.tsx:86,92` — `'HQ 운영자'` | Signage 전용 extensionRole. 이미 'HQ'로 구분됨 |
| `useOperatorPolicy.ts` 주석들 | 코드 주석, 사용자에 미노출 |
| `App.tsx:740` — `{/* 운영자 관리 */}` | 코드 주석 |
| `types.ts:14` — `'operator' // 운영자 컨텍스트` | 코드 주석 |
| `OfficerManagePage.tsx:280` | 맥락상 조직 내 권한 설명 (이미 "관리자, 운영자 등"으로 적절) |
| `BusinessDashboard.tsx:623` | "운영자가 공개한 콘텐츠" — 서비스운영자 의미로 적절하나 사용자 노출도 낮음 |
| `YaksaAdminHub.tsx:5` | 코드 주석 |

---

## 4. KPA 조직 Layer B `operator` UI (별도 처리)

KPA 약사회 쪽 화면에서 `KpaMemberRole = 'operator'`를 노출하는 경우:

| 파일 | 현재 레이블 | 변경 후 |
|------|------------|---------|
| KPA 멤버 목록/상세 (탐색 필요) | 운영자 | **조직운영자** |
| 분회 가입 신청 role 표시 | 운영자 | **조직운영자** |

> **탐색 필요**: `kpa` 관련 컴포넌트에서 KpaMemberRole 표시 부분을 Phase 3 실행 시 추가 확인 필요.

---

## 5. 적용 순서 (Phase 3 실행 시)

```
커밋 1: 설정/인증 관련 (2개 파일)
  - AuthSettings.tsx
  - MyAccountCard.tsx

커밋 2: 운영자 관리 페이지 (2개 파일)
  - OperatorsPage.tsx
  - admin-menu.static.tsx

커밋 3: Guards & 권한 메시지 (4개 파일)
  - policy-notice-messages.ts
  - OperatorScopeBadge.tsx
  - MyPolicyPage.tsx
  - ContentHub.tsx
```

---

## 6. 테스트 체크리스트

- [ ] admin.neture.co.kr 로그인 → 역할 배지가 "서비스운영자"로 표시
- [ ] Settings > Auth Settings → 역할 선택 드롭다운에 "서비스운영자" 표시
- [ ] Service Operators 메뉴 → 페이지 제목 "Service Operators" 표시
- [ ] 운영자 권한 없는 사용자로 MyPolicyPage 접근 → "서비스운영자 권한 없음" 메시지
- [ ] Digital Signage > Content Hub → "서비스운영자 콘텐츠" 탭 표시
- [ ] 기존 `operator` 역할 사용자 → 기능 변화 없음 (텍스트만 변경)

---

## 7. 롤백 전략

```bash
# 커밋이 3개로 분리되므로 단계별 롤백 가능
git revert HEAD      # 커밋 3 롤백
git revert HEAD~1    # 커밋 2 롤백
git revert HEAD~2    # 커밋 1 롤백
```

---

*Phase 2 산출물 — 코드 변경 없음*
*실행: Phase 3 WO-ROLE-PHILOSOPHY-PHASE3-UI-EXECUTION-V1*
