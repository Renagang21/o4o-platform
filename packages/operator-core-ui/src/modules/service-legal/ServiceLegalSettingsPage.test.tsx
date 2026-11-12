import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ServiceLegalSettingsPage } from './ServiceLegalSettingsPage';
import { recommendedPolicySlug, type ServiceLegalApi } from './types';

afterEach(cleanup);

function fakeApi(): ServiceLegalApi {
  return {
    getLegalProfile: vi.fn().mockResolvedValue(null),
    updateLegalProfile: vi.fn(),
    listPolicies: vi.fn().mockResolvedValue([]),
    createPolicy: vi.fn().mockResolvedValue({}),
    updatePolicy: vi.fn().mockResolvedValue({}),
    publishPolicy: vi.fn(),
    changePolicyLifecycle: vi.fn(),
  };
}

it('권장 표식은 서버 규칙과 같다 (계정 약관 · 서비스 신청 약관 · 그 밖은 없음)', () => {
  expect(recommendedPolicySlug('neture', 'terms')).toBe('neture-account-terms');
  expect(recommendedPolicySlug('neture', 'privacy')).toBe('neture-account-privacy');
  for (const key of ['supplier', 'community', 'funding', 'lecture', 'partner-support', 'kpa-society']) {
    expect(recommendedPolicySlug(key, 'terms')).toBe(`${key}-service-terms`);
    expect(recommendedPolicySlug(key, 'privacy')).toBe(`${key}-service-privacy`);
  }
  expect(recommendedPolicySlug('neture', 'refund')).toBeNull();
  expect(recommendedPolicySlug('k-cosmetics', 'terms')).toBeNull();
});

it('새 문서 폼은 권장 표식을 채우고, 문서 유형을 바꾸면 따라 바뀌며, 저장 payload 에 표식을 넣는다', async () => {
  const api = fakeApi();
  render(<ServiceLegalSettingsPage serviceKey="neture" api={api} enabledTabs={['policies']} />);
  await waitFor(() => expect(api.listPolicies).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: '새 문서' }));
  const slug = screen.getByLabelText('표식(slug)') as HTMLInputElement;
  expect(slug.value).toBe('neture-account-terms');
  fireEvent.change(screen.getByDisplayValue('이용약관'), { target: { value: 'privacy' } });
  expect(slug.value).toBe('neture-account-privacy');
  fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
  await waitFor(() => expect(api.createPolicy).toHaveBeenCalledTimes(1));
  expect((api.createPolicy as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({ documentType: 'privacy', slug: 'neture-account-privacy' });
});

it('사용자가 표식을 직접 고치면 문서 유형을 바꿔도 덮어쓰지 않는다', async () => {
  const api = fakeApi();
  render(<ServiceLegalSettingsPage serviceKey="supplier" api={api} enabledTabs={['policies']} />);
  await waitFor(() => expect(api.listPolicies).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: '새 문서' }));
  const slug = screen.getByLabelText('표식(slug)') as HTMLInputElement;
  expect(slug.value).toBe('supplier-service-terms');
  fireEvent.change(slug, { target: { value: 'supplier-custom-guide' } });
  fireEvent.change(screen.getByDisplayValue('이용약관'), { target: { value: 'privacy' } });
  expect(slug.value).toBe('supplier-custom-guide');
});

it('slugInput=false(서버가 표식을 정하는 화면)이면 표식 입력이 없고 payload 표식도 비운다', async () => {
  const api = fakeApi();
  render(<ServiceLegalSettingsPage serviceKey="합성 사업" api={api} enabledTabs={['policies']} slugInput={false} />);
  await waitFor(() => expect(api.listPolicies).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: '새 문서' }));
  expect(screen.queryByLabelText('표식(slug)')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
  await waitFor(() => expect(api.createPolicy).toHaveBeenCalledTimes(1));
  expect((api.createPolicy as ReturnType<typeof vi.fn>).mock.calls[0][1].slug ?? null).toBeNull();
});
