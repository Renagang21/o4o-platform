# CHECK-O4O-SERVICE-HERO-IDENTITY-V1

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **진행 현황 안내 (2026-10-30)**: 서비스별 Hero 디자인은 PR #732(`71340f3b7f`)로 main에 반영됐다. 아래 LOCAL_VALIDATING은 통합 전 기록이다. 후속 [Hero 운영 정비 CHECK](CHECK-O4O-SERVICE-HERO-OPERATOR-COMPLETION-V1.md)의 2026-10-20 배포 대상은 #732를 포함한 main이다. 해당 배포와 실제 운영 계정의 편집·게시 검증은 구분한다.
> 전체 경과와 남은 확인은 [디자인 정비 진행 현황](../guides/O4O-PUBLIC-DESIGN-PROGRESS-V1.md)을 참조한다. 아래 기존 본문·수치·실행일은 과거 회차 기록으로 보존한다.

2026-10-20 · LOCAL_VALIDATING · 기준 main `0b9821122a`.
이 문서는 통합 전 실행 기록이다. 아래 진행 중 검사의 최종 결과·CI·배포 증거는 해당 PR에 기록한다.

## Shared Module Change Verification

### Changed shared module

- Module: HomePresentation · HomePresentationEditor · HomeHeroIdentity · home-presentation.css
- Package: @o4o/shared-space-ui (공개/운영자 UI). 서버 공통 types·저장 schema 변경 없음.
- Direct consumers: Neture(대표·공급자·펀딩·일반 커뮤니티·CarePharm), Lecture, KPA 회원 사업 소식, KPA Branch, 서비스별 운영자 편집/미리보기.
- Indirect consumers: shared-space-ui barrel을 참조하는 admin·store·guide·forum 등. 새 스타일은 Hero 속성/전용 클래스에 한정하고 본문·헤더 전역 규칙을 추가하지 않는다.
- raw-source 경로 조사: HomePresentation.tsx 파일 경로를 직접 읽는 소비처 0. 심볼 검색으로 실제 runtime·test 소비처를 별도 확인했다.

### Consumer impact matrix

| 소비처 | 변경 영향 | 검증 |
|---|---|---|
| Neture 대표 홈 | 네이비·그린 연결형, Hero→AI 순서 유지 | 관련 49개 PASS, production build(tsc 포함) PASS |
| 공급자·펀딩 | 제품/공급형·프로젝트형, 기존 접근 제한 유지 | 공통 136개·최종 Hero 39개 PASS(중복 합산하지 않음) |
| CarePharm | 민트 협업형, 기본 안내 구체화 | 위 Neture 관련 테스트 포함 |
| 일반 커뮤니티 | 따뜻한 대화형, 콘텐츠 아래 위치 유지 | 위 Neture 관련 테스트 포함 |
| Lecture | 인디고 학습형·본문 바로 아래 진입 버튼 | 10파일 41개 PASS, 앱 빌드 진행 중 |
| KPA pharmacy·drugstore | 본부 게시 내용만 표시, 간결한 디자인·사업별 색상 | 공동공간 22개 PASS, 앱 빌드 진행 중 |
| KPA Branch | 지역 소식형, 분회 범위 유지 | 홈 1개 PASS, 앱 빌드 예정 |
| 운영자 편집 | 제작 안내·동일 디자인 미리보기 | 27화면 편집·3화면 게시 이미지 PASS, 최종 키보드/저장 검사 진행 중 |
| 협동조합·내 매장 | 기존 독자 디자인/업무 진입 유지 | 해당 앱 소스 diff 0, 새 Hero 사용 추가 없음 |
| admin·기타 shared UI | Hero 미사용 영역의 표현 유지 | 범위 한정 스타일·공통 전체 회귀 PASS, CI 검사 후 최종 기록 |

### Route / role / capability check

- Route existence: 기존 링크·서비스 루트·업무 진입 유지, 신규 route 없음.
- Role guard / capability map: 변경 없음.
- Visibility/filter: 공개 게시·일정·광고 구분·pharmacy 미게시 시 Hero 없음 유지.
- Business scope: drugstore의 UI 디자인과 새 초안만 구분, 기존 businessKey endpoint 재사용. 사업/서비스 승인·운영 권한을 만들지 않음.
- Published content: 운영자 제목·이미지·링크를 덮어쓰지 않고, 이미지가 있으면 장식 그래픽을 숨김. 새 기본 문구는 미게시 기본 화면/새 초안에만 적용.

### Smoke result

- Chromium 1440/390/320px에서 9개 디자인 비교. 최초 27화면 PASS, 최종 문구·CTA 위치 조정 후 같은 27화면 재확인 진행 중.
- 편집 27화면과 게시 이미지 3화면 PASS. 저장·공개·키보드 최종 결과는 PR 기록.
- 합성 공개/운영자 API와 로컬 커버 이미지를 사용했다. 가상 회원 수·상품·모집률·건강 성과를 표시하지 않는다.
- 실제 운영 로그인·운영자 저장·DB 쓰기 미수행. 작업/기준 checkout 모두 docs/local/TEST-ACCOUNTS.local.md가 없어 과거 계정을 대체 사용하지 않았다.
- 공통 packages 빌드 PASS. Neture build PASS. 남은 소비 앱 빌드 완료 후 PR에 결과를 이어 기록한다.
- 대상 ESLint 오류·경고 0. 오래된 Browserslist·큰 chunk 경고는 기존 상태이며 의존성을 변경하지 않았다.

## 문서 정합

WO의 서비스별 TODO를 먼저 작성하고 현행 대표 홈 정본에 서비스별 Hero 표현 기준을 추가했다. 과거 WO/CHECK는 보존했다. canonical index의 행 추가·삭제·상태 변경은 없다.
