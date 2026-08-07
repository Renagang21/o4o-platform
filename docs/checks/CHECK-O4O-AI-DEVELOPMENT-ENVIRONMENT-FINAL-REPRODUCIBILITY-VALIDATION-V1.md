# CHECK-O4O-AI-DEVELOPMENT-ENVIRONMENT-FINAL-REPRODUCIBILITY-VALIDATION-V1

> WO-O4O-AI-DEVELOPMENT-ENVIRONMENT-FINAL-REPRODUCIBILITY-VALIDATION-V1
> 착수 HEAD `226920890` · 검증일 2026-08-08
> **판정: REVIEW** (치명 결함 없음. 최소 수정 2건 적용 후 잔여 REVIEW 1건)

---

## 0. 검증 방법과 한계 (먼저 밝힘)

WO 는 "새 Claude Code 세션에서 저장소 문서만 읽고" 재현하라고 지시했다.
**본 검증을 수행한 세션은 정비 작업을 직접 수행한 세션이므로 진정한 fresh session 이 아니다.**
이 한계를 우회하기 위해 다음 방식을 썼다.

> **인용 근거 강제(citation-grounded) 방식** — 10개 질문과 4개 시나리오의 모든 답에 대해
> **저장소 내 파일·섹션을 근거로 제시할 수 있을 때만 "재현 가능"으로 판정**한다.
> 대화 맥락으로는 알지만 저장소 문서에 근거가 없으면 **GAP 으로 기록**한다.

따라서 아래 결과는 "이 세션이 답할 수 있는가" 가 아니라
"**저장소 문서만으로 답이 도출되는가**" 에 대한 판정이다.

---

## 1. 착수 상태

| 항목 | 값 |
|---|---|
| branch | `main` |
| HEAD | `226920890` (= `origin/main`) |
| `226920890` ancestor | YES |
| 작업트리 | **clean 아님** — `apps/api-server/src/scripts/**` 에 병렬 세션(hff-ja) WIP 4건 |

WO §2 는 "작업트리가 clean 인 경우에만 진행" 이라고 했으나,
**정본([`O4O-GIT-PARALLEL-WORK-SAFETY-V1`](../baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md) §3)은
"작업트리가 dirty 하다는 사실만으로는 중지 사유가 아니다" 로 규정**하며 중지 사유를 3가지
(경로 충돌 / 소유자 불명 / 개별 stage 불가) 로 한정한다.
본 작업 대상은 `docs/**` 와 `CLAUDE.md` 로 병렬 세션 경로와 충돌하지 않아 **정본 기준으로 진행**했다.
→ 이는 정본이 WO 보다 정확하게 동작한 사례이며, 재현성 관점에서 **긍정 신호**다.

---

## 2. 핵심 질문 10개 — 재현 결과

| # | 질문 | 판정 | 근거 (파일:섹션) |
|:-:|---|:-:|---|
| 1 | 작업 시작 시 확인 | ✅ | `AGENTS.md` §1·§3 · `CLAUDE.md` "Claude Code 진입점 / 실행 원칙" · `SETUP.md` §1 |
| 2 | 작업트리가 clean 하지 않으면 | ✅ | `O4O-GIT-PARALLEL-WORK-SAFETY-V1` §3 (dirty≠중지, 중지 사유 3가지) |
| 3 | 병렬 세션 WIP 보호 | ✅ | 같은 문서 §3 규칙 1·3 · `AGENTS.md` §3 · `CLAUDE.md` 중지 조건 |
| 4 | git add/commit/push 안전 규칙 | ✅ | 같은 문서 §3 규칙 4·5·6 (path-specific stage, `git add .` 금지, force 금지) |
| 5 | 전체 build 는 언제 필요한가 | ⚠️ **부분** | `SETUP.md` §3 "`build:packages` — 최초 1회 또는 `packages/` 수정 시". **앱 전체 `pnpm run build` 의 필요 시점은 명시 없음** |
| 6 | 서비스별 상세 규칙 탐색 | ✅ | `CLAUDE.md` §9 + 하단 "상세 규칙 문서 목록"(83개 경로) · `docs/README.md` |
| 7 | CLAUDE.md ↔ 정본 문서 역할 분리 | ✅ | `CLAUDE.md` "사업 철학 SSOT (Priority Chain)" + "시작 전 확인 — 외부 정본" 표 |
| 8 | deprecated/archive 취급 | ✅ | `docs/README.md` "archive 폴더의 문서는 현재 기준 문서가 아니다" · `docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md` |
| 9 | CHECK / WO 작성 기준 | ✅ | `docs/checks/README.md` (두는 것/두지 않는 것) · `docs/work-orders/README.md` · 갱신 트리거는 `AGENTS.md` §9 · `CLAUDE.md` 실행 원칙 |
| 10 | 완료 시 검증·보고 | ✅ | `CLAUDE.md` "완료·보고 원칙" · `AGENTS.md` §9 · Git 정본 §3 완료 조건 |

**9/10 완전 재현 · 1건 부분(Q5).**

---

## 3. 시나리오 A~D

| | A. 프론트 UI 수정 | B. API+FE 연계 | C. DB write 데이터 생산 | D. 병렬 WIP 존재 |
|---|---|---|---|---|
| 사전 점검 | `git fetch`/`status -sb` | 동일 | 동일 + 승인 확인 | 동일 + 소유자 식별 |
| 정본 문서 | §9·§11, Design Core | §7 Boundary, API 호출 규칙 §1 | §0, PRODUCTION-MIGRATION-STANDARD | Git 정본 §3 |
| 실행 가능 | 가능 | 가능 | **승인 필요** | 가능(경로 비충돌 시) |
| build/typecheck | `type-check:frontend` | `type-check` 전체 | `type-check` | 범위 한정 |
| DB/배포 | 불필요 | 불필요(계약 변경 시 중지) | **DB write=명시 승인** | 불필요 |
| Git | path-specific | path-specific | path-specific | path-specific + 타 경로 불가침 |
| 중지 조건 | 공통 모듈 파급 시 | route/API contract 변경 시 | UPDATE/DELETE/대량 write | 경로 충돌·소유자 불명 |
| 완료 검증 | type-check+lint, smoke | + API 응답 | + 독립 검증 | 내 범위 미커밋 0 + `HEAD==origin/main` |

