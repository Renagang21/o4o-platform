# IR-O4O-PRIVACY-DATA-CENSUS-V1 — O4O 개인정보 전수 Census 조사 결과

> **상태**: COMPLETE_WITH_UNKNOWNS · **조사일**: 2026-09-17 · **WO**: [`WO-O4O-PRIVACY-DATA-CENSUS-V1`](../work-orders/WO-O4O-PRIVACY-DATA-CENSUS-V1.md)
> **성격**: 조사 전용(read-only). 코드 · DB · API · 로그인 구조 변경 0건. 프로덕션 DB 조회 0건(정적 코드 census 만).
> **개인정보 실값**: 본 문서에 기록하지 않음(테스트 계정 이메일 도메인 패턴만 언급).
> **판정 코드**: `KEEP_CORE` `MOVE_CORE` `CLAIM_ONLY` `RELATIONSHIP` `MINIMIZE` `DELETE_CANDIDATE` `SECURITY_FIX` `REVIEW` (+ `CRITICAL` · `OVEREXPOSURE` 표기). 판정은 **후보**이며 최종 5범주 판정(정말 필요 / Core 한 번만 / Relationship 전환 / Claim·Role 만 / 삭제)은 사용자가 내린다.

---

## 0. 요약 (필수 숫자 7종)

| # | 항목 | 값 | 근거 절 |
|---|---|---|---|
| 1 | DB 개인정보 field 수 | **219 필드 / 62 테이블** (entity 237개 · 3,216 컬럼 전수 스캔 → 키워드 후보 328/128 테이블 → 수기 정제) | §2 · §3 |
| 2 | 중복 저장 후보 | **9 클러스터** (면허번호 4곳 · 사업자번호 8곳 · 이메일 14곳 · 전화 9곳 · 이름 8곳 · 약국명/주소 4곳 · 대학/학년 2곳 · activity_type 2곳 · password 2곳) + `BusinessInfo` 타입 정의 2벌 | §4 |
| 3 | 과다노출 API (`OVEREXPOSURE`) | **3건** + REVIEW 3건 | §5 |
| 4 | Relationship 전환 후보 | **11건** | §4-2 · §9 |
| 5 | 삭제 후보 (`DELETE_CANDIDATE`) | **9건** (dead runtime 테이블 3 · dead 소셜 로그인 구성 4 · dead 프론트 2) | §9 |
| 6 | Security Fix 후보 (`SECURITY_FIX`) | **9건** (그중 `CRITICAL` 1건) | §7-1 |
| 7 | 정책 추가결정 필요 (`REVIEW`) | **10건** | §11 |

**가장 중요한 결과 (Phase 1 Target Model 입력)** — `Google Identity → O4O User → Credential/Relationship → Claim/Role → 개별 서비스` 흐름의 현재 구현도:

| 계층 | 구현 상태 | 현재 코드 |
|---|---|---|
| Google Identity | **0 % (dead runtime)** | passport Google 전략은 등록되나(`config/passportDynamic.ts`) `passport.authenticate` 호출 0건 · `/api/v1/social/*` 라우트 mount 0건. **현행 로그인 = email + password 단일 경로** |
| O4O User | 존재하나 **8 구분 혼재** | `users` 한 테이블에 Identity · Contact · Profile · Credential(password) · Business(json) · Social provider · Session/Lock · Consent 가 함께 있음 (§3-1) |
| Credential | **이중 구현** | `users.password`(L1) + `service_credentials.password_hash`(L2, serviceKey 별). 로그인은 `credentialHash ?? user.password` 우선순위 |
| Relationship | **서비스별 제각각 · 문자열 복제** | `organization_members`(정본) 외에 `kpa_members` · `branch_memberships` · `cosmetics_members` · `cosmetics_store_members` · `neture_suppliers.user_id` 가 각자 관계+속성 저장. 약국명/주소/사업자번호가 문자열로 복제 |
| Claim / Role | **구현됨 (SSOT 성립)** | `role_assignments`(SSOT) · `service_memberships` · JWT `roles[]` · `memberships[]` · `accountAccess` (`utils/token.utils.ts:87`). `businessInfo` 는 타입에만 있고 **실제 JWT 에 미삽입** |
| 개별 서비스 | 구현됨 | serviceKey 격리 · `requireScope('{service}:{role}')` |

→ **gap 요약**: Identity 계층은 미구현(0), Credential 은 이중, Relationship 은 비정규 복제. Claim/Role 만 목표 모델에 근접.

---

## 1. 조사 범위 · 방법

- 대상: `apps/api-server/src`(entity · migration · baseline · routes · controllers · services · middleware · logger), `packages/*`(entity · auth-client · auth-context · ui), `apps/admin-dashboard/src`, `services/web-*/src`, `.env.example`, `.github/workflows`.
- 방법: ① entity 정규식 전수 스캔(`@Entity('x')` + `@Entity({ name: 'x' })` 두 형식) → 237 entity · 3,216 컬럼 ② 개인정보 키워드 13종 필터 → 328 후보 ③ 후보를 수기 정제(상품명 · 파일명 · 정책명 등 제외) → 219 필드 ④ `canonical-schema-baseline.ts`(284 테이블) 과 교차 → entity 없는 테이블 65 · baseline 없는 entity 16 ⑤ 저장 경로 · API · 프론트 · 로그 · 업로드 · 외부 전송 · AI · seed 각 축을 서로 다른 검색 경로로 교차검증.
- 하지 않은 것: 프로덕션 DB SELECT(불필요 판단) · 다른 세션 dirty 파일 접촉 · 코드 수정.
- 한계(UNKNOWN): 실제 운영 데이터 잔존 여부(예: `*@test.test` 계정 존재, `refresh_tokens` 행 수, `kyc_documents` 의 `id_card` 행 존재)는 코드로 판정 불가 → §12.

## 2. 표 1 — 개인정보 Inventory (항목 기준)

