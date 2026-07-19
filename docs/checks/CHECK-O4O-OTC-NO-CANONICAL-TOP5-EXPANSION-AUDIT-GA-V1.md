# CHECK — STORE canonical 미보유 top-5 확대 후보 조사

**WO:** WO-O4O-OTC-NO-CANONICAL-TOP5-EXPANSION-AUDIT-GA-V1
**성격:** read-only · DB write 0
**결론:** ⚠️ **파모티딘/펙소페나딘/글루코사민/클로트리마졸 제외 시 clean 경구 단일제 후속 후보 = 0.** 완성 curated draft 풀 소진 — 추가 확대는 **신규 draft authoring** 선행 필요.

---

## 0. 조사 방법

`drug-otc-no-canonical-pilot-candidates.ts`(벌크·결정론, 재실행 byte-identical) 재실행 후 draft 풀 전수 분석. 파모티딘 24 + 펙소페나딘 14 ko canonical 반영 상태.

- universe(STORE ko canonical 미보유 OTC): 35,292 → **35,254** (파모티딘 24 + 펙소페나딘 14 승격 반영).

---

## 1. 펙소페나딘 — 타 세션 진행 확인 (중복 금지)

draft `049c2a1c` (펙소페나딘염산염 60mg 정): **ko canonical 14 완료 + en needs_review 14 진행 중**(canonical flip 전). → **타 세션 소유, 이 조사에서 제외·미접촉.**

---

## 2. draft 풀 전수 — promotable>0 은 단 2건

| draft | promotable | 경구 | 완성 | 상태 |
|---|---:|---|---|---|
| 클로트리마졸 100mg 질정 | 14 | ❌ 비경구(질정) | ✅ | 별도 트랙(경구 조건 밖) |
| 결정글루코사민황산염 250mg 캡슐 | 8 | ✅ | ✅ | **HOLD**(첨가제 황색5호 원문 대기) |

- 나머지 draft: **promotable 0 (64건)** — 그룹이 이미 e약은요 STORE canonical 점유. · **err(seed 그룹키 불완전) 29건** — 복합제 등.
- **contentPending 0 · 미완성(필드누락) 0** — 완성해서 쓸 근접 후보도 없음.

---

## 3. WO 조건 대조 — clean 경구 후속 후보 = 0

| 후보 | 판정 |
|---|---|
| 파모티딘 10mg 정 | ✅ **완료**(ko·en canonical 24) — 제외 |
| 펙소페나딘 60mg 정 | (진행) 타 세션 진행 — 제외 |
| 결정글루코사민 250mg 캡슐 | ⏸ HOLD(첨가제 원문) — WO 지시 제외 |
| 클로트리마졸 100mg 질정 | ❌ 비경구 — WO 조건 밖 |
| **그 외 clean 경구 단일제** | **없음** (완성 draft 풀 소진) |

→ **요청한 3개 clean 경구 후보를 현재 draft 풀에서 확정할 수 없음.** 억지 선정하지 않고 사실대로 보고.

---

## 4. 원인 · 확대 경로

- **제약 = curated draft 가용성.** STORE-canonical-미보유 OTC 35,254 master 중 대부분은 **draft 없는 그룹**이다(95 draft 중 promotable 있는 건 2건뿐).
- 실질 확대 3경로:
  1. **신규 draft authoring** — draft 없는 미보유 그룹에 curated 구조화 필드 작성(content 작업, apply 아님). 커버리지 큰 그룹부터.
  2. **글루코사민 HOLD 해소** — 첨가제(황색5호) 원문 검증 완료 시 8건 경구 apply 가능.
  3. **비경구 별도 트랙** — 클로트리마졸 질정 14(경구 파일럿과 분리된 정책·검증 필요).

---

## 5. 승인 봉투 초안

- **clean 경구 신규 후보 0** → 이번 확대분 자동-완결 승인 봉투 **대상 없음**.
- 펙소페나딘은 타 세션 소유 봉투 진행 중(중복 금지). 파모티딘은 완결.
- 다음 실제 확대는 §4 경로 중 사용자 선택 후 별도 WO(신규 authoring / HOLD 해소 / 비경구 트랙)로 진행.

---

## 6. 완료 보고

- 펙소페나딘 타 세션 진행(ko 14 + en nr 14) 확인, 미접촉.
- promotable>0 draft: 2 (글루코사민 8 HOLD 경구 · 클로트리마졸 14 비경구).
- **clean 경구 후속 후보 확정 수: 0** (완성 draft 풀 소진).
- 재실행 결정론: byte-identical(벌크 집계).
- DB write 0. 자기 파일만 commit.
- 권고: 확대는 신규 draft authoring 선행 — 커버리지 큰 미보유 그룹 우선.

---

*read-only 확대 조사. clean 경구 draft-backed 후보 소진 확인 → 다음은 신규 draft authoring 이 선행 조건.*
