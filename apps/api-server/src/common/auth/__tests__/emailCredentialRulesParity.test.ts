/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-2 — 화면 규칙 ↔ 서버 규칙 동등성
 *
 * api-server 는 `@o4o/auth-utils` 를 의존성으로 갖지 않는다(의존성 추가는 이 WO 의 중지 조건).
 * 그래서 서버는 `email-credential.rules.ts` 에 같은 규칙을 한 벌 더 둔다. 이 테스트는 정본
 * (`packages/auth-utils/src/emailCredential.ts`)을 경로로 직접 불러와 같은 표본에 같은 답을 내는지 본다.
 * 한쪽만 바꾸면 여기서 깨진다.
 */
import * as canon from '../../../../../../packages/auth-utils/src/emailCredential';
import * as server from '../email-credential.rules.js';

const EMAILS = [
  '', ' ', 'a@b.co', 'A@B.CO', '  User@Example.com  ', 'no-at', '@x.com', 'a@@x.com', 'a@x', 'a@.x.com',
  'a@x.com.', 'a@x..com', 'a b@x.com', 'first.last+tag@sub.example.co.kr', `${'a'.repeat(250)}@x.com`, 'a@xy',
];

const PASSWORDS = [
  '', 'a', 'abcdefgh', 'ABCDEFGH', '12345678', '!!!!!!!!', 'abcd1234', 'abcd123!', 'ABCD123!', 'abc!1',
  'abcdefg!', '1234567!', 'abcd 1234', 'abcd1234 ', '한글비밀번호1!', 'Pa$$w0rd', '        ', 'a1!a1!a1',
];

describe('email credential rules — auth-utils 정본과 서버 거울이 같다', () => {
  it('정책 상수 · 안내 문구가 같다', () => {
    expect(server.PASSWORD_MIN_LENGTH).toBe(canon.PASSWORD_POLICY.minLength);
    expect(server.PASSWORD_POLICY_MESSAGES).toEqual(canon.PASSWORD_POLICY_MESSAGES);
  });

  it.each(EMAILS)('email %j', (e) => {
    expect(server.normalizeLoginEmail(e)).toBe(canon.normalizeLoginEmail(e));
    expect(server.isLoginEmailShapeValid(e)).toBe(canon.isLoginEmailShapeValid(e));
    expect(server.maskLoginEmail(e)).toBe(canon.maskLoginEmail(e));
  });

  it.each(PASSWORDS)('password %j', (p) => {
    expect(server.checkPasswordPolicy(p)).toEqual(canon.checkPasswordPolicy(p));
  });

  it('null · undefined 도 같게 다룬다', () => {
    for (const v of [null, undefined]) {
      expect(server.normalizeLoginEmail(v)).toBe(canon.normalizeLoginEmail(v));
      expect(server.checkPasswordPolicy(v)).toEqual(canon.checkPasswordPolicy(v));
    }
  });

  it('정책: 8자 이상 + 영문 + 숫자 + 기호, 대소문자 요구 없음', () => {
    expect(server.checkPasswordPolicy('abcd123!')).toEqual([]);
    expect(server.checkPasswordPolicy('ABCD123!')).toEqual([]);
    expect(server.checkPasswordPolicy('abcd1234')).toEqual(['no_symbol']);
  });
});
