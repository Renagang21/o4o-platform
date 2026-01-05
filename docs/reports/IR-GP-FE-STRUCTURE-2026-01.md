# GlycoPharm 프론트엔드 구조 적합성 조사 보고서

**조사 ID**: IR-GP-FE-STRUCTURE-2026-01
**조사일**: 2026-01-05
**조사자**: Claude (AI Assistant)
**조사 성격**: 구조 적합성 판단을 위한 조사 (개발 요청 아님)

---

## 1. 전체 요약

### 1.1 조사 결론

현재 GlycoPharm 프론트엔드는 **공식 서비스 정의와 구조적 불일치**가 존재한다.

| 구분 | 공식 정의 | 현재 구현 상태 | 적합성 |
|------|-----------|----------------|--------|
| 서비스 정체성 | 프랜차이즈 본부 주도형 가맹점 지원 플랫폼 | 약국 전용 B2B 마켓플레이스 | ❌ 불일치 |
| 포럼 위상 | 운영 허브 (3대 핵심 축) | 부가 기능 (커뮤니티) | ❌ 불일치 |
| 디지털 사이니지 | 핵심 기능 축 | Pharmacy Dashboard 하위 기능 | 🔧 부분 일치 |
| Market Trial/이벤트 | 핵심 수익 구조 | **명시적 부재** | ❌ 부재 |
| B2B/B2C 구분 | 본부B2B + 가맹점B2C(무재고/키오스크/QR) | 일반 B2B + Consumer Store | 🔧 부분 일치 |

### 1.2 핵심 발견사항

1. **서비스 정체성 혼란**: "약사를 위한 혈당관리 전문 플랫폼"으로 표현되어 있으나, 공식 정의는 "프랜차이즈 본부 주도형 가맹점 지원 플랫폼"
2. **Market Trial/이벤트 부재**: 설문·퀴즈·이벤트 기반 마케팅 수익 구조가 전혀 구현되지 않음
3. **포럼 위상 저하**: 핵심 운영 허브가 아닌 단순 커뮤니티로 위치
4. **한국당뇨협회 연계 부재**: 공식 정의의 협력 체계가 UI에 반영되지 않음

---

## 2. 프론트엔드 실체 조사 (Fact Check)

### 2.1 앱/페이지 목록

| 영역 | 경로 | 페이지 | 상태 |
|------|------|--------|------|
| **Public** | `/` | HomePage | 활성 |
| | `/login` | LoginPage | 활성 |
| | `/register` | RegisterPage | 활성 |
| | `/role-select` | RoleSelectPage | 활성 |
| | `/forum` | ForumPage | 활성 |
| | `/forum/request-category` | RequestCategoryPage | 활성 |
| | `/forum/my-requests` | MyRequestsPage | 활성 |
| | `/education` | EducationPage | 활성 |
| | `/contact` | ContactPage | 활성 |
| | `/apply` | PharmacyApplyPage | 활성 |
| | `/apply/my-applications` | MyApplicationsPage | 활성 |
| | `/mypage` | MyPage | 보호됨 |
| **Pharmacy** | `/pharmacy` | PharmacyDashboard | 보호됨 |
| | `/pharmacy/products` | PharmacyProducts | 보호됨 |
| | `/pharmacy/orders` | PharmacyOrders | 보호됨 |
| | `/pharmacy/patients` | PharmacyPatients | 보호됨 |
| | `/pharmacy/smart-display` | SmartDisplayPage | 보호됨 |
| | `/pharmacy/smart-display/*` | Playlists/Schedules/Media/Forum | 보호됨 |
| | `/pharmacy/settings` | PharmacySettings | 보호됨 |
| **Operator** | `/operator` | OperatorDashboard | 보호됨 |
| | `/operator/applications` | ApplicationsPage | 보호됨 |
| | `/operator/applications/:id` | ApplicationDetailPage | 보호됨 |
| | `/operator/forum-requests` | ForumRequestsPage | 보호됨 |
| **Store (B2C)** | `/store/:pharmacyId` | StoreFront | 공개 |
| | `/store/:pharmacyId/products` | StoreProducts | 공개 |
| | `/store/:pharmacyId/products/:id` | StoreProductDetail | 공개 |
| | `/store/:pharmacyId/cart` | StoreCart | 공개 |
| **Redirect** | `/supplier`, `/partner` | RoleNotAvailablePage | Neture 이전 안내 |

