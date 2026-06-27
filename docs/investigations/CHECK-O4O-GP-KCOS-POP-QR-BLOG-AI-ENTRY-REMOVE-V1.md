# CHECK — GP/KCos POP·QR·Blog + 잔존 페이지형 AI 진입 제거 V1

**WO:** `WO-O4O-GP-KCOS-POP-QR-BLOG-AI-ENTRY-REMOVE-V1`
**일자:** 2026-06-27
**상위:** [`IR-O4O-AI-PROMPTS-SETTINGS-CLEANUP-AUDIT-V1`](./IR-O4O-AI-PROMPTS-SETTINGS-CLEANUP-AUDIT-V1.md) §1·§7-1
**성격:** 페이지형 제작 AI 진입 제거 (parity). 공통 컴포넌트·백엔드 API 무변경.
**검증:** web-glycopharm / web-k-cosmetics / web-kpa-society `tsc --noEmit` PASS

---

## 1. 목표

KPA 선검증 후 GP/KCos POP·Blog 의 페이지형 AI 진입을 제거하고, 감사에서 발견된 잔존 페이지형 AI 진입(KPA ResourceWriteModal, GP OperatorResourcesPage)을 역할 확인 후 제거. 편집기 Toolbar "AI 정리"·공통 `AiContentModal`·`/api/ai/content`·`flexible` 은 보존.

---

## 2. 전수 확인 결과 (제거 vs 유지 판정)

| # | 화면 | file | 판정 | 처리 |
|---|---|---|---|---|
| 1 | GP StorePopPage | `web-glycopharm/.../StorePopPage.tsx` | 제작형 (AiContentModal `initialMode='pop'` + "AI 문구 생성" Step) | **제거** |
| 2 | KCos StorePopPage | `web-k-cosmetics/.../StorePopPage.tsx` | 제작형 (동일) | **제거** |
| 3 | GP PharmacyBlogPage | `web-glycopharm/.../PharmacyBlogPage.tsx` | 제작형 (AI 보조 배너 "AI로 정리하기" → AiContentModal 삽입) | **제거** |
| 4 | KCos StoreBlogManagePage | `web-k-cosmetics/.../StoreBlogManagePage.tsx` | 제작형 (동일) | **제거** |
| 5 | GP OperatorResourcesPage | `web-glycopharm/.../operator/OperatorResourcesPage.tsx` | 제작형 (aiSlot "AI 콘텐츠 생성" → AiContentModal → operatorCreate) | **제거** |
| 6 | KPA ResourceWriteModal | `web-kpa-society/.../resources/ResourceWriteModal.tsx` | 제작형 (AI 보조 배너 "AI로 만들기" → AiContentModal, R3 Page 의 모달 변형) | **제거** |
| — | **GP StoreQrPage** | `web-glycopharm/.../store/StoreQrPage.tsx` | **유지** | AiContentModal/`/api/ai/content` 호출 **전무**(grep 0). QR 화면은 제작 AI 진입이 없음 — `store_qr` outputType 의 경로는 (언마운트된) StoreUseModal 뿐 |
| — | **KCos StoreQrPage** | `web-k-cosmetics/.../store/StoreQrPage.tsx` | **유지** | 동일 — AI 진입 전무 |
| — | **KPA StoreProductionMaterialsPage** | `web-kpa-society/.../pharmacy/StoreProductionMaterialsPage.tsx` | **보류** | 제작형(StartProductionModal `onAiAction`)이나 조사 시점 **다른 세션이 인접 파일(StoreContentsSelector/StoreLibraryContentsPage/SelectContentsForProductionModal) 동시 편집** → 충돌 회피 위해 후속 분리 |
| — | RichTextEditor Toolbar "AI 정리" / `AiContentModal` 컴포넌트 / `/api/ai/content` / `flexible` | — | **유지** | 편집 보조 SSOT — 본 WO 비대상 |
| — | LMS(CourseEdit/InstructorCourseEdit) · Signage · admin builder | — | **제외(RESERVED)** | 별도 설계 |

