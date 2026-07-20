# CHECK-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1 — ⛔ HOLD (중지 조건 발동)

> WO: `WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1`
> 성격: 운영자 Screen Set 원본 제작기 foundation.
> Date: 2026-07-20
> **상태: HOLD** — 실행 순서 1~2(조사·경계 확인) 수행 후 **중지 조건 확정**. 코드·DB write 0. 사용자 결정 = "여기서 중지하고 보고".

---

## 0. 결론

독립 운영자 원본을 저장하려면 `store_tablet_screen_sets.organization_id`(**NOT NULL**)에 값이 필요하나 **운영자는 organization 이 없다**. 이를 채우려면 Sentinel/가짜 organization 이 필요하므로 **WO 중지 조건 발동**:

- **"운영자 원본 저장에 가짜 매장 organization이 필요함"**
- **"기존 `operator_template` 계약으로 독립 원본을 표현할 수 없음"**

**Sentinel org(`00000000-…`)는 사용하지 않는다** — 운영자 원본을 가짜 매장 소유로 기록하고, organization 기반 권한·검색·삭제 로직에 영구 예외가 필요하며, "매장 API 자동 차단" 가정에 의존하고, 향후 공급자 원본까지 가짜 organization 이 늘어나므로 이번 WO 의 중지 조건에 **정확히 해당**한다. **이번 WO 는 migration 0 이므로 nullable migration 도 만들지 않는다.** 코드·DB 변경 없이 HOLD 종료.

---

## 1. 기존 `operator_template` 계약 확인 (실행 1) — 완료

`store_tablet_screen_sets`(migration `20270120000000`) 프로덕션 실측(read-only):
- `origin ∈ {store, operator}` (CHECK), `status ∈ {draft, active, archived, operator_template}` (CHECK).
- `organization_id UUID` **NOT NULL**(is_nullable=NO) · `service_key` NULL · `tablet_id` NULL · `created_by_user_id` NULL · `template_key` NULL.
- **organization_id 에 FK 없음**(soft ref — organizations 참조 안 함). 제약 = origin/status CHECK + PK(id)뿐.
- 설계 주석(경계 F6): "organization_id = Store Ops(soft ref); **service_key = 운영자 템플릿(Broadcast)**".
- 기존 row 전량 `origin='store'`·`service_key=NULL`(active 12/archived 7/draft 3). **operator_template·origin='operator' row 0건**.

## 2. 운영자 API·권한 경계 (실행 2) — 완료(설계만)

- 운영자 콘텐츠 컨트롤러 표준(`operator-blog.controller.ts` 등): `(dataSource, requireAuth, serviceKey)` → `/api/v1/{serviceKey}/operator/*`, inline guard `hasAnyServiceRole([{svc}:operator, {svc}:admin, platform:admin, platform:super_admin])`.
- 서버 강제: `author_role='operator'`, `service_key=주입`, **`store_id=NULL`**(매장 무귀속), 소유권=`created_by_user_id`.
- 즉 운영자 콘텐츠 관례 = **"매장 없음(NULL) + service_key 스코프"**. `store_blog_posts` 실측: operator row `store_id IS NULL`. `kpa_store_contents` 는 `author_role`(operator/store)로 구분.

## 3. 중지 확정 — organization_id NOT NULL vs 운영자 무조직

| 사실 | 근거(프로덕션 실측) |
|------|------|
| 운영자는 organization 없음 | `role_assignments` 전량 `scope_type='global'`(scope_id NULL). `service_memberships` 에 organization 컬럼 없음. |
| 운영자 콘텐츠 관례 = org/store NULL + service_key | `store_blog_posts.author_role='operator'` → `store_id IS NULL`. |
| `store_tablet_screen_sets.organization_id` = NOT NULL | §1. NULL 저장 불가 → 값 필요. |

해소 후보 전부 WO 제약/중지 조건과 충돌 → **HOLD**:

| 후보 | 판정 |
|------|------|
| Sentinel org `00000000-…` | ❌ 가짜 매장 소유 기록·org 로직 영구 예외·차단 가정 의존·공급자 확장 시 증식 → **중지 조건 "가짜 매장 organization" 해당**(사용자 명시 거부) |
| organization_id nullable migration | ❌ 이번 WO 제외("신규 컬럼·migration") + "DB migration 0" → 이번 WO 에서 만들지 않음 |
| 실 매장/조직 org 차용 | ❌ 중지 조건 "가짜 매장 organization" 직접 해당 |

## 4. organization 기반 소비처 영향 범위 (후속 설계용)

`store_tablet_screen_sets` 는 **소프트 ref**(organization_id FK 없음) — organization_id nullable 전환 시 **스키마 파급 최소**.

