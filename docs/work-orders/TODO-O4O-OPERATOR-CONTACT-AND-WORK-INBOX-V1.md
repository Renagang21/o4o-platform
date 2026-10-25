# 서비스별 문의·운영자 미처리 업무 정비

- 상태: ACTIVE
- 작성일: 2026-10-21
- 최종 갱신일: 2026-10-21
- 담당: 개발 공간 — 검증·commit·push 후 통합 담당에게 인계
- 기준: main `e09db6eb4b`, 사용자 승인: TODO 작성 → 문서·코드 재조사 → TODO 보완 → 구현 → push

## 1. 초안 TODO — 구현 전

- [x] 서비스별 Contact Us 접수·담당 operator 조회·상세·처리·메뉴 연결
- [x] 연합회와 개별 협동조합의 문의/운영 업무를 독립 범위로 연결
- [x] 알림 필요 사건을 먼저 정의하고 각 원장·생산자·소비 화면 대조
- [x] 신규/재제출 심사, 가입/탈퇴, 펀딩 입금·환급·이행 예외의 미처리 모아보기
- [x] 수신자 없음·개별 알림 실패의 거짓 sent 기록 수정
- [x] 장기 미처리·전달 실패를 목록에서 발견하고 처리 화면으로 이동
- [x] 서비스·사업·조합 간 격리, 실패 입력 보존, 늦은 응답·중복 실행 검증
- [x] 문서 정합·검증 한계·배포 인계 기록 후 push

## 2. 재조사와 구현 결정

초안 작성 후 역할/업무공간 정본·공통 모듈 변경 절차·개인정보 보유 정책과 기존 contact/controller,
scope guard, 사업/조합 관리 service, 펀딩 예외 SQL, 강의/커뮤니티 원장, 각 앱 route/menu를 대조했다.

| 확인 | 보완한 구현 기준 |
|---|---|
| Neture/KPA 문의는 기존 원장, Study는 ContactInquiry | 기존 접수·처리 경로 보존. 새 서브도메인·사업·조합 문의는 기존 ContactInquiry 재사용 |
| ContactInquiry에는 조직 축이 없음 | nullable organization_id와 복합 index만 추가하는 incremental migration. 기존 행 수정/이관 없음. source_path나 service_key에 조합 ID를 숨기지 않음 |
| 공급자·펀딩·커뮤니티·강의는 각자 역할/가입 경계 | 기존 guard 그대로 재사용. 사업 담당은 requireOperatorOf, 연합회 requireFederation, 조합 requireLocal |
| 역할만으로 알림 수신자를 고르면 접근 불가 사용자 포함 | 유효 기간·활성 계정/가입·담당 사업·조합 조건으로 수신자 제한 |
| 알림 실패는 접수 성공과 분리해야 함 | allSettled 결과를 sent/partial/fail/none으로 구분. 미처리 원장 조회는 전달 실패와 무관 |
| 매 사건마다 외부 메일을 보내면 기존 설정과 충돌 | 신규 범위는 앱 알림 + 원장 기반 운영 업무함. 기존 이메일 설정/발송은 보존. 이메일 자동 재전송·SMS/카카오 추가 없음 |
| 읽음은 처리 완료가 아님 | 원장 기반 업무 수·최초 대기·미처리 문의 및 전달 실패 표시. 업무함 진입 시 자동 완료/자동 읽음 없음 |
| 장기 미처리 기준은 새 정책 미정 | 임의 SLA/기한을 만들지 않고 가장 오래된 접수 시각/경과일 표시 |
| 여러 앱이 같은 UI 소비 | 공통 UI에는 transport·범위·이동 경로 주입. Neture/Study/KPA/Store/Pharmcoop의 메뉴·직접 URL·PC/mobile 검증 |

이번 구현은 원장 기반 미처리 업무함을 모든 대상에 연결해 가입/심사/예외를 놓치지 않게 한다.
모든 기존 생산자에 영속 알림을 새로 추가하거나 범용 queue/cron을 도입하지 않는다.
업무함 자동 갱신과 신규 문의 앱 알림을 제공하며, 원격 이메일 전송 성공·실계정 업무 검증은 별도 증거로 구분한다.

## 3. 경계

- operator는 일상 접수·검토·처리, admin은 영구 삭제·서비스 영향 조치. 이 작업은 권한을 넓혀 해결하지 않는다.
- 역할/업무공간 정본, 서비스별 기존 scope guard·조합 권한·사업 담당 관계를 재사용한다.
- 약사회 분회의 업무 확장·전체 관리자 화면 정비는 제외한다.
- 펀딩은 오프라인 입금·환급·이행의 수기 기록 기준. 통장 조회·PG·자동 환급은 제외한다.
- 실제 운영 계정·상품·회원·조합·역할·Hero 내용 변경, 운영 migration·배포는 실행하지 않는다.
- 기존 문의 이관·과거 알림 metadata backfill을 임의 수행하지 않는다.
- dependency·lockfile·CI/IAM 변경 없이 기존 원장과 공통 UI를 우선 사용한다.

## 4. 알림 필요 사건 목록

