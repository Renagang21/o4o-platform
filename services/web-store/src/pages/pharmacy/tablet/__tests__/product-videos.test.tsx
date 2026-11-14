import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ProductVideos, readProductVideos, type ProductVideoItem } from '@o4o/tablet-kiosk-core';

afterEach(cleanup);
// 잘못된 kind 도 readProductVideos 가 걸러 내는지 보려고 string 으로 받는다.
const video = (id: string, kind: string = 'youtube') => ({ id, title: `영상 ${id}`, kind, url: `https://www.youtube.com/watch?v=${id.padEnd(11, '0')}` }) as ProductVideoItem;

describe('태블릿 제품 [영상 보기] (WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 T5)', () => {
  it('reads only well-formed videos, at most three', () => {
    expect(readProductVideos(undefined)).toEqual([]);
    expect(readProductVideos([video('a'), { id: 'b' }, video('c', 'flash'), video('d'), video('e'), video('f')]).map(v => v.id)).toEqual(['a', 'd', 'e']);
  });
  it('shows nothing without videos and does not start a player before a tap', () => {
    const { container } = render(<ProductVideos videos={[]} />);
    expect(container.textContent).toBe('');
    render(<ProductVideos videos={[video('a')]} />);
    expect(screen.getByRole('button', { name: '▶ 영상 보기' })).toBeTruthy();
    expect(document.querySelector('iframe, video')).toBeNull();
  });
  it('opens and closes the chosen video; several videos are named', () => {
    render(<ProductVideos videos={[video('a'), video('b')]} />);
    fireEvent.click(screen.getByRole('button', { name: '▶ 영상 b' }));
    expect(screen.getByRole('button', { name: '■ 영상 닫기' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '■ 영상 닫기' }));
    expect(screen.queryByRole('button', { name: '■ 영상 닫기' })).toBeNull();
  });
});
