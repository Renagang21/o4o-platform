# ADMIN_OPERATOR_ROLE_POLICY_V1

> **O4O Platform — Admin / Operator 권한 정책 정의**
>
> WO-O4O-ADMIN-OPERATOR-ROLE-POLICY-V1
>
> Status: **Active Policy**
> Version: 1.0
> Created: 2026-02-17

---

## 0. 이 문서의 지위

이 문서는 O4O 플랫폼 전 서비스에 공통 적용되는 **Admin / Operator 권한 철학과 경계**를 정의한다.

- CLAUDE.md 하위에 위치하며, CLAUDE.md에 종속된다.
- 코드 변경이 아닌 **정책 정의**만을 포함한다.
- 향후 모든 기능 설계, Guard 구현, 권한 검증은 이 문서의 원칙을 따른다.

### 관련 문서

| 문서 | 경로 | 관계 |
|------|------|------|
| CLAUDE.md | `/CLAUDE.md` | 상위 헌법 |
| KPA Role Matrix | `docs/_platform/KPA-ROLE-MATRIX-V1.md` | KPA 서비스 구체 매트릭스 |
| Operator Governance | `docs/_platform/OPERATOR-GOVERNANCE-FREEZE-V1.md` | 운영자 거버넌스 동결 |
| Operator OS Baseline | `docs/_platform/BASELINE-OPERATOR-OS-V1.md` | Core 패키지 동결 기준 |
| Security Core | `packages/security-core/` | 런타임 Guard 구현 |

---

## 1. 권한 계층 구조

O4O 플랫폼의 권한은 **3개 계층**으로 구성된다.

```
Platform Layer
  └── Service Layer
        └── Organization Layer
```

### 1.1 계층 정의

| 계층 | 역할 네임스페이스 | 범위 | 예시 |
|------|------------------|------|------|
| **Platform** | `platform:*` | 플랫폼 전체 인프라 | `platform:admin`, `platform:super_admin` |
| **Service** | `{service}:*` | 단일 서비스 내 | `kpa:admin`, `neture:operator` |
| **Organization** | `{service}:branch_*`, `{service}:district_*` | 조직 단위 | `kpa:branch_admin`, `kpa:district_admin` |

### 1.2 계층 간 관계 원칙

| 원칙 | 설명 |
|------|------|
| **상위 ≠ 하위 포함** | Platform Admin이 Service Admin 권한을 자동 보유하지 **않는다** |
| **서비스 격리** | 서비스 A의 역할은 서비스 B에 접근할 수 **없다** |
| **Platform Bypass는 서비스별 선택** | 각 서비스가 `platformBypass` 설정으로 결정 |
| **조직 스코프는 추가 검증** | Organization 역할은 Role 검증 + 소유권 검증 2단계 |

### 1.3 Platform Bypass 정책 (현행)

| 서비스 | `platform:admin` 접근 | 근거 |
|--------|----------------------|------|
| **KPA Society** | **차단 (Isolated)** | 약사회 자치 원칙 |
| **Neture** | 허용 | 플랫폼 운영 서비스 |
| **GlycoPharm** | 허용 | 플랫폼 운영 서비스 |
| **K-Cosmetics** | 허용 | 플랫폼 운영 서비스 |
| **GlucoseView** | 미설정 (향후 정의) | — |

---

## 2. Admin 표준 정의

### 2.1 핵심 철학

> **Admin은 구조를 만드는 역할이다.**
>
> 구조 생성, 정책 설정, 역할 부여, 기준 정의를 담당한다.
> 일상적 실행은 Admin의 책임이 **아니다**.

### 2.2 Platform Admin

| 항목 | 정의 |
|------|------|
| **역할명** | `platform:admin`, `platform:super_admin` |
| **권한 범위** | 플랫폼 인프라, 서비스 등록, 글로벌 설정 |
| **조직 스코프** | 적용 안 됨 (플랫폼 전체) |
| **서비스 접근** | `platformBypass: true`인 서비스만 |
| **감사 책임** | 모든 구조 변경에 대한 감사 로그 필수 |

