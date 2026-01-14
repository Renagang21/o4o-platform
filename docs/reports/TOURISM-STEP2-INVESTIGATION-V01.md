# Tourism Step 2 Investigation Report

> **Work Order**: WO-O4O-TEST-ENV-STEP2-V01
> **작성일**: 2026-01-11
> **상태**: ✅ **Planned (미구현)**
> **조사 목적**: 주문/예약 소유권 및 외부 서비스 연계 여부 규명

---

## 🎯 핵심 발견 사항 (Executive Summary)

### ✅ **서비스 상태: Planned (Template만 존재)**

```
┌─────────────────────────────────────────────────────────┐
│ **Tourism은 아직 구현되지 않음**                          │
│ Service Template과 InitPack만 존재                       │
└─────────────────────────────────────────────────────────┘
```

| 항목 | 현재 상태 | 비고 |
|------|-----------|------|
| 서비스 상태 | **Planned** | Template만 존재 |
| Entity | ❌ 없음 | 구현 안 됨 |
| API | ❌ 없음 | 구현 안 됨 |
| Frontend | ❌ 없음 | 구현 안 됨 |
| DB 테이블 | ❌ 없음 | Migration 없음 |

### 서비스 정체성 판정

```
⏸️ 구현 전 단계 - 설계 의도만 존재
```

**설계 의도** (Template 기준):
- 여행 상품 정보 제공
- 리테일 연동 (Dropshipping-Core 사용)
- 예약 시스템 (구체적 내용 없음)
- 다국어 및 위치 서비스 지원

---

## 📋 Step 2 체크리스트 결과

### ✅ A. 서비스 정체성 (Identity Check)

#### A-1. 서비스 정의 (Template 기준)

**발견 사항**:

```json
// apps/api-server/src/service-templates/templates/tourist-service.json
{
  "id": "tourist-service",
  "label": "Tourist Service",
  "description": "관광객 서비스 - 여행 상품, 리테일 연동, 예약 시스템",
  "serviceGroup": "tourist",
  "coreApps": [
    "dropshipping-core"
  ],
  "extensionApps": [
    "signage"
  ],
  "globalCoreApps": [
    "cms-core",
    "organization-core"
  ]
}
```

**설계 의도 분석**:
1. **핵심 기능** (Template 기준):
   - 여행 상품 정보 제공 (콘텐츠)
   - 리테일 연동 (Dropshipping-Core 의존)
   - 예약 시스템 (구체적 구현 없음)
   - 다국어/위치 서비스

2. **의존 Core Apps**:
   - `dropshipping-core` → S2S 상품 공급 의도
   - `cms-core` → 콘텐츠 관리
   - `organization-core` → 조직/테넌트 관리

**정의문** (설계 의도 기준):
> "Tourism은 **여행 정보 콘텐츠**를 중심으로 한 **리테일 연동형** 서비스이다."

**판정**: ⏸️ **미구현** (설계 의도만 존재)

---

#### A-2. 단독 실행 가능성

**현재 상태**:
- ❌ **구현 없음** → 실행 불가
- ⏸️ Template 설치 가능 (InitPack 존재)

**판정**: ❌ 미구현으로 판정 불가

---

### ❌ B. E-commerce Core 의존성 (핵심 ①)

#### B-1. 주문/예약 엔티티 존재 여부

**조사 결과**:

```bash
# Entity 파일 검색
find apps/api-server/src -name "*.entity.ts" | xargs grep -l "tourism\|tourist"
→ No results

# Migration 검색
find apps/api-server/src/migrations -name "*.ts" | xargs grep -l "tourism\|tourist"
→ No results
```

**판정**:
- ❌ **Tourism 전용 주문/예약 테이블 없음**
- ❌ **구현 자체가 없음**

---

#### B-2. 주문/예약 소유권

**발견**:
- ❌ **Tourism이 주문/예약을 생성하지 않음** (코드 없음)
- ⏸️ **설계 의도**: Dropshipping-Core 의존 → S2S 모델 추정

**판정**: ⏸️ 미구현으로 판정 불가

---

### ⏸️ C. 외부 서비스 연계 (핵심 ②)

#### C-1. 외부 예약/결제 서비스

