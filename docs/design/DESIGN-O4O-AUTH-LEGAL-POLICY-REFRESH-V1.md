# Neture 공통 계정 정책·서비스별 가입 정책 개편안

> 상태: DRAFT · 작성일: 2026-10-10 · 갱신일: 2026-10-11
> 사용자 지시: 현재 메인은 neture.co.kr이며, 각 서비스 가입에는 해당 서비스 내용을 제공한다.
> 기존 게시 v1·동의 기록은 보존한다. 이 설계 수정은 본문 게시나 런타임 구현 완료를 뜻하지 않는다.

## 1. 적용 구조 — 이전 통합 서비스 목록을 대체

Neture 공통 계정의 이용약관과 개인정보 처리방침은 **neture.co.kr 계정**을 설명한다.
가입 시 유지 서비스 8개의 사업·거래·교육 조건을 한꺼번에 적용하지 않는다.
도메인 수와 가입 원장·사업 참여 단위는 다르며, 각 서비스를 새 계정으로 만들지 않는다.
공통 정책은 모든 계정 생성 경로에서 같은 Neture 문서를 사용한다.

각 서비스 신청 시에는 그 서비스의 자격·입력·이용 조건·추가 개인정보를 제시한다.
공통 개인정보 재등록·다른 서비스 자동 가입·역할 자동 부여를 하지 않는다.
서비스별 약관 미동의·반려·정지·탈퇴가 공통 로그인과 무관한 서비스에 영향을 주지 않도록 분리한다.

근거: [인증·가입 정본](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md),
[인증·가입 리팩터링](../work-orders/WO-NETURE-AUTH-MEMBERSHIP-REFACTOR-V1.md),
[인증 리팩터링 TODO](../work-orders/WO-O4O-AUTH-REFACTOR-V1.md).
구조와 범위는 현재 사용자 지시를 적용한다. 과거 전체 서비스 통합 약관 설명을 현행 정책으로 재사용하지 않는다.

## 2. 본문 초안

- [Neture 계정 이용약관 개정 초안](DESIGN-NETURE-ACCOUNT-TERMS-V2.md)
- [Neture 계정 개인정보 처리방침 개정 초안](DESIGN-NETURE-ACCOUNT-PRIVACY-V2.md)

초안의 V2는 파일 식별자다. 게시 version은 해당 DB의 기존 version을 조회한 후 더 큰 값으로 정한다.
공통 계정 본문에서 은퇴 서비스 및 서비스별 사업자·전문 자격·거래 조건을 제거한다.
기존 게시 법정정보·보유기간·권리 행사·분쟁 조항은 삭제하지 않고 공통/서비스 범위로 대조해 편집한다.
실제 담당자 개인정보는 검토 문서에 복제하지 않고 현재 법정정보와 게시 원문을 참조한다.

## 3. 서비스별 신청 안내·약관 작성 범위

| 가입·참여 단위 | 해당 신청에 들어갈 내용 | 공통 계정과의 경계 |
| --- | --- | --- |
| 공급자 | 사업자등록증 기재 정보·사본, 담당 업무, 심사·승인·반려·정지·종료 및 재신청 조건 | 공급자 승인만으로 다른 서비스 권한을 부여하지 않음 |
| 내 매장(약국) | 약국 대상, 사업자 정보·사본, 약사 면허번호·약국 전화, 오프라인 자격 확인·승인 | 면허증 파일 불필요; 약사회 승인으로 매장 자동 생성 금지 |
| 약국 협력사업 | 개별 사업 개설 시 정한 참여 조건, 신청 당시 조건·추가 설명, 운영자 심사·탈퇴 | 승인된 약국 사업자 정보 재사용; 사업마다 조건 보존 |
| 커뮤니티·단체활동 | 커뮤니티별 대상·닉네임·가입 조건, 신청·승인·반려·탈퇴, 게시물 운영 | 독립 커뮤니티와 사업 회원 자동 가입을 동일하게 설명하지 않음 |
| 유통참여형 펀딩 | 해당 모집·참여 조건, 참여 자격, 상태 변경·오프라인 입금 확인 범위 | O4O가 제공하지 않는 정식 결제·정산·투자 보장을 약속하지 않음 |
| 강의·학습 | 실제 제공 강의·콘텐츠 이용 조건, 필요한 신청 자격·제한 | 계정은 Neture; 회원가입에 교육 기능 전체 동의를 강제하지 않음 |
| 약사회 분회 | 해당 분회 소속·이용 자격·역할, 신청·승인·활동 조건 | Neture 계정과 분회 소속·권한을 구분 |

행은 본문 작성 단위이며 신규 service_key를 이 이름으로 바로 생성하라는 의미가 아니다.
서비스별 추가 정보는 실제 신청 DTO·저장 원장·승인 처리와 대조해 필수/선택을 확정한다.
약국 협력사업의 조건은 기존 BusinessParticipationPage의 조건 표시·acceptedConditions·신청 시
조건 snapshot을 재사용한다. 새 범용 약관이 개별 사업의 기존 조건 기록을 덮어쓰지 않는다.
전체 관리자는 공개 서비스 가입 약관 목록에 넣지 않고 Google 전용 관리 접근 정책을 유지한다.

## 4. 코드 조사로 확인한 구현 차이

