# O4O 서비스 공통 UI·UX 정비 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-29
> **근거**: 사용자 UI·UX 표준화·서비스 확장·슬라이드 Hero 운영 책임 지시 및 main 통합 전까지 개발 지시
> **기준 HEAD**: 75f798ef24a66545b233c63d26ba9fdbb89cc499
> **완료 경계**: 전용 branch의 구현·검증·PR·필수 CI·리뷰까지. main 병합·auto-merge·배포·운영 DB 변경 제외.

## 1. 사용자 요구

- 하나의 계정으로 복수 서비스·업무공간을 오간다. 약국 경영자·공급자·파트너의 겸업을 단일 역할로 축소하지 않는다.
- 상단의 일관된 서비스·공간 전환, My Home 직접 진입, 권한 있는 내 매장 진입을 제공한다.
- 공개 서비스 메뉴·업무 메뉴·계정 메뉴의 책임과 위치를 구분한다. 공통 헤더·푸터·반응형 규칙을 정렬한다.
- 향후 분회·구인구직·부동산 등 서비스 증가를 카탈로그·검색으로 수용한다. 미제공 서비스를 운영 중으로 표시하지 않는다.
- 여러 장의 슬라이드 Hero는 주요 홍보 통로다. 각 서비스 운영자가 디자인·내용·채택·노출을 책임진다.
- 기존 가입·승인·조직·서버 권한·세션 이동 계약, 독립 사업과 퇴역 계약을 유지한다.

## 2. 선행 TODO — 코드·문서 대조 후 보완

- [x] 최신 main 기준 서비스·직접/간접 소비처·라우트·메뉴·인증 이동 모집단 재산출
- [x] 역할 업무공간 V1/V2, My Home, 공개 탐색, Header, Design Core, Shared Module 정본 대조
- [x] Hero·홍보 편집·기간·권한·측정 기존 구현 조사; 재사용/부족/별도 결정 구분
- [x] 실제 제공 상태와 문서 과거 완료 서술의 차이 기록 및 관련 기준 보완
- [x] PC·모바일 화면 계약, 접근·오류·복수 역할·조직 전환 검증 기준 확정

## 3. 구현 TODO — 조사 결과로 범위 구체화

- [x] 공통 서비스·공간 전환과 계정별 즐겨찾기/최근 이용 연결
- [x] 헤더·계정·공개 메뉴·업무 메뉴의 일관된 배치 및 공통 푸터 규칙
- [x] 기존 운영 원장을 사용하는 슬라이드 Hero 개선·운영 안내·접근성
- [x] 대표 홈·커뮤니티·강의·내 매장 적용 및 직접/간접 소비처 회귀
- [x] Neture 공통 호스트(공급자·펀딩·CarePharm)와 약국·분회 전환 진입 연결 및 공통 Hero 소비처 검증
- [ ] 후속 4단계: Partner·독립 협업체의 자체 shell 전체 이관(§6 범위에 따라 이번 PR 제외)
- [x] 서비스 확장 계약: 미제공 구인구직·부동산의 가짜 링크/가입/권한을 생성하지 않음

## 4. 검증·인계 TODO

- [x] 서비스 전환·실패·계정 변경·복수 역할·복수 조직·인증 복원 테스트
- [x] Hero 여러 장·자동/수동·정지·키보드·모바일·감소 모션 테스트
- [x] 소비처별 typecheck/build와 desktop/mobile browser smoke
- [x] 공유 모듈 Consumer Impact Matrix 및 기존 route/role/capability 회귀
- [x] 문서 정합·민감정보 검사·tracked/untracked 변경 범위 확인
- [ ] 자체 diff 검토·리뷰 지적 보완·commit/push·PR·현재 HEAD 필수 CI 확인

## 5. 현 시점

초기 TODO 작성 후 최신 main에서 아래 대조를 수행했다. 구현·로컬 검증·원격 CI·운영 적용 상태를 구분한다.


