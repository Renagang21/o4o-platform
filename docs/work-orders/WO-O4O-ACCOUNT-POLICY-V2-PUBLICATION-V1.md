# Neture 계정 이용약관·개인정보 처리방침 · 서비스별 안내 v2 게시

> **상태**: ACTIVE
> **작성일**: 2026-11-08 · **최종 갱신**: 2026-11-08 (LOCAL §5-1 · §5-2 완료)
> **실행 위치**: LOCAL
> **인계**: claude/intelligent-cray-o2p4u3 · §5-1 · §5-2 완료(2026-11-08) · §5-3 · §5-4 는 사용자 수작업(2026-11-13 이후 · §6-3) · kpa-society 는 게시 대상 아님(삭제한 서비스 · 2026-11-08 사용자)
> **근거**: 사용자 확인(2026-11-08) — 공개 `/terms` · `/privacy` 가 리팩터링 전 서비스(KPA Society · K-Cosmetics · PharmacyHub)를 적용 대상으로 나열. 이미 공고된 개정안(공고일 2026-10-12 · 시행 예정일 2026-11-13)을 시행일에 게시해 해소하기로 함

## 1. 배경

### 1-1. 지금 공개 중인 v1

- `supplier.neture.co.kr/terms` 등 Neture 계열 호스트의 `/terms` · `/privacy` 는 `service_policy_documents` 의 `service_key='neture'` 최신 published 문서를 보여 준다
  (`services/web-neture/src/pages/legal/PolicyDocumentPage.tsx` — `carepharm` 호스트만 별도).
- 지금 보이는 것은 v1(시행 2026-09-17)이다. 본문이 "Neture · KPA Society · K-Cosmetics · PharmacyHub 에 공통 적용"이라고 적는다.
  현재 구조(서브도메인 서비스 — [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) §2)와 맞지 않는다.
- v1 은 2026-09-17 [`WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1`](WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1.md) 후속으로 4개 서비스에 게시됐다.

### 1-2. 이미 공고된 v2

- 공고 페이지: `neture.co.kr/policies/account-update` (`services/web-neture/src/pages/legal/AccountPolicyNoticePage.tsx`).
  `ACCOUNT_POLICY_NOTICE_DATE = '2026-10-12'` · `ACCOUNT_POLICY_EFFECTIVE_DATE = '2026-11-13'`.
- 공고 본문 원본(저장소):

  | 문서 | 원본 파일 | 게시 본문에서 뺄 내부 절 |
  |---|---|---|
  | Neture 계정 이용약관 v2 | `services/web-neture/src/content/legal/neture-account-terms-v2.txt` | `## 부칙 및 게시 전 대조` 이하(현재 파일에는 없음) |
  | Neture 계정 개인정보 처리방침 v2 | `services/web-neture/src/content/legal/neture-account-privacy-v2.txt` | `## 9. 게시 대조 기록` 이하(현재 파일에는 없음) |
  | 서비스별 이용약관·개인정보 안내 v2 | `services/web-neture/src/content/legal/service-policies-v2.txt` | `## 내부 게시·적용 대조` 이하(현재 파일에는 없음) |

- v2 에는 서비스 목록이 없다. 계정 약관은 neture.co.kr 공통 계정만 다루고, 서비스별 안내는 공급자 · 약국·약사회 · 커뮤니티 · 펀딩 · 강의 단위다.
  K-Cosmetics · PharmacyHub 언급은 세 파일 모두 0건이다(2026-11-08 `grep` 확인).
- 설계 근거: [`DESIGN-NETURE-ACCOUNT-TERMS-V2`](../design/DESIGN-NETURE-ACCOUNT-TERMS-V2.md) · [`DESIGN-NETURE-SERVICE-POLICY-BODIES-V2`](../design/DESIGN-NETURE-SERVICE-POLICY-BODIES-V2.md).

### 1-3. 게시 규칙(현재 코드)

