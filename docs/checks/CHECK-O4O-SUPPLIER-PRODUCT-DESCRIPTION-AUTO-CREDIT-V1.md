# CHECK-O4O-SUPPLIER-PRODUCT-DESCRIPTION-AUTO-CREDIT-V1

> **작업명:** 공급자 제작 상품 설명서 하단 "제작원(업체명·공개 연락처)" 자동 표시
> **유형:** API read model 확장 + 프론트 렌더 (migration 0 / DB write 0)
> **결과: PASS (구현·단위테스트·타입체크)** — 공급자 제작(source_type='supplier') 설명서에만 조직 등록정보에서 제작원을 렌더 시 조회해 최하단에 표시. 본문 HTML 미저장, 공개 연락처만, 비정상 데이터/비로그인은 미표시. 배포·프로덕션 smoke 는 아래 §배포 참조.
> **선행:** `WO-O4O-PRODUCT-DESCRIPTION-AUTH-GATE-AND-RETURNURL-V1` (커밋 `7d19c1412`, 로그인 전용 설명서 접근) · `WO-...-STORE-DESCRIPTION-ENTRY-AND-ONBOARDING-V1` (`a58b95175`)
> **작성일:** 2026-07-12 · 기준 HEAD `45e9f0c15`

## 1. 시작 시 상태 / 기존 작업 진행 여부

- 시작 시 `git status`: 미커밋 3파일이 존재(다른 세션의 활성 WIP로 판정된 것).
  - `M apps/api-server/src/modules/neture/services/product-landing.service.ts`
  - `M apps/api-server/src/modules/neture/services/__tests__/product-landing.auth-gate.test.ts`
  - `M services/web-neture/src/pages/ProductLandingPage.tsx`
- 기존 커밋: auth-gate(`7d19c1412`)·supplier store entry(`a58b95175`) 는 커밋·push 완료. **AUTO-CREDIT 는 커밋되지 않음**(HEAD 코드에 `supplierCredit`/`제작원` 0건 확인).
- 판정: **미완료 WIP**. runbook 원칙대로 WIP 를 버리지 않고 검증·완성·커밋한다(중복 재구현 아님).

## 2. 공급자 콘텐츠 식별 체인 (실제 코드 재검증)

```
shared_product_descriptions.source_type = 'supplier' + source_ref_id
  → supplier_product_offers.id (@Entity('supplier_product_offers'), PK id)
  → supplier_product_offers.supplier_id
  → neture_suppliers.id → neture_suppliers.organization_id
  → organizations.id → organizations.name / "isActive"
  → neture_suppliers.contact_phone / contact_email (+ *_visibility)
```

- `SUPPLIER_STORE` 등 타입이 정의돼 있어도 실제 write 경로가 아니라, **source_type='supplier'** 인 실데이터 경로만 판정 기준으로 사용.

## 3. 사용한 필드 / visibility 규칙

- 업체명: `organizations.name` (camelCase quoted 스키마 — `o."isActive"` 로 활성 확인).
- 연락처: `neture_suppliers.contact_phone` / `contact_email` + `contact_phone_visibility` / `contact_email_visibility`.
- **공개 허용만 표시**: `ContactVisibility.PUBLIC = 'public'` 인 항목만. 전화(공개) 우선 → 이메일(공개) → 둘 다 비공개면 `contact=null`(문의 행 생략).
- 개인 담당자 정보(`settlement_contact_*`)는 사용하지 않음.

## 4. API 응답 구조

```jsonc
// PublicProductLanding
"supplierCredit": { "organizationName": "주식회사 예시공급자", "contact": "02-000-0000" } | null
```

- `ProductLandingService.resolveSupplierCredit(sourceType, sourceRefId)` 가 렌더 시 조회. 본문 HTML 에 문자열 미저장.
- 계산 위치: 로그인·비차단 경로에서 SPD 조회 직후. **비로그인(authRequired) / no-landing / exposure-blocked 경로는 `supplierCredit: null`** 로 조기 반환 → credit 미노출(auth 회귀 방지).

## 5. 렌더링 위치 / 표시 규칙

- `ProductLandingPage.tsx` 설명서 최하단, `O4O · neture.co.kr` 문구 위. 상단 경계선 + 작은 회색 텍스트(`text-xs text-gray-500`), 광고 강조 아님, 모바일 가독.
- `콘텐츠 제작: {업체명}` (필수) / `문의: {공개 연락처}` (없으면 행 생략).

