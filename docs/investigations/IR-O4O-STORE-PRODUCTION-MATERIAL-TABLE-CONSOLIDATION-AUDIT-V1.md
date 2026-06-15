# IR-O4O-STORE-PRODUCTION-MATERIAL-TABLE-CONSOLIDATION-AUDIT-V1

> **유형**: Investigation (read-only) — Store Production Material 다중 테이블 경계 감사. "통합 대상 찾기"가 아니라 "현재 분리가 타당한지" 검증.
> **성격**: 코드/DB/route/UI **무변경**. 조사 문서만 (file:line 근거).
> **결론(요약)**: **현재 다중 테이블 경계는 타당 — 통합 불필요·금지(A 주).** 어떤 store 테이블도 `o4o_asset_snapshots`/`cms_contents` 로 **역방향 FK 없음**(단절 구조적 보장 → **F 아님**). snapshot↔`kpa_store_contents` "중복"은 **불변 복사(INPUT) + 가변 편집 레이어(CORE)** 분리(COALESCE 렌더)이고, 결과물(`store_blog_posts`/`store_pops`/`store_qr_codes`/`store_execution_assets`)은 단일 SSOT → **부당 중복 0(C 아님)**. canonical 문서가 INPUT/CORE/OUTPUT 경계 + "rename·consolidate 금지" 명시(**E = 이미 문서로 처리, 물리 rename 보류 유지**). 잔여: **B**(author_role/visibility_scope/workspace_status 미문서화 + `store_library_items`→`store_execution_assets` 문서 drift), **D**(ProductionMaterials 클라이언트 merge 3서비스 중복 + GP/KCos QR/direct 미구현 — 선택적 공통화).
> **선행/근거**: `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1` · `IR-O4O-STORE-CONTENT-PRODUCTION-AND-MANAGEMENT-SUPPORT-FLOW-V1`.
> **작성일**: 2026-06-15

---

## 1. 목적

제작·보관·결과물 흐름의 6개 테이블 경계가 타당한지 감사. 통합 착수 아님. (`kpa_store_contents` 이름만 보고 rename/통합 금지 — CLAUDE.md §5.)

## 2. 테이블 역할표 (코드 검증)

| 테이블 | 역할(canonical 층) | 가변성 | 핵심 컬럼 / 엔티티 |
|--------|-------------------|:------:|------|
| `cms_contents` | 운영자 발행 **원본** | 운영자 수정 | migration `1736500000000` |
| `o4o_asset_snapshots` | 허브→매장 **불변 복사(INPUT)** | **불변** | `packages/asset-copy-core/src/entities/asset-snapshot.entity.ts` — id/org/source_service/source_asset_id/asset_type/content_json. **관계/FK 0** |
| `kpa_store_contents` | 내 매장 **편집 레이어(CORE = Store Production Material)** | 가변 | `apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts` — `snapshot_id`(nullable uuid, **FK 아님** `:44-45`), `source_type`(snapshot_edit/direct `:48`), content_json, source_metadata `:124`, author_role `:100`, visibility_scope `:108`, workspace_status `:137` |
| `store_execution_assets` | **자료(INPUT) + 생성 결과물(OUTPUT)** 겸용(sourceType 구분) | 가변 | `apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts` — sourceType(uploaded/library/generated), usageType, org FK→organizations |
| `store_blog_posts` | 블로그 **결과물(OUTPUT)** | 가변 | `routes/glycopharm/entities/store-blog-post.entity.ts` — author_role(operator/store), storeId, slug. **snapshot 링크 없음** |
| `store_pops` | POP **결과물(OUTPUT)** | 가변 | `routes/o4o-store/entities/store-pop.entity.ts` — blog 와 동형(author_role/storeId/slug) |
| `store_qr_codes` | QR **결과물(OUTPUT)** | 가변 | `routes/platform/entities/store-qr-code.entity.ts` — `libraryItemId`(**논리 참조만, FK 아님**), org FK→organizations |

