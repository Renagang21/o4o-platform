# CHECK-O4O-KPA-TABLET-DATA-RESET-DRYRUN-V1

> WO: `WO-O4O-KPA-TABLET-DATA-RESET-DRYRUN-V1`
> 성격: **read-only 조사 전용** — DB write 0 / DELETE 0 / UPDATE 0 / archive 0 / migration 0 / 코드 변경 0.
> 검증 채널: Cloud SQL Auth Proxy v2 (프로덕션 read-only SELECT). 조사일: 2026-07-11.
> 목적: 기존 KPA 태블릿 관련 row 전수 조사 → 새 Screen Set/Block 모델 기준 초기화 대상 dry-run 확정.

---

## 0. 결론 요약

**현재 태블릿 데이터는 전부 개발·검증(smoke) 잔여물이다.** 실운영 코너/기기·화면 세트는 없다.

| 테이블 | row | 판정 |
|---|---:|---|
| store_tablets | 4 | **DELETE 후보** (전부 test/smoke 이름, 2개 test 약국 org) |
| store_tablet_displays | 2 | **DELETE 후보** (tablet 삭제 시 FK CASCADE 자동) |
| store_tablet_operator_idle_selections | 2 | **DELETE 후보** (전부 cleared, soft ref → 명시 삭제) |
| idle_playlist_items (store_tablets 컬럼) | 1 tablet | **DELETE 후보** (tablet row 삭제 시 동반) |
| store_tablet_screen_sets / blocks | 0 / 0 | 이미 비어 있음(정리 완료) — 대상 없음 |
| store_tablet_display_settings | 2 | **보류(optional)** — org 단위 기본값. 삭제 시 코드 기본값 복귀(무해). 태블릿 아님 |
| tablet_interest_requests | 3 | **범위 외(UNKNOWN)** — 고객 관심요청 기록. WO §3 초기화 대상 목록에 없음 → 별도 결정 |
| platform_store_slugs (태블릿 org) | 2 | **KEEP** — 매장 공개 식별자(태블릿 무관). 삭제 금지 |

**초기화 순삭제 대상(핵심): store_tablets 4 + displays 2(CASCADE) + operator selections 2.** apply 는 승인 후 별도 WO.

---

## 1. 조사한 테이블 (실제 명)

`store_tablets` · `store_tablet_displays` · `store_tablet_display_settings`(=tablet settings) · `store_tablet_operator_idle_selections` · `store_tablet_screen_sets` · `store_tablet_screen_blocks` · `store_tablets.idle_playlist_items`(jsonb 컬럼) · `tablet_interest_requests` · `platform_store_slugs`(공개 URL).

## 2. Row count / 식별값 (실측)

### store_tablets (4) — **전부 test/smoke**
| id | name | location | active | org | created | current_set | idle_items |
|---|---|---|:--:|---|---|:--:|---:|
| f4b12ff9… | 화장품 코너 | A - 1 섹터 | ✅ | 9c87f46b(네뚜레-약국) | 2026-06-25 | ✗ | 0 |
| fb428bf9… | SMOKE_타블렛 | 미리보기검증 | ✅ | c9beb4a2(sohae-약국) | 2026-06-26 | ✗ | 0 |
| d5a34b29… | [SMOKE-TABLET] 임시 | (null) | ✗ | 9c87f46b | 2026-06-27 | ✗ | 0 |
| 7a38abdc… | IDLE 검증 코너 B | 검증 | ✗ | 9c87f46b | 2026-07-03 | ✗ | 1 |

- org 분포: `9c87f46b`(네뚜레-약국) 3대 / `c9beb4a2`(sohae-약국) 1대 — **둘 다 test 약국 계정**.
- current_screen_set_id: **전부 NULL**. idle_playlist_items: 1대(7a38abdc)만 1건.

### 나머지
- **displays 2**: 전부 `local` · is_visible=true · content 없음 · **둘 다 tablet fb428bf9(SMOKE_타블렛)** 소속.
- **display_settings 2**: org 단위 1행씩. 값은 기본형(show 전부 on, auto 5/10·10/10). 태블릿 스코프 아님.
- **operator selections 2**: **둘 다 cleared**(active 0), tablet f4b12ff9, 2026-07-03. 이력 잔재.
- **screen_sets / blocks: 0 / 0** — 정리 완료(대상 없음).
- **tablet_interest_requests 3**: COMPLETED 2 + CANCELLED 1, 전부 2026-06-25(1일). 종료상태 test.
- **slugs**: `네뚜레-약국`(9c87f46b) · `sohae-약국`(c9beb4a2).

