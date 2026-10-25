import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const {apply,reload,auth}=vi.hoisted(()=>({apply:vi.fn(),reload:vi.fn(),auth:{user:{id:'fixture',roles:[]}}}));
vi.mock('../../api/lecture',()=>({learnerApi:{applyInstructor:apply},errorMessage:()=> '신청 실패'}));
vi.mock('../../lib/apiClient',()=>({api:{get:vi.fn()}}));
vi.mock('../../contexts/AuthContext',()=>({useAuth:()=>auth}));
vi.mock('@o4o/shared-space-ui',()=>({useServiceEnrollmentPolicies:()=>({ready:true,references:[],reload}),ServiceEnrollmentPolicyAgreement:()=>null}));
import InstructorApplyPage from './InstructorApplyPage';
afterEach(cleanup);beforeEach(()=>{apply.mockReset();reload.mockReset();auth.user.id='fixture';});
it('submits optional profile with the current policy references',async()=>{
 apply.mockResolvedValue({});render(<MemoryRouter><InstructorApplyPage/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText(/강사 소개/),{target:{value:'  소개  '}});fireEvent.change(screen.getByLabelText(/전문 분야/),{target:{value:' 실무 '}});
 fireEvent.click(screen.getByRole('button',{name:'강사 신청하기'}));
 await screen.findByText(/강사 신청이 접수/);expect(apply).toHaveBeenCalledWith([],{bio:'소개',expertise:'실무'});
});
it('retains applicant text after an API failure so the user can retry',async()=>{
 apply.mockRejectedValue(new Error('failure'));render(<MemoryRouter><InstructorApplyPage/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText(/강사 소개/),{target:{value:'소개'}});fireEvent.click(screen.getByRole('button',{name:'강사 신청하기'}));
 await screen.findByRole('alert');expect((screen.getByLabelText(/강사 소개/) as HTMLTextAreaElement).value).toBe('소개');
 await waitFor(()=>expect((screen.getByRole('button',{name:'강사 신청하기'}) as HTMLButtonElement).disabled).toBe(false));
});

it('clears private application drafts when the authenticated account changes',()=>{
 const view=render(<MemoryRouter><InstructorApplyPage/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText(/강사 소개/),{target:{value:'이전 계정 소개'}});
 auth.user.id='other';view.rerender(<MemoryRouter><InstructorApplyPage/></MemoryRouter>);
 expect((screen.getByLabelText(/강사 소개/) as HTMLTextAreaElement).value).toBe('');
});
