# WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 — 가입 · 로그인 · 공급자 정보 입력 UX 정리

> **상태**: ACTIVE
> **작성일**: 2026-11-08 · **최종 갱신**: 2026-11-08
> **실행 위치**: CLOUD (브라우저 smoke 만 LOCAL)
> **인계**: `claude/relaxed-newton-7y8pln` · PR #987 · 다음 실행자 통합 담당(병합 · 배포) → 배포 후 Demo 검증(T7) → LOCAL(T9 운영 backfill · 승인 필요)
> **근거**: 2026-11-07~08 사용자 확정(대화) · [`WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1`](WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1.md) D1 · [`TODO-O4O-UNIFIED-MEMBER-REGISTRATION-V1`](TODO-O4O-UNIFIED-MEMBER-REGISTRATION-V1.md) · [`WO-O4O-NETURE-SUPPLIER-ONBOARDING-BUSINESS-PROFILE-SYNC-AND-SIMPLIFICATION-V1`](WO-O4O-NETURE-SUPPLIER-ONBOARDING-BUSINESS-PROFILE-SYNC-AND-SIMPLIFICATION-V1.md)

## 1. 배경 (현재 코드 대조)

사용자가 실제 화면에서 겪은 문제 4건을 조사했다.

### 1-1. 카카오 가입 "동의하고 계정 만들기"가 깜빡이고 넘어가지 않음

- 서버는 오류를 돌려주지만, 화면은 오류 문구를 폼 맨 아래(취소 버튼 밑)에 그린다. 스크롤되는 로그인 모달에서는 보이지 않는다.
  - 근거: `packages/auth-react/src/KakaoContinue.tsx` 의 `{message && <p role="alert">}` 위치
- 오류 원인 후보:
  - 이미 있는 이메일: `409 EMAIL_IN_USE` (`kakao-auth.service.ts:57-58`)
  - 5분 가입 티켓 만료: `401 SOCIAL_FLOW_INVALID` (`social-flow.service.ts:32`)
- 만료된 경우 화면이 만료된 티켓을 계속 들고 있어서, 다시 눌러도 계속 실패한다.
- 같은 이메일로 다른 방법을 써서 가입하는 것은 서버가 이미 막는다(`users.email` UNIQUE, `EMAIL_IN_USE`). 고칠 것은 차단 로직이 아니라 안내 화면이다.

### 1-2. 가입 시 이름 · 휴대전화 필수

- Google · 카카오 · 이메일 가입 세 경로 모두 이름과 휴대전화를 화면과 서버에서 필수로 받는다. 본인 인증은 하지 않는다.
  - 화면: `GoogleContinue.tsx:218-220`, `KakaoContinue.tsx`
  - 서버: `google-auth.service.ts:299-300`, `kakao-auth.service.ts:47-48`, `email-auth.service.ts:185-200`
  - DTO: `google-auth.dto.ts:44,48`, `email-auth.dto.ts:52,57`, `social-auth.dto.ts`
- 가입 직후 거치는 **가입 유형 입력**(`member-registration.service.ts:89-117`)이 이름 · 닉네임 · 휴대전화를 다시 필수로 받는다. 즉 지금은 같은 값을 두 번 필수로 받는다.
- 결정 문서 D1(`WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1`)은 "`name / phone` 은 가입 필수정보가 아니다 · phone 은 실제 목적이 생길 때만 수집"으로 정했다.
- `users.name` · `users.phone` 은 이미 nullable 이다. DB 변경은 필요 없다.

### 1-3. Demo 로그인(매장 경영자)이 느림

순차 단계가 많은 구조적 지연이다. 일부러 넣은 지연은 없다.

- 경로: 로그인 → 홈 데이터 GET 5건(`resolveSingleStoreWorkspaceUrl` → `fetchHomeEntryData`) → handoff 발급 → [페이지 로드] → exchange → [페이지 로드] → `/auth/me` → 매장 목록 → 매장 서비스 → 홈 4건
- 접근 가능 매장 계산이 4번 일어난다.
- 모달 뒤의 `O4OHomePage` 가 같은 GET 5건을 한 번 더 보낸다.
- `handoff-exchange.controller.ts` 의 `getRoleNames` 와 `readUserMemberships` 가 순차로 실행된다. 병렬로 실행할 수 있다.
- API · 웹 모두 `--min-instances=0` 이다(콜드 스타트).
- bcryptjs cost 12 다.

### 1-4. 공급자 사업자 정보 화면(`/mypage/business-profile`) 항목 과다 · 중복