- 법적 문서는 덮어쓰지 않는다. 새 문서(새 ID · version 2 이상)를 만들어 게시하고, v1 은 보존한다(`service-policy-lifecycle.ts` — 삭제 없음 · archive/restore 만).
- 시행일 전에는 게시가 거부된다(`assertPolicyEffectiveForPublication` — 한국 날짜 기준). **2026-11-13 당일 이후에 게시한다.**
- 게시되면 기존 회원은 다음 로그인 때 새 약관 재동의 화면을 본다(`user_policy_acceptances` · `428 TERMS_ACCEPTANCE_REQUIRED`). 공고문에 적은 동작 그대로다.

## 2. 사용자 확정

- v1 본문을 직접 고치지 않는다. 회원이 동의한 원문이고, 동의 증빙이 문서 ID · version · 본문 hash 로 남아 있다.
- 공고된 v2 본문을 바꾸지 않는다. 바꾸면 다시 30일 공고해야 한다.
- 시행일(2026-11-13)에 v2 를 게시해 `/terms` · `/privacy` 를 현재 구조로 바꾼다. 실행은 VS Code 로컬 세션이 한다.

## 3. 설계 판단

| 결정 | 근거 |
|---|---|
| 게시 본문 = 공고 페이지에 보이는 본문과 글자 단위로 동일 | 공고한 내용과 시행 본문이 달라지면 공고 효력 문제. 공고 페이지는 위 원본 파일에서 `> ` 메모 줄 · `# ` 제목 줄을 빼고 `**굵게**` · `[링크](url)` 표기를 글자만 남겨 표시한다(`AccountPolicyNoticePage.tsx` `body()`). 같은 규칙으로 만든 본문을 게시한다 |
| 게시는 관리자 화면으로 한다(직접 SQL 금지) | 관리자 API 가 version · 시행일 · 게시자 기록과 권한 검사를 한다. 운영 DB 직접 write 는 하지 않는다 |
| 서비스별 안내는 서비스마다 "공통 적용 원칙 + 그 서비스의 이용약관 / 개인정보 안내"를 한 문서로 게시 | `DESIGN-NETURE-SERVICE-POLICY-BODIES-V2` 「내부 게시·적용 대조」 — 공통 본문만 따로 서비스 약관으로 쓰지 않는다 |
| 서비스별 문서 slug 는 `<service_key>-service-terms` · `<service_key>-service-privacy` | 같은 설계 문서 머리말 |
| 퇴역 서비스(`k-cosmetics` · `pharmacy-hub`)의 v1 은 그대로 둔다 | 보존 의무 대상 동의 증빙. 정리는 범위 밖 |

## 4. 범위 밖

- 약관 본문 수정 · 새 조항 추가(필요하면 별도 개정 + 새 공고).
- 퇴역 서비스 v1 문서의 게시 해제 · 보관.
- `kpa-branch`(분회) 전용 약관 신설. 서비스별 안내의 "약국·약사회"는 게시하지 않는다 — `kpa-society` 는 삭제한 서비스다(2026-11-08 사용자 확인 · §6-3 6). 원래 설계는 `kpa-society` 게시였다(설계 문서 「내부 게시·적용 대조」). 분회에 별도 게시가 필요해 보이면 하지 말고 보고한다.
- 코드 변경. 게시 중 코드 문제가 보이면 멈추고 CLOUD 로 넘긴다.

## 5. TODO

### 5-1. 사전 확인 — 운영 DB read-only (2026-11-13 전에 해도 됨)

- [x] [LOCAL] `/db-readonly` 로 아래 SQL 실행 · 결과를 마스킹 없이 적어도 되는 값(서비스 · 종류 · version · 상태 · 날짜 · 건수 · hash)만 §6 에 기록

```sql
-- Q1. 서비스별 정책 문서 현황 (본문·제목 원문은 고르지 않는다)
SELECT service_key, document_type, version, status, slug,
       effective_date::date AS effective_date, published_at::date AS published_date,
       length(content) AS content_length, md5(content) AS content_md5
FROM service_policy_documents
WHERE service_key IN ('neture','supplier','community','funding','lecture','kpa-society','k-cosmetics','pharmacy-hub')
ORDER BY service_key, document_type, version;

-- Q2. 서비스·문서별 동의 건수 (게시 후 재동의 대상 규모 파악용)
SELECT d.service_key, d.document_type, d.version, count(*) AS acceptances
FROM user_policy_acceptances a
JOIN service_policy_documents d ON d.id = a.policy_document_id
GROUP BY d.service_key, d.document_type, d.version
ORDER BY 1, 2, 3;
```

