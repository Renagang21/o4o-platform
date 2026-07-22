# CHECK-O4O-OTC-TRACK-A-3H-PRODUCTION-DA-V1 — 외부 config bundle 독립 생산 (에이전트 다)

WO: `WO-O4O-OTC-TRACK-A-3H-PRODUCTION-DA-V1` · 일자: 2026-07-22 · 상태: **완료 — 4그룹 ko+en 완결 LIVE (bundle COMPLETED, 외부 config)**
bundle: `drug-otc-ko-en-bundle-runner.ts --config=<track-a-3h-da.config.json>` · 채널: Cloud SQL Proxy(:5442) → production.

---

## 0. 결론

> **이전 WO 에서 만든 외부 config bundle runner 로 남은 READY_SINGLE 4그룹(시트룰린말산염 500mg 정·독시라민숙신산염 25mg 정·로페라미드염산염 2mg 캡슐·이부프로펜 200mg 정, 각 target 6/5/5/5=21)을 GROUP_REGISTRY·EN_REGISTRY **미수정**(외부 config 만)으로 ko→en 연속 완결. bundleStatus COMPLETED · write plan 126 == actual 126(ko 84·en 42) · 독립검증 4/4 PASS · 재실행 NO_OP(write 0). 공용 runner registry 수정 0.**

---

## 1. 시작 · 소유권 격리

| 항목 | 값 |
|---|---|
| 시작 HEAD | `7fa6e64a6` (직전 long-run WO) |
| bundleKey (전용) | `track-a-3h-da` · writeOwner `agent-da` |
| 공용 runner registry 수정 | **0** (외부 config `otc-ko-en-bundle-track-a-3h-da.config.json` 만) |
| 가·나 config/registry 교집합 | **0** (4그룹 전부 registry 미등록·최근 커밋 언급 0·가/나 bundle config 없음) |
| 후보 출처 | 나 inventory queue READY_SINGLE(`otc-track-a-completion-inventory-and-queue-v1.json`) |

- `이부프로펜|200밀리그램|정` 은 registry 의 `ibuprofen-200mg-softcap`(연질캡슐, 별개 제형·fp)과 다른 그룹. outBase/translation 분리.

---

## 2. 후보 (나 감사 READY_SINGLE)

| 그룹 | targetFp | target/excl/other | candidate(srid) | sibling en md5 |
|---|---|---|---|---|
| 시트룰린말산염 500mg 정 | `66df757d3628ec4d` | **6/8/0** | 12b056c0 | `de38b253…` |
| 독시라민숙신산염 25mg 정 | `b2684c9a7e31a7b2` | **5/14/0** | 0be1a647 | `0811860b…` |
| 로페라미드염산염 2mg 캡슐 | `b6f8ec48477251b1` | **5/14/0** | 01c34c17 | `6737b7a6…` |
| 이부프로펜 200mg 정 | `b4f3651ae36d1387` | **5/9/0** | 0168e020 | `3344b8b5…` |

- 각 easyCanonicalExactly1=target · authoredConflict 0 · in-scope en 0 · other 0.
- EN=sibling 검토완료 en 재구성, **build == live sibling en byte-identical** 선검증 **4/4 PASS**(비DB).

---

## 3. bundle 실행

- **dry-run**: 4그룹 ko=READY(게이트 6/8/0·5/14/0·5/14/0·5/9/0 감사 일치), en=HOLD(ko 미적용 전제, disposition continue) · write plan 126(ko 84·en 42) · actual 0.
- **apply**: COMPLETED · 4그룹 ko ALREADY_UPGRADED / en ALREADY_COMPLETE · write plan 126 == actual 126 · 중간 승인 0

| 그룹 | 그룹 status | ko | en | koActual | enActual |
|---|---|---|---|---|---|
| 시트룰린말산염 500mg 정 | ALREADY_COMPLETE | ALREADY_UPGRADED | ALREADY_COMPLETE | 24(SPD18/audit6) | 12(6/6) |
| 독시라민숙신산염 25mg 정 | ALREADY_COMPLETE | ALREADY_UPGRADED | ALREADY_COMPLETE | 20(15/5) | 10(5/5) |
| 로페라미드염산염 2mg 캡슐 | ALREADY_COMPLETE | ALREADY_UPGRADED | ALREADY_COMPLETE | 20(15/5) | 10(5/5) |
| 이부프로펜 200mg 정 | ALREADY_COMPLETE | ALREADY_UPGRADED | ALREADY_COMPLETE | 20(15/5) | 10(5/5) |
| **bundle** | **COMPLETED** | — | — | **ko 84** | **en 42** |

