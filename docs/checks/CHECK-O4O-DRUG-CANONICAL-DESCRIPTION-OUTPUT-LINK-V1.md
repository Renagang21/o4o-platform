# CHECK-O4O-DRUG-CANONICAL-DESCRIPTION-OUTPUT-LINK-V1

> **작업명**: WO-O4O-DRUG-CANONICAL-DESCRIPTION-OUTPUT-LINK-V1
> **일자**: 2026-07-04 · **성격**: canonical 공식 설명 **조회/노출 연결**. 새 데이터 생성 0, migration 0. `product_masters` 등 Core 테이블 변경 0.
> **선행**: `CHECK-O4O-DRUG-SHARED-DESCRIPTION-BULK-CANONICAL-APPLY-V1`(canonical 15,962 승격), `CHECK-O4O-DRUG-SHARED-DESCRIPTION-CANONICAL-CURATION-V1`(설명 검토 화면).
> **목적**: 승격된 canonical 설명(15,962)을 ProductMaster 상세 조회 API + admin UI 에서 노출.

---

## 1. 한 줄 결론

**ProductMaster 상세(`GET /neture/products/library/:id`) 응답에 `canonicalDescription`(status='canonical' 공식 설명) 을 연결하고, admin O4O 상품 DB 기본상품 상세에 "공식 소비자 설명" 섹션을 추가했다. is_canonical 컬럼은 없어 `status='canonical'` 기준을 쓰며, needs_review 는 자동 제외. Core 테이블 변경 0.**

---

## 2. 조사 핵심 (스키마 실측)

- ⚠️ **`shared_product_descriptions` 에 `is_canonical` 불린 컬럼 없음.** WO 초안의 `is_canonical=true` 대신 **`status='canonical'`**(varchar) 이 실제 조건. → 구현은 status 기준.
- canonical partial unique = master 당 1개 → 정상은 1건. 방어적으로 `LIMIT 2` + 2건 이상 시 `logger.warn` + 최신 1건 반환.
- ProductMaster 상세 = `product-library.controller.ts` `GET /products/library/:id` (`netureService.getProductMasterById` + `dataSource.query`).
- **RepresentativeProduct 전용 상세 엔드포인트/화면 부재** → 대표상품 상세 보강은 N/A. 대표 canonical = anchor master 의 canonical 이며 master 상세로 도달 가능(대표상품 canonical 저장소 신설 안 함, WO 원칙 준수).
- 목록 응답에는 content 미탑재(WO §3 선택 항목 — 이번 범위 제외).

---

## 3. 구현 (commit `c418650aa`)

**백엔드** `apps/api-server/src/modules/neture/controllers/product-library.controller.ts`:
```sql
SELECT id, source_type, source_ref_id, content, summary, status, curated_at, updated_at
  FROM shared_product_descriptions
 WHERE master_id = $1 AND status='canonical' AND deleted_at IS NULL
 ORDER BY updated_at DESC LIMIT 2
```
- 응답 `data.canonicalDescription` = `{ id, sourceType, sourceRefId, content, summary, status, isCanonical:true, curatedAt, updatedAt }` 또는 `null`.
- 2건 이상 → `logger.warn` + 최신 1건.

**프론트** `apps/admin-dashboard`:
- `o4o-product-db.api.ts`: `CanonicalDescription` 타입 + `ProductMasterDetail.canonicalDescription`.
- `ProductMasterDetailPage.tsx`: **"공식 소비자 설명"** 섹션 — canonical 배지, 출처 표기(`mfds_easy_drug` → "식품의약품안전처 e약은요"), "매장용 AI 설명이 아닌 공식 소비자 설명" 문구, content HTML 렌더, 없으면 "공식 설명 없음".

---

## 4. 응답 필드 구조

```ts
// GET /api/v1/neture/products/library/:id → data.canonicalDescription
canonicalDescription: {
  id: string;
  sourceType: string;      // 'mfds_easy_drug'
  sourceRefId: string | null;
  content: string;         // HTML (sanitize-on-write 저장분)
  summary: string | null;
  status: string;          // 'canonical'
  isCanonical: true;
  curatedAt: string | null;
  updatedAt: string;
} | null
```

---

## 5. 검증

**운영 DB read-only** (기대 canonical = 15,962):
```sql
SELECT count(*) FROM shared_product_descriptions
 WHERE source_type='mfds_easy_drug' AND status='canonical' AND deleted_at IS NULL;  -- 15,962
```
- (앞 WO §4 에서 canonical 15,962 확인 완료.)

**API live check** (배포 후):
- `GET /api/v1/neture/products/library/:id` — 인증 없이 401(라우트 존재), 404 아님.
- (인증) canonical 보유 master → `canonicalDescription != null`; needs_review 만 있는 master(다제조사 3,469 소속) → `null`. status 필터가 needs_review 를 자동 제외.

**typecheck**: 백엔드 tsup + `tsc --noEmit`(product-library 무에러), 프론트 `tsc --noEmit` 0 에러.

> **테스트 하니스 주석**: 이 영역(product-library/shared-product-description 컨트롤러) 은 repo 에 통합테스트 하니스가 없다(기존 테스트는 drug-import 순수 서비스 단위테스트뿐). 컨트롤러 mock 통합테스트를 신설하기보다, **status 필터의 needs_review 자동 제외(구조적 보장) + typecheck + live API/SQL 검증**으로 확인. 별도 테스트 하니스 도입은 후속.

---

## 6. 준수 확인

| 항목 | 결과 |
|---|---|
| ProductMaster/Identifier/Representative/Image 변경 | **0** (조회만) |
| StoreLocalProduct/Offer/Listing/AI 설명 생성 | 0 |
| 대량 canonical apply / migration | 0 |
| canonical 설명을 StoreLocalProduct/매장설명으로 복사 | 0 (조회 노출만) |
| needs_review 출력 제외 | ✅ (status='canonical' 필터) |
| 병렬 세션 파일 수정 | 0 |

---

## 7. 완료 기준 대비

| 기준 | 상태 |
|---|:---:|
| ProductMaster 상세에서 canonical 설명 조회 | ✅ (`canonicalDescription`) |
| RepresentativeProduct 상세 canonical 참조 | N/A (rep 상세 부재) — master 상세로 대체 |
| needs_review 출력 제외 | ✅ |
| admin 화면 공식 소비자 설명 확인 | ✅ (배포 후) |
| Core 테이블 생성/변경 없음 | ✅ |
| 백엔드 테스트 | ⚠️ 하니스 부재 → typecheck+live 검증(§5 주석) |
| 프론트 typecheck | ✅ 0 에러 |
| API/admin 배포 | ✅ (deploy-api + deploy-admin) |
| CHECK/commit/push | ✅ |

---

## 8. 다음 작업

1. **다제조사 3,469 수동 큐레이션** — 단건 setCanonical 후 이 상세에도 자동 노출.
2. **canonical → 매장용 AI 설명 생성 메뉴** — canonical 공식 설명을 입력값으로 매장 설명 초안 생성(별도).
3. QR/상품진열 화면에서 canonical/매장 설명 선택 노출.
4. (선택) 목록 API `hasCanonicalDescription` 플래그 + 컨트롤러 통합테스트 하니스.

---

**최종: canonical 공식 설명 15,962 를 상품 상세 조회/화면에 연결. Core 불변, 조회 노출만.** 2026-07-04 · serviceKey·비밀 미출력.
