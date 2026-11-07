# O4O 자체 실행기(집 PC) CI 전환 기준 V1

> **상태**: DRAFT
> **작성일**: 2026-11-07 · **최종 갱신**: 2026-11-07
> **근거 WO/IR**: WO-O4O-SELF-HOSTED-CI-PREPARATION-V1 · [`IR-O4O-PRIVATE-CI-BUDGET-V1`](../../investigations/IR-O4O-PRIVATE-CI-BUDGET-V1.md)
> **범위**: 저장소를 private 로 전환한 **뒤** 일반 CI 를 집 PC 실행기로 옮기기 위한 구조 · 준비 절차 · 복귀 절차.
> 이 문서 작성 시점의 상태는 **public 유지 / GitHub 호스팅 실행 유지 / 자체 실행기 미등록 / 저장소 변수 미설정**이다.
> 실기(집 PC) 검증 전이므로 DRAFT 다. §8 실기 확인을 마치면 ACTIVE 로 바꾸고 `CANONICAL-INDEX` 행 추가를 별도 문서 작업으로 한다.

---

## 1. 결론 요약

- 일반 CI job 의 `runs-on` 은 저장소 변수로 GitHub 호스팅 ↔ 자체 실행기를 고를 수 있다.
- **변수가 없으면 지금과 똑같이 GitHub 호스팅**에서 돈다. 이번 변경 병합만으로 실행 장소는 바뀌지 않는다.
- **public 저장소에서는 변수를 잘못 설정해도 자체 실행기로 가지 않는다.** fork PR 도 private 여부와 무관하게 호스팅이다.
- 배포 · GCP 권한 job, CodeQL, Sonar 의 실행 장소와 정책은 그대로다.
- 되돌리기는 **변수 삭제 한 번**이다.

## 2. 선택식과 변수

### 2-1. 변수

| 저장소 변수 | 값 | 효과 |
|---|---|---|
| `CI_RUNNER_LINUX` | `self-hosted` | Linux 일반 CI job → label `[self-hosted, Linux, X64, o4o-ci-linux]` |
| `CI_RUNNER_WINDOWS` | `self-hosted` | Windows 일반 CI job → label `[self-hosted, Windows, X64, o4o-ci-windows]` |
| (미설정 · 빈 값 · 그 밖의 값) | — | `ubuntu-latest` / `windows-latest` (현행) |

- 값은 정확히 `self-hosted` 하나만 인정한다(GitHub expression 비교라 대소문자는 무시). JSON label 을 변수에 직접 넣지 않는다 — 형식 오류로 job 이 시작조차 못 하는 경우를 없애고, label 을 workflow 에 고정해 시험으로 검사하기 위해서다.
- Linux · Windows 는 독립이다. Linux 만 옮기고 Windows 는 호스팅에 두는 구성이 기본 권장이다(§5-3).

### 2-2. 선택식 (문자 그대로 고정)

```yaml
runs-on: ${{ fromJSON(vars.CI_RUNNER_LINUX == 'self-hosted' && github.event.repository.private == true && github.event.pull_request.head.repo.fork != true && '["self-hosted","Linux","X64","o4o-ci-linux"]' || '"ubuntu-latest"') }}
```

Windows 는 변수 · label · 기본값만 다르다. 자체 실행기는 아래 **세 조건이 모두 참**일 때만 선택된다.

1. 변수 == `self-hosted`
2. `github.event.repository.private == true` — public 이면 거짓. payload 에 repository 가 없으면(null) 거짓 → 호스팅
3. fork 에서 온 PR 이 아님

`scripts/ci/__tests__/runner-selection.test.mjs` 가 (a) 전환 대상 job 의 `runs-on` 이 이 문자열과 같은지, (b) 그 밖의 job 과 배포 · CodeQL workflow 에 자체 실행기 참조가 없는지, (c) 이 식을 GitHub expression 의미(피연산자 반환형 `&&`/`||`, 대소문자 무시 비교, 없는 속성 = null)로 평가해 변수 · 공개 여부 · fork · 이벤트 조합별 결과를 고정한다. 이 시험은 CI `Code Quality Check` 에서 blocking 으로 돈다.

