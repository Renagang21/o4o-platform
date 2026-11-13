# 법적 기본 문서(약관 · 처리방침 · 마케팅 동의) 배치와 관리자 편집 — 단계별 TODO

> **상태**: ACTIVE
> **작성일**: 2026-11-12 · **최종 갱신**: 2026-11-12
> **실행 위치**: BOTH (구현 CLOUD · 운영 게시 · 화면 확인 LOCAL)
> **인계**: `claude/peaceful-lamport-sjwtri-legal-todo` · push 전 · 다음 실행자 CLOUD
> **근거**: 사용자 지시(2026-11-12) — 「admin.neture.co.kr/admin 에서 이용약관 등 기본 문서를 수정 가능하게. 글자 수정 · 적용 서비스(통합약관과 약국 협력사업은 다름). 공급자와 파트너가 달라야 하면 적용」 · 「전체를 todo 로 만들어 단계적으로 진행」 · 「게시 날짜는 고정하지 않고 관리자에서 지정」

## 1. 배경 — 현재 구조 (코드 기준 · origin/main 2026-11-12)

- **저장 · 버전 · 게시는 이미 공용 구조다.**
  - `service_policy_documents`: `service_key` · `document_type` · `slug`(표식) · `version` · `status` · `effective_date` 를 둔다.
  - `user_policy_acceptances`: 회원이 동의한 문서 · 버전 · 본문 hash 를 기록한다.
  - 게시된 문서는 덮어쓸 수 없다. 고치면 새 버전 초안을 만들어 게시하고, 이전 버전은 보존한다(archive/restore 만 있고 삭제는 없다).
  - 시행일 전에는 게시를 거부한다.
- **범위(scope):**
  - 공통 계정은 `neture`(표식 `neture-account-terms|privacy`)다.
  - 직영 서비스는 `supplier` · `community` · `funding` · `lecture` · `partner-support` 이고, 표식은 `<key>-service-terms|privacy` 다.
  - 약국 협력사업은 `business:<semi_franchise id>` 이고, 표식은 서버가 붙인다.
- **편집 화면:** 공용 컴포넌트 `packages/operator-core-ui/src/modules/service-legal/ServiceLegalSettingsPage.tsx` 를 쓴다.
  - neture `/admin/settings/legal-terms`
  - 각 서비스 호스트 `/operator/legal/*`
  - admin.neture.co.kr 중앙 운영(neture · supplier · funding · lecture · community)
  - 약국 협력사업은 `BusinessOperationsPanel` 에서 편집한다.
- **빈 곳:**
  - 새 문서 폼에 표식 입력이 없다.
  - 마케팅 동의는 `users.marketing_accepted` 예/아니오 값뿐이다(문안 · 버전 · 시점 증빙이 없다).
  - `partner-support` 는 공개 화면이 읽지만 편집 허용 목록(`SUPPORTED_LEGAL_SERVICE_KEYS`)에 없다.
  - admin 에 전체 문서를 한눈에 보는 화면이 없다.
  - 퇴역 서비스(kpa-society · k-cosmetics) 문서가 편집 대상에 섞여 있다.

## 2. 사용자 확정

- 기본 문서는 admin.neture.co.kr 에서 수정 가능해야 한다(글자 수정 · 적용 서비스).
- 통합(계정) 약관과 약국 협력사업 약관은 다르다.
- 공급자와 파트너는 조사 결과 달라야 하면 다르게 적용한다 → **다르게 둔다**(§3).
- 게시(시행) 날짜는 지시서 · 코드에 고정하지 않고 관리자 화면에서 정한다(2026-11-12).

## 3. 설계 판단 — 배치

| 단계 | 문서 | 적용 대상 | 동의 방식 | 편집 위치 |
|---|---|---|---|---|
| ① 계정 공통 | 계정 이용약관 · 계정 개인정보 처리방침 · 마케팅 정보 수신 동의 | 모든 회원(가입 1회) | 약관 필수 동의 · 처리방침 필수 확인 · 마케팅 **선택**(철회 가능) | admin.neture.co.kr |
| ② 직영 서비스별 추가 약관 | 서비스 이용약관 + 개인정보 안내 | 공급자 · 커뮤니티 · 펀딩 · 강의 · Partner | 그 서비스 신청 · 참여 시 | admin.neture.co.kr (+ 각 서비스 호스트) |
| ③ 약국 협력사업별 약관 | 사업 이용약관 + 개인정보 안내 | pharmacy · drugstore · pharmcoop · carepharm 각각 | 그 사업 참여 신청 시 | 각 사업 운영 화면. admin 은 **조회 + 이동만**(V2 §144 — 전체 관리자에게 독립 사업 내부 운영권을 주지 않는다) |
| ④ 계약 · 거래 조건 | 매장 경영자 동의서 · 공급 제안 거래 조건 | 해당 기능 사용자 | 기능 사용 시점 | 현행 유지 |