| 개인정보 항목 | 저장 위치 (테이블.컬럼) | 수집 경로 | 노출 API (대표) | 판정 후보 |
|---|---|---|---|---|
| 이메일 (계정) | `users.email`(unique) | `/auth/register` `/auth/signup` · admin 생성 | `/auth/me` · `/users`(admin) · `/admin/platform-users` · KPA members(operator) · CSV export | `KEEP_CORE` |
| 이메일 (복제·파생) | `linked_accounts.email` · `login_attempts.email` · `account_activities.email` · `email_verification_tokens.email` · `password_reset_tokens.email` · `kpa_approval_requests.requester_email` · `users.businessInfo.{email,taxInvoiceEmail,businessEmail,contactEmail}` · `neture_suppliers.{tax_invoice_email,contact_email,settlement_contact_email}` · `kpa_pharmacy_requests.tax_invoice_email` · 문의 4테이블 · `operator_notification_settings.operator_email*` · `service_contact_settings.recipient_emails` | 각 도메인 write | 도메인 API | 계정 이메일=`KEEP_CORE`, 사업/세금계산서/문의 이메일=업무 속성(`MINIMIZE`/`REVIEW`), 토큰 테이블 이메일=`MINIMIZE`(user_id 로 대체 가능), dead 테이블=`DELETE_CANDIDATE` |
| 비밀번호 | `users.password`(bcrypt) · `service_credentials.password_hash`(bcrypt) | register · admin reset · `PUT /users/password` | 미반환(sanitizer) | `KEEP_CORE`(단일화 `REVIEW`) |
| 이름 | `users.{name,firstName,lastName,nickname}` · `linked_accounts.displayName` · `instructor_profiles.display_name` · `branch_officers.name` · `cosmetics_stores.owner_name` · `cosmetics_store_applications.owner_name` · `neture_suppliers.{representative_name,manager_name,settlement_contact_name,settlement_account_holder}` · `forum_category_requests.{requester_name,reviewer_name}` · `kpa_approval_requests.requester_name` · `tablet_interest_requests.customer_name` · `neture_orders.orderer_name` · `cosmetics_{price,product}_logs.user_name` · `cosmetics_contents.author_name` · `service_legal_profiles.{representative_name,privacy_officer_name}` | 다수 | 다수 | `users.name`=`KEEP_CORE`, `firstName/lastName`=`MINIMIZE`(대부분 null, 검색 계약만 사용), 문자열 복제=`RELATIONSHIP` |
| 전화 | `users.phone` · `users.businessInfo.{phone,managerPhone,businessPhone}` · `organizations.phone` · `kpa_organizations.phone` · `kpa_pharmacy_requests.{pharmacy_phone,owner_phone}` · `cosmetics_stores.contact_phone` · `cosmetics_store_applications.contact_phone` · `neture_suppliers.{contact_phone,manager_phone}` · `foreign_visitor_partners.contact_phone` · 문의 4테이블 · `service_legal_profiles.{privacy_officer_phone,customer_service_phone}` | 다수 | `/auth/me`(본인) · operator/admin | 개인 전화=`KEEP_CORE`(users) · 사업장 전화=`MOVE_CORE`(organizations) |
| 외부 메신저 연결 (Kakao 채널/오픈채팅 URL) | `users.{kakao_open_chat_url,kakao_channel_url,contact_enabled}` · `neture_suppliers.contact_kakao(+visibility)` | `PATCH /users/me/contact` · supplier 설정 | `/auth/me` · `/users/me/contact` · supplier 공개 프로필 | `REVIEW` — 정책상 "Connected Channel" 에 해당하며 로그인 수단 아님. 위치(users vs 별도 connected_channels)만 결정 필요 |
| 소셜 로그인 식별자 | `users.{provider,provider_id}` · `linked_accounts.{provider,providerId,providerData(json),profileImage}` · `linking_sessions.{provider,verificationToken,metadata}` | **writer dead** (소셜 라우트 미mount) | admin 응답에 `provider/provider_id` 유지(sanitizer 주석) | Google 용 `users.provider/provider_id`=`REVIEW`(Google 단일 로그인 시 재사용 가능), Kakao/Naver 축=`DELETE_CANDIDATE` |
| 프로필 사진 | `users.avatar` · `linked_accounts.profileImage` | `PATCH /users/me/profile` | `/auth/me` · instructor public | `KEEP_CORE` / `DELETE_CANDIDATE`(linked) |
| 사업자등록번호 | `users.businessInfo.businessNumber` · `organizations.business_number` · `cosmetics_stores.business_number` · `cosmetics_store_applications.business_number` · `physical_stores.business_number` · `neture_suppliers.business_number` · `role_applications.business_number` · `kpa_pharmacy_requests.business_number` · `service_legal_profiles.business_registration_number`(공개 법정정보) | register · 승인 · 매장 신청 · supplier 온보딩 | operator/admin | **8 곳 중복** → `MOVE_CORE`(organizations 1곳) + 신청 테이블은 `MINIMIZE`(승인 후 organizations 로 이관) |
| 사업장 주소 | `users.businessInfo.{businessAddress,address,storeAddress}` · `organizations.{address,address_detail}` · `kpa_members.pharmacy_address` · `branch_memberships.workplace_address` · `cosmetics_stores.{address,address_detail}` · `neture_suppliers.business_address` · `kpa_organizations.address` · `checkout_orders.shippingAddress(jsonb)` | 다수 | operator/admin | `MOVE_CORE`(organizations) · `kpa_members.pharmacy_address`/`branch_memberships.workplace_address`=`RELATIONSHIP` |
| 약사 면허번호 | `users.businessInfo.licenseNumber`(`auth-register.controller.ts:416`) · `kpa_members.license_number` · `kpa_pharmacist_profiles.license_number` · `kpa_instructor_qualifications.license_number` | register 1회에 **3곳 동시 write** + 강사 신청 | KPA operator members list · mypage · `GET /kpa/members/check-license`(**무인증**) | **4 곳 중복** → Qualification 정본 `kpa_pharmacist_profiles` 1곳(`MOVE_CORE`), 나머지 `RELATIONSHIP`/`DELETE_CANDIDATE`. `license_verified` 는 **어디서도 true 로 설정되지 않음**(검증 미구현) |
| 학적 (대학·학년) | `kpa_members.{university_name,student_year}` · `kpa_student_profiles.{university_name,student_year}` | register | KPA operator | 2곳 중복 → `kpa_student_profiles` 1곳 |
| 활동 유형 · 회비 구분 | `kpa_members.{activity_type,fee_category}` · `kpa_pharmacist_profiles.activity_type` · `branch_memberships.fee_category` | register · 연회비 | KPA | `CLAIM_ONLY` 후보(역할/자격 파생) |
| 은행 계좌 (정산) | `neture_suppliers.{settlement_bank_name,settlement_account_number,settlement_account_holder,settlement_bankbook_document_id}` | supplier 온보딩 | neture admin/operator/supplier 본인 | `KEEP_CORE`(Supplier 도메인) · 암호화 여부 `REVIEW`(평문 컬럼) |
| KYC 서류 | `kyc_documents.{documentType,fileUrl,fileName}` — 실제 write 타입: `business_registration` · `bank_statement` · `mail_order_report` · `regulated_category_evidence` · GCS private bucket(`gcs://` 경로, 다운로드는 `neture:admin`/`neture:operator`/본인 supplier guard) | supplier 온보딩 PDF 업로드 | 다운로드 API 3종(모두 guard 有) | `KEEP_CORE`. entity 주석의 `id_card`(신분증) 타입은 **writer 0건 · 프론트 0건** → `DELETE_CANDIDATE`(타입 정의만) |
| 강사 증빙 서류 | `kpa_instructor_qualifications.supporting_documents(jsonb url)` | 강사 신청 body 의 URL (업로드 경로 별도) | KPA operator | `REVIEW`(URL 출처·접근 통제 미확인) |
| 동의 이력 | `users.{tos_accepted_at,privacy_accepted_at,marketing_accepted}` · 문의 테이블 `privacy_consent` · `media_assets.consented_at` | register · 문의 | 없음 | `KEEP_CORE` |
| 접속 정보 (IP · UA · device · 위치) | `users.lastLoginIp`(**writer 0건**) · `refresh_tokens.{ipAddress,userAgent,deviceId}`(**writer 0건**) · `login_attempts.*`(**stub, writer 0건**) · `account_activities.{ipAddress,userAgent}`(`''` 고정 write) · `user_activity_logs.*`(**writer 0건**) · `audit_logs.{ipAddress,userAgent}` · 문의 4테이블 ip/ua · `lms_survey_responses.{ipAddress,userAgent}` · `lms_attendance.geoLocation` · `store_qr_scan_events.ip_hash` · `foreign_visitor_partner_qr_scan_events.{ip_hash,user_agent_hash}` · `channel_heartbeats.ip_address` · `neture_product_logs.ip_address` | 다수 | admin | dead 컬럼/테이블=`DELETE_CANDIDATE`, 해시 저장=양호, 평문 ip/ua=`MINIMIZE`+보존기간 `REVIEW` |
| 자유 텍스트 (문의·설문·AI 질문) | `contact_inquiries.message` · `contact_requests.message` · `platform_inquiries.message` · `neture_contact_messages.message` · `kpa_join_inquiries.message` · `lms_survey_responses.answers` · `ai_query_logs.{question,answer,contextData}` | 공개 문의 폼 · 설문 · AI 질의 | operator/admin | 보존기간 `REVIEW`. 문의 테이블 **4종 병존**(`contact_inquiries`/`contact_requests`/`platform_inquiries`/`neture_contact_messages`) → 통합 `REVIEW` |
| 세션 · 토큰 | `users.refreshTokenFamily` · `refresh_tokens.token`(평문 컬럼, dead) · `email_verification_tokens.token` · `password_reset_tokens.token` · `users.reset_password_token` · `linking_sessions.verificationToken` · `lms_survey_responses.anonymous_token` · `branch_domains.verification_token` | 인증 흐름 | 미반환(sanitizer) | `KEEP_CORE`(사용 중) / `DELETE_CANDIDATE`(dead) |
| 시스템 비밀값 (개인정보 아님, 보안) | `smtp_settings.{password,accessToken,refreshToken,clientSecret,apiKey,apiSecret}` · `platform_store_payment_configs.{api_key,api_secret}` · `cafe24_connections.{access_token_enc,refresh_token_enc}`(암호화) | admin 설정 | settings API | `REVIEW`(smtp_settings 평문 여부) |
| 공개 법정정보 | `service_legal_profiles.*` (대표자 · 개인정보책임자 이름/전화/이메일) | admin 입력 | 공개 footer | `KEEP_CORE`(법정 공개 의무, 개인정보 보호 대상 아님) |

