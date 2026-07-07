# WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1

## 0. 중요 지시

이번 요청은 **작업 요청서 실행**이다.

이번 단계의 범위는 **점안제 `other`(브랜드명만) 603건을 SPD 원문에서 성분·농도·용법·렌즈 정책을 추출해 성분군별 group 후보로 재분류하는 것**까지다.

이번 단계는 **설명서 본문 대량 작성이 아니다.** 브랜드명만 보이는 점안제를 성분군 기준으로 정리(재분류)하는 작업이다.

운영 DB에는 **SELECT만** 허용한다.

금지:

- DB write 금지
- `product_candidate_description_drafts` insert/update/upsert 금지
- `shared_product_descriptions` insert/update 금지
- `ProductDrugExtension` 변경 금지
- `ProductMaster` / `ProductCandidate` 상태 변경 금지
- canonical 승격 금지
- registry 상태 직접 변경 금지
- 매장 콘텐츠, QR, POP, 태블릿 연결 금지
- 처방의약품 설명 작성 금지

## 1. 작업 목적

STAGE2에서 `hold_for_source`로 남은 점안제 `other` 603건을 대상으로, `shared_product_descriptions.content` 원문에서 **성분·농도·용법·렌즈 정책**을 추출해 성분군별 group 후보로 재분류한다.

핵심 목표:

- 브랜드명만 보이는 점안제를 성분군 기준으로 정리한다.
- 원문에서 성분을 확정할 수 있는 것과 없는 것을 구분한다.
- 기존 성분군(CMC / 트레할로스 / 포비돈 / 히알루론산 / PDRN)으로 흡수되는 건을 식별한다.
- 신규 성분군(기타 demulcent, 각막보호, 비타민·아미노산 등)을 후보로 만든다.
- 항알레르기·충혈제거·복합·세안액 등 별도 트랙 대상은 분리한다.
- 점안제 route의 실제 잔여량을 줄인다.

## 2. 배경 — STAGE2 결과

`CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1` 실측:

```text
점안제 후보: 1,392 (원문 보유 913)
STAGE2 작성 그룹: 6 (CMC 0.5% / CMC 1% / 트레할로스 / 포비돈 2% / 히알루론산 / PDRN)
```

`other`(브랜드명만, 성분 name 미표기):

```text
other 총: 603
other 원문(SPD content) 보유: 312
```

`other`는 "작성 불가"가 아니라 "제품명에 성분이 안 보이는 것"이다. 원문에서 성분을 뽑으면 CMC / 히알루론산 / PDRN / 기타 demulcent로 상당수 재분류될 가능성이 크다.

## 3. 기준 문서

먼저 확인한다.

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-V1.md
```

있으면 추가 확인한다.

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md
```

누락 문서는 CHECK에 기록하되 작업을 중단하지 않는다.

## 4. DB 접속 (STAGE1/STAGE2 검증된 경로)

```text
cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db --port <free-port>
psql host=127.0.0.1 user=o4o_api dbname=o4o_platform  (SELECT 전용)
비밀번호: Cloud Run o4o-core-api env DB_PASSWORD (세션 환경변수로만, 파일 미저장)
한글 정규식: UTF-8 .sql + psql -f  (인라인 한글은 CP949로 깨짐)
```

## 5. 조사 대상 (other 603 정의)

STAGE2 성분군 CASE에서 `other`로 떨어진 점안제:

```text
drug_category = 'otc'
name ~ '점안|안약|인공눈물'
name NOT ~ 히알루론 / 카르복시메틸셀룰로·카복시메틸 / 트레할로 / 포비돈
        / 폴리데옥시리보뉴클레오티드·디옥시리보 / 케토티펜·크로모글리·크로몰린·올로파타·레보카바·알레르 / 나파졸린·테트라히드로·테트라하이드로·충혈
```

우선 대상 = 이 중 `shared_product_descriptions.content` 보유 312건.

## 6. 성분 추출 방식

`content` 원문에서 성분을 추출한다. 성분 단서 우선순위:

1. `content`의 효능·효과/성분 표기 문구
2. 제품명 괄호 안 성분 (STAGE2 CASE에서 놓친 표기 변형)
3. `atc_code` (보조 검증만 — route 확정용 아님, 경구 오탐 주의)

추출 목표 성분군(예시, 확장 가능):

