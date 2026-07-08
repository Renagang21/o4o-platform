# WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1

## 1. 작업명

WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1

---

## 2. 배경

[`IR-O4O-CONTENT-RESOURCE-MANAGEMENT-ARCHITECTURE-V1`](../investigations/IR-O4O-CONTENT-RESOURCE-MANAGEMENT-ARCHITECTURE-V1.md) 결과, O4O의 Content Resource는 저장은 되어 있으나 검색·재사용·AI 추천·사용처 추적을 위한 **서술적 메타데이터가 거의 없다**. 특히 `media_assets` 는 원본 파일명(`original_name`) 외에 사용자가 이해할 정보가 전무하다(IR §2 매트릭스: 제목·설명·태그·키워드·언어·소유 전부 ✗).

검색·추천보다 **메타데이터 표준화가 선결**이다.

## 3. 목적

모든 Content Resource가 동일한 Metadata 구조를 갖도록 한다. **이번 WO는 검색 기능이 아니라 Metadata 표준(스키마+저장+수정+Admin 조회/편집)을 구현**하는 것이 목적이다.

> **핵심 원칙(사용자 지정): Metadata 는 파일(File)의 속성이 아니라 Resource 의 속성이다.**
> 동일 파일이라도 용도에 따라 제목·설명·태그가 달라질 수 있다. → §5.5 참조.

---

## 4. 적용 대상

**우선 적용**: `media_assets` (`MediaAsset`) — IR에서 메타 가장 빈약, 최우선.

**향후 동일 구조 확대**(별도 후속): `content_templates` · `store_execution_assets`(이미 tags 有) · `shared_product_descriptions` · `o4o_asset_snapshots`.

---

## 5. 구현 원칙

### 5.1 Additive — 기존 Resource 삭제/변경 없음
기존 컬럼·행 무변경. 신규 컬럼은 전부 **nullable**, backfill 없음.

### 5.2 파일명 ↔ 표시 이름 분리
물리 파일명(`file_name`=`uuid.ext`)은 불변. 사용자 대면 이름 = 신규 `title` 필드("비타민C_상품대표이미지_2026"). (`original_name` 은 업로드 원본명 보존 그대로, `title` 과 별개)

### 5.3 URL 절대 불변
`url`/`gcs_path`/`file_name` 은 변경하지 않는다. Metadata만 변경 가능.

### 5.4 Metadata는 파일과 독립 수정
파일 재업로드 없이 title/description/tags 등 수정 가능 — **신규 metadata PATCH 엔드포인트** 필요(§9). PATCH는 url/gcs_path/file_name 을 절대 건드리지 않는다.

### 5.5 Metadata = Resource 속성 (경계 주의)
"동일 파일 · 용도별 상이 metadata"(진정한 1 File → N Resource)는 **File 계층과 Resource 계층 분리**가 필요한 더 큰 아키텍처다. **이번 WO는 그 전 단계 — asset-level 1:1**(media_assets 행에 metadata 컬럼)로 구현한다. File/Resource 물리 분리는 후속 IR/WO로 명시 분리(과도한 선행 설계 금지). 개념적으로 "이 metadata는 이 자산의 이 용도"임을 문서로 고정.

---

## 6. Metadata 표준 — 기존 재사용 vs 신규 (IR §2·§9.1 기반)

> WO §6 "기존 컬럼과 중복되는 것은 재사용, 신규가 필요한 것만 추가" 를 실측으로 확정.

| 표준 필드 | media_assets 현황 | 처리 |
|---|---|---|
| **Title** | 없음(original_name만) | **신규** `title` varchar nullable |
| **Description** | 없음 | **신규** `description` text nullable (Plain Text, §8) |
| **Tags** | 없음 | **신규** `tags` jsonb nullable (string[], §7) |
| **Keywords** | 없음 | **신규** `keywords` jsonb nullable (사용자 입력, §9-원문) |
| **Language** | 없음 | **신규** `language` varchar nullable (§10) |
| **Source** | 없음(serviceKey는 서비스태그) | **신규** `source` varchar nullable (§11) |
| **UsageType** | 없음(assetType=image/video…는 파일종류) | **신규** `usage_type` varchar nullable |
| **Status** | 없음 | **신규** `status` varchar nullable |
| **Memo** | 없음 | **신규** `memo` text nullable (내부 메모) |
| **CreatedBy** | ✅ `uploaded_by`(uuid) | **재사용** |
| UpdatedBy | 없음 | **신규** `updated_by` uuid nullable |
| **Visibility** | ✅ `is_library_public`(boolean) | **재사용**(신규 컬럼 만들지 않음) |
| CreatedAt/UpdatedAt | ✅ | 재사용 |
| **Type** | ✅ `asset_type`(image/video/audio/document) | 재사용 |
| **Owner(org/store)** | uploaded_by(uuid)+service_key(str), **관계 없음** | §12 — **본 WO 범위 신중**(아래) |

**신규 컬럼(요약)**: `title`, `description`, `tags`, `keywords`, `language`, `source`, `usage_type`, `status`, `memo`, `updated_by`. 전부 nullable.

---

## 7. Tags

