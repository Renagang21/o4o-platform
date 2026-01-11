# K-Cosmetics 2차 목적형 재조사 체크리스트 (v0.2)

> **조사 일시**: 2026-01-10
> **조사 전제**:
> - **주축(B)**: 관광객·콘텐츠·매장을 연결하는 **O4O 허브**
> - **보완(C)**: 운영자가 큐레이션하는 **세미 프랜차이즈 쇼케이스**
> - 본 조사는 "리팩토링 결론"을 내리지 않는다.
> - 모든 항목은 **KEEP / RELOCATE / REINTERPRET(의미 재정의)** 중 하나로만 표시한다.
> - DROP 판단은 하지 않는다.

---

## 🔵 조사 축 ①: TouristService의 위치 · 비중 · 연결성

*(B안 핵심 축)*

### ①-1. TouristService의 위상 점검

**질문**:
- [ ] TouristService는 **부가 기능**처럼 보이는가?
- [x] 아니면 **O4O 허브의 한 축**으로 인식되는가?
- [ ] "관광객 → 콘텐츠 → 매장"의 흐름이 UI 상에서 **암시라도 되는가?**
- [x] TouristService가 **다른 섹션과 고립**되어 있지는 않은가?

**관찰 결과**:

**현재 TouristServiceSection 분석**:
```
위치: HomePage 4번째 섹션 (NowRunning 다음)
크기: 대형 그라데이션 카드 (padding: 32px)
구조: 독립 섹션 (h2: "연계 서비스")
내용:
  - 제목: "Tourist Service"
  - 뱃지: "관광객 연결"
  - 설명: "외국인 관광객을 매장으로 연결해드립니다"
  - 부가 설명: "개인 관광객·단체 관광 모두 지원"
  - CTA: "서비스 보기 →" (/services/tourists)
```

**위상 진단**:
1. **부가 기능처럼 보임**: ✅ YES
   - "연계 서비스"라는 카테고리명 자체가 "부수적"을 암시
   - 독립 섹션으로 격리됨 (QuickAction/NowRunning과 분리)
   - 홈 흐름에서 **갑자기 등장**

2. **O4O 허브의 한 축으로 인식**: ❌ NO
   - "관광객 → 콘텐츠 → 매장" 흐름이 암시되지 않음
   - 단방향 설명 ("관광객을 매장으로 연결")
   - 콘텐츠 역할 미언급

3. **다른 섹션과 고립**: ✅ YES
   - QuickActionCard들과 디자인 일관성 없음
   - NowRunning 카드들과 연결고리 없음
   - Hero 슬라이더 3번째 슬라이드는 관광객 언급하지만 연결 약함

**체크 결과**: ☑️ **RELOCATE + REINTERPRET**

- **RELOCATE**: 독립 섹션 → QuickActionCard 4번째 카드로 축소
- **REINTERPRET**: "연계 서비스" → "관광객 연결 허브"로 의미 재정의

---

### ①-2. TouristService와 홈 구조의 관계

**질문**:
- [x] 홈에서 **설명 과잉** 상태인가?
- [x] TouristService가 홈에서 "기능 소개 페이지 역할"을 하고 있지는 않은가?
- [x] 독립 페이지가 있음에도 홈에서 중복 설명하고 있지는 않은가?

**관찰 결과**:

**TouristServiceSection 콘텐츠 분석**:
```
제공 정보량:
  - 제목 (Tourist Service)
  - 뱃지 (관광객 연결)
  - 주 설명 (외국인 관광객을 매장으로 연결)
  - 부가 설명 (개인/단체 관광 지원, 검증된 매장만 노출)
  - CTA 버튼
```

**홈의 역할 진단**:
1. **설명 과잉**: ✅ YES
   - 3줄의 텍스트 설명
   - 부가 설명까지 포함 (※ 주석 형태)
   - 독립 페이지가 있는데도 홈에서 재설명

2. **기능 소개 페이지 역할**: ✅ YES
   - 대형 카드 (32px padding, 64px 아이콘)
   - 설명적 톤 ("연결해드립니다", "지원합니다")
   - **"무엇을 할 수 있는가"**를 설명 (출발점이 아님)

3. **중복 설명**: ✅ YES
   - 독립 페이지 `/services/tourists` 존재 (라우트 미구현이지만)
   - Hero 슬라이더 3번째에도 관광객 언급
   - QuickActionCard에도 배치 가능한 구조

