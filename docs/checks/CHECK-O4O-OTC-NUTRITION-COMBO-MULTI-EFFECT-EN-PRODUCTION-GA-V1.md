# CHECK — WO-O4O-OTC-NUTRITION-COMBO-MULTI-EFFECT-EN-3H-PILOT-GA-V1 (생산)

**에이전트 가 · nutrition_combo EN-only 다효능 병렬 보존 생산 (APPLIED · production LIVE) · 2026-07-22**

> 본 WO 1차 발행 시 분류·HOLD([선행 CHECK](CHECK-O4O-OTC-NUTRITION-COMBO-MULTI-EFFECT-EN-3H-PILOT-GA-V1.md)) 후 재발행. 나의 claim 계약·EN-only persist 경로 확립 확인 → 미claim 안전 그룹을 **다효능 병렬 보존 계약**으로 생산.

## 0. 계약 확정 (다효능 번역)

- **유일 원문 = ko canonical**(mfds_drug_otc_nutrition_combo). fresh 번역(byte-identical 참조본 없음, first-EN).
- **병렬 보존**: ko 효능을 동일 순서·축으로 병렬 번역. 여러 효능을 하나의 종합 효능으로 **합성 금지** · 성분별 인과 생성 금지 · 상호작용/금기/주의 축약·완화 금지 · ko에 없는 정보 추가 금지.
- 빌더 = 공용 `buildDrugOtcEnConsumerHtml`(sd-*), ko legacy `<table>` 미승계(ko 미변경).
- fact-0 보증 = (a) ko 충실 병렬 번역 (b) 다효능 TEST-LOG 전수 대조 (c) 구조 게이트(한글0·table0·주석0·sd-warn) (d) **ko 불변 사후검증(md5+count 전후 동일, TX 내 ROLLBACK 가드)**.
- 실행 인프라 = 공용 committed runner `otc-nutrition-combo-en-only-runner-na.ts`(미수정) + **자기 전용** config/translation/claim/run.

## 1. claim (프로토콜 §8-2)

`otc-production-claim.ga.json`(owner agent-ga) — 벤포벨브이·셀레트론플러스·눈모아 claim → commit `5481de1ca` → fetch → **교집합 0**(na claim = 비타민E/C·비오틴·칼슘D, 겹침 없음). 대형(500+)·상호작용 그룹 제외.

## 2. 생산 결과 (3그룹)

| 그룹 | sourceRef | T | ko Fp종 | en선존재 | STEP1 INSERT | STEP2 flip | koUnchanged | en write(2T) |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 벤포벨브이 정제 | `fcf616ee` | 4 | 1 | 0 | 4 | 4 | ✓ | 8 |
| 셀레트론플러스 연질캡슐 | `5a342fe9` | 5 | 1 | 0 | 5 | 5 | ✓ | 10 |
| 눈모아 연질캡슐 | `270a10a2` | 21 | 1 | 0 | 21 | 21 | ✓ | 42 |
| **합계** | — | **30** | — | 0 | 30 | 30 | — | **60** |

- 각 그룹 dry-run 2회 byte-identical PASS → apply → **재실행 ALREADY_COMPLETE(write 0)**.
- **EN writePlan = writeActual = 2T** (그룹별 초과 0). in-TX 사후검증: enCanonical=T·nr 0·dup 0·**koUnchanged true**.

## 3. 독립 검증 (runner 밖 별도 쿼리)

| 그룹 | ko(불변) | en canonical | 한글 | table | exactly1 | ko/en 1:1 |
|---|:-:|---|:-:|:-:|:-:|:-:|
| 벤포벨브이 | 4건 md5종1 | `cd298d68`×4 uniform | X | X | 4 | 4 |
| 셀레트론플러스 | 5건 md5종1 | `4d48e777`×5 uniform | X | X | 5 | 5 |
| 눈모아 | 21건 md5종1 | `89264359`×21 uniform | X | X | 21 | 21 |

**ko count·fingerprint 불변** · **대상 밖 write 0**(스코프=source_ref ko canonical 고정) · **canonical duplicate 0** · ko/en master_id·source_ref 1:1.

## 4. 다효능·상호작용 TEST-LOG (요지)

