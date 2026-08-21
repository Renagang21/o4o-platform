# CHECK — WO-O4O-PHARMACYHUB-RETIRED-SUPPLIER-ROLE-CATALOG-CLOSURE-V1

> **일자**: 2026-08-21 · **판정**: **COMPLETED (배포 시 migration 적용)**
> **정본 문서**: [`docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md`](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) §4 · §7-1
> **선행 WO**: `WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1` (`769f562d5` · `2ee6c8113`)

---

## 1. 문제

코드에서 `pharmacy-hub:supplier` 는 완전히 제거됐으나(역할 union · `ROLE_REGISTRY` ·
`PHARMACY_HUB_SCOPE_CONFIG` · 가입 경로 모두 부재) `roles` 카탈로그 row 는 seed migration
`20270216000000` 이 넣은 그대로 `is_assignable = true` · `is_active = true` 로 남아 있었다.

권한 상승은 없다(scope config 부재 → 배정돼도 전 scope 403, 잠금 테스트가 확인).
그러나 **정본 모델과 UI 카탈로그가 불일치**하므로 운영자 역할 관리 화면에서 다시 선택될 수 있는
drift 표면이었다.

---

## 2. 프로덕션 실측 (read-only SELECT, migration 전)

`roles` — `service_key='pharmacy-hub'`

| name | is_assignable | is_active |
|---|:---:|:---:|
| `pharmacy-hub:admin` | true | true |
| `pharmacy-hub:operator` | true | true |
| `pharmacy-hub:store_owner` | true | true |
| **`pharmacy-hub:supplier`** | **true** | **true** ← 카탈로그 노출 확인 |

`role_assignments` (role LIKE 'pharmacy-hub%')

| role | is_active | 건수 |
|---|:---:|---:|
| `pharmacy-hub:admin` | true | 2 |
| `pharmacy-hub:member` | true | 1 |
| `pharmacy-hub:operator` | true / false | 2 / 1 |
| `pharmacy-hub:store_owner` | true | 5 |
| **`pharmacy-hub:supplier`** | — | **0** |

`service_memberships` (`service_key='pharmacy-hub'`): admin 1 · member 1 · operator 2 ·
store_owner 4(active 3 · rejected 1) — **supplier 0건**.

→ 이 migration 으로 **잃는 실사용 배정 0건**. DB 직접 write 0건(전 구간 SELECT 만).

**범위 외 관측(변경 없음)**: `role_assignments`·`service_memberships` 에 prefix 있는 값과
없는 값(`operator` / `pharmacy-hub:operator`)이 섞여 있고, union 에 없는 `pharmacy-hub:member`
1건이 여전히 존재한다. 이번 WO 범위가 아니므로 손대지 않았다(선행 CHECK §3 과 동일 관측).

---

## 3. 조치 — 신규 migration

`apps/api-server/src/database/migrations/20270314000000-DeactivatePharmacyHubSupplierRole.ts`

```sql
UPDATE roles
   SET is_assignable = false, is_active = false, updated_at = now()
 WHERE name = 'pharmacy-hub:supplier'
```

- `down()` 은 `true/true` 복구(정본상 권장하지 않음을 주석에 명시).
- 값 지정 UPDATE 이므로 **멱등**.
- **기존 seed migration `20270216000000` 은 편집하지 않았다** (불변 이력).
- **role row hard delete 하지 않았다** (이력·FK 안전).
- `WHERE` 가 이름 하나만 보므로 **다른 서비스 supplier role 무영향** — 실측상
  `neture:supplier` · `cosmetics:supplier` 가 존재하며 둘 다 대상 아님.

---

## 4. 왜 이 UPDATE 로 카탈로그가 닫히는가 (read/write 경로 근거)

`apps/api-server/src/modules/auth/services/role.service.ts` 의 조회는 전부 `isActive: true` 필터다.

| 메서드 | 소비처 | 효과 |
|---|---|---|
| `getRolesByService` | `RoleController.getRoles` → 운영자 역할 관리 화면 | **목록에서 사라진다** |
| `getAssignableRoles` | operator 콘솔 배정 후보 | 사라진다 |
| `getAllRoles` | platform admin 전체 목록 | 사라진다 |
| `getRoleByName` | `MembershipConsoleController` 역할 부여(1388 · 1509) | **신규 배정 경로가 닫힌다** |
| `isValidRole` | 역할 유효성 검증 | false |

즉 `is_active=false` 하나로 **노출과 배정이 동시에** 닫힌다. `is_assignable=false` 는
`getAssignableRoles` 축의 이중 방어다.

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `apps/api-server` `tsc --noEmit` | PASS (기존 `@o4o/action-log-core` TS2307 잡음 외 0건) |
| pharmacy-hub 계열 Jest 전량 | **5 suites / 93 tests PASS** (scope guard · community capability/baseline · store provisioning reuse guard · cart checkout) |
| `services/web-pharmacy-hub` `tsc -b --force` | **EXIT 0** (아래 §6 참조) |
| 다른 서비스 supplier role | 무영향 (실측 확인) |
| DB write | **0건** — migration 은 main 배포 시 CI/CD 가 적용 |

**배포 후 재확인 필요(1건)**: migration 적용 뒤 `SELECT name FROM roles WHERE
service_key='pharmacy-hub' AND is_active = true` 가 **3행**(admin · operator · store_owner)이어야 하고,
운영자 역할 관리 화면 선택지에 supplier 가 없어야 한다.

---

## 6. 선행 WO 잔여 결함 (타 세션 제보 → 이미 해소 확인)

병렬 세션이 `769f562d5` 가 `services/web-pharmacy-hub/src/App.tsx` 에 미사용 import 2개
(`RoleEntryPage` · `ROLES`)를 남겨 `tsc -b` (noUnusedLocals) 가 깨진다고 제보했다.

- 사실 확인: `git show 769f562d5:...App.tsx` 에 두 import 가 실제로 남아 있었다 — **제보 정확**.
- 현재 상태: 후속 커밋 `ee8ba929f` 가 이미 제거했다. 현재 main 기준 `npx tsc -b --force` **EXIT 0**.
- 따라서 추가 수정 없음. 배포 차단 요인 아님.

---

## 7. 문서 정합

- 갱신: `docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md` §4 잔여 갭 → **해소**, §7-1 문구 정정
- 미편집(의도): seed migration `20270216000000` · `docs/work-orders/**` (기록물 — CLAUDE.md §16-1)

---

*Status: COMPLETED*
