# CHECK — WO-O4O-OTC-EASY-DRUG-V4-REMAINING-NORMAL-ALL-FINAL-PRODUCTION-V1

정상 생산 가능 잔여 **전량** LIVE 생산 완료

- 선행 commit: `26066d767`
- batchId: `otc-v4-finalall`
- write owner: agent-ga 정본 러너 단독 (다른 에이전트 LIVE write 0)
- 실행 채널: Cloud SQL Auth Proxy v2 (토큰 만료 시 새 포트 재기동 · 러너 멱등이라 손실 0)

---

## 1. 선정

`otc-v4-finalall-select.ga.ts` — LIVE DB + agent-la 확립 분류 원장 기준, 결정론적.

모집단은 **재도출하지 않았다**(분모 정의 발산 방지):
ga-ready 2,496 ∪ na-exception 1,047 − pilot100 100 − pilot500 500 − next2000 2,000 − exclude 266 − 누적예외 142 = **943 후보**

| 항목 | 값 |
|---|---|
| 후보 | 943 |
| **선정** | **388** (정상 생산 가능 전량) |
| 선정 정책 | 수량 상한 없음 · oral 상한 없음 · 사전 예외 채움 없음 |
| route | oral 388 |
| 재현성 | **2회 실행 byte-identical** (prep `e7044e86…` / source `d266a272…` / ledger `d37f913a…`) |
| 교집합 | 선행 배치 0 · EXCLUDE 0 · 누적예외 142 와 0 |
| SYSTEM STOP | 없음 |

**선정 제외 555건** (사유별, 전건 `excludedDetail` 기록):

| 사유 | 건수 |
|---|---|
| ROUTE_UNRESOLVED | 420 |
| ROUTE_CONFLICT | 135 |

선정 원장은 `otc-v4-finalall-selection-ledger.run-20260730FINAL.ga.json` 로 동결(불변).

> 전량 oral 인 것은 정상이다. 비경구(topical/ophthalmic/vaginal/oromucosal) 생산 가능분은 next2000 에서 이미 전량 소진됐다.

---

## 2. 저작

| 단계 | 결과 |
|---|---|
| KO 저작 | **388 / 388**, blocked 0 |
| EN 번역메모리 | **1,059 / 1,059** — 기존 검증본에서 **1,025 자동 승계(97%)**(next2000 984 · pilot500 31 · pilot100 10), 신규 34 |
| EN 조립 | **388 / 388**, blocked 0 |
| TM 병합 반려 | **0** |
| route 가드 면제 | 0 (전량 oral) |

### 번역 서브에이전트 실패와 대응

신규 34문장 번역을 위임한 서브에이전트가 **API 529(Overloaded)** 로 중단됐다.
34문장 규모라 재시도 대기 대신 **이 세션에서 직접 번역**했다.

- key 는 shard 파일에서 **인덱스로 프로그램 복사** → byte-identical 보장(수기 입력 0)
- 수치 양방향 대조 · 한글 잔존 검사 자체검증 통과 후 병합 (반려 0)
- LIVE write 는 여전히 이 세션 단독 — write-owner 계약 불변

---

## 3. 생산 (LIVE)

| 항목 | 값 |
|---|---|
| target / processed | 388 / **388** (중단 0) |
| GREEN | **388** |
| EXCEPTION | **0** |
| SKIP | 0 |
| koWrite / enWrite / 총 write | 1,552 / 776 / **2,328 T** |
| expectedWrite | 2,328 (**정확 일치**) |
| checkpoint | 4회 (100건 주기) |
| failedMasterResidueDirty | **0** |

**rollback-test**(50건): TX 진입 후 전량 롤백 · 예외 0 · residue 0 · write 0.
**재실행 멱등**: SKIP **388** · 신규 GREEN 0 · 신규 write **0**.

결과 원장은 run별 불변 파일로 기록(무접미는 편의 사본).

---

## 4. 독립검증 — **24 / 24 PASS**

executor 로직 미import · 별개 섹션 파서 · 별개 수치 정규식 · 별개 검증 SQL · `REPEATABLE READ READ ONLY`.

