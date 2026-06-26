# CHECK-O4O-KPA-QR-POP-RESULT-SCOPE-V1

> 작업: **KPA QR/POP 결과물 노출 범위 정리 — 매장 제작 자료 메뉴 숨김 + POP 완료 안내 정리**
> 대상: KPA 사이드바 / `/store/library/contents` POP 완료 화면 / StoreHomePage / production-materials route
> 작업일: 2026-06-26 / 상태: **코드 완료 · typecheck PASS · 배포 `4a56bd3fb` · 운영 브라우저 smoke PASS**

---

## 1. 변경 요약

QR/POP 결과를 각 메뉴·PDF 중심으로 안내하고 "매장 제작 자료" 메뉴는 KPA 사이드바에서 숨긴다(route 유지). **frontend 전용 · migration·데이터 변경 없음.**

| 파일 | 변경 |
|------|------|
| `packages/store-ui-core/.../storeMenuConfig.ts` | **KPA_SOCIETY_STORE_CONFIG** 약국 자료함에서 `library-production-materials`(매장 제작 자료) 항목 제거. GP/KCos config는 자체 '제작 자료' 메뉴 **유지(미변경)** |
| `components/store/StorePopCreateModal.tsx` | POP 완료 화면 **"매장 제작 자료 보기" 버튼 제거** → PDF 열기 + 닫기만. 안내문구 "POP PDF가 생성되었습니다" |
| `pages/pharmacy/StoreHomePage.tsx` | 실행흐름 Step2 CTA: production-materials → **`/store/library/contents`("콘텐츠 자료함" / "콘텐츠 선택해 QR·POP 바로 만들기")** |
| `pages/pharmacy/ProductionMaterialEditorPage.tsx` | 신규 제작자료 저장 후 redirect: production-materials → **`/store/library/contents`**(신규 asset_type='content'은 콘텐츠 목록에 노출). edit 저장은 이미 contents |

## 2. 메뉴 숨김 방식 / route 유지
- KPA config에서 메뉴 **item 제거**(hidden flag 대신 — config는 service별 별도 객체). 메뉴 시스템은 `serviceKey`로 config 선택 → **KPA만 영향, GP/KCos 무변경**(Shared Module Protocol: 소비처는 service별 config object).
- `/store/library/production-materials`, `/new`, `/:id/edit` **route는 App.tsx에 유지**(삭제 안 함). 딥링크/저장 후 redirect/legacy 접근/운영 확인 보호.

## 3. production-materials CTA 정리
| CTA | 처리 |
|-----|------|
| StoreHomePage 실행흐름 Step2 | → /store/library/contents (변경) |
| ProductionMaterialEditorPage 신규 저장 redirect | → /store/library/contents (변경) |
| ProductionMaterialEditorPage edit 저장 redirect | 이미 /store/library/contents (무변경) |
| production-materials 페이지 자체 "새 제작 자료 만들기" 버튼 | **유지**(페이지 내부, route 유지로 딥링크 접근 시 사용 가능 — 사이드바 미노출이므로 일반 사용자는 거의 도달 안 함) |

## 4. POP 완료 화면 변경
- 기존: PDF 열기 + **매장 제작 자료 보기**(→production-materials). 변경: **PDF 열기 + 닫기만.**
- **"POP 목록 보기" 미추가** — 조사 결과 `/store/marketing/pop`은 POP **생성기**일 뿐 생성된 POP 결과(store_execution_assets usage_type='pop')를 **목록으로 보여주지 않음**. (POP 결과는 매장 제작 자료에 저장되나 그 메뉴는 숨김.) → 후속 WO에서 POP 목록이 결과물을 보여주도록 정리.

