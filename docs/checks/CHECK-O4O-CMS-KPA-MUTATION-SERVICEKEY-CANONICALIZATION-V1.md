# CHECK-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1

- WO: `WO-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1`
- Branch: `work/cms-kpa-mutation-servicekey-canonicalization-v1`
- Base: `0dc6b6c6c` (fresh worktree, `/c/tmp/o4o-cms-kpa-mutation`)
- 판정: **PASS** (mutation 축 폐쇄 완료 / production write 0 / schema·migration 0)

---

## 1. 재현 — 실패의 정확한 형태

`PUT /api/v1/cms/contents/:id` · `PATCH /api/v1/cms/contents/:id/status` 는
`authorizeCmsMutation()` 한 곳에서 인가를 판정한다. 수정 전 코드:

```ts
const allowedServiceRoles = [`${serviceKey}:admin`, `${serviceKey}:operator`];
```

`serviceKey` 는 **CMS 원장 축**(`cms_contents.serviceKey`) 값이다. KPA 의 원장 canonical 값은
`kpa-society` 이므로 이 식은 `kpa-society:operator` / `kpa-society:admin` 이라는
**존재하지 않는 역할**을 요구한다. KPA 운영자가 실제로 보유한 역할은 `kpa:operator` 다.

→ 결과: KPA 운영자는 자기 서비스 콘텐츠에 대해 **항상 403**.

## 2. 근본 원인 — 두 축을 한 문자열로 접합했다

| 축 | 값 (KPA) | 값 (K-Cosmetics) | 자기사상 서비스 |
|---|---|---|---|
| role scope prefix | `kpa` | `cosmetics` | `glycopharm` / `pharmacy-hub` / `neture` / `platform` |
| canonical ledger service key | `kpa-society` | `k-cosmetics` | (동일) |

`${serviceKey}:operator` 는 **두 축이 같다는 가정**에서만 성립한다. 자기사상 서비스(PH·GP·neture)는
우연히 성립했고, 축이 갈라지는 KPA·KCos 두 서비스에서만 깨졌다. 즉 이것은 KPA 개별 버그가 아니라
**축 접합 버그**이며, PH 가 과거 겪은 allowlist 실패와 같은 계열이다.

## 3. Production 실측 (read-only, write 0)

`cms_contents` serviceKey 분포:

| serviceKey | rows |
|---|---|
| `glycopharm` | 66 |
| `kpa-society` | 53 |
| `neture` | 6 |
| `kpa` (legacy alias) | 1 |
| `pharmacy-hub` | 1 |

활성 `role_assignments` 실측: `kpa:operator` 2건 존재. **`kpa-society:*` 역할은 0건**,
`k-cosmetics:*` 역할도 0건.

→ 실측 결론: `kpa-society` 53건과 모든 k-cosmetics 콘텐츠는
**`platform:super_admin` 외 누구도 `/cms/contents` 로 수정할 수 없는 상태**였다.
legacy `kpa` 1건만 문자열 우연 일치로 통과하고 있었다.

## 4. 수정 — security-core SSOT 만으로 파생 (WO §8 준수)

CMS 로컬 alias 분기(`if (serviceKey === 'kpa-society') …`)를 **만들지 않았다**.
read 측 `resolveCmsServiceKeys()` 가 이미 쓰는 것과 **같은 왕복**을 합성했다:

`apps/api-server/src/routes/cms-content/cms-content-utils.ts` (신규 helper 3개)

```ts
export function canonicalizeCmsServiceKey(serviceKey: string): string {
  return resolveCanonicalServiceKey(resolveRolePrefixFromCanonicalServiceKey(serviceKey));
}
export function resolveCmsRolePrefix(serviceKey: string): string {
  return resolveRolePrefixFromCanonicalServiceKey(serviceKey);
}
export function isSameCmsService(a, b): boolean { /* canonical 비교 */ }
```

세 함수 모두 `@o4o/security-core` 의 `resolveCanonicalServiceKey` /
`resolveRolePrefixFromCanonicalServiceKey` 합성이며 자체 map 을 선언하지 않는다.

`apps/api-server/src/routes/cms-content/cms-content-mutation.handler.ts`

