# WO-O4O-AUTO-LISTING-PARAM-TYPE-FIX-V1 — 신규 조직 자동 목록화 SQL 파라미터 타입 오류 수정

> **상태**: DRAFT · **등록일**: 2026-10-16 · **우선순위**: 높음 (실제 PostgreSQL 재현 확인)
> **발견 경로**: [`CHECK-O4O-SUPPLIER-REGISTRATION-PUBLICATION-SEPARATION-V1`](../checks/CHECK-O4O-SUPPLIER-REGISTRATION-PUBLICATION-SEPARATION-V1.md) §7-3 (PR #659)

## 1. INITIAL_PURPOSE

신규 조직 생성 시 실행되는 PUBLIC·SERVICE 자동 목록화가 실제 PostgreSQL 에서 항상 실패하는 결함을 수정하고, 두 경로를 실제 DB 로 검증한다.

## 2. 문제

`apps/api-server/src/utils/auto-listing.utils.ts`

- `autoListPublicProductsForOrg(dataSource, organizationId, serviceKey)`
- `autoListServiceProductsForOrg(dataSource, organizationId, serviceKey)`

두 함수 모두 `INSERT INTO organization_product_listings (...) SELECT ..., $2, ...` 의 select list 와
`drugAudienceSqlConditionForOrg` 의 `sap.service_key = $2` 에서 같은 파라미터 `$2` 를 쓴다.
PostgreSQL 은 select list 의 `$2` 를 `text`, 비교식의 `$2` 를 `character varying` 으로 추론하므로 SQL 이 정적으로 실패한다.

```text
QueryFailedError: inconsistent types deduced for parameter $2
DETAIL: text versus character varying
```

재현:

- canonical baseline + 전체 incremental 을 적용한 전용 fixture DB(`scripts/dev/run-supplier-store-fixture.ts`)에서 두 함수 호출 시 실패.
- 최소 SQL 재현: `INSERT INTO l(service_key) SELECT $1 WHERE EXISTS (SELECT 1 FROM p WHERE p.service_key=$1)` (두 컬럼 모두 `varchar(50)`) → 같은 오류.
- 파라미터 값·데이터와 무관하게 매 호출 실패한다(의약품 여부 분기와 무관).

## 3. 소비처·운영 영향

- 유일한 runtime 호출처: `apps/api-server/src/routes/kpa/controllers/organization.controller.ts` 신규 조직 생성(`KPA_CANONICAL_SERVICE_CODE`).
  - 두 호출 모두 fire-and-forget `.catch(console.warn)` 이므로 조직 생성 응답(201)은 성공하고 자동 목록화만 조용히 누락된다.
- 운영 로그 read-only 조회(2026-10-16, `o4o-core-api`, 보존 기간 30일):
  - `[OrgCreate] Auto-listing failed` · `[OrgCreate] SERVICE auto-listing failed` · `[AutoListing] Failed to list` 0건.
  - `[OrgCreate]` 로그도 0건. 결함이 결정적이므로 최근 30일 안에는 이 경로 호출이 없었던 것으로 추정한다.
  - 30일 이전 영향은 로그로 판정할 수 없다. 이 결함이 들어온 시점 이후 이 경로로 생성된 조직에 누락된 PUBLIC/SERVICE listing 이 있는지 별도 read-only census 가 필요하다.

## 4. CONFIRMED_DECISIONS (수정 방향)

- SQL 의미는 바꾸지 않는다. 파라미터 타입을 명시해 추론 충돌만 제거한다 (예: `$2::varchar` 를 select list·비교식 모두에 일관 적용, 또는 단일 타입 cast).
- 같은 파일의 `autoExpandPublicProduct`·`autoExpandServiceProduct` 등 다른 함수에 동일 패턴이 있는지 함께 점검하고, 있으면 같은 WO 에서 수정한다.
- 의약품 약국 대상 서비스 제한(`drugAudienceSqlConditionForOrg`)·`ON CONFLICT ... WHERE service_key <> 'neture-event-offer'` predicate 는 유지한다.

## 5. DONE_CRITERIA

- [ ] PUBLIC·SERVICE 두 경로 수정.
- [ ] 실제 PostgreSQL 회귀: 전용 fixture 에서 두 함수가 성공하고, 다음을 검증한다.
  - APPROVED+PUBLIC+ACTIVE 공급자 offer 는 PUBLIC 경로로 listing 생성(비활성 `is_active=false`).
  - SERVICE offer 는 `offer_service_approvals` 승인 행이 있을 때만 생성, 없으면 미생성.
  - 의약품 master 는 약국 대상 서비스 정책이 없으면 제외.
  - 재호출 멱등(ON CONFLICT).
  - 음성 대조: 수정 전 SQL 로 같은 테스트가 실패함을 확인.
- [ ] 기존 단위 테스트(mock 기반)로는 이 결함을 잡지 못했으므로 실제 DB 테스트를 추가한다.
- [ ] 운영 영향 census(read-only): 결함 도입 이후 생성된 조직 중 자동 목록화 대상인데 listing 이 없는 건수. 누락 보정(backfill)이 필요하면 데이터 write 이므로 별도 승인 후 진행한다.
- [ ] 관련 API Jest·tsc·lint PASS, CHECK 작성.

## 6. OUT_OF_SCOPE

- 자동 목록화 정책 자체(대상 범위·노출 기준) 변경.
- 누락분 backfill 실행(별도 승인 필요).
- 공급자 등록·게시 분리(#652) 계약 변경.

## 7. 실행 경계

- 개발 담당은 전용 worktree/branch 에서 수정·검증·commit·push 후 인계한다. PR 통합·배포는 지정된 통합 담당이 수행한다.
- 운영 DB 는 read-only 조회만. 운영 write·migration 없음 예상(코드 SQL 수정만).