**조사 결과**:
- ❌ **외부 OTA/예약 서비스 연계 코드 없음**
- ❌ **외부 API 연동 코드 없음**

**판정**: ⏸️ 미구현

---

#### C-2. 외부 서비스 미존재 시 영향

**판정**: ⏸️ 미구현으로 판정 불가

---

### ✅ D. Neture / Cosmetics / S2S 의존성

#### D-1. Neture
- ❌ **의존성 없음** (코드 없음)

#### D-2. Cosmetics
- ❌ **의존성 없음** (코드 없음)

#### D-3. Dropshipping(S2S)
- ⏸️ **Template 의존성 존재**
  ```json
  "coreApps": ["dropshipping-core"]
  ```
- ❌ **실제 구현 코드 없음**

**판정**: ⏸️ **Template 수준 의존성만 존재**

---

### ⏸️ E. 데이터 및 책임 범위

#### E-1. Tourism이 소유하는 데이터

**설계 의도** (InitPack 기준):

```json
// tourist-service-init.json
"defaultCategories": [
  {
    "slug": "nature",
    "name": "자연/힐링",
    "description": "자연 속 힐링 여행지",
    "cptSlug": "destination"
  },
  {
    "slug": "culture",
    "name": "문화/역사",
    "cptSlug": "destination"
  },
  {
    "slug": "food",
    "name": "맛집/음식",
    "cptSlug": "destination"
  },
  {
    "slug": "activity",
    "name": "액티비티",
    "cptSlug": "tour"
  }
]
```

**추정 데이터 소유**:
- ⏸️ 여행지 정보 (destination)
- ⏸️ 투어/체험 정보 (tour)
- ⏸️ 카테고리/메타데이터

**실제 구현**: ❌ 없음

---

#### E-2. Tourism이 소유하지 말아야 할 책임

**설계 의도 분석**:
- ⏸️ **결제**: Dropshipping-Core → E-commerce Core 경유 추정
- ⏸️ **환불**: E-commerce Core 담당 추정
- ⏸️ **정산**: Dropshipping-Core Settlement 추정

**위반 여부**: ⏸️ 미구현으로 판정 불가

---

### ❌ F. 테스트 환경 관점

#### F-1. 단독 테스트 가능성

**현재 상태**:
- ❌ **구현 없음**
- ✅ **Template 설치 가능**
- ⚠️ **InitPack 실행 가능** (메뉴/카테고리/테마만)

**테스트 가능 범위**:
```
✅ Service Template 설치
✅ InitPack 메뉴/카테고리 생성
❌ API 테스트 (구현 없음)
❌ 화면 테스트 (Frontend 없음)
❌ 주문/예약 테스트 (구현 없음)
```

**판정**: ❌ **기능 테스트 불가** (Template만 존재)

---

#### F-2. 테스트 차단 요소

**현재 차단 요소**:
1. ❌ **Entity 미구현**
2. ❌ **API 미구현**
3. ❌ **Frontend 미구현**
4. ❌ **Migration 미구현**

---

## 📊 서비스 정보 요약

### 기본 정보
| 항목 | 값 |
|------|-----|
| **서비스 ID** | `tourist` |
| **서비스 상태** | **Planned** (개발중) |
| **Template** | ✅ 존재 (`tourist-service.json`) |
| **InitPack** | ✅ 존재 (`tourist-service-init.json`) |
| **Core App** | ❌ 없음 (미구현) |
| **Frontend** | ❌ 없음 (미구현) |
| **DB 테이블** | ❌ 없음 (Migration 없음) |

### 설계 의도 (Template 기준)
```json
{
  "coreApps": ["dropshipping-core"],
  "extensionApps": ["signage"],
  "globalCoreApps": ["cms-core", "organization-core"],
  "defaultSettings": {
    "enableMultiLanguage": true,
    "enableLocationServices": true
  }
}
```

**추정 아키텍처**:
```
Tourism (콘텐츠)
    ↓
Dropshipping-Core (상품 공급)
    ↓
E-commerce Core (주문/결제)
```

