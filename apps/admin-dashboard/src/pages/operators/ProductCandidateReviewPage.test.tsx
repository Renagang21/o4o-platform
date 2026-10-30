import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Page from '../../../../../packages/operator-core-ui/src/modules/neture-product-operations/ProductCandidateReviewPage';
import { NetureProductOperationsProvider } from '../../../../../packages/operator-core-ui/src/modules/neture-product-operations/runtime';
const api={list:vi.fn(),workflowSummary:vi.fn(),workflowPreview:vi.fn(),workflowExecute:vi.fn(),archive:vi.fn(),reject:vi.fn()};
const row=(id:string,registration='unsupported')=>({id,candidateName:`합성후보 ${id}`,candidateStatus:'pending',sourceType:'external_api',createdAt:'2026-10-01',triage:{queue:'intake',registration,medicalDevice:true,reasons:['허가 상태 미확인','현재 화면의 상품 등록 경로 미지원'],nextStep:'원천 식별자·허가 검증 필요'}});
const stats={total:12000,intake:12000,review:0,sources:[{sourceLabel:'MFDS_MEDICAL_DEVICE_STANDARD_CODE',count:12000}],reasons:[{code:'STATUS_UNCHECKED',label:'허가 상태 미확인',count:12000}]};
const preview={count:12000,cutoff:'2026-10-30T00:00:00Z',fingerprint:'synthetic-fingerprint',action:'review'};
const renderPage=(roles=['neture:admin'],extra={})=><MemoryRouter initialEntries={['/operations/neture/candidates?status=pending']}><NetureProductOperationsProvider {...{http:{} as any,api:{operatorProductCandidateApi:api} as any,user:{id:'synthetic',roles},fetchGuidePageContent:vi.fn(),...extra}}><Page/></NetureProductOperationsProvider></MemoryRouter>;
beforeEach(()=>{api.list.mockResolvedValue({items:[row('one')],total:12000});api.workflowSummary.mockResolvedValue(stats);api.workflowPreview.mockResolvedValue(preview);api.workflowExecute.mockResolvedValue({updated:12000,status:'reviewing'});});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.resetAllMocks();});
it('selects the entire query beyond the display page and executes one confirmed bulk request',async()=>{
 api.list.mockImplementation(async({page})=>({items:[row(String(page))],total:12000}));render(renderPage());await screen.findByText('합성후보 1');
 fireEvent.click(screen.getByRole('button',{name:'검색 결과 전체 12,000건 선택'}));
 fireEvent.click(screen.getByRole('button',{name:'다음 페이지'}));await screen.findByText('합성후보 2');
 expect(screen.getByText('검색 결과 전체 12,000건 선택 중')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'선택 검토 시작'}));fireEvent.click(screen.getByRole('button',{name:'대상 건수 확인'}));
 await screen.findByRole('button',{name:'확인한 12,000건 실행'});expect(api.workflowExecute).not.toHaveBeenCalled();
 expect(api.workflowPreview.mock.calls[0][0]).toMatchObject({filter:{status:'pending',queue:'all'},action:'review'});expect(api.workflowPreview.mock.calls[0][0].ids).toBeUndefined();
 fireEvent.click(screen.getByRole('button',{name:'확인한 12,000건 실행'}));
 await waitFor(()=>expect(api.workflowExecute).toHaveBeenCalledTimes(1));
 expect(api.workflowExecute.mock.calls[0][0]).toMatchObject({action:preview.action,cutoff:preview.cutoff,fingerprint:preview.fingerprint,expectedCount:12000});
 await screen.findByText(/12,000건 검토 시작 처리 완료/);expect(api.archive).not.toHaveBeenCalled();expect(api.reject).not.toHaveBeenCalled();
});
it('clears whole-query selection on server filters and searches all pages',async()=>{
 render(renderPage());await screen.findByText('합성후보 one');fireEvent.click(screen.getByRole('button',{name:'검색 결과 전체 12,000건 선택'}));
 fireEvent.change(screen.getByLabelText('전체 후보 검색'),{target:{value:'식별자'}});
 await waitFor(()=>expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({search:'식별자',page:1})));
 expect(screen.queryByRole('button',{name:'선택 검토 시작'})).toBeNull();
 fireEvent.change(screen.getByLabelText('후보 대기 사유'),{target:{value:'STATUS_UNCHECKED'}});
 await waitFor(()=>expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({reason:'STATUS_UNCHECKED'})));
});
it('requires a note for hold and restricts page-only selection to the checked ID',async()=>{
 render(renderPage());await screen.findByText('합성후보 one');fireEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[1]);
 fireEvent.click(screen.getByRole('button',{name:'선택 보완 사항 기록'}));expect(screen.getByRole('button',{name:'대상 건수 확인'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('일괄 처리 검토 기록'),{target:{value:'허가 상태 확인 필요'}});fireEvent.click(screen.getByRole('button',{name:'대상 건수 확인'}));
 await waitFor(()=>expect(api.workflowPreview).toHaveBeenCalledWith(expect.objectContaining({action:'hold',ids:['one'],note:'허가 상태 확인 필요'})));
});
it('requires a new preview after a concurrent change and never silently retries execution',async()=>{
 api.workflowExecute.mockRejectedValue({response:{status:409}});render(renderPage());await screen.findByText('합성후보 one');
 fireEvent.click(screen.getByRole('button',{name:'검색 결과 전체 12,000건 선택'}));fireEvent.click(screen.getByRole('button',{name:'선택 검토 시작'}));fireEvent.click(screen.getByRole('button',{name:'대상 건수 확인'}));
 fireEvent.click(await screen.findByRole('button',{name:'확인한 12,000건 실행'}));await screen.findByText(/후보가 변경됐거나/);
 expect(screen.queryByRole('button',{name:'확인한 12,000건 실행'})).toBeNull();expect(api.workflowExecute).toHaveBeenCalledTimes(1);
});
it('shows why a medical-device candidate is waiting and does not offer the drug registration route',async()=>{
 render(renderPage(['platform:super_admin'],{renderCandidateRegistrationReview:vi.fn()}));await screen.findByText('합성후보 one');
 expect(screen.getByText('의료기기')).toBeTruthy();fireEvent.click(screen.getByText('합성후보 one'));
 expect(within(screen.getByRole('region',{name:'후보 대기 사유'})).getByText(/현재 화면의 상품 등록 경로 미지원/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:'기본상품 등록 검토'})).toBeNull();
});
it('connects eligible registration review only for the existing platform writer',async()=>{
 api.list.mockResolvedValue({items:[row('drug','drug')],total:1});const review=vi.fn(()=> <p>기존 등록 검토 화면</p>);
 const view=render(renderPage(['neture:admin'],{renderCandidateRegistrationReview:review}));await screen.findByText('합성후보 drug');fireEvent.click(screen.getByText('합성후보 drug'));
 expect(screen.queryByRole('button',{name:'기본상품 등록 검토'})).toBeNull();view.unmount();
 render(renderPage(['platform:super_admin'],{renderCandidateRegistrationReview:review}));await screen.findByText('합성후보 drug');fireEvent.click(screen.getByText('합성후보 drug'));fireEvent.click(screen.getByRole('button',{name:'기본상품 등록 검토'}));
 expect(review).toHaveBeenCalledWith(expect.objectContaining({candidateId:'drug'}));
});
it('keeps failed queries unavailable and ignores an old response after a search change',async()=>{
 let finish!:(value:unknown)=>void;api.list.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockRejectedValueOnce(Error('offline')).mockResolvedValue({items:[row('latest')],total:1});
 render(renderPage());fireEvent.change(screen.getByLabelText('전체 후보 검색'),{target:{value:'new'}});await screen.findByRole('alert');
 await act(async()=>finish({items:[row('stale')],total:10000}));expect(screen.queryByText('합성후보 stale')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'목록 새로고침'}));await screen.findByText('합성후보 latest');
});
