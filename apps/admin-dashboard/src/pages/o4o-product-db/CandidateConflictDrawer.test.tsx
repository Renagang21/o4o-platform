import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const mocks=vi.hoisted(()=>({getCandidateConflictInfo:vi.fn(),bulkCandidateAction:vi.fn(),promoteCandidateToMaster:vi.fn(),promoteSupplierCandidateToMaster:vi.fn(),writer:true}));
vi.mock('@/api/o4o-product-db.api',()=>mocks);
vi.mock('./useProductDbWriteAccess',()=>({useProductDbWriteAccess:()=>mocks.writer}));
import Drawer from './CandidateConflictDrawer';
const candidate=(sourceType='supplier_web')=>({id:'synthetic',candidateName:'합성 공급자 후보',candidateStatus:'pending',sourceType,rawPayload:{},matchedProductMasterId:null});
beforeEach(()=>{mocks.writer=true;mocks.getCandidateConflictInfo.mockResolvedValue({candidate:candidate(),promotable:{eligible:false,reason:'NOT_DRUG_SOURCE'},conflictKey:{},rawPayloadSummary:{}});mocks.promoteSupplierCandidateToMaster.mockResolvedValue({outcome:'create'});});
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('uses the existing supplier adapter after explicit confirmation, without the drug route',async()=>{
 const done=vi.fn();render(<Drawer candidateId="synthetic" open onClose={vi.fn()} onProcessed={done}/>);
 fireEvent.click(await screen.findByRole('button',{name:/신규 기본상품으로 등록/}));
 expect(mocks.promoteSupplierCandidateToMaster).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'등록',exact:true}));
 await waitFor(()=>expect(mocks.promoteSupplierCandidateToMaster).toHaveBeenCalledWith('synthetic'));
 expect(mocks.promoteCandidateToMaster).not.toHaveBeenCalled();await waitFor(()=>expect(done).toHaveBeenCalled());
});
it('explains an unsupported medical dataset without exposing a registration action',async()=>{
 mocks.getCandidateConflictInfo.mockResolvedValue({candidate:candidate('external_api'),promotable:{eligible:false,reason:'NOT_DRUG_SOURCE'},conflictKey:{},rawPayloadSummary:{}});
 render(<Drawer candidateId="synthetic" open onClose={vi.fn()} onProcessed={vi.fn()}/>);
 await screen.findByText(/해당 제품군의 등록 경로를 준비해야/);expect(screen.queryByRole('button',{name:/신규 기본상품으로 등록/})).toBeNull();
});
it('preserves the platform-only registration UI boundary',async()=>{
 mocks.writer=false;render(<Drawer candidateId="synthetic" open onClose={vi.fn()} onProcessed={vi.fn()}/>);
 await screen.findByText(/O4O 전체 관리자가 수행/);expect(screen.queryByRole('button',{name:/신규 기본상품으로 등록/})).toBeNull();
});