| 조사 대상 | 현재 코드 | 정렬할 계약 |
| --- | --- | --- |
| signup-policy.service.ts | 이번 구현: 새 표식 공통 약관 published 후 모든 허용 origin은 Neture 선택; 그 전에는 약국 기존 선택 유지 | 계정 생성은 Neture 공통 약관; 서비스 약관은 서비스 신청에서 분리 |
| service-legal-scope.ts | legal key는 neture/kpa-society/k-cosmetics/lecture. supplier/community/funding 등의 관리 권한 매핑은 미연결; 게시 정책 공개 read는 catalog key에 연결 | 서비스/사업별 정책 소유권·조회·관리 scope를 현재 catalog/승인 원장과 연결; 도메인별 무작정 key 증설 금지 |
| terms-acceptance.policy.ts | 이번 구현: Neture 공통 + 요청 서비스의 pending만 차단. 서버 소유 API 경로 우선, 공유 API는 서명된 세션 범위 | Neture 공통 계정 약관과 해당 서비스의 정책 gate를 분리; 무관한 서비스 차단 금지 |
| policy-acceptance.service.ts | 이번 구현: 새 표식 공통 약관 published 후 물리 membership 없이 요구·승낙; 서비스 약관 membership 또는 실제 공급자/세미프랜차이즈 resolver 자격 확인. ID/version/hash 보존 | Neture 공통 동의 요구를 물리 Neture membership 생성에 의존하지 않음; 기존 이력 유지 |
| admin-service-legal.controller.ts | publish 즉시 공개; 이전 published는 draft로 보존. version과 시행일은 입력 가능 | 새 draft·증가 version·본문 동일성 검증; 기존 row 덮어쓰기/삭제 금지 |
| 정책 공개·pending 조회 | 이번 구현: 미래 effectiveDate 문서의 즉시 publish를 409로 거부. 공고·예약 공개 기능은 아직 없음 | 공고와 시행을 구분. 미래 시행일만 넣고 즉시 publish하면 안 됨 |

이 차이는 새 본문만 게시해서 해결되지 않는다. 개인정보 고지·필수 수집 동의·선택 마케팅 동의와
이용약관의 계약상 승낙도 별도 축으로 보존한다. 기존 checkbox 시점만 있는 개인정보 동의를
새 문서 version의 승낙이 있다고 허위 backfill하지 않는다.

## 5. 보완 TODO와 실행 순서

- [x] 현재 사용자 지시·리팩터링 문서로 공통/서비스 범위 재정리.
- [x] 계정·서비스 약관 선택, 동의 gate, 정책 게시 API 대조.
- [x] Neture 공통 본문 초안과 서비스별 작성 범위 제시.
- [x] 기존 v1의 공통 권리·의무·분쟁·위탁·국외 처리 조항을 개정 본문에 대조·완성.
- [x] 새 공통 문서 게시 후 계정 생성 정책을 Neture로 통일하도록 구현. 게시 전 약사회 기존 가입 약관 유지 및 전환 회귀.
- [x] 각 신청 원장의 정책 소유권·문서 참조·조건 snapshot을 조사해 서비스별 조회/동의 저장 연결.
- [x] 공통 약관과 서비스별 gate 분리. 공통 정책 미동의와 서비스 미동의의 차단 범위 테스트(로컬).
- [x] 동의 화면에서 서로 다른 모든 문서의 본문·ID/version을 확인하고 하나라도 누락/변경되면 제출 차단. 분회 소비처도 연결.
- [x] 새 문서 조회 실패·버전 변경·동시 게시 시 신청 rollback, 입력 보존·재동의 검증.
- [x] 개인정보 고지/수집 동의 기록의 version 증빙 공백을 조사하고 이력 계약 보완.
- [x] 미래 시행 문서의 즉시 게시 거부. 거부 시 기존 published/draft 수정 없음 검증.
- [x] 공고 경로·개정 전문·현행 문서 링크 준비. 운영 공개는 배포 검증 후 별도 기록.
- [ ] 실제 공고 후 30일 경과 및 시행일 확인 → 새 정책 게시·기존 회원 재동의 운영 검증(시간 조건 대기). 자동 예약 게시로 완료 표시하지 않음.
- [ ] PC/mobile에서 공통 계정 가입, 미가입·대기·승인·반려·정지·탈퇴, 무관 서비스 영향 없음 검증.
- [x] 구현·회귀·문서 갱신 후 PR #457에 push. 최신 HEAD CI·review는 PR에서 확인; main 통합·배포 및 정책 게시와 구분.

## 6. 새 정책 등록·게시 절차

[현재 게시 이용약관](../baseline/O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0.md)의 변경 공고 규칙을
따른다. 최초 v1의 공고 기간 예외를 이번 변경에 적용하지 않는다. 일반 7일, 불리·중요 변경 30일이며
계약을 공통/서비스별로 나누는 이번 개정은 사용자 결정에 따라 **30일 공고 후 시행**한다.
실제 공고일을 기준으로 30일의 공고 기간을 확보해 시행일을 정한다. 초안 작성·push는 공고가
아니므로 초안 승인 당시에는 공고일·시행일이 미정이었다. 실제 운영 공개 검증은 아래 2026-10-12 기록을 따른다.
시행일은 한국 달력 날짜(Asia/Seoul) 기준이다. 실제 공고 시점으로 30일 확보 여부를 확인하며,
시행일 date 입력만으로 공고 이력이 생기거나 30일 경과가 증명되지는 않는다.

1. 대상 서비스·정책·운영 주체·현재 version·본문 hash·기존 동의/FK를 read-only 조사한다.
2. 위 구현 차이를 해결하고 검증한다. 정책 문서 게시로 권한·membership을 생성하지 않는다.
3. 완성·검토한 Neture 공통 본문과 서비스별 본문을 새 draft로 등록한다. 기존 원문을 보존한다.
   공통 이용약관은 새 ID, `service_key=neture`, `document_type=terms`, 현재보다 큰 `version>=2`,
   `slug=neture-account-terms`로 식별한다. 확정 시행일이 없거나 version<2인 표식 문서는 게시를 거부한다.
   기존 v1 또는 표식 없는 v2를 새 공통 계정 약관으로 재해석하지 않는다. 실제 ID·일정은 아직 미정이다.
   공통 표식은 새 문서 등록 시에만 지정한다. 기존 draft의 공통 표식 추가/제거와 published의
   slug 변경을 거부하므로 게시 해제 후에도 기존 문서 ID를 공통 약관으로 재분류하지 않는다.