## 6. 비적용 콘텐츠 검증

- operator(O4O 공통) · store_contribution(매장 자체) · 깨진 체인 · 비활성 조직 · 조직명 없음 → 전부 `supplierCredit=null` (단위테스트로 검증). 상품 카테고리로 판단하지 않음.

## 7. 비정상 데이터 처리

- supplier 인데 source_ref_id 없음 / offer·supplier·org 부재 / 비활성 / 이름 없음 / 연락처 없음·비공개 → 본문은 정상, credit 만 생략.
- 쿼리 실패는 try/catch → `logger.warn` 서버 로그만, 소비자 화면 오류 미노출.

## 8. migration / DB write

- **migration 0 · DB data write 0 · 신규 입력 UI 0 · 설명서 본문 수정 0 · QR 재발급 0.** 기존 연결 체인만으로 식별 가능(추가 메타데이터 불요).

## 9. 인증 정책 회귀 (유지 확인)

- 비로그인: 본문·`supplierCredit` 모두 미노출(단위테스트 "비로그인 공급자 설명서 → 본문·credit 모두 없음" PASS). returnUrl / no-store,private / Vary: Authorization / URL·landing key·기본 QR 불변(선행 WO 코드 미변경).

## 10. 검증 결과 (test / typecheck / build)

- **단위테스트**: `jest product-landing.auth-gate` — **14/14 PASS** (auth 5 + supplier credit 9: 공개이메일→credit / 전화우선 / 공개연락처없음→null / operator→null / store_contribution→null / 깨진체인 / 비활성조직 / 조직명없음 / 비로그인→본문·credit 없음).
- **타입체크**: `tsc -p services/web-neture` — **PASS(0)**. `tsc -p apps/api-server` — 본 WIP 파일(product-landing/neture) **오류 0**. (전체 실패는 무관한 선행 `src/scripts/drug-otc-nutrition-combo-*.ts` 중복선언 오류뿐 — 다른 에이전트 영역, 본 WO 미개입·미수정.)
- build: 별도 프로덕션 build 미실행 — 양 프로젝트 typecheck + 단위테스트로 타입/로직 게이트 충족. CI 가 push 시 build 수행.

## 11. 배포 / 프로덕션 smoke

- **커밋/푸시**: `37f7f83e4` → origin/main (fast-forward, 무관 커밋 미혼입).
- **배포(2026-07-12)**: `Deploy API Server (Cloud Run)` run `29183079296` **success** (supplierCredit read model), `Deploy Web Services (Cloud Run)` run `29183079326` **success** (ProductLandingPage 렌더). 양쪽 라이브.
- **프로덕션 UI smoke**: **보류(deferred)** — credit 표시 경로는 (1) 로그인 + (2) `source_type='supplier'` 인 실제 공급자 작성 STORE 설명서의 `/p/:key` 두 조건이 동시에 필요하다. 현재 즉시 가리킬 수 있는 실 공급자 설명서 landing 이 확인되지 않았고, runbook §14 원칙(실데이터 없으면 운영 데이터 임의 생성 금지)에 따라 임의 생성하지 않는다. 기능 정합은 전 분기(공개연락처/우선순위/비적용/깨진체인/비활성/이름없음/비로그인) 를 덮는 **단위테스트 14/14 PASS** 로 확보. 실 공급자 설명서가 존재하면 해당 `/p/:key` 에서 (a)비로그인 본문·credit 미노출 (b)로그인 후 하단 업체명 (c)공개 연락처만 (d)기존 URL·QR 불변 을 확인할 것. (본 저장소의 "defer live UI smoke" 기록 관례와 동일.)

## 12. 후속 gap

- 작성주체 메타데이터 보강: `SUPPLIER_STORE` 등 write 경로가 신설되면 식별 기준 확장 필요할 수 있음 → 별도 WO(`SPD author/subject metadata`, IR `1ebb3e51e`)와 연계.
- 동일 read model/renderer 를 쓰는 태블릿·POP·QR 이 있으면 자동 반영되나, 별도 구조는 본 WO 범위 외(후속 평가).

## 13. 완료 판정

**PASS (구현·단위테스트·타입체크).** 공급자 제작 설명서에만 조직 등록정보 기반 제작원을 렌더 시 조회해 최하단에 표시. 본문 미저장·공개 연락처만·비정상/비로그인 미표시, migration/DB write 0, 인증 회귀 없음. 배포·프로덕션 smoke 는 §11 에 후속 기록.
