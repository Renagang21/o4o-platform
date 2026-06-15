# IR-O4O-POP-PRODUCTION-FLOW-OPERATOR-STORE-AUDIT-V1

> **유형**: Investigation (read-only) — POP(판촉물/Point-of-Purchase) 제작 흐름 operator→store 감사. 기능별 제작 정비 첫 축.
> **성격**: 코드/DB/route/UI **무변경**. 조사 문서만 (file:line 근거).
> **결론(요약)**: **POP 흐름은 O4O 철학·3서비스 parity 와 대체로 정합(A 주).** operator 발행(`store_pops` author_role='operator')→`/store-hub/pop` browse(`hub-content queryPop`)→**import(복사+단절)**→매장 POP(`store_pops` author_role='store')→제작 PDF(`store_execution_assets` usage_type=pop) 흐름이 KPA/GP/KCos 동일 마운트. 가져오기=복사·원본 단절 충족. 잔여(관찰): **B** 출처 추적이 excerpt prefix(`[운영자 자료 가져옴]`)로 비구조적, **C** POP 복사가 content(snapshot `o4o_asset_snapshots`)와 **다른 domain import(`store_pops`→`store_pops`)** — 메커니즘 이원화(snapshot 'pop' resolver 잠재 dormant), **D** import 된 `store_pops`(내 매장 POP staff) ↔ StorePopPage PDF builder(library/direct/snapshot 입력) **연결 불명확**. 구조 통합 불필요.
> **선행/근거**: `O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1` · `O4O-STORE-MENU-CANONICAL-TREE-V1` · `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`.
> **작성일**: 2026-06-15

---

## 1. 목적

POP 제작이 운영자 발행 → 매장 허브 → 내 매장 복사 → 매장 제작(편집/PDF) → 결과물로 어떻게 이어지는지, 3서비스 parity·철학 정합·구조를 감사. 통합/구조 변경 아님.

## 2. 흐름 맵 (operator → store)

```text
[운영자 발행]  operator-pop.controller  → store_pops (author_role='operator', store_id=NULL, status draft→published)
   POST/PUT /operator/pop/posts(+publish/archive)        프론트: OperatorPopListPage/WritePage
        │  (status='published' → HUB 노출)
        ▼
[HUB browse]  GET /hub/contents?sourceDomain=pop  → hub-content.service queryPop
   (store_pops WHERE service_key=X AND author_role='operator' AND status='published')   프론트: HubPopLibraryPage(/store-hub/pop)
        │  "내 매장에 가져가기"(Copy 아이콘) = importOperatorPop
        ▼
[복사=import]  POST /stores/:slug/pop/staff/import  → store_pops INSERT
   (author_role='store', store_id=pharmacy.id, status='draft', excerpt prefix '[운영자 자료 가져옴]')
        │  ← 원본(operator row)과 별도 row · FK 없음 → 단절
        ▼
[내 매장 POP]  GET/PUT/DELETE /stores/:slug/pop/staff(/:id)  (author_role='store' 한정)
        │
        ▼
[제작 결과물]  StorePopPage(/store/marketing/pop) → POST /pharmacy/pop/generate(save=true)
   → store_execution_assets (source_type='generated', usage_type='pop', fileUrl=PDF)
   (입력: library/store_execution_assets + direct/kpa_store_contents + snapshot/o4o_asset_snapshots + qrId)
   상품 POP: ProductPopBuilderPage(/store/commerce/products/:id/pop) → product_ai_contents (pop_short/long)
```

## 3. 인벤토리

### 3.1 테이블/엔티티
| 테이블 | 역할 | 핵심 |
|--------|------|------|
| `store_pops` (`routes/o4o-store/entities/store-pop.entity.ts`) | operator 발행 원본 + 매장 import 사본(텍스트) | author_role(operator/store), store_id(nullable), service_key, status, slug. CHECK: operator↔store_id NULL / store↔NOT NULL. idx (service_key,author_role,status) HUB query |
| `store_execution_assets` (usage_type='pop') | POP **제작 결과물(PDF)** | source_type='generated', fileUrl. (rename migration 에서 usage_type 추가) |
| `product_ai_contents` | 상품별 POP(pop_short/long) | ProductPopBuilderPage 산출 |
| (입력) `kpa_store_contents`/`o4o_asset_snapshots` | PDF 제작 입력 자료 | Material/snapshot |

