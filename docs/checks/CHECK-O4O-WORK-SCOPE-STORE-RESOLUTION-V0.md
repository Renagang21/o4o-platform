# CHECK-O4O-WORK-SCOPE-STORE-RESOLUTION-V0

- **WO**: WO-O4O-WORK-SCOPE-STORE-RESOLUTION-V0
- **일자**: 2026-09-08
- **선행**: WO-O4O-COMMON-HOME-PHASE1-V1 (CLOSED) · WO-O4O-WORK-SCOPE-CONTRACT-V0 (CLOSED)
- **작업 브랜치**: `work/work-scope-store-resolution-v0` (독립 worktree `C:/tmp/o4o-work-scope`)
- **범위**: 매장 scope **read-only 해석 경로**. 조직/매장 관리 기능 · membership write 없음.

---

## 1. 기존 resolver 조사 결과

### 1-1. `apps/api-server/src/utils/store-organization.resolver.ts`

이번 WO 가 필요로 하는 계약이 **이미 그대로 존재**한다. 새 판정 로직을 만들지 않았다.

| 항목 | 실측 |
|---|---|
| 진입 | `resolveStoreOrganization(dataSource, userId, serviceKey?)` |
| 상태 | `resolved` / `none` / `ambiguous` — WO §8 정책과 **동일** (1개→resolved, 0개→none, 2+→ambiguous) |
| 후보 | `organization_members`(role ∈ `owner,admin,manager`, `left_at IS NULL`) ∩ 서비스 등록 |
| 서비스 등록 근거 | `organization_service_enrollments(service_code, status='active')` ∪ `platform_store_slugs(service_key, is_active)` — 합집합 |
| 핵심 원칙 | **`role 판정 ≠ organization 판정`** (파일 헤더). store_owner role 이 있다고 아무 조직이나 고르지 않는다 |
| ambiguous | `logger.warn` 후 **임의 선택 없이** 종료 |
| membership 검증 | **없음** — 이 resolver 는 조직만 본다. membership 은 호출 측 책임 |

⚠️ `StoreOwnerServiceKey = 'kpa' | 'glycopharm' | 'cosmetics' | 'pharmacy-hub' | 'cafe24-b2b'` 는
**role prefix 공간**이며 `neture` 가 없다.

⚠️ 같은 파일의 `findAnyServiceStoreOrganizationCandidates()` (서비스 조건 없는 후보)는
**이번 경로에서 쓰지 않았다.** 매핑 없는 serviceKey 에 그 함수를 쓰면 다른 서비스 매장이
그대로 새어나간다(§14 위반). 대신 `STORE_IDENTITY_NOT_SUPPORTED` 로 끝낸다.

### 1-2. 기존 API 재사용 가능 여부 (§6-C)

**충분한 기존 API 가 없다.** 최소 endpoint 를 추가한 근거다.

| 후보 | 왜 부족한가 |
|---|---|
| `GET /api/v1/kpa/me-context` | 유일하게 `storeOrganizationId` + resolution 상태를 돌려주지만 **`'kpa'` 하드와이어**. serviceKey 파라미터 없음 |
| `GET /api/v1/{service}/store-hub/overview` | `organizationId` 를 주지만 대시보드 집계(5+ 쿼리) 부산물이고 서비스별 mount 라 cross-service 로 못 쓴다 |
| `GET /api/v1/pharmacy-hub/store-owner/info` | pharmacy-hub 전용 + 자체 resolver + 사업자번호·주소·전화번호까지 반환(§15 최소화 위반) |
| `GET /api/v1/auth/me` · `/auth/status` | `roles`/`memberships` 만. **organizationId/storeId 없음** |
| `GET /api/v1/store-entitlements/me/check` | 내부에서 조직을 풀지만 **노출하지 않는다** |

나머지 소비처는 전부 **가드 부산물**(`req.organizationId` 주입)이라 조회용으로 쓸 수 없다.

### 1-3. 서비스별 차이 (§6-D)

`STORE_SERVICE_ORG_LINKAGE` 실측:

