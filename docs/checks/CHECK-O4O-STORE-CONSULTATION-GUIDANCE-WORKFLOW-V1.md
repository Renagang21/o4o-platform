# 한국어·다국어 상담 업무 검증

> **상태**: ACTIVE
> **개발 결과**: 개발·로컬 검증·main 통합·비로그인 운영 점검 완료. 실제 계정·현장 검증은 별도다.
> **작성일**: 2026-10-24 · **최종 갱신**: 2026-10-24 (한국시간)
> **사용자 지시**: TODO → 문서·코드 대조/보완 → 연결된 업무 개발 → 검증·commit·push. PR·main 병합·배포 제외.
> **기준**: main `3431c010f4` · branch `wo/store-consultation-guidance-workflow`
> **선행 의존**: `a0e8a252fc`의 독립 상담·고객·진열 실행을 새 전용 worktree에서 병합(`46b6d6ae09`). 기존 작업 트리는 보존했다.
> **운영 상태**: 2026-10-24 API·admin·Store 반영 완료(`97f2262170`). 실계정·현장·유료 provider 검증은 구분한다.

## 조사와 보완

[TODO](../work-orders/TODO-O4O-STORE-CONSULTATION-GUIDANCE-WORKFLOW-V1.md), [설계 §15-8·15-8-1](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md), [선행 CHECK](CHECK-O4O-STORE-CONSULTATION-TABLET-WORKSPACE-V1.md), 최신 정본 색인의 역할·매장 접근·소비자 commerce 경계·AI Core/Extension·모델 제어·개인정보 metadata 보존 계약을 대조했다.

main에는 기존 번역과 `pharmacy.consultation` 모델 선택이 있었지만 선행 독립 실행은 미병합 상태였다. 빠른 업무 버튼도 같은 상품 검색을 열었고 한국어는 단순 전달, 설명은 원문 새 창으로 끝났다. 따라서 선행 기반을 의존성으로 결합하고 위치 조회·게시 자료 설명·약사 안내·고객 전달을 한 상담 흐름으로 연결했다. 최신 main의 번역 모델 선택은 보존했다.

공통 개인 AI 이력에 비공개 매장 문장을 연결하는 작업은 포함하지 않았다. 기존 현재 상담 행의 준비/공유 JSON만 사용한다. 새 schema·Core·provider·의존성·lockfile·workflow 변경은 없다. 선행 상담 migration은 branch에 포함되지만 이번 단계에서 추가 migration을 만들지 않았다.

## 구현

| 업무 | 결과 |
|---|---|
| 시작·문맥 | 독립 상담 화면에서 상품 찾기·위치 안내·제품 설명·약사에게 안내. 질문/선택을 유지하고 부족한 업무 또는 상품 하나를 확인 |
| 상품·자료 | 현재 매장의 활성 상품, 공개 키가 있는 비보관 그룹의 게시 페이지만 사용. 요청 언어 → 영어 → 기본 언어 → 한국어 fallback을 기존 공개 resolver와 같은 순수 함수로 재사용 |
| 기본 결과 | 위치·고정 안내는 비용 없는 즉시 조회. 제품 설명은 첫 게시 문단. 이미지/특수 형식 등 발췌할 텍스트가 없으면 실제 게시 원문 링크 제공 |
| 선택적 AI | `pharmacy.consultation.guidance` 읽기 Extension, 기존 Core와 `PRODUCT_CONTENT` 정책·모델·플랫폼 부담·quota 사용. 최대 24개 게시 문단에서 ID를 최대 3개 선택하고 서버가 원문 문단으로 표시. 새 의학적 답변 생성 없음 |
| 번역 | 한국어 원문·허용 길이일 때 기존 상담 번역기로 명시 요청. AI로 고른 문단은 버전과 문단 ID를 검증해 그대로 번역하며 AI를 재호출하지 않음. 지원하지 않는 언어 쌍을 숨은 다중 호출로 우회하지 않음 |
| 직원 확인 | 준비 결과를 자동 공유하지 않음. 두 기기는 서버 발급 ID, 한 태블릿은 고객 dialog 표시 직전 비용 없는 자료/권한 재조회. source·fallback·번역·원문 링크의 언어 보존 |
| 고객 언어 | 별도 고객 화면의 제목·응대·음성/입력·출처·대체 안내를 7개 언어로 표시. 한 태블릿의 고객 자료 dialog도 언어별 출처/읽기/원문 문구 사용 |
| 언어 수정 | 같은 상담 세대/연결 기기/미확인 답변 유지, 이전 공유/준비 결과 폐기. 직원 입력·상품 선택과 고객의 미전송 입력/입력 언어 보존. 답변 전송 후 다음 입력은 현재 상담 언어로 복귀 |
| 실패·동시성 | 조회 실패와 정상 빈 자료 구분. 실패해도 입력·선택 유지, 재시도. 세대·언어·응답 검증과 lock으로 이전 결과/중복 실행 배제. 상담 연결 갱신 중 새 안내 요청 방지 |
| 자격·원문 변경 | 준비/AI 호출 전후·공유·고객 조회에서 현재 매장 자격/기능·활성 상품·게시 자료 버전 재검사. 공개 해제된 공유 문단은 다음 고객 조회에서 숨김. 비동기 재검증 뒤에도 상담 세대/기기/언어/공유 SQL 비교 |

