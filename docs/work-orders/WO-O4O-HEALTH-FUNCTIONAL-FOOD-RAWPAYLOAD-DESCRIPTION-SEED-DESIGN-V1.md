# WO-O4O-HEALTH-FUNCTIONAL-FOOD-RAWPAYLOAD-DESCRIPTION-SEED-DESIGN-V1

> 작업 성격: **설계/가이드 문서 (read-only).** DB write 0, AI 생성 apply 0, ProductMaster/ProductIdentifier/SharedProductDescription 생성 0, 코드 변경 0. 문서만.
> 작성일: 2026-07-04 · 트랙: **건강기능식품 전용**
> 선행: Gate A apply 44,885 완료([`APPLY-RUNBOOK §9`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-APPLY-RUNBOOK-V1.md)) · admin 필터/검색 + browser smoke([`CHECK-...-SOURCE-FILTER-AND-SEARCH-V1`](../checks/CHECK-O4O-ADMIN-PUBLIC-PRODUCT-CANDIDATE-SOURCE-FILTER-AND-SEARCH-V1.md)) · Gate B HOLD([`GATE-B-PREREQUISITE-SOURCE-AUDIT`](../checks/CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-GATE-B-PREREQUISITE-SOURCE-AUDIT-V1.md))
> 정렬: [`O4O-AI-USAGE-FLOW-BASELINE-V1`](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md) (HUB 선택·복사 → AI 정리·생성 → Execution)

> ⚠️ **면책**: 본 문서는 **엔지니어링 설계 가이드**이며 법무/약무 유권해석이 아니다. 기능성 표현 규제 판단은 실제 매장 노출 전 **약무/법무 검토**를 반드시 거친다. 본 문서의 금지·완화 규칙은 그 검토를 돕기 위한 1차 가드레일이다.

---

## 0. 목적 / 범위

건강기능식품 ProductCandidate `raw_payload` 의 공공 원문 필드(`MAIN_FNCTN` / `INTAKE_HINT1` / `BASE_STANDARD` / `SRV_USE` / `PRDUCT` / `ENTRPS` 등)를 **향후 매장용 설명서 제작에 쓸 seed 구조와 문장화·검수 기준**으로 설계한다.

- ProductMaster 부재 → **SharedProductDescription 파생 경로 사용 안 함**(master 기반이라 대상 0). candidate `raw_payload` 를 직접 seed 원천으로 본다.
- 이번 단계는 **설계/가이드만**. seed 저장·AI 생성·매장 노출은 후속(별도 승인).
- **공공 원문 ≠ 매장 설명** — 원문을 그대로 홍보 문구로 쓰지 않는다(§4, §5).

---

## 1. AI 사용 흐름상 위치 (baseline 정렬)

[`O4O-AI-USAGE-FLOW-BASELINE-V1`](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md) 3레이어 기준:

```
[Source material]  건기식 candidate raw_payload (공공 원문)   ← 본 설계의 대상
   → (HUB 선택·복사 대신) seed 정규화
   → [AI] 정리·생성 (매장 설명 초안)   ← 기능성 표현 검수 게이트(§5) 통과 필수
   → [Execution] 상품 상세 설명 / POP / 블로그   ← 약무·법무 검토 후 노출
```

→ rawPayload 는 **AI 정리·생성의 입력 원천**이다. 매장 설명은 이 원천을 **정규화 + 검수 게이트**를 거쳐 생성한다. 원문 직노출 금지.

---

## 2. 입력 필드 인벤토리 & 설명 seed 매핑

`raw_payload.source` 11필드(전량 dry-run 확정, 존재율):

| 필드 | 의미 | 존재율 | 설명 seed 용도 | 규제 민감도 |
|---|---|---:|---|:---:|
| `PRDUCT` | 제품명(trim) | 100% | 제목/식별 | 낮음 |
| `ENTRPS` | 업체명 | 100% | 제조/판매원 표기 | 낮음 |
| `MAIN_FNCTN` | **주된 기능성** | 99.93% | **기능성 안내(핵심 규제 대상)** | **최고** |
| `SRV_USE` | 섭취방법/용도 | 99.10% | 섭취 안내(실용) | 중 |
| `INTAKE_HINT1` | 섭취 시 주의사항 | 96.29% | **주의·안전 안내(보존 권장)** | 높음(안전) |
| `BASE_STANDARD` | 기준·규격 | 99.99% | 성분/함량 참고(정제 필요) | 중 |
| `SUNGSANG` | 성상 | 99.96% | 형태 설명(보조) | 낮음 |
| `DISTB_PD` | 유통기한 | 100% | 실용 정보 | 낮음 |
| `PRSRV_PD` | 보관조건 | 99.08% | 실용 정보 | 낮음 |
| `STTEMNT_NO` | 품목제조신고번호 | 100% | 신뢰 근거(신고번호 표기) | 낮음 |
| `REGIST_DT` | 등록일자 | 100% | 메타(비노출) | 낮음 |

