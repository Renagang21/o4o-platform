# CHECK-O4O-OTC-TRACK-A-3H-PRODUCTION-NA-V1 — READY_SINGLE 생산 시도·중단 (에이전트 나)

WO: `WO-O4O-OTC-TRACK-A-3H-PRODUCTION-NA-V1` · 일자: 2026-07-22 · 상태: **부분 — production DB write 0. 비오틴 오분류 발견 → 중지 조건 발동. byte-identical 후보는 가/다 선점 완료.**
채널: Cloud SQL Auth Proxy(127.0.0.1:5442) → production `o4o_platform`. 방식: 자기 전용 외부 config(`--config`) — **공용 registry 수정 0**.

---

## 0. 결론

> **이 WO 에서 나의 production DB write = 0**(citrulline 번들 apply = NO_OP · 그 외 전부 dry-run/read-only). 남은 byte-identical READY_SINGLE 그룹(시트룰린·독시라민·로페라미드·이부프로펜200/400·세티리진·디펜히드라민·L-시스틴·플루벤다졸 등)은 **동일 3H 라운드를 병렬 진행 중인 에이전트 가/다가 전량 선점 완료**(내 감사 시점 Track A 36그룹 → en 결손 0). 유일 미착수였던 **비오틴 5mg 정은 Track A grounded-upgrade 대상이 아님**을 발견 — 8 target 이 이미 authored ko canonical 을 보유하되 source_type 이 `mfds_drug_otc_nutrition_combo`(영양보조 복합)이다. 내 config 의 `mfds_drug_otc` grounded upgrade 를 적용하면 **잘못된/충돌 write** 가 되므로 **WO 중지 조건("대상 밖 write 정황")에 따라 즉시 중단**했다.

---

## 1. 시작/종료 상태

| 항목 | 값 |
|---|---|
| 브랜치 | `main` · 시작 HEAD `09d5e50c3` |
| 종료 HEAD | 본 커밋 (origin/main 동기) |
| production write (나) | **0** (dry-run·read-only만) |
| 인프라 | en 러너 `--config` 병합 · ko 러너 `--config` 병합 · bundle 러너 `--config` 전파 (모두 공용 registry 미수정) |

---

## 2. 진행 경과

1. **인프라 파악**: `drug-otc-en-complete-runner.ts`/`drug-otc-grounded-upgrade-runner.ts` 의 `--config=<path>` 외부 병합, `drug-otc-ko-en-bundle-runner.ts` 의 config 전파 확인. 자기 전용 config `otc-ko-en-bundle-track-a-3h-na.config.json` 작성.
2. **역매핑 도구**: `otc-en-reverse-map-na.ts` — byte-identical 그룹의 번역 JSON 을 live out-en 빌더 역매핑으로 복원·검증(build==live). 시트룰린으로 검증 PASS(md5 `de38b253…`).
3. **시트룰린 번들**: ko dry-run PASS(target 6·exclude 8·other 0). **apply 직전 타 에이전트(가/다)가 선점 적용** → 내 bundle apply = `ALREADY_COMPLETE`/`NO_OP`(write 0). 이중 write 없음(번들 no-op 가드 정상).
4. **잔여 후보 일괄 점검**: byte-identical 후보 8종 전량 authored ko canonical 보유(완료). **비오틴만 미착수**.
5. **비오틴 조사 → 중단**(§3).

---

## 3. 비오틴 5mg 정 — grounded-upgrade 부적합 (중지 근거)

### 실측 상태 (production, read-only)

| source_type | lang | status | masters |
|---|---|---|---:|
| **`mfds_drug_otc_nutrition_combo`** | ko | **canonical** | **8** |
| `mfds_easy_drug` | ko | canonical | 13 |
| `mfds_easy_drug` | ko | candidate | 6 |
| (en) | en | canonical | **0** |