4. 변경 내용·사유·예정 시행일을 공고한다. 공고 중에 required 약관을 조기 교체하지 않는다.
5. 시행일에 같은 version의 Neture 공통 개인정보 처리방침을 먼저 게시하고 공통 약관을 이어 게시한다.
   공통 약관은 같은 version의 읽을 수 있는 공통 개인정보 처리방침이 없으면409로 거부하며, 기존
   published를 먼저 내리지 않는다. 공통 약관이 활성 상태이면 개인정보의 불일치 버전·legacy 교체와
   현재 공통 개인정보 게시 해제를 거부한다. 전환 중 signup은 정책 세트가 완성될 때까지503으로
   차단한다. 구 published와 기존 동의는 보존하며, 미래 시행 문서는 사전 활성화하지 않는다.
6. API 공개 본문·문서 ID/version/hash, 60초 cache 및 동시 요청, 기존 회원 명시적 재동의,
   서비스별 신청·재동의 범위를 검증한다. 과거 동의 일시·hash를 새 version으로 옮기지 않는다.
7. 게시 API·DB가 바뀌었는지 확인한다. Git push·웹 배포와 정책 DB 게시를 같은 완료로 표시하지 않는다.

## 7. 사용자와 논의할 구체적인 미확정 항목

- **외부 인증 고지 근거**: Google·카카오 로그인에 대한 처리 근거·법적 분류/필요 고지가 현재 공개
  처리방침에 충분히 없다. 서버의 실제 데이터 수신 범위는 확인했지만 계약 검토를 대신하지 않는다.
  기존 Google Cloud·메일·활성 AI 위탁/국외 처리 고지는 보존하고, 인증 제공자 고지는 별도로 확정한다.

필수 이름·개인 휴대전화, 공통 로그인, 서비스별 승인, 약국 전용과 면허증 파일 미수집,
전체 관리자 용어는 리팩터링 문서와 사용자 지시로 확정돼 다시 결정 요청하지 않는다.
유료화는 현재 미정이므로 신규 결제 제한·가격·무료 종료일을 본문에 임의 추가하지 않는다.

## 8. 2026-10-11 이번 구현 범위와 배포 경계

[이번 검증 기록](../checks/CHECK-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md)의 정책 개편 절에
소비처와 실행 결과를 기록한다. 정상 공통 계정의 Neture 약관 요구를 서비스 membership과 분리했으며,
서비스별 반려·정지·미가입을 로그인 거부나 다른 서비스의 약관 미동의로 대체하지 않는다.
불명인 이전 세션 범위는 보수적으로 처리한다. 전체 관리자 업무 예외와 Demo registry 예외는 유지한다.

이번 코드·본문 보완은 push/PR 검토 범위다. 기존 공개 v1·동의 이력·운영 DB를 변경하지 않았다.
새 공통 정책 적용은 완성된 본문·서비스 신청 정책과 실제 공고/시행 계획에 맞춰 운영에 반영해야 한다.
30일 공고를 이번 작성일에 시작한 것으로 간주하지 않으며, 미래 시행일 게시 거부는 공고를 수행하거나
30일 경과를 증명하는 기능이 아니다. 외부 인증 고지·서비스별 신청 문서 연결·개인정보 version 증빙은 남아 있다.


추가 리뷰 보완: 이메일뿐 아니라 Google·카카오 세션 응답도 같은 scoped pending과 Demo 예외를
사용한다. 실제 공급자 API prefix를 일반 Neture보다 먼저 판정한다. 계정 생성의 개인정보 처리방침
링크는 모든 가입 소비처에서 Neture 공통 주소를 새 탭으로 연다. 로컬 PC/mobile 가입 18건과
정책 gate 18건은 통과했으나 서비스 신청 상태 전체와 실제 외부 인증을 검증한 결과는 아니다.


전체 관리자 관리 API는 기존 admin prefix 외에 settings/apps/users 등의 공유 API도 소비한다.
관리 맥락은 서명된 `admin` 세션과 현재 DB의 `platform:super_admin` 역할을 함께 확인한다.
Google 전용·계정/세션 상태·각 route 권한 검사를 통과한 관리 세션은 재동의로 업무를 막지 않는다.
동일 계정이 일반 서비스 세션을 사용하면 공통/해당 서비스 약관을 요구한다. Origin이나 JWT의
오래된 역할로 이 예외를 적용하지 않는다.


Neture namespace 전체는 단일 서비스 전용이 아니다. 매장 본인 신청·취소/공용 조회는 signed
session scope를 유지한다. 실제 전용 management prefix와 공급자 모집 심사 동작은 소유 서비스를
우선 판정한다. 서비스 정책 연결 후 실제 신청 원장과 조건 snapshot의 동시성 검증은 여전히 OPEN이다.


게시 방어의 날짜 비교는 한국 시행일 자정과 UTC 날짜의 차이를 검증했다. 공급자 모집 심사
경로는 기존 후행 slash 정규화와 Express 기본 대소문자 매칭을 적용해 요청 변형으로 범위를
바꾸지 않는다. 실제 공고·게시와 서비스 신청 원장 검증의 OPEN은 그대로 유지한다.


공용 API 아래 공급자 전용 변경은 서버 HTTP 메서드와 경로를 함께 판정한다. 상품 이미지 조회는
signed session scope를 유지하고 이미지 mutation·private supplier library·supplier hub trigger는
공급자 정책을 요구한다. Neture 관리자 hub trigger는 Neture 범위다. 클라이언트 method/serviceKey
값은 판정 근거가 아니다. 실제 원장·조건 snapshot 검증과 공고/정책 게시의 OPEN은 유지한다.


KPA 하위 supplier mount는 일반 KPA 서비스보다 먼저 공급자 소유로 판정한다. 정책 소유 범위
검사는 guard helper 이름뿐 아니라 실제 공급자 identity 조회와 등록 경로를 함께 대조한다.
서비스별 신청 원장·조건 snapshot 및 운영 검증 OPEN은 이 API gate 회귀로 대체하지 않는다.