**4종 모두 문서만으로 도출 가능. 치명적 모순 없음.**
단 C 의 "DB write 승인" 은 `CLAUDE.md` §0 · `AGENTS.md` §4 · 중지 조건 3곳에 일관되게 존재해 해석 충돌이 없다.

---

## 4. 문서 탐색성

| 항목 | 결과 |
|---|---|
| `CLAUDE.md` 내부 참조 resolve | ✅ 마크다운 링크 + 백틱 경로 전부 |
| `AGENTS.md` 내부 참조 resolve | ✅ |
| `SETUP.md` · `README.md` · `docs/README.md` | ✅ |
| 존재하지 않는 파일 경로 | **0** |
| archive 를 현행 정본처럼 참조 | **1건 발견 → 수정** (아래 §6) |
| 상호 모순되는 필수 규칙 | **1건 발견 → 수정** (아래 §6) |

---

## 5. `CLAUDE.md §N` 참조 유효성 (전수 447건)

| 분류 | 수 | 비고 |
|---|--:|---|
| VALID | 442 | 현행 §0~§15 · §13-A |
| VALID (하위 항목 표기) | 4 | `§11-2`(=§11 핵심규칙 2 Dashboard 5-Block) · `§11-3`(=§11 핵심규칙 3 AI Summary) — 내용 대조로 확인 |
| ARCHIVE_HISTORICAL | 1 | `docs/archive/investigations/IR-O4O-CMS-DISTRIBUTION-UNIFICATION-V1.md:225` (§20) — 직전 WO 에서 의도적 보존 |
| **INVALID** | **0** | 검증 중 5건 발견 → 전부 수정 |
| AMBIGUOUS | 0 | |

수정한 stale 범위 표기 5건: `§11-13`(Cosmetics) · `§11-14`×3(Cosmetics) · `§14-17`(Business Service)
→ 모두 구 번호 체계의 **범위 표기**였고, 현행 `§9 도메인별 규칙` + 각 상세 문서로 연결했다.

---

## 6. 적용한 최소 수정 (4파일)

1. **`CLAUDE.md` §1 — 안전 규칙 충돌 해소 (중요)**
   기존: "작업 전 `git pull origin main` (sync first) **필수**" (무조건)
   충돌: Git 정본 §3 규칙 2 "**dirty 상태에서 pull 금지**".
   이 저장소는 병렬 세션 때문에 **dirty 가 정상 상태**라, 새 세션이 CLAUDE.md 만 보고
   dirty 상태에서 pull → 타 세션 변경 훼손 가능. WO 판정 기준상 FAIL 항목
   ("안전 규칙을 서로 다르게 해석할 수 있음") 이므로 수정했다.
   변경: `git fetch` + `status -sb` 로 sync 확인하되 **pull 은 clean 일 때만**.

2. **`CLAUDE.md` 상세 규칙 목록 — archive 문서 표기**
   `docs/archive/reports/OPERATOR-CORE-EXTRACTION-VERIFY-CHECKLIST-V1.md` 가 현행 규칙 목록에
   그대로 있어 `docs/README.md`("archive 는 현재 기준 문서가 아니다") 와 모순.
   → "(완료 기록 — 현행 기준 문서 아님)" 표기 추가.

3. **`docs/architecture/COSMETICS-DOMAIN-RULES.md`** · **`BUSINESS-SERVICE-RULES.md`** 헤더의 구 번호 범위 정정.
4. **`docs/baseline/E-COMMERCE-ORDER-CONTRACT.md`** 의 `§11-14` 3건 정정.

**섹션 번호 재배치·신규 정책 추가·기능 코드 변경 없음.** `CLAUDE.md` 번호 헤더 17개 불변.

---

## 7. 잔여 REVIEW / 후속 제안

| # | 내용 | 성격 |
|---|---|---|
| R1 | **앱 전체 `pnpm run build` 의 필요 시점이 문서에 없음** (Q5). `build:packages` 만 명시. 새 세션이 매번 전체 빌드를 돌릴 위험. 정책 신설이 되므로 본 WO 에서 임의 작성하지 않음 | REVIEW |
| F1 | `CLAUDE.md §N` 참조 유효성 CI 가드 — 이번 검증에서 "존재한 적 없는 §21" 사례가 확인됐다. 재번호뿐 아니라 **검증 없이 새로 쓰인 참조**도 원인이므로 가드가 유효. WO 범위 밖 | 후속 |
| F2 | 구 DB 롤 폐기 (병렬 세션 종료 후) · neture admin 자격증명 교체 | 후속(보안) |

---

## 8. 최종 판정

```text
PASS 조건 대비
  새 세션 핵심 절차 재현        9/10 (Q5 부분)
  필수 규칙 근거 문서 명확       OK
  시나리오 4종 치명 모순         없음
  현행 문서 dangling 참조        0
  INVALID §N 참조                0
  정본/상세 탐색 경로            OK

→ 판정: REVIEW
   사유: 치명 결함(FAIL) 은 없으나, 검증 중 발견된 안전 규칙 충돌 1건이
         수정 전 기준으로 FAIL 항목에 해당했다. 수정 완료했고,
         잔여 R1(전체 build 시점 미문서화)이 REVIEW 로 남는다.
```