### 2-3. schedule 이벤트 — 판정 job

schedule 이벤트에는 repository payload 가 없어 2-2 식이 항상 호스팅을 고른다. 그래서 `scheduled-api-full-jest.yml` 만 짧은 `Select runner` job(GitHub 호스팅 · checkout 없음)이 `GET /repos/{repo}` 의 `private` 을 읽어 label 을 output 으로 넘긴다. API 실패 · public · 변수 없음 · output 공백은 모두 `ubuntu-latest` 다. 이 판정 job 은 하루 1회 호스팅에서 돈다.

### 2-4. reusable workflow

- 전환 대상 workflow 는 어느 것도 `workflow_call` 로 호출되지 않는다(CI Pipeline 은 push · PR · dispatch 진입, `delivery.yml` 은 그 완료를 `workflow_run` 으로 받는다).
- 호출되는 workflow(`deploy-api` · `deploy-web-services` · `deploy-admin`)는 전환 대상이 아니다. 나중에 호출되는 workflow 에 이 식을 쓰더라도 `github` · `vars` 는 호출자(같은 저장소) 기준이므로 판정은 같다 — 단 호출자 이벤트가 schedule 이면 2-3 처럼 호스팅으로 떨어진다.

## 3. job 별 전환 지원

| workflow | job | 분류 | 전환 | 비고 |
|---|---|---|---|---|
| `ci-pipeline.yml` | Detect affected scope | Linux 일반 | 지원 | `fetch-depth: 0` — 실행기에 git ≥ 2.18 필수(없으면 checkout 이 `.git` 없이 받아 판정 불가) |
| | Code Quality Check | Linux 일반 | 지원 | Sonar 단계는 기존대로 private 에서 skip |
| | API Server Jest (1~3/3) | Linux 일반 | 지원 | 실행기 1대면 3 shard 가 순차 → wall-clock 증가 |
| | Build Applications · Web production build | Linux 일반 | 지원 | |
| | Docs Fast · Admin Fast ×2 · Docs sensitive guard | Linux 일반 | 지원 | |
| | Central operator PostgreSQL integration | Linux 일반 | 지원 | service container — 실행기에 Docker 필요. host port `55432` 고정이라 같은 PC 동시 실행 불가(순차 전제) |
| | API production dependency smoke | Linux 일반 | 지원 | `$RUNNER_TEMP` 만 사용 |
| | PC installer Windows | Windows 전용 | 지원(기본 보류 권장) | §5-3 |
| | **CI Gate** | 관리(결과 집계) | 지원 | 이름 · `if: always()` · needs 불변 |
| `scheduled-api-full-jest.yml` | plan · 3 shard · aggregate | Linux 일반 | 지원 | 판정 job(§2-3)은 호스팅 고정 |
| `ci-guard-policy.yml` | Guard Static Analysis | Linux 일반 | 지원 | |
| `ci-appstore-guard.yml` | AppStore Consistency Guard | Linux 일반 | 지원 | |
| `automation-pr-labeler.yml` | Apply Size Labels | 관리 | 지원 | `actions/github-script` 는 runner 내장 Node 로 동작 · `GITHUB_TOKEN` 만 사용 |
| `automation-repo-setup.yml` | Create Missing Labels | 관리 | 보류 | `.github/labeler.yml` 변경 시만 · 실행 빈도가 낮아 효과 없음 |
| `e2e-auth-runtime.yml` | Auth Runtime E2E | 수동 E2E | 보류 | 운영 URL 대상 브라우저 검증 — 실제 browser 환경은 공유 자원(`AGENTS.md` §4-1(g)) |
| `member-sonar-941-readonly.yml` | read-public-report | 일회성 진단 | 보류 | 특정 branch 전용 · 정리 후보(별도 작업) |
| `ci-security.yml` | CodeQL | 보안 | **유지** | private 이용 조건 확인 전 `CODEQL_PRIVATE_ENABLED` 정책 그대로. 실행기 이전으로 라이선스 조건을 우회하지 않는다 |
| `delivery` · `deploy-*` · `promote` · `account-erasure-activation` · `gcp-wif-auth-smoke` · `production-secret-resolution-check` · `pharmacyhub-qr-cutover` | 배포 · GCP | **유지** | OIDC/WIF · `production` Environment · 배포 concurrency · 위험 판정 불변 |

