# 협동조합 포럼 분리·화면 배치 검증

> **상태**: COMPLETED · **작성일**: 2026-10-21
> **범위**: 개발 및 로컬 검증. [TODO](../work-orders/TODO-O4O-COOPERATIVE-FORUM-LAYOUT-V1.md), [설계](../design/DESIGN-O4O-COOPERATIVE-FORUM-LAYOUT-V1.md)
> **기준 main**: `5c6150a6b0` · **작업 branch**: `wo/cooperative-forum-layout`

## 결과

| 검증 | 결과 |
|---|---|
| frozen/offline 의존성 설치 및 `pnpm run build:packages` | 통과. 의존성·lockfile 수정 없음 |
| `pnpm exec vitest run --config services/web-pharmacy-coop/vitest.config.mjs` | 10개 파일, 72개 테스트 통과 |
| `pnpm --filter @o4o/web-pharmacy-coop build` | TypeScript 검사 및 Vite production build 통과 |
| 변경 TS/TSX 대상 ESLint | 통과 |
| 변경 문서 민감정보 검사 및 `git diff --check` | 통과 |
| Chromium desktop 1280px / mobile 390px | 아래 5개 역할 × 2개 폭, 10개 시나리오 통과 |

브라우저는 합성 API 응답을 가로채 실제 웹 앱을 실행했다. 실제 계정·운영 API 저장·DB 변경은 수행하지 않았다. 브라우저 검증용 데이터는 메모리 fixture이며 운영 데이터 정리가 필요한 항목을 생성하지 않았다. 운영 배포·실계정 API 통합 검증을 대체하지 않는다.

- 개인 조합원: 홈의 공식 자료·최근 이야기, 공식 자료 직접 본문, 일반 포럼 작성·본문 조회, 게시판 개설 도구 미노출.
- 조합 admin: 운영 개요의 업무 요청 미발생, 회원/게시판/콘텐츠/공급/설정 전환, 게시판 개설 요청, admin 설정 표시.
- 조합 operator: 회원/게시판/콘텐츠/공급 업무 표시, admin 설정 메뉴 미노출 및 직접 URL 차단.
- 연합회 admin: 산하 조합 심사와 연합회 operator 관리 분리, 개별 조합 운영 접근 차단.
- 미가입자: 홈에서 회원 전용 콘텐츠 API 요청 없음, 운영 진입 미노출.

모든 브라우저 시나리오에서 pageerror 0건, 문서 전체 가로 넘침 0건을 확인했다. desktop/mobile 홈·운영 스크린샷을 확인하여 큰 Hero가 업무 본문을 밀어내는 문제를 정비했다. Hero는 홈에 보존하고 내부 화면은 간결한 조합 제목을 사용한다.

단위 테스트는 기존 콘텐츠 작성·편집 URL, `?tab=contents` 호환, 선택 업무만 연결, 현재 메뉴 표시, 직접 공식 자료 상세, hidden/제품 제외, 실패 재조회, 본문 정제와 기존 조합 권한 회귀를 검증한다. 기존 Hero 편집 API 권한 테스트도 유지했다.

## 잔여 및 인계

- 기존 API가 반환하는 최대 60개 진열 항목의 content만 공식 목록에 표시한다. 별도 공지 분류·고정·자료 검색·전체 아카이브 API는 추가하지 않았다.
- 일반 포럼 댓글·수정·삭제·중재 UI는 후속 개발 범위다. 현재 운영 메뉴는 게시판 목록·개설을 연결한다.
- production build의 Browserslist 데이터 연령 및 큰 chunk 경고는 남는다. 의존성이나 공통 번들 정책을 이번 범위에서 변경하지 않았다.
- 개발 완료 조건은 작업 branch push 및 HEAD 인계다. PR 생성·병합·배포·운영 DB/IAM 변경은 실행하지 않는다. PR CI는 이 로컬 검증 결과와 별개다.
- 문서 정합: 새 화면 트리·TODO·README를 실제 구현 범위와 연결했다. 과거 완료 기록과 전체 플랫폼 정본은 수정하지 않았다.

## main 통합·배포 착수 — 2026-10-23

사용자의 `Main 으로 병합,배포` 지시로 PR·검토·main 병합·배포·검증을 이어간다. 최신 main `cbee447f32`를 기존 작업 브랜치에 통합하며 조합 문의·운영 업무함·문의 알림·공개 약관/법적 고지·가입 정책 동의·일반 포럼 초안 검토 기능을 보존했다. 운영 메뉴에는 문의함 진입을 유지한다. 신규 migration·계정/역할 등록·운영 데이터 직접 변경은 추가하지 않는다.