원칙: **낮음 = 거의 원문 사용 가능 / 중 = 정규화 후 사용 / 높음·최고 = 검수 게이트 필수**.

---

## 3. Description Seed 구조 (개념 설계 — 저장 아님)

seed 는 "원문 보존 + 구조화" 계층이며 매장 문구가 아니다. 제안 개념 구조(향후 파서가 rawPayload 에서 파생, **이번엔 미구현**):

```jsonc
descriptionSeed = {
  productName:   trim(PRDUCT),
  manufacturer:  trim(ENTRPS),
  reportNo:      STTEMNT_NO,                 // 신뢰 근거 표기용
  functionalClaims: [                        // MAIN_FNCTN 을 항목 분리 (⑴⑵… 파싱)
    { raw: "면역력 증진에 도움을 줄 수 있음", claimTier: "physiological", verbatim: true },
    ...
  ],
  intakeGuide:   normalize(SRV_USE),         // 섭취방법
  cautions:      normalize(INTAKE_HINT1),    // 주의사항 — 안전정보, 보존 우선
  spec:          extract(BASE_STANDARD),     // 성분/함량 참고(원문 규격에서 추출)
  form:          SUNGSANG,                   // 성상
  storage:       PRSRV_PD, shelfLife: DISTB_PD,
  sourceMeta:    { agency:"MFDS", dataset:"건강기능식품정보", sourceKind:"health_functional_food", collectedAt },
  reviewFlags:   [...]                        // §9
}
```

- `functionalClaims[].verbatim=true`: **식약처 인정 문구 원문 유지**가 기본. 생성 단계에서 어미·의미 강화 금지(§5).
- seed 는 **candidate 밖에 별도 테이블을 만들지 않는다**(이번 범위 아님). 필요 시 후속에서 candidate `raw_payload.derivedDescriptionSeed` 로 보존하는 안 검토(그것도 apply 승인 필요).

---

## 4. 공공 원문 ≠ 매장 설명 (2단계 분리)

| 단계 | 산출 | 원칙 |
|---|---|---|
| A. seed 정규화 | 원문 → 구조화 seed | **무손실 보존** + 항목 분리 + 잡음(개행/번호) 정리. 의미 변형 금지 |
| B. 매장 설명 생성 | seed → 매장 문구(AI) | **검수 게이트(§5) 통과분만**. 기능성은 인정 문구 인용 형태로만 |

- A 는 사실 정리(변형 없음), B 는 표현 생성(규제 적용). 둘을 섞지 않는다.
- 의약품 트랙의 `officialConsumerText`(공식 설명 원문 별도 보존, Store 설명과 분리) 원칙과 동일 계열.

---

## 5. 기능성 표현(MAIN_FNCTN) 검수 기준 — 핵심

### 5.1 규제 배경 (요지)
건강기능식품 표시·광고는 「건강기능식품에 관한 법률」·「식품등의 표시·광고에 관한 법률」의 적용을 받는다. 통상 다음이 **금지**된다:
- **질병의 예방·치료·완치** 를 표방하는 표현
- **의약품으로 오인·혼동** 시키는 표현
- **과대·과장**, 최상급·단정, 소비자 **기만**
- **식약처가 인정한 기능성 범위를 초과**하는 기능 표현

→ 따라서 매장 설명의 기능성 부분은 **식약처 인정 문구(MAIN_FNCTN)를 벗어나거나 강화해서는 안 된다.**

### 5.2 원문 보존 원칙 (verbatim)
- 인정 기능성 문구의 **어미를 유지**: 예 "…**도움을 줄 수 있음**" 을 "…된다 / …좋아진다 / …낫는다 / …효과가 있다" 로 **강화 금지**.
- 인용 형태 권장: `제조사가 신고한 기능성: "○○에 도움을 줄 수 있음"` 처럼 **원문 인용 + 출처 맥락**.
- MAIN_FNCTN 에 없는 기능·효능을 **추가 금지**.

### 5.3 MAIN_FNCTN 파싱 규칙
- 실데이터는 `⑴ … \n ⑵ …` 번호매김 + 개행 구조(예: 홍삼의 5개 기능성). → **항목 단위 분리**(각 항목 = 1 claim).
- 개행/전각기호(⑴⑵) 정리, 항목 텍스트는 **의미 변형 없이** 보존.
- **결측 31건(MAIN_FUNCTION_MISSING)**: functionalClaims=[] → 매장 설명에서 **기능성 블록 생략**(빈 값 창작 금지).

---

## 6. 금지 / 주의 표현 카탈로그 (매장 생성 검수용)

