# CHECK — WO-O4O-HFF-ZH-ALL-REMAINING-10414-DIRECT-BULK-PRODUCTION-AND-TRACK-CLOSURE-V1

- 대상: 건강기능식품(HFF) 매장 설명서 **중국어(zh) canonical**, 문제 큐를 제외한 **정상 잔여 전량**
- 기준 commit: `c642af0bd` (`git merge-base --is-ancestor` = true) · 착수 HEAD: `5a6c3d5aa` (branch `main`)
- 환경: 프로덕션 Cloud SQL (`o4o-platform-db` / `o4o_platform`), Cloud SQL Auth Proxy v2 **포트 5463** (이번 세션 기동분만 종료)
- 착수 시 작업 트리는 이번 트랙 산출물 외 clean, 타 세션 WIP 미접촉
- **고정 10,000 게이트 폐기(§1)** — 모집단은 "정상 생산 가능 잔여 전량"으로 재정의했다

---

## 1. 모집단 (§1·§3)

| 항목 | 값 |
|---|---:|
| 착수 시 ZH STORE canonical | 30,000 |
| KO STORE canonical 존재 · ZH 부재 | **10,918** |
| 승계 문제 큐(batch03 기준) 제외 | −504 (풀 기준) |
| **1차 패스 모집단** | **10,414** (전량) |
| 2차 패스 — 승계 큐 재판정 후 생산 가능 확인분 | **84** |
| **최종 생산 합계** | **10,498** |
| ProductMaster 중복 / canonicalDup | 0 / 0 |

1차 패스는 문제 큐를 제외한 정상 잔여 **전량 10,414건**을 대상으로 했고, 절단·표본 추출은 없다.
2차 패스는 §7 "정상 생산 가능 잔여 0" 을 충족시키기 위해, 누적된 저작 자산으로 **승계 큐 전체를 다시 판정**해 이제 정상 생산이 가능해진 84건을 마저 생산한 것이다.

---

## 2. 생산 (§4)

KO canonical HTML 을 템플릿으로 두고 **텍스트 슬롯만** 중국어로 치환한다. 구조(태그·class·순서)를 바꾸지 않으므로 renderer family 가 그대로 승계된다. **EN canonical 은 기준본으로 사용하지 않았다.**

```
final-extract / plan / measure2 (미해소 조각 산정)
→ 저작 라운드 b04-z1 ~ z81 (직접 번역)
→ final-render (생성 + 렌더검증 + 모집단 확정) → final-apply (이중 게이트) → final-verify
→ (2차) ZH_QUEUE_RETRY=1 재판정 → render → apply → verify
```

| 항목 | 값 |
|---|---:|
| 직접 번역 라운드 파일 | **81** (`hff-zh-b04-z1 … z81`) |
| 신규 번역 문구(항목 기준) | **16,052** (고유 16,030) |
| 직접 번역이 반영된 문서 | 10,498 |

기존 승인 자산·용어집을 재사용하고, 사전에 없는 문구는 **자산 부재를 이유로 보류하지 않고 직접 번역**했다(§4). 기능성·섭취방법·주의사항·기준규격은 원문 순서대로 옮겼으며, 원료 귀속·개별인정번호·수치·단위·괄호 용량은 슬롯 치환 구조상 그대로 승계된다.

금지 HOLD 사유(`ASSET_MISSING` / `NO_ENTRY` / `TEMPLATE_UNSUPPORTED` / `LOW_EFFICIENCY` / `PENDING_DIRECT_TRANSLATION`)는 최종 원장에 **한 건도 없다**.

### 2-1. 생산·검증 중 확정한 교정

