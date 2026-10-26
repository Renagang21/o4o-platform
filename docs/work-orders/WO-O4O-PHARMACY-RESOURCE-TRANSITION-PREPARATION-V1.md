# 약국 프런트 GCP 리소스 전환 준비

> **상태**: ACTIVE
> **작성일**: 2026-10-26
> **근거**: [잔재 정리 WO](WO-O4O-PHARMACY-RESIDUE-SAFE-CLEANUP-V1.md), 사용자의 리소스 정리 진행 지시
> **DEPLOYMENT**: MANUAL/GATED — 기존 trusted web workflow의 명시적 준비 모드

## 목적과 범위

소스 경로 전환은 PR #829에서 main에 통합됐다. 실제 약국 도메인은 아직
`kpa-society-web` → `neg-kpa-society-web` → `backend-kpa-society-web` 연결을 사용한다.
Cloud Run은 제자리 rename이 불가능하므로 새 private 리소스를 준비하고 검증한 뒤 전환한다.
사업 serviceKey·membership·DB 전환은 이 기술 리소스 준비 범위에 포함하지 않는다.

2026-10-26 WIF 읽기 검증 40290728439에서 backend/region NEG 생성·조회·사용 권한이 확인됐다.
`compute.backendServices.use`도 preflight에 추가한다. `run.services.setIamPolicy`는 여전히
배포 계정에 부여하지 않는다. 소유자가 새 서비스에 최초 공개 invoker를 설정하는 기존 경계를 유지한다.

## TODO와 실행 계약

- [x] 최신 main에서 별도 worktree·branch 생성. 다른 공간에서 삭제한 100개 파일은 건드리지 않는다.
- [x] 기본 자동/reusable 배포 동작을 유지하는 opt-in plan/prepare 모드 구현.
- [x] source 100% serving revision·immutable image·runtime SA·설정·LB 연결을 검사하는 digest plan 구현.
- [x] plan은 GET만 사용. prepare도 새 Run·NEG·backend POST만 사용하고 기존 자원/IAM/도메인은 변경하지 않는다.
- [x] 설정·비밀값·IAM 구성원·응답 원문은 출력하지 않고 메모리에서만 처리한다.
- [x] 충돌·source drift·동일 plan 재시도·쓰기 경계 회귀 검증.
- [ ] PR·CI·Codex gate 확인 → 정상 main 병합 → 정확한 main SHA CI 확인.
- [ ] plan을 실행하고 실제 source·digest 검토 후 prepare 실행.
- [ ] 새 private 리소스 readiness·연결 확인.
- [ ] 소유자의 최초 invoker 설정 이후 도메인 smoke·전환·롤백·잔여 참조/트래픽 확인 및 옛 자원 정리.

## 실행

소유자 계정, production environment, main ref, 현재 main SHA, CI green,
`DEPLOY_FREEZE == 'false'`, 명시적 `service=kpa-society`를 모두 요구한다.
기존 normal deploy는 선택되지 않으며 service별 concurrency를 공유한다.
다른 공유 runtime 작업이 없는지 확인한 뒤 실행한다.

```sh
gh workflow run deploy-web-services.yml --ref main \
  -f service=kpa-society -f pharmacy_preparation=plan
gh workflow run deploy-web-services.yml --ref main \
  -f service=kpa-society -f pharmacy_preparation=prepare \
  -f pharmacy_plan_digest=<reviewed-plan-sha256>
```

새 이름은 `pharmacy-business-web`, `neg-pharmacy-business-web`,
`backend-pharmacy-business-web`로 고정한다. source의 실제 immutable image를 재사용하므로
앱 기능을 새로 배포하지 않는다. 옛 image 이름 자체의 정리는 전환 이후에 남는다.
환경·secret 참조·runtime SA·ingress·scaling·자원·probe·CDN 설정을 복제하며,
same-name 리소스가 다른 소유/설정이면 덮어쓰지 않는다. 일부 생성 후 오류가 나도
기존 운영 연결은 유지되며 생성된 새 자원의 상태를 확인한 뒤 같은 plan으로 재시도한다.

## 초기 공개 접근과 후속 전환

새 자원이 준비된 뒤에만 소유자가 새 Run에 `allUsers`의 `roles/run.invoker`를 부여한다.
배포 계정의 IAM 권한을 확대하거나 invoker 검사를 비활성화하지 않는다.
그 뒤 별도의 검토된 전환으로 deployment registry/이미지 대상/Run URL 소비처와
URL map을 함께 정렬한다. 기존 backend로 즉시 복귀할 수 있도록 유지하고,
새 도메인·HTML·JS·로그인 및 390/1440px 검증, 옛 자원 참조·실제 요청 트래픽 0 확인 전에는 삭제하지 않는다.

## 검증 기록

로컬 focused Python 15건 및 CI 관련 Node 테스트 374건(배포 workflow gate 90건 포함) PASS.
실제 GCP 준비 실행 결과는 실행 뒤 추가한다. 이 기록은 생성·전환 완료를 의미하지 않는다.