**관찰 포인트**: "홈은 출발점인가, 설명서인가?"

**답변**: 현재는 **설명서**에 가까움
- 출발점이라면: 카드 클릭 → 즉시 다음 행동
- 설명서라면: 카드 내부에서 설명 완결 → 클릭 선택적

**체크 결과**: ☑️ **REINTERPRET**

- 현재: "이런 서비스가 있습니다" (설명)
- 제안: "관광객을 연결합니다" (상태/흐름)

---

### ①-3. TouristService와 다른 카드들의 연결성

**질문**:
- [ ] 콘텐츠 카드(영상/정보)가 TouristService와 **맥락적으로 연결**되는가?
- [ ] 매장/상품 카드가 "관광객 유입 이후의 단계"로 자연스럽게 이어지는가?
- [x] 연결이 없다면, **구조 문제인가 / 표현 문제인가?**

**관찰 결과**:

**현재 홈 흐름 분석**:
```
1. HeroSection → 플랫폼 정체성 (4개 슬라이드)
   - Slide 1: "K-Beauty Store를 위한 운영 플랫폼"
   - Slide 2: "신상품 Market Trial"
   - Slide 3: "외국인 관광객을 위한 검증된 매장 네트워크"
   - Slide 4: "검증된 정품 매장만 연결"

2. QuickActionSection → 운영 도구 (3개 카드)
   - Products (상품 관리)
   - Market Trial (신상품 체험)
   - Orders (B2B 주문)

3. NowRunningSection → 진행 중 프로그램 (3개 카드)
   - Trial: "신규 스킨케어 라인 Trial"
   - Product: "2026 S/S 신상품 입고"
   - Campaign: "설날 특별 캠페인"

4. TouristServiceSection → ⚠️ 갑자기 등장
   - 앞선 3개 섹션과 맥락 단절
   - 관광객 언급은 Hero Slide 3에만 있음
   - QuickAction/NowRunning에 관광객 관련 없음

5. NoticeSection → 운영 공지
6. CTASection → 비로그인 유저 전환
7. PartnerTrustSection → 협력 브랜드
```

**연결성 진단**:

1. **콘텐츠 카드와 TouristService 연결**: ❌ NO
   - 현재 홈에 "콘텐츠 카드" 없음
   - NowRunning은 "Trial/이벤트"이지 콘텐츠 아님
   - 관광객이 볼 만한 콘텐츠 언급 없음

2. **매장/상품 카드와 연결**: ❌ NO
   - QuickActionCard "Products"는 **매장 관리자용**
   - 관광객 → 매장 연결 흐름 없음
   - "관광객 유입 이후 단계" 개념 부재

3. **연결 없음의 원인**:
   - **구조 문제**: ✅
     - TouristService가 독립 섹션 (다른 카드와 격리)
     - 관광객 관련 카드가 QuickAction/NowRunning에 없음
   - **표현 문제**: ✅
     - "연계 서비스"라는 카테고리명이 격리 유도
     - "외국인 관광객을 매장으로 연결"은 **단방향**
     - "관광객 → 콘텐츠 → 매장" 흐름 언급 없음

**체크 결과**: ☑️ **구조 문제 (RELOCATE) + 표현 문제 (REINTERPRET)**

**제안**:
1. **구조 조정**:
   - TouristService → QuickActionCard 4번째로 이동
   - 또는 NowRunning 타입에 `tourist-content` 추가

2. **표현 조정**:
   - "연계 서비스" → "관광객 허브"
   - "연결해드립니다" → "지금 연결 중: 12개 매장"
   - 설명적 톤 → 상태 표시 톤

---

## 🔵 조사 축 ②: 콘텐츠 카드의 비중과 역할

*(B안 실질 구동부)*

### ②-1. 콘텐츠의 성격 점검

**질문**:
- [ ] 현재 콘텐츠는 "정보 제공"에 머무르는가?
- [ ] 아니면 "관광객·매장 연결을 돕는 재료"로 기능하는가?
- [ ] 콘텐츠가 **혼자 완결**되는가, **다음 행동을 유도**하는가?

**관찰 결과**:

**현재 홈에서 "콘텐츠" 요소**:
```
❌ 없음
```