## 3. 표 2 — 테이블별 Inventory (62 테이블)

### 3-1. auth-core (`users` 및 인증 계층) — FROZEN, 읽기 전용 조사

| 테이블 | 개인정보 컬럼 | 구분 | writer 상태 | 판정 후보 |
|---|---|---|---|---|
| `users` | email · password · firstName · lastName · name · nickname · avatar · phone · kakao_open_chat_url · kakao_channel_url · businessInfo(json) · provider · provider_id · refreshTokenFamily · lastLoginAt · lastLoginIp · loginAttempts · lockedUntil · reset_password_token · reset_password_expires · tos/privacy/marketing 동의 · approvedBy (24) | **Identity + Contact + Profile + Credential + Business + Social + Session/Lock + Consent 8 구분 혼재** | active (lastLoginIp writer 0) | Identity/Contact/Consent=`KEEP_CORE` · businessInfo(json)=`MOVE_CORE`→organizations · provider/provider_id=`REVIEW` · lastLoginIp/loginAttempts/lockedUntil=`REVIEW`(lock 기능 실사용 여부) · firstName/lastName=`MINIMIZE` |
| `service_credentials` | password_hash | Credential(L2) | active | `KEEP_CORE`(users.password 와 단일화 `REVIEW`) |
| `service_memberships` | approved_by | Claim | active | `CLAIM_ONLY` |
| `role_assignments` | assigned_by | Claim(SSOT) | active | `CLAIM_ONLY` |
| `refresh_tokens` | token(평문) · deviceId · userAgent · ipAddress | Session | **writer 0건** (읽기만: `GET /users/me/sessions`) | `DELETE_CANDIDATE` |
| `login_attempts` | email · ipAddress · userAgent · deviceId · location | Session | **`LoginSecurityService` 는 stub** → writer 0 | `DELETE_CANDIDATE` |
| `linking_sessions` | provider · verificationToken · metadata | Social | dead runtime(소셜 라우트 미mount) | `DELETE_CANDIDATE` |
| `linked_accounts` | provider · providerId · email · displayName · profileImage · providerData | Social | write 는 `linkOAuthAccount` 1 caller(`auth-login.service.ts:396`, 소셜 로그인 경로에서만) → 사실상 dead | `DELETE_CANDIDATE`(Kakao/Naver) · Google 전용 재설계 시 `REVIEW` |
| `account_activities` | email · ipAddress('' 고정) · userAgent('' 고정) · details | Activity | account-linking 서비스에서만 write → dead 경로 | `DELETE_CANDIDATE` |
| `user_activity_logs` | ipAddress · userAgent · metadata(adminUserEmail, old/new value, country/city) | Activity | **writer 0건** (baseline 에도 없음, entity-only) | `DELETE_CANDIDATE` |
| `audit_logs` | ipAddress · userAgent | Audit | active | `KEEP_CORE` + 보존기간 `REVIEW` |
| `email_verification_tokens` | email · token | Credential | active | `MINIMIZE`(email → user_id) |
| `password_reset_tokens` | email · token | Credential | active | `MINIMIZE`(email → user_id) |
| `kyc_documents` | documentType · fileUrl · fileName · verifiedBy | Document | active(Neture supplier 만) | `KEEP_CORE`(Supplier 도메인으로 `MOVE_CORE` 검토) |

