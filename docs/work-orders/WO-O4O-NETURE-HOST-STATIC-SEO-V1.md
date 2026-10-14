# Neture 호스트별 정적 SEO

> **상태**: ACTIVE · **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거**: 프론트엔드 디자인 잔여 진행 요청 및 Docker·빌드·배포 인프라 변경에 대한 사용자 명시 승인

## 문제와 범위

기존 Node `serve -s dist`는 네 호스트에 같은 O4O HTML을 반환했다. supplier/funding/community의 서비스 메타는 JavaScript 실행 후에만 반영되었다. 실제 브랜드 자산 없이 OG 이미지를 만들지 않는다.

내부 DOM 독립 데이터로 기존 SEO export와 호스트 origin을 유지한다. Vite 최종 HTML에서 호스트별 홈·SPA fallback 문서를 생성하고 같은 JS/CSS 번들을 참조한다. nginx runner가 세 호스트만 정확히 선택하고 나머지 호스트는 O4O로 처리한다. PORT 기본값은 8080이며 환경변수도 지원한다. 홈 canonical·og:url은 심층 경로에 전달하지 않는다. 경로별 런타임 메타와 호스트 이동/cutover 규칙은 유지한다.

Design Reference: [Design Core](../rules/DESIGN-CORE-GOVERNANCE.md). 기존 화면·공통 UI·인증·권한·DB·의존성 manifest는 변경하지 않는다. 시작 main `334094e7c5`, 전용 branch `wo/neture-host-static-seo`.

## 소비처 영향

| 대상 | 계약 |
|---|---|
| App/SeoWatcher | 기존 SEO export·객체 안정성·공개 경로 canonical 유지 |
| HostBoundary/로그인·내 정보·링크 | 기존 hostProfile export와 routing/cutover 유지 |
| Vite/Docker Neture | 정적 HTML 생성과 Host 기반 선택; 모든 네 호스트가 같은 번들 사용 |
| 다른 서비스/공통 packages | 변경 없음; 내부 데이터 분리에 외부 공통 API 추가 없음 |

## 검증과 종료

Neture 전체 테스트·타입 포함 빌드·변경 파일 lint, 실제 Docker build/run을 확인한다. JS 없는 HTTP로 4호스트 메타·미지 호스트·심층 경로·정적 자산 MIME/캐시/404·HEAD/range/gzip·PORT 변경을 검증한다. Chromium 공개 홈 1440/390/320px에서 CTA·overflow·실제 host 프로필을 검사한다. 로그인/운영 쓰기 smoke는 별도 승인 계정이 필요하다.

CI·Codex gate 이후 정상 PR 병합과 Neture만의 통제 배포를 진행한다. DB migration을 실행하지 않는다. 배포는 기존 verified rollout의 무트래픽 검증→traffic 전환을 따르며 실패 시 기존 revision을 유지한다. 운영 이후 회귀는 기존 정상 revision으로 rollback하거나 이 변경을 정상 revert PR로 되돌린다. 결과는 [CHECK](../checks/CHECK-O4O-NETURE-HOST-STATIC-SEO-V1.md)에 기록한다.
