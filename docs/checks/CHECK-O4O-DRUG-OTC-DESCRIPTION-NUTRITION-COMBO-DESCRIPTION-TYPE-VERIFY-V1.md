# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-DESCRIPTION-TYPE-VERIFY-V1

- 일자: 2026-07-09
- 모드: **read-only 검증** — DB write 0
- 배경: pull 로 병합된 `WO-O4O-PRODUCT-DESCRIPTION-TYPE-IMPLEMENTATION-V1`(commit `67d53eaa7`, 배포 2026-07-08)가 `shared_product_descriptions.description_type`(B2B/B2C/STORE/SUPPLIER_STORE) 축과 canonical 유니크 `(master_id)`→`(master_id, description_type)` 교체를 도입. 본 세션에서 승격한 영양제류 복합제 canonical 1,915행의 유형 취급 확인.

## 1. 모델 (병합분)
- 마이그레이션: `ADD COLUMN description_type VARCHAR(32) NOT NULL DEFAULT 'STORE'` → 기존 전량 STORE 백필. canonical partial-unique = `(master_id, description_type) WHERE status='canonical'`.
- **display 필터**: 소비자 storefront·태블릿·GP storefront·store-content 소스목록 canonical join 에 `AND description_type='STORE'` (store-public-utils L221/L497 등).
- 의미: **STORE = 매장용 대표설명**(소비자 매장 화면 노출). 영양제류 트랙은 `O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE`(매장용 설명서) → **STORE 가 정합**.

## 2. 프로덕션 검증 (read-only)

| 검사 | 결과 |
|------|------|
| description_type 컬럼 | 존재 / default `'STORE'` |
| 승격 1,915행(source_type=`mfds_drug_otc_nutrition_combo`) description_type | **전부 STORE** (1,915/1,915) |
| (master_id, STORE) canonical 중복(내 master) | **0** (신규 유니크 준수) |
| status='canonical' AND description_type='STORE' | **1,915 / 1,915** → display 노출 대상 |

## 3. 결론
- **STORE 유지가 맞다.** 승격 canonical 은 이미 전부 STORE 이고, 이는 매장용 설명서의 의도 및 display 필터와 정합. B2C/B2B 등 변경 불필요, **조치 없음**.
- 마이그레이션 백필(DEFAULT STORE) 및 raw SQL INSERT(컬럼 default STORE) 양쪽 경로 모두 STORE 로 귀결 — 삽입 시점과 무관하게 일관.

## 4. 잔여 참고 (비차단, 후속 시)
- promotion/vitc 스크립트의 재실행 idempotency 가드는 `NOT EXISTS(canonical, 타입 무관)` 이다. 현재 대상 master 의 기존 canonical 은 전부 STORE 라 안전(no-op). 향후 같은 master 에 **B2B/B2C canonical 이 생기면** 가드를 `description_type='STORE'` 한정으로 type-aware 하게 보정해야 STORE canonical 누락이 없다. (현 시점 불필요)
- Mg·B2·B6 액제(hold) 후속 승격 시에도 STORE 유형 적용.

## 5. DB write 0 확인
- SELECT only. shared_product_descriptions / draft / master 무변경.
