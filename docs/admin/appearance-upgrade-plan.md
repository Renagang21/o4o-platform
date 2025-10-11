# o4o-platform 관리자 Appearance 모듈 업그레이드 계획

워드프레스 Astra 테마 수준의 사용자 정의 경험을 목표로, 현재 o4o-platform 관리자 `외모(Appearance)` 모듈을 분석하고 단계별 업그레이드 로드맵을 제안한다. 본 문서는 조사·설계 단계 산출물이며 실제 구현 변경은 포함하지 않는다.

## 현재 모듈 구조 개요

### Admin 프론트엔드 (React 19 + TailwindCSS)
- `apps/admin-dashboard/src/pages/appearance/Customize.tsx`: 커스터마이저 진입점. `authClient.api`를 통해 `/settings/customizer`를 불러오고 `SimpleCustomizer`에 전달.
- `apps/admin-dashboard/src/pages/appearance/astra-customizer/SimpleCustomizer.tsx`: Astra 기반 설정 패널 + 미리보기. `CustomizerProvider` 컨텍스트와 `generateCSS`를 이용해 iframe 미리보기 DOM에 CSS 주입.
- `apps/admin-dashboard/src/pages/appearance/astra-customizer` 하위 구조  
  - `components/controls/*`: 컬러픽커, 슬라이더 등 공통 컨트롤  
  - `components/HeaderBuilder.tsx`: 위/중/아래 3열 모듈 드래그 구성  
  - `components/panels/*`: Sticky 헤더·모바일 헤더·General(스크롤 탑/버튼/브레드크럼) 등 패널  
  - `sections/*`: Site Identity, Colors, Typography, Container, Header, Footer, Blog 등 섹션 UI  
  - `types/customizer-types.ts`: 광범위한 설정 스키마(전역 컬러/타이포그래피/레이아웃/헤더·푸터 빌더/블로그 카드 등) 정의  
  - `utils/default-settings.ts`, `utils/css-generator.ts`, `utils/template-parts-converter.ts`: 기본값, CSS 토큰 생성, 템플릿 파트 변환 로직
- `apps/admin-dashboard/src/pages/appearance/TemplateParts*.tsx`: 헤더·푸터·사이드바·일반 템플릿 파트 CRUD + WordPress 블록 에디터 래퍼.
- `apps/admin-dashboard/src/pages/menus/*`: 워드프레스 스타일 메뉴 관리(역할 기반 표시, 드래그 정렬).
- `apps/admin-dashboard/src/api/settings.ts`: 단순 `AppearanceSettings`(테마/primaryColor 등) API 래퍼가 존재하지만 현재 UI에서 사용되지 않음.

### API & 백엔드
- `apps/api-server/src/routes/v1/settings.routes.ts`: `/api/v1/settings/customizer` GET/PUT 엔드포인트. 설정 미존재 시 기본 JSON 반환.
- `apps/api-server/src/services/settingsService.ts`: `settings` 테이블에서 `key='customizer'` 값 직렬화/저장.
- `apps/api-server/src/routes/template-parts.routes.ts` & `entities/TemplatePart.ts`: 템플릿 파트 영역 관리, 조건부 노출, JSON 블록 구조 저장.
- `apps/api-server/src/services/ThemeService.ts` & `controllers/ThemeController.ts`: 테마 설치/활성/커스터마이즈 서비스. 관리자 UI 라우트(`/themes`)는 준비 중으로 보이며 실제 연결 미흡.
- `apps/api-server/src/config/appearance.constants.ts`: 테마 업로드/디렉토리 정책.

### 프론트엔드 런타임(메인 사이트)
- `apps/main-site/src/hooks/useCustomizerSettings.ts`: `/settings/customizer` 호출 후 컨테이너 폭/패딩 등 반응형 값 적용, 5분 캐시.
- `apps/main-site/src/hooks/useTemplateParts.ts`: 활성 템플릿 파트를 영역별 로드해 렌더링.

## 주요 UI 설정 구조

