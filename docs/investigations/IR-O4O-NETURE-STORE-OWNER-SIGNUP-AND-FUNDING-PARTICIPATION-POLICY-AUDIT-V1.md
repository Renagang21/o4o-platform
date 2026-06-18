# IR-O4O-NETURE-STORE-OWNER-SIGNUP-AND-FUNDING-PARTICIPATION-POLICY-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0.
> **대상:** Neture `매장 경영자(store_owner)` 가입 유형 ↔ 유통참여 펀딩(Market Trial) 참여 대상 정책의 의존 관계.
> **핵심 결론(정교화): 펀딩의 `ParticipantType.STORE_OWNER` enum 은 가입 role `store_owner` 와 별개다.** Market Trial 참여는 auth 만 요구(가입 role 미검사)하고 participantType 을 기본 `STORE_OWNER` 로 자동 배정한다. 따라서 **가입 카드 제거 ≠ 펀딩 깨짐.** 포럼 참여자 수동 확인은 closed forum(join-request→owner 승인) 으로 이미 완비. → **후보 A(가입 카드 제거) 안전. 단 `ParticipantType` enum 은 제거 금지(별개 도메인).**
> 선행: IR-O4O-NETURE-STORE-OWNER-ROLE-SEMANTIC-AUDIT-V1 (store_owner inert 확인 — 본 IR 은 펀딩/포럼 차원 추가)

---

## 1. 목적

Neture 가입 유형의 `매장 경영자(store_owner)` 가 **유통참여 펀딩(Market Trial) 의 참여 대상 구분값**으로 실제 필요한지, 아니면 가입 단계에서 제거하고 펀딩/포럼 운영자가 수동 확인하도록 둘지 조사한다. 선행 IR 은 store_owner 가 workspace/guard/operator 차원에서 inert 임을 확인했고, 본 IR 은 누락됐던 **펀딩 참여 대상 + 포럼 수동 확인** 차원을 보강한다.

## 2. 결정적 구분 — 가입 role vs 펀딩 ParticipantType (★)

서로 다른 두 개의 `store_owner` 가 존재한다. 혼동 시 잘못된 "제거 불가" 결론이 나온다.

| 구분 | 가입 role `store_owner` | 펀딩 `ParticipantType.STORE_OWNER` |
|------|------------------------|-----------------------------------|
| 정의 위치 | RegisterModal 가입 카드 → `service_memberships.role` | `packages/market-trial/src/entities/MarketTrialParticipant.entity.ts:21-27` enum |
| 의미 | 가입 유형 자기선언 | 펀딩 참여 기록의 참여자 분류값 |
| 저장 | service_memberships / role_assignments(bare, inert) | `market_trial_participants.participant_type` |
| 가입 role 검사? | — | **❌ 안 함** — 참여는 auth(userId)만 요구, participantType 기본 STORE_OWNER 자동 배정 |
| 제거 대상? | ✅ 가능(후보 A) | ❌ **제거 금지** — 펀딩 도메인 핵심 enum |

→ **둘은 문자열만 같고 도메인이 다르다.** 가입 카드를 제거해도 펀딩 enum/참여 흐름은 영향 없음.

## 3. 유통참여 펀딩(Market Trial) 의존 분석

- 펀딩 기능 존재: ✅ Market Trial(내부명) = "유통참여형 펀딩"(외부명). `packages/market-trial/*`, `docs/investigations/IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1.md`.
- 참여 엔드포인트: 참여 시 **role guard 없음** — `marketTrialController.joinTrial` 은 userId 만 요구(role 미검사). participantType 은 요청값이 'partner' 가 아니면 기본 `STORE_OWNER`(`MarketTrialController.ts:176`).
- 참여자 분류 사용처: forum access 필터(`MarketTrialForumService.ts:85` `In([STORE_OWNER, SELLER])`), decision 검증(`MarketTrialDecisionService.ts:118`). **모두 participantType(펀딩 enum) 기준, 가입 role 기준 아님.**
- 결론: **펀딩 참여 자격은 가입 role `store_owner` 에 의존하지 않는다.** 누구나(auth) 참여 가능하고, 참여 기록상 분류값으로 STORE_OWNER 가 기본 배정될 뿐.

## 4. 포럼 참여자 수동 확인 흐름

- **존재함(완비).** closed forum(`forum_type='closed'`) → 가입 신청(`forum_join_requests`, status=pending) → **포럼 개설자(owner) 수동 승인/거절** → `forum_category_members` 등록.
  - API: `POST /forum/categories/:id/join-requests` / `.../approve` / `.../reject` (`forum.routes.ts:133-144`).
  - owner 판별: `forum_category_members.role='owner'` 또는 `forum_category_requests.requester_id`(`forum-membership.service.ts:31-47`). 포럼 승인 시 신청자 owner 자동 등록(`ForumRequestService.ts:288-294`).