비공개 전환 후에도 위 "보류 · 유지" job 은 GitHub 호스팅 사용량으로 남는다. 조사 기준 월 실행량 중 Delivery · Promote 가 약 4,800분 규모(표본 추정, [`IR-O4O-PRIVATE-CI-BUDGET-V1`](../../investigations/IR-O4O-PRIVATE-CI-BUDGET-V1.md))이므로 "0원" 이 아니다. 절감률은 실측 전 제시하지 않는다.

## 4. 기존 절약 정책과의 관계

변경 없음 — 재사용한다: affected scope 판정(`scripts/ci/detect-affected.mjs`) · 문서/관리자 빠른 경로 · PR 한정 `cancel-in-progress` · `CI_COST_PROFILE=budget` Draft 유예 · pnpm(setup-node) 캐시 · API 의존 빌드 checksum 캐시(`api-build-cache.mjs`) · `CI_BUILD_CACHE_DISABLED`.
검사 범위 축소 · main push 검증 취소 같은 최적화는 이번 범위가 아니다.

## 5. 자체 실행기의 잔존 파일 · 프로세스 안전성

### 5-1. 이미 보장되는 것 (변경 불필요)

| 위험 | 현행 동작 |
|---|---|
| 이전 빌드 산출물(dist · node_modules)이 다음 검사를 통과시킴 | `actions/checkout` 기본 `clean: true` 가 작업 폴더에서 `git clean -ffdx` + `reset --hard` 를 한다(ignore 파일 포함 삭제). workflow 어디에도 `clean: false` 가 없다. API 의존 빌드 캐시는 복원 뒤 checksum 검증 · 불일치 시 정리 후 재빌드 |
| 다른 branch · PR 의 캐시 오용 | `actions/cache` 범위 규칙(ref 단위 + 기본 branch 상속)은 실행기 종류와 무관하게 GitHub 가 적용한다. pnpm store 는 내용 주소 기반이고 설치 시 `--verify-store-integrity=true` |
| 임시 파일 | `$RUNNER_TEMP` 는 job 마다 실행기가 비운다. PC 설치 테스트는 `os.tmpdir()` 아래 임시 폴더를 만들고 `afterEach` 로 지운다 |
| 테스트 DB 컨테이너 | `services:` 컨테이너와 network 는 job 종료 시 실행기가 제거한다 |
| 남은 백그라운드 프로세스 | 실행기의 job 종료 처리(process cleanup)가 job 이 띄운 orphan 프로세스를 종료한다 — 실기 확인 항목 |
| Jest transform 캐시 | 기본 위치는 OS 임시 폴더(`/tmp/jest_*`)로 job 간 남는다. 키가 파일 내용 + 설정 해시라 branch 간 오용은 없고, 용량만 관리 대상(§7-9). scheduled `cache_mode=disabled` 는 `--no-cache` |

### 5-2. 이번에 추가한 것

- **Windows 실제 Local Agent 보호 단계** — `PC installer Windows` 테스트는 설치한 runtime 을 `127.0.0.1:47821`(LOCAL_AGENT_PORT)에 띄운다. 자체 실행기(`runner.environment == 'self-hosted'`)에서만 이 포트가 이미 열려 있는지 확인하고, 열려 있으면 **실제 agent 를 건드리지 않고** job 을 실패시킨다(종료 · 재시작 명령 0). 호스팅에서는 skip.
- 광범위 삭제 명령은 추가하지 않았다.