- **독립 검증**: 별도 pg 연결 — 그룹당 ko canonical=target · en canonical=target · en dup 0 · en content md5=sibling(de38b253/0811860b/6737b7a6/3344b8b5) **4/4 일치**
- **재실행 no-op**: bundle 재실행 **NO_OP** · 4 ALREADY_COMPLETE · actual 0 · write 0

---

## 3-A. ⚠️ 동시 세션 groupKey 충돌 (시트룰린 — 투명 보고)

- **선택 시점(교집합 0 확인)**: 가/나 bundle config 파일 0·최근 커밋 언급 0·registry 미등록 → 4그룹 free 판정 후 착수.
- **실행 중 충돌 관측**: 나(na)가 **동일 그룹 `시트룰린말산염|500밀리그램|정`**(동일 candidate `12b056c0`, master 교집합 **6/6**)을 동시 진행. na 산출물(`otc-grounded-upgrade-citrulline-500mg-jeong.*`, `otc-en-translations-citrulline-500mg-na-v1.json`) 별도 존재.
- **경합 결과**: 내 apply 가 **선착**(koActual 24·enActual 12 = 실제 write) · na 실행은 **ALREADY_UPGRADED/ALREADY_COMPLETE no-op**(내 run.json·na run.json 모두 ALREADY_UPGRADED).
- **안전성**: 멱등 설계(`WHERE NOT EXISTS`·per-master canonical 가드·TX 사후검증 `dup==0`)로 **이중쓰기 0**. 독립검증 ko6·en6·dup0·en md5 sibling 일치 → **데이터 무손상**. 나머지 3그룹(독시라민·로페라미드·이부프로펜200정)은 충돌 없음.
- **교훈**: 락 없는 병렬 생산에서 selection↔apply 사이 race 는 구조적으로 가능. **멱등 계약이 최종 안전판**으로 작동함을 실증. 향후 동시 생산 시 착수 즉시 config commit(선점 표식) 권고.

---

## 4. 장시간 bundle 안정성 집계 (WO 추가 관찰)

| 관찰 | 결과 |
|---|---|
| child timeout 발생 | **0건** (child timeout 미발생, 200s 여유) |
| 연결 pool 사용 안정성 | apply 중 o4o_api 연결 **3**(pool max=2 효과) — 이전 WO 고갈(17/25) 대비 안정 |
| remaining connection slots 재발 | **0건** (재발 없음) — apply 중 o4o_api 연결 3, pool max=2 상한 유효 |
| 그룹 HOLD 후 continue | dry-run 4그룹 en HOLD(ko 미적용 전제)→disposition continue 동작 확인. apply 단계 HOLD/FAILED 0. |
| bundle summary 결정론 | apply COMPLETED / 재실행 NO_OP 각각 4 ALREADY_COMPLETE 동일 집계. summary 필드 타임스탬프 미포함(결정론). |

---

## 5. 완료 보고

| 항목 | 값 |
|---|---|
| 시작/종료 HEAD | `7fa6e64a6` → 본 커밋 |
| production write | ko 84 + en 42 = **126** (plan==actual, 초과 0) |
| 그룹 결과 | 4/4 ko+en 완결(ALREADY_COMPLETE) · 독립검증 PASS · no-op PASS |
| 공용 runner registry 수정 | **0** (외부 config only) |
| 생성 파일 | bundle config JSON · 4 번역 JSON · 4 ko run/dryrun-pass · 4 en run · summary · 본 CHECK |
| 중단 조건 | 미해당 (DB 장애·connection slot 재발·target 밖 write·duplicate·계약 불일치·writeActual 초과 전부 0) |

> 외부 config bundle 로 registry 편집 없이 4그룹 독립 생산 완결. 장시간 안정성: child timeout 0·connection slot 재발 0·pool max=2 안정·HOLD continue 동작·집계 결정론. 남은 FREE READY_SINGLE(은행엽[herbal]·비오틴[en불가]) 은 트랙/실현성 사유로 제외.
