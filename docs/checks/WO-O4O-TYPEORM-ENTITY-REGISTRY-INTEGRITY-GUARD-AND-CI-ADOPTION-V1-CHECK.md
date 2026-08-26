# WO-O4O-TYPEORM-ENTITY-REGISTRY-INTEGRITY-GUARD-AND-CI-ADOPTION-V1 — CHECK

- 작업일: 2026-08-26
- 성격: 기능 개발 아님. **재발 방지 가드 구축** (2026-08-25 `WO-O4O-NETURE-AI-ADMIN-API-500-ROOT-CAUSE-AND-PRODUCTION-CLOSURE-V1` 후속)
- 정본 계약: `apps/api-server/src/database/entities.ts` 의 `export const entities = [...]` = **runtime entity registry SSOT**
  - glob 자동 등록 도입하지 않음 / `synchronize: true` 도입하지 않음 / 디렉터리 통째 import 도입하지 않음

---

## §1 시작 게이트

```
git fetch origin
branch : main
HEAD   : 4a4d2ccb8a3e6351c60ca81d1933db0f64a97aef
origin/main : 43125e364603ce97f3e650d0085bd71bcc3f61ed
```

작업트리에 **다른 세션 소유의 staged 변경**(`apps/main-site/**` 대량 삭제 + `apps/api-server/src/__tests__/main-site-residual-orphan-axis-retirement.spec.ts`)이 존재했다.
해당 변경은 **수정·삭제·stash 하지 않았다.** 본 WO 는 아래 경로만 건드리고, 커밋은
`node scripts/git/check-staged-scope.mjs` 확인 후 **path-specific commit** 으로 수행했다.

- `scripts/check-typeorm-entities.mjs`
- `apps/api-server/src/database/entities.ts`
- `apps/api-server/src/__tests__/typeorm-entity-registry-guard.spec.ts`
- `.github/workflows/ci-pipeline.yml`
- `docs/checks/WO-O4O-TYPEORM-ENTITY-REGISTRY-INTEGRITY-GUARD-AND-CI-ADOPTION-V1-CHECK.md`

---

## §2 기존 스크립트 실패 원인 확정

`node scripts/check-typeorm-entities.mjs` 재현 결과:

```
❌ connection.ts entities 배열 파싱 실패. 스크립트를 업데이트하세요.
exit 2
```

원인은 정규식의 사소한 미스가 아니라 **대상 파일과 scan 범위가 둘 다 틀린 것**이다.

| # | 결함 | 근거 |
|---|------|------|
| C1 | **registry SSOT 를 잘못 본다** | `parseRegisteredEntities()` 가 `apps/api-server/src/database/connection.ts` 에서 `/entities\s*:\s*\[([\s\S]*?)\],?\s*\n\s*\/\//` 를 찾는다. registry 는 이미 `database/entities.ts` 로 분리됐고, `connection.ts` 는 `import { entities } from './entities.js'` 후 `entities,` 한 줄만 쓴다 → 매치 0 → `exit 2` |
| C2 | **scan 범위에 `src/entities/` 가 없다** | `SCAN_DIRS = [src/modules, src/routes]`. 2026-08-25 장애를 낸 `AiEngine`/`AiQueryPolicy`/`AiQueryLog` 는 전부 `src/entities/` 에 있다 → 스크립트가 정상 동작했어도 **탐지 불가** |
| C3 | **파서가 문법을 정확히 읽지 않는다** | 배열 블록에서 `/\b([A-Z][A-Za-z0-9]+)\b/g` 로 식별자를 긁어 주석·타입명까지 섞인다. entity 정의는 `/export\s+class\s+(\w+)/g` 를 **파일 단위** `@Entity` 존재 여부로 게이트해, 한 파일에 entity/비-entity 클래스가 섞이면 오탐 |
| C4 | **alias/spread/multiline import 를 다루지 못한다** | `View as CMSView` 같은 alias, `...SignageCoreEntities` spread, 여러 줄 named import 를 문자열 매칭으로 처리 |
| C5 | **ALLOWLIST 가 stale** | `StoreLibraryItem` · `CategoryMappingRule` · `SpotPricePolicy` · `NetureOrderItem` · `NetureProduct` 등 현재 모집단에 없는 이름이 남아 있고, 근거가 코드에 드러나지 않는다 |
| C6 | **검출 종류가 부족** | import-but-not-in-array / defined-but-not-registered 2종뿐. 중복 등록·stale import 원본 미검출 |

