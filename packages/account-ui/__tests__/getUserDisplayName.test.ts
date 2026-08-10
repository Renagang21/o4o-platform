/**
 * getUserDisplayName — 표시명 fallback 체인 단위 테스트
 *
 * WO-O4O-SERVICE-USER-DISPLAY-NAME-COMMONIZATION-G1-V1
 *
 * KPA · Neture · GlycoPharm · K-Cosmetics 4개 서비스의 Global Header 가
 * 각자 복제해 두었던 동일 로직을 이 함수 하나로 통합했다. 이 테스트는
 * **통합 이전의 표시 결과를 계약으로 고정**한다 — 우선순위나 fallback 문구를
 * 바꾸려면 4개 서비스 헤더 표시가 동시에 바뀐다는 뜻이므로 별도 WO 가 필요하다.
 */

import { getUserDisplayName } from '../src/utils/getUserDisplayName.js';

describe('getUserDisplayName', () => {
  describe('우선순위 1 — displayName', () => {
    it('displayName 이 있으면 다른 필드보다 우선한다', () => {
      expect(
        getUserDisplayName({
          displayName: 'D',
          lastName: 'L',
          firstName: 'F',
          name: 'N',
          email: 'e@x.com',
        }),
      ).toBe('D');
    });

    it('공백만 있는 displayName 도 그대로 반환한다 (기존 계약 — trim 하지 않는다)', () => {
      expect(getUserDisplayName({ displayName: '   ', name: '이름', email: 'e@x.com' })).toBe('   ');
    });

    it('빈 문자열 displayName 은 건너뛴다', () => {
      expect(getUserDisplayName({ displayName: '', name: '이름', email: 'e@x.com' })).toBe('이름');
    });
  });

  describe('우선순위 2 — lastName + firstName', () => {
    it('둘 다 있으면 구분자 없이 이어붙인다', () => {
      expect(getUserDisplayName({ lastName: '김', firstName: '약사', name: 'gp', email: 'gp@x.com' })).toBe(
        '김약사',
      );
    });

    it('lastName 만 있어도 사용한다', () => {
      expect(getUserDisplayName({ lastName: '홍', email: 'e@x.com' })).toBe('홍');
    });

    it('firstName 만 있어도 사용한다', () => {
      expect(getUserDisplayName({ firstName: '길동', email: 'e@x.com' })).toBe('길동');
    });

    it('공백만 있으면 다음 단계로 넘어간다 (trim 후 빈 문자열)', () => {
      expect(getUserDisplayName({ lastName: '  ', firstName: ' ', name: '이름', email: 'e@x.com' })).toBe(
        '이름',
      );
    });
  });

  describe('우선순위 3 — name (email 과 다를 때만)', () => {
    it('name 이 email 과 다르면 사용한다', () => {
      expect(getUserDisplayName({ name: '서상원', email: 'sohae2100@gmail.com' })).toBe('서상원');
    });

    it('name 이 email 과 같으면 건너뛴다 (email prefix 로)', () => {
      expect(getUserDisplayName({ name: 'abc@x.com', email: 'abc@x.com' })).toBe('abc');
    });

    it('빈 문자열 name 은 건너뛴다', () => {
      expect(getUserDisplayName({ name: '', email: 'abc@x.com' })).toBe('abc');
    });
  });

  describe('우선순위 4 — email prefix', () => {
    it('email 만 있으면 @ 앞부분을 쓴다', () => {
      expect(getUserDisplayName({ email: 'only@x.com' })).toBe('only');
    });
  });

  describe('최종 fallback — 사용자', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['빈 객체', {}],
      ['모든 필드 null', { displayName: null, lastName: null, firstName: null, name: null, email: null }],
      ['빈 문자열만', { name: '', email: '' }],
    ])('%s → 사용자', (_label, input) => {
      expect(getUserDisplayName(input as never)).toBe('사용자');
    });
  });

  describe('서비스별 대표 입력 — 공통화 전후 동일 (회귀 고정)', () => {
    it.each([
      ['KPA (name + email)', { id: '1', email: 'sohae2100@gmail.com', name: '서상원' }, '서상원'],
      ['K-Cosmetics (name === email)', { email: 'ops@k-cosmetics.site', name: 'ops@k-cosmetics.site' }, 'ops'],
      ['GlycoPharm (lastName + firstName)', { email: 'gp@glycopharm.co.kr', name: 'gp', lastName: '김', firstName: '약사' }, '김약사'],
      ['Neture (displayName)', { email: 'n@neture.co.kr', name: 'n', displayName: '네처운영자' }, '네처운영자'],
    ])('%s → %s', (_label, input, expected) => {
      expect(getUserDisplayName(input as never)).toBe(expected);
    });
  });
});
