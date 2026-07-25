# CHECK-O4O-OTC-REMAINING-READY-SHARD-NA-V2 — 나 V2 shard dry-run GREEN · apply 대기

WO: `WO-O4O-OTC-REMAINING-READY-SHARD-NA-V2` · 일자: 2026-07-25 · 담당: **드럭 OTC 에이전트 나**
기준 commit: V2 census/SSOT **`81b39da72`** · 공용 러너 **`3447b2323`** (HEAD == `3447b2323`, origin/main 동기)
러너: `otc-v2-store-leaflet-runner.shared.ts` (**공용 — 미수정**) · 독립검증기: `otc-remaining-v2-verify.na.mjs` (자기 소유)
성격: **dry-run + 샘플 + 독립검증.** **DB write 0** · apply 0.

---

## 0. 결론

> **나 V2 shard dry-run GREEN — apply 대기(가 독립검증 완료 후).**
>
> | 축 | 결과 |
> |---|---|
> | dry-run 게이트 | **10/10 PASS** · 이상 0 · admitted 240/240 |
> | 독립검증(러너 분리) | **13/13 GREEN** |
> | 샘플(route별 2, 9건) | **전건 클린** — fp재현·라벨·경구동사·수치 |
> | writePlan | KO 3,356 (4T) + EN 1,678 (2T) = **5,034** |
> | **DB write** | **0** |
>
> 착수 전 제기했던 BLOCKER 2건 **모두 해소**: ① 러너 비호환 → 다 세션이 **공용 V2 러너 신규 작성**(`3447b2323`)으로 해결(V1 러너는 미수정 보존), ② `.env` 미배치 → 사용자 배치 완료.

---

## 1. 나 V2 shard 검증 (오프라인 실측 — 10/10 PASS)

| # | 게이트 | 실측 | 기대 | 판정 |
|---:|---|---:|---:|:---:|
| 1 | SSOT `shards.na` fp | 240 | 240 | ✅ |
| 2 | census V2 `readyGroups` 매칭 fp | 240 | 240 | ✅ |
| 3 | master 총수 | 839 | 839 | ✅ |
| 4 | master distinct | **839** | 839 | ✅ |
| 5 | `size` 합계 | 839 | 839 | ✅ |
| 6 | ga·da **fp** 교집합 | **0** | 0 | ✅ |
| 7 | ga·da **master** 교집합 | **0** | 0 | ✅ |
| 8 | **CLQ/CDS/CSI** (적용부위 미확정 651) | **0** | 0 | ✅ |
| 9 | gencode / route / form 공란 | 0 / 0 / 0 | 0 | ✅ |
| 10 | gencode 종수 : fp | **240 : 240** | 1:1 | ✅ |

- WO 명시 수치(240 fp / 839 master)와 **SSOT · census V2 · WO 3중 일치**.
- **CLQ/CDS/CSI 는 READY 풀 전체에서도 0** — 라가 V2 재분류 시 READY 밖으로 분리했으므로 접근 위험 구조적 0.
- census V2 게이트가 상위 보장: `bigconInReady 0` · `exportNameInReady 0` · `readyNoNameDerivedAxis true` · `fpCompositionHomogeneous true` · `readyCompleteIntersection 0`.
  → **빅콘에스600정 접근 0** · **V1 에서 제기한 수출명 혼입(88fp/223m) 해소 확인** · **기존 완료분 교집합 0**.
- HOLD_SOURCE / HOLD_IDENTITY / HOLD_ROUTE / SPLIT_REQUIRED / EXCLUDE 는 READY 와 상호배타 클래스(classSum == universe 57,572) → 접근 위험 0.

### 우선순위 배치 (oral → topical → ophthalmic → 기타)

| 순위 | route | fp | master | 누계 | 최대 그룹 |
|:---:|---|---:|---:|---:|---:|
| 1 | **oral** | 200 | **626** | 626 | 21 |
| 2 | **topical** | 27 | **136** | 762 | 18 |
| 3 | **ophthalmic** | 10 | **52** | 814 | 15 |
| 4 | oromucosal | 1 | 10 | 824 | 10 |
| 5 | vaginal | 2 | 15 | 839 | 12 |

