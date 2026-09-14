# Media Library 등록 metadata 초안 — EP01 신규 자산 4건 (V1)

> **대상**: [Asset manifest](EP01-ASSET-MANIFEST-V1.md) A-01 · A-02 · A-03 · B-01. 파일 수령 후 이 값 그대로 등록한다.
> **경로 계약**: (prefix `/api/v1/platform`) `POST /media-library/upload`(multipart, `folder`) → `PATCH /media-library/:id/metadata` → `PATCH /media-library/:id/catalog` → `POST /media-library/:id/links`. 전부 production API · `platform:super_admin` smoke 계정 · 쿠키 인증 (ASSET-PREP CHECK 와 동일).
> **enum 근거**: `apps/api-server/src/modules/media/services/media-catalog.service.ts` `MEDIA_ENUMS` (originType `original|edited|ai_generated|external` · qaStatus `PENDING|APPROVED|REJECTED` · productAccuracyLevel `EXACT|ACCEPTABLE|SUPPORT_ONLY|REJECTED` · derivationType `original|background-removed|generated-scene|…`).
> **주의**: 일반 업로드는 1200px WebP 로 축소 저장된다. 등록본은 카탈로그/reference 용이며 합성 원본은 로컬 파일(manifest 경로).

## 공통

- `serviceKey=null` (service-neutral) · `source=operator` · `language=ko`
- links: `entityType=video-production-job` · `entityId=8a357640-ad64-42f3-ae4c-43519ce78222`
- memo 에 `Category/MediaType/Purpose/Scope/Visibility` 병기(전용 필드 없음 — CHECK §14).

## 1. A-01 제품 Master (실사 정면)

> ✅ 등록 완료 2026-09-14 — `1a09602e-7c48-48a0-82d2-b43b803baa64` (873×1200 webp · INPUT · APPROVED · internal · catalog `original/original` · qa APPROVED · EXACT · supplier-provided · memo `provisional master — replace when high-resolution source becomes available`) · Job INPUT `b84b611c…`. 기존 잠정 Master `215592fd` memo 에 SUPERSEDED 표기(링크 유지).

```jsonc
// upload: folder=general
// metadata
{
  "title": "MINEROCK600 제품 Master — 실사 정면 (고해상도 원본 기준)",
  "description": "사용자 제공 실제 제품 사진. 라벨·병 형태 원본 그대로(AI 재생성 없음). 영상 합성 원본은 로컬 고해상도 파일, 본 등록본은 1200px 카탈로그 사본.",
  "tags": ["minerock600", "product-front", "bottle", "master", "photo"],
  "keywords": ["미네락600", "MINEROCK", "해양심층암반수"],
  "usageType": "INPUT",
  "status": "APPROVED",
  "isLibraryPublic": false,
  "memo": "Category=PRODUCT / MediaType=image / Purpose=INPUT / Scope=MINEROCK / Visibility=INTERNAL. 기존 잠정 Master 215592fd 를 대체(215592fd 는 링크 유지, memo 에 superseded 표기만)."
}
// catalog
{ "originType": "original", "derivationType": "original", "qaStatus": "APPROVED",
  "productAccuracyLevel": "EXACT", "rightsType": "supplier-provided", "commercialUseAllowed": true, "attributionRequired": false }
// link
{ "entityType": "video-production-job", "entityId": "8a357640-ad64-42f3-ae4c-43519ce78222", "purpose": "INPUT" }
```

`rightsType` 은 사진 출처에 따라 확정(공급자 제공 → `supplier-provided`, 직접 촬영 → `o4o-original`).

## 2. A-02 제품 Cutout (투명 배경)

> ✅ 등록 완료 2026-09-14 — `1a0263e1-03fa-41c7-bc67-ea9a2975e045` (382×1200 webp alpha · INTERMEDIATE · APPROVED · catalog `edited/background-removed` · parent=A-01 · qa APPROVED · EXACT) · Job **INTERMEDIATE** `8317dc11…` (사용자 지시로 아래 초안의 INPUT 대신 INTERMEDIATE). status 는 육안 검수 통과로 REVIEW 단계 없이 APPROVED.

