import { useState, useEffect } from 'react';

interface Taxonomy {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent?: number;
}

interface UseTaxonomiesResult {
  categories: Taxonomy[];
  isLoading: boolean;
  error: string | null;
}

interface UseBrandsResult {
  brands: Taxonomy[];
  isLoading: boolean;
  error: string | null;
}

export function useProductCategories(): UseTaxonomiesResult {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/ecommerce/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        const data = await response.json();
        setCategories(data.categories || getMockCategories());
      } catch (err: any) {
        // Error will be displayed to user via error state
        setError(err instanceof Error ? err.message : 'Failed to load categories');
        
        // Use mock data in development
        if (import.meta.env.DEV) {
          setCategories(getMockCategories());
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, isLoading, error };
}

export function useProductBrands(): UseBrandsResult {
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/ecommerce/brands');
        if (!response.ok) throw new Error('Failed to fetch brands');
        
        const data = await response.json();
        setBrands(data.brands || getMockBrands());
      } catch (err: any) {
        // Error will be displayed to user via error state
        setError(err instanceof Error ? err.message : 'Failed to load brands');
        
        // Use mock data in development
        if (import.meta.env.DEV) {
          setBrands(getMockBrands());
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrands();
  }, []);

  return { brands, isLoading, error };
}

// Mock data for development
function getMockCategories(): Taxonomy[] {
  return [
    { id: 1, name: '차', slug: 'tea', count: 12 },
    { id: 2, name: '꿀', slug: 'honey', count: 8 },
    { id: 3, name: '오일', slug: 'oil', count: 15 },
    { id: 4, name: '커피', slug: 'coffee', count: 20 },
    { id: 5, name: '잼', slug: 'jam', count: 10 },
    { id: 6, name: '곡물', slug: 'grain', count: 18 },
    { id: 7, name: '과일', slug: 'fruit', count: 25 },
    { id: 8, name: '채소', slug: 'vegetable', count: 30 },
    { id: 9, name: '유제품', slug: 'dairy', count: 14 },
    { id: 10, name: '건강식품', slug: 'health', count: 22 }
  ];
}

function getMockBrands(): Taxonomy[] {
  return [
    { id: 1, name: '네이처팜', slug: 'nature-farm', count: 25 },
    { id: 2, name: '그린밸리', slug: 'green-valley', count: 18 },
    { id: 3, name: '오가닉플러스', slug: 'organic-plus', count: 30 },
    { id: 4, name: '헬시초이스', slug: 'healthy-choice', count: 22 },
    { id: 5, name: '퓨어네이처', slug: 'pure-nature', count: 15 },
    { id: 6, name: '프레시팜', slug: 'fresh-farm', count: 28 },
    { id: 7, name: '에코그린', slug: 'eco-green', count: 20 },
    { id: 8, name: '웰빙푸드', slug: 'wellbeing-food', count: 16 }
  ];
}

export function useProductTags(): UseTaxonomiesResult {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/ecommerce/tags');
        if (!response.ok) throw new Error('Failed to fetch tags');
        
        const data = await response.json();
        setCategories(data.tags || getMockTags());
      } catch (err: any) {
    // Error logging - use proper error handler
        setError(err instanceof Error ? err.message : 'Failed to load tags');
        
        // Use mock data in development
        if (import.meta.env.DEV) {
          setCategories(getMockTags());
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []);

  return { categories, isLoading, error };
}

function getMockTags(): Taxonomy[] {
  return [
    { id: 1, name: '유기농', slug: 'organic', count: 45 },
    { id: 2, name: '무농약', slug: 'pesticide-free', count: 38 },
    { id: 3, name: '국내산', slug: 'domestic', count: 52 },
    { id: 4, name: '수입산', slug: 'imported', count: 28 },
    { id: 5, name: '프리미엄', slug: 'premium', count: 35 },
    { id: 6, name: '베스트셀러', slug: 'bestseller', count: 20 },
    { id: 7, name: '신상품', slug: 'new', count: 15 },
    { id: 8, name: '할인', slug: 'sale', count: 18 }
  ];
}