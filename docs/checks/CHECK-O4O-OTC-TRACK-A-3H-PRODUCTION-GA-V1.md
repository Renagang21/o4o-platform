# CHECK — WO-O4O-OTC-TRACK-A-3H-PRODUCTION-GA-V1

**에이전트 가 · 3H 생산 세션 · 외부 config 기반 bundle 완결 (APPLIED · production LIVE) · 2026-07-22**

공용 runner registry(.ts) **미수정**. bridge full-content fingerprint 정본으로 미완료 READY_SINGLE 후보를 선정,
**자기 전용 외부 config JSON**(`--config` 병합, 외부 우선)으로 bundle runner(ko→en 자동화) 실행.

- 시작 HEAD `c735ecc93` (== origin/main)
- config 생성기(agent-가): [`drug-otc-track-a-3h-config-gen.ts`](../../apps/api-server/src/scripts/drug-otc-track-a-3h-config-gen.ts) — DONE=runner registry .ts 동적 파생 + 타 에이전트 active claim 제외 + 전 번역파일 스캔(build == live out en byte-identical 사전검증).
- config: [`otc-ko-en-bundle-track-a-3h-ga.config.json`](../../apps/api-server/src/scripts/data/otc-ko-en-bundle-track-a-3h-ga.config.json) (owner=agent-ga)

---

## 1. 후보 선정 (동시 경쟁 환경)

감사 19 평가 → file-ready 8 → 재감사(경쟁 반영: 시트룰린·독시라민·로페라미드·이부프로펜200 이 타 에이전트 ko 적용됨=ko충돌 제외) → **clean 4** 확정.
translationFile 은 기존 검증본(herbal / v1 / 개별) 공용 파일 참조 — build == live out en byte-identical 사전 통과분만.

## 2. 배치 1 실행 (bundle --config --apply)

| 그룹 | T | exclude | other | ko write (4T) | en write (2T) | translationFile |
|---|:-:|:-:|:-:|:-:|:-:|---|
| 은행엽건조엑스 80mg 정 | 6 | 4 | 0 | 24 | 12 | otc-en-translations-herbal-v1.json |
| 세티리진염산염 10mg 연질캡슐 | 4 | 19 | 0 | 16 | 8 | otc-en-translations-v1.json |
| 포도엽건조엑스 180mg 캡슐 | 4 | 3 | 0 | 16 | 8 | otc-en-translations-herbal-v1.json |
| 탄산수소나트륨 500mg 정 | 3 | 11 | 0 | 12 | 6 | otc-en-translations-v1.json |
| **합계** | **17** | 37 | 0 | **68** | **34** | — |

bundle status = **COMPLETED**, writeActual == writePlan **102** (봉투 초과 0), 전 그룹 other 0.
각 그룹 bundle 내부: ko dry-run PASS → ko apply → ko 재실행 ALREADY_UPGRADED → en dry-run PASS(consistency match) → en apply → en 재실행 ALREADY_COMPLETE.

## 3. 독립 검증 (bundle 밖 별도 쿼리)

| 그룹 | ko canon1/authored/dep | en (md5·건수) | ko/en 1:1 | dup | 제외 미접촉(authored/en) |
|---|:-:|---|:-:|:-:|:-:|
| 은행엽 80정 | 6/6/6 | `5e32af7a`×6 | 6 | 0 | 4 → 0/0 |
| 세티리진 10연질 | 4/4/4 | `61975502`×4 | 4 | 0 | 19 → 0/0 |
| 포도엽 180캡슐 | 4/4/4 | `6a9b94da`×4 | 4 | 0 | 3 → 0/0 |
| 탄산수소나트륨 500정 | 3/3/3 | `fbf84af8`×3 | 3 | 0 | 11 → 0/0 |

**대상 밖 write 0** (제외 37 master authored/en 0) · **canonical duplicate 0** · ko/en master_id·source_ref 1:1 · en byte-identical(consistency gate) → ko 에 없는 fact 0.

## 4. 중단 / 경쟁
- 중단 조건 해당 없음. 공통 DB·스키마 장애 0. 재시도 0.
- 경쟁: 에이전트 나·다가 동시 3h 배치 진행 → top 후보 다수 선점(시트룰린·독시라민·로페라미드·이부프로펜200 등 ko충돌). 재감사로 자동 회피. bundle 멱등이라 충돌해도 double-write 0.

**(배치 1 시점 결론)**: 은행엽 80mg 정 · 세티리진 10mg 연질캡슐 · 포도엽 180mg 캡슐 · 탄산수소나트륨 500mg 정 **ko/en canonical LIVE** (17 master, write 102). 후속 배치는 아래 §5 에 추가.

## 5. 배치 2 — EN 역구성 (덜 경쟁된 후보)

표준 번역파일에 build==live out en byte-identical entry 가 없는 "역구성 필요" 후보를,
`buildDrugOtcEnConsumerHtml` **역함수 파서**([`drug-otc-track-a-3h-reconstruct.ts`](../../apps/api-server/src/scripts/drug-otc-track-a-3h-reconstruct.ts))로
live out en HTML → DrugOtcEnTranslation 복원 → 재빌드 byte-identical(diff 0) 검증 후 배치 전용 번역파일 자동 생성.

| 그룹 | T | exclude | other | ko (4T) | en (2T) | en md5(=live out en) |
|---|:-:|:-:|:-:|:-:|:-:|---|
| L-시스틴 500mg 연질캡슐 | 4 | 4 | 0 | 16 | 8 | `3f1485a9` |
| 디펜히드라민염산염 50mg 연질캡슐 | 4 | 11 | 0 | 16 | 8 | `3c79b941` |
| 이부프로펜 400mg 연질캡슐 | 4 | 24 | 0 | 16 | 8 | `93bdb3ac` |
| 플루벤다졸 500mg 정 | 4 | 3 | 0 | 16 | 8 | `89ef4238` |
| **합계** | **16** | 42 | 0 | **64** | **32** | — |

bundle status = **COMPLETED**, writeActual == plan **96**, other 0.
독립검증: 전 그룹 ko 4/4/4 · en 4 canonical uniform · ko/en 1:1=4 · dup 0 · 제외 42 authored/en 0(대상 밖 write 0). 재실행 ALREADY.
역구성 = 형식 변환 재현(검토완료 EN 재사용) — build==live out en byte-identical 게이트로 ko 에 없는 fact 0.

---

## 종합

| 배치 | 그룹 | master | ko write | en write | 합 |
|---|:-:|:-:|:-:|:-:|:-:|
| 1 (file-ready) | 4 | 17 | 68 | 34 | 102 |
| 2 (역구성) | 4 | 16 | 64 | 32 | 96 |
| **누적** | **8** | **33** | **132** | **66** | **198** |

전 그룹 other 0 · 교집합 0 · canonical duplicate 0 · 대상 밖 write 0 · ko/en 1:1 · en byte-identical(새 fact 0) · 재실행 no-op.
runner registry .ts 미수정(외부 config 병합). 공통 DB·스키마 장애 0. 경쟁 그룹은 재감사 자동 회피 + bundle 멱등으로 double-write 0.
