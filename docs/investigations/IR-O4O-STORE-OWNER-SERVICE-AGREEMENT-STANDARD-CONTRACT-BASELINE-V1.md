# IR-O4O-STORE-OWNER-SERVICE-AGREEMENT-STANDARD-CONTRACT-BASELINE-V1

> **종류**: 조사 보고서(IR) · 조사 전용 · **계약서 초안 아님**
> **작성일**: 2026-09-18
> **Git 기준선**: `main` `c3d4228a4` (HEAD == origin/main · 작업트리 clean)
> **변경 0 확인**: 코드 변경 0 · DB write 0(운영 DB 접속 자체 없음 — 운영 수치는 `IR-O4O-INTEGRATED-TERMS-RUNTIME-CONTRACT-CENSUS-V1`(2026-09-17 read-only 실측) 및 `IR-O4O-PRIVACY-POLICY-RUNTIME-DATA-FLOW-CENSUS-V1` 인용) · migration 0 · policy document write 0 · role/membership 변경 0 · 배포 0
> **선행 문서**: [`O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0`](../baseline/O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0.md)(제4조 ②-2 "매장 경영자 서비스 = 별도 계약" · 제16조 · 제17조) · [`IR-O4O-INTEGRATED-TERMS-RUNTIME-CONTRACT-CENSUS-V1`](IR-O4O-INTEGRATED-TERMS-RUNTIME-CONTRACT-CENSUS-V1.md) §18(매장 경영자 계약 분리) · [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §3 · §6 · [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) §9 · §13
> **후속**: 본 IR 확정 후 「O4O 매장 경영자 이용계약 v1.0」 작성(별도 지시)

---

## 1. 목적

O4O Store Workspace(KPA Society · K-Cosmetics · PharmacyHub 의 매장 경영자 업무공간)를 「클라우드컴퓨팅 발전 및 이용자 보호에 관한 법률」(이하 클라우드컴퓨팅법) 관점에서 보고, ① 정부가 공개한 표준계약서 원문을 확보하고 ② 그중 O4O 에 적용할 조항을 선별하며 ③ 실제 Store Workspace 구조(가입·승인 · 기능 · 데이터 · 종료 · 장애 · AI · 공개노출)와 대조하여, 「O4O 매장 경영자 이용계약 v1.0」의 **사실 기준선**을 만든다.

이 IR 은 계약서를 쓰지 않는다. 판정은 `CONFIRMED`(코드·문서로 확인) · `POLICY_DECISION_REQUIRED`(회사 결정 필요) · `FUTURE_TRIGGER`(기능 부재 → 개시 시 개정) · `NOT_IMPLEMENTED` 로 표기한다. 법률 최종판단(클라우드컴퓨팅서비스 해당성 포함)은 단정하지 않는다.

---

## 2. 적용 대상

| 서비스 | serviceKey | store_owner role | Store Workspace | 판정 |
|---|---|---|---|---|
| KPA Society | `kpa-society` | `kpa:store_owner` | `/store` (My Store) · `/store/workspace` · `/store-hub` · `/store/services` | **적용** |
| K-Cosmetics | `k-cosmetics` | `cosmetics:store_owner` | `/store` … | **적용** |
| PharmacyHub | `pharmacy-hub` | `pharmacy-hub:store_owner` | `/store-owner` … | **적용** |
| Neture | `neture` | 신규 가입 유형에서 제거(`auth-register.controller.ts` L68 · 잔존 legacy 회원 데이터만) · Store Workspace 없음 | — | **제외** (아래 관계만 조사) |

**Neture ↔ Store Workspace 관계(조사 결과)**: Neture 는 공급자 업무공간이며 매장 경영자 계약의 당사자 서비스가 아니다. 다만 두 경로로 매장 서비스에 콘텐츠·상품정보를 공급한다(`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1` §2-1).
- `Supplier → Store Hub`: `neture_supplier_library_items`(is_public=true) 를 Hub source adapter `sourceDomain=supplier-library` 로 `storeWorkspaceEnabled` 서비스의 Store Hub 에 노출 → 매장이 "가져오기" 하면 `asset-copy-core` 가 **매장 소유 독립 사본** 생성. 원본 변경 비전파.
- `Supplier → Service Operator`: `POST /neture/library/:id/handoff {serviceKey}` → `cms_contents(authorRole=supplier, status=pending)` → 운영자 검토·발행 → Store Hub.
- 공급자 상품정보(`shared_product_descriptions`(SPD) · `supplier_product_offers`)는 매장 "매장 경영활용 제품(handled-products)" · "상품 설명" 의 원천이며, QR(`/p/{key}`) · 태블릿에서 열람 형태로 노출된다.
→ 매장 경영자 계약에는 공급자 콘텐츠·상품정보를 **"회사가 전달 매체로 제공하는 제3자 제공 정보"** 로 정의하는 조항이 필요하다(§14 · §23-2). 공급자 측 의무는 공급자 계약(별도)이 정한다.

---

## 3. 당사자

| 항목 | 사실 | 근거 |
|---|---|---|
| 회사(공급사업자) | 주식회사 쓰리라이프존 · 대표이사 서철환 (`service_legal_profiles` SSOT · 4 서비스 Footer 게시) | 통합약관 v1.0 제2조 · 법정정보 트랙 |
| 이용자(이용사업자) | 매장 경영자 = `store_owner` role 보유 회원. 통합약관 IR §3 실측: `kpa:store_owner` 5 · `pharmacy-hub:store_owner` 6 · `cosmetics:store_owner` 4 · legacy `pharmacy` 2 (2026-09-17) | 통합약관 census IR §3 |
| KPA 개인/사업자 | **사업자 전제**. 가입 유형 `pharmacy_owner`(개설약사 = "약국 개설자(사업자등록 보유)") 선택 시 사업자번호·대표자명·사업장 주소·사업자 유형 수집(`RegisterModal.tsx` L45 · L121~134). 승인 시 `users.businessInfo.businessNumber` 로 `organizations(type='pharmacy', code='kpa-pharm-{businessNumber}')` 자동 생성 + `organization_members(role=owner)` + `role_assignments('kpa:store_owner')` (`member.controller.ts` L827~880). **사업자번호 없으면 store_owner 부여 보류** | CONFIRMED |
| K-Cosmetics 개인/사업자 | **사업자 전제**. 가입 화면 "판매자" 선택 시 사업자 정보(상호명·사업자등록번호·회사/매장 전화) 입력란(`web-k-cosmetics/.../RegisterPage.tsx` L382~) → `service_memberships.role='cosmetics:store_owner'` 저장 → 운영자 승인 시 role 부여(`auth-register.controller.ts` L153~181 · `MembershipApprovalService`). 사업자번호 **필수 여부는 프론트 검증에 의존**(백엔드 `validate` 에 store_owner 전용 필수검사 없음) | CONFIRMED · 필수성 POLICY_DECISION_REQUIRED |
| PharmacyHub 개인/사업자 | **약국명만 수집**. `POST /pharmacy-hub/join` roleType=store_owner 는 `businessName`(약국명)만 필수(`PharmacyHubJoinController.ts` L94) — 사업자등록번호는 가입 시 미수집. 매장 정보 화면(`StoreInfoPage.tsx` L403~408)은 businessNumber 를 **읽기 전용** 으로 표시("가입 심사 근거 · 변경은 운영자 문의") → 운영자 콘솔에서 사후 기입 구조 | CONFIRMED · 계약 체결 시 사업자정보 확인 절차 = POLICY_DECISION_REQUIRED |
| 최종이용자(표준계약서 §2-5) | 매장이 QR·태블릿·사이니지로 노출하는 콘텐츠를 보는 **매장 고객(소비자)**. O4O 회원 아님 | CONFIRMED |

→ 계약 당사자는 "회사 ↔ 매장 경영자(원칙적으로 사업자 · 약국 개설자)" 이며, 표준계약서(B2B) 의 "이용사업자 = 법인 또는 개인사업자" 정의와 일치한다. 다만 PharmacyHub 는 사업자정보 확인 없이 store_owner 가 될 수 있어 **계약 체결 시 사업자정보 보완 절차**(§20)가 필요하다.

---

## 4. 표준계약서 조사 (우선순위별)

### 4-1. 1순위 — 클라우드컴퓨팅법 §24 표준계약서 (민간)

| 항목 | 확인 결과 |
|---|---|
| 법적 근거 | 클라우드컴퓨팅법 제24조(표준계약서): 과학기술정보통신부장관이 공정거래위원회와 협의하여 제·개정, 방송통신위원회 의견 선청취(개정 2025-10-01 시행분 포함 조문 유지) |
| 제정기관 · 공개일 | **미래창조과학부(현 과학기술정보통신부) 2016-12-04 공개** — 「클라우드컴퓨팅서비스 공급사업자와 이용사업자 간 표준계약서(B2B)」 · 「클라우드컴퓨팅서비스 제공자와 이용자 간 표준계약서(B2C)」 2종, 각 **26조** |
| 원문 확보 | 정보통신산업진흥원 발행 「클라우드컴퓨팅 이용자 보호 길라잡이」(발행 2019-09 · 집필 한국클라우드산업협회) 붙임 1(p.65~) 에 **B2B · B2C 전문 수록**(과기정통부 홈페이지 게시본과 동일하다고 안내서가 명시, p.24). 별도 사업자 게시본(hanbiro.com `cloudTerms.pdf` = B2C 판) 및 대전도시공사 공공용 변형본(HWP · 21조)으로 교차 확인 |
| 개정 여부 | 2016-12 이후 **개정 공고를 확인하지 못함**. NIPA 「클라우드컴퓨팅 표준계약서 해설 및 개선 연구용역」 입찰 공고 존재 → 개정 가능성 있으나 결과 미확인. **v1.0 작성 시 2016 판을 기준으로 하되 "표준계약서 개정 시 정합" 을 FUTURE_TRIGGER 로 둔다** |
| 민간용 · B2B 적용 가능 | **적용 가능**. B2B 판 §2-4 "이용사업자 = 법인 또는 개인사업자" · §2-5 "최종이용자" · §2-6 "이용자 정보 = 이용사업자가 소유·관리하는 저장 정보" · §2-7 "서비스수준협약". O4O 매장 경영자(사업자) 계약은 **B2B 판** 을 골격으로 삼는다. B2C 판은 §7 청약철회 · §21 "이용자 정보의 반환과 파기"(통지 요건 명문) 를 참고 |

**B2B 표준계약서 26조 구조(원문 확인)**

| 장 | 조 | 요지 |
|---|---|---|
| 1 총칙 | §1 목적 · §2 정의(7호) · §3 계약서의 명시(공급사업자가 계약서를 이용사업자가 알 수 있게 게시·교부) · §4 해석 | 클라우드컴퓨팅법·개인정보보호법·약관규제법 등 |
| 2 계약 체결 | §5 이용신청 및 방법(실명·실제 정보) · §6 이용신청의 승낙과 제한(승낙 도달 시 성립 · 거절 사유) | 신청서 별도 |
| 3 의무 | §7 공급사업자 의무(정보보호 기준 · SLA 이상 제공 · 정기점검 사전통지 · 장애 복구 · 이용현황 확인수단) · §8 이용사업자 의무(법령 준수 · 요금 · 접속정보 관리 · 통지사항 확인) | |
| 4 서비스 | §9 서비스 제공·변경(불리하고 중요한 변경은 동의) · §10 요금 · §11 청구 · §12 정산 · §13 이용 정지 · §14 일시 중지 · §15 제공 중단(점검 (__)일 전 통지 · 침해/천재지변 사후 지체 없이 · 초과 중단 시 요금 공제) | 요금 조 3개 |
| 5 해제·해지 | §16 이용제한 · §17 이용사업자 해제·해지 · §18 공급사업자 해제·해지(사업 종료 포함 · (__)일 전 통지·이의신청 · 해지사유·해지일·환급비용 통지) | |
| 6 이용자 정보 | §19 이용자 정보 보호(별도 이용자 정보 처리방침 · 개인정보 처리방침) · **§20 이용자 정보 처리(종료 시 반환 · 불가 시 파기 · 복구 불가 방법 · 이관 협조)** | 핵심 |
| 7 손해배상 등 | §21 손해배상(SLA 미달 · 사전 정한 손해액) · §22 면책(6호 + 게시정보 신뢰 · IP 분쟁 · 이용사업자 간 분쟁) · **§23 통지**(침해사고 · 정보유출 · 중단 · 종료 · 중대 영향 5유형 · 30일 전 예외 · 발생내용/원인/조치/예방/연락처) · §24 양도 제한 · §25 관할 · §26 준거법 | |

### 4-2. 2순위 — 행정·공공기관용 (구조만 참고)

- 행정안전부 고시 「행정기관 및 공공기관의 클라우드컴퓨팅서비스 이용 기준 및 안전성 확보 등에 관한 고시」 제2023-23호(2023-04-12) → 현행 **제2025-79호(2025-12-29)**. 별표 2의5 「클라우드컴퓨팅서비스 위수탁 계약서 주요 기재사항」(제14조의2 관련).
- 공공용 변형(대전도시공사 「클라우드컴퓨팅서비스 표준계약서」 21조): §7 이용자 정보 보호·관리 ② **계약 전 고지 8항목**(저장 국가 · 국내법 준수 · 암호화 · 제3자 제공 · 임치 · 종료 시 삭제 · 파기 · 취급방침) · §11 중단 통지(15일 전) · §12 피해확산 방지 · §19 반환·파기·이관.
- **채택 범위**: 조문 골격은 채택하지 않는다(공공 위수탁 특유의 보안인증·국내 저장 의무). 다만 **"계약 전 고지 항목"** 목록은 O4O 별표(데이터 저장 위치 · 백업 · 파기) 구성에 참고한다(§24).

### 4-3. 3순위 — 「클라우드컴퓨팅서비스 품질·성능에 관한 기준」

- 과학기술정보통신부 고시 **제2017-7호(2017-08-24)** (사용자 제시 law.go.kr admRulSeq=2100000043883). 클라우드컴퓨팅법 §23(신뢰성 향상) 근거 · **권고** 기준(제23조 ② "지킬 것을 권고할 수 있다"). 제7조: 충족 확인은 NIPA 등에 요청 시.
- 7 기준 · 11 세부기준(안내서 참고 1):

| 기준 | 세부기준 | O4O 현재 측정 여부 |
|---|---|---|
| 가용성 | 가용률 | **측정 없음**(uptime SLO · 상태 페이지 · 가동시간 집계 코드 0) |
| 응답성 | 응답시간 | Cloud Run 요청 로그 · `performanceMonitor` 앱 로그만 · 집계·공개 없음 |
| 확장성 | 확장성 | Cloud Run 자동 확장(플랫폼 특성) · 명시 약정 없음 |
| 신뢰성 | 서비스 회복시간 · 백업 주기 · 백업 준수율 · 백업 데이터 보관기간 | Cloud SQL 자동 백업 **7세대 · PITR 활성**(privacy IR §1) · GCS `o4o-media-library` **백업·lifecycle 없음** · 회복시간 측정 없음 |
| 서비스 지속성 | 서비스 제공능력 | 재무·기술보증 제시 없음 |
| 서비스 지원 | 서비스 지원체계 | 기술지원문서(제작가이드 모달 등) · 모니터링 사이트 없음 |
| 고객대응 | 고객대응체계 · 고객불만 처리체계 | 문의(contact_inquiries · platform_inquiries) 경로 있음 · 처리 SLA 없음 |

- **SLA 필요 여부 판정**: 표준계약서 §7 ① · §21 ① 은 "서비스수준협약에서 정하는 수준" 을 전제로 하나, SLA 자체는 **계약 당사자가 합의로 정하는 별도 협약**이며 법정 의무가 아니다. O4O 는 (a) 무료 서비스(§18) (b) 측정 체계 부재 (c) 표준계약서가 SLA 손해액을 "사전에 정한" 경우로 한정 → **`NO_SLA_CURRENTLY`**. 계약서에는 "SLA 는 유료 이용권 개시 또는 별도 합의 시 별표로 체결" 을 FUTURE_TRIGGER 로 둔다. 99.9% 등 수치는 기재하지 않는다(§11).

### 4-4. 4순위 — 과학기술정보통신부 「데이터 표준계약서」 (부분 참고)

- 2024-10-31 공개(한국데이터산업진흥원 배포) · 4 유형 5종: **데이터 제공형** · 데이터 창출형 · 데이터 가공서비스형 · 데이터 중개거래형. 「데이터 산업진흥 및 이용촉진에 관한 기본법」 배경.
- O4O 적용: 매장 계약의 골격은 아니다. 다만 **§7 데이터 유형 C~E(공급자 원본 → 매장 사본 → 매장 제작자료)** 의 "이용권 vs 소유권 · 파생 데이터 귀속" 서술은 **데이터 제공형 · 창출형** 의 개념(데이터 이용권한 · 파생 데이터 이용권 분배)을 참고한다. 원문 전문은 본 IR 에서 확보하지 않았다(계약 v1.0 작성 시 §14 조항 문구 참고용으로만 열람).

---

## 5. 클라우드컴퓨팅서비스 해당성

| 요소 | 사실 | 비고 |
|---|---|---|
| 정의(법 §2-1·3) | "집적·공유된 정보통신기기·시설·소프트웨어 등 정보통신자원을 이용자의 요구나 수요 변화에 따라 정보통신망을 통하여 신축적으로 이용할 수 있도록 하는 정보처리체계"를 이용하여 "상용으로 타인에게 정보통신자원을 제공하는 서비스" | 소프트웨어(SaaS) 제공형 포함(시행령 §3) |
| O4O Store Workspace 구조 | Cloud Run(서울) 위 멀티테넌트 웹 앱 · 매장 데이터는 `organizationId` 경계로 Cloud SQL · GCS 에 저장 · 매장은 브라우저로 저장·편집·공개(QR/태블릿) | SaaS 형 |
| "상용" 요소 | 현재 매장 서비스는 **무료**(§18) · 유료 이용권 CODE_ONLY(entitlement 0) | 상용성 판단 요소 |
| 회사 자기 위치 | O4O 자체가 Google Cloud 의 **이용사업자**이며 매장에는 그 위에서 SaaS 를 제공 | 2단 구조 |

**판정: `CLOUD_LIKE_SAAS`** — Store Workspace 는 SaaS 형 클라우드컴퓨팅서비스의 실질(원격 저장 · 멀티테넌트 · 이용자 데이터 보관·반환 문제)을 갖는다. 그러나 ① 현재 무료 제공(상용성) ② 회사가 직접 정보통신자원을 집적·운영하지 않고 Google Cloud 를 재이용 ③ 법령상 "클라우드컴퓨팅서비스 제공자" 신고·인증 절차를 밟지 않음 — 이 세 요소 때문에 **DIRECT_CLOUD_SERVICE 로 단정하지 않는다**. 법률 최종판단은 자문 사항(POLICY_DECISION_REQUIRED). 계약서에는 클라우드컴퓨팅법 §24 표준계약서를 **"준용 골격"** 으로 쓰되, 법 적용 여부를 계약서가 선언하지 않는다.

---

## 6. 실제 매장 서비스 범위 (Store Workspace)

판정 기준: `ACTIVE`(코드 + 운영 데이터 + 사용자 노출) · `PARTIAL` · `CODE_ONLY` · `NOT_ACTIVE`. 메뉴 근거 `packages/store-ui-core/src/config/storeMenuConfig.ts`(KPA · KCos · PH 3 config) · 운영 수치는 통합약관 census IR §6(2026-09-17).

| 기능 | KPA | KCos | PH | 판정 | 근거 |
|---|---|---|---|---|---|
| 상위 구조(Home · My Store · Store Hub · My Services) | O | O | O | ACTIVE | store-ui-core `workspace/` 1구현 · `GET /work-scope/store-services` |
| 매장 기본정보(매장/사업자 정보 · 설정) | `/store/info` · `/settings` | `/info` "매장/사업자 정보" | `/info` "매장 정보" · `/account` | ACTIVE | `organizations` · `organization_service_enrollments` · `users.businessInfo` |
| 상품 — 공급 상품 열람·발주(B2B) | O4O 제품 · 발주 내역 | 상품 · 주문 관리 | 공급 상품 · 장바구니 · 주문 내역 | PARTIAL | B2B 주문 경로 존재 · 통합약관 IR §7 TEST_ONLY(store_cart_items 0) |
| 상품 — 매장 경영활용 제품(handled-products) | O | 내 매장 제품 | O | ACTIVE | `store_products` · `store_product_profiles` · handled-products 표준테이블(열람·사본 아님) |
| 상품 — 매장 자체 상품(local-products) | O | O | O | ACTIVE(코드·UI) | `store_local_products` |
| 상품 설명(SPD 열람 · QR) | O | O | O | ACTIVE | `shared_product_descriptions`(공급자/운영자 원본) · `/p/{key}` 공개 |
| 콘텐츠 — 자료함(콘텐츠 · 자료 · 제작자료) | 약국 자료함 | 내 자료함 | 콘텐츠·자료함 · 자료 | ACTIVE | `kpa_store_contents` 15 · `asset_snapshots` 19 · `store_execution_assets` |
| 콘텐츠 — 블로그 · POP | O | O | O | ACTIVE | `store_blog_posts` · `store_pops` · `store_pop_documents` |
| 콘텐츠 — 다국어 상품 콘텐츠 | — | — | O | PARTIAL | `store_multilingual_product_content_*` |
| 디스플레이 — QR | O | O | O | ACTIVE | `store_qr_codes` 97(active 53) · `store_qr_placements` · `store_qr_scan_events` · 공개 `/qr/{slug}` |
| 디스플레이 — 태블릿(화면 세트) | 태블릿 화면 제작 | 태블릿 | 태블릿 | ACTIVE | `store_tablets` · `store_tablet_displays` · screen-set(opl) · 물리 태블릿 smoke PENDING_USER_VERIFICATION |
| 디스플레이 — 사이니지(플레이리스트 · 동영상 · 스케줄 · TV 재생) | O | O | O | ACTIVE(코드·UI) | `store_playlists` · `store_playlist_items` · `store_videos` · `cosmetics_store_playlists` |
| 채널 관리 · 외부 판매채널(네이버·쿠팡 링크) | O | O | — | PARTIAL | `organization_channels` · `organization_product_channels` · storefront 은퇴 |
| 외국인 여행객 판매지원(유료 이용권 대상) | O | O | O | CODE_ONLY(유료) | `store_paid_feature_entitlements` 0 · §18 |
| 분석(마케팅 분석 · 매출 요약) | O | O | O | PARTIAL | `store-analytics.controller.ts`(QR 스캔 집계) · 매출 요약 "참고용" 배너 |
| AI 보조(QR 설명 초안 · 콘텐츠 생성 · 매장 AI 요약) | O | O | O | ACTIVE | `ai-proxy.routes.ts` qr-description · content · `store_ai_snapshots` · `store_ai_insights` · ai_usage_logs 25 |
| 상담 요청(QR CTA) | O | — | — | PARTIAL | consultation requests(메모리 `ir-store-consultation-requests-notification-audit`) |
| 소비자 온라인 판매(storefront) | 판매 설정·판매 상품(껍데기) | — | — | NOT_ACTIVE | storefront 은퇴 → 네이버·쿠팡 외부 · COMMERCE-BOUNDARY 플랫폼 직접 판매 NONE |

→ 계약서의 "서비스 내용" 조는 **ACTIVE·PARTIAL 기능만** 서비스 범위로 적고, CODE_ONLY(유료 이용권) · NOT_ACTIVE(소비자 판매)는 FUTURE_TRIGGER 로 분리한다.

---

## 7. 데이터 유형 A~F

"매장 데이터는 모두 매장 소유" 라는 포괄 문구는 쓰지 않는다. 유형별로 입력·수정·삭제 주체와 권리 성격을 분리한다.

| 유형 | 내용 · 테이블 | 입력 | 수정 | 삭제 | 종료 시 반환 대상 | 법정·운영 보관 | 권리 성격 |
|---|---|---|---|---|---|---|---|
| **A 매장 기본정보** | `organizations`(name · code · 주소 · 연락처) · `organization_service_enrollments` · `users.businessInfo`(사업자번호 · 대표자 · 세금계산서 이메일) · `physical_stores` | 매장(가입·정보 화면) · 운영자(승인 시 자동 생성 · 사업자번호 보정) | 매장(일부) · 운영자(사업자번호 등 심사 항목은 **읽기 전용**) | 매장 자체 삭제 경로 **없음** · 관리자 hard/soft delete(`AdminUserController.deleteUser`) | 반환 대상(사본 제공) | 사업자 거래정보 — 전자상거래법·세법 보존 대상은 **유료 거래 개시 후** 발생 · 현재는 개인정보 처리방침 보유기간 | 매장의 정보(개인정보·영업정보) · 회사는 처리자 |
| **B 상품정보(매장 선택)** | `store_products` · `store_product_profiles` · `store_local_products` · `organization_product_listings` · `organization_product_channels` | 매장(선택·자체 등록) | 매장 | 매장(개별 삭제 route 존재) | 자체 상품·선택 목록은 반환 대상 · 공급 상품 마스터(`product_masters` · SPD)는 **회사·공급자 자료 — 반환 대상 아님** | — | 자체 상품 = 매장 정보 · 공급 상품 참조 = 접근권 |
| **C 공급자 원본** | `neture_supplier_library_items` · `shared_product_descriptions`(SPD) · `supplier_product_offers` · 운영자 Hub 콘텐츠(`cms_contents` · `kpa_contents`) | 공급자 · 운영자 | 공급자 · 운영자 | 공급자 · 운영자 | **반환 대상 아님**(매장 소유 아님) | 공급자 계약이 정함 | 저작권 = 공급자/운영자 · 매장은 **열람·복사 접근권** |
| **D 매장 사본** | `asset_snapshots`(19) · `kpa_store_contents`(snapshot_edit · direct) · `store_execution_assets`(generated/uploaded) · `store_asset_derivations` · `kpa_store_content_product_links` | 매장(가져오기 = `asset-copy-core` 사본) | 매장(사본 편집 · 원본 불변) | 매장(`DELETE /store-owner/content/:id` · `/library/:id`) | **반환 대상**(매장 편집분 포함) — 단 **원본 저작권은 이전되지 않음**(통합약관 제16조 ④) · 계약 종료 후 매장 외부 사용은 라이선스 범위 문제(§14) | — | 편집 파생물 = 매장 작성 부분 · 원저작권 = 공급자/운영자 · **provenance 보존**(copy 불변식) |
| **E 매장 제작자료** | 블로그(`store_blog_posts`) · POP(`store_pops` · `store_pop_documents`) · QR(`store_qr_codes` · `store_qr_placements`) · 태블릿 화면 세트(`store_tablet_displays` · screen sets) · 플레이리스트·동영상(`store_playlists` · `store_videos` · GCS `o4o-media-library` 객체) · AI 초안 편집본 · 다국어 콘텐츠 | 매장(직접 작성 · AI 초안 · 업로드) | 매장 | 매장(개별 route) · 미디어 삭제 = **GCS 객체 삭제 연결**(보유기간 정책 §9) | **반환 대상**(매장 저작물) · 단 공급자 소재를 포함한 부분은 D 와 같은 제한 | — | 저작권 = 매장(공급자 소재 제외) · AI 결과물 저작권은 §16 |
| **F 운영로그** | `store_qr_scan_events` · `action_logs`(9,390 · organization_id 포함) · `store_ai_snapshots` · `store_ai_insights` · `ai_usage_logs`(본문 없음) · `audit_logs` · Cloud Logging(30일) | 시스템 | — | 매장 삭제 불가 | **반환 대상 아님**(집계 통계는 §9 다운로드 가능 여부에 따라) · 회사 운영 기록 | 처리방침 §13 · 보유기간 미정 항목(action_logs · audit_logs) = NEEDS_POLICY_DECISION | 회사 기록 · 개인정보 포함 시 처리방침 |

**표준계약서 §2-6 "이용자 정보"(이용사업자가 소유 또는 관리하는 저장 정보) 에 대응하는 O4O 범위 = A + B(자체 상품) + D + E.** C 와 F 는 이용자 정보가 아니다. 계약서 정의 조에서 이를 명시해야 "반환·파기" 의무 범위가 확정된다.

---

## 8. 계약 종료 시 데이터 처리 (현재 구조)

| 종료 시나리오 | 현재 동작 | 판정 |
|---|---|---|
| 회원 자체 탈퇴 | 자체 탈퇴 route **없음**(통합약관 IR §9 · 제9조 ① "문의창구로 요청") | NOT_IMPLEMENTED |
| `service_memberships.status = withdrawn` | 운영자 콘솔(`MembershipConsoleController` · PH 콘솔)이 설정. **매장 데이터(A~E) · GCS · role_assignments 에 연쇄 처리 없음**(role 회수는 KPA activity_type 변경 시 `kpa:store_owner` 비활성만) | NOT_IMPLEMENTED(데이터 연동) |
| 계정 삭제(관리자) | `DELETE /admin/users/:id` — hard `remove()` 시도 · FK 위반 시 `isActive=false` 소프트 삭제. `organizations` · 매장 콘텐츠 · GCS 객체 **무접촉** | NOT_IMPLEMENTED(매장 데이터 파기) |
| 매장(organization) 삭제 | 매장 경영자 · 운영자용 조직 삭제 route **없음**(분회 `DELETE /kpa-branch/admin/branches` 는 빈 분회 전용 · 타 도메인) | NOT_IMPLEMENTED |
| 콘텐츠 개별 삭제 | 자료함·블로그·POP·QR·사이니지·태블릿·자체상품 개별 DELETE route 존재 · 미디어 라이브러리 = GCS 삭제 후 row 제거 · 상품 이미지 = 실패 시 재시도 없음 | DELETE(개별 · 매장 수동) |
| 일괄 export / 다운로드 | §9 — 없음 | NOT_IMPLEMENTED |
| QR | `store_qr_codes` 비활성(active 플래그) · 개별 삭제 가능 · 공개 URL `/qr/{slug}` 은 row 삭제·비활성 시 404 (코드상) · **종료 시 자동 비활성 없음** | DELETE(수동) · 자동화 NOT_IMPLEMENTED |
| 매장 사본(D) | 개별 삭제만 · 종료 시 자동 파기 없음 | NOT_IMPLEMENTED |
| GCS 객체 | 콘텐츠 단위 삭제만 연결 · 탈퇴·계정 삭제·membership withdrawn 과 **미연결**(보유기간 정책 §9 현행 기록) · bucket lifecycle 없음 | NOT_IMPLEMENTED |
| 로그(F) | 처리방침 §13 기준 · action_logs 등 보유기간 미정 | RETAIN_BY_LAW / POLICY_DECISION_REQUIRED |
| 백업 | Cloud SQL 자동 백업 7세대 · PITR · 위치 `asia` multi-region — 백업 사본은 보존주기 종료 시 순차 삭제(보유기간 정책 §9 ②) · 개별 매장 단위 백업 삭제 불가 | RETAIN(백업 주기 만료까지) |

**결론**: 표준계약서 §20 ①~④(종료 시 반환 → 불가 시 파기 → 복구 불가 방법 → 이관 협조) 를 **그대로 약속할 수 있는 기능이 현재 없다.** 계약서 v1.0 은 (a) "매장 경영자는 종료 전 자신의 매장 자료를 서비스 화면에서 직접 내려받거나 삭제할 수 있다"(개별 다운로드·삭제 = 현행) (b) "회사는 종료 통지 후 (__)일의 반환 요청 기간을 두고, 요청 시 **합리적인 방법으로**(수동 추출 포함) 제공한다" (c) "기간 경과 후 활성 저장소에서 삭제하고 백업은 주기 만료 시 소멸" 로 규정해야 하며, **"즉시 전체 다운로드" · "즉시 완전 파기"** 는 쓰지 않는다. 종료→데이터 파기 자동화(membership withdrawn → 매장 자산 · GCS 연동)는 **별도 WO 후보**(개인정보·Identity 재정렬 트랙 §9 현행 기록과 동일 방향).

---

## 9. 이용자 정보 반환 기능 (export) 실태

| 기능 | 존재 | 근거 |
|---|---|---|
| 매장 전체 데이터 일괄 export(CSV/JSON/ZIP) | **없음** | `router.get(... export|download|csv|zip)` 검색 — 매장 측은 아래 2건뿐 |
| 상품 QR 파일 export(png/svg/pdf) | 있음 | `store-handled-products.routes.ts` L232 `GET /handled-products/qr/export` · PH `GET /store-owner/qr/:id/export` |
| 자료함 콘텐츠 인쇄 PDF · POP PDF | 있음(개별) | `StorePopV2EditorView` · `StoreAssetDerivationViewer` · 메모리 `wo-store-library-contents-pdf-export` |
| 미디어(동영상·이미지) 원본 다운로드 | GCS 공개 URL 로 개별 접근 가능(`o4o-media-library` allUsers objectViewer) · 일괄 없음 | privacy IR §1 |
| 이관(다른 서비스·사업자로) 협조 기능 | 없음 | — |

**판정: `NOT_IMPLEMENTED`(일괄) · `DOWNLOAD_AVAILABLE`(개별 QR·PDF·미디어 URL)**. 계약서는 "요청 시 회사가 합리적 기간 내 합리적 형식으로 제공" 으로 규정하고, 일괄 export 기능은 FUTURE_TRIGGER(별도 WO 후보 "매장 데이터 export V1")로 둔다.

---

## 10. 계약 종료 통지

| 항목 | 표준계약서 요구(B2B §18 ③ · §23 · B2C §21 ②) | O4O 현재 | 판정 |
|---|---|---|---|
| 회사 측 해지·종료 통지 기간 | (__)일 전 · 사업 종료 30일 전 | 통합약관 제12조 ③ "합리적인 기간 전 서비스 내 게시" · 통지 코드 없음 · GlycoPharm 은퇴 시 통지 기록 없음 | POLICY_DECISION_REQUIRED(일수) |
| 통지 내용 | 종료일 · 이용자 정보 반환 방법·시기 · 반환정보 형태 · 파기 예정일 · 담당부서·연락처 | 없음 | 계약서에 **항목 목록만** 규정 가능(FUTURE_TRIGGER=자동 통지) |
| 통지 수단 | — | 이메일(SMTP · 상태변경 템플릿) · KPA `/notices` · 서비스 내 게시 | CONFIRMED(수동) |
| 매장 측 해지 | 언제든 해지 가능 · 통지 | 문의창구 요청(자체 탈퇴 없음) | 현행 그대로 규정 |
| 유료 계약 환급 통지 | 해지사유·해지일·환급비용 | 유료 계약 미운영 | **현재/향후 분리**: v1.0 은 무료 계약 종료 절차만 · 환급 조는 유료 개시 시 |

---

## 11. 장애·중단·복구

| 구성요소 | 실태 | 공지·기록 |
|---|---|---|
| Cloud Run(`o4o-core-api` + 서비스별 web · 서울) | Google 관리형 · 자동 확장 · 배포는 GitHub Actions | 점검·중단 공지 코드 **없음**(유지보수 모드 없음) |
| Cloud SQL(`o4o-platform-db` · PostgreSQL 15 · ZONAL) | 자동 백업 7세대 · PITR · 백업 위치 `asia` multi-region | 복구 절차 문서·RTO 없음 |
| GCS(`o4o-media-library` 공개 · `o4o-video-temp-output` 3일) | lifecycle 없음(미디어) · 백업 없음 | — |
| 외부 AI(Gemini · OpenAI) | 장애 시 AI 기능만 실패(초안 기능) | — |
| 이메일(SMTP Gmail) | 발송 로그 `email_logs` | — |
| 측정 | 가용률·회복시간 집계 없음 · Cloud Monitoring 알림 설정은 본 IR 에서 미확인 | — |

**판정: `NO_SLA_CURRENTLY`** — 계약서는 표준계약서 §7 ①(SLA 이상 제공) · §21 ①(SLA 미달 배상)을 **수정 채택**(SLA 별표 체결 시 적용) 하고, §14 · §15(일시 중지 · 제공 중단 · 사전 통지 · 사후 통지) 는 통합약관 제12조와 같은 수준으로 채택한다. **가용률 수치 · 배상액 기재 금지**. `BASIC_AVAILABILITY_COMMITMENT`(예: "상당한 주의로 안정적 제공 노력 · 백업 유지") 수준의 서술은 가능하나 백업 주기·보관기간 수치는 별표에서 회사가 확정(POLICY_DECISION_REQUIRED · 현행 사실: Cloud SQL 7세대/PITR · 미디어 백업 없음).

---

## 12. 침해사고·정보유출 통지

| 구분 | 근거 | 대상 | 통지 내용 | O4O 현재 |
|---|---|---|---|---|
| 클라우드컴퓨팅법 §25(통지) · 표준계약서 §23 | 침해사고 · 이용자 정보 유출 · 서비스 중단 · 종료(사업 폐지) | **이용사업자(매장)** — 계약 상대방 | 발생내용 · 원인 · 피해확산 방지 조치 · 이용자 피해예방 방법 · 담당부서·연락처(원인 미확인 시 나머지 먼저) | 통지 코드·절차 문서 없음 → 계약서에 **의무·항목만** 규정 |
| 개인정보보호법 §34(유출 통지·신고) | 개인정보 유출 | **정보주체(회원 · 매장 고객)** + 보호위원회 신고 | 법정 항목 · 72시간 | 처리방침 v1.0 §(유출 대응) 참조 · 별도 절차 문서 없음 |

→ 계약서는 두 통지를 **별개 조**로 둔다(클라우드법 통지 = 매장에게 · 개인정보 유출 = 정보주체에게 처리방침 따라). 통지 기한 수치는 법정(개인정보 72시간)만 인용하고 클라우드법 통지는 "지체 없이" 로 둔다.

---

## 13. 이용자 정보 제3자 이용

| 이용 형태 | 현재 코드 | 원자료/집계 | 판정 |
|---|---|---|---|
| 서비스 제공(저장·표시·QR·태블릿·백업) | 전부 | 원자료 | 계약상 당연 허용(목적 내) |
| 운영자 열람(승인 콘솔 · 매장 목록 · Hub 통계) | 운영자 콘솔이 매장 정보(A) · 사본 현황 열람 | 원자료(A) · 집계 | 서비스 운영 목적 한정으로 규정 |
| 통계·서비스 개선 | `store_ai_snapshots`(매장 KPI 스냅샷 · organization 단위) · `store-analytics`(QR 스캔 집계) — **매장 자신에게 제공** | 매장별 집계 | 매장 본인 제공 = 허용 · **매장 간 비교·전체 통계 공개 코드 없음** |
| 공급자 마케팅(어느 매장이 내 콘텐츠를 가져갔는지 등) | 공급자에게 매장별 사본·스캔 데이터를 노출하는 route **없음**(`modules/neture` 에 qr_scan 참조 0) | — | **금지 원칙으로 규정 가능**(현행과 정합) · 향후 개시 시 개별 동의 |
| 외부 AI 전송 | `ai-proxy` 가 매장 입력 텍스트·상품 설명·이미지(vision) 를 Gemini/OpenAI 에 전송 · 본문 미저장(`ai_usage_logs` 메타만) | 원자료(입력분) | 처리방침 §7 + 통합약관 제17조 ⑦ 지시 · 계약서는 "AI 기능 사용 시에 한하여 · 모델 학습 목적 제공 없음(현행 설정 기준)" — 학습 미사용 설정은 privacy IR §6 확인 결과 인용(POLICY_DECISION_REQUIRED: 제공자 약정 확인) |
| 회사 자체 분석·상품 개발 | 코드상 매장 데이터 2차 활용 경로 없음 | — | 포괄 이용권 **부여 금지** · 필요 시 익명·집계 한정 조항 |

---

## 14. 콘텐츠 라이선스

| 구분 | 권리자 | 매장에 부여되는 권리 | 종료 후 | 통합약관 제16조와의 관계 |
|---|---|---|---|---|
| 매장 제작물(E · D 의 매장 편집분) | 매장 경영자 | — (자기 저작물) | 매장이 보유 · 회사는 서비스 제공 목적의 저장·표시 라이선스만(종료 시 소멸 · 백업 잔존 예외) | 제15조(회원 게시물) 원칙과 동일 |
| 공급자·운영자 원본(C) 및 그 사본(D) | 공급자 · 운영자(회사) | **서비스 기능 범위 내 열람·복사·편집·매장 내 표시(QR·태블릿·사이니지·POP 인쇄)** — 비독점 · 양도 불가 · 재라이선스 불가 | **계약 종료 시 사용권 종료**(단 이미 인쇄·배포된 물리물은 회수 불요) — 사본 반환은 §8(매장 편집분의 반환은 가능하되 원본 소재의 계속 사용은 불가) | 제16조 ①~⑦ 과 충돌 없음 — 제16조 ⑤·⑦ 이 "별도 계약에서 정한 범위" 를 지시하므로 매장 계약이 그 범위를 정한다 |
| handled-products(열람 · 사본 아님) · SPD `/p/{key}` | 공급자 · 회사 | 열람·QR 링크 노출 | 종료 시 링크 비활성 | 제16조 ① |
| AI 초안 | §16 | — | — | 제17조 |

**충돌 점검**: 통합약관 제16조 ④("사본 생성으로 저작권 이전 아님") ⑤("별도 계약 허용 범위") ⑦("세부 이용범위·수정권한·제공기간·철회조건은 공급자 계약 또는 매장 경영자 계약") → 매장 계약이 ⑦ 을 채우는 구조. **매장 계약이 "사본은 매장 소유" 라고 쓰면 ④ 와 충돌** — "사본의 관리·편집·표시 권한은 매장에 있으나 원저작권은 이전되지 않는다" 로 표현해야 한다. 공급자 콘텐츠 **철회**(공급자가 원본을 삭제·비공개 전환) 시 기존 사본의 취급(존속 vs 사용 중지)은 POLICY_DECISION_REQUIRED(현행: 원본 변경 비전파 → 사본 존속).

---

## 15. QR · 공개노출 책임

| 사실 | 값 |
|---|---|
| 공개 경로 | `/qr/{slug}`(매장 사본 콘텐츠 · 로그인 불요) · `/p/{key}`(상품 설명 · 고정 QR) · 태블릿(매장 내 기기) · 사이니지 TV 재생 · POP 인쇄물 |
| 노출 주체 | 매장 경영자가 QR 생성·활성·배치(`store_qr_placements`) · 내용 선택 |
| 회사 역할 | 호스팅 · 링크 제공 · 스캔 집계(`store_qr_scan_events` · IP/UA 없음 여부는 entity 기준 확인 필요 — 본 IR 미확인) |
| 콘텐츠 규제 | 의약품·화장품 광고 표시 규제(약사법 · 화장품법 · 표시광고법)는 **매장 노출 시점의 매장 책임** · 공급자 원본의 위법 표시는 공급자 책임 · 회사는 content-guard(`product-description-guard.rules.ts`) 로 일부 검사 |
| 소비자(최종이용자) | O4O 회원 아님 · 개인정보 수집 없음(스캔 이벤트 외) |

→ 계약서: 매장이 QR·태블릿·사이니지로 **공개 노출한 콘텐츠의 표시·광고 적법성 책임은 매장**에 있고, 공급자 원본 오류는 공급자 계약으로 이전되며, 회사는 고의·중과실 외 면책(표준계약서 §22 ② 게시정보 신뢰도 면책 채택). 업종별 세부 법규는 열거하지 않는다(§17).

---

## 16. AI 제작물

| 사실 | 값 |
|---|---|
| 기능 | QR 설명 초안(`ai-proxy` qr-description) · 콘텐츠 생성·URL→블록 · 매장 AI 요약(`store_ai_insights`) · 상품 AI 콘텐츠(`product_ai_contents`) |
| 저장 방식 | AI 결과는 사용자가 **편집 후 저장**(초안) · `ai_generated` 표시 컬럼 없음 |
| 외부 제공자 | Gemini · OpenAI(처리방침 정합 확인 항목) |

→ 계약서: 통합약관 제17조를 **그대로 준용**하고 매장 특화 2항만 추가 — ① AI 초안을 **공개(QR·태블릿·사이니지) 전 매장이 검토·확정**할 의무(약사·의약품 정보 특히) ② AI 결과물에 대한 권리는 매장이 편집·확정한 범위에서 매장의 제작자료(E)로 취급하되 제3자 권리 보증은 없음. 학습 목적 미사용은 §13 과 동일하게 제공자 약정 확인 후 기재.

---

## 17. 매장 운영상 법적 책임

- 원칙: 계약서는 **업종별 세부 법규(약사법 · 화장품법 · 의료기기법 · 식품표시광고법 등)를 열거하지 않는다.** "매장 경영자는 자신의 영업에 적용되는 법령을 준수하며, 서비스에 등록·노출하는 정보의 적법성을 책임진다"(표준계약서 §8 ① 이용사업자 법령 준수 의무 채택) 로 일반화한다.
- 회사가 제공하는 content-guard · 운영자 검수는 **보조 수단**이며 적법성 보증이 아님을 명시(면책 §22 채택).
- 약사 자격(`kpa_pharmacist_profiles`)은 계약 요건이 아니라 서비스별 가입 요건(통합약관 제6조) — 매장 계약은 이를 반복하지 않고 "해당 서비스 회원 자격 유지" 를 전제 조건으로만 둔다.

---

## 18. 이용료

| 항목 | 사실 | 판정 |
|---|---|---|
| 현재 매장 서비스 | 전 기능 무료 · 요금 청구 코드 없음 | **`CURRENT_FREE`** |
| 유료 이용권 코드 | `store-entitlement.routes.ts` `POST /store-entitlements/subscriptions/prepare|confirm` · plan `FOREIGN_VISITOR_SALES_SUPPORT` 30일 · 서버 catalog 가격 · Toss 1회결제 · **sandbox 키** · `store_paid_feature_entitlements` **0 row**(2026-09-17) · billing key 없음 · 환불/취소 V1 미구현 | CODE_ONLY |
| 계약서 취급 | 표준계약서 §10~§12(요금·청구·정산) · §18 환급 · B2C §7·8 청약철회는 **채택하지 않음**. "이용료는 무료 · 유료 서비스는 개별 신청서(Order Form)로 개시" 트리거 조 1개 | **`FUTURE_PAID_TRIGGER`** — 가격·기간·환불 규정 임의 삽입 금지(catalog 99,000원/30일 값도 계약서 본문에 쓰지 않음) |

---

## 19. 기본계약 vs 신청서(Order Form)

| 구조 | 필요성 | 근거 |
|---|---|---|
| 기본계약(본문) | 필수 — 당사자 · 정의 · 서비스 범위 · 데이터 권리 · 종료·반환 · 장애 · 통지 · 책임 | 3 서비스 공통 · 무료 |
| 별표 1 서비스 범위·데이터 별표 | 필수 — §6 기능 표 · §7 A~F 유형 · 저장 위치·백업(공공용 고지 8항목 참고) | 사실이 서비스별로 다름(KPA 개설약사 · KCos 판매자 · PH 약국 경영자) |
| 별표 2 매장 신청서 | **필요** — 서비스 · 매장명 · 사업자번호 · 대표자 · 연락처 · 동의일 · 버전. 현재 가입 화면이 이 역할을 대체(KPA·KCos 는 가입 폼 · PH 는 약국명만) | PH 사업자정보 보완 · 1 Store : N Services 구조(`organization_service_enrollments`)에서 서비스별 신청 단위 필요 |
| 별표 3 유료 이용권 Order Form | 향후 — 플랜 · 기간 · 금액 · 환불 | FUTURE_PAID_TRIGGER |
| 별표 4 SLA | 향후 | NO_SLA_CURRENTLY |

→ **기본계약 + 별표 1·2 를 v1.0 범위**로, 별표 3·4 는 제목만 예약한다. 신청서(별표 2) 의 전자적 구현은 §20.

---

## 20. 계약 체결 방식 (기존 구조 우선)

**현행 흐름**: 회원가입(통합약관 동의 `user_policy_acceptances` document_type=`terms`) → 서비스별 store_owner 신청(KPA 개설약사 유형 · KCos 판매자 · PH 약국 경영자) → 운영자 승인(`MembershipApprovalService` · KPA 자동 조직 생성) → `role_assignments` store_owner → Store Workspace 진입(`StoreOwnerGuard` + `MembershipGate`).

**기존 구조로 계약 동의를 받을 수 있는가 — 코드 확인**

| 구성 | 현재 값 | 계약 동의에 쓰려면 |
|---|---|---|
| `service_policy_documents.document_type` | 허용 목록 `SUPPORTED_POLICY_DOCUMENT_TYPES` = terms · privacy · refund · commerce · **seller** · community · marketing · location · **custom**(`service-legal-scope.ts` L49~59) — `store_owner_agreement` 는 **없음**(admin API 가 `INVALID_DOCUMENT_TYPE` 거절) | ① `seller` 를 "매장 경영자 계약" 으로 전용(의미 drift · 비권장) ② `custom` + slug `store-owner-agreement`(현행 가능 · 문서 유형 식별을 slug 에 의존) ③ 허용 목록에 `store_owner_agreement` 추가(코드 1줄 · 별도 WO) |
| 공개 API `GET /public/services/{key}/policies/{documentType}` | documentType 에 제약 없음(published 최신 1건) | custom/신규 유형 모두 열람 가능 |
| `user_policy_acceptances` | 컬럼 `document_type varchar(50)` · `acceptance_kind` CHECK(agreement · acknowledgement · consent) · unique(user_id, service_key, policy_document_id) · **document_type 에 CHECK 없음** | 테이블 구조는 계약 동의 row 저장 가능 |
| 동의 기록 API `policyAcceptanceService.accept` | `row.document_type !== REQUIRED_POLICY_DOCUMENT_TYPE('terms')` 이면 거절(`policy-acceptance.service.ts` L183) · pending 판정도 terms 전용 | **terms 외 문서 동의는 현재 API 로 불가** → 계약 동의 기록 경로 신설 필요(서비스 확장 또는 별도 endpoint) |
| 게이트 | 428 `TERMS_ACCEPTANCE_REQUIRED` 는 terms 만 | store_owner 전용 게이트(Store Workspace 진입 시 계약 미동의 → 동의 화면)는 **신규** |
| 사업자정보(신청서 별표 2) | KPA `users.businessInfo` · KCos 가입 폼 → businessInfo · PH 약국명만 | 계약 동의 시점에 사업자정보 확인·보완 UI 필요(PH 필수) |

**판정**: `service_policy_documents` + `user_policy_acceptances` **기존 테이블 재사용이 타당**(별도 계약 테이블 신설 불필요 · 버전·hash·동의시각 추적 구조 동일). 다만 ① document_type 확장(`store_owner_agreement` 권장 · `custom` 은 임시 대안) ② 동의 API 의 terms 전용 제약 완화 ③ Store Workspace 진입 게이트 ④ 사업자정보 보완 화면 — 4 항목은 **구현 WO**(본 IR 범위 밖 · 코드 변경 0). 동의 kind 는 `agreement`. **기존 store_owner 15명(legacy `pharmacy` 2 포함)** 은 게시 후 Store Workspace 진입 시 동의(통합약관 재동의 E2E 와 같은 방식).

---

## 21. 계약 변경

- 표준계약서 §9 ②(이용사업자에게 불리하고 중요한 변경은 **동의**) · §23 ③(30일 전 변경 통지) 채택.
- 통합약관 제3조(7일/30일 게시 변경)는 약관 방식 — **매장 계약의 중요 조건(데이터 권리 · 반환·파기 · 이용료 · 라이선스 범위)은 일방 공지로 변경하지 않는다.** 기본계약 개정 = 새 version 게시 + **재동의**(현행 acceptance 구조가 버전별 row 이므로 가능) · 개별 신청서 변경 = 매장 정보 화면 수정 또는 재신청.
- 불리하지 않은 기능 추가·명칭 변경은 통지만(§23 ③ 예외 아님 · 30일 전 게시).

---

## 22. 표준계약서(B2B 26조) 비교표

범례: **원문 유지**(빈칸만 채움) · **수정 필요**(O4O 사실에 맞춰 문구 변경) · **O4O 추가**(표준계약서에 없는 조) · **제외**(채택 안 함 · 사유)

| # | 표준계약서 조 | 판정 | O4O 적용 내용 · 사유 |
|---|---|---|---|
| 1 | §1 목적 | 원문 유지 | "회사가 제공하는 O4O Store Workspace(클라우드 방식 매장 업무공간 서비스)" 로 서비스명만 특정 |
| 2 | §2 정의 | 수정 필요 | 공급사업자→회사 · 이용사업자→매장 경영자(사업자) · 최종이용자→매장 고객 · **이용자 정보 = §7 A·B(자체)·D·E** 로 한정 · "공급자 콘텐츠" · "매장 사본" · "매장 제작자료" · "Store Workspace" 정의 추가 · SLA 정의는 유지하되 "별표 4 체결 시" 단서 |
| 3 | §3 계약서의 명시 | 원문 유지 | 게시 = `GET /public/services/{key}/policies/…` + 서비스 정책 페이지 |
| 4 | §4 해석 | 수정 필요 | 통합약관 v1.0 과의 관계(통합약관 제4조 ③ "별도 계약 우선") · 개인정보 처리방침 · 공급자 계약 명시 |
| 5 | §5 이용신청 | 수정 필요 | 신청 = 서비스별 store_owner 가입·신청(별표 2) · 사업자 실제 정보 · PH 사업자정보 보완 |
| 6 | §6 승낙과 제한 | 수정 필요 | 운영자 승인(`MembershipApprovalService`) 도달 시 성립 · 거절 사유(통합약관 제5조 ④ 준용) · 승인 후 계약 동의 시점 명시(§20) |
| 7 | §7 공급사업자 의무 | 수정 필요 | ① SLA 문구 → "별표 4 체결 시" · ② 정기점검 사전통지 유지(일수 POLICY_DECISION) · ③ 장애 복구 노력 유지 · ④ 정보보호 조치 유지 · ⑤ 이용현황 확인수단 → 매장 분석·AI 요약 화면(현행) |
| 8 | §8 이용사업자 의무 | 원문 유지 | 법령 준수 · 접속정보 관리 · 통지사항 확인 · **요금 납부 항목만 "유료 서비스 이용 시" 단서** |
| 9 | §9 서비스 제공·변경 | 원문 유지 | 불리하고 중요한 변경은 동의(§21) |
| 10 | §10 요금 | 제외 → FUTURE_PAID_TRIGGER | 무료 원칙 1항 + "유료 서비스는 별표 3 Order Form" 로 대체 |
| 11 | §11 청구 | 제외 | 유료 개시 시 |
| 12 | §12 정산 | 제외 | 유료 개시 시 |
| 13 | §13 이용 정지 | 수정 필요 | 통합약관 제10조(이용제한) 준용 + Store Workspace 특유 사유(공개 노출 콘텐츠 위법 · 공급자 콘텐츠 무단 외부 사용) |
| 14 | §14 일시 중지 | 원문 유지 | 통합약관 제12조 ② 와 동일 사유 |
| 15 | §15 제공 중단 | 수정 필요 | 점검 통지 (__)일 → POLICY_DECISION · "초과 중단 시 요금 공제" 항 삭제(무료) · 사후 통지 유지 |
| 16 | §16 이용제한 | 수정 필요 | 통합약관 제10조 준용 · 이의신청 |
| 17 | §17 이용사업자 해제·해지 | 수정 필요 | 매장 해지 = 문의창구 요청(자체 탈퇴 없음 · 현행) · 특정 서비스만 해지(1 Store : N Services) 가능 |
| 18 | §18 공급사업자 해제·해지 | 수정 필요 | 사업 종료 30일 전 통지 유지 · 통지 항목(종료일 · 반환 방법·기간 · 파기 예정일 · 연락처 = B2C §21 ②) · 환급비용 항 → 유료 개시 시 |
| 19 | §19 이용자 정보 보호 | 수정 필요 | "이용자 정보 처리방침" 별도 문서 대신 **별표 1(저장 위치·백업·제3자 이용 §13)** + 개인정보 처리방침 지시 |
| 20 | §20 이용자 정보 처리(반환·파기·이관) | 수정 필요 | 반환 = "요청 기간 내 합리적 형식으로 제공"(일괄 export 부재 · §9) · 파기 = "활성 저장소 삭제 + 백업 주기 만료 시 소멸"(§8) · 이관 협조 = "합리적 범위" · **즉시·전체·완전 표현 금지** |
| 21 | §21 손해배상 | 수정 필요 | SLA 미달 손해액 → "별표 4 체결 시" · 무료 서비스 배상 범위는 통합약관 제21조 준용(고의·중과실 외 제한) |
| 22 | §22 면책 | 원문 유지 | 6호 + 게시정보 신뢰(공급자 콘텐츠 · AI 초안) · IP 분쟁 · 이용사업자 간 분쟁 — O4O 구조와 정합 |
| 23 | §23 통지 | 수정 필요 | 5 유형·항목 유지 · 30일 예외 유지 · 통지 수단 = 이메일 · 서비스 내 게시 · 공지(§10) · 개인정보 유출 통지는 처리방침(§12) 분리 |
| 24 | §24 양도 제한 | 원문 유지 | 매장 양도(사업자 변경) 시 회사 동의 · 조직 승계 절차 없음(FUTURE) |
| 25 | §25 관할 | 원문 유지 | 통합약관 제23조와 동일 |
| 26 | §26 준거법 | 원문 유지 | 대한민국법 |
| 27 | B2C §7·§8 청약철회·효과 | 제외 | 사업자 계약 · 무료 |
| 28 | B2C §21 반환·파기 통지 요건 | 채택(§18·§20 에 병합) | 통지 항목 명문 |
| 29 | 공공용 §7 ② 계약 전 고지 8항목 | 구조 참고 → 별표 1 | 저장 국가(서울) · 암호화 · 제3자 제공 · 종료 시 삭제 · 파기 · 임치(해당 없음) |

원문 유지 9 · 수정 필요 15 · 제외 5(요금 3 · 청약철회 2) · O4O 추가는 §23.

---

## 23. O4O 추가조항 후보 (표준계약서에 없는 것)

| # | 조항 | 근거 | 판정 |
|---|---|---|---|
| 1 | **매장 업무공간(Store Workspace) 조** — Home · My Store · Store Hub · My Services 구조 · 매장 자산 경계 = 조직(`organizationId`) · 1 Store : N Services · 서비스별 기능 차이는 별표 1 | ROLE-WORKSPACE §3 | 필수 |
| 2 | **공급자 콘텐츠 가져오기 조** — Store Hub 의 공급자·운영자 콘텐츠는 제3자 제공 정보 · 가져오기 = 사본 · 원본 변경 비전파 · 정확성 책임 = 공급자 · 회사 = 전달 매체 | §2 · §14 · 통합약관 제16조 | 필수 |
| 3 | **독립 매장 사본 조** — 사본의 관리·편집·표시 권한 = 매장 · 원저작권 비이전 · 종료 시 사용권 소멸 · provenance 보존 · 공급자 철회 시 취급(POLICY_DECISION) | §7 D · §14 | 필수 |
| 4 | **QR·태블릿·사이니지 공개 노출 조** — 노출 주체·적법성 책임 = 매장 · 회사 호스팅 · 종료 시 공개 URL 비활성 · 인쇄물 회수 불요 | §15 | 필수 |
| 5 | **AI 제작자료 조** — 통합약관 제17조 준용 + 공개 전 검토 의무 + 권리 귀속(매장 편집·확정분) | §16 | 필수 |
| 6 | **포인트 조** — 통합약관 제14조 준용 · 매장 계약 고유 포인트 없음(`service_point_budgets` kpa-society 1 · 매장 대상 아님) | 통합약관 IR §8 | 준용 1항(추가 규정 없음) |
| 7 | **향후 유료 이용권 조** — 무료 원칙 · 별표 3 Order Form 으로 개시 · 가격·환불은 개시 시 · 전자상거래법·PG 약관 반영 | §18 | 필수(트리거) |
| + | 데이터 유형·저장 위치·백업·반환·파기 **별표 1** | §7 · §8 · §11 · 공공용 고지 8항목 | 필수 |
| + | 매장 신청서 **별표 2** | §19 · §20 | 필수 |

---

## 24. 계약서 권장 구조 (v1.0 작성 지침)

```text
O4O 매장 경영자 이용계약 v1.0
제1장 총칙            제1조 목적 · 제2조 정의 · 제3조 계약서의 게시 · 제4조 통합약관·처리방침·공급자 계약과의 관계
제2장 계약의 체결      제5조 이용신청(별표 2) · 제6조 승낙과 제한 · 제7조 계약의 성립 시점과 동의 기록
제3장 서비스          제8조 Store Workspace 의 내용(별표 1) · 제9조 공급자·운영자 콘텐츠와 매장 사본 · 제10조 QR·태블릿·사이니지 공개 노출 · 제11조 AI 제작자료 · 제12조 서비스 변경 · 제13조 일시 중지·제공 중단·점검 통지 · 제14조 무료 원칙과 향후 유료 이용권(별표 3) · 제15조 포인트(준용)
제4장 당사자의 의무    제16조 회사의 의무(안정 제공 · 정보보호 · 백업 · 이용현황 제공) · 제17조 매장 경영자의 의무(법령 준수 · 접속정보 · 등록정보 진실 · 통지 확인)
제5장 이용자 정보      제18조 이용자 정보의 범위(별표 1 데이터 유형) · 제19조 보호와 저장 위치 · 제20조 제3자 이용의 제한 · 제21조 종료 시 반환·파기·이관
제6장 이용제한·해지    제22조 이용제한 · 제23조 매장 경영자의 해지 · 제24조 회사의 해지·사업 종료(통지 항목)
제7장 책임·통지 등    제25조 손해배상 · 제26조 면책 · 제27조 침해사고·중단·종료 통지 · 제28조 개인정보 유출 통지(처리방침) · 제29조 계약의 변경(동의 원칙) · 제30조 양도 제한 · 제31조 관할·준거법
부칙                  시행일 · 기존 store_owner 회원 적용(진입 시 동의) · 표준계약서 개정 시 정합
별표 1  서비스 범위 · 데이터 유형(A~F) · 저장 위치·백업·파기 · 제3자 이용 항목
별표 2  매장 신청서(서비스 · 매장명 · 사업자정보 · 대표자 · 연락처 · 동의 버전)
별표 3  (예약) 유료 이용권 Order Form
별표 4  (예약) 서비스수준협약(SLA)
```

---

## 25. 산출물 경로

- 본 IR: `docs/investigations/IR-O4O-STORE-OWNER-SERVICE-AGREEMENT-STANDARD-CONTRACT-BASELINE-V1.md`
- 후속 계약서(별도 지시 시): `docs/baseline/O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md`(제안 · 미작성) · 게시 시 `service_policy_documents`(document_type 확정은 §20 구현 WO)
- 표준계약서 원문 출처(재확보 경로): NIPA 「클라우드컴퓨팅 이용자 보호 길라잡이」 PDF 붙임 1 · 과기정통부 홈페이지 정책자료 · 대전도시공사 게시 HWP(공공용 변형) — 저장소에 원문을 복사하지 않았다(저작·배포 범위 미확인).

---

## 26. 변경 금지 확인

| 항목 | 값 |
|---|---|
| 코드 변경 | 0 (`git status` clean · 본 IR 파일 1건만 추가) |
| DB write | 0 (운영 DB 접속 없음 · 수치는 선행 IR 인용) |
| migration | 0 |
| policy document write | 0 (`service_policy_documents` 무접촉) |
| role / membership 변경 | 0 |
| 배포 | 0 |
| 계약서 초안 | 작성하지 않음(§24 는 구조 지침만) |

---

## 27. 완료 보고 항목

| # | 항목 | 결과 |
|---|---|---|
| 1 | Git 기준선 | `c3d4228a4` (HEAD == origin/main · clean) |
| 2 | 적용 가능한 표준계약서 | 클라우드컴퓨팅법 §24 「공급사업자–이용사업자 간 표준계약서(B2B)」 2016-12-04 미래창조과학부 공개 26조(원문 확보 · 개정 미확인) · 보조: B2C 판 §21 · 공공용 고지 8항목 · 품질·성능 기준 고시 제2017-7호(7기준 11세부) · 데이터 표준계약서(2024-10 · 개념 참고) |
| 3 | 클라우드컴퓨팅서비스 해당성 | **CLOUD_LIKE_SAAS** (법률 최종판단 미단정 · 표준계약서 준용 골격) |
| 4 | 대상·역할 | KPA · KCos · PH 의 `store_owner`(15 + legacy 2) · 사업자 전제(KPA 사업자번호 필수 · KCos 폼 · PH 약국명만 → 보완 필요) · Neture 제외(공급 경로만) |
| 5 | 무료/유료 | CURRENT_FREE · 유료 이용권 CODE_ONLY(entitlement 0 · sandbox) → FUTURE_PAID_TRIGGER |
| 6 | Store Workspace 기능 | ACTIVE 11 · PARTIAL 5 · CODE_ONLY 1(유료) · NOT_ACTIVE 1(소비자 판매) — §6 |
| 7 | 데이터 권리 | A~F 유형별 분리 · 이용자 정보 = A + B(자체) + D + E · C(공급자 원본) · F(로그) 제외 — §7 |
| 8 | 콘텐츠·사본 | 사본 관리·편집·표시권 = 매장 · 원저작권 비이전 · 종료 시 사용권 소멸 · 통합약관 제16조 ⑦ 을 매장 계약이 채움 — §14 |
| 9 | 종료·반환·파기 | 자체 탈퇴·조직 삭제·일괄 export·GCS 연동 전부 NOT_IMPLEMENTED · 개별 삭제·다운로드만 · "즉시·전체·완전" 표현 금지 · 별도 WO 후보(종료 파기 자동화 · export V1) — §8 · §9 |
| 10 | 장애·SLA | NO_SLA_CURRENTLY · 측정 체계 없음 · Cloud SQL 백업 7세대/PITR · 미디어 백업 없음 · 수치 기재 금지 — §11 |
| 11 | QR·책임 | 공개 노출 적법성 = 매장 · 공급자 원본 = 공급자 · 회사 면책(§22 채택) — §15 |
| 12 | AI | 통합약관 제17조 준용 + 공개 전 검토 + 권리 귀속 2항 — §16 |
| 13 | 체결 방식 | 기존 `service_policy_documents` + `user_policy_acceptances` 재사용 · document_type `store_owner_agreement` 추가 권장(현행 허용 목록에 없음 · `custom` 임시 대안) · 동의 API terms 전용 제약 완화 · Store Workspace 게이트 · PH 사업자정보 보완 = 구현 WO 4항목 — §20 |
| 14 | 비교표 | 29 항목(원문 유지 9 · 수정 15 · 제외 5) — §22 |
| 15 | 추가조항 최소목록 | 7 조 + 별표 1·2 — §23 |
| 16 | POLICY_DECISION_REQUIRED | ① 클라우드법 적용 최종판단 ② KCos·PH 사업자정보 필수화 ③ 점검·해지 통지 일수 ④ 반환 요청 기간·파기 예정일 ⑤ 백업 주기·보관기간 기재값 ⑥ 공급자 철회 시 사본 취급 ⑦ 외부 AI 학습 미사용 약정 확인 ⑧ action_logs 등 로그 보유기간 |
| 17 | FUTURE_TRIGGER | 유료 이용권(별표 3) · SLA(별표 4) · 일괄 export · 자체 탈퇴·종료 파기 자동화 · 자동 통지 · 표준계약서 개정 정합 · 매장 양도 승계 |
| 18 | 조문 구조 | 7장 31조 + 부칙 + 별표 4(2 예약) — §24 |
| 19 | 코드·DB 변경 | 0 / 0 (§26) |

---

*조사 종료: 2026-09-18 · 다음 단계: 「O4O 매장 경영자 이용계약 v1.0」 작성(별도 지시)*
