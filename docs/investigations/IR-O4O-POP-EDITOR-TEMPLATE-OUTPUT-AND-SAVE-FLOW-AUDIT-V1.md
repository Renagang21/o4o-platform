# IR-O4O-POP-EDITOR-TEMPLATE-OUTPUT-AND-SAVE-FLOW-AUDIT-V1

> **유형**: Investigation (read-only) — POP 제작 한 턴(자료 투입 → 편집 → 템플릿 → 변환 → **PDF 출력 + POP 콘텐츠 저장**) 충족도 감사. 코드/DB/route/UI **무변경**.
> **결론(요약): 판정 C (PDF 중심 / 콘텐츠 저장 미흡) + D 요소(역할 분산).** 자료 투입·템플릿 선택(template-aware AI + generate `templateId`)·PDF 출력(`store_execution_assets` generated/usage_type=pop)은 **3서비스 parity 로 충족**. 그러나 **템플릿 적용 결과를 재편집 가능한 "POP 콘텐츠"로 저장하는 경로가 없다** — generate(save=true)는 **PDF 산출물만** `store_execution_assets` 에 저장하고 `store_pops`(author_role='store') 등 재편집 콘텐츠로 round-trip 하지 않음. 편집은 인라인 자유편집이 아니라 **AiContentModal(template-aware) 중심**. POP 데이터가 `store_pops`(문안) / `store_execution_assets`(PDF) / `kpa_store_contents`(편집 자료) / `product_ai_contents`(상품 POP) 4곳에 분산되어 "한 턴" 인지가 어려움(D).
> **선행/근거**: `IR-O4O-POP-PRODUCTION-FLOW-OPERATOR-STORE-AUDIT-V1` · `IR-O4O-POP-IMPORT-TO-BUILDER-LINK-AUDIT-V1` · `WO-O4O-POP-IMPORT-TO-BUILDER-LINK-V1`.
> **작성일**: 2026-06-15

---

## 1. 목적

POP 제작이 "PDF 생성 기능"이 아니라 **콘텐츠 제작 한 턴**(자료→편집→템플릿→PDF 출력 + POP 콘텐츠 저장)으로 동작하는지 감사. 통합/구조 변경 아님.

## 2. 현재 POP 제작 흐름도

```text
[입력]  production router state(library/direct/snapshot) + supplier-items + prefillPop(가져온 POP 문안)
         + popAiContent(AiContentModal 생성)
   │
   ▼
[편집]  AiContentModal(template-aware: templateId/templateSystemPrompt/forcedOptions) → popAiContent
         + prefillPop(제목/본문/요약). ※ 인라인 자유편집(textarea bound) 없음 — 모달/프리필 중심.
   │
   ▼
[템플릿] ProductionTemplate 선택(selectedTemplate/templateId) — AI 생성 template-aware + generate 에 templateId 전달
   │
   ▼
[변환/출력]  POST /pharmacy/pop/generate (libraryItemIds/.../aiContent/templateId/qrId/layout, save=true)
   │
   ├─▶ [PDF 출력]  store_execution_assets (source_type='generated', usage_type='pop', fileUrl=PDF) ✅
   │                → StoreProductionMaterialsPage 표시(generated)
   │
   └─▶ [POP 콘텐츠 저장]  ✗ 없음 — 템플릿 적용 결과를 store_pops/kpa_store_contents 로 저장하지 않음
```

## 3. 조사 결과 (질문별)

| 단계 | 충족 | 근거 |
|------|:----:|------|
| **5.1 입력 자료** | ✅ | production items(library/direct/snapshot) + supplier-items + prefillPop(POP 문안) + AI. (store_pops 사본은 prefill 경유 — `WO-...-IMPORT-TO-BUILDER-LINK-V1`) |
| **5.2 편집기** | △ | 자유 인라인 편집(`value={popAiContent}` bound input) **0**. 편집은 **AiContentModal**(RichTextEditor 내장, template-aware)+prefill+"재생성". 문안 자유 수정은 **사본 staff 페이지**(PharmacyPopPage/StorePopStaffPage)에서 별도. |
| **5.3 템플릿** | ✅ | `ProductionTemplate` 선택 → AiContentModal template-aware(templateSystemPrompt/forcedOptions) → generate `templateId: selectedTemplate?.id`(KPA:279) 전달. 3서비스 동일. |
| **5.4 PDF 출력** | ✅ | generate `save=true` → `store_execution_assets`(generated/usage_type=pop, GCS fileUrl). production-materials 표시. |
| **5.5 POP 콘텐츠 저장** | ✗ | **generate 는 execution_assets(PDF)만 저장.** 템플릿 적용 결과를 `store_pops`(author_role='store')/`kpa_store_contents` 로 저장하는 액션·API **없음**. StorePopPage 에 "POP 콘텐츠로 저장" 액션 0. |

> generate 저장 분기(`store-pop.controller.ts:344-379`): `save` 시 `assetRepo.save(asset)` → **store_execution_assets 단일 대상**. store_pops/store-contents write 없음.

## 4. 3서비스 parity

| 항목 | KPA | GP | KCos |
|------|:---:|:--:|:----:|
| 입력(production state + supplier + prefill) | ✅ | ✅ | ✅ |
| AiContentModal(template-aware) | ✅ | ✅ | ✅ |
| 템플릿 선택 + generate templateId | ✅ | ✅ | ✅ |
| PDF 출력 → execution_assets | ✅ | ✅ | ✅ |
| **POP 콘텐츠 저장** | ✗ | ✗ | ✗ |