배치 분할안: oral 25 fp × 8배치 → topical 27 fp 1~2배치 → ophthalmic 10 fp 1배치 → 잔여 3 fp 1배치. **총 11~12배치.**

## 2. V1 → V2 변경점 (생산 관점)

| 축 | V1 | **V2** |
|---|---|---|
| identity | 제품명 파생 `ingredient` (수출 브랜드명 혼입) | **표준코드 일반명코드 `gencode`** — 제품명 미개입 |
| READY | 786 fp / 1,928 master | **716 fp / 2,517 master** |
| 나 shard | 263 fp / 642 master | **240 fp / 839 master** |
| 상태 | `SUPERSEDED_FOR_PRODUCTION` — **생산 금지** | 유효 |

> V1 shard SSOT·READY 는 본 세션에서 **생산 목적 사용 0**. 직전 [NA-V1 CHECK](CHECK-O4O-OTC-REMAINING-READY-SHARD-NA-V1.md) 는 생산 미착수로 종료됐으므로 V1 잔재 write 0.

---

> ## ⓘ §3~§7 은 **착수 전(2026-07-25 오전) 기록**이며 **전부 해소됐다.**
> 최신 상태는 **§8~§14 실행 기록**이다. 아래는 이력 보존 목적으로 남긴다.
>
> | 착수 전 항목 | 현재 |
> |---|---|
> | §3 러너 비호환 (해소안 A/B/C 제안) | **해소** — 다 세션이 공용 V2 러너 신규 작성(`3447b2323`). 제안 A~C 는 채택되지 않았고, V1 러너는 **미수정 보존**이라는 취지만 반영됨 |
> | §4 `.env` 미배치 | **해소** — 사용자 배치 완료 |
> | §5 claim 미선점 | dry-run 완료. **SSOT 가 fp 단위 소유를 확정**하므로 별도 claim 파일 없이 진행(교집합 0 실측 확인) |
> | §6 “dry-run 미실행 / BLOCKER 2건” | **§13 보고 요약으로 대체** |

---

## 3. 🚫 정본 러너 ↔ V2 구조적 비호환 (착수 전 — **해소됨**)

`apps/api-server/src/scripts/otc-oral-combo-store-leaflet-runner.ga.ts` 는 KO(easy→authored 교체)+EN 을 담당하는 **정본 러너**이나, V2 대상에 대해 **모든 그룹에서 `ABORT`** 한다. 이상 1건이라도 있으면 하드 중단(`:118`, `:214`).

| # | 게이트 | 러너 구현 | V2 정의 | 결과 |
|---:|---|---|---|---|
| 1 | **fingerprint 재현** (`:59`, `:80-81`) | `H(효능\|용법\|주의 \| ingredientOf(**제품명**)\|strengthOf(**규격**) \| formOf(**제품명**) \| routeSig(**제품명**))` | V2 는 **일반명코드(gencode) 축**, `readyNoNameDerivedAxis: true` (**제품명 미개입** 원칙) | **fp 재현 실패 → ABORT** (전 그룹) |
| 2 | **route oral 강제** (`:82`) | `route !== 'oral'` 이면 이상 | 나 shard 는 topical 27fp/136m · ophthalmic 10/52 · oromucosal 1/10 · vaginal 2/15 | **비oral 40 fp / 213 master (25.4%) ABORT** |

**영향 범위**: fp 규칙 불일치는 **가·나·다 3 shard 전량** 해당. 비oral 비중은 가 205/839(24.4%) · 나 213/839(25.4%) · 다 142/839(16.9%). **apply 1순위인 가가 첫 dry-run 에서 즉시 부딪힌다.**

### 해소안 (택1 — 사용자/코디네이터 판정 필요)