조사 항목별 결론(모두 새 가드에서 처리):

- `@Entity()` decorator 탐지 → AST `ts.getDecorators` 로 클래스 단위 판정 (C3 해소)
- named / default / namespace / alias / multiline import → `ts.ImportDeclaration` 파싱 (C4 해소)
- barrel export → 상대 import 해석 시 `<path>/index.ts` 를 함께 시도
- `entities.ts` import·array 구조 → `export const entities = [...]` 의 `ArrayLiteralExpression` 을 AST 로 읽고 `SpreadElement` 를 분리 집계
- abstract / base entity → `abstract` 수식자를 가진 `@Entity` 클래스는 등록 대상에서 제외하고 `ABSTRACT_BASE` 로 기록 (현재 저장소에는 해당 없음)
- test fixture / migration-only class → `migrations/` · `__tests__/` · `*.spec.ts` · `*.test.ts` · `*.d.ts` scan 제외
- duplicate registration → 신규 검출 규칙 D5

---

## §3 entity 모집단 재산출 (`apps/api-server/src/**`)

`node scripts/check-typeorm-entities.mjs` 산출(수정 후 기준):

```
registry 배열 항목 : 263 (식별자 262 + spread 1: SignageCoreEntities)
scan 파일          : 1909 (runtime 도달 1104)
@Entity 정의       : 265
미등록             : 48 (동결 재고 등재 48)
```

| 분류 | 수 | 비고 |
|------|---:|------|
| `REGISTERED` | 217 | `src/**` 에 정의되고 registry 에 등록됨 (registry 총 263 항목 중 나머지는 workspace package entity) |
| `DEFINED_BUT_UNREGISTERED` (실결함) | **1** | `PartnerApplication` — 본 WO 에서 등록 |
| `DEAD_ENTITY` | **48** | runtime 도달 가능한 repository 소비처 0 |
| `INTENTIONAL_EXCLUSION` | 0 | — |
| `TEST_ONLY` | 0 | test/migration 전용 `@Entity` 클래스 없음 |
| `UNJUDGED` | **0** | — |

판정 방법(자동 · 재현 가능):

1. `main.ts` 에서 상대 import 그래프(정적 `import`/`export from` + 동적 `import()` + `require()`)를 따라 **runtime 도달 파일 1104개**를 산출
2. 각 미등록 entity 에 대해 도달 가능한 파일에서 repository 소비 패턴
   (`getRepository(X)` · `Repository<X>` · `InjectRepository(X)` · `getMetadata(X)` · `createQueryBuilder(X)` · `manager.*(X` 등) 검색
3. 소비처가 하나라도 있으면 **실결함**, 없으면 `DEAD_ENTITY`

`DEAD_ENTITY` 48건은 `scripts/check-typeorm-entities.mjs` 의 `UNREGISTERED_INVENTORY` 에
**이름 · 파일 경로 · 근거**로 개별 등재했다. 대표 사례:

