# CHECK-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1

> **WO**: `WO-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1`
> **일자**: 2026-09-16 · **기준 main**: `dcba800e7` (Service Tenant Foundation CLOSED 직후)
> **성격**: 의미 정렬 (adapter · shared type · docs). 새 테이블 0 · migration 0 · 물리 enum 변경 0 · 프로덕션 write 0.
> **상위 기준**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §2-1 · §2-2 · §5 · §6 · §9-1(3단계)

---

## 0. 한 줄 결론

콘텐츠를 하나의 테이블·엔진으로 합치지 않고, **누가 만든 콘텐츠인지(producer) · 어느 공간의 콘텐츠인지(domain) · 누가 보는지(visibility) · Store 로 어떻게 들어가는지(copy)** 의 의미를 바로잡았다. 논리 도메인 4종(`Community / Service / Supplier / Store`)을 `@o4o/types` 공통 언어에 선언하고, producer 를 `platform | service_operator | supplier | community | store` 로 adapter 에서 정규화했으며, **KPA `kpa_contents` 가 일괄 `service_admin` 으로 표기되던 drift 를 `community` 로 고쳤다.** `neture_supplier_contents` stale 명칭은 활성 코드·문서에서 제거했고, "supplier = legacy 예외 / 공급자 HUB 직접 게시 금지" 를 담은 F4 · 게시 표준 · 3자 흐름 문서를 Architecture §2-1 에 맞춰 정정했다. Hub producer 4종은 유지하고 소비처 이동 판정만 기록했다.

---

## 1. Fresh Census (§3) — origin/main `dcba800e7`

### 1-1. 원장 · adapter · API 판정표

| 대상 | PHYSICAL_SOURCE | LOGICAL_DOMAIN | AUTHOR (생성 경로 기준) | AUDIENCE | STORE_IMPORT_PATH |
|---|---|---|---|---|---|
| `cms_contents` authorRole=`admin` | cms_contents | Service(플랫폼 관리자가 서비스 범위에 발행) | 플랫폼 관리자 (`cms-content-mutation.handler.ts` `isPlatformAdmin → 'admin'`) | visibilityScope 기준 | Store Hub → `assetSnapshotApi.copy(assetType='cms')` |
| `cms_contents` authorRole=`service_admin` | cms_contents | **Service Content** (canonical 원장, §7) | Service Operator (mutation handler 기본값) | `visibilityScope='service'` | Store Hub → copy |
| `cms_contents` authorRole=`community` | cms_contents | Community | 회원 (`cms-content-member-authoring.ts` capability, type=knowledge) | service | Community → copy |
| `cms_contents` authorRole=`supplier` | cms_contents | Supplier (Store Hub 제출본) | Supplier (`kpa/services/supplier-content.service.ts` `submit()` status=pending + `kpa_approval_requests`) | 운영자 승인 후 Hub | **Supplier → Store Hub** (Architecture §2-1 공식 경로) |
| `kpa_contents` | kpa_contents | **Community Content** | 회원 — `POST /kpa/contents` 는 `authenticate` 만 요구, 작성자 role 미저장. 운영자 라우터(`/operator/resources`)는 GET/PATCH status/DELETE 만 있고 별도 작성 경로 없음 | serviceKey 격리(`visibility='service'`) | Community → `assetSnapshotApi.copy(assetType='content')` (`kpa-asset.resolver.ts` `resolveContent`: sub_type≠resource · reusable_policy≠restricted · status ready/published) |
| `neture_supplier_library_items` | neture_supplier_library_items (`supplier_id`, `content_type`, `is_public`, `visibility`) | **Supplier Content** (canonical 공급자 원장) | Supplier (`neture-library.routes.ts`) | `visibility`(service/personal) | 직접 Store 경로 없음 — Store Hub 제출 또는 Service Operator 제공 (Architecture §2-1) |
| `o4o_asset_snapshots` (`organization_id, source_service, source_asset_id, asset_type, content_json`) | asset-copy-core | **Store Content** (Store 소유 독립 사본) | Store (`created_by`) | 매장 | — (사본 자체) |
| `kpa_store_contents` (`snapshot_id`, `source_type` direct/snapshot_edit, `author_role` operator/store) | kpa_store_contents | Store Content | Store / Operator 지원 | organization | — (Store Direct Authoring 포함) |
| `store_execution_assets` | store_execution_assets | Store Content (실행 자산) | Store | organization | — |
| Hub `queryCms/querySignage/…` (`hub-content.service.ts`) | 다중 (cms · signage · blog · pop · qr · video · screen-set) | **도메인 아님 — Store Hub 노출 축** | `AUTHOR_ROLE_TO_PRODUCER {admin,service_admin→operator, supplier, community}` · blog/pop/qr/video/screen-set 은 `producer:'operator'` 하드코딩 · `store` 는 빈 응답 | 매장 | copy |

