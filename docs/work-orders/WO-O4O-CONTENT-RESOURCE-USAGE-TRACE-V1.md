# WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1

## 1. 작업명

WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1

---

## 2. 배경

Metadata 표준화([`WO-...-METADATA-STANDARDIZATION-V1`](WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1.md)) + 통합 검색([`WO-...-UNIFIED-SEARCH-V1`](WO-O4O-CONTENT-RESOURCE-UNIFIED-SEARCH-V1.md)) 완료로 media_assets 는 검색 가능한 Content Resource가 됐다. 그러나 **Resource가 실제 어디에서 쓰이는지 확인할 방법이 없다**.

[`IR-O4O-CONTENT-RESOURCE-MANAGEMENT-ARCHITECTURE-V1`](../investigations/IR-O4O-CONTENT-RESOURCE-MANAGEMENT-ARCHITECTURE-V1.md) §5: media_assets는 derivation 그래프 밖 → QR/POP/사이니지/태블릿/블로그/상품설명 사용처 역추적 불가, 삭제 전 영향 범위 미상.

## 3. 목적

Content Resource 하나를 선택하면 **"현재 어디에서 사용 중인지"** 관리자가 즉시 확인. **이번 WO는 조회(Read-only)** — 삭제 차단은 다음 WO(Delete Guard).

## 4. 적용 범위

- 대상 Resource: `media_assets`
- 조회 소스: `store_execution_assets`(이번 WO 한정)
- 표시 표면: POP / QR / Signage / Tablet / Notice / Banner (= usage_type)

## 5. 구현 원칙

### 5.1 Read-only
사용처 조회만. 삭제 차단·데이터 변경 없음.

### 5.2 실제 참조만 표시 (추정 금지)
Metadata/Title/Tag로 추정하지 않는다. **실제 HTML 안에 Resource URL이 존재하는 경우만** 사용으로 판단.

### 5.3 Resource 기준 = url (id 아님)
사용처는 `media_asset.id`가 아니라 **실제 삽입된 `url`**(필요 시 `gcs_path`) 기준으로 찾는다. (편집기는 URL만 저장 — Content Resource 원칙. IR §1)

### 5.4 HTML Parser 사용 (ILIKE 단독 금지)
단순 텍스트 ILIKE가 아니라 **HTML을 파싱**하여 `img`/`video`/`source` 태그의 `src`에서 Resource URL을 추출·비교한다. (본문 텍스트에 URL이 우연히 언급된 경우 제외)

> **권장 구현(성능·정확 절충):** ① `html_content ILIKE '%{asset.url}%'` 로 후보 coarse 필터(소규모 테이블, 인덱스 불필요) → ② 후보만 HTML 파싱하여 `img/video/source` 의 src 에 asset.url 이 실제 존재하는지 확정. coarse 필터로 스캔 대상을 좁히고 파서로 정밀 판정.

## 6. 대상 태그 — img / video / source (iframe 제외)

`img`·`video`·`source` 의 src 만 추출. **iframe 제외** — YouTube/Vimeo는 Resource가 아니므로 Usage Trace 대상 아님(§11).

## 7. Backend — 신규 API

`GET /platform/media-library/:id/usage` (운영자 전용, read-only).
- 흐름: asset 조회(url 확보) → store_execution_assets 후보(html_content ILIKE url) → HTML 파싱하여 img/video/source src 에 url 포함 확정 → Usage 목록 반환.
- **스코프 주의:** media_assets 는 서비스/조직 무관 공용 자산이므로, 사용처는 **여러 organization 의 execution asset에 걸쳐 존재**할 수 있다. admin 조회이므로 org 필터 없이 전 사용처를 반환(각 항목에 organization/store 표기). Boundary(F6)는 조회 전용이라 위반 아님 — CHECK에 명시.

## 8. Usage 정보 (응답 필드)

