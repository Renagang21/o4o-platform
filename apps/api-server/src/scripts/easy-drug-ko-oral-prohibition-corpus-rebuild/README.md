# WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1 — CHECK

비경구 설명서 저작 과정에서 `"내복하지 마십시오"` 가 경로 동사 재표현으로 파손된 기존 KO STORE
canonical 을, **제품별 e약은요 원문 기준으로 전수 재조립**했다.

- 선행 WO: `WO-O4O-EASY-DRUG-KO-SOURCE-CONSISTENCY-CORRECTION-V1` (커밋 `7ecc1e1a8`)
- 상태: **완료** — LIVE 적용 · 독립검증 PASS · 멱등 재실행 0 write · 전수 재스캔 잔존 파손 0

---

## 1. 후보 재산출 (실행기준 4·5)

224건은 **참고 시작값**으로만 쓰고 강제 목표로 삼지 않았다. 최신 LIVE 에서 경구 금지 표현
전 계열(`내복|복용|복약|먹|삼키|삼켜|경구`)과 금지 종결형 전 계열을 다시 산출했다.

| 항목 | 값 |
|---|---|
| 스캔 대조단위 (itemSeq × 본문 md5) | 4,083 |
| 원문에 안전 경구금지 문장이 있는 단위 | 1,646 |
| **파손 단위** | **207** |
| **파손 ProductMaster** | **955** |
| 원문 귀속 실패 단위 | 0 |
| 판정근거 | `SOURCE_DIFF+SELF_CONTRADICTION` 92 · `SELF_CONTRADICTION` 54 · `SOURCE_DIFF` 61 |

224건 패턴(`외용으로만 사용하고 사용하지`)의 distinct 본문 66건은 **66/66 포함**, 누락 0.
즉 이번 모집단은 224 를 재현하면서 그보다 넓다.

대조단위는 master 가 아니라 **(itemSeq × 본문 md5)** 다 — 같은 본문이 여러 master 에 걸려 있다.

## 2. 저작기 잔존 파손원 (실행기준 8)

`7ecc1e1a8` 로 이미 고쳤다고 본 저작기에서 **파손원 2곳이 더 남아 있었다.** 재조립 dry-run 1차에서
`POST_RENDER_DAMAGE` 240 master 가 나와 발견했다.

1. `otc-v2-store-leaflet-runner.shared.ts` — 레거시 3축 `composeKo` 가 아직 무조건 replace 였다.
   → `rewriteKoByRoute` 경유로 교체.
2. `otc-easy-drug-ready-ophthalmic-253-v3-composer.ga.ts` — 인라인 replace 루프 + 경구동사 잔존
   게이트가 금지 문장을 그대로 때리고 있었다. → `rewriteKoByRoute` · `stripOralProhibitionSentences` 경유로 교체.

더 깊은 원인은 보호 판정기 `isOralProhibitionSentence` 자체가 좁았다는 것이다.

- 경로 어휘 화이트리스트(`외용|국소|점안|바르|도포`)가 **안과용 · 질 · 코 · 귀 · 함수용 · 직장** 문장을 놓쳤다.
  실측: `"안과용 및 내복용으로 사용하지 마십시오."` → `"안과용 및 내사용으로..."`
- 금지 종결형에 `않습니다` · `하지 하십시오` 가 빠져 있었다.
  (`하지 하십시오` 는 오타 보정이 아니라 **e약은요 원문 자체의 결손형**이다 — itemSeq 200807607)
- 타 약물 병용 금지 문장(`"경구용 타크로리무스를 함께 복용하지 마십시오"`)은 경로 대조가 없어 아예 보호 밖이었다.

→ **경로 대조 조건을 없앴다.** 판정은 "금지 종결 직전 45자 창 안에 경구 어휘가 있는가" 하나다.

**의도된 보수적 트레이드오프:** 이제 `"이 약을 복용한 후 30분간 눕지 마십시오"` 같은 문장도
외용 설명서에서 원문 그대로 보존된다(재표현 안 함). 비용은 **가독성뿐이고 내용 정확성은 절대
잃지 않는다** — 화이트리스트는 원문 표현이 늘 때마다 새는 구조였고, 원문 보존 쪽은 틀릴 수 없다.

수정 후 재렌더 `postRenderDamage: 0`.

## 3. 재조립 계획 (실행기준 6·7)

문자열 치환은 하지 않았다. 제품 자기 e약은요 원문으로 **본문 전체를 다시 조립**했다.
엔진은 선행 WO 의 검증된 계약(`easy-drug-ko-critical-content-correction/correction-contract`) 재사용.

| 처분 | 건수 | 비고 |
|---|---:|---|
| REPLACE | **702** | topical 622 · vaginal 59 · oromucosal 21 · distinct 신규 본문 174 |
| HOLD (비노출) | **253** | `ROUTE_UNRESOLVED` 161 · `ROUTE_CONFLICT` 92 |

- HOLD 는 gencode 부재/모호 + 공식 용법 원문에서 경로 동사 미검출이라 경로를 확정할 수 없는 건이다.
  추측 저작보다 비노출이 안전하다(WO 원칙 6). 선례 = 선행 WO 의 `canonical_withdrawn` 43건.
- REPLACE 702건 전건이 온전한 경구 금지 문장을 보존하며, 자기모순 잔재 0.
- `replaceUnchangedMd5: 0` (변화 없는 REPLACE 는 계약 위반으로 STOP).
- 포함 검증: 적용 전 SQL 서명 파손 행 569건 중 대상 밖(OUTSIDE_TARGET) **0**.

## 4. dry-run · rollback · LIVE

