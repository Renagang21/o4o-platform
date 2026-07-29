# CHECK-O4O-KPA-STORE-PRODUCTION-MATERIALS-ENTRY-ALIGNMENT-V1

> WO: `WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-ENTRY-ALIGNMENT-V1`
> 선행 IR: [IR-O4O-KPA-STORE-HIDDEN-MANAGEMENT-ENTRY-POLICY-AUDIT-V1](../investigations/IR-O4O-KPA-STORE-HIDDEN-MANAGEMENT-ENTRY-POLICY-AUDIT-V1.md)
> 작업일: 2026-07-29 · 대상: `services/web-kpa-society` (KPA 한정)

---

## 1. list / new / edit 기존 역할

| Route | 기존 element | 실제 역할 | 활성 인바운드 |
|---|---|---|:--:|
| `/store/library/production-materials` | `StoreProductionMaterialsPage` | 4소스(direct content / execution asset / QR / 블로그) 기술적 UNION 목록. 고유 검색·필터·편집 계약 없음 | **0** |
| `/store/library/production-materials/new` | `ProductionMaterialEditorPage` | 위 list 의 "새 제작 자료 만들기" CTA 에만 종속된 생성 route | **0** |
| `/store/library/production-materials/:id/edit` | `ProductionMaterialEditorPage` | 자료함 > 콘텐츠의 execution asset 행 **[편집]** 딥링크 | **1** |

인바운드 판정 근거 (정적 검색, `services/web-kpa-society/src`):

- list 로 `navigate`/`Link` 하는 활성 코드 0건. 잔여 문자열은 전부 주석 또는 `StoreProductionMaterialsPage` 내부(자기 참조).
- new 로 `navigate` 하는 코드는 `StoreProductionMaterialsPage` 3곳(L252/262/342)뿐 → 해당 페이지가 라우팅에서 빠지면 함께 도달 불가.
- edit 인바운드 = `StoreContentsSelector.tsx:139` (`/store/library/production-materials/${it.id}/edit`) — **유지 필수**.

---

## 2. list route 처리

```tsx
<Route path="library/production-materials" element={<Navigate to="/store/library/contents" replace />} />
```

`replace` 이므로 history 에 legacy URL 이 남지 않아 뒤로가기 loop 가 발생하지 않는다. 1홉 수렴.

## 3. new route 처리

```tsx
<Route path="library/production-materials/new" element={<Navigate to="/store/library/contents" replace />} />
```

신규 제작 진입점으로 되살리지 않는다. canonical 제작 흐름 = 자료함 > 콘텐츠(StartProductionModal) / POP / QR-code / 블로그 / 상품 설명.

## 4. edit route 처리

`/store/library/production-materials/:id/edit` → `ProductionMaterialEditorPage` **무변경**. route·컴포넌트·저장 API·payload 모두 그대로.

---

## 5. StoreProductionMaterialsPage 처리 — **보존**

판정 근거:

- KPA 전용 컴포넌트이며 GP/K-Cos 는 **각자 자체 동명 파일**을 사용한다
  (`services/web-glycopharm/src/pages/store-management/StoreProductionMaterialsPage.tsx`,
   `services/web-k-cosmetics/src/pages/store/StoreProductionMaterialsPage.tsx`).
  → 타 서비스가 KPA 파일을 import 하지 않음(중지 조건 해당 없음).
- 그러나 이 페이지는 `SelectContentsForProductionModal`(KPA 내 **유일 소비처**)를 사용한다.
  삭제 시 해당 모달까지 고아가 되어 삭제 범위가 연쇄 확대 → WO §6.4 "삭제가 애매하면 보존한다" 적용.

처리:

- `App.tsx` 의 `lazy(() => import('./pages/pharmacy/StoreProductionMaterialsPage'))` **제거** (`noUnusedLocals: true` 이므로 필수).
- 파일은 보존하되 헤더에 `@deprecated` + 되살리기 금지 사유 명시.
- 결과: **KPA 활성 route 참조 0** (WO §9 예상값과 일치).

---

## 6. stale 주석 정정

