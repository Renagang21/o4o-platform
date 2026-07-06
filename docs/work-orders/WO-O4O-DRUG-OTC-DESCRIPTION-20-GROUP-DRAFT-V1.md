# WO-O4O-DRUG-OTC-DESCRIPTION-20-GROUP-DRAFT-V1

## START HERE — 작업 시작 지시

이 파일을 작업 요청서로 받으면 **가장 먼저 저장소를 동기화**한다.

```bash
git fetch --all --prune
git pull origin main
```

동기화 후 아래 파일들이 존재하는지 확인한다.

```text
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-20-GROUP-DRAFT-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-ONE-GROUP-DESCRIPTION-PILOT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-TEMPLATE-AND-5-GROUP-DRAFT-V1.md
```

간단히 말하면 이번 작업은 다음이다.

```text
에르도스테인 1개 pilot + 5개 그룹 dry-run 다음 단계로,
카피제품이 많은 일반의약품 OTC 성분·함량·제형 그룹 20개를 선정/검증하고,
성분 중심 매장용 설명서 초안 20개를 작성한다.
DB write는 하지 않는다.
결과 CHECK와 보완 문서는 GitHub main에 저장한다.
```

반드시 지킬 것:

```text
DB write 0
SharedProductDescription insert/update 0
ProductDrugExtension 임상 텍스트 입력 0
canonical 승격 0
매장 콘텐츠/QR/POP/태블릿 연결 0
처방의약품/건강기능식품/의료기기/의약외품 제외
```

---

## 0. 작업 목적

의약품 매장용 설명서 생성 작업을 20개 성분·함량·제형 그룹으로 확장한다.

이번 작업은 전체 대량 생성이 아니다. 1개 pilot 및 5개 그룹 dry-run에서 확정한 기준을 적용하여, 다음 대량 배치 전 품질과 그룹핑 기준을 검증하는 **20개 그룹 dry-run**이다.

핵심 목표:

1. 카피제품이 많은 OTC 성분·함량·제형 그룹 20개 선정
2. 각 그룹의 OTC 순도, 단일성분성, e약은요/허가 원문 확보 여부 검증
3. 성분 중심 설명서 초안 20개 작성
4. 그룹핑 위험군과 자동화 가능군 분리
5. 기존 가이드/프롬프트/약사 검수 체크리스트 보완
6. 다음 50개 또는 100개 배치 가능 여부 판단

---

## 1. 선행 문서

