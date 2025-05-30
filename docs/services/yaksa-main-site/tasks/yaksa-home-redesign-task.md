# 🛠️ 작업 요청: yaksa.site 초기화면(Home.tsx) 리디자인

## 📅 요청일자
2025-05-28

## 📁 저장 위치
`o4o-platform/services/yaksa-main-site/src/page/Home.tsx

## 🎯 작업 목적
yaksa.site 초기화면(`Home.tsx`)을 미려한 전자상거래 플랫폼 스타일로 리디자인합니다. 현재는 단순한 3개 버튼 UI로 되어 있으나, 브랜드 첫 인상으로써 전문성과 신뢰감을 주는 디자인이 필요합니다.

## 🧩 디자인 요구사항

### ✅ 리디자인 목표
- TailwindCSS 기반 현대적인 스타일
- 히어로 섹션 + 서비스 카드 + 콜 투 액션 구조
- 전자상거래 서비스 첫 화면에 어울리는 전문성
- 반응형(모바일/데스크탑 모두 고려)
- 다크 모드 지원 유지

### 📐 레이아웃 구성
1. **Hero Section**
   - 플랫폼의 핵심 메시지를 전달
   - 약사와 소비자를 연결하는 전문 이미지
2. **Service Features (카드 3개)**
   - 약사 등록 / 제품 등록 / 커뮤니티
   - 기존 `ServiceCard` 컴포넌트 활용 가능
3. **Call to Action**
   - 로그인, 회원가입, 둘러보기 등 버튼
   - 홈 하단에 위치

## 🗂️ 컴포넌트 활용
- 기존의 `ServiceCard.tsx`는 유지 가능
- 아이콘은 `lucide-react` 그대로 사용
- 추가적인 시각적 요소는 Tailwind utility로 구성

## 🛠️ 구현 방식
- 기존 `Home.tsx`를 덮어쓰는 방식
- 별도 상태 관리, API 연동 없이 정적 콘텐츠 위주로 구성

## 📄 작업 파일 대상
`src/pages/Home.tsx`

## 🧑‍💻 작업자 참고
- 추후에는 CMS 연동(Tiptap 등)을 통해 이 영역을 유동적으로 관리할 예정입니다.
- 현재는 하드코딩 방식으로 정적인 구조만 우선 구현합니다.