| 파일 | 정정 내용 |
|---|---|
| `ProductionMaterialEditorPage.tsx` | ① "저장 후 → `/store/library/production-materials` 이동" → **`/store/library/contents`** 로 정정(실제 코드는 이미 contents. 주석만 과거값) ② 진입 계약을 "KPA 활성 진입 = `:id/edit` 딥링크, `/new` 는 legacy redirect" 로 명시 |
| `StoreProductionMaterialsPage.tsx` | `@deprecated` 블록 추가 — 미라우팅·canonical 은 자료함 > 콘텐츠·복원 금지 |
| `SelectContentsForProductionModal.tsx` | 유일 소비처가 미라우팅되어 KPA 활성 사용처 0 임을 명시 |
| `StoreContentsSelector.tsx` | KPA 활성 소비처는 `/store/library/contents` 단일, `:id/edit` 링크는 canonical 딥링크로 유지됨을 명시 |
| `StoreHomePage.tsx` | 헤더 변경 이력 중 "매장 제작 자료 단일 링크" 항목이 이후 WO 로 이미 교체되어 **홈 활성 링크 0** 임을 명시 + 홈 CTA 재추가 금지 |

- `StorePopCreateModal.tsx` 는 KPA 저장소에 **존재하지 않음**(WO §6.5 목록의 추정 파일). POP 관련 KPA 파일(`StorePopPage` / `PharmacyPopPage` / `ProductPopBuilderPage` / `HubPopLibraryPage`)에는 production-materials 참조가 없어 정정 대상 0건.
- 과거 IR·WO·archive 문서는 역사 기록이므로 수정하지 않았다.

검증: `rg "저장 후.*production-materials" services/web-kpa-society` → **0건**.

---

## 7. 저장 후 이동 (WO §6.6)

`ProductionMaterialEditorPage.handleSave()` 는 **생성 분기(L184) / 편집 분기(L169) 모두 이미 `navigate('/store/library/contents')`** 였다.
→ 코드 변경 없이 주석만 정정. 저장 API·payload 무변경.

부수 확인: `asset_type !== 'content'` 방어 분기(L123)와 로드 실패 복귀 버튼(L209)도 이미 `/store/library/contents` 로 정렬되어 있다.

---

## 8. 공통 모듈 · 타 서비스 영향

| 대상 | 변경 | 비고 |
|---|:--:|---|
| `packages/store-ui-core` (`storeMenuConfig.ts`, `ProductionMaterialEditorShell`, `StoreProductionMaterialsView`, `StoreAssetDerivationViewer`) | **0** | WO §6.7 · §12 준수. KPA 블록에 production-materials 메뉴가 이미 없음을 **확인만** 함 |
| `ProductionMaterialEditorShell.savedPath` 기본값(`/store/library/production-materials`) | **0** | KPA 는 이 shell 을 쓰지 않고 자체 `ProductionMaterialEditorPage` 사용 → GP/KCos 영향 0 |
| `services/web-glycopharm` | **0** | `App.tsx` L1066~1067 production-materials route 그대로. `git status` 무변경 |
| `services/web-k-cosmetics` | **0** | `App.tsx` L843~844 그대로. `git status` 무변경 |
| `packages/shared-space-ui/src/guide/copy/kpa.ts` | **0** | 가이드 문구가 `/store/library/production-materials` 를 "내 자료함 열기" 로 안내하는 링크 4~5곳 보유. **공통 package 변경 금지(§7·§12)** 이므로 미수정 — replace redirect 로 1홉 흡수되어 데드링크 0. 문구 정합은 후속 WO 대상 |

**중지 조건 점검 결과 — 해당 없음**: 외부 callback/알림/앱 딥링크 0 · new 활성 사용 0 · 타 서비스의 KPA 컴포넌트 import 0 · edit 분리 가능 · savedPath 영향 0 · 대상 파일 타 세션 WIP 0.

---

## 9. API · DB 영향

`kpa_store_contents` / `store_execution_assets` / `pharmacy_qr_codes` / `staff_blog_posts` / `store_asset_derivations` / 저장 API / direct content API / QR API / 블로그 API / schema / migration / 운영 데이터 — **전부 변경 0**. redirect 는 데이터 삭제가 아니다.

---

## 10. typecheck · build

```
services/web-kpa-society $ npx tsc --noEmit   → PASS (출력 0)
services/web-kpa-society $ npx vite build     → PASS (✓ built in 20.44s)
```

