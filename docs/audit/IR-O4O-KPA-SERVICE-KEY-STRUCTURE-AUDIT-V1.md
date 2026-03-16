# IR-O4O-KPA-SERVICE-KEY-STRUCTURE-AUDIT-V1

> **Status**: Complete (READ-ONLY Investigation)
> **Date**: 2026-03-16
> **Scope**: KPA Society 서비스 키 구조, Role Prefix, URL 매핑, 데이터 격리 상태

---

## 1. KPA 서비스 구조 — 실제 코드 기준

### 1.1 3개 서브서비스 정의

| 서브서비스 | 내부 코드 | 설명 | 상태 |
|-----------|----------|------|------|
| **KPA-A** | `kpa-a` | 커뮤니티 (Forum) | **활성** — 핵심 서비스 |
| **KPA-B** | `kpa-b` | 데모 (Demo Forum) | **비활성** — scope='demo' → `1=0` 쿼리 |
| **KPA-C** | `kpa-c` | 분회 서비스 (Branch Admin) | **역할 제거됨** — Migration으로 RA 삭제 완료 |

### 1.2 플랫폼 vs 내부 서비스 키

| 레벨 | 테이블/설정 | service_key 값 |
|------|-----------|---------------|
| **플랫폼** | `service_catalog` | `kpa-society` |
| **플랫폼** | `service_memberships` | `kpa-society` |
| **플랫폼** | `organization_service_enrollments` | `kpa-society` (service_code 컬럼) |
| **플랫폼** | `serviceScope.ts` ROLE_PREFIX_TO_SERVICE_KEY | `kpa` → `kpa-society` |
| **내부** | `kpa_member_services` | `kpa-a`, `kpa-b`, `kpa-c` |

**핵심**: 플랫폼 레벨에서는 `kpa-society` 하나만 존재. `kpa-a/b/c`는 KPA 도메인 내부에서만 사용.

---

## 2. Role Prefix 구조

### 2.1 활성 역할 (role_assignments)

| Role | 용도 | 레벨 |
|------|------|------|
| `kpa:admin` | KPA 전체 관리자 | 서비스 관리 |
| `kpa:operator` | KPA 운영자 | 서비스 운영 |
| `kpa:district_admin` | 지회 관리자 | 지역 관리 |
| `kpa:branch_admin` | 분회 관리자 | 매장(분회) 관리 |
| `kpa:branch_operator` | 분회 운영자 | 매장(분회) 운영 |
| `kpa:pharmacist` | 약사 회원 | 일반 회원 |

### 2.2 비활성/제거된 역할

| Role | 상태 | 비고 |
|------|------|------|
| `kpa-b:district-admin` | **DEPRECATED** | Demo 서비스용, 코드에서 참조 존재하나 미사용 |
| `kpa-b:district` | **DEPRECATED** | Demo 서비스용 |
| `kpa-b:branch-admin` | **DEPRECATED** | Demo 서비스용 |
| `kpa-b:branch` | **DEPRECATED** | Demo 서비스용 |
| `kpa-c:admin` | **REMOVED** | Migration으로 RA에서 삭제 완료 |
| `kpa-c:operator` | **REMOVED** | Migration으로 RA에서 삭제 완료 |
| `kpa-c:pharmacist` | **REMOVED** | Migration으로 RA에서 삭제 완료 |

### 2.3 프론트엔드 비표준 Prefix

프론트엔드(`kpa-society-web`)에서 `kpa-a:operator` 형식의 prefix가 일부 사용됨.
이는 백엔드 `kpa:operator`와 불일치하나, CMS 콘텐츠 필터링 등에서만 사용되며
인증/인가 로직에는 영향 없음.

---

## 3. URL → 서비스 매핑

### 3.1 라우트 구조

모든 KPA 라우트는 **단일 Express 라우터**(`kpa.routes.ts`)에서 마운트됨.
URL 경로로 서비스를 구분하지 않고, **미들웨어 컨텍스트**로 구분.

```
/api/v1/kpa/
├── forum/                    ← KPA-A (커뮤니티)  scope='community'
├── demo-forum/               ← KPA-B (데모)      scope='demo' → 1=0 (빈 결과)
├── branch-admin/             ← KPA-C (분회 관리)
│   ├── :organizationId/members/
│   ├── :organizationId/settings/
│   └── ...
├── branches/                 ← KPA-C (분회 목록)
│   ├── list
│   └── :branchId/
├── pharmacist-profile/       ← 약사 프로필 관리
├── my-branch/                ← 내 분회 정보
├── districts/                ← 지회 관리
├── member/                   ← 회원 관리
├── member-services/          ← 회원 서비스 가입 (kpa-a/b/c)
├── operator-summary/         ← 운영자 대시보드 요약
└── sync/                     ← 동기화 API
```

### 3.2 서비스 분리 방식

| 서비스 | 분리 메커니즘 | 상세 |
|--------|-------------|------|
| **KPA-A** (커뮤니티) | `ForumContext` middleware | `scope: 'community'` → CMS serviceKey='kpa' 필터 |
| **KPA-B** (데모) | `ForumContext` middleware | `scope: 'demo'` → `WHERE 1=0` 강제 빈 결과 |
| **KPA-C** (분회) | `branchScopeGuard` middleware | `organization_id` 기반 소유권 검증 |

