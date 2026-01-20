# Digital Signage - Extension Boundaries V3 (Final)

> **Phase:** 3 Design
> **Status:** FROZEN
> **Date:** 2025-01-20
> **Authority:** 이 문서는 Phase 3 구현의 기준이며, 변경 시 Work Order 필요

---

## 1. 문서 상태

| Status | Description |
|--------|-------------|
| **FROZEN** | 설계 확정, 구현 시 변경 금지 |

이 문서에서 정의된 Extension 책임/경계는 **구현 단계에서 변경할 수 없습니다.**
변경이 필요한 경우 별도 Work Order를 통해 승인받아야 합니다.

---

## 2. Core vs Extension 경계 (확정)

### 2.1 Core의 책임 (Phase 2 - 불변)

```
┌─────────────────────────────────────────────────────────────┐
│                         CORE (FROZEN)                        │
├─────────────────────────────────────────────────────────────┤
│  SignagePlaylist        │ 재생목록 기본 구조                  │
│  SignagePlaylistItem    │ 재생목록 항목                       │
│  SignageMedia           │ 미디어 파일 관리                    │
│  SignageSchedule        │ 스케줄 관리                         │
│  SignageTemplate        │ 템플릿 기본 구조                    │
│  SignageLayoutPreset    │ 레이아웃 프리셋                     │
│  SignageContentBlock    │ 콘텐츠 블록                         │
│  Player Engine          │ 재생 및 Merge                       │
│  Global Content Flow    │ HQ/Supplier/Community               │
└─────────────────────────────────────────────────────────────┘
```

**Core 수정 금지 사항:**
- Entity 필드 추가/삭제 ❌
- API 엔드포인트 변경 ❌
- Player Merge 로직 변경 ❌
- Role Middleware 변경 ❌

### 2.2 Extension의 책임 (확정)