Store 세션 키는 서비스가 아니라 공통 업무공간 맥락이다. 공통 응답/pending 조회는 가입 자격으로
산출된 정책 중 catalog에서 현재 Store 업무공간을 제공하는 서비스만 노출해 재동의 경로를 제공한다.
무관한 supplier 정책을 Store 전체 차단에 포함하지 않는다. 서비스 전용 API는 계속 실제 소유 범위를
우선한다. 공급자 사업자의 정책 대상/승낙은 기존 canonical resolver의 ACTIVE/PENDING 자격을
함께 사용한다. 복수 공급자는 선택 없이 후보 전체의 자격을 판정하고 legacy fallback 경고 계약도
유지한다. 운영자 membership과 실제 공급자 관계를 합치거나 새 membership/role을 생성하지 않는다.


이미 게시된 정책의 공개 본문 조회는 canonical catalog key에 연결했다. Store 자체는 서비스 키가
아니므로 정책 GET key로 받지 않는다. 법정정보 조회와 관리 작성/게시 scope 확대는 하지 않으며,
각 서비스의 정책 소유권/관리 권한 연결 TODO는 유지한다. published-only 조회는 공고/게시 실행이 아니다.


Store의 여러 pending 문서에 Neture 공통 전문 URL 하나를 공유하지 않는다. 공통 계정 문서는
공통 URL, 서비스별 전문 경로가 미확정인 문서는 링크를 생략하고 각각의 본문을 표시한다.
서비스별 정책 본문/전문 경로와 관리 scope 확정 TODO는 남아 있다.


전문 링크 소유 판정은 소비처별 관례가 아니라 공통 gate의 termsServiceKey 계약으로 확인한다.
termsPath의 실제 조회 key와 일치하는 terms 문서만 링크를 표시한다. Neture/KPA/lecture 소비처를
해당 약관 페이지와 대조했으며 경로 미정인 supplier/community/funding 등은 본문을 표시하고 링크를
임의 추정하지 않는다. 서비스별 본문/전문 경로와 정책 관리 권한 확정 TODO는 여전히 남아 있다.


카탈로그에 semiFranchiseAccessKey가 있는 서비스의 실제 사업자 정책 자격은 기존 서비스 접근
resolver를 pending과 승낙에 함께 사용한다. 약국 기본 승인만으로 사업 가입을 인정하지 않으며
같은 조직의 기본 승인과 해당 사업 가입이 모두 active여야 한다. operator/legacy membership과
별도의 자격 축이며 membership/role·승인 상태를 생성하지 않는다. 신청 시점의 정책/조건 snapshot
및 pending 신청의 동의 수집 연결은 후속 TODO로 남아 있다.


공통 계정 적용은 명시적으로 표식된 새 Neture terms가 실제 published인 경우에만 시작한다.
그 전에는 기존 membership 기반 약관과 약국 가입 약관을 유지한다. 공개 가입 문서와 이메일·
Google·카카오 제출이 같은 전환 판정을 사용하며 게시 후 오래된 약국 가입 요청은 409로 거부한다.
공통 표식은 pending의 accountPolicy 판정에도 반영해 기존 Neture 서비스 약관이 무관한 세션을
막지 않는다. 현재 조직 업무 관계 또는 legacy 공급자 관계가 있으면 빈 pending 결과 캐시를
사용하지 않는다. 관계는 매번 EXISTS 조회하며 새 관계 생성/승인 직후 기존 resolver를 재사용한다.
관계 없는 사용자 캐시는 게시 문서 ID/version/slug 집합이 같을 때 재사용해 membership/원장
전체 조회를 반복하지 않는다. 관계 확인용 DB 조회 1건은 남으며 published 문서 최대 60초 지연은
유지한다. 실제 공고 증빙·30일 경과·정책 게시 및 신청 snapshot TODO는 그대로 OPEN이다.


My Home은 다른 서비스의 보호 API를 조회할 수 있다. 그 API의 428 pending은 공통 로그인
상태에 합쳐 Neture 전체를 막지 않고 해당 resource 패널에 전달한다. 공통 PolicyAcceptanceGate의
inline region에서 문서별 본문/ID/version을 확인하고 승낙 후 원래 resource를 다시 조회한다.
무관한 패널은 유지하며 버전 경합·조회 실패·불완전 응답은 승낙을 열지 않는다. 패널 gate는
modal로 선언하지 않고 복수 제목 ID를 구분한다. 서비스 신청/조건 snapshot 연결 TODO는 유지한다.

원장 cache 후보 중 legacy supplier 조회는 canonical supplier resolver에만 둔다. 약국 및
공급자 후보의 EXISTS를 독립 조회하므로 하나의 정책 유형이면 1건, 두 유형이면 최대 2건이다.
후보 probe는 업무 권한 판정이 아니고 실제 resolver가 자격을 확인한다. published TTL 60초는 유지한다.


표시 문서 확인은 식별자만 일치한다고 완료 처리하지 않는다. 공통 gate는 runtime의 title/content가
빈 문자열이 아닌지 확인한다. 본문 누락·타입 불일치·공백뿐인 응답은 표시/승낙을 열지 않는다.

게시 API도 같은 표시 계약을 확인한다. 공통/서비스 문서의 제목·본문이 누락되거나 문자열이
아니거나 trim 후 비어 있으면 400/POLICY_DISPLAY_FIELDS_REQUIRED로 거부한다. 기존 published
문서 강등과 draft 저장 전에 검사해 잘못된 문서로 재동의를 막지 않는다. 불완전한 문서의
게시 해제는 허용하며 유효한 본문 원문은 변경하지 않는다. 초안 작성·편집은 계속 가능하다.


## 2026-10-11 잔여 작업 전체 실행 — 현행 TODO 보완

이 절은 앞의 push 단계 기록 이후, 사용자의 **전체 진행·main 통합·배포** 승인에 따른 연속 Phase다.
앞 절의 당시 미구현·push-only 설명을 현재 종료 조건으로 읽지 않는다.

- 사용자는 운영회사·보유기간·위탁업체·국외 처리 계약의 변경이 없다고 확인했다.
  공통 이용약관·개인정보 처리방침을 기존 정본과 대조했고, 공개 담당자는 legal-profile에서 표시한다.
