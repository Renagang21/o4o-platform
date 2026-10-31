# 약국 협업체 회원 홈 공통 배치 검증

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

> **기준일**: 2026-10-24 (Asia/Seoul)
> **WO**: [회원 홈 1단계](../work-orders/WO-O4O-COOPERATION-MEMBER-HOME-LAYOUT-V1.md)
> **상태**: 회원 홈 1단계 로컬 검증·main 통합·운영 배포 완료. 후속 업무/실계정 운영 준비는 별도

## 구현

- 공유 메뉴: 홈·소식·자료·참여 안내·회원 교류·지원. 실제 경로는 각 앱이 제공한다. 조합 서비스와 자격에 따른 운영 링크 등 기존 추가 동선을 보존했다.
- 공유 홈 배치: PC 본문/참여·지원 2열, 모바일은 참여 상태·지원 우선. CSS는 `cooperation-member-*` 범위에 한정했다. 기존 Pharmcoop 홈/메뉴 전용 중복 CSS를 제거했다.
- Pharmacy/드럭스토어형 약국의 약국 선택을 참여 영역으로 옮기고 기존 접근 판정을 유지했다. CarePharm 로그인 홈은 간결한 소개와 회원 이용을 앞에 두며 공개 공지·소개 anchor, 사업 미개설·세션 만료 안내를 보존했다. 로그인한 조합원의 소개 Hero는 간결하게 표시하며 공개 소개·Hero 편집 계약은 유지했다.
- 공통 표시 모듈에는 회원 조회·가입·승인·역할 판정이 없다. Pharmcoop은 조합별 개인 회원 adapter를 유지하며 약국 조직 가입용 `CooperationMemberSpace`를 사용하지 않는다. 서버 API·schema·migration·가입·동의·권한·정산 원장은 변경하지 않았다.
- 실제 개별 캠페인/교육 진도/문의 처리 상태를 새로 구현하거나 가상의 건수를 표시하지 않았다. 이 후속은 WO의 다음 단계와 구분한다.

## 검증 결과

| 범위 | 결과 |
|---|---|
| shared-space-ui | 19 files / 179 tests PASS |
| Pharmacy/드럭스토어형 약국 앱 | 19 files / 140 tests PASS |
| Neture/CarePharm 앱 | 149 files / 1,285 tests PASS |
| Pharmcoop 앱 | 11 files / 82 tests PASS |
| 합계 | 198 files / 1,686 tests PASS |
| 마지막 홈 조정 후 집중 재검증 | CarePharm 40(공개 공지/접근 실패 2경우와 비동기 재배치 anchor 1경우 추가), Pharmcoop 84(직접/다른 페이지 소식 anchor 2경우 추가) tests PASS |
| 실제 소비 앱 3개 | TypeScript 및 production build PASS, 최종 CSS/소개 조정 뒤 Vite build 재검증 PASS |
| 다른 공유 소비 앱 | Store·Lecture·KPA Branch의 타입/production build, Admin 직접 Vite build PASS |
| 공유 제품 소스 타입 검사 | 테스트 파일을 제외한 기존 로컬 production tsconfig 검사 PASS |
| lint·diff·문서 | 변경 UI/테스트 집중 ESLint 오류/경고 0, diff check PASS. BusinessWorkspace의 기존 effect `user` dependency warning은 미변경 코드로 별도 유지 |

공유 패키지 테스트를 포함한 전체 tsc를 PASS로 표기하지 않는다. 제품 소스 검사와 실행 테스트 결과를 위에 각각 기록했다. 기존 약관 테스트 callback 타입 문제는 [이전 CHECK](CHECK-O4O-COOPERATION-CORE-EXTENSIONS-CONSOLIDATION-V1.md)에 별도 기록돼 있다.

## UI와 경계

- Chromium 합성 인증/API로 네 호스트의 회원 홈을 1440px·390px에서 확인했다(8흐름). 공통 메뉴 순서, PC 오른쪽 summary와 모바일 summary 우선 순서, 가로 넘침 없음, page error 0, 회원 홈 write 요청 0을 검증했다.
- 실제 Hero illustration selector와 높이를 확인해 로그인 조합원의 장식 그림이 숨겨지고 소개 높이가 260px 미만인지 검사했다. 운영자가 게시한 내용·동선은 유지한다.
- 기존 공개 홈 8흐름·CarePharm 자료 태그 2흐름·드럭스토어형 약국 네이티브 이동 1흐름도 통과했다(총 추가 11흐름). 합계 19흐름이며 실제 운영 로그인·실약국 데이터 검증과 구분한다.
- 회귀 테스트는 홈/공지 anchor 활성 표시와 약국 선택 query 보존, 유사한 다른 조합 slug 비활성, 다른 조합의 활성 가입으로 현재 조합의 pending이 바뀌지 않음, 기존 사업·선택 약국 접근 검사를 포함한다.
- 화면과 로그는 로컬 합성 자료이며 실제 사용자·약국 데이터나 credential을 저장소에 넣지 않았다. 운영 API write·약관 게시·계정 생성은 미실행이다.