**NowRunningSection 재분석** (콘텐츠로 볼 수 있는가?):
```tsx
NowRunningItem[] = [
  {
    type: 'trial',
    title: '신규 스킨케어 라인 Trial',
    supplier: 'COSRX',
    deadline: '2026.01.31',
    participants: 15,
  },
  {
    type: 'product',
    title: '2026 S/S 신상품 입고',
    supplier: 'Innisfree',
    deadline: '2026.02.15',
  },
  {
    type: 'campaign',
    title: '설날 특별 캠페인',
    deadline: '2026.02.01',
  },
]
```

**콘텐츠 성격 진단**:
1. **정보 제공**: ⚠️ 일부
   - "신규 스킨케어 Trial" → 정보 제공
   - "신상품 입고" → 정보 제공
   - "설날 캠페인" → 정보 제공

2. **연결 재료**: ❌ NO
   - 매장 관리자용 정보 (Trial 참여, 입고 안내)
   - 관광객이 볼 만한 콘텐츠 아님
   - "콘텐츠를 통한 연결" 개념 없음

3. **완결 vs 유도**:
   - 현재: **다음 행동 유도** (link 포함)
   - 하지만 **관광객 관점 행동 아님**
   - 매장 관리자 행동 (Trial 신청, 상품 확인)

**발견**:
- 현재 홈에 **관광객용 콘텐츠 없음**
- NowRunning은 **매장 운영자용**
- "콘텐츠로 관광객 연결" 개념 부재

**체크 결과**: ☑️ **REINTERPRET (역할 재정의 필요)**

**제안**:
1. NowRunning에 `type: 'content'` 추가
   - "K-Beauty 트렌드 영상" (관광객용)
   - "명동 매장 추천 가이드" (관광객용)
2. 또는 새 섹션 "Featured Content" 추가

---

### ②-2. 콘텐츠 카드의 위치와 밀도

**질문**:
- [ ] 콘텐츠 카드가 홈에서 **과도하게 적은가 / 많은가?**
- [ ] 콘텐츠가 "이벤트처럼 튀는가", 아니면 "일상적인 재료처럼 섞이는가?"
- [ ] 추천 콘텐츠와 일반 콘텐츠의 구분이 **과도하게 강조**되어 있지는 않은가?

**관찰 결과**:

**현재 콘텐츠 밀도**:
```
콘텐츠 카드: 0개
NowRunning (매장 운영자용): 3개
```

**밀도 진단**:
1. **과도하게 적음**: ✅ YES
   - 관광객용 콘텐츠 0개
   - B안(허브)에서 콘텐츠는 핵심 구동부
   - 현재는 콘텐츠 축 부재

2. **이벤트 vs 일상 재료**:
   - 현재 NowRunning은 **이벤트처럼 튀는 형태**
   - type 뱃지 (Trial/Product/Campaign) 모두 일시적
   - "일상적 재료" 부재

3. **추천/일반 구분**:
   - 현재는 구분 자체가 없음 (콘텐츠 0개)

**체크 결과**: ☑️ **밀도 문제 (RELOCATE + 신규 추가)**

**제안**:
1. NowRunning을 "콘텐츠 + 이벤트 혼합"으로 재구성
2. 또는 "Featured Content" 섹션 신설 (3-6개 카드)

---

### ②-3. 콘텐츠와 TouristService의 관계

**질문**:
- [ ] 콘텐츠가 TouristService의 "보조 설명"처럼 보이지는 않는가?
- [ ] 콘텐츠가 TouristService의 "입구 역할"을 하고 있는가?
- [ ] 관광객 관점에서 "다음에 무엇을 하면 되는지"가 느껴지는가?

**관찰 결과**:

**현재 관계**:
```
콘텐츠: 없음
TouristService: 독립 섹션 (설명적)
관계: 없음
```

**관계 진단**:
1. **보조 설명**: ❌ (콘텐츠 부재)
2. **입구 역할**: ❌ (콘텐츠 부재)
3. **다음 행동 느껴짐**: ❌
   - TouristService CTA: "서비스 보기 →"
   - 관광객 관점 행동: ❓ (명확하지 않음)
   - "매장 찾기", "콘텐츠 보기" 등 구체적 행동 없음

**체크 결과**: ☑️ **연결 없음 (RELOCATE + 신규 추가)**

**제안**:
1. 콘텐츠 카드 추가 → TouristService와 맥락 연결
   - "명동 K-Beauty 가이드" (콘텐츠)
   - → "관광객 연결 허브" (TouristService)
   - → "추천 매장 보기" (매장 카드)

---

## 🔵 조사 축 ③: 운영자 큐레이션의 톤과 표현

