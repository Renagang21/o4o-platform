# SELLER-PARTNER-CONTRACT-ARCHITECTURE-V1

> **Seller↔Partner 계약 독립화 아키텍처 설계**
> WO-NETURE-SELLER-PARTNER-CONTRACT-V1
> 2026-02-24

---

## 1. 설계 목표

### 현재 (승인 = 계약)

```
Recruitment → Application(approved) → Dashboard 자동 등록
                                       관계 끝.
```

승인이 곧 관계 활성화. 계약 기간·해지·갱신 관리 불가.

### 목표 (계약 독립화)

```
Recruitment → Application(approved) → Contract(active) → Dashboard 자동 등록
                                       │
                                       ├── terminated (Seller 또는 Partner 해지)
                                       └── expired (기간 만료)
```

승인은 계약 생성 트리거. 계약은 독립 Entity로 관리.

### 설계 제약

- 정산 인프라 **미관여** (commission_rate 스냅샷 저장까지만)
- 기존 Application 상태 흐름 **변경 최소화**
- `neture_supplier_requests` 패턴 참고 (6단계 상태 머신)
- Frontend 최소 확장 (Seller: 활동 파트너 목록, Partner: 활동 판매자 목록)

---

## 2. 현재 상태 분석

### 승인 흐름 (neture.service.ts:2673-2720)

```typescript
async approvePartnerApplication(applicationId, sellerId) {
  // 1. Application 상태 → APPROVED
  application.status = ApplicationStatus.APPROVED;
  application.decidedAt = new Date();
  application.decidedBy = sellerId;
  await this.applicationRepo.save(application);

  // 2. Dashboard에 자동 등록
  const item = dashboardRepo.create({
    partnerUserId: application.partnerId,
    productId: recruitment.productId,
    serviceId: recruitment.serviceId || 'glycopharm',
    status: 'active',
  });
  await dashboardRepo.save(item);
}
```

**문제점**:
1. Application이 "신청 이력"과 "활성 관계"를 동시에 담당
2. 계약 종료/해지 메커니즘 없음
3. 계약 기간 관리 불가
4. commission_rate 변경 시 기존 관계에 소급 적용

---

## 3. 신규 테이블: neture_seller_partner_contracts

### DDL

```sql
CREATE TYPE "neture_contract_status_enum" AS ENUM ('active', 'terminated', 'expired');

CREATE TABLE "neture_seller_partner_contracts" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id"        varchar NOT NULL,
  "seller_name"      varchar NOT NULL,
  "partner_id"       varchar NOT NULL,
  "partner_name"     varchar,
  "recruitment_id"   uuid,
  "application_id"   uuid,
  "product_id"       varchar NOT NULL,
  "product_name"     varchar NOT NULL,
  "service_id"       varchar,
  "commission_rate"  decimal(5,2) NOT NULL DEFAULT 0,
  "contract_status"  "neture_contract_status_enum" NOT NULL DEFAULT 'active',
  "started_at"       timestamptz NOT NULL DEFAULT NOW(),
  "ended_at"         timestamptz,
  "terminated_by"    varchar,
  "termination_reason" text,
  "created_at"       timestamptz NOT NULL DEFAULT NOW(),
  "updated_at"       timestamptz NOT NULL DEFAULT NOW()
);
```

### 인덱스

```sql
-- Seller별 활성 계약 조회
CREATE INDEX "IDX_spc_seller_status"
  ON "neture_seller_partner_contracts" ("seller_id", "contract_status");

-- Partner별 활성 계약 조회
CREATE INDEX "IDX_spc_partner_status"
  ON "neture_seller_partner_contracts" ("partner_id", "contract_status");

-- 동일 Seller↔Partner↔Product 간 active 계약 1건 제한
CREATE UNIQUE INDEX "IDX_spc_unique_active"
  ON "neture_seller_partner_contracts" ("seller_id", "partner_id", "product_id")
  WHERE "contract_status" = 'active';
```

### 필드 설계 근거

| 필드 | 설계 근거 |
|------|----------|
| `seller_id` / `partner_id` | varchar — Recruitment/Application과 동일 타입. UUID가 아닌 varchar인 이유: 기존 sellerId/partnerId가 varchar로 저장 |
| `recruitment_id` / `application_id` | nullable — 출처 추적용. 삭제되어도 계약은 독립 유지 |
| `commission_rate` | **스냅샷** — Recruitment의 commissionRate를 계약 생성 시점에 복사. 모집 공고 변경되어도 기존 계약 불변 |
| `product_id` / `product_name` | 스냅샷 — 모집 상품 정보. 원본 변경에 무관 |
| `contract_status` | PostgreSQL ENUM — `active` / `terminated` / `expired` |
| `started_at` | 계약 시작 시점 (승인 시점 = 계약 시작) |
| `ended_at` | nullable — 종료 시 기록 |
| `terminated_by` | 해지 주체 (seller 또는 partner) |