```ts
// role 축으로 접는다: 'kpa-society' → 'kpa', 'k-cosmetics' → 'cosmetics',
// legacy row 의 'kpa' / 'cosmetics' 도 self-map 으로 같은 prefix 가 된다.
const rolePrefix = resolveCmsRolePrefix(serviceKey);
const allowedServiceRoles = [`${rolePrefix}:admin`, `${rolePrefix}:operator`];
```

## 5. create 는 canonical 로 저장 (WO §10)

```ts
const canonicalServiceKey = serviceKey ? canonicalizeCmsServiceKey(String(serviceKey)) : null;
const content = contentRepo.create({ serviceKey: canonicalServiceKey, … });
```

admin-dashboard `ContentFormModal` 이 보내는 `'kpa'` 도 서버에서 `kpa-society` 로 수렴한다.
**role prefix 를 DB serviceKey 로 저장하지 않는다.**

## 6. legacy row 정책 (WO §9) — migration 0

alias 재전송(legacy `kpa` row 에 `serviceKey='kpa-society'` 전달)은 **쓰기를 발생시키지 않는다**.

```ts
const serviceKeyChanged =
  serviceKey !== undefined && !isSameCmsService(serviceKey, content.serviceKey);
…
if (serviceKeyChanged) {
  content.serviceKey = serviceKey ? canonicalizeCmsServiceKey(String(serviceKey)) : null;
}
```

legacy row 는 **계속 수정 가능**하고, 이번 계약이 조용히 canonical 로 바꾸지 않는다.
테스트로 고정: 별칭 재전송 후 `expect(saved.serviceKey).toBe('kpa')`.

## 7. 소유권 이전 (WO §11·§13)

`serviceKeyChanged && !isPlatformAdmin` → **403 FORBIDDEN**.
별칭 재전송은 `isSameCmsService` 로 "변경 아님"이 되므로 정상 운영자 수정이 오탐 403 되지 않는다.
platform admin 의 cross-service 이전은 그대로 200 이며 canonical 값으로 저장된다.
일반 운영자가 platform admin 처럼 행동하는 경로는 없다 (테스트 매트릭스로 고정).

## 8. lifecycle (WO §12)

`PATCH /contents/:id/status` (publish/archive) 는 `authorizeCmsMutation` 을 **공유**한다.
PATCH 만 별도 인가를 갖지 않으므로 같은 수정으로 함께 닫혔고, publish·archive 두 경우를
KPA canonical row / KPA legacy row / 타서비스 row 에 대해 각각 테스트했다.

## 9. organization 가시성 (WO §14)

`authorizeCmsMutation` 전문을 확인한 결과 **`organizationId` 를 참조하는 분기가 원래 없다**.
이번 변경은 organizationId 조건을 추가·완화·제거하지 않았다. 재설계 없음.

## 10. Consumer census (WO §19)

`cms_contents` 에 쓰는 코드 경로 전수:

| 경로 | 축 처리 | 조치 |
|---|---|---|
| `routes/cms-content/cms-content-mutation.handler.ts` | 접합 버그 (원인) | **수정** |
| `routes/kpa/kpa.routes.ts` (`/api/v1/kpa/news*`) | guard=`requireKpaScope('kpa:operator')`(role 축), write=`KPA_SERVICE_KEY='kpa-society'`(원장 축) — 이미 분리 | 무변경 |
| `routes/o4o-store/controllers/news.controller.ts` | `(ledgerServiceKey, operatorRole)` 파라미터로 분리 수신. mount: `('k-cosmetics','cosmetics:operator')`, `('glycopharm','glycopharm:operator')` | 무변경 |

slot mutation (`cms-content-slot.handler.ts`): `requireSlotAccess` + `extractAllowedCmsKeys` 가
`resolveCmsServiceKeys(prefix)` 로 alias 집합을 만든다 — 이미 alias 정합. 무변경.
`authorizeCmsMutation` 의 다른 소비자는 없다 (PUT/PATCH/DELETE 동일 파일 내부).

CMS 외 도메인으로 확장하지 않았다.

## 11. 잔여 부채 (이번 WO 범위 밖 — 보고만)

1. `apps/api-server/src/routes/kpa/kpa.routes.ts` 의 `KPA_SERVICE_KEYS = ['kpa-society','kpa']`
   — 로컬 alias 리터럴. 동작은 맞지만 `resolveCmsServiceKeys('kpa')` 로 대체 가능한 SSOT 중복.