반드시 먼저 읽고 따른다.

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-ONE-GROUP-DESCRIPTION-PILOT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-TEMPLATE-AND-5-GROUP-DRAFT-V1.md
```

선행 결과 요약:

| 단계 | 결과 |
| --- | --- |
| 1개 pilot | 에르도스테인 300mg 캡슐, 제조사 121사, master 440건, OTC 100% |
| 5개 dry-run | 세티리진/알벤다졸/알마게이트/나프록센/트리메부틴 5개, 전부 OTC 100%·단일성분 |
| 핵심 기준 | 성분 + 함량 + 제형 3축 필수. 같은 성분이라도 함량이 다르면 OTC/RX가 달라질 수 있음 |
| 금지 | ProductDrugExtension 임상 텍스트 입력 금지, SharedProductDescription update 금지, canonical 승격 금지 |

---

## 2. 작업 대상

대상은 **일반의약품 OTC** 중 다음 조건을 만족하는 성분·함량·제형 그룹이다.

```text
일반의약품 OTC
+ 같은 성분
+ 같은 함량
+ 같은 제형
+ 같은 투여경로
+ 허가 효능·용법이 실질적으로 같은 그룹
+ 여러 제조사/허가 회사 존재
+ 여러 ProductMaster/포장단위 존재
+ e약은요 또는 허가 원문 확인 가능
```

설명서 작성 단위는 ProductMaster 1건이 아니라 다음 그룹이다.

```text
성분 + 함량 + 제형 + 투여경로 + 허가 효능/용법
```

포장단위, 바코드, 병/PTP, 30정/100정/300정 차이는 설명서 분리 기준으로 삼지 않는다.

---

## 3. 제외 대상

이번 작업에서는 이미 작성한 그룹과 비대상 품목을 제외한다.

```text
에르도스테인 300mg 캡슐
세티리진염산염 10mg 정
알벤다졸 400mg 정
알마게이트 500mg 정
나프록센나트륨 275mg 정
트리메부틴말레산염 100mg 정
아세트아미노펜 500mg 정제
이부프로펜 400mg 정제
덱시부프로펜 300mg 연질캡슐
타이레놀 브랜드 중심 예시
부루펜 브랜드 중심 예시
처방의약품
건강기능식품
의료기기
의약외품
```

또한 다음은 제외 또는 후순위 검토한다.

```text
은행엽건조엑스 240mg 정: e약은요 0으로 초기 배치 제외
아세틸시스테인 200mg 캡슐: 유사 성분 혼입 위험이 있어 단일성분 검증 후에만 포함
복합제/플러스/추가성분 명칭 포함 그룹
함량·제형 혼재 그룹
OTC/RX 혼재 그룹
원문이 불충분한 그룹
```

---

## 4. 후보 선정 원칙

후보는 프로덕션 DB에서 read-only로 산출한다.

기본 정렬:

```text
제조사 수 DESC
→ ProductMaster 수 DESC
→ 포장단위 수 DESC
→ e약은요 보유 수 DESC
→ OTC 순도 100%
→ 단일성분 여부
→ 설명서 작성 난이도 낮은 그룹
```

그룹핑 키는 반드시 다음 축을 포함한다.

```text
성분
+ 함량
+ 제형
+ 투여경로
+ OTC/RX 구분
+ e약은요 itemSeq 또는 허가 원문 정합
```

주의:

- `ProductDrugExtension`의 임상 텍스트/성분 정규화 필드는 아직 설명서 SSOT가 아니다.
- 기존 pilot에서는 ProductMaster name/specification 파싱을 사용했으나, 20개 배치부터는 가능한 경우 e약은요 itemSeq 또는 허가 원문 정합을 함께 확인한다.
- O4O `specification`에는 `mg` 대신 `밀리그램` 표기가 있을 수 있다. 단위 표기 차이를 파싱에서 고려한다.

---

## 5. 기본 후보 풀

아래 후보는 시작점이다. 반드시 DB에서 재집계 후 최종 20개를 확정한다.

선행 CHECK의 다음 후보 및 후속 제안:

```text
파모티딘 10mg 정
로라타딘 10mg 정
비사코딜 5mg 정
구아이페네신 계열 단일성분 그룹
아세틸시스테인 200mg 캡슐  # 단일성분 검증 후
기타 제조사 수/ProductMaster 수/e약은요 보유 상위 clean OTC 그룹
```

추가 후보는 다음 기준으로 DB에서 산출한다.

```text
drug_category='otc'
+ source_type='mfds_easy_drug' 보유
+ 단일성분 의심
+ 함량/제형 명확
+ rx 혼입 0 우선
+ 제조사 수 높은 순
```

최종 20개는 CHECK 문서에 선정 이유와 교체 이유를 기록한다.

---

## 6. read-only 검증 기준

각 그룹별로 다음을 확인한다.

| 항목 | 확인 내용 |
| --- | --- |
| OTC 여부 | `drug_category='otc'` 기준, rx 혼입 여부 확인 |
| 성분 | name 괄호/원문/e약은요에서 성분 일치 확인 |
| 함량 | specification 또는 허가 원문 기준 확인 |
| 제형 | 정/캡슐/연질캡슐/시럽/과립 등 혼재 여부 확인 |
| 투여경로 | 내용상 경구/외용/점안 등 혼재 여부 확인 |
| 제조사 수 | distinct manufacturer_name |
| ProductMaster 수 | 그룹 내 master count |
| 포장단위 수 | distinct specification, 단 설명서 분리 기준 아님 |
| e약은요 | `SharedProductDescription` source_type='mfds_easy_drug' 보유 수 |
| 원문 | 효능·용법·주의·상호작용·보관 필드 확인 |
| 위험 요소 | 복합제, 함량 혼입, 제형 혼입, 전문약 혼입, 유사 성분 혼입 |
| 자동화 판정 | 자동 초안 가능 / 수동 검토 필요 / 제외 |

---

## 7. 설명서 작성 기준

각 설명서는 `O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1`을 따른다.

기본 형식:

```md
## [성분명] [함량] [제형]

| 항목 | 내용 |
|---|---|
| 성분 |  |
| 분류 | 일반의약품 |
| 작용 |  |
| 주요 증상 |  |
| 선택 포인트 |  |
| 주의 대상 |  |

**효능·효과**  
...

**복용 안내**  
...

**주의 대상**  
...

