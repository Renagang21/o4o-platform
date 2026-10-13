# 공급자 상품 UI 코드 정비 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거 WO**: [WO-O4O-SUPPLIER-PRODUCT-UI-CODE-CLEANUP-V1](../work-orders/WO-O4O-SUPPLIER-PRODUCT-UI-CODE-CLEANUP-V1.md)

## 검증 대상과 결과

main `f66ed5f5f` + 앞선 미통합 승인 작업 `8f671674c` 기반의 독립 branch에서 검사했다.
Node 22.18.0/pnpm 10.25.0, frozen install 및 web dependency build 후 수행했다.
실제 화면을 렌더하되 API 응답은 fixture다. 운영 계정·DB·실제 외부 발송/승인/가격 변경은 사용하지 않았다.

| 검사 | 결과 |
|---|---|
| 신규 화면 상호작용 검사, 수정 전 원래 코드 | 2 files / 28 tests PASS |
| 동일 화면 검사, 수정 후 | 28 tests PASS |
| 전체 web-neture 회귀 | 76 files / 660 tests PASS, unhandled error 0 |
| web-neture tsc + Vite build | PASS. 기존 큰 chunk 안내 유지 |
| 변경 파일 ESLint | 오류 0 / 경고 0 |
| 원래 코드 대비 AST 비교 | 24 항목 PASS — mutation 본문·base column schema·조회 effect 의존성 보존 |
| PC 1440px/mobile 390px browser | 원래/수정 후 각 18개 흐름 PASS. JS page error 0 |
| browser 전후 비교 | 컬럼 이름/순서·Drawer bounds·API 호출 순서/전송값 동일 |
| main 통합/배포/실계정 | NOT_RUN — 사용자 종료 범위/유예 |

브라우저는 실제 EditableDataTable, ProductForm, RichTextEditor 및 기존 상세 섹션을 사용했다.
API/auth/template/media I/O는 독립 harness의 fixture로 대체하고 외부 요청을 차단했다.
18개는 2 viewport × 9개 업무 흐름이다. 실운영 기능 성공을 의미하지 않는다.
Vitest의 form/table/editor 내부 adapter 검사와 실제 공통 UI의 browser 검사를 구분했다.

## 확인한 동작

- 목록 실패/정상 0건/필터 0건, 카운트 독립 오류와 retry
- 검색·승인 탭 query, 현재 페이지를 유지한 승인 후 rows/count 동시 갱신
- 승인 취소/제외 사유, 일괄 삭제/저장 부분 실패 표시, 선택 해제
- Drawer 진입/저장 후 목록 갱신, 연속 작업의 다음 미완성 행 이동
- B2B-only 설명 저장과 nullable trim, offer-only payload, offer 실패 시 후속 B2B 호출 중단
- offer 성공 후 B2B 실패 안내와 기존 갱신/편집 종료 계약
- dirty-close/Escape 확인, clean Escape 편집 취소, 상품 전환 초기화
- 이미지 등록/업로드/삭제 실패 시 오류 안내와 성공 callback 부재
- 스팟 정책 forbidden/load/정상 0건, stale 응답 거부, 생성 후 재조회 실패 구분
- 서비스 가격 입력 검증과 저장/재조회, 공급 서비스 철회 확인, Operator 승인 callback

초기 전체 테스트에서 연속 작업의 지연 스크롤이 jsdom 종료 후 실행됐다.
검사가 실제 스크롤 실행까지 기다리도록 보완한 후 전체 회귀를 재실행해 unhandled error 0을 확인했다.
제품의 타이머 동작을 검사 통과 목적으로 삭제하거나 assertion을 약화하지 않았다.

## 확인된 기존 한계와 인계

모바일 390px에서 Drawer 폭은 기존/수정 후 모두 480px, x=-90이다.
왼쪽 제목/내용 일부가 잘린다. 이번 책임 분리에서 layout을 변경하지 않았으므로 **모바일 사용성 개선 완료로 판정하지 않는다**.
모바일 폭 보완과 실계정 검증은 후속 대상이다. 운영 요청의 동시성/권한 구현/네트워크 실패를 fixture로 완전 검증했다고 주장하지 않는다.

검증 로그/JSON/스크린샷은 `/workspace/artifacts/supplier-code-phase1-*`와
`/workspace/artifacts/supplier-phase1-browser/`에 보존했다. 검증용 로컬 서버는 작업 종료 시 중지했다.

