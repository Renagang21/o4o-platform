# CHECK — WO-O4O-HFF-ZH-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1

- 대상: 건강기능식품(HFF) 매장 설명서 **중국어(ZH) canonical 신규 10,000건**
- 기준 커밋: `3f27daff2` (조상 관계 확인 완료) · 착수 HEAD: `585fe50a8`
- 환경: 프로덕션 Cloud SQL (`o4o-platform-db` / `o4o_platform`), Cloud SQL Auth Proxy v2 포트 **5463** (이번 세션 기동분만 종료)
- 원본 기준: **KO STORE canonical 직접 번역**. 영어 설명서는 어떤 단계에서도 원문으로 쓰지 않았다.
- 언어 코드: 저장소 계약대로 **`zh` 단일 코드**만 사용 (`zh-CN` / `zh-Hans` 혼용 없음)

---

## 1. 모집단 게이트 (§3)

| 항목 | 값 |
|---|---:|
| HFF STORE/ko canonical (ZH 부재) 풀 | 40,918 |
| 기존 ZH canonical | **0** |
| 정상 생산 가능 후보 | 10,933 |
| Batch 01 대상 확정 | **10,000** |
| ProductMaster·koCanonicalId 중복 | 0 / 0 |
| canonicalDup | 0 |

후보가 10,000 이상임을 확인한 뒤에만 Apply 로 진행했다. 미달 시 중지 조건은 발동하지 않았다.

배치에 포함하지 않은 29,985건 사유: `UNRESOLVED` 29,694 / `NUMBER_DRIFT` 275 / `HANGUL_REMAINS` 16 — 모두 이번 배치에서 **생산하지 않은 것**이며 HOLD 로 마감한 건은 없다.

---

## 2. 생산 (§4)

KO canonical HTML 을 템플릿으로 두고 **텍스트 슬롯만 치환**한다. renderer family·절 수·원료 귀속 순서·수치·단위·괄호 용량은 구조상 승계된다.
문구 자산은 재사용을 우선하고, 없는 문장은 제품 문맥에 맞춰 신규 번역했다.

```
survey → extract → plan → translate(z1~z9) → build → render audit(worker) → apply(--apply + CONFIRM) → verify
```

`ASSET_MISSING` · `NO_ENTRY` · `TEMPLATE_UNSUPPORTED` · `LOW_EFFICIENCY` · `PENDING_DIRECT_TRANSLATION` 은 최종 원장에 **한 건도 없다**.

---

## 3. 렌더 감사 (§7)

| 항목 | 값 |
|---|---:|
| 렌더 문서 | 5,474 (structure signature 429 전수 + 고위험 전수) |
| 렌더 횟수 (430 / 820 / 1280px) | 16,422 |
| structureParity / pageOverflow / elementOverflow / clipped | 0 / 0 / 0 / 0 |
| emptyH2 / emptyUl / emptyLi | 0 / 0 / 0 |
| undefinedClass / rawHtml / markerVisible | 0 / 0 / 0 |
| hangulVisible / labelLost / licenseNoLost | 0 / 0 / 0 |
| **verdict** | **PASS** |

JSDOM 이 인스턴스 간 힙을 붙들어 8GB·12GB 에서 연속 OOM 이 났다. 렌더를 **자식 프로세스 400문서 단위(동시 4)** 로 분리해 프로세스 종료로 메모리를 회수하도록 바꿨다(`hff-zh-b01-render-worker.mjs`). 감사 항목·판정 기준은 동일하다.

---

## 4. Apply (§7)

INSERT 전용, 이중 게이트(`--apply` + `HFF_ZH_B01_APPLY_CONFIRM=YES`), 렌더 PASS 선행 조건, 롤백 매니페스트 선기록, row 단위 KO sha256 낙관적 잠금(`KO_DRIFT`) + ZH 중복 가드(`ZH_EXISTS`).

| 항목 | 값 |
|---|---:|
| expected insert | 10,000 |
| **CREATED** | **10,000** |
| UPDATED / NO_CHANGE / HOLD / FAILED | 0 / 0 / 0 / 0 |
| skipped / failedShards | 0 / 0 |
| `expectedEqualsActual` | ✅ true |

