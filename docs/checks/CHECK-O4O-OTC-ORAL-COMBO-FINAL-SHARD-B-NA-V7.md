# CHECK — WO-O4O-OTC-ORAL-COMBO-FINAL-SHARD-B-NA-V7

경구 복합성분(oral multi-ingredient) 일반의약품 매장용 소비자 설명서 — **shard B** KO(교체)+EN(신규) LIVE 적재 및 독립검증.

- 담당: 에이전트 나 (prep + 독립검증) · LIVE apply: main (orchestrator)
- 트랙: `ORAL_MULTI_INGREDIENT_STORE_LEAFLET` (safety-subgroup / 첩부제 / HFF 트랙과 분리)
- 정본 러너: `apps/api-server/src/scripts/otc-oral-combo-store-leaflet-runner.ga.ts`
- KO composer: `apps/api-server/src/scripts/otc-combo-ko-compose.ga.sohae.mjs` (공식 easy_drug 원문 faithful restructure)
- 설정: `apps/api-server/src/scripts/data/otc-oral-combo-leaflet-config-shardB.na-v9.json` (KO content_json + EN)
- 판정: **GREEN**
- 일자: 2026-07-25

---

## 1. 범위 (Shard 분할 SSOT 채택)

GA-V9 결정론 3분할 SSOT(`otc-combo-shard-assignment-ga-v9.json`, 가 생성, LPT master-균형)의 **shard B** 채택. 재계산 대신 committed SSOT 채택(드리프트 0).

| shard | fp | master | 담당 |
|---|---:|---:|---|
| A | 70 | 210 | 가 |
| **B** | **70** | **210** | **나** |
| C | 69 | 207 | 다 |
| 합계 | 209 | 627 | — |

교집합 0: A/B/C 상호(AB=0·BC=0·AC=0) · B∩가 targetFp(287)=0 · B∩가/나 sourceRef=0 · B∩다(TOPICAL_SKIN, route≠oral)=0 · B∩나 기존(NUTRITION_COMBO_EN_ONLY)=0.

앵커: `source_ref_id = uuid(md5("otc-combo-leaflet:" + targetFp))` 결정론.

---

## 2. 저작 방식

- **KO**: 공식 easy_drug STORE canonical 원문 → 정본 composer로 소비자 친화 재구성(신규 의료사실 0 · 효능/금기/주의 약화 0 · 조성 창작 0). 70그룹.
- **EN**: KO canonical 유일 근거 agent 신규저작(KO에 없는 사실 0). 70그룹.
- KO–EN 정보층 대조 **0 issue** (경고 마커 · 비타민 A 5,000 IU 경고 · 철분 6세 치사 경고 · 연령 게이트 · OTC framing 보존).

---

## 3. dry-run (apply 전)

- KO dry-run **70/70 PASS · 이상 0**
- writePlan 합계: STEP_A insert 210 / easy demote 210 / authored flip 210 / audit 210
- authoredConflict **0** · existingAuthoredCanonical **0** · easyCanonicalExactly1 = EXP **전부** · fp 재현 **210/210**
- EN build **70/70** (missing 0 · 한글 0 · `<table>` 0 · `sd-warn` 有)

---

## 4. LIVE writeActual (main 실행)

| lang | write | 내역 |
|---|---:|---|
| KO | **840** | insert 210 + demote 210 + flip 210 + audit 210 |
| EN | **420** | insert 210 + flip 210 |

---

## 5. 독립검증 (read-only, `otc-shardb-independent-verify.na.mts`) — **GREEN**

| 항목 | 값 | 기대 |
|---|---:|---:|
| KO authored canonical | 210 | 210 |
| easy deprecated | 210 | 210 |
| easy still canonical | 0 | 0 |
| KO canonicalDup | 0 | 0 |
| KO groups 다중 content-hash | 0 | 0 |
| audit (canonical_replaced, ko) | 210 | 210 |
| EN canonical | 210 | 210 |
| EN needs_review | 0 | 0 |
| EN canonicalDup | 0 | 0 |
| targetOutsideWrite | 0 | 0 |
| 비대상 LIVE drift | 0 | 0 |

**재실행 no-op**: KO·EN 전부 `dbWrite 0` / `ALREADY_COMPLETE` (first/mid/last fp 샘플 확인).

---

## 6. 계약 대조 (Fixed Contract)

| 계약 | 결과 |
|---|---|
| KO 교체 / EN 신규 | ✅ |
| 신규 의료사실 0 | ✅ |
| 수치·연령·금기·상호작용 보존 | ✅ (parity 0 issue) |
| writePlan == writeActual | ✅ (KO 840 / EN 420) |
| canonicalDup 0 | ✅ (ko 0 / en 0) |
| target밖 write 0 | ✅ (0) |
| LIVE drift 0 | ✅ |
| audit == master | ✅ (210) |
| no-op 재실행 | ✅ (ALL ALREADY_COMPLETE) |
| 25fp 중간 종료 금지 (shard B 전체) | ✅ (70/70) |

---

## 7. Write-owner 인계

**나 → 다** — shard C(69fp/207master) 시작 가능. shard B LIVE write·commit·push 완료.
SSOT `otc-combo-shard-assignment-ga-v9.json` 에 `shardBStatus` append (shardAStatus/shards/summary 미수정).

## 8. 산출물

- `apps/api-server/src/scripts/data/otc-oral-combo-leaflet-config-shardB.na-v9.json` (KO+EN)
- `apps/api-server/src/scripts/data/otc-production-claim.shard-b.na-v9.json` (claim, DONE)
- `apps/api-server/src/scripts/data/otc-oral-combo-shardB-census-manifest.na-v9.json` (census, DONE)
- `apps/api-server/src/scripts/otc-shardb-en-validate.na.mts` (EN build 검증, read-only)
- `apps/api-server/src/scripts/otc-shardb-independent-verify.na.mts` (post-apply 독립검증, read-only)