| 단계 | 결과 |
|---|---|
| dry-run ×2 | 955/955 처리 · FAILED 0 · 전건 ROLLBACK |
| rollback-test | 955/955 원래 md5 로 canonical 유지 · audit 행 0 |
| **LIVE apply** | **REPLACED 702 · WITHDRAWN 253 · FAILED 0** |
| 멱등 재실행 (LIVE 2차) | `SKIP_NOT_CANONICAL` 702 · `SKIP_ALREADY_WITHDRAWN` 253 — **write 0** |

안전장치: master 별 독립 트랜잭션 + `FOR UPDATE` 3중 일치(id · status · md5) · 트랜잭션 내 post-verify ·
`--apply` + 전용 env 게이트 이중 잠금 · HOLD 회수는 `--withdraw-holds` 별도 플래그.

> `results/apply-live.json` 에 남은 것은 **2차(멱등) 실행**이다 — 1차 LIVE 결과는 audit 원장 955행과
> `verify-independent.json` 의 델타로 증명된다. 파일이 덮인 것이지 결과가 다른 게 아니다.

## 5. 독립검증 (`verify-independent.mjs`) — **PASS**

저작기도 JS 판정기도 import 하지 않고 파손 판정을 **Postgres 정규식으로 다시 작성**했다.
계획과 같은 코드로 검증하면 같은 버그를 함께 통과시키기 때문이다.

| | 검증 | 결과 |
|---|---|---|
| V1 | 활성 KO canonical 전수 파손 서명 | **0** |
| V2 | REPLACE → ko canonical 1건 + md5 일치 | 702/702 |
| V3 | HOLD → ko canonical 0건 | 253/253 |
| V4 | audit `canonical_replaced` / `canonical_withdrawn` | 702 / 253 |
| V5 | EN·ZH 본문·상태 변경 | **0** |
| V6 | 전역 델타 | koCanonical −253 · koDeprecated +955 · audit +955 (정확히 일치) |

전역 이동: canonical 63,283 → 63,030 · deprecated 19,689 → 20,644 · **damaged 569 → 0** · audit 19,672 → 20,627.

적용 후 전수 재스캔(양 detector · 코퍼스 전체): scannedUnits 4,050 · **damagedUnits 0** · damagedMasterSum 0.

## 6. 파생 EN·ZH 원장 (실행기준 9 · WO 원칙 8·9)

**EN·ZH 본문 write 0.** 이번 WO 는 식별만 한다.

| | |
|---|---:|
| 활성 EN canonical | **955** |
| 활성 ZH canonical | **7** |
| `RETRANSLATE_PENDING` (KO 가 REPLACE) | 709 |
| `WITHDRAW` (KO 가 HOLD·비노출) | 253 |

참고 시작값 EN 750 / ZH 56 은 재현했을 뿐 목표로 쓰지 않았다. 식별 기준은 **ProductMaster 연결**이다 —
기준본 KO 가 바뀐 이상 번역문을 다시 읽어 판정할 이유가 없고 오탐만 는다.
상태 분리(비노출/재번역 대기 전환)는 **후속 WO** 소관이다.

## 7. 완료 조건 대조

| WO 완료 조건 | 결과 |
|---|---|
| 활성 KO canonical 경구 금지 파손 0 | ✅ V1 = 0 · 전수 재스캔 0 |
| 공식 경로·부정어·금지 강도 손실 0 | ✅ 원문 대조 판정 통과 · 재표현 대신 원문 보존 |
| 잘못된 KO 파생 EN·ZH 전건 식별 | ✅ EN 955 · ZH 7 원장 |
| 해당 EN·ZH 번역 승인 상태 0 | ⏭ 원장까지가 이번 범위(원칙 8·9) — 상태 전환은 후속 WO |
| ProductMaster · sourceRef 변경 0 | ✅ `source_ref_id` 는 은퇴 행에서 승계 · product_masters write 0 |
| 대상 밖 update 0 | ✅ V6 델타 정확 일치 |
| 독립검증 PASS | ✅ |
| 신규 확대 적용 0 | ✅ 신규 저작 0 |

## 8. 후속

1. 번역 모집단에서 파생 EN 955 · ZH 7 제외 (승인 모집단 master 7,846 → 253 회수분 제외 + 702 재번역 표시)
2. `KO_MISSING_CONTENT` → `KO_EXTRA_CONTENT` → `KO_STRUCTURE_REMAINING`
3. 전체 감사 재실행 → 오류본 격리 → 번역 모집단 최종 잠금 → 기존 EN 전수 재검증 → 신규 zh·ja

---

## 파일

| 파일 | 역할 |
|---|---|
| `prohibition-contract.mjs` / `.d.mts` | 파손 판정 계약 (측정·계획 공용) |
| `measure-candidates.mjs` | 단계 1 후보 실측 (read-only) |
| `plan-rebuild.ts` | 단계 2 재조립 계획 + 재렌더 재판정 (read-only) |
| `apply-rebuild.ts` | 단계 3 LIVE 재조립 (이중 게이트) |
| `ledger-derived-translations.ts` | 단계 4 파생 EN·ZH 원장 (write 0) |
| `verify-independent.mjs` | 단계 5 독립검증 (저작기·판정기 미import) |
| `emit-plan-ledger.mjs` | 본문 없는 계획 원장 추출 (파일 변환) |

`results/rebuild-plan.json` 은 본문 포함 3.9MB 라 미추적이다(`results/.gitignore`).
추적 원장은 `rebuild-plan-ledger.jsonl` + `plan-summary.json`.
`candidate-measure.json` 은 **적용 후 재스캔 결과**(damaged 0)이고, 계획 입력이었던 원본은
`candidate-measure.before.json` 이다.
