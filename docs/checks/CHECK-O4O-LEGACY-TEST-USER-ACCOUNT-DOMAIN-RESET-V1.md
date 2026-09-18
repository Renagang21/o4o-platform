# CHECK-O4O-LEGACY-TEST-USER-ACCOUNT-DOMAIN-RESET-V1

> **WO:** [`WO-O4O-LEGACY-TEST-USER-ACCOUNT-DOMAIN-RESET-V1`](../work-orders/WO-O4O-LEGACY-TEST-USER-ACCOUNT-DOMAIN-RESET-V1.md) (Phase 2 · WO-2C)
> **실행일:** 2026-09-18 · **대상:** production `o4o_platform` · **방식:** psql 단일 트랜잭션(REASSIGN → SET NULL → DELETE 자식→부모 → users → 트랜잭션 내 post-check → COMMIT)
> **판정:** `WO-2C ACCOUNT RESET: COMPLETE` — `users 58 → 1`(cleanup user 임시 보존). `users=0` 은 이 WO 의 목표가 아니다(수정 결정 2026-09-18).
> **개인정보:** 이 문서와 실행 로그에 email · name · phone · 면허번호 실값 0. count · 상태 · 날짜만 기록. DB host · password 기록 0.

---

## 0. 실행 원칙 (사용자 결정 · 2026-09-18)

| 분류 | 처리 | 기준 |
|---|---|---|
| **PRESERVE_AND_REASSIGN** | 소유자/작성자 컬럼을 cleanup user 로 UPDATE, row 보존 | 사용자 **직접 소유**가 필요한 업무 테스트 데이터(강의·콘텐츠·자료·매장 제작물·주문·게시글) |
| **SET NULL** | 컬럼만 NULL, row 보존 | 독립적으로 존재할 수 있는 사업자·공급자 엔티티의 생성자 컬럼 · 감사/행위자(actor · approved_by · assigned_by · updated_by) 컬럼 |
| **DELETE** | row 삭제 | 로그인 · password · credential · session · 수강진도 · 개인 활동로그 · 자격 · 관계 등 개인 테스트 이력 |
| **보존(무변경)** | — | organizations · stores · products · contents · courses · legal profiles · settings · supplier master 자체 |

cleanup user 는 **최종 소유자가 아니라 임시 검토자/보관자**다. Google-only 전환 후 새 사용자가 생기면 사용자가 화면을 확인하고 "데이터 A 를 사용자 가 에게" 식으로 개별 재배정을 요청한다(자동 배분 없음). cleanup user 자체의 최종 삭제는 별도 작업.

---

## 1. 삭제 직전 users count
**58** (active 15 · approved 2 · pending 1 · suspended 8 · deleted 32 · 생성 2026-05-14 ~ 2026-09-10). 트랜잭션 첫 단계에서 `count(*)=58` 과 cleanup user `status='active'` 를 assert — 불일치 시 RAISE → 미커밋. 실행 직후 `created_at > 2026-09-18` 신규 row 0.

## 2. 전체 삭제 여부
**57행 삭제 · 1행 보존(cleanup user = 사용자 본인 `platform:super_admin` 계정).** 최종 `users=1`.

## 3. FK / reference table 목록 (Dependency Census)
- 물리 FK(`pg_constraint` → `users.id`): **30건**. 이 중 업무 데이터가 CASCADE 로 딸려 삭제될 경로 = `neture_suppliers.user_id`(UNIQUE · CASCADE) → 선처리(SET NULL 3).
- 논리 참조: 전체 **uuid 컬럼 507개** 값을 `users.id` 와 대조(이름 패턴 검색 아님) + varchar 저장 컬럼 2개(`checkout_order_logs.performedBy` · `o4o_event_logs.actor_id`). 실제 참조 존재 컬럼 **115개 / 약 85 테이블**.
- 2차 FK(삭제 대상 자식 테이블을 가리키는 FK): `kpa_members→kpa_member_services(CASCADE)` · `lms_enrollments→lms_progress(CASCADE)` · `forum_category_requests→forum_post.forum_id(NO ACTION)` / `→forum_join_requests(CASCADE)`. **`forum_category_requests` 는 forum 엔티티(게시글 6건 보유)로 확인되어 DELETE → PRESERVE_AND_REASSIGN 으로 재분류.**

## 4. 테이블별 처리 건수 (트랜잭션 내 RETURNING 집계 · 사전 census 와 전건 일치)

