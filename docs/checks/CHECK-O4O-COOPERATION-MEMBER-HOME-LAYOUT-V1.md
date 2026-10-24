# 약국 협업체 회원 홈 공통 배치 검증

> **기준일**: 2026-10-24 (Asia/Seoul)
> **WO**: [회원 홈 1단계](../work-orders/WO-O4O-COOPERATION-MEMBER-HOME-LAYOUT-V1.md)
> **상태**: 로컬 구현·검증 완료, PR/main 통합·운영 배포 미완료

## 구현

- 공유 메뉴: 홈·소식·자료·참여 안내·회원 교류·지원. 실제 경로는 각 앱이 제공한다. 조합 서비스와 자격에 따른 운영 링크 등 기존 추가 동선을 보존했다.
- 공유 홈 배치: PC 본문/참여·지원 2열, 모바일은 참여 상태·지원 우선. CSS는 `cooperation-member-*` 범위에 한정했다. 기존 Pharmcoop 홈/메뉴 전용 중복 CSS를 제거했다.
- Pharmacy/MegaPharm의 약국 선택을 참여 영역으로 옮기고 기존 접근 판정을 유지했다. CarePharm 로그인 홈은 간결한 소개와 회원 이용을 앞에 두며 공개 공지·소개 anchor, 사업 미개설·세션 만료 안내를 보존했다. 로그인한 조합원의 소개 Hero는 간결하게 표시하며 공개 소개·Hero 편집 계약은 유지했다.
- 공통 표시 모듈에는 회원 조회·가입·승인·역할 판정이 없다. Pharmcoop은 조합별 개인 회원 adapter를 유지하며 약국 조직 가입용 `CooperationMemberSpace`를 사용하지 않는다. 서버 API·schema·migration·가입·동의·권한·정산 원장은 변경하지 않았다.
- 실제 개별 캠페인/교육 진도/문의 처리 상태를 새로 구현하거나 가상의 건수를 표시하지 않았다. 이 후속은 WO의 다음 단계와 구분한다.

## 검증 결과

| 범위 | 결과 |
|---|---|
| shared-space-ui | 19 files / 179 tests PASS |
| Pharmacy/MegaPharm 앱 | 19 files / 140 tests PASS |
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
- 기존 공개 홈 8흐름·CarePharm 자료 태그 2흐름·MegaPharm 네이티브 이동 1흐름도 통과했다(총 추가 11흐름). 합계 19흐름이며 실제 운영 로그인·실약국 데이터 검증과 구분한다.
- 회귀 테스트는 홈/공지 anchor 활성 표시와 약국 선택 query 보존, 유사한 다른 조합 slug 비활성, 다른 조합의 활성 가입으로 현재 조합의 pending이 바뀌지 않음, 기존 사업·선택 약국 접근 검사를 포함한다.
- 화면과 로그는 로컬 합성 자료이며 실제 사용자·약국 데이터나 credential을 저장소에 넣지 않았다. 운영 API write·약관 게시·계정 생성은 미실행이다.

## 남은 실행과 운영 준비

- PR 생성·최신 CI/리뷰·main 통합 및 일반 Delivery/Pharmcoop frontend_only 결과는 아직 미확인이다.
- CarePharm 약관의 법정정보 빈칸·운영 미게시 상태는 유지했다. 실계정·실매장·기기·음성 검증과 사업 운영 설정은 별도 운영 준비다.

문서 정합: 회원 홈 1단계의 로컬 구현 완료와 main 통합·배포 미완료를 구분한다. 기존 협업체 core/extension 작업의 완료 기록은 변경하지 않는다.
