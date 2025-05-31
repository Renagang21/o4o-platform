
# 🧩 Wireframe 07: 공통 UI 모듈 및 역할 기반 메뉴 구조 설계

## 🎯 목적
yaksa.site 플랫폼 내 모든 서비스에서 일관된 UI/UX 경험을 제공하고, 사용자 역할에 따라 표시되는 메뉴 및 UI 모듈을 구조화한다.

---

## ✅ 공통 UI 컴포넌트 정의

### 1. 상단 헤더 (`<AppHeader />`)
- 로고
- 현재 위치(title)
- 로그인/로그아웃 버튼
- 프로필/알림 아이콘

### 2. 사이드바 또는 메인 메뉴 (`<MainMenu />`)
- 역할 기반 표시 구조 적용
- 반응형 전환 (모바일에서는 햄버거 메뉴)

### 3. 알림 UI (`<NotificationBell />`)
- 벨 아이콘 + 새 알림 뱃지
- 클릭 시 최근 알림 드롭다운

### 4. 공통 카드 (`<ServiceCard />`)
- 아이콘 + 제목 + 설명 포함 진입용 카드

### 5. 모달/다이얼로그 (`<ConfirmDialog />`, `<InputModal />`)
- Tailwind + headlessui 기반

---

## 📋 역할별 메뉴 노출 정의

| 메뉴 항목 | B2C 사용자 | 약사(B2B) | 관리자 |
|-----------|------------|-----------|--------|
| 쇼핑몰 | ✅ `/shop` | ✅ `/yaksa-shop` | ❌ |
| 펀딩 | ✅ | ✅ | ❌ |
| 포럼 | ❌ | ✅ | ❌ |
| 디지털사이니지 | ❌ | ✅ | ✅ |
| 마이페이지 | ✅ | ✅ | ❌ |
| 관리자 대시보드 | ❌ | ❌ | ✅ |
| 사용자 관리 | ❌ | ❌ | ✅ (`superadmin`) |

---

## 🧱 Tailwind 구조 예시 (사이드바 메뉴)

```jsx
const menu = [
  { label: "쇼핑몰", href: "/shop", roles: ["b2c", "yaksa"] },
  { label: "펀딩", href: "/funding", roles: ["b2c", "yaksa"] },
  { label: "포럼", href: "/forum", roles: ["yaksa"] },
  { label: "관리자", href: "/admin", roles: ["admin"] }
];
```

---

## 🧩 확장 고려

- 다국어 미지원 → 제외
- 각 모듈은 Figma MCP 구성으로 추후 export 가능
- Zustand 또는 context 기반 역할 상태 분기

---

## ⏭️ 다음 연결 문서

- `role-permissions.md`: 역할별 기능 접근 권한 정의
- `ui-theme-system.md`: 공통 테마/다크모드 시스템 설계