| # | 방안 | 내용 | 비고 |
|---:|---|---|---|
| **A** | **SSOT 대조로 게이트 대체** (권장) | fp 재계산 대신 **`target_master_ids` == census V2 `readyGroups[fp].masterIds` 정확 일치**를 게이트로. route 는 SSOT `route` 값과 일치 검증(allowlist: oral·topical·ophthalmic·oromucosal·vaginal) | V2 census 가 이미 축을 확정했으므로 **폐기된 V1 규칙을 재계산할 이유가 없음**. 감사 강도 동일(대상 집합 고정) |
| B | V2 fp 규칙을 러너에 이식 | gencode 축 fp 함수를 러너에 재구현 | census 로직 중복 → 두 구현 drift 위험 |
| C | oral 200fp/626m 만 선행 | 비oral 213 master 는 별도 WO | fp 게이트(#1)는 여전히 미해소 → **단독으로는 불가** |

> **공용 러너(`.ga.ts`)는 수정하지 않는다.** 확정 시 자기 전용 사본(`otc-remaining-shard-runner.na-v2.ts`)으로 계약 verbatim 유지 + 게이트 2건만 교체하는 방식이 선행 관례(다의 `-da` verbatim 복제)와 일치한다.

## 4. DB 채널 상태

| 항목 | 상태 |
|---|---|
| `apps/api-server/.env` | **미배치** (사용자 배치 대기). gitignored 확인(`apps/api-server/.gitignore:2`) |
| Cloud SQL Auth Proxy `127.0.0.1:5442` | LISTENING (본 세션 무접촉) |
| 루트 `.env` | **미사용** (WO 금지 준수) |
| 자격증명 값 | **열람·출력·기록 0** |

→ 원문 축 확인 · 저작 · dry-run 전부 **대기**. §3 해소 없이는 `.env` 배치 후에도 dry-run 이 전 그룹 ABORT.

## 5. claim 미선점 사유

V2 SSOT 가 fp 단위로 나 소유를 확정(교집합 0 게이트)하여 충돌 위험 0. 착수 불가 상태의 `CLAIMED` 는 타 세션에 거짓 진행 신호가 되므로(직전 [RESUME-NA-QUEUE-AUDIT §2](CHECK-O4O-OTC-PRODUCTION-RESUME-NA-QUEUE-AUDIT-V1.md) 정정 사례) **§3·§4 해소 후 선점**한다.

## 6. 보고 요약

| 항목 | 값 |
|---|---|
| shard 식별자 | `otc-remaining-shard-assignment-ssot-v2.json` → `shards.na` (base `81b39da72`) |
| 대상 fingerprint / master | **240 fp / 839 master** (3중 일치) |
| PASS / REVIEW / HOLD | 오프라인 게이트 **10/10 PASS** · **BLOCKER 2건**(러너 비호환 · `.env` 미배치) · HOLD 0 |
| dry-run | **미실행** (§3·§4) |
| apply | **미수행** — 순서상 가 독립검증 완료 후 |
| canonicalDup | 해당 없음 (write 0) |
| 기존 완료분 교집합 | **0** (census V2 `readyCompleteIntersection: 0`) |
| **DB write** | **0** |
| 잔여 확정 물량 | **839 master 전량 미생산** |

## 7. 준수 / 금지

| 항목 | 결과 |
|---|---|
| V1 READY / V1 shard SSOT | **생산 목적 사용 0** (V2 대조 목적 읽기만) |
| 자기 V2 shard 외 대상 | **미접촉** (ga·da 교집합 확인만) |
| CLQ/CDS/CSI 651 master | **접근 0** (READY 밖, 실측 0) |
| HOLD_* / SPLIT / EXCLUDE | **접근 0** (READY 와 상호배타) |
| 빅콘에스600정 | **접근 0** (`bigconInReady: 0`) |
| 라 census·SSOT 파일 | **미수정** (읽기만) |
| 공용 러너 `.ga.ts` | **미수정** (정독만) |
| 루트 `.env` / 자격증명 값 출력 | 미사용 / 0 |
| `_msm.mjs` · `_msmx.mjs` | 미접촉 |
| `git add .` / reset / clean / stash | 미사용 — path-specific add |
| 자기 산출물 | 본 CHECK 1건 |

---

# ▣ 실행 기록 (공용 V2 러너, base `3447b2323`)

## 8. dry-run — 게이트 10/10 PASS

```
../../node_modules/.bin/tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts --selftest
../../node_modules/.bin/tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts --shard=na --dry-run
```

- selftest **PASS** — fp 재현(제품명 미개입) · route resolver · 경로별 KO/EN · 수치 보존 · 차단 게이트 · 앵커 분리.

| 게이트 | 실측 | 기대 | 판정 |
|---|---:|---:|:---:|
| processed fp / master | 240 / 839 | 240 / 839 | ✅ |
| `fpReproduced` | **839** | 839 | ✅ |
| `fpFailed` (재현율 1.0) | 0 | 0 | ✅ |
| `admittedGroups` | **240** | 240 | ✅ |
| `groupsWithAnomalies` | 0 | 0 | ✅ |
| `canonicalDup` | **0** | 0 | ✅ |
| `completeIntersection` (기존 완료분) | **0** | 0 | ✅ |
| `blockedFpInInput` / `blockedMasterInInput` | 0 / 0 | 0 | ✅ |
| `siteAmbiguousInInput` (CLQ·CDS·CSI) | **0** | 0 | ✅ |
| `outOfShardMasters` | 0 | 0 | ✅ |
| `anomalies` 배열 | **0건** | 0 | ✅ |

**writePlan**: `ko_4T` 3,356 (= 839 × 4: insert+demote+flip+audit) · `en_2T` 1,678 (= 839 × 2: insert+flip) · **합계 5,034** · `dbWrite 0`.

**routeTally == ssotDeclared 완전 일치**:

| route | fp | master |
|---|---:|---:|
| oral | 200 | 626 |
| topical | 27 | 136 |
| ophthalmic | 10 | 52 |
| vaginal | 2 | 15 |
| oromucosal | 1 | 10 |
| **합계** | **240** | **839** |

## 9. HOLD_SOURCE 분리 — **0건**

WO 지시(“필수 축 없는 그룹은 추정 보완하지 말고 HOLD_SOURCE 분리”)에 대해 **분리 대상 0**. 2중 확인:

- 러너: `admittedGroups 240 / 240` — 축 부족으로 탈락한 그룹 없음.
- 독립검증기(§10 [5]): 효능 축 839/839 · 용법 축 839/839 · 주의 축 839/839.

→ **추정 보완 0** (보완이 필요한 그룹 자체가 없음).

## 10. 독립검증 (러너와 분리된 SELECT — 13/13 GREEN)

```
node src/scripts/otc-remaining-v2-verify.na.mjs
```

러너 코드를 공유하지 않는 별도 SQL·별도 프로세스 검증기.

| # | 게이트 | 실측 / 기대 |
|---:|---|---|
| 1 | product_masters 존재 | 839 / 839 |
| 2 | `drug_category='otc'` | 839 / 839 |
| 3 | easy ko canonical 정확히 1 | 839 / 839 |
| 4 | authored ko canonical | 0 / 0 |
| 5 | en canonical | 0 / 0 |
| 6 | needs_review | 0 / 0 |
| 7 | canonicalDup | 0 / 0 |
| 8 | **gencode SSOT == DB 일치** | **839 / 839** |
| 9 | fp 내 gencode 이질 그룹 | 0 / 0 |
| 10~13 | easy canonical 총수 · 효능 · 용법 · 주의 축 | 839 / 839 (각) |

> gencode 연결은 러너 계약 VERBATIM — `product_identifiers.MFDS_CODE` → `product_candidates.raw_payload->>'mfdsCode'` → `raw_payload->'source'->>'일반명코드(성분명코드)'`. (MFDS_CODE 직접 조인 0건 함정 회피.)

## 11. 샘플 검증 (`--emit-sample --per-route=2`, 9건 — 전건 클린)

| route | fp | gencode | master | fp재현 | usageLabel | 경구동사 혼입 | 수치 누락 | 이상 |
|---|---|---|---:|:---:|---|:---:|:---:|:---:|
| oral | `bc1aa74c…` | 293300AGN | 21 | ✅ | 복용 안내 | false | 0 | 0 |
| oral | `98df9466…` | 101403ASS | 13 | ✅ | 복용 안내 | false | 0 | 0 |
| topical | `49370119…` | 345300CCM | 18 | ✅ | 사용 안내 | false | 0 | 0 |
| topical | `062d2209…` | 197632COM | 13 | ✅ | 사용 안내 | false | 0 | 0 |
| ophthalmic | `92c1d93e…` | 561003COS | 15 | ✅ | 사용 안내 | false | 0 | 0 |
| ophthalmic | `2e408cd1…` | D49002COS | 11 | ✅ | 사용 안내 | false | 0 | 0 |
| vaginal | `6c61420d…` | 338800CTB | 12 | ✅ | 사용 안내 | false | 0 | 0 |
| vaginal | `7decfdc8…` | 137403CTB | 3 | ✅ | 사용 안내 | false | 0 | 0 |
| oromucosal | `f5bb540f…` | A88102AMS | 10 | ✅ | 사용 안내 | false | 0 | 0 |

**내용 충실성 정독(vaginal `338800CTB` 예시)** — 비경구 최고 위험군을 직접 대조:

| 축 | 공식 원문 | 저작 KO | 판정 |
|---|---|---|:---:|
| 효능 | 이 약은 **세균성질증**에 사용합니다. | 동일 | ✅ 질환명 보존 |
| 용법 | 성인은 **1회 1정, 1일 1회 질내 깊숙이 삽입**합니다. | 동일 | ✅ 수치·투여부위 보존 |
| 주의 | 과민증 금기 · 질 전용(내복 금지) · 라텍스/고무 제품 약화 | 3항 전량 | ✅ 강도 보존 |
| 라벨 | — | **사용 안내**(비경구) | ✅ DR-019 계약 |

- `routeCheck.officialNumerics` = `["1일","1정","1회"]` · `missingInComposed` = `[]` → **수치 누락 0**.
- summaryTable “선택 포인트”가 **일반명코드 기준 안내**(“제품명이 아니라 성분과 함량으로 확인하세요”)로 V2 identity 원칙과 정합. 신규 의료 사실 **0**.
- 매장 약사 문의 안내 유지.

## 12. 산출물

| 파일 | 성격 |
|---|---|
| `src/scripts/data/otc-v2-dryrun-manifest.na.json` | dry-run 매니페스트(240 그룹 · 게이트 · writePlan) |
| `src/scripts/data/otc-v2-samples.na.json` | 샘플 9건(route별 2) |
| `src/scripts/otc-remaining-v2-verify.na.mjs` | 나 전용 독립검증기(read-only) |
| 본 CHECK | 기록 |

**공용 러너 `otc-v2-store-leaflet-runner.shared.ts` 미수정** (읽기·실행만). 수정 필요 사항 **없음** — 나 shard 전 route(oral·topical·ophthalmic·vaginal·oromucosal)에서 이상 0.

## 13. 다음 단계 — apply 대기

WO 순서: **가 dry-run PASS → 가 LIVE apply → 가 독립검증 완료 보고 → 나 apply → 다**.

- 나는 **dry-run 까지 완료**. apply 는 **가 독립검증 완료 보고 수신 후** 착수한다.
- apply 시 예상 write: **KO 3,356 + EN 1,678 = 5,034** (dry-run writePlan 과 일치해야 하며, 불일치 시 중지).
- 현 러너는 **dry-run 전용**(apply 경로 없음) → apply 단계에서 다 세션의 apply 지원 러너 반영 필요.

## 14. 준수 / 금지

| 항목 | 결과 |
|---|---|
| 공용 러너 수정 | **0** (읽기·실행만, 수정 요청 사항 없음) |
| `.env` 생성·수정·삭제 / 값 출력 | **0 / 0** (키 이름만 확인) |
| 루트 `.env` | 미사용 |
| V1 READY / V1 shard | 생산 사용 0 |
| 자기 V2 shard 외 대상 | 미접촉 (`outOfShardMasters 0`) |
| CLQ/CDS/CSI 651 · 빅콘에스600정 | **접근 0** (`siteAmbiguousInInput 0` · `blockedMasterInInput 0`) |
| HOLD_* / SPLIT / EXCLUDE | 접근 0 |
| 기존 완료분 | 교집합 **0** |
| 라 census·SSOT | 미수정 |
| `git add .` / reset / clean / stash | 미사용 — path-specific add |
| **DB write** | **0** |
