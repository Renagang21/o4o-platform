import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ServiceDiscovery from '../home/ServiceDiscovery';
import PartnerServicePage from '../../pages/PartnerServicePage';

afterEach(cleanup);
describe('공개 서비스 진입', () => {
  it.each([
    ['만성질환관리', 'https://carepharm.neture.co.kr/'],
    ['약국/약사협동조합', 'https://pharmcoop.neture.co.kr/'],
    ['창고형 약국', 'https://megapharm.neture.co.kr/'],
  ])('%s 카드는 준비 중 팝업 대신 해당 서비스로 연결한다', (name, href) => {
    render(<MemoryRouter><ServiceDiscovery /></MemoryRouter>);
    const link = screen.getByRole('link', {name: new RegExp(`^${name} `)});
    expect(link.getAttribute('href')).toBe(href);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.textContent).not.toContain('준비 중');
    expect(screen.queryByRole('button', {name: new RegExp(`^${name} `)})).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('Partner는 가입 기능 없이 상태·홈 복귀·문의 경로를 제공한다', () => {
    render(<MemoryRouter><PartnerServicePage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'O4O Partner' })).toBeTruthy();
    expect(screen.getByText('준비 중')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'O4O 메인으로' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: 'Contact Us' }).getAttribute('href')).toBe('/contact');
    expect(screen.queryByRole('button', { name: /가입/ })).toBeNull();
  });
});

it('병원 별도 앱은 SPA catch-all 대신 문서 탐색 링크로 연다', () => {
  render(<MemoryRouter><Routes><Route path="/" element={<ServiceDiscovery />} /><Route path="/hospital" element={<h1>잘못된 SPA 경로</h1>} /></Routes></MemoryRouter>);
  const hospital = screen.getByRole('link', { name: /병원·약품 파일 도구/ });
  expect(hospital.getAttribute('href')).toBe('/hospital');
  // Cancel jsdom document navigation after the router would have intercepted it.
  document.addEventListener('click', event => event.preventDefault(), { once: true });
  fireEvent.click(hospital);
  expect(screen.queryByRole('heading', { name: '잘못된 SPA 경로' })).toBeNull();
  expect(screen.getByRole('heading', { name: '전체 서비스' })).toBeTruthy();
});

it('회원이 가입·신청한 항목은 다른 서비스 소개에서 중복하지 않는다', () => {
  const data = {services: [{key:'lecture', membership:{status:'active'}}, {key:'kpa-branch', membership:{status:'pending'}}], stores:[], workspaceStores:[], branches:[], serviceStates:{supplier:{status:'suspended',source:'fixture'}}} as import('../../lib/home-entry').HomeEntryData;
  render(<MemoryRouter><ServiceDiscovery personalized data={data}/></MemoryRouter>);
  expect(screen.getByRole('heading', {name:'다른 서비스 알아보기'})).toBeTruthy();
  expect(screen.queryByRole('link', {name:/^O4O 강의/})).toBeNull();
  expect(screen.queryByRole('link', {name:/^약사회 분회/})).toBeNull();
  expect(screen.queryByRole('link', {name:/^공급자 /})).toBeNull();
  expect(screen.getByRole('link', {name:/^커뮤니티 /}).textContent).toContain('공개 글을 둘러보고');
});
it('가입 정보가 없으면 미가입으로 단정하지 않고 공개 전체 목록을 유지한다', () => {
  render(<MemoryRouter><ServiceDiscovery personalized data={null}/></MemoryRouter>);
  expect(screen.getByRole('heading', {name:'전체 서비스'})).toBeTruthy();
  expect(screen.getByRole('link', {name:/^O4O 강의/})).toBeTruthy();
});

it('사업·조합의 별도 원장 정보를 사용하고 정지된 사업은 활성으로 추론하지 않는다', () => {
  const data = { services: [], stores: [], branches: [], communities: [], serviceStates: { supplier: { status: 'none', source: 'none' } },
    businesses: [{ key: 'carepharm', name: '합성 사업', canParticipate: true }, { key: 'megapharm', name: '다른 합성 사업', canParticipate: false }],
    cooperatives: [{ id: 'coop', slug: 'sample', name: '합성 조합', status: 'pending' }],
  } as import('../../lib/home-entry').HomeEntryData;
  render(<MemoryRouter><ServiceDiscovery personalized data={data} /></MemoryRouter>);
  expect(screen.queryByRole('link', { name: /^만성질환관리 / })).toBeNull();
  expect(screen.queryByRole('link', { name: /^약국\/약사협동조합 / })).toBeNull();
  expect(screen.getByRole('link', { name: /^창고형 약국 / })).toBeTruthy();
});