**허용 행위:**
- 서비스 등록/해제
- 글로벌 설정 변경
- `platformBypass: true` 서비스의 관리자 기능 접근

**금지 행위:**
- `platformBypass: false` 서비스 접근 (KPA 등)
- 서비스 내부 비즈니스 로직 직접 실행
- 조직 스코프 우회

### 2.3 Service Admin

| 항목 | 정의 |
|------|------|
| **역할명 패턴** | `{service}:admin` |
| **구체 예시** | `kpa:admin`, `neture:admin`, `glycopharm:admin` |
| **권한 범위** | 해당 서비스 내 전체 구조 관리 |
| **조직 스코프** | 해당 서비스의 모든 조직에 접근 가능 |
| **감사 책임** | 서비스 내 구조/정책 변경 감사 로그 필수 |

**허용 행위:**

| 행위 | Guard 기준 |
|------|-----------|
| 구조 생성/삭제 (카테고리, 포럼, 메뉴 등) | `requireScope('{service}:admin')` |
| 역할 부여/회수 | `requireScope('{service}:admin')` |
| 정책 변경 (기본값, 제한, 규칙 등) | `requireScope('{service}:admin')` |
| 하위 조직 전체 조회 | `requireScope('{service}:admin')` |
| Operator 권한 범위의 모든 행위 | 자동 포함 |

**금지 행위:**
- 다른 서비스 접근
- 플랫폼 레벨 설정 변경
- 감사 로그 삭제

### 2.4 서비스별 Admin 역할 매핑

| 서비스 | Admin 역할 | Frontend UserRole | 비고 |
|--------|-----------|-------------------|------|
| **KPA** | `kpa:admin` | 별도 타입 없음 (string) | 약사회 최상위 관리자 |
| **Neture** | `neture:admin` | `'admin'` | API `admin`/`super_admin` → `admin` |
| **GlycoPharm** | `glycopharm:admin` | `'operator'` | API `admin`/`super_admin` → `operator` |
| **K-Cosmetics** | — (미설정) | `'admin'` | API `admin`/`super_admin` → `admin` |
| **GlucoseView** | — (미설정) | `'admin'` | API `admin`/`super_admin` → `admin` |

---

## 3. Operator 표준 정의

### 3.1 핵심 철학

> **Operator는 상태를 관리하는 역할이다.**
>
> Admin이 만든 구조 위에서 일상적인 운영을 실행한다.
> 콘텐츠 관리, 주문 처리, 노출 제어, 상태 변경을 담당한다.

### 3.2 Service Operator

| 항목 | 정의 |
|------|------|
| **역할명 패턴** | `{service}:operator` |
| **구체 예시** | `kpa:operator`, `neture:operator`, `glycopharm:operator` |
| **권한 범위** | 해당 서비스 내 운영 실행 |
| **정책 변경** | **불가** — Admin 전용 |
| **조직 스코프** | 서비스 정책에 따라 적용 |

**허용 행위:**

| 행위 | Guard 기준 |
|------|-----------|
| 콘텐츠 CRUD (게시글, 공지, 배너 등) | `requireScope('{service}:operator')` |
| 상태 변경 (활성/비활성, 노출/비노출) | `requireScope('{service}:operator')` |
| 운영 데이터 조회 (대시보드, 리포트) | `requireScope('{service}:operator')` |
| 주문/정산 처리 (해당 서비스) | `requireScope('{service}:operator')` |
| 사용자 조회 (목록, 상세) | `requireScope('{service}:operator')` |

**금지 행위:**

| 행위 | 이유 |
|------|------|
| 구조 생성/삭제 | Admin 전용 |
| 역할 부여/회수 | Admin 전용 |
| 정책/기본값 변경 | Admin 전용 |
| 다른 서비스 접근 | 서비스 격리 원칙 |
| 감사 로그 삭제 | 시스템 보호 |

### 3.3 Admin vs Operator 경계 요약

