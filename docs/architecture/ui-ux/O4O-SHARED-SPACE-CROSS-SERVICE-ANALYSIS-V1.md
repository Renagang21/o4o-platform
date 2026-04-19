# O4O Shared Space Cross-Service Analysis v1

> **연관 문서:**
> - [O4O-SHARED-SPACE-FRAME-PRINCIPLE-V1.md](./O4O-SHARED-SPACE-FRAME-PRINCIPLE-V1.md)
> - [O4O-SHARED-SPACE-STANDARD-BLOCKS-V1.md](./O4O-SHARED-SPACE-STANDARD-BLOCKS-V1.md)

## 1. 목적

3개 서비스(KPA, GlycoPharm, Neture)의 메인 홈 페이지를 Shared Space Standard Blocks 기준으로 분석하여, 공통 패턴과 서비스별 차이를 확정한다.

---

## 2. KPA Society — 분석

### 2.1 현재 블록 구성 (12블록)

```
 1. HeroBannerSection       — CMS 광고 캐러셀
 2. HeroCtaSection          — 환영 메시지 + CTA 3개
 3. TabbedNewsSection       — 공지 | 새소식 | 약사공론 탭
 4. ActivitySection          — 최근 포럼 글 + 추천 콘텐츠
 5. CommunityServiceSection  — 서비스 바로가기 카드 4개
 6. EducationSection         — 강의/교육 요약
 7. SignageSection            — 디지털 사이니지 가로 카드
 8. MarketTrialSection       — 시범판매 CTA (Neture 외부 링크)
 9. AdSection                — 페이지 광고
10. SponsorBar               — 스폰서 로고
11. FooterLinksSection       — 하단 바로가기 링크
12. UtilitySection            — 로그인 패널 + 링크
```

### 2.2 표준 블록 매핑

| 표준 블록 | 매핑 | 상태 |
|-----------|------|------|
| Hero / Summary | HeroBanner + HeroCTA | **충족** — 캐러셀 + 환영 카드 통합 |
| News / Notices | TabbedNewsSection | **충족** — 3탭 통합 |
| Activity | ActivitySection | **충족** — 포럼 글 + 추천 콘텐츠 |
| App Entry | CommunityServiceSection | **충족** — 4개 서비스 카드 |
| Content Highlight | EducationSection | **충족** — 강의 카드 |
| Signage Preview | SignageSection | **충족** — 가로 카드 + 썸네일 |
| CTA / Guidance | MarketTrialSection | **충족** — 외부 CTA 카드 |
| Utility | AdSection + SponsorBar + FooterLinks + UtilitySection | **충족** |

### 2.3 평가

- **잘 맞는 부분:** 5개 필수 블록 모두 충족. 선택 블록(Content, Signage)도 충족. 배치 순서가 표준 흐름과 일치.
- **부족한 부분:** 없음. WO-KPA-HOME-SPACE-FRAME-ALIGNMENT-V1 완료 후 표준 정렬 완료 상태.
- **구조 성격:** 정보 허브형 + 참여 유도형

---

## 3. GlycoPharm — 분석

### 3.1 현재 블록 구성 (10블록)

```
 1. Hero Section             — 제목 + 설명 + CTA 2개 (글 작성, 강좌 신청)
 2. Notice Section           — 공지사항 (최근 5개)
 3. KPI Card Block           — 오늘 글 / 참여자 / 인기 카테고리
 4. Hot Posts Section        — 인기 글 Top 3
 5. Feed Section             — 포럼 글 DataTable (탭 + 정렬)
 6. Ads Section              — 커뮤니티 광고
 7. Content Section          — 최근 콘텐츠 + 추천 콘텐츠
 8. Sponsors Section         — 스폰서 로고
 9. Digital Signage Preview  — 사이니지 미디어 + 플레이리스트
10. Partner Logo Carousel    — 파트너 로고 마키
```

### 3.2 표준 블록 매핑

