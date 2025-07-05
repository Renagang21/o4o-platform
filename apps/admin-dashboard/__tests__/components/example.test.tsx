import { render, screen } from '../../src/test-utils/render';
import { createMockProduct, createMockProducts } from '../../src/test-utils/factories/product';

// 간단한 컴포넌트 테스트 예시
describe('Test Setup Verification', () => {
  test('render function works correctly', () => {
    render(<div data-testid="test-element">Hello World</div>);
    expect(screen.getByTestId('test-element')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  test('product factory creates valid mock data', () => {
    const product = createMockProduct();
    
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product.name).toBe('Test Product');
    expect(product.status).toBe('published');
    expect(product.stockQuantity).toBe(100);
  });

  test('product factory accepts overrides', () => {
    const product = createMockProduct({
      name: 'Custom Product',
      stockQuantity: 50,
    });
    
    expect(product.name).toBe('Custom Product');
    expect(product.stockQuantity).toBe(50);
  });

  test('specialized product factories work', () => {
    const outOfStockProduct = createMockProducts.outOfStock();
    expect(outOfStockProduct.stockQuantity).toBe(0);
    expect(outOfStockProduct.stockStatus).toBe('outofstock');
    
    const featuredProduct = createMockProducts.featured();
    expect(featuredProduct.featured).toBe(true);
    
    const draftProduct = createMockProducts.draft();
    expect(draftProduct.status).toBe('draft');
  });
});