```text
kpa          enrollment: ['kpa-society','kpa']        slug: ['kpa']
glycopharm   enrollment: ['glycopharm']               slug: ['glycopharm']
cosmetics    enrollment: ['k-cosmetics','cosmetics']  slug: ['k-cosmetics','cosmetics']
pharmacy-hub enrollment: ['pharmacy-hub']             slug: ['pharmacy-hub']
cafe24-b2b   enrollment: ['cafe24-b2b']               slug: ['cafe24-b2b']
neture       ─ 매핑 없음 (매장 축 자체가 없음)
```

- **Neture 는 매장 축이 없다.** `O4O-ORGANIZATION-ROLE-STANDARD-V1 §4.4` 가 이미 "유일하게 organization 미통합 서비스"로 기록 중이며, 이번 조사도 같은 결론이다.
- GlycoPharm 은 최신 main 에서 **여전히 살아 있다**(linkage 등재 + `services/web-glycopharm` 존재). 제거/은퇴 트랙이 아니므로 제외하지 않았다.
- 두 근거 테이블의 키 체계가 서로 다르다(enrollment=platform-level, slug=product-level). 그래서 후보값을 배열로 둔다 — 이번 WO 에서 새 값을 만들지 않았다.

---

## 2. 재사용한 canonical 축

```text
serviceKey   service_memberships.service_key (canonical)
             ↔ role prefix 변환 SSOT = packages/security-core/src/service-configs.ts
               resolveCanonicalServiceKey / resolveRolePrefixFromCanonicalServiceKey
membership   utils/service-membership.ts  getServiceMembershipStatusFromDb
             (내부에서 canonical 정규화까지 수행)
매장 조직     utils/store-organization.resolver.ts  resolveStoreOrganization
storeId      organizations.id  (organizationId 와 같은 값 — 아래 3-2)
```

**신규 판정 로직 0.** 이번 모듈은 위 세 SSOT 의 **조합**이 전부다.

---

## 3. API 계약

### 3-1. endpoint

```text
GET /api/v1/work-scope/store-resolution?serviceKey=<canonical|prefix>&workspace=store
```

- 인증: `requireAuth`. **userId 는 세션에서만** 얻는다(`req.user.id`). query/body 의 userId 를 받지 않는다.
- 서비스별 membership 가드 미들웨어를 쓰지 않는다 — serviceKey 가 **파라미터인 cross-service 표면**이라 특정 서비스 가드를 걸 수 없다. 대신 핸들러가 요청 serviceKey 로 membership 을 직접 확인한다(동일 SSOT).
- membership 이 없어도 403 이 아니라 `status:'none'` 이다. 이 API 는 접근 제어 게이트가 아니라 **scope 해석기**이며, 모든 미해석 사유를 같은 200 형상으로 돌려 **존재 여부를 흘리지 않는다**.

### 3-2. 응답 (최소 필드만 — §15)

```json
{ "success": true,
  "data": { "status": "resolved", "serviceKey": "kpa-society", "workspace": "store",
            "organizationId": "uuid", "storeId": "uuid", "reason": null } }
```

사업자번호 · 주소 · 대표자 · 전화번호 · 조직명 등 **조직 메타데이터는 일절 반환하지 않는다.**

`organizationId` 와 `storeId` 는 현재 저장구조에서 **같은 `organizations.id` 값**이지만
필드를 합치지 않는다(§3) — Boundary Policy(F6)가 Store Ops=organizationId /
Commerce=storeId 로 경계 이름을 나눠 쓰고, 저장구조가 갈라져도 계약이 깨지지 않아야 한다.
값을 동일시하는 판단은 **서버가 canonical 데이터를 근거로** 내린다(프런트가 아니라).

### 3-3. reason code (§17)

```text
NO_SERVICE_MEMBERSHIP         해당 서비스 active membership 없음
NO_ACCESSIBLE_STORE           접근 가능한 매장 0개
MULTIPLE_ACCESSIBLE_STORES    2개 이상 — 자동 선택 금지
STORE_IDENTITY_NOT_SUPPORTED  매장 축이 없는 서비스(neture)
WORKSPACE_NOT_STORE_SCOPED    store 의미가 없는 workspace
```

---

## 4. resolved / none / ambiguous 정책

