/**
 * UserRoleChangeModal 컴포넌트 단위 테스트
 * 역할 변경 모달 로직 및 안전장치 검증
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserRoleChangeModal from '../UserRoleChangeModal';
import { User, UserRole } from '../../../types/user';

describe('UserRoleChangeModal 컴포넌트', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn<[UserRole], void>();
  
  const customerUser: User = {
    id: 'user-1',
    name: '홍길동',
    email: 'hong@example.com',
    role: 'customer',
    status: 'approved',
    phone: '010-1234-5678',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  const adminUser: User = {
    id: 'admin-1',
    name: '관리자',
    email: 'admin@example.com',
    role: 'admin',
    status: 'approved',
    phone: '010-1111-1111',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  const businessUser: User = {
    id: 'business-1',
    name: '사업자',
    email: 'business@example.com',
    role: 'business',
    status: 'approved',
    phone: '010-2222-2222',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  const defaultProps = {
    _isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    users: [customerUser],
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('모달 표시/숨김', () => {
    it('isOpen이 false일 때 모달이 렌더링되지 않는다', () => {
      render(
        <UserRoleChangeModal {...defaultProps} isOpen={false} />
      );
      
      expect(screen.queryByText('사용자 역할 변경')).not.toBeInTheDocument();
    });

    it('isOpen이 true일 때 모달이 렌더링된다', () => {
      render(<UserRoleChangeModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('사용자 역할 변경')).toBeInTheDocument();
    });

    it('배경 클릭 시 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<UserRoleChangeModal {...defaultProps} />);
      
      const backdrop = screen.getByRole('dialog').parentElement;
      await user.click(backdrop!);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('X 버튼 클릭 시 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<UserRoleChangeModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /닫기/ });
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('로딩 중일 때 X 버튼이 비활성화된다', () => {
      render(<UserRoleChangeModal {...defaultProps} isLoading={true} />);
      
      expect(screen.queryByRole('button', { name: /닫기/ })).not.toBeInTheDocument();
    });
  });

  describe('사용자 목록 표시', () => {
    it('단일 사용자 정보가 올바르게 표시된다', () => {
      render(<UserRoleChangeModal {...defaultProps} />);
      
      expect(screen.getByText('1명 사용자 역할을 변경합니다')).toBeInTheDocument();
      expect(screen.getByText('선택 사용자 (1명)')).toBeInTheDocument();
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('(hong@example.com)')).toBeInTheDocument();
      expect(screen.getByText('일반회원')).toBeInTheDocument(); // customer role label
    });

    it('다중 사용자 정보가 올바르게 표시된다', () => {
      const multipleUsers = [customerUser, adminUser, businessUser];
      render(
        <UserRoleChangeModal {...defaultProps} users={multipleUsers} />
      );
      
      expect(screen.getByText('3명 사용자 역할을 변경합니다')).toBeInTheDocument();
      expect(screen.getByText('선택 사용자 (3명)')).toBeInTheDocument();
      
      // 모든 사용자 표시 확인
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('관리자')).toBeInTheDocument();
      expect(screen.getByText('사업자')).toBeInTheDocument();
      
      // 역할 라벨 확인
      expect(screen.getByText('일반회원')).toBeInTheDocument();
      expect(screen.getByText('관리자')).toBeInTheDocument();
      expect(screen.getByText('사업자')).toBeInTheDocument();
    });

    it('사용자 목록이 스크롤 가능하다', () => {
      const manyUsers = Array.from({ length: 10 }, (_, i) => ({
        ...customerUser,
        id: `user-${i}`,
        name: `사용자 ${i}`,
        email: `user${i}@example.com`
      }));
      
      render(
        <UserRoleChangeModal {...defaultProps} users={manyUsers} />
      );
      
      const userList = screen.getByText('선택 사용자 (10명)').parentElement?.querySelector('.overflow-y-auto');
      expect(userList).toBeInTheDocument();
      expect(userList).toHaveClass('max-h-32');
    });
  });

  describe('역할 선택', () => {
    it('모든 역할 옵션이 표시된다', () => {
      render(<UserRoleChangeModal {...defaultProps} />);
      
      expect(screen.getByText('변경할 역할 선택')).toBeInTheDocument();
      expect(screen.getByText('관리자')).toBeInTheDocument();
      expect(screen.getByText('일반회원')).toBeInTheDocument();
      expect(screen.getByText('사업자')).toBeInTheDocument();
      expect(screen.getByText('제휴 파트너')).toBeInTheDocument();
    });

    it('각 역할에 대한 설명이 표시된다', () => {
      render(<UserRoleChangeModal {...defaultProps} />);
      
      expect(screen.getByText('시스템 관리 권한')).toBeInTheDocument();
      expect(screen.getByText('일반 고객 권한')).toBeInTheDocument();
      expect(screen.getByText('사업자 고객 권한')).toBeInTheDocument();
      expect(screen.getByText('제휴 파트너 권한')).toBeInTheDocument();
    });

    it('역할 선택 시 UI가 업데이트된다', async () => {
      const user = userEvent.setup();
      render(<UserRoleChangeModal {...defaultProps} />);
      
      // 초기 선택: customer (기본값)
      const customerButton = screen.getByRole('button', { name: /일반회원/ });
      expect(customerButton).toHaveClass('border-blue-500');
      
      // business 선택
      const businessButton = screen.getByRole('button', { name: /사업자/ });
      await user.click(businessButton);
      
      expect(businessButton).toHaveClass('border-blue-500');
      expect(customerButton).not.toHaveClass('border-blue-500');
    });

    it('로딩 중일 때 역할 선택 버튼이 비활성화된다', () => {
      render(<UserRoleChangeModal {...defaultProps} isLoading={true} />);
      
      const roleButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('관리자') || 
        btn.textContent?.includes('일반회원') ||
        btn.textContent?.includes('사업자') ||
        btn.textContent?.includes('제휴 파트너')
      );
      
      roleButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('변경 사항 분석', () => {
    it('같은 역할인 사용자가 있을 때 "변경 없음" 메시지가 표시된다', async () => {
      const user = userEvent.setup();
      render(<UserRoleChangeModal {...defaultProps} />);
      
      // customer 역할로 변경 (이미 customer이므로 변경 없음)
      const customerButton = screen.getByRole('button', { name: /일반회원/ });
      await user.click(customerButton);
      
      await waitFor(() => {
        expect(screen.getByText(/선택한 사용자들이 모두 이미 '일반회원' 역할입니다/)).toBeInTheDocument();
        expect(screen.getByText('변경할 내용이 없습니다.')).toBeInTheDocument();
      });
    });

    it('역할 변경이 있을 때 변경 사항 요약이 표시된다', async () => {
      const user = userEvent.setup();
      render(<UserRoleChangeModal {...defaultProps} />);
      
      // admin 역할로 변경
      const adminButton = screen.getByRole('button', { name: /관리자/ });
      await user.click(adminButton);
      
      await waitFor(() => {
        expect(screen.getByText('변경 사항 요약')).toBeInTheDocument();
        expect(screen.getByText('일반회원에서 관리자로')).toBeInTheDocument();
        expect(screen.getByText('1명')).toBeInTheDocument();
      });
    });

    it('다중 사용자의 복잡한 변경 사항이 올바르게 표시된다', async () => {
      const user = userEvent.setup();
      const mixedUsers = [customerUser, adminUser, businessUser];
      render(
        <UserRoleChangeModal {...defaultProps} users={mixedUsers} />
      );
      
      // affiliate 역할로 변경
      const affiliateButton = screen.getByRole('button', { name: /제휴 파트너/ });
      await user.click(affiliateButton);
      
      await waitFor(() => {
        expect(screen.getByText('변경 사항 요약')).toBeInTheDocument();
        expect(screen.getByText('일반회원에서 제휴 파트너로')).toBeInTheDocument();
        expect(screen.getByText('관리자에서 제휴 파트너로')).toBeInTheDocument();
        expect(screen.getByText('사업자에서 제휴 파트너로')).toBeInTheDocument();
      });
    });
  });

  describe('안전장치 검증', () => {
    it('모든 관리자 권한 제거 시 경고가 표시된다', async () => {
      const user = userEvent.setup();
      const allAdmins = [adminUser, { ...adminUser, id: 'admin-2', name: '관리자2' }];
      render(
        <UserRoleChangeModal {...defaultProps} users={allAdmins} />
      );
      
      // customer 역할로 변경 (모든 관리자 권한 제거)
      const customerButton = screen.getByRole('button', { name: /일반회원/ });
      await user.click(customerButton);
      
      await waitFor(() => {
        expect(screen.getByText('위험: 모든 관리자 권한 제거')).toBeInTheDocument();
        expect(screen.getByText('선택한 사용자들이 모든 관리자입니다.')).toBeInTheDocument();
        expect(screen.getByText('이 작업으로 시스템에 관리자가 없어질 수 있습니다.')).toBeInTheDocument();
      });
    });

    it('일부 관리자만 권한 제거 시 경고가 표시되지 않는다', async () => {
      const user = userEvent.setup();
      const mixedUsers = [adminUser, customerUser]; // 관리자 + 일반 사용자
      render(
        <UserRoleChangeModal {...defaultProps} users={mixedUsers} />
      );
      
      // business 역할로 변경
      const businessButton = screen.getByRole('button', { name: /사업자/ });
      await user.click(businessButton);
      
      await waitFor(() => {
        expect(screen.queryByText('위험: 모든 관리자 권한 제거')).not.toBeInTheDocument();
      });
    });

    it('관리자 권한 제거 경고 시 버튼이 위험 스타일로 변경된다', async () => {
      const user = userEvent.setup();
      const allAdmins = [adminUser];
      render(
        <UserRoleChangeModal {...defaultProps} users={allAdmins} />
      );
      
      // customer 역할로 변경
      const customerButton = screen.getByRole('button', { name: /일반회원/ });
      await user.click(customerButton);
      
      await waitFor(() => {
        const confirmButton = screen.getByText('역할 변경');
        expect(confirmButton.className).toContain('wp-button-danger');
      });
    });
  });

  describe('확인 및 취소', () => {
    it('취소 버튼 클릭 시 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<UserRoleChangeModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('취소');
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('역할 변경 버튼 클릭 시 선택된 역할로 onConfirm이 호출된다', async () => {
      const user = userEvent.setup();
      render(<UserRoleChangeModal {...defaultProps} />);
      
      // admin 역할 선택
      const adminButton = screen.getByRole('button', { name: /관리자/ });
      await user.click(adminButton);
      
      // 확인 버튼 클릭
      const confirmButton = screen.getByText('역할 변경');
      await user.click(confirmButton);
      
      expect(mockOnConfirm).toHaveBeenCalledWith('admin');
    });

    it('변경 사항이 없을 때 확인 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(<UserRoleChangeModal {...defaultProps} />);
      
      // 같은 역할(customer) 선택
      const customerButton = screen.getByRole('button', { name: /일반회원/ });
      await user.click(customerButton);
      
      await waitFor(() => {
        const confirmButton = screen.getByText('역할 변경');
        expect(confirmButton).toBeDisabled();
      });
    });

    it('로딩 중일 때 버튼들이 비활성화되고 로딩 표시가 나타난다', () => {
      render(<UserRoleChangeModal {...defaultProps} isLoading={true} />);
      
      const cancelButton = screen.getByText('취소');
      const confirmButton = screen.getByText('처리 중...');
      
      expect(cancelButton).toBeDisabled();
      expect(confirmButton).toBeDisabled();
      expect(screen.getByText('처리 중...')).toBeInTheDocument();
    });
  });

  describe('확인 메시지', () => {
    it('단일 사용자 변경 시 적절한 확인 메시지가 표시된다', async () => {
      const user = userEvent.setup();
      render(<UserRoleChangeModal {...defaultProps} />);
      
      // admin 역할 선택
      const adminButton = screen.getByRole('button', { name: /관리자/ });
      await user.click(adminButton);
      
      await waitFor(() => {
        expect(screen.getByText("정말로 선택한 1명 사용자 역할을 '관리자'로 변경하시겠습니까?")).toBeInTheDocument();
      });
    });

    it('다중 사용자 변경 시 적절한 확인 메시지가 표시된다', async () => {
      const user = userEvent.setup();
      const multipleUsers = [customerUser, businessUser];
      render(
        <UserRoleChangeModal {...defaultProps} users={multipleUsers} />
      );
      
      // admin 역할 선택
      const adminButton = screen.getByRole('button', { name: /관리자/ });
      await user.click(adminButton);
      
      await waitFor(() => {
        expect(screen.getByText("정말로 선택한 2명 사용자 역할을 '관리자'로 변경하시겠습니까?")).toBeInTheDocument();
      });
    });
  });

  describe('접근성', () => {
    it('모달에 적절한 role과 aria 속성이 있다', () => {
      render(<UserRoleChangeModal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    it('역할 선택 버튼들이 적절한 접근성 속성을 가진다', () => {
      render(<UserRoleChangeModal {...defaultProps} />);
      
      const roleButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('관리자') || 
        btn.textContent?.includes('일반회원') ||
        btn.textContent?.includes('사업자') ||
        btn.textContent?.includes('제휴 파트너')
      );
      
      expect(roleButtons.length).toBe(4);
      roleButtons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('키보드 내비게이션이 작동한다', async () => {
      const user = userEvent.setup();
      render(<UserRoleChangeModal {...defaultProps} />);
      
      // Tab으로 역할 선택 버튼들과 액션 버튼들 간 이동 가능
      await user.tab();
      const focusedElement = document.activeElement;
      expect(focusedElement?.tagName).toBe('BUTTON');
    });
  });

  describe('에지 케이스', () => {
    it('빈 사용자 배열이 전달되어도 크래시하지 않는다', () => {
      expect(() => {
        render(<UserRoleChangeModal {...defaultProps} users={[]} />);
      }).not.toThrow();
    });

    it('사용자 정보가 없을 때 크래시하지 않는다', () => {
      const incompleteUser = { ...customerUser, name: '', email: '' };
      
      expect(() => {
        render(<UserRoleChangeModal {...defaultProps} users={[incompleteUser]} />);
      }).not.toThrow();
    });

    it('props가 변경될 때 올바르게 업데이트된다', () => {
      const { rerender } = render(<UserRoleChangeModal {...defaultProps} />);
      
      expect(screen.getByText('1명 사용자 역할을 변경합니다')).toBeInTheDocument();
      
      const multipleUsers = [customerUser, adminUser];
      rerender(<UserRoleChangeModal {...defaultProps} users={multipleUsers} />);
      
      expect(screen.getByText('2명 사용자 역할을 변경합니다')).toBeInTheDocument();
    });

    it('역할 라벨이 정의되지 않은 경우에도 크래시하지 않는다', () => {
      const userWithUnknownRole = { 
        ...customerUser, 
        role: 'unknown' as UserRole 
      };
      
      expect(() => {
        render(<UserRoleChangeModal {...defaultProps} users={[userWithUnknownRole]} />);
      }).not.toThrow();
    });
  });
});