## 5. POP 목록 데이터 소스 조사 결과
- `/store/marketing/pop`(StorePopPage) = 다단계 POP 생성기(입력 선택 → 레이아웃 → AI → 출력). **생성된 POP PDF 결과 목록 없음.**
- POP 결과 저장 = `store_execution_assets`(asset_type='file', usage_type='pop', generated) = "매장 제작 자료" 저장소(메뉴는 숨김).
- → **후속 `WO-O4O-KPA-POP-LIST-GENERATED-ASSETS-V1`**: `/store/marketing/pop`(또는 별도 POP 결과 목록)이 usage_type='pop' 결과물을 보여주도록.

## 6. QR 결과 범위 (무변경, 이미 정합)
- QR 생성 결과는 `store_qr_codes`에만 생성(선행 INLINE-QR WO에서 DB 검증: exec/direct/snapshot 신규 0). 본 WO에서 QR 흐름 무변경. QR 완료 화면(StoreQrCreateModal)은 QR 링크 + QR 목록 보기 유지.

## 7. 운영 브라우저 smoke (renagang21 "테스트 약국", 배포 `4a56bd3fb`)

| 검증 | 결과 |
|------|------|
| KPA 사이드바 약국 자료함 = 콘텐츠/자료만(**매장 제작 자료 미노출**) | ✅ |
| QR-code/POP 메뉴(마케팅 그룹) 유지 | ✅ |
| StoreHomePage 실행흐름 Step2 CTA → 콘텐츠 자료함(/store/library/contents) | ✅ |
| `/store/library/production-materials` 직접 URL → **404 아님, 렌더**(route 유지) | ✅ |
| 콘텐츠 목록 검색/태그/출처 탭 + QR/POP 버튼 정상 | ✅ |
| POP inline 생성 → 완료 화면 **"매장 제작 자료 보기" 없음**, PDF 열기 + 닫기만 | ✅ |
| POP 결과 콘텐츠 목록 미노출(8건 유지) | ✅ |
| 기존 QR `/qr/3` 정상 | ✅ |
| 기존 `/store/marketing/pop` 메뉴 회귀 | ✅ |
| 테스트 POP 정리(asset DELETE) | ✅ |
| GP/KCos config 'library-production-materials' 유지(코드 diff) | ✅ |

## 8. 검증 기타
- `web-kpa-society` / `store-ui-core` tsc --noEmit 오류 0. Web Cloud Run 배포 success(backend 무변경).

## 9. 범위/안전
- DB row 삭제/이동 0, migration 없음. store_execution_assets·기존 QR target·execution-asset 무변경. POP backend 저장 구조 무변경.
- **KPA 전용** → GP/KCos 메뉴·흐름 무변경. QR/POP AI 버튼·블로그/사이니지·source canonical 미수정.

## 10. 미해결/후속
- **production-materials route 직접 URL 접근 시 POP 결과(매장 제작 자료) 노출 가능** — 본 WO에서는 노출까지 막지 않음(legacy/운영 확인용 route 유지). 후속 `WO-O4O-KPA-PRODUCTION-MATERIALS-LEGACY-ROUTE-CLEANUP-V1` 후보.
- **POP 목록이 생성 결과를 보여주지 않음** → `WO-O4O-KPA-POP-LIST-GENERATED-ASSETS-V1`(다음 1순위 후보).
- POP AI 단계 제거(`WO-O4O-KPA-QR-AI-STEP-REMOVE-V1` 등) 별도.

---

## 11. 최종 판정

> KPA 사이드바에서 "매장 제작 자료" 메뉴가 숨겨지고(route 유지), POP 생성 완료 화면에서 "매장 제작 자료 보기" 안내가 제거된다(PDF 중심). 홈/저장 redirect는 콘텐츠 자료함으로 정리. QR 결과는 기존대로 store_qr_codes 중심, POP 결과는 콘텐츠 목록에 섞이지 않는다. 기존 QR·POP 메뉴 회귀 없음, GP/KCos 무변경.

→ **충족** (POP 목록의 결과물 표시·production-materials route 노출 정리는 후속 WO).
