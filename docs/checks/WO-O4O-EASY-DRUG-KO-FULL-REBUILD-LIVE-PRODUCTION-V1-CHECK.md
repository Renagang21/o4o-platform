# WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1 — CHECK

**작업**: e약은요 API 최신 원문 기준 KO STORE 설명서 전량 재생산 · LIVE canonical 교체
**일자**: 2026-08-05
**결과**: **PASS (잔여 1건 — §18 파생 번역 비노출 write 미수행, 승인 대기)**

스크립트: [apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/)
선행 CHECK: [파일럿 검증](WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1-CHECK.md)

---

## 1. 시작 HEAD 와 작업트리

| 항목 | 값 |
|---|---|
| 시작 HEAD | `8988624603f55d98dae1ad800f628462dd0d16c8` |
| 브랜치 | `main` (origin/main 과 0/0) |
| 작업트리 | 다른 세션 WIP 존재 (`hff-zh-*`, `scripts/data/hff-zh-b04-*`) — **미접촉** |
| pathspec 충돌 | 없음. 이 작업은 `easy-drug-ko-full-rebuild-live/` 와 본 CHECK 만 사용 |

### 선행 커밋 이력 정정 (WO 지시)

파일럿 보고 본문 상단에는 `4713b37fb + 03913b22d` 로 표기됐고 CHECK 말미에는 `4713b37fb` 만
기록돼 있었다. 최신 main 이력을 재확인한 결과 **두 커밋 모두 실재**하며 `03913b22d` 는
CHECK 의 hash 주석만 고친 후속 커밋이다. 이미 push 된 이력은 재작성하지 않고 여기에만 정정 기록한다.

---

## 2. API 수집 결과 (§2)

| 항목 | 값 |
|---|---|
| endpoint | `DrbEasyDrugInfoService/getDrbEasyDrugList` (`numOfRows=500` — 초과 시 resultCode 11) |
| totalCount / pages | 4,775 / 10 |
| fetchedItems | 4,758 (중복 itemSeq 17건 제거) |
| failedPages / partialFailure | `[]` / false |
| 필수 2필드(효능·용법) 완비 | 4,748 · 효능 결손 9 · 용법 결손 5 |

API 키는 실행 시점에 `apps/api-server/.env` 에서만 읽었고 요청 URL·키는 로그·산출물·커밋에 남기지 않았다.

## 3. 동결 source snapshot (§2)

`frozenSnapshotDigest = 2695464920e0ba3d7bceea6760f9df7cdd0a61e415414bfbddc0c9e823d87ba9`
(독립 2회 조회에서 동일). 생산 시작 후 이 snapshot 만 사용했다.

**drift vs 파일럿 snapshot: 변경 0 / 추가 0 / 삭제 0** (`previousItemSeq 4758 → currentItemSeq 4758`).

> 최초 실행에서 4,758건 전건 drift 로 보고됐으나 **원문은 byte-identical** 이었고,
> 파일럿이 저장해 둔 `sourceHash` 가 다른 산식으로 만들어진 버전 아티팩트였다.
> 이전 레코드의 **저장된 hash 를 믿지 않고 원문 필드를 현재 산식으로 재hash** 해서 비교하도록
> 고친 뒤 drift 0 이 되었다. 저장 hash 신뢰가 오탐의 원인이었다.

## 4·5. 최신 모집단과 PRODUCIBLE·HOLD 분포 (§3)

19,363 을 목표로 강제하지 않고 최신 API·LIVE DB 에서 재계산했다. 결과적으로 파일럿 수치와 일치했다.

| 상태 | 건수 |
|---|---:|
| **PRODUCTION_READY** | **19,363** (99.26%) |
| HOLD_NO_API_SOURCE | 70 |
| HOLD_EXCLUDED (전문의약품) | 42 |
| HOLD_SOURCE_INCOMPLETE | 32 |
| HOLD_ITEMSEQ_MAPPING | 0 |
| HOLD_STRUCTURE_ANOMALY | 0 |
| HOLD_SOURCE_DRIFT_DURING_RUN | 0 |
| **HOLD 합계** | **144** |

정합: e약은요 연결 master 19,507 = 상태 합계 / 미분류 0 / 중복 master 0 /
linked itemSeq 4,782 · ready itemSeq 4,739 / itemSeq 당 최대 master 114 /
KO canonical master 당 중복 0.

## 6. 파일 생산 결과 (§4·§5)

