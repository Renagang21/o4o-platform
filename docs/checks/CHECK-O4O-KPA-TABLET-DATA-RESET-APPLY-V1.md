# CHECK-O4O-KPA-TABLET-DATA-RESET-APPLY-V1

> WO: `WO-O4O-KPA-TABLET-DATA-RESET-APPLY-V1`
> 성격: 태블릿 **운영 데이터 초기화**(hard delete) — 사용자 승인 실행. schema/API/UI/public runtime 코드 **변경 0**.
> 선행: [DRY-RUN](CHECK-O4O-KPA-TABLET-DATA-RESET-DRYRUN-V1.md). 실행일: 2026-07-11. 채널: Cloud SQL Auth Proxy v2(프로덕션).

---

## 0. 결론

기존 태블릿 dev/smoke 잔여물을 **guarded 단일 트랜잭션**으로 초기화 완료. 태블릿은 **완전한 빈 운영 상태**. 보존 대상은 그대로 유지. 0-태블릿 상태에서 공개 런타임·관리 UI **크래시 없음** 확인.

## 1. 승인 범위 (실행)

| 대상 | 결과 |
|---|---|
| store_tablet_operator_idle_selections | **DELETE 2** |
| store_tablet_displays | **DELETE 2** |
| store_tablets | **DELETE 4** (idle_playlist_items 컬럼 동반) |
| display_settings / tablet_interest_requests / platform_store_slugs | **보존** |
| screen_sets / blocks | 이미 0 (대상 없음) |

## 2. 실행 방식 (guarded transaction)

`DO $$ ... $$` 단일 트랜잭션 — org 2개 스코프(`9c87f46b…` 네뚜레-약국 / `c9beb4a2…` sohae-약국), FK-safe 순서(selections → displays → tablets):

1. **PRECHECK**: 삭제 전 count 재확인 → `sel=2 disp=2 tab=4` (dry-run 일치).
2. **count guard**: 불일치 시 `RAISE EXCEPTION` → 전체 rollback(무삭제). → 일치라 통과.
3. DELETE 실행 → `GET DIAGNOSTICS` 로 실삭제 카운트 확인.

실행 로그:
```
NOTICE:  PRECHECK sel=2 disp=2 tab=4 (expected 2/2/4)
NOTICE:  DELETED sel=2 disp=2 tab=4
DO
```
→ dry-run 예상과 정확히 일치. hard delete(가역 아님) — schema/코드 무변경.

## 3. 사후검증 (read-only)

| 확인 | 기대 | 실측 |
|---|---:|---:|
| store_tablets | 0 | ✅ 0 |
| store_tablet_displays | 0 | ✅ 0 |
| operator idle selections | 0 | ✅ 0 |
| current_screen_set 적용 태블릿 | 0 | ✅ 0 |
| idle_playlist_items 보유 태블릿 | 0 | ✅ 0 |
| screen_sets / blocks | 0 / 0 | ✅ 0 / 0 |
| **display_settings (보존)** | 2 | ✅ 2 |
| **tablet_interest_requests (보존)** | 3 | ✅ 3 |
| **platform_store_slugs (보존)** | 2 | ✅ 2 |

## 4. 0-태블릿 상태 크래시 확인 (production smoke)

### 공개 런타임 (무인증, 두 매장 slug)
| slug | /screen | /idle | /products |
|---|---|---|---|
| 네뚜레-약국 | ✅ 200 `mode:legacy` | ✅ 200 items 0 | ✅ 200 |
| sohae-약국 | ✅ 200 `mode:legacy` | ✅ 200 items 0 | ✅ 200 |
→ 태블릿 0개에서 안전 legacy fallback, 크래시 0.

### 관리 UI (`/store/commerce/tablet-displays`, 약국 계정)
- ✅ 빈 상태 "등록된 태블릿이 없습니다" + 태블릿 추가 버튼 표시
- ✅ Screen Set 관리 영역 미표시(선택 태블릿 없음 → 정상)
- ✅ 페이지 렌더 정상, **console error 0**

## 5. 금지/준수

- schema / API / UI / public runtime **코드 변경 0** — 데이터 삭제만.
- guard: org 2개 스코프 + count guard(불일치 시 rollback) + FK-safe 순서 + 단일 트랜잭션.
- 보존 대상(display_settings / interest_requests / slugs) 무변경 확인.
- 병렬 세션 무접촉. proxy 정상 종료.

## 6. 완료 기준 대비

- [x] 승인 범위(selections 2 / displays 2 / tablets 4) 삭제
- [x] 보존 대상 유지 (settings 2 / interest 3 / slugs 2)
- [x] guarded transaction + count guard + FK-safe 순서 + 사후검증
- [x] 0-태블릿 공개 런타임·관리 UI 크래시 없음
- [x] 코드 변경 0
- [x] CHECK commit/push

## 7. 다음 단계

태블릿은 빈 운영 상태. 새 기준으로 코너/화면 세트 구성:
→ `WO-O4O-KPA-TABLET-FRESH-CORNER-SCREEN-SET-SEED-V1` 또는 관리 UI 수동 구성.