- [서비스별 전문](DESIGN-NETURE-SERVICE-POLICY-BODIES-V2.md)은 공급자·약국/약사회·커뮤니티·펀딩·강의의
  실제 신청 범위와 필수/선택 정보, 조건 및 승인·권한 분리를 안내한다.
- 새 서비스 문서의 표식은 `<service_key>-service-terms/privacy`이며 새 ID·version>=2·시행일을 요구한다.
  기존 통합 v1은 새 서비스 신청 동의로 재해석하지 않는다. API 선행 배포 때 기존 웹 신청은 유지된다.
- supplier/community/funding은 독립 조직의 active admin 관리 범위를 연결했다. 약사회·강의의 기존
  관리 경계를 유지하며 전체 관리자가 약사회나 분회를 우회하지 않는다.
- 공급자 신청, 약국 기본 신청·약국 협력사업, 커뮤니티 가입·개설, 펀딩 참여, 강의 수강·강사 신청은
  현재 정책 ID/version/hash와 신청 ID를 같은 transaction으로 저장한다. 조건 원장이 있는 약국 사업과
  펀딩은 당시 조건을 함께 연결한다. 개인정보는 acknowledgement, 약관은 agreement로 기록한다.
  기존 checkbox·marketing 기록을 새 version의 이력으로 허위 전환하지 않는다.
- 공통 이메일·Google·카카오 가입도 새 개인정보 참조를 원자적으로 검증·기록한다. 공통 전환 표식 전
  기존 가입 호환은 유지하고, 전환 후 누락·구버전 제출은 거부한다.
- 게시/본문 변경과 신청은 같은 서비스 advisory lock을 공유한다. 동시 게시가 있으면 일관된 정책
  선택 또는 409로 처리하며 신청·승낙의 일부만 저장되지 않는다. 실패한 입력과 파일 참조는 보존한다.
- 분회는 운영자의 조직 소속 처리 원장이다. 신청자 동의 화면이 없는 운영자 배정 요청에서 운영자의
  체크를 회원의 동의로 기록하지 않는다. 새로운 자기신청·개인정보 수집 범위는 만들지 않는다.
- 공고 URL: `https://neture.co.kr/policies/account-update`. 현행 `/terms`·`/privacy`와 공지사항에서
  연결하며 익명·재동의 전 회원도 읽을 수 있다. 공고 전문과 적용 중 DB 문서는 별개다.
- 공고 예정일 2026-10-12, 시행 예정일 2026-11-13(한국 시간). **실제 운영 공개 시각을 검증해야
  공고 기간이 시작된다.** 배포 지연 시 날짜를 수정하고 최소 30일을 다시 확보한다.

### 남은 실행 조건

- [x] 최신 HEAD 전체 Codex review·CI 확인 → PR #457 main 통합(2026-10-12).
- [x] PR #457·#497 인증 구현의 API·웹 배포 SHA 확인(아래 최종 결과). 이후 #498 My Home의 배포·소유 검증 범위는 #500에서 별도로 완료됐으며 이 인증32조건과 구분한다.
- [x] 공개 공고 전문·날짜·링크의 운영 PC/mobile 검증 및 공개 시각 기록(2026-10-12 KST).
- [x] 유지 서비스 8개 PC/mobile Demo 로그인·업무 권한·로그아웃 회귀 운영 검증(32조건, 아래 기록).
- [ ] 30일 공고 후 시행일에 새 문서를 게시하고 새 가입·기존 회원 재동의 운영 검증.

실제 Google·카카오 본인 인증은 사용자가 진행한다. 공개 Demo와 합성 상태 테스트를 실제 외부 OAuth,
운영 미가입·대기·반려·정지·탈퇴 전체 계정의 검증으로 대체하지 않는다. 운영 상태 계정은 로컬 SSOT가
있을 때만 해당 검증을 수행한다. 30일 대기 항목은 코드·공고 배포와 구분해 남긴다.


### 전체 review 보완 — 부분 게시·재신청·배포 자산

- 서비스 terms/privacy는 같은 새 version의 명시 표식이 둘 다 준비돼야 신청에 사용한다.
  하나만 게시되거나 version이 다르면 조회·신청 모두 503으로 중지한다. 공통 신규 가입도 marked
  terms와 같은 version의 `neture-account-privacy`만 사용하며 legacy privacy로 가입하지 않는다.
  게시 요청은 서비스 lock으로 직렬화하고, 중간 상태에서 부분 증빙이 저장되지 않는다.
- 시행 시 terms/privacy의 새 ID·같은 version·확정된 시행일을 준비하고 개인정보 문서 → 약관 순서로
  게시한다. 두 문서가 준비될 때까지 신청 중지 상태이며 API 조회로 준비 완료를 확인한다.
- 약국 기본·약국 사업·강의 재신청도 기존 행 metadata의 현재 snapshot과 별개로 append-only
  action_logs에 신청 ID와 해당 증빙을 저장한다. 약국 사업의 당시 조건·선택 설명을 함께 보존한다.
  조건만 확인한 legacy 신청은 policy 배열이 빈 조건 감사이며, 약관 동의를 허위 생성하지 않는다.
- 공개 전문은 Docker가 복사하는 `services/web-neture/src/content/legal/` 안에 둔다. 세 개 정본 초안의
  공개 부분과 자산이 일치하는 검증을 추가했고 내부 게시 대조·DRAFT metadata는 자산에서 제외했다.
  Docker·CI 배포 설정을 수정하거나 docs 전체를 production 이미지에 복사하지 않는다.
- 커뮤니티 정책 오류는 기존 lifecycle 응답과 같은 top-level code·문자열 error로 반환해 문서 재조회와
  화면 표시가 정상 작동한다. 커뮤니티 개설 요청의 untrusted 참조도 저장 서비스에서 검증한다.


### 공통 전환 전 약국 개인정보 소유권 보완

