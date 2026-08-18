# WO-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1

- **대상**: Agent D
- **성격**: Profile 트랙 최종 production browser 검증 + FINAL CLOSE
- **선행 구현**: [`WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1`](WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1.md)
- **선행 구현 commit**: `408fe8e0c`
- **선행 CHECK commit**: `c86d6fd0d`
- **선행 CHECK**: [`docs/checks/CHECK-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1.md`](../checks/CHECK-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1.md)

## 1. 목표

Profile Core 공통화, PharmacyHub `/account`, canonical self-profile write 계약은 완료됐다.

현재 Profile 트랙의 유일한 closure blocker는:

```text
K-Cosmetics /mypage/profile production browser 검증
Neture      /mypage/profile production browser 검증
```

두 서비스 모두 production API 수준의 `PATCH /api/v1/users/me/profile` 저장·persist·원복은 PASS 상태다.

이번 WO에서는 **실제 화면 렌더링과 저장 연결만 최종 확인한 뒤 Profile Track을 FINAL CLOSED로 종료한다.**

새 기능 개발이나 추가 공통화는 하지 않는다.

---

## 2. 시작

최신 `origin/main` 기준으로 시작한다.

```bash
git fetch origin
git status -sb
git diff --cached --name-only
git pull --ff-only origin main
git rev-parse HEAD
git rev-parse origin/main
```

필수:

```text
HEAD == origin/main
다른 세션 staged/dirty 파일 미접촉
```

공유 main의 index 오염이 실제 발생한 이력이 있으므로 `git diff --cached --name-only`를 반드시 확인한다.

선행 commit이 현재 main의 ancestor인지 확인:

```bash
git merge-base --is-ancestor 408fe8e0c origin/main
git merge-base --is-ancestor c86d6fd0d origin/main
```

---

## 3. 선행 상태 재확인

다음은 이미 완료 상태이므로 재구현하지 않는다.

```text
Profile Core 공통화
PharmacyHub /account 및 내 프로필 진입
PATCH /api/v1/users/me/profile
ACCOUNT_CORE allowlist
GP/KCos/Neture/PH frontend adapter 전환
보안 regression
production API smoke
KPA/GP/PH browser smoke
```

현재 canonical self-profile allowlist:

```text
name
firstName
lastName
nickname
phone
```

---

## 4. K-Cosmetics browser 검증

실제 production 로그인 세션에서:

```text
로그인
→ /mypage/profile
→ 화면 정상 렌더
→ 기존 profile 값 표시
→ 편집 진입
→ ACCOUNT_CORE 최소 1필드 수정
→ 저장 성공
→ 새로고침
→ 수정값 유지
→ 원래 값 원복
→ 재조회하여 원복 확인
```

확인:

```text
AccountProfileSection 정상 렌더
이름/닉네임/연락처 표시
BusinessProfileSection 회귀 없음
저장 버튼 정상
성공/오류 feedback 정상
404/403/5xx 없음
console exception 없음
무한 refetch 없음
중복 save 없음
```

production write는 `docs/local/TEST-ACCOUNTS.local.md`의 테스트 계정에 한정한다.

---

## 5. Neture browser 검증

동일하게:

```text
로그인
→ /mypage/profile
→ 정상 렌더
→ 기존 profile 표시
→ ACCOUNT_CORE 최소 1필드 수정
→ 저장
→ 새로고침
→ persist 확인
→ 원복
→ 원복 재조회
```

추가 확인:

```text
AccountProfileSection 정상
AccountSecuritySettings 정상
MyBusinessProfilePage 진입 회귀 없음
SupplierProfilePage 진입 회귀 없음
404/403/5xx 없음
console exception 없음
```

---

## 6. 자격증명

TEST-ACCOUNTS 비밀번호를 다음에 남기지 않는다.

```text
코드
스크립트
shell history에 직접 입력되는 명령
CHECK
Git
로그
환경변수 출력
```

기존 로그인 세션 또는 안전한 interactive login 방식을 우선한다.

