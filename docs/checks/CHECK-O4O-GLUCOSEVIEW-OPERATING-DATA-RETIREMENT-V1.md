# CHECK-O4O-GLUCOSEVIEW-OPERATING-DATA-RETIREMENT-V1

> **WO**: `WO-O4O-GLUCOSEVIEW-OPERATING-DATA-RETIREMENT-V1`
> **목표**: 운영 DB의 `glucoseview` 서비스 데이터 6행을 안전하게 제거하고, 코드 제거를 재개할 수 있는 상태로 만든다
> **선행**: [`CHECK-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1`](CHECK-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1.md) (STOPPED — 본 WO 가 그 중지 원인을 해소)
> **일자**: 2026-08-05
> **판정**: ✅ **PASS — 6행 정확히 삭제. 코드 변경 0 · migration 0 · 불변 검증 전부 통과.**

---

## 0. 결론 요약

| 항목 | 결과 |
|---|---|
| 삭제 대상 | 정확히 **6행** (사전 census 와 일치) |
| 실제 삭제 | **6행** — `operator_notification_settings` 1 / `roles` 4 / `platform_services` 1 |
| 트랜잭션 | 단일 `BEGIN…COMMIT`, 테이블별 `ROW_COUNT` 가드 + 총합 6 가드. 불일치 시 `RAISE EXCEPTION` → rollback |
| FK cascade | **0행** — 예상 범위를 넘지 않음 (§2-2) |
| 불변 검증 | `role_assignments` 51 · `service_memberships` 31 · `users` 40 — **전부 변화 없음** |
| 코드·UI 변경 | **0건** |
| migration 생성·삭제 | **0건** (enum·CHECK 제약 미변경) |
| 운영 API smoke | `GET /api/v1/platform-services` → 8건, `glucoseview` 없음, 나머지 8개 서비스 정상 |

이로써 선행 WO `WO-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1` 의 중지 조건 1번
("운영 DB에 `glucoseview` row 존재")이 **해소**되었다.

접속: `cloud-sql-proxy` → `netureyoutube:asia-northeast3:o4o-platform-db`,
**전용 포트 5447** (병렬 세션 프록시 5439·5441 미간섭).
자격증명은 Cloud Run `o4o-core-api` 리비전 env 에서 **런타임에만** 읽었고 파일·문서·커밋에 남기지 않았다.

---

## 1. 실행 전 census (가드)

### 1-1. 대상 6행 — 실측

| 테이블 | row | 값 |
|---|---:|---|
| `platform_services` | 1 | `947b5628…` · `code=glucoseview` · `name=GlucoseView` · `status=active` · `service_type=tool` |
| `roles` | 4 | `4b145635…` `glucoseview:admin` / `352ea699…` `:operator` / `eba83815…` `:pharmacist` / `ff27534c…` `:user` — 전부 `is_active=true` |
| `operator_notification_settings` | 1 | `53374572…` · `service_code=glucoseview` · created 2026-02-04 |
| **합계** | **6** | WO 대상과 일치 |

### 1-2. 참조 0 확인

| 확인 | 결과 |
|---|---|
| `role_assignments` 중 role 이 `glucose*` | **0** |
| `service_memberships` | **0** |
| `organization_service_enrollments` (→ `platform_services.code`) | **0** |
| 테이블명에 `glucose` 포함 | **0** |
| `glucose` 라벨 enum | **0** |
| 정의에 `glucose` 포함 CHECK 제약 | **0** |

### 1-3. 전수 동적 스캔 (컬럼명 `service`/`scope`/`code`/`key` × varchar·text·json(b)·ARRAY 전체)

`information_schema.columns` 로 대상 컬럼을 동적 생성해 `ilike '%glucose%'` 집계.
**non-zero 컬럼은 아래 3개뿐** — 신규 참조 없음.

| 컬럼 | 건수 |
|---|---:|
| `platform_services.code` | 1 |
| `roles.service_key` | 4 |
| `operator_notification_settings.service_code` | 1 |

### 1-4. 베이스라인 row 수 (불변 검증용)

| 테이블 | PRE |
|---|---:|
| `platform_services` | 9 |
| `roles` | 42 |
| `operator_notification_settings` | 5 |
| `role_assignments` | 51 |
| `service_memberships` | 31 |
| `users` | 40 |
| `role_permissions` | 0 |

