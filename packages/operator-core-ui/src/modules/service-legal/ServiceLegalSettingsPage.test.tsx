import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ServiceLegalSettingsPage } from './ServiceLegalSettingsPage';
import type { ServiceLegalApi } from './types';

afterEach(cleanup);
it.each([undefined, 2])('creates drafts with the configured starting version (%s)', async version => {
  const createPolicy = vi.fn().mockResolvedValue({});
  const api = { getLegalProfile: vi.fn().mockResolvedValue(null), listPolicies: vi.fn().mockResolvedValue([]), createPolicy } as unknown as ServiceLegalApi;
  render(<ServiceLegalSettingsPage serviceKey="synthetic" api={api} enabledTabs={['policies']} newPolicyVersion={version} />);
  await screen.findByText('등록된 정책 문서가 없습니다.');
  fireEvent.click(screen.getByRole('button', { name: '새 문서' }));
  fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
  await waitFor(() => expect(createPolicy).toHaveBeenCalledWith('synthetic', expect.objectContaining({ version: version ?? 1, documentType: 'terms' })));
});
