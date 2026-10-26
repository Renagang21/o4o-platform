# 약국 프런트 GCP 리소스 전환·정리

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
- [x] PR·CI·Codex gate 확인 → 정상 main 병합 → 정확한 main SHA CI 확인.
- [x] plan을 실행하고 실제 source·digest 검토 후 prepare 실행.
- [x] 새 private 리소스 readiness·연결 확인.
- [x] 새 배포 대상·image namespace·배포 registry·정적 CORS origin·읽기 인벤토리 소비처 정렬 구현.
- [x] fixed cutover/rollback/retire 모드와 optimistic-lock·공개 JS 검증·실패 시 복귀·참조/요청 수 검사 구현.
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

로컬 focused Python 17건 및 CI 관련 Node 테스트 374건(배포 workflow gate 90건 포함) PASS.
## 실제 실행 결과 (2026-10-26)

- PR [#836](https://github.com/Renagang21/o4o-platform/pull/836) 정상 merge:
  `fc3177e2236e52dfdb3887ba8d55e0b4ffeb656d`.
- PR CI 40294290627·SonarCloud·CodeQL PASS, 최종 head Codex 지적 0건·미해결 thread 0건.
- main CI [40300897463](https://github.com/Renagang21/o4o-platform/actions/runs/40300897463) PASS.
  Delivery 40302341477은 `NO_DEPLOY`이며 기존 앱 image 배포는 실행하지 않았다.
- 읽기 전용 plan [40301050063](https://github.com/Renagang21/o4o-platform/actions/runs/40301050063) PASS.
  검토 digest: `f6ade0cac8d012e535e37f730fa44acb8163d163056d6659c0eb20012c3ab4ed`.
- prepare [40302554490](https://github.com/Renagang21/o4o-platform/actions/runs/40302554490) PASS:
  `pharmacy-business-web`, `neg-pharmacy-business-web`, `backend-pharmacy-business-web` 생성 완료.
  Run Ready와 생성 후 설정 재조회 비교를 통과했다.
- 복제 source는 `kpa-society-web-02296-cep`이며 앱 image는 기존 #829 merge
  `7166005df54231e00999673fecdf83e596e1bb3a`의 immutable digest를 재사용했다.
  새 준비 workflow의 main SHA와 앱 serving SHA는 서로 다른 식별자다.
- 기존 LB routing·IAM·옛 리소스·DB는 변경하지 않았다. 기존 `pharmacy.neture.co.kr`의 HTML·동일 host JS는 200.
  `megapharm.neture.co.kr`은 Codex 프록시의 CONNECT 403으로 HTTP smoke 미검증이며 성공으로 판정하지 않았다.

새 서비스의 최초 공개 invoker 설정은 아직 미실행이다. 소유자가 다음 명령을 실행한 뒤
도메인 검증·전환·참조/트래픽 확인·옛 자원 정리를 이어간다. 배포 계정에 IAM 변경 권한을
확대하지 않고 기존 bootstrap 경계를 따른다.

```sh
gcloud run services add-iam-policy-binding pharmacy-business-web \
  --project=netureyoutube --region=asia-northeast3 \
  --member=allUsers --role=roles/run.invoker
```

worktree disposition은 `KEEP`이다. 소유자 bootstrap 및 후속 전환이 남았으며,
준비 실행을 전체 잔재 제거·도메인 전환 완료로 보고하지 않는다.

## 후속 전환·정리 구현 (같은 WO의 연속 phase)

PR #838은 실행 기록과 후속 전환 코드를 함께 반영하는 연속 phase다. 배포 선택 키
`kpa-society`는 호환 유지하고, 실제 Run·image·serving registry 대상만 `pharmacy-business-web`로 정렬한다.
JWT·membership·사업 서비스 키는 변경하지 않는다. API 정적 CORS 목록은 기존 Run origin 하나를
같은 프로젝트의 새 Run origin 하나로 바꾸며 pharmacy·megapharm 등 나머지 origin과 credentials 정책은 유지한다.

| 모드 | 실행 계약 |
|---|---|
| `cutover-plan` / `cutover` | 소유자 공개 invoker·단일 최신 100% Ready·runtime SA·backend/NEG 소유·두 host 범위를 검사한다. GCP URL map validation과 공개 HTML·JS smoke 후 검토 digest로 pharmacy matcher만 바꾼다. fingerprint 충돌은 쓰기 전에 중지한다. |
| `rollback-plan` / `rollback` | 옛 Run이 남아 있는 동안 같은 host 범위만 이전 backend로 복귀한다. 다른 matcher는 유지한다. |
| `retire-plan` / `retire` | 새 image namespace의 실제 serving을 확인한다. global/regional URL map·backend·NEG를 페이지 끝까지 읽고 옛 참조가 없어야 한다. 전환 후 최소 15분(전파 여유 2분 + 요청 0 관측 10분 + 지표 수집 지연 3분)과 `run.googleapis.com/request_count` 0을 요구한다. backend→NEG→Run 순서로 매번 다시 검증하며 삭제한다. |

plan 계열 중 전환 plan은 GCP의 비변경 URL map validate POST를 포함한다.
각 변경 모드는 해당 plan의 SHA256을 요구하며 현재 main·CI·owner·freeze gate와 다른 production workflow의
실행 상태를 확인한다. 부분 목록·권한 오류·지표 읽기 실패를 참조/요청 0으로 대체하지 않는다.
`monitoring.timeSeries.list`는 읽기 preflight에 추가한다. 공개 invoker와 지표 읽기 권한이 실제로
확인되기 전에는 전환·삭제 성공으로 기록하지 않는다.

전환 후 HTML·동일 host JS digest가 새 Run과 다르면 제한된 재시도 후 이전 backend로 복귀한다.
다른 세션이 pharmacy matcher까지 바꾼 경우에는 그 변경을 덮어쓰지 않는다. 성공 시 새 backend의
소유 description에 전환 시각을 남긴다. 일반 pharmacy 배포도 마지막에 실제 canonical routing을 확인하므로,
복귀 상태에서 새 Run만 배포된 것을 운영 도메인 반영 완료로 보고하지 않는다.

실행 순서는 `cutover-plan`→검토 digest의 `cutover`→현재 main의 정상 API·pharmacy verified rollout→
15분 이상 안정 관측→`retire-plan`→검토 digest의 `retire`다. API 배포에는 이번 alias 외의 변경이나
미승인 migration이 섞이지 않았는지 실제 serving→target 범위로 확인한다. 옛 image/revision의 역사 버전은
활성 Run/LB 3개 리소스 삭제와 구분하며 참조 중인 artifact를 일괄 파기하지 않는다.

```sh
gh workflow run deploy-web-services.yml --ref main \
  -f service=kpa-society -f pharmacy_preparation=cutover-plan
gh workflow run deploy-web-services.yml --ref main \
  -f service=kpa-society -f pharmacy_preparation=cutover \
  -f pharmacy_plan_digest=<reviewed-cutover-sha256>
```

후속 코드 로컬 검증: Python 37건·Node CI 계약 376건 PASS. CORS literal delta는 옛 Run origin 1개 삭제·
새 origin 1개 추가뿐임을 확인했다. 이 절은 코드 구현 기록이며 cutover·정상 배포·retire의 실제 실행 완료를 뜻하지 않는다.
