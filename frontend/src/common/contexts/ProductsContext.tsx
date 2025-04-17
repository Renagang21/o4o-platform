import React, { createContext, useContext, useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
}

interface ProductsContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
}

const ProductsContext = createContext<ProductsContextType>({
  products: [],
  loading: true,
  error: null,
});

export const useProducts = () => useContext(ProductsContext);

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // TODO: 실제 API 호출로 대체
        const mockProducts: Product[] = [
          {
            id: 1,
            name: '상품 1',
            price: 10000,
            description: '상품 설명 1',
            image: 'https://via.placeholder.com/300',
            category: '패션',
          },
          {
            id: 2,
            name: '상품 2',
            price: 20000,
            description: '상품 설명 2',
            image: 'https://via.placeholder.com/300',
            category: '전자제품',
          },
          {
            id: 3,
            name: '상품 3',
            price: 30000,
            description: '상품 설명 3',
            image: 'https://via.placeholder.com/300',
            category: '가구',
          },
          {
            id: 4,
            name: '상품 4',
            price: 40000,
            description: '상품 설명 4',
            image: 'https://via.placeholder.com/300',
            category: '식품',
          },
        ];
        setProducts(mockProducts);
        setLoading(false);
      } catch (err) {
        setError('상품을 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <ProductsContext.Provider value={{ products, loading, error }}>
      {children}
    </ProductsContext.Provider>
  );
}; 