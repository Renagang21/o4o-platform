# CHECK-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-B-KO-EN-DA-V1 — NEXT batch-8 번들 B 4그룹 ko 승격 + 영어 완결 (에이전트 다)

WO: `WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-B-KO-EN-DA-V1` · 일자: 2026-07-20 · 상태: **완료 — 4그룹 T=41 ko 164 + en 82 = 246 write LIVE (독립검증·no-op PASS)**
runner: `drug-otc-grounded-upgrade-runner.ts`(ko) · `drug-otc-en-complete-runner.ts`(en) — **로직 무변경, GROUP_REGISTRY / EN_REGISTRY 데이터 등재만**.
채널: Cloud SQL Auth Proxy `127.0.0.1:5433` → production(`o4o_platform`).
감사 SSOT: `apps/api-server/src/scripts/data/otc-next-batch-8-audit-v1.json` (commit `52fbdd9a7`, 에이전트 나).

---

## 0. 결론

> **번들 B 4그룹(트리메부틴말레산염 200mg 정 13 / 메코발라민 500μg 캡슐 10 / 덱스판테놀 100mg 정 9 / 폴산 1mg 정 9 = T 41)을 ko 승격 → en 완결 연속 처리. 실제 write = ko 164 · en 82 · 총 246 — 계약 산식(ko=4T·en=2T·총=6T) 및 감사 기대치와 정확히 일치. 전 그룹 dry-run 선행 PASS · TX 사후검증 PASS · 독립검증 18항목 4/4 PASS · 재실행 no-op(ALREADY_UPGRADED / ALREADY_COMPLETE, write 0) · canonicalDup 0 · exclude/sibling 변이 0.**
>
> **함량·제형 격리**: 트리메부틴 **200mg 정**은 이미 완결된 100mg 정·150mg 정과 완전 별개 fp/candidate — **미접촉 확인**(exclude·out sibling 스냅샷 동일).
> **번들 A 미접촉**: 에이전트 가 번들(락토바실루스아시도필루스균 300mg 캡슐 / 알파칼시돌 0.5μg 연질캡슐 / 아세틸시스테인 100mg 캡슐 / 나프록센나트륨 275mg 정) 무접촉.

---

## 1. 대상 확정 (감사 SSOT 대조)

target master 는 감사 SSOT 의 `target_master_ids` 를 정본으로 삼고, runner dry-run 재현 결과와 **정렬 후 완전일치**를 게이트로 확인했다(재도출 아님).

| # | groupKey | targetFp | coarse | target T | exclude | other | 교집합 | easy canonical 정확히 1 | authored 충돌 | id 集合 감사 일치 |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|:---:|
| 1 | 트리메부틴말레산염\|200밀리그램\|정 | `559c4ffae3658ec7` | 39 | **13** | 26 | 0 | 0 | 13 | 0 | ✅ |
| 2 | 메코발라민\|500마이크로그램\|캡슐 | `c6c4dcfbf46d229c` | 10 | **10** | 0 (zero-exclude) | 0 | 0 | 10 | 0 | ✅ |
| 3 | 덱스판테놀\|100밀리그램\|정 | `37d1268f8f721dda` | 21 | **9** | 12 | 0 | 0 | 9 | 0 | ✅ |
| 4 | 폴산\|1밀리그램\|정 | `cb05e790cbe3b054` | 18 | **9** | 9 | 0 | 0 | 9 | 0 | ✅ |

- exclude fp 는 감사 `fpDistribution` 전사(재도출 금지): ①7 fp = 9+7+2+2+2+2+2 = 26 ②없음 ③4 fp = 4+4+2+2 = 12 ④2 fp = 7+2 = 9.
- 전 그룹 route 전량 `oral` · 비경구 혼입 0 · 대상 master 중복 0.
- dry-run 산출물: `data/otc-grounded-upgrade-{trimebutine-200mg-jeong,mecobalamin-500ug-capsule,dexpanthenol-100mg-jeong,folic-acid-1mg-jeong}.dryrun-pass.json`.

**착수 전 상태(before 스냅샷)**: 4그룹 전량 easy canonical(13/10/9/9) · authored 0 · audit 0 · en 0 — 깨끗한 미승격 상태.

---

## 2. ko 승격 (grounded-upgrade runner)

