# WO-O4O-HFF-JA-BATCH-02-10000-DIRECT-BULK-PRODUCTION-V1 — CHECK

건강기능식품(HFF) STORE 설명서 **일본어(JA) Batch 02 10,000건** 직접 번역·디자인·검증·저장 결과.

| 항목 | 값 |
|------|----|
| 착수 HEAD | `41533dc5393c75d3a0c3400b1125de7374e36322` |
| 기준 commit | `94871c2cd` (조상 확인 `git merge-base --is-ancestor` OK) |
| 브랜치 / 작업트리 | `main` / clean |
| DB | 프로덕션 `o4o_platform` (Cloud SQL Auth Proxy `127.0.0.1:5463`) |
| 판정 | **PASS** |

---

## 1. 모집단 재현

| 항목 | 값 |
|------|----|
| KO STORE canonical (HFF) | 40,918 |
| JA canonical (착수 시) | 10,000 |
| JA 미보유 풀 | 30,918 |
| KO 영구 HOLD 제외 | 0 |
| 현재 자산·규칙으로 생산 가능 | **17,414** |
| 생산 불가(차단) | 13,504 — UNRESOLVED 13,476 / SIMPLIFIED_REMAINS 27 / NUMBER_DRIFT 1 |
| Batch 02 크기 | **10,000** (master_id ASC 선두) |
| 전량 전환(fullFallback) | 아니오 — 후보 17,414 > 10,000 |
| ProductMaster·koCanonicalId 중복 | 0 |

후보가 10,000 을 넘으므로 §3 의 "정상 후보 전량 전환" 분기는 발동하지 않았다.
모집단은 `hff-ja-b02-ids-v1.json` 의 `idsHash` 로 고정되며, 같은 KO·자산·규칙이면 같은 10,000 건이 재현된다.

## 2. 직접 번역 · 신규 문구

| 항목 | 값 |
|------|----|
| 저작 라운드 | j1 ~ **j12** (신규 j12 1개 추가) |
| j12 신규 문구 | **285** |
| 사전 크기 | clause/label/meta/badge/intro/foot/spec 1,775 · heading 1,786 |
| 생산 가능 증가 | 16,207 → **17,414** (+1,207) |
| EN·ZH 경유 | 없음 (KO canonical 만 기준본) |

j12 는 잔여 풀 30,918 문서의 최다 빈도 미해결 문구를 대상으로 저작했다. 주요 결정:

- **KO 원문 오타는 KO canonical 을 고치지 않고, 옮기는 쪽만 정규 표기로 옮겼다.**
  `에너지 성성/체네` → 生成, `개손` → 改善, `펠요` → 必要, `월활` → 円滑, `상답` → 相談, `함성` → 合成, `질환이 잇거나` → ある.
  오타를 일본어에 재현하면 공식 문구가 아닌 문장이 되므로, 문맥상 의미가 확정되는 경우에만 적용했다.
- **강도가 다른 이형(異形)은 합치지 않았다.** "섭취에 주의" / "섭취를 삼가야 함" / "섭취하지 말 것" / "전문의와 상담할 것" 은 각각 별도 항목으로 등재했다(§5 주의·금지·상담·중단 강도 보존).
- **불확실한 식물 음역은 추정하지 않고 차단 상태로 남겼다** (Batch 01 과 동일 기조).
- 원료명은 기존 사전 관례를 따랐다 — `인삼`→高麗人参, `홍삼`→紅参, `추출물`→抽出物, `주정추출`→エタノール抽出.

### 2-1. 저작 중 발견·교정한 결함 (자체 교정)

j12 1차 저작 후 오프라인 측정에서 `numberDrift` 가 1 → 7 로 증가했다.
원인은 섭취방법 문구 4건에서 `스푼` 을 `杯` 로 옮긴 것으로, 엔진의 KO↔JA 단위 대응표
(`hff-ja-b01-translate.mjs` `UNIT_JA`: `스푼 → スプーン`)와 어긋나 수치 게이트가 단위 유실로 판정했다.
해당 4건을 `スプーン` 으로 교정한 뒤 `numberDrift` 는 **1** 로 복귀했다.

