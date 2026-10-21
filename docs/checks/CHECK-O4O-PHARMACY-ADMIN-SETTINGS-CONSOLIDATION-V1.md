# 약국 서비스 설정 통합 개발 검증

> **상태**: IN_PROGRESS
> **작성일**: 2026-10-21 · **최종 갱신**: 2026-10-21 (Asia/Seoul)
> **근거 WO/IR**: [구현 TODO](../work-orders/TODO-O4O-PHARMACY-ADMIN-SETTINGS-CONSOLIDATION-V1.md)
> **관련 정본**: [약국 설계 §15-7](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) · [공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)

## 범위·기준

Repository `Renagang21/o4o-platform`, base `622aafc82814aedd4a0878f28101e56ff686219a`, branch `wo/pharmacy-admin-settings-consolidation`, 전용 worktree `/workspace/o4o-wt/pharmacy-admin-settings-consolidation`에서 수행했다. 이전 완료 branch와 기준 checkout은 변경하지 않았다. 사용자가 승인한 종료점은 개발·검증·commit·push다. PR 생성·병합·배포는 실행하지 않는다.

## 최종 변경

- 독립 약국 협력사업 메뉴를 제거하고 약국 서비스 설정의 기능 설정/회원 이용 자격 탭으로 통합했다.
- 기본 제공(전체 약국)·유료회원·기존 협력사업 가입자를 선택해 기능을 설정한다. 사업 정보는 선택 사업 아래 접어서 배치하고 기능 편집을 중복하지 않는다.
- 사업 추가는 대화상자로 연다. 기존 서비스는 이름으로 고르고 내부 key를 외우지 않는다. 기타 사업의 기존 식별자 입력은 명시 선택 시에만 나타난다. 신규 등록에서 기능을 자동 부여하지 않으며 등록 후 같은 기능 설정에서 선택한다. 중복 등록·등록 실패·포커스 이동·Escape/Tab 경계를 유지한다.
- 구 `/admin/semi-franchises`는 query를 보존해 통합 주소로 이동한다. 운영자 화면에서 생성하는 링크도 통합 주소를 쓴다. `register=carepharm/megapharm/pharmcoop`, 연합회 조회와 기존 권한 경계를 검증했다.
- 협동조합 연합회는 관리자 wrapper의 기존 조회 패널로 유지한다. 별도 사업 행이나 개별 조합 권한·기능 정책을 만들지 않는다.
- 사업 정보에서 담당자와 중앙 `/operators` 연결을 제공한다. 기존 개별 담당 원장은 runtime 접근 조건이므로 중앙 운영자 화면으로 조회·해제를 이동했다. 기타 사업의 기존 지정은 사용자 후보 검색·선택을 사용하며 서버의 현재 Neture 운영 자격 검사는 그대로다. UUID 수동 입력은 제거했다.
- 회원 이메일 조회와 기존 유료 활성/해제·한국시간 만료일 설정을 유지했다. 새 전체 관리자 전용 읽기 API로 현재 경영자 관계의 약국·가입 상태·공통 resolver의 기능 제공 근거를 표시한다. 저장 성공 후 근거를 다시 조회한다. 조회 실패·잘못된 응답·미승인 약국·소유자 불명확은 정상적인 미제공과 구분한다.
- 현장 요구 집계의 관리자 화면/사라진 UI 소비처를 제거했다. 기존 수집·저장·관리자 API는 보존하며 서비스 운영자에게 전역 집계 조회를 새로 허용하지 않는다.

## 유지한 경계

기본+유료+활성 사업의 기능 합산, 한 자격 해제 후 다른 제공 근거 유지, 경영자 회원 자격·직원 허용, 전문인 확인·매장 접근은 기존 공통 판정을 사용한다. 조회 화면의 제공 기능은 실제 이용 시의 계정/매장/직원/약사 확인을 대신하지 않는다고 명시했다. 유료 등급·요금·자동 과금·가입 승인·role 발급 정책은 추가하지 않았다.

