/**
 * WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1 — O4O 홈 복귀는 로그인 여부와 무관
 *
 * GlobalHeader `homeSlot` 은 user 가 없어도 렌더된다(이전에는 로그인 사용자에게만 O4O 홈이 보였다).
 * 로고(브랜드) 링크는 서비스 홈(`/`) 그대로.
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs`
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GlobalHeader } from '@o4o/ui';

describe('GlobalHeader homeSlot', () => {
  it.each([
    ['비로그인', null],
    ['로그인', { displayName: '사용자', email: 'user@example.com' }],
  ] as const)('%s 상태에서도 O4O 홈이 보인다', (_label, user) => {
    const { unmount } = render(
      <MemoryRouter>
        <GlobalHeader
          brand={{ icon: '🌿', name: 'Neture', subtitle: 'O4O 통합 업무 공간', primaryColor: '#059669' }}
          publicNav={[]}
          user={user}
          onLogin={() => {}}
          onLogout={() => {}}
          homeSlot={<button type="button" data-testid="home-slot">O4O 홈</button>}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByTestId('home-slot').length).toBeGreaterThan(0);
    unmount();
  });
});