## 3. FK / 참조 영향 (실측 pg_constraint)

| 테이블 | FK | on delete | 참조 |
|---|---|---|---|
| store_tablet_displays.tablet_id | FK_store_tablet_displays_tablet | **CASCADE** | store_tablets |
| store_tablet_displays.content_id | …_content_id_fkey | SET NULL | kpa_store_contents |
| store_tablets.current_screen_set_id | FK_store_tablets_current_screen_set | SET NULL | store_tablet_screen_sets |
| store_tablets.organization_id | FK_store_tablets_org | CASCADE | organizations |
| store_tablet_screen_blocks.screen_set_id | …_set | CASCADE | store_tablet_screen_sets |
| tablet_interest_requests.(master_id/org) | …_fkey | CASCADE | product_masters / organizations |

- **store_tablets 를 참조하는 inbound FK = `store_tablet_displays`(CASCADE) 하나뿐.** → tablet 삭제 시 displays 자동 삭제.
- **operator_idle_selections 는 store_tablets 로의 FK 없음(soft ref)** → tablet 삭제해도 자동 삭제 안 됨 → **명시 삭제 필요**.
- display_settings 는 org 단위(태블릿 FK 없음). idle_playlist_items 는 store_tablets 컬럼(row 삭제 시 동반).

## 4. Public runtime 영향 (태블릿 0개 시)

`resolveTabletDisplaySource(storeId, tabletId)` 기준(PUBLIC-RUNTIME-READ 검증 기반):
- **태블릿 0개** → tabletId null → `/products` = legacy_fallback(전체 active 상품, display 제한 없음), `/idle` = items 0, `/screen` = `mode:'legacy'`. **크래시 없음**(공개 200).
- **삭제된 tabletId bookmark** → 유효 active tablet 아님 → first-active fallback(없으면 null) → 안전 legacy/빈 응답.
- **current_screen_set_id NULL / 세트 없음** → `/screen` legacy fallback(이미 구현·검증). 안전.
> 근거: PUBLIC-RUNTIME-READ smoke 에서 0-item·legacy 경로 200 확인.

## 5. 관리 UI 영향 (`/store/commerce/tablet-displays`, 태블릿 0개 시)

- 빈 상태 UI 존재: "등록된 태블릿이 없습니다" + "새 태블릿 추가" 버튼(LOCATION-FIRST-UX-REFIT-V1). **안전**.
- Screen Set 관리 영역은 `selectedTabletId` 있을 때만 렌더 → 태블릿 0개면 미표시(깨짐 없음).
- 새 태블릿/코너 재생성 가능(createTablet). 기존 screen set 없어도 화면 정상.

## 6. dry-run DELETE SQL (⚠️ 미실행 — apply WO 용)

> **실행 금지.** 아래는 apply WO 에서 사용할 **guarded** SQL 초안. 예상 삭제 수는 §2 실측 기준.
> guard = **태블릿 소유 org 2개**(둘 다 test 약국). 전 태블릿이 test 이므로 org-scope = 전량 초기화.