| 범주 | 핵심 옵션 | 구현 위치 |
| --- | --- | --- |
| 테마 선택 | 기본 라이트/다크/시스템(`AppearanceSettings`)이 정의되어 있으나 UI 연결 미구현 | `apps/admin-dashboard/src/api/settings.ts` |
| 사이트 아이덴티티 | 로고(데스크톱/모바일/반응형 폭), 사이트 제목·태그라인 색상/타이포그래피 | `sections/global/SiteIdentitySection.tsx` |
| 전역 색상 | 기본/보조/텍스트/링크(hover 포함), 바디/콘텐츠 배경, 팔레트 추가·편집 | `sections/global/ColorsSection.tsx` |
| 전역 타이포그래피 | 본문·버튼·H1~H6 폰트 패밀리/사이즈/줄간격/대소문자 변환(반응형 지원) | `sections/global/TypographySection.tsx` |
| 컨테이너 & 간격 | 박스/풀/플루이드, 디바이스별 width/padding/margin | `sections/layout/ContainerSection.tsx` |
| 헤더 빌더 | Above/Primary/Below 3단, 모듈 추가(로고, 메뉴, 검색, 계정, 카트 등), Sticky/Mobile 패널 | `components/HeaderBuilder.tsx`, `sections/header/HeaderLayoutSection.tsx` |
| 푸터 빌더 | 위젯/바 영역, 컬럼 수, 색상, 패딩, 위젯 타입(텍스트/메뉴/소셜 등) | `sections/footer/FooterSection.tsx` |
| 블로그 레이아웃 | 카드 레이아웃, 썸네일 비율, 메타·페이징·정렬 옵션 | `sections/blog/BlogSection.tsx` |
| 부가 기능(숨김 상태) | Scroll-to-top, 버튼 스타일, 브레드크럼 설정 패널 존재하나 UI에서 진입 비활성화 | `components/panels/GeneralPanel.tsx` |
| 실시간 미리보기 | iframe(`previewUrl`)에 CSS 변수/미디어쿼리 주입, publish 시 템플릿 파트 변환 후 API 업sert | `SimpleCustomizer.tsx`, `utils/css-generator.ts`, `utils/template-parts-converter.ts` |

## Astra 테마 대비 비교

| 항목 | Astra (WordPress) | o4o 현재 | 차이/메모 |
| --- | --- | --- | --- |
| Global Settings (색상·타이포·간격) | Customizer Global 패널 + `theme.json` 연동, Buttons/Breadcrumbs/Scroll-to-top까지 노출 | Colors, Typography, Container 구현. Buttons/Scroll-to-top 컴포넌트는 존재하나 UI 비노출. `theme.json` 미사용 | 전역 토큰 체계 미정립, 일부 기능 데드 코드 |
| Layout System (컨테이너/헤더/푸터/사이드바) | Header/Footer Builder 3열+모듈, 컨테이너·사이드바·개별 페이지 레벨 옵션, WooCommerce/Blog 등 세분화 | Header/Footer Builder, 컨테이너, Sidebar 설정 타입 정의. 페이지/포스트 레벨 덮어쓰기·WooCommerce 세팅 부재 | 레이아웃 조건·템플릿 매핑, 디바이스별 제어 부족 |
| Customizer / theme.json 구조 | WP Customizer API + `theme.json` 글로벌 스타일. 프리셋/Export/Child theme 지원 | 커스텀 React 컨텍스트 + REST `/settings/customizer` JSON 저장. 프리셋·버전 관리 없음 | 스키마/마이그레이션/버전 관리 체계 필요 |
| React 기반 미리보기·설정 연동 | WP Customizer `postMessage` + 부분 새로고침, Site Editor(React)와 공유 자원 | iframe에 CSS 주입, publish 시 템플릿 파트 변환 후 REST 호출. 컴포넌트 레벨 미리보기/양방향 데이터 없음 | 미리보기와 설정 상태 동기화 제한적, Selective refresh 미지원 |

## Astra 대비 강점과 한계

**강점**
- React 19 + Tailwind 기반 SPA로 관리자 UX 일관성 확보 (`apps/admin-dashboard/src/App.tsx`).
- Header/Footer Builder, Mobile Header, Sticky 옵션 등 Astra의 핵심 빌더 개념을 이미 포용.
- 템플릿 파트가 WordPress 블록 구조를 따르므로 향후 블록 에디터/Pattern 재활용 가능.
- Medusa 등 외부 서비스와 REST 연동을 고려한 `authClient` 추상화로 멀티테넌트 확장 여지.

**한계**
- 커스터마이저 저장 스키마는 방대하지만 실제 노출 섹션이 제한적이며 Dead code 존재(`GeneralSection` 미노출 등).
- iframe CSS 주입 방식으로 인해 컴포넌트 단위 Previews, 데이터 바인딩, 접근성 검사 등 고급 기능 구현이 어렵다.
- 전역 스타일 토큰/버전 관리/프리셋 export 부재로 테마 교체나 멀티 사이트에 취약.
- 테마 설치/활성 API는 존재하지만 관리자 UI가 연결되지 않아 실제 테마 선택 경험이 미완성.
- i18n을 위한 메시지/리소스 분리 미진행(현 단계 요구사항에서 예약 상태이나 대비 필요).

