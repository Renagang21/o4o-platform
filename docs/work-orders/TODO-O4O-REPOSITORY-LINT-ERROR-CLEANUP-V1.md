# TODO-O4O-REPOSITORY-LINT-ERROR-CLEANUP-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-22 · **최종 갱신**: 2026-10-22 (KST)
> **근거**: 사용자가 인증 보완 후 확인한 전체 lint 기존46오류의 해결을 지시
> **종료 범위**: 문서·코드 조사 → 최소 수정 → 검증 → commit·branch push 후 통합 담당 인계

## 범위와 기준

최신 main `7dc02646dab2808258133139b3ca0714ec3cc14b`에서 전용 branch
`wo/repository-lint-error-cleanup-v1`·worktree를 만들었다. 기준 checkout과 기존 인증 보완 branch는 수정하지 않는다.
이 작업은 별도 main 통합·배포·운영 DB/계정 변경을 포함하지 않는다.

[정본 색인](../CANONICAL-INDEX.md), [인증·가입](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md),
[역할·업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 확인한다.
소비자 commerce·B2B 및 Core/Frozen 경계는 기존 계약을 유지한다. 권한·역할·route·DB schema·의존성·lockfile·
CI·lint 규칙/기준은 변경하지 않는다. 유지 대상 security 판정과 script 결과를 바꾸지 않는 표기·타입 정비가 목표다.
운영용 데이터 보정/콘텐츠 제작 script를 테스트 목적으로 실행하지 않는다.

## TODO

- [x] 기준 checkout·다른 세션 보존, 최신 main 전용 작업공간 준비.
- [x] L01: frozen 설치 후 전체 lint JSON으로 현행 오류·경고를 재산출하고 기존46오류와 대조.
- [x] L02: import·정규식 escape·조건식·타입 선언의 원인과 관련 테스트/문서·소비처 확인.
- [x] L03: 제어문자 검출·제거 범위와 BOM/구분 문자 의미를 보존해 수정.
- [x] L04: 실제 동작·권한 경계를 유지하는 최소 수정. 새로운 오류가 나오면 원인·범위를 재분류.
- [x] V01: 변경 테스트·관련 기존 회귀, 제어문자/정규식의 변경 전후 동치 검증.
- [x] V02: 전체 lint errors0, API 타입·배포 빌드와 해당 frontend 타입·회귀 검증.
- [x] D01: 최초 실패·수정·최종 결과·남는 경고·미실행 범위 기록.
- [ ] G01: 자기 변경 경로만 commit·명시 branch push, SHA·검증·미해결 사항 인계.

## 초기 오류 분류

앞선 SHA의 전체 lint에서32파일46오류를 확인했다. 최신 main에서 재검증한 결과를 구현 기준으로 삼는다.

| rule | 기존 오류 수 | 수정 시 보존할 의미 |
| --- | ---: | --- |
| no-require-imports | 9 | Jest mock·동적 import 평가 시점·테스트 assertion |
| no-useless-escape | 6 | 실제 검사하는 literal/정규식 |
| no-control-regex | 14 | 제어문자 검출·제거 및 비ASCII 판정 범위 |
| no-namespace | 2 | Express Request 타입 확장의 실제 소비처 |
| no-constant-binary-expression | 1 | 기존 shop 번호 기본값·변환 순서 |
| ban-ts-comment | 1 | 수료증과 수강 원장 연결·공개 DTO 경계 |
| no-unused-expressions | 6 | 분기·Map·집계 script 결과 |
| no-irregular-whitespace | 7 | 의도적인 BOM·제어문자 표기 |

## 검증·인계

Node 22.18.0·pnpm 10.25.0의 frozen install을 수행했다. 최신 기준에서는32파일46오류·947경고를 재현했다.
앞선 인증 작업의982경고와 달라진 이유는 이후 main의 약국 화면 정리이며, 오류8유형/46개는 동일했다.
기존 경고 전수 정리나 lint 규칙 완화는 하지 않았다.

## 조사 후 확정한 수정

| 영역 | 수정과 보존한 경계 |
| --- | --- |
| 테스트 import9건 | 이미 로드한 모듈은 ESM import 재사용. `jest.resetModules/doMock` 뒤 router 로드만 `await import`로 유지하고 호출부5곳도 await. 실제 외부 AI 호출 없음 |
| escape6건 | 정본 import 확인은 동일 literal의 includes로 명시. block scanner 제외 패턴은 String.raw와 실제 exclude 배열로 검사. 주석 사례와 실제 코드의 의미 구분 |
| 제어문자14건 | 인증 경로 C0/DEL/backslash 거절, 식별자 C0/DEL 제거, QR 이름 C0 공백화 범위 보존. 비ASCII는 동치 UTF-16 범위로 표시. 제작 script의 TAB/LF/CR 보존과 C0/C1 제거 범위 유지 |
| Express 타입2건 | global namespace 중첩 대신 express-serve-static-core module augmentation. 실제 Request field 이름·optional/null 및 런타임 middleware 유지 |
| Cafe24 조건식1건 | Number 결과에는 적용되지 않는 마지막 nullish fallback만 제거. 기존 opts/token/default 우선순위·NaN 동작 유지 |
| 수료증 타입1건 | `@ts-ignore` 제거. 내부 certificate 연결 patch는 UpdateEnrollmentRequest와 실제 Enrollment.certificateId의 intersection으로 확인. 공개 update DTO·인가/소유권/저장 payload 확장 없음 |
| script 분기6건 | 동일 Map/배열 집계와 단락 평가를 if/else로 명시. script entrypoint·운영 DB 쓰기는 실행하지 않음 |
| 불가시 문자7건 | CSV의 UTF-8 BOM은 escape로 명시하고 같은 bytes 유지. 실제 SOH/backspace 구분은 같은 문자 의미를 보존하며 word-boundary로 바꾸지 않음 |

권한·route·서비스 가입/소유권·콘텐츠 정본·commerce 계약은 변경하지 않았다.
`normalizeRequestPath`의 Core 판정은 사용자 지시의 lint 보완 범위에서 동치 표현으로만 변경했고,
제어문자별 보안 회귀와 아래 비교로 확인했다. 32파일 외의 runtime source나 lint 설정은 수정하지 않았다.

## 실제 검증 결과

| 검증 | 결과·범위 |
| --- | --- |
| 수정 전 전체 ESLint | JSON 원장으로46 errors·947 warnings 재현 |
| 전체 lint | `pnpm run lint` 최종 PASS: 0 errors·946 warnings. 불필요해진 기존 disable 주석 제거로 warning1 감소. eslint 설정/기준/ratchet 수정0 |
| 변경32파일 ESLint | 0 errors·기존 warnings3. ignore/규칙 비활성화 추가0 |
| API 회귀 | 최종18 suites, 265 PASS·기존 media-library 전용 PG fixture10 SKIP. 미실행 조건은 PASS로 합산하지 않음 |
| 순수 함수 동치 비교 | 시작 SHA의 원본과 수정본에서 TypeScript AST로 pure function만 추출. UTF-16 BMP 전 범위·percent encoding·빈값/한글/결합문자/emoji/서로게이트/CSV quoting 등917,904입력·15함수 결과 동일. script의 main/import/DB/network 실행0 |
| API | type-check·배포용 build:api ESM bundle PASS |
| frontend | 전체 `type-check:frontend` PASS, Neture 실제 type-check·production build PASS |
| 문서·정적 경계 | 민감정보 패턴0·상대 링크 누락0·diff check PASS. unsafe route1294파일 위반0, TypeORM 신규 미등록/중복/stale0 |

초기 선별 API 실행은216 PASS·1 FAIL·10 SKIP였다. 정확한 escape 표기로 고친 block scanner 테스트가
주석의 예시까지 매칭한 false positive였다. 실제 exclude 배열의 존재와 금지 패턴을 검사하도록 보완한 뒤
해당 suite12/12 및 전체 최종265조건을 확인했다. 테스트 삭제·제외·규칙 완화로 통과시키지 않았다.

API dependencies와 Neture dependencies는 저장소의 기존 위상 순서 명령으로 빌드했다.
검증을 위한 추가 package/dependency·lockfile·workflow 변경과 실제 운영 DB/OAuth/메일 호출은 없다.
관계/소유권·role/tenant·인증 gate는 기존 회귀와 API 타입 검사로 확인하고,
CSV 변화는 화면 변경이 아닌 BOM literal 표기 변경으로서 문자열 결과 동치를 확인했다.

실행 명령(저장소 root):

```bash
pnpm install --frozen-lockfile
pnpm exec eslint . -f json
pnpm run lint
pnpm run build:api-deps
pnpm --filter @o4o/api-server run type-check
pnpm --filter @o4o/api-server run build:api
pnpm --filter @o4o/web-neture run build
pnpm run type-check:frontend
```

로그·동치 probe는 checkout 밖 임시 파일이다. 원본은 위 immutable base SHA에서 읽고 변경 코드는
이 전용 작업공간에서 읽었다. production DB/외부 AI/인증 호출을 검증 자료로 사용하지 않았다.

## 통합 담당 인계 기준

소스32파일과 본 TODO만 변경한다. 앞선 인증 보완의
[`wo/auth-token-membership-hardening-v1`](https://github.com/Renagang21/o4o-platform/tree/wo/auth-token-membership-hardening-v1)은
별도 branch이며 병합하거나 수정하지 않았다. 인증 보완 TODO의 당시46오류 실패 기록은 역사로 보존하며
이번 branch를 통합한 뒤 해소 여부를 현재 main의 CI로 판정한다.

남은946경고는 오류46개 해결과 별개다. 실제 media PG fixture·운영 DB·OAuth·브라우저 smoke는 실행하지 않았다.
이번 UI 변경은 없고 CSV bytes 동치를 검증했다. PR 생성·CI/Codex review 운영·병합·배포는 통합 담당 범위다.

DEPLOYMENT: REQUIRED_AFTER_MERGE — runtime source 정비가 포함되며 통합 담당이 현재 Delivery 정책으로 판정한다.
문서 정합: 이전 인증 TODO의 당시 lint 실패 기록은 보존하며 이번 독립 후속에서 해소 근거를 남긴다.
WORKTREE_DISPOSITION: KEEP — 검증·push 및 통합 담당 후속 검토 전용이다.
