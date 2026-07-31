# WO-O4O-DRUG-OTC-EN-NONORAL-VERB-SOURCE-ADJUDICATION-AND-MINIMAL-FIX-V1 — CHECK

- 상태: **판정 + 최소 교정 COMPLETE / PASS**
- 실행일: 2026-07-31
- 착수 HEAD: `f182a4212` (origin/main 과 동일) · 판정 단계 커밋 `09dd966ca`(write 0) · 교정 단계: 본 CHECK 커밋
- **LIVE DB write: 49행**(확정 오역 69 문장의 동사 토큰 교정만). 판정 전 구간은 read-only
- 범위: 비경구 제품 EN 경구동사 **문장 단위 판정 + 확정 오역 최소 교정**
- KO 본문 하드컷 2,535 · KO 사람 검토 8 · summary NULL 1,577 · zh/ja: **미착수(범위 밖)**

> **진행 순서**
> 1. 판정을 먼저 완결하고 **DB write 0 인 상태로 보고**했다. WO §9("기존 안전 runner 가 없으면 신규 DB write 금지, 보고")에 걸렸기 때문이다(§7).
> 2. 사용자가 ① **전용 runner 신규 제작 후 교정** ② **route 원장 누락 300건도 지금 함께 판정** 을 승인했다.
> 3. 승인 범위대로 540 전수 판정 → 확정 오역 **69 문장 / 49 설명서** 를 최소 교정하고 20 게이트로 독립검증했다(§11~§12).

---

## 1. 접속 · 검증 채널

| 항목 | 값 |
|---|---|
| 채널 | Cloud SQL Auth Proxy v2 + `gcloud auth print-access-token` |
| 연결 | `127.0.0.1:5524` → `netureyoutube:asia-northeast3:o4o-platform-db` / `o4o_platform` |
| 자격증명 | `apps/api-server/.env` 를 `dotenv` 로 로드해 `process.env` 로만 사용 — 값 출력 0 |
| 트랜잭션 | 전 세션 read-only 강제 |

인계 커밋 `d75879ef1` · `26cc68e54` · `f182a4212` 는 모두 origin/main 에 포함됨을 확인했다.

---

## 2. 기존 입력 240건의 최신 LIVE 재현

