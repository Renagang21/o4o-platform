import { render, screen, fireEvent } from '../../src/test-utils/render';
import { vi } from 'vitest';
import { ProductCard } from '../../src/components/ecommerce/ProductCard';
import { createMockProduct, createMockProducts } from '../../src/test-utils/factories/product';

describe('ProductCard Component', () => {
  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    test('상품 정보를 올바르게 표시한다', () => {
      const product = createMockProduct({
        name: 'Test Product',
        sku: 'TEST-123',
        retailPrice: 10000,
        stockQuantity: 50,
      });

      render(<ProductCard product={product} />);

      // 상품명 확인
      expect(screen.getByTestId('product-name')).toHaveTextContent('Test Product');
      
      // SKU 확인
      expect(screen.getByTestId('product-sku')).toHaveTextContent('SKU: TEST-123');
      
      // 가격 확인 (한국 원화 형식)
      expect(screen.getByTestId('product-price')).toHaveTextContent('₩10,000');
      
      // 재고 수량 확인
      expect(screen.getByTestId('stock-quantity')).toHaveTextContent('50개');
    });

    test('상품 이미지를 올바르게 표시한다', () => {
      const product = createMockProduct({
        name: 'Test Product',
        featuredImage: 'https://example.com/image.jpg',
      });

      render(<ProductCard product={product} />);

      const image = screen.getByTestId('product-image') as HTMLImageElement;
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(image).toHaveAttribute('alt', 'Test Product');
    });

    test('이미지가 없을 때 플레이스홀더를 표시한다', () => {
      const product = createMockProduct({
        featuredImage: undefined,
      });

      render(<ProductCard product={product} />);

      const image = screen.getByTestId('product-image') as HTMLImageElement;
      expect(image.src).toContain('placeholder');
    });
  });

  describe('상품 상태 표시', () => {
    test('게시된 상품의 상태 배지를 표시한다', () => {
      const product = createMockProduct({ status: 'published' });
      render(<ProductCard product={product} />);

      const badge = screen.getByTestId('product-status-badge');
      expect(badge).toHaveTextContent('게시됨');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    test('임시저장 상품의 상태 배지를 표시한다', () => {
      const product = createMockProducts.draft();
      render(<ProductCard product={product} />);

      const badge = screen.getByTestId('product-status-badge');
      expect(badge).toHaveTextContent('임시저장');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });

  describe('재고 상태 표시', () => {
    test('재고가 충분할 때 "재고 있음"을 표시한다', () => {
      const product = createMockProduct({
        stockQuantity: 100,
        lowStockThreshold: 10,
        manageStock: true,
      });

      render(<ProductCard product={product} />);
      
      expect(screen.getByTestId('in-stock')).toHaveTextContent('재고 있음');
    });

    test('재고가 부족할 때 "부족"을 표시한다', () => {
      const product = createMockProducts.lowStock();
      render(<ProductCard product={product} />);
      
      expect(screen.getByTestId('low-stock')).toHaveTextContent('부족');
    });

    test('품절일 때 "품절"을 표시한다', () => {
      const product = createMockProducts.outOfStock();
      render(<ProductCard product={product} />);
      
      expect(screen.getByTestId('out-of-stock')).toHaveTextContent('품절');
    });

    test('재고 관리하지 않을 때 적절한 메시지를 표시한다', () => {
      const product = createMockProduct({ manageStock: false });
      render(<ProductCard product={product} />);
      
      expect(screen.getByText('재고 관리 안함')).toBeInTheDocument();
    });
  });

  describe('도매가 표시', () => {
    test('도매가가 있을 때 표시한다', () => {
      const product = createMockProduct({
        retailPrice: 10000,
        wholesalePrice: 8000,
      });

      render(<ProductCard product={product} />);
      
      expect(screen.getByTestId('wholesale-price')).toHaveTextContent('도매가: ₩8,000');
    });

    test('도매가가 없을 때 표시하지 않는다', () => {
      const product = createMockProduct({
        retailPrice: 10000,
        wholesalePrice: undefined,
      });

      render(<ProductCard product={product} />);
      
      expect(screen.queryByTestId('wholesale-price')).not.toBeInTheDocument();
    });
  });

  describe('특징 배지', () => {
    test('특가 상품 배지를 표시한다', () => {
      const product = createMockProducts.featured();
      render(<ProductCard product={product} />);
      
      expect(screen.getByTestId('featured-badge')).toHaveTextContent('특가');
    });

    test('가상 상품 배지를 표시한다', () => {
      const product = createMockProducts.virtual();
      render(<ProductCard product={product} />);
      
      expect(screen.getByTestId('virtual-badge')).toHaveTextContent('가상상품');
    });

    test('다운로드 가능 상품 배지를 표시한다', () => {
      const product = createMockProduct({ downloadable: true });
      render(<ProductCard product={product} />);
      
      expect(screen.getByTestId('downloadable-badge')).toHaveTextContent('다운로드');
    });
  });

  describe('액션 버튼', () => {
    test('편집 버튼을 클릭하면 onEdit 핸들러가 호출된다', () => {
      const product = createMockProduct();
      render(<ProductCard product={product} {...mockHandlers} />);

      fireEvent.click(screen.getByTestId('edit-button'));
      
      expect(mockHandlers.onEdit).toHaveBeenCalledWith(product);
      expect(mockHandlers.onEdit).toHaveBeenCalledTimes(1);
    });

    test('복제 버튼을 클릭하면 onDuplicate 핸들러가 호출된다', () => {
      const product = createMockProduct({ id: 'prod_123' });
      render(<ProductCard product={product} {...mockHandlers} />);

      fireEvent.click(screen.getByTestId('duplicate-button'));
      
      expect(mockHandlers.onDuplicate).toHaveBeenCalledWith('prod_123');
      expect(mockHandlers.onDuplicate).toHaveBeenCalledTimes(1);
    });

    test('삭제 버튼을 클릭하면 onDelete 핸들러가 호출된다', () => {
      const product = createMockProduct({ id: 'prod_123' });
      render(<ProductCard product={product} {...mockHandlers} />);

      fireEvent.click(screen.getByTestId('delete-button'));
      
      expect(mockHandlers.onDelete).toHaveBeenCalledWith('prod_123');
      expect(mockHandlers.onDelete).toHaveBeenCalledTimes(1);
    });

    test('핸들러가 제공되지 않으면 해당 버튼을 렌더링하지 않는다', () => {
      const product = createMockProduct();
      render(<ProductCard product={product} />);

      expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('duplicate-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    test('모든 필수 요소에 적절한 test-id가 있다', () => {
      const product = createMockProduct();
      render(<ProductCard product={product} {...mockHandlers} />);

      expect(screen.getByTestId('product-card')).toBeInTheDocument();
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
      expect(screen.getByTestId('product-sku')).toBeInTheDocument();
      expect(screen.getByTestId('product-price')).toBeInTheDocument();
      expect(screen.getByTestId('product-image')).toBeInTheDocument();
      expect(screen.getByTestId('product-status-badge')).toBeInTheDocument();
      expect(screen.getByTestId('stock-quantity')).toBeInTheDocument();
    });
  });
});