```text
기존 흡수: carboxymethylcellulose_sodium / sodium_hyaluronate / trehalose / povidone / polydeoxyribonucleotide_sodium
신규 후보: hypromellose(하이프로멜로스) / polyvinyl_alcohol(폴리비닐알코올) / povidone계 기타 demulcent
          / 각막보호(플라빈아데닌디뉴클레오티드 FAD 등) / 비타민·아미노산 점안 / 콘드로이틴설페이트 등
분리 트랙: 항알레르기 / 충혈제거 / 복합 / 세안액 / 경구 눈영양제(점안 아님)
```

## 7. 재분류 결과 분류 기준 (작업 문서 전용, DB 상태값 아님)

| 작업상 분류 | 의미 |
|---|---|
| reassigned_to_existing | 기존 성분군(CMC/히알루론산/트레할로스/포비돈/PDRN)으로 흡수 |
| new_group_candidate | 신규 성분군 group 후보 (기타 demulcent 등) |
| hold_for_pharmacist | 항알레르기·충혈제거 등 약사 검토성 |
| hold_for_source | 원문 없음(291건) 또는 원문에서도 성분 불명확 |
| exclude | 세안액·경구 눈영양제 등 점안 route/대상 아님 |

원칙:

- 성분·농도가 원문으로 확정되는 것만 group 후보로 승격.
- 농도는 명칭·원문에 있는 값만 사용. 없으면 `unspecified`. **농도 창작 금지**(가이드 §3.8).
- 점안 `specification` 첫 토큰은 **병/용기 용량(mL)이지 농도가 아님** (STAGE2 확정) → group_key 농도로 쓰지 않는다.

## 8. group_key 기준

```text
drug_otc::single::ophthalmic::{ingredient_key}::{strength_key|unspecified}::eye_drop
```

- 같은 S01XA20이라도 성분군이 다르면 병합 금지.
- 농도가 다르면 별도 그룹 후보(CMC 0.5% vs 1% 선례).

## 9. 이번 단계에서 하지 않는다

- other 603 전량 설명서 본문 작성
- 항알레르기 점안제 본문 작성
- 충혈제거·복합 점안제 본문 작성
- 원문 없거나 성분 불명확 제품 본문 작성
- DB 반영

> 재분류로 기존 grounded 성분군(CMC/트레할로스/포비돈/히알루론산/PDRN)에 흡수되는 건은, STAGE2 초안을 그대로 재사용 대상으로 표시만 한다(본문 신규 작성 아님).

## 10. CHECK 문서

작성 파일:

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1.md
```

포함 항목:

1. 작업 일시
2. 사용한 기준 문서
3. DB read-only 확인
4. other 603 / 원문 보유 312 재확인
5. 성분 추출 방식
6. 재분류 결과 집계 (reassigned / new_group / hold_pharmacist / hold_source / exclude)
7. 기존 성분군 흡수 건수
8. 신규 성분군 group 후보 목록
9. 분리 트랙(항알레르기/충혈/복합/세안액/경구) 건수
10. 점안제 route 잔여량 재계산
11. registry 반영 제안
12. 금지사항 준수 확인

## 11. 성공 기준

- other 603 중 원문 보유분이 성분군별로 재분류됨
- 기존 성분군 흡수 건수가 산출됨
- 신규 성분군 group 후보가 도출됨
- 항알레르기·충혈·복합·세안액·경구는 별도 트랙으로 분리됨
- 점안제 route 실제 잔여량이 갱신됨
- 농도 창작 없음 (명칭·원문 값만)
- DB write 0
- canonical 승격 0

## 12. 완료 보고 형식

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1

수행:
- other 603 read-only 재확인
- SPD content 원문에서 성분 추출
- 성분군별 재분류
- 기존 성분군 흡수 / 신규 group 후보 도출
- 분리 트랙 식별

결과:
- other 총 / 원문 보유:
- reassigned_to_existing:
- new_group_candidate:
- hold_for_pharmacist:
- hold_for_source:
- exclude:
- 점안제 route 잔여량(갱신):

금지사항:
- DB write 0
- product_candidate_description_drafts 변경 0
- shared_product_descriptions 변경 0
- ProductDrugExtension 변경 0
- canonical 승격 0
- registry 상태 변경 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1.md

다음 제안:
- BATCH-TOPICAL-LOW-RISK-DRAFT
- 또는 BATCH-EYE-ANTIALLERGY-CURATION
```
