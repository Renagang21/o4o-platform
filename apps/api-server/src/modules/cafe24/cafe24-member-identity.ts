/**
 * Cafe24 B2B 거래처 매장 회원 — identity 파생 규칙 (SSOT)
 *
 * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 §1(D1) · §4 · §10
 *
 * Cafe24 회원 인증(Customer Access Token)은 **email / 이름 / 전화번호를 주지 않는다.**
 * 주는 것은 `user_identifier` 하나뿐이며, 이 값은
 *   (몰ID + 샵NO + client_id + 회원ID)
 * 를 묶은 앱 스코프 가명 식별자다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 계약 1 — canonical external member key = (mall_id, shop_no, user_identifier)  [§4]
 *
 *   raw `user_identifier` 는 DB·로그·화면 어디에도 남기지 않는다. 대신 위 3요소에
 *   **client_id 를 명시적으로 더해** SHA-256 한 값(`memberHash`)만 저장한다.
 *
 *   client_id 를 해시 입력에 넣는 이유(§1 D3):
 *     `user_identifier` 는 이미 client_id 에 종속된 값이지만, 그 종속성이 Cafe24 내부
 *     규칙이라 O4O 저장본만 보고는 어느 namespace 의 값인지 알 수 없다. 해시 입력에
 *     넣어 두면 **Client ID 가 바뀌는 순간 해시가 통째로 갈라져** 다른 namespace 의
 *     식별자가 기존 매장에 잘못 붙는 일이 구조적으로 불가능해진다.
 *     → Client Secret rotation = 해시 불변(정상 운영) / Client ID 변경 = 새 namespace.
 *       Client ID 는 immutable 운영계약이며 자동 migration 하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 계약 2 — 합성 email  [§1 D1 · §10]
 *
 *   `users.email` 은 NOT NULL UNIQUE 라 값이 반드시 필요하다. 실제 Cafe24 email 을
 *   받아오지 않으므로(§3 — `mall.read_customer` 미사용) 결정적 합성값을 쓴다.
 *
 *     c24b2b-{memberHash 앞 24 hex}@identity.o4o.local
 *
 *   `.local` 은 RFC 6762 예약 TLD 로 공개 DNS 에 존재할 수 없다 → 오발송해도 외부로
 *   나가지 않는다. 다음은 **금지**다:
 *     - UI 표시            (§10)
 *     - 메일 발송 대상     (§10)
 *     - 비밀번호 로그인     (§10 — password credential 자체를 만들지 않는다)
 *     - 실제 Cafe24 email 인 것처럼 표기
 */

import crypto from 'crypto';

/** 합성 email 도메인. 공개 DNS 에 존재할 수 없는 예약 TLD 를 쓴다. */
export const CAFE24_B2B_SYNTHETIC_EMAIL_DOMAIN = 'identity.o4o.local';

/** 합성 email local-part 접두사 — 저장본만 보고도 출처를 알 수 있게 한다. */
export const CAFE24_B2B_SYNTHETIC_EMAIL_PREFIX = 'c24b2b-';

export interface Cafe24MemberIdentityInput {
  clientId: string;
  mallId: string;
  shopNo: number;
  userIdentifier: string;
}

function assertNonEmpty(label: string, value: string): string {
  const v = (value ?? '').trim();
  if (!v) throw new Error(`CAFE24_MEMBER_IDENTITY_MISSING_${label}`);
  return v;
}

/**
 * canonical member hash (sha256 hex, 64자).
 *
 * 구분자 `\n` 은 각 요소에 나타날 수 없는 문자라 요소 경계가 모호해지지 않는다
 * (예: mall="a", shop="1b" 와 mall="a1", shop="b" 가 같은 입력으로 뭉치지 않는다).
 */
export function deriveCafe24MemberHash(input: Cafe24MemberIdentityInput): string {
  const clientId = assertNonEmpty('CLIENT_ID', input.clientId);
  const mallId = assertNonEmpty('MALL_ID', input.mallId);
  const userIdentifier = assertNonEmpty('USER_IDENTIFIER', input.userIdentifier);
  const shopNo = Number(input.shopNo);
  if (!Number.isInteger(shopNo) || shopNo < 1) {
    throw new Error('CAFE24_MEMBER_IDENTITY_MISSING_SHOP_NO');
  }

  return crypto
    .createHash('sha256')
    .update(['cafe24-b2b/v1', clientId, mallId, String(shopNo), userIdentifier].join('\n'))
    .digest('hex');
}

/** client_id namespace 지문 — 어느 Client ID 로 만들어진 링크인지 감사용(원문 저장 아님). */
export function deriveCafe24ClientNamespace(clientId: string): string {
  return crypto
    .createHash('sha256')
    .update(`cafe24-b2b/client/v1\n${assertNonEmpty('CLIENT_ID', clientId)}`)
    .digest('hex')
    .slice(0, 32);
}

/** 결정적 합성 email. 같은 회원은 언제 다시 로그인해도 같은 값이 나온다. */
export function synthesizeCafe24MemberEmail(memberHash: string): string {
  if (!/^[0-9a-f]{64}$/.test(memberHash)) throw new Error('CAFE24_MEMBER_HASH_INVALID');
  return `${CAFE24_B2B_SYNTHETIC_EMAIL_PREFIX}${memberHash.slice(0, 24)}@${CAFE24_B2B_SYNTHETIC_EMAIL_DOMAIN}`;
}

/** 합성 email 여부 판정 — UI/메일 발송 경로에서 걸러내기 위한 공용 술어. */
export function isCafe24SyntheticEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.endsWith(`@${CAFE24_B2B_SYNTHETIC_EMAIL_DOMAIN}`);
}

/** 로그·에러 메시지용 축약 표기. raw user_identifier 를 대체한다 (§4·§10). */
export function maskMemberHash(memberHash: string): string {
  return `${memberHash.slice(0, 8)}…`;
}

/** 조직 code — memberHash 파생 결정적 값. 재실행 시 ON CONFLICT (code) 로 같은 row. */
export function cafe24MemberOrganizationCode(memberHash: string): string {
  return `c24b2b-${memberHash.slice(0, 12)}`;
}