## 6. 코드·문서 대조와 보완한 실행 범위

| 요구 | 실제 코드·문서 근거 | 이번 보완 |
|---|---|---|
| 공통 전환 | auth-react의 MyHomeButton·serviceHandoff, Neture home-entry, /auth/services·accessible-stores | 기존 서버 판정과 세션 교환을 사용한 공통 패널. 검색·내 업무공간·이용 서비스·상태·계정별 브라우저 즐겨찾기/최근 이동 |
| 확장 가능한 발견 | ServiceDiscovery에 공개 서비스 12항목과 5분류가 지역 상수로 존재 | 공개 디렉터리를 공통 presentation metadata로 추출하고 대표 홈·전환기가 재사용. 구인구직/부동산의 가짜 링크는 만들지 않음 |
| Hero | HomePresentation의 다중 슬라이드·초안/게시·기간·순서·동시 수정 보호는 이미 구현됨 | 원장/API/권한을 재사용. 8초 자동 넘김·정지·hover/focus/백그라운드 정지·수동 조작 후 정지·감소 모션·광고주 표시 보완 |
| Hero 광고 | 기존 parseHomePresentation은 Hero advertisement 금지, 편집기도 홍보 영역에만 종류 선택 제공 | 이번 사용자 지시로 Hero에서도 운영자 채택 광고 허용. 광고주 필수와 안전 URL·기간·service scope 유지 |
| 공통 chrome | Neture/KPA GlobalHeader, lecture/store 자체 header, Partner/협동조합/분회 자체 shell | GlobalHeader와 lecture/store 공개 nav를 일관된 별도 줄의 왼쪽 정렬로 배치. 기존 My Home·매장 권한·알림·업무 메뉴 보존 |
| footer | PublicLegalFooterInfo는 공유하나 외형은 각 앱에서 구현 | 공통 ServiceFooter를 Neture·강의·내 매장에 적용. 정책 링크와 법정정보 출처 유지 |
| 정책 최신화 | Global Header 문서의 완료 서술은 이전 4/5서비스 기준, 실제 독립 앱까지 전부 적용된 상태 아님 | 해당 역사적 범위와 이번 보완 범위 명시. 퇴역 서비스를 복구하지 않음 |
| Partner | 새 앱·partner-support 카탈로그 존재, 대표 홈 정책은 여전히 준비 중 안내 | 운영 제공 여부를 추측하지 않음. 기존 안내 목적지 유지. 사업 자격·가입 판정 변경 없음 |

### 단계와 경계

- 이번 PR: 앞서 제안한 1~3단계(명세·공통 기반·대표 서비스 적용)와 기존 공통 소비처의 회귀. 전환기는 Neture 다중 호스트·강의·내 매장·약국 협력사업·분회에 연결한다.
- 후속 4단계: Partner/협동조합/독립 사업의 고유 shell까지 전체 교체, 각 사업의 책임·세션·법정정보 확인 후 적용한다. 공통 Hero를 이미 쓰는 분회·협동조합·사업 홈은 이번 개선을 함께 받는다.
- 후속 5단계: 실제 출시되는 구인구직·부동산은 공개 제공 상태·목적지·서버 서비스 식별을 확인한 뒤 등록한다. 기존 분회는 신규 가짜 서비스로 추가하지 않는다.
- 기존 Hero 원장은 최대 3개 슬라이드와 최대 3개 홍보 항목을 지원한다. 더 많은 항목·모바일 전용 이미지 필드는 이번에 새 계약으로 만들지 않는다.
- 운영자가 소재를 전달받아 기존 편집기에서 초안을 작성·미리보기·채택·게시·예약한다. 별도 공급자 제출/승인 큐와 과금·타기팅은 기존에 없으므로 새 원장을 만들지 않는다.
- 광고 노출/클릭 집계는 신뢰할 수 있는 기존 수집 경로가 확인되지 않았다. 가짜 통계를 표시하지 않으며 측정 목적·보존·중복 집계 기준을 정한 후 별도 개발한다.
- 인증/RBAC Core·Frozen 운영자/Admin dashboard API·역할·membership·DB schema·CI/배포 인프라는 변경하지 않는다. 이번 공개 presentation export 추가와 기존 HomePresentation 검증의 광고 허용은 승인된 UI 범위다.
- 서비스 전환기 즐겨찾기는 브라우저의 계정별 탐색 목록이며 기존 My Home의 세부 업무 즐겨찾기를 덮어쓰지 않는다. 기기 간 동기화는 제공하지 않는다.
- 기본 역할에 따른 강제 이동을 만들지 않는다. 깊은 링크와 사용자의 원래 목적지를 유지한다. 매장 여러 개는 기존 선택 화면에서 고른다.