### 3.2 backend (3서비스 마운트)
| 컨트롤러 | 엔드포인트 | mount |
|----------|-----------|-------|
| `operator-pop.controller.ts` | `/operator/pop/posts` CRUD + publish/archive (author_role=operator 서버강제) | kpa.routes:450 · glycopharm:445 · cosmetics:189 |
| `pop.controller.ts`(staff) | `/stores/:slug/pop/staff`(list) ·`/import`·PUT·DELETE (author_role=store) | kpa:430 · glycopharm:466 · cosmetics:206 |
| `store-pop.controller.ts` | `/pharmacy/pop/generate`(PDF, save→execution_assets) ·`/pharmacy/pop/source/supplier-items` | `router.use('/')` 3서비스 |
| `hub-content.service` `queryPop` | `GET /hub/contents?sourceDomain=pop&producer=operator` | 공통 |

### 3.3 frontend (3서비스)
| 화면 | route | KPA / GP / KCos |
|------|-------|------|
| 운영자 POP 목록·작성 | `/operator/pop`(+write) | OperatorRoutes:182 / App:875 / App:726 (**3서비스 마운트**) |
| HUB POP browse | `/store-hub/pop` | HubPopLibraryPage (pharmacy/ · hub/ · hub/) |
| 내 매장 POP 제작 | `/store/marketing/pop` | StorePopPage (3서비스) |
| 상품 POP | `/store/commerce/products/:id/pop` | ProductPopBuilderPage (3서비스) |
| client | popStaff.ts(importOperatorPop) | 3서비스 |

## 4. 3서비스 parity

| 항목 | KPA | GP | KCos |
|------|:---:|:--:|:----:|
| operator POP 작성(프론트+backend) | ✅ | ✅ | ✅ |
| HUB POP browse + import | ✅ | ✅ | ✅ |
| 매장 POP staff(list/import/edit/delete) | ✅ | ✅ | ✅ |
| POP PDF generate(save→execution_assets) | ✅ | ✅ | ✅ |
| 상품 POP builder | ✅ | ✅ | ✅ |

> **POP 흐름 3서비스 full parity.** (조사 중 "GP/KCos operator route 미마운트" 의심 있었으나 **오확인** — GP App.tsx:875·KCos App.tsx:726 마운트 확인됨.)

## 5. 철학 정합 (Drift Guard)

| 기준 | 결과 |
|------|------|
| 운영자가 HUB 발행 주체(공급자 직접 발행 X) | ✅ author_role='operator' 서버강제, supplier enum 금지(CHECK) |
| 가져오기=복사 | ✅ import = `store_pops` 새 row 생성(텍스트 복사) |
| 원본-사본 단절 | ✅ operator row ↔ store row 별도, FK 없음. 원본 수정/삭제가 사본에 영향 없음 |
| serviceKey 격리 | ✅ 모든 query service_key 필터 |
| HUB↔내 매장 같은 축(POP) | ✅ STORE-MENU-CANONICAL 6항목 中 POP |
| author_role 분리 | ✅ operator(store_id NULL)/store(NOT NULL) CHECK |

> **중대한 철학 충돌 없음.** POP 도 가져오기=복사·단절·발행↔복사 구분 충족.

## 6. 관찰 / 잔여

**B. 출처 추적 비구조적** — import 사본의 출처가 `excerpt` prefix `[운영자 자료 가져옴]` 텍스트로만 표기(구조적 source 컬럼 부재). `pop.controller` 주석에 향후 `origin_metadata` 컬럼 언급. content snapshot 의 `sourceService/sourceAssetId` 같은 구조적 출처 메타 부재 → 추적·역링크 약함.

**C. 복사 메커니즘 이원화** — content/lesson/signage/resource 는 **snapshot 복사**(`assetSnapshotApi.copy` → `o4o_asset_snapshots`). POP(및 blog)은 **domain import**(`importOperatorPop` → `store_pops`→`store_pops`). 두 복사 경로 공존. `KpaAssetResolver` 의 `'pop'` snapshot resolver 가 존재하나 POP UI 는 domain import 사용 → snapshot 'pop' 경로 **잠재 dormant**(확인 필요). 의도된 설계(store_pops=blog 패턴)이나 일관성/문서화 여지.

