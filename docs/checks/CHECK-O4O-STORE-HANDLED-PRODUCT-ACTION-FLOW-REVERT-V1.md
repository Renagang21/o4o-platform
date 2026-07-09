# CHECK-O4O-STORE-HANDLED-PRODUCT-ACTION-FLOW-REVERT-V1

Status: **DONE** — 코드 제거(`4784f8a0f`) + typecheck 통과 + 배포(API+Web success) + 프로덕션 smoke PASS (2026-07-09)
WO: `WO-O4O-STORE-HANDLED-PRODUCT-ACTION-FLOW-REVERT-V1`

## 목적
매장 경영활용 제품(`/store/handled-products`)에서 과도하게 확장된 **설명서 선택 저장** 방향을 폐기하고, **Action Flow**(상품 선택 → 작업으로 이동)로 되돌린다.

## 조사 결과 (되돌리기 대상 실태 — 삭제 전 확인)
| 폐기 대상 | 실제 상태 |
|------|------|
| ② 범용 Product Resource Selection Framework | **코드에 존재한 적 없음**(제안 단계). `resource-selection`/`ResourceSelectionFramework`/`ProductResourceSelection` 전부 무결과 → 코드상 되돌릴 것 없음, 문서로 폐기 명시만. |
| ① Description Selection Table + 저장 모델 (`store_product_description_selections`) | **배포됨** — GET/PUT `/handled-products/:id/description-selections` + 모달 + 등록 시 자동선택 INSERT. |
| ③ 설명서 기본 선택 저장 | = ① |

**핵심 근거**: `store_product_description_selections` 를 **읽어서 소비하는 코드가 하나도 없음**(태블릿/QR/공개 렌더 어디도 선택을 참조 안 함 — SELECT 1곳은 모달 자기 조회뿐). 저장만 되고 다운스트림에서 안 쓰이던 **dead model** → 제거해도 고객 화면 회귀 0.

## 폐기한 설계 (제거)
- backend `store-handled-products.routes.ts`: `GET/PUT /handled-products/:id/description-selections`, `buildSelectionView`/`resolveOwnedListing`/`resolveOrgOrRespond` 헬퍼, `SELECTABLE_DESCRIPTION_TYPES`/`DESCRIPTION_TYPE_LABEL` 상수 제거.
- backend `store-product-library.controller.ts`: 상품 등록 시 STORE canonical 설명서 자동선택 INSERT 제거.
- web `StoreHandledProductsPage.tsx`: 행 "사용 설명서" 액션·모달 렌더·`descTarget`·`descBtn`·`FileText` import 제거.
- web `DescriptionSelectionModal.tsx`: 파일 삭제.
- web `handledProducts.ts`: `fetchDescriptionSelections`/`saveDescriptionSelections`/`requestWithBody`/selection 타입 제거.

## 유지한 설계
- `description_type` (STORE / SUPPLIER_STORE / B2B / B2C)
- Product Resource Baseline (ProductMaster ← Product Resource ← Store Production Material)
- Review Queue (+ SPD 소스)
- **"다국어 QR" Action**(WO가 유지하려는 Action Flow 패턴), "O4O 상세설명 가져오기"(별개 기능)

## Action Flow (현재)
매장 경영활용 제품 행 → **O4O 상세설명 가져오기 / 콘텐츠 만들기 / 다국어 QR / 관리**. (설명서 선택 저장 액션 제거됨.)

## DB
- `store_product_description_selections` 테이블은 **DROP하지 않음** — 코드 참조 0으로 orphan 무해. 프로덕션 테이블 DROP 은 승인·마이그레이션 사안(CLAUDE.md)이므로 **별도 승인 단계로 분리**. migration 0.

## 검증
- typecheck PASS: api-server(내 변경 파일 clean), web-kpa-society(noUnusedLocals ON 통과).
- 배포: Deploy API Server / Deploy Web Services 모두 success.
- 프로덕션 smoke(kpa-society.co.kr /store/handled-products): 뇌선·타이레놀 두 행 모두 **"사용 설명서" 액션 사라짐**, 나머지 액션(가져오기/콘텐츠/다국어 QR/관리) 정상, 화면 회귀 없음.
- DB write 0 · ProductMaster 무변경.

## 후속 작업 (Action 단위 독립 WO)
- `WO-O4O-STORE-HANDLED-PRODUCT-DESCRIPTION-VIEW-V1` — 설명서 **조회 전용** Action(선택·저장 아님).
- `WO-O4O-STORE-HANDLED-PRODUCT-POP-CREATE-V1`
- `WO-O4O-STORE-HANDLED-PRODUCT-QR-CREATE-V1`
- `WO-O4O-STORE-HANDLED-PRODUCT-VIDEO-CREATE-V1`

> API 컨벤션: "Action"은 UI 개념으로 두고, API는 리소스 생성/조회 중심(`GET .../:id/description`, `POST .../:id/pop|qr|video`)으로 유지(사용자 권고 반영).
> (참고) `store_product_description_selections` 테이블 실제 DROP 은 승인 후 별도 cleanup migration.