### 1-2. ContentMeta 소비처 (shared type 변경 전 전수)

| 소비처 | 사용 | 영향 |
|---|---|---|
| `apps/api-server/src/routes/cms-content/cms-content-query.handler.ts` (378 · 476) | `mapCmsAuthorRole` · `mapCmsVisibilityScope` | 값만 canonical 로 (admin→`platform`, service_admin→`service_operator`) |
| `apps/api-server/src/routes/kpa/kpa.routes.ts` (152 import · 1290 CMS list · 1745 detail) | `mapCmsStatus/AuthorRole/VisibilityScope` · detail 고정 `service_admin` | detail → `mapKpaContentProducer()` = `community` |
| `apps/api-server/src/routes/kpa/controllers/kpa-content-resource.config.ts` `createKpaListRowMapper` | 고정 `service_admin` | → `mapKpaContentProducer()` = `community` |
| `apps/api-server/src/modules/neture/neture-library.routes.ts` | `mapNetureVisibility` · 고정 `producer:'supplier'` | 무변경 (canonical 동일) |
| `apps/admin-dashboard/src/lib/cms.ts` · `pages/cms/contents/CMSContentList.tsx` | `producer?: string` + 로컬 `PRODUCER_LABELS` (raw fallback) | 라벨에 canonical 키 추가, 구 키 TEMP_COMPAT |
| `services/web-neture/src/lib/api/supplier.ts` · `SupplierLibraryPage.tsx` | `producer?: string` (표시 없음) | 무영향 |
| `services/web-pharmacy-hub/src/lib/api/pharmacyHubResources.ts` | `producerRef` fallback 만 | 무영향 |
| `packages/types/src/index.ts` | re-export | 신규 export 추가 |
| `ContentProducer` / `CONTENT_PRODUCER_LABELS` / `ContentServiceKey` 직접 import | **0 (content-meta.ts 내부 뿐)** — `node`-free grep + `check-literal-consumers` 대상 리터럴(`platform_admin`·`store_operator`)은 admin menu 테스트·store-ai `ProductActorType` 등 **무관 도메인**만 | 안전 |

### 1-3. Stale 항목 (변경 전)

| 항목 | 위치 | 판정 |
|---|---|---|
| `neture_supplier_contents` 참조 | `content-meta.ts` 헤더·주석 5곳, `CONTENT-META-PRODUCTION-READY-V1` | 원장은 `20260303000000-DropNetureSupplierContents` 로 DROP. 현행 = `neture_supplier_library_items` |
| `ContentServiceKey` 3개 하드코딩("5개" 주석) | `content-meta.ts` | 실원장 `cms_contents.serviceKey` 에 `pharmacy-hub` · `kpa` 존재 (§2) → union 복제 drift 확정 |
| `kpa_contents.created_by (role 기반 추론) → 'service_admin'` | `content-meta.ts` 주석 · KPA adapter 2곳 | §2 실데이터로도 반증 |
| `GlycoPharm 관리자` · `kpa_working_contents` (Layer 2) | `content-meta.ts` | GlycoPharm 은 공식 서비스 아님 · `kpa_working_contents` 는 `20270213000000-DropKpaWorkingContentsDeadTable` 로 DROP |
| "supplier = legacy 예외 · 공급자 → 오프라인 → Operator 등록" | F4 §3.1 · §3.2 · §6.3 · §10-5 | Architecture §2-1 과 충돌 |
| "공급자가 HUB에 직접 콘텐츠를 제작·게시하는 구조 금지" | 게시 표준 §6 · 3자 흐름 §2 · §3 · §6 | Architecture §2-1 과 충돌 |

