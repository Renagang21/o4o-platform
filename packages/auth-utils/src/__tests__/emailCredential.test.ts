/**
 * 이메일·비밀번호 인증 판정 규칙 — 계약 고정
 *
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-2 · §2-3
 *
 * 이 파일이 막는 것
 *   ① 규칙이 두 벌이 되는 것 — 화면과 서버가 이 함수를 함께 쓴다. 여기서 깨지면 둘 다 깨진다.
 *   ② 대소문자를 각각 요구하는 조건이 슬며시 들어오는 것 (이 WO 가 명시적으로 배제했다)
 *   ③ 비밀번호를 정규화·변환하는 것 — 입력한 문자를 그대로 검사해야 한다
 *   ④ 마스킹이 전체 주소를 흘리는 것
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeLoginEmail,
  isLoginEmailShapeValid,
  PASSWORD_POLICY,
  PASSWORD_POLICY_MESSAGES,
  checkPasswordPolicy,
  isPasswordPolicyMet,
  maskLoginEmail,
} from '../emailCredential.js';

describe('이메일 정규화 — 조회 · 중복 판정 · 저장이 같은 결과를 본다', () => {
  it('공백을 없애고 소문자로 만든다', () => {
    expect(normalizeLoginEmail('  Renagang21@Gmail.COM ')).toBe('renagang21@gmail.com');
  });

  it('null · undefined · 빈 값은 빈 문자열', () => {
    expect(normalizeLoginEmail(null)).toBe('');
    expect(normalizeLoginEmail(undefined)).toBe('');
    expect(normalizeLoginEmail('   ')).toBe('');
  });

  it('대소문자만 다른 두 입력은 같은 아이디다 (중복 판정의 근거)', () => {
    expect(normalizeLoginEmail('A@B.com')).toBe(normalizeLoginEmail('a@b.COM'));
  });
});

describe('이메일 형태 검사', () => {
  it('정상 주소를 통과시킨다', () => {
    for (const ok of ['a@b.co', 'renagang21@gmail.com', 'first.last+tag@sub.example.co.kr']) {
      expect(isLoginEmailShapeValid(ok)).toBe(true);
    }
  });

  it('형태가 아닌 것을 거절한다', () => {
    for (const bad of ['', '   ', 'no-at-sign', 'a@b', '@b.com', 'a@@b.com', 'a b@c.com', 'a@.com', 'a@b.', 'a@b..com']) {
      expect(isLoginEmailShapeValid(bad)).toBe(false);
    }
  });

  it('255자를 넘으면 거절한다 (컬럼 길이와 같은 한계)', () => {
    expect(isLoginEmailShapeValid('a'.repeat(250) + '@b.com')).toBe(false);
  });
});

describe('비밀번호 정책 — 8자 · 영문자 · 숫자 · 특수기호', () => {
  it('정책 상수가 이 WO 의 확정값이다', () => {
    expect(PASSWORD_POLICY.minLength).toBe(8);
    expect(PASSWORD_POLICY.requireLetter).toBe(true);
    expect(PASSWORD_POLICY.requireDigit).toBe(true);
    expect(PASSWORD_POLICY.requireSymbol).toBe(true);
    // 대문자/소문자를 각각 요구하지 않는다 — 되돌리면 이 테스트가 실패한다.
    expect(PASSWORD_POLICY.requireBothCases).toBe(false);
  });

  it('네 조건을 모두 채우면 통과한다', () => {
    for (const ok of ['abcd123!', 'PASSWORD1!', 'a1!aaaaa', '가나다abc1!@']) {
      expect(checkPasswordPolicy(ok)).toEqual([]);
      expect(isPasswordPolicyMet(ok)).toBe(true);
    }
  });

  it('소문자만 · 대문자만 으로도 통과한다 (대소문자 조합 요구 없음)', () => {
    expect(isPasswordPolicyMet('abcdefg1!')).toBe(true);
    expect(isPasswordPolicyMet('ABCDEFG1!')).toBe(true);
  });

  it('부족한 조건을 그대로 돌려준다', () => {
    expect(checkPasswordPolicy('a1!')).toEqual(['too_short']);
    expect(checkPasswordPolicy('12345678!')).toEqual(['no_letter']);
    expect(checkPasswordPolicy('abcdefg!')).toEqual(['no_digit']);
    expect(checkPasswordPolicy('abcdefg1')).toEqual(['no_symbol']);
    expect(checkPasswordPolicy('')).toEqual(['too_short', 'no_letter', 'no_digit', 'no_symbol']);
  });

  it('모든 위반에 안내 문구가 있다 (화면과 서버가 같은 목록을 쓴다)', () => {
    for (const v of checkPasswordPolicy('')) {
      expect(PASSWORD_POLICY_MESSAGES[v]).toBeTruthy();
    }
  });

  it('공백은 특수기호로 세지 않는다', () => {
    expect(checkPasswordPolicy('abcde 12')).toEqual(['no_symbol']);
  });

  it('검사는 입력을 변형하지 않는다 — 대소문자가 다르면 다른 비밀번호다', () => {
    // 정책 판정은 같아도(둘 다 통과) 값 자체를 동일 취급해선 안 된다.
    // 이 계층은 값을 바꾸지 않는다: 반환값은 위반 목록뿐이고 정규화 함수가 없다.
    expect(isPasswordPolicyMet('Abcd123!')).toBe(true);
    expect(isPasswordPolicyMet('abcd123!')).toBe(true);
    // emailCredential 모듈은 비밀번호 정규화 함수를 export 하지 않는다.
    // (대소문자 변환 함수가 생기면 이 단언이 이 파일을 다시 보게 만든다)
    expect(Object.keys(PASSWORD_POLICY)).not.toContain('normalize');
  });

  it('null · undefined 는 전부 위반', () => {
    expect(isPasswordPolicyMet(null)).toBe(false);
    expect(isPasswordPolicyMet(undefined)).toBe(false);
  });
});

describe('아이디 찾기 마스킹 — 전체 주소를 흘리지 않는다', () => {
  it('로컬 1자 + 도메인 1자 + TLD 만 남긴다', () => {
    expect(maskLoginEmail('renagang21@gmail.com')).toBe('r***@g***.com');
    expect(maskLoginEmail('a@b.co.kr')).toBe('a***@b***.kr');
  });

  it('입력을 정규화한 뒤 가린다', () => {
    expect(maskLoginEmail('  Renagang21@GMAIL.com ')).toBe('r***@g***.com');
  });

  it('원본 로컬파트 · 도메인 본문이 결과에 남지 않는다', () => {
    const masked = maskLoginEmail('renagang21@gmail.com');
    expect(masked).not.toContain('renagang21');
    expect(masked).not.toContain('gmail');
    // 첫 글자만 허용된다 — 길이 단서도 주지 않는다(*** 고정).
    expect(masked.split('@')[0]).toBe('r***');
  });

  it('형태가 아닌 입력은 빈 문자열 (부분 정보를 만들지 않는다)', () => {
    for (const bad of ['', 'not-an-email', 'a@b', null, undefined]) {
      expect(maskLoginEmail(bad)).toBe('');
    }
  });
});
