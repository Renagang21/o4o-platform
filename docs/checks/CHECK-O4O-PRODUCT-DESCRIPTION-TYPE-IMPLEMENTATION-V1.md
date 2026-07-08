# CHECK-O4O-PRODUCT-DESCRIPTION-TYPE-IMPLEMENTATION-V1

Status: DONE — 코드 완료 + typecheck PASS + 배포 성공 + 프로덕션 DB/런타임 검증 PASS (2026-07-08)
WO: `WO-O4O-PRODUCT-DESCRIPTION-TYPE-IMPLEMENTATION-V1`
Baseline: [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md) (CLAUDE.md F12) — **첫 실제 구현.**

Scope: `shared_product_descriptions` 에 `description_type`(B2B/B2C/STORE/SUPPLIER_STORE) 축 도입. **설명서 타입 축 생성만** — 매장 선택 UI / 연결 테이블 / 공급업체 등록 화면은 후속.

---

## 1. 변경 파일 (커밋 `67d53eaa7`, 마이그레이션 rename 포함)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/database/migrations/20261223000000-AddDescriptionTypeToSharedProductDescriptions.ts` | 신규 마이그레이션 |
| `apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts` | `descriptionType` 컬럼 + `SharedProductDescriptionType` union + 상수 + `DEFAULT_SHARED_PRODUCT_DESCRIPTION_TYPE='STORE'` |
| `apps/api-server/src/modules/neture/services/shared-product-description.service.ts` | `getCanonical(descriptionType='STORE')` · `setCanonical` 강등을 같은 type 한정 · `createCandidate` 기본 STORE · 검토 응답에 `descriptionType` 포함 |
| `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` | 소비자 storefront + 태블릿 canonical join 에 `AND spd.description_type='STORE'` |
| `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts` | GP storefront canonical join 에 STORE 필터 |
| `apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts` | 콘텐츠 소스 목록(master-scope) canonical 에 STORE 필터. **id-scope 복사 쿼리(:562)는 불변** |

> 타임스탬프 충돌 회피: 병렬 세션이 `20261222000000-AddMediaAssetMetadata` 를 동시 생성 → 본 마이그레이션을 **20261223000000** 으로 상향.

## 2. 마이그레이션 내용

```sql
-- 1) DEFAULT 'STORE' 로 기존 전량 원자적 백필 + NOT NULL + 향후 insert 안전
ALTER TABLE shared_product_descriptions
  ADD COLUMN IF NOT EXISTS description_type VARCHAR(32) NOT NULL DEFAULT 'STORE';
-- 2) 안전검사: (master_id, description_type) canonical 중복 있으면 throw (자동삭제 금지)
-- 3) canonical partial unique 교체: (master_id) → (master_id, description_type)
DROP INDEX IF EXISTS uniq_shared_product_descriptions_canonical_per_master;
CREATE UNIQUE INDEX uniq_shared_product_descriptions_canonical_per_master_type
  ON shared_product_descriptions (master_id, description_type)
  WHERE status='canonical' AND deleted_at IS NULL;
-- 4) 조회 필터용 보조 인덱스
CREATE INDEX IF NOT EXISTS idx_shared_product_descriptions_master_desctype
  ON shared_product_descriptions (master_id, description_type);
```

## 3. 조회 기본값 STORE 적용 위치
- 서비스: `getCanonical()` 2번째 인자 기본 `STORE`; `createCandidate` 기본 `STORE`; `setCanonical` 강등 범위 `description_type = target.descriptionType`.
- Raw SQL (master-scope canonical = "그 대표설명"): storefront(store-public-utils) · 태블릿(store-public-utils) · GP storefront · store-content 소스목록 — 4곳 `AND description_type='STORE'`.
- **미적용(의도)**: `store-content.controller:562`(spd.id 로 특정 row 복사 — id-scope 유일). admin 검토 목록/상태 카운트(전 타입 관리 대상 — WO-2 에서 type-aware).

## 4. ProductMaster 무변경 확인 (Freeze #6)
- 마이그레이션은 `shared_product_descriptions` 만 ALTER. `product_masters` 무변경.
- FK 방향 = `shared_product_descriptions.master_id → product_masters.id` 그대로 (역방향 relation/FK 신설 없음).

## 5. typecheck
- api-server 변경 파일 **EXIT 0** (신규 에러 0). 병렬 세션 `drug-otc-nutrition-combo-*` 스크립트 에러는 본 변경과 무관·build 제외.

## 6. 배포 / 마이그레이션 결과
- 커밋 `67d53eaa7` push → **Deploy API Server (Cloud Run) `completed success`** (내 SHA).
- 마이그레이션 CI/CD 자동 실행.

## 7. 프로덕션 검증 (read-only, cloud-sql-proxy + o4o_platform)

| # | 항목 | 결과 |
|---|---|:---:|
| 1 | `description_type` 컬럼 | **PASS** — varchar, `NOT NULL`, `DEFAULT 'STORE'` |
| 2 | 기존 전량 STORE 백필 | **PASS** — **21,346행 전부 STORE** (단일 그룹) |
| 3 | NULL 잔여 | **PASS** — 0 |
| 4 | canonical unique 확장 | **PASS** — `uniq_..._canonical_per_master_type (master_id, description_type)` 존재, 구 `per_master` 제거, 보조 인덱스 생성 |
| 5 | (master, description_type) canonical 유일 | **PASS** — canonical 17,877건, key당 **최대 1개** |
| 6 | 런타임 무회귀 (수정 SQL 실행) | **PASS** — 수정된 `queryVisibleProducts`(`description_type='STORE'` 참조) 프로덕션 storefront GET **HTTP 200** |
| 7 | ProductMaster 무변경 | **PASS** — product_masters 미변경 |

### 무회귀 근거 (강함)
- **전량 STORE** 이므로 read 경로의 `AND description_type='STORE'` 필터는 현재 데이터에서 **수학적 no-op**(필터 전/후 결과 집합 동일).
- 추가로, **canonical(STORE) 보유 master 를 활성 listing 한 매장이 현재 0건**(17,877 canonical 은 아직 매장 미listing 카탈로그 master) → 현재 라이브 storefront 에 **관측 가능한 영향 0**.
- 런타임 storefront GET 200(위 #6)으로 컬럼 존재 + 수정 SQL 무오류 실행 확인.

### 확장성 검증 (구조)
- (master, description_type) unique 이므로 같은 master 에 **STORE + SUPPLIER_STORE canonical 각 1개 공존 가능**(#4 인덱스 정의로 증명).
- 같은 (master, 같은 description_type) canonical 중복은 partial unique index 로 차단(#5 key당 최대 1).
- (실 데이터 write 는 본 WO 범위 밖 — B2B/B2C/SUPPLIER_STORE 생성 안 함.)

## 8. 이번 WO 미포함 (후속)
매장 설명서 선택 UI / `store_product_description_selections` 테이블 / 공급업체 설명서 등록 / B2B·B2C·SUPPLIER_STORE 데이터 생성 / `/r/{id}` / QR / POP / Video / OSMU / AI 생성.

## 9. 완료 기준 체크
- [x] description_type 도입 · 전량 STORE 백필 · NOT NULL
- [x] canonical unique → (master_id, description_type)
- [x] 기존 조회 회귀 없음 (no-op 필터 + 런타임 200 + 라이브 영향 0)
- [x] ProductMaster 변경 없음 (Freeze #6)
- [x] typecheck PASS · 배포/마이그레이션 적용 확인
- [x] CHECK 작성 · commit/push 완료
