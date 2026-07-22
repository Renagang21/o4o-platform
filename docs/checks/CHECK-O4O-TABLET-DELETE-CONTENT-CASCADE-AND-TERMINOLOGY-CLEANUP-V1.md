# CHECK-O4O-TABLET-DELETE-CONTENT-CASCADE-AND-TERMINOLOGY-CLEANUP-V1

> WO: `WO-O4O-TABLET-DELETE-CONTENT-CASCADE-AND-TERMINOLOGY-CLEANUP-V1`
> 선행: `CHECK-O4O-STORE-TABLET-LAST-MILE-UX-CLEANUP-V1`(orphan 발생 관측)
> 성격: 삭제 수명주기 정합성 보완(deleteTablet cascade) + 사용자 노출 표기 통일. DB 스키마·API 계약 0.
> Date: 2026-07-22 · commit 9a2489997 · 배포 deploy-api·deploy-neture·deploy-kpa success

---

## 0. 결론

`deleteTablet`(is_active=false)이 그 태블렛의 `store_tablet_corner_contents` 연결과 `current_screen_set_id` 참조를 남겨, 연결됐던 Screen Set 의 보관(archive)을 영구 차단(SCREEN_SET_IN_USE / ARCHIVE_BLOCKED_CONNECTED)하던 정합성 결함을 수정했다. deleteTablet 을 **단일 트랜잭션**으로 바꿔 `current_screen_set_id=NULL` + 연결 행 `DELETE` 를 함께 수행한다(과거 orphan 일괄정리 없음). 표기 '타블렛/태블릿' → '태블렛' 마무리 통일. **DB 스키마·API 계약 변경 0.**

## 1. orphan 발생 원인

- `store_tablets`·`store_tablet_corner_contents` 에는 `deleted_at` 컬럼이 **없다**(read-only 스키마 확인). 태블렛 삭제 = `is_active=false`(row 존치), 연결 행 = soft-delete 불가.
- 기존 deleteTablet(L322): `UPDATE store_tablets SET is_active=false` 만 수행 → **current_screen_set_id 와 corner_contents 를 그대로 남김**.
- archive-block(DELETE /screen-sets/:id, L1401·L1403): current_screen_set_id 참조를 **is_active 필터 없이** 검사 + corner_contents 연결 수 검사 → **비활성 태블렛에 남은 참조/연결이 Screen Set 보관을 이중 차단**.
- 결과: LAST-MILE-UX WO 검증 중 만든 사본 `bfcc2bf8` 가 삭제된 테스트 태블렛(4f48e392, is_active=false)의 잔존 current 참조 + corner_contents 로 archive 409.

## 2. deleteTablet 정리 방식과 트랜잭션 범위 (§범위 1·2)

`store-tablet.routes.ts` DELETE /tablets/:id — 단일 `dataSource.transaction`:
```
UPDATE store_tablets SET is_active=false, current_screen_set_id=NULL WHERE id=$1 AND organization_id=$2   -- affected=0 → 404
DELETE FROM store_tablet_corner_contents WHERE tablet_id=$1 AND organization_id=$2                        -- 이 태블렛 연결만
```
- corner_contents 는 soft-delete 컬럼 없음 → 기존 수동 연결 해제(DELETE /tablets/:id/screen-sets/:screenSetId, L2021)와 **동일하게 DELETE**. 태블렛 row 는 기존과 동일하게 is_active=false 로 존치(진열/idle 이력 보존).
- **과거 orphan 일괄정리 없음**(WO §범위 2): tablet_id 조건으로 삭제 대상 태블렛의 연결만 정리, 다른 태블렛/과거 orphan 무영향.

## 3. 프로덕션 smoke — ✅ PASS (renagang21 약국 매장, 2026-07-22, 배포 9a2489997)

E2E: 테스트 세트 생성 → 테스트 태블렛 생성 → 적용 → 태블렛 삭제 → 세트 archive. 네트워크:
```
POST /store/tablets 201 (d113a0da)
POST /store/screen-sets 201 (c2717d9d) · PUT …/blocks 200
POST /store/tablets/d113a0da/current-screen-set 200 (적용)
DELETE /store/tablets/d113a0da 200 (신규 cascade)
DELETE /store/screen-sets/c2717d9d 200 ✅ (archive 성공 — 이전 orphan의 409와 달리 차단 없음)
```
**DB 독립 검증**(o4o_api):
| 항목 | 결과 |
|------|:---:|
| 삭제된 태블렛 d113a0da current_screen_set_id | **NULL** ✅ |
| d113a0da 의 store_tablet_corner_contents 잔존 | **0** ✅ |
| 세트 c2717d9d | **status=archived · deleted_at 설정** ✅ |
| 보호 샘플(구강/피부 코너) current 유지 | **2건 불변** ✅ |

## 4. 다른 태블렛·Screen Set 불변 검증 (§검증)

