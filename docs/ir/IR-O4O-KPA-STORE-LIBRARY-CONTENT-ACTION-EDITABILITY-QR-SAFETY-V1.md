# IR-O4O-KPA-STORE-LIBRARY-CONTENT-ACTION-EDITABILITY-QR-SAFETY-V1

> 조사 전용 IR. KPA 매장 자료함 `/store/library/contents` 의 콘텐츠 액션(편집/열기/보기) 분기 원인과,
> "매장 제작 자료"를 편집 가능화할 때 기존 QR-code 연결이 깨지지 않는지 검증한다.
> 후속 작업: **WO-O4O-KPA-STORE-LIBRARY-EXECUTION-ASSET-EDIT-ACTION-V1** (PASS-A 착수).

- 작업일: 2026-06-26
- 검증 방식: 코드 정적 분석 + 운영 DB read-only 1건 확인 (CLAUDE.md §0/§8)

---

## 1. 결론

| 액션 | origin | 실제 저장체 | QR 참조 ID | 편집 전환 |
|------|--------|------------|-----------|-----------|
| **편집** | `direct` | `kpa_store_contents` (매장 사본) | `store_qr_codes.landing_target_id` = 사본 ID | 이미 편집 |
| **열기→편집** | `execution-asset` | `store_execution_assets` (매장 사본) | `store_qr_codes.library_item_id` = **사본 ID** | ✅ **PASS-A 안전** |
| **보기** | `snapshot` | `o4o_asset_snapshots` → `kpa_contents` | `landing_target_id` = **원본 ID** | ⚠️ HOLD-B (사본화 선행, 본 WO 제외) |

- **열기/편집/보기 분기 기준**: 순수하게 `row.origin` 값. (코드: `StoreContentsSelector.tsx`)
- **매장 제작 자료(execution-asset)의 실제 저장 구조**: `store_execution_assets` 의 독립 PK(uuid) + `organization_id` 로 격리된 **매장 소유 사본**. 편집은 `PUT /store/assets/:id` 가 같은 row 를 update (id 불변).
- **QR 연결 대상**: 제작 자료 QR 은 `store_qr_codes.library_item_id = store_execution_assets.id` (매장 사본 ID) 를 직접 참조.
- **편집 전환 가능 여부**: 가능 (PASS-A). 같은 row update → id 불변 → 기존 QR 무영향.
- **기존 QR 영향**: 없음. 편집 저장 시 콘텐츠 id 와 QR 의 `library_item_id` 모두 불변, 공개 랜딩은 수정된 최신 본문을 표시.

---

## 2. 코드 근거

### 2.1 액션 분기 (Frontend)
`services/web-kpa-society/src/pages/pharmacy/StoreContentsSelector.tsx`
- 분기: `row.origin === 'direct' ? '편집' : row.origin === 'execution-asset' ? '열기' : '보기'`
- route(`toDocumentRow`):
  - `direct` → `/store/content/direct/{id}` (단건 편집기)
  - `execution-asset` → `/store/library/production-materials` (목록 뷰어 — 단건 편집기 없음)
  - `snapshot` → `/view/{id}` (뷰어)
- 목록 피드는 `store-library-feed.controller.ts` 의 UNION (snapshot + direct + execution-asset). **execution-asset 행은 피드에서 `e.asset_type = 'content'` 로 필터** → 이 목록의 execution-asset 은 모두 콘텐츠형.

### 2.2 저장 구조 (Backend)
`apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts`
- `store_execution_assets`: `id`(uuid PK), `organization_id`, `asset_type`('file'|'content'|'external-link'), `html_content`, `source_type`, `is_active` …
- `apps/api-server/src/routes/o4o-store/controllers/store-execution-assets.controller.ts`
  - `PUT /store/assets/:id`: `findOne({ where: { id, organizationId } })` 후 **같은 row update** (id/organization_id/asset_type 보존). content 타입은 `html_content` 만 갱신.
  - 가드: `requireAuth` + `requirePharmacyOwner`(serviceKey='kpa' → `kpa:store_owner` role + service_membership active).
- 원본↔사본 연결은 `store_asset_derivations` (polymorphic, FK 없음) 로 추적.

### 2.3 QR target (Backend) — 결정적 근거
`apps/api-server/src/routes/o4o-store/controllers/store-execution-assets.controller.ts` DELETE 핸들러:
```sql
SELECT COUNT(*) FROM store_qr_codes WHERE library_item_id = $1 AND is_active = true
```
→ 활성 QR 이 있으면 자산 삭제를 막는다(409 `QR_REFERENCE_EXISTS`). 즉 **QR 은 `library_item_id` 로 `store_execution_assets.id`(사본)를 참조**함이 코드로 확증됨.
`store-qr-landing.controller.ts`: `landingType='page'` 공개 랜딩은 `library_item_id` 로 `store_execution_assets.html_content` 를 직접 렌더(source='store_asset').

---

## 3. 운영 DB read-only 확인 (선행)

`o4o_platform` (cloud-sql-proxy, SELECT only):

```
total_qr_with_lib | matched_to_exec_asset | matched_content_type
        5         |          5            |          4
```
- `library_item_id` 보유 QR 5건 **전부** `store_execution_assets.id` 와 매칭 (id_match=t).
- 그중 4건이 `asset_type='content'` (편집 대상), 1건은 `file` (콘텐츠 피드 비노출 → 편집 대상 아님).
- 결론: 실데이터에서도 **QR 은 매장 사본 ID(library_item_id)를 참조**. 편집(같은 row update) 시 QR 무영향 확정.

---

## 4. 위험 요소

- **열기(execution-asset)→편집**: QR 이 같은 사본 id 참조 + 편집=같은 row update → **id 변경 없음, QR 안전**. 단 기존엔 단건 편집기 부재 → 본 WO 에서 추가.
- **보기(snapshot)→편집**: QR 이 원본 `kpa_contents.id` 참조, snapshot 은 immutable → 직접 편집 불가. **본 WO 제외**, 별도 "복사해서 편집" 정책 필요.

---

## 5. 판정 및 후속

- **PASS-A**: `execution-asset`(content) 액션을 열기→편집 전환, 단건 편집기 연결. → **WO-O4O-KPA-STORE-LIBRARY-EXECUTION-ASSET-EDIT-ACTION-V1** 로 착수.
- **HOLD-B**: snapshot 편집은 후속 `WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-COPY-BEFORE-EDIT-V1` 로 분리.
