import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import SupplierProductPublicationPage from '../SupplierProductPublicationPage';
import SupplierProductFromMasterPage from '../SupplierProductFromMasterPage';

const mocks = vi.hoisted(() => ({ getProducts: vi.fn(), getServicePrices: vi.fn(), updateDistribution: vi.fn(), createOfferFromMaster: vi.fn(), getMasterById: vi.fn() }));
vi.mock('../../../lib/api', () => ({ supplierApi: mocks, productApi: { getMasterById: mocks.getMasterById } }));
vi.mock('../../../components/supplier/SupplierActivationGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@o4o/shared-space-ui', () => ({ GuideBlock: () => null }));
const approved = { id: 'product-a', masterId: 'master-a', name: '승인 제품', approvalStatus: 'APPROVED', isActive: true, isPublic: false, defaultSupplyEnabled: false, priceGeneral: 0, serviceKeys: [] };
function Harness() { const navigate = useNavigate(); return <><button onClick={() => navigate('/supplier/products/publication?offer=missing')}>잘못된 대상</button><SupplierProductPublicationPage /></>; }
function mount(path = '/supplier/products/publication?offer=product-a') { return render(<MemoryRouter initialEntries={[path]}><Harness /></MemoryRouter>); }
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getProducts.mockResolvedValue([approved, { ...approved, id:'product-b', name:'검토 제품', approvalStatus:'PENDING' }]);
  mocks.getServicePrices.mockResolvedValue({ success: true, data: { priceGeneral:0, prices:[] } });
  mocks.updateDistribution.mockResolvedValue({ success:true, data: {} });
});
afterEach(cleanup);

describe('registration and publication are independent supplier jobs', () => {
  it('does not publish an approved product merely by opening it', async () => {
    mount(); await screen.findByText('일반 공급 게시');
    await waitFor(() => expect(screen.getByRole('button', { name:'게시 설정 저장' }).closest('fieldset')?.disabled).toBe(false));
    expect((screen.getByLabelText(/Neture 약국 기본 공급/) as HTMLInputElement).checked).toBe(false);
    expect(mocks.updateDistribution).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name:'이 제품으로 이벤트·특가' }).getAttribute('href')).toContain('offer=product-a');
  });
  it('only sends publication targets and prices after an explicit save', async () => {
    mount(); await waitFor(() => expect(screen.getByRole('button',{name:'게시 설정 저장'}).closest('fieldset')?.disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('기본 B2B 공급가 (원)'), { target:{ value:'1000' } });
    fireEvent.click(screen.getByLabelText(/Neture 약국 기본 공급/));
    fireEvent.click(screen.getByLabelText('KPA Society'));
    fireEvent.change(screen.getByLabelText(/KPA 서비스 공급가/), { target:{value:'900'} });
    fireEvent.click(screen.getByRole('button',{name:'게시 설정 저장'}));
    await screen.findByRole('status');
    expect(mocks.updateDistribution).toHaveBeenCalledExactlyOnceWith('product-a',{ defaultSupplyEnabled:true, isPublic:false, serviceKeys:['kpa-society'],priceGeneral:1000,servicePrices:[{ serviceKey:'kpa-society',unitPrice:900 }] });
  });
  it('retains inputs after a failed save and permits retry', async () => {
    mocks.updateDistribution.mockResolvedValueOnce({success:false,error:'INTERNAL_ERROR'});
    mount(); await waitFor(() => expect(screen.getByRole('button',{name:'게시 설정 저장'}).closest('fieldset')?.disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('기본 B2B 공급가 (원)'),{target:{value:'1000'}});
    fireEvent.click(screen.getByLabelText(/Neture 약국 기본 공급/));
    fireEvent.click(screen.getByRole('button',{name:'게시 설정 저장'}));
    await screen.findByRole('alert');
    expect((screen.getByLabelText('기본 B2B 공급가 (원)') as HTMLInputElement).value).toBe('1000');
    fireEvent.click(screen.getByRole('button',{name:'게시 설정 저장'}));
    await waitFor(() => expect(mocks.updateDistribution).toHaveBeenCalledTimes(2));
  });
  it('blocks unapproved products and invalid URL targets without keeping the previous editor', async () => {
    mount('/supplier/products/publication?offer=product-b');
    await screen.findByText(/운영자의 제품 등록 승인 후 게시할 수 있습니다/);
    expect(screen.queryByRole('button',{name:'게시 설정 저장'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'잘못된 대상'}));
    await screen.findByText(/요청한 제품을 찾을 수 없습니다/);
    expect(screen.queryByText('일반 공급 게시')).toBeNull();
    expect(mocks.updateDistribution).not.toHaveBeenCalled();
  });
  it('allows saving a publication withdrawal without deleting the retained service price', async () => {
    mocks.getProducts.mockResolvedValue([{ ...approved, priceGeneral:1000, serviceKeys:['kpa-society'] }]);
    mocks.getServicePrices.mockResolvedValue({success:true,data:{priceGeneral:1000,prices:[{serviceKey:'kpa-society',unitPrice:900}]}});
    mount(); await waitFor(() => expect(screen.getByRole('button',{name:'게시 설정 저장'}).closest('fieldset')?.disabled).toBe(false));
    fireEvent.click(screen.getByLabelText('KPA Society'));
    fireEvent.click(screen.getByRole('button',{name:'게시 설정 저장'}));
    await waitFor(() => expect(mocks.updateDistribution).toHaveBeenCalled());
    expect(mocks.updateDistribution.mock.calls[0][1]).toMatchObject({serviceKeys:[],servicePrices:[{serviceKey:'kpa-society',unitPrice:900}]});
  });
  it('does not enable save when service price loading fails', async () => {
    mocks.getServicePrices.mockResolvedValue({ success:false });
    mount(); await screen.findByRole('alert');
    expect(screen.getByRole('button',{name:'게시 설정 저장'}).closest('fieldset')?.disabled).toBe(true);
    expect(mocks.updateDistribution).not.toHaveBeenCalled();
  });
  it('registers an existing product without price or publication inputs', async () => {
    mocks.getMasterById.mockResolvedValue({id:'master-a',name:'표준 제품',regulatoryType:'GENERAL'});
    mocks.createOfferFromMaster.mockResolvedValue({success:true,data:{id:'product-a',approvalStatus:'PENDING'}});
    render(<MemoryRouter initialEntries={['/supplier/products/from-master?masterId=master-a']}><SupplierProductFromMasterPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button',{name:'제품 등록 요청'}));
    await screen.findByText('제품 등록 요청 완료');
    expect(mocks.createOfferFromMaster).toHaveBeenCalledExactlyOnceWith({masterId:'master-a'});
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