- 삭제 대상 태블렛의 연결만 정리(tablet_id 조건). 보호 샘플 코너 2개(구강관리 기본 코너 안내형 / 피부관리 기본 화면 세트) 현재 화면·코너 적용 불변(DB 2건 확인). 기존 store 라이브러리·운영자 HUB 무변경.
- 기존 화면 바꾸기·되돌리기·공개 표시 회귀 없음(적용/current-screen-set·resolve 경로 무변경).

## 5. 표기 통일 내역 (§범위 3·4)

- web-neture 공급자: 사이드바 그룹 '매장용 타블렛'→'매장용 태블렛', 항목 '매장용 타블렛 콘텐츠'→'매장용 태블렛 콘텐츠'; `SupplierTabletScreenSetsPage` 헤딩·설명 '타블렛'→'태블렛'.
- web-kpa `TabletCornerContentsPanel`: '태블릿 콘텐츠 탭에서…'→'태블렛 콘텐츠 탭에서…' (프로덕션에서 라이브 확인).
- **범위 밖 잔여(정직 기록)**: 공유 편집기 패키지 `@o4o/tablet-screen-set-editor` 내부 '태블릿 화면 만들기'/'태블릿 화면' 등은 본 WO 4개 지정 항목 밖(별도 패키지) — 후속 소규모 정리 대상.

## 6. 코드·DB·배포 결과

- 변경 파일 4: `apps/api-server/.../store-tablet.routes.ts`(deleteTablet 트랜잭션) · `web-neture/…/SupplierSpaceLayout.tsx` · `web-neture/…/SupplierTabletScreenSetsPage.tsx` · `web-kpa/…/TabletCornerContentsPanel.tsx`.
- api-server 빌드 tsc(tsconfig.build.json) 0 · web tsc 0. **DB 스키마·migration·API 계약 변경 0.**
- 배포: deploy-api·deploy-neture·deploy-kpa-society success(9a2489997).

## 7. 테스트 데이터 정리

- part2 smoke 테스트 데이터: 태블렛 d113a0da(is_active=false) + 세트 c2717d9d(archived) → 앱 soft-delete 로 정리 완료. **신규 cascade 로 orphan 미형성**(연결·current 자동 정리) — LAST-MILE WO 와 달리 잔여 orphan 0.

## 8. 잔여 테스트 데이터(bfcc2bf8) 정리 — ✅ 완료 (정정 트랜잭션, 사용자 승인)

LAST-MILE WO 의 잔여 사본 `bfcc2bf8`(과거 orphan — 본 cascade 배포 이전 형성, §범위 2에 따라 자동 정리 대상 아님)을 사용자 승인 하에 정정된 최소 단일 트랜잭션으로 정리했다. `store_tablet_corner_contents`·`store_tablets` 에 `deleted_at` 컬럼이 없어 연결 행은 **hard DELETE 불가피**(기존 수동 연결 해제와 동일 계약).

**대상(각 1건, read-only 6-가드 사전 확인 후 진행)**: 태블렛 `4f48e392`(is_active=false·current=bfcc2bf8), orphan corner_contents `019e81b0`(tablet=4f48e392·set=bfcc2bf8, 유일), set `bfcc2bf8`(origin=store·미삭제·QR is_active=true). 활성 태블렛 참조 0.

**단일 트랜잭션(각 write 관계·상태 WHERE 포함, rowcount≠1 시 RAISE→ROLLBACK; 4단계 모두 =1 확인 후 COMMIT)**:
1. `store_tablets` 4f48e392 `current_screen_set_id = NULL` (rc=1)
2. `store_tablet_corner_contents` 019e81b0 **hard DELETE** (rc=1) — deleted_at 컬럼 없어 불가피
3. `store_tablet_screen_sets` bfcc2bf8 `deleted_at = NOW(), status='archived', updated_at=NOW()` (rc=1) — 공식 archive 계약과 동일
4. `store_qr_codes` (screen_set·bfcc2bf8) `is_active = false` (rc=1) — 공식 archive 의 `setScreenSetQrActive(false)` 와 동일

**독립 사후검증 — 전항목 PASS**: 4f48e392 current=NULL · 019e81b0 잔존 0 · bfcc2bf8 status=archived·deleted_at 설정 · 활성 태블렛 참조 0 · bfcc2bf8 corner_contents 0(orphan 0) · QR is_active=false · **보호 샘플 태블렛 2건(current 포함) 불변** · 대상 외 변경 0 · 테스트 데이터 순증 0. **코드·재배포 없음(문서만).**

> DB 접속 정정: 로컬 `apps/api-server/.env` 의 `DB_PASSWORD` 는 빈 값·`DB_USERNAME=o4o_user`(프로덕션 사용자는 **o4o_api**, 비밀번호는 Cloud Run env). 본 정리·검증은 올바른 프로덕션 DB 사용자로 정상 접속해 수행했다(자격증명 값은 문서·로그·커밋 미기록).

## 9. CHECK·commit·push

- 구현 커밋 `9a2489997`(4 files). 본 CHECK 별도 커밋.
