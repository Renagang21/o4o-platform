# route 예외 673 일괄 판정 규칙 (agent-na)

WO-O4O-OTC-EASY-DRUG-V4-ROUTE-EXCEPTION-673-BULK-RESOLUTION-V1

**성격**: READ-ONLY 판정. LIVE 생산·DB write 0. 규칙을 먼저 확정하고 673 전건에 일괄 적용한다.
**결정론**: 동일 입력·동일 DB 상태에서 2회 실행 byte-identical (LLM 판단 개입 없음 — 전량 규칙 기반).

---

## 0. 불변 원칙

- **제품명은 판정에 사용하지 않는다.** 기록만 하며, 전 행 `productNameUsedInDecision: false` 로 명시하고 독립검증이 확인한다.
- **타 master 의 route 를 대표값으로 쓰지 않는다.** 판정은 master 자기 공식 원문·자기 표준코드만 본다.
- **frozen 계약(`otc-v4-master-leaflet-contract.ga.ts`)은 수정하지 않는다.** 본 판정기는 더 넓은 부위·동사 어휘를 자체 정의해 쓴다.
- **상충 시 임의 선택 금지.** 후보는 `conflictingCandidates` 에 남기고 `resolvedRoute` 는 null 로 둔다.

---

## 1. 근거 축과 우선순위

| 순위 | 축 | 데이터 출처 |
|:---:|---|---|
| 1 | 공식 용법·용량 원문 | `shared_product_descriptions` (source_type=`mfds_easy_drug`) 6섹션 파싱 |
| 2 | 공식 효능·효과 원문 | 같음 |
| 3 | 제형구분 | 품목 표준코드 `raw_payload->source->>'제형구분'` |
| 4 | 기타 섹션 부위·동사 | 경고 / 사용상 주의사항 / 이상반응 / 상호작용 |
| 5 | 품목 표준코드 ATC | `raw_payload->source->>'국제표준코드(ATC코드)'` |
| 6 | 기존 composer 계약 | 지원 route 집합 |

### 제형구분에 대한 실측 주의

`제형구분` 은 실제로 **포장 단위와 제형이 혼재된 값**이다(673 실측 분포: 개 509 · 통 154 · 매 120 · 포 31 · 앰플 29 · 정 14 · 주사 12 · 산제 8 · 기타 3 · 크림 2 · 겔 2, 그리고 전 master 에 null 행도 존재).
→ route 힌트가 명확한 값(**크림·겔·매** → topical, **정·산제·포** → oral)만 쓰고 나머지는 근거로 삼지 않는다.

### ATC → route 매핑 (명확한 것만)

| ATC | route | 근거 |
|---|---|---|
| D02·D04·D05·D06·D08·D09·D10·D11 | topical | 피부과용 |
| M02 | topical | 국소 근골격 통증 |
| S01 / S02 | ophthalmic / otic | 안과용 / 이과용 |
| R01 / R02 / R03 | nasal / oromucosal / inhalation | 비강 / 인후 / 흡입 기도 |
| A01 | oromucosal | 구강용 |
| G01 | vaginal | 부인과 항감염 |
| A02~A07 · N02 · N05 · M01 · R05 · R06 | oral | 전신·경구 계열 |
| 그 외 (V07 · B05 등) | **매핑하지 않음** | route 특정 불가 |

---

## 2. 결정 규칙 (적용 순서 고정)

```
S0  전문일반구분에 '전문' 포함              → EXCLUDE_CONFIRMED
S0' 표준코드 전건 취소(취소일자 존재+제형 부재) → EXCLUDE_CONFIRMED
S0" 공식 원문 부재                          → HOLD_UNRESOLVED

S1  용법 원문의 비경구 부위·동사가 정확히 1개  → 그 route 채택
S1' 용법 원문에 비경구 0 + 경구 동사 존재      → oral 채택
S1" 용법 원문의 비경구 후보가 2개 이상
      → 효능·ATC·제형과 교차해 1개로 좁혀지면 채택
      → 좁혀지지 않으면 TRUE_MULTI_ROUTE (단일 composer 강제 편입 금지)

S2  용법에서 미결 + 효능 원문의 비경구 부위가 정확히 1개 → 그 route 채택

S3  위에서 미결 → 보조 축(제형 / 기타 섹션 / ATC) 투표
      2개 이상 축이 같은 route 로 합치         → 채택
      ATC 단독만 존재                          → HOLD_UNRESOLVED (단독 확정 금지)
      서로 다른 route 로 갈림                   → ROUTE_SOURCE_CONFLICT
      아무 축도 없음                            → HOLD_UNRESOLVED

S4  채택된 route 가 ATC 와 상충하고, 매핑 관계도 아니면 → ROUTE_SOURCE_CONFLICT (resolvedRoute=null)

S5  채택 route ∈ {oral, topical, ophthalmic, oromucosal, vaginal} → RECOVERABLE_ROUTE_CONFIRMED
S5' 채택 route ∈ {nasal, rectal, otic, inhalation}              → REQUIRES_ROUTE_PROFILE
```

---

## 3. 원인별 묶음과 적용 결과

| 원인 묶음 | 규칙 | 결과 |
|---|---|---|
| 도포·환부·외용 표현 | S1 topical | RECOVERABLE 496 |
| 구강 내·인후 사용 | S1/S2 oromucosal (ATC R02·A01 교차) | RECOVERABLE 39 |
| 비강 사용 | S1 nasal → 미지원 profile | REQUIRES_ROUTE_PROFILE 14 |
| 직장·좌약 | S1 rectal → 미지원 profile | REQUIRES_ROUTE_PROFILE 12 |
| 복수 부위 동시 기재 | S1" 교차 실패 | TRUE_MULTI_ROUTE 46 |
| 제형·ATC·원문 상충 | S3/S4 | ROUTE_SOURCE_CONFLICT 31 |
| 원문 자체 모호 / ATC 단독 | S0"·S3 | HOLD_UNRESOLVED 35 |

점안·질내·경구 단독 묶음은 이 673 집합에서 별도 잔여로 남지 않았다(각각 topical·oromucosal 묶음 또는 상충·다중 묶음으로 흡수).

---

## 4. 기존 profile 매핑 참고 정보 (자동 편입 아님)

`REQUIRES_ROUTE_PROFILE` 26건 중 **14건(nasal)** 은 기존 `topical` profile 로 매핑 가능한 선례가 있다.
근거: next2000 LIVE 에서 비강 스프레이·분무 흡입액이 topical profile 로 생산되어 독립검증을 통과했다
(frozen resolver 의 topical 정규식이 `뿌리|분무` 를 포함하기 때문).

그러나 본 WO 는 "현재 composer 가 없는 route 는 REQUIRES_ROUTE_PROFILE" 을 명시하므로 **자동 편입하지 않았다.**
`mappableToExistingProfile` 필드에 참고 정보로만 기록하고, 편입 여부는 후속 판단에 남긴다.

`rectal` 12건은 매핑 대상으로 표시하지 않았다 — 좌약 삽입 절차는 topical 도포 안내와 사용법이 실질적으로 다르다.

---

## 5. 산출물

| 파일 | 내용 |
|---|---|
| `otc-v4-route-673-resolution-ledger.na.json` | 673 전건 판정 + 축별 근거 |
| `otc-v4-route-673-agent-ga-reentry.na.json` | RECOVERABLE 535 재투입 원장 |
| `otc-v4-route-673-hold-ledger.na.json` | 비-RECOVERABLE 138 + 매핑 참고 |
| `otc-v4-route-673-independent-verification.na.json` | 독립검증 20게이트 |