**D. import 사본 ↔ PDF builder 연결 불명확** — import 된 `store_pops`(author_role='store', 내 매장 POP staff 목록)가 StorePopPage PDF generate 의 **입력으로 쓰이는지 불명확**. PDF builder 입력은 library(execution_assets)/direct(kpa_store_contents)/snapshot(o4o_asset_snapshots)/supplier-items 로 보이며, `store_pops` staff 사본은 별도 목록일 가능성. → "가져온 POP → 그 POP 으로 제작" 연결 흐름 확인 필요(후속 조사).

**E. POP 저장 3원화** — `store_pops`(텍스트 원본/사본) · `store_execution_assets`(PDF 결과물) · `product_ai_contents`(상품 POP). 역할 구분은 명확하나(원본/결과물/상품) 사용자·개발자 인지 비용. (테이블 통합 불필요 — 역할 상이.)

## 7. 판정

| 안 | 해당 | 근거 |
|----|:---:|------|
| **A** 철학·parity 정합 | **주** | 발행→HUB→import(복사+단절)→제작→PDF 3서비스 full parity, drift 0 |
| **B** 출처 추적/안내 보강 | 관찰 | excerpt prefix 비구조적 출처 |
| **C** 복사 메커니즘 이원화 정리/문서화 | 관찰 | snapshot vs domain import 공존, 'pop' resolver dormant 가능 |
| **D** import↔PDF builder 연결 확인 | 관찰(후속 조사) | 가져온 POP 이 제작 입력으로 이어지는지 불명확 |
| 통합/구조 변경 | ❌ | 역할별 테이블 분리 타당, 변경 불요 |

→ **종합 = A(주) + B/C/D 관찰.** 구조 정합, 보강·연결 확인은 저위험 후속.

## 8. 후속 WO 후보 (선택)

1. `IR-O4O-POP-IMPORT-TO-BUILDER-LINK-AUDIT-V1`(후속 조사, D) — import 된 `store_pops` 사본이 StorePopPage PDF 제작 입력으로 연결되는지 / 끊겨 있으면 연결 설계.
2. `WO-O4O-POP-COPY-ORIGIN-METADATA-V1`(B) — import 출처를 excerpt prefix → 구조적 source 메타(operator sourceId/serviceKey) 보강. (DB 컬럼 추가 동반 — 신중.)
3. `IR-O4O-POP-COPY-MECHANISM-DUALITY-AUDIT-V1`(C) — snapshot 'pop' resolver dormant 여부 + content(snapshot) vs POP/blog(domain import) 복사 일원화/문서화 판단.
4. (선택) HubPopLibraryPage GP/KCos near-identical wrapper dedup(browse WO 동형) — POP/QR/blog hub 페이지.

## 9. 결론

- POP 흐름(운영자 발행 → HUB → import 복사 → 내 매장 제작 → PDF 결과물)은 **3서비스 full parity** 이며 **O4O 철학(가져오기=복사·원본 단절·발행↔복사 구분·serviceKey 격리)과 정합(A)**.
- POP 복사는 content 의 snapshot 방식과 달리 **domain import(`store_pops`→`store_pops`)** 를 쓰며(blog 패턴), 출처는 excerpt prefix 로 비구조적(B/C).
- import 된 매장 POP 사본이 PDF builder 입력으로 이어지는지는 **불명확**해 후속 조사 권장(D).
- **권고**: 구조/테이블 변경 없음. 필요 시 ① import↔builder 연결 조사(D) → ② 출처 메타 보강(B) → ③ 복사 메커니즘 일원화 판단(C) 순.

---

*Date: 2026-06-15 · read-only IR · 코드/DB 무변경 · POP operator→store 흐름 = 3서비스 parity + 철학 정합(A). 관찰: 출처 비구조적(B) / 복사 메커니즘 이원화(C) / import↔builder 연결 불명확(D). 가져오기=복사·단절 충족, 구조 변경 불요.*