남은 1건은 j12 이전부터 존재하던 `1일 1회, 1회 적색캡슐 1개(1,000 mg)와 녹색캡슐 1개(1,000 mg)…` 문구로,
차단 유지가 정답이며 문제 큐에 `NUMBER_STRUCTURE_AMBIGUOUS` 로 남아 있다.

## 3. Batch 01 확정 교정 규칙 회귀

| 규칙 | 결과 |
|------|------|
| 유지 → 油脂 의미 역전 | 발생 0 |
| 안전 문맥 이상 → 以上 오역 | 발생 0 |
| 항목 번호 ↔ 1일·1회 수치 혼동 | `numberDrift` 게이트 통과, 생산분 수치 유실 0 |
| のの 중복 조사 | 발생 0 |

## 4. 렌더 검증 (§7)

`hff-ja-b02-render-audit-v1.json` — **verdict PASS**

| 항목 | 값 |
|------|----|
| 렌더 문서 | 5,963 (구조 시그니처 463종 전수 + 고위험 전수) |
| 폭 | 430 / 820 / 1280 px — 렌더 17,889회 |
| structureParity / pageOverflow / elementOverflow / clipped | 0 / 0 / 0 / 0 |
| emptyH2 / emptyUl / emptyLi / undefinedClass | 0 / 0 / 0 / 0 |
| rawHtml / markerVisible | 0 / 0 |
| hangulVisible / simplifiedVisible | 0 / 0 |
| labelLost / licenseNoLost | 0 / 0 |
| canonicalDup | 0 |

## 5. Apply

`hff-ja-b02-apply-result-v1.json` — INSERT 전용, 이중 게이트(`--apply` + `HFF_JA_B02_APPLY_CONFIRM=YES`),
rollback manifest 선기록, 행 단위 KO hash 낙관적 잠금 + JA 중복 가드, 500행 샤드 트랜잭션.

| 항목 | expected | actual |
|------|---------:|-------:|
| INSERT | 10,000 | **10,000** |
| UPDATE | 0 | 0 |
| SKIP | 0 | 0 |
| 실패 샤드 | 0 | 0 |

`expectedEqualsActual: true`

| 전역 | before | after |
|------|-------:|------:|
| spd_all | 218,587 | 228,587 |
| KO canonical | 40,918 | 40,918 |
| EN canonical | 40,902 | 40,902 |
| ZH canonical | 40,918 | 40,918 |
| **JA canonical** | 10,000 | **20,000** |
| ProductMaster(HFF) | 40,948 | 40,948 |

## 6. 독립검증 (§7)

`hff-ja-b02-verify-v1.json` — apply 산출물을 신뢰하지 않고 DB 현재 상태만 읽어 재계산. read-only, dbWrites 0.

| 항목 | 값 |
|------|----|
| Batch 02 상태 합계 | 10,000 (= 배치 크기) |
| 계약 위반(language/status/type/source) | 0 |
| 저장 본문 ≠ 렌더 통과 본문 | 0 |
| 슬롯 한국어 / 간체중국어 | 0 / 0 |
| 수치·단위 drift | 0 |
| KO canonical hash drift | 0 |
| KO / EN / ZH / ProductMaster 불변 | 예 / 예 / 예 / 예 |
| JA 증가량 == 삽입 수 | 예 (10,000) |
| canonicalDup | 0 |
| Batch 밖 write | 0 |
| 문제 큐 누락·중복·잘못된 유형 | 0 / 0 / 0 |
| 생산된 제품이 큐에 잔존 | 0 |

**verdict: PASS**

## 7. 기존 JA 10,000 회귀검증 (§7 추가)

`hff-ja-b02-regression-v1.json` — 공용 엔진·자산(j12)을 넓힌 뒤 Batch 01 저장분이 영향을 받는지 확인.

