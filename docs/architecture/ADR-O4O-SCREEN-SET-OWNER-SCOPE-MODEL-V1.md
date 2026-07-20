# ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1

> 유형: 아키텍처 결정 기록(ADR) — **설계 확정용**. 구현 아님(코드·migration 0).
> 상태: **Proposed** (검토·승인 후 후속 구현 WO 착수)
> Date: 2026-07-20
> 선행: `CHECK-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1`(HOLD) — 운영자 원본 저장이 `organization_id NOT NULL` 과 충돌(운영자 무조직) → 중지.
> 경계: CLAUDE.md §7 Boundary Policy(F6) — `organization_id` = **Store Ops 경계**, `serviceKey` = **Broadcast 경계**.

---

## 1. Context (왜 이 ADR 인가)

`store_tablet_screen_sets` 는 매장(store) 원본만 저장해 왔고 `organization_id` 가 **NOT NULL** 이다. 운영자(operator) 원본은 조직이 없어(전역·service_key 기반) 저장할 수 없다. 단순히 `organization_id` 를 nullable 로 바꾸면 **무효 조합**이 저장 가능해진다:

- `origin='store'` 인데 organization 없음
- `origin='operator'` 인데 매장 organization 존재(경계 오염)
- service_key 없는 운영자 원본(스코프 불명)
- 향후 공급자(supplier) 원본의 실소유자 불명확

따라서 nullable 전환 전에 **소유 주체(store / operator / supplier)별 유효 조합**을 스키마 수준에서 확정한다. 공급자까지 사용할 구조이므로 운영자만 보고 성급히 nullable 로 바꾸지 않는다.

## 2. 확정 대상 소유권 매트릭스

| 소유 주체 | organization_id | service scope | 별도 소유자 | 상태 값 | 공개 URL |
|-----------|:---:|:---:|:---:|---|:---:|
| **매장 store** | **필수** | 조직에서 파생(service_key 불필요) | 불필요 | draft / active / archived | 발급(기존) |
| **운영자 operator** | **없음(NULL)** | **service_key 필수** | `created_by_user_id`(작성자 추적) | operator_template | 미발급 |
| **공급자 supplier** | **없음(NULL)** | **service_key 필수(대상 서비스)** | **supplier 식별자 필수** | (후속 정의, 예: supplier_template) | 미발급 |

## 3. 핵심 결정

### D1. `origin` 을 소유 주체 discriminator 로 계속 사용한다 (owner_type 신규 컬럼 없음)

- 현재 `origin ∈ {store, operator}` 는 이미 "저작·소유 주체" 와 일치한다. `supplier` 를 추가해 **owner_type 역할을 origin 이 겸한다.**
- 별도 `owner_type` 컬럼은 origin 과 중복 → 도입하지 않는다.
- **알려진 한계(문서화)**: origin 은 "소유 주체"와 "저작 provenance" 를 동일시한다. 장차 "운영자가 매장 대신 저작"처럼 provenance≠owner 가 필요하면 그때 `authored_by_role` 등을 additive 로 분리한다(현재 불필요).

### D2. Polymorphic `owner_id` 대신 **주체별 전용 컬럼**을 쓴다

무효 조합 방지·참조 명확성·기존 컬럼 재사용을 위해 주체별 의미 고정 컬럼을 사용한다(polymorphic `(owner_type, owner_id)` 반려 — FK/검증 상실·origin 과 중복):

| 컬럼 | 의미 | 비고 |
|------|------|------|
| `organization_id` | **매장 경계 org 전용**(F6 Store Ops) | NOT NULL → **nullable 전환** |
| `service_key` | operator/supplier 의 Broadcast 스코프 | 기존 컬럼 |
| `created_by_user_id` | 작성자 추적(operator 필수) | 기존 컬럼 |
| `supplier_id` | 공급자 식별자 | **신규 additive 컬럼(nullable)** |

### D3. 공급자 식별자는 **별도 `supplier_id` 컬럼**(organization_id 오버로드 금지)

