# IR-O4O-INTEGRATED-TERMS-RUNTIME-CONTRACT-CENSUS-V1

> **상태**: COMPLETE · **조사일**: 2026-09-17 · **성격**: 조사 전용 (코드 0 · DB write 0 · 정책 결정 0 · 배포 0)
> **Git 기준선**: HEAD `3c950a0b8` == `origin/main` (처리방침 게시 WO `699e54ec2` 포함)
> **목적**: 「O4O 통합 서비스 이용약관 v1.0」 초안 작성에 앞서, 약관이 규율해야 할 **실제 계약 구조·기능·동의 흐름을 코드·운영 DB(read-only)로 확정**한다. 약관 본문은 작성하지 않는다.
> **자료 규칙**: 운영 DB 는 건수·상태·컬럼 존재 여부만 기록. 개인정보·row 본문·credential 0. 기존 terms row 본문 복제 0.

---

## 0. 법적 기준 우선순위 (사용자 확정, IR 판단 기준)

1. **약관의 규제에 관한 법률** — 전 서비스 공통 최상위 기준(불공정 조항 무효, 명시·설명 의무).
2. **O4O 의 실제 계약 구조** — 본 IR 이 확정하는 사실(회원 · 커뮤니티 · 콘텐츠 · AI · 매장 업무공간).
3. 기능이 **실재하는 경우에만**: 전자상거래법 · 공정위 전자상거래(사이버몰) 표준약관(제10023호) · 콘텐츠산업진흥법 · 콘텐츠이용자보호지침.
4. **현재 없는 거래**(소비자 주문·결제·통신판매·유료콘텐츠·자동결제·구독·환불·청약철회)는 현재 기능처럼 쓰지 않는다 → §9 · §22 의 `FUTURE_TRIGGER`.

---

## 1. Git 기준선 · 작업트리

| 항목 | 값 |
|---|---|
| HEAD | `3c950a0b8` |
| origin/main | `3c950a0b8` (동일) |
| 선행 트랙 | 처리방침 v1.0 원문 `c2f9ddc1a` · 4 서비스 /privacy 게시 `699e54ec2` (ancestor 확인) |
| 작업트리 | 타 세션 dirty 1건(`docs/work-orders/WO-O4O-HOSPITAL-DRUG-BROWSER-ONLY-LOCAL-DATA-AND-DESKTOP-ENTRY-V1.md`) — 불가침 · 본 IR 무관 |

## 2. 계약 당사자 (§5)

`service_legal_profiles` read-only 4/4 (neture · kpa-society · k-cosmetics · pharmacy-hub):

| 항목 | 값 | 판정 |
|---|---|---|
| company_name | `(주)쓰리라이프존` 4/4 동일 | CONFIRMED — 약관 당사자 = **주식회사 쓰리라이프존** 단일 |
| representative_name | `서철환` 4/4 | CONFIRMED |
| business_registration_number | 4/4 존재 (값 미기재) | CONFIRMED |
| ecommerce_registration_number | 4/4 존재 (`제 2014-서울구로-1253호`) | CONFIRMED — 통신판매업 **신고는 존재**하나 현재 소비자 거래 기능 없음(§9). 약관에 "통신판매" 거래 조항을 넣는 근거가 되지 않음 |
| mail_order_broker_notice | null 4/4 | 통신판매중개 고지 없음 → 중개자 조항 NOT_APPLICABLE_CURRENTLY |
| privacy_officer_name | 서철환 4/4 (처리방침 트랙에서 확정) | CONFIRMED |
| is_active | true 4/4 | — |

- 서비스별 법인 차이 **없음** → 통합약관 1본 + 서비스별 "적용 서비스" 표시만으로 충분. 서비스별 별도 당사자 조항 불필요.
- 프로필 SSOT 원칙(Footer=`service_legal_profiles`, 본문=`service_policy_documents`)은 처리방침과 동일하게 적용 가능.

## 3. 역할별 계약 구조 (§4)

역할 키 출처: guard 코드(`require{Service}Scope`) + `role_assignments.role`(is_active) 실측 + `service_memberships.role`.