### 5-3. Windows job 권장: 호스팅 유지

집 PC 에서 실제 Local Agent 를 함께 쓴다면 `CI_RUNNER_WINDOWS` 를 설정하지 않는다. 포트 · Chrome native host · Extension · 실 PC smoke 는 worktree 로도 분리되지 않는 공유 자원이다(`AGENTS.md` §4-1(h)). 이 job 은 10분 제한의 짧은 job 이다. 옮기려면 Local Agent 를 쓰지 않는 시간대 · 상태를 먼저 정한다.

### 5-4. Windows ↔ WSL 분리

- Linux 실행기는 WSL2 Ubuntu 의 **Linux 파일시스템**(`/home/<runner>/...`) 아래에만 둔다. `/mnt/c/...` 에 작업 폴더를 두지 않는다(느리고 권한 · 줄바꿈이 섞인다).
- Windows 실행기는 `C:\actions-runner\...` 에 별도로 둔다. 두 실행기는 작업 폴더 · `node_modules` · 도구 캐시를 공유하지 않는다.

## 6. private 전환 전 확인 목록

| 항목 | 2026-11-07 상태 | 결정 · 확인 |
|---|---|---|
| 개인 계정 플랜 | **미확인** (이 세션 권한으로 조회 불가) | Free 라면 private 저장소에서 ruleset/branch protection 강제와 Environment 배포 branch 제한을 쓸 수 없다 — 현행 `main` ruleset(`CI Gate` required)과 `production` Environment ref 경계를 유지하려면 **GitHub Pro**(GitHub 요금제이며 ChatGPT Pro 와 무관)가 필요하다. 전환 직전 GitHub 공식 요금 문서로 재확인 |
| `main` ruleset | 2026-10-04 기록값: PR 필수 · required `CI Gate` · 삭제/non-FF 금지 · human approval 0 · admin bypass 가능 (`AGENTS.md` §4-1(e)). 이번 재조회 **미실행** | 전환 직후 read-only 재확인. 이름 `CI Gate` 는 이번 변경에서 불변 |
| 배포 태그 ruleset | **미확인** | 통합 담당이 read-only 조회 |
| `production` Environment · 배포 ref 제한 | 문서 기록: `main` · `deploy/*` 만 · required reviewer 없음 · production credential 7개 Environment 전용 (`.github/workflows/README.md`) | 플랜 확인과 함께 private 에서 유지되는지 확인 |
| 일반 CI 의 시크릿 사용 | 전환 대상 job 은 `GITHUB_TOKEN` 외 시크릿을 읽지 않는다(코드 확인) | 집 PC 에 production credential 이 내려가지 않는 구조 유지 |
| `GITHUB_TOKEN` 기본 권한 | `ci-pipeline.yml` 은 top-level `permissions` 미지정 → 저장소 기본값을 따른다 | 자체 실행기 사용 전 저장소 기본값을 read-only 로 두는 것 권장(사용자 결정 · 설정 변경은 별도) |
| CodeQL private | 현행 `CODEQL_PRIVATE_ENABLED` 미설정 = private 에서 자동 생략 | 개인 계정 private 저장소의 Code Scanning 이용 조건(GitHub Code Security) 확인 후 결정 |
| Sonar | private 에서 PR 진단 조회 · 업로드 단계 skip(기존 코드) | SonarCloud private 프로젝트 요금 조건 확인 |
| 자체 실행기 과금 | **현재 무료.** GitHub 공식 안내 기준 자체 실행기의 Actions 사용에는 분당 요금이 없다. 2025-12-16 공지된 self-hosted 분당 플랫폼 요금(2026-03-01 시행 예정 · $0.002/분)은 GitHub changelog 갱신으로 **연기**됐고 새 시행일은 공지되지 않았다. 전기료 · 하드웨어는 별도 | 재공지 시 `scripts/ci/actions-cost.mjs` 의 `SELF_HOSTED_USD_PER_MINUTE` 한 곳만 바꾼다. 전환 직전 billing 문서 · changelog 재확인 |
| Actions · Artifacts · Cache 비용 관리 | 미확인 | artifact `retention-days`(대부분 7일) 유지 · 저장 공간 사용량 확인 |
| 예산 알림 · 실제 사용 차단 | 미확인 | 예산을 "알림만" 이 아니라 **한도 도달 시 차단(stop usage)** 으로 둘지 결정 |
| 과거 비밀값 노출 점검 | 이번 작업에서 전체 이력 검사 **미실행** — 범위가 커서 후속 작업으로 분리 | private 전환은 노출 이력의 해결이 아니다. 별도 WO 로 secret scanning · 이력 점검 |