| 표준 블록 | 매핑 | 상태 |
|-----------|------|------|
| Hero / Summary | Hero Section | **부분 충족** — 제목+CTA 존재하나, 요약 역할 약함 |
| News / Notices | Notice Section | **충족** — 공지 5개 |
| Activity | Hot Posts + Feed | **과잉** — DataTable 피드는 상세 중심 블록에 해당 |
| App Entry | 없음 | **미충족** — 서비스 진입 카드 부재 |
| Content Highlight | Content Section | **충족** — 최근 + 추천 콘텐츠 |
| Signage Preview | Digital Signage Preview | **충족** |
| CTA / Guidance | 없음 | **미충족** — Hero CTA 외 별도 유도 블록 없음 |
| Utility | Ads + Sponsors + Partner Logo | **충족** |

### 3.3 평가

#### 잘 맞는 부분
- Hero 존재 (제목 + CTA)
- News/Notices 존재
- Content Highlight 구분 명확 (최근/추천 분리)
- Signage Preview 존재

#### 부족한 부분
- **KPI 블록 (Block 3):** 제외 대상 블록. 공동 공간에 KPI를 두면 관리형 포털처럼 보임
- **Feed Section (Block 5):** DataTable 기반 상세 목록은 공동 공간의 "요약과 진입" 원칙에 위배. 기능 앱(Forum) 내부 책임
- **App Entry 부재:** 포럼·강의·콘텐츠·사이니지 등으로 진입하는 카드/버튼이 없음
- **CTA / Guidance 부재:** 다음 행동 제안 블록이 없음

#### 구조 성격

**현재:** 운영 도구형 (KPI + DataTable 중심)
**목표:** 실무 커뮤니티 허브형 (요약 + 진입 + 참여 유도)

### 3.4 KPA와 비교

| 항목 | KPA | GlycoPharm | 의도된 차이? |
|------|-----|-----------|------------|
| Hero / Summary | 캐러셀 + CTA 카드 | 제목 + CTA 2개 | 의도된 차이 (CMS 캐러셀 유무) |
| News / Notices | 3탭 통합 | 공지만 | 미의도 — 새소식 탭 추가 가능 |
| Activity | 포럼 + 추천 요약 | KPI + DataTable 피드 | **미의도** — DataTable은 상세 중심 |
| App Entry | 4개 서비스 카드 | 없음 | **미의도** — 추가 필요 |
| CTA / Guidance | MarketTrial CTA | 없음 | **미의도** — 추가 필요 |

---

## 4. Neture — 분석

### 4.1 현재 블록 구성 (9블록)

```
 1. Hero Slider              — CMS 동적 배너 (자동 회전)
 2. Platform Intro Section   — 공급자/파트너 흐름 설명 (정적 2컬럼)
 3. Homepage Ads             — CMS 광고 3컬럼
 4. Market Trial Section     — 모집 중인 시범판매 카드
 5. Latest Updates Section   — 최근 활동 (신규 공급자 + 제휴 요청)
 6. Community Preview        — 포럼 글 + 지식 콘텐츠
 7. Featured Section         — 추천 공급자 + 추천 파트너
 8. Partner Logo Carousel    — CMS 파트너 로고 마키
 9. Home CTA Section         — 공급자/파트너 참여 유도 (다크 배경)
```

### 4.2 표준 블록 매핑

| 표준 블록 | 매핑 | 상태 |
|-----------|------|------|
| Hero / Summary | Hero Slider + Platform Intro | **충족** — 배너 + 플랫폼 설명 통합 |
| News / Notices | 없음 | **미충족** — 공지/뉴스 블록 부재 |
| Activity | Latest Updates | **충족** — 신규 공급자 + 제휴 요청 |
| App Entry | 없음 | **부분 충족** — Home CTA가 공급자/파트너 진입 역할을 하나, 명시적 앱 진입 카드는 아님 |
| Content Highlight | Community Preview | **충족** — 포럼 + 지식 콘텐츠 |
| Signage Preview | 없음 | N/A — 서비스 성격상 해당 없음 |
| Recommendation | Featured Section | **충족** — 추천 공급자/파트너 |
| CTA / Guidance | Market Trial + Home CTA | **강함** — 2개 CTA 블록 (상단 시범판매 + 하단 참여 유도) |
| Utility | Homepage Ads + Partner Logo | **충족** |