| 역할 | 활성 서비스 | 이용자 계약 상대방 | 통합약관 적용 | 별도 계약 필요 |
|---|---|---|---|---|
| 일반 회원 (`*:member` · `*:user` · `customer` · `neture:member`) | 4 서비스 전부 (role_assignments active: customer 7 · neture:member 4 · pharmacy-hub:member 2 · kpa:member 1 · kpa-branch:member 2 · cosmetics:member 1 · user 2) | 회사 ↔ 개인 | **적용(기본 대상)** | 없음 |
| 약사 회원 (KPA `pharmacist_member` · `kpa_pharmacist_profiles` 7건) | kpa-society (+ kpa-branch) | 회사 ↔ 개인(자격 검증 부가) | 적용 + **자격 진실성 조항** 필요 | 없음 (자격 검증은 약관 내 조항) |
| 약대생 회원 (KPA `pharmacy_student_member`) | kpa-society | 회사 ↔ 개인 | 적용 | 없음 |
| 매장 경영자 (`kpa:store_owner` 5 · `pharmacy-hub:store_owner` 6 · `cosmetics:store_owner` 4 · `pharmacy` 2) | kpa-society · pharmacy-hub · k-cosmetics | 회사 ↔ 개인/사업자 | 적용(계정·커뮤니티·콘텐츠·AI 공통부) | **매장 경영자 계약** (Store Workspace · 자료함 사본 · QR · 태블릿 · 유료 이용권 개시 시) |
| 공급자 (`supplier` 6 · Neture 가입 role supplier 고정) | neture (Supplier→Store Hub 경로로 3 서비스에 콘텐츠 공급) | 회사 ↔ 사업자 | 적용(공통부) | **공급자 계약** (제품·설명서·콘텐츠 제공, B2B 주문 개시 시) |
| 서비스 운영자 (`*:operator` — kpa 2 · pharmacy-hub 2 · neture 1 · cosmetics 1 · kpa-branch 1) | 4 서비스 | 회사 ↔ 위탁/내부 운영자 | 적용(계정 공통부) | **서비스 운영자 계약**(운영 권한·감사·개인정보 취급) |
| 서비스 관리자 (`*:admin` — kpa 1 · neture 1 · cosmetics 1 · pharmacy-hub 2) | 4 서비스 | 회사 내부 | 적용(계정 공통부) | 내부 규정(약관 대상 아님) |
| 플랫폼 관리자 (`platform:super_admin` 3) | platform | 회사 내부 | 적용(계정 공통부) | 내부 규정 |
| 강사 (`lms:instructor` 1 · `/lms/instructor/apply` 승인제) | LMS 가 있는 서비스(kpa-society · pharmacy-hub · k-cosmetics) | 회사 ↔ 개인 | 적용 + 강의 콘텐츠 라이선스 조항 | 유료 강의 개시 시 별도 (현재 CODE_ONLY) |
| ~~Legacy Partner~~ | 은퇴(2026-09-15) | — | 대상 아님 | — |

- **가입 시 선택 가능한 역할**: Neture=supplier 고정, KPA=pharmacist_member/pharmacy_student_member, KCos=consumer/seller, PH=member/store_owner(`pharmacy-hub-signup-roles.ts`). 그 외 역할은 관리자/운영자 부여.
- 통합약관 = **계정 · 서비스 이용 · 커뮤니티 · 콘텐츠 · AI · 이용제한**의 공통 기반. B2B 권리의무는 별도 계약으로 분리(§18).

## 4. 가입 · 동의 구조 · 버전 추적 (§6)

### 4-1. 서버

- `POST /api/v1/auth/register` · `POST /api/v1/pharmacy-hub/join` → `AuthRegisterController.register`.
- 입력 정규화: `tos||agreeTerms` · `privacyAccepted||agreePrivacy` · `marketingAccepted||agreeMarketing`. `tosAccepted` 아니면 400.
- 저장: `users.tos_accepted_at` · `privacy_accepted_at` (timestamp nullable) · `marketing_accepted` boolean (`auth-register.controller.ts:406-408`).
- **약관 버전·문서 id·해시 컬럼 없음.** 동의 이력 테이블 없음. 재동의 흐름 없음.

### 4-2. 서비스별 가입 UI

