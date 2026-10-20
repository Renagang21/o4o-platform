# 서비스·연합회·개별 협동조합 Hero 운영 정비

- 작성일: 2026-10-20
- 상태: 구현·검증 완료 · 개발 branch 인계
- 기준: main `0b9821122a`, branch `wo/service-hero-operator-completion`
- 사용자 지시: 각 서비스 Hero는 operator가 관리. 협동조합은 연합회뿐 아니라 각 서브디렉토리 조합 운영자가 자기 공간을 관리한다. 개발은 검증·push까지.

## 조사와 보완 TODO

- [x] 기존 Hero 작업서, 역할 Architecture, 서비스 카탈로그, 공통 모듈 변경 절차 대조
- [x] 대표/공급자/펀딩/커뮤니티/CarePharm/강의/약국사업/분회 메뉴·공개 소비·저장 API 확인
- [x] 연합회 고정 Hero, 개별 조합 고정 소개 및 누락 편집 메뉴 확인
- [x] Pharmacy/MegaPharm의 상단 고정 제목과 사업 소식 Hero 분리, 대표 홈 옛 CMS Hero 중복 확인
- [x] 연합회 및 조합별 Hero 조회·편집·공개 연결
- [x] 현재 연합회 역할과 현재 개별 조합 역할을 분리 검사. 연합회 역할만으로 조합 편집 불가
- [x] inactive/없는 조합, 다른 조합, 권한 회수, 초안 비노출, 수정 충돌·예약·숨김 검증
- [x] Pharmacy/MegaPharm의 기존 사업별 게시 원장을 홈 상단에 연결하고 Hero 중복 제거
- [x] 옛 대표 홈 CMS의 Hero 편집 진입을 현행 화면으로 안내. 기존 데이터 임의 삭제/이관 없음
- [x] 공통 소비처 회귀·API·타입·운영 빌드·PC/모바일 검증 및 기록 후 commit/push

## 재조사로 확정한 경계

`HomePresentationEditor`/`ServiceHomeHero`와 기존 `cms_contents` 예약 metadata를 재사용한다. 추가 서비스 가입·role·DB schema·migration을 만들지 않는다. 연합회는 `neture:pharmcoop_admin/operator`, 개별 조합은 `cooperative_roles`의 해당 조합 현재 역할과 활성 조합/사업/계정으로 검사한다. 조합 slug는 URL 해석에만 사용하고 서버가 조직 ID를 결정한다. 기존 사업 API의 Neture 역할 게이트를 조합 운영자에게 강제하지 않는다.

공통 소비처: Neture·supplier·funding·community·CarePharm·lecture·pharmacy 사업·분회. 기존 surface/path 계약은 보존하고 cooperative/federation 범위만 추가한다. Pharmacy 회원 홈의 대형 일반 소개 배제는 유지하되 사용자 지시에 따라 기존 게시 Hero를 상단으로 옮긴다. 미게시 상태는 기존 간결한 제목을 유지한다.

내 매장/계정센터/관리자/원내 약품은 기존 Hero 작업서의 관리 제외 범위를 유지한다. 종료한 서비스는 복구하지 않는다. 문서 정합은 이 TODO와 검증 기록으로 남기며 과거 기록을 소급 수정하지 않는다.


## 최종 구현·문서 정합

- 연합회: `/operator/home-presentation`, API `/home-presentation/pharmcoop[/manage]`.
- 개별 조합: `/:cooperativeSlug/operator/home-presentation`, API `/home-presentation/cooperative/:slug[/manage]`. 해당 조합 현재 역할만 사용하며 연합회/Neture-wide 역할로 우회하지 않는다. 조합·연결 사업의 활성 상태와 조직 귀속을 서버에서 해석한다.
- 저장 트랜잭션에서 권한을 재확인한다. 개별 조합 저장은 기존 조합 관리와 동일 조합 row를 잠근 뒤 확인한다. 기존 CMS revision 충돌·초안/공개 분리·예약·안전 URL 검증을 유지한다.
- 저장은 `neture` CMS의 별도 surface(`pharmcoop`/`cooperative`)와 조직 ID로 분리한다. 기존 semi_franchises.organization_id unique, cooperatives.semi_franchise_id unique 제약을 확인했다. schema/migration 없음.
- 연합회/조합 공용 Hero와 공개한 홍보를 각각의 홈에 연결했다. 개별 조합 편집은 기존 조합 제목 아래 h2로 구성한다.
- Pharmacy/MegaPharm 기존 게시 Hero는 상단 h1에 한 번 표시한다. 미게시·숨김·조회 실패 때는 기존 간결한 제목을 유지한다. 광고는 하단 사업 소식에 유지한다.
- 대표 메인의 옛 CMS에서 Hero Slides 편집 탭을 제거하고 현행 Hero 관리 링크를 제공한다. 기존 CMS row·API·광고/로고 기능은 삭제/이관하지 않는다.
- 과거 Hero 작업서의 연합회/조합 누락과 대표 홈의 대상 선택 안내는 과거 기록으로 보존하고 현행 구현 경로는 본 문서에 기록한다. 상세 검증은 [CHECK](../checks/CHECK-O4O-SERVICE-HERO-OPERATOR-COMPLETION-V1.md).
