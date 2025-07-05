import { render, screen } from '../../src/test-utils/render';
import Orders from '../../src/pages/ecommerce/Orders';

describe('Orders Page', () => {
  test('renders orders page with correct title and description', () => {
    render(<Orders />);
    
    // 페이지 제목 확인
    expect(screen.getByRole('heading', { name: '주문 관리' })).toBeInTheDocument();
    
    // 페이지 설명 확인
    expect(screen.getByText('고객 주문을 관리합니다')).toBeInTheDocument();
  });

  test('displays development message when no orders', () => {
    render(<Orders />);
    
    // 개발 중 메시지 확인
    expect(screen.getByText('주문 관리 페이지는 개발 중입니다.')).toBeInTheDocument();
  });

  test('has correct WordPress-style card structure', () => {
    render(<Orders />);
    
    // WordPress 스타일 카드 구조 확인
    const card = screen.getByText('주문 관리 페이지는 개발 중입니다.').closest('.wp-card');
    expect(card).toHaveClass('wp-card');
    
    const cardBody = screen.getByText('주문 관리 페이지는 개발 중입니다.').closest('.wp-card-body');
    expect(cardBody).toHaveClass('wp-card-body');
  });

  test('page has consistent layout structure with Products page', () => {
    const { container } = render(<Orders />);
    
    // Products 페이지와 동일한 레이아웃 구조 확인
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('space-y-6');
    
    // 제목 섹션 구조 확인
    const titleSection = screen.getByRole('heading', { name: '주문 관리' }).parentElement;
    expect(titleSection).toBeInTheDocument();
  });

  test('text content uses correct styling classes', () => {
    render(<Orders />);
    
    // 제목 스타일 확인
    const title = screen.getByRole('heading', { name: '주문 관리' });
    expect(title).toHaveClass('text-2xl', 'font-bold', 'text-gray-900');
    
    // 설명 텍스트 스타일 확인
    const description = screen.getByText('고객 주문을 관리합니다');
    expect(description).toHaveClass('text-gray-600', 'mt-1');
  });
});