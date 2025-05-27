
# 🗂️ yaksa-site 프로젝트 전체 구조 정리 (`o4o-platform/` 기준)

본 문서는 yaksa.site의 실제 프론트엔드 및 서브 서비스 개발을 위한 전체 폴더 구조 및 서비스 단위 개발 가이드를 제공합니다.  
현재 `o4o-platform/` 루트 아래에 있는 `o4o-web-server/`는 혼동을 피하기 위해 **yaksa-site 메인(프론트포털)**로 간주합니다.

---

## ✅ 전체 폴더 구조 (`o4o-platform/` 기준)

```
o4o-platform/
├── yaksa-site/                  # 기존 o4o-web-server/ → yaksa.site 메인 포털
│   ├── scripts/                 # 배포 스크립트 등
│   ├── services/
│   │   ├── ecommerce/
│   │   │   ├── admin/           # 관리자용 화면 (향후 admin.yaksa.site)
│   │   │   ├── api/             # API 핸들러 또는 proxy layer
│   │   │   └── web/             # 메인 커머스 프론트(B2C, B2B)
│   │   └── crowdfunding/        # 크라우드펀딩 프론트엔드
│   ├── forum/                   # 포럼 서비스
│   ├── lms/                     # 강의 시스템
│   ├── signage/                 # 디지털사이니지 디스플레이 앱
│   ├── shared/                 # 공통 유틸, 컴포넌트
│   ├── README.md
│   └── workspace.json
└── ...
```

---

## 🧱 yaksa-site (메인 포털) 구조

```
yaksa-site/
├── public/
├── src/
│   ├── components/          # 공통 UI 컴포넌트
│   ├── pages/               # 홈, 로그인, 서비스 진입 페이지 등
│   ├── routes/              # React Router
│   ├── store/               # Zustand 등 전역 상태
│   ├── index.css            # Tailwind 지시문
│   ├── main.tsx
│   └── app.tsx
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 🛒 services/ecommerce/web 구조

```
services/ecommerce/web/
├── public/
├── src/
│   ├── components/         # 상품카드, 장바구니 등
│   ├── pages/              # Shop, ProductDetail, Cart, Checkout 등
│   ├── store/              # cartStore.ts, authStore.ts 등
│   ├── routes/
│   ├── app.tsx
│   └── main.tsx
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 💳 services/crowdfunding 구조

```
services/crowdfunding/
├── src/
│   ├── components/
│   ├── pages/
│   ├── app.tsx
│   └── main.tsx
├── tsconfig.json
└── vite.config.ts
```

---

## 📚 services/lms 구조

```
services/lms/
├── src/
│   ├── pages/
│   └── player.tsx
└── ...
```

---

## 📡 services/signage 구조

```
services/signage/
├── public/
├── src/
│   └── screens/
└── ...
```

---

## 🧩 확장 관리 전략

- 모든 서비스는 독립 개발 → 독립 배포 가능 구조 유지
- Tailwind, Zustand 등 통일된 기술 스택 사용
- 각 서비스 폴더 내부에 `README.md`, `vite.config.ts`, `tsconfig.json` 별도 유지

---

이 문서를 기반으로 서비스 간 경계와 폴더 정리를 명확히 할 수 있습니다.  
필요하시면 각 서비스 구조별 `task 문서`도 별도 생성 가능합니다.
