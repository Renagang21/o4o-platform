# 서비스 문의의 수신 책임·중앙 운영 연결 검증

- 상태: ACTIVE · 개발 검증 기록
- 작성일: 2026-11-01
- 작업: [TODO](../work-orders/TODO-O4O-SERVICE-CONTACT-OPERATOR-REVIEW-V1.md)
- 사용자 지정 종료점: commit·push까지. PR 생성·main 병합·배포 없음.

## 수신과 처리 책임

| 접수 대상 | 수신 담당 | 처리 공간 |
|---|---|---|
| Drugstore, CarePharm | 해당 서비스 운영자 | 기존 해당 서비스 문의 관리 |
| 개별 협동조합 | 그 조합의 유효 운영자 | 해당 조합의 문의함 |
| 협동조합 연합회 | 중앙 연합회 문의 담당 operator | `/operations/pharmcoop/inbox` |
| O4O·공급자·펀딩·강의·커뮤니티 | 해당 문의 메뉴를 위임받은 중앙 operator | 각 서비스의 중앙 문의 업무 |
| 내 매장·원내 도구·약국/분회 서비스 공개 안내 | 중앙 공통 문의 담당 operator | `/operations/neture/inbox`의 대상별 탭 |

중앙 운영은 현재 계정·유효한 명시적 중앙 위임·Google proof·문의 메뉴를 함께 확인한다.
전체 관리자는 기존 정본의 전체 업무 권한으로 수신한다. 일반 서비스 역할만으로 중앙 문의를 수신하지 않는다.
원래 조직 문의 원장은 이전하지 않고 organization_id NULL인 공개 서비스 문의만 중앙에 제공한다.
기존 Neture 문의 원장은 기존 문의 관리 메뉴·권한으로 유지한다.
서비스 내부 업무·가입·상품 권한, 실제 문의/운영자 설정을 변경하지 않는다.
퇴역 서비스의 공개 접수를 복구하지 않는다. 외부 이메일은 기존 설정과 제공자 경계를 유지한다.

## 구현

- 신규 문의 알림의 수신자를 현재 중앙 메뉴로 결정하고 operationMenu를 기록한다.
- 중앙 알림 목록과 unread count에 같은 조건을 적용한다. 이전 Contact 알림도 해당 문의 메뉴로 제한해 제목 노출을 막는다.
- 문의 알림은 고정 Admin origin의 실제 중앙 화면으로 이동한다. 일반 도구 문의는 contactService query로 선택을 유지한다.
- 문의 메뉴 명칭을 접수·처리 업무로 명확히 하고 공통 운영 문의 대상 탭을 제공한다.
- 조직 문의의 수신자 부재 안내는 내용을 포함하지 않는 중앙 담당자 지정 알림으로 유지한다.
- 기존 상세·메모·상태·이메일 답변·발송 이력·접수 알림 재처리 UI/API를 재사용한다.

## 검증 증거

- Node 22.18.0 / pnpm 10.25.0, frozen-lockfile 설치 및 공통 패키지 빌드.
- API·Admin 전체 타입 검사, Admin production build 통과.
- 중앙 권한·메뉴·알림 HTTP/overview 4 suites 23 tests 통과. 이후 PostgreSQL 책임 분리 테스트 1건을 추가해 해당 suite 5 tests 재검증 통과.
- 기존 Contact 실제 PostgreSQL 통합 33 tests 통과: 접수·범위·상태·답변 실패/경합·알림 재시도/중복 방지.
- 일반 서비스 역할과 중앙 위임을 fixture에서 분리하고 실제 요청 URL을 넣어 기존 Neture guard 검증을 유지했다. 공개 분회 안내 문의는 조합/분회 자체 admin 대신 중앙 담당으로 기대 결과를 정정했다.
- 실제 Admin 운영 번들·Chromium 1440/390: 합성 Google 운영자, 문의 탭 직접 URL → 상세 → 답변 성공/이력 → 다른 문의 탭 전환. 각 1회 합성 답변 POST, pageerror 0, 예상 밖 API 0, 문서 가로 넘침 0.
- 모든 브라우저 API는 합성 응답이다. 운영 로그인·운영 문의·실제 이메일 발송은 미실행.
- 브라우저 첫 시도의 잘못된 테스트 버튼 이름을 실제 '답변 보내기'로 수정 후 재검증했다. 제품 코드 결함을 테스트 성공으로 숨기지 않았다.

