# CHECK-O4O-HOME-COOPERATION-ENTRY-V1

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

2026-10-18 · base `663e2c7d70` · branch `wo/home-cooperation-entry` · LOCAL_VERIFIED (통합·배포 결과는 PR 기록)

## 원인·수정

대표 홈 ServiceDiscovery에 세 협력사업이 과거 `preparing: true` 버튼으로 남아 있어 실제 서비스 대신 준비 중 dialog를 열었다. 현재 사용자 확인과 기존 앱·호스트 계약에 맞춰 일반 외부 링크로 바꿨다.

| 카드 | 목적지 |
|---|---|
| 만성질환관리 | https://carepharm.neture.co.kr/ |
| 약국/약사협동조합 | https://coop.neture.co.kr/ |
| 드럭스토어형 약국 | https://drugstore.neture.co.kr/ |

> **도메인 정정 (2026-10-18)**: 위 협동조합 목적지 `coop.neture.co.kr` 은 잘못 안내된 도메인이며 `https://pharmcoop.neture.co.kr/` 로 정정됐다. 당시 기록은 보존한다. 현행: [CHECK-O4O-PHARMCOOP-DOMAIN-CORRECTION-V1](CHECK-O4O-PHARMCOOP-DOMAIN-CORRECTION-V1.md).

기존 CarePharm host identity, 협동조합 App의 공개 federation 루트·session origin, 약국 앱의 drugstore business site 설정을 확인했다. 특정 조합 `/test`로 고정하지 않았다. 공개 협동조합 directory API GET은 200/빈 목록으로 확인했으며, 조합·회원 데이터를 생성하거나 가입·승인하지 않았다.

세 카드의 준비 중 설명과 전용 dialog를 제거했다. Partner 소개와 병원 도구의 문서 탐색은 그대로다. 게스트/로그인 후 미가입 소개 모두 같은 주소를 사용한다. 참여 가능한 CarePharm·drugstore은 기존 서버 communities의 kind/businessKey/canParticipate 출처로 중복 소개를 제외한다. 역할 문자열이나 도메인만으로 가입·이용 자격을 추정하지 않는다. 협동조합의 개인 가입 상태를 임의로 추가하지 않았다.

리뷰 P1 반영: 상단 가입 서비스와 My Home이 함께 쓰는 기존 모델에서 CarePharm 사업은 기존 carepharm handoff alias로, 드럭스토어형 약국은 실제 공개 호스트로 연결한다. pharmacy 가입을 우회 조건으로 요구하지 않는다. 알려지지 않은 사업의 기존 pharmacy 경로는 보존한다. 드럭스토어형 약국 인증 alias를 새로 만들거나 자동 로그인·가입을 보장하지 않는다.
리뷰 P2 반영: 정본 §6의 과거 PR #402 기록과 현재 회귀 기준을 나눠 AI 우선·세 팝업을 현행 요구로 해석하지 않도록 정합했다.

## 검증

- Node 22.18.0 / pnpm 10.25.0 frozen offline 설치, build:packages 완료.
- ServiceDiscovery 9 tests PASS: 세 링크·새 탭/rel·준비 중 제거, Partner·병원 회귀, 미가입·참여 사업 상태.
- O4OHomePage.entry-pills 12 tests PASS: 로그인 전후 목록 순서·세 서비스 주소·로그인/약관·Hero 회귀.
- 리뷰 보완 모델·대표 업무 35 tests 및 My Home 두 소비처 29 tests PASS (전체 focused 85 tests). CarePharm-only 회원의 실제 alias 요청, 드럭스토어형 약국 공개 주소, 미승인 사업 진입 없음 확인.
- Neture production build(tsc 포함) PASS. 기존 Browserslist/큰 chunk 경고만 남음.
- 변경 TS/TSX ESLint 오류/경고 0, git diff --check PASS.
- Chromium 1440/390/320px × 게스트/로그인 목록 공개/소개 6 layouts와 승인된 사업 바로가기 3 layouts, 총 탐색 24회 PASS. 세 카드 Enter 새 탭 및 CarePharm의 기존 alias POST·동일 탭 이동, 드럭스토어형 약국 실제 호스트 새 탭 확인. 팝업 없음, 목적지 URL 일치, 가로 넘침/페이지 오류 없음. 목적지 응답은 합성 intercept이며 실제 서비스 로그인을 수행하지 않았다.
- 이 클라우드 허용 목록에는 carepharm/coop/drugstore 호스트가 없어 해당 호스트의 실제 HTTPS·로그인·업무 기능은 미검증. 이는 대표 홈 링크의 로컬 UI 검증과 구분한다. 배포 후에는 허용된 neture.co.kr의 새 운영 번들에서 세 연결·설명 반영을 확인한다.

## 문서·배포

사용자 최신 확인에 맞춰 대표 홈 정본 §1.2·§3·§4·§6의 준비 중 정책을 실제 서비스 연결로 정합했다. API/DB/권한/DNS/배포 설정 변경 없음. ServiceDiscovery 소비처는 대표 홈 로그인 전·후 두 자리이며 공통 패키지는 수정하지 않았다. 사업 진입 모델 소비처 HomeEntryPanel·MyHomeWorkspaces·MyPageHub를 확인했으며 세 곳 모두 기존 handoff/public 액션을 지원한다. 내 매장 자동 진입은 store 그룹만 사용하여 이번 myServices 변경 영향을 받지 않는다.

DEPLOYMENT = AUTOMATIC (Neture UI, 실제 Delivery 판정에 따름). WO의 마지막 통합 TODO는 PR의 CI·리뷰·병합·배포·공개 번들 결과로 완료한다.
