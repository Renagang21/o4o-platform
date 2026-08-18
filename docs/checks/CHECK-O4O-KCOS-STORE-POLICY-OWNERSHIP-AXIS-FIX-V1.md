# CHECK-O4O-KCOS-STORE-POLICY-OWNERSHIP-AXIS-FIX-V1

- **WO**: `WO-O4O-KCOS-STORE-POLICY-OWNERSHIP-AXIS-FIX-V1`
- **일자**: 2026-08-18
- **기준 commit**: `eb62f361e` (WO-O4O-STORE-SLUG-CANONICAL-CONTRACT-HARDENING-V1)
- **대상**: `/api/v1/stores/:slug/*` (store-policy) 매장 소유권 판정 축
- **DB write**: 0 (production read-only 검증만)

---

## 1. 결론

K-Cosmetics 매장 소유권 판정이 **매장 PK 축(`cosmetics.cosmetics_stores.id`)** 으로 되어 있어
**organization 축(`organizations.id`)** 인 실제 계약과 어긋나 있었다. 실제 증상은 WO 가 추정한
403 이 아니라 **500 INTERNAL_ERROR** 였다 — 대조 대상 컬럼(`created_by_user_id`)이
`cosmetics.cosmetics_stores` 에 **존재하지 않아** 판정 쿼리 자체가 실패했기 때문이다.

같은 라우터에서 `kpa` / `pharmacy-hub` 는 판정 분기 자체가 없어(`if (!query) return false`)
활성 slug 13건 전부가 항상 403 이었다.

→ 판정을 이미 운영 중인 공통 계약(`utils/store-owner.utils.ts` + `utils/store-organization.resolver.ts`)
으로 통일했다. 새 SQL·새 id 매핑·새 테이블 없음. API route / 응답 payload 무변경.

---

## 2. ownership axis census (미조사 0)

`/api/v1/stores` 마운트(`bootstrap/register-routes.ts:326`) 라우트 9개.
`resolveAndAuthorize()` 가 넘기는 `storeId` 는 항상 `platform_store_slugs.store_id` 다.

| route | 입력 id | 조회 table (구) | 비교 대상 id (구) | canonical axis | 현재 결과(수정 전) |
|---|---|---|---|---|---|
| `GET /:slug/policies` (public) | slug | `platform_store_slugs` → `store_policies` | — | organizations.id | 200 (소유권 판정 없음) |
| `PUT /:slug/policies` | slug→store_id | `cosmetics_stores`(cosmetics) | 매장 PK | organizations.id | KCos 500 |
| `GET /:slug/payment-config` | 〃 | 〃 | 〃 | 〃 | KCos 500 |
| `PUT /:slug/payment-config` | 〃 | 〃 | 〃 | 〃 | KCos 500 |
| `POST /:slug/channels/b2c/activate` | 〃 | 〃 | 〃 | 〃 | KCos 500 |
| `POST /:slug/channels/b2c/deactivate` | 〃 | 〃 | 〃 | 〃 | KCos 500 |
| `GET /:slug/slug/can-change` | 〃 | 〃 | 〃 | 〃 | KCos 500 |
| `PUT /:slug/slug` | 〃 | 〃 | 〃 | 〃 | KCos 500 |
| `GET /resolve/:slug` (public) | slug | `platform_store_slugs` | — | — | 200 |

서비스별 판정 분기(구):

| slug service_key | 분기 존재 | 조회 table | 비교 id | 결과 |
|---|:---:|---|---|---|
| `cosmetics` | O | `cosmetics.cosmetics_stores` | 매장 PK + 없는 컬럼 | **500** |
| `glycopharm` | O | `organizations` | `organizations.id` (생성자) | 축 일치 (활성 slug 0건) |
| `kpa` | **X** | — | — | **항상 403** (활성 slug 7건) |
| `pharmacy-hub` | **X** | — | — | **항상 403** (활성 slug 6건) |
| `neture` | X | — | — | 403 (매장 소유 축 없음 — 정상) |

`ctx.storeId` 하위 소비처는 모두 organization 축이다 — `organization_channels.organization_id`,
`store_policies.store_id`, `payment_configs.store_id`, `slugService.changeSlug({storeId})`.

---

## 3. production 재현 (read-only)

Cloud SQL Proxy 실측 (`platform_store_slugs` 활성 15건):

| 확인 | 결과 |
|---|---|
| cosmetics slug 2건의 `store_id` 가 `cosmetics_stores.id` 와 일치 | **0건** |
| 〃 `cosmetics_stores.organization_id` 와 일치 | **2건 (전부)** |
| `cosmetics.cosmetics_stores` 의 `created_by_user_id` 컬럼 | **없음** (42703) |
| `organizations.created_by_user_id` NULL | 24건 중 11건 |
| 활성 slug service_key 분포 | cosmetics 2 / kpa 7 / pharmacy-hub 6 (glycopharm 0) |

HTTP 실측 (`api.neture.co.kr`, 계정 = `renagang21@gmail.com`, 조직 `테스트 뷰티샵` owner):