판정:

| Q1 결과 | 판정 | 다음 |
|---|---|---|
| `neture` terms/privacy 에 version ≥2 · `draft` 행이 있음 | 초안 등록됨(A) | 그 초안의 `content_md5` 를 §5-2 의 게시 본문 md5 와 비교. 다르면 게시하지 말고 보고 |
| version ≥2 행이 없음 | 초안 미등록(B) | 11-13 에 관리자 화면에서 새 문서 작성 → 게시 |
| version ≥2 · `published` 가 이미 있음 | 이미 게시됨(C) | 게시 생략 · §5-4 확인만 |
| 서비스별(supplier · community · funding · lecture · kpa-society) 도 같은 기준 | 서비스마다 A/B/C 기록 | |

### 5-2. 게시 본문 준비 (2026-11-13 전에 해도 됨)

- [x] [LOCAL] 최신 `origin/main` 에서 위 원본 파일 3개를 읽어, 공고 페이지와 같은 규칙(§3 첫 행)으로 게시 본문 8개를 만든다:
  - `neture` terms(계정 이용약관) · `neture` privacy(계정 개인정보 처리방침)
  - `supplier` · `community` · `funding` · `lecture` 각각(`kpa-society` 는 2026-11-08 사용자 확인으로 제외): 「공통 적용 원칙」 + 「<서비스> 이용약관」(terms) / 「공통 적용 원칙」 + 「<서비스> 개인정보 안내」(privacy) — 서비스당 2개, 모두 10개
- [x] [LOCAL] `neture.co.kr/policies/account-update` 화면 본문과 대조해 글자가 같은지 확인. 본문 파일은 커밋하지 않는다(저장소 원본이 정본)
- [x] [LOCAL] 각 본문의 md5 를 기록(§6) — 게시 후 Q1 `content_md5` 와 대조한다

### 5-3. 게시 — 2026-11-13 이후 · **통합 담당 명시 승인 필요**(운영 데이터 변경 · `AGENTS.md` §5)

- [ ] [CLOUD · 선행 필수] **새 문서 등록 화면에서 slug(표식)를 지정할 수 있게 한다.** 현재 공통 화면 `packages/operator-core-ui/src/modules/service-legal/ServiceLegalSettingsPage.tsx` 의 `openNewDoc()` 는 slug 없이 폼을 열고 입력란도 없다. `admin-service-legal.controller.ts` 는 slug 를 자동으로 만들지 않고, 표식 slug 는 **새 문서 등록 때만** 지정할 수 있다(`ENROLLMENT_POLICY_MARKER_IMMUTABLE`). 그대로 게시하면 표식 없는 문서가 되어 계정 재동의 · 서비스 신청 정책 선택에 포함되지 않고, 나중에 slug 를 붙일 수도 없다. 별도 PR 로 화면을 고쳐 배포한 뒤에 아래 게시를 한다
- [ ] [LOCAL] **중지 조건:** 위 선행 작업이 배포되지 않았거나, 새 문서 폼에서 아래 표의 slug 를 입력할 수 없으면 게시하지 않고 보고한다
- [ ] [LOCAL] 통합 담당 승인을 받는다. 승인 범위: 아래 표의 문서 게시만
- [ ] [LOCAL] 관리자 화면에서 게시. 화면 위치(코드 기준 · 실제 메뉴는 확인):
  - `neture`: `neture.co.kr/admin/settings/legal-terms`
  - `supplier` · `funding` · `community`: 각 호스트의 `/operator/legal/<serviceKey>` (`services/web-neture/src/App.tsx`)
  - `lecture`: `admin.neture.co.kr/operations/lecture/legal` (§6-3 6). `kpa-society` 는 게시하지 않는다

  | service_key | document_type | slug | version | 시행일 | 제목 |
  |---|---|---|---|---|---|
  | neture | terms | `neture-account-terms` | 2 (privacy 게시 후 · §6-3) | 2026-11-13 | Neture 계정 이용약관 |
  | neture | privacy | `neture-account-privacy` (§6-3) | 2 | 2026-11-13 | Neture 계정 개인정보 처리방침 |
  | supplier · community · funding · lecture | terms | `<service_key>-service-terms` | 2 (§6-3) | 2026-11-13 | <서비스명> 서비스 이용약관 |
  | 같음 | privacy | `<service_key>-service-privacy` | 2 (§6-3) | 2026-11-13 | <서비스명> 서비스 개인정보 안내 |

  - 변경 사유(`change_reason`): `2026-10-12 공고 개정안 시행 (공고: /policies/account-update)`
