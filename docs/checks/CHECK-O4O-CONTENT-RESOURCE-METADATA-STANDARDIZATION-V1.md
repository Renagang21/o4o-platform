# CHECK-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1

Status: DONE — 백엔드(migration)+Admin UI 코드 완료 + 4서비스/api/admin typecheck + 배포 + 프로덕션 브라우저 smoke PASS (2026-07-08)
WO: `WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1`

> media_assets 에 Content Resource 서술 메타데이터를 additive 표준화하고, admin 신규 **Content Resource → Media Assets** 관리 화면에서 조회·수정. **admin에서 metadata 저장→DB 영속 프로덕션 브라우저 PASS.**

---

## 1. 착수 전 조사 — WO §13 가정 정정 (중요)

WO §13 은 "admin Media Library 화면 = media_assets"를 가정했으나 실제:
- admin `MediaLibraryAdmin.tsx`("Media Library" 페이지) = **레거시 `/content/media`(다른 테이블)**.
- media_assets(`/platform/media-library`) **전용 admin 관리 화면은 부재**(admin `media-library.api.ts`는 업로드 헬퍼).
- media_assets 실제 관리 표면 = WO-1 통합 공용 MediaPickerModal(선택 전용).

→ **결정(사용자 승인): admin에 Content Resource 관리 영역 신설**(첫 섹션 Media Assets, 이후 Templates/Search/Usage 확장). 레거시 /content/media 는 건드리지 않음. Picker 는 선택 전용 유지.

## 2. 구현 — 백엔드 (media_assets, 정확한 테이블)

| 항목 | 내용 |
|---|---|
| 엔티티 | `MediaAsset` 에 **신규 nullable 10컬럼**: title/description/tags(jsonb)/keywords(jsonb)/language/source/usage_type/status/memo/updated_by |
| 재사용 | uploaded_by(createdBy)/is_library_public(visibility)/asset_type(type)/created_at·updated_at |
| 마이그레이션 | `20261222000000-AddMediaAssetMetadata` — additive `ADD COLUMN IF NOT EXISTS`, backfill 없음, CI/CD 자동. **배포 시 적용 확인**(§5 목록 31건 정상 렌더) |
| 서비스 | `updateMetadata()` — 화이트리스트 metadata만 반영, **파일 속성(url/gcs_path/file_name/original_name/mime/size/width/height) 절대 미변경** |
| 엔드포인트 | `PATCH /platform/media-library/:id/metadata` (운영자 전용). url 불변 |
| owner | org/store 정식화 **제외**(별도 WO). uploaded_by/service_key 재사용 |

## 3. 구현 — Admin UI (신규)

- 신규 페이지 `apps/admin-dashboard/src/pages/content-resource/MediaAssetsPage.tsx` — **Content Resource → Media Assets** 관리(목록 + metadata 편집 모달). 라우트 `/content-resource/media-assets`(admin 전용).
- `media-library.api.ts` 에 `listMediaAssets`/`updateMediaAssetMetadata` 추가.
- 편집 모달: title/description/tags(CSV)/keywords(CSV)/language(select)/source(select)/usageType/status/memo/is_library_public. **파일 URL·원본명은 읽기전용**.
- 메뉴 링크는 minor 후속(현재 URL 직접 진입 — §7).

## 4. 검증 — typecheck / build / deploy

| 항목 | 결과 |
|---|---|
| api-server typecheck (media 변경) | **에러 0** (잔여 20건은 병렬 drug-otc scripts, build 제외) |
| admin-dashboard typecheck | **EXIT 0** |
| Deploy API Server (마이그레이션 실행) | **✓ success** |
| Deploy Admin Dashboard | **✓ success** |

## 5. 프로덕션 브라우저 smoke — metadata 저장 PASS

admin.neture.co.kr, 2026-07-08, admin(sohae2100). `/content-resource/media-assets`:
1. **목록 로드** ✓ — media_assets 31건(이미지+PDF). 제목/태그 "없음"(신규 컬럼 null) = **마이그레이션 컬럼 적용 확인**, 기존 자산 회귀 없음
2. **메타 편집 모달** ✓ — 전 필드 렌더, 파일 URL(`storage.googleapis.com/o4o-media-library/media/2026/06/…webp`) 읽기전용
3. **저장** ✓ — title="WO검증_대표이미지_2026", tags=[검증,대표이미지,WO], source=operator, language=ko 입력→저장 → 토스트 "메타데이터가 저장되었습니다" + **행이 DB-반환 엔티티로 갱신**(영속 확인, optimistic 아님) → 파일 썸네일/URL 불변
4. **Console 에러 0**. 스크린샷 `wo-metadata-admin-saved.png`

→ 백엔드 스키마 → 마이그레이션 → PATCH → Admin UI → DB 영속 end-to-end 프로덕션 확인.

## 6. 커밋 / 주의

- 백엔드: `b7a5fee95` — **동시 세션이 pre-stage한 SharedProductDescription 관련 5파일이 함께 커밋됨**(완전 staged 상태·컴파일 통과, 잔여 변경 없음 → 깨짐 없이 온전 포함). path-specific `git add`라도 이미 staged된 파일은 commit이 쓸어담는 문제. **이후 `git commit -- <paths>` 로 방지**(프론트 커밋 3224bdc54에 적용).
- 프론트: `3224bdc54` (path 제한, 내 3파일만).

## 7. 미완/후속

- **메뉴 링크 없음**: 현재 `/content-resource/media-assets` URL 직접 진입. admin 사이드바 nav 등록은 minor 후속(스코프 관리로 이번 제외).
- **검색/통합검색 미구현**(WO 명시 범위 밖) — 후속 `...-UNIFIED-SEARCH-V1`.
- owner org/store 정식화·dedup·버전·다른 Resource(Templates 등) 메타 확대 = IR §10 후속.

## 8. 완료 기준 대비 (WO §16)

| 기준 | 상태 |
|---|---|
| media_assets metadata 저장 가능(nullable additive) | ✅ (browser 목록·저장 PASS) |
| metadata 전용 PATCH(url 불변) 동작 | ✅ (browser 저장 PASS, 파일 불변) |
| Admin에서 조회·수정 가능 | ✅ (신규 Content Resource 화면, browser PASS) |
| 기존 기능 회귀 없음 | ✅ (기존 31자산 정상, 업로드/삭제/folder 무변경) |
| Migration 완료(CI/CD) | ✅ (API 배포 success, 컬럼 적용 확인) |
| typecheck/build | ✅ |
| CHECK/commit·push | ✅ 본 문서 |

---

*Status: DONE. media_assets metadata 표준화 + admin Content Resource → Media Assets 화면 프로덕션 PASS. 메뉴 링크·통합검색은 후속(§7).*
