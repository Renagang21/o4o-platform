import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SupplyProposalDetails } from './SupplyProposalDetails';
import type { SupplyProposal } from './api';
afterEach(cleanup);
it('shows B2B product information and current supplier shipping conditions without presenting them as approved snapshots', () => {
  render(<SupplyProposalDetails proposal={{ productSpecification: '30개입', productManufacturer: '가상 제조사', productBarcode: 'SYNTHETIC', productSummary: '약국 취급 안내', productDescription: '<p>공급 제품 상세</p>', baseShippingFee: 3000, freeShippingThreshold: 50000 } as SupplyProposal} />);
  expect(screen.getByText('30개입')).toBeTruthy(); expect(screen.getByText('가상 제조사')).toBeTruthy();
  expect(screen.getByText('공급 제품 상세')).toBeTruthy(); expect(screen.getByText(/50,000/)).toBeTruthy();
  expect(screen.getByText(/현재 공급자 공통 정책/)).toBeTruthy();
});
it('does not turn missing prices into free shipping and distinguishes an explicit zero fee', () => {
  const ui = render(<SupplyProposalDetails proposal={{} as SupplyProposal} />);
  expect(screen.getByText('미설정')).toBeTruthy();
  ui.rerender(<SupplyProposalDetails proposal={{ baseShippingFee: 0, freeShippingThreshold: 0 } as SupplyProposal} />);
  expect(screen.getByText(/0/)).toBeTruthy(); expect(screen.getByText('기준 없음')).toBeTruthy(); expect(screen.queryByText('미설정')).toBeNull();
});