---

## 2. FK cascade 범위 확인 (WO 중지 조건 4번 대조)

### 2-1. 대상 3테이블을 참조하는 FK 전수

```
organization_service_enrollments.service_code -> platform_services.code   [NO ACTION]
role_permissions.role_id                      -> roles.id                 [CASCADE]
```

### 2-2. 실질 영향

| FK | 규칙 | 실측 | 판정 |
|---|---|---|---|
| `organization_service_enrollments.service_code` | `NO ACTION` | glucoseview 참조 **0행** | 삭제 차단 없음 |
| `role_permissions.role_id` | `CASCADE` | 대상 role 4개의 권한 **0행** (`role_permissions` 테이블 자체가 전체 **0행**) | **cascade 삭제 0행** |

→ **cascade 가 예상 범위를 넘지 않음.** 삭제 총량은 승인된 6행과 정확히 동일하다.

---

## 3. 실행

단일 트랜잭션. 스크립트는 임시 실행본이며 자격증명을 포함하지 않는다(리포지토리 미커밋).

```sql
BEGIN;
DO $$ ... $$;   -- ① 참조 0 재확인 가드
                -- ② DELETE operator_notification_settings WHERE service_code='glucoseview'  → ROW_COUNT = 1 가드
                -- ③ DELETE roles                          WHERE service_key ='glucoseview'  → ROW_COUNT = 4 가드
                -- ④ DELETE platform_services              WHERE code        ='glucoseview'  → ROW_COUNT = 1 가드
                -- ⑤ 총합 <> 6 이면 RAISE EXCEPTION → rollback
SELECT ... ;    -- 커밋 전 in-transaction 검증
COMMIT;
```

**실행 로그**

```
BEGIN
NOTICE:  OK: notif=1 roles=4 services=1 total=6
DO
 in-tx platform_services                               |  0
 in-tx roles                                           |  0
 in-tx operator_notification_settings                  |  0
 in-tx platform_services TOTAL (expect 8)              |  8
 in-tx roles TOTAL (expect 38)                         | 38
 in-tx operator_notification_settings TOTAL (expect 4) |  4
 in-tx role_assignments TOTAL (invariant)              | 51
 in-tx service_memberships TOTAL (invariant)           | 31
 in-tx users TOTAL (invariant)                         | 40
COMMIT
EXIT=0
```

가드 4개(테이블별 3 + 총합 1)와 사전 참조 가드 1개를 모두 통과한 뒤에만 COMMIT 되었다.
`ON_ERROR_STOP=1` 로 실행했으므로 어떤 예외에서도 rollback 된다.

DB enum·CHECK 제약·migration 이력은 **변경하지 않았다.**

---

## 4. 사후 검증

### 4-1. 대상 소멸

| 확인 | 결과 |
|---|---|
| `platform_services` glucoseview | **0** |
| `roles` glucoseview | **0** |
| `operator_notification_settings` glucoseview | **0** |
| **전체 service/scope/code/key 컬럼 재스캔** | **non-zero 컬럼 0개 — 잔존 row 전무** |

### 4-2. row 수 대조

| 테이블 | PRE | POST | Δ | 기대 |
|---|---:|---:|---:|---|
| `platform_services` | 9 | **8** | −1 | ✅ |
| `roles` | 42 | **38** | −4 | ✅ |
| `operator_notification_settings` | 5 | **4** | −1 | ✅ |
| `role_assignments` | 51 | **51** | 0 | ✅ 불변 |
| `service_memberships` | 31 | **31** | 0 | ✅ 불변 |
| `users` | 40 | **40** | 0 | ✅ 불변 |
| `role_permissions` | 0 | **0** | 0 | ✅ 불변 |

**사용자·조직·권한 할당은 전혀 변경되지 않았다.**

### 4-3. 다른 서비스 불변

`roles` service_key 분포 — glucoseview 4행만 사라지고 나머지 동일:

| service_key | PRE | POST |
|---|---:|---:|
| cosmetics | 7 | 7 |
| **glucoseview** | **4** | **0** |
| glycopharm | 7 | 7 |
| kpa | 8 | 8 |
| lms | 1 | 1 |
| neture | 5 | 5 |
| pharmacy-hub | 3 | 3 |
| platform | 7 | 7 |