---

## 4. Entity 정의

```typescript
// NetureSellerPartnerContract.entity.ts

export enum ContractStatus {
  ACTIVE = 'active',
  TERMINATED = 'terminated',
  EXPIRED = 'expired',
}

@Entity('neture_seller_partner_contracts')
@Index('IDX_spc_seller_status', ['sellerId', 'contractStatus'])
@Index('IDX_spc_partner_status', ['partnerId', 'contractStatus'])
export class NetureSellerPartnerContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'seller_name' })
  sellerName: string;

  @Column({ name: 'partner_id' })
  partnerId: string;

  @Column({ name: 'partner_name', nullable: true })
  partnerName: string;

  @Column({ name: 'recruitment_id', type: 'uuid', nullable: true })
  recruitmentId: string | null;

  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId: string | null;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ name: 'service_id', nullable: true })
  serviceId: string | null;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  commissionRate: number;

  @Column({
    name: 'contract_status',
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.ACTIVE,
  })
  contractStatus: ContractStatus;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'NOW()' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'terminated_by', nullable: true })
  terminatedBy: string | null;

  @Column({ name: 'termination_reason', type: 'text', nullable: true })
  terminationReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## 5. 상태 흐름

### Contract 상태 전이

```
active ──→ terminated (수동 해지)
active ──→ expired    (기간 만료 — 향후 배치 처리)
terminated → (최종 상태)
expired    → (최종 상태)
```

### 전체 흐름 (Recruitment → Contract)

```
Recruitment (recruiting)
    │
    ├── Partner 신청 → Application (pending)
    │
    ├── Seller 승인 → Application (approved)
    │                    │
    │                    └── Contract 생성 (active)
    │                         │
    │                         ├── Dashboard Item 자동 등록
    │                         │
    │                         ├── Seller/Partner 해지 → Contract (terminated)
    │                         │                         └── Dashboard Item 비활성화
    │                         │
    │                         └── 기간 만료 → Contract (expired)
    │
    └── Seller 거절 → Application (rejected)
```

### Application과 Contract의 역할 분리

| 역할 | Application | Contract |
|------|:-----------:|:--------:|
| 신청 이력 | **담당** | — |
| 승인/거절 기록 | **담당** | — |
| 활성 관계 표현 | — | **담당** |
| 해지/만료 관리 | — | **담당** |
| commission 스냅샷 | — | **담당** |
| 계약 기간 관리 | — | **담당** |

---

## 6. 승인 로직 변경

### Before

```typescript
// approvePartnerApplication (현재)
application.status = APPROVED;
await applicationRepo.save(application);
// → 바로 Dashboard 등록
```

### After

```typescript
// approvePartnerApplication (변경 후)
application.status = APPROVED;
await applicationRepo.save(application);

// → Contract 생성
const contract = contractRepo.create({
  sellerId: recruitment.sellerId,
  sellerName: recruitment.sellerName,
  partnerId: application.partnerId,
  partnerName: application.partnerName,
  recruitmentId: recruitment.id,
  applicationId: application.id,
  productId: recruitment.productId,
  productName: recruitment.productName,
  serviceId: recruitment.serviceId,
  commissionRate: recruitment.commissionRate,  // 스냅샷
  contractStatus: ContractStatus.ACTIVE,
  startedAt: new Date(),
});
await contractRepo.save(contract);

// → Dashboard 등록 (기존 로직 유지)
```

**변경점**: `approvePartnerApplication()` 메서드에 Contract 생성 **3줄 추가**만 필요.

---

## 7. 신규 API

### 계약 조회

| 엔드포인트 | 메서드 | 용도 | 가드 |
|-----------|--------|------|------|
| `/partner/contracts` | GET | Partner의 활성 계약 목록 | requireAuth |
| `/seller/contracts` | GET | Seller의 활성 계약 목록 | requireAuth |

### 계약 해지

| 엔드포인트 | 메서드 | 용도 | 가드 |
|-----------|--------|------|------|
| `/partner/contracts/:id/terminate` | POST | Partner가 계약 해지 | requireAuth |
| `/seller/contracts/:id/terminate` | POST | Seller가 계약 해지 | requireAuth |

### Request/Response

```typescript
// GET /partner/contracts or /seller/contracts
interface ContractListResponse {
  id: string;
  sellerId: string;
  sellerName: string;
  partnerId: string;
  partnerName: string;
  productId: string;
  productName: string;
  serviceId: string;
  commissionRate: number;
  contractStatus: 'active' | 'terminated' | 'expired';
  startedAt: string;
  endedAt: string | null;
}