- **store_owner 의존 없음** — 승인 권한은 forum owner 기준, role==='store_owner' 검사 전무.
- Neture 포럼 현황: 현재 open(`requireApproval:false`). 펀딩-포럼 명시적 연결 코드는 미발견 → 필요 시 closed forum 으로 설정하면 수동 확인 흐름 즉시 활용 가능.

→ **사용자가 원한 "포럼 개설자/공급자 수동 확인" 은 이미 구현된 closed-forum 흐름으로 100% 대체 가능.**

## 5. 질문 답변

1. **가입 카드 제거 가능?** — ✅ 가능. 펀딩 참여는 가입 role 미의존(§3), 포럼 확인은 owner 기준(§4).
2. **펀딩 참여 제한이 store_owner(가입 role)에 의존?** — ❌ 아니오. participantType(별개 enum)에만 의존, 그조차 자동 기본배정.
3. **공급자가 "매장 경영자만 참여" 옵션을 코드로 설정?** — ❌ 미발견. 참여는 auth-only, eligibleRoles/targetRole 류 필터 필드 없음(Event Offer listing 에도 없음 — 수량 제한만).
4. **그 옵션 제거/안내성 격하 가능?** — 해당 옵션 자체가 없으므로 N/A(이미 누구나 참여).
5. **포럼 수동 확인 흐름 존재?** — ✅ closed forum join-request→owner 승인(§4).
6. **기존 store_owner 데이터 legacy 표시 유지?** — ✅ operator 화면이 이미 '일반 회원' collapse(선행 IR §3). migration 불요.
7. **제거 시 backend 차단 필요 vs frontend 카드 제거만?** — frontend 카드 제거가 핵심. backend `NETURE_ALLOWED_SIGNUP_ROLES` 에서 'store_owner' 제거(신규 신청 차단) 권장(1줄). 기존 데이터·펀딩 enum 무영향.
8. **명칭 대안?** — 굳이 가입 유형으로 남길 필요 낮음(제거 권장). 남긴다면 `유통참여 회원`/`포럼 참여 회원` 이 `매장 경영자` 보다 정확하나, §3-4 상 **가입 유형으로 둘 실익이 약함**.

## 6. 판단 — 제거 권장 (후보 A)

제거 권장 조건 충족:
- ✅ Neture store_owner 전용 workspace 없음(선행 IR).
- ✅ 펀딩 참여 자격이 가입 role 에 묶여 있지 않음(§3).
- ✅ 참여자 확인을 포럼 owner 수동 처리로 대체 가능(§4).
- ✅ 가입 단계 사업자 정보 수집 불필요.

**⚠️ 필수 가드레일: 가입 role 제거 ≠ `ParticipantType` enum 제거.** WO 착수 시 `packages/market-trial` 의 `ParticipantType.STORE_OWNER` 는 **건드리지 말 것**(펀딩 참여 기록 분류값, breaking).

## 7. 후속 WO 후보

### 후보 A (권장) — Neture 매장 경영자 가입 카드 제거
`WO-O4O-NETURE-STORE-OWNER-SIGNUP-CARD-REMOVE-V1`
- RegisterModal '매장 경영자' 카드 + store_owner 입력 필드(매장명/업종/매장지역/담당자) 제거 → supplier/partner 중심.
- backend: `NETURE_ALLOWED_SIGNUP_ROLES` 에서 'store_owner' 제거(신규 차단). 기존 데이터 legacy 잔존.
- **비건드림: `packages/market-trial` ParticipantType enum / 펀딩 참여 흐름 / forum membership.**
- 유통참여 펀딩 = 누구나 참여 + (필요 시) closed forum owner 수동 확인.
- DB migration 0.

### 후보 B — 명칭만 정리(`유통참여 회원`)
`WO-O4O-NETURE-STORE-OWNER-TO-FUNDING-PARTICIPANT-LABEL-ALIGNMENT-V1`
- '매장 경영자' → '유통참여 회원/포럼 참여 회원', 사업자/주소/업종 입력 제거, 권한 미연결.
- §3-4 상 가입 유형 존치 실익이 약해 **후보 A 대비 우선순위 낮음.**

## 8. 비범위

- 코드 삭제 / DB migration / role migration / 펀딩(Market Trial) 정책·enum 변경 / 포럼 승인 로직 변경 / 주소 AddressSearch 적용 / 공급자 가입 정보 수정.

## 9. 준수 확인

```
✅ read-only — 코드/DB/API/UI 변경 0
✅ 정적 분석만 (프로덕션 DB 미조회)
✅ 산출물 = 본 문서 1개(path-specific), 동시 세션 파일 무간섭
```

---

*read-only · 펀딩 ParticipantType.STORE_OWNER ≠ 가입 role store_owner(도메인 별개) · Market Trial 참여=auth-only(가입 role 미검사, participantType 기본 STORE_OWNER 자동) → 가입 카드 제거 ≠ 펀딩 깨짐 · 포럼 수동확인=closed forum join-request→owner 승인 기구현(store_owner 무관) · 후보 A(가입 카드 제거) 권장·DB migration 0·가입차단 backend 1곳 · 가드레일: packages/market-trial ParticipantType enum 제거 금지.*
