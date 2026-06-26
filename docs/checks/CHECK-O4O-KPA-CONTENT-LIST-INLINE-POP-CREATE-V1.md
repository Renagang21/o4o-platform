# CHECK-O4O-KPA-CONTENT-LIST-INLINE-POP-CREATE-V1

> 작업: **KPA 콘텐츠 목록에서 POP 만들기 바로 실행**
> 대상: `/store/library/contents` (StoreContentsSelector + 신규 StorePopCreateModal)
> 작업일: 2026-06-26 / 상태: **코드 완료 · typecheck PASS · 배포 `b194e01ed` · 운영 브라우저 smoke PASS**

---

## 1. 변경 요약

`/store/library/contents`에서 콘텐츠 1개 선택 → POP 메뉴로 이동하지 않고 **현재 화면에서 POP 만들기 모달** 호출. **frontend 전용**(기존 `POST /pharmacy/pop/generate` 재사용, 백엔드/migration 없음).

| 파일 | 변경 |
|------|------|
| `api/storePop.ts` (신규) | `generateStorePop()` — `apiClient.post('/pharmacy/pop/generate', …)` |
| `components/store/StorePopCreateModal.tsx` (신규) | 선택 콘텐츠 origin→ItemIds 매핑, 제목/용지(A4·A5)+save=true. 완료 화면 PDF fileUrl + "매장 제작 자료 보기" |
| `pages/pharmacy/StoreContentsSelector.tsx` | ActionBar 'POP 만들기'(page 모드 전용). 1개 선택 시 활성(모든 origin). 복수 비활성+안내. 생성 성공 시 선택 해제 |

## 2. POP 모달 재사용/분리 방식
기존 `/store/marketing/pop`(StorePopPage)의 다단계 편집 UI(상품/템플릿/AI/편집/출력)는 무거워 그대로 추출하지 않고, **동일 생성 계약(`/pharmacy/pop/generate`, save=true)을 재사용**하는 경량 모달을 신규 작성. POP 본문은 백엔드가 선택 콘텐츠 텍스트에서 추출. `/store/marketing/pop` 무변경.

## 3. origin별 POP 지원 (백엔드 generate가 3 origin 모두 처리)

| origin | payload | 지원 |
|---|---|---|
| direct (kpa_store_contents) | `directContentItemIds:[id]` | ✅ |
| execution-asset (store_execution_assets) | `libraryItemIds:[id]` | ✅ |
| snapshot (o4o_asset_snapshots) | `snapshotItemIds:[id]` | ✅ |

> QR(landing 렌더 제약으로 snapshot 미지원)과 달리 **POP은 snapshot 포함 3 origin 모두 지원**(generate가 id로 organization 격리 조회 후 본문 추출). 1개 선택이면 origin 무관 활성.

## 4. POP 저장 범위 검증 (운영 DB read-only, org 9c87f46b)

POP 생성 흐름: `/pharmacy/pop/generate` (save=true) → PDF GCS 업로드 → **`store_execution_assets`(assetType='file', usageType='pop', sourceType='generated', mime=application/pdf) INSERT** + `store_asset_derivations` 기록. **store_pops 미사용**(POP 결과 = 매장 제작 자료).

| 테이블 | baseline | direct+snapshot POP 2개 생성 후 | 결과 |
|---|---:|---:|---|
| store_execution_assets (active 전체) | 3 | 5 | **+2 (POP file/pop)** |
| store_execution_assets (asset_type='content') | 3 | 3 | **신규 0** ✅ |
| store_execution_assets (usage_type='pop' active) | 0 | 2 | +2 |
| kpa_store_contents (direct) | 4 | 4 | **신규 0** ✅ |
| o4o_asset_snapshots | 1 | 1 | **신규 0** ✅ |

