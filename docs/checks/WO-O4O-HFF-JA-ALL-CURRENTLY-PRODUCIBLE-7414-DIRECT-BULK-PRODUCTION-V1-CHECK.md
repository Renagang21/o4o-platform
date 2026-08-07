# WO-O4O-HFF-JA-ALL-CURRENTLY-PRODUCIBLE-7414-DIRECT-BULK-PRODUCTION-V1 — CHECK

건강기능식품(HFF) STORE 설명서 **일본어(JA) — 현재 생산 가능 전량** 직접 번역·디자인·검증·저장 결과.

| 항목 | 값 |
|------|----|
| 착수 HEAD | `a1ccf5a6303e06d63dcd22e52bf1ee9075511492` |
| 기준 commit | `8efcd0fea` (조상 확인 `git merge-base --is-ancestor` OK) |
| 브랜치 / 작업트리 | `main` / 착수 시 clean |
| DB | 프로덕션 `o4o_platform` (Cloud SQL Auth Proxy `127.0.0.1:5463`) |
| 판정 | **PASS** |

---

## 1. 모집단 재현 (§3)

| 항목 | 값 |
|------|----|
| KO STORE canonical (HFF) | 40,918 |
| JA canonical (착수 시) | 20,000 |
| JA 미보유 풀 | 20,918 |
| KO 영구 HOLD 제외 | 0 |
| **현재 자산·규칙으로 생산 가능 전량** | **7,414** |
| 대조 기준선(직전 배치 보고치) | 7,414 |
| **baselineDelta** | **0** — 정확히 재현 |
| 배치 크기 | **7,414** (= 생산 가능 전량, `truncated: false`) |
| 생산 불가(차단) | 13,504 — UNRESOLVED 13,476 / SIMPLIFIED_REMAINS 27 / NUMBER_DRIFT 1 |
| ProductMaster·koCanonicalId 중복 | 0 |

- 상한을 두지 않았다. **생산 가능 전량이 곧 배치**이며, 배치 이후 남는 생산 가능분은 0 (`remainingProducibleAfterBatch: 0`).
- 숫자 7,414 를 맞추기 위한 임의 제외는 없다. 모집단은 "JA 부재 · KO 영구 HOLD 제외 · 현재 자산으로 build 가능" 술어만으로 결정되었고, 결과가 기준선과 우연히 일치한 것이 아니라 **자산을 동결했으므로 동일 술어가 동일 집합을 낸 것**이다.
- 모집단은 `hff-ja-b03-ids-v1.json` 의 `idsHash` 로 고정된다.

### 1-1. 저작 자산 동결 판단

이번 WO 의 모집단 정의는 "**현재** 자산·규칙 기준 생산 가능"이다. 신규 저작 라운드(j13)를 추가하면 모집단 자체가 커져 정의와 충돌하므로,
사전은 j1~j12 로 **동결**하고 진행했다. 새로운 직접 번역 저작은 §9 가 요구하는 "다음 단계" 항목으로 넘긴다(아래 §9).

## 2. 직접 번역 · 신규 문구 (§4)

| 항목 | 값 |
|------|----|
| 저작 라운드 | j1 ~ j12 (**신규 라운드 없음 — 자산 동결**) |
| 신규 저작 문구 | **0** |
| 직접 번역 생산 문서 | **7,414** (KO canonical 만 기준본) |
| EN·ZH 경유 | 없음 |

KO canonical HTML 구조를 템플릿으로 두고 **텍스트 슬롯만** 치환했다. 구조가 불변이므로 기존 renderer family 가 그대로 승계된다.

## 3. Batch 01·02 확정 교정 규칙 회귀 (§5)

| 규칙 | 결과 |
|------|------|
| 유지 → 油脂 의미 역전 | 발생 0 |
| 안전 문맥 이상 → 以上 오역 | 발생 0 |
| 항목 번호 ↔ 1일·1회 수치 혼동 | 생산분 수치 유실 0 (독립검증 `numberDrift 0`) |
| のの 중복 조사 | 발생 0 |
| 스푼 → スプーン 단위 계약 | 유지 (`UNIT_JA` 대응표와 일치) |

## 4. 렌더 검증 (§7)

`hff-ja-b03-render-audit-v1.json` — **verdict PASS**

| 항목 | 값 |
|------|----|
| 렌더 문서 | 4,535 (구조 시그니처 405종 전수 + 고위험 전수) |
| 폭 | 430 / 820 / 1280 px — 렌더 13,605회 |
| structureParity / pageOverflow / elementOverflow / clipped | 0 / 0 / 0 / 0 |
| emptyH2 / emptyUl / emptyLi / undefinedClass | 0 / 0 / 0 / 0 |
| rawHtml / markerVisible | 0 / 0 |
| hangulVisible / simplifiedVisible | 0 / 0 |
| labelLost / licenseNoLost | 0 / 0 |
| canonicalDup | 0 |

## 5. Apply

`hff-ja-b03-apply-result-v1.json` — INSERT 전용, 이중 게이트(`--apply` + `HFF_JA_B03_APPLY_CONFIRM=YES`),
rollback manifest 선기록, 행 단위 KO hash 낙관적 잠금 + JA 중복 가드, 샤드 트랜잭션.

| 항목 | expected | actual |
|------|---------:|-------:|
| INSERT | 7,414 | **7,414** |
| UPDATE | 0 | 0 |
| SKIP | 0 | 0 |
| 실패 샤드 | 0 | 0 |

`expectedEqualsActual: true`