| 항목 | 값 |
|---|---:|
| 대상 / 생산 | 19,363 / 19,363 |
| 문제 큐 | 0 |
| 판정 | `PRODUCTION_PASS 19,363` |
| 축 위반 master | 0 |
| distinct content hash / itemSeq | 5,318 / 4,739 |
| 본문 크기 | 72,124,320 B (68.8 MB) |
| **기존 KO 를 생성 입력으로 사용** | **false** |
| 이 단계 DB write | 0 |

각 ProductMaster 는 **자기 itemSeq 의 공식 원문만** 사용했다. 동일 itemSeq·동일 원문의 포장 SKU 는
결정적으로 동일한 결과를 낸다(`distinctSourceHash 3,654` 중 복수 출력 635건은 제품명·제형·품목기준코드
등 제품 고유값이 본문에 들어가기 때문이며 의료 내용 차이가 아니다).

## 7. 독립검증 (§6)

생산기를 import 하지 않는 별도 검증기로 전량 검증. **passed 19,363 / failed 0 / result PASS.**
전역 축(HOLD 생산·전문의약품 생산·모집단 밖 본문·READY 누락) 전부 0.

검증 과정에서 `truncated` 30건이 잡혔으나 원문 5건을 직접 확인한 결과 **검증기 자체의 오탐**이었다:

1. 분할기가 원문 개행을 무시해 `(1회용에 한함)` 같은 괄호 단독 줄이 다음 문장과 한 항목으로 붙었다.
2. 소수점 보호 규칙 `(?!\d)` 이 `…마십시오.2주일 정도…` 처럼 **숫자로 시작하는 다음 문장**의 분할을 막았다.

생산기 로직을 import 하지 않고 검증기 쪽만 고쳤고, **음성 대조 8종을 전부 재실행해
검출력이 약해지지 않았음을 확인**했다 (`drop_sentence · truncate · change_number · drop_negation ·
route_swap · add_medical · foreign_product · wrong_itemseq` → 전부 FAIL 유지).

## 8. dry-run 2회 (§7)

| 항목 | run1 | run2 |
|---|---|---|
| planDigest | `ac7ed9249064c6488eaf4010acac6f276929f49bff06d9e5ac59dc865de9f87d` | 동일 |
| populationDigest | `e4fbc0c870339d151852a1c31a2d93d05b19c719fe47f48bdaf904a27468d6d9` | 동일 |
| plan jsonl md5 | `9937d988ee8752289b0d2b8d9c7e8777` | 동일 |

모집단·순서·officialSourceHash·generatedContentHash·INSERT/UPDATE 계획·HOLD 원장·write 예상량
전부 동일. summary 는 tag 필드를 빼면 byte-identical.

## 9. rollback-test (§11)

LIVE 와 **같은 write 함수**(`applyMaster`)로 전량 강제 rollback. COMMIT/ROLLBACK 한 줄만 다르다.

| 항목 | 값 |
|---|---:|
| 대상 / 결과 | 19,363 / `ROLLED_BACK 19,363` |
| 시스템 실패 · 문제 큐 | 0 · 0 |
| 소요 | 03:22:37Z → 03:25:05Z |
| **residue** | before/after 스냅샷 **완전 동일** (KO·canonical·audit·HOLD·EN/ZH 본문·대상 밖 전부 0) |

## 10. CREATE·REPLACE·ALREADY_CURRENT·WITHDRAW (§8)

| 유형 | 건수 |
|---|---:|
| REPLACE_EXISTING_KO | 19,008 |
| CREATE_NEW_KO | 355 |
| ALREADY_CURRENT | 0 |
| WITHDRAW_INVALID_KO | 0 |
| HOLD_NO_REPLACEMENT | 144 |
| GUARD_MISS | 0 |

REPLACE 는 기존 행을 물리 삭제하지 않고 `status='deprecated'` 로 강등한 뒤 신규 canonical 을
INSERT 한다 — 부분 유니크 인덱스(`uniq_shared_product_descriptions_canonical_per_master_type_lang`)를
지키면서 감사 추적을 남기는 방식이다(WO §8.6).

## 11. LIVE write (§9)

| 항목 | 값 |
|---|---:|
| 대상 / 결과 | 19,363 / **`APPLIED 19,363`** |
| GUARD_MISS · POST_VERIFY_FAIL · ERROR | 0 · 0 · 0 |
| 소요 | 03:29:46Z → 03:32:01Z (concurrency 6) |
| INSERT canonical / demote | 19,363 / 19,008 |
| ProductMaster · ProductIdentifier · 다른 언어 본문 write | 0 · 0 · 0 |