추가 review를 반영해 공통 표식 전에는 약국 가입의 terms/privacy 문서·증빙·전문 링크 모두
kpa-society 범위로 유지한다. 공통 표식이 실제 게시된 뒤 Neture의 같은 version 정책 세트로
전환한다. 이메일·Google·카카오 세 경로에서 같은 선택된 범위를 사용한다.
실제 PG의 약국 기존 정책 소유권 3건과 UI 링크·위험 URL 차단을 추가 검증했다.
최종 로컬 고유 PG 검증은 60 PASS(기존 57 + 약국 소유권 3), 공통 auth UI는 202 PASS다.
공통 정책 partial·구버전·DB 오류 rollback 및 one-use grant 재사용 방어 결과를 유지한다.


### 정책 전환 전 신청 이력 보존 (추가 review)

서비스 정책이 아직 게시되지 않은 신청도 `policies: []`로 신청별 감사 로그를 남긴다.
약국·강의 재신청과 공급자 최초 신청을 포함해 기록 누락을 없앴으며, 기존 사용자 동의 증빙을
새로 만들거나 과거 신청을 소급 채우지 않는다. 동일 신청 ID의 두 번 접수를 실제 PostgreSQL에서
검증해 감사 로그 2건·동의 증빙 0건을 확인했다. 관련 단위 55 PASS, 실제 PG 전체 61 PASS, API build PASS.


### 공통 정책 양방향 준비 판정 및 최신 main 통합 검증

privacy가 먼저 게시된 경우에도 공통 terms/privacy의 표식과 version이 함께 일치해야 한다.
선택적 privacy 참조를 생략한 legacy 클라이언트도 이 준비 판정을 우회할 수 없다. 이메일·Google·카카오
각 경로에서 privacy-first의 참조 있음/없음 6건이 account/credential/provider/동의 및 one-use grant를
부분 저장하지 않는 것을 실제 PostgreSQL로 검증했다. 최신 PG 전체 67 PASS/4 suites, 가입 단위127 PASS,
API build PASS. main #484 충돌은 리소스별428·매장 사업 현황을 함께 유지했으며 기존 공급자 관리
대표 진입이 약관 설정으로 바뀌지 않도록 화면 목록 우선순위를 보존했다. 관련 UI100 PASS/8 files,
최신 Neture build와 PC/mobile 합성 gate18 PASS. 공고·시행은 여전히 실제 배포 검증 및30일 기간 이후다.


### 가입 origin 전체의 공통 준비 판정 및 CI 소비처 보완

약국이 legacy KPA 문서를 선택하는 동안에도 Neture 공통 terms/privacy를 별도로 대조한다.
Neture privacy-first 상태에서 약국 origin의 이메일·Google·카카오 참조 있음/없음 가입 6건을 추가해
최신 실제 PG 전체73 PASS/4 suites/0 SKIP, 가입 단위156 PASS/4 suites를 확인했다.
Google 동의 화면의 정책 로딩·실패 시 다른 서비스 개인정보 링크를 노출하지 않으며, 소유권 조회 뒤
정확한 링크를 제공한다(auth UI204 PASS/17 files). 기존 controller 테스트에는 실제 현재 privacy
조회 fixture를 보완했고, stale 신청 테스트는 읽기 잠금과 write가 없음을 구분한다. 커뮤니티 탈퇴
후 재조회는 정책 조회와 access 조회를 각각 검사한다. 새 약관 관리 route가 펀딩의 주 업무 진입을
대체하지 않도록 home entry에서 보조 설정 경로를 구분했다(Neture 전체582 PASS/68 files).

한국 날짜가 넘어가 아직 공개하지 않은 공고 예정일을2026-10-12로 정정했다. 시행 예정일
2026-11-13은30일 이상을 유지한다. 실제 공개 시각 확인 전 공고 완료로 기록하지 않는다.


### 개인정보 링크 소비처 전체 보완 및 운영 배포 사전 진단

Google와 같은 미조회 정책 링크 문제를 이메일·카카오 가입에도 적용했다. 서버가 소유권을 반환하기
전에는 전문 링크를 노출하지 않으며 소유권 확인 후 해당 문서 링크를 제공한다. 공통 auth UI 전체
206 PASS/17 files, 최신 main 포함 Neture 전체597 PASS/70 files를 확인했다. API 및 Neture
최신 main 빌드도 통과했다. 공개 공고 전문의 날짜는 실제 공고 전2026-10-12(KST)로 맞췄다.

읽기 전용 Delivery 진단 run38185745396은2026-10-11T23:50:24Z에 GCP WIF
`unauthorized_client / The given credential is rejected by the attribute condition`으로 실패했다.
PH 폐기의 workflow/SHA 단독 제한 기록과 일치하며 API/Web/Admin/Report는 SKIPPED였다.
배포0·운영 정책 게시0이고 serving SHA를 확인하지 못했다. 다른 트랙의 WIF 조건을 수정하거나
배포 경계를 우회하지 않는다. PH 작업 종료·기존 조건 복원 후 canonical 배포와 운영 smoke를 재개한다.


### 정책 갱신 재동의와 공통 정책 적용 순서 (최종 review 보완)

이메일·Google·카카오 가입에서 정책 변경/재조회가 발생하면 약관과 개인정보 체크를 모두 해제한다.
새 개인정보 ID/version을 과거 체크로 제출하지 않으며 재확인 전 제출을 차단한다. 추가 회귀3건을
포함한 auth UI209 PASS/17 files를 확인했다. 공통 약관의 글로벌 요구 활성화 전에 같은 버전의
게시된 공통 개인정보 본문이 있어야 하고, 적용 중 개인정보의 삭제·불일치 버전/legacy 교체도
거부한다. draft 게시 해제와 같은 버전 복구는 허용한다. 게시·소유권49 PASS/2 suites, API build PASS.