- [ ] [LOCAL] 게시 중 오류 · 화면이 예상과 다르면 남은 게시를 멈추고 게시한 것 / 남은 것을 보고

### 5-4. 게시 후 확인

- [ ] [LOCAL] Q1 재실행 — 새 행 `published` · `content_md5` = §5-2 md5 · v1 행 보존
- [ ] [LOCAL] 브라우저(PC · 모바일): `neture.co.kr/terms` · `/privacy`, `supplier.neture.co.kr/terms` · `/privacy`, `community.` · `funding.` · `study.` 호스트 — v2 가 보이고 KPA Society · K-Cosmetics · PharmacyHub 나열이 없는지
- [ ] [LOCAL] Demo 버튼(매장 경영자 · 공급자 — `docs/TEST-ACCOUNTS.md`)으로는 **정상 진입만** 확인한다. Demo 계정은 재동의 강제 대상이 아니라서(`policy-acceptance.service.ts` `getEnforcedPendingForUser` 의 Demo 예외 — 로그인 응답 · `/auth/me` 도 이 결과를 쓴다) 재동의 화면이 뜨지 않는 것이 정상이다
- [ ] [LOCAL] 일반 회원의 재동의(화면이 뜨고, 동의 후 정상 진입)는 Demo 가 아닌 경로로 확인한다 — 격리 환경의 일반 사용자 통합 테스트, 또는 통합 담당이 승인한 비-Demo 테스트 계정. 확인 경로가 없으면 「미확인」으로 기록하고 Demo 결과로 대신하지 않는다
- [ ] [LOCAL] 회원가입 화면의 약관 보기가 v2 를 보여 주는지
- [ ] [LOCAL] 결과를 §6 에 기록 · 이 문서 상태를 `COMPLETED` 로 바꾸고 push

## 6. 실행 기록

(LOCAL 세션이 채운다 — 원문 본문 · 개인정보 · 계정값은 적지 않는다)

| 단계 | 일시 | 결과 |
|---|---|---|
| 5-1 Q1 | 2026-11-08 | 아래 6-1. 판정: `neture` **B(초안 미등록)** · `kpa-society` **B** · `supplier` · `community` · `funding` · `lecture` **B — 문서 0건(첫 게시)** |
| 5-1 Q2 | 2026-11-08 | 아래 6-1. v1 동의 기록 합계 14건(neture terms 6 · privacy 3, kpa-society terms 2, k-cosmetics terms 3) |
| 5-2 본문 md5 | 2026-11-08 | 아래 6-2. 본문 12개 생성(`origin/main` 1084f51486) · 공고 화면과 대조 3/3 일치 · 퇴역 서비스명 0건 |
| 5-3 게시(통합 담당 승인) | | 미실행 — 2026-11-13 이후 사용자 수작업. **6-3 입력값으로 게시 · kpa-society 게시 안 함(삭제한 서비스)** |
| 5-4 확인 | | |

### 6-1. 운영 DB 조회 결과 (`o4o_readonly` · read-only 트랜잭션 · 2026-11-08)

Q1 — 대상 8개 serviceKey 중 행이 있는 것은 3개뿐(6행). `supplier` · `community` · `funding` · `lecture` · `pharmacy-hub` 는 0행.

