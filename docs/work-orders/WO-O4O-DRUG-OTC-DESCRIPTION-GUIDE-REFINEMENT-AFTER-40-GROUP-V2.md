# WO-O4O-DRUG-OTC-DESCRIPTION-GUIDE-REFINEMENT-AFTER-40-GROUP-V2

> Status: DONE (2026-07-07) — commit `c2a702e66`
> 결과: [`CHECK-O4O-DRUG-OTC-DESCRIPTION-GUIDE-REFINEMENT-AFTER-40-GROUP-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GUIDE-REFINEMENT-AFTER-40-GROUP-V1.md)
> 대상 가이드: [`O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1`](../guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md) (§3.7~§3.9 additive)

## 0. 작업 목적

이 작업은 O4O 의약품 OTC 매장용 설명서 작성 가이드를 보완하는 작업이다.

50그룹 설명서 작성 WO는 품질 우선 기준으로 최종 40개 그룹 작성으로 조정되었다. 그 과정에서 다음 3가지 보완 필요 사항이 확인되었다.

1. 성분 표기변형 정규화 기준 필요
2. e약은요 원문이 있어도 근거가 약한 그룹 처리 기준 필요
3. 민감 약효군에 대한 별도 프레이밍 기준 필요

이번 작업은 신규 설명서 작성이 아니다.
이번 작업은 위 3개 기준을 `O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md`에 additive로 반영하고, CHECK 문서로 결과를 남기는 작업이다.

---

## 1. 현재까지의 작업 흐름

1. 의약품 O4O DB 구조 정비 완료
2. e약은요 기반 `SharedProductDescription` 파생 완료
3. 의약품 매장용 설명서는 제품명 기준이 아니라 `성분 + 함량 + 제형 + 투여경로` 기준으로 작성하기로 결정
4. 파일럿 1개 그룹 작성
5. 5개 그룹 dry-run 작성
6. 20개 그룹 dry-run 작성
7. 50개 그룹 WO 진행
8. 50개 그룹 WO는 품질 기준에 따라 최종 40개 그룹으로 조정

이번 작업은 8번 결과에서 발견된 기준 보완 사항을 가이드에 반영하는 것이다.

---

## 2. 중요한 정책 결정

### 2.1 설명서 작성 대상

대상: 일반의약품 OTC / 약국 내 매장용 설명서 / 약국·약사 상담 맥락에서 쓰는 설명서.

제외: 처방의약품 / 건강기능식품 / 의료기기 / 의약외품 / 그룹 기준 불명확한 복합제 / 원문 근거 부족 상태에서 AI가 임의 보강한 설명.

### 2.2 설명서 그룹 기준

제품명·브랜드명이 아니라 `성분 + 함량 + 제형 + 투여경로 + OTC/RX 여부`. 포장단위·바코드·병/PTP·낱알 수량 차이는 설명서 분리 기준이 아니다.

### 2.3 O4O DB 계층 침범 금지

금지: DB write / `ProductDrugExtension` 임상 텍스트 입력 / `SharedProductDescription` insert·update / canonical 승격 / 매장 콘텐츠 생성 / QR·POP·태블릿 연결 / 신규 설명서 작성.

---

## 3. 선행 결과 요약

### 3.1 20그룹 dry-run 핵심 발견

`제형명만으로 투여경로를 판단하면 안 된다`. 예: 클로트리마졸 100mg 정 = 질정. 그룹핑에 `투여경로` 축 필수.

### 3.2 50그룹 WO의 실제 결과

최종 40개 그룹 작성, 40개 전부 100% OTC·단일성분·경구, e약은요 원문 전부 확보, DB write 0.

자동화 분류: 자동 초안 가능 24 / 약사 검토 강화 14 / 수동 큐레이션 2 / 제외 0.
수동 큐레이션 예: 데소게스트렐 경구피임약 / 아르기닌티디아시케이트 저 grounding.

### 3.3 40개로 조정된 이유

기 작성 26개 제외 시 이름 파싱 기준 clean 단일성분 OTC 풀이 제조사 4개 이상 구간에서 ~36–40개로 소진. 남은 후보는 표기변형 중복 / 저카피 꼬리 / 원문 근거 부족 / 민감 약효군.

---

## 4. 수정 대상 파일

- 가이드: `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md`
- CHECK: `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GUIDE-REFINEMENT-AFTER-40-GROUP-V1.md`
- 참고 선행 CHECK: 50-GROUP / 20-GROUP / TEMPLATE-AND-5-GROUP / ONE-GROUP-PILOT

---

## 5. 추가 내용 1 — 성분 표기변형 정규화

이름 파싱만으로는 같은 성분이 다르게 집계됨(말레인산트리메부틴=트리메부틴말레산염, 염산세티리진=세티리진염산염, 덱시부프로펜디.씨=덱시부프로펜, 엘-카르니틴=엘카르니틴).

정규화 우선순위: itemSeq/item identifier → MFDS 품목기준코드/주성분코드 → 허가 주성분명 → 표기변형 사전 → 상품명 괄호 파싱(보조). 표기변형 병합해도 함량·제형·투여경로·OTC/RX 다르면 그룹 분리.

---

## 6. 추가 내용 2 — 저 grounding 그룹 처리

자동 초안 조건: 효능·효과 / 복용·사용법 / 주의 대상 / 성분 작용 설명 근거 확인. 부족 시 약사 검토 강화 / 수동 큐레이션 / 보류. **근거 부족 시 AI 일반 약리 지식 임의 보강 금지.**

---

## 7. 추가 내용 3 — 민감 약효군 프레이밍

민감 약효군: 경구피임약 / 수면유도제 / 항혈전·저용량 아스피린 / 질정·질내 삽입제 / 강한 NSAID / 철분제 / 간·담도계 약물. clean 데이터라도 기본값 `약사 검토 강화`.

질환명·증상명·목적 회피 안 함. 피해야 할 표현: "안심하고 복용" / "부담 없이 사용" / "누구나 사용 가능" / "치료 가능" 등. 복용 조건·주의 대상·상담 필요 조건 명확히.

---

## 8. 수정 방식

기존 §3.6(투여경로축) 뒤에 §3.7 성분 표기변형 정규화 / §3.8 저 grounding 그룹 처리 / §3.9 민감 약효군 프레이밍 추가. 기존 예시·원칙 삭제 금지, additive.

---

## 9. CHECK 문서 작성 기준

`docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GUIDE-REFINEMENT-AFTER-40-GROUP-V1.md` 생성. 금지사항 준수(DB write 0 / SharedProductDescription 0 / ProductDrugExtension 0 / canonical 0 / 매장 연결 0 / 신규 설명서 0) 기록.

---

## 10. 완료 기준

가이드 3개 기준 추가 / 기존 내용 삭제 없음 / 신규 설명서 없음 / DB write 없음 / CHECK 생성 / 100그룹 확장 전 조건 정리.

---

## 11. 완료 보고 (실적)

- 수정: 가이드 §3.7~§3.9 additive + CHECK 신규
- 반영: 성분 표기변형 정규화 / 저 grounding 그룹 처리 / 민감 약효군 프레이밍
- 금지사항 준수: DB write 0 · SharedProductDescription 0 · ProductDrugExtension 0 · canonical 0 · 매장 연결 0 · 신규 설명서 0
- commit `c2a702e66`

---

## 12. 후속 작업

`WO-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-DRAFT-V1` — 아래 조건 충족 후 진행:

- itemSeq/주성분코드 기반 그룹핑 정규화
- 투여경로 사전 필터
- 함량축 RX 필터
- 표기변형 중복 제거
- 민감 약효군 기본 분류
- 저 grounding 그룹 보류 기준
