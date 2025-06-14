# 🧩 Task: 크라우드 펀딩 모듈 UI 개발 (`/funding`)

## 📌 주의 사항 (작업 폴더 경로 명시)

> ⚠️ 반드시 다음 경로 내부에서 작업하세요:

- ✅ 정확한 경로:
  ```
  Coding\o4o-platform\services\main-site
  ```

- ❌ 금지 경로:
  ```
  Coding\crowdfunding
  Coding\src\funding
  Coding\services\funding
  ```

---

## 🎯 목적
기획형 제품에 대해 소비자 선주문을 유도할 수 있도록, 펀딩 기반의 상품 소개 및 참여 UI를 구성합니다.  
목표 금액, 마감일, 참여자 수 등 주요 정보를 직관적으로 제공하여 구매를 유도합니다.

---

## 📐 주요 화면 및 기능

### 1. 펀딩 목록 (`/funding`)
- 펀딩 중인 프로젝트 카드 나열
- 상태별 필터: 진행중 / 마감 / 예정
- 목표 달성률 (%)과 남은 일수 표시

### 2. 펀딩 상세 (`/funding/:id`)
- 제품 이미지 및 설명
- 목표 금액 vs 현재 금액 시각화 (progress bar)
- 펀딩 참여 버튼 + 옵션 선택 (수량, 종류)

### 3. 펀딩 등록/관리 (`/funding/create`)
- 기본 정보 입력: 제목, 설명, 목표금액, 마감일
- 이미지 업로드
- 옵션(리워드) 구성: 가격, 수량, 설명

---

## 📁 주요 컴포넌트

- `FundingList.tsx`
- `FundingDetail.tsx`
- `FundingCreateForm.tsx`
- `FundingRewardOptions.tsx`
- `FundingProgressBar.tsx`

---

## 💡 디자인 참고
- 와디즈(Wadiz), 크라우디(Crowdy), Kickstarter
- 펀딩 성공률 강조 UI + 리워드 선택 구조

---

## 🧪 테스트 체크리스트
- 마감일과 목표금액 UI가 명확히 표시되는가?
- 옵션 선택 시 가격, 수량 반영이 정상 동작하는가?
- 진행률(progress bar)이 실시간 반영되는가?

---

# ✅ Cursor 작업 지시문

## 작업 위치
- `Coding/o4o-platform/services/main-site/src/pages/funding/`

## 작업 요청
1. `/funding/`, `/funding/[id]`, `/funding/create` 페이지를 생성하세요.
2. 각 펀딩 카드에 남은 일수, 달성률, 제목, 대표 이미지 등을 표시하세요.
3. 상세 페이지에 목표 금액과 진행률 bar를 시각적으로 표시하세요.
4. 참여 시 수량 및 옵션을 선택하는 `FundingRewardOptions` 컴포넌트를 생성하세요.
