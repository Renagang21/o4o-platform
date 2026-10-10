import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ profile: 'main' }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ pendingPolicyAcceptances: [{}], acceptPendingPolicies: vi.fn(), logout: vi.fn() }) }));
vi.mock('../../../pages/legal/PolicyDocumentPage', () => ({ loadPolicy: vi.fn() }));
vi.mock('../../../lib/hostProfile', () => ({ get CURRENT_HOST_PROFILE() { return state.profile; } }));
vi.mock('@o4o/shared-space-ui', () => ({ PolicyAcceptanceGate: ({ allowPaths, children }: { allowPaths: string[]; children: React.ReactNode }) => {
  const { pathname } = useLocation();
  return allowPaths.includes(pathname) ? children : <div>동의 필요</div>;
} }));
import { TermsAcceptanceGate } from '../TermsAcceptanceGate';
afterEach(() => { cleanup(); state.profile = 'main'; });
function mount(path: string) { render(<MemoryRouter initialEntries={[path]}><TermsAcceptanceGate><div>공개 홈</div></TermsAcceptanceGate></MemoryRouter>); }
it('대표 호스트의 공개 홈은 미동의 세션으로도 돌아갈 수 있다', () => { mount('/'); expect(screen.getByText('공개 홈')).toBeTruthy(); });
it('대표 호스트의 업무 화면은 계속 동의를 요구한다', () => { mount('/mypage'); expect(screen.getByText('동의 필요')).toBeTruthy(); expect(screen.queryByText('공개 홈')).toBeNull(); });
it('형제 서브도메인의 루트에는 공개 홈 예외를 확대하지 않는다', () => { state.profile = 'community'; mount('/'); expect(screen.getByText('동의 필요')).toBeTruthy(); });