공개 전문 자산은 서비스 내부의 `.txt` 원문을 raw import하므로 Markdown 제외 패턴에 의존하지
않는다. 정본 공개 부분 대조3 PASS, Neture build PASS, 새 번들 PC/mobile 공고4 PASS
(anonymous/pending 합성 API)다. Docker 이미지 실행이나 운영 게시를 검증한 결과는 아니다.
main 통합·운영 배포 검증은 아직 진행 중이며 WIF 진단의 인증 거절 상태는 해소되지 않았다.


### 2026-10-12 운영 반영·공고·Demo 검증 및 분회 이미지 보완

- PR #457은 최종 HEAD `199de048ba`의 CI·Codex blocker 없음·미해결 스레드 0을 확인하고
  main `210529860d`로 통합했다. PR CI run38188346785와 main CI run38189055903은 SUCCESS다.
- PH 종료 후 WIF 복원을 사용자가 확인했다. 읽기 전용 인증 run38187804879와
  Delivery 진단38188246897이 SUCCESS다. 이전 WIF 거절 기록은 당시 결과이며 현재 blocker가 아니다.
- Promote38189866093은 main 이동으로 SUPERSEDED되어 실제 배포하지 않았다. 최신 문서 변경을
  포함한 Promote38190265457(target `0e1aa41eaf`)에서는 API·Neture·KPA Society·강의·매장·전체 관리자
  이미지 배포 job이 SUCCESS였다. 분회는 Docker 이미지 빌드가 실패했고 전체 Report도 FAILED다.
  후속 Promote38192368264에서도 분회 빌드가 실패했다. 전체 배포 완료로 기록하지 않는다.
- 분회 package.json에 추가한 `@o4o/shared-space-ui`가 기존 Docker COPY 목록에는 빠져 있었다.
  기존 UI·content-editor의 manifest/source도 함께 복사하고 기존 build 명령을 추가하는 최소 보완이다.
  dependency·lockfile·운영 DB·WIF·workflow·트래픽 정책을 추가 변경하지 않는다.
- 실제 Docker COPY와 같은 독립 파일 집합(기존 node_modules/dist 없음)에서 workspace 의존성
  8개 closure, pnpm10.25 설치, types/auth-utils/auth-client/ui/content-editor 및 Vite build를 통과했다.
  기존 작업 폴더의 분회 type-check 포함 build도 PASS다. 로컬 Docker 이미지는 기본 설정 경로의
  읽기 전용 제한으로 미실행이며, 독립 빌드를 Docker 이미지 검증으로 바꾸어 부르지 않는다.
- 운영 공개 공고 `https://neture.co.kr/policies/account-update`는 PC1440/mobile390 HTTP200,
  전문14625자·표1개·제목46개·내부 DRAFT 미노출·모바일 overflow 없음·현행 약관 왕복 링크 PASS다.
  두 화면의 렌더 article SHA-256은 `9905a241b9f7b2f7317219b2f0f24896307731eee6bf112d26c6a58ce05b5d74`다.
  최초 보존된 전체 PC/mobile 확인 시각은2026-10-12T01:17:39.163Z(한국10:17:39)부터다.
  실제 공고일2026-10-12·시행 예정일2026-11-13은30일 이상을 확보한다.
- 유지 서비스8개(Neture·공급자·커뮤니티·펀딩·약국·매장·강의·분회)의 PC/mobile ×
  매장 경영자/공급자 실제 Demo 버튼32조건을 검증했다. 초회30/32 PASS 뒤 공급자 화면2조건은
  정확한 전역 메뉴 선택과 공급자 정보 안내의 ‘나중에 하기’ 처리로 재검증 PASS다.
  로그인/내 정보200, 전체 관리자403, 역할별 업무200/403, Demo 비밀번호·연결 관리 제한,
  UI 로그아웃200 후 access/refresh401을 확인했다. Neture 매장 Demo의 매장 handoff와
  원래 Neture 세션 로그아웃 후 매장 세션 유지200도 PC/mobile에서 확인했다.
- 운영 정책 계약14건은 PASS다. 가입8 origin의 현행 terms/privacy v1·정확한 privacy 소유권·no-store,
  서비스5곳의 미적용 새 정책 배열[], Neture 공통 계정의 독립 서비스 신청 제외404를 확인했다.
  이번 실행에서 운영 정책을 게시하거나 과거 동의 증빙을 채우지 않았다.

현재 남은 조건: 분회 수정안의 최신 review/CI → main 통합 → canonical 배포 및 실제 serving SHA,
2026-11-13 시행일의 새 정책 게시·기존 회원 재동의, 사용자 본인의 실제 Google·카카오 인증,
로컬 `docs/local/TEST-ACCOUNT.txt` 확보 후 일반 계정 상태별 운영 검증이다. 해당 SSOT는 이 checkout과
기준 workspace에 없어 Demo를 미가입·대기·반려·정지·탈퇴 일반 계정의 증명으로 대체하지 않는다.
GitHub 배포 로그/자료의 `productionresultssa7.blob.core.windows.net`은 현재 프록시403으로
조회가 차단돼 실제 serving SHA 확인은 OPEN이다. 환경 초안에 도메인을 추가했으며 저장·게시 후 재확인한다.


### 2026-10-12 분회 수정 통합·배포 최종 결과

