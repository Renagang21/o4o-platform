# IR-O4O-COPY-ON-IMPORT-INVARIANT-AUDIT-V1

> 조사 전용. O4O 전체에서 "가져오기 = 매장 소유 사본" 불변식이 지켜지는지, **원본을 실행 연결(편집/QR/PDF/타블렛 렌더)로 참조하는 잔재**가 있는지 전수 조사한다.
> 코드 변경·DB 변경·운영 데이터 변경 없음.

- 작업일: 2026-06-26
- 검증: 코드 정적 분석(4갈래) + 운영 DB read-only (o4o_platform)
- 관련: 선행 [IR-...-ACTION-EDITABILITY-QR-SAFETY-V1], 후속 WO-...-EXECUTION-ASSET-EDIT-ACTION-V1(완료)

---

## 1. 전체 결론

**불변식은 현재 운영에서 성립한다.** 내 매장 자료함 목록과 활성 QR은 전부 매장 소유 사본을 가리키며, 원본(`kpa_contents`/`supplier_product_offers`) 직접 참조는 **운영 데이터에 0건**이다.

| 영역 | 판정 | 근거 |
|------|------|------|
| 가져오기/복사 API (A~E 흐름) | **PASS** | 전부 사본 row INSERT (org/store 소유) |
| `o4o_asset_snapshots` (snapshot) | **PASS (전체 사본)** | `content_json`에 본문 전체 복사, `organization_id`=매장. 원본 포인터 아님 |
| `/store/library/contents` 피드 | **PASS** | snapshot/direct/execution-asset 모두 사본 id 반환. `kpa_contents`/`cms_contents` 직접 UNION 없음 |
| QR 실데이터 | **PASS** | 활성 QR 7건 전부 사본 참조 (kpa_store_contents 4 / store_execution_assets 3 / **kpa_contents 원본 0**) |
| QR resolver/생성 코드 | **잠재 FAIL-B (코드 경로만)** | page→`kpa_contents`, product→`supplier_product_offers` 직접 해석 경로 존재. 운영 데이터엔 미실현 |

> **이전 IR 표현 정정**: 직전 IR에서 snapshot을 "원본 kpa_contents 참조"로 서술했으나, 이는 **QR landing resolver의 해석 우선순위** 이야기였다. **자료함 피드의 snapshot row id 는 `o4o_asset_snapshots.id`(사본)** 이며 원본 노출이 아니다. snapshot "보기" 액션은 단건 편집기 부재에 따른 UX 선택일 뿐, 원본 참조 문제가 아니다.

---

## 2. 가져오기/복사 흐름 목록 (전수)

모두 **사본 생성(PASS)**. 원본 id는 추적 metadata로만 사용.

| 흐름 | 경로 | 원본 → 사본 | 소유 | 추적 |
|------|------|------------|------|------|
| A. 자료함 가져오기 | `POST .../assets/copy` (asset-copy-core) | kpa_contents/cms_contents/signage_media/lms_courses → **o4o_asset_snapshots** | organization_id | source_asset_id (FK 아님) |
| B1 POP import | `.../pop/staff/import` | store_pops(operator) → **store_pops(store)** | store_id | excerpt 접두어 |
| B2 QR import | `.../qr/staff/import` | operator_qr_templates → **store_qr_codes** | organization_id | (변환 결과 저장) ⚠ §4 참조 |
| B3 동영상 import | `.../video/staff/import` | store_videos(operator) → **store_videos(store)** | store_id | copiedFromId |
| B4 블로그 import | `.../blog/staff/import` | store_blog_posts(operator) → **store_blog_posts(store)** | store_id | excerpt 접두어 |
| C. 대시보드 복사 | `POST /dashboard/assets/copy` | cms_media/signage_*/cms_contents → **동일 테이블(org 사본)** | organization_id | parentMediaId/metadata.sourceContentId |
| D. 직접 작성 | `.../pop/staff`, `.../blog/staff`, direct content | (원본 없음) → store 신규 | store_id/org_id | — |
| E. derivation | store_asset_derivations | (추적 전용, FK 없음) | org_id | source→derived 기록 |

근거: `packages/asset-copy-core/src/entities/asset-snapshot.entity.ts:34-38`(content_json jsonb), `.../services/asset-copy.service.ts:111-136`(본문 깊은 복사), `apps/api-server/.../kpa-asset.resolver.ts`(유형별 본문 복사), `.../dashboard-assets.copy-handlers.ts:135-421`.

---

## 3. 자료함 피드 — 원본 노출 없음

`apps/api-server/.../store-library-feed.controller.ts:155-210` UNION 3분기:
- snapshot → `o4o_asset_snapshots.id` (WHERE organization_id=$1, 본문=`s.content_json`)
- direct → `kpa_store_contents.id` (source_type='direct', org 격리)
- execution-asset → `store_execution_assets.id` (asset_type='content', org 격리)

`kpa_contents`/`cms_contents` 를 직접 UNION 하는 경로 **없음**. KPA 전용 mount (`kpa.routes.ts:400`).

---

## 4. QR — 유일한 잠재 잔재 (FAIL-B, 코드 경로)

### 4.1 landing_type별 target 매핑 (`store-qr-landing.controller.ts`)