| 서비스 | 파일 | 약관 체크 | 약관 링크 | 개인정보 체크 | 마케팅 | 비고 |
|---|---|---|---|---|---|---|
| neture | `services/web-neture/src/components/RegisterModal.tsx` | 필수 | `/terms` (L797) | 필수 `/privacy` (L818) | 선택 | 사업자 정보 입력 |
| kpa-society | `services/web-kpa-society/src/components/RegisterModal.tsx` | 필수 | `/policy` (L767) | 필수 `/privacy` (L778) | **없음** | 면허번호 + check-license |
| k-cosmetics | `services/web-k-cosmetics/src/pages/auth/RegisterPage.tsx` | 필수 | **링크 없음** | 필수, 링크 없음 | 선택 | — |
| pharmacy-hub | `services/web-pharmacy-hub/src/pages/JoinPage.tsx` | **체크박스 없음** — payload `tos: true, privacyAccepted: true` 하드코딩 (L75-76) | 없음 | 없음 | 없음 | 약관 명시·설명 절차 부재 |

### 4-3. 운영 DB (read-only)

- users 58 · tos_accepted_at 38 · privacy_accepted_at 36 · marketing_accepted true 1 · tos 범위 2026-05-15 ~ 2026-09-10.
- **판정: `TIMESTAMP_ONLY`** — 동의 시각만 있고 어느 약관 버전에 동의했는지 추적 불가. 현재 published `terms` 문서가 0건이므로 기존 동의는 "약관 본문 없는 동의" 상태.

## 5. 기존 terms 문서 census (§7)

`service_policy_documents` (read-only):

| service_key | type | version | status | title 성격 | len · sha256[0:16] | 판정 |
|---|---|---|---|---|---|---|
| pharmacy-hub | terms | 1 | archived | E2E 테스트용 임시 문서 | 64 · `4da4977eab50c630` | **ARCHIVE_ONLY** (본문 무의미 · 참고 0) |
| 4 서비스 | privacy | 1 | published | 개인정보 처리방침 v1.0 | 8803 · `bec62205fc50eec7` | KEEP_REFERENCE (약관의 "개인정보 보호" 조는 이 문서를 지시) |

- 코드베이스에 약관 초안·하드코딩 약관 문구 0 (grep: 라이선스·면책 문구는 서비스 UI 에 없음 · KCos StoreRevenueSummaryPage 의 "참고용 매출 요약" 배너 1건뿐).
- 공개 표시 경로(전부 `GET /public/services/{key}/policies/{type}` · published 최신 1건만): Neture `/terms` · KPA `/policy` · KCos `terms` · PH `/terms`. 게시 시 처리방침과 동일한 plain 변환(`scripts/legal/render-policy-plain.mjs`) 필요.
- **이전 버전 공개 열람 API 없음** (publish 시 이전 published → draft 강등, archived 목록 public 노출 없음).

## 6. 서비스 기능 표 (§8)

판정: `ACTIVE`(코드+운영 데이터 존재·사용자 노출) · `PARTIAL` · `CODE_ONLY` · `NOT_ACTIVE`.

| 축 | neture | kpa-society | k-cosmetics | pharmacy-hub | 근거 |
|---|---|---|---|---|---|
| 계정·로그인·서비스 가입(membership) | ACTIVE | ACTIVE | ACTIVE | ACTIVE | service_memberships active: neture 7 · kpa-society 6 · kcos 5 · PH 10 |
| 커뮤니티(forum) | PARTIAL(코드) | ACTIVE | PARTIAL | ACTIVE(capability 채택) | forum_post 8(publish 3 · archived 5) · forum_comment 6 |
| 매장 업무공간(Store Workspace · 자료함 · QR · 태블릿) | — | ACTIVE | ACTIVE | ACTIVE | kpa_store_contents 15 · o4o_asset_snapshots 19 · store_qr_codes 97(active 53) |
| 공급자 업무공간(제품·설명서·Hub 공급) | ACTIVE | (열람) | (열람) | (열람) | supplier_product_offers 존재 · Supplier→Store Hub 경로 공식 |
| LMS(무료 강의·수료) | NOT_ACTIVE(프론트 없음) | ACTIVE | CODE_ONLY(라우트만) | PARTIAL(course archived 3) | lms_courses kpa 8(published 5) · PH 3 archived · enrollments 11 · lms_certificates 테이블 존재 |
| 포인트/크레딧 | CODE_ONLY | ACTIVE | CODE_ONLY | CODE_ONLY | credit_balances 3 · service_point_budgets kpa-society 1 · appreciation_sends 1 |
| 설문 | — | ACTIVE | — | — | credit `survey_complete` 2 |
| AI 보조(생성·분석·Q&A) | ACTIVE | ACTIVE | ACTIVE | ACTIVE | ai_usage_logs 25(2026-05-20 ~ 06-29) · ai-proxy/ai-query 라우트 |
| 문의(contact) | ACTIVE | ACTIVE | ACTIVE | ACTIVE | contact_inquiries 3(service_usage) · platform_inquiries 3 |
| 공지 | — | ACTIVE(`/notices`) | — | — | 약관 변경 통지 수단 후보(§15) |
| 소비자 상품 판매·장바구니 | NOT_ACTIVE | NOT_ACTIVE(네이버·쿠팡 외부) | NOT_ACTIVE | NOT_ACTIVE | store_cart_items 0 · COMMERCE-BOUNDARY: 플랫폼 직접 판매 NONE |