// POST /partner/contracts/:id/terminate
interface TerminateContractDto {
  reason?: string;
}
```

---

## 8. 해지 로직

```typescript
async terminateContract(contractId: string, terminatedBy: string, reason?: string) {
  const contract = await contractRepo.findOne({
    where: { id: contractId, contractStatus: ContractStatus.ACTIVE },
  });

  if (!contract) throw new Error('CONTRACT_NOT_FOUND');

  // 해지 주체 확인 (seller 또는 partner)
  if (contract.sellerId !== terminatedBy && contract.partnerId !== terminatedBy) {
    throw new Error('NOT_CONTRACT_PARTY');
  }

  contract.contractStatus = ContractStatus.TERMINATED;
  contract.endedAt = new Date();
  contract.terminatedBy = terminatedBy;
  contract.terminationReason = reason || null;
  await contractRepo.save(contract);

  // Dashboard Item 비활성화 (선택적)
  await dashboardRepo.update(
    { partnerUserId: contract.partnerId, productId: contract.productId },
    { status: 'inactive' },
  );

  return { id: contract.id, contractStatus: contract.contractStatus };
}
```

---

## 9. 기존 구조 충돌 분석

| 항목 | 충돌 여부 | 설명 |
|------|:--------:|------|
| `neture_supplier_requests` | 없음 | Seller↔Supplier 관계 — 별도 도메인 |
| `neture_partner_applications` | 없음 | Application은 신청 이력으로 유지. 역할 분리 |
| `neture_partner_recruitments` | 없음 | Recruitment은 모집 공고로 유지 |
| `neture_partner_dashboard_items` | 없음 | Dashboard 등록은 Contract 생성 후 실행 (순서만 변경) |
| Application 상태 흐름 | 없음 | pending/approved/rejected 그대로 유지 |
| 기존 Frontend | 없음 | Partner Overview는 Dashboard Items 기반 — Contract와 무관 |

---

## 10. `neture_supplier_requests`와의 정렬

| 항목 | Supplier Request | Seller-Partner Contract |
|------|:----------------:|:----------------------:|
| 관계 방향 | Seller → Supplier | Seller ← Partner (Recruitment 경유) |
| 상태 체계 | 6단계 (pending→expired) | 3단계 (active/terminated/expired) |
| 감사 로그 | `neture_supplier_request_events` | 향후 필요 시 추가 (v1에서 미포함) |
| 기간 관리 | `effectiveUntil` | `started_at` + `ended_at` |
| 해지 주체 | Supplier만 | Seller 또는 Partner |
| Commission | 없음 (별도 구조) | `commission_rate` (스냅샷) |

**차이 이유**: Supplier Request는 "신청+계약"이 하나의 Entity. Contract는 Application에서 분리된 순수 계약 Entity. 복잡도를 낮추기 위해 상태를 3단계로 단순화.

---

## 11. DB 마이그레이션 설계

### 마이그레이션 내용

```sql
-- 1. ENUM 생성
CREATE TYPE "neture_contract_status_enum"
  AS ENUM ('active', 'terminated', 'expired');

-- 2. 테이블 생성
CREATE TABLE "neture_seller_partner_contracts" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id"          varchar NOT NULL,
  "seller_name"        varchar NOT NULL,
  "partner_id"         varchar NOT NULL,
  "partner_name"       varchar,
  "recruitment_id"     uuid,
  "application_id"     uuid,
  "product_id"         varchar NOT NULL,
  "product_name"       varchar NOT NULL,
  "service_id"         varchar,
  "commission_rate"    decimal(5,2) NOT NULL DEFAULT 0,
  "contract_status"    "neture_contract_status_enum" NOT NULL DEFAULT 'active',
  "started_at"         timestamptz NOT NULL DEFAULT NOW(),
  "ended_at"           timestamptz,
  "terminated_by"      varchar,
  "termination_reason" text,
  "created_at"         timestamptz NOT NULL DEFAULT NOW(),
  "updated_at"         timestamptz NOT NULL DEFAULT NOW()
);

-- 3. 인덱스
CREATE INDEX "IDX_spc_seller_status"
  ON "neture_seller_partner_contracts" ("seller_id", "contract_status");

CREATE INDEX "IDX_spc_partner_status"
  ON "neture_seller_partner_contracts" ("partner_id", "contract_status");

CREATE UNIQUE INDEX "IDX_spc_unique_active"
  ON "neture_seller_partner_contracts" ("seller_id", "partner_id", "product_id")
  WHERE "contract_status" = 'active';

