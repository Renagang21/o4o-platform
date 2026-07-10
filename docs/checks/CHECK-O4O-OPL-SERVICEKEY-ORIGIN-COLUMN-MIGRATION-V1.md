# CHECK-O4O-OPL-SERVICEKEY-ORIGIN-COLUMN-MIGRATION-V1

> **WO**: `WO-O4O-OPL-SERVICEKEY-ORIGIN-COLUMN-MIGRATION-V1` (축 분리 1단계)
> **성격**: `organization_product_listings` 에 `origin_service_key`(nullable) 컬럼만 추가하는 순수 additive migration.
> **완료 기준**: 컬럼이 추가되어도 기존 동작이 바뀌지 않는다.
> **날짜**: 2026-07-10 · **상태**: 구현·검증 완료 (프로덕션 적용은 배포 CI/CD)

---

## 1. 수행 내용 (오직 이것만)

- 신규 migration: [20261231000000-AddOriginServiceKeyToOrganizationProductListings.ts](../../apps/api-server/src/database/migrations/20261231000000-AddOriginServiceKeyToOrganizationProductListings.ts)

```sql
-- up
ALTER TABLE organization_product_listings
  ADD COLUMN IF NOT EXISTS origin_service_key VARCHAR(50) DEFAULT NULL;
-- down
ALTER TABLE organization_product_listings
  DROP COLUMN IF EXISTS origin_service_key;
```

- 타입 = `service_key`(varchar 50) 동일 도메인. nullable, `DEFAULT NULL`.
- PostgreSQL 에서 `ADD COLUMN ... DEFAULT NULL` 은 메타데이터 변경(테이블 재작성·row 업데이트 없음).

## 2. WO 제약 준수 (금지사항 — 모두 미수행)

- [x] 기존 row **UPDATE 없음** (migration 에 UPDATE 문 자체가 없음. DEFAULT NULL → 기존 행은 NULL 로 읽힐 뿐 값 변경 아님)
- [x] `service_key` **재태깅 없음**
- [x] `deriveListingServiceKey` **수정 없음**
- [x] 공개 B2C/Tablet/GP/KPA query **수정 없음**
- [x] `resolveServiceKeys` **수정 없음**
- [x] event-offer flow **수정 없음**
- [x] 테스트 데이터 **생성 없음**
- [x] 인덱스/제약 **무변경** (컬럼 ADD 만)

## 3. 검증 결과

### 3-A. 코드
- [x] migration 생성 완료.
- [x] migration glob 확인: 프로덕션 `dist/database/migrations/*.js`, dev `src/database/migrations/*.ts` ([connection.ts:97](../../apps/api-server/src/database/connection.ts#L97)) → 빌드 후 CI/CD 가 자동 적용.
- [x] **api-server 배포 빌드 타입체크 EXIT 0** (`tsc -p tsconfig.build.json --noEmit`).
- [x] 전체 monorepo 빌드 EXIT 0 (pull 직후 `pnpm run build`).

### 3-B. 유니크 키 (origin_service_key 미포함 확인)
현재 `organization_product_listings` 유니크 인덱스 = 다음 3개뿐이며 **어느 것도 origin_service_key 를 포함하지 않는다.** migration 은 이들을 건드리지 않는다.

| 인덱스 | 정의 |
|--------|------|
| `organization_product_listings_pkey` | `(id)` |
| `idx_org_listing_unique_v2` | `UNIQUE (organization_id, service_key, offer_id)` |
| `idx_org_listing_unique_master` | `UNIQUE (organization_id, service_key, master_id) WHERE offer_id IS NULL` |

- [x] 기존 유니크 인덱스 유지 (migration 이 인덱스 DDL 을 전혀 수행하지 않음).
- [x] `origin_service_key` 는 어떤 유니크 키에도 포함되지 않음 (컬럼만 추가하므로 구조적으로 보장).

### 3-C. 프로덕션 baseline (배포 전 스냅샷)
Cloud SQL Auth Proxy v2 (127.0.0.1:5433) + `gcloud auth print-access-token` 으로 **read-only** 확인:

- **OPL 행 수: 10** (WO 의 "기존 10건" 일치)
- **`origin_service_key` 컬럼: 존재하지 않음** (배포 전 기대값 = false, 확인됨)
- UNIQUE 인덱스 = 위 3개 (실측 일치)
- 10건 전부 `service_key = 'neture'`, `offer_id = NULL` (master 기반 listing). id 접두: `afa5289d / 2aeb8e06 / 4ce2c400 / d4e2e64b / 41d18284 / 45dacf53 / 4b0efcfd / d41fe704 / df02c392 / 090d5405`

## 4. 배포 후 검증 (CI/CD 적용 후 재확인용 SQL)

```sql
-- (1) 컬럼 추가·타입·nullable 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name='organization_product_listings' AND column_name='origin_service_key';
-- 기대: varchar, YES, NULL

-- (2) 기존 10건 불변 — 행 수·service_key 그대로, origin_service_key 전부 NULL
SELECT count(*) AS total,
       count(*) FILTER (WHERE service_key='neture') AS neture,
       count(*) FILTER (WHERE origin_service_key IS NULL) AS origin_null
FROM organization_product_listings;
-- 기대: 10 / 10 / 10

-- (3) 유니크 인덱스 3개 그대로 (origin_service_key 미포함)
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename='organization_product_listings' AND indexdef ILIKE '%UNIQUE%';
```

## 5. 결론

`origin_service_key` 는 값을 담을 **빈 그릇(nullable 컬럼)** 으로만 추가되었고, 어떤 쿼리·로직·인덱스·데이터도 바뀌지 않는다. **완료 기준(기존 동작 무변경) 충족.** origin 값 채우기·축 분리 소비 로직은 후속 WO(2단계 이후) 범위.