- 입력칸이 약 40개이고, 공개 범위 4개 · PDF 3개 · 품목군이 더 있다.
- 저장 버튼 3개의 범위가 서로 섞여 있다.
  - 하단 [저장] 하나가 5개 섹션을 한꺼번에 저장한다.
  - [정산 정보 저장]과 [통신판매업 정보 저장]이 같은 핸들러로 8개 필드를 모두 보낸다(`useSupplierOnboarding.ts:319-328`). 그래서 통신판매업 상태가 "신고 완료"인데 신고번호가 비어 있으면 정산 저장까지 실패한다.
- 세금계산서 이메일은 화면에 "(선택)"으로 표기되지만, 서버 정산 필수 검사(`supplier-business.service.ts:569-580`)에는 들어 있다.
- 가입 유형 입력에서 받은 16개 항목을 이 화면에서 다시 받는다.
- 데이터가 세 곳(`users.businessInfo` · `organizations` · `neture_suppliers`)에 나뉘어 있다.
- `contactPhone` 은 `neture_suppliers.contact_phone` 과 `organizations.phone` 두 곳에 쓴다.
- 상단 배너 조건은 대표자명 · 담당자명 · 담당자 전화번호 미입력이다(`getMissingProfileFields`).

## 2. 사용자 확정 (2026-11-07~08)

| # | 결정 |
|---|---|
| U1 | Neture 로그인 모달의 "O4O 메인으로" 버튼을 제거한다 |
| U2 | 같은 이메일로 다른 수단을 써서 가입하는 것은 막는다. 이미 서버가 막고 있으므로 안내를 보이게 한다 |
| U3 | 가입 시 이름 · 휴대전화는 **선택 항목**으로 바꾼다(Google · 카카오 · 이메일 공통). 칸은 남긴다 |
| U4 | 닉네임은 소셜 프로필로 미리 채우지 않는다(서비스별로 다른 닉네임을 쓸 수 있어야 함) |
| U5 | API `min-instances=1` 은 이번 범위에서 제외한다(승인 대기) |
| U6 | 공급자 정보 중복 저장은 **DB 변경 없이 코드만** 정리한다 |
| U7 | TODO 를 만들고 한 세션에서 끝까지 진행한다. 지정 branch 제약으로 PR 하나에 항목별 커밋으로 올린다 |
| U8 | (2026-11-08) 공급자 정보 정본 일원화(DB 정리)도 이번에 진행한다 — U6 을 확장한다 |
| U9 | (2026-11-08) 사용자 화면 브라우저 검증은 **배포 후 로그인 화면의 테스트 로그인(Demo) 버튼**으로 한다. 이 절차를 기준 문서에 기록한다 |

## 3. 설계 판단

| 결정 | 근거 |
|---|---|
| 오류 문구는 제출 버튼 바로 위(`role="alert"`)에 두고, 오류가 나면 그 위치로 스크롤한다 | 모달이 스크롤되어 하단 문구가 보이지 않는 것이 직접 원인이다 |
| `SOCIAL_FLOW_INVALID` · 만료면 가입 폼을 닫고 "카카오로 다시 시작"을 보여 준다 | 만료된 티켓은 재시도해도 계속 실패한다 |
| `EMAIL_IN_USE` 면 "기존 계정으로 로그인한 뒤 계정 설정에서 카카오 연결" 안내를 보여 준다 | 서버 차단(U2)은 그대로 두고 다음 행동만 알려 준다. 연결 API 는 이미 있다(`/auth/social/link/*`) |
| 가입 화면의 이름 · 휴대전화는 "(선택)"으로 바꾼다. 서버는 값이 있을 때만 형식을 검사한다 | U3. 가입 유형 입력이 이후 필수로 받으므로 값이 영영 비는 일은 없다 |
| 아이디 찾기(이름+휴대전화 대조, `email-auth.recovery.ts`)는 그대로 둔다 | 가입 유형 입력을 마친 계정은 값이 있다. 값이 없는 계정은 이메일로 로그인 ID 를 안다 |
| 가입 티켓 TTL 5분은 이번에 바꾸지 않는다 | 만료 안내로 다시 시작할 수 있게 하는 것으로 충분하다. TTL 은 보안 판단이 필요하다 |
| Demo 매장 이동: 매장 하나를 고를 때 홈 데이터 전체(GET 5건) 대신 필요한 조회만 한다 | 결과는 같고 요청 수만 줄어든다 |
| `handoff-exchange` 의 역할 · 멤버십 조회를 병렬로 바꾼다 | 서로 의존하지 않는 읽기 조회다. 응답 계약은 그대로다 |
| 공급자 화면: 탭(섹션) 4개 · 탭별 저장 · 정산과 통신판매업 저장 분리 · 필수 표기를 서버 기준에 맞춤 · 미입력 필수 체크리스트 | 사용자 정리안. 서버 API 계약은 바꾸지 않는다 |
| 공급자 코드 정리: 같은 값을 읽고 쓰는 경로를 한 곳으로 모은다(테이블 · 컬럼 불변) | U6 |

