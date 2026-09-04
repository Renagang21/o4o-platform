# CHECK-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1

- **WO**: `WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1`
- **작성일**: 2026-09-04
- **상태**: 구현 완료 · **실 로그인 실증 대기** (§12 는 사용자의 Cafe24 회원 로그인·동의가 필요)
- **선행 조사**: `IR-O4O-CAFE24-B2B-STORE-MEMBER-INTEGRATION-AND-OWNERSHIP-AUDIT-V1` (`ef75f8e10`)
- **선행 수정**: `WO-O4O-CAFE24-TOKEN-EXPIRY-KST-PARSE-FIX-V1` (`be8cff23f`)

목표: **"Cafe24 B2B 회원 1명 = O4O 내부 매장 1개"** 가 실제로 성립하는지 실증한다.
거래처 매장은 O4O 에 가입하지 않고, Cafe24 회원 로그인 상태만으로 매장 판매지원 화면까지 들어온다.

---

## 1. 확정 결정 반영 (§1)

| 결정 | WO 내용 | 구현 |
|---|---|---|
| **D1** 합성 email | stable hash 기반 · `user_identifier` 원문 비노출 · 실 메일 발송 불가 · UI 비노출 · 비밀번호 로그인 불가 | `synthesizeCafe24MemberEmail()` → `c24b2b-{hash[0:24]}@identity.o4o.local`. `.local` 은 RFC 6762 예약 TLD 라 오발송이 망 밖으로 나갈 수 없다. `users.password = ''` — bcrypt 해시가 아니므로 어떤 비밀번호로도 인증되지 않는다 |
| **D2** serviceKey | 신규 `cafe24-b2b`. 기존 `cafe24`·`neture`·supplier 축에 편입 금지 | `SERVICE_KEYS.CAFE24_B2B` 신설 + `platform_services` seed + `service-catalog.ts` 항목(`joinEnabled: false` — O4O 자체 가입 경로 없음) |
| **D3** Client ID 계약 | Secret rotation = 정상 / Client ID 변경 = identity namespace 변경 / 자동 migration 없음 | `client_id` 를 member hash 입력에 포함시켰다. Client ID 가 바뀌면 hash 가 통째로 갈리므로 **구조적으로** 다른 namespace 가 된다. 조용한 오결합이 불가능하다 |

---

## 2. 회원 인증 축 (§3)

- 운영자 축(`/api/v1/admin/cafe24`, Admin Access Token)과 **완전히 분리**된 회원 축을 새로 만들었다.
- authorize/token 은 몰 **대표도메인**(`{mall}.cafe24.com`)에서 수행한다 — `cafe24api.com` 이 아니다.
- 요청 scope 는 **`mall.read_customer_identifier` 하나뿐**이다. `mall.read_customer` 는 사용하지 않으며 회원 이름·email·전화번호를 가져오지 않는다.
- 회원 식별은 `GET /api/v2/customers/identifier` 로 **서버가 직접** 조회한다. 클라이언트가 `user_identifier` 를 주장할 통로가 없다(§10 spoofing 방지).

## 3. canonical member key (§4)

`(mall_id, shop_no, user_identifier)` 를 canonical key 로 삼되, **DB 에는 원문을 저장하지 않는다.**

```
member_hash = sha256( 'cafe24-b2b/v1' \n client_id \n mall_id \n shop_no \n user_identifier )
```

- 구분자 `\n` 으로 필드 경계 충돌(`'ab'+'c'` vs `'a'+'bc'`)을 차단했다 — spec 으로 고정.
- `UNIQUE (mall_id, shop_no, member_hash)` 가 멱등성과 몰·샵 교차 충돌 금지를 **DB 계층에서** 강제한다.
- 로그·응답에는 `maskMemberHash()`(앞 8자)만 남긴다.

## 4. provisioning (§5 · §6 · §7)

`Cafe24B2bStoreProvisioningService.provision()` — 단일 트랜잭션, 7 단계.

1. `cafe24_member_links` 조회 (재로그인이면 여기서 기존 user/org 를 그대로 재사용)
2. `users` upsert — `ON CONFLICT (email) DO NOTHING` · `provider='cafe24-b2b'` · `password=''` · `users.service_key` 는 **쓰지 않는다**(@deprecated, SSOT 는 `service_memberships`)
3. `organizationOpsService.ensureOrganizationWithOwnerAndService()` — Organization(`type='store'`) + owner member + service enrollment
4. `service_memberships` upsert (`status='active'`, role = bare `store_owner`) — Cafe24 회원 자격 자체가 승인 근거이므로 별도 운영자 승인 큐를 만들지 않는다
5. `role_assignments` — prefixed `cafe24-b2b:store_owner` (PharmacyHub 와 동일한 3단계 reactivate 패턴)
6. `cafe24_member_links` insert/update
7. `store_capabilities` 4건 (`QR_MARKETING`·`TABLET`·`SIGNAGE`·`LIBRARY`) `source='cafe24-b2b'`

