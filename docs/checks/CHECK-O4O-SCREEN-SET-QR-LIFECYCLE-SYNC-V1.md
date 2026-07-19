# CHECK-O4O-SCREEN-SET-QR-LIFECYCLE-SYNC-V1

> WO-P1a (ADR H2 구현): Screen Set archive/restore ↔ 종속 QR `is_active` 동기화 + 비활성 QR 410 종료 안내.
> 신규 테이블·컬럼·migration 0. 기존 `store_qr_codes.is_active` 재사용.

---

## 1. 조사 결과 (경로 확정)

- **Archive 경로 2개**(둘 다 `status='archived'` 전이):
  - `PATCH /store/screen-sets/:id {status:'archived'}` (deleted_at NULL, **보관 필터 노출·복원 가능**) — [store-tablet.routes.ts:1284](../../apps/api-server/src/routes/platform/store-tablet.routes.ts)
  - `DELETE /store/screen-sets/:id` (deleted_at + status='archived', **tombstone**, 복원 엔드포인트 없음) — UI '보관' 버튼(archiveScreenSet) — [:1358](../../apps/api-server/src/routes/platform/store-tablet.routes.ts)
- **Restore 경로**: `PATCH status='active'|'draft'`(deleted_at NULL 대상). DELETE된 것은 복원 불가(tombstone) → H2 정합.
- **Screen Set QR 식별**: `store_qr_codes WHERE landing_type='screen_set' AND landing_target_id=<setId> AND organization_id=<org>` — 1 QR/set(부분 unique). 일반 QR(product/page/link/video)·다른 set QR과 명확 구분.
- **Public 랜딩**: `GET /qr/public/:slug` 초기 조회가 `is_active=true` 필터 → 비활성이면 일반 404. — [store-qr-landing.controller.ts:117](../../apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts)

## 2. 변경 (신규 테이블·컬럼·migration 0)

| 파일 | 변경 |
|------|------|
| [store-screen-set-qr.service.ts](../../apps/api-server/src/routes/platform/store-screen-set-qr.service.ts) | **`setScreenSetQrActive(executor, org, setId, active)`** 신설 — screen_set QR만 `is_active` 토글, **slug·row·target 불변**(재사용/재생성/삭제 없음). 트랜잭션 executor 주입형 |
| [store-tablet.routes.ts](../../apps/api-server/src/routes/platform/store-tablet.routes.ts) DELETE | soft-delete(archive) + `setScreenSetQrActive(false)` **동일 트랜잭션** |
| [store-tablet.routes.ts](../../apps/api-server/src/routes/platform/store-tablet.routes.ts) PATCH | status 전이 시 QR 동기화: `archived→false`, `active/draft(=restore)→true`. name→QR title 갱신과 함께 **동일 트랜잭션** |
| [store-qr-landing.controller.ts](../../apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts) | 초기 조회에서 `is_active` 필터 제거 + `is_active` 선택. **비활성 + landing_type='screen_set' → 410 `SCREEN_SET_INACTIVE`** ("현재 사용할 수 없는 화면입니다. 매장에서 새로 안내받은 QR을 이용해 주세요."). 일반 QR 비활성은 **기존 404 유지**(계약 무변경) |
| [QrLandingPage.tsx](../../services/web-kpa-society/src/pages/qr/QrLandingPage.tsx) | 410/`SCREEN_SET_INACTIVE` 감지 → 전용 종료 화면. PublicScreenSetViewer는 prop 소비(재fetch 없음) → 변경 불필요 |

## 3. H2 계약 충족

| H2 규칙 | 구현 |
|--------|------|
| 정상=같은 slug 활성 | ✅ ensureScreenSetQr(멱등) 유지 |
| archived→QR 비활성 | ✅ PATCH archived / DELETE 모두 is_active=false (트랜잭션) |
| 복원→동일 slug 재활성 | ✅ PATCH active/draft → is_active=true (slug 불변, 새 QR 생성 안 함) |
| 영구삭제→tombstone | ✅ DELETE=deleted_at, QR row 보존·비활성(slug 재사용 금지 = 전역 unique) |
| 비활성 QR 접속 종료 안내 | ✅ 410 + 문구 + 프론트 종료 화면 |
| slug 재사용 금지 | ✅ slug 전역 unique, 재생성 없음 |
| 편집·코너 적용/해제 무영향 | ✅ QR is_active 는 status 전이에서만 변경 |
| 일반 QR is_active 계약 별도 | ✅ 일반 QR 비활성=기존 404, 수동 계약 무변경 |

## 4. 검증

| 항목 | 결과 |
|------|------|
| api-server typecheck (내 3파일) | ✅ 오류 0 (전체 10 error는 타 세션 미커밋 스크립트, 내 파일 무관) |
| web typecheck / build | ✅ EXIT 0 / EXIT 0 (14.05s) |
| API/브라우저 스모크 | ⏳ 배포 후 — 테스트 세트 생성(자동 QR)→/qr/{slug} 정상→archive→410 종료→restore→복구, slug·QR id 불변, 일반 QR 불변, 편집/적용 무영향 확인. 테스트 세트 정리. |

## 5. 중지 조건 점검 (해당 없음)
- Screen Set QR/일반 QR 구분 = `landing_type='screen_set'`로 안전 구분 ✅
- archive/restore ↔ QR 상태 = **동일 트랜잭션** 처리 ✅
- 복원 시 기존 slug 유지 = ensure/setActive 모두 slug 불변 ✅
- 일반 QR `is_active` 계약 변경 불필요 ✅

## 6. 산출물
- 변경 파일 4 + 본 CHECK. **migration 0, DB 물리 삭제 0, 신규 컬럼 0**. commit=(아래) / 배포 후 스모크.
