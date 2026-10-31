# CarePharm 회원자료·약국 운영 지원 흐름

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

> **상태**: COMPLETED
> **작성일**: 2026-10-21
> **근거**: 사용자 지시 — TODO 작성 → 코드·문서 대조로 보완 → 개발·검증 → commit·push까지만

## 최초 TODO

- [x] 최신 `origin/main`에서 전용 worktree·branch 생성: base `c9d9760aba`, `wo/carepharm-member-resource-workflow`.
- [x] 독립 협업체 원칙, 최신 인증·사업 권한·회원자료·커뮤니티 코드를 대조한다.
- [x] 기존 기능과 외부 사이트 조사 결과를 바탕으로 실제 구현 범위·의존 작업을 구분한다.
- [x] 운영자의 주제별 자료 묶음·실무자료 작성과 회원의 탐색·내 매장 활용을 연결한다.
- [x] CarePharm 회원 게시판의 운영 사례·자료 요청·제품 문의 작성을 보완한다.
- [x] 선택 약국·계정·사업 전환, 미승인·정지·게시 중단, 늦은 응답을 포함해 검증한다.
- [x] 관련 build·type·lint와 desktop/mobile 화면을 확인한다.
- [x] 문서에 검증·미해결을 기록하고 commit·push 인계를 준비한다. 실제 push 결과·정확한 HEAD·원격 일치는 최종 보고에서 확인한다.

완료 범위는 아래 회원자료·글쓰기 개발 및 로컬 검증이다. 아래에 분리한 공통 인증·약관·B2B 잔여의 완료나 main 통합·운영 배포를 뜻하지 않는다.

## 작업 경계

CarePharm은 독립 협업체다. 다른 사업의 가입·승인·운영자 권한으로 CarePharm 자격을 대신하지 않는다. 기존 사업별 서버 gate와 매장 소유 독립 사본을 유지한다. 무료혈당기·CGM은 별도 기획, 교육은 실제 개설된 Study 강좌 안내, 환자 기록·상담·추적관리는 이번 범위 밖이다.

운영 사업 등록·조건/약관 게시·가입 승인·권한 부여·운영 데이터 write·migration·외부 메일·PR 생성·병합·배포는 실행하지 않는다. 다른 작업공간의 독립화 작업을 완료한 것으로 추정하지 않으며, 발견한 공통 인증·약관 의존은 별도로 기록한다.

## 코드·문서 대조 후 보완

### 조사 결과와 개발 범위

- `semi_franchise_contents.tags`는 이미 저장·복사되지만 회원 목록의 태그 필터는 없다. 제목·요약 검색은 내 매장에만 있다. 기존 원장에 정확한 태그 필터를 추가하고 CarePharm 자료실과 내 매장에서 같은 검색 조건을 사용한다. 새 분류·자료 묶음 테이블은 만들지 않는다.
- 자료 묶음은 하나의 회원자료에 목적·포함 자료·활용 순서·갱신 안내를 작성하는 방식이다. CarePharm 운영자에게 신규 초안용 작성 양식과 권장 태그를 제공하고 실제 저장·게시·공급자 심사는 기존 절차를 따른다.
- 회원 게시판은 이미 개설·글쓰기·댓글을 제공한다. CarePharm 신규 글쓰기에 운영 사례·자료 요청·제품/공급 문의 가이드와 명시적인 게시판 선택을 제공한다. 게시판 자동 개설·새 문의 원장·공지/글의 자동 자료화는 추가하지 않는다.
- `CooperationMemberSpace`, 운영자 콘텐츠 편집기, Store 자료 가져오기, Neture 포럼 작성기의 import·route·source assertion 소비처를 조사했다. CarePharm 전용 안내는 사업 키/호스트의 기존 게이트 안에서만 제공하고 pharmacy·drugstore·pharmcoop·일반 Neture·community·funding의 기존 경로를 회귀 검증한다.
- 인증·약관 독립화 잔여: base의 catalog는 CarePharm을 `neture.sessionDomains`에 연결하고, `AuthContext`는 neture로 복구하며, 사업 신청 약관은 pharmacy 전용 분기다. 독립화 WO의 공통 세션 해석을 이 작업에서 정본으로 승격하지 않는다. 플랫폼 전체의 인증·약관 저장 계약 변경은 이 자료 기능의 완료에 포함하지 않으며 통합 담당에게 미해결로 인계한다.
- 공통 B2B의 대상 약국 가입 확인·미결제 주문 자격 재검증도 별도 잔여다. 이번 자료 기능에 주문/결제 코드를 섞지 않는다.