## 7. 집 PC 준비 절차 (실행기 등록 전 단계)

> 이 절의 명령은 사용자가 집 PC 에서 직접 실행한다. **실행기 등록(§9)은 private 전환 후에만** 한다.
> 버전 고정 값은 이 문서에 복제하지 않는다 — Node · pnpm 은 workflow 의 `setup-node` · `pnpm/action-setup` 이 job 마다 받는다.

### 7-1. WSL2 · 가상화 확인 (PowerShell, 관리자)

```powershell
wsl --version
wsl --status
wsl --list --verbose
```

`wsl --version` 이 없거나 WSL 1 이면 Microsoft Store 판 WSL 로 업데이트한다(`wsl --update`). 작업 관리자 → 성능 → CPU 의 "가상화: 사용" 을 확인하고, 꺼져 있으면 BIOS 에서 Intel VT-x 를 켠다.

### 7-2. Ubuntu 설치

```powershell
wsl --install -d Ubuntu-24.04
```

WSL 가상 디스크는 기본적으로 `%LOCALAPPDATA%` 아래(C: SSD)에 생긴다. D: 로 옮기지 않는다.

`%UserProfile%\.wslconfig` (메모리 64GB 중 CI 상한 · 순차 실행 기준 예시):

```ini
[wsl2]
memory=32GB
processors=10
swap=8GB
```

### 7-3. Ubuntu 기본 도구 · systemd

```bash
sudo apt-get update
```

```bash
sudo apt-get install -y git curl ca-certificates unzip build-essential python3
```

`/etc/wsl.conf`:

```ini
[boot]
systemd=true
```

적용: PowerShell 에서 `wsl --shutdown` 후 다시 열고 `systemctl is-system-running` 확인(`running` 또는 `degraded`).

### 7-4. Docker Engine (WSL 안)

`Central operator PostgreSQL integration` 의 service container 에 필요하다. Docker Desktop 대신 Ubuntu 에 Docker Engine 을 설치한다(로그인 없이 systemd 로 시작 가능). 설치는 Docker 공식 문서 "Install Docker Engine on Ubuntu" 의 apt repository 절차를 그대로 따른다. 설치 후:

```bash
sudo systemctl enable --now docker
```

```bash
sudo docker run --rm hello-world
```

### 7-5. 전용 사용자 · 디렉터리

```bash
sudo useradd --create-home --shell /bin/bash o4o-runner
```

```bash
sudo usermod -aG docker o4o-runner
```

```bash
sudo -u o4o-runner mkdir -p /home/o4o-runner/actions-runner
```

- 실행기 작업 폴더 · 도구 캐시 · pnpm store 는 모두 `/home/o4o-runner` 아래(C: SSD 의 WSL 디스크)다.
- 이 사용자에는 gcloud 인증 · GitHub 개인 토큰 · 운영 DB 접속 수단을 두지 않는다.
- docker 그룹은 사실상 root 권한이다. 이 PC 의 실행기는 **이 저장소 전용**으로만 등록한다.

Windows 실행기(옮기는 경우만): 로컬 일반 사용자(관리자 아님)를 만들고 `C:\actions-runner\o4o-windows` 를 그 사용자 권한으로 준비한다.

### 7-6. 절전 · 최대 절전 끄기 (PowerShell, 관리자)

