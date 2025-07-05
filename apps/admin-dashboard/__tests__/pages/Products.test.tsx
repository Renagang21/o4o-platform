import { render, screen } from '../../src/test-utils/render';
import Products from '../../src/pages/ecommerce/Products';

describe('Products Page', () => {
  test('renders products page with correct title and description', () => {
    render(<Products />);
    
    // 페이지 제목 확인
    expect(screen.getByRole('heading', { name: '상품 관리' })).toBeInTheDocument();
    
    // 페이지 설명 확인
    expect(screen.getByText('등록된 상품들을 관리합니다')).toBeInTheDocument();
  });

  test('displays development message when no products', () => {
    render(<Products />);
    
    // 개발 중 메시지 확인
    expect(screen.getByText('상품 관리 페이지는 개발 중입니다.')).toBeInTheDocument();
  });

  test('has correct WordPress-style card structure', () => {
    render(<Products />);
    
    // WordPress 스타일 카드 구조 확인
    const card = screen.getByText('상품 관리 페이지는 개발 중입니다.').closest('.wp-card');
    expect(card).toHaveClass('wp-card');
    
    const cardBody = screen.getByText('상품 관리 페이지는 개발 중입니다.').closest('.wp-card-body');
    expect(cardBody).toHaveClass('wp-card-body');
  });

  test('page layout has correct spacing classes', () => {
    const { container } = render(<Products />);
    
    // 최상위 컨테이너의 spacing 클래스 확인
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('space-y-6');
  });
});