| 영역 | 사건 | 확인할 증거 |
|---|---|---|
| 문의 | 신규 접수·미확인·장기 미처리·전달 실패 | 서비스/사업/조합 귀속, 목록, 처리 화면 |
| 공급자 | 신청·보완 재제출·품질 검토 | 심사 원장과 operator 접근 |
| 펀딩 | 개설 심사·입금 확인·금액 불일치·환급 잔여·이행 미완료 | 기존 예외 SQL와 원장 |
| 커뮤니티 | 가입·게시판 개설·가입 요청·검토 필요 | service/organization 범위 |
| 강의 | 강사 신청·강의 검토·문의 | lecture 역할과 화면 |
| 약국 협력사업 | 사업 가입·상품/콘텐츠 등재·재제출 | semi_franchise_id 격리 |
| 연합회 | 조합 소속 요청 | 연합회 역할 |
| 개별 조합 | 가입·탈퇴·상품/콘텐츠 검토 | cooperative_roles·조합 상태 |

알림을 읽는 것과 업무를 처리하는 것은 다르다. 미처리 모아보기는 실제 원장에서 계산해 알림 생성 실패나 담당자 변경에도 업무가 사라지지 않게 한다.

## 5. 추가 코드 대조에서 보완

- 신규 업무함 경로가 서브도메인 소유 경로에서 빠지면 대표 호스트로 이동한다. hostProfile의 소유 경로도 함께 보완한다.
- 일반 GlobalHeader utilitySlot은 PC 전용이다. 업무 표시를 PC/mobile 공통 homeSlot에 넣고 기존 알림 벨은 유지한다.
- 기존 사업 콘솔은 `?key=&tab=`를 읽는다. 존재하지 않는 `/operator/semi-franchises/:key` 링크를 만들지 않는다.
- 펀딩 예외 링크를 실제 열기 위해 기존 탭/예외 필터가 URL query를 읽도록 보완한다.
- 강의 심사 요청은 강사 본인 알림뿐이었다. 현재 lecture 운영자 수신과 serviceKey/처리 화면을 추가하고 알림 실패가 저장 성공을 뒤집지 않게 한다.
- PostgreSQL TypeORM UPDATE RETURNING은 [rows, count]다. 실제 통합 테스트가 거짓 성공/충돌 미검출을 잡았고 rowsOf로 교정한다.
- 상세 버전은 PostgreSQL 원문 timestamp token을 반환해 millisecond 변환으로 인한 충돌 오판을 방지한다.
- 기존 contact 이메일 설정/자동 회신은 유지한다. 신규 범위 이메일 자동 설정·기존 문의의 귀속 변경은 하지 않는다.

## 6. 검증 계획

전용 loopback PostgreSQL 빈 DB에서 baseline + 모든 incremental prefix fingerprint, 신규 migration down/up,
조직 문의 존재 시 down 거부, 실제 HTTP 권한/범위/동시 수정/실패 보존/처리 이력·task SQL을 검사한다.
실제 업무 데이터나 계정은 쓰지 않는다. wrapper가 만든 DB만 marker 확인 후 제거하고 서버도 종료한다.
공통 UI의 늦은 응답·계정 전환·중복 저장·저장 후 조회 실패·업무 표시를 테스트한다.
영향 앱 타입/운영 빌드, 정적 guard/lint, PC/mobile 합성 API 브라우저 검증 후 commit·push한다.

- Neture 메인 이용 자격은 수동 가입 승인 행이 아니라 이메일 확인·활성 계정과 명시적 정지/탈퇴 예외다. 수신자/저장 재검사도 이 정책을 따르며, 메인 membership 행이 없는 사업/연합회 운영자 검증을 추가했다.

- 추가 목적지 점검: 공통 Neture 알림에서 Pharmcoop/Store 로컬 경로를 그대로 열면 404가 된다. 신규 문의 알림은 내부 전용 진입 페이지에서 현재 권한을 확인하고 고정 서비스 origin 링크만 제공한다. 임의 외부 URL·인증 우회는 허용하지 않는다. 강의 알림은 기존 service-entry/handoff 경로로 연결한다.
- 일반 Neture 상품·서비스 승인·후보 검토, 사업 이벤트 승인, 펀딩 포럼 연계 실패·기존 모집 기한 경과도 원장 업무 목록에 포함한다. 날짜가 지났다는 이유로 모집 결과/환급을 자동 기록하지 않는다.

## 7. 개발 종료·통합 인계

- branch: `wo/operator-contact-and-work-inbox`
- 실제 운영 로그인/운영 데이터 변경/운영 migration/PR/병합/배포 미실행. 개발 종료점은 push다.
- [검증 기록](../checks/CHECK-O4O-OPERATOR-CONTACT-AND-WORK-INBOX-V1.md)에 최초 실패·수정·재검증과 실계정 한계를 남겼다.
- 배포에는 nullable 조직 컬럼 migration이 선행돼야 한다. 통합 담당은 현재 main과의 차이, 필수 CI/리뷰, 운영 DB 실행 승인 범위를 확인한다.
- 표준 API·영향 웹 배포와 별도로 Pharmcoop `deploy-cooperative.yml` frontend_only/apply=false 절차가 필요하다. 개발 공간은 dispatch하지 않는다.
- 조사 공간/개발 worktree는 통합 후 후속 검증이 끝날 때까지 KEEP한다.