| service_key | document_type | version | status | slug | effective | published | length | content_md5 |
|---|---|---|---|---|---|---|---|---|
| neture | privacy | 1 | published | `privacy` | 2026-09-17 | 2026-09-17 | 8803 | `e2bad96f4ddc91daf7e6652e9a0b44d7` |
| neture | terms | 1 | published | `terms` | 2026-09-17 | 2026-09-18 | 10320 | `81592168d0f613f23f194145fd65f0a8` |
| kpa-society | privacy | 1 | published | `privacy` | 2026-09-17 | 2026-09-17 | 8803 | (neture privacy 와 같음) |
| kpa-society | terms | 1 | published | `terms` | 2026-09-17 | 2026-09-18 | 10320 | (neture terms 와 같음) |
| k-cosmetics | privacy | 1 | published | `privacy` | 2026-09-17 | 2026-09-17 | 8803 | (neture privacy 와 같음) |
| k-cosmetics | terms | 1 | published | `terms` | 2026-09-17 | 2026-09-18 | 10320 | (neture terms 와 같음) |

Q2 — 동의 건수: neture terms v1 6 · neture privacy v1 3 · kpa-society terms v1 2 · k-cosmetics terms v1 3. 그 밖의 조합은 0.

### 6-2. 게시 본문 md5 (UTF-8 · LF · 앞뒤 공백 없음)

생성 규칙: 공고 페이지 `body()` 와 같은 변환(`> ` 줄 · `# ` 줄 제거, `**굵게**` · `[링크](url)` 를 글자만 남김, trim).
서비스별 문서 = 변환된 서비스 안내 본문에서 「## 공통 적용 원칙」 절 + 빈 줄 1개 + 「## <서비스> 서비스 이용약관 / 개인정보 안내」 절(각 절 trim).
공고 화면 대조: `neture.co.kr/policies/account-update` 의 세 본문 `innerText` 와 변환 본문을 공백 · 표 기호(`|` · 구분선) · 제목 표지(`##`)를 뺀 글자로 비교 — 3/3 일치(2744 · 4471 · 3424자).

| 문서 | service_key / type | 글자 수 | md5 |
|---|---|---|---|
| 계정 이용약관 | neture / terms | 3651 | `3f90b3d7363e89f98bcb12d8f78dede5` |
| 계정 개인정보 처리방침 | neture / privacy | 6005 | `9ae4fd667774ad612ac1240a884bd010` |
| 공급자 | supplier / terms | 1475 | `e5df9a4facc2bc6cd326dfedc8831b18` |
| 공급자 | supplier / privacy | 1239 | `b98cb6c6f0933dd7263a85d8fafab6e9` |
| 약국·약사회 | kpa-society / terms | 1433 | `310e27acb94dd4d879f726b14b594bf1` (게시 안 함) |
| 약국·약사회 | kpa-society / privacy | 1406 | `22fe4cb9e2bead9a14786808d2279505` (게시 안 함) |
| 커뮤니티 | community / terms | 1357 | `43c6e357b237b88763ac0a0398b9434a` |
| 커뮤니티 | community / privacy | 1264 | `a2c182667e1c880919e42f69d0f67f06` |
| 펀딩 | funding / terms | 1311 | `1506fa657347a866dd516e9e9162553b` |
| 펀딩 | funding / privacy | 1242 | `a5c5168a323d05c9f509d6bb3869c473` |
| 강의 | lecture / terms | 1343 | `2a5698f2845dc09e763d49f853d3b9dc` |
| 강의 | lecture / privacy | 1296 | `9052323942b069eaf7f5237fcb1c74cb` |

- 본문 파일은 커밋하지 않았다. 게시 당일 같은 규칙으로 다시 만들어 md5 가 위 표와 같은지 확인한 뒤 붙여 넣는다.
- 관리자 API 는 `content` 를 trim 하지 않고 그대로 저장한다(`admin-service-legal.controller.ts` POST). 붙여 넣을 때 끝 줄바꿈이 더해지면 md5 가 달라지므로 게시 전 상세 화면 · Q1 로 확인한다.