```
┌──────────────────────────────────────────────────┐
│                    Admin                          │
│  구조 생성/삭제 │ 역할 부여 │ 정책 변경 │ 기준 정의  │
├──────────────────────────────────────────────────┤
│                   Operator                        │
│  콘텐츠 관리 │ 상태 변경 │ 운영 조회 │ 일상 실행   │
├──────────────────────────────────────────────────┤
│                   Public                          │
│  공개 조회 │ 로그인 │ 기본 기능                     │
└──────────────────────────────────────────────────┘
```

### 3.4 서비스별 Operator 역할 매핑

| 서비스 | Operator 역할 | Frontend UserRole | 비고 |
|--------|-------------|-------------------|------|
| **KPA** | `kpa:operator` | 별도 타입 없음 (string) | KPA 플랫폼 운영 |
| **Neture** | `neture:operator` | `'admin'` (admin에 통합) | Neture는 admin/operator 미분리 |
| **GlycoPharm** | `glycopharm:operator` | `'operator'` | admin과 operator 동일 매핑 |
| **K-Cosmetics** | — (미설정) | `'operator'` | 독립 역할 존재 |
| **GlucoseView** | — (미설정) | `'admin'` (admin에 통합) | admin/operator 미분리 |

---

## 4. 조직 기반 역할 (Organization-Scoped Roles)

### 4.1 적용 대상

현재 조직 스코프가 적용되는 서비스: **KPA Society**

향후 확장 가능 서비스: K-Cosmetics (매장 네트워크), GlycoPharm (약국 네트워크)

### 4.2 조직 역할 정의

| 역할 | 네임스페이스 | 조직 범위 | 권한 수준 |
|------|------------|----------|----------|
| **District Admin** | `kpa:district_admin` | 지부 전체 + 하위 분회 | 준 Service Admin |
| **Branch Admin** | `kpa:branch_admin` | 단일 분회 | 조직 관리자 |
| **Branch Operator** | `kpa:branch_operator` | 단일 분회 | 조직 운영자 |

### 4.3 조직 스코프 검증 원칙 (2단계)

```
Stage 1: Role Verification (빠름, 로컬)
  └─ user.roles.some(r => allowedRoles.includes(r))

Stage 2: Ownership Verification (정확, API 호출)
  └─ GET /me/membership → branchId 일치 확인
```

| 역할 | Stage 1 | Stage 2 (소유권 검증) |
|------|---------|---------------------|
| `kpa:admin` | Pass | **면제** (전체 접근) |
| `kpa:district_admin` | Pass | **면제** (전체 접근) |
| `kpa:branch_admin` | Pass | **필수** (branchId 일치) |
| `kpa:branch_operator` | Pass | **필수** (branchId 일치) |

### 4.4 상위 조직 접근 규칙

| 접근 시도 | 허용 여부 | 근거 |
|-----------|----------|------|
| Branch Admin → 자기 분회 | **허용** | 직접 소유 |
| Branch Admin → 다른 분회 | **차단** | 소유권 불일치 |
| Branch Admin → 상위 지부 | **차단** | 상위 접근 금지 |
| District Admin → 하위 분회 | **허용** | 관할 범위 |
| District Admin → 다른 지부 | **차단** | 관할 범위 외 |
| Service Admin → 모든 조직 | **허용** | 서비스 전체 관리 |

### 4.5 조직 Admin vs 조직 Operator

| 구분 | Branch Admin | Branch Operator |
|------|-------------|----------------|
| 분회 설정 변경 | **가능** | 불가 |
| 회원 관리 (승인/거부) | **가능** | 불가 |
| 콘텐츠 CRUD | **가능** | **가능** |
| 회의 관리 | **가능** | **가능** |
| 공지 관리 | **가능** | **가능** |
| 인트라넷 조회 | **가능** | **가능** |

---

## 5. 서비스 격리 원칙

### 5.1 역할 네임스페이스 격리

모든 역할은 `{service}:{role}` 형식의 프리픽스를 사용한다.

```
kpa:admin          ← KPA 서비스 전용
neture:operator    ← Neture 서비스 전용
glycopharm:admin   ← GlycoPharm 서비스 전용
```

