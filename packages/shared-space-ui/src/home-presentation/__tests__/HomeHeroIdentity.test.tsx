import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HOME_SURFACES, initialHomePresentation } from '@o4o/types';
import { HomeHeroView } from '../HomePresentation';
import { HomePresentationEditor } from '../HomePresentationEditor';
import { initialIdentityPresentation } from '../HomeHeroIdentity';

afterEach(cleanup);
describe('service-specific Hero presentation', () => {
  it.each(HOME_SURFACES)('keeps published content and uses an image before decorative artwork: %s', surface => {
    const config = initialHomePresentation(surface);
    config.slides[0] = {...config.slides[0], title:'운영자가 게시한 제목', description:'기존 사업 안내', imageUrl:'https://example.test/published-cover.jpg', linkUrl:'/published', linkText:'게시한 내용 보기'};
    const {container, rerender} = render(<HomeHeroView surface={surface} config={config} heading="h2" actions={<a href="/existing">기존 업무</a>} />);
    expect(screen.getByRole('heading',{level:2,name:'운영자가 게시한 제목'})).toBeTruthy();
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.test/published-cover.jpg');
    expect(container.querySelector('.home-hero-visual')).toBeNull();
    expect(screen.getByRole('link',{name:/게시한 내용 보기/}).getAttribute('href')).toBe('/published');
    expect(screen.getByRole('link',{name:'기존 업무'}).getAttribute('href')).toBe('/existing');
    config.slides[0].imageUrl='';
    rerender(<HomeHeroView surface={surface} config={config} heading="h2" />);
    expect(container.querySelector('.home-hero-visual')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(screen.getByRole('heading',{level:2,name:'운영자가 게시한 제목'})).toBeTruthy();
  });
  it('loads a business-scoped editor with matching branding, guidance and preview', async () => {
    const client={get:vi.fn().mockResolvedValue({data:{success:true,data:{revision:0,draft:null,published:null}}}),put:vi.fn()};
    const {container}=render(<HomePresentationEditor surface="pharmacy" businessKey="megapharm" client={client}/>);
    expect(await screen.findByRole('heading',{name:'사업 소식과 제품 자료, 가입 약국과 함께'})).toBeTruthy();
    expect(client.get).toHaveBeenCalledWith('/home-presentation/pharmacy/business/megapharm/manage');
    expect(screen.getByLabelText('이 서비스의 Hero 제작 안내')).toBeTruthy();
    expect(container.querySelector('[data-home-identity="megapharm"]')).toBeTruthy();
    expect(client.put).not.toHaveBeenCalled();
  });
  it('starts a new Megapharm composition with its own business copy', () => {
    const draft=initialIdentityPresentation('pharmacy','megapharm');
    expect(draft.slides[0].eyebrow).toBe('메가팜 · 창고형약국');
    expect(draft.slides[0].title).toContain('사업 소식과 제품 자료');
    expect(initialIdentityPresentation('pharmacy','pharmacy')).toEqual(initialHomePresentation('pharmacy'));
  });
  it('distinguishes Megapharm without changing the pharmacy publication or existing destination', () => {
    const config=initialHomePresentation('pharmacy');
    config.slides[0].linkUrl='/materials'; config.slides[0].linkText='사업 자료';
    const {container,rerender}=render(<HomeHeroView surface="pharmacy" businessKey="megapharm" config={config} />);
    expect(container.querySelector('[data-home-identity="megapharm"]')).toBeTruthy();
    expect(screen.getByRole('link',{name:/사업 자료/}).getAttribute('href')).toBe('/materials');
    rerender(<HomeHeroView surface="pharmacy" businessKey="pharmacy" config={config} />);
    expect(container.querySelector('[data-home-identity="pharmacy"]')).toBeTruthy();
  });
});
