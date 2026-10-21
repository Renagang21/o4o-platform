import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {ScopedContactForm} from '../ScopedContactForm';
afterEach(cleanup);
function fill(){for(const [label,value]of [['이름 *','합성 문의자'],['이메일 *','synthetic@example.invalid'],['제목 *','합성 문의 제목'],['문의 내용 *','합성 문의 내용입니다. 실제 운영 자료가 아닙니다.']])fireEvent.change(screen.getByLabelText(label),{target:{value}});fireEvent.click(screen.getByRole('checkbox'));}
it('submits to the injected scope once while pending and preserves input on failure',async()=>{
 let reject!:(e:Error)=>void;const api={post:vi.fn().mockImplementationOnce(()=>new Promise((_r,j)=>{reject=j;})).mockResolvedValue({})};render(<ScopedContactForm client={api} endpoint="/operator-inbox/cooperative/synthetic"/>);fill();
 const send=screen.getByRole('button',{name:'문의 보내기'});fireEvent.click(send);fireEvent.click(send);expect(api.post).toHaveBeenCalledTimes(1);
 await act(async()=>reject(new Error('synthetic')));await screen.findByRole('alert');expect((screen.getByLabelText('제목 *')as HTMLInputElement).value).toBe('합성 문의 제목');
 fireEvent.click(send);await screen.findByText('문의가 접수되었습니다.');expect(api.post).toHaveBeenCalledTimes(2);expect(api.post.mock.calls[1][0]).toBe('/operator-inbox/cooperative/synthetic/contact');expect(api.post.mock.calls[1][1]).toMatchObject({privacyConsent:true});
});
it('does not carry a previous scope form or completion into the next scope',async()=>{
 let finish!:(v:unknown)=>void;const api={post:vi.fn().mockImplementation(()=>new Promise(r=>{finish=r;}))};const view=render(<ScopedContactForm client={api} endpoint="/first"/>);fill();fireEvent.click(screen.getByRole('button',{name:'문의 보내기'}));view.rerender(<ScopedContactForm client={api} endpoint="/second"/>);await act(async()=>finish({}));expect(screen.queryByText('문의가 접수되었습니다.')).toBeNull();expect((screen.getByLabelText('제목 *')as HTMLInputElement).value).toBe('');
});
