# 후속 Agent Request (가 / 나 / 다) — 잔여 3,809 제품별 생산

**WO**: WO-O4O-OTC-EASY-DRUG-REMAINING-3809-MASTER-BY-MASTER-PRODUCTION-QUEUE-AND-EXCEPTION-HANDOFF-DESIGN-V1
**Agent**: 라 (설계 세션 — READ-ONLY, DB write 0). 본 문서는 후속 세션 **핸드오프 요청서**이며 자동 실행 지시가 아니다.

## 확정 원장 (라 세션 산출)
| 산출물 | 내용 |
|--------|------|
| `otc-easy-drug-remaining-3809-master-by-master-census-v1.json` | 재현·분류·스키마·pilot SSOT |
| `otc-easy-drug-remaining-3809-agent-ga-ready-queue-v1.json` | **정상 생산 큐 2,496** (route: oral 1,436·topical 797·ophthalmic 231·vaginal 23·oromucosal 9) |
| `otc-easy-drug-remaining-3809-agent-na-exception-queue-v1.json` | **예외 큐 1,047** (IDENTITY_CONFLICT 610·ROUTE_UNRESOLVED 216·ROUTE_CONFLICT 197·SOURCE_EFFICACY_MISSING 24) |
| `otc-easy-drug-remaining-3809-exclude-ledger-v1.json` | **제외 266** (EXCLUDE_EXPORT 263·EXCLUDE_NONSALE 3) |
| `otc-easy-drug-remaining-3809-v4-sourceref-ledger-v1.json` | V4 sourceRef 2,496 (dup 0·liveConflict 0) |

합계 검증: 2,496 + 1,047 + 266 = **3,809**. reentryPotential 1,023.

---

## Request A — agent-ga (가): 정상 생산

**입력**: `agent-ga-ready-queue-v1.json` 의 masterId 배열 (route별).
**작업**:
1. master별 자기 e약은요 공식 원문(효능·효과/용법·용량 + 안전 4섹션)만 grounding.
2. route별 composer profile로 ko canonical 생성. sourceRef=`otc-v4-master-leaflet:<masterId>`.
3. KO 선행 후 EN(grounding 있을 때만, 없으면 HOLD).
4. per-master savepoint(→ `transaction-strategy-v1.md`). 실패 master는 나 handoff, 배치 계속.
5. **pilot 먼저**: census `pilot.masterIds` (route 라운드로빈 100) → dry-run → 이중게이트 → 독립검증(다) → LIVE.

**제약**: DB write는 가만. 원문에 없는 의료사실 생성 금지. 제품별 원문 혼합 금지(조성·경로·효능 상이 시 분리). 매장 약사 문의 안내 유지.

**금지/주의**: `agent-ga-ready-queue` masterId 외 확대 금지. sourceRef 네임스페이스 변경 금지. EXCLUDE·SOURCE terminal은 입력에 없음(이미 배제됨).

---

## Request B — agent-na (나): 예외 해소

**입력**: `agent-na-exception-queue-v1.json` (code별).
**작업 (DB write 0)**:
- `IDENTITY_CONFLICT` 610: 다중 gencode → 대표 확정 or 제품별 단독 grounding 승인 → `naToGa.resolution=IDENTITY_DISAMBIGUATED`.
- `ROUTE_UNRESOLVED` 216 / `ROUTE_CONFLICT` 197: operator·원문 재판독으로 경로 확정 → `ROUTE_RESOLVED`. 단 composer 미지원 경로(rectal 좌제·parenteral 관류/수액)는 `REJECTED`(terminal).
- `SOURCE_EFFICACY_MISSING` 24: 원문 효능 부재 → terminal(생성 근거 없음). 재진입 없음.

**출력**: `naToGa` return 레코드(`reentryAllowed`). 해소분만 가로 반환. **어떤 경우도 DB write 하지 않는다.**

---

## Request C — agent-da (다): 감사·회귀

**작업 (DB write 0)**:
1. census 스크립트 재실행 → 6 artifact md5 2회 byte-identical 확인.
2. 16 게이트 재실행 GREEN 확인.
3. reproduce 게이트(remaining 3,809·HOLD 3246/536/27·READY∩remaining 0·authored∩0) 독립 재현.
4. 가 생산 pilot 후 LIVE 반영분을 sourceRef(V4)로 회귀 감사(원문 대비 효능·용법·안전 보존).

---

## 실행 순서 (권장)
`라(설계·완료)` → `다(원장 재현 검증)` → `가(pilot 100 → 이중게이트 → 다 독립검증 → LIVE)` → `나(예외 해소 → 가 재진입)` → 반복.

## 관련 문서
- 재진입 계약: `otc-easy-drug-remaining-3809-reentry-contract-v1.md`
- 트랜잭션 전략: `otc-easy-drug-remaining-3809-transaction-strategy-v1.md`