**중요 발견**: 분회 서비스는 `/branch`가 아닌 **`/branch-admin`** 및 **`/branches`** 경로에 위치.

---

## 4. 데이터 격리 상태

### 4.1 격리 매트릭스

| 격리 경계 | 메커니즘 | 강도 | 비고 |
|----------|---------|------|------|
| KPA-A ↔ KPA-C | `serviceKey` (CMS) + `organizationId` (회원) | **STRONG** | 서로 다른 데이터 소스 |
| KPA-A ↔ KPA-B | `scope='demo'` → `1=0` 쿼리 | **STRONG** | Demo는 항상 빈 결과 반환 |
| 분회 A ↔ 분회 B | `organization_id` FK 검증 | **STRONG** | `branchScopeGuard` 미들웨어 |
| Admin → 모든 분회 | `kpa:admin`/`kpa:district_admin` bypass | **INTENTIONAL** | 관리자 의도적 전체 접근 |

### 4.2 확인된 약점

#### 4.2.1 CMS serviceKey 혼용 (Low Risk)

`operator-summary` 컨트롤러에서:
```sql
WHERE serviceKey IN ('kpa', 'kpa-society')
```

`kpa`와 `kpa-society` 두 값을 동시 사용. CMS 콘텐츠가 어떤 키로 저장되었는지에 따라
누락 가능성 있음. 기능적 문제는 아니나 정리 필요.

#### 4.2.2 kpa_member_services 접근 제어 부재 (Low Risk)

`kpa_member_services` 테이블의 `service_key` 값(`kpa-a`, `kpa-b`, `kpa-c`)에 대한
미들웨어 레벨 접근 제어가 별도로 없음. 단, 이 테이블은 회원 자신의 서비스 가입 상태만
관리하므로 교차 접근 리스크는 낮음.

#### 4.2.3 KPA-B/KPA-C 잔여 코드 (No Risk)

`kpa-b:*` 역할 정의가 `types/roles.ts`에 남아있으나:
- KPA-B: `scope='demo'` → 항상 빈 결과 (실질적 비활성)
- KPA-C: Migration으로 role_assignments에서 삭제 완료
- 코드 정리는 별도 WO에서 수행 가능

---

## 5. 문제 분석 및 권장사항

### 5.1 구조적 불일치

| 항목 | 현재 상태 | 이상적 상태 |
|------|----------|-----------|
| 플랫폼 service_key | `kpa-society` | 유지 |
| Role prefix | `kpa:` | 유지 |
| 내부 sub-service keys | `kpa-a`, `kpa-b`, `kpa-c` | `kpa-a` 만 유지, 나머지 정리 |
| 프론트엔드 prefix | `kpa-a:operator` (비표준) | `kpa:operator`로 통일 |
| CMS serviceKey | `kpa` 또는 `kpa-society` 혼용 | 하나로 통일 |

### 5.2 WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1 영향

`serviceScope.ts`의 `ROLE_PREFIX_TO_SERVICE_KEY` 매핑:
```typescript
'kpa' → 'kpa-society'
```

이 매핑은 **정확**함. `kpa:admin` 등의 role prefix에서 `kpa`를 추출하고,
`organization_service_enrollments.service_code = 'kpa-society'`로 필터링.
KPA 내부 sub-service 구분(`kpa-a/b/c`)은 Operator Console 레벨에서 불필요하므로
현재 구현이 적합.

### 5.3 권장 후속 작업

| 우선순위 | 작업 | 설명 |
|---------|------|------|
| P2 | KPA-B 코드 정리 | `kpa-b:*` 역할 정의 제거, demo-forum 라우트 제거 |
| P2 | KPA-C 잔여 코드 정리 | `kpa-c` 관련 타입 정의 제거 |
| P3 | CMS serviceKey 통일 | `kpa` / `kpa-society` 중 하나로 통일 |
| P3 | 프론트엔드 prefix 정규화 | `kpa-a:operator` → `kpa:operator` |

---

## 6. 요약

KPA Society는 플랫폼 레벨에서 **단일 서비스**(`kpa-society`)이며, 내부적으로 3개
서브서비스(`kpa-a`, `kpa-b`, `kpa-c`)를 **컨텍스트 기반**(URL이 아닌 미들웨어)으로
구분한다. KPA-B(데모)와 KPA-C(분회 역할)는 이미 비활성/제거 상태이므로, 실질적으로
**KPA-A 커뮤니티**만 활성 운영 중이다.

데이터 격리는 전반적으로 **양호**하며, WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1의
Operator Console 격리도 올바르게 적용되어 있다. 주요 정리 대상은 잔여 코드(`kpa-b/c`
역할 정의, CMS serviceKey 혼용)이며, 이는 별도 WO에서 처리 가능하다.

---

*Generated: 2026-03-16*
*Investigation Type: READ-ONLY (코드 수정 없음)*
