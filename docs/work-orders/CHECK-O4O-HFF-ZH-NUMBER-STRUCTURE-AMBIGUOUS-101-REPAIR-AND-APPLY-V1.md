# CHECK-O4O-HFF-ZH-NUMBER-STRUCTURE-AMBIGUOUS-101-REPAIR-AND-APPLY-V1

> ZH 최종 문제 큐의 `NUMBER_STRUCTURE_AMBIGUOUS` 101건 전수 분석·교정·생산 결과.
> 대상 WO: `WO-O4O-HFF-ZH-NUMBER-STRUCTURE-AMBIGUOUS-101-REPAIR-AND-APPLY-V1`
> 기준 commit: `c0e080734` · 착수 HEAD: `c0e080734` (작업 중 타 세션 commit 진행 → 커밋 시점 HEAD `1831969a7`, 경로 충돌 0)

---

## §1 착수 상태

| 항목 | 값 |
|------|-----|
| 작업 트리 | clean (`git status --short` 빈 출력) |
| 브랜치 | `main` |
| 착수 HEAD | `c0e080734` = 기준 commit (`git merge-base --is-ancestor` true) |
| 기준 수치 | KO 40,918 / EN 40,902 / ZH 40,498 / 통합 문제 큐 420 |

---

## §2 모집단 재현 (§3)

`hff-zh-nsa-scan.mjs` — 큐 `issueType=NUMBER_STRUCTURE_AMBIGUOUS` → KO canonical 존재 · ZH canonical 부재로 DB 재현.

| 항목 | 값 |
|------|-----|
| 큐 총계 / NSA | 420 / 101 |
| 재현된 모집단 | **101** (요구치 일치) |
| ProductMaster 중복 | 0 |
| koCanonicalId 중복 | 0 |

---

## §3 원인 분석 (§4)

교정 전 전량이 `NUMBER_DRIFT` 였고, 유실 토큰 상위는 전부 **소수**였다.

| 유실 토큰 | 건수 |
|-----------|-----:|
| `1.5g` | 75 |
| `0.35g` | 24 |
| `2.5g` | 24 |
| `0.4g` | 18 |
| `0.45g` | 13 |
| `0.5g` | 8 |
| `TIMES1` (빈도) | 3 |

**근본 원인 = 공용 토큰화 결함 1건.** 항목 번호 접두 인식기 `MARK_HEAD` 에 "구분자 뒤에 숫자가 오면 소수"라는 가드가 없어,
`0.5g당 10억 CFU 이상` 의 `0.` 을 항목 번호로 떼어냈다 → `0.` + `每5g10亿 CFU以上` 로 수치가 통째로 손상.
같은 파일의 `MARK_LEAD` 에는 이미 `(?!\d)` 가드가 있어 결함이 한쪽에만 남아 있었다.

## §4 교정 내용 (§4 우선순위 순)

1. **검증기·토큰화 오탐 수정** — `hff-zh-b01-translate.mjs` `MARK_HEAD` 에 `(?!\d)` 가드 추가.
   → 101건 중 **50건 즉시 해소**(수치 게이트 통과).
2. **모호 케이스 정밀화** — `1.1일 3회 … 2. …` 처럼 소수처럼 보이지만 실제로는 항목 번호인 표기를 위해
   `markHead()` 도입: 숫자가 뒤따르는 구분자는 **형제 마커(`n+1.`)가 있거나 뒤가 `N일 M회` 빈도**일 때만 마커로 인정.
   (`1.5일분` 같은 실제 소수를 마커로 오인하지 않도록 빈도는 일·회 두 축이 함께 있을 때만 인정)
3. **번역 자산 교정 — 직접 번역** — 남은 51건의 미해결 조각 **67개 전량**을 직접 번역해
   `data/hff-zh-b04-z82-translations-v1.json` 신설(로더 범위 `b04z1..120` 안, 로더 변경 없음).
   내역: 표시 기준량·1회 섭취량 intro 13종 / 보관 문구 16종 / 성상 문구 11종 / 드롭·방울 용량 표기 10종 /
   빈도·섭취 방법 meta 3종 / 표시량 규격 2종 / 기타 문구 12종.
4. **잔여 한글 3건** — 색상·제형 복합 표기와 `1일 1회 1회 5방울(0.155ml)` 을 문서별 직접 번역으로 해소.
5. **HOLD 0** — 자산 부족·효율을 이유로 한 보류는 없다.

최종 재스캔: `documents 101 / alreadyClean 101 / blockedDocuments 0 / atomCount 0`.

## §5 공용 로직 회귀 감사 (§4 마지막 문단)