### 4-1. PRESERVE_AND_REASSIGN → cleanup user (25 컬럼 · 311 row)
| 테이블.컬럼 | 건수 |
|---|---|
| lms_courses.instructorId | 7 |
| lms_quizzes.createdBy | 5 |
| cms_contents.createdBy | 2 |
| cosmetics_contents.created_by | 2 |
| kpa_contents.created_by | 8 |
| media_assets.uploaded_by | 60 |
| signage_media.createdByUserId | 7 |
| signage_playlists.createdByUserId | 1 |
| store_asset_derivations.created_by | 38 |
| store_multilingual_product_content_groups.created_by_user_id | 5 |
| store_multilingual_product_content_pages.created_by_user_id | 10 |
| store_pop_documents.created_by | 16 |
| store_tablet_screen_sets.created_by_user_id | 52 |
| shared_product_descriptions.created_by | 17 |
| product_candidates.submitted_by | 4 |
| product_approvals.requested_by | 2 |
| organization_product_listings.requested_by | 1 |
| o4o_asset_snapshots.created_by | 13 |
| market_trials.supplierId | 1 |
| forum_post.author_id / last_comment_by | 3 / 3 |
| forum_comment.author_id | 4 |
| forum_category_requests.requester_id | 4 |
| checkout_orders.buyerId | 23 |
| checkout_order_logs.performedBy (varchar) | 23 |

### 4-2. SET NULL (13 컬럼 · 79 row · row 보존)
| 테이블.컬럼 | 건수 | 이유 |
|---|---|---|
| organizations.created_by_user_id | 12 | 사업자 엔티티 독립 존재 |
| neture_suppliers.user_id | 3 | 공급자 독립 존재 · UNIQUE/CASCADE 선처리 (offer 22 보존) |
| branch_officers.user_id | 0 | 해당 row 가 cleanup user 소유 → 무변경 |
| notifications.actorId | 18 | 행위자 |
| media_assets.updated_by | 20 | 감사 |
| cosmetics_contents.updated_by | 2 | 감사 |
| kpa_store_contents.updated_by | 8 | 감사 |
| shared_product_descriptions.updated_by | 7 | 감사 |
| supplier_product_offers.deleted_by | 1 | 감사 |
| service_policy_documents.updated_by | 1 | 감사 |
| service_memberships.approved_by | 1 | 잔존 row 승인자 |
| role_assignments.assigned_by | 1 | 잔존 row 부여자 |
| o4o_event_logs.actor_id (varchar) | 5 | 행위자 · 로그 보존 |

### 4-3. DELETE (39 단계 · 6,037 row + users 57)
| 테이블 | 건수 | | 테이블 | 건수 |
|---|---|---|---|---|
| lms_progress(경유 enrollment) | 6 | | organization_members | 19 |
| lms_enrollments | 8 | | branch_memberships | 6 |
| lms_quiz_attempts | 6 | | branch_fee_ledgers | 1 |
| lms_submissions | 1 | | branch_education_credit_ledgers | 1 |
| course_completions | 4 | | branch_event_rsvps | 1 |
| lms_certificates | 1 | | forum_category_members | 3 |
| credit_transactions | 11 | | forum_join_requests | 1 |
| credit_balances | 2 | | market_trial_participants | 1 |
| kpa_member_services(경유 member) | 6 | | notifications.userId | 39 |
| kpa_members | 6 | | account_activities | 2,830 |
| kpa_pharmacist_profiles | 6 | | action_logs | 2,831 |
| member_qualifications | 1 | | ai_usage_logs | 25 |
| qualification_requests | 1 | | kpa_operator_audit_logs | 14 |
| instructor_profiles | 1 | | automation_jobs | 7 |
| cosmetics_members | 1 | | handoff_tokens | 7 |
| kpa_approval_requests | 1 | | user_policy_acceptances | 4 |
| annual_reports | 1 | | email_verification_tokens | 38 |
| appreciation_sends | 1 | | password_reset_tokens | 6 |
| service_credentials | 26 | | service_memberships | 34 |
| role_assignments | 59 | | **users** | **57** |

0행 테이블(삭제 대상 없음): linked_accounts · refresh_tokens · kpa_student_profiles · kyc_documents · cafe24_member_links · forum_like/bookmark/notifications · role_migration_log · kpa_pharmacy_requests. `local_agent_*`(116) 은 전부 cleanup user 소유 → 무변경.

## 5. SET NULL / 보존 목록
§4-2 참조. REVIEW 항목 사용자 결정(2026-09-18): `neture_suppliers.user_id` 3 → SET NULL · `checkout_orders` 23(+logs 23 · payments 1) → cleanup user 재연결 · `automation_jobs` 7 → DELETE · `o4o_event_logs.actor_id` 5 → SET NULL.

