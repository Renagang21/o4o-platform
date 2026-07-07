# WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-PATCH-DRAFT-V1

## 0. 중요 지시

이번 요청은 **작업 요청서 실행**이다.

이번 단계의 범위는 비경구 OTC 중 **파스/첩부제**를 대상으로 운영 DB read-only 조사, group 후보 분리, e약은요/SPD 원문 grounding, 대표 파스/첩부제 설명서 초안 작성, CHECK 문서 작성까지다.

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

이번 단계는 **파스/첩부제 설명서 초안 dry-run**이다. 전량 대량 작성이 아니라 **분류 + 대표 초안**이다.

---

## 1. 작업 목적

비경구 OTC 중 파스/첩부제 후보를 운영 DB read-only로 재확인하고, 성분·함량·제형·부착 시간·주의사항 기준으로 group 후보를 분리한 뒤, e약은요/SPD 원문 근거가 충분한 대표 파스/첩부제 설명서 초안을 작성한다.

이번 단계는 파스/첩부제 전체 대량 작성이 아니라, **NSAID 파스, 카타플라스마, 플라스타, 냉감/온감 제품, 금연 니코틴 패치를 분리하고 부착 시간·광과민·NSAID 중복·상처 부위 금지 기준을 확정**하는 작업이다.

1단계 조사 결과:

```text
비경구 후보: 6,952
파스/첩부 patch 후보: 2,283
파스/첩부 e약은요/SPD 원문 보유: 1,497 / 66%
주요 ATC: M02AC / M02AA10(케토프로펜) / M02AA19 / M02AA15(피록시캄 등) / M02AA08
금연 니코틴: N07BA01 90 (별도)
```

## 2. 기준 문서

먼저 확인한다.

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-END-TO-END-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
```

있으면 추가 확인한다.

```text
docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md
```

누락 문서는 CHECK에 기록하되 작업을 중단하지 않는다.

## 3. DB 접속 (검증된 경로)

```text
cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db --port <free-port>
psql host=127.0.0.1 user=o4o_api dbname=o4o_platform  (SELECT 전용)
비밀번호: Cloud Run o4o-core-api env DB_PASSWORD (세션 환경변수로만)
한글 정규식: UTF-8 .sql + psql -f
```

## 4. 작업 범위

### 이번 단계에서 한다

1. 운영 DB read-only로 파스/첩부제 후보를 재확인한다.
2. `shared_product_descriptions.content` 원문 보유 파스/첩부제를 우선 대상으로 삼는다.
3. 성분(NSAID 종류 등)·제형(카타플라스마/플라스타/패치)·부착 시간 기준으로 group 후보를 분리한다.
4. 금연 니코틴 패치를 별도 분리한다.
5. 원문 근거가 충분한 대표 그룹만 설명서 초안을 작성한다.
6. 상처 부위 금지·광과민·NSAID 중복·부착 시간 기준을 확정한다.
7. CHECK 문서를 작성한다.

### 이번 단계에서 하지 않는다

- 파스/첩부제 2,283건 전량 작성
- 금연 니코틴 패치 본문 작성(분리만)
- 성분·함량·제형 불명확 제품 본문 작성
- 처방 전용 첩부제 본문 작성
- DB 반영

## 5. 우선 대상 / 분리 대상

우선 작성 후보:

| 성분군 | 처리 |
|---|---|
| 케토프로펜 등 NSAID 파스(플라스타/카타플라스마) | 대표 초안 |
| 피록시캄·플루르비프로펜 등 기타 NSAID 첩부 | 원문 확인 후 대표 초안 |
| 냉감/온감 첩부(살리실산메틸·멘톨·캡사이신 등 비-NSAID) | 원문 확인 후 대표 초안 |

분리(이번 단계 본문 미작성):

| 대상 | 사유 |
|---|---|
| 금연 니코틴 패치(N07BA01) | 경피 흡수·금연 보조, 별도 트랙 |
| 처방 전용 첩부제 | OTC 아님 |
| 성분·함량·제형 불명확 | 원문 근거 부족 |

## 6. group_key 기준

형식:

```text
drug_otc::{single|combo}::patch::{ingredient_key}::{strength_key|unspecified}::{dosage_form}
```

예:

```text
drug_otc::single::patch::ketoprofen::30mg::plaster
drug_otc::single::patch::piroxicam::unspecified::cataplasma
drug_otc::single::patch::flurbiprofen::40mg::plaster
```

주의:

- 파스 매수(`30매`, `10매`), 포장 단위는 strength_key로 쓰지 않는다.
- **spec 첫 토큰은 대개 매수/용량이지 성분 함량이 아님**(STAGE1/STAGE2 확정) → 함량은 명칭·원문 값(`mg/매`, `mg`)만 사용, 없으면 `unspecified`, 창작 금지.
- 제형(플라스타/카타플라스마/패치)이 다르면 부착감·부착 시간이 다를 수 있으므로 분리 검토.
- 같은 성분이라도 냉감/온감/제형 차이가 효능·용법에 영향을 주면 병합하지 않는다.

## 7. 설명서 작성 형식

```md
## [성분명] [함량] [제형(파스/첩부)]

