import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
vi.mock('../lib/api/branch', () => ({
 getPublicSite: vi.fn(async () => ({ title: '샘플 분회', intro: '소개는 별도 표시하지 않음', contact: {} })),
 getPublicPosts: vi.fn(async () => ({ items: [] })),
}));
vi.mock('../lib/api/branchEvent', () => ({ listPublicEvents: vi.fn(async () => []) }));
import BranchHomePage from './BranchHomePage';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('분회 진입은 소개 대신 공지·행사·자료 목록으로 시작한다', async () => {
 vi.stubGlobal('React', React);
 render(<MemoryRouter><BranchHomePage slug="sample" basePath="/sample" /></MemoryRouter>);
 expect(await screen.findByRole('heading', { name: '공지 · 행사' })).toBeTruthy();
 expect(screen.getByRole('heading', { name: '다가오는 행사' })).toBeTruthy();
 expect(screen.getByRole('heading', { name: '공지' })).toBeTruthy();
 expect(screen.getByRole('heading', { name: '자료실' })).toBeTruthy();
 expect(screen.queryByText('소개는 별도 표시하지 않음')).toBeNull();
 expect(screen.getAllByRole('link', { name: '더보기' }).map(a=>a.getAttribute('href'))).toEqual(['/sample/events','/sample/notices','/sample/resources']);
});
