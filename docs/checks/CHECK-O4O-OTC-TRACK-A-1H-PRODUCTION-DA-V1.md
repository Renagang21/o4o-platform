# CHECK-O4O-OTC-TRACK-A-1H-PRODUCTION-DA-V1 — 범용 bundle runner 실제 생산 적용 (에이전트 다)

WO: `WO-O4O-OTC-TRACK-A-1H-PRODUCTION-DA-V1` · 일자: 2026-07-22 · 상태: **완료 — 3그룹 ko+en 완결 LIVE (bundle COMPLETED)**
bundle: `drug-otc-ko-en-bundle-runner.ts --bundle=track-a-1h-da` · 채널: Cloud SQL Proxy(:5442) → production.

---

## 0. 결론

> **범용 ko→en bundle runner 를 실제 생산에 첫 적용. 3그룹(알파칼시돌 1μg 연질캡슐·이부프로펜아르기닌 368.9mg 정·폴리사카리드철착염 326.1mg 캡슐, 각 target 6)을 하나의 bundle 로 ko 승격→en 완결 연속 처리 → bundleStatus COMPLETED. write plan 108 == actual 108(ko 72·en 36). 그룹 사이 중간 승인 0. 독립검증 PASS(각 ko 6·en 6·dup 0·en md5 sibling 일치). 재실행 no-op(각 ALREADY_UPGRADED/ALREADY_COMPLETE).**

---

## 1. 후보 재확인 (나 inventory 감사 READY_SINGLE 기준)

| 그룹 | targetFp | exclude | target/excl/other | candidate(source_ref) | sibling en md5 |
|---|---|---|---|---|---|
| 알파칼시돌 1μg 연질캡슐 | `7c9fbdf7fb512fb4` | 1 fp(4) | **6/4/0** | 06a1eed0 | `0948bfa5…` |
| 이부프로펜아르기닌 368.9mg 정 | `76e28dff9afce6d4` | 1 fp(2) | **6/2/0** | 11b84cc1 | `9107dafe…` |
| 폴리사카리드철착염 326.1mg 캡슐 | `8a412570da8697c4` | 2 fp(5) | **6/5/0** | 096e8a7c | `db0edf7a…` |

- 각 그룹 교집합 0 · easyCanonicalExactly1 6 · authoredConflict 0 · in-scope en 0.
- EN = 동일 source_ref sibling(out-of-scope)의 검토완료 en 재구성 → **build == live sibling en byte-identical** 선검증(비DB) 3/3 PASS(새 medical fact 0). 함량(1μg/368.9mg/326.1mg)·용량·금기 sibling 과 동일 fp → 등가.

---

## 2. bundle 실행 결과

| 그룹 | 그룹 status | ko | en | koActual(SPD/audit) | enActual(persist/flip) |
|---|---|---|---|---|---|
| alfacalcidol-1mcg-softcap | ALREADY_COMPLETE | ALREADY_UPGRADED | ALREADY_COMPLETE | 24 (18/6) | 12 (6/6) |
| ibuprofen-arginine-368mg | ALREADY_COMPLETE | ALREADY_UPGRADED | ALREADY_COMPLETE | 24 (18/6) | 12 (6/6) |
| polysaccharide-iron-326mg | ALREADY_COMPLETE | ALREADY_UPGRADED | ALREADY_COMPLETE | 24 (18/6) | 12 (6/6) |
| **bundle** | **COMPLETED** | — | — | **ko 72** | **en 36** |

- **writePlan 108 == writeActual 108** (ko 72 = SPD 54 + audit 18 · en 36 = persist 18 + flip 18).
- 각 그룹: ko apply(APPLIED) → ko 재실행(ALREADY_UPGRADED) → en apply(APPLIED) → en 재실행(ALREADY_COMPLETE) → 다음 그룹. **중간 승인 없음**.
- 독립 검증(별도 pg): 그룹당 ko canonical 6 · en canonical 6 · en canonical dup 0 · en content md5 == sibling(0948bfa5/9107dafe/db0edf7a) 3/3.
- 재실행 no-op: 3그룹 전부 ko ALREADY_UPGRADED / en ALREADY_COMPLETE(write 0).

---

## 3. bundle runner 실제 생산 안정성 보고 (WO 요구)

