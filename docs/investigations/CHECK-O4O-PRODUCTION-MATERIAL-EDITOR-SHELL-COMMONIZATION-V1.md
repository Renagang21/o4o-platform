# CHECK-O4O-PRODUCTION-MATERIAL-EDITOR-SHELL-COMMONIZATION-V1

> **작업명:** WO-O4O-PRODUCTION-MATERIAL-EDITOR-SHELL-COMMONIZATION-V1
> **유형:** GP/KCos ProductionMaterialEditorPage 공통 shell 추출 (frontend, dependency-safe)
> **판정: PASS.** GP/KCos editor(로직 100% 동일)를 `@o4o/store-ui-core` 의 **zero-@o4o 공통 shell**(`ProductionMaterialEditorShell`)로 추출, 두 서비스는 thin wrapper(어댑터 5개 주입)로 축소. **신규 dependency 0 · package.json/lockfile/Dockerfile 변경 0 · F3 Store Layer freeze(의존 방향) 불변.** store-ui-core / GP / KCos typecheck 전부 EXIT 0.
> 선행: CONTENT-PRODUCTION-FLOW-UI-COMMONIZATION-V1 — 2026-06-16

---

## 1. 사전 diff 결과 (재확인)

- GP `pages/store-management/ProductionMaterialEditorPage.tsx`(368) vs KCos `pages/store/ProductionMaterialEditorPage.tsx`(367): **diff 23줄, 전부 cosmetic**(헤더 주석·import 경로 스타일 `@/` vs `../../`·lucide grouping). 로직/JSX/handler/styles **100% 동일**.
- 서비스 차이: `createStoreExecutionAsset`(api base `glycopharm` vs `cosmetics`) + `findTemplate`/`productionTemplates`(config) 뿐. POP/QR 제작유형·저장 경로(`/store/library/production-materials`)·validation·editor 사용 모두 동일.

## 2. 공통 shell 위치 / 설계

신규: `packages/store-ui-core/src/components/ProductionMaterialEditorShell.tsx` (export: `packages/store-ui-core/src/index.ts`).

**zero-@o4o 원칙(store-ui-core, StartProductionModal 선례와 동일):** `@o4o/*` 직접 import 금지 → peerDeps(react / react-router-dom / lucide-react)만 사용, 나머지는 **props 주입**. 이로써 store-ui-core 의존 방향(F3) 불변 + 신규 dep 0.

주입 props (5개 — §10.2 임계 15 미만):

| prop | 주입값(서비스) |
|---|---|
| `EditorComponent` | `RichTextEditor`(@o4o/content-editor) — 구조적 타입 `InjectedEditorProps`(value/onChange({html})/placeholder/minHeight/preset/aiRequestHeaders) |
| `findTemplate` | service `findTemplate` (config) |
| `createAsset` | service `createStoreExecutionAsset` (api). 입력 `ProductionMaterialCreateInput`(assetType:'content'/sourceType:'generated' 고정 — enum friction 회피) |
| `getAccessToken` | `getAccessToken`(@o4o/auth-client) |
| `notify` | `{ success: toast.success, error: toast.error }`(@o4o/error-handling) |

shell 내부 보유(서비스 무차이): POP/QR 제작유형, location.state 해석, 저장 경로 기본값 `/store/library/production-materials`, validation/스타일.

## 3. 서비스 wrapper 변경

GP/KCos ProductionMaterialEditorPage(각 ~368줄) → **thin wrapper ~30줄**:
```tsx
<ProductionMaterialEditorShell
  EditorComponent={RichTextEditor}
  findTemplate={findTemplate}
  createAsset={createStoreExecutionAsset}
  getAccessToken={getAccessToken}
  notify={{ success: toast.success, error: toast.error }}
/>
```
- route/진입/저장 API/template 적용/editor 동작/뒤로가기 **동일 보존**(동일 코드 경로 → shell).

## 4. dependency 추가 내역 — **없음**

- store-ui-core: zero-@o4o shell → **신규 package dependency 0**(`packages/store-ui-core/package.json` 무변경). peerDeps(react/react-router-dom/lucide-react) 기존 보유.
- GP/KCos wrapper import(`@o4o/store-ui-core`, `@o4o/content-editor`, `@o4o/error-handling`, `@o4o/auth-client`)는 **이미 두 서비스 package.json 에 선언됨**(신규 dep 0).

