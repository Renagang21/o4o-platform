# 로컬 통합 요청 — 서비스·협동조합 Hero main 병합·배포

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

- 작성일: 2026-10-20
- 상태: COMPLETED
- 최종 갱신: 2026-10-20 (실행 결과: [CHECK](../checks/CHECK-O4O-SERVICE-HERO-OPERATOR-COMPLETION-V1.md) 마지막 절 · 실제 operator 로그인 검증은 미검증으로 보고)
- 저장소: `Renagang21/o4o-platform`
- 작업 branch: `wo/service-hero-operator-completion`
- 검증한 코드 commit: `604910d2fc245e086a22e493273f86537330b1b5`
- 코드에 통합한 main: `5b2f6bd9ee`
- 승인: 사용자가 **main 병합 → 배포**, 이후 **로컬 실행용 작업 요청서 작성**을 명시했다. 이 요청서를 받은 로컬 공간이 이번 작업의 통합 담당이다.

## 1. 요청과 완료 범위

기존 작업 branch를 가져와 최신 main과의 관계를 확인하고, 기존 PR 재사용 또는 PR 생성 → 필수 CI·Codex 검토 → main 병합 → post-merge CI → 운영 배포 → 결과 확인까지 진행한다. 이번 문서가 추가된 branch의 최신 HEAD를 조회해 사용하며, 위 코드 commit이 포함돼 있는지 확인한다. 코드 commit만 배포 SHA로 사용하지 않는다.

클라우드에서는 Git fetch/push가 성공하지만 `api.github.com` CONNECT가 환경 프록시에서 403으로 차단됐다. 따라서 이 작업의 PR 조회·생성·원격 CI/리뷰·main 병합·배포는 실행하지 못했다. 기존 PR이 없다고 단정하지 말고 로컬에서 먼저 조회한다. 새 토큰을 문서/채팅에 기록하거나 클라우드 네트워크를 우회할 필요는 없다.

## 2. 구현 내용과 보존할 경계

| 영역 | 구현 |
|---|---|
| Pharmcoop 연합회 | `/operator/home-presentation`, 현재 연합회 admin/operator만 편집 |
| 개별 협동조합 | `/:cooperativeSlug/operator/home-presentation`, 현재 해당 조합의 `cooperative_roles`로 편집 |
| Pharmacy·드럭스토어형 약국 | 기존 게시 Hero를 회원 홈 상단에 한 번 표시. 미게시·숨김·오류 시 기존 간결한 제목 유지 |
| O4O 대표 메인 | 옛 홈페이지 CMS의 Hero 편집 탭을 현행 관리 링크로 정리. 기존 데이터 삭제/이전 없음 |

- 연합회 역할만으로 개별 조합을 편집할 수 없다. 개별 조합 operator에게 Neture 역할/가입을 추가로 강제하지 않는다.
- 서버가 활성 조합·연결 사업·조직 ID를 해석한다. 저장 트랜잭션에서 현재 권한을 재확인하며 기존 조합 관리와 동일 조합 row를 잠근다.
- 기존 CMS 예약 metadata·revision 충돌·초안/공개 분리·게시 기간·안전 URL 검증을 사용한다.
- main의 #730 협동조합 회원 기능과 #732 서비스별 Hero 디자인을 통합했다. 이 기능들을 되돌리지 않는다. 연합회/개별 조합 디자인 정보도 추가했고 드럭스토어형 약국의 businessKey 시각 구분을 유지했다.
- **이번 변경에 신규 schema·migration·dependency/lockfile·workflow·IAM 변경은 없다.** 기존 운영자 지정·가입 상태·회원/상품 데이터는 변경하지 않았다.

## 3. 착수·PR·병합

`AGENTS.md`, `SETUP.md`, 현재 Delivery/Promote/Pharmcoop workflow를 먼저 확인한다. 공유 checkout의 branch를 바꾸거나 다른 작업을 정리하지 않는다. 기존 해당 작업 전용 worktree가 있으면 소유권을 확인해 사용하고, 없으면 저장소 규칙에 따른 별도 worktree에서 진행한다. 로컬의 오래된 branch를 그대로 배포하지 않는다.

아래는 저장소 안에서 실행하는 PowerShell 예시다. 경로·PR 번호·실행 ID는 실제 조회 결과를 사용한다.

```powershell
$repo = 'Renagang21/o4o-platform'
$branch = 'wo/service-hero-operator-completion'
git status --short
git worktree list
git fetch origin main
git fetch origin $branch
$sourceSha = (git rev-parse FETCH_HEAD).Trim()
git merge-base --is-ancestor 604910d2fc245e086a22e493273f86537330b1b5 $sourceSha
if ($LASTEXITCODE -ne 0) { throw '검증한 코드 commit이 없는 branch입니다. 원격 HEAD부터 확인하세요.' }
gh api "repos/$repo/rulesets"
gh pr list --repo $repo --head $branch --state all
```

