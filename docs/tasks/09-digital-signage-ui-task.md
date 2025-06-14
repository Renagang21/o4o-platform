# 🧩 Task: 디지털 사이니지 모듈 UI 개발 (`/signage`)

## 📌 주의 사항 (작업 폴더 경로 명시)

> ⚠️ 반드시 다음 경로 내부에서 작업하세요:

- ✅ 정확한 경로:
  ```
  Coding\o4o-platform\services\main-site
  ```

- ❌ 금지 경로:
  ```
  Coding\digital-signage
  Coding\src\signage
  Coding\services\signage
  ```

---

## 🎯 목적
약국 및 매장 내 디지털 사이니지에 송출할 콘텐츠를 구성 및 관리하는 UI를 구축합니다.  
사이니지 플레이어에서 필요한 콘텐츠 타입별 미리보기 및 송출 설정 기능을 포함합니다.

---

## 📐 주요 화면 및 기능

### 1. 콘텐츠 리스트 (`/signage`)
- 콘텐츠 썸네일 + 제목 + 송출 여부 표시
- 콘텐츠 타입별 필터: 이미지 / 텍스트 / 동영상 / 공지
- 등록일순 / 이름순 정렬

### 2. 콘텐츠 상세 보기 (`/signage/:id`)
- 콘텐츠 전체 미리보기
- 송출 스케줄 요약 (요일/시간대 표시)
- 수정 및 삭제 버튼

### 3. 콘텐츠 등록 (`/signage/create`)
- 콘텐츠 타입 선택: 이미지, 텍스트, 동영상
- 업로드 기능 + 텍스트 입력 (텍스트 콘텐츠일 경우)
- 송출 일정 설정: 요일, 시간 범위

---

## 📁 주요 컴포넌트

- `SignageList.tsx`
- `SignageDetail.tsx`
- `SignageEditor.tsx`
- `SignageScheduler.tsx` (요일/시간대 설정)

---

## 💡 디자인 참고
- 카페24 매장 전광판 UI, Samsung Smart Signage UX
- 넓은 썸네일 기반 미리보기 + 직관적 예약 구성

---

## 🧪 테스트 체크리스트
- 이미지/영상 업로드가 제대로 되는가?
- 요일/시간대 설정 시 UI와 내부 상태가 일치하는가?
- 미리보기 화면이 실제 송출과 동일하게 보이는가?

---

# ✅ Cursor 작업 지시문

## 작업 위치
- `Coding/o4o-platform/services/main-site/src/pages/signage/`

## 작업 요청
1. `/signage/`, `/signage/[id]`, `/signage/create` 페이지를 생성하세요.
2. 콘텐츠 타입별 렌더링 구조를 분기 처리하고, 미리보기는 실제로 보여지도록 설정하세요.
3. 시간대 설정을 위한 `SignageScheduler`는 mock 기준으로 구현하세요.
4. 업로드된 파일은 클라이언트 측 상태만 유지해도 괜찮습니다 (Backend 연동은 추후).