2. `apps/admin-dashboard/src/pages/cms/contents/*` 의 하드코딩 `SERVICES` 목록이 KPA 값으로 `'kpa'`
   를 쓴다. 서버 canonicalization 으로 결과는 정합하나 목록 자체는 SSOT 파생이 아니다.
3. production `cms_contents` 의 legacy `kpa` 1건 — WO §9 에 따라 migration 하지 않았다.

## 12. 검증 결과

| 항목 | 결과 |
|---|---|
| 신규 mutation 계약 테스트 `cms-content-mutation-service-scope.spec.ts` | **34/34 PASS** |
| CMS read/slot 회귀 (§16) | **32/32 PASS** |
| `pharmacy-hub-content-resource-adoption.spec.ts` (source guard 갱신) | PASS |
| security-core 테스트 | PASS |
| api-server `tsc --noEmit` | **0 errors** |
| api-server 전체 Jest | **186 suites / 3069 tests, 0 fail** |
| frontend | 변경 파일 0 — 영향 없음 (서버측 canonicalization 으로 흡수) |
| production write | **0건** (census read-only) |
| schema / migration | **0건** |

## 13. 미수행 항목 (정직 보고)

**production 인증 스모크(KPA 운영자 계정으로 실제 PUT/PATCH 호출) 미수행.**
사유: 자격증명 fixture(`kpa_login.json` 등) 읽기와 인라인 psql 자격증명 사용이
실행 환경의 권한 분류기에 의해 **거부**되었다. 우회하지 않았다.
production 상태는 read-only census 로만 확인했으며, 코드 계약은 34건의 mutation 계약 테스트로 고정했다.
운영 UI 스모크가 필요하면 자격증명 접근 승인 후 별도 수행이 필요하다.

## 14. 변경 파일 (path-specific)

```
M apps/api-server/src/routes/cms-content/cms-content-mutation.handler.ts
M apps/api-server/src/routes/cms-content/cms-content-utils.ts
M apps/api-server/src/__tests__/pharmacy-hub-content-resource-adoption.spec.ts
A apps/api-server/src/__tests__/cms-content-mutation-service-scope.spec.ts
A docs/checks/CHECK-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1.md
```

WO §20 변경 금지 목록 전부 미접촉. §21 중지 조건 해당 없음
(security-core resolver 만으로 두 축 사상이 완결되므로 첫 번째 중지 조건 비해당).

---

## Addendum — production smoke 재시도 결과 (2026-08-25)

후속 WO(`WO-O4O-CMS-SERVICEKEY-ALIAS-SSOT-RESIDUAL-CLOSURE-V1` §3)에서 §13 미수행 항목을
다시 시도했다. 결과: **BLOCKED_ENV — 수행 불가**. 다만 사유가 이전 기록보다 정확해졌다.

배포 실측:

```
Cloud Run  o4o-core-api  image tag = 4a692207f6c917153a0da5501aff1a40abd7dbdd
git log -1 4a692207f  → fix(rbac): cross-service 권한 판정을 membership+role 계약으로 최종 정합
git merge-base --is-ancestor 0795c6922 4a692207f  → NOT_DEPLOYED
```

즉 **production 은 이번 수정(`0795c6922`)이 포함되지 않은 리비전을 돌리고 있다.**
따라서 "KPA operator 가 자기 kpa-society content 를 수정해 403 이 해소된다" 는
자격증명 유무와 무관하게 **현 시점 production 에서 관측 자체가 불가능**하다.
(이전 기록의 "자격증명 접근 거부" 는 부차적 사유였고, 1차 사유는 미배포다.)

수정 전 403 의 근거는 그대로 유효하다 — production role 실측에 `kpa-society:*` 역할이
0건이므로 `${serviceKey}:operator` 조립은 어떤 사용자로도 통과할 수 없다.

후속 조치: 이 브랜치가 main 에 반영·배포된 뒤 KPA operator 계정으로
create/update/publish/archive 스모크를 수행해야 한다. 그때까지 이 항목은 열려 있다.
production DB write 는 이 재시도에서도 0건이다.
