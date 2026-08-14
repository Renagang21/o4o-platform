# WO-O4O-OPERATOR-COMMONIZATION-MAIN-INTEGRATION-AND-PRODUCTION-VALIDATION-V1

> **상태**: 핸드오프 (미착수) · **작성일**: 2026-08-14
> **선행**: `work/operator-commonization-v1` 작업 완료 (최종 commit `1446396d3`)
> **후속**: Store Hub(`work/commonization-store-hub`) 동일 방식 main 통합

---

## 1. 목표와 배경

`work/operator-commonization-v1` 에서 완료된 Operator 공통화 전체를 최신 `main` 에 통합하고,
production 기준 검증까지 마친 뒤 `main` push 를 완료한다.

- source branch: `work/operator-commonization-v1`
- 최종 commit: `1446396d3` (사이니지 HQ 16 + QR 작성 4 + 운영 분석 2 공통화 — VIEW_DUPLICATED 0)
- target: `main`
- 작성 시점 기준 divergence: `origin/main` 대비 **ahead 9 / behind 20**, 변경 파일 **123개**

Operator 공통화는 **main 반영이 끝난 뒤에야** production baseline 으로 확정한다.
브랜치에서 검증이 끝났다는 사실만으로 baseline 확정하지 않는다.

## 2. 승인 범위

- `work/operator-commonization-v1` → 최신 `main` 재정렬 및 병합
- 병합 충돌 해결 (기능 의미 유지 범위 내)
- 통합 결과에 대한 typecheck / build / 브라우저 smoke 검증
- `main` commit · push
- 검증 결과의 CHECK 문서 기록

## 3. 실행 순서

1. 기준 저장소에서 `main` 최신화 (`git fetch origin` → clean 확인 → `git pull --ff-only`)
2. source branch 와 `main` 차이 확인 (파일·충돌 예상 지점 사전 식별)
3. source branch 를 최신 `main` 기준으로 재정렬
4. 충돌 발생 시 **기능 의미를 유지하며** 해결 (한쪽 일괄 채택 금지)
5. 관련 서비스 전체 검증
   - KPA / K-Cosmetics / Neture / PharmacyHub
   - GlycoPharm 은 **공유모듈 회귀 확인 목적**으로만 포함 (공식 4서비스 대상 아님)
6. `main` 병합
7. `main` 기준 build / typecheck 재검증
8. `main` push
9. **main 기준 실제 브라우저 smoke**
   - 4서비스 `/operator`
   - desktop / mobile
   - sidebar 전체 항목
   - deep link 직접 진입
   - 공통화한 주요 화면 (사이니지 HQ · QR 작성 · 운영 분석 포함)
   - PharmacyHub dashboard / membership
   - JS exception / white screen / dead link 0 확인

   가능하면 **실제 계정 로그인**으로 검증한다 (`docs/local/TEST-ACCOUNTS.local.md` 참조).
   credential 이 없으면 그 사실과 우회 방법을 보고에 명확히 기록한다.

## 4. 제외 범위

- Store Hub(`work/commonization-store-hub`) 통합 — 본 WO 완료 후 **별도 WO**
- Operator 공통화 자체의 추가 리팩토링 · 신규 화면 공통화
- production DB write (migration 포함) — 본 WO 는 read-only 검증만
- GlycoPharm 전용 기능 변경
- 이번 변경과 무관한 lint / typecheck 부채 정리

## 5. 중지 조건

- 예상하지 못한 대규모 충돌 (기능 의미 판단이 필요한 광범위 충돌)
- 다른 작업의 미커밋 변경 발견 — 경로 충돌·소유권 불명 시 중지 (`feedback-stop-when-worktree-not-clean` 기준)
- `main` 기준 build / typecheck 실패가 Operator 변경과 무관하다고 **확정할 수 없는** 경우
- CLAUDE.md 상시 중지 조건 (dependency · CI · Frozen Baseline · 권한/route/API contract 변경 필요 등)

## 6. 검증과 Git

- 검증: typecheck · build · 4서비스 브라우저 smoke (실계정 로그인 우선)
- Git: `main` 직접 작업. path-specific stage 유지, `git add .` 금지
- 완료 조건: **이번 WO 범위의 미커밋 변경 0건 + `HEAD == origin/main`**
- 문서 정합(§16) 결과 한 줄 포함

## 7. 완료 보고

```text
main 병합 commit:
origin/main push:
충돌:
typecheck/build:
browser smoke:
실제 로그인 E2E:
production write:
회귀 발견:
문서 정합:
```