## 6. 삭제하지 않은 business / store / content
organizations 25(매장·약국형 17 포함) · neture_suppliers 3 · supplier_product_offers 22 · checkout_orders 23 · checkout_payments 1 · forum(forum_category_requests) 7 · forum_post 8 · lms_courses 11 · kpa_contents 16 · media_assets 68 · service_legal_profiles 4 · service_policy_documents 9 — **전부 실행 전후 동일**. 테스트 데이터 여부는 사용자가 cleanup user 로 화면 검토 후 개별 결정(별도 요청).

## 7. orphan 검사
- 삭제된 57명 id 를 가리키는 값: **uuid 컬럼 507개 + varchar 2개 재스캔 = 0** (트랜잭션 내 assert, 커밋 후 재확인).
- 이번 WO 가 만든 orphan 0.
- **사전 존재 orphan(이번 WO 무관 · 무변경):** `organization_members.user_id` 2 · `kpa_operator_audit_logs.operator_id` 163 · `cms_contents.createdBy` 55. 별도 처리 후보로만 보고.

## 8. users = 1 (cleanup user)
`count(*)=1 · status=active`. 이 계정의 password · status 해시, service_credentials 5 · service_memberships 5 · role_assignments 11 이 트랜잭션 전후 동일함을 assert.

## 9. linked_accounts = 0 · 10. service_credentials 잔존 = 5(cleanup, orphan 0) · 11. service_memberships user rows = 5(cleanup, orphan 0) · 12. role_assignments user rows = 11(cleanup, orphan 0)

## 13. Credential / Profile 테스트 row
kpa_pharmacist_profiles 1(cleanup) · kpa_student_profiles 0 · kpa_members 1(cleanup) · kpa_member_services 0 · member_qualifications 0 · qualification_requests 0 · instructor_profiles 0 · cosmetics_members 0.

## 14. Relationship 테스트 row
organization_members 3(cleanup 1 + 사전 orphan 2) · branch_memberships 3(cleanup) · branch_officers 1(cleanup) · forum_category_members 2(cleanup) · market_trial_participants 0.

## 15. password / reset / verification 잔존
password_reset_tokens 4(cleanup user 본인 · auth 보존 범위) · email_verification_tokens 0 · refresh_tokens 0 · handoff_tokens 0 · user_policy_acceptances 0. cleanup user 의 password 는 화면 검토 로그인용으로 보존.

## 16. seed 재생성 0 · 17. placeholder 0
users 신규 INSERT 0 (`created_at > 2026-09-18` = 0). `deleted-user@…` / `system-user@…` / placeholder 패턴 0.

## 18. backup / snapshot
Cloud SQL `o4o-platform-db`: 자동 백업 ON · **PITR ON(트랜잭션 로그 7일)** · 최근 백업 2026-09-17T18:00Z SUCCESSFUL. 별도 수동 snapshot 미생성(PITR 로 실행 시각 이전 복구 가능). 실행 전 dry-run(동일 스크립트 ROLLBACK) 으로 전 건수 확인 후 COMMIT.

## 19. 개인정보 raw 기록 0
이 문서 · 커밋 · 실행 로그(로컬 scratchpad)에 email/name/phone/면허 실값 0. 스크립트는 cleanup user 를 uuid 로만 참조. repository 에 dump 저장 0.

## 20. WO-2A smoke N/A 반영
[`CHECK-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1`](CHECK-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1.md) §6-C = `N/A — legacy test account population intentionally retired before Google cutover` (faa1268a1). 테스트 계정 password 오류 추가 조사 없음.

## 21. Phase 2 순서 반영
2A COMPLETE → 2B COMPLETE → **2C(본 WO) COMPLETE** → 2D Google-only Signup/Login(Web/Admin/Mobile) → 2E First Google Admin Bootstrap → 2F Legacy Password/Auth 제거 → 2G Kakao/Naver/Passport 제거 → 2H 검증·문서 정합. 구 2C Explicit Linking · 구 2E Recovery 폐기.

## 22. HEAD == origin/main · 23. 작업트리
커밋 후 push 로 확인(완료 보고에 기재). 코드 · schema · migration 변경 0 — 이 WO 는 데이터 정리만.

---

## 후속 (별도 작업 · 미착수)
1. cleanup user 로 관리자·운영자 화면 검토 → 데이터별 "새 Google 사용자에게 연결 / 삭제" 개별 요청.
2. 사전 존재 orphan 3종(§7) 처리 여부 결정.
3. cleanup user 최종 삭제 (Google-only 계정 생성 후).
4. WO-2D Google-only Signup/Login 착수 가능(`COMPLETE` 게이트 충족).