- [PR #497](https://github.com/Renagang21/o4o-platform/pull/497)의 최신 HEAD `cdc9138614`는
  Codex 주요 지적 없음·미해결 스레드0, PR CI38194647281 SUCCESS다. 정상 PR merge로
  main `899e871cce`에 통합했고 main CI38195234125도 SUCCESS다.
- 원래 Docker manifest 파일 집합은 실제 설치에서 shared-space-ui 누락 오류로 실패했다.
  수정된 독립 파일 집합의 설치·5개 의존성/Vite build가 통과했다. 추가로
  [Promote38195979353](https://github.com/Renagang21/o4o-platform/actions/runs/38195979353)의
  실제 Docker 이미지 build/push·Cloud Run 배포·최종 Report가 모두 SUCCESS다.
- 분회 최종 serving SHA는 `899e871ccee0114f6cf7ac73999011a1d364b994`다. Report는 GCP serving을
  다시 읽고 계획된 서비스의 SHA가 target과 일치할 때만 DEPLOYED로 판정한다.
  해당 SHA의 최종 production status도 SUCCESS/DEPLOYED다.
- API·전체 관리자·Neture·KPA Society·강의·매장의 실제 serving 검증은 앞선 run38190265457의
  최종 production status에서 통과한6개를 확인했다(target `0e1aa41eafab8cd3bc1b2c099f20d903ac785a18`).
  최신 Promote에서는 추가 runtime 변경이 없는6개를 재배포하지 않고 분회만 배포했다.
  앞선 전체 FAILED는 분회 실패 때문이며 이번 성공으로 그 배포 잔여가 해소됐다.
- 분회 배포 후 PC/mobile × Demo2역할4조건도 검증했다. 초회3/4 뒤 PC의 초기 카카오 버튼
  로딩 시간 초과1조건을 별도 재실행해 실제 설정 조회200·enabled·버튼 표시와 로그인/권한/로그아웃
  PASS를 확인했다. 앞선8개 origin32조건과 구분해 기록하며 새 분회 결과를 포함한 최종 범위는32/32다.
- 공개 공고 PC/mobile 및 계약14건의 결과는 이전 기록대로 유지한다. 공고 전문을 다시 쓰거나
  시행일 전 운영 정책을 게시하지 않았다. 확인한 날짜는 한국2026-10-12, 시행 예정일은2026-11-13이다.
- 상세 Actions 로그의 추가 허용 도메인은 초안 저장 상태이며 현재 실행 리비전42에는 아직 없다.
  실제 serving 증명은 허용된 GitHub 최종 status 및 Report 성공으로 확인해 그 OPEN을 해소했다.
  초안 저장을 환경 게시/적용 완료라고 기록하지 않는다.

현재 TODO는 ①30일 공고와 시행일 충족 후 새 정책 게시·기존 회원 재동의 운영 검증,
②사용자 본인의 Google·카카오 실제 인증·명시적 계정 연결 확인,
③로컬 테스트 계정 SSOT 확보 후 일반 미가입·대기·반려·정지·탈퇴 상태별 운영 검증이다.
PR #457·#497의 인증 구현/배포·공고 공개·해당 serving SHA의 Demo 검증을 완료했으며 이 세 조건을 완료로 대체하지 않는다.
현재 새 main의 개인정보 최소화·달력 보유기간 정본도 시행 전 최종 문서 대조에 포함한다.

같은 인증 WO의 연속 결과 기록으로 전용 branch를 유지한다. 배포 결과 기록만의 변경은
DEPLOYMENT=NOT_APPLICABLE이다. 자체 local static 서버와 PostgreSQL fixture는 종료했고
일반 상태 계정 SSOT/정책 시행 후속이 있어 WORKTREE_DISPOSITION=KEEP다.


#### 현재 열린 TODO

- [ ] 2026-11-13 시행 예정일과 실제30일 공고 충족 확인 → 새 정책 게시·기존 회원 재동의 운영 검증.
- [ ] 사용자 본인의 Google·카카오 실제 인증과 명시적 계정 연결 결과 확인.
- [ ] 로컬 테스트 계정 SSOT 확보 → 일반 미가입·대기·반려·정지·탈퇴 상태별 운영 검증.


#### 배포·검증 완료 범위 한정 — PR #501 review 보완

위 완료 판정은 인증 PR #457·#497의 배포 증거(API/admin/Neture/KPA Society/강의/매장 `0e1aa41eaf`,
분회 `899e871cce`)와 그 serving에서 실행한32조건에 한정한다. 저장소 최신 HEAD 전체를 배포·검증
완료로 판정하지 않는다. 이후 main에 들어온 [PR #498](https://github.com/Renagang21/o4o-platform/pull/498)
`004a42c0`의 My Home overview·업무 카드·알림 요약 runtime 변경은 해당 serving/32조건에 포함되지 않는다.
이 문서-only 기록 PR #501도 #498의 배포나 운영 smoke를 대신하지 않는다.

- [x] 별도 #498 My Home Delivery·실제 serving·소유 검증 범위 완료 기록 확인(#500, 아래 추가 결과) — 소유 트랙
  [TODO-O4O-MY-HOME-MINIMAL-OVERVIEW-V1](../work-orders/TODO-O4O-MY-HOME-MINIMAL-OVERVIEW-V1.md)에서 당시 OPEN으로 유지했고 이후 완료 기록을 아래에 확인했다.


#### 최신 My Home 소유 트랙 완료 확인 및 추가 인증 검증

위 review 보완 당시 OPEN이었던 별도 #498 항목은 이후 문서 PR #500/main `03aa2824aa`에서
소유 TODO가 COMPLETED로 갱신됐다. 구현 SHA `004a42c012ad8b67a446db373d4de33889c6f4e8`의
Delivery38196926152와 최종 production status는 Neture DEPLOYED/SUCCESS다.
이후 Neture PC/mobile × 매장 경영자/공급자 Demo4조건을 추가 실행해 새 My Home 모아보기
표시·계정 설정 링크 클릭/직접 접근과 기존 로그인·업무 권한·관리 제한·UI 로그아웃·토큰 폐기를
모두 확인했다. 기본32조건(인증 배포 SHA)과 이 최신 Neture4조건을 구분하며 합산된 별도 고유
조건으로 늘려 보고하지 않는다. 일반 상태 계정·본인 외부 OAuth 검증으로도 대체하지 않는다.

- [x] 별도 #498 Delivery·serving·소유 트랙의 명시 검증 범위 완료 기록 확인(#500).
- [x] Neture 최신 My Home의 Demo 인증·계정 설정 진입 PC/mobile4조건 추가 검증.

현재 열린 인증 TODO는30일 이후 정책 적용·본인 외부 OAuth/명시적 연결·일반 상태 계정 SSOT의
세 조건이다. My Home AI 등 소유 트랙의 제외 범위를 이 인증 작업으로 새로 구현하거나 닫지 않는다.
