# 약국 서비스 설정 통합 개발 검증

> **상태**: COMPLETED
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
| 문서/범위 검사 | 변경 문서 3개 민감정보 0건, 신규 문서 상대 링크·git diff --check PASS. staged 범위는 commit 직전 검사 |

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
