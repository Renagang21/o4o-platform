# 공급자 폼·이미지 접근성 검증

> **상태**: DRAFT · **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거 WO**: [프론트엔드 디자인 잔여](../work-orders/WO-O4O-FRONTEND-DESIGN-ACCESSIBILITY-V1.md)

## 현재 로컬 검증

- Node 22.18.0 / pnpm 10.25.0, frozen/offline install. main 기준 source 변경이 없는 35개 package dist만 재사용했다.
- 기존 화면 검사에서 라벨 기반 편집으로 11 FAIL / 20 PASS를 관측했다. 수정 후 profile/authoring/Drawer 3 files / 48 tests PASS. 세금계산서의 필수 표시 문자를 포함하는 label matcher를 정정한 초기 실패는 PASS에 포함하지 않는다.
- 수정 TS/TSX lint 오류·경고 0. Neture 타입 포함 Vite 빌드 PASS. 기존 큰 chunk/Browserslist 경고 유지.
- 실제 Contact/Basic/Media 컴포넌트와 서비스 CSS의 합성 Chromium 화면: 1440px 마우스, 390/320px touch에서 모두 PASS. 6개 contact label 클릭 초점·두 인스턴스의 ID/값 격리·브랜드 입력·파일 초점 표시·이미지 업로드/키보드 삭제·touch 44px 이상·가로 overflow 0·page error 0을 확인했다. 6개 screenshot을 보존하고 모바일 이미지를 직접 점검했다.
- 첫 임시 Vite config의 CJS 번들링 오류를 createRequire로 수정했다. 초기 삭제 초점 표시 실패 뒤 숨김을 제거하고 명시적 focus ring을 적용했다. 최종 3 viewport를 다시 실행했다.
- 브라우저 I/O는 fixture다. 실제 회원·외부 업로드·상품/정산 저장·운영 DB 쓰기를 실행하지 않았다. 전체 서비스 화면이나 실기기 검증 완료를 뜻하지 않는다.

임시 harness·로그·JSON·screenshot은 `/workspace/o4o-design-browser`와 `/tmp/o4o-design-*`에 있다. source와 fixture는 분리했으며 운영 응답·credential을 문서에 복사하지 않았다.

## 통합·배포

PR #556의 등록/import 라벨 개선을 반영하고 두 runtime 파일의 중복 변경을 제거했다. 이번 변경은 프로필·서류·배송·이미지·import 결과/HTML 입력·스팟 날짜 접근성을 담당한다. 기존 두 파일의 라벨과 브랜드 두 입력 계약은 upstream 구현을 그대로 유지한다.

최신 main `f2bc1076f` 반영 후 Neture 전체 95 files / 849 tests PASS, 타입 포함 빌드와 변경 TS/TSX lint PASS. Chromium 1440/390/320px를 다시 실행하여 같은 6 fixture 화면 모두 PASS, 6 screenshot을 보존했다. 9개 runtime 파일의 onChange/onClick 등 이벤트 handler AST를 upstream과 대조해 전부 동일함을 확인했다. 브라우저는 현재 적용된 Basic 컴포넌트의 브랜드 직접 입력 이름을 사용하도록 fixture를 정합했다.

현재 source main 통합, required CI, 운영 배포는 미완료다. 과거 기록의 미병합 표시는 현재 Git ancestry와 별도 배포 CHECK로 판단한다.

운영자 PR #544의 실제 Promote 38491966980에서 API의 `Build API server (bundled with tsup)` 단계가 실패했고 downstream이 보류됐다. 이후 Promote 38493246341은 classify SUCCESS지만 deploy/report job 모두 skipped다. 성공한 run 상태만으로 DEPLOYED로 기록하지 않는다. 상세 실패 로그는 허용되지 않은 리다이렉트 destination 때문에 읽지 못했으며 근본 원인은 아직 확정하지 않는다. 이후 별도 PR #557이 운영 번들 타입 수출 오류를 다루고 있는 것을 확인했다. 해당 소스/CI/배포를 이번 UI 변경의 검증으로 대신 세지 않는다.

## 남은 외부 요건

PR #560 자동 리뷰의 P2는 primary pointer만 검사하면 마우스가 기본인 터치스크린 기기에서 이미지 삭제/선택 영역이 20px로 남는다는 지적이다. 세 영역의 CSS 조건을 `any-pointer: coarse`로 변경했다. 데스크톱/터치 viewport, 영향 회귀 3 files / 50 tests, 빌드·lint를 다시 통과했다. 지적 thread는 해소했고 해당 커밋의 자동 재리뷰가 추가 finding 없이 완료됐다. Chromium의 media feature override는 fine+coarse 혼합 장치 구성을 재현하지 못했으므로 실제 하이브리드 기기 검증 완료로 표시하지 않는다.

확대된 import 이미지 선택 영역을 추가 측정했을 때 320px에서 기존 별표 버튼과 가로 2.67px 겹치는 회귀를 발견했다. 모바일 그리드를 2열로 바꾸고 대표 이미지 버튼도 이름·pressed 상태·44px touch 영역을 제공했다. 실제 ImportResult와 Field를 렌더하되 ProxiedImg I/O만 로컬 SVG fixture로 대체했다. 1440/390/320px에서 선택/해제·대표 지정, 두 control 겹침 0, 터치 44px, overflow 0, page error 0을 확인했다. 추가 authoring 17 tests·lint PASS. 이미지 클릭/선택 callback은 그대로다. 총 9개 화면 screenshot을 보존했다. 초기 fixture의 null fallback와 별표 accessible-name locator 오류를 진단한 실패는 PASS로 세지 않는다.

별도 API 오류 수정 PR #557이 병합된 것을 확인했다. 이 사실은 quota migration 적용이나 API 운영 배포 완료를 뜻하지 않는다.

운영 계정 파일·정식 브랜드 자산이 없다. static host SEO는 현재 runtime 메타만으로 해소되지 않아 Docker/nginx/edge 변경 범위를 별도로 확정해야 한다. migration 포함 promote는 AGENTS.md §4-1(f)의 명시 승인 요건을 따른다. 외부 요건 확보와 무관한 로컬 수정·회귀 검증은 계속한다.

문서 정합: 이번 WO/CHECK로 현재 작업 범위와 실제 검증을 기록한다. 과거 COMPLETED 이력과 canonical 정책을 재작성하지 않는다.