---

## 2. 프로덕션 read-only 분포 (§18 · SELECT 만 · 값 마스킹)

| 원장 | 결과 |
|---|---|
| `kpa_contents` | 전체 16 (삭제 10) · 활성 6 = sub_type `content` 2 · `resource` 4 (published 5 · draft 1). 작성자 2명. **두 작성자 모두 활성 `role_assignments` 에 `*:operator` / `*:admin` 없음** (store_owner · supplier · user 등 회원 role 만; `platform:super_admin` · `kpa-branch:operator` 는 `is_active=false`) → 현행 `producer='service_admin'` 표기는 실데이터 100% 에서 오표기 |
| `cms_contents` | `admin`/platform/published 57 (kpa-society 53 · neture 3 · kpa 1) · `supplier`/neture/service/draft 2 · `community`/pharmacy-hub/service/archived 2 · `service_admin`/service/archived 2 (pharmacy-hub 1 · neture 1). serviceKey 에 `pharmacy-hub` · `kpa` 존재 |
| `neture_supplier_library_items` | 0 행 (원장 존재 · 데이터 없음) |
| `o4o_asset_snapshots` | source_service `kpa`: content 14 (조직 3) · resource 3 · cms 1 / `store-library`: signage 1 — Store 사본 원장 정상 |
| `kpa_store_contents` | author_role `store`/direct 7 · `operator`/direct 6 · `operator`/snapshot_edit 2 |
| `store_execution_assets` | pop 33 · (null) 15 · qr 1 |
| `kpa_approval_requests` | `hub_content_submission` 0 (forum_member_join 1) |

데이터 수정 0. 프록시는 조회 직후 종료.

---

## 3. 결정 (§4 ~ §12)

| # | 결정 | 근거 |
|---|---|---|
| D1 | 논리 도메인 4종 `ContentDomain = community \| service \| supplier \| store` 를 `@o4o/types` 에 **타입·라벨로만** 추가. 물리 통합 없음 | §1 · §4 · §13 |
| D2 | canonical producer `platform \| service_operator \| supplier \| community \| store` — `ContentProducer` 를 이 값으로 정렬. **물리 DB enum(`cms_contents.author_role`) 은 그대로**, `mapCmsAuthorRole` adapter 에서 정규화 | §5 (enum 변경 불필요 → 하지 않음) |
| D3 | 구 값 `platform_admin / service_admin / store_operator` 는 `LegacyContentProducer` + `normalizeContentProducer()` 로 **TEMP_COMPAT** (Store Hub 단계 제거) | §16 (영구 compat 금지) |
| D4 | `kpa_contents` producer = **`community`** (`mapKpaContentProducer()`). 판정 근거는 `created_by` 추정이 아니라 **생성 API 계약**(authenticate 만 · role 미저장 · 운영자 별도 작성 경로 없음). 운영자가 같은 원장에 쓴 행을 구분할 schema 가 없으나 **도메인 판정에 필요하지 않으므로 중지 조건 아님** — 운영자 작성 식별이 필요해지면 후속 (FOLLOWUP) | §6 · §20 |
| D5 | Service Content canonical = `cms_contents` serviceKey + `authorRole='service_admin'`(→`service_operator`) + `visibilityScope='service'`. 새 테이블 0 | §7 |
| D6 | Supplier canonical = `neture_supplier_library_items`. `Supplier → Store Hub` 제출(`authorRole='supplier'` + 승인) 은 Architecture §2-1 공식 경로 → **CANONICAL** (문서의 "legacy 예외" 폐기). 범용 distribution engine 없음 | §8 |
| D7 | `ContentServiceKey = string` — union 복제 대신 정본(`service-catalog.ts`)을 가진 API 서버가 값 검증. 소비처 0 이므로 타입 파괴 0 | §9 |
| D8 | Hub `HubProducer` 4종 **유지**. 소비처 판정은 §7 표. 코드 변경 0 | §10 |
| D9 | producer / domain / visibility / source-origin 4개념 분리 — 단일 enum 통합 없음. `visibility='service'` ≠ Service Content 를 타입 주석·테스트로 고정 | §11 |
| D10 | Store copy 계약 무변경 (`assetSnapshotApi.copy` → `o4o_asset_snapshots` Store 소유 사본, 원본 독립). sourceType 개편 · 3+1 출처 persistence 는 후속 | §12 |

