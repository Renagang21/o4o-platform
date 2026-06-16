# CHECK-O4O-CONTENT-PRODUCTION-FLOW-UI-COMMONIZATION-V1

> **작업명:** WO-O4O-CONTENT-PRODUCTION-FLOW-UI-COMMONIZATION-V1
> **유형:** production flow UI 공통화 조사 + 최소 1차 공통화 (코드/DB/API 무변경)
> **판정: PASS (by investigation).** 3 candidate 조사 완료 → **가장 작은 후보(B StartProductionModal)는 이미 공통화 완료**(조치 불요), **Candidate A(ProductionMaterialEditorPage)는 near-identical 이나 store-ui-core 신규 dependency(content-editor/error-handling/auth-client) 필요 → §14 위반·Docker 위험으로 dedicated 후속 WO 분리**, **C(signage AI modal)는 domain 결합으로 후속**. 코드 변경 0(신규 dep·대규모 리팩터 금지 준수).
> 선행: CONTENT-SURFACE-COMMONIZATION-MAP-V1 · CONTENT-TYPE-TAXONOMY-V1 — 2026-06-16

---

## 1. 조사 범위 / production flow 파일

| 파일 | 라인 | 비고 |
|---|---|---|
| `web-glycopharm/.../store-management/ProductionMaterialEditorPage.tsx` | 368 | Candidate A |
| `web-k-cosmetics/.../store/ProductionMaterialEditorPage.tsx` | 367 | Candidate A |
| `web-kpa-society/.../pharmacy/ProductionMaterialEditorPage.tsx` | 378 | KPA 별도(본 WO 비대상) |
| `web-kpa-society/.../pharmacy/StartProductionModal.tsx` | 42 | Candidate B — **thin wrapper** |
| `packages/store-ui-core/src/components/StartProductionModal.tsx` | 576 | **canonical** |
| `web-{gp,kcos}/.../StoreLibraryContentsPage.tsx` | 267 | canonical StartProductionModal 직접 사용 |
| KPA `AiContentGenerationModal.tsx`(operator/signage) | — | Candidate C |
| `@o4o/content-editor` AiContentModal | — | 공통 AI modal |

## 2. Candidate B — StartProductionModal: ✅ 이미 공통화 완료 (조치 불요)

- canonical: `packages/store-ui-core/src/components/StartProductionModal.tsx`(576줄, export + types `StartProductionModalProps/StartProductionTargetConfig/StartProductionTemplateItem/ProductionSource…`).
- **KPA `pages/pharmacy/StartProductionModal.tsx`(42줄) = thin wrapper** — `SharedStartProductionModal`(@o4o/store-ui-core)에 KPA `PRODUCTION_TARGET_CATALOG` + `getTemplatesForTarget` 만 주입하고 기존 call site 호환을 위해 type re-export. **stale copy 아님**(WO 의 "local copy 잔존 의심" → 해소: 의도된 config wrapper).
- **GP/KCos**: `StoreLibraryContentsPage` 가 `@o4o/store-ui-core` 의 `StartProductionModal` **직접 import**(canonical 사용).
- → 3서비스 모두 canonical 단일 컴포넌트 사용(KPA=config wrapper, GP/KCos=직접). **추가 공통화 불요.**

## 3. Candidate A — ProductionMaterialEditorPage: near-identical, but 신규 dep 필요 → 후속 분리

- GP vs KCos **diff = 23줄(cosmetic only)**: 헤더 주석(서비스명)·import 경로 스타일(`@/` vs `../../`)·lucide import grouping·주석 1개. **로직/JSX/handler 100% 동일**(~360줄).
- 차이는 per-service `createStoreExecutionAsset`(api, base path `glycopharm` vs `cosmetics`) + `findTemplate`/`productionTemplates`(config) — adapter 주입으로 흡수 가능.
- **그러나 공통 shell 추출 시 store-ui-core 에 신규 의존 필요:**
  - ProductionMaterialEditorPage 가 import: `@o4o/content-editor`(RichTextEditor/EditorContent), `@o4o/error-handling`(toast), `@o4o/auth-client`(getAccessToken), `lucide-react`.
  - `store-ui-core/package.json` 현재 의존: lucide-react(peer)만. **content-editor/error-handling/auth-client 미보유.**
  - → 추출하려면 store-ui-core 에 위 3개 workspace dep 추가 필요 = **WO §14 "신규 dependency 금지" 위반** + file-by-file Dockerfile 갱신 hazard(memory: shared package third-party/workspace dep 누락 시 Cloud Run Docker 빌드 red, PR CI 미검출).