```powershell
powercfg /change standby-timeout-ac 0
```

```powershell
powercfg /change hibernate-timeout-ac 0
```

```powershell
powercfg /hibernate off
```

Windows Update 의 "사용 시간" 을 설정해 작업 중 재부팅을 줄인다.

### 7-7. 부팅 후 WSL 자동 시작 (로그인 불필요)

systemd 서비스가 등록돼 있어도 **WSL 자체는 Windows 가 부팅됐다고 시작되지 않는다.** 두 가지를 따로 확인한다.

1. 작업 스케줄러에 작업 생성 — 트리거 "시스템 시작 시", "사용자의 로그온 여부에 관계없이 실행", 실행 계정은 WSL 배포판을 설치한 Windows 사용자, 동작:
   `wsl.exe -d Ubuntu-24.04 --exec /bin/sh -c "exec sleep infinity"` — 이 프로세스가 살아 있는 동안 배포판이 유휴 종료되지 않는다.
2. 재부팅 후 **로그인하지 않은 상태로 몇 분 기다린 뒤** 다른 기기에서 GitHub Settings → Actions → Runners 의 상태가 Idle 인지 본다(§9 등록 후). 로그인해야만 Idle 이 되면 1 의 설정을 다시 확인한다.

Windows 자동 로그인은 요구하지 않는다.

### 7-8. 재부팅 후 확인 목록

- `systemctl is-active docker` · 실행기 서비스(`systemctl list-units 'actions.runner.*'`) active
- GitHub Runners 화면 Idle · 간단한 workflow 1회 성공
- `df -h /` 와 Windows C: 여유 공간

### 7-9. 디스크 · 로그 · 캐시 관리 (경로를 지정해 정리)

| 대상 | 위치 | 정리 |
|---|---|---|
| 실행기 진단 로그 | `/home/o4o-runner/actions-runner/_diag` | 30일 지난 파일만: `find /home/o4o-runner/actions-runner/_diag -type f -mtime +30 -delete` |
| 도구 캐시(Node 버전들) | `/home/o4o-runner/actions-runner/_work/_tool` | 현재 workflow 가 쓰지 않는 버전 폴더만 수동 삭제 |
| pnpm store | `sudo -u o4o-runner pnpm store path` 로 확인 | `pnpm store prune` (실행기 Idle 일 때) |
| Jest 캐시 | `/tmp/jest_*` | 실행기 Idle 일 때 해당 패턴만 삭제 |
| Docker | 이미지 · 정지 컨테이너 | `docker image prune -f --filter "until=168h"` · `docker container prune -f` |
| WSL 가상 디스크 | C: 의 `ext4.vhdx` | 삭제해도 자동으로 줄지 않는다 — 공간 회수는 별도 절차(`wsl --manage <distro> --set-sparse true` 등) 확인 후 |

작업 폴더 전체 · 홈 전체를 지우는 명령은 쓰지 않는다. 경보 기준 예: C: 여유 40GB 미만이면 정리.

### 7-10. 대표 작업 로컬 측정 (등록 전, `o4o-runner` 로)

저장소를 `/home/o4o-runner/measure/o4o-platform` 에 clone 하고 [SETUP.md](../../../SETUP.md) 설치 절차 후:

```bash
/usr/bin/time -v pnpm install --frozen-lockfile
```

```bash
/usr/bin/time -v bash -c 'cd apps/api-server && npx jest --maxWorkers=1 --shard=1/3'
```

기록: 경과 시간 · `Maximum resident set size` · 작업 폴더 `du -sh` · 실행 중 `free -g`. 호스팅 job 시간(Actions 화면)과 비교한다. 측정용 clone 은 실행기 작업 폴더와 분리한다.

### 7-11. 순차 실행 · 대기열 측정 (등록 후)