```
┌─────────────────────────────────────────────────────────────┐
│                      EXTENSION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  Domain Entity          │ 산업별 데이터 모델                  │
│  Domain Template        │ 산업별 템플릿 프리셋                │
│  Domain Content         │ 산업별 콘텐츠 자동 생성             │
│  Domain Supplier        │ 산업별 공급자 연결                  │
│  Domain AI              │ 산업별 AI 콘텐츠 생성               │
│  Domain Analytics       │ 산업별 분석 (선택)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Extension별 책임 확정

### 3.1 signage-pharmacy-extension (P1)

**해결하는 문제:**
> 약국/드럭스토어에서 계절성 건강 콘텐츠, 복약 안내, OTC 프로모션을
> 효과적으로 표시하기 위한 특화 기능 제공

**책임 범위 (확정):**

| Responsibility | Description | Modifiable by Store |
|----------------|-------------|---------------------|
| OTC 카테고리 관리 | 의약품/건기식 분류 체계 | ❌ |
| 계절성 캠페인 | 시즌별 건강 콘텐츠 | ❌ (Clone만 가능) |
| 복약 안내 템플릿 | 표준화된 복약지도 | ❌ |
| 건강 정보 슬라이드 | 약사 전용 건강 팁 | ❌ |
| 약국 이벤트 템플릿 | 세일/프로모션 | ✅ (Clone 후 편집) |
| 상품 카드 자동 생성 | AI 기반 OTC 카드 | ✅ |

**Core 사용 목록:**
- `SignagePlaylist` - 재생목록 생성
- `SignageMedia` - 미디어 저장
- `SignageTemplate` - 기본 템플릿 참조
- Global Content Flow - `pharmacy-hq` source

**Force 권한:**
- `pharmacy-hq` source의 `isForced=true` 허용
- 복약 안내, 법적 고지 등 필수 콘텐츠

---

### 3.2 signage-cosmetics-extension (P2)

**해결하는 문제:**
> 화장품 매장에서 브랜드 콘텐츠, 신제품 출시, 트렌드 정보를
> 시각적으로 매력적인 방식으로 표시

**책임 범위 (확정):**

| Responsibility | Description | Modifiable by Store |
|----------------|-------------|---------------------|
| 브랜드 콘텐츠 수신 | 공급자 자동 연동 | ❌ |
| 신제품 출시 카드 | 제품 런칭 템플릿 | ❌ (Clone만 가능) |
| 트렌드 카드 | 시즌 컬러/스타일 | ❌ |
| 룩북 구성 | 제품 조합 표시 | ✅ (Clone 후 편집) |
| 뷰티 팁 콘텐츠 | 스킨케어/메이크업 | ✅ |

**Core 사용 목록:**
- `SignagePlaylist` - 재생목록 생성
- `SignageMedia` - 미디어 저장
- `SignageTemplate` - 기본 템플릿 참조
- Global Content Flow - `cosmetics-brand` source

**Force 권한:**
- `cosmetics-brand` source의 `isForced=true` **불허용**
- 브랜드 콘텐츠는 강제 아닌 권장 수준

---

### 3.3 signage-seller-promo-extension (P3)

**해결하는 문제:**
> 파트너/셀러가 직접 프로모션 콘텐츠를 제작하고
> 성과를 추적할 수 있는 셀프서비스 제공

**책임 범위 (확정):**

| Responsibility | Description | Modifiable by Store |
|----------------|-------------|---------------------|
| 프로모션 카드 | 제품 홍보 카드 | N/A (파트너 제작) |
| 셀프 편집 템플릿 | 제한된 필드 편집 | N/A |
| 성과 추적 | 노출/전환 분석 | N/A |
| 파트너 설정 | 브랜딩 커스터마이즈 | N/A |

**Core 사용 목록:**
- `SignagePlaylist` - 재생목록 생성
- `SignageMedia` - 미디어 저장
- Global Content Flow - `seller-partner` source

**Force 권한:**
- **불허용** - 파트너 콘텐츠는 강제 불가

**특이사항:**
- 파트너가 직접 Workspace 사용
- Store가 아닌 Partner가 콘텐츠 제작 주체
- Analytics 연동 필수

---

### 3.4 signage-tourist-extension (P4)

**해결하는 문제:**
> 관광지/면세점에서 다국어 콘텐츠와 지역 행사 정보를
> 자동으로 생성하고 표시

**책임 범위 (확정):**

| Responsibility | Description | Modifiable by Store |
|----------------|-------------|---------------------|
| 다국어 콘텐츠 | AI 자동 번역 | ✅ (검수 후) |
| 명소 카드 | 관광지 정보 자동 생성 | ❌ |
| 행사 스케줄 | 지역 행사 연동 | ❌ |
| 환율 표시 | 실시간 환율 | ❌ |

**Core 사용 목록:**
- `SignagePlaylist` - 재생목록 생성
- `SignageMedia` - 미디어 저장
- Global Content Flow - `tourism-authority` source

**Force 권한:**
- **불허용**

**구현 상태:**
- 설계만 확정, 구현은 P4 (보류)

---

## 4. Extension 간 의존 규칙 (확정)

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPENDENCY RULES (FROZEN)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ ALLOWED:                                                 │
│     Extension → Core API                                     │
│     Extension → Core Entity (ID 참조만)                      │
│     Extension → Global Content Flow                          │
│                                                              │
│  ❌ FORBIDDEN:                                               │
│     Extension A → Extension B                                │
│     Extension → Core Entity 수정                             │
│     Extension → Core API 수정                                │
│     Extension → Player 로직 수정                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 스키마 분리 (확정)

| Extension | Schema | Prefix |
|-----------|--------|--------|
| Pharmacy | `signage_pharmacy` | `pharmacy_` |
| Cosmetics | `signage_cosmetics` | `cosmetics_sg_` |
| Seller | `signage_seller` | `seller_` |
| Tourist | `signage_tourist` | `tourist_` |

**규칙:**
- 각 Extension은 독립 스키마 사용
- Core 스키마(`public`)에 테이블 생성 금지
- Extension 간 스키마 참조 금지

---

## 6. API 경로 규칙 (확정)

```
Core:      /api/signage/:serviceKey/...
Pharmacy:  /api/signage/:serviceKey/ext/pharmacy/...
Cosmetics: /api/signage/:serviceKey/ext/cosmetics/...
Seller:    /api/signage/:serviceKey/ext/seller/...
Tourist:   /api/signage/:serviceKey/ext/tourist/...
```

**규칙:**
- Extension API는 `/ext/{name}/` prefix 필수
- Core API 경로 사용 금지
- 각 Extension은 자체 Controller/Service 구현

---

## 7. Role 확장 (확정)

| Role | Scope | Extensions |
|------|-------|------------|
| `signage:operator` | Core HQ | 모든 Extension 관리 |
| `signage:pharmacy:operator` | Pharmacy | Pharmacy만 |
| `signage:cosmetics:operator` | Cosmetics | Cosmetics만 |
| `signage:seller:partner` | Seller | 자신의 콘텐츠만 |
| `signage:tourist:operator` | Tourist | Tourist만 |

---

## 8. 변경 관리

### 8.1 이 문서 변경 절차

1. 변경 필요성 발생
2. Work Order 작성 (WO-SIGNAGE-BOUNDARY-CHANGE-*)
3. 영향도 분석 (Core 영향 여부)
4. 승인 후 문서 수정
5. 관련 코드 수정

### 8.2 변경 금지 항목

- Core ↔ Extension 경계선
- Extension 간 의존 금지 규칙
- 스키마 분리 정책
- Force 권한 정책

---

## 9. 체크리스트

구현 시작 전 확인:

- [ ] Extension이 Core를 수정하지 않음
- [ ] Extension이 다른 Extension에 의존하지 않음
- [ ] 독립 스키마 사용
- [ ] `/ext/{name}/` 경로 사용
- [ ] Force 권한 규칙 준수

---

*Document: EXTENSION-BOUNDARIES-V3.md*
*Status: FROZEN*
*Phase 3 Design*
