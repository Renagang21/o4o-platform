# CHECK — WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1

**Agent:** 나 (na) · **역할:** 단일 DB write-owner · **모드:** LIVE 생산 apply (KO → EN) · **결과: GREEN**

## 0. 결론

| 항목 | 값 |
|------|----|
| Unit / Route | topical-unit-1 / topical |
| 대상 | **327 master · 55 content fp** |
| LIVE write | **KO 1,308T + EN 654T = 1,962T** (예상과 실측 일치) |
| 상태 | **topical-unit-1 = GREEN** · ophthalmic-unit-1 = **UNBLOCKED** |
| 실패 | apply 0 · postVerify 0 · 독립검증 0 |

근거 커밋: V3 글로벌 재승인 `00851d237`(`APPROVED_FOR_PRODUCTION`) · topical/oromucosal readiness `bb2e79a22` · oral V3 COMPLETE `3f200900a`. 시작 시점 `origin/main` 과 동일(ahead/behind 0/0).

## 1. 단일 write-owner

- **agent-na 단독** DB write. 서브에이전트 미기동 — 조사·수정·apply·검증 전부 main 세션에서 직렬 수행.
- 프록시: Cloud SQL Auth Proxy v2, 나 전용 포트(5471 → 토큰 만료 후 5472 재기동). 러너·검증기 모두 `--port` 명시.
- 다른 세션 LIVE write 0 — 선행 게이트 G6/G9 로 실측(대상 authored 0 · 트랙 audit 0 · V3 sourceRef LIVE 행 0), apply 직전 재확인.

## 2. 선행 게이트 (11항 전부 PASS · fails 0)

러너: `otc-v3-topical-preflight-gate.na.ts` (신규, read-only)

| # | 게이트 | 실측 |
|---|--------|------|
| G1 | oral route COMPLETE | KO 540 / EN 540 / easy deprecated 540 / easy 잔존 0 / audit master 540 ✅ |
| G2 | topical PRE_APPLY READY | `PRE_APPLY_READY` · 327m / 55fp / writePlan 1,962 ✅ |
| G3 | readiness 산출물 불변 | build · en-build · preapply-ready · preapply-verify · reproduce-check · en-check **6종 md5 == `bb2e79a22` blob** ✅ |
| G4 | 승인 SSOT·unit ledger 불변 | ledger · 재승인 SSOT · safety-section contract **3종 md5 == `00851d237` blob** · 대상 master/sourceRef 집합 ledger 일치 · EN fp 패리티 ✅ |
| G5 | easy KO canonical | 327 ✅ |
| G6 | 기존 authored canonical | KO 0 / EN 0 ✅ |
| G7 | V3 sourceRef 충돌 | 0 ✅ |
| G8 | canonicalDup | KO 0 / EN 0 ✅ |
| G9 | 다른 세션 LIVE write | 트랙 audit 0 ✅ |
| G10 | ophthalmic·oromucosal 미착수 | 253 / 14 전건 easy canonical · authored 0 ✅ |
| G11 | 전문용 혼입 | `drug_category='otc'` 327/327 · 비-otc 0 · 원문 전문가전용 표지 fp 0 ✅ |

**해시 불변 실증:** dry-run planDigestMd5 = `cc29b9988da9dffa147912251e04632a` — readiness 원장(`CHECK-V3-FINAL-READINESS` §3)과 동일. KO source·EN payload·dry-run digest 전부 불변.

## 3. write 경로 (계약 이탈 0)

`otc-v3-topical-oromucosal-apply.na.ts` 를 LIVE apply 가능하도록 확장:

- `PRODUCTION_WO_BY_UNIT` = **topical-unit-1 단독** 화이트리스트. `oromucosal-unit-1` 은 승인 WO 부재 → `exit 3` 강제중지.
- **3중 게이트**: `--apply --confirm` + per-unit·per-lang confirm env(`OTC_V3_APPLY_{KO,EN}_TOPICAL_UNIT_1=CONFIRM`) + unit 화이트리스트.
- rollback-test 가 검증한 SQL 을 `execKoFp`/`execEnFp` 로 추출해 **LIVE apply 와 동일 함수 공유**. audit `metadata.wo` 는 readiness 원장 대조축 유지, 실행 WO 는 `productionWo` 병기.
- **da oral GREEN 러너와 4함수(`execKoFp`·`execEnFp`·`rollbackTestFp`·`applyFp`) byte-identical** 확인(각 5823/2618/918/1327 bytes 동일).
- rollback-test 재입증: 55/55 PASS · TX 내 1,962 write 후 **전량 ROLLBACK** · 독립 커넥션 residue 0/0/0/0.

## 4. LIVE apply

fp별 단일 TX — TX 내부 사후검증 PASS 시에만 COMMIT, 1건이라도 실패 시 해당 fp 전량 ROLLBACK 후 즉시 중지.

| 단계 | fp | write 실측 | 예상 | planDigestMd5 |
|------|---:|-----------:|-----:|---------------|
| KO (insert+demote+flip+audit = 4T) | 55/55 COMMIT | **1,308** | 1,308 | `66e7cf6cd1c14d5f735fec500035f851` |
| EN (insert+flip = 2T) | 55/55 COMMIT | **654** | 654 | `f592123d325fc0b38d11cba4955640f9` |
| **합계** | **55/55** | **1,962** | **1,962** | 일치 ✅ |

EN 은 fp별 TX 진입 시 KO authored canonical `T` 전건 성립을 선행 확인한 뒤에만 진행.