## 4. 범위 밖

- API · 웹 `min-instances` 변경(U5, 승인 대기)
- 가입 유형 입력(`member-registration`) 의 필수 항목 변경
- bcrypt 라이브러리 · cost 변경(보안 판단 필요)
- 다른 서비스 로그인 모달의 "O4O 메인으로" 버튼

## 5. TODO

- [x] T0 [CLOUD] Neture 로그인 모달 "O4O 메인으로" 제거 — `services/web-neture/src/components/LoginModal.tsx` (U1)
- [x] T1 [CLOUD] 소셜 가입 오류 안내 — `KakaoContinue.tsx` · `GoogleContinue.tsx`
  - [x] 오류 문구를 제출 버튼 위로 옮기고, 오류가 나면 그 위치로 스크롤
  - [x] 만료 · 무효 티켓(`SOCIAL_FLOW_INVALID`)이면 폼을 닫고 다시 시작
  - [x] `EMAIL_IN_USE` · `SOCIAL_IDENTITY_CONFLICT` 면 기존 계정 로그인 후 연결 안내
  - [x] 테스트 보강
- [x] T2 [CLOUD] 가입 이름 · 휴대전화 선택화(U3)
  - [x] 화면: Google · 카카오 · 이메일 가입 폼 라벨을 "(선택)"으로 바꾸고 필수 검사 제거
  - [x] 서버: Google · 카카오 · 이메일 signup 서비스와 DTO 를 "값이 있으면 형식만 검사"로 변경
  - [x] 가입 유형 입력의 필수(이름 · 닉네임 · 휴대전화)는 유지됨을 확인
  - [x] 테스트 보강
- [x] T3 [CLOUD] Demo 로그인 경로 단축
  - [x] Demo 매장 이동에서 불필요한 홈 데이터 조회 제거
  - [x] 모달 뒤 홈 화면의 중복 조회 억제(가능한 범위)
  - [x] `handoff-exchange` 역할 · 멤버십 조회 병렬화
  - [x] 테스트
- [x] T4 [CLOUD] 공급자 사업자 정보 화면 1단계
  - [x] 섹션을 4개 묶음(사업자 정보 · 담당자와 공개 연락처 · 정산 · 판매 조건)으로 재구성
  - [x] 묶음별 저장
  - [x] 정산 저장과 통신판매업 저장의 전송 필드 분리
  - [x] 세금계산서 이메일 필수 표기를 서버 기준에 맞춤
  - [x] 상단에 서버 기준 미입력 필수 항목 체크리스트
  - [x] 정산 담당자 "담당자와 같음", 예금주 기본값(상호)
  - [x] 테스트
- [x] T5 [CLOUD] 공급자 정보 코드 정리(DB 불변, U6)
  - [x] 같은 값을 쓰는 중복 경로 확인
  - [x] 읽기 · 쓰기 helper 한 곳으로 모으기
  - [x] 테스트
- [x] T6 [CLOUD] 문서 정합 — 조사 중 발견한 기준 문서 drift 보고 · 허용 범위 인라인 처리
  - [x] 배포 후 Demo 검증 절차 기록(U9) — `AGENTS.md` §6 · `SETUP.md` 「배포 후 Demo 검증」 · `CLAUDE.md` §15
- [ ] T7 [배포 후 · Demo] 브라우저 검증 (U9 — 배포 후 로그인 화면 Demo 버튼, PC · mobile)
  - [ ] 매장 경영자 Demo: 로그인 → 매장 화면 도착까지 체감 시간 (T3)
  - [ ] 공급자 Demo: `/mypage/business-profile` 4묶음 저장 · 체크리스트 · 정산/통신판매업 분리 저장 (T4) — 바꾼 값은 원래대로 되돌린다
  - [ ] 매장 직원 Demo: 로그인 → 매장 화면 (T3 회귀)
  - [ ] [본인 실제 계정 · Demo 불가] 카카오 · Google 가입 오류 안내(T1), 이름 · 휴대전화 없이 가입 → 가입 유형 입력 필수 확인(T2)
