# CHECK-O4O-KPA-PRODUCTION-MATERIAL-EDITOR-SHELL-ADOPTION-V1

> **작업명:** WO-O4O-KPA-PRODUCTION-MATERIAL-EDITOR-SHELL-ADOPTION-V1
> **유형:** KPA editor 공통 shell adoption 검토 (조사 → 차이 확인 → 보류)
> **판정: PASS (by investigation — adoption 보류).** KPA `ProductionMaterialEditorPage` 는 공통 `ProductionMaterialEditorShell`(GP/KCos)와 **(1) 제작 유형 catalog 4종 vs POP/QR 2종, (2) 테마 색상(primary #2563EB vs #3b82f6) 차이** 로 인해, 무손실 adoption 시 shell 에 `productionTypes` + `colors` 2개 prop 확장 + 전 style 테마화(갓 배포된 GP/KCos pixel-parity 위험)가 필요 → WO §6.3/§12 대로 **코드 변경 없이 후속 분리.** 어댑터(createAsset/getAccessToken/findTemplate/notify)는 호환 확인됨.
> 선행: PRODUCTION-MATERIAL-EDITOR-SHELL-COMMONIZATION-V1(`64fdb911e`) — 2026-06-16

---

## 1. KPA vs shell 차이 분석

KPA `services/web-kpa-society/src/pages/pharmacy/ProductionMaterialEditorPage.tsx`(378) vs shell source(= 추출 전 GP editor).

| 항목 | shell(GP/KCos) | KPA | adoption 영향 |
|---|---|---|---|
| 화면 구조/JSX/흐름 | 동일 | **동일** | OK |
| location.state | generatedHtml/title/sourceMetadata/selectedTemplateId | **동일** | OK |
| 저장 API | `createStoreExecutionAsset`(api base) | `createStoreExecutionAsset`(`../../api/storeExecutionAssets`) | 어댑터 주입 OK |
| getAccessToken | `@o4o/auth-client` | `../../contexts/AuthContext` (동일 shape `()=>string\|null`) | 어댑터 주입 OK |
| toast / findTemplate | @o4o/error-handling / config | 동일 shape | 어댑터 주입 OK |
| 저장 후 경로 | `/store/library/production-materials` | 동일 | OK (기본값) |
| **제작 유형 catalog** | 내부 `PRODUCTION_TYPES` = POP/QR **2종**, `selectedType: 'pop'\|'qr'` | `PRODUCTION_TARGET_CATALOG` = **4종**(pop/qr/blog/product-description), `selectedType: ProductionTarget` | ❗ shell 확장 필요 |
| **테마 색상** | 하드코딩 hex (primary `#3b82f6`, label `#64748b` 등) | `colors` 테마 토큰 (primary **`#2563EB`**, label `neutral600 #475569` 등) | ❗ adoption 시 KPA 색상 회귀 |

(대부분 neutral 토큰은 동일: neutral800 #1E293B, neutral700 #334155, neutral200/300/50/white 일치. primary 와 일부 label neutral 만 상이.)

## 2. 적용 여부 판단 — 보류 (defer)

**무손실 adoption 에 필요한 shell 변경:**
1. `productionTypes` prop 주입 + `selectedType` key 타입을 `'pop'|'qr'` → 제네릭(string/ProductionTarget) 일반화. (KPA 4종 / GP/KCos 2종)
2. `colors` 테마 prop 주입 + shell 의 모든 inline hex(styles ~15곳 + JSX 3곳)를 colors 파라미터화. 기본값을 현 hex 와 **정확히 일치**시켜 GP/KCos pixel-parity 유지(방금 배포된 코드 — 회귀 위험).

→ WO §6.3("production type이 크게 다름") + §10.3(테마/도메인 스타일 shell 주입) 해당. prop 2개 추가 자체는 임계(15) 미만이나, **전 style 테마화 리팩터 + 갓 배포된 GP/KCos pixel-parity 재검증 위험**이 "가장 작은 안전 변경" 범위를 넘음. WO 종료 지침: "다르면 '다르다'는 결론만 남기는 것도 정상 PASS."

**KPA editor 무손실 즉시 wrapper화 = 불가**(테마 색상 회귀). → adoption 보류, 후속 dedicated WO.

## 3. 수정 파일 목록 — 없음

- 코드 변경 **0**. 본 CHECK 문서만.
- store-ui-core / GP / KCos / KPA editor **미변경**. shell props **미변경**(zero-@o4o 유지).

## 4. dependency / package / Docker 영향

- 변경 없음(코드 미변경). 신규 dependency 0, lockfile/Dockerfile/package.production 무변경.

## 5. API/DB/schema 무변경 확인

- API/DB/migration/route/menu **무변경**. signage·content-core·Neture 미접촉.

## 6. Typecheck

- 코드 변경 없음 → typecheck 비대상. 직전 commit(`64fdb911e`)에서 store-ui-core/GP/KCos EXIT 0 확인됨(GP/KCos 회귀 영향 없음 — 본 WO 무변경).

## 7. GP/KCos 회귀 영향

- 없음(본 WO 코드 미변경). shell·wrapper 그대로.

## 8. 완료 판정

**PASS (by investigation).**
- KPA vs shell 차이 분석 완료: 어댑터는 호환, 그러나 **catalog(4 vs 2) + 테마 색상(primary #2563EB vs #3b82f6)** 차이로 무손실 adoption 불가.
- 무리한 공통화 대신 코드 변경 없이 후속 분리(사유 명확) — WO §12 PASS 조건 충족.
- 신규 dependency 0, API/DB/schema/route 무변경, GP/KCos 회귀 0, store-ui-core zero-@o4o 유지.

## 9. 후속 WO 후보

1. **WO-O4O-PRODUCTION-MATERIAL-EDITOR-SHELL-THEME-AND-CATALOG-PROPS-V1** — shell 에 `productionTypes`(제네릭 key) + `colors`(테마 토큰, 기본=현 hex) prop 확장 후 KPA wrapper 전환. GP/KCos 기본값 pixel-parity 검증 포함. (KPA convergence 를 원할 때)
2. `WO-O4O-SIGNAGE-AI-CONTENT-MODAL-ADAPTER-V1` — signage AI modal ↔ 공통 AiContentModal adapter.
3. `WO-O4O-CONTENT-BODY-SANITIZE-ON-WRITE-CROSSSERVICE-V1` — 보안 backlog(raw 저장 sanitize 확장).

## 10. Commit Hygiene

- 본 CHECK 문서 **단독** path-specific stage, 단일 shell call 로 `add → diff --cached → commit → push` 체인. 다른 세션 WIP 미접촉(working tree clean).

---

*Date: 2026-06-16 · KPA editor shell adoption · PASS(by investigation, 보류) · KPA = catalog 4종(pop/qr/blog/product-description) + 테마 primary #2563EB vs shell POP/QR 2종 + #3b82f6 → 무손실 adoption 에 productionTypes+colors prop 확장+테마 리팩터 필요(GP/KCos pixel-parity 위험) → 후속 분리 · 코드/dep/DB 무변경 · GP/KCos 회귀 0.*