| 전역 | before | after |
|------|-------:|------:|
| spd_all | 228,587 | 236,001 |
| KO canonical | 40,918 | 40,918 |
| EN canonical | 40,902 | 40,902 |
| ZH canonical | 40,918 | 40,918 |
| **JA canonical** | 20,000 | **27,414** |
| ProductMaster(HFF) | 40,948 | 40,948 |

## 6. 독립검증 (§7)

`hff-ja-b03-verify-v1.json` — apply 산출물을 신뢰하지 않고 DB 현재 상태만 읽어 재계산. read-only, dbWrites 0.

| 항목 | 값 |
|------|----|
| 대상 상태 합계 | 7,414 (= 현재 생산 가능 전량) |
| 계약 위반(language/status/type/source) | 0 |
| 저장 본문 ≠ 렌더 통과 본문 | 0 |
| 슬롯 한국어 / 간체중국어 | 0 / 0 |
| 수치·단위 drift | 0 |
| KO canonical hash drift | 0 |
| KO / EN / ZH / ProductMaster 불변 | 예 / 예 / 예 / 예 |
| JA 증가량 == 삽입 수 | 예 (7,414) |
| canonicalDup | 0 |
| 대상 밖 write | 0 |
| 문제 큐 누락·중복·잘못된 유형 | 0 / 0 / 0 |
| 생산된 제품이 큐에 잔존 | 0 |

**verdict: PASS**

## 7. 기존 JA 20,000 회귀검증 (§7 추가)

`hff-ja-b03-regression-v1.json` — Batch 01 + Batch 02 저장분 전량 대조.

| 항목 | 값 |
|------|----|
| 검사 문서 | 20,000 (저장본 20,000 전량 확인) |
| 저장된 기존 canonical 수정 | **0** |
| 생산 가능성 악화 | **0** |
| 구조 차이 | **0** |
| 패리티 파손 | 0 |

**verdict: PASS** — 이번 WO 는 자산을 동결했고, 동결이 실제로 지켜졌음이 이 검사로 함께 확인된다.

## 8. 문제 큐 (§6)

`data/hff-ja-deferred-issue-queue-v1.jsonl` — 승계 28 + 신규 0 = **28**

| batch | issueType | 건수 |
|-------|-----------|-----:|
| batch01 | TRANSLATION_AMBIGUOUS | 22 |
| batch01 | NUMBER_STRUCTURE_AMBIGUOUS | 1 |
| batch02 | TRANSLATION_AMBIGUOUS | 5 |

- 자산을 동결했으므로 차단 사유 집합이 직전 배치와 동일하고, 신규 큐 항목은 0 이다.
- 차단 13,504건 중 UNRESOLVED 13,476건은 큐에 남기지 않았다 — §4 가 금지한 `PENDING_DIRECT_TRANSLATION` / `LOW_EFFICIENCY` HOLD 에 해당하기 때문이며, 다음 저작 라운드의 정규 대상이다.
- 이번 배치로 생산된 제품이 큐에 남은 건수 0. KO canonical 은 수정하지 않았다.

## 9. 최종 수치 · 다음 단계

| 항목 | 값 |
|------|----|
| JA canonical 최종 | **27,414** |
| KO canonical | 40,918 (불변) |
| 남은 JA 미생산 | **13,504** |
| 현재 자산으로 남은 생산 가능분 | **0** (전량 소진) |
| **다음 단계에서 새로 직접 번역이 필요한 문서** | **13,504** |
| **다음 단계 추정 미해결 문구(서로 다른 것)** | **17,991** |

다음 배치는 반드시 **신규 저작 라운드(j13~)** 를 동반해야 한다. 현재 자산만으로 추가 생산 가능한 문서는 남아 있지 않다.

## 10. 산출물

| 파일 | 내용 |
|------|------|
| `apps/api-server/src/scripts/hff-ja-b03-render.mjs` | 모집단 확정(무절단) + 3폭 렌더 검증 + 문제 큐 병합 |
| `apps/api-server/src/scripts/hff-ja-b03-apply.mjs` | INSERT 전용 apply (이중 게이트) |
| `apps/api-server/src/scripts/hff-ja-b03-verify.mjs` | DB 재계산 독립검증 |
| `apps/api-server/src/scripts/hff-ja-b03-regression.mjs` | 기존 JA 20,000(Batch 01+02) 회귀검증 |
| `apps/api-server/src/scripts/data/hff-ja-b03-*.json` | 모집단·렌더 감사·rollback·apply·verify·regression |
| `apps/api-server/src/scripts/data/hff-ja-deferred-issue-queue-v1.jsonl` | 통합 문제 큐 28건 |

## 11. Rollback

INSERT 전용이므로 되돌리기는 삽입된 JA canonical 행의 soft delete 이다.
`hff-ja-b03-rollback-v1.json` 에 apply 이전 전역 수치와 대상 목록이 있고,
`hff-ja-b03-apply-result-v1.json` 의 `insertedIds` 7,414 건이 대상이다.

## 12. 중지 조건 점검 (§8)

| 조건 | 발생 |
|------|:----:|
| 현재 생산 가능 전량 재현 실패 | 아니오 (baselineDelta 0) |
| 제품·원료 간 데이터 혼입 | 아니오 |
| 대량 drift | 아니오 |
| 중복 canonical | 아니오 |
| 대상 밖 write | 아니오 |
| rollback 불가 | 아니오 |
| 독립검증 실패 | 아니오 |

중지 조건 해당 없음. 개별 문제 28건은 큐에 기록하고 진행했다.