**참조 FK(모두 `id` 기준, organization_id 무관)**: `store_tablet_screen_blocks`(CASCADE) · `store_tablet_corner_contents`(CASCADE) · `store_tablets.current_screen_set_id`(SET NULL).

**인덱스**: `idx_stss_org_status (organization_id, status) WHERE deleted_at IS NULL` — btree 는 NULL 허용, nullable 전환에도 유효(store 조회 성능 유지).

**organization_id 로 screen set 을 필터하는 코드 소비처(전량 `= $storeOrg` 등가 비교)**:
| 소비처 | 위치 | 영향 |
|--------|------|------|
| Store API 목록/상세/생성/수정/삭제/blocks/current-set/corner 연결 | `store-tablet.routes.ts` (1217·1233·1272·1289·1412·1442·1582·1656) | `organization_id = $storeOrg` → **NULL org(운영자) row 는 SQL 등가비교로 자동 제외**. 매장 격리 유지에 코드 변경 불필요 |
| 공개 runtime/QR resolver | `store-public-screen-set-resolve.ts:126` (`AND organization_id=$2`) | 운영자 원본은 **공개 URL 미발급**(WO 범위 밖)이라 이 경로 미도달. 영향 없음 |
| Screen Set QR slug ensure/update | `store-screen-set-qr.service.ts` (88·109·142·152, `WHERE id=$ AND organization_id=$`) | 운영자 원본 QR 미발급 → 미도달. 영향 없음 |

→ **핵심**: nullable 전환 시 기존 store/public/QR 경로는 `= $storeOrg` 등가비교로 NULL-org 운영자 row 를 자연 제외. 매장 격리·공개 렌더 회귀 위험 낮음. 운영자 API 는 별도 `origin='operator' AND service_key=$svc` 로 조회.

## 5. 최소 migration 안 (별도 후속 설계 WO 용 — 이번 WO 에서 실행 안 함)

```sql
-- (A) 최소안: organization_id nullable 전환
ALTER TABLE store_tablet_screen_sets ALTER COLUMN organization_id DROP NOT NULL;
-- 운영자 원본: organization_id = NULL, origin='operator', status='operator_template', service_key=<svc>, created_by_user_id=<operator>
```
- 파급: FK 없음·인덱스 NULL 허용·store 조회는 등가비교로 NULL 제외 → **데이터 backfill 0, 기존 row 무변경**.
- 보강(권장, 정합성): origin 별 소유권 불변식을 DB CHECK 로 명문화(선택).
```sql
-- (B) 보강안: origin 에 따른 소유권 CHECK (owner_role/owner_id 도입 여부는 설계 WO 에서 결정)
ALTER TABLE store_tablet_screen_sets ADD CONSTRAINT "CHK_stss_owner_by_origin" CHECK (
  (origin = 'store'    AND organization_id IS NOT NULL) OR
  (origin = 'operator' AND service_key IS NOT NULL AND created_by_user_id IS NOT NULL)
);
```
- 장기적으로는 `organization_id nullable + owner_role/owner_id 또는 origin 기반 CHECK` 가 더 정합적 — **별도 설계 WO 에서 확정**(공급자 원본 확장 대비 포함).

## 6. 조사 채널·안전

- 프로덕션 DB **read-only SELECT/카탈로그 조회만**(cloud-sql-proxy:5442, o4o_api, o4o_platform). **write 0**.
- 코드 변경 0 · 배포 0 · migration 0 · 보호 샘플·기존 매장 Screen Set 무접촉.

---

## 완료 보고(HOLD)

1. **operator_template 계약**: origin/status/service_key 축 존재, organization_id **NOT NULL**·FK 없음, 운영자 row 0.
2. **운영자 API·권한 경계**: `/api/v1/{svc}/operator/*` + role guard, 운영자 콘텐츠 관례 = store/org NULL + service_key.
3. **중지 원인**: organization_id NOT NULL ↔ 운영자 무조직 → 독립 원본 저장에 가짜 organization 필요(**중지 조건 발동**). Sentinel 거부, migration 미생성.
4. **영향 범위**: soft-ref(FK 0)·store/public/QR 는 `=$storeOrg` 등가비교로 NULL-org 자동 제외·운영자 원본 공개 URL 미발급이라 resolver/QR 미도달.
5. **최소 migration 안**: `ALTER COLUMN organization_id DROP NOT NULL`(+선택 origin CHECK) — backfill 0·기존 row 무변경. 별도 설계 WO 로 확정.
6. **산출물**: 본 CHECK 만(docs-only). 코드·DB·migration 0.