구현 commit `17c255e82fc82b60f01763bd230f6f9bf1e5da09`의 branch push와 원격 일치를 확인했다.
이번 Git 인계는 main PR/merge·CI Gate·운영 배포 검증을 포함하지 않는다.

문서 정합: 정본 의미 변경 없음. 모바일 한계는 이번 검증 기록에 명시.

## 2차 — 등록·import 책임 정비 (2026-10-13 KST)

근거: [등록/import WO](../work-orders/WO-O4O-SUPPLIER-PRODUCT-AUTHORING-CODE-CLEANUP-V1.md).
main `aa59a0962` + 1차/앞선 승인 공급자 push `f03b36325`를 새 `wo/supplier-code-phase2`에서 검사했다.
위 1차 기록은 당시 실행 결과로 그대로 보존한다.

| 검사 | 결과 |
|---|---|
| frozen install/검증된 store, web dependency build | PASS, Node 22.18.0 / pnpm 10.25.0 |
| 기존 동작 화면 상호작용 검사 | 원래/수정 후 각 14 tests PASS |
| 추가 갤러리 보존 회귀 | 원래 코드 1건 FAIL로 결함 재현 → 수정 후 PASS. 최종 신규 화면 검사 15건 |
| 전체 web-neture | 78 files / 677 tests PASS, unhandled error 0 |
| 기존 등록 cutover/에디터 경계 | 수정 전 44 / 수정 후 45 tests PASS. 추가 1개는 이동한 에디터 소비처 검사 |
| web tsc + Vite build | PASS. 기존 큰 chunk 안내 유지 |
| 변경 파일 ESLint | 오류 0 / 경고 0 |
| 원래 코드 대비 AST | 26항목 PASS — 저장/이미지 처리/초안 전달 본문 및 분석 결과 필드 보존 |
| PC 1440px/mobile 390px browser | 원래/수정 후 각 22개 항목 PASS, JS page error 0 |
| 갤러리 연계 추가 browser | PC/mobile 총 8항목 PASS — 선택·standard 복사·draft 갤러리·Candidate 전달 |
| browser 전후 비교 | API 호출 순서/payload와 draft 전달 필드 동일. 생성 시각은 비교 제외하고 양쪽 존재 확인 |
| main 통합·CI Gate·배포·실계정 | NOT_RUN — 사용자 종료 범위/유예 |

Vitest는 실제 두 화면을 렌더하고 공통 form/editor 내부를 adapter로 대체한다.
브라우저는 실제 ProductForm, RichTextEditor, Firstmall parser, sessionStorage와 두 화면의 route handoff를 사용한다.
API/guide/activation/media I/O만 fixture이며 외부 요청은 차단했다. 실제 권한 검증/운영 쓰기로 확대하지 않는다.

14개 검사에는 단계 검증·카테고리 실패/retry·Candidate 금지 키·실패 안내·이미지 부분 실패·기존 Master 연결·
바코드 placeholder/조회 실패·단일사용 draft·처방 구분·import 유형 보존/복사 실패/사용 확인/reset이 포함된다.
브라우저는 가격 입력 유지·후보 실패 후 재요청·미디어 업로드·상세 이미지 preserve 복사·thumbnail 복사·
설명/가격/유형 전달·단일사용 초안 소비·기존 Master 연결을 확인했다. import 이동 버튼은 키보드 Enter로도 검증했다.
22개는 2 viewport × 11개 확인 항목이며 서버의 실제 저장 성공을 뜻하지 않는다.

가격 초기값은 전체 form을 memo dependency에 넣지 않았다. 원래 step별 초기값 의미를 snapshot으로 보존했다.
parse 분리 후 상세 이미지 선택은 새 분석 결과의 후보 인덱스로 초기화됨을 검사했다.
기존 소스 금지 assertion은 삭제하지 않고 새 모듈까지 검사 범위를 넓혔다.
추가로 발견한 갤러리 초안 필드 누락은 기존 Candidate의 상세/성분 이미지 입력을 사용해 보완했다.
기존 22항목 전후 비교는 그대로 보존하고, 갤러리 포함 동작의 의도된 개선은 별도 회귀/browser로 구분했다.

