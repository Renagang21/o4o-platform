# O4O 서비스별 파비콘·로고 적용

> **상태**: COMPLETED
> **작성일**: 2026-11-05 · **최종 갱신**: 2026-11-05
> **근거**: 사용자 승인 — O4O 공통 마크에 서비스 기호 추가, SVG 제작·적용·배포

## 디자인 결정과 범위

- **대표 홈의 기존 초록색 N 파비콘은 그대로 유지**한다(사용자 최종 선택). `web-neture/public/favicon.svg`와 PNG의 원본 해시를 검사한다.
- 서비스 파생형은 기존 `packages/auth-react/src/assets/o4o-logo.svg`의 O4O 윤곽과 파란색 `#0073aa → #005177`을 사용한다. 원본 파일은 수정하지 않는다.
- 색상으로 서비스를 나누지 않고 동일한 배지 위치에 서비스 기호를 넣는다. 큰 마크에서 O4O와 배지가 겹치지 않으며, 16px은 기호를 키운 compact 표현을 사용한다. 병원은 작은 크기에서 H로 단순화한다.
- SVG favicon/마크는 글꼴·외부 리소스 없이 렌더링된다. 가로형 SVG는 같은 마크와 서비스명 텍스트를 포함한다.
- 분회 자체 로고와 매장 자체 로고, 서비스명·회원·권한·메뉴·이동 경로는 보존한다. 공통 분회 fallback 마크만 교체한다.
- O4O 대표 홈과 서비스 화면 사이의 SPA 이동 시 favicon을 갱신·복원한다. 공급자/펀딩/커뮤니티/CarePharm 호스트는 각 서비스 기호를 유지한다.
- 약국 앱의 pharmacy/CarePharm/Drugstore는 호스트·기존 설정에 맞는 파비콘 및 PWA manifest를 선택한다. 기존 서비스 식별·권한 판정은 바꾸지 않는다.

## 파일 규격과 재생성

각 앱의 `public/brand/<service>/`:

- `logo-mark.svg`, `logo-horizontal.svg`, `favicon.svg`
- `favicon.ico`(16·32·48px PNG 엔트리)
- `icon-16/32/48/192/512.png`, `apple-touch-icon.png`(180px)
- `icon-maskable-512.png`(safe zone 내부 여백), `manifest.webmanifest`

```sh
source /workspace/.o4o-tools/activate-node22.sh  # 이 클라우드의 도구 활성화; PC는 SETUP 기준
node scripts/brand/generate-service-icons.mjs
node --test scripts/brand/__tests__/service-icons.test.mjs
```

생성은 저장소의 기존 Sharp를 사용하고 dependency/lockfile을 변경하지 않는다. 기존 대표 홈 N과 O4O 원본은 생성기가 덮어쓰지 않는다.
KPA의 `/kpa/` base는 유지하며 HTML/컴포넌트의 로컬 마크 경로는 Vite BASE_URL을 따른다. 새 경로 `brand/<service>/`를 사용해 기존 favicon 캐시와 구분한다.

## Shared Module Change Verification

공통 변경: `packages/ui/src/layout/GlobalHeader.tsx`의 선택적 `brand.logoSrc` 표시.
기존 icon 입력은 계속 지원한다. logoSrc 지정 시 공통 배경/그림자만 제거하고 기존 브랜드 링크·텍스트·계정/모바일 메뉴를 보존한다.

| 소비처 | 변경 영향 | 검증 |
|---|---|---|
| 관리자 | favicon, sidebar 및 로그인 마크 | build·type-check, anonymous PC/mobile browser |
| Neture / 공급자 / 펀딩 / 커뮤니티 / CarePharm | 공통 헤더·로그인·호스트/경로 favicon | build·type-check, SPA 복원 테스트, PC/mobile browser |
| 약국 / Drugstore / CarePharm 약국 앱 | 공통 헤더·로그인·PWA | build·type-check, 기존 브랜드/협업체 테스트, PC/mobile browser |
| 강의 / 파트너 / 매장 / 병원약국 | favicon 및 대표 헤더·로그인 | build, PC/mobile browser |
| 약사회 분회 | directory 및 자체 로고 없는 분회 fallback | build, directory regression, PC/mobile browser; 자체 로고 우선 유지 |
| 협동조합 | favicon·공통 헤더·로그인 | build, anonymous PC/mobile browser; 데이터 변경 없는 frontend-only 배포 경로 |
| 계정센터 | 준비된 favicon·마크 | build, anonymous PC/mobile browser; 현재 정상 Delivery registry에 별도 운영 배포 대상 없음, 새 인프라는 만들지 않음 |

route/role/capability/visibility 정책 변경 없음. 로그인·실계정 기능은 이번 시각 변경 검증 대상이 아니며 운영 데이터는 만들지 않는다.
퇴역 서비스는 재생성하지 않는다. 브라우저 검증은 외부 API를 익명 fixture로 차단한 production bundle이며 실제 로그인/업무 검증을 의미하지 않는다.

## 검증 및 배포 증거

로컬: 공통 패키지 전체 build, UI/Admin/Neture/약국 type-check, 10개 프런트 Vite production build,
서비스 자산 규격·원본 보존 검사 및 브랜드/SPA 회귀 검사. Chromium에서 16개 서비스/경로를 PC1280·모바일390 두 viewport로 확인한다.
파일 decode, JS 오류, 가로 넘침을 확인하고 결과와 화면을 `/workspace/scratch/service-brand-icons/`에 보존한다.
운영 CI·리뷰·병합·배포와 실제 serving SHA 증거는 통합 PR 종료 기록에 추가한다. 이 문서의 완료 상태는 자산 제작·로컬 검증 기록이며 배포 성공의 대체 증거가 아니다.

문서 정합: 과거 약국의 미제작 브랜드 slot 설명을 승인된 실제 asset 경로로 갱신했다. 과거 기록은 수정하지 않았다.
