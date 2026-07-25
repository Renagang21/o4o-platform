# CHECK-O4O-KPA-CONTENT-IMPORT-COMPLETE-CANONICAL-MANAGEMENT-LINK-V1

> **WO:** WO-O4O-KPA-CONTENT-IMPORT-COMPLETE-CANONICAL-MANAGEMENT-LINK-V1
> **근거 조사:** [IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1](IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1.md) **C6**
> **선행:** [CHECK-...-CONTENT-DETAIL-STORE-IMPORT-LINK-V1](CHECK-O4O-KPA-CONTENT-DETAIL-STORE-IMPORT-LINK-V1.md) (C4) · [CHECK-...-REUSABLE-POLICY-LIST-DETAIL-PARITY-V1](CHECK-O4O-KPA-CONTENT-REUSABLE-POLICY-LIST-DETAIL-PARITY-V1.md)
> **작성일:** 2026-07-25
> **유형:** frontend-only. 신규 API·테이블·migration·관리 화면·route **0**.
> **상태:** ✅ 완료 — tsc 0 · build 성공 · 배포 완료 · **브라우저 smoke 16/16 PASS** (§10) · 테스트 사본 정리 완료 (§11)

---

## 1. 기존 완료 동작

전 진입점이 **성공 토스트 문구만** 표시하고 끝났다. 사용자는 방금 가져온 사본을 보려면 자료함을 직접 찾아 들어가야 했다.

| 진입점 | 호출 | 기존 완료 처리 |
|--------|------|----------------|
| 콘텐츠 목록 행 액션 | `handleCopyToStore` | `toast.success('내 자료함에 가져왔습니다')` |
| Drawer | 동일 핸들러 재사용 | 동일 |
| 일괄 선택 | `handleBulkCopyToStore` | `toast.success('N개를 내 자료함에 가져왔습니다')` |
| 콘텐츠 상세 | `runImport` | `toast.success('내 자료함에 가져왔습니다')` |
| 문서형·자료실(`/content/documents`·`/content/resources`) | `handleCopyToStore` / `handleBulkCopy` | 동일 (일괄은 `N개를 자료함에 가져왔습니다`) |
| 자료실 HUB(`/resources`) | `assetType='resource'` | 별도 흐름 — **본 WO 범위 밖**(§6) |

CTA·redirect 는 **어느 진입점에도 없었다**. 즉 C6 의 "자산 대시보드로 이동"조차 발생하지 않고 이동 자체가 없는 상태였다.

---

## 2. 복사 API 응답과 생성 사본 ID (WO §7.1)

**추정 검색 불필요 — API 가 이미 생성된 사본을 반환한다.**

```
POST /api/v1/kpa/assets/copy  →  201 { success: true, data: <AssetSnapshot> }
```

[asset-copy-core factory](../../packages/asset-copy-core/src/factory/) 의 `res.status(201).json({ success: true, data: result.snapshot })`.

| 필드 | 값 |
|------|-----|
| `data.id` | **생성된 사본 ID** (`o4o_asset_snapshots.id`) — 본 WO 가 사용하는 값 |
| `data.organizationId` | 대상 매장 org (서버가 `resolveOrgId(user)` 로 결정 — 클라이언트 지정 불가) |
| `data.sourceAssetId` | 원본 `kpa_contents.id` |
| `data.assetType` | `'content'` |
| `data.title` / `contentJson` / `createdBy` / `createdAt` | 사본 스냅샷 |

기존 프론트 타입 `CopyAssetResponse { success, data: AssetSnapshotItem }` 에 이미 `id` 가 선언돼 있었고, **호출부가 응답을 버리고 있었을 뿐**이다. → API 변경 0.

---

## 3. canonical 관리 route (WO §7.2)

| route | 컴포넌트 | 역할 |
|-------|----------|------|
| `/store/library/contents` | `StoreLibraryContentsPage` → `StoreContentsSelector` | 자료함 콘텐츠 **목록**(개별 `:id` route 없음) |
| **`/store/content/:snapshotId/edit`** | `StoreContentEditPage` | **가져온 snapshot 사본의 canonical 단건 편집** |
| `/store/content/direct/:id` | `StoreDirectContentPage` | direct 콘텐츠(가져오기 대상 아님) |
| `/store/library/production-materials/:id/edit` | `ProductionMaterialEditorPage` | execution-asset(가져오기 대상 아님) |
| `/store/content` | `StoreAssetsPage` | 자산 목록 — C6 가 지적한 대시보드 성격 |

