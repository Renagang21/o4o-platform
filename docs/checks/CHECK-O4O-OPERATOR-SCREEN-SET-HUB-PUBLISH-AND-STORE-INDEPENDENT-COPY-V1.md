# CHECK-O4O-OPERATOR-SCREEN-SET-HUB-PUBLISH-AND-STORE-INDEPENDENT-COPY-V1

> WO: `WO-O4O-OPERATOR-SCREEN-SET-HUB-PUBLISH-AND-STORE-INDEPENDENT-COPY-V1`
> 선행: `ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1` · `WO-O4O-SCREEN-SET-OWNER-SCOPE-SCHEMA-MIGRATION-V1` · `WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1`
> 성격: 운영자 원본 HUB 노출 + 매장 독립 사본(가져오기=사본). 신규 테이블·migration 0.
> Date: 2026-07-21

---

## 0. 결론

운영자 Screen Set 원본(`origin='operator'`·`status='operator_template'`)을 **기존 HUB 체계**(`/api/v1/hub/contents` sourceDomain 추가)에 노출하고, 매장이 가져오면 **매장 소유 독립 사본**(새 ID 값 복사, FK·동기화 없음)을 만든다. 신규 HUB 테이블·컬럼·migration **0**.

## 1. 재사용한 HUB·복사 기반 (실행 1)

| 재사용 | 위치 | 방식 |
|--------|------|------|
| HUB 통합 조회 | `modules/hub-content/*` (`GET /api/v1/hub/contents`) | `sourceDomain='screen-set'` **추가**(신규 HUB 테이블 0) |
| 가져오기=사본 불변식 | `docs/ir/IR-O4O-COPY-ON-IMPORT-INVARIANT-AUDIT-V1.md` | 원본 id 는 **추적 metadata 로만**, FK 금지 |
| provenance 원장 | `store_asset_derivations` + `recordDerivations()` | 기존 테이블 재사용(**FK 없음**) — 신규 컬럼 0 |
| 반복 가져오기 정책 | `WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1` | **매 호출 새 사본**(UNIQUE 제거된 기존 관례 준수) |
| 미리보기 | 기존 `POST /screen-sets/preview`(draft preview) | 별도 preview API 미신설 — 원본 blocks 를 넣어 **내 매장 기준** 렌더 |
| 매장 사본 QR | 기존 `withQrLink`/`ensureScreenSetQr` | 매장 Screen Set 규칙 그대로 |

- `store_tablet_screen_sets` 에는 metadata/jsonb 컬럼이 **없다** → 출처 ID 는 세트 row 가 아니라 `store_asset_derivations` 에 기록(WO "기존 메타데이터가 수용할 때만" 충족, 신규 컬럼 0).

## 2. 운영자 원본 HUB 노출 조건 (실행 2)

```sql
origin = 'operator' AND status = 'operator_template'
AND service_key = <현재 서비스> AND deleted_at IS NULL
```
- 적용 위치: `hub-content.service.queryScreenSet()`(공개 목록) + `/api/v1/store/screen-set-hub/templates`(매장 인증 목록·검색·템플릿 필터) — **동일 WHERE**.
- 미노출: 다른 service_key / 보관·삭제(status·deleted_at) / 매장(`origin='store'`) / 공급자(`origin='supplier'`) Screen Set.
- **운영자 원본에 공개 타블렛 URL·Screen Set QR 미발급** — `public_qr_slug` 미노출, `withQrLink`/`ensureScreenSetQr` 호출 없음. 미리보기는 인증된 매장 화면에서만.
- legacy `idle_touch_video` 는 신규 선택·추천 대상 아님(템플릿 필터 4종만 제공).

## 3. service_key·역할 격리 (실행 2)

- 운영자 원본은 `kpa.routes` 가 `serviceKey='kpa'` 로 주입 → `service_key='kpa'` 저장. 매장 HUB 는 **동일 상수** `OPERATOR_TEMPLATE_SERVICE_KEY='kpa'` 로 조회(주석에 `kpa` ≠ `kpa-society` 혼용 금지 명시).
- 매장 엔드포인트는 `withStoreAuth`(requireAuth + store owner) — 매장 org 인증 필요.
- 운영자 제작 API 는 별도 라우터(`/api/v1/kpa/operator/screen-sets`, operator/admin 역할)로 유지 — 권한 경로 분리.

## 4. 매장 사본 생성 계약 (실행 3)

`POST /api/v1/store/screen-set-hub/templates/:id/import` — **단일 트랜잭션**:
1. 원본 소유권·서비스·상태 재검증(트랜잭션 밖 선검증 + 안에서 재확인 → 동시 보관·삭제 방어).
2. 매장 사본 INSERT: `organization_id=<매장>` · `origin='store'` · `status='active'` · `service_key=<대상 서비스>` · `supplier_id=NULL` · `tablet_id=NULL` · `template_key`·`name` 복사 · `created_by_user_id=<가져온 사용자>`.
3. 블록 값 복사(`INSERT ... SELECT`): `block_type` · `sort_order` · `is_visible` · `config` → **새 ID**.
4. `CHK_stss_owner_scope` store 브랜치로 사본 계약 DB 검증(무효 조합 저장 불가).
5. 생성 사본 반환(+ `withQrLink` = 매장 QR 규칙).