## 5. Docker / package.production 확인

- **변경 불요.** store-ui-core 는 source 소비(`main/types = ./src/index.ts`, 별도 build 없음). 신규 dep 0 → lockfile/Dockerfile/package.production 영향 **없음**.
- GP/KCos Dockerfile 이 이미 copy 하는 package(store-ui-core/content-editor/error-handling/auth-client)만 사용 → file-by-file COPY 추가 불요.
- `git status -- *package.json pnpm-lock.yaml **/Dockerfile` = **비어있음**(드리프트 0).

## 6. KPA 제외 근거

- KPA `pages/pharmacy/ProductionMaterialEditorPage.tsx`(378줄)는 GP/KCos 와 별도(차이 가능성) → WO §6.3 대로 본 WO 비대상. 후속 `WO-O4O-KPA-PRODUCTION-MATERIAL-EDITOR-SHELL-ADOPTION-V1` 에서 별도 판단. KPA 파일 **미변경**.

## 7. API/DB/schema 무변경 확인

- API contract / DB / migration / route / menu **무변경**. 저장 payload(createStoreExecutionAsset)·경로 동일.
- signage AI modal·content-core·Neture dashboardCopy **미접촉**.

## 8. Typecheck 결과

| 대상 | 명령 | 결과 |
|---|---|---|
| store-ui-core | `tsc --noEmit` | **EXIT 0** |
| web-glycopharm | `tsc --noEmit -p tsconfig.app.json` | **EXIT 0** |
| web-k-cosmetics | `tsc --noEmit` | **EXIT 0** |

- 주입 타입 검증: `RichTextEditor`(ContentEditorProps) → `ComponentType<InjectedEditorProps>` 구조적 호환 OK / `createStoreExecutionAsset` → `createAsset(ProductionMaterialCreateInput)` OK(assetType 'content' literal) / toast·getAccessToken·findTemplate OK.

## 9. 브라우저 smoke 필요 여부

- 배포 후 권장(코드 경로 동일이라 회귀 위험 낮음): GP `/store/library/production-materials/new` + KCos 동 경로 — 진입(state) → template starterHtml → 본문 편집 → 저장(POST .../store/assets) → 목록 이동, 취소/뒤로가기, 콘솔 에러 0. KPA 동일 화면 회귀 없음(미변경).

## 10. 완료 판정

**PASS.**
- GP/KCos ProductionMaterialEditorPage → 공통 `ProductionMaterialEditorShell` 추출 + thin wrapper 완료.
- 신규 dependency 0 / package.json·lockfile·Dockerfile 변경 0 / F3 의존 방향 불변.
- API/DB/schema 변경 없음, KPA·signage 미변경.
- store-ui-core + GP + KCos typecheck EXIT 0.

## 11. 후속 WO 후보

1. `WO-O4O-KPA-PRODUCTION-MATERIAL-EDITOR-SHELL-ADOPTION-V1` — KPA editor 도 shell 적용 가능성 검토(차이 분석 선행).
2. `WO-O4O-SIGNAGE-AI-CONTENT-MODAL-ADAPTER-V1` — signage AI modal ↔ 공통 AiContentModal adapter.
3. `WO-O4O-CONTENT-BODY-SANITIZE-ON-WRITE-CROSSSERVICE-V1` — 보안 backlog.

## 12. Commit Hygiene

- 수정 4파일(shell 신규 + store-ui-core index + GP/KCos wrapper) + 본 CHECK **path-specific stage**, 단일 shell call 로 `add → diff --cached → commit → push` 체인.
- 다른 세션 WIP(operator-core-ui forum-hub/forum-categories, GP/KCos App.tsx·operatorMenuGroups·tailwind·OperatorForumPage·ForumCategoriesManagementPage, KPA ForumCategoriesManagementPage) **미접촉**.

---

*Date: 2026-06-16 · ProductionMaterialEditor shell 공통화 · PASS · GP/KCos editor(diff 23줄 cosmetic·logic 동일) → @o4o/store-ui-core ProductionMaterialEditorShell(zero-@o4o, props 주입 5개) + thin wrapper · 신규 dep 0 / package·lock·Docker 무변경 / F3 의존방향 불변 · KPA·signage 제외 · store-ui-core+GP+KCos tsc EXIT 0.*