*(C안 보완 축)*

### ③-1. 운영자의 존재감

**질문**:
- [x] 이 홈을 보고 "누군가 운영하고 있다"는 느낌이 드는가?
- [ ] 그 운영자는 "통제자"인가, "큐레이터"인가?
- [x] 추천/진행 중 프로그램이 **운영자의 판단 결과**로 보이는가?

**관찰 결과**:

**운영자 존재감 요소**:
```
1. HeroSection 슬라이더 (4개 슬라이드)
   - "플랫폼 정체성" 설명적
   - 자동 슬라이드 (6초)
   - 큐레이션 느낌: ⚠️ 약함

2. QuickActionSection
   - 제목: "운영 도구"
   - 부제: "매장 운영에 필요한 핵심 기능"
   - 큐레이션 느낌: ❌ 없음 (고정 기능)

3. NowRunningSection
   - 제목: "Now Running"
   - 부제: "지금 참여 가능한 프로그램"
   - 큐레이션 느낌: ✅ 있음 (운영자가 선정한 느낌)

4. NoticeSection
   - 제목: "운영 공지"
   - isPinned 기능
   - 큐레이션 느낌: ✅ 있음 (운영자 발신)

5. PartnerTrustSection
   - "신뢰할 수 있는 브랜드와 함께합니다"
   - 큐레이션 느낌: ✅ 있음 (운영자 선정 브랜드)
```

**존재감 진단**:
1. **운영하고 있다는 느낌**: ✅ YES
   - NoticeSection의 공지
   - NowRunningSection의 "지금 참여 가능"
   - PartnerTrustSection의 브랜드 선정

2. **통제자 vs 큐레이터**:
   - 통제자: ⚠️ 일부 (QuickActionSection "운영 도구")
   - 큐레이터: ✅ 주로 (NowRunning, Partner 선정)

3. **운영자 판단 결과**: ✅ YES
   - NowRunning 3개 항목: 운영자가 선정한 느낌
   - Partner 5개 브랜드: 운영자가 검증한 느낌
   - Notice 핀 기능: 운영자가 중요하다 판단

**체크 결과**: ☑️ **톤 적절 (KEEP) - 일부 REINTERPRET**

**제안**:
- Hero 슬라이더를 "운영자의 지금 관점"으로 재구성
  - 현재: 플랫폼 소개 (고정)
  - 제안: "이번 주 주목", "지금 추천" (유동적)

---

### ③-2. Hero 영역의 의미 재점검

**질문**:
- [x] Hero가 "플랫폼 소개"에 머무르는가?
- [ ] 아니면 "지금 운영자가 보고 싶은 장면"을 보여주는가?
- [ ] Hero가 **상태·흐름 쇼케이스**로 해석될 여지가 있는가?

**관찰 결과**:

**현재 Hero 슬라이더 내용**:
```tsx
Slide 1: "K-Beauty Store를 위한 운영 플랫폼"
  - "브랜드·매장·관광객이 연결됩니다"
  - CTA: "시작하기" (/platform/stores)

Slide 2: "신상품 Market Trial 참여 매장 모집 중"
  - "브랜드의 신상품을 먼저 체험하고 피드백을 공유하세요"
  - CTA: "자세히 보기" (/platform/stores)

Slide 3: "외국인 관광객을 위한 검증된 매장 네트워크"
  - "개인 관광객부터 단체 관광까지 연결"
  - CTA: "관광객 서비스 보기" (/services/tourists)

Slide 4: "다수 매장·다수 브랜드가 함께하는 K-Beauty 플랫폼"
  - "검증된 정품 매장만 연결합니다"
  - CTA: 없음
```

**Hero 의미 진단**:
1. **플랫폼 소개**: ✅ YES
   - Slide 1, 4: 명확한 플랫폼 소개
   - Slide 2, 3: 기능 소개

2. **지금 운영자가 보고 싶은 장면**: ⚠️ 일부
   - Slide 2 "모집 중": 현재 상태 암시
   - 나머지: 고정 메시지

3. **상태·흐름 쇼케이스**: ❌ NO
   - "지금 12개 매장 연결 중"
   - "이번 주 신규 Trial 2건"
   - 같은 동적 상태 표시 없음

**체크 결과**: ☑️ **메시지 조정 필요 (REINTERPRET)**