## 7. 주문 · 결제 · 구독 (§9)

| 항목 | 판정 | 근거 |
|---|---|---|
| 소비자 주문·결제 | **NOT_ACTIVE** | 소비자 checkout UI 없음 · 통신판매 신고번호는 존재하나 거래 기능 0 |
| 공급자→매장 B2B 주문 | **TEST_ONLY** | checkout_orders 23 (created 3 · cancelled 20 · paid 0 · paymentStatus 전부 pending) |
| PG 결제 | **TEST_ONLY** | checkout_payments 1 (toss · pending · 승인 0) · `TOSS_PAYMENTS_SECRET_KEY` 는 sandbox(`test_ck_…`) |
| 매장 유료 이용권(구독 1회결제 30일) | **CODE_ONLY** | `store-entitlement.routes.ts` prepare/confirm 존재 · store_paid_feature_entitlements 0 · billing key 없음 |
| 자동결제·정기결제 | **NOT_ACTIVE** | 코드 없음 |
| 유료 LMS | **CODE_ONLY** | `course.isPaid` 컬럼 존재 · `EnrollmentService` L152 `__fromPayment` 게이트가 어디서도 set 되지 않음 · isPaid=true 강의 0 |
| 환불·청약철회 | **NOT_ACTIVE** | refund 컬럼(refundedAt 등)만 존재 · 실행 0 |
| Market Trial 참여 결제 | NOT_ACTIVE | market_trials 1(closed) · 결제 컬럼 없음 |

→ 약관 v1.0 에는 "유료 서비스는 별도 약관·고지 후 개시" **트리거 조항 1개**만 두고 주문·결제·환불·청약철회 조항은 넣지 않는다. 실개시 시 전자상거래법·표준약관·콘텐츠이용자보호지침 조항을 **별도 개정**으로 추가(§22).

## 8. 포인트 기술 사실 (§10)

| 사실 | 값 |
|---|---|
| 저장 | `credit_balances`(사용자당 1) · `credit_transactions`(sourceType · transactionType earn/spend) |
| 획득 경로(코드) | lesson_complete · quiz_pass · course_complete · survey_complete · admin_grant · appreciation_receive |
| 차감 경로(코드) | appreciation_send(감사 포인트 전송 · 원자적) · admin_spend/admin_adjust · reward_payout(offline/voucher/survey/course/other = 운영자 보상 정산 차감) |
| 운영자 예산 | `service_point_budgets`(kpa-society 1) + `_transactions` |
| 운영 실측 | 잔액 보유 3명 · 합계 830 · 거래 13건(admin_grant 2 · course/lesson/quiz 7 · survey 2 · appreciation 1쌍) |
| 현금 구매 · 환전 · 양도 · 유효기간 | **코드 0** (구매 API 없음 · 현금 환급 없음 · 사용자 간 이전은 appreciation 뿐 · 만료 로직 없음) |
| 외부 보상(reward_payout) | 운영자 정책 재량 · 코드상 상품/바우처 지급 사실만 기록 |

→ 약관 판정: 포인트 = **서비스 내 혜택(금전적 가치 없음 · 환전 불가)** 으로 규정 가능. 소멸·양도 금지·부정 획득 회수 조항은 POLICY_DECISION_REQUIRED(만료 기간 정책 없음).

## 9. 탈퇴 (§11)

