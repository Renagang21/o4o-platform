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
- [x] 소유자의 최초 공개 invoker 설정과 새 Run·두 도메인 HTML/JS smoke 확인.
- [x] 검토 digest로 도메인 전환 및 전환 후 JS 일치 확인.
- [x] 홈·로그인 390/1440px 화면 재검증, 사용자 직접 로그인·기본 화면·메뉴 조회 확인.
- [ ] 새 image namespace 정상 verified rollout 및 옛 자원 참조/트래픽 0 확인 후 정리.

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
| `rollback-plan` / `rollback` | 옛 Run·NEG·backend가 모두 남아 있는 동안 같은 host 범위만 이전 backend로 복귀한다. 다른 matcher는 유지한다. |
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

실패 시 원상 복구는 이미 승인된 동일 실행의 보상 동작이다. 본인이 쓴 matcher가 그대로일 때만 최신
fingerprint로 복구하므로, 이후 main 이동·다른 배포의 대기 때문에 장애 경로가 남지 않으며 다른 matcher 변경도 보존한다.
새 전환·수동 rollback·삭제의 owner·main·CI·freeze 및 production 쓰기 gate는 그대로 유지한다.

후속 코드 로컬 검증: Python 42건·Node CI 계약 376건 PASS. CORS literal delta는 옛 Run origin 1개 삭제·
새 origin 1개 추가뿐임을 확인했다. 이 절은 코드 구현 기록이며 cutover·정상 배포·retire의 실제 실행 완료를 뜻하지 않는다.


## 운영 전환 실행 기록 (2026-10-26, Asia/Seoul)

이 절은 위 준비 단계 기록 이후의 상태다. 소유자가 새 Run의 공개 invoker를 설정했고,
배포 계정에는 `run.services.setIamPolicy`를 추가하지 않았다. 읽기 인벤토리
[40325679922](https://github.com/Renagang21/o4o-platform/actions/runs/40325679922)에서
필요한 Compute·Run·Monitoring 권한을 확인했다.

- plan 40323390642 이후 첫 cutover 40325461609는 계획 변경을 감지해 쓰기 전에 중지했다.
  다른 공간의 공유 운영 배포가 끝난 뒤 상태를 다시 읽고 진행했다.
- 새 plan [40326812701](https://github.com/Renagang21/o4o-platform/actions/runs/40326812701) PASS.
  digest: `2d92dacaa5e6e210170e5a3b40a9f4ae3d19c34bf46bc7d14bfb1fe3c8a131a5`.
- cutover [40327360298](https://github.com/Renagang21/o4o-platform/actions/runs/40327360298) PASS.
  main `e18664f89a8e4a1533bfa5103b648ef491ec2956`의 정확한 CI green을 확인하고 실행했다.
  pharmacy·megapharm 두 host의 matcher를 새 backend로 전환했고 다른 matcher는 유지했다.
  새 Run `pharmacy-business-web-00001-4zd`와 두 도메인의 실제 JS digest가 일치했다.
- 전환 직후 브라우저의 데스크톱 홈 요청 1회가 502였으며 다음 전체 재검사는 4/4 HTTP 200.
  홈·로그인 각 390/1440px에서 가로 넘침·페이지 JS 예외가 없었다.
  실제 upstream 응답을 TLS 검증한 Playwright 요청으로 전달했으며 API mock은 사용하지 않았다.
  자동 브라우저에는 Google SDK 로드 오류가 보였으므로 Google OAuth 성공은 검증하지 않았다.
- 사용자가 자신의 브라우저에서 실제 로그인·기본 화면 진입·기존 메뉴 조회 정상이라고 확인했다.
  계정·세션·개인정보는 수집하거나 저장소에 복사하지 않았다.
- 약국 단독 Promote dry-run 40327753635 PASS. 실제 Promote 40328112383은
  `services=kpa-society`만 선택했고 API·Admin 배포는 건너뛰었다. 다른 공간의 API·Neture 배포
  40325558878은 이 작업이 실행한 배포가 아니며 별도로 구분한다.

- 약국 단독 verified rollout [40328112383](https://github.com/Renagang21/o4o-platform/actions/runs/40328112383) PASS.
  읽기 인벤토리 [40328820753](https://github.com/Renagang21/o4o-platform/actions/runs/40328820753)에서
  `pharmacy-business-web-00002-sip` 단일 최신 Ready revision의 트래픽 100%와
  `gcr.io/netureyoutube/pharmacy-business-web:e18664f89a8e4a1533bfa5103b648ef491ec2956`을 재확인했다.
  전환 전 앱 SHA 이후 약국 프런트·관련 공통 UI/auth 경로의 소스 차이는 없었다.
- 새 이미지 배포 후 홈·로그인 × 390/1440px는 4/4 HTTP 200, 가로 넘침·페이지 JS 예외 0.
  로그인 화면의 `accounts.google.com/gsi/client`는 이 환경에서 403이며 관련 console 오류가 있었다.
  이 외 검사한 HTTP 요청 오류는 없었다. Google OAuth 미검증을 전체 콘솔 오류 0으로 대체하지 않는다.

옛 리소스 정리는 아직 진행 중이다. DB 접속·업무 데이터 생성·보정은 수행하지 않았다.


### 삭제 검사 대기 및 GitHub 인증 중단

최소 관측 시간 후 `retire-plan`을 요청했으나 40329765855는 작업 0개 상태로 5분 이상 대기했다.
본인 읽기 전용 run의 취소 요청에 GitHub는 아직 실행 큐에 들어가지 않았다는 409를 반환했다.
읽기 전용 재시도 40330771368도 마지막 조회에서는 queued였다. 이어진 조회가
`401 Bad credentials`로 바뀌어 두 run의 최신 결과·요청 수·참조 검사 결과를 확인하지 못했다.

`retire` 쓰기 모드는 한 번도 요청하지 않았다. 옛 backend·NEG·Run 삭제와 quiet-window 요청 0은
미확인이며, 전체 정리 완료로 판정하지 않는다. 이 작업의 DB 접속·데이터 보정·생성도 없다.

GitHub 연결 복구 후 두 읽기 run의 실제 결과를 먼저 확인하고, stale 대기 run이 남았으면
본인 run만 정리한다. 현재 main·CI·freeze·다른 runtime writer·새 serving을 다시 확인하고
새 `retire-plan`의 참조 완전성·실제 요청 0·digest를 검토한 뒤 `retire`를 진행한다.
이때도 기존 이미지/비활성 revision 이력과 사업 serviceKey는 별도 범위로 유지한다.

`WORKTREE_DISPOSITION`: `KEEP` — 동일 WO의 정리·운영 검증 closure가 남아 있다.
다른 공간의 의도된 파일 삭제 100건 및 기준 checkout은 변경하지 않았다.
