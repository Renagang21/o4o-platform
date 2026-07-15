# CHECK-O4O-OTC-ROUTE-SIGNAL-ENRICHMENT-V1 — 투여경로 신호 보강 (조사·파생 로직)

WO: `WO-O4O-OTC-ROUTE-SIGNAL-ENRICHMENT-V1` · 일자: 2026-07-16 · 상태: 완료
규칙: **DR-019**(투여경로) · **DR-010**(group_key 규격) · **G-01**(질정 경구 표현 금지)

> **조사 + 파생 로직까지.** DB write **0** · migration **0** · 컬럼 추가 **0** · 초안 수정 **0** · 승격 **0**.
> DB 컬럼이 필요한 부분은 구현하지 않고 후속 WO 로 분리했다(§7).

---

## 1. 결론

> **경로 신호는 이미 데이터에 있다 — 다만 `doseForm` 이 아니다.**
> 95건 전수 파생 결과 **oral 94 / vaginal 1 · `needs_review` 0 · usageLabel 불일치 0**.
> P4 클로트리마졸 질정 = **`vaginal`**, 일반 경구정 = **`oral`** 로 정확히 갈렸다 — **둘 다 `doseForm='정'` 인데도**.
> 소비자 HTML 95건 **회귀 0**. 테스트 **42/42**.

---

## 2. 조사 — 신호별 판별력 (95건 전수)

| 신호 | 분포 | 판별력 |
|---|---|---|
| **`usageLabel`** | `복용 안내` **94** / `사용 안내` **1** | ✅ **경구/비경구를 정확히 가름**. 작성자가 §3.6 규칙에 따라 고른 **저작 신호**(추정 아님) |
| **`groupKey` route 축** | `drug_otc::combo::oral::A06AB52` 형식 **29건**(route 축 있음) / `성분\|함량\|제형` 형식 **66건**(route 축 **없음**) | ✅ 있으면 최우선 명시값. **단 66건엔 부재** |
| `summaryTable.성분` · 제목 | `(질정)` 등 명시 제형 토큰 | ✅ 비경구의 **구체 경로** 확정에 유효 |
| **`doseForm`** | 정 38 · **tablet 15** · 캡슐 15 · **soft_capsule 7** · 연질캡슐 13 · **null 6** · liquid 1 | ❌ **경로 정보 없음 + 값 불일치**(한글·영문 혼재·null). 질정과 경구정이 **같은 `정`** |
| 본문 키워드 | rectal 히트 2 · vaginal 1 | ❌ **오탐 실증** — §2-1 |

### 2-1. 본문 키워드 매칭이 위험한 실증

| 제품 | 히트 | 실제 |
|---|---|---|
| **디오스민 600mg 정** | `항문` → rectal | **경구정**. 문구는 "증상이 나아지지 않으면 **항문검사**를 받거나 약사와 상의합니다" |
| **디오스민 300mg 캡슐** | `항문` → rectal | **경구캡슐**. 동일 |

> 키워드로 자동 분류했다면 **경구 정맥순환제 2건이 rectal 로 오분류**됐다. → **본문 서술은 경로 근거로 쓰지 않는다.**

### 2-2. `groupKey` 는 두 형식이 공존한다

```text
drug_otc::combo::oral::A06AB52    ← 29건 (combo 초안) : DR-010 규격, route 축 있음
에르도스테인|300밀리그램|캡슐        ← 66건 (single 초안) : 성분|함량|제형, route 축 없음
```

> **DR-010 의 group_key 규격(route 포함)이 combo 초안에만 적용돼 있다.** single 초안 66건은 route 축이 없다 — 데이터 불균일이며 후속 정비 대상(§7).

---

## 3. 파생 로직 (확정)

### 3-1. 우선순위

```text
1. groupKey route 축 (drug_otc::…::{route}::…)        → 명시값, 최우선
2. usageLabel = '복용 안내'                            → oral      (작성자 저작 신호)
   usageLabel = '사용 안내'                            → 비경구 확정, 구체 경로는 3 으로
3. 성분·제목의 명시적 제형 토큰(질정·좌제·점안액·연고·플라스타·흡입액…) → 구체 경로

근거 없음 → route=null, basis='needs_review'  (추정하지 않는다)
```

**금지 입력**: `doseForm` · 본문(usage/caution) 키워드 · `translatorNote`(CR-021 — 주석을 값으로 자동 저장하지 않음).

### 3-2. 최소 경로값

`oral` · `vaginal` · `topical` · `ophthalmic` · `rectal` · `inhalation` · `transdermal`

### 3-3. `usageLabel` 결정 규칙

| route | `usageLabel` |
|---|---|
| `oral` | **복용 안내** |
| 그 외 전부 | **사용 안내** |

파생값 `expectedUsageLabel` 과 초안의 `usageLabel` 이 다르면 `usageLabelMismatch=true` → 검토 대상.

### 3-4. 모순 감지 (자동 확정하지 않음)

| 상황 | 처리 |
|---|---|
| `groupKey route` ↔ 제형 토큰 불일치 | `needs_review` |
| `usageLabel='복용 안내'` 인데 비경구 제형 토큰 | `needs_review` + `usageLabelMismatch` |
| `usageLabel='사용 안내'` 인데 제형 토큰 없음 | `needs_review` (비경구인 건 알지만 **구체 경로는 추정 안 함**) |

### 3-5. 구현 (DB 없음)