| # | 그룹 | STEP A INSERT | easy demote | authored flip | audit | ko 합 | 기대(4T) | TX 사후검증 |
|---|---|---:|---:|---:|---:|---:|---:|:---:|
| 1 | 트리메부틴 200mg 정 | 13 | 13 | 13 | 13 | **52** | 52 | canon1 13·authored 13·depEasy 13·dup 0 ✅ |
| 2 | 메코발라민 500μg 캡슐 | 10 | 10 | 10 | 10 | **40** | 40 | canon1 10·authored 10·depEasy 10·dup 0 ✅ |
| 3 | 덱스판테놀 100mg 정 | 9 | 9 | 9 | 9 | **36** | 36 | canon1 9·authored 9·depEasy 9·dup 0 ✅ |
| 4 | 폴산 1mg 정 | 9 | 9 | 9 | 9 | **36** | 36 | canon1 9·authored 9·depEasy 9·dup 0 ✅ |
| | **합계** | 41 | 41 | 41 | 41 | **164** | 164 | ✅ |

**보너스 증거**: 각 그룹의 authored ko 빌드 해시가 **동일 source_ref 를 공유하는 out-of-target master 의 live ko canonical md5 와 byte-identical** —
①`aa237534…` ②`6876cef5…` ③`d4db06d8…` ④`ac650e61…`. 즉 새로 쓰는 ko 는 이미 LIVE 인 동일 약물 ko 와 동일 본문이다(새 medical fact 0).

---

## 3. en 완결 (en-complete runner) — out 재사용 byte-identical 증명

4그룹 모두 대상 밖(out) master 가 이미 en canonical LIVE 이며 지문이 **단일 md5**. 대상은 **ko run.json `rollback_master_ids` master_id 리스트로만 스코프**(source_ref 스코프 금지).

| # | 그룹 | out en canonical | live md5 | struct 출처 | build md5 | byte-identical |
|---|---|---:|---|---|---|:---:|
| 1 | 트리메부틴 200mg 정 | 3 | `b8021ac013e795904e4924ee2f5d3a8c` | 마스터 번역 `otc-en-translations-v1.json` 발췌 | 동일 | ✅ |
| 2 | 메코발라민 500μg 캡슐 | 10 | `9e31eba07f3029816d9007109623ce97` | **마스터 번역 부재 → live en canonical 빌더 계약 역파싱 복원** | 동일 | ✅ |
| 3 | 덱스판테놀 100mg 정 | 4 | `2bbeab235a2cb9818dd5cbae9437c547` | 마스터 번역 발췌 | 동일 | ✅ |
| 4 | 폴산 1mg 정 | 8 | `5c41a406b1fbed993dcfeca356baf373` | 마스터 번역 발췌 | 동일 | ✅ |

> ②는 마스터 번역 파일에 해당 groupKey entry 가 없어, **이미 LIVE 인 en canonical HTML 자체를 `buildDrugOtcEnConsumerHtml` 계약대로 역파싱하여 struct 를 복원**했다. 번역 창작 0 · 새 medical fact 0 이며, 유일한 신뢰 게이트는 **재빌드 md5 가 live 와 완전일치**한다는 사실이다(일치 확인). 증명 도구/산출물: `src/scripts/otc-batch8-da-en-struct.ts` · `data/otc-batch8-da-en-struct.json`.

| # | 그룹 | en nr INSERT | canonical flip | 지문 불변 | en 합 | 기대(2T) | 사후검증 |
|---|---|---:|---:|---:|---:|---:|:---:|
| 1 | 트리메부틴 200mg 정 | 13 | 13 | 13/13 | **26** | 26 | enCanon 13·nr 0·dup 0·koCanon 13 ✅ |
| 2 | 메코발라민 500μg 캡슐 | 10 | 10 | 10/10 | **20** | 20 | enCanon 10·nr 0·dup 0·koCanon 10 ✅ |
| 3 | 덱스판테놀 100mg 정 | 9 | 9 | 9/9 | **18** | 18 | enCanon 9·nr 0·dup 0·koCanon 9 ✅ |
| 4 | 폴산 1mg 정 | 9 | 9 | 9/9 | **18** | 18 | enCanon 9·nr 0·dup 0·koCanon 9 ✅ |
| | **합계** | 41 | 41 | 41/41 | **82** | 82 | ✅ |

신규 그룹 번역 파일(배치 전용): `docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-{trimebutine-200mg-jeong,mecobalamin-500ug-capsule,dexpanthenol-100mg-jeong,folic-acid-1mg-jeong}-v1.json`.