| 관측 | 내용 |
|---|---|
| **그룹별 상태** | 3/3 ALREADY_COMPLETE (ko+en 완결). |
| **bundle 전체 상태** | COMPLETED (전 그룹 성공). |
| **그룹 실패 후 다음 그룹 계속** | 본 실행에선 실패 0. (설계상 그룹한정 HOLD/FAILED→continue, 공통장애→abort.) |
| **wrapper/child runner 문제** | ⚠️ **연결 슬롯 고갈**: bundle 은 그룹당 자식 프로세스(ko dry/apply/verify + en dry/apply/verify)를 순차 spawn. 각 자식은 TypeORM DataSource(기본 pool)를 열고 종료 시 destroy. **타임아웃(SIGTERM)으로 죽은 자식은 destroy 미도달 → 연결 누수**. 동시 에이전트(가/나)와 겹쳐 `o4o_api` 연결이 25 한도에 도달, **재실행 no-op 시도가 "remaining connection slots reserved" 로 FAIL** → bundle 이 **정확히 abort**(안전). 데이터는 무손상(독립검증 완료). |
| **분류기 개선** | 위 오류가 초기엔 "분류 불가→보수적 abort"(disposition 은 올바름, 라벨만 일반). **연결슬롯/too many connections/terminated 패턴을 DB 연결·인증 장애로 분류 추가**(additive, self-test 29건). |
| **실제 writePlan/writeActual** | ko 72/72 · en 36/36 · 총 108/108 (초과 0). |
| **기존 방식 대비 편의성** | 그룹당 개별 WO·개별 dry-run/apply/CHECK 6~8단계를 손으로 반복하던 것을, **1 bundle 명령으로 3그룹 ko→en 18단계 자동 연속**. 중간 승인·중간 커밋 제거. 완료 그룹 자동 no-op(멱등). 실패 시 그룹 격리 + 진단 JSON 보존. 단, **다건 연속 시 연결 풀 한도 주의**(아래 권고). |

### 운영 권고 (후속, 코드 변경 없음)
- bundle 다건 연속 실행 시 **동시 에이전트와 DB 연결 경합** 주의. 자식 runner 의 TypeORM pool 이 기본값이라 그룹 수×pool 이 누적될 수 있음.
- 개선안(별도 WO): 공유 runner DataSource 에 `extra: { max: 2 }` 최소 pool 지정, 또는 bundle 자식 타임아웃 시 프로세스 트리 kill. **본 WO 범위 밖**(공유 runner 수정 = 가/나 co-owned) → 권고만.
- 실무: bundle 실행 전 유휴 연결 확인, 타임아웃 넉넉히(그룹당 ~30s×단계수).

---

## 4. 검증 요약

- self-test(비DB): **29건 PASS** (연결슬롯 분류 포함).
- typecheck: 신규 3파일(bundle·grounded·en registry 추가분) **에러 0**.
- 번역 build byte-identity(비DB): 3/3 sibling en md5 일치.
- bundle dry-run: ko READY 3 (미승격 그룹은 en HOLD=ko 전제 미충족, 정상).
- bundle apply: COMPLETED · 독립검증 3/3 · 재실행 no-op 3/3.

---

## 5. 완료 보고

| 항목 | 값 |
|---|---|
| 시작/종료 HEAD | `37a62eb43` → (본 커밋) |
| bundle | track-a-1h-da (3그룹, writeOwner=agent-da) |
| production write | ko 72 + en 36 = **108** (plan==actual) |
| 그룹 결과 | 3/3 ko+en 완결(ALREADY_COMPLETE) · 독립검증 PASS · no-op PASS |
| 생성 파일 | bundle runner(분류기 additive) · 3 번역 JSON · 3 ko run/dryrun-pass · 3 en run · summary · 본 CHECK · registry 3+3 등재 |
| 기존 runner 로직 수정 | **0**(wrapper·registry additive만) |

> 안정성 결론: bundle runner 는 실제 생산에서 **정상 동작(COMPLETED·멱등·안전 abort)**. 유일 이슈(연결 슬롯 고갈)는 환경 자원 경합이며 데이터 무손상·bundle 이 안전 차단. 다건 연속 실행 시 연결 풀 관리 권고. 남은 READY 후보는 동일 bundle 경로로 확장 가능.