### 4.3 평가

#### 잘 맞는 부분
- Hero 구조 매우 명확 (배너 + 플랫폼 설명)
- CTA / Guidance 가장 강함 (Market Trial + Home CTA 이중 구조)
- Recommendation 블록 존재 (Featured Section)
- Activity 자연스러움 (신규 참여자 피드)

#### 부족한 부분
- **News / Notices 부재:** 공지/뉴스/업데이트 블록이 없음
- **App Entry 약함:** 공급자/파트너 페이지 진입이 Home CTA에만 의존. 명시적 서비스 진입 카드 없음

#### 구조 성격

**현재:** 전환 유도형 (CTA 중심)
**표준 보완 시:** 전환 유도형 + 정보 허브형

### 4.4 KPA와 비교

| 항목 | KPA | Neture | 의도된 차이? |
|------|-----|--------|------------|
| Hero / Summary | 캐러셀 + CTA 카드 | 캐러셀 + 플랫폼 설명 | 의도된 차이 (설명 vs CTA 중심) |
| News / Notices | 3탭 통합 | 없음 | **미의도** — 추가 검토 필요 |
| Activity | 포럼 + 추천 | 신규 공급자 + 제휴 | 의도된 차이 (도메인 다름) |
| App Entry | 4개 서비스 카드 | CTA에서 간접 진입 | **미의도** — 명시적 카드 추가 검토 |
| CTA / Guidance | 1개 (하단) | 2개 (상단+하단) | 의도된 차이 (Neture는 CTA 중심) |

---

## 5. 공통 패턴 확정

### 5.1 공통으로 유지해야 할 것

| # | 패턴 | 근거 |
|---|------|------|
| 1 | **Hero / Summary는 항상 존재** | 3개 서비스 모두 Hero 보유. 공동 공간의 첫 인상이자 맥락 제공 |
| 2 | **Activity는 항상 존재** | 3개 서비스 모두 최근 활동 보유. 공간을 살아있게 만드는 핵심 |
| 3 | **CTA / Guidance는 항상 존재** | KPA, Neture 보유. GlycoPharm 부재는 미의도적 누락 |
| 4 | **Utility (광고/스폰서/로고)는 하단 배치** | 3개 서비스 일관. 핵심 흐름을 방해하지 않는 위치 |
| 5 | **Content Highlight 또는 Community Preview 존재** | 3개 서비스 모두 콘텐츠 요약 영역 보유 |

### 5.2 서비스별로 달라져야 할 것 (허용 범위)

| # | 차이 항목 | 설명 |
|---|----------|------|
| 1 | **News 비중** | KPA는 3탭 통합 (공지+새소식+외부). Neture는 News 없음 (대신 Market Trial). 도메인 특성에 따라 비중 조절 |
| 2 | **CTA 강도** | Neture는 2개 CTA (상단+하단). KPA는 1개 하단 CTA. 전환 유도형 서비스일수록 CTA 강화 |
| 3 | **Activity 소스** | KPA=포럼 글, GlycoPharm=인기 글, Neture=신규 참여자. 도메인별 데이터 소스 차이 |
| 4 | **Signage 유무** | KPA/GlycoPharm은 Signage Preview 포함. Neture는 해당 없음 |
| 5 | **Recommendation 유무** | Neture는 Featured Section (추천) 보유. KPA/GlycoPharm은 없음. 고도화 요소 |
| 6 | **App Entry 구성** | KPA=4개 서비스 카드 (포럼/교육/콘텐츠/사이니지). Neture=공급자/파트너 진입. 도메인별 기능 앱 차이 |