## 5. 복사한 필드 / 제외한 필드 (실행 3)

**복사**: template_key · 콘텐츠명 · 블록 종류/순서/표시 상태(`is_visible`) · 대기 화면 설정 · 코너 제목·HTML 본문 · 추가 정보 목록/순서/표시/제목·요약 override · 상품·QR 안내 블록 설정 — 모두 `config` jsonb 통째 복사로 보존.

**제외**: 원본 ID 를 소유권 FK 로 연결 ❌ · 운영자 QR·slug(`public_qr_slug` 미복사) ❌ · 코너·타블렛 연결(`tablet_id=NULL`) ❌ · current 적용 상태 ❌ · archive/deleted 상태(항상 `active` 로 생성) ❌ · 원본의 organization/tablet 관계 ❌.

## 6. 반복 가져오기 및 provenance (실행 3)

- **반복 허용**: 호출마다 새 사본(기존 `WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1` 관례 — UNIQUE 제약 없음, "이미 가져옴" 차단 없음). 기존 복사 계약과 충돌 없음.
- **provenance**: `recordDerivations()` best-effort — `source_kind='operator_screen_set'`, `source_id=<원본>`, `derived_kind='screen_set'`, `derived_id=<사본>`, org·service_key·created_by·`metadata.importedAt`. **FK 없음 · 실패해도 가져오기 성공**(추적 전용). 신규 kind 2개는 application-level 카탈로그에 추가(DB enum 없음 → migration 0).

## 7~11. 독립성·회귀 검증 (실행 5·6·7) — DEFERRED (배포 후 프로덕션 검증)

- [ ] 운영자 원본 수정 → 기존 매장 사본 불변
- [ ] 운영자 원본 보관·삭제 → 매장 사본 조회·수정·렌더 정상
- [ ] 매장 사본 수정·삭제 → 운영자 원본 불변
- [ ] 두 매장이 같은 원본을 가져와도 서로 독립 / 같은 매장 반복 가져오기 = 독립 사본 2개
- [ ] 코너 자동 미적용(current 미지정 · "코너에는 아직 적용되지 않았습니다" 안내)
- [ ] 타블렛 idle_media 포함 · QR 채널 idle 제외(기존 resolver 규칙 유지)
- [ ] 보호 샘플(구강/피부)·current 불변, 기존 매장 목록·공개 타블렛·QR 회귀 0
- [ ] console/pageerror/예상 외 API 오류 0

## 12. DB·migration·백필

- **신규 테이블·컬럼·migration·백필 0.** 사본 INSERT 외 기존 데이터 변경 없음. 기존 매장 Screen Set 무변경.

## 13. typecheck·test·build (실행 8)

- `@o4o/api-server` tsc(내 파일): **0** · `@o4o/web-kpa-society` tsc: **0** · `@o4o/types` build OK.
- 인접 회귀 테스트: `store-public-tablet-screen` · `store-tablet-idle-block` · `store-public-tablet-content-resolve` **23 PASS**.

## 14. 변경 파일

```
packages/types/src/hub-content.ts                                  (HubSourceDomain 'screen-set' + 라벨 + templateKey/blockCount)
apps/api-server/src/modules/hub-content/hub-content.controller.ts  (VALID_DOMAINS 'screen-set')
apps/api-server/src/modules/hub-content/hub-content.service.ts     (queryScreenSet + mapScreenSetItem + dispatch)
apps/api-server/src/routes/o4o-store/services/store-asset-derivation.service.ts (kind 카탈로그 2종 추가)
apps/api-server/src/routes/platform/store-tablet.routes.ts         (/screen-set-hub/* 목록·상세·가져오기 트랜잭션)
services/web-kpa-society/src/api/storeScreenSetHub.ts              (신규 API 클라이언트)
services/web-kpa-society/src/pages/pharmacy/HubScreenSetLibraryPage.tsx (신규 HUB 페이지)
services/web-kpa-society/src/App.tsx                               (라우트 /store-hub/screen-set)
services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx (HUB 사이드바 '타블렛 화면')
```

## 15. 중지 조건 점검

| 조건 | 발생? |
|------|:-----:|
| 독립 복사에 신규 소유권 FK 필요 | ❌ (값 복사·FK 0) |
| provenance 에 신규 컬럼·테이블 필수 | ❌ (기존 `store_asset_derivations` 재사용) |
| 기존 HUB 가 Screen Set 수용 불가 | ❌ (sourceDomain 추가로 수용) |
| 추가 정보가 운영자 전용 비영구 원천 참조 | ❌ (content_list=O4O 표준 설명서 영구 원천. 운영자 adapter 가 매장 콘텐츠 차단) |
| 반복 가져오기 정책 충돌 | ❌ (기존 "매 호출 새 사본" 관례와 일치) |
| 미리보기에 운영자 QR 발급 필요 | ❌ (인증 매장 화면 + 기존 draft preview 재사용) |