### 5.2 교차 서비스 접근 차단

| 규칙 | 설명 |
|------|------|
| **프리픽스 차단** | `kpa:*` 역할은 Neture/GlycoPharm 등에 접근 불가 |
| **레거시 역할 거부** | 프리픽스 없는 `admin`, `operator` 등은 경고 후 거부 |
| **차단 목록** | 각 서비스는 `blockedServicePrefixes`로 타 서비스 차단 |

### 5.3 현행 서비스 격리 매트릭스

|  | KPA | Neture | GlycoPharm | K-Cosmetics | GlucoseView | Platform |
|--|-----|--------|------------|-------------|-------------|----------|
| **kpa:*** | **허용** | 차단 | 차단 | 차단 | 차단 | 차단 |
| **neture:*** | 차단 | **허용** | 차단 | 차단 | 차단 | 차단 |
| **glycopharm:*** | 차단 | 차단 | **허용** | 차단 | 차단 | 차단 |
| **platform:*** | 차단 | 허용 | 허용 | 허용 | 미설정 | **허용** |

---

## 6. Guard 기준 패턴

### 6.1 API Guard 표준

```typescript
// 구조 변경 (Admin 전용)
requireScope('{service}:admin')

// 운영 실행 (Operator 이상)
requireScope('{service}:operator')

// 조직 스코프 (Branch 검증 포함)
requireScope('{service}:branch_admin') + validateBranchOwnership()

// 공개 조회
optionalAuth() 또는 인증 없음
```

### 6.2 Frontend Guard 표준

```typescript
// RoleGuard (공통 패턴)
<RoleGuard allowedRoles={['kpa:admin', 'kpa:operator']}>
  {children}
</RoleGuard>

// 역할 체크 (인라인)
user.roles.some(r => allowedRoles.includes(r))

// 활성 역할 (표시용)
user.roles[0]

// 역할 전환
switchRole(role) → roles 배열 재정렬, roles[0] = 선택된 역할
```

### 6.3 Guard 적용 기준표

| 행위 유형 | Guard | 예시 |
|----------|-------|------|
| 구조 생성/삭제 | `{service}:admin` | 포럼 카테고리 생성, 메뉴 구조 변경 |
| 역할 부여/회수 | `{service}:admin` | 사용자 역할 변경 |
| 정책 변경 | `{service}:admin` | 기본값, 제한 규칙 변경 |
| 콘텐츠 관리 | `{service}:operator` | 게시글, 공지, 배너 CRUD |
| 상태 변경 | `{service}:operator` | 활성/비활성, 노출/비노출 |
| 운영 조회 | `{service}:operator` | 대시보드, 리포트 |
| 조직 관리 | `{service}:branch_admin` + 소유권 | 분회 설정, 회원 관리 |
| 조직 운영 | `{service}:branch_operator` + 소유권 | 분회 콘텐츠, 회의 |
| 공개 조회 | `optionalAuth` 또는 없음 | 공개 페이지, 검색 |

---

## 7. 향후 확장 원칙

### 7.1 권한 위임 (Delegation)

| 원칙 | 정의 |
|------|------|
| **임시 권한** | 현재 미지원. 필요 시 Work Order 통해 설계 |
| **기간 기반 역할** | 현재 미지원. `roles[]` 배열에 TTL 메타데이터 추가로 구현 가능 |
| **위임 방향** | 상위 → 하위만 허용 (Admin → Operator 위임 가능, 역방향 불가) |

### 7.2 다중 역할 충돌 처리

| 상황 | 처리 원칙 |
|------|----------|
| 같은 서비스 Admin + Operator | Admin이 Operator를 포함. 충돌 없음 |
| 다른 서비스 역할 공존 | 각 서비스 Guard가 독립 검증. 간섭 없음 |
| Branch Admin + 다른 Branch | 각 Branch별 소유권 개별 검증 |
| `roles[0]` 충돌 | `switchRole()`로 사용자가 활성 역할 선택 |