---

## 3. 제거 방식 (화면별)

- **POP (GP/KCos)**: KPA POP STEP-REMOVE 패턴 미러 — `initialMode='pop'` AiContentModal + "AI 문구 생성" Step(textarea·생성 버튼)·`buildAiInputText`·`handleAiInsert`·`aiPrompt`/`aiOpen`/`selectedTemplate` 상태 제거. **가져온 POP(prefill) 문구 패널 + POP 콘텐츠로 저장 + PDF 생성은 보존** (POP 문구는 선택 자료 원문 사용).
- **Blog (GP/KCos)**: AI 보조 배너("AI로 정리하기") + AiContentModal + `handleAiInsert` + `extractTitleFromHtml`/`htmlToPlain` + `aiOpen` + aiBanner 스타일 제거. **RichTextEditor 본문(+aiRequestHeaders Toolbar AI 정리)·직접 작성·저장 보존**.
- **GP OperatorResources**: `aiSlot`(AI 콘텐츠 생성) prop 제거. 공통 `OperatorResourcesConsolePage` 의 직접 자료 등록/관리 유지(aiSlot optional). policyBanner 의 AI 문구 정리.
- **KPA ResourceWriteModal**: AI 보조 배너("AI로 만들기") + AiContentModal + `handleAiInsert` + `extractTitleFromHtml` + `aiOpen` + aiBanner 스타일 제거. **본문 RichTextEditor·직접 입력·임시저장/공개 보존**.

공통 컴포넌트(`@o4o/store-ui-core` StartProductionModal, `@o4o/content-editor` AiContentModal)·백엔드 API 무변경.

---

## 4. 산출물 (6파일, 50+/506−)

```
services/web-glycopharm/src/pages/store-management/StorePopPage.tsx
services/web-glycopharm/src/pages/store-management/PharmacyBlogPage.tsx
services/web-glycopharm/src/pages/operator/OperatorResourcesPage.tsx
services/web-k-cosmetics/src/pages/store/StorePopPage.tsx
services/web-k-cosmetics/src/pages/store/StoreBlogManagePage.tsx
services/web-kpa-society/src/pages/resources/ResourceWriteModal.tsx
```

---

## 5. 검증

- web-glycopharm / web-k-cosmetics / web-kpa-society `tsc --noEmit` PASS
- 잔존 참조 0 (grep: aiOpen/handleAiInsert/AiContentModal/aiBanner/initialMode 등)
- 배포: deploy-glycopharm / deploy-k-cosmetics / deploy-kpa-society 전부 success
- 브라우저 smoke(라이브): **GP POP**(섹션 1→3, AI Step 제거 / 레이아웃·QR·PDF 보존, console 0) · **GP Blog**(AI 배너 제거 / Toolbar "AI 정리" 보존, console 0) · **KCos POP**(섹션 1→3, AI Step 제거; 403 은 sohae2100 non-store_owner 기존 권한, 무관) PASS
- **KCos Blog · GP OperatorResources · KPA ResourceWriteModal**: 정적 검증·타입체크 완료. **이 화면들은 공통화 전 개별(서비스별) 구현이므로 최종 통합 smoke 는 공통화 작업 시점으로 보류** (개별 화면을 현재 억지로 각각 보완·테스트하지 않음).

---

## 6. 잔여 / 후속

- **KPA StoreProductionMaterialsPage** 페이지형 AI(StartProductionModal AI 카드) 제거 — 다른 세션 종료 후 별도 처리.
- IR §7 순서 계속: #2 `WO-O4O-PRODUCT-AI-CONTENT-GENERATE-ROUTE-RETIRE-V1` → #3 `WO-O4O-AI-OUTPUTTYPE-PROMPT-DIET-V1`.
- 이제 `pop`/`blog` outputType 의 페이지 진입 호출은 GP/KCos POP/Blog 제거로 0 에 근접(KPA POP/Blog 는 선행 제거 완료). `store_qr` 은 QR 화면에 애초 진입이 없어 StoreUseModal 결정 WO 에 종속.