판정 순서 — **순서가 곧 보안 계약**이다:

```text
1. workspace 가 store 축인가        아니면 → none/WORKSPACE_NOT_STORE_SCOPED  (질의 0건)
2. serviceKey canonical 정규화
3. 해당 서비스 active membership 인가  아니면 → none/NO_SERVICE_MEMBERSHIP     (매장 질의 안 함)
4. 그 서비스가 매장 축을 갖는가       아니면 → none/STORE_IDENTITY_NOT_SUPPORTED
5. 서비스 스코프 매장 후보 확정        0→none / 1→resolved / 2+→ambiguous
```

- 3번이 4·5번보다 **먼저**다. membership 없는 사용자에게는 매장 후보 질의 자체를 하지 않는다.
- 2+ 에서 첫 번째를 고르지 않는다. 선택은 후속 Selector V1.
- `resolved` 가 아니면 organizationId/storeId 는 **항상 null**. fallback 없음.

---

## 5. 서비스별 resolution 정책

| serviceKey | 결과 |
|---|---|
| `kpa-society` / `k-cosmetics` / `glycopharm` / `pharmacy-hub` / `cafe24-b2b` | 정상 해석 (0/1/2+ → none/resolved/ambiguous) |
| `neture` | 항상 `none` · `STORE_IDENTITY_NOT_SUPPORTED` |
| 알 수 없는 값 | `none` · `NO_SERVICE_MEMBERSHIP` (fail-closed) |

role prefix 로 들어와도(`kpa`, `cosmetics`) canonical 로 정규화해 판정하고 **응답의 serviceKey 는 canonical** 이다.

---

## 6. frontend WorkScope 연결 방식

route 기반 resolver 를 **없애지 않았다**(§11).

```text
route + auth        → base WorkScope         (resolveWorkScope — 기존 그대로)
store workspace 면  → 서버 scope resolution  (React Query)
merge               → active WorkScope       (mergeStoreResolution)
```

- **호출 조건**: `shouldResolveStore(base, isAuthenticated)` — store 축 + 인증된 경우만. home/community/operator/admin/supplier/partner 에서는 호출하지 않는다.
- **반영 규칙(§16)**: `resolved` 일 때만 organizationId/storeId 를 채운다. `none`/`ambiguous` 는 둘 다 `undefined` 로 유지. 임의 fallback 금지.
- **경합 안전**: 응답의 workspace/serviceKey 가 현재 base 와 다르면 무시한다(이전 요청이 늦게 도착해도 오염되지 않는다).
- **로딩(§12)**: public `WorkScope` 계약을 넓히지 않고 context 값에 `isResolvingStore` 를 따로 둔다. 해석 전에는 base 를 그대로 두므로 **위험한 기본값이 생기지 않는다**(storeId 는 계속 undefined).
- **캐시(§13)**: React Query 메모리 캐시만. 키 = `['work-scope','store-resolution', user.id, serviceKey, workspace]` → 계정/서비스/축이 바뀌면 자동 재해석. `staleTime` 60s, `retry:false`.
  **localStorage / sessionStorage / DB 에 storeId 를 저장하지 않는다.** sessionStorage 는 기존대로 "마지막 확정 업무 축" 표시값만 담고 매장 식별자를 담지 않는다.

> 참고: Neture 의 serviceKey 는 `neture` 라 `/store/*` 에서 항상 `STORE_IDENTITY_NOT_SUPPORTED` 를 받는다.
> 즉 **현재 web-neture 에서는 storeId 가 채워지지 않는다** — 이는 구현 결함이 아니라 §5 의 서비스 구조 그대로다.
> 프런트 연동은 계약 검증용 reference integration 이며, Neture 가 organization 에 연결되거나(후속)
> 다른 서비스가 같은 코드를 쓰면 그대로 동작한다.

---

## 7. 권한 검증 (§14)

```text
요청 serviceKey 를 그대로 믿지 않는다
  → 현재 사용자(세션) 확인
  → 그 serviceKey 의 active membership 확인   ← 먼저
  → 매장 축 보유 서비스인지 확인
  → serviceKey 로 스코프된 후보만 조회        ← 다른 서비스 매장 노출 0
```

