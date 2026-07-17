# CHECK-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-DRYRUN-TIER2-V1 — 문단경계 복구안 (dry-run)

WO: `WO-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-DRYRUN-TIER2-V1` · 일자: 2026-07-17 · 상태: **완료 (dry-run)**
근거: [RECOVERY-DRYRUN(Tier 판정)](./CHECK-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-DRYRUN-V1.md) · [APPLY-TIER1](./CHECK-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-APPLY-TIER1-V1.md)

> **dry-run 전용.** DB write **0** · canonical UPDATE **0** · NB 전체대체 **0** · 수동 대상 자동복구 **0** · 영문 **0**.

---

## 0. 결론

> **경계검토 86 item_seq / 354 master 전수 복구안 검증 통과. 값+`)` 삽입에 더해 유실된 문단 경계(`\n\n`)를 복원해 다음 문단을 독립 문단으로 분리. find 고유 86/86, 역치환 일치, 삼중개행 0.**
>
> | | item_seq | ko master | en |
> |---|---:|---:|---:|
> | **자동 (Tier2)** | **86** | **354** | 0 |
> | 수동 제외(pH·앵커) | 7 | 21 | 0 |

---

## 1. 복구 모델 (per-case 정밀화)

유실 지점에 **NB_DOC 근거값 + 닫는 괄호 + 문단 구분**을 삽입한다.
```
(크레아티닌청소율이            (크레아티닌 청소율 
→                       →
(크레아티닌청소율이&lt; 25 mL/min)   (크레아티닌 청소율 &lt; 10 mL/min)
<빈 줄>                     <빈 줄>
```

> **⚠️ WO 모델 정밀화**: WO 는 86 전건 "값+`)`+`\n\n`" 로 지정했으나, 실측상 **11 item_seq 는 유실이 값·괄호만 먹고 `\n\n` 이 이미 생존**한다. 이들에 `\n\n` 을 더하면 **삼중개행(빈 문단)** 이 생긴다. 따라서:
> - **값+`)`+`\n\n` (경계까지 유실) = 75 item_seq**
> - **값+`)` 만 (`\n\n` 생존) = 11 item_seq**
>
> 두 경우 모두 결과는 **`…mL/min)\n\n다음문단`** = 독립 문단. 화이트리스트가 항목별 `replace`(breakSurvived 플래그)로 구분 저장한다.

### 1-1. 앵커 정정 — 조사 `이` 포함
무공백형 원문은 `크레아티닌청소율이[유실]` 로, 조사 `이` 뒤가 유실점이다(NB: `크레아티닌청소율이&lt;25 mL/min`). 앵커에 `이` 를 포함(`크레아티닌청소율이`)해야 값이 조사 뒤에 정확히 삽입된다. 앵커 정규식 `크레아티닌 ?청소율[이가]? ?`(trailing 은 **literal 공백만** — 생존 `\n` 미소비).

### 1-2. NB 근거값
| 값 | item_seq | 성분 |
|---|---:|---|
| `&lt; 25 mL/min` | 84 | 에르도스테인(중증 신장애) |
| `&lt; 10 mL/min` | 2 | 세티리진(신부전) |

---

## 2. 검증 (86 전수)

| 항목 | 결과 |
|---|---|
| `find` 고유(콘텐츠 내 1회) | **86/86** |
| 역치환 `after.replace(replace, find) === before` | **86/86** |
| 복구 후 다음 문단 독립(`…mL/min)\n\n…`) | **86/86** |
| 삼중개행(`)\n\n\n`) | **0** |
| 문장·항목·숫자 추가 변경 | **0**(값+`)`+경계 외 불변) |
| 예상 대상 일치 | **86 item_seq / 354 master** ✅ |
| pH·앵커비고유 자동 제외 | ✅ (§3) |

**샘플**
```
전: 신부전 환자(크레아티닌 청소율 이 약을 복용하기 전에 …
후: 신부전 환자(크레아티닌 청소율 &lt; 10 mL/min)\n\n이 약을 복용하기 전에 …   (값+\n\n)

전: 신장장애(크레아티닌청소율이\n\n이 약을 복용하기 전에 …
후: 신장장애(크레아티닌청소율이&lt; 25 mL/min)\n\n이 약을 복용하기 전에 …        (값만, \n\n 생존)
```

---

## 3. 수동 제외 7 item_seq / 21 master

| item_seq | 유형 | master | 사유 |
|---|---|---:|---|
| 201205361 / 201205362 / 201205364 | pH 값 유실 | 3/2/2 | `(pH[유실]` — NB 품목별 상이, 수동 대조 |
| 201602706 / 201906886 / 202000054 / 202000200 | 앵커 비고유 | 4/3/3/4 | `크레아티닌청소율` 2회 이상 출현 → 삽입 위치 수동 확정 |

> 자동 복구 대상에서 제외(WO 지시). 별도 수동 검토.

---

## 4. 예상 UPDATE · apply 범위

| 단계 | 대상 | ko UPDATE | en |
|---|---|---:|---:|
| **Tier2 apply** | 86 item_seq(값+`)`+`\n\n` 75 / 값+`)` 11) | **354 master** | 0 |
| 수동 | pH 3 + 앵커비고유 4 | (건별) | 0 |

**apply WO(제안) `…-RECOVERY-APPLY-TIER2-V1`**: 화이트리스트 `recovery-whitelist-tier2.json` 항목별 find/replace 를 Tier1 스크립트와 동일 게이트(이중 승인·단일 TX·find 고유·역치환·비대상 불변·삼중개행 0·멱등)로 적용.

---

## 5. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 86건 전수 복구안 검증 | ✅ 자동 86 / 플래그 0 |
| 354 master 예상 UPDATE 확정 | ✅ |
| 문단 경계 복원 결과 확인 | ✅ 독립 문단 86/86, 삼중개행 0 |
| 실제 apply 범위 확정 | ✅ §4 |
| DB·콘텐츠 변경 0 | ✅ 파일 대조(DB 무접근) |
| commit·push | ✅ |

---

## 6. 산출물

- `docs/investigations/samples/nb-doc-bulk-v1/recovery-whitelist-tier2.json` — 자동 86(항목별 find/replace/breakSurvived/nbValue)
- `docs/investigations/samples/nb-doc-bulk-v1/recovery-tier2-manual7.json` — 수동 7

> **금지 준수**: DB write·canonical UPDATE·NB 전체 대체·수동 자동복구·영문 수정 전부 0. 다음: Tier2 apply(354 master) → pH·앵커 수동 → 첨가제 서브그룹 분리.
