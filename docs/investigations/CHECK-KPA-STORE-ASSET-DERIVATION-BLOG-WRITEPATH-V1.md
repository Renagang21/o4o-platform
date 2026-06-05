# CHECK-KPA-STORE-ASSET-DERIVATION-BLOG-WRITEPATH-V1

> **완료 고정 (PASS).** 블로그 작성 시 원본(source)→`blog_post` derivation 기록. 기준 IR `IR-KPA-STORE-ASSET-DERIVATION-BLOG-SOURCE-CONTRACT-V1`(`c8225a441`).

- **작성일**: 2026-06-05
- **commit**: `b955a09b4` — `feat(kpa): record blog derivations from source items`
- **배포**: Deploy API Server + Web(KPA) **success** (GP/KCos/Neture skipped)

---

## 1. 최종 판정 — PASS ✅

내 자료함 → 제작 시작 → 블로그 작성 흐름에서 `store_asset_derivations`에 `blog_post` 관계가 기록되고, read endpoint에서 정상 조회됨(boundary 일치). 신규 DB/migration 없음, 기존 동작 100% 유지.

---

## 2. 근본 원인/수정 요약
- 직전 deferral 사유(boundary·source 전달)가 IR에서 해소됨: blog `store_id`=`organizations.id`=derivation `organization_id`(일치), source는 canonical `production.source.items` 재사용.
- 백엔드 blog create에 optional `sourceItems` 수신 → best-effort `recordDerivations(blog_post, organization_id=pharmacy.id)`. 프론트가 최초 create에 1회 전달.

## 3. 수정 파일 (4)
- `apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts` (optional sourceItems + record)
- `services/web-kpa-society/src/api/blogStaff.ts` (createBlogPost optional sourceItems)
- `services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx` (source 보존 → create 전달)
- `services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx` (블로그 진입 canonical shape 정합)

## 4. source_kind 매핑
snapshot→`content_snapshot` / direct→`content_direct` / library→`store_execution_asset`

---

## 5. Shared Module Change Verification (O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1 §10)

### Changed shared module
`blog.controller.ts` (serviceKey 파라미터로 KPA/GlycoPharm 공유), `store-asset-derivation.service`(공통).

### Consumer impact matrix
| 소비처 | blog.controller | optional sourceItems 영향 | 결과 |
|--------|:---------------:|---------------------------|------|
| KPA-Society (`kpa`) | ✅ | 본 작업 대상(프론트 forwarding) | 기록됨 |
| GlycoPharm (`glycopharm`) | ✅ | **없음** — additive optional, 미전달 시 기존 동작. 프론트 미연동 | 무영향 |
| K-Cosmetics | △ | **없음**(미전달) | 무영향 |
| Neture | 미사용 | 없음 | 무영향 |
| derivation read endpoint | 공통 | blog_post 조회(org 격리 동일) | 정합 |

### Route / role / capability check
- route/role/capability 변경 없음. blog staff 가드(requireAuth + verifyOwner) 불변.
- boundary: blog `store_id`=`organizations.id`=read endpoint `req.organizationId` → 기록·조회 일치(실측).

### Smoke result (production)
- blog create + `sourceItems` → **201**, derivation `content_direct → blog_post`(sourceTitle 정상, serviceKey=`kpa`) 기록 ✅
- read endpoint `?derivedKind=blog_post&derivedId=...` → 조회 1행 ✅ (boundary 일치 증명)
- 기존 블로그 생성(sourceItems 없음)/수정/발행/삭제 회귀 없음 (optional, 코드 분기상 미기록)
- API TypeScript / KPA web TypeScript / build: PASS
- 검증용 blog + direct content 정리 완료(200/200). blog_post derivation 1행 잔존(삭제 endpoint 미구현 — 설계상 후속).

---

## 6. 변경하지 않은 항목
DB/migration / blog hard delete 정책 / 저장소 통합 / QR relation write-path / derivation viewer / GP·KCos 프론트 / Home·HeroBanner·StoreSidebar·storeMenuConfig·menuCapabilityMap.

## 7. 후속
1. **QR/blog relation viewer 확장** (POP 전용 "원본 보기"를 derivedKind 파라미터화 → QR/블로그 행).
2. relation cleanup/delete policy, GCS orphan cleanup, 사이니지 relation.
3. **IR-O4O-STORE-ASSET-DERIVATION-CROSSSERVICE-COMMONIZATION-V1** (GP/KCos 확장).

*KPA relation write-path = POP + QR + 블로그 완료. 다음은 viewer 확장 → cross-service IR.*