1. 같은 branch의 PR이 있으면 상태·HEAD를 확인해 재사용한다. 이미 병합됐다면 main 포함 여부와 배포 결과부터 확인하고 중복 병합/배포하지 않는다.
2. 최신 main과의 추가 충돌·의미 충돌을 검토한다. 필요한 수정은 이번 작업 범위에서만 하고 같은 원격 branch에 추가 push한다. force push·main 직접 push를 사용하지 않는다.
3. PR이 없다면 아래 제목/본문으로 생성한다. 본문은 UTF-8 파일에 실제 줄바꿈으로 저장해 `--body-file`로 전달한다.

```powershell
gh pr create --repo $repo --base main --head $branch --title 'feat: 서비스·협동조합 operator Hero 관리 정비' --body-file <PR-본문-파일>
```

**PR 본문:**

> Pharmcoop 연합회와 개별 조합 operator가 자기 공간의 Hero를 편집·공개하도록 기존 CMS/홈 편집 기반을 연결합니다. 연합회 역할과 개별 조합 역할을 분리하고 저장 시 현재 권한을 재확인합니다. Pharmacy/드럭스토어형 약국의 기존 게시 Hero는 상단에 한 번 표시하며 대표 메인의 중복 Hero 편집 경로를 정리합니다.
>
> 최신 main의 협동조합 회원 기능과 서비스별 Hero 디자인을 보존해 통합했습니다. schema/migration·dependency·workflow·IAM 변경은 없습니다. 실제 운영 계정·데이터 변경은 미실행입니다. 로컬 검증 결과와 최초 실패·재검증은 CHECK에 기록했습니다. 원격 CI/검토 및 배포 결과는 통합 실행 후 추가 기록합니다.

4. 실제 main ruleset의 필수 check, 현재 PR HEAD의 CI 성공, Codex blocker/미해결 검토를 확인한다. 사람의 별도 승인 수를 임의로 추가하지 않고 현재 규칙을 따른다. 로컬 PASS로 원격 CI를 대신하지 않는다. 우회 옵션은 사용하지 않는다.
5. 검증한 PR HEAD를 고정해 정상 PR merge한다. 예: `gh pr merge <PR번호> --repo $repo --merge --match-head-commit <검증한-PR-HEAD>`.
6. merge commit과 main HEAD를 다시 조회한다. 아래 단계의 대상 SHA는 **병합 후 현재 main의 40자리 SHA**다. main이 이동하면 새 범위와 CI를 재확인한다. PR head나 merge 전 SHA를 배포하지 않는다.

## 4. 일반 운영 배포

```powershell
$target = (gh api "repos/$repo/commits/main" --jq '.sha').Trim()
gh run list --repo $repo --workflow ci-pipeline.yml --commit $target --limit 5
gh run list --repo $repo --workflow delivery.yml --commit $target --limit 5
gh api "repos/$repo/commits/$target/status" --jq '.statuses[] | select(.context == "production") | {state,description,target_url}'
```

- 해당 main의 **post-merge CI Pipeline 성공**을 확인하고 자동 Delivery의 판정·실행을 확인한다. 이미 실행 중인 동일 배포가 있으면 중복 dispatch하지 않는다.
- `HELD_LEVEL_3` 등 정식 승격이 필요한 상태라면 사용자 승인된 배포 범위에서 아래 Promote를 사용한다. 서비스 선택을 비워 eligible 대상 전체를 판정하게 한다. API만 선택하고 전체 배포 완료로 보고하지 않는다.

```powershell
gh workflow run promote.yml --repo $repo --ref main -f "sha=$target"
gh run list --repo $repo --workflow promote.yml --commit $target --limit 5
```

- 실행 ID를 확인해 `gh run watch <실행ID> --repo $repo --exit-status`로 종료까지 추적한다.
- API 선행 및 각 웹의 새 revision 검사·트래픽 전환·serving SHA 검증이 성공했는지 확인한다. **workflow SUCCESS만으로 완료 판정하지 않는다.** `production`이 `pending / HELD_* / NOT_SELECTED`이면 잔여 대상이 있다.
- freeze·CI·ref·실행 계정·현재 main SHA gate를 우회하거나 배포 설정을 바꾸지 않는다. 이번 코드에는 migration이 없으며, 실제 serving→main 누적 변경에서 다른 migration/미승인 운영 변경이 발견되면 해당 정본과 승인 범위를 확인한다.

## 5. Pharmcoop 웹 별도 배포 — 반드시 포함

일반 Delivery 완료만으로 Pharmcoop 프런트엔드가 배포됐다고 판단하지 않는다. 같은 `$target`의 API가 실제 serving 중인지 먼저 확인하고, 기존 별도 workflow를 사용한다. 해당 workflow는 repository owner 실행 및 freeze/ref/CI gate를 검사한다.