| # | 증상 | 원인 | 조치 |
|---|---|---|---|
| 1 | 라운드 사전이 다른 문서의 열거 기호를 오염 | `key()` 가 열거 marker 를 제거해 문서 간 문구가 같은 키로 합쳐짐 | `alignMarks()` + 슬롯 단위 `circled()` 재부여 (`kind !== 'spec'`) |
| 2 | 렌더 `rawHtml: 3` (`화진글루코사민골드` 등) | KO 가 항목 기호를 `&gt;` 엔티티로 보관하는데 슬롯 치환이 맨 `>` 로 되돌림 (10,414 중 8건) | `hff-zh-b01-build.mjs` 에 `esc()` 추가해 KO 의 엔티티 표기를 그대로 승계 |
| 3 | 위 검사기가 정상 텍스트 `>` 를 raw HTML 로 오판 | 규칙이 모든 `&gt;` 를 태그 유출로 간주 | 태그 모양(`&lt;b`, `&gt;&lt;`, `<b`)만 잡도록 축소 |
| 4 | 독립검증 `numberDrift: 1` (오탐) | 검증기가 태그를 공백으로 지워 `350-450` 과 다음 블록의 `L-이소로이신` 이 `450L`(리터)로 붙음 | 블록 경계를 단위로 읽히지 않는 구분자(` | `)로 치환 |
| 5 | 재판정 패스에서 문제 큐 420 → 259 로 유실 | 큐 기록 분기가 `NUMBER_DRIFT` 와 "한글만 잔존" 두 경우만 다뤄, 그 외 miss 문서가 큐에서 누락 | 수치 문제로 이미 기록한 경우를 제외한 **모든** 미확정 문서를 큐에 기록 |

---

## 3. 핵심 검증 (§6)

| 게이트 | 결과 |
|---|---|
| 번역 슬롯 한국어 0 (`<h1>` 제품명·법인명 제외) | **0** |
| 기능성·수치·단위·조건 drift 0 | **0** |
| 제품·원료 혼입 0 | 0 (슬롯 치환 구조상 문서 경계 유지) |
| 빈 section / 빈 `<ul>` / 빈 `<li>` | 0 / 0 / 0 |
| raw HTML · marker 노출 | 0 / 0 |
| canonicalDup | **0** |

---

## 4. 렌더·Apply (§6)

렌더 검증은 **430 · 820 · 1280px** 3폭에서 공유 렌더러(`ContentRenderer`)의 실제 CSS 로 수행했다.

| 패스 | 대상 | 렌더 문서 | 구조 시그니처 | 렌더 수 | totalIssues | 판정 |
|---|---:|---:|---:|---:|---:|---|
| 1차 | 10,414 | 4,209 | 644 | 12,627 | 0 | **PASS** |
| 2차 | 84 | 65 | 46 | 195 | 0 | **PASS** |

카운터(structureParity / pageOverflow / elementOverflow / clipped / emptyH2 / emptyUl / emptyLi / undefinedClass / rawHtml / hangulVisible / markerVisible / labelLost / licenseNoLost)는 두 패스 모두 **전부 0**.

Apply 는 `--apply` + `HFF_ZH_FINAL_APPLY_CONFIRM=YES` **이중 게이트**로 실행했고, 사전에 rollback manifest(soft-delete 계약)를 기록했다.

| 패스 | expected | inserted | skipped | failedShards | expected = actual |
|---|---:|---:|---:|---:|:--:|
| 1차 | 10,414 | 10,414 | 0 | 0 | ✅ |
| 2차 | 84 | 84 | 0 | 0 | ✅ |

ZH canonical: **30,000 → 40,414 → 40,498**. `shared_product_descriptions` 전체: 197,669 → 208,167 (+10,498, 삭제·수정 0).

---

## 5. 독립검증 (§7)

apply 산출물을 신뢰하지 않고 **DB 현재 상태만** 읽어 재계산했다(read-only, `SET default_transaction_read_only = on`).

| 항목 | 1차(10,414) | 2차(84) | 전량 재검증(10,498) |
|---|---|---|---|
| 모집단 재현 | 10,414 = 10,414 ✅ | 84 = 84 ✅ | 10,498 = 10,498 ✅ |
| 저장 계약 위반 (`zh`/`STORE`/`canonical`/`o4o_hff_generated`) | 0 | 0 | **0** |
| 본문 byte 일치 | 0 불일치 | 0 불일치 | — |
| 번역 슬롯 한국어 | 0 | 0 | **0** |
| 수치·단위 drift | 0 (수정된 비교기 기준) | 0 | **0** |
| KO canonical hash drift | 0 | 0 | — |
| KO / EN / ProductMaster 불변 | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ |
| ZH 증가량 일치 | +10,414 ✅ | +84 ✅ | +10,498 ✅ |
| canonicalDup | 0 | 0 | **0** |
| Batch 밖 write | 0 | 0 | — |
| 문제 큐 중복 / 필드 누락 | 0 / 0 | 0 / 0 | — |
| **정상 생산 가능 잔여** | 84 → 재판정·생산 | **0** | **0** |