| 요청 | 수정 전 |
|---|---|
| `GET /stores/테스트-뷰티샵/policies` (public) | 200 |
| `GET /stores/테스트-뷰티샵/payment-config` (owner) | **500 INTERNAL_ERROR** |
| `GET /stores/테스트-뷰티샵/slug/can-change` (owner) | **500 INTERNAL_ERROR** |
| `GET /stores/test-kcos-store-owner/payment-config` (비소유자) | **500** (403 이어야 함) |
| `GET /stores/네뚜레-약국/payment-config` (KPA owner) | **403** |
| `GET /stores/네뚜레-약국/slug/can-change` (KPA owner) | **403** |

→ 오귀속이 아니다. 축 불일치가 실재하며, 비소유자조차 정상 403 을 받지 못했다.

---

## 4. canonical ownership 계약

```
User → role_assignments({service}:store_owner)          ← 권한 SSOT
     → organization_members(owner/admin/manager, left_at IS NULL)
     → organization_service_enrollments / platform_store_slugs 로 서비스 귀속 확인
     → Organization(organizations.id)                    ← store-policy 판정 축
     → (필요 시) cosmetics_stores.organization_id → Cosmetics Store PK
```

store-policy 는 **organization 단위 정책**이다(정책·결제설정·B2C 채널·slug 모두 organization 축).
따라서 판정 축은 `organizations.id` 이며, 매장 PK 로의 변환은 이 라우터에서 필요하지 않다.

---

## 5. 수정 내역

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/routes/platform/store-policy.ownership.ts` (신규) | 소유권 판정 분리. ① role 게이트 = `store-owner.utils.isStoreOwner` ② 조직 후보 = `store-organization.resolver.findStoreOrganizationCandidates` ③ 후보 집합에 `storeId` 포함 여부. slug service_key → store_owner serviceKey 매핑은 `STORE_SERVICE_ORG_LINKAGE.slugKeys` 를 **역으로 파생**(새 로컬 맵 금지). glycopharm 은 기존 `organizations.created_by_user_id` 축을 legacy fallback 으로 유지 |
| `apps/api-server/src/routes/platform/store-policy.routes.ts` | 로컬 raw-SQL `isStoreOwner` 제거 → 위 모듈 import. 라우트·응답 payload·상태코드 무변경 |
| `apps/api-server/src/__tests__/store-policy-ownership-axis.spec.ts` (신규) | 회귀 테스트 9건 |

- 분리 이유: 라우터는 `@o4o/platform-core/*` subpath 를 import 해 jest 에서 로드할 수 없다.
  판정만 떼어내면 회귀 테스트가 가능하고, 축 정의가 한 곳에만 남는다.
- `resolveStoreOrganization()`(단일 선택 + ambiguous 차단) 대신 후보 집합 대조를 쓴 이유:
  대상 매장이 slug 로 이미 특정되어 있어 임의 선택 위험이 없고, 같은 서비스 매장을
  2개 이상 가진 정상 소유자를 ambiguous 로 오차단하지 않기 위해서다.

---

## 6. 403 / 404 계약

| 상황 | 결과 |
|---|---|
| 존재하는 store + 정상 소유자 | 200 |
| 존재하는 store + 비소유자 | **403 FORBIDDEN** (수정 전 KCos 는 500) |
| 존재하지 않는/비활성 slug | 404 STORE_NOT_FOUND (구 slug 는 301 — 기존 계약 유지) |
| 매장 소유 축이 없는 서비스(neture) | 403 (판정 쿼리 0회) |
| 미인증 | 401 |

정책 자체는 재설계하지 않았다.

---

## 7. 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (apps/api-server) | PASS |
| 신규 회귀 spec | 9/9 PASS |
| store-owner / store-slug / store-policy 관련 7 suite | 83/83 PASS |
| api-server 전체 Jest | **142 suite / 2246 test PASS** |
| production write | 0 |

회귀 케이스: KCos 소유자 자기 매장 PASS / 다른 KCos 매장 403 / **매장 PK(`cosmetics_stores.id`)로는 절대 통과 불가**
(`organization.id != cosmetics_stores.id` 강제 fixture) / role 없으면 조직 조회 없이 차단 /
같은 서비스 조직 2개여도 slug 특정 매장이면 통과 / kpa·pharmacy-hub 동일 축 판정 / glycopharm legacy 유지 / neture 판정 제외.

---

## 8. 잔존 위험

1. **kpa / pharmacy-hub 접근 복구는 KCos 범위를 넘는 변화다.** 공통 계약으로 통일한 결과
   두 서비스의 정상 매장 소유자가 store-policy 에 진입할 수 있게 됐다(기존 = 항상 403).
   권한 축소가 아니라 복구이며, 축소를 원하면 별도 WO 로 되돌릴 수 있다.
2. `glycopharm` legacy `created_by_user_id` 축을 유지했다. `organizations.created_by_user_id`
   는 24건 중 11건 NULL 이고 활성 glycopharm slug 는 0건 — 실질 소비 없음. 정리는 별도 WO.
3. `cosmetics.cosmetics_stores.slug` 레거시 컬럼(1건 NULL)은 이번에도 손대지 않았다(§10 금지).
4. store-policy 프론트 소비처가 없거나 적어 사용자 관측 리포트가 존재하지 않는다 —
   본 CHECK 는 API 계층 실측만으로 판정했다.

---

## 9. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(위 잔존 위험 1·2).