### 3-2. KPA · 조직 · 매장 계층

| 테이블 | 개인정보 컬럼 | writer | 판정 후보 |
|---|---|---|---|
| `kpa_members` | license_number · university_name · student_year · pharmacy_name · pharmacy_address · activity_type · fee_category | register · operator | license/학적/activity 는 `kpa_pharmacist_profiles`/`kpa_student_profiles` 와 중복 → `RELATIONSHIP`/`DELETE_CANDIDATE`(컬럼) · pharmacy_name/address → organizations `RELATIONSHIP` |
| `kpa_pharmacist_profiles` | license_number · license_verified · activity_type · verified_by | register · promotion | **Qualification 정본** `KEEP_CORE`. `license_verified` true writer 0 → 검증 절차 `REVIEW` |
| `kpa_student_profiles` | university_name · student_year | register | `KEEP_CORE`(단일화 시) |
| `kpa_instructor_qualifications` | license_number · supporting_documents | 강사 신청 | license_number=`RELATIONSHIP`(profile 참조) · 서류=`REVIEW` |
| `instructor_profiles` | display_name · bio · organization(문자열) | LMS | organization=`RELATIONSHIP` |
| `member_qualifications` | qualification_type · metadata | KPA | `CLAIM_ONLY` |
| `kpa_pharmacy_requests` | pharmacy_name · business_number · pharmacy_phone · owner_phone · tax_invoice_email · payload | 약국 등록 신청 | `MINIMIZE`(승인 후 organizations 이관 · 신청 보존기간) |
| `branch_memberships` | workplace_name · workplace_address · fee_category | 분회 | workplace → organization `RELATIONSHIP` (약사 프로필 정본화 결정에서 "속성은 branch_memberships 컬럼" 확정됨 — 충돌 아님, 그 결정 유지 시 `KEEP_CORE`) |
| `branch_officers` | name(문자열, user_id nullable) | 분회 | `RELATIONSHIP` |
| `branch_sites` | contact(jsonb) | 분회 공개 사이트 | 공개 연락처 `KEEP_CORE` |
| `organizations` (entity 2 클래스 매핑: `Organization` + `OrganizationStore`) | address · address_detail · phone · business_number · metadata · created_by_user_id | 승인 sync(`organizationContactSync.ts`) | **사업장 정보 정본 후보** `KEEP_CORE`/`MOVE_CORE` 대상 |
| `organization_members` | metadata | 정본 관계 | `KEEP_CORE` |
| `kpa_organizations` | address · phone | KPA | organizations 와 중복 `REVIEW` |
| `cosmetics_stores` | business_number · owner_name · contact_phone · address · address_detail | KCos | organizations/users 참조로 `RELATIONSHIP` |
| `cosmetics_store_applications` | business_number · owner_name · contact_phone · address · applicant_user_id | KCos 신청 | `MINIMIZE` |
| `physical_stores` | business_number · store_name | Store | `RELATIONSHIP` |
| `role_applications` | business_name · business_number · metadata | 역할 신청 | `MINIMIZE` |
| `neture_suppliers` | 17 컬럼(연락처 3종+visibility · 사업자 · 대표/담당자 · 세금계산서 · 정산 계좌 · 서류 id · mail_order_sales) | supplier 온보딩 | Supplier 도메인 `KEEP_CORE` · 계좌 평문 `REVIEW` · representative/manager 이름 `RELATIONSHIP` 검토 |
| `foreign_visitor_partners` | contact_name · contact_email · contact_phone | 파트너 | `KEEP_CORE`(타 도메인) |

### 3-3. 문의 · 이벤트 · 로그 · 설정

| 테이블 | 개인정보 컬럼 | 판정 후보 |
|---|---|---|
| `contact_inquiries` · `contact_requests` · `platform_inquiries` · `neture_contact_messages` · `kpa_join_inquiries` | name · email · phone · organization_name · message · ip(_hash) · user_agent · privacy_consent | 비회원 문의 — `KEEP`(법적 동의 有) · **4종 병존 통합 + 보존기간 `REVIEW`** · 평문 ip(`platform_inquiries`, `neture_contact_messages.ipAddress`, `kpa_join_inquiries`)=`MINIMIZE`(해시로) |
| `forum_category_requests` · `kpa_approval_requests` · `tablet_interest_requests` · `neture_orders` | requester/reviewer/customer/orderer 이름 · 이메일 · 전화 | `RELATIONSHIP`(user_id) 또는 `MINIMIZE` |
| `checkout_orders` | shippingAddress(jsonb) | `KEEP`(주문 계약) · 보존기간 `REVIEW` |
| `lms_survey_responses` · `lms_attendance` | ip · ua · answers · anonymous_token · geoLocation | `MINIMIZE`(익명 설문에 ip 저장 불필요) |
| `ai_query_logs` | question · answer · contextData (user 별 원문) | 보존기간 · 마스킹 `REVIEW` |
| `store_qr_scan_events` · `foreign_visitor_partner_qr_scan_events` · `channel_heartbeats` · `neture_product_logs` | ip_hash / ua_hash / ip_address | 해시 저장=양호 · 평문(`channel_heartbeats`, `neture_product_logs`)=`MINIMIZE` |
| `cosmetics_price_logs` · `cosmetics_product_logs` · `cosmetics_contents` | user_name · author_name (문자열 스냅샷) | `RELATIONSHIP` |
| `operator_notification_settings` · `service_contact_settings` | operator_email · recipient_emails | `KEEP`(운영 설정) |
| `service_legal_profiles` | 법정 공개 정보 8 컬럼 | `KEEP_CORE` |
| `media_assets` | consented_at | `KEEP` |
| `smtp_settings` · `platform_store_payment_configs` · `cafe24_connections` · `branch_domains` · `cafe24_member_links` | 비밀값 · member_hash | `REVIEW`(암호화 일관성: cafe24 는 `_enc`, smtp/payment 는 평문 컬럼명) |