### 기존 사용성 한계

후보 접수 완료 화면의 전후 스크린샷은 양 viewport에서 동일했다.
import 스크린샷 크기도 전후 동일(PC 1440×3345, mobile 523×4077)이지만 커서 등 소량 픽셀 차이는 있다.
mobile viewport 390px에서 이미지 선택 도구막대가 가로로 넘치는 기존 현상은 양쪽 모두 확인했다.
이번 책임 분리를 모바일 사용성 개선 완료로 판정하지 않는다. 공통 에디터/1차 Drawer 폭 보완과 실계정 검증은 후속 대상이다.

로그/AST 결과는 `/workspace/artifacts/supplier-code-phase2-*`, browser JSON/스크린샷은
`/workspace/artifacts/supplier-phase2-browser/`에 보존했다. 자기 검증 서버 종료를 확인했다.
구현 `15498766a0cb946d52c8492d2cc1ea3e0b10a68d`의 branch push와 원격 일치를 확인했다.
이번 범위는 main 통합/배포/실계정 검증을 포함하지 않는다.
문서 정합: 정본 정책 변경 없음. 동일 트랙 CHECK에 추가하여 별도 회차 CHECK를 만들지 않았다.

## 3차 — 프로필·API 책임 정비 (2026-10-13 KST)

근거: [WO-O4O-SUPPLIER-PROFILE-API-CODE-CLEANUP-V1](../work-orders/WO-O4O-SUPPLIER-PROFILE-API-CODE-CLEANUP-V1.md).
최신 main `aa59a0962` + 승인된 앞선 공급자 정비 `affa32bc4` 기반 전용 branch에서 검증했다.
Node 22.18.0/pnpm 10.25.0, frozen install과 web dependency build를 사용했다.
Profile 1,300 → 140행, supplier API 2,014 → 92행. 업무 controller/표시 섹션과 API 구현/타입을 분리했다.
API caller와 실제 MyBusinessProfile route는 보존했다.

| 검사 | 결과 |
|---|---|
| 신규 프로필 상호작용/전송 계약, 원래 코드 | 2 files / 30 tests PASS |
| web-neture 전체 회귀 | 80 files / 707 tests PASS |
| supplier cutover·Partner 은퇴·identity 소스 경계 | 3 suites / 93 tests PASS |
| 타입 검사·운영 빌드 | PASS (`tsc && vite build`) |
| 변경 TypeScript/TSX 범위 ESLint | PASS |
| 원본 AST 비교 | 134 checks PASS — 공개 exports, 타입, 요청 함수·오류 helper·설정, 39개 메서드/순서, 프로필 8개 command, 6개 섹션 markup |
| PC/mobile Chromium, 원래 코드 | 2 viewports / 18 checks PASS |
| PC/mobile Chromium, 분리 후 | 2 viewports / 18 checks PASS |
| 브라우저 전후 결과 비교 | 정상/재시도 API call 기록·payload·오류·섹션 위치/크기 동일 |
| 실계정·운영 DB/API 쓰기 | NOT_RUN — 사용자 유예, fixture I/O만 사용 |
| main merge·배포 | NOT_RUN — commit/push 종료 범위 |

프로필 검사는 초기 전체 조회 대기, 기본 실패/부재, 보조 영역 독립 retry, 입력 유지,
초기 tax email의 onboarding 우선/profile fallback, profile/onboarding 저장 경계,
문서 PDF 업로드/재조회·잘못된 파일 차단, 품목군 선택·승인 상태 해제 금지와 기존 증빙 열람을 포함한다.
전송 검사는 multipart/blob, 빈 결과/실패/403/404 구분, 주문/spot/library 오류,
recruitment·event proposal·bulk Candidate 부분 결과와 원래 payload를 확인한다.
AST 비교는 주석·괄호·포맷팅 공백을 제외하고 실제 선언/본문/값을 비교했다.
내부 helper의 모듈 export는 기존 public facade에 추가되지 않는다.

브라우저는 실제 Profile와 공통 BusinessRegistrationFields를 렌더했다. 주소검색과 서버 I/O는 fixture로 대체했다.
PC 1440×1000, mobile 390×844에서 각각 9개 동작 묶음을 확인했다.
정상/실패/재시도·profile/onboarding 저장·품목군 선택/해제·승인 보호·PDF/blob 동작 모두 전후 동일했다.
프로필 전체 크기는 PC 1440×4965, mobile 390×5972로 전후 동일하며 양쪽 가로 overflow가 없다.
스크린샷을 직접 확인했고 browser page error는 0건이다. 실제 운영 저장 성공을 뜻하지 않는다.