| # | 유형 | 금지 예시 | 안전 대체/원칙 |
|---|---|---|---|
| 1 | 질병 예방·치료 | "감기 예방", "혈압을 낮춘다", "암/당뇨/코로나에 효과" | 질병명 + 치료·예방 동사 결합 **차단**. 인정 기능성 문구만 인용 |
| 2 | 의약품 오인 | "약", "특효", "처방", "복용" | "섭취", "건강기능식품" 표기. 의약품 용어 배제 |
| 3 | 과대·최상급 | "최고", "100%", "완벽", "즉시", "확실한 효과", "부작용 없음" | 단정·최상급·안전성 단정 **차단** |
| 4 | 인정범위 초과 | MAIN_FNCTN 에 없는 기능 추가 | functionalClaims 목록 밖 표현 **차단** |
| 5 | 효과 단정(어미 강화) | "…된다 / 낫는다 / 좋아진다" | 인정 어미 "…도움을 줄 수 있음" 보존 |
| 6 | 환자 타겟팅 | "고혈압 환자에게", "당뇨 있으면" | 특정 질환자 대상 소구 **차단** |
| 7 | 체험·추천 오인 | "먹고 나았다" 류 | 후기·단정 효과 **차단**(별도 후기 정책) |

> 구현 시: (a) 금지 키워드/패턴 사전 + (b) functionalClaims 화이트리스트(인정 문구) 이중 게이트. 위반 시 생성 차단·플래그.

### 6.1 안전(주의) 정보는 반대로 보존
`INTAKE_HINT1`(섭취 주의사항)은 **소비자 안전 정보**다 → 축약·삭제보다 **보존·표기 우선**. "이상사례 시 섭취 중단·전문가 상담", 알레르기·의약품 병용 주의 등은 매장 설명에 **유지**하도록 seed 에서 강조.

---

## 7. 검수 게이트 파이프라인 (설계 — 이번 write 없음)

```
raw_payload
 → [A] seedNormalize (무손실 파싱: MAIN_FNCTN 항목분리, cautions 보존)   ← read-only 파서 dry-run(후속, 무저장)
 → [B] claimGuard (금지패턴 + 인정문구 화이트리스트 검수)               ← 룰셋(후속)
 → [C] AI 생성 (검수 통과 seed → 매장 초안)                            ← 별도 승인, 약무·법무 검토
 → [Execution] 상품 상세/POP/블로그                                     ← 노출
```
- 본 WO 는 **[A]~[B] 의 설계 기준**까지. [A] 파서 dry-run·[B] 룰셋·[C] 생성은 각각 별도 WO + 승인.

---

## 8. reviewFlags 활용 (Gate A 적재분 기존 플래그)
- `MAIN_FUNCTION_MISSING`(31) → 기능성 블록 생략 대상.
- `INTAKE_HINT_MISSING`(1,663) → 주의문구 원천 없음 → 매장 설명에 **일반 주의 문구 폴백** 또는 표기 생략(창작 금지).
- `PRESERVATION_MISSING`(415) → 보관 정보 생략.
- `SKU_IDENTIFIER_MISSING`(전건) → 상거래 식별자 없음(설명 seed 와 무관, Gate B 사유).

---

## 9. 준수 확인 (read-only)

| 항목 | 결과 |
|---|---|
| DB write / apply | 0 |
| AI 생성 apply | 0 |
| ProductMaster/ProductIdentifier/SharedProductDescription 생성 | 0 |
| 코드 변경 | 0 (설계 문서만) |
| raw 대량 처리 | 0 |
| 병렬 세션 파일 수정 | 0 |
| 범위 확장(의약품/의약외품/의료기기) | 0 |

이번 변경 = 본 설계 문서 1건.

---

## 10. 다음 단계 (건강기능식품 트랙, 순서)

1. **본 설계 승인** (특히 §5·§6 검수 기준을 약무/법무 관점에서 확인).
2. **seedNormalize 파서 dry-run** — rawPayload → descriptionSeed 무손실 파싱(MAIN_FNCTN 항목분리·cautions 보존) offline dry-run(무저장).
3. **claimGuard 룰셋 구현** — 금지패턴 사전 + 인정문구 화이트리스트 이중 게이트(단위 테스트).
4. **AI 매장 설명 생성 파일럿** — 검수 통과 seed 소량으로 초안 생성, 약무·법무 검토(별도 승인).
5. (선택) seed 를 candidate `raw_payload.derivedDescriptionSeed` 로 보존할지 결정(apply 승인 필요).

> ProductMaster 승격(Gate B)은 계속 HOLD(barcode/상태 원천 부재, 별도 audit 확정). 본 설계는 **Master 없이 candidate rawPayload 만으로 매장 설명 seed** 를 안전하게 준비하는 경로다.

---

## 11. 결론

**건강기능식품 candidate `raw_payload` 를 매장 설명 seed 로 쓰는 구조와 문장화·검수 기준을 설계했다. 핵심은 (1) 공공 원문 ≠ 매장 설명 2단계 분리, (2) `MAIN_FNCTN` 은 식약처 인정 기능성 문구이므로 원문 어미 보존·강화 금지·인정범위 초과 금지, (3) 질병 예방·치료·의약품 오인·과대·최상급 표현 금지 카탈로그(§6), (4) `INTAKE_HINT1` 안전정보는 반대로 보존, (5) SharedProductDescription(Master 기반) 대신 candidate rawPayload 직접 seed. 저장·생성·노출은 전부 후속 승인 대상이며, 매장 노출 전 약무·법무 검토가 필수다.**
