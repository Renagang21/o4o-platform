import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