빌드의 오래된 Browserslist 데이터/큰 chunk 안내와 Jest 강제 종료 안내는 기존 설정에서 나온다.
이 안내 때문에 의존성·Jest 설정을 변경하지 않았다.
종료 전 main `90e49c3e6`의 PharmacyHub 변경을 확인했다. 변경 대상 및 지침/정본 중 이번 범위와 겹친 항목은 없다.
외부 변경을 현재 검증 결과에 포함하거나 main 통합 완료로 판정하지 않는다.

로그/AST 결과: `/workspace/artifacts/supplier-code-phase3-*`.
브라우저 전후 JSON/스크린샷: `/workspace/artifacts/supplier-phase3-browser/`.
후속은 backend router/controller 최신 census와 실계정 검증이다. 앞선 Drawer/공통 에디터 사용성 한계는 유지된다.
문서 정합: 잘못된 businessInfo 저장 소유권 코드 주석을 정본에 맞췄다. 정본 정책 변경 없음.

3차 종료: 구현 `c5718402d1e986e57559fb8f0e3ad348de4e3ef9`의 `wo/supplier-code-phase3` push와 원격 일치를 확인했다.
자기 검증 서버 종료(5191 listen 0), 기존 checkout/branch 보존을 확인했다. main merge·배포는 수행하지 않았다.

## 4차 — backend HTTP 책임 정비 (2026-10-13 KST)

근거: [WO-O4O-SUPPLIER-BACKEND-HTTP-CODE-CLEANUP-V1](../work-orders/WO-O4O-SUPPLIER-BACKEND-HTTP-CODE-CLEANUP-V1.md).
기준: fresh main `e36bcf931` + 앞선 승인 push `70546698a`, 전용 clone/`wo/supplier-code-phase4`.
먼저 TODO 작성 후 현재 supplier route/mount/인가/서비스/웹 소비처·검사를 재조사했다.
사업자 관리 13개 + 상품 12개 route를 업무별 handler와 bulk Candidate 업무 서비스로 분리했다.
외부 route/factory, middleware 순서, 다른 주문/배송/재고/정산/Programs 계약은 유지했다.

| 검사 | 결과 |
|---|---|
| 기존 경계/컨트롤러 기준 검사, 수정 전 | 11 suites / 268 tests PASS |
| 신규 HTTP 계약, 원래 코드 | 1 suite / 48 tests PASS |
| 객체 상속 키 타입 접수 결함, 원래 코드 | 3 tests FAIL — 각각 기대 400 / 실제 201. 결함 재현이며 skip 48건은 실행 성공으로 세지 않음 |
| 최종 공급자·주문·정산 관련 회귀 | 25 suites / 619 tests PASS |
| 신규 HTTP 계약 포함 건수 | 51 tests PASS — 기존 48 + 결함 회귀 3 |
| 실제 소스 AST 전후 비교 | 57 checks PASS — 25개 path/order/guard, 24개 handler, bulk 상수/helper/검증·행 처리. 의도한 own-key 검사 1곳은 명시적 수정으로 대조 |
| API 전체 타입 검사 | PASS (`tsc --noEmit`) |
| API TypeScript 빌드 | PASS (`tsc -p tsconfig.build.json`) |
| API 운영 번들 | PASS (`tsup`, main/migrate 산출물) |
| 변경 18개 TypeScript 파일 ESLint | PASS — 오류/경고 0 |
| main 최종 fetch | `e36bcf931` 유지 |
| 실계정·운영 DB/API 쓰기·운영 OAuth | NOT_RUN — 사용자 유예, fixture I/O만 사용 |
| PR/main merge·배포 | NOT_RUN — commit/push 종료 범위 |