### 2.2 라우팅 구조

```
/ (MainLayout)
├── Public Pages (인증 불필요)
│   ├── 홈/로그인/회원가입
│   ├── 포럼/교육
│   └── 가입신청
│
├── /pharmacy (DashboardLayout - pharmacy role)
│   ├── 대시보드
│   ├── 상품/주문/고객 관리
│   └── 스마트 디스플레이
│
├── /operator (DashboardLayout - operator role)
│   ├── 대시보드
│   ├── 신청/포럼 관리
│   └── 회원 관리
│
├── /store/:pharmacyId (StoreLayout)
│   └── 소비자 쇼핑 영역
│
└── /supplier, /partner → RoleNotAvailablePage (Neture 안내)
```

### 2.3 파트너/공급자 관련 화면 잔존 여부

| 항목 | 상태 | 비고 |
|------|------|------|
| `/supplier` 라우트 | ✅ 정상 처리 | RoleNotAvailablePage로 Neture 안내 |
| `/partner` 라우트 | ✅ 정상 처리 | RoleNotAvailablePage로 Neture 안내 |
| DashboardLayout 내 supplier/partner config | ⚠️ 잔존 | 사용되지 않지만 코드 존재 |
| HomePage 내 공급자/파트너 CTA | ⚠️ 잔존 | 회원가입으로 연결됨 (의도 불명확) |

---

## 3. 핵심 3대 기능 축 적합성 평가

### 3.1 포럼

| 평가 항목 | 현재 상태 | 적합성 |
|-----------|-----------|--------|
| 단일 게시판 구조 여부 | 단일 게시판 (카테고리 필터) | ✅ |
| 참여 주체 표현 방식 | "약사" 역할 중심 | 🔧 부분 적합 |
| Home에서의 노출 위상 | 하단 Resources 섹션 (2개 중 1개) | ❌ 저평가 |
| "운영 허브" 기능 여부 | 지식 공유 커뮤니티로만 기능 | ❌ 미달 |

**문제점**:
- 공식 정의에서 포럼은 "가맹점 참여형 운영 허브"로서 3대 핵심 기능 중 하나
- 현재는 단순 "약사들의 지식과 경험 나눔" 커뮤니티로 위치
- "본부 주도" 관점이 전혀 반영되지 않음
- 포럼 신청 기능은 있으나, 본부-가맹점 관계 구조 없음

**구조 수정 필요 사항**:
- Home에서 포럼의 위상 상향 (핵심 기능으로)
- 본부 공지/가이드라인 섹션 추가
- 가맹점 참여 인센티브 구조 도입

### 3.2 디지털 사이니지 (스마트 디스플레이)

| 평가 항목 | 현재 상태 | 적합성 |
|-----------|-----------|--------|
| 관리/전시 화면 구분 | ✅ 명확히 분리됨 | ✅ |
| 콘텐츠 출처 구조 | 가맹점 직접 업로드만 | 🔧 부분 적합 |
| 가맹점 "활용 도구" 인식 | "약국 TV 홍보 영상 관리" | ✅ |
| 광고 송출 오해 소지 | "홍보 영상"으로 명명 | 🔧 경계 |

**구현 상태**:
- `/pharmacy/smart-display` - 관리 메인
- `/pharmacy/smart-display/playlists` - 플레이리스트 관리
- `/pharmacy/smart-display/schedules` - 스케줄 관리
- `/pharmacy/smart-display/media` - 미디어 라이브러리
- `/pharmacy/smart-display/forum` - 플레이리스트 공유 포럼

**문제점**:
- **본부/공급자 콘텐츠 제공 구조 부재**: 현재 가맹점이 직접 YouTube/Vimeo URL을 입력하는 구조
- 공식 정의: "공급자·본부 콘텐츠를 편집·활용"
- 현재: "YouTube/Vimeo 영상을 추가하세요"