`MARK_HEAD` 는 HFF EN/ZH 공용이므로 기존 ZH canonical 40,498건을 전수 감사했다
(`hff-zh-nsa-markhead-regress.mjs`, read-only). 수치 게이트는 **단위가 붙은 수치만** 보므로
단위 없는 소수(`1.5배`)는 잡히지 않는다 → KO 텍스트 노드가 소수로 시작하는 문서를 후보로 좁혀 대조.

| 항목 | 값 |
|------|-----|
| ZH canonical 총계 | 40,498 |
| 후보 문서 | 4,787 |
| 항목 번호(소수 아님)로 판정 | 7 |
| **손상 문서** | **0** |
| 판정 | **PASS** |

7건은 `1.1일 2회 …`(= 항목 `1.` + `1일 2회`) 형태로, 기존 ZH 산출물도 `1.每日2次…` 로 정상이었다.

---

## §6 렌더 검증 (§7)

`hff-zh-final-render.mjs` (`ZH_LIMIT_IDS` 로 모집단을 101 로 고정, `ZH_OUT_TAG=nsa`).

| 항목 | 값 |
|------|-----|
| 대상 / 생산 후보 | 101 / 101 |
| 미생산 | 0 |
| 렌더 문서 / 렌더 수 | 100 (구조 시그니처 전수) / 300 (430·820·1280) |
| structureParity · pageOverflow · elementOverflow · clipped | 0 · 0 · 0 · 0 |
| emptyH2 · emptyUl · emptyLi | 0 · 0 · 0 |
| undefinedClass · rawHtml · hangulVisible · markerVisible | 0 · 0 · 0 · 0 |
| labelLost · licenseNoLost · canonicalDup | 0 · 0 · 0 |
| 판정 | **PASS** |

## §7 Apply (이중 게이트)

`hff-zh-final-apply.mjs --apply` + `HFF_ZH_FINAL_APPLY_CONFIRM=YES`.

| 항목 | before | after |
|------|-------:|------:|
| ZH canonical | 40,498 | **40,599** |
| KO canonical | 40,918 | 40,918 |
| EN canonical | 40,902 | 40,902 |
| ProductMaster(HFF) | 40,948 | 40,948 |
| spd 전체 | 208,167 | 208,268 |

`expectedInsert 101 = inserted 101` · skipped 0 · failedShards 0 · `expectedEqualsActual: true`
CREATED 101 / UPDATED 0 / HOLD 0 / FAILED 0.

## §8 독립검증 (read-only, DB 현재 상태만)

`hff-zh-nsa-verify.mjs`

| 항목 | 값 |
|------|-----|
| 대상 합계 / ZH row | 101 / 101 |
| 계약 위반 | 0 |
| KO 해시 drift | 0 |
| ProductMaster 변경 | 없음 |
| ZH 증가량 | +101 (일치) |
| canonical 중복 | 0 |
| 수치·단위 drift | 0 |
| 슬롯 한국어 잔존 | 0 |
| raw HTML · marker 잔존 · 빈 section | 0 · 0 · 0 |
| Batch 밖 write | 0 |
| 큐 회계 (420 − 101 = 319) | 일치 |
| 큐 중복 · 대상 잔존 | 0 · 0 |
| 판정 | **PASS** |

## §9 문제 큐 재분류 (§6)

| 구분 | before | after |
|------|-------:|------:|
| `NUMBER_STRUCTURE_AMBIGUOUS` | 101 | **0** |
| `TRANSLATION_AMBIGUOUS` | 319 | 319 |
| 합계 | 420 | **319** |

기준 스냅샷: `data/hff-zh-deferred-issue-queue-through-nsa-base-v1.jsonl` (420)
현행 통합 큐: `data/hff-zh-deferred-issue-queue-through-final-v1.jsonl` (319)

## §10 최종 상태

| 항목 | 값 |
|------|-----|
| KO canonical | 40,918 (불변) |
| EN canonical | 40,902 (불변) |
| **ZH canonical** | **40,599** |
| NSA 잔여 | **0** |
| 통합 문제 큐 | 319 (전량 `TRANSLATION_AMBIGUOUS`) |
| 프록시 | 종료 (포트 5463) |
| commit | `07391e6ee` (path-specific, 21 files) |
| push | `1831969a7..07391e6ee main -> main` 완료 |

### 산출물

- 엔진: `apps/api-server/src/scripts/hff-zh-b01-translate.mjs` (`MARK_HEAD` 가드 + `markHead()`)
- 번역 라운드: `apps/api-server/src/scripts/data/hff-zh-b04-z82-translations-v1.json`
- 조사·검증기: `hff-zh-nsa-scan.mjs` · `hff-zh-nsa-atoms.mjs` · `hff-zh-nsa-markhead-regress.mjs` · `hff-zh-nsa-verify.mjs`
- 산출 데이터: `hff-zh-nsa-{scan,atoms,markhead-regress,safe-targets,render-audit,apply-result,verify}-v1.json`