> canonical(§3): `o4o_asset_snapshots`=INPUT, `kpa_store_contents`=CORE, `store_execution_assets`/blog/pop/qr=OUTPUT. 코드와 일치.

## 3. 원본-사본 단절 검증 (F-check) — 충돌 0 ✅

| 점검 | 결과 |
|------|------|
| store 테이블 → `o4o_asset_snapshots` 역방향 FK/cascade | **0** (전 테이블 @ManyToOne/@JoinColumn 없음) |
| store 테이블 → `cms_contents` 역방향 FK | **0** (cms_content_slots 만 cms_contents 참조, store 테이블 무관) |
| `kpa_store_contents.snapshot_id` | **plain uuid(FK 아님)** — cascade 없음 |
| `store_qr_codes.libraryItemId` | **논리 참조만**(엔티티 주석 "Neture FK 금지") |
| org 관계 | `store_execution_assets`/`store_qr_codes` → organizations ON DELETE CASCADE (snapshot 무관) |

> 원본 수정/삭제가 사본에 영향 없음 — **단절 구조적 보장**. snapshot 은 불변(편집은 `kpa_store_contents` 로만 upsert, snapshot write-back 없음: `store-content.controller.ts` PUT `/store-contents/:snapshotId`). → **F 해당 없음.**

## 4. 중복 저장 검증 (C-check) — 부당 중복 0 ✅

| "중복" 의심 | 실제 | 판정 |
|------------|------|------|
| `o4o_asset_snapshots` ↔ `kpa_store_contents`(snapshot_edit) | **불변 복사 + 가변 편집 레이어** 분리. 렌더 시 store override 우선 → snapshot fallback(COALESCE). snapshot 은 seed, 편집은 별도 row | **정당 분리**(중복 아님) |
| `store_execution_assets` 자료 vs 결과물 | 한 테이블이 sourceType(library/generated)로 **입력·출력 겸용** — row 중복 아님 | 정당(겸용) |
| blog/pop/qr | 각 **단일 SSOT**. 다른 테이블로 mirror 안 됨. operator/store 는 author_role 로 구분(같은 테이블, 다른 row) | 정당 |
| 중복 가져오기 | unique constraint 제거됨(`UQ_asset_snapshot_org_source_type` drop `20260920000000`) → 재복사 시 새 snapshot row(의도, 재복사 UX WO) | 정당(독립 복사) |

> 같은 **논리 결과물이 2개 테이블에 동시 저장되는 사례 없음**. snapshot/edit/output 분리는 canonical 설계 그대로. → **C 해당 없음.**

## 5. 화면 × 테이블 매트릭스 (생성/조회)

| 테이블 | 생성(write) | 조회(read 화면) |
|--------|------------|----------------|
| o4o_asset_snapshots | `POST /{svc}/assets/copy`(asset-copy-core) | StoreLibraryContents/Resources, StoreContentEdit(fallback) |
| kpa_store_contents | `POST /store-contents`(direct), `PUT /store-contents/:snapshotId`(upsert), `PUT/DELETE /store-contents/direct/:id` | StoreContentEdit, StoreProductionMaterials(direct) |
| store_execution_assets | `POST/PUT/DELETE /store/assets` | StoreProductionMaterials(generated), StoreLibraryResources(library) |
| store_blog_posts | `POST /stores/:slug/blog/staff`(+import), operator `/operator/blog/posts` | StoreProductionMaterials(blog), /store/content/blog |
| store_pops | operator `/operator/pop/posts`, `/stores/:slug/pop/staff/import` | (Production 통합 Phase 2 대기) |
| store_qr_codes | `POST /pharmacy/qr`, `/stores/:slug/qr/staff/import` | StoreProductionMaterials(qr) |