### InitPack 기능
```
✅ 메뉴 생성 (여행지, 투어/체험, 숙소, 교통, 여행후기)
✅ 카테고리 생성 (자연, 문화, 맛집, 액티비티, 쇼핑)
✅ 테마 설정 (옐로우/네이비 테마)
✅ 기본 페이지 (홈, 소개, 문의)
✅ 권한 설정 (방문자, 회원)
```

### 존재하지 않는 구현
```
❌ Tourism Entity
❌ Tourism API Controller
❌ Tourism Service
❌ Tourism Frontend
❌ DB Migration
```

---

## 🔍 의존성 맵 (Dependency Map)

### 설계 의도 (Template 기준)

```
┌─────────────────────────────────────────────────────┐
│              E-commerce Core                         │
│  (주문/결제 원장 - Source of Truth)                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────┐
│              Dropshipping-Core                       │
│  (S2S 상품 공급 엔진)                                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────┐
│              Tourism (미구현)                        │
│  (여행 정보 콘텐츠 서비스)                            │
│                                                      │
│  ⏸️ Template/InitPack만 존재                        │
│  ❌ Entity/API/Frontend 없음                        │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│         CMS-Core (콘텐츠 관리)                       │
│         Organization-Core (조직/테넌트)              │
│         Signage (디지털 사이니지 - Extension)         │
└─────────────────────────────────────────────────────┘
```

**의존 방향** (설계 의도):
- Tourism → Dropshipping-Core (상품 공급)
- Tourism → CMS-Core (콘텐츠)
- Tourism → Organization-Core (조직)
- Tourism → Signage (Extension)
- ❌ Tourism → E-commerce Core (직접 의존 없음, Dropshipping-Core 경유)
- ❌ Tourism → Neture (의존 없음)
- ❌ Tourism → Cosmetics (의존 없음)
- ❌ Tourism → Yaksa (의존 없음)

---

## ✅ 구조 위험 신호 (Critical Issues)

### 1. 미구현 상태
```
⏸️ Tourism은 아직 구현되지 않음
✅ Template과 InitPack만 존재
```

**판정**: ✅ **구조 위험 없음** (구현 전 단계)

---

### 2. 설계 의도 분석

**긍정적 설계**:
- ✅ **Dropshipping-Core 의존** → S2S 모델 준수
- ✅ **E-commerce Core 직접 의존 없음** → 계층 분리
- ✅ **콘텐츠 중심** → CMS-Core 활용

**주의 필요**:
- ⚠️ **예약 시스템 구체성 부족**
  - Template에 "예약 시스템" 언급
  - 실제 구현 방법 명시 없음
  - E-commerce Core 사용 여부 불명확

**권장 사항**:
- ✅ Dropshipping-Core를 통한 상품 공급 유지
- ✅ E-commerce Core를 통한 주문/결제 처리
- ⚠️ 예약 시스템은 E-commerce Core의 OrderType.TOURISM으로 처리

---

### 3. 잠재적 위험 (구현 시 주의)

**GlycoPharm 패턴 반복 위험**:
```
❌ Tourism 자체 주문/예약 Entity 생성 금지
❌ Tourism 자체 결제 처리 금지
✅ E-commerce Core 경유 필수
```

**권장 구현 패턴**:
```typescript
// ❌ 금지 패턴 (GlycoPharm처럼 하지 말 것)
@Entity('tourism_orders')
export class TourismOrder {
  // 독립 주문 Entity - 금지!
}

// ✅ 권장 패턴
// 1. Tourism은 콘텐츠만 소유
@Entity('tourism_destinations')
export class TourismDestination {
  id: string;
  name: string;
  description: string;
  // ... 콘텐츠 정보만
}

// 2. 주문은 E-commerce Core에 위임
// OrderType.TOURISM으로 구분
```

---

## ⚠️ 권장 조치 (Recommendations)

### 구현 시 준수 사항 (미래)

1. **E-commerce Core 통합 필수**
   - OrderType.TOURISM 추가
   - 예약 = 주문으로 처리
   - Tourism은 콘텐츠만 소유

2. **Dropshipping-Core 활용**
   - S2S 모델로 여행 상품 공급
   - Tourism은 Listing만 소유
   - OrderRelay를 통한 주문 이행

3. **콘텐츠 중심 유지**
   - CMS-Core 활용
   - 여행지/투어 정보는 CPT로 관리
   - Commerce는 E-commerce Core에 위임