실제 Express HTTP 요청을 보내고 실제 supplier identity middleware를 사용했다.
인증·조직 resolver·main membership·업무 서비스·upload/storage는 fixture로 대체했다.
따라서 운영 토큰, 실제 조직 DB 인가, 실제 PDF 저장 성공을 뜻하지 않는다.
linked/active 상태 분리, explicit 조직 403/409, service 미호출, 승인 전 profile/onboarding 보완,
등록 201/403/409/428, profile 404/지원 불가 400, onboarding 오류, 문서 stream/header/404/다운로드 실패,
품목군 선택/해제 잠금, Offer whitelist·권한/상태 매핑·100개 제한·부분 삭제 결과,
bulk 파일 차단·행별 실패·중복 생성·분류 alias·출처·예외 시 이후 행 중단을 확인했다.
새 상속 키 거부 3건을 제외한 handler 본문과 bulk 흐름은 AST로 원본을 대조했다.

기존 소스 검사는 test-only helper로 이동한 handler의 실제 연결을 따라간다.
기존 single-line route/숫자 상태 ternary의 포맷팅만 정규화하고 금지 assertion은 유지했다.
순서가 중요한 static/dynamic route와 middleware를 합치거나 mount 위치를 옮기지 않았다.
ProductMaster/Offer 직접 bulk 생성, 새 transaction/정산 정책, 새로운 Programs engine은 없다.

초기 build:deps는 미빌드 content-editor에서, 초기 번들/타입은 일부 API dependency 산출물 부재에서 실패했다.
기존 frozen 설치 후 shared/API dependency graph를 순서대로 빌드해 최종 검사에서 모두 해소했다.
한 회귀 실행은 기본 Node24/fallback pnpm 활성화 누락으로 테스트 시작 전에 실패했고,
Node22.18.0/pnpm10.25.0을 명시한 실행으로 정정했다. 실패를 테스트 PASS로 세지 않았다.
별도 package/lockfile/CI 변경 없이 해결했다. tsup의 기존 duplicate skipLibCheck와 Jest force-exit 안내는 남아 있다.

로그/원본 비교: `/workspace/artifacts/supplier-code-phase4-*`, `/workspace/artifacts/supplier-phase4-compare-source.mjs`.
새 서비스/컨테이너/운영 인증 세션을 시작하지 않았다. supertest fixture 요청은 테스트 수명 안에서 종료됐다.
후속: 이미지/가져오기·콘텐츠 처리 경계, 앞선 mobile Drawer/공통 에디터 사용성 한계, 사용자 실계정 검증.
문서 정합: 사업자 필드의 조직 metadata 저장 소유권 코드 주석을 정본에 맞췄다. 정본 정책 변경 없음.

4차 종료: 구현 `b45b0379020c8bc295bd656960289cc05ab71a78`의 `wo/supplier-code-phase4` push와 원격 SHA 일치를 확인했다.
기존/이번 clone은 미통합 branch와 shared object 참조 때문에 KEEP. main 통합·배포는 수행하지 않았다.

## 5차 — 이미지·콘텐츠·모바일 묶음 (2026-10-13 KST)

근거: [WO-O4O-SUPPLIER-MEDIA-CONTENT-MOBILE-CODE-CLEANUP-V1](../work-orders/WO-O4O-SUPPLIER-MEDIA-CONTENT-MOBILE-CODE-CLEANUP-V1.md).
기준: fresh main `75a28d931` + 승인 dependency `dd07ab8ec`, 전용 clone/branch.
18개 endpoint(이미지5/가져오기2/library8/STORE 설명서3)의 처리 경계와 모바일 두 문제를 함께 정비했다.

| 검사 | 결과 |
|---|---|
| 원래 HTTP/이미지 소유 검사 | 2 suites / 47 tests PASS |
| fetch 보안·복사 검사, 수정 전 | 10 PASS / 3 FAIL — userinfo 사전 검사 부재와 localhost/타 origin 자동 redirect 재현 |
| 수정 후 HTTP/소유/fetch 집중 검사 | 3 suites / 61 tests PASS |
| API 관련 최종 회귀 | 31 suites / 777 tests PASS |
| Neture 전체 회귀 | 89 files / 788 tests PASS |
| KPA 전체 회귀 | 17 files / 135 tests PASS |
| 원본 AST/route 비교 | 46 checks PASS / 18 routes — 경로·순서·gate, 이동 handler·소유 판정, STORE validation/SQL/writer/응답, OCR 실제 대상, 변경 없는 import controller |
| API 타입·TypeScript 빌드·운영 번들 | PASS |
| content-editor typecheck/build | PASS |
| Neture/KPA tsc + Vite 운영 빌드 | PASS |
| admin/store-web/forum-core/lecture-web 타입 검사 | PASS |
| 변경 15개 TS/TSX 범위 ESLint | PASS — 오류/경고 0 |
| 원래 Chromium 3개 실제 화면 × PC/mobile | 6개 동작 묶음 PASS — 기존 overflow는 관측·기록 |
| 수정 후 같은 Chromium 동작 | 6개 동작 묶음 PASS — payload와 PC bounds 동일, page error 0 |
| 열린 이미지 메뉴 resize | Neture/KPA × 320/600/390px = 6 checks PASS — editor/viewport 내 위치 유지, error 0 |
| 실계정/운영 저장/외부 이미지 요청 | NOT_RUN — I/O fixture 사용, 사용자 유예 |
| main merge/배포 | NOT_RUN — commit/push 종료 범위 |