## 7. Consumer Impact Matrix

| 소비처 | 직접/간접 영향 | 검증 계획 |
|---|---|---|
| Neture 대표 홈·My Home·커뮤니티·공급자·펀딩·CarePharm | 전환기·디렉터리·GlobalHeader·Footer 및 Hero | 기존 전체 Vitest·build·PC/모바일 smoke |
| 강의 | 전환기·header/footer·Hero | 기존 Vitest·build·PC/모바일 smoke |
| 내 매장 | 전환기·header/footer, 조직 선택·기존 업무 유지 | 기존 Vitest·build·복수 매장 합성 검증 |
| 약국 협력사업 웹 | 헤더 전환기·Hero·공유 CSS | 기존 Vitest·build |
| 분회 | 두 헤더 전환기·Hero·공유 CSS | 기존 Vitest·build |
| 협동조합 | 공통 HomeHeroView/편집기 간접 소비 | 기존 Vitest·build |
| Partner·병원 도구·계정 앱 | auth-react presentation barrel/CSS 간접 영향, 자체 shell 미교체 | 기존 test/typecheck/build 중 실제 소비 범위 확인 |
| Admin·Operator·API | HomePresentationEditor/type parser 간접 소비; 권한·대시보드 계약 불변 | 관련 UI/type/API 테스트와 필요한 typecheck |
| 퇴역 K-Cosmetics·PharmacyHub | runtime 재도입 없음 | 디렉터리·라우트에 재등록하지 않았는지 검사 |

## 8. 검증 결과와 인계

로컬 구현·검증 결과는 [CHECK](../checks/CHECK-O4O-CROSS-SERVICE-UI-UX-STANDARDIZATION-V1.md)에 기록했다. 중복 재실행을 제외한 자동 테스트 3,380개, 8개 PC/모바일 합성 브라우저 조합, 여섯 앱 build와 간접 소비처 typecheck가 통과했다. 실제 계정 파일은 없어 실계정 검증은 하지 않았다. API의 CONNECT 403으로 PR 생성·필수 CI·원격 리뷰는 차단되어 있으며 main 병합 준비 완료로 판정하지 않는다. main 통합·auto-merge·배포는 이 작업에서 하지 않는다.


### 자체 검토에서 보완한 점

- 모바일 강의 브랜드가 세로로 줄바꿈되던 배치를 고치고 실제 Chromium에서 확인했다.
- 여러 줄 헤더와 기존 64px drawer offset의 충돌을 발견해 실제 측정 높이를 공유했다. 높이 갱신/이전 값 복원 단위 테스트와 브라우저 CSS 변수 검증을 추가했다.
- `@o4o/ui`는 dist 소비이므로 소스 변경 후 다시 빌드하고 여섯 앱 bundle을 재검증했다. source 테스트만 통과하고 오래된 dist를 검증하지 않도록 했다.
- 공급자 업무는 공개 소개 대신 기존 `/supplier/dashboard`, 복수 매장은 `/select-store`로 전달하고 `returnTo`까지 확인한다.
- 운영자 편집 preview는 자동 넘김을 끄며, 예약·광고주·URL·service scope·동시 수정 계약은 유지한다.
