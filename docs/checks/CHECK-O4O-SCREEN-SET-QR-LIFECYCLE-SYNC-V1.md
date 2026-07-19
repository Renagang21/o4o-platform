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
| api-server typecheck (내 파일) | ✅ 오류 0 (전체 error는 타 세션 미커밋 스크립트, 내 파일 무관) |
| web typecheck / build | ✅ EXIT 0 / EXIT 0 |
| **API 스모크 (배포 후 라이브)** | ✅ **PASS** (2026-07-19). 테스트 세트(자동 QR slug=`test-qr-lifecycle-smoke`): active→공개 **200** / archive(PATCH·DELETE)→**410 SCREEN_SET_INACTIVE** / restore(PATCH)→**200 동일 slug** / rename(편집)→**200(무영향)** / DELETE→**410 tombstone**. **slug·QR id 불변**(`fa27ef7f…`), 반복 archive/restore 멱등, `isActive` DB 토글 확인. |

### 스모크 중 발견 & 하드닝 (no-store)
- 상태의존 공개 GET(200/410)이 브라우저/edge에 캐시되어 restore 후에도 plain-GET이 410 지연 노출됨(테스트 브라우저 캐시 오염). QR `isActive` 토글 자체는 정상(cache-bypass GET·DB row 확인).
- → 공개 `/qr/public/:slug` 응답에 **`Cache-Control: no-store, must-revalidate`** 추가(commit 별도). fresh-scan(실제 QR 스캔=매번 새 브라우저) 검증에서 200/410 라이브 즉시 반영 확인.

### 일반 QR·다른 set·보호 샘플 (구조적 무영향)
- `setScreenSetQrActive`·public 410 분기 모두 **`landing_type='screen_set'` + 특정 `landing_target_id`** 한정 → 일반 QR(product/page/link/video)·다른 Screen Set QR **구조적으로 무영향**. 코너 적용/해제·블록 편집은 QR is_active 미접촉(status 전이에서만 변경).
- 스모크는 테스트 세트(id `7658f0c1…`)만 대상 → 보호 샘플(구강관리/피부관리) 무접촉.

## 5. 중지 조건 점검 (해당 없음)
- Screen Set QR/일반 QR 구분 = `landing_type='screen_set'`로 안전 구분 ✅
- archive/restore ↔ QR 상태 = **동일 트랜잭션** 처리 ✅
- 복원 시 기존 slug 유지 = ensure/setActive 모두 slug 불변 ✅
- 일반 QR `is_active` 계약 변경 불필요 ✅

## 6. 산출물
- 변경 파일 4 + 본 CHECK. **migration 0, DB 물리 삭제 0, 신규 컬럼 0**. commit=(아래) / 배포 후 스모크.