근거: [역할·업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §3·§6, [독립화 WO](WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1.md), [자료함·독립 사본](../design/DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1.md), [공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md).

### 외부 사이트 조사 반영

2026-10-21 공개 페이지와 해당 페이지의 공개 소개 데이터를 확인했다. 회원 포털 내부 기능이나 실제 운영 효과는 검증하지 않았다.

- [휴베이스 공개 사이트](https://www.hubasekorea.com/): 주제별 콘텐츠와 회원 포털 연결. [약국체인 소개](https://www.hubasekorea.com/know/chain)의 약국별 경영 지원 소개도 확인했다. CarePharm에는 회원자료의 주제별 탐색과 운영 실무 작성 양식으로 적용한다.
- [Numark 회원 혜택](https://numarknet.com/member-benefits): 경영지원 자료·도구·템플릿, 검토된 공급업체 혜택 소개를 확인했다. 자료 작성 양식·안내물 활용에 참고하며, 이미 있는 공급 승인 기능을 새로 만들지 않는다.

환자 관리·임상 서비스·POS·재고 시스템을 도입하는 근거로 사용하지 않는다. 위 사이트의 콘텐츠를 복제·게시하지 않는다.

## 구현 결과

1. CarePharm 신규 자료 초안에 자료 묶음·약국 운영 실무·안내물 작성 양식, 권장 태그를 제공했다. 제목·요약은 보존하고 작성 중 본문을 바꿀 때는 확인한다. 다른 사업과 기존 자료 수정에는 새 초안 양식을 노출하지 않는다. 저장·심사·게시 상태 전이는 기존 API 그대로다.
2. 기존 자료 목록 API에 선택적 `tag` query를 추가했다. 바인딩된 정확한 JSONB 태그 비교를 기존 사업·가입·게시 조건과 함께 적용하고 목록과 전체 수가 같은 조건을 사용한다. 태그 미지정 호출은 기존 동작이다.
3. 협업체 자료실에서 제목/요약·태그 검색, 초기화, 페이지 이동과 선택 약국 query를 보존한다. 내 매장도 같은 조건을 URL에 보존하며 검색·사업 전환 시 페이지와 이전 선택 자료를 초기화한다. 다른 사업 응답은 표시하지 않고 늦은 조회·복사 응답을 폐기한다.
4. 내 매장 CarePharm 업무에 자료 종류별 바로가기를 연결했다. 회원자료를 매장 독립 사본으로 가져오는 기존 경로·편집·POP/블로그 활용은 유지한다. 원본 변경을 이미 가져온 사본에 전파하지 않는다.
5. CarePharm 회원 글쓰기에 운영 사례·자료 요청·제품/공급 문의 작성 가이드를 제공했다. 본문을 덮어쓰거나 자동 게시하지 않는다. 유효한 게시판 링크가 없으면 첫 게시판으로 임의 등록하지 않고 직접 선택하도록 했다. 기존 글 수정·일반 community·공급자 자료 게시·funding 흐름은 보존한다.

### 공통 소비처 영향

| 소비처 | 적용·회귀 확인 |
|---|---|
| Neture 대표·CarePharm·supplier·community·funding | CarePharm에서만 작성 가이드·명시적 게시판 선택, Neture 전체 테스트와 production build |
| Store | 기존 자료 조회 API에 선택 태그 추가, 조직·사업 전환/복사/다른 서비스 회귀와 전체 테스트·production build |
| pharmacy·drugstore | 공통 운영자 편집기를 소비하지만 CarePharm 양식은 숨김, 같은 앱 production build |
| pharmcoop | 기존 운영자 편집·독립 사업 키 유지, production build |
| API | 기존 조직·가입·담당 운영자 gate 불변, 실제 PG 자료 SQL·기존 handoff 회귀·type-check |

## 실제 검증 (2026-10-21)

- Node `22.18.0` / pnpm `10.25.0`, `pnpm install --frozen-lockfile`, `pnpm run build:packages` 성공. 의존성·lockfile 변경 없음.
- Neture Vitest 전체 **137 파일 / 1,224 PASS**: CarePharm 검색/태그·약국 헤더 보존·늦은 응답, 게시판 명시 선택/잘못된 링크·가이드 전환 중 초안 보존, 일반 community·공급자·funding 및 기존 인증 경로 회귀 포함.
- Store Vitest 전체 **61 파일 / 742 PASS**: 태그 요청·페이지 초기화·선택 자료 제거·다른 사업 응답 거절·늦은 조회와 복사 응답, 약국 전환·기존 자료함/주문 경로 회귀 포함. 기존 합성 자료 fixture에 실제 DTO의 사업 키가 누락된 1곳도 보완했다.
- 운영자 pharmacy-management **7 파일 / 54 PASS**: 신규 CarePharm 양식·제목/요약 보존·태그 중복 방지·본문 교체 취소·다른 사업 미노출과 기존 저장/사업 전환 포함. shared-space-ui 전체 **13 파일 / 142 PASS**.
- 격리 localhost PostgreSQL 15의 `business-store-access.integration.spec.ts`와 `carepharm-handoff.integration.spec.ts` **2 suite / 33 PASS**. 실제 가입·조직 SQL과 태그/검색 조합·정확한 비교·페이지별 목록/전체 수·미게시/타 사업 제외·정지 후 상세/복사 거절, 기존 issuer → client → exchange 계약을 실행했다. 인증 토큰 생성과 성공 사본 저장기는 기존 fixture이며 운영 로그인·전체 HTTP 주문/자료 저장 E2E로 표현하지 않는다.
- PG 테스트 schema 잔존 **0** 확인 후 이번 작업의 컨테이너와 임시 자격 파일을 제거했다. 운영 DB·업무 데이터 write·실계정 권한 변경 없음.
- Neture·Store·pharmacy/drugstore·pharmcoop production build 성공, API `tsc --noEmit` 성공. 변경 TS/TSX ESLint **오류 0**, 기존 route handler의 사용하지 않는 `_next` 경고 1건은 유지했다. `git diff --check`, docs 민감정보 검사 성공. 기존 번들 크기/Browserslist·Store Vitest Tailwind 안내는 남아 있다.
- 실제 production 번들을 설치된 Chromium에서 **1440px·390px**, 회원 자료 검색/빈 결과/초기화·내 매장 태그/사본·운영자 신규 양식·회원 글 작성 가이드/게시판 선택·미승인 차단 **5종 × 2 = 10 PASS**. 화면 스크린샷 확인, pageerror·가로 넘침 0. API와 로그인은 전부 합성 응답이며 모든 요청을 가로채 실제 운영 API에 전송하지 않았다. 현재 PC의 브라우저 다운로드는 네트워크 정책으로 거절돼 기존 `/usr/bin/chromium`을 사용했다. 운영 HTTPS·실제 승인 회원의 사업 운영 검증은 하지 않았다.
- 로그·화면은 task별 `/tmp/carepharm-resources-*`에 두며 저장소에 추가하지 않는다.

## 통합 인계와 남은 TODO

- branch: `wo/carepharm-member-resource-workflow`, base: `c9d9760abaebe2bbfce53cbe20a1623ad1733860`.
- push 준비 중 main은 `5c6150a6b0`으로 2 commit 진행했다. 차이는 다른 작업의 운영 완료 문서 2개뿐이며 이번 검증 대상 소스와 차이가 없다. 개발 종료 범위에서 자동 merge/rebase하지 않고 기준 위치를 인계한다.
- 변경은 선택적 태그 조회와 CarePharm의 자료 작성·탐색·회원 글쓰기 보완이다. DB schema·migration·권한·인증 계약은 변경하지 않았다.
- [ ] 플랫폼 공통 인증·약관 독립화: 위 조사에서 확인한 세션/약관 의존과 독립화 WO의 해석을 정렬하고 각 사업 인증·로그아웃·동의·운영자 경계를 별도로 검증한다.
- [ ] 공통 B2B: 대상 약국의 해당 사업 active 가입 확인, 제안 종료·가입 정지 후 미결제 주문 자격을 보완·재현 검증한다.
- [ ] CarePharm 운영 개통: 실제 가입 조건·약관·운영자·게시판·초기 자료 구성과 승인 회원의 사본 편집·제작 활용 검증. 이번 개발에서 운영 설정이나 승인을 대신 실행하지 않았다.
- PR 생성·PR CI·리뷰·main 병합·배포는 사용자 지정 종료점 밖이라 수행하지 않았다. 위 별도 항목을 해결한 것으로 보고하지 않는다.

`WORKTREE_DISPOSITION`: `/workspace/o4o-wt/carepharm-member-resource-workflow`, branch 위와 같음, 개발/로컬 검증 완료, 타 에이전트 위임 없음, main 통합·배포 미실행, **KEEP**(push 후 통합 인계·후속 수정 필요). 정확한 HEAD·원격 일치·미커밋/미추적 0은 최종 인계에서 확인한다.

문서 정합: 기존 독립화 WO의 공통 세션 해석·pharmacy 전용 약관 서술과 현재 사용자 독립 원칙의 대조 필요를 잔여로 기록했다. 과거 기록 재작성·정본 색인 변경·SUPERSEDED 표기 없음.

## 2026-10-21 main 통합·배포 단계

- 사용자 **“main으로 병합 → 배포”** 지시에 따라 이 공간이 통합을 진행한다. 위의 PR 미생성·미병합·미배포·KEEP는 개발 인계 시점의 기록이다.
- 최신 main `5c6150a6b0`을 기존 branch의 merge commit `23175823f0`으로 반영했다. 충돌 없음. main에서 추가된 것은 다른 작업의 완료 문서 2개이며 개발 검증 이후 runtime 소스는 동일하다.
- 통합 후 focused 재검증: Neture 회원자료·게시판·community **11 파일 / 96 PASS**, Store CarePharm·자료·사업 전환 **3 파일 / 55 PASS**, 운영자 pharmacy-management **7 파일 / 54 PASS**, API `tsc --noEmit` 성공. 개발 단계 전체 테스트·실제 PostgreSQL·build·화면 결과는 위의 실제 실행 기록을 따른다.
- 실제 main ruleset의 PR 필수·required `CI Gate`·필수 human approval 0을 확인했다. 기존 PR이 없으므로 하나의 PR을 생성하고 해당 HEAD의 CI·Sonar·CodeQL·Codex 리뷰와 미해결 사항을 확인한 뒤 병합한다. bypass·직접 main push는 사용하지 않는다.
- 배포는 현재 Delivery/Promote의 판정·API 선행·verified rollout·serving SHA 검증을 따른다. 새 migration은 없으며 운영 사업 등록·약관 게시·회원 승인·권한 부여·업무 데이터 write는 하지 않는다.
- 최종 PR·HEAD·병합 SHA·CI/배포 run·운영 확인과 정리 결과는 해당 PR의 최종 인계와 사용자 보고에 남긴다. 아직 확인하지 않은 단계를 성공으로 기록하지 않는다.
