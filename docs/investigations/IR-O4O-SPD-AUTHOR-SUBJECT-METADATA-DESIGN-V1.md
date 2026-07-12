# IR-O4O-SPD-AUTHOR-SUBJECT-METADATA-DESIGN-V1

> 성격: **read-only 조사/설계(IR)**. 코드/스키마/마이그레이션/DB write 없음.
> 상위 근거: [`IR-...-QR-TABLET-FLOW-AUDIT-V1`](IR-O4O-NETURE-SUPPLIER-STORE-CONTENT-QR-TABLET-FLOW-AUDIT-V1.md) · [`DECISION-...-D1-D4-V1`](DECISION-O4O-NETURE-SUPPLIER-STORE-CONTENT-D1-D4-V1.md)
> 대응 후속 WO(초안): `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1`
> 작성일: 2026-07-12 · 상태: 설계안 도출(구현 승인 대기)

## 0. 목적

D1 확정에 따라 "공급자가 작성하는 매장용 설명서"는 `description_type=STORE` + **작성 주체 메타데이터**로 구분한다. 본 IR은 그 메타데이터를 `shared_product_descriptions`(SPD)에 어떻게 최소·정합적으로 추가할지 **설계**한다(구현 아님).

핵심 질문: **"이 STORE 설명서를 누가 작성했고, 누가 검수했는가"를 조인 없이 표현하려면 어떤 컬럼이 최소로 필요한가.**

## 1. 현재 SPD 컬럼 (엔티티 기준)

`apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts`

| 컬럼 | 타입 | 의미 |
|------|------|------|
| `master_id` | uuid | ProductMaster 키(canonical 축) |
| `content` / `summary` | text | 본문/요약(HTML) |
| `source_type` | varchar(32) | 출처 유형: `supplier\|operator\|ai\|store_contribution\|drug_extension\|mfds_*\|migration\|manual` (`:34-55`) |
| `description_type` | varchar(32), def `STORE` | `B2B\|B2C\|STORE\|SUPPLIER_STORE`(SUPPLIER_STORE deprecated) |
| `source_ref_id` | uuid, null | 출처 레코드 id(offer_id/ai_content_id 등) |
| `status` | varchar(32), def `candidate` | `candidate\|canonical\|hidden\|needs_review\|deprecated` |
| `language` | varchar(16), def `ko` | 언어 |
| `quality_score` | numeric, null | 품질 점수 |
| `curated_by` / `curated_at` | uuid / ts, null | **큐레이션(=canonical 승격) 흔적** |
| `created_by` / `updated_by` | uuid, null | **작성/수정 user id(역할·주체 세분 없음)** |
| `created_at`/`updated_at`/`deleted_at` | ts | 표준 |

관찰:
- **작성 주체 = `created_by`(user uuid)만.** 역할(supplier/operator/admin)·공급자 id는 없음 → "이 설명서를 어떤 공급자가 썼나"는 `created_by(user)→users→neture_suppliers.user_id` **조인 필요**.
- **검수 흔적은 부분 존재**: `setCanonical(id, actorId)`가 `curated_by`/`curated_at`를 세팅(`shared-product-description.service.ts:251`). 즉 **canonical 승격자 = curated_by**. 단 "제출 시각", "거절자", "역할"은 없음.

## 2. write 경로가 현재 세팅하는 값

`shared-product-description.service.ts`
- `createCandidate(input)`(`:191`): `createdBy = input.createdBy`, `updatedBy = input.createdBy`. `source_type`/`description_type`/`status`/`language` 등 input 그대로. **역할·supplier_id 미세팅.**
- `setCanonical(id, actorId)`(`:223`): `curatedBy = actorId`, `curatedAt` = now(트랜잭션), 같은 언어 기존 canonical 강등.
- `setStatus(id, status, actorId)`(`:259`): 상태 변경 시 actor 기록.
- seed 경로(`seedFromSupplierOffers` 등, `:351/387/444`): `createdBy = actorId`, `source_type='supplier'` 등. **supplier offer가 근거지만 supplier_id를 SPD에 남기지 않음**(source_ref_id=offer_id만).

## 3. 명명 선례 (재사용할 것)

`ProductCandidateDescriptionDraft.entity.ts`(master 없는 후보 draft 풀)는 이미 리뷰 메타 관례를 갖는다:
- `review_status`(`draft|needs_review|approved|rejected|hidden|deprecated`), `review_flags` text[], `reviewed_by`(uuid), `reviewed_at`(ts), `generated_at`.
- ESM 규칙: **varchar + application-level union(DB enum 금지)**, `@ManyToOne('Entity', ...)` 문자열 관계, 구조 보존용 nullable.

→ SPD 신규 컬럼도 이 관례(스네이크 컬럼명, varchar union, nullable, 문자열 관계)를 따른다.

## 4. 공급자 STORE 흐름이 요구하는 메타데이터

DECISION D1/D2 기준 필요한 사실:
```
누가 작성했나   : 역할(supplier/operator/admin/store/ai) + (공급자면) 어떤 공급자
언제 제출했나   : 공급자가 검수 요청한 시각
누가 검수했나   : 운영자 + 시각 (canonical 승격/거절)
```

### 4.1 기존 컬럼으로 커버되는 부분
| 필요 | 기존 컬럼 | 충분한가 |
|------|-----------|:---:|
| 작성 역할(대략) | `source_type`(supplier/operator/ai…) | △ 부분 — 데이터-출처(mfds/migration)와 행위자 역할이 섞임, admin/store 구분 없음 |
| 작성 user | `created_by` | ○ (단, user→supplier 조인 필요) |
| 검수자/승격 시각 | `curated_by`/`curated_at` | ○ canonical 승격에 한해 충분(거절 추적은 없음) |