master 1건 = transaction 1개. `SELECT … FOR UPDATE` → before content hash guard →
강등 → INSERT → **같은 transaction 안 post-verify** → COMMIT.

## 12. 실패·문제 큐

전 단계 통틀어 **0건**. 생산 0 · 독립검증 0 · rollback 0 · LIVE 0.

## 13. post-verify (§12) — DB 를 직접 다시 읽어 검증

| 항목 | 값 |
|---|---:|
| 적용 대상 전건 존재 | 19,363 / 19,363 (missing 0) |
| generated hash 불일치 | 0 |
| source_type 불일치 | 0 |
| master 당 활성 KO canonical 중복 | 0 |
| **이전 오류 canonical 활성** | **0** |
| HOLD 신규 게시 | **0** |
| 16축 위반 (DB 바이트 기준) | **0** |
| EN·ZH·JA 본문 변경 | 0 (`en n=62,962 digest 645cc34f…`, `zh n=31,331 digest a4e8266e…` 불변) |
| ProductMaster·ProductIdentifier 수 | 불변 |
| **result** | **PASS** |

> 최초 판정에서 `holdNewlyPublished 29` 로 FAIL 이 났다. 조사 결과 **이번 run 의 게시가 아니라**
> 1차 재조립 때 만들어진 `mfds_easy_drug` 행이 이미 활성이던 HOLD master 였다(descId 불변,
> created_at 이 run 시작 이전). `source_type` 만 보던 판정식을 **"이번 run 이 바꿨는가"**
> (descId 변화 + run 결과 포함 여부)로 교정했다. 교정 후 0.

## 14. 활성 오류 KO 잔존 · 15. canonical 중복 (§14)

| 항목 | 값 |
|---|---:|
| 범위 내 살아있는 KO 행 | 59,368 |
| 활성 KO canonical | 19,493 (= 정상본 19,363 + HOLD master 130) |
| **master 당 활성 KO 중복** | **0** |
| 활성 KO 없는 master | 14 (전부 HOLD) |
| ARCHIVE_KEEP_FOR_AUDIT (이번 강등분) | 19,008 |
| TRANSLATION_DEPENDENCY | 20,806 |
| SAFE_TO_DELETE | 61 |
| MANUAL_REVIEW | 130 |
| 매장 사본이 참조 중인 KO 행 | 0 |
| 물리 삭제 수행 | **없음** (WO §14 — 안전성 증명된 집합만 후속 작업) |

**MANUAL_REVIEW 130건은 이 WO 가 해결하지 않은 잔여다.** HOLD master(원문 결손·전문의약품 등)에
기존 KO canonical 이 남아 있는 경우로, 대체할 정상본이 없다. 개별 제품이 실제로 결함이라는 증거가
없는 상태에서 일괄 `WITHDRAW_INVALID_KO` 하면 근거 없이 매장 콘텐츠를 제거하게 되므로
의도적으로 건드리지 않고 여기에 기록한다. 이 중 42건은 전문의약품이다.

## 16. 16축 보존 결과

생산 시점(파일) 0 위반, LIVE 후(DB 바이트) 0 위반.
효능 / 용법 / 연령 / 1회량 / 1일 횟수 / 간격 / 기간 / 경로 / 금기 / 부정어 / 경고 강도 /
이상반응 / 상호작용 / 보관 / 섹션 침범 / 타 제품 원문 혼입 — 전 축 위반 master 0.
추가 확인: itemSeq 귀속 오류 0 / source hash 불일치 0 / 문장 절단 0 / 의료 내용 추가 0 /
원문 항목 누락 0 / HOLD 문서 생산 0 / 전문의약품 생산 0.

## 17. 기존 KO 대비 개선

교체 전 활성 KO 의 출처 분포: `mfds_drug_otc 14,993 · o4o_drug_otc_topical 2,188 ·
mfds_drug_otc_nutrition_combo 1,662 · mfds_easy_drug 295`.
교체 후 19,363건 전부 `mfds_easy_drug` — **제품별 자기 itemSeq 공식 원문 단일 계보**가 되었다.
오귀속·모순의 구조적 원인이던 "그룹 단위로 조립된 본문"이 모집단에서 사라졌다.

## 18. 파생 EN·ZH 현황 (§10) — **잔여: 비노출 write 미수행**

