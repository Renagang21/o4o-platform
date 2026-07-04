# WO-O4O-MEDICAL-DEVICE-UDI-DI-IDENTIFIER-TYPE-IMPLEMENTATION-V1

> 작업 성격: **코드 구현 (union 확장 + normalize 규칙 + 테스트).** DB write 0, apply 0, migration 0, ProductCandidate/ProductIdentifier/ProductMaster 생성 0. 타입체크·유닛테스트만 수행.
> 작성일: 2026-07-04
> 기준 저장소: `C:\Users\sohae\o4o-platform` (집 PC). Linux `/workspace` 무시.
> 선행: `docs/checks/CHECK-O4O-MEDICAL-DEVICE-UDI-IDENTIFIER-CONFLICT-POLICY-V1.md`(정책 D3 — `UDI_DI` type 채택)

---

## 1. 결론

선행 정책 CHECK(D3)에서 채택된 `UDI_DI` identifier type을 **application-level union 확장만으로 구현**했다. `identifier_type` 컬럼이 `varchar(40)` 이므로 **DB migration 불필요**.

| 항목 | 결과 |
|---|---|
| `ProductIdentifierType` union에 `UDI_DI` 추가 | 완료 |
| `PRODUCT_IDENTIFIER_TYPES` 배열에 `UDI_DI` 추가 | 완료 |
| `normalizeIdentifier` UDI_DI 원형 보존 규칙 | 완료 |
| DB migration | **불필요** (varchar40, 'UDI_DI' 6자) |
| 타입체크 | 이번 변경 관련 에러 0 |
| 유닛테스트 | 8/8 PASS |
| DB write / apply | 0 |

---

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts` | union에 `'UDI_DI'` + `PRODUCT_IDENTIFIER_TYPES` 배열에 `'UDI_DI'` + 주석 |
| `apps/api-server/src/modules/neture/utils/product-identifier.util.ts` | `normalizeIdentifier` 에 `case 'UDI_DI'` (원형 보존) |
| `apps/api-server/src/modules/neture/utils/__tests__/product-identifier.util.test.ts` | 신규 유닛테스트 (8 케이스) |

---

## 3. normalize 규칙 (UDI_DI)

```ts
// UDI_DI 는 sanitizeIdentifierValue(공백·하이픈 제거)를 태우지 않고
// trim + 제어문자 제거만 수행한다. 대문자화·구분기호 제거 금지.
if (type === 'UDI_DI') {
  if (value == null) return '';
  return String(value).replace(/[\x00-\x1F\x7F]/g, '').trim();
}
```

| 입력 | UDI_DI normalize | 대비: GTIN normalize |
|---|---|---|
| `08800158900007` (GTIN-14) | `08800158900007` (원형) | `08800158900007` |
| `8806485001234` (GTIN-13) | `8806485001234` (원형, zero-pad 안 함) | `8806485001234` |
| `+J022abc01` (HIBCC) | `+J022abc01` (`+`·문자·대소문자 원형 보존) | `02201` (`+`·문자 제거 — 부적합) |
| ` +J0123-AB ` (HIBCC, 하이픈) | `+J0123-AB` (trim만, 하이픈 보존) | `0123` (`+`·문자·하이픈 제거 — 부적합) |

핵심: HIBCC형 UDI-DI는 `GTIN` normalize(`\D` 제거)를 태우면 `+`와 문자가 사라져 의미가 붕괴된다. `UDI_DI` type은 이를 원형 보존한다. GTIN형 숫자 UDI-DI는 두 규칙 결과가 동일하다.

> **정정(2026-07-04)**: 최초 커밋(545d10d1c)은 `sanitizeIdentifierValue`(공백·하이픈 제거) 후 `.toUpperCase()` 를 적용해, WO 정책("공백·하이픈·점 제거 또는 대문자화 금지")과 WO 예시(`normalizeIdentifier('UDI_DI',' +J0123-AB ') === '+J0123-AB'`)를 위반했다. 하이픈이 제거되고(`+J0123AB`) 대소문자가 변형되어 medical-device 식별자 dedup 키가 오병합될 수 있었다. 후속 커밋에서 UDI_DI 를 `sanitizeIdentifierValue` 경로에서 분리하여 **trim + 제어문자 제거만** 수행하도록 정정. `sanitizeIdentifierValue` 자체는 GTIN 추론이 의존하므로 무변경.

> 저장 정책(선행 D3): 숫자형 UDI-DI는 `GTIN`(barcode mirror) + `UDI_DI`(맥락) 이중 보존, HIBCC형은 `UDI_DI`만. 본 구현은 그 normalize 기반을 제공하며, 실제 저장(import)은 Gate A WO에서 수행한다.

---

## 4. 안전성 확인

- **exhaustive switch 없음**: `normalizeIdentifier`는 `default` 분기 보유. 다른 곳에 `ProductIdentifierType` 대상 `never`/`assertNever` 없음 → 추가는 additive.
- **중복 whitelist 없음**: identifier type 정본 목록은 엔티티의 `PRODUCT_IDENTIFIER_TYPES` 단일. drug-import 계열은 특정 type을 값으로 쓸 뿐 UDI_DI를 거부하는 하드코딩 목록 없음.
- **`inferIdentifierTypeFromBarcode` 미변경**: UDI_DI는 barcode 추론이 아니라 의료기기 importer가 명시 지정. 일반 barcode 추론에 UDI_DI를 섞지 않는다.
- **DB 무변경**: 컬럼 타입/제약 그대로. 기존 row 영향 0.

---

## 5. 검증 결과

```text
유닛테스트: src/modules/neture/utils/__tests__/product-identifier.util.test.ts
  Tests: 8 passed, 8 total (PASS)
    - PRODUCT_IDENTIFIER_TYPES 에 UDI_DI 포함
    - GTIN-14/13 숫자 UDI-DI 원형 보존
    - HIBCC '+' prefix 보존 + 대문자화
    - 공백 trim / 빈값 처리
    - 기존 GTIN·코드류 normalize 회귀 없음

타입체크: tsc --noEmit
  이번 변경 관련 에러 0
  (전체 1건 = marketTrialController.ts CreateTrialDto — 기존/무관 baseline)
```

---

## 6. read-only/범위 준수

| 항목 | 결과 |
|---|---|
| DB write / apply / migration | 0 |
| ProductMaster/Identifier/Candidate 생성 | 0 |
| Cloud Run Job | 0 |
| 코드 변경 | union 1 + normalize 1 + test 1 (범위 내) |
| 병렬 세션 파일 수정 | 0 (스코프 커밋) |

---

## 7. 다음 단계

1. **Gate A Candidate import**(선행 정책 D4) — 표준코드 20,000(또는 전량) 전건 `product_candidates` 적재. identifier_type 매핑: 숫자형→`GTIN`, HIBCC→`UDI_DI`. ProductMaster 승격 금지. runbook + 승인 게이트.
2. **Gate B apply runbook** — PROMOTABLE_AFTER_DB_CHECK 19,606 기준. 숫자형 UDI-DI를 `GTIN`+`UDI_DI` 이중 identifier + barcode 승격, HIBCC는 `UDI_DI`만. **사용자 명시 승인 게이트** 하에서만.
3. 전량 2.65M은 별도 WO.

**최종: `UDI_DI` identifier type을 union 확장으로 구현하고(원형 보존 normalize 포함), migration 없이 타입체크·테스트 통과. Gate A/B apply 전 코드 기반이 준비됐다. apply·DB write는 여전히 0.**
