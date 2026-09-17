# Phase B 안전 분해 실행 설계서

> **선행**: Phase A 마이그레이션 완료 상태 가정
> **목표**: 기존 코드를 `kpa_organizations` → `organizations` 기반으로 전환
> **원칙**: 엔티티 전환 → 컴파일 검증 → 컨트롤러 전환 → 컴파일 검증

---

## 0. Phase A 완료 후 상태

```
organizations (확장됨)     ← Phase A에서 컬럼 추가 + 데이터 sync
kpa_organizations          ← 그대로 존재 (미삭제)
organization_service_enrollments  ← Phase A에서 생성
```

핵심: **organizations.id = kpa_organizations.id** (동일 UUID)
→ FK 참조 대상만 바꾸면 데이터 레벨에서는 호환

---

## 1. 사전 결정: Organization 엔티티 확장 방식

### 선택지

| 방식 | 설명 | 장점 | 단점 |
|------|------|------|------|
| A. Frozen 해제 | Organization 엔티티에 직접 컬럼 추가 | 깔끔, 단일 Source | Core 정책 위반 |
| B. 래퍼 엔티티 | `OrganizationStore` 엔티티 생성 (같은 테이블, 확장 컬럼 포함) | Core 미수정 | 엔티티 이중화 |
| C. Raw SQL | Organization 엔티티 그대로 + 확장 컬럼은 raw SQL 조회 | 변경 최소 | 타입 안전성 상실 |

### 권고: **B안 — 래퍼 엔티티**

근거:
- organization-core Frozen 유지 가능 (WO 없이 진행)
- 기존 Organization 엔티티를 사용하는 다른 코드(forum, organization.routes)에 영향 없음
- 확장 컬럼만 추가한 별도 엔티티로 KPA 쪽에서만 사용

```typescript
// OrganizationStore — organizations 테이블의 확장 뷰 엔티티
@Entity('organizations')
export class OrganizationStore {
  // Organization 기본 필드 (organizations 테이블)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;  // DB: "parentId" (camelCase)

  @Column({ type: 'boolean', default: true })
  isActive: boolean;  // DB: "isActive" (camelCase)

  // Phase A 확장 필드 (snake_case)
  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  business_number: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  storefront_config: Record<string, any>;

  @Column({ type: 'varchar', length: 30, default: 'BASIC' })
  template_profile: string;

  @Column({ type: 'jsonb', nullable: true })
  storefront_blocks: any[] | null;
}
```

---

## 2. Phase B-1: 엔티티 전환 (Safe → Compile Check)

### B-1a: 새 엔티티 생성 (3건 — 순수 추가, 기존 코드 미변경)

| # | 파일 | 엔티티 | 대상 테이블 | 작업 |
|---|------|-------|-----------|------|
| N1 | `routes/kpa/entities/organization-store.entity.ts` | OrganizationStore | organizations | **신규 생성** |
| N2 | `routes/kpa/entities/organization-service-enrollment.entity.ts` | OrganizationServiceEnrollment | organization_service_enrollments | **신규 생성** |
| N3 | — | — | — | **신규 생성** |

**컴파일 게이트**: `tsc --noEmit` 통과 확인
**영향**: 기존 코드 0% — 순수 추가만

### B-1b: 종속 엔티티 FK 전환 (8건 — Breaking)

> **이 단계를 실행하면 기존 `KpaOrganization` 참조 컨트롤러에서 TypeORM 런타임 에러 가능**
> 따라서 B-1b는 B-2(컨트롤러 전환)와 **동시에** 실행해야 함

