import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ServiceDiscovery from '../home/ServiceDiscovery';
import PartnerServicePage from '../../pages/PartnerServicePage';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); this.querySelector('button')?.focus(); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});
afterEach(cleanup);
describe('준비 중 서비스 안내', () => {
  for (const name of ['만성질환관리', '약국/약사협동조합', '창고형 약국']) {
    it(`${name}: 안내만 열고 닫은 뒤 카드로 초점을 복원한다`, () => {
      render(<MemoryRouter><ServiceDiscovery /></MemoryRouter>);
      const trigger = screen.getByRole('button', { name: `${name} 준비 중 · 안내 보기` });
      trigger.focus(); fireEvent.click(trigger);
      const dialog = screen.getByRole('dialog', { name });
      expect(dialog.textContent).toContain('준비 중입니다.');
      const close = screen.getByRole('button', { name: '닫기' });
      expect(document.activeElement).toBe(close);
      fireEvent.click(close);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
      fireEvent.click(trigger);
      expect(screen.getByRole('dialog', { name })).toBeTruthy();
    });
  }
  it('Partner는 가입 기능 없이 상태·홈 복귀·문의 경로를 제공한다', () => {
    render(<MemoryRouter><PartnerServicePage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'O4O Partner' })).toBeTruthy();
    expect(screen.getByText('준비 중')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'O4O 메인으로' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: 'Contact Us' }).getAttribute('href')).toBe('/contact');
    expect(screen.queryByRole('button', { name: /가입/ })).toBeNull();
  });
});

it('병원 별도 앱은 SPA catch-all 대신 문서 탐색 링크로 연다', () => {
  render(<MemoryRouter><Routes><Route path="/" element={<ServiceDiscovery />} /><Route path="/hospital" element={<h1>잘못된 SPA 경로</h1>} /></Routes></MemoryRouter>);
  const hospital = screen.getByRole('link', { name: /병원·약품 파일 도구/ });
  expect(hospital.getAttribute('href')).toBe('/hospital');
  // Cancel jsdom document navigation after the router would have intercepted it.
  document.addEventListener('click', event => event.preventDefault(), { once: true });
  fireEvent.click(hospital);
  expect(screen.queryByRole('heading', { name: '잘못된 SPA 경로' })).toBeNull();
  expect(screen.getByRole('heading', { name: '전체 서비스' })).toBeTruthy();
});
