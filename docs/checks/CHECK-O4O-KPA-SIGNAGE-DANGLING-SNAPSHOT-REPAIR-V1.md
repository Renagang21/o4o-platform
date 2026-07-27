# CHECK — WO-O4O-KPA-SIGNAGE-DANGLING-SNAPSHOT-REPAIR-V1

**작업:** 프로덕션에 남아 있던 사이니지 dangling 참조 1건의 안전 보정
**선행 WO:** [CHECK-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1](CHECK-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1.md)
**성격:** 데이터 보정 전용 (코드 변경 없음). read-only 조사 → 문제확정 → 승인 후 최소 수정(1행 DELETE) → 검증.
**대상 DB:** 프로덕션 `o4o_platform` (cloud-sql-proxy `127.0.0.1:5442`, user `o4o_api`)

---

## 1. 대상

선행 WO 종료 시 보고된 유일한 잔여 dangling:

| 구분 | 값 |
|------|-----|
| dangling item | `d53b6711-0689-406b-b955-9b58d3a95aee` |
| 누락 snapshot | `b1247751-8581-4013-91ac-1b9309c1766f` |
| playlist | `8781cc03-e4f5-4734-8a64-9f25193767d0` |

`store_playlist_items.snapshot_id` (비-FK) → `o4o_asset_snapshots.id` 참조가 끊긴 상태. 새 삭제 가드는 **추가 손상 방지**만 담당하므로, 가드 적용 이전 손상분인 이 1건은 별도 보정이 필요했다.

## 2. 조사 (read-only)

| 항목 | 결과 |
|------|------|
| playlist | 이름 `E2E Signage Playlist`, `is_active=false`(재생 안 됨), `publish_status=published`, `created_at=2026-04-18` |
| 소속 조직 `8596a54f-2812-4cb9-933c-a92e80e95b6e` | **organizations 테이블에 존재하지 않음** (이미 삭제된 조직) |
| item `d53b6711…` | `display_order=0`, 이 playlist의 **유일한 item** |
| snapshot `b1247751…` | `o4o_asset_snapshots`에 **asset_type 무관 전무** — 완전 소실 |
| playlist 내 sibling snapshot | 0건 (원본 미디어 추적 단서 없음) |
| snapshot 참조 위치 | 이 item 1곳뿐 (`snap_refs_elsewhere=1`) |

## 3. 문제확정

- 이 건은 **삭제된 E2E 테스트 조직**의 **비활성 테스트 playlist**에 남은 유일 item.
- 참조 snapshot 행이 완전 소실되어 `source_asset_id`(원본 미디어) 추적 경로가 없음 → **4단계(snapshot 재생성)는 근거 자체가 없어 불가능**.
- playlist `is_active=false` → 재생 영향 없음.
- → WO 결정트리상 **5단계: 복원 근거 없음 + item 불필요 → dangling item만 제거**가 유일한 경로.

## 4. 최소 수정 (승인 후 실행)

프로덕션 DELETE는 사용자 승인 후 트랜잭션으로 실행. 영향 행 수 검증(`!= 1 → ROLLBACK`).

```sql
BEGIN;
DELETE FROM store_playlist_items
 WHERE id = 'd53b6711-0689-406b-b955-9b58d3a95aee'
   AND snapshot_id = 'b1247751-8581-4013-91ac-1b9309c1766f';
-- rowCount == 1 확인 → COMMIT (아니면 ROLLBACK)
COMMIT;
```

**범위 준수:** item 1행만 삭제. playlist(빈 컨테이너로 유지)·다른 snapshot·media·조직은 **미변경**.

실행 결과: `deleted_rows=1`, `COMMITTED`.

## 5. 검증

| 검증 | 결과 |
|------|------|
| 대상 item 잔존 | `0` |
| **전체 DB dangling census** (`store_playlist_items.snapshot_id` → 누락 snapshot) | **`0`건** |
| 재생 영향 | playlist `is_active=false`(재생 대상 아님) + 이제 item 0개 → 깨진 항목 렌더 없음 |
| 범위 외 변경 | 없음 (playlist/snapshot/media/organizations 행 수 불변) |

## 6. 종료

- 프로덕션 사이니지 dangling 참조 **전량 0건** 달성.
- 선행 WO의 삭제 가드(추가 손상 방지) + 본 WO의 기존 손상 보정으로, 사이니지 미디어 삭제가 매장 재생 구성을 깨는 위험이 **구조·데이터 양면에서 해소**됨.

---

*보정 대상 1건, DELETE 1행, 범위 외 변경 0. read-only 조사 + 승인 후 최소 수정 + 검증 완료.*
