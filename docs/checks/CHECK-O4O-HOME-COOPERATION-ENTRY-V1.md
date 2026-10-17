# CHECK-O4O-HOME-COOPERATION-ENTRY-V1

2026-10-18 · base `663e2c7d70` · branch `wo/home-cooperation-entry` · LOCAL_VERIFIED (통합·배포 결과는 PR 기록)

## 원인·수정

대표 홈 ServiceDiscovery에 세 협력사업이 과거 `preparing: true` 버튼으로 남아 있어 실제 서비스 대신 준비 중 dialog를 열었다. 현재 사용자 확인과 기존 앱·호스트 계약에 맞춰 일반 외부 링크로 바꿨다.

| 카드 | 목적지 |
|---|---|
| 만성질환관리 | https://carepharm.neture.co.kr/ |
| 약국/약사협동조합 | https://coop.neture.co.kr/ |
| 창고형 약국 | https://megapharm.neture.co.kr/ |

기존 CarePharm host identity, 협동조합 App의 공개 federation 루트·session origin, 약국 앱의 megapharm business site 설정을 확인했다. 특정 조합 `/test`로 고정하지 않았다. 공개 협동조합 directory API GET은 200/빈 목록으로 확인했으며, 조합·회원 데이터를 생성하거나 가입·승인하지 않았다.

세 카드의 준비 중 설명과 전용 dialog를 제거했다. Partner 소개와 병원 도구의 문서 탐색은 그대로다. 게스트/로그인 후 미가입 소개 모두 같은 주소를 사용한다. 참여 가능한 CarePharm·megapharm은 기존 서버 communities의 kind/businessKey/canParticipate 출처로 중복 소개를 제외한다. 역할 문자열이나 도메인만으로 가입·이용 자격을 추정하지 않는다. 협동조합의 개인 가입 상태를 임의로 추가하지 않았다.

## 검증

- Node 22.18.0 / pnpm 10.25.0 frozen offline 설치, build:packages 완료.
- ServiceDiscovery 9 tests PASS: 세 링크·새 탭/rel·준비 중 제거, Partner·병원 회귀, 미가입·참여 사업 상태.
- O4OHomePage.entry-pills 12 tests PASS: 로그인 전후 목록 순서·세 서비스 주소·로그인/약관·Hero 회귀.
- Neture production build(tsc 포함) PASS. 기존 Browserslist/큰 chunk 경고만 남음.
- 변경 TS/TSX ESLint 오류/경고 0, git diff --check PASS.
- Chromium 1440/390/320px × 게스트/로그인 목록 6 layouts, 세 카드 Enter 새 탭 탐색 18회 PASS. 팝업 없음, 목적지 URL 일치, 가로 넘침/페이지 오류 없음. 목적지 응답은 합성 intercept이며 실제 서비스 로그인을 수행하지 않았다.
- 이 클라우드 허용 목록에는 carepharm/coop/megapharm 호스트가 없어 해당 호스트의 실제 HTTPS·로그인·업무 기능은 미검증. 이는 대표 홈 링크의 로컬 UI 검증과 구분한다. 배포 후에는 허용된 neture.co.kr의 새 운영 번들에서 세 연결·설명 반영을 확인한다.

## 문서·배포

사용자 최신 확인에 맞춰 대표 홈 정본 §1.2·§3·§4의 준비 중 정책을 실제 서비스 연결로 정합했다. API/DB/권한/DNS/배포 설정 변경 없음. ServiceDiscovery 소비처는 대표 홈 로그인 전·후 두 자리이며 공통 패키지는 수정하지 않았다.

DEPLOYMENT = AUTOMATIC (Neture UI, 실제 Delivery 판정에 따름). WO의 마지막 통합 TODO는 PR의 CI·리뷰·병합·배포·공개 번들 결과로 완료한다.
