# IR-O4O-STORE-PRODUCTION-MATERIALS-RESULTKIND-MULTISOURCE-COMMONIZATION-V1

> **목적**: KPA의 ResultKind + 다중소스 통합목록(material/qr/blog 4소스 병합)을 GlycoPharm/K-Cosmetics로 확장 가능한지 + 어디까지 공통화할지 조사.
> **성격**: read-only 설계 조사 (코드/API/DB/migration 변경 없음).
> **작성일**: 2026-06-06
> **선행**: viewer 추출(KPA PASS) + Glyco/KCos adopt(PASS) — `StoreAssetDerivationViewer` 3서비스 정렬 완료.
> **연관 규칙**: `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md`, CLAUDE.md §13/§13-A, §7(Boundary).

---

## 1. Summary / Verdict

KPA 제작 자료 화면은 **4개 백엔드 list 엔드포인트를 브라우저에서 client-side 병합**해 `updatedAt DESC` 단일 테이블로 보여준다(통합 backend 엔드포인트 없음). glyco/kcos는 **단일소스(execution assets)** 스냅샷.

**핵심 발견(설계 결정에 직결)**:
1. **`directContent`(kpa_store_contents) 소스가 glyco·kcos 양쪽 다 부재** — client 없음 + backend 존재 미확인. KPA "material" kind는 directContent+executionAssets 병합인데, glyco/kcos는 directContent가 없어 **완전 KPA parity는 directContent backend 선행 없이는 불가**. → glyco/kcos는 우선 **directContent 제외 partial 다중소스(executionAssets + QR + blog)**로 가는 것이 현실적.
2. **QR list가 inline-only**(StoreQrPage 내부 `qrFetch`, `/{svc}/pharmacy/qr`) — 재사용 client 추출 필요.
3. **blog client·store slug resolver는 양쪽 보유**(단 slug 소스가 서비스마다 다름: KPA `/pharmacy/info`, glyco `/pharmacy/cockpit/status`, kcos `/store-hub/slug`).
4. **execution-asset delete client 부재**(glyco·kcos), 페이지 삭제는 disabled stub.

**공통화 권장 경계**: `StoreAssetDerivationViewer`와 동일 패턴 — **(d) 소스 fetcher는 서비스별 주입 + (b) ResultKind row-model·per-source normalizer를 공통화**, 목록 렌더 컴포넌트(c)는 후순위. 서비스별 API prefix(`/cosmetics` vs `/glycopharm` vs `/kpa`)·slug 소스 차이를 공통 패키지 밖에 둔다.

→ **바로 전체 페이지 공통화 금지. 단계적**: ① 공통 row-model/normalizer 추출(store-ui-core) → ② glyco partial 다중소스 adopt → ③ kcos adopt → ④ (선택) 목록 컴포넌트 공통화. directContent는 별도 backend 트랙.

---

## 2. Scope
- 대상: ResultKind/다중소스 통합목록의 3서비스 비교 + 공통화 단위·단계 설계.
- 제외: 코드/API/DB/migration, 화면 수정, 공통 컴포넌트 추출, ResultKind 타입 이동.
- 산출물: 본 문서 1건 + 후속 WO 제안.

---

## 3. KPA 참조 아키텍처 (적용 spec)

기준: `services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx` (~1039줄). API base `/api/v1/kpa`.

### 3.1 ResultKind + row model
- `type ResultKind = 'material' | 'qr' | 'blog'` — **'pop' 별도 kind 없음**. POP = `material` 중 `purpose==='pop'`.
- `ProductionMaterialItem { id, title, updatedAt, purpose?, stage?, createdFrom?, fileUrl?, kind, status?, href?, scanCount?, sourceKind }`.
  - `kind`(material/qr/blog) = **렌더 분기**(배지/컬럼/액션). `sourceKind`(direct-content/execution-asset/qr/blog) = **삭제 API 분기 + goCreate origin**. material이 2소스(direct-content+execution-asset)를 흡수하므로 kind≠sourceKind.

### 3.2 4-소스 fetch + 정규화 (`fetchAll`)
각 소스 독립 `.catch(()=>null)`(1개 실패해도 나머지 렌더). 응답 shape 3종을 normalizer가 흡수.

| 소스 | client | 엔드포인트 | →kind | 정규화 핵심 |
|---|---|---|---|---|
| A. directContent | `directContentApi.list()` | `GET /kpa/store-contents` | material | `sourceType==='direct'` 필터, purpose/stage/createdFrom 매핑, sourceKind='direct-content' |
| B. executionAssets | `getStoreExecutionAssets({limit:100})` | `GET /kpa/store/assets` | material | `sourceType==='generated'` 필터, `fileUrl`(출력 PDF), stage='finalized', sourceKind='execution-asset' |
| C. QR | `getStoreQrCodes({limit:50})` | `GET /kpa/pharmacy/qr` | qr | status=활성/비활성, href='/store/marketing/qr', scanCount, sourceKind='qr' |
| D. blog | `fetchStaffBlogPosts(slug,{limit:50})` | `GET /kpa/stores/{slug}/blog/staff` | blog | status(draft/published/archived), href='/store/content/blog', **slug 필요** |