자료 검증값은 JSON 객체 키 순서와 무관하게 계산한다. 실제 PostgreSQL JSONB 저장이 키 순서를 바꾸어 약사 고정 안내의 공유를 거절하던 결함을 회귀 검사와 함께 수정했다. 준비 중인 새 결과와 이미 공유한 결과의 검증값도 따로 유지해, 미확인 초안을 만들었다고 이전 확인 자료가 바뀌지 않게 했다.

약사 안내는 실제 호출·배정 완료를 뜻하지 않는다. 기존 역할·매장 관계·기능·약사 확인과 `floor-staff` 자유 outgoing 제한을 유지한다. 음성 입력은 기존 hook을 재사용하며 의료 판단을 자동화하지 않는다. 질문·원문·응답은 브라우저 저장소·개인 AI 이력·Task/Memory·로그에 저장하지 않는다. 기존 사용량 기록은 metadata만 사용한다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| 설치·선행 build | frozen lockfile·store integrity·offline 설치 PASS. Store/API/admin 의존 패키지 build PASS |
| Store 전체 | 68 files / 808 tests PASS |
| 마지막 변경 후 집중 회귀 | 상담 페이지·음성·안내·고객·기기 hook 5 files / 43 tests PASS |
| API | 약국 모듈 24 suites / 162 tests PASS, 기존 환경 의존 14 suites / 187 tests SKIP. 공개 origin 소비처 1 suite / 15 tests PASS |
| 타입/build | API build, Store `tsc -b`·Vite build, admin `tsc --noEmit`·Vite build PASS. 기존 chunk 크기 안내만 발생 |
| 집중 lint | 변경 TS/TSX 0 errors. 기존 `_next` 및 controller의 기존 미사용 type 3개 warning 유지, 신규 warning 0 |
| migration 계약 | 21 PASS / 0 FAIL. 추가 schema 없음. 선행 fingerprint 6869 lines 불변 |
| PostgreSQL 15 | canonical baseline·38개 전체 prefix, empty down/up, populated down 거절 및 상담 SQL 18검사 PASS |
| 실제 화면 브라우저 | 실제 컴포넌트/API adapter + 실제 router/SQL, 합성 인증/provider, 서로 다른 직원/고객 browser context. 업무 9묶음 PASS |
| 화면·공개 경계 | desktop 1440×1000, tablet 1280×800, mobile 390×844. 가로 overflow·page error 0. 고객 API에 직원 Authorization·cookie·조직 header 0. 합성 screenshot 직접 확인 |
| 문서·범위 | 민감정보 패턴 0건·diff whitespace PASS. 신규 링크 대상 확인·정확한 staged 범위 검사 |

브라우저 검사는 연결·확인 후 전달·AI 문단 선택·선택 문단 번역·언어 수정/미전송 답변·게시 해제/이전 공유 거절·503 후 재시도·위치/약사 안내·명시 종료·매장 한 태블릿 dialog를 포함한다. 재검사에서 상담 시작 직후 연결 갱신과 안내 준비가 겹치는 경우를 발견해 연결 갱신 중 업무 입력을 잠그고 다시 검증했다.

SQL/브라우저 검증은 고정 loopback의 세션 전용 PostgreSQL 컨테이너와 marker로 소유권을 확인한 신규 DB만 사용한다. 기존 DB가 있으면 실행을 거절한다. 종료 후 fixture DB count 0을 재확인하고 세션 소유 컨테이너를 삭제했다. 운영 credential·DB·실제 고객 자료는 사용하지 않는다. 번역/AI 선택 결과는 합성 provider이므로 언어 품질의 검증이 아니다. 로그·browser harness·screenshot은 저장소 밖 세션 디렉터리에 둔다.

