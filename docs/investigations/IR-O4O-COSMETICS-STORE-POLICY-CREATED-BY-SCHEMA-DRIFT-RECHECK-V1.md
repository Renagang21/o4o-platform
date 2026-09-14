# IR-O4O-COSMETICS-STORE-POLICY-CREATED-BY-SCHEMA-DRIFT-RECHECK-V1

> **종류**: 조사 전용(IR) · 코드/스키마/데이터 변경 0
> **조사일**: 2026-09-14
> **발단**: [`IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1`](IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1.md) §9 범위 외 관찰 — 프로덕션 stderr 에 `column "created_by_user_id" does not exist` ×6 (2026-08-18, `SELECT 1 FROM cosmetics.cosmetics_stores WHERE id = $1 AND created_by_user_id = $2`, `[StorePolicyRoutes] GET /:slug/payment-config` · `/:slug/slug/can-change`)

## 1. 결론

**이미 해결된 오류 — 재현 불가. lifecycle 정비에 앞서 처리할 것 없음.**

```
ERROR_STILL_PRESENT      = NO
FIXED_BY_PRIOR_CHANGE    = c84a321d3 (2026-08-18, WO-O4O-KCOS-STORE-POLICY-OWNERSHIP-AXIS-FIX-V1)
REGRESSION_GUARD         = apps/api-server/src/__tests__/store-policy-ownership-axis.spec.ts (`not.toContain('created_by_user_id')`)
RECENT_LOG_OCCURRENCE    = 0 (최근 14일 · 최신 revision o4o-core-api-03648-vrb 포함)
USER_IMPACT_NOW          = NONE
FOLLOW_UP_WO             = NONE
```

## 2. 확인 항목

| 항목 | 결과 |
|---|---|
| 현재 route/query 존재 여부 | `apps/api-server/src/routes/platform/store-policy.ownership.ts` 의 `isStoreOwner` 는 organizations 축(`organization_members` · `role_assignments` · `service_memberships`)만 조회. `cosmetics.cosmetics_stores … created_by_user_id` 쿼리는 코드에 없음(주석으로 구 구현 설명만 남음, 49–52행) |
| 오류 발생 시각 vs 수정 시각 | 오류 6건 전부 2026-08-18 05:41–05:42 UTC. 수정 커밋 `c84a321d3` 동일 날짜 — 발견 즉시 수정된 사고 |
| 최근 30일 / 최신 revision | 30일 창에서는 8/18 6건만 존재. 최근 14일(9/1~9/14) 0건. 최신 revision 에서 0건 |
| 운영 API 재현 | 원인 쿼리가 코드에서 제거되어 재현 경로 없음(라이브 호출은 수행하지 않음 — 코드·로그 증거로 충분) |
| entity vs DB 컬럼 | `cosmetics.cosmetics_stores` 에 `created_by_user_id` 는 원래 없음(해당 컬럼은 `organizations` 소유, `20260221000000-OrgServiceModelNormalizationPhaseA`). 구 구현이 잘못된 축(매장 PK)에 잘못된 컬럼을 대조한 것이며 스키마 drift 가 아니라 **쿼리 오류** |
| 다른 세션 수정 여부 | 예 — `c84a321d3` + 후속 `0dc6b6c6c`(membership 게이트 계약 반영). 회귀 spec 이 소스에 `created_by_user_id` 문자열 부재를 강제 |
| 사용자 화면 영향 | 현재 없음 |

## 3. 판정

- 처분: **CLOSED_ALREADY_FIXED**. 별도 WO 불필요.
- 남는 `created_by_user_id` 참조는 `organizations.created_by_user_id`(실존 컬럼) 를 쓰는 `StoreConsoleController` · PharmacyHub 주석뿐이며 정상.

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건**