> 기존 PDF 흐름은 3서비스 parity. **콘텐츠 저장은 전 서비스 공통 부재**(C). (GP/KCos templateId 참조가 KPA보다 많으나 동작 동일 — minor.)

## 5. 판정

| 안 | 해당 | 근거 |
|----|:---:|------|
| **A** 완전 충족(저장+재활용까지) | ❌ | POP 콘텐츠 저장·재편집 round-trip 부재 |
| **B** 편집/PDF 가능, 저장 약함 | 부분 | 편집(AI모달)·PDF 가능. 단 "약함"보다 **저장 자체 부재**에 가까움 |
| **C** PDF 중심 / 저장 미흡 | **주** | generate=PDF(execution_assets)만. 템플릿 결과 콘텐츠 저장 0 |
| **D** 역할 분리 불명확 | **부분** | store_pops(문안)/execution_assets(PDF)/kpa_store_contents(자료)/product_ai_contents(상품 POP) 분산 → "제작 한 턴" 인지 어려움 |

→ **종합 = C(주) + D(역할 분산). 기존 PDF 흐름은 parity 충족, 콘텐츠 저장이 핵심 gap.**

## 6. 핵심 gap (사용자 원칙 대비)

사용자 확정 원칙: "**템플릿까지 적용된 결과를 POP 콘텐츠로 저장**" + "PDF 출력만 있으면 불완전".
- 현재: 템플릿 적용 → **PDF만** 저장(store_execution_assets, 재편집 불가 artifact).
- 부재: 템플릿 적용 결과(제목/본문/aiContent + templateId)를 **재편집 가능한 POP 콘텐츠**(store_pops author_role='store' 또는 kpa_store_contents)로 저장하고, 이후 사본 관리/재제작으로 재활용하는 round-trip.

## 7. 후속 WO 후보

1. **`WO-O4O-POP-SAVE-AS-CONTENT-V1`**(C 해소, 핵심) — POP 제작 화면에 "POP 콘텐츠로 저장" 추가: 템플릿 적용 결과(title/aiContent/templateId)를 재편집 가능한 콘텐츠로 저장.
   - **product 결정 선행**: 저장 대상 — `store_pops`(author_role='store', POP 문안 라인) vs `kpa_store_contents`(Store Production Material). 기존 staff 흐름과 정합 위해 **store_pops 권장**(사본 관리 페이지에서 바로 재편집·재제작 가능). PUT `/stores/:slug/pop/staff` 활용 가능성 — 단 현재 "직접 작성 POST" 미제공(staff 는 import+edit+delete만) → POST 추가 필요 가능(backend 소폭, DB 불요).
2. (선택) `WO-O4O-POP-EDITOR-INLINE-EDIT-V1` — StorePopPage 에 popAiContent 인라인 편집(제목/본문 textarea) 추가(현재 AI모달 의존) — 편집기 단계 강화.
3. (선택) `IR-O4O-POP-DATA-ROLE-CLARIFICATION-V1`(D) — store_pops/execution_assets/kpa_store_contents/product_ai_contents 의 POP 역할을 사용자 관점 "한 턴" 으로 문서·UX 정리(테이블 통합 아님 — canonical 기준).
4. (선택) KPA/GP/KCos StorePopPage·StorePopStaffPage dup → 공통 컴포넌트 추출.

> **권장 순서**: ① product 결정(저장 대상 테이블) → ② `WO-O4O-POP-SAVE-AS-CONTENT-V1`(콘텐츠 저장 + 재편집 round-trip) → ③ 역할 정리(D) / 편집기 강화.

## 8. 검증 (본 조사)

- **코드/DB/route/UI 변경 0** (read-only). 산출물 = IR 문서 1건. 동시 세션 WIP(connection.ts/neture) 미접촉.
- generate 저장 대상 = store_execution_assets 단일(store-pop.controller:344-379) · StorePopPage "콘텐츠 저장" 액션 0 · popAiContent 인라인 bound input 0 · templateId generate 전달 확인(KPA:279) · AiContentModal template-aware(content-editor AiContentModal types) 확인.

## 9. 결론

- POP 제작은 **자료 투입·템플릿 적용·PDF 출력까지 3서비스 parity 로 충족**하나, **템플릿 적용 결과를 재편집 가능한 POP 콘텐츠로 저장하는 흐름이 부재(C)**. generate 는 PDF(execution_assets)만 저장.
- 편집은 AiContentModal(template-aware) 중심(인라인 자유편집 △), POP 데이터가 4 테이블에 분산(D)되어 "제작 한 턴" 인지가 약하다.
- **권고**: ① 저장 대상(store_pops 권장) product 결정 → ② `WO-O4O-POP-SAVE-AS-CONTENT-V1`(PDF + POP 콘텐츠 저장 + 재편집 round-trip) → ③ 역할 정리/편집기 강화. 본 조사 범위는 충족도 확인까지 — 코드 무변경.

---

*Date: 2026-06-15 · read-only IR · 코드/DB 무변경 · POP 제작 = 입력·템플릿·PDF 출력 parity 충족, **POP 콘텐츠 저장 부재(C)** + 역할 분산(D). generate=execution_assets(PDF)만. 후속: WO-O4O-POP-SAVE-AS-CONTENT-V1(store_pops 저장·재편집 round-trip).*