공통 package 무변경이므로 타 서비스 build 는 생략, route/config 무변경을 정적 확인(§8)으로 대체.

---

## 11. 브라우저 smoke

프로덕션 `https://kpa-society.co.kr` · 약국 경영자 계정 · 리비전 `kpa-society-web-01734-b96`.

| # | 시나리오 | 결과 |
|:--:|---|:--:|
| 11.1 | `/store/library/production-materials` 접속 | **PASS** — `/store/library/contents` 로 이동, 자료함 콘텐츠 목록 정상 표시 |
| 11.1b | 위 상태에서 뒤로가기 | **PASS** — legacy URL 로 되돌아가지 않음(replace 확인), loop 없음 |
| 11.2 | `/store/library/production-materials/new` 접속 | **PASS** — `/store/library/contents` 로 이동, 편집기 미노출 |
| 11.2b | 위 상태에서 뒤로가기 | **PASS** — loop 없음 |
| 11.3 | 자료함 > 콘텐츠 → execution asset 행 **[편집]** | **PASS** — `/store/library/production-materials/:id/edit` 진입, 제목·본문 hydrate 정상 |
| 11.3b | 편집기에서 취소 | **PASS** — 자료함 콘텐츠로 복귀. **저장하지 않음 → 운영 데이터 write 0** |
| 11.4 | 사이드바에 production-materials 메뉴 없음 | **PASS** — 약국 자료함 = 콘텐츠 / 자료 2개만 |

- 저장(write) 검증은 운영 데이터 변경 우려로 **조회·진입·취소까지만** 수행 (WO §11.3 허용 범위).
- GP/K-Cos 브라우저 회귀는 route/config 코드 무변경(§8, `git status` 기준)으로 대체 기록.

---

## 12. 금지 사항 준수

`:id/edit` redirect·제거 0 / 저장 구조 변경 0 / execution asset 데이터 이동 0 / 자료함 contents 목록 구조 변경 0 / QR·블로그·POP 화면 변경 0 / production-materials 메뉴 복원 0 / `store-ui-core` 변경 0 / 공통 editor package 변경 0 / GP·KCos route 변경 0 / API 변경 0 / DB migration 0 / 운영 데이터 일괄 처리 0.

---

## 13. 커밋 사고 기록 (투명 보고)

구현 커밋 `c71061ad7` 에 **다른 세션이 index 에 staged 해 둔 `services/web-neture` CSV import 파일 3건의 삭제**가 함께 포함되었다.
`git status --short` 에는 해당 staged 삭제가 표시되지 않아 사전에 감지하지 못했고, path-specific `git add` 로도 기존 index 내용은 배제되지 않았다.

- 영향: `web-neture/src/App.tsx` 와 `pages/supplier/index.ts` 가 여전히 `SupplierCsvImportPage` 를 참조하므로 **main 의 web-neture 빌드가 일시적으로 깨진 상태**였다.
- 조치: 3개 파일을 직전 커밋 기준으로 원상 복구 → `4e9a46ee4` 로 커밋·push (약 1분 내 복구). 다른 세션의 작업 의도를 되돌린 것이 아니라, 그 세션이 스스로 커밋하기 전 상태로 되돌린 것이다.
- 잔여: `c71061ad7` 의 커밋 제목 앞에 `@` 문자가 섞여 들어갔다(here-string 인용 오류). 이미 push 된 공용 브랜치이므로 history rewrite 없이 그대로 둔다.
- 재발 방지: path-specific 커밋 전 `git diff --cached --stat` 로 index 잔여를 먼저 확인한다.

---

## 14. 후속

- `packages/shared-space-ui/src/guide/copy/kpa.ts` 의 production-materials 안내 문구 → 자료함 > 콘텐츠 기준으로 정합 (공통 package 변경이므로 별도 WO).
- `storeMenuConfig.ts` KPA 블록 주석의 "route(/store/library/production-materials, /new, /:id/edit)는 App.tsx 에 유지" 표현 → 현재는 list/new 가 redirect 이므로 문구 갱신 필요 (동일하게 store-ui-core 변경 → 별도 WO).
- KPA `StoreProductionMaterialsPage` + `SelectContentsForProductionModal` 물리 삭제 여부 판단 (dead code 정리 WO).