- **트랜잭션 정책은 PharmacyHub 와 의도적으로 다르다.** §5 가 "실패 시 partial provisioning 방지"를 명시하므로 core 를 한 트랜잭션에 묶었다. slug 발급만 트랜잭션 밖이며, 실패해도 provisioning 을 깨지 않고 다음 로그인에 자가복구된다(identity 필수 요소가 아니다).
- **재사용 후보 탐색 로직이 없다.** `member_hash` 가 결정적이라 PharmacyHub 와 달리 "같은 매장인가?" 하는 모호성 자체가 발생하지 않는다.
- Organization 이름은 `{mallId} 거래처 매장 {hash 앞6자}` — 원문 식별자가 화면에 새지 않는다(§6: 사용자에게 organization 생성 과정은 보이지 않는다).
- capability 는 §7 대로 `source` 축에 값 하나만 추가했다. 새 요금·권한 체계를 만들지 않았다. DB 컬럼은 `varchar(20)` · CHECK 없음 → 순수 additive.

## 5. 매장 첫 화면 · 인증 경계 (§8 · §9 · §10)

mount: `/api/v1/cafe24-b2b`

| 라우트 | 설명 |
|---|---|
| `GET /login` | 서명 state 발급 후 Cafe24 회원 로그인 화면으로 302 (상태 변경 없음) |
| `GET /callback` | state 검증 → token 교환 → identifier 조회 → provisioning → 세션 쿠키 → 302 |
| `GET /store/support` | **매장 판매지원 첫 화면** (SSR HTML 200) — O4O 설명서 / 내 설명서 / QR / Tablet / Digital Signage |
| `GET /session` | 세션 요약(JSON) — 재로그인 멱등성 확인용. member_hash·user_identifier 미포함 |
| `POST /logout` | 세션만 폐기 (상태 변경이므로 POST — CLAUDE.md §8-4) |

**이 라우터는 O4O 로그인 밖이다.** 거래처 매장은 O4O 에 가입하지 않기 때문에 `authenticate` 를 걸 수 없다. 대신 두 개의 서명 경계를 둔다.

- `/callback` 의 신뢰 근거 = `/login` 이 발급한 HMAC 서명 state (운영자 축 `cafe24-oauth-state.ts` 재사용)
- `/store/*` 의 신뢰 근거 = HMAC 서명 세션 쿠키 (`cafe24-member-session.ts`)

**O4O JWT 를 발급하지 않은 이유**: 비밀번호 없는 합성 계정에 표준 JWT 를 내주면 `requireAuth` 만 걸린 모든 `/api/v1/**` 가 즉시 열린다. Pilot 범위를 훨씬 넘는 권한 확대다. 그래서 쿠키를 `path=/api/v1/cafe24-b2b` 로 스코프해 다른 라우트로는 **전송조차 되지 않게** 했다.

§9 홍보는 3줄뿐이다 — `Powered by O4O` / `매장용 제품설명서 · QR · Tablet · Digital Signage` / `O4O 독립 이용 문의`. 강제 가입·결제·앱스토어 유도 문구가 없음을 spec 으로 고정했다.

## 6. token timestamp (§11)

회원 축은 **토큰을 저장하지 않는다**. 그래서 `parseCafe24Timestamp()` 를 쓸 자리가 원래 없었다.
대신 Pilot 세션 만료를 Cafe24 Customer Access Token 만료로 **상한**시켰다 — Cafe24 인증이 끝났는데 O4O 세션만 살아 있는 상태를 만들지 않기 위해서다.

- `issueMemberSession(secret, input, notAfter)` 의 `notAfter` = `parseCafe24Timestamp(token.expires_at)` 결과
- 새 parser 를 만들지 않았다. `new Date()` 직접 파싱 0건.
- Cloud Run(UTC)에서도 동일 instant 임을 기존 spec + 신규 spec 양쪽에서 고정.

---

## 7. 검증 결과

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (api-server 전체) | **PASS** (오류 0) |
| `cafe24-b2b-member-identity.spec.ts` | **PASS** 18/18 |
| `cafe24-b2b-member-routes.spec.ts` | **PASS** 9/9 |
| `cafe24-token-expiry-timezone.spec.ts` (기존) | **PASS** — 회귀 없음 |
| `cafe24-oauth-state-and-token-crypto.spec.ts` (기존) | **PASS** — 회귀 없음 (cafe24 4개 suite 합계 47 tests PASS) |
| `platform-store-policy-tables.test.ts` (기존) | **PASS** — union 확장 회귀 없음 |
| **실 Cafe24 회원 로그인 (§12)** | **대기** — 아래 §9 참조 |

타입 확장 파급(모두 additive · migration 불필요):