| 전역 | before | after |
|---|---:|---:|
| shared_product_descriptions 전체 | 146,816 | 156,816 |
| KO canonical | 40,918 | **40,918** |
| EN canonical | 40,902 | **40,902** |
| ZH canonical | 0 | **10,000** |
| HFF ProductMaster | 40,948 | **40,948** |

---

## 5. 독립 검증 (§8)

| 기준 | 결과 |
|---|---|
| Batch 합계 10,000 | ✅ 10,000 |
| 계약 위반 (contractViolations) | 0 |
| 저장 내용 ≠ 검증 통과본 (contentMismatch) | 0 |
| 번역 슬롯 한국어 잔존 | 0 |
| 수치·단위 drift | **0** |
| KO hash drift / KO·EN·PM 불변 | 0 / ✅ ✅ ✅ |
| ZH 증가량 = INSERT 건수 | ✅ 10,000 |
| canonicalDup | 0 |
| Batch 밖 write | 0 |
| 문제 큐 누락 필드 / 중복 | 0 / 0 |
| **verdict** | **PASS** |

`dbWrites: 0` (read-only 트랜잭션 강제).

### 5-1. 수치 검증기 교정 3건

검증 FAIL 로 잡힌 건은 모두 **저장된 중국어 본문에 수치가 살아 있는데 토크나이저가 못 읽은 경우**였다. DB 내용은 수정하지 않고 비교기만 교정했다.

1. **8,839건** — 검증이 중국어 본문을 KO 전용 토크나이저로 읽어 `每日`·`次`·`袋` 를 단위로 인식하지 못했다. 생산 단계와 같은 KO↔ZH 대응 비교기(`lostNums`)로 통일.
2. **675건** — `비타민B12   정상적인` 이 `12정` 으로 잡혔다. 기호 단위(`500 mg`, 띄어쓰기 허용)와 한국어·중국어 단어 단위(`2정`·`2片`, 붙여쓰기)를 분리하고 숫자 앞 영문·숫자 lookbehind 추가.
3. **164 + 11건** — ① `每2000mg100亿 CFU` 처럼 단위 뒤에 수치가 바로 붙으면 앞 글자가 라틴 문자라 성분 코드로 오인됐다(단위로 닫힌 자리 뒤 경계 삽입). ② 배수 접미사가 없는데도 공백을 삼켜 `포스파티딜세린 365` + `포…` 가 `365포` 로 잡혔다(공백은 배수 접미사가 실제 있을 때만 허용). ③ 제품명은 한국어를 유지하므로 중국어 본문에 남은 `딥트3일` 을 한쪽에서만 세고 있었다(중국어 측에서도 한국어 표기 빈도 축 계수).

최종 `numberDrift 0`.

---

## 6. 문제 큐 (§6)

파일: `apps/api-server/src/scripts/data/hff-zh-deferred-issue-queue-through-batch01-v1.jsonl` (+ `-summary-v1.json`)

| 유형 | 건수 |
|---|---:|
| `NUMBER_STRUCTURE_AMBIGUOUS` | 351 |
| `TRANSLATION_AMBIGUOUS` | 28 |
| **합계** | **379** |

`TRANSLATION_AMBIGUOUS` 28 = 렌더 단계 16 + 원어 병기 중복 12(`罗沙维（Rosavin）(Rosavin)` 형태, 10,000건 전수 스캔). 후자는 수치·귀속·계약에는 영향이 없는 표기 중복이므로 본문을 고치지 않고 큐로 이관했다.

이번 작업에서 **KO canonical 은 한 건도 수정하지 않았다.**

---

## 7. 남은 작업

| 항목 | 값 |
|---|---:|
| HFF KO canonical | 40,918 |
| ZH canonical 생산 완료 | 10,000 |
| **남은 중국어 미생산** | **30,918** |

---

## 8. 마감

- 자격증명은 실행 시점 인라인으로만 주입하고 즉시 해제했다. 코드·JSON·JSONL·CHECK·로그·명령 인자 어디에도 남기지 않았다.
- 임시 조사 스크립트(`*.tmp.mjs`)는 전량 삭제했다.
- KO canonical · ProductMaster · candidate · 영어 및 다른 언어는 수정하지 않았다.
- 다른 세션 WIP 와 `pnpm-lock.yaml` 은 건드리지 않았다.
- 이번 세션에서 기동한 Cloud SQL Auth Proxy(포트 5463)만 종료했다.