| 사실 | 값 |
|---|---|
| 자체 탈퇴 route | **없음** (`auth.routes.ts` 경로 목록에 withdraw/delete-me 부재) |
| 관리자 삭제 | `DELETE /admin/users/:id` — hard `remove()` 우선, FK 위반 시 `isActive=false` + role_assignments 제거 (`AdminUserController.deleteUser` L723-780) · super_admin 보호 |
| 서비스 탈퇴 | `ServiceMembershipStatus.withdrawn` — 운영자 콘솔 경유만 |
| users.status 실측 | active 15 · approved 2 · **deleted 32(isActive false)** · pending 1 · suspended 8. `deleted` 는 enum(`UserStatus`) 에 없는 varchar 값 · `deleted_at` 컬럼 없음 |
| 콘텐츠 처리 | 탈퇴↔GCS·UGC 연결 없음(처리방침 집행 IR G 항목과 동일) |

→ 약관: "회원은 고객센터(문의)로 탈퇴 요청, 회사는 처리방침 보유기간에 따라 처리"로만 규정 가능. **즉시 자동삭제 표현 금지**(처리방침 트랙과 동일). 자체 탈퇴 기능 = FUTURE_TRIGGER.

## 10. 이용제한 (§12)

| 사실 | 값 |
|---|---|
| 계정 상태 | `UserStatus` active·approved(정상) · pending(restricted) · inactive·suspended·rejected(**login+refresh 차단**, `account-access.policy.ts`) |
| 잠금 | 로그인 5회 실패 → `lockedUntil` +30분 (`auth-login.service.ts:529`) |
| 서비스 membership | pending·active·suspended·rejected·withdrawn — 서비스 단위 제한 가능 |
| 사전 통지·이의제기 | 코드 없음. 상태 변경 이메일은 **KPA `member.controller.ts` L1026-1047 만**(승인·반려·정지·복구). Operator/PH/KCos 콘솔 이메일 0 |
| 제재 사유 코드 | 없음(운영자 자유 텍스트 reason 만) |
| 실측 | users suspended 8 · membership rejected 1 |

→ 약관: 제한 사유 열거 + "통지는 이메일 또는 서비스 내 표시" 로 두되, **이의제기 창구 = 문의 기능**으로 명시 가능. 사전 통지 의무 수준·긴급 제한 기준 = POLICY_DECISION_REQUIRED.

## 11. UGC · 저작권 (§13)

| 사실 | 값 |
|---|---|
| 게시물 상태 | `PostStatus` draft·publish·pending·rejected·archived. 사용자 삭제 = **ARCHIVED(soft)** · 운영자 delete-request 승인 · admin `/forums/:id/hard` |
| 신고 기능 | **없음**(entity·route 0 · `신고` 는 문의 유형 '오류 신고' 뿐) |
| 라이선스 문구 | 서비스 UI · 코드 **0** |
| 복사 기능 필요 범위 | 커뮤니티 게시물은 서비스 내 표시·보관만. **공급자/운영자 콘텐츠의 매장 사본**(o4o_asset_snapshots · QR)은 §12·§13 의 별도 축 |
| 실측 | forum_post 8 · comment 6 · 시드/테스트 성격 다수 |

→ 약관: UGC 는 **표시·저장·백업·서비스 운영 목적의 비독점 이용허락**만 필요(포괄 양도·2차 저작·상업 이용 문구 근거 없음). 삭제 후 archived 보존 사실 고지 필요. 신고 처리 조항은 FUTURE_TRIGGER(기능 없음).

## 12. 공급자 콘텐츠 · 매장 사본 (§14)

| 사실 | 값 |
|---|---|
| 흐름 | 공급자 제품·설명서(SPD) → Supplier→Store Hub → 매장 **가져오기 = 전체 사본**(o4o_asset_snapshots · organization_id 매장 소유) · 원본 직접 참조 0 (memory `ir-copy-on-import-invariant-audit`) |
| 매장 편집 | 사본 편집 가능 · 원본 불변 |
| 노출 | QR 공개(`/qr/{slug}`) · 태블릿 · POP PDF · 자료함 |
| 실측 | o4o_asset_snapshots 19 · store_qr_codes active 53 |

→ 통합약관에는 "공급자·운영자가 제공한 콘텐츠를 매장이 서비스 기능 범위에서 복제·편집·표시할 수 있다"는 **원칙 1개 조**만. 세부(범위·기간·표시 의무·철회)는 **공급자 계약 / 매장 경영자 계약**으로 분리.

## 13. 복사 정책 (§15)