### 7.3 감사 (Audit) 원칙

| 행위 | 감사 로그 | 필수 필드 |
|------|----------|----------|
| 구조 변경 (Admin) | **필수** | who, when, what, before, after |
| 역할 변경 | **필수** | targetUser, oldRoles, newRoles, changedBy |
| 상태 변경 (Operator) | **권장** | resource, oldStatus, newStatus |
| 조회 | 선택 | — |

### 7.4 신규 서비스 역할 추가 절차

1. `ServiceKey` 타입에 서비스 키 추가 (`packages/security-core/src/types.ts`)
2. `service-configs.ts`에 Scope Config 추가
3. 이 문서의 서비스별 매핑 테이블 업데이트
4. KPA 패턴과 동일 여부 확인 (조직 스코프 필요 시)
5. Work Order 승인 필수

---

## 8. 전체 역할 인벤토리 (현행)

### 8.1 Backend (security-core 등록)

| 서비스 | 역할 | 설명 |
|--------|------|------|
| platform | `platform:admin` | 플랫폼 관리자 |
| platform | `platform:super_admin` | 플랫폼 최고 관리자 |
| kpa | `kpa:admin` | KPA 서비스 관리자 |
| kpa | `kpa:operator` | KPA 서비스 운영자 |
| kpa | `kpa:district_admin` | 지부 관리자 |
| kpa | `kpa:branch_admin` | 분회 관리자 |
| kpa | `kpa:branch_operator` | 분회 운영자 |
| neture | `neture:admin` | Neture 관리자 |
| neture | `neture:operator` | Neture 운영자 |
| neture | `neture:supplier` | Neture 공급자 |
| neture | `neture:partner` | Neture 파트너 |
| glycopharm | `glycopharm:admin` | GlycoPharm 관리자 |
| glycopharm | `glycopharm:operator` | GlycoPharm 운영자 |

### 8.2 Frontend (UserRole 타입)

| 서비스 | Frontend 역할 | 매핑 원본 (API) |
|--------|-------------|----------------|
| Neture | `admin`, `supplier`, `partner`, `user` | admin/super_admin → admin |
| GlycoPharm | `pharmacy`, `supplier`, `partner`, `operator`, `consumer` | admin/super_admin → operator |
| K-Cosmetics | `admin`, `supplier`, `seller`, `partner`, `operator` | admin/super_admin → admin |
| GlucoseView | `pharmacist`, `admin`, `partner` | admin/super_admin → admin |
| KPA Society | string (동적) | 프리픽스 포함 (`kpa:admin` 등) |

### 8.3 미설정 (향후 정의 필요)

| 서비스 | 미설정 항목 |
|--------|-----------|
| K-Cosmetics | Backend scope config 미등록 |
| GlucoseView | Backend scope config 미등록 |
| K-Cosmetics | `platformBypass` 정책 미정의 |
| GlucoseView | `platformBypass` 정책 미정의 |

---

## 9. 금지 사항 (이 정책 문서 범위)

| 금지 항목 | 이유 |
|----------|------|
| 코드 수정 | 이 문서는 정책만 정의 |
| DB 변경 | 스키마는 별도 WO |
| Guard 수정 | Guard는 별도 WO |
| API 변경 | API는 별도 WO |
| security-core 변경 | Frozen (BASELINE-OPERATOR-OS-V1) |

---

## 10. 완료 기준 검증

| 기준 | 충족 여부 |
|------|----------|
| Admin / Operator 정의가 전 서비스에 공통 적용 가능 | **충족** — 섹션 2, 3 |
| 역할 명칭과 책임 범위 충돌 없이 정렬 | **충족** — 섹션 8 인벤토리 |
| Branch Scope와 역할의 관계 명확화 | **충족** — 섹션 4 |
| 향후 기능 설계 기준으로 사용 가능 | **충족** — 섹션 6 Guard 기준, 섹션 7 확장 원칙 |

---

*Updated: 2026-02-17*
*WO: WO-O4O-ADMIN-OPERATOR-ROLE-POLICY-V1*