### 3.3 병합/정렬
`[...A,...B,...C,...D].sort(updatedAt DESC)` → 단일 `items` state.

### 3.4 store slug 획득 (blog gate)
`getStoreSlug()` → `getPharmacyInfo()` → `GET /kpa/pharmacy/info` 의 `storeSlug`. **전용 API 호출**(context/route param 아님). slug null이면 blog 소스만 skip.

### 3.5 삭제 분기 (sourceKind 기준)
- material: `direct-content`→`directContentApi.remove`, else→`deleteStoreExecutionAsset`(soft). bulk는 material만.
- qr: `deleteStoreQrCode`(soft). blog: **페이지 삭제 없음**(blog 관리 화면 전용). 체크박스/bulk는 material만.

### 3.6 kind별 행 액션
- 출력/열기: `fileUrl`→출력(PDF), else `href`→열기, else '-'.
- 활용: material→`RowUseMenu`(활용하기 dropdown; purpose==='pop'이면 원본보기 extra), qr/blog→원본보기 버튼.
- 삭제: material→handleDeleteOne, qr→handleDeleteQr, blog→없음.

### 3.7 이미 공통화된 것 (재사용 가능)
`@o4o/store-ui-core`: `StoreAssetDerivationViewer`, `resultKindToDerivedKind`, `StoreResultKind`. `buildProductionState`/`composeSourceTextFromItems`/`PRODUCTION_TARGET_CATALOG`(@o4o/types/production). → adopt 시 production-state·원본보기 plumbing은 이미 공유.

---

## 4. 3-서비스 소스 GAP 매트릭스

| 소스 | KPA | GlycoPharm | K-Cosmetics |
|---|---|---|---|
| **execution assets** | ✅ client+delete | ✅ client / **delete 없음** | ✅ client / **delete export 없음** |
| **directContent** | ✅ (`/kpa/store-contents`) | ❌ **client 없음 + backend 미확인** | ❌ **client 없음** |
| **QR list** | ✅ `getStoreQrCodes`(`/kpa/pharmacy/qr`) | ⚠️ **inline-only**(StoreQrPage, `/glycopharm/pharmacy/qr`) | ⚠️ **inline-only**(`/cosmetics/pharmacy/qr`) |
| **blog staff** | ✅ `fetchStaffBlogPosts(slug)` | ✅ (`/glycopharm/stores/:slug/blog/staff`) | ✅ (`/cosmetics/stores/:slug/blog/staff`) |
| **store slug** | ✅ `/kpa/pharmacy/info`→storeSlug | ✅ `/glycopharm/pharmacy/cockpit/status`→storeSlug | ✅ `/cosmetics/store-hub/slug`→slug |
| **page delete** | ✅ kind 분기 | ❌ disabled stub | ❌ disabled stub |
| **derivation viewer** | ✅ 공통 viewer | ✅ adopt 완료(POP) | ✅ adopt 완료(POP) |

**관찰**:
- **directContent**가 glyco·kcos 공통 부재 — 최대 갭. backend 존재 여부부터 확인 필요(별도 트랙).
- QR list 추출(inline→client) + execution-asset delete client 추가가 양쪽 공통 작업.
- slug 소스 엔드포인트가 3서비스 모두 다름 → **slug resolver는 서비스별 주입**.

---

## 5. 공통화 단위 결정

| 옵션 | 내용 | 위험 | 판정 |
|---|---|---|---|
| (a) ResultKind 타입 + `resultKindToDerivedKind` | 이미 store-ui-core 보유 | 없음 | **완료** — 다중소스 갭 미해소 |
| **(b) ProductionMaterialItem row-model + per-source normalizer(순수함수)** | 4 정규화 transform을 store-ui-core 순수함수로 | 중(raw shape drift 흡수 필요) | **권장 — 최고 leverage(merge 로직 캡처)** |
| (c) 목록 테이블/카드 컴포넌트 | KPA 테이블+RowUseMenu+컬럼 추출 | 중상(용어/테마 hex/route 차이) | **후순위**(config-driven 필요) |
| **(d) 소스 fetcher 서비스별 주입(항상)** | 각 서비스가 자기 fetcher 제공, 공통층은 normalize+render | 저 | **권장 경계** — prefix/slug 차이를 패키지 밖에 둠 |

**권장 경계**: **(d) 주입 fetcher + (b) 공통 normalizer/row-model**, (c)는 이후. `StoreAssetDerivationViewer`(주입 fetch + 공통 UI)와 동일 철학. 서비스별 endpoint prefix·slug 소스·route 차이는 공통 패키지에 절대 hardcode하지 않음.

---

## 6. Consumer Impact Matrix (Shared Module Change Protocol §7)