## 미실행·통합 인계

실계정, 실제 마이크/태블릿·현장 소음, 언어별 약사 검수, 실제 AI provider/과금, 운영 권한 회수, 물리 QR·사이니지 재생은 미실행이다. 공유 중 게시 변경은 다음 조회 시 숨기지만, 한 태블릿 dialog는 표시 직전 재검증이며 실시간 기기 강제 종료를 보장하지 않는다. 매장별 영구 AI 이력·직원 해제 및 집단 학습 계약은 후속 과제다.

`DEPLOYMENT = MANUAL/GATED`. 선행 `CreateStoreConsultationStations1792815861315`가 필요하다. 통합 담당자가 실제 main/운영 상태를 다시 확인하고, 운영 DB 적용 명시 승인 및 정상 migration job 뒤 API·admin·Store를 통합·배포해야 한다. 이 공간에서는 PR·main 병합·배포·운영 migration을 수행하지 않는다. PR 미생성으로 PR CI 미실행이다.

push 전 재확인한 main `0c0575aa35`의 추가 변경은 협력사업 operator 영역이며 이번 수정 경로와 중첩이 없다. 자동 merge/rebase 없이 개발 branch를 인계한다. 선행 branch의 기능도 이번 branch에 포함되므로 통합 시 선행 작업과 중복 처리하지 않는다. 작업 트리는 병합 전 후속 수정용 `KEEP`이다.

문서 정합: 설계 §15-8·15-8-1의 상담 언어/업무·게시 자료 보조 계약 정렬 1건 / 이번 TODO·CHECK 작성 / 과거 CHECK 재작성·canonical index 변경·SUPERSEDED 추가 없음.

## main 통합 검증·리뷰 보완 (2026-10-24)