### 즉시 조치 (현재)

1. **문서화**
   - Tourism 구현 가이드라인 작성
   - E-commerce Core 통합 필수 명시
   - GlycoPharm 패턴 반복 금지 명시

2. **Template 검토**
   - "예약 시스템" 구체화
   - E-commerce Core 의존성 명시
   - InitPack 기능 범위 명확화

---

## 🎯 테스트 환경 준비 권장사항

### 현재 단계 (Template만 존재)

1. **Template 설치 테스트**
   - Service Template 설치 가능 여부
   - InitPack 실행 가능 여부
   - 메뉴/카테고리 생성 확인

2. **의존성 검증**
   - Dropshipping-Core 설치 여부
   - CMS-Core 활성화 여부
   - Organization-Core 활성화 여부

### 구현 시 테스트 계획 (미래)

#### Phase 1: 콘텐츠 테스트
1. CMS-Core 활성화
2. Tourism Destination CPT 생성
3. Tourism Tour CPT 생성
4. 콘텐츠 CRUD 테스트

#### Phase 2: S2S 통합 테스트
1. Dropshipping-Core 활성화
2. Tourism Supplier 생성
3. Tourism Product Master 생성
4. Tourism Listing 생성

#### Phase 3: E-commerce 통합 테스트
1. E-commerce Core 활성화
2. OrderType.TOURISM 추가
3. 예약(주문) 생성 테스트
4. 결제 처리 테스트

---

## 📌 조사 결론 (Conclusion)

### 핵심 발견

1. **Tourism은 미구현** → Template/InitPack만 존재
2. **설계 의도는 긍정적** → Dropshipping-Core 의존, 콘텐츠 중심
3. **구조 위험 없음** → 구현 전 단계
4. **주의 필요** → 구현 시 GlycoPharm 패턴 반복 금지

### Step 2 판정

#### G-1. 단독 테스트 가능 여부
- ❌ **불가능** (미구현)
- ✅ **Template 설치 가능**

#### G-2. 서비스 성격 (설계 의도)
- ✅ **콘텐츠/중계 중심 서비스** (추정)
- ✅ **E-commerce 소비자** (Dropshipping-Core 경유)
- ❌ 독립 Commerce/예약 엔진 (금지)

#### G-3. 구조 위험 신호
- ✅ **없음** (미구현)
- ⚠️ **잠재적 위험**: 구현 시 GlycoPharm 패턴 반복 가능성

### Step 2 최종 결론 (3문장)

1. Tourism은 **미구현 (Planned)** 서비스이다.
2. 주문/예약/결제에 대해 **E-commerce Core 경유 예정** (설계 의도).
3. 구조적 위험은 **없으나, 구현 시 E-commerce Core 통합 필수**이다.

### 조사 종료 조건 답변

> **"Tourism은 거래/예약의 주인이 아닌,
> 콘텐츠 또는 E-commerce 소비자 서비스인가?"**

**답변**: ⏸️ **판정 보류 (미구현)**
- 설계 의도는 **E-commerce 소비자 (Dropshipping-Core 경유)** 로 보임
- 실제 구현이 없어 확정 불가
- 구현 시 E-commerce Core 통합 필수

---

## 🔜 다음 단계

### 즉시 진행
- ✅ **Tourism Step 2 조사 완료**
- **Step 2 전체 서비스 조사 결과 통합 보고서 작성**

### 조사 완료 현황
- ✅ Neture: Read-Only Hub
- ✅ Cosmetics: 독립 Commerce
- ✅ Yaksa: Forum/Community
- ✅ Dropshipping: S2S 엔진 (E-commerce 결합)
- ✅ GlycoPharm: 독립 Commerce (구조 위험)
- ✅ **Tourism: Planned (미구현, 설계 양호)**

### Step 3 진입 준비
- 구조 위험 조치 방안 확정 (GlycoPharm)
- 테스트 환경 최소 요구사항 정리
- 통합 테스트 시나리오 설계

---

**조사 완료 일시**: 2026-01-11
**조사자**: Claude Code (AI Agent)
**검증 상태**: ✅ **조사 완료 (미구현 확인)**
