# CHECK-O4O-KPA-CONTENT-IMPORT-COMPLETE-CANONICAL-MANAGEMENT-LINK-V1

> **WO:** WO-O4O-KPA-CONTENT-IMPORT-COMPLETE-CANONICAL-MANAGEMENT-LINK-V1
> **근거 조사:** [IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1](IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1.md) **C6**
> **선행:** [CHECK-...-CONTENT-DETAIL-STORE-IMPORT-LINK-V1](CHECK-O4O-KPA-CONTENT-DETAIL-STORE-IMPORT-LINK-V1.md) (C4) · [CHECK-...-REUSABLE-POLICY-LIST-DETAIL-PARITY-V1](CHECK-O4O-KPA-CONTENT-REUSABLE-POLICY-LIST-DETAIL-PARITY-V1.md)
> **작성일:** 2026-07-25
> **유형:** frontend-only. 신규 API·테이블·migration·관리 화면·route **0**.
> **상태:** ✅ 코드 완료 / tsc 0 · build 성공 — 브라우저 smoke 는 §10

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

*(배포 후 기록)*

---

## 11. 생성·삭제한 테스트 사본

*(배포 후 기록)*

---

## 12. 미해결 항목 / 중지 조건

*(배포 후 기록)*

---

*End of CHECK-O4O-KPA-CONTENT-IMPORT-COMPLETE-CANONICAL-MANAGEMENT-LINK-V1*