## Shared Module Change Verification

### Changed shared module

- Module: 중앙 업무 메뉴 label, 공통 Contact 수신/인가·알림 필터
- Package: `@o4o/types`, API application modules
- Direct consumers: Admin 메뉴·위임 메뉴 선택·중앙 업무 directory, Contact 접수/재시도·운영 조회, 중앙 알림/overview
- Indirect consumers: 직영 서비스 Contact, 독립 약국·CarePharm·Drugstore·Pharmcoop 조합 문의

### Consumer impact matrix

| 소비처 | 변경 영향 | 검증 |
|---|---|---|
| Admin / Neture 공통 | 문의 대상 탭·알림 목적지·메뉴 표현 | 타입·운영 빌드·단위·PC/mobile 합성 브라우저 |
| Supplier / Funding / Community / Study | 수신자와 문의 관리의 중앙 위임 확인 | 실제 PostgreSQL 권한/접수·답변 회귀, 목적지 단위 테스트 |
| Pharmcoop 연합회 | 중앙 연합회 문의 메뉴로 수신 | 실제 PostgreSQL 수신자·권한 |
| Drugstore / CarePharm | 기존 담당 수신자 유지 | 실제 PostgreSQL 두 서비스 수신자 격리 |
| 개별 조합 | 기존 조직별 수신자 유지 | 실제 PostgreSQL 서로 다른 조합 수신자 격리 |
| 분회·약국 공개 안내 / 도구 | 중앙 공통 문의 탭·인가 | 실제 PostgreSQL HTTP 범위·UI 탭 전환 |
| 퇴역 K-Cosmetics | 복구·권한 확장 없음 | 기존 공통 타입 빌드·일반 문의 코드 경계 확인 |

### Route / role / capability check

기존 route와 menu key를 재사용하며 신규 역할·membership·capability·migration을 만들지 않는다.
조직 문의는 기존 own-organization 경계로 남는다. 문의 읽음과 업무 완료는 별개다.
메뉴를 회수하면 현재 중앙 조회·수신 검사가 거부한다. 조회 실패를 0건/수신 성공으로 위장하지 않는다.

### Smoke result

Admin: PC/mobile PASS (합성 API). KPA/Neture/Pharmcoop 실제 계정·외부 메일: 미검증.
현재 환경과 기준 checkout 모두 비공개 테스트 계정 기준 파일이 없어 운영 로그인으로 대체하지 않았다.

## Git·운영 상태

전용 worktree `/workspace/o4o-wt/service-contact-operator-review`, branch `wo/service-contact-operator-review`.
검증 로그와 합성 화면은 `/tmp/contact-*`에 보관하며 공개 저장소에 넣지 않는다.
작업 branch는 후속 개발/통합 전까지 KEEP한다. 실제 commit·push SHA는 최종 보고로 인계한다.

## 최신 main 대조 후 재검증

작업 중 중앙 업무 운영자 지정 PR #913이 반영돼 main이 `28270d11fd`로 이동했다.
미게시 작업 commit을 그 main 위로 rebase했으며 충돌은 없었다. 새 지정 기능도 기존 `o4o-direct` 역할 할당과 메뉴 제한을 사용함을 확인했다.
그 기준에서 API 실제 PostgreSQL/HTTP 5 suites 57 tests, Admin 5 files 33 tests, API·Admin 타입 검사와 Admin production build를 다시 통과했다.
PC/mobile 합성 대응 흐름도 최신 빌드에서 다시 확인했다. 실제 이메일 제공자 전달과 운영 계정 검증은 여전히 미실행이다.
초기 범위 검사 CLI가 실행 제약으로 중단된 뒤 commit이 진행된 도구 순서 오류가 있었다. commit의 실제 19개 경로를 명시한 작업 목록과 직접 대조해 정확히 일치함을 확인했다.
후속 문서 commit은 범위 검사 성공 후 실행한다. 기존 checkout과 다른 작업공간은 수정하지 않았다.