```powershell
gh run list --repo $repo --workflow deploy-cooperative.yml --commit $target --limit 5
# 동일 SHA의 성공 실행이 이미 있으면 결과를 재사용하고 중복 실행하지 않는다.
gh workflow run deploy-cooperative.yml --repo $repo --ref main -f "sha=$target" -f frontend_only=true -f apply=false
```

- 기존 실행이 없거나 미완료일 때만 dispatch한다. `frontend_only=true`, `apply=false`를 유지하며 계정 이메일을 입력하지 않는다. 조합 fixture 생성/등록/운영자 지정은 이번 배포에 포함하지 않는다.
- 해당 실행의 인증된 private revision `/`, `/test`, `/login` 검사, 트래픽 100% 전환 및 전환 후 확인이 성공해야 한다. 검사 실패 시 기존 트래픽을 유지하고 원인을 조사한다. 수동 강제 전환·검사 생략·IAM 공개 변경은 하지 않는다.
- 이전 공개 도메인 403은 사용자가 정상 화면으로 해결 확인했다. 과거 장애를 현재 장애로 단정하지 말고 실제 공개 응답을 다시 확인한다.

## 6. 배포 후 확인과 최종 보고

1. API 준비 상태, 대표/공급자/펀딩/커뮤니티/강의/Pharmacy/CarePharm/드럭스토어형 약국/Pharmcoop의 해당 홈을 확인한다. 새 관리 API 비로그인 요청은 401, 실제 허용/차단은 서비스·조합별로 확인한다.
2. 연합회 operator는 `/operator/home-presentation`, 개별 조합 operator는 `/:실제조합주소/operator/home-presentation`에 접근한다. 연합회 역할만으로 개별 조합을 편집하거나 다른 조합으로 넘어갈 수 없어야 한다.
3. 운영 계정 정보는 `docs/local/TEST-ACCOUNTS.local.md` 정본에서 확인한다. 파일/대상/원복 범위가 없으면 예전 계정이나 임의 Demo/seed로 대체하지 않는다. 실제 Hero 내용을 임의 변경하거나 검증을 이유로 새 조합·회원·역할을 만들지 않는다. 운영에서 확인하지 못한 업무는 미검증으로 보고한다.
4. 성공·실패, 미검증, 남은 작업을 구분해 기존 CHECK와 PR 설명에 기록한다. PR 번호/URL, 최종 PR HEAD, main merge/배포 SHA, CI·Promote·Pharmcoop 실행 ID/URL, 실제 serving 확인, 공개 확인 결과를 포함한다. 문서 후속 commit만 생긴 경우 코드가 추가 배포됐다고 표현하지 않는다.
5. main 반영·post-merge CI·배포·후속 검증 완료 뒤에만 자기 로컬 작업공간을 AGENTS 생명주기 규칙에 따라 정리한다. 클라우드나 다른 세션의 worktree/branch는 정리하지 않는다.

## 참고 — 이미 실행한 검증

- 코드 개발: 실제 PostgreSQL CMS 17개 + 조합 권한/HTTP 5개 PASS. 테스트 schema 잔존 0 확인·전용 DB 삭제·서버 중지 완료.
- main `5b2f6bd9ee` 통합: 공통 UI 142개, 협동조합 62개, API route 28개, Neture/CarePharm 52개 PASS.
- 약국 사업 75개 중 최초 두 건은 기본 대기 안에 요소를 찾지 못했으며 해당 파일 단독 22개 재실행 PASS. timeout/assertion 완화 없음. 최초 나머지 53개 PASS.
- 통합 후 API 타입/tsup, 공통 패키지, Pharmcoop/KPA/Neture 운영 빌드 PASS. 충돌 해소 중 잘못 전달된 광고 prop 타입 오류를 수정한 뒤 재빌드 PASS.
- 최종 Chromium 운영 번들 PC 1440·모바일 390: 연합회/조합 12개 + Pharmacy/드럭스토어형 약국 4개 PASS. 실패 입력 보존·재시도·공개 소비·권한 경계·가로 넘침/pageerror 0 확인. 합성 인증/API fixture이며 실제 운영 로그인 검증과 구분한다.
- 개발 단계 root lint ratchet 기존 오류 기준선 PASS, 통합 수정 대상 ESLint 오류/경고 0. 원격 CI는 미확인이다.

관련 기록:

- [구현 TODO](TODO-O4O-SERVICE-HERO-OPERATOR-COMPLETION-V1.md)
- [구현·통합 CHECK](../checks/CHECK-O4O-SERVICE-HERO-OPERATOR-COMPLETION-V1.md)

문서 정합: 이 문서는 로컬 통합 실행 요청이다. 기존 구현 기록의 미실행 상태를 병합/배포 성공으로 바꾸지 않는다.