| entity | 위치 | 근거 |
|--------|------|------|
| `Alert` · `SystemMetrics` | `src/entities/` | `services/CircuitBreakerService.ts` · `services/degradation/**` 에서만 쓰이며 그 모듈이 `main.ts` 그래프에서 도달 불가 |
| `BusinessInfo` · `CommissionPolicy` · `Product` · `Supplier` | `src/entities/` | `services/CommissionCalculator.ts` · `services/PolicyResolutionService.ts` 전용, 둘 다 도달 불가 |
| `Template` | `src/entities/Template.ts` | `controllers/templatesController.ts` 전용, import 하는 곳 없음 |
| signage extension 12종 (`Cosmetics*` · `Pharmacy*` · `Seller*`) | `routes/signage/extensions/**` | extension repository 는 있으나 route 가 등록되지 않아 도달 불가 |
| 나머지 30여 건 | `src/entities/` 외 | repository 소비 자체가 없음 |

> 이 48건은 **entity 자체의 존폐에 사업 판단이 필요**하고(§6 중지 조건), 개중에는 table 이 없는 것도 있어
> 임의 등록이 오히려 위험하다. 그래서 본 WO 는 **등록하지 않고 동결 재고로 고정**했다.
> 목록에 없는 새 미등록 entity, 재고 항목에 도달 가능한 소비처가 생기는 경우, 재고 항목이 등록·삭제된 경우는 **전부 CI 실패**다.

---

## §4 Guard 검출 규칙

`scripts/check-typeorm-entities.mjs` 전면 재작성 (정규식 파싱 → **TypeScript Compiler API AST**).

| 코드 | 규칙 | 결과 |
|------|------|------|
| D1 | `DEFINED_BUT_UNREGISTERED` | exit 1 |
| D2 | `REGISTERED_BUT_SOURCE_MISSING` (상대 import 원본 모듈 부재) | exit 1 |
| D3 | `IMPORT_EXISTS_BUT_ARRAY_MISSING` | exit 1 |
| D4 | `ARRAY_ENTRY_WITHOUT_IMPORT` | exit 1 |
| D5 | `DUPLICATE_REGISTRATION` (식별자·spread 중복) | exit 1 |
| — | `STALE_INVENTORY_ENTRY` (allowlist 위생) | exit 1 |
| — | registry 배열 자체 미발견 | exit 2 (조용히 통과하지 않는다) |

**D1 의 2분법이 이 가드의 핵심이다.**

- (a) runtime 도달 가능한 코드가 repository 로 소비 → **항상 실패. allowlist 로 덮을 수 없다.** ← 2026-08-25 장애 형태
- (b) 도달 가능한 소비처 없음 → `UNREGISTERED_INVENTORY` 에 파일 경로와 근거를 적어 등재한 것만 통과

allowlist 는 "규칙에서 빼주는 장치"가 아니라 **동결된 재고 목록**이며, 광범위 ignore 패턴(디렉터리 통째 제외 등)은 쓰지 않았다.

---

## §5 회귀 테스트

`apps/api-server/src/__tests__/typeorm-entity-registry-guard.spec.ts` (신규, 10 tests, 전부 PASS)

실제 `entities.ts` 를 수정하지 않는다. CLI 에 `--registry-source <path>` 입력 주입 옵션을 두어
"registry 에서 entity 가 빠진 상태"를 임시 파일로 재현한다.

| 테스트 | 성격 |
|--------|------|
| 현재 저장소에서 exit 0 | positive |
| registry 원본을 그대로 주입해도 exit 0 | 입력 주입이 결과를 바꾸지 않음 |
| `AiEngine` 배열에서 제거 → exit != 0 + 이름 출력 | **negative regression** |
| `AiQueryPolicy` 배열에서 제거 → exit != 0 + 이름 출력 | **negative regression** |
| `AiQueryLog` 배열에서 제거 → exit != 0 + 이름 출력 | **negative regression** |
| 3개를 import 까지 제거 → 3개 이름 전부 `DEFINED_BUT_UNREGISTERED` + `EntityMetadataNotFoundError` 사유 명시 | **negative regression** |
| 중복 등록 → `DUPLICATE_REGISTRATION` | negative |
| import 없는 배열 항목 → `ARRAY_ENTRY_WITHOUT_IMPORT` | negative |
| import 원본 경로 파괴 → `REGISTERED_BUT_SOURCE_MISSING` | negative |
| `entities` 배열 rename → exit 2 | 조용한 통과 방지 |

