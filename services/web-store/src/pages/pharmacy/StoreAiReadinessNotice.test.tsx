import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StoreAiReadinessNotice } from './StoreAiReadinessNotice';

const read = vi.hoisted(() => vi.fn());
vi.mock('../../api/storeProductAi', () => ({ getStoreAiReadiness: read }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const base = { organizationId: 'store', purpose: 'B2B', language: 'ko', listingCount: 2, masterCount: 1, localCount: 0,
  states: { structured: 1, unclassified: 0, legacy: 0, missing: 0 } };
it.each([{}, { resourcePurpose: 'CONSULTATION' }])('labels consultation knowledge correctly across old/new API deployment %j', async metadata => {
  read.mockResolvedValue({ ...base, ...metadata });
  render(<StoreAiReadinessNotice organizationId="store" language="ko" />);
  await screen.findByText(/공통 상품 상담자료/);
  expect(screen.queryByText(/공통 B2B 자료/)).toBeNull();
});
it.each([{ organizationId: 'other' }, { language: 'en' }, { resourcePurpose: 'STORE' }])('rejects mismatched context instead of showing a false coverage figure %j', async mismatch => {
  read.mockResolvedValue({ ...base, ...mismatch });
  render(<StoreAiReadinessNotice organizationId="store" language="ko" />);
  await screen.findByText(/자료 현황을 조회하지 못했습니다/);
  expect(screen.queryByText(/구조화 근거 준비 1종/)).toBeNull();
});
