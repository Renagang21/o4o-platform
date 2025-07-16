/**
 * UserForm 컴포넌트 간단 테스트
 * 기본 렌더링과 기초 기능 검증
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserForm from '../UserForm';

// Mock dependencies
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('UserForm 간단 테스트', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  
  const defaultProps = {
    mode: 'create' as const,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isLoading: false
  };

  it('컴포넌트가 올바르게 렌더링된다', () => {
    render(<UserForm {...defaultProps} />);
    
    expect(screen.getByText('기본 정보')).toBeInTheDocument();
    expect(screen.getByText('권한 및 상태')).toBeInTheDocument();
    expect(screen.getByText('사용자 생성')).toBeInTheDocument();
  });

  it('필수 필드들이 표시된다', () => {
    render(<UserForm {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('사용자 이름을 입력하세요')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('일반회원')).toBeInTheDocument();
    expect(screen.getByText('승인대기')).toBeInTheDocument();
  });

  it('수정 모드에서 올바른 텍스트가 표시된다', () => {
    render(<UserForm {...defaultProps} mode="edit" />);
    
    expect(screen.getByText('변경사항 저장')).toBeInTheDocument();
  });

  it('취소 버튼이 있다', () => {
    render(<UserForm {...defaultProps} />);
    
    expect(screen.getByText('취소')).toBeInTheDocument();
  });
});