- 후보 쿼리 자체가 `organization_service_enrollments.service_code` / `platform_store_slugs.service_key` 로 제한되므로, 다른 서비스 매장은 결과 집합에 들어오지 않는다. 테스트로 고정했다.
- 서비스 조건 없는 후보 함수(`findAnyServiceStoreOrganizationCandidates`)로 **폴백하지 않는다**.
- 신규 권한체계 · 신규 role · 신규 permission 테이블 0.

---

## 8. 테스트 결과

### 서버 — `apps/api-server/src/__tests__/work-scope-store-resolution.spec.ts` (12건, 전부 PASS)

DB 없이 `DataSource.query` 를 stub 으로 대체해 **어떤 질의를 어떤 파라미터로 던지는지**까지 검사한다.

| § | 케이스 | 결과 |
|---|---|---|
| 18-1 | membership 없음 → none/NO_SERVICE_MEMBERSHIP, **매장 질의 0건** | PASS |
| 18-1b | membership pending → none | PASS |
| 18-2 | 매장 0개 → none/NO_ACCESSIBLE_STORE | PASS |
| 18-3 | 매장 1개 → resolved, organizationId === storeId | PASS |
| 18-4 | 매장 2개 → ambiguous, 식별자 null (첫 번째 안 고름) | PASS |
| 18-5 | 후보 질의가 serviceKey 로 스코프됨 (leakage 0) | PASS |
| 18-5b | `cosmetics` → canonical `k-cosmetics` 로 정규화 | PASS |
| 18-6 | 모든 질의가 인자로 받은 userId 로만 나감 (spoof 불가) | PASS |
| 18-7 | 알 수 없는 serviceKey → fail-closed | PASS |
| 18-7b | `neture` → STORE_IDENTITY_NOT_SUPPORTED, 매장 질의 0건 | PASS |
| 18-8 | non-store workspace 6종 → 질의 **0건** | PASS |
| — | read-only: 모든 질의가 SELECT, write 키워드 0 | PASS |

관련 회귀 동시 실행: `store-owner-service-scoped-org.spec.ts` + `crossservice-identity-rbac-membership-closure.spec.ts`
→ **3 suites / 35 tests 전부 PASS**.

### 프런트 (§18 9~16)

**web-neture 에는 테스트 러너가 없다.** vitest/jest 미설치이고 `package.json` 에 test script 가 없다
(다른 web 서비스도 동일, `packages/auth-react` 의 `__tests__` 도 실행 러너가 없다).
러너 추가는 devDependency 변경 = CLAUDE.md 중지 조건이라 **이번 WO 에서 도입하지 않았다**(후속 5번).

대신 순수 함수(`resolveWorkScope` / `shouldResolveStore` / `mergeStoreResolution`)를
실행 하네스로 검증했다 — 검증 후 파일은 삭제(커밋하지 않음). **전 항목 PASS**:

| § | 케이스 | 결과 |
|---|---|---|
| 18-9,10 | `/`, `/community` → 서버 호출 **안 함** | PASS |
| 18-9,10 | `/operator`,`/admin`,`/supplier`,`/partner` → 호출 안 함 | PASS |
| 18-11 | `/store/cart`, `/seller/overview` → 호출함 | PASS |
| 18-11 | 미인증 `/store/cart` → 호출 안 함 | PASS |
| 18-12 | resolved → storeId·organizationId 반영, reason 해제 | PASS |
| 18-13 | none → 식별자 비움 + 서버 reason 유지 | PASS |
| 18-14 | ambiguous → 식별자 비움 | PASS |
| — | 해석 전(undefined) → base 유지 (위험한 기본값 없음) | PASS |
| — | resolved 인데 id null → **채우지 않는다** (fallback 금지) | PASS |
| — | 다른 workspace/serviceKey 응답 무시 (경합·leakage 안전) | PASS |
| 19 | 회귀 `/` `/community` `/supplier` `/partner` `/operator` `/admin` `/mypage` `/handoff` 전부 종전 값 | PASS |