원 검출기 [otc-en-coverage-audit.ga.ts:59](../../apps/api-server/src/scripts/otc-en-coverage-audit.ga.ts#L59) 의
술어를 **그대로** 재현했다: EN canonical 본문이 `\m(take|takes|taken|taking|swallow|orally|by mouth)\M`
에 걸리고 route 가 oral/unknown 이 아닌 master.

| 지표 | 입력 | 현재 LIVE |
|---|---:|---:|
| 행 수 | 240 | — |
| DISTINCT master_id | 240 | **240** |
| 재현된 검출 대상 | — | **240** |
| 입력 대비 누락 | — | **0** |
| 입력 대비 추가 | — | **0** |
| EN STORE canonical 연결 | 240 | **240** |
| KO STORE canonical 연결 | 240 | **240** |
| `koSourceRef` 입력값 = LIVE | — | **240** |
| KO·EN `source_ref_id` 동일 | — | **240** |
| route 분포 | topical 182 · ophthalmic 33 · vaginal 12 · oromucosal 8 · rectal 5 | **동일** |

**240 재현 = PASS.** 삭제·비활성·canonical 변경·중복 대상 0.

> **route 는 LIVE 컬럼이 아니라 V4 prep 원장에서 온다.** 원 감사가 로드한 5개 원장으로 재현하면 정확히 240 이다.
> 저장소에는 원 감사가 로드하지 않은 원장 2개(`otc-v4-nr26-prep` · `otc-v4-route535-prep`)가 더 있고,
> 7개 전부를 쓰면 **동일 검출 조건에서 540** 이 된다. 즉 **route 미상으로 감사에서 빠진 비경구 master 300 이 더 있다**(§8).

---

## 3. 판정 방법 — 문장 단위 3중 대조

[otc-en-nonoral-verb-adjudication.ga.ts](../../apps/api-server/src/scripts/otc-en-nonoral-verb-adjudication.ga.ts) (READ-ONLY)

① 현재 EN 문장 ② 정렬된 KO canonical 문장 ③ 공식 KO 원문(e약은요) 섹션

- EN·KO 는 `<h2>` 블록을 **순서(index)** 로 대응시킨다(라벨 문자열은 언어마다 다르다).
- 블록 내 **문장 수가 일치할 때만** 대응 KO 문장을 특정한다. 불일치 섹션은 자동 판정하지 않고 검토로 뺀다.
- 문장 분해는 언어별 실측 규칙을 쓴다: 한국어는 `마십시오.이 약을` 처럼, 영어는 `medicine.Before` 처럼
  **공백 없이 이어붙는 문장**이 있어 종결부호+다음 글자(한글/대문자)를 경계로 본다.
  이 보정 전에는 섹션 정렬률이 60% 였고, 보정 후 **83%(200/240 문서 전 섹션 일치)** 다.

### 3-1. 핵심 판별축 — 경구 **경로 표지**의 유무

97개 검출 문장 템플릿을 전수 열람해 도출했다(코드에서 추정하지 않았다).

| 문장 유형 | 판정 | 근거 |
|---|---|---|
| `by mouth / orally / internally / swallow / eat` 등 **경로가 명시**된 문장 | 정상 | 원문의 `먹지 마십시오` · `실수로 먹었을 경우` 를 옮긴 것 |
| 경구동사의 목적어가 **다른 의약품**(MAO 억제제 등) | 정상 | 원문 `복용/투여 중인 다른 약` |
| `take (use)` 병기형 | 정상 | KO 원문 `복용(사용)` 표기 보존 |
| `take care / take off / into account` | 오탐 | 경구동사가 아님 |
| **경로 표지 없이 이 약 자체에 `take`** | 오역 후보 | 대응 KO 가 `사용/도포/점안/삽입` 이면 확정 |

---

## 4. 판정 결과 (상호배타)

| 판정 | 문장 | 문서 |
|---|---:|---:|
| `VALID_SOURCE_GROUNDED` | **222** | 200 |
| `DETECTOR_FALSE_POSITIVE` | **60** | 55 |
| `INVALID_ROUTE_VERB` | **52** | 36 |
| `AMBIGUOUS_REVIEW` | **3** | 3 |
| `SOURCE_OR_LINKAGE_BLOCKED` | **0** | 0 |
| **합계** | **337 = 검출 문장 총수 PASS** | |

| 수치 구분 | 값 |
|---|---:|
| ProductMaster 수 | 240 |
| 설명서 수(EN canonical) | 240 |
| 검출 문장 수 | 337 |
| 판정 건수 | 337 |
| **실제 교정 대상 설명서 수** | **36** |
| **실제 교정 대상 문장 수** | **52** |
| 사람 검토 필요 문장 | 3 |

route 별 `INVALID_ROUTE_VERB`: topical 40 · ophthalmic 12 (vaginal · rectal · oromucosal **0**).

### 4-1. 정상으로 확정한 대표 사례

```
EN : People who are taking MAO inhibitors … must not use this medicine.
KO : MAO억제제…를 사용하고 있거나 사용을 중단한 후 2주 이내의 사람은 이 약을 사용하지 마십시오.
공식: MAO억제제…를 복용하고 있거나 복용을 중단한 후 2주 이내의 사람은 …
```
→ 경구동사의 대상은 **다른 의약품**이고 공식 원문이 `복용` 이다. **KO canonical 만 봤다면 오판했을 사례**다
(KO canonical 은 `사용` 으로 순화돼 있다). 공식 원문을 판정에 넣은 이유가 여기 있다.

```
EN : If you swallow this medicine by mistake, get help from a doctor …
KO : 실수로 이 약을 먹었을 경우 즉시 의사 등 전문가의 도움을 받으십시오.
```
→ 우발 섭취 경고. 점안제라도 **정상**이며 교정 대상이 아니다.

### 4-2. 판정 규칙을 실측으로 3회 교정했다

자동 규칙의 1차 결과를 템플릿 전수 열람으로 검증해 **오분류 3종을 잡아냈다**. 규칙은 데이터에 맞춰 고쳤다.

| 오분류 | 실측 | 조치 |
|---|---:|---|
| `care must be taken`(take care 의 수동태)을 경구동사로 계수 | 6 | 관용구 규칙에 수동태 추가 → 오탐으로 정정 |
| 목적어가 **이 약**인데 다른 약 이름이 있어 정상 처리<br>(`Do not take this medicine together with other analgesics` ← `…와 함께 사용하지 마십시오`) | 9 | 목적어 판정을 다른 약 판정보다 **우선** |
| `stopped taking them`(them=MAO 억제제)을 이 약으로 오인 | 4 | 목적어 사전에서 `them` 제거(복수 선행사는 이 약이 아니다) |

---

## 5. 확정 오역 52 문장의 최소 교정안

전 52 문장에 대해 **동사구 한 곳만** 바꾸는 교정안을 만들었고, 문장의 나머지는 byte 단위로 보존된다.
21개 문형으로 수렴한다.

| 문형 | 교정 | 대응 KO |
|---|---|---|
| `Before taking this medicine, …` | `Before using this medicine, …` | 이 약을 **사용하기 전에** |
| `… must not take this medicine.` | `… must not use this medicine.` | 이 약을 **사용하지 마십시오** |
| `… stop taking it immediately …` | `… stop using it immediately …` | **사용을 즉각 중지**하고 |
| `If you take this medicine by mistake, …` | `If you use this medicine by mistake, …` | **실수로 이 약을 사용한 경우** |
| `Do not take this medicine together with …` | `Do not use this medicine together with …` | …와 함께 **사용하지 마십시오** |

> **route 동사(apply/instill/insert)를 쓰지 않는 이유** — 대응 KO 가 전부 `사용` 계열이다.
> `apply`·`instill` 로 바꾸면 원문에 없는 동작(도포·점안)을 새로 넣는 것이 되어 §7 의 "원문에 없는 내용 추가 금지" 위반이다.
> KO 가 `도포/점안/삽입` 이라고 말하는 문장은 이번 확정 대상에 **없다**.

교정안 자체 검증: 52/52 생성 · 무변경 0 · 교정 후 잔여 경구동사 0 · 숫자·연령·기간·금기 토큰 변경 0(치환 범위가 동사구뿐).

---

## 6. 사람 검토 3건 · 오탐 60건

- `AMBIGUOUS_REVIEW` **3** — 저작기가 여러 문장을 하나의 `<li>` 로 병합해 섹션 문장 수가 어긋난 문서다.
  대응 KO 문장을 안전하게 특정할 수 없어 **자동 교정에서 제외**했다. (전부 topical)
- `DETECTOR_FALSE_POSITIVE` **60** — `take care`(눈에 들어가지 않도록 주의) · `take off`(오염된 의복을 벗고) ·
  `take … into account`(알코올 함량을 고려) 계열. 원 검출기의 단어 단위 정규식 한계이며 **설명서 결함이 아니다**.

---

## 6-A. 승인 후 확장 — route 원장 누락 300건 포함 540 전수 판정

`--scope all540` 로 **동일 검출 술어 + route 원장 7종**을 써서 비경구 전수를 재현했다.

| 지표 | input240 | **all540** |
|---|---:|---:|
| 대상 master | 240 | **540** |
| 검출 문장 | 337 | **934** |
| `VALID_SOURCE_GROUNDED` | 222 | 392 |
| `DETECTOR_FALSE_POSITIVE` | 60 | 337 |
| `INVALID_ROUTE_VERB` | 52 | **69** |
| `AMBIGUOUS_REVIEW` | 3 | 136 |
| `SOURCE_OR_LINKAGE_BLOCKED` | 0 | 0 |
| 합계 검증 | PASS | **PASS (934)** |

**교차 일관성**: 540 판정 안의 원래 240 부분집합은 `INVALID` **52** 로 단독 실행 결과와 정확히 일치한다.
새로 드러난 확정 오역은 **17 문장 / 13 설명서**(rectal 6 · oromucosal 6 · topical 5)이며,
문형은 전부 §5 의 기존 5개 문형과 동일했다(신규 문형 0).

`AMBIGUOUS_REVIEW` 가 3 → 136 으로 늘어난 것은 새 300건에 **여러 문장을 한 `<li>` 로 병합한 저작 산출물**이 많아
섹션 문장 수가 어긋나기 때문이다. 자동 교정에서 제외했고 §13 에 검토 대상으로 남겼다.

---

## 7. 교정 runner 실측 — 재사용 가능한 것이 없다

| 후보 | 재사용 가부 | 근거 |
|---|---|---|
| [drug-otc-common-omission-batch13-fix.ts](../../apps/api-server/src/scripts/drug-otc-common-omission-batch13-fix.ts) | **불가** | 화이트리스트 편집 후 `buildDrugOtcEnConsumerHtml()` 로 **HTML 전체를 재생성**해 저장한다. 본 240건은 다른 저작기(sd-* v3/v4)의 산출물이라 재생성 경로가 아예 다르고, 비대상 영역까지 바뀐다. 특정 13그룹 전용 로직·고정 화이트리스트 경로에 묶여 있다. |
| [otc-en-summary-rebuild.ga.ts](../../apps/api-server/src/scripts/otc-en-summary-rebuild.ga.ts) | **불가** | in-place 2지점 치환 구조는 적합하나 대상 규칙이 **요약 120자 하드컷 전용**이다. 문장 단위 동사 교정 대상을 다루지 못한다. |
| 그 외 `drug-otc-*-fix` 계열 | **불가** | 성분·경고 특정 그룹 전용(예: albendazole 상호작용) — 범용 문장 교정기가 아니다. |

→ 1차 보고 시점에는 WO §9 게이트에 걸려 DB write 를 하지 않았다. **사용자 승인 후 전용 runner 를 신규 제작**했다(§11).

---

## 8. 남은 검토 대상 · 범위 밖 관측

| 항목 | 규모 | 성격 |
|---|---:|---|
| 확정 오역 교정 | 69 문장 / 49 설명서 | **완료** (§11~§12) |
| 사람 검토 `AMBIGUOUS_REVIEW` | **136 문장 / 136 설명서** | li 병합으로 대응 KO 문장 특정 불가 — 자동 교정 제외 |
| route 원장 누락 300건 | 판정 완료 | 신규 확정 오역 17 문장 포함해 이번에 함께 교정 |
| KO 본문 하드컷 | 2,535 | 별도 WO(HOLD) |
| zh · ja | 미착수 | 범위 밖 |

> **원 감사의 구조적 누락(기록)** — `otc-en-coverage-audit.ga.ts` 는 route 를 V4 prep 원장 5종에서만 읽는다.
> 저장소에는 `otc-v4-nr26-prep` · `otc-v4-route535-prep` 이 더 있고, 이들을 포함하면 같은 술어로 **540** 이 나온다.
> route 미상(`unknown`)은 검출 조건에서 제외되므로 **300건이 조용히 감사 밖에 있었다.** 이후 EN 감사는 원장 7종을 모두 로드해야 한다.

---

## 9. 산출물

| 파일 | 역할 |
|---|---|
| [otc-en-nonoral-verb-adjudication.ga.ts](../../apps/api-server/src/scripts/otc-en-nonoral-verb-adjudication.ga.ts) | 모집단 재현 + 문장 단위 3중 대조 판정 (READ-ONLY) |
| `data/otc-en-nonoral-verb-adjudication.ga.json` | 전체 판정 원장 337행(EN 문장 · KO 문장 · 공식 원문 발췌 · 검출어 · 섹션 · 판정 · 근거 · 교정 필요 여부 · 최소 교정안) |
| `data/otc-en-nonoral-verb-invalid-targets.ga.json` | `INVALID_ROUTE_VERB` 52행 — 교정 대상만 |
| `data/otc-en-nonoral-verb-review-blocked.ga.json` | `AMBIGUOUS_REVIEW` 3행 — 사람 검토 |
| `data/otc-en-nonoral-verb-summary.ga.json` | route별·판정별 요약 + 합계 검증 |
| `data/otc-en-nonoral-verb-*-all540.ga.json` | 540 전수 판정 원장 3종(전체 934행 · 교정대상 69 · 검토 136) |
| [otc-en-nonoral-verb-fix.ga.ts](../../apps/api-server/src/scripts/otc-en-nonoral-verb-fix.ga.ts) | 최소 교정 러너 (dry-run / rollback-test / apply) |
| [otc-en-nonoral-verb-fix-verify.ga.ts](../../apps/api-server/src/scripts/otc-en-nonoral-verb-fix-verify.ga.ts) | 독립검증기 20 게이트 (READ-ONLY · 러너·판정기 미import) |
| `data/otc-en-nonoral-verb-fix-plan.ga.json` | **apply 계획 원장(고정 보존)** + `run-*` 불변 사본 |
| `data/otc-en-nonoral-verb-fix-result.ga.json` | rollback-test / apply 결과 |
| `data/otc-en-nonoral-verb-fix-idempotency.ga.json` | **멱등 재실행 결과(계획 원장과 분리)** |
| `data/otc-en-nonoral-verb-fix-checkpoint.ga.json` | 25건 단위 체크포인트 |
| `data/otc-en-nonoral-verb-fix-verify.ga.json` | 독립검증 20 게이트 결과 |

---

## 11. 교정 실행 — 확정 오역 69 문장 / 49 설명서

[otc-en-nonoral-verb-fix.ga.ts](../../apps/api-server/src/scripts/otc-en-nonoral-verb-fix.ga.ts)

**판정 원장을 신뢰하지 않는다.** 원장에서 가져오는 것은 대상 후보뿐이고, 쓰기 전에 LIVE 에서 다시 증명한다.

| 가드 | 내용 |
|---|---|
| G-a | 옛 문장이 현재 본문에 **정확히 1회** 존재 |
| **G-b diff guard** | 옛→새 차이가 **허용된 동사 토큰 치환뿐**(take→use, taking→using …). 토큰 수 동일, 그 외 토큰 byte 동일 → **숫자·연령·기간·용량·금기·질환명은 구조적으로 변경 불가** |
| G-c | 교정 후 제품 대상 경구동사 잔여 0 |
| G-d | 역패치 복원 → 적용 전 해시와 byte 일치 |
| G-e | 길이 델타 = 치환분 합 |
| G-f | h2·li 수 · sd-* 마커 불변 · EN 본문 한글 혼입 0 |

### 11-1. 실행 게이트

| 단계 | 결과 |
|---|---|
| dry-run 2회 byte-identical | plan sha256 `e3ee871563df3c5c…` · planDigest `f9c324ebe06526df…` · 대상 49 설명서 / 69 문장 / blocked **0** |
| rollback-test 49 | PASS **49** / residue **0** / writeActual **0** |
| **LIVE apply** | GREEN **49** / exception 0 / **writeActual 49** / KO write **0** / 타 언어 write **0** / audit **0행** |
| 독립검증 20 게이트 | **failed 0 · failures 0** |
| 멱등 재실행 | 대상 **0** · write 0 · **계획 원장 byte 보존**(결과는 `-idempotency` 파일로 분리) |
| 판정 재실행(all540) | `INVALID_ROUTE_VERB` **69 → 0** |

DB write 계약: 행 단위 트랜잭션 + `SAVEPOINT`, `UPDATE … SET content, updated_at`,
**낙관적 잠금 `md5(content)=oldHash` + `language='en'` 고정 조건**, `rowCount=1` 아니면 차단.

---

## 12. 독립검증 20 게이트 (별도 코드 경로)

핵심 증명(**G4**): LIVE 본문에서 **새 문장만** 옛 문장으로 되돌리면 md5 가 적용 전 해시와 byte 일치한다(49/49).

| 게이트 | 기대 | 실측 |
|---|---:|---:|
| G0 EN canonical 총건 | 15,908 | 15,908 |
| G0b KO canonical 총건 | 15,908 | 15,908 |
| G1 / G1b / G1c 계획 설명서·문장 | 49 / 69 / 69 | 49 / 69 / 69 |
| G2 본문 해시 = 계획 newHash | 49 | 49 |
| G3 옛 문장 소거 | 69 | 69 |
| G3b 새 문장 유일 존재 | 69 | 69 |
| G4 역패치 → 적용 전 해시 일치 | 49 | 49 |
| G5 확정 오역 문형 잔존 | 0 | 0 |
| G9 숫자·연령·기간 토큰 드리프트 | 0 | 0 |
| G10 구조(h2·li·sd-*) 드리프트 | 0 | 0 |
| G11 상태·타입·언어·sourceRef·master 드리프트 | 0 | 0 |
| G12 EN 본문 한글 혼입 | 0 | 0 |
| G14 EN canonical 중복 master | 0 | 0 |
| G6 적용 창 이후 EN 갱신 총건 | 49 | 49 |
| G6b 적용 창 이후 **대상 밖** EN 갱신 | 0 | 0 |
| G7 적용 창 이후 **KO 갱신** | 0 | 0 |
| G7b 적용 창 이후 타 언어 갱신 | 0 | 0 |
| G7c 적용 창 이후 타 source_type 갱신 | 0 | 0 |

적용 창 기준 시각 = `2026-07-31 14:20:34.895287+00`(apply 직전 DB `now()`). 직전 `mfds_drug_otc` 최종 갱신은 `13:25:54` 였다.

---

## 13. 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `git fetch origin main` · 인계 커밋 3종 확인 | 전부 origin/main 포함, HEAD 동일 |
| proxy 기동(`--port 5524`) | ready |
| 모집단 재현 | 240/240 일치 · 누락 0 · 추가 0 |
| `tsx … otc-en-nonoral-verb-adjudication.ga.ts` | 337 판정 · 합계 PASS |
| `tsx … --scope all540` | 934 판정 · 합계 PASS · INVALID 69 |
| `tsx … otc-en-nonoral-verb-fix.ga.ts` (dry-run ×2) | 49 설명서 / 69 문장 · blocked 0 · plan byte-identical |
| `tsx … --rollback-test` | RBT PASS 49 · residue 0 · write 0 |
| `OTC_EN_VERB_FIX=CONFIRM … --apply --confirm` | GREEN 49 · **writeActual 49** · exception 0 |
| `tsx … otc-en-nonoral-verb-fix-verify.ga.ts --since …` | 20 게이트 **failed 0** |
| `tsx … otc-en-nonoral-verb-fix.ga.ts` (멱등) | 대상 0 · write 0 · 계획 원장 보존 |
| `tsc --noEmit -p tsconfig.json` | 오류 12건 — **전부 기존 스크립트**. 본 WO 산출물 0건 |
| 판정 단계 DB write | **0** |
| 교정 단계 DB write | **49행**(EN만) |