`platform_services` 잔존 code:
`cosmetics, glycopharm, k-cosmetics, kpa, kpa-groupbuy, kpa-society, neture, pharmacy-hub`

`operator_notification_settings` 잔존 service_code:
`glycopharm, k-cosmetics, kpa-society, neture`

### 4-4. enum·CHECK 미변경 확인

| 확인 | 결과 |
|---|---|
| `glucose` 라벨 enum | **0** (실행 전과 동일 — 애초에 없었음) |
| 정의에 `glucose` 포함 CHECK 제약 | **0** (동일) |

### 4-5. 운영 smoke

| 확인 | 결과 |
|---|---|
| `GET https://api.neture.co.kr/health` | `200` · `status=alive` · `environment=production` |
| `GET https://api.neture.co.kr/api/v1/platform-services` | `200` · **8건** · `['cosmetics','kpa-groupbuy','kpa','glycopharm','neture','k-cosmetics','kpa-society','pharmacy-hub']` — `glucoseview` 없음, 나머지 정상 |

admin 서비스 목록의 소스인 `platform_services` 카탈로그가 정상 동작하며 다른 서비스는 그대로다.
`role_assignments` 에 `glucoseview:*` 보유자가 0이었으므로 역할 목록 표시 회귀도 발생하지 않는다.

---

## 5. 중지 조건 대조 (전부 미해당)

| 중지 조건 | 판정 | 근거 |
|---|:---:|---|
| 대상이 6행과 불일치 | ✅ 미해당 | 사전 census 6행 = 실제 삭제 6행 |
| role assignment / membership 참조 발견 | ✅ 미해당 | 둘 다 0 (트랜잭션 내 재확인 포함) |
| 다른 운영 데이터 참조 발견 | ✅ 미해당 | 동적 전수 스캔 non-zero 3컬럼뿐 |
| FK cascade 가 예상 범위 초과 | ✅ 미해당 | cascade 실삭제 0행 (§2-2) |
| 병렬 DB 작업과 충돌 | ✅ 미해당 | 전용 포트 5447 사용. 병렬 세션은 HFF 설명서(`shared_product_descriptions` 계열) 작업으로 테이블 축이 분리됨 |

---

## 6. 원칙 준수

| 원칙 | 준수 |
|---|:---:|
| 승인된 6행 외 DB write 금지 | ✅ 삭제 6행 · 그 외 write 0 |
| 사용자·조직·권한 할당 변경 금지 | ✅ `users`/`service_memberships`/`role_assignments` 불변 |
| migration 파일 삭제 금지 | ✅ 미접촉 |
| 신규 대체 service key 생성 금지 | ✅ 생성 0 |
| 코드·UI 변경 없음 | ✅ 0건 |
| 병렬 HFF 작업물 미접촉 | ✅ `hff-zh-*` 미접촉, pathspec 커밋 |

---

## 7. 후속 — 코드 제거 재개 가능

운영 row 가 0 이 되었으므로
[`WO-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1`](CHECK-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1.md) 를 재개할 수 있다.
해당 CHECK 의 §4 분류를 그대로 사용한다.

1. **§4-A** (DB row 정리 후 제거 — 이제 UNBLOCKED)
   - `apps/admin-dashboard/src/lib/rbac-catalog.ts` 17 · 34 · 138
   - `apps/admin-dashboard/src/hooks/useOperatorPolicy.ts` 100
   - `apps/admin-dashboard/src/pages/operator/PointBudgetPage.tsx` 67
2. **§4-B** (정책 확인 후 제거) — `entities.ts` 빈 배너 주석이 가장 안전, `offer.service.ts` 방어 필터는 신중
3. **§4-C** 테스트는 음성 대조군이므로 유지 권장
4. **§4-D** 는 RETAIN (동명이인 · migration 이력 · 문서)

DB 측 후속 작업은 **없다** — enum·CHECK 제약에 `glucoseview` 가 존재하지 않고, 데이터 row 는 본 WO 로 정리 완료되었다.

---

## 8. 커밋·배포

| 항목 | 값 |
|---|---|
| 변경 파일 | 본 CHECK 문서 1개 (코드·설정 변경 0) |
| 커밋 | `docs(check): glucoseview 운영 데이터 6행 은퇴 — DB write only, 코드 변경 0` |
| CI·배포 | 문서 단독 변경. 실행 코드·설정 미변경 |