**구조 수정 필요 사항**:
- 본부 제공 콘텐츠 라이브러리 추가
- 공급자 콘텐츠 연동 구조 추가
- 가맹점 "편집/커스터마이즈" 기능 강화

### 3.3 Market Trial / 이벤트

| 평가 항목 | 현재 상태 | 적합성 |
|-----------|-----------|--------|
| 명시적 개념/메뉴 존재 | **없음** | ❌ 부재 |
| 참여 구조 | **없음** | ❌ 부재 |
| 마케팅 수익 연결 흐름 | **없음** | ❌ 부재 |

**치명적 부재**:
공식 정의의 핵심 구성요소인 "설문·퀴즈 등 이벤트 참여를 통해 판매 및 마케팅 수익을 창출"이 전혀 구현되지 않음.

현재 프론트엔드에서 관련 키워드 검색 결과:
- "Trial": 없음
- "이벤트": 없음 (웨비나 등록만 존재)
- "설문": 없음
- "퀴즈": 없음
- "마케팅": 없음

**신규 구현 필요**:
- Market Trial 개념 도입
- 이벤트/설문/퀴즈 시스템
- 참여 인센티브 구조
- 마케팅 수익 대시보드

---

## 4. B2B/B2C 구조 평가

### 4.1 현재 구조

| 영역 | 경로 | 대상 | 특성 |
|------|------|------|------|
| B2B | `/pharmacy/*` | 약국(가맹점) | 상품/주문/고객 관리 |
| B2C | `/store/:pharmacyId/*` | 소비자 | 가맹점별 온라인 스토어 |

### 4.2 공식 정의와의 비교

| 공식 정의 | 현재 구현 | 적합성 |
|-----------|-----------|--------|
| 일반 B2B 유통 | PharmacyProducts (상품 관리) | 🔧 부분 적합 |
| 혈당관리 약국 전용 B2B | 구분 없음 | ❌ 미구현 |
| B2C: 무재고 판매 | StoreFront/StoreProducts | 🔧 부분 적합 |
| B2C: 키오스크 | 없음 | ❌ 미구현 |
| B2C: QR 주문 | 없음 | ❌ 미구현 |

### 4.3 "가맹점 실행 결과" 인식 여부

현재 `/store/:pharmacyId` 구조는 가맹점별 스토어로 설계되어 있어 기본 구조는 적합함.

그러나:
- **무재고 판매 개념 미반영**: 재고 관리가 가맹점 측에 있는 것처럼 보임
- **키오스크 모드 부재**: 매장 내 터미널 UI 없음
- **QR 주문 부재**: QR 코드 기반 주문 진입점 없음

---

## 5. 톤앤매너/메시지 정합성 조사

### 5.1 의료/상담 서비스 오해 요소

| 항목 | 현재 상태 | 위험도 |
|------|-----------|--------|
| "환자" 용어 사용 | PharmacyPatients, "당뇨 환자 상담" | ⚠️ 중간 |
| 의료 그래프/차트 | 최소화됨 (Activity 아이콘 정도) | ✅ 낮음 |
| 상담 서비스 암시 | "약사 상담 제공", "혈당관리 전문" | ⚠️ 중간 |

### 5.2 헬스케어 UI 과잉 여부

| 항목 | 현재 상태 | 평가 |
|------|-----------|------|
| 혈당 그래프 | 없음 | ✅ 적합 |
| 의료 대시보드 스타일 | 일반 비즈니스 대시보드 | ✅ 적합 |
| 색상 톤 | Primary Blue + Neutral | ✅ 적합 |

### 5.3 공공성/신뢰성 톤

| 항목 | 현재 상태 | 적합성 |
|------|-----------|--------|
| 한국당뇨협회 연계 표시 | **없음** | ❌ 누락 |
| 공식 파트너 표시 | Mock 데이터 (Abbott, Dexcom 등) | 🔧 확인 필요 |
| 인증/검증 마크 | 없음 | 🔧 고려 필요 |

**문제점**:
공식 정의에 명시된 "(사)한국당뇨협회와의 협력 체계"가 UI 어디에도 반영되지 않음.

---

## 6. 리팩토링 필요성 판단

### 6.1 영역별 분류

