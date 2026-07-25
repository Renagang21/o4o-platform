# CHECK-O4O-OTC-REMAINING-READY-SHARD-NA-V2 — 나 V2 shard 착수 전 검증 · 러너 관문 불일치 보고

WO: `WO-O4O-OTC-REMAINING-READY-SHARD-NA-V2` · 일자: 2026-07-25 · 담당: **드럭 OTC 에이전트 나**
기준 commit: **`81b39da72`** (HEAD == 기준 commit, origin/main 동기) · SSOT: `otc-remaining-shard-assignment-ssot-v2.json` (라)
성격: **read-only 착수 전 검증.** **DB write 0** · apply 0 · 저작 0 · claim 미선점.

---

## 0. 결론

> **shard 검증 전량 PASS. 단, 생산 착수 전 해소 필요 2건.**
>
> 1. **나 V2 shard 오프라인 게이트 10/10 PASS** — 240 fp / 839 master, distinct 839, ga·da 교집합 0, 금지 대상 접촉 0 (§1).
> 2. **🚫 정본 러너가 V2 와 구조적으로 비호환** — `otc-oral-combo-store-leaflet-runner.ga.ts` 의 **fingerprint 재현 게이트**와 **route oral 강제 게이트**가 V2 전 그룹에서 `ABORT` 를 발생시킨다. **가·나·다 3 shard 공통 문제이며 apply 1순위인 가가 먼저 부딪힌다** (§3).
> 3. **DB 채널 미배치** — `apps/api-server/.env` 아직 없음. dry-run·저작 착수 불가 (§4).

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

## 3. 🚫 정본 러너 ↔ V2 구조적 비호환 (착수 전 해소 필요)

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