| # | 엔티티 | 현행 FK | 변경 후 FK | 변경 내용 |
|---|--------|--------|-----------|----------|
| E3 | KpaMember | `@ManyToOne('KpaOrganization')` | `@ManyToOne('OrganizationStore')` | import type + relation 변경 |
| E4 | OrganizationChannel | `@ManyToOne('KpaOrganization')` | `@ManyToOne('OrganizationStore')` | 동일 |
| E5 | OrganizationProductListing | `@ManyToOne('KpaOrganization')` | `@ManyToOne('OrganizationStore')` | 동일 |
| E6 | KpaBranchOfficer | `@ManyToOne('KpaOrganization')` | `@ManyToOne('OrganizationStore')` | 동일 |
| E7 | KpaSteward | `@ManyToOne('KpaOrganization')` | `@ManyToOne('OrganizationStore')` | 동일 |
| E8 | KpaApplication | `@ManyToOne('KpaOrganization')` | `@ManyToOne('OrganizationStore')` | 동일 |
| E10 | KpaBranchSettings | `@ManyToOne('KpaOrganization')` | `@ManyToOne('OrganizationStore')` | 동일 |
| E2 | — | `@OneToOne('KpaOrganization')` | `@OneToOne('OrganizationStore')` | PK 공유 → Organization FK |

**주의**: B-1b를 실행하면 `organization_id` FK가 `kpa_organizations` → `organizations` 테이블을 가리키게 됨.
데이터는 동일 UUID이므로 호환되지만, TypeORM relation JOIN이 변경됨.

**컴파일 게이트**: `tsc --noEmit` — 타입 에러 수정 후 통과

### B-1 실행 전략

```
B-1a 실행 (새 엔티티 3건 추가)
    → tsc --noEmit ✅
    → 기존 코드 영향 없음 확인

B-1b + B-2a 동시 실행 (엔티티 FK + KPA 컨트롤러 전환)
    → tsc --noEmit
    → 런타임 검증 (API 서버 기동 확인)
```

---

## 3. Phase B-2: 컨트롤러 전환

### B-2a: KPA 컨트롤러 (13건 — Medium Risk)

변경 패턴: `kpa_organizations` 테이블 참조 → `organizations` 테이블 참조

| 변경 유형 | Before | After |
|----------|--------|-------|
| TypeORM repo | `getRepository(KpaOrganization)` | `getRepository(OrganizationStore)` |
| Raw SQL | `FROM kpa_organizations` | `FROM organizations` |
| 컬럼 참조 | `k.parent_id` / `k.is_active` | `o."parentId"` / `o."isActive"` |

**⚠️ 핵심 주의사항: 컬럼명 변환**

| kpa_organizations | organizations |
|-------------------|---------------|
| `parent_id` | `"parentId"` |
| `is_active` | `"isActive"` |
| `created_at` | `"createdAt"` |
| `updated_at` | `"updatedAt"` |
| `storefront_config` | `storefront_config` (동일 — Phase A 추가) |
| `address` | `address` (동일 — Phase A 추가) |
| `phone` | `phone` (동일 — Phase A 추가) |

**컨트롤러 전환 순서** (의존성 기준):

```
Group 1 (독립, 병행 가능):
  C4  organization.controller.ts      — 조직 CRUD
  C5  member.controller.ts            — 회원 관리
  C6  application.controller.ts       — 신청 관리
  C9  branch-public.controller.ts     — 공개 분회 정보
  C10 steward.controller.ts           — 스튜어드 관리
  C11 organization-join-request.controller.ts — 가입 요청

Group 2 (Store Hub 의존):
  C1  store-hub.controller.ts         — Store Hub 개요
  C2  pharmacy-store-config.controller.ts — 매장 설정
  C3  kpa-store-template.controller.ts   — 템플릿 적용

Group 3 (Admin/Operator):
  C7  operator-summary.controller.ts   — 운영 요약
  C8  branch-admin-dashboard.controller.ts — 분회 관리자
  C12 admin-force-asset.controller.ts  — 자산 강제 배포
  C13 admin-dashboard.controller.ts    — 관리자 대시보드
```

**컴파일 게이트**: Group 완료 후 `tsc --noEmit`

### B-2c: 플랫폼/기타 (5건)