사업 정보 저장은 `serviceFeatures`를 보내지 않는다. 결제 수취 키는 관리자가 실제 변경한 경우에만 기존 PATCH로 보낸다. DB schema/migration·seed·운영 데이터 변경은 없다. 신규 GET은 전체 관리자 guard, private/no-store, 읽기 SELECT, 오류 시 503을 사용한다.

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| 공통 pharmacy-management UI | Vitest 7 files / 51 tests PASS |
| 관리자 전체 UI | Vitest 28 files / 431 tests PASS |
| Neture wrapper·메뉴·hostProfile | Vitest 3 files / 55 tests PASS |
| API 집중 회귀 | Jest 6 suites / 37 tests PASS — 기능 합산·직원/사업 경계·사업 관리·신규 조회·401/403/404/503·no-store·원본 데이터 비노출 |
| Chromium desktop/mobile | 4 PASS — 1280×800 / 390×844, 실제 관리자 앱의 설정 저장·해제·대화상자·포커스/Escape·탭 키보드 이동·기능 자동 부여 0·유료 해제 후 사업 제공 유지·구 주소 새로고침·비인가/비로그인 경계·pageerror 0·가로 넘침 0 |
| 타입 검사 | API / 관리자 PASS |
| 변경 TS/TSX lint | 오류 0, 기존 경고 2(OperatorsPage fetchUsers 의존성, routes의 _next 미사용) |
| 최종 빌드 | API TypeScript / 관리자 Vite / Neture Vite PASS |
| 문서/범위 검사 | 변경 문서 3개 민감정보 0건, 신규 문서 상대 링크·git diff --check PASS. staged 35건 모두 작업 범위 PASS |

초기 직접 `build:deps`는 새 worktree에 일부 dist가 없어 실패했다. SETUP.md의 의존 순서 filtered build로 재구성한 뒤 타입·빌드를 검증했다. Neture Vitest는 루트 config 실행이 기준이며 처음 workspace cwd로 실행한 결과는 테스트 0건으로 실패했으므로 PASS에 산입하지 않았다. API HTTP 테스트는 sandbox의 로컬 포트 제한 때문에 지원된 실행 권한으로 로컬 fixture 포트를 사용했다. 브라우저 첫 실행은 수동 Vite와 자체 webServer의 포트가 겹쳐 시작하지 못했으며, 자기 서버만 종료한 뒤 기존 Playwright config로 검증했다.

초기 회귀에서 메뉴 개수의 옛 기대값과 마지막 개별 담당 해제 후 성공 안내가 사라지는 문제가 발견돼 수정 후 다시 검증했다. 기존 guard의 잘못된 UUID는 404 계약이므로 이를 유지한다. 테스트를 통과시키기 위해 권한 검사·원장 판정을 우회하지 않았다.

## 검증 한계·인계

인증·계정·HTTP·DB 응답은 합성 fixture다. 실제 Google 관리자 로그인, 운영 DB 쿼리·유료 자격 변경·사업 등록·가입 승인·과금·외부 AI 호출은 수행하지 않았다. 이 결과를 실제 PostgreSQL 원장이나 운영 로그인 검증으로 보고하지 않는다. desktop/mobile 캡처를 확인했으며 개발용 전역 배너가 있는 로컬 화면이다.

공통 UI 소비처는 관리자 앱과 Neture 호환 wrapper다. 다른 사업의 operator 콘텐츠/자료/가입 업무는 유지한다. backend 응답에 사업 정보를 포함하므로 통합·배포 담당은 API와 관리자·Neture 번들을 함께 판정하고 기존 Delivery 정책을 따른다. 이번 작업에서 배포하지 않는다. PR CI는 PR을 생성하지 않아 미실행이다.

## 문서 정합·작업공간

현행 약국 설계의 초기 독립 메뉴 서술·§15-6 집계 노출·§15-7 메뉴/조회 계약을 사용자 승인안으로 정합했다. 과거 WO/CHECK는 당시 기록으로 보존했다. CANONICAL-INDEX 행·상태 변경 0, Frozen 본문 수정 0, 별도 WO 제안 0.

WORKTREE_DISPOSITION: KEEP. 개발 branch의 검토·main 통합이 남아 있어 전용 worktree와 원격 branch를 보존한다. 최종 commit SHA·push·clean 상태는 완료 보고에서 인계한다.

### 마지막 오류 처리와 main 이동 확인

사업 등록 후 목록 조회만 실패하면 등록 성공과 조회 실패를 구분한다. 같은 modal에서 목록만 다시 조회하며 POST를 중복하지 않는 회귀를 추가했다. 사업 정보의 저장 후 재조회 실패도 저장 전 실패와 구분한다. 잘못된 중첩 자격 응답을 빈 자격으로 표시하거나 화면 오류로 이어가지 않는다.

푸시 전 origin/main은 다른 공간의 PR #725로 `19518474f4`로 이동했다. 파일 겹침은 0건이며 변경은 Neture obfuscation build/CI/도구 영역이다. 이번 개발 branch는 승인한 base `622aafc82814aedd4a0878f28101e56ff686219a`를 유지한다. 통합 담당은 최신 main의 Neture 빌드 경로와 함께 CI·브라우저 검증을 확인해야 한다. 다른 작업을 임의 merge/rebase하거나 배포하지 않았다.

