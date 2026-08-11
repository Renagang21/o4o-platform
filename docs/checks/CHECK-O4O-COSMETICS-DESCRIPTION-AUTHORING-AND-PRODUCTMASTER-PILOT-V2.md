# CHECK-O4O-COSMETICS-DESCRIPTION-AUTHORING-AND-PRODUCTMASTER-PILOT-V2

- **WO**: `WO-O4O-COSMETICS-DESCRIPTION-AUTHORING-POLICY-AND-PRODUCTMASTER-PILOT-V2`
- **선행**: `WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1` (`74657c931`) · `WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1` (`c100b6f71`)
- **일자**: 2026-08-11
- **판정**: **PASS** — 정책 폐기·재정의 완료, 파일럿 500 apply 및 postVerify 구조적 오류 0
- **산출물**: `tmp/cosmetics-productmaster-apply-pilot/*` · 정책문서 `docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md` §5-1

---

## 1. 정책 변경 (WO §2)

기존 "화장품 = O4O 직접 제작 금지 = 공급자 제작 영역" 규정을 **폐기**하고
`O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1` §5-1 에 공동 관리 정책을 신설했다.

| 항목 | 결과 |
|---|---|
| O4O 화장품 ProductMaster 신규 구축 | 허용 |
| O4O 화장품 설명서 최초 제작·수정·보완 | 허용 |
| 브랜드 보유 공급자의 자기 제품 등록·수정 | 허용 (기존 공급자 경로 재사용) |
| 공급자 연결 시 O4O 수정권 | **유지** — 연결이 O4O 권한을 제거하지 않는다 |
| 일반 판매자·매장의 원본 제품 수정 | 차단 (라우터 가드로 접근 불가) |

새 ownership 상태 머신·새 revision/history 시스템·별도 canonical 축을 만들지 않았다.
canonical 은 기존대로 `(master, descriptionType, 언어)` 당 1건이다.

## 2. 코드 정비 (WO §3)

| 대상 | 처리 |
|---|---|
| `CosmeticDescriptionBlockedError` / `COSMETIC_O4O_DESCRIPTION_BLOCKED` | 제거 |
| `isCosmeticMaster()` 및 `createCandidate`/`setCanonical` 의 규제유형 차단 | 제거 |
| 컨트롤러 403 분기 | 제거 |
| 주체 제한 | 라우팅 계층 기존 가드가 담당 — 변경 없음 |

주체 제한 근거(기존 구조 재사용, 신규 권한 코드 0):

| 주체 | 경로 | 가드 |
|---|---|---|
| O4O | `POST /api/v1/neture/product-masters/:id/store-descriptions` | `authenticate` + `requireRole(ADMIN_ROLES)` |
| 브랜드 보유 공급자 | `POST /api/v1/neture/supplier/store-descriptions` | `requireAuth` + `requireActiveSupplier` + `supplier_product_offers.supplier_id` 소유 검증 |
| 일반 판매자·매장 | — | 두 라우터 모두 진입 불가 |

`sourceType='supplier'` 이면 무조건 허용하는 식으로 넓히지 않았다.

## 3. 회귀 테스트 (WO §6)

`shared-product-description.cosmetic-guard.test.ts` → `shared-product-description.cosmetic-authoring.test.ts` (`git mv`) 로 새 정책에 맞춰 재작성. **7/7 PASS.**

화장품+O4O(manual) 허용 / 화장품+supplier 허용 / 출처 구분(`sourceType`·`createdBy`·`createdBySupplierId`) / seed 경로 회귀 없음 / `setCanonical` 허용 2건 / 삭제본 승격 거부 유지.

> 한계: 이 worktree 는 `pnpm install --frozen-lockfile` 이 workspace root 충돌로 거부되어 `node_modules` 가 없다.
> 저장소 전역 `tsc --noEmit` 은 `TS2688 (@types/node)` 로 **실행하지 못했다.** ts-jest 가 수정 대상 3개 파일을 컴파일해 테스트를 통과시켰고, 저장소 전역 grep 으로 잔여 `Cosmetic*` 참조 0건을 확인했다.

## 4. 구조 결론 재검증 (WO §7)

| 확인 | 결과 |
|---|---|
| `product_masters.regulatory_type` | `varchar(50) NOT NULL DEFAULT 'UNKNOWN'` — PG enum·CHECK 없음 → `COSMETIC` 즉시 사용 가능 |
| schema/migration | **불필요** |
| 별도 cosmetics 테이블 | **불필요** |

## 5. 비화장품 정제 (WO §8)

census 산출물에서 재현 가능하게 재도출했다.

| 항목 | 수 |
|---|---|
| 입력 후보 | 33,106 |
| 제외 | 432 |
| **화장품 확정** | **32,674** |

제외 규칙(중복 적용): X1 이너뷰티/건강기능식품/영양제 카테고리 380 · X2 문제 큐 `NON_COSMETIC_SUSPECT` 410 · X3 이름 일치 기존 master 가 비화장품 188.

