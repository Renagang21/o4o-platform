
# 🧭 Wireframe 01: yaksa.site 메인 포털 반응형 UI 설계

## 🎯 목적
yaksa.site의 첫 화면(포털)을 반응형으로 설계하여 사용자 유형별로 서비스 진입이 가능한 최신형 레이아웃을 구성한다.

---

## ✅ 페이지 목적

- 다양한 서비스로 연결되는 중앙 게이트웨이
- 사용자 유형별 분리 진입
- 로그인 및 관리자 진입 포함
- 모바일과 데스크탑 모두 대응

---

## 🧱 전체 레이아웃 구성

### 1. 헤더 (고정)
- 로고 (텍스트 또는 로고 아이콘)
- 로그인 버튼 (우측 상단)
- 관리자 진입 버튼 (더보기 메뉴 또는 우측 상단)

### 2. 메인 그리드 영역
- **그리드 구성 (PC 기준):**
  - 3컬럼 카드 UI (Tailwind `grid-cols-3`, `gap-6`)
- **카드 항목 예시:**
  - 쇼핑몰 (일반) → `/shop`
  - 쇼핑몰 (약사용) → `/yaksa-shop`
  - 크라우드펀딩 → `fund.yaksa.site`
  - 약사 포럼 → `forum.yaksa.site`
  - 디지털사이니지 → `signage.yaksa.site`

### 3. 모바일 대응
- Tailwind 기준: `grid-cols-1`, 카드 위→아래 배치
- 카드 항목은 더 크게, 설명은 요약
- 햄버거 메뉴 또는 드롭다운으로 메뉴 접근

---

## 💡 시각적 요소 설계 가이드

- **카드 스타일**
  - soft shadow (`shadow-xl`, `rounded-2xl`)
  - 배경 blur 또는 미묘한 그라디언트
  - hover 시 scale up 애니메이션

- **폰트**
  - 제목: `text-xl` 또는 `text-2xl`, 간결하고 큼직하게
  - 설명: `text-sm` 또는 `text-base`, 부드럽고 간략히

- **컬러 테마**
  - 초기: Light 테마 기준
  - 추후 다크모드 지원 위해 Tailwind `dark:` 구조 설계

---

## 📎 Tailwind 예시 코드 블록 (카드)

```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div className="p-6 rounded-2xl shadow-xl bg-white hover:scale-105 transition-all cursor-pointer">
    <h3 className="text-xl font-semibold mb-2">쇼핑몰 (일반)</h3>
    <p className="text-sm text-gray-600">Yaksa 전용 소비자 쇼핑몰입니다.</p>
  </div>
</div>
```

---

## 📌 확장 시 고려 사항

- 로그인 후 역할에 따라 자동 redirect 또는 카드 강조
- 관리자/약사 등 사용자 구분 스타일 처리
- Figma MCP 설계와 연동 가능