### 6-3. §5-3 입력값 정정 — 코드의 게시 검사 기준 (2026-11-08 확인)

§5-3 표를 그대로 따르면 아래 두 곳에서 게시가 거부되거나 잘못된 문서가 적용된다. 게시 때는 이 절을 따른다.

1. **Neture 개인정보 처리방침 slug 는 `neture-account-privacy` 여야 한다.** §5-3 표의 "기존 v1 slug 확인 후 동일 규칙"을 따르면 v1 slug `privacy` 가 되는데,
   그러면 계정 약관 게시가 `COMMON_ACCOUNT_POLICY_PAIR_REQUIRED` 로 거부된다. 계정 약관 slug 는 `neture-account-terms`(`COMMON_ACCOUNT_TERMS_SLUG`) 그대로.
2. **게시 순서: Neture 는 개인정보 처리방침(v2) 먼저, 그다음 이용약관(v2).** 약관 게시 때 같은 version 의 `neture-account-privacy` 가 이미 published 여야 한다. 둘 다 version 2 · 시행일 필수.
3. **서비스별 문서 version 은 모두 2 로 한다.** slug `<service_key>-service-<type>` 문서는 version ≥2 · 시행일이 있어야 게시된다(`ENROLLMENT_POLICY_NOT_READY`).
   `supplier` · `community` · `funding` · `lecture` 는 기존 문서가 없어 "기존 최대 +1" 이 1 이 되므로 거부된다. `kpa-society` 는 +1 = 2 로 같다.
4. **서비스별 terms · privacy 는 같은 version 으로 연달아 게시한다.** 한쪽만 published 인 동안 그 서비스의 신청 화면은 `POLICY_UNAVAILABLE`(503) 이 된다(`getEnrollmentPolicies`).
5. 관리자 API 의 serviceKey 허용 목록(`SUPPORTED_LEGAL_SERVICE_KEYS`)에 다섯 서비스가 모두 있다.
6. **게시 화면(코드 기준 · 2026-11-08):**
   - 공통: `admin.neture.co.kr/operations/<serviceKey>/legal`(`apps/admin-dashboard` · `CentralSharedWork.tsx`) — neture · supplier · funding · community · lecture.
   - 서비스별: neture `neture.co.kr/admin/settings/legal-terms` · supplier `neture.co.kr/operator/legal/supplier` · funding `neture.co.kr/operator/legal/funding` · community `community.neture.co.kr/operator/legal/community`.
   - lecture: `services/web-lecture` 에는 화면이 없고 위 공통 화면만 있다.
   - **kpa-society: 게시하지 않는다.** 삭제한 서비스다(2026-11-08 사용자 확인 · 상위 [`WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1`](WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1.md) D1). 편집 화면도 없다.
     관리자 약관 API 가 아직 이 키를 받는 것은 정리 누락이며, [`WO-O4O-KPA-SOCIETY-POLICY-API-RESIDUE-REMOVAL-V1`](WO-O4O-KPA-SOCIETY-POLICY-API-RESIDUE-REMOVAL-V1.md)(별도 branch · PR)이 제거한다.
     서비스별 안내 원본의 「약국·약사회」 절은 공고된 본문이라 이 지시서에서 고치지 않는다.
   - 공통 폼(`packages/operator-core-ui/.../ServiceLegalSettingsPage.tsx`)과 API 는 본문을 trim 하지 않는다.
7. 게시는 사용자가 수작업으로 한다(2026-11-08 사용자 지시). 수작업용 본문 12개와 체크리스트는 로컬 PC 에만 두었다(커밋하지 않음).

## 7. 검증 계획

- 게시 정합: 새 published 행의 `content_md5` 가 공고 본문 md5 와 같다 · v1 행이 남아 있다.
- 화면: 모든 Neture 계열 호스트의 `/terms` · `/privacy` 가 v2.
- 재동의: 기존 회원이 재동의 후 정상 이용 · 신규 가입은 v2 동의로 기록.

## 문서 정합

해당 없음(작성 시점). 실행 중 발견하면 `문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건` 형식으로 §6 아래에 적는다.