- 불변식: 자료함·활성 QR 전부 매장 사본 · 원본 참조 0 · 공급자 원본 수정은 사본에 자동 전파 안 됨(사용자 재가져오기).
- 약관 반영 최소치: ① 사본은 매장 계정 소유 · ② 공급자 콘텐츠의 정확성 책임은 공급자 · ③ 회사는 전달 매체(면책은 고의·중과실 제외).

## 14. AI (§16)

| 사실 | 값 |
|---|---|
| 기능 | `ai-proxy.routes.ts`(generate · vision/analyze · work-agent/run · content · qr-description · url-to-blocks · content-to-store-use · course-structure · lesson-body · home-chat) · `ai-query.routes.ts`(query·usage·history·policy·models) · admin |
| 외부 제공자 | **Gemini + OpenAI** (deploy-api.yml 에 두 키 · 코드 참조 29/9). 처리방침 §7 은 Gemini 만 명시 → **처리방침 정합 확인 필요**(OpenAI 실사용 여부) |
| 이미지·영상 생성 | route 없음 |
| 자동생성 표시 | `ai_generated` 류 컬럼 **없음** · AI 결과는 사용자가 편집 후 저장(초안 성격) |
| 로그 | ai_usage_logs 25 (토큰·모델 메타만 · 본문 없음, 처리방침 보유 1년) |
| 이용 정책 | `ai-query` policy endpoint 존재(사용량 제한) |

→ 약관: AI 결과 = **참고용 초안 · 사용자 검토 책임 · 정확성 무보증(고의·중과실 제외) · 외부 제공자 전송 고지(처리방침 지시)**. 의료·약사 판단 대체 금지 문구는 POLICY_DECISION_REQUIRED(약사 서비스 특성).

## 15. 서비스 중단 · 변경 · 통지 (§17 · §19)

| 사실 | 값 |
|---|---|
| 점검·중단 공지 코드 | 없음(유지보수 모드 없음) |
| 약관 변경 통지 시스템 | **없음** — 게시(published 전환)만 가능 · 이전 버전 열람 API 없음 · 재동의 흐름 없음 |
| 통지 수단(실재) | 이메일(SMTP Gmail · `email.service.ts` 템플릿 · 실제 발송은 KPA 상태변경·비밀번호 재설정·소셜 가입 환영뿐) · KPA `/notices` · 각 서비스 `/terms` `/privacy` 페이지 |
| 서비스 종료 사례 | GlycoPharm 은퇴(2026-09) — 사용자 통지 절차 기록 없음 |

→ 약관: "변경 약관은 시행 7일 전(불리한 변경 30일 전) 서비스 내 게시, 필요 시 이메일" 로 **게시 중심** 규정 가능(현재 수단과 정합). 이전 버전 열람·재동의 = FUTURE_TRIGGER(기능 부재를 약관이 약속하지 않도록).

## 16. 면책 · 관할 · 운영정책 관계 (§18 · §20 · §21)

- 면책: 코드·UI 에 면책 문구 0. 약관에 넣을 때 **고의·중과실 면책 금지**(약관규제법 §7). "참고용" 성격 고지는 KCos 매출 요약·AI 결과·공급자 콘텐츠 3곳에 사실 근거 있음.
- 관할: 전속관할 강제 제안 금지 → 민사소송법 관할 + 소비자 주소지 배려 문구(약관규제법 §14 배제 회피).
- 운영정책: 현재 별도 운영정책 문서 0. 서비스별 정책은 `service_policy_documents` type `community · marketing · custom` 으로 게시 가능(코드 지원) → 약관에 "운영정책은 약관의 일부이며 서비스 정책 페이지에 게시"로 위임 구조 가능.

## 17. 통지 수단 요약

| 수단 | 실재 | 약관에서 사용 가능 |
|---|---|---|
| 서비스 내 게시(`/terms` 등) | O 4/4 | 기본 |
| 이메일 | O(SMTP) — 단, 약관 변경 발송 코드 없음 | "필요 시" 로만 |
| 공지 페이지 | KPA 만 | 서비스별 |
| 재동의 팝업 | X | 사용 불가 |

## 18. 별도 계약 · 정책 분리안