---

## 4. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/types/src/content-meta.ts` | 헤더(4 도메인 · 4개념 분리 · 원장 명칭 현행화) · `ContentServiceKey=string` · `ContentProducer` canonical · `LegacyContentProducer` + `normalizeContentProducer` · `ContentDomain` + `CONTENT_DOMAIN_LABELS` · `CmsAuthorRole` · `mapCmsAuthorRole` 정규화 · `mapKpaContentProducer` · `mapSupplierLibraryProducer` · stale 주석 제거 |
| `apps/api-server/src/routes/kpa/controllers/kpa-content-resource.config.ts` | 목록 mapper `producer: mapKpaContentProducer()` |
| `apps/api-server/src/routes/kpa/kpa.routes.ts` | detail `producer: mapKpaContentProducer()` |
| `apps/admin-dashboard/src/pages/cms/contents/CMSContentList.tsx` | `PRODUCER_LABELS` canonical 키 + 구 키 TEMP_COMPAT |
| `apps/api-server/src/__tests__/content-boundary-alignment.spec.ts` | 신규 (§5) |
| `apps/api-server/src/__tests__/kpa-content-resource-core-adoption.spec.ts` | 기대값 `service_admin` → `community` |
| docs | §8 표 |

새 테이블 0 · migration 0 · route/permission 변경 0 · API 필드 추가/삭제 0 (값 정규화만).

---

## 5. 검증 (§17)

| 항목 | 결과 |
|---|---|
| `packages/types` `tsc --noEmit` · `npm run build` | exit 0 |
| `apps/api-server` `tsc --noEmit` | exit 0 |
| `apps/admin-dashboard` `tsc --noEmit` | exit 0 |
| `content-boundary-alignment.spec.ts` (신규) | PASS — producer 매핑 8 · boundary 4 (Community≠Service · Supplier≠Community · Service≠Hub · Store copy≠원본) · KPA drift 3 (회원 행 `community` · created_by 무관 · additive 필드 유지) · Hub 4종 유지 · 전송 엔진/graph export 0 |
| `kpa-content-resource-core-adoption.spec.ts` | PASS (기대값 갱신) |
| 회귀 11 suites (cms detail/mutation/member-authoring scope · pharmacy-hub content-resource/community/tablet/lms · community-content-resource view · lms hub view) | 246 tests PASS |
| 브라우저 smoke | 미실시 — 응답 값 정규화(`producer` 문자열)만이며 admin CMS 목록은 raw fallback 라벨로 표시 보장. 배포 후 admin CMS 목록 producer 배지 확인은 후속 배포 검증 항목 |

---

## 6. Re-census (§19)

