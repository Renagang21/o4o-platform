# IR-O4O-NETURE-EXISTING-PAGES-AUDIT-V1

> neture.co.kr 기존 페이지 감사 결과

---

## 1. 현재 메뉴 구조

| # | 메뉴 | URL | 페이지 |
|---|------|-----|--------|
| 1 | Home | `/` | NetureHomePage |
| 2 | Community | `/community` | CommunityPage |
| 3 | Supplier | `/supplier` | SupplierLandingPage |
| 4 | Partner | `/partner` | PartnerLandingPage |
| 5 | Contact Us | `/contact` | ContactPage |
| 6 | About | `/about` | AboutPage |

---

## 2. 메뉴에 연결되지 않은 공개 페이지 (재배치 후보)

### 2.1 O4O 플랫폼 소개 페이지 (9개)

| 페이지 | URL | 목적 | 활용 후보 |
|--------|-----|------|----------|
| O4OMainPage | `/o4o` | O4O 플랫폼 소개 메인 | **About** |
| O4OIntroPage | `/o4o/intro` | O4O 플랫폼 상세 소개 | **About** |
| SiteOperatorPage | `/o4o/site-operator` | 매장 운영자 대상 안내 | About / Supplier |
| PharmacyTargetPage | `/o4o/targets/pharmacy` | 약국 대상 안내 | About |
| ClinicTargetPage | `/o4o/targets/clinic` | 의원 대상 안내 | About |
| SalonTargetPage | `/o4o/targets/salon` | 미용실 대상 안내 | About |
| OpticalTargetPage | `/o4o/targets/optical` | 안경점 대상 안내 | About |
| OtherTargetsPage | `/o4o/other-targets` | 기타 업종 안내 | About |
| BusinessInquiryPage | `/o4o/business-inquiry` | 사업 문의 | Contact |
| ConsultationRequestPage | `/o4o/consultation` | 도입 상담 요청 | Contact |

### 2.2 채널/유통 구조 소개 (5개)

| 페이지 | URL | 목적 | 활용 후보 |
|--------|-----|------|----------|
| ChannelSalesStructurePage | `/channel/structure` | 유통 채널 구조 설명 | **About** |
| PharmacyChannelExplanationPage | `/channel/pharmacy` | 약국 채널 설명 | About |
| OpticalChannelExplanationPage | `/channel/optical` | 안경점 채널 설명 | About |
| MedicalChannelExplanationPage | `/channel/medical` | 의료기기 채널 설명 | About |
| DentalChannelExplanationPage | `/channel/dental` | 치과 채널 설명 | About |

### 2.3 Seller 소개 페이지 (3개)

| 페이지 | URL | 목적 | 활용 후보 |
|--------|-----|------|----------|
| SellerOverviewPage | `/seller/overview` | Seller 역할 개요 | About / Supplier |
| SellerQRGuidePage | `/seller/qr-guide` | QR 전단지 가이드 | Community |
| MedicalOverviewPage | `/seller/overview/medical` | 의료기기 Seller 안내 | About |

### 2.4 파트너 관련 소개 (1개)

| 페이지 | URL | 목적 | 활용 후보 |
|--------|-----|------|----------|
| PartnerOverviewInfoPage | `/partner/overview-info` | 파트너 프로그램 상세 | **Partner** |

### 2.5 Workspace 내부 소개 페이지 (2개)

| 페이지 | URL | 목적 | 활용 후보 |
|--------|-----|------|----------|
| PlatformPrinciplesPage | `/workspace/platform/principles` | 플랫폼 운영 원칙 | About |
| PartnerInfoPage | `/workspace/partners/info` | 파트너 정보 안내 | Partner |

### 2.6 매뉴얼/가이드 페이지 (4개)

| 페이지 | URL | 목적 | 활용 후보 |
|--------|-----|------|----------|
| ConceptsPage | `/manual/concepts` | 플랫폼 개념 설명 | About |
| ChannelMapPage | `/manual/concepts/channel-map` | 채널 맵 시각화 | About |
| TestCenterPage | `/test-center` | 테스트 센터 | 내부 |
| TestGuidePage | `/test-guide` | 테스트 가이드 | 내부 |

### 2.7 Content/CMS 페이지 (2개)

| 페이지 | URL | 목적 | 활용 후보 |
|--------|-----|------|----------|
| ContentListPage | `/partner/contents` | CMS 콘텐츠 목록 | Community |
| ContentDetailPage | `/partner/contents/:id` | CMS 콘텐츠 상세 | Community |

---

## 3. Orphaned 페이지 (라우트 없음, 파일만 존재)