- 공급자는 `organizations(type='supplier')`(현재 6건) 이지만, `organization_id` 를 공급자에도 쓰면 **F6 경계(organization_id=Store Ops)** 의미가 깨진다.
- 따라서 `organization_id` 는 매장 전용으로 두고 공급자는 `supplier_id`(soft ref, nullable) 로 식별한다. 각 컬럼이 단일 의미를 가져 CHECK 로 조합을 강제할 수 있다.
- (반려안: `organization_id` 를 "소유 org(store|supplier)"로 오버로드 → F6 경계 혼선·매장 격리 쿼리 오염 위험.)

### D4. `organization_id` **nullable 전환** + 주체별 유효 조합 **DB CHECK**

```sql
-- 1) 매장 전용 org 를 nullable 로
ALTER TABLE store_tablet_screen_sets ALTER COLUMN organization_id DROP NOT NULL;

-- 2) 공급자 식별자 additive
ALTER TABLE store_tablet_screen_sets ADD COLUMN supplier_id UUID;  -- nullable, soft ref

-- 3) origin 확장(공급자)
ALTER TABLE store_tablet_screen_sets DROP CONSTRAINT "CHK_store_tablet_screen_sets_origin";
ALTER TABLE store_tablet_screen_sets ADD CONSTRAINT "CHK_store_tablet_screen_sets_origin"
  CHECK (origin IN ('store','operator','supplier'));

-- 4) 주체별 유효 조합 강제(무효 조합 저장 차단)
ALTER TABLE store_tablet_screen_sets ADD CONSTRAINT "CHK_stss_owner_scope" CHECK (
  (origin='store'    AND organization_id IS NOT NULL AND supplier_id IS NULL) OR
  (origin='operator' AND organization_id IS NULL     AND supplier_id IS NULL
                     AND service_key IS NOT NULL      AND created_by_user_id IS NOT NULL) OR
  (origin='supplier' AND organization_id IS NULL     AND supplier_id IS NOT NULL
                     AND service_key IS NOT NULL)
);
```

- status 값: operator=`operator_template`(기존 CHECK 에 존재). supplier 는 후속에서 `supplier_template` 등 추가 시 status CHECK 도 함께 확장(이 ADR 은 자리만 예약).
- 순서: (1)(2)(3) 은 무해 additive → (4) CHECK 는 기존 row 가 store 브랜치를 만족해야 추가 가능(아래 §5 확인).

### D5. API 격리 조건(주체별)

| API | 격리 조건 | 비고 |
|-----|----------|------|
| **Store API** | `origin='store' AND organization_id = $storeOrg` | 현재는 `organization_id=$org` 만 → **`origin='store'` 명시 추가 권장**(operator/supplier row 유입 후 방어). NULL-org row 는 등가비교로 이미 제외되나 명시 격리로 오염 원천 차단 |
| **Operator API** | `origin='operator' AND service_key = $svc` (+ 선택 `created_by_user_id`) | 신규 `/api/v1/{svc}/operator/*` |
| **Supplier API**(후속) | `origin='supplier' AND service_key = $svc AND supplier_id = $supplierId` | 신규 |
| **공개 runtime/QR resolver** | 기존 `id AND organization_id=$org` 유지 | operator/supplier 원본은 **공개 URL 미발급** → 이 경로 미도달(격리 자동) |

## 4. 결정된 질문 대응(사용자 제시 항목)

| 질문 | 결정 |
|------|------|
| 기존 `origin` 을 소유 주체로 계속 사용? | **예**(D1). supplier 추가, owner_type 신규 컬럼 없음 |
| `owner_type/owner_id` 추가? | **아니오**(D2). origin=owner_type, 주체별 전용 컬럼(polymorphic owner_id 반려) |
| 공급자 ID 별도 컬럼? | **예**(D3). `supplier_id` additive, organization_id 오버로드 금지 |
| organization nullable 전환? | **예**(D4-1), 단 CHECK 동반 필수 |
| 주체별 유효 조합 DB CHECK? | **예**(D4-4) `CHK_stss_owner_scope` |
| Store·Operator·Supplier API 격리 조건? | **D5** 표 |
| 기존 매장 row 무변경·백필 0 가능? | **예**(§5 실측) |