- [ ] T8 [승인 대기] API `min-instances=1` (U5)
- [ ] T9 [CLOUD 구현 · 운영 반영은 통합 담당 승인] 공급자 정보 정본 일원화 (U8)
  - [x] 설계: 9월 정본 결정(`WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1` §0 정책 4 · 5 · 6)을 따른다. 남아 있던 §L(대표자 · 업태 · 종목의 Organization 이관)을 실행한다.
    - 정본 = `organizations.metadata.businessProfile` 의 `representativeName` · `businessType` · `businessCategory`(약국 분기와 같은 키). jsonb 값 쓰기라 컬럼 · 엔티티 변경 0 — `O4O-CORE-FREEZE-V1` §3.2 해당 없음.
    - 이번에 옮기지 않는 것: 담당자 이메일(정책 5 는 NetureSupplier 지만 컬럼이 없어 추가 결정 필요) · 통신판매업(정책 4 는 Organization 이지만 T4 화면 분리 직후라 다음 단계). 공개 전화와 사업장 전화는 다른 개념이라 합치지 않는다.
  - [x] 코드(expand): 읽기는 정본 우선 · 없으면 옛 컬럼(`supplierIdentityOf`), 쓰기는 정본 + 옛 컬럼 양쪽 — profile GET/PATCH · 미입력 판정 · 운영자 공급자 목록/검색 · 가입 승인/수정(`member-registration.service.ts` supplier 분기) · 계정 삭제 시 정본의 대표자명도 제거 · Demo 생성(새 조직 INSERT 에만)
    - 함께 고친 버그: 공급자 승인 때 대표자 · 업태를 org metadata 에 쓰지 않아 운영자 회원 상세에서 빈칸으로 보였다.
  - [x] backfill: migration 이 아니라 CLI(`apps/api-server/src/scripts/supplier-business-identity-backfill.ts`). 데이터만 바꾸는 migration 은 schema fingerprint 가 같아 migration contract C22(중복 fingerprint 금지)가 거부하고, CLAUDE.md §8-1 도 backfill 은 CLI 우선이다. 그래서 migration lane(#968) 과도 겹치지 않는다.
  - [x] 테스트: 단위(정본 우선 · fallback · 양쪽 쓰기 · 조직 없는 공급자 · 목록) + 일회용 로컬 PostgreSQL 16 에서 backfill SQL 7건(trim · 정본 보존 · 빈 정본 채움 · 비객체/다중 공급자/빈 값 제외 · 재실행 0건)
  - [ ] [LOCAL · 통합 담당 승인 필요] 운영 backfill — 아래 절차. 9월 WO 정책 12 · 14 의 운영 공급자 3건도 대상에 들어간다(값 복사만 하고 소유자 연결은 건드리지 않음 — 승인 때 함께 확인).
    1. dry-run(조회만, `o4o_readonly` 로 가능): `npx tsx src/scripts/supplier-business-identity-backfill.ts` → `TARGET_ORGANIZATIONS` · `SKIPPED` 건수 기록(원문 출력 없음)
    2. 판정: `SKIPPED` 의 multi-supplier orgs · non-object businessProfile 이 0 이 아니면 그 조직은 수동 확인 대상으로 보고만 한다(이번 backfill 은 건너뜀).
    3. [write · 통합 담당 명시 승인 후] `SUPPLIER_IDENTITY_BACKFILL_CONFIRM=YES npx tsx src/scripts/supplier-business-identity-backfill.ts --apply` → `UPDATED_ORGANIZATIONS` 가 1 의 `TARGET_ORGANIZATIONS` 와 같고 `RESIDUE = 0` 인지 확인. 다시 dry-run 해서 대상 0.
    - 순서: 이 PR 의 코드가 배포된 뒤에 실행한다. 배포 전·후 어느 쪽이든 화면 값은 같다(fallback).
  - [ ] [별도 WO] contract: `neture_suppliers.representative_name · business_type · business_item` 쓰기 중단 → 컬럼 삭제(DDL · 승인 필요). backfill 완료 확인 후.

## 6. 검증 계획

- auth: `packages/auth-react` · `packages/auth-client` vitest, `apps/api-server` auth 단위 테스트, 타입 검사
- web-neture: `npx vitest run --config services/web-neture/vitest.config.mjs`, `tsc --noEmit`
- store 웹(handoff 수신): 해당 서비스 vitest
- `/verify` 스킬로 변경 범위 검증
- 브라우저 확인은 T7 — 배포 후 로그인 화면 Demo 버튼(U9)

## 7. 문서 정합

- 발견: `AGENTS.md` §6 「과거 seed/Demo 계정으로 대체하지 않는다」가 U9(배포 후 Demo 검증)와 충돌 → 사용자 지시로 문장 수정(`AGENTS.md` §6 · `SETUP.md` · `CLAUDE.md` §15).
- 발견(보고만): 6월 `WO-O4O-NETURE-SUPPLIER-ONBOARDING-BUSINESS-PROFILE-SYNC-AND-SIMPLIFICATION-V1` D1(「`neture_suppliers` 를 정본으로」)은 9월 정책 4 · 5 로 대체됐지만 표기가 없다. 기록물(work-orders)이라 인라인 대상이 아니다.
- 발견(보고만): `PRODUCTION-MIGRATION-STANDARD` 는 데이터만 바꾸는 작업의 경로(CLI)를 적고 있지 않다 — C22 가 data-only migration 을 거부한다는 사실이 문서에 없다. 별도 문서 작업 제안.