| 항목 | 값 |
|------|----|
| 검사 문서 | 10,000 (저장본 10,000 전량 확인) |
| 저장된 기존 canonical 수정 | **0** |
| 생산 가능성 악화 | **0** |
| 구조 차이 | **0** |
| 패리티 파손 | 0 |

**verdict: PASS**

> 본문 문구가 달라지는 것은 회귀가 아니다. 사전이 넓어지면 더 자연스러운 표기가 나올 수 있고, 저장된 행은 이 WO 에서 건드리지 않는다.
> 회귀는 **구조 · 생산 가능성 · 저장본 무결성** 으로만 판정했다.

## 8. 문제 큐

`data/hff-ja-deferred-issue-queue-v1.jsonl` — 승계 23 + 신규 5 = **28**

| batch | issueType | 건수 |
|-------|-----------|-----:|
| batch01 | TRANSLATION_AMBIGUOUS | 22 |
| batch01 | NUMBER_STRUCTURE_AMBIGUOUS | 1 |
| batch02 | TRANSLATION_AMBIGUOUS | 5 |

- 신규 5건은 간체 전용 자형이 슬롯에 남는 문구(`SIMPLIFIED_REMAINS`) 로, 원문 표기 자체가 모호하여 `TRANSLATION_AMBIGUOUS` 로 분류했다.
- 이번 배치로 생산된 제품이 큐에 남은 건수는 0 이다(§6 "이미 해결된 제품을 다시 문제로 남기지 않는다").
- KO canonical 은 수정하지 않았다.

## 9. 최종 수치

| 항목 | 값 |
|------|----|
| JA canonical 최종 | **20,000** |
| KO canonical | 40,918 (불변) |
| 남은 JA 미생산 | **20,918** |
| 다음 정상 생산 가능 후보 | **7,414** |
| 나머지 | 13,504 (현재 자산으로 차단 — 다음 라운드 저작 대상) |

## 10. 산출물

| 파일 | 내용 |
|------|------|
| `apps/api-server/src/scripts/hff-ja-b02-measure.mjs` | 잔여 풀 오프라인 측정 |
| `apps/api-server/src/scripts/hff-ja-b02-render.mjs` | 모집단 확정 + 3폭 렌더 검증 + 문제 큐 병합 |
| `apps/api-server/src/scripts/hff-ja-b02-apply.mjs` | INSERT 전용 apply (이중 게이트) |
| `apps/api-server/src/scripts/hff-ja-b02-verify.mjs` | DB 재계산 독립검증 |
| `apps/api-server/src/scripts/hff-ja-b02-regression.mjs` | 기존 JA 10,000 회귀검증 |
| `apps/api-server/src/scripts/data/hff-ja-b01-j12-translations-v1.json` | 신규 저작 라운드 285문구 |
| `apps/api-server/src/scripts/data/hff-ja-b02-*.json` | 모집단·렌더 감사·rollback·apply·verify·regression·measure |
| `apps/api-server/src/scripts/data/hff-ja-deferred-issue-queue-v1.jsonl` | 통합 문제 큐 28건 |

## 11. Rollback

INSERT 전용이므로 되돌리기는 삽입된 JA canonical 행의 soft delete 이다.
`hff-ja-b02-rollback-v1.json` 에 apply 이전 전역 수치와 대상 목록이 기록되어 있고,
`hff-ja-b02-apply-result-v1.json` 의 `insertedIds` 10,000 건이 대상이다.

## 12. 중지 조건 점검

| 조건 | 발생 |
|------|:----:|
| 모집단 재현 실패 | 아니오 |
| 제품·원료 간 데이터 혼입 | 아니오 |
| 대량 drift | 아니오 |
| 중복 canonical | 아니오 |
| Batch 밖 write | 아니오 |
| rollback 불가 | 아니오 |
| 독립검증 실패 | 아니오 |

중지 조건 해당 없음. 개별 문제 28건은 큐에 기록하고 진행했다.