`tags` = jsonb string[]. 예: `["비타민", "약국POP", "대표이미지"]`. store 계열(store_execution_assets/kpa_contents) 의 기존 tags jsonb 규약과 정렬(→ 후속 통합검색이 `tags @> jsonb` 공통 적용 가능).

## 8. Description

검색·AI 추천용 설명. **HTML 미사용, Plain Text.** `description` text.

## 9. Keywords

**자동 생성하지 않음.** 사용자 직접 입력. `keywords` jsonb(또는 text). 향후 AI 보조는 별도.

## 10. Language

`language` varchar. 예: `ko`/`en`/`ja`/`zh`/`vi`/`th`/`id`. (다국어 체인 아님 — 단일 언어 태그. 언어별 Resource 체인은 후속.)

## 11. Source

생성 출처 표준. `source` varchar union: `operator`/`supplier`/`store`/`ai`/`external`/`import`. (기존 `service_key` 와 혼동 금지 — service_key=서비스 스코프, source=생성 주체 유형)

## 12. Owner — 범위 신중 (Shared Module / Boundary 주의)

IR은 **org/store owner 관계 정식화를 별도 P2 WO**(`...-MEDIA-ASSET-OWNERSHIP-V1`)로 분리했다. media_assets 에 `organizationId` 관계를 넣는 것은 **F6 Boundary Policy**(도메인 경계) 영향이 있으므로 본 WO에서 무리하게 하지 않는다.

- **본 WO**: owner = 기존 `uploaded_by`(createdBy) + `service_key` 재사용. 필요 시 `organization_id`(uuid, **nullable, 관계 없이 스칼라**)만 additive로 추가하고 정책 결합은 하지 않는다.
- **full org/store 소유 관계·Guard 정합** = ownership 후속 WO.

CHECK에 owner 처리 범위를 명시한다.

---

## 13. Admin UI

`admin.neture.co.kr` Media Library 관리 화면([`apps/admin-dashboard/src/pages/media/MediaLibraryAdmin.tsx`](../../apps/admin-dashboard/src/pages/media/MediaLibraryAdmin.tsx))에서 Metadata **조회·수정·저장**. **검색 화면까지는 구현하지 않는다**(후속 §19).

---

## 14. Migration

- 신규 컬럼 전부 **nullable**, backfill 없음 → 기존 Resource는 metadata 없이 정상 동작.
- 마이그레이션은 main 배포 시 **CI/CD 자동 실행**(CLAUDE.md §0). 마이그레이션 파일 타임스탬프는 리포지토리 **순차 카운터 규칙**(`YYYYMMDD000000` = 직전+1, 실제 날짜 아님) 준수.
- 기존 코드(업로드/list/getById/delete/folder) 영향 최소 — 신규 컬럼 미참조 시 무변경.

---

## 15. 검증

- 기존 Resource 조회/업로드/편집/삭제 **회귀 없음**
- Metadata 저장/조회/수정 정상(신규 PATCH)
- URL/gcs_path/file_name 불변 확인(PATCH가 파일 필드 미변경)
- typecheck / build 통과
- **배포 후 브라우저 smoke**: Admin Media Library에서 자산 metadata 편집→저장→재조회

---

## 16. 완료 기준

- media_assets 가 §6 metadata 컬럼을 저장할 수 있다(nullable, additive).
- **metadata 전용 PATCH 엔드포인트**(url 불변) 동작.
- Admin에서 metadata 조회·수정 가능.
- 기존 기능 회귀 없음 · Migration 완료(CI/CD).
- CHECK 작성 · commit·push 완료.

---

## 17. 산출물

CHECK — `CHECK-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1.md`

---

## 18. 작업 원칙

- 기존 Resource/URL/파일 유지 · Additive Migration(nullable, no backfill)
- **Metadata ↔ 파일 분리**(§5.5) · URL 불변(§5.3)
- 기존 컬럼 재사용(uploaded_by/is_library_public/asset_type) · 신규 최소(§6)
- **Owner org/store 정식화는 본 WO 범위 밖**(§12) — 별도 WO
- 최소 변경 · 코드 중복 금지

---

## 19. 후속 WO (IR §10 지도)

```text
WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1  (본 WO)
      ↓
WO-O4O-CONTENT-RESOURCE-MANAGEMENT-ADMIN-V1     (Admin 관리 확대)
      ↓
WO-O4O-CONTENT-RESOURCE-UNIFIED-SEARCH-V1        (통합 검색 — metadata 기반)
      ↓
WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1           (사용처 derivation 커버리지)
      ↓
WO-O4O-CONTENT-RESOURCE-DELETE-GUARD-V1          (삭제 사용중 보호 확대)
```

병행/후속: media_assets owner 정식화 · dedup(해시) · 버전 · AI 추천 메타 (IR §10 P2~P3).

---

## 목표

O4O의 모든 콘텐츠 자산은 단순 파일이 아니라 **Metadata를 가진 재사용 가능한 Content Resource**가 된다. 이 Metadata를 기반으로 검색·AI 추천·사용처 추적·재사용 기능을 확장한다.

---

*Status: 확정 (핸드오프 대기). DB additive migration + 백엔드 + Admin UI 포함. 실행은 별도 지시로 착수.*
