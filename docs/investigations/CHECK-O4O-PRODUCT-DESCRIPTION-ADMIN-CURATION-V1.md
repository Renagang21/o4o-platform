# CHECK-O4O-PRODUCT-DESCRIPTION-ADMIN-CURATION-V1

> **작업명:** WO-O4O-PRODUCT-DESCRIPTION-ADMIN-CURATION-V1
> **유형:** 관리자 정비 최소 UI (web-neture admin). 기존 backend API **재사용**(무변경).
> **결과: PASS — web-neture `AdminMasterManagementPage` 에 "상품설명 정비" 모달 추가. masterId 후보 조회/seed/대표지정/상태변경/삭제. 기존 admin API 재사용(backend 변경 0). 매장별 override/selection·bulk seed·AI batch·자동 canonical 미도입. web-neture typecheck 0.**
> 선행: SHARED-CANDIDATE-STORAGE · CANONICAL-OUTPUT-LINK · CANDIDATE-SEED — 2026-06-16

---

## 1. 수정/추가 파일 (4 + CHECK)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/lib/api/sharedProductDescription.ts` | **신규** API client(listByMaster/getCanonical/seed/setCanonical/setStatus/remove) + 타입 |
| `services/web-neture/src/lib/api/index.ts` | export 추가 |
| `services/web-neture/src/pages/admin/ProductDescriptionCurationModal.tsx` | **신규** 정비 모달 |
| `services/web-neture/src/pages/admin/AdminMasterManagementPage.tsx` | row "설명 정비" 버튼 + 모달 state/render |
| `docs/investigations/CHECK-O4O-PRODUCT-DESCRIPTION-ADMIN-CURATION-V1.md` | 본 CHECK |

> **backend 변경 0** — 기존 `/api/v1/admin/shared-product-descriptions` API 그대로 사용(storage/seed WO 에서 도입). route/entity/migration/service 무변경.

## 2. UI 배치 (§5.2 권장 채택)

- 별도 대형 메뉴/대시보드 신설 **안 함**. 기존 **ProductMaster 관리 화면**(`AdminMasterManagementPage`)의 상품 행에 **"설명 정비" 버튼** → master 컨텍스트 모달.
- 상품설명 후보는 상품 단위 정비가 자연스럽다는 §5.2 근거 반영(특정 상품 보며 후보 비교·대표 지정).

## 3. 모달 기능 (§6)

- **후보 목록**: 상태 badge(대표/후보/검토필요/숨김/폐기) + 출처(공급자/AI/의약품정보 등) + summary/본문 preview + 수정일.
- **Preview 안전(§6.2/§7.3)**: content HTML → `toPlainText`(태그 제거) plain text 표시. **`dangerouslySetInnerHTML` 미사용**, raw HTML 실행 없음.
- **Action**:
  - **대표로 지정** → `PATCH /:id/canonical`(전용 endpoint). **확인 모달**("대표 지정 시 상품 상세 노출") 후 실행.
  - **상태 변경** select → `PATCH /:id/status`(candidate/needs_review/hidden/deprecated만, **canonical 제외**).
  - **삭제** → `DELETE /:id`(soft, 확인 모달).
- **Seed**: "기존 설명에서 후보 가져오기" → `POST /by-master/:id/seed`(기본 supplier/ai/drug_extension, autoCanonical 미전송). 결과 `생성 n / 건너뜀 n` notice. **단일 master만**(bulk 버튼 없음).

## 4. canonical 1개/master 보장 (§7.1)

- 대표 지정은 **전용 `setCanonical` endpoint**만 사용(service transaction + partial unique index).
- status 변경 UI 는 **canonical 을 선택지에서 제외**(`ASSIGNABLE` = candidate/needs_review/hidden/deprecated) → 일반 status 경로로 canonical 직접 지정 불가. backend `PATCH /status` 도 canonical 거부(storage WO). 이중 차단.

## 5. 권한 (§4)

- API 는 backend `requireRole(admin/operator)` guard 그대로 → web-neture(admin.neture.co.kr) 운영자/관리자만. **매장 경영자 UI 아님**(해당 모달은 neture admin 앱에만 존재).

## 6. 불변 / 미도입 확인 (§8)

- 매장별 override 저장소 / selection table **미도입**.
- AI batch 정비 / 자동 canonical 지정 / 전체 bulk seed / 후보 자동 병합 / 유사도 계산 **미도입**.
- product_ai_contents 직접 노출 **없음**(seed 후보로만, ai 후보도 canonical 승격 후에만 상품 상세 노출).
- 상품 상세 output path / KPA link / HTML rich rendering 정책 **미변경**.
- backend 변경 **0**.

## 7. 검증

- **web-neture typecheck PASS** (`tsc --noEmit` → EXIT 0).
- API client: baseURL `/api/v1` + BASE `/admin/shared-product-descriptions`, 응답 `res.data.data` (기존 neture admin client 패턴 동일).
- **브라우저/DB sanity 미수행** — `shared_product_descriptions` migration 은 배포 시 CI/CD 자동. 배포 후 권장(§9 흐름):
  1. 상품 행 "설명 정비" → 모달 → "후보 가져오기"(seed) → supplier/ai/drug_extension 후보 표시
  2. 후보 "대표로 지정" → 확인 → canonical 반영, 기존 canonical 자동 강등
  3. GP 상품 상세 description = 새 canonical(태그 제거) 반환(output-link WO)
  4. 매장 경영자 권한 → API 403
  ```sql
  SELECT master_id, COUNT(*) FROM shared_product_descriptions
  WHERE status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING COUNT(*)>1;  -- 0
  ```

## 8. 완료 판정

**PASS.** 관리자가 masterId별 후보 조회/seed/대표지정/상태변경/삭제 가능, canonical 1개/master 유지(전용 endpoint + status에서 canonical 제외), 매장별 override/selection·bulk seed·AI batch·자동 canonical 미도입, 기존 API 재사용(backend 0), typecheck 통과. 배포 후 브라우저 sanity 권장(§7).

## 9. 후속 WO

1. `WO-O4O-PRODUCT-DESCRIPTION-HTML-RENDERING-POLICY-V1` — content HTML sanitize/리치 렌더(정비 preview + 상품 상세 모두).
2. `WO-O4O-KPA-STOREFRONT-DESCRIPTION-LINK-V1` — KPA storefront canonical 연결.
3. (소) `WO-O4O-PRODUCT-DESCRIPTION-GUIDE-NOTICE-V1` — 매장 상품설명 화면 안내 문구.
4. (선택) `WO-O4O-PRODUCT-DESCRIPTION-CANDIDATE-BULK-SEED-V1` — 조건별 seed 도구.

---

*Date: 2026-06-16 · 상품설명 관리자 정비 UI · PASS · web-neture AdminMasterManagementPage "설명 정비" 모달(후보 조회/seed/대표지정/상태/삭제), plain-text preview, canonical 전용 endpoint+status 제외 이중 차단 · 기존 backend API 재사용(0) · 매장별 override/bulk/AI batch 미도입 · typecheck 0 · 후속 HTML 렌더 정책/KPA link.*
