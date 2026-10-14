# Admin CMS 미리보기 점검 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-10 · **최종 갱신**: 2026-10-10
> **근거 WO/IR**: 사용자 요청 — 초기 TODO → 코드·문서 점검 → TODO 수정 → 보완·검증

## 최초 TODO

1. 최신 main의 CMS 미리보기 진입 경로와 호출 API를 확인한다.
2. 현재 CMS 데이터·권한·사용처와 route 보존 계약의 근거를 점검한다.
3. 서버의 현행 조회 API와 화면 연결 가능 여부를 확인한다.
4. 점검 결과로 TODO와 구현 범위를 수정한다.
5. 승인 범위에서 오류·빈 상태·접근 경계를 보완하고 관련 회귀를 검증한다.
6. 별도 정책 판단 또는 API·권한 계약 변경이 필요하면 근거와 구체적인 선택지를 보고한다.

## 점검 후 TODO

기준: `origin/main`의 `2a92ce24c`. 정본 지도·Content Core Overview·Platform Content Policy를 확인했다.

- [x] `/preview/:slug`와 기존 공개 fetch 계약을 유지한다. 현행 관리 화면에 미리보기 메뉴를 추가하지 않는다.
- [x] API origin·`/api`·`/api/v1` 설정에서 중복 경로 없이 URL을 만들고 slug를 단일 경로 요소로 인코딩한다.
- [x] 조회 실패·권한 거부·잘못된 응답을 사용자 안내와 재시도로 처리한다. 서버의 오류 원문을 화면·로그에 출력하지 않는다.
- [x] 빈 components를 빈 미리보기로 표시한다. 잘못된 schema가 renderer를 중단시키지 않도록 검사한다.
- [x] slug 변경·unmount 시 요청을 취소하고 이전 응답이 새 화면을 덮지 않도록 한다.
- [x] 타입·단위·desktop/mobile 브라우저 검사 및 기존 route 보존 계약을 검증한다.

## 점검 근거와 범위 경계

- 서버 `bootstrap/register-routes.ts`는 `/api/v1/cms`에 `cms-content.routes.ts`를 마운트한다. 제공 대상은 contents·slots·stats·engagement·health이며 `/public/view/:slug`와 `/views/slug/:slug`는 없다.
- `cms-lifecycle-schema-cpt-acf-dead-entity-retirement.spec.ts`는 `CmsView`와 `modules/cms` 엔티티의 은퇴를 고정한다. `cms_contents`는 현행 콘텐츠이며 legacy view schema와 같은 데이터가 아니다.
- `public.routes.tsx`와 `legacy-wordpress-block-editor-retirement.spec.ts`는 `/preview/:slug`·`ViewPreview`를 보존한다. `PreviewFrame`은 정의 외 앱 소비처가 없고 CMS V2 관리 route도 제거됐다. 이는 저장소 내 census이며 운영 접근 로그를 조회한 결과가 아니다.
- 기존 retirement CHECK가 API 경로까지 “보존”으로 표시한 것은 구현·등록의 증거가 아니다. 과거 기록은 재작성하지 않는다. `content.routes.tsx`의 entity/테이블 보존 설명은 이후 은퇴 계약과 다르며 범위 밖 문서 drift로 보고한다.

## 후속 판단

- 신규 공개 API를 만들거나 현행 콘텐츠 API에 연결하려면 데이터 모델·공개 가시성·서비스 범위·권한 계약부터 결정해야 한다. 이번 frontend 보완에 포함하지 않는다.
- route를 폐쇄하려면 외부 사용 여부와 보존 계약의 lifecycle 변경을 별도로 판단한다. 이번 작업은 route·권한·API·DB 계약을 변경하지 않는다.

## 검증 결과

- Admin TypeScript 검사 통과.
- Vitest: 19파일, 370테스트 통과(신규 미리보기 15개).
- Chromium: 12개 통과(기존 설정 10개 + CMS desktop/mobile 2개). 최초 실행에서 개발환경 경고 배너와 미리보기 오류의 role이 겹쳐 테스트 선택자가 실패했다. 대상 오류만 선택하도록 수정한 후 전체 재실행이 통과했다.
- API Jest: 기존 WordPress editor 은퇴와 CMS lifecycle/엔티티 은퇴 계약 2파일, 146테스트 통과.
- Admin production Vite build 통과. prebuild의 tracked 버전 파일 변경 없이 직접 Vite를 실행했다.
- 변경 코드 ESLint 오류·경고 0. 문서 민감정보 검사와 diff 공백 검사 통과.
- 실제 CMS View API·운영 데이터·Google 로그인은 검증하지 않았다. 성공 응답은 네트워크 fixture다. Firefox/WebKit은 실행하지 않았다.
- 작업 시작의 fetch는 성공했으나 완료 시 원격 Git 인증과 GitHub API 인증(401 Bad credentials)이 실패했다. 최신 원격 상태·PR·CI 확인은 인증 복구 후 진행해야 한다. main 통합·배포는 수행하지 않았다.