| 문서 | 대상 | 통합약관에서의 처리 |
|---|---|---|
| O4O 통합 서비스 이용약관 v1.0 | 전 회원 | 본체 |
| 개인정보 처리방침 v1.0 | 전 회원 | 지시(published) |
| 공급자 계약 | supplier | 트리거 조 1개(제품·콘텐츠 제공·B2B 주문) |
| 매장 경영자 계약 | store_owner | 트리거 조 1개(Store Workspace·유료 이용권·QR/태블릿 공개 책임) |
| 서비스 운영자 계약 | operator | 트리거 조 1개 |
| 커뮤니티 운영정책 / 서비스별 정책 | 해당 서비스 | 위임 조 1개(`community`·`custom` 타입 게시) |
| 유료 서비스 약관(전자상거래·콘텐츠) | 개시 시 | FUTURE_TRIGGER 조 1개 |

## 19. 표준약관 · 법령 적용 판정표 (§22)

| 공식 기준 | O4O 적용 판정 | 사용방법 |
|---|---|---|
| 약관규제법 §3(명시·설명) · §6~§14(불공정 무효) | DIRECT | 약관 전 조문의 상위 기준 · 가입 UI 명시 결함(PH·KCos) 보완 근거 |
| 전자상거래법 제10조(사업자 신원표시) | DIRECT | Footer 법정정보(이미 게시) · 약관 제2조 당사자 표기 |
| 전자상거래법 제13조(계약 전 정보) · 제17조(청약철회) · 제18조(환급) | FUTURE_TRIGGER | 유료 서비스 개시 시 개정 |
| 공정위 전자상거래 표준약관(제10023호) — 총칙·회원가입·탈퇴·이용제한·게시물·면책·관할 조문 | PARTIAL | 구조·용어만 차용(가입 승낙·제한 사유·통지·게시물 권리·면책·재판관할) · 구매·결제·배송·환불 조는 미채택 |
| 공정위 표준약관 — 구매신청·결제·배송·취소·환불 조 | NOT_APPLICABLE_CURRENTLY | 인용 금지(§0-4) |
| 콘텐츠산업진흥법 §28 · 콘텐츠이용자보호지침 | PARTIAL | 무료 콘텐츠(LMS·자료)의 이용 규칙·표시만 · 유료콘텐츠 해지·환불은 FUTURE_TRIGGER |
| 정보통신망법 §44(게시물·권리침해) | DIRECT | UGC 조 · 임시조치 — 단, 신고 기능이 없으므로 "문의 접수" 로 처리 |
| 저작권법 | DIRECT | UGC 비독점 이용허락 · 공급자 콘텐츠 사본 원칙 |
| 개인정보보호법 | DIRECT(지시) | 처리방침 v1.0 지시 · 약관 내 중복 서술 금지 |
| 약사법(자격 표시) | PARTIAL | KPA 약사 회원 자격 진실성 조 근거 |
| 통신판매업 신고 표시 | DIRECT(표시만) | Footer · 거래 조항 근거 아님 |

## 20. 추천 조문 구조 (§23)

제1장 총칙 — 제1조 목적 · 제2조 정의(회사·서비스·회원·역할·콘텐츠·AI 기능·포인트·매장 사본) · 제3조 약관의 게시·효력·변경(게시 중심) · 제4조 운영정책·별도 계약과의 관계
제2장 계정 — 제5조 회원가입·승낙(역할별 승인제 포함) · 제6조 자격 정보의 진실성(약사·사업자) · 제7조 계정 관리·보안(잠금·2차 사용 금지) · 제8조 회원 정보 변경 · 제9조 탈퇴(요청 기반) · 제10조 이용제한(사유·통지·이의)
제3장 서비스 — 제11조 서비스 내용·역할별 업무공간 · 제12조 서비스 변경·중단 · 제13조 무료 서비스 원칙 및 유료 서비스 개시 시 조치(FUTURE_TRIGGER) · 제14조 포인트(서비스 내 혜택)
제4장 콘텐츠 — 제15조 회원 게시물(비독점 이용허락·삭제·보존) · 제16조 공급자·운영자 콘텐츠와 매장 사본 · 제17조 AI 기능(초안·검토 책임) · 제18조 금지행위
제5장 책임 — 제19조 회사의 의무 · 제20조 회원의 의무 · 제21조 책임 제한(고의·중과실 제외) · 제22조 개인정보 보호(처리방침 지시) · 제23조 분쟁 해결·관할
부칙 — 시행일 · 최초 시행 · 기존 회원 적용 · 통신판매업 신고 표시

## 21. 판정 항목 목록