**제안**:
- Slide 1: "K-Beauty 매장 플랫폼" (간결)
- Slide 2: "이번 주 Trial: COSRX 스킨케어 라인" (구체적)
- Slide 3: "지금 12개 매장 · 관광객 연결 중" (상태)
- Slide 4: "신뢰할 수 있는 파트너: COSRX, Innisfree..." (큐레이션)

---

### ③-3. NowRunning / 추천 영역의 위상

**질문**:
- [x] NowRunning은 "지금 주목할 흐름"으로 읽히는가?
- [ ] 추천 영역이 홈의 주인공처럼 느껴지지는 않는가?
- [x] 추천이 **강제가 아니라 제안**으로 읽히는가?

**관찰 결과**:

**NowRunningSection 구조**:
```tsx
제목: "Now Running"
부제: "지금 참여 가능한 프로그램"
카드 3개: Trial / Product / Campaign
각 카드: type 뱃지 + deadline + 참여 매장 수
```

**위상 진단**:
1. **지금 주목할 흐름**: ✅ YES
   - "Now Running" 네이밍 명확
   - deadline 표시로 시간성 강조
   - participants 숫자로 진행 상태 암시

2. **주인공처럼 느껴짐**: ❌ NO
   - QuickActionSection과 동등한 비중
   - 시각적으로 과도하지 않음
   - 균형적 배치

3. **강제 vs 제안**: ✅ 제안
   - "참여 가능한" (선택적)
   - "👥 15개 매장 참여" (사회적 증거, 강제 아님)
   - 클릭 선택적

**체크 결과**: ☑️ **적절 (KEEP)**

---

## 🔵 최종 정리 (다음 행동을 위한 재료)

### A. 이 방향(B+C)에서 의미만 바꾸면 살아나는 요소

**항목**:
1. **TouristServiceSection**
2. **NowRunningSection**
3. **Hero 슬라이더 Slide 2, 3**

**이유**:
1. **TouristServiceSection**:
   - 구조는 우수 (대형 카드, 명확한 CTA)
   - 문제는 **위치와 표현**
   - "연계 서비스" → "관광객 허브"로 재정의
   - "외국인 관광객을 매장으로 연결" → "지금 연결 중: 12개 매장"

2. **NowRunningSection**:
   - type 시스템 우수 (trial/product/campaign)
   - **type: 'content' 추가**로 콘텐츠 역할 확장
   - "지금 참여 가능한 프로그램" → "지금 주목할 것"

3. **Hero 슬라이더**:
   - 구조 완벽 (자동 슬라이드, 네비게이션)
   - **메시지만 조정** (플랫폼 소개 → 상태 쇼케이스)

---

### B. 이 방향(B+C)에서 위치를 옮기면 더 잘 맞는 요소

**항목**:
1. **TouristServiceSection → QuickActionCard 4번째**

**현재 위치 → 적합 위치**:
```
현재:
  1. Hero
  2. QuickAction (3개 카드)
  3. NowRunning (3개 카드)
  4. TouristService (독립 대형 섹션) ← ⚠️
  5. Notice
  6. CTA
  7. Partner

제안:
  1. Hero
  2. QuickAction (4개 카드) ← TouristService 추가
     - Products
     - Market Trial
     - Orders
     - Tourist Hub (신규 카드)
  3. NowRunning (3-6개 카드)
     - Trial
     - Product
     - Campaign
     - Content (신규 type)
  4. Notice
  5. CTA (또는 Hero에 통합)
  6. Partner
```

**이유**:
- TouristService를 QuickAction에 포함 → **핵심 축으로 승격**
- 독립 섹션 제거 → **흐름 단순화**
- 관광객·매장·콘텐츠가 같은 레벨 → **허브 구조 명확화**

---

### C. 이 방향(B+C)에서 이미 잘 맞아떨어지는 요소

**항목**:
1. **NowRunningSection 타입 뱃지 시스템**
2. **NoticeSection 운영 공지**
3. **PartnerTrustSection 브랜드 큐레이션**
4. **Header.tsx 미니멀 메뉴**

**이유**:
1. **NowRunningSection**:
   - "지금 주목할 흐름" 개념 명확
   - type 기반 뱃지 (Trial/Product/Campaign) 확장 가능
   - 운영자 큐레이션 느낌 자연스러움

2. **NoticeSection**:
   - 운영자 존재감 강함 (isPinned 기능)
   - 발신자 명확 ("운영 공지")
   - 큐레이션 톤 적절

