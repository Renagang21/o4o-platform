# 🛠️ UI/UX 개선 항목 기록 문서 (`uiux-fixes.md`)

## 🎯 목적

본 문서는 QA 및 사용자 피드백을 기반으로 발견된 UI/UX 문제 및 개선 사항을 기록하고 추후 개선 작업을 체계적으로 관리하기 위해 작성됩니다.

> 이 문서는 개발 중 발견된 `FIXME:` 주석과 직접 연결되며, 코드에서 발생 위치와 함께 항목을 정리합니다.

---

## ✅ 문서 작성 방식

각 항목은 아래의 양식을 따릅니다:

```md
### [카테고리] 페이지 또는 컴포넌트명 - 문제 요약

- 📍 위치: `/components/SomeComponent.tsx`
- 🐞 문제: 버튼이 모바일 해상도에서 텍스트와 겹침
- 💡 제안: `md:flex-row` → `flex-col` 전환
- 🏷️ 상태: `미처리` / `진행중` / `완료`
- 🔧 담당자: (작성자 또는 커서/개미 등)
```

---

## 📋 인증 관련 컴포넌트 개선 항목

### [레이아웃] RegisterForm - 모바일 그리드 레이아웃 개선

- 📍 위치: `/components/auth/RegisterForm.tsx`
- 🐞 문제: 모바일에서 역할 선택 버튼이 2열로 표시되어 가독성 저하
- 💡 제안: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` 변경
- 🏷️ 상태: 완료
- 🔧 담당자: Cursor

### [접근성] RegisterForm - 터치 영역 확대

- 📍 위치: `/components/auth/RegisterForm.tsx`
- 🐞 문제: 모바일에서 버튼과 입력 필드의 터치 영역이 작음
- 💡 제안: `min-h-[48px]` 클래스 추가 및 패딩 조정
- 🏷️ 상태: 완료
- 🔧 담당자: Cursor

### [타이포그래피] LoginForm - 모바일 텍스트 크기 조정

- 📍 위치: `/components/auth/LoginForm.tsx`
- 🐞 문제: 모바일에서 제목과 설명 텍스트가 너무 큼
- 💡 제안: `text-3xl` → `text-2xl sm:text-3xl` 변경
- 🏷️ 상태: 완료
- 🔧 담당자: Cursor

### [입력 필드] LoginForm - 모바일 키보드 대응

- 📍 위치: `/components/auth/LoginForm.tsx`
- 🐞 문제: 모바일 키보드가 올라올 때 입력 필드가 가려짐
- 💡 제안: `py-3 sm:py-2` 패딩 조정 및 `min-h-[48px]` 추가
- 🏷️ 상태: 완료
- 🔧 담당자: Cursor

### [레이아웃] PendingApprovalNotice - 여백 조정

- 📍 위치: `/components/auth/PendingApprovalNotice.tsx`
- 🐞 문제: 모바일에서 상하 여백이 너무 큼
- 💡 제안: `py-12` → `py-6 sm:py-12` 변경
- 🏷️ 상태: 완료
- 🔧 담당자: Cursor

### [버튼] PendingApprovalNotice - 터치 영역 개선

- 📍 위치: `/components/auth/PendingApprovalNotice.tsx`
- 🐞 문제: 고객센터 문의 링크의 터치 영역이 작음
- 💡 제안: `inline-block min-h-[48px] leading-[48px]` 추가
- 🏷️ 상태: 완료
- 🔧 담당자: Cursor

### [접근성] RoleGate - 오류 메시지 개선

- 📍 위치: `/components/auth/RoleGate.tsx`
- 🐞 문제: 접근 권한 없음 메시지가 모바일에서 가독성이 떨어짐
- 💡 제안: 텍스트 크기와 여백 조정
- 🏷️ 상태: 완료
- 🔧 담당자: Cursor

---

## 📌 상태별 정리 규칙

| 상태       | 의미                                       |
|------------|--------------------------------------------|
| `미처리`    | 발견만 되었고 아직 코드 반영되지 않음              |
| `진행중`    | 반영 작업 시작했으나 QA 완료 전                 |
| `완료`     | 코드 반영 및 QA까지 완료됨                     |

---

## 🧩 추가 안내

- 이 문서는 `tailwind.config.ts`, 주요 컴포넌트 스타일 변경 등 모든 시각적 개선 사항의 추적 용도로 사용됩니다.
- 단일 파일로 유지하되, 필요시 섹션별로 페이지나 카테고리 기반으로 나누어 문단 정리합니다.
