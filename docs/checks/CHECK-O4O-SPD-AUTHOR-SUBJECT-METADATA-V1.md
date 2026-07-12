# CHECK-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1

> WO: `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1` (B1 선행 — draft-save WO 의 전제)
> 성격: **스키마 additive**. shared_product_descriptions 에 작성 주체·제출 시각 메타 2컬럼 추가.
> 설계: [`IR-O4O-SPD-AUTHOR-SUBJECT-METADATA-DESIGN-V1`](../investigations/IR-O4O-SPD-AUTHOR-SUBJECT-METADATA-DESIGN-V1.md) §5
> Readiness: [`IR-...-DRAFT-SAVE-READINESS-V1`](../investigations/IR-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-READINESS-V1.md) B1
> 작성일: 2026-07-12

## 1. 최종 attribution SSOT 정의

STORE 설명서 작성/원천/검수 축을 다음과 같이 **분리**한다(경쟁 아님).

| 축 | 컬럼 | 의미 | 상태 |
|----|------|------|------|
| 작성 공급자(조직) | `created_by_supplier_id` | **누가 만들었는가**(공급자 조직) 영구 SSOT | 🆕 이번 추가 |
| 작성 사용자 | `created_by` | 실제 작성한 user | 기존 |
| 원천 추적 | `source_ref_id` | **어디서 시작했는가**(offer 등) + AUTO-CREDIT legacy fallback | 기존(무변경) |
| 출처 유형 | `source_type` | supplier/operator/ai/… | 기존(무변경) |
| 검수자/시각 | `curated_by` / `curated_at` | 운영자 canonical 승격 흔적 | 기존(재사용) |
| 제출 시각 | `submitted_at` | 공급자가 검수 요청한 시각 | 🆕 이번 추가 |

→ **작성 주체 SSOT = `created_by_supplier_id`(공급자 조직) + `created_by`(user)**. `source_ref_id` 는 원천/legacy 축으로 유지되며 이번 변경으로 의미가 바뀌지 않는다.

## 2. created_by_supplier_id FK 대상

- **FK: `neture_suppliers(id)` ON DELETE SET NULL** (nullable).
- 근거: `supplier_product_offers.supplier_id` 와 동일한 공급자 축을 가리킨다. offer 삭제/재연결과 무관하게 작성 주체 attribution 을 보존한다.
- 엔티티는 plain uuid 컬럼(`createdBySupplierId: string | null`)만 두고 FK 는 DB 레벨(migration)에서 강제 — 기존 `created_by`/`curated_by` 와 동일 idiom(TypeORM 관계 미도입).

## 3. submitted_at 의미와 설정 시점

- 의미: 공급자가 STORE 설명서를 **운영자 검수로 제출(status→`needs_review`)한 시각**.
- 설정 시점: **후속 draft-save WO 의 공급자 create/submit 경로에서만 세팅.** 이번 WO 는 스키마만 추가하며 어떤 write 도 값을 넣지 않는다.
- 타입: `TIMESTAMP`(무 tz) — 동일 테이블 sibling(`curated_at`/`created_at`/`updated_at`)과 일치시켜 테이블 일관성 유지. (B1 디스패치 노트의 `timestamptz` 대신 sibling 정합을 택함 — 설계 IR §5.1 도 `timestamp`.)

## 4. migration 내용

파일: `apps/api-server/src/database/migrations/20270108000000-AddAuthorSubjectMetadataToSharedProductDescriptions.ts`

```sql
-- up
ALTER TABLE shared_product_descriptions
  ADD COLUMN IF NOT EXISTS created_by_supplier_id UUID
    REFERENCES neture_suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_shared_product_descriptions_created_by_supplier
  ON shared_product_descriptions (created_by_supplier_id)
 WHERE created_by_supplier_id IS NOT NULL;   -- partial: 대부분 null 이므로 소형 유지
```

- `down`: 인덱스 drop → 컬럼 drop(FK 동반 drop). 백필 없으므로 데이터 손실 0.
- 타임스탬프 `20270108000000` — 기존 최신(`20261231000000`) 이후. 순서 무관(독립 additive)이나 병렬 세션 충돌 회피 위해 distinctive 값 선택.