18-15(auth 변경 시 재해석) · 18-16(serviceKey 변경 시 재해석)은 React Query 캐시 키
`['work-scope','store-resolution', user.id, serviceKey, workspace]` 로 보장된다 — 키 구성에 의한 것이며
러너가 없어 자동 테스트로 고정하지 못했다(후속 5번).

---

## 9. type-check / build / production smoke

```text
apps/api-server   npx tsc --noEmit    work-scope 관련 오류 0
services/web-neture  npx tsc --noEmit  PASS (exit 0)
services/web-neture  build             PASS (built in 25.41s)
eslint (신규 6파일)                     PASS (0)
```

**api-server type-check 잔여 63건은 전부 이번 변경과 무관한 baseline** 이다:
62건이 미빌드 패키지 TS2307(`@o4o-apps/cms-core`, `@o4o/lms-core`, `@o4o/store-core` 등),
1건이 `src/routes/dashboard/dashboard-assets.mutation-handlers.ts` 의 기존 TS2345.
내가 만든 파일에는 오류가 0건이다. CLAUDE.md 중지 조건("현재 변경과 무관한 build/test 실패")에 따라
고치지 않고 보고만 한다.

기본 heap 으로는 `JavaScript heap out of memory` 로 러너가 죽어 완주하지 못한다 —
`--max-old-space-size=8192` 를 주면 완주한다(위 결과). CI(`ci-pipeline.yml` quality-check)가 전체를 돌린다.

**production smoke**: 수행 완료 — 아래 §10 참조 (전 케이스 기대값 일치).

**api-server 전체 jest (로컬, `--max-old-space-size=8192`)**: `234 suites / 3,895 tests PASS`.
실패 1 suite(9 tests) = `typeorm-entity-registry-guard.spec.ts` — Windows 임시 디렉터리
`ENOENT` 로, **단독 실행 시 10/10 PASS**. 이번 변경은 entity 를 추가하지 않으며 해당 영역을
건드리지 않았다. 장시간 직렬 실행 시의 로컬 환경 flake 로 판정하고 수정하지 않았다.

---

## 10. DB write / migration 확인

```text
DB migration   0  (신규 마이그레이션 파일 없음)
DB write       0  (SELECT 전용 — 테스트로 고정: write 키워드 검출 0)
신규 테이블/컬럼 0
공통 package 수정 0   (packages/** 무변경 — §22)
package.json 변경 0   (신규 dependency 0)
```

`@o4o/security-core` 는 **api-server 에서만** import 한다(이미 dependency 로 등재됨).
web-neture 에는 넣지 않았다(§22).

### production smoke (§23) — 수행 완료

- 배포: `Deploy API Server (Cloud Run)` success · `Deploy Web Services (Cloud Run)` success · CodeQL success (commit `fe5dced51`)
- 대상: `https://api.neture.co.kr/api/v1/work-scope/store-resolution`
- 계정: `docs/local/TEST-ACCOUNTS.local.md` 의 L1 자격 (`kpa:store_owner` 보유). 자격증명은 env 주입, 문서·로그에 기록하지 않는다.
- **전부 read-only GET. DB write 0.**

| 요청 | 응답 | 기대 일치 |
|---|---|:---:|
| `serviceKey=kpa-society&workspace=store` | `resolved` · organizationId=storeId=`c9beb4a2…` | ✅ |
| `serviceKey=kpa&workspace=store` (role prefix) | `resolved` · **serviceKey 가 `kpa-society` 로 정규화** · 동일 org | ✅ |
| `serviceKey=neture&workspace=store` | `none` · `STORE_IDENTITY_NOT_SUPPORTED` | ✅ |
| `serviceKey=kpa-society&workspace=home` | `none` · `WORKSPACE_NOT_STORE_SCOPED` | ✅ |
| `serviceKey=k-cosmetics&workspace=store` | `none` · `NO_ACCESSIBLE_STORE` | ✅ |
| `serviceKey=glycopharm&workspace=store` | `none` · `NO_ACCESSIBLE_STORE` | ✅ |
| `serviceKey=pharmacy-hub&workspace=store` | `none` · `NO_ACCESSIBLE_STORE` | ✅ |
| `serviceKey=not-a-real-service&workspace=store` | `none` · `NO_SERVICE_MEMBERSHIP` (fail-closed) | ✅ |
| 미인증 (헤더 없음) | HTTP 401 `AUTH_REQUIRED` | ✅ |

