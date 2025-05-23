
# 💡 Wireframe 04: 크라우드펀딩 서비스 UI 흐름 설계

## 🎯 목적
yaksa.site 포털의 핵심 서비스 중 하나인 약사 대상 크라우드펀딩 플랫폼의 주요 화면 흐름 및 반응형 UI 구성을 설계한다.

---

## ✅ 주요 경로 구성

| 경로 | 설명 |
|------|------|
| `/funding` | 펀딩 메인 리스트 |
| `/funding/:id` | 펀딩 상세 페이지 |
| `/funding/create` | 펀딩 등록 페이지 (약사 전용) |
| `/funding/profile` | 내가 개설한 펀딩 내역 |

---

## 🧱 UI 구성 요소

### 1. 펀딩 메인 페이지 (`/funding`)
- 인기 프로젝트 슬라이드 (가로 스크롤 카드)
- 최신 펀딩 리스트 (카드형)
- 카테고리 필터 (예: 의료기기, 서비스, 약국경영)

### 2. 펀딩 상세 (`/funding/:id`)
- 제목, 이미지, 남은 기간, 목표금액, 현재 모금액
- 참여 버튼 + 참여자 수, 응원 메시지
- 상세 설명 (Rich Text)
- 댓글 영역 (선택)

### 3. 펀딩 등록 (`/funding/create`)
- 제목, 설명, 목표 금액, 마감일, 썸네일 업로드
- 약사만 접근 가능 (약사 인증 또는 `role === 'yaksa'`)
- 등록 후 `/funding/:id`로 이동

### 4. 프로필/내 펀딩 목록
- 내가 등록한 펀딩 목록
- 모금 현황, 수정/삭제 가능

---

## 📱 반응형 설계

- 카드형 UI는 모바일에서 세로 스택으로 전환
- 참여 버튼은 고정 하단 배치 (`fixed bottom-0`)
- 썸네일, 목표금액 등은 모바일 UI 우선

---

## 🔐 인증 흐름

- `/funding/create`, `/funding/profile`는 로그인 + `yaksa` 역할 필요
- 로그인되지 않으면 `/login`으로 리디렉션

---

## 💡 UI 스타일 가이드 (TailwindCSS)

- 카드: `rounded-xl shadow-lg p-4 bg-white`
- 버튼: `bg-blue-600 text-white py-2 px-4 rounded`
- 모바일 대응: `max-w-sm mx-auto`, `flex flex-col gap-4`

---

## ⏭️ 연동 서비스 (선택)

- 결제 모듈(PG)
- 관리자 승인 시스템
- 펀딩 종료 후 후기 작성 등
