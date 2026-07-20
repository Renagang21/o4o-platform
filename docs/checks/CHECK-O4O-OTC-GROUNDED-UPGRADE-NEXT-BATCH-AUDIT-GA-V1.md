# CHECK — WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-BATCH-AUDIT-GA-V1

**에이전트 가 · read-only 감사 (DB write 0) · 2026-07-20**

직전 감사([`NEXT-CANDIDATES-GA-V1`](CHECK-O4O-OTC-GROUNDED-UPGRADE-NEXT-CANDIDATES-AUDIT-GA-V1.md))의 Top 3(트리메부틴 100mg 정·바실루스·디오스민)과
파일럿(에르도스테인)을 **groupKey 단위로 제외**하고, bridge full-content fingerprint 기준으로 **다음 clean 후보 Top 5** 를 추가 선정한다.

> groupKey 단위 제외 이유: 배정 그룹은 보조 authored그대로확장 fp 도 보유 → fp 만 제외하면 같은 groupKey 재선정 위험. 병렬 비간섭 단위 = groupKey.

---

## 1. 방법 (파일럿/직전 감사 verbatim 계승)

1. bridge SSOT `authored그대로확장` fp-entry → **groupKey(성분\|용량\|제형)별 dominant(최대 count) fp 1개** 대표(직전 Top3 규약).
2. 제외 groupKey(에르도스테인 300정 · 트리메부틴 100정 · 바실루스 250캡슐 · 디오스민 300캡슐) 배제 후 count desc(동률 pharmKey asc, fp asc).
3. 각 후보: coarse e약은요 STORE ko canonical 열거 → `fingerprintOf()` fp 재고정. **target = fp === dominant fp → 하위 그룹만 추출.**
   나머지 fp = carve-out(bridge bucket 으로 안전지문불일치/검토후확장/보조 authored 분류). **coarse 전체 미적용.**
4. 게이트: 민감 약효군 제외 · 비경구 제외 · authored draft(source_ref) 존재 · authored 충돌 0 · e약은요 canonical 정확히 1/master · fp 재현(target === bridge n). → 첫 READY 5 선정.

스크립트: [`drug-otc-grounded-upgrade-next-batch-audit.ts`](../../apps/api-server/src/scripts/drug-otc-grounded-upgrade-next-batch-audit.ts)
산출: [`otc-grounded-upgrade-next-batch-v1.json`](../../apps/api-server/src/scripts/data/otc-grounded-upgrade-next-batch-v1.json) (target/exclude master IDs 전량 포함)

평가 14개 대표 → **READY 12 / EXCLUDED 2**(아스피린 = 민감 약효군, `atc:A12AX 475mg 정` = authored draft 없음/ingredient 무명).

---

## 2. 다음 승격 후보 Top 5

| # | 그룹 (성분\|용량\|제형) | fp | ATC | 승격 master | coarse | 편입제외 (bucket) | source_ref_id | easy1 | 충돌 | 예상 SPD/audit |
|:-:|---|---|---|:-:|:-:|---|---|:-:|:-:|:-:|
| ① | 로라타딘\|10mg\|정 | `83bcf192…` | R06AX13 | **38** | 41 | 3 (안전불일치3) | `0a7dee0b…` | 38 | 0 | 114 / 38 |
| ② | 알벤다졸\|400mg\|정 | `879d80e7…` | P02CA03 | **38** | 92 | 54 (안전불일치47·보조authored7) | `0178f85b…` | 38 | 0 | 114 / 38 |
| ③ | 알마게이트\|500mg\|정 | `b08e3e7b…` | A02AD03 | **37** | 124 | 87 (안전불일치87) | `01a231cd…` | 37 | 0 | 111 / 37 |
| ④ | 트리메부틴말레산염\|150mg\|정 ⚠ | `f4c610df…` | A03AA05 | **28** | 49 | 21 (안전불일치14·보조authored7) | `00f0325a…` | 28 | 0 | 84 / 28 |
| ⑤ | 클로닉신리시네이트\|125mg\|연질캡슐 | `5f1cb691…` | M01AX | **27** | 29 | 2 (안전불일치2) | `03de1849…` | 27 | 0 | 81 / 27 |

- 전 그룹 **fp 재현 정확일치(target === bridge n)** · easy canonical 정확히1 === target · authored 충돌 0 · 비경구 혼입 0.
- **⚠ ④ 트리메부틴 150mg 정**: 에이전트 다 작업(100mg 정)과 **동일 성분, 다른 groupKey**(source_ref·fp 별개). groupKey 단위로는 비간섭이나, 성분 단위 직렬화를 원하면 **백업 ⑥ 클로닉신 125mg 정(26)** 으로 교체 가능.
- `편입제외` 의 `보조authored` = 같은 groupKey 의 하위(비-dominant) authored그대로확장 fp — 이번 배치에서 제외(향후 후속 배치 대상). 나머지는 **안전지문불일치**(편입 금지).

**Top 5 합계**: 승격대상 168 master · SPD write 504 · audit write 168 · grand_total 672.

### master IDs
각 후보의 `target_master_ids`(승격/rollback 대상) 와 `exclude_master_ids`(편입 금지, `exclude_master_ids_byBucket` 로 bucket 분류) 전량은 산출 JSON `top5[]` 에 전개됨.

---

## 3. 백업 후보 (Top5 밖 READY, count desc)

클로닉신 125mg 정(26) · 브로멜라인 100mg 정(22) · 니자티딘 75mg 정(18) · 아세트아미노펜 325mg 연질캡슐(18) · 엘카르니틴 330mg 정(16) · 나프록센 250mg 연질캡슐(15) · 소브레롤 200mg 캡슐(15).

---

## 4. 재실행 결정론

정렬 고정(count desc / pharmKey asc / fp asc · master id asc)으로 **2회 연속 산출 JSON byte-identical**
(md5 `72044015cff692126bb46c8714e8269f`). fp 전 그룹 재현 정확일치 → target/exclude 집합 불변.

---

## 5. 금지 항목 준수

| 금지 | 준수 |
|---|---|
| DB write | ✅ read-only SELECT 만 (dbWrite 0) |
| coarse 그룹 전체 적용 | ✅ target fp 하위 그룹만, 나머지 carve-out |
| 안전불일치 제품 편입 | ✅ non-target(안전지문불일치 포함) 전량 제외 + master IDs 명시 |
| 기존 canonical 변경 | ✅ 계산만 |
| 배정 groupKey 개입 | ✅ 트리메부틴100정·바실루스·디오스민·에르도스테인 groupKey 단위 제외 |

**결론**: 다음 배치 후보 5개 = 로라타딘 10mg 정(38) · 알벤다졸 400mg 정(38) · 알마게이트 500mg 정(37) · 트리메부틴 150mg 정(28, ⚠동일성분) · 클로닉신 125mg 연질캡슐(27). 각 group 은 에르도스테인/트리메부틴 파일럿과 동일한 이중게이트 apply WO 로 진행.