**목적지 확정:** `/store/content/{copy.data.id}/edit`.
근거 — 자료함 목록이 origin 별로 쓰는 링크 매핑과 **동일**하다:
[StoreContentsSelector.tsx:133-137](../../services/web-kpa-society/src/pages/pharmacy/StoreContentsSelector.tsx#L133-L137) 의 `origin==='snapshot'` → `/store/content/${it.id}/edit`. [StoreAssetsPage.tsx:70](../../services/web-kpa-society/src/pages/pharmacy/StoreAssetsPage.tsx#L70) 도 같은 경로를 쓴다.
→ **신규 route 0 / query 신설 0.** 기존 canonical 경로를 그대로 재사용했다.

---

## 4. 단일·일괄 완료 처리 (WO §8.2~§8.4)

**자동 redirect 없음.** 복사 후 현재 화면(목록·Drawer·상세)을 유지하고 CTA 만 제공한다 — 재복사·탐색 흐름 보존.

| 구분 | 완료 안내 | CTA | 목적지 |
|------|-----------|-----|--------|
| **단일** | 기존 문구 그대로 | `가져온 콘텐츠 보기` | `/store/content/{사본id}/edit` |
| **일괄** | 기존 문구 그대로 (`N개를 …`) | `내 자료함에서 보기` | `/store/library/contents` |

일괄은 **임의의 마지막 사본으로 이동하지 않는다**(WO §8.4).

**CTA 표면:** 기존 toast 가 react-hot-toast 이므로 `toast.custom` 으로 같은 토스트 안에 버튼을 넣었다. 색상은 `O4OToastProvider` 의 success 스타일(`#f0fdf4`/`#166534`/`#bbf7d0`)과 동일하게 맞췄고, 클릭 여유를 위해 duration 만 2.5s → 7s 로 늘렸다. **신규 전역 알림 시스템 0 / 신규 모달 0.**

**실패 시 CTA 미노출:** CTA 는 `try` 블록의 성공 경로에서만 호출된다. 실패는 기존 `toast.error` 그대로. 일괄은 `ok > 0` 일 때만 CTA.
**restricted:** 버튼이 `disabled` 라 복사 자체가 시작되지 않고(서버도 차단), 성공 경로에 진입하지 않으므로 CTA 도 없다.

---

## 5. 재사용한 공용 함수·컴포넌트

| 요소 | 처리 |
|------|------|
| `importContentToStore()` | **변경 없음** — 이미 복사 응답 Promise 를 반환하고 있었다. 호출부가 `await` 결과를 쓰도록만 바꿈 |
| `storeContentEditPath()` / `STORE_LIBRARY_CONTENTS_PATH` | `contentStoreImport.ts` 에 경로 상수·헬퍼 추가(정책·호출 로직 무변경) |
| `notifyContentImported()` / `notifyContentsImported()` | 신규 소형 모듈 1개 — 5개 호출부가 공유(진입점별 복사 금지) |
| `StoreContentEditPage` · `StoreLibraryContentsPage` | **기존 화면 그대로 사용** — 신규 관리 화면 0 |

---

## 6. 권한·소유권 (WO §9)

| 계층 | 확인 |
|------|------|
| 복사 실행 | 기존 `/assets/copy` 가드 — 인증 + `kpa:admin/operator/pharmacist/store_owner`. **변경 없음** |
| 사본 소유 매장 | 서버가 `resolveOrgId(user.id)` 로 결정 — 클라이언트가 지정할 수 없음 |
| **CTA 목적지 서버 가드** | `GET/PUT /store-contents/:snapshotId` 가 `WHERE id = $1 AND organization_id = $2` 로 스코프 → 타 매장 사본은 **404** ([store-content.controller.ts:1244](../../apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts#L1244)) |
| CTA 목적지 클라이언트 가드 | `/store/*` 전체가 `PharmacyGuard` ([App.tsx:944](../../services/web-kpa-society/src/App.tsx#L944)) |

→ **URL 만 알면 다른 매장 사본을 보는 구조가 아니다.** 가드는 기존 그대로이며 본 WO 에서 신설·완화한 것이 없다.

**유지된 정책:** restricted 서버 차단 / 재복사 허용 / 독립 사본 / 원본·사본 수정 단절 / 매장 소유권 — 전부 무변경.

---

## 7. 변경 파일 (5)

| 파일 | 변경 |
|------|------|
| [components/contentImportToast.tsx](../../services/web-kpa-society/src/components/contentImportToast.tsx) | **신규** — 완료 안내 + CTA 공용 렌더 |
| [api/contentStoreImport.ts](../../services/web-kpa-society/src/api/contentStoreImport.ts) | canonical 경로 상수·헬퍼 추가 (복사 로직 무변경) |
| [pages/contents/ContentListPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentListPage.tsx) | 단건(행·Drawer)·일괄 완료 → CTA |
| [pages/contents/ContentDocumentsPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx) | 단건(행·Drawer)·일괄 완료 → CTA |
| [pages/contents/ContentDetailPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx) | 단건 완료 → CTA |

**미변경(의도):** 자료실 HUB(`ResourcesHubPage`, `assetType='resource'`) — WO §11.6 "기존 동작 유지" 대상. `StoreContentEditPage`·`StoreLibraryContentsPage`·공통 패키지·백엔드 전부 무변경.

---

## 8. 신규 API·DB·route 여부

| 항목 | 결과 |
|------|:----:|
| 신규 API 엔드포인트 | **0** |
| 백엔드 변경 | **0** |
| 신규 테이블 / migration / DB 데이터 변경 | **0** |
| 신규 프론트 route | **0** (기존 canonical 재사용) |
| 신규 관리 화면 | **0** |
| 복사 정책·데이터 모델 변경 | **0** |
| 가져오기 실행 라벨 변경 | **0** (`내 자료함 가져가기` 유지) |

---

## 9. typecheck / build

| 대상 | 명령 | 결과 |
|------|------|------|
| web-kpa-society | `tsc --noEmit` | ✅ **0 errors** |
| web-kpa-society | `vite build` | ✅ 성공 (25.6s) |
| api-server | — | 변경 없음(미실행) |

---

## 10. 브라우저 smoke

**배포:** Deploy Web Services ✅ success (`e47b30d08`) — frontend-only 이므로 API 배포 불필요
**대상:** `https://kpa-society.co.kr` (Playwright 실브라우저, `renagang21` 약국 경영자 / `Sohae 약국 매장`)

### 10-1. 완료 CTA 흐름 (12/12 PASS)

| # | 항목 | 결과 | 근거 |
|---|------|:----:|------|
| 1 | 로그인 | ✅ | — |
| 2 | **상세 단일 가져오기 → 완료 안내 + CTA** | ✅ | `내 자료함에 가져왔습니다` + `가져온 콘텐츠 보기` 동시 노출. **상세 화면 유지(자동 이동 없음)** |
| 3 | **CTA 클릭 → 사본 편집 화면 진입** | ✅ | `/content/{원본}` → `/store/content/{사본}/edit` |
| 4 | **CTA ID = 실제 생성 사본 ID** | ✅ | 복사 응답 `data.id`=`5596ba83` == URL `5596ba83` ≠ 원본 `5b258882`. **기존 사본·원본으로 가지 않음** |
| 5 | 편집 화면 로드 | ✅ | 편집 UI 렌더, 오류 없음 |
| 6 | 문서형 목록 행 액션 | ✅ | 완료 문구 + CTA |
| 7 | Drawer | ✅ | 완료 문구 + CTA |
| 8 | Drawer CTA ID = 생성 사본 ID | ✅ | `1c9960b7` == `1c9960b7` |
| 9 | **일괄: 자료함 목록 CTA (단일 CTA 아님)** | ✅ | `2개를 자료함에 가져왔습니다` + `내 자료함에서 보기`, `가져온 콘텐츠 보기` **미노출** |
| 10 | 일괄 CTA → canonical 목록 진입 | ✅ | `/store/library/contents` |
| 11 | **restricted 회귀** | ✅ | `(불가)` disabled 유지 + **CTA 미노출** (draft+restricted 픽스처로 검증, 검증 후 삭제 200) |
| 12 | 목록·Drawer·상세 가져오기 회귀 | ✅ | 위 2·6·7 에서 실제 복사 성공 확인 |

> 캡처: 상세 화면 우상단에 success 스타일 토스트 + 녹색 `가져온 콘텐츠 보기` 버튼, 본문은 그대로 유지.

### 10-2. 편집 가능성 / 원본·사본 독립성 (WO §11.3 — 4/4 PASS)

smoke 사본(`5596ba83`)만 사용하고 원본은 건드리지 않았다.

| 항목 | 결과 | 근거 |
|------|:----:|------|
| 사본 편집 화면에 제목 로드 | ✅ | 원본 제목이 사본으로 실려 있음 |
| **실제 편집 + 저장** | ✅ | 제목에 ` [SMOKE-EDIT]` 추가 후 저장 → `source: 'store'` 로 persisted (`매장 편집본 (독립 저장)`) |
| **커뮤니티 원본 불변** | ✅ | `GET /contents/5b258882` 제목 변화 없음 |
| **다른 사본 불변** | ✅ | 형제 사본 `8a0c1288` 제목 그대로, `source: 'snapshot'` — 사본 간에도 독립 |

---

## 11. 생성·삭제한 테스트 사본

**소유 매장:** `Sohae 약국 매장` (org `9c87f46b-57a1-4afe-80bd-60782c49ce96`) — 전부 본 검증에서 생성.

| # | 사본 ID | 원본 ID | 생성 시각(UTC) | 정리 |
|---|---------|---------|----------------|:----:|
| 1 | `5596ba83-6297-415f-b797-95b5289212cc` | `5b258882` (껌의 효능) | 2026-07-25 12:52:58 | ✅ 제거 |
| 2 | `8a0c1288-1951-4ce9-b186-375e0f517984` | `5b258882` | 12:53:09 | ✅ 제거 |
| 3 | `1c9960b7-6656-430c-9f96-8bb882e64dbb` | `5b258882` | 12:53:18 | ✅ 제거 |
| 4 | `73f60bf2-ca95-4d65-ae7b-5ff074fd2cfd` | `5b258882` | 12:53:29 | ✅ 제거 |
| 5 | `f8a40f2a-b932-4556-a468-342be7bf0dde` | `df0f88b1` (해양 심층수 효능) | 12:53:29 | ✅ 제거 |

**제거 방식:** 자료함 UI 의 "제거"와 **동일한 사용자 경로** — `PATCH /store-assets/{id}/publish {status:'hidden'}` (`StoreLibraryContentsPage.removeSnapshots` 와 동일). hard delete 아님 → 되돌릴 수 있다.
**결과 검증:** 자료함 콘텐츠 총 **23 → 18** (정확히 5건), 대상 5건 목록에서 사라짐, **그 외 사본은 전부 그대로**(`otherCopiesUntouched: true`).

임시 콘텐츠(restricted 픽스처 `2606afab`)도 검증 후 `DELETE` 200 으로 삭제했다.

> **선행 WO 들의 테스트 사본(5건)은 손대지 않았다** — 본 WO 범위 밖이며 사용자 판단 대기 중(WO §10 "테스트 사본 일괄 삭제" 금지 준수).

---

## 12. 미해결 항목 / 중지 조건

**중지 조건 (WO §13) — 해당 없음**

| 조건 | 해당 | 비고 |
|------|:----:|------|
| 복사 API 가 생성 사본 ID 를 알 수 없음 | ❌ | 201 응답 `data.id` (§2) |
| 사본 ID 획득에 추정 검색 필요 | ❌ | 응답 직접 사용 — 제목·시각 재검색 없음 |
| canonical 개별 편집 route 부재 | ❌ | `/store/content/:snapshotId/edit` 기존 존재 |
| 목록이 특정 사본 선택 미지원 | ❌ | 개별 route 가 있어 query 신설 불필요 |
| 신규 전역 알림 시스템 필요 | ❌ | 기존 toast custom 렌더로 해결 |
| 소유권 가드 불명확 | ❌ | 서버 org 스코프 + PharmacyGuard (§6) |
| 다른 세션 WIP 충돌 | ❌ | 파일 중복 없음 |

**미검증 없음.** WO §11·§12 항목 전부 실행했다.

**검증 중 발견 (본 WO 원인 아님, 미수정):**

- `GET /store-library/contents/{id}/usage` (사용처 추적)는 `kpa_store_contents.id` 기준이라 **snapshot 사본 ID 로는 404** 를 반환한다. 정리 전 사용처 확인에 쓰려 했으나 사용할 수 없어, 대신 "본 실행에서 방금 생성돼 어떤 자산도 참조할 수 없는 사본"임을 근거로 정확한 ID 5건만 제거했다. snapshot 사본의 사용처 추적이 필요하면 별도 범위.

**후속 (본 WO 범위 밖):**

- 자료실 HUB(`/resources`, `assetType='resource'`)의 완료 CTA — 자료 사본은 `/store/library/resources` 계열이라 별도 판단 필요. WO §11.6 에 따라 이번엔 기존 동작 유지.
- 라벨 용어 정비 / GlycoPharm·K-Cosmetics 동일 패턴 점검.

---

*End of CHECK-O4O-KPA-CONTENT-IMPORT-COMPLETE-CANONICAL-MANAGEMENT-LINK-V1*
