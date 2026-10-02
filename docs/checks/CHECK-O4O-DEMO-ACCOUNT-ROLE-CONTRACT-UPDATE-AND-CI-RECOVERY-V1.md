# CHECK-O4O-DEMO-ACCOUNT-ROLE-CONTRACT-UPDATE-AND-CI-RECOVERY-V1

> WO: `WO-O4O-DEMO-ACCOUNT-ROLE-CONTRACT-UPDATE-AND-CI-RECOVERY-V1`
> 정본: [`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md) §18-1
> 작성: 2026-10-02 · **운영 DB write 0 · 배포 0 · CLI 변경 0**

---

## 1. 왜 main CI 가 red 였나 — 코드가 아니라 **테스트가** 틀렸다

```text
CI Pipeline @824f66722   run 36978308768   completed/failure
실패 1건 / 2176건         API Server Jest (2/3)
  src/scripts/__tests__/demo-account-provision.contract.test.ts:128
  ● ⑥ 멱등 · 선행 조건 › Demo 는 platform 역할이나 role_assignments 를 만들지 않는다
    Expected substring: not "role_assignments"
```

그 테스트는 이렇게 단언하고 있었다.

```ts
expect(CODE).not.toContain('role_assignments');   // ← 실패
expect(CODE).not.toContain('platform:');          // ← 통과
```

**129번 줄이 통과한다는 것이 진단의 핵심이다.** 코드가 platform role 을 주고 있었다면 그 줄이
먼저 깨졌을 것이다. 깨진 것은 "role_assignments 라는 글자가 소스에 없어야 한다" 쪽뿐이다.

내가 Phase B 에서 그 단언을 쓸 당시엔 CLI 가 role 을 **아예** 부여하지 않았다. 그래서 "글자가
없다" 로 묶어도 비용이 없었다. 이후 정본 정책이 **service-scoped role 허용**으로 바뀌고 CLI 가
`kpa:store_owner` · `neture:supplier` 를 부여하게 되자, 같은 단언이 **현행 정책을 금지하는 규칙**이
되어 버렸다. 낡은 계약이 현재 코드를 막은 것이지, 코드가 정책을 어긴 것이 아니다.

운영 DB 에도 이미 Demo `role_assignments` 2건이 반영돼 있다 — 정책은 이미 바뀌어 있었다.

---

## 2. canonical role 정책 (정본 §18-1 로 명문화)

```text
허용  kpa:store_owner      Store Owner Demo — isStoreOwner('kpa') · store-contents · store-playlists
      neture:supplier      Supplier Demo    — web-neture SupplierRoute 의 SUPPLIER_ROLES

금지  platform:*  ·  admin  ·  operator  ·  *:admin  ·  *:operator  ·  그 밖의 모든 role
```

"role 을 주지 않는다" 가 아니라 **"이 둘만 준다"** 이다. 체험이 목적이므로 화면 접근 자격은
주되, 공개 credential 을 쓰는 계정이라 허용값을 좁게 적는다. 데이터 범위는 role 이 아니라
ownership 이 정한다.

§18 에 platform 금지만 있고 §5 에는 role 연결이 적혀 있어 읽는 사람이 충돌로 읽을 수 있었다 —
§18-1 이 그 공백을 메운다.

---

## 3. 새 계약 (`demo-account-provision.contract.test.ts` ⑦)

전면 금지 단언을 **제거**하고, 값·순서·규칙을 직접 검증한다. §6 지시대로 "글자 존재 여부"로
정책을 정의하지 않는다 — 소스에서 실제 값을 파싱해 비교하고, **파싱에 실패하면 테스트가
실패한다**(빈손 파서가 조용히 통과하면 아무것도 지키지 못한다).

| # | 단언 |
|---|---|
| 1 | allowlist 가 정확히 `{kpa:store_owner, neture:supplier}` — 여분 0 |
| 2 | DEMOS 가 실제로 부여하는 role 집합이 allowlist 와 **같다**(각 1개씩 · 겸직 0) |
| 3 | allowlist · 부여 role 어디에도 권한 상승 role 이 없다 + `platform:` 문자열 0 + **금지 규칙 자체의 동작 확인**(`platform:super_admin` · `admin` · `operator` · `kpa:admin` · `neture:operator` 를 규칙이 잡는지) |
| 4 | 목록 밖 role 은 **DB 를 건드리기 전**에 거절 — `assertPreconditions` 안에 `ALLOWED_DEMO_ROLES.has` + throw 가 있고, 그 지점이 어떤 `INSERT INTO` 보다 앞이다 |
| 5 | role INSERT 파라미터가 `[userId, role]` 뿐이고 `process.argv`/`env` 유래가 아니며, `for (const role of demo.roles)` 루프 안에서만 나온다 |
| 6 | 활성 행 확인(`is_active = true`) + `if (!r && APPLY)` 뒤에만 INSERT — 비활성 이력을 되살리지 않는다 |
| 7 | role 보다 `demo_accounts` 테이블 확인 · registry · service_memberships · organization_members 가 **먼저** 온다 |

### 변이 검사 — 계약이 실제로 무언가를 지키는가

CLI 를 일시 변조해 돌리고 **원복**했다(커밋에는 CLI 변경이 없다).

```text
변이1  allowlist 에 platform:super_admin 추가   → 2건 실패
변이2  DEMOS role 을 kpa:admin 으로 교체         → 2건 실패
변이3  실행 전 거절(ALLOWED_DEMO_ROLES.has) 제거 → 1건 실패
```

세 가지가 모두 잡힌다. 통과만 보고 PASS 로 적지 않기 위해 남긴다.

---

## 4. CLI 는 고치지 않았다 (§8 STOP 조건 점검)

`demo-account-provision.ts` 는 이미 요구사항을 만족하고 있었다.

```ts
const ALLOWED_DEMO_ROLES: ReadonlySet<string> = new Set(['kpa:store_owner', 'neture:supplier']);
// assertPreconditions():
for (const role of d.roles) {
  if (!ALLOWED_DEMO_ROLES.has(role)) throw new Error(`Demo 에 허용되지 않은 role: ${role}`);
}
```

| §8 STOP 조건 | 결과 |
|---|---|
| 추가 role | 없음 — 정확히 2개 |
| `platform:*` | 없음 |
| `admin` · `operator` | 없음 |
| 동적 arbitrary role 입력 | 없음 — `process.argv` 는 `--apply` 에만, role 은 상수 `DEMOS` 에서만 |

→ STOP 조건 해당 없음, **CLI_CHANGE = 0**.

---

## 5. 검증

```text
jest src/scripts/__tests__/demo-account-provision.contract.test.ts    26 PASS (종전 20 + ⑦ 7 − 낡은 1)
jest src/scripts/__tests__ src/services/auth                          15 suites · 263 PASS
tsc --noEmit                                                          PASS (rc=0)
main CI (API Jest 포함)                                               <PR 결과 기록>
```

docs-fast green 은 인정하지 않는다 — API test job 이 실제로 실행된 run 으로 판정한다.

---

## 6. 운영 영향 — 없음

```text
운영 DB write           0   (Demo role_assignments 2건은 그대로 둔다 — 생성·삭제 0)
Production deploy       0
DEPLOY_FREEZE           true 유지 (건드리지 않음)
migration               0
Demo role 재생성        0
```

---

## 7. 완료 판정

```text
DEMO_ROLE_POLICY              = SERVICE_SCOPED_ALLOWLIST
ALLOWED_ROLES                 = {kpa:store_owner, neture:supplier}
PLATFORM_ROLE_FORBIDDEN       = PASS
ADMIN_OPERATOR_FORBIDDEN      = PASS
CONTRACT_TEST                 = PASS
CLI_CHANGE                    = 0
PRODUCTION_DB_WRITE           = 0
PRODUCTION_DEPLOY             = 0
DEPLOY_FREEZE_FINAL           = TRUE
MAIN_API_JEST                 = <PR CI 결과>
```

---

## 8. 다음

main API Jest 가 GREEN 이면:

1. `WO-O4O-PRODUCTION-SECRET-ENVIRONMENT-MIGRATION-AND-COLLABORATOR-SAFETY-CLOSURE-V1`
2. Demo API · neture-web 배포는 **새 merge SHA 기준으로 diff 를 다시 확인한 뒤** 판단한다.
   `824f66722` 는 더 이상 배포 기준이 아니다(그 SHA 의 CI 가 red 이고, 이번 수정이 뒤에 붙는다).