> 편집 흐름(`/store/content/:snapshotId/edit`·`direct/:id`)은 **`kpa_store_contents` 로만 upsert** — snapshot write-back 없음(검증됨).

## 6. ProductionMaterials 통합 조회 (D-check)

`StoreProductionMaterialsPage`(KPA `services/web-kpa-society/src/pages/pharmacy/`)는 **백엔드 통합 엔드포인트 없이 클라이언트에서 4소스 병렬 fetch 후 merge**(updatedAt DESC, kind/sourceKind 태깅): directContent(kpa_store_contents) + executionAssets(generated) + qr + blog.

| 서비스 | merge 소스 | 비고 |
|--------|-----------|------|
| KPA | direct + executionAssets + qr + blog (4) | full |
| GP | executionAssets + blog (2) | **QR/direct ready client 부재 → 미구현(empty, mock 금지)** (주석 명시) |
| KCos | executionAssets + blog (2) | 동 |

> merge 로직이 3서비스에 중복 + GP/KCos 부분 구현. **공통화 + GP/KCos QR/direct 소스 완성** 후보(D) — 단 **테이블 통합과 무관**(조회 계층 정리). 선택적.

## 7. GP/KCos parity

- 내 매장 보관/편집/결과물 화면(StoreLibraryContents/Resources/ProductionMaterials/Editor) + route(`/store/library/*`, `/store/content/*`, `/store/marketing/*`)는 **3서비스 동일 테이블·API 공유**(컴포넌트는 서비스 디렉터리: KPA `pharmacy/`, GP `store-management/`, KCos `store/`).
- 컨트롤러 `createStoreContentController` 는 KPA prefix 없이 3서비스 공통 마운트 → `kpa_store_contents` 단일 테이블 공유(service-neutral).
- 차이: GP/KCos ProductionMaterials 부분 구현(§6). 구조 발산 아님.

## 8. 명칭(E-check) — canonical 문서로 이미 처리

`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`:
- §4: logical canonical=`Store Production Material`, physical=`kpa_store_contents`(변경 안 함), controller=`createStoreContentController`(이미 공통), API=`/api/v1/{service}/store-contents`(호환 유지).
- §5/§6.2/§8: **`kpa_` prefix 만 근거로 rename 금지, 별도 KPA 전용 table 신설 금지, 현 시점 rename 보다 안정성 우선.** Cloud Run dual-execution 윈도우 위험 + 기능 공통화 완료로 rename 이득 제한적.

> → **물리 rename/통합 보류가 canonical 정책. 본 감사도 동일 결론.** E 는 추가 조치 불요(문서로 확립됨).

## 9. 잔여 문서 drift (B)

1. canonical §3 은 INPUT 자료 테이블로 **`store_library_items`** 표기 — 코드는 **`store_execution_assets`**(library sourceType)로 대체됨(구 테이블 후신). → canonical INPUT 표기 갱신 필요.
2. `kpa_store_contents` 의 `author_role`/`visibility_scope`/`workspace_status` 컬럼은 코드에 존재하나 **canonical 문서 미정의**(Operator Workspace A 수신 자료 겸용). → 경계 문서 보강 필요.
3. `store_execution_assets` 가 INPUT(library)+OUTPUT(generated) **겸용**인 점이 canonical(OUTPUT 분류)과 부분 불일치 — sourceType 기준 이중 역할 명문화 필요.

## 10. 판정

| 안 | 해당 | 근거 |
|----|:---:|------|
| **A** 경계 타당, 문서화만 필요 | **주** | INPUT/CORE/OUTPUT 분리 정당, 단절 정상, 부당 중복 0 |
| **B** 일부 역할 설명 부족 → 문서 보강 | **부분** | author_role/visibility_scope/workspace_status 미문서화, store_library_items→execution_assets drift, execution_assets 이중역할 |
| **C** 같은 데이터 중복 저장 → 구조 정비 | ❌ | snapshot/edit/output 분리(중복 아님), 결과물 단일 SSOT |
| **D** ProductionMaterials 통합 조회 공통화/정리 | **부분(선택)** | 클라이언트 merge 3서비스 중복 + GP/KCos QR/direct 미구현 (테이블 통합과 무관) |
| **E** 명칭/canonical 정리, 물리 rename 보류 | **이미 처리** | canonical 문서가 legacy명+do-not-rename 확립 |
| **F** 단절 원칙 충돌 FK | ❌ | 역방향 FK 0, snapshot 불변 |