## 5. AUTO-CREDIT fallback 유지 여부 + 현재 read path

- **fallback 유지 ✅ — read path 이번 WO 에서 변경 없음.**
- 현재 supplier credit read path (`product-landing.service.ts` `resolveSupplierCredit`, 무변경):
  ```
  source_type='supplier' AND source_ref_id 존재
    → supplier_product_offers.id → supplier_id → neture_suppliers → organizations
    → 공개 허용 연락처만. 깨진 체인/비활성/이름없음 → null(본문 무영향)
  ```
- **`created_by_supplier_id` 우선순위 로직은 의도적으로 이번 WO 범위에서 제외.** 이유: 현재 이 컬럼을 세팅하는 write 가 없어(전량 null) 우선순위-1 조회가 dead code·테스트 불가. 후속 draft-save WO(값을 세팅하는 시점)에서 아래 우선순위로 도입 예정:
  ```
  1) created_by_supplier_id 있으면 그것으로 조회
  2) 없으면 source_type='supplier' + source_ref_id fallback (현행)
  3) 둘 다 없거나 불완전 → credit 생략
  ```
- 회귀 판정: 신규 컬럼은 read 경로 어디에서도 참조되지 않으므로 **기존 supplier credit·본문 조회 동작 불변**.

## 6. 기존 데이터 backfill

- **backfill 0.** 기존 SPD row 의 `created_by_supplier_id`/`submitted_at` = NULL 유지.
- 기존 SPD 수정 0 · canonical 상태 변경 0 · seed 경로 변경 0.

## 7. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/database/migrations/20270108000000-AddAuthorSubjectMetadataToSharedProductDescriptions.ts` | 🆕 마이그레이션(컬럼 2 + partial index + FK) |
| `apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts` | `createdBySupplierId` / `submittedAt` 컬럼 매핑 추가(additive) |
| `docs/checks/CHECK-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1.md` | 🆕 본 CHECK |

- 손대지 않음: `product-landing.service.ts`(fallback), `product-master-description.controller.ts`, `shared-product-description.service.ts`, `ProductMaster` 엔티티, canonical unique 인덱스, QR/tablet/landing, lockfile.

## 8. 검증 결과

| 항목 | 결과 |
|------|------|
| typecheck (`tsc --noEmit`) | 변경 파일 신규 에러 **0**. 잔존 20건은 전부 `src/scripts/drug-otc-*` 기존 baseline 에러(변수 재선언/중복 함수, 본 변경과 무관·pre-existing) |
| canonical unique 영향 | 없음 — 신규 컬럼은 `(master_id, description_type, COALESCE(language,'ko'))` 유니크 키 밖 |
| 기존 SPD 조회/저장 회귀 | 없음 — additive nullable, read/write 경로 미변경 |
| AUTO-CREDIT fallback 회귀 | 없음 — §5 |
| test | 스키마 additive·로직 무변경이라 신규 유닛테스트 없음. 기존 `product-landing.auth-gate.test.ts` 영향 없음(read path 불변) |
| build/DB migration 적용 | ⏳ push 시 CI/CD 자동 실행 — §9 |
| 배포 | ⏳ §9 |

## 9. commit / push / 배포 / migration 적용

- commit SHA: (본 커밋 — entity + migration + CHECK 동시)
- push: (아래 실행 결과 기록)
- 배포: main push → CI/CD 자동. api-server(`o4o-core-api`) 재배포 시 migration 자동 적용(CLAUDE.md §0 원칙).
- migration 적용 확인: 배포 후 Cloud Run 로그(`typeorm_migrations` 에 `AddAuthorSubjectMetadataToSharedProductDescriptions20270108000000` 기록) 또는 read-only 컬럼 존재 확인으로 검증 예정.

## 10. 다음 단계 (본 WO 범위 밖)

- 본체: `WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-V1` — 공급자용 create 엔드포인트가 이 컬럼(`created_by_supplier_id`/`submitted_at`)을 세팅 + AUTO-CREDIT 우선순위-1 도입.
- 하류: 운영자 SPD 검수 큐 재도입(Readiness IR B2).