문서 검사 기본 실행은 sandbox의 Git 자식 프로세스 제한으로 실패해, 검사기가 지원하는 변경 문서 3개의 명시적 경로 인자로 검증했다. 검사기나 sandbox 경계를 수정하지 않았다.

### Git 인계

구현 커밋 `af543c0a600c94ad4ccce55bba932ed7a32c069f`의 원격 push와 SHA 일치를 확인했다. 필수 staged-scope 검사도 sandbox의 Git 자식 프로세스 EPERM으로 막혔으나, 지원된 실행 권한으로 동일 검사기를 실행해 35개 파일 범위 PASS 후 경로별 commit했다. 검사기·권한 정책을 수정하거나 자동 검토를 우회하지 않았다.

코드 push 시 작업트리는 clean이었다. 이번 완료 기록은 별도 docs-only 커밋으로 같은 branch에 push하며, 최종 SHA는 완료 보고에서 인계한다. PR·병합·배포·운영 원장 쓰기는 미실행이고 worktree는 KEEP이다.


## 후속 통합·배포 — 사용자 승인

개발·push 종료 후 사용자가 PR·병합·배포 진행을 명시 승인했다. 이 공간이 같은 작업의 통합을 이어간다. 위 push-only 기록은 당시 결과이며, 현재 종료점은 PR 기술 gate·리뷰·main 병합·운영 배포 검증이다.

- [x] 전달 branch/HEAD `8c2fa68d239d3f02b5c0836204e92c8e51935764` 및 clean 상태 확인
- [x] 최신 main `e09db6eb4b5b48e92bb3ebba2c777910c65f3c73`의 변경 16개 경로 조사: 이번 변경과 겹침 0, Neture 빌드/CI/도구 및 완료 문서
- [x] 이미 push한 작업 branch에 main을 merge (`273b2eafc52b2d419bbda134537ca0c518fa3c18`), 충돌 0, 다른 checkout 수정 0
- [ ] 통합 후 관련 검증·PR CI 및 Codex 리뷰
- [ ] main 병합·post-merge CI·현재 Delivery 정책 판정
- [ ] 운영 배포·serving revision/traffic·공개 응답 확인 및 한계 기록

새 migration·schema·seed·DB 직접 변경은 추가하지 않는다. 운영 Google 인증과 실제 회원/사업 상태 변경은 이번 검증에서 수행하지 않는다.


### PR #746 통합 검증·리뷰 수정

최신 main 통합 후 관리자 431·공통 UI 51·Neture 관련 55·API 37 및 Chromium desktop/mobile 4개를 다시 통과했다. main의 Neture production names 빌드도 PASS이며 공개 산출물 source map 0개, 비공개 manifest 1개를 확인했다. 고정 도구 lockfile의 캐시 부족분은 정상 registry에서 설치했으며 manifest·dependency·lockfile 변경은 없다.

Codex가 지적한 두 항목을 같은 branch에서 수정한다.

1. P1: 기타 사업의 운영자 지정은 기존 서버 계약인 `/semi-franchises/:key/operators/:userId`를 사용한다. body-only 경로는 404임을 실제 Express router 회귀에서 확인하고 UI가 선택 사용자 경로와 성공 안내를 사용하는지 검증한다.
2. P2: 회원 소유 조직 조회를 약국 가입 원장 INNER JOIN으로 제한한다. 공급자/기타 조직을 미신청 약국으로 표시하지 않는다. 현재/심사 중 약국은 유지하고 이전 소유 관계는 제외한다. 실제 SELECT를 격리 SQLite 합성 원장에 실행해 공급자 제외·활성/심사 중 약국 유지·탈퇴 owner 제외를 확인했다. 실제 PostgreSQL 검증을 대신하는 결과로 보고하지 않는다.

PR CI·Codex 재리뷰·운영 배포 결과는 확정 후 아래에 기록한다.

수정 후 관리자 운영자 UI 2개, 관련 API 3 suites/17개(요청 계약 1개 추가), 변경 5개 TS/TSX lint 오류·경고 0으로 통과했다. 새 요청 계약 테스트의 초기 403은 합성 인증에 역할 claim이 빠진 fixture 문제여서 합성 전체 관리자 역할만 보완했다. 운영 guard·membership·role 판정 코드는 변경하지 않았다.


Codex 후속 P2도 수정했다. 중앙 운영자 화면에서 지정/해제 쓰기 성공과 목록 재조회 실패를 구분하며 성공 안내를 유지한다. 재시도는 GET만 실행하고 성공한 POST/DELETE를 반복하지 않는다. 후보 검색은 별도 목록 재조회를 하지 않는다. UI 3개(성공한 해제 후 GET 실패→조회만 재시도 포함)와 변경 파일 lint를 검증했다. API 타입 검사도 PASS다.
