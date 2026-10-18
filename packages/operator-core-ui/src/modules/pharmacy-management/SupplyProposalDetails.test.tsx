import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SupplyProposalTermsSummary, SupplyProposalHistory, SupplyProposalDetails } from './SupplyProposalDetails';
import type { SupplyProposal } from './api';
afterEach(cleanup);
describe('proposal review terms and history',()=>{
  it('shows fixed fee, free-shipping threshold and minimum for review',()=>{
    render(<SupplyProposalTermsSummary terms={{version:1,baseShippingFee:2000,freeShippingThreshold:50000,minOrderAmount:10000}} />);
    expect(screen.getByText('배송비 2,000원')).toBeTruthy();
    expect(screen.getByText('50,000원 이상 무료배송')).toBeTruthy();
    expect(screen.getByText(/최소 주문 10,000원/)).toBeTruthy();
  });
  it('distinguishes legacy terms and explicit absence of a free-shipping threshold',()=>{
    const view=render(<SupplyProposalTermsSummary />);expect(screen.getByText(/기존 제안/)).toBeTruthy();
    view.rerender(<SupplyProposalTermsSummary terms={{version:1,baseShippingFee:0,freeShippingThreshold:null,minOrderAmount:0}} />);
    expect(screen.getByText('무료배송 기준 없음')).toBeTruthy();expect(screen.queryByText(/기존 제안/)).toBeNull();
  });
  it('does not mislabel an old termination record as a preserved first approval',()=>{
    render(<SupplyProposalHistory proposal={{decidedAt:'2026-10-17T01:00:00Z',endedAt:'2026-10-17T01:00:00Z',endedBy:null,termsSnapshot:null} as SupplyProposal} />);
    expect(screen.getByText(/이전 처리 기록 \(승인·종료 구분 불가\)/)).toBeTruthy();
    expect(screen.getByText(/종료: 기록 없음/)).toBeTruthy();
  });
  it('shows original reviewer separately from termination actor and reason',()=>{
    render(<SupplyProposalHistory proposal={{decidedAt:'2026-10-17T01:00:00Z',decidedByName:'Fixture Reviewer',endedAt:'2026-10-17T02:00:00Z',endedBy:'closer-id',endedByName:'Fixture Closer',endReason:'Fixture end reason'} as SupplyProposal} />);
    expect(screen.getByText(/승인·반려 결정: Fixture Reviewer/)).toBeTruthy();expect(screen.getByText(/종료: Fixture Closer/)).toBeTruthy();expect(screen.getByText('종료 사유: Fixture end reason')).toBeTruthy();
  });
});

it('shows B2B product information and current supplier shipping conditions without presenting them as approved snapshots', () => {
  render(<SupplyProposalDetails proposal={{ productSpecification: '30개입', productManufacturer: '가상 제조사', productBarcode: 'SYNTHETIC', productSummary: '약국 취급 안내', productDescription: '<p>공급 제품 상세</p>', baseShippingFee: 3000, freeShippingThreshold: 50000 } as SupplyProposal} />);
  expect(screen.getByText('30개입')).toBeTruthy(); expect(screen.getByText('가상 제조사')).toBeTruthy();
  expect(screen.getByText('공급 제품 상세')).toBeTruthy(); expect(screen.getByText(/50,000/)).toBeTruthy();
  expect(screen.getByText(/현재 공급자 공통 정책/)).toBeTruthy();
});
it('does not turn missing prices into free shipping and distinguishes an explicit zero fee', () => {
  const ui = render(<SupplyProposalDetails proposal={{} as SupplyProposal} />);
  expect(screen.getByText('미설정')).toBeTruthy();
  ui.rerender(<SupplyProposalDetails proposal={{ baseShippingFee: 0, freeShippingThreshold: null } as SupplyProposal} />);
  expect(screen.getByText(/0/)).toBeTruthy(); expect(screen.getByText('기준 없음')).toBeTruthy(); expect(screen.queryByText('미설정')).toBeNull();
});

it.each([
  { threshold: null, label: '기준 없음' },
  { threshold: 0, label: '0원 이상 (항상 무료)' },
  { threshold: 50000, label: '50,000원 이상' },
])('matches checkout shipping semantics for threshold $threshold', ({ threshold, label }) => {
  const policy = { baseShippingFee: 3000, freeShippingThreshold: threshold };
  render(<SupplyProposalDetails proposal={policy as SupplyProposal} />);
  expect(screen.getByText(label)).toBeTruthy();
});

it('shows fixed proposal terms instead of the current common policy', () => {
  render(<SupplyProposalDetails proposal={{baseShippingFee:9999,termsSnapshot:{version:1,baseShippingFee:2000,freeShippingThreshold:null,minOrderAmount:10000}} as SupplyProposal} />);
  expect(screen.getByText('배송비 2,000원')).toBeTruthy();
  expect(screen.queryByText(/현재 공급자 공통 정책/)).toBeNull();
  expect(screen.queryByText(/9,999/)).toBeNull();
});