수정 전 실제 CSS가 적용된 390px viewport에서 Drawer x=-90/width480,
import 이미지 메뉴 right≈523과 문서 scrollWidth523을 확인했다.
수정 후 Drawer x=0/width390, import scrollWidth390, 메뉴 width290으로 제한됐다.
KPA resource 모달의 메뉴도 width292/높이52로 wrapping되어 editor 안에 들어온다.
PC1440의 Drawer480과 두 메뉴의 위치/폭/높이는 전후 동일하다.
SVG/본문 fixture로 실제 TipTap·Neture Products/Import·KPA ResourceWriteModal을 렌더하고
폭/정렬/삭제·HTML 탭 메뉴 숨김, dirty 확인·offer 저장, copy preserve 모드, KPA draft 저장을 확인했다.
스크린샷을 직접 점검했고 저장 payload/call 기록은 전후 동일하다.

### Consumer Impact Matrix

RTE 식별자/import/re-export/주석/테스트 검색 결과 80개 source 파일을 별도 목록에 보존했다.
이는 80개 live screen이라는 판정이 아니다. 기존 public props/export와 HTML/JSON/저장 의미는 그대로다.
상세 import/문자열/원본 파일 소비처를 조사하고 관련 editor source 계약도 함께 실행했다.

| 소비처 | 사용/영향 | route/role/capability | 검증 | 결과 |
|---|---|---|---|---|
| Neture supplier Products/Import | Drawer·RTE 배치 변경 | 무변경 | PC/mobile 실제 화면 + resize + 전체 회귀 + 빌드 | PASS |
| Neture operator/콘텐츠 | 공통 RTE 배치 변경 | 무변경 | Neture type/build·회귀, 공통 contract | PASS; 실계정 NOT_RUN |
| KPA resources/약국/콘텐츠 | 공통 RTE 배치 변경 | 무변경 | ResourceWriteModal PC/mobile+resize, 전체 회귀·build | PASS |
| web-store 약국/콘텐츠 | 공통 RTE 배치 변경 | 무변경 | store-web type-check + 두 소비처 real RTE smoke | PASS; 개별 실계정 NOT_RUN |
| admin CMS/store | 공통 RTE 배치 변경 | 무변경 | admin type-check + 공통 RTE/계약 검사 | PASS; 개별 실계정 NOT_RUN |
| forum-core admin-ui | RTE 사용 | 무변경 | forum-core typecheck + shared props 보존 | PASS |
| operator-core-ui/shared-space-ui/store-ui-core/tablet-screen-set-editor | RTE 또는 주입/re-export 소비 | 무변경 | 상기 서비스 타입 검사·소스 census | PASS |
| web-lecture 강사 편집 | RTE 사용 | 무변경 | lecture-web 타입 검사 | PASS; 실계정 NOT_RUN |
| tablet-kiosk-core/types | RTE 이름은 주석/산출 HTML 설명에 등장 | 무변경 | import/사용 여부 소스 대조 | 직접 편집기 소비 아님 |
| K-Cosmetics/PharmacyHub | 퇴역 서비스 복구 대상 아님 | 무변경 | 현행 서비스/소비처 census, 퇴역 계약 유지 | NOT_APPLICABLE |

### 안전 경계·검사 도구 진단

