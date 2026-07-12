# CHECK-O4O-STORE-DESCRIPTION-COSMETIC-WRITE-GUARD-AND-DOC-ALIGN-V1

> **작업명:** 화장품 O4O 공통 설명서 write 서버 가드 + 건기식·일반식품 Active 문서 정비
> **유형:** Track A 서버 write 가드(코드) + Track B 문서 정비 (migration 0 / DB write 0)
> **결과: PASS (구현·단위테스트·타입체크·문서)** — 화장품 ProductMaster 에 O4O 공통(비-supplier) STORE 설명서 신규 생성·canonical 승격을 서버 write 계층에서 차단하고, 공급자·건기식·일반식품 경로는 무영향으로 유지. 건기식/일반식품 Active 문서의 정책 충돌(M2~M5) 정리.
> **기준 정책(SSOT):** `docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md` §5(화장품=O4O 미제작)
> **선행 조사:** `IR-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1`(G6 가드 gap, M1~M5)
> **작성일:** 2026-07-12 · 기준 HEAD `2a23805ac`

## 0. 시작 상태 / 다른 세션 WIP

- 시작 시 `git status` clean(HEAD==origin/main `2a23805ac`), 다른 세션 미커밋 파일 없음. (WO §3 확인)
- 미접촉 영역(다른 세션): SPD author metadata / supplier auto-credit / product landing auth / tablet / drug-otc — **본 WO 미개입.**

---

# Track A. 화장품 O4O 공통 설명서 write 가드

## 1. 조사한 write 경로 (전수)

- **SPD write 서비스** `SharedProductDescriptionService.createCandidate` / `setCanonical` 의 실제 호출처: **① generic admin** `product-master-description.controller.ts`(sourceType='manual') + **② 서비스 내부 seed 메서드**(seedFromSupplierOffers='supplier' / seedFromAi='ai' / seedFromDrugExtension='drug_extension'). seed 메서드는 **외부 호출처 0**(현재 미사용).
- `csv_import`(supplier-product) / `store_web`(store-product-request) / `mobile_draft`(mobile-draft) 는 **다른 서비스**(`ProductCandidateService`, `product_candidates` 테이블) → SPD 가 아니므로 본 가드 무관.
- 직접 `INSERT INTO shared_product_descriptions` 3곳(easy-drug derive + drug-otc 스크립트 2)은 전부 **drug/HFF**, 화장품 대상 아님.
- **결론**: 화장품 SPD write 의 유효 진입점 = generic admin 컨트롤러(O4O 직접 저작). 여기가 IR G6 가드 gap.

## 2. 화장품 분류 기준 (실제 ProductMaster 필드)

- `regulatory_type = 'COSMETIC'` (상품 등록 시 카테고리 매핑 [`store-product-request-admin.service.ts:41`](../../apps/api-server/src/modules/neture/services/store-product-request-admin.service.ts)) **또는**
- `category_id → product_categories.slug = 'cosmetics'`(자기 또는 부모 카테고리; `cos-basic/color/functional` 자식 포함).
- 상품명·문자열 추정 미사용(WO §5 준수).

## 3. 적용한 서버 가드 (계층·이유)

- 위치: 공통 서비스 계층 `SharedProductDescriptionService` (WO §6 — 프론트 숨김 아님, 공통 service 우선).
  - `createCandidate`: `sourceType !== 'supplier' && isCosmeticMaster(masterId)` → `CosmeticDescriptionBlockedError`.
  - `setCanonical`: 동일 조건(대상 candidate의 sourceType/masterId) → 차단(**2차 방어**, 승격 단).
  - `isCosmeticMaster()`: product_masters + product_categories(자기/부모) join 1회.
- 오류 응답(WO §7): generic admin 컨트롤러가 `CosmeticDescriptionBlockedError` 를 잡아 **403 + code `COSMETIC_O4O_DESCRIPTION_BLOCKED`** + 안내문("화장품 상품의 공통 설명서는 O4O에서 직접 제작하지 않습니다. 공급자 또는 브랜드 콘텐츠 경로를 이용해 주세요."). 500 아님.

## 4. 차단 대상 / 허용 대상

- **차단**: 화장품 + O4O 공통 sourceType(manual/operator/ai/drug_extension/mfds_*/migration/store_contribution) 의 createCandidate·setCanonical.
- **허용(무영향)**: `sourceType='supplier'`(공급자·브랜드 경로) / 건강기능식품·일반식품·의약품 등 비화장품 / 기존 설명서 조회. (단위테스트로 확인)

## 5. 기존 화장품 설명서 존재 여부

