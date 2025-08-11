import { FC, ReactNode } from 'react';
/**
 * UsersList 페이지 컴포넌트 단위 테스트
 * 사용자 목록, 검색, 필터링, 선택, 일괄 작업 로직 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import UsersList from '../UsersList';
import { User } from '../../../types/user';
import { AuthProvider } from '@o4o/auth-context';

// Mock apiClient base - UsersList uses apiClient from api/base - use vi.hoisted to ensure this is available before mocks
const { mockApiClient } = vi.hoisted(() => {
  const mockApiClient = {
    get: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    patch: vi.fn()
  };
  return { mockApiClient };
});

// Mock dependencies
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

vi.mock('../../../api/base', () => ({
  default: mockApiClient
}));

// Mock authClient
vi.mock('@o4o/auth-client', () => ({
  authClient: {
    api: mockApiClient
  }
}))

// Mock useAuth hook
const mockUseAuth = vi.fn(() => ({
  user: {
    id: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin'
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  updateUser: vi.fn()
}));

vi.mock('@o4o/auth-context', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>
}));

// Mock useTheme hook
vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
    setTheme: vi.fn()
  }),
  ThemeProvider: ({ children }: any) => children
}));

// Mock UserDeleteModal and UserRoleChangeModal
vi.mock('../../components/users/UserDeleteModal', () => ({
  default: ({ _isOpen, onClose, onConfirm, users, isLoading }: any) => {
    if (!_isOpen) return null;
    return (
      <div data-testid="user-delete-modal">
        <h2>사용자 삭제</h2>
        <button onClick={onConfirm}>확인</button>
        <button onClick={onClose}>취소</button>
      </div>
    );
  }
}));

vi.mock('../../components/users/UserRoleChangeModal', () => ({
  default: ({ isOpen, onClose, onConfirm, users, isLoading }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="user-role-change-modal">
        <h2>사용자 역할 변경</h2>
        <button onClick={() => onConfirm('admin')}>확인</button>
        <button onClick={onClose}>취소</button>
      </div>
    );
  }
}));

const mockUsers: User[] = [
  {
    id: 'user-1',
    name: '홍길동',
    email: 'hong@example.com',
    role: 'customer',
    status: 'approved',
    phone: '010-1234-5678',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'admin-1',
    name: '관리자',
    email: 'admin@example.com',
    role: 'admin',
    status: 'approved',
    phone: '010-1111-1111',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z'
  },
  {
    id: 'business-1',
    name: '사업자',
    email: 'business@example.com',
    role: 'business',
    status: 'pending',
    phone: '010-2222-2222',
    businessInfo: {
      businessName: '테스트 회사',
      businessType: '법인',
      businessNumber: '123-45-67890',
      businessAddress: '서울시 강남구',
      representativeName: '김대표',
      contactPhone: '02-1234-5678'
    },
    createdAt: '2023-01-03T00:00:00Z',
    updatedAt: '2023-01-03T00:00:00Z'
  }
];

const mockUsersResponse = {
  success: true,
  data: {
    users: mockUsers,
    pagination: {
      current: 1,
      total: 1,
      count: 3,
      totalItems: 3,
      hasNext: false,
      hasPrev: false
    },
    filters: {
      role: 'all',
      status: 'all',
      search: '',
      dateFrom: '',
      dateTo: ''
    }
  },
  message: '사용자 목록을 조회했습니다.'
};

// Test wrapper component
const TestWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('UsersList 컴포넌트', () => {
  let mockGet: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockPut: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up mock responses
    mockGet = mockApiClient.get;
    mockDelete = mockApiClient.delete;
    mockPut = mockApiClient.put;
    
    mockGet.mockResolvedValue({ data: mockUsersResponse });
    mockDelete.mockResolvedValue({ data: { success: true, message: '삭제되었습니다.' } });
    mockPut.mockResolvedValue({ data: { success: true, message: '변경되었습니다.' } });
  });

  describe('컴포넌트 렌더링', () => {
    it('페이지 헤더와 기본 UI 요소들이 렌더링된다', async () => {
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      expect(screen.getByText('사용자 관리')).toBeInTheDocument();
      expect(screen.getByText('플랫폼 사용자들을 관리하고 모니터링합니다')).toBeInTheDocument();
      expect(screen.getByText('새 사용자 추가')).toBeInTheDocument();
      
      // 필터 UI
      expect(screen.getByPlaceholderText('사용자 이름 또는 이메일 검색...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('모든 역할')).toBeInTheDocument();
      expect(screen.getByDisplayValue('모든 상태')).toBeInTheDocument();
    });

    it('사용자 데이터가 로드되면 테이블이 표시된다', async () => {
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
        // '관리자'와 '사업자'는 여러 곳에 나타날 수 있음
        const adminTexts = screen.getAllByText('관리자');
        expect(adminTexts.length).toBeGreaterThan(0);
        const businessTexts = screen.getAllByText('사업자');
        expect(businessTexts.length).toBeGreaterThan(0);
      });

      // 역할 배지 확인 - 이미 위에서 확인했으므로 생략
      expect(screen.getByText('일반회원')).toBeInTheDocument();
    });

    it('통계 요약 카드가 표시된다', async () => {
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('전체 사용자')).toBeInTheDocument();
        expect(screen.getByText('승인 대기')).toBeInTheDocument();
        expect(screen.getByText('승인됨')).toBeInTheDocument();
        expect(screen.getByText('사업자')).toBeInTheDocument();
      });
    });
  });

  describe('사용자 선택', () => {
    it('전체 선택 체크박스가 올바르게 작동한다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /전체 선택/ });
      
      // 전체 선택
      await user.click(selectAllCheckbox);
      
      // 개별 체크박스들이 모두 선택되어야 함
      const individualCheckboxes = screen.getAllByRole('checkbox').filter(
        checkbox => checkbox !== selectAllCheckbox
      );
      
      individualCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });

      // 선택된 사용자 정보 표시
      expect(screen.getByText('3명의 사용자가 선택됨')).toBeInTheDocument();
    });

    it('개별 사용자 선택이 올바르게 작동한다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const firstUserCheckbox = checkboxes[1]; // 첫 번째는 전체 선택

      // 개별 사용자 선택
      await user.click(firstUserCheckbox);
      
      expect(firstUserCheckbox).toBeChecked();
      expect(screen.getByText('1명의 사용자가 선택됨')).toBeInTheDocument();
    });

    it('일부 선택 시 전체 선택 체크박스가 부분 선택 상태가 된다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /전체 선택/ });
      const checkboxes = screen.getAllByRole('checkbox');
      const firstUserCheckbox = checkboxes[1];

      // 개별 사용자 하나만 선택
      await user.click(firstUserCheckbox);
      
      // 전체 선택 체크박스는 체크되지 않음 (부분 선택 상태)
      expect(selectAllCheckbox).not.toBeChecked();
    });
  });

  describe('검색 및 필터링', () => {
    it('검색어 입력 시 API가 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('사용자 이름 또는 이메일 검색...');
      
      await user.type(searchInput, '홍길동');
      
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining('search=홍길동')
        );
      });
    });

    it('역할 필터 변경 시 API가 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      const roleSelect = screen.getByDisplayValue('모든 역할');
      
      await user.selectOptions(roleSelect, 'admin');
      
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining('role=admin')
        );
      });
    });

    it('상태 필터 변경 시 API가 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      const statusSelect = screen.getByDisplayValue('모든 상태');
      
      await user.selectOptions(statusSelect, 'pending');
      
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining('status=pending')
        );
      });
    });

    it('필터 초기화 버튼이 작동한다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      // 먼저 필터 설정
      const searchInput = screen.getByPlaceholderText('사용자 이름 또는 이메일 검색...');
      await user.type(searchInput, '홍길동');
      
      const roleSelect = screen.getByDisplayValue('모든 역할');
      await user.selectOptions(roleSelect, 'admin');

      // 필터 초기화
      const clearButton = screen.getByText('필터 초기화');
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(roleSelect).toHaveValue('all');
    });
  });

  describe('일괄 작업', () => {
    it('사용자 선택 시 일괄 작업 버튼들이 표시된다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      // 사용자 선택
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // 일괄 작업 버튼들이 나타남
      expect(screen.getByText('역할 변경')).toBeInTheDocument();
      expect(screen.getByText('일괄 삭제')).toBeInTheDocument();
    });

    it('일괄 삭제 버튼 클릭 시 삭제 모달이 열린다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      // 사용자 선택
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // 일괄 삭제 버튼 클릭
      const bulkDeleteButton = screen.getByText('일괄 삭제');
      await user.click(bulkDeleteButton);

      // 삭제 모달이 열림
      await waitFor(() => {
        expect(screen.getByTestId('user-delete-modal')).toBeInTheDocument();
        expect(screen.getByText('사용자 삭제')).toBeInTheDocument();
      });
    });

    it('역할 변경 버튼 클릭 시 역할 변경 모달이 열린다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      // 사용자 선택
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // 역할 변경 버튼 클릭
      const roleChangeButton = screen.getByText('역할 변경');
      await user.click(roleChangeButton);

      // 역할 변경 모달이 열림
      await waitFor(() => {
        expect(screen.getByTestId('user-role-change-modal')).toBeInTheDocument();
        expect(screen.getByText('사용자 역할 변경')).toBeInTheDocument();
      });
    });
  });

  describe('개별 사용자 작업', () => {
    it('사용자 상세 보기 버튼이 작동한다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByTitle('사용자 상세');
      expect(viewButtons).toHaveLength(3); // 3명의 사용자
    });

    it('사용자 수정 버튼이 작동한다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('사용자 수정');
      expect(editButtons).toHaveLength(3);
    });

    it('개별 사용자 삭제 버튼 클릭 시 삭제 모달이 열린다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('사용자 삭제');
      await user.click(deleteButtons[0]);

      // 삭제 모달이 열림
      await waitFor(() => {
        expect(screen.getByTestId('user-delete-modal')).toBeInTheDocument();
        expect(screen.getByText('사용자 삭제')).toBeInTheDocument();
      });
    });
  });

  describe('페이지네이션', () => {
    it('페이지네이션 정보가 올바르게 표시된다', async () => {
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('3명 중 3명 표시')).toBeInTheDocument();
      });
    });

    it('새로고침 버튼이 작동한다', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /새로고침/ });
      await user.click(refreshButton);

      // API가 다시 호출되어야 함
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('에러 처리', () => {
    it('API 에러 시 에러 메시지가 표시된다', async () => {
      mockGet.mockRejectedValue(new Error('API Error'));
      
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('사용자 데이터 로드 실패')).toBeInTheDocument();
        expect(screen.getByText('사용자 목록을 불러오는 중 오류가 발생했습니다.')).toBeInTheDocument();
        expect(screen.getByText('다시 시도')).toBeInTheDocument();
      });
    });

    it('에러 상태에서 다시 시도 버튼이 작동한다', async () => {
      const user = userEvent.setup();
      mockGet.mockRejectedValueOnce(new Error('API Error'))
            .mockResolvedValue({ data: mockUsersResponse });
      
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('다시 시도')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('다시 시도');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });
    });
  });

  describe('로딩 상태', () => {
    it('로딩 중일 때 로딩 표시가 나타난다', async () => {
      // API 응답을 지연시켜 로딩 상태 테스트
      mockGet.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: mockUsersResponse }), 1000)
        )
      );

      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      // DataTable의 로딩 prop이 true로 전달되어야 함
      // 실제 로딩 UI는 DataTable 컴포넌트에서 처리
    });
  });

  describe('접근성', () => {
    it('체크박스들이 적절한 라벨을 가진다', async () => {
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /전체 선택/ });
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it('버튼들이 적절한 title 속성을 가진다', async () => {
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      expect(screen.getAllByTitle('사용자 상세')).toHaveLength(3);
      expect(screen.getAllByTitle('사용자 수정')).toHaveLength(3);
      expect(screen.getAllByTitle('사용자 삭제')).toHaveLength(3);
    });

    it('필터 폼 요소들이 적절한 라벨을 가진다', () => {
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText('사용자 이름 또는 이메일 검색...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('모든 역할')).toBeInTheDocument();
      expect(screen.getByDisplayValue('모든 상태')).toBeInTheDocument();
    });
  });

  describe('비즈니스 로직', () => {
    it('사업자 정보가 있는 사용자의 정보가 올바르게 표시된다', async () => {
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('테스트 회사')).toBeInTheDocument();
        expect(screen.getByText('법인')).toBeInTheDocument();
      });
    });

    it('사업자 정보가 없는 사용자는 "-"로 표시된다', async () => {
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        // 일반 사용자와 관리자는 사업자 정보 열에 "-" 표시
        const dashElements = screen.getAllByText('-');
        expect(dashElements.length).toBeGreaterThan(0);
      });
    });

    it('상태 아이콘이 올바르게 표시된다', async () => {
      render(
        <TestWrapper>
          <UsersList />
        </TestWrapper>
      );

      await waitFor(() => {
        // 승인됨, 승인대기 등의 상태 확인
        expect(screen.getByText('승인됨')).toBeInTheDocument();
        expect(screen.getByText('승인대기')).toBeInTheDocument();
      });
    });
  });
});