| landing_type | target | 사본/원본 | 판정 |
|---|---|---|---|
| page (landing_target_id=UUID, **kpa_contents 우선 조회** :238-260) | kpa_contents.id | **원본(content_hub)** | ⚠ FAIL-B 경로 |
| page (fallback :266-287) | kpa_store_contents.id | 사본 | PASS |
| page (library_item :296-310) | store_execution_assets.id | 사본 | PASS |
| product (:182-204) | supplier_product_offers.id | **원본** | ⚠ FAIL-B 경로 |
| product (fallback) | organization_product_listings.id | 사본 | PASS |
| video (:212-221) | store_videos.id (store_id 격리) | 사본 | PASS |
| link | 외부 URL | N/A | — |

### 4.2 원본 참조가 채워지는 경로
- **운영자 QR 템플릿 → 매장 QR 변환** (`qr.controller.ts:161-191`): `targetContentKind='content_hub'` 일 때 `landing_target_id = targetContentRef = kpa_contents.id` 를 **사본화 없이** 그대로 저장.
- **클라이언트 직접 지정** (`POST .../pharmacy/qr`): `landingTargetId` 를 검증 없이 저장 → 임의 kpa_contents.id 지정 가능.
- resolver page 분기가 **kpa_contents 를 가장 먼저** 조회하므로, 위 값이 있으면 공개 QR이 원본 본문을 그대로 렌더 (source='content_hub').

### 4.3 운영 데이터 (read-only) — 미실현
```
landing_type 분포(활성): page 7 (library 3 / target 4)
page QR → kpa_contents 원본 매칭: 0
product QR → supplier_product_offers 매칭: 0
page target 분해: via_library_item 3 / via_kpa_store_contents 4 / via_kpa_contents_original 0
```
→ **현재 활성 QR 7건 전부 매장 사본 참조. 원본 참조 0건.** FAIL-B는 코드상 가능하나 데이터로 실현되지 않음.

### 4.4 정책 결정 포인트 (중요)
운영자 `content_hub` 콘텐츠는 CLAUDE.md F4(Platform Content Policy) 상 **Broadcast 도메인(HUB 소비 YES)** 이다. "운영자가 한 번 게시 → 모든 매장 QR이 라이브 원본을 본다"는 **사이니지형 broadcast 모델**일 수 있어, 무조건 "사본화"가 옳다고 단정하기 어렵다. 따라서 page→kpa_contents 는 **버그가 아니라 정책 선택 대상**으로 보고한다.

→ **결정 필요**: 운영자 content_hub QR을 (a) 사본화 강제 / (b) broadcast 원본 참조 허용(명문화). 사용자 정책("QR=사본")을 그대로 적용하면 (a), HUB broadcast 철학을 따르면 (b).

---

## 5. GP / K-Cosmetics / 공통 모듈

- asset-copy / store-execution-assets / QR·POP staff 컨트롤러는 **3서비스 공통**(serviceKey 격리): `kpa.routes.ts:411`, `glycopharm.routes.ts:394`, `cosmetics.routes.ts:161` 등. 가져오기=사본 흐름 동일 적용.
- **store-library-feed(콘텐츠 피드)는 KPA 전용** — GP/KCos 미mount. 원본 참조 잔재가 아니라 **미구현**(GP/KCos는 자료함 통합 피드 없음).
- 원본 테이블은 서비스별 분리(kpa_contents / glycopharm_contents / cosmetics_contents). 공통 asset-copy-core factory 변경은 3서비스 동시 영향.

---

## 6. 수정 후속 WO (우선순위)

| 우선 | WO | 목적 | 트리거 조건 |
|:---:|------|------|------|
| **P1 (결정 선행)** | WO-O4O-KPA-QR-CONTENT-TARGET-COPY-OR-BROADCAST-DECISION-V1 | §4.4 결정. content_hub QR을 사본화할지 broadcast 허용할지 명문화 | 즉시 (정책 결정) |
| P2 | WO-O4O-QR-TARGET-COPY-GUARD-V1 | (P1이 "사본화"면) 운영자 템플릿 변환·QR 생성 시 content_hub 원본을 매장 사본으로 derive 후 그 id를 target 으로 저장. resolver kpa_contents 직접 분기 제거 | P1=(a) |
| P3 | WO-O4O-QR-LANDING-TARGET-TYPE-TAG-V1 | store_qr_codes 에 target_kind 컬럼 추가 — landing_target_id 단독으로 사본/원본 구분 불가 문제 해소(가독성·가드) | P1 무관, 권장 |
| P4 | WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-SINGLE-EDIT-V1 | snapshot "보기"→편집 가능화 (사본이므로 안전). 단건 편집기 추가 | 선택 (UX) |

> store-library-feed/대시보드/import 계열은 **이미 PASS** 라 사본화 강제 WO 불필요. 가드성으로 feed에 origin allowlist 어서션 추가 정도는 선택.

---

## 7. 판정 요약

- FAIL-A (원본 직접 목록 노출): **없음**
- FAIL-B (QR 원본 참조): **코드 경로 존재 / 운영 데이터 0건** → 잠재 위험, 정책 결정 후 가드
- FAIL-C (보기 전용 원본 노출): **없음** (snapshot은 사본, 보기는 UX)
- HOLD: 운영자 content_hub QR broadcast 여부 (§4.4 결정 대상)