**공급자 ≠ Partner.**
- 공급자는 공급 사업자로서 상품 · 자료를 공급하고 B2B 주문을 연결한다. 다루는 개인정보는 사업자 · 담당자 · 거래 정보다.
- Partner(`partner-support`)는 홍보 도구와 파트너 커뮤니티를 쓰며, 비약사 개인도 승인 후 참여할 수 있다. 다루는 개인정보는 개인 활동 정보다.
- 법적 관계 · 개인정보 · 승인 조건이 달라 문서를 분리한다.
- Partner 본문은 사업 승인 조건(`O4O-ROLE-WORKSPACE-ARCHITECTURE-V2` 「후속 확정」)이 정해진 뒤 게시한다.

**글자 수정.**
- 게시된 문서는 새 버전 → 시행일 → 게시 순으로 바뀐다. 약관 새 버전을 게시하면 회원은 다음 로그인 때 재동의한다.
- 현행 약관 제3조에 따라 사전 공지가 필요하다(7일, 불리한 변경은 30일).

## 4. 범위 밖

- 약관 · 처리방침 **본문 내용** 작성 · 개정(사업 · 법률 판단 — 사용자).
- 운영 DB 직접 write. 게시는 관리자 화면에서 하고, 통합 담당 승인을 받는다.
- 퇴역 서비스 v1 문서의 삭제(동의 증빙 보존 대상).

## 5. TODO

| # | 단계 | 내용 | 상태 · PR |
|---|---|---|---|
| 1 | [CLOUD] 새 문서 폼 표식(slug) 입력 | 권장 표식 자동 채움 · 수정 시 읽기 전용 · 약국 협력사업 화면은 숨김 | Ready · [#1033](https://github.com/Renagang21/o4o-platform/pull/1033) |
| 1-b | [CLOUD] 시행일 하드코딩 제거 | 공개 API `…/policies/:type/scheduled`(메타만) · 공고 페이지가 관리자 시행일을 표시 · v2 지시서 고정 일정 삭제 | Ready · [#1034](https://github.com/Renagang21/o4o-platform/pull/1034) |
| 2 | [CLOUD] 마케팅 수신 동의를 문서 + 동의 기록으로 | `marketing` 문서(계정 공통) 게시본에 대한 `consent` 기록 · 가입 화면 선택 체크 · 마이페이지 철회 · 기존 `marketing_accepted` 는 호환 유지 | 대기 |
| 3 | [CLOUD] Partner 문서 편집 가능 | `partner-support` 를 편집 허용 목록 · admin 중앙 운영 legal 영역에 추가. 본문 게시는 Partner 조건 확정 후 | 대기 |
| 4 | [CLOUD] admin 통합 문서 목록 | ①~③ 문서의 게시 버전 · 시행일 · 초안 · 동의 건수 한 화면. ① ② 는 편집, ③ 은 조회 + 이동 | 대기 |
| 5 | [CLOUD] 퇴역 서비스 표시 | kpa-society · k-cosmetics 문서 「퇴역 · 편집 불가」 표시(보존) | 대기 |
| 6 | [LOCAL] 계정 약관 v2 게시 | 1 · 1-b 배포 후 관리자 화면에서 시행일 입력 → 시행일 이후 게시(`WO-O4O-ACCOUNT-POLICY-V2-PUBLICATION-V1` §5-3 · 통합 담당 승인) | 대기 |

**결정이 필요한 것(사용자):**
- 마케팅 수신 동의 문안(2단계 게시 전).
- Partner 사업 승인 조건 · 약관 본문(3단계 게시 전).
- 예약 자동 게시가 필요한지. 지금은 관리자가 시행일 이후 직접 게시하며, 자동 게시에는 스케줄러가 필요하다.
- 단순 오타 수정도 재동의 대상으로 둘지.

## 6. 검증 계획

- 각 단계 PR: 공용 컴포넌트 Vitest · api-server Jest · 타입 검사.
- 배포 후 관리자 화면 확인: admin 계정이 필요하다(Demo 로는 볼 수 없음 — `AGENTS.md` §6).
- 6단계 게시 후: 공개 `/terms` · `/privacy` · 공고 페이지 표시와 재동의 동작(v2 지시서 §5-4).

## 문서 정합

해당 없음
