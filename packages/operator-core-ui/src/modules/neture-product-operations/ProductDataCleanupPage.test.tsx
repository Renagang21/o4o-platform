import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Page from './ProductDataCleanupPage';
import { NetureProductOperationsProvider } from './runtime';
const api={getRecycleBin:vi.fn(),hardDelete:vi.fn(),previewEmptyTrash:vi.fn(),emptyTrash:vi.fn()};
const row={id:'fixture',name:'합성 상품',barcode:'fixture',supplier_name:'합성 공급자',deleted_at:'2026-10-30'};
const preview={count:120,cutoff:'synthetic',fingerprint:'synthetic'};
const page=(roles=['neture:admin'])=><NetureProductOperationsProvider {...{http:{} as any,api:{productCleanupApi:api} as any,user:{id:'actor',roles},fetchGuidePageContent:async()=>({})}}><Page initialTab="recycle-bin"/></NetureProductOperationsProvider>;
beforeEach(()=>{vi.resetAllMocks();api.getRecycleBin.mockResolvedValue({success:true,data:[row],pagination:{totalPages:3,total:120}});api.previewEmptyTrash.mockResolvedValue(preview);api.emptyTrash.mockResolvedValue({deleted:119,blocked:[{id:'fixture',reason:'주문·장바구니 연결'}]});api.hardDelete.mockResolvedValue({success:true});});
afterEach(cleanup);
it('confirms an individual irreversible deletion without asking for a reason',async()=>{
 render(page());fireEvent.click(await screen.findByRole('button',{name:'완전 삭제'}));
 expect(screen.queryByRole('textbox',{name:'처리 사유'})).toBeNull();expect(api.hardDelete).not.toHaveBeenCalled();
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'완전 삭제'}));
 await waitFor(()=>expect(api.hardDelete).toHaveBeenCalledWith('fixture'));
});
it('previews and empties all pages in one request, preserves referenced records, and never asks for free text',async()=>{
 render(page());fireEvent.click(await screen.findByRole('button',{name:'휴지통 비우기'}));
 await screen.findByText(/확인한 120개/);expect(api.emptyTrash).not.toHaveBeenCalled();expect(screen.queryByRole('textbox')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'확인한 상품 완전 삭제'}));
 await waitFor(()=>expect(api.emptyTrash).toHaveBeenCalledWith(preview));
 expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('119개 완전 삭제'));
 expect(screen.getByText('완전 삭제에서 제외한 상품')).toBeTruthy();expect(screen.getByText(/주문·장바구니 연결/)).toBeTruthy();
});
it('requires a new preview after a failed execution and does not retry deletion on a read refresh',async()=>{
 api.emptyTrash.mockRejectedValueOnce(new Error('휴지통 변경'));render(page());fireEvent.click(await screen.findByRole('button',{name:'휴지통 비우기'}));
 fireEvent.click(await screen.findByRole('button',{name:'확인한 상품 완전 삭제'}));await screen.findByRole('alert');
 expect(screen.queryByRole('button',{name:'확인한 상품 완전 삭제'})).toBeNull();expect(api.emptyTrash).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'대상 다시 확인'}));await screen.findByRole('button',{name:'확인한 상품 완전 삭제'});
 expect(api.previewEmptyTrash).toHaveBeenCalledTimes(2);expect(api.emptyTrash).toHaveBeenCalledTimes(1);
});
it('retains the admin-only boundary for emptying and deleting with an unrelated service admin role',async()=>{
 render(page(['neture:operator','kpa:admin']));await screen.findByText('합성 상품');expect(screen.queryByRole('button',{name:'휴지통 비우기'})).toBeNull();expect(screen.queryByRole('button',{name:'완전 삭제'})).toBeNull();
});
it('never treats a failed preview as an empty bin',async()=>{
 api.previewEmptyTrash.mockRejectedValueOnce(new Error('조회 실패'));render(page());fireEvent.click(await screen.findByRole('button',{name:'휴지통 비우기'}));await screen.findByRole('alert');expect(screen.queryByText('휴지통이 비어 있습니다.')).toBeNull();expect(api.emptyTrash).not.toHaveBeenCalled();
});