negative 케이스는 **다른 회귀 대상 entity 가 함께 걸리지 않는지**(오탐)까지 단언한다.

---

## §6 저장소 전체 audit

수정된 guard 를 전체 실행해 발견한 **추가 실제 결함 1건**:

### PartnerApplication 미등록 (실결함, 본 WO 에서 수정)

```
정의 : apps/api-server/src/modules/partner/entities/PartnerApplication.ts  (@Entity('partner_applications'))
소비 : apps/api-server/src/modules/partner/services/partner-application.service.ts
       → AppDataSource.getRepository(PartnerApplication)
경로 : bootstrap/register-routes.ts:410  app.use('/api/v1/partner/applications', partnerApplicationRoutes)  ← 등록돼 있다
등록 : ❌ entities.ts 의 partner barrel import 는 PartnerContent/PartnerEvent/PartnerTarget 3개뿐
```

→ 2026-08-25 AI admin 장애와 **완전히 같은 형태**(등록 route + 미등록 entity → `EntityMetadataNotFoundError` → 500).
`entities.ts` 에 import + 배열 등록을 추가했다 (`+4 lines`). registry 등록은 metadata 구성일 뿐이며
`synchronize: false` / `migrationsRun: false` 이므로 **DDL 을 발생시키지 않는다.**

**단, 이 entity 는 schema 가 아직 없다 — 보고 후 중지 항목.**

```
grep -rn "partner_applications" apps/api-server/src/database/migrations/*.ts
  → neture_partner_applications (다른 테이블) 만 존재. partner_applications 생성 migration 없음.
```

`/api/v1/partner/applications` 는 등록 후에도 테이블 부재로 실패한다.
**migration 작성은 §6 중지 조건(`schema/migration 필요`)에 해당하므로 본 WO 에서 수행하지 않았다.**
별도 WO 로 분리한다(§잔여).

그 외 `DUPLICATE_REGISTRATION` / `ARRAY_ENTRY_WITHOUT_IMPORT` / `REGISTERED_BUT_SOURCE_MISSING` /
`IMPORT_EXISTS_BUT_ARRAY_MISSING` 은 **전부 0건**이다.

---

## §7 CI 연결

`.github/workflows/ci-pipeline.yml` → 기존 **`Code Quality Check`** job,
`Guard unsafe operational routes` 다음 · `Check for console.log statements` 앞에 blocking step 추가.

```yaml
- name: Guard TypeORM entity registry integrity
  run: node scripts/check-typeorm-entities.mjs
```

- 새 workflow 만들지 않음 / DB 연결 없음 / secret 없음 / 순수 정적 검사
- entity 누락 시 `exit 1` → job 실패
- `continue-on-error` · warning-only · `|| true` **없음**
- 기존 quality gate 순서(types build → frontend/app-store/api-server type-check → **lint-ratchet** → unsafe-routes → **본 step** → console.log → 테스트) 를 바꾸지 않음

---

## §8 검증

| 항목 | 결과 |
|------|------|
| `node scripts/check-typeorm-entities.mjs` | ✅ exit 0 |
| guard 회귀 spec (`typeorm-entity-registry-guard.spec.ts`) | ✅ 10/10 PASS |
| api-server type-check (`tsc --noEmit`) | ✅ exit 0 |
| 기존 entity/bootstrap 관련 tests<br>(`ai-admin-typeorm-entity-registration` · `channels-typeorm-entity-registration` · `bootstrap/__tests__`) | ✅ 4 suites / 101 tests PASS |
| `node scripts/lint-ratchet.mjs` | ⚠️ 로컬은 exit 1 (`1506 > 69`) — **내 변경 탓이 아니다.** 로컬 HEAD 가 origin/main 보다 18 commit 뒤져 `services/web-glycopharm/.../B2BOrderPage.tsx:467` 의 parsing error(origin/main 에서 이미 1줄 수정됨)가 남아 있어 오류가 증폭된다. 실제 병합 트리 기준은 CI `Run ESLint (regression ratchet)` ✅ SUCCESS |
| 변경 파일 3개 직접 `npx eslint` | ✅ exit 0 |
| CI 에서 guard step | ✅ SUCCESS (§10) |

