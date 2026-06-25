# CHECK-O4O-KPA-STORE-PRODUCTION-MATERIALS-SOURCE-LOAD-FIX-V1

> WO: **WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-SOURCE-LOAD-FIX-V1**
> 작업 제목: **KPA 내 매장 제작자료 — 기존 콘텐츠/자료 불러오기 및 제작자료 생성 흐름 정비**
> 작업일: 2026-06-25 / 범위: KPA-Society / 상태: **코드 완료 · typecheck PASS · 운영 브라우저 smoke PASS** (배포본 `1fab60510`)

---

## 1. 목표

빈 제작자료 직접 생성(WO-...-DIRECT-CREATE-V1) 다음 단계로, **기존 콘텐츠/자료를 불러와 제작자료로 복사·편집**하는 흐름을 정비한다. 가져오기=복사, 원본 무변경.

---

## 2. 조사로 확정한 구조

| 컴포넌트 | 역할 |
|---------|------|
| `StoreProductionMaterialsPage` | `/store/library/production-materials` 결과 저장소 + "새 제작 자료 만들기" 진입 |
| `SelectContentsForProductionModal` | 선택 모달 (기존: blank + StoreContentsSelector) |
| `StoreContentsSelector` | `storeLibraryApi.listContents({type:'document'})` = 내 자료함 snapshot/direct 통합 피드 |
| `ProductionMaterialEditorPage` | router state `{generatedHtml,title,sourceMetadata}` prefill → `createStoreExecutionAsset(generated/content)` **항상 신규 사본 생성** |

**빠진 소스(이번 정비 대상)**:
- 운영자 콘텐츠 허브 `kpa_contents`(status='ready') **직접 선택** (기존엔 이미 스냅샷한 것만 노출)
- 기존 store-owned 제작자료 `store_execution_assets`(generated) **복제**

→ 편집기가 이미 `generatedHtml`+`sourceMetadata` prefill + 항상 신규 사본 저장을 지원하므로, 새 소스는 **본문을 가져와 generatedHtml 로 넘기는 것만으로** 전체 흐름 재사용 가능. **신규 API/migration 없음.**

---

## 3. 수정 내역

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/SelectContentsForProductionModal.tsx` | 소스 탭 추가 (콘텐츠·강의 / 운영자 콘텐츠 / 내 제작자료). "운영자 콘텐츠" = `listContentHubItems({status:'ready'})` → 선택 시 `getContentHubItem` 으로 본문 fetch. "내 제작자료" = `getStoreExecutionAssets` 중 sourceType='generated'&assetType='content' 필터 → htmlContent 복제. 빈/에러 상태 안내 포함 |
| `services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx` | `handleCreateFromSource(prefill)` 추가 — 본문을 `generatedHtml`, 출처를 `sourceMetadata`로 편집기에 navigate. 모달에 `onCreateFromSource` 전달 |
| `services/web-kpa-society/src/api/contentHub.ts` | `ContentHubItem.body?` 노출 (단건 조회 시 본문 HTML) |
| `services/web-kpa-society/src/pages/pharmacy/ProductionMaterialEditorPage.tsx` | 출처 라벨에 `content-hub`(운영자 콘텐츠)/`production-copy`(내 제작자료 복제) 추가, 헤더 분기("제작 자료 편집"), "원본 변경 없음" 안내 |

**가져오기=복사 / 원본 분리 보장**: 운영자 콘텐츠·내 제작자료 모두 본문만 편집기로 복사 → 저장 시 `createStoreExecutionAsset`로 **새 store-owned 사본** 생성. 원본(kpa_contents / 기존 제작자료)은 변경하지 않음. AI 단계는 생략(편집기 내 AI는 그대로 사용 가능).

---

## 4. 수용 기준 점검 (운영 브라우저 smoke)

| 기준 | 결과 |
|------|------|
| 7.1 처음부터 만들기 유지 | ✅ blank card 유지, 기존 빈 생성 흐름 무변경 |
| 7.2 운영자 콘텐츠 기반 제작 | ✅ "운영자 콘텐츠" 탭에 ready 콘텐츠 노출 → 불러오기 → 편집기에 제목·**본문 prefill**(출처 "운영자 콘텐츠") → 저장 시 새 제작자료 생성, 원본 kpa_contents 무변경 |
| 7.3 내 매장 자료 기반 제작 | ✅ "콘텐츠·강의" 탭 = 기존 StoreContentsSelector(snapshot/direct) 무변경 |
| 7.4 기존 제작자료 복제 | ✅ "내 제작자료" 탭에서 복제 → 편집기에 "(복제)" 제목 + 원본 htmlContent prefill(출처 "내 제작자료 복제") → 저장 시 새 항목 추가, 원본 제작자료 유지 |
| 7.5 QR 연계 | ✅ (구조) 새 제작자료 = `store_execution_assets` → `/store/marketing/qr` "내 매장 자료" 소스(getStoreExecutionAssets)에 노출. 동일 메커니즘은 직전 WO smoke에서 확인 |

### smoke 상세 (2026-06-25, 배포본 `1fab60510`, 매장 Sohae 약국)

1. `/store/library/production-materials` → "새 제작 자료 만들기" → 소스 탭 **콘텐츠·강의 / 운영자 콘텐츠 / 내 제작자료** 노출 확인
2. **내 제작자료 복제**: "스모크 빈제작자료 0625" 복제 → 편집기 헤더 "제작 자료 편집", 제목 "...(복제)", 본문 = 원본 htmlContent, 출처 "복제 원본 … 내 제작자료 복제 · 원본 변경 없음" → 저장 → 새 항목 추가, 원본 유지 ✅
3. **운영자 콘텐츠**: ready 콘텐츠 등록 후 "운영자 콘텐츠" 탭 노출 → 불러오기 → 편집기에 제목·본문 prefill, 출처 "선택 콘텐츠 … 운영자 콘텐츠" → 저장 → 새 제작자료 생성 ✅
4. **빈 상태**: ready 콘텐츠 없을 때 "불러올 운영자 콘텐츠가 없습니다 …" 안내 표시 ✅
5. 테스트 데이터(제작자료 2건 + 운영자 콘텐츠 1건) 정리 완료

---

## 5. 검증

| 검증 | 결과 |
|------|------|
| `services/web-kpa-society` 전체 `tsc --noEmit` | ✅ PASS (오류 0) |
| 회귀: 빈 제작자료 직접 생성 / 콘텐츠·강의 선택 모달 | ✅ 무변경 |
| 회귀: QR `StoreAssetSelectorModal` | ✅ 본 WO 미수정 (별도 컴포넌트) |
| 운영 브라우저 smoke | ✅ PASS |

---

## 6. 최종 판정

> 매장 경영자는 제작자료를 처음부터 만들 수도 있고, 기존 운영자 콘텐츠·내 매장 자료·기존 제작자료를 바탕으로 새 제작자료를 만들 수도 있다. 모든 경우 저장 결과는 내 매장 소유의 독립 사본이며, QR 제작 대상으로 사용할 수 있다.

→ **충족.** 운영자 콘텐츠/내 제작자료를 불러와 편집 후 저장하면 독립 store-owned 사본이 생성되고, 원본은 변경되지 않으며, QR 대상(`내 매장 자료`)에 노출된다.

---

## 7. 후속 후보 (1차 범위 외)

- 블로그/POP/동영상을 제작자료 소스로 추가 (현재 1차는 운영자 콘텐츠 + 내 제작자료 복제)
- 코스형(course-resource) 콘텐츠 소스 활성화
- GP/KCos 공통화 (KPA 안정화 후 별도 IR/WO)