**자격증명 자동화가 불가능하다는 이유로 API smoke만 재인용하고 PASS 선언하지 않는다.**

실제 browser 확인이 불가능하면 `OPEN`으로 보고한다.

---

## 7. Production test write

허용:

```text
테스트 계정 본인
ACCOUNT_CORE allowlist
최소 1필드
검증 직후 원복
```

절차:

```text
변경 전 값 기록
→ 수정
→ 저장
→ 새로고침 persist
→ 원복
→ 재조회
```

금지:

```text
실사용자
role/status
membership
service_credentials
businessInfo
organizations
직역/면허
타 사용자
```

원복 실패는 MUST_FIX다.

---

## 8. 결함 발견 시

실제 UI/runtime 결함이면 중간 승인 없이:

```text
원인 추적
→ Profile 범위 내 최소 수정
→ 관련 test/typecheck/build
→ commit/push
→ 기존 production 배포 workflow
→ 같은 화면 재검증
```

까지 수행한다.

금지:

```text
DB schema/migration
Identity 재설계
membership 구조 변경
대량 production data 수정
새 기능 추가
KPA UX 재설계
```

---

## 9. 회귀 검증

코드 수정이 발생하면 최소:

```text
@o4o/account-ui build
K-Cosmetics typecheck/build
Neture typecheck/build
```

공통 component를 변경하면 GP/PH 포함 전체 소비처도 회귀 확인한다.

backend 변경은 이번 WO에서 원칙적으로 불필요하다.

---

## 10. FINAL CLOSE 기준

다음 전부 만족해야 한다.

```text
KCos browser PASS
Neture browser PASS

화면 렌더 PASS
기존 값 조회 PASS
편집 PASS
저장 PASS
새로고침 persist PASS
원복 PASS

예상 외 401/403/404/5xx = 0
console exception = 0
Profile Core runtime 오류 = 0
cross-service contamination = 0
```

충족 시:

```text
PROFILE TRACK = FINAL CLOSED
```

로 판정한다.

---

## 11. closure blocker가 아닌 잔존 항목

이번 WO에서 수정하지 않는다.

```text
R1 dead UserController.getProfile/updateProfile
R2 PH legacy route 소비처 0
R4 email 변경 계약 부재
R5 label axis 불일치
```

각각 cleanup / 신규 기능 / 정합화 후속 후보로 남긴다.

**이 네 항목 때문에 Profile FINAL CLOSE를 보류하지 않는다.**

---

## 12. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1.md
```

포함:

```text
1. 기준 commit / deployed revision
2. K-Cosmetics browser 결과
3. Neture browser 결과
4. 수정 → 저장 → persist → 원복
5. console/network 결과
6. 코드 수정 여부
7. typecheck/build
8. production write/원복
9. 잔존 followup
10. PROFILE TRACK 최종 판정
11. CHECK/commit/push
```

기존 Profile CHECK도 필요하면 상태를:

```text
CLOSED_WITH_FOLLOWUPS
→ FINAL CLOSED
```

로 정합화한다.

---

## 13. Git

```text
git add . 금지
path-specific stage
다른 세션 index/WIP 미접촉
```

완료 후:

```text
HEAD == origin/main
이번 WO 범위 dirty 0
```

이어야 한다.

---

## 14. 최종 보고

```text
1. 기준 commit / production revision
2. KCos browser 결과
3. Neture browser 결과
4. save/persist/rollback
5. console/network
6. 코드 수정 여부
7. test/build
8. production write/원복
9. 잔존 followup
10. PROFILE TRACK FINAL CLOSED 여부
11. CHECK/commit/push
12. 최종 작업트리 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

---

## 15. 후속

본 WO가 `FINAL CLOSED`로 종료되면 Profile 공통화 트랙은 종료한다.

그 다음 별도 작업으로:

```text
MY PAGE 공통화
→ 기능 단위 census
→ Core + Extension 판정
→ 실제 공통화
→ 5서비스 adoption
→ production 검증
```

을 시작한다.

**이번 WO에서는 My Page 공통화에 착수하지 않는다.**
