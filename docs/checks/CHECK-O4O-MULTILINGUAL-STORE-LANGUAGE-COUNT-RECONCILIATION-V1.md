# CHECK-O4O-MULTILINGUAL-STORE-LANGUAGE-COUNT-RECONCILIATION-V1

> WO: `WO-O4O-MULTILINGUAL-STORE-LANGUAGE-COUNT-RECONCILIATION-V1`
> 선행: `CHECK-O4O-MULTILINGUAL-AND-TABLET-DEFERRED-DB-REVERIFY-V1`(16건 차이 지적)
> 성격: STORE canonical 언어별 합계와 총계의 16건 차이 규명 + language×status 교차·비정상값 전수 확정. read-only.
> Date: 2026-07-22 · DB write 0 · 코드 0 · 배포 0 · 자격증명 값 미기록.

---

## 0. 결론

**16건 차이는 데이터 이상이 아니라 동시 세션(OTC/HFF)의 canonical 승격에 의한 조회 시점차(라이브 churn)** 였다. **단일 SQL statement** 로 재집계하니 `total_canonical = clean(ko/en/zh/ja) = 39,893`, `NULL=0 · 빈값/공백=0 · 기타=0` 으로 **차이 0**. STORE 전체(전 상태·삭제 포함)에 비정상 language 값은 **0행**, 정규화(LOWER/TRIM/빈값→NULL) 기준 canonical 중복도 **0**. **후속 데이터 정비 불필요.**

## 1. canonical 16건 차이의 구성 — ✅ churn(시점차), 이상 아님

이전 CHECK 의 두 수치는 **서로 다른 시각에 실행된 별개 쿼리** 였다:
- B(언어별 canonical, 실행 t1): ko 29,169 + en 10,667 + zh 29 = **39,865**
- C(status 카운트, 실행 t2 > t1): canonical = **39,881** → 차이 **16**

`shared_product_descriptions` 는 동시 세션(OTC Track A·HFF 복합형)이 **실시간으로 canonical 승격 중인 hot table** 이므로 t1→t2 사이 16건이 canonical 로 증가한 것이다(단조 증가). 본 재검증 시점(t3)엔 39,893 로 더 증가.

**증명 — 단일 statement(내부 일관) 재집계** (`STORE·canonical·deleted_at IS NULL`, `count FILTER`):

| total_canonical | clean(ko/en/zh/ja) | language IS NULL | 빈값/공백 | 기타(non ko/en/zh/ja) |
|----------------:|-------------------:|-----------------:|----------:|----------------------:|
| **39,893** | **39,893** | **0** | **0** | **0** |

→ 한 시점의 total 과 언어별 합이 **정확히 일치**. 언어별 합≠total 은 오직 **두 시점 스냅샷을 뺀 데서 생긴 착시**였다.

## 2. language × status 교차표 (STORE, alive · 단일 스냅샷)

| language | status | count |
|:-------:|:------:|------:|
| ko | canonical | 29,183 |
| ko | candidate | 273 |
| ko | deprecated | 735 |
| ko | hidden | 10 |
| en | canonical | 10,681 |
| en | deprecated | 31 |
| zh | canonical | 29 |
| zh | candidate | 13 |
| ja | — | 0 |

- 버킷은 **ko/en/zh 만** 등장(ja/NULL/EMPTY/WS/OTHER **없음**). ko canonical 합 29,183 + en 10,681 + zh 29 = 39,893(§1 total 일치).
- `needs_review`/`draft`/`revision_requested`(공급자 초안·검수 대기) = **0**(공급자 STORE 실데이터 아직 없음).
- (수치는 라이브 churn 으로 조회 시점마다 소폭 변동 — 위는 2026-07-22 스냅샷.)

## 3. NULL·빈값·비정상값 현황 — ✅ 전부 0

- canonical alive: NULL 0 · 빈값/공백 0 · 기타 0(§1 표).
- **STORE 전체(전 상태 + 삭제 포함)** 비정상 language(`language IS NULL OR lower(btrim(language)) NOT IN ('ko','en','zh','ja')`) = **0행**(hex 안전 집계, 원본 바이트 미출력).

## 4. 비UTF8(0xa1) 의심값의 상태별 영향 — 현재 부재(전수 확인)

- 앞선 재검증에서 `status`+`language` 동시 GROUP BY 가 UTF8 client 로 **원본 language 를 출력** 하다 `0xa1` 로 중단됐다. 그러나 이번에 `client_encoding=LATIN1`(바이트 무손실 통과) + `encode(language::bytea,'hex')`(원본 노출 없이 바이트 검사) 로 **STORE 전 상태·삭제 포함 전수 스캔** 한 결과 비정상 language **0행**.
- 즉 **현재 STORE 에 0xa1 등 비정상 language 바이트를 가진 행은 없다.** 이전 출력 오류는 **재현되지 않으며**, 활성 churn 테이블의 일시적 행(쓰기 중 candidate 등)이었던 것으로 추정한다(현재 부재). server_encoding=UTF8 확인.

## 5. 정규화 기준 canonical 중복 결과 — ✅ 0

- `COALESCE(language,'ko')` 기준(선행 CHECK): 중복 0.
- **정규화 강화**(`NULLIF(lower(btrim(language)),'')` — 대소문자·공백·빈값 흡수) 기준 canonical 중복(HAVING count>1) = **0**.
- 비정상 language 값이 서로 다른 문자열로 위장해 "중복 0" 판정에 숨어 있을 가능성 → §3·§4 로 비정상값 자체가 0임이 확인되어 **사각지대 없음**.

## 6. 후속 데이터 정비 필요 여부 — 불필요

- 비정상 language 값 0, NULL/빈값 0, 정규화 중복 0 → STORE language 데이터 정합. 정비(update/normalize) 대상 없음.
- (기능 검증으로 남은 항목은 본 read-only WO 범위 밖: 공급자 언어별 설명서 브라우저 저장·재조회 smoke / 운영자 검수 큐 언어 구분 / 태블렛 이용자 언어 선택 / SPD fallback 정비(선택→ko→없음) / 공유 편집기 잔여 '태블릿' 표기. 별도 WO.)

## 7. CHECK·commit·push

- **DB write 0 · 코드 0 · 배포 0.** read-only 집계만(단일 테이블, 위험 JOIN·전수 실행계획 없음). 자격증명 값·Secret·개인정보·설명서 본문 미조회·미기록. 올바른 프로덕션 DB 사용자로 정상 접속.
- 본 CHECK 문서만 commit·push.
