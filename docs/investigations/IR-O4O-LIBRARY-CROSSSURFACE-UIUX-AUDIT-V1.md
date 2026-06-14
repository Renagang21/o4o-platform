# IR-O4O-LIBRARY-CROSSSURFACE-UIUX-AUDIT-V1

> **유형:** 조사 IR (read-only, 코드/UI/API/DB/route/menu 무변경)
> **목적:** O4O 각 서비스에 분산된 "자료실" surface 를 조사하고, KPA Society 기준 UI-UX 공통화 가능 범위와 서비스별 차이를 확정한다.
> **작성:** 2026-06-13

---

## ⚠️ 핵심 결론 (먼저 읽을 것)

> **1) 자료실은 signage 보다 이미 훨씬 더 공통화되어 있다.** 4영역(커뮤니티/매장 허브/내 매장/운영자) 전부가 shared 컴포넌트(`ResourcesHubTemplate`, `ContentHubTemplate`, `StoreAssetDerivationViewer`, `OperatorResourcesConsolePage`, `StartProductionModal`)를 쓰며, **내 매장 `/store/library/*` 3단(콘텐츠·자료·제작자료) 구조가 KPA/GP/KCos 에서 거의 동일**(선행 cross-service WO 로 이미 공통화됨). → "KPA baseline → GP/KCos 확산" 의 대부분이 **이미 완료** 상태. 남은 정비는 **용어 정규화 + KCos 추가 surface 정리 + 일부 inline-style** 수준으로 작다.
>
> **2) Neture 는 매장형 자료실이 없다 (사용자 가설 확인).** Neture 는 `/supplier/library`(공급자 전용 business library, `neture_supplier_library_items`, supplierId scope) + `/resources`(이미 공유 `ResourcesHubTemplate` 사용, public read-only)만 보유. **`/store/library/*` 없음.** → 매장형 store-library 공통화 대상 **제외**. Neture `/resources` 는 이미 커뮤니티 레벨에서 공통화돼 있고, `/supplier/library` 는 별개 "공급자 자료실" 축 → 분류 **(B/C)**.

## 1. 조사 개요

자료실 = 매장 실행 자료·콘텐츠·제작물·운영 안내·홍보 자산 보관/활용 영역. 4서비스 × 4영역(커뮤니티/매장 허브/내 매장/운영자)을 read-only 3-에이전트 병렬 탐색 + shared/backend 조사.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `5143cfbcc` |
| origin ahead/behind | 0 / 0 |
| git status --short | `M pnpm-lock.yaml` (다른 세션 WIP — 미접촉) |
| 조사 기준 commit | `5143cfbcc` |

## 3. 조사 대상 / baseline 적용 후보

| 서비스 | 조사 | baseline 적용 |
|--------|:--:|:--:|
| KPA Society | ✅ (기준) | ✅ |
| GlycoPharm | ✅ | ✅ |
| K-Cosmetics | ✅ | ✅ |
| Neture | ✅ | **보류(매장형 제외)** |

## 4. route 매트릭스

상태: LIVE / STUB / DEAD / DUPLICATE / N/A / POLICY

### 4.1 커뮤니티
| 서비스 | route | component | 제목 | shared | 상태 |
|--------|-------|-----------|------|--------|:--:|
| KPA | `/resources` | ResourcesHubPage | "자료실" | ResourcesHubTemplate | LIVE |
| GP | `/resources` | ResourcesPage | "자료실" | ResourcesHubTemplate | LIVE |
| KCos | `/resources` | ResourcesPage | "자료실"(read-only) | ResourcesHubTemplate | LIVE |
| KCos | `/library/content` (+`/:id`) | ContentLibraryPage | "콘텐츠 라이브러리" | ContentHubTemplate | LIVE(**KCos 단독 추가 surface**) |
| Neture | `/resources` | NetureResourcesPage | "자료실"(공급자·파트너 공유) | ResourcesHubTemplate | LIVE |

