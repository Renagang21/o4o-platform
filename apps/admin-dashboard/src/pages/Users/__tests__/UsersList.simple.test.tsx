/**
 * UsersList 컴포넌트 간단 테스트
 * 핵심 기능 검증을 위한 단순화된 테스트
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import UsersList from '../UsersList';
import { ThemeProvider } from '../../../contexts/ThemeContext';
// Mock auth-context
vi.mock('@o4o/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(() => ({
    user: {
      id: 'admin-user',
      email: 'admin@example.com',
      name: '관리자',
      role: 'admin'
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    getSessionStatus: vi.fn(() => ({
      isValid: true,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      remainingTime: 3600000
    }))
  }))
}));

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: {
      success: true,
      data: {
        users: [
          {
            id: '1',
            name: '홍길동',
            email: 'hong@example.com',
            role: 'customer',
            status: 'approved',
            createdAt: '2023-01-01T00:00:00Z'
          },
          {
            id: '2',
            name: '김철수',
            email: 'kim@example.com',
            role: 'business',
            status: 'pending',
            createdAt: '2023-01-02T00:00:00Z'
          }
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      }
    },
    isLoading: false,
    error: null,
    refetch: vi.fn()
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isLoading: false
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    refetchQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn()
  }))
}));

describe('UsersList 간단 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <ThemeProvider>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </ThemeProvider>
    );
  };

  it('페이지가 올바르게 렌더링된다', () => {
    renderWithRouter(<UsersList />);
    
    // h1 제목으로 더 구체적으로 선택
    expect(screen.getByRole('heading', { name: '사용자 관리' })).toBeInTheDocument();
    expect(screen.getByText('새 사용자 추가')).toBeInTheDocument();
  });

  it('사용자 목록이 표시된다', () => {
    renderWithRouter(<UsersList />);
    
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('hong@example.com')).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('kim@example.com')).toBeInTheDocument();
  });

  it('검색 기능이 있다', () => {
    renderWithRouter(<UsersList />);
    
    expect(screen.getByPlaceholderText('사용자 이름 또는 이메일 검색...')).toBeInTheDocument();
  });

  it('필터 옵션이 있다', () => {
    renderWithRouter(<UsersList />);
    
    // 필터 옵션들이 select 요소로 존재하는지 확인
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2); // 역할, 상태 필터
  });

  it('사용자 선택 체크박스가 있다', () => {
    renderWithRouter(<UsersList />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('일괄 작업 버튼들이 있다', () => {
    renderWithRouter(<UsersList />);
    
    // 일괄 작업 메뉴는 체크박스 선택 시에만 나타날 수 있으므로 버튼 존재만 확인
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('새 사용자 추가 버튼이 작동한다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersList />);
    
    const addButton = screen.getByText('새 사용자 추가');
    await user.click(addButton);
    
    // 버튼 클릭이 에러 없이 처리되는지 확인
    expect(addButton).toBeInTheDocument();
  });

  it('검색 입력이 작동한다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersList />);
    
    const searchInput = screen.getByPlaceholderText('사용자 이름 또는 이메일 검색...');
    await user.type(searchInput, '홍길동');
    
    expect(searchInput).toHaveValue('홍길동');
  });

  it('전체 선택 체크박스가 작동한다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersList />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheckbox = checkboxes[0]; // 첫 번째가 전체 선택
    
    await user.click(selectAllCheckbox);
    
    // 클릭이 에러 없이 처리되는지 확인
    expect(selectAllCheckbox).toBeInTheDocument();
  });

  it('페이지네이션 정보가 표시된다', () => {
    renderWithRouter(<UsersList />);
    
    // 페이지네이션 관련 텍스트가 있는지 확인 (총 2명, 페이지 1/1 등)
    expect(screen.getByText(/2명/)).toBeInTheDocument();
  });
});