완료 기준 대조:

```
script exit 0                : PASS
DEFINED_BUT_UNREGISTERED = 0 : PASS
registry stale reference = 0 : PASS
duplicate registration = 0   : PASS
FALSE_POSITIVE = 0           : PASS (미등록 48건은 도달성 근거로 개별 판정 후 재고 등재)
negative regression          : PASS
CI guard step                : SUCCESS
```

---

## §9 금지 항목 준수

| 금지 | 준수 |
|------|------|
| glob entity auto-registration | 미도입 |
| `synchronize: true` | 미도입 (`synchronize: false` 유지) |
| 전체 디렉터리 무조건 import | 미도입 |
| 대량 ignore / allowlist | ignore 패턴 없음. allowlist 는 도달성 판정 결과를 이름·경로·근거로 고정한 **동결 재고**이며, 실제 500 유발 형태(도달 가능한 repository 소비)는 **재고로 덮을 수 없다** |
| DB schema · migration 변경 | 없음 (`partner_applications` migration 은 보고 후 중지) |
| CI 실패를 warning 으로 완화 | 없음 |
| 특정 entity 이름 하드코딩으로 방지 | 없음. `AiEngine` 등은 **회귀 테스트 대상**으로만 등장하고, 가드 규칙은 이름에 의존하지 않는다 |

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (`partner_applications` migration)

---

## §10 종료

```
commit  : 9d78f70f2  fix(api-server): TypeORM entity registry 정합성 가드 재작성 + CI 채택
          (로컬 main 이 다른 세션 커밋으로 diverge 상태여서, origin/main 기준 임시 worktree 에
           cherry-pick 후 push. 다른 세션 작업물은 건드리지 않았다.)
push    : be35f160b..9d78f70f2 → origin/main
```

### CI 실제 결과

내 커밋 직후 실행된 run 32941667661 은 후속 push 의 concurrency 규칙으로 **cancelled**
(guard step 도달 전 취소). 내 커밋을 포함한 다음 run 에서 실제 결과를 확인했다.

```
run 32942092855  CI Pipeline  head 77dc85267 (9d78f70f2 포함)  → completed / success

  Code Quality Check → success
    Run TypeScript check (Frontend only)          success
    Run TypeScript check (App Store packages)     success
    Run TypeScript check (api-server)             success
    Run ESLint (regression ratchet)               success
    Guard unsafe operational routes               success
    Guard TypeORM entity registry integrity       success   ← 본 WO
    Check for console.log statements              success
    Run tests (api-server Jest)                   success   ← 신규 guard spec 포함
    Run tests (admin-dashboard Vitest)            success
    Run tests (multi-tenant Vitest)               success
  Build Applications (admin-dashboard) → success
```

기존 quality gate 순서와 동작은 변하지 않았다.

### 잔여

1. **`partner_applications` 테이블 migration 부재** — `PartnerApplication` 은 registry 에 등록했지만
   테이블 생성 migration 이 없다. `/api/v1/partner/applications` 는 테이블 부재로 여전히 실패한다.
   schema/migration 작업은 본 WO 의 중지 조건이므로 **별도 WO** 로 분리한다.
2. **`DEAD_ENTITY` 48건의 존폐 판단** — 삭제할지 등록할지는 사업 판단이 필요하다.
   현재는 `UNREGISTERED_INVENTORY` 로 동결돼 있어 방치돼도 새 결함은 유입되지 않는다.
   정리 시 재고 목록에서 함께 제거하면 가드가 stale 항목을 즉시 잡는다.