### 4.2 매장 허브
| 서비스 | route | component | shared | 상태 |
|--------|-------|-----------|--------|:--:|
| KPA | `/store-hub/content` | HubContentLibraryPage | ContentHubTemplate | LIVE |
| KPA | `/store-hub/{signage,blog,pop,qr}` | Hub{Signage,Blog,Pop,Qr}LibraryPage | DataTable(operator-ux-core) | LIVE |
| GP | `/store-hub/{content,signage,blog,pop,qr}` | 동일 패턴 | 동일 | LIVE |
| KCos | `/store-hub/{content,signage,blog,pop,qr}` | 동일 패턴 | 동일 | LIVE |
| Neture | — | — | — | N/A(매장 허브 없음) |

> 매장 허브에 **통합 "자료실" 라벨은 없음** — 실행자산 유형별(content/signage/blog/pop/qr) 개별 카드·route(의도된 IA, STUB 아님).

### 4.3 내 매장 (매장형 자료실 핵심)
| 서비스 | route | component | 제목 | 상태 |
|--------|-------|-----------|------|:--:|
| KPA | `/store/library/contents` | StoreLibraryContentsPage | 내 자료함/콘텐츠 | LIVE |
| KPA | `/store/library/resources` | StoreLibraryResourcesPage | 내 자료함/자료 | LIVE |
| KPA | `/store/library/production-materials`(+`/new`) | StoreProductionMaterialsPage / ProductionMaterialEditorPage | 내 자료함/제작 자료 | LIVE |
| GP | `/store/library/{contents,resources,production-materials}` | **동일 컴포넌트군** | 동일 | LIVE |
| GP | `/store/content` | StoreAssetsPage | 내 매장 자산 | LIVE |
| KCos | `/store/library/{contents,resources,production-materials}` | **동일 컴포넌트군** | 동일 | LIVE |
| Neture | — | — | — | **N/A(매장형 자료실 없음)** |

> **KPA/GP/KCos 내 매장 자료실은 이미 동일 컴포넌트로 공통화됨**(선행 WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-*, PRODUCTION-MATERIALS-CROSSSERVICE-PHASE2-*).

### 4.4 운영자
| 서비스 | route | component | shared | 상태 |
|--------|-------|-----------|--------|:--:|
| KPA | `/operator/resources`(+`/new`,`/:id/edit`) | OperatorResourcesPage | OperatorResourcesConsolePage(operator-core-ui) | LIVE |
| GP | `/operator/resources` | OperatorResourcesPage | 동일 + **AI 생성 slot** | LIVE |
| KCos | `/operator/resources` | OperatorResourcesPage | 동일(**AI slot 없음**) | LIVE |
| Neture | `/supplier/library`(+`/new`,`/:id/edit`) | SupplierLibraryPage / FormPage | (supplier 전용 local) | LIVE(**공급자 축**) |

## 5. 자료실 개념 매트릭스

| surface | 자료 유형 | 사용자 | 목적 | 공통화 |
|---------|-----------|--------|------|:--:|
| 커뮤니티 `/resources` | 사용자 저장 자료(kpa_contents sub_type=resource) | 회원 | 공동 자료 탐색·저장·AI 활용 | ✅ 완료(ResourcesHubTemplate) |
| KCos `/library/content` | CMS 콘텐츠 | 회원 | 콘텐츠 탐색 | △ KCos 단독(ContentHubTemplate) |
| 매장 허브 `/store-hub/*` | operator 제공 실행자산(content/signage/blog/pop/qr) | store_owner | 탐색→내 매장 복사 | ✅ 완료 |
| 내 매장 `/store/library/contents` | full-copy 콘텐츠 + LMS 참조 | store_owner | 제작 원본(POP/QR/블로그/사이니지 재활용) | ✅ 완료 |
| 내 매장 `/store/library/resources` | 원소스 자료(파일/문서/외부링크) | store_owner | 제작 참고 보관(직접등록+커뮤니티 가져옴) | ✅ 완료 |
| 내 매장 `/store/library/production-materials` | 생성형 자산(AI 결과/QR/블로그) | store_owner | 제작 결과 보관 | ✅ 완료 |
| 운영자 `/operator/resources` | 사용자 자료 검수·게시 | operator | 자료 등록/숨김/삭제 | ✅ 완료(GP만 AI slot) |
| Neture `/supplier/library` | 공급자 파일/문서 | supplier | 공급자 business 자료 | ❌ 별도 축(supplierId scope) |

## 6. UI-UX 비교