**cross-service leakage 0 이 프로덕션 실데이터로 입증됐다.** 같은 사용자가
kpa-society 에서는 매장이 `resolved` 인데, k-cosmetics · glycopharm · pharmacy-hub
(모두 membership 보유 서비스)에서는 `NO_ACCESSIBLE_STORE` 로 **KPA 매장이 새어나오지 않았다**.
서비스 조건 없는 후보 함수를 썼다면 세 서비스 모두 KPA 매장을 돌려줬을 것이다.

응답에 조직 메타데이터(사업자번호·주소·대표자·전화번호·조직명)가 포함되지 않은 것도 함께 확인했다(§15).

---

## 11. 후속 작업

1. **Store Scope Selector V1** — `ambiguous` 일 때만 필요. 실제 사용자 대부분이 매장 1개면 후순위(§28).
   선택 결과는 실행 컨텍스트이므로 DB 영구 저장이 아니라 요청 단위 전달로 설계할 것.
2. **중앙 AI 입력 활성화 → WorkScope 주입** — `useWorkScope()` 가 연결점. `isResolvingStore` 가 true 인 동안 storeId 를 쓰지 않도록 주의.
3. **Neture organization 연결** — 연결되기 전까지 web-neture 의 storeId 는 계속 비어 있다. `O4O-ORGANIZATION-ROLE-STANDARD-V1 §4.4` 의 유일한 미준수 항목.
4. **Work Scope 공통화** — 현재 web-neture thin 구현. KPA/GlycoPharm/K-Cosmetics/PharmacyHub 로 넓힐 때 `@o4o/auth-react` 승격 후보(Shared Module Change Protocol 대상). 이들 서비스는 매장 축이 있어 실제로 `resolved` 가 나온다.
5. **프런트 테스트 러너 부재** — web 서비스 5개 모두 테스트 러너가 없다. 도입은 devDependency 변경이라 별도 WO 필요. 도입되면 위 프런트 하네스를 정식 테스트로 승격하고 18-15/16 도 고정할 것.
6. **`kpa/me-context` 와의 중복** — 같은 매장 해석을 서로 다른 두 경로가 노출한다. 장기적으로 `me-context` 가 이 endpoint 를 재사용하도록 수렴 검토(이번 범위 밖 — 기존 응답 계약을 건드리게 된다).

---

## 12. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- `docs/architecture/O4O-ORGANIZATION-ROLE-STANDARD-V1.md §4.4` — Neture organization 미연결을 정확히 기록 중. 이번 조사 결과와 일치하므로 **수정 불필요**. 위 후속 3번으로 연결한다.

판정·내용 변경이 필요한 건은 없어 인라인 수정 0건이다(§16-2).

---

## 13. 완료 기준 대조 (WO §27)

| 기준 | 결과 |
|---|---|
| 1. store scope 서버 resolution 경로 존재 | 충족 — `GET /api/v1/work-scope/store-resolution` |
| 2. 현재 사용자 기준 판정 | 충족 — `req.user.id` 만 사용, client userId 미수용 |
| 3. canonical serviceKey 사용 | 충족 — 정규화 후 판정·응답 |
| 4. 매장 1개 → resolved | 충족 (테스트 고정) |
| 5. 0개 → none | 충족 |
| 6. 2개 이상 → ambiguous | 충족 — 임의 선택 없음 |
| 7. 다른 서비스 store leakage 0 | 충족 — 후보 질의가 serviceKey 스코프, 무스코프 폴백 미사용 |
| 8. frontend WorkScope 에 안전 반영 | 충족 — resolved 일 때만 채움, 경합 응답 무시 |
| 9. route/auth 기존 동작 무변경 | 충족 — 회귀 8경로 확인, guard/redirect 무수정 |
| 10. 신규 권한체계 0 | 충족 |
| 11. DB migration 0 | 충족 |
| 12. DB write 0 | 충족 (테스트로 고정) |
| 13. tests / type-check / build PASS | 충족 (단 §9 의 baseline TS2307·무관 flake 단서 포함) |
