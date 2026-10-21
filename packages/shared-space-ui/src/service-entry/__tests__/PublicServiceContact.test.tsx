import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PublicServiceContact } from '../PublicServiceContact';
afterEach(cleanup);
function fill() {
 for(const [label,value] of [['이름 *','합성 방문자'],['이메일 *','sample@example.invalid'],['제목 *','가입 전 문의'],['문의 내용 *','서비스 가입 전에 문의합니다.']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'문의 보내기'}));
}
it('submits an anonymous inquiry to the selected service and displays its receipt',async()=>{
 const post=vi.fn(async()=>({data:{data:{id:'receipt-123'}}}));
 render(<PublicServiceContact serviceKey="supplier" client={{post}} />);fill();
 expect(await screen.findByText('접수번호: receipt-123')).toBeTruthy();
 expect(post).toHaveBeenCalledWith('/public/services/supplier/contact-inquiries',expect.objectContaining({privacyConsent:true,email:'sample@example.invalid'}));
});
it('does not claim receipt when submission fails',async()=>{
 const post=vi.fn(async()=>{throw Error('failed');});render(<PublicServiceContact serviceKey="funding" client={{post}} />);fill();
 expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText('문의가 접수되었습니다.')).toBeNull();
});
it('changing services clears private draft and receipt state',async()=>{
 const client={post:vi.fn(async()=>({data:{data:{id:'supplier-receipt'}}}))};
 const view=render(<PublicServiceContact serviceKey="supplier" client={client} />);fill();await screen.findByText('접수번호: supplier-receipt');
 view.rerender(<PublicServiceContact serviceKey="funding" client={client} />);
 expect(screen.queryByText('접수번호: supplier-receipt')).toBeNull();expect((screen.getByLabelText('이메일 *') as HTMLInputElement).value).toBe('');
});
