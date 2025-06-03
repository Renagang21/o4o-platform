
# 🧾 Task 00: yaksa.site 메인 포털 UI 구현 시작

## 🎯 목적
yaksa.site 포털의 메인화면을 시작으로 전체 사용자 진입 흐름과 서비스 분기를 위한 UI 개발을 개시한다.

> ⚠️ 이 Task 문서는 전체 구조를 설명하지만, **우선은 `/src/pages/Home.tsx`에 메인 포털 UI 구성부터 구현**하는 데 집중해주세요.

---

## ✅ 작업 위치 및 구조

### 📁 작업 경로
`Coding/o4o-platform/o4o-web-server/`

### 🧱 개발 환경
- React + TailwindCSS 기반 SPA
- 반응형 (모바일/PC 대응)
- 컴포넌트: `src/components/`, 페이지: `src/pages/`

---

## 📦 메인 포털 UI 요구사항 (`/`)

- 상단(Header):
  - 로고
  - 로그인 버튼
  - 관리자 진입 버튼

- 메인 블록 (카드 형태 진입):
  - 쇼핑몰 (일반) → `/shop`
  - 쇼핑몰 (약사) → `/yaksa-shop`
  - 포럼 → `/forum`
  - 펀딩 → `/funding`
  - 디지털사이니지 → `/signage`

- 하단(Footer):
  - 회사정보, 약관, 개인정보처리방침

- 반응형 Tailwind 레이아웃 사용
  - PC: 3단 그리드
  - 모바일: 세로 스택

---

## 🧩 컴포넌트 (함께 만들면 좋음)

- `<ServiceCard />`: 각 서비스 진입용 카드
- `<AppHeader />`: 로고, 로그인 버튼 포함
- `<ThemeToggle />`: 다크모드 토글 버튼 (옵션)

---

## 🔐 인증 관련 (지금은 제외)

- 로그인 버튼은 현재는 라우터 이동용 dummy로 처리
- 추후 Task-02에서 통합 인증 연동 구현 예정

---

## 🗂️ 참고 문서

- `docs/yaksa-site/wireframes/01-home-responsive-wireframe.md`
- `docs/yaksa-site/wireframes/07-common-ui-and-menu-structure.md`

---

## ⏭️ 이후 연결 Task

- Task-01: 로그인/회원가입 UI
- Task-02: ProtectedRoute 및 역할 분기 구조
- Task-03: 인증 서버 연동 (`auth.yaksa.site`)