선행 WO 의 "188 → 실질 재사용 0" 결론 재현: NOT_COSMETIC 186 / DIFFERENT_PRODUCT_SAME_NAME 1 / CHECK 1 / **SAME_PRODUCT_REUSE 0**.

## 6. 표본 500 (WO §9)

난수 없는 계통표본. `(productType, key)` 정렬 후 버킷별 추출 — 재실행 시 동일 결과.

버킷 GENERAL 298 / FUNCTIONAL_MATCHED 100 / ISSUE_QUEUE 100 / GENERAL_FILL 2 · 유형 47종 · 문제 큐 포함 287 · 기능성 보고 매칭 143.

## 7. dry-run (WO §9·§10) — 운영 DB write 0

dedupe 계약: `norm(brandName) | norm(canonicalProductName)` (공백·기호 제거 + 소문자화).
색상·용량·기획세트·바코드는 조건에 넣지 않았다. 이름만 같고 브랜드가 다르면 병합하지 않는다.

| 항목 | 값 |
|---|---|
| 대상 | 500 |
| 신규 master 예상 | 500 |
| 기존 재사용 예상 | 0 |
| CHECK | 0 |
| KO STORE canonical 신규 예상 | 500 |
| canonical 충돌 예상 | 0 |
| 표본 내부 중복 그룹 | 0 |
| 이름만 충돌 | 0 |
| 브랜드명 없음 | 0 |
| 비교 대상 기존 master | 61,948 (DRUG 제외) |

대량 중복·오병합 위험 없음 → WO §14 중지 조건 미해당.

## 8. apply (WO §11)

배치 태그 `tags->>'woBatch' = 'cosmetics-pilot-500-v2'` · 설명서 `source_type = 'o4o_cosmetics_retail'` (기존 `o4o_hff_generated` 선례를 따른 값 추가).

| 항목 | 값 |
|---|---|
| 계획 | 500 |
| 신규 ProductMaster | 500 (`regulatory_type='COSMETIC'`, category=화장품, `status='ACTIVE'`, `is_mfds_verified=false`) |
| 기존 재사용 | 0 |
| KO STORE canonical 생성 | 500 |
| canonical 충돌 | 0 (기존 canonical 은 덮어쓰지 않고 충돌 큐로 보내는 계약) |
| 실패 | 0 |

단위별 트랜잭션 · INSERT 전용(기존 master UPDATE 0).

**rollback**: `tags->>'woBatch'='cosmetics-pilot-500-v2'` 인 master 와 그 설명서만 삭제하면 원복된다 (`apply-result.json.rollback`).

## 9. postVerify (WO §12) — 구조적 오류 0

| 검증 | 결과 |
|---|---|
| 신규 master 실제 수 | 500 (전량 COSMETIC) |
| KO canonical 실제 증가 | 500 |
| ProductMaster 중복 (brand,name) | 0 |
| canonical 중복 | 0 |
| orphan 설명서 / 설명서 없는 master | 0 / 0 |
| 배치 밖 master 오연결 | 0 |
| 비화장품 COSMETIC 오등록 | 0 |
| DRUG 177,413 · 건강기능식품 40,948 · QUASI_DRUG 17,148 · MEDICAL_DEVICE 3,826 | drift **0** |

## 10. 검색 smoke (WO §13)

UI 신규 개발 없이 기존 조회 축으로 확인했다.

| 축 | 결과 |
|---|---|
| 브랜드+상품명 | 1건 (정확 매칭) |
| 상품명 단독 | 1건 |
| `regulatory_type='COSMETIC'` master 조회 | 500 |
| KO STORE canonical 설명서 조회 | 본문 220자 + summary 정상 |

## 11. 문제 큐 (`issue-queue.json`)

| 구분 | 수 |
|---|---|
| A 정제 판정 보류 (CHECK / DIFFERENT_PRODUCT_SAME_NAME) | 2 |
| B dry-run CHECK | 0 |
| C apply 충돌·실패 | 0 |
| D 적용분 설명서 결손 | 287 |

D 결손 내역: `NO_OBSERVED_FEATURE` 181 · `TYPE_NAME_MISMATCH` 154 · `PRODUCT_TYPE_UNDETERMINED` 3 · 기타 3 / 필드 기준 `mainFeatures` 181 · `usage` 5 · `productType` 4.
WO §14 상 설명서 feature 부족은 중지 사유가 아니다 — 후속 보완 대상이다.

## 12. 다음 단계

1. 잔여 32,174건(32,674 − 500) 전량 apply — 같은 파이프라인 재실행으로 가능(배치 태그·재실행 skip 내장).
2. D 결손 287건 유형의 보완 저작(`mainFeatures` 결손이 최다).
3. 공급자 측 화장품 등록·수정 경로 실브라우저 smoke (이번 WO 는 계약·회귀 테스트까지).
