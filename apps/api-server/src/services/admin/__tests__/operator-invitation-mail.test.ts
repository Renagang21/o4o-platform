import { JSDOM } from 'jsdom';
import { buildOperatorInvitationMail, invitationScopeLabel } from '../operator-invitation-mail.js';

const url = `https://neture.example.test/operator-invite#token=${'a'.repeat(64)}`;

it('gives Partner recipients a readable role and separate login, signup, and acceptance instructions', () => {
  const mail = buildOperatorInvitationMail(url, 'partner-support:admin', false);
  expect(mail.subject).toContain('파트너 관리자 초대');
  expect(mail.text).not.toContain('partner-support:admin');
  expect(mail.text).toContain('기존 회원은 초대받은 계정으로 로그인');
  expect(mail.text).toContain('이 메일을 받은 이메일 주소로 가입');
  expect(mail.text).toContain('가입 확인 메일의 이메일 인증');
  expect(mail.text).toContain('이 계정으로 확인·수락');
  expect(mail.text).toContain('가입이나 이메일 인증만으로 초대 수락이 완료되지는 않습니다');
  expect(mail.text).toContain('이 메일의 버튼을 다시');
});

it('preserves the fragment link in both the HTML button and text fallback', () => {
  const mail = buildOperatorInvitationMail(url, 'lecture:operator', false);
  const document = new JSDOM(mail.html).window.document;
  const button = [...document.querySelectorAll('a')].find(a => a.textContent === '운영자 초대 확인');
  expect(button?.getAttribute('href')).toBe(url);
  expect(document.querySelectorAll('a')).toHaveLength(2);
  expect(mail.text).toContain(url);
  expect(mail.text).toContain('처음 발급한 날부터 7일');
  expect(mail.text).toContain('재발송해도 만료일은 연장되지 않습니다');
  expect(mail.text).toContain('가장 최근 메일의 링크');
  expect(mail.text).toContain('생성 후 달력 1년');
});

it('keeps a service-business invitation distinct from the shared Neture account service', () => {
  expect(invitationScopeLabel('neture:carepharm_admin', 'neture')).toBe('CarePharm · 만성질환관리');
  expect(invitationScopeLabel('partner-support:admin', 'partner-support')).toBe('파트너');
  expect(buildOperatorInvitationMail(url, 'cooperative:operator', false).subject).toContain('조합 운영자 초대');
  expect(buildOperatorInvitationMail(url, 'lecture:operator', true).subject).toContain('지정 확인');
});

it('escapes the fallback link and its attribute without injecting markup', () => {
  const mail = buildOperatorInvitationMail(`${url}&x=" onmouseover="alert(1)"><script>alert(1)</script>`, 'partner-support:admin', false);
  const document = new JSDOM(mail.html).window.document;
  expect(document.querySelector('script')).toBeNull();
  expect(document.querySelector('[onmouseover]')).toBeNull();
  expect(document.querySelectorAll('a')).toHaveLength(2);
});


it('names a single admin-site daily Operator invitation without presenting it as a service Admin grant',()=>{
  const mail=buildOperatorInvitationMail(url,'neture:operator',false,true,true);
  expect(mail.subject).toContain('관리자 사이트 업무 운영자 초대');
  expect(mail.text).toContain('전체 관리자나 서비스 Admin으로 지정되는 초대가 아닙니다.');
  expect(mail.text).toContain('https://admin.neture.co.kr/operations');
  expect(mail.text).not.toContain('neture:operator');
});
