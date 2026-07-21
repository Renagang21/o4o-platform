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

## 7~11. 독립성·회귀 검증 (실행 5·6·7) — ✅ PASS (프로덕션, 2026-07-21)

테스트 데이터: 운영자 원본 3건 생성(검증 후 전량 정리) · 매장 사본 3건(전량 정리). 보호 샘플 무접촉.

**7. 원본 수정·보관·삭제 후 사본 독립성**
- 운영자가 원본 **이름 + 코너 본문 수정** → 매장 사본 2건 모두 **미전파**(사본 본문 = 가져온 시점 값) ✅
- 운영자가 원본 **삭제(soft)** → 사본 2건 **alive**, 블록 각 **5개 유지**(연쇄삭제 0) ✅
- 삭제된 원본은 **HUB 목록에서 즉시 제거**(공개 HUB 0건) ✅
- 원본 삭제 후에도 사본 **QR 공개 렌더 정상**(`/qr/public/a` → landingType=screen_set, 사본 이름·섹션 정상) ✅

**8. 매장 수정·삭제 후 원본 불변**
- 매장이 사본 이름·코너 본문 수정 → **원본 name/본문 불변** ✅
- 사본1(수정) ↔ 사본2(미수정) **상호 독립**(같은 원본에서 온 두 사본) ✅

**9. 코너 자동 미적용**
- 사본 `tablet_id=NULL`, `store_tablets.current_screen_set_id` 참조 **0**, `store_tablet_corner_contents` **0** ✅
- 목록에 **"현재 미적용"** 표시 ✅ · UI 안내 **"코너에는 아직 적용되지 않았습니다. …'코너별 운영'에서 이 콘텐츠를 선택해 주세요."** ✅

**10. 타블렛 idle 포함 · QR idle 제외**
- 공개 타블렛(보호 샘플): sections **5** = `[idle_media, corner_description, content_list, product_list, qr_guide]` — **idle 포함** ✅
- 사본 QR 공개: `[corner_description, content_list, qr_guide]` — **idle 제외** ✅ (기존 resolver 규칙 유지). QR 모바일 **미리보기**도 동일하게 idle 제외 처리.
- 표시 상태 복사가 렌더에 반영: 원본에서 숨긴 `product_list`(is_visible=false)·`content_list` item(visible=false)이 사본 렌더에서도 제외 ✅

**11. 보호 샘플·회귀**
- 검증 전후 활성 세트 **12건 동일**, 보호 샘플 코너 적용 불변(구강관리 코너→구강관리 기본 코너 안내형 / 피부관리 코너→피부관리 기본 화면 세트) ✅
- 공개 타블렛 content_list **5카드 불변** ✅
- HUB 격리: 타 service_key(glycopharm) **0건**, `producer=supplier` **0건** ✅
- 정리 후 운영자 원본 0 · HUB 0 · 매장 세트 12(원상복구). provenance 3행은 **의도적으로 보존**(추적 이력, 사본 삭제와 무관·FK 없음) ✅

### 브라우저 검증에서 발견·수정한 버그 2건
| # | 증상 | 원인 | 수정 |
|---|------|------|------|
| 1 | HUB 목록 **401** | `authClient.api` 가 `/store/*` 에 토큰 미부착 | `tabletDisplays.ts` 와 동일 `request` 헬퍼(명시 Bearer + 401 refresh 재시도) — `547e71a55` |
| 2 | **가져오기 버튼 클릭 불가** | kiosk 뷰어가 뷰포트를 채워 패널을 덮음 | 제작기와 동일 `relative+overflow:hidden` 종횡비 박스로 가둠 + QR 모바일 미리보기 idle 제외 — `6387c151a` |

### 정직한 관찰(기존 동작, 이번 WO 도입 아님)
- 매장 사본 QR slug 가 `a` / `a-2` 로 생성됨 — 이름 `[검증] 운영자 원본 A` 에서 **기존 slug 생성기**가 한글을 제거해 ASCII "A" 만 남긴 결과. 충돌은 `-2` 접미사로 처리. 매장 Screen Set QR 규칙(`ensureScreenSetQr`) 그대로이며 **본 WO 가 변경한 부분이 아니다**(한글 전용 이름 → 기존에도 `tablet-corner-N` 폴백). 개선은 별도 WO 후보.

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