### 3-4. 교차검증 결과 (schema ↔ entity)

- baseline 에만 있고 entity 없는 테이블 65개 중 개인정보 관련: `yaksa_members` · `yaksa_member_verifications` · `yaksa_member_affiliations`(legacy) · `neture_partners` · `neture_partner_applications`(은퇴된 Partner) · `local_agent_*`(device pairing) · `handoff_tokens` · `role_migration_log`. → 물리 테이블 잔존 여부·데이터 존재는 **UNKNOWN**(§12). Legacy Partner 물리 정리는 2026-09-16 완료 기록이 있으나 baseline 파일에는 DDL 이 남아 있음(기록물이므로 정비 대상 아님).
- entity 만 있고 baseline 에 없는 16개 중 개인정보 관련: `user_activity_logs` · `linking_sessions` · `kpa_instructor_qualifications` · `role_applications` · `smtp_settings` · `cafe24_connections` · `cafe24_member_links` → incremental migration 으로 생성된 것으로 추정(정상).
- `glucose_view_customers` 는 migration 에만 등장 · entity 없음 → `REVIEW`(건강 관련 명칭, 물리 존재 UNKNOWN).
- `market_trial_participants`(packages/market-trial) — 직접 개인정보 컬럼 없음(정산·결제 상태만, user 는 관계 id).
- pharmacy-hub 전용 개인정보 테이블 없음.

## 4. 중복 저장 · Relationship 전환

### 4-1. 중복 클러스터 (9)

| 항목 | 저장 위치 수 | 위치 | 원인 |
|---|---|---|---|
| 약사 면허번호 | **4** | users.businessInfo.licenseNumber / kpa_members / kpa_pharmacist_profiles / kpa_instructor_qualifications | register 1회에 3곳 동시 INSERT(`auth-register.controller.ts:416,796,826`) |
| 사업자등록번호 | **8** | users.businessInfo / organizations / cosmetics_stores / cosmetics_store_applications / physical_stores / neture_suppliers / role_applications / kpa_pharmacy_requests | 서비스별 신청→승인 흐름이 각자 컬럼 보유 |
| 이메일 | 14 | §2 참조 | 토큰 테이블·문의·업무 이메일이 user_id 대신 값 저장 |
| 전화 | 9 | §2 참조 | 개인 전화 vs 사업장 전화 vs 담당자 전화 의미 혼재(`organizationContactSync.ts` 주석이 이미 지적) |
| 이름 | 8+ | §2 참조 | 문자열 스냅샷(신청자·검토자·작성자) |
| 약국명/주소 | 4 | kpa_members / organizations / users.businessInfo / branch_memberships | 승인 sync 가 "빈 값만 채움" 계약이라 양쪽 공존 |
| 대학/학년 | 2 | kpa_members / kpa_student_profiles | profile 분리 후 원 컬럼 미제거 |
| activity_type | 2 | kpa_members / kpa_pharmacist_profiles | 동상 |
| password | 2 | users.password / service_credentials.password_hash | Identity V2 이중 write 계약(의도됨) |
| `BusinessInfo` 타입 | **2벌** | `types/user.ts:11`(canonical=representativeName) vs `types/auth.ts:104`(canonical=ceoName, 서로 반대) | 정의 분기 |

### 4-2. Relationship 전환 후보 (11)

1. `branch_officers.name` → `user_id` 필수화
2. `instructor_profiles.organization`(문자열) → `organization_id`
3. `kpa_members.pharmacy_name/pharmacy_address` → `organizations` 참조
4. `branch_memberships.workplace_name/workplace_address` → `organization_id`(단, 약사 프로필 정본화 결정과 조율)
5. `cosmetics_stores.owner_name/contact_phone` → `users`/`organizations` 참조
6. `neture_suppliers.representative_name/manager_name` → `users` 참조 검토
7. `users.businessInfo(json)` → `organizations`(사업장) + `service profile` 로 분리
8. `forum_category_requests.requester_name/reviewer_name` → `user_id`
9. `kpa_approval_requests.requester_name/requester_email` → `user_id`
10. `cosmetics_price_logs/product_logs.user_name` → `user_id`
11. `kpa_instructor_qualifications.license_number` → `kpa_pharmacist_profiles` 참조

## 5. 표 3 — API Exposure