네트워크/DNS/MediaLibraryService·GCS·actor/auth/DB는 fixture다. 실제 외부 URL이나 운영 storage 쓰기는 없다.
실제 legacy gate/이미지 소유 service와 HTTP router를 사용하되 저장/query는 stub으로 검증했다.
fetch는 initial URL과 매 redirect target을 다시 검증한다. 동일 origin 이동/bytes/MIME·크기·부분 복사 결과를 확인했다.
중간 response를 정리하고 8초 timeout signal을 공유하며 5회 redirect 이후 기존 fetch_error로 종료한다.
private/다른 origin target은 두 번째 fetch 전에 거부한다. 주소 credential은 요청 전에 거부하며, 복사/업로드 실패 로그에는 입력 URL을 넣지 않는다. 별도 회귀로 이를 확인했다.

초기 fixture에는 재사용 Response body, query URL의 잘못된 CSS 주소, control 이름/초기 유형 선택 누락이 있었다.
fixture를 정정하고 재실행했으며 그 실패를 앱 회귀 PASS로 세지 않았다.
원본 Drawer용으로 새 bundle에서 사라진 원래 480px utility만 fixture에 복원했다.
CSS preflight와 fixed 위치를 검사한 뒤 최종 전후 크기를 기록했다.
KPA 지정 검사 경로가 비어 있던 실행은 실패/0 tests로 구분하고 실제 전체 suite를 실행했다.
store package 이름 무매칭 및 admin appearance dependency 부재를 확인해 정확한 package name과 dependency graph build로 해소했다.
서로 연결된 shared clone의 alternate 깊이 실패는 자기 clone의 참조 목록만 평탄화/정렬하여 해결했다. 외부 clone은 변경하지 않았다.

빌드의 기존 Browserslist/큰 chunk·duplicate skipLibCheck, Jest force-exit 안내는 설정 변경 없이 남아 있다.
원본/AST/로그: `/workspace/artifacts/supplier-code-phase5-*`.
브라우저 JSON·스크린샷·resize/call 비교: `/workspace/artifacts/supplier-phase5-browser/`.
자기 5192 서버 종료와 listen 0을 확인했다. 이전/이번 clone·미통합 branch는 KEEP이다.
main 최종 조회 `75a28d931`. 실계정과 main 통합/배포는 별도 실행 범위다.
문서 정합: 해당 없음 — 정본 정책 변경이나 추가 문서 drift 없음.

5차 종료: 구현 `a130dc53a8734bd121a184ea573a031a5006bab1`의 전용 branch push와 원격 SHA 일치를 확인했다.
검증 5192 서버 종료·listen 0·기존 clone/branch 보존을 확인했다. 종료 범위는 commit/push다.


## 누적 변경 main 통합·배포 준비 — 2026-10-13

- 사용자 종료 범위 변경: 앞선 push-only 기록은 당시 범위이며, 이번 요청은 누적 공급자 변경의 PR 병합과 배포까지다.
- 최신 main `4604f947e50d38eb558081cc50d9a6059f88aee5`의 4개 별도 PH 정리 파일을 자기 branch에 충돌 없이 merge했다. 추가 조회 테스트 5 PASS. 공급자 소스는 기존 검증 완료 상태를 유지한다.
- 앞선 검증: API 31 suites/777 tests, Neture 89 files/788 tests, KPA 17 files/135 tests PASS; API·editor·Neture·KPA 빌드 및 공유 소비자 typecheck PASS. PC/mobile fixture smoke는 실제 운영 계정 검증과 구분한다.
- 실제 main ruleset 조회: PR 필수, required check `CI Gate`, 필수 human approval 0. 정상 PR 경로로 통합한다.
- main 대비 누적 diff에 schema/migration, dependency/lockfile, workflow 변경은 없다. PR 기준 API 위험은 정산 코드의 payment 규칙으로 LEVEL_3이며, 에디터 소비자 frontend는 LEVEL_2다. 실제 배포 범위는 Delivery의 서비스별 serving SHA→target SHA 판정으로 확정한다.
- PR CI·리뷰 및 post-merge CI·Delivery·서빙 SHA·read-only 운영 smoke는 이후 실행 결과로 별도 기록한다. 운영 계정·데이터 쓰기 검증은 사용자 후속 검증으로 유지한다.


## 누적 변경 main 통합·배포 완료 — 2026-10-13