- 비오틴 8 target 은 **이미 authored ko canonical 보유** — 단 source_type 이 **`mfds_drug_otc_nutrition_combo`**(영양보조 복합 파이프라인). Track A grounded upgrade(`mfds_drug_otc`)의 대상이 아니다.
- ko 러너 pre-gate 도 이를 반영: 내 config(`mfds_drug_otc`, excludeFp 2·excludedExpected 5)로 dry-run 시 **`excluded 11 !== 5` ABORT**. 원인 = 러너 coarse 가 easy `canonical-또는-deprecated` fallback 을 쓰므로(내 감사는 canonical만) 이미 승격·재분류된 master 가 coarse 에 포함되어 SSOT 재고정 불일치.

### 감사 분류 버그 (근본 원인)

- `otc-track-a-completion-inventory-and-queue.ts:53` `AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo']` 에 **`mfds_drug_otc_nutrition_combo` 누락** → 비오틴의 기존 authored ko canonical(nutrition combo)이 `authoredConflict` 게이트에 안 잡혀 **READY_SINGLE 로 오분류**(실제는 ko 완료·en 결손).
- 영향: Track A 완료 집계(canonical_replaced metadata `newSource=mfds_drug_otc` 한정)에도 nutrition-combo 승격은 미포함 → nutrition-combo 그룹이 READY_SINGLE 후보로 새어 나온다.

### 권고 (후속)

1. **감사 수정**: `AUTHORED_SOURCES` 에 `mfds_drug_otc_nutrition_combo`(및 combo 변형) 추가 → nutrition-combo 그룹을 COMPLETED/HOLD 로 정분류. Track A 판별 metadata 도 combo newSource 포함 검토.
2. **비오틴 EN**: ko 는 이미 nutrition-combo authored 완료·en 0. EN 은 **nutrition-combo EN 경로**(sourceType `mfds_drug_otc_nutrition_combo`)로, sibling EN 부재이므로 **fresh 번역**(ko canonical 충실 번역·GUIDE V0.5/GLOSSARY V0.2/TEST-LOG·fact-0)이 필요. 현 byte-identical 전용 en-complete 러너는 무sibling 시 ABORT 하므로 **별도 fresh-persist 경로** 필요. grounded-upgrade 러너로는 착수 금지.

---

## 4. 준수 / 금지

| 항목 | 결과 |
|---|---|
| production DB write (나) | **0** (dry-run·read-only) |
| 공용 registry(GROUP/EN) 수정 | **0** (자기 전용 `--config` 만) |
| 이중 write / 대상 밖 write | **0** (citrulline no-op 가드 · 비오틴 중단) |
| 타 세션 파일 수정·커밋 | **0** |
| 중지 조건 | **발동** (비오틴 대상 밖 write 정황 → 즉시 중단) |

---

## 5. 산출물

- `docs/checks/CHECK-O4O-OTC-TRACK-A-3H-PRODUCTION-NA-V1.md` (본 문서)
- `apps/api-server/src/scripts/otc-en-reverse-map-na.ts` — byte-identical 번역 JSON 역매핑·검증 도구(재사용, 시트룰린 검증 PASS)
- (scratch, 미커밋) 자기 전용 config·fp harvest·citrulline 번역 JSON·runner dry-run 산출 — 비오틴 fp/source 오전제 포함이라 커밋 제외.

---

## 6. 완료 보고 요약

- **시작 HEAD** `09d5e50c3` → **종료 HEAD** 본 커밋
- **production write(나): 0** — byte-identical 후보 전량 가/다 선점(Track A 36그룹·en 결손 0), 시트룰린은 apply 직전 선점되어 no-op
- **비오틴**: grounded-upgrade 부적합(이미 nutrition-combo authored ko canonical 8·en 0) → 중지 조건 발동, 미실행
- **발견**: 감사 `AUTHORED_SOURCES` 에 `mfds_drug_otc_nutrition_combo` 누락 → nutrition-combo 그룹 READY_SINGLE 오분류 (수정 권고)
- **다음**: (1) 감사 source 분류 수정 (2) 비오틴 EN 은 nutrition-combo fresh-번역 경로로 별도 WO
- **미푸시 자기 산출물 0**

> 안전 우선. 불확실한 scope 의 production write 를 강행하지 않고 중단·보고. 실행 배정은 감사 수정 후 재개.