### 4.2 진짜 갭 (신규 필요)
1. **`created_by_supplier_id`** (uuid, null) — "어떤 공급자가 작성" 을 조인 없이. 공급자 대시보드 "내 설명서" 필터·소유권 검증의 핵심. `neture_suppliers.id` 참조(단방향, `onDelete SET NULL`).
2. **`submitted_at`** (ts, null) — 공급자가 검수 요청(status→`needs_review`)한 시각. D2 검수 큐 정렬/SLA용.
3. (선택) **`created_by_role`** (varchar(16), null) — `supplier|operator|admin|store|ai|system`. `source_type`와 부분 중복이나, **행위자 역할 축을 명시**해 admin/operator/store 구분·권한 판정에 사용. 중복이 부담이면 1차에서 생략하고 `source_type`로 대용 가능(§6 결정).

### 4.3 검수 추적 — 재사용 vs 신규 (결정 포인트)
- **옵션 R1 (재사용, 권장 1차)**: 검수=canonical 승격이면 기존 `curated_by`/`curated_at`를 "검수자/검수시각"으로 사용. 신규 컬럼 0.
- **옵션 R2 (신규)**: 거절(rejected)·반려까지 추적하려면 `reviewed_by`/`reviewed_at`(+`review_flags`)를 sibling(draft) 관례대로 추가. 승격과 거절을 분리 기록.
- 1차 범위(진입점+초안 저장)에서는 거절 UI가 없으므로 **R1로 충분**. 거절/반려 흐름 도입 시 R2로 확장.

## 5. 최소 설계안 (권장)

> 아래는 **설계 제안**이다. 실제 컬럼 추가는 승인된 구현 WO에서 수행한다.

### 5.1 1차 최소 컬럼 (필수)
```
created_by_supplier_id  uuid       null   -- neture_suppliers.id (단방향, onDelete SET NULL)
submitted_at            timestamp  null   -- 공급자 검수 요청 시각
```
- 검수자/시각 = 기존 `curated_by`/`curated_at` 재사용(R1).
- 역할 = 기존 `source_type` 재사용(supplier 여부는 이걸로 충분).

### 5.2 2차 확장 후보 (필요 시)
```
created_by_role   varchar(16)  null   -- supplier|operator|admin|store|ai|system (행위자 축 명시)
reviewed_by       uuid         null   -- 거절 포함 검수자(승격과 분리 기록, R2)
reviewed_at       timestamp    null
review_flags      text[]       '{}'   -- 빠른 필터(sibling 관례)
```

### 5.3 엔티티/마이그레이션 원칙 (조사 결과)
- **ESM**: 관계는 `@ManyToOne('NetureSupplier', ...)` 문자열, `import type`만. varchar union(DB enum 금지).
- **nullable 필수**: 기존 row 백필 없이 안전 추가. 이번 흐름에선 **backfill 안 함**(기존 SPD는 supplier_id null 유지).
- **인덱스**: 공급자 "내 설명서" 조회용 `idx_spd_created_by_supplier (created_by_supplier_id)` 부분 고려. canonical partial unique(`(master_id, description_type, COALESCE(language,'ko')) WHERE status='canonical'`)는 **영향 없음**(신규 컬럼은 유니크 키 밖).
- **마이그레이션은 CI/CD 자동 실행 원칙**(CLAUDE.md §0). 수동 DB write 금지.

## 6. 결정 포인트 (구현 WO 전 확정)

| # | 결정 | 권장 |
|---|------|------|
| M1 | `created_by_role` 신규 vs `source_type` 재사용 | 1차 생략(source_type 재사용), 2차 필요 시 추가 |
| M2 | 검수 추적 `curated_*` 재사용(R1) vs `reviewed_*` 신규(R2) | 1차 R1 재사용(거절 UI 도입 시 R2) |
| M3 | `created_by_supplier_id` FK 관계로 둘지 순수 uuid 컬럼으로 둘지 | 단방향 `@ManyToOne('NetureSupplier')` + `onDelete SET NULL` |
| M4 | 백필 여부 | **안 함**(기존 row null 유지, 신규 write부터 세팅) |

## 7. write/read 소비처 영향 (구현 시 손댈 지점 — 목록만)

- write: `createCandidate` input에 `createdBySupplierId`/`submittedAt` 추가 세팅(공급자 초안 저장 WO에서). 기존 seed 경로는 미변경(null 유지).
- read: 공급자 "내 매장용 설명서" 목록(신규, 후속 WO), 운영자 검수 큐(`listForReview`에 supplier_id/submitted_at 노출). 공개 랜딩(`/p`)은 **영향 없음**(STORE canonical만 읽음).

## 8. 이번 IR 산출 요약

- SPD 작성자/검수 메타는 **`created_by`(user)+`curated_by/at`(승격)** 만 존재 → **공급자 식별·제출시각 갭**.
- 최소 추가 = `created_by_supplier_id` + `submitted_at`(2컬럼). 역할·검수자는 기존 컬럼 재사용으로 시작.
- 후속: `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1`(스키마 추가, 승인 필요) → 이후 `WO-O4O-PRODUCT-CONTENT-STORE-SUPPLIER-DRAFT-V1`(초안 저장이 이 컬럼을 세팅).

## 9. 제약·비고

- read-only. 스키마/마이그레이션/DB write 없음.
- 실데이터(기존 SPD의 source_type/description_type/status 분포, supplier-origin row 수)는 Laptop DB 차단으로 미확인 → Cloud Console read-only 권장:
  `SELECT source_type, description_type, status, count(*) FROM shared_product_descriptions GROUP BY 1,2,3 ORDER BY 1,2,3;`
</content>
