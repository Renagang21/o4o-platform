# CHECK-O4O-PHARMACY-COMMON-SPACE-V1

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

2026-10-18 · 로컬 검증

- pharmacy 사업 가입은 기존 kpa-society 세션 handoff에 returnPath `/`를 전달해 pharmacy.neture.co.kr 루트로 진입한다. 사업/서비스 가입이 겹쳐도 대표 카드 한 개만 표시한다. 다른 사업도 기본 진입은 공동공간 루트이며 CarePharm·드럭스토어형 약국 독립 진입을 유지한다.
- pharmacy·같은 약국 앱의 사업 초기화면: 간결한 Hero → 공지 → 가입 약국 소식·사업 자료 → 매장 업무 → 공급 상품·광고. 내부 게시판 API/기존 상세 URL은 유지한다. 일반 community.neture.co.kr와 별개 공동공간임을 명칭·메뉴·정본에 반영했다.
- Neture 관련 테스트와 KPA 공동공간 테스트 통과. 정확한 최종 테스트 수는 PR 검증 기록 참조.
- Neture·KPA production build(tsc 포함) PASS. 대상 lint 오류 0, 기존 hooks warning만 남아 있다.
- Chromium 공동공간 12화면 PASS: 1440/390/320px × 가입 약국·운영자·미승인·조회 실패. 공지/소식/자료가 업무보다 먼저 표시되고 미승인은 보호 콘텐츠를 표시하지 않는다. Hero 전체 폭·가로 넘침 없음, 모바일 스크린샷 확인.
- 대표 홈 Hero → AI 순서 브라우저 18화면 PASS는 같은 PR의 CHECK-O4O-HOME-HERO-AI-ORDER-V1에 기록했다.
- 합성 인증·승인·API 응답 사용. 실제 운영 계정·AI 호출·DB 쓰기·실제 세션 교환은 수행하지 않았다.

현행 배치·공동공간 정본과 색인을 정정했고 과거 기록은 보존했다. 실제 CI·병합·배포 증거는 PR #702에 기록한다.
