import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EventOfferManagePage } from '../EventOfferManagePage';
import { SupplierEventOfferPage } from '../../../supplier/SupplierEventOfferPage';

const mocks = vi.hoisted(() => ({ products:vi.fn(), pending:vi.fn(), available:vi.fn(), add:vi.fn(), offers:vi.fn(), proposals:vi.fn(), propose:vi.fn(), error:vi.fn(), success:vi.fn() }));
vi.mock('../../../../api/eventOfferAdmin', () => ({ eventOfferAdminApi:{getProducts:mocks.products,getPendingListings:mocks.pending,getAvailableOffers:mocks.available,addProduct:mocks.add} }));
vi.mock('../../../../api/supplierEventOffer', () => ({ supplierEventOfferApi:{getMyOffers:mocks.offers,getMyProposals:mocks.proposals,propose:mocks.propose} }));
vi.mock('@o4o/error-handling', () => ({toast:{error:mocks.error,success:mocks.success}}));
vi.mock('@o4o/ui', () => ({ConfirmActionDialog:()=>null}));
const offer={id:'offer-fixture',title:'검증 제품',supplierName:'Fixture supplier',price:0};
beforeEach(() => {
 vi.resetAllMocks();mocks.products.mockResolvedValue({data:[]});mocks.pending.mockResolvedValue({data:[]});mocks.available.mockResolvedValue({data:{offers:[offer]}});
 mocks.offers.mockResolvedValue({data:{offers:[offer]}});mocks.proposals.mockResolvedValue({data:[]});
 mocks.add.mockResolvedValue({data:{...offer,conditionSummary:'이벤트 단가: 1000원',orderCount:0,participantCount:0,isVisible:true,status:'approved'}});
 mocks.propose.mockResolvedValue({data:{...offer,offerId:offer.id,status:'pending',isActive:false,proposedAt:'2030-01-01T00:00:00Z'}});
});
afterEach(cleanup);
function fillTerms(end='2030-01-02T09:00') {
 fireEvent.change(screen.getByLabelText('이벤트 가격 (원)'),{target:{value:'1000'}});
 fireEvent.change(screen.getByLabelText('시작 일시 (현지 시각)'),{target:{value:'2030-01-01T09:00'}});
 fireEvent.change(screen.getByLabelText('종료 일시 (현지 시각)'),{target:{value:end}});
}
describe('KPA existing event producers carry explicit price and period', () => {
 it('operator cannot create an unbounded event and sends entered terms after validation',async()=>{
  render(<EventOfferManagePage />);fireEvent.click(await screen.findByRole('button',{name:'이벤트 추가'}));
  const option=await screen.findByRole('option',{name:/검증 제품/});fireEvent.change(option.closest('select')!,{target:{value:offer.id}});
  const submit=screen.getByRole('button',{name:'등록하기'});fireEvent.submit(submit.closest('form')!);
  expect(mocks.add).not.toHaveBeenCalled();
  fillTerms('2029-12-31T09:00');fireEvent.submit(submit.closest('form')!);expect(mocks.add).not.toHaveBeenCalled();
  fillTerms();fireEvent.submit(submit.closest('form')!);
  await waitFor(()=>expect(mocks.add).toHaveBeenCalledTimes(1));
  expect(mocks.add.mock.calls[0][0]).toMatchObject({offerId:offer.id,eventPrice:1000});
  expect(new Date(mocks.add.mock.calls[0][0].startAt)<new Date(mocks.add.mock.calls[0][0].endAt)).toBe(true);
 });
 it('supplier selects the approved product, enters terms, and retains them after failure',async()=>{
  mocks.propose.mockRejectedValueOnce(new Error('fixture failure'));
  render(<SupplierEventOfferPage />);fireEvent.click(await screen.findByRole('button',{name:'이벤트 제안'}));
  fireEvent.click(screen.getByRole('button',{name:'가격·기간으로 제안 제출'}));expect(mocks.propose).not.toHaveBeenCalled();
  fillTerms();fireEvent.click(screen.getByRole('button',{name:'가격·기간으로 제안 제출'}));
  await waitFor(()=>expect(mocks.error).toHaveBeenLastCalledWith(expect.stringContaining('제안에 실패')));
  expect((screen.getByLabelText('이벤트 가격 (원)') as HTMLInputElement).value).toBe('1000');
  fireEvent.click(screen.getByRole('button',{name:'가격·기간으로 제안 제출'}));
  await waitFor(()=>expect(mocks.propose).toHaveBeenCalledTimes(2));
  expect(mocks.propose.mock.calls[1][0]).toBe(offer.id);expect(mocks.propose.mock.calls[1][1].eventPrice).toBe(1000);
 });
});