## 5. postVerify (별개 커넥션·별개 코드경로 · read-only)

러너: `otc-v3-topical-postverify.na.ts` (신규, oral GREEN 검증본 VERBATIM 이식 + na 축 교체) · **PASS · fails 0**

| 축 | 실측 |
|----|------|
| KO | canonical 정확히 1 = 327 · authored 327 · easy deprecated 327 · easy 잔존 0 · canonicalDup 0 · sourceRef scope 327 · 범위밖 0 · audit 327 · content md5 불일치 0 |
| EN | canonical 정확히 1 = 327 · authored 327 · canonicalDup 0 · sourceRef scope 327 · 범위밖 0 · content md5 불일치 0 · 한글 0(payload/DB 양쪽) |
| 공식 6섹션 보존 | 원문(officialSections) ↔ DB 저장본 직접 대조 — 안전섹션 **116/116** · 효능·효과/용법·용량 **수치 누락 0** · content variant 0 |
| 격리 | oral-unit-1/2 = `applied` 불변 · ophthalmic-unit-1 / oromucosal-unit-1 = `fresh` · 전 peer 에 이번 WO audit 0 · topical sourceRef 행 0 |

## 6. 독립검증 (제3 코드경로)

러너: `otc-v3-topical-track-verify.na.ts` (신규) · 대상 축을 build 산출물이 아니라 **승인 SSOT unit ledger** 에서 직접 취득 · **PASS · fails 0**

| 지표 | 값 | 지표 | 값 |
|------|---:|------|---:|
| targetMasters | 327 | canonicalDup | 0 |
| contentFp | 55 | sourceRefLeak | 0 |
| koAuthoredCanonical | 327 | storedContentHashMismatch | 0 |
| enCanonical | 327 | officialSixSectionsMismatch | 0 |
| easyDeprecated | 327 | enHangul | 0 |
| easyStillCanonical | 0 | professionalUseWritten | 0 |
| auditKo | 327 | measuredWrite | **1,962** |

## 7. 범위 사후검증

| 대상 | 실측 |
|------|------|
| oral V3 540 master | KO 540 / EN 540 / easy deprecated 540 불변 · oral V3 sourceRef 행 1,080 유지 · oral audit master 540 · **이번 WO audit 0 · topical sourceRef 행 0** ✅ |
| ophthalmic-unit-1 253 master | easy canonical 253 · authored row 0 · easy deprecated 0 · **write 0** ✅ |
| oromucosal-unit-1 14 master | easy canonical 14 · authored row 0 · easy deprecated 0 · **write 0** ✅ |
| 기존 V1/V2 LIVE | 이번 WO audit 이 대상 327 master 밖을 변경한 건수 **0** ✅ |
| topical 실측 write | **1,962T** (audit 327 + demote 327 + insert 654 + flip 654) ✅ |

## 8. 정정 1건 (데이터 이상 아님)

- **증상:** track-verify 초회 실행에서 `officialSixSectionsMismatch=110` (효능·효과/용법·용량 헤딩 누락).
- **원인:** 검증기가 6섹션 전부에 **공식 라벨 헤딩**을 요구했다. composer 계약은 안전 4섹션(경고·사용상 주의사항·이상반응·상호작용)만 공식 라벨을 유지하고, 효능·효과/용법·용량은 `한눈에 보기`/`사용 안내` 로 **소비자 친화 재구성**한다(CLAUDE.md 콘텐츠 작성 불변 원칙 — 원문 효능·용법·금기·주의를 보존하되 제목·구조는 재구성 허용).
- **판정:** 검증기 오류. 계약축(안전 = 헤딩 존재, 효능·용법 = 원문 수치 전량 잔존)으로 정정 후 안전 116/116 · 수치 130/130 · mismatch 0 PASS. **DB 데이터 변경 없음.**

## 9. 상태 기록

- `otc-ready-na-v3/green-topical-unit-1.json` — topical-unit-1 = **GREEN**
- `otc-ready-na-v3/unblocked-ophthalmic-unit-1.json` — ophthalmic-unit-1 = **UNBLOCKED**
  (UNBLOCKED = 선행 unit 의존 해소. **LIVE apply 승인 아님** — 별도 readiness/production WO 필요.)
- 승인 SSOT(`00851d237`) · V3 unit ledger · readiness 산출물(`bb2e79a22`) · 기존 GREEN 파일 **미수정**. 실행 상태만 신규 파일로 기록.

**route 원장:** oral COMPLETE(540m / 3,240T) · **topical COMPLETE(327m / 1,962T)** · ophthalmic UNBLOCKED(253m) · oromucosal PRE_APPLY_READY(14m / 84T).

> 참고: da 트랙 검증기 `otc-easy-drug-ready-oral-v3-track-verify.da.ts` §D 는 "타 route 미착수(authored ko canonical 0)"를 불변식으로 못박아 두었으므로, topical GREEN 이후 재실행하면 §D 가 fail 한다. 이는 **설계상 예상된 stale 조건**이며 oral 데이터 이상이 아니다(oral 축 A/B/C 는 본 CHECK §7 에서 전량 재확인).

## 10. Git 안전

자기 산출물만 path-specific commit(`git commit -- <pathspec>`). broad `git add` / `git add .` 미사용 · reset/clean/stash/amend/rebase/force-push 미사용 · 타 세션 staged 파일 미포함 · `pnpm-lock.yaml` · `.env` · 타 세션 파일 미접촉.
