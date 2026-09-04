# CHECK — WO-O4O-STORE-SLUG-RESERVESLUG-CENSUS-DRIFT-CLOSURE-V1

- **작성일**: 2026-09-04
- **기준 커밋**: `62c1fd6c7` (origin/main)
- **작업 브랜치**: `work/store-slug-reserveslug-census-drift-closure-v1`
- **성격**: main green 복구용 초소형 closure. 기능 변경 0 / schema 0 / migration 0 / 프로덕션 write 0

---

## 0. 문제

`apps/api-server/src/__tests__/store-slug-store-id-axis.spec.ts` 의 census 테스트
"reserveSlug 호출부 집합이 문서화된 8곳뿐이다" 가 **main 에서 실패**한다.

```text
+ "services/cafe24-b2b/Cafe24B2bStoreProvisioningService.ts",
```

원인은 `6d53fd1f2` (WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1) 이 Cafe24 매장
provisioning 에 slug 예약 경로를 추가하면서 census 를 갱신하지 않은 것이다.
이 census 는 **호출부가 조용히 늘면 깨지도록 설계된 가드**이므로, 실패 자체는 가드가
의도대로 동작한 결과다. 따라서 가드를 끄지 않고 **현재 사실로 갱신**한다.

> 본 drift 는 `WO-O4O-CROSS-SERVICE-MY-STORE-RUNTIME-CONTRACT-COMMONIZATION-V1`
> (PR #207) 과 무관하다. 해당 PR 은 `Cafe24B2bStoreProvisioningService.ts` 와
> `store-slug-store-id-axis.spec.ts` 를 건드리지 않았고, main merge 로 실패를
> **물려받았을 뿐**이다. 그래서 그 PR 안에서 고치지 않고 별도로 닫는다.

---

## 1. 재검색 — "8 → 9 한 줄"로 시작하지 않았다

`origin/main` `62c1fd6c7` 에서 `reserveSlug` 전체를 다시 세었다
(`apps` · `packages` · `services` · `scripts`, node_modules 제외).

**production 호출부 = 9 파일** (census 대상)

| # | 파일 | storeId 인자 |
|---|---|---|
| 1 | `routes/cosmetics/services/cosmetics-store.service.ts` (2 call) | `orgId` · `organizationId` |
| 2 | `routes/glycopharm/services/glycopharm-member.service.ts` | `organizationId` |
| 3 | `routes/glycopharm/controllers/admin.controller.ts` | `createdOrg.id` |
| 4 | `routes/glycopharm/controllers/store-applications.controller.ts` | `createdOrg.id` |
| 5 | `routes/glycopharm/services/glycopharm.service.ts` | `org.id` |
| 6 | `routes/kpa/controllers/organization.controller.ts` | `saved.id` |
| 7 | `routes/kpa/services/kpa-store-organization.provisioning.ts` | `orgResult.id` |
| 8 | **`services/cafe24-b2b/Cafe24B2bStoreProvisioningService.ts`** (신규) | `organizationId` |
| 9 | `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts` | `organizationId` |

census 대상이 **아닌** 참조(그대로 둔다):

- `packages/platform-core/.../store-slug.service.ts` — `reserveSlug` **정의부**
- `__tests__/**` 5 파일 — jest mock / 호출 단언 (spec 의 `collect()` 가 `__tests__` 를 건너뛴다)
- `store-slug-canonical-contract.spec.ts` — 정규식 문자열

→ **실제 모집단은 9곳이다.** 8 → 9 는 재검색 결과와 일치한다.

---

## 2. 신규 호출부가 canonical 인지 확인

`Cafe24B2bStoreProvisioningService.ensureSlug()` (line 358~) 는

```ts
const record = await slugService.reserveSlug({
  storeId: organizationId,   // ← line 243: organizationId = orgResult.id
  serviceKey: SERVICE_KEY,
  slug: generated,
});
```

`organizationId` 는 `organizationOpsService.ensureOrganizationWithOwnerAndService()` 가
돌려준 **`organizations.id`** 다 (line 231~243). 즉 spec 이 요구하는 canonical 축
(`platform_store_slugs.store_id = organizations.id`) 을 그대로 따르며,
`PharmacyHubStoreProvisioningService` 와 동형이다.

기존 조회도 같은 축으로 멱등 확인한다 — `WHERE store_id = $1 AND service_key = $2`.
FORBIDDEN 목록(`savedStore.id` · `store.id` 등 서비스 전용 PK)에 해당하지 않는다.

→ **축 위반 아님. census 갱신만이 올바른 조치다.** (호출부 코드는 수정하지 않았다.)

---

## 3. 변경

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/__tests__/store-slug-store-id-axis.spec.ts` | `EXPECTED` 에 Cafe24 호출부 1줄 추가 · 테스트 제목 `8곳` → `9곳` · 근거 주석 추가 |

**프로덕션 코드 변경 0.** 가드 완화 · `skip` · 임계 완화 없음.

---

## 4. 검증

| 항목 | 명령 | 결과 |
|---|---|---|
| `store-slug-*` spec | `pnpm --filter @o4o/api-server exec jest store-slug` | **PASS** — 3 suites / 36 tests |
| api-server 전체 Jest | `pnpm --filter @o4o/api-server exec jest` | **PASS** — 228 suites / 3822 tests, 실패 0 (288s) |

수정 전 main 상태는 `1 failed / 3838 passed` (`store-slug-store-id-axis.spec.ts`) 였다.
본 브랜치에서 실패 0 이 되었으므로 main green 복구 조건을 만족한다.

> 전체 수(3838 → 3822)가 다른 것은 base 커밋 차이다. 실패한 쪽 실행은 PR #207
> (main merge 포함) 브랜치에서, 이쪽은 `62c1fd6c7` 순수 main 에서 돌렸다.
> 두 실행 모두 census 실패 외 다른 실패는 없었다.

---

## 5. 잔여

- 없음. 본 closure 는 census 1건만 다룬다.
