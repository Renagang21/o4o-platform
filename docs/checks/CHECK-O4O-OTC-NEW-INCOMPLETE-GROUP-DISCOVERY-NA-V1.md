# CHECK-O4O-OTC-NEW-INCOMPLETE-GROUP-DISCOVERY-NA-V1

WO: **드럭 OTC 신규 미완료 그룹 발굴 및 생산 배정 감사** (에이전트 나)
성격: **read-only · DB write 0 · apply 0 · 생산/배정 실행 없음 · HFF 무관.**
기준선(SSOT): origin/main (`92fc065f4` 통합검증 반영), bridge `otc-full-corpus-authored-bridge-groups-v1.json` authored그대로확장 fp-entry.
DB 채널: 공유 proxy(5433) 장애로 본 세션 전용 Cloud SQL Auth Proxy(127.0.0.1:**5434**, read-only) 기동하여 검증. 공유 5433 미접촉.
최종 판정: **NO_NEW_BATCH** (배정 가능한 clean 신규 그룹 0).

---

## 0. 핵심 결과

authored그대로확장 pharmKey **122** → oral·단일성분·비민감 필터 후 **55** 모집단.
**E_target(=easy-canonical 미생산 target 잔량)** 기준(라벨 무관, DB SSOT)으로 전 그룹 분류:

| 분류 | 수 | 의미 |
|---|---:|---|
| EXCLUDE_LIVE | **48** | ko+en authored canonical 완료 · easy demote · 미생산 target 잔량 0 (완전 소진) |
| EXCLUDE_ASSIGNED | 0 | — |
| REVIEW_LATER_GATE | 6 | 미생산 잔량은 있으나 게이트 실패(아래 §2) |
| REVIEW_LATER_NO_TARGET | 1 | target·draft 없음 |
| **NEW_READY** | **0** | 즉시 배정 가능한 clean 신규 |

배정 manifest: **없음**(NEW_READY 0). 예상 총 write 0.

> **8B 중복감사 재발 방지 핵심**: 완료 판정을 git 커밋 라벨이 아니라 **DB 상태(authored ko+en canonical + easy demote + 미생산 잔량 0)** 로 확정. 라벨이 `TRACK-A-3H/1H-PRODUCTION`·`BUNDLE`·`grounded-upgrade` 등으로 흩어져 있어도 DB 로 전수 포착 → 48 LIVE 확정.

---

## 1. Pre-filter 방법 (단계 2)

각 그룹 groupKey(성분|함량|제형)에 대해 DB+repo 교차:
1. **DB(최우선)**: authored draft(source_ref) 의 authored ko canonical distinct master `A_ko`, en canonical `A_en`.
2. **E_target**: coarse(성분|함량|제형) easy STORE ko canonical 을 fingerprint 재고정하여 target fp 일치·easy-canonical(미생산) 잔량 산출.
   - `E_target==0 & A_ko>0` → **EXCLUDE_LIVE**(완전 소진). `E_target>0` → 미생산 잔량 존재 → 게이트 검사.
3. repo 신호: GROUP_REGISTRY/bundle-config key(49) · `otc-grounded-upgrade-*.run.json` manifest(50) → 배정/준비 corroboration.

이 방식은 "형제 선행생산(A_ko>0) + easy target 잔량(E_target>0)" 상태(8B 사전-생산 패턴)를 **놓치지 않고** 잔량으로 포착하며, 동시에 잔량 0 완료군은 라벨 무관 제외한다.

---

## 2. REVIEW_LATER 상세 (배정 금지 · 후속 별도 처리)

| groupKey | 미생산 잔량 E_target | 사유 | 후속 |
|---|---:|---|---|
| 펙소페나딘염산염\|120밀리그램\|정 | 14 | fp재현 불일치(bridge_n 5 ≠ easy target 14, 형제 A_ko=34 LIVE) | **전용 재-harvest 감사 필요**(count/fp 재확정 후 배정 가능성). 최대 미완료 풀. |
| 비오틴\|5밀리그램\|정 | 8 | registry/config 배정됨 + fp재현 8≠6 | 타 세션 배정 추정 → 제외 |
| 토코페롤아세테이트\|100밀리그램\|연질캡슐 | 5 | authored draft 없음 | 선행 draft authoring 필요(생산 불가) |
| 수출용\|50밀리그램\|연질캡슐 | 1 | draft 없음 · "수출용"(export-only, 성분 파싱 비정상) | 제외(소비자 소매 대상 아님) |
| 수출용\|500밀리그램\|연질캡슐 | 1 | 동상 | 제외 |
| 수출용\|50밀리그램\|정 | 1 | 동상 | 제외 |
| 아스코르브산97%과립\|1000밀리그램\|과립/산 | 0 | target·draft 없음 | 제외 |

즉, 미생산 잔량이 있는 실질 후보는 **펙소페나딘 120mg 정(14)** 하나뿐이며, 이는 bridge SSOT count 와 현재 easy target 수가 불일치하여 **기계적 배정 불가**(batch WO 의 fp 재현 STOP 조건 해당). 별도 전용 감사로 이관.

---

## 3. 판정

- 즉시 배정 가능한 clean 신규 그룹 0 → **NO_NEW_BATCH.**
- 물량 미달로 억지 배정 안 함(WO 지침 준수). 교집합 검증 N/A(배정 0).
- 후속 권고: 펙소페나딘 120mg 정 전용 fp 재-harvest 감사(별도 WO). 토코페롤아세테이트 100mg 연질캡슐은 draft authoring 선행 시 후보.

## 4. 산출물

- 본 CHECK + 감사 스크립트 `apps/api-server/src/scripts/otc-new-incomplete-discovery-audit.ts` + detail JSON `apps/api-server/src/scripts/data/otc-new-incomplete-discovery-v1.json`.
- read-only. 공유 proxy(5433) 미접촉 · 5434 전용 proxy 사용. 가·다/HFF/pnpm-lock 미접촉.
