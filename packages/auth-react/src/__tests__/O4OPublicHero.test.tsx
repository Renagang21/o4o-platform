/**
 * WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1 — 공통 Hero 계약
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { O4OPublicHero } from '../public-brand';

afterEach(() => cleanup());

describe('O4OPublicHero', () => {
  it('제목 줄을 h1 하나로 렌더한다', () => {
    render(<O4OPublicHero title={['필요한 지식을', '실무와 연결합니다']} />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('필요한 지식을실무와 연결합니다');
  });

  it('설명 · eyebrow · actions 를 렌더하고 section 을 h1 으로 라벨링한다', () => {
    render(
      <O4OPublicHero
        eyebrow="O4O 강의"
        title={['제목']}
        description={['첫 줄', '둘째 줄']}
        actions={<a href="/courses">강의 둘러보기</a>}
      />,
    );
    expect(screen.getByText('O4O 강의')).toBeTruthy();
    expect(screen.getByText('첫 줄')).toBeTruthy();
    expect(screen.getByText('둘째 줄')).toBeTruthy();
    expect(screen.getByRole('link', { name: '강의 둘러보기' }).getAttribute('href')).toBe('/courses');
    const section = screen.getByTestId('o4o-public-hero');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(section.getAttribute('aria-labelledby')).toBe(h1.id);
  });

  it('accent 를 CSS 변수로 주입하고, media 가 없으면 media 자리를 만들지 않는다', () => {
    const { container } = render(<O4OPublicHero title={['제목']} accent="#2563eb" />);
    const section = screen.getByTestId('o4o-public-hero') as HTMLElement;
    expect(section.style.getPropertyValue('--o4o-accent')).toBe('#2563eb');
    expect(container.querySelector('.o4o-hero__media')).toBeNull();
    expect(container.querySelector('.o4o-hero__actions')).toBeNull();
  });
});
