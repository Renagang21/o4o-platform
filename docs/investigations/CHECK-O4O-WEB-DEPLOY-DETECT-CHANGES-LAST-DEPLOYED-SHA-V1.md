# CHECK-O4O-WEB-DEPLOY-DETECT-CHANGES-LAST-DEPLOYED-SHA-V1

> **작업명:** WO-O4O-WEB-DEPLOY-DETECT-CHANGES-LAST-DEPLOYED-SHA-V1
> **유형:** CI 변경감지 안정화(V1) — `deploy-web-services.yml` detect-changes 를 tip-only → push batch range(`event.before..sha`)로. workflow/문서만, 앱·backend·DB 무변경.
> **결과: PASS — push 변경감지를 `github.event.before..github.sha` 범위로 전환(+fallback +force-all +로깅), fetch-depth 0. workflow_dispatch 특정 서비스 force-deploy 기존 동작 유지. YAML 유효.**
> 선행: WO-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-PARITY(배포 skip 사례) — 2026-06-17

## 1. Summary

web deploy 의 detect-changes 가 `git diff HEAD~1 HEAD`(tip-only)로 변경을 판단해, web 변경 커밋 뒤에 docs-only/타 커밋이 같은 push 의 HEAD 가 되면 web 배포가 **skip** 되던 문제를 해소. push batch 전체(`event.before..sha`)로 비교하도록 정렬(트리거 `on.push.paths` 와 동일 범위).

## 2. Problem

- `on.push.paths` 트리거는 **push batch(before..sha) 범위**로 평가되어 워크플로가 실행되지만, detect-changes 스텝은 `HEAD~1 HEAD`(tip 1커밋)만 비교 → **불일치**.
- web 변경이 tip 이 아니면 모든 서비스 false → 배포 skip → `workflow_dispatch` 수동 재배포 필요.
- 반복 사례: 상품 parity 배포(GP/KCos skip), 디지털 사이니지 smoke(operator 500/store 404 = 코드버그 아닌 배포 skip).

## 3. Changed Files

| 파일 | 변경 |
|------|------|
| `.github/workflows/deploy-web-services.yml` | detect-changes: checkout `fetch-depth: 2→0`, push 비교 `HEAD~1 HEAD` → `event.before..github.sha`(+fallback +force-all +base/head/decision 로깅) |
| `docs/investigations/CHECK-O4O-WEB-DEPLOY-DETECT-CHANGES-LAST-DEPLOYED-SHA-V1.md` | 본 CHECK |

> 앱 코드/backend/DB/Dockerfile/Cloud Run/배포 job 본문 변경 0. deploy-{neture,k-cosmetics,kpa-society,glycopharm}/summary job 무변경.

## 4. Before / After

```text
[Before] push: git diff --name-only HEAD~1 HEAD   (tip-only, fetch-depth:2)
         → HEAD가 docs-only면 web 변경 미감지 → deploy skip

[After]  push: BASE=github.event.before, HEAD=github.sha
         git diff --name-only $BASE $HEAD          (push batch 전체, fetch-depth:0)
         → batch 내 web 변경 모두 감지 → deploy 정상
```

## 5. Detection Range (push)

- `HEAD_SHA = github.sha`, `BASE_SHA = github.event.before`.
- **fallback**: `before` 가 빈 값 / all-zeros(신규 브랜치·첫 push·force push) / 로컬 미존재(`git cat-file -e` 실패) → `HEAD~1`; 그조차 없으면 **force ALL**(안전 기본).
- `packages/**` 변경 또는 force-all → 전 서비스 rebuild(기존 정책 유지).
- per-service: `services/web-{neture,k-cosmetics,kpa-society,glycopharm}/` prefix 매칭(`decide()` 헬퍼, 결정 로그 출력).
- checkout `fetch-depth: 0` — before..sha 다중 커밋 범위 diff 위해 전체 히스토리 필요(detect-changes job 한정, 경량).

## 6. workflow_dispatch Behavior

- **기존 동작 유지(이미 force-deploy)**: `service=all` → 전 서비스, `service=<특정>` → 해당 서비스만 `true`(변경감지 무관). 수동 재배포 경로는 그대로 확실히 동작 → §9.2 충족(별도 force flag 불요).
- 본 WO 는 dispatch 로직 미변경(push 경로만 개선).

## 7. Service Path Filters

- `packages/**` → 전 서비스(공유 패키지 변경 시 전부 rebuild) 유지. per-service = `services/web-{x}/**`.
- **재설계 안 함**(§10) — 공유 패키지가 packages→all 로 이미 포섭되어 누락 위험 낮음. 추가 필터 변경 없음.

## 8. Validation

- **YAML 유효**(pyyaml safe_load): jobs = detect-changes/deploy-neture/k-cosmetics/kpa-society/glycopharm/summary, detect-changes outputs 4종 유지.
- **tip-only 제거 확인**: 실제 비교에서 `git diff ... HEAD~1 HEAD` 제거(잔존은 주석 1줄뿐). fallback 의 `HEAD~1` 단독 ref 만 사용.
- shell: `set` 미사용(기존 스타일 유지), `decide()` 헬퍼는 `$GITHUB_OUTPUT` append + echo. before all-zeros/부재 분기 처리.
- **운영 검증(배포 후 권장)**:
  1. web 변경 커밋 뒤 docs-only 커밋이 같은 push HEAD 인 range → 해당 web 서비스 deploy decision=true 확인(로그 base/head/changed files).
  2. `workflow_dispatch(service=glycopharm)` → glycopharm 만 deploy(변경무관).
  3. `workflow_dispatch(service=k-cosmetics)` → k-cosmetics 만 deploy.

## 9. Regression Check

- deploy job 조건(`needs.detect-changes.outputs.* == 'true'`) 동일 → outputs 계약 무변경(true/false 4종).
- `packages/**`→all, dispatch all/특정 서비스 동작 유지. summary job 무변경.
- 회귀 위험 낮음: 변경은 detect-changes 의 base 산정 + 로깅뿐. 산출 outputs semantics 동일(오히려 누락 감소).

## 10. Follow-ups

1. **V2(후보) `WO-O4O-WEB-DEPLOY-LAST-DEPLOYED-SHA-STORE-V1`** — 서비스별 "마지막 성공 배포 SHA" 영속 저장(artifact/cache 또는 GitHub deployment/environment) 후 비교. push batch 범위로도 못 잡는 "이전 워크플로 자체 skip 으로 이미 누락된 변경"까지 복구. GitHub deployment API/환경 구조 검토 필요.
2. (선택) detect-changes 결과를 summary job 에도 base/head SHA 포함 출력.

---

*Date: 2026-06-17 · web deploy detect-changes V1 · PASS · push 비교 HEAD~1 tip-only → event.before..github.sha(+fallback HEAD~1/force-all, fetch-depth 0, 로깅) · workflow_dispatch 특정 서비스 force-deploy 유지 · packages→all/per-service 필터 유지 · YAML 유효 · 앱/backend/DB 무변경 · V2=last-deployed-SHA store 후보.*