- `StoreSlugServiceKey` · `StorePolicyServiceKey` (두 union 은 동일 집합 유지 계약이 이미 주석으로 명시돼 있다) — 컬럼 `varchar(50)`, CHECK 없음
- `CapabilitySource` — 컬럼 `varchar(20)`, CHECK 없음
- `StoreOwnerServiceKey` + POP/QR catalog 매핑 2곳 (본 controller 들은 `cafe24-b2b` 로 mount 되지 않는다 — §14)
- `jest.config.cjs` 에 `@o4o/platform-core/*` → src 매핑 추가 (dist 가 ESM 이라 ts-jest 가 변환 못 하는 기존 패턴과 동일)

---

## 8. §13 필수 질문 7개

| # | 질문 | 답 |
|:-:|---|---|
| ① | 별도 O4O 가입 없이 실제 진입 가능한가 | **구조적으로 가능**. 가입 화면·비밀번호·이메일 인증을 거치는 경로가 하나도 없고, `service-catalog` 에 `joinEnabled: false` 로 등록해 O4O 가입 UX 자체를 노출하지 않는다. 실 로그인 실증만 남았다 |
| ② | Customer Access Token 만으로 stable identity 가 성립하는가 | **성립한다**. `user_identifier` 는 (몰ID+샵NO+client_id+회원ID) 기반 앱 스코프 고정값이라 로그인마다 변하지 않는다. 토큰 자체는 저장하지 않고 파생 hash 만 남기므로 토큰 만료·재발급이 identity 에 영향을 주지 않는다 |
| ③ | 합성 email 방식이 기존 Identity V2 와 충돌하지 않는가 | **충돌하지 않는다**. `users.email UNIQUE` 를 hash 파생값으로 충족하고, `provider='cafe24-b2b'` 로 출처가 구분되며, `users.service_key`(@deprecated)를 건드리지 않고 SSOT 인 `service_memberships` 로만 소속을 표현한다. 예약 TLD `.local` + 빈 password 로 메일·비밀번호 경로가 원천 차단된다 |
| ④ | user/org provisioning 이 멱등인가 | **멱등이다**. `UNIQUE(mall_id, shop_no, member_hash)` + email `ON CONFLICT` + org code 기준 `ensureOrganization` + membership/role/capability 전부 `ON CONFLICT DO NOTHING`. 재로그인 시 1단계에서 기존 link 를 찾아 그대로 재사용한다. 실패 시 트랜잭션 롤백으로 partial provisioning 이 남지 않는다 |
| ⑤ | `cafe24-b2b` serviceKey 가 기존 서비스와 독립적인가 | **독립적이다**. 신규 `platform_services` 행 · 신규 role `cafe24-b2b:store_owner` · 전용 slug/enrollment 키 · 전용 capability source. 기존 `cafe24`(운영자 OAuth) · `neture`(공급자) 축의 데이터·권한과 겹치지 않는다 |
| ⑥ | 거래 종료 후 매장 organization 자산을 유지할 수 있는가 | **유지할 수 있다**. 매장 자산의 ownership 축은 `organizations` 이고 Cafe24 연결은 `cafe24_member_links` 라는 **별도 테이블**이다. link 를 `status='INACTIVE'` 로 두거나 삭제해도(FK `ON DELETE SET NULL`) organization·설명서·QR·Tablet 자산은 그대로 남는다. 거래 종료가 매장 자산 삭제를 의미하지 않는다 |
| ⑦ | QR/Tablet/Signage 연결을 다음 WO 에서 바로 시작할 수 있는가 | **가능하다**. 이번에 organization + slug + capability 4종까지 만들어 두었고, `StoreOwnerServiceKey`/`STORE_SERVICE_ORG_LINKAGE` 에 `cafe24-b2b` 를 등록해 기존 매장 resolver 가 이 매장을 인식한다. 다음 WO 는 화면 카드에 기존 기능 본체를 연결하는 일부터 시작하면 된다 |

---

## 9. 실 로그인 실증에 필요한 사용자 조치 (§12 대기 지점)

WO §0 이 정한 대기 지점이다. 아래가 준비되면 §12 의 10 단계를 그대로 수행한다.

1. **Cafe24 앱 scope 추가** — `mall.read_customer_identifier` (기존 `mall.read_product` 유지, `mall.read_customer` 는 추가하지 않는다)
2. **Redirect URI 등록** — `https://api.neture.co.kr/api/v1/cafe24-b2b/callback`
3. **Cloud Run 환경변수** — `CAFE24_MEMBER_REDIRECT_URI` (신규). `CAFE24_CLIENT_ID`/`CAFE24_CLIENT_SECRET` 은 기존 값 재사용. 선택: `CAFE24_B2B_DEFAULT_MALL_ID`, 대표도메인이 `{mall}.cafe24.com` 이 아니면 `CAFE24_MALL_PRIMARY_DOMAIN`
4. **테스트 몰의 회원 계정 1개** — 사용자가 직접 로그인·동의

실증 시 확인할 것: 진입 200 / `cafe24_member_links` 1행 / `organizations` 1행 / 로그아웃 후 재로그인 시 **동일 user·org 재사용, 중복 0**.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