## 남은 실행과 운영 준비

- 로컬 검증 시점에 미확인이었던 PR·최신 CI/리뷰·main 통합 및 배포 결과는 아래 최종 실행 확인에서 완료 근거를 구분한다.
- CarePharm 약관의 법정정보 빈칸·운영 미게시 상태는 유지했다. 실계정·실매장·기기·음성 검증과 사업 운영 설정은 별도 운영 준비다.

문서 정합: 회원 홈 1단계의 개발·main 통합·배포 완료와 후속 업무/실계정 운영 준비를 구분한다. 기존 협업체 core/extension 작업의 완료 기록은 변경하지 않는다.

## 최종 실행 확인 — 2026-10-24 (Asia/Seoul)

- 작업 시작 뒤 추가된 main PR #789는 수정 경로가 겹치지 않아 push 전 rebase하고 Lecture 소비 앱을 재빌드했다. 병합 직전 main이 `1c6374083f`로 유지됨을 확인했다.
- [PR #790](https://github.com/Renagang21/o4o-platform/pull/790) HEAD `9f6cc270433937acbf8a5786dec55dc64798824a`: [CI 40059355298](https://github.com/Renagang21/o4o-platform/actions/runs/40059355298)·CodeQL·SonarCloud PASS, 최신 Codex 리뷰 completed / 추가 finding 없음, 이전 2개 thread 해결. 오래된 자기 PR CI만 취소했으며 다른 작업의 CI나 운영 배포는 취소하지 않았다.
- 초기 전체 실행 1,686개 이후 추가한 5개 회귀 사례를 포함해 CarePharm 40개·Pharmcoop 84개 집중 재검증 PASS. 공개 공지 접근 실패·비홈 분리, CarePharm 비동기 gate 뒤 anchor 복원, Pharmcoop 직접/다른 페이지 소식 이동과 홈 복귀를 실패 재현 후 검증했다. 최종 변경 뒤 각 앱 타입/production build와 집중 lint도 통과했다.
- main `0d0d878a19794628fdba5bbc1086e9052c3d634a`로 merge 후 fetch하여 모든 작업 commit이 main에 포함되고 코드 diff가 없음을 확인했다. [main CI 40060917421](https://github.com/Renagang21/o4o-platform/actions/runs/40060917421) PASS.
- [Delivery 40061671026](https://github.com/Renagang21/o4o-platform/actions/runs/40061671026) 성공. admin, neture(CarePharm), kpa-society(Pharmacy/드럭스토어형 약국), lecture, store, kpa-branch의 새 revision·트래픽 전환·serving report가 성공했다. `production=success / DEPLOYED`. 이번 UI 변경에는 API 재배포가 필요하지 않아 기존 API를 유지했다.
- 진행 중 배포가 없고 main이 같은 SHA임을 확인한 뒤 [Pharmcoop 40062079618](https://github.com/Renagang21/o4o-platform/actions/runs/40062079618)을 순차 실행했다. `frontend_only=true`, `apply=false`, API compatibility·revision readiness·인증된 `/`·`/test`·`/login` HTML smoke·검토한 revision 트래픽 100% 확인 PASS. fixture 단계 skipped, 조합·회원 데이터 생성 없음.
- 실제 회원 로그인·가입·약국 업무·운영 설정 및 DNS/IAM 변경을 실행하지 않았다. 배포 검증은 workflow의 revision/HTTP/traffic 결과이며 로컬 합성 사용 흐름 및 실계정 검증과 구분한다. 직접 웹사이트 확인만으로 비공개 회원 기능이 검증됐다고 해석하지 않는다.
- 로컬 화면 검증용으로 시작한 preview 프로세스는 종료했다. 이 cloud checkout은 연결된 개발·검증 환경으로 유지하며 타 작업의 branch/worktree는 정리하지 않았다.