### 중복 노출
- **콘텐츠 목록(`/store/library/contents`)**: feed가 `store_execution_assets` 중 `asset_type='content'`만 포함 → POP(asset_type='file')는 **노출 안 됨**. (smoke: 콘텐츠 목록 8건 유지, POP 행 없음 확인) ✅
- **매장 제작 자료(`/store/library/production-materials`)**: store_execution_assets 목록이므로 POP(file/pop)가 **노출됨**(= POP 결과 보관/재출력 위치). smoke 확인 ✅
- store_pops: 미생성(generate 경로는 store_execution_assets 사용).

> **결론**: POP 결과는 "매장 제작 자료"에만 보이고 콘텐츠 목록엔 안 보인다(asset_type 분기로 중복 0). 이는 **기존 POP backend 구조**(WO-KPA-POP-RESULT-PERSIST…)이며 본 WO에서 변경하지 않음.

## 5. 운영 브라우저 smoke (renagang21 "테스트 약국", 배포 `b194e01ed`)

| 검증 | 결과 |
|------|------|
| 기존 목록/검색/태그/출처 탭/QR inline 회귀 | ✅ |
| direct(프리미엄 간 건강) 선택 → POP 버튼 활성 → 모달(제목·배지·A4/A5) → POP 생성 | ✅ |
| direct POP 결과 PDF(GCS) + "매장 제작 자료에 저장" | ✅ |
| **snapshot(해양 심층수) POP 버튼 활성**(QR은 비활성) → POP 생성 성공 | ✅ (POP·QR 차별) |
| 콘텐츠 목록 미노출(8건 유지, POP 행 없음) | ✅ |
| 매장 제작 자료에 POP 노출 | ✅ |
| 복수 선택 비활성 + "QR-code · POP은 콘텐츠 1개를 선택해 주세요" | ✅ |
| 기존 QR `/qr/3` 공개 URL 정상 | ✅ |
| 기존 `/store/marketing/pop` 메뉴 회귀 | ✅ |
| 테스트 데이터 정리(POP asset 2개 DELETE → exec active 5→3, pop 0 복귀) | ✅ |

## 6. 검증 기타
- `web-kpa-society` tsc --noEmit 오류 0. Web Cloud Run 배포 success(backend 무변경 → api 배포 불필요).

## 7. 범위/안전
- POP 결과는 store_execution_assets(매장 제작 자료)에만 생성. 콘텐츠 원본(kpa_store_contents)·snapshot(o4o_asset_snapshots) 신규 0. 콘텐츠 목록 중복 노출 0(asset_type 분기).
- **KPA 전용**(`/pharmacy/pop/generate`) → GP/KCos 무영향. modal(제작 자료 선택)은 POP 버튼 미노출. QR inline 무변경. POP AI 버튼 제거·제작자료 메뉴 숨김 미수행.

## 8. 미해결/후속
- POP 결과가 **매장 제작 자료**에 보이는 것은 기존 backend 구조(store_execution_assets file/pop). "POP 결과는 POP 전용 위치에만" 원칙으로 더 정리하려면 후속 **`WO-O4O-KPA-QR-POP-RESULT-SCOPE-V1`**(결과물 저장/노출 범위 정리)에서 처리.
- POP AI 단계 제거는 별도 WO(`WO-O4O-KPA-POP-AI-STEP-REMOVE-V1` 또는 통합 AI 제거).

---

## 9. 최종 판정

> `/store/library/contents`에서 콘텐츠(direct/execution-asset/snapshot) 1개를 선택해 POP 만들기를 현재 화면에서 바로 실행하고, 선택 콘텐츠가 대상으로 설정되며, POP 결과(PDF)는 store_execution_assets(매장 제작 자료)에 저장된다. 콘텐츠 원본 신규 생성 0, 콘텐츠 목록 중복 노출 0. 기존 QR·POP 메뉴 회귀 없음.

→ **충족** (POP 결과의 매장 제작 자료 노출은 기존 구조 — 결과 범위 정리는 후속 RESULT-SCOPE WO).
