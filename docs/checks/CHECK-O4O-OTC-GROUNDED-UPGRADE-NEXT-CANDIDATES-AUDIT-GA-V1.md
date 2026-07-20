# CHECK — WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-CANDIDATES-AUDIT-GA-V1

**에이전트 가 · read-only 감사 (DB write 0) · 2026-07-20**

에르도스테인 300mg 정 파일럿(fp `4b4e162690065e8e`, **26건 LIVE**)을 제외하고, 기존 Top 10 authored그대로확장
fp-group 을 **bridge full-content fingerprint(`fingerprintOf()` 정본 verbatim)** 기준으로 다시 분리해 다음 승격
후보 Top 3 를 선정한다.

---

## 1. 방법 (파일럿 verbatim 계승)

1. bridge SSOT([`otc-full-corpus-authored-bridge-groups-v1.json`](../../apps/api-server/src/scripts/data/otc-full-corpus-authored-bridge-groups-v1.json)) 에서 `authored그대로확장` fp-entry 를 count desc 정렬 → Top 10.
   각 entry = **하나의 full-content fingerprint group**(bridge 재그룹핑 산물). 에르도스테인 fp 제외 → **pool 9**.
2. 각 group: coarse(성분|용량|제형) 의 e약은요 STORE ko canonical master 를 열거 → `fingerprintOf()` 로 fp 재고정.
   **target = fp === bridge TARGET_FP → authored 그대로확장 하위 그룹만 추출.** 나머지 fp = **편입 금지(carve-out)**.
3. 게이트: 민감 약효군(`SENSITIVE_RE`) 제외 · 비경구 제외 · authored draft(source_ref) 존재 · authored 충돌 0 ·
   e약은요 STORE ko canonical 정확히 1/master · **fp 재현(target === bridge n)**.
4. clean(READY) 후보를 count desc 로 Top 3 선정.

> `fingerprintOf` = bridge 정본(`drug-otc-full-corpus-authored-bridge-integration.ts`) 함수를 파일럿(`2a3e52ba3`)이 채용한 것과 동일본. 산식 변경 아님(동치 재현).

스크립트: [`drug-otc-grounded-upgrade-next-candidates-audit.ts`](../../apps/api-server/src/scripts/drug-otc-grounded-upgrade-next-candidates-audit.ts)
산출: [`otc-grounded-upgrade-next-candidates-v1.json`](../../apps/api-server/src/scripts/data/otc-grounded-upgrade-next-candidates-v1.json)

---

## 2. pool 9 판정 결과

| # | 그룹 (성분\|용량\|제형) | fp | target/bridge | coarse | 편입제외 | easy1 | 충돌 | verdict |
|:-:|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | 아스피린\|100mg\|정 | `ffde8a6e…` | 67/67 | 105 | 38 | 67 | 0 | **EXCLUDED** (민감 약효군) |
| 1 | 트리메부틴말레산염\|100mg\|정 | `7a4aab0b…` | 66/66 | 127 | 61 | 66 | 0 | **READY** |
| 2 | 바실루스리케니포르미스균\|250mg\|캡슐 | `13208b06…` | 56/56 | 88 | 32 | 56 | 0 | **READY** |
| 3 | 디오스민\|300mg\|캡슐 | `e0a551d8…` | 38/38 | 45 | 7 | 38 | 0 | **READY** |
| 4 | 로라타딘\|10mg\|정 | `83bcf192…` | 38/38 | 41 | 3 | 38 | 0 | READY |
| 5 | 알벤다졸\|400mg\|정 | `879d80e7…` | 38/38 | 92 | 54 | 38 | 0 | READY |
| 6 | 알마게이트\|500mg\|정 | `b08e3e7b…` | 37/37 | 124 | 87 | 37 | 0 | READY |
| 7 | 트리메부틴말레산염\|150mg\|정 | `f4c610df…` | 28/28 | 49 | 21 | 28 | 0 | READY |
| 8 | 클로닉신리시네이트\|125mg\|연질캡슐 | `5f1cb691…` | 27/27 | 29 | 2 | 27 | 0 | READY |

