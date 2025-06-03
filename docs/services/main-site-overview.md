# main-site 서비스 구조 및 개발 현황

이 문서는 `services/main-site/` 디렉터리에서 개발 중인 프론트엔드 SPA의 전체 구조, 페이지 구성, 기능 흐름을 정리합니다.

---

## 🧭 프로젝트 개요

- 프레임워크: React (Vite + TypeScript)
- 상태관리: Context API 기반 (역할, 인증)
- 스타일링: Tailwind CSS
- 주요 역할별 화면:
  - 사용자(user)
  - 판매자(seller)
  - 공급자(supplier)
  - 관리자(administrator/operator)

---

## 📂 폴더 구조 요약

```
main-site/
├── public/
├── dist/
├── src/
│   ├── pages/           # 라우팅 기반 화면 구성
│   ├── components/      # 재사용 UI 컴포넌트
│   ├── context/         # 인증, 사용자 상태
│   ├── hooks/           # 커스텀 훅
│   ├── utils/           # 공용 함수, API 호출
│   ├── App.tsx
│   └── main.tsx
```

---

## 📄 주요 페이지 (`src/pages/`)

| 파일명 | 설명 |
|--------|------|
| `Login.tsx` | 사용자 로그인 |
| `Register.tsx` | 회원가입 (기본 사용자) |
| `Profile.tsx` | 사용자 정보 및 상태 확인 |
| `StoreProducts.tsx` | 매장(B2C) 상품 목록 |
| `SellerDashboard.tsx` | 판매자용 대시보드 |
| `ProductForm.tsx` | 상품 등록/수정 |
| `YaksaApprovalList.tsx` | 약사/판매자 승인 목록 (관리자용) |
| `YaksaApprovalDetail.tsx` | 승인 상세 화면 |
| `UserRoleManager.tsx` | 사용자 역할 설정 및 변경 |
| `AdminStats.tsx` | 관리자 통계/대시보드 화면 |
| `NotFound.tsx` | 404 오류 페이지 |
| `AccessDenied.tsx` | 권한 부족 시 표시 화면 |

---

## 🔐 인증 흐름

- JWT 기반 인증 (api-server 연동 예정)
- 로그인 시 Context API에 사용자 정보 저장
- 승인 대기 사용자는 기본 `user`로 제한된 접근만 가능
- `admin`, `seller`, `supplier` 등 역할별 경로 분기 및 보호

---

## 🛠 현재 구현된 기능 요약

- 로그인/회원가입 화면 구현 완료
- 상품 등록/목록 화면 연동 중
- 관리자 전용 승인 관리 화면 설계 완료
- 상태 분기용 `useAuth`, `useRole` 훅 구현됨
- Tiptap 기반 에디터는 향후 `Home.tsx` 개선 후 연동 예정

---

## 📌 향후 작업 항목

- `store/{name}` 페이지 동적 라우팅 및 SEO 적용
- `admin` 경로 보호 및 리디렉션 개선
- 사용자 알림/이벤트 기반 반응형 UX 개선
- 다국어(i18n) 또는 한국어/영문 UI 선택 기능 도입 고려
