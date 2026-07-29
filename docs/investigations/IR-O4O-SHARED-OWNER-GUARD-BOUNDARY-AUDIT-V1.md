# IR-O4O-SHARED-OWNER-GUARD-BOUNDARY-AUDIT-V1

> WO: `WO-O4O-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1` 범위 D
> 일자: 2026-07-29
> 성격: **감사(audit) + 부분 안전 수정**. 구조적 잔여 항목은 후속 WO 대상 (WO §7.3 허용 경로).

---

## 1. 감사 대상

| 가드 | 파일 | 소비 |
|------|------|------|
| `isStoreOwner(dataSource, userId, serviceKey?)` | `apps/api-server/src/utils/store-owner.utils.ts` | 전 서비스 매장 라우트의 공통 owner 판정 |
| `createRequireStoreOwner(dataSource, serviceKey?)` | 동일 | 미들웨어 팩토리 (POP / QR / 자료함 / 태블릿 등) |
| `resolveStoreAccess(dataSource, userId, roles, serviceKey?)` | 동일 | 인라인 판정 (store_local_products CRUD 등) |

소비 서비스: KPA-Society / GlycoPharm / K-Cosmetics (+ Neture 는 공급자 축이라 본 가드 비사용).

---

## 2. 가드별 계약 기록 (WO §7.2 항목)

| 항목 | 현재 계약 |
|------|-----------|
| 가드 이름 | `isStoreOwner` — "이 사용자가 store owner 인가 + 그의 조직은 무엇인가" 2가지를 동시에 수행 |
| 입력 ID 의 실제 entity | `users.id` (userId). 조직 ID 는 **입력이 아니라 가드가 도출**한다 |
| 허용 actor | `role_assignments.role = '{serviceKey}:store_owner'` (active) |
| 조직 경계 | `organization_members.role IN (owner, admin, manager) AND left_at IS NULL` |
| 서비스 경계 | **role 단계에만 존재**. 조직 선택 단계에는 없음 (아래 D-2) |
| 읽기/쓰기 구분 | 없음 — 동일 가드가 읽기·쓰기 모두 통과시킨다 |
| 다중 역할 처리 | serviceKey 지정 시 해당 서비스 role 만. `service_memberships` active 도 사전 검증(JWT) |
| dead JOIN | 없음 (2개 단순 쿼리) |
| 무접두 role | 없음 — 전부 `{service}:` prefix 필수 |
| prefix 오판 | 없음 — `ANY($2::text[])` 정확 일치 |

---

## 3. 발견

### D-1 (수정 완료) — 조직 선택이 **비결정적**이었다

```sql
-- 수정 전
SELECT organization_id, role FROM organization_members
WHERE user_id = $1 AND role IN ('owner','admin','manager') AND left_at IS NULL
LIMIT 1        -- ← ORDER BY 없음
```

`ORDER BY` 없는 `LIMIT 1` 은 Postgres 가 어떤 행을 반환할지 보장하지 않는다.
복수 조직에 소속된 사용자는 **같은 요청을 반복해도 다른 organizationId** 를 받을 수 있었다.

매장 데이터 전부(`store_local_products` / `store_execution_assets` / `store_qr_codes` /
`store_tablet_displays` / POP 자산)가 이 `organizationId` 로 경계를 정하므로,
비결정성 = 경계 불안정이다.

**수정**: 자격 집합은 그대로 두고 선택 순서만 확정.

```sql
ORDER BY is_primary DESC NULLS LAST,                                  -- 대표 조직 우선
         CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, -- 역할 강도
         joined_at ASC NULLS LAST,                                     -- 먼저 가입
         id ASC                                                        -- 최종 tie-break
LIMIT 1
```

`is_primary` 는 `organization_members` 에 이미 존재하는 canonical 대표조직 플래그이므로
신규 컬럼·마이그레이션 없이 기존 의미를 존중한다. **허용 대상(자격 집합) 변화 0** — 순서만 확정.

### D-2 (미수정 — 후속 WO) — 조직 선택에 **서비스 경계가 없다**

`role_assignments` 는 `{serviceKey}:store_owner` 로 정확히 걸러지지만,
그 다음 조직 선택 쿼리에는 serviceKey 가 전혀 들어가지 않는다.

근본 원인: **`organizations` 테이블에 `service_key` 컬럼이 없다** (`type varchar(50)` 만 존재).
"이 serviceKey 에 해당하는 조직" 을 직접 특정할 수 있는 축이 스키마에 없다.

**영향 범위**: 서로 다른 서비스에 각각 별도 매장 조직을 가진 사용자.
이 경우 GlycoPharm 로그인에서도 KPA 조직이 선택될 수 있다(그 반대도).

**현재 실측**: 검증 계정 `renagang21` 은 KPA / GlycoPharm / K-Cosmetics 세 서비스에서
**동일한 조직·동일한 8건 자체 상품**(`후시딘연고(퓨시드산나트륨) cd3a2b29-…`)이 조회된다.
즉 이 계정은 조직이 1개이며, 현재 데이터에서는 D-2 가 관측되지 않는다.

**본 WO 에서 수정하지 않은 이유** (WO §17 중지 조건 / §7.3):
- 서비스↔조직 매핑 축 신설은 스키마 설계 결정이며, 공용 가드를 쓰는 모든 도메인
  (매장/자료함/QR/POP/태블릿/신청)의 실제 계약에 영향을 준다.
- 추정 기반 매핑(이름·타입 추측)은 WO §2 금지 사항이다.
- 잘못 좁히면 정상 사용자가 자기 매장에 접근하지 못한다(기능 은폐).

**후속 WO 권고안** (택1, 별도 승인 필요):
1. `organizations.service_key` 신설 + 백필 → 조직 선택에 serviceKey 조건 추가 **(권고)**
2. `service_memberships` ↔ 조직 연결축을 canonical 로 승격해 그 축으로 조직 해석
3. 매장 라우트가 조직 ID 를 명시 전달하고 가드는 "이 조직에 대한 권한" 만 판정
   (가드 이름·책임 분리: `isStoreOwner` → `canAccessOrganization`)

### D-3 (기록만) — 읽기/쓰기 미분리

동일 가드가 조회와 변경을 모두 통과시킨다. 매장 도메인은 현재 owner/admin/manager 가
읽기·쓰기 동일 권한이므로 실무상 문제는 관측되지 않았다. 세분화가 필요해지면 별도 WO.

### D-4 (기록만) — serviceKey 미지정 back-compat 경로

`serviceKey` 를 넘기지 않으면 3개 서비스 store_owner role 합집합을 허용하고
`service_memberships` 검증도 건너뛴다. 신규 코드는 반드시 serviceKey 를 지정해야 한다.
(기존 주석에 명시되어 있으며 본 WO 에서 정책 변경 없음.)

---

## 4. 검증

| 항목 | 결과 |
|------|------|
| `pnpm --filter @o4o/api-server type-check` | `src/scripts/*` 기존 baseline 외 오류 0 |
| `jest src/__tests__/security` | **8 suites / 185 tests PASS** (ownership · cross-service · legacy-role · store-hub-product-apply-gate 포함) |
| 허용 actor 집합 변화 | **0** (ORDER BY 추가만) |

---

## 5. 결론

- D-1 비결정성은 본 WO 에서 **해소**했다 (안전·무해·즉시 이득).
- D-2 서비스↔조직 경계는 **스키마 축 부재**가 근본 원인이며 본 WO 범위에서 안전하게 닫을 수 없다.
  감사 결과를 확정 기록하고 후속 WO 로 분리한다.
