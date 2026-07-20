# CHECK-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1 — ✅ 재개·구현

> WO: `WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1`
> 설계: `ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1`
> 선행 스키마: `WO-O4O-SCREEN-SET-OWNER-SCOPE-SCHEMA-MIGRATION-V1` (organization_id nullable + supplier_id + `CHK_stss_owner_scope`, 프로덕션 LIVE·post-verify PASS 배포 e52aedba1 / b45211239)
> Date: 2026-07-20
> **상태: 구현 완료(재개)** — HOLD(2026-07-20, organization_id NOT NULL 중지) → 소유권 migration 완료 기준으로 재개.

---

## 0. 결론

운영자가 매장 배포용 Screen Set 원본(`operator_template`)을 **제작·수정·미리보기·제거**할 수 있게 했다. 확정 소유권 계약:

```
origin = 'operator' · organization_id = NULL · supplier_id = NULL ·
service_key = 'kpa'(주입) · created_by_user_id = 작성자 · status = 'operator_template'
```

`store_tablet_screen_sets`(migration 20270210000000, LIVE)의 `CHK_stss_owner_scope` operator 브랜치를 서버 INSERT 가 정확히 충족한다. **신규 migration 0**. 매장 API·코너 연결·QR·매장 콘텐츠 조회는 이 라우터에 **존재하지 않는다**(WO 차단 조건).

---

## 1. 실행 1 — HOLD → 재개 근거

- HOLD 원인(organization_id NOT NULL ↔ 운영자 무조직)은 선행 migration 이 `organization_id` nullable + `CHK_stss_owner_scope`(operator: org NULL·service_key/created_by NOT NULL) 로 해소.
- migration post-verify(CHECK-...-MIGRATION §5): prod 라이브에서 `INSERT origin='operator' + organization_id` → `CHK_stss_owner_scope` **거부**, operator(org NULL) 브랜치 accept 확인. 본 WO 의 INSERT 는 그 accept 조합을 사용한다.

## 2. 실행 2 — 운영자 API·service key 격리

신규 `operator-screen-set.controller.ts` — `createOperatorScreenSetController(dataSource, requireAuth, serviceKey)` (operator-blog.controller 패턴):
- 권한 inline guard `requireOperator` = `hasAnyServiceRole([{svc}:operator, {svc}:admin, platform:admin, platform:super_admin])`.
- mount: `/api/v1/kpa/operator/screen-sets` (kpa.routes.ts). **매장 API `/api/v1/store/screen-sets` 와 별도 라우터**.
- 격리: 모든 read/update/delete 가 `origin='operator' AND service_key=$svc AND deleted_at IS NULL`. **다른 서비스·매장(store)·공급자(supplier) 원본 접근 차단**.

| 라우트 | 동작 |
|--------|------|
| `GET /` | 같은 service_key operator 원본 목록(+blockCount) |
| `GET /:id` | 단일 + blocks |
| `POST /` | 생성 — org NULL·supplier NULL·service_key 주입·created_by 강제·status=operator_template·template 4종 |
| `PATCH /:id` | 이름·템플릿 수정(status/tablet/org 미지원) |
| `PUT /:id/blocks` | 블록 전체 교체 — content_list 의 `store_content` 참조 **거부**(`OPERATOR_STORE_CONTENT_FORBIDDEN`) |
| `POST /preview` | Operator Adapter draft 미리보기 |
| `DELETE /:id` | 목록에서 제거(soft delete) |
| `GET /content-sources/o4o-descriptions` | O4O 표준 설명서 검색(picker) — store-contents 검색 **미제공** |

## 3. 실행 3 — Operator ContentSourceAdapter

`createOperatorContentSourceAdapter(dataSource)` (store-public-tablet-content-source.ts, P3 seam 재사용):
- `fetchProductDescription` = 기본 Store Adapter 재사용(SPD **STORE canonical** 만 → **승인되지 않은 비-canonical 공급자/초안 자연 제외**).
- `fetchStoreContent` = **항상 null**(매장 제작 콘텐츠 차단). config 에 store 항목이 섞여도 resolver 가 null → skip.
- 이중 차단: adapter(preview resolve) + `PUT /blocks` 저장 검증(store_content 거부).

## 4. 실행 4 — 운영자 제작기 (4 템플릿·5단계 흐름 재사용)

**동일한 단계형 제작 셸 재사용** — `TabletContentStepBuilder`(TabletScreenSetManager.tsx)를 export 하고 API·콘텐츠 출처를 주입 파라미터로 추가(**additive, 미주입=매장 기본 → store 회귀 0**):
- `ScreenSetBuilderApi`(create/update/saveBlocks/preview/searchO4oDescriptions/searchStoreContents) 주입.
- `ContentPickerModal`/`ContentListEditor` 에 `contentSources` 주입 — 운영자=`['spd']`(O4O 표준 설명서만, store 탭 미노출).
- 운영자 페이지 `OperatorTabletScreenSetsPage`(list+builder inline), API 클라이언트 `operatorTabletScreenSets.ts`, route `/operator/tablet/screen-sets`, sidebar `매장 지원 › 매장 HUB 태블릿 화면`.
- 5단계: 템플릿 → 대기 화면 → 코너 설명(RichTextEditor) → 추가 정보(content_list) → 미리보기·저장. **4 템플릿**: 기본 코너 안내형 / 상품 집중형 / 코너 소개형 / 제품 진열형 (legacy `idle_touch_video` 신규 선택 제외 — WO 제외).
- 미리보기: 운영자는 매장 slug 없음 → previewLayoutOnly(sections 렌더, fetchProducts/fetchScreen 미호출) + stub previewApi + placeholder slug. 공용 tablet kiosk / Screen Set QR 모바일 renderer 재사용.