| 항목 | KPA | GP | KCos |
|------|-----|-----|------|
| 커뮤니티 자료실 제목 | "자료실" | "자료실" | "자료실"(read-only) + "콘텐츠 라이브러리"(별도) |
| 내 매장 자료함 | "내 자료함"(콘텐츠/자료/제작 자료 3탭) | 동일 + `/store/content` "내 매장 자산" | 동일 |
| 내 매장 styling | **inline style**(StoreLibrary* 3페이지) | 동일 inline | 동일 inline |
| 운영자 자료 | OperatorResourcesConsolePage | 동일 + **AI slot** | 동일(AI 없음) |
| 매장 허브 | 유형별 개별 카드(통합 자료실 라벨 없음) | 동일 | 동일 |
| empty state | "보관된 자료가 없습니다…" 등 공통 문구 | 거의 동일 | 거의 동일 |

**drift 요약:**
- **용어 변주**: "자료실"(커뮤니티) vs "내 자료함"(내 매장) vs "콘텐츠 라이브러리"(KCos) — 일부 혼용.
- **KCos 추가 surface** `/library/content` "콘텐츠 라이브러리" — KPA/GP 동형 부재(정책 gap 인지 확인 필요).
- **GP 운영자 AI slot** — KCos 부재(의도된 정책/백엔드 미구현).
- **내 매장 StoreLibrary* inline style** — shared Tailwind 정규화 여지(경미).
- 구조/컴포넌트는 **이미 3서비스 동형** — 큰 drift 없음.

## 7. 용어 비교

| 개념 | 관측 | 권장(초안) |
|------|------|-----------|
| 커뮤니티 공동 자료 | "자료실"(전 서비스 일치) | 유지 = **자료실** |
| 내 매장 보관/활용 | "내 자료함"(3서비스 일치) | 유지 = **내 자료함** |
| KCos CMS 콘텐츠 | "콘텐츠 라이브러리" | 정책 결정(통합 vs 별도) |
| 제작 결과물 | "제작 자료" | 유지 = **매장 제작 자료** |
| 가져오기 CTA | "내 매장에 추가/복사", "내 자료함 가져가기" | "내 매장에 추가" 계열 정렬 |
| 원소스 | "자료", "원소스 자료" | 유지 |

> signage 와 달리 자료실은 용어가 **대체로 이미 정렬**(자료실/내 자료함/제작 자료). 잔여는 KCos "콘텐츠 라이브러리" 위치/명칭 정도.

## 8. 데이터 흐름

- **매장 자료실 백본:** `store_execution_assets`(organizationId, `usageType` = pop|qr|signage|banner|notice, assetType, sourceType) — POP/QR/signage/blog 실행자산의 **통합 라이브러리**. (legacy `store_library_items` 흡수.)
- **파생 추적:** `store_asset_derivations`(serviceKey+organizationId, sourceKind→derivedKind) — 원본 자료 → POP/QR/블로그/사이니지 결과 polymorphic 링크.
- **복사:** 커뮤니티/허브 → 매장 = `assetSnapshotApi.copy()` → `o4o_asset_snapshots`(asset_type=resource/cms/signage…). 단일 경로.
- **커뮤니티 자료실:** `kpa_contents`(sub_type=resource) — CMS 계열, 자산 테이블과 별개(스냅샷으로 매장에 유입).
- **경계:** 매장=organizationId(+serviceKey), 커뮤니티=serviceKey. CLAUDE.md Store Ops=organizationId 일치.
- **Neture:** `neture_supplier_library_items`(supplierId scope) — **별개 도메인**, 매장 자산 흐름과 무관.

> 계약/데이터 레이어 일관 — backend 변경 불요. drift 는 프론트 표시·용어 한정.

## 9. KPA 내부 정비 필요점

| 점검 | 결과 |
|------|------|
| 커뮤니티/허브/내매장/운영자 자료실 표현 정합 | ○ 대체로 정합(shared 컴포넌트). 용어 "자료실/내 자료함" 명확 |
| 같은 기능 다른 제목/CTA/empty | △ 경미(매장 허브 유형별 라벨, 내 매장 inline style) |
| KPA 먼저 baseline 정리 여지 | 작음 — 이미 공통 컴포넌트 기반. styling 정규화 정도 |
| KPA 고유 vs cross 분리 | KPA 고유 거의 없음(production-materials·resources 이미 cross-service 공통) |