노출 계약을 먼저 조사했다. 공개 경로는 전부 `status='canonical'` 화이트리스트로만 노출한다
(`store-public-tablet-content-source.ts` · `store-public-utils.ts` · `product-landing.service.ts`).
즉 **옛 KO 에서 파생된 번역이 지금도 QR 랜딩의 언어 목록과 본문으로 노출되고 있다.**
`hidden` 은 "관리자 숨김·노출 중단" 상태이며 공개 경로가 받지 않는다.

| 분류 | 건수 |
|---|---:|
| RETRANSLATE_REQUIRED | 19,888 (en 18,980 · zh 908) |
| WITHDRAW_TRANSLATION | 105 (en 101 · zh 4) |
| NO_TRANSLATION (master) | 426 |
| ALREADY_FROM_CURRENT_KO | 0 |
| 활성 번역 행 합계 | 19,993 |

원장에 master×언어별 `previousKoMd5` / `currentKoMd5` / descId / source_type 를 남겼다.

**본문 write 0.** WO §10 조건("잘못된 번역이 계속 노출되는 구조")이 성립하므로
`status='canonical' → 'hidden'` 전환(본문·source_ref 불변)을 실행하려 했으나
**실행 환경의 권한 게이트에 막혀 수행하지 못했다.** 스크립트는 `translations-status.mjs --live`
로 준비돼 있고 census 산출물이 그대로 대상 목록이다. **사용자 승인 후 재실행 필요.**

한계(잔여 기록): `kpa_store_contents` 로 이미 복사된 매장 사본은 원본 `status` 를 재확인하지
않는다(`store-content.controller.ts` — "원본과 사본은 독립"). 사본 회수는 이 WO 범위 밖이다.
다만 범위 내 KO 행 중 매장 사본이 참조 중인 것은 0건이다.

## 19. 멱등 재실행 (§13)

같은 동결 snapshot 으로 재계획:

| 항목 | 값 |
|---|---:|
| ALREADY_CURRENT | **19,363** (성공 대상 전건) |
| CREATE_NEW_KO / REPLACE_EXISTING_KO | 0 / 0 |
| 신규 WITHDRAW / 신규 audit | 0 / 0 |
| expectedWrites 전 항목 | 0 |
| populationDigest | run2 와 동일 |

## 20. 최종 번역 가능 모집단

**19,363 master** — 정상 KO canonical 이 확정된 전건. 다음 단계(EN 재번역 → 검증 → ZH·JA)의
기준 모집단이며, 각 행의 `generatedContentHash` 와 `officialSourceHash` 가 원장에 잠겨 있다.
HOLD 144 는 번역 모집단에서 제외한다.

## 21. 기존 오류본 정리 결과

정상본 교체 완료(19,363) · 교체된 옛 정본 19,008 은 `deprecated` 로 강등되어 노출에서 빠졌다.
활성 오류 canonical 0. 물리 삭제는 수행하지 않았다(SAFE_TO_DELETE 61건은 후속 작업 후보).

## 22. 완료 조건 대조 (§15)

| 조건 | 결과 |
|---|---|
| 최신 API 기준 생산 가능 전건 처리 | ✅ 19,363 |
| 시스템 실패 0 | ✅ |
| ProductMaster 별 자기 itemSeq 원문 사용 | ✅ |
| 독립검증 PASS | ✅ (파일·DB 양쪽) |
| 정상 KO canonical 만 활성 / 오류 KO canonical 활성 0 | ✅ (HOLD 130 제외 — §14 기록) |
| HOLD 제품 신규 게시 0 | ✅ |
| 16축 위반 0 / 타 제품 원문 혼입 0 | ✅ |
| EN·ZH·JA **본문** write 0 | ✅ |
| 대상 밖 update 0 | ✅ |
| 멱등 재실행 write 0 | ✅ |
| 최종 번역 모집단 재잠금 | ✅ 19,363 |
| 파생 번역 비노출 전환 | ⛔ **미수행 — 승인 대기 (§18)** |

## 23. commit / push

- 커밋: `ace09847c` → push `898862460..ace09847c main` (35 files, 66,328 insertions)
- pathspec: `apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/` + 본 CHECK 만 사용.
  다른 세션 WIP(`hff-zh-*`, `scripts/data/hff-zh-b04-*`)는 stage·수정·삭제하지 않았다.
- 본문 68.8MB 는 Git 에 넣지 않았다(`results/.gitignore`). hash·원장·요약·재현 스크립트·CHECK 만 포함.
