# CHECK — WO-O4O-EASY-DRUG-KO-DERIVED-TRANSLATION-UNPUBLISH-V1

**파생 EN·ZH 설명서 공개 노출 중단 (교체 전 KO 파생분)**

- 실행일: 2026-08-05
- 선행: `WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1` (KO 19,363 전량 교체, `ace09847c` · `e2e35b2fe`)
- 판정: **PASS**
- DB write: `shared_product_descriptions.status` 19,993행 (+ `updated_at`). 그 외 컬럼 write 0.

---

## 1. 목적

정상 KO 가 전면 교체된 상태에서 **교체 전 KO 에서 파생된 EN·ZH 를 계속 공개하면 이미 폐기한 오류가
영어·중국어 화면에 그대로 남는다.** 신규 KO 기준으로 재번역·검증되기 전까지 QR·태블릿·공개 목록에서
노출되지 않게 한다.

삭제가 아니라 **비노출**이다. 본문을 남겨야 재번역 시 대조가 가능하다.

## 2. 노출 계약 (사전 조사 결론)

모든 공개 read 경로가 `status='canonical'` 을 건다 — `canonical → hidden` 이면 노출이 사라진다.

| 경로 | 위치 |
|------|------|
| 태블릿 콘텐츠 소스 | `routes/platform/store-public/store-public-tablet-content-source.ts:66-83` |
| 매장 공개 조회 | `store-public-utils.ts:221-230`, `:515-524` |
| GlycoPharm 매장 | `routes/glycopharm/controllers/store.controller.ts:161-170` |
| QR 랜딩 언어 목록·본문 | `modules/neture/services/product-landing.service.ts:248-253`, `:267-275` |

`hidden` 의 정의는 "관리자 숨김 또는 노출 중단" (`SharedProductDescription.entity.ts:67`).
`hidden` 을 특별 취급하는 read 경로는 없다.

**잔여 위험(변동 없음):** `kpa_store_contents` 로 이미 복사된 독립 사본은 원본 status 를 재확인하지
않는다 (`routes/o4o-store/controllers/store-content.controller.ts:561-607`). 이번 대상 EN·ZH 를
참조하는 사본은 별도 감사 대상으로 남긴다(§7).

## 3. 실행 계약 이행

| # | 요구 | 이행 |
|:-:|------|------|
| 1 | 커밋된 census 사용 + LIVE 재guard | `translation-status-ledger.jsonl` 19,993행을 대상으로 삼되, 계획 단계에서 DB 를 다시 읽어 `status`·`md5(content)`·`language` 재확인. 탈락 0 |
| 2 | `id`·`master_id`·`language`·`status`·content hash 재확인 | 계획 시 1회 + `FOR UPDATE` 락 후 transaction 안에서 1회, 총 2회 |
| 3 | `status='canonical'` 인 대상만 변경 | 행 guard + `UPDATE … WHERE status='canonical' AND COALESCE(language,'ko') <> 'ko'`. rowCount 불일치 시 배치 ROLLBACK |
| 4 | 본문·`source_ref_id` byte-identical | `SET` 절에 없음. 같은 transaction 안에서 md5·source_ref_id 불변 post-verify. 위반 시 ROLLBACK |
| 5 | 안전한 배치 transaction | 200행 단위 `BEGIN → FOR UPDATE → guard → UPDATE → post-verify → COMMIT`. 100 배치 |
| 6 | dry-run·rollback-test | dry-run ×2 planDigest 동일, rollback 은 **같은 write 함수**(`hideBatch`)에 `commit:false` |
| 7 | LIVE 적용 | 19,993행 |
| 8 | 공개 경로 EN·ZH 0 확인 | `post-verify-hide.mjs` |
| 9 | KO 유지 확인 | 19,363 |
| 10 | 멱등 재실행 write 0 | planned 0 / write 0 |
| 11 | CHECK·pathspec commit·push | 본 문서 |

## 4. 단계별 결과

### 4-1. dry-run ×2

```
planned            19,993      (EN 19,081 · ZH 912)
skippedAtPlan      0
byClass            RETRANSLATE_REQUIRED 19,888 · WITHDRAW_TRANSLATION 105
planDigest         bb33f8374cb668420c50ff325f37af46930d546570162688475943252040a8ca   (run1 = run2)
```

### 4-2. rollback 시험

같은 `hideBatch` 로 100 배치 전건 write + in-TX post-verify 통과 후 ROLLBACK.

```
rolledBackUpdates  19,993
problemCount       0
residue            0   (db-state-before-hide-rollback ↔ after-hide-rollback 전 축 동일)
```

대조 축: `scopedByLangStatus` · `global` · `otherLanguage`(본문 digest 포함) · `masterCounts`.

### 4-3. LIVE 적용

```
planDigest         bb33f837…   (dry-run 과 동일 — 계획과 적용 대상이 같음)
batches            100
statusUpdated      19,993
problemCount       0
```

### 4-4. 적용 후 독립 검증 (`post-verify-hide.mjs`, DB 재조회)

