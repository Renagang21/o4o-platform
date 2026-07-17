# CHECK-O4O-OTC-BULK-BATCH-02-KO-FINALIZE-DRYRUN-AGENT-NA-V1 — Batch 02 한국어 승격 최종 확정 dry-run (에이전트 나)

WO: `WO-O4O-OTC-BULK-BATCH-02-KO-FINALIZE-DRYRUN-AGENT-NA-V1` · 일자: 2026-07-17 · 상태: **완료 (dry-run 확정)**
담당: **에이전트 나** · 배치: **Batch 02** · 선행: [BATCH-02-KO-READINESS](CHECK-O4O-OTC-BULK-BATCH-02-KO-READINESS-AGENT-NA-V1.md) (커밋 `ecadbfeed`) · 근거: [실행 지침서 V1](../guides/products/drug/OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md)

> **DB write 0.** canonical INSERT/UPDATE/DELETE **0** · **아르기닌 draft 보정도 수행하지 않음**(근거 부족 — §3). 조회 채널: Cloud SQL Proxy v2 (`127.0.0.1:5433`) SELECT only.

---

## 0. 결론

> **Batch 02 = 8그룹, 신규 ko canonical 대상 실측 확정 66건** (정책 A `NOT EXISTS canonical`). 전건 게이트 통과.
>
> | 게이트 | 결과 |
> |---|---|
> | 신규 INSERT(newInsert) | **66** (초기 추정 66과 일치) |
> | Batch 01 master 교집합 | **0** (후보 66 ∩ Batch01 586 = 0) |
> | 후보 내부 master 중복 | **0 / 66** |
> | 기존 canonical 충돌 | **0** |
> | route 전건 oral | ✅ (비경구 name 키워드 0) |
> | rx 혼입 | **0** |
> | 구조화 4필드 누락 | **0 / 8** |
> | 소비자 HTML 빌드 | 8/8 생성 · `<table>` 0 · 주석 0 · `sd-warn` 8/8 |
>
> **두 개별 검토 결과:**
> - **알파칼시돌 1㎍**: 제품별 허가 **적응증 동일**(easydrug 2변형은 용법 표현 차이뿐) → **승격 가능 확정**.
> - **아르기닌티디아시케이트**: 효능=허가 원문 **한 문장 verbatim**, 보강 grounding **없음** → **draft 미수정**(DB write 0). 현행 draft로 승격 가능하나 **apply 여부는 사용자 승인 권고**.

---

## 1. Dry-run 실측 (정책 A `NOT EXISTS canonical`)

전용 스크립트 `drug-otc-batch02-ko-finalize-dryrun.ts` (write 0). 열거 규칙 = 승격 스크립트(`drug-otc-herbal-canonical-promotion.ts`) 복제: `name LIKE '%(성분)'` + `split_part(spec,' / ',1)=함량` + `formCase=제형키워드`(연질캡슐 우선). `buildDrugOtcConsumerHtml` 실제 빌드로 게이트 검증.

| # | groupKey | 전개 master | **신규 ko(newInsert)** | route | rx혼입 | 빌드 게이트 | 판정 |
|---|---|---:|---:|:---:|:---:|:---:|---|
| 1 | 나프록센\|250밀리그램\|연질캡슐 | 101 | **14** | oral | 0 | ✅ | 승격 가능 |
| 2 | 알파칼시돌\|1마이크로그램\|연질캡슐 | 20 | **10** | oral | 0 | ✅ | 승격 가능(검토 강화) |
| 3 | 아르기닌티디아시케이트\|200밀리그램\|연질캡슐 | 17 | **10** | oral | 0 | ✅ | 승격 가능(현행 draft) |
| 4 | 이부프로펜\|400밀리그램\|연질캡슐 | 36 | **8** | oral | 0 | ✅ | 승격 가능 |
| 5 | 클로닉신리시네이트\|125밀리그램\|연질캡슐 | 36 | **7** | oral | 0 | ✅ | 승격 가능 |
| 6 | 플루벤다졸\|500밀리그램\|정 | 14 | **7** | oral | 0 | ✅ | 승격 가능 |
| 7 | 이부프로펜아르기닌\|368.9밀리그램\|정 | 14 | **6** | oral | 0 | ✅ | 승격 가능 |
| 8 | L-시스틴\|500밀리그램\|연질캡슐 | 12 | **4** | oral | 0 | ✅ | 승격 가능 |
| | **합** | **250** | **66** | | | | |