**성분 기준 선택**  
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.  
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.  
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.
```

문체 기준:

- 성분 중심
- 제품명/브랜드명 중심 금지
- 짧고 명확하게
- 약간 건조하되 소비자에게 이해 가능하게
- 질환명/증상명 회피 금지
- 약사 상담 연결
- 허위·과장 금지
- 치료 보장 금지
- 특정 카피제품 우월 표현 금지
- 하단 공통 문구 필수

---

## 8. 자동화 가능군 / 수동 검토군 분리

20개 그룹을 작성하면서 다음 분류를 반드시 남긴다.

| 판정 | 기준 |
| --- | --- |
| 자동 초안 가능 | OTC 100%, 단일성분, 함량/제형 명확, e약은요 충분, 원문 유사도 높음 |
| 약사 검토 강화 | 강한 경고, 임부/소아/고령자 주의, 상호작용 다수, 용법 복잡 |
| 수동 큐레이션 필요 | OTC/RX 혼재, 함량·제형 혼재, 복합제 혼입, 원문 불충분, 유사성분 혼입 |
| 제외 | 처방약, 건강기능식품, 의료기기, 의약외품, 원료/비시판 의심 |

이 분류는 다음 50개/100개 배치의 게이트로 사용한다.

---

## 9. 가이드 업데이트 기준

작업 중 다음이 발견되면 가이드를 additive로 보완한다.

```text
새 약효군에서 반복되는 문체/주의 기준
함량축·제형축·투여경로축 분리 사례
AI가 과도하게 안전 문구를 넣는 사례
질환명/증상명 회피 사례
약사 검수에서 반복 지적될 가능성이 높은 표현
강한 경고 표현 수위 기준
소아/임부/수유부/고령자 표현 기준
```

가이드 파일:

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
```

기존 내용을 삭제하지 말고 additive로 보완한다.

---

## 10. CHECK 문서 산출

작업 결과는 다음 문서로 저장한다.

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-20-GROUP-DRAFT-V1.md
```

CHECK 문서에는 다음을 포함한다.

1. 조사 일시
2. 시작 전 동기화 결과
3. 사용한 기준 문서
4. 제외한 그룹
5. 후보 산출 SQL/방식 요약
6. 최종 20개 그룹 선정표
7. 교체/제외 후보와 이유
8. 그룹별 제조사 수/ProductMaster 수/포장단위 수/e약은요 수
9. 그룹별 OTC 순도
10. 그룹별 단일성분/복합제 혼입 검증
11. 그룹별 ProductMaster 샘플
12. 원문/e약은요 확인 내용 요약
13. 설명서 초안 20개
14. 자동화 가능군/수동 검토군/제외군 분류
15. 가이드 업데이트 여부
16. 다음 50개 또는 100개 배치 제안
17. DB write 0 확인
18. GitHub 반영 경로와 commit SHA

---

## 11. GitHub 저장 원칙

이번 작업의 산출물은 로컬에만 남기지 않는다.

대상 저장소:

```text
https://github.com/Renagang21/o4o-platform
```

반드시 다음을 수행한다.

1. 문서 작성 후 GitHub `main`에 create/update
2. 등록 후 GitHub에서 fetch/read 확인
3. 최종 보고에 GitHub 경로와 commit SHA 포함
4. 웹 실행환경에서 `git push`가 실패하면 GitHub 앱/API로 직접 create/update
5. 다른 세션/작업자의 미커밋 변경은 건드리지 않음
6. 혼합 작업 트리에서 `git add -A` 사용 금지

---

## 12. 성공 기준

이번 작업은 다음을 만족하면 완료로 본다.

- 시작 전 저장소 동기화를 수행함
- 선행 가이드, 1개 pilot CHECK, 5개 그룹 CHECK를 읽고 반영함
- 카피제품 많은 OTC 성분·함량·제형 그룹 20개를 선정함
- 이미 작성한 6개 그룹 및 해열진통제 예시 그룹을 제외함
- 각 그룹의 제조사 수/ProductMaster 수/포장단위 수/e약은요 수를 기록함
- 각 그룹의 OTC 순도와 단일성분성을 확인함
- 함량·제형·투여경로 혼재를 검증함
- 성분 중심 설명서 초안 20개를 작성함
- 자동화 가능군/수동 검토군/제외군을 분류함
- 필요 시 가이드 문서를 additive로 보완함
- DB write 없이 read-only + 문서 산출로 종료함
- GitHub `main`에 산출물을 반영하고 fetch 확인함

---

## 13. 후속 작업

이 작업 결과가 적절하면 다음 중 하나로 확장한다.

```text
WO-O4O-DRUG-OTC-DESCRIPTION-50-GROUP-DRAFT-V1
WO-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-DRAFT-V1
```

후속 작업 판단 기준:

| 조건 | 다음 단계 |
| --- | --- |
| 20개 중 자동 초안 가능군이 대부분이고 검수 이슈가 작음 | 100개 그룹 배치 가능 |
| 약효군별 표현 기준 보완이 다수 필요 | 50개 그룹으로 완만 확장 |
| 복합제/함량/제형 혼재 이슈가 많음 | 그룹핑 키 정규화 WO 선행 |
| e약은요 원문 부족이 다수 | 원천 확보/허가 원문 정규화 WO 선행 |

대량 적용은 여전히 별도 승인 대상이다. 이번 작업은 설명서 초안 생성과 문서 검증까지만 수행한다.