| 게이트 | 결과 |
|---|---|
| 입력 수 = GREEN+EXCEPTION+SKIP | 388 = 388+0+0 |
| master 중복 | 0 |
| 성공 master KO/EN canonical 각 1 | 위반 0 |
| easy ko canonical 잔존 | 위반 0 |
| 실패 master residue | 0 (실패 없음) |
| 공식 6섹션 내용 보존 | 미달 0 — 커버리지 **최저 1.0 / 중앙값 1.0** (2,018 섹션) |
| 수치 / 연령 / 기간 누락 | 0 / 0 / 0 |
| EN 한글 잔존 | 0 |
| route 표현 오류 | 0 |
| canonicalDup | 0 |
| sourceRef 타 master 누수 | 0 |
| 대상 밖 audit | 0 |
| GREEN master audit 정확히 1 | 위반 0 |
| **선행 GREEN 2,458 불변** | **변경 0 / 소실 0** |
| 대상 밖 내 source_type canonical 불변 | 확인 |
| 선행 배치 교집합 | 0 |
| write 총량 = GREEN×6 | 2,328 |

apply 전 기준선에 선행 GREEN **2,458건 전체의 해시 4,916행**을 스냅샷해 사후 주장이 아닌 실측 대조로 판정했다.

---

## 5. 시스템 중지 조건

SYS-01~SYS-17 **미발동**.

SYS-12(다른 세션 LIVE write 감지)는 선행 WO 에서 사용자가 귀속 기반 판정으로 충족 처리한 기준을 유지했다.
본 배치에서도 대상 밖 내 source_type canonical 불변 · sourceRef 누수 0 · 대상 밖 audit 0 으로 귀속 오염이 없음을 확인했다.

---

## 6. 종료 후 상태

| 항목 | 값 |
|---|---|
| 신규 GREEN | **388** |
| 신규 예외 | **0** |
| 누적 V4 GREEN | **2,846** (100:80 + 500:416 + 2000:1,962 + finalall:388) |
| 공식 미완료 | **963** (= 1,351 − 388) |
| agent-na 통합 대상 | **697** (생산 예외 142 + 선정 제외 555) |

DB 실측 교차 확인:
- V4 authored canonical **ko 15,278 / en 15,278**
- batch별 audit: pilot-100 80 · pilot-500 416 · next2000 1,962 · finalall 388 (**합 2,846, 원장과 정확 일치**)
- easy canonical 잔존 master **983** — census A축 미완료 963 과 20 차이. 이는 reconciliation 이 이미 기록한 위생 지표 차이(완료·비-OTC master 의 잔존 easy 행)이며 생산 대상이 아니다.

### 원인별 분포 (agent-na 인계)

**생산 예외 142** (17필드 스키마 완비 · 전건 `dbWriteActual=0`)

| 그룹 | 코드 | 건수 |
|---|---|---|
| route | ROUTE_CONFLICT | 62 |
| route | ROUTE_UNRESOLVED | 56 |
| source | SOURCE_EFFICACY_MISSING | 24 |

재투입 가능 118 / terminal(원문 부재) 24

**선정 제외 555** (생산 미투입 · DB write 0)

| 사유 | 건수 |
|---|---|
| ROUTE_UNRESOLVED | 420 |
| ROUTE_CONFLICT | 135 |

> 선정 제외분은 생산 예외 원장에 없어 agent-na 가 놓칠 수 있으므로 인계 원장의 `selectionExcluded` 섹션에 함께 실었다.
> `combinedNaScope = 697` 이 agent-na 가 원인별로 정리할 전체 대상이다.

병합 불변식: 중복 masterId **0** · 필수필드 누락 **0** · 합계 일치. 각 배치 정본은 **run별 불변 파일**에서 취했다.

---

## 7. Git 안전

- 자기 산출물만 path-specific add/commit, `git add .` 미사용
- reset / clean / stash / amend / rebase / force-push 미사용
- 병렬 세션 파일 미접촉: `tmpcols.cjs`, `tmpdiff.cjs`
- 선행 배치 원장·la 원장 수정 0
- **기존 run 파일 덮어쓰기 0** (선정 원장은 `if (!exists)` 가드)
- `pnpm-lock.yaml` · `.env*` 미접촉
- 자격증명·confirm token 미출력

---

## 8. 다음 단계

1. **agent-na** 가 통합 대상 697건을 원인별 일괄 정리
   - route 673 (CONFLICT 197 / UNRESOLVED 476) — 공식 용법 원문·제형 근거로 경로 확정, 제품명 추론 금지
   - source 24 — ETL 원천 재수집 전 terminal, 창작 금지
2. **복구분 최종 생산** — agent-ga 정본 실행기 재투입. sourceRef 는 `masterRefV4` 로 동일 결정되므로 충돌 없음
