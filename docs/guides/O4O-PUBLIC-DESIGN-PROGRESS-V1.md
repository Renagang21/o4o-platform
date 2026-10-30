# 메뉴·Hero·푸터 디자인 정비 진행 현황

> **상태**: ACTIVE
> **작성일**: 2026-10-30 · **최종 갱신**: 2026-10-30 (Asia/Seoul)
> **근거**: 사용자 요청 — 디자인 정비 기록의 초기 대기·후속 완료 시점 구분
> **역할**: 기존 CHECK와 병합 이력을 연결하는 현황 안내. 새 디자인 정책·배포 승인·실행 지시를 만들지 않는다.
> **확인 기준**: main `17746649f2`의 문서·Git 이력. 이번 정리는 운영 사이트 재검증이 아니다.

## 읽는 순서

기존 CHECK의 검증 수치와 미실행 설명은 해당 회차의 기록이다. 먼저 상단의 진행 현황 안내를 읽고 연결된 최종 결과 절을 확인한다. 코드의 main 반영, 운영 배포, 실계정 기능 검증을 각각 판정한다. 후속 배포나 HTML 200만으로 로그인 후 편집·게시까지 통과했다고 해석하지 않는다.

## 적용 범위

[대표 홈 탐색 정본](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md)과 [서브도메인 점검](../checks/CHECK-O4O-SUBDOMAIN-HERO-COVERAGE-V1.md)을 기준으로 공개 서비스에는 소개용 Hero를 제공하고, 약국 회원 공간에는 실제 게시된 본부 소식을 표시한다. 내 매장·계정·관리자 같은 업무 화면에 홍보 Hero를 일괄 추가하지 않는다. 서비스별 인증·가입·사업·조합의 접근 경계는 유지한다.

## 진행 경과와 근거

| 영역 | 코드·구조 반영 | 운영 배포 근거 | 남은 확인 |
| --- | --- | --- | --- |
| 메뉴·헤더·푸터 공통 구조 | 2026-08-21 공통화 종료 감사 | 당시 운영 적용 PASS | 과거 K-Cosmetics·PharmacyHub 표는 당시 모집단이며 현재 서비스 복구 대상이 아님 |
| 공개 화면 브랜드·토큰 | 2026-10-07 공통 글꼴·Hero·O4O 홈·표시명 정비 | 01~05 단계 배포 완료. 06 polish 일부 보류 뒤 2026-10-21 API·약국·매장 포함 누적 main 배포 기록 존재 | 06 polish 항목별 후속 화면 확인은 해당 배포 기록만으로 완료 판정하지 않음 |
| 대표 홈 전체 폭·순서 | PR #675 `9eb5b19592`, #702 `186c1d3593` main 반영 | 후속 Hero 정비의 2026-10-20 누적 main 배포 | 실계정 AI 실행·회원 기능 검증과 별개 |
| 서비스별 Hero 시각 구분 | PR #732 `71340f3b7f` main 반영 | #732 포함 main을 후속 #738에서 배포 | 실제 게시 이미지·콘텐츠는 운영자 설정에 따름 |
| 서비스·조합 Hero 운영 관리 | PR #738 `271638b989` main 반영 | 2026-10-20 일반 Delivery 및 Pharmcoop 별도 배포 성공 | 실제 연합회/조합 operator의 초안·게시·숨김·범위 차단, 회원 홈 게시 Hero 확인 미검증 |
| 이름+계정 메뉴 | PR #695 `5abc453695` main 반영 | 후속 2026-10-21 관련 웹 포함 누적 main 배포 기록 | 합성 PC·모바일 검증과 실제 Google 로그인 검증 구분 |
| 강의 Hero·관리 메뉴 누락 | PR #793 `6a6d20e094` main 반영 | 해당 CHECK에는 #793 배포 후 검증 증거 없음 | 실제 lecture operator의 운영 저장·게시 및 배포 후 화면 미검증 |
| 관리자 메뉴 정리 | PR #707·#742 main 반영 | 2026-10-19 1차, 2026-10-21 후속 배포 완료 기록 | 실제 관리자 로그인 후 조작·업무 쓰기 검증은 별도 |

### 원본 결과

- [헤더·푸터 공통화 최종 감사](../checks/CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FINAL-CLOSURE-AUDIT-V1.md): 2026-08-21 종료 판정과 운영 적용 근거.
- [공개 디자인·브랜드](../checks/CHECK-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1.md): §9~14 단계 배포, §18~19 당시 polish 보류와 별도 트랙.
- [Hero 전체 폭](../checks/CHECK-O4O-HOME-HERO-FULL-WIDTH-V1.md), [Hero·AI 순서](../checks/CHECK-O4O-HOME-HERO-AI-ORDER-V1.md), [Hero 시각 구분](../checks/CHECK-O4O-SERVICE-HERO-IDENTITY-V1.md): 각 변경의 로컬 회귀·소비처 검증.
- [Hero·광고 최초 구현](../checks/CHECK-O4O-SERVICE-HERO-ADVERTISING-V1.md): 초기 구현·통합 회차 기록.
- [Hero 운영 정비](../checks/CHECK-O4O-SERVICE-HERO-OPERATOR-COMPLETION-V1.md): 마지막 「로컬 통합 담당 — main 병합·운영 배포 결과」가 최종 배포·미검증 근거.
- [서비스 헤더 계정 표시](../checks/CHECK-O4O-SERVICE-HEADER-ACCOUNT-DISPLAY-V1.md), [서브도메인 Hero](../checks/CHECK-O4O-SUBDOMAIN-HERO-COVERAGE-V1.md): 개발 검증과 이후 main 반영을 구분.
- [관리자 메뉴 1차 정리](../work-orders/WO-O4O-ADMIN-MENU-TIDY-PHASE1-V1.md), [관리자 메뉴 후속 정비](../checks/CHECK-O4O-ADMIN-PLATFORM-MENU-ROLE-CLEANUP-V1.md): 후자의 「main 병합·운영 배포 완료」가 초기 배포 미실행 기록 이후 결과.

## 미완료·미확인 항목

- 약국 브랜드 자산: 현재 `services/web-pharmacy-business/src/config/brand.ts`의 `PHARMACY_BRAND_ASSETS_READY=false`. 과거 `web-kpa-society` 경로는 2026-10-26 workspace 이름 변경 전 기록이다.
- 실제 계정 검증: Hero 운영 정비와 강의 CHECK에 남은 인증 후 편집·게시 검증을 유지한다. 계정의 현재 제공 여부나 운영 데이터 상태를 이번 문서 정리에서 확인하지 않았다.
- 공개 디자인 CHECK의 정적 OG·재현 가능한 웹 빌드·과거 Funding 테스트 데이터는 별도 트랙이다. 이 문서에서 해결 여부를 새로 판정하지 않는다.

## 문서 정합

관련 CHECK 9개의 상단에 날짜가 있는 안내와 후속 근거 링크를 추가했다. 기존 회차 본문·상태 문구·실행 수치·실패 기록은 보존했다. 트랙 전체 완료가 확인되지 않은 문서에 COMPLETED나 SUPERSEDED를 일괄 부여하지 않았다. canonical index·디자인 정책·제품 코드·환경 설정은 변경하지 않는다.