| API | Guard | 반환 개인정보 | 판정 |
|---|---|---|---|
| `POST /api/v1/auth/service/login` (`service-auth.routes.ts`, `register-routes.ts:122` 프로덕션 mount) | 없음 | — (토큰 발급) | **`CRITICAL` / `OVEREXPOSURE`** — §7-1 #1 |
| `GET /api/v1/kpa/members/check-license?license_number=` (`member.controller.ts:196`) | **없음** | `{available}` — 면허번호 존재 oracle | `OVEREXPOSURE` / `SECURITY_FIX`(rate-limit·인증 필요) |
| `GET /api/v1/settings/oauth*` (`settingsController.ts:200~`) | admin | OAuth `clientSecret` 을 응답에 포함 | `OVEREXPOSURE` / `SECURITY_FIX`(secret 은 masked 반환) |
| `GET /api/v1/auth/me` (`auth-account.controller.ts:29`) | requireAuth | 본인 `toPublicData()` = email · 이름류 · phone · kakao url · roles · scopes · memberships | 본인 → 적정. 단 **service 토큰으로도 통과**(§7-1 #2) |
| `POST /api/v1/auth/login` | — | 응답 JSON 에 `tokens.accessToken/refreshToken` 동봉(httpOnly 쿠키와 병행) | `REVIEW` — 서비스 프론트 5종이 이를 localStorage 저장(§8) |
| `GET /api/v1/users` · `/users/:id` · `/users/export`(CSV) (`UserManagementController`) | requireAdmin | `toPublicData()` / CSV(ID·Email·이름·Role·Status·가입·최근로그인) | admin 적정 · CSV 반출 통제 `REVIEW` |
| `GET /api/v1/admin/users` (`AdminUserController` + `sanitizeAdminUser`) | admin | password/refreshTokenFamily/reset token 제거, **lastLoginIp · loginAttempts · lockedUntil · businessInfo · provider/provider_id 유지** | admin 적정(의도 문서화됨) |
| `GET /api/v1/admin/platform-users` | requireRole(admin) | 명시 pick(id,email,name,roles,status,isActive,createdAt,lastLoginAt) | 모범 사례 |
| `GET /api/v1/kpa/members` (`member.controller.ts:360`) | `kpa:operator` | `km.license_number` · `pharmacy_address` · `u.email` · `u.name` · **`u."businessInfo"` 전체 json** | `REVIEW`(businessInfo 전체 → 필요 키만) |
| `GET /api/v1/users/me/sessions` | requireAuth | `refresh_tokens` 조회 — writer 0 → 항상 빈 배열 | dead(`DELETE_CANDIDATE`) |
| `GET /api/v1/users/me/contact` · `PATCH` | requireAuth | contactEnabled · kakao url | 적정 |
| `GET/PATCH /api/v1/users/me/profile` | requireAuth | ACCOUNT_CORE 자기 필드 | 적정 |
| Neture KYC download 3종 | `neture:admin` / `neture:operator` / linked supplier | PDF 스트림 | 적정 |
| LMS instructor public / forum | public | `sanitizeUserFields`(businessInfo·lastLoginAt 등 제거) | 적정 |
| `POST /auth/check-email` · `POST /auth/find-id` | — | 존재 여부 / 마스킹 이메일 발송 | 일반적 · rate-limit 여부 `REVIEW` |

## 6. 표 4 — External Transfer

| 채널 | 전송 개인정보 | 근거 | 판정 |
|---|---|---|---|
| 이메일 발송 (`@o4o/mail-core` → nodemailer SMTP, 설정은 `smtp_settings`/env) | 수신 이메일 · 이름 · 인증/재설정 토큰 링크 · 문의 내용(운영자 알림) · 회원 승인 안내 | `passwordResetService` · `verification.controller` · `contact-notification.helper` · `member.controller`(KPA) · `role-application.controller` · `ErrorAlertService` · `BackupService` | 필요 채널 `KEEP` · `ErrorAlertService` 본문에 개인정보 포함 여부 `REVIEW` |
| Google Cloud Storage (`@google-cloud/storage`) | KYC PDF(사업자등록증 · 통장사본 · 통신판매신고) → private bucket · 아바타/미디어 → public bucket | `supplier-onboarding.service.ts:65,151` | 적정(private) |
| AI/LLM (Gemini generativelanguage · OpenAI · Anthropic, `ai-proxy.service.ts` · `ai-tools/multimodal-chat.ts` · `work-agent-runtime.ts` · `tts-narration.service.ts`) | 사용자 자유 텍스트 질문 · 첨부 이미지/PDF base64(로그·DB 미저장 명시) · 자동화 화면 스크린샷(Computer Use) · 매장/상품 컨텍스트 | 코드 주석 및 `ai_query_logs` | 질문·답변 원문은 `ai_query_logs` 에 보존 → 보존기간 `REVIEW` · 스크린샷 내 제3자 개인정보 유출 가능성 `REVIEW`(AI-AUTOMATION 원칙 문서에 명시 필요) |
| Toss Payments (`TossPaymentProviderAdapter`) | 주문자 정보 · 결제 키 | payment adapter | 계약상 필수 `KEEP` |
| Cafe24 (`cafe24-member-auth.client.ts`) | **회원 이름/email/전화 미수집** (`mall.read_customer` 미사용, `member_hash` 만) | 파일 주석 :16 | 모범 사례 |
| SMS / 알림톡 | **구현 없음** (검색 결과 DTO 문구뿐) | — | 해당 없음 |
| Sentry · GA · Mixpanel 등 분석/에러 추적 SDK | **없음** | package.json · 소스 검색 0 | 해당 없음 |
| Kakao / Naver OAuth | 전략 등록만 · 실제 호출 0 · env 는 `.env.example` 에만(workflows 없음) | `passportDynamic.ts` | `DELETE_CANDIDATE` |

## 7. 표 5 — Authentication

| 축 | 현황 | 판정 |
|---|---|---|
| 실제 로그인 수단 | **email + password 단일** (`/auth/login` · `/auth/register` · `/auth/signup`). `service_credentials` 가 있으면 L2 우선, 없으면 `users.password` | 현행 |
| Google 로그인 | 전략만 등록(`passportDynamic.ts` Google scope profile,email → providerId, email, name, avatar). `passport.authenticate` 0 · `/api/v1/social/*` mount 0 · `SocialLoginButtons.tsx` 소비 0 | **미구현(0 %)** — Phase 1 대상 |
| Kakao / Naver 로그인 | 동일하게 dead. `AuthProvider` 타입 `'kakao'|'naver'` · `linked_accounts` · `settingsController` kakao 설정 · `.env.example` KAKAO/FACEBOOK | `DELETE_CANDIDATE`(확정 정책: Kakao 등은 로그인 수단 아님) — 의존성: `socialAuthService.getLinkedAccounts`(users.provider 단일), admin 설정 화면(kakao 항목) |
| 소셜 계정 병합 | `socialAuthService.handleSocialAuth` — `findOne({ where: [{email},{provider,provider_id}] })` **이메일 일치 시 자동 병합**, 신규는 `status ACTIVE · password '' · isEmailVerified true` · `auth-login.service.ts:388` 도 동일 auto-link | `REVIEW`(Google 단일 전환 시 병합 정책 필요 — email 소유 검증 전제) · `SECURITY_FIX`(로그에 email 출력 `socialAuthService`) |
| 토큰 | JWT access(`sub,userId,email,role,roles,memberships,accountAccess,tokenType:'user',iss,aud`) — **businessInfo · permissions · scopes 미포함** · refresh 는 `users.refreshTokenFamily` 회전 | `KEEP_CORE`. email claim 필요성 `REVIEW`(`CLAIM_ONLY` 관점에서 sub 만으로 충분 여부) |
| 토큰 종류 | `'user' | 'service' | 'guest'` — `requireAuth` 는 `isServiceToken` 검사 없이 `verifyAccessToken` → `users.findOne({id: payload.userId})` | **`CRITICAL`** §7-1 #1·#2 |
| 쿠키 | httpOnly · secure(prod) · sameSite `none`(prod, cross-subdomain) — `cookie.utils.ts:64` | 적정 · `none` 은 CSRF 방어 확인 `REVIEW` |
| 프론트 저장 | `packages/auth-client/token-storage.ts`(`o4o_accessToken`/`o4o_refreshToken` + `admin-auth-storage` 에 user 객체) · `auth-context/AuthProvider.tsx:225-245`(localStorage 전략=토큰+user, cookie 전략=user 만) · admin `authStore.ts`(authToken/accessToken localStorage + cross-domain cookie 이중) | strategy `'localStorage'`: web-k-cosmetics · web-kpa-branch · web-kpa-society · web-neture · web-pharmacy-hub (5종) / `'cookie'`: admin-dashboard → `SECURITY_FIX` 후보(XSS 시 토큰 탈취) · 통일 `REVIEW` |
| 계정 잠금 | `users.loginAttempts/lockedUntil` 컬럼 有, `LoginSecurityService` stub | 실사용 여부 `REVIEW` |
| 면허 검증 | `kpa_pharmacist_profiles.license_verified` — true 로 쓰는 코드 0 · 외부 검증 API 0 | 검증 절차 미구현 `REVIEW` |

### 7-1. 중요 발견 (SECURITY_FIX 후보 9)

| # | 등급 | 발견 | 위치 | 영향 |
|---|---|---|---|---|
| 1 | **CRITICAL** | `POST /api/v1/auth/service/login` — `validateServiceOAuthToken` 이 `JSON.parse(oauthToken)` 에 `{id,email}` 만 있으면 provider 검증 없이 통과("Phase 1 for testing"), `generateServiceAccessToken` 이 `sub/userId = providerUserId, tokenType:'service'` 를 **동일 jwtSecret** 으로 발급 | `auth-service-user.service.ts:103-125` · `service-auth.routes.ts` · `register-routes.ts:122`(프로덕션 mount) | 임의 `users.id`(UUID) 를 알면 인증 토큰 발급 가능 |
| 2 | **CRITICAL**(#1 과 결합) | `requireAuth` 가 service 토큰을 거부하지 않음 — `verifyAccessToken` 후 `users.findOne({id})` 존재하면 통과(roles/memberships 는 payload 기준 빈 배열). `requirePlatformUser`(service 거부)는 라우트 소비 0 · `requireAuth` 소비 966곳 | `authentication.middleware.ts:93-165` · `~266` | #1 토큰으로 `/auth/me` 등 requireAuth 단독 라우트 접근. role guard 라우트는 roles 빈 배열로 차단됨(완화) |
| 3 | SECURITY_FIX | `GET /kpa/members/check-license` 무인증 · rate-limit 없음 | `member.controller.ts:196` | 면허번호 존재 여부 열거 |
| 4 | SECURITY_FIX | OAuth 설정 API 가 `clientSecret` 을 응답 | `settingsController.ts:200~` | admin 세션 탈취 시 secret 유출 |
| 5 | SECURITY_FIX | 서비스 프론트 5종 JWT + user 객체 localStorage 저장(admin 은 cookie+localStorage 이중) | §7 프론트 저장 | XSS → 토큰 탈취 |
| 6 | SECURITY_FIX | 로그에 email 원문 출력 — `socialAuthService`(logger.info) · `service-auth.routes.ts`(2) · `authorization.middleware.ts`(2) · `auth-register.controller.ts`(1) · `cms-content-slot.handler.ts`(1) · scripts 3 · migrations 다수(console.log) | H축 | Cloud Logging 에 개인정보 축적 |
| 7 | SECURITY_FIX | migration `1737100000000-UpdateGlucoseViewTestAccountPasswords.ts:14` 평문 `TEST_PASSWORD` 리터럴 + `*@test.test` 계정 2건(`RemoveNonAdminTestAccounts` 삭제 목록에 **미포함**) · `scripts/diagnose-admin-login.ts:158` 리터럴 | O축 | CLAUDE.md §15 위반(이력 migration 이라 수정은 별도 판단) · 운영 잔존 여부 UNKNOWN |
| 8 | SECURITY_FIX | `.env.example:44 TOSS_SECRET_KEY=test_sk_…` 실 형식 테스트 키 리터럴 | O축 | placeholder 로 교체 권고 |
| 9 | SECURITY_FIX | `neture_suppliers.settlement_account_number` · `smtp_settings.password/apiSecret` 등 평문 컬럼(cafe24 만 `_enc`) | §3-3 | 암호화 일관성 |

모두 **수정하지 않았다**(WO 제약). #1·#2 는 별도 WO 즉시 권고.

## 8. 프론트 · 화면 노출 (F축)

- admin-dashboard `pages/users/*`(ActiveUsers · UserDetail · UserForm · UsersListClean): lastLoginAt · loginAttempts 표시, businessInfo 섹션. super_admin 전용 라우트.
- KPA operator `MemberManagementPage.tsx` · admin `AdminMemberManagementPage.tsx` · `MemberDeleteRiskModal.tsx` · 분회 `MembersConsolePage.tsx`: license_number 표시. 본인 `MyProfilePage.tsx` 도 표시.
- 서비스 프론트 localStorage 키: `o4o_accessToken` · `o4o_refreshToken` · `admin-auth-storage`(user 객체) · legacy `user` · `token` · `refreshToken` · `ai_api_keys` · `ai_default_model_gemini`.
- 역할별 과다 노출 특이점: KPA operator 목록 API 가 businessInfo 전체 json 을 내려 화면이 쓰지 않는 키(세금계산서 이메일 등)까지 클라이언트에 도달(§5).

## 9. 삭제 후보 (DELETE_CANDIDATE 9) · 의존성

| # | 대상 | 의존성 | 비고 |
|---|---|---|---|
| 1 | `refresh_tokens` 테이블·entity | `GET /users/me/sessions` 읽기 1곳 | writer 0 |
| 2 | `login_attempts` 테이블·entity | `LoginSecurityService` stub | writer 0 |
| 3 | `user_activity_logs` entity(baseline 없음) | 0 | writer 0 |
| 4 | passport Kakao/Naver 전략 + `KAKAO_*`/`NAVER_*` env + `settingsController` kakao/naver 항목 | `passportDynamic.ts` · `.env.example` · admin 설정 화면 | 확정 정책 근거 |
| 5 | `AuthProvider` 타입의 `'kakao'|'naver'` · `linked_accounts`/`linking_sessions`/`account_activities`(소셜 링크 전용 dead 경로) | `account-linking.service.ts`(caller 1) · `auth-login.service.ts:388` | Google 재설계 시 linked_accounts 는 `REVIEW` 로 격상 가능 |
| 6 | `socialAuthService.ts` Kakao 분기 · `getLinkedAccounts` | 0 라우트 | |
| 7 | `packages/ui/src/components/SocialLoginButtons.tsx` | 소비 0 | |
| 8 | `kyc_documents.documentType` 의 `id_card` · `tax_certificate` 타입 정의 | writer 0 | 신분증 수집 안 함을 명문화 |
| 9 | `users.lastLoginIp` 컬럼(writer 0) · `kpa_members` 의 중복 컬럼(license_number · university_name · student_year · activity_type) — profile 분리 완료 후 | KPA member API 다수 | auth-core FROZEN → 명시 WO 필요 |

Kakao 관련 `users.kakao_open_chat_url` · `kakao_channel_url` 은 **삭제 후보 아님** — Connected Channel 정책과 부합(`REVIEW`: 저장 위치만).

## 10. A~O 15개 축 완료 체크리스트

| 축 | 내용 | 상태 |
|---|---|---|
| A | entity/schema 전수 스캔 · Inventory | ✅ (237 entity · 3,216 컬럼 · baseline 284 테이블 교차) |
| B | users 8 구분 혼재 분석 | ✅ §3-1 |
| C | 인증 계층 테이블 census | ✅ §3-1 |
| D | 중복 저장 집계 | ✅ §4-1 |
| E | API Exposure census | ✅ §5 |
| F | admin/operator 화면 노출 | ✅ §8 (역할별 화면 전수는 아님 — 대표 화면 기준) |
| G | KPA/서비스 entity 컬럼 | ✅ §3-2 |
| H | 로그 개인정보 | ✅ §7-1 #6 (req.body/Authorization 로그 출력 0건 확인) |
| I | 업로드 경로 (avatar · KYC · supporting_documents · id_card) | ✅ §2 · §6 |
| J | 약사 자격 검증 주체/방식 | ✅ 미구현 확인 §7 |
| K | 분회 문자열 vs organization relationship | ✅ §4-2 |
| L | Relationship 전환 후보 | ✅ §4-2 |
| M | 외부 전송 | ✅ §6 |
| N | AI prompt 입력 | ✅ §6 (다른 세션 dirty 파일 없음 — 작업트리 clean) |
| O | seed/test/env | ✅ §7-1 #7·#8 (`docs/local/TEST-ACCOUNTS.local.md` 미열람 유지) |

## 11. 정책 추가결정 필요 (REVIEW 10)

1. 보존기간 — 문의 5테이블 · `audit_logs` · `ai_query_logs`(질문/답변 원문) · `lms_survey_responses` ip/ua · `checkout_orders.shippingAddress`
2. 약사 면허 검증 주체·방식 (`license_verified` 항상 false, `verified_by` writer 0)
3. 사업장 정보 정본 위치 — `users.businessInfo(json)` vs `organizations` (현재 승인 시 "빈 값만 채움" sync 로 양립)
4. 문의 테이블 4종(+KPA 1) 통합 여부
5. 신분증(`id_card`) 수집 안 함 명문화 여부
6. 서비스 프론트 토큰 저장 전략 cookie 통일 여부 (5종 localStorage)
7. Google 단일 로그인 전환 시 기존 password 계정 이관·병합 정책 (이메일 일치 자동 병합 허용 여부)
8. `tokenType:'service'` 축 유지 여부 (현재 CRITICAL 결함 + UI 소비 0)
9. Connected Channel(Kakao 채널/오픈채팅 · 향후 LINE/WhatsApp) 저장 위치 — `users` 컬럼 vs 별도 `connected_channels`
10. JWT `email` claim 유지 여부 (CLAIM_ONLY 원칙상 `sub` 만으로 충분한지) · `firstName/lastName` 유지 여부

## 12. UNKNOWN (프로덕션 확인 필요 시 별도 승인)

- `*@test.test` 계정 · `glucose_view_customers` · `yaksa_*` · `neture_partner*` 물리 테이블 잔존 및 행 수
- `refresh_tokens` · `login_attempts` · `linked_accounts` 실제 행 수(0 예상)
- `kyc_documents` 에 `id_card` 행 존재 여부(0 예상)
- GCS public bucket 에 아바타 외 개인정보 파일 존재 여부

## 13. 후속 제안 (본 WO 범위 밖 · 별도 WO)

1. **즉시**: `WO-O4O-SERVICE-TOKEN-AUTH-HARDENING`(§7-1 #1·#2 — service login 비활성화 또는 provider 검증 + requireAuth 의 service 토큰 거부)
2. `WO-O4O-PRIVACY-PHASE1-TARGET-MODEL`(Google Identity → User → Credential/Relationship → Claim/Role 설계, 본 IR §0 표 입력)
3. Kakao/Naver dead 소셜 로그인 구성 제거 + 로그 email 마스킹 + `.env.example` 정리 (`SECURITY_FIX` 묶음)
4. 면허번호·사업자번호 정본 단일화(`MOVE_CORE`) — auth-core FROZEN 이므로 명시 WO

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건*