```sql
-- 대상 org (태블릿 보유 test 약국 2곳)
--   9c87f46b-57a1-4afe-80bd-60782c49ce96  (네뚜레-약국, 3대)
--   c9beb4a2-04d2-4d7d-a694-0207f7bac048  (sohae-약국, 1대)

-- [apply 시] 단일 트랜잭션 권장. dry-run 검증은 아래 SELECT 로 먼저.

-- (0) 삭제 전 예상 건수 확인 (read-only)
SELECT 'operator_selections', count(*) FROM store_tablet_operator_idle_selections
  WHERE organization_id IN ('9c87f46b-57a1-4afe-80bd-60782c49ce96','c9beb4a2-04d2-4d7d-a694-0207f7bac048');   -- 예상 2
SELECT 'displays', count(*) FROM store_tablet_displays
  WHERE tablet_id IN (SELECT id FROM store_tablets
    WHERE organization_id IN ('9c87f46b-57a1-4afe-80bd-60782c49ce96','c9beb4a2-04d2-4d7d-a694-0207f7bac048'));  -- 예상 2
SELECT 'tablets', count(*) FROM store_tablets
  WHERE organization_id IN ('9c87f46b-57a1-4afe-80bd-60782c49ce96','c9beb4a2-04d2-4d7d-a694-0207f7bac048');   -- 예상 4

-- (1) operator idle selections (soft ref → 명시 삭제)  [예상 2]
DELETE FROM store_tablet_operator_idle_selections
WHERE organization_id IN ('9c87f46b-57a1-4afe-80bd-60782c49ce96','c9beb4a2-04d2-4d7d-a694-0207f7bac048');

-- (2) tablet displays (아래 tablets 삭제 시 CASCADE 되지만 명시적으로 먼저 — 감사 명확화)  [예상 2]
DELETE FROM store_tablet_displays
WHERE tablet_id IN (SELECT id FROM store_tablets
  WHERE organization_id IN ('9c87f46b-57a1-4afe-80bd-60782c49ce96','c9beb4a2-04d2-4d7d-a694-0207f7bac048'));

-- (3) tablets (idle_playlist_items 컬럼 동반, displays CASCADE)  [예상 4]
DELETE FROM store_tablets
WHERE organization_id IN ('9c87f46b-57a1-4afe-80bd-60782c49ce96','c9beb4a2-04d2-4d7d-a694-0207f7bac048');

-- (4) [보류·optional] org 단위 전시 설정 초기화(코드 기본값 복귀). 태블릿 아님 → 기본 미포함.
-- DELETE FROM store_tablet_display_settings
-- WHERE organization_id IN ('9c87f46b-57a1-4afe-80bd-60782c49ce96','c9beb4a2-04d2-4d7d-a694-0207f7bac048');

-- screen_sets / blocks: 이미 0 → 대상 없음.
-- tablet_interest_requests: 범위 외(별도 결정) → 미포함.
```

**삭제 순서 근거(FK)**: operator_selections(soft, 자동삭제 안됨) → displays(명시, 아니면 tablets CASCADE) → tablets. current_screen_set/screen_blocks 는 이미 0.

## 7. 분류 정리

**DELETE 후보 (초기화 핵심)** — 예상 총: tablets 4 + displays 2 + operator selections 2 (idle_playlist_items 는 tablet 컬럼 동반).
**보류(optional)** — display_settings 2 (org 기본값, 무해). 승인 시 포함 가능.
**범위 외/UNKNOWN** — tablet_interest_requests 3 (고객 기록, WO 대상 아님 → 별도 결정).
**KEEP** — schema · API/UI/runtime 코드 · migration 이력 · platform_store_slugs(매장 식별자).

## 8. 완료 기준 대비

| 완료 기준 | 상태 |
|---|:--:|
| 초기화 대상 row 전수 파악 | ✅ §2 |
| 삭제/보존/보류 분류 | ✅ §0·§7 |
| dry-run DELETE SQL 작성(미실행) | ✅ §6 |
| DB write 0 / 코드 변경 0 | ✅ (SELECT·조사만) |
| CHECK 문서 commit/push | ✅ 본 커밋 |

## 9. ⚠️ apply 전 승인 필요

- 본 문서의 DELETE SQL 은 **실행하지 않았다.** 실제 초기화는 **사용자 승인 후 `WO-O4O-KPA-TABLET-DATA-RESET-APPLY-V1`** 에서 수행한다.
- apply 는 (a) 삭제 전 SELECT 예상건수 확인, (b) 단일 트랜잭션, (c) org guard, (d) 사후 재검증(잔여 0 + 기존 무관 데이터 불변) 을 포함한다.
- **display_settings 포함 여부**와 **tablet_interest_requests 처리**는 apply 승인 시 명시 확인.

## 10. 다음 단계

승인 시 → `WO-O4O-KPA-TABLET-DATA-RESET-APPLY-V1` → 이후 `WO-O4O-KPA-TABLET-FRESH-CORNER-SCREEN-SET-SEED-V1`(또는 수동 구성).
