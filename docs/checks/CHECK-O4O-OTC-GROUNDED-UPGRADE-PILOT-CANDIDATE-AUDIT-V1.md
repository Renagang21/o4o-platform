# CHECK-O4O-OTC-GROUNDED-UPGRADE-PILOT-CANDIDATE-AUDIT-V1 — e약은요→authored 승격 파일럿 후보 (에이전트 가)

WO: `WO-O4O-OTC-GROUNDED-UPGRADE-PILOT-CANDIDATE-AUDIT-GA-V1` · 일자: 2026-07-18 · 상태: **완료 (read-only 감사)**
채널: Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, SELECT only. DB write **0** · canonical/draft 변경 **0**.
트랙: **A (grounded upgrade)** — e약은요 canonical → authored canonical 교체. (Track B 미보유 authoring 과 분리.)
입력: bridge `authored그대로확장` 158그룹/1,201제품(otc-full-corpus-authored-bridge-groups-v1.json).

---

## 0. 결론

> **authored그대로확장 158그룹 커버리지 Top 10 을 DB 재검증한 결과, 9/10 이 안전지문 분리 필요(distinct 2~5 — 같은 pharmKey 에 e약은요 안전 프로파일 다수 혼재), 아스피린은 민감 약효군. 유일 READY = `에르도스테인|300밀리그램|정` (안전지문 distinct 1, e약은요 canonical 30 전건 동질, authored 충돌 0, authored draft ref `03e0af9d…`). → 첫 승격 파일럿 후보 = 에르도스테인 300mg 정. ⚠️ bridge full-content 그대로확장 26 vs 본 audit coarse-안전동질 30 델타 4 → apply 전 bridge SSOT(26)와 정합 필요. 재실행 byte-identical.**

---

## 1. Top 10 (커버리지 순) 재검증

| # | groupKey | bridge 확장 | e약은요 canonical | 안전지문 distinct | 동질 master | authored 충돌 | verdict |
|:--:|---|--:|--:|--:|--:|--:|:--:|
| 1 | 아스피린\|100밀리그램\|정 | 67 | 105 | 2 | 96 | 0 | EXCLUDED(민감약효군·분리필요) |
| 2 | 트리메부틴말레산염\|100밀리그램\|정 | 66 | 127 | 3 | 113 | 0 | EXCLUDED(분리필요) |
| 3 | 바실루스리케니포르미스균\|250밀리그램\|캡슐 | 56 | 88 | 5 | 68 | 0 | EXCLUDED(분리필요) |
| 4 | 디오스민\|300밀리그램\|캡슐 | 38 | 45 | 2 | 42 | 0 | EXCLUDED(분리필요) |
| 5 | 로라타딘\|10밀리그램\|정 | 38 | 41 | 2 | 38 | 0 | EXCLUDED(분리필요) |
| 6 | 알벤다졸\|400밀리그램\|정 | 38 | 92 | 2 | 88 | 0 | EXCLUDED(분리필요) |
| 7 | 알마게이트\|500밀리그램\|정 | 37 | 124 | 4 | 93 | 0 | EXCLUDED(분리필요) |
| 8 | 트리메부틴말레산염\|150밀리그램\|정 | 28 | 49 | 3 | 40 | 0 | EXCLUDED(분리필요) |
| 9 | 클로닉신리시네이트\|125밀리그램\|연질캡슐 | 27 | 29 | 2 | 27 | 0 | EXCLUDED(분리필요) |
| 10 | **에르도스테인\|300밀리그램\|정** | 26 | **30** | **1** | **30** | **0** | **READY** |

- **핵심**: pharmKey(성분·함량·제형)는 e약은요 안전지문을 단일 보장하지 않는다 — 9/10 그룹이 distinct≥2 → **하위 안전지문 분리 후 승격**해야 한다(WO "안전지문 재검증"). 오직 에르도스테인 300mg 정만 distinct 1(동질).
- authored 충돌(mfds_drug_otc needs_review/canonical) = **전 그룹 0** (기존 authored canonical 미보유 조건 충족).

---

## 2. 추천 첫 파일럿: `에르도스테인|300밀리그램|정`

| 항목 | 값 |
|---|---|
| sample | 동화엘텐정(에르도스테인) |
| e약은요 STORE ko canonical master | **30** (전건, e약은요 canonical 중복 0) |
| 안전지문 distinct | **1** (전건 동질 — 하위 분리 불필요) |
| authored draft source_ref_id | `03e0af9d-5236-460a-86d4-1af8b0c00c61` |
| authored 충돌 | 0 |
| 민감 약효군 | 아니오(mucolytic) |
| 경로 | oral |
| **예상 SPD write** | e약은요 canonical demote + authored canonical insert(교체) — master당 SPD 연산, 대상 **30**(정합 후 26) |
| **예상 audit-log write** | 승격 audit 1/master = **30**(정합 후 26) |
| rollback master IDs | JSON `추천_첫파일럿.rollback_master_ids` (30) |

> **⚠️ apply 전 정합(필수)**: bridge full-content 그대로확장 = **26**, 본 audit coarse-안전동질(용법수치+연령+금기) = **30**. 델타 4 는 coarse 안전은 같으나 bridge full-content 로 검토후확장 분류된 master. **bridge full-content 가 SSOT** 이므로 apply 대상은 26 으로 좁히거나(권장), 4 master 를 full-content 재검증 후 편입한다. 승격 write/rollback 은 이 정합 결과(≤30)를 사용.

---

## 3. 판정 / 완료 기준

| 판정 | 그룹수 |
|---|---:|
| READY | **1** (에르도스테인 300mg 정) |
| EXCLUDED | 9 (안전지문 분리 필요 8 + 민감약효군 1) |

| 완료 기준 | 결과 |
|---|---|
| 커버리지 Top 10 | ✅ (§1) |
| master 수·groupKey·authored source_ref | ✅ |
| e약은요 canonical 1건씩 | ✅ (중복 0) |
| authored needs_review/canonical 충돌 | ✅ 0 |
| 원문·함량·제형·경로·안전지문 재검증 | ✅ (안전지문 distinct 산출) |
| 첫 승격 파일럿 후보 1 | ✅ 에르도스테인 300mg 정 |
| SPD write / audit-log write 분리 | ✅ (§2) |
| rollback master IDs 고정 | ✅ JSON |
| 재실행 결정론 | ✅ md5 `936db56879fe8ff0577a3f1ec8df5a8d` |
| DB write | **0** |

---

## 4. 산출물 / 다음

- `apps/api-server/src/scripts/drug-otc-grounded-upgrade-pilot-candidate-audit.ts`
- `apps/api-server/src/scripts/data/otc-grounded-upgrade-pilot-candidates-v1.json`
- 본 CHECK 문서.

> **다음(별도 승인)**: 에르도스테인 300mg 정 = e약은요→authored canonical 승격 파일럿. 정책 = `OTC-EASY-DRUG-TO-AUTHORED-CANONICAL-UPGRADE-POLICY-V1`(demote→replace, unique 제약 회피). 착수 전 ① bridge SSOT 26 정합 ② authored draft(03e0af9d) 완비·검수 ③ dry-run(demote+insert+audit) → 승인 → apply. 나머지 9 Top 그룹은 안전지문 하위 분리 후 후속 파일럿. 에이전트 다 파일럿 설계는 본 후보 확정으로 재개 가능.