## 5. 기존 row 영향 — 무변경·백필 0 (프로덕션 실측)

- 전체 22 row 전량 `origin='store' AND organization_id IS NOT NULL`(store-without-org 0, non-store 0).
- 신규 `supplier_id` 는 default NULL → 기존 store row 는 `CHK_stss_owner_scope` 의 store 브랜치(`origin='store' AND org NOT NULL AND supplier_id IS NULL`) **자동 충족**.
- `service_key`/`created_by_user_id` 는 store 브랜치가 요구하지 않음 → 기존 값(대개 NULL) 무관.
- 참조 FK 는 전부 `id` 기준(blocks·corner_contents CASCADE·tablets SET NULL) → organization_id 변경과 무관.
- 인덱스 `idx_stss_org_status(organization_id,status) WHERE deleted_at IS NULL` — btree NULL 허용, 유지.
- **결론: UPDATE/backfill 0, 기존 row 그대로 CHECK 통과.**

## 6. Consequences

**장점**
- 무효 조합(§1)을 DB 가 원천 차단 → 애플리케이션 버그가 경계를 오염시킬 수 없음.
- organization_id 단일 의미(Store Ops, F6) 유지 → 매장 격리 쿼리 안전.
- operator 는 즉시, supplier 는 동일 스키마로 추가만 하면 되어 **가짜 organization 증식 없음**.
- 기존 매장 경로·공개 렌더·QR 무변경(backfill 0).

**비용/리스크**
- CHECK 추가로 잘못된 INSERT 는 즉시 실패 → 신규 operator/supplier write 경로는 조합을 정확히 채워야 함(설계 의도).
- `origin` 이 owner+provenance 겸용(D1 한계) — 후속에 provenance 분리 필요 시 additive 확장.
- supplier status 값(예: `supplier_template`)·supplier_id 참조 정책은 supplier 구현 WO 에서 확정(이 ADR 은 예약만).

## 7. 후속 구현 WO(권장 순서)

1. **migration WO**: D4 스키마(nullable + supplier_id + origin/CHECK). 배포·CHECK. (backfill 0)
2. **operator authoring WO**(= 이번 HOLD 된 FOUNDATION 재개): operator API(`origin='operator'`, org NULL, service_key, created_by) + Operator ContentSourceAdapter([[CHECK-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM]] 재사용, o4o 허용·author_role='operator' 허용·매장 저작 차단) + 제작기 4템플릿 재사용.
3. **store API 격리 명시화**: 기존 screen-set 쿼리에 `origin='store'` 추가(방어).
4. **supplier authoring WO**(후속): supplier status·supplier_id 정책 확정 후.

## 8. 미결 질문(구현 WO 에서 확정)

- supplier status 값 명칭 및 status CHECK 확장 범위.
- `supplier_id` 를 `organizations(type='supplier')` 에 대한 soft ref 로 둘지, 별도 supplier 도메인 식별자로 둘지.
- operator/supplier 원본의 "매장 가져오기(사본)" 진입점(별 WO — 이번 범위 밖, copy-on-import 불변식 준수).
- operator 원본 목록의 service_key 다중 소유(운영자가 여러 서비스 operator 인 경우) 노출 정책.

---

*소유 주체=origin(store/operator/supplier) discriminator + 주체별 전용 컬럼(organization_id 매장 전용·service_key·created_by_user_id·신규 supplier_id) + organization_id nullable + CHK_stss_owner_scope 로 무효 조합 차단. 기존 매장 row backfill 0. 구현은 후속 WO(migration→operator→store 격리→supplier). 코드·DB·migration 0 (본 문서는 설계 확정용).*
