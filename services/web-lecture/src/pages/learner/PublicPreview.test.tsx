import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const { get } = vi.hoisted(() => ({ get:vi.fn() }));
vi.mock('../../lib/apiClient',()=>({api:{get}}));
import PublicPreviewPage, { PublicPreviewList } from './PublicPreview';
afterEach(cleanup);beforeEach(()=>{ get.mockReset(); });
it('lets an unsigned viewer open the preview route without enrollment or progress requests',async()=>{
 get.mockResolvedValue({data:{data:{preview:{id:'l',title:'Sample',duration:1,videoUrl:'https://example.invalid/a.mp4'}}}});
 const {container}=render(<MemoryRouter initialEntries={['/courses/c/preview/l']}><Routes><Route path="/courses/:courseId/preview/:lessonId" element={<PublicPreviewPage/>}/></Routes></MemoryRouter>);
 await screen.findByRole('heading',{name:'Sample'});expect(container.querySelector('video')?.getAttribute('src')).toBe('https://example.invalid/a.mp4');
 expect(get).toHaveBeenCalledTimes(1);expect(get).toHaveBeenCalledWith('/lms/courses/c/previews/l');
 expect(screen.queryByText('학습 완료')).toBeNull();
});
it('shows a preview-list link and retries an unavailable public list',async()=>{
 get.mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce({data:{data:{items:[{id:'l',title:'Sample'}]}}});
 render(<MemoryRouter><PublicPreviewList courseId="c"/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'미리보기 다시 조회'}));
 expect((await screen.findByRole('link',{name:'Sample 미리보기'})).getAttribute('href')).toBe('/courses/c/preview/l');
});
it('shows a closed/unavailable preview instead of falling back to the protected lesson API',async()=>{
 get.mockRejectedValue(new Error('404'));
 render(<MemoryRouter><PublicPreviewPage/></MemoryRouter>);
 await screen.findByRole('alert');expect(get).toHaveBeenCalledTimes(1);
});
