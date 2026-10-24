# 약국 협업체 회원 홈 공통 배치 — 1단계

> **상태**: ACTIVE — 구현·검증 진행, main 통합·배포 미완료
> **작성일**: 2026-10-24 (Asia/Seoul)
> **근거**: 프랜차이즈 회원 포털 비교 기획 후 사용자가 개인 조합원 가입과 약국 단위 가입의 분리를 확인하고 진행을 지시

## 범위와 경계

- 공통 메뉴 순서, PC의 본문/참여·지원 2열 및 모바일의 참여 상태 우선 배치를 공유한다. 기존 URL·API로 연결되는 기능만 노출한다.
- Pharmacy/MegaPharm은 기존 약국 조직 가입·약국 선택을 사용한다. CarePharm은 기존 사업/선택 약국 접근 검사를 유지한다. Pharmcoop은 기존 조합별 개인 가입·운영자 판정을 사용한다.
- 공통 모듈은 React 표시 slot과 링크만 받는다. 회원 API·가입 처리·역할 판정·조합/약국 자격 변환을 포함하지 않는다. 운영자 링크는 각 앱의 기존 판정에 따라 노출한다.
- 공통 6개 메뉴는 홈·소식·자료·참여 안내·회원 교류·지원이다. 실제 개별 캠페인 원장이나 교육 진도가 없으므로 그 기능을 완성된 메뉴·통계로 표시하지 않는다. 조합 서비스 등 기존 추가 동선은 보존한다.
- CarePharm 공개 소개와 공개 공지는 유지하며 로그인 사용자의 첫 화면은 간결한 소개와 회원 이용을 우선한다. 공지의 공개 범위나 사업 미개설/세션 만료 안내를 변경하지 않는다.
- 공지 수신 확인, 교육 진도, 캠페인 신청 원장, 문의 상태 통합은 기존 기능·API 계약을 추가 대조할 후속 단계다. 환자 기록·POS/ERP·계약/정산 기능은 추가하지 않는다.

## 조사 근거와 설계 선택

- [FranConnect Hub](https://www.franconnect.com/platform-overview/the-hub/): 자료·소식·검색·회원 교류·지원을 연결하는 공개 제품 설명.
- [교육](https://www.franconnect.com/platform-overview/training-and-development/)과 [운영 지원](https://www.franconnect.com/platform-overview/brand-consistency/): 역할별 교육과 상태 기반 후속 업무. 공개 운영자 화면을 일반 회원 화면으로 해석하지 않는다.
- [Good Neighbor Pharmacy 소개](https://www.mygnp.com/about-us/): 공동 네트워크와 개별 독립 약국의 정체성 공존. 비공개 회원 포털을 확인했다는 근거로 사용하지 않는다.
- 1단계에서는 조회 가능한 참여 상태·기존 소식·자료와 지원 동선을 정리한다. 미구현 처리 상태나 완료 수치를 만들지 않는다.

## 소비처

| 소비처 | 적용 | 자격 adapter |
|---|---|---|
| web-kpa-society / Pharmacy·MegaPharm | 회원 메뉴·홈 참여/지원 영역·기존 자료 선택 배치 | 기존 BusinessWorkspace/access 및 약국별 활성 가입 조회 |
| web-neture / CarePharm | 로그인 회원 홈·기존 약국 선택·공개 공지 slot | 기존 CooperationMemberSpace/store-access |
| web-pharmacy-coop / 개별 조합 | 같은 홈 배치·메뉴 순서·개인 참여 상태 | 기존 cooperativeAccess/personal membership |
| shared-space-ui의 다른 소비 앱 | 새 CSS는 전용 클래스에 한정, 기존 구성 요소 계약 보존 | 기존 guard 유지 |

새 독립 작업은 최신 main `8f8e8b7ae8`에서 전용 branch `wo/cooperation-member-home-layout-v1`로 시작했다. 클라우드 시작 지침에 따라 준비된 격리 checkout을 사용하며 추가 worktree는 만들지 않는다.

## 완료 구분

- [x] 구현 및 가입/권한 경계 회귀 검증
- [x] 공통 모듈·세 소비 앱 테스트·관련 소비 앱 빌드
- [x] PC·모바일 합성 API 화면 검증
- [ ] PR·CI·최신 리뷰·main 통합
- [ ] 일반 Delivery 및 Pharmcoop frontend_only 배포·검증

문서 정합: 회원 홈 1단계의 개발·통합·배포와 후속 업무 개발·실계정 운영 검증을 구분한다. CarePharm 약관은 별도 사업자 미설립에 따라 법정정보가 빈칸인 초안이며 운영 게시 상태를 바꾸지 않는다.

로컬 검증 근거: [CHECK](../checks/CHECK-O4O-COOPERATION-MEMBER-HOME-LAYOUT-V1.md). 실행 테스트 1,686개, 7개 소비 앱 production build, 합성 브라우저 19흐름을 통과했다.
