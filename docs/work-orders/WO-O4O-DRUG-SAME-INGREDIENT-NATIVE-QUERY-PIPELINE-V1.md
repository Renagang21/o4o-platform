# WO-O4O-DRUG-SAME-INGREDIENT-NATIVE-QUERY-PIPELINE-V1

> **상태**: DRAFT · 핸드오프 전용(명시 승인 전 실행 금지) · 조사 완료분 기반
> **표기일**: 2026-09-18
> **선행/근거**: `WO-O4O-HOSPITAL-DRUG-BROWSER-ONLY-LOCAL-DATA-AND-DESKTOP-ENTRY-V1` §"O4O 자체 DB 조사 결과 (2026-09-17)".
> 그 WO 에서 확정한 **"현 상태 O4O DB 만으로는 동일성분 제품군 조회 불가"** 판정의 후속 트랙.
> 병동 `/hospital-drug` 의 near-term 동일성분 열거는 HIRA 축(15054445→15021027)으로 별도 진행하며,
> 본 WO 는 그것과 독립적으로 **O4O 자체 데이터로 동일성분 조회를 완결**하기 위한 구조 확장이다.

## 목적

O4O 는 약가마스터 원천 데이터에 **주성분코드(일반명코드)** 를 이미 100% 보유하나(원천 CSV), 그 값이
`ProductCandidate.rawPayload.source` jsonb 안에만 원본 보존되어 **조회 불가능**하다. 주성분코드를 조회 가능한
1급 식별자로 승격하고, 그 코드로 동일성분 제품군을 GROUP BY 조회하는 서비스를 만들어, 쿼리당 외부 API 의존
없이 O4O 자체 DB 로 동일성분 제품군을 반환할 수 있게 한다.

## 배경 — 현 상태가 불가한 이유 (조사 확정)

| 항목 | 현 상태 | 근거 |
|---|---|---|
| 주성분코드 보존 위치 | `ProductCandidate.rawPayload.source` jsonb 안에만 | `drug-master-row.mapper.ts:27` |
| 승격 시 추출 | 추출 대상 아님 | `drug-master-promotion-apply.db.ts:534-541` |
| 식별자 타입 | `ProductIdentifier` union 에 주성분코드 타입 없음 | `ProductIdentifier.entity.ts:55-78` |
| ProductDrugExtension | 주성분코드 없음 · 성분은 이름 문자열 · product 와 1:1 → 그룹핑 불가 | `ProductDrugExtension.entity.ts` |
| 대표상품 그룹핑 축 | 품목기준코드(같은 허가품목 SKU 묶음) — 브랜드 교차 아님 | representative grouping service |
| 동일성분 조회 서비스 | 없음 (현행 `/hospital-drug` 은 health.kr 외부 호출) | `hospital-drug-composite.ts` |
| 약가마스터 승격 운영 적용 | 미적용(dry-run/가드) | `CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1.md` |

## 작업 범위 (4개 변경점)

1. **승격 파이프라인에 주성분코드 추출 추가.** `drug-master-promotion-apply.db.ts` 승격 시
   원천의 `일반명코드(성분명코드)` 를 읽어 1급 필드로 전달. (기존 rawPayload 보존은 유지 — additive)
2. **식별자/컬럼 신설.** 다음 중 하나를 설계 단계에서 확정한다:
   - (a) `ProductIdentifier` 에 새 타입(예 `KOREA_GENERIC_CODE`) 추가, 또는
   - (b) `ProductDrugExtension` 에 `generic_code` 컬럼 + 인덱스 추가.
   조회 패턴(코드→제품목록)에 맞는 쪽을 고른다. **DB schema 변경 = 중지 조건 → 명시 승인 필요.**
3. **동일성분 조회 서비스.** 주성분코드로 `GROUP BY` 하여 동일 코드를 가진 제품 목록을 반환하는
   read 서비스 신설. Boundary/Guard 규칙(§7) 준수 · 파라미터 바인딩 · 도메인 경계 필터.
4. **운영 DB 적재(apply).** 약가마스터 candidate 승격을 운영에 적용. **대량 write = 중지 조건 →
   명시 승인 + `PRODUCTION-MIGRATION-STANDARD` 절차 필요.**

## 중지 조건 (본 WO 실행 시 반드시 승인 후 진행)

- (2) 스키마/식별자 타입 변경 — Product Resource Architecture(F12) 영향 검토 필요.
- (4) 운영 대량 적재 — migration/CI 경유 원칙, 수동 적용 금지.
- ProductMaster/Identifier/Extension 은 공통 상품 구조 — 소비처 전수 식별(`check-literal-consumers.mjs`) 선행.

## 검증

- 격리 DB 에서 승격→추출→조회 왕복: 타이레놀 주성분코드로 조회 시 동일성분 제품군 다건 반환 확인.
- 운영 적재 전 dry-run 결과와 count 대조.
- 기존 대표상품(품목기준코드) 그룹핑 회귀 없음 확인.

## 산출물

- 조사→설계(식별자 vs 컬럼 확정)→격리 검증→운영 적재 순서의 실행 기록.
- `CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1` 갱신(주성분코드 승격 반영).
- `/hospital-drug` 동일성분 소스를 HIRA→O4O 네이티브로 전환 가능 여부 재판정.