- 상태: **COMPLETED**. 앞선 push-only 기록은 당시 승인 범위이며, 추가 요청에 따라 주문·배송·재고·정산 쓰기 안정화와 코드 정비 1~5차를 함께 통합·배포했다.
- 정상 병합: [PR #542](https://github.com/Renagang21/o4o-platform/pull/542), main `8e39d2906a3bb217ad28c6cfacaa0bb6557897ba`; 누적 작업 tip 7개 모두 main 포함 확인. PR source head `9898d67b6cc3743ced9065af8af45a9a3ea1f03c`와 병합 tree 차이 0.
- [PR CI 38398634707](https://github.com/Renagang21/o4o-platform/actions/runs/38398634707) SUCCESS, required `CI Gate` PASS. Codex review COMPLETED·findings 0·미해결 review thread 0; CodeQL·Guard PASS. ruleset 우회·admin bypass·force push 없음.
- [post-merge CI 38400188303](https://github.com/Renagang21/o4o-platform/actions/runs/38400188303) SUCCESS. 별도 PH 운영 CLI·테스트·WO 3파일이 main에 추가되어 최신 target은 `3809c42db3f9d7f87ea9ba0ff4e62e4ad1ac0eb4`이며, supplier/runtime·migration 차이는 없다. [최신 main CI 38400218052](https://github.com/Renagang21/o4o-platform/actions/runs/38400218052)도 SUCCESS.
- [Delivery 38402619839](https://github.com/Renagang21/o4o-platform/actions/runs/38402619839) classify SUCCESS: API 정산 변경 LEVEL_3, 의존 frontend 보류; CI·freeze·WIF 정상. 마지막 성공한 API 배포 `e36bcf9318f2c52daee25bc6ffb637def93569d5` 이후 migration source 차이 0. 정상 promote에서 기존 migration Job·readiness·트래픽 전환 검증은 SUCCESS. 신규 migration·schema 변경을 추가하지 않았다.
- [Promote 38403004672](https://github.com/Renagang21/o4o-platform/actions/runs/38403004672) SUCCESS. API 먼저 배포 후 admin·neture·kpa-society·lecture·store·kpa-branch를 verified rollout. 최종 report가 7서비스의 단일 revision 100% traffic·serving SHA=target을 확인했고 commit status `production`은 **DEPLOYED / success**.
- 같은 SHA의 선행 promote 38402965437은 API 미선택에 따른 dependency gate로 배포 0; 자기 요청은 production concurrency에서 기다린 뒤 실행했다. 다른 run 취소·게이트 변경 없음.
- 운영 HTTP smoke: 배포 전 17/17, 배포 후 17/17 PASS. API health·ready 2, 비인증 supplier profile/product/order/inventory/settlement/content/media 경로 8의 401, 웹 화면 및 같은 host의 JS/CSS 응답 7 확인. 실제 계정·상품·주문·정산 write 검증은 사용자 후속 검증으로 유지한다.

### 남은 보완과 검증 한계

- SonarCloud advisory는 C Reliability로 FAIL. 실제 main ruleset의 required check는 CI Gate이다. 공개 annotations 50건을 점검했으며 폼 label·autoFocus 항목의 기존 main 존재와 기존 이미지 checkbox markup을 확인했다. 기존 접근성 연결·Promise 표기·고복잡도 함수 보완을 후속 코드 정비 대상으로 남긴다. Sonar 설정·기준·finding 상태를 변경하지 않았다.
- 추가 운영 브라우저 smoke는 환경 프록시 CA 신뢰 문제로 NOT_RUN. 영구 root NSS 신뢰 저장소 변경은 자동 승인 검토가 명시적 승인 부족으로 거부하여 중단했다. TLS 검증을 유지한 HTTP smoke와 기존 fixture PC/mobile·resize 검증 및 verified rollout 근거로 구분한다.
- 상세 Actions 로그/zip은 허용 도메인 밖의 저장소로 리다이렉트되어 다운로드 불가였다. GitHub API의 CI/job/step 결과와 source·production status·HTTP 결과를 사용했다. 필요한 host 1개를 환경 설정 초안에 추가했고 적용은 게시가 필요하다.
- 종료 정리: 작업 checkout은 artifact의 source 비교·browser harness 참조와 shared object 보존을 위해 **KEEP**. 다른 세션의 checkout·branch·작업은 정리하지 않는다.
