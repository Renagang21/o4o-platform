import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {MarketTrialDetailPage} from './MarketTrialDetailPage';
const {getTrial,joinTrial}=vi.hoisted(()=>({getTrial:vi.fn(),joinTrial:vi.fn()}));
vi.mock('../../api/trial',()=>({getTrial,joinTrial,getParticipation:vi.fn()}));
vi.mock('../../contexts/AuthContext',()=>({useAuth:()=>({user:null,isAuthenticated:false})}));
vi.mock('../../lib/apiClient',()=>({api:{get:vi.fn()}}));
vi.mock('@o4o/content-editor',()=>({ContentRenderer:()=>null}));
vi.mock('@o4o/shared-space-ui',()=>({ServiceEnrollmentPolicyAgreement:()=>null,useServiceEnrollmentPolicies:()=>({ready:true,references:[]})}));
beforeEach(()=>vi.clearAllMocks());afterEach(()=>{cleanup();vi.useRealTimers();});
const record=(start:number,end:number)=>({id:'project',title:'격리 펀딩',status:'recruiting',startDate:new Date(start).toISOString(),endDate:new Date(end).toISOString(),rewardOptions:['product'],currentParticipants:0,maxParticipants:10});
const mount=()=>render(<MemoryRouter initialEntries={['/market-trial/project']}><Routes><Route path="/market-trial/:id" element={<MarketTrialDetailPage/>}/></Routes></MemoryRouter>);
it('keeps an expired recruitment awaiting an operator decision without advertising participation',async()=>{
 const now=Date.now();getTrial.mockResolvedValue(record(now-20000,now-10000));mount();
 await screen.findByText('모집이 마감되어 운영자의 모금 확인을 기다리고 있습니다.');
 expect(screen.queryByRole('button',{name:'로그인하고 참여하기'})).toBeNull();expect(screen.getAllByText('모집중').length).toBeGreaterThan(0);expect(joinTrial).not.toHaveBeenCalled();
});
it('does not offer participation before the recruitment starts',async()=>{
 const now=Date.now();getTrial.mockResolvedValue(record(now+10000,now+20000));mount();await screen.findByText('모집 시작 전입니다.');expect(screen.queryByRole('button',{name:'로그인하고 참여하기'})).toBeNull();
});
it('offers participation inside the recruitment window',async()=>{
 const now=Date.now();getTrial.mockResolvedValue(record(now-10000,now+10000));mount();await screen.findByRole('button',{name:'로그인하고 참여하기'});expect(joinTrial).not.toHaveBeenCalled();
});
it('closes an already open participation form at the deadline without a status mutation or refetch',async()=>{
 vi.useFakeTimers();const now=Date.now();getTrial.mockResolvedValue(record(now-10000,now+1000));await act(async()=>{mount();});
 expect(screen.getByRole('button',{name:'로그인하고 참여하기'})).toBeTruthy();await act(async()=>{vi.advanceTimersByTime(1000);});
 expect(screen.queryByRole('button',{name:'로그인하고 참여하기'})).toBeNull();expect(screen.getByText('모집이 마감되어 운영자의 모금 확인을 기다리고 있습니다.')).toBeTruthy();expect(getTrial).toHaveBeenCalledTimes(1);expect(joinTrial).not.toHaveBeenCalled();
});