---

## 4. 독립검증 (별도 질의 pass — `otc-batch8-da-verify.ts`)

선례 `otc-clonixin-jeong-verify.ts` 질의 세트를 4그룹으로 일반화하고, **before/after 스냅샷 대조**로 비대상 불변을 증명했다. 그룹당 18항목 전 PASS.

| 검증 항목 | 1 | 2 | 3 | 4 |
|---|:---:|:---:|:---:|:---:|
| target 수 == 감사 T | ✅ | ✅ | ✅ | ✅ |
| ko canonical 정확히 1 / authored / 올바른 source_ref_id | ✅ | ✅ | ✅ | ✅ |
| easy 전량 deprecated · easy canonical 잔존 0 | ✅ | ✅ | ✅ | ✅ |
| **canonicalDup 0** | ✅ | ✅ | ✅ | ✅ |
| audit(`canonical_replaced`, ko, 해당 source_ref) == T | ✅ | ✅ | ✅ | ✅ |
| ko 본문 md5 균일 · out sibling ko 와 일치 | ✅ | ✅ | ✅ | ✅ |
| en canonical == T · nr 0 · md5 균일 | ✅ | ✅ | ✅ | ✅ |
| **en md5 == out en byte-identical** | ✅ | ✅ | ✅ | ✅ |
| **exclude 집합 스냅샷 완전 동일**(SPD id·status) | ✅ | ✅ | ✅ | ✅ |
| exclude 중 easy canonical 이던 건 전부 easy 유지(승격 누출 0) | ✅ | ✅ | ✅ | ✅ |
| **out-of-target sibling(ko/en) 스냅샷 완전 동일** | ✅ | ✅ | ✅ | ✅ |

exclude 스냅샷 범위는 runner coarse 보다 넓게(easy SPD 유무 무관 동일 성분·함량·제형 전량) 잡았다 — 각각 29 / 10 / 16 / 17 master, 전건 변이 0.
산출물: `data/otc-batch8-da-verify.{before,after,compare}.json` → `status: PASS · failGroups 0`.

## 5. 재실행 멱등(no-op)

| 그룹 | ko 재실행 | en 재실행 |
|---|---|---|
| 트리메부틴 200mg 정 | `ALREADY_UPGRADED` · dbWrite 0 | `ALREADY_COMPLETE` · dbWrite 0 |
| 메코발라민 500μg 캡슐 | `ALREADY_UPGRADED` · dbWrite 0 | `ALREADY_COMPLETE` · dbWrite 0 |
| 덱스판테놀 100mg 정 | `ALREADY_UPGRADED` · dbWrite 0 | `ALREADY_COMPLETE` · dbWrite 0 |
| 폴산 1mg 정 | `ALREADY_UPGRADED` · dbWrite 0 | `ALREADY_COMPLETE` · dbWrite 0 |

runner selftest 14건 PASS · 변경 파일 tsc 오류 0.

---

## 6. 최종 LIVE / 합계

| 그룹 | T | ko write | en write | 총 | ko canonical LIVE | en canonical LIVE |
|---|---:|---:|---:|---:|---:|---:|
| 트리메부틴말레산염 200mg 정 | 13 | 52 | 26 | 78 | 13 | 13 |
| 메코발라민 500μg 캡슐 | 10 | 40 | 20 | 60 | 10 | 10 |
| 덱스판테놀 100mg 정 | 9 | 36 | 18 | 54 | 9 | 9 |
| 폴산 1mg 정 | 9 | 36 | 18 | 54 | 9 | 9 |
| **합계** | **41** | **164** | **82** | **246** | **41** | **41** |

기대(감사 SSOT) 164 / 82 / 246 과 **완전 일치**. 중단(STOP) 조건 발동 0건.

---

## 7. 산출물

- runner 등재(데이터만): `src/scripts/drug-otc-grounded-upgrade-runner.ts` · `src/scripts/drug-otc-en-complete-runner.ts`
- 조사/증명/검증 도구: `src/scripts/otc-batch8-da-probe.ts` · `src/scripts/otc-batch8-da-en-struct.ts` · `src/scripts/otc-batch8-da-verify.ts`
- 실행 산출물: `src/scripts/data/otc-grounded-upgrade-*.{run,dryrun-pass}.json` · `data/otc-en-complete-*.run.json` · `data/otc-batch8-da-*.json`
- 번역: `docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-*-v1.json` (4건)