- **모든 그룹 fp 재현 정확(target N === bridge N)** · easy canonical 정확히1 === target · authored 충돌 0.
- 유일 EXCLUDED = 아스피린(항혈전, 민감 약효군). 비경구 혼입 0.
- coarse 전체가 아니라 **target fp 하위 그룹만** 대상 — 나머지(편입제외)는 다른 authored fp·검토후확장·안전지문불일치로 **carve-out**(coarse 전체 적용 금지 준수).

---

## 3. 다음 승격 후보 Top 3

### ① 트리메부틴말레산염 100mg 정 — `7a4aab0b31b1ed19`
- ATC A03AA05 (위장관 운동조절) · **승격대상 master 66** (coarse 127, 편입제외 61)
- source_ref_id `003beef8-82c4-4897-a176-d0ea8a695699` · easy canonical 정확히1 = 66 · authored 충돌 0
- 예상 write: STEP A needs_review INSERT 66 · demote 66 · flip 66 · audit 66 → **SPD 198 + audit 66 = grand 264**
- rollback = 승격대상 66 master IDs (JSON `top3[0].rollback_master_ids`)

### ② 바실루스리케니포르미스균 250mg 캡슐 — `13208b062a9c8c79`
- ATC A07FA01 (정장생균제) · **승격대상 master 56** (coarse 88, 편입제외 32)
- source_ref_id `022f4af0-1219-428b-bd69-fa39a5e7fe7f` · easy canonical 정확히1 = 56 · authored 충돌 0
- 예상 write: needs_review 56 · demote 56 · flip 56 · audit 56 → **SPD 168 + audit 56 = grand 224**
- rollback = 승격대상 56 master IDs (JSON `top3[1].rollback_master_ids`)

### ③ 디오스민 300mg 캡슐 — `e0a551d8020daa5c`
- ATC C05CA03 (정맥순환 개선) · **승격대상 master 38** (coarse 45, 편입제외 7)
- source_ref_id `05be62a5-89dc-4f20-95f9-cb6187f5ab35` · easy canonical 정확히1 = 38 · authored 충돌 0
- 예상 write: needs_review 38 · demote 38 · flip 38 · audit 38 → **SPD 114 + audit 38 = grand 152**
- rollback = 승격대상 38 master IDs (JSON `top3[2].rollback_master_ids`)

**Top 3 합계**: 승격대상 160 master · SPD write 480 · audit write 160 · grand_total 640.

> audit 수는 파일럿과 동일하게 `SharedProductDescriptionAuditLog.canonical_replaced` = **1행/교체**(previous+new 동시 기록) 엔티티 모델 기준. 정책 §2-A(2행/master) 와의 불일치는 파일럿 CHECK 에서 이미 플래그됨 — 실제 apply WO 에서 정합.

---

## 4. 재실행 결정론

동일 입력·정렬 고정(count desc / pharmKey asc / fp asc · master id asc)으로 **2회 연속 실행 산출 JSON byte-identical**
(md5 `e1f7da319651e6ec0be5a8f7985cd959`). fp 재현이 전 그룹 정확일치이므로 target 집합도 불변.

---

## 5. 금지 항목 준수

| 금지 | 준수 |
|---|---|
| DB write | ✅ read-only SELECT 만 (dbWrite 0) |
| coarse 그룹 전체 적용 | ✅ target fp 하위 그룹만, 나머지 carve-out |
| 안전불일치 제품 편입 | ✅ non-target fp(안전지문불일치 포함) 전량 제외 |
| 기존 canonical 변경 | ✅ 계산만, 변경 없음 |

**결론**: 다음 승격 후보 3개 = 트리메부틴말레산염 100mg 정(66) · 바실루스리케니포르미스균 250mg 캡슐(56) · 디오스민 300mg 캡슐(38). 각 group 은 에르도스테인 파일럿과 동일한 이중게이트 apply WO 로 진행.