| # | 파일 | 목적 | 판단 |
|---|------|------|------|
| 1 | `HomePage.tsx` | 구 홈페이지 (NetureHomePage로 대체됨) | 삭제 후보 |
| 2 | `FulfillmentStatusPage.tsx` | 배송 상태 | 삭제 후보 |
| 3 | `ShippingAddressPage.tsx` | 배송지 관리 | 삭제 후보 |
| 4 | `TrialListPage.tsx` | 체험 목록 | 삭제 후보 |
| 5 | `TrialDetailPage.tsx` | 체험 상세 | 삭제 후보 |
| 6 | `dashboard/PartnerDashboardPage.tsx` | 구 파트너 대시보드 | 삭제 후보 |
| 7 | `dashboard/SupplierDashboardPage.tsx` | 구 공급자 대시보드 | 삭제 후보 |
| 8 | `partner/CollaborationPage.tsx` | 협업 페이지 | 삭제 후보 |
| 9 | `partners/PartnersApplyPage.tsx` | 파트너 신청 | 삭제 후보 |
| 10 | `profile/ContactSettingsPage.tsx` | 연락처 설정 | 삭제 후보 |
| 11 | `seller/SellerOverviewByIndustry.tsx` | 업종별 Seller 개요 | 삭제 후보 |
| 12 | `supplier/SupplierOverviewPage.tsx` | 구 공급자 개요 | 삭제 후보 |
| 13 | `suppliers/SupplierDetailPage.tsx` | 구 공급자 상세 (레거시) | 삭제 후보 |
| 14 | `suppliers/SupplierListPage.tsx` | 구 공급자 목록 (레거시) | 삭제 후보 |

---

## 4. 메뉴 재배치 제안

### About 메뉴 하위 콘텐츠 후보

About 페이지에서 링크하거나 서브 페이지로 활용 가능한 기존 페이지:

| 페이지 | 현재 URL | About 내 역할 |
|--------|----------|--------------|
| O4OMainPage | `/o4o` | 플랫폼 소개 |
| O4OIntroPage | `/o4o/intro` | 플랫폼 상세 소개 |
| ChannelSalesStructurePage | `/channel/structure` | 유통 구조 설명 |
| ConceptsPage | `/manual/concepts` | 플랫폼 개념 |
| ChannelMapPage | `/manual/concepts/channel-map` | 채널 맵 |
| PlatformPrinciplesPage | `/workspace/platform/principles` | 운영 원칙 |
| 업종별 Target 페이지 (4개) | `/o4o/targets/*` | 대상 업종 안내 |
| 채널별 설명 페이지 (4개) | `/channel/*` | 채널별 안내 |

### Supplier 메뉴 하위 콘텐츠 후보

| 페이지 | 현재 URL | Supplier 내 역할 |
|--------|----------|-----------------|
| SiteOperatorPage | `/o4o/site-operator` | 매장 운영자 안내 |
| SellerOverviewPage | `/seller/overview` | Seller 역할 개요 |

### Partner 메뉴 하위 콘텐츠 후보

| 페이지 | 현재 URL | Partner 내 역할 |
|--------|----------|----------------|
| PartnerOverviewInfoPage | `/partner/overview-info` | 프로그램 상세 |
| PartnerInfoPage | `/workspace/partners/info` | 파트너 정보 |

### Community 메뉴 하위 콘텐츠 후보

| 페이지 | 현재 URL | Community 내 역할 |
|--------|----------|------------------|
| ContentListPage | `/partner/contents` | CMS 콘텐츠 |
| SellerQRGuidePage | `/seller/qr-guide` | QR 가이드 |

### Contact 메뉴 연결 후보

| 페이지 | 현재 URL | Contact 내 역할 |
|--------|----------|----------------|
| BusinessInquiryPage | `/o4o/business-inquiry` | 사업 문의 |
| ConsultationRequestPage | `/o4o/consultation` | 도입 상담 |

---

## 5. 페이지 수 요약

| 구분 | 수량 |
|------|------|
| 전체 페이지 파일 | 138개 |
| 라우트 등록 페이지 | ~124개 |
| Orphaned 페이지 (라우트 없음) | 14개 |
| **메뉴 미연결 공개 페이지** | **26개** |
| 메뉴 연결 공개 페이지 | 6개 |
| Admin/Operator 페이지 | ~40개 |
| Workspace 업무 페이지 | ~50개 |

---

## 6. 핵심 발견

1. **About 페이지 재구성에 활용 가능한 페이지가 매우 많다**
   - O4O 소개 (9개), 채널 구조 (5개), 개념 설명 (2개) = 16개 페이지
   - 이 페이지들은 현재 `/o4o/*`, `/channel/*`, `/manual/*`에 분산되어 있음

2. **Contact 페이지에 연결 가능한 문의 페이지가 2개 더 있다**
   - BusinessInquiryPage, ConsultationRequestPage

3. **Orphaned 페이지 14개는 모두 구버전 대체 완료**
   - 삭제해도 무방

4. **메뉴에 연결되지 않은 공개 페이지 26개가 발견됨**
   - 대부분 소개/안내 목적의 정적 페이지
   - About 메뉴 재구성 시 하위 링크로 활용 가능

---

*Generated: 2026-03-11*
*Status: Audit Complete*