> 빌드 게이트(전건) = 필수 4필드 누락 0 · `<table>` 0 · 주석(`<!--`) 0 · `sd-warn` 존재 · 빈 html 0. `nonoral`(질정·좌제·외용·점안 등 name 키워드) 8그룹 전부 **0**.

---

## 2. 알파칼시돌 1㎍ — 약사 검토 강화 대조

전개 20 master 중 easydrug(mfds_easy_drug) 원문 보유 10, 무source 10(=신규 승격 대상). 원문 보유 10건의 효능·용법 **distinct 2변형** 실측:

| 변형 | 건수 | 효능(적응증) | 용법 특징 |
|---|---:|---|---|
| A | 6 | 만성신부전·부갑상선기능저하증·비타민D저항성 구루병·골연화증·**골다공증** | 0.5~1㎍ 1일1회, 부갑상선 등 1~4㎍, 어린이 체중당 |
| B | 4 | **동일** | **"혈청 칼슘수치 관리 하에 투여량 조절"** + 캡슐 단위 표기 |

| 검토 항목 | 결과 |
|---|---|
| 적응증(효능) 제품별 차이 | **없음** — 두 변형 완전 동일 |
| 1일 용량 | 0.5~1㎍(만성신부전·골다공증) — draft 반영 ✅ |
| 혈청 칼슘 조절 문구 | 변형 B 존재 → **draft "혈청 칼슘 수치 관리하에 용량 조절" 반영** ✅ |
| 고칼슘혈증·고인산혈증 금기 | draft caution 반영("고칼슘·고인산·고마그네슘혈증·비타민D 독성 시 복용 안 함") ✅ |
| 비타민 D 독성 문구 | 반영 ✅ |
| 제품별 허가 차이(분리 필요) | **없음** |

> **판정: 승격 가능 확정.** 제품별 적응증 divergence 없음 → 그룹 공유 draft 유효. low_ground(무source 10/20)는 **약사 검토 강화 대상**으로만 유지(그룹 draft는 원문 보유 10건으로 grounding됨).

---

## 3. 아르기닌티디아시케이트 — 문안 보정 판단 (⚠️ 미수정)

### 3-1. 허가 원문 대조 (easydrug 7건, distinct 1)

```text
효능·효과  이 약은 간기능장애의 보조 치료에 사용합니다.       ← 효능 원문 전체(한 문장)
용법·용량  성인은 1회 100∼200 mg, 1일 2회 식후에 복용합니다.
주의사항   15세 이하 어린이·심한 신부전 복용 금지 / 임부·수유부 상담 / 1개월 미개선 시 상담
```

현행 draft `efficacy` = **"간기능 장애의 보조 치료에 사용합니다."** = **허가 원문 verbatim**. usage·caution 도 원문과 정합.

### 3-2. 판단 — 보정 불가 (근거 없음)

| WO 보정 원칙 | 적용 |
|---|---|
| 새로운 효능 추가 금지 | 추가할 원문 근거 **없음** — 허가 효능이 한 문장이 전부 |
| 마케팅 표현 추가 금지 | store 임팩트 보강 시 원문 없는 창작 위험 |
| 허가된 간기능 보조 범위 유지 | 현행이 이미 그 범위 그대로 |
| 원문보다 강한 표현 금지 | 현행 = 원문과 동일 강도 |
| 정보축 보존(최소성) | 스타일만 바꾸는 편집은 정보 무변화 + 지문만 변경 → 무익·drift 위험 |

> **결론: draft를 수정하지 않는다.** 효능이 "빈약"한 것은 draft 결함이 아니라 **허가 적응증 자체가 terse**하기 때문이다. 효능 확장은 CLAUDE.md 의약품 불변 원칙(외부 LLM 초안 자동생성 금지·공식 원문 grounding)과 **WO 중단 조건("원문 근거가 부족한 문안 보정 필요")**에 정확히 걸린다.
>
> WO가 허용한 **draft 1건 UPDATE 예외는 그 전제(grounded 보정)가 성립하지 않아 행사하지 않음** → 본 WO DB write **0**.

### 3-3. 아르기닌 처리 권고 (사용자 결정)

- **(A) 현행 draft로 apply** — 원문 충실·정보 완전·빌드 청정. 매장 설명서로 간결하지만 정확. (권장 기본값)
- **(B) 보류** — 제품 상세페이지 등 **새 원문 확보 후** 임팩트 보강 → 별도 소스 획득 WO. (그 전까지 apply 제외)

