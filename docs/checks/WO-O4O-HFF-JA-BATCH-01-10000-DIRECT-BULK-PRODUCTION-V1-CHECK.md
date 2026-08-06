# CHECK — WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1

건강기능식품(HFF) STORE 한국어 canonical을 기준으로 **일본어 설명서 Batch 01 신규 10,000건**을 직접 번역·디자인·검증·저장했다. 영어·중국어를 경유하지 않았다.

- 기준 commit: `ef0489971`
- 실행 일자: 2026-08-06
- 판정: **PASS** (렌더 검증 PASS · Apply expected==actual · 독립검증 PASS)

---

## 1. 시작 시점 실측

| 항목 | 값 |
|---|---|
| KO STORE canonical | 40,918 |
| EN STORE canonical | 40,902 |
| ZH STORE canonical | 40,918 |
| JA STORE canonical | 0 |
| JA 없는 KO 모집단 | 40,918 |

일본어 저장 계약은 §3에서 실측으로 확정했다 — `language='ja'` / `description_type='STORE'` / `status='canonical'` / `source_type='o4o_hff_generated'` / `source_ref_id` NULL. ZH 트랙과 동일한 축이다.

## 2. 생산 방식

KO canonical HTML을 템플릿으로 두고 **텍스트 슬롯만** 치환한다. 구조·class를 건드리지 않으므로 renderer family가 그대로 승계된다. 공유 class(`sd-item`·`sd-why`·`sd-func`)의 존재만으로 family를 판정하지 않았고, 실제 사용 class를 `ContentRenderer`의 `storeDescriptionCss` 정의 집합과 대조해 정의되지 않은 `sd-*`를 쓰는 문서는 생산하지 않고 `RENDER_FAILURE`로 남기는 경로를 두었다(이번 배치에서는 해당 0건).

번역은 사전 단독이 아니라 **합성 엔진**이다. 원자 단위 규칙 캐스케이드(`resolveAtom`)가 조사·서술부·수치·용법 구조를 처리하고, 사전은 공식 원료명·기능성 명사구·공식 문장 같은 확정 표기만 담당한다. 저작 라운드는 j1~j11로 진행했다.

| 라운드 | 생산 가능(10,000 표본) | 수치 drift |
|---|---:|---:|
| j6 | 4,286 | 0 |
| j7 | 5,083 | 0 |
| j7 보정 | 4,893 | 0 |
| j8 | 5,283 | 0 |
| j9 | 5,681 | 0 |
| j10 | 6,266 | 0 |
| j11 | **6,445** | 0 |

j7 보정에서 커버리지가 내려간 것은 의도한 결과다 — §6 위반 4건(뒤의 §5 참조)을 고치면서 잘못 매칭되던 문서가 빠졌다.

## 3. 모집단 선정 (중요)

§4에서 `master_id` 오름차순 선두 10,000건을 동결했으나, **그 선두 집합 중 실제 생산 가능한 것은 6,445건**이다. 나머지 3,555건을 배치에 남겨 두려면 "번역 대기" 성격의 HOLD를 만들어야 하는데, 이는 §7이 사유로 금지한 `PENDING_DIRECT_TRANSLATION` / `LOW_EFFICIENCY`에 정확히 해당한다.

따라서 **같은 정렬(`master_id` ASC)을 이어서 채우는** 방식을 택했다. 풀 40,918건 전체에 대해 생산을 시도하고 생산 가능한 선두 10,000건을 배치로 삼는다. 동일 사전·동일 KO이면 항상 같은 배치가 재현된다.

| 항목 | 값 |
|---|---:|
| 풀 전체 생산 가능 후보 | 26,207 |
| 배치로 채택 | 10,000 |
| 그중 §4 동결 선두 집합 소속 | 6,445 |
| 풀에서 생산되지 않음 | 14,711 |

생산되지 않은 14,711건은 문제 큐에 넣지 않았다. 사유가 "아직 번역 규칙이 닿지 않았다"이며, 이는 §7이 금지한 HOLD 사유이기 때문이다. 이들은 다음 배치에서 사전·규칙이 넓어지면 같은 정렬로 자연히 들어온다.

## 4. 검증

### 렌더 검증 (§8)

430 / 820 / 1280px 3폭. 구조 시그니처 468종 전수 + 고위험 문서(인정번호 보유·태그 6개 이상) 전수 = 6,088 문서 × 3폭 = **18,264 렌더**.

```
structureParity 0 · pageOverflow 0 · elementOverflow 0 · clipped 0
emptyH2 0 · emptyUl 0 · emptyLi 0 · undefinedClass 0 · rawHtml 0
hangulVisible 0 · markerVisible 0 · labelLost 0 · licenseNoLost 0 · simplifiedVisible 0
verdict: PASS
```

### Apply (§8)

INSERT 전용. 이중 게이트(`--apply` + `HFF_JA_B01_APPLY_CONFIRM=YES`), rollback manifest 선기록, 행 단위 KO 해시 낙관적 잠금 + JA 중복 가드, 500건 샤드 트랜잭션.