- IR상 화장품 canonical 생성 흐름 없음(SPD source_type union에 cosmetics 없음, 화장품 콘텐츠는 `cosmetics_contents`/`signage_cosmetics` 별도 테이블). 실 DB 건수는 Cloud SQL 확인 대상(IR §16 (I-1), 노트북 5432 차단으로 미실행) — **본 WO 데이터 미변경**.
- **DB delete/archive/canonical 변경/연결 해제 0.**

---

# Track B. 건기식·일반식품 Active 문서 정비 (M2~M5)

> M1(HFF R1~R10 규칙 SSOT 소실)은 "대체 SSOT 신설 결정" 필요 → 본 WO 제외, **별도 문서 WO** 로 분리(IR §15/§17 권고, 사용자 확정).

| # | 문서 | 변경 |
|---|---|---|
| M4 | `general-food/AGENT-KICKOFF.md` | 상단에 **Legacy / Existing Content Only** 배너 + 새 SSOT 링크. 신규 제작 진입점 아님 명시. 기존 콘텐츠 보존. |
| M2 | `health-functional-food/AGENT-KICKOFF.md` §6 | 저장 절차에 **이중게이트(1차 내용 확인 / 2차 승인 저장)** 명문화 + SSOT §6.1·AGENT-GUIDE 링크. |
| M3 | `health-functional-food/PROCESSED-LEDGER.md`(헤더) | 정본 예제 포인터 `byeonenjang-probiotics.responsive.html`(deprecated) → `byeonenjang.semantic.html`; 깨진 존재가드 앵커 → §7; "zh canonical skip" → ko+en 정책 정정. |
| M5 | `O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md`(헤더) | 상품설명 상품군 정책 SSOT 링크 추가(공통 골격은 상품군 분리 이전 정의 명시). |

- **IR·CHECK·WO·원장 rows 등 history 문서 미수정.** LEDGER 는 **헤더만** 수정(배치 rows 불변).

---

## 6. 기존 데이터 영향

- DB write 0 · migration 0 · 기존 콘텐츠(화장품/일반식품) 변경 0 · QR 재발급 0 · 신규 입력 UI 0.

## 7. test / typecheck / build

- **단위테스트**: `jest shared-product-description.cosmetic-guard` — **10/10 PASS** (건기식 허용 / 화장품 rt·slug·부모 차단 / 공급자 허용 / 일반식품 허용 / master 미발견 허용 / setCanonical 화장품 비-supplier 차단·supplier 허용·건기식 허용).
- **타입체크**: `tsc -p apps/api-server` — 본 WO 파일(shared-product-description.service / product-master-description.controller / cosmetic-guard.test) **오류 0**. (전체 잔존 오류는 무관한 선행 `src/scripts/drug-otc-*` — 다른 에이전트 영역, 미개입.)
- build: CI 가 push 시 수행(별도 프로덕션 build 미실행 — typecheck+단위테스트로 게이트 충족).

## 8. 배포 / 프로덕션 검증

- **배포**: `Deploy API Server (Cloud Run)` run `29184103038` **success** → 화장품 write 가드 라이브. (Web 배포 없음 — web 코드 무변경, 정상.)
- **프로덕션 검증**: 실 write 미실행(WO §15 — 운영 DB 테스트 콘텐츠 생성 금지). 차단 정합은 단위테스트 10/10 로 확보. 실 화장품 master 대상 write 요청 → 403 차단은 코드/테스트 근거로 확정, 운영 read-only 확인(화장품 SPD 실건수 = IR §16 (I-1))은 Cloud Console SQL 후속.

## 9. 커밋 / 워킹트리

- Track A: commit `32fa42594` (service+controller+test).
- Track B(+CHECK): 본 커밋.
- 워킹트리 잔여: 없음(내 파일만 커밋, 다른 세션 파일 미포함).

## 10. 준비 완료 전 남은 작업 (후속)

- **M1 별도 WO**: HFF R1~R10 규칙 대체 SSOT 신설(현재 general-food README Legacy stub 가리켜 규칙 내용 소실).
- IR §16 SQL(화장품/일반식품/SPD 실건수)은 Cloud Console 확인 후 기록.
- 다음: **O4O 상품 상세설명서 제작 준비 완료 종합 CHECK** → PASS 시 건강기능식품 설명서 제작 본작업.

## 11. 완료 판정

**PASS (구현·단위테스트·타입체크·문서 M2~M5).** 화장품 O4O 공통 설명서 신규 write 를 서버 계층에서 차단(공급자 경로 유지), 기존 화장품 콘텐츠 무변경, migration/DB write 0. 건기식 이중게이트·정본 예제·언어 정렬 + 일반식품 Legacy 표기 완료. M1(규칙 SSOT 재구성)만 별도 WO 로 분리.
