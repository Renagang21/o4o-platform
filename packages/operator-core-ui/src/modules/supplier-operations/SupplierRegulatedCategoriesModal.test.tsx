import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import Modal from './SupplierRegulatedCategoriesModal';
afterEach(cleanup);
const makeApi=()=>({listRegulatedCategories:vi.fn(),reviewRegulatedCategory:vi.fn(),downloadRegulatedEvidence:vi.fn()});
it('shows a read failure instead of an empty category list and retries without a write',async()=>{
 const api=makeApi();api.listRegulatedCategories.mockRejectedValueOnce(new Error('synthetic')).mockResolvedValueOnce([]);
 render(<Modal api={api} supplierId="fixture" supplierName="Synthetic supplier" onClose={()=>{}}/>);
 await screen.findByRole('alert');expect(screen.queryByText('신청한 품목군이 없습니다.')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'품목군 다시 조회'}));
 await screen.findByText('신청한 품목군이 없습니다.');
 expect(screen.queryByRole('alert')).toBeNull();expect(api.reviewRegulatedCategory).not.toHaveBeenCalled();
});
it('ignores a late response from the previously selected supplier',async()=>{
 const api=makeApi();let finish!:(rows:any[])=>void;
 api.listRegulatedCategories.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce([]);
 const view=render(<Modal api={api} supplierId="first" supplierName="First" onClose={()=>{}}/>);
 await waitFor(()=>expect(api.listRegulatedCategories).toHaveBeenCalledWith('first'));
 view.rerender(<Modal api={api} supplierId="second" supplierName="Second" onClose={()=>{}}/>);
 await screen.findByText('신청한 품목군이 없습니다.');
 await act(async()=>finish([{category:'unknown',status:'submitted',registrationNumber:'OLD-SUPPLIER'}]));
 expect(screen.queryByText(/OLD-SUPPLIER/)).toBeNull();expect(screen.getByText('Second')).toBeTruthy();
});