it('로그인 후 미가입 협력사업도 실제 서비스로 공개 진입할 수 있다', () => {
 const data={services:[], stores:[], workspaceStores:[], branches:[], serviceStates:{supplier:{status:'none',source:'none'}}} as import('../../lib/home-entry').HomeEntryData;
 render(<MemoryRouter><ServiceDiscovery personalized data={data}/></MemoryRouter>);
 expect(screen.getByRole('link',{name:/^약국\/약사협동조합 /}).getAttribute('href')).toBe('https://pharmcoop.neture.co.kr/');
 expect(screen.queryByRole('dialog')).toBeNull();
});

it('이미 참여 가능한 사업은 다른 서비스 소개에서 중복하지 않는다', () => {
 const data={services:[], stores:[], branches:[], serviceStates:{supplier:{status:'none',source:'none'}}, communities:[{communityKey:'business:carepharm',kind:'semi-franchise',businessKey:'carepharm',canParticipate:true,entries:[],reason:null,name:'합성 사업'},{communityKey:'business:megapharm',kind:'semi-franchise',businessKey:'megapharm',canParticipate:false,entries:[],reason:null,name:'다른 합성 사업'}]} as import('../../lib/home-entry').HomeEntryData;
 render(<MemoryRouter><ServiceDiscovery personalized data={data}/></MemoryRouter>);
 expect(screen.queryByRole('link',{name:/^만성질환관리 /})).toBeNull();
 expect(screen.getByRole('link',{name:/^창고형 약국 /}).getAttribute('href')).toBe('https://megapharm.neture.co.kr/');
});

it('모든 서비스 가입 시 미가입 서비스 영역을 숨기고 공개 도구는 별도로 유지한다', () => {
  const data = {
    services: ['kpa-society', 'community', 'kpa-branch', 'lecture', 'funding'].map(key => ({ key, membership: { status: 'active' } })),
    stores: [{ id: 'fixture-store' }], branches: [],
    serviceStates: { supplier: { status: 'active', source: 'fixture' } },
    businesses: ['pharmacy', 'carepharm', 'megapharm'].map(key => ({ key, name: key, canParticipate: true, membershipStatus: 'active' })),
    cooperatives: [{ id: 'fixture-coop', slug: 'fixture', name: '합성 조합', status: 'active' }],
  } as import('../../lib/home-entry').HomeEntryData;
  render(<MemoryRouter><ServiceDiscovery personalized data={data} /></MemoryRouter>);
  expect(screen.queryByRole('heading', { name: '다른 서비스 알아보기' })).toBeNull();
  expect(screen.queryByRole('link', { name: /^만성질환관리 / })).toBeNull();
  expect(screen.queryByRole('link', { name: /^약사회 분회 / })).toBeNull();
  const publicSection = screen.getByRole('region', { name: '공개 도구·준비 중 서비스' });
  expect(publicSection.textContent).toContain('O4O Partner');
  expect(publicSection.textContent).toContain('병원·약품 파일 도구');
});

it('pharmacy 사업 원장에만 가입된 회원도 약국 서비스를 미가입으로 표시하지 않는다', () => {
  const data = { services: [], stores: [], branches: [], serviceStates: { supplier: { status: 'none', source: 'none' } },
    businesses: [{ key: 'pharmacy', name: '약국', canParticipate: true, membershipStatus: 'active' }],
  } as import('../../lib/home-entry').HomeEntryData;
  render(<MemoryRouter><ServiceDiscovery personalized data={data} /></MemoryRouter>);
  expect(screen.queryByRole('link', { name: /^O4O 약국 경영지원 / })).toBeNull();
  expect(screen.getByRole('link', { name: /^만성질환관리 / })).toBeTruthy();
});

it('데이터 조회 실패 시 공개 도구를 포함한 전체 탐색을 유지한다', () => {
  render(<MemoryRouter><ServiceDiscovery personalized data={null} /></MemoryRouter>);
  expect(screen.getByRole('region', { name: '전체 서비스' }).textContent).toContain('O4O Partner');
  expect(screen.queryByRole('region', { name: '공개 도구·준비 중 서비스' })).toBeNull();
});