> 나머지 7그룹의 apply와 **독립적으로** 결정 가능(그룹 disjoint).

---

## 4. master 교집합·중복 재증명

전용 dry-run 스크립트가 Batch01 10그룹을 동일 열거로 재구성해 실측:

| 검사 | 결과 |
|---|---:|
| Batch 02 신규 대상(promotable) | 66 |
| Batch 01 전개 master | 586 |
| **Batch 01 ∩ Batch 02** | **0** |
| Batch 02 내부 중복 | **0 / 66** |
| promotable 중 기존 canonical 보유(충돌) | **0** |

> 근거(§READINESS §6 재확인): 염·함량·제형 축이 전부 disjoint. 나프록센**나트륨**275정(B01)↔나프록센250연질(B02), 이부프로펜200(B01)↔400(B02), 클로닉신125**정**(B01)↔125**연질캡슐**(B02), 알파칼시돌0.5㎍(B01)↔1㎍(B02).

---

## 5. 중단 조건 점검

| 중단 조건 | 발생 | 처리 |
|---|:---:|---|
| Batch 01 groupKey/master 교집합 | ✗ | 0 |
| 그룹 내 rx·비경구 혼입 | ✗ | 8그룹 rxMix 0 · nonoral 0 |
| 제품별 허가 내용 차이 | ✗ | 알파칼시돌 적응증 동일 |
| 예상외 기존 설명서 | ✗ | canonical 충돌 0 |
| 그룹 공유 불가 차이 | ✗ | 없음 |
| 빌더 drift | ✗ | 8/8 정상 빌드 |
| **원문 근거 부족 문안 보정 필요** | **○ (아르기닌)** | **문안 보정 미수행 + draft 미변경**으로 처리 — 아르기닌 apply만 사용자 승인 대기, 배치 전체 중단 아님(draft 자체는 유효) |
| 실제 대상 수 미재현 | ✗ | 66 재현 |

---

## 6. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 8그룹 최종 판정 | ✅ 승격 가능 8 (아르기닌=현행 유지) |
| 알파칼시돌 검토 결과 확정 | ✅ 적응증 동일 → 승격 가능(§2) |
| 아르기닌 문안 보정 및 근거 기록 | ✅ **보정 미수행 확정 + 근거 기록**(§3) — 원문=한 문장, grounding 없음 |
| 실제 신규 ko canonical 대상 수 확정 | ✅ **66** (§1) |
| Batch 01과 교집합 0 재증명 | ✅ 0 (§4) |
| canonical INSERT/UPDATE/DELETE | ✅ **0** |
| 담당 산출물만 commit·push | ⏳ 본 CHECK + `drug-otc-batch02-ko-finalize-dryrun.ts` + `data/otc-batch-02-ko-final-v1.json` |

---

## 7. 병렬 충돌 방지 준수

- Batch 01 draft·CHECK·스크립트 **미수정** · 공통 GUIDE·GLOSSARY·Registry·번역 JSON **미수정** · Batch 01/승격 스크립트 **재사용·수정 안 함**
- Batch 02 전용 파일만 생성(`drug-otc-batch02-ko-finalize-dryrun.ts` · `data/otc-batch-02-ko-final-v1.json`)
- 조사 probe(`otc-batch02-select/content/source-probe.ts` · `*-analyze/-view.mjs`)는 read-only·**미커밋**
- **DB canonical write 0 · 아르기닌 draft UPDATE 미수행** → 94개 draft 지문 불변(변경 자체가 없음)
- `git add .` 금지 → 담당 산출물만 pathspec stage

---

## 8. 다음 (apply 가능 범위)

> **Batch 02 ko canonical 승격 apply 준비 완료.** 대상 목록·candidateId·예상 수 = `data/otc-batch-02-ko-final-v1.json`.
> - **7그룹(아르기닌 제외) 즉시 apply 가능** — 신규 56건. 전용 apply 스크립트(`drug-otc-herbal-canonical-promotion.ts` 패턴, **Batch02 전용 신규 파일**)로 이중 게이트+단일 TX.
> - **아르기닌(10건)은 사용자 결정 후**(§3-3 A/B).
> - apply 후 지침서 §3~§5(en 번역 1건/그룹 → 전개 → 검수 canonical) 진행.
> - 에이전트 가 Batch 01과 DB 행 disjoint이나, **각 배치 전용 스크립트·대상 목록** 사용(공유 스크립트 금지).