-- 4. 기존 approved Application → Contract 마이그레이션
INSERT INTO "neture_seller_partner_contracts"
  ("seller_id", "seller_name", "partner_id", "partner_name",
   "recruitment_id", "application_id",
   "product_id", "product_name", "service_id",
   "commission_rate", "contract_status", "started_at")
SELECT
  r."seller_id", r."seller_name",
  a."partner_id", a."partner_name",
  r."id", a."id",
  r."product_id", r."product_name", r."service_id",
  r."commission_rate", 'active', a."decided_at"
FROM "neture_partner_applications" a
JOIN "neture_partner_recruitments" r ON r."id" = a."recruitment_id"
WHERE a."status" = 'approved';
```

### Down 마이그레이션

```sql
DROP TABLE IF EXISTS "neture_seller_partner_contracts";
DROP TYPE IF EXISTS "neture_contract_status_enum";
```

---

## 12. 변경 파일 목록

| 파일 | 변경 내용 | 유형 |
|------|----------|:----:|
| 마이그레이션 파일 (신규) | 테이블 + ENUM + 인덱스 + 데이터 마이그레이션 | 생성 |
| `NetureSellerPartnerContract.entity.ts` (신규) | Entity 정의 | 생성 |
| `neture.service.ts` | `approvePartnerApplication()`에 Contract 생성 추가 | 수정 |
| `neture.service.ts` | `terminateContract()` 메서드 추가 | 수정 |
| `neture.routes.ts` | 4개 엔드포인트 추가 (계약 조회 2 + 해지 2) | 수정 |
| `entities/index.ts` | Entity 등록 | 수정 |
| `database/connection.ts` | Entity 등록 | 수정 |

### 변경하지 않는 파일

| 파일 | 이유 |
|------|------|
| `NeturePartnerApplication.entity.ts` | 상태 흐름 변경 없음 |
| `NeturePartnerRecruitment.entity.ts` | 모집 공고 구조 변경 없음 |
| `NeturePartnerDashboardItem.entity.ts` | Dashboard 구조 변경 없음 |
| `NetureSupplierRequest.entity.ts` | Supplier 경로 무관 |
| Frontend 화면 | v1에서 최소 확장 (별도 WO) |

---

## 13. Frontend 최소 확장 (별도 WO 권장)

### v1 (본 WO 범위)

- Backend 전용: 계약 생성/조회/해지 API

### v2 (별도 WO)

| 영역 | 추가 화면 | API 연결 |
|------|----------|---------|
| Seller 공간 | "활동 중 파트너" 목록 | `GET /seller/contracts?status=active` |
| Seller 공간 | 계약 해지 버튼 | `POST /seller/contracts/:id/terminate` |
| Partner 공간 | "활동 중 판매자" 목록 | `GET /partner/contracts?status=active` |
| Partner 공간 | 계약 시작일/커미션 표시 | Contract 응답 데이터 |

---

## 14. 리스크 제거 효과

| IR 리스크 | 해결 여부 | 설명 |
|----------|:--------:|------|
| R-1 (계약 독립 Entity 부재) | **해결** | `neture_seller_partner_contracts` 생성 |
| R-2 (정산 인프라 전무) | 유지 | 의도적. commission_rate 스냅샷까지만 |
| R-3 (이중 Entity 구조) | 유지 | 본 WO 범위 외 |

### 구조 단계 변경

```
Before: B  (부분 구현 — 모집+신청+승인, 계약 없음)
After:  C  (계약 구조 존재 — seller_id + partner_id + 상태 관리)
```

---

## 15. 결론

### 핵심 설계 원칙

1. **승인 ≠ 계약** — Application은 신청 이력, Contract는 실제 관계
2. **commission_rate 스냅샷** — Recruitment 변경으로부터 기존 계약 보호
3. **Active 계약 유일성** — Partial unique index로 동일 관계 중복 방지
4. **정산 미관여** — commission_rate 저장까지만. 정산 인프라는 별도 WO
5. **기존 흐름 최소 변경** — `approvePartnerApplication()`에 3줄 추가

### 구현 복잡도

| 작업 | 복잡도 |
|------|:------:|
| Migration (테이블 + 데이터 마이그레이션) | 낮음 |
| Entity 정의 | 낮음 |
| 승인 로직 수정 (Contract 생성 추가) | 낮음 |
| 해지 API | 낮음 |
| 조회 API | 낮음 |
| Entity 등록 | 낮음 |

**전체 복잡도: 낮음** — 신규 테이블 1개 + 기존 메서드 수정 1개소 + API 4개 추가

---

*Generated: 2026-02-24*
*WO: WO-NETURE-SELLER-PARTNER-CONTRACT-V1*
*Status: Architecture Design Complete*
*Classification: Architecture Document*
