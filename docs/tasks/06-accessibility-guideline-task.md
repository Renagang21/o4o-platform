# 🧩 Task: 접근성 및 UX 디테일 가이드 구현

## 📌 주의 사항 (작업 폴더 경로 명시)

> ⚠️ 이 작업은 다음 경로 내에서 적용 및 테스트되어야 합니다:

- ✅ 정확한 경로:
  ```
  Coding\o4o-platform\services\main-site
  ```

- ❌ 금지 경로:
  ```
  Coding\components
  Coding\guide
  Coding\main-site
  ```

---

## 🎯 목적
모든 페이지와 컴포넌트 전반에 대해 접근성(Accessibility)과 UX 세부 디테일 가이드를 적용합니다.  
고령자 및 시각 약자를 포함한 다양한 사용자가 문제없이 사용할 수 있도록 합니다.

---

## 📐 핵심 적용 항목

### 1. 고가독성 폰트 및 명확한 컬러 대비
- Pretendard, Noto Sans 등 Sans-serif 계열
- 텍스트 대비 비율 WCAG AA 이상
- 버튼·링크 색상은 비활성/활성 상태 명확히 구분

### 2. 키보드 내비게이션
- 모든 인터랙션 요소는 `Tab`으로 접근 가능해야 함
- 포커스 상태를 명확히 시각적으로 표시

### 3. ARIA 속성 적용
- 버튼, 입력창 등에 `aria-label` 혹은 `aria-describedby` 명시
- 스크린리더 대응

### 4. 입력 유효성 안내
- 폼 입력 시 오류 메시지는 실시간 제공
- 색상 외 시각적(텍스트/아이콘)으로도 오류 전달

### 5. 로딩/상태 피드백
- 페이지 전환, 저장, 제출 등에 Spinner 또는 상태 메시지 표시
- 처리 완료 또는 실패 시 알림 제공

---

## 💡 참고
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [국립국어원 웹접근성 가이드라인](https://www.wah.or.kr/)

---

## 🧪 테스트 체크리스트
- 탭 키로 모든 폼/버튼에 접근 가능한가?
- 시각적 피드백 없이도 오류를 인지할 수 있는가?
- 스크린 리더가 UI 요소를 정확히 읽는가?
- 버튼/링크의 포커스 테두리가 명확하게 보이는가?

---

# ✅ Cursor 작업 지시문

## 작업 위치
- `Coding/o4o-platform/services/main-site/src/components/` 이하의 주요 UI 컴포넌트 전반

## 작업 요청
1. 버튼, 폼, 링크 등 주요 컴포넌트에 `tabIndex`, `aria-*` 속성을 점검하고 추가하세요.
2. Tailwind 기반 스타일에 포커스 상태(`focus:outline`, `focus:ring`)를 명확히 추가하세요.
3. 오류 메시지 및 로딩 상태를 시각적으로도 안내하는 구조를 반영하세요.
4. 접근성 테스트는 `axe-core`, `tabindex`, `스크린 리더` 등 도구 기반으로 확인합니다.
