import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SupplierSupplyProposalsPage from '../SupplierSupplyProposalsPage';
const mocks = vi.hoisted(() => ({ listProposals:vi.fn(),createProposal:vi.fn(),endProposal:vi.fn() }));
vi.mock('../../../lib/api/neturePharmacy', async (original) => ({
  ...await original<typeof import('../../../lib/api/neturePharmacy')>(),neturePharmacySupplierApi:mocks,
}));
vi.mock('../../../components/neture-pharmacy/useSupplierPharmacyOptions', () => {
  const options = {products:[{id:'offer-a',name:'제품 A'}],semiFranchises:[{key:'a',name:'협업체 A'}],loading:false,error:null};
  return { productLabel: () => '제품 A', useSupplierPharmacyOptions: () => options };
});
const row = (id:string) => ({id,productName:`접수 ${id}`,offerId:'offer-a',semiFranchiseKey:'a',semiFranchiseName:'협업체 A',unitPrice:1000,status:'pending',createdAt:'2026-10-17T00:00:00Z'});
function deferred<T>() {let resolve!: (value:T) => void; let reject!: (error:Error) => void; const promise = new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function mount() {render(<MemoryRouter initialEntries={['/supplier/supply-proposals?offer=offer-a']}><SupplierSupplyProposalsPage /></MemoryRouter>);}
async function create() {
  await waitFor(()=>expect((screen.getByLabelText('제품') as HTMLSelectElement).value).toBe('offer-a'));
  fireEvent.change(screen.getByLabelText('공통 공급 가격 (원)'),{target:{value:'1000'}});
  fireEvent.click(screen.getByLabelText('협업체 A'));
  fireEvent.click(screen.getByRole('button',{name:'협업체별 초안 만들기'}));
  fireEvent.click(screen.getByRole('button',{name:'협업체 A 승인 요청'}));
}
beforeEach(()=>{vi.resetAllMocks();mocks.createProposal.mockResolvedValue({id:'new',status:'pending'});});
afterEach(cleanup);
describe('latest proposal list response wins',()=>{
  it('keeps the new proposal when an older initial request finishes last',async()=>{
    const old=deferred<unknown[]>();
    mocks.listProposals.mockReturnValueOnce(old.promise).mockResolvedValue([row('new')]);
    mount();await create();await screen.findByText('접수 new');
    await act(async()=>{old.resolve([]);});
    await waitFor(()=>expect(mocks.listProposals).toHaveBeenCalledTimes(2));
    expect(screen.getByText('접수 new')).toBeTruthy();
  });
  it('ignores an outdated load error after a successful refresh',async()=>{
    const old=deferred<unknown[]>();
    mocks.listProposals.mockReturnValueOnce(old.promise).mockResolvedValue([row('new')]);
    mount();await create();await screen.findByText('접수 new');
    await act(async()=>{old.reject(new Error('과거 조회 오류'));});
    await waitFor(()=>expect(mocks.listProposals).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('과거 조회 오류')).toBeNull();
    expect(screen.getByText('접수 new')).toBeTruthy();
  });
});