**판정:** KPA 자료실은 이미 잘 정돈 — signage 류의 "KPA baseline 대공사" 불필요. **경미한 용어·styling 정렬**만.

## 10. GP/KCos 확산 가능성

| 항목 | GP | KCos | 판정 |
|------|-----|------|------|
| 커뮤니티 자료실 | 동형 | 동형 + `/library/content` 추가 | KCos 추가 surface 정책 결정(G) |
| 매장 허브 | 동형(content/signage/blog/pop/qr) | 동형 | 이미 확산됨 |
| 내 매장 `/store/library/*` | **동일 컴포넌트** | **동일 컴포넌트** | 이미 확산 완료 |
| 운영자 | +AI slot | AI 없음 | 정책 차이 보존(D) |
| styling | inline | inline | 공통 정규화 여지(B, 선택) |

> **대부분 이미 확산 완료.** 남은 것: KCos `/library/content` 위치 정리, AI slot 정책 명문화, inline→shared styling(선택).

## 11. Neture 자료실 필요성 판단

**분류: (B) + (C)**
- **(B)** library-유사 surface 존재하나 **매장형 아님**: `/supplier/library`(공급자), `/resources`(공유 템플릿, 이미 공통화).
- **(C)** 필요 시 **"공급자/사업자 자료실"로 별도 설계**: `/supplier/library` 가 그 맹아. neture_supplier_library_items(supplierId) 기반.
- **(A/D/E 아님:** 자료실 없음(X), 잘못 들어감(X — 공급자 도메인에 적절), 매장 컴포넌트 재사용(부분 — `/resources` 는 ResourcesHubTemplate 이미 공유).

**권장:** Neture 를 **매장형 store-library 공통화 대상에서 제외**. Neture `/resources` 는 현행 유지(이미 공유). `/supplier/library` 확장/표준화가 필요하면 **별도 `IR-O4O-SUPPLIER-LIBRARY-POLICY-V1`** 로 분리. 이번 baseline 에 포함하지 않음.

## 12. 분류표

| ID | 분류 | 항목 |
|:--:|------|------|
| A | KPA 내부 즉시 정렬 | 용어 미세 정렬(이미 대체로 정합), 매장 허브 라벨 점검 |
| B | shared 추출/정규화 | 내 매장 StoreLibrary* inline style → shared Tailwind(선택) |
| C | GP/KCos 확산 | **대부분 이미 완료**(내 매장·허브 동형). 잔여 적음 |
| D | 정책 보존 | GP operator AI slot vs KCos 부재, "내 약국에 추가" 도메인 문구 |
| E | dead/stub cleanup | (현재 뚜렷한 dead 자료실 surface 없음) |
| F | backend scope | 없음 — store_execution_assets/derivations 일관 |
| G | route/menu IA | **KCos `/library/content` 위치·명칭 정리**(통합 vs 별도) |
| H | 후속 WO | operator AI slot 정책 명문화, styling 정규화 |
| I | Neture | **매장형 제외** — 공급자 자료실은 별도 축(IR 분리) |

## 13. 권장 정비 순서

1. **(작은 정비) `WO-O4O-LIBRARY-TERMINOLOGY-AND-IA-ALIGNMENT-V1`** — KPA 기준 용어 미세 정렬 + KCos `/library/content` 위치/명칭 정책 결정(G) + 매장 허브 라벨 점검. (signage 류 대공사 아님 — 이미 공통화돼 작음.)
2. **(선택) `WO-O4O-STORE-LIBRARY-STYLING-NORMALIZATION-V1`** — 내 매장 StoreLibrary* inline→shared(B).
3. **(정책) `IR-O4O-SUPPLIER-LIBRARY-POLICY-V1`** — Neture 공급자 자료실 별도 설계 여부(C/I).
4. **CHECK** — 자료실 사용자-facing 정렬 종료 고정.

> ⚠️ signage 와 달리 **"KPA baseline → GP/KCos 확산"의 대부분이 이미 완료**되어 있으므로, 큰 확산 WO 보다 **용어·IA 미세 정렬 + 정책 결정** 중심으로 좁히는 것이 맞다.

## 14. 1차 WO 후보

**`WO-O4O-LIBRARY-TERMINOLOGY-AND-IA-ALIGNMENT-V1`**
- 범위: KPA/GP/KCos 자료실 사용자-facing 용어 정렬("자료실"/"내 자료함"/"매장 제작 자료" 확정), KCos `/library/content` 정책 결정, 매장 허브 라벨 점검.
- 제외: backend/API/DB/route path, Neture, operator AI slot 구현.

## 15. 후속 WO 후보

| 후보 | 내용 | 분류 |
|------|------|------|
| `WO-O4O-STORE-LIBRARY-STYLING-NORMALIZATION-V1` | 내 매장 자료실 inline→shared | B |
| `IR-O4O-SUPPLIER-LIBRARY-POLICY-V1` | Neture 공급자 자료실 별도 설계 | C/I |
| `IR-O4O-LIBRARY-OPERATOR-AI-SLOT-POLICY-V1` | GP/KCos operator AI 생성 정책 정렬 | D/H |
| `IR-O4O-KCOS-CONTENT-LIBRARY-IA-V1` | KCos `/library/content` 통합/분리 결정 | G |

## 16. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| 자료실이 매장 실행 자산 흐름과 정합? | ✅ store_execution_assets/derivations 통합 라이브러리, POP/QR/블로그/사이니지 백본 |
| 커뮤니티 콘텐츠 ↔ 매장 자료 활용 흐름 명확? | ✅ 커뮤니티 자료실→snapshot 복사→내 매장 자료함→제작 |
| 운영자 제공 ↔ 매장 owner 사용 충돌? | ✅ operator 검수/게시 → store 복사 소비, 충돌 없음 |
| 단순 다운로드 vs 매장 실행 자산 혼동? | △ "자료"(원소스)와 "제작 자료"(생성결과) 구분 존재(badge). 명칭 정렬로 충분 |
| KPA 고유를 GP/KCos 강제? | ✅ 아님 — 이미 공통 컴포넌트, GP AI slot 은 정책 보존 |
| Neture 매장형 자료실 오포함? | ✅ 방지 — Neture 매장형 없음, 공급자 축 분리 |
| 사용자-facing 용어 일관? | △ 대체로 일관, KCos "콘텐츠 라이브러리"만 변주 |
| 공통화가 1인 유지보수성 향상? | ✅ 이미 shared 컴포넌트 기반(높음). 추가 inline 정규화로 소폭 향상 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **없음** (read-only IR) |
| 생성 IR | `docs/investigations/IR-O4O-LIBRARY-CROSSSURFACE-UIUX-AUDIT-V1.md` |
| 조사 기준 commit | `5143cfbcc` |
| route/surface 매트릭스 | §4 (커뮤니티/허브/내매장/운영자) |
| 자료실 개념 분류 | §5 (사용자저장/CMS/실행자산/원소스/생성형/공급자) |
| KPA 내부 drift | 경미 — 이미 공통 컴포넌트, 용어 대체로 정합 |
| GP/KCos 확산 | **대부분 이미 완료**(내 매장·허브 동형). 잔여=용어/IA/styling |
| Neture 판단 | **매장형 자료실 없음 → 제외**. `/supplier/library`(공급자축)+`/resources`(공유). 분류 B/C |
| UI-UX drift | KCos `/library/content` 추가, 내 매장 inline style, GP operator AI slot |
| 용어 drift | "자료실/내 자료함/제작 자료" 대체로 정렬, KCos "콘텐츠 라이브러리" 변주 |
| 데이터 흐름 | store_execution_assets+derivations 통합 라이브러리, serviceKey/organizationId 경계 — 일관 |
| 권장 정비 순서 | §13 (용어·IA 미세 정렬 → 선택 styling → Neture 정책 IR → CHECK) |
| 1차 WO | `WO-O4O-LIBRARY-TERMINOLOGY-AND-IA-ALIGNMENT-V1` |
| 코드/API/DB/route/menu 변경 | 없음 |
| git status | `M pnpm-lock.yaml`(다른 세션, 미접촉), 본 IR 문서만 신규 |
