
# 🧱 Task 00: o4o-web-server 초기 폴더 및 기본 파일 생성

## 📌 목적
전자상거래 프론트엔드 개발을 시작하기 위해 `o4o-platform/services/ecommerce/web/` 아래에 필요한 디렉터리 및 기본 템플릿 파일들을 생성한다.

---

## 📂 생성할 디렉터리 및 파일 구조

```
o4o-platform/
└── services/
    └── ecommerce/
        └── web/
            ├── src/
            │   ├── pages/
            │   │   └── Shop.tsx              # 상품 목록 페이지
            │   ├── components/
            │   │   └── ProductCard.tsx       # 상품 카드 컴포넌트
            │   ├── routes/
            │   │   └── index.tsx             # React Router 설정
            │   └── app.tsx                   # 앱 엔트리 포인트
            └── public/
```

---

## ✍️ 세부 설명

- `Shop.tsx`: Medusa API로부터 상품 목록을 받아와 카드로 출력
- `ProductCard.tsx`: 상품 정보를 카드 형태로 출력
- `index.tsx`: Router 설정 (e.g. `/shop` 경로)
- `app.tsx`: 기본 라우팅 구조 포함한 메인 앱

---

## ⏭️ 다음 작업 연결

- Task-01: `/shop` 화면 개발 (카드 UI, 상품 목록 출력)
- Task-02: `/product/:id` 상세 페이지 개발