| 항목 | 잔류 | 분류 |
|---|---|---|
| `neture_supplier_contents` | migration 3건(`1737200000000` · `2026013000001` · `20260303000000`) · `CONTENT-META-PRODUCTION-READY-V1` §1/§6 "DROP 됨" 기록 | HISTORICAL_ONLY |
| `producer='service_admin'` (코드) | 0 | — |
| `service_admin` 문자열 | `cms_contents.author_role` 물리 값 · `AUTHOR_ROLE_TO_PRODUCER` · `kpa.routes.ts:1290` fallback(`?? 'service_admin'` → mapCmsAuthorRole) · `LegacyContentProducer` | CANONICAL(물리 enum) / TEMP_COMPAT(Legacy 타입) |
| KPA content producer | `community` 2곳 (`mapKpaContentProducer`) | CANONICAL |
| `HubProducer` `operator\|supplier\|community\|store` | 유지 | CANONICAL(노출 축) · 소비처 판정 §7 |
| `ContentServiceKey` | `string` (소비처 0) | CANONICAL |
| `visibility='service'` 고정 (KPA) | 유지 — serviceKey 격리 노출 축 | CANONICAL (도메인 아님, §11) |
| `sourceType` / `sourceDomain` (`kpa_contents.source_type` manual/external/upload · `HubSourceDomain` · `kpa_store_contents.source_type`) | 무변경 | FOLLOWUP_SCOPED (Store Content Entry Alignment) |
| `O4O-STORE-MENU-CANONICAL-TREE-V1` SMT-G8 "`HubProducer='supplier'` 명문화된 예외 유지" | 무변경 | FOLLOWUP_SCOPED — Architecture §8 이 이미 Store 단계 UPDATE_REQUIRED 로 표기 |
| `O4O-3-ROLE-FLOW-BASELINE-V1` 본문 §2 · §3 · §6 | 본문 보존 · 헤더 SUPERSEDED | HISTORICAL_ONLY |

미설명 drift 0.

---

## 7. Hub producer 소비처 판정 (§10)

| 소비처 | 현재 | 판정 | 이유 |
|---|---|---|---|
| `hub-content.service.ts` `queryCms` producer→authorRole (operator/supplier/community) | 4종 | KEEP_CURRENT_TEMP | Store Hub 재정의(`Platform/Public` · `Supplier/Public`) 전까지 유지 |
| `hub-content.service.ts` `querySignage` `SIGNAGE_SOURCE_TO_PRODUCER` (hq/supplier/community) | 3종 | KEEP_CURRENT_TEMP | 동일 |
| `hub-content.service.ts` `producer==='store'` → 빈 응답 (cms/signage) | dead 분기 | RETIRE (후보) | 이미 노출 0. 타입 축소와 함께 Store Hub 단계에서 제거 |
| blog / pop / qr / video / screen-set `producer:'operator'` 하드코딩 | operator 고정 | KEEP_CURRENT_TEMP | 운영자 발행 원장. Hub 재정의 시 `Platform/Public` 로 이동 |
| KPA/KCos `HubSignageLibraryPage` · `HubSignagePage` `PRODUCER_TABS = all\|operator\|community` | community 탭 | MOVE_TO_COMMUNITY (후속) | 회원 signage 는 Community Content. 이번 단계 UI 변경 없음 |
| admin `HubContentsPage.tsx` tabs all\|supplier | supplier 탭 | KEEP_CURRENT_TEMP | Supplier → Store Hub 공식 경로 |
| `StoreHubLatestFeed.tsx` `producer:'operator'` 조회 | operator | KEEP_CURRENT_TEMP | — |
| `packages/store-ui-core` `useSignageLibrary.ts` producer 필터 | 4종 통과 | KEEP_CURRENT_TEMP | — |
| `hub-content.controller.ts` `VALID_PRODUCERS` | 4종 | KEEP_CURRENT_TEMP | 타입 축소 시 함께 |

즉시 정리한 것 없음(안전 범위 = 0 변경). 축소는 Store Hub 단계.