- 실행기는 OS 별 1개로 시작한다(동시 1 job). CI Pipeline 1회의 job(최대 약 12개)이 순서대로 돈다.
- PR 1건과 main push 1건이 겹칠 때의 전체 대기 시간을 Actions 화면 job 의 생성 → 시작 시각으로 기록한다.
- 동시 실행(실행기 2개 이상)은 이 측정 후 판단한다. `55432` 고정 포트처럼 같은 PC 에서 겹치면 안 되는 job 이 있다(§3).
- 비용 집계: `node scripts/ci/actions-cost.mjs --repo Renagang21/o4o-platform --from <YYYY-MM-DD> --to <YYYY-MM-DD>`. self-hosted label job 은 중단하지 않고 `estimatedSelfHostedMinutes`(올림 없는 실제 실행 시간)로 따로 모으고, GitHub 실행기 job 은 기존대로 `estimatedHostedMinutes` · `grossEstimatedUsd`(job 별 분 단위 올림 · 표준 요금)로 계산한다. 자체 실행기 요금은 `SELF_HOSTED_USD_PER_MINUTE`(현재 0) 이며 전기료는 포함하지 않는다. 대기열 시간은 집계하지 않는다.

## 8. 실기 확인 항목 (이 문서를 ACTIVE 로 바꾸기 전)

- [ ] label 매칭 — `o4o-ci-linux` 실행기가 Linux job 만, `o4o-ci-windows` 가 Windows job 만 받는다
- [ ] `Detect affected scope` 가 full history 로 판정한다(git 버전)
- [ ] sparse checkout job 과 일반 checkout job 이 같은 작업 폴더를 번갈아 쓸 때 상태가 섞이지 않는다
- [ ] service container(PostgreSQL 15) 기동 · 종료 후 컨테이너/네트워크 잔존 0
- [ ] job 종료 후 남은 node/jest 프로세스 0
- [ ] API Jest 3 shard 순차 실행의 메모리 · 시간
- [ ] `CI Gate` 가 실패 · 취소를 그대로 실패로 보고
- [ ] 재부팅(로그인 없음) 후 실행기 Idle 복귀
- [ ] 변수 삭제 후 다음 run 이 호스팅으로 돌아감

## 9. 적용 순서 (private 전환 후)

1. §6 결정 완료(플랜 · ruleset · Environment · 예산 차단 · CodeQL/Sonar).
2. 저장소 private 전환 → ruleset · `production` Environment 가 유지됐는지 read-only 확인.
3. 실행기 등록 — GitHub Settings → Actions → Runners → New self-hosted runner 에서 **화면이 주는 다운로드 · 검증 · 등록 명령**을 `o4o-runner` 로 실행한다. 등록 토큰은 화면에서만 쓰고 저장 · 공유하지 않는다. `config.sh` 에 `--labels o4o-ci-linux --unattended` 를 더하고, 서비스 설치는 `sudo ./svc.sh install o4o-runner` → `sudo ./svc.sh start`.
   (Windows 를 옮기는 경우에만: 같은 화면의 Windows 명령 + `--labels o4o-ci-windows --runasservice`.)
4. 이 시점까지 변수는 없다 → 모든 job 은 여전히 호스팅. 실행기가 Idle 인지만 본다.
5. `CI_RUNNER_LINUX=self-hosted` 설정 → Draft 가 아닌 시험 PR 1건으로 §8 확인.
6. 1~2주 측정 후 동시 실행 · Windows 이전 여부 판단.

## 10. GitHub 호스팅 복귀

1. 저장소 변수 `CI_RUNNER_LINUX` (와 `CI_RUNNER_WINDOWS`) **삭제**. 다음 run 부터 호스팅.
2. 이미 자체 실행기 label 로 대기 중인 job 은 자동으로 옮겨가지 않는다 → 해당 run 을 취소하고 re-run.
3. 실행기를 영구 제거할 때만: 서비스 중지(`sudo ./svc.sh stop` · `uninstall`) → GitHub 화면의 제거 토큰으로 `./config.sh remove`.
4. 저장소를 다시 public 으로 바꾸면 선택식이 자동으로 호스팅을 고르지만, 그 전에 실행기를 먼저 제거한다.
