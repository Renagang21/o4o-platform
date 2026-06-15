# CHECK-O4O-POP-IMPORT-TO-BUILDER-LINK-V1

> **작업명:** WO-O4O-POP-IMPORT-TO-BUILDER-LINK-V1
> **유형:** 프론트 연결 — 가져온 POP 사본 → "이 POP으로 제작" → StorePopPage builder prefill. backend/DB/route(backend) **무변경**.
> **결과: PASS (Phase 1, frontend-only) — 3서비스 POP 사본 관리 화면에 "이 POP으로 제작" 액션 추가 → `/store/marketing/pop` 로 router state(`prefillPop`) 전달 → StorePopPage 가 popAiContent(title/본문/요약) prefill. 사용자가 자료(이미지/콘텐츠) 보완 후 PDF 생성(기존 흐름). typecheck(3) 0. backend/DB 무변경.**
> 선행: `IR-O4O-POP-IMPORT-TO-BUILDER-LINK-AUDIT-V1`(C 미연결) · `WO-O4O-POP-STAFF-PAGE-GP-KCOS-PARITY-V1` — 2026-06-15

---

## 1. 배경 / 설계

선행 IR(C): 가져온 POP 사본(`store_pops`)이 builder 와 미연결. builder `/pharmacy/pop/generate` 는 **source item ≥1 강제**(library/direct/snapshot/supplier)이며 store_pops 는 source 아님. WO 흐름은 "prefill → **사용자가 보완 후 생성**" 이므로 **frontend prefill 로 1차 연결**(zero-click produce 는 Phase 2 backend storePopIds).

## 2. 변경 (6 파일, frontend only)

| 파일 | 변경 |
|------|------|
| KPA `pages/pharmacy/PharmacyPopPage.tsx` | row 액션 "이 POP으로 제작"(Printer) → `navigate('/store/marketing/pop', { state:{ prefillPop:{title,content,excerpt} } })` |
| GP `pages/store-management/StorePopStaffPage.tsx` | 동 |
| KCos `pages/store/StorePopStaffPage.tsx` | 동 |
| KPA `pages/pharmacy/StorePopPage.tsx` | prefill effect: `location.state.prefillPop` → `setPopAiContent({title, bullets:[], shortText:excerpt, longText:strip(content)})` + AI 패널 펼침. `history.replaceState` 로 state clear |
| GP `pages/store-management/StorePopPage.tsx` | 동(prefill effect) |
| KCos `pages/store/StorePopPage.tsx` | 동 |

- prefill 은 별도 옵션 state 필드(`prefillPop`)로 전달 — 기존 `production`(자료함→제작) state 흐름과 독립(parseProductionRouterState/production 효과 무영향).
- content(HTML) → longText 는 태그 strip 후 텍스트. generate payload `aiContent: popAiContent` 로 자연 반영(기존).
- 일반 진입(`/store/marketing/pop`, state 없음) 동작 무변경(prefill effect early-return).

## 3. 동선

```
POP 사본 관리(PharmacyPopPage/StorePopStaffPage) → "이 POP으로 제작"(Printer)
→ /store/marketing/pop (StorePopPage) → popAiContent prefill(제목/본문/요약)
→ 사용자가 자료(이미지/콘텐츠) 선택 + QR/레이아웃 보완
→ PDF 생성(POST /pharmacy/pop/generate, aiContent=prefilled) → store_execution_assets(usage_type=pop)
```

## 4. 검증

- **TypeScript 0 errors:** KPA · GP · KCos.
- **정적:**
  - 3서비스 사본 관리 row 에 "이 POP으로 제작" 액션 + StorePopPage prefill effect 추가.
  - `prefillPop` 미전달 시 prefill effect early-return → 기존 builder 동작 무변경. 기존 자료함→제작(production state) 흐름 무영향.
  - **backend/DB/migration/generate 입력 스키마 변경 0.** (connection.ts/neture 변경은 동시 세션 WIP — 미접촉.)
- **무변경:** store_pops 구조 · generate API 입력 · storePopIds source kind 미추가 · 복사 메커니즘 · 출처 메타.
- **browser smoke:** 미수행 — dev 서버·인증 guard. prefill 은 router state→state 매핑(typecheck 검증). **배포 후 권장:** 3서비스 사본 관리 → "이 POP으로 제작" → StorePopPage 에 제목/본문 prefill 확인 → 자료 선택 후 PDF 생성.

## 5. 중단 기준 / 범위 판단 (§8·§11)

- generate 가 source item ≥1 강제(store_pops 비수용) 확인 → **zero-click produce(POP 사본만으로 즉시 PDF)는 frontend prefill 만으로 불가**. WO 흐름("보완 후 생성")에는 부합 → Phase 1 완료.
- **storePopIds backend source kind 미추가**(§7 회피 준수). zero-click produce 필요 시 **Phase 2 `WO-O4O-POP-IMPORT-TO-BUILDER-SOURCE-KIND-V1`**(generate 에 storePopIds 추가, DB 불요)로 분리.

## 6. 완료 판정

**PASS (Phase 1).** 3서비스 "이 POP으로 제작" → builder prefill 연결. 가져온 POP 의 제목/본문/요약이 제작 화면에 초기값으로 전달되어 사용자가 보완 후 PDF 생성. backend/DB/generate 무변경, typecheck 통과.

## 7. 후속

1. (배포 후) 3서비스 prefill 동선 smoke.
2. (선택, Phase 2) `WO-O4O-POP-IMPORT-TO-BUILDER-SOURCE-KIND-V1` — generate 에 `storePopIds` source kind 추가(DB 불요) → POP 사본만으로 zero-click PDF.
3. (선택) KPA/GP/KCos StorePopStaffPage 3중 dup → store-ui-core 공통 컴포넌트 추출.

---

*Date: 2026-06-15 · POP import→builder prefill 연결 PASS(Phase 1, frontend) · 3서비스 "이 POP으로 제작" → StorePopPage popAiContent prefill. 사용자 보완 후 생성. backend/DB/generate 무변경. zero-click produce 는 Phase 2(storePopIds). typecheck(3) 0.*