대상: store-ui-core에 row-model/normalizer 추가(향후 (b) 단계) 시점.

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability | 검증 |
|---|---|---|---|---|
| `@o4o/store-ui-core` | host(신규 추가) | row-model/normalizer 신규 export(기존 불변) | — | 패키지 tsc |
| web-kpa-society | ✅ 다중소스(SSOT) | 기존 inline → 공통 normalizer 교체(선택) | route/role 불변 | tsc + live smoke(기준) |
| web-glycopharm | ✅(단일→다중 adopt 대상) | partial 다중소스 추가(directContent 제외) | StoreOwner(PharmacyStoreGuard) 동일 | tsc + store_owner smoke |
| web-k-cosmetics | ✅(adopt 대상) | 동 | StoreOwnerRoute(membership SSOT 부재 — role 분기) | tsc + store_owner smoke |
| web-neture | ❌ 화면 없음 | 없음 | — | — |
| admin/operator/forum/hub/mypage | ❌ | 없음 | — | — |
| backend per-source 엔드포인트 | — | **무변경**(서비스별 prefix 상이 → 공통층 미hardcode) | — | endpoint 200 probe(서비스별) |

**판정**: 공통화는 store-ui-core에 **신규 export 추가**(기존 계약 불변) + 서비스별 adopt. Protocol §5대로 패키지+3서비스 tsc, ≥2서비스(가능하면 3) smoke 필수. backend 무변경(directContent 제외).

---

## 7. 용어 차이 (사용자-facing)
3서비스 모두 **매장/제작 자료** 사용(약국 아님). KPA H1 "매장 제작 자료", glyco/kcos H1 "제작 자료"(매장 prefix 없음). breadcrumb root 공통 "내 자료함". → 공통 목록은 default "매장 제작 자료" + **H1 prefix만 config**. `StoreAssetDerivationViewer`의 `DEFAULT_SOURCE_KIND_LABELS`는 이미 중립(매장 제작 자료/콘텐츠/자료) + override 지원.

---

## 8. 단계적 구현안 (권장)

```
0. (별도 트랙) directContent backend 존재 확인 IR — glyco/kcos에 kpa_store_contents 대응 테이블/엔드포인트가 있는가?
   없으면 directContent 소스는 glyco/kcos에서 제외(partial 다중소스).

1. WO-...-COMMON-ROWMODEL-NORMALIZER-EXTRACT-V1 (store-ui-core)
   - ProductionMaterialItem + ResultKind('material'|'qr'|'blog') + per-source normalizer(순수함수: execution/qr/blog/[directContent])
   - 주입 fetcher 인터페이스 정의. KPA를 공통 normalizer로 우선 교체(회귀 0 검증, 기준 서비스).

2. WO-...-GLYCOPHARM-MULTISOURCE-ADOPT-V1
   - QR list client 추출(inline→`fetchStoreQrList`), execution-asset delete client 추가, slug resolver(getPharmacyStatus) 연결,
     blog(fetchStaffBlogPosts) 병합 → 공통 normalizer로 통합목록. directContent는 제외(또는 backend 준비 후).
   - kind별 삭제/활용/열기/원본보기 wiring(원본보기는 이미 adopt됨).

3. WO-...-KCOSMETICS-MULTISOURCE-ADOPT-V1 — 동형(prefix /cosmetics, slug /store-hub/slug).

4. (선택) WO-...-LIST-COMPONENT-EXTRACT-V1 — 3서비스 parity 수렴 후 목록 테이블 컴포넌트 공통화(config-driven).
```

원칙: 복붙 금지(공통 normalizer 소비) · KPA 먼저 교체·검증 · 각 차수 작은 단위 · 백엔드 무변경(directContent 제외) · Shared Module Protocol 적용.

---

## 9. 위험/블로커
- **directContent 부재(최대 블로커)**: glyco/kcos에 directContent client·backend 모두 미확인. 완전 KPA parity는 이 backend 선행 필요. → 우선 partial(executionAssets+QR+blog)로 가치 확보, directContent는 별도 트랙(§8.0).
- **slug 소스 3서비스 상이** → resolver 주입으로 흡수(공통화 금지).
- **execution-asset delete 부재**(glyco/kcos) → adopt 시 delete 엔드포인트/client 필요(또는 삭제 비활성 유지).
- **kcos membership store_owner SSOT 부재** → StoreOwnerRoute role 분기 통과(기존 패턴 유지).

---

## 10. 변경하지 않은 것 / 금지 준수
- 코드/API/DB/migration/커밋(코드) 변경 없음 — read-only 설계.
- KPA/Glyco/KCos 화면 미수정 · 공통 컴포넌트 미추출 · ResultKind 타입 미이동.
- 다른 세션 untracked 파일 미접촉. 산출물 = 본 문서 1건.

---

## 11. Follow-ups (제안 WO)
1. (별도) `IR-...-DIRECTCONTENT-BACKEND-EXISTENCE-V1` — glyco/kcos directContent 소스 backend 확인.
2. `WO-...-COMMON-ROWMODEL-NORMALIZER-EXTRACT-V1` — store-ui-core row-model/normalizer + KPA 우선 교체.
3. `WO-...-GLYCOPHARM-MULTISOURCE-ADOPT-V1` (partial: executionAssets+QR+blog).
4. `WO-...-KCOSMETICS-MULTISOURCE-ADOPT-V1`.
5. (선택) `WO-...-LIST-COMPONENT-EXTRACT-V1`.