| 항목 | 내용 |
|---|---|
| 성분 |  |
| 분류 | 일반의약품 |
| route | 첩부(피부) |
| 작용 |  |
| 주요 증상 |  |
| 선택 포인트 |  |
| 주의 대상 |  |

**효능·효과**  
...

**사용 안내**  
...

**주의 대상**  
...

**성분 기준 선택**  
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.  
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.  
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.
```

공통 첩부 주의문구:

- 상처, 습진, 점막, 눈 주위에는 붙이지 않는다.
- 제품별 부착 시간과 교체 간격을 확인한다.
- 같은 부위 반복 부착 시 피부 자극을 확인한다.
- NSAID 성분은 다른 소염진통제(먹는 약·바르는 약 포함)와 중복 사용에 주의한다.
- NSAID 첩부는 광과민이 있을 수 있어 부착·제거 후 자외선(햇빛·태닝) 노출에 주의한다.
- 천식·아스피린 과민, 임부(특히 후기)는 사용 전 확인한다.
- 발진·가려움·물집·심한 자극이 있으면 사용을 중단한다.

## 8. 원문 grounding 기준

설명서 초안은 반드시 `shared_product_descriptions.content` 또는 e약은요 원문을 근거로 작성한다.

확인할 항목:

```text
효능·효과 (적응 부위·증상)
부착 방법 / 1일 부착 횟수·시간
교체 간격
사용 금지 부위 (상처·점막·눈 주위)
광과민 주의
NSAID 중복·병용 주의
천식/아스피린 과민/임부 주의
이상반응 (피부 자극)
```

원문에 없는 함량·부착 시간·주의사항은 창작하지 않는다. 불명확한 경우 `unspecified` 또는 `hold_for_source`로 둔다.

## 9. 작업상 분류 기준

이 분류는 DB 상태값이 아니다. CHECK 안에서만 쓰는 작업 기록이다.

| 작업상 분류 | 의미 |
|---|---|
| drafted | 원문 근거가 충분해 설명서 초안을 작성 |
| draft_ready | group 후보는 명확하나 이번 batch에서 본문 미작성 |
| hold_for_source | 원문 없음 또는 성분·함량·제형 불명확 |
| hold_for_pharmacist | 별도 약사 판단 필요 |
| separate_track | 금연 니코틴 패치 등 별도 트랙 |
| exclude | OTC 매장 설명서 대상 아님 또는 첩부 route 아님 |

## 10. CHECK 문서

작성 파일:

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-PATCH-DRAFT-V1.md
```

포함 항목:

1. 작업 일시
2. 사용한 기준 문서
3. DB read-only 확인
4. 파스/첩부제 후보 재확인
5. 원문 보유 수
6. 성분·제형별 group 후보
7. 작성한 대표 설명서 초안 목록
8. 금연 니코틴 패치 분리 결과
9. 보류한 그룹과 사유(광과민/NSAID 중복/부착 시간 포함)
10. registry 반영 제안
11. 금지사항 준수 확인

## 11. 성공 기준

- 파스/첩부제 후보 중 성분·제형별 group 후보가 분리됨
- 원문 보유분 기준으로 대표 설명서 초안이 작성됨
- 파스 매수와 실제 성분 함량이 구분됨
- 금연 니코틴 패치가 별도 분리됨
- 광과민·NSAID 중복·부착 시간·상처 부위 금지 기준이 반영됨
- 성분·함량 불명확 제품은 작성하지 않음
- DB write 0
- canonical 승격 0

## 12. 완료 보고 형식

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-PATCH-DRAFT-V1

수행:
- 파스/첩부제 후보 read-only 재확인
- 원문 보유 확인
- 성분·제형·부착시간 기준 group 후보 분리
- 금연 니코틴 패치 분리
- 원문 grounding 기반 대표 설명서 초안 작성
- 보류 그룹 사유 기록

결과:
- 파스/첩부 후보:
- 원문 보유:
- group 후보:
- 작성 그룹:
- 작성 초안 수:
- separate_track(니코틴):
- hold_for_source:
- hold_for_pharmacist:

금지사항:
- DB write 0
- product_candidate_description_drafts 변경 0
- shared_product_descriptions 변경 0
- ProductDrugExtension 변경 0
- canonical 승격 0
- registry 상태 변경 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-PATCH-DRAFT-V1.md

다음 제안:
- STAGE2b(점안 other 603 성분 추출)
- 또는 BATCH-EYE-ANTIALLERGY-CURATION
- 또는 BATCH-NASAL-DRAFT
```