사용자의 후속 ‘push된 파일 main 병합 → 배포’ 지시에 따라 이 공간에서 통합을 진행한다. PR [#798](https://github.com/Renagang21/o4o-platform/pull/798)은 선행 독립 실행과 이번 상담 업무를 함께 포함한다. 최신 main `0c0575aa35`를 `51fe7eb9c2`로 충돌 없이 결합한 뒤 Store 808건, API 177건, Store/admin build를 다시 통과했다.

통합 자체 점검과 Codex 리뷰에서 같은 담당자가 두 탭을 열어 고객 언어 변경과 공유를 동시에 진행하면 예전 언어의 안내가 다시 저장될 수 있음을 확인했다(P2 1건). 현재 상담의 모든 공통 UPDATE에 준비 당시 언어 비교를 추가했다. epoch·담당자·매장뿐 아니라 언어가 바뀐 오래된 공유/준비 결과도 거절한다. 기존 테이블·권한·API 계약은 추가 변경하지 않았다.

격리 PostgreSQL의 검증 대기 barrier로 경쟁 상태를 재현했다. 수정 전에는 기대한 거절이 없어 실패했고, 수정 후에는 `CONSULTATION_CHANGED`로 거절·고객 공유 공란을 확인했다. 기존 18검사와 추가 동시성 1검사, 전체 prefix/empty down-up·populated down 거절 총 19검사 PASS. API build·해당 소스 lint PASS, fixture DB count 0 재확인. 운영 DB는 건드리지 않았다. PR CI·재리뷰·배포 결과는 통합 종료 기록에서 확정한다.

재리뷰의 P2 2건도 같은 PR에서 보완했다. heartbeat로 확인한 고객 언어를 직원 화면에 동기화하되 현재 입력/상품 선택은 보존하고 이전 결과만 비운다. 상담 인계/종료의 `CONSULTATION_CHANGED`는 일시적 네트워크 실패와 구분해 로컬 room·pairing과 이전 초안을 해제한다. 화면 새로고침 없이 명시적으로 다시 열 수 있다. 언어 반영은 직접 선택과 서버 동기화가 같은 함수를 사용한다.

보완 후 Store 전체 68 files / 811 tests PASS. 추가 회귀는 언어 동기화/다음 요청 언어·초안 보존, 만료 후 초안 삭제/재시작, 일시적 실패에서는 연결 유지다. 실제 컴포넌트 + SQL/router 브라우저는 직원 두 탭과 별도 고객 context로 10묶음 PASS(다른 탭 언어 변경, 종료와 강제 인계 후 복구 포함). 실제 운영 계정은 사용하지 않았다.

추가 리뷰의 P2 2건을 보완했다. 콘텐츠를 쓰지 않는 heartbeat는 담당자/매장/epoch를 원자 비교하면서 동시 언어 수정의 현재 행을 반환한다. 실제 세대 만료와 단순 언어 경쟁을 구분해 초안을 잘못 지우지 않는다. SQL barrier 회귀에서 수정 전 409 실패 → 수정 후 같은 epoch·최신 언어·기기 연결 유지, 전체 SQL 20검사 PASS를 확인했다. 공유 콘텐츠 UPDATE의 언어 비교는 유지한다.

고객 안내가 교체·철회되면 이전 읽어주기만 중지한다. 같은 자료의 heartbeat·미전송 고객 입력·음성 입력은 유지한다. 같은 epoch에서 자료 교체/철회 각각을 검사한 고객 화면 10건, 최종 상담 집중 5 files / 48 tests PASS. API/Store build 및 수정 소스 lint 오류/신규 경고 0, fixture DB count 0 확인. 실제 음성 장치의 재생 품질은 여전히 미실행이다.

선택 SonarCloud 검사는 기준 main에서도 실패 상태이며 필수 ruleset은 `CI Gate`다. 이번 변경의 HTML 태그 제거 정규식에 대한 과도한 backtracking 지적은 API의 기존 직접 의존성 `node-html-parser`를 재사용해 수정했다(추가 의존성/lockfile 변경 없음). script/style 제외·문단/엔티티 처리·긴 비정상 태그 회귀를 포함한 API 25 suites / 179 tests PASS, 기존 187 tests SKIP. API build와 해당 소스 lint도 통과했다.

자료 digest의 키 정렬은 locale과 무관한 UTF-16 순서가 의도된 계약이다. `localeCompare` 사용 권고를 적용하면 서버 locale/ICU에 따라 정렬이 달라질 수 있으므로 변경하지 않는다. Sonar의 복잡도·표기 관련 결과는 필수 CI·Codex의 기능/보안 판정과 구분해 최종 통합 기록에 남긴다. 검사 실패를 전부 통과로 표기하지 않는다.

진열 태블릿의 오류 영역이 kiosk-core의 fixed 전체화면 뒤에 가려지는 후속 P2 1건을 수정했다. Store adapter의 오류 banner를 kiosk의 overlay보다 위에 두고, 기기 연결 오류와 진열 설정 오류를 분리했다. 401 연결 해제 안내는 설정 재조회 성공에 지워지지 않으며, 재시도는 heartbeat도 즉시 다시 실행한다. Core를 변경하지 않았다.

진열 복구 회귀 2건·Store build/lint PASS. 실제 kiosk/API adapter에 합성 공개 응답을 연결한 desktop 1280×800·mobile 390×844 브라우저에서 `elementFromPoint`로 재시도/재연결 버튼이 최상단임을 확인하고 실제 클릭→설정 복구·setup 이동을 검증했다. page error·가로 overflow·직원 header 0, 합성 screenshot 직접 확인. 운영/실기기 자료는 사용하지 않았다.

## main 통합 확정 (2026-10-24)

직전 개발 인계에서 선행 상담 migration의 운영 적용이 남아 있음을 알린 뒤, 사용자가 ‘push된 파일을 모두 main으로 병합 → 배포’를 지시했다. 통합 범위는 선행 독립 상담·태블릿과 이번 한국어/다국어 상담, 그에 필요한 상담 상태 테이블 1개 및 API·admin·Store다. 추가 DB schema·업무 데이터 변경·배포 설정 변경은 포함하지 않는다.

- PR [#798](https://github.com/Renagang21/o4o-platform/pull/798), 검증 HEAD `27ed7507975233077a3a6ebd3f502da08da3bb8e`를 고정해 merge했다. main commit `97f22621707326b6c3f61caf22b91e395bfe21b0`, 2026-10-24 21:44:04 한국시간.
- 필수 ruleset은 `CI Gate`(추가 human approval 0)임을 직전에 재확인했다. PR CI [40094351362](https://github.com/Renagang21/o4o-platform/actions/runs/40094351362) 및 CodeQL PASS, Codex P2 6건 보완 후 해당 HEAD 재리뷰 지적 0·미해결 thread 0. admin bypass·auto-merge·main 직접 push를 사용하지 않았다.
- 최신 로컬 검증은 Store 69 files / 815 tests, API 25 suites / 179 tests, 기존 API 환경 의존 187 tests SKIP, 마지막 상담 집중 48 tests·진열 복구 2 tests PASS다. SQL 20검사와 상담 브라우저 10묶음·진열 복구 2개 viewport, API/Store/admin build·타입 검사 PASS. 수정 소스 신규 lint 경고 0, 기존 router/controller warning 4건은 별도다. fixture DB 잔존 0과 컨테이너 정리를 확인했다.
- 선택 [SonarCloud](https://sonarcloud.io/dashboard?id=Renagang21_o4o-platform&pullRequest=798)는 실패 상태다(D Reliability / B Security). 기준 main에서도 실패하던 별도 검사이며 ruleset 필수 항목이 아니다. 확인된 HTML backtracking 지적은 수정했고, 전체 Sonar 지적 해소로 보고하지 않는다. UTF-16 digest 정렬·복잡도·표기 및 fixture 관련 annotation이 남아 있다. 공개 API 상세 조회는 이 환경에서 연결되지 않아 GitHub가 제공한 summary/annotation까지만 확인했다.
- 병합 후 CI [40095157339](https://github.com/Renagang21/o4o-platform/actions/runs/40095157339)와 운영 배포 결과는 아래 운영 기록에서 확정한다. 실계정·현장 기기·유료 AI 품질 검증과 구분한다.

## 운영 배포·조회 확인 (2026-10-24)

병합 후 [CI 40095157339](https://github.com/Renagang21/o4o-platform/actions/runs/40095157339)와 [CodeQL 40095157378](https://github.com/Renagang21/o4o-platform/actions/runs/40095157378)이 성공했다. [Delivery 40095897625](https://github.com/Renagang21/o4o-platform/actions/runs/40095897625)는 `HELD_LEVEL_3`로 API·그에 의존하는 admin/Store를 보류했다. 배포 시점에 main HEAD와 대상 SHA 일치·소유자 실행 계정·진행 중인 다른 Actions 배포 없음도 확인했다.

[Promote 40096027406](https://github.com/Renagang21/o4o-platform/actions/runs/40096027406)을 main `97f22621707326b6c3f61caf22b91e395bfe21b0`, 서비스 `api,admin,store`로 실행했다. 2026-10-24 22:06:10 한국시간에 success로 끝났으며 production status는 **`DEPLOYED · deploy: api,admin,store`**다. 정상 migration job 외의 DB 직접 변경·freeze/배포 설정 변경·별도 태그 배포를 하지 않았다.

- API의 `Run database migrations` SUCCESS. 포함된 migration은 `CreateStoreConsultationStations1792815861315` 1개다. 기존 업무 데이터의 seed/update/delete는 실행하지 않았다.
- API 새 revision의 traffic 전 준비 상태 검사 → traffic 전환 → 전환 뒤 검증 SUCCESS.
- admin·Store의 새 revision smoke/traffic 전환 SUCCESS. 최종 Report가 세 서비스의 serving SHA를 대상 commit으로 확인했다(각 서비스 단일 revision 100% 판정).
- 비로그인 운영 점검 PASS: `/api/health/ready`·`/api/health/database` 200, Store의 `/consultation/customer`·`/consultation/staff`·`/tablet/setup`·`/store/workspace/use` 문서 200.
- Store 배포 entry `/assets/index-B-Re2h0d.js`에서 독립 route와 새 상담 안내·언어 UI·태블릿 복구 코드, admin entry `/assets/index-jv2GAKac.js`에서 상담 배치 API 연결을 확인했다.
- 비로그인 매장 배치 GET과 존재하지 않는 합성 기기의 상담 조회는 401. Store origin의 상담 API OPTIONS는 204 및 해당 origin 허용을 확인했다. 유효 기기 연결·로그인·고객 정보·업무 write·AI 호출은 하지 않았다. 최초 점검 스크립트의 누락된 `/pharmacy` 경로를 수정한 뒤 올바른 route에서 재확인했다.

실제 계정·태블릿/마이크·현장 상담과 언어별 품질 검증은 이번 배포 확인에 포함하지 않았다. 선택 SonarCloud의 실패 상태도 그대로 인계한다. 이 문서는 남은 실사용 검증의 근거로 ACTIVE를 유지한다. 선행 CHECK/TODO의 상태 헤더 2개는 의미를 바꾸지 않고 정본 enum과 완료 범위 줄로 정리했으며 과거 본문은 유지했다.

문서 정합: 통합·운영 기록 및 현재 반영 상태 갱신 / 상태 헤더 2건 정본화 / canonical index·과거 실행 본문·정책 변경 없음.
