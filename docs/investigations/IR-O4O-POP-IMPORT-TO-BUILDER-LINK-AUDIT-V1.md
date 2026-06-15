# IR-O4O-POP-IMPORT-TO-BUILDER-LINK-AUDIT-V1

> **유형**: Investigation (read-only) — 가져온 POP 사본(`store_pops` author_role='store')이 StorePopPage PDF builder 입력으로 이어지는지 확인. 코드/DB/route/UI **무변경**.
> **결론(요약): 판정 C (미연결).** PDF builder `/pharmacy/pop/generate` 는 입력으로 `libraryItemIds`(execution_assets)/`directContentItemIds`(kpa_store_contents)/`snapshotItemIds`(o4o_asset_snapshots)/`supplierItemIds` **4종만** 받고 **`store_pops` 입력 경로가 없다**. 가져온 POP 사본(store_pops)과 PDF builder 는 **분리된 트랙**. KPA `PharmacyPopPage`(내 매장 POP 사본 목록/수정)는 `/store/marketing/pop` 로 generic navigate 만 하고 POP 내용을 builder 로 전달하지 않음(주석: "PDF 출력은 StorePopPage 가 별도 담당"). 추가로 **GP/KCos 는 `PharmacyPopPage` 자체가 부재**(popStaff.ts 가 `importOperatorPop` 만 export) → import 한 store_pops 를 **목록·수정할 UI 가 없는 dead-end**. → 연결 설계 + GP/KCos staff 페이지 parity 후속 필요(DB 변경 없이 가능).
> **선행**: `IR-O4O-POP-PRODUCTION-FLOW-OPERATOR-STORE-AUDIT-V1`(D 관찰) — 2026-06-15

---

## 1. 목적

"운영자 POP 가져오기 → 내 매장 POP 사본(`store_pops`) → POP PDF 제작" 이 실제로 이어지는지(사본이 builder 입력으로 쓰이는지) 확인. 통합/구조 변경 아님.

## 2. Backend — PDF builder 입력 구조

`store-pop.controller.ts` `POST /pharmacy/pop/generate` (`:156-`) 입력(`req.body`, `:175-185`):

| 입력 | 소스 테이블 | 비고 |
|------|------------|------|
| `libraryItemIds` | `store_execution_assets`(org-owned) | `:228` |
| `directContentItemIds` | `kpa_store_contents`(direct) | `:255` |
| `snapshotItemIds` | `o4o_asset_snapshots` | `:276` |
| `supplierItemIds` | 공급자 공개(`isPublic`) | `:296` |

- 검증(`:188-199`): 위 4종 중 **하나 이상 필요**. **`store_pops`(가져온 POP 사본) 입력 키 없음.**
- 결과 저장(`save=true`) → `store_execution_assets`(source_type='generated', usage_type='pop'). source 추적(`:387-389`)도 content_direct/content_snapshot/store_execution_asset 3종만 — store_pops 미포함.
- source 조회 엔드포인트도 `/pharmacy/pop/source/supplier-items`(`:128`)뿐 — store_pops staff 사본을 builder source 로 노출하는 API 없음.

> **→ builder 는 store_pops 를 입력으로 받지 못한다.**

## 3. Frontend — import 후 동선

| 단계 | 동작 | 근거 |
|------|------|------|
| HUB import | `importOperatorPop(slug, id)` → toast "내 매장 POP(초안)에 추가" — **navigate 없음**(hub 페이지 잔류) | `HubPopLibraryPage`(GP `:85-86`) |
| 내 매장 POP 사본 목록 | **KPA only** `PharmacyPopPage`("매장 HUB 에서 가져온 POP 사본 목록 … 자유롭게 수정") | `pages/pharmacy/PharmacyPopPage.tsx:300-302` |
| → builder 진입 | `PharmacyPopPage` 에 `navigate('/store/marketing/pop')` 버튼(`:315`) 있으나 **POP 내용/ id 미전달**(generic nav). 주석(`:20`): "PDF 출력은 기존 StorePopPage 가 별도 담당" | KPA |
| PDF builder | `StorePopPage` generate payload = `supplierItemIds`/production router state(library/direct/snapshot) — **store_pops 미사용** | GP `StorePopPage.tsx:180-188` |

## 4. 서비스 parity (staff 사본 관리 UI)