```
targetRows                     19,993
hiddenConfirmed                19,993
notHiddenCount                 0
missingCount                   0
contentChangedCount            0        ← 본문 write 0
sourceRefChangedCount          0        ← lineage write 0
publicCanonicalByLangInPopulation  { ko: 19,493 }
publicEnExposed                0
publicZhExposed                0
koCanonicalOnAppliedMasters    19,363 / appliedMasters 19,363
result                         PASS
```

`ko 19,493` = 이번 run 정상본 **19,363** + HOLD master 에 남은 기존 KO **130**(§7).

### 4-5. LIVE 전후 DB 상태 차이

`canonical → hidden` 셀 이동만 발생했다. 다른 변화 없음.

| lang | sourceType | canonical 감소 | hidden 증가 |
|------|-----------|:---:|:---:|
| en | mfds_drug_otc | 14,636 | 14,636 |
| en | mfds_drug_otc_nutrition_combo | 1,884 | 1,884 |
| en | o4o_drug_otc_topical | 2,558 | 2,558 |
| zh | mfds_drug_otc | 720 | 720 |
| zh | mfds_drug_otc_nutrition_combo | 54 | 54 |
| zh | o4o_drug_otc_topical | 138 | 138 |

`otherLanguageSame` **true** / `masterCountsSame` **true** — 비-KO 언어의 행 수와 **본문 digest**
(`md5(string_agg(md5(content) ORDER BY id))`) 가 적용 전후 동일하다. 본문은 한 바이트도 바뀌지 않았다.

> **스냅샷 합계 19,990 vs 대상 19,993 (3행 차이) — 결함 아님.**
> `snapshot-db-state.mjs` 의 scope 는 `product_identifiers ⋈ product_candidates` 를 **실행 시점에
> 다시 유도**하는 반면, 대상 모집단은 동결된 `population.jsonl` 이다. 차이 나는 3행
> (`13111f00…`, `13680edd…`, `1b51936a…`) 을 id 로 직접 조회한 결과 **전부 `status='hidden'`** 이다.
> 즉 적용 누락이 아니라 스냅샷 계수 범위의 차이다.

### 4-6. 멱등 재실행

```
ledgerRows      19,993
planned         0
skippedAtPlan   19,993   (skipReasons: STATUS_hidden 19,993)
statusUpdated   0
```

## 5. 최종 상태 vs 목표

| 항목 | 목표 | 실측 |
|------|:---:|:---:|
| 숨김 처리 | 19,993 | **19,993** |
| 활성 이전 EN canonical | 0 | **0** |
| 활성 이전 ZH canonical | 0 | **0** |
| KO 정상 canonical 유지 | 19,363 | **19,363** |
| 번역 본문 변경 | 0 | **0** |
| `source_ref` 변경 | 0 | **0** |
| 공개 언어 목록의 오래된 EN·ZH | 0 | **0** |
| 재번역 대기 (RETRANSLATE_REQUIRED) | 19,888 | **19,888** |
| 영구 철회 후보 (WITHDRAW_TRANSLATION) | 105 | **105** |
| KO write | 0 | **0** |
| JA write | 0 | **0** |

## 6. 산출물

| 파일 | 추적 |
|------|:---:|
| `hide-derived-translations.mjs` | ✅ |
| `post-verify-hide.mjs` | ✅ |
| `results/hide-summary-{dry-run-run1,dry-run-run2,rollback,live,live-rerun}.json` | ✅ |
| `results/post-verify-hide.json` | ✅ |
| `results/db-state-{before-hide-rollback,after-hide-rollback,after-hide-live}.json` | ✅ |
| `results/hide-plan*.jsonl` (10MB) | ❌ gitignore — 추적 중인 ledger + planDigest 로 재생성 |

## 7. 남기는 것 (이번 범위 밖)

| 항목 | 수 | 처리 |
|------|:---:|------|
| HOLD master 의 기존 활성 KO | 130 | `MANUAL_REVIEW` 유지. 임의 삭제하지 않음 |
| ↳ 그 중 전문의약품 | 42 | **별도 후속 감사 필요** — 매장용 일반의약품 설명서 노출 대상에 남아도 되는지 판단 |
| `SAFE_TO_DELETE` 기존 KO | 61 | 물리 삭제는 EN 재번역 완료 후 검토 |
| 매장으로 복사된 독립 사본 | 미측정 | `kpa_store_contents` 는 원본 status 를 재확인하지 않음 — 별도 감사 |

## 8. 다음 작업 (사용자 확정 순서)

1. ~~기존 EN·ZH 19,993 비노출~~ ← **본 WO 완료**
2. 신규 KO 19,363 기준 EN 전량 재번역
3. EN 독립검증 · canonical 승격
4. hidden EN 중 안전한 삭제·archive 판정
5. ZH 재번역
6. JA 신규 생산
7. `SAFE_TO_DELETE` 61건 물리 삭제 검토
8. 매장 복사 독립 사본 감사

## 9. 보안

API 키·DB 자격증명은 환경변수로만 전달했고 로그·산출물·커밋 어디에도 남기지 않았다.
`.env`, `pnpm-lock.yaml`, 타 세션 WIP(HFF ZH 배치) 미접촉 — 커밋은 정확한 pathspec 으로만 수행했다.
