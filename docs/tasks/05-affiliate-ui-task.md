# 🧩 Task: 제휴(Affiliate) 리퍼럴 UI 개발 (`/affiliate/dashboard`)

## 📌 주의 사항 (작업 폴더 경로 명시)

> ⚠️ 이 작업은 반드시 아래 경로 내에서 이루어져야 합니다:

- ✅ 정확한 경로:
  ```
  Coding\o4o-platform\services\main-site
  ```

- ❌ 금지 경로:
  ```
  Coding\affiliate
  Coding\services\affiliate
  Coding\src\pages
  ```

---

## 🎯 목적
제휴 참여자가 리퍼럴 링크를 관리하고, 수익 현황을 한눈에 확인할 수 있는 대시보드를 구축합니다.  
리퍼럴 클릭 수, 전환 수, 예상 수익을 시각적으로 보여주며, 링크 복사 및 공유 UI를 포함합니다.

---

## 📐 주요 기능 및 구성

### 1. 리퍼럴 링크 표시
- 기본 제공 링크 1개
- [복사하기] 버튼
- [소셜 공유] 버튼: 이메일, 카카오톡, Facebook, Twitter 등

### 2. 요약 통계 카드 (4종)
- 총 클릭 수
- 전환 수 (구매로 이어진 수)
- 누적 수익
- 이번 달 예상 정산액

### 3. 활동 이력 테이블
- 날짜, 클릭 수, 전환 수, 발생 수익 표시
- 페이지네이션 포함

### 4. 안내 박스
- 수익 정산일, 세금 처리 안내, 금지 행위 등 유의사항 표시

---

## 💡 디자인 참고
- 쿠팡 파트너스, 인플루언서 플랫폼 대시보드
- 리퍼럴 추적 UI는 Tapfiliate, FirstPromoter 참고

---

## 🧪 테스트 체크리스트
- 복사 버튼 클릭 시 클립보드에 링크가 제대로 복사되는가?
- 소셜 공유 버튼이 의도한 링크를 포함하고 있는가?
- 테이블 필터링 및 페이지 전환이 정상 동작하는가?

---

# ✅ Cursor 작업 지시문

## 작업 위치
- `Coding/o4o-platform/services/main-site/src/pages/AffiliateDashboard.tsx`

## 컴포넌트 구조 (추천)
- `/components/affiliate/` 디렉토리에 다음 컴포넌트 생성:
  - `ReferralLinkBox.tsx`
  - `AffiliateStats.tsx`
  - `ActivityHistoryTable.tsx`
  - `NoticeBanner.tsx`

## 작업 요청
1. `AffiliateDashboard.tsx` 페이지에서 위 컴포넌트들을 배치해 UI를 구성하세요.
2. TailwindCSS 기반 반응형 UI로 제작하세요.
3. 복사 및 공유 버튼은 실제 동작하도록 구현하세요 (`navigator.clipboard`, SNS 링크 등).
4. 수치는 mock data 또는 useState 기반으로 구성해도 무방합니다.