3. **PartnerTrustSection**:
   - 운영자가 검증한 브랜드 느낌
   - "신뢰할 수 있는 브랜드와 함께합니다" (큐레이션 톤)
   - 시각적으로 과하지 않음

4. **Header.tsx**:
   - 미니멀 메뉴 (홈/문의/매장관리)
   - 허브 개념에 적합 (기능 나열 아님)
   - 모바일 완벽 대응

---

## 🎯 이 체크리스트의 산출물

이 2차 재조사 결과를 기반으로 다음이 **즉시 가능**합니다:

### ❌ 전면 리디자인
- 필요 없음

### ❌ 구조 재설계
- 필요 없음

### ⭕ 배치 조정 리팩토링
1. **TouristService 이동**: 독립 섹션 → QuickActionCard 4번째
2. **CTASection 이동**: 홈 하단 → Hero 슬라이더 또는 제거

### ⭕ 카드 역할/카피 재정의
1. **TouristService**:
   - "연계 서비스" → "관광객 허브"
   - "외국인 관광객을 매장으로 연결해드립니다" → "지금 연결 중: 12개 매장"
   - status: { label: '연결 중', value: 12 }

2. **NowRunning type 확장**:
   - `type: 'content'` 추가
   - 뱃지: "📺 콘텐츠" (색상: blue)
   - 예: "명동 K-Beauty 가이드 영상"

### ⭕ Hero / TouristService / 콘텐츠의 의미 재정렬
1. **Hero 슬라이더**:
   - Slide 1: "K-Beauty 매장 플랫폼" (간결)
   - Slide 2: "이번 주 Trial: COSRX 스킨케어" (구체적)
   - Slide 3: "지금 12개 매장 · 관광객 연결 중" (상태)
   - Slide 4: "신뢰할 수 있는 파트너" (큐레이션)

2. **TouristService → QuickActionCard**:
   ```tsx
   {
     id: 'tourist-hub',
     title: 'Tourist Hub',
     subtitle: '관광객 허브',
     description: '관광객·콘텐츠·매장을 연결합니다',
     icon: '🌏',
     link: '/services/tourists',
     color: '#2196f3',
     status: { label: '연결 중', value: 12 },
   }
   ```

3. **NowRunning 콘텐츠 예시**:
   ```tsx
   {
     id: '4',
     type: 'content',
     title: '명동 K-Beauty 가이드',
     supplier: 'K-Cosmetics',
     link: '/content/myeongdong-guide',
   }
   ```

---

## 다음 단계 (자동 연결)

이 체크리스트 결과를 기준으로 다음 중 **하나**를 선택할 수 있습니다:

### 1️⃣ B안 주축 홈 구조 v0.3 배치안
- TouristService 이동 시나리오 (2-3안)
- QuickActionCard 4번째 vs NowRunning type 추가
- 예상 변경 파일: `HomePage.tsx` (1개 파일, 구조 조정만)

### 2️⃣ TouristService 재배치 시나리오 2~3안
- 안 1: QuickActionCard 4번째 (추천)
- 안 2: NowRunning에 통합 (type: 'tourist-service')
- 안 3: Header 메뉴 추가 + 홈에서 제거

### 3️⃣ 운영자 큐레이션 톤 가이드 (문장 수준)
- Hero 슬라이더 메시지 조정
- QuickAction/NowRunning description 톤 통일
- "~해드립니다" → "~합니다" / "지금 ~ 중"

---

## 📊 조사 요약

| 조사 항목 | 결과 | 액션 |
|----------|------|------|
| TouristService 위상 | 부가 기능처럼 보임 | RELOCATE + REINTERPRET |
| TouristService 설명 과잉 | YES | REINTERPRET |
| TouristService 연결성 | 단절됨 | RELOCATE (구조) + REINTERPRET (표현) |
| 콘텐츠 카드 존재 | 없음 | 신규 추가 (NowRunning type 확장) |
| 콘텐츠 밀도 | 부족 | RELOCATE + 신규 |
| 콘텐츠-Tourist 관계 | 없음 | 신규 추가 |
| 운영자 존재감 | 적절 | KEEP (일부 REINTERPRET) |
| Hero 의미 | 플랫폼 소개 | REINTERPRET (상태 쇼케이스) |
| NowRunning 위상 | 적절 | KEEP |

---

**조사 완료일**: 2026-01-10
**다음 액션**: 사용자 피드백 대기 → 배치 조정 리팩토링 또는 시나리오 작성