### 5.3 표준 블록 구조 수정 필요 여부

현재 v1 기준 검증 결과:

| 블록 | v1 분류 | 수정 필요? | 근거 |
|------|---------|-----------|------|
| Hero / Summary | 필수 | 유지 | 3개 서비스 모두 충족 |
| News / Notices | 필수 | **재검토** | Neture에 News 없음. "공지가 없는 서비스"는 Activity로 대체 가능. 단, 필수 유지하되 "서비스 성격에 따라 최소 구성 허용" 주석 추가 권장 |
| Activity | 필수 | 유지 | 3개 서비스 모두 보유 |
| App Entry | 필수 | 유지 | KPA 충족, GlycoPharm/Neture 미충족 → 추가 필요 확인 |
| CTA / Guidance | 필수 | 유지 | KPA/Neture 충족, GlycoPharm 미충족 → 추가 필요 확인 |
| Content Highlight | 선택 | 유지 | 3개 서비스 모두 보유하나, 형태 다양 |
| Signage Preview | 선택 | 유지 | Neture 해당 없음 → 선택이 적절 |
| Recommendation | 선택 | 유지 | Neture만 보유 → 선택이 적절 |
| Utility | 선택 | 유지 | 3개 서비스 모두 보유 |

---

## 6. 서비스별 개선 권고

### 6.1 GlycoPharm 개선 필요 항목

| # | 항목 | 현재 | 권고 |
|---|------|------|------|
| 1 | KPI 블록 제거 | 메인 홈에 KPI 3개 노출 | Operator Dashboard로 이동. 메인 홈에서 제거 |
| 2 | Feed DataTable 축소 | 전체 포럼 DataTable | 최근 글 5개 요약 리스트로 축소. 상세는 Forum 앱으로 |
| 3 | App Entry 추가 | 없음 | KPA 패턴 참고: 포럼/교육/콘텐츠/사이니지 4개 카드 |
| 4 | CTA / Guidance 추가 | 없음 | 하단 CTA 블록 추가 (강좌 신청, 케어 서비스 등) |

### 6.2 Neture 개선 필요 항목

| # | 항목 | 현재 | 권고 |
|---|------|------|------|
| 1 | News / Notices | 없음 | 최소한 공지/업데이트 탭 1개 추가 검토 |
| 2 | App Entry 명시화 | Home CTA에서 간접 진입 | 중단에 서비스 진입 카드 (시범판매/공급자관리/파트너관리 등) 추가 검토 |

---

## 7. 결론

### 3개 서비스 표준 블록 충족 현황

```
              KPA    GlycoPharm    Neture
Hero          ✅        ✅           ✅
News          ✅        ✅           ⚠ (없음)
Activity      ✅        ⚠ (과잉)     ✅
App Entry     ✅        ❌           ⚠ (약함)
CTA/Guidance  ✅        ❌           ✅✅ (강함)
Content       ✅        ✅           ✅
Signage       ✅        ✅           N/A
Utility       ✅        ✅           ✅
```

### 핵심 발견

1. **KPA는 표준 정렬 완료 상태** — WO-KPA-HOME-SPACE-FRAME-ALIGNMENT-V1 이후 5개 필수 블록 모두 충족
2. **GlycoPharm은 관리형 포털 패턴에 가까움** — KPI 블록과 DataTable 피드가 공동 공간 원칙 위배. App Entry와 CTA/Guidance 부재
3. **Neture는 CTA 중심 구조로 강점** — 전환 유도형 서비스 특성이 잘 반영되나 News/App Entry 보완 필요
4. **표준 블록 v1 구조는 유효** — 분류 변경 불필요. 필수/선택/제외 기준이 3개 서비스에서 자연스럽게 작동함

---

*Created: 2026-04-19*
*Status: Analysis Complete*