```
  physical-store.service.ts
  store-network.service.ts
  store-policy.routes.ts
  platform-hub.controller.ts
  home-preview.controller.ts
```

---

## 4. 전체 실행 타임라인

```
┌─────────────────────────────────────────────────────────────┐
│ B-1a: 새 엔티티 3건 생성                                     │
│   OrganizationStore + OrganizationServiceEnrollment          │
│   + PharmacyExtension                                       │
│   → tsc --noEmit ✅                                         │
│   영향: 없음                                                 │
├─────────────────────────────────────────────────────────────┤
│ B-1b + B-2a (Group 1): 엔티티 FK 전환 + KPA 독립 컨트롤러    │
│   8개 엔티티 FK: KpaOrganization → OrganizationStore         │
│   6개 컨트롤러: kpa_organizations → organizations            │
│   → tsc --noEmit                                            │
│   영향: 🟡 Medium                                            │
├─────────────────────────────────────────────────────────────┤
│ B-2a (Group 2+3): KPA Store Hub + Admin 컨트롤러             │
│   7개 컨트롤러 전환                                           │
│   → tsc --noEmit                                            │
│   영향: 🟡 Medium                                            │
├─────────────────────────────────────────────────────────────┤
│ B-2b (Group 4): 읽기 경로 → 뷰 전환                          │
│   4개 컨트롤러 (공개 스토어, 레이아웃, 사이니지)                │
│   → tsc --noEmit                                            │
│   영향: 🟡 Medium                                            │
├─────────────────────────────────────────────────────────────┤
│ B-2b (Group 5): CRUD → organizations 직접                    │
│   4개 파일 (레포지토리, 서비스, Admin, 결제)                    │
│   → tsc --noEmit                                            │
│   영향: 🔴 High                                              │
├─────────────────────────────────────────────────────────────┤
│ B-2b (Group 6) + B-2c: 인증/컨텍스트 + 플랫폼                │
│   7개 파일                                                    │
│   → tsc --noEmit                                            │
│   영향: 🔴 High                                              │
├─────────────────────────────────────────────────────────────┤
│ B-3: KpaOrganization 엔티티 제거                              │
│   connection.ts에서 제거                                      │
│   KpaOrganization 파일 삭제 또는 deprecated 마킹               │
│   → tsc --noEmit ✅                                         │
│   영향: 🟢 Low (모든 참조 이미 전환됨)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 각 단계별 Rollback 전략

| 단계 | Rollback 방법 |
|------|-------------|
| B-1a | 새 엔티티 파일 삭제 + connection.ts 복원 |
| B-1b | 엔티티 FK를 KpaOrganization으로 복원 |
| B-2a | git revert (컨트롤러 변경 전 커밋 필수) |
| B-2b (뷰) | 뷰 참조 제거 → 원본 테이블 직접 참조 복원 |
| B-2b (CRUD) | git revert |
| B-3 | KpaOrganization 엔티티 + connection.ts 복원 |

---

## 6. 위험 구간 정리

| 구간 | 위험도 | 이유 | 완화 |
|------|--------|------|------|
| B-1b | 🔴 | 엔티티 FK 변경 → TypeORM JOIN 대상 테이블 변경 | B-2a와 동시 실행 |
| B-2a 컬럼명 | 🟡 | `parent_id` → `"parentId"` 등 컬럼명 변환 필수 | 치환 목록 사전 작성 |
| B-2b Group 5 | 🔴 | — | 뷰 호환 레이어 유지 |
| B-2b Group 6 | 🔴 | 인증 미들웨어 변경 → 인증 장애 가능 | care-pharmacy-context만 별도 검증 |

---

## 7. 실행 전 확인사항

- [ ] Phase A 마이그레이션 실행 완료 확인
- [ ] `organizations` 테이블에 kpa 데이터 sync 확인
- [ ] `organization_service_enrollments` 데이터 확인
- [ ] 각 단계 실행 전 git commit (rollback point)

---

*Phase B-1a 승인 시 즉시 실행 가능*
