import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SupplyProposalTermsSummary, SupplyProposalHistory } from './SupplyProposalDetails';
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