| 항목 | KPA | GP | KCos |
|------|:---:|:--:|:----:|
| HUB import(`importOperatorPop`) | ✅ | ✅ | ✅ |
| popStaff client list/update/delete | ✅ `fetchStaffPopPosts`/`updateStaffPopPost`/`deleteStaffPopPost`(`popStaff.ts:59,78,89`) | ❌ `importOperatorPop` 만 | ❌ 만 |
| **내 매장 POP 사본 페이지(`PharmacyPopPage`)** | ✅ `/store/...`(가져온 POP 목록/수정) | ❌ **부재** | ❌ **부재** |
| 사본 → PDF builder 입력 연결 | ❌ (builder store_pops 미수용) | ❌ | ❌ |

> **선행 POP IR 의 "staff list/edit 3서비스 parity" 는 backend 한정.** 프론트 사본 관리 페이지는 **KPA only** — GP/KCos import 는 목록/수정 UI 없는 dead-end.

## 5. 판정

```
판정: C (미연결)

- builder(/pharmacy/pop/generate)가 store_pops 를 입력으로 받지 않음 → 가져온 POP 사본 → PDF 제작 동선 끊김 (전 서비스)
- KPA: PharmacyPopPage 에서 사본 목록/수정은 가능하나 builder 로 POP 내용 전달 없음(generic nav) — 분리 인지(주석 line 20)
- GP/KCos: 사본 관리 페이지(PharmacyPopPage) 부재 + popStaff list/edit client 부재 → import dead-end
- DB 변경 없이 연결 가능 여부: 가능 (store_pops 는 이미 존재 — builder generate 에 store_pops source kind 추가 또는 PharmacyPopPage "이 POP 으로 제작" 으로 content 전달)
```

> 분리가 **의도된 설계**(store_pops=POP 문안/기획, builder=원자료 조립→PDF)일 수 있으나, "가져온 POP 으로 제작" 동선은 현재 **끊겨 있음**. 의도 여부는 product 결정 필요.

## 6. 후속 WO 후보

1. `WO-O4O-POP-IMPORT-TO-BUILDER-LINK-V1`(C 해소) — 가져온 `store_pops` 사본을 POP 제작 입력으로 연결. **DB 변경 불요** 안:
   - (a) `/pharmacy/pop/generate` 에 `storePopIds` source kind 추가(store_pops content → PDF), 또는
   - (b) `PharmacyPopPage` "이 POP 으로 제작" → StorePopPage 로 POP content/id 를 router state 전달(builder 가 텍스트 입력으로 수용).
   - product 결정 선행: store_pops 가 builder 입력이 되어야 하는가(연결) vs 독립 트랙 유지(문서화).
2. `WO-O4O-POP-STAFF-PAGE-GP-KCOS-PARITY-V1`(parity) — GP/KCos 에 `PharmacyPopPage` 동등 페이지 + popStaff list/update/delete client 추가(KPA 기준). 현재 GP/KCos import dead-end 해소.
3. (선택, 분리가 의도면) `O4O-STORE-MENU-CANONICAL` / POP publishing standard 에 "store_pops(POP 문안) vs PDF builder(조립) 분리" 명문화.

## 7. 검증 (본 조사)

- **코드/DB/route/UI 변경 0** (read-only). 산출물 = IR 문서 1건.
- builder 입력 4종(library/direct/snapshot/supplier)에 store_pops 부재 확인(`store-pop.controller.ts:175-296`).
- import 후 navigate 없음(HubPopLibraryPage) · KPA PharmacyPopPage builder 진입은 generic nav · GP/KCos PharmacyPopPage·staff client 부재 확인.

## 8. 결론

- **가져온 POP 사본(`store_pops`)은 StorePopPage PDF builder 입력으로 이어지지 않는다(C, 미연결).** builder 는 execution_assets/direct/snapshot/supplier 4종만 수용.
- KPA 는 사본 목록/수정(`PharmacyPopPage`)은 되지만 "그 POP 으로 제작" 연결은 없음(분리 인지). **GP/KCos 는 사본 관리 UI 자체가 없어 import 가 dead-end.**
- **권고**: ① product 결정(연결 vs 독립 트랙) → ② 연결 시 `WO-O4O-POP-IMPORT-TO-BUILDER-LINK-V1`(DB 불요) → ③ GP/KCos staff 페이지 parity(`WO-O4O-POP-STAFF-PAGE-GP-KCOS-PARITY-V1`). 본 조사 범위는 연결 여부 확인까지 — 코드 무변경.

---

*Date: 2026-06-15 · read-only IR · 코드/DB 무변경 · 판정 C(미연결) — POP PDF builder 가 store_pops 미수용, 가져온 POP→제작 동선 끊김. KPA PharmacyPopPage 사본 관리만, GP/KCos 사본 페이지 부재(dead-end). 연결·parity 후속 제안(DB 불요).*
