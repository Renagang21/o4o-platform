import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
vi.mock('@o4o/auth-client',()=>({authClient:{api:{get:vi.fn().mockResolvedValue({data:{data:{course:{title:'합성 강의',description:'검토',status:'submitted',isPaid:false,requiresApproval:false},curriculum:[]}}})}}}));
import CentralLectureReview from './CentralLectureReview';
afterEach(cleanup);
it('retains access to the full existing video, attachment and content review workspace',async()=>{
 render(<MemoryRouter><CentralLectureReview courseId="synthetic-course"/></MemoryRouter>);
 await screen.findByRole('heading',{name:'합성 강의'});
 expect(screen.getByRole('link',{name:'영상·첨부·본문을 포함한 전체 학습 자료 검토'})).toHaveAttribute('href','https://study.neture.co.kr/operator/courses/synthetic-course/review');
});