### CONFIRMED (약관 초안에 사실로 반영)
1. 계약 당사자 = 주식회사 쓰리라이프존 / 대표이사 서철환 (4 서비스 동일)
2. 적용 서비스 = neture · kpa-society · k-cosmetics · pharmacy-hub
3. 회원 역할 = 일반·약사·약대생·매장 경영자·공급자·운영자·관리자·강사 (Legacy Partner 없음)
4. 동의 저장 = 시각만(TIMESTAMP_ONLY) · 기존 terms 게시본 0 · 현재 회원 38명은 본문 없는 약관 동의 상태
5. 소비자 주문·결제·환불·청약철회·자동결제 없음 · B2B 주문·PG 는 TEST_ONLY · 유료 LMS·이용권 CODE_ONLY
6. 포인트 = 서비스 내 혜택 · 현금 구매·환전·양도 코드 0
7. 자체 탈퇴 route 없음 · 관리자 삭제·membership withdrawn 만
8. 이용제한 = 상태 기반 로그인 차단 · 사전 통지·이의 시스템 없음
9. UGC 삭제 = archived 보존 · 신고 기능 없음 · 라이선스 문구 0
10. 공급자 콘텐츠 → 매장 전체 사본(원본 참조 0)
11. AI = Gemini + OpenAI 외부 전송 · 자동생성 표시 없음 · 이미지/영상 생성 없음
12. 약관 변경 통지 = 게시만 가능 · 이전 버전 열람 API 없음
13. 통신판매업 신고번호 존재(표시용) · 통신판매중개 고지 없음

### POLICY_DECISION_REQUIRED (초안 시 사용자 결정 필요)
1. **PH JoinPage 동의 하드코딩**(체크박스·링크 없음) 및 KCos 링크 없음 — 약관 명시·설명 결함. 수정 WO 를 약관 게시 전/후 어느 시점에 둘지
2. 약관 v1.0 게시 후 **기존 회원 적용 방식**(게시 후 계속 이용 = 동의 간주 vs 재동의 흐름 개발)
3. 동의 버전 추적(`users` 에 terms_version 또는 consent 이력 테이블) 개발 여부
4. 이용제한 사전 통지 기간 · 긴급 제한 기준 · 이의제기 창구(문의 기능 사용 여부)
5. 포인트 소멸 기간 · 부정 획득 회수 · 탈퇴 시 처리
6. AI 결과의 의료·약학 판단 대체 금지 문구 수준
7. 약사 자격 허위 시 제재 수준
8. 처리방침 §7 외부 AI 제공자에 OpenAI 추가 여부(실사용 확인 후)
9. 약관 변경 통지 기간(7일/30일) 및 이메일 발송 의무 여부
10. 운영정책 게시 채널(`community`·`custom` 타입 사용) 및 서비스별 정책 분리 여부

### FUTURE_TRIGGER (약관 v1.0 에 트리거 조 1개로만 두고 본문 미작성)
1. 소비자 주문·결제·배송·환불·청약철회(전자상거래법·표준약관)
2. 유료 콘텐츠·유료 LMS(콘텐츠이용자보호지침)
3. 매장 유료 이용권·정기결제
4. 공급자 계약 · 매장 경영자 계약 · 서비스 운영자 계약
5. 자체 탈퇴 기능 · 동의 버전 추적 · 재동의 흐름
6. 게시물 신고·임시조치 기능
7. 통신판매중개 고지(중개 모델 개시 시)
8. 약관 이전 버전 공개 열람

## 22. 변경 0 확인 (§25)

| 항목 | 값 |
|---|---|
| 코드 변경 | 0 |
| DB write(UPDATE/INSERT/DELETE/DDL) | 0 — 전 조회 `SET default_transaction_read_only = on` |
| migration | 0 |
| `service_policy_documents` write | 0 |
| 동의·role·membership 변경 | 0 |
| 배포 | 0 |
| 임시 스크립트 | scratchpad 에서 실행 후 삭제 · proxy 종료 |
| 문서 추가 | 본 IR 1건 |

## 23. 다음 단계

사용자 지시에 따라 조사 단계 없이 **「O4O 통합 서비스 이용약관 v1.0」 초안**(§20 구조 · §21 CONFIRMED 반영 · POLICY_DECISION_REQUIRED 10건은 초안 내 선택지로 표시) 작성.