| 그룹 | 효능 축(병렬 보존) | 수치·용법 | 금기·상호작용 |
|---|---|---|---|
| 벤포벨브이 | ①비타민 A·B1·B2·B6·C·D·E 보급 ②눈 건조/야맹증 ③뼈·이·구루병 예방 — 3절 병렬, 합성 0 | vitamin A 5,000 IU/일·임신 3개월·12개월 미만 — 값 불변 | 비타민A 임신·아스파탐/PKU·고칼슘혈증/신장/결석/영아 (3금기 전수) |
| 셀레트론플러스 | 비타민 A·E·B·C 보급 / 눈 / 말초혈행·수족냉증 / 색소·출혈 예방 — 병렬 | 8세 이상·성인 1캡슐 1일 1회 | 비타민A 임신 5,000 IU·대두 과민·영아 |
| 눈모아 | 비타민 보급 / 눈 / 신경통·근육통 / 구각염·구내염 / 색소·출혈 / 말초혈행 / 아연 — 7절 병렬 | 성인 1캡슐 1일 2회 | 비타민A 임신 5,000 IU·대두 과민·영아 |

상호작용 문구 있는 그룹(마그신·레날비타)은 **미대상(HOLD_INTERACTION_INTERPRETATION)**. 본 3그룹은 상호작용 없음 → 해석 불필요.

## 5. 게이트·규칙 준수

- DB write = en INSERT/flip 만(ko UPDATE 0·DELETE 0·audit 0). ko 불변. canonical dup 0. 대상 밖 write 0.
- 공용 runner registry .ts **미수정**(committed runner 읽기 실행). 자기 claim/config/translation/run/CHECK만 수정. 타 세션 파일 미접촉. `git commit -- <명시 경로>`.
- 공통 DB·runner 장애 0. 재시도 0.

**(3그룹 시점 결론)**: 벤포벨브이·셀레트론플러스·눈모아 **EN canonical LIVE** (30 master, en write 60). ko 전량 불변. 후속 동일 계약 그룹은 §6 에 추가.

## 6. 배치 2 — 동일 계약 확장 3그룹

동일 병렬 보존 계약(비상호작용·상태기반 상담은 직접 번역·<500)으로 확장.

| 그룹 | sourceRef | T | ko Fp종 | STEP1/STEP2 | koUnchanged | en(uniform) | dup |
|---|---|:-:|:-:|:-:|:-:|---|:-:|
| 셀타골드에스 연질캡슐 | `029b8650` | 169 | 1 | 169/169 | ✓ | `ba1ee995` | 0 |
| 비타콤보씨플러스 정제 | `b21c54a6` | 208 | 1 | 208/208 | ✓ | `d1ffa387` | 0 |
| 센트본 정제 | `26c2af33` | 331 | 1 | 331/331 | ✓ | `626526a2` | 0 |
| **합계** | — | **708** | — | — | — | — | — |

각 dry 2회 byte-identical PASS → apply(en write 2T: 338/416/662) → 재실행 ALREADY_COMPLETE. 독립검증: ko 불변(md5종1·count)·한글0·table0·exactly1·ko/en 1:1·dup0·대상밖 write0.
번역 계약 준수: 다효능 병렬(합성0), '마그네슘 결핍 근육경련'(셀타골드)·'비타A/철 미함유로 임신 5,000 IU·철중독 경고 해당無'(센트본)은 **ko 원문에 명시된 사실/인과를 그대로 유지**(신규 생성 아님). 상태기반 상담(당뇨·통풍·혈전소인 등) 직접 번역.

## 7. 종합 · 종료

| 배치 | 그룹 | master | en write(2T) |
|---|:-:|:-:|:-:|
| 1 (파일럿) | 3 | 30 | 60 |
| 2 (확장) | 3 | 708 | 1,416 |
| **누적** | **6** | **738** | **1,476** |

- **배정 3h / 실작업 ~1h20m / 종료 = 안전(READY_PARALLEL_PRESERVE, 비상호작용·<500) 후보 소진**.
- **잔여 HOLD**: 티티아민(138, 에스트로겐 피임약 병용 문구 → HOLD_INTERACTION_INTERPRETATION 보수적) · 마그신(16, 다약물 상호작용) · 레날비타(60, 상호작용) → **HOLD_INTERACTION_INTERPRETATION**. 진셀몬(585, 500+) → 대형(우선순위 밖).
- **시간당 master ≈ 553/h** (재사용 아님·fresh 번역이나 그룹당 균일 ko 1건 번역 → 대량 master 적용).
- 병렬 생산 가능성: 잔여 상호작용 그룹은 상호작용 번역 계약(직접 번역 vs 해석 경계) 확정 후 가·나·다 분배 가능. 대형(진셀몬)은 별도. **현 계약으로 즉시 가능한 안전 그룹은 소진**.

**최종 결론**: nutrition_combo 다효능 EN-only **6그룹 738 master EN canonical LIVE**. ko 전량 불변·대상 밖 write 0·dup 0·상호작용 해석 0(비상호작용 그룹만). 안전 후보 소진으로 조기 종료.
