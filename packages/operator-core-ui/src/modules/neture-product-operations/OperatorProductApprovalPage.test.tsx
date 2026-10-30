import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Page from './OperatorProductApprovalPage';
import { NetureProductOperationsProvider } from './runtime';
import { createOperatorProductApiApi } from './operatorProductApi';
const api = {getProducts:vi.fn(),approveProduct:vi.fn(),rejectProduct:vi.fn(),batchApprove:vi.fn(),batchReject:vi.fn()};
const trash = {softDelete:vi.fn(),batchSoftDelete:vi.fn()};
const rows = ['PENDING','APPROVED','REJECTED'].map((approvalStatus,i)=>({id:`offer-${i}`,masterId:`master-${i}`,masterName:`표준 상품 ${i}`,marketingName:`표준 상품 ${i}`,supplierName:'합성 공급자',category:null,distributionType:'PRIVATE',approvalStatus,isActive:false,createdAt:'2026-10-30'}));
const renderPage=(canOpenProductTrash=true)=>render(<NetureProductOperationsProvider {...{canOpenProductTrash,http:{} as any,api:{operatorProductApi:api,productCleanupApi:trash} as any,user:{id:'actor',roles:['platform:super_admin']},fetchGuidePageContent:async()=>({}),renderProductDetail:({product}:any)=>product?<aside role="region" aria-label="합성 상세">{product.name}</aside>:null}}><Page/></NetureProductOperationsProvider>);
beforeEach(()=>{vi.resetAllMocks();api.getProducts.mockResolvedValue(rows);trash.batchSoftDelete.mockResolvedValue({moved:3});trash.softDelete.mockResolvedValue({success:true});});
afterEach(cleanup);
it('maps the actual operator DTO masterName, preferring it to a stale alias and never replacing it with an ID',async()=>{
 const http={get:vi.fn().mockResolvedValue({data:{success:true,data:[{...rows[0],marketingName:undefined},{...rows[1],marketingName:'잘못된 별칭'},{...rows[2],masterName:'',marketingName:undefined}]}})};
 const result=await createOperatorProductApiApi(http as any).operatorProductApi.getProducts();
 expect(result.map(row=>row.marketingName)).toEqual(['표준 상품 0','표준 상품 1','(상품명 없음)']);
 api.getProducts.mockResolvedValue(result);renderPage();await screen.findByText('표준 상품 0');
 fireEvent.change(screen.getByPlaceholderText('상품명, 공급자 검색...'),{target:{value:'표준 상품 0'}});
 expect(screen.queryByText('표준 상품 1')).toBeNull();fireEvent.click(screen.getByText('표준 상품 0'));
 expect(within(screen.getByRole('region',{name:'합성 상세'})).getByText('표준 상품 0')).toBeTruthy();
});
it('deletes selected pending, approved, and rejected offers in one confirmed call without rejection',async()=>{
 renderPage();await screen.findByText('표준 상품 0');fireEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[0]);
 fireEvent.click(screen.getByRole('button',{name:'삭제 (3)'}));
 expect(trash.batchSoftDelete).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'3개 삭제'}));
 await waitFor(()=>expect(trash.batchSoftDelete).toHaveBeenCalledWith(['offer-0','offer-1','offer-2']));
 expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('3개 상품을 휴지통'));
 expect(api.batchReject).not.toHaveBeenCalled();expect(screen.queryByRole('dialog')).toBeNull();
});
it('shows the real name in the row deletion confirmation for a pending offer',async()=>{
 renderPage();await screen.findByText('표준 상품 0');const row=screen.getByText('표준 상품 0').closest('tr')!;
 fireEvent.click(within(row).getByRole('button',{name:'삭제'}));
 expect(screen.getByRole('dialog').textContent).toContain('표준 상품 0');
 expect(screen.getByRole('dialog').textContent).not.toContain('undefined');
});
it('locks duplicate submissions and reports a failed delete without losing the selected targets',async()=>{
 let finish!:(value:unknown)=>void;trash.batchSoftDelete.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 renderPage();await screen.findByText('표준 상품 0');fireEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[0]);fireEvent.click(screen.getByRole('button',{name:'삭제 (3)'}));
 fireEvent.click(screen.getByRole('button',{name:'3개 삭제'}));fireEvent.click(screen.getByRole('button',{name:'처리 중…'}));expect(trash.batchSoftDelete).toHaveBeenCalledTimes(1);
 finish(Promise.reject(new Error('변경됨')));await screen.findByRole('alert');expect(screen.getByRole('button',{name:'3개 삭제'})).toBeTruthy();
});

it('keeps the daily delete action but explains restricted trash access without showing a broken entry',async()=>{
 renderPage(false);await screen.findByText('표준 상품 0');expect(screen.queryByRole('button',{name:'휴지통 열기'})).toBeNull();expect(screen.getByText(/휴지통 조회·완전 삭제는 접근 권한/)).toBeTruthy();
 fireEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[0]);expect(screen.getByRole('button',{name:'삭제 (3)'})).toBeTruthy();
});
