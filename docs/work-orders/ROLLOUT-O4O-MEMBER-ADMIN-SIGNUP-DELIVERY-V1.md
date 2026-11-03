# 회원·가입·자료 삭제 — 운영 적용 계획

상태: 적용 전. 이 문서는 배포 승인·실제 적용 결과가 아니다. 근거는 [CHECK](../checks/CHECK-O4O-MEMBER-ADMIN-SIGNUP-DELIVERY-V1.md)이며 이 작업의 실제 최종 HEAD·PR·CI와 대조한다.

## 적용 대상·영향

1. main PR merge 후 post-merge CI/Delivery를 확인한다. migration·인증·권한 변경이므로 LEVEL3 / MANUAL/GATED다. owner의 정상 Promote 경로만 사용하며 freeze/CI/main SHA gate를 우회하지 않는다.
2. API deployment migration Job은 다음 3 incremental을 순서대로 적용한다. 모든 migration은 데이터 삭제·운영 회원 변경·자료 이동을 실행하지 않는다. schema 및 trigger DDL이며 짧은 테이블 lock이 필요하다. 실제 운영 row 수·lock 대기 시간은 로컬 합성 DB로 예측할 수 없다.
   - `CompleteMemberErasureFences1793684890120`: 13 writer table의 계정 제거 fence, 단일 직원 사업체 소속 guard. 기존 여러 사업체의 직원/관리 소속이 있으면 `SINGLE_EMPLOYER_DATA_REVIEW_REQUIRED`로 중단하며 자동 해지·삭제하지 않는다. owner-only 복수 사업체는 제외한다.
   - `SeparateMemberResourceOwnership1793691490120`: KYC.user_id, ForumCategoryRequest.requester_id, ForumComment.author_id, AssistantTask.requested_by_user_id, AssetSnapshot.created_by, StoreProduct.created_by를 nullable로 한다. 기존 users FK의 delete 동작을 SETNULL로 변경하고 폐업 파일 journal table/fence를 추가한다. 사업 자료의 사용자 귀속만 분리하며 본문을 변환하지 않는다.
   - `FenceClosedPharmacyWriters1793698990120`: organizations.full_closure_at nullable 추가, 현재 public/neture/cosmetics의 UUID org/store writer에 폐업 guard 추가. 일반 조직의 기존 데이터는 변경하지 않는다. 명시적 완전폐업으로 표시된 조직은 ordinary writer로 재개할 수 없다.
3. 기대 schema는 `9c5e1bb5494257c578430da1cd297a5a56438ab8e369f619b7db19c3f0cebe76` /7552 lines이다. 새 DB 57개 전체 incremental, main prefix upgrade, down/up과 populated rollback refusal를 격리 DB에서 검증했다. 추가 운영 main migration이 있으면 이 기준을 다시 계산한다.
4. API 먼저 verified rollout 후 Admin/Neture를 배포한다. 공유 auth/entity 변경 소비처는 Delivery의 serving→target 판정에 따른다. 협동조합 별도 앱은 자동 대상이라고 가정하지 않고 실제 판정·workflow 범위를 확인한다.

## 기능 활성화와 분리

이번 배포에서 `ACCOUNT_ERASURE_MODE`·파일 검토·시스템 분류 환경값을 새로 켜지 않는다. 기본 OFF를 유지하고 내역 조회는 가능하게 한다. 실제 계정 삭제·약국 매도·완전폐업 명령을 smoke로 실행하지 않는다. 운영 사용자가 해당 명령을 선택하면 권한/Google 인증/사유/명시적 대상 확인과 domain 조건을 서버에서 다시 검사한다.

개인 삭제 활성화는 별도 단계다. 실제 producer별 private file inventory·기존 무표식/shared object·필요한 storage list/get/delete IAM·시스템별 1/2년 기준과 근거·진행 중 case/보존 예외를 확인한다. 미분류 참조는 삭제 완료로 처리하지 않는다. 실제 계정/업무 자료의 삭제 시험은 승인 범위에 없다.

## 실행 전·후 확인 및 중지

- AGENTS.md §4-1(f)/§5에 따라 이 3개 운영 DDL 적용이 포함된 Promote를 dispatch하기 전 구체적인 사용자 승인을 받는다. 코드 PR·검증·병합 준비는 먼저 완료한다.
- Promote 대상은 그 순간의 main 40자 HEAD와 실제 green CI다. freeze/unknown serving/SHA 이동/새 schema drift면 중지하고 재판정한다. 저장소 variable 읽기403만으로 freeze를 추정하지 않는다.
- migration 실패면 API/front rollout을 멈춘다. 보정용 임시 fence나 history hash 덮어쓰기를 하지 않는다. 필요하면 현재 schema status·다중 직원 현황을 소유자의 읽기 전용 경로로 확인한다. 중복 소속의 강제 해지/운영 데이터 정리는 별도 승인이다.
- 실제 API/front serving SHA·health·공개 가입 버튼·Admin 비인가 차단을 확인한다. 실회원 삭제/실메일 발송/유료 AI 호출을 검증 수단으로 쓰지 않는다.
- app revision rollback과 schema rollback은 다르다. attribution이 NULL이 된 뒤 migration2 down은 거절하며 폐업 tombstone이 존재하면 migration3 down은 거절한다. 무조건 DDL rollback하지 않고 현 schema와 호환되는 app revision 또는 검토된 forward fix로 복구한다. 공개/업무 자료를 복구 테스트로 지우지 않는다.

## 실제 기록

- PR / merged main / post-merge CI: 미실행
- 운영 migration 승인: 대기
- Promote / migration / API·front serving SHA / 공개 smoke: 미실행
- 개인 삭제 활성화: 미실행, 기본 OFF 유지
