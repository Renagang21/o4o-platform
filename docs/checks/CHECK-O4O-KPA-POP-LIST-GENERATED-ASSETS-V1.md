# CHECK-O4O-KPA-POP-LIST-GENERATED-ASSETS-V1

> 작업: **KPA POP 메뉴에서 생성된 POP PDF 목록 표시**
> 대상: `/store/marketing/pop`(StorePopPage) + 콘텐츠 inline POP 완료 화면(StorePopCreateModal)
> 작업일: 2026-06-26 / 상태: **코드 완료 · typecheck PASS(내 파일) · 배포 `0bf9da384` · 운영 브라우저 smoke PASS**

---

## 1. 변경 요약

`/store/marketing/pop`가 생성된 POP PDF 결과물을 목록으로 보여준다. **저장소(store_execution_assets file/pop) 무변경 · 기존 API 재사용 · frontend 전용.**

| 파일 | 변경 |
|------|------|
| `pages/pharmacy/StorePopPage.tsx` | 상단에 **"생성된 POP" 섹션** 추가 — `getStoreExecutionAssets({usageType:'pop'})`(기존 API) 조회. 항목별 **PDF 열기 + 삭제**(`deleteStoreExecutionAsset` 재사용). 빈 상태 + "콘텐츠에서 새 POP 만들기"(→/store/library/contents) 링크. POP 생성 성공 후 목록 자동 갱신. 안내문구 "생성된 POP 목록" 중심으로 정리(매장 제작 자료 표현 제거) |
| `components/store/StorePopCreateModal.tsx` | 완료 화면에 **"POP 목록 보기"**(→/store/marketing/pop) 재추가 + PDF 열기 |

## 2. POP 목록 데이터 source / API
- **데이터 source**: `store_execution_assets` WHERE `organization_id`=현재 매장 AND `is_active`=true AND `usage_type='pop'`(asset_type='file'). 저장소 변경 없음(POP 결과는 이미 여기 저장).
- **API 재사용(신규 0)**: 목록 `GET /api/v1/kpa/store/assets?usage_type=pop`(`getStoreExecutionAssets`), 삭제 `DELETE /api/v1/kpa/store/assets/:id`(`deleteStoreExecutionAsset`). organization scope는 기존 store/assets 엔드포인트 정책 사용.

## 3. POP item shape (목록 표시)
`StoreExecutionAsset`: `id / title / description / fileUrl(PDF GCS) / mimeType / createdAt / usageType='pop' / assetType='file'`. 표시 = 제목 + 생성일 + PDF 여부 + [PDF 열기] [삭제].

## 4. 삭제 방식
- 기존 `deleteStoreExecutionAsset`(DELETE /store/assets/:id) 재사용 — 기존 프로젝트 정책(soft/hard) 그대로. 삭제 후 목록에서 제거 + toast.
- 삭제는 `store_execution_assets`만 영향 — 콘텐츠 목록/QR 무영향.

## 5. 운영 브라우저 smoke (renagang21 "테스트 약국", 배포 `0bf9da384`)

| 검증 | 결과 |
|------|------|
| `/store/marketing/pop` "생성된 POP" 섹션 표시(빈 상태 + "콘텐츠에서 새 POP 만들기" 링크) | ✅ |
| 콘텐츠 목록(프리미엄 간 건강, direct) → POP 만들기 → 완료 화면 **"POP 목록 보기"** + PDF 열기 | ✅ |
| "POP 목록 보기" → `/store/marketing/pop` → 새 POP("POP목록 스모크 250626") **목록 표시** + PDF(GCS) 열기 | ✅ |
| POP 목록에서 **삭제** → 목록에서 제거, 빈 상태 복귀 | ✅ |
| 콘텐츠 목록 회귀(8건, **POP 미노출**) | ✅ |
| 기존 QR `/qr/3` 정상 | ✅ |
| 테스트 POP 정리 | ✅ (삭제 검증으로 동시 정리) |

## 6. 검증 기타
- 내 변경 파일(StorePopPage/StorePopCreateModal/storePop) tsc 오류 0. (전체 web tsc는 동시 세션 WIP `StoreContentEditPage.tsx` 미커밋 깨짐으로 51건 — **HEAD/내 커밋엔 미포함**, Web Cloud Run 배포 success로 빌드 통과 확인.) path-specific 커밋으로 깨진 WIP 미포함.

## 7. 범위/안전
- store_execution_assets → store_pops migration·신규 테이블 0. 데이터 이동/삭제(운영) 0. production-materials route 유지(미삭제). 기존 QR target·콘텐츠 feed 조건 무변경 → POP 콘텐츠 목록 중복 노출 0.
- **KPA 전용** → GP/KCos 무영향. 기존 POP 생성 흐름(StorePopPage 다단계 생성기) 무변경.

## 8. 미해결/후속
- production-materials route 직접 URL 접근 시 POP 결과 노출 가능(legacy route 유지) → `WO-O4O-KPA-PRODUCTION-MATERIALS-LEGACY-ROUTE-CLEANUP-V1` 후보.
- POP 결과 저장소를 `store_execution_assets` → 전용 구조로 옮기는 것은 본 WO 범위 외(현 구조 유지).
- QR/POP 제작 흐름 AI 단계 제거(`WO-O4O-KPA-QR-AI-STEP-REMOVE-V1` 등) 별도.

---

## 9. 최종 판정

> `/store/marketing/pop`에서 생성된 POP PDF가 목록으로 보이고, PDF 열기·삭제가 가능하다. 콘텐츠 inline POP 생성 완료 화면의 "POP 목록 보기"로 결과를 확인할 수 있다. 기존 POP 생성 흐름·QR 회귀 없음. POP은 콘텐츠 목록에 섞이지 않고, production-materials route는 유지된다.

→ **충족.** (저장소 전용화·legacy route 노출 정리는 후속 WO.)