→ **종합 = A(주) + B(문서 보강) + D(조회 공통화, 선택). C/F 아님, E 기처리.**

## 11. 통합하면 안 되는 이유 (명시)

1. **역할이 다른 계층**: INPUT(불변 snapshot) / CORE(가변 편집) / OUTPUT(blog·pop·qr·generated)을 한 테이블로 합치면 불변성·단절·author_role 분리가 깨진다.
2. **단절 원칙**: snapshot 불변 + 편집 별도 row 구조가 원본-사본 단절을 보장. 통합 시 FK/cascade 도입 위험.
3. **canonical 정책**: rename·consolidate 금지(안정성 우선, Cloud Run dual-execution 위험).
4. **결과물 단일 SSOT**: blog/pop/qr 는 도메인별 고유 스키마(slug/landing/publish)·고유 API. 합칠 실익 없음.

## 12. 후속 WO 후보 (선택, 비긴급)

1. `WO-O4O-STORE-PRODUCTION-MATERIAL-BOUNDARY-DOCUMENTATION-V1` — canonical 문서 보강(B): store_library_items→store_execution_assets 갱신, author_role/visibility_scope/workspace_status 정의, execution_assets INPUT+OUTPUT 이중역할 명문화. **문서 only, 실행 영향 0.**
2. `WO-O4O-STORE-PRODUCTION-MATERIAL-LIST-QUERY-CLEANUP-V1`(선택, D) — ProductionMaterials 클라이언트 merge 공통화(`@o4o/store-ui-core` 헬퍼) + GP/KCos QR/direct ready client 추가(부분 구현 완성). 테이블 무변경.
3. ~~`WO-O4O-...-TABLE-CONSOLIDATION-V1`~~ — **불제안.** 본 감사 결과 통합 불필요·금지.
4. ~~`WO-O4O-...-CANONICAL-NAMING-V1`(물리 rename)~~ — **보류 유지**(canonical §6.2).

---

## 13. 결론

- **현재 6개 테이블 경계는 타당하다.** INPUT(`o4o_asset_snapshots` 불변) / CORE(`kpa_store_contents` 편집) / OUTPUT(`store_execution_assets`·blog·pop·qr)의 계층 분리가 canonical 설계·코드와 일치하며, **원본-사본 단절(역방향 FK 0)·결과물 단일 SSOT** 가 구조적으로 지켜진다. → **통합 불필요·금지(A).**
- **C(부당 중복)·F(단절 충돌) 해당 없음.** snapshot↔편집 레이어는 정당한 불변/가변 분리.
- **E(물리 rename)는 canonical 문서가 이미 보류로 확립** — 본 감사도 동일.
- 잔여는 **B(canonical 문서 경계 보강)** 와 **D(ProductionMaterials 조회 공통화·GP/KCos 소스 완성)** 로, **둘 다 테이블 구조 무변경의 저위험 후속**.
- **권고**: 테이블 통합/ rename 착수 금지. 필요 시 **문서 보강(B) → 조회 공통화(D)** 만 별도 WO 로.

---

*Date: 2026-06-15 · read-only IR · 코드/DB 무변경 · 다중 테이블 경계 타당(A) + 문서 보강(B) + 조회 공통화(D, 선택). 역방향 FK 0(F 아님)·부당 중복 0(C 아님)·물리 rename 보류(E, canonical 기처리). 통합 불제안.*