| 영역 | 판정 | 사유 |
|------|------|------|
| **HomePage** | 🔧 구조 수정 | 서비스 정체성·핵심 기능 위상 재정립 필요 |
| **ForumPage** | 🔧 구조 수정 | 운영 허브로서의 위상 강화 필요 |
| **SmartDisplayPage** | 🔧 구조 수정 | 본부/공급자 콘텐츠 출처 추가 필요 |
| **Market Trial** | ❌ 신규 필요 | 핵심 기능 완전 부재 |
| **PharmacyDashboard** | ✅ 유지 가능 | 기본 구조 적합 |
| **PharmacyProducts** | 🔧 구조 수정 | 일반B2B/약국전용B2B 구분 필요 |
| **StoreFront** | 🔧 구조 수정 | 무재고/키오스크/QR 모드 추가 필요 |
| **EducationPage** | ✅ 유지 가능 | 교육 자료 기능 적합 |
| **RoleNotAvailablePage** | ✅ 유지 가능 | Neture 연계 적합 |
| **OperatorDashboard** | ✅ 유지 가능 | 운영 관리 기본 구조 적합 |

### 6.2 우선순위별 정리

**긴급 (핵심 정체성 문제)**:
1. Market Trial/이벤트 시스템 신규 구현
2. HomePage 서비스 정체성 재정립
3. 한국당뇨협회 협력 체계 반영

**중요 (핵심 기능 보완)**:
1. 포럼 운영 허브 위상 강화
2. 스마트 디스플레이 콘텐츠 출처 구조 추가
3. B2B 유통 구분 (일반/약국전용)

**보완 (B2C 기능)**:
1. 키오스크 모드 추가
2. QR 주문 진입점 추가
3. 무재고 판매 개념 명확화

---

## 7. 리팩토링 전제 조건 정리

### 7.1 명확화 필요 사항

본격적인 리팩토링 전에 다음 사항에 대한 기획 확정이 필요함:

1. **Market Trial 상세 기획**
   - 어떤 유형의 이벤트를 지원할 것인가? (설문/퀴즈/Trial 참여 등)
   - 마케팅 수익 구조는 어떻게 동작하는가?
   - 공급자-본부-가맹점 간 역할 분담은?

2. **본부-가맹점 관계 구조**
   - 본부는 어떤 UI를 통해 관리하는가? (별도 Admin? Operator 확장?)
   - 가맹점이 본부 콘텐츠를 어떻게 수신/활용하는가?
   - 프랜차이즈 정책 관리 구조는?

3. **한국당뇨협회 연계 범위**
   - 로고/인증마크 노출 위치
   - 협회 콘텐츠 연동 여부
   - 회원 연계 여부

4. **B2C 판매 모드 상세**
   - 키오스크 모드 진입 조건/URL 구조
   - QR 코드 생성/배포 방식
   - 무재고 판매 시 재고 연동 방식

### 7.2 기술적 전제 조건

1. **API 정의 필요**: Market Trial, 본부 콘텐츠 등 신규 기능에 대한 백엔드 API
2. **타입 정의 확장**: 현재 `types/index.ts`에 없는 새 도메인 타입
3. **라우팅 구조 확장**: Market Trial, 키오스크 모드 등 신규 라우트

---

## 8. 결론

현재 GlycoPharm 프론트엔드는 **"약국 전용 B2B 마켓플레이스"**로 구현되어 있으나,
공식 서비스 정의는 **"프랜차이즈 본부 주도형 가맹점 지원 플랫폼"**이다.

이 구조적 불일치를 해소하기 위해서는:

1. **Market Trial/이벤트 시스템 신규 구현** (핵심 부재)
2. **서비스 정체성 메시지 재정립** (HomePage, 헤더 등)
3. **포럼의 운영 허브화** (커뮤니티 → 본부-가맹점 소통 채널)
4. **스마트 디스플레이 콘텐츠 출처 다변화** (본부/공급자 콘텐츠)
5. **한국당뇨협회 협력 체계 UI 반영**

현재 기반 코드는 기술적으로 양호하나, **서비스 정체성과 핵심 기능 구조의 재설계**가 필요하다.

---

*조사 완료: 2026-01-05*
*다음 단계: 기획 확정 후 리팩토링 Work Order 작성*
