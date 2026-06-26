# CHECK-O4O-KPA-STORE-LIBRARY-SNAPSHOT-SINGLE-EDIT-V1

> WO: **WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-SINGLE-EDIT-V1** (P4)
> 선행: `docs/ir/IR-O4O-COPY-ON-IMPORT-INVARIANT-AUDIT-V1.md`
> 작업일: 2026-06-26 · 상태: **COMPLETE (smoke PASS)** · 커밋: `b2bc49c41`(feat) + `ade1d3b57`(org fix)

## 결정 (저장 방식)

snapshot 편집 저장을 **override 레이어**로 구현(사용자 결정 A안). `o4o_asset_snapshots`(asset-copy-core = F1 동결 Core)는 불변 유지하고, 매장 편집은 기존 `kpa_store_contents`(source_type='snapshot_edit') override 로 저장한다. 직접 수정 방식은 동결 위반 + 기존 override GET 우선과 split-brain 위험이라 채택하지 않음.

## 핵심 사실 (조사)

- snapshot 단건 편집 화면·API는 **이미 존재**: `StoreContentEditPage`(`/store/content/:snapshotId/edit`) + `storeContentApi.get/save` → `GET/PUT /store-contents/:snapshotId`. 저장처 = `kpa_store_contents`(snapshot_edit upsert), `o4o_asset_snapshots` 불변.
- 유일 공백: `/store/library/contents` 피드 snapshot 분기가 override 를 COALESCE 하지 않아 편집이 목록에 반영되지 않음. (공개 published-assets 는 이미 COALESCE.)

## 변경 내용

| 파일 | 변경 |
|------|------|
| `store-library-feed.controller.ts` | 피드 snapshot 분기에 `LEFT JOIN kpa_store_contents(snapshot_edit)` + `COALESCE(sc.title,s.title)` / `COALESCE(sc.content_json,s.content_json)` → 편집본이 목록에 반영 |
| `StoreContentsSelector.tsx` | snapshot 액션 `보기`→`편집`, href `/view/:id` → `/store/content/:id/edit`(기존 편집기), 콘텐츠형 아이콘 통일(FileText) |
| `StoreContentEditPage.tsx` | 뒤로가기 `/store/content` → `/store/library/contents`(canonical 정렬) |
| `store-content.controller.ts` | **fix**: GET/PUT `/store-contents/:snapshotId` org 해석을 `resolveOrgId`(kpa_members only) → `resolveDualOrgId`(organization_members 우선)로 통일. store_owner(organization_members)만 있는 매장의 404 해소. 미사용 resolveOrgId 제거 |

## API / route

- 조회: `GET /store-contents/:snapshotId` (override 우선, 없으면 snapshot seed, source='store'|'snapshot')
- 저장: `PUT /store-contents/:snapshotId` (kpa_store_contents snapshot_edit upsert)
- route: `/store/content/:snapshotId/edit` (기존)
- 소유권: `resolveDualOrgId` = isStoreOwner(organization_members/RBAC) 우선, kpa_members fallback

## 불변식 보장

- snapshot id 불변(목록 href 동일), 편집 저장 시 **새 snapshot row 생성 없음**(override upsert).
- 원본 `o4o_asset_snapshots`(Core) 및 원본 `kpa_contents`(허브) 미수정.
- QR 영향 없음: snapshot 은 QR landing 직접 target 이 아님(QR=direct/library_item만). 해당 매장에 snapshot 기반 QR **데이터 없음**.

## 브라우저 + DB smoke (kpa-society.co.kr, 테스트 약국 매장)

대상 snapshot: `1fb412eb-2066-4f19-a509-dd3d4e3297c6` (해양 심층수 효능, 커뮤니티 콘텐츠 허브)

| Case | 내용 | 결과 |
|------|------|------|
| 1 | direct 항목 편집 가능 | ✅ |
| 2 | execution-asset 항목 편집 가능 | ✅ |
| 3 | snapshot 항목도 **편집** 표시(보기 아님) | ✅ |
| 4 | snapshot 편집 화면 진입(제목 prefill, source='snapshot') | ✅ (org fix 후) |
| 5 | 제목 수정 저장 → "저장 완료", source→'store'(override 생성) | ✅ |
| 6 | 동일 snapshot id 유지(목록 href 불변) | ✅ |
| 7 | 목록 새로고침 → 편집 제목 반영(COALESCE), 8건 유지(중복행 없음) | ✅ |
| 8 | 원본 미수정: o4o_asset_snapshots title/content_json 그대로, kpa_contents(df0f88b1) updated_at 2026-05-20 그대로. override row(kpa_store_contents snapshot_edit) 별도 생성 | ✅ |
| 9 | 자료함에 보기 전용 콘텐츠형 항목 없음(8건 전부 '편집') | ✅ |
| 10 | typecheck (api-server / web-kpa-society) | ✅ PASS |
| 11 | 운영 브라우저 smoke | ✅ PASS |

> smoke 마커(`[smoke-snap]`)는 검증 후 제목 원본으로 재저장(override는 원본 제목 보유 — 비파괴). o4o_asset_snapshots 직접 삭제·수정 없음.

## 회귀

- direct(`/store/content/direct/:id`)·execution-asset(`/store/library/production-materials/:id/edit`) 편집 흐름 무변경, 목록에서 정상 '편집' 표시.

## 후속

- snapshot body 편집은 기존 블록 에디터(StoreContentEditPage) 사용 — 본문 fidelity(블록/HTML)는 기존 에디터 한계 승계(별도 IR-O4O-COMMON-EDITOR-INLINE-STYLE-PRESERVATION-AUDIT-V1 참조).
- 피드 검색절은 원본 s.* 기준 — 편집 제목 검색 반영은 후속(표시 COALESCE는 완료).
- P3 `WO-O4O-QR-LANDING-TARGET-TYPE-TAG-V1`(store_qr_codes target_kind) 권장 — 운영 안정성·가독성.

## 사용자 기준 도달

> 내 매장 자료함에 있다 = 매장 사본이다 = 편집 가능하다 = QR/인쇄/PDF/타블렛 활용 가능.

direct / execution-asset / snapshot 콘텐츠형 3종 모두 '편집'으로 통일 완료.