```jsonc
// upload: folder=general  (PNG alpha → webp alpha 유지 확인)
{
  "title": "MINEROCK600 제품 Cutout — 투명 배경 (Master 배경 제거본)",
  "description": "A-01 에서 배경만 제거. 라벨 픽셀 보존, 수치·텍스트 왜곡 없음 육안 검수 완료 시 APPROVED.",
  "tags": ["minerock600", "product-front", "cutout", "transparent"],
  "usageType": "INPUT",
  "status": "REVIEW",
  "isLibraryPublic": false,
  "memo": "Category=PRODUCT / MediaType=image / Purpose=INPUT / Scope=MINEROCK / Visibility=INTERNAL. 검수 통과 후 status=APPROVED 로 변경."
}
{ "originType": "edited", "derivationType": "background-removed", "parentAssetId": "<A-01 id>",
  "qaStatus": "PENDING", "productAccuracyLevel": "EXACT", "rightsType": "<A-01 과 동일>", "commercialUseAllowed": true, "attributionRequired": false }
{ "entityType": "video-production-job", "entityId": "8a357640-ad64-42f3-ae4c-43519ce78222", "purpose": "INPUT" }
```

## 3. A-03 `O4O 한국 여성 약사 A` — R-01 정면

> 등록 완료(2026-09-14): R-01 `4aa5e0c3…` · R-02 `ba0b9211…`(`generated-angle`, parent R-01) · R-03 `4dd57f20…`(동일). 실제 경로 prefix 는 `/api/v1/platform/…`.

```jsonc
// upload: folder=production
{
  "title": "O4O 한국 여성 약사 A — R-01 정면 기준 이미지",
  "description": "O4O 공통 설명자 캐릭터(AI 생성, 실존 인물 아님). 30대 후반~40대 초반 한국인 여성 약사, 흰 가운, 단정한 헤어, 자연스러운 화장. 시리즈 일관성 기준본.",
  "tags": ["o4o-presenter", "pharmacist-a", "korean-female-pharmacist", "character-reference", "reusable"],
  "keywords": ["약사 A", "설명자", "presenter"],
  "usageType": "REUSABLE",
  "status": "APPROVED",
  "isLibraryPublic": true,
  "memo": "Category=CHARACTER / MediaType=image / Purpose=REUSABLE / Scope=O4O_COMMON / Visibility=PUBLIC. 캐릭터 시트 docs/media-pilot/minerock600/CHARACTER-SHEET-O4O-KR-FEMALE-PHARMACIST-A-V1.md. 첫 사용 EP01."
}
{ "originType": "ai_generated", "derivationType": "original", "qaStatus": "APPROVED",
  "productAccuracyLevel": "SUPPORT_ONLY", "rightsType": "o4o-original", "commercialUseAllowed": true, "attributionRequired": false,
  "generationProvider": "<생성 도구명>", "generationModel": "<모델명>", "promptRef": "CHARACTER-SHEET-…-V1 §3" }
{ "entityType": "video-production-job", "entityId": "8a357640-ad64-42f3-ae4c-43519ce78222", "purpose": "INPUT" }
```

## 4. B-01 동해/심층수 분위기 배경

> 실측(2026-09-14): `derivationType=generated-scene` 은 `parentAssetId` 필수(`PARENT_REQUIRED`). 원본 없이 생성한 배경은 **`derivationType=original`** 로 등록했다. 아래 payload 는 그에 맞춰 정정. 등록 ID `555b7289…`.

```jsonc
// upload: folder=production
{
  "title": "동해 · 깊은 바다 · 암반 분위기 배경 (AI 생성) — EP01 CUT 2",
  "description": "분위기 전용 AI 생성 배경. 실제 취수 현장·수심·지질 정보 아님. 1,050m 등 사실 정보는 east-sea-bedrock-concept 그래픽이 담당.",
  "tags": ["minerock600", "east-sea", "deep-sea", "mood-background", "ai-generated"],
  "usageType": "INTERMEDIATE",
  "status": "DRAFT",
  "isLibraryPublic": false,
  "memo": "Category=SCENE / MediaType=image / Purpose=INTERMEDIATE / Scope=MINEROCK / Visibility=INTERNAL. 가드: 실사·현장 의미 부여 금지."
}
{ "originType": "ai_generated", "derivationType": "original", "qaStatus": "PENDING",
  "productAccuracyLevel": "SUPPORT_ONLY", "rightsType": "o4o-original", "commercialUseAllowed": true, "attributionRequired": false,
  "generationProvider": "<도구명>", "promptRef": "EP01-ASSET-MANIFEST-V1 B-01" }
{ "entityType": "video-production-job", "entityId": "8a357640-ad64-42f3-ae4c-43519ce78222", "purpose": "INTERMEDIATE" }
```

## 5. 등록 후 Job 갱신

`PATCH /api/v1/platform/automation-jobs/8a357640…` — ✅ 2026-09-14 `statusNote`: `EP01 자산 완비 — 영상 생성 준비`. 상태는 `DRAFT` 유지. Job `{INPUT: 6, INTERMEDIATE: 14}`. **영상 생성은 별도 지시.**