| 파일 | 내용 |
|---|---|
| `modules/neture/drug-import/drug-otc-route.ts` (**신규**) | `deriveOtcRoute(src) → { route, basis, reason, expectedUsageLabel, usageLabelMismatch }` |
| `drug-otc-translation-input.ts` (**additive**) | 번역 입력 `meta.route` 에 파생값 노출 → 번역자가 `take`/`insert` 를 이 값으로 결정(G-01) |

---

## 4. 검증

### 4-1. 95건 전수 route 분포

| route | 건수 |
|---|---:|
| **`oral`** | **94** |
| **`vaginal`** | **1** |
| **`needs_review`** | **0** |

| 판별 근거 | 건수 |
|---|---:|
| `group_key` (route 축 명시) | **29** |
| `usage_label` (복용 안내) | **65** |
| `form_token` (사용 안내 + 질정) | **1** |

- **불명확 대상 0건** — 95건 모두 명시 신호로 확정됐다. 추정한 건은 **없다**.
- **`usageLabel` 불일치 0건** — 초안의 라벨이 파생 경로와 전부 일치.

### 4-2. 요구 검증 항목

| 항목 | 결과 |
|---|---|
| **P4 클로트리마졸 질정 → `vaginal`** | ✅ `basis=form_token` (`usageLabel='사용 안내'` + 제형 토큰 `질정`). **`doseForm='정'` 미사용** |
| **일반 경구 정제 → `oral`** | ✅ P1 트리메부틴 `basis=usage_label`. **`doseForm='정'` 미사용** |
| 질정에 take·swallow·oral 미사용 | ✅ GLOSSARY §3 route 표에서 `vaginal` → **insert** 고정(G-01). 파일럿 P4 시안도 `insert` 사용·`take/swallow/oral` 0회 |
| 불명확 대상 수·사유 | ✅ **0건** (§4-1) |
| 95건 route 분포 | ✅ §4-1 |
| **기존 소비자 HTML 회귀** | ✅ **95건 출력 바이트 동일** (`buildDrugOtcConsumerHtml` 변경 전/후 `diff` 무차이) |

### 4-3. 단위 테스트 — **42/42 PASS**

| 파일 | 수 |
|---|---:|
| `drug-otc-route.test.ts` (**신규**) | 10 |
| `draft-markdown-to-html.test.ts` | 12 |
| `drug-otc-translation-input.test.ts` | 12 |
| `drug-otc-description-consumer-html.test.ts` | 8 |

신규 10건이 잠그는 것: 우선순위 3단 · **`doseForm='정'` 이 같아도 vaginal/oral 갈림** · 근거 없으면 `needs_review` · **"항문검사" 오탐 방지**(디오스민 경구정 → `oral` 유지) · 모순 감지 3종 · `expectedUsageLabel`.

### 4-4. typecheck / build

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` — **내 파일** | ✅ **0 오류** |
| `tsc --noEmit` — 저장소 전체 | **7** (직전 WO 대비 변동 없음, 내 변경 무관) |
| vitest | ✅ **42/42** (내 4개 스위트) |
| `tsc -p tsconfig.build.json` | ⚠️ **1 오류 — 내 변경 무관** (타 세션 `e41c78157` content-guard import 경로. 선행 CHECK §6 참조) |

---

## 5. 문서 반영

| 문서 | 변경 |
|---|---|
| [DRUG-RULE-REGISTRY](../guides/products/drug/DRUG-RULE-REGISTRY.md) **DR-019** | 우선순위 3단 · 최소 경로값 7종 · `needs_review` 원칙 · **본문 키워드 매칭 금지**(오탐 실증) · `doseForm` 값 불일치 실측 추가 |
| [OTC-KO-EN-GLOSSARY](../guides/OTC-KO-EN-GLOSSARY.md) **V0.3 → V0.4** | §3 투여경로를 **route 값 기준표**로 교체(route → 한국어 → 영어 → **동사**). "제형명으로 짐작하지 않는다", `route=null` 이면 번역 보류 명시 |

---

## 6. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| route 판별 근거와 우선순위 확정 | ✅ §3-1 |
| 자동 판별 가능·불가 대상 구분 | ✅ 가능 95 / 불가 0 (§4-1). 불가 시 처리 규칙은 §3-4 에 정의 |
| DR-019 문서 및 관련 GUIDE 반영 | ✅ §5 |
| DB write · migration · 컬럼 | ✅ **0** |
| 기존 초안 수정 | ✅ **0** |

---

## 7. 후속 (이번 범위 밖 — 분리)

| # | 항목 | 필요성 |
|---|---|---|
| 1 | **single 초안 66건의 `groupKey` 에 route 축 부여** (DR-010 규격 정렬) | 현재는 `usageLabel` 로 커버돼 **지금 당장은 불필요**. 규격 일관성 관점의 정비 — **DB write 필요라 분리** |
| 2 | `route` 를 `content_json` 에 **영속화**할지 | 현재 **파생으로 충분**(95/95 확정). 영속화는 값이 바뀔 때 동기화 부담만 생김 → **권장하지 않음** |
| 3 | **`doseForm` 값 정규화** (정/tablet/캡슐/soft_capsule/null 혼재) | 경로와 무관하나 **데이터 품질 부채**. 별도 WO |

> **다음 단계 = 한국어 canonical 승격 전 데이터 선결사항 재점검.**
> [PILOT-VALIDATION §5-G](CHECK-O4O-OTC-EN-DESIGN-PILOT-VALIDATION-V1.md) 선결 3건 중 **②(CR-021 파이프라인) · ③(route 데이터)** 해소 → 남은 것은 **①한국어 canonical 승격**뿐이다.