| 항목 | before | after |
|---|---:|---:|
| spd 전체 | 208,587 | 218,587 |
| KO canonical | 40,918 | 40,918 |
| EN canonical | 40,902 | 40,902 |
| ZH canonical | 40,918 | 40,918 |
| JA canonical | 0 | **10,000** |
| ProductMaster(HFF) | 40,948 | 40,948 |

inserted 10,000 / skipped 0 / failedShards 0 / **expectedEqualsActual true**

### 독립검증 (§8)

apply 산출물을 신뢰하지 않고 DB 현재 상태만 읽어 read-only로 재계산했다.

```
batchTotal 10000 · contractViolations 0 · contentMismatch 0
hangulInSlots 0 · simplifiedInSlots 0 · numberDrift 0 · rowsNotInBatch 0
koHashDrift 0 · koUnchanged/enUnchanged/zhUnchanged/pmUnchanged true
jaDelta 10000 (= inserted) · canonicalDup 0 · writesOutsideBatch 0
issueQueue 23 · dup 0 · missingField 0 · badType 0
verdict: PASS
```

`simplifiedInSlots 0`은 §1의 "영어·중국어를 경유하지 않는다"를 산출물로 재확인한 것이다 — 중국어 간체 전용 자형이 일본어 본문에 하나도 없다.

## 5. 계약 보존 중 잡아낸 결함

생산 도중 발견해 고친 §6 위반이다. 모두 사전 라운드 간 동음이의 충돌 또는 규칙의 과잉 매칭이었다.

| 결함 | 영향 | 조치 |
|---|---|---|
| `유지` → `油脂` | 기능성 문맥의 維持가 油脂로 뒤집힘 (의미 역전) | VSTEM에 維持 등록 + j8에서 맨키 확정, 油脂는 `함유 유지` 복합어로만 재확보 |
| `이상` → `以上` | 안전 문구의 異常이 수치 비교어로 뒤집힘 | j8에서 異常 복원, 수치 비교(`3g 이상`)는 규칙이 처리함을 확인 |
| 항목 번호 규칙 과잉 매칭 | 맨숫자를 항목 번호로 인정해 `1일 1회`의 `1`까지 접두로 분리 → **수치 drift 1,037건** | 번호는 구분 기호(`)` `.` `]`) 동반 또는 동그라미 숫자일 때만 인정 |
| `のの` 연속 | 중첩 규칙이 `の`를 이중 부착 (`β-カロテンのの吸収`) | `tailNorm()`에서 축약 |

수치 drift는 이 1회 회귀를 제외하면 모든 라운드에서 0이었고, 최종 산출물에서도 0이다.

번역 판단이 서지 않는 구간은 추측하지 않고 막아 두었다. 예로 일부 식물명 음역(`참당귀` 등)과 제품명이 본문 슬롯에 들어가는 홍삼 계열 도입 문장은 생산하지 않았다 — 후자는 슬롯 안에 한국어 제품명이 남아 독립검증의 `hangulInSlots`에 잡히는 것이 정상이며, 이를 면제로 우회하지 않았다.

## 6. 문제 큐

`data/hff-ja-deferred-issue-queue-v1.jsonl` — 23건. 모두 §7 허용 유형이며 KO canonical은 수정하지 않았다.

| issueType | 건수 | 내용 |
|---|---:|---|
| `TRANSLATION_AMBIGUOUS` | 22 | 슬롯은 모두 옮겼으나 본문에 판단 미확정 구간이 남음 |
| `NUMBER_STRUCTURE_AMBIGUOUS` | 1 | 수치·단위 구조가 슬롯 단위로 보존되지 않음 |

## 7. 산출물

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/scripts/hff-ja-b01-translate.mjs` | 합성 번역 엔진 (규칙 캐스케이드 + 사전 로더) |
| `apps/api-server/src/scripts/hff-ja-b01-build.mjs` | KO HTML 슬롯 치환 · 구조 패리티 |
| `apps/api-server/src/scripts/hff-ja-b01-render.mjs` / `-render-worker.mjs` | 3폭 렌더 검증 · 모집단 확정 |
| `apps/api-server/src/scripts/hff-ja-b01-apply.mjs` | 이중 게이트 INSERT · rollback manifest |
| `apps/api-server/src/scripts/hff-ja-b01-verify.mjs` | DB 상태만으로 재계산하는 독립검증 |
| `data/hff-ja-b01-j1..j11-translations-v1.json` | 저작 라운드 사전 |
| `data/hff-ja-b01-render-audit-v1.json` · `-apply-result-v1.json` · `-verify-v1.json` | 감사 산출물 |
| `data/hff-ja-b01-rollback-v1.json` | 되돌리기 계약 (삽입 행 soft delete) |

## 8. 다음

Batch 02는 같은 정렬을 이어 생산한다. 현재 사전·규칙으로 풀에 남은 생산 가능 후보는 16,207건이며, 저작 라운드를 더하면 늘어난다. 미해결 상위군의 머리는 이미 평평해졌으므로(최다 9건, docs≥5 합계 297건) 다음 배치의 커버리지 확대는 사전보다 규칙 쪽에서 나올 것으로 본다.