## 5. 실행 5·6·7 — 검증 (post-deploy, 아래 §7 갱신)

- (5) 저장·수정·재진입·미리보기
- (6) Store API·코너·QR 차단
- (7) 기존 매장 타블렛·QR·보호 샘플 회귀

## 6. 정적 검증 (배포 전)

- **api-server tsc(내 파일 3): 0 error** (pre-existing untracked drug/hff scripts 는 무관, 미커밋).
- **web-kpa-society tsc: 0 error / vite build: ✅**(TabletScreenSetManager·OperatorRoutes 청크 정상).
- store 제작기: 기본 api/contentSources 미주입 경로 유지 → 동작 불변(회귀 0, additive).

## 7. 프로덕션 검증 (실행 5·6·7·8) — ✅ PASS (API 실측, 2026-07-20, 배포 cd0b79679 + PATCH/DELETE 정규화 후속)

프로덕션 API(api.neture.co.kr) 운영자(sohae2100) / 매장 owner(renagang21) 인증 실측:

- [x] **생성 소유권 계약**: `origin=operator · organizationId=null · supplierId=null · serviceKey=kpa · status=operator_template · tabletId=null · templateKey=corner_information_basic_v1 · createdByUserId=존재 · publicQrSlug=null`. `CHK_stss_owner_scope` operator 브랜치 정확 충족.
- [x] **service_key 격리 목록**: count=1, 내 원본 노출, 전 row `origin=operator` · `serviceKey=kpa`.
- [x] **블록 저장/재진입**: corner_description(HTML)+content_list(o4o)+qr_guide 3블록 저장 → GET 재진입 동일, **corner body = HTML 문자열**, qr 유지.
- [x] **추가 정보(content_list)**: o4o 설명서 picker 30건, 저장/정렬/표시 반영.
- [x] **미리보기**: `mode=screen_set · sections=[corner_description, content_list, qr_guide]` (Operator Adapter).
- [x] **매장 콘텐츠 차단**: content_list 에 `store_content` → **400 `OPERATOR_STORE_CONTENT_FORBIDDEN`**.
- [x] **legacy 템플릿 차단**: `idle_touch_video` PATCH → **400 `INVALID_TEMPLATE_KEY`**.
- [x] **수정**: PATCH name+template(product_focus) → 반영, origin/status 불변.
- [x] **Store API 격리**: 매장 목록 12건에 operator 원본 **미노출**·non-store origin 0. store GET operator set → **404**. store PATCH → **404**. store DELETE → 매장은 operator 원본을 **실제로 삭제하지 못함**(operator GET 사후 200=생존, org 필터 0 row). ※ store DELETE 가 존재하지 않는 임의 UUID 에도 `deleted:true`(200) 를 반환하는 것은 **매장 DELETE 핸들러의 기존(pre-existing) 응답 quirk**(본 WO 무관·데이터 미변경). 매장 격리 명시화(`origin='store'`)는 ADR 후속 WO #3.
- [x] **매장 회귀**: Screen Set QR(`tablet-corner-5`) → `landingType=screen_set` 정상(공개 렌더 불변). 보호 샘플/current 무접촉.
- [x] **후속 수정(정규화)**: TypeORM `query()` UPDATE...RETURNING = `[rows, count]` quirk 로 PATCH `data` 가 배열로 반환되고 DELETE 404 판정이 누락되던 것을 `firstReturnedRow()` 로 정규화(PATCH 객체 반환·PATCH/DELETE 미존재 404). 재배포·재검증 PASS.

## 8. 변경 파일

```
apps/api-server/src/routes/o4o-store/controllers/operator-screen-set.controller.ts   (신규 운영자 API)
apps/api-server/src/routes/platform/store-public/store-public-tablet-content-source.ts (createOperatorContentSourceAdapter 추가)
apps/api-server/src/routes/kpa/kpa.routes.ts                                          (mount /operator/screen-sets)
services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx                (제작 셸 export + api/contentSources 주입 — additive)
services/web-kpa-society/src/api/operatorTabletScreenSets.ts                          (신규 운영자 API 클라이언트)
services/web-kpa-society/src/pages/operator/tablet/OperatorTabletScreenSetsPage.tsx    (신규 운영자 제작기 페이지)
services/web-kpa-society/src/routes/OperatorRoutes.tsx                                (route /operator/tablet/screen-sets)
services/web-kpa-society/src/config/operatorMenuGroups.ts                             (sidebar 매장 지원 항목)
docs/checks/CHECK-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1.md                  (본 CHECK)
```
- **신규 migration 0 · DB backfill 0.** 운영자 원본 생성은 실사용 시점에만 write.

## 9. 중지 조건 점검

| 조건 | 발생? |
|------|:-----:|
| Store API 우회해야 운영자 원본 저장 | ❌ (별도 operator 라우터 INSERT) |
| 운영자 원본에 organization 필요 | ❌ (org NULL, CHK operator 브랜치) |
| HUB 게시·매장 복사 동시 구현 필요 | ❌ (제외 범위 미접촉) |
| 매장 콘텐츠가 운영자 제작기에 노출 | ❌ (adapter null + 저장 거부 + picker store 탭 미노출) |
| 기존 매장 공개 렌더 계약 변경 | ❌ (public runtime/resolver/QR 무접촉) |