- → 본 WO("가장 작은 공통화 1개 / 신규 dep 금지 / 대규모 리팩터 금지") 범위에서 **불가**. **dedicated 후속 `WO-O4O-PRODUCTION-MATERIAL-EDITOR-SHELL-COMMONIZATION-V1`** 로 분리(dep 추가·Docker 갱신 포함 설계). KPA editor(378줄)는 별도 — 후속에서 별도 판단.

## 4. Candidate C — signage AiContentGenerationModal: domain 결합 → 후속

- KPA `operator/signage/AiContentGenerationModal` 은 signage 전용(미디어/플레이리스트/스케줄, `genResult.generatedContent` → HQ media 저장). 공통 `@o4o/content-editor` `AiContentModal`(content draft 삽입)과 **입출력/저장 flow 상이**.
- 이미 렌더 sanitize 는 `ContentRenderer` 적용(KPA-CONTENT-AI-DRAWER-SANITIZE-V1). 무리한 공통화 시 signage domain 결합 위험 → WO §9 "별도 domain 섞임 → 후속" 해당. **후속 `WO-O4O-SIGNAGE-AI-CONTENT-MODAL-ADAPTER-V1`.**

## 5. 공통 package 사용 현황 (production flow)

| 관심사 | 공통 | 상태 |
|---|---|---|
| StartProductionModal | `@o4o/store-ui-core` | ✅ 3서비스 사용(B) |
| productionUtils(buildProductionState/types) | `@o4o/store-ui-core` | ✅ |
| RichTextEditor / AiContentModal / sanitize | `@o4o/content-editor` | ✅ editor/AI 공통 |
| ProductionMaterialEditorPage | (per-service) | ⚠️ GP/KCos 중복(A, 후속) |
| signage AI modal | (KPA local) | ⚠️ 별도(C, 후속) |

## 6. 1차 공통화 적용 여부

- **코드 변경 없음.** 가장 작은 후보 B 는 **이미 완료**(추가 작업 시 무의미한 no-op). A 는 신규 dep 필요로 본 WO 제약상 불가. C 는 domain 결합. → WO §6.2-D("구조가 크면 코드 변경 없이 CHECK") + §9("조사만 하고 후속 분리") 적용.

## 7. 수정 파일 / 무변경

- 수정 코드 파일 **없음**. 본 CHECK 문서만.
- API/DB/schema/route/menu/copy 동작 **무변경**. 신규 dependency **없음**. content-core 미활성.
- 다른 세션 WIP(`web-neture` App/RoleGuard/role-constants + admin/platform, `cosmetics`/`glycopharm` mypage controller) **미접촉**.

## 8. Typecheck

- 코드 변경 없음 → typecheck 비대상(문서 단독). 후속 A/C 착수 시 해당 package/service typecheck 수행.

## 9. 완료 판정

**PASS (by investigation).**
- production flow UI 지도 재확인, GP/KCos/KPA 차이 분석 완료.
- 공통화 1차 대상 판단: **B 이미 완료 / A·C 후속 분리(사유: A=신규 dep+Docker 위험, C=domain 결합)**.
- 코드/DB/schema/dependency 변경 없음.

## 10. 후속 WO 후보 (우선순위)

1. **WO-O4O-PRODUCTION-MATERIAL-EDITOR-SHELL-COMMONIZATION-V1** — GP/KCos(→KPA 검토) ProductionMaterialEditorPage 공통 shell 추출. **전제: store-ui-core 에 content-editor/error-handling/auth-client dep 추가 + file-by-file Dockerfile 갱신**(또는 content-editor 측/별 package 위치 재검토). diff 23줄(cosmetic)이라 adapter(api/config/route copy) 주입만으로 수렴 가능.
2. `WO-O4O-SIGNAGE-AI-CONTENT-MODAL-ADAPTER-V1` — signage AI modal ↔ 공통 AiContentModal adapter(domain 경계 유지).
3. `WO-O4O-CONTENT-BODY-SANITIZE-ON-WRITE-CROSSSERVICE-V1` — 보안 backlog(raw 저장 sanitize 확장).
4. `WO-O4O-CONTENT-HUB-MY-STORE-COPY-CONTRACT-V1` — assetSnapshot ↔ Neture dashboardCopy 정렬.

## 11. Commit Hygiene

- 본 CHECK 문서 **단독** path-specific stage, 단일 shell call 로 `add → diff --cached → commit → push` 체인. 다른 세션 WIP 미접촉.

---

*Date: 2026-06-16 · production flow UI 공통화 · PASS(by investigation) · B(StartProductionModal) 이미 공통화(KPA wrapper+GP/KCos canonical) · A(ProductionMaterialEditorPage) GP/KCos diff 23줄 cosmetic·logic 동일이나 store-ui-core 신규 dep(content-editor/error-handling/auth-client) 필요 → 후속 분리 · C(signage AI modal) domain 결합 후속 · 코드/DB/dep 무변경.*