## 단계별 업그레이드 제안

### Phase 1 — 전역 스타일 토큰 & 데이터 계층 정비
1. **Global Style Manager 도입**  
   - `AstraCustomizerSettings`를 `globalTokens`(색상/타이포/간격/섀도 등)와 `componentVariants`로 분리.  
   - `/settings/customizer` 스키마 버전을 `_meta.version`으로 관리하고 마이그레이션 유틸 추가.
2. **Medusa 연동 설계**  
   - 테넌트별 테마 설정 저장을 위해 Medusa Admin API에 `theme_settings`(JSONB) 컬렉션 정의.  
   - 기존 settings 테이블과 동기화 Job 또는 Adapter를 마련해 점진적 이전.
3. **UI 재구성**  
   - 전역 패널(Colors/Typography/Buttons/Breadcrumbs/Spacing) 재정렬, 숨겨진 General 섹션 활성화.  
   - Tailwind Design Token(`config/theme.ts`)과 연결하여 관리자 UI와 실시간 미리보기 색/폰트 일관성 확보.

### Phase 2 — 레이아웃 빌더 확장 & 실시간 미리보기 고도화
1. **Header/Footer Builder 업그레이드**  
   - 모듈 속성 편집(예: 메뉴 선택, 버튼 스타일) 패널 추가, Drag-and-drop 성능 개선.  
   - 디바이스별 행/열 가시성 제어 및 Preview Toggle 도입.
2. **Template Part & Layout Mapping**  
   - `TemplatePart.conditions`에 페이지 템플릿/메뉴 위치/세션 상태 등 추가 조건 정의.  
   - 페이지/포스트 상세 화면에서 템플릿 파트 지정 UI 제공(페이지 관리 가이드 준수).
3. **React Live Preview 브리지**  
   - iframe을 유지하되 `postMessage` 프로토콜을 표준화 → 미리보기 앱에 React bridge 스크립트 주입.  
   - 장기적으로 main-site에 "Customizer Preview Mode" React 엔트리포인트를 추가해 상태 동기화 향상.

### Phase 3 — Theme Preset & Marketplace 통합
1. **Theme Preset System**  
   - `customizerPresets` API (`GET/POST /settings/customizer/presets`) 정의, export/import(파일 or JSON).  
   - 기본 제공 Preset(Astra Default, Minimal, Dark 등)과 사용자 저장 프리셋 UI 제공.
2. **Theme Activation UI**  
   - `/appearance/themes` 라우트 구현: Theme 목록, 미리보기, 활성화, Medusa 연계 결제(프리미엄) 훅.  
   - 활성화 시 Customizer preset 자동 로드, 템플릿 파트 세트 배포.
3. **Backup & Versioning**  
   - 저장 시 diff/버전 기록(예: `customizer_revisions` 테이블)으로 롤백 지원.  
   - 테마/프리셋 전환 시 호환성 검사(필수 모듈 누락 등) 수행.

### Phase 4 — 운영/미래 확장 고려
1. **i18n 준비**: 설정 라벨/설명 문자열을 `@o4o/i18n` 리소스로 분리하고 locale fallback 구조만 구성(다국어 실제 번역은 후속).  
2. **테스트 & 품질**: Vitest 기반 단위 테스트(설정 → CSS 변환), Playwright E2E(미리보기·템플릿 파트 CRUD) 추가.  
3. **Observability**: 저장/게시/테마 변경 이벤트에 Audit 로그(Webhook, Activity Feed) 연동.

## 구현 고려사항 및 다음 단계
- **마이그레이션 전략**: 기존 `settings` 테이블 JSON을 버전 태깅 후 단계적 스키마 변환.  
- **성능**: CSS 생성 시 모듈 단위 코드 분리 및 캐싱(`generateCSS` 메모이제이션)으로 iframe 주입 최적화.  
- **보안**: 템플릿 파트 HTML/스크립트 sanitizer 강화(현재 JSON 파싱 실패 시 빈 배열 처리).  
- **백엔드 연동**: ThemeService가 사용하는 파일 시스템 경로(`config/appearance.constants.ts`)를 클라우드 스토리지(S3 등)와 추상화.  
- **협업 사전 준비**: 디자인 토큰 정의, 프리셋 JSON 스키마, Medusa 확장 스펙을 우선 문서화하여 개발 착수 이전 합의.

위 단계를 통해 Astra 수준의 풍부한 커스터마이징 기능을 React 기반 SPA 환경에 맞게 재설계할 수 있다. Phase 1~2를 선행 MVP로 삼고, 이후 Preset/Marketplace 통합과 멀티테넌트 확장을 순차 추진하는 것을 권장한다.