---

## 8. 문서 정합 (§15)

| 문서 | 변경 |
|---|---|
| [`PLATFORM-CONTENT-POLICY-V1`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) (F4 · Frozen — 이 WO §15 가 승인 근거) | §3.1 note 교체(supplier = Canonical · Hub = 노출 축) · §3.2 supplier 행 상태 · §6.3 제목/note · §10-5 폐기 표기. 3축 모델 본문 불변 |
| [`O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1`](../baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md) | §6 첫 항목 삭제 표기 |
| [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) | 헤더 "판정 대기" → "판정 확정 · §2 · §3(공급자 직접 제작 ❌) · §6 첫 항목 SUPERSEDED". 본문 보존 |
| [`CONTENT-META-PRODUCTION-READY-V1`](../platform/content/CONTENT-META-PRODUCTION-READY-V1.md) | 2026-09-16 정렬 요약 · `ContentProducer`/`ContentDomain`/`ContentServiceKey` 표 · KPA 행(`community`) · 필드 의미 표 |
| [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) | §8 표 3행(3-ROLE-FLOW 판정 확정 · F4 정정 완료 · 게시 표준 정정 완료) · §9-1 3단계 완료 |
| [`CANONICAL-INDEX`](../CANONICAL-INDEX.md) | F4 행 · 게시 표준 행 · §9 3-ROLE-FLOW 행(판정 대기 → 부분 SUPERSEDED) |
| `CLAUDE.md` · `AGENTS.md` | 정본 표의 3-ROLE-FLOW "판정 대기" 문구 → SUPERSEDED |

보존: 과거 IR / CHECK / WO 무변경.

---

## 9. 후속 (FOLLOWUP)

1. **Hub 이동 대상** — §7 의 MOVE_TO_COMMUNITY(회원 signage 탭) · RETIRE(`producer='store'` dead 분기) · `HubProducer` 축소 · `O4O-STORE-MENU-CANONICAL-TREE-V1` SMT-G8 정정 → Store Hub 단계(§9-1 5).
2. **Store source mapping** — 출처 4종(`operator_hub / community_snapshot / store_direct / library_self`) ↔ 3+1 경로 persistence · `kpa_contents.source_type` 의미 재정의 → Store Content Entry Alignment.
3. **Supplier distribution** — `neture_supplier_library_items` → Store Hub / Service Operator 제공 UI·API (현재 0행 · 제출 경로는 cms_contents 경유만) → Supplier Workspace 단계(§9-1 4).
4. **KPA 운영자 작성 식별** — 운영자가 회원 경로로 쓴 `kpa_contents` 행을 구분할 필요가 생기면 schema 판단 별도 WO (도메인 판정에는 불필요).
5. **TEMP_COMPAT 제거** — `LegacyContentProducer` · admin `PRODUCER_LABELS` 구 키 → Store Hub 단계.

---

## 10. 최종 판정

```
COMMUNITY_CONTENT_BOUNDARY=PASS
SERVICE_CONTENT_BOUNDARY=PASS
SUPPLIER_CONTENT_BOUNDARY=PASS
STORE_COPY_CONTRACT=PASS
KPA_PRODUCER_DRIFT=FIXED
CONTENT_META=ALIGNED
NEW_UNIVERSAL_CONTENT_TABLE=0
NEW_TRANSFER_ENGINE=0
FOLLOWUP=<Hub 이동: 회원 signage 탭 MOVE_TO_COMMUNITY · producer='store' dead 분기 RETIRE · HubProducer 축소 · SMT-G8><Store source mapping: 출처 4종↔3+1 경로 · source_type 의미><Supplier distribution: library → Store Hub/Service Operator 제공 경로>
NEXT=GO_SERVICE_WORKSPACE_FOUNDATION
```

구현 commit: (본 CHECK 와 동일 commit) · 기록 commit: 후속 기재.