store_execution_asset → Usage 매핑:
`surface`(=usage_type: pop/qr/signage/banner/notice) · `title` · `resourceUrl`(매칭된 asset url) · `usageType` · `organizationId` · (store) · `updatedAt` · `assetId`(execution asset id).

## 9. Admin — Usage Tab

Media Assets 상세(또는 메타 편집 모달)에 **Usage** 탭/섹션 추가. 표면·제목·조직·수정일 목록. (상세 진입 시 1회 조회 — §12)

## 10. Query — store_execution_assets 한정

이번 WO는 `store_execution_assets.html_content` 만 조회. QR(store_qr_codes)·태블릿(store_tablet_displays)·블로그·상품설명 등 확대는 다음 WO.

> 참고: `usage_type`(pop/qr/signage/banner/notice)이 execution asset 자체에 있어, 표면 분류는 그 값으로 표기. QR 랜딩이 execution asset(asset_type='content')을 참조하는 경우도 html_content 매칭으로 포착됨.

## 11. 제외 (§14 준수)

Asset Derivation(store_asset_derivations) 그래프 연동 · Execution Graph · Delete Guard · Cross-Resource · AI Usage · Template/Snapshot/SharedProductDescription Usage · iframe/YouTube.

## 12. 성능

사용처 조회는 **상세 진입 시 1회**. 목록에서는 조회하지 않는다(§검색 목록 무영향).

## 13. 착수 전 조사 (CHECK 기록 필수)

1. **store_execution_assets.html_content 이미지/동영상 저장 형태 실측**: 편집기 산출물이 `<img>`(DisplayImage `class="editor-image"`, src=media url) / `<video class="editor-video" src>`(WO-3) / `<source>` 로 저장되는지, url 형태가 `storage.googleapis.com/o4o-media-library/...` 인지 확인.
2. **HTML 파서 가용성**: api-server 에 HTML 파서(`node-html-parser`/`cheerio`/`jsdom`) 의존이 있는지 조사. **없으면**: `img/video/source` 의 src 만 추출하는 **정밀 스코프 정규식**(`<(img|video|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']`)으로 대체(iframe 미포함). 신규 무거운 의존 추가 지양 — 조사 결과로 판단.
3. 실제 사용 중 자산이 있는지(브라우저 smoke 시연용) 확인. 없으면 smoke 에서 execution asset에 media url을 넣어 1건 생성 후 검증(테스트 데이터 최소).

## 14. 검증

브라우저: Media Assets → 상세 → Usage 에서 사용처 확인. 이미지 사용 execution asset 존재 시 표시, 재조회, **삭제 없음**, 콘솔 에러 없음.

## 15. 완료 기준

Usage API 구현 · Admin Usage Tab · 실제 사용처 표시 · Read-only · 기존 회귀 없음 · typecheck/build · 배포 · 브라우저 smoke · CHECK · commit/push.

## 16. 산출물

CHECK — `CHECK-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1.md`

## 17. 작업 원칙

Read-only · 기존 데이터 무변경 · Resource 삭제 금지 · **실제 참조(img/video/source src)만 표시** · 최소 범위(additive) · 신규 무거운 의존 지양.

## 18. 후속 WO

```text
WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1  (본 WO)
      ↓
WO-O4O-CONTENT-RESOURCE-DELETE-GUARD-V1   (사용 중 삭제 차단 — 본 WO Usage 재사용)
      ↓
WO-O4O-MEDIA-ASSET-OWNERSHIP-V1 · DEDUP-HASH · VERSIONING · AI-RESOURCE-METADATA
```

---

## 목표

Content Resource는 저장·검색을 넘어 **"어디에서 사용되는지 추적 가능한 관리 대상"**이 된다. Delete Guard·영향도 분석·사용 통계·AI 추천의 기반 Usage Trace 계층을 구축한다.

---

*Status: 확정 (핸드오프 대기). §13 착수 전 조사 포함. 실행은 별도 지시로 착수.*