1차 패스 검증은 수치 비교기 교정 전에 실행돼 오탐 1건(`450l`)과 잔여 생산 가능 84건이 잡혔다. 두 원인을 각각 교정·생산한 뒤, **두 패스 10,498건 전량을 하나로 묶어 재검증**해 `verdict: PASS` 를 확인했다(`hff-zh-final-verify-all-v1.json`).

---

## 6. 문제 큐 (§5)

최종 통합 큐는 **DB 현재 상태 기준으로 재판정**해 작성했다 — ZH 가 없는 문서 420건이 곧 큐 420건이며, 승계·신규가 어긋날 여지가 없다.

| 항목 | 값 |
|---|---:|
| 승계 후보(batch03 큐) | 517 |
| 재판정으로 **해소** | **84** |
| 최종 큐 | **420** (고유 ProductMaster 420) |
| `NUMBER_STRUCTURE_AMBIGUOUS` | 101 |
| `TRANSLATION_AMBIGUOUS` | 319 |
| 중복 / 필드 누락 | 0 / 0 |

`ZH 없는 KO canonical 420` = `큐 420` — **정상 생산 가능 잔여 0** 이 DB 재계산으로 확인된다. KO canonical 은 한 건도 수정하지 않았다(§5).

---

## 7. 누적 현황

| 언어 | canonical 수 |
|---|---:|
| KO (HFF STORE) | 40,918 |
| EN (HFF STORE) | 40,902 |
| **ZH (HFF STORE)** | **40,498** |

ZH 진행: Batch 01 10,000 → 02 20,000 → 03 30,000 → **최종 40,498**. 남은 420건은 전부 번역 판단이 서지 않아 큐에 기록된 문서이며, 현재 자산으로 정상 생산 가능한 문서는 없다. → **HFF 중국어 생산 트랙 마감**.

---

## 8. 산출물

| 파일 | 내용 |
|---|---|
| `data/hff-zh-b04-z1 … z81-translations-v1.json` | 직접 번역 라운드 자산 81개 (16,052 문구) |
| `data/hff-zh-final-safe-targets-v1.json` | 2차 패스 확정 대상 |
| `data/hff-zh-final-render-audit-v1.json` | 렌더 감사(2차, PASS) |
| `data/hff-zh-final-apply-result-pass1-v1.json` / `-apply-result-v1.json` | Apply 원장 (10,414 / 84) |
| `data/hff-zh-final-rollback-pass1-v1.json` / `-rollback-v1.json` | rollback manifest |
| `data/hff-zh-final-verify-v1.json` / `-verify-all-v1.json` | 독립검증 (2차 / 전량) |
| `data/hff-zh-deferred-issue-queue-through-final-v1.jsonl` (+ `-summary`) | 통합 문제 큐 420 |
| `hff-zh-b01-{build,render-worker,translate}.mjs` | 생산 엔진 (교정 반영) |
| `hff-zh-final-{render,apply,verify,verify-all,residual}.mjs` | 최종 패스 실행·검증 스크립트 |

---

## 9. 안전 계약 준수

- 프로덕션 write 는 승인된 Apply 2회뿐 — 그 외 모든 스크립트는 `SET default_transaction_read_only = on` (미적용 시 `NOT_READ_ONLY` 로 중단)
- KO canonical · EN canonical · ProductMaster **불변** (독립검증 확인)
- soft-delete rollback manifest 를 Apply **이전에** 기록
- 자격증명은 실행 시점 환경변수로만 주입하고 즉시 해제 — 코드·JSON·로그·Git diff·명령 인자에 **미기록**
- `git add .` 미사용 · path-specific add/commit · `pnpm-lock.yaml` 미포함 · 타 세션 WIP 미접촉
- Cloud SQL Auth Proxy(포트 5463)는 이번 세션 기